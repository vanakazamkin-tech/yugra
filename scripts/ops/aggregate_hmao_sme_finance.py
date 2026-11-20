#!/usr/bin/env python3
"""Aggregate HMAO SME counts and partial legal-entity financials from FNS-derived workbook.

Only aggregate municipal measures are written. Taxpayer IDs and registration
numbers are used transiently for deduplication and are never persisted.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import urllib.request
import zipfile
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
import openpyxl

URL="https://storage.yandexcloud.net/tochno-st-catalog/FNS/data_sme_153_v20260605/regions_xlsx/data_sme_153_region_%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B8%CC%86%D1%81%D0%BA%D0%B8%D0%B8%CC%86_%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B8%CC%86_%D0%BE%D0%BA%D1%80%D1%83%D0%B3_-_%D0%AE%D0%B3%D1%80%D0%B0_v20260605_xlsx.zip"
DATASET_PAGE="https://tochno.st/datasets/sme"
SOURCE_ID="tochno_fns_sme_hmao_v20260605"
ARCHIVE=Path("/tmp/hmao-sme-regional.zip")
XLSX=Path("/tmp/hmao-sme-entire.xlsx")
OUT=Path("fns-sme-regional-aggregates");OUT.mkdir(exist_ok=True)
COUNT_SNAPSHOT=dt.date(2025,12,10)
FINANCIAL_YEAR=2025

# FNS-derived settlement OKTMO codes have 11 digits; the first five digits
# identify the municipal entity. Prefixes are checked against the project's
# 22 municipalities and verified by the source's area/settlement fields.
OKTMO_PREFIX_TO_ID={
 "71811":"beloyarsky-raion","71812":"berezovsky-raion","71816":"kondinsky-raion",
 "71818":"nefteyugansky-raion","71819":"nizhnevartovsky-raion",
 "71821":"october-raion","71824":"sovetsky-raion","71826":"surgutsky",
 "71829":"khanty-mansiysky-raion","71871":"khanty-mansiysk","71872":"langepas",
 "71873":"megion","71874":"nefteyugansk","71875":"nizhnevartovsk",
 "71876":"surgut","71877":"raduzhny","71878":"uray","71879":"nyagan-city",
 "71883":"kogalym","71884":"pokachi","71885":"pyt-yah","71887":"ugorsk",
}
MUNICIPALITY_NAMES={
 "beloyarsky-raion":"Белоярский район","berezovsky-raion":"Берёзовский район",
 "kogalym":"Когалым","kondinsky-raion":"Кондинский район","langepas":"Лангепас",
 "megion":"Мегион","nefteyugansk":"Нефтеюганск","nefteyugansky-raion":"Нефтеюганский район",
 "nizhnevartovsk":"Нижневартовск","nizhnevartovsky-raion":"Нижневартовский район",
 "nyagan-city":"Нягань","october-raion":"Октябрьский район","pokachi":"Покачи",
 "pyt-yah":"Пыть-Ях","raduzhny":"Радужный","sovetsky-raion":"Советский район",
 "surgut":"Сургут","surgutsky":"Сургутский район","uray":"Урай",
 "khanty-mansiysk":"Ханты-Мансийск","khanty-mansiysky-raion":"Ханты-Мансийский район",
 "ugorsk":"Югорск",
}
CATEGORY_NAMES={"1":"micro","2":"small","3":"medium"}
TYPE_NAMES={"0":"legal_entity","1":"individual_entrepreneur_or_sole_trader"}

def as_text(value):
    if value is None:return ""
    if isinstance(value,float) and value.is_integer():return str(int(value))
    return str(value).strip()

def as_date(value):
    if value is None:return None
    if isinstance(value,dt.datetime):return value.date()
    if isinstance(value,dt.date):return value
    try:return dt.date.fromisoformat(str(value)[:10])
    except Exception:return None

def as_decimal(value):
    if value is None or str(value).strip()=="":return None
    try:
        d=Decimal(str(value).replace(",","." ))
        return d if d.is_finite() else None
    except InvalidOperation:return None

def mid_from_oktmo(code):
    digits="".join(ch for ch in as_text(code) if ch.isdigit())
    if len(digits)<5:return None
    return OKTMO_PREFIX_TO_ID.get(digits[:5])

def load_sheet(wb,name):
    ws=wb[name]
    iterator=ws.iter_rows(values_only=True)
    headers=[as_text(x) for x in next(iterator)]
    return ws,headers,{h:i for i,h in enumerate(headers)},iterator

def pick(row,index,key):
    i=index.get(key)
    return row[i] if i is not None and i<len(row) else None

def main():
    req=urllib.request.Request(URL,headers={"User-Agent":"Yugra18-SME-Regional-Aggregator/1.0"})
    with urllib.request.urlopen(req,timeout=900) as response, ARCHIVE.open("wb") as output:
        size=0
        while True:
            chunk=response.read(8*1024*1024)
            if not chunk:break
            output.write(chunk);size+=len(chunk)
            if size%(32*1024*1024)<len(chunk):
                print(f"Downloaded regional archive: {size:,} bytes",flush=True)
    digest=hashlib.sha256()
    with ARCHIVE.open("rb") as source:
        for chunk in iter(lambda:source.read(8*1024*1024),b""):digest.update(chunk)
    archive_sha=digest.hexdigest()

    with zipfile.ZipFile(ARCHIVE) as archive:
        member=next(n for n in archive.namelist() if n.startswith("entire/") and n.endswith(".xlsx"))
        with archive.open(member) as src,XLSX.open("wb") as dst:
            while True:
                chunk=src.read(8*1024*1024)
                if not chunk:break
                dst.write(chunk)
    workbook=openpyxl.load_workbook(XLSX,read_only=True,data_only=True)

    # Register counts: select unique FNS entities active on the 10.12.2025
    # registry date from the 2025 annual sheet. Keys remain in RAM only.
    ws,headers,index,rows=load_sheet(workbook,"2025")
    expected_cols={"tax_number","registration_number","year","sme_category","municipality_code",
                   "start_date","end_date","is_sole_trader","is_farmer","area","revenue",
                   "expenditure","employees_count"}
    missing=sorted(expected_cols-set(index))
    if missing:raise RuntimeError(f"Missing source columns: {missing}")

    active_records={}
    unknown_codes=Counter()
    area_counts=defaultdict(Counter)
    rows_2025=0
    for row in rows:
        if not row or all(v is None for v in row):continue
        rows_2025+=1
        tax_id=as_text(pick(row,index,"tax_number"))
        registration=as_text(pick(row,index,"registration_number"))
        if not tax_id:continue
        mid=mid_from_oktmo(pick(row,index,"municipality_code"))
        if not mid:
            code=as_text(pick(row,index,"municipality_code"))
            unknown_codes[code or "__blank__"]+=1
            continue
        start=as_date(pick(row,index,"start_date"))
        end=as_date(pick(row,index,"end_date"))
        if start and start>COUNT_SNAPSHOT:continue
        if end and end<COUNT_SNAPSHOT:continue
        # Prefer the unique registration number; TIN is a fallback only.
        key=(tax_id,registration or as_text(pick(row,index,"is_sole_trader")))
        area=as_text(pick(row,index,"area"))
        if area:area_counts[mid][area]+=1
        start_ord=start or dt.date.min
        rec={
            "municipality_id":mid,
            "oktmo":as_text(pick(row,index,"municipality_code")),
            "category":as_text(pick(row,index,"sme_category")),
            "entity_type":as_text(pick(row,index,"is_sole_trader")),
            "is_farmer":as_text(pick(row,index,"is_farmer")),
            "start_date":start_ord,
            "area":area,
        }
        previous=active_records.get(key)
        if previous is None or rec["start_date"]>previous["start_date"]:
            active_records[key]=rec

    counts={mid:Counter() for mid in MUNICIPALITY_NAMES}
    for rec in active_records.values():
        mid=rec["municipality_id"]
        counts[mid]["total"]+=1
        counts[mid]["category:"+rec["category"]]+=1
        counts[mid]["entity_type:"+rec["entity_type"]]+=1
        if rec["is_farmer"]=="1":counts[mid]["farm_head_flag"]+=1

    # Financial rows: 2025 values are available only for a subset of legal
    # entities. Deduplicate by registration id before summing; never equate
    # this incomplete revenue sum to turnover of all SMEs.
    ws,headers,index,rows=load_sheet(workbook,"2025")
    financial_records={}
    financial_unknown_codes=Counter()
    financial_rows=0
    for row in rows:
        if not row or all(v is None for v in row):continue
        financial_rows+=1
        tax_id=as_text(pick(row,index,"tax_number"))
        registration=as_text(pick(row,index,"registration_number"))
        if not tax_id:continue
        entity_type=as_text(pick(row,index,"is_sole_trader"))
        # Accounting revenue / expenditure / employees are for organisations,
        # not individual entrepreneurs. Keep the source's own form definition.
        if entity_type!="0":continue
        mid=mid_from_oktmo(pick(row,index,"municipality_code"))
        if not mid:
            code=as_text(pick(row,index,"municipality_code"))
            financial_unknown_codes[code or "__blank__"]+=1
            continue
        revenue=as_decimal(pick(row,index,"revenue"))
        expenditure=as_decimal(pick(row,index,"expenditure"))
        employees=as_decimal(pick(row,index,"employees_count"))
        start=as_date(pick(row,index,"start_date")) or dt.date.min
        key=(tax_id,registration or entity_type)
        rec={
            "municipality_id":mid,"revenue":revenue,"expenditure":expenditure,
            "employees":employees,"category":as_text(pick(row,index,"sme_category")),
            "start_date":start,
        }
        previous=financial_records.get(key)
        if previous is None or rec["start_date"]>previous["start_date"]:
            financial_records[key]=rec

    finance={mid:{"entities_with_financial_record":0,"revenue_records":0,
                  "expenditure_records":0,"employee_records":0,
                  "revenue_sum_rub":Decimal(0),"expenditure_sum_rub":Decimal(0),
                  "employees_sum":Decimal(0),"negative_revenue_records":0,
                  "negative_expenditure_records":0,"category_revenue":Counter()}
             for mid in MUNICIPALITY_NAMES}
    for rec in financial_records.values():
        mid=rec["municipality_id"];acc=finance[mid]
        if rec["revenue"] is not None:
            acc["revenue_records"]+=1;acc["revenue_sum_rub"]+=rec["revenue"]
            if rec["revenue"]<0:acc["negative_revenue_records"]+=1
            acc["category_revenue"][rec["category"]]+=rec["revenue"]
        if rec["expenditure"] is not None:
            acc["expenditure_records"]+=1;acc["expenditure_sum_rub"]+=rec["expenditure"]
            if rec["expenditure"]<0:acc["negative_expenditure_records"]+=1
        if rec["employees"] is not None:
            acc["employee_records"]+=1;acc["employees_sum"]+=rec["employees"]
        if rec["revenue"] is not None or rec["expenditure"] is not None or rec["employees"] is not None:
            acc["entities_with_financial_record"]+=1

    missing_municipalities=sorted(mid for mid in MUNICIPALITY_NAMES if counts[mid]["total"]==0)
    if missing_municipalities:
        raise RuntimeError(f"Missing municipality counts in 2025 registry snapshot: {missing_municipalities}")

    output_counts={}
    for mid in sorted(MUNICIPALITY_NAMES):
        output_counts[mid]={
            "name":MUNICIPALITY_NAMES[mid],
            "sme_total":counts[mid]["total"],
            "categories":{k.split(":",1)[1]:v for k,v in counts[mid].items() if k.startswith("category:")},
            "entity_types":{k.split(":",1)[1]:v for k,v in counts[mid].items() if k.startswith("entity_type:")},
            "farm_head_flag":counts[mid]["farm_head_flag"],
            "area_names":dict(area_counts[mid].most_common(20)),
            "financial": {
                **{k:(str(v) if isinstance(v,Decimal) else v) for k,v in finance[mid].items() if k!="category_revenue"},
                "category_revenue_rub":{k:str(v) for k,v in finance[mid]["category_revenue"].items()},
                "scope":"legal entities with reported accounting data only; incomplete; not total SME turnover",
            },
        }
    report={
        "status":"aggregated",
        "source_page":DATASET_PAGE,
        "source_archive_url":URL,
        "dataset_version":"20260605",
        "registry_snapshot_date":COUNT_SNAPSHOT.isoformat(),
        "financial_year":FINANCIAL_YEAR,
        "archive_sha256":archive_sha,
        "archive_size_bytes":size,
        "source_rows_2025":rows_2025,
        "financial_rows_read":financial_rows,
        "unique_active_register_entities":len(active_records),
        "unique_legal_entities_in_financial_panel":len(financial_records),
        "municipality_count":len(MUNICIPALITY_NAMES),
        "municipalities":output_counts,
        "unknown_2025_okrmo_code_counts":dict(unknown_codes.most_common(100)),
        "unknown_financial_okrmo_code_counts":dict(financial_unknown_codes.most_common(100)),
        "privacy_note":"Taxpayer identifiers and business names are processed only in memory for deduplication and are not written to report or database.",
        "limitations":[
            "Municipality crosswalk uses the first five digits of settlement-level OKTMO to map to the 22 canonical municipal prefixes; region-level/unmapped codes are excluded and reported separately.",
            "SME revenue/expenditure/employees fields cover legal entities only and are incomplete; they must not be presented as full SME turnover.",
            "Registered address is not necessarily the place of business.",
            "Revenue may contain negative or implausible values; negative record counts are retained for quality review.",
            "This derived dataset version is 05.06.2026; it is not the newer official FNS snapshot of 10.11.2026."
        ],
    }
    (OUT/"fns-sme-regional-aggregates.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    summary={k:report[k] for k in ("status","dataset_version","registry_snapshot_date","financial_year",
        "archive_size_bytes","source_rows_2025","unique_active_register_entities",
        "unique_legal_entities_in_financial_panel","municipality_count","unknown_2025_okrmo_code_counts",
        "unknown_financial_okrmo_code_counts")}
    print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
    workbook.close()
    ARCHIVE.unlink(missing_ok=True);XLSX.unlink(missing_ok=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print(f"ERROR: {exc}",flush=True)
        raise
