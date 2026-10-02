"""Resolve the Wave 0 release placeholders left in the WCP Flask files (comment lines only) to v2.71.1.

Byte-preserving: reads bytes, replaces the exact token bytes, writes bytes back (line endings untouched).
"""
import os, re

WCP = r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia"
FILES = [
    "Server__ValeVisionPublished__Api__.py",
    "Server__ValeVisionShared__Lib__.py",
    "Server__ValeVisionSheetImages__Api__.py",
    "Server__ValeVisionStatements__Api__.py",
    "Server__ValeVisionUserConfig__Api__.py",
]
TOKEN = re.compile(rb"\{\{VVREL:W0-\d\d\}\}")
for fn in FILES:
    p = os.path.join(WCP, fn)
    data = open(p, "rb").read()
    new, n = TOKEN.subn(b"v2.71.1", data)
    if n:
        compile(new.decode("utf-8"), p, "exec")          # still valid python
        open(p, "wb").write(new)
    print(f"{fn}: {n} token(s) resolved")
