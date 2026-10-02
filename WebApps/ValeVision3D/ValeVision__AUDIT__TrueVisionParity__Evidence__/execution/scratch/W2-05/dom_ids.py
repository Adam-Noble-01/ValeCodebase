"""W2-05 scratch: every DOM id in index.html is unique; the Cross Section Tool gate's module binds the ids the page now
carries; the 48 module binds TrueVision's three; and no file under 02__Src__AppModules or 03__Style__AppStylesheets
still names the gate's old ids except the 48 module (whose ids they now are)."""
import collections, os, re, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
page = open(os.path.join(VV, "index.html"), encoding="utf-8").read()
ids = re.findall(r'\bid="([^"]+)"', page)
dupes = [k for k, v in collections.Counter(ids).items() if v > 1]
print("index.html ids:", len(ids), "duplicates:", dupes)
bad = bool(dupes)

def bound(rel):
    text = open(os.path.join(VV, rel), encoding="utf-8").read()
    return re.findall(r"'(naCrossSection\w*Dev\w*)'", text)

gate = bound(r"02__Src__AppModules\41__System__CrossSectionView\Na__UiFeature__CrossSectionView__DevControls.js")
xsec = bound(r"02__Src__AppModules\48__System__CrossSectionViews\Na__CrossSection__DevMenu__Editor__.js")
print("gate binds:", gate)
print("48 binds  :", xsec)
for i in gate + xsec:
    if ids.count(i) != 1:
        print("  NOT ON THE PAGE EXACTLY ONCE:", i); bad = True
if set(gate) & set(xsec):
    print("  COLLISION:", set(gate) & set(xsec)); bad = True

hits = []
for root in ("02__Src__AppModules", "03__Style__AppStylesheets"):
    for dp, dn, fn in os.walk(os.path.join(VV, root)):
        for f in fn:
            if not f.endswith((".js", ".mjs", ".css", ".html", ".json")): continue
            p = os.path.join(dp, f)
            t = open(p, encoding="utf-8", errors="replace").read()
            for m in re.finditer(r"naCrossSectionDev(Item|Toggle|Panel|EnableCheck|Save)\b", t):
                hits.append((os.path.relpath(p, VV), m.group(0)))
others = [h for h in hits if "48__System__CrossSectionViews" not in h[0]]
print("old gate ids outside 48:", others)
bad = bad or bool(others)
print("DOM IDS", "FAIL" if bad else "PASS")
sys.exit(1 if bad else 0)
