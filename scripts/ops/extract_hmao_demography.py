#!/usr/bin/env python3
"""Extract only HMAO municipality-level rows from Rosstat/Tochno section 31 archives.

This is an inspection/export utility. It never writes to Supabase.
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import re
import sys
import time
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
PUBLISHED_AT = "2026-09-28"
BASE = "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/data_bdmo_118_v20260928/regions"

INDICATORS = {
    "8112014": {
        "title": "Численность всего населения по полу и возрасту на 1 января текущего года",
        "url": f"{BASE}/data_Y48112014_region71_112_v20260928.zip",
    },
    "8112015": {
        "title": "Численность городского населения по полу и возрасту на 1 января текущего года",
        "url": f"{BASE}/data_Y48112015_region71_112_v20260928.zip",
    },
    "8112016": {
        "title": "Численность сельского населения по полу и возрасту на 1 января текущего года",
        "url": f"{BASE}/data_Y48112016_region71_112_v20260928.zip",
    },
    "8112021": {
        "title": "Число прибывших",
        "url": f"{BASE}/data_Y48112021_region71_112_v20260928.zip",
    },
    "8112022": {
        "title": "Число выбывших",
        "url": f"{BASE}/data_Y48112022_region71_112_v20260928.zip",
    },
    "8112023": {
        "title": "Миграционный прирост (убыль)",
        "url": f"{BASE}/data_Y48112023_region71_112_v20260928.zip",
    },
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
    # Some BDMO regional tables serialize upper-level OKTMO as 11 digits ending in 000.
    if len(digits) == 11 and digits.endswith("000") and digits[:8] in MUNICIPALITIES:
        return digits[:8]
    return None

def choose_csv_name(zf: zipfile.ZipFile) -> str:
    names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
    if len(names) != 1:
        raise RuntimeError(f"Expected one CSV in ZIP, found {len(names)}: {names[:10]}")
    return names[0]

def year_of(row: dict[str, str]) -> str | None:
    for key, val in row.items():
        if norm_header(key) in {"год", "year", "годнаблюдения", "отчетныйгод"}:
            val = (val or "").strip()
            if re.fullmatch(r"20\d{2}", val):
                return val
    return None

def run_one(code: str, meta: dict, out_dir: Path) -> dict:
    request = Request(meta["url"], headers={"User-Agent": "Yugra18-demography-extract/1.0"})
    with urlopen(request, timeout=180) as response:
        archive_bytes = response.read()
    archive_sha256 = hashlib.sha256(archive_bytes).hexdigest()

    output_path = out_dir / f"{code}_hmao_rows.jsonl.gz"
    header_map: list[str] = []
    row_count = 0
    by_municipality: Counter[str] = Counter()
    by_year: Counter[str] = Counter()
    field_values: dict[str, Counter[str]] = defaultdict(Counter)
    samples: list[dict] = []
    seen_keys: set[tuple[str, str, str]] = set()

    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
        csv_name = choose_csv_name(zf)
        with zf.open(csv_name, "r") as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
            reader = csv.DictReader(text, delimiter=";")
            if not reader.fieldnames:
                raise RuntimeError(f"{code}: CSV header missing")
            header_map = list(reader.fieldnames)
            oktmo_fields = [h for h in header_map if "oktmo" in norm_header(h) or "октмо" in norm_header(h)]
            if not oktmo_fields:
                raise RuntimeError(f"{code}: no OKTMO field; columns={header_map}")
            oktmo_field = oktmo_fields[0]
            with gzip.open(output_path, "wt", encoding="utf-8", newline="") as out:
                for row in reader:
                    matched = match_oktmo(row.get(oktmo_field, ""))
                    if not matched:
                        continue
                    muni_id, canonical_name = MUNICIPALITIES[matched]
                    year = year_of(row) or ""
                    # Keep every breakdown row; the attributes are needed to distinguish age/sex/migration slices.
                    clean = {k: (v if v is not None else "") for k, v in row.items()}
                    digest = hashlib.sha256(
                        json.dumps(clean, ensure_ascii=False, sort_keys=True).encode("utf-8")
                    ).hexdigest()
                    key = (matched, year, digest)
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)
                    record = {
                        "source": "rosstat_bdmo_processed_by_tochno",
                        "source_page": SOURCE_PAGE,
                        "source_archive": meta["url"],
                        "source_published_at": PUBLISHED_AT,
                        "source_indicator_code": code,
                        "source_indicator_name": meta["title"],
                        "source_file": csv_name,
                        "oktmo": matched,
                        "municipality_id": muni_id,
                        "municipality_name": canonical_name,
                        "year": year,
                        "attributes": clean,
                        "row_sha256": digest,
                        "license": "CC BY 4.0",
                    }
                    out.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                    row_count += 1
                    by_municipality[muni_id] += 1
                    if year:
                        by_year[year] += 1
                    for field, value in clean.items():
                        if value and (norm_header(field) not in {"значение", "value"}):
                            field_values[field][value] += 1
                    if len(samples) < 5:
                        samples.append(record)

    return {
        "indicator_code": code,
        "title": meta["title"],
        "url": meta["url"],
        "archive_bytes": len(archive_bytes),
        "archive_sha256": archive_sha256,
        "csv_file": csv_name,
        "csv_headers": header_map,
        "matched_rows": row_count,
        "municipalities_matched": len(by_municipality),
        "missing_municipalities": [
            {"oktmo": oktmo, "municipality_id": muni_id, "name": name}
            for oktmo, (muni_id, name) in MUNICIPALITIES.items()
            if muni_id not in by_municipality
        ],
        "rows_by_municipality": dict(sorted(by_municipality.items())),
        "rows_by_year": dict(sorted(by_year.items())),
        "dimension_fields": {
            field: dict(counter.most_common(20))
            for field, counter in field_values.items()
        },
        "output_file": output_path.name,
        "sample_rows": samples,
    }

def main() -> int:
    out_dir = Path("demography-extract")
    out_dir.mkdir(parents=True, exist_ok=True)
    summaries = []
    for code, meta in INDICATORS.items():
        print(f"Downloading and filtering {code}...", flush=True)
        summary = run_one(code, meta, out_dir)
        if summary["municipalities_matched"] == 0:
            raise RuntimeError(f"{code}: no HMAO municipality rows matched; check OKTMO field and archive")
        summaries.append(summary)
        print(
            f"{code}: {summary['matched_rows']} rows / "
            f"{summary['municipalities_matched']} municipalities",
            flush=True,
        )
    report = {
        "ok": True,
        "source_version": "2026-09-28",
        "region_code": "71",
        "region_label": "Тюменская область (включая автономные округа)",
        "expected_municipalities": 22,
        "indicators": summaries,
        "total_rows": sum(x["matched_rows"] for x in summaries),
        "note": "Extraction only. Rows are not yet staged or verified. All dimension attributes are preserved. Missing municipality rows are reported, not filled with synthetic zeroes; absence may mean no value or no applicable urban/rural category.",
    }
    (out_dir / "summary.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in report.items() if k != "indicators"}, ensure_ascii=False), flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
