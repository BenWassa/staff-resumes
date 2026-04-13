"""Build selections config from Firestore data and run the pipeline.

Output files are written to a temporary directory, then uploaded to Firebase
Storage. Signed download URLs are returned in the job completion payload.
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.pipeline import run_pipeline
from web.api.firebase_admin_init import initialize
from web.api.firestore_store import get_person_data


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


def _upload_to_storage(local_path: Path, storage_path: str) -> str:
    """Upload a file to Firebase Storage and return a 1-hour signed URL."""
    from firebase_admin import storage as fb_storage

    bucket = fb_storage.bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_filename(str(local_path))
    url = blob.generate_signed_url(expiration=timedelta(hours=1), method="GET")
    return url


def generate(
    job_id: str,
    package_name: str,
    people: list[dict],
    selected_project_id: str | None = None,
    include_cover: bool = True,
    include_end_page: bool = False,
    progress_callback=None,
) -> dict:
    """Run the pipeline for the given selections and return download URLs.

    Args:
        job_id: Unique job ID (used as the Storage output path prefix).
        package_name: Label for this output package.
        people: List of per-person dicts with keys:
            - name (str)
            - projects (list[str]) ordered project keys
            - education_indices (list[int]) 1-based indices of education entries
    """
    initialize()

    if not selected_project_id:
        raise ValueError("A pursuit must be selected before generating resumes.")

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

        # Load profile data from Firestore (not Excel)
        person_data = get_person_data(name)
        all_education = person_data.get("education", [])

        if edu_indices:
            filtered_education = [
                entry
                for idx, entry in enumerate(all_education, start=1)
                if idx in edu_indices
            ]
        else:
            # No filter specified → include all education entries
            filtered_education = all_education

        people_config.append(
            {
                "name": name,
                "output": "individual",
                "first_name": person_data.get("first_name", name.split()[0]),
                "last_name": person_data.get("last_name", name.split()[-1]),
                "title": person_data.get("title", ""),
                "summary": person_data.get("summary", ""),
                "education": filtered_education,
                "projects": [
                    {"key": key, "order": order + 1}
                    for order, key in enumerate(project_keys)
                ],
            }
        )

    selections = {
        "people": people_config,
        "consolidated": {"include": consolidated_include},
        "package_context": _build_package_context(
            selected_project_id=selected_project_id,
            include_cover=include_cover,
            include_end_page=include_end_page,
        ),
    }

    # Use a temporary directory — Cloud Run filesystem is ephemeral
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = Path(tmp_dir) / "output"
        output_dir.mkdir()

        result = run_pipeline(
            selections_override=selections,
            output_dir=output_dir,
            progress_callback=progress_callback,
        )

        # Upload generated files to Firebase Storage and collect signed URLs
        individual_urls: dict[str, str] = {}
        consolidated_url: str | None = None

        storage_enabled = bool(os.environ.get("FIREBASE_STORAGE_BUCKET"))

        if storage_enabled:
            # Upload individual resumes
            individual_dir = output_dir / "individual"
            if individual_dir.exists():
                for docx_file in individual_dir.glob("*.docx"):
                    safe_name = _slugify(docx_file.stem)
                    storage_path = f"outputs/{job_id}/individual/{docx_file.name}"
                    url = _upload_to_storage(docx_file, storage_path)
                    individual_urls[docx_file.stem] = url

            # Upload consolidated resume
            consolidated_dir = output_dir / "consolidated"
            if consolidated_dir.exists():
                consolidated_file = consolidated_dir / "consolidated_resume.docx"
                if consolidated_file.exists():
                    storage_path = (
                        f"outputs/{job_id}/consolidated/consolidated_resume.docx"
                    )
                    consolidated_url = _upload_to_storage(
                        consolidated_file, storage_path
                    )

        # Enrich the pipeline result with download URLs
        result["individual_urls"] = individual_urls
        result["consolidated_url"] = consolidated_url

        return result
