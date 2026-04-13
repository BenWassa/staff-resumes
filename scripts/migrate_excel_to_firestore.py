"""One-time migration: read Excel workbook and write all staff data to Firestore.

Usage:
    python scripts/migrate_excel_to_firestore.py --workbook path/to/workbook.xlsx

Requirements:
    pip install firebase-admin openpyxl pandas

The script is idempotent — re-running it will overwrite existing Firestore
documents with the same data (safe to run multiple times).

Environment:
    Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON,
    or run from a machine with Application Default Credentials configured.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

# Allow imports from the repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import firebase_admin
from firebase_admin import credentials, firestore

from src.data_loader import load_profile, load_projects, PERSON_SHEET_ALIASES
import openpyxl


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def init_firebase():
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Application Default Credentials (works on Cloud Shell / Cloud Run)
        firebase_admin.initialize_app()
    return firestore.client()


def list_people_in_workbook(workbook_path: Path) -> list[str]:
    """Return canonical person names found in the workbook."""
    alias_reverse = {v: k for k, v in PERSON_SHEET_ALIASES.items()}
    wb = openpyxl.load_workbook(str(workbook_path), read_only=True, data_only=True)
    people = []
    for sheet_name in wb.sheetnames:
        if sheet_name.endswith("_projects"):
            workbook_name = sheet_name[: -len("_projects")]
            canonical = alias_reverse.get(workbook_name, workbook_name)
            people.append(canonical)
    wb.close()
    return people


def migrate_person(db, workbook_path: Path, person_name: str, dry_run: bool):
    staff_id = slugify(person_name)
    print(f"\n→ Migrating: {person_name} (staff_id: {staff_id})")

    # Load profile
    profile = load_profile(str(workbook_path), person_name)
    staff_doc = {
        "first_name": profile.get("first_name", person_name.split()[0]),
        "last_name": profile.get("last_name", person_name.split()[-1]),
        "title": profile.get("title", ""),
        "summary": profile.get("summary", ""),
        "display_name": person_name,
    }
    print(f"  Profile: {staff_doc['first_name']} {staff_doc['last_name']} — {staff_doc['title']}")

    # Load projects
    try:
        df = load_projects(str(workbook_path), person_name)
    except ValueError as e:
        print(f"  WARNING: Could not load projects — {e}")
        df = None

    projects = []
    if df is not None:
        seen_keys = set()
        for _, row in df.iterrows():
            key = str(row.get("Project Key", "")).strip()
            if not key:
                continue
            if key in seen_keys:
                print(f"  WARNING: Duplicate project key '{key}' — skipping duplicate")
                continue
            seen_keys.add(key)
            projects.append({
                "key": key,
                "client": str(row.get("Client", "")).strip(),
                "title": str(row.get("Project Title", "")).strip(),
                "description": str(row.get("Full Project Description", "")).strip(),
                "start_date": str(row.get("Start Date", "")).strip(),
                "end_date": str(row.get("End Date", "")).strip(),
                "date_range": "",
                "order": len(projects) + 1,
            })
    print(f"  Projects: {len(projects)}")

    # Education
    education = profile.get("education", [])
    print(f"  Education entries: {len(education)}")

    if dry_run:
        print("  [DRY RUN] Would write to Firestore — skipping.")
        return

    # Write staff document
    staff_ref = db.collection("staff").document(staff_id)
    staff_ref.set(staff_doc, merge=True)

    # Write education subcollection
    edu_col = staff_ref.collection("education")
    for i, edu in enumerate(education, start=1):
        edu_col.document(str(i)).set({**edu, "order": i})

    # Write projects subcollection
    proj_col = staff_ref.collection("projects")
    for proj in projects:
        proj_col.document(proj["key"]).set(proj)

    print(f"  ✓ Written to Firestore")


def main():
    parser = argparse.ArgumentParser(description="Migrate Excel workbook to Firestore")
    parser.add_argument("--workbook", required=True, help="Path to the Excel workbook")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be written without writing")
    args = parser.parse_args()

    workbook_path = Path(args.workbook).resolve()
    if not workbook_path.exists():
        print(f"ERROR: Workbook not found: {workbook_path}")
        sys.exit(1)

    print(f"Workbook: {workbook_path}")
    print(f"Dry run: {args.dry_run}")

    db = init_firebase()
    people = list_people_in_workbook(workbook_path)
    print(f"\nFound {len(people)} people: {', '.join(people)}")

    for person_name in people:
        migrate_person(db, workbook_path, person_name, dry_run=args.dry_run)

    print("\n✓ Migration complete.")


if __name__ == "__main__":
    main()
