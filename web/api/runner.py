"""Build selections config from UI payload and run the pipeline."""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.data_loader import load_profile
from src.global_workbook import resolve_workbook_path
from src.pipeline import run_pipeline
from src.runtime_config import get_runtime_config

RUNTIME = get_runtime_config()
OUTPUTS_ROOT = RUNTIME.outputs_root


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "package"


def _build_package_context(
    selected_project_id: str | None,
    include_cover: bool,
    include_end_page: bool,
) -> dict:
    return {
        "engagement_title": None,
        "proposal_number": None,
        "client": None,
        "due_date": None,
        "due_time": None,
        "include_cover": include_cover,
        "include_end_page": include_end_page,
    }


def generate(
    package_name: str,
    people: list[dict],
    selected_project_id: str | None = None,
    include_cover: bool = True,
    include_end_page: bool = False,
    progress_callback=None,
) -> dict:
    """Run the pipeline for the given selections and return output metadata.

    Args:
        package_name: Label for this output package (used as output subfolder).
        people: List of per-person dicts with keys:
            - name (str)
            - projects (list[str]) ordered project keys
            - education_indices (list[int]) 1-based indices of education entries to include
    """
    runtime = get_runtime_config()
    workbook_path = resolve_workbook_path(runtime, refresh_if_configured=False)
    package_slug = _slugify(package_name)
    if runtime.use_pursuit_outputs and selected_project_id:
        output_dir = (
            runtime.pursuits_root
            / selected_project_id
            / runtime.pursuit_output_folder_name
            / package_slug
        )
    else:
        output_dir = runtime.outputs_root / package_slug

    people_config = []
    consolidated_include = [
        person["name"]
        for person in people
        if person.get("include_in_consolidated", True)
    ]

    for person in people:
        name = person["name"]
        project_keys = person.get("projects", [])
        edu_indices = set(person.get("education_indices", []))

        profile = load_profile(str(workbook_path), name)
        all_education = profile.get("education", [])
        if edu_indices:
            filtered_education = [
                entry
                for idx, entry in enumerate(all_education, start=1)
                if idx in edu_indices
            ]
        else:
            filtered_education = []

        person_cfg = {
            "name": name,
            "output": "individual",
            "first_name": profile.get("first_name", name.split()[0]),
            "last_name": profile.get("last_name", name.split()[-1]),
            "title": profile.get("title", ""),
            "summary": profile.get("summary", ""),
            "education": filtered_education,
            "projects": [
                {"key": key, "order": order + 1}
                for order, key in enumerate(project_keys)
            ],
        }
        people_config.append(person_cfg)

    selections = {
        "people": people_config,
        "consolidated": {"include": consolidated_include},
        "package_context": _build_package_context(
            selected_project_id=selected_project_id,
            include_cover=include_cover,
            include_end_page=include_end_page,
        ),
    }

    return run_pipeline(
        selections_override=selections,
        output_dir=output_dir,
        progress_callback=progress_callback,
    )
