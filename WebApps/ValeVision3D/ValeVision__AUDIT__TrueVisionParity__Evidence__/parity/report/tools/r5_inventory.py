# R5 (Section E) inventories: E.3 TV-only modules, E.4 VV-only modules, E.5 tests.
# Read-only on both apps (reads file headers and test files); writes fragments to report/tools/r5work/.
import sys, io, json, re, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5_common import *

sys.stdout.reconfigure(encoding="utf-8")
F = jload(PAR + "/data/findings_verified.json")
REL = jload(WORK + "/release_rows_final.json")
FEATURE_DRS = ["DR-08", "DR-09", "DR-10", "DR-11", "DR-12", "DR-13", "DR-14", "DR-15", "DR-16", "DR-17", "DR-18", "DR-19",
               "DR-20", "DR-21", "DR-22", "DR-23", "DR-26", "DR-31", "DR-33", "DR-40", "DR-43"]


def md(s):
    return str(s).replace("|", "/").replace("\n", " ")


def header_version(path):
    try:
        with io.open(path, encoding="utf-8", errors="replace") as fh:
            head = []
            for _ in range(400):
                head.append(next(fh))
    except StopIteration:
        pass
    except Exception:
        return ""
    try:
        txt = "".join(head)
    except NameError:
        return ""
    vs = re.findall(r"(?:Version|version|v)\s*(\d+\.\d+\.\d+)\b", txt)
    vs = [v for v in vs if not v.startswith("2.") or int(v.split(".")[1]) < 20]  # skip app versions v2.xx
    if not vs:
        return ""
    return max(vs, key=lambda v: tuple(int(x) for x in v.split(".")))


# first TV release whose devlog entry names the file explicitly (file name or stem), oldest first
ENT = load_tv_entries()
ENT_SORTED = sorted(ENT.values(), key=lambda e: (vkey(e["ver"]), e["line"]))


def first_named(path):
    b = path.split("/")[-1]
    stem = re.sub(r"\.(test\.)?(js|json|css|mjs|cjs|py|html|md)$", "", b)
    names = [stem]
    m = re.match(r"^(?:Na|TrueVision)__[A-Za-z0-9]+__(.+)$", stem)
    if m and len(m.group(1)) >= 9:
        names.append(m.group(1))
    pats = [re.compile(r"(?<![A-Za-z0-9_])" + re.escape(n) + r"(?![A-Za-z0-9])") for n in names]
    for e in ENT_SORTED:
        if vkey(e["ver"]) < (2, 24, 0):
            continue
        if b in e["body"] or any(pt.search(e["body"]) for pt in pats):
            return e["ver"]
    return ""

# finding actions per TV path
act_by_path = collections.defaultdict(list)
for f in F:
    for p in f.get("tv_paths") or []:
        act_by_path[p.rstrip("/")].append((f["id"], f["action"]))


def file_action(path):
    acts = [a for _, a in act_by_path.get(path, [])]
    if not acts:
        parent = path.rsplit("/", 1)[0]
        acts = [a for _, a in act_by_path.get(parent, [])]
    if any(a in ("port_adapted", "port_whole_reapply_vv", "build_vv_transport") for a in acts):
        return "adapted"
    if any(a == "port_verbatim" for a in acts):
        return "verbatim"
    return "verbatim*"


EXCLUDE = {
    "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js": ("excluded", "-", "DIV-1: VV keeps 05/Na__RenderEffect__2dProfileLines__ (K2 section 7)"),
    "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js": ("path only", "W0-02", "FR-09 renames VV ComposerPreset to this path and names; VV body kept (DIV-1, DR-04)"),
    "02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js": ("VV body", "W0-12", "FR-17: same path and 8 exports over WCP Flask (DIV-4, DR-27)"),
    "02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js": ("VV body", "W0-12", "FR-16: same path, 33 exports over whitecardopedia-editor-api (DIV-4, DR-27)"),
    "02__Src__AppModules/80__CloudflareIntegration/FutureCfHelpersEtc__ForServerlessFeaturesSuchAsClientComments__.note": ("excluded", "-", "TV note file; nothing to port"),
    "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json": ("rename + content", "W0-03, W0-15", "FR-12 renames VV KeyMappings__.json (W0-03); KeyMap 1.11.0 content in W0-15 (DR-33)"),
}
for rel, _ in TREE_TV:
    if rel.startswith("02__Src__AppModules/41__System__SectionCutEngine/"):
        EXCLUDE[rel] = ("excluded", "-", "DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41)")
for rel, _ in TREE_TV:
    if rel.startswith("02__Src__AppModules/27__System__ContextMenuSystem/") and not TVSRC2WP.get(rel):
        EXCLUDE[rel] = ("excluded", "-", "3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11)")
# READMEs of TV-only folders travel with a package of their folder (W1-15, W1-37, W2-34, W4-01 and W4-08 list theirs).
# K3 names README__SpellCheck__.md only as a new W2-34 VV target (not in its tv_sources), so the owner lookup falls back to
# the package that creates the same path in VV. K3 gives README__PublishedDocuments__.md no package at all: this section
# assigns it to W4-17, the first package to create files in 52 (a K3 correction for Section F's list, F.8).
# H1 (01-Oct-2026): Section F's F.8 C30 put the 52 README in W4-17's vv_targets and edits, so the K3 lookup finds it.
PROPOSED_OWNER = {}
README_NOTE = {
    "02__Src__AppModules/55__Feature__SpellCheck/README__SpellCheck__.md":
        "README rewritten for VV (a new W2-34 target): the Vale dictionary file and route of W0-18; TV's 'NOT in ValeVision' "
        "line goes",
    "02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md":
        "README adapted for VV: Vale identity, SCHEMA REF at the VV example folder W4-01 seeds, the Urls line as W4-17's VV "
        "Urls; a W4-17 target since Section F's F.8 C30",
}

GATED_NOTE = {
    "DR-08": "dormant (DR-08 B)", "DR-10": "switched off (DR-10)", "DR-12": "switched off (DR-12 A)", "DR-11": "DR-11 A code",
    "DR-13": "DR-13 a", "DR-14": "DR-14 A", "DR-15": "DR-15", "DR-16": "DR-16 a", "DR-18": "DR-18 a", "DR-19": "DR-19",
    "DR-20": "Vale name/dictionary (DR-20)", "DR-21": "DR-21 a", "DR-22": "DR-22 a", "DR-23": "DR-23 a", "DR-09": "dormant (DR-09 a)",
    "DR-26": "DR-26", "DR-40": "gesture held (DR-40)", "DR-33": "DR-33 a", "DR-43": "NA content off (DR-43)", "DR-31": "DR-31", "DR-17": "DR-17",
}
# file-specific decision gates (feature decisions that name the module), on top of the package gates
FILE_GATE = [
    (r"SitePlan|SiteLegend|21__System__SitePlanData", ["DR-08"]),
    (r"52__Feature__StatementWriter|27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui", ["DR-10"]),
    (r"TrueVisionHub", ["DR-10", "DR-43"]),
    (r"53__Feature__ProjectQrCode|QrCell|ScrapbookParametric__ProjectQr", ["DR-12", "DR-43"]),
    (r"51__Feature__DrawingRegister|Register__", ["DR-11"]),
    (r"54__Feature__SheetImages", ["DR-13"]),
    (r"59__Feature__FloorAreas|AreaGroups|AreaSchedule", ["DR-14"]),
    (r"49__System__ElevationDepthFog|DepthFog", ["DR-15"]),
    (r"DoorPose|PlanDoors|Storeys__", ["DR-16"]),
    (r"FlushJoins", ["DR-31"]),
    (r"37__System__VectorTools", ["DR-18"]),
    (r"36__System__HatchPatternTools|HatchPattern", ["DR-19"]),
    (r"55__Feature__SpellCheck|54__Feature__ColourPalette", ["DR-20"]),
    (r"PdfFonts", ["DR-21"]),
    (r"65__Feature__DocumentPublishing|52__System__Layout__PublishedDocuments|53__Data__Layout__PublishedSchema", ["DR-22"]),
    (r"66__Feature__DocumentSharing", ["DR-23"]),
    (r"ModelSource", ["DR-09"]),
    (r"48__System__CrossSectionViews", ["DR-26"]),
    (r"CopyDrag|MoveAnchor|ViewportSnapMove", ["DR-40"]),
    (r"31__System__DocumentKeys|KeyScope", ["DR-33"]),
    (r"LayerMenu", ["DR-17"]),
]


def gates_for(path):
    g = []
    for pat, drs in FILE_GATE:
        if re.search(pat, path):
            for d in drs:
                if d not in g:
                    g.append(d)
    return g


def feature_of(path):
    p = path.replace("02__Src__AppModules/", "")
    rules = [
        ("A. Drawing core, planes, sections and fog (top level)", r"^(40__|41__|42__|45__|47__|48__|49__)"),
        ("B. Projected linework (50)", r"^50__"),
        ("C. Drafting aids and object snap (LE 26, 27, 28, 32, 33)", r"/(26__|27__System__DrawingGrid|28__|32__|33__)"),
        ("D. Keyboard scopes (LE 31, key files, KeyScope)", r"/31__|Na__Hotkeys__DrawingTabs|KeyScope"),
        ("E. Vector tools, Booleans and hatching (LE 36, 37; ShapeRings)", r"/(36__|37__)|ShapeRings"),
        ("F. Site plans (LE 21; site-plan units)", r"/21__System__SitePlanData|SitePlan|SiteLegend"),
        ("G. Viewports, rotation, doors, quality, Model Source", r"ViewportRotation|VectorQuality|PlanDoors|ModelSource|Viewport2d__DepthFog"),
        ("H. Sheet tools and records (shared LE subfolders)", r"LayerMenu|CopyDrag|HoverTooltip|NoteTooltip|DimensionRounding|PaintOrder|SheetModel__AreaGroups|SheetRecords__"),
        ("I. Specification, notes, spell check, Specification Scrapbook (LE 50, 58; 55)", r"NoteRegions|MarginNotes|SpecData__Lockstep|SpecLockstep|SpecMargin__Column|/58__|^55__"),
        ("J. Floor areas (LE 59; Area Schedule)", r"/59__|AreaSchedule"),
        ("K. Title block, Project QR and parametric types (LE 53; QR cell; Cabinet Infill)", r"/53__Feature|QrCell|ScrapbookParametric__ProjectQr|CabinetInfill"),
        ("L. Drawing Register (LE 51)", r"/51__Feature"),
        ("M. Sheet Images (LE 54)", r"/54__Feature__SheetImages"),
        ("N. Statement Writer (LE 52) and its context-menu renderer (27)", r"/52__Feature|^27__"),
        ("O. Publishing, sharing, published documents (LE 65, 66; 52, 53 top level)", r"/65__|/66__|^52__System|^53__Data"),
        ("P. PDF fonts", r"PdfFonts"),
        ("Q. Colour palette (54 top level)", r"^54__Feature__ColourPalette"),
        ("R. Transport and project file (80; LocalProjectMirror)", r"^80__|LocalProjectMirror"),
    ]
    for name, pat in rules:
        if re.search(pat, p):
            return name
    return "Z. Other"


# ----------------------------------------------------------------------------- collect TV-only rows
rows = []
for d in DRIFT:
    if d["state"] != "tv-only":
        continue
    if d["tv_folder"] not in ("51__System__LayoutEditor", "40__System__DrawingViewCore", "41__System__SectionCutEngine",
                              "42__System__FloorPlanViews", "45__System__ElevationViews", "50__System__ProjectedLinework"):
        if not (d["tv_folder"] == "03__AppUtils" and ("KeyScope" in d["relpath"] or "LocalProjectMirror" in d["relpath"])):
            continue
    path = "02__Src__AppModules/" + d["tv_folder"] + "/" + d["relpath"]
    rows.append(dict(path=path, lines=int(d["tv_lines"] or 0), ver=d["tv_ver"]))
for tf in ["27__System__ContextMenuSystem", "47__System__DrawingPlanes", "48__System__CrossSectionViews", "49__System__ElevationDepthFog",
           "52__System__Layout__PublishedDocuments", "53__Data__Layout__PublishedSchema", "54__Feature__ColourPalette",
           "55__Feature__SpellCheck", "80__CloudflareIntegration"]:
    for rel, l in TREE_TV:
        if rel.startswith("02__Src__AppModules/" + tf + "/"):
            rows.append(dict(path=rel, lines=l, ver=header_version(TVROOT + "/" + rel) if rel.endswith((".js", ".css", ".py")) else ""))

try:
    GIT_INTRO = jload(WORK + "/git_intro.json")
except Exception:
    GIT_INTRO = {}
inv = []
for r in rows:
    p = r["path"]
    wp = ", ".join(wp_sort(TVSRC2WP.get(p, [])))
    if not wp:
        wp = ", ".join(wp_sort(VVTGT2WP.get(p, [])))  # created at the same path in VV, not listed as a TV source
    if not wp and p in PROPOSED_OWNER:
        wp = PROPOSED_OWNER[p]
    if not r["ver"] and p.endswith((".js", ".css", ".py")):
        r["ver"] = header_version(TVROOT + "/" + p)
    gi = GIT_INTRO.get(p, {})
    rels = gi.get("rels", [])
    fn = first_named(p)
    if not fn or (rels and fn not in rels):
        fn0 = fn
        fn = ""
        # an ancestor folder (or a sibling file) named by a release: inside the add commit's batch when it has one,
        # else any release dated on or after the add commit
        parts = p.split("/")[1:-1]
        anc = [x for x in parts if re.match(r"\d\d__", x) and x not in BROAD_FOLDERS]
        folder = p.rsplit("/", 1)[0]
        cdate = gi.get("date", "")
        def okdate(x):
            try:
                import datetime
                d = datetime.datetime.strptime(x["date"], "%d-%b-%Y").date().isoformat()
                return d >= cdate
            except Exception:
                return True
        cands = [x for x in REL if x["ver"] and ((x["ver"] in rels) if rels else okdate(x))
                 and (any(a in x.get("folders_named", []) for a in anc) or any(f.startswith(folder + "/") for f in x["files"]))]
        if cands:
            fn = min(cands, key=lambda x: tuple(x["v"]))["ver"]
        elif fn0 and not rels:
            fn = fn0
    if fn and (not rels or fn in rels):
        since = fn
    elif len(rels) == 1:
        since = rels[0]
    elif rels:
        since = "%s-%s (%s)" % (rels[0], rels[-1].replace("v2.", ""), gi.get("commit", ""))
    else:
        since = fn or ("%s (%s)" % (gi.get("date", ""), gi.get("commit", "")) if gi.get("commit") else "-")
    fn = since
    if p in EXCLUDE:
        act, wpx, why = EXCLUDE[p]
        inv.append(dict(r, feature=feature_of(p), action=act + ": " + why, wp=wpx, gate="", first=fn))
        continue
    base = file_action(p)
    g = gates_for(p)
    if p.endswith("Na__LayoutEditor__Statement__Lockstep__.js"):
        g = []  # DR-10: the pure Lockstep leaf lands now with the specification lockstep (W2-30), not behind the switch
        base = base + " (lands now with the spec lockstep, DR-10)"
    gtxt = "; ".join(GATED_NOTE.get(x, x) for x in g)
    action = base if not g else "gated, " + base + " - " + gtxt
    if p in README_NOTE:
        action += "; " + README_NOTE[p]
    inv.append(dict(r, feature=feature_of(p), action=action, wp=wp or "NONE", gate=", ".join(g), first=fn))

# ----------------------------------------------------------------------------- render E.3
def shortname(p):
    p = p.replace("02__Src__AppModules/51__System__LayoutEditor/", "LE/").replace("02__Src__AppModules/", "TVM/")
    return p


grp = collections.defaultdict(list)
for x in inv:
    grp[x["feature"]].append(x)
out = []
summary = ["| Group | Files | Lines | Packages | Decisions | Default action |", "|---|---|---|---|---|---|"]
for g in sorted(grp):
    xs = sorted(grp[g], key=lambda x: x["path"])
    wps = set()
    for x in xs:
        for w in re.split(r",\s*", x["wp"]):
            m = re.match(r"W[0-9T]-\d\d", w)
            if m:
                wps.add(m.group(0))
    drs = sorted(set(d for x in xs for d in (x["gate"].split(", ") if x["gate"] else [])))
    acts = collections.Counter(x["action"].split(":")[0].split(" - ")[0] for x in xs)
    summary.append("| %s | %d | %s | %s | %s | %s |" % (g, len(xs), format(sum(x["lines"] for x in xs), ","), ", ".join(wp_sort(wps)) or "-",
                                                     ", ".join(drs) or "-", "; ".join("%s %d" % (a, n) for a, n in acts.most_common())))
    out.append("\n**%s** (%d files, %s lines)\n" % (g, len(xs), format(sum(x["lines"] for x in xs), ",")))
    out.append("| TV file | Lines | TV ver | Since (TV release) | Action | Package |")
    out.append("|---|---|---|---|---|---|")
    for x in xs:
        out.append("| %s | %s | %s | %s | %s | %s |" % (md(shortname(x["path"])), format(x["lines"], ","), x["ver"] or "-", x["first"] or "-", md(x["action"]), md(x["wp"])))
io.open(WORK + "/frag_E3_inventory.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
io.open(WORK + "/frag_E3_summary.md", "w", encoding="utf-8").write("\n".join(summary) + "\n")
le_n = sum(1 for x in inv if "/51__System__LayoutEditor/" in x["path"])
print("E.3 rows", len(inv), "LE", le_n, "lines", sum(x["lines"] for x in inv), "NONE wp:", [x["path"] for x in inv if x["wp"] == "NONE"])
json.dump(inv, io.open(WORK + "/tv_only_inventory.json", "w", encoding="utf-8"), indent=1)

# ----------------------------------------------------------------------------- E.5 tests
tv_tests = sorted(rel for rel, _ in TREE_TV if rel.startswith("80__Testing__PrototypeEnvironment/") and rel.count("/") == 1)
vv_tests = {rel.split("/")[-1]: l for rel, l in TREE_VV if rel.startswith("80__Testing__PrototypeEnvironment/") and rel.count("/") == 1}
rel_by_test = collections.defaultdict(list)
for x in REL:
    for t in x["tests"]:
        rel_by_test[t.split("/")[-1]].append(x["ver"] or x["ver_cell"])


def norm_bytes(path):
    try:
        b = open(path, "rb").read()
        return b.replace(b"\r\n", b"\n")
    except Exception:
        return None


def nlines(path):
    try:
        with open(path, "rb") as fh:
            return sum(1 for _ in fh)
    except Exception:
        return ""


def runner(b):
    if b.startswith("TestEnv__") or b.startswith("Na__TestEnv__Styles"):
        return "environment"
    if b.endswith(".py"):
        return "python (+ WCP Flask route)" if "Api" in b or "Server" in b or "SaveGuard" in b else "python"
    if b.endswith(".html"):
        return "browser on WCP Flask (G5)"
    if b.endswith((".mjs", ".cjs")):
        return "node"
    return "-"


T = ["| TV test file | TV lines | In VV today | K3 status | Runner | Ported by | Sections run earlier | Re-run by | TV releases whose devlog cites it |",
     "|---|---|---|---|---|---|---|---|---|"]
stat = collections.Counter()
for rel in tv_tests:
    b = rel.split("/")[-1]
    if b.endswith(".zip"):
        continue
    own = TEST_OWN.get(b, {})
    st = own.get("status", "not in K3")
    stat[st.split(":")[0]] += 1
    if b in vv_tests:
        a = norm_bytes(TVROOT + "/" + rel)
        c = norm_bytes(VVROOT + "/" + rel)
        same = "identical" if (a is not None and a == c) else "differs"
        invv = "yes (%s, %s lines)" % (same, vv_tests[b])
    else:
        invv = "no"
    rels = sorted(set(rel_by_test.get(b, [])), key=vkey)
    rtxt = ", ".join(v.replace("v2.", "") for v in rels[:6]) + (" +%d" % (len(rels) - 6) if len(rels) > 6 else "")
    if b in ("Na__Verify__Exports__.mjs", "Na__Verify__ModuleGraph__.mjs"):
        rtxt = "every release (integration gates G1/G2)"
    elif b.startswith("Na__Verify__"):
        rtxt = "-"
    if b in vv_tests:
        invv = invv.replace("%s lines" % vv_tests[b], "%s lines" % nlines(VVROOT + "/" + rel))
    T.append("| %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
        b, nlines(TVROOT + "/" + rel), invv, md(st.split(":")[0]), runner(b), own.get("porter", "-") or "-",
        ", ".join(own.get("sections_run_earlier_by", [])) or "-", ", ".join(own.get("also_run_by", [])) or "-", rtxt or "-"))
io.open(WORK + "/frag_E5_tests.md", "w", encoding="utf-8").write("\n".join(T) + "\n")
vv_only_tests = sorted(b for b in vv_tests if not any(t.endswith("/" + b) for t in tv_tests))
print("E.5 rows", len(T) - 2, dict(stat), "VV-only tests:", vv_only_tests)
json.dump(dict(stat=stat, vv_only=vv_only_tests), io.open(WORK + "/tests_summary.json", "w", encoding="utf-8"), indent=1)
