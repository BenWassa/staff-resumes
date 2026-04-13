from __future__ import annotations

from pathlib import Path

import pandas as pd

PERSON_SHEET_ALIASES = {
    "Benjamin Haddon": "Ben Haddon",
}


COLUMN_ALIASES = {
    "Client (as written)": "Client",
    "Project Title (as written)": "Project Title",
    "Full Project Description (exact copy)": "Full Project Description",
}

PROFILE_FIELD_MAP = {
    "PERSON_FIRST": "first_name",
    "PERSON_LAST": "last_name",
    "PERSON_TITLE": "title",
    "PERSON_SUMMARY": "summary",
}


def load_projects(excel_path: str | Path, person_name: str) -> pd.DataFrame:
    """Return the projects sheet for a person."""
    workbook_path = Path(excel_path)
    sheet_person_name = PERSON_SHEET_ALIASES.get(person_name, person_name)
    sheet_name = f"{sheet_person_name}_projects"

    try:
        df = pd.read_excel(workbook_path, sheet_name=sheet_name)
    except ValueError as exc:
        raise ValueError(
            f"Sheet '{sheet_name}' was not found in {workbook_path}."
        ) from exc

    df = df.rename(columns=COLUMN_ALIASES).fillna("")
    return df


def load_profile(excel_path: str | Path, person_name: str) -> dict:
    """Return person metadata from a `{Name}_profile` sheet when present."""
    workbook_path = Path(excel_path)
    sheet_person_name = PERSON_SHEET_ALIASES.get(person_name, person_name)
    sheet_name = f"{sheet_person_name}_profile"

    try:
        df = pd.read_excel(workbook_path, sheet_name=sheet_name).fillna("")
    except ValueError:
        return {}

    if "Field" not in df.columns or "Value" not in df.columns:
        raise ValueError(
            f"Sheet '{sheet_name}' must contain 'Field' and 'Value' columns."
        )

    raw_fields = {
        str(row["Field"]).strip(): str(row["Value"]).strip()
        for _, row in df.iterrows()
        if str(row["Field"]).strip()
    }

    profile: dict[str, object] = {}
    for field_name, output_key in PROFILE_FIELD_MAP.items():
        if field_name in raw_fields:
            profile[output_key] = raw_fields[field_name]

    education_by_index: dict[int, dict[str, str]] = {}
    for field_name, value in raw_fields.items():
        if "_" not in field_name:
            continue

        prefix, _, suffix = field_name.rpartition("_")
        if not suffix.isdigit():
            continue

        index = int(suffix)
        education_entry = education_by_index.setdefault(index, {})

        if prefix == "DEGREE_CERT":
            education_entry["degree_cert"] = value
        elif prefix == "DEGREE_AREA":
            education_entry["degree_area"] = value
        elif prefix == "LOCATION":
            education_entry["location"] = value

    if education_by_index:
        profile["education"] = [
            education_by_index[index]
            for index in sorted(education_by_index)
            if any(value.strip() for value in education_by_index[index].values())
        ]

    return profile
