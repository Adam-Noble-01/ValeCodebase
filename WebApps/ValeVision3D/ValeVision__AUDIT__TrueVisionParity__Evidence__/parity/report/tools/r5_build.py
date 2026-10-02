# R5 (Section E) table builder. Reads the parity data and both trees' snapshots (and, read-only, the
# TV devlog and both apps' test folders); writes markdown fragments and JSON to report/tools/r5work/.
# Run after r5_release_map.py:  python r5_release_map.py && python r5_build.py
import sys, io, json, re, collections, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5_common import *
from r5_overrides import CLASS_FIX, RESIDUAL, WP_FIX, GATE_RULES

sys.stdout.reconfigure(encoding="utf-8")
RM = jload(WORK + "/release_map.json")
OUT = {}

FEATURE_DRS = {"DR-08", "DR-09", "DR-10", "DR-11", "DR-12", "DR-13", "DR-14", "DR-15", "DR-16", "DR-17", "DR-18",
               "DR-19", "DR-20", "DR-21", "DR-22", "DR-23", "DR-26", "DR-31", "DR-33", "DR-38", "DR-39", "DR-40",
               "DR-43", "DR-44", "DR-30", "DR-25", "DR-24", "DR-32"}
OPEN = {"PARTIAL", "PENDING-SIGNOFF", "NOT-CONSIDERED", "REOPENED"}
HUB_WPS = {"W0-08", "W0-15", "W0-04", "W5-02", "W5-03"}
CONFIRMED_AFTER_85 = {"v2.153.0", "v2.155.0"}


def md(s):
    return str(s).replace("|", "/").replace("\n", " ")


def short(s, n):
    s = md(s)
    return s if len(s) <= n else s[: n - 3].rstrip() + "..."


def key_of(r):
    if r["ver_cell"].startswith("(unnumbered") and "Eyedropper" in r["title"]:
        return "UNNUM-EYEDROP"
    return r["ver_cell"]


def vtuple(r):
    m = re.search(r"v2\.(\d+)\.(\d+)", r["ver_cell"])
    return (2, int(m.group(1)), int(m.group(2))) if m else (2, 36, 5)  # unnumbered 14-Sep rows sit after v2.36.0


# ======================================================================= E.1 release rows
rel = []
for r in RM:
    k = key_of(r)
    cls0 = r["cls"]
    cls = CLASS_FIX.get(r["ver_cell"], (cls0,))[0]
    wps = WP_FIX.get(k)
    if wps is None:
        ranked = [w for w in r["ranked"] if w not in HUB_WPS] or r["ranked"]
        wps = ranked[:4]
    if cls not in OPEN:
        wps = list(WP_FIX.get(k, [])) if k in WP_FIX else []
        if k in RESIDUAL:
            wps = [RESIDUAL[k][0]] if RESIDUAL[k][0] else []
    elif k in RESIDUAL and RESIDUAL[k][0] and RESIDUAL[k][0] not in wps:
        wps = wps + [RESIDUAL[k][0]]
    text = r["area"] + " " + r["title"]
    gates = []
    for pat, dr in GATE_RULES:
        if re.search(pat, text) and dr not in gates:
            gates.append(dr)
    v = vtuple(r)
    ver = re.search(r"v2\.\d+\.\d+", r["ver_cell"])
    ver = ver.group(0) if ver else ""
    tv_confirmed = ver in CONFIRMED_AFTER_85 or k == "v2.37.0 (L12893)"
    if cls in OPEN and not tv_confirmed and (v >= (2, 86, 0) or cls in ("PENDING-SIGNOFF", "NOT-CONSIDERED")):
        gates = ["DR-01"] + gates
    rel.append(dict(key=k, ver_cell=r["ver_cell"], ver=ver, v=v, date=r["notes"] and r.get("date", ""),
                    title=r["title"], area=r["area"], cls0=cls0, cls=cls, vv=r["vv"], wps=wps, gates=gates,
                    files=r["files_src"], tests=r["tests"], folders_named=r.get("folders_named", [])))
# dates from appA
appA = {a["ver_cell"] + "|" + a["title"]: a for a in jload(WORK + "/appA_rows.json")}
for x in rel:
    a = appA.get(x["ver_cell"] + "|" + x["title"])
    x["date"] = a["date"] if a else ""

cnt0 = collections.Counter(x["cls0"] for x in rel)
cnt1 = collections.Counter(x["cls"] for x in rel)
OUT["class_counts_s11"] = dict(cnt0)
OUT["class_counts_corrected"] = dict(cnt1)
later = [x for x in rel if x["v"] >= (2, 86, 0)]
OUT["later_counts"] = dict(collections.Counter(x["cls"] for x in later))
OUT["open_rows"] = sum(1 for x in rel if x["cls"] in OPEN)

# per-release table
L = ["| TV release (devlog line) | Date | Title (TV devlog, shortened) | Area | Class | VV release / porting packages (primary first) | Decisions |",
     "|---|---|---|---|---|---|---|"]
for x in sorted(rel, key=lambda x: (x["v"], x["ver_cell"]), reverse=True):
    cls = x["cls"]
    c = "**%s**" % cls if cls in OPEN else cls
    if cls != x["cls0"]:
        c += " (S11: %s) †" % x["cls0"]
    elif x["key"] in RESIDUAL:
        c += " ‡"
    if x["ver"] in CONFIRMED_AFTER_85 or x["key"] == "v2.37.0 (L12893)":
        c += " TV-confirmed"
    vv = x["vv"] if x["vv"] not in ("", "-") else ""
    if cls in OPEN or x["key"] in RESIDUAL or x["key"] in WP_FIX:
        w = ", ".join(x["wps"]) if x["wps"] else "no package (see E.1.2)"
        vvcol = (vv + "; residual: " + w) if (vv and cls not in OPEN and x["wps"]) else (vv + "; " + w if vv and cls in OPEN else (w if cls in OPEN or x["wps"] else vv or "-"))
    else:
        vvcol = vv or "-"
    L.append("| %s | %s | %s | %s | %s | %s | %s |" % (
        x["ver_cell"], x["date"].replace("-2026", ""), short(x["title"], 70), md(x["area"]), c, md(vvcol),
        ", ".join(x["gates"]) or "-"))
OUT["release_table_rows"] = len(L) - 2
io.open(WORK + "/frag_E1_release_table.md", "w", encoding="utf-8").write("\n".join(L) + "\n")

# corrections table data
corr = []
for x in rel:
    if x["ver_cell"] in CLASS_FIX:
        nc, why, ev = CLASS_FIX[x["ver_cell"]]
        corr.append((x["v"], "| %s | %s | %s -> **%s** | %s | %s | %s |" % (
            x["ver_cell"].split(" (")[0], short(x["title"], 48), x["cls0"], nc, md(why), md(ev), ", ".join(x["wps"]) or "-")))
for k, (w, why, ev) in RESIDUAL.items():
    x = next((y for y in rel if y["ver_cell"] == k), None)
    if x is None:
        continue
    corr.append((x["v"], "| %s | %s | %s (kept) | %s | %s | %s |" % (
        x["ver_cell"].split(" (")[0], short(x["title"], 48), x["cls"], md(why), md(ev), ", ".join(x["wps"]) or "-")))
corr.sort(key=lambda t: t[0])
io.open(WORK + "/frag_E1_corrections.md", "w", encoding="utf-8").write(
    "| TV release | Title | S11 class -> corrected | Why | Evidence | Packages |\n|---|---|---|---|---|---|\n" +
    "\n".join(c for _, c in corr) + "\n")

# per-area watermark
AREA = {
    "LE-TOOLS": "LE sheet tools", "LE-DRAW": "LE drawing tools", "LE-VIEWPORT": "LE viewports and render styles",
    "LE-CORE": "LE core (model, history, tabs, toolbar)", "LE-TITLE": "LE title block, chrome and QR",
    "LE-SPEC": "LE specification and notes", "LE-SCRAP": "LE scrapbooks", "LE-PUB": "LE web viewer, PDF, publishing",
    "PL": "Projected linework (50)", "DRAW-CORE": "Drawing core, plans, elevations, north, planes, fog (40-49)",
    "LE-AREAS": "Floor areas (LE 59)", "LE-REG": "Register, Document ID, sheet images (LE 51, 54)",
    "LE-STMT": "Statement writer (LE 52)", "LE-SITE": "Site plans and hatch library", "KEYS": "Keyboard scopes",
    "COLOUR": "Colour palette (54)", "PERSIST": "Persistence guards", "PM": "Presentation / 3D (not drawing)",
    "3D": "Presentation / 3D (not drawing)", "SHELL": "App shell"}
grp = collections.defaultdict(list)
for x in rel:
    a = re.split(r"[ /]", x["area"].strip())[0]
    grp[AREA.get(a, a)].append(x)
A = ["| Area | High-water (newest ported) | VV release | Low-water (oldest open) | Open | of which partial | Main packages (primary owners) |",
     "|---|---|---|---|---|---|---|"]
order = ["LE sheet tools", "LE drawing tools", "LE viewports and render styles", "LE core (model, history, tabs, toolbar)",
         "LE title block, chrome and QR", "LE specification and notes", "LE scrapbooks", "LE web viewer, PDF, publishing",
         "Projected linework (50)", "Drawing core, plans, elevations, north, planes, fog (40-49)", "Floor areas (LE 59)",
         "Register, Document ID, sheet images (LE 51, 54)", "Statement writer (LE 52)", "Site plans and hatch library",
         "Keyboard scopes", "Colour palette (54)", "Persistence guards", "Presentation / 3D (not drawing)", "App shell"]
for g in order:
    xs = grp.get(g, [])
    if not xs:
        continue
    ported = [x for x in xs if x["cls"] == "PORTED"]
    opn = [x for x in xs if x["cls"] in OPEN]
    hi = max(ported, key=lambda x: x["v"]) if ported else None
    lo = min(opn, key=lambda x: x["v"]) if opn else None
    wc = collections.Counter()
    for x in opn:
        for w in x["wps"][:2]:
            wc[w] += 1
    A.append("| %s | %s | %s | %s | %d | %d | %s |" % (
        g, (hi["ver_cell"].split(" (")[0] if hi else "-"), (md(hi["vv"]) if hi else "-"),
        (lo["ver_cell"].split(" (")[0] if lo else "-"), len(opn), sum(1 for x in opn if x["cls"] == "PARTIAL"),
        ", ".join(w for w, _ in wc.most_common(6)) or "-"))
io.open(WORK + "/frag_E1_area.md", "w", encoding="utf-8").write("\n".join(A) + "\n")

# releases -> folder index (open releases per folder)
def folder_key(path):
    p = path.split("/")
    if p[0] == "02__Src__AppModules" and len(p) > 1:
        if p[1] == "51__System__LayoutEditor" and len(p) > 2 and re.match(r"\d\d__", p[2]):
            return "LE/" + p[2]
        return p[1]
    return p[0]


open_by_folder = collections.defaultdict(set)
for x in rel:
    if x["cls"] not in OPEN:
        continue
    for f in x["files"]:
        open_by_folder[folder_key(f)].add(x["ver"] or x["ver_cell"])
    for fo in x.get("folders_named", []):
        # a folder named in the entry (TV-only systems are often named by folder, not by file)
        hits = [r for r, _ in TREE_TV if ("/" + fo + "/") in ("/" + r) and r.startswith("02__Src__AppModules/")]
        if hits:
            open_by_folder[folder_key(hits[0])].add(x["ver"] or x["ver_cell"])
json.dump({k: sorted(v, key=vkey) for k, v in open_by_folder.items()}, io.open(WORK + "/open_by_folder.json", "w", encoding="utf-8"), indent=1)

# ======================================================================= E.2 parity matrix (mechanical)
def drift_rows(pred):
    return [d for d in DRIFT if pred(d)]


def stats(rows):
    s = collections.Counter(d["state"] for d in rows)
    tvl = sum(int(d["tv_lines"] or 0) for d in rows if d["state"] != "vv-only")
    vvl = sum(int(d["vv_lines"] or 0) for d in rows if d["state"] != "tv-only")
    dif = sum(int(d["diff_lines"] or 0) for d in rows if d["state"] in ("drifted", "header-only"))
    tvo = [d for d in rows if d["state"] == "tv-only"]
    vvo = [d for d in rows if d["state"] == "vv-only"]
    both = s["drifted"] + s["header-only"] + s["identical"]
    return dict(both=both, ident=s["identical"], hdr=s["header-only"], drift=s["drifted"],
                tvo=len(tvo), tvo_l=sum(int(d["tv_lines"] or 0) for d in tvo),
                vvo=len(vvo), vvo_l=sum(int(d["vv_lines"] or 0) for d in vvo), tvl=tvl, vvl=vvl, dif=dif)


def tree_stats(prefix, tree):
    fs = [(r, l) for r, l in tree if r.startswith(prefix)]
    return len(fs), sum(l for _, l in fs)


TF = {}
for t in jload(PAR + "/data/target_folder_map.json"):
    TF[(t["current_vv"] or "", t["tv_equivalent"] or "")] = t
    if t["tv_equivalent"]:
        TF[("tv", t["tv_equivalent"])] = t
    if t["current_vv"]:
        TF[("vv", t["current_vv"])] = t


def wps_for_folder(tv_prefix, vv_prefix):
    ws = set()
    for s, wl in TVSRC2WP.items():
        if tv_prefix and s.startswith(tv_prefix):
            ws.update(wl)
    for s, wl in VVTGT2WP.items():
        if (vv_prefix and s.startswith(vv_prefix)) or (tv_prefix and s.startswith(tv_prefix)):
            ws.update(w for w in wl if not w.endswith("-99") and w not in ("W0-02", "W0-06", "W6-04"))
    return wp_sort(ws)


TOP_ROWS = [  # (vv_current, tv_folder) for 40-55 and the drawing-adjacent TV-only 27 / 80
    ("40__System__2dElevationsView", None), ("41__System__CrossSectionView", "41__System__SectionCutEngine"),
    ("42__System__DrawingViewCore", "40__System__DrawingViewCore"), ("43__System__FloorPlanViews", "42__System__FloorPlanViews"),
    ("44__System__PlanAnnotations", "43__System__PlanAnnotations"), ("45__System__PlanDimensions", "44__System__PlanDimensions"),
    ("46__System__ElevationViews", "45__System__ElevationViews"), ("47__System__NorthDirection", "46__System__NorthDirection"),
    (None, "47__System__DrawingPlanes"), (None, "48__System__CrossSectionViews"), (None, "49__System__ElevationDepthFog"),
    ("50__System__ProjectedLinework", "50__System__ProjectedLinework"), ("51__System__LayoutEditor", "51__System__LayoutEditor"),
    (None, "52__System__Layout__PublishedDocuments"), (None, "53__Data__Layout__PublishedSchema"),
    (None, "54__Feature__ColourPalette"), (None, "55__Feature__SpellCheck"),
    (None, "27__System__ContextMenuSystem"), (None, "80__CloudflareIntegration"),
]
T = ["| VV now -> K2 target (TF id) | TV folder | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Lines TV / VV | Diff lines (shared) |",
     "|---|---|---|---|---|---|---|---|---|---|"]
top_data = {}
for vvf, tvf in TOP_ROWS:
    if vvf and tvf and vvf != "41__System__CrossSectionView":
        st = stats(drift_rows(lambda d, a=vvf: d["vv_folder"] == a))
    elif vvf == "41__System__CrossSectionView":
        st = stats(drift_rows(lambda d: d["vv_folder"] == "41__System__CrossSectionView"))
    elif tvf:
        n, l = tree_stats("02__Src__AppModules/" + tvf + "/", TREE_TV)
        st = dict(both=0, ident=0, hdr=0, drift=0, tvo=n, tvo_l=l, vvo=0, vvo_l=0, tvl=l, vvl=0, dif=0)
    else:
        n, l = tree_stats("02__Src__AppModules/" + vvf + "/", TREE_VV)
        st = dict(both=0, ident=0, hdr=0, drift=0, tvo=0, tvo_l=0, vvo=n, vvo_l=l, tvl=0, vvl=l, dif=0)
    t = TF.get(("vv", "02__Src__AppModules/" + vvf + "/")) if vvf else TF.get(("tv", "02__Src__AppModules/" + tvf + "/"))
    tgt = (t["target_vv"] or "retire").replace("02__Src__AppModules/", "").rstrip("/") if t else "-"
    tid = t["id"] if t else "-"
    left = ("%s -> %s (%s)" % (vvf, tgt, tid)) if vvf else ("(none) -> %s (%s)" % (tgt, tid))
    if vvf and t and t["current_vv"] == t["target_vv"]:
        left = "%s (kept, %s)" % (vvf, tid)
    top_data[tvf or vvf] = st
    T.append("| %s | %s | %d | %d | %d | %d | %d (%s) | %d (%s) | %s / %s | %s |" % (
        left, tvf or "-", st["both"], st["ident"], st["hdr"], st["drift"], st["tvo"], format(st["tvo_l"], ","),
        st["vvo"], format(st["vvo_l"], ","), format(st["tvl"], ","), format(st["vvl"], ","), format(st["dif"], ",")))
io.open(WORK + "/frag_E2_top.md", "w", encoding="utf-8").write("\n".join(T) + "\n")

# LE subfolders
le = drift_rows(lambda d: d["vv_folder"] == "51__System__LayoutEditor")
subs = sorted(set(d["relpath"].split("/")[0] for d in le))
S = ["| LE subfolder | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Lines TV / VV | Diff lines (shared) | K2 |",
     "|---|---|---|---|---|---|---|---|---|---|"]
le_data = {}
tot = collections.Counter()
for sname in subs:
    rows = [d for d in le if d["relpath"].split("/")[0] == sname]
    st = stats(rows)
    le_data[sname] = st
    for k2, v2 in st.items():
        tot[k2] += v2
    t = TF.get(("tv", "02__Src__AppModules/51__System__LayoutEditor/" + sname + "/")) or TF.get(("vv", "02__Src__AppModules/51__System__LayoutEditor/" + sname + "/"))
    S.append("| %s | %d | %d | %d | %d | %d (%s) | %d (%s) | %s / %s | %s | %s %s |" % (
        sname, st["both"], st["ident"], st["hdr"], st["drift"], st["tvo"], format(st["tvo_l"], ","), st["vvo"], format(st["vvo_l"], ","),
        format(st["tvl"], ","), format(st["vvl"], ","), format(st["dif"], ","), t["id"] if t else "-", t["action"] if t else ""))
S.append("| **Total LE/** | **%d** | **%d** | **%d** | **%d** | **%d (%s)** | **%d (%s)** | **%s / %s** | **%s** | |" % (
    tot["both"], tot["ident"], tot["hdr"], tot["drift"], tot["tvo"], format(tot["tvo_l"], ","), tot["vvo"], format(tot["vvo_l"], ","),
    format(tot["tvl"], ","), format(tot["vvl"], ","), format(tot["dif"], ",")))
io.open(WORK + "/frag_E2_le.md", "w", encoding="utf-8").write("\n".join(S) + "\n")
OUT["le_totals"] = dict(tot)

# adjacent shared folders the drawing system imports
ADJ = ["01__AppCore", "02__AppData", "03__AppUtils", "06__Scene__LightingEffects", "10__NavigationAndCameras", "15__ModelLoader",
       "21__System__PresentationMode", "26__System__ToggleModelElements", "30__System__ImageExport", "70__System__DevTools"]
J = ["| Folder (same number both apps) | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Diff lines (shared) |",
     "|---|---|---|---|---|---|---|---|"]
for f in ADJ:
    st = stats(drift_rows(lambda d, a=f: d["vv_folder"] == a))
    J.append("| %s | %d | %d | %d | %d | %d (%s) | %d (%s) | %s |" % (
        f, st["both"], st["ident"], st["hdr"], st["drift"], st["tvo"], format(st["tvo_l"], ","), st["vvo"], format(st["vvo_l"], ","), format(st["dif"], ",")))
io.open(WORK + "/frag_E2_adjacent.md", "w", encoding="utf-8").write("\n".join(J) + "\n")

# packages per folder (for the analysis table)
pk_by_folder = {}
for vvf, tvf in TOP_ROWS:
    tvp = ("02__Src__AppModules/" + tvf + "/") if tvf else None
    vvp = ("02__Src__AppModules/" + vvf + "/") if vvf else None
    if tvf == "51__System__LayoutEditor":
        continue
    pk_by_folder[tvf or vvf] = wps_for_folder(tvp, vvp)
for sname in subs:
    p = "02__Src__AppModules/51__System__LayoutEditor/" + sname + "/"
    pk_by_folder["LE/" + sname] = wps_for_folder(p, p)
json.dump(pk_by_folder, io.open(WORK + "/packages_by_folder.json", "w", encoding="utf-8"), indent=1)
OUT["top_data"] = top_data
OUT["le_data"] = le_data

json.dump(OUT, io.open(WORK + "/r5_summary.json", "w", encoding="utf-8"), indent=1)
json.dump(rel, io.open(WORK + "/release_rows_final.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(json.dumps({k: OUT[k] for k in ("class_counts_s11", "class_counts_corrected", "later_counts", "open_rows", "release_table_rows", "le_totals")}, indent=1))

# ======================================================================= reverse index: package -> TV releases
rev = collections.defaultdict(list)
for x in rel:
    if x["cls"] in OPEN or x["key"] in RESIDUAL:
        for i, w in enumerate(x["wps"]):
            rev[w].append((x["ver"] or "14-Sep " + x["title"].split(" (")[0].split(" ")[0].lower(), i == 0))
R = ["| Package | Title (K3) | TV releases it carries (primary in bold) |", "|---|---|---|"]
for w in wp_sort(rev):
    vs = sorted(set(rev[w]), key=lambda t: vkey(t[0]))
    seen = {}
    for v, prim in vs:
        seen[v] = seen.get(v, False) or prim
    txt = ", ".join(("**%s**" % v.replace("v2.", "")) if p else v.replace("v2.", "") for v, p in sorted(seen.items(), key=lambda t: vkey(t[0])))
    R.append("| %s | %s | %s |" % (w, short(PKGS[w]["title"], 70) if w in PKGS else "-", txt))
io.open(WORK + "/frag_E1_reverse.md", "w", encoding="utf-8").write("\n".join(R) + "\n")
nop = [x["ver_cell"] for x in rel if x["cls"] in OPEN and not x["wps"]]
print("open releases without a package:", nop)
print("packages carrying releases:", len(rev))
