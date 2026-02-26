"""Parse KS4 and KS5 (16-18) student destination measures.

The CSVs come from the DfE explore-education-statistics content API.
Each row represents a school with % of leavers going to various destinations.

Column names in source CSVs:
  KS4: time_period, geographic_level, school_urn, breakdown_topic, breakdown,
       data_type, education, appren, all_work, ...
  KS5: time_period, geographic_level, school_urn, breakdown_topic, breakdown,
       data_type, cohort_level, education, he, fe, appren, all_work, ...
"""

import os

import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")


def _filter_to_school_total_pct(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to school-level, Total breakdown, Percentage data type, latest period."""
    # School level only
    if "geographic_level" in df.columns:
        df = df[df["geographic_level"] == "School"]

    # Total breakdown
    if "breakdown_topic" in df.columns:
        total = df[df["breakdown_topic"] == "Total"]
        if not total.empty:
            df = total
    if "breakdown" in df.columns:
        total = df[df["breakdown"] == "Total"]
        if not total.empty:
            df = total

    # Percentage rows only
    if "data_type" in df.columns:
        pct = df[df["data_type"] == "Percentage"]
        if not pct.empty:
            df = pct

    # Latest time period
    if "time_period" in df.columns:
        latest = df["time_period"].max()
        df = df[df["time_period"] == latest]
        print(f"  Using time period {latest}")

    return df


def parse_ks4_destinations() -> pd.DataFrame:
    """Parse KS4 destination measures, returning DataFrame keyed by URN.

    Columns: ks4_dest_education, ks4_dest_apprenticeships, ks4_dest_employment
    """
    path = os.path.join(RAW_DIR, "ks4_destinations.csv")
    if not os.path.exists(path):
        print("  KS4 destinations data not found, skipping.")
        return pd.DataFrame()

    print("  Loading KS4 destinations CSV...")
    df = pd.read_csv(path, low_memory=False)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    df = _filter_to_school_total_pct(df)

    if "school_urn" not in df.columns:
        print("  KS4 destinations: school_urn column not found, skipping.")
        print(f"  Available columns: {list(df.columns[:20])}")
        return pd.DataFrame()

    # Map source columns → our column names
    col_map = {}
    if "education" in df.columns:
        col_map["education"] = "ks4_dest_education"
    if "appren" in df.columns:
        col_map["appren"] = "ks4_dest_apprenticeships"
    if "all_work" in df.columns:
        col_map["all_work"] = "ks4_dest_employment"

    if not col_map:
        print("  KS4 destinations: No indicator columns found.")
        print(f"  Available columns: {list(df.columns)}")
        return pd.DataFrame()

    print(f"  Mapped columns: {col_map}")

    keep = ["school_urn"] + list(col_map.keys())
    result = df[keep].rename(columns={"school_urn": "urn", **col_map}).copy()

    result["urn"] = pd.to_numeric(result["urn"], errors="coerce")
    result = result.dropna(subset=["urn"])
    result["urn"] = result["urn"].astype(int)

    for col in col_map.values():
        result[col] = pd.to_numeric(result[col], errors="coerce")

    result = result.drop_duplicates(subset=["urn"], keep="first")
    result = result.set_index("urn")

    print(f"  KS4 destinations: {len(result)} school records parsed.")
    return result


def parse_ks5_destinations() -> pd.DataFrame:
    """Parse 16-18 (KS5) destination measures, returning DataFrame keyed by URN.

    Columns: ks5_dest_higher_education, ks5_dest_further_education,
             ks5_dest_apprenticeships, ks5_dest_employment
    """
    path = os.path.join(RAW_DIR, "ks5_destinations.csv")
    if not os.path.exists(path):
        print("  KS5 destinations data not found, skipping.")
        return pd.DataFrame()

    print("  Loading KS5 destinations CSV...")
    df = pd.read_csv(path, low_memory=False)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    df = _filter_to_school_total_pct(df)

    # Also filter to Total cohort level (not A level / academic / vocational subsets)
    if "cohort_level" in df.columns:
        total = df[df["cohort_level"] == "Total"]
        if not total.empty:
            df = total

    if "school_urn" not in df.columns:
        print("  KS5 destinations: school_urn column not found, skipping.")
        print(f"  Available columns: {list(df.columns[:20])}")
        return pd.DataFrame()

    # Map source columns → our column names
    col_map = {}
    if "he" in df.columns:
        col_map["he"] = "ks5_dest_higher_education"
    if "fe" in df.columns:
        col_map["fe"] = "ks5_dest_further_education"
    if "appren" in df.columns:
        col_map["appren"] = "ks5_dest_apprenticeships"
    if "all_work" in df.columns:
        col_map["all_work"] = "ks5_dest_employment"

    if not col_map:
        print("  KS5 destinations: No indicator columns found.")
        print(f"  Available columns: {list(df.columns)}")
        return pd.DataFrame()

    print(f"  Mapped columns: {col_map}")

    keep = ["school_urn"] + list(col_map.keys())
    result = df[keep].rename(columns={"school_urn": "urn", **col_map}).copy()

    result["urn"] = pd.to_numeric(result["urn"], errors="coerce")
    result = result.dropna(subset=["urn"])
    result["urn"] = result["urn"].astype(int)

    for col in col_map.values():
        result[col] = pd.to_numeric(result[col], errors="coerce")

    result = result.drop_duplicates(subset=["urn"], keep="first")
    result = result.set_index("urn")

    print(f"  KS5 destinations: {len(result)} school records parsed.")
    return result


if __name__ == "__main__":
    print("KS4 Destinations:")
    ks4 = parse_ks4_destinations()
    print(ks4.head())
    print(f"\nKS5 Destinations:")
    ks5 = parse_ks5_destinations()
    print(ks5.head())
