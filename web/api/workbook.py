"""Read person and project data from the Excel workbook."""

from __future__ import annotations

import sys
from pathlib import Path

import openpyxl

# Allow imports from the parent src/ package
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.data_loader import PERSON_SHEET_ALIASES, load_profile, load_projects
from src.formatter import normalize_project_date_range
from src.global_workbook import resolve_workbook_path
from src.project_date_matcher import get_approved_dates
from src.runtime_config import get_runtime_config


def _workbook_path() -> Path:
    runtime = get_runtime_config()
    # Read the latest built workbook instead of rebuilding on every API request.
    # Rebuilds can be triggered separately by the pipeline, and this keeps the
    # staff list stable across duplicate development requests.
    return resolve_workbook_path(runtime, refresh_if_configured=False)


_ALIAS_REVERSE = {value: key for key, value in PERSON_SHEET_ALIASES.items()}


def list_people() -> list[dict]:
    """Return all people found in the workbook (those with a _projects sheet)."""
    workbook_path = _workbook_path()
    wb = openpyxl.load_workbook(str(workbook_path), read_only=True, data_only=True)
    people = []
    for sheet_name in wb.sheetnames:
        if sheet_name.endswith("_projects"):
            workbook_name = sheet_name[: -len("_projects")]
            canonical_name = _ALIAS_REVERSE.get(workbook_name, workbook_name)
            profile = load_profile(str(workbook_path), canonical_name)
            people.append(
                {
                    "name": canonical_name,
                    "display_name": canonical_name,
                    "title": profile.get("title", ""),
                    "summary": profile.get("summary", ""),
                }
            )
    wb.close()
    return people


def get_person_data(person_name: str) -> dict:
    """Return projects list and education entries for a person."""
    workbook_path = _workbook_path()
    df = load_projects(str(workbook_path), person_name)
    profile = load_profile(str(workbook_path), person_name)

    projects = []
    for _, row in df.iterrows():
        key = str(row.get("Project Key", "")).strip()
        if not key:
            continue

        start_date = str(row.get("Start Date", "")).strip()
        end_date = str(row.get("End Date", "")).strip()
        date_range = normalize_project_date_range(row)

        # Enrich from matched master references when the sheet has no dates
        if not start_date and not end_date:
            approved = get_approved_dates(person_name, key)
            start_date = approved["start_date"]
            end_date = approved["end_date"]
            if start_date and end_date:
                date_range = f"{start_date} to {end_date}"
            elif start_date:
                date_range = f"From {start_date}"
            elif end_date:
                date_range = f"Until {end_date}"

        projects.append(
            {
                "key": key,
                "client": str(row.get("Client", "")).strip(),
                "title": str(row.get("Project Title", "")).strip(),
                "start_date": start_date,
                "end_date": end_date,
                "date_range": date_range,
            }
        )

    education = profile.get("education", [])

    return {
        "name": person_name,
        "title": profile.get("title", ""),
        "summary": profile.get("summary", ""),
        "education": education,
        "projects": projects,
    }
