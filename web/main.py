"""FastAPI backend for the Resume Generation UI."""

from __future__ import annotations

import json
import os
import sys
import threading
import uuid
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.project_dates import extract_engagement_number, load_master_project_dates
from api.workbook import get_person_data, list_people
from api.runner import generate, OUTPUTS_ROOT

app = FastAPI(title="Resume Generator API")
JOB_LOCK = threading.Lock()

PURSUITS_ROOT = Path(
    r"C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents"
)

JOBS: dict[str, dict] = {}


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class SaveStatePayload(BaseModel):
    schema_version: int = 1
    saved_at: str
    package_name: str
    selected_project_id: str | None = None
    include_package_pages: bool = True
    selected_names: list[str]
    selections: dict[str, dict]


class SaveSummary(BaseModel):
    slug: str
    package_name: str
    saved_at: str
    selected_names: list[str]
    selected_project_id: str | None = None


class OutputsExistResponse(BaseModel):
    exists: bool
    individual_count: int
    consolidated_exists: bool


def _save_payload_to_yaml_document(save_payload: dict) -> str:
    selected_names = save_payload.get("selected_names") or []
    selections = save_payload.get("selections") or {}

    people = []
    for name in selected_names:
        selection = selections.get(name) or {}
        projects = selection.get("projects") or []
        people.append(
            {
                "name": name,
                "projects": [
                    {"key": project_key, "order": index}
                    for index, project_key in enumerate(projects, start=1)
                ],
            }
        )

    document = {
        "people": people,
        "consolidated": {
            "include": selected_names,
        },
    }
    return yaml.safe_dump(document, sort_keys=False, allow_unicode=True)


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
    has_consolidated = any(person.include_in_consolidated for person in body.people)
    return len(body.people) + (1 if has_consolidated else 0)


def _run_generation_job(job_id: str, body: GenerateRequest) -> None:
    def on_progress(event: dict) -> None:
        event_type = event.get("event")
        completed_steps = event.get("completed_steps", 0)
        total_steps = event.get("total_steps", _expected_total_steps(body))

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
                    "current_output_path": None,
                    "output_dir": event.get("output_dir"),
                },
            )
            return

        if event_type in {"step_started", "step_completed"}:
            step_history = None
            if event_type == "step_completed":
                with JOB_LOCK:
                    existing_history = list(
                        JOBS.get(job_id, {}).get("step_history", [])
                    )
                existing_history.append(
                    {
                        "type": event.get("step_type"),
                        "person_name": event.get("person_name"),
                        "label": event.get("label"),
                        "output_path": event.get("output_path"),
                    }
                )
                step_history = existing_history
            _store_job(
                job_id,
                {
                    "status": "running",
                    "message": event.get("label") or "Generating resumes",
                    "completed_steps": completed_steps,
                    "total_steps": total_steps,
                    "percent": _job_percent(completed_steps, total_steps),
                    "current_step": {
                        "type": event.get("step_type"),
                        "person_name": event.get("person_name"),
                        "label": event.get("label"),
                        "status": (
                            "completed" if event_type == "step_completed" else "running"
                        ),
                    },
                    "current_output_path": event.get("output_path"),
                    **(
                        {"step_history": step_history}
                        if step_history is not None
                        else {}
                    ),
                },
            )
            return

        if event_type == "completed":
            counts = event.get("counts", {})
            individual_count = counts.get("individual", 0)
            consolidated_count = counts.get("consolidated", 0)
            output_dir = event.get("output_dir")
            summary_parts = []
            if consolidated_count:
                summary_parts.append("consolidated resume")
            summary_parts.append(
                f"{individual_count} individual resume{'s' if individual_count != 1 else ''}"
            )
            summary = f"Outputted {', and '.join(summary_parts)} at {output_dir}"
            _store_job(
                job_id,
                {
                    "status": "completed",
                    "message": summary,
                    "completed_steps": event.get("completed_steps", total_steps),
                    "total_steps": event.get("total_steps", total_steps),
                    "percent": 100,
                    "current_step": {
                        "type": "completed",
                        "label": "Generation complete",
                        "status": "completed",
                    },
                    "current_output_path": event.get("consolidated_path") or output_dir,
                    "output_dir": output_dir,
                    "output_paths": event.get("output_paths", []),
                    "individual_paths": event.get("individual_paths", []),
                    "consolidated_path": event.get("consolidated_path"),
                    "counts": counts,
                },
            )

    try:
        result = generate(
            package_name=body.package_name,
            selected_project_id=body.selected_project_id,
            include_cover=body.include_cover,
            include_end_page=body.include_end_page,
            people=[p.model_dump() for p in body.people],
            progress_callback=on_progress,
        )
        # Always signal completion if the pipeline finished without its own callback
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


# ── Endpoints ──────────────────────────────────────────────────────────────────


@app.get("/api/people")
def api_list_people():
    try:
        return list_people()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def extract_short_client(client_name):
    if not client_name:
        return ""
    # Look for patterns like "Full Name (ACRONYM)" or "Full Name [ACRONYM]"
    import re

    match = re.search(r"\(([^)]+)\)", client_name)
    if not match:
        match = re.search(r"\[([^\]]+)\]", client_name)
    if match:
        return match.group(1).strip()
    return client_name


def scan_pursuits_folder():
    """Scan the OneDrive Pursuits folder to find projects independently."""
    projects = []
    if not PURSUITS_ROOT.exists():
        return projects

    # Pattern: Client Name - YYYYNNN (e.g. Anaheim - 2026049)
    # We want everything before the " - "
    for path in PURSUITS_ROOT.iterdir():
        if not path.is_dir() or path.name.lower().startswith("_"):
            continue

        folder_name = path.name
        if " - " in folder_name:
            client_part = folder_name.split(" - ")[0].strip()
            engagement_number = folder_name.split(" - ")[-1].strip()
        else:
            client_part = folder_name
            engagement_number = ""

        projects.append(
            {
                "project_id": folder_name,
                "name": folder_name,
                "folder_name": folder_name,
                "display_name": (
                    f"{client_part} ({engagement_number})"
                    if engagement_number
                    else client_part
                ),
                "client": client_part,
                "short_client": client_part,  # Use the trimmed name as shortform
                "engagement_type": "",  # Type unknown from folder name
                "engagement_number": engagement_number,
                "project_type": "pursuit",
                "stage": "Proposal",
                "lifecycle_status": "active",
                "source": "pursuits_folder",
            }
        )
    return projects


@app.get("/api/projects")
def api_list_projects():
    try:
        # 1. Get projects discovered from the Pursuits folder
        projects = scan_pursuits_folder()

        def sort_key(project: dict) -> str:
            return project["display_name"].casefold()

        return sorted(projects, key=sort_key)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/people/{name}/data")
def api_person_data(name: str):
    try:
        return get_person_data(name)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/generate")
def api_generate(body: GenerateRequest) -> GenerateStartResponse:
    job_id = uuid.uuid4().hex
    total_steps = _expected_total_steps(body)
    _store_job(
        job_id,
        {
            "status": "queued",
            "message": "Queued resume generation",
            "completed_steps": 0,
            "total_steps": total_steps,
            "percent": 0,
            "output_paths": [],
            "individual_paths": [],
            "consolidated_path": None,
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
        raise HTTPException(status_code=404, detail="Generation job not found.")
    return job


# ── YAML import endpoint ───────────────────────────────────────────────────────

YAML_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "selections.template.yaml"
)


@app.get("/api/yaml-template")
def api_yaml_template():
    """Download the selections.yaml template file."""
    if not YAML_TEMPLATE_PATH.exists():
        raise HTTPException(status_code=404, detail="Template file not found.")
    return FileResponse(
        path=str(YAML_TEMPLATE_PATH),
        media_type="text/yaml",
        filename="selections.template.yaml",
    )


class YamlImportRequest(BaseModel):
    content: str  # raw YAML text


@app.post("/api/yaml-import")
def api_yaml_import(body: YamlImportRequest):
    """Parse submitted YAML and return pre-built person selections."""
    # ── Parse ────────────────────────────────────────────────────────────────
    try:
        doc = yaml.safe_load(body.content) or {}
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid YAML: {exc}") from exc

    if not isinstance(doc, dict):
        raise HTTPException(
            status_code=422, detail="YAML must be a mapping with a 'people' key."
        )

    raw_people = doc.get("people")
    if not raw_people:
        raise HTTPException(
            status_code=422, detail="No 'people' key found (or it is empty)."
        )
    if not isinstance(raw_people, list):
        raise HTTPException(
            status_code=422, detail="'people' must be a list of entries."
        )

    # ── Validate structure before hitting workbook ────────────────────────────
    for i, entry in enumerate(raw_people):
        if not isinstance(entry, dict):
            raise HTTPException(
                status_code=422, detail=f"people[{i}] must be a mapping."
            )
        if not entry.get("name"):
            raise HTTPException(
                status_code=422, detail=f"people[{i}] is missing a 'name' field."
            )
        projects = entry.get("projects")
        if projects is not None:
            if not isinstance(projects, list):
                raise HTTPException(
                    status_code=422,
                    detail=f"people[{i}] ('name'): 'projects' must be a list.",
                )
            for j, proj in enumerate(projects):
                if not isinstance(proj, dict) or not proj.get("key"):
                    raise HTTPException(
                        status_code=422,
                        detail=f"people[{i}].projects[{j}]: each project must have a 'key' field.",
                    )

    # ── Load workbook data ────────────────────────────────────────────────────
    results = []
    errors = []
    for entry in raw_people:
        name = entry["name"].strip()
        try:
            person_data = get_person_data(name)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            continue

        yaml_project_keys = [
            p["key"]
            for p in sorted(
                entry.get("projects") or [], key=lambda item: item.get("order", 0)
            )
        ]

        available_keys = {p["key"] for p in person_data["projects"]}
        missing_keys = [k for k in yaml_project_keys if k not in available_keys]
        project_keys = [k for k in yaml_project_keys if k in available_keys]

        if missing_keys:
            errors.append(
                f"{name}: project key(s) not found in workbook and skipped: {', '.join(missing_keys)}"
            )

        edu_count = len(person_data.get("education", []))
        education_indices = list(range(1, edu_count + 1))

        results.append(
            {
                "name": name,
                "person_data": person_data,
                "selection": {
                    "projects": project_keys,
                    "education_indices": education_indices,
                },
            }
        )

    if not results:
        detail = "No people could be loaded from the workbook."
        if errors:
            detail += " Errors: " + "; ".join(errors)
        raise HTTPException(status_code=422, detail=detail)

    consolidated_raw = doc.get("consolidated", {})
    consolidated_names = (consolidated_raw or {}).get("include", [])
    if not consolidated_names:
        consolidated_names = [r["name"] for r in results]

    return {
        "people": results,
        "consolidated_names": consolidated_names,
        "errors": errors,
    }


# ── Save state endpoints ────────────────────────────────────────────────────────


@app.get("/api/saves", response_model=list[SaveSummary])
def api_list_saves():
    saves = []
    for save_file in OUTPUTS_ROOT.glob("*/save_state.json"):
        try:
            data = json.loads(save_file.read_text(encoding="utf-8"))
            saves.append(
                SaveSummary(
                    slug=save_file.parent.name,
                    package_name=data.get("package_name", save_file.parent.name),
                    saved_at=data.get("saved_at", ""),
                    selected_names=data.get("selected_names", []),
                    selected_project_id=data.get("selected_project_id"),
                )
            )
        except Exception:
            continue
    saves.sort(key=lambda s: s.saved_at, reverse=True)
    return saves


@app.get("/api/saves/{slug}", response_model=SaveStatePayload)
def api_get_save(slug: str):
    save_file = OUTPUTS_ROOT / slug / "save_state.json"
    if not save_file.exists():
        raise HTTPException(
            status_code=404, detail="No save state found for this package."
        )
    try:
        return json.loads(save_file.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Save file is corrupted: {exc}"
        ) from exc


@app.get("/api/saves/{slug}/yaml")
def api_export_save_yaml(slug: str):
    save_file = OUTPUTS_ROOT / slug / "save_state.json"
    if not save_file.exists():
        raise HTTPException(
            status_code=404, detail="No save state found for this package."
        )

    try:
        save_payload = json.loads(save_file.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Save file is corrupted: {exc}"
        ) from exc

    yaml_content = _save_payload_to_yaml_document(save_payload)
    return Response(
        content=yaml_content,
        media_type="text/yaml",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}.selections.yaml"',
        },
    )


@app.post("/api/saves/{slug}")
def api_save_state(slug: str, body: SaveStatePayload):
    save_dir = OUTPUTS_ROOT / slug
    save_dir.mkdir(parents=True, exist_ok=True)
    save_file = save_dir / "save_state.json"
    save_file.write_text(
        json.dumps(body.model_dump(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return {"ok": True}


@app.get("/api/saves/{slug}/outputs_exist", response_model=OutputsExistResponse)
def api_outputs_exist(slug: str):
    individual_dir = OUTPUTS_ROOT / slug / "individual"
    consolidated_dir = OUTPUTS_ROOT / slug / "consolidated"
    individual_count = (
        len(list(individual_dir.glob("*.docx"))) if individual_dir.exists() else 0
    )
    consolidated_exists = (
        (consolidated_dir / "consolidated_resume.docx").exists()
        if consolidated_dir.exists()
        else False
    )
    return OutputsExistResponse(
        exists=individual_count > 0 or consolidated_exists,
        individual_count=individual_count,
        consolidated_exists=consolidated_exists,
    )


@app.get("/api/saves/{slug}/open_folder")
def api_open_output_folder(slug: str):
    import subprocess

    path = OUTPUTS_ROOT / slug
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)

    if sys.platform == "win32":
        os.startfile(path)
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])
    else:
        subprocess.Popen(["xdg-open", str(path)])
    return {"ok": True}
