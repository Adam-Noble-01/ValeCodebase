# Exploration only (read-only): log-order faults under the "monotonic, descending in the drawing scope" rule.
import os, re, sys
from datetime import datetime

VV = sys.argv[1] if len(sys.argv) > 1 else r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCOPES = ["02__Src__AppModules", "03__Style__AppStylesheets", "80__Testing__PrototypeEnvironment"]
SKIP = {"node_modules", "dist", "00__Archive", "00__ArchivedVersions", ".wrangler"}
EXT = (".js", ".mjs", ".cjs", ".css", ".py", ".html")

head_re = re.compile(r"^\s*(?://|\*|#|/\*)?\s*DEVELOPMENT LOG\b")
rule_re = re.compile(r"^\s*(?://|\*|#|/\*)\s*[-=]{4,}|^\s*[-=]{4,}|^\s*\*/")
entry_re = re.compile(r"^\s*(?://|\*|#)\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s*[-:]\s*(?:Version|v)\s*(\d+\.\d+\.\d+)")

def walk(root):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP]
        for f in fns:
            if f.endswith(EXT):
                yield os.path.join(dp, f)

def vkey(v):
    return tuple(int(x) for x in v.split("."))

def dkey(d):
    return datetime.strptime(d, "%d-%b-%Y")

def drawing_scope(rel):
    m = re.match(r"02__Src__AppModules/(\d\d)__", rel)
    return bool(m) and 40 <= int(m.group(1)) <= 55

tot = 0
by = {"desc-required": [], "monotonic": []}
for s in SCOPES:
    for p in walk(os.path.join(VV, s)):
        rel = os.path.relpath(p, VV).replace("\\", "/")
        text = open(p, encoding="utf-8", errors="replace").read()
        lines = text.split("\n")
        tvsrc = re.search(r"Ported from\s*:\s*TrueVision3D", text[:20000]) is not None
        idx = next((i for i, l in enumerate(lines[:400]) if head_re.match(l)), None)
        if idx is None:
            continue
        entries = []
        for j in range(idx + 1, len(lines)):
            l = lines[j]
            if rule_re.match(l) and not entry_re.match(l):
                break
            m = entry_re.match(l)
            if m:
                entries.append((j + 1, m.group(1), m.group(2)))
        if len(entries) < 2:
            continue
        mode = "desc-required" if (drawing_scope(rel) or tvsrc) else "monotonic"
        ups = sum(1 for a, b in zip(entries, entries[1:]) if vkey(a[2]) < vkey(b[2]))
        downs = sum(1 for a, b in zip(entries, entries[1:]) if vkey(a[2]) > vkey(b[2]))
        direction = "desc" if (mode == "desc-required" or downs >= ups) else "asc"
        faults = []
        seen = {}
        for e in entries:
            if e[2] in seen:
                faults.append(f"{e[0]}: duplicate version {e[2]} (also {seen[e[2]]})")
            else:
                seen[e[2]] = e[0]
        for a, b in zip(entries, entries[1:]):
            if direction == "desc":
                if vkey(a[2]) < vkey(b[2]) or dkey(a[1]) < dkey(b[1]):
                    faults.append(f"{a[0]}: {a[1]} {a[2]} above {b[1]} {b[2]} (log runs newest first)")
            else:
                if vkey(a[2]) > vkey(b[2]) or dkey(a[1]) > dkey(b[1]):
                    faults.append(f"{a[0]}: {a[1]} {a[2]} above {b[1]} {b[2]} (log runs oldest first)")
        if faults:
            by[mode].append((rel, direction, faults))
for mode, lst in by.items():
    print("==", mode, len(lst), "files")
    for rel, d, f in lst:
        print("  ", rel, d)
        for x in f[:6]:
            print("       ", x)
