"""Parse school-level FSM and ethnicity data.

Source: DfE "School pupils and their characteristics" release,
school-level underlying data CSV (spc_school_level_underlying_data_*.csv).
"""

import os

import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

FSM_COL = "% of pupils known to be eligible for free school meals"

# Minor ethnicity columns → major group mapping
ETHNICITY_GROUPS = {
    "ethnicity_white": [
        "% of pupils classified as white British ethnic origin",
        "% of pupils classified as Irish ethnic origin",
        "% of pupils classified as traveller of Irish heritage ethnic origin",
        "% of pupils classified as any other white background ethnic origin",
        "% of pupils classified as Gypsy/Roma ethnic origin",
    ],
    "ethnicity_mixed": [
        "% of pupils classified as white and black Caribbean ethnic origin",
        "% of pupils classified as white and black African ethnic origin",
        "% of pupils classified as white and Asian ethnic origin",
        "% of pupils classified as any other mixed background ethnic origin",
    ],
    "ethnicity_asian": [
        "% of pupils classified as Indian ethnic origin",
        "% of pupils classified as Pakistani ethnic origin",
        "% of pupils classified as Bangladeshi ethnic origin",
        "% of pupils classified as any other Asian background ethnic origin",
        "% of pupils classified as Chinese ethnic origin",
    ],
    "ethnicity_black": [
        "% of pupils classified as Caribbean ethnic origin",
        "% of pupils classified as African ethnic origin",
        "% of pupils classified as any other black background ethnic origin",
    ],
    "ethnicity_other": [
        "% of pupils classified as any other ethnic group ethnic origin",
    ],
}

# Fine-grained ethnicity columns (1:1 mapping from raw CSV column to DB column)
ETHNICITY_DETAIL = {
    # White
    "ethnicity_white_british": "% of pupils classified as white British ethnic origin",
    "ethnicity_irish": "% of pupils classified as Irish ethnic origin",
    "ethnicity_gypsy_roma": "% of pupils classified as Gypsy/Roma ethnic origin",
    "ethnicity_other_white": "% of pupils classified as any other white background ethnic origin",
    # Mixed
    "ethnicity_mixed_white_black_caribbean": "% of pupils classified as white and black Caribbean ethnic origin",
    "ethnicity_mixed_white_black_african": "% of pupils classified as white and black African ethnic origin",
    "ethnicity_mixed_white_asian": "% of pupils classified as white and Asian ethnic origin",
    "ethnicity_other_mixed": "% of pupils classified as any other mixed background ethnic origin",
    # Asian
    "ethnicity_indian": "% of pupils classified as Indian ethnic origin",
    "ethnicity_pakistani": "% of pupils classified as Pakistani ethnic origin",
    "ethnicity_bangladeshi": "% of pupils classified as Bangladeshi ethnic origin",
    "ethnicity_chinese": "% of pupils classified as Chinese ethnic origin",
    "ethnicity_other_asian": "% of pupils classified as any other Asian background ethnic origin",
    # Black
    "ethnicity_black_caribbean": "% of pupils classified as Caribbean ethnic origin",
    "ethnicity_black_african": "% of pupils classified as African ethnic origin",
    "ethnicity_other_black": "% of pupils classified as any other black background ethnic origin",
}


def parse_school_characteristics() -> pd.DataFrame:
    """Parse FSM % and ethnicity from school-level characteristics CSV.

    Returns DataFrame indexed by URN with columns for both broad and
    fine-grained ethnicity breakdowns (see ETHNICITY_GROUPS and ETHNICITY_DETAIL).
    """
    path = os.path.join(RAW_DIR, "school_characteristics.csv")
    if not os.path.exists(path):
        print("  School characteristics data not found, skipping.")
        return pd.DataFrame()

    print("  Loading school characteristics CSV...")
    # Only load the columns we need
    all_eth_cols = [c for cols in ETHNICITY_GROUPS.values() for c in cols]
    usecols = ["urn", FSM_COL] + all_eth_cols
    # Detail columns are a subset of all_eth_cols, but ensure they're included
    for raw_col in ETHNICITY_DETAIL.values():
        if raw_col not in usecols:
            usecols.append(raw_col)
    df = pd.read_csv(path, low_memory=False, encoding="latin-1", usecols=usecols)
    print(f"  Loaded {len(df)} rows")

    # URN
    df["urn"] = pd.to_numeric(df["urn"], errors="coerce")
    df = df.dropna(subset=["urn"])
    df["urn"] = df["urn"].astype(int)

    # FSM
    df["fsm_percent"] = pd.to_numeric(df[FSM_COL], errors="coerce")

    # Aggregate ethnicity minor categories into major groups
    for group_name, minor_cols in ETHNICITY_GROUPS.items():
        present = [c for c in minor_cols if c in df.columns]
        if present:
            numeric = df[present].apply(pd.to_numeric, errors="coerce")
            df[group_name] = numeric.sum(axis=1, min_count=1)
        else:
            df[group_name] = None

    # Extract fine-grained ethnicity columns
    for db_col, raw_col in ETHNICITY_DETAIL.items():
        if raw_col in df.columns:
            df[db_col] = pd.to_numeric(df[raw_col], errors="coerce")
        else:
            df[db_col] = None

    # Round ethnicity to 1 decimal place
    eth_cols = list(ETHNICITY_GROUPS.keys())
    detail_cols = list(ETHNICITY_DETAIL.keys())
    for col in eth_cols + detail_cols:
        if col in df.columns:
            df[col] = df[col].round(1)

    keep = ["urn", "fsm_percent"] + eth_cols + detail_cols
    result = df[keep].copy()
    result = result.drop_duplicates(subset=["urn"], keep="first")
    result = result.set_index("urn")

    non_null = result["fsm_percent"].notna().sum()
    print(f"  School characteristics: {len(result)} schools, {non_null} with FSM data.")
    return result


if __name__ == "__main__":
    result = parse_school_characteristics()
    print(result.head(10))
    print(f"\nNon-null counts:")
    print(result.notna().sum())
