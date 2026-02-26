"""Merge parsed data and build the SQLite schools database."""

import os
import sqlite3

import pandas as pd

from scraper.parse_gias import parse as parse_gias
from scraper.parse_ofsted import parse as parse_ofsted
from scraper.parse_results import parse_ks2, parse_ks4
from scraper.parse_destinations import parse_ks4_destinations, parse_ks5_destinations
from scraper.parse_characteristics import parse_school_characteristics
from scraper.parse_catchment import parse as parse_catchment
from db.models import SCHEMA_SQL, COLUMNS, CATCHMENT_SCHEMA_SQL

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "schools.db")


def build():
    """Build the schools database from parsed CSV data."""
    print("Parsing GIAS data...")
    gias = parse_gias()

    print("Parsing Ofsted data...")
    try:
        ofsted = parse_ofsted()
    except FileNotFoundError:
        print("  Ofsted data not available, skipping.")
        ofsted = pd.DataFrame()

    print("Parsing KS2 data...")
    ks2 = parse_ks2()

    print("Parsing KS4 data...")
    ks4 = parse_ks4()

    print("Parsing KS4 destination measures...")
    ks4_dest = parse_ks4_destinations()

    print("Parsing KS5 destination measures...")
    ks5_dest = parse_ks5_destinations()

    print("Parsing school characteristics (FSM, ethnicity)...")
    characteristics = parse_school_characteristics()

    # Merge all on URN (left join from GIAS as the base)
    print("Merging datasets...")
    merged = gias

    if not ofsted.empty:
        merged = merged.join(ofsted, how="left")

    if not ks2.empty:
        merged = merged.join(ks2, how="left")

    if not ks4.empty:
        merged = merged.join(ks4, how="left")

    if not ks4_dest.empty:
        merged = merged.join(ks4_dest, how="left")

    if not ks5_dest.empty:
        merged = merged.join(ks5_dest, how="left")

    if not characteristics.empty:
        merged = merged.join(characteristics, how="left")

    # Reset index to get URN as a column
    merged = merged.reset_index()

    # Ensure all expected columns exist
    for col in COLUMNS:
        if col not in merged.columns:
            merged[col] = None

    merged = merged[COLUMNS]

    # Write to SQLite
    print(f"Writing {len(merged)} schools to {DB_PATH}...")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_SQL)

    merged.to_sql("schools", conn, if_exists="replace", index=False)

    # Re-create indices after to_sql (it drops them)
    conn.executescript("""
        CREATE INDEX IF NOT EXISTS idx_schools_lat_lng ON schools(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_schools_postcode ON schools(postcode);
        CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
    """)

    # Verify schools
    cursor = conn.execute("SELECT COUNT(*) FROM schools")
    count = cursor.fetchone()[0]
    print(f"Done. {count} schools in database.")

    # Build catchment table
    print("\nBuilding catchment table...")
    conn.executescript(CATCHMENT_SCHEMA_SQL)

    try:
        catchment = parse_catchment()
    except Exception as e:
        print(f"  Catchment parsing failed: {e}")
        catchment = pd.DataFrame()

    if not catchment.empty:
        # Upsert catchment data
        for _, row in catchment.iterrows():
            conn.execute(
                """INSERT OR REPLACE INTO catchment
                   (urn, year, last_distance_offered, offers_made, applications)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    int(row["urn"]),
                    int(row["year"]) if pd.notna(row["year"]) else None,
                    row["last_distance_offered"] if pd.notna(row.get("last_distance_offered")) else None,
                    int(row["offers_made"]) if pd.notna(row.get("offers_made")) else None,
                    int(row["applications"]) if pd.notna(row.get("applications")) else None,
                ),
            )
        conn.commit()

        cursor = conn.execute("SELECT COUNT(*), COUNT(DISTINCT urn) FROM catchment")
        c_count, c_schools = cursor.fetchone()
        print(f"  Loaded {c_count} catchment records for {c_schools} schools.")
    else:
        print("  No catchment data available.")

    conn.close()
    return count


if __name__ == "__main__":
    build()
