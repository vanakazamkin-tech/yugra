#!/usr/bin/env python3
"""Inspect the official FNS SME registry XSD and a small ZIP member sample.

The probe prints schema and aggregate field coverage only; it never emits names,
INNs, OGRNs, addresses, or other identifiable registry values.
"""
from __future__ import annotations

import io
import json
import re
import struct
import urllib.request
import zipfile
import zlib
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

XSD_URL = "https://file.nalog.ru/opendata/7707329152-rsmp/structure-12052026.xsd"
ZIP_URL = "https://file.nalog.ru/opendata/7707329152-rsmp/data-10112026-structure-12052026.zip"
OUT = Path("fns-sme-probe")
OUT.mkdir(exist_ok=True)

def local(name: str) -> str:
    return name.rsplit("}", 1)[-1]

class HttpRangeFile(io.RawIOBase):
    def __init__(self, url: str):
        self.url = url
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent":"Yugra18-FNS-SME-Probe/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r:
            self.size = int(r.headers.get("Content-Length","0"))
        if not self.size:
            raise RuntimeError("FNS archive HEAD returned no content length")
        self.pos = 0
        self.requests = 0
        self.bytes = 0
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=io.SEEK_SET):
        p = offset if whence == io.SEEK_SET else (self.pos+offset if whence == io.SEEK_CUR else self.size+offset)
        if p < 0: raise ValueError("negative seek")
        self.pos = min(p,self.size); return self.pos
    def read_range(self,start,end):
        req=urllib.request.Request(self.url,headers={"User-Agent":"Yugra18-FNS-SME-Probe/1.0","Range":f"bytes={start}-{end}"})
        with urllib.request.urlopen(req,timeout=120) as r:
            if r.status != 206: raise RuntimeError(f"FNS Range failed: HTTP {r.status}")
            data=r.read()
            cr=r.headers.get("Content-Range","")
            if len(data)!=end-start+1 or not cr.startswith(f"bytes {start}-{end}/"):
                raise RuntimeError(f"bad content range {cr}, got {len(data)} bytes")
        self.requests += 1; self.bytes += len(data)
        return data
    def read(self,size=-1):
        if self.pos>=self.size:return b""
        if size is None or size<0:size=self.size-self.pos
        size=min(size,self.size-self.pos)
        if not size:return b""
        data=self.read_range(self.pos,self.pos+size-1);self.pos+=len(data);return data

def decompress_member(remote, info):
    header=remote.read_range(info.header_offset,info.header_offset+29)
    signature,_,_,method,_,_,_,_,_,name_len,extra_len=struct.unpack("<IHHHHHIIIHH",header)
    if signature!=0x04034B50:raise RuntimeError("bad ZIP local header")
    start=info.header_offset+30+name_len+extra_len
    compressed=remote.read_range(start,start+info.compress_size-1)
    if method==zipfile.ZIP_DEFLATED: raw=zlib.decompress(compressed,-15)
    elif method==zipfile.ZIP_STORED: raw=compressed
    else: raise RuntimeError(f"unsupported compression {method}")
    if len(raw)!=info.file_size or (zlib.crc32(raw)&0xffffffff)!=info.CRC:
        raise RuntimeError(f"CRC mismatch: {info.filename}")
    return raw

def inspect_xsd():
    req=urllib.request.Request(XSD_URL,headers={"User-Agent":"Yugra18-FNS-SME-Probe/1.0"})
    with urllib.request.urlopen(req,timeout=120) as r: raw=r.read()
    root=ET.fromstring(raw)
    names=set()
    for node in root.iter():
        name=node.attrib.get("name")
        if name:
            low=name.lower()
            if any(token in low for token in ("адрес","мест","фиа","регион","октмо","муницип","район","город","насел","посел","субмсп","катсуб","дата","ип","юл")):
                names.add(name)
        ref=node.attrib.get("ref")
        if ref and any(token in ref.lower() for token in ("адрес","мест","фиа","регион","октмо","муницип","район","город","насел")):
            names.add("ref:"+ref)
    return {"xsd_bytes":len(raw),"xsd_sha256":__import__("hashlib").sha256(raw).hexdigest(),"geography_relevant_schema_names":sorted(names)}

def inspect_xml_members():
    remote=HttpRangeFile(ZIP_URL)
    fields=Counter(); tags=Counter(); attr_names=Counter()
    docs_total=0; region86_docs=0; sample_members=[]
    with zipfile.ZipFile(remote,"r") as zf:
        members=[i for i in zf.infolist() if i.filename.lower().endswith(".xml")]
        for info in members[:100]:
            raw=decompress_member(remote,info)
            root=ET.fromstring(raw)
            member_docs=0; member_region86=0
            for doc in root.iter():
                if local(doc.tag)!="Документ":continue
                member_docs+=1; docs_total+=1
                seen_names=set()
                for node in doc.iter():
                    tag=local(node.tag); tags[tag]+=1; seen_names.add(tag)
                    for key,val in node.attrib.items():
                        key=local(key); attr_names[key]+=1; seen_names.add(key)
                        if key.lower() in ("кодрегион","кодсубъекта","регионкод","кодрегиона") and str(val).strip()=="86":
                            member_region86+=1; region86_docs+=1
                for n in seen_names: fields[n]+=1
            sample_members.append({"name":info.filename,"docs":member_docs,"uncompressed_bytes":info.file_size,"crc32":"ok","region86_document_hits":member_region86})
    geo_tokens=("адрес","мест","фиа","регион","октмо","муницип","район","город","насел","посел","террит","сведмн","субмсп","катсуб","дата")
    relevant={k:v for k,v in sorted(fields.items()) if any(t in k.lower() for t in geo_tokens)}
    return {
      "archive_size_bytes":remote.size,"range_requests":remote.requests,
      "archive_bytes_downloaded":remote.bytes,"xml_member_count":len(members),
      "sampled_xml_members":len(sample_members),"sampled_documents":docs_total,
      "region86_document_hits_in_sample":region86_docs,
      "relevant_fields_present_document_count":relevant,
      "relevant_attribute_names":sorted(k for k in attr_names if any(t in k.lower() for t in geo_tokens)),
      "sample_members":sample_members[:12],
    }

def main():
    report={"source_url":"https://www.nalog.gov.ru/opendata/7707329152-rsmp/","snapshot":"2026-11-10"}
    report["xsd"]=inspect_xsd()
    report["xml_sample"]=inspect_xml_members()
    (OUT/"fns-sme-probe.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=="__main__":main()
