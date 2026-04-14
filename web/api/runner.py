"""Build selections config from local data and run the pipeline.

Output files are written to a persistent local job directory. The API exposes
download endpoints that stream those files directly from disk.
"""

from __future__ import annotations

from pathlib import Path

from src.pipeline import run_pipeline
from web.api.local_store import get_person_data


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


def _job_output_dir(job_id: str) -> Path:
    from web.api.config_store import get_data_dir

    return get_data_dir().parent / "outputs" / job_id


def _output_url(job_id: str, kind: str, filename: str) -> str:
    return f"/api/downloads/{job_id}/{kind}/{filename}"


def generate(
    job_id: str,
    package_name: str,
    people: list[dict],
    selected_project_id: str | None = None,
    include_cover: bool = True,
    include_end_page: bool = False,
    progress_callback=None,
) -> dict:
    """Run the pipeline for the given selections and return local download URLs."""
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

        person_data = get_person_data(name)
        all_education = person_data.get("education", [])

        if edu_indices:
            filtered_education = [
                entry
                for idx, entry in enumerate(all_education, start=1)
                if idx in edu_indices
            ]
        else:
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

    output_dir = _job_output_dir(job_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    result = run_pipeline(
        selections_override=selections,
        output_dir=output_dir,
        progress_callback=progress_callback,
    )

    individual_urls: dict[str, str] = {}
    individual_dir = output_dir / "individual"
    if individual_dir.exists():
        for docx_file in individual_dir.glob("*.docx"):
            individual_urls[docx_file.stem] = _output_url(
                job_id, "individual", docx_file.name
            )

    consolidated_url: str | None = None
    consolidated_file = output_dir / "consolidated" / "consolidated_resume.docx"
    if consolidated_file.exists():
        consolidated_url = _output_url(job_id, "consolidated", consolidated_file.name)

    result["individual_urls"] = individual_urls
    result["consolidated_url"] = consolidated_url
    result["output_dir"] = str(output_dir.resolve())
    return result
