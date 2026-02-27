"""Download raw CSV data files from GOV.UK sources."""

import os
import re
import tempfile
import zipfile
from datetime import datetime, timedelta

import requests

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def ensure_dir():
    os.makedirs(RAW_DIR, exist_ok=True)


def download_file(url: str, filename: str) -> str:
    """Download a file to the raw data directory. Returns the local path."""
    ensure_dir()
    path = os.path.join(RAW_DIR, filename)
    if os.path.exists(path):
        print(f"  Already exists: {path}")
        return path
    print(f"  Downloading {url} ...")
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(url, timeout=300, stream=True)
    resp.raise_for_status()
    total = 0
    with open(path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
            total += len(chunk)
    print(f"  Saved to {path} ({total:,} bytes)")
    return path


def download_gias() -> str:
    """Download GIAS establishment data (all open schools in England).

    Uses the edubase API which publishes daily dated CSV extracts.
    """
    today = datetime.now()
    for days_ago in range(7):
        date = today - timedelta(days=days_ago)
        date_str = date.strftime("%Y%m%d")
        url = (
            f"https://ea-edubase-api-prod.azurewebsites.net/edubase/"
            f"downloads/public/edubasealldata{date_str}.csv"
        )
        try:
            return download_file(url, "gias.csv")
        except Exception:
            continue

    print("  GIAS auto-download failed.")
    print("  Please download manually from:")
    print("    https://get-information-schools.service.gov.uk/Downloads")
    print(f"  Save as: {os.path.join(RAW_DIR, 'gias.csv')}")
    return os.path.join(RAW_DIR, "gias.csv")


def download_ofsted() -> str:
    """Download Ofsted inspection outcomes.

    Scrapes the GOV.UK page to find the latest ODS file, downloads it,
    and converts it to CSV using pandas + odfpy.
    """
    csv_path = os.path.join(RAW_DIR, "ofsted.csv")
    if os.path.exists(csv_path):
        print(f"  Already exists: {csv_path}")
        return csv_path

    session = requests.Session()
    session.headers.update(HEADERS)

    page_url = (
        "https://www.gov.uk/government/statistical-data-sets/"
        "monthly-management-information-ofsteds-school-inspections-outcomes"
    )
    print(f"  Fetching Ofsted page for download links...")
    resp = session.get(page_url, timeout=30)
    resp.raise_for_status()

    # Find ODS/CSV download links
    links = re.findall(
        r'href="(https://assets\.publishing\.service\.gov\.uk/[^"]*\.(?:csv|ods))"',
        resp.text,
    )
    if not links:
        raise RuntimeError("Could not find Ofsted data download link.")

    # Download the first matching file (most recent)
    ods_path = os.path.join(RAW_DIR, "ofsted.ods")
    if not os.path.exists(ods_path):
        download_file(links[0], "ofsted.ods")

    # Convert ODS to CSV
    print("  Converting ODS to CSV...")
    import pandas as pd

    df = pd.read_excel(ods_path, sheet_name="D2_Most_recent_inspections",
                       engine="odf", header=2)
    df.to_csv(csv_path, index=False)
    print(f"  Saved {len(df)} rows to {csv_path}")
    return csv_path


def download_ks2() -> str:
    """Download KS2 (primary school) performance data from DfE API."""
    api_ds_id = "019afee4-e5d0-72f9-9a8f-d7a1a56eac1d"
    url = (
        f"https://api.education.gov.uk/statistics/v1/data-sets/"
        f"{api_ds_id}/csv?dataSetVersion=1.0"
    )
    try:
        return download_file(url, "ks2.csv")
    except Exception as e:
        print(f"  KS2 auto-download failed: {e}")
        print("  Please download from:")
        print("    https://explore-education-statistics.service.gov.uk/"
              "find-statistics/key-stage-2-attainment")
        print(f"  Save as: {os.path.join(RAW_DIR, 'ks2.csv')}")
        return os.path.join(RAW_DIR, "ks2.csv")


def download_ks4() -> str:
    """Download KS4 (secondary school) performance data from DfE API."""
    api_ds_id = "19e39901-a96c-be76-b9c2-6af54ae076d2"
    url = (
        f"https://api.education.gov.uk/statistics/v1/data-sets/"
        f"{api_ds_id}/csv?dataSetVersion=1.0"
    )
    try:
        return download_file(url, "ks4.csv")
    except Exception as e:
        print(f"  KS4 auto-download failed: {e}")
        print("  Please download from:")
        print("    https://explore-education-statistics.service.gov.uk/"
              "find-statistics/key-stage-4-performance")
        print(f"  Save as: {os.path.join(RAW_DIR, 'ks4.csv')}")
        return os.path.join(RAW_DIR, "ks4.csv")


def _download_dfe_zip_csv(release_id: str, csv_prefix: str, output_name: str) -> str:
    """Download a DfE release zip and extract the institution-level CSV.

    The DfE content API serves release files as a zip containing multiple CSVs.
    We extract the institution-level one (matching csv_prefix, e.g. 'ees_ks4_inst').
    """
    ensure_dir()
    csv_path = os.path.join(RAW_DIR, output_name)
    if os.path.exists(csv_path):
        print(f"  Already exists: {csv_path}")
        return csv_path

    url = (
        f"https://content.explore-education-statistics.service.gov.uk/"
        f"api/releases/{release_id}/files?fromPage=ReleaseDownloads"
    )
    print(f"  Downloading {url} ...")
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(url, timeout=300)
    resp.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name

    try:
        with zipfile.ZipFile(tmp_path) as zf:
            # Find the institution-level CSV
            inst_file = None
            for name in zf.namelist():
                if csv_prefix in name and name.endswith(".csv"):
                    inst_file = name
                    break
            if not inst_file:
                raise RuntimeError(
                    f"Could not find {csv_prefix}*.csv in zip. "
                    f"Contents: {zf.namelist()}"
                )
            print(f"  Extracting {inst_file} ...")
            with zf.open(inst_file) as src, open(csv_path, "wb") as dst:
                dst.write(src.read())
            size = os.path.getsize(csv_path)
            print(f"  Saved to {csv_path} ({size:,} bytes)")
    finally:
        os.unlink(tmp_path)

    return csv_path


def download_ks4_destinations() -> str:
    """Download KS4 destination measures from DfE content API."""
    try:
        return _download_dfe_zip_csv(
            release_id="68dfa5f3-9e41-471e-9daf-bf537bceecf6",
            csv_prefix="ees_ks4_inst",
            output_name="ks4_destinations.csv",
        )
    except Exception as e:
        print(f"  KS4 destinations auto-download failed: {e}")
        print(f"  Save as: {os.path.join(RAW_DIR, 'ks4_destinations.csv')}")
        return os.path.join(RAW_DIR, "ks4_destinations.csv")


def download_ks5_destinations() -> str:
    """Download 16-18 (KS5) destination measures from DfE content API."""
    try:
        return _download_dfe_zip_csv(
            release_id="4f12d515-38a6-4bd1-b9f6-2323b5879fda",
            csv_prefix="ees_ks5_inst",
            output_name="ks5_destinations.csv",
        )
    except Exception as e:
        print(f"  KS5 destinations auto-download failed: {e}")
        print(f"  Save as: {os.path.join(RAW_DIR, 'ks5_destinations.csv')}")
        return os.path.join(RAW_DIR, "ks5_destinations.csv")


def download_ks5_destination_he() -> str:
    """Download 16-18 progression to higher education data (Russell Group, Oxbridge).

    This data comes from the DfE school performance tables download service.
    """
    ensure_dir()
    csv_path = os.path.join(RAW_DIR, "ks5_destination_he.csv")
    if os.path.exists(csv_path):
        print(f"  Already exists: {csv_path}")
        return csv_path

    session = requests.Session()
    session.headers.update(HEADERS)

    base = "https://www.find-school-performance-data.service.gov.uk"
    # Establish session cookies
    session.get(f"{base}/download-data", timeout=30)

    # Download via the performance tables download wizard
    resp = session.get(
        f"{base}/download-data",
        params={
            "download": "true",
            "regions": "0",
            "filters": "KS5DESTINATIONHE",
            "fileformat": "csv",
            "year": "2022-2023",
            "meta": "false",
        },
        timeout=120,
    )
    resp.raise_for_status()

    with open(csv_path, "wb") as f:
        f.write(resp.content)
    print(f"  Saved to {csv_path} ({len(resp.content):,} bytes)")
    return csv_path


def download_school_characteristics() -> str:
    """Download school pupils characteristics (FSM, ethnicity) from DfE."""
    try:
        return _download_dfe_zip_csv(
            release_id="63491b17-2037-4533-b719-d3656aaf6ed5",
            csv_prefix="spc_school_level_underlying_data",
            output_name="school_characteristics.csv",
        )
    except Exception as e:
        print(f"  School characteristics auto-download failed: {e}")
        print(f"  Save as: {os.path.join(RAW_DIR, 'school_characteristics.csv')}")
        return os.path.join(RAW_DIR, "school_characteristics.csv")


def download_all():
    """Download all data files."""
    print("Downloading GIAS data...")
    download_gias()
    print("\nDownloading Ofsted data...")
    download_ofsted()
    print("\nDownloading KS2 data...")
    download_ks2()
    print("\nDownloading KS4 data...")
    download_ks4()
    print("\nDownloading KS4 destination measures...")
    download_ks4_destinations()
    print("\nDownloading KS5 destination measures...")
    download_ks5_destinations()
    print("\nDownloading KS5 HE destination measures (Russell Group, Oxbridge)...")
    download_ks5_destination_he()
    print("\nDownloading school characteristics (FSM, ethnicity)...")
    download_school_characteristics()
    print("\nDone.")


if __name__ == "__main__":
    download_all()
