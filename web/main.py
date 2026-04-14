"""FastAPI backend for the Staff Resumes web app."""

from __future__ import annotations

import logging
import os
import sys
import threading
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from web.api.config_store import get_data_dir, get_config_status, save_config, validate_pursuits_root
from web.api.local_store import (
    get_person_data,
    get_session,
    list_people,
    list_pursuits,
    list_sessions,
    save_session,
    upsert_person_data,
    upsert_pursuit,
)
from web.api.pursuits_sync import sync_pursuits_from_disk
from web.api.runner import generate

log = logging.getLogger(__name__)

app = FastAPI(title="Staff Resumes API", version="0.1.0")
JOB_LOCK = threading.Lock()
JOBS: dict[str, dict] = {}


_ALLOWED_ORIGINS_ENV = os.environ.get("ALLOWED_ORIGINS", "")
_DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

allowed_origins = (
    [o.strip() for o in _ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
    if _ALLOWED_ORIGINS_ENV
    else _DEFAULT_DEV_ORIGINS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _startup_health_check() -> None:
    config_status = get_config_status()
    pursuits_root = config_status.get("pursuits_root")
    pursuits_root_exists = config_status.get("pursuits_root_exists")

    log.info("Startup path check:")
    log.info("  pursuits_root: %s", pursuits_root or "(not configured)")
    log.info("  pursuits_root_exists: %s", pursuits_root_exists)


def _trigger_pursuits_sync_background() -> None:
    def _sync():
        sync_pursuits_from_disk()

    threading.Thread(target=_sync, daemon=True).start()


@app.on_event("startup")
def on_startup():
    _startup_health_check()
    _trigger_pursuits_sync_background()


class PersonSelection(BaseModel):
    name: str
    include_in_consolidated: bool = True
    projects: list[str]
    education_indices: list[int] = []


class GenerateRequest(BaseModel):
    package_name: str
    selected_project_id: str | None = None
    include_cover: bool = True
    include_end_page: bool = False
    people: list[PersonSelection]


class GenerateStartResponse(BaseModel):
    status: str
    job_id: str


class PursuitCreate(BaseModel):
    display_name: str
    client: str
    engagement_number: str = ""


class SessionPayload(BaseModel):
    pursuit_id: str
    package_name: str
    selected_staff_ids: list[str] = []
    selections: dict = {}
    include_cover: bool = True
    include_end_page: bool = False


class PersonUpdate(BaseModel):
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    title: str | None = None
    summary: str | None = None
    education: list[dict] | None = None
    projects: list[dict] | None = None


class ConfigPathsUpdate(BaseModel):
    pursuits_root: str | None = None


def _job_percent(completed_steps: int, total_steps: int) -> int:
    if total_steps <= 0:
        return 0
    return round((completed_steps / total_steps) * 100)


def _store_job(job_id: str, updates: dict) -> None:
    with JOB_LOCK:
        current = JOBS.get(job_id, {}).copy()
        current.update(updates)
        JOBS[job_id] = current


def _expected_total_steps(body: GenerateRequest) -> int:
    has_consolidated = any(p.include_in_consolidated for p in body.people)
    return len(body.people) + (1 if has_consolidated else 0)


def _run_generation_job(job_id: str, body: GenerateRequest) -> None:
    total_steps = _expected_total_steps(body)

    def on_progress(event: dict) -> None:
        event_type = event.get("event")
        completed_steps = event.get("completed_steps", 0)

        if event_type == "started":
            _store_job(
                job_id,
                {
                    "status": "running",
                    "message": "Preparing resume generation",
                    "completed_steps": completed_steps,
                    "total_steps": total_steps,
                    "percent": _job_percent(completed_steps, total_steps),
                    "current_step": None,
                },
            )
            return

        if event_type in {"step_started", "step_completed"}:
            step_history = None
            if event_type == "step_completed":
                with JOB_LOCK:
                    existing = list(JOBS.get(job_id, {}).get("step_history", []))
                existing.append(
                    {
                        "type": event.get("step_type"),
                        "person_name": event.get("person_name"),
                        "label": event.get("label"),
                    }
                )
                step_history = existing
            updates = {
                "status": "running",
                "message": event.get("label") or "Generating resumes",
                "completed_steps": completed_steps,
                "total_steps": total_steps,
                "percent": _job_percent(completed_steps, total_steps),
                "current_step": {
                    "type": event.get("step_type"),
                    "person_name": event.get("person_name"),
                    "label": event.get("label"),
                    "status": "completed"
                    if event_type == "step_completed"
                    else "running",
                },
            }
            if step_history is not None:
                updates["step_history"] = step_history
            _store_job(job_id, updates)
            return

        if event_type == "completed":
            counts = event.get("counts", {})
            individual_urls = event.get("individual_urls", {})
            consolidated_url = event.get("consolidated_url")
            output_dir = event.get("output_dir")
            _store_job(
                job_id,
                {
                    "status": "completed",
                    "message": "Generation complete",
                    "completed_steps": total_steps,
                    "total_steps": total_steps,
                    "percent": 100,
                    "counts": counts,
                    "individual_urls": individual_urls,
                    "consolidated_url": consolidated_url,
                    "output_dir": output_dir,
                },
            )

    try:
        result = generate(
            job_id=job_id,
            package_name=body.package_name,
            selected_project_id=body.selected_project_id,
            include_cover=body.include_cover,
            include_end_page=body.include_end_page,
            people=[p.model_dump() for p in body.people],
            progress_callback=on_progress,
        )
        on_progress({"event": "completed", **result})
    except Exception as exc:
        _store_job(
            job_id,
            {
                "status": "failed",
                "message": str(exc),
                "error": str(exc),
            },
        )


@app.get("/api/people")
def api_list_people():
    try:
        return list_people()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/people/{name}/data")
def api_person_data(name: str):
    try:
        return get_person_data(name)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/api/people/{name}/data")
def api_update_person_data(name: str, body: PersonUpdate):
    try:
        payload = body.model_dump(exclude_none=True)
        return upsert_person_data(name, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/generate")
def api_generate_placeholder():
    raise HTTPException(status_code=405, detail="Use POST /api/generate.")


@app.post("/api/generate")
def api_generate(body: GenerateRequest) -> GenerateStartResponse:
    job_id = uuid.uuid4().hex
    total_steps = _expected_total_steps(body)
    _store_job(
        job_id,
        {
            "status": "queued",
            "message": "Queued",
            "completed_steps": 0,
            "total_steps": total_steps,
            "percent": 0,
            "individual_urls": {},
            "consolidated_url": None,
            "counts": {"individual": 0, "consolidated": 0, "total": 0},
            "step_history": [],
        },
    )
    worker = threading.Thread(
        target=_run_generation_job, args=(job_id, body), daemon=True
    )
    worker.start()
    return GenerateStartResponse(status="accepted", job_id=job_id)


@app.get("/api/generate/{job_id}")
def api_generate_status(job_id: str):
    with JOB_LOCK:
        job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.get("/api/downloads/{job_id}/{kind}/{filename}")
def api_download(job_id: str, kind: str, filename: str):
    base = get_data_dir().parent / "outputs" / job_id
    resolved_base = base.resolve()
    target = (resolved_base / kind / filename).resolve()

    try:
        target.relative_to(resolved_base)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid download path.") from exc

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(target, filename=target.name)


@app.get("/api/pursuits")
def api_list_pursuits():
    return list_pursuits()


@app.post("/api/pursuits")
def api_create_pursuit(body: PursuitCreate):
    import re

    pursuit_id = (
        re.sub(r"[^a-z0-9]+", "-", body.display_name.lower()).strip("-")
        or uuid.uuid4().hex
    )
    return upsert_pursuit(
        pursuit_id,
        {
            "display_name": body.display_name,
            "client": body.client,
            "engagement_number": body.engagement_number,
            "created_at": "local",
        },
    )


@app.get("/api/sessions")
def api_list_sessions():
    return list_sessions()


@app.get("/api/sessions/{session_id}")
def api_get_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@app.post("/api/sessions/{session_id}")
def api_save_session(session_id: str, body: SessionPayload):
    return save_session(session_id, body.model_dump())


@app.get("/api/config/paths")
def api_get_config_paths():
    return get_config_status()


@app.post("/api/config/paths")
def api_set_config_paths(body: ConfigPathsUpdate):
    if body.pursuits_root:
        resolved, error = validate_pursuits_root(body.pursuits_root)
        if error:
            raise HTTPException(status_code=400, detail=error)
        save_config({"pursuits_root": str(resolved)})
        _trigger_pursuits_sync_background()

    return {"ok": True, **get_config_status()}


@app.get("/api/health")
def api_health():
    return get_config_status()
