#!/usr/bin/env python3
"""Stage the reviewed aggregate-only FNS SME snapshot for all Yugra municipalities.

The full FNS archive produced 65,723 region-86 records. Five had no district,
city, or settlement fields, so they remain unallocated and excluded. All 22
municipal aggregates below are calculated from the 65,718 geographically
mapped records. No taxpayer-level data is present in this report or upload.
"""
from __future__ import annotations
import concurrent.futures, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPORT = Path(".ops-results/fns-sme-aggregates.json")
BASE_URL = os.getenv("SUPABASE_URL", "https://dmbikidqikjupkghywbz.supabase.co").rstrip("/")
API_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SOURCE_ID = "fns_unified_sme_register_2026_11"
SNAPSHOT = "2026-11-10"
ZIP_URL = "https://file.nalog.ru/opendata/7707329152-rsmp/data-10112026-structure-12052026.zip"
EXPECTED_REGION_ROWS = 65723
EXPECTED_UNMAPPED_ROWS = 5
BATCH_SIZE = 100
WORKERS = 2

TYPE_MAP = {"1": "legal_entity", "2": "individual_entrepreneur", "3": "farm_head"}
CATEGORY_MAP = {"1": "micro", "2": "small", "3": "medium"}
MEASURES = [
    ("sme_entities_count_fns", "Субъекты МСП, всего по Единому реестру ФНС", "total", "единиц"),
    ("sme_legal_entities_count_fns", "Юридические лица в Едином реестре МСП ФНС", "kind:1", "единиц"),
    ("sme_individual_entrepreneurs_count_fns", "Индивидуальные предприниматели в Едином реестре МСП ФНС", "kind:2", "единиц"),
    ("sme_farm_heads_count_fns", "Главы крестьянских (фермерских) хозяйств в Едином реестре МСП ФНС", "kind:3", "единиц"),
    ("sme_microenterprise_count_fns", "Микропредприятия в Едином реестре МСП ФНС", "category:1", "единиц"),
    ("sme_small_enterprise_count_fns", "Малые предприятия в Едином реестре МСП ФНС", "category:2", "единиц"),
    ("sme_medium_enterprise_count_fns", "Средние предприятия в Едином реестре МСП ФНС", "category:3", "единиц"),
]

def request_json(url: str, payload: list[dict]) -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "apikey": API_KEY, "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json", "Accept-Profile": "public",
        "Content-Profile": "public",
        "Prefer": "resolution=ignore-duplicates,return=minimal",
    }, method="POST")
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
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

def main() -> None:
    if not API_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    if report.get("status") != "aggregated":
        raise RuntimeError("FNS aggregate report has unexpected status")
    if report.get("snapshot_dates") != {"10.11.2026": EXPECTED_REGION_ROWS}:
        raise RuntimeError(f"Unexpected FNS snapshot date/count: {report.get('snapshot_dates')}")
    if int(report.get("region86_records", -1)) != EXPECTED_REGION_ROWS:
        raise RuntimeError(f"Unexpected region-86 record count: {report.get('region86_records')}")
    if int(report.get("unmapped_region86_records", -1)) != EXPECTED_UNMAPPED_ROWS:
        raise RuntimeError(f"Expected exactly {EXPECTED_UNMAPPED_ROWS} records with no address fields")
    if int(report.get("mapped_records", -1)) != EXPECTED_REGION_ROWS - EXPECTED_UNMAPPED_ROWS:
        raise RuntimeError("FNS mapped/unmapped row reconciliation failed")
    if report.get("missing_municipality_ids"):
        raise RuntimeError(f"Missing municipalities: {report['missing_municipality_ids']}")
    if report.get("invalid_type_codes") or report.get("invalid_category_codes"):
        raise RuntimeError("Unknown FNS type/category code")
    if report.get("snapshot_dates") != {"10.11.2026": EXPECTED_REGION_ROWS}:
        raise RuntimeError(f"Unexpected snapshot date control: {report.get('snapshot_dates')}")

    municipality_names = report.get("municipality_names", {})
    type_by_municipality = report.get("entity_type_counts_by_municipality", {})
    category_by_municipality = report.get("category_counts_by_municipality", {})
    cross_by_municipality = report.get("type_category_counts_by_municipality", {})
    if len(municipality_names) != 22 or set(type_by_municipality) != set(municipality_names):
        raise RuntimeError("Expected exactly 22 fully mapped municipality aggregates")

    rows = []
    municipal_totals = {}
    total_mapped = 0
    for mid, municipality_name in sorted(municipality_names.items()):
        types = {str(k): int(v) for k, v in type_by_municipality.get(mid, {}).items()}
        categories = {str(k): int(v) for k, v in category_by_municipality.get(mid, {}).items()}
        if set(types) - set(TYPE_MAP) or set(categories) - set(CATEGORY_MAP):
            raise RuntimeError(f"Unknown type/category in {mid}")
        type_total = sum(types.values())
        category_total = sum(categories.values())
        if type_total != category_total:
            raise RuntimeError(f"Type/category total mismatch for {mid}: {type_total} != {category_total}")
        if type_total <= 0:
            raise RuntimeError(f"No SME records mapped to {mid}")
        total_mapped += type_total
        cross = cross_by_municipality.get(mid, {})
        municipal_totals[mid] = type_total
        values = {
            "total": type_total,
            "kind:1": types.get("1", 0),
            "kind:2": types.get("2", 0),
            "kind:3": types.get("3", 0),
            "category:1": categories.get("1", 0),
            "category:2": categories.get("2", 0),
            "category:3": categories.get("3", 0),
        }
        for measure_code, measure_name, selector, unit in MEASURES:
            value = values[selector]
            rows.append({
                "source_id": SOURCE_ID,
                "source_record_key": f"fns-sme:{SNAPSHOT}:{mid}:{measure_code}",
                "raw_record": {
                    "source": "ФНС России, Единый реестр субъектов МСП",
                    "source_snapshot_date": SNAPSHOT,
                    "municipality_id": mid,
                    "municipality_name": municipality_name,
                    "measure_code": measure_code,
                    "aggregate_value": value,
                    "type_category_cross": cross,
                    "entity_type_codes": TYPE_MAP,
                    "sme_category_codes": CATEGORY_MAP,
                    "source_zip_url": ZIP_URL,
                    "source_zip_sha256": report.get("zip_sha256"),
                    "region86_records_total": EXPECTED_REGION_ROWS,
                    "region86_records_mapped": EXPECTED_REGION_ROWS - EXPECTED_UNMAPPED_ROWS,
                    "region86_records_unmapped": EXPECTED_UNMAPPED_ROWS,
                    "unmapped_reason": "Five records have no район/город/населённый пункт fields and are not assigned to any municipality.",
                    "privacy_note": "Only municipal aggregate counts; no taxpayer IDs, names, or personal data stored."
                },
                "raw_municipality_name": municipality_name,
                "raw_oktmo": None,
                "raw_indicator_name": measure_name,
                "raw_indicator_code": measure_code,
                "raw_year": 2026,
                "raw_period": "Срез Единого реестра ФНС на 10.11.2026",
                "raw_value": str(value),
                "raw_unit": unit,
                "mapped_municipality_id": mid,
                "mapped_indicator_code": None,
                "normalized_value": None,
                "normalized_unit": None,
                "normalized_period": None,
                "geographic_level": "municipality",
                "review_status": "pending",
                "validation_errors": [],
                "source_url_snapshot": ZIP_URL,
                "source_published_at": SNAPSHOT,
                "source_retrieved_at": datetime.now(timezone.utc).isoformat(),
            })
    if total_mapped != EXPECTED_REGION_ROWS - EXPECTED_UNMAPPED_ROWS:
        raise RuntimeError(f"Municipal total reconciliation failed: {total_mapped}")
    if len(rows) != 22 * len(MEASURES):
        raise RuntimeError(f"Expected 154 observations, got {len(rows)}")

    endpoint = BASE_URL + "/rest/v1/municipality_indicator_import_staging?" + urllib.parse.urlencode({
        "on_conflict": "source_id,source_record_key"
    })
    batches = [rows[i:i+BATCH_SIZE] for i in range(0, len(rows), BATCH_SIZE)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(request_json, endpoint, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            future.result()

    patch_url = BASE_URL + "/rest/v1/data_sources?" + urllib.parse.urlencode({"id": f"eq.{SOURCE_ID}"})
    now = datetime.now(timezone.utc).isoformat()
    patch_body = json.dumps({
        "import_status": "partially_imported",
        "last_checked_at": now,
        "retrieved_at": now,
        "updated_at": now,
    }).encode("utf-8")
    req = urllib.request.Request(patch_url, data=patch_body, headers={
        "apikey": API_KEY, "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json", "Accept-Profile": "public",
        "Content-Profile": "public", "Prefer": "return=minimal",
    }, method="PATCH")
    with urllib.request.urlopen(req, timeout=120) as response:
        if response.status not in (200, 204):
            raise RuntimeError(f"Unexpected source update HTTP {response.status}")

    out = {
        "status": "uploaded_to_review_staging",
        "snapshot_date": SNAPSHOT,
        "region86_registry_records": EXPECTED_REGION_ROWS,
        "mapped_records": EXPECTED_REGION_ROWS - EXPECTED_UNMAPPED_ROWS,
        "unmapped_records_not_assigned": EXPECTED_UNMAPPED_ROWS,
        "municipality_count": 22,
        "staging_rows": len(rows),
        "staging_rows_by_measure": {code: 22 for code, _, _, _ in MEASURES},
        "sum_of_municipality_sme_counts": total_mapped,
        "all_pending": True,
        "no_taxpayer_level_data": True,
        "source_zip_sha256": report.get("zip_sha256"),
    }
    (Path(".ops-results") / "fns-sme-review-upload-status.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(out, ensure_ascii=False, indent=2), flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise
