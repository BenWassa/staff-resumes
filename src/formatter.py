from __future__ import annotations

import pandas as pd


def _normalize_project_date_value(value: object) -> str:
    if value is None or pd.isna(value):
        return ""

    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")

    text = str(value).strip()
    if not text:
        return ""

    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]

    return text


def normalize_project_date_range(row: pd.Series) -> str:
    """Return a compact display string from Start/End Date columns when present."""
    start_date = _normalize_project_date_value(row.get("Start Date", ""))
    end_date = _normalize_project_date_value(row.get("End Date", ""))

    if start_date and end_date:
        return f"{start_date} to {end_date}"
    if start_date:
        return f"From {start_date}"
    if end_date:
        return f"Until {end_date}"
    return ""


def format_projects(df: pd.DataFrame) -> list[dict]:
    """Convert project rows into a writer-friendly structure."""
    projects: list[dict] = []

    for _, row in df.iterrows():
        project = {
            "project_key": str(row.get("Project Key", "")).strip(),
            "client": str(row.get("Client", "")).strip(),
            "title": str(row.get("Project Title", "")).strip(),
            "description": str(row.get("Full Project Description", "")).strip(),
            "project_order": row.get("Project Order", ""),
            "selected_order": row.get("Selected Order", ""),
            "start_date": _normalize_project_date_value(row.get("Start Date", "")),
            "end_date": _normalize_project_date_value(row.get("End Date", "")),
            "date_range": normalize_project_date_range(row),
        }
        projects.append(project)

    return projects
