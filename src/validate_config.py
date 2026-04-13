from __future__ import annotations

from pathlib import Path

from src.global_workbook import build_global_workbook
from src.runtime_config import get_runtime_config


def _status(path: Path) -> str:
    return "ok" if path.exists() else "missing"


def main() -> int:
    config = get_runtime_config()

    print("Runtime config validation")
    print(f"- repo_root: {config.repo_root}")
    print(f"- ALLOW_EXTERNAL_PATHS: {config.allow_external_paths}")
    print(f"- data_dir: {config.data_dir} [{_status(config.data_dir)}]")
    print(f"- templates_dir: {config.templates_dir} [{_status(config.templates_dir)}]")
    print(f"- outputs_root: {config.outputs_root} [{_status(config.outputs_root)}]")
    print(f"- workbook_path: {config.workbook_path} [{_status(config.workbook_path)}]")
    print(f"- selections_path: {config.selections_path} [{_status(config.selections_path)}]")
    print(f"- person_workbooks_dir: {config.person_workbooks_dir} [{_status(config.person_workbooks_dir)}]")
    print(f"- generated_root: {config.generated_root} [{_status(config.generated_root)}]")
    print(
        f"- generated_latest_workbook_path: {config.generated_latest_workbook_path} "
        f"[{_status(config.generated_latest_workbook_path)}]"
    )
    print(f"- pursuits_root: {config.pursuits_root} [{_status(config.pursuits_root)}]")
    print(f"- use_pursuit_outputs: {config.use_pursuit_outputs}")
    print(f"- pursuit_output_folder_name: {config.pursuit_output_folder_name}")
    print(
        f"- master_references_path: {config.master_references_path} "
        f"[{_status(config.master_references_path)}]"
    )
    print(f"- yaml_template_path: {config.yaml_template_path} [{_status(config.yaml_template_path)}]")
    print(f"- refresh_global_workbook_on_run: {config.refresh_global_workbook_on_run}")
    print(f"- generated_keep_count: {config.generated_keep_count}")

    if config.refresh_global_workbook_on_run:
        result = build_global_workbook(config)
        print(
            "Generated global workbook: "
            f"{result.latest_path} "
            f"(timestamped={result.timestamped_path.name}, "
            f"workbooks={result.copied_workbooks}, sheets={result.copied_sheets})"
        )

    print("Validation complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
