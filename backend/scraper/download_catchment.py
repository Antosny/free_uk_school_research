"""Download admissions outcome documents from London borough websites.

For each borough in the config, fetches the admissions page, finds links
to PDF/Excel/ODS documents containing admissions outcomes data, and
downloads them to backend/data/raw/catchment/{borough_name}/.
"""

import json
import os
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scraper.london_boroughs import BOROUGHS

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "catchment")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}

# Keywords that indicate an admissions outcomes document
OUTCOME_KEYWORDS = re.compile(
    r"admissions?\s*outcome|"
    r"admissions?\s*report|"
    r"admissions?\s*annual|"
    r"annual\s*admissions?|"
    r"last\s*distance\s*offered|"
    r"furthest\s*distance|"
    r"cut[\s-]*off\s*distance|"
    r"allocation\s*results|"
    r"offers?\s*(?:made|day)|"
    r"admissions?\s*booklet|"
    r"admissions?\s*brochure|"
    r"admissions?\s*guide",
    re.IGNORECASE,
)

# File extensions we want to download
DOC_EXTENSIONS = re.compile(r"\.(pdf|xlsx?|ods|csv)$", re.IGNORECASE)

# URL patterns that indicate a document download (CMS download paths)
DOWNLOAD_URL_PATTERNS = re.compile(
    r"/downloads?/(?:file|download|document)/", re.IGNORECASE
)

# Years we're interested in
TARGET_YEARS = list(range(2020, 2026))


def _extract_year_from_text(text: str) -> int | None:
    """Try to extract a year from link text or filename."""
    # Match academic years like 2023/24, 2023-24, 2023/2024
    m = re.search(r"(20[12]\d)[/-](?:20)?(\d{2})", text)
    if m:
        return int(m.group(1))

    # Match standalone years
    for year in sorted(TARGET_YEARS, reverse=True):
        if str(year) in text:
            return year

    return None


def _borough_dir(borough_name: str) -> str:
    """Return the download directory for a borough."""
    safe_name = borough_name.lower().replace(" ", "_").replace("and", "and")
    path = os.path.join(RAW_DIR, safe_name)
    os.makedirs(path, exist_ok=True)
    return path


def _download_file(url: str, dest_path: str) -> bool:
    """Download a file. Returns True on success."""
    if os.path.exists(dest_path):
        print(f"    Already exists: {os.path.basename(dest_path)}")
        return True

    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        resp = session.get(url, timeout=60, stream=True)
        resp.raise_for_status()

        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        size = os.path.getsize(dest_path)
        print(f"    Downloaded: {os.path.basename(dest_path)} ({size:,} bytes)")
        return True
    except Exception as e:
        print(f"    Failed to download {url}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


def download_borough(borough: dict) -> list[dict]:
    """Download admissions documents for a single borough.

    Returns a list of metadata dicts for successfully downloaded files.
    """
    name = borough["name"]
    url = borough["url"]
    print(f"\n{name} (LA {borough['la_code']})")
    print(f"  Fetching: {url}")

    downloaded = []
    borough_dir = _borough_dir(name)

    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ERROR: Could not fetch page: {e}")
        print(f"  Manual download needed. Save documents to: {borough_dir}")
        return downloaded

    soup = BeautifulSoup(resp.text, "html.parser")

    # Find all links that match our criteria
    candidates = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        text = link.get_text(strip=True)
        full_url = urljoin(url, href)

        # Check if it's a document file or a CMS download URL
        has_doc_ext = DOC_EXTENSIONS.search(href)
        is_download_url = DOWNLOAD_URL_PATTERNS.search(href)
        if not has_doc_ext and not is_download_url:
            continue

        # Check if the link text or URL contains outcome-related keywords
        combined = f"{text} {href}"
        if not OUTCOME_KEYWORDS.search(combined):
            continue

        year = _extract_year_from_text(combined)

        # Determine format from extension or content-type hint in text
        if has_doc_ext:
            ext = has_doc_ext.group(1).lower()
        elif "pdf" in text.lower() or "pdf" in href.lower():
            ext = "pdf"
        elif "excel" in text.lower() or "xlsx" in href.lower():
            ext = "xlsx"
        else:
            ext = "pdf"  # default assumption for council downloads

        candidates.append({
            "url": full_url,
            "text": text,
            "year": year,
            "format": ext,
        })

    if not candidates:
        print(f"  No admissions outcome documents found automatically.")
        print(f"  Manual download needed. Save documents to: {borough_dir}")
        return downloaded

    print(f"  Found {len(candidates)} candidate document(s)")

    for doc in candidates:
        year_str = str(doc["year"]) if doc["year"] else "unknown_year"
        filename = f"{year_str}_admissions.{doc['format']}"
        dest = os.path.join(borough_dir, filename)

        if _download_file(doc["url"], dest):
            meta = {
                "borough": name,
                "la_code": borough["la_code"],
                "url": doc["url"],
                "year": doc["year"],
                "format": doc["format"],
                "local_path": dest,
                "link_text": doc["text"],
            }
            downloaded.append(meta)

    return downloaded


def download_all():
    """Download admissions documents for all London boroughs."""
    os.makedirs(RAW_DIR, exist_ok=True)

    all_downloads = []
    success_count = 0
    fail_count = 0

    for borough in BOROUGHS:
        docs = download_borough(borough)
        if docs:
            success_count += 1
            all_downloads.extend(docs)
        else:
            fail_count += 1

    # Save manifest
    manifest_path = os.path.join(RAW_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(all_downloads, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Download complete.")
    print(f"  Boroughs with documents: {success_count}")
    print(f"  Boroughs needing manual download: {fail_count}")
    print(f"  Total documents: {len(all_downloads)}")
    print(f"  Manifest: {manifest_path}")

    if fail_count > 0:
        print(f"\nBoroughs needing manual intervention:")
        for b in BOROUGHS:
            docs = [d for d in all_downloads if d["borough"] == b["name"]]
            if not docs:
                print(f"  - {b['name']}: {b['url']}")
                print(f"    Save to: {_borough_dir(b['name'])}")

    return all_downloads


if __name__ == "__main__":
    download_all()
