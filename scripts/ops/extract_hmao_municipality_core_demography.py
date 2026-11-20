#!/usr/bin/env python3
"""Range-extract selected section-31 CSV members from the 2026-09-28 BDPMO ZIP.

The 7 GB outer archive is never downloaded in full. HTTP Range requests fetch
only the ZIP central directory and the six required inner CSV members.
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import re
import struct
import sys
import time
import urllib.error
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ARCHIVE_URL = (
    "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/"
    "data_bdmo_118_v20260928/by_indicator/data_section31_112_v20260928.zip"
)
SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
PUBLISHED_AT = "2026-09-28"
REGION_CODE = "71"

INDICATORS = {
    "8112001": "Число умерших",
    "8112003": "Число родившихся (без учета мертворожденных)",
    "8112004": "Естественный прирост (убыль)",
    "8112007": "Общий коэффициент рождаемости",
    "8112008": "Общий коэффициент смертности",
    "8112009": "Общий коэффициент естественного прироста (убыли)",
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
    return re.sub(r"[^a-zа-яё0-9]+", "", str(value).strip().lower().replace("ё", "е"))

def match_oktmo(value: str) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if digits in MUNICIPALITIES:
        return digits
    if len(digits) == 11 and digits.endswith("000") and digits[:8] in MUNICIPALITIES:
        return digits[:8]
    return None

def field_by_normalized_name(row: dict[str, str], names: set[str]) -> str:
    for key, value in row.items():
        if norm_header(key) in names:
            return str(value or "").strip()
    return ""

def get_year(row: dict[str, str]) -> str:
    value = field_by_normalized_name(row, {"год", "year", "годнаблюдения", "отчетныйгод"})
    if re.fullmatch(r"20\d{2}", value):
        return value
    return ""

class HttpRangeFile(io.RawIOBase):
    """Seekable read-only file object backed by HTTP Range requests."""
    def __init__(self, url: str, timeout: int = 90):
        self.url = url
        self.timeout = timeout
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Yugra18-BDPMO-range-extractor/1.0"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise RuntimeError(f"Archive HEAD returned HTTP {response.status}")
            self.size = int(response.headers.get("Content-Length", "0"))
        if self.size <= 0:
            raise RuntimeError("Archive HEAD did not expose Content-Length")
        self.position = 0
        self.requests = 0
        self.bytes_downloaded = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset: int, whence: int = io.SEEK_SET):
        if whence == io.SEEK_SET:
            new_pos = offset
        elif whence == io.SEEK_CUR:
            new_pos = self.position + offset
        elif whence == io.SEEK_END:
            new_pos = self.size + offset
        else:
            raise ValueError("Invalid seek origin")
        if new_pos < 0:
            raise ValueError("Negative seek position")
        self.position = min(new_pos, self.size)
        return self.position

    def read(self, size: int = -1) -> bytes:
        if self.position >= self.size:
            return b""
        if size is None or size < 0:
            size = self.size - self.position
        size = min(size, self.size - self.position)
        if size <= 0:
            return b""
        start = self.position
        end = start + size - 1
        request = urllib.request.Request(
            self.url,
            headers={
                "User-Agent": "Yugra18-BDPMO-range-extractor/1.0",
                "Range": f"bytes={start}-{end}",
            },
        )
        last_error = None
        for attempt in range(5):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    if response.status != 206:
                        raise RuntimeError(f"Range request returned HTTP {response.status}; refusing full archive download")
                    data = response.read()
                    content_range = response.headers.get("Content-Range", "")
                    if len(data) != size or not content_range.startswith(f"bytes {start}-{end}/"):
                        raise RuntimeError(f"Unexpected partial response: range={content_range}, bytes={len(data)}, expected={size}")
                    self.position += len(data)
                    self.requests += 1
                    self.bytes_downloaded += len(data)
                    return data
            except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
                last_error = exc
                if attempt < 4:
                    time.sleep(min(2 ** attempt, 12))
        raise RuntimeError(f"HTTP Range request failed at {start}-{end}: {last_error}")

def extract_indicator_rows(outer: zipfile.ZipFile, code: str, title: str, out_dir: Path) -> dict:
    candidates = [
        name for name in outer.namelist()
        if code in name and name.lower().endswith(".csv") and "parts/" not in name.lower()
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"{code}: expected one CSV member in 2026 archive, found {candidates[:20]}")
    member_name = candidates[0]
    info = outer.getinfo(member_name)
    print(f"OPEN_MEMBER {code} {member_name} compressed={info.compress_size} uncompressed={info.file_size}", flush=True)

    output_path = out_dir / f"{code}_region71_rows.jsonl.gz"
    rows = 0
    by_municipality: Counter[str] = Counter()
    by_year: Counter[str] = Counter()
    dimension_counts: dict[str, Counter[str]] = defaultdict(Counter)
    samples: list[dict] = []
    seen: set[tuple[str, str]] = set()
    headers = []

    with outer.open(member_name, "r") as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
        reader = csv.DictReader(text, delimiter=";")
        if not reader.fieldnames:
            raise RuntimeError(f"{code}: CSV headers are missing")
        headers = list(reader.fieldnames)
        normalized_headers = {norm_header(x) for x in headers}
        if not any("oktmo" in x for x in normalized_headers):
            raise RuntimeError(f"{code}: OKTMO column not found in {headers}")
        if not any(x in normalized_headers for x in {"regionid", "region", "kodregiona", "regioncode"}):
            raise RuntimeError(f"{code}: region column not found in {headers}")

        with gzip.open(output_path, "wt", encoding="utf-8", newline="", compresslevel=6) as output:
            for row_number, row in enumerate(reader, 1):
                clean = {str(k): (v if v is not None else "") for k, v in row.items() if k is not None}
                region = field_by_normalized_name(clean, {"regionid", "region", "kodregiona", "regioncode"})
                if re.sub(r"\D", "", region) != REGION_CODE:
                    continue
                oktmo_raw = field_by_normalized_name(clean, {"oktmo", "oktmoactual", "oktmoasofdate"})
                oktmo = match_oktmo(oktmo_raw)
                if not oktmo:
                    continue

                year = get_year(clean)
                municipality_id, municipality_name = MUNICIPALITIES[oktmo]
                digest = hashlib.sha256(
                    json.dumps(clean, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
                ).hexdigest()
                unique_key = (oktmo, digest)
                if unique_key in seen:
                    continue
                seen.add(unique_key)

                value = field_by_normalized_name(clean, {"indicatorvalue", "значение", "value"})
                unit = field_by_normalized_name(clean, {"indicatorunit", "единицаизмерения", "unit"})
                period = field_by_normalized_name(clean, {"indicatorperiod", "период", "period"})
                record = {
                    "source": "rosstat_bdmo_processed_by_tochno",
                    "source_page": SOURCE_PAGE,
                    "source_archive": ARCHIVE_URL,
                    "source_member": member_name,
                    "source_published_at": PUBLISHED_AT,
                    "source_indicator_code": code,
                    "source_indicator_name": title,
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
                for field, field_value in clean.items():
                    if field_value and norm_header(field) not in {"значение", "value"}:
                        dimension_counts[field][field_value] += 1
                if len(samples) < 5:
                    samples.append(record)

    return {
        "indicator_code": code,
        "title": title,
        "member": member_name,
        "member_compressed_bytes": info.compress_size,
        "member_uncompressed_bytes": info.file_size,
        "status": "extracted" if rows else "no_region71_yugra_rows",
        "matched_rows": rows,
        "municipalities_matched": len(by_municipality),
        "missing_municipalities": [
            {"oktmo": oktmo, "municipality_id": municipality_id, "name": name}
            for oktmo, (municipality_id, name) in MUNICIPALITIES.items()
            if municipality_id not in by_municipality
        ],
        "rows_by_municipality": dict(sorted(by_municipality.items())),
        "rows_by_year": dict(sorted(by_year.items())),
        "csv_headers": headers,
        "dimension_fields": {
            field: dict(counter.most_common(50))
            for field, counter in dimension_counts.items()
        },
        "output_file": output_path.name,
        "sample_rows": samples,
    }

def main() -> int:
    out_dir = Path("demography-core-2026-extract")
    out_dir.mkdir(parents=True, exist_ok=True)
    remote = HttpRangeFile(ARCHIVE_URL)
    print(json.dumps({"archive_size_bytes": remote.size}, ensure_ascii=False), flush=True)

    results = []
    with zipfile.ZipFile(remote, mode="r") as outer:
        names = outer.namelist()
        for code, title in INDICATORS.items():
            results.append(extract_indicator_rows(outer, code, title, out_dir))

    report = {
        "ok": any(item["status"] == "extracted" for item in results),
        "source_page": SOURCE_PAGE,
        "source_archive": ARCHIVE_URL,
        "source_published_at": PUBLISHED_AT,
        "region_code": REGION_CODE,
        "expected_municipalities": 22,
        "total_rows": sum(int(item.get("matched_rows", 0)) for item in results),
        "range_requests": remote.requests,
        "archive_bytes_downloaded_via_ranges": remote.bytes_downloaded,
        "indicators": results,
        "note": "Only individual indicator CSV members were range-read from the 7 GB ZIP. No full archive download was performed. Data is extraction-only and not yet uploaded to Supabase.",
    }
    (out_dir / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "indicators"}, ensure_ascii=False), flush=True)
    for item in results:
        print(
            f"RESULT {item['indicator_code']} {item['status']} "
            f"{item.get('matched_rows', 0)} rows / {item.get('municipalities_matched', 0)} municipalities "
            f"years={item.get('rows_by_year', {})}",
            flush=True,
        )
    return 0 if report["ok"] else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
