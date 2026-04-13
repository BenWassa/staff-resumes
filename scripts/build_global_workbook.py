from __future__ import annotations

from src.global_workbook import build_global_workbook
from src.runtime_config import get_runtime_config


def main() -> int:
    config = get_runtime_config()
    result = build_global_workbook(config)
    print(f"Created: {result.timestamped_path}")
    print(f"Latest:  {result.latest_path}")
    print(
        f"Copied {result.copied_workbooks} workbook(s) and {result.copied_sheets} sheet(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
