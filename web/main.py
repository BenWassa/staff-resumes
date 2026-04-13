"""FastAPI backend for the Resume Generator web app."""

from __future__ import annotations

import os
import sys
import threading
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from web.api.firebase_admin_init import initialize
from web.api.auth import require_admin, verify_token
from web.api.firestore_store import get_person_data, list_people
from web.api.runner import generate

app = FastAPI(title="Resume Generator API")
JOB_LOCK = threading.Lock()
JOBS: dict[str, dict] = {}

# ── CORS ───────────────────────────────────────────────────────────────────────

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


# ── App startup ─────────────────────────────────────────────────────────────────


@app.on_event("startup")
def on_startup():
    initialize()


# ── Schemas ────────────────────────────────────────────────────────────────────


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


# ── Job helpers ────────────────────────────────────────────────────────────────


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
            _store_job(job_id, {
                "status": "running",
                "message": "Preparing resume generation",
                "completed_steps": completed_steps,
                "total_steps": total_steps,
                "percent": _job_percent(completed_steps, total_steps),
                "current_step": None,
            })
            return

        if event_type in {"step_started", "step_completed"}:
            step_history = None
            if event_type == "step_completed":
                with JOB_LOCK:
                    existing = list(JOBS.get(job_id, {}).get("step_history", []))
                existing.append({
                    "type": event.get("step_type"),
                    "person_name": event.get("person_name"),
                    "label": event.get("label"),
                })
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
                    "status": "completed" if event_type == "step_completed" else "running",
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
            _store_job(job_id, {
                "status": "completed",
                "message": "Generation complete",
                "completed_steps": total_steps,
                "total_steps": total_steps,
                "percent": 100,
                "counts": counts,
                "individual_urls": individual_urls,
                "consolidated_url": consolidated_url,
            })

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
        _store_job(job_id, {
            "status": "failed",
            "message": str(exc),
            "error": str(exc),
        })


# ── People endpoints ───────────────────────────────────────────────────────────


@app.get("/api/people")
def api_list_people(token: dict = Depends(verify_token)):
    try:
        return list_people()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/people/{name}/data")
def api_person_data(name: str, token: dict = Depends(verify_token)):
    try:
        return get_person_data(name)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ── Generation endpoints ───────────────────────────────────────────────────────


@app.post("/api/generate")
def api_generate(body: GenerateRequest, token: dict = Depends(verify_token)) -> GenerateStartResponse:
    job_id = uuid.uuid4().hex
    total_steps = _expected_total_steps(body)
    _store_job(job_id, {
        "status": "queued",
        "message": "Queued",
        "completed_steps": 0,
        "total_steps": total_steps,
        "percent": 0,
        "individual_urls": {},
        "consolidated_url": None,
        "counts": {"individual": 0, "consolidated": 0, "total": 0},
        "step_history": [],
    })
    worker = threading.Thread(
        target=_run_generation_job, args=(job_id, body), daemon=True
    )
    worker.start()
    return GenerateStartResponse(status="accepted", job_id=job_id)


@app.get("/api/generate/{job_id}")
def api_generate_status(job_id: str, token: dict = Depends(verify_token)):
    with JOB_LOCK:
        job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


# ── Pursuits endpoints ─────────────────────────────────────────────────────────


@app.get("/api/pursuits")
def api_list_pursuits(token: dict = Depends(verify_token)):
    """List all pursuits from Firestore."""
    from firebase_admin import firestore
    db = firestore.client()
    docs = db.collection("pursuits").order_by("display_name").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


@app.post("/api/pursuits")
def api_create_pursuit(body: PursuitCreate, token: dict = Depends(require_admin)):
    """Admin: create a new pursuit entry."""
    from firebase_admin import firestore
    import re
    db = firestore.client()
    pursuit_id = re.sub(r"[^a-z0-9]+", "-", body.display_name.lower()).strip("-") or uuid.uuid4().hex
    ref = db.collection("pursuits").document(pursuit_id)
    ref.set({
        "display_name": body.display_name,
        "client": body.client,
        "engagement_number": body.engagement_number,
        "created_at": firestore.SERVER_TIMESTAMP,
    })
    return {"id": pursuit_id, **body.model_dump()}


# ── Sessions endpoints ─────────────────────────────────────────────────────────


@app.get("/api/sessions")
def api_list_sessions(token: dict = Depends(verify_token)):
    """List saved sessions — admins see all, members see their own."""
    from firebase_admin import firestore
    db = firestore.client()
    uid = token["uid"]

    # Check if admin
    user_doc = db.collection("users").document(uid).get()
    is_admin = user_doc.exists and user_doc.to_dict().get("role") == "admin"

    if is_admin:
        docs = db.collection("sessions").order_by("saved_at", direction=firestore.Query.DESCENDING).limit(50).stream()
    else:
        docs = (
            db.collection("sessions")
            .where("saved_by", "==", uid)
            .order_by("saved_at", direction=firestore.Query.DESCENDING)
            .limit(20)
            .stream()
        )

    return [{"id": d.id, **d.to_dict()} for d in docs]


@app.get("/api/sessions/{session_id}")
def api_get_session(session_id: str, token: dict = Depends(verify_token)):
    from firebase_admin import firestore
    db = firestore.client()
    doc = db.collection("sessions").document(session_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"id": doc.id, **doc.to_dict()}


@app.post("/api/sessions/{session_id}")
def api_save_session(session_id: str, body: SessionPayload, token: dict = Depends(verify_token)):
    from firebase_admin import firestore
    import datetime
    db = firestore.client()
    db.collection("sessions").document(session_id).set({
        **body.model_dump(),
        "saved_by": token["uid"],
        "saved_at": datetime.datetime.utcnow().isoformat(),
    })
    return {"ok": True}
