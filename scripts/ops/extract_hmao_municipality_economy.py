#!/usr/bin/env python3
"""Range-extract Stage 3 economic BDPMO data for the 22 Yugra municipalities.

Only requested CSV members are fetched from the nationwide ZIP archives.
Original dimensions (OKVED2, funding sources, ownership, organisational form,
period) are retained verbatim for later normalization.
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

BASE = "https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/"
VERSION = "20260928"
SOURCE_PAGE = "https://tochno.st/datasets/bdmo"
PUBLISHED_AT = "2026-09-28"
REGION_CODE = "71"
OUT_DIR = Path("economy-2026-extract")

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

# Section -> (source_id, indicator code -> [Rosstat form code, title]).
SECTIONS = {
    "9": {
        "source_id": "tochno_bdmo_hmao_s09_investment_20260928",
        "indicators": {
            "8009001": ("1141100020001", "Инвестиции в основной капитал за счет средств местных бюджетов"),
            "8109001": ("1141100020001", "Инвестиции в основной капитал организаций на территории муниципального образования без субъектов малого предпринимательства"),
            "8109002": ("1141100020001", "Инвестиции в основной капитал организаций муниципальной формы собственности"),
        },
    },
    "2": {
        "source_id": "tochno_bdmo_hmao_s02_retail_20260928",
        "indicators": {
            "8401003": ("1341100020003", "Оборот розничной торговли без субъектов малого предпринимательства"),
            "8801004": ("1341100020034", "Общий объем всех продовольственных товаров, реализованных в границах муниципального образования"),
        },
    },
    "39": {
        "source_id": "tochno_bdmo_hmao_s39_enterprise_20260928",
        "indicators": {
            "8401011": ("2131100020045", "Отгружено товаров собственного производства, выполнено работ и услуг собственными силами без субъектов малого предпринимательства"),
            "8401012": ("2135000020005", "Продано товаров несобственного производства без субъектов малого предпринимательства"),
            "8401008": ("2131100020045", "Отгружено товаров собственного производства по организациям промышленного производства со средней численностью работников свыше 15 человек"),
            "9010002": ("1351000010004", "Количество организаций по данным государственной регистрации"),
            "9010003": ("1351000010106", "Количество индивидуальных предпринимателей по данным государственной регистрации"),
        },
    },
    "41": {
        "source_id": "tochno_bdmo_hmao_s41_efficiency_20260928",
        "indicators": {
            "8109003": ("1141100020014", "Объем инвестиций в основной капитал за исключением бюджетных средств в расчете на 1 жителя"),
        },
    },
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
    value = find_field(row, {
        "год", "year", "годнаблюдения", "отчетныйгод", "годпериода",
        "периоднаблюдения", "период",
    })
    match = re.search(r"(20\d{2})", value)
    return match.group(1) if match else ""

class HttpRangeFile(io.RawIOBase):
    def __init__(self, url: str, timeout: int = 90):
        self.url, self.timeout = url, timeout
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Yugra18-BDPMO-economy/1.0"})
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
            "User-Agent": "Yugra18-BDPMO-economy/1.0",
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

def extract_member(remote: HttpRangeFile, info: zipfile.ZipInfo, section: str,
                   indicator_code: str, form_code: str, title: str, out_stream,
                   state: dict, seen: set[str]) -> None:
    hdr = remote.read_range(info.header_offset, info.header_offset + 29)
    if len(hdr) != 30: raise RuntimeError(f"{indicator_code}: truncated ZIP header {info.filename}")
    fields = struct.unpack("<IHHHHHIIIHH", hdr)
    signature, _ver, _flags, compression, _tm, _dt, _crc, _cs, _us, name_len, extra_len = fields
    if signature != 0x04034B50 or compression != info.compress_type:
        raise RuntimeError(f"{indicator_code}: invalid ZIP local header {info.filename}")
    data_start = info.header_offset + 30 + name_len + extra_len
    compressed = remote.read_range(data_start, data_start + info.compress_size - 1)
    if len(compressed) != info.compress_size:
        raise RuntimeError(f"{indicator_code}: compressed member size mismatch")
    if info.compress_type == zipfile.ZIP_DEFLATED:
        csv_bytes = zlib.decompress(compressed, -15)
    elif info.compress_type == zipfile.ZIP_STORED:
        csv_bytes = compressed
    else:
        raise RuntimeError(f"{indicator_code}: unsupported ZIP compression {info.compress_type}")

    if len(csv_bytes) != info.file_size or (zlib.crc32(csv_bytes) & 0xFFFFFFFF) != info.CRC:
        raise RuntimeError(f"{indicator_code}: size/CRC validation failed for {info.filename}")

    with io.TextIOWrapper(io.BytesIO(csv_bytes), encoding="utf-8-sig", newline="") as text:
        reader = csv.DictReader(text, delimiter=";")
        if not reader.fieldnames: raise RuntimeError(f"{indicator_code}: missing CSV header {info.filename}")
        headers = list(reader.fieldnames)
        if not any("oktmo" in norm_header(h) for h in headers):
            raise RuntimeError(f"{indicator_code}: OKTMO column absent in {info.filename}")
        member_rows = 0
        for row in reader:
            clean = {str(k): (v if v is not None else "") for k, v in row.items() if k is not None}
            oktmo_raw = find_field(clean, {
                "oktmo", "kodoktmo", "oktmoactual", "oktmoasofdate", "oktmostable",
            })
            oktmo = match_oktmo(oktmo_raw)
            if not oktmo: continue
            region = find_field(clean, {"regionid", "region", "kodregiona", "regioncode"})
            region_digits = re.sub(r"\D", "", region)
            if region_digits and region_digits != REGION_CODE: continue

            municipality_id, municipality_name = MUNICIPALITIES[oktmo]
            year = parse_year(clean)
            digest = hashlib.sha256(json.dumps(
                {"source_member": info.filename, "record": clean},
                ensure_ascii=False, sort_keys=True, separators=(",", ":")
            ).encode("utf-8")).hexdigest()

            if digest in seen:
                continue
            seen.add(digest)
            record = {
                "source": "rosstat_bdmo_processed_by_tochno",
                "source_page": SOURCE_PAGE,
                "source_archive": remote.url,
                "source_member": info.filename,
                "source_published_at": PUBLISHED_AT,
                "source_section": section,
                "source_indicator_code": indicator_code,
                "source_indicator_name": title,
                "rosstat_form_code": form_code,
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
            for key, value in clean.items():
                if value:
                    state["dimensions"][key][str(value)] += 1
            if len(state["samples"]) < 5: state["samples"].append(record)

        state["members"].append({
            "filename": info.filename,
            "compressed_bytes": info.compress_size,
            "uncompressed_bytes": info.file_size,
            "retained_rows": member_rows,
            "crc32": "ok",
            "csv_headers": headers,
        })
        print(f"SECTION {section} INDICATOR {indicator_code} MEMBER {info.filename}: {member_rows} Yugra rows; CRC32 ok", flush=True)

def extract_section(section: str, config: dict) -> dict:
    archive_url = BASE + f"data_bdmo_118_v{VERSION}/by_indicator/data_section{section}_112_v{VERSION}.zip"
    remote = HttpRangeFile(archive_url)
    section_dir = OUT_DIR / f"section-{section}"
    section_dir.mkdir(parents=True, exist_ok=True)
    results = []
    with zipfile.ZipFile(remote, mode="r") as archive:
        csv_members = [x for x in archive.infolist() if x.filename.lower().endswith(".csv")]
        (section_dir / "archive_csv_members.txt").write_text(
            "\n".join(x.filename for x in csv_members), encoding="utf-8"
        )
        for code, (form_code, title) in config["indicators"].items():
            token = f"Y4{code}"
            matches = [item for item in csv_members if token in item.filename]
            hmao_parts = [
                item for item in matches if re.search(r"_region71(?:_|\.|$)", item.filename)
            ]
            whole_members = [item for item in matches if "parts/" not in item.filename.lower()]
            if hmao_parts:
                selected = hmao_parts
                selection_mode = "region71_parts"
            elif whole_members:
                selected = whole_members
                selection_mode = "whole_member"
            else:
                selected = matches
                selection_mode = "year_or_other_parts"

            state = {
                "rows": 0, "municipalities": Counter(), "years": Counter(),
                "dimensions": defaultdict(Counter), "members": [], "samples": [],
            }
            outfile = section_dir / f"{code}_region71_rows.jsonl.gz"
            if not selected:
                results.append({
                    "source_indicator_code": code, "rosstat_form_code": form_code,
                    "title": title, "status": "no_member_found",
                    "matched_members": [], "matched_rows": 0,
                    "output_file": str(outfile.relative_to(OUT_DIR)),
                })
                continue

            seen = set()
            with gzip.open(outfile, "wt", encoding="utf-8", newline="", compresslevel=6) as output:
                for info in selected:
                    # Row hashes remove any overlapping period/year parts.
                    extract_member(remote, info, section, code, form_code, title, output, state, seen)

            # The state counters above are member-level and can include overlaps. Re-read the deduplicated output.
            actual_rows = 0
            actual_municipalities = Counter()
            actual_years = Counter()
            with gzip.open(outfile, "rt", encoding="utf-8") as stream:
                for line in stream:
                    if not line.strip(): continue
                    record = json.loads(line)
                    actual_rows += 1
                    actual_municipalities[record["municipality_id"]] += 1
                    if record["year"]: actual_years[record["year"]] += 1

            results.append({
                "source_indicator_code": code,
                "rosstat_form_code": form_code,
                "title": title,
                "status": "extracted" if actual_rows else "no_region71_yugra_rows",
                "matched_members": [x["filename"] for x in state["members"]],
                "matched_member_selection": selection_mode,
                "matched_rows": actual_rows,
                "municipalities_matched": len(actual_municipalities),
                "missing_municipalities": [
                    {"oktmo": oktmo, "municipality_id": mid, "name": name}
                    for oktmo, (mid, name) in MUNICIPALITIES.items()
                    if mid not in actual_municipalities
                ],
                "rows_by_municipality": dict(sorted(actual_municipalities.items())),
                "rows_by_year": dict(sorted(actual_years.items())),
                "dimension_fields": {
                    field: dict(counter.most_common(40))
                    for field, counter in state["dimensions"].items()
                },
                "members": state["members"],
                "sample_rows": state["samples"][:3],
                "output_file": str(outfile.relative_to(OUT_DIR)),
            })

    return {
        "section": section,
        "source_id": config["source_id"],
        "source_archive": archive_url,
        "archive_size_bytes": remote.size,
        "range_requests": remote.requests,
        "archive_bytes_downloaded_via_ranges": remote.bytes_downloaded,
        "archive_csv_member_count": len(csv_members),
        "indicators": results,
        "total_rows": sum(x["matched_rows"] for x in results),
    }

def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sections = []
    errors = []
    for section, config in SECTIONS.items():
        try:
            print(f"Starting section {section}", flush=True)
            result = extract_section(section, config)
            sections.append(result)
            print(f"Completed section {section}: {result['total_rows']} rows", flush=True)
        except Exception as exc:
            errors.append({"section": section, "error": str(exc)})
            print(f"ERROR in section {section}: {exc}", file=sys.stderr, flush=True)

    total_rows = sum(x["total_rows"] for x in sections)
    report = {
        "ok": total_rows > 0,
        "source_page": SOURCE_PAGE,
        "source_published_at": PUBLISHED_AT,
        "region_code": REGION_CODE,
        "expected_municipalities": 22,
        "total_rows": total_rows,
        "sections": sections,
        "errors": errors,
        "note": (
            "Only exact current project OKTMO codes and region 71 were selected. "
            "All CSV member payloads were decompressed and checked against ZIP size/CRC32. "
            "Original OKVED2, funding, ownership, organisational-form and period dimensions are preserved. "
            "Missing rows are not interpreted as zero."
        ),
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "ok": report["ok"], "total_rows": total_rows,
        "sections": [{ "section": x["section"], "rows": x["total_rows"],
                       "archive_bytes": x["archive_size_bytes"],
                       "range_requests": x["range_requests"] } for x in sections],
        "errors": errors,
    }, ensure_ascii=False, indent=2), flush=True)
    for section in sections:
        for item in section["indicators"]:
            print(f"RESULT {section['section']} {item['source_indicator_code']} {item['status']} {item['matched_rows']}", flush=True)
    return 0 if report["ok"] else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
