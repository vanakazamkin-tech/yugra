#!/usr/bin/env python3
"""Upload aggregate FNS SME counts for the 22 Yugra municipalities to staging."""
from __future__ import annotations
import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AGG_PATH=Path("fns-sme-full-aggregation/fns-sme-aggregates.json")
BASE_URL=os.getenv("SUPABASE_URL","https://dmbikidqikjupkghywbz.supabase.co").rstrip("/")
API_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY","").strip()
SOURCE_ID="fns_unified_sme_register_2026_11"
ZIP_URL="https://file.nalog.ru/opendata/7707329152-rsmp/data-10112026-structure-12052026.zip"
SNAPSHOT="2026-11-10"
BATCH_SIZE=100
TYPE_MAP={"1":"legal_entity","2":"individual_entrepreneur","3":"farm_head"}
CATEGORY_MAP={"1":"micro","2":"small","3":"medium"}

MEASURES=[
    ("sme_entities_count_fns","Субъекты МСП, всего по Единому реестру ФНС","total","единиц"),
    ("sme_legal_entities_count_fns","Юридические лица в Едином реестре МСП ФНС","kind:1","единиц"),
    ("sme_individual_entrepreneurs_count_fns","Индивидуальные предприниматели в Едином реестре МСП ФНС","kind:2","единиц"),
    ("sme_farm_heads_count_fns","Главы крестьянских (фермерских) хозяйств в Едином реестре МСП ФНС","kind:3","единиц"),
    ("sme_microenterprise_count_fns","Микропредприятия в Едином реестре МСП ФНС","category:1","единиц"),
    ("sme_small_enterprise_count_fns","Малые предприятия в Едином реестре МСП ФНС","category:2","единиц"),
    ("sme_medium_enterprise_count_fns","Средние предприятия в Едином реестре МСП ФНС","category:3","единиц"),
]

def request_json(url: str, payload: list[dict]) -> None:
    body=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")
    req=urllib.request.Request(url,data=body,headers={
        "apikey":API_KEY,"Authorization":f"Bearer {API_KEY}",
        "Content-Type":"application/json","Accept-Profile":"public",
        "Content-Profile":"public",
        "Prefer":"resolution=ignore-duplicates,return=minimal",
    },method="POST")
    last_error=None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req,timeout=120) as response:
                if response.status not in (200,201,204):
                    raise RuntimeError(f"Unexpected Supabase HTTP {response.status}")
                return
        except urllib.error.HTTPError as exc:
            detail=exc.read(3000).decode("utf-8","replace")
            last_error=f"HTTP {exc.code}: {detail}"
            if exc.code not in (408,425,429,500,502,503,504):
                raise RuntimeError(last_error)
        except (urllib.error.URLError,TimeoutError) as exc:
            last_error=str(exc)
        if attempt<4:time.sleep(min(2**attempt,20))
    raise RuntimeError(f"Supabase request failed: {last_error}")

def main():
    if not API_KEY:raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    report=json.loads(AGG_PATH.read_text(encoding="utf-8"))
    if report.get("status")!="aggregated":
        raise RuntimeError("FNS aggregate report has unexpected status")
    if report.get("snapshot_date")!=SNAPSHOT:
        raise RuntimeError(f"Unexpected snapshot {report.get('snapshot_date')}")
    if report.get("unmapped_region86_records")!=0 or report.get("missing_municipality_ids"):
        raise RuntimeError("Refusing incomplete municipal aggregates")
    if report.get("invalid_type_codes") or report.get("invalid_category_codes"):
        raise RuntimeError("Unknown FNS type/category code")
    if report.get("snapshot_date_warning"):
        raise RuntimeError(report["snapshot_date_warning"])

    rows=[]
    total_records=0
    municipal_summaries={}
    for mid,municipality_name in sorted(report["municipality_names"].items()):
        type_counts=report["entity_type_counts_by_municipality"].get(mid,{})
        cat_counts=report["category_counts_by_municipality"].get(mid,{})
        cross=report["type_category_counts_by_municipality"].get(mid,{})
        total=sum(int(v) for v in type_counts.values())
        category_total=sum(int(v) for v in cat_counts.values())
        if total!=category_total:
            raise RuntimeError(f"Type/category totals mismatch for {mid}: {total} vs {category_total}")
        if set(type_counts)-set(TYPE_MAP):
            raise RuntimeError(f"Unexpected FNS entity kind for {mid}")
        if set(cat_counts)-set(CATEGORY_MAP):
            raise RuntimeError(f"Unexpected FNS SME category for {mid}")
        total_records+=total
        municipal_summaries[mid]={
            "total":total,
            "entity_types":type_counts,
            "categories":cat_counts,
            "type_category_cross":cross,
        }
        values={
            "total":total,
            "kind:1":int(type_counts.get("1",0)),
            "kind:2":int(type_counts.get("2",0)),
            "kind:3":int(type_counts.get("3",0)),
            "category:1":int(cat_counts.get("1",0)),
            "category:2":int(cat_counts.get("2",0)),
            "category:3":int(cat_counts.get("3",0)),
        }
        for measure_code,measure_name,selector,unit in MEASURES:
            value=values[selector]
            rec_key=f"fns-sme:{SNAPSHOT}:{mid}:{measure_code}"
            rows.append({
                "source_id":SOURCE_ID,
                "source_record_key":rec_key,
                "raw_record":{
                    "source":"ФНС России, Единый реестр субъектов МСП",
                    "source_snapshot_date":SNAPSHOT,
                    "municipality_id":mid,
                    "municipality_name":municipality_name,
                    "measure_code":measure_code,
                    "aggregate_value":value,
                    "source_record_count_for_municipality":total,
                    "entity_type_codes":TYPE_MAP,
                    "sme_category_codes":CATEGORY_MAP,
                    "type_category_cross":cross,
                    "source_zip_url":ZIP_URL,
                    "source_zip_sha256":report.get("zip_sha256"),
                    "privacy_note":"Only aggregate counts; no taxpayer-level identifiers or personal data.",
                },
                "raw_municipality_name":municipality_name,
                "raw_oktmo":None,
                "raw_indicator_name":measure_name,
                "raw_indicator_code":measure_code,
                "raw_year":2026,
                "raw_period":"На 10.11.2026, дата среза реестра",
                "raw_value":str(value),
                "raw_unit":unit,
                "mapped_municipality_id":mid,
                "mapped_indicator_code":None,
                "normalized_value":None,
                "normalized_unit":None,
                "normalized_period":None,
                "geographic_level":"municipality",
                "review_status":"pending",
                "validation_errors":[],
                "source_url_snapshot":ZIP_URL,
                "source_published_at":SNAPSHOT,
                "source_retrieved_at":datetime.now(timezone.utc).isoformat(),
            })
    if len(report["municipality_names"])!=22:
        raise RuntimeError(f"Expected 22 municipality names; found {len(report['municipality_names'])}")
    if len(rows)!=22*len(MEASURES):
        raise RuntimeError(f"Expected {22*len(MEASURES)} output rows; found {len(rows)}")

    endpoint=BASE_URL+"/rest/v1/municipality_indicator_import_staging?"+urllib.parse.urlencode({"on_conflict":"source_id,source_record_key"})
    batches=[rows[i:i+BATCH_SIZE] for i in range(0,len(rows),BATCH_SIZE)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures=[pool.submit(request_json,endpoint,batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            future.result()

    patch_url=BASE_URL+"/rest/v1/data_sources?"+urllib.parse.urlencode({"id":f"eq.{SOURCE_ID}"})
    patch_body=json.dumps({
        "import_status":"partially_imported",
        "last_checked_at":datetime.now(timezone.utc).isoformat(),
        "retrieved_at":datetime.now(timezone.utc).isoformat(),
        "updated_at":datetime.now(timezone.utc).isoformat(),
        "notes":(
            "Полный срез ФНС 10.11.2026 агрегирован по всем 22 муниципалитетам и загружен в staging: "
            "154 наблюдения (7 мер на МО), только агрегированные counts. Все строки pending, "
            "без нормализации/аналитического переноса. Архив SHA-256: "+str(report.get("zip_sha256"))+"."
        ),
    },ensure_ascii=False).encode("utf-8")
    req=urllib.request.Request(patch_url,data=patch_body,headers={
        "apikey":API_KEY,"Authorization":f"Bearer {API_KEY}",
        "Content-Type":"application/json","Accept-Profile":"public",
        "Content-Profile":"public","Prefer":"return=minimal",
    },method="PATCH")
    with urllib.request.urlopen(req,timeout=120) as response:
        if response.status not in (200,204):raise RuntimeError(f"Unexpected source update HTTP {response.status}")

    out={
        "status":"uploaded_to_review_staging",
        "snapshot_date":SNAPSHOT,
        "aggregate_record_count":total_records,
        "municipality_count":22,
        "staging_rows":len(rows),
        "staging_rows_by_measure":{code:22 for code,_,_,_ in MEASURES},
        "all_pending":True,
        "no_taxpayer_level_data":True,
        "source_zip_sha256":report.get("zip_sha256"),
    }
    (AGG_PATH.parent/"fns-sme-upload-status.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2),flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print(f"ERROR: {exc}",file=sys.stderr,flush=True)
        raise
