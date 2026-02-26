"""Parse catchment (last distance offered) data from downloaded documents.

Supports three extraction paths:
1. PDF — via pdfplumber (pure Python, no Java)
2. Excel/ODS — via pandas.read_excel()
3. HTML tables — via pandas.read_html()

After extraction, fuzzy-matches school names to URNs using the schools
table in the database.
"""

import json
import os
import re
import sqlite3
from difflib import SequenceMatcher

import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "catchment")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "schools.db")

# Column name patterns for identifying relevant columns
DISTANCE_PATTERNS = re.compile(
    r"last\s*distance|furthest\s*distance|cut[\s-]*off\s*distance|"
    r"home[\s-]*school\s*distance|distance\s*offered|"
    r"distance\s*\(miles\)|distance\s*\(km\)",
    re.IGNORECASE,
)
SCHOOL_NAME_PATTERNS = re.compile(
    r"school\s*name|name\s*of\s*school|establishment|school$",
    re.IGNORECASE,
)
OFFERS_PATTERNS = re.compile(
    r"offers?\s*made|number\s*offered|places?\s*offered|total\s*offers",
    re.IGNORECASE,
)
APPS_PATTERNS = re.compile(
    r"applications?|preferences?|total\s*applications?|1st\s*pref",
    re.IGNORECASE,
)

KM_TO_MILES = 0.621371


def _load_school_lookup(la_code: str | None = None) -> dict[str, int]:
    """Load school names → URN mapping from the database.

    Returns a dict of {lowercase_name: urn}.
    If la_code is given, filters to schools within ~15 km of the borough center
    to avoid matching schools with the same name in other parts of the country.
    """
    if not os.path.exists(DB_PATH):
        return {}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if la_code:
        from scraper.london_boroughs import get_borough_by_la_code
        borough = get_borough_by_la_code(la_code)
        if borough and "lat" in borough and "lng" in borough:
            # Filter to schools within ~15 km bounding box of borough center
            lat, lng = borough["lat"], borough["lng"]
            delta = 15 / 111.0  # ~15 km in degrees
            rows = conn.execute(
                """SELECT urn, name FROM schools
                   WHERE latitude BETWEEN ? AND ?
                     AND longitude BETWEEN ? AND ?""",
                (lat - delta, lat + delta, lng - delta * 1.6, lng + delta * 1.6),
            ).fetchall()
            conn.close()
            return {row["name"].lower().strip(): row["urn"] for row in rows}

    rows = conn.execute("SELECT urn, name FROM schools").fetchall()
    conn.close()
    return {row["name"].lower().strip(): row["urn"] for row in rows}


def _fuzzy_match_urn(
    school_name: str, lookup: dict[str, int], threshold: float = 0.75
) -> int | None:
    """Match a school name to a URN using fuzzy string matching."""
    name_lower = school_name.lower().strip()

    # Exact match
    if name_lower in lookup:
        return lookup[name_lower]

    # Try without common suffixes/prefixes
    cleaned = re.sub(
        r"\s*(school|academy|primary|secondary|junior|infant|nursery|"
        r"ce |c of e|rc |catholic|church of england)\s*",
        " ",
        name_lower,
    ).strip()

    best_score = 0.0
    best_urn = None

    for db_name, urn in lookup.items():
        db_cleaned = re.sub(
            r"\s*(school|academy|primary|secondary|junior|infant|nursery|"
            r"ce |c of e|rc |catholic|church of england)\s*",
            " ",
            db_name,
        ).strip()

        score = SequenceMatcher(None, cleaned, db_cleaned).ratio()
        if score > best_score:
            best_score = score
            best_urn = urn

    if best_score >= threshold:
        return best_urn

    return None


def _find_column(columns: list[str], pattern: re.Pattern) -> str | None:
    """Find a column name matching a regex pattern."""
    for col in columns:
        if pattern.search(str(col)):
            return col
    return None


def _parse_distance(value) -> float | None:
    """Parse a distance value, normalizing to miles."""
    if pd.isna(value):
        return None

    text = str(value).strip()
    if not text or text.lower() in ("n/a", "-", "na", "all", "see note"):
        return None

    # Extract numeric value
    m = re.search(r"(\d+\.?\d*)", text)
    if not m:
        return None

    dist = float(m.group(1))

    # Check if it's in km and convert
    if "km" in text.lower():
        dist *= KM_TO_MILES
    # If distance > 10, it's likely in metres — convert
    elif dist > 20:
        dist = dist / 1609.34  # metres to miles

    return round(dist, 3)


def _parse_int(value) -> int | None:
    """Parse an integer value."""
    if pd.isna(value):
        return None
    text = str(value).strip()
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def _extract_from_dataframe(
    df: pd.DataFrame, year: int | None, la_code: str | None
) -> pd.DataFrame:
    """Extract catchment data from a DataFrame with auto-detected columns.

    Returns a DataFrame with columns: urn, year, last_distance_offered,
    offers_made, applications.
    """
    if df.empty:
        return pd.DataFrame()

    cols = list(df.columns)

    # Auto-detect columns
    school_col = _find_column(cols, SCHOOL_NAME_PATTERNS)
    distance_col = _find_column(cols, DISTANCE_PATTERNS)

    if not school_col or not distance_col:
        return pd.DataFrame()

    offers_col = _find_column(cols, OFFERS_PATTERNS)
    apps_col = _find_column(cols, APPS_PATTERNS)

    # Load school name → URN lookup
    lookup = _load_school_lookup(la_code)
    if not lookup:
        return pd.DataFrame()

    records = []
    for _, row in df.iterrows():
        name = str(row[school_col]).strip()
        if not name or name.lower() in ("nan", ""):
            continue

        urn = _fuzzy_match_urn(name, lookup)
        if urn is None:
            continue

        distance = _parse_distance(row[distance_col])
        offers = _parse_int(row[offers_col]) if offers_col else None
        apps = _parse_int(row[apps_col]) if apps_col else None

        if distance is not None:
            records.append({
                "urn": urn,
                "year": year,
                "last_distance_offered": distance,
                "offers_made": offers,
                "applications": apps,
            })

    return pd.DataFrame(records)


def _parse_pdf_distance_text(filepath: str, la_code: str | None) -> pd.DataFrame:
    """Parse distance tables from PDF text (e.g. Bromley-style booklets).

    These PDFs contain pages with lines like:
        School Name  0 0  0.339  0.409  0.471
    where the trailing numbers are distances for multiple years.

    The header line contains year columns like "2025 2024 2023".
    """
    try:
        import pdfplumber
    except ImportError:
        return pd.DataFrame()

    import warnings
    warnings.filterwarnings("ignore")

    lookup = _load_school_lookup(la_code)
    if not lookup:
        return pd.DataFrame()

    records = []

    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""

                # Check if this page has distance table data
                if "distance in miles" not in text.lower():
                    continue

                lines = text.split("\n")

                # Find year columns from header lines
                years = []
                for line in lines:
                    # Match header like "2025 2024 2023" or "Upheld 2025 2024 2023"
                    year_match = re.findall(r"\b(20[12]\d)\b", line)
                    if len(year_match) >= 2:
                        years = [int(y) for y in year_match]
                        break

                if not years:
                    continue

                # Parse each data line
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue

                    # Skip header/footer lines
                    if any(skip in line.lower() for skip in [
                        "distance in miles", "appeals", "heard", "upheld",
                        "school", "n/a - school", "* the distance",
                        "the table below", "information relating",
                        "admissions rounds", "primary and infant",
                        "junior schools",
                    ]):
                        # But "School" alone at start could be a header — skip
                        if line.strip().lower() in ("school", "heard", "upheld"):
                            continue
                        if line.startswith("*") or line.startswith("N/A -"):
                            continue
                        # Only skip if it looks like a pure header
                        if "distance in miles" in line.lower():
                            continue
                        if line.lower().startswith("the table below"):
                            continue
                        if line.lower().startswith("information relating"):
                            continue
                        if line.lower().startswith("admissions rounds"):
                            continue
                        if line.lower() in ("primary and infant schools",
                                            "junior schools"):
                            continue

                    # Try to extract: school name followed by distances
                    # Pattern: text ... number(s) ... distance values (N/A or 0.xxx)
                    # The line typically ends with distance values or N/A
                    # E.g.: "Alexandra Infant School 2 0 0.339 0.409 0.471"
                    # E.g.: "Biggin Hill Primary School Information not available 1.288 3.440 N/A"

                    # Extract trailing distance/N/A values
                    dist_pattern = r"(?:N/A|Church\nCriteria|Church|Criteria|\d+\.\d+)"
                    # Find all distance-like values at end of line
                    trailing = re.findall(
                        r"((?:\d+\.\d+)|(?:N/A))\s*",
                        line,
                    )

                    if len(trailing) < len(years):
                        # Not enough distance values — might be a continuation line
                        continue

                    # The last N values (where N = len(years)) are the distances
                    dist_values = trailing[-len(years):]

                    # Extract school name: everything before the appeals/distance data
                    # Remove "Information not available" and trailing numbers
                    name_part = line
                    # Remove from right: distances, then appeal numbers/text
                    for dv in reversed(dist_values):
                        idx = name_part.rfind(dv)
                        if idx >= 0:
                            name_part = name_part[:idx]
                    # Remove "Information not available"
                    name_part = re.sub(
                        r"\s*Information not available\s*", " ", name_part
                    )
                    # Remove trailing numbers (appeals heard/upheld)
                    name_part = re.sub(r"\s+\d+\s+\d+\s*$", "", name_part)
                    name_part = name_part.strip()

                    if not name_part or len(name_part) < 3:
                        continue

                    # Skip page numbers
                    if name_part.isdigit():
                        continue

                    urn = _fuzzy_match_urn(name_part, lookup)
                    if urn is None:
                        continue

                    # Create a record for each year
                    for yi, yr in enumerate(years):
                        dist = _parse_distance(dist_values[yi])
                        if dist is not None:
                            records.append({
                                "urn": urn,
                                "year": yr,
                                "last_distance_offered": dist,
                                "offers_made": None,
                                "applications": None,
                            })

    except Exception as e:
        print(f"  Error in text-based PDF parsing {filepath}: {e}")

    return pd.DataFrame(records) if records else pd.DataFrame()


def _parse_pdf_school_entries(
    filepath: str, la_code: str | None
) -> pd.DataFrame:
    """Parse per-school entries from booklet PDFs (applications/offers data).

    Looks for patterns like:
        Applications received 329
        Places offered 90
    on individual school entry pages.
    """
    try:
        import pdfplumber
    except ImportError:
        return pd.DataFrame()

    import warnings
    warnings.filterwarnings("ignore")

    lookup = _load_school_lookup(la_code)
    if not lookup:
        return pd.DataFrame()

    records = []

    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""

                if "applications received" not in text.lower():
                    continue
                if "places offered" not in text.lower():
                    continue

                # Find school names with DfE numbers
                # Pattern: "School Name DfE number"
                entries = re.split(
                    r"(?=\w[\w\s']+(?:School|Academy|Infant|Junior)\s+DfE number)",
                    text,
                )

                for entry in entries:
                    # Extract school name
                    name_match = re.match(
                        r"([\w\s']+(?:School|Academy|Infants?|Junior))\s+DfE number",
                        entry,
                    )
                    if not name_match:
                        continue

                    name = name_match.group(1).strip()
                    urn = _fuzzy_match_urn(name, lookup)
                    if urn is None:
                        continue

                    apps_match = re.search(
                        r"Applications received\s+(\d+)", entry
                    )
                    offers_match = re.search(
                        r"Places offered\s+(\d+)", entry
                    )

                    apps = int(apps_match.group(1)) if apps_match else None
                    offers = int(offers_match.group(1)) if offers_match else None

                    # Find year from "20XX admissions"
                    year_match = re.search(r"(20[12]\d)\s+admissions", entry)
                    year = int(year_match.group(1)) if year_match else None

                    # Update existing records with offers/apps data
                    if apps is not None or offers is not None:
                        records.append({
                            "urn": urn,
                            "year": year,
                            "offers_made": offers,
                            "applications": apps,
                        })

    except Exception as e:
        print(f"  Error parsing school entries {filepath}: {e}")

    return pd.DataFrame(records) if records else pd.DataFrame()


def parse_pdf(filepath: str, year: int | None, la_code: str | None) -> pd.DataFrame:
    """Extract catchment data from a PDF file using pdfplumber.

    Tries multiple strategies:
    1. Text-based extraction for multi-year distance tables (e.g. Bromley booklets)
    2. Table-based extraction for structured tables
    3. Per-school entry parsing for applications/offers data
    """
    try:
        import pdfplumber
    except ImportError:
        print("  pdfplumber not installed. Run: pip install pdfplumber")
        return pd.DataFrame()

    all_records = pd.DataFrame()

    # Strategy 1: Text-based multi-year distance tables
    text_result = _parse_pdf_distance_text(filepath, la_code)
    if not text_result.empty:
        print(f"    Text extraction: {len(text_result)} distance records")
        all_records = pd.concat([all_records, text_result], ignore_index=True)

    # Strategy 2: Table-based extraction
    try:
        import warnings
        warnings.filterwarnings("ignore")

        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue

                    # Use first row as headers
                    headers = [str(h).strip() if h else f"col_{i}"
                               for i, h in enumerate(table[0])]
                    df = pd.DataFrame(table[1:], columns=headers)

                    result = _extract_from_dataframe(df, year, la_code)
                    if not result.empty:
                        all_records = pd.concat([all_records, result],
                                                ignore_index=True)
    except Exception as e:
        print(f"  Error in table-based PDF parsing {filepath}: {e}")

    # Strategy 3: Per-school entries (applications/offers)
    entries_result = _parse_pdf_school_entries(filepath, la_code)
    if not entries_result.empty:
        print(f"    School entries: {len(entries_result)} apps/offers records")
        # Merge offers/apps data into distance records
        if not all_records.empty and not entries_result.empty:
            for _, entry in entries_result.iterrows():
                mask = (
                    (all_records["urn"] == entry["urn"])
                    & (all_records["year"] == entry.get("year"))
                )
                if mask.any():
                    if entry.get("offers_made") is not None:
                        all_records.loc[mask, "offers_made"] = entry["offers_made"]
                    if entry.get("applications") is not None:
                        all_records.loc[mask, "applications"] = entry["applications"]

    return all_records


def parse_excel(
    filepath: str, year: int | None, la_code: str | None
) -> pd.DataFrame:
    """Extract catchment data from an Excel/ODS file."""
    all_records = pd.DataFrame()

    try:
        # Determine engine based on extension
        ext = os.path.splitext(filepath)[1].lower()
        engine = "odf" if ext == ".ods" else None

        xls = pd.ExcelFile(filepath, engine=engine)
        for sheet_name in xls.sheet_names:
            # Try with different header rows (some files have title rows)
            for header_row in [0, 1, 2]:
                try:
                    df = pd.read_excel(
                        xls, sheet_name=sheet_name, header=header_row
                    )
                    result = _extract_from_dataframe(df, year, la_code)
                    if not result.empty:
                        all_records = pd.concat([all_records, result],
                                                ignore_index=True)
                        break
                except Exception:
                    continue
    except Exception as e:
        print(f"  Error parsing Excel {filepath}: {e}")

    return all_records


def parse_html(filepath: str, year: int | None, la_code: str | None) -> pd.DataFrame:
    """Extract catchment data from an HTML file with tables."""
    all_records = pd.DataFrame()

    try:
        tables = pd.read_html(filepath)
        for df in tables:
            result = _extract_from_dataframe(df, year, la_code)
            if not result.empty:
                all_records = pd.concat([all_records, result],
                                        ignore_index=True)
    except Exception as e:
        print(f"  Error parsing HTML {filepath}: {e}")

    return all_records


def parse_file(
    filepath: str, year: int | None = None, la_code: str | None = None
) -> pd.DataFrame:
    """Parse a single file, auto-detecting format from extension."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        return parse_pdf(filepath, year, la_code)
    elif ext in (".xlsx", ".xls", ".ods"):
        return parse_excel(filepath, year, la_code)
    elif ext in (".html", ".htm"):
        return parse_html(filepath, year, la_code)
    elif ext == ".csv":
        try:
            df = pd.read_csv(filepath)
            return _extract_from_dataframe(df, year, la_code)
        except Exception as e:
            print(f"  Error parsing CSV {filepath}: {e}")
            return pd.DataFrame()
    else:
        print(f"  Unsupported format: {ext}")
        return pd.DataFrame()


def parse() -> pd.DataFrame:
    """Parse all downloaded catchment documents.

    Reads the manifest.json and processes each file. Returns a combined
    DataFrame with columns: urn, year, last_distance_offered, offers_made,
    applications.
    """
    manifest_path = os.path.join(RAW_DIR, "manifest.json")

    if not os.path.exists(manifest_path):
        print("  No catchment manifest found. Run download_catchment first.")
        # Also try to parse any files found directly in borough dirs
        return _parse_all_files_in_dirs()

    with open(manifest_path) as f:
        manifest = json.load(f)

    all_records = pd.DataFrame()

    for entry in manifest:
        filepath = entry.get("local_path", "")
        if not os.path.exists(filepath):
            print(f"  Missing file: {filepath}")
            continue

        year = entry.get("year")
        la_code = entry.get("la_code")
        borough = entry.get("borough", "unknown")

        print(f"  Parsing {borough} ({year}): {os.path.basename(filepath)}")
        result = parse_file(filepath, year, la_code)

        if not result.empty:
            print(f"    Found {len(result)} records")
            all_records = pd.concat([all_records, result], ignore_index=True)
        else:
            print(f"    No records extracted")

    # Deduplicate: keep latest entry per (urn, year)
    if not all_records.empty:
        all_records = all_records.drop_duplicates(
            subset=["urn", "year"], keep="last"
        )

    return all_records


def _parse_all_files_in_dirs() -> pd.DataFrame:
    """Fallback: scan borough directories for any parseable files."""
    if not os.path.exists(RAW_DIR):
        return pd.DataFrame()

    all_records = pd.DataFrame()

    for dirname in sorted(os.listdir(RAW_DIR)):
        dirpath = os.path.join(RAW_DIR, dirname)
        if not os.path.isdir(dirpath):
            continue

        for filename in sorted(os.listdir(dirpath)):
            filepath = os.path.join(dirpath, filename)
            if not os.path.isfile(filepath):
                continue

            # Try to extract year from filename
            year_match = re.search(r"(20[12]\d)", filename)
            year = int(year_match.group(1)) if year_match else None

            print(f"  Parsing {dirname}/{filename} (year={year})")
            result = parse_file(filepath, year)

            if not result.empty:
                print(f"    Found {len(result)} records")
                all_records = pd.concat([all_records, result],
                                        ignore_index=True)

    if not all_records.empty:
        all_records = all_records.drop_duplicates(
            subset=["urn", "year"], keep="last"
        )

    return all_records


if __name__ == "__main__":
    df = parse()
    if df.empty:
        print("\nNo catchment data parsed.")
    else:
        print(f"\nTotal records: {len(df)}")
        print(f"Unique schools: {df['urn'].nunique()}")
        print(f"Years covered: {sorted(df['year'].dropna().unique())}")
        print(df.head(20).to_string())
