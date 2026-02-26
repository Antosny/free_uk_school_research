"""Parse Ofsted inspection outcomes data."""

import os
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

RATING_MAP = {
    "1": "Outstanding",
    "2": "Good",
    "3": "Requires Improvement",
    "4": "Inadequate",
    "Outstanding": "Outstanding",
    "Good": "Good",
    "Requires improvement": "Requires Improvement",
    "Requires Improvement": "Requires Improvement",
    "Inadequate": "Inadequate",
}

# Map ungraded inspection outcomes to ratings
UNGRADED_OUTCOME_MAP = {
    "School remains Outstanding": "Outstanding",
    "School remains Outstanding (Concerns) - S5 Next": "Outstanding",
    "School remains Good": "Good",
    "School remains Good (Improving) - S5 Next": "Good",
    "School remains Good (Concerns) - S5 Next": "Good",
    "Standards maintained": None,  # ambiguous, skip
    "Improved significantly": None,
    "Some aspects not as strong": None,
}


def parse() -> pd.DataFrame:
    """Read and clean Ofsted CSV, returning a DataFrame keyed by URN.

    The Ofsted management information CSV has columns including:
      URN, Latest OEIF overall effectiveness,
      Inspection start date of latest OEIF graded inspection
    """
    path = os.path.join(RAW_DIR, "ofsted.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Ofsted data not found at {path}. Run download.py first."
        )

    df = pd.read_csv(path, low_memory=False)

    # Find key columns
    urn_col = None
    rating_col = None
    date_col = None
    ungraded_outcome_col = None
    ungraded_date_col = None

    for col in df.columns:
        cl = col.strip().lower()
        if cl == "urn":
            urn_col = col
        elif "overall effectiveness" in cl or "oeif overall" in cl:
            rating_col = col
        elif "inspection start date" in cl and "oeif" in cl:
            date_col = col
        elif "ungraded" in cl and "overall outcome" in cl:
            ungraded_outcome_col = col
        elif "date of latest ungraded" in cl:
            ungraded_date_col = col

    # Fallback: try broader matching
    if rating_col is None:
        for col in df.columns:
            if "overall" in col.lower() and "effect" in col.lower():
                rating_col = col
                break

    if date_col is None:
        for col in df.columns:
            if "inspection" in col.lower() and "date" in col.lower():
                date_col = col
                break

    if urn_col is None:
        raise ValueError("URN column not found in Ofsted data.")

    rename = {urn_col: "urn"}
    if rating_col:
        rename[rating_col] = "ofsted_rating"
    if date_col:
        rename[date_col] = "ofsted_date"
    if ungraded_outcome_col:
        rename[ungraded_outcome_col] = "_ungraded_outcome"
    if ungraded_date_col:
        rename[ungraded_date_col] = "_ungraded_date"

    df = df.rename(columns=rename)

    keep = [c for c in ["urn", "ofsted_rating", "ofsted_date",
                         "_ungraded_outcome", "_ungraded_date"] if c in df.columns]
    df = df[keep].copy()

    df["urn"] = pd.to_numeric(df["urn"], errors="coerce")
    df = df.dropna(subset=["urn"])
    df["urn"] = df["urn"].astype(int)

    # Map OEIF graded ratings to standard labels
    if "ofsted_rating" in df.columns:
        df["ofsted_rating"] = (
            df["ofsted_rating"].astype(str).str.strip().map(RATING_MAP)
        )

    # Fill missing OEIF ratings from ungraded inspection outcomes
    if "_ungraded_outcome" in df.columns:
        ungraded_rating = df["_ungraded_outcome"].astype(str).str.strip().map(
            UNGRADED_OUTCOME_MAP
        )
        missing = df["ofsted_rating"].isna()
        df.loc[missing, "ofsted_rating"] = ungraded_rating[missing]

        # Also use ungraded date if OEIF date is missing
        if "_ungraded_date" in df.columns and "ofsted_date" in df.columns:
            missing_date = df["ofsted_date"].isna() | (df["ofsted_date"].astype(str).str.strip().isin(["", "nan", "NaT"]))
            df.loc[missing_date, "ofsted_date"] = df.loc[missing_date, "_ungraded_date"]

        filled = missing.sum() - df.loc[missing, "ofsted_rating"].isna().sum()
        print(f"  Ofsted: filled {filled} ratings from ungraded inspection outcomes.")

    # Drop temporary columns
    df = df.drop(columns=[c for c in ["_ungraded_outcome", "_ungraded_date"] if c in df.columns])

    # Parse and format dates
    if "ofsted_date" in df.columns:
        df["ofsted_date"] = pd.to_datetime(df["ofsted_date"], errors="coerce")
        df = df.sort_values("ofsted_date", ascending=False)
        df["ofsted_date"] = df["ofsted_date"].dt.strftime("%Y-%m-%d")

    df = df.drop_duplicates(subset=["urn"], keep="first")
    df = df.set_index("urn")

    print(f"  Ofsted: {len(df)} inspection records parsed.")
    return df


if __name__ == "__main__":
    result = parse()
    print(result.head(10))
    print(f"\nRating distribution:")
    print(result["ofsted_rating"].value_counts())
