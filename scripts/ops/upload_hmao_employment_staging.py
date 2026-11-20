#!/usr/bin/env python3
"""Upload extracted HMAO employment indicators to review-only staging."""
from __future__ import annotations

import concurrent.futures
import gzip
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

SOURCE_ID = "tochno_bdmo_hmao_20260928"
EXPECTED_CODES = {
    "8423001", "8423002", "8423003", "8423004",
    "8423005", "8423006", "8423007",
    "8423015", "8423016", "8423017",
}
BATCH_SIZE = int(os.getenv("STAGING_BATCH_SIZE", "100"))
WORKERS = int(os.getenv("STAGING_UPLOAD_WORKERS", "3"))

EXPECTED_MUNICIPALITIES = {
    "beloyarsky-raion", "berezovsky-raion", "kogalym", "kondinsky-raion",
    "langepas", "megion", "nefteyugansk", "nefteyugansky-raion",
    "nizhnevartovsk", "nizhnevartovsky-raion", "nyagan-city",
    "october-raion", "pokachi", "pyt-yah", "raduzhny", "sovetsky-raion",
    "surgut", "surgutsky", "uray", "khanty-mansiysk",
    "khanty-mansiysky-raion", "ugorsk",
}

def norm_header(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", "", str(value).strip().lower().replace("ё", "е"))

def find_value(attrs: dict, names: set[str]) -> str:
    for key, value in attrs.items():
        if norm_header(key) in names:
            return str(value or "").strip()
    return ""

def to_numeric(raw_value: str):
    raw = str(raw_value or "").replace("\u00a0", "").replace(" ", "").replace(",", ".").strip()
    if not raw:
        return None
    try:
        value = Decimal(raw)
    except InvalidOperation:
        return None
    return float(value) if value.is_finite() else None

def make_payload(record: dict, retrieved_at: str) -> dict:
    code = str(record.get("source_indicator_code", "")).strip()
    if code not in EXPECTED_CODES:
        raise RuntimeError(f"Unexpected indicator code: {code!r}")
    attrs = record.get("attributes") or {}
    oktmo = str(record.get("oktmo", "")).strip()
    if not oktmo or str(attrs.get("oktmo", "")).strip() not in {oktmo, oktmo + "000"}:
        # Some source exports expose OKTMO under a different header; validate
        # the project municipality and non-empty source OKTMO independently.
        if not oktmo:
            raise RuntimeError(f"Missing source OKTMO for {code}")
    municipality_id = str(record.get("municipality_id", "")).strip()
    if municipality_id not in EXPECTED_MUNICIPALITIES:
        raise RuntimeError(f"Unmapped project municipality: {municipality_id!r}")
    year_text = str(record.get("year", "")).strip()
    year = int(year_text) if year_text.isdigit() else None
    if year is None or not 1900 <= year <= 2200:
        raise RuntimeError(f"Invalid year in {code}: {year_text!r}")
    row_hash = str(record.get("row_sha256", "")).strip()
    if len(row_hash) != 64:
        raise RuntimeError("Invalid source row hash")

    raw_value = find_value(attrs, {
        "indicatorvalue", "значение", "значениепоказателя", "value", "значениеданных",
    })
    raw_unit = find_value(attrs, {
        "indicatorunit", "единицаизмерения", "unit", "единица",
    })
    raw_period = find_value(attrs, {
        "indicatorperiod", "период", "period", "отчетныйпериод",
    })
    validation_errors = []
    normalized = to_numeric(raw_value)
    if not raw_value:
        validation_errors.append("source_value_blank")
    elif normalized is None:
        validation_errors.append("source_value_not_numeric")

    raw_record = dict(attrs)
    raw_record["_source_member"] = str(record.get("source_member", ""))
    raw_record["_source_row_sha256"] = row_hash

    return {
        "source_id": SOURCE_ID,
        "source_record_key": f"employment:{code}:{row_hash}",
        "raw_record": raw_record,
        "raw_municipality_name": str(record.get("municipality_name", "")),
        "raw_oktmo": oktmo,
        "raw_indicator_name": str(record.get("source_indicator_name", "")),
        "raw_indicator_code": code,
        "raw_year": year,
        "raw_period": raw_period,
        "raw_value": raw_value,
        "raw_unit": raw_unit,
        "mapped_municipality_id": municipality_id,
        "mapped_indicator_code": None,
        "normalized_value": normalized,
        "normalized_unit": None,
        "normalized_period": None,
        "geographic_level": "municipality",
        "review_status": "pending",
        "validation_errors": validation_errors,
        "source_url_snapshot": str(record.get("source_archive", "")) + "#member=" + str(record.get("source_member", "")),
        "source_published_at": "2026-09-28",
        "source_retrieved_at": retrieved_at,
    }

def post_json(url: str, api_key: str, payload, method: str = "POST") -> None:
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
                    raise RuntimeError(f"Unexpected Supabase HTTP status {response.status}")
                return
        except urllib.error.HTTPError as exc:
            detail = exc.read(3000).decode("utf-8", "replace")
            last_error = f"HTTP {exc.code}: {detail}"
            if exc.code not in (408, 425, 429, 500, 502, 503, 504):
                raise RuntimeError(last_error)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = str(exc)
        if attempt < 4:
            time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Supabase request failed after retries: {last_error}")

def main() -> int:
    data_dir = Path(os.getenv("EMPLOYMENT_EXTRACT_DIR", "employment-2026-extract"))
    summary_path = data_dir / "summary.json"
    if not summary_path.exists():
        raise RuntimeError("Missing employment extraction summary")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True:
        raise RuntimeError("Employment extraction has no HMAO rows")
    items = {str(x.get("indicator_code")): x for x in summary.get("indicators", [])}
    if set(items) != EXPECTED_CODES:
        raise RuntimeError(f"Indicator manifest mismatch: {sorted(items)}")

    retrieved_at = datetime.now(timezone.utc).isoformat()
    prepared_dir = Path(tempfile.mkdtemp(prefix="yugra-employment-staging-"))
    totals = Counter()
    municipalities = {code: set() for code in EXPECTED_CODES}
    years = {code: [] for code in EXPECTED_CODES}
    blanks = Counter()
    non_numeric = Counter()
    prepared_files = []

    # Validate and compact rows before any network write.
    for code in sorted(EXPECTED_CODES):
        source_file = data_dir / f"{code}_region71_rows.jsonl.gz"
        expected_rows = int(items[code].get("matched_rows", 0))
        if not source_file.exists() or expected_rows == 0:
            continue
        target_file = prepared_dir / f"{code}_staging.jsonl.gz"
        with gzip.open(source_file, "rt", encoding="utf-8") as src, gzip.open(
            target_file, "wt", encoding="utf-8", compresslevel=6
        ) as dst:
            for line_no, line in enumerate(src, 1):
                if not line.strip():
                    continue
                record = json.loads(line)
                payload = make_payload(record, retrieved_at)
                dst.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                totals[code] += 1
                municipalities[code].add(payload["mapped_municipality_id"])
                years[code].append(payload["raw_year"])
                if not payload["raw_value"]:
                    blanks[code] += 1
                if "source_value_not_numeric" in payload["validation_errors"]:
                    non_numeric[code] += 1
        if totals[code] != expected_rows:
            raise RuntimeError(f"{code}: extracted {expected_rows}, prepared {totals[code]}")
        prepared_files.append(target_file)

    if not prepared_files:
        raise RuntimeError("No employment rows to upload")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    if not api_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    if not base_url.startswith("https://") or BATCH_SIZE < 1 or WORKERS < 1:
        raise RuntimeError("Invalid Supabase URL or upload settings")

    batches = []
    for path in prepared_files:
        with gzip.open(path, "rt", encoding="utf-8") as stream:
            batch = []
            for line in stream:
                if not line.strip():
                    continue
                batch.append(json.loads(line))
                if len(batch) >= BATCH_SIZE:
                    batches.append(batch)
                    batch = []
            if batch:
                batches.append(batch)

    endpoint = (
        base_url.rstrip("/") + "/rest/v1/municipality_indicator_import_staging?"
        + urllib.parse.urlencode({"on_conflict": "source_id,source_record_key"})
    )
    submitted = 0
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(post_json, endpoint, api_key, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
                # Each batch is counted by the number of records sent.
                # The batches list is retained for deterministic final totals.
            except Exception as exc:
                errors.append(str(exc))
                for pending in futures:
                    pending.cancel()
                break
    if errors:
        raise RuntimeError("; ".join(errors))
    submitted = sum(len(batch) for batch in batches)

    source_endpoint = (
        base_url.rstrip("/") + "/rest/v1/data_sources?"
        + urllib.parse.urlencode({"id": f"eq.{SOURCE_ID}"})
    )
    post_json(
        source_endpoint, api_key,
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
        "submitted_rows": submitted,
        "source_rows_by_indicator": dict(sorted(totals.items())),
        "rows_by_indicator_not_found_or_empty": [
            code for code in sorted(EXPECTED_CODES) if totals[code] == 0
        ],
        "municipalities_by_indicator": {
            code: len(municipalities[code]) for code in sorted(EXPECTED_CODES) if totals[code]
        },
        "years_by_indicator": {
            code: [min(years[code]), max(years[code])]
            for code in sorted(EXPECTED_CODES) if years[code]
        },
        "blank_values_by_indicator": dict(sorted(blanks.items())),
        "non_numeric_values_by_indicator": dict(sorted(non_numeric.items())),
        "pending_review": True,
        "mapped_indicator_code": None,
        "normalized_unit": None,
        "normalized_period": None,
        "batch_size": BATCH_SIZE,
        "workers": WORKERS,
        "retrieved_at": retrieved_at,
        "note": "Rows remain pending review; no analytical table was modified.",
    }
    (data_dir / "staging-upload-employment-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
