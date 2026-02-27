"""FastAPI application serving school data."""

import math
import os
import sqlite3
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Free UK School Research API", version="1.0.0")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "schools.db")

COLUMNS = [
    "urn", "name", "type", "phase", "admissions_policy", "age_low", "age_high",
    "num_pupils", "postcode", "latitude", "longitude",
    "ofsted_rating", "ofsted_date",
    "ks2_reading", "ks2_maths", "ks4_attainment8", "ks4_progress8",
    "ks4_dest_education", "ks4_dest_apprenticeships", "ks4_dest_employment",
    "ks5_dest_higher_education", "ks5_dest_further_education",
    "ks5_dest_apprenticeships", "ks5_dest_employment",
    "ks5_dest_russell_group", "ks5_dest_oxbridge", "ks5_dest_top_third",
    "fsm_percent",
    "ethnicity_white", "ethnicity_mixed", "ethnicity_asian",
    "ethnicity_black", "ethnicity_other",
    "ethnicity_white_british", "ethnicity_irish", "ethnicity_gypsy_roma",
    "ethnicity_other_white",
    "ethnicity_mixed_white_black_caribbean", "ethnicity_mixed_white_black_african",
    "ethnicity_mixed_white_asian", "ethnicity_other_mixed",
    "ethnicity_indian", "ethnicity_pakistani", "ethnicity_bangladeshi",
    "ethnicity_chinese", "ethnicity_other_asian",
    "ethnicity_black_caribbean", "ethnicity_black_african", "ethnicity_other_black",
]


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row: sqlite3.Row) -> dict:
    return {k: row[k] for k in row.keys()}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in km using the haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@app.get("/api/schools")
def list_schools(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(5.0, description="Search radius in km"),
    phase: Optional[str] = Query(None, description="Filter by phase (Primary, Secondary)"),
    rating: Optional[str] = Query(None, description="Filter by Ofsted rating"),
    limit: int = Query(200, description="Max results"),
):
    """Find schools near a geographic point."""
    # Bounding box for fast SQL filter (~1 degree lat ≈ 111 km)
    delta_lat = radius_km / 111.0
    delta_lng = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))

    lat_min = lat - delta_lat
    lat_max = lat + delta_lat
    lng_min = lng - delta_lng
    lng_max = lng + delta_lng

    conn = get_db()
    query = """
        SELECT * FROM schools
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
    """
    params: list = [lat_min, lat_max, lng_min, lng_max]

    if phase:
        query += " AND phase = ?"
        params.append(phase)

    if rating:
        query += " AND ofsted_rating = ?"
        params.append(rating)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    # Refine with haversine and add distance
    results = []
    for row in rows:
        d = row_to_dict(row)
        if d["latitude"] is None or d["longitude"] is None:
            continue
        dist = haversine_km(lat, lng, d["latitude"], d["longitude"])
        if dist <= radius_km:
            d["distance_km"] = round(dist, 2)
            results.append(d)

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


@app.get("/api/schools/bounds")
def list_schools_by_bounds(
    lat_min: float = Query(..., description="South latitude"),
    lat_max: float = Query(..., description="North latitude"),
    lng_min: float = Query(..., description="West longitude"),
    lng_max: float = Query(..., description="East longitude"),
    phase: Optional[str] = Query(None, description="Filter by phase"),
    rating: Optional[str] = Query(None, description="Filter by Ofsted rating"),
    limit: int = Query(1501, description="Max results (fetch 1501 to detect overflow)"),
):
    """Find schools within a bounding box (map viewport)."""
    conn = get_db()
    query = """
        SELECT * FROM schools
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
    """
    params: list = [lat_min, lat_max, lng_min, lng_max]

    if phase:
        query += " AND phase = ?"
        params.append(phase)

    if rating:
        query += " AND ofsted_rating = ?"
        params.append(rating)

    query += " LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for row in rows:
        d = row_to_dict(row)
        if d["latitude"] is not None and d["longitude"] is not None:
            results.append(d)

    return {"total": len(results), "schools": results[:1500]}


@app.get("/api/schools/{urn}")
def get_school(urn: int):
    """Get details for a single school by URN."""
    conn = get_db()
    row = conn.execute("SELECT * FROM schools WHERE urn = ?", (urn,)).fetchone()

    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="School not found")

    result = row_to_dict(row)

    # Fetch catchment data if the table exists
    try:
        catchment_rows = conn.execute(
            """SELECT year, last_distance_offered, offers_made, applications
               FROM catchment WHERE urn = ? ORDER BY year DESC""",
            (urn,),
        ).fetchall()
        result["catchment"] = [row_to_dict(r) for r in catchment_rows]
    except Exception:
        result["catchment"] = []

    conn.close()
    return result


@app.get("/api/search")
def search_schools(
    q: str = Query(..., min_length=1, description="Search query (name or postcode)"),
    limit: int = Query(20, description="Max results"),
):
    """Search for schools by name or postcode.

    If the query looks like a UK postcode, resolves it to lat/lng via
    postcodes.io and returns nearby schools. Otherwise searches by name.
    """
    query = q.strip()

    # Check if it looks like a UK postcode (simplified check)
    cleaned = query.replace(" ", "").upper()
    is_postcode = (
        len(cleaned) >= 5
        and len(cleaned) <= 8
        and cleaned[0].isalpha()
        and any(c.isdigit() for c in cleaned)
        and cleaned[-1].isalpha()
    )

    if is_postcode:
        # Resolve postcode to lat/lng
        try:
            resp = requests.get(
                f"https://api.postcodes.io/postcodes/{query}",
                timeout=5,
            )
            data = resp.json()
            if data.get("status") == 200 and data.get("result"):
                lat = data["result"]["latitude"]
                lng = data["result"]["longitude"]
                return {
                    "type": "postcode",
                    "postcode": data["result"]["postcode"],
                    "latitude": lat,
                    "longitude": lng,
                }
        except Exception:
            pass

    # Name search
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM schools WHERE name LIKE ? LIMIT ?",
        (f"%{query}%", limit),
    ).fetchall()
    conn.close()

    return {
        "type": "name",
        "query": query,
        "results": [row_to_dict(r) for r in rows],
    }
