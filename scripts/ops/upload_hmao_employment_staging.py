#!/usr/bin/env python3
"""Upload employment raw source rows to Supabase review staging."""
from __future__ import annotations

import concurrent.futures, gzip, json, os, re, sys, tempfile, time
import urllib.error, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

SOURCE_ID = "tochno_bdmo_hmao_20260928"
SOURCE_CODES = {
    "1134431020014", "1134431020016",
    "1121100010003", "2152320020022", "2211110020001",
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
    text = str(raw_value or "").replace("\u00a0", "").replace(" ", "").replace(",", ".").strip()
    if not text: return None
    try: value = Decimal(text)
    except InvalidOperation: return None
    return float(value) if value.is_finite() else None

def make_payload(record: dict, retrieved_at: str) -> dict:
    code = str(record.get("source_indicator_code", "")).strip()
    if code not in SOURCE_CODES: raise RuntimeError(f"Unexpected source code {code!r}")
    attrs = record.get("attributes") or {}
    oktmo = str(record.get("oktmo", "")).strip()
    municipality_id = str(record.get("municipality_id", "")).strip()
    if not oktmo or municipality_id not in EXPECTED_MUNICIPALITIES:
        raise RuntimeError(f"Invalid OKTMO/municipality for {code}: {oktmo}/{municipality_id}")
    year_text = str(record.get("year", "")).strip()
    year = int(year_text) if year_text.isdigit() else None
    if year is None or not 1900 <= year <= 2200:
        raise RuntimeError(f"Invalid/missing year in {code}: {year_text!r}")
    digest = str(record.get("row_sha256", "")).strip()
    if len(digest) != 64: raise RuntimeError("Invalid source row hash")
    raw_value = find_value(attrs, {
        "indicatorvalue", "значение", "значениепоказателя", "value", "значениеданных",
    })
    raw_unit = find_value(attrs, {
        "indicatorunit", "единицаизмерения", "unit", "единица",
    })
    raw_period = find_value(attrs, {
        "indicatorperiod", "период", "period", "отчетныйпериод",
    })
    numeric = to_numeric(raw_value)
    errors = []
    if not raw_value: errors.append("source_value_blank")
    elif numeric is None: errors.append("source_value_not_numeric")

    raw_record = dict(attrs)
    raw_record["_source_member"] = str(record.get("source_member", ""))
    raw_record["_source_row_sha256"] = digest
    raw_record["_candidate_bdmo_indicator_codes"] = record.get("candidate_bdmo_indicator_codes", [])

    return {
        "source_id": SOURCE_ID,
        "source_record_key": f"employment-source:{code}:{digest}",
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
        "normalized_value": numeric,
        "normalized_unit": None,
        "normalized_period": None,
        "geographic_level": "municipality",
        "review_status": "pending",
        "validation_errors": errors,
        "source_url_snapshot": str(record.get("source_archive", "")) + "#member=" + str(record.get("source_member", "")),
        "source_published_at": "2026-09-28",
        "source_retrieved_at": retrieved_at,
    }

def post_json(url: str, api_key: str, payload, method: str = "POST") -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers={
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public",
        "Prefer": "resolution=ignore-duplicates,return=minimal",
    }, method=method)
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status not in (200, 201, 204):
                    raise RuntimeError(f"Unexpected Supabase HTTP {response.status}")
                return
        except urllib.error.HTTPError as exc:
            detail = exc.read(3000).decode("utf-8", "replace")
            last_error = f"HTTP {exc.code}: {detail}"
            if exc.code not in (408, 425, 429, 500, 502, 503, 504):
                raise RuntimeError(last_error)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = str(exc)
        if attempt < 4: time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Supabase request failed: {last_error}")

def main() -> int:
    data_dir = Path(os.getenv("EMPLOYMENT_EXTRACT_DIR", "employment-2026-extract"))
    summary_path = data_dir / "summary.json"
    if not summary_path.exists(): raise RuntimeError("Missing employment extraction summary")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True: raise RuntimeError("No HMAO employment data extracted")
    items = {str(x.get("source_indicator_code")): x for x in summary.get("indicators", [])}
    if set(items) != SOURCE_CODES: raise RuntimeError(f"Source series manifest mismatch: {sorted(items)}")

    retrieved_at = datetime.now(timezone.utc).isoformat()
    prepared_dir = Path(tempfile.mkdtemp(prefix="yugra-employment-staging-"))
    totals, municipalities, years = Counter(), {c: set() for c in SOURCE_CODES}, {c: [] for c in SOURCE_CODES}
    blanks, non_numeric = Counter(), Counter()
    prepared = []
    for code in sorted(SOURCE_CODES):
        source_file = data_dir / f"{code}_region71_rows.jsonl.gz"
        expected = int(items[code].get("matched_rows", 0))
        if not expected or not source_file.exists(): continue
        target = prepared_dir / f"{code}_staging.jsonl.gz"
        with gzip.open(source_file, "rt", encoding="utf-8") as src, gzip.open(
            target, "wt", encoding="utf-8", compresslevel=6
        ) as dst:
            for line in src:
                if not line.strip(): continue
                payload = make_payload(json.loads(line), retrieved_at)
                dst.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                totals[code] += 1
                municipalities[code].add(payload["mapped_municipality_id"])
                years[code].append(payload["raw_year"])
                if not payload["raw_value"]: blanks[code] += 1
                if "source_value_not_numeric" in payload["validation_errors"]: non_numeric[code] += 1
        if totals[code] != expected: raise RuntimeError(f"{code}: summary {expected}, prepared {totals[code]}")
        prepared.append(target)
    if not prepared: raise RuntimeError("No employment rows to upload")

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    if not api_key: raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    if not base_url.startswith("https://") or BATCH_SIZE < 1 or WORKERS < 1:
        raise RuntimeError("Invalid Supabase URL or upload settings")

    batches = []
    for path in prepared:
        with gzip.open(path, "rt", encoding="utf-8") as stream:
            batch = []
            for line in stream:
                if not line.strip(): continue
                batch.append(json.loads(line))
                if len(batch) >= BATCH_SIZE: batches.append(batch); batch = []
            if batch: batches.append(batch)

    endpoint = (
        base_url.rstrip("/") + "/rest/v1/municipality_indicator_import_staging?"
        + urllib.parse.urlencode({"on_conflict": "source_id,source_record_key"})
    )
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(post_json, endpoint, api_key, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            try: future.result()
            except Exception as exc:
                failures.append(str(exc))
                for pending in futures: pending.cancel()
                break
    if failures: raise RuntimeError("; ".join(failures))
    submitted = sum(len(batch) for batch in batches)

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
        "submitted_rows": submitted,
        "source_rows_by_rosstat_code": dict(sorted(totals.items())),
        "bdmo_indicator_codes_to_classify": {
            code: items[code].get("candidate_bdmo_codes", []) for code in sorted(items)
        },
        "missing_source_series": [c for c in sorted(SOURCE_CODES) if not totals[c]],
        "municipalities_by_source_code": {
            code: len(municipalities[code]) for code in sorted(SOURCE_CODES) if totals[code]
        },
        "years_by_source_code": {
            code: [min(years[code]), max(years[code])] for code in sorted(SOURCE_CODES) if years[code]
        },
        "blank_values_by_source_code": dict(sorted(blanks.items())),
        "non_numeric_values_by_source_code": dict(sorted(non_numeric.items())),
        "pending_review": True,
        "mapped_indicator_code": None,
        "normalized_unit": None,
        "normalized_period": None,
        "batch_size": BATCH_SIZE,
        "workers": WORKERS,
        "retrieved_at": retrieved_at,
        "note": (
            "The raw P-4/3-F source series are staged once per source code. "
            "BDPMO display-indicator classification remains pending so paired indicators are not double-counted. "
            "No analytical table was modified."
        ),
    }
    (data_dir / "staging-upload-employment-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return 0

if __name__ == "__main__":
    try: raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
