"""Seed Firestore with staff data parsed from the CSV exports.

Usage:
    # Dry run (print what would be written, no Firestore writes):
    python scripts/seed_firestore_from_csv.py --dry-run

    # Seed all staff:
    python scripts/seed_firestore_from_csv.py

    # Seed a specific person only:
    python scripts/seed_firestore_from_csv.py --person "Ben Haddon"

    # Also seed pursuits:
    python scripts/seed_firestore_from_csv.py --pursuits

Environment:
    Set GOOGLE_APPLICATION_CREDENTIALS to your local service account JSON path,
    or ensure Application Default Credentials are configured.

CSV directory defaults to data/CSVs/ relative to the repo root.
Override with --csv-dir.
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
from pathlib import Path

# Force UTF-8 output on Windows so project descriptions with curly quotes
# and em-dashes don't crash the terminal.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Allow imports from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# ── Helpers ────────────────────────────────────────────────────────────────────


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def read_csv_dict(path: Path) -> list[dict]:
    """Read a CSV and return rows as dicts."""
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


# ── Profile parser ─────────────────────────────────────────────────────────────


def parse_profile(csv_dir: Path, person_name: str) -> dict:
    """Parse [Name]_profile.csv into a staff document + education list."""
    path = csv_dir / f"{person_name}_profile.csv"
    rows = read_csv_dict(path)

    # Build a flat Field→Value lookup
    lookup: dict[str, str] = {}
    for row in rows:
        field = str(row.get("Field", "")).strip()
        value = str(row.get("Value", "")).strip()
        if field:
            lookup[field] = value

    first_name = lookup.get("PERSON_FIRST", person_name.split()[0])
    last_name = lookup.get("PERSON_LAST", person_name.split()[-1])
    title = lookup.get("PERSON_TITLE", "")
    summary = lookup.get("PERSON_SUMMARY", "")

    # Collect education entries (DEGREE_CERT_N / DEGREE_AREA_N / LOCATION_N)
    education = []
    for n in range(1, 10):
        cert = lookup.get(f"DEGREE_CERT_{n}", "").strip()
        area = lookup.get(f"DEGREE_AREA_{n}", "").strip()
        loc = lookup.get(f"LOCATION_{n}", "").strip()
        if not cert:
            break
        education.append(
            {
                "degree_cert": cert,
                "degree_area": area,
                "location": loc,
                "order": n,
            }
        )

    staff_doc = {
        "first_name": first_name,
        "last_name": last_name,
        "title": title,
        "summary": summary,
        "display_name": person_name,
    }
    return staff_doc, education


# ── Projects parser ────────────────────────────────────────────────────────────


def parse_projects(csv_dir: Path, person_name: str) -> list[dict]:
    """Parse [Name]_projects.csv into a list of project dicts."""
    path = csv_dir / f"{person_name}_projects.csv"
    rows = read_csv_dict(path)

    projects = []
    seen_keys: set[str] = set()

    for row in rows:
        # Support both CSV column names used across files
        key = (
            str(row.get("Project Key", "")).strip()
        )
        if not key:
            continue
        if key in seen_keys:
            print(f"  WARNING: Duplicate project key '{key}' for {person_name} — skipping")
            continue
        seen_keys.add(key)

        order_raw = str(row.get("Project Order", "")).strip()
        order = int(order_raw) if order_raw.isdigit() else len(projects) + 1

        # Column name varies between the two CSV styles
        client = (
            str(row.get("Client", "") or row.get("Client (as written)", "")).strip()
        )
        title = (
            str(row.get("Project Title", "") or row.get("Project Title (as written)", "")).strip()
        )
        description = (
            str(row.get("Full Project Description", "") or row.get("Full Project Description (exact copy)", "")).strip()
        )

        projects.append(
            {
                "key": key,
                "client": client,
                "title": title,
                "description": description,
                "start_date": "",
                "end_date": "",
                "date_range": "",
                "order": order,
            }
        )

    return projects


# ── Firestore writer ───────────────────────────────────────────────────────────


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore as fb_firestore

    if firebase_admin._apps:
        return fb_firestore.client()

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        if not os.path.isabs(cred_path):
            repo_root = Path(__file__).resolve().parents[1]
            cred_path = str(repo_root / cred_path)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    return fb_firestore.client()


def write_person(db, person_name: str, staff_doc: dict, education: list[dict],
                 projects: list[dict], dry_run: bool) -> None:
    staff_id = slugify(person_name)
    print(f"\n>> {person_name}  (staff_id: {staff_id})")
    print(f"  title: {staff_doc['title']}")
    print(f"  education entries: {len(education)}")
    print(f"  projects: {len(projects)}")

    if dry_run:
        print("  [DRY RUN] skipping writes")
        return

    staff_ref = db.collection("staff").document(staff_id)
    staff_ref.set(staff_doc, merge=True)

    # Education subcollection
    edu_col = staff_ref.collection("education")
    for edu in education:
        edu_col.document(str(edu["order"])).set(edu)

    # Projects subcollection
    proj_col = staff_ref.collection("projects")
    for proj in projects:
        proj_col.document(proj["key"]).set(proj)

    print("  [OK] written")


# ── Pursuits seed ──────────────────────────────────────────────────────────────

# Placeholder pursuits — update display_name / client / engagement_number as needed.
SEED_PURSUITS = [
    {
        "id": "placeholder-pursuit",
        "display_name": "Placeholder Pursuit",
        "client": "",
        "engagement_number": "",
    },
]


def seed_pursuits(db, dry_run: bool) -> None:
    print("\n── Pursuits ──────────────────────────────────────────")
    from firebase_admin import firestore as fb_firestore
    import datetime

    for p in SEED_PURSUITS:
        pid = p["id"]
        doc = {
            "display_name": p["display_name"],
            "client": p["client"],
            "engagement_number": p["engagement_number"],
            "created_at": datetime.datetime.utcnow().isoformat(),
        }
        print(f"  pursuit: {pid}  →  {p['display_name']}")
        if not dry_run:
            db.collection("pursuits").document(pid).set(doc, merge=True)
            print("    ✓ written")
        else:
            print("    [DRY RUN] skipping")


# ── Main ───────────────────────────────────────────────────────────────────────

# Canonical names — must match the CSV filename prefixes exactly
STAFF_NAMES = [
    "Abdel Al-Sharif",
    "Anum Nasir",
    "Ben Haddon",
    "Graham Pressey",
    "Ian Shelley",
    "John Connolly",
    "Laura Devenny",
    "Michelle Tam",
    "Nikhil Konduru",
    "Rehan Setna",
    "Yash Melwani",
]


def main():
    parser = argparse.ArgumentParser(description="Seed Firestore from CSV exports")
    parser.add_argument(
        "--csv-dir",
        default=str(Path(__file__).resolve().parents[1] / "data" / "CSVs"),
        help="Path to the directory containing the CSV files",
    )
    parser.add_argument(
        "--person",
        help="Seed only this person (use their canonical name, e.g. 'Ben Haddon')",
    )
    parser.add_argument(
        "--pursuits",
        action="store_true",
        help="Also seed the pursuits collection with placeholder data",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print what would be written — no Firestore writes",
    )
    args = parser.parse_args()

    csv_dir = Path(args.csv_dir)
    if not csv_dir.is_dir():
        print(f"ERROR: CSV directory not found: {csv_dir}")
        sys.exit(1)

    names = [args.person] if args.person else STAFF_NAMES
    for name in names:
        if name not in STAFF_NAMES:
            print(f"ERROR: '{name}' is not in the known staff list.")
            print(f"Known names: {', '.join(STAFF_NAMES)}")
            sys.exit(1)

    db = None if args.dry_run else init_firebase()

    print(f"CSV dir : {csv_dir}")
    print(f"Dry run : {args.dry_run}")
    print(f"People  : {', '.join(names)}")

    for name in names:
        try:
            staff_doc, education = parse_profile(csv_dir, name)
            projects = parse_projects(csv_dir, name)
            write_person(db, name, staff_doc, education, projects, dry_run=args.dry_run)
        except FileNotFoundError as exc:
            print(f"  ERROR: {exc}")
        except Exception as exc:
            print(f"  ERROR processing {name}: {exc}")
            raise

    if args.pursuits:
        if not args.dry_run and db is None:
            db = init_firebase()
        seed_pursuits(db, dry_run=args.dry_run)

    print("\n✓ Done.")


if __name__ == "__main__":
    main()
