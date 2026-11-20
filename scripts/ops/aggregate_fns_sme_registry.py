#!/usr/bin/env python3
"""Aggregate the official FNS SME XML snapshot to Yugra municipalities only.

The 2.17GB ZIP is downloaded to ephemeral runner storage, streamed through
XML iterparse, and deleted after aggregation. No INN, OGRN, names, personal
names, streets, houses, or other taxpayer-level data are persisted. The only
output is municipal counts by legal form and SME category.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

ZIP_URL = "https://file.nalog.ru/opendata/7707329152-rsmp/data-10112026-structure-12052026.zip"
PASSPORT_URL = "https://www.nalog.gov.ru/opendata/7707329152-rsmp/"
SNAPSHOT = "2026-11-10"
EXPECTED_REGION = "86"
DOWNLOAD_PATH = Path(os.getenv("FNS_SME_ZIP_PATH", "/tmp/fns-sme-20261110.zip"))
OUT_DIR = Path("fns-sme-full-aggregation")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MUNICIPALITIES = {
    "beloyarsky-raion": "Белоярский район",
    "berezovsky-raion": "Берёзовский район",
    "kogalym": "Когалым",
    "kondinsky-raion": "Кондинский район",
    "langepas": "Лангепас",
    "megion": "Мегион",
    "nefteyugansk": "Нефтеюганск",
    "nefteyugansky-raion": "Нефтеюганский район",
    "nizhnevartovsk": "Нижневартовск",
    "nizhnevartovsky-raion": "Нижневартовский район",
    "nyagan-city": "Нягань",
    "october-raion": "Октябрьский район",
    "pokachi": "Покачи",
    "pyt-yah": "Пыть-Ях",
    "raduzhny": "Радужный",
    "sovetsky-raion": "Советский район",
    "surgut": "Сургут",
    "surgutsky": "Сургутский район",
    "uray": "Урай",
    "khanty-mansiysk": "Ханты-Мансийск",
    "khanty-mansiysky-raion": "Ханты-Мансийский район",
    "ugorsk": "Югорск",
}
DISTRICT_MAP = {
    "белоярский": "beloyarsky-raion",
    "березовский": "berezovsky-raion",
    "кондинский": "kondinsky-raion",
    "нефтеюганский": "nefteyugansky-raion",
    "нижневартовский": "nizhnevartovsky-raion",
    "октябрьский": "october-raion",
    "советский": "sovetsky-raion",
    "сургутский": "surgutsky",
    "хантымансийский": "khanty-mansiysky-raion",
}
CITY_MAP = {
    "когалым": "kogalym",
    "лангепас": "langepas",
    "мегион": "megion",
    "нефтеюганск": "nefteyugansk",
    "нижневартовск": "nizhnevartovsk",
    "нягань": "nyagan-city",
    "покачи": "pokachi",
    "пытьях": "pyt-yah",
    "радужный": "raduzhny",
    "сургут": "surgut",
    "урай": "uray",
    "хантымансийск": "khanty-mansiysk",
    "югорск": "ugorsk",
    "белоярский": "beloyarsky-raion",
    "советский": "sovetsky-raion",
}
TYPE_MAP = {"1": "legal_entity", "2": "individual_entrepreneur", "3": "farm_head"}
CATEGORY_MAP = {"1": "micro", "2": "small", "3": "medium"}

def local(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1]

def clean_name(value: str) -> str:
    value = str(value or "").lower().replace("ё", "е").strip()
    value = re.sub(r"^(?:г\\.?|город|р-н|район)\\s*", "", value)
    return re.sub(r"[^а-яa-z0-9]+", "", value)

def geo_element_value(node: ET.Element) -> str:
    for child in node.iter():
        for key, value in child.attrib.items():
            if local(key).lower() in ("наим", "наименование") and str(value).strip():
                return str(value).strip()
    text = " ".join(" ".join(node.itertext()).split())
    return text[:180]

def normalized_date(value: str) -> str:
    value = str(value or "").strip()
    if re.fullmatch(r"\\d{2}\\.\\d{2}\\.\\d{4}", value):
        day, month, year = value.split(".")
        return f"{year}-{month}-{day}"
    return value

def municipality_for(doc: ET.Element):
    region_code = ""
    district = ""
    city = ""
    settlement = ""
    snapshot_date = normalized_date(doc.attrib.get("ДатаСост", ""))
    for node in doc.iter():
        tag = local(node.tag).lower()
        if tag == "район":
            district = geo_element_value(node)
        elif tag == "город":
            city = geo_element_value(node)
        elif tag == "населпункт":
            settlement = geo_element_value(node)
        for key, value in node.attrib.items():
            key_local = local(key).lower()
            if key_local == "кодрегион":
                region_code = str(value).strip()
            elif key_local == "датасост" and not snapshot_date:
                snapshot_date = normalized_date(value)
        if tag == "кодрегион" and (node.text or "").strip():
            region_code = node.text.strip()
        if tag == "датасост" and (node.text or "").strip() and not snapshot_date:
            snapshot_date = normalized_date(node.text)

    if region_code != EXPECTED_REGION:
        return None, False, snapshot_date

    district_key = clean_name(district)
    city_key = clean_name(city)
    settlement_key = clean_name(settlement)
    # District context takes priority over a settlement/city name:
    # e.g. Fedorovsky is inside Surgutsky district, not a separate municipality.
    municipality_id = DISTRICT_MAP.get(district_key)
    if not municipality_id:
        municipality_id = CITY_MAP.get(city_key)
    if not municipality_id and settlement_key:
        # Only exact names of the standalone city/municipal entities are a
        # safe fallback; ordinary settlements are never guessed into districts.
        municipality_id = CITY_MAP.get(settlement_key)
    return municipality_id, True, snapshot_date

def download_archive():
    request = urllib.request.Request(ZIP_URL, method="HEAD", headers={
        "User-Agent": "Yugra18-FNS-SME-Aggregator/1.0"
    })
    with urllib.request.urlopen(request, timeout=180) as response:
        expected_size = int(response.headers.get("Content-Length", "0"))
        last_modified = response.headers.get("Last-Modified", "")
    if expected_size < 1_000_000_000:
        raise RuntimeError(f"Unexpected FNS archive size: {expected_size}")
    if DOWNLOAD_PATH.exists() and DOWNLOAD_PATH.stat().st_size == expected_size:
        return {"downloaded_bytes": expected_size, "reused_existing": True, "last_modified": last_modified}
    DOWNLOAD_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = DOWNLOAD_PATH.with_suffix(".part")
    req = urllib.request.Request(ZIP_URL, headers={"User-Agent": "Yugra18-FNS-SME-Aggregator/1.0"})
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=900) as response, temp_path.open("wb") as output:
                downloaded = 0
                while True:
                    chunk = response.read(8 * 1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    downloaded += len(chunk)
                    if downloaded % (256 * 1024 * 1024) < len(chunk):
                        print(f"Downloaded {downloaded:,}/{expected_size:,} bytes", flush=True)
            if downloaded != expected_size:
                raise RuntimeError(f"Incomplete download {downloaded}/{expected_size}")
            temp_path.replace(DOWNLOAD_PATH)
            return {"downloaded_bytes": downloaded, "reused_existing": False, "last_modified": last_modified}
        except Exception as exc:
            last_error = str(exc)
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"FNS ZIP download failed: {last_error}")

def process_archive():
    entity_counts = defaultdict(Counter)
    category_counts = defaultdict(Counter)
    cross_counts = defaultdict(Counter)
    snapshot_dates = Counter()
    unmatched = Counter()
    xml_member_count = 0
    documents_total = 0
    region_records = 0
    invalid_types = Counter()
    invalid_categories = Counter()
    errors = []
    with zipfile.ZipFile(DOWNLOAD_PATH, "r") as archive:
        members = [info for info in archive.infolist() if info.filename.lower().endswith(".xml")]
        xml_member_count = len(members)
        print(f"XML members: {xml_member_count:,}", flush=True)
        for index, info in enumerate(members, 1):
            with archive.open(info, "r") as stream:
                for _event, element in ET.iterparse(stream, events=("end",)):
                    if local(element.tag) != "Документ":
                        continue
                    documents_total += 1
                    kind = str(element.attrib.get("ВидСубМСП", "")).strip()
                    category = str(element.attrib.get("КатСубМСП", "")).strip()
                    mid, region_hit, snapshot_date = municipality_for(element)
                    if region_hit:
                        region_records += 1
                        if snapshot_date:
                            snapshot_dates[snapshot_date] += 1
                        else:
                            snapshot_dates["__missing__"] += 1
                        if not mid:
                            # Keep aggregate geography labels only for diagnostic
                            # purposes; taxpayer-level identifiers are never read.
                            district = city = settlement = ""
                            for node in element.iter():
                                tag = local(node.tag).lower()
                                if tag == "район": district = geo_element_value(node)
                                elif tag == "город": city = geo_element_value(node)
                                elif tag == "населпункт": settlement = geo_element_value(node)
                            unmatched[(district, city, settlement)] += 1
                        else:
                            entity_counts[mid][kind] += 1
                            category_counts[mid][category] += 1
                            cross_counts[mid][(kind, category)] += 1
                            if kind not in TYPE_MAP:
                                invalid_types[kind] += 1
                            if category not in CATEGORY_MAP:
                                invalid_categories[category] += 1
                    element.clear()
            if index % 250 == 0 or index == len(members):
                print(f"Processed {index:,}/{len(members):,} XML members; docs={documents_total:,}; region86={region_records:,}; unmatched={sum(unmatched.values()):,}", flush=True)

    total_mapped = sum(sum(x.values()) for x in entity_counts.values())
    zip_hash = hashlib.sha256()
    with DOWNLOAD_PATH.open("rb") as archive_file:
        for block in iter(lambda: archive_file.read(8 * 1024 * 1024), b""):
            zip_hash.update(block)
    mapped_municipalities = sorted(entity_counts.keys())
    missing_municipalities = sorted(set(MUNICIPALITIES) - set(mapped_municipalities))
    report = {
        "status": "aggregated",
        "source_url": PASSPORT_URL,
        "zip_url": ZIP_URL,
        "snapshot_date": SNAPSHOT,
        "zip_sha256": zip_hash.hexdigest(),
        "zip_size_bytes": DOWNLOAD_PATH.stat().st_size,
        "xml_member_count": xml_member_count,
        "documents_total": documents_total,
        "region86_records": region_records,
        "mapped_records": total_mapped,
        "unmapped_region86_records": sum(unmatched.values()),
        "mapped_municipality_count": len(mapped_municipalities),
        "mapped_municipality_ids": mapped_municipalities,
        "municipality_names": MUNICIPALITIES,
        "missing_municipality_ids": missing_municipalities,
        "snapshot_dates": dict(snapshot_dates),
        "entity_type_definitions": TYPE_MAP,
        "category_definitions": CATEGORY_MAP,
        "entity_type_counts_by_municipality": {
            mid: dict(entity_counts[mid]) for mid in sorted(entity_counts)
        },
        "category_counts_by_municipality": {
            mid: dict(category_counts[mid]) for mid in sorted(category_counts)
        },
        "type_category_counts_by_municipality": {
            mid: {f"{kind}:{category}": count for (kind, category), count in sorted(cross_counts[mid].items())}
            for mid in sorted(cross_counts)
        },
        "invalid_type_codes": dict(invalid_types),
        "invalid_category_codes": dict(invalid_categories),
        "unmatched_geography_tuples": [
            {"district": x[0], "city": x[1], "settlement": x[2], "count": count}
            for x, count in unmatched.most_common(200)
        ],
        "privacy_note": "Only municipal aggregates and geographic diagnostic labels. No taxpayer identifiers, entity names, personal names, or street/house details are stored.",
    }
    if snapshot_dates and set(snapshot_dates) != {SNAPSHOT}:
        report["snapshot_date_warning"] = "Not all records have the expected FNS snapshot date."
    (OUT_DIR / "fns-sme-aggregates.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({
        "status": report["status"],
        "xml_member_count": xml_member_count,
        "documents_total": documents_total,
        "region86_records": region_records,
        "mapped_records": total_mapped,
        "unmapped_region86_records": report["unmapped_region86_records"],
        "mapped_municipalities": len(mapped_municipalities),
        "missing_municipalities": missing_municipalities,
        "snapshot_dates": dict(snapshot_dates),
        "invalid_type_codes": dict(invalid_types),
        "invalid_category_codes": dict(invalid_categories),
    }, ensure_ascii=False, indent=2), flush=True)
    return report

def main():
    download = download_archive()
    print(json.dumps(download, ensure_ascii=False), flush=True)
    report = process_archive()
    if report["unmapped_region86_records"] or report["missing_municipality_ids"]:
        raise RuntimeError("Refusing to upload incomplete FNS municipal crosswalk; inspect report.")
    if report.get("snapshot_date_warning"):
        raise RuntimeError(report["snapshot_date_warning"])
    if report["invalid_type_codes"] or report["invalid_category_codes"]:
        raise RuntimeError("FNS category/type codes require review before import.")
    (OUT_DIR / "status.json").write_text(json.dumps({
        "status": "success",
        "snapshot_date": SNAPSHOT,
        "municipality_count": report["mapped_municipality_count"],
        "region86_records": report["region86_records"],
        "unmapped_region86_records": report["unmapped_region86_records"],
        "download": download,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise
