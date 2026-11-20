#!/usr/bin/env python3
"""Upload extracted 8112001/2003/2004/2007/2008/2009 rows to review staging."""
from __future__ import annotations

import concurrent.futures
import gzip
import json
import os
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
CODES = {"8112001", "8112003", "8112004", "8112007", "8112008", "8112009"}
EXPECTED_MUNICIPALITIES = {
    "beloyarsky-raion", "berezovsky-raion", "kogalym", "kondinsky-raion",
    "langepas", "megion", "nefteyugansk", "nefteyugansky-raion",
    "nizhnevartovsk", "nizhnevartovsky-raion", "nyagan-city",
    "october-raion", "pokachi", "pyt-yah", "raduzhny", "sovetsky-raion",
    "surgut", "surgutsky", "uray", "khanty-mansiysk",
    "khanty-mansiysky-raion", "ugorsk",
}
BATCH_SIZE = int(os.getenv("STAGING_BATCH_SIZE", "100"))
WORKERS = int(os.getenv("STAGING_UPLOAD_WORKERS", "3"))

def norm_header(value: str) -> str:
    import re
    return re.sub(r"[^a-zа-яё0-9]+", "", str(value).strip().lower().replace("ё", "е"))

def find_value(attrs: dict, names: set[str]) -> str:
    for key, value in attrs.items():
        if norm_header(key) in names:
            return str(value or "").strip()
    return ""

def numeric_value(raw_value: str):
    text = (raw_value or "").replace("\u00a0", "").replace(" ", "").replace(",", ".").strip()
    if not text:
        return None
    try:
        result = Decimal(text)
    except InvalidOperation:
        raise RuntimeError(f"Non-numeric source value: {raw_value!r}")
    if not result.is_finite():
        raise RuntimeError(f"Non-finite source value: {raw_value!r}")
    return float(result)

def make_payload(record: dict, retrieved_at: str) -> dict:
    code = str(record.get("source_indicator_code", ""))
    if code not in CODES:
        raise RuntimeError(f"Unexpected indicator code: {code!r}")
    attrs = record.get("attributes") or {}
    region = find_value(attrs, {"regionid", "region", "kodregiona", "regioncode"})
    if "".join(c for c in region if c.isdigit()) != "71":
        raise RuntimeError(f"Wrong region for {code}: {region!r}")
    oktmo = str(record.get("oktmo", "")).strip()
    if not oktmo or str(attrs.get("oktmo", "")).strip() != oktmo:
        raise RuntimeError(f"Missing or inconsistent OKTMO in {code}")
    municipality_id = record.get("municipality_id")
    if municipality_id not in EXPECTED_MUNICIPALITIES:
        raise RuntimeError(f"Unmapped project municipality: {municipality_id!r}")
    year_text = str(record.get("year", "")).strip()
    if not year_text.isdigit() or not 1900 <= int(year_text) <= 2200:
        raise RuntimeError(f"Invalid year in {code}: {year_text!r}")
    row_hash = str(record.get("row_sha256", ""))
    if len(row_hash) != 64:
        raise RuntimeError("Invalid source row hash")

    raw_value = find_value(attrs, {"indicatorvalue", "значение", "value"})
    raw_unit = find_value(attrs, {"indicatorunit", "единицаизмерения", "unit"})
    raw_period = find_value(attrs, {"indicatorperiod", "период", "period"})
    validation_errors = ["source_value_blank"] if not raw_value else []
    raw_record = dict(attrs)
    raw_record["_source_member"] = str(record.get("source_member", ""))

    return {
        "source_id": SOURCE_ID,
        "source_record_key": f"{code}:{row_hash}",
        "raw_record": raw_record,
        "raw_municipality_name": str(record.get("municipality_name", "")),
        "raw_oktmo": oktmo,
        "raw_indicator_name": str(record.get("source_indicator_name", "")),
        "raw_indicator_code": code,
        "raw_year": int(year_text),
        "raw_period": raw_period,
        "raw_value": raw_value,
        "raw_unit": raw_unit,
        "mapped_municipality_id": municipality_id,
        "mapped_indicator_code": None,
        "normalized_value": numeric_value(raw_value),
        "normalized_unit": None,
        "normalized_period": None,
        "geographic_level": "municipality",
        "review_status": "pending",
        "validation_errors": validation_errors,
        "source_url_snapshot": str(record.get("source_archive", "")) + "#member=" + str(record.get("source_member", "")),
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
                    raise RuntimeError(f"Unexpected Supabase HTTP status {response.status}")
                return
        except urllib.error.HTTPError as error:
            detail = error.read(3000).decode("utf-8", "replace")
            last_error = f"HTTP {error.code}: {detail}"
            if error.code not in (408, 425, 429, 500, 502, 503, 504):
                raise RuntimeError(last_error)
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = str(error)
        if attempt < 4:
            time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Supabase request failed after retries: {last_error}")

def upload_batch(base_url: str, api_key: str, batch: list[dict]) -> int:
    endpoint = (
        base_url.rstrip("/") + "/rest/v1/municipality_indicator_import_staging?"
        + urllib.parse.urlencode({"on_conflict": "source_id,source_record_key"})
    )
    post_json(endpoint, api_key, batch)
    return len(batch)

def main() -> int:
    data_dir = Path(os.getenv("DEMOGRAPHY_CORE_EXTRACT_DIR", "demography-core-2026-extract"))
    summary_path = data_dir / "summary.json"
    if not summary_path.exists():
        raise RuntimeError("Missing core demography extraction summary")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True:
        raise RuntimeError("Core extraction is not marked ok")
    items = {str(x.get("indicator_code")): x for x in summary.get("indicators", [])}
    if set(items) != CODES:
        raise RuntimeError(f"Indicator list mismatch in report: {sorted(items)}")
    retrieved_at = datetime.now(timezone.utc).isoformat()

    prepared_dir = Path(tempfile.mkdtemp(prefix="yugra-core-staging-"))
    totals = Counter()
    municipalities = {code: set() for code in CODES}
    year_ranges = {code: [] for code in CODES}
    blanks = Counter()
    for code in sorted(CODES):
        source_file = data_dir / f"{code}_region71_rows.jsonl.gz"
        if not source_file.exists():
            raise RuntimeError(f"Missing extracted source rows: {source_file}")
        target_file = prepared_dir / f"{code}_staging.jsonl.gz"
        with gzip.open(source_file, "rt", encoding="utf-8") as src, gzip.open(target_file, "wt", encoding="utf-8", compresslevel=6) as dst:
            for line_no, line in enumerate(src, 1):
                if not line.strip():
                    continue
                record = json.loads(line)
                payload = make_payload(record, retrieved_at)
                dst.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                totals[code] += 1
                municipalities[code].add(payload["mapped_municipality_id"])
                year_ranges[code].append(payload["raw_year"])
                if payload["normalized_value"] is None:
                    blanks[code] += 1
        expected = int(items[code].get("matched_rows", -1))
        if expected != totals[code]:
            raise RuntimeError(f"{code}: summary says {expected}, prepared {totals[code]}")
        if totals[code] == 0:
            raise RuntimeError(f"{code}: zero Yugra observations; refuse upload")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    if not api_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    if not base_url.startswith("https://") or BATCH_SIZE < 1 or WORKERS < 1:
        raise RuntimeError("Invalid Supabase URL or upload settings")

    batches = []
    for code in sorted(CODES):
        with gzip.open(prepared_dir / f"{code}_staging.jsonl.gz", "rt", encoding="utf-8") as stream:
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

    submitted = 0
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(upload_batch, base_url, api_key, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            try:
                submitted += future.result()
            except Exception as exc:
                errors.append(str(exc))
                for pending in futures:
                    pending.cancel()
                break
    if errors:
        raise RuntimeError("; ".join(errors))

    # Source remains partially imported until all indicators are mapped and manually accepted.
    source_endpoint = (
        base_url.rstrip("/") + "/rest/v1/data_sources?"
        + urllib.parse.urlencode({"id": f"eq.{SOURCE_ID}"})
    )
    post_json(source_endpoint, api_key, {
        "import_status": "partially_imported",
        "last_checked_at": retrieved_at,
        "retrieved_at": retrieved_at,
        "updated_at": retrieved_at,
    }, method="PATCH")

    report = {
        "status": "submitted_to_review_staging",
        "source_id": SOURCE_ID,
        "source_rows_by_indicator": dict(sorted(totals.items())),
        "submitted_rows": submitted,
        "municipalities_by_indicator": {code: len(municipalities[code]) for code in sorted(CODES)},
        "years_by_indicator": {
            code: [min(year_ranges[code]), max(year_ranges[code])]
            for code in sorted(CODES)
        },
        "blank_values_by_indicator": dict(sorted(blanks.items())),
        "pending_review": True,
        "mapped_indicator_code": None,
        "normalized_unit": None,
        "normalized_period": None,
        "batch_size": BATCH_SIZE,
        "workers": WORKERS,
        "retrieved_at": retrieved_at,
        "note": "Rows are pending manual review; no analytical table was modified.",
    }
    (data_dir / "staging-upload-core-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
