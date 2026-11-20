#!/usr/bin/env python3
"""Inspect the regional FNS-derived SME archive for Yugra without downloading it all."""
from __future__ import annotations
import io,json,struct,urllib.request,zipfile
from pathlib import Path

URL="https://storage.yandexcloud.net/tochno-st-catalog/FNS/data_sme_153_v20260605/regions_xlsx/data_sme_153_region_%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B8%CC%86%D1%81%D0%BA%D0%B8%D0%B8%CC%86_%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B8%CC%86_%D0%BE%D0%BA%D1%80%D1%83%D0%B3_-_%D0%AE%D0%B3%D1%80%D0%B0_v20260605_xlsx.zip"
OUT=Path("sme-regional-probe");OUT.mkdir(exist_ok=True)

class RangeFile(io.RawIOBase):
    def __init__(self,url):
        self.url=url
        req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"Yugra18-SME-probe/1.0"})
        with urllib.request.urlopen(req,timeout=120) as r:
            self.size=int(r.headers.get("Content-Length","0"))
            self.content_type=r.headers.get("Content-Type","")
        if not self.size: raise RuntimeError("Regional SME archive did not return Content-Length")
        self.pos=0;self.requests=0;self.bytes=0
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.pos
    def seek(self,offset,whence=io.SEEK_SET):
        p=offset if whence==io.SEEK_SET else self.pos+offset if whence==io.SEEK_CUR else self.size+offset
        if p<0:raise ValueError("negative seek")
        self.pos=min(p,self.size);return self.pos
    def read_range(self,start,end):
        req=urllib.request.Request(self.url,headers={"User-Agent":"Yugra18-SME-probe/1.0","Range":f"bytes={start}-{end}"})
        with urllib.request.urlopen(req,timeout=120) as r:
            if r.status!=206:raise RuntimeError(f"Range not supported: HTTP {r.status}")
            data=r.read();cr=r.headers.get("Content-Range","")
        if len(data)!=end-start+1 or not cr.startswith(f"bytes {start}-{end}/"):
            raise RuntimeError(f"bad Content-Range: {cr}")
        self.requests+=1;self.bytes+=len(data);return data
    def read(self,size=-1):
        if self.pos>=self.size:return b""
        if size is None or size<0:size=self.size-self.pos
        size=min(size,self.size-self.pos)
        if not size:return b""
        d=self.read_range(self.pos,self.pos+size-1);self.pos+=len(d);return d

def main():
    remote=RangeFile(URL)
    with zipfile.ZipFile(remote,"r") as z:
        files=[]
        for i in z.infolist():
            files.append({"name":i.filename,"compressed_bytes":i.compress_size,"uncompressed_bytes":i.file_size,"compression":i.compress_type,"crc32":f"{i.CRC:08x}"})
    report={"source":"Если быть точным / FNS SME dataset","archive_url":URL,
      "version":"20260605","archive_size_bytes":remote.size,"content_type":remote.content_type,
      "range_requests_for_directory":remote.requests,"range_bytes_for_directory":remote.bytes,
      "members":files,"total_uncompressed_bytes":sum(x["uncompressed_bytes"] for x in files)}
    (OUT/"probe.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=="__main__":main()
