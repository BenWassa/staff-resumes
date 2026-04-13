from __future__ import annotations

from pathlib import Path

import yaml


def load_config(path: str | Path) -> dict:
    """Load and lightly validate the YAML selection config."""
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    config.setdefault("people", [])
    config.setdefault("consolidated", {})
    config["consolidated"].setdefault("include", [])
    if not isinstance(config.get("package_context"), dict):
        config["package_context"] = {}
    config["package_context"].setdefault("engagement_title", None)
    config["package_context"].setdefault("proposal_number", None)
    config["package_context"].setdefault("client", None)
    config["package_context"].setdefault("due_date", None)
    config["package_context"].setdefault("due_time", None)
    config["package_context"].setdefault("include_cover", False)
    config["package_context"].setdefault("include_end_page", False)

    if not isinstance(config["people"], list):
        raise ValueError("Config field 'people' must be a list.")

    return config
