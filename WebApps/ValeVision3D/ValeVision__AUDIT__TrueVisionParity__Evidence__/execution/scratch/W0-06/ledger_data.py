# W0-06: build the data for the restructured parity ledger (Module Register + Release Watermark).
# Read-only on both apps (TV only at the pin). Output: scratch/W0-06/ledger_data.json
import csv, io, json, os, re, subprocess, sys
from collections import Counter, OrderedDict

sys.stdout.reconfigure(encoding="utf-8")
EV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
VVM = os.path.join(VV, "02__Src__AppModules")
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
PIN = "b2aa9151"
SCR = os.path.join(EV, "execution", "scratch", "W0-06")
P = os.path.join(EV, "parity")


def rd(p):
    return io.open(p, encoding="utf-8").read()


# ------------------------------------------------------------------ TV tree at the pin
tv_files = subprocess.run(["git", "-C", NAWEB, "ls-tree", "-r", "--name-only", PIN, TVAPP + "02__Src__AppModules/"],
                          capture_output=True, text=True, check=True).stdout.splitlines()
TV_SET = set(f[len(TVAPP):] for f in tv_files)   # '02__Src__AppModules/...'


def tv_show(path):
    r = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + path], capture_output=True)
    return r.stdout.decode("utf-8", errors="replace") if r.returncode == 0 else None


# ------------------------------------------------------------------ VV tree now
VV_SET = set()
for root, dirs, files in os.walk(VVM):
    if "node_modules" in root:
        continue
    for f in files:
        VV_SET.add(os.path.relpath(os.path.join(root, f), VV).replace("\\", "/"))

# ------------------------------------------------------------------ renumber map (W0-02)
rep = json.load(open(os.path.join(EV, "execution", "scratch", "W0-02", "renumber_git_report.json"), encoding="utf-8"))
FOLDER_MOVES = [(a, b, c) for a, b, c in rep["folder_moves"]]
FILE_MOVES = [(a, b, c) for a, b, c in rep["file_moves"]]
W003_RENAMES = [
    ("FR-12", "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json",
     "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json"),
    ("FR-13", "02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json",
     "02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json"),
]


def vv_new_path(old):
    p = old
    for fid, a, b in FILE_MOVES:
        if p == a:
            p = b
    for _fid, a, b in W003_RENAMES:
        if p == a:
            p = b
    for did, a, b in FOLDER_MOVES:
        pre = "02__Src__AppModules/" + a + "/"
        if p.startswith(pre):
            p = "02__Src__AppModules/" + b + "/" + p[len(pre):]
            break
    return p


# ------------------------------------------------------------------ S11 c.1 rows and verifier corrections
lines = rd(os.path.join(P, "slices", "S11__Ledger_Release_Watermark.md")).split("\n")
C1 = []
for l in lines[388:676]:
    if re.match(r"^\| \d+ \|", l):
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        C1.append(dict(n=int(c[0]), tv=c[1].strip("`"), tv_ver=c[2], vv_old=c[3].strip("`"), vv_ver=c[4],
                       last=c[5], state=c[6], after=c[7], action=c[8], adapt=c[9]))
assert len(C1) == 261, len(C1)
CORR = {
    74: ("port_adapted", "TV 1.1.0 (14-Sep, TV v2.37.0 edge rules in the fingerprint) is not in VV (S11 c.1 verifier; S02b)"),
    140: ("port_adapted", "TV 1.8.0 (21-Sep) Draft mode, hidden by VV's 28-Sep entry; no DraftMode in VV (S11 c.1 verifier; S04b)"),
    143: ("port_adapted", "TV 1.1.0 (20-Sep) adds the storey fact (TV v2.87.0) (S11 c.1 verifier)"),
    144: ("port_adapted", "TV 1.1.0 (20-Sep) adds the storey fact (TV v2.87.0) (S11 c.1 verifier)"),
    149: ("port_adapted (hunks only, DIV-1)", "TV 1.12.0 fog source (v2.94.0) and 1.12.1 storey doors (v2.105.0), hidden by VV's 28-Sep entry; keep the DIV-1 seams (S11 c.1 verifier)"),
    210: ("port_adapted", "TV 1.2.1 (20-Sep) tab hover text, absent in VV (S11 c.1 verifier)"),
    222: ("port_adapted", "TV 1.1.0 (20-Sep, v2.96.0) exports Na__LeParamBar__PaperMm, absent in VV (S11 c.1 verifier)"),
    241: ("port_adapted", "TV BatchOps 1.1.0 { groupName } (v2.92.0, NOT-DRAWING; DR-44) absent in VV (S11 c.1 verifier)"),
    244: ("port_adapted", "TV SceneEditor 1.3.0 Na__PmDev__RunImageExport (v2.92.0, NOT-DRAWING; DR-44) absent in VV (S11 c.1 verifier)"),
    253: ("port_adapted", "VV skipped TV 1.3.0 (14-Sep, v2.38.1 ortho depth bias) while taking 1.3.1, 1.3.2 and 1.4.0 (S11 c.1 verifier)"),
    57: ("port whole after Na__InteractiveOverlays (TV v2.84.0 half)", "VV PORT NOTE: take TV 1.1.0 whole once Na__InteractiveOverlays is ported (S11 c.1 verifier)"),
    60: ("port whole after Na__InteractiveOverlays (TV v2.84.0 half)", "VV PORT NOTE: take TV 1.1.0 whole once Na__InteractiveOverlays is ported (S11 c.1 verifier)"),
    16: (None, "seam: keep VV's Styles and Exclusions rows (D33; S11-V03)"),
    17: (None, "seam: keep VV's Styles and Exclusions rows (D33; S11-V03)"),
    46: (None, "seam: keep VV's Styles and Exclusions rows (D33; S11-V03)"),
    47: (None, "seam: keep VV's Styles and Exclusions rows (D33; S11-V03)"),
    35: ("keep_vv_divergence (VV ahead)", "VV's ConfigState/EditorPreview split is single-sourced; TV's Data (988 lines) keeps its own copies (S11-V03; WT-01)"),
    38: ("keep_vv_divergence (VV ahead)", "VV's EditorPreview split; TV's Editor (907 lines) keeps its own copy (S11-V03; WT-01)"),
    111: (None, "transport seam (DIV-4): TV imports Na__CfApi__GetLoadedProjectData - VV facade (W0-12)"),
    217: (None, "transport seam (DIV-4): TV imports Na__CfApi__* - VV facade (W0-12)"),
    246: (None, "transport seam (DIV-4): TV imports Na__CfApi__GetLoadedProjectData and Na__CfApi__BuildContentCdnUrl - VV facade (W0-12)"),
    19: (None, "VV module is 1.2.2 (log, 09-Sep; DIV-1/DIV-2 seams); 1.1.0 is its PORT NOTE Source version (S11 c.1 verifier)"),
}

# ------------------------------------------------------------------ packages index (wp_canonical)
wpc = json.load(open(os.path.join(P, "data", "wp_canonical.json"), encoding="utf-8"))
TOPO = {w: i for i, w in enumerate(wpc["topological_order"])}
PK_BY_VV = {}
PK_BY_TV = {}
for p in wpc["packages"]:
    wid = p["wp_id"]
    for s in p.get("edits", []):
        if s.startswith("VV/02__Src__AppModules/"):
            k = s[3:].split(" ")[0]
            PK_BY_VV.setdefault(k, set()).add(wid)
    for s in p.get("tv_sources", []):
        if s.startswith("TVM/"):
            k = "02__Src__AppModules/" + s[4:].split(" ")[0]
            PK_BY_TV.setdefault(k, set()).add(wid)


def pk_list(vvp, tvp):
    s = set()
    if vvp:
        s |= PK_BY_VV.get(vvp, set())
    if tvp:
        s |= PK_BY_TV.get(tvp, set())
    return sorted(s, key=lambda w: TOPO.get(w, 9999))


# ------------------------------------------------------------------ W0-05 map (transport seams, takes)
pom = json.load(open(os.path.join(EV, "execution", "port_order_map.json"), encoding="utf-8"))
TS = {}
for t in pom["transport_seams"]:
    TS.setdefault(t["importer"], set()).add(t["target"].rsplit("/", 1)[-1].replace(".js", ""))
OTHER_SEAMS = {}
for t in pom["other_seams"]:
    OTHER_SEAMS.setdefault(t["importer"], set()).add(t["seam"])

# ------------------------------------------------------------------ VV import graph (loaded by, VV transport)
IMP_RE = re.compile(r"""(?:import\s[^'";]*?from\s*|import\s*\(\s*|import\s+|export\s[^'";]*?from\s*)['"]([^'"]+)['"]""", re.S)
URL_RE = re.compile(r"""new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url""")
CSS_IMP = re.compile(r"""@import\s+(?:url\()?['"]([^'"]+)['"]""")
importers = {}
vv_transport = {}
TRANSPORT_MODS = ("Na__AppUtils__R2SaveProjectJson__", "Na__AppUtils__R2AssetUpload__", "Na__AppUtils__R2DrawingNotes__",
                  "Na__CloudflareIntegration__ApiClient__", "Na__AppUtils__LocalProjectMirror__")


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return "\n".join(re.sub(r"(^|[^:'\"])//.*$", r"\1", l) for l in src.split("\n"))


def resolve(base, spec):
    if spec.startswith("."):
        p = os.path.normpath(os.path.join(os.path.dirname(base), spec)).replace("\\", "/")
        return p
    return None


STYLE_SET = set()
for root, dirs, files in os.walk(os.path.join(VV, "03__Style__AppStylesheets")):
    for f in files:
        STYLE_SET.add(os.path.relpath(os.path.join(root, f), VV).replace("\\", "/"))
for rel in sorted(VV_SET | STYLE_SET):
    if not rel.endswith((".js", ".mjs", ".css")):
        continue
    src = rd(os.path.join(VV, rel))
    code = strip_comments(src) if rel.endswith((".js", ".mjs")) else src
    specs = IMP_RE.findall(code) + URL_RE.findall(code) + (CSS_IMP.findall(code) if rel.endswith(".css") else [])
    for sp in specs:
        tgt = resolve(rel, sp)
        if tgt:
            importers.setdefault(tgt, set()).add(rel)
            base = tgt.rsplit("/", 1)[-1].replace(".js", "")
            if base in TRANSPORT_MODS:
                vv_transport.setdefault(rel, set()).add(base)
    if rel.endswith(".js") and re.search(r"""fetch\([^)]*['"`][^'"`]*/api/""", code):
        vv_transport.setdefault(rel, set()).add("fetch /api/")
html = rd(os.path.join(VV, "index.html"))
for m in re.finditer(r"""['"](\./)?(02__Src__AppModules/[^'"]+\.(?:js|css))['"]""", html):
    importers.setdefault(m.group(2), set()).add("index.html")
for m in re.finditer(r"""['"](\./)?(03__Style__AppStylesheets/[^'"]+\.css)['"]""", html):
    importers.setdefault(m.group(2), set()).add("index.html")


TEXT_CACHE = {}


def named_by(vvp):
    base = vvp.rsplit("/", 1)[-1]
    hits = []
    for rel in sorted(VV_SET | STYLE_SET):
        if not rel.endswith((".js", ".mjs", ".html", ".css")) or rel == vvp:
            continue
        if rel not in TEXT_CACHE:
            TEXT_CACHE[rel] = rd(os.path.join(VV, rel))
        if base in TEXT_CACHE[rel]:
            hits.append(rel)
    if base in html:
        hits.insert(0, "index.html")
    return hits


def loaded_by(vvp):
    s = importers.get(vvp, set())
    if not s and vvp.endswith((".json", ".html")):
        hits = named_by(vvp)
        if hits:
            first = hits[0] if hits[0] == "index.html" else "`" + hits[0].rsplit("/", 1)[-1] + "`"
            return "named by " + first + (" (+%d)" % (len(hits) - 1) if len(hits) > 1 else "")
    if not s:
        return "-"
    if "index.html" in s:
        rest = len(s) - 1
        return "index.html" + (" (+%d)" % rest if rest else "")
    names = sorted(x.rsplit("/", 1)[-1] for x in s)
    css_idx = [x for x in s if x.endswith("Na__CoreUi__Styles__Index__.css")]
    if css_idx:
        return "CSS index" + (" (+%d)" % (len(s) - 1) if len(s) > 1 else "")
    loader = [x for x in s if x.endswith("Na__LayoutEditor__Loader__.js")]
    if loader:
        return "LE loader" + (" (+%d)" % (len(s) - 1) if len(s) > 1 else "")
    return "`" + names[0] + "`" + (" (+%d)" % (len(s) - 1) if len(s) > 1 else "")


# ------------------------------------------------------------------ PORT NOTE source lines (VV now)
def port_note(vvp):
    if not vvp or vvp not in VV_SET or not vvp.endswith((".js", ".css", ".mjs")):
        return None, None
    src = rd(os.path.join(VV, vvp))
    head = src[:12000]
    pf = re.search(r"-\s*(Ported from|Authored in)\s*:\s*(.+)", head)
    sv = re.search(r"-\s*Source version\s*:\s*(.+)", head)
    svt = sv.group(1).strip() if sv else None
    if svt and svt.count("(") != svt.count(")"):
        svt = svt.split(";")[0].strip()
    return (pf.group(1) + ": " + pf.group(2).strip()) if pf else None, svt


def top_version(text):
    if not text:
        return ""
    m = re.search(r"DEVELOPMENT LOG:.*?(\d{2}-[A-Za-z]{3}-20\d\d)\s*-\s*Version\s*([0-9]+\.[0-9]+\.[0-9]+)", text, re.S)
    return m.group(2) if m else ""


# ------------------------------------------------------------------ build register rows
reg = []
seen_vv = set()
seen_tv = set()
for r in C1:
    vvn = vv_new_path(r["vv_old"])
    assert vvn in VV_SET, ("missing", vvn)
    action, extra = r["action"], []
    if r["n"] in CORR:
        a, note = CORR[r["n"]]
        if a:
            action = a + " (was " + r["action"] + ")"
        extra.append(note)
    pf, sv = port_note(vvn)
    tv_src = sv if sv else ("cites TrueVision3D " + r["last"].split("/")[1].strip() if "/" in r["last"] and r["last"].split("/")[1].strip() not in ("-", "") else "unrecorded")
    if pf and pf.startswith("Ported from: Lantern") and not sv:
        tv_src = "- (from Lantern Designer)"
    if pf and pf.startswith("Authored in") and not sv:
        tv_src = "- (authored in ValeVision first; TrueVision's file is its twin)"
    st = r["state"]
    m = re.match(r"(header-only|drifted|identical)\s*\((\d+)\)", st)
    kind = m.group(1) if m else st
    parity = {"header-only": "verbatim (header only)", "drifted": "drifted", "identical": "verbatim"}.get(kind, kind)
    if m:
        parity += " (%s diff lines)" % m.group(2) if kind != "header-only" else ""
    KEEP = {"Na__DrawView__SectionAdapter__.js": "diverged (DIV-2: TV's path and 13 exports, VV body)",
            "Na__AppFlow__LoadingSequence.js": "diverged (VV load contract, PD-08: hunks only, never whole)",
            "Na__AppUtils__ProjectLoader.js": "diverged (VV project identity and storage, DIV-4: hunks only)",
            "Na__LayoutEditor__ProjectRecord__.js": "diverged (PD-19: no Project Admin in VV)"}
    if "keep_vv_divergence" in action:
        parity = KEEP.get(vvn.rsplit("/", 1)[-1], parity + "; kept (VV ahead)")
    div = []
    if r["adapt"] not in ("-", ""):
        div.append(r["adapt"])
    div += extra
    trans = []
    if vvn in vv_transport:
        trans.append("VV: " + ", ".join(sorted(vv_transport[vvn])))
    if r["tv"] in TS:
        trans.append("TV: " + ", ".join(sorted(TS[r["tv"]])) + " -> VV facade (DIV-4)")
    reg.append(OrderedDict(group="shared", n=r["n"], vv=vvn, tv=r["tv"], tv_src=tv_src, tv_cur=r["tv_ver"] or "-",
                           parity=parity, action=action, div="; ".join(div) or "-",
                           open=(r["after"] if r["after"] not in ("", "-") else "none (date rule)"),
                           loaded=loaded_by(vvn), transport="; ".join(trans) or "-", pk=pk_list(vvn, r["tv"])))
    seen_vv.add(vvn)
    seen_tv.add(r["tv"])

# shared JSON configs (drift_all) in the drawing folders + main config
drift = list(csv.DictReader(io.open(os.path.join(P, "ref", "drift_all.tsv"), encoding="utf-8"), delimiter="\t"))
for d in drift:
    if d["state"] in ("tv-only", "vv-only"):
        continue
    if not d["relpath"].endswith(".json"):
        continue
    vv_old = "02__Src__AppModules/" + d["vv_folder"] + "/" + d["relpath"]
    tvp = "02__Src__AppModules/" + d["tv_folder"] + "/" + d["relpath"]
    vvn = vv_new_path(vv_old)
    if vvn not in VV_SET:
        continue
    reg.append(OrderedDict(group="config", n=None, vv=vvn, tv=tvp, tv_src="-", tv_cur="-",
                           parity={"header-only": "verbatim (header only)", "drifted": "drifted (%s diff lines)" % d["diff_lines"],
                                   "identical": "identical"}.get(d["state"], d["state"]),
                           action="travels with its module (K2 N5, F3)", div="-", open="-", loaded=loaded_by(vvn),
                           transport="-", pk=pk_list(vvn, tvp)))
    seen_vv.add(vvn)
    seen_tv.add(tvp)

# pairs made in Wave 0 (not in c.1)
W0_PAIRS = [
    ("02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js", "diverged (DIV-1): TV's file name and eight exports over VV's EffectComposer body (FR-09)", "W0-02: renamed from 42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js; NAMESPACE keeps the private Na__DrawPreset (K2 H3); RenderFrame takes an optional camera"),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory.js", "verbatim (name now TV's)", "W0-02: renamed from Na__AppUtils__SnapshotHistory__.js (FR-10; DR-04)"),
    ("02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js", "verbatim (code, TV 1.1.0); TV is at 1.2.0", "W0-02: moved from 05__RenderPipeline/02__Engine__MaxEngine/ (FR-11); MaxEngine-only wiring in the PORT NOTE; TV 1.2.0's runtime retune not taken (3D-tab extra, DR-44)"),
    ("02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json", "name only (VV content until W0-15 takes KeyMap 1.11.0 and TV's rows)", "W0-03: renamed from Na__LayoutEditor__KeyMappings__.json (FR-12; DR-33)"),
    ("02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json", "name only (VV content: root key Na__ValeVision__HotkeysDictionary, ValeVision__* actions - K2 F4)", "W0-03: renamed from Na__ValeVision__HotkeysDictionary__.json (FR-13; DR-33)"),
]
for vvn, parity, note in W0_PAIRS:
    assert vvn in VV_SET and vvn in TV_SET, vvn
    tv_text = tv_show(vvn)
    pf, sv = port_note(vvn)
    if vvn.endswith("RenderPreset__.js"):
        sv = "- (VV-authored as ComposerPreset 1.0.0; TV's file is its interface twin)"
    reg.append(OrderedDict(group="w0pair", n=None, vv=vvn, tv=vvn, tv_src=sv or "-", tv_cur=top_version(tv_text) or "-",
                           parity=parity, action="paired by path in Wave 0", div=note, open="-", loaded=loaded_by(vvn),
                           transport="-", pk=pk_list(vvn, vvn)))
    seen_vv.add(vvn)
    seen_tv.add(vvn)

# shared modules taken by packages outside c.1 (exist in VV and TV at the same path)
for tvp, wps in sorted(PK_BY_TV.items()):
    if tvp in seen_tv or tvp not in TV_SET or tvp not in VV_SET:
        continue
    if not tvp.endswith((".js", ".css", ".json", ".mjs")):
        continue
    tv_text = tv_show(tvp)
    vv_text = rd(os.path.join(VV, tvp))
    pf, sv = port_note(tvp)
    reg.append(OrderedDict(group="shared_extra", n=None, vv=tvp, tv=tvp, tv_src=sv or "unrecorded", tv_cur=top_version(tv_text) or "-",
                           parity="shared (outside S11 c.1)", action="taken by " + ", ".join(sorted(wps, key=lambda w: TOPO.get(w, 9999))),
                           div="-", open="see its package", loaded=loaded_by(tvp),
                           transport=("TV: " + ", ".join(sorted(TS[tvp])) + " -> VV facade (DIV-4)") if tvp in TS else "-",
                           pk=pk_list(tvp, tvp)))
    seen_vv.add(tvp)
    seen_tv.add(tvp)

# TV-only (R5 E.3 + four modules of shared folders from the W0-05 map)
inv = json.load(open(os.path.join(P, "report", "tools", "r5work", "tv_only_inventory.json"), encoding="utf-8"))
tvonly = [x for x in inv if x["path"] not in seen_tv]
extra_tv = []
for k, v in pom["modules"].items():
    if not v["in_vv_after_w0_02"] and k not in set(x["path"] for x in inv):
        extra_tv.append(dict(path=k, lines=v["tv_lines"], ver=v["tv_version"] or "", feature="shared folder the drawing system imports (R5 E.2.5)",
                             action="see its package", wp=", ".join(v["landed_or_edited_by"]), gate="", first=""))
for x in tvonly + sorted(extra_tv, key=lambda y: y["path"]):
    tvp = x["path"]
    in_vv = tvp in VV_SET
    seam = []
    if tvp in TS:
        seam.append("TV: " + ", ".join(sorted(TS[tvp])) + " -> VV facade (DIV-4)")
    if tvp in OTHER_SEAMS:
        seam.append("seams: " + ", ".join(sorted(OTHER_SEAMS[tvp])))
    pks = pk_list(None, tvp)
    if not pks and x.get("wp"):
        pks = [w.strip() for w in re.split(r"[,;]", x["wp"]) if re.match(r"^\s*W[0-6T]-\d\d", w)]
    reg.append(OrderedDict(group="tvonly", n=None, vv=("- (lands at the TV path)" if not in_vv else tvp), tv=tvp, tv_src="-",
                           tv_cur=x.get("ver") or "-", parity="TV-only (not yet in VV)" if not in_vv else "landed (check)",
                           action=x.get("action", ""), div=(x.get("gate") or "-"),
                           open=("all (first TV release naming it: %s)" % x["first"]) if x.get("first") else "all",
                           loaded="-", transport="; ".join(seam) or "-", pk=pks, feature=x.get("feature", "")))
    seen_tv.add(tvp)

# VV-only (S11 c.3 / R5 E.4), files that now have no TV twin at the same path
VV_ONLY_FATE = OrderedDict([
    ("02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/", ("keep: permanent VV divergence, the lazy loader (DR-24 (a), D64; PD-05); not a back-port candidate", "W1-31, W1-33, W1-34, W4-08")),
    ("02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js", ("keep while the loader exists: the tab-code leaf (DR-24; an offer to TV is WT-10, held)", "WT-10")),
    ("02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js", ("retire: re-export shim over LE/28__System__ObjectSnap (FR-14, W2-19), deleted when its 10 importing files move (FR-15, W3-08)", "W2-19, W3-08")),
    ("02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js", ("keep: VV-only drawing thumbnail bake; a seam in TV's 2.x Dev menus; offered to TV only by WT-06 (held)", "W2-04, W2-05, WT-06")),
    ("02__Src__AppModules/41__System__CrossSectionView/", ("keep: DIV-2, VV's live Cross Sections tool and section engine (TD06 schema); name kept with a README (DR-26, D66); gate ids renamed by W2-05", "W2-02, W2-05")),
    ("02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js", ("keep: DIV-1, VV's ortho profile pre-pass (moved from legacy 40 by W0-02, FR-08); TV's 40 ProfileLines is never ported", "-")),
    ("02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js", ("keep: DIV-1 linework settings state (K2 section 7)", "W2-13")),
    ("02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/", ("keep: DIV-1, VV's dual render engine (K2 section 7)", "-")),
    ("02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/", ("keep: DIV-1, VV's dual render engine (K2 section 7)", "-")),
    ("02__Src__AppModules/05__RenderPipeline/Na__RenderEngine__State.js", ("keep: DIV-1, VV's dual render engine state", "-")),
    ("02__Src__AppModules/05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js", ("keep: DIV-1, VV's render engine switch", "-")),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js", ("keep (DIV-4): VV transport, fronted by the facade at TV's path (W0-12)", "W0-12")),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js", ("retire when the specification transport moves onto the facade (FR-18)", "W2-30, W2-33")),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js", ("keep: VV's 3D hotkey handler, twin of TV 10/Na__Hotkeys__Manager.js; gains the KeyScope guard (DR-33)", "W1-29")),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__LoadingOverlay__.js", ("keep: VV 3D start-up resilience (PD-10)", "-")),
    ("02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js", ("keep: VV 3D start-up resilience (PD-10)", "-")),
    ("02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js", ("keep: VV 3D start-up resilience (PD-10)", "-")),
    ("02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js", ("keep: VV 3D start-up resilience (PD-10)", "-")),
    ("02__Src__AppModules/02__AppData/Na__AppConfig__MaterialsLibrary.json", ("keep: VV materials library", "-")),
    ("02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__ScenePersistence__.js", ("keep: permanent VV divergence - TV withdrew its copies of the scene-editor split in v2.68.2 ('do not re-port')", "-")),
    ("02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneReorder__.js", ("keep: permanent VV divergence - TV withdrew the split in v2.68.2; PORT NOTE corrected 01-Oct-2026 (W0-06)", "W0-06")),
    ("02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js", ("keep: permanent VV divergence - TV withdrew the split in v2.68.2; PORT NOTE corrected 01-Oct-2026 (W0-06)", "W0-06")),
    ("02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevTools__CameraPathVisualizer.js", ("keep: VV dev tool", "-")),
    ("02__Src__AppModules/70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js", ("keep: DIV-1 dev controls", "-")),
    ("02__Src__AppModules/70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js", ("keep: DIV-1 dev controls", "-")),
    ("02__Src__AppModules/30__System__ImageExport/Na__UiFeature__LineworkSettings__Controls.js", ("keep: DIV-1 linework settings controls", "-")),
    ("02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js", ("keep: 3D only", "-")),
    ("02__Src__AppModules/91__System__2dElevationsView/", ("legacy: moved from 40 by W0-02 (FR-01); retires with W6-03 (FR-25), held until Adam confirms the removals (DR-03)", "W6-03")),
    ("02__Src__AppModules/35__System__PageLayoutSystem/", ("legacy: retires with W6-03 (FR-21) after W0-16 copies jsPDF and Vale's Classic scan out (FR-19, FR-20); Q-35ASSETS decides its other title-block files", "W0-16, W6-03")),
])
vvonly_rows = []
for key, (fate, pks) in VV_ONLY_FATE.items():
    files = [key] if not key.endswith("/") else sorted(f for f in VV_SET if f.startswith(key))
    for f in files:
        if not f.endswith((".js", ".css", ".json", ".mjs", ".html")):
            continue
        assert f in VV_SET, f
        if f in TV_SET:
            raise SystemExit("VV-only has a TV twin: " + f)
        pf, sv = port_note(f)
        vvonly_rows.append(OrderedDict(group="vvonly", n=None, vv=f, tv="-", tv_src="-", tv_cur="-",
                                       parity="VV-only", action=fate, div="-", open="-", loaded=loaded_by(f),
                                       transport=("VV: " + ", ".join(sorted(vv_transport[f]))) if f in vv_transport else "-",
                                       pk=[w.strip() for w in pks.split(",") if w.strip() != "-"]))
        seen_vv.add(f)
reg += vvonly_rows

# completeness: VV modules in the drawing folders with no row
DRAW = ("02__Src__AppModules/4", "02__Src__AppModules/50__", "02__Src__AppModules/51__", "02__Src__AppModules/91__")
missing_vv = sorted(f for f in VV_SET if f.startswith(DRAW) and f.endswith((".js", ".css", ".json")) and f not in seen_vv)
counts = Counter(r["group"] for r in reg)
out = dict(register=reg, counts=counts, missing_vv=missing_vv,
           folder_moves=FOLDER_MOVES, file_moves=FILE_MOVES, w003=W003_RENAMES)
json.dump(out, open(os.path.join(SCR, "ledger_data.json"), "w", encoding="utf-8"), indent=1)
print(counts, "total", len(reg))
print("drawing-folder VV files with no row:", len(missing_vv))
for f in missing_vv:
    print("  ", f)
