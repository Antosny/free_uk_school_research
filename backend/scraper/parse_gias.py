"""Parse GIAS (Get Information About Schools) establishment data."""

import os
import numpy as np
import pandas as pd
from pyproj import Transformer

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

# Actual column names in the GIAS edubase CSV
COL_MAP = {
    "URN": "urn",
    "EstablishmentName": "name",
    "TypeOfEstablishment (name)": "type",
    "PhaseOfEducation (name)": "phase",
    "StatutoryLowAge": "age_low",
    "StatutoryHighAge": "age_high",
    "NumberOfPupils": "num_pupils",
    "Postcode": "postcode",
    "Easting": "easting",
    "Northing": "northing",
}

# British National Grid (EPSG:27700) → WGS84 (EPSG:4326)
_transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)


def _bng_to_latlon(easting: pd.Series, northing: pd.Series):
    """Convert British National Grid easting/northing to WGS84 lat/lon."""
    mask = easting.notna() & northing.notna()
    lat = pd.Series(np.nan, index=easting.index)
    lon = pd.Series(np.nan, index=easting.index)
    if mask.any():
        x, y = _transformer.transform(
            easting[mask].values, northing[mask].values
        )
        lon[mask] = x
        lat[mask] = y
    return lat, lon


def parse() -> pd.DataFrame:
    """Read and clean GIAS CSV, returning a DataFrame keyed by URN."""
    path = os.path.join(RAW_DIR, "gias.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"GIAS data not found at {path}. Run download.py first."
        )

    df = pd.read_csv(path, encoding="cp1252", low_memory=False)

    # Rename known columns
    rename = {}
    for orig, target in COL_MAP.items():
        if orig in df.columns:
            rename[orig] = target
    df = df.rename(columns=rename)

    if "urn" not in df.columns:
        raise ValueError("URN column not found in GIAS data.")
    if "name" not in df.columns:
        raise ValueError("EstablishmentName column not found in GIAS data.")

    # Convert Easting/Northing to lat/lng if no direct lat/lng columns
    if "latitude" not in df.columns and "easting" in df.columns:
        df["easting"] = pd.to_numeric(df["easting"], errors="coerce")
        df["northing"] = pd.to_numeric(df["northing"], errors="coerce")
        print("  Converting Easting/Northing to lat/lng...")
        df["latitude"], df["longitude"] = _bng_to_latlon(
            df["easting"], df["northing"]
        )

    keep = [
        "urn", "name", "type", "phase", "age_low", "age_high",
        "num_pupils", "postcode", "latitude", "longitude",
    ]
    keep = [c for c in keep if c in df.columns]
    df = df[keep].copy()

    df["urn"] = pd.to_numeric(df["urn"], errors="coerce")
    df = df.dropna(subset=["urn"])
    df["urn"] = df["urn"].astype(int)

    for col in ("age_low", "age_high", "num_pupils"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ("latitude", "longitude"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.drop_duplicates(subset=["urn"], keep="first")
    df = df.set_index("urn")

    print(f"  GIAS: {len(df)} schools parsed.")
    return df


if __name__ == "__main__":
    result = parse()
    print(result.head())
    print(f"\nColumns: {list(result.columns)}")
    print(f"With lat/lng: {result['latitude'].notna().sum()}")
