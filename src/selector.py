from __future__ import annotations

import pandas as pd

PROJECT_KEY_COLUMN = "Project Key"
PROJECT_ORDER_COLUMN = "Project Order"


def select_projects(df: pd.DataFrame, selected_projects: list[dict]) -> pd.DataFrame:
    """Filter the DataFrame to the configured project keys and apply config order."""
    if not selected_projects:
        return df.iloc[0:0].copy()

    order_lookup = {
        project["key"]: project.get("order", index + 1)
        for index, project in enumerate(selected_projects)
    }
    selected_keys = list(order_lookup.keys())

    if PROJECT_KEY_COLUMN not in df.columns:
        raise ValueError(f"Expected '{PROJECT_KEY_COLUMN}' column in project sheet.")

    filtered = df[df[PROJECT_KEY_COLUMN].isin(selected_keys)].copy()
    filtered["Selected Order"] = filtered[PROJECT_KEY_COLUMN].map(order_lookup)
    filtered = filtered.sort_values(
        by=["Selected Order", PROJECT_ORDER_COLUMN],
        ascending=[True, True],
        na_position="last",
    )

    missing_keys = [
        key for key in selected_keys if key not in set(filtered[PROJECT_KEY_COLUMN])
    ]
    if missing_keys:
        raise ValueError(f"Missing configured project keys: {', '.join(missing_keys)}")

    return filtered.reset_index(drop=True)
