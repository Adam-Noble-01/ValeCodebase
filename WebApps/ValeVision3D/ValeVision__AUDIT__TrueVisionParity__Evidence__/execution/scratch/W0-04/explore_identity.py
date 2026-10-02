# Exploration only (read-only): measure the identity hits and header facts the W0-04 lint would see today.
import os, re, sys, json
from collections import Counter, defaultdict

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SRC = os.path.join(VV, "02__Src__AppModules")
SCOPES = ["02__Src__AppModules", "03__Style__AppStylesheets", "80__Testing__PrototypeEnvironment"]
SKIP_DIRS = {"node_modules", "dist", "00__Archive", "00__ArchivedVersions", ".wrangler", ".claude", ".git"}
TEXT_EXT = {".js", ".mjs", ".cjs", ".css", ".html", ".json", ".py", ".md", ".txt", ".bat", ".svg"}

PATTERNS = {
    "TrueVision__": re.compile(r"TrueVision__"),
    "window.TrueVision__": re.compile(r"window\.TrueVision__"),
    "[TrueVision3D": re.compile(r"\[TrueVision3D"),
    "TRUEVISION3D": re.compile(r"TRUEVISION3D"),
    "/api/truevision": re.compile(r"/api/truevision", re.I),
    "NaProjectPortal": re.compile(r"NaProjectPortal"),
    "30__TrueVision__AppContent": re.compile(r"30__TrueVision__AppContent"),
    "/na-apps/30__TrueVision__CoreAppCode": re.compile(r"/na-apps/30__TrueVision__CoreAppCode"),
    "/na-apps/": re.compile(r"/na-apps/"),
    "noble-architecture.com/q/": re.compile(r"noble-architecture\.com/q/"),
    "noble-architecture.com/s/": re.compile(r"noble-architecture\.com/s/"),
    "noble-architecture.com(any)": re.compile(r"noble-architecture\.com[^\s'\"`)]*"),
    "TrueVision(any)": re.compile(r"TrueVision"),
}

def walk(root):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            yield os.path.join(dp, fn)

def port_note_ranges(lines):
    # whole PORT NOTE block: from a line containing 'PORT NOTE:' to the next rule line (// ---- or /* ---- or * ----)
    ranges = []
    i = 0
    n = len(lines)
    while i < n:
        if "PORT NOTE" in lines[i] and ":" in lines[i]:
            j = i + 1
            while j < n and not re.match(r"^\s*(//|/\*|\*)?\s*-{4,}", lines[j]) and not re.match(r"^\s*(//|/\*|\*)?\s*={4,}", lines[j]):
                j += 1
            ranges.append((i, j))
            i = j
        else:
            i += 1
    return ranges

hits = defaultdict(list)
files_scanned = 0
for scope in SCOPES:
    for p in walk(os.path.join(VV, scope)):
        ext = os.path.splitext(p)[1].lower()
        if ext not in TEXT_EXT:
            continue
        if os.path.getsize(p) > 3_000_000:
            continue
        try:
            text = open(p, encoding="utf-8", errors="replace").read()
        except Exception:
            continue
        files_scanned += 1
        lines = text.split("\n")
        pn = port_note_ranges(lines)
        def in_pn(k):
            return any(a <= k < b for a, b in pn)
        rel = os.path.relpath(p, VV).replace("\\", "/")
        for k, line in enumerate(lines):
            for name, rx in PATTERNS.items():
                if rx.search(line):
                    hits[name].append((rel, k + 1, in_pn(k), line.strip()[:160]))
# index.html
p = os.path.join(VV, "index.html")
text = open(p, encoding="utf-8", errors="replace").read()
for k, line in enumerate(text.split("\n")):
    for name, rx in PATTERNS.items():
        if rx.search(line):
            hits[name].append(("index.html", k + 1, False, line.strip()[:160]))

print("files scanned", files_scanned)
for name, lst in hits.items():
    outside = [h for h in lst if not h[2]]
    print(f"== {name}: {len(lst)} hits, {len(outside)} outside PORT NOTE blocks")
    if name in ("TrueVision(any)",):
        c = Counter(h[0] for h in outside)
        for f, n in c.most_common(60):
            print("   ", n, f)
        continue
    if name == "noble-architecture.com(any)":
        c = Counter()
        for h in lst:
            for m in PATTERNS[name].finditer(h[3]):
                c[m.group(0)[:70]] += 1
        for u, n in c.most_common(40):
            print("   ", n, u)
        continue
    for h in outside[:40]:
        print("   ", h)
