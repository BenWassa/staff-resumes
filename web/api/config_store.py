"""Persistent per-machine config stored in %APPDATA%/ResumeGenerator/config.json.

This is the single source of truth for user-configured paths on an installed machine.
The .env file remains for dev use only and is never required for a deployed install.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path


_APP_NAME = "ResumeGenerator"
_CONFIG_FILE = "config.json"

# Folder names must contain " - " and end with a segment that looks like YYYYNNN
# e.g. "City of Medicine Hat (AB) - 2025024"
_PROJECT_FOLDER_RE = re.compile(r".+ - \d{7}$")


def _config_dir() -> Path:
    app_data = os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming"
    return Path(app_data) / _APP_NAME


def get_app_data_dir() -> Path:
    """Return the per-machine application data directory."""
    return _config_dir()


def get_data_dir() -> Path:
    """Return the directory used for local JSON app state."""
    return _config_dir() / "data"


def _config_path() -> Path:
    return _config_dir() / _CONFIG_FILE


def load_config() -> dict:
    """Return the stored config dict, or {} if not yet written."""
    path = _config_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_config(data: dict) -> None:
    """Atomically write config to disk."""
    config_dir = _config_dir()
    config_dir.mkdir(parents=True, exist_ok=True)
    config_path = _config_path()
    config_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def get_pursuits_root() -> Path | None:
    """Return the configured pursuits root, or None if not configured."""
    raw = load_config().get("pursuits_root")
    if not raw:
        return None
    p = Path(raw)
    return p if p.exists() else None


def _looks_like_pursuits_root(path: Path) -> bool:
    """True if this folder directly contains project subdirs matching the naming pattern."""
    if not path.is_dir():
        return False
    for child in path.iterdir():
        if child.is_dir() and _PROJECT_FOLDER_RE.match(child.name):
            return True
    return False


def extract_pursuits_root(picked: str) -> Path | None:
    """Given a user-picked path (possibly one level too deep), return the pursuits root.

    Accepts:
    - The pursuits root itself  (contains project subdirs like "Client - YYYYNNN")
    - A project subfolder one level inside the root

    Returns None if neither the path nor its parent looks like the pursuits root.
    """
    candidate = Path(picked).resolve()

    if _looks_like_pursuits_root(candidate):
        return candidate

    parent = candidate.parent
    if _looks_like_pursuits_root(parent):
        return parent

    return None


def validate_pursuits_root(raw_path: str) -> tuple[Path | None, str | None]:
    """Validate a user-picked path and return (resolved_path, error_msg).

    On success, returns (resolved_path, None).
    On failure, returns (None, error_message).
    """
    if not raw_path or not raw_path.strip():
        return None, "Path cannot be empty."

    candidate = extract_pursuits_root(raw_path.strip())
    if candidate is None:
        return None, "Path does not contain project folders matching pattern 'Client Name - YYYYNNN'."

    return candidate, None


def get_config_status() -> dict:
    """Return current config and status of configured paths.

    Used by frontend to determine if setup is needed.
    """
    config = load_config()
    pursuits_root = config.get("pursuits_root")
    pursuits_root_exists = False

    if pursuits_root:
        p = Path(pursuits_root)
        pursuits_root_exists = p.exists() and _looks_like_pursuits_root(p)

    return {
        "pursuits_root": pursuits_root,
        "pursuits_root_exists": pursuits_root_exists,
    }
