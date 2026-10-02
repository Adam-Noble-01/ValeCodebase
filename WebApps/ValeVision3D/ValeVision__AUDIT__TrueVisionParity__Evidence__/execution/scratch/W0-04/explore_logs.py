# Exploration only (read-only): DEVELOPMENT LOG entry formats and order faults across VV src/styles/tests.
import os, re, sys
from collections import Counter, defaultdict
from datetime import datetime

VV = sys.argv[1] if len(sys.argv) > 1 else r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCOPES = ["02__Src__AppModules", "03__Style__AppStylesheets", "80__Testing__PrototypeEnvironment"]
SKIP = {"node_modules", "dist", "00__Archive", "00__ArchivedVersions", ".wrangler"}
EXT = (".js", ".mjs", ".cjs", ".css", ".py", ".html")

head_re = re.compile(r"^\s*(?://|\*|#|/\*)?\s*DEVELOPMENT LOG\b")
rule_re = re.compile(r"^\s*(?://|\*|#|/\*)\s*[-=]{4,}|^\s*[-=]{4,}|^\s*\*/")
entry_re = re.compile(r"^\s*(?://|\*|#)\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s*[-:]\s*(?:Version|v)\s*(\d+\.\d+\.\d+)")
loose_re = re.compile(r"^\s*(?://|\*|#)\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\b(.*)$")

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

fmt = Counter()
odd = []
faults = []
nolog = 0
files = 0
for s in SCOPES:
    for p in walk(os.path.join(VV, s)):
        files += 1
        lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
        idx = None
        for i, l in enumerate(lines[:400]):
            if head_re.match(l):
                idx = i
                break
        if idx is None:
            nolog += 1
            continue
        entries = []
        for j in range(idx + 1, len(lines)):
            l = lines[j]
            if rule_re.match(l) and not entry_re.match(l):
                break
            m = entry_re.match(l)
            if m:
                entries.append((j + 1, m.group(1), m.group(2)))
                fmt["date - Version x.y.z"] += 1
                continue
            m = loose_re.match(l)
            if m:
                fmt["date (other)"] += 1
                odd.append((os.path.relpath(p, VV), j + 1, l.strip()[:120]))
        rel = os.path.relpath(p, VV).replace("\\", "/")
        seen = {}
        for k, (ln, d, v) in enumerate(entries):
            if v in seen:
                faults.append((rel, ln, f"duplicate version {v} (also line {seen[v]})"))
            else:
                seen[v] = ln
            if k + 1 < len(entries):
                ln2, d2, v2 = entries[k + 1]
                try:
                    if dkey(d) < dkey(d2):
                        faults.append((rel, ln, f"date order: {d} {v} above {d2} {v2}"))
                except ValueError as e:
                    faults.append((rel, ln, f"bad date {d}"))
                if vkey(v) < vkey(v2):
                    faults.append((rel, ln, f"version order: {v} above {v2}"))
print("files", files, "no log", nolog, fmt)
print("ODD entry lines:")
for o in odd[:60]:
    print("  ", o)
print("FAULTS:", len(faults))
for f in faults:
    print("  ", f)
