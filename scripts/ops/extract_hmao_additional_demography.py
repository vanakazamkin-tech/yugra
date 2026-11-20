#!/usr/bin/env python3
"""Extract the remaining seven requested demographic indicators for Yugra.

The utility downloads only the selected Rosstat/BDPMO indicator archives,
keeps rows for the 22 Yugra municipalities, and writes a compact audit-ready
JSONL.GZ artifact. It never writes to Supabase.
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
SOURCE_VERSION = "2026-09-28"
BASE = "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/data_bdmo_118_v20260928/regions"

INDICATORS = {
    "8112001": ("Число умерших", f"{BASE}/data_Y48112001_region71_112_v20260928.zip"),
    "8112003": ("Число родившихся (без учета мертворожденных)", f"{BASE}/data_Y48112003_region71_112_v20260928.zip"),
    "8112004": ("Естественный прирост (убыль)", f"{BASE}/data_Y48112004_region71_112_v20260928.zip"),
    "8112007": ("Общий коэффициент рождаемости", f"{BASE}/data_Y48112007_region71_112_v20260928.zip"),
    "8112008": ("Общий коэффициент смертности", f"{BASE}/data_Y48112008_region71_112_v20260928.zip"),
    "8112009": ("Общий коэффициент естественного прироста (убыли)", f"{BASE}/data_Y48112009_region71_112_v20260928.zip"),
    "8112027": ("Оценка численности городского и сельского населения на 1 января текущего года", f"{BASE}/data_Y48112027_region71_112_v20260928.zip"),
}

MUNICIPALITIES = {
    "71811000": ("beloyarsky-raion", "Белоярский район"),
    "71812000": ("berezovsky-raion", "Березовский район"),
    "71883000": ("kogalym", "Когалым"),
    "71816000": ("kondinsky-raion", "Кондинский район"),
    "71872000": ("langepas", "Лангепас"),
    "71873000": ("megion", "Мегион"),
    "71874000": ("nefteyugansk", "Нефтеюганск"),
    "71818000": ("nefteyugansky-raion", "Нефтеюганский район"),
    "71875000": ("nizhnevartovsk", "Нижневартовск"),
    "71819000": ("nizhnevartovsky-raion", "Нижневартовский район"),
    "71879000": ("nyagan-city", "Нягань"),
    "71821000": ("october-raion", "Октябрьский район"),
    "71884000": ("pokachi", "Покачи"),
    "71885000": ("pyt-yah", "Пыть-Ях"),
    "71877000": ("raduzhny", "Радужный"),
    "71824000": ("sovetsky-raion", "Советский район"),
    "71876000": ("surgut", "Сургут"),
    "71826000": ("surgutsky", "Сургутский район"),
    "71878000": ("uray", "Урай"),
    "71871000": ("khanty-mansiysk", "Ханты-Мансийск"),
    "71829000": ("khanty-mansiysky-raion", "Ханты-Мансийский район"),
    "71887000": ("ugorsk", "Югорск"),
}

def norm_header(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", "", value.strip().lower().replace("ё", "е"))

def match_oktmo(value: str) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    if digits in MUNICIPALITIES:
        return digits
    if len(digits) == 11 and digits.endswith("000") and digits[:8] in MUNICIPALITIES:
        return digits[:8]
    return None

def year_of(row: dict[str, str]) -> str | None:
    for key, value in row.items():
        if norm_header(key) in {"год", "year", "годнаблюдения", "отчетныйгод"}:
            value = (value or "").strip()
            if re.fullmatch(r"20\d{2}", value):
                return value
    return None

def extract_one(code: str, title: str, url: str, out_dir: Path) -> dict:
    request = Request(url, headers={"User-Agent": "Yugra18-demography-extract/1.0"})
    try:
        with urlopen(request, timeout=180) as response:
            archive_bytes = response.read()
    except HTTPError as exc:
        if exc.code == 404:
            return {"indicator_code": code, "title": title, "url": url, "status": "archive_not_found", "http_status": 404}
        raise

    archive_sha256 = hashlib.sha256(archive_bytes).hexdigest()
    output_path = out_dir / f"{code}_hmao_rows.jsonl.gz"
    rows = 0
    by_municipality: Counter[str] = Counter()
    by_year: Counter[str] = Counter()
    header_map: list[str] = []
    dim_counts: dict[str, Counter[str]] = defaultdict(Counter)
    samples: list[dict] = []
    seen_hashes: set[tuple[str, str]] = set()

    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(csv_names) != 1:
            raise RuntimeError(f"{code}: expected one CSV in archive, found {csv_names[:5]}")
        csv_name = csv_names[0]
        with archive.open(csv_name, "r") as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
            reader = csv.DictReader(text, delimiter=";")
            if not reader.fieldnames:
                raise RuntimeError(f"{code}: CSV header missing")
            header_map = list(reader.fieldnames)
            oktmo_fields = [name for name in header_map if "oktmo" in norm_header(name)]
            if not oktmo_fields:
                raise RuntimeError(f"{code}: OKTMO field absent; columns={header_map}")
            oktmo_field = oktmo_fields[0]
            with gzip.open(output_path, "wt", encoding="utf-8", newline="", compresslevel=6) as output:
                for row in reader:
                    oktmo = match_oktmo(row.get(oktmo_field, ""))
                    if not oktmo:
                        continue
                    municipality_id, municipality_name = MUNICIPALITIES[oktmo]
                    clean = {key: (value if value is not None else "") for key, value in row.items()}
                    digest = hashlib.sha256(json.dumps(clean, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
                    key = (oktmo, digest)
                    if key in seen_hashes:
                        continue
                    seen_hashes.add(key)
                    year = year_of(clean) or ""
                    record = {
                        "source": "rosstat_bdmo_processed_by_tochno",
                        "source_page": SOURCE_PAGE,
                        "source_archive": url,
                        "source_published_at": SOURCE_VERSION,
                        "source_indicator_code": code,
                        "source_indicator_name": title,
                        "source_file": csv_name,
                        "oktmo": oktmo,
                        "municipality_id": municipality_id,
                        "municipality_name": municipality_name,
                        "year": year,
                        "attributes": clean,
                        "row_sha256": digest,
                        "license": "CC BY 4.0",
                    }
                    output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                    rows += 1
                    by_municipality[municipality_id] += 1
                    if year:
                        by_year[year] += 1
                    for field, value in clean.items():
                        if value and norm_header(field) not in {"значение", "value"}:
                            dim_counts[field][value] += 1
                    if len(samples) < 5:
                        samples.append(record)

    return {
        "indicator_code": code,
        "title": title,
        "url": url,
        "status": "extracted" if rows else "no_yugra_rows",
        "archive_bytes": len(archive_bytes),
        "archive_sha256": archive_sha256,
        "csv_file": csv_name,
        "csv_headers": header_map,
        "matched_rows": rows,
        "municipalities_matched": len(by_municipality),
        "missing_municipalities": [
            {"oktmo": oktmo, "municipality_id": municipality_id, "name": name}
            for oktmo, (municipality_id, name) in MUNICIPALITIES.items()
            if municipality_id not in by_municipality
        ],
        "rows_by_municipality": dict(sorted(by_municipality.items())),
        "rows_by_year": dict(sorted(by_year.items())),
        "dimension_fields": {field: dict(counter.most_common(30)) for field, counter in dim_counts.items()},
        "output_file": output_path.name,
        "sample_rows": samples,
    }

def main() -> int:
    out_dir = Path("demography-additional-extract")
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for code, (title, url) in INDICATORS.items():
        print(f"Downloading and filtering {code}...", flush=True)
        result = extract_one(code, title, url, out_dir)
        results.append(result)
        print(f"{code}: {result.get('status')} / {result.get('matched_rows', 0)} rows / {result.get('municipalities_matched', 0)} municipalities", flush=True)

    extracted = [item for item in results if item.get("status") == "extracted"]
    report = {
        "ok": bool(extracted),
        "source_version": SOURCE_VERSION,
        "region_code": "71",
        "expected_municipalities": 22,
        "requested_indicators": len(INDICATORS),
        "available_indicators": len(extracted),
        "total_rows": sum(int(item.get("matched_rows", 0)) for item in extracted),
        "indicators": results,
        "note": "Extraction only. No Supabase changes. Missing archives or municipality rows are not replaced by zeros. Review coverage, period, units and source attributes before staging.",
    }
    (out_dir / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "indicators"}, ensure_ascii=False), flush=True)
    return 0 if extracted else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
