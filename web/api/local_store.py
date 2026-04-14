"""Local JSON-backed application state.

This replaces the previous cloud data model with files stored in the
machine-specific app data directory. The workbook remains the source of the
base staff/project data, while local edits are persisted as overrides.
"""

from __future__ import annotations

import json
import re
import tempfile
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from web.api.config_store import get_data_dir

_STORE_LOCK = threading.Lock()
_STAFF_FILE = "staff.json"
_PURSUITS_FILE = "pursuits.json"
_SESSIONS_FILE = "sessions.json"


def _store_path(filename: str) -> Path:
    return get_data_dir() / filename


def _read_json_file(path: Path, default):
    if not path.exists():
        return deepcopy(default)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return deepcopy(default)


def _write_json_file(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", delete=False, dir=path.parent, encoding="utf-8"
    ) as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        temp_name = handle.name
    Path(temp_name).replace(path)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_staff_store() -> dict[str, dict]:
    data = _read_json_file(_store_path(_STAFF_FILE), {})
    if not isinstance(data, dict):
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def _save_staff_store(data: dict[str, dict]) -> None:
    _write_json_file(_store_path(_STAFF_FILE), data)


def _load_pursuits_store() -> dict[str, dict]:
    data = _read_json_file(_store_path(_PURSUITS_FILE), {})
    if not isinstance(data, dict):
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def _save_pursuits_store(data: dict[str, dict]) -> None:
    _write_json_file(_store_path(_PURSUITS_FILE), data)


def _load_sessions_store() -> dict[str, dict]:
    data = _read_json_file(_store_path(_SESSIONS_FILE), {})
    if not isinstance(data, dict):
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def _save_sessions_store(data: dict[str, dict]) -> None:
    _write_json_file(_store_path(_SESSIONS_FILE), data)


def _split_display_name(display_name: str) -> tuple[str, str]:
    parts = (display_name or "").strip().split()
    if not parts:
        return "", ""
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return first_name, last_name


def _normalize_person_key(value: str) -> str:
    """Normalize a person identifier for resilient lookup."""
    text = (value or "").strip().casefold()
    if not text:
        return ""
    text = re.sub(r"[-_/]+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _resolve_person_name(
    requested_name: str, *, overrides: dict[str, dict] | None = None
) -> str:
    """Resolve a requested person name to a canonical workbook name."""
    from web.api.workbook import list_people as workbook_list_people

    candidate = (requested_name or "").strip()
    if not candidate:
        return candidate

    try:
        workbook_people = workbook_list_people()
    except Exception:
        workbook_people = []

    known_names: set[str] = set()
    for person in workbook_people:
        for key in ("name", "display_name"):
            value = str(person.get(key) or "").strip()
            if value:
                known_names.add(value)

    if overrides:
        for staff_id, data in overrides.items():
            if staff_id:
                known_names.add(str(staff_id).strip())
            for key in ("name", "display_name"):
                value = str((data or {}).get(key) or "").strip()
                if value:
                    known_names.add(value)

    if candidate in known_names:
        return candidate

    requested_normalized = _normalize_person_key(candidate)
    if not requested_normalized:
        return candidate

    normalized_lookup: dict[str, str] = {}
    for known in known_names:
        normalized = _normalize_person_key(known)
        if normalized and normalized not in normalized_lookup:
            normalized_lookup[normalized] = known

    return normalized_lookup.get(requested_normalized, candidate)


def _base_person_record(person_name: str, *, overrides: dict[str, dict] | None = None) -> dict:
    from web.api.workbook import get_person_data as workbook_person_data

    resolved_name = _resolve_person_name(person_name, overrides=overrides)

    try:
        data = workbook_person_data(resolved_name)
    except Exception as exc:
        raise ValueError(f"No staff record found for '{person_name}'") from exc

    display_name = data.get("name") or resolved_name or person_name
    first_name, last_name = _split_display_name(display_name)
    return {
        "staff_id": display_name,
        "display_name": display_name,
        "name": display_name,
        "first_name": first_name,
        "last_name": last_name,
        "title": data.get("title", ""),
        "summary": data.get("summary", ""),
        "education": data.get("education", []),
        "projects": data.get("projects", []),
    }


def _merge_person_records(base: dict, override: dict | None) -> dict:
    if not override:
        return base

    merged = dict(base)
    for key in ("display_name", "name", "first_name", "last_name", "title", "summary"):
        value = override.get(key)
        if value is not None:
            merged[key] = value
    for key in ("education", "projects"):
        value = override.get(key)
        if value is not None:
            merged[key] = value

    display_name = merged.get("display_name") or merged.get("name") or base["staff_id"]
    merged["display_name"] = display_name
    merged["name"] = display_name
    merged["staff_id"] = merged.get("staff_id") or base["staff_id"] or display_name

    if not merged.get("first_name") and not merged.get("last_name"):
        first_name, last_name = _split_display_name(display_name)
        merged["first_name"] = first_name
        merged["last_name"] = last_name

    merged.setdefault("summary", "")
    merged.setdefault("education", [])
    merged.setdefault("projects", [])
    return merged


def list_people() -> list[dict]:
    """Return all staff records, merging workbook data with local overrides."""
    from web.api.workbook import list_people as workbook_list_people

    with _STORE_LOCK:
        overrides = _load_staff_store()

    people_by_id: dict[str, dict] = {}

    try:
        workbook_people = workbook_list_people()
    except Exception:
        workbook_people = []

    for person in workbook_people:
        display_name = person.get("display_name") or person.get("name") or ""
        if not display_name:
            continue
        first_name, last_name = _split_display_name(display_name)
        base = {
            "name": display_name,
            "display_name": display_name,
            "title": person.get("title", ""),
            "staff_id": display_name,
            "first_name": first_name,
            "last_name": last_name,
        }
        people_by_id[display_name] = _merge_person_records(
            base, overrides.get(display_name)
        )

    for staff_id, override in overrides.items():
        if staff_id in people_by_id:
            continue
        base = {
            "staff_id": staff_id,
            "display_name": override.get("display_name") or staff_id,
            "name": override.get("display_name") or staff_id,
            "first_name": override.get("first_name", ""),
            "last_name": override.get("last_name", ""),
            "title": override.get("title", ""),
            "summary": override.get("summary", ""),
            "education": override.get("education", []),
            "projects": override.get("projects", []),
        }
        people_by_id[staff_id] = _merge_person_records(base, override)

    people = list(people_by_id.values())
    people.sort(key=lambda person: person.get("display_name", ""))
    return people


def get_person_data(person_name: str) -> dict:
    """Return a merged staff profile for the given staff member."""
    with _STORE_LOCK:
        overrides = _load_staff_store()

    base = _base_person_record(person_name, overrides=overrides)
    override = overrides.get(base["staff_id"]) or overrides.get(person_name)
    merged = _merge_person_records(base, override)
    return merged


def upsert_person_data(person_name: str, updates: dict) -> dict:
    """Persist a local override for a staff profile and return the merged record."""
    with _STORE_LOCK:
        overrides = _load_staff_store()

        base = _base_person_record(person_name, overrides=overrides)
        staff_id = base["staff_id"]
        current = _merge_person_records(base, overrides.get(staff_id))
        merged = dict(current)

        for key in ("display_name", "name", "first_name", "last_name", "title", "summary"):
            if key in updates and updates[key] is not None:
                merged[key] = updates[key]

        for key in ("education", "projects"):
            if key in updates and updates[key] is not None:
                merged[key] = updates[key]

        merged["display_name"] = merged.get("display_name") or staff_id
        merged["name"] = merged["display_name"]
        merged["staff_id"] = staff_id
        if not merged.get("first_name") and not merged.get("last_name"):
            merged["first_name"], merged["last_name"] = _split_display_name(
                merged["display_name"]
            )
        merged["updated_at"] = _now_iso()

        overrides[staff_id] = {
            "display_name": merged["display_name"],
            "name": merged["name"],
            "first_name": merged.get("first_name", ""),
            "last_name": merged.get("last_name", ""),
            "title": merged.get("title", ""),
            "summary": merged.get("summary", ""),
            "education": merged.get("education", []),
            "projects": merged.get("projects", []),
            "updated_at": merged["updated_at"],
        }
        _save_staff_store(overrides)
        return merged


def list_pursuits() -> list[dict]:
    with _STORE_LOCK:
        pursuits = _load_pursuits_store()
    values = [{"id": pursuit_id, **data} for pursuit_id, data in pursuits.items()]
    values.sort(key=lambda item: item.get("display_name", ""))
    return values


def upsert_pursuit(pursuit_id: str, data: dict) -> dict:
    with _STORE_LOCK:
        pursuits = _load_pursuits_store()
        current = pursuits.get(pursuit_id, {})
        merged = {
            **current,
            **data,
            "display_name": data.get("display_name") or current.get("display_name") or pursuit_id,
            "client": data.get("client", current.get("client", "")),
            "engagement_number": data.get(
                "engagement_number", current.get("engagement_number", "")
            ),
            "updated_at": _now_iso(),
        }
        pursuits[pursuit_id] = merged
        _save_pursuits_store(pursuits)
        return {"id": pursuit_id, **merged}


def replace_pursuits_from_disk(items: list[dict]) -> int:
    """Replace or merge pursuits with the current on-disk scan."""
    with _STORE_LOCK:
        pursuits = _load_pursuits_store()
        count = 0
        for item in items:
            pursuit_id = str(item.get("id") or item.get("engagement_number") or "").strip()
            if not pursuit_id:
                continue
            current = pursuits.get(pursuit_id, {})
            pursuits[pursuit_id] = {
                **current,
                **item,
                "id": pursuit_id,
                "updated_at": _now_iso(),
            }
            count += 1
        _save_pursuits_store(pursuits)
        return count


def list_sessions() -> list[dict]:
    with _STORE_LOCK:
        sessions = _load_sessions_store()
    values = [{"id": session_id, **data} for session_id, data in sessions.items()]
    values.sort(key=lambda item: item.get("saved_at", ""), reverse=True)
    return values


def get_session(session_id: str) -> dict | None:
    with _STORE_LOCK:
        sessions = _load_sessions_store()
    data = sessions.get(session_id)
    if data is None:
        return None
    return {"id": session_id, **data}


def save_session(session_id: str, body: dict, saved_by: str = "local") -> dict:
    with _STORE_LOCK:
        sessions = _load_sessions_store()
        record = {
            **body,
            "saved_by": saved_by,
            "saved_at": _now_iso(),
        }
        sessions[session_id] = record
        _save_sessions_store(sessions)
        return {"id": session_id, **record}
