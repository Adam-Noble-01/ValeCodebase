"""Per-file drift between TrueVision and ValeVision for every module folder.

Writes drift_all.tsv (one row per file in either app) and prints a summary per folder.
Matching is by (logical system, relative path inside the folder), using the folder
number map so VV 42__DrawingViewCore pairs with TV 40__DrawingViewCore etc.
"""
import difflib, os, re, sys, json

TV = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode\02__Src__AppModules"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules"
OUT = os.path.dirname(os.path.abspath(__file__))

# Logical pairing of folders (VV folder -> TV folder). None = no counterpart.
PAIRS = {
    "42__System__DrawingViewCore": "40__System__DrawingViewCore",
    "41__System__CrossSectionView": "41__System__SectionCutEngine",
    "43__System__FloorPlanViews": "42__System__FloorPlanViews",
    "44__System__PlanAnnotations": "43__System__PlanAnnotations",
    "45__System__PlanDimensions": "44__System__PlanDimensions",
    "46__System__ElevationViews": "45__System__ElevationViews",
    "47__System__NorthDirection": "46__System__NorthDirection",
    "50__System__ProjectedLinework": "50__System__ProjectedLinework",
    "51__System__LayoutEditor": "51__System__LayoutEditor",
    "01__AppCore": "01__AppCore",
    "02__AppData": "02__AppData",
    "03__AppUtils": "03__AppUtils",
    "21__System__PresentationMode": "21__System__PresentationMode",
    "70__System__DevTools": "70__System__DevTools",
    "15__ModelLoader": "15__ModelLoader",
    "06__Scene__LightingEffects": "06__Scene__LightingEffects",
    "26__System__ToggleModelElements": "26__System__ToggleModelElements",
    "30__System__ImageExport": "30__System__ImageExport",
    "10__NavigationAndCameras": "10__NavigationAndCameras",
}
SKIP_DIRS = {"node_modules", ".wrangler", "00__Archive", "__pycache__"}
TEXT_EXT = {".js", ".mjs", ".css", ".json", ".html", ".md", ".py", ".txt"}

VER_RE = re.compile(r"(?i)version\s*[:\-]?\s*v?(\d+\.\d+\.\d+)")

def files_under(root):
    out = {}
    if not os.path.isdir(root):
        return out
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            p = os.path.join(dp, fn)
            rel = os.path.relpath(p, root).replace("\\", "/")
            out[rel] = p
    return out

def read_lines(p):
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as fh:
            return [l.rstrip("\r\n").rstrip() for l in fh]
    except Exception:
        return None

def version_of(lines):
    if not lines:
        return ""
    for l in lines[:80]:
        m = VER_RE.search(l)
        if m:
            return m.group(1)
    return ""

rows = []
summary = {}
for vv_folder, tv_folder in PAIRS.items():
    vf = files_under(os.path.join(VV, vv_folder))
    tf = files_under(os.path.join(TV, tv_folder))
    keys = sorted(set(vf) | set(tf))
    s = {"vv_folder": vv_folder, "tv_folder": tv_folder, "both": 0, "identical": 0, "header_only": 0,
         "drifted": 0, "tv_only": 0, "vv_only": 0, "tv_lines": 0, "vv_lines": 0, "diff_lines": 0}
    for k in keys:
        ext = os.path.splitext(k)[1].lower()
        in_v, in_t = k in vf, k in tf
        if ext not in TEXT_EXT:
            state = "binary-both" if (in_v and in_t) else ("tv-only" if in_t else "vv-only")
            rows.append([vv_folder, tv_folder, k, state, "", "", "", "", ""])
            if in_t and not in_v: s["tv_only"] += 1
            if in_v and not in_t: s["vv_only"] += 1
            continue
        tl = read_lines(tf[k]) if in_t else None
        vl = read_lines(vf[k]) if in_v else None
        if in_t and in_v:
            s["both"] += 1
            sm = difflib.SequenceMatcher(None, tl, vl, autojunk=False)
            changed = 0
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag != "equal":
                    changed += (i2 - i1) + (j2 - j1)
            # header-only heuristic: all changes in first 120 lines (headers/port notes)
            body_changed = 0
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag != "equal" and (i1 >= 120 or j1 >= 120):
                    body_changed += (i2 - i1) + (j2 - j1)
            if changed == 0:
                state = "identical"; s["identical"] += 1
            elif body_changed <= 4:
                state = "header-only"; s["header_only"] += 1
            else:
                state = "drifted"; s["drifted"] += 1
            s["diff_lines"] += changed
            s["tv_lines"] += len(tl); s["vv_lines"] += len(vl)
            rows.append([vv_folder, tv_folder, k, state, len(tl), len(vl), changed, version_of(tl), version_of(vl)])
        elif in_t:
            s["tv_only"] += 1; s["tv_lines"] += len(tl or [])
            rows.append([vv_folder, tv_folder, k, "tv-only", len(tl or []), "", "", version_of(tl), ""])
        else:
            s["vv_only"] += 1; s["vv_lines"] += len(vl or [])
            rows.append([vv_folder, tv_folder, k, "vv-only", "", len(vl or []), "", "", version_of(vl)])
    summary[vv_folder] = s

with open(os.path.join(OUT, "drift_all.tsv"), "w", encoding="utf-8") as fh:
    fh.write("vv_folder\ttv_folder\trelpath\tstate\ttv_lines\tvv_lines\tdiff_lines\ttv_ver\tvv_ver\n")
    for r in rows:
        fh.write("\t".join(str(x) for x in r) + "\n")

with open(os.path.join(OUT, "drift_summary.json"), "w", encoding="utf-8") as fh:
    json.dump(summary, fh, indent=1)

print(f"{'VV folder':38} {'TV folder':38} both ident hdr drift tvOnly vvOnly  tvLines vvLines diffLines")
for k, s in summary.items():
    print(f"{k:38} {s['tv_folder']:38} {s['both']:4} {s['identical']:5} {s['header_only']:3} {s['drifted']:5} {s['tv_only']:6} {s['vv_only']:6} {s['tv_lines']:8} {s['vv_lines']:7} {s['diff_lines']:9}")
