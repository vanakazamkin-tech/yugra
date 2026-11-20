#!/usr/bin/env python3
"""Range-extract HMAO employment indicators from the current BDPMO section-32 ZIP.

Only CSV members for the requested indicator IDs are fetched using HTTP Range.
The 22 project municipalities are retained; the nationwide archive is never
downloaded in full. All source dimensions remain in each raw record.
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
import zlib
from collections import Counter, defaultdict
from pathlib import Path

ARCHIVE_URL = (
    "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/"
    "data_bdmo_118_v20260928/by_indicator/data_section32_112_v20260928.zip"
)
SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
PUBLISHED_AT = "2026-09-28"
REGION_CODE = "71"

INDICATORS = {
    "8423001": "Просроченная задолженность по заработной плате — всего",
    "8423002": "Просроченная задолженность из-за несвоевременного получения средств из федерального бюджета",
    "8423003": "Просроченная задолженность из-за несвоевременного получения средств из бюджета субъекта РФ",
    "8423004": "Просроченная задолженность из-за несвоевременного получения средств из местных бюджетов",
    "8423005": "Среднесписочная численность работников организаций (без субъектов малого предпринимательства)",
    "8423006": "Фонд заработной платы всех работников организаций (без субъектов малого предпринимательства)",
    "8423007": "Среднемесячная заработная плата работников организаций (без субъектов малого предпринимательства)",
    "8423015": "Среднесписочная численность работников организаций муниципальной формы собственности",
    "8423016": "Фонд заработной платы работников организаций муниципальной формы собственности",
    "8423017": "Среднемесячная заработная плата работников организаций муниципальной формы собственности",
}

MUNICIPALITIES = {
    "71811000": ("beloyarsky-raion", "Белоярский район"),
    "71812000": ("berezovsky-raion", "Берёзовский район"),
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

def find_field(row: dict[str, str], names: set[str]) -> str:
    for key, value in row.items():
        if norm_header(key) in names:
            return str(value or "").strip()
    return ""

def match_oktmo(value: str) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if digits in MUNICIPALITIES:
        return digits
    if len(digits) == 11 and digits.endswith("000") and digits[:8] in MUNICIPALITIES:
        return digits[:8]
    return None

def parse_year(row: dict[str, str]) -> str:
    value = find_field(row, {"год", "year", "годнаблюдения", "отчетныйгод", "годпериода"})
    match = re.search(r"\b(20\d{2})\b", value)
    if match:
        return match.group(1)
    for key, raw in row.items():
        nk = norm_header(key)
        if nk in {"год", "year", "годнаблюдения", "отчетныйгод"}:
            match = re.search(r"(20\d{2})", str(raw or ""))
            if match:
                return match.group(1)
    return ""

class HttpRangeFile(io.RawIOBase):
    """Seekable, read-only ZIP source backed by strict HTTP Range requests."""
    def __init__(self, url: str, timeout: int = 90):
        self.url = url
        self.timeout = timeout
        request = urllib.request.Request(
            url, method="HEAD",
            headers={"User-Agent": "Yugra18-BDPMO-employment-extractor/1.0"},
        )
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
            pos = offset
        elif whence == io.SEEK_CUR:
            pos = self.position + offset
        elif whence == io.SEEK_END:
            pos = self.size + offset
        else:
            raise ValueError("Invalid seek origin")
        if pos < 0:
            raise ValueError("Negative seek position")
        self.position = min(pos, self.size)
        return self.position

    def read_range(self, start: int, end: int) -> bytes:
        if start < 0 or end < start or end >= self.size:
            raise ValueError(f"Invalid range {start}-{end}")
        expected = end - start + 1
        request = urllib.request.Request(
            self.url,
            headers={
                "User-Agent": "Yugra18-BDPMO-employment-extractor/1.0",
                "Range": f"bytes={start}-{end}",
            },
        )
        last_error = None
        for attempt in range(5):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    if response.status != 206:
                        raise RuntimeError(
                            f"Range request returned HTTP {response.status}; "
                            "refusing full archive download"
                        )
                    data = response.read()
                    content_range = response.headers.get("Content-Range", "")
                    if len(data) != expected or not content_range.startswith(f"bytes {start}-{end}/"):
                        raise RuntimeError(
                            f"Unexpected partial response: {content_range}; "
                            f"bytes={len(data)}, expected={expected}"
                        )
                    self.requests += 1
                    self.bytes_downloaded += len(data)
                    return data
            except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
                last_error = exc
                if attempt < 4:
                    time.sleep(min(2 ** attempt, 12))
        raise RuntimeError(f"HTTP Range failed for {start}-{end}: {last_error}")

    def read(self, size: int = -1) -> bytes:
        if self.position >= self.size:
            return b""
        if size is None or size < 0:
            size = self.size - self.position
        size = min(size, self.size - self.position)
        if size <= 0:
            return b""
        data = self.read_range(self.position, self.position + size - 1)
        self.position += len(data)
        return data

def extract_member(remote: HttpRangeFile, info: zipfile.ZipInfo, code: str, title: str,
                   out_stream, state: dict) -> None:
    local_header = remote.read_range(info.header_offset, info.header_offset + 29)
    if len(local_header) != 30:
        raise RuntimeError(f"{code}: truncated local ZIP header for {info.filename}")
    fields = struct.unpack("<IHHHHHIIIHH", local_header)
    signature, _version, _flags, compression, _time, _date, _crc, _csize, _usize, name_len, extra_len = fields
    if signature != 0x04034B50 or compression != info.compress_type:
        raise RuntimeError(f"{code}: invalid local ZIP header in {info.filename}")
    data_start = info.header_offset + 30 + name_len + extra_len
    compressed = remote.read_range(data_start, data_start + info.compress_size - 1)
    if len(compressed) != info.compress_size:
        raise RuntimeError(f"{code}: compressed-size mismatch in {info.filename}")
    if info.compress_type == zipfile.ZIP_DEFLATED:
        csv_bytes = zlib.decompress(compressed, -15)
    elif info.compress_type == zipfile.ZIP_STORED:
        csv_bytes = compressed
    else:
        raise RuntimeError(f"{code}: unsupported compression {info.compress_type}")
    if len(csv_bytes) != info.file_size or (zlib.crc32(csv_bytes) & 0xFFFFFFFF) != info.CRC:
        raise RuntimeError(f"{code}: ZIP size/CRC validation failed in {info.filename}")

    with io.TextIOWrapper(io.BytesIO(csv_bytes), encoding="utf-8-sig", newline="") as text:
        reader = csv.DictReader(text, delimiter=";")
        if not reader.fieldnames:
            raise RuntimeError(f"{code}: missing CSV headers in {info.filename}")
        headers = list(reader.fieldnames)
        normalized = {norm_header(h) for h in headers}
        if not any("oktmo" in h for h in normalized):
            raise RuntimeError(f"{code}: no OKTMO field in {info.filename}: {headers}")
        member_rows = 0
        for row in reader:
            clean = {str(k): (v if v is not None else "") for k, v in row.items() if k is not None}
            oktmo_raw = find_field(clean, {"oktmo", "kodoktmo", "oktmoactual", "oktmoasofdate"})
            oktmo = match_oktmo(oktmo_raw)
            if not oktmo:
                continue
            region = find_field(clean, {"regionid", "region", "kodregiona", "regioncode"})
            region_digits = re.sub(r"\D", "", region)
            if region_digits and region_digits != REGION_CODE:
                continue
            municipality_id, municipality_name = MUNICIPALITIES[oktmo]
            year = parse_year(clean)
            digest = hashlib.sha256(
                json.dumps(clean, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            if digest in state["seen"]:
                continue
            state["seen"].add(digest)

            value = find_field(clean, {
                "indicatorvalue", "значение", "значениепоказателя",
                "value", "значениеданных",
            })
            unit = find_field(clean, {
                "indicatorunit", "единицаизмерения", "unit", "единица",
            })
            period = find_field(clean, {
                "indicatorperiod", "период", "period", "отчетныйпериод",
            })
            record = {
                "source": "rosstat_bdmo_processed_by_tochno",
                "source_page": SOURCE_PAGE,
                "source_archive": ARCHIVE_URL,
                "source_member": info.filename,
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
            out_stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            member_rows += 1
            state["rows"] += 1
            state["municipalities"][municipality_id] += 1
            if year:
                state["years"][year] += 1
            for field, field_value in clean.items():
                if field_value and norm_header(field) not in {
                    "значение", "значениепоказателя", "indicatorvalue", "value",
                }:
                    state["dimensions"][field][str(field_value)] += 1
            if len(state["samples"]) < 6:
                state["samples"].append(record)
        state["members"].append({
            "filename": info.filename,
            "compressed_bytes": info.compress_size,
            "uncompressed_bytes": info.file_size,
            "rows_for_hmao_project": member_rows,
            "crc32": "ok",
        })
        print(
            f"MEMBER {code} {info.filename}: retained {member_rows} HMAO rows; CRC32 ok",
            flush=True,
        )

def main() -> int:
    out_dir = Path("employment-2026-extract")
    out_dir.mkdir(parents=True, exist_ok=True)
    remote = HttpRangeFile(ARCHIVE_URL)
    print(json.dumps({"archive_size_bytes": remote.size, "archive_url": ARCHIVE_URL}), flush=True)

    results = []
    with zipfile.ZipFile(remote, mode="r") as archive:
        csv_members = [
            item for item in archive.infolist()
            if item.filename.lower().endswith(".csv")
        ]
        for code, title in INDICATORS.items():
            matches = [
                item for item in csv_members
                if re.search(rf"(?<!\d){re.escape(code)}(?!\d)", item.filename)
            ]
            state = {
                "rows": 0,
                "seen": set(),
                "municipalities": Counter(),
                "years": Counter(),
                "dimensions": defaultdict(Counter),
                "members": [],
                "samples": [],
            }
            output_path = out_dir / f"{code}_region71_rows.jsonl.gz"
            if not matches:
                results.append({
                    "indicator_code": code,
                    "title": title,
                    "status": "no_member_found",
                    "matched_members": 0,
                    "matched_rows": 0,
                    "output_file": output_path.name,
                })
                continue
            with gzip.open(output_path, "wt", encoding="utf-8", newline="", compresslevel=6) as output:
                for info in matches:
                    extract_member(remote, info, code, title, output, state)

            result = {
                "indicator_code": code,
                "title": title,
                "status": "extracted" if state["rows"] else "no_region71_yugra_rows",
                "matched_members": len(matches),
                "matched_rows": state["rows"],
                "municipalities_matched": len(state["municipalities"]),
                "missing_municipalities": [
                    {"oktmo": oktmo, "municipality_id": mid, "name": name}
                    for oktmo, (mid, name) in MUNICIPALITIES.items()
                    if mid not in state["municipalities"]
                ],
                "rows_by_municipality": dict(sorted(state["municipalities"].items())),
                "rows_by_year": dict(sorted(state["years"].items())),
                "dimension_fields": {
                    field: dict(counter.most_common(50))
                    for field, counter in state["dimensions"].items()
                },
                "members": state["members"],
                "sample_rows": state["samples"],
                "output_file": output_path.name,
            }
            results.append(result)

    report = {
        "ok": any(x["status"] == "extracted" for x in results),
        "all_requested_indicators_found": all(x["status"] == "extracted" for x in results),
        "source_page": SOURCE_PAGE,
        "source_archive": ARCHIVE_URL,
        "source_published_at": PUBLISHED_AT,
        "region_code": REGION_CODE,
        "expected_municipalities": 22,
        "total_rows": sum(int(x.get("matched_rows", 0)) for x in results),
        "range_requests": remote.requests,
        "archive_bytes_downloaded_via_ranges": remote.bytes_downloaded,
        "indicators": results,
        "note": (
            "Only matching section-32 CSV members were range-read from the ZIP; "
            "the nationwide archive was not downloaded in full. Raw dimensions are preserved. "
            "The resulting rows are extraction-only and await Supabase staging upload/review."
        ),
    }
    (out_dir / "summary.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        json.dumps({k: v for k, v in report.items() if k != "indicators"},
                   ensure_ascii=False, indent=2),
        flush=True,
    )
    for item in results:
        print(
            f"RESULT {item['indicator_code']} {item['status']} "
            f"{item.get('matched_rows', 0)} rows / "
            f"{item.get('municipalities_matched', 0)} municipalities",
            flush=True,
        )
    return 0 if report["ok"] else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
