"""Parse KS2 and KS4 school performance results.

The CSVs come from the DfE explore-education-statistics API and have columns:
  KS2: time_period, geographic_level, school_urn, subject,
       breakdown_topic, breakdown, progress_measure_score, ...
  KS4: time_period, geographic_level, school_urn, breakdown,
       attainment8_average, progress8_average, ...
"""

import os
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")


def parse_ks2() -> pd.DataFrame:
    """Parse KS2 (primary) results, returning DataFrame keyed by URN.

    Extracts reading and maths progress scores at school level,
    filtering to All pupils / Total breakdown only.
    """
    path = os.path.join(RAW_DIR, "ks2.csv")
    if not os.path.exists(path):
        print("  KS2 data not found, skipping.")
        return pd.DataFrame()

    # Only load columns we need to save memory
    usecols = [
        "time_period", "geographic_level", "school_urn", "subject",
        "breakdown_topic", "breakdown", "progress_measure_score",
    ]
    df = pd.read_csv(path, low_memory=False, usecols=usecols)

    # Filter to school-level, "All pupils" breakdown, "Total" only
    df = df[df["geographic_level"] == "School"]
    df = df[df["breakdown_topic"] == "All pupils"]
    df = df[df["breakdown"] == "Total"]

    # Use the most recent time period that has numeric progress scores
    df["_numeric_score"] = pd.to_numeric(df["progress_measure_score"], errors="coerce")
    for tp in sorted(df["time_period"].unique(), reverse=True):
        subset = df[df["time_period"] == tp]
        if subset["_numeric_score"].notna().sum() > 0:
            df = subset
            print(f"  KS2: Using time period {tp}")
            break
    else:
        print("  KS2: No time period with numeric data found.")
        return pd.DataFrame()
    df = df.drop(columns=["_numeric_score"])

    # Separate reading and maths
    reading = df[df["subject"].str.lower() == "reading"][
        ["school_urn", "progress_measure_score"]
    ].rename(columns={"school_urn": "urn", "progress_measure_score": "ks2_reading"})

    maths = df[df["subject"].str.lower() == "maths"][
        ["school_urn", "progress_measure_score"]
    ].rename(columns={"school_urn": "urn", "progress_measure_score": "ks2_maths"})

    for sub_df in (reading, maths):
        sub_df["urn"] = pd.to_numeric(sub_df["urn"], errors="coerce")

    reading["ks2_reading"] = pd.to_numeric(reading["ks2_reading"], errors="coerce")
    maths["ks2_maths"] = pd.to_numeric(maths["ks2_maths"], errors="coerce")

    reading = reading.dropna(subset=["urn", "ks2_reading"]).drop_duplicates(subset=["urn"])
    maths = maths.dropna(subset=["urn", "ks2_maths"]).drop_duplicates(subset=["urn"])

    result = reading.set_index("urn").astype({"ks2_reading": float})
    if not maths.empty:
        result = result.join(maths.set_index("urn").astype({"ks2_maths": float}), how="outer")

    print(f"  KS2: {len(result)} school records parsed.")
    return result


def parse_ks4() -> pd.DataFrame:
    """Parse KS4 (secondary) results, returning DataFrame keyed by URN.

    Extracts attainment8 and progress8 averages at school level.
    """
    path = os.path.join(RAW_DIR, "ks4.csv")
    if not os.path.exists(path):
        print("  KS4 data not found, skipping.")
        return pd.DataFrame()

    df = pd.read_csv(path, low_memory=False)

    # Filter to school-level data
    if "geographic_level" in df.columns:
        df = df[df["geographic_level"] == "School"]

    if "school_urn" not in df.columns:
        print("  KS4: school_urn column not found, skipping.")
        return pd.DataFrame()

    # Most recent time period
    if "time_period" in df.columns:
        latest = df["time_period"].max()
        df = df[df["time_period"] == latest]
        print(f"  KS4: Using time period {latest}")

    # Filter to "All pupils" / "Total" breakdown
    if "breakdown" in df.columns:
        total = df[df["breakdown"].str.lower() == "total"]
        if not total.empty:
            df = total
        else:
            all_pupils = df[df["breakdown"].str.lower().str.contains("all", na=False)]
            if not all_pupils.empty:
                df = all_pupils

    cols = {"school_urn": "urn"}
    if "attainment8_average" in df.columns:
        cols["attainment8_average"] = "ks4_attainment8"
    if "progress8_average" in df.columns:
        cols["progress8_average"] = "ks4_progress8"

    df = df[list(cols.keys())].rename(columns=cols).copy()

    df["urn"] = pd.to_numeric(df["urn"], errors="coerce")
    df = df.dropna(subset=["urn"])
    df["urn"] = df["urn"].astype(int)

    for col in ("ks4_attainment8", "ks4_progress8"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.drop_duplicates(subset=["urn"], keep="first")
    df = df.set_index("urn")

    print(f"  KS4: {len(df)} school records parsed.")
    return df


def parse() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Parse both KS2 and KS4 results."""
    return parse_ks2(), parse_ks4()


if __name__ == "__main__":
    ks2, ks4 = parse()
    print("\nKS2:")
    print(ks2.head())
    print(f"\nKS4:")
    print(ks4.head())
