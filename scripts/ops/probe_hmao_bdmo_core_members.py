#!/usr/bin/env python3
"""Inspect only the central directory of the current section-31 outer ZIP."""
from __future__ import annotations
import io, urllib.request, urllib.error, time, zipfile

URL="https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/data_bdmo_118_v20260928/by_indicator/data_section31_112_v20260928.zip"

class RangeFile(io.RawIOBase):
    def __init__(self,url):
        self.url=url
        req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"Yugra18-ZIP-directory-probe/1.0"})
        with urllib.request.urlopen(req,timeout=30) as r:
            self.size=int(r.headers["Content-Length"])
        self.pos=0
        self.cache_start=-1
        self.cache=b""
        self.block=1024*1024
        print("ARCHIVE_SIZE",self.size,flush=True)
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self,off,whence=0):
        self.pos=off if whence==0 else self.pos+off if whence==1 else self.size+off
        if self.pos<0: raise ValueError("negative seek")
        return self.pos
    def read(self,n=-1):
        if self.pos>=self.size: return b""
        if n is None or n<0: n=self.size-self.pos
        end=min(self.size,self.pos+n)
        out=bytearray()
        while self.pos<end:
            if not (self.cache_start<=self.pos<self.cache_start+len(self.cache)):
                start=(self.pos//self.block)*self.block
                stop=min(self.size,start+self.block)-1
                req=urllib.request.Request(self.url,headers={"User-Agent":"Yugra18-ZIP-directory-probe/1.0","Range":f"bytes={start}-{stop}"})
                with urllib.request.urlopen(req,timeout=60) as r:
                    if r.status!=206: raise RuntimeError(f"range status {r.status}")
                    self.cache=r.read()
                    if len(self.cache)!=(stop-start+1): raise RuntimeError("range length mismatch")
                    self.cache_start=start
            offset=self.pos-self.cache_start
            take=min(end-self.pos,len(self.cache)-offset)
            out.extend(self.cache[offset:offset+take])
            self.pos+=take
        return bytes(out)

def main():
    remote=RangeFile(URL)
    with zipfile.ZipFile(remote) as z:
        wanted=("Y48112001","Y48112003","Y48112004","Y48112007","Y48112008","Y48112009")
        for info in z.infolist():
            if any(code in info.filename for code in wanted) and info.filename.lower().endswith(".csv"):
                print("MEMBER",info.filename,"compressed",info.compress_size,"uncompressed",info.file_size,"method",info.compress_type,"offset",info.header_offset,flush=True)

if __name__=="__main__":
    main()
