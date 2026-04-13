from __future__ import annotations

from pathlib import Path
from typing import Callable

from src.config_loader import load_config
from src.data_loader import load_profile, load_projects
from src.formatter import format_projects
from src.global_workbook import resolve_workbook_path
from src.runtime_config import get_runtime_config
from src.selector import select_projects
from src.word_writer import write_consolidated_resume, write_individual_resume


def _normalize_package_context(config: dict) -> dict:
    package_context = dict(config.get("package_context") or {})
    return {
        "engagement_title": package_context.get("engagement_title") or "ENGAGEMENT TITLE",
        "proposal_number": package_context.get("proposal_number") or "PROPOSAL NUMBER",
        "client": package_context.get("client") or "CLIENT",
        "due_date": package_context.get("due_date") or "DUE DATE",
        "due_time": package_context.get("due_time") or "DUE TIME",
        "include_cover": bool(package_context.get("include_cover", False)),
        "include_end_page": bool(package_context.get("include_end_page", False)),
    }


def run_pipeline(
    selections_override: dict | None = None,
    output_dir: "Path | str | None" = None,
    progress_callback: Callable[[dict], None] | None = None,
) -> dict:
    """Run the lean resume generation pipeline.

    Args:
        selections_override: Use this dict as the config instead of loading selections.yaml.
            Useful when calling programmatically (e.g. from the web UI).
        output_dir: Root directory for outputs. Defaults to the standard outputs/ folder.

    Returns:
        Metadata about the generated outputs.
    """
    runtime = get_runtime_config()
    excel_path = resolve_workbook_path(runtime, refresh_if_configured=True)

    individual_template = runtime.templates_dir / "Proposal Resume Template.dotx"
    cover_page_template = runtime.templates_dir / "cover_page.docx"
    end_page_template = runtime.templates_dir / "end_page.docx"
    out_dir = Path(output_dir) if output_dir else runtime.outputs_root

    if selections_override is not None:
        config = selections_override
        config.setdefault("people", [])
        config.setdefault("consolidated", {})
        config["consolidated"].setdefault("include", [])
        config["package_context"] = _normalize_package_context(config)
    else:
        config_path = runtime.selections_path
        config = load_config(config_path)

    package_context = _normalize_package_context(config)
    people_output: list[dict] = []
    generated_paths: list[str] = []
    individual_paths: list[str] = []
    total_steps = len(config["people"]) + (
        1 if config["consolidated"].get("include", []) else 0
    )
    completed_steps = 0

    if progress_callback:
        progress_callback(
            {
                "event": "started",
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "output_dir": str(out_dir.resolve()),
            }
        )

    for person_config in config["people"]:
        person_name = person_config["name"]
        print(f"DEBUG: Processing {person_name}")
        person_data = _merge_person_data(
            person_config, load_profile(excel_path, person_name)
        )
        print(f"DEBUG: Profile loaded for {person_name}")
        projects_df = load_projects(excel_path, person_name)
        print(f"DEBUG: Projects loaded for {person_name}")
        selected_df = select_projects(projects_df, person_config.get("projects", []))
        print(f"DEBUG: Projects selected for {person_name}")
        formatted_projects = format_projects(selected_df)
        print(f"DEBUG: Projects formatted for {person_name}")

        output_file = None

        if person_config.get("output", "individual") == "individual":
            output_file = out_dir / "individual" / f"{_safe_filename(person_name)}.docx"
            if progress_callback:
                progress_callback(
                    {
                        "event": "step_started",
                        "step_type": "individual",
                        "person_name": person_name,
                        "label": f"Generating {person_name}",
                        "output_path": str(output_file.resolve()),
                        "completed_steps": completed_steps,
                        "total_steps": total_steps,
                    }
                )
            write_individual_resume(
                person_data=person_data,
                projects=formatted_projects,
                template_path=individual_template,
                output_path=output_file,
                package_context=package_context,
                include_cover=False,
                include_end_page=False,
            )
            output_path_str = str(output_file.resolve())
            generated_paths.append(output_path_str)
            individual_paths.append(output_path_str)
            completed_steps += 1
            if progress_callback:
                progress_callback(
                    {
                        "event": "step_completed",
                        "step_type": "individual",
                        "person_name": person_name,
                        "label": f"Finished {person_name}",
                        "output_path": output_path_str,
                        "completed_steps": completed_steps,
                        "total_steps": total_steps,
                    }
                )

        people_output.append(
            {
                "person_name": person_name,
                "projects": formatted_projects,
                "output": person_config.get("output", "individual"),
                "metadata": person_data,
                "output_path": output_file,
            }
        )

    included_names = set(config["consolidated"].get("include", []))
    consolidated_paths = [
        person_data["output_path"]
        for person_data in people_output
        if person_data["person_name"] in included_names
        and person_data["output_path"] is not None
    ]

    consolidated_path_str = None
    if consolidated_paths:
        consolidated_path = out_dir / "consolidated" / "consolidated_resume.docx"
        if progress_callback:
            progress_callback(
                {
                    "event": "step_started",
                    "step_type": "consolidated",
                    "label": "Building consolidated resume",
                    "output_path": str(consolidated_path.resolve()),
                    "completed_steps": completed_steps,
                    "total_steps": total_steps,
                }
            )
        write_consolidated_resume(
            individual_paths=consolidated_paths,
            template_path=individual_template,
            output_path=consolidated_path,
            package_context=package_context,
            include_cover=package_context["include_cover"],
            include_end_page=package_context["include_end_page"],
            cover_page_path=(
                cover_page_template if cover_page_template.exists() else None
            ),
            end_page_path=end_page_template if end_page_template.exists() else None,
        )
        consolidated_path_str = str(consolidated_path.resolve())
        generated_paths.append(consolidated_path_str)
        completed_steps += 1
        if progress_callback:
            progress_callback(
                {
                    "event": "step_completed",
                    "step_type": "consolidated",
                    "label": "Finished consolidated resume",
                    "output_path": consolidated_path_str,
                    "completed_steps": completed_steps,
                    "total_steps": total_steps,
                }
            )

    result = {
        "output_dir": str(out_dir.resolve()),
        "output_paths": generated_paths,
        "individual_paths": individual_paths,
        "consolidated_path": consolidated_path_str,
        "counts": {
            "individual": len(individual_paths),
            "consolidated": 1 if consolidated_path_str else 0,
            "total": len(generated_paths),
        },
        "total_steps": total_steps,
        "completed_steps": completed_steps,
    }

    if progress_callback:
        progress_callback(
            {
                "event": "completed",
                **result,
            }
        )

    return result


def _safe_filename(value: str) -> str:
    return "".join(
        char if char.isalnum() or char in {" ", "-", "_"} else "_" for char in value
    ).strip()


def _merge_person_data(person_config: dict, profile_data: dict) -> dict:
    merged = dict(person_config)

    for key, value in profile_data.items():
        if key == "education":
            # Respect pre-filtered education when explicitly provided (e.g. from web UI).
            # Fall back to profile education only when person_config has an empty list.
            if not merged.get("education"):
                merged[key] = value
            continue
        if isinstance(value, str) and value:
            merged[key] = value

    merged.setdefault("education", person_config.get("education", []))
    return merged
