#!/usr/bin/env python3
"""Stage historical HMAO SME counts from FNS-derived regional dataset (v20260605).

Only municipality-level aggregate counts are uploaded. The financial panel
from this dataset is intentionally not staged as SME turnover: revenue is
available only for a subset of legal entities and contains known quality
issues. It remains a diagnostic source for later methodology review.
"""
from __future__ import annotations
import concurrent.futures, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPORT=Path(".ops-results/fns-sme-regional-aggregates.json")
BASE_URL=os.getenv("SUPABASE_URL","https://dmbikidqikjupkghywbz.supabase.co").rstrip("/")
API_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY","").strip()
SOURCE_ID="tochno_fns_sme_hmao_v20260605"
SNAPSHOT="2025-12-10"
VERSION="20260605"
ARCHIVE_URL="https://storage.yandexcloud.net/tochno-st-catalog/FNS/data_sme_153_v20260605/regions_xlsx/data_sme_153_region_%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B8%CC%86%D1%81%D0%BA%D0%B8%D0%B8%CC%86_%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B8%CC%86_%D0%BE%D0%BA%D1%80%D1%83%D0%B3_-_%D0%AE%D0%B3%D1%80%D0%B0_v20260605_xlsx.zip"
BATCH=100
WORKERS=2
MEASURES=[
 ("sme_entities_count_fns_derived","Субъекты МСП, всего, выгрузка ФНС/обработка «Если быть точным»","total"),
 ("sme_legal_entities_count_fns_derived","Юридические лица — субъекты МСП, выгрузка ФНС/обработка «Если быть точным»","type:0"),
 ("sme_individual_entrepreneurs_count_fns_derived","ИП/sole traders по полю is_sole_trader, выгрузка ФНС/обработка «Если быть точным»","type:1"),
 ("sme_microenterprise_count_fns_derived","Микропредприятия, выгрузка ФНС/обработка «Если быть точным»","category:1"),
 ("sme_small_enterprise_count_fns_derived","Малые предприятия, выгрузка ФНС/обработка «Если быть точным»","category:2"),
 ("sme_medium_enterprise_count_fns_derived","Средние предприятия, выгрузка ФНС/обработка «Если быть точным»","category:3"),
]
EXPECTED_IDS={
"beloyarsky-raion","berezovsky-raion","kogalym","kondinsky-raion","langepas","megion",
"nefteyugansk","nefteyugansky-raion","nizhnevartovsk","nizhnevartovsky-raion","nyagan-city",
"october-raion","pokachi","pyt-yah","raduzhny","sovetsky-raion","surgut","surgutsky","uray",
"khanty-mansiysk","khanty-mansiysky-raion","ugorsk",
}

def request_json(url,payload,method="POST"):
    body=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")
    req=urllib.request.Request(url,data=body,headers={
      "apikey":API_KEY,"Authorization":f"Bearer {API_KEY}",
      "Content-Type":"application/json","Accept-Profile":"public",
      "Content-Profile":"public",
      "Prefer":"resolution=ignore-duplicates,return=minimal",
    },method=method)
    last=None
    for attempt in range(5):
      try:
        with urllib.request.urlopen(req,timeout=120) as resp:
          if resp.status not in (200,201,204):raise RuntimeError(f"Unexpected HTTP {resp.status}")
          return
      except urllib.error.HTTPError as exc:
        detail=exc.read(3000).decode("utf-8","replace")
        last=f"HTTP {exc.code}: {detail}"
        if exc.code not in (408,425,429,500,502,503,504):raise RuntimeError(last)
      except (urllib.error.URLError,TimeoutError) as exc:last=str(exc)
      if attempt<4:time.sleep(min(2**attempt,20))
    raise RuntimeError(last or "Supabase request failed")

def main():
    if not API_KEY:raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    report=json.loads(REPORT.read_text(encoding="utf-8"))
    if report.get("status")!="aggregated" or report.get("dataset_version")!=VERSION:
      raise RuntimeError("Unexpected regional SME dataset report/version")
    if report.get("registry_snapshot_date")!=SNAPSHOT:
      raise RuntimeError(f"Unexpected registry snapshot: {report.get('registry_snapshot_date')}")
    municipalities=report.get("municipalities",{})
    if set(municipalities)!=EXPECTED_IDS or len(municipalities)!=22:
      raise RuntimeError("Regional SME dataset doesn't cover all 22 canonical municipalities")

    rows=[]
    total_all=0
    totals_by_measure={code:0 for code,_,_ in MEASURES}
    for mid,municipality in sorted(municipalities.items()):
      total=int(municipality.get("sme_total",0))
      cats={str(k):int(v) for k,v in (municipality.get("categories") or {}).items()}
      types={str(k):int(v) for k,v in (municipality.get("entity_types") or {}).items()}
      if sum(cats.values())!=total:
        raise RuntimeError(f"SME category sum does not reconcile for {mid}: {cats} vs {total}")
      if sum(types.values())!=total:
        raise RuntimeError(f"Entity type sum does not reconcile for {mid}: {types} vs {total}")
      values={
        "total":total,
        "type:0":types.get("0",0),
        "type:1":types.get("1",0),
        "category:1":cats.get("1",0),
        "category:2":cats.get("2",0),
        "category:3":cats.get("3",0),
      }
      total_all+=total
      cross={"entity_types":types,"categories":cats,"farm_head_flag":int(municipality.get("farm_head_flag",0))}
      for code,name,selector in MEASURES:
        value=values[selector]
        totals_by_measure[code]+=value
        rows.append({
          "source_id":SOURCE_ID,
          "source_record_key":f"fns-derived-sme:{SNAPSHOT}:{mid}:{code}",
          "raw_record":{
            "source":"ФНС России, Единый реестр субъектов МСП; обработка «Если быть точным»",
            "dataset_version":VERSION,
            "registry_snapshot_date":SNAPSHOT,
            "municipality_id":mid,
            "municipality_name":municipality.get("name"),
            "measure_code":code,
            "aggregate_value":value,
            "municipal_total":total,
            "entity_type_and_category_cross":cross,
            "municipality_oktmo_prefix":mid,
            "source_zip_url":ARCHIVE_URL,
            "source_zip_sha256":report.get("archive_sha256"),
            "limitations":[
              "Processed regional FNS dataset; not the direct current FNS snapshot.",
              "2025 historical count as of 10.12.2025.",
              "The is_sole_trader field is retained under the source's label and must not be conflated with a separate current register IP count without checking the field definition.",
              "192 records with region-wide OKTMO 71800000 were excluded from municipal totals; all 22 municipal IDs are represented.",
              "Financial revenue data is incomplete and legal-entity-only; not imported as SME turnover."
            ],
            "privacy_note":"Only municipality aggregate counts; no taxpayer identifiers or names."
          },
          "raw_municipality_name":municipality.get("name"),
          "raw_oktmo":None,
          "raw_indicator_name":name,
          "raw_indicator_code":code,
          "raw_year":2025,
          "raw_period":"Срез реестра на 10.12.2025, региональная обработанная выгрузка",
          "raw_value":str(value),
          "raw_unit":"единиц",
          "mapped_municipality_id":mid,
          "mapped_indicator_code":None,
          "normalized_value":None,
          "normalized_unit":None,
          "normalized_period":None,
          "geographic_level":"municipality",
          "review_status":"pending",
          "validation_errors":[],
          "source_url_snapshot":ARCHIVE_URL,
          "source_published_at":"2026-06-05",
          "source_retrieved_at":datetime.now(timezone.utc).isoformat(),
        })
    expected_total=int(report.get("unique_active_register_entities",-1))
    if total_all!=expected_total:
      raise RuntimeError(f"Municipal total {total_all} does not equal source's mapped unique entities {expected_total}")
    if len(rows)!=22*len(MEASURES):
      raise RuntimeError(f"Expected 132 observations, got {len(rows)}")

    endpoint=BASE_URL+"/rest/v1/municipality_indicator_import_staging?"+urllib.parse.urlencode({"on_conflict":"source_id,source_record_key"})
    batches=[rows[i:i+BATCH] for i in range(0,len(rows),BATCH)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
      futures=[pool.submit(request_json,endpoint,batch) for batch in batches]
      for future in concurrent.futures.as_completed(futures):future.result()

    patch_url=BASE_URL+"/rest/v1/data_sources?"+urllib.parse.urlencode({"id":f"eq.{SOURCE_ID}"})
    now=datetime.now(timezone.utc).isoformat()
    request_json(patch_url,{
      "import_status":"partially_imported",
      "last_checked_at":now,"retrieved_at":now,"updated_at":now
    },method="PATCH")

    out={
      "status":"uploaded_to_review_staging",
      "dataset_version":VERSION,
      "registry_snapshot_date":SNAPSHOT,
      "municipality_count":22,
      "staging_rows":len(rows),
      "staging_rows_by_measure":{code:22 for code,_,_ in MEASURES},
      "mapped_entities_total":total_all,
      "mapped_entities_by_measure":totals_by_measure,
      "unmapped_region_wide_okrmo_records_excluded":report.get("unknown_2025_okrmo_code_counts",{}).get("71800000",0),
      "all_pending":True,
      "financial_panel_staged":False,
      "note":"Annual legal-entity revenue/expenditure/employees panel is retained in the aggregate-only research report but not imported as SME turnover because coverage is incomplete and excludes individual entrepreneurs."
    }
    (Path(".ops-results")/"hmao-sme-derived-upload-status.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2),flush=True)

if __name__=="__main__":
  try:main()
  except Exception as exc:
    print(f"ERROR: {exc}",file=sys.stderr,flush=True)
    raise
