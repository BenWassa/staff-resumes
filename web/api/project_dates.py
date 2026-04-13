"""Join portfolio projects to date ranges from the master references workbook."""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import pandas as pd

MASTER_PROJECT_LIST_PATH = Path(
    r"C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents\_Proposal Objects\References\Client References-2026.xlsx"
)

ENGAGEMENT_NUMBER_COLUMN = "Engagement #"
START_DATE_COLUMN = "Start Date"
END_DATE_COLUMN = "End Date"

_ENGAGEMENT_NUMBER_PATTERN = re.compile(r"\d+")


def extract_engagement_number(project_id: str) -> str:
    """Return the only numeric token embedded in a project id."""
    matches = _ENGAGEMENT_NUMBER_PATTERN.findall(str(project_id or ""))
    if len(matches) != 1:
        return ""
    return matches[0]


def format_master_date_value(value: object) -> str:
    """Normalize Excel cell values into display-friendly strings."""
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


def build_date_range(start_date: str, end_date: str) -> str:
    if start_date and end_date:
        return f"{start_date} to {end_date}"
    if start_date:
        return f"From {start_date}"
    if end_date:
        return f"Until {end_date}"
    return ""


@lru_cache(maxsize=1)
def load_master_project_dates() -> dict[str, dict[str, str]]:
    """Load engagement-number keyed project dates from the read-only master workbook."""
    df = pd.read_excel(
        MASTER_PROJECT_LIST_PATH,
        dtype={ENGAGEMENT_NUMBER_COLUMN: str},
    )

    date_lookup: dict[str, dict[str, str]] = {}
    for _, row in df.iterrows():
        engagement_number = format_master_date_value(
            row.get(ENGAGEMENT_NUMBER_COLUMN, "")
        )
        if not engagement_number:
            continue

        start_date = format_master_date_value(row.get(START_DATE_COLUMN, ""))
        end_date = format_master_date_value(row.get(END_DATE_COLUMN, ""))
        date_lookup[engagement_number] = {
            "engagement_number": engagement_number,
            "start_date": start_date,
            "end_date": end_date,
            "date_range": build_date_range(start_date, end_date),
        }

    return date_lookup
