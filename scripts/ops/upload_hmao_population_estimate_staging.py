#!/usr/bin/env python3
"""Upload the 8112027 population estimate extract to Supabase review staging."""
from __future__ import annotations

import concurrent.futures
import gzip
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

SOURCE_ID = "tochno_bdmo_hmao_20260928"
INDICATOR_CODE = "8112027"
EXPECTED_ROWS = 901
EXPECTED_MUNICIPALITIES = {
    "beloyarsky-raion", "berezovsky-raion", "kogalym", "kondinsky-raion",
    "langepas", "megion", "nefteyugansk", "nefteyugansky-raion",
    "nizhnevartovsk", "nizhnevartovsky-raion", "nyagan-city",
    "october-raion", "pokachi", "pyt-yah", "raduzhny", "sovetsky-raion",
    "surgut", "surgutsky", "uray", "khanty-mansiysk",
    "khanty-mansiysky-raion", "ugorsk",
}
EXPECTED_ARCHIVE = (
    "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/"
    "data_bdmo_118_v20260928/regions/"
    "data_Y48112027_region71_112_v20260928.zip"
)
DIMENSION_FIELDS = (
    "mest", "mun_level", "mun_district", "mun_type", "mun_type_oktmo",
    "oktmo_stable", "oktmo_history", "oktmo_year_from", "oktmo_year_to",
    "indicator_code", "indicator_period", "indicator_unit", "comment",
)
BATCH_SIZE = int(os.getenv("STAGING_BATCH_SIZE", "100"))
WORKERS = int(os.getenv("STAGING_UPLOAD_WORKERS", "3"))

def fail(message: str) -> None:
    raise RuntimeError(message)

def numeric_value(raw_value: str):
    text = (raw_value or "").replace("\u00a0", "").replace(" ", "").replace(",", ".").strip()
    if not text:
        return None
    try:
        number = Decimal(text)
    except InvalidOperation:
        fail(f"Non-numeric source value: {raw_value!r}")
    if not number.is_finite():
        fail(f"Non-finite source value: {raw_value!r}")
    return float(number)

def make_payload(record: dict, retrieved_at: str) -> dict:
    attrs = record.get("attributes") or {}
    if str(record.get("source_indicator_code")) != INDICATOR_CODE:
        fail("Unexpected indicator code")
    if str(attrs.get("indicator_code", "")) != "Y48112027":
        fail(f"Unexpected source internal indicator code: {attrs.get('indicator_code')!r}")
    if str(attrs.get("region_id", "")) != "71":
        fail("Unexpected Rosstat region")
    if attrs.get("indicator_period") != "На 1 января":
        fail(f"Unexpected observation period: {attrs.get('indicator_period')!r}")
    if attrs.get("indicator_unit") != "Человек":
        fail(f"Unexpected measurement unit: {attrs.get('indicator_unit')!r}")
    municipality_id = record.get("municipality_id")
    if municipality_id not in EXPECTED_MUNICIPALITIES:
        fail(f"Unmapped municipality: {municipality_id!r}")
    oktmo = str(record.get("oktmo", "")).strip()
    if not oktmo or str(attrs.get("oktmo", "")).strip() != oktmo:
        fail("Missing or inconsistent OKTMO")
    if attrs.get("mest") not in {"Все население", "Городское население", "Сельское население"}:
        fail(f"Unexpected population category: {attrs.get('mest')!r}")
    year_text = str(record.get("year", "")).strip()
    if not year_text.isdigit() or not 2000 <= int(year_text) <= 2030:
        fail(f"Invalid observation year: {year_text!r}")
    row_hash = str(record.get("row_sha256", ""))
    if len(row_hash) != 64:
        fail("Invalid full-source-row SHA-256")
    raw_value = str(attrs.get("indicator_value", "") or "").strip()
    validation_errors = ["source_value_blank"] if not raw_value else []
    return {
        "source_id": SOURCE_ID,
        "source_record_key": f"{INDICATOR_CODE}:{row_hash}",
        "raw_record": {field: attrs.get(field) for field in DIMENSION_FIELDS if field in attrs},
        "raw_municipality_name": str(attrs.get("municipality", record.get("municipality_name", ""))),
        "raw_oktmo": oktmo,
        "raw_indicator_name": str(attrs.get("indicator_name", record.get("source_indicator_name", ""))),
        "raw_indicator_code": INDICATOR_CODE,
        "raw_year": int(year_text),
        "raw_period": str(attrs.get("indicator_period", "")),
        "raw_value": raw_value,
        "raw_unit": str(attrs.get("indicator_unit", "")),
        "mapped_municipality_id": municipality_id,
        "mapped_indicator_code": None,
        "normalized_value": numeric_value(raw_value),
        "normalized_unit": None,
        "normalized_period": None,
        "geographic_level": "municipality",
        "review_status": "pending",
        "validation_errors": validation_errors,
        "source_url_snapshot": str(record.get("source_archive", EXPECTED_ARCHIVE)),
        "source_published_at": "2026-09-28",
        "source_retrieved_at": retrieved_at,
    }

def post_json(url: str, api_key: str, rows, method: str = "POST") -> None:
    body = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public",
        "Prefer": "resolution=ignore-duplicates,return=minimal",
    }
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status not in (200, 201, 204):
                    fail(f"Unexpected Supabase HTTP status {response.status}")
                return
        except urllib.error.HTTPError as error:
            detail = error.read(3000).decode("utf-8", "replace")
            last_error = f"HTTP {error.code}: {detail}"
            if error.code not in (408, 425, 429, 500, 502, 503, 504):
                fail(last_error)
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = str(error)
        if attempt < 4:
            time.sleep(min(2 ** attempt, 20))
    fail(f"Supabase request failed after retries: {last_error}")

def upload_batch(base_url: str, api_key: str, rows: list[dict]) -> int:
    endpoint = (
        base_url.rstrip("/") + "/rest/v1/municipality_indicator_import_staging?"
        + urllib.parse.urlencode({"on_conflict": "source_id,source_record_key"})
    )
    post_json(endpoint, api_key, rows)
    return len(rows)

def main() -> int:
    data_dir = Path(os.getenv("DEMOGRAPHY_ADDITIONAL_EXTRACT_DIR", "demography-additional-extract"))
    summary_path = data_dir / "summary.json"
    source_path = data_dir / f"{INDICATOR_CODE}_hmao_rows.jsonl.gz"
    if not summary_path.exists() or not source_path.exists():
        fail("Missing additional extraction summary or 8112027 source file")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    item = next((x for x in summary.get("indicators", []) if x.get("indicator_code") == INDICATOR_CODE), None)
    if not item or item.get("status") != "extracted":
        fail("8112027 is not marked extracted in the source audit")
    if int(item.get("matched_rows", -1)) != EXPECTED_ROWS:
        fail(f"Expected {EXPECTED_ROWS} source rows, got {item.get('matched_rows')}")
    retrieved_at = datetime.now(timezone.utc).isoformat()
    prepared: list[dict] = []
    municipalities = set()
    by_category = Counter()
    by_year = Counter()
    with gzip.open(source_path, "rt", encoding="utf-8") as stream:
        for line_no, line in enumerate(stream, 1):
            if not line.strip():
                continue
            record = json.loads(line)
            payload = make_payload(record, retrieved_at)
            prepared.append(payload)
            municipalities.add(payload["mapped_municipality_id"])
            by_category[payload["raw_record"]["mest"]] += 1
            by_year[payload["raw_year"]] += 1
    if len(prepared) != EXPECTED_ROWS:
        fail(f"Prepared {len(prepared)} rows, expected {EXPECTED_ROWS}")
    if municipalities != EXPECTED_MUNICIPALITIES:
        fail(f"Municipality coverage mismatch: {sorted(municipalities)}")
    if min(by_year) != 2009 or max(by_year) != 2025:
        fail(f"Unexpected year coverage: {min(by_year)}-{max(by_year)}")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    if not api_key:
        fail("SUPABASE_SERVICE_ROLE_KEY is missing")
    if not base_url.startswith("https://") or BATCH_SIZE < 1 or WORKERS < 1:
        fail("Invalid Supabase URL or upload settings")

    endpoint_rows = base_url.rstrip("/") + "/rest/v1/municipality_indicator_import_staging"
    batches = [prepared[i:i+BATCH_SIZE] for i in range(0, len(prepared), BATCH_SIZE)]
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = [executor.submit(upload_batch, base_url, api_key, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as exc:
                errors.append(str(exc))
                for pending in futures:
                    pending.cancel()
                break
    if errors:
        fail("; ".join(errors))

    # The source stays partially imported until every indicator is mapped and reviewed.
    source_url = base_url.rstrip("/") + "/rest/v1/data_sources?" + urllib.parse.urlencode({"id": f"eq.{SOURCE_ID}"})
    post_json(source_url, api_key, {
        "import_status": "partially_imported",
        "last_checked_at": retrieved_at,
        "retrieved_at": retrieved_at,
        "updated_at": retrieved_at,
    }, method="PATCH")

    report = {
        "status": "submitted_to_review_staging",
        "source_id": SOURCE_ID,
        "indicator_code": INDICATOR_CODE,
        "submitted_rows": len(prepared),
        "municipalities": len(municipalities),
        "year_range": [min(by_year), max(by_year)],
        "rows_by_population_category": dict(by_category),
        "rows_by_year": dict(sorted(by_year.items())),
        "batches": len(batches),
        "batch_size": BATCH_SIZE,
        "workers": WORKERS,
        "retrieved_at": retrieved_at,
        "note": "All rows are pending manual review. Indicator mapping, normalized units and periods remain null. No analytical table was modified.",
    }
    (data_dir / "staging-upload-8112027-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
