# W0-06: generate VV/ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md (new; mirror of TV's realign plan name).
# Tables are computed from the canonical JSON (decisions, renames, packages) and the W0-02 / W0-03 records.
import io, json, os, re, subprocess, sys

sys.stdout.reconfigure(encoding="utf-8")
EV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
P = os.path.join(EV, "parity")
OUT = os.path.join(VV, "ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md")

reg = json.load(open(os.path.join(P, "data", "decision_register.json"), encoding="utf-8"))
REG = {r["dr_id"]: r for r in reg}
raw = json.load(open(os.path.join(P, "data", "decisions.json"), encoding="utf-8"))
RAW = {r["id"]: r for r in raw}
SRC2DR = {}
for r in reg:
    for s in r.get("source_ids", []):
        SRC2DR.setdefault(s, []).append(r["dr_id"])
wpc = json.load(open(os.path.join(P, "data", "wp_canonical.json"), encoding="utf-8"))
PK = {p["wp_id"]: p for p in wpc["packages"]}
frm = json.load(open(os.path.join(P, "data", "file_rename_map.json"), encoding="utf-8"))
state = json.load(open(os.path.join(EV, "execution", "execution_state.json"), encoding="utf-8"))
records = sorted(f[:-3] for f in os.listdir(os.path.join(EV, "execution", "port_records")) if f.endswith(".md"))


def cell(s):
    s = re.sub(r"\s+", " ", str(s)).strip()
    return s.replace("|", "/")


def dnum(dr):
    return "D%d" % (int(dr.split("-")[1]) + 40)


# what has been done for each S01 decision (facts as of 01-Oct-2026)
DONE = {
    "D-S01-01": "Applied in the working tree by W0-02 on 01-Oct-2026 (`git mv`, not committed): 42 -> 40, 43 -> 42, 44 -> 43, 45 -> 44, 46 -> 45, 47 -> 46. Gates G1, G2, G3 passed",
    "D-S01-02": "Legacy 40 moved to 91 by W0-02; 35 stays live and reserved. Both retire in W6-03, held until Adam confirms the removals",
    "D-S01-03": "W0-12 builds the facade at TrueVision's paths with ValeVision bodies (W0 wave)",
    "D-S01-04": "No offer is made on the default; ValeVision carries every seam (WT-10, WT-11 held)",
    "D-S01-05": "Done: `ValeVision__NOTES__FolderNumberRegistry__.md` (W0-06), with Q-REG's TrueVision-growth numbers; the TrueVision twin waits for WT-08 (held)",
    "D-S01-06": "Done by W0-02: `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`, eight exports renamed, composer body kept (DIV-1)",
    "D-S01-07": "Done by W0-02: `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js`; the shared worker's precache line is corrected only in W0-08's staged package",
    "D-S01-08": "Unchanged: 62 stays (nominal collision recorded in the registry); 92 only on request (W6-03)",
    "D-S01-09": "Name kept; `41__System__CrossSectionView/README__CrossSectionView__.md` names the twins (W0-06)",
    "D-S01-10": "NA-only features land switched off; Vale values in config (W1-15, W1-22, W4-08, W4-12 and others)",
    "D-S01-11": "The switch stays as a recorded divergence; re-decided at the publishing port (W4-09); retirement is W5-07, held",
    "D-S01-12": "TrueVision is not edited. The TrueVision-side notes are drafted in the parity ledger's section 7 for WT-08 (held)",
    "D-S01-13": "Done by W0-02: 91 and `05__RenderPipeline/` (FR-01, FR-08)",
    "D-S01-14": "PhaseLibrary lands verbatim and uninitialised (W1-01); Model Source dormant (W2-16)",
    "D-S01-15": "Confirmed by the default and applied by W0-02; 'file structure' read as VV's storage layout (VaApps/Projects/<folderId>/), which does not change",
    "D-S01-16": "Published-only viewer in Wave 4 after its prerequisites (W4-01 to W4-09); VV's live viewer stays until then",
}

FR_PKG = {"FR-01": "W0-02", "FR-02": "W0-02", "FR-03": "W0-02", "FR-04": "W0-02", "FR-05": "W0-02", "FR-06": "W0-02",
          "FR-07": "W0-02", "FR-08": "W0-02", "FR-09": "W0-02", "FR-10": "W0-02", "FR-11": "W0-02", "FR-12": "W0-03",
          "FR-13": "W0-03", "FR-14": "W2-19", "FR-15": "W3-08", "FR-16": "W0-12", "FR-17": "W0-12", "FR-18": "W2-33",
          "FR-19": "W0-16", "FR-20": "W0-16", "FR-21": "W6-03", "FR-22": "W6-03", "FR-23": "W6-03", "FR-24": "W5-04",
          "FR-25": "W6-03"}
FR_DONE = {k for k, v in FR_PKG.items() if v in ("W0-02", "W0-03")}

L = []
A = L.append
A("# ValeVision 3D - TrueVision Re-Alignment: Drawing Systems, Projected Linework, Layout Editor")
A("")
A("**Status**: Wave 0 under way (01-Oct-2026). ValeVision's drawing folders carry TrueVision's numbers (W0-02) and its hotkey")
A("files TrueVision's names (W0-03), in the working tree; the records are restructured (W0-06). Nothing is committed yet.")
A("**Created**: 01-Oct-2026")
A("**Owner**: Adam Noble")
A("**Source**: TrueVision3D v2.172.0, commit `b2aa9151` (30-Sep-2026), read only at that commit. **Base**: ValeVision3D v2.71.0, commit `7b4e593a`.")
A("")
A("**Companion documents**")
A("- `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` (TrueVision's root) - TrueVision's plan of 10-Sep-2026 for the")
A("  first direction, ValeVision into TrueVision. This document is its mirror for the return direction and takes its name with")
A("  the app tokens swapped (K2 rulebook F8). TrueVision's own document is not edited by this work (DR-36, D76).")
A("- `ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` and `ValeVision__AUDIT__TrueVisionParity__Evidence__/` - the")
A("  parity audit of 01-Oct-2026: findings, the decision register (K1), the naming rules and target maps (K2), the work")
A("  packages (K3) and the delegation plan (Section F). It is the plan of record; this document summarises it for")
A("  ValeVision and records where it stands.")
A("- `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` - the outbound port plan of 09-Sep-2026 (D01 to D40) and, in its")
A("  section 2A, every decision of this alignment (D41 to D91), each on its default until Adam answers.")
A("- `ValeVision__PARITY__TrueVisionLedger__.md` - the parity ledger: Module Register, Release Watermark, back-ports. It is the")
A("  record of what is done.")
A("- `ValeVision__NOTES__FolderNumberRegistry__.md` - every folder number, and who may use it.")
A("- `ValeVision__WORKING_MEMORY__TrueVisionParity__.md` - the live hand-off file for agents (wave and package status).")
A("")
A("---")
A("")
A("## 0. How to read this document")
A("")
A("Read sections 1 to 4 for the design and section 5 for where the work stands. Sections 1 to 4 change only by a dated note")
A("beside what they revise (the house convention of both apps' plans). Section 5 is a dated snapshot; the live state is in the")
A("parity ledger and the working memory, which are kept by the programme's Parity Scribe and orchestrator.")
A("")
A("---")
A("")
A("## 1. End goal")
A("")
A("On 01-Oct-2026 Adam asked for ValeVision's drawing system and Layout Editor to be aligned exactly with TrueVision 3D - an")
A("identical Drawing Layout Editor experience - while ValeVision keeps its own R2 worker (`whitecardopedia-editor-api`),")
A("its Flask server (`WebApps/Whitecardopedia/server.py`) and its storage under `VaApps/Projects/{folderId}/`. The two apps")
A("are developed together for different clients: Vale Garden Houses and Noble Architecture.")
A("")
A("TrueVision is now the lead. ValeVision built the drawing system first (v2.16.0 to v2.21.x, 09 to 11-Sep-2026) and")
A("TrueVision took it in (its v2.20.0 to v2.24.0). From 12-Sep TrueVision authored and ValeVision followed, usually within")
A("hours, up to TrueVision v2.85.0 (ValeVision v2.68.0, 20-Sep). TrueVision then shipped 88 releases, v2.86.0 to v2.172.0,")
A("that ValeVision has none of. This plan brings ValeVision to TrueVision's commit `b2aa9151` and keeps it there.")
A("")
A("The rule: **code identity is TrueVision's; app identity is ValeVision's** (K2 rulebook). Folder and file names, exports,")
A("events, CSS names and data keys follow TrueVision; the app token in banners and console prefixes, storage keys that carry")
A("the app's name, routes, hosts and brand values stay ValeVision's. ValeVision differs from TrueVision only at the named seams")
A("(audit R0.3); any other difference is drift and converges to TrueVision.")
A("")
A("Run on the defaults alone, the programme ends with an editor that matches TrueVision's code and behaviour but still differs")
A("on screen in thirteen ways, each removable by an answer or a live action Adam owns (audit R0.1.8). Two are permanent by")
A("design: the lazy loader's cover on a cold first open, and Vale's brand content.")
A("")
A("Out of scope for the ValeVision waves: any TrueVision edit (the TrueVision lane, WT-01 to WT-12, each only with Adam's")
A("approval); live changes to shared Vale infrastructure (the Whitecardopedia service worker, its registrar, the sync pipeline")
A("and the Cloudflare worker are prepared as staged copies for Adam); deploys; live data.")
A("")
A("---")
A("")
A("## 2. The structural divergences, as they stand on 01-Oct-2026")
A("")
A("TrueVision's plan named five on 10-Sep-2026 (its section 2.2). Three remain, permanently; two have closed.")
A("")
A("| DIV | What differs | Status | Where it lives in ValeVision |")
A("| --- | --- | --- | --- |")
A("| DIV-1 | The drawing render path: ValeVision draws through its EffectComposer; TrueVision lays an overlay over a flat render | Permanent | `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` (TrueVision's name and exports, ValeVision's body), `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js`, the dual render engine |")
A("| DIV-2 | The section engine | Permanent | `41__System__CrossSectionView/` (see its README) and `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`; ValeVision's `CrossSection__SceneData` schema is the reference (TrueVision TD06) |")
A("| DIV-3 | Where drawing records live | Closed: both apps own the top-level `LayoutEditor__DrawingsData` block | ValeVision-only keys inside it: `LayoutEditor__DrawingsData__LayoutModeEnabled`, `Elevation__SeededFrom` |")
A("| DIV-4 | The persistence transport | Permanent, and wider after this work | A ValeVision facade at TrueVision's paths (W0-12) over ValeVision's worker and Flask blueprints |")
A("| DIV-5 | The library baseline | Closed: both on three r184 and the same vendor set (TrueVision v2.20.0) | Vendors 05 and 06 land with W0-16; ValeVision-first 07 (PDF.js) |")
A("")
A("---")
A("")
A("## 3. Decisions")
A("")
A("### 3.1 The decision register")
A("")
A("The audit consolidated 363 raw decision points into 44 decisions (DR-01 to DR-44) and raised seven open questions. All are")
A("recorded, with the default each runs on, as D41 to D91 in section 2A of `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`.")
A("Adam had answered none of them when he started the unattended run on 01-Oct-2026, so every one runs on its default; an")
A("answer becomes a dated note on its D-row. The parity ledger's Decisions section marks each of the older D01 to D40 as")
A("current, superseded or permanent.")
A("")
A("### 3.2 This plan's own decisions")
A("")
A("The naming survey behind this plan (audit slice S01) raised sixteen decisions. Each is recorded here with its date and")
A("answer; each was folded into a register decision.")
A("")
A("| Id | Decision (S01) | Register | Answer, 01-Oct-2026 | Where it stands |")
A("| --- | --- | --- | --- | --- |")
for i in range(1, 17):
    k = "D-S01-%02d" % i
    q = RAW[k]["question"]
    drs = SRC2DR.get(k, [])
    dr = drs[0]
    A("| %s | %s | %s (%s) | Default, unanswered: %s | %s |" % (
        k, cell(q), dr, dnum(dr), cell(REG[dr]["default_if_unanswered"]), cell(DONE[k])))
A("")
A("---")
A("")
A("## 4. Target folder map")
A("")
A("TrueVision is the numbering authority. The full number table - every top-level number in TrueVision, ValeVision and")
A("Whitecardopedia, the Layout Editor subfolders, the vendor and asset folders - is `ValeVision__NOTES__FolderNumberRegistry__.md`;")
A("the full map with importer counts is the audit's K2 (`parity/report/K2__TargetMaps.md`, `parity/data/target_folder_map.json`).")
A("")
A("### 4.1 What moved on 01-Oct-2026")
A("")
A("Done in the working tree, staged by `git mv`, not committed. The parity ledger's section 2.2 has the dated old -> new map.")
A("")
A("| Change | From | To | Package |")
A("| --- | --- | --- | --- |")
rep = json.load(open(os.path.join(EV, "execution", "scratch", "W0-02", "renumber_git_report.json"), encoding="utf-8"))
for did, a, b in rep["folder_moves"]:
    A("| %s folder | `%s/` | `%s/` | W0-02 |" % (did, a, b))
for fid, a, b in rep["file_moves"]:
    if fid == "F4":
        b = "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js"
    A("| %s file | `%s` | `%s` | W0-02 |" % (fid, a.replace("02__Src__AppModules/", ""), b.replace("02__Src__AppModules/", "")))
A("| FR-12 file | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | `51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` | W0-03 |")
A("| FR-13 file | `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | `02__AppData/Na__Hotkeys__3dModelTab__.json` | W0-03 |")
A("")
A("Since then 70 drawing files pair with TrueVision by identical relative path (16 in 40, 10 in 42, 8 in 43, 15 in 44, 13 in")
A("45, 8 in 46), so no later port rewrites a folder path. Paths in history documents (this app's devlog, ledger and plans)")
A("stay as they were written.")
A("")
A("### 4.2 What is still to come")
A("")
A("| Folder | TrueVision's | Lands in ValeVision with | Note |")
A("| --- | --- | --- | --- |")
TOP_COMING = [
    ("27", "27__System__ContextMenuSystem", "W4-11", "the menu renderer only (DR-44)"),
    ("47", "47__System__DrawingPlanes", "W2-40 (leaves), W2-01", "Drawing Planes"),
    ("48", "48__System__CrossSectionViews", "W2-05", "TrueVision's 0.1.0 placeholder, byte for byte, after ValeVision renames its own gate ids (DR-26)"),
    ("49", "49__System__ElevationDepthFog", "W1-09 (leaves), W2-03", "Elevation Depth Fog (DR-15)"),
    ("52", "52__System__Layout__PublishedDocuments", "W4-17, W4-02, W4-09", "the published reader (DR-22)"),
    ("53", "53__Data__Layout__PublishedSchema", "W4-01", "the published schema (DR-22)"),
    ("54", "54__Feature__ColourPalette", "W1-37", "under a Vale palette name (DR-20)"),
    ("55", "55__Feature__SpellCheck", "W2-34", "with the Vale dictionary (DR-20)"),
    ("80", "80__CloudflareIntegration", "W0-12", "the client facade only, ValeVision body (DR-27); TrueVision's worker folder never comes"),
]
for n, name, pk, note in TOP_COMING:
    A("| %s | `%s/` | %s | %s |" % (n, name, pk, note))
LE_COMING = [
    ("21__System__SitePlanData", "W2-14", "dormant until Vale site data exists (DR-08)"),
    ("26__System__DraftMode", "W2-18", ""), ("27__System__DrawingGrid", "W2-18, W3-05", ""),
    ("28__System__ObjectSnap", "W2-42, W2-19", "replaces `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (FR-14, FR-15)"),
    ("31__System__DocumentKeys", "W1-30", ""), ("32__System__OrthoMode", "W2-18", ""), ("33__System__DrawingAxes", "W2-18", ""),
    ("36__System__HatchPatternTools", "W1-17, W2-29", "with the app-root hatch library (DR-19)"),
    ("37__System__VectorTools", "W2-27, W2-28, W2-41, W3-07", "DR-18"),
    ("51__Feature__DrawingRegister", "W4-18, W4-10", "DR-11"),
    ("52__Feature__StatementWriter", "W4-04 to W4-16", "switched off (DR-10)"),
    ("53__Feature__ProjectQrCode", "W1-15", "switched off (DR-12)"),
    ("54__Feature__SheetImages", "W1-16, W3-02, W3-18, W3-09", "DR-13"),
    ("58__Feature__ScrapbookSpecification", "W2-35", ""), ("59__Feature__FloorAreas", "W1-27, W3-10", "DR-14"),
    ("65__Feature__DocumentPublishing", "W4-03, W4-07", "DR-22"), ("66__Feature__DocumentSharing", "W4-07, W4-08", "DR-23"),
]
for name, pk, note in LE_COMING:
    A("| LE/%s | `51__System__LayoutEditor/%s/` | %s | %s |" % (name[:2], name, pk, note or "-"))
A("| app root | `50__ValeVision__UserConfig/` (TrueVision `50__TrueVision__UserConfig/`) | W0-18 | the Vale spelling dictionary |")
A("| app root | `52__LayoutEditor__HatchPatternLibrary/` | W1-17 | both hatch packs (DR-19) |")
A("| assets | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/` | W0-16 | Vale's own Classic scan, never TrueVision's |")
A("| vendors | `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/`, `06__Vendor__Html2Canvas__v1.4.1/`, `07__Vendor__PdfJs__v3.11.174/` | W0-16 | 07 is ValeVision-first |")
A("")
A("New content beside a project's `project.json` takes TrueVision's relative folder names inside ValeVision's own prefix:")
A("`05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` (DR-29). Nothing is written into")
A("them on R2 until Adam has applied the sync fix (W0-07) and deployed worker 1.6.0 (W0-10).")
A("")
A("### 4.3 Renames, moves and retirements (K2 FR-01 to FR-25)")
A("")
A("| Id | Kind | ValeVision now (or before) | Target | Package | State on 01-Oct-2026 |")
A("| --- | --- | --- | --- | --- | --- |")
for r in frm:
    fid = r["id"]
    st = "done (working tree, not committed)" if fid in FR_DONE else ("held (hard gate)" if PK.get(FR_PKG[fid], {}).get("hard_gate") else "pending")
    tgt = r.get("target_vv") or "- (retired)"
    cur = r.get("current_vv") or "- (new file)"
    A("| %s | %s | `%s` | %s | %s | %s |" % (fid, r["kind"], cell(cur.replace("02__Src__AppModules/", "")),
                                          ("`" + cell(tgt.replace("02__Src__AppModules/", "")) + "`") if r.get("target_vv") else tgt,
                                          FR_PKG[fid], st))
A("")
A("FR-01 to FR-11 ran as one scripted change (`k2_renumber_apply.py --mode git`, W0-02) and are never hand-edited. FR-21, FR-22")
A("and FR-25 wait for Adam to confirm the user-visible removals (DR-03); FR-22 runs only if he asks.")
A("")
A("---")
A("")
A("## 5. Progress ledger (dated snapshot)")
A("")
A("**Where the live record is.** What is DONE is recorded by each wave's Parity Scribe in the parity ledger (its Module Register")
A("and Release Watermark) and in the devlog. Wave and package status is in `ValeVision__WORKING_MEMORY__TrueVisionParity__.md`")
A("(from `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/execution_state.json`). Each package's Port Record is in")
A("`.../execution/port_records/`, and each wave's checkpoint (a patch against `7b4e593a` for Adam to review and commit) in")
A("`.../execution/checkpoints/`. This section is a snapshot taken when this document was written and is refreshed only by a")
A("dated note.")
A("")
A("### 5.1 The waves")
A("")
A("| Wave | What it does | Packages | On 01-Oct-2026 |")
A("| --- | --- | --- | --- |")
WAVES = [
    ("W0", "Foundations: decision record and swarm rules, the scripted renumber, hotkey names, the gates, the records, the transport (Flask, worker, facade, loader helpers), the Layout Editor config foundation, vendor copies, sync safety and the shared service-worker package (prepared)"),
    ("W1", "Core data and hubs: render-loop overlays, ProjectData and AutoSave over the facade, record and model leaves, SheetRecords and SheetModel, chrome and paint order, keyboards, the loader facade, the mode-controller core, veil, header fold and tab strip"),
    ("W2", "Subsystems: drawing planes, fog, folder 50, render styles, linework modifiers, site-plan leaves (dormant), drafting modules, object snap, measurements, grips, vector units (inert), the specification lockstep, the parametric engine"),
    ("W3", "The SheetTools hub around Sheet Images, then the features switched on: drafting aids, rotation, vector tools, Sheet Images, Floor Areas, regions, panels, the PdfExporter re-sync"),
    ("W4", "Documents: published schema and reader, publisher, sharing, the published-only web viewer, the Drawing Register, and the Statement Writer last, switched off"),
    ("W5", "Convergence: the toolbar taken whole, stylesheet and mode-controller checks, and the decision-gated packages"),
    ("W6", "Close-out: legacy retirements, the test sweep, the shared service-worker refresh and the final records pass"),
    ("WT", "The TrueVision lane: back-ports and record fixes in TrueVision, each only with Adam's approval"),
]
for w, what in WAVES:
    pk = [p for p in wpc["packages"] if p["wave"] == w]
    held = [p["wp_id"] for p in pk if state["packages"].get(p["wp_id"], {}).get("status") == "held"]
    st = state["waves"].get(w, {}).get("status", "-")
    A("| %s | %s | %d%s | %s |" % (w, what, len(pk), (" (held: " + ", ".join(held) + ")") if held else "", st))
A("")
A("### 5.2 Wave 0, package by package")
A("")
A("Port Records present when this was written: %s. The orchestrator's working memory has the live status." % (", ".join(records) or "none"))
A("")
A("| Package | Title | Port Record when this was written |")
A("| --- | --- | --- |")
for p in [p for p in wpc["packages"] if p["wave"] == "W0"]:
    A("| %s | %s | %s |" % (p["wp_id"], cell(p["title"]), "yes" if p["wp_id"] in records else ("this package" if p["wp_id"] == "W0-06" else "not yet")))
A("")
A("---")
A("")
A("## 6. Risks")
A("")
A("The audit's top risks (R0.1.7), in one line each, with what holds them:")
A("")
A("1. **Live R2 data loss** - the Whitecardopedia sync purges project subfolders on R2: no package writes new pictures there until Adam applies W0-07's prepared fix (DR-06).")
A("2. **The first deploy** - one service-worker token for shell, thumbnails, data and models, and a registrar that reloads over unsaved work: W0-08's package is prepared, nothing is bumped, Adam bumps at deploy (DR-07). Do not deploy the renumber without it.")
A("3. **TrueVision's transport in ValeVision** - its worker authorises nothing and both workers share the bucket: ported modules reach storage only through ValeVision's facade (DR-27, gate G6).")
A("4. **Whole-file ports deleting ValeVision behaviour** - VV-only exports, DIV-1 seams, VV-ahead features: the named seams of audit R0.3, each in its file's PORT NOTE, and the port-order map (W0-05).")
A("5. **Untried TrueVision behaviour and NA content reaching Vale users** - unconfirmed releases are named in every devlog entry, the four gesture changes are held (DR-40), and NA-only features land switched off (DR-43).")
A("")
doc = "\n".join(L) + "\n"
bad = sorted(set(c for c in doc if ord(c) > 127))
if bad:
    print("NON-ASCII", bad)
    sys.exit(1)
print("lines", len(L), "bytes", len(doc))
if "--write" in sys.argv:
    open(OUT, "wb").write(doc.encode("ascii"))
    print("written", OUT)
