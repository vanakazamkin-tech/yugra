#!/usr/bin/env python3
"""Range-extract HMAO employment source series from the current BDPMO section-32 ZIP.

The BDPMO display IDs 8423005/8423015 (and two other pairs) share an
underlying Rosstat form code. This extractor therefore stores each unique
source series once and preserves candidate BDPMO IDs plus every dimension.
Only the 22 project municipalities are retained; the nationwide ZIP is never
downloaded in full.
"""
from __future__ import annotations

import csv, gzip, hashlib, io, json, re, struct, sys, time
import urllib.error, urllib.request, zipfile, zlib
from collections import Counter, defaultdict
from pathlib import Path

ARCHIVE_URL = (
    "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/"
    "data_bdmo_118_v20260928/by_indicator/data_section32_112_v20260928.zip"
)
SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
PUBLISHED_AT = "2026-09-28"
REGION_CODE = "71"

SERIES = {
    "1134431020014": {
        "title": "Просроченная задолженность по заработной плате — всего",
        "bdmo_codes": ["8423001"],
    },
    "1134431020016": {
        "title": "Просроченная задолженность по заработной плате по причинам недостаточного финансирования",
        "bdmo_codes": ["8423002", "8423003", "8423004"],
    },
    "1121100010003": {
        "title": "Среднесписочная численность работников организаций",
        "bdmo_codes": ["8423005", "8423015"],
    },
    "2152320020022": {
        "title": "Фонд заработной платы работников организаций",
        "bdmo_codes": ["8423006", "8423016"],
    },
    "2211110020001": {
        "title": "Среднемесячная заработная плата работников организаций",
        "bdmo_codes": ["8423007", "8423017"],
    },
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
    match = re.search(r"(20\d{2})", value)
    return match.group(1) if match else ""

class HttpRangeFile(io.RawIOBase):
    def __init__(self, url: str, timeout: int = 90):
        self.url, self.timeout = url, timeout
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Yugra18-BDPMO-employment/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                raise RuntimeError(f"Archive HEAD returned HTTP {response.status}")
            self.size = int(response.headers.get("Content-Length", "0"))
        if self.size <= 0:
            raise RuntimeError("Archive HEAD did not expose Content-Length")
        self.position = 0
        self.requests = 0
        self.bytes_downloaded = 0

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset: int, whence: int = io.SEEK_SET):
        pos = offset if whence == io.SEEK_SET else (
            self.position + offset if whence == io.SEEK_CUR else self.size + offset
        )
        if pos < 0: raise ValueError("Negative seek position")
        self.position = min(pos, self.size)
        return self.position

    def read_range(self, start: int, end: int) -> bytes:
        if start < 0 or end < start or end >= self.size:
            raise ValueError(f"Invalid HTTP byte range {start}-{end}")
        expected = end - start + 1
        req = urllib.request.Request(self.url, headers={
            "User-Agent": "Yugra18-BDPMO-employment/1.0",
            "Range": f"bytes={start}-{end}",
        })
        last_error = None
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    if response.status != 206:
                        raise RuntimeError(
                            f"Range returned HTTP {response.status}; refusing a full ZIP download"
                        )
                    data = response.read()
                    content_range = response.headers.get("Content-Range", "")
                    if len(data) != expected or not content_range.startswith(f"bytes {start}-{end}/"):
                        raise RuntimeError(f"Unexpected range response {content_range}, {len(data)}/{expected} bytes")
                    self.requests += 1
                    self.bytes_downloaded += len(data)
                    return data
            except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
                last_error = exc
                if attempt < 4: time.sleep(min(2 ** attempt, 12))
        raise RuntimeError(f"HTTP Range failed for {start}-{end}: {last_error}")

    def read(self, size: int = -1) -> bytes:
        if self.position >= self.size: return b""
        if size is None or size < 0: size = self.size - self.position
        size = min(size, self.size - self.position)
        if size <= 0: return b""
        data = self.read_range(self.position, self.position + size - 1)
        self.position += len(data)
        return data

def extract_member(remote: HttpRangeFile, info: zipfile.ZipInfo, source_code: str,
                   series: dict, out_stream, state: dict) -> None:
    hdr = remote.read_range(info.header_offset, info.header_offset + 29)
    if len(hdr) != 30: raise RuntimeError(f"{source_code}: truncated ZIP header {info.filename}")
    fields = struct.unpack("<IHHHHHIIIHH", hdr)
    signature, _ver, _flags, compression, _tm, _dt, _crc, _cs, _us, name_len, extra_len = fields
    if signature != 0x04034B50 or compression != info.compress_type:
        raise RuntimeError(f"{source_code}: invalid ZIP local header {info.filename}")
    data_start = info.header_offset + 30 + name_len + extra_len
    compressed = remote.read_range(data_start, data_start + info.compress_size - 1)
    if len(compressed) != info.compress_size: raise RuntimeError(f"{source_code}: compressed member size mismatch")
    if info.compress_type == zipfile.ZIP_DEFLATED:
        csv_bytes = zlib.decompress(compressed, -15)
    elif info.compress_type == zipfile.ZIP_STORED:
        csv_bytes = compressed
    else:
        raise RuntimeError(f"{source_code}: unsupported ZIP compression {info.compress_type}")
    if len(csv_bytes) != info.file_size or (zlib.crc32(csv_bytes) & 0xFFFFFFFF) != info.CRC:
        raise RuntimeError(f"{source_code}: size/CRC validation failed for {info.filename}")

    with io.TextIOWrapper(io.BytesIO(csv_bytes), encoding="utf-8-sig", newline="") as text:
        reader = csv.DictReader(text, delimiter=";")
        if not reader.fieldnames: raise RuntimeError(f"{source_code}: missing CSV header {info.filename}")
        headers = list(reader.fieldnames)
        if not any("oktmo" in norm_header(h) for h in headers):
            raise RuntimeError(f"{source_code}: OKTMO column absent in {info.filename}")
        member_rows = 0
        for row in reader:
            clean = {str(k): (v if v is not None else "") for k, v in row.items() if k is not None}
            oktmo_raw = find_field(clean, {"oktmo", "kodoktmo", "oktmoactual", "oktmoasofdate"})
            oktmo = match_oktmo(oktmo_raw)
            if not oktmo: continue
            region = find_field(clean, {"regionid", "region", "kodregiona", "regioncode"})
            region_digits = re.sub(r"\D", "", region)
            if region_digits and region_digits != REGION_CODE: continue

            municipality_id, municipality_name = MUNICIPALITIES[oktmo]
            year = parse_year(clean)
            digest = hashlib.sha256(
                json.dumps(clean, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            if digest in state["seen"]: continue
            state["seen"].add(digest)
            record = {
                "source": "rosstat_bdmo_processed_by_tochno",
                "source_page": SOURCE_PAGE,
                "source_archive": ARCHIVE_URL,
                "source_member": info.filename,
                "source_published_at": PUBLISHED_AT,
                "source_indicator_code": source_code,
                "source_indicator_name": series["title"],
                "candidate_bdmo_indicator_codes": series["bdmo_codes"],
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
            if year: state["years"][year] += 1
            for k, v in clean.items():
                if v and norm_header(k) not in {"значение", "значениепоказателя", "indicatorvalue", "value"}:
                    state["dimensions"][k][str(v)] += 1
            if len(state["samples"]) < 8: state["samples"].append(record)
        state["members"].append({
            "filename": info.filename,
            "compressed_bytes": info.compress_size,
            "uncompressed_bytes": info.file_size,
            "retained_rows": member_rows,
            "crc32": "ok",
            "csv_headers": headers,
        })
        print(f"MEMBER {source_code} {info.filename}: {member_rows} HMAO rows; CRC32 ok", flush=True)

def main() -> int:
    out_dir = Path("employment-2026-extract")
    out_dir.mkdir(parents=True, exist_ok=True)
    remote = HttpRangeFile(ARCHIVE_URL)
    results = []
    with zipfile.ZipFile(remote, mode="r") as archive:
        csv_members = [x for x in archive.infolist() if x.filename.lower().endswith(".csv")]
        filenames = [x.filename for x in csv_members]
        (out_dir / "archive_csv_members.txt").write_text("\n".join(filenames), encoding="utf-8")
        for source_code, series in SERIES.items():
            search_tokens = [source_code, *series["bdmo_codes"]]
            matches = [
                item for item in csv_members
                if any(re.search(rf"(?<!\d){re.escape(token)}(?!\d)", item.filename) for token in search_tokens)
            ]
            state = {
                "rows": 0, "seen": set(), "municipalities": Counter(),
                "years": Counter(), "dimensions": defaultdict(Counter),
                "members": [], "samples": [],
            }
            out_file = out_dir / f"{source_code}_region71_rows.jsonl.gz"
            if not matches:
                results.append({
                    "source_indicator_code": source_code,
                    "title": series["title"],
                    "candidate_bdmo_codes": series["bdmo_codes"],
                    "status": "no_member_found",
                    "matched_members": [],
                    "matched_rows": 0,
                    "output_file": out_file.name,
                })
                continue
            with gzip.open(out_file, "wt", encoding="utf-8", newline="", compresslevel=6) as output:
                for info in matches:
                    extract_member(remote, info, source_code, series, output, state)
            results.append({
                "source_indicator_code": source_code,
                "title": series["title"],
                "candidate_bdmo_codes": series["bdmo_codes"],
                "status": "extracted" if state["rows"] else "no_region71_yugra_rows",
                "matched_members": [x["filename"] for x in state["members"]],
                "matched_rows": state["rows"],
                "municipalities_matched": len(state["municipalities"]),
                "missing_municipalities": [
                    {"oktmo": oktmo, "municipality_id": mid, "name": name}
                    for oktmo, (mid, name) in MUNICIPALITIES.items() if mid not in state["municipalities"]
                ],
                "rows_by_municipality": dict(sorted(state["municipalities"].items())),
                "rows_by_year": dict(sorted(state["years"].items())),
                "dimension_fields": {
                    field: dict(counter.most_common(60))
                    for field, counter in state["dimensions"].items()
                },
                "members": state["members"],
                "sample_rows": state["samples"],
                "output_file": out_file.name,
            })

    report = {
        "ok": any(x["status"] == "extracted" for x in results),
        "all_source_series_found": all(x["status"] == "extracted" for x in results),
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
            "Rows are grouped by unique underlying Rosstat form code. Candidate BDPMO IDs "
            "are preserved in raw records; paired IDs are not duplicated. All original dimensions retained. "
            "Only HMAO project municipality rows were range-extracted."
        ),
    }
    (out_dir / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "indicators"}, ensure_ascii=False, indent=2), flush=True)
    for x in results:
        print(f"RESULT {x['source_indicator_code']} {x['status']} {x['matched_rows']} rows", flush=True)
    return 0 if report["ok"] else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
