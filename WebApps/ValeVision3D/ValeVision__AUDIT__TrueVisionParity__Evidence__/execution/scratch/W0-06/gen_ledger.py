# W0-06: restructure VV/ValeVision__PARITY__TrueVisionLedger__.md (DR-35 (b), D75).
# New live sections 1-8 are generated from the canonical data; section 9 (Archive) is the pre-restructure ledger,
# byte for byte apart from (a) every heading moved two levels down and (b) dated correction / note markers inserted
# beside stale rows. undo_archive() removes both and must give back the pre-image exactly (checked before writing).
# Output keeps the ledger's CRLF line ending; ASCII only. Run: python gen_ledger.py [--write]
import hashlib, io, json, os, re, sys
from collections import Counter, OrderedDict

sys.stdout.reconfigure(encoding="utf-8")
EV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.join(EV, "execution", "scratch", "W0-06")
P = os.path.join(EV, "parity")
REL = "ValeVision__PARITY__TrueVisionLedger__.md"
MAN = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"][REL]
PRE = open(os.path.join(SCR, "preimage", MAN["preimage"]), "rb").read()
assert hashlib.sha1(PRE).hexdigest() == MAN["sha1"]
LIVE = open(os.path.join(VV, REL), "rb").read()
LAST = os.path.join(SCR, "ledger_last_written.sha1")
ok_shas = {MAN["sha1"]} | ({open(LAST).read().strip()} if os.path.exists(LAST) else set())
assert hashlib.sha1(LIVE).hexdigest() in ok_shas, "ledger changed under me"

DATA = json.load(open(os.path.join(SCR, "ledger_data.json"), encoding="utf-8"))
REG = DATA["register"]
FINAL = json.load(open(os.path.join(P, "report", "tools", "r5work", "release_rows_final.json"), encoding="utf-8"))
APPA = json.load(open(os.path.join(P, "report", "tools", "r5work", "appA_rows.json"), encoding="utf-8"))
assert len(FINAL) == len(APPA) == 177
for a, f in zip(APPA, FINAL):
    assert a["ver_cell"] == f["ver_cell"] and a["title"][:30] == f["title"][:30]

UNI = {"\u2192": "->", "\u2190": "<-", "\u2014": " - ", "\u2013": "-", "\u2018": "'", "\u2019": "'", "\u201c": '"',
       "\u201d": '"', "\u00d7": "x", "\u2026": "...", "\u2265": ">=", "\u2264": "<=", "\u00a0": " ", "\u2248": "~",
       "\u2022": "-", "\u00b0": " deg", "\u2032": "'", "\u00e9": "e", "\u2212": "-"}


def asc(s):
    s = str(s)
    for k, v in UNI.items():
        s = s.replace(k, v)
    bad = [c for c in s if ord(c) > 127]
    if bad:
        raise SystemExit("non-ASCII left: %r in %r" % (bad, s[:120]))
    return s


def cell(s):
    if s is None:
        return ""
    s = asc(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.replace("|", "/") if s else "-"


def short(p):
    return p.replace("02__Src__AppModules/", "") if p else p


L = []
A = L.append


def table(header, rows):
    A("| " + " | ".join(header) + " |")
    A("|" + "|".join(["---"] * len(header)) + "|")
    for r in rows:
        assert len(r) == len(header), (header, r)
        A("| " + " | ".join(cell(x) for x in r) + " |")


# =====================================================================================================================
A("# ValeVision 3D - TrueVision Parity Ledger")
A("")
A("> **Restructured 01-Oct-2026** by the TrueVision parity programme's records package W0-06, on decision DR-35's default (b)")
A("> (recorded as D75 in `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`). Sections 1 to 8 are the live record. Section 9,")
A("> the Archive, holds everything this ledger said from 10-Sep-2026 to 28-Sep-2026, unchanged apart from dated notes beside")
A("> the rows that had gone wrong or stale. Nothing was deleted. From now on only each wave's Parity Scribe (W0-99, W1-99 ...")
A("> W6-04) writes this file.")
A("")
A("**Contents**")
A("")
A("1. Header - roots, the source pin, parity states, the structural divergences, the shared service worker, how this file is kept")
A("2. Folder map - TrueVision against ValeVision, and the folder renumbering of 01-Oct-2026")
A("3. Module Register - one row per module in scope")
A("4. Release Watermark - every TrueVision release v2.24.0 to v2.172.0")
A("5. Decisions - D01 to D40, TrueVision's TD01 to TD06, and where D41 to D91 are")
A("6. Back-ports, ValeVision to TrueVision")
A("7. TrueVision-side records waiting for the TrueVision lane")
A("8. Transport (DIV-4)")
A("9. Archive - the ledger as it stood before 01-Oct-2026")
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 1. Header
A("## 1. Header")
A("")
A("### 1.1 Roots and the source pin")
A("")
table(["", "ValeVision 3D", "TrueVision 3D"], [
    ["App root", "`D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D` (git root `D:\\10_CoreLib__ValeCodebase`)",
     "`D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb\\na-apps\\30__TrueVision__CoreAppCode` (git root `D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb`)"],
    ["Read at", "the working tree; programme base commit `7b4e593a` (ValeVision3D v2.71.0, 28-Sep-2026)",
     "commit `b2aa9151` only (TrueVision3D v2.172.0; commit of 30-Sep-2026): `git -C <NaWeb> show b2aa9151:na-apps/30__TrueVision__CoreAppCode/<path>`. Never the working tree, which moves under a port. The pin moves only at a wave boundary, by the programme's delegator (swarm rule R3)"],
    ["Devlog", "`ValeVision__DEVLOG__.md`", "`TrueVision__DEVLOG__.md`"],
    ["Plans", "`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (D01-D40; section 2A D41-D91); `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` (this programme)",
     "`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` (TD01-TD06; its progress ledger, section 12)"],
    ["Folder numbers", "`ValeVision__NOTES__FolderNumberRegistry__.md`", "its twin waits for the TrueVision-lane package WT-08 (held)"],
    ["The audit", "`ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` and `ValeVision__AUDIT__TrueVisionParity__Evidence__/` (findings, K1 decisions, K2 naming and maps, K3 packages, Section F plan); live hand-off: `ValeVision__WORKING_MEMORY__TrueVisionParity__.md`", "-"],
])
A("")
A("The TrueVision \"working copy for the re-alignment\" this ledger used to name (`D:\\WE10_--_...`) does not exist; the line")
A("stays in the Archive with a correction.")
A("")
A("### 1.2 Parity states")
A("")
table(["State", "Meaning"], [
    ["verbatim", "logic identical to TrueVision; only the header, the banner token and the console prefix differ"],
    ["adapted", "TrueVision's code with deliberate ValeVision seams, each listed in the file's PORT NOTE Divergences"],
    ["diverged", "same role and, where shared, the same names; a different implementation (DIV-1, DIV-2, DIV-4)"],
    ["drifted", "code differs and not all of it is a seam: TrueVision changes ValeVision lacks, waiting for a package (Module Register only)"],
    ["new / VV-only", "no TrueVision counterpart (\"new\" in the Archive's rows)"],
    ["TV-only", "TrueVision has it and ValeVision has not yet ported it (Module Register only)"],
])
A("")
A("### 1.3 The structural divergences, as they stand on 01-Oct-2026")
A("")
A("TrueVision's plan named five on 10-Sep-2026 (its section 2.2). Three remain, all permanent; two have closed. Before")
A("01-Oct-2026 this ledger called all five \"deliberate and permanent\"; the Archive keeps that line with a correction.")
A("")
table(["DIV", "What differs", "Status", "Where it lives in ValeVision", "Rule"], [
    ["DIV-1", "The drawing render path: ValeVision draws through its EffectComposer with an ortho RenderPass; TrueVision lays a Sobel overlay over a flat render",
     "Live, permanent", "`40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` (TrueVision's file name and eight exports since W0-02, ValeVision's composer body, private NAMESPACE `Na__DrawPreset`); `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` and `Na__RenderEffect__LineworkSettings__State.js`; the dual render engine `05__RenderPipeline/01__Engine__PureEngine/`, `02__Engine__MaxEngine/`; seven seams in `LE/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js`",
     "Never port TrueVision's `40/Na__DrawView__ProfileLines__.js`; SnapshotRenderer takes hunks only (W2-15) (D44, PD-01)"],
    ["DIV-2", "The section engine", "Live, permanent", "`41__System__CrossSectionView/` (the live Cross Sections tool; see its README) and `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (TrueVision's path and 13 exports, ValeVision body, NAMESPACE `Na__DrawSection`); the `CrossSection__SceneData` schema is ValeVision's and TrueVision's reference (its TD06)",
     "Never port TrueVision's `41__System__SectionCutEngine/*`, above all Serialize and SceneData (D66, D81, PD-02)"],
    ["DIV-3", "Where drawing records live", "Closed: both apps own the top-level `LayoutEditor__DrawingsData` block (TrueVision migrated in its v2.21.0)",
     "ValeVision-only keys inside it: `LayoutEditor__DrawingsData__LayoutModeEnabled` (D65) and `Elevation__SeededFrom` (preserved, no longer written, D72)", "No migration"],
    ["DIV-4", "The persistence transport", "Live, permanent, and wider after this programme",
     "ValeVision's own worker (`whitecardopedia-editor-api`, `WebApps/Whitecardopedia/CloudflareWorker`), Flask (`WebApps/Whitecardopedia/server.py` and `Server__ValeVision<Feature>__Api__.py` blueprints) and keys under `VaApps/Projects/<folderId>/`; TrueVision's names reach them through a ValeVision facade at TrueVision's paths (W0-12)",
     "Never copy TrueVision's transport: no `na-truevision-api`, no `/r2/*` routes, no `NaProjectPortal/` key (gate G6; D67, D68, D69, PD-03); section 8"],
    ["DIV-5", "The library baseline", "Closed: both apps on three r184 with the same four vendors (TrueVision v2.20.0, 10-Sep-2026)",
     "Residual: vendors 05 jsPDF and 06 html2canvas land with W0-16; 07 PDF.js is ValeVision-first", "Vendor numbers follow TrueVision"],
])
A("")
A("Every other difference between the apps is either a named seam (the audit's R0.3, PD-01 to PD-26) or drift that converges")
A("to TrueVision.")
A("")
A("### 1.4 The shared service worker")
A("")
A("ValeVision does not ship a service worker of its own, but it **does run under one in production**: `index.html` loads")
A("Whitecardopedia's registrar (`WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/`), which registers")
A("the shared worker at the WebApps root. Its one token, `PWA_SW_VERSION_TOKEN` (`'2026-09-18-1'` on 01-Oct-2026, in")
A("`Whitecardopedia__Pwa__ServiceWorker__Logic__.js`), names the shell, thumbnails, data and models caches together, so a bump")
A("re-downloads every Vale client's models. The token's own log shows its last ValeVision bump at v2.48.1; v2.61.0, v2.62.0 and")
A("v2.65.0 to v2.71.0 added cross-module exports without one.")
A("")
A("- **Policy (DR-07 default, D47):** no package edits or bumps the shared worker. W0-08 prepared the one service-worker package")
A("  as staged copies for Adam (the registrar holds its reload while `window.Na__Pwa__HasUnsavedWork` is true, no reload on a")
A("  first install, the refresh fix, the lazily linked Layout Editor stylesheets in the precache, the sheet-picture and published")
A("  cache classes); it is not deployed. W6-02 refreshes the precache list at the end. Adam bumps the token at deploy, once per")
A("  deployed wave. Do not deploy the renumber (Wave 0) without W0-08 deployed and a shell bump, or a full bump.")
A("- **Live since 01-Oct-2026:** ValeVision's AutoSave publishes the neutral `window.Na__Pwa__HasUnsavedWork` (W0-08); nothing")
A("  reads it until the prepared registrar is deployed.")
A("- **In this ledger** a row about the token reads \"Service worker token: shared Whitecardopedia worker - Adam's call\". No live")
A("  row claims ValeVision runs without one; the twenty Archive rows that did carry a dated correction.")
A("")
A("### 1.5 How this file is kept")
A("")
A("- **One writer per wave:** the wave's Parity Scribe (W0-99, W1-99, W2-99, W3-99, W4-99, W5-99, W6-04), after the wave's")
A("  packages are done and its gates pass. Packages never edit this file; they return a Port Record (swarm rule R5, gate G7).")
A("- **History is never rewritten.** Rows keep the paths, versions and words they were written with (K2 section 13). A")
A("  correction is a dated note beside the row; superseded narrative moves to the Archive.")
A("- **Each scribe pass:** flip the Module Register rows and the Release Watermark rows the wave carried (with the ValeVision")
A("  version it allocates), re-word the back-port rows it touched, add the wave's line to section 1.4, and fill section 3's")
A("  \"Blocked by\" column from the port-order map (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_order_map.json`,")
A("  written by W0-05). The procedure is the audit's S11 B10 and Section F.5.5.")
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 2. Folder map
A("## 2. Folder map")
A("")
A("### 2.1 The drawing folders, TrueVision against ValeVision")
A("")
A("Every number, with who may use it, is in `ValeVision__NOTES__FolderNumberRegistry__.md`. This table is the drawing system.")
A("")
table(["No.", "TrueVision (`b2aa9151`)", "ValeVision before 01-Oct-2026", "ValeVision now", "State"], [
    ["40", "`40__System__DrawingViewCore`", "`40__System__2dElevationsView` (legacy); the core was at 42", "`40__System__DrawingViewCore`", "paired by path since W0-02; the legacy tool is at 91"],
    ["41", "`41__System__SectionCutEngine`", "`41__System__CrossSectionView`", "`41__System__CrossSectionView`", "DIV-2 twins, kept apart on purpose (README in the folder)"],
    ["42", "`42__System__FloorPlanViews`", "`42__System__DrawingViewCore`", "`42__System__FloorPlanViews`", "paired by path since W0-02"],
    ["43", "`43__System__PlanAnnotations`", "`43__System__FloorPlanViews`", "`43__System__PlanAnnotations`", "paired by path since W0-02"],
    ["44", "`44__System__PlanDimensions`", "`44__System__PlanAnnotations`", "`44__System__PlanDimensions`", "paired by path since W0-02"],
    ["45", "`45__System__ElevationViews`", "`45__System__PlanDimensions`", "`45__System__ElevationViews`", "paired by path since W0-02"],
    ["46", "`46__System__NorthDirection`", "`46__System__ElevationViews`", "`46__System__NorthDirection`", "paired by path since W0-02 (North was VV 47 against TV 46)"],
    ["47", "`47__System__DrawingPlanes`", "`47__System__NorthDirection`", "-", "TrueVision's lands here with W2-40 and W2-01"],
    ["48", "`48__System__CrossSectionViews` (placeholder 0.1.0)", "-", "-", "lands here with W2-05, after ValeVision renames its own gate ids (DR-26)"],
    ["49", "`49__System__ElevationDepthFog`", "-", "-", "lands here with W1-09 and W2-03 (it had no slot under the old shift, because 50 is taken)"],
    ["50", "`50__System__ProjectedLinework`", "same", "same", "paired"],
    ["51", "`51__System__LayoutEditor`", "same", "same", "paired; subfolders aligned on 15-Sep-2026; ValeVision's extra is LE/01 (the loader)"],
    ["52, 53", "`52__System__Layout__PublishedDocuments`, `53__Data__Layout__PublishedSchema`", "-", "-", "land with the publishing wave (W4)"],
    ["54, 55", "`54__Feature__ColourPalette`, `55__Feature__SpellCheck`", "-", "-", "land with W1-37 and W2-34"],
    ["27, 80", "`27__System__ContextMenuSystem`, `80__CloudflareIntegration`", "-", "-", "27 renderer only (W4-11); 80 the ValeVision facade (W0-12)"],
    ["91", "-", "-", "`91__System__2dElevationsView`", "ValeVision legacy, moved from 40 by W0-02; retires with W6-03"],
])
A("")
A("### 2.2 Folder renumbering (01-Oct-2026)")
A("")
A("**Dated note, 01-Oct-2026.** Decision DR-02 (D42, default (a)) renumbered ValeVision's drawing folders to TrueVision's numbers")
A("in one scripted change, run alone and first in Wave 0 by W0-02 (`k2_renumber_apply.py --mode git`; Port Record")
A("`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/W0-02.md`). The moves are staged by `git mv` in the")
A("working tree and not yet committed; 94 files were rewritten (imports, CSS `@import` lines, config path strings, comments).")
A("Gates G1 (ModuleGraph 517 modules, 0 failures), G2 (Exports 415 files) and G3 (path gate) passed. Since then 70 drawing files")
A("pair with TrueVision by identical relative path (16 in 40, 10 in 42, 8 in 43, 15 in 44, 13 in 45, 8 in 46). **Rows in")
A("the Archive keep the paths they were written with**; read them through this map.")
A("")
rows = []
for did, a, b in DATA["folder_moves"]:
    rows.append([did, "folder", "`02__Src__AppModules/%s/`" % a, "`02__Src__AppModules/%s/`" % b, "K2 FR-0%s" % {"D1": "1", "D2": "2", "D3": "3", "D4": "4", "D5": "5", "D6": "6", "D7": "7"}[did]])
FRF = {"F1": "FR-08 (DR-03: a file follows its base name)", "F2": "FR-10 (DR-04: TrueVision's file name)", "F3": "FR-11 (DR-04: TrueVision's path)", "F4": "FR-09 (DR-04: TrueVision's interface name; ValeVision's composer body kept, DIV-1; its eight exports renamed Na__DrawView__RenderPreset__*)"}
for fid, a, b in DATA["file_moves"]:
    if fid == "F4":
        a = "02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js"
        b = "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js"
    rows.append([fid, "file", "`%s`" % a, "`%s`" % b, FRF[fid]])
table(["Move", "Kind", "Old path", "New path", "Rule"], rows)
A("")
A("Two file renames followed in the same wave (W0-03, names only, contents unchanged; DR-33, D73):")
A("")
table(["Rename", "Old path", "New path", "Rule"], [
    ["FR-12", "`02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`", "`02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json`", "TrueVision's per-tab hotkey file name; TrueVision's content lands with W0-15"],
    ["FR-13", "`02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json`", "`02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json`", "TrueVision's name; ValeVision's root key and `ValeVision__*` actions kept (K2 F4)"],
])
A("")
A("Not moved: `41__System__CrossSectionView` (DIV-2, name kept), `50` and `51`, `35__System__PageLayoutSystem` (legacy, retires with")
A("W6-03), `62__Feature__EmailWorkers` (moves to 92 only if Adam asks).")
A("")
A("### 2.3 Layout Editor subfolders")
A("")
A("Unchanged by the renumber: the two apps aligned them on 15-Sep-2026 (ValeVision v2.47.0, TrueVision v2.55.0). TrueVision has")
A("34, ValeVision 18 (17 shared plus `LE/01__Core__Loader`); the 17 TrueVision-only subfolders land at TrueVision's numbers as")
A("their packages run. The registry's section 3 lists them with their packages.")
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 3. Module Register
grp_title = OrderedDict([
    ("shared", "3.1 Shared modules (audit slice S11, table c.1)"),
    ("config", "3.2 Shared configuration files"),
    ("w0pair", "3.3 Paired in Wave 0 by a rename or a move"),
    ("shared_extra", "3.4 Shared modules outside table c.1 that a package takes"),
    ("tvonly", "3.5 TrueVision-only (not yet in ValeVision)"),
    ("vvonly", "3.6 ValeVision-only"),
])
cnt = Counter(r["group"] for r in REG)
A("## 3. Module Register")
A("")
A("One row per module in scope: every drawing-system and Layout Editor module the two apps share, every TrueVision module the")
A("programme will bring across or has decided to leave out, and every ValeVision-only module of the drawing system. Paths are")
A("relative to `02__Src__AppModules/` and are ValeVision's paths **after** the 01-Oct-2026 renumber. Seeded on 01-Oct-2026 by")
A("W0-06 from the audit's verified data: slice S11's module table c.1 with its verifier's corrections, Section E's TrueVision-only")
A("inventory (E.3) and the ValeVision-only inventory (S11 c.3, E.4), joined to the live trees.")
A("")
table(["Group", "Rows", "Source"], [
    ["3.1 Shared modules", str(cnt["shared"]), "S11 c.1 (243 JS, 18 CSS), with the c.1 verifier corrections applied"],
    ["3.2 Shared configuration files", str(cnt["config"]), "`parity/ref/drift_all.tsv` (JSON pairs in the drawing folders and the main config)"],
    ["3.3 Paired in Wave 0", str(cnt["w0pair"]), "W0-02 (RenderPreset, SnapshotHistory, DistanceCulling) and W0-03 (the two hotkey files)"],
    ["3.4 Shared, outside c.1", str(cnt["shared_extra"]), "TrueVision sources of a package (`wp_canonical.json`) that exist at the same path in both apps"],
    ["3.5 TrueVision-only", str(cnt["tvonly"]), "Section E.3's 265 files less the 2 that W0-02 and W0-03 paired, plus 4 modules of shared folders the drawing system imports (05, 25, 26, 70; from the W0-05 port-order map)"],
    ["3.6 ValeVision-only", str(cnt["vvonly"]), "S11 c.3 and Section E.4, after the Wave 0 renames; legacy folders 35 and 91 file by file (code and config only)"],
    ["**Total**", str(len(REG)), "shared %d + TrueVision-only %d + ValeVision-only %d" % (cnt["shared"] + cnt["config"] + cnt["w0pair"] + cnt["shared_extra"], cnt["tvonly"], cnt["vvonly"])],
])
A("")
A("Columns (the audit's Section F.5.5 row, plus two):")
A("")
A("- **TV source ver (app ver)** - the TrueVision version ValeVision's copy came from: the PORT NOTE's `Source version` line where")
A("  there is one; else \"cites TrueVision3D vX\", the newest TrueVision release the file's log names; \"unrecorded\" where neither")
A("  exists (module versions of the two apps are not comparable, S11 B8). A whole-file port fills it exactly (DR-34, D74).")
A("- **TV current ver** - TrueVision's module version at `b2aa9151`.")
A("- **Parity** - the state against TrueVision's file (whitespace-insensitive diff of 01-Oct-2026), then the next action S11 c.1")
A("  recommended: `port_whole_reapply_vv` (take TrueVision's file, re-apply the seams), `port_adapted` (hunks), `no_action`, or")
A("  `keep_vv_divergence`.")
A("- **Open TV versions** - TrueVision log entries dated after ValeVision's last port of the file (S11's date rule, with its")
A("  verifier's ten corrections). \"none (date rule)\" is not proof of parity: W0-04's `Na__Verify__PortNotes__.mjs --tv` recomputes")
A("  this by version citation.")
A("- **Loaded by** - what imports the module in ValeVision today: `index.html`, the CSS index, the Layout Editor loader")
A("  (`LE loader`), or the first importing module (+ how many more). For a JSON file, the module that names it.")
A("- **Transport** - ValeVision transport the module uses today (`R2SaveProjectJson__`, `R2AssetUpload__`, `R2DrawingNotes__`, a")
A("  `fetch` to `/api/`), and TrueVision transport its TrueVision copy imports, which becomes a facade seam (DIV-4, W0-12).")
A("- **Packages** - the K3 packages that edit the ValeVision file or take the TrueVision file, in dispatch order.")
A("- **Blocked by** - left empty for the W0 Parity Scribe (W0-99) to fill from the W0-05 port-order map: the TrueVision modules a")
A("  whole-file take still waits for.")
A("")
HEAD = ["VV path", "TV path", "TV source ver (app ver)", "TV current ver", "Parity", "Divergences and seams", "Open TV versions",
        "Loaded by", "Transport", "Checked", "Packages", "Blocked by"]
for g, title in grp_title.items():
    rows = [r for r in REG if r["group"] == g]
    rows.sort(key=lambda r: (r["vv"] if r["group"] != "tvonly" else r["tv"]))
    A("### " + title)
    A("")
    if g == "tvonly":
        A("Lands at TrueVision's path, so the VV path is the TV path once it lands. \"Divergences and seams\" holds Section E.3's action")
        A("and the decision that gates it (verbatim, adapted, gated, excluded). Excluded files (TrueVision's 41 engine and 40")
        A("ProfileLines, the 27 menu files outside the renderer, the 80 note) stay rows so that the decision is recorded.")
        A("")
    if g == "vvonly":
        A("\"Parity\" holds the module's fate: keep (a permanent seam), retire, or legacy. Rows here never take a TrueVision file.")
        A("")
    trows = []
    for r in rows:
        tvp = r["tv"]
        vvp = r["vv"]
        tvc = "same path" if (tvp == vvp and g != "tvonly") else ("`" + short(tvp) + "`" if tvp not in ("-", None) else "-")
        vvc = ("`" + short(vvp) + "`") if vvp and not vvp.startswith("-") else vvp
        par = r["parity"]
        if g in ("shared",):
            par = par + "; next: " + r["action"]
        elif g in ("w0pair", "shared_extra"):
            par = par + "; " + r["action"]
        elif g == "tvonly":
            par = "TV-only (not yet in VV)"
        elif g == "vvonly":
            par = "VV-only; " + r["action"]
        div = r["div"]
        if g == "tvonly":
            gate = r["div"] if r["div"] not in ("-", "") else ""
            div = r["action"] + ((" - " + gate) if gate and gate not in r["action"] else "")
        src = (r["tv_src"] or "-").rstrip(";,")
        trows.append([vvc, tvc, src, r["tv_cur"], par, div, r["open"], r["loaded"], r["transport"], "01-Oct-2026",
                      ", ".join(r["pk"]) or "-", None])
    table(HEAD, trows)
    A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 4. Release Watermark
cls_final = Counter(f["cls"] for f in FINAL)
cls_s11 = Counter(a["cls"] for a in APPA)
open_cls = ("PARTIAL", "PENDING-SIGNOFF", "NOT-CONSIDERED", "REOPENED")
n_open = sum(cls_final[c] for c in open_cls)
assert (cls_final["PORTED"], cls_final["PARTIAL"], cls_final["PENDING-SIGNOFF"], cls_final["NOT-CONSIDERED"], cls_final["REOPENED"],
        cls_final["DELIBERATE"], cls_final["NOT-DRAWING"], cls_final["VV-ORIGIN"], cls_final["N/A"], n_open) == (51, 11, 17, 80, 4, 2, 7, 4, 1, 112), cls_final
A("## 4. Release Watermark")
A("")
A("Every TrueVision release from v2.24.0 to v2.172.0: 177 rows - the 172 devlog headings, v2.33.0 (released without a heading)")
A("and four features of 14-Sep-2026 that TrueVision never logged but ValeVision ported. Seeded on 01-Oct-2026 from the audit's")
A("canonical `parity/report/tools/r5work/release_rows_final.json` (Section E's reconciliation of slice S11's Appendix A with every")
A("other slice's evidence), with S11's per-release notes and TrueVision test names.")
A("")
A("- **High-water: TrueVision v2.85.0** (20-Sep-2026), ported as ValeVision v2.68.0. The last release ported, v2.83.0 (ValeVision")
A("  v2.70.0, the header fold), came across only in part. Nothing from TrueVision v2.86.0 onward is in ValeVision.")
A("- **Low-water: TrueVision v2.28.0** (13-Sep-2026, viewport snap move). 28 release rows at or below the high-water mark are open.")
A("- **Adam confirmed in TrueVision**, among the open releases: v2.37.0 (flush joins, signed off 14-Sep-2026; only the ValeVision")
A("  port was parked), v2.153.0 (box select over a viewport) and v2.155.0 (publishing). Every other open release is ported on")
A("  DR-01's default (c) and named as unconfirmed in the devlog entry that lands it (D41).")
A("")
table(["Class", "Meaning", "S11 (verified)", "This ledger, 01-Oct-2026"], [
    ["PORTED", "in ValeVision; the ValeVision release is named", str(cls_s11["PORTED"]), str(cls_final["PORTED"])],
    ["PARTIAL", "part in ValeVision; the rest has a package", str(cls_s11["PARTIAL"]), str(cls_final["PARTIAL"])],
    ["PENDING-SIGNOFF", "TrueVision parked the ValeVision port on Adam's sign-off", str(cls_s11["PENDING-SIGNOFF"]), str(cls_final["PENDING-SIGNOFF"])],
    ["NOT-CONSIDERED", "never weighed for ValeVision", str(cls_s11["NOT-CONSIDERED"]), str(cls_final["NOT-CONSIDERED"])],
    ["REOPENED", "recorded as deliberate; a decision's default now ports it", "-", str(cls_final["REOPENED"])],
    ["DELIBERATE", "stays a ValeVision divergence", str(cls_s11["DELIBERATE"]), str(cls_final["DELIBERATE"])],
    ["NOT-DRAWING", "3D, PWA or shell only; nothing ValeVision needs", str(cls_s11["NOT-DRAWING"]), str(cls_final["NOT-DRAWING"])],
    ["VV-ORIGIN", "TrueVision took it from ValeVision", str(cls_s11["VV-ORIGIN"]), str(cls_final["VV-ORIGIN"])],
    ["N/A", "TrueVision-internal", str(cls_s11["N/A"]), str(cls_final["N/A"])],
    ["**Open**", "PARTIAL + PENDING-SIGNOFF + NOT-CONSIDERED + REOPENED: each has a package", str(sum(cls_s11[c] for c in open_cls)), "**%d**" % n_open],
])
A("")
A("Ten rows changed class between S11 and this ledger, each on another slice's evidence (audit Section E.1.2); their notes say")
A("why. Columns: **VV release** is filled by the Parity Scribe when a package lands the release (and the class flips);")
A("**Packages** are the K3 packages that carry the files the release's devlog entry names, primary owner first; **Decisions**")
A("change the release's scope; **TV plan phase** names the TrueVision feature-plan phase that parks a ValeVision port, which the")
A("scribe closes with it (S11's verifier).")
A("")
# E.1.2 corrections
corr_rows = {}
for l in io.open(os.path.join(P, "report", "tools", "r5work", "frag_E1_corrections.md"), encoding="utf-8").read().split("\n"):
    m = re.match(r"^\| (v2\.\d+\.\d+) \|", l)
    if m:
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        corr_rows[c[0]] = dict(change=c[2].replace("**", ""), why=c[3], evidence=c[4])
PLAN_PHASE = {}
for v in ("v2.104.0", "v2.125.0", "v2.148.0"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__FloorAreas__.md` L268, phase 9"
for v in ("v2.96.0", "v2.122.0", "v2.128.0", "v2.134.0", "v2.164.0"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__ScrapbookSystem__.md` L323"
for v in ("v2.116.0", "v2.121.0"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__SheetImages__.md` L132"
for v in ("v2.130.0", "v2.150.0", "v2.151.0"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__VectorTools__.md` L337"
for v in ("v2.89.0", "v2.101.0", "v2.132.0"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__SitePlanComposites__.md` P10"
for v in ("v2.48.0", "v2.49.0", "v2.49.1"):
    PLAN_PHASE[v] = "`TrueVision__PLAN__SitePlanDrawings__.md` L761 (asked 14-Sep-2026)"
PLAN_PHASE["v2.37.0"] = "`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` row V (signed off 14-Sep-2026; VV port parked)"
CONFIRMED = {"v2.37.0", "v2.153.0", "v2.155.0"}
rw = []
seen_corr = set()
for a, f in zip(APPA, FINAL):
    v = f["ver"]
    notes = a["notes"]
    cls = f["cls"]
    if a["cls"] != f["cls"]:
        c = corr_rows.get(v)
        assert c, v
        notes = "Class corrected from S11's %s (Section E.1.2): %s (%s). " % (a["cls"], c["why"], c["evidence"]) + notes
        seen_corr.add(v)
    elif v in corr_rows and "kept" in corr_rows[v]["change"]:
        notes = notes + " Section E.1.2 note: %s" % corr_rows[v]["why"]
    if v in CONFIRMED:
        notes = "Confirmed by Adam in TrueVision. " + notes
    vv = f["vv"] if f["vv"] not in ("", None) else "-"
    if cls in open_cls and cls != "PARTIAL":
        vv = "-"
    rw.append([f["ver_cell"], f["date"], f["title"], f["area"], ("**%s**" % cls) if cls in open_cls else cls, vv,
               ", ".join(f["wps"]) or "-", ", ".join(f["gates"]) or "-", a["owner"] or "-", PLAN_PHASE.get(v, "-"),
               notes or "-", a["tests"] or "-"])
assert len(seen_corr) == 10, seen_corr
table(["TV release (devlog line)", "Date", "Title (TV devlog, shortened)", "Area", "Class", "VV release", "Packages",
       "Decisions", "Owning slice", "TV plan phase", "Notes and evidence", "TV tests"], rw)
A("")
A("The deliberate non-ports, and what became of them on the defaults: Model Source v2.32.0 is REOPENED (DR-09 (a), D49: a")
A("dormant port, W1-01 and W2-16); the Drawing Register's Document ID, v2.69.0 to v2.71.0 and v2.76.1, are REOPENED (DR-11,")
A("D51: the code with a two-part format until Vale phases exist; W1-12, W1-19, W1-22, W4-18, W4-10) - v2.69.0 also for PdfFonts")
A("(DR-21 (a), D61: W1-25); TrueVision's Standard Scrapbook items of v2.53.0 stay out (DR-43, D83: Noble Architecture's site")
A("furniture; ValeVision's Standard Scrapbook stays empty); and v2.88.0, the Project Admin site address, stays a permanent")
A("divergence (ValeVision has no Project Admin system; PD-19). \"Standard drawing groups\" (audit finding S02a-F56) is missing in")
A("both apps: a joint future item, not a port.")
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 5. Decisions
A("## 5. Decisions")
A("")
A("### 5.1 Where the decisions are")
A("")
A("- **D01 to D40** - `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` section 2 (09-Sep-2026). Their status today is in 5.2.")
A("- **D41 to D84** - the same file's section 2A.1: the audit's decision register DR-01 to DR-44 (D-number = DR number + 40).")
A("  **D85 to D91** - section 2A.2: the seven open questions (Q-VER, Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER, Q-BACKUP).")
A("  Adam had answered none on 01-Oct-2026; each runs on its default, and an answer becomes a dated note on its D-row.")
A("- **TD01 to TD06** - TrueVision's own decisions for the first direction (its realign plan, section 3); see 5.3.")
A("- **D-S01-xx, D-S11-xx** and the other slice decisions - consolidated into the DRs (`parity/data/decision_raw_map.json`); the")
A("  S01 set is recorded with its answers in `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md`, the S11 set in 5.4.")
A("")
A("### 5.2 D01 to D40, as they stand on 01-Oct-2026")
A("")
A("**current** = still governs ValeVision; **permanent** = a deliberate, named divergence from TrueVision; **superseded** = replaced")
A("(by what is named); **done** = a one-time delivery decision, complete; **temporary** = a divergence with a named trigger;")
A("**VV ahead** = kept because ValeVision is ahead, until TrueVision catches up.")
A("")
D_STATUS = [
    ("D01", "Phases 0-5 delivery order, one minor version and devlog entry per phase", "done", "Phases 0-5 shipped 09-11 Sep-2026 (v2.16.0-v2.21.x). The app's version step is now D85 (patch steps from v2.71.1)"),
    ("D02", "Parity target is TrueVision 3D", "current", "TrueVision is now the lead and the numbering authority; pinned at `b2aa9151` (D41)"),
    ("D03", "PORT NOTE in every ported file; one parity ledger", "current", "The PORT NOTE fields are K2 H5's (Source version line, D74); the ledger is this file, restructured (D75)"),
    ("D04", "`Na__` prefix; ported files keep TrueVision's names; `na-` classes and events", "current", "The K2 rulebook extends it: code identity TrueVision's, app identity ValeVision's"),
    ("D05", "Folder slots 42-46, 50, 51 (one above TrueVision's)", "superseded", "By D42 (DR-02): renumbered to TrueVision's numbers by W0-02 on 01-Oct-2026; D05 carries a dated revision note"),
    ("D06", "Legacy face-pick Elevation View and Layout View untouched", "current", "Renumbered, not changed: 40 -> 91 (D43); both retire with W6-03, held until Adam confirms the removals"),
    ("D07", "Drawing section cut drives 41 CrossSectionView through an adapter", "permanent", "DIV-2 (D66, D81); TrueVision's TD06 adopted ValeVision's schema"),
    ("D08", "Scene data in PresentationMode__SavedCameraScenes; drawings in the top-level LayoutEditor__DrawingsData block", "current", "DIV-3 closed: TrueVision migrated to the same block (its v2.21.0)"),
    ("D09", "Default group set: TrueVision's five plus Cross Sections", "current", "Shared shape; the Cross Sections group serves D28"),
    ("D10", "Group bar pill, top-left of the carousel", "current", "Shared"),
    ("D11", "Storey seeding plus a one-click Ground Floor Plan", "VV ahead", "Kept as a seam in TrueVision's 2.x Dev menus (D72, W2-04); offered to TrueVision by WT-06 (held). TrueVision's storey levels (v2.87.0) arrive with W1-08"),
    ("D12", "Drawings render through the composer", "permanent", "DIV-1: the composer body under TrueVision's RenderPreset names (D44)"),
    ("D13", "Client measuring", "current", "Shared and kept aligned (TrueVision TD05)"),
    ("D14", "Millimetres, 5 mm snap grid, Open Sans 300/400/600, colours from config", "current", "PDFs embed the same Open Sans cuts once PdfFonts lands (D61, W1-25)"),
    ("D15", "Annotations and dimensions inside each plan or elevation record", "current", "Shared"),
    ("D16", "Elevation = azimuth + plane origin + mode; face-pick seeds, a gizmo edits", "superseded in part", "The definition stands; TrueVision's Drawing Planes (its v2.82.0, W2-40, W2-01) supersede FacePick and the gizmo grip, and W2-05 retires ValeVision's azimuth setter (D89)"),
    ("D17", "three r184 with three-mesh-bvh 0.9.9 and three-edge-projection 0.0.10", "done", "DIV-5 closed (TrueVision v2.20.0)"),
    ("D18", "Projected linework from the mesh GLBs plus the SketchUp linework class", "current", "Shared (folder 50); TrueVision's later rules arrive with W2-06 (D71)"),
    ("D19", "Per-category exclusion list with a per-record override", "current", "Shared"),
    ("D20", "Exact linework baked on localhost, stored on R2", "current", "The bake gate stays the localhost test (D71); bake-before-save on Update stays a seam until publishing lands (D72, DR-22)"),
    ("D21", "Hidden lines as a dashed class, off by default", "current", "Shared"),
    ("D22", "Tab strip under the header; Layout Mode switch on localhost (v2.21.20)", "superseded in part", "The strip becomes TrueVision's TabStrip 2.0.0 (D78, W1-34); the per-project Layout Mode switch stays a temporary divergence, re-decided at the publishing port (D65, W4-09; W5-07 held)"),
    ("D23", "The tool is named Layout Editor", "current", "Shared"),
    ("D24", "Authoring is localhost-only; web viewers read and download", "current", "DevGate unlocks the UI only; the data path stays on the hostname test (PD-07, D71). The web viewer becomes published-only in Wave 4 (D62)"),
    ("D25", "A drawing is a paper sheet A4-A1, default A3 landscape", "current", "Shared"),
    ("D26", "Modern and Classic title blocks (Vale scan)", "permanent", "Vale's own Classic scan stays (PD-14, D83); TrueVision's title-block cells arrive with W1-22, its QR cell switched off (D52)"),
    ("D27", "Scales 1:20, 1:50, 1:100", "superseded", "By D57 (DR-17): 1:200 added (W1-22)"),
    ("D28", "Sections filed into Cross Sections", "temporary", "Kept until TrueVision's 48 passes its 0.1.0 placeholder (D66)"),
    ("D29", "2D viewport: scale locked, every handle crops", "current", "Shared (TrueVision took it); rotation arrives with W3-06"),
    ("D30", "3D viewport: raster snapshot, every handle crops", "current", "Shared"),
    ("D31", "Layer type is a tag; top of the list draws frontmost", "superseded", "The Layers list is the sheet's paint order (TrueVision v2.106.0, W1-28); reference layers (D57, W3-13)"),
    ("D32", "Right panels top to bottom: Viewport, Text, Dimensions, Styles", "superseded in part", "The panel set and host follow TrueVision (PanelHost 1.6.0, W1-38, and the panel packages)"),
    ("D33", "Style toggles per plan and elevation record", "VV ahead", "TrueVision has the record keys but no rows; ValeVision keeps its Styles and Exclusions rows as a seam (D72, W2-04, W2-05) and offers them by WT-09 (held)"),
    ("D34", "Sheet markup modes: Scene and Sheet", "current", "Shared"),
    ("D35", "PDF in jsPDF with Helvetica as the measuring face", "superseded", "By D61 (DR-21 (a)): PdfFonts embeds Open Sans (W1-25)"),
    ("D36", "Binary assets through the worker's asset route plus a Flask mirror", "permanent", "DIV-4 (D67, D68); `R2AssetUpload__` keeps TrueVision's name with ValeVision's body"),
    ("D37", "Reference test project `2026/3047__Doous`", "current", "Also this programme's test project (on a copy, never live)"),
    ("D38", "Versions 2.16.0-2.21.0, patch numbers for fixes", "done", "The app's version step is now D85"),
    ("D39", "No user-data architecture change", "current", "New content takes TrueVision's relative folder names inside ValeVision's own prefix (D69)"),
    ("D40", "Vendoring layout; Glass Transparency Off; Whitecard; free-bearing elevations", "done", "Shared vendor layout (DIV-5 closed); the rendering rules stand"),
]
assert len(D_STATUS) == 40
table(["D", "Decision (09-Sep-2026, short)", "Status", "Why, and by what"], [list(x) for x in D_STATUS])
A("")
A("### 5.3 TrueVision's decisions TD01 to TD06 (its realign plan, 10-Sep-2026), seen from ValeVision")
A("")
table(["TD", "TrueVision's decision", "In ValeVision"], [
    ["TD01", "Authoring from both origins through an unlock flag (DevGate)", "DevGate 1.1.0 is in ValeVision (since v2.22.0) and unlocks the UI only; the data path stays on the hostname test (PD-07, D71)"],
    ["TD02", "`90__System__PageLayoutSystem` kept, then retired (its v2.155.0)", "ValeVision's `35__System__PageLayoutSystem` retires the same way with W6-03, after W0-16 copies jsPDF and Vale's scan out (D43); 90 is burnt in the registry"],
    ["TD03", "PS01 is TrueVision's migration reference project", "ValeVision's is `2026/3047__Doous` (D37)"],
    ["TD04", "Modern title block only, Noble Architecture branding", "ValeVision keeps Classic with Vale's own scan (D26, PD-14); TrueVision has since gained a Classic placeholder of its own"],
    ["TD05", "Client measuring kept aligned", "Shared (D13)"],
    ["TD06", "Section data recorded in ValeVision's structure, exactly", "ValeVision's `CrossSection__SceneData` is the reference; TrueVision's two deviations are fixed only in TrueVision (WT-02, held; D81)"],
])
A("")
A("### 5.4 The parity audit's ledger decisions (slice S11)")
A("")
table(["S11 decision", "Question", "Register", "Applied (01-Oct-2026, default)"], [
    ["D-S11-01", "Does the alignment request sign off TrueVision features Adam has not tried?", "DR-01 (D41)", "(c): port in dependency order, name every unconfirmed release, hold the four gesture changes"],
    ["D-S11-02", "The ledger's shape", "DR-35 (D75)", "(b): restructured in place, narrative archived - this file"],
    ["D-S11-03", "Module versions after a whole-file port", "DR-34 (D74)", "(a): TrueVision's version and log, plus a Source version line"],
    ["D-S11-04", "The shared service-worker token", "DR-07 (D47)", "No package bumps it; Adam bumps at deploy (section 1.4)"],
    ["D-S11-05", "The lazy loader: offer it to TrueVision, or keep it as ValeVision's own for good?", "DR-24 (D64)", "(a): a permanent ValeVision divergence - one status everywhere in this ledger"],
    ["D-S11-06", "May the swarm edit TrueVision?", "DR-36 (D76)", "(a): no; TrueVision items are listed in section 7"],
    ["D-S11-07", "Sections filed by drawing type", "DR-26 (D66)", "Temporary divergence until TrueVision's 48 passes 0.1.0"],
    ["D-S11-08", "SnapshotHistory's file name", "DR-04 (D44)", "ValeVision took TrueVision's name (W0-02)"],
    ["D-S11-09", "The reopened deliberate non-ports", "DR-35 (D75)", "Recorded at the foot of section 4"],
    ["D-S11-10", "Per-drawing style toggles: which way?", "DR-32 (D72)", "ValeVision keeps its rows as a seam (VV ahead); TrueVision may take them (WT-09, held)"],
])
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 6. Back-ports
A("## 6. Back-ports, ValeVision to TrueVision")
A("")
A("Re-checked in TrueVision's code at `b2aa9151` (audit slice S11 B5 and its verifier, slice S10). TrueVision is not edited by the")
A("ValeVision waves: every open back-port is a TrueVision-lane package, held until Adam approves it (DR-36 default (a), D76).")
A("This table replaces the Archive's \"Pending back-port\" table, which stays below as written, each row with its dated status.")
A("")
table(["Item", "ValeVision source", "Status in TrueVision (01-Oct-2026)", "Evidence", "Next"], [
    ["Scene row builders and reorder helpers split out of the scene editor", "`21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js`, `...__SceneReorder__.js`, `...__ScenePersistence__.js`",
     "WITHDRAWN - TrueVision deleted its never-imported copies in v2.68.2 (19-Sep-2026): \"do not re-port\". A permanent ValeVision divergence, not a back-port",
     "TV devlog v2.68.2; TV plan row C", "None. ValeVision's three PORT NOTEs corrected on 01-Oct-2026 (W0-06)"],
    ["Ground Floor Plan quick action (D11)", "`42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js`", "OPEN - TrueVision has no quick action (its v2.87.0 storey levels are a different feature)",
     "TV `42/Na__FloorPlan__DevMenu__Editor__.js`", "WT-06 (held); ValeVision keeps it as a seam (W2-04)"],
    ["Per-drawing style toggles (D33)", "`42/...DevMenu__RowBuilders__.js`, `45/...DevMenu__RowBuilders__.js`, `40/Na__DrawView__StyleRows__.js`",
     "OPEN - data only in TrueVision: the record keys exist, but no caller sets them and its 2.0.0 row builders build no Styles or Exclusions rows. ValeVision is ahead",
     "S11-V03; `Na__FpData__SetStyle` and `Na__ElevData__SetStyle` have no caller in TV", "WT-09 (held); ValeVision re-applies its rows in every whole-file port (W2-04, W2-05)"],
    ["Dimension config and preview splits", "`44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js`, `...__EditorPreview__.js`",
     "OPEN (half-landed) - TrueVision has the files but never wired them: its Data (988 lines) and Editor (907) keep their own getters; ValeVision is single-sourced",
     "S11-V03; TV `44/Na__PlanDimensions__Data__.js`", "WT-01 (held); ValeVision never takes TrueVision's Data or Editor whole (audit R0.3.4)"],
    ["Shared drawing style rows and config state", "`40/Na__DrawView__StyleRows__.js`, `40/Na__DrawView__ConfigState__.js`",
     "OPEN (half-landed) - ConfigState is wired in TrueVision (4 importers); StyleRows has no importer or caller there", "S11-V03", "WT-09 (held)"],
    ["R2 asset upload utility", "`03__AppUtils/Na__AppUtils__R2AssetUpload__.js`",
     "CLOSED - TrueVision has its own twin at the same path (1.0.1, \"Back-port : no\"): the same name and signature over its own transport (DIV-4)",
     "TV `03/Na__AppUtils__R2AssetUpload__.js`", "None. ValeVision's PORT NOTE corrected on 01-Oct-2026 (W0-06)"],
    ["Styled confirm dialog for destructive dev actions", "`index.html` markup, `Na__UiFeature__Styles__DropdownAndToast__.css`; the scene and group editors",
     "OPEN (half-landed) - TrueVision has the module but no `naConfirmDialog` markup or styles, so it falls back to `window.confirm`", "TV `Index.html`; S10 Appendix B item 3", "WT-05 (held)"],
    ["Pick Face, Re-pick and the gizmo grip", "`45__System__ElevationViews/Na__Elevation__FacePick__.js`, `...__GizmoGrip__.js`",
     "CLOSED as a back-port, then SUPERSEDED in TrueVision by Drawing Planes (v2.82.0); its copies are initialised but unused",
     "TV devlog v2.86.0; S11-V09", "Porting Drawing Planes (W2-40, W2-01) and TrueVision's 2.1.0 elevation editor (W2-05) supersedes ValeVision's too"],
    ["Sections filed by drawing type (D28)", "`45__System__ElevationViews/Na__Elevation__SceneLink__.js`",
     "OPEN, a decision - TrueVision files every elevation under Elevations; its 48 is a 0.1.0 placeholder", "TV `45/Na__Elevation__SceneLink__.js`", "Temporary divergence until TrueVision's 48 passes 0.1.0 (D66)"],
    ["Rotation path and hidden segments (Lantern Designer)", "`50/Na__ProjectedLinework__SoupBuilder__.js`, `...__ClipWorker__.js`, `...__WorkerPool__.js`",
     "CLOSED in both apps - they were ValeVision-to-ValeVision items", "S11 B5 (verifier)", "None"],
    ["The whole Layout Editor", "`51__System__LayoutEditor/`", "CLOSED - TrueVision took it in its v2.23.0 and now leads it", "TV devlog v2.23.0", "None"],
    ["Pose-preserving mode release and entry; look-ahead capture target", "`10/Na__NavigationModes__Switcher.js`, walk and fly SyncFromCamera, `21/...Camera__SceneTransition.js`",
     "OPEN - no ReleaseToOrbit, EnterModeAtPose or SyncFromCamera in TrueVision", "S11 B5", "WT-06 (held)"],
    ["**The lazy Layout Editor loader**", "`51__System__LayoutEditor/01__Core__Loader/` (Loader, LoadingScreen, Styles__Boot) and the DrawingCode leaf",
     "**Not a back-port: a permanent ValeVision divergence** (DR-24 default (a), D64; PD-05). TrueVision loads its editor at start-up and reserves LE/01 for a loader. Offering it to TrueVision would be a new decision under DR-36 (b), not a pending row",
     "TV devlog :11718; S11 B4.6", "None. The Loader's own PORT NOTE still says \"Back-port : candidate\"; the next package that writes the Loader (W1-31) aligns it"],
    ["Add Viewport list rebuilt on every refresh; Viewport panel refreshed on scene broadcasts", "`LE/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` 1.4.1, ModeController 1.15.1",
     "OPEN - a bug in TrueVision (`addSelect.options.length <= 1`, its `:647`)", "TV `LE/40/...Panel__ViewportSettings__.js:647`", "WT-04 (held)"],
    ["Drawing thumbnail bake and Bake Missing Thumbnails", "`40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` and the two Dev editors",
     "OPEN - no thumbnail bake in TrueVision", "TV devlog v2.161.0", "WT-06 (held); ValeVision keeps it as a seam (W2-04, W2-05)"],
    ["A `.gitkeep` in each scrapbook category folder", "`51__LayoutEditor__UserScrapbookContent/`", "OPEN (minor) - TrueVision's category folders 02-05 do not exist", "TV app root", "WT-04 (held)"],
    ["`sys.dont_write_bytecode` in the two scrapbook Python tests", "`80__Testing__PrototypeEnvironment/Na__Test__ScrapbookApi__.test.py`, `Na__Test__ScrapbookServer__.py`", "OPEN (minor)", "TV tests", "WT-04 (held)"],
    ["Per-scene lighting", "`06/Na__Scene__PerSceneLighting__.js` and its rows", "CLOSED - TrueVision v2.161.0, the same day", "TV devlog v2.161.0", "None"],
    ["Toast offset 96 px; the 3D canvas and export safe frame clearing the tab strip", "`03__Style__AppStylesheets/` DropdownAndToast, RenderCanvas, ViewportOverlays",
     "VV ahead - TrueVision uses 40 px and draws the canvas under the strip", "audit R4 D.2.1", "WT-07 (held)"],
])
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 7. TV-side records
A("## 7. TrueVision-side records waiting for the TrueVision lane")
A("")
A("TrueVision is the source of truth, and some of its records say things about ValeVision that are no longer true. Decision DR-36")
A("(default (a), D76) keeps TrueVision unedited, so the corrections are listed here and drafted for the TrueVision-lane package")
A("WT-08, which applies them only with Adam's approval (its edits are comment and record lines only). Line numbers are at")
A("`b2aa9151`.")
A("")
table(["TrueVision record", "What it says", "What is true on 01-Oct-2026", "Draft wording for WT-08"], [
    ["`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` section 4 and 4.1 (folder map, \"Fixed for the whole of this work\")",
     "ValeVision's drawing folders sit one number above TrueVision's", "ValeVision took TrueVision's numbers on 01-Oct-2026 (W0-02, DR-02); both apps share 40, 42-46; TrueVision's 47-49 land in ValeVision at their own numbers",
     "\"Revised 01-Oct-2026: ValeVision renumbered its drawing folders to TrueVision's (ValeVision's W0-02); the map below is history. Both apps now share 40 and 42-46, and 47-49 land in ValeVision at TrueVision's numbers.\""],
    ["The same plan, section 12, row C \"FacePick + GizmoGrip\" (-)", "not yet ported", "In TrueVision, then superseded by Drawing Planes (v2.82.0)", "\"x, then superseded by 47 Drawing Planes (v2.82.0); the old modules are unused (v2.86.0).\""],
    ["Section 12, row C \"Confirm dialog, dimension config + preview splits\" (x)", "done", "The dialog module has no markup (window.confirm fallback); the splits are files, never wired", "\"~: dialog module without markup (WT-05); dimension splits present but unwired (WT-01).\""],
    ["Section 12, row C \"Styles, exclusions, linework asset on both records\" (x)", "done", "Record keys only; no UI sets them", "\"~: record keys only; the Styles and Exclusions rows were never built here (WT-09).\""],
    ["Section 12, rows U, Y, AI, AJ, AK, AM, AP and N (- or pending)", "not yet in ValeVision", "Ported: U in checkpoint commit 66937440, Y v2.35.0, AI v2.42.0, AJ v2.43.0, AK v2.41.0, AM v2.44.0, AP v2.61.0, N v2.64.0",
     "Mark each x with \"ValeVision <version>\", and add a row \"TV v2.71.0 onward: see ValeVision's parity ledger, Release Watermark\""],
    ["Section 12, row L (clipboard and snap move back-port to ValeVision, pending)", "pending", "Half: ViewportClipboard in ValeVision v2.35.0; ViewportSnapMove not yet", "\"~: clipboard ported (ValeVision v2.35.0); snap move open.\""],
    ["PORT NOTE Back-port fields: `LE/05/Na__LayoutEditor__LoadingVeil__.js:54`, `LE/20/Na__LayoutEditor__ForceRender__.js:42`, `LE/50/Na__LayoutEditor__SpecPdf__.js:44`, `LE/50/Na__LayoutEditor__SpecEditor__Notes__.js:36`, `LE/60/Na__LayoutEditor__PdfFilename__.js:40`, `LE/20/Na__LayoutEditor__ViewportClipboard__.js:94`, `LE/10/Na__LayoutEditor__Styles__Surfaces__.css:37`",
     "PENDING / offer / to follow", "Ported: LoadingVeil v2.70.0 (adapted), ForceRender v2.57.0, SpecPdf v2.56.0, SpecEditor__Notes v2.61.0, PdfFilename v2.55.0, ViewportClipboard v2.35.0; the Surfaces tokens v2.60.0 without the register (half)",
     "\"Back-port : done - ValeVision <version>\" (Surfaces: \"tokens done in ValeVision v2.60.0; the register part waits for its port\"). Keep `LE/05/Na__LayoutEditor__TabStrip__.js:60`: it is about TabStrip 2.0.0, which ValeVision does not have yet"],
    ["\"ValeVision has no web viewer\": TV devlog v2.166.0 (L553); `LE/80/Na__LayoutEditor__WebViewer__.js:53`, `__Drawings__.js:42`, `__Spec__.js:46`, `__TouchControls__.js:51`; `LE/66/Na__LayoutEditor__Share__Links__.js:63`, `Styles__Share__.css:6`",
     "ValeVision has no web viewer", "ValeVision has had its web viewer since v2.58.0 (18-Sep-2026)", "\"ValeVision has a live web viewer since its v2.58.0; the published-only viewer ports in its Wave 4.\""],
    ["\"ValeVision has no north system\": `45/Na__Elevation__AutoName__.js:51`, `__AutoNameText__.js:34`", "no north system", "ValeVision has had North since v2.67.0 (now `46__System__NorthDirection`)", "\"ValeVision has North since its v2.67.0.\""],
    ["TV devlog v2.159.0 (L1067)", "\"ValeVision has FlushJoins 1.0.0 with the old tolerances\"", "ValeVision has no FlushJoins module (TrueVision v2.37.0 was never ported; W2-43 brings it)", "One TV devlog records note (never an edit of the old entry)"],
    ["TV PORT NOTEs of `LE/05/Na__LayoutEditor__ModeController__.js` and `LE/40/Na__LayoutEditor__Toolbar__.js`", "\"Parity : verbatim; Divergences : console prefix, header and folder numbers only\"", "Far from true: TrueVision's files lead ValeVision's by many versions", "\"Parity : TrueVision leads; see ValeVision's parity ledger\""],
    ["TV `LE/05/Na__LayoutEditor__TabStrip__.js` DESCRIPTION", "\"the canvas, menus, breadcrumb and carousel shift down\" with the strip", "TrueVision's canvas does not shift (ValeVision's does: WT-07)", "Drop \"the canvas\" from the line, or take ValeVision's clearance (WT-07)"],
    ["TV devlog structure", "-", "No heading for v2.33.0; no entries for four features ValeVision ported (groups, dimension text leader, eyedropper viewports, dashed vector edges) or for PdfFonts 1.0.0 (14-Sep); duplicate headings v2.27.0 and v2.65.1", "One TV devlog records note naming them"],
    ["124 TV files with \"ValeVision : not yet ported\" PORT NOTE lines", "not yet ported", "True until each is ported; ValeVision writes its own PORT NOTE (K2 H5) and never copies these lines", "Updated file by file as ValeVision's packages land, in WT-08's pass"],
    ["The 12 TV feature PLAN files' \"ValeVision port\" phases", "ValeVision phase open", "Closed one by one as the Release Watermark's rows flip (section 4, TV plan phase column)", "Mark each phase with the ValeVision version that carried it"],
    ["`TrueVision__NOTES__FolderNumberRegistry__.md`", "(does not exist)", "ValeVision's registry exists from 01-Oct-2026", "WT-08 creates the twin with the same number table (audit F.8 C32)"],
])
A("")
A("---")
A("")
# ---------------------------------------------------------------------------------------------------- 8. Transport
A("## 8. Transport (DIV-4)")
A("")
A("Written by the Wave 0 Parity Scribe (W0-99) from the transport packages' Port Records (W0-09 to W0-14): the facade name map")
A("(`80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` and `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`,")
A("TrueVision's names over ValeVision bodies), worker 1.6.0's routes and deploy state, the Flask routes and blueprints, and the")
A("list of editor-owned keys. Until then: ValeVision's transport is `R2SaveProjectJson__` (project.json, R2 first then the Flask")
A("mirror), `R2AssetUpload__` (assets) and `R2DrawingNotes__` (the specification), over `whitecardopedia-editor-api` and")
A("`WebApps/Whitecardopedia/server.py`; keys only under `VaApps/Projects/<folderId>/`.")
A("")
A("---")
A("")
LIVE_PART = "\n".join(L) + "\n"

# =====================================================================================================================
# 9. Archive
SW = "ValeVision runs under Whitecardopedia's shared service worker in production; service worker token: shared Whitecardopedia worker - Adam's call (D47; section 1.4)"


def corr(t):
    return " **[01-Oct-2026 correction (W0-06): " + t + "]**"


def note(t):
    return " **[01-Oct-2026 note (W0-06): " + t + "]**"


# (line, mode, anchor, marker): mode 'eol' appends at the end of the line; 'after' inserts right after the anchor;
# 'cell' inserts before the row's final ' |'.
ANN = [
    (12, "eol", None, corr("that working copy does not exist and is not used; TrueVision is read only at commit b2aa9151 of the root above (section 1.1)")),
    (20, "eol", None, corr("three of the five remain, all permanent: DIV-1 render path, DIV-2 section engine, DIV-4 transport. DIV-3 closed when TrueVision moved its drawings to the top-level LayoutEditor__DrawingsData block (its v2.21.0), and DIV-5 closed with TrueVision v2.20.0 (section 1.3)")),
    (29, "cell", None, corr("Pick Face and the gizmo grip landed and were then superseded in TrueVision by Drawing Planes (v2.82.0); the scene editor splits were withdrawn by TrueVision v2.68.2; the dimension splits and the style rows landed as files only and were never wired, and the per-drawing style toggles got record keys but no UI; the confirm dialog landed as a module with no markup, so TrueVision still uses window.confirm. Ground Floor Plan and sections-filed-by-type are still open. Section 6 has every status")),
    (37, "eol", None, corr("not all closed (section 6, checked in TrueVision's code). Withdrawn by TrueVision v2.68.2, now a permanent ValeVision divergence: the scene row builders and reorder splits. Still open: the per-drawing style toggles (record keys only in TrueVision). Half-landed as unwired files: the dimension config and preview splits, and the shared style rows. Half-landed with no markup: the confirm dialog. Superseded by TrueVision's Drawing Planes: Pick Face and the gizmo grip. Closed: the R2 asset upload utility (TrueVision's own twin) and the whole Layout Editor")),
    (42, "eol", None, corr("the two Lantern Designer items are already in both apps (Na__PlSoup__ViewMapFromBasis and TurnPoint, and HiddenSegments, in both apps' folder 50), so neither is outstanding")),
    (49, "eol", None, corr("ported long since: ValeVision has DevGate (1.1.0 from 18-Sep-2026) and both harnesses, Na__Verify__ModuleGraph__.mjs and Na__Verify__Exports__.mjs in 80__Testing__PrototypeEnvironment, since v2.22.0; every parity package runs both (gates G1 and G2)")),
    (69, "cell", None, note("TrueVision's 1.1.0 is its v2.86.0 and v2.87.0 work, PENDING-SIGNOFF in the Release Watermark (section 4)")),
    (70, "cell", None, note("TrueVision's 1.1.0 is its v2.86.0 and v2.87.0 work, PENDING-SIGNOFF in the Release Watermark (section 4)")),
    (74, "cell", None, note("verbatim as of TrueVision v2.85.0; TrueVision has since moved to Groups 1.4.0 and Grips 1.12.0 (Module Register)")),
    (75, "cell", None, note("as of TrueVision v2.85.0; TrueVision's ItemClipboard is now 1.7.0")),
    (77, "cell", None, note("as of TrueVision v2.85.0; TrueVision's PanelHost is now 1.6.0")),
    (78, "cell", None, note("as of TrueVision v2.85.0; TrueVision's TileDrag is now 1.2.0")),
    (79, "cell", None, note("as of TrueVision v2.85.0; TrueVision has since moved to Panel__ScrapbookParametric 1.8.0, ScrapbookParametric__Grips 1.6.0 and LinkNoodle 1.2.2")),
    (84, "cell", None, note("still open (minor), carried by the TrueVision-lane package WT-04 (held)")),
    (85, "cell", None, note("still open (minor), carried by the TrueVision-lane package WT-04 (held)")),
    (87, "cell", None, note("still open; every TrueVision release from v2.86.0 to v2.172.0 now has a row in the Release Watermark (section 4)")),
    (94, "eol", None, note("still unchanged on 01-Oct-2026 ('2026-09-18-1'). From 01-Oct-2026 no package bumps it: the shared-worker package is prepared for Adam (W0-08, not deployed) and he bumps at deploy (D47)")),
    (126, "cell", None, corr("TrueVision has no top-level 53__System__ProjectQrCode either: its QR system is LE/53__Feature__ProjectQrCode (top-level 53 is now 53__Data__Layout__PublishedSchema); not yet ported (W1-15, switched off, D52)")),
    (172, "eol", None, note("still unchanged on 01-Oct-2026 ('2026-09-18-1'). From 01-Oct-2026 no package bumps it: the shared-worker package is prepared for Adam (W0-08, not deployed) and he bumps at deploy (D47)")),
    (219, "cell", None, note("still open on 01-Oct-2026; W1-21 takes TrueVision's History 1.7.0, which carries 'margin' and 'areas'")),
    (236, "cell", None, corr("reopened: this tree DOES run under a service worker in production - Whitecardopedia's shared one, whose registrar reloads open pages on an update. From 01-Oct-2026 AutoSave publishes the neutral window.Na__Pwa__HasUnsavedWork (W0-08, live); the registrar's hold that reads it is prepared for Adam, not deployed (W0-08 staged; D47)")),
    (244, "eol", None, corr("closed: the undo/redo row was done in ValeVision v2.64.0 (AutoSave 1.3.0, History 1.4.0)")),
    (339, "cell", None, note("reopened by DR-11's default (D51): TrueVision's Document ID code is ported with the two-part format {project}_{drawing} until Vale phases exist (W1-12, W1-19, W1-22); Release Watermark row v2.71.0")),
    (340, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (377, "after", "service worker token (n/a)", corr(SW)),
    (384, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (394, "after", "service worker token (n/a)", corr(SW)),
    (404, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (412, "after", "service worker token (n/a)", corr(SW)),
    (420, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (429, "after", "service worker token (n/a - this tree has no PWA worker)", corr(SW)),
    (439, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (446, "after", "service worker token (n/a)", corr(SW)),
    (452, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (461, "eol", None, corr("ported in ValeVision v2.64.0 (AnnounceRestore in SheetModel__Sheets, the restore field on Dispatch and Touch)")),
    (467, "cell", None, corr("the restore field arrived with ValeVision v2.64.0")),
    (482, "cell", None, note("still open on 01-Oct-2026 (TrueVision v2.41.0, PENDING-SIGNOFF)")),
    (495, "cell", None, note("still open on 01-Oct-2026 (TrueVision v2.38.0, PENDING-SIGNOFF)")),
    (505, "after", "service worker token (n/a)", corr(SW)),
    (506, "after", "so DrawingScale works.", note("still so on 01-Oct-2026: TrueVision v2.40.0's at-scale rows are open (PARTIAL)")),
    (522, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (532, "after", "No service worker token", corr(SW)),
    (542, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (569, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (573, "eol", None, corr("the shape row arrived with the groups port (ValeVision v2.38.0, History 1.3.0), as the History module's own log says")),
    (615, "after", "**n/a** - this tree has no PWA worker", corr(SW)),
    (619, "eol", None, corr("the shape row arrived with the groups port (ValeVision v2.38.0)")),
    (720, "cell", None, note("still open on 01-Oct-2026: TrueVision v2.28.0's ViewportSnapMove (PARTIAL)")),
    (812, "eol", None, corr("both were ported later: palette mode in ValeVision v2.27.0, the undo-restore announcement in v2.64.0")),
    (849, "eol", None, corr(SW)),
    (970, "cell", None, note("renamed to TrueVision's interface name Na__DrawView__RenderPreset__ on 01-Oct-2026 (W0-02); the composer body is kept (DIV-1)")),
    (986, "cell", None, note("ValeVision took TrueVision's file name on 01-Oct-2026 (W0-02, FR-10)")),
    (987, "cell", None, note("TrueVision took this file's name and signature on 10-Sep-2026 over its own transport: a twin since (DIV-4)")),
    (1043, "eol", None, corr("TrueVision has had the Layout Editor since its v2.23.0 (taken from this one) and has grown it to 341 files")),
    (1122, "after", "(ValeVision only until the loader is back-ported)", corr("the loader has one status: a permanent ValeVision divergence, not a back-port candidate (DR-24 (a), D64)")),
    (1128, "after", "ModelSource, PlanDoors, ViewportSnapMove", corr("TrueVision now has 17 Layout Editor subfolders and 186 Layout Editor files that ValeVision lacks (Module Register); ViewportSnapMove lives in LE/28__System__ObjectSnap, not here")),
    (1134, "cell", None, corr("ValeVision has had 55, 56 and 57 since v2.68.0 and v2.69.0")),
    (1169, "after", "a feature, not an alignment", note("reopened by the alignment: DR-21's default (D61) ports PdfFonts and embeds Open Sans (W1-25)")),
    (1189, "after", "so there is no shell cache to evict", corr(SW)),
    (1218, "cell", None, corr("WITHDRAWN by TrueVision v2.68.2: a permanent ValeVision divergence, not a back-port (section 6)")),
    (1219, "cell", None, corr("still OPEN, both: the Ground Floor Plan quick action (WT-06, held), and the per-drawing style toggles, data only in TrueVision with ValeVision ahead (WT-09, held)")),
    (1220, "cell", None, corr("still OPEN, half-landed: TrueVision has the files, never wired; ValeVision ahead (WT-01, held)")),
    (1221, "cell", None, corr("CLOSED: TrueVision has its own twin at the same path (1.0.1, 'Back-port : no')")),
    (1222, "cell", None, corr("HALF: TrueVision has the module but no markup or styles, so it falls back to window.confirm (WT-05, held)")),
    (1223, "cell", None, corr("CLOSED as a back-port, then SUPERSEDED in TrueVision by Drawing Planes (v2.82.0)")),
    (1224, "cell", None, note("still open: a temporary divergence until TrueVision's 48 passes 0.1.0 (DR-26, D66)")),
    (1225, "cell", None, corr("still OPEN, half-landed: ConfigState is wired in TrueVision, StyleRows has no importer there (WT-09, held)")),
    (1226, "cell", None, corr("CLOSED in both apps: a ValeVision-to-ValeVision item")),
    (1227, "cell", None, corr("CLOSED in both apps: a ValeVision-to-ValeVision item")),
    (1228, "cell", None, note("CLOSED (TrueVision v2.23.0)")),
    (1229, "cell", None, note("still OPEN (WT-06, held)")),
    (1230, "cell", None, corr("not a back-port: the loader is a permanent ValeVision divergence (DR-24 (a), D64)")),
    (1231, "cell", None, note("still OPEN, a TrueVision bug (WT-04, held)")),
    (1232, "cell", None, note("still OPEN (WT-06, held)")),
    (1239, "cell", None, note("re-verified identical on 01-Oct-2026; TrueVision's AppHeader, LoadingOverlays and LoadingVeil are unchanged since 20-Sep")),
    (1240, "cell", None, corr("ValeVision has no --over-model rule at all: its base .na-le-veil is the fixed full-screen veil. W1-33 takes TrueVision's two-mode veil region")),
    (1244, "cell", None, note("the loader's one status from 01-Oct-2026 (DR-24 (a), D64): the subfolder table and the back-port table above are corrected to match")),
    (1246, "eol", None, note("TrueVision v2.83.0 is PARTIAL in the Release Watermark: the fold is identical but the going-in veil was adapted away (W1-33). The open follow-on is TrueVision v2.158.0 (TabStrip 2.0.0, ModeController 1.30.0), which changes when the fold fires (W1-34)")),
]
SW_LINES = {236, 340, 377, 384, 394, 404, 412, 420, 429, 439, 446, 452, 505, 522, 532, 542, 569, 615, 849, 1189}
assert SW_LINES <= set(a[0] for a in ANN)
assert len(SW_LINES) == 20

orig_lines = PRE.decode("ascii").split("\r\n")
assert orig_lines[-1] == ""
body = orig_lines[:-1]
assert len(body) == 1246
arch = list(body)
for ln, mode, anchor, mark in ANN:
    asc(mark)
    assert "|" not in mark and "]**" not in mark[:-3], mark
    s = arch[ln - 1]
    if mode == "eol":
        s = s + mark
    elif mode == "after":
        assert s.count(anchor) == 1, (ln, anchor, s)
        i = s.index(anchor) + len(anchor)
        s = s[:i] + mark + s[i:]
    elif mode == "cell":
        assert s.endswith(" |") and s.startswith("|"), (ln, s[-20:])
        s = s[:-2] + mark + " |"
    arch[ln - 1] = s
# headings two levels down
for i, s in enumerate(arch):
    m = re.match(r"^(#{1,4}) ", s)
    if m:
        arch[i] = "##" + s
ARCHIVE_HEAD = [
    "## 9. Archive - the ledger as it stood before 01-Oct-2026",
    "",
    "**Archived 01-Oct-2026 (W0-06; DR-35 (b), D75).** Below is this ledger as written from 10-Sep-2026 to 28-Sep-2026 (last",
    "commit `7b4e593a`), moved here whole when sections 1 to 8 replaced it. Nothing was deleted or reworded. Two mechanical things",
    "changed, and undoing them gives back the old file byte for byte: every heading moved two levels down (so `###` below was `#`,",
    "`####` was `##`, `#####` was `###`), and dated markers were added beside rows that had gone wrong or stale - each reads",
    "`**[01-Oct-2026 correction (W0-06): ...]**` or `**[01-Oct-2026 note (W0-06): ...]**`, and the original words around it",
    "stand. Paths, versions and folder numbers are as they were written: read them through the renumbering map in section 2.2",
    "(for example `42/` here is today's `40__System__DrawingViewCore`). Statuses here are history; the live ones are in",
    "sections 3 to 6.",
    "",
    "---",
    "",
]
ARCH_PART = "\n".join(ARCHIVE_HEAD) + "\n" + "\n".join(arch) + "\n"


def undo_archive(text):
    t = re.sub(r" \*\*\[01-Oct-2026 (?:correction|note) \(W0-06\): .*?\]\*\*", "", text)
    out = []
    for s in t.split("\n"):
        m = re.match(r"^(#{3,6}) ", s)
        out.append(s[2:] if m else s)
    return "\n".join(out)


body_text = "\n".join(arch) + "\n"
restored = undo_archive(body_text)
assert restored.replace("\n", "\r\n").encode("ascii") == PRE, "archive undo proof FAILED"
DOC = LIVE_PART + ARCH_PART
asc(DOC)
OUT = DOC.replace("\n", "\r\n").encode("ascii")
print("live part lines", LIVE_PART.count("\n"), "archive lines", ARCH_PART.count("\n"), "total bytes", len(OUT))
print("register rows", len(REG), dict(Counter(r["group"] for r in REG)), "watermark rows", len(rw), "open", n_open)
print("annotations", len(ANN), "of which service-worker rows", len(SW_LINES))
json.dump(dict(annotations=[(a, b, c) for a, b, c, d in ANN], sw_lines=sorted(SW_LINES)), open(os.path.join(SCR, "ledger_annotations.json"), "w"), indent=1)
if "--write" in sys.argv:
    open(os.path.join(VV, REL), "wb").write(OUT)
    open(LAST, "w").write(hashlib.sha1(OUT).hexdigest())
    print("WRITTEN", os.path.join(VV, REL), hashlib.sha1(OUT).hexdigest())
