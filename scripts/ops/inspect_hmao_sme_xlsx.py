#!/usr/bin/env python3
"""Download and inspect the HMAO-only FNS SME workbook without exposing records."""
from __future__ import annotations
import json,urllib.request,zipfile,os,hashlib
from collections import Counter
from pathlib import Path
import openpyxl

URL="https://storage.yandexcloud.net/tochno-st-catalog/FNS/data_sme_153_v20260605/regions_xlsx/data_sme_153_region_%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B8%CC%86%D1%81%D0%BA%D0%B8%D0%B8%CC%86_%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B8%CC%86_%D0%BE%D0%BA%D1%80%D1%83%D0%B3_-_%D0%AE%D0%B3%D1%80%D0%B0_v20260605_xlsx.zip"
OUT=Path("sme-regional-probe");OUT.mkdir(exist_ok=True)
ARCHIVE=Path("/tmp/hmao-sme-regional.zip")

def main():
    req=urllib.request.Request(URL,headers={"User-Agent":"Yugra18-SME-regional/1.0"})
    with urllib.request.urlopen(req,timeout=900) as r, ARCHIVE.open("wb") as out:
        total=0
        while True:
            block=r.read(8*1024*1024)
            if not block:break
            out.write(block);total+=len(block)
            if total%(32*1024*1024)<len(block):print(f"downloaded {total:,} bytes",flush=True)
    archive_sha=hashlib.sha256()
    with ARCHIVE.open("rb") as stream:
        for block in iter(lambda:stream.read(8*1024*1024),b""):archive_sha.update(block)
    with zipfile.ZipFile(ARCHIVE) as outer:
        name=next(n for n in outer.namelist() if n.startswith("entire/") and n.endswith(".xlsx"))
        xlsx_path=Path("/tmp/hmao-sme-entire.xlsx")
        with outer.open(name) as src,xlsx_path.open("wb") as dst:
            while True:
                block=src.read(8*1024*1024)
                if not block:break
                dst.write(block)
    wb=openpyxl.load_workbook(xlsx_path,read_only=True,data_only=True)
    report={"dataset_version":"20260605","archive_bytes":total,"archive_sha256":archive_sha.hexdigest(),
      "workbook_sheetnames":wb.sheetnames,"inner_xlsx_member":name}
    sheet_reports=[]
    safe_field_candidates={
      "tax_number","year","is_sole_trader","sme_category","municipality_code",
      "start_date","end_date","revenue","expenditure","employees_count"
    }
    for ws in wb.worksheets:
        rows=ws.iter_rows(values_only=True)
        first=next(rows,None)
        if first is None:continue
        headers=[str(x).strip() if x is not None else "" for x in first]
        index={h:i for i,h in enumerate(headers)}
        missing=sorted(safe_field_candidates-set(index))
        field_counts={k:Counter() for k in ("municipality_code","is_sole_trader","sme_category","year")}
        field_ranges={k:{"min":None,"max":None,"nonempty":0} for k in ("start_date","end_date","revenue","expenditure","employees_count")}
        row_count=0
        for row in rows:
            if not row or all(v is None for v in row):continue
            row_count+=1
            for key in field_counts:
                i=index.get(key)
                if i is not None and i<len(row) and row[i] is not None:
                    value=str(row[i]).strip()
                    if len(field_counts[key])<1000 or value in field_counts[key]:
                        field_counts[key][value]+=1
            for key in field_ranges:
                i=index.get(key)
                if i is not None and i<len(row) and row[i] is not None:
                    value=row[i];stats=field_ranges[key];stats["nonempty"]+=1
                    if isinstance(value,(int,float)):
                        stats["min"]=value if stats["min"] is None else min(stats["min"],value)
                        stats["max"]=value if stats["max"] is None else max(stats["max"],value)
                    else:
                        val=str(value)
                        stats["min"]=val if stats["min"] is None else min(stats["min"],val)
                        stats["max"]=val if stats["max"] is None else max(stats["max"],val)
        sheet_reports.append({
          "sheet":ws.title,"max_row_metadata":ws.max_row,"max_column_metadata":ws.max_column,
          "header_columns":headers,"missing_expected_columns":missing,
          "rows_counted":row_count,
          "municipality_code_counts":dict(sorted(field_counts["municipality_code"].items())),
          "entity_type_counts":dict(field_counts["is_sole_trader"]),
          "sme_category_counts":dict(field_counts["sme_category"]),
          "year_counts":dict(field_counts["year"]),
          "safe_field_ranges":field_ranges,
        })
    wb.close()
    report["sheets"]=sheet_reports
    (OUT/"schema-inspection.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
    ARCHIVE.unlink(missing_ok=True);xlsx_path.unlink(missing_ok=True)
if __name__=="__main__":main()
