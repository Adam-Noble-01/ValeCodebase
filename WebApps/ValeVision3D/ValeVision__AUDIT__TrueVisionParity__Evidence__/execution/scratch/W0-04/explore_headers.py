# Exploration only (read-only): banner and FILE-line facts for files in VVM 40-55 and LE, plus log order facts.
import os, re, sys
from collections import Counter, defaultdict

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SRC = os.path.join(VV, "02__Src__AppModules")
SKIP = {"node_modules", "dist", "00__Archive", "00__ArchivedVersions", ".wrangler"}

def files_in(folder_names, exts=(".js", ".mjs", ".css")):
    for fn in sorted(os.listdir(SRC)):
        if not re.match(r"^\d\d__", fn):
            continue
        num = int(fn[:2])
        if fn not in folder_names(num, fn):
            continue
        root = os.path.join(SRC, fn)
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in SKIP]
            for f in fns:
                if f.endswith(exts):
                    yield os.path.join(dp, f)

def scope(num, fn):
    return [fn] if 40 <= num <= 55 else []

banner_re = re.compile(r"^\s*(?://|/\*|\*)?\s*(VALEVISION3D|TRUEVISION3D)\s+-\s+(.*)$")
file_re = re.compile(r"^\s*(?://|/\*|\*)?\s*FILE\s*:\s*(\S+)")
stats = Counter()
bad_banner = []
bad_file = []
no_file = []
for p in files_in(scope):
    rel = os.path.relpath(p, SRC).replace("\\", "/")
    try:
        lines = open(p, encoding="utf-8", errors="replace").read().split("\n")[:40]
    except Exception:
        continue
    stats["files"] += 1
    ban = None
    for l in lines[:6]:
        m = banner_re.match(l)
        if m:
            ban = m.group(1)
            break
    if ban == "VALEVISION3D":
        stats["banner_vv"] += 1
    elif ban == "TRUEVISION3D":
        stats["banner_tv"] += 1
        bad_banner.append(rel)
    else:
        stats["banner_none"] += 1
        bad_banner.append(rel + "  [" + (lines[1].strip()[:80] if len(lines) > 1 else "") + "]")
    fl = None
    for l in lines[:20]:
        m = file_re.match(l)
        if m:
            fl = m.group(1)
            break
    base = os.path.basename(p)
    if fl is None:
        stats["file_none"] += 1
        no_file.append(rel)
    elif fl != base:
        stats["file_mismatch"] += 1
        bad_file.append((rel, fl))
    else:
        stats["file_ok"] += 1
print(stats)
print("BAD/NO BANNER:")
for b in bad_banner:
    print("  ", b)
print("FILE MISMATCH:")
for b in bad_file:
    print("  ", b)
print("NO FILE LINE:")
for b in no_file:
    print("  ", b)
