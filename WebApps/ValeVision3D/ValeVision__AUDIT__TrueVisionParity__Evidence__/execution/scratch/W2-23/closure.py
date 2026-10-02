import re, os, sys
ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor"
starts = [
    os.path.join(ROOT, r"59__Feature__FloorAreas\Na__LayoutEditor__FloorAreas__Tool__.js"),
    os.path.join(ROOT, r"50__Feature__Specification\Na__LayoutEditor__NoteRegions__Tool__.js"),
]
seen = set()
stack = list(starts)
pat = re.compile(r"""(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]""", re.S)
missing = []
while stack:
    f = os.path.normpath(stack.pop())
    if f in seen:
        continue
    seen.add(f)
    if not os.path.exists(f):
        missing.append(f); continue
    t = open(f, encoding="utf-8").read()
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"^\s*//[^\n]*", "", t, flags=re.M)
    for m in pat.finditer(t):
        p = m.group(1)
        if p.startswith("."):
            stack.append(os.path.join(os.path.dirname(f), p))
print("closure size", len(seen))
for f in sorted(seen):
    if "Measurements__" in f or "SheetTools__" in os.path.basename(f) or "ModeController" in f:
        print("CYCLE CANDIDATE", f)
print("missing", missing)
