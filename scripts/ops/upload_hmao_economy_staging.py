#!/usr/bin/env python3
"""Upload Stage 3 BDPMO economic observations to private Supabase review staging."""
from __future__ import annotations

import concurrent.futures
import gzip
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone
from pathlib import Path

SOURCE_BY_SECTION = {
    "9": "tochno_bdmo_hmao_s09_investment_20260928",
    "2": "tochno_bdmo_hmao_s02_retail_20260928",
    "39": "tochno_bdmo_hmao_s39_enterprise_20260928",
    "41": "tochno_bdmo_hmao_s41_efficiency_20260928",
}
INDICATORS = {
    "8009001": ("9", "1141100020001", "Инвестиции в основной капитал за счет средств местных бюджетов"),
    "8109001": ("9", "1141100020001", "Инвестиции в основной капитал организаций на территории муниципального образования без субъектов малого предпринимательства"),
    "8109002": ("9", "1141100020001", "Инвестиции в основной капитал организаций муниципальной формы собственности"),
    "8401003": ("2", "1341100020003", "Оборот розничной торговли без субъектов малого предпринимательства"),
    "8801004": ("2", "1341100020034", "Общий объем всех продовольственных товаров, реализованных в границах муниципального образования"),
    "8401011": ("39", "2131100020045", "Отгружено товаров собственного производства, выполнено работ и услуг собственными силами без субъектов малого предпринимательства"),
    "8401012": ("39", "2135000020005", "Продано товаров несобственного производства без субъектов малого предпринимательства"),
    "8401008": ("39", "2131100020045", "Отгружено товаров собственного производства по организациям промышленного производства со средней численностью работников свыше 15 человек"),
    "9010002": ("39", "1351000010004", "Количество организаций по данным государственной регистрации"),
    "9010003": ("39", "1351000010106", "Количество индивидуальных предпринимателей по данным государственной регистрации"),
    "8109003": ("41", "1141100020014", "Объем инвестиций в основной капитал за исключением бюджетных средств в расчете на 1 жителя"),
}
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
EXTRACT_DIR = Path(os.getenv("ECONOMY_EXTRACT_DIR", "economy-2026-extract"))

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
    if code not in INDICATORS:
        raise RuntimeError(f"Unexpected BDPMO indicator code {code!r}")
    section, expected_form, title = INDICATORS[code]
    if str(record.get("source_section")) != section:
        raise RuntimeError(f"{code}: unexpected section {record.get('source_section')!r}")
    form_code = str(record.get("rosstat_form_code", "")).strip()
    if form_code != expected_form:
        raise RuntimeError(f"{code}: unexpected Rosstat form code {form_code!r}")
    attrs = record.get("attributes") or {}
    oktmo = str(record.get("oktmo", "")).strip()
    municipality_id = str(record.get("municipality_id", "")).strip()
    if not oktmo or municipality_id not in EXPECTED_MUNICIPALITIES:
        raise RuntimeError(f"Invalid OKTMO/municipality for {code}: {oktmo}/{municipality_id}")
    year_text = str(record.get("year", "")).strip()
    year = int(year_text) if year_text.isdigit() else None
    if year is None or not 1900 <= year <= 2200:
        raise RuntimeError(f"Invalid/missing year for {code}: {year_text!r}")
    digest = str(record.get("row_sha256", "")).strip()
    if len(digest) != 64:
        raise RuntimeError(f"{code}: invalid source row hash")

    raw_value = find_value(attrs, {
        "indicatorvalue", "значение", "значениепоказателя", "value",
        "значениеданных", "показатель",
    })
    raw_unit = find_value(attrs, {
        "indicatorunit", "единицаизмерения", "unit", "единица",
    })
    raw_period = find_value(attrs, {
        "indicatorperiod", "период", "period", "отчетныйпериод",
        "периоднаблюдения", "периодзначения",
    })
    numeric = to_numeric(raw_value)
    errors = []
    if not raw_value:
        errors.append("source_value_blank")
    elif numeric is None:
        errors.append("source_value_not_numeric")

    raw_record = dict(attrs)
    raw_record["_source_member"] = str(record.get("source_member", ""))
    raw_record["_source_row_sha256"] = digest
    raw_record["_source_statistical_form_code"] = form_code
    raw_record["_bdmo_indicator_code"] = code
    raw_record["_source_section"] = section
    raw_record["_source_archive"] = str(record.get("source_archive", ""))
    raw_record["_license"] = str(record.get("license", "CC BY 4.0"))

    source_id = SOURCE_BY_SECTION[section]
    return {
        "source_id": source_id,
        "source_record_key": f"economy:{section}:{code}:{form_code}:{digest}",
        "raw_record": raw_record,
        "raw_municipality_name": str(record.get("municipality_name", "")),
        "raw_oktmo": oktmo,
        "raw_indicator_name": title,
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

def request_json(url: str, api_key: str, payload, method: str = "POST") -> None:
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
        if attempt < 4:
            time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Supabase request failed: {last_error}")

def main() -> int:
    summary_path = EXTRACT_DIR / "summary.json"
    if not summary_path.exists():
        raise RuntimeError("Missing economy extraction summary")
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if summary.get("ok") is not True:
        raise RuntimeError("No HMAO Stage 3 economic records extracted")

    retrieved_at = datetime.now(timezone.utc).isoformat()
    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    base_url = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").strip()
    if not api_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    if not base_url.startswith("https://") or BATCH_SIZE < 1 or WORKERS < 1:
        raise RuntimeError("Invalid Supabase URL or upload settings")

    prepared_files = []
    totals = Counter()
    municipalities = {code: set() for code in INDICATORS}
    years = {code: [] for code in INDICATORS}
    blanks = Counter()
    non_numeric = Counter()
    source_rows = Counter()

    for section_result in summary.get("sections", []):
        section = str(section_result["section"])
        for item in section_result.get("indicators", []):
            code = str(item.get("source_indicator_code", ""))
            rel = item.get("output_file")
            if code not in INDICATORS:
                continue
            if not rel or not int(item.get("matched_rows", 0)):
                continue
            source_file = EXTRACT_DIR / rel
            if not source_file.exists():
                raise RuntimeError(f"Missing extracted file for {section}/{code}: {source_file}")
            target = EXTRACT_DIR / f"prepared_{section}_{code}.jsonl.gz"
            expected = int(item["matched_rows"])
            with gzip.open(source_file, "rt", encoding="utf-8") as src, gzip.open(
                target, "wt", encoding="utf-8", compresslevel=6
            ) as dst:
                prepared_count = 0
                for line in src:
                    if not line.strip():
                        continue
                    payload = make_payload(json.loads(line), retrieved_at)
                    dst.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                    prepared_count += 1
                    totals[code] += 1
                    source_rows[section] += 1
                    municipalities[code].add(payload["mapped_municipality_id"])
                    years[code].append(payload["raw_year"])
                    if not payload["raw_value"]:
                        blanks[code] += 1
                    if "source_value_not_numeric" in payload["validation_errors"]:
                        non_numeric[code] += 1
            if prepared_count != expected:
                raise RuntimeError(f"{section}/{code}: extract summary {expected}, prepared {prepared_count}")
            prepared_files.append((section, code, target))

    if not prepared_files:
        raise RuntimeError("No Stage 3 rows to upload")

    batches = []
    for section, code, path in prepared_files:
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
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(request_json, endpoint, api_key, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as exc:
                failures.append(str(exc))
                for pending in futures:
                    pending.cancel()
                break
    if failures:
        raise RuntimeError("; ".join(failures))

    for section in sorted(set(x[0] for x in prepared_files)):
        source_id = SOURCE_BY_SECTION[section]
        source_endpoint = (
            base_url.rstrip("/") + "/rest/v1/data_sources?"
            + urllib.parse.urlencode({"id": f"eq.{source_id}"})
        )
        request_json(source_endpoint, api_key, {
            "import_status": "partially_imported",
            "last_checked_at": retrieved_at,
            "retrieved_at": retrieved_at,
            "updated_at": retrieved_at,
        }, method="PATCH")

    report = {
        "status": "submitted_to_review_staging",
        "submitted_rows": sum(totals.values()),
        "source_rows_by_section": dict(sorted(source_rows.items())),
        "source_rows_by_indicator_code": dict(sorted(totals.items())),
        "municipalities_by_indicator_code": {
            c: len(municipalities[c]) for c in sorted(INDICATORS) if totals[c]
        },
        "years_by_indicator_code": {
            c: [min(years[c]), max(years[c])] for c in sorted(INDICATORS) if years[c]
        },
        "missing_source_indicators": [
            {"code": c, "section": INDICATORS[c][0]}
            for c in sorted(INDICATORS) if not totals[c]
        ],
        "blank_values_by_indicator_code": dict(sorted(blanks.items())),
        "non_numeric_values_by_indicator_code": dict(sorted(non_numeric.items())),
        "pending_review": True,
        "normalized_indicator_code": None,
        "normalized_unit": None,
        "normalized_period": None,
        "batch_size": BATCH_SIZE,
        "workers": WORKERS,
        "retrieved_at": retrieved_at,
        "note": (
            "All Stage 3 economic rows remain pending in review staging. "
            "Original dimensions and cumulative periods are preserved; no data was promoted "
            "into municipality_indicators."
        ),
    }
    (EXTRACT_DIR / "staging-upload-economy-report.json").write_text(
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
