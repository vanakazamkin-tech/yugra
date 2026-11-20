#!/usr/bin/env python3
"""Upload review-only HMAO BDPMO rows to Supabase staging.

Population indicators retain every age/sex observation. Migration indicators
are reduced to the overall total per municipality and year. Original source
rows remain reproducible from the linked public archive; raw_record stores the
disaggregation fields needed to interpret each observation plus a row hash.
No row is accepted or written to the analytical table.
"""
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
SOURCE_PUBLISHED_AT = "2026-09-28"
EXPECTED_SOURCE_COUNTS = {
    "8112014": 94352,
    "8112015": 88961,
    "8112016": 40920,
    "8112021": 116083,
    "8112022": 110632,
    "8112023": 119363,
}
EXPECTED_STAGED_COUNTS = {
    "8112014": 94352,
    "8112015": 88961,
    "8112016": 40920,
    "8112021": 308,
    "8112022": 308,
    "8112023": 308,
}
EXPECTED_MUNICIPALITIES = {
    "beloyarsky-raion", "berezovsky-raion", "kogalym", "kondinsky-raion",
    "langepas", "megion", "nefteyugansk", "nefteyugansky-raion",
    "nizhnevartovsk", "nizhnevartovsky-raion", "nyagan-city",
    "october-raion", "pokachi", "pyt-yah", "raduzhny", "sovetsky-raion",
    "surgut", "surgutsky", "uray", "khanty-mansiysk",
    "khanty-mansiysky-raion", "ugorsk",
}
MIGRATION_CODES = {"8112021", "8112022", "8112023"}
DIMENSION_FIELDS = (
    "grup_2", "vozr", "migr", "comment", "mun_level", "mun_type",
    "mun_type_oktmo", "oktmo_stable", "oktmo_history",
    "oktmo_year_from", "oktmo_year_to", "indicator_code",
)
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


def should_include(code: str, attributes: dict) -> bool:
    if code not in MIGRATION_CODES:
        # These files are explicitly about age and sex; retain their full
        # original cross-sections, including broad age bands and all sexes.
        return True
    # The requested arrival/departure/migration-growth series are total counts,
    # not all migration-type, age and sex cross-sections.
    return (
        attributes.get("migr") == "Миграция — всего"
        and attributes.get("grup_2") == "Всего"
        and attributes.get("vozr") == "Всего"
    )


def make_payload(record: dict, retrieved_at: str) -> dict:
    code = str(record.get("source_indicator_code", ""))
    if code not in EXPECTED_STAGED_COUNTS:
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
        # Full source row can be reconstructed from source_url_snapshot and
        # row hash. Keep the independent dimensions in JSONB, avoiding repeated
        # region and catalogue text on every one of >225k rows.
        "raw_record": {field: attributes.get(field) for field in DIMENSION_FIELDS if field in attributes},
        "raw_municipality_name": str(attributes.get("municipality", record.get("municipality_name", ""))),
        "raw_oktmo": oktmo,
        "raw_indicator_name": str(record.get("source_indicator_name", "")),
        "raw_indicator_code": code,
        "raw_year": year,
        "raw_period": str(attributes.get("indicator_period", "") or ""),
        "raw_value": raw_value,
        "raw_unit": str(attributes.get("indicator_unit", "") or ""),
        "mapped_municipality_id": municipality_id,
        # Indicator dictionary mapping and normalized period/unit are
        # deliberately left for a separate manual validation step.
        "mapped_indicator_code": None,
        "normalized_value": numeric_value(raw_value),
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


def prepare_payload_files(data_dir: Path, target_dir: Path, retrieved_at: str, source_counts: dict) -> dict:
    source_files = sorted(data_dir.glob("*_hmao_rows.jsonl.gz"))
    if len(source_files) != len(EXPECTED_SOURCE_COUNTS):
        fail(f"Expected {len(EXPECTED_SOURCE_COUNTS)} indicator files, found {len(source_files)}")

    actual_source_counts = Counter()
    staged_counts = Counter()
    seen_codes = set()

    for source_file in source_files:
        code = source_file.name.split("_", 1)[0]
        if code not in EXPECTED_SOURCE_COUNTS:
            fail(f"Unexpected source file: {source_file.name}")
        seen_codes.add(code)
        target_file = target_dir / f"{code}_staging.jsonl.gz"
        with gzip.open(source_file, "rt", encoding="utf-8") as source, gzip.open(
            target_file, "wt", encoding="utf-8", compresslevel=6
        ) as target:
            for line_number, line in enumerate(source, 1):
                if not line.strip():
                    continue
                record = json.loads(line)
                actual_source_counts[code] += 1
                attributes = record.get("attributes") or {}
                if str(record.get("source_indicator_code")) != code:
                    fail(f"{source_file.name}:{line_number}: indicator code mismatch")
                if not should_include(code, attributes):
                    continue
                payload = make_payload(record, retrieved_at)
                target.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                staged_counts[code] += 1

    if seen_codes != set(EXPECTED_SOURCE_COUNTS):
        fail(f"Missing source files: {sorted(set(EXPECTED_SOURCE_COUNTS) - seen_codes)}")
    if dict(actual_source_counts) != EXPECTED_SOURCE_COUNTS:
        fail(f"Source row counts changed: expected {EXPECTED_SOURCE_COUNTS}, got {dict(actual_source_counts)}")
    if dict(staged_counts) != EXPECTED_STAGED_COUNTS:
        fail(f"Review selection count mismatch: expected {EXPECTED_STAGED_COUNTS}, got {dict(staged_counts)}")
    for item in source_counts:
        code = str(item.get("indicator_code"))
        if int(item.get("matched_rows", -1)) != actual_source_counts[code]:
            fail(f"Summary and extracted file disagree for {code}")

    return {
        "source_rows": dict(sorted(actual_source_counts.items())),
        "staged_rows": dict(sorted(staged_counts.items())),
        "total_source_rows": sum(actual_source_counts.values()),
        "total_staged_rows": sum(staged_counts.values()),
    }


def upload_payload_files(target_dir: Path, base_url: str, api_key: str) -> tuple[int, int]:
    submitted_rows = 0
    batch_count = 0
    pending: set[concurrent.futures.Future] = set()
    errors = []

    def submit_batch(executor, batch):
        nonlocal submitted_rows, batch_count
        pending.add(executor.submit(upload_batch, base_url, api_key, batch))
        submitted_rows += len(batch)
        batch_count += 1
        if len(pending) >= MAX_PENDING:
            done, not_done = concurrent.futures.wait(
                pending, return_when=concurrent.futures.FIRST_COMPLETED
            )
            pending.clear()
            pending.update(not_done)
            for completed in done:
                try:
                    completed.result()
                except Exception as error:
                    errors.append(str(error))
            if errors:
                for future in pending:
                    future.cancel()
                fail("; ".join(errors))

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        for file_path in sorted(target_dir.glob("*_staging.jsonl.gz")):
            batch = []
            with gzip.open(file_path, "rt", encoding="utf-8") as stream:
                for line in stream:
                    if not line.strip():
                        continue
                    batch.append(json.loads(line))
                    if len(batch) >= BATCH_SIZE:
                        submit_batch(executor, batch)
                        batch = []
            if batch:
                submit_batch(executor, batch)

        for completed in concurrent.futures.as_completed(pending):
            try:
                completed.result()
            except Exception as error:
                errors.append(str(error))
    if errors:
        fail("; ".join(errors))
    return submitted_rows, batch_count


def main() -> int:
    data_dir = Path(os.getenv("DEMOGRAPHY_EXTRACT_DIR", "demography-extract"))
    summary_path = data_dir / "summary.json"
    if not summary_path.exists():
        fail(f"Missing extraction summary: {summary_path}")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True:
        fail("Extraction summary is not marked ok")
    source_counts = summary.get("indicators") or []
    codes_in_summary = {str(item.get("indicator_code")) for item in source_counts}
    if codes_in_summary != set(EXPECTED_SOURCE_COUNTS):
        fail(f"Extraction summary indicator mismatch: {sorted(codes_in_summary)}")
    expected_source_rows = sum(int(item.get("matched_rows", 0)) for item in source_counts)
    if expected_source_rows != int(summary.get("total_rows", -1)):
        fail("Extraction summary total_rows does not match the indicator subtotals")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    report_path = data_dir / "staging-upload-report.json"
    retrieved_at = datetime.now(timezone.utc).isoformat()

    staged_expected = sum(EXPECTED_STAGED_COUNTS.values())
    if not api_key:
        report = {
            "status": "not_uploaded_missing_secret",
            "source_id": SOURCE_ID,
            "source_rows": expected_source_rows,
            "planned_staging_rows": staged_expected,
            "selection": "all age/sex slices for 8112014-8112016; overall total only for 8112021-8112023 (migr=Миграция — всего, sex=Всего, age=Всего)",
            "message": "Set the GitHub Actions secret SUPABASE_SERVICE_ROLE_KEY, then run this workflow manually.",
            "generated_at": retrieved_at,
        }
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print("::warning::SUPABASE_SERVICE_ROLE_KEY is not configured; no database request was attempted.")
        print(json.dumps(report, ensure_ascii=False))
        return 0

    if not base_url.startswith("https://"):
        fail("SUPABASE_URL must use HTTPS")
    if BATCH_SIZE < 1 or WORKERS < 1:
        fail("STAGING_BATCH_SIZE and STAGING_UPLOAD_WORKERS must be positive")

    with tempfile.TemporaryDirectory(prefix="yugra-hmao-staging-") as temporary_dir:
        target_dir = Path(temporary_dir)
        preflight = prepare_payload_files(data_dir, target_dir, retrieved_at, source_counts)
        print(json.dumps({"preflight": preflight}, ensure_ascii=False), flush=True)
        if preflight["total_staged_rows"] != staged_expected:
            fail("Prepared row count differs from the independently specified review selection")

        submitted_rows, batches = upload_payload_files(target_dir, base_url, api_key)
        if submitted_rows != staged_expected:
            fail(f"Submitted {submitted_rows} rows, expected {staged_expected}")

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
        "source_rows": expected_source_rows,
        "submitted_rows": submitted_rows,
        "staged_rows_by_indicator": EXPECTED_STAGED_COUNTS,
        "batches": batches,
        "workers": WORKERS,
        "batch_size": BATCH_SIZE,
        "retrieved_at": retrieved_at,
        "selection": "all age/sex slices for 8112014-8112016; overall total only for 8112021-8112023",
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
