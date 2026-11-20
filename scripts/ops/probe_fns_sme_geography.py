#!/usr/bin/env python3
"""Safe sample probe of municipality-level address fields in the FNS SME registry.

Only geography strings and counts are written. No INN, OGRN, names, person
names, street, house, or other identifying fields are collected or emitted.
"""
from __future__ import annotations
import io, json, re, struct, urllib.request, zipfile, zlib
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

ZIP_URL="https://file.nalog.ru/opendata/7707329152-rsmp/data-10112026-structure-12052026.zip"
OUT=Path("fns-sme-geo-probe")
OUT.mkdir(exist_ok=True)

def local(tag): return str(tag).rsplit("}",1)[-1]

class RangeFile(io.RawIOBase):
    def __init__(self,url):
        self.url=url
        req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"Yugra18-FNS-SME-GeoProbe/1.0"})
        with urllib.request.urlopen(req,timeout=120) as r:self.size=int(r.headers.get("Content-Length","0"))
        if not self.size:raise RuntimeError("FNS archive size unavailable")
        self.pos=0;self.requests=0;self.bytes=0
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.pos
    def seek(self,offset,whence=io.SEEK_SET):
        p=offset if whence==io.SEEK_SET else self.pos+offset if whence==io.SEEK_CUR else self.size+offset
        if p<0:raise ValueError("negative seek")
        self.pos=min(p,self.size);return self.pos
    def read_range(self,start,end):
        req=urllib.request.Request(self.url,headers={"User-Agent":"Yugra18-FNS-SME-GeoProbe/1.0","Range":f"bytes={start}-{end}"})
        with urllib.request.urlopen(req,timeout=120) as r:
            if r.status!=206:raise RuntimeError(f"HTTP Range unsupported: {r.status}")
            data=r.read();cr=r.headers.get("Content-Range","")
        if len(data)!=end-start+1 or not cr.startswith(f"bytes {start}-{end}/"):raise RuntimeError("bad content range")
        self.requests+=1;self.bytes+=len(data);return data
    def read(self,size=-1):
        if self.pos>=self.size:return b""
        if size is None or size<0:size=self.size-self.pos
        size=min(size,self.size-self.pos)
        if not size:return b""
        d=self.read_range(self.pos,self.pos+size-1);self.pos+=len(d);return d

def member_bytes(remote,info):
    h=remote.read_range(info.header_offset,info.header_offset+29)
    sig,_,_,method,_,_,_,_,_,nl,el=struct.unpack("<IHHHHHIIIHH",h)
    if sig!=0x04034B50:raise RuntimeError("invalid ZIP member header")
    start=info.header_offset+30+nl+el
    rawc=remote.read_range(start,start+info.compress_size-1)
    raw=zlib.decompress(rawc,-15) if method==zipfile.ZIP_DEFLATED else rawc
    if len(raw)!=info.file_size or (zlib.crc32(raw)&0xffffffff)!=info.CRC:raise RuntimeError("ZIP CRC mismatch")
    return raw

def element_value(node):
    # Geo elements may store names as text or in a "Наим" attribute/child.
    for child in node.iter():
        for k,v in child.attrib.items():
            if local(k).lower() in ("наим","наименование") and str(v).strip():
                return str(v).strip()
    txt=" ".join(" ".join(node.itertext()).split())
    return txt[:180]

def main():
    remote=RangeFile(ZIP_URL)
    field_counts={k:Counter() for k in ("Регион","Район","Город","НаселПункт")}
    tuples=Counter(); records=0; region86=0; files=[]; xml_docs=0
    entity_kind=Counter(); sme_category=Counter(); mapped_area=Counter(); unmatched=Counter()
    geo_tags={"регион":"Регион","район":"Район","город":"Город","населпункт":"НаселПункт"}
    with zipfile.ZipFile(remote,"r") as z:
        members=[i for i in z.infolist() if i.filename.lower().endswith(".xml")]
        for info in members[:100]:
            raw=member_bytes(remote,info)
            root=ET.fromstring(raw)
            file_hits=0
            for doc in root.iter():
                if local(doc.tag)!="Документ":continue
                xml_docs += 1
                code86=False
                for n in doc.iter():
                    for k,v in n.attrib.items():
                        if local(k).lower()=="кодрегион" and str(v).strip()=="86":code86=True
                    if local(n.tag).lower()=="кодрегион" and (n.text or "").strip()=="86":code86=True
                if not code86:continue
                region86+=1;file_hits+=1;records+=1
                entity_kind[str(doc.attrib.get("ВидСубМСП",""))] += 1
                sme_category[str(doc.attrib.get("КатСубМСП",""))] += 1
                vals={}
                for n in doc.iter():
                    key=geo_tags.get(local(n.tag).lower())
                    if key:
                        val=element_value(n)
                        if val and val not in ("86","Ханты-Мансийский автономный округ — Югра"):
                            vals[key]=val
                for k,v in vals.items():field_counts[k][v]+=1
                tuples[tuple(vals.get(k,"") for k in ("Район","Город","НаселПункт"))]+=1
                def clean(v):
                    v=str(v or "").lower().replace("ё","е").strip()
                    v=re.sub(r"^(г\.?|город|р-н|район)\\s*", "", v)
                    v=re.sub(r"[^а-яa-z0-9]+", "", v)
                    return v
                district_map={
                    "белоярский":"beloyarsky-raion","березовский":"berezovsky-raion","кондинский":"kondinsky-raion",
                    "нефтеюганский":"nefteyugansky-raion","нижневартовский":"nizhnevartovsky-raion",
                    "октябрьский":"october-raion","советский":"sovetsky-raion","сургутский":"surgutsky",
                    "хантымансийский":"khanty-mansiysky-raion"}
                city_map={
                    "когалым":"kogalym","лангепас":"langepas","мегион":"megion","нефтеюганск":"nefteyugansk",
                    "нижневартовск":"nizhnevartovsk","нягань":"nyagan-city","покачи":"pokachi","пытьях":"pyt-yah",
                    "радужный":"raduzhny","сургут":"surgut","урай":"uray","хантымансийск":"khanty-mansiysk","югорск":"ugorsk",
                    "белоярский":"beloyarsky-raion","советский":"sovetsky-raion"}
                d=clean(vals.get("Район","")); city=clean(vals.get("Город","")); settlement=clean(vals.get("НаселПункт",""))
                municipality=district_map.get(d) or city_map.get(city) or city_map.get(settlement)
                if municipality: mapped_area[municipality]+=1
                else: unmatched[(d,city,settlement)]+=1
            if len(files)<12:files.append({"member":info.filename,"region86_records":file_hits,"crc32":"ok"})
    report={
      "snapshot":"2026-11-10","archive_size_bytes":remote.size,
      "sampled_members":min(100,len(members)), "sampled_member_limit":100, "xml_documents_sampled":xml_docs,
      "range_requests":remote.requests, "range_bytes_downloaded":remote.bytes,"region86_records_sampled":region86,
      "entity_kind_code_counts":dict(entity_kind),"sme_category_code_counts":dict(sme_category),
      "municipality_crosswalk_sample_counts":dict(sorted(mapped_area.items())),
      "unmatched_geography_tuples": [{"district":x[0],"city":x[1],"settlement":x[2],"count":n} for x,n in unmatched.most_common(80)],
      "field_value_counts":{k:[{"value":v,"count":c} for v,c in ctr.most_common(80)] for k,ctr in field_counts.items()},
      "common_geography_tuples":[{"district":t[0],"city":t[1],"settlement":t[2],"count":c} for t,c in tuples.most_common(120)],
      "sample_members":files,
      "privacy_note":"Only aggregate geography labels/counts. No taxpayer identifiers, enterprise names, personal names, INNs, OGRNs, street or house values are collected."
    }
    (OUT/"fns-sme-geo-probe.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=="__main__":main()
