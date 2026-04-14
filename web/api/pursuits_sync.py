"""Sync pursuits from the local file system into Firestore.

Called once at dev-server startup (non-blocking, background thread).
The pursuits root is read from LOCAL_PURSUITS_ROOT in the environment,
falling back to the per-machine config written by the desktop setup wizard.

Folder names must match the pattern:  <Client Name> - <7-digit engagement number>
e.g.  "City of Medicine Hat (AB) - 2025024"
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path

log = logging.getLogger(__name__)

# Same regex used in config_store.py
_PROJECT_FOLDER_RE = re.compile(r"^(.+) - (\d{7})$")


def _pursuits_root() -> Path | None:
    """Return the pursuits root path, or None if unavailable."""
    # 1. Prefer the env-var set in .env (dev machines)
    env_val = os.environ.get("LOCAL_PURSUITS_ROOT", "").strip()
    if env_val:
        p = Path(env_val)
        if p.is_dir():
            return p
        log.warning("pursuits_sync: LOCAL_PURSUITS_ROOT=%r does not exist — skipping", env_val)
        return None

    # 2. Fall back to per-machine config (desktop install)
    try:
        from web.api.config_store import get_pursuits_root
        return get_pursuits_root()
    except Exception:
        return None


def _parse_folder(name: str) -> tuple[str, str] | None:
    """Return (display_name, engagement_number) or None if name doesn't match."""
    m = _PROJECT_FOLDER_RE.match(name)
    if not m:
        return None
    client_part = m.group(1).strip()
    engagement = m.group(2)
    return client_part, engagement


def sync_pursuits_from_disk() -> int:
    """Scan the pursuits root and upsert each folder as a Firestore pursuit document.

    Returns the number of pursuits written (0 if nothing done).
    Errors are logged but never raised — startup must not fail because of this.
    """
    root = _pursuits_root()
    if root is None:
        log.info("pursuits_sync: no pursuits root configured — skipping sync")
        return 0

    try:
        from firebase_admin import firestore
    except Exception as exc:
        log.warning("pursuits_sync: firebase_admin not ready — %s", exc)
        return 0

    try:
        db = firestore.client()
    except Exception as exc:
        log.warning("pursuits_sync: could not get Firestore client — %s", exc)
        return 0

    written = 0
    batch = db.batch()
    batch_count = 0

    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        parsed = _parse_folder(child.name)
        if parsed is None:
            continue

        client_name, engagement_number = parsed
        display_name = child.name  # full folder name, e.g. "City of Medicine Hat (AB) - 2025024"

        # Stable document ID from the engagement number (unique per project)
        doc_id = engagement_number

        ref = db.collection("pursuits").document(doc_id)
        batch.set(
            ref,
            {
                "display_name": display_name,
                "client": client_name,
                "engagement_number": engagement_number,
                "synced_from_disk": True,
            },
            merge=True,  # preserve any extra fields written by the frontend
        )
        batch_count += 1
        written += 1

        # Firestore batch limit is 500 operations
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    log.info("pursuits_sync: synced %d pursuits from %s", written, root)
    return written
