"""W3-08: retire VV's Snapping__.js shim (K2 FR-15).

Backs the file's bytes up into this scratch folder (sha1 recorded), then deletes it.
Refuses if any shipped module or test still imports it by path.
"""
import hashlib, os, re, shutil, sys

APP = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REL = r"02__Src__AppModules\51__System__LayoutEditor\30__System__SheetTools\Na__LayoutEditor__Snapping__.js"
TARGET = os.path.join(APP, REL)
HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(HERE, "Na__LayoutEditor__Snapping__.js.bak")

IMPORT_RE = re.compile(rb"""(?:from|import)\s*\(?\s*['"][^'"]*Na__LayoutEditor__Snapping__\.js['"]""")

importers = []
for root_name in ("02__Src__AppModules", "03__Style__AppStylesheets", "80__Testing__PrototypeEnvironment"):
    for dp, dn, fn in os.walk(os.path.join(APP, root_name)):
        dn[:] = [d for d in dn if d not in ("node_modules", ".claude")]
        for f in fn:
            if not f.endswith((".js", ".mjs", ".html", ".json")):
                continue
            p = os.path.join(dp, f)
            if os.path.normcase(p) == os.path.normcase(TARGET):
                continue
            data = open(p, "rb").read()
            if IMPORT_RE.search(data):
                importers.append(p)
idx = open(os.path.join(APP, "index.html"), "rb").read()
if b"Na__LayoutEditor__Snapping__" in idx:
    importers.append(os.path.join(APP, "index.html"))

if importers:
    print("REFUSED - still imported by:")
    for p in importers:
        print("  ", p)
    sys.exit(1)

if not os.path.exists(TARGET):
    print("already gone:", TARGET)
    sys.exit(0)

data = open(TARGET, "rb").read()
print("sha1 before:", hashlib.sha1(data).hexdigest(), len(data), "bytes")
open(BACKUP, "wb").write(data)
assert open(BACKUP, "rb").read() == data
os.remove(TARGET)
print("deleted:", TARGET)
print("backup :", BACKUP)
