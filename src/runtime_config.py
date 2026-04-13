from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    return normalized in {"1", "true", "yes", "y", "on"}


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def load_env() -> None:
    _load_env_file(REPO_ROOT / ".env")
    _load_env_file(REPO_ROOT / "web" / ".env")


def _resolve_path(raw_value: str | None, default: Path) -> Path:
    if not raw_value:
        return default.resolve()
    candidate = Path(raw_value)
    if not candidate.is_absolute():
        candidate = REPO_ROOT / candidate
    return candidate.resolve()


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _ensure_allowed(path: Path, *, label: str, allow_external_paths: bool) -> Path:
    resolved = path.resolve()
    if not allow_external_paths and not _is_within(resolved, REPO_ROOT):
        raise ValueError(
            f"{label} resolves outside repository root: {resolved}. "
            "Set ALLOW_EXTERNAL_PATHS=true to permit external paths."
        )
    return resolved


@dataclass(frozen=True)
class RuntimeConfig:
    repo_root: Path
    allow_external_paths: bool
    data_dir: Path
    templates_dir: Path
    outputs_root: Path
    workbook_path: Path
    selections_path: Path
    person_workbooks_dir: Path
    generated_root: Path
    generated_latest_workbook_path: Path
    generated_workbook_basename: str
    generated_keep_count: int
    refresh_global_workbook_on_run: bool
    pursuits_root: Path
    use_pursuit_outputs: bool
    pursuit_output_folder_name: str
    master_references_path: Path
    yaml_template_path: Path


def get_runtime_config() -> RuntimeConfig:
    load_env()

    allow_external_paths = _parse_bool(
        os.getenv("ALLOW_EXTERNAL_PATHS"),
        default=False,
    )

    data_dir = _ensure_allowed(
        _resolve_path(os.getenv("LOCAL_DATA_ROOT"), REPO_ROOT / "data"),
        label="LOCAL_DATA_ROOT",
        allow_external_paths=allow_external_paths,
    )
    templates_dir = _ensure_allowed(
        _resolve_path(os.getenv("TEMPLATES_DIR"), REPO_ROOT / "templates"),
        label="TEMPLATES_DIR",
        allow_external_paths=allow_external_paths,
    )
    outputs_root = _ensure_allowed(
        _resolve_path(os.getenv("LOCAL_OUTPUTS_ROOT"), REPO_ROOT / "outputs"),
        label="LOCAL_OUTPUTS_ROOT",
        allow_external_paths=allow_external_paths,
    )

    shared_tool_root = _resolve_path(
        os.getenv("STAFF_RESUMES_TOOL_ROOT"),
        REPO_ROOT / "data" / "_staff_resumes_tool",
    )
    if os.getenv("STAFF_RESUMES_TOOL_ROOT"):
        shared_tool_root = _ensure_allowed(
            shared_tool_root,
            label="STAFF_RESUMES_TOOL_ROOT",
            allow_external_paths=allow_external_paths,
        )

    default_person_workbooks_dir = (
        shared_tool_root / "person_workbooks"
        if os.getenv("STAFF_RESUMES_TOOL_ROOT")
        else data_dir / "person_workbooks"
    )
    person_workbooks_dir = _ensure_allowed(
        _resolve_path(
            os.getenv("PERSON_WORKBOOKS_DIR"),
            default_person_workbooks_dir,
        ),
        label="PERSON_WORKBOOKS_DIR",
        allow_external_paths=allow_external_paths,
    )
    default_generated_root = (
        shared_tool_root / "_generated"
        if os.getenv("STAFF_RESUMES_TOOL_ROOT")
        else data_dir / "_generated"
    )
    generated_root = _ensure_allowed(
        _resolve_path(os.getenv("GLOBAL_WORKBOOK_DIR"), default_generated_root),
        label="GLOBAL_WORKBOOK_DIR",
        allow_external_paths=allow_external_paths,
    )

    generated_workbook_basename = os.getenv(
        "GLOBAL_WORKBOOK_BASENAME", "global_resume_data"
    ).strip() or "global_resume_data"
    generated_latest_workbook_path = _ensure_allowed(
        generated_root / f"{generated_workbook_basename}_latest.xlsx",
        label="GLOBAL_WORKBOOK_LATEST",
        allow_external_paths=allow_external_paths,
    )

    global_mode_enabled = bool(
        os.getenv("PERSON_WORKBOOKS_DIR") or os.getenv("STAFF_RESUMES_TOOL_ROOT")
    )
    default_workbook_path = (
        generated_latest_workbook_path if global_mode_enabled else data_dir / "extraction IPR.xlsx"
    )
    workbook_path = _ensure_allowed(
        _resolve_path(
            os.getenv("WORKBOOK_PATH"),
            default_workbook_path,
        ),
        label="WORKBOOK_PATH",
        allow_external_paths=allow_external_paths,
    )
    selections_path = _ensure_allowed(
        _resolve_path(os.getenv("SELECTIONS_PATH"), data_dir / "selections.yaml"),
        label="SELECTIONS_PATH",
        allow_external_paths=allow_external_paths,
    )

    pursuits_root = _ensure_allowed(
        _resolve_path(
            os.getenv("LOCAL_PURSUITS_ROOT"),
            REPO_ROOT / "pursuits_local",
        ),
        label="LOCAL_PURSUITS_ROOT",
        allow_external_paths=allow_external_paths,
    )
    use_pursuit_outputs = _parse_bool(
        os.getenv("USE_PURSUIT_OUTPUTS"),
        default=False,
    )
    pursuit_output_folder_name = (
        os.getenv("PURSUIT_OUTPUT_FOLDER_NAME", "resume-outputs").strip()
        or "resume-outputs"
    )
    master_references_path = _ensure_allowed(
        _resolve_path(
            os.getenv("MASTER_REFERENCES_PATH"),
            data_dir / "Client References-2026.xlsx",
        ),
        label="MASTER_REFERENCES_PATH",
        allow_external_paths=allow_external_paths,
    )
    yaml_template_path = _ensure_allowed(
        _resolve_path(
            os.getenv("YAML_TEMPLATE_PATH"),
            data_dir / "selections.template.yaml",
        ),
        label="YAML_TEMPLATE_PATH",
        allow_external_paths=allow_external_paths,
    )

    keep_count_raw = os.getenv("GLOBAL_WORKBOOK_KEEP_COUNT", "2").strip()
    try:
        generated_keep_count = max(0, int(keep_count_raw))
    except ValueError as exc:
        raise ValueError("GLOBAL_WORKBOOK_KEEP_COUNT must be an integer.") from exc

    refresh_global_workbook_on_run = _parse_bool(
        os.getenv("REFRESH_GLOBAL_WORKBOOK_ON_RUN"),
        default=False,
    )

    return RuntimeConfig(
        repo_root=REPO_ROOT,
        allow_external_paths=allow_external_paths,
        data_dir=data_dir,
        templates_dir=templates_dir,
        outputs_root=outputs_root,
        workbook_path=workbook_path,
        selections_path=selections_path,
        person_workbooks_dir=person_workbooks_dir,
        generated_root=generated_root,
        generated_latest_workbook_path=generated_latest_workbook_path,
        generated_workbook_basename=generated_workbook_basename,
        generated_keep_count=generated_keep_count,
        refresh_global_workbook_on_run=refresh_global_workbook_on_run,
        pursuits_root=pursuits_root,
        use_pursuit_outputs=use_pursuit_outputs,
        pursuit_output_folder_name=pursuit_output_folder_name,
        master_references_path=master_references_path,
        yaml_template_path=yaml_template_path,
    )
