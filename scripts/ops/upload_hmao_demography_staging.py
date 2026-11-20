#!/usr/bin/env python3
"""Upload filtered HMAO BDPMO rows to Supabase review staging only.

All rows remain pending. Indicator codes are intentionally not mapped to the
project analytical dictionary; no row is accepted or written to analytics.
"""
from __future__ import annotations

import concurrent.futures
import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

SOURCE_ID = "tochno_bdmo_hmao_20260928"
SOURCE_PUBLISHED_AT = "2026-09-28"
EXPECTED_CODES = {"8112014", "8112015", "8112016", "8112021", "8112022", "8112023"}
EXPECTED_MUNICIPALITIES = {
    "beloyarsky-raion", "berezovsky-raion", "kogalym", "kondinsky-raion",
    "langepas", "megion", "nefteyugansk", "nefteyugansky-raion",
    "nizhnevartovsk", "nizhnevartovsky-raion", "nyagan-city",
    "october-raion", "pokachi", "pyt-yah", "raduzhny", "sovetsky-raion",
    "surgut", "surgutsky", "uray", "khanty-mansiysk",
    "khanty-mansiysky-raion", "ugorsk",
}
BATCH_SIZE = int(os.getenv("STAGING_BATCH_SIZE", "500"))
WORKERS = int(os.getenv("STAGING_UPLOAD_WORKERS", "6"))
MAX_PENDING = max(WORKERS * 3, WORKERS)

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
    code = str(record.get("source_indicator_code", ""))
    if code not in EXPECTED_CODES:
        fail(f"Unexpected indicator code: {code!r}")
    attributes = record.get("attributes") or {}
    municipality_id = record.get("municipality_id")
    if municipality_id not in EXPECTED_MUNICIPALITIES:
        fail(f"Unmapped project municipality: {municipality_id!r}")
    if str(attributes.get("region_id", "")) != "71":
        fail(f"Unexpected Rosstat region code for {record.get('row_sha256')}")
    oktmo = str(record.get("oktmo", "")).strip()
    if not oktmo or str(attributes.get("oktmo", "")).strip() != oktmo:
        fail(f"Missing or inconsistent OKTMO for {record.get('row_sha256')}")
    row_hash = str(record.get("row_sha256", ""))
    if len(row_hash) != 64:
        fail(f"Invalid source row hash: {row_hash!r}")

    raw_value = str(attributes.get("indicator_value", "") or "").strip()
    validation_errors = ["source_value_blank"] if not raw_value else []
    year_text = str(record.get("year", "")).strip()
    if not year_text.isdigit():
        fail(f"Invalid reference year: {year_text!r}")
    year = int(year_text)
    if year < 1900 or year > 2200:
        fail(f"Out-of-range reference year: {year}")

    return {
        "source_id": SOURCE_ID,
        "source_record_key": f"{code}:{row_hash}",
        "raw_record": record,
        "raw_municipality_name": str(attributes.get("municipality", record.get("municipality_name", ""))),
        "raw_oktmo": oktmo,
        "raw_indicator_name": str(record.get("source_indicator_name", "")),
        "raw_indicator_code": code,
        "raw_year": year,
        "raw_period": str(attributes.get("indicator_period", "") or ""),
        "raw_value": raw_value,
        "raw_unit": str(attributes.get("indicator_unit", "") or ""),
        "mapped_municipality_id": municipality_id,
        # Deliberately left blank: the source code is not yet reconciled with
        # the project's analytical indicator dictionary.
        "mapped_indicator_code": None,
        "normalized_value": numeric_value(raw_value),
        # Unit and period normalization wait for manual semantic review.
        "normalized_unit": None,
        "normalized_period": None,
        "geographic_level": "municipality",
        "review_status": "pending",
        "validation_errors": validation_errors,
        "source_url_snapshot": str(record.get("source_archive", "")),
        "source_published_at": SOURCE_PUBLISHED_AT,
        "source_retrieved_at": retrieved_at,
    }

def post_json(url: str, api_key: str, payload: list[dict] | dict, method: str = "POST") -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
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
            detail = error.read(4000).decode("utf-8", "replace")
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
        base_url.rstrip("/")
        + "/rest/v1/municipality_indicator_import_staging"
        + "?"
        + urllib.parse.urlencode({"on_conflict": "source_id,source_record_key"})
    )
    post_json(endpoint, api_key, rows)
    return len(rows)

def iter_payloads(data_dir: Path, retrieved_at: str):
    files = sorted(data_dir.glob("*_hmao_rows.jsonl.gz"))
    if len(files) != len(EXPECTED_CODES):
        fail(f"Expected {len(EXPECTED_CODES)} indicator files, found {len(files)}")
    seen_codes = set()
    total = 0
    for file_path in files:
        batch = []
        with gzip.open(file_path, "rt", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                if not line.strip():
                    continue
                record = json.loads(line)
                payload = make_payload(record, retrieved_at)
                seen_codes.add(payload["raw_indicator_code"])
                batch.append(payload)
                total += 1
                if len(batch) >= BATCH_SIZE:
                    yield file_path.name, batch
                    batch = []
        if batch:
            yield file_path.name, batch
    if seen_codes != EXPECTED_CODES:
        fail(f"Indicator file coverage mismatch: found {sorted(seen_codes)}")

def main() -> int:
    data_dir = Path(os.getenv("DEMOGRAPHY_EXTRACT_DIR", "demography-extract"))
    summary_path = data_dir / "summary.json"
    if not summary_path.exists():
        fail(f"Missing extraction summary: {summary_path}")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True:
        fail("Extraction summary is not marked ok")
    indicator_summaries = summary.get("indicators") or []
    codes_in_summary = {str(item.get("indicator_code")) for item in indicator_summaries}
    if codes_in_summary != EXPECTED_CODES:
        fail(f"Extraction summary indicator mismatch: {sorted(codes_in_summary)}")
    expected_rows = sum(int(item.get("matched_rows", 0)) for item in indicator_summaries)
    if expected_rows != int(summary.get("total_rows", -1)):
        fail("Extraction summary total_rows does not match the indicator subtotals")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    report_path = data_dir / "staging-upload-report.json"
    retrieved_at = datetime.now(timezone.utc).isoformat()

    # Without the secret the extraction artifact remains available and no
    # database request is attempted. This is an intentional safe no-op.
    if not api_key:
        report = {
            "status": "not_uploaded_missing_secret",
            "source_id": SOURCE_ID,
            "expected_rows": expected_rows,
            "message": "Set the GitHub Actions secret SUPABASE_SERVICE_ROLE_KEY to enable the staging upload.",
            "generated_at": retrieved_at,
        }
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print("::warning::SUPABASE_SERVICE_ROLE_KEY is not configured; data remains in the GitHub artifact and was not uploaded.")
        print(json.dumps(report, ensure_ascii=False))
        return 0

    if not base_url.startswith("https://"):
        fail("SUPABASE_URL must use HTTPS")
    if BATCH_SIZE < 1 or WORKERS < 1:
        fail("STAGING_BATCH_SIZE and STAGING_UPLOAD_WORKERS must be positive")

    submitted_rows = 0
    batch_count = 0
    pending: set[concurrent.futures.Future] = set()
    errors = []
    print(f"Submitting {expected_rows} review-only rows in batches of {BATCH_SIZE}...", flush=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        for filename, batch in iter_payloads(data_dir, retrieved_at):
            future = executor.submit(upload_batch, base_url, api_key, batch)
            pending.add(future)
            batch_count += 1
            submitted_rows += len(batch)
            if len(pending) >= MAX_PENDING:
                done, pending = concurrent.futures.wait(
                    pending, return_when=concurrent.futures.FIRST_COMPLETED
                )
                for completed in done:
                    try:
                        completed.result()
                    except Exception as error:
                        errors.append(str(error))
                        for future in pending:
                            future.cancel()
                        fail("; ".join(errors))
            if batch_count % 100 == 0:
                print(f"Submitted {submitted_rows}/{expected_rows} rows ({batch_count} batches)...", flush=True)

        for completed in concurrent.futures.as_completed(pending):
            try:
                completed.result()
            except Exception as error:
                errors.append(str(error))
        if errors:
            fail("; ".join(errors))

    if submitted_rows != expected_rows:
        fail(f"Submitted {submitted_rows} rows, expected {expected_rows}")

    # Mark the source as partially imported into the review staging layer.
    # It remains unverified and is not promoted into municipality_indicators.
    source_url = (
        base_url.rstrip("/")
        + "/rest/v1/data_sources?"
        + urllib.parse.urlencode({"id": f"eq.{SOURCE_ID}"})
    )
    post_json(
        source_url,
        api_key,
        {
            "import_status": "partially_imported",
            "last_checked_at": retrieved_at,
            "retrieved_at": retrieved_at,
            "updated_at": retrieved_at,
        },
        method="PATCH",
    )

    report = {
        "status": "submitted_to_review_staging",
        "source_id": SOURCE_ID,
        "expected_rows": expected_rows,
        "submitted_rows": submitted_rows,
        "batches": batch_count,
        "workers": WORKERS,
        "batch_size": BATCH_SIZE,
        "retrieved_at": retrieved_at,
        "note": "Rows use review_status=pending; mapped_indicator_code, normalized_unit and normalized_period remain null. No analytics table was modified.",
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
