# ValeVision 3D - TrueVision Re-Alignment: Drawing Systems, Projected Linework, Layout Editor

**Status**: Wave 0 under way (01-Oct-2026). ValeVision's drawing folders carry TrueVision's numbers (W0-02) and its hotkey
files TrueVision's names (W0-03), in the working tree; the records are restructured (W0-06). Nothing is committed yet.
**Created**: 01-Oct-2026
**Owner**: Adam Noble
**Source**: TrueVision3D v2.172.0, commit `b2aa9151` (30-Sep-2026), read only at that commit. **Base**: ValeVision3D v2.71.0, commit `7b4e593a`.

**Companion documents**
- `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` (TrueVision's root) - TrueVision's plan of 10-Sep-2026 for the
  first direction, ValeVision into TrueVision. This document is its mirror for the return direction and takes its name with
  the app tokens swapped (K2 rulebook F8). TrueVision's own document is not edited by this work (DR-36, D76).
- `ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` and `ValeVision__AUDIT__TrueVisionParity__Evidence__/` - the
  parity audit of 01-Oct-2026: findings, the decision register (K1), the naming rules and target maps (K2), the work
  packages (K3) and the delegation plan (Section F). It is the plan of record; this document summarises it for
  ValeVision and records where it stands.
- `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` - the outbound port plan of 09-Sep-2026 (D01 to D40) and, in its
  section 2A, every decision of this alignment (D41 to D91), each on its default until Adam answers.
- `ValeVision__PARITY__TrueVisionLedger__.md` - the parity ledger: Module Register, Release Watermark, back-ports. It is the
  record of what is done.
- `ValeVision__NOTES__FolderNumberRegistry__.md` - every folder number, and who may use it.
- `ValeVision__WORKING_MEMORY__TrueVisionParity__.md` - the live hand-off file for agents (wave and package status).

---

## 0. How to read this document

Read sections 1 to 4 for the design and section 5 for where the work stands. Sections 1 to 4 change only by a dated note
beside what they revise (the house convention of both apps' plans). Section 5 is a dated snapshot; the live state is in the
parity ledger and the working memory, which are kept by the programme's Parity Scribe and orchestrator.

---

## 1. End goal

On 01-Oct-2026 Adam asked for ValeVision's drawing system and Layout Editor to be aligned exactly with TrueVision 3D - an
identical Drawing Layout Editor experience - while ValeVision keeps its own R2 worker (`whitecardopedia-editor-api`),
its Flask server (`WebApps/Whitecardopedia/server.py`) and its storage under `VaApps/Projects/{folderId}/`. The two apps
are developed together for different clients: Vale Garden Houses and Noble Architecture.

TrueVision is now the lead. ValeVision built the drawing system first (v2.16.0 to v2.21.x, 09 to 11-Sep-2026) and
TrueVision took it in (its v2.20.0 to v2.24.0). From 12-Sep TrueVision authored and ValeVision followed, usually within
hours, up to TrueVision v2.85.0 (ValeVision v2.68.0, 20-Sep). TrueVision then shipped 88 releases, v2.86.0 to v2.172.0,
that ValeVision has none of. This plan brings ValeVision to TrueVision's commit `b2aa9151` and keeps it there.

The rule: **code identity is TrueVision's; app identity is ValeVision's** (K2 rulebook). Folder and file names, exports,
events, CSS names and data keys follow TrueVision; the app token in banners and console prefixes, storage keys that carry
the app's name, routes, hosts and brand values stay ValeVision's. ValeVision differs from TrueVision only at the named seams
(audit R0.3); any other difference is drift and converges to TrueVision.

Run on the defaults alone, the programme ends with an editor that matches TrueVision's code and behaviour but still differs
on screen in thirteen ways, each removable by an answer or a live action Adam owns (audit R0.1.8). Two are permanent by
design: the lazy loader's cover on a cold first open, and Vale's brand content.

Out of scope for the ValeVision waves: any TrueVision edit (the TrueVision lane, WT-01 to WT-12, each only with Adam's
approval); live changes to shared Vale infrastructure (the Whitecardopedia service worker, its registrar, the sync pipeline
and the Cloudflare worker are prepared as staged copies for Adam); deploys; live data.

---

## 2. The structural divergences, as they stand on 01-Oct-2026

TrueVision's plan named five on 10-Sep-2026 (its section 2.2). Three remain, permanently; two have closed.

| DIV | What differs | Status | Where it lives in ValeVision |
| --- | --- | --- | --- |
| DIV-1 | The drawing render path: ValeVision draws through its EffectComposer; TrueVision lays an overlay over a flat render | Permanent | `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` (TrueVision's name and exports, ValeVision's body), `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js`, the dual render engine |
| DIV-2 | The section engine | Permanent | `41__System__CrossSectionView/` (see its README) and `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`; ValeVision's `CrossSection__SceneData` schema is the reference (TrueVision TD06) |
| DIV-3 | Where drawing records live | Closed: both apps own the top-level `LayoutEditor__DrawingsData` block | ValeVision-only keys inside it: `LayoutEditor__DrawingsData__LayoutModeEnabled`, `Elevation__SeededFrom` |
| DIV-4 | The persistence transport | Permanent, and wider after this work | A ValeVision facade at TrueVision's paths (W0-12) over ValeVision's worker and Flask blueprints |
| DIV-5 | The library baseline | Closed: both on three r184 and the same vendor set (TrueVision v2.20.0) | Vendors 05 and 06 land with W0-16; ValeVision-first 07 (PDF.js) |

---

## 3. Decisions

### 3.1 The decision register

The audit consolidated 363 raw decision points into 44 decisions (DR-01 to DR-44) and raised seven open questions. All are
recorded, with the default each runs on, as D41 to D91 in section 2A of `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`.
Adam had answered none of them when he started the unattended run on 01-Oct-2026, so every one runs on its default; an
answer becomes a dated note on its D-row. The parity ledger's Decisions section marks each of the older D01 to D40 as
current, superseded or permanent.

### 3.2 This plan's own decisions

The naming survey behind this plan (audit slice S01) raised sixteen decisions. Each is recorded here with its date and
answer; each was folded into a register decision.

| Id | Decision (S01) | Register | Answer, 01-Oct-2026 | Where it stands |
| --- | --- | --- | --- | --- |
| D-S01-01 | Renumber VV's drawing folders to TV's numbers (42-47 -> 40-46) as one release, before any further TV->VV port? This supersedes VV plan D05. | DR-02 (D42) | Default, unanswered: (a), as the first package of Wave 0, by one agent, gated by Na__Verify__ModuleGraph__ and Na__Verify__Exports__ plus Adam's smoke checklist; no other package edits VV 40-49 until it has landed. It is a local, git-reversible VV move. If Adam reads 'file structure' as the source tree, switch to (b) and every 40-49 port carries the S09 path-translation step. | Applied in the working tree by W0-02 on 01-Oct-2026 (`git mv`, not committed): 42 -> 40, 43 -> 42, 44 -> 43, 45 -> 44, 46 -> 45, 47 -> 46. Gates G1, G2, G3 passed |
| D-S01-02 | What happens to the legacy tools 40__System__2dElevationsView (Tools-menu Elevation View) and 35__System__PageLayoutSystem (Create Drawing / Layout View)? | DR-03 (D43) | Default, unanswered: (a), registry (i), 62 unchanged. | Legacy 40 moved to 91 by W0-02; 35 stays live and reserved. Both retire in W6-03, held until Adam confirms the removals |
| D-S01-03 | Give VV TV's transport module paths and export names, 80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js and 03__AppUtils/Na__AppUtils__LocalProjectMirror__.js, with VV bodies over whitecardopedia-editor-api and WCP/server.py? | DR-27 (D67) | Default, unanswered: (A), S12 owns, with the specification-lockstep interim as above. | W0-12 builds the facade at TrueVision's paths with ValeVision bodies (W0 wave) |
| D-S01-04 | Offer TV small back-ports that remove recurring seams? | DR-42 (D82) | Default, unanswered: None happen; VV carries the seams (S01-F42's list; S06a-F38's interim adapted panel). | No offer is made on the default; ValeVision carries every seam (WT-10, WT-11 held) |
| D-S01-05 | Keep a shared folder-number registry (both repos) that reserves VV-only numbers 28, 29, 31, 35, 60, 61, 63, 64, 69, 71 and the 9x band, so TV never takes them? | DR-03 (D43) | Default, unanswered: (a), registry (i), 62 unchanged. | Done: `ValeVision__NOTES__FolderNumberRegistry__.md` (W0-06), with Q-REG's TrueVision-growth numbers; the TrueVision twin waits for WT-08 (held) |
| D-S01-06 | Rename VV Na__DrawView__ComposerPreset__.js to Na__DrawView__RenderPreset__.js (exports Na__DrawView__RenderPreset__*) while keeping its composer body (DIV-1)? | DR-04 (D44) | Default, unanswered: All three in VV inside WP-S01-01R; no TV change; the WCP precache line is updated later by the DR-07 package. | Done by W0-02: `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`, eight exports renamed, composer body kept (DIV-1) |
| D-S01-07 | Move VV's Na__RenderEffect__DistanceCulling__.js from 05/02__Engine__MaxEngine/ to TV's path 05/? | DR-04 (D44) | Default, unanswered: All three in VV inside WP-S01-01R; no TV change; the WCP precache line is updated later by the DR-07 package. | Done by W0-02: `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js`; the shared worker's precache line is corrected only in W0-08's staged package |
| D-S01-08 | VV 62__Feature__EmailWorkers sits on TV's and WCP's AppInstallability number. Move it? | DR-03 (D43) | Default, unanswered: (a), registry (i), 62 unchanged. | Unchanged: 62 stays (nominal collision recorded in the registry); 92 only on request (W6-03) |
| D-S01-09 | What should VV's section-engine folder be called? | DR-26 (D66) | Default, unanswered: As recommended. | Name kept; `41__System__CrossSectionView/README__CrossSectionView__.md` names the twins (W0-06) |
| D-S01-10 | What does VV use in place of the NA public URLs and brand blocks in TV config: the QR /q/ base, the Share /s/ base, the statement stylesheet URL, the NA letterhead and logo, and the 'TrueVision 3D Project Hub' section? | DR-43 (D83) | Default, unanswered: NA-only features off; strings in config with Vale values; Hub excluded; Standard Scrapbook empty; Custom Scrapbook not seeded; Vale's own Classic scan copied. | NA-only features land switched off; Vale values in config (W1-15, W1-22, W4-08, W4-12 and others) |
| D-S01-11 | Keep VV's Layout Mode switch (the editor is offered only while it is on), or adopt TV's rule (the tab strip shows whenever the project has a sheet)? | DR-25 (D65) | Default, unanswered: (a). | The switch stays as a recorded divergence; re-decided at the publishing port (W4-09); retirement is W5-07, held |
| D-S01-12 | As VV ports land, should the swarm also update TV-side PORT NOTE lines ('ValeVision : not yet ported' in 126 TV files), the stale TV WebViewer notes, and the TV plan and ledger rows? | DR-36 (D76) | Default, unanswered: (a). | TrueVision is not edited. The TrueVision-side notes are drafted in the parity ledger's section 7 for WT-08 (held) |
| D-S01-13 | Where does VV's legacy 40__System__2dElevationsView go, and where does Na__RenderEffect__2dProfileLines__.js go? S01 and S02a disagree. | DR-03 (D43) | Default, unanswered: (a), registry (i), 62 unchanged. | Done by W0-02: 91 and `05__RenderPipeline/` (FR-01, FR-08) |
| D-S01-14 | Design phases: VV has no modelGroups; TV's Model Source, PhaseLibrary and phase staging assume them. What does VV do? | DR-09 (D49) | Default, unanswered: (a). | PhaseLibrary lands verbatim and uninitialised (W1-01); Model Source dormant (W2-16) |
| D-S01-15 | The renumber reverses VV plan D05 and TV plan section 4 ('folder number translated (4.1)') and 4.1 ('Fixed for the whole of this work'). Confirm it, and confirm that 'its own R2 Worker and file structure' in the brief means VV's storage layout (VaApps/Projects/<folderId>/project.json), not its source tree. | DR-02 (D42) | Default, unanswered: (a), as the first package of Wave 0, by one agent, gated by Na__Verify__ModuleGraph__ and Na__Verify__Exports__ plus Adam's smoke checklist; no other package edits VV 40-49 until it has landed. It is a local, git-reversible VV move. If Adam reads 'file structure' as the source tree, switch to (b) and every 40-49 port carries the S09 path-translation step. | Confirmed by the default and applied by W0-02; 'file structure' read as VV's storage layout (VaApps/Projects/<folderId>/), which does not change |
| D-S01-16 | TV's web viewer (LE/80) now shows only published files and imports 52 PubDoc; VV's still renders live. Which does VV's public site use? | DR-22 (D62) | Default, unanswered: (a), scheduled after its prerequisites; VV's live viewer stays until then. | Published-only viewer in Wave 4 after its prerequisites (W4-01 to W4-09); VV's live viewer stays until then |

---

## 4. Target folder map

TrueVision is the numbering authority. The full number table - every top-level number in TrueVision, ValeVision and
Whitecardopedia, the Layout Editor subfolders, the vendor and asset folders - is `ValeVision__NOTES__FolderNumberRegistry__.md`;
the full map with importer counts is the audit's K2 (`parity/report/K2__TargetMaps.md`, `parity/data/target_folder_map.json`).

### 4.1 What moved on 01-Oct-2026

Done in the working tree, staged by `git mv`, not committed. The parity ledger's section 2.2 has the dated old -> new map.

| Change | From | To | Package |
| --- | --- | --- | --- |
| D1 folder | `40__System__2dElevationsView/` | `91__System__2dElevationsView/` | W0-02 |
| D2 folder | `42__System__DrawingViewCore/` | `40__System__DrawingViewCore/` | W0-02 |
| D3 folder | `43__System__FloorPlanViews/` | `42__System__FloorPlanViews/` | W0-02 |
| D4 folder | `44__System__PlanAnnotations/` | `43__System__PlanAnnotations/` | W0-02 |
| D5 folder | `45__System__PlanDimensions/` | `44__System__PlanDimensions/` | W0-02 |
| D6 folder | `46__System__ElevationViews/` | `45__System__ElevationViews/` | W0-02 |
| D7 folder | `47__System__NorthDirection/` | `46__System__NorthDirection/` | W0-02 |
| F1 file | `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js` | `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` | W0-02 |
| F2 file | `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` | `03__AppUtils/Na__AppUtils__SnapshotHistory.js` | W0-02 |
| F3 file | `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` | `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js` | W0-02 |
| F4 file | `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js` | `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | W0-02 |
| FR-12 file | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | `51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` | W0-03 |
| FR-13 file | `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | `02__AppData/Na__Hotkeys__3dModelTab__.json` | W0-03 |

Since then 70 drawing files pair with TrueVision by identical relative path (16 in 40, 10 in 42, 8 in 43, 15 in 44, 13 in
45, 8 in 46), so no later port rewrites a folder path. Paths in history documents (this app's devlog, ledger and plans)
stay as they were written.

### 4.2 What is still to come

| Folder | TrueVision's | Lands in ValeVision with | Note |
| --- | --- | --- | --- |
| 27 | `27__System__ContextMenuSystem/` | W4-11 | the menu renderer only (DR-44) |
| 47 | `47__System__DrawingPlanes/` | W2-40 (leaves), W2-01 | Drawing Planes |
| 48 | `48__System__CrossSectionViews/` | W2-05 | TrueVision's 0.1.0 placeholder, byte for byte, after ValeVision renames its own gate ids (DR-26) |
| 49 | `49__System__ElevationDepthFog/` | W1-09 (leaves), W2-03 | Elevation Depth Fog (DR-15) |
| 52 | `52__System__Layout__PublishedDocuments/` | W4-17, W4-02, W4-09 | the published reader (DR-22) |
| 53 | `53__Data__Layout__PublishedSchema/` | W4-01 | the published schema (DR-22) |
| 54 | `54__Feature__ColourPalette/` | W1-37 | under a Vale palette name (DR-20) |
| 55 | `55__Feature__SpellCheck/` | W2-34 | with the Vale dictionary (DR-20) |
| 80 | `80__CloudflareIntegration/` | W0-12 | the client facade only, ValeVision body (DR-27); TrueVision's worker folder never comes |
| LE/21 | `51__System__LayoutEditor/21__System__SitePlanData/` | W2-14 | dormant until Vale site data exists (DR-08) |
| LE/26 | `51__System__LayoutEditor/26__System__DraftMode/` | W2-18 | - |
| LE/27 | `51__System__LayoutEditor/27__System__DrawingGrid/` | W2-18, W3-05 | - |
| LE/28 | `51__System__LayoutEditor/28__System__ObjectSnap/` | W2-42, W2-19 | replaces `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (FR-14, FR-15) |
| LE/31 | `51__System__LayoutEditor/31__System__DocumentKeys/` | W1-30 | - |
| LE/32 | `51__System__LayoutEditor/32__System__OrthoMode/` | W2-18 | - |
| LE/33 | `51__System__LayoutEditor/33__System__DrawingAxes/` | W2-18 | - |
| LE/36 | `51__System__LayoutEditor/36__System__HatchPatternTools/` | W1-17, W2-29 | with the app-root hatch library (DR-19) |
| LE/37 | `51__System__LayoutEditor/37__System__VectorTools/` | W2-27, W2-28, W2-41, W3-07 | DR-18 |
| LE/51 | `51__System__LayoutEditor/51__Feature__DrawingRegister/` | W4-18, W4-10 | DR-11 |
| LE/52 | `51__System__LayoutEditor/52__Feature__StatementWriter/` | W4-04 to W4-16 | switched off (DR-10) |
| LE/53 | `51__System__LayoutEditor/53__Feature__ProjectQrCode/` | W1-15 | switched off (DR-12) |
| LE/54 | `51__System__LayoutEditor/54__Feature__SheetImages/` | W1-16, W3-02, W3-18, W3-09 | DR-13 |
| LE/58 | `51__System__LayoutEditor/58__Feature__ScrapbookSpecification/` | W2-35 | - |
| LE/59 | `51__System__LayoutEditor/59__Feature__FloorAreas/` | W1-27, W3-10 | DR-14 |
| LE/65 | `51__System__LayoutEditor/65__Feature__DocumentPublishing/` | W4-03, W4-07 | DR-22 |
| LE/66 | `51__System__LayoutEditor/66__Feature__DocumentSharing/` | W4-07, W4-08 | DR-23 |
| app root | `50__ValeVision__UserConfig/` (TrueVision `50__TrueVision__UserConfig/`) | W0-18 | the Vale spelling dictionary |
| app root | `52__LayoutEditor__HatchPatternLibrary/` | W1-17 | both hatch packs (DR-19) |
| assets | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/` | W0-16 | Vale's own Classic scan, never TrueVision's |
| vendors | `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/`, `06__Vendor__Html2Canvas__v1.4.1/`, `07__Vendor__PdfJs__v3.11.174/` | W0-16 | 07 is ValeVision-first |

New content beside a project's `project.json` takes TrueVision's relative folder names inside ValeVision's own prefix:
`05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` (DR-29). Nothing is written into
them on R2 until Adam has applied the sync fix (W0-07) and deployed worker 1.6.0 (W0-10).

### 4.3 Renames, moves and retirements (K2 FR-01 to FR-25)

| Id | Kind | ValeVision now (or before) | Target | Package | State on 01-Oct-2026 |
| --- | --- | --- | --- | --- | --- |
| FR-01 | move | `40__System__2dElevationsView/` | `91__System__2dElevationsView/` | W0-02 | done (working tree, not committed) |
| FR-02 | move | `42__System__DrawingViewCore/` | `40__System__DrawingViewCore/` | W0-02 | done (working tree, not committed) |
| FR-03 | move | `43__System__FloorPlanViews/` | `42__System__FloorPlanViews/` | W0-02 | done (working tree, not committed) |
| FR-04 | move | `44__System__PlanAnnotations/` | `43__System__PlanAnnotations/` | W0-02 | done (working tree, not committed) |
| FR-05 | move | `45__System__PlanDimensions/` | `44__System__PlanDimensions/` | W0-02 | done (working tree, not committed) |
| FR-06 | move | `46__System__ElevationViews/` | `45__System__ElevationViews/` | W0-02 | done (working tree, not committed) |
| FR-07 | move | `47__System__NorthDirection/` | `46__System__NorthDirection/` | W0-02 | done (working tree, not committed) |
| FR-08 | move | `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js` | `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` | W0-02 | done (working tree, not committed) |
| FR-09 | rename | `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js` | `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | W0-02 | done (working tree, not committed) |
| FR-10 | rename | `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` | `03__AppUtils/Na__AppUtils__SnapshotHistory.js` | W0-02 | done (working tree, not committed) |
| FR-11 | move | `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` | `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js` | W0-02 | done (working tree, not committed) |
| FR-12 | rename | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | `51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` | W0-03 | done (working tree, not committed) |
| FR-13 | rename | `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | `02__AppData/Na__Hotkeys__3dModelTab__.json` | W0-03 | done (working tree, not committed) |
| FR-14 | shim | `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | W2-19 | pending |
| FR-15 | retire | `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | - (retired) | W3-08 | pending |
| FR-16 | shim | `- (new file)` | `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` | W0-12 | pending |
| FR-17 | shim | `- (new file)` | `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` | W0-12 | pending |
| FR-18 | retire | `03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | - (retired) | W2-33 | pending |
| FR-19 | move | `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js` | `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` | W0-16 | pending |
| FR-20 | move | `35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png` | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` | W0-16 | pending |
| FR-21 | retire | `35__System__PageLayoutSystem/` | - (retired) | W6-03 | held (hard gate) |
| FR-22 | move | `62__Feature__EmailWorkers/` | `92__Feature__EmailWorkers/` | W6-03 | held (hard gate) |
| FR-23 | retire | `04__Lib__ThirdParty__Three/` | - (retired) | W6-03 | held (hard gate) |
| FR-24 | move | `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css (lines 969-1239, REGION "Scene Inspector - Dev Tools Panel")` | `03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css` | W5-04 | held (hard gate) |
| FR-25 | retire | `91__System__2dElevationsView/ (after FR-01)` | - (retired) | W6-03 | held (hard gate) |

FR-01 to FR-11 ran as one scripted change (`k2_renumber_apply.py --mode git`, W0-02) and are never hand-edited. FR-21, FR-22
and FR-25 wait for Adam to confirm the user-visible removals (DR-03); FR-22 runs only if he asks.

---

## 5. Progress ledger (dated snapshot)

**Where the live record is.** What is DONE is recorded by each wave's Parity Scribe in the parity ledger (its Module Register
and Release Watermark) and in the devlog. Wave and package status is in `ValeVision__WORKING_MEMORY__TrueVisionParity__.md`
(from `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/execution_state.json`). Each package's Port Record is in
`.../execution/port_records/`, and each wave's checkpoint (a patch against `7b4e593a` for Adam to review and commit) in
`.../execution/checkpoints/`. This section is a snapshot taken when this document was written and is refreshed only by a
dated note.

### 5.1 The waves

| Wave | What it does | Packages | On 01-Oct-2026 |
| --- | --- | --- | --- |
| W0 | Foundations: decision record and swarm rules, the scripted renumber, hotkey names, the gates, the records, the transport (Flask, worker, facade, loader helpers), the Layout Editor config foundation, vendor copies, sync safety and the shared service-worker package (prepared) | 20 | running |
| W1 | Core data and hubs: render-loop overlays, ProjectData and AutoSave over the facade, record and model leaves, SheetRecords and SheetModel, chrome and paint order, keyboards, the loader facade, the mode-controller core, veil, header fold and tab strip | 39 | pending |
| W2 | Subsystems: drawing planes, fog, folder 50, render styles, linework modifiers, site-plan leaves (dormant), drafting modules, object snap, measurements, grips, vector units (inert), the specification lockstep, the parametric engine | 44 | pending |
| W3 | The SheetTools hub around Sheet Images, then the features switched on: drafting aids, rotation, vector tools, Sheet Images, Floor Areas, regions, panels, the PdfExporter re-sync | 19 (held: W3-04) | pending |
| W4 | Documents: published schema and reader, publisher, sharing, the published-only web viewer, the Drawing Register, and the Statement Writer last, switched off | 19 | pending |
| W5 | Convergence: the toolbar taken whole, stylesheet and mode-controller checks, and the decision-gated packages | 8 (held: W5-04, W5-05, W5-06, W5-07) | pending |
| W6 | Close-out: legacy retirements, the test sweep, the shared service-worker refresh and the final records pass | 4 (held: W6-03) | pending |
| WT | The TrueVision lane: back-ports and record fixes in TrueVision, each only with Adam's approval | 12 (held: WT-01, WT-02, WT-03, WT-04, WT-05, WT-06, WT-07, WT-08, WT-09, WT-10, WT-11, WT-12) | held |

### 5.2 Wave 0, package by package

Port Records present when this was written: W0-01, W0-02, W0-03, W0-05, W0-06, W0-07, W0-08, W0-09, W0-11, W0-17. The orchestrator's working memory has the live status.

| Package | Title | Port Record when this was written |
| --- | --- | --- |
| W0-01 | Decision record and swarm rules published | yes |
| W0-02 | Drawing-folder renumber to TV numbers (atomic, scripted, alone) | yes |
| W0-03 | Hotkey file names (name only) and identity hygiene | yes |
| W0-04 | Swarm gates: naming lint, port-note verifier, UI parity gate, loader-stylesheet test, harness fixes | not yet |
| W0-05 | Port-order map from TV's import graph (leaves first, hubs last) | yes |
| W0-06 | Ledger restructure, folder-number registry and records hygiene | yes |
| W0-07 | Whitecardopedia sync pipeline safety (prepared, dry-run; Adam applies) | yes |
| W0-08 | Shared Whitecardopedia service-worker package (prepared, not bumped) | yes |
| W0-09 | Flask persistence core and shared helper | yes |
| W0-10 | VV worker 1.6.0: project GET, merge-keys and the guarded project-files family (built under wrangler dev; Adam deploys) | not yet |
| W0-11 | ProjectLoader identity helpers and the localhost repository fallback | yes |
| W0-12 | VV transport facade at TV's paths: Na__CfApi and Na__LocalMirror (VV bodies) | not yet |
| W0-13 | Loading-sequence transport wiring, the editor-owned overlay and na-app-scene-ready | not yet |
| W0-14 | Asset upload contract, VV-gated asset modules and TV's thumbnail call shape | not yet |
| W0-15 | Layout Editor config foundation: AppConfig additive pass, ConfigState units and KeyMap 1.11.0 with TV key content | not yet |
| W0-16 | Vendor and asset copies: jsPDF 4.1.0, html2canvas 1.4.1, PDF.js 3.11.174, Vale's Classic title-block scan | not yet |
| W0-17 | index.html start-up order aligned with TrueVision | yes |
| W0-18 | Flask blueprints and app-root content: sheet images and user config (spellings) | not yet |
| W0-19 | Flask blueprints: published documents and statements; .gitignore and .gitattributes for both | not yet |
| W0-99 | Parity Scribe pass for Wave 0 | not yet |

---

## 6. Risks

The audit's top risks (R0.1.7), in one line each, with what holds them:

1. **Live R2 data loss** - the Whitecardopedia sync purges project subfolders on R2: no package writes new pictures there until Adam applies W0-07's prepared fix (DR-06).
2. **The first deploy** - one service-worker token for shell, thumbnails, data and models, and a registrar that reloads over unsaved work: W0-08's package is prepared, nothing is bumped, Adam bumps at deploy (DR-07). Do not deploy the renumber without it.
3. **TrueVision's transport in ValeVision** - its worker authorises nothing and both workers share the bucket: ported modules reach storage only through ValeVision's facade (DR-27, gate G6).
4. **Whole-file ports deleting ValeVision behaviour** - VV-only exports, DIV-1 seams, VV-ahead features: the named seams of audit R0.3, each in its file's PORT NOTE, and the port-order map (W0-05).
5. **Untried TrueVision behaviour and NA content reaching Vale users** - unconfirmed releases are named in every devlog entry, the four gesture changes are held (DR-40), and NA-only features land switched off (DR-43).

