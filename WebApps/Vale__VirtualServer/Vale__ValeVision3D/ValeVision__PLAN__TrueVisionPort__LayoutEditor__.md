# ValeVision 3D - TrueVision Drawing Systems Port and Layout Editor

**Plan for review. Nothing has been built yet.**
Target versions: `v2.16.0` (Phase 0) through `v2.21.0` (Phase 5)
Author: Adam Noble - Noble Architecture
Date: 09-Sep-2026
Parity target: TrueVision 3D `v2.19.0` (07-Sep-2026)

**Status, 01-Oct-2026 (dated note; the lines above are kept as written).** Built: Phases 0 to 5 shipped as ValeVision3D v2.16.0 to v2.21.x on 09 to 11-Sep-2026, and the return trips that followed (v2.22.0 to v2.70.0) tracked TrueVision up to its v2.85.0. The parity target is now TrueVision 3D v2.172.0 (commit `b2aa9151`): the alignment Adam asked for on 01-Oct-2026, recorded in section 2A (D41 to D91) and worked through `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` and the parity ledger.

---

## 0. How to read this document

- Section 1 states the end goal and the boundaries.
- Section 2 records every decision taken on 09-Sep-2026 (D01 to D40). The rest of the document is written to those decisions; if one changes, search for its id.
- Section 2A (added 01-Oct-2026) records the TrueVision parity decisions D41 to D91 - the parity audit's DR-01 to DR-44 and its seven open questions, each on its default until Adam answers - with the four cross-slice values, the swarm rules and gates, and the shared service-worker note. Where a 2A row revises one of D01 to D40 it names it.
- Section 3 maps the three source codebases and the exact files each phase draws from.
- Section 4 fixes naming, folders, header blocks, the parity ledger and the line budget.
- Section 5 is the data model: project.json schema, R2 asset keys, the worker route and the save path.
- Sections 6 to 11 are the six phases, each ending with a hand-over test list (Adam tests, nothing is self-verified in the browser).
- Section 12 is the cross-cutting integration list (index.html, CSS index, render loop, dev menu, hotkeys, caches).
- Section 13 is the risk register and the open items.
- Appendix A is the TrueVision to ValeVision file map that seeds the parity ledger. Appendix B is the event catalogue. Appendix C is the config key catalogue.

Working checkout for this work: the git worktree at `WebApps/.claude/worktrees/valevision-user-data-arch-976836` (branch `claude/port-truevision-valevision-95a40d`). Adam tests on his own server (ValeVision Gallery Flask, `http://127.0.0.1:8000`, which also serves `/ValeVision3D/`). After pulling changes, purge the shared service worker (Dev Tools, App Settings, Purge App Cache) before testing; the SW re-registers on every load.

---

## 1. End goal and scope

Port three TrueVision systems into ValeVision so that Plan View and Elevation / Section scenes, complete with annotations and dimensions, can be authored from the Dev menu and viewed from the carousel with the same UI and UX as TrueVision:

1. Scene Groups menu (the dynamic pill at the top-left of the carousel, the group editor, per-group ordering, cross-group cycling).
2. Floor Plan creation (datum plus cut offset, top-down orthographic drawing, annotations, dimensions, client measuring).
3. Elevation and Section creation (azimuth plus plane origin plus mode, head-on orthographic drawing, the same markup stack).

Then build one new tool:

4. **Layout Editor** (menu label "Layout Editor"). Adds drawing tabs beside the 3D model ("3D Model | Drawing 1 | Drawing 2 ..."). A drawing is a paper sheet (A4 to A1) carrying scaled viewports (1:20, 1:50, 1:100) of plan, elevation, section and 3D scenes, a Photoshop-style layer stack on the left, and Viewport / Text / Dimension / Styles panels on the right. 2D viewports are locked to the recognised scales and only crop; 3D viewports crop from every handle and scale with Shift on a corner. The sheet exports to a true-size PDF with vector linework.

Underneath both the scenes and the editor sits the Lantern Designer's projected-edges engine (rebuilt 07-Aug-2026): a raster underlay with an exact hidden-line-removed vector linework layer in front, the same two-layer stack the lantern drawings use.

Out of scope for this plan: porting anything back into TrueVision (that is a later parity pass recorded in the ledger), the legacy face-pick Elevation View and the Layout View browser tab (both stay untouched, D06), and any SketchUp plugin changes.

---

## 2. Decisions (09-Sep-2026)

| Id | Decision |
|---|---|
| D01 | Delivery order: Phase 0 three r184 upgrade, Phase 1 Scene Groups, Phase 2 drawing substrate plus Floor Plans plus Annotations plus Dimensions plus client measuring, Phase 3 Elevations and Sections, Phase 4 projected linework on scenes, Phase 5 Layout Editor. One minor version and one DEVLOG entry per phase. |
| D02 | Parity target is TrueVision 3D. PlanVision is not involved. |
| D03 | Every ported or parity-tracked file carries a PORT NOTE block in its header, and one parity ledger file in the ValeVision root tracks every module pair and its drift. |
| D04 | New code keeps the `Na__` prefix on file names and JS identifiers, as every existing ValeVision module does (corrected 09-Sep-2026; an earlier answer choosing a `ValeVision3D__` prefix was withdrawn). Ported files keep their TrueVision names verbatim so the two trees diff cleanly. CSS classes stay `na-` BEM and window events stay `na-` kebab-case. |
| D05 | New folder numbers; the legacy `40__System__2dElevationsView` and `41__System__CrossSectionView` folders are not renumbered. Because of D07 the approved slot list is adjusted by one: 42 DrawingViewCore (with the section adapter), 43 FloorPlanViews, 44 PlanAnnotations, 45 PlanDimensions, 46 ElevationViews, 50 ProjectedLinework, 51 LayoutEditor. Revised 01-Oct-2026 (D42: DR-02 default (a), applied in the working tree by W0-02): the drawing folders now carry TrueVision's numbers - 42 -> `40__System__DrawingViewCore`, 43 -> `42__System__FloorPlanViews`, 44 -> `43__System__PlanAnnotations`, 45 -> `44__System__PlanDimensions`, 46 -> `45__System__ElevationViews`, 47 -> `46__System__NorthDirection` - so TrueVision's 47, 48 and 49 land at their own numbers; the legacy `40__System__2dElevationsView` moved to `91__System__2dElevationsView` and its 2D profile-lines file to `05__RenderPipeline/` (D43); `41__System__CrossSectionView` keeps its number and name (DIV-2, D66); 50 and 51 are unchanged. The slot list above is kept as it was decided; the old -> new map is the parity ledger's "Folder renumbering (01-Oct-2026)" section, and every number is in `ValeVision__NOTES__FolderNumberRegistry__.md`. |
| D06 | Legacy face-pick Elevation View and the Layout View new-tab tool stay untouched for now. |
| D07 | The drawing section cut drives the existing `41__System__CrossSectionView` SystemLogic through an adapter. TrueVision's separate SectionCutEngine is not ported. |
| D08 | Scene-related data (groups, per-scene group id, scene links to drawings) lives inside `PresentationMode__SavedCameraScenes`. Drawing-related data (floor plans, elevations, sheets, markup, client grant) lives in a new top-level block `LayoutEditor__DrawingsData` with 3-stage keys. |
| D09 | Default group set: TrueVision's five plus "Cross Sections" (six groups, only the first enabled). |
| D10 | Group bar: same pill as TrueVision, top-left of the carousel, ValeVision tokens; hides with the carousel when the Video Studio timeline takes over. |
| D11 | Storey seeding: keep the button, let it degrade to "No named storeys detected", add a one-click "Ground Floor Plan" default at datum 0. |
| D12 | Drawings render through the composer (RenderPass camera swapped to the ortho camera, as the legacy Elevation View does), with a drawing preset that disables the fog and AO passes and uses the existing ortho-aware profile-line pass. |
| D13 | Client measuring (per-project "Let clients measure" toggle, red ephemeral dimensions behind a disclaimer) ships in Phase 2. |
| D14 | Millimetres, integer storage, world-origin 5 mm snap grid, lengths derived never stored, Open Sans 300/400/600, colours from config. |
| D15 | Annotations and dimensions live inside each plan or elevation record in the drawings block. |
| D16 | Elevation definition is azimuth plus plane origin plus mode (the precise, lockable form). Face-pick seeds a new elevation and a draggable gizmo edits it loosely; the sliders fine-tune. Revised 02-Oct-2026 (records only, W2-99; the parity audit's WP-S02a-13): the definition stands, but since v2.71.4 TrueVision's Drawing Planes (47__System__DrawingPlanes, W2-40 and W2-01) and its 2.1.0 Elevations editor (W2-05) do the face pick's and the grip's jobs - Aim at face, Move to face and dragging the plane - so Pick Face, Re-pick and the gizmo drag are gone; FacePick, GizmoGrip and PlaneGizmo are unused in both apps and retire in lockstep (D89 retired the azimuth setter). The decision above is kept as it was made. |
| D17 | ValeVision upgrades to three r184 with three-mesh-bvh 0.9.9 and three-edge-projection 0.0.10, so all three projection backends come across. |
| D18 | Projected linework is computed from the mesh GLBs (silhouettes, creases, intersections, hidden-line removal) with the SketchUp linework GLB edges overlaid as a second, occlusion-clipped line class. |
| D19 | A per-category exclusion list lives in AppConfig with a per-drawing-record override. |
| D20 | Exact linework is baked on localhost and stored on R2 as a per-view asset; live clients fall back to on-device computation only when the cache is missing or stale. |
| D21 | Hidden lines are available as a dashed class, default off. |
| D22 | The tab strip sits directly under the app header and is visible to everyone; web viewers get read-only drawing tabs. Refined 11-Sep-2026 (v2.21.20): on the web only when the project has sheets; on localhost only while the project's Enable Layout Mode switch is on. Revised 02-Oct-2026 (records only, W1-99; the parity audit's WP-S03a-10): since v2.45.0 (15-Sep-2026) one rule holds on localhost and on the live site alike - drawing tabs show only while the project's Layout Mode switch is on and it has at least one sheet (the Layout Editor loader's availability rule); D65 (DR-25 (a)) keeps the switch as a recorded divergence until the publishing port, and since v2.71.2 the strip is TrueVision's TabStrip 2.0.0 - 3D Model, Drawings (a menu of every drawing) and Specification - reached through the loader (D78, W1-34). The refinement above is kept as it was decided. |
| D23 | The tool is named Layout Editor: folder `51__System__LayoutEditor`, namespaces `Na__LayoutEditor__*`, data block `LayoutEditor__DrawingsData`. |
| D24 | Authoring is localhost-only (dev-gated like Presentation Scenes and Video Studio). Web viewers can open drawing tabs, pan, zoom and download the PDF. |
| D25 | A drawing is a paper sheet: A4, A3, A2, A1, landscape or portrait, margins and title block from config, default A3 landscape. |
| D26 | Two title block styles: "Modern" (vector primitives rendered to SVG and PDF from one list) and "Classic" (the scanned title block image stretched to the sheet; the existing A3 scan is used for every size until per-size scans are added). |
| D27 | Scales: 1:20, 1:50, 1:100 as a three-way toggle. |
| D28 | A section is an elevation record in Section mode, filed into the Cross Sections group. Elevation mode files into Elevations. |
| D29 | 2D viewport: scale locked; every handle crops or expands the window (a corner in both axes); a drag moves the frame; double-click enters the content, and a drag then pans the drawing within the window. Revised 10-Sep-2026 (v2.21.7) at Adam's request; the original read "corner handles do nothing, dragging inside pans". |
| D30 | 3D viewport: raster snapshot rendered from the scene camera through the live pipeline at export DPI with the viewport's style toggles applied; every handle crops, Shift on a corner scales proportionally (revised 10-Sep-2026, v2.21.7; originally corners scaled); no live orbit in the first version. |
| D31 | Layer type is a tag (Dimensions, Annotations, Viewports, General) used for filtering; any layer holds anything. Drag and arrows reorder; top of the list draws frontmost. |
| D32 | Right panels top to bottom: Viewport Settings, Text, Dimensions, Styles. Every section folds; section heights and both column widths drag to resize. |
| D33 | The four style toggles (Projected Linework, Profile Linework Effect, Glass Transparency Off, Whitecard) also exist per plan and elevation record so carousel drawings match sheet viewports. |
| D34 | Sheet markup has both modes per viewport: "Scene" shows and edits the scene's own markup; "Sheet" shows the sheet's own layers, with an Import From Scene action to copy. |
| D35 | PDF export via the already vendored jsPDF at true paper size: projected linework, dimensions, annotations and title block as vector; 3D viewports as PNG. |
| D36 | Binary drawing assets reach R2 through a new upload route on `valevision-gallery-editor-api` plus a Flask mirror endpoint. Adam deploys the worker once with wrangler. |
| D37 | Reference test project: `2026/3047__Doous` (already carries SketchUp section planes and cross section bindings). |
| D38 | Versions: 2.16.0 Phase 0, 2.17.0 Phase 1, 2.18.0 Phase 2, 2.19.0 Phase 3, 2.20.0 Phase 4, 2.21.0 Phase 5. Patch numbers for fixes within a phase. |
| D39 | No in-flight user-data architecture change is assumed (answer was "no preference"). The design targets the current project.json and R2 layout. |
| D40 | Vendoring mirrors the Lantern Designer layout: `04__Lib__ThirdParty__VersionLocked/` with numbered vendor folders, an import-map index JSON and a README; the old `04__Lib__ThirdParty__Three` folder is removed once the switch is verified. Glass Transparency Off renders glazing as flat opaque white; Whitecard forces the PureEngine whitecard materials for that render even under MaxEngine. Free-bearing elevations get a general rotation path in the projection engine while axis-aligned views keep the exact permutation fast path. |

---

## 2A. Decisions (01-Oct-2026) - TrueVision parity alignment, D41 to D91

**Dated note, 01-Oct-2026.** On 01-Oct-2026 Adam asked for ValeVision's drawing system and Layout Editor to be aligned exactly with TrueVision 3D - an identical Drawing Layout Editor - while ValeVision keeps its own R2 worker (`valevision-gallery-editor-api`), its Flask server (`WebApps/ValeVisionGallery/server.py`) and its storage under `VaApps/Projects/{folderId}/`. The parity audit saved at this root (`ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md`, with its evidence in `ValeVision__AUDIT__TrueVisionParity__Evidence__/`) put 44 decisions to him (its K1 register, DR-01 to DR-44, in `parity/data/decision_register.json`) and seven open questions (Q-VER in its R0.2.1; Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER and Q-BACKUP in its R0.2.11). That evening he instructed: "Save this plan to the ValeVision Root and save a working memory for other agents. After that begin working through the plan and ensuring alignment", and left the work running unattended with none of them answered. That instruction started the unattended run on the defaults: every row below applies the register's "default if unanswered", or, for an open question, the front matter's default or the planner's ruling already applied. By design a default never edits TrueVision, never changes shared Vale infrastructure live (the ValeVision Gallery service worker, its registrar or the sync pipeline), never deploys, never deletes, migrates or re-bakes live data, and never puts Noble Architecture content or an unconfirmed gesture change in front of a Vale user. The agents' hand-off file is `ValeVision__WORKING_MEMORY__TrueVisionParity__.md` at this root.

How to read this section:

- D41 to D84 record DR-01 to DR-44 in order (the D-number is the DR number plus 40); D85 to D91 record the seven open questions. Each row gives the DR or question, the decision, the answer applied with its date, and what it sets: the constant, config key, path or rule, with the package that writes it (K3 ids, `parity/data/wp_canonical.json`).
- "Default, unanswered" means Adam has not answered and the row applies K1's default, quoted verbatim (so "you" in it is Adam), followed by what the option means where K1 gives only its letter. When Adam answers, the row gains a dated note with his answer; nothing here is rewritten.
- Paths starting `parity/` are inside `ValeVision__AUDIT__TrueVisionParity__Evidence__/`. Module folders such as `51__System__LayoutEditor/` or `02__AppData/` are under `02__Src__AppModules/`; `01__AppAssets__ValeVision/`, `03__Style__AppStylesheets/`, `50__ValeVision__UserConfig/` and `52__LayoutEditor__HatchPatternLibrary/` are at the app root.
- TrueVision pin: commit `b2aa9151` (TrueVision3D v2.172.0, 30-Sep-2026). TrueVision values quoted here were read at that commit.
- Folder numbers in this section are ValeVision's after D42's renumber (applied in the working tree on 01-Oct-2026 by W0-02). The sections above keep the numbers they were written with (K2 section 13); W0-06 adds the dated revision note on D05.
- Where a row touches an earlier decision it names it: D42 reverses D05's slot list and D57 revises D27; D06, D11, D20, D22's Layout Mode refinement, D28's filing, D33 and D12's composer body are kept, as named seams where they differ from TrueVision. W0-06's ledger Decisions section marks each of D01 to D40 as current, superseded or permanent.
- The swarm rules and gates in 2A.4 are copied character for character inside code spans, so that nothing in them is read as Markdown.

### 2A.1 The K1 register, DR-01 to DR-44

| Id | DR | Decision | Answer applied (01-Oct-2026) | Sets |
|---|---|---|---|---|
| D41 | DR-01 | Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | 01-Oct-2026 - default, unanswered: (c) with the four gesture changes held: the swarm ports in dependency order, flags every unconfirmed TV release in the VV devlog, and does not land the gesture changes until you confirm them. Wave 0 does not depend on this DR. | Port scope: TrueVision commit `b2aa9151` (v2.172.0); anything TrueVision ships later needs a fresh pin, moved only by the delegator at a wave boundary (swarm rule R3). Swarm rule R10: TV releases Adam has not confirmed are ported but named in each Port Record and in the devlog entry's line `### Ported from TrueVision3D v2.A.0 (Adam-confirmed in TV: <which>)`; one acceptance checklist covers both apps. The four gesture guards: D80. |
| D42 | DR-02 | Renumber VV's drawing folders to TV's numbers, first and alone (and what 'its own file structure' means) | 01-Oct-2026 - default, unanswered: (a), as the first package of Wave 0, by one agent, gated by Na__Verify__ModuleGraph__ and Na__Verify__Exports__ plus Adam's smoke checklist; no other package edits VV 40-49 until it has landed. It is a local, git-reversible VV move. If Adam reads 'file structure' as the source tree, switch to (b) and every 40-49 port carries the S09 path-translation step. Applied in the working tree on 01-Oct-2026 by W0-02 (`k2_renumber_apply.py --mode git`): the renames are staged by `git mv`, nothing is committed, and its gates passed (Port Record `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/W0-02.md`). | Folder map 42 -> `40__System__DrawingViewCore`, 43 -> `42__System__FloorPlanViews`, 44 -> `43__System__PlanAnnotations`, 45 -> `44__System__PlanDimensions`, 46 -> `45__System__ElevationViews`, 47 -> `46__System__NorthDirection`; TrueVision-only `47__System__DrawingPlanes`, `48__System__CrossSectionViews` and `49__System__ElevationDepthFog` land at TrueVision's numbers; 70 drawing files now pair with TrueVision by identical relative path, so no later port rewrites a folder path. Reverses D05's slot list (W0-06 adds the dated note on D05). |
| D43 | DR-03 | Where VV's legacy drawing tools and VV-only folders go: 40 2dElevationsView, 35 PageLayoutSystem, the VV-only number registry, 62 EmailWorkers | 01-Oct-2026 - default, unanswered: (a), registry (i), 62 unchanged. Option (a): legacy 40 moves to 91 and its profile-lines file to 05 (both done by W0-02); 35 stays at 35, reserved and live; both legacy tools retire later. | `40__System__2dElevationsView` -> `91__System__2dElevationsView` (the 9x band is ValeVision legacy); `Na__RenderEffect__2dProfileLines__.js` -> `05__RenderPipeline/`, beside `Na__RenderEffect__ProfileLines__`; `35__System__PageLayoutSystem` unchanged until its retirement in W6-03 (held until Adam confirms the user-visible removals); registry (i) reserves ValeVision-only 28, 29, 31, 35, 60, 61, 63, 64, 69, 71 and the 9x band in `ValeVision__NOTES__FolderNumberRegistry__.md` (W0-06), with no moves; `62__Feature__EmailWorkers` stays at 62, its collision with TrueVision's and ValeVision Gallery's 62 recorded; `41__System__CrossSectionView` keeps its number (DIV-2). D06 still holds: the legacy tools are renumbered, not changed. |
| D44 | DR-04 | Three name and path alignments made inside the renumber package: ComposerPreset -> RenderPreset, DistanceCulling to TV's path, SnapshotHistory to TV's file name | 01-Oct-2026 - default, unanswered: All three in VV inside WP-S01-01R; no TV change; the WCP precache line is updated later by the DR-07 package. WP-S01-01R is K3's W0-02, which made all three changes on 01-Oct-2026. | `Na__DrawView__ComposerPreset__.js` -> `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`, its eight exports renamed `Na__DrawView__RenderPreset__Initialize`, `__Enter`, `__Exit`, `__ApplyStyles`, `__RenderFrame`, `__IsActive`, `__GetCamera` and `__GetExportOverrides`, with ValeVision's EffectComposer body kept (DIV-1: D12's composer preset under TrueVision's name); `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` -> `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js`; `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` -> `Na__AppUtils__SnapshotHistory.js`. The shared worker's precache line for the old DistanceCulling path is corrected only in W0-08's staged package. |
| D45 | DR-05 | Swarm integration rules: one owner per file, whole-file ports with re-applied seams, leaves first and hubs last, no throwaway stubs | 01-Oct-2026 - default, unanswered: (a). Option (a): whole-file owners win - each shared file has one owning package; other slices land their own modules early and inert and hand the owner an acceptance checklist; a bridge hunk only inside the owner's file lock; hub files land atomically and last; no throwaway stubs and no ValeVision-only intermediate versions; the port method is a whole-file take with ValeVision seams re-applied, with hunk replay only where a structural divergence lives (SnapshotRenderer, DIV-1). | Swarm rules R1 to R4 (2A.4); the serial order of every hot file in `parity/data/hot_file_ownership.json`; the leaves-first port order from TrueVision's import graph (W0-05); each shared test ported once, by the package that lands last among the modules it loads. |
| D46 | DR-06 | Fix the ValeVision Gallery sync purge (live R2 data loss) and make the sync preserve editor-owned keys | 01-Oct-2026 - default, unanswered: No swarm package writes new pictures under VaApps/Projects/{folderId}/ subfolders on R2 until you approve and run the fix; the fix is prepared and dry-run locally (no live sync). | Swarm rule R8: no new pictures, published files or statements under `VaApps/Projects/{folderId}/` subfolders on R2 until Adam has applied the fix and deployed worker 1.6.0. `ProjectData__EditorOwnedKeys` in ValeVision's `02__AppData/Na__AppConfig__Main.json` (W0-07) is the one list of editor-owned keys, read also by the worker's merge-keys (W0-10) and the localhost overlay (W0-13). The pipeline fix - purge only top-level keys (`Delimiter='/'`) with pagination, and preserve the editor-owned keys in the R2 merge - is prepared by W0-07 as staged copies of the three `WebApps/ValeVisionGallery/Tools__DevUtils` scripts plus a patch, dry-run on `2026/3047__Doous`; Adam approves and runs it. |
| D47 | DR-07 | Shared ValeVision Gallery service worker: token policy, cache split, and the reload guard for unsaved sheets | 01-Oct-2026 - default, unanswered: No package edits or bumps the shared worker; the service-worker package is prepared and tested for you; you bump at deploy. | The token rule (2A.5): `PWA_SW_VERSION_TOKEN` stays `'2026-09-18-1'` (`WebApps/ValeVisionGallery/02__Src__AppModules/62__Feature__AppInstallability/ValeVisionGallery__Pwa__ServiceWorker__Logic__.js:229`) until Adam bumps it at deploy; swarm rule R6. W0-08 prepares the one service-worker package as staged copies: the registrar holds its reload while the neutral `window.Na__Pwa__HasUnsavedWork` is true (ValeVision's AutoSave publishes it, W0-08 and W1-07), no reload on a first install, the refresh fix, the lazily linked Layout Editor stylesheets and the DistanceCulling path in the precache, and the sheet-picture and published cache classes; W6-02 refreshes the precache list at the end. |
| D48 | DR-08 | Site plans in ValeVision: port the client code dormant, port fully with a Vale data pipeline, or exclude | 01-Oct-2026 - default, unanswered: (B). Option (B): the site-plan client code is ported dormant - modules verbatim, ValeVision transport through the facade, the Drawing Type row hidden by config until a Vale pipeline exists. | The `ValeVision__SitePlan__` stem prefix in one constant (SheetRecords, W1-19), with the Store renaming `TrueVision__SitePlan__` manifest stems on read (W2-14); TrueVision's folder names `SitePlan__DrawingData__{Existing,Proposed}/` and project key `SitePlan__DataStores` inside ValeVision's prefix; a ValeVision-only AppConfig gate keeps the Drawing Type row hidden (W2-14; a one-line seam in Panel__Sheet, W4-10); `Viewport__ModelSourceId` null on each viewport's next save; the Scrapbook's OS licence items stay empty. Option (A)'s Vale pipeline is W5-06, held. |
| D49 | DR-09 | Design phases (Model Source, PhaseLibrary) in a single-model ValeVision | 01-Oct-2026 - default, unanswered: (a). Option (a): a dormant verbatim port, with no Design Phase menu and no `modelGroups` in ValeVision's project.json. | PhaseLibrary verbatim and uninitialised (W1-01), so `IsLive(undefined)` answers true and every drawing reads the live model; ModelSource verbatim once the site-plan client lands, adapted until then; TrueVision's positional signatures for Render2d, Render3d, EnsureLinework and the fingerprint calls adopted with the new slots null; folder 50 Pipeline 1.2.0's optional model-root and fingerprint seams verbatim. |
| D50 | DR-10 | Statement Writer (Design Statements tab) for Vale: in scope, how it is gated, and when | 01-Oct-2026 - default, unanswered: Build it last behind LayoutEditor__Statement__Enabled = false in VV until you answer (no NA-framed tab reaches Vale users before you decide); the Lockstep leaf lands now. | ValeVision-only `LayoutEditor__Statement__Enabled` = `false` in the Layout Editor AppConfig (W0-15), so no Design Statements tab reaches a Vale user; the Statement Writer (`51__System__LayoutEditor/52__Feature__StatementWriter/`) is ported last in the Layout Editor sequence, behind that switch (W4-04 to W4-16); its Lockstep leaf lands now at TrueVision's path `52__Feature__StatementWriter/01__Core__Data/` (W2-30); statement storage per D69. |
| D51 | DR-11 | Drawing Register and TV's three-part Document ID for Vale drawings | 01-Oct-2026 - default, unanswered: A's code with format {project}_{drawing} (B's config value) until you supply Vale phases: the code is identical and adding the phase later is a config change, provided it happens before the first publish. | See 2A.3 (Document ID): `LayoutEditor__DrawingRegister__DocumentCodeFormat` = `{project}_{drawing}` (TrueVision `{project}_{phase}_{drawing}`; W1-22), with `{project}` = ValeVision's document code `Na__DrawData__GetDocumentCode()`, the numeric `projectCode` of the loaded project.json (W1-12), never the `?project=` token, which `Na__DrawData__GetProjectCode()` keeps for transport; the per-sheet `Sheet__Fields__DocumentId` overrides it where scheme siblings share a code; no Noble Architecture job phases (T01 to T04) in ValeVision's `LayoutEditor__DrawingRegister__Phases`; Vale's phase codes must be fixed before the first publish, because a Document ID names published folders and archives. The hand-typed Drawing No. retires with the register (W4-10). |
| D52 | DR-12 | Project QR code, the title-block QR cell and the 'Project Portal' block for Vale | 01-Oct-2026 - default, unanswered: (A). Option (A): the code is ported switched off now, and switched on later with a Vale resolver. | `ProjectQr__Enabled` = `false` (`51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json`; TrueVision `true`; W1-15) and `LayoutEditor__TitleBlock__QrCellEnabled` = `false` (Layout Editor AppConfig; TrueVision `true`; W1-22); `ProjectQr__Link__BaseUrl` never carries Noble Architecture's `/q/` resolver. The Vale resolver and switching the code on are W5-05, held. |
| D53 | DR-13 | Sheet Images (pictures placed on sheets) in ValeVision | 01-Oct-2026 - default, unanswered: (a). Option (a): Sheet Images ported with ValeVision's transport and storage; the picture frame keeps TrueVision's bronze rule. | `51__System__LayoutEditor/54__Feature__SheetImages/` (render leaves W1-16, storage and publish units W3-18, editing set W3-02, switched on in W3-09); frame colour `#555041` (TrueVision's); pictures under `05__Layout__DrawingDocs__Images/<DocumentId>/` (D69); R2 writes only after D46's fix is applied and worker 1.6.0 is deployed (R8). |
| D54 | DR-14 | Floor Areas (measured rooms and area schedules) in ValeVision | 01-Oct-2026 - default, unanswered: (A) with TV's list. Option (A): Floor Areas ported, the core modules early and inert, the UI with or after the SheetTools hub, with TrueVision's room-group suggestions. | `51__System__LayoutEditor/59__Feature__FloorAreas/` (core inert in W1-27, switched on in W3-10, the Area Schedule element in W3-17); `Groups__Suggestions` in `Na__LayoutEditor__FloorAreas__Config__.json` = Ground Floor, First Floor, Second Floor, Basement, Garage, Outbuilding (TrueVision's list; Vale terms such as Orangery or Garden Room are an additive config edit later); SheetRecords seeds TrueVision's fifth 'Floor Areas' layer, of type `area`, on new sheets. |
| D55 | DR-15 | Elevation Depth Fog in ValeVision, and how VV's composer path renders it | 01-Oct-2026 - default, unanswered: Port; sheets (a); exports (a). That is: Elevation Depth Fog (49) is ported; on sheets, TrueVision's optional renderFrame callback route in ValeVision's tiled renderer is used only for the fog image; in image exports the raster is fogged and the projected vectors stay crisp. | `49__System__ElevationDepthFog` (pure leaves W1-09, core and 3D wiring W2-03); the `renderFrame` route in ValeVision's tiled renderer and the composites `depthFog` row (W2-12); no fog-only layer composited after `Na__PlExport__Apply`; seams DIV-1 (RenderPreset) and DIV-2 (CrossSectionView cap depth). |
| D56 | DR-16 | Plan doors, storeys and Hide swings (TV realign rows AA and AH) | 01-Oct-2026 - default, unanswered: (a) with 1.8.0. Option (a): folder 50 and the door module now, Layout Editor plan doors in the Layout Editor wave, with door module 1.8.0 as well as 1.9.0. | Door module 1.8.0 and 1.9.0 (W1-02); folder 50 DoorPose and Storeys (W2-06, W2-43); Layout Editor plan doors (W2-11, W2-16); the Viewport panel's Doors and Hide swings rows (W3-15). Confirm what Vale GLBs carry for doors before Adam tests it. |
| D57 | DR-17 | Two universal additions: reference layers (the Ref switch) and the 1:200 scale | 01-Oct-2026 - default, unanswered: Both yes. That is: reference layers (the Ref switch) are ported and 1:200 is added. | Reference layers through Panel__Layers 1.3.0 and ViewportLink 1.5.x (W3-13); `LayoutEditor__Scales__AvailableScaleDenominators` = `[20, 50, 100, 200]` and the SheetSetup fallback list (W1-22). Revises D27 (1:20, 1:50, 1:100). |
| D58 | DR-18 | Vector tools and Booleans (LE/37) with TV's keys | 01-Oct-2026 - default, unanswered: (a). Option (a): ported now with TrueVision's 13 key rows verbatim. | `51__System__LayoutEditor/37__System__VectorTools/` (pure leaves W2-27, inert units W2-28 and W2-41, switched on as one release in W3-07); TrueVision's 13 key rows verbatim in `Na__Hotkeys__DrawingTabs__.json` (T Trim only inside a container, Shift+T Extend, J, U, F, Shift+F, Shift+C, C, Shift+A, and Shift+U, S, T or O on a selection). |
| D59 | DR-19 | Hatch packs and the Patterns panel | 01-Oct-2026 - default, unanswered: As DR-08's default (B): verbatim panel and both packs. That is: with site plans dormant (D48), the Patterns panel verbatim with the Construction Materials pack and the Site Plan pack. | The app-root `52__LayoutEditor__HatchPatternLibrary/` with the Construction Materials pack first (Brickwork stays the default), then the five Site Plan hatches (W1-17); `Panel__Patterns` verbatim (W2-29); `Na__Test__HatchLineControls__` verbatim (W3-12). |
| D60 | DR-20 | Spell check with a Vale dictionary, and the colour palette's Vale name | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: spell check with ValeVision's own user dictionary at TrueVision's folder number and file shape with the app token swapped, seeded with TrueVision's shared groups and a Vale group in place of the practice's software group, served by a ValeVision Gallery user-config blueprint; the colour palette with TrueVision's Monochrome and Dimensions groups identical, under a Vale name. | `50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` at the app root (W0-18), named by `Dictionary__File` in `55__Feature__SpellCheck/Na__SpellCheck__Config__.json` (W2-34), its AddedInTheApp group titled "Added in ValeVision"; `ColourPalette__Standard` `Palette__MenuName` = "Vale Garden Houses Standard" in `54__Feature__ColourPalette/Na__ColourPalette__Config__.json` (W1-37); a Vale brand group is an additive config edit later. |
| D61 | DR-21 | Embed Open Sans in VV's PDFs and text measurement (PdfFonts), and host the font files on a Vale-owned source | 01-Oct-2026 - default, unanswered: (a), with FontCdnBase and Fonts[].FileName pointing at the AD04 TTFs VV's @font-face already loads (no new hosting; the S01 lint allow-lists www.noble-architecture.com/assets); move CSS and PDF together to the Vale-owned copy when you name it. Option (a): PdfFonts ported, Open Sans first in the sheet font, the title blocks re-measured; the PDF fonts are the AD04 TTFs ValeVision's screen already loads, so nothing new is hosted. | See 2A.3 (PDF and sheet face): `LayoutEditor__Style__FontFamily`, the PdfFonts source `LayoutEditor__Pdf__FontFamily`, `LayoutEditor__Pdf__FontCdnBase` and `LayoutEditor__Pdf__Fonts[].FileName` (W1-25), and the published reader's `Sheet__FontFamily` (W4-17). ValeVision's PDFs then embed Open Sans 300, 400 and 600 (D14's face) instead of printing non-embedded Helvetica. |
| D62 | DR-22 | Publishing pipeline and TV's published-only web viewer for Vale | 01-Oct-2026 - default, unanswered: (a), scheduled after its prerequisites; VV's live viewer stays until then. Option (a): TrueVision's publishing model - 52, 53 and 65 (and 66, D63) ported with ValeVision's storage and the facade, and the web viewer shows published files only. Write order (i), TrueVision's; Publish opens from the Drawing Register bar. | `52__System__Layout__PublishedDocuments` (the reader), `53__Data__Layout__PublishedSchema` and `51__System__LayoutEditor/65__Feature__DocumentPublishing` (the publisher), all in Wave 4 (W4-01 to W4-09, W4-17); write order: local first, R2 only on a deliberate tick, verify, manifest last, index last - a deliberate exception to ValeVision's R2-first rule, because a published document is a reviewed deliverable; published files under `06__Layout__PublishedDocuments/` (D69); the web viewer shows published files only from W4-09 (WebViewer 1.2.0); the Publish entry is the Drawing Register bar (W4-10). ValeVision's live viewer stays until then. |
| D63 | DR-23 | Share links (66 DocumentSharing) for Vale: link form and project token | 01-Oct-2026 - default, unanswered: As recommended, landing after DR-22. The recommendation: link (a), `<VV live app URL>?project=<token>&open=<documentKey>`, resolved by ValeVision's own loader and master index, with base and pattern in config; token (a), the folderId; statement and register links (a), omitted until those features land, their key constants reserved. | See 2A.3 (share-link project token): `Link__QueryPattern` = `?project={projectCode}&open={documentKey}` with the folderId in `{projectCode}`; `Link__BaseUrl` = ValeVision's live app address, never Noble Architecture's `/s/` resolver; `Na__LeShareLink__CODE_PATTERN` replaced by a project-token pattern (W4-07, W4-08). |
| D64 | DR-24 | VV's lazy Layout Editor loader (LE/01__Core__Loader): keep, offer to TV, or drop | 01-Oct-2026 - default, unanswered: (a). Option (a): ValeVision's lazy loader stays as a permanent, recorded divergence (the DrawingCode leaf stays with it). | `51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js` kept, which keeps about 73 editor modules off every start-up: literal `import()` only, one facade entry per TrueVision entry point (W1-31), every Layout Editor stylesheet registered in `Na__LeLoad__STYLESHEETS`. Offering it to TrueVision waits for D76. |
| D65 | DR-25 | VV's per-project Layout Mode switch | 01-Oct-2026 - default, unanswered: (a). Option (a): the per-project Layout Mode switch stays as a recorded divergence; TrueVision's strip rule becomes 'Layout Mode on and a sheet exists'; the switch is re-decided at the publishing port. | `LayoutEditor__DrawingsData__LayoutModeEnabled` kept (absent means off; D22's refinement of 11-Sep-2026 stands); visibility through `Na__LeLoad__IsAvailable` (W1-31, W1-34); re-decided at W4-09; retiring the switch is W5-07, held. |
| D66 | DR-26 | Cross sections: VV's 41 folder name, TV's 48 placeholder and its DOM ids, and section filing (D28) | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: keep the 41 name; port TrueVision's 48 placeholder with the Dev-menu rebuild after renaming ValeVision's own colliding ids; keep D28's filing as a temporary divergence. | `41__System__CrossSectionView` keeps its name, with `README__CrossSectionView__.md` naming the DIV-2 twins (W0-06); TrueVision's `48__System__CrossSectionViews` placeholder ported byte-for-byte with the Elevations Dev-menu rebuild (W2-05) after ValeVision renames its own gate ids to `naCrossSectionToolDev*`; D28 (Section-mode elevations filed under Cross Sections) kept as a temporary divergence until TrueVision's 48 passes 0.1.0. |
| D67 | DR-27 | How ported TV modules reach VV's own worker and Flask: one same-name facade at TV's paths, owned by S12 | 01-Oct-2026 - default, unanswered: (A), S12 owns, with the specification-lockstep interim as above. Option (A): one ValeVision-authored facade at TrueVision's paths with TrueVision's export names, over ValeVision's own worker and Flask server; the S12 packages own the transport. | `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (`Na__CfApi__*`) and `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (`Na__LocalMirror__*`) with ValeVision bodies (W0-12); `Na__AppUtils__GetProjectFolderFromUrl()` and `Na__AppUtils__GetYearFromUrl()` in ProjectLoader (W0-11); the project folder resolved only from the URL token through the master index, with writes refused on a miss; never TrueVision's `na-truevision-api` client, its `/r2/*` routes or a `NaProjectPortal/` key (gate G6). The specification lockstep may sit on `Na__R2Notes__*` until it re-bases onto the facade. |
| D68 | DR-28 | VV server APIs: worker route shape, upload mode, build-manifest bumps, delete convention and local-server recognition | 01-Oct-2026 - default, unanswered: As recommended; the worker is built and proven under wrangler dev and only you deploy it. The recommendation: worker (A), one guarded project-files family; raw streamed uploads; no build-manifest bump for the merge-keys and files routes; Flask deletes to quarantine; `/api/health` (A). | Worker 1.6.0 (W0-10, staged; only Adam deploys): read, write, upload, list, copy and delete with a server-side path-family allow-list, a project GET, server-side merge-keys and a capability list on `/api/editor/health`; uploads as a raw streamed body of up to about 95 MB; the build manifest still bumps for syncs, rename, visibility and delete; Flask deletes move to `00__Deleted__Quarantine`; `GET /api/health` answering `{status: 'ok', service: 'valevision-gallery-local-dev'}` in `WebApps/ValeVisionGallery/server.py`, with `/api/check-localhost` kept; JSON 404 for unknown `/api/*`; Flask routes `/api/valevision/<feature>` in `WebApps/ValeVisionGallery/Server__ValeVision<Feature>__Api__.py` blueprints (W0-09, W0-18, W0-19). |
| D69 | DR-29 | Storage layout for new VV content: TV's relative folder names inside VV's own prefix, and what gets committed | 01-Oct-2026 - default, unanswered: (A); commit JSON only; rasters, PDFs and archives not committed until you decide. Option (A): TrueVision's relative folder names verbatim at the project root; commit JSON only. | See 2A.3 (sheet-image folder). Under `VaApps/Projects/<folderId>/` on R2 and `WebApps/ValeVisionGallery/Projects/<yyyy>/<folder>/` locally, beside project.json: `05__Layout__DrawingDocs__Images/<DocumentId>/` (with its `00__Archive`), `06__Layout__PublishedDocuments/` and `10__StatementDocs/`; the statement index file name `ValeVision__StatementDocs__.json` in config (W0-15); `.gitignore` lines for `00__Archive__Revisions/` and for published rasters and PDFs (W0-19). |
| D70 | DR-30 | Save guards and the localhost overlay of editor-owned keys | 01-Oct-2026 - default, unanswered: As recommended, with R2 judging off behind its flag until you switch it on, and the backup location in config for you to confirm. The recommendation: guard (B), TrueVision v2.146's guarded save plus ValeVision-first R2 judging through merge-keys `drawingsBase`, behind a flag that stays off; overlay (B), the Flask copy plus an R2 overlay of the editor-owned keys; drawing-notes route (b) now, Last-Modified and atomic writes. | The guarded `POST /api/projects/<folder_id>` with `X-ValeVision-Drawings-Base` (a stale base answers 409; backups outside the repository; W0-09), ProjectData 1.6.0 (W1-05) and AutoSave 1.5.0 (W1-07); the R2-judging flag off until Adam switches it on; the localhost overlay of `ProjectData__EditorOwnedKeys` (W0-13); the backup root per D91. |
| D71 | DR-31 | Projected linework (folder 50): the 3D-matching rules, the bake gate, linework modifiers, and the BuildToken re-bake | 01-Oct-2026 - default, unanswered: As recommended; the re-bake is on your checklist and is not run by the swarm. The recommendation: (1) the 3D-matching rules ported now; (2) the bake gate stays the localhost test; (3) the LineworkModifier owner keys adopted, with ValeVision's LineworkSettings extended; (4) a new ValeVision BuildToken, the re-bake left to Adam. | `ProjectedLinework__Projection__HideFlushJoins`, `__SeamsOcclude` and `__LineworkFirst` and the flush tolerance (folder 50 to TrueVision HEAD, W2-06, W2-43); `Na__PlStore__BakeBeforeSave` gated by `Na__AppUtils__IsRunningOnLocalhost()`, not DevGate; the FineDetail and VeryFineDetail LineworkModifier owner keys as `ValeVision__LineworkModifier__*`, with per-tag overrides in `Na__LineworkSettings` (W2-13); a new `ProjectedLinework__Model__BuildToken` (for example `2026-10-xx-tv-parity`; TrueVision's is `2026-09-23-flush-tolerance`) with the ConfigAccess fallbacks equal to it (W2-06). Dev > Bake All to R2 on localhost is on Adam's checklist after Wave 2. |
| D72 | DR-32 | Drawing-core seams VV keeps: its plan and elevation mode controllers, North overlays, Video Studio preview, VV-only menu features, Elevation__SeededFrom | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: ValeVision keeps its plan and elevation mode controllers, takes North 1.1.0 whole, hides authoring overlays during Video Studio preview, keeps its menu extras as seams, and stops writing Elevation__SeededFrom. | ValeVision's mode controllers kept (`42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js`, `45__System__ElevationViews/Na__Elevation__ModeController__.js`, routed through SectionAdapter, RenderPreset, MaterialPreset and Transitions), adding only TrueVision's fog-source hook; North 1.1.0 whole after the InteractiveOverlays registry (W1-01, W1-11); BeginFrame guarded with `!Na__VideoStudio__Preview__IsPlaying()` (W1-01); seams inside TrueVision's 2.x Dev menus (W2-04, W2-05): the Styles and Exclusions rows (D33) in the Advanced fold, the Ground Floor Plan quick action (D11) beside +, the thumbnail bake on add, seed and Update, and bake-before-save (D20) on Update (not offered to TrueVision); `Elevation__SeededFrom` no longer written, preserved on read and save. |
| D73 | DR-33 | Hotkey files and key scope: TV's per-tab file names and KeyScope in VV | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: rename (a), all three key files; KeyScope makes only the visible tab's keys live; document keys (a), now, inert until the Register and Statements exist. | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` -> `Na__Hotkeys__DrawingTabs__.json` and `02__AppData/Na__ValeVision__HotkeysDictionary__.json` -> `Na__Hotkeys__3dModelTab__.json` (W0-03), keeping ValeVision's 3D array key `Na__ValeVision__HotkeysDictionary`, its `ValeVision__` action names and its own 3D handler; KeyScope (`Na__KeyScope__*`) scopes that handler so 3D keys stop firing on drawing and document tabs (W1-29); `51__System__LayoutEditor/31__System__DocumentKeys/` with `Na__Hotkeys__DocumentTabs__.json` (W1-30). |
| D74 | DR-34 | Module version numbers after a whole-file port | 01-Oct-2026 - default, unanswered: (a). Option (a): a whole-file port takes TrueVision's module version and DEVELOPMENT LOG verbatim. | Swarm rule R4: the PORT NOTE carries `- Source version: <TV x.y.z> (TrueVision3D v2.N.0, DD-Mon-YYYY; read at <pin>)` and ValeVision's prior history in one line (checked by `Na__Verify__PortNotes__`, W0-04); hunk-replayed files (SnapshotRenderer) keep ValeVision's own sequence plus a Source version line; the five modules ValeVision authored first (AxisLock, the ContextMenu card, Grips, SheetTools__, Snapping) say "Authored in ValeVision3D first ...; since ported back whole"; ValeVision's app releases keep their own sequence, stepped per D85. |
| D75 | DR-35 | Shape of the VV parity ledger, and recording this register's answers | 01-Oct-2026 - default, unanswered: (b). Option (b): the ledger is restructured in place - Module Register, Release Watermark, Decisions, Back-ports and Folder map, with the narrative moved to an Archive section in the same file - and each DR answer is recorded as a ValeVision D-number. | `ValeVision__PARITY__TrueVisionLedger__.md` restructured by W0-06, then one Parity Scribe pass per wave (W0-99 to W6-04); the ledger's Decisions section marks D01 to D40 as current, superseded or permanent and points at D41 to D91; this section is the record of the answers. |
| D76 | DR-36 | May the swarm edit TrueVision? | 01-Oct-2026 - default, unanswered: (a). Option (a): no TrueVision edits; TrueVision-side items are listed in the ValeVision ledger. | Swarm rule R7; TrueVision is read only at the pin; the TrueVision lane WT-01 to WT-12 is held until Adam approves each package. |
| D77 | DR-37 | TrueVision defects that verbatim ports would copy into VV | 01-Oct-2026 - default, unanswered: With DR-36 at (a): (1) and (2) are fixed VV-side as declared seams in the ported files; (3) is ported exactly as TV until you confirm the intent; (4) VV keeps its working variants. | (1) A CRLF-tolerant statement tokeniser that keeps source lines byte-exact and never normalises on read (W4-04) and (2) the register PDF reading 'yellow' as amber (W4-18), each a declared seam under PORT NOTE Divergences; (3) ShapeTool, RectangleTool, CircleTool and ArcTool ported as TrueVision has them (new shapes ignore the Vectors panel's Hatch setting) until Adam confirms the intent; (4) ValeVision keeps its working `na-pm-scene-activated` listener and `na-model-visibility-changed` dispatcher and never copies TrueVision's broken variants over them (K2 E3). |
| D78 | DR-38 | Tab strip 2.0.0 before VV has a Register or Statements, and how VV reorders sheets afterwards | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: strip (a), now, with 3D Model, Drawings and Specification, adding Register and Design Statements as they land; reorder (a), drag-to-reorder kept on the Drawings menu rows until the Register lands. | TabStrip 2.0.0 through the loader (W1-34), each extra tab appended on the loader's feature-presence answer; drag-to-reorder on the Drawings menu rows (localhost, editable) until `51__System__LayoutEditor/51__Feature__DrawingRegister/` lands and W4-10 removes it; visibility per D65. |
| D79 | DR-39 | Loading experience: TV's wording, TV's in-host veil with the header fold visible, and a veil for the first drawing after a document tab | 01-Oct-2026 - default, unanswered: As recommended. The recommendation: wording (a), cover (a) and the first drawing after a document tab (a) - TrueVision's headline and job lines after ValeVision's two pre-load lines; TrueVision's in-host veil below the tabs with the header fold visible; a veil for the first drawing opened after a document tab. | Loading words "Your Drawings Are Loading" with TrueVision's job lines, after "Fetching the drawing tools" and "Reading the drawing settings"; the loader's cover restyled as `.na-le-veil.na-le-veil--boot` with the header fold visible (W1-33, LoadingVeil 1.1.0); the first drawing after a document tab waits on `WaitForFirstDrawing` under the loader's screen; first of all, the 3D-furniture hiding block moves into `Na__LayoutEditor__Styles__Boot__.css`. Q-COVER: D90. |
| D80 | DR-40 | Behaviour changes Vale authors will notice when VV takes TV's editor | 01-Oct-2026 - default, unanswered: Items 1-6 adopt TV's behaviour; items 7-10 are held until you confirm them. The items adopted: (1) paste lands at the original paper coordinates; (2) a snap marker's colour means the target, so orange changes meaning; (3) the toolbar loses Notes, Undo, Redo, Fit and 100% while their keys and right-click entries stay; (4) undo covers notes-margin, region, leaderless and floor-area changes; (5) the Drawing Grid defaults to 10 mm major in 10, `#969696` over `#d6d5c9`, Points, on top (config per app); (6) vector quality defaults to Medium. The items held: (7) Select picks Move up; (8) Ctrl-drag copies; (9) a press on a viewport's linework carries the viewport; (10) Ctrl+click arms a move anchor. | Items 1 to 6 are named in the devlog entry that lands each (orange's new meaning included). Items 7 to 10, unanswered: W3-03 writes the four guards - one ValeVision-only constant at each gesture's entry point, listed in its PORT NOTE: (7) the auto-Move pick-up (HitResolution, PointerPress), (8) the CopyDrag start (PointerPress, PointerDrag), (9) the viewport carry GrabAt (PointerPress), (10) the move-anchor Arm (PointerPress) - and W3-04, which removes them, stays held until Adam says yes (swarm rule R10; R6 F.8 C1). |
| D81 | DR-41 | Section data schema (TD06): fix TV's positionMm sign and per-scene entry keys to VV's schema | 01-Oct-2026 - default, unanswered: VV unchanged; TV fixed only when DR-36 allows; until then TV's 41 Serialize and SceneData are never ported into VV. | ValeVision's section schema unchanged: `positionMm` = -plane.constant and per-scene entries `CrossSection__SceneBinding__*`; TrueVision's `41__System__SectionCutEngine` Serialize and SceneData are never ported (DIV-2); TrueVision's fix is WT-02, held. |
| D82 | DR-42 | Seam-minimising back-ports to offer TV, so more TV files port byte-for-byte | 01-Oct-2026 - default, unanswered: None happen; VV carries the seams (S01-F42's list; S06a-F38's interim adapted panel). | No offer is made to TrueVision (WT-10 and WT-11 held); ValeVision carries each seam under PORT NOTE Divergences: the SectionAdapter serialize and apply path, the ProjectLoader storage-folder helpers, app-token storage keys and config reads, the DrawingCode leaf, the interim adapted Parametric Scrapbook panel, the Statement Writer preparation, the PlanDimensions Data/Editor split, the Drawing Type gate (D48), the title-block logo text key (D83), the neutral PWA flag (D47) and the Statement switch (D50). |
| D83 | DR-43 | Vale replacements for NA content: public URLs, the Hub section, Portal and QR wording, title-block text and scan, scrapbook items | 01-Oct-2026 - default, unanswered: NA-only features off; strings in config with Vale values; Hub excluded; Standard Scrapbook empty; Custom Scrapbook not seeded; Vale's own Classic scan copied. | Swarm rule R9: features whose content is Noble Architecture's ship switched off until Vale content exists (QR D52, Statement Writer D50, site plans D48); ValeVision-only `LayoutEditor__TitleBlock__LogoFallbackText` with Vale text (W1-22); the 'TrueVision 3D Project Hub' statement section kept at TrueVision's path (`52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js`) but excluded from ValeVision's DEFINITIONS by config (W4-12); the title-block QR note verbatim (it names no app); `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` is Vale's own scan from legacy 35 (W0-16), never TrueVision's placeholder; Standard Scrapbook empty and Custom Scrapbook not seeded (W3-14); the parity lint (W0-04) fails on Noble Architecture markers. |
| D84 | DR-44 | UI outside the drawing editor: chrome details and 3D-tab extras | 01-Oct-2026 - default, unanswered: VV unchanged; TV-side items listed for DR-36; Cache & Storage optional. | No ValeVision change: it keeps its 3D canvas and image-export safe frame clear of the tab strip, its 96 px toast offset, its phone header title hidden at 600 px and narrower, its styled confirm dialog and its Enter / Exit Full Screen row (folder 60); the TrueVision-side items wait for D76 (WT-05, WT-07); the optional Cache & Storage dev panel is W5-04, held; TrueVision v2.92.0 stays outside this alignment. |

### 2A.2 The open questions: Q-VER (R0.2.1) and the six of R0.2.11

| Id | Question | Decision | Answer applied (01-Oct-2026) | Sets |
|---|---|---|---|---|
| D85 | Q-VER (R0.2.1) | The devlog version step: Adam's own memory note asks for patch bumps in `ValeVision__DEVLOG__.md`, while DR-34 and S11 B10 assume minor releases from v2.72.0, the devlog's practice since v2.22.0. | 01-Oct-2026 - default, unanswered: patch bumps from v2.71.1 - Adam's written rule (his memory note devlog-entries-use-patch-bumps, which names `ValeVision__DEVLOG__.md`). One VV version per wave. Adam can relabel before he commits. | The Parity Scribe's version step (swarm rule R5; R6 F.5.5): W0-99 allocates v2.71.1 unless a fresh read of the devlog top shows a later release, and each later wave takes the next patch number; each module log's release placeholder resolves to its wave's version. If Adam prefers the recent practice: minor bumps from v2.72.0. |
| D86 | Q-63 (R0.2.11) | TrueVision's unmerged branch `claude/westfarm-intro-notes-37b804` (commit `4db73420`, not an ancestor of `b2aa9151`) adds `63__System__LocalFileParity/`, while 63 is ValeVision-reserved (`63__Feature__AppNotificationEmail/`). | 01-Oct-2026 - default, unanswered: nothing moves while the branch is unmerged; 63 stays ValeVision-reserved. If the branch merges as 63 first, (b) runs with W6-03. Recommended to Adam: (a) rename the folder on the branch to a TrueVision-growth number (for example `65__System__LocalFileParity`) before it merges. | The registry's row for 63 (W0-06), read by W0-04's unregistered-number check; under (b), `63__Feature__AppNotificationEmail/` moves to `93__Feature__AppNotificationEmail/` with W6-03 (3 files and one import, at `62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js:25`). A merged branch also changes five drawing-system files pinned at `b2aa9151`, which then need a fresh pin (D41) and follow-up hunks. |
| D87 | Q-35ASSETS (R0.2.11) | Folder 35 holds Vale title-block material that no package keeps: the VizDpt A3 variant (`35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/`, a PDF and a PNG) and 12 A1-A3 layouts (`03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/`). Keep or archive them before W6-03 retires 35? | 01-Oct-2026 - default, unanswered: nothing is copied; W6-03 stays held until Adam confirms the removals (DR-03) and makes this choice, which its hard gate carries (R6 F.8 C31). Recommended to Adam: (a) copy the 14 files beside the Classic scan. | Under (a), `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/` gains the 14 files (with W0-16 if answered before it is dispatched, otherwise with W6-03). Under the default, nothing. |
| D88 | Q-REG (R0.2.11) | K2's folder-number registry gives 08, 09, 12-14 and 16-19 no owner, so W0-04's unregistered-number lint has gaps. | 01-Oct-2026 - default, unanswered: (a) TrueVision growth - ValeVision never takes them. | `ValeVision__NOTES__FolderNumberRegistry__.md` (W0-06) lists 08, 09, 12-14 and 16-19 as TrueVision growth, extending D43's registry (i); W0-04's unregistered-number check reads them so. |
| D89 | Q-AZIMUTH (R0.2.11) | `Na__ElevData__SetAzimuthDeg` (with `Na__ElevData__SetSeededFrom`) is a ValeVision-only export of `45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js`, imported only by ValeVision's old Elevation Dev-menu editor. Keep it or retire it? | 01-Oct-2026 - the planner's ruling, already applied (R6 F.8 C20 in W1-10 and W2-05; nothing user-visible): (b) retire it with W2-05. | W1-10 takes TrueVision's elevation data module 1.1.0 whole and keeps both ValeVision-only setters exported through Wave 1, because the old editor still imports them; W2-05 takes TrueVision's 2.1.0 editor, whose face pick sets `Elevation__AzimuthDeg` itself, and removes both; `Na__ElevData__STYLE_KEYS` stays a ValeVision-only export (D33); `Elevation__SeededFrom` is still preserved on read and save (D72). |
| D90 | Q-COVER (R0.2.11) | (1) What ValeVision's boot cover says on a cold document-tab press (Specification, later Register or Statements, pressed from the 3D view before the editor has loaded). (2) How the `immediate` option reaches `Na__LeVeil__FirstOpen`, since TrueVision's `Enter(sheetId)` takes no option. | (1) 01-Oct-2026 - default, unanswered: the drawing cover's headline with ValeVision's two pre-load status lines and no drawing job, confirmed by eye (R4 D.4 check 15). (2) 01-Oct-2026 - the planner's ruling, already applied (R6 F.8 C22 in W1-33). | (1) The boot cover's words (W1-33). (2) LoadingScreen gains and exports `Na__LeLoadScreen__IsShown()`, true while its loading state is up, not fading and not the error state; the ModeController calls `Na__LeVeil__FirstOpen(Na__LeMode__Host, { specification, textMetrics, viewportCount, immediate : Na__LeLoadScreen__IsShown() })` at TrueVision's call site, so `Enter(sheetId)` keeps TrueVision's signature; with `immediate` true the veil is at full opacity before Enter returns; recorded under PORT NOTE Divergences in LoadingScreen, ModeController and LoadingVeil (W1-33). |
| D91 | Q-BACKUP (R0.2.11) | Where the Flask save guard keeps project backups (W0-09); DR-30 says only "outside D:/10_CoreLib__ValeCodebase". | 01-Oct-2026 - default, unanswered: (a) a folder outside the repository, keep 30, mirroring TrueVision's convention with Vale names. | `%LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups`, keep 30; W0-09 writes it into config, and Adam confirms it before the first guarded save. |

### 2A.3 The four cross-slice values (WP-S08-15), and one owner per shared seam

Every package that numbers, prints, publishes or shares a drawing reads these four values. They are fixed here once, so that no two packages pick different answers for the same seam (S08-V05).

| Value | Constant or config key | ValeVision value | Decision | Written by |
|---|---|---|---|---|
| PDF and sheet face | `LayoutEditor__Style__FontFamily`; the PdfFonts source `LayoutEditor__Pdf__FontFamily`, `LayoutEditor__Pdf__FontCdnBase` and `LayoutEditor__Pdf__Fonts[].FileName`; the published reader's `Sheet__FontFamily` (`52__System__Layout__PublishedDocuments/Na__PubDoc__Config__.json`) | Open Sans everywhere. Sheet: `'Open Sans', Helvetica, Arial, sans-serif` (TrueVision's value). PDF: `OpenSans` embedded in three cuts - 300 Light, 400 Regular, 600 SemiBold - from the TTFs ValeVision's `@font-face` already loads (`03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css`), under `https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/`: `AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf`, `AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf` and `AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf`; never TrueVision's font paths into the Noble Architecture apps tree. Reader: `'Open Sans', 'Segoe UI', system-ui, sans-serif` (TrueVision's value, verbatim, because PdfFonts lands in Wave 1, before the first publish). CSS and PDF move together to a Vale-owned copy when Adam names one. | D61 (DR-21) | W1-25 (PdfFonts, the Style font family, the Medium 500 face), W1-26 (SheetChrome measuring), W4-17 (reader config); the PdfFonts callers W3-14 (Parametric Scrapbook) and W4-18 (Register PDF) |
| Document ID | `Na__LeModel__GetDocumentId(sheet)`, which reads `Na__LeRec__DocumentId`; `LayoutEditor__DrawingRegister__DocumentCodeFormat`; the document code `Na__DrawData__GetDocumentCode()` | The stored `Sheet__Fields__DocumentId`, else `{project}_{drawing}` with `{project}` = the numeric `projectCode` of the loaded project.json (for example `3047_D01`); TrueVision's `{project}_{phase}_{drawing}` once Adam supplies Vale phases, as a config change made before the first publish; every id passes TrueVision's `DOCUMENT_PATTERN` `^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$` | D51 (DR-11) | W1-12 (the accessor), W1-19 (the DrawingNumber default), W1-22 (the format, the title block and the PDF file names), W4-07 (publishing) |
| Share-link project token | `Link__QueryPattern` and `Link__BaseUrl` (`51__System__LayoutEditor/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Config__.json`); `Na__LeShareLink__CurrentProject()`; `Na__LeShareLink__CODE_PATTERN` | `?project={projectCode}&open={documentKey}` (TrueVision `?{projectCode}&open={documentKey}`), where ValeVision's `CurrentProject()` puts the folderId (for example `2026/3047__Doous`, URL-encoded by the link builder) into `{projectCode}`, resolved from the URL token through the master index - never project.json's folderId, and never a bare numeric code while 13 codes are shared by two or three schemes; `CODE_PATTERN` becomes a project-token pattern admitting `/`, `_`, `-`, `.` and the three space-containing legacy folders; document keys and the `open` parameter verbatim; `Link__BaseUrl` = ValeVision's live app address (today `https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/`), never Noble Architecture's `/s/` resolver | D63 (DR-23) | W4-07 (Share__Links), W4-08 (the Share config, buttons and Open) |
| Sheet-image folder | `Na__LePubSheet__IMAGES_DIR` (`51__System__LayoutEditor/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Sheet__.js:81`); the facade's `Na__CfApi__SHEET_IMAGES_DIR` | `05__Layout__DrawingDocs__Images` (TrueVision's, verbatim), directly under the project folder beside project.json and `06__Layout__PublishedDocuments/`: `VaApps/Projects/<folderId>/05__Layout__DrawingDocs__Images/<DocumentId>/` on R2 and `WebApps/ValeVisionGallery/Projects/<yyyy>/<folder>/05__Layout__DrawingDocs__Images/<DocumentId>/` locally; S07a's `LayoutEditor/SheetImages/` proposal is not taken | D69 (DR-29) | W0-12 (the facade constant), W0-18 (the Flask blueprint), W3-18 (the Sheet Images store), W4-03 (the publisher keeps `IMAGES_DIR` verbatim) |

| Shared seam | Its one owner |
|---|---|
| ModeController viewer guards: never `SetSheet` in the viewer; `WaitForFirstDrawing` resolves at once there | W4-09 |
| SheetSurface `ShowPublished` and `ZOOM_SETTLED_EVENT` | W1-28 (SheetSurface 1.13.0) |
| `GetDocumentId` and the document code | W1-12 (the accessor) with W1-22 (the format); W4-07 publishes with it |
| `na-app-scene-ready` | W0-13 (dispatched once per load, at the end of ValeVision's ShowScene) |
| The sheet-image folder | D69; the constants of W0-12, W0-18, W3-18 and W4-03 all name `05__Layout__DrawingDocs__Images` |
| PdfFonts callers outside the exporter | W3-14 (Parametric Scrapbook) and W4-18 (Register PDF), each after W1-25 |

### 2A.4 Swarm rules R1 to R11 and standard gates G1 to G7

Copied verbatim from `parity/data/wp_canonical.json` (K3, 01-Oct-2026, with the corrections of the audit's Section F.8 applied; a sentence ending in "[F.8 Cn]" is one that correction changed). Every swarm brief carries them in executable form as Section F.1's operating principles P1 to P20 (`parity/report/R6__F_SwarmDelegationPlan.md`).

Swarm rules:

- `R1 (DR-05): one owner per file per wave; a hot file is edited only as its hot_file_ownership rule says (integrator or the stated serial order).`
- `R2 (DR-05): leaves first, hubs last. A TV file is taken whole only once every module and name it imports exists in VV; until then it is not landed (no throwaway stubs) unless a package names an explicit, recorded seam.`
- `R3 (DR-05/K2 H5): a whole-file port takes TV HEAD b2aa9151 text verbatim and re-applies only the listed VV seams (banner token, console prefix, PORT NOTE, app-token literals, VV transport through the facade, VV-only exports). After W0-02 no folder-number seam exists for 40/42-46 and folder paths port unchanged. The pin advances per file only at a wave boundary and only by the delegator: a TV file an approved WT package changed takes Adam's TV commit as its pin for every VV package dispatched afterwards; Adam's own TV releases after b2aa9151 wait until the delegator re-pins those files; a delta to a file already ported becomes a Release Watermark row and a follow-up hunk package; the Port Record names the commit read (F.1 P2). [F.8 C3]`
- `R4 (DR-34): a whole-file port takes TV's module version and DEVELOPMENT LOG; VV history moves to one PORT NOTE line. Hunk-replayed files keep VV's own sequence plus a Source version line.`
- `R5 (S11 B10): coding packages never edit the ledger or the VV devlog; the Parity Scribe pass of each wave allocates VV versions (step size per W0-01: Adam's devlog memory says patch bumps, DR-34 assumes v2.72.0 onwards; if Adam has not answered by W0-99, patch steps from v2.71.1, F.5.5), resolves {{VVREL:}} tokens, writes devlog entries and ledger rows. [F.8 C6]`
- `R6 (DR-07): no package edits or bumps the shared ValeVision Gallery service worker except W0-08 and W6-02; every Port Record carries a SHARED SERVICE WORKER note (new modules, new exports, bump needed yes/no).`
- `R7 (DR-36): no package edits TrueVision except the WT lane, and only with Adam's per-package approval; VV never copies TV's known-broken variants over working VV ones (DR-37 item 4).`
- `R8 (DR-06/DR-28): no package writes new pictures, published files or statements under VaApps/Projects/{folderId}/ subfolders on R2 until Adam has applied the W0-07 sync fix and deployed worker 1.6.0 (their routes are new in W0-10, and the deployed /assets route accepts only thumbnail, linework and snapshot keys); worker routes are proven under wrangler dev and deployed by Adam only. [F.8 C29]`
- `R9 (DR-43/K2 V2): NA-only content never ships in VV; features whose content is NA-only land switched off until Adam supplies Vale content.`
- `R10 (DR-01/DR-40): TV releases Adam has not confirmed are ported but named in the Port Record; the four gesture changes (DR-40 items 7-10) are held until Adam says yes (guard constants in W3-03, removed by W3-04).`
- `R11 (waves): a wave starts only after the previous wave's Parity Scribe pass (its xx-99 package) has finished; Adam commits once per wave (S11 B10 item 7). Inside W0 Adam also commits twice: W0-01's PLAN edit alone before W0-02 is dispatched, then W0-02 alone (code only) before any other W0 package (F.5.7). [F.8 C10] Every commit stages only the integrator's path list, never git add -A at VCB/ (F.1 P19). [F.8 C4] A hard-gated package whose gate is still closed when the rest of its wave is DONE is marked SKIPPED-HELD by the integrator, which counts as DONE for its dependents and its scribe; released later, it runs as a follow-up after a hot-file re-check (F.4.2 step 6). [F.8 C9]`

Standard gates (each command run from the ValeVision app root):

- `G1: node VV/80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs exits 0 (baseline 01-Oct-2026: 517 modules, 0 failures; the count only grows).`
- `G2: node VV/80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs exits 0 with a non-zero file count (it also checks modules nothing imports yet, so an inert landing must still link).`
- `G3: python parity/report/tools/k2_path_gate.py --root <VV app root> exits 0 (CSS @import, new URL(...), config path strings, retired folder names).`
- `G4 (from W0-04 on): node VV/80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs and Na__Verify__PortNotes__.mjs exit 0 (VALEVISION3D banners, FILE lines, no [TrueVision3D prefix, no TrueVision__ literal, no window.TrueVision__, no NaProjectPortal / 30__TrueVision__AppContent / /na-apps/30__TrueVision__CoreAppCode / noble-architecture.com/q/ or /s/, every PORT NOTE carries a Source version, no {{VVREL: token left after the scribe). Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, __PLAN__, __NOTES__, Research__ and TASK__ files) and the named TrueVisionHub statement file W4-12 keeps at TV's path. A hit on W0-04's baseline allow-list prints WARN instead of failing: the SpecPdf__.js:147 read until W0-12 (that part is empty by W0-99), and PORT NOTEs written before the K2 H5 format without a Source version line until a package next writes the file. [F.8 C13]`
- `G5: every ported or new TV test named in tests_to_port exits 0 under node (mjs/cjs) or python (py) from the VV app root; browser harnesses (.html) are run on the WCP Flask server.`
- `G6: VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js is VV's own facade (W0-12): no VV file contains TV's transport (na-truevision-api, NaProjectPortal/, a TV R2 key builder) and no VV file was copied from TV 80__CloudflareIntegration. (This replaces the older slice acceptance line "No file under VVM imports 80__CloudflareIntegration", which predates K1 DR-27.)`
- `G7: the package returns a Port Record (S11 Appendix C) and never edits VV/ValeVision__PARITY__TrueVisionLedger__.md or VV/ValeVision__DEVLOG__.md; module DEVELOPMENT LOG lines carry {{VVREL:<wp_id>}} for the Parity Scribe to resolve.`

For the unattended run that started on 01-Oct-2026 the orchestrator's execution policy stands over R11's commits: no agent commits, and the orchestrator's wave checkpoints stand in for Adam's commits (2A.6).

### 2A.5 The SHARED SERVICE WORKER note (WP-S04b-16) and the token rule

ValeVision has no service worker of its own. It registers ValeVision Gallery's shared worker, whose one token, `PWA_SW_VERSION_TOKEN` (`'2026-09-18-1'` on 01-Oct-2026, `WebApps/ValeVisionGallery/02__Src__AppModules/62__Feature__AppInstallability/ValeVisionGallery__Pwa__ServiceWorker__Logic__.js:229`), names the shell, thumbnails, data and models caches together, so a bump re-downloads every Vale client's models.

The token rule (D47; W0-08 writes it into the logic file's header):

1. No package edits or bumps the shared worker: W0-08 prepares the one service-worker package and W6-02 refreshes its precache list, both as staged copies for Adam (swarm rule R6).
2. The token is Adam's call. He bumps it at deploy, never a package: once per deployed wave, with one log line naming the ValeVision versions it covers, from the one consolidated bump request the swarm hands him for that wave. Recommended (DR-07 (a)): deploy W0-08 first, so that models and thumbnails get a token of their own and later shell bumps stop re-downloading models.
3. Do not deploy Wave 0 (the renumber) without W0-08 deployed plus a shell bump, or a full bump: a warm client holding the old `Na__AppFlow__LoadingSequence.js` beside the new `index.html` cannot link.
4. TrueVision's own worker is bumped only by the TrueVision-lane packages that change TrueVision shell files.

Every record carries the note, and none ever says "n/a":

- Port Record, every package: `SHARED SERVICE WORKER: <n new modules; new exports on existing modules: list | none>; bump needed: <yes/no>` - naming the new modules, the new or renamed cross-module exports on existing modules, and any newly linked stylesheet.
- ValeVision devlog entry, written by the Parity Scribe only, in ValeVision's own form (devlog v2.67.0 to v2.71.0): `- THE SHARED SERVICE WORKER. This release adds <n> modules and <no new export on any existing module | these new exports on existing modules: ...>, so <what a warm client holding a mix of old and new files sees>. The token is still Adam's call; it was <not bumped | bumped to 'YYYY-MM-DD-n' by Adam>.`
- Ledger rows: `Service worker token: shared ValeVision Gallery worker - Adam's call`. No live row says ValeVision has no service worker (W0-06 corrects the old ones).

### 2A.6 Execution notes for the unattended run (01-Oct-2026)

- Adam's instruction of 01-Oct-2026, quoted at the head of this section, started the unattended run on the defaults recorded here. None of D41 to D91 has been answered yet.
- W0-02 (the renumber, D42) ran before this record, by the orchestrator's choice: the renumber script refuses a dirty tree, and this record changes only a records file whose content the defaults fix. Its renames are staged by `git mv`; nothing is committed.
- No agent commits, pushes, deploys, bumps a token, runs the live sync or restarts a server. The orchestrator's checkpoint (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/checkpoints/`) stands in for Adam's commit of this PLAN edit and of W0-02; he reviews and commits per wave from the checkpoints, or commits the whole tree.
- Shared Vale infrastructure stays live-untouched: W0-07 (the sync fix), W0-08 (the shared service worker), W0-10 (worker 1.6.0) and W6-02 (the precache refresh) are staged copies plus patches under `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/prepared/`.
- Held until Adam answers: W3-04 (D80), W5-04 (D84), W5-05 (D52), W5-06 (D48), W5-07 (D65), W6-03 (D43, D87) and the TrueVision lane WT-01 to WT-12 (D76).
- Landed switched off: the Statement Writer (D50), Project QR and the title-block QR cell (D52), site plans (dormant, D48) and design phases (dormant, D49).
- Each package returns a Port Record (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`); only each wave's Parity Scribe writes `ValeVision__DEVLOG__.md` and `ValeVision__PARITY__TrueVisionLedger__.md`.

---

## 3. What was found in the three codebases

### 3.1 TrueVision 3D (the source of the ported systems)

Root: `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`. Native ES modules, no bundler, three r160 from esm.sh, one module script in `Index.html`, zero `window.*` globals, window CustomEvents as the bus.

| Folder | Files / lines | Role |
|---|---|---|
| `21__System__PresentationMode` | 11 files, 5842 lines | Scenes, carousel, **scene groups** (data 595, selector 474, group editor 555, config 68, css 460), thumbnails, transitions, visibility capture |
| `40__System__DrawingViewCore` | 5 files, 2157 lines | The seam: `ActiveView` broker (417), 2D `Navigation` (478), `MarkupMount` (405), `ProfileLines` overlay (729), `SceneLinkRow` (128) |
| `41__System__SectionCutEngine` | 5 files | Single-plane drawing cut; `CapGeometry` is a verbatim port of ValeVision's own cap engine (not ported here, see D07) |
| `42__System__FloorPlanViews` | 11 files, 4092 lines | AppConfig, ConfigState, ProjectJson Data, ModeController (838), OrthoCamera, Framing, DevMenu Editor (708) and RowBuilders, SceneLink, MarkupFocus arbiter, css |
| `43__System__PlanAnnotations` | 8 files, 3182 lines | Data, Overlay (HTML DOM labels), Editor, Toolbar, Hotkeys, History, AppConfig, css |
| `44__System__PlanDimensions` | 13 files, 6288 lines | Data (988), Grid (snap), Overlay (SVG), Editor (907), VertexEditor, AxisLock, Crosshair, ClientMode, Disclaimer, Hotkeys, History, AppConfig, css |
| `45__System__ElevationViews` | 11 files, 5046 lines | AppConfig, ConfigState, ProjectJson Data (665), ModeController (893), OrthoCamera, Framing, PlaneGizmo, DevMenu Editor and RowBuilders, SceneLink, css |
| `03__AppUtils/Na__AppUtils__SnapshotHistory.js` | 273 | Shared snapshot undo factory used by both markup histories |

Design facts that the port keeps (the TrueVision DEVLOG v2.11 to v2.19 records why):

- Scene "kinds" are implied by link keys on the scene record (`PresentationMode__Scene__FloorPlanId`, `__ElevationId`); the carousel stays kind-agnostic and hands each scene to a **router list** (`AddSceneNavigationRouter`). A setter would let the last-initialised system unhook the other.
- Every plan and elevation scene carries a **real camera block** (a scene without finite camera coordinates is filtered out of the carousel).
- Markup coordinates are two millimetre values per point; the stored field names say X and Z but mean drawing axis 1 and 2 (world X and Z on a plan, run and height on an elevation). The broker owns that mapping.
- The dimension snap grid is anchored at the **world origin**, never the model bounds. Length is derived, never stored.
- Annotations are HTML DOM, dimensions are SVG, both positioned from the canvas offset box (the canvas starts below the header).
- Undo is snapshot-based and mutates the bound array in place, because the overlay and the saved record hold the same array.
- The markup focus arbiter is first-refusal, so Ctrl+Z can never fall into a gap between the two layers.
- A drawing's framing (zoom and pan target) is stored on every pan settle and every zoom step, and again on save.
- A drawing thumbnail is captured from the drawing branch of the render, never from the perspective camera.

### 3.2 ValeVision 3D (the target)

Root (worktree copy): `WebApps/ValeVision3D`. Native ES modules, three r160 vendored under `04__Lib__ThirdParty__Three`, one module script in `index.html` (line 1186 onwards), static DOM shells for every menu section, `na-` CustomEvents, on-demand render loop, two render engines (PureEngine whitecard, MaxEngine PBR plus SSAO plus HDRI).

What already exists and is reused:

| Existing module | Reused for |
|---|---|
| `21__System__PresentationMode` (6 files) | Scene data, carousel, transitions, thumbnails; extended with groups and the router list |
| `41__System__CrossSectionView` (7 files) | The **only** section engine (D07): `SystemLogic` (1681), `CapGeometry` (597), `SceneData` (per-scene bindings keyed by scene name), `PlaneGizmo` |
| `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js` | The ortho-aware profile-line pass used by the composer route (D12) |
| `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` | Plane list and overlay renderer registration (same API as TrueVision) |
| `03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` | The single two-phase save utility (R2 first, Flask mirror second) |
| `03__AppUtils/Na__AppUtils__ProjectLoader.js` | Master index, build manifest, R2/GH URL resolution, localhost predicate |
| `30__System__ImageExport` (`Na__UiFeature__RenderToDataUrl`, tiled renderer) | 3D viewport snapshots and thumbnails at export DPI |
| `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js` | PDF writing for the Layout Editor |
| `20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js` | Whitecard and glass overrides for the style toggles |
| `70__System__DevTools` pattern | Dev menu sections (static `<li>` shells, module reveals and injects) |

What does not exist yet: scene groups, a drawing-view broker, an ortho registration seam in the render loop beyond the legacy elevation flag, a router hook in the carousel, any markup layer, any binary asset upload to R2 (thumbnails only reach the local Flask mirror), and any side-panel layout primitive.

Project.json facts that shape the data model: the ValeVision Gallery sync pipeline is key-scoped (it patches camera data, model URLs, images and IMG-slot thumbnail names, and explicitly never overwrites a hand-authored `PresentationMode/Thumbnails/...` path), so ValeVision-owned keys survive re-syncs and no preserve lists exist to maintain. Saves are whole-document, R2 first.

### 3.3 Vale Lantern Designer (the projection engine and the sheet know-how)

Root (worktree copy): `WebApps/Vale__LanternDesigner`. Three r184 plus three-mesh-bvh 0.9.9 plus three-edge-projection 0.0.10, vendored under `04__Src__Dependencies__VersionLocked` with an import-map index.

`27__System__ProjectedEdges2d` (20 `.mjs` files) is the engine. Facts that must not be broken:

- `ClipWorker -> ClipKernel` must stay import-free of anything reaching three.js. Import maps are document-scoped; a bare specifier in that chain breaks the worker silently on every browser and it falls back to the main thread. That is why the kernel takes typed arrays.
- Occlusion is analytic parametric interval subtraction per edge (not a depth buffer, raycast or ID buffer): covered ranges union, complement is visible. Edges are independent, so sharding across workers is exact.
- The backface-cull bug in the vendored library (a number compared to a boolean) is fixed in the soup builder, where culled triangles are never built at all.
- The view basis table is signed permutations, which is what makes the intersection-edge pass view-invariant and cacheable per model. Free bearings need a real rotation and lose that sharing (D40).
- The preview pass never waits on the intersection pass; a picture lands in about 0.1 s and the exact linework follows.
- Linework is stored as plain `x0, y0, x1, y1` numbers in drawing millimetres, y down, gated on load by schema version, model build token and fingerprint.
- Measured on a 39k-triangle lantern: three views in about 1.4 s after the rewrite (21 to 33 s before). A Vale house is ten to fifty times the triangle count, which is why D20 bakes.

`30__System__DrawingEditorMode` and `05__Env2d__SvgRenderPipeline` supply the sheet patterns: one paper-millimetre layout solve shared by screen and PDF, one primitive list for the chrome rendered two ways, true-scale viewBox rewriting per frame, wheel zoom about the cursor with right or middle drag pan, gutter drag in solved millimetres, the CSS-scale-aware floating input for editing values, drag-to-resize panels driven by CSS custom properties, and foldable descriptor-driven sections.

---

## 4. Code discipline for this work

### 4.1 Naming (D04, D05, D23)

- Folders: `NN__System__Name` under `02__Src__AppModules`: `42__System__DrawingViewCore`, `43__System__FloorPlanViews`, `44__System__PlanAnnotations`, `45__System__PlanDimensions`, `46__System__ElevationViews`, `50__System__ProjectedLinework`, `51__System__LayoutEditor`. Scene groups live in the existing `21__System__PresentationMode`.
- Revised 01-Oct-2026 (D42, see D05): these folders are now `40__System__DrawingViewCore`, `42__System__FloorPlanViews`, `43__System__PlanAnnotations`, `44__System__PlanDimensions` and `45__System__ElevationViews`, with North at `46__System__NorthDirection`; TrueVision is the numbering authority (registry: `ValeVision__NOTES__FolderNumberRegistry__.md`).
- Files: `Na__<System>__<Role>__.js`, `Na__<System>__AppConfig__.json`, `Na__<System>__Styles__<Role>__.css`, exactly the TrueVision names for ported files. Worker entry: `Na__ProjectedLinework__ClipWorker__.js` (plain `.js`, loaded with `type: 'module'`).
- Functions: `Na__<ShortNamespace>__<VerbNoun>` for module-private symbols and `Na__<System>__<VerbNoun>` for exports, mirroring TrueVision's short/long split (for example `Na__FpMode__StoreFraming` private, `Na__FloorPlanMode__EnterPlan` exported), so ported bodies stay identical to TrueVision. Constants `Na__<Ns>__SCREAMING_SNAKE`.
- Existing modules that are edited keep their names. New functions added to an existing module keep that module's short namespace.
- CSS: `na-<block>__<element>--<modifier>` plus `.is-open` style state classes. DOM ids `naCamelCase`. Events `na-kebab-case` with `{ detail }` and a `source` discriminator where two modules both emit and consume.
- JSON keys: 3-stage `System__Block__Key`, every block with a sibling `__Description`, distances in integer millimetres, colours as `#rrggbb` strings or integers as the neighbouring block already does.

### 4.2 File layout and headers

Every new file uses the live ValeVision module shape: the `// ===` banner with `FILE / NAMESPACE / MODULE / AUTHOR / PURPOSE / CREATED`, `DESCRIPTION:` and `INTEGRATION:` bullets, then the **PORT NOTE** block, then `DEVELOPMENT LOG`. Regions use the 79-dash `// REGION | Name` rule closed with `// endregion ---`, bodies indented four spaces, functions bracketed by `// FUNCTION | Title` and 60-dash rules, three blank lines between regions and two between functions, trailing `// <--` comments column-aligned, a single `export { ... }` block at the bottom, no default exports, no globals, `[ValeVision3D]` console prefix.

PORT NOTE template (placed after INTEGRATION, before DEVELOPMENT LOG):

```
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js
// - Source version: 1.0.0 (31-Aug-2026)
// - Ported on     : DD-Mon-YYYY for ValeVision3D vX.Y.Z
// - Parity        : verbatim | adapted | diverged
// - Divergences   :
//   - <one line per deliberate difference and why>
// - Back-port     : <what a fix here needs when carried to TrueVision>
//
```

Files that are new to ValeVision but expected to be ported back later (Layout Editor, projection integration) carry `Ported from : none (ValeVision original, back-port candidate)`.

### 4.3 Parity ledger (D03)

`ValeVision__PARITY__TrueVisionLedger__.md` in the ValeVision root, created in Phase 1 and updated in every phase. One row per module pair: ValeVision file, TrueVision file, source version, parity state, divergences, last checked date. Appendix A of this plan is its first content. Fixes made in ValeVision that TrueVision needs are logged in a "Pending back-port" table at the foot of the ledger.

Revised 01-Oct-2026 (D75: DR-35 default (b), done by W0-06): the ledger is restructured in place - a header (roots, divergences, the shared service worker), the folder map with the renumbering, a Module Register of one row per module in scope, a Release Watermark of every TrueVision release v2.24.0 to v2.172.0, a Decisions section that marks D01 to D40 current, superseded or permanent, the back-ports to TrueVision with their checked statuses, and an Archive holding every earlier section unchanged under a dated note. Only each wave's Parity Scribe writes it from now on.

### 4.4 Line budget

No new file over 1000 lines; aim for 600 or fewer. TrueVision files already over 600 are split on port: `DevMenu__SceneEditor.js` (1622 lines in TrueVision; ValeVision's is 939) splits its row builders out; `PlanDimensions__Data__.js` (988) splits its config access from its record model; `PlanDimensions__Editor__.js` (907) splits placement preview from selection handling; `Elevation__ModeController__.js` (893) and `FloorPlan__ModeController__.js` (838) split their carousel routing and 3D-system suspension into a shared DrawingViewCore helper. Every split is recorded in the PORT NOTE.

### 4.5 Config discipline

Every tunable number lives in JSON: system-owned `Na__<System>__AppConfig__.json` files fetched relative to the module with `new URL('./...', import.meta.url)`, memoised, with a frozen fallback object mirroring the shipped JSON, and `Val()` accessors that keep `null` as a value where it means "infinite". App-wide keys go in `Na__AppConfig__Main.json` (Appendix C).

---

## 5. Data model, storage and save path

### 5.1 project.json additions

**Presentation block (scene-related, D08):**

```jsonc
"PresentationMode__SavedCameraScenes": {
    "...existing keys...",
    "PresentationMode__SavedCameraScenes__Groups": [
        { "PresentationMode__Group__Id": "Group_001", "PresentationMode__Group__Name": "Exterior 3D Views", "PresentationMode__Group__Order": 1, "PresentationMode__Group__Enabled": true }
    ],
    "PresentationMode__SavedCameraScenes__Scenes": [
        {
            "...existing scene keys...",
            "PresentationMode__Scene__GroupId"     : "Group_001",   // absent = fallback group
            "PresentationMode__Scene__Order"       : 1,             // restarts at 1 inside each group
            "PresentationMode__Scene__FloorPlanId" : "FloorPlan_001",  // only on a plan scene
            "PresentationMode__Scene__ElevationId" : "Elevation_001"   // only on an elevation or section scene
        }
    ]
}
```

Default groups seeded in memory when the Dev menu opens and written on the first group save: `Group_001 Exterior 3D Views` (enabled), `Group_002 Interior 3D Views`, `Group_003 Dollhouse View`, `Group_004 Floor Plans`, `Group_005 Elevations`, `Group_006 Cross Sections` (D09). A project with no `__Groups` array reads as ungrouped: no bar, flat order, byte-identical behaviour.

**Drawings block (drawing-related, D08, D15, D23):**

```jsonc
"LayoutEditor__DrawingsData": {
    "LayoutEditor__DrawingsData__Description"   : "ValeVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres. The SketchUp cloud sync never writes this key.",
    "LayoutEditor__DrawingsData__Version"       : 1,
    "LayoutEditor__DrawingsData__ClientDimensionsEnabled": false,
    "LayoutEditor__DrawingsData__LayoutModeEnabled": false,   // v2.21.20: localhost Dev switch for the tab strip; the live site ignores it (02-Oct-2026 note, W1-99: stale since v2.45.0, which applies the switch on localhost and on the live site alike - see D22)
    "LayoutEditor__DrawingsData__FloorPlans"    : [ /* FloorPlan records, 5.2 */ ],
    "LayoutEditor__DrawingsData__Elevations"    : [ /* Elevation records, 5.3 */ ],
    "LayoutEditor__DrawingsData__Sheets"        : [ /* DrawingSheet records, 5.5 */ ]
}
```

### 5.2 FloorPlan record (ported schema, plus styles and exclusions)

```jsonc
{
    "FloorPlan__Id"            : "FloorPlan_001",
    "FloorPlan__Name"          : "Ground Floor Plan",
    "FloorPlan__Order"         : 1,
    "FloorPlan__Enabled"       : true,
    "FloorPlan__FloorDatumMm"  : 0,
    "FloorPlan__CutOffsetMm"   : 1200,
    "FloorPlan__ViewDepthMm"   : null,                 // null = infinite downward
    "FloorPlan__SceneId"       : "Scene_010",
    "FloorPlan__CameraZoom"    : 2.4759,
    "FloorPlan__CameraTargetMm": { "PosX": 23159, "PosZ": -24993 },
    "FloorPlan__Annotations"   : [ { "Annotation__Id": "Anno_001", "Annotation__Text": "Atrium", "Annotation__PosXMm": 13216, "Annotation__PosZMm": -19576, "Annotation__SizeMm": 300, "Annotation__FontWeight": 400, "Annotation__Color": "#323232" } ],
    "FloorPlan__Dimensions"    : [ { "Dimension__Id": 1, "Dimension__Axis": "x", "Dimension__StartXMm": 0, "Dimension__StartZMm": 0, "Dimension__EndXMm": 5000, "Dimension__EndZMm": 0, "Dimension__OffsetMm": 750, "Dimension__TextSizeMm": 220, "Dimension__FontWeight": 400, "Dimension__Color": "#323232", "Dimension__Terminator": "tick", "Dimension__Author": "dev" } ],
    "FloorPlan__Styles"        : { "Styles__ProjectedLinework": true, "Styles__ProfileLinework": true, "Styles__GlassOpaque": false, "Styles__Whitecard": true, "Styles__HiddenLines": false },
    "FloorPlan__ExcludeCategoryTokens": null,          // null = AppConfig default list
    "FloorPlan__LineworkAsset" : { "Asset__Path": "LayoutEditor/Linework/FloorPlan_001__a91c2f3e-1b2.json", "Asset__Fingerprint": "a91c2f3e-1b2", "Asset__RenderedIso": "2026-09-12T10:00:00Z" }
}
```

### 5.3 Elevation record (ported schema, plus styles, exclusions, face-pick provenance)

```jsonc
{
    "Elevation__Id"            : "Elevation_001",
    "Elevation__Name"          : "North Elevation",
    "Elevation__Order"         : 1,
    "Elevation__Enabled"       : true,
    "Elevation__AzimuthDeg"    : 0,                    // bearing of the side the viewer stands on, world north = -Z
    "Elevation__Mode"          : "elevation",          // "elevation" | "section"
    "Elevation__PlaneOriginMm" : { "PosX": 0, "PosZ": 0 },
    "Elevation__ViewDepthMm"   : null,
    "Elevation__SceneId"       : "Scene_014",
    "Elevation__CameraZoom"    : 1.0,
    "Elevation__CameraTargetMm": { "PosRun": 0, "PosHeight": 1500 },
    "Elevation__Annotations"   : [],
    "Elevation__Dimensions"    : [],
    "Elevation__Styles"        : { "...same keys as FloorPlan__Styles..." },
    "Elevation__ExcludeCategoryTokens": null,
    "Elevation__LineworkAsset" : null,
    "Elevation__SeededFrom"    : "facepick"            // "facepick" | "preset" | "manual", informational only
}
```

### 5.4 Scene-side records created by the drawing systems

A plan or elevation scene is an ordinary scene record with a genuine camera block built by the drawing's framing module (top-down pose for plans, head-on pose for elevations), the group id resolved by name then id then created, the conventional thumbnail path `PresentationMode/Thumbnails/<sceneId>.webp`, and the link key. Update Scene is disabled on drawing scenes; Add Scene From Camera refuses while a drawing is on screen.

### 5.5 DrawingSheet record (Layout Editor, D25 to D34)

```jsonc
{
    "DrawingSheet__Id"          : "Sheet_001",
    "DrawingSheet__Name"        : "Drawing 1",
    "DrawingSheet__Order"       : 1,
    "DrawingSheet__PaperSizeKey": "A3",
    "DrawingSheet__Orientation" : "landscape",
    "DrawingSheet__TitleBlock"  : { "TitleBlock__Style": "modern", "TitleBlock__Fields": { "clientName": "", "siteAddress": "", "drawingNumber": "", "revision": "", "scale": "", "issueDate": "", "drawnBy": "" } },
    "DrawingSheet__ZoomFactor"  : 1.0,
    "DrawingSheet__Layers"      : [
        { "Layer__Id": "Layer_001", "Layer__Name": "Viewports", "Layer__Type": "viewports", "Layer__Order": 1, "Layer__Visible": true, "Layer__Locked": false }
    ],
    "DrawingSheet__Viewports"   : [
        {
            "Viewport__Id"              : "Viewport_001",
            "Viewport__LayerId"         : "Layer_001",
            "Viewport__SceneId"         : "Scene_010",
            "Viewport__Kind"            : "plan",              // "plan" | "elevation" | "section" | "3d"
            "Viewport__FrameMm"         : { "X": 20, "Y": 20, "W": 250, "H": 180 },   // paper mm from the sheet top-left
            "Viewport__ScaleDenominator": 50,                  // 2D only; 20 | 50 | 100
            "Viewport__PanMm"           : { "X": 0, "Y": 0 },  // 2D: drawing-space offset of the window centre
            "Viewport__ImageScale"      : 1.0,                 // 3D only: proportional scale from corner drags
            "Viewport__CropMm"          : { "Left": 0, "Top": 0, "Right": 0, "Bottom": 0 },
            "Viewport__MarkupMode"      : "scene",             // "scene" | "sheet"
            "Viewport__Styles"          : { "...same keys as FloorPlan__Styles..." },
            "Viewport__SnapshotAsset"   : null                 // 3D: { Asset__Path, Asset__Fingerprint }
        }
    ],
    "DrawingSheet__Annotations" : [ { "Annotation__Id": "Anno_001", "Annotation__LayerId": "Layer_002", "Annotation__ViewportId": null, "Annotation__PosXMm": 40, "Annotation__PosYMm": 210, "Annotation__Text": "Notes", "Annotation__SizeMm": 3.5, "Annotation__FontWeight": 400, "Annotation__Color": "#172b3a", "Annotation__Align": "left", "Annotation__LeaderMm": null } ],
    "DrawingSheet__Dimensions"  : [ { "Dimension__Id": 1, "Dimension__LayerId": "Layer_003", "Dimension__ViewportId": "Viewport_001", "...ported dimension keys in the viewport's drawing millimetres..." } ]
}
```

Sheet annotations are positioned in paper millimetres (they may sit outside any viewport); sheet dimensions belong to a viewport and are stored in that viewport's drawing millimetres, so they measure the model and re-scale with the viewport. Text size on the sheet is paper millimetres.

### 5.6 R2 asset keys and the upload route (D20, D36)

Assets live beside the project under the existing R2 prefix `VaApps/Projects/{folderId}/`:

| Asset | Key | Written by |
|---|---|---|
| Scene thumbnail (any scene, including drawings) | `PresentationMode/Thumbnails/{sceneId}.webp` | Dev menu Save Thumbnail / Update Scene |
| Baked linework per drawing | `LayoutEditor/Linework/{drawingId}__{fingerprint}.json` | Projection pipeline on localhost |
| 3D viewport snapshot | `LayoutEditor/Snapshots/{sheetId}__{viewportId}__{fingerprint}.png` | Layout Editor on localhost |

New worker route in `WebApps/ValeVisionGallery/CloudflareWorker/src/index.js` and a new handler `CloudflareHandler__ProjectAsset__.js`:

- `POST /api/editor/projects/{folderId}/assets` with JSON `{ "path": "LayoutEditor/Linework/....json", "contentType": "application/json", "encoding": "base64", "data": "..." }`.
- Auth: the existing `X-Editor-Api-Key` check. Guard: `path` must match `^(PresentationMode/Thumbnails|LayoutEditor/(Linework|Snapshots))/[A-Za-z0-9_.-]+\.(webp|png|json)$`; anything else is 400.
- Writes `VaApps/Projects/{folderId}/{path}` with `httpMetadata.contentType`, then bumps the build manifest with the existing `na_write_build_manifest` helper so live clients pick up a replaced thumbnail. Fingerprinted linework and snapshot names never collide.
- Response `{ ok: true, path, publicUrl }` where `publicUrl` is `{R2Base}/{folderId}/{path}`.

Flask mirror in `WebApps/ValeVisionGallery/server.py`: `POST /api/projects/<path:folder_id>/assets` (multipart, fields `path` and `file`), writing under `Projects/{folder_id}/{path}` with the same path guard. The existing presentation-thumbnail endpoint stays as it is.

Client utility, new: `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (about 200 lines). `Na__AppUtils__R2AssetUpload(blobOrJson, projectCode, relativePath, showToast)` resolves `folderId` through `Na__AppUtils__NormalizeProjectFolderId`, reuses the worker config fetch pattern from `Na__AppUtils__R2SaveProjectJson__.js` (Phase 1 worker write must succeed, Phase 2 Flask mirror is best-effort with a red toast), and returns `{ r2Success, localSuccess, publicUrl }`. Asset reads go through `Na__AppUtils__ResolveAssetUrl(folderId, path)` so the GH Pages fallback applies (the sync pipeline does not copy these assets to GH; a missing asset on GH simply triggers the on-device fallback).

### 5.7 Save path (all phases)

One writer for drawings: `42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`, which owns the in-memory `LayoutEditor__DrawingsData` block. Loaded by `Na__AppFlow__LoadingSequence.js` after project.json resolves (dispatching `na-layouteditor-drawingsdata-loaded` with the raw block; absent block means an empty skeleton). Save = `GET ${origin}/api/projects/${code}` (as the scene editor does) then merge `PresentationMode__SavedCameraScenes` (scene links and groups), `CrossSection__SceneData` (a section drawing's cut, null until something loads or captures one) and `LayoutEditor__DrawingsData`, and hand the whole document to `Na__AppUtils__R2SaveProjectJson`. The Floor Plans, Elevations and Layout Editor dev panels all call this one function; the group editor never saves for itself (it raises `na-presentation-groups-changed` and the scene editor writes, as TrueVision does).

Read-only web viewers never write; the drawings block and assets are read through the normal R2-first project fetch.

### 5.8 Renaming a drawing (10-Sep-2026)

A drawing's name is held in four places, and only the first is obvious:

| Holder | Where | What a stale copy does |
|---|---|---|
| The drawing record | `FloorPlan__Name` / `Elevation__Name` in the drawings block | The panel and every viewport caption read the old name |
| Its carousel scene card | `PresentationMode__Scene__Name` in the presentation block | The card and the drawing disagree, and the two blocks are written by different panels |
| The section binding's KEY | `CrossSection__SceneData__Scenes` is a map keyed by scene name | The cut is orphaned; the drawing opens with no section |
| Every 3D viewport's snapshot fingerprint | `Viewport__SnapshotAsset.Asset__Fingerprint` includes the scene name | The stored R2 picture reads as stale, so the web build draws an empty frame and the PDF loses the image |

`42/Na__DrawView__RenameDrawing__.js` is the one path that writes all four. It sets the record and the card, re-keys the section binding, re-stamps the affected viewports' fingerprints (keeping `Asset__Path`, since the picture has not changed and a new path would orphan a good object), saves the whole document once through `Na__DrawData__Save`, and toasts what it touched. A failed save reverts every in-memory change, so a rename is all or nothing.

Every rename surface routes here: the Floor Plans and Elevations name fields, and the Presentation Scenes editor when the card belongs to a drawing. `Na__FpLink__SyncSceneName` and `Na__ElevLink__SyncSceneName` were deleted rather than left in place, because a helper that does the easy quarter of a rename is how the record and the card drifted apart in the first place.

Cross section bindings are also looked up by scene id before scene name (`Na__SectSceneData__FindEntryKey`), so a binding orphaned by a rename made before this existed is found again on load.

---

## 6. Phase 0 - three r184 upgrade (v2.16.0, D17, D40)

### 6.1 Vendoring

New folder `04__Lib__ThirdParty__VersionLocked/` mirroring the Lantern Designer:

```
04__Lib__ThirdParty__VersionLocked/
    01__Vendor__ThreeJs__v0.184.0/            build/three.module.js, build/three.webgpu.js, build/three.tsl.js, examples/jsm/ (full addons tree as vendored in the Lantern Designer)
    02__Vendor__ThreeMeshBvh__v0.9.9/         src/ (index.js, workers/, webgpu/)
    04__Vendor__ThreeEdgeProjection__v0.0.10/ src/ (index.js, worker/, webgpu/)   at commit f794481
    Vale__Dependencies__ImportMap__Index__.json
    Vale__Dependencies__VersionLock__README__.md
```

Folder numbers 03 (clipper2-js) and 05 (jsPDF) are skipped: clipper is not needed and jsPDF is already vendored under `35__System__PageLayoutSystem/01__Dependencies__VersionLocked`. (Corrected 10-Sep-2026, v2.21.1: three-edge-projection imports clipper2-js at module load, so folder 03 is vendored after all and the import map carries `clipper2-js`; only 05 is skipped.) The three vendor folders are copied from `WebApps/Vale__LanternDesigner/04__Src__Dependencies__VersionLocked/` so both apps run byte-identical libraries. `index.html` import map becomes:

```json
{ "imports": {
    "three"                        : "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js",
    "three/addons/"                : "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/",
    "three/webgpu"                 : "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.webgpu.js",
    "three/tsl"                    : "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.tsl.js",
    "three-mesh-bvh"               : "./04__Lib__ThirdParty__VersionLocked/02__Vendor__ThreeMeshBvh__v0.9.9/src/index.js",
    "three-edge-projection"        : "./04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/index.js",
    "three-edge-projection/worker" : "./04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/worker/index.js",
    "three-edge-projection/webgpu" : "./04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/webgpu/index.js"
} }
```

The standalone `Na__PageLayoutSystem__Layout__.html` does not import three and is unaffected. `04__Lib__ThirdParty__Three` is deleted once Adam confirms the checklist below on the reference project.

### 6.2 Touch points to re-verify (r160 to r184)

| File | What to check |
|---|---|
| `index.html` renderer creation (`logarithmicDepthBuffer: true`, `outputColorSpace = SRGBColorSpace`) | Constructor options unchanged; confirm the colour space default and that no `useLegacyLights` is referenced |
| `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` and `02__Engine__MaxEngine/...` | `EffectComposer`, `RenderPass`, `ShaderPass`, `FXAAShader` import paths and the FXAA uniform names (the FXAA shader was rewritten upstream after r160; the pass keeps `resolution` but the quality profile changed, so compare edge softness on the reference project) |
| `05__RenderPipeline/Na__RenderEffect__ProfileLines__.js` and `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js` | `MeshNormalMaterial` override, `WebGLRenderTarget` options (`samples`, `depthTexture`, `HalfFloatType`), `DepthTexture` constructor |
| `07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js` | Log-depth inversion formula unchanged; `dFdx` availability; render target formats |
| `15__ModelLoader/Na__ModelLoader__MultiModel.js` line 650 | `LineMaterial.onBeforeCompile` patch replaces `#include <logdepthbuf_fragment>`; confirm the chunk name still exists in the r184 LineMaterial fragment shader and the fat-line depth bias still lands (the ground line test) |
| `25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__CameraFollowBillboards__.js` | `onBeforeCompile` shader edit still matches the chunk it searches for |
| `71__System__ExportRenderLayers/01__SystemModules/Na__ExportRenderLayers__ExportLineMaterial__.js`, `GBufferPass__.js`, `RenderTargetPool__.js`, `SceneStateGuard__.js` | Custom shaders with `logdepthbuf_*` chunks; `renderer.outputColorSpace` save and restore; multiple render target creation (if `WebGLMultipleRenderTargets` is used it must move to `WebGLRenderTarget` with `count`) |
| `10__NavigationAndCameras` (OrbitControls consumers) | OrbitControls now extends the `Controls` base: construction with the DOM element still connects; verify `enabled`, `target`, `update()`, `listenToKeyEvents`, and the walk and fly mode hand-offs that toggle `controls.enabled` |
| `15__ModelLoader` GLTFLoader, `Na__Scene__ApplyEnvironmentMap` RGBELoader | Loader APIs unchanged; confirm `KHR_materials_*` glass materials from the GLB builder still land as `MeshPhysicalMaterial` |
| `41__System__CrossSectionView/Na__CrossSectionView__CapGeometry.js` | `THREE.ShapeUtils.triangulateShape` signature unchanged |
| `31__System__VideoStudio` thumbnails and MP4 export | Render-to-canvas copy path unchanged |
| `30__System__ImageExport` tiled renderer | Sub-frustum camera offsets unchanged |

Also bump nothing in a service worker (ValeVision registers none) but remind testers to purge the shared ValeVision Gallery SW on localhost; on GH Pages a hard reload is enough.

### 6.3 Hand-over test list

1. Reference project loads on PureEngine and MaxEngine; no console errors from the import map.
2. Profile lines, fog, SSAO, HDR glass and mirror look as before (compare against a pre-upgrade screenshot of the same scene).
3. Ground line stays visible (fat-line depth bias).
4. Orbit, walk and fly modes, door animation, billboards, distance culling.
5. Image export (viewport and 4K tiled), Layout View tab, Export Render Layers batch on one pass.
6. Cross Sections tool: add, drag, flip, per-scene restore.
7. Video Studio preview and a short MP4.

---

## 7. Phase 1 - Scene Groups (v2.17.0)

### 7.1 New files in `21__System__PresentationMode`

| File | Lines (est.) | Port of |
|---|---|---|
| `Na__PresentationMode__SceneGroups__Data__.js` | 600 | TV `Na__PresentationMode__SceneGroups__Data__.js` (595), verbatim logic: groups read and validate, fallback resolution, per-group ordering, membership rank, playback sort, `NormaliseOrderWithinGroups` (walks the array as given), adjacent-scene stepping across groups, active-group state |
| `Na__PresentationMode__SceneGroups__AppConfig__.json` | 80 | TV config plus the sixth default group `Group_006 Cross Sections` |
| `Na__PresentationMode__UI__SceneGroupSelector__.js` | 480 | TV selector: child of `#naPresentationCarousel`, pill trigger with glyph, name, counter and chevron, upward dropdown, outside-press and Escape dismissal, `na-presentation-group-changed` |
| `Na__PresentationMode__DevMenu__GroupEditor__.js` | 560 | TV group editor: collapsible section, enable, rename, count, reorder, delete, add; raises `na-presentation-groups-changed`; never saves |
| `Na__PresentationMode__DevMenu__SceneRowBuilders__.js` | 350 | New split: the per-scene row builder moved out of the scene editor (name, group dropdown, order, FOV, move speed, easing, actions) so the editor stays inside the 1000-line budget |
| `Na__PresentationMode__DevMenu__SceneReorder__.js` | 300 | New split: per-group array moves (slice bounds, clamped move, drop index) and the native drag-and-drop wiring, taking (scenes, config) as arguments |
| `Na__PresentationMode__DevMenu__ScenePersistence__.js` | 250 | New split: the editor's R2-first project.json save and Flask thumbnail upload, unchanged from scene editor v1.2.0 |
| `Na__PresentationMode__Styles__SceneGroupSelector__.css` | 460 | TV stylesheet re-tokened: `#1a7fc4` active blue, `#99bedd` hover, white 0.96 pill, blur 8, no opacity rule of its own |

### 7.2 Edits to existing modules

- `Na__PresentationMode__ProjectJson__SceneData.js`: `GetSortedScenes` becomes group-aware (delegates to `SortScenesForPlayback` when groups exist); new `Na__PresentationMode__ProjectJson__BroadcastScenesChanged()` re-dispatching `na-presentation-mode-scenes-loaded` with `skipCameraApply: true` from stored state (the drawing panels need it later).
- `Na__PresentationMode__UI__SceneCarousel.js`: render clears every child except `#naPmSceneGroupBar`; `GetVisibleScenes` filters by the active group; empty-group message; prev and next step through `GetAdjacentScene` with the three cases (ungrouped wrap, active outside the displayed group, normal); listens to `na-presentation-group-changed` (ignores its own source); on scenes-loaded re-resolves the opening group only when the current selection is no longer valid; **router list** `Na__PresentationMode__UI__AddSceneNavigationRouter(fn)` and `RouteScene` inserted ahead of `AnimateToScene` in the single `NavigateToScene` path that card clicks and chevrons share.
- `Na__PresentationMode__DevMenu__SceneEditor.js`: group editor container at the top of the panel; rows clustered under group headings (folded by default, open ids remembered); Group dropdown per row (enabled groups only); Position field and drag confined to the scene's own group; `na-presentation-groups-changed` listener runs sort, normalise, commit, save; `+ Add Scene From Camera` files the new scene into the group the carousel is showing; Save All normalises within groups first. Materialising auto-built SketchUp scenes on first save is already what Save All does; nothing new there, but the `PresentationMode__SavedCameraScenes__Source` marker is kept so the orbit-pivot rule keeps working.
- `index.html`: import and `await Na__PresentationMode__UI__InitializeSceneGroupSelector()` immediately after the carousel initialises (it mounts inside the carousel); the PWA install bar clearance list gains `#naPmSceneGroupBar`.
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`: import the selector sheet directly after the carousel sheet.
- `31__System__VideoStudio/Na__VideoStudio__Timeline__Controls.js`: no change needed; the bar is a child of the carousel container and hides with it. Verify.

Not applicable in ValeVision: TrueVision's per-scene `NavigationMode` (walk or fly on arrival). ValeVision scenes do not carry it; the "orbit on arrival" rule is not ported.

Superseded 11-Sep-2026 (v2.21.17): Adam asked for scenes and Video Studio keyframes to keep their navigation mode, so `PresentationMode__Scene__NavigationMode` and the orbit-on-arrival rule are now ported, with pose-preserving switching. Page load still opens in orbit. See the parity ledger section "Per-Scene Navigation Modes".

### 7.3 Hand-over test list

1. A project with no groups behaves exactly as before (no bar, same order).
2. Open Dev Tools, Presentation Mode Scenes: the Scene Groups section seeds six groups in memory only; closing without saving writes nothing.
3. Assign scenes to two groups and save: the bar appears, counts read "N Views", the dropdown re-aims the strip without moving the camera, chevrons roll across group boundaries and wrap.
4. Disable a group holding scenes: the confirm names the fallback and the scenes move.
5. Delete a middle group: ids do not collide on the next add.
6. Mobile width 375 px: the pill scales down.
7. Open a Video Studio path: the carousel and pill hide; close it: both return.

---

## 8. Phase 2 - Drawing substrate, Floor Plans, Annotations, Dimensions, client measuring (v2.18.0)

### 8.1 `42__System__DrawingViewCore` (the seam)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__DrawView__ActiveView__.js` | 420 | Port of TV ActiveView: adapter contract (`getCamera`, `getUnitsPerPixel`, `planeMmToWorldUnits`, `screenOffsetToPlaneMm`, `panByPlaneUnits`, `zoomByFactor`, optional `kind`, `onRelease`), `ReleaseOtherKind`, `ProjectPlaneMm`, `ScreenToPlaneMm`, event `na-drawing-view-changed` |
| `Na__DrawView__Navigation__.js` | 480 | Port of TV Navigation: pan follows the cursor, zoom about the cursor with one corrective pan, pinch, wheel `passive:false`, `onSettled`, `SetSuppressed` |
| `Na__DrawView__MarkupMount__.js` | 410 | Port of TV MarkupMount: the fixed mount and unmount order, authoring and client branches, `SyncFrame`, `SyncLayerBox` |
| `Na__DrawView__MarkupFocus__.js` | 260 | TV `Na__FloorPlan__MarkupFocus__` relocated here (first-refusal arbiter with capability probes) so 44 and 45 do not import from 43 |
| `Na__DrawView__SceneLinkRow__.js` | 130 | Port of TV SceneLinkRow ("linked to" or "Not in the carousel" plus Add To Scenes) |
| `Na__DrawView__SectionAdapter__.js` | 320 | **New (D07).** Presents TrueVision's engine surface (`UpsertHorizontalPlane(id, cutHeightMm, depthMm)`, `UpsertVerticalPlane(id, nx, nz, distanceMm, depthMm)`, `SetPlaneDistanceMm(id, mm, liveDrag)`, `SetActivePlane`, `RemovePlane`, `RenderOverlay`, `HandleResize`) on top of `Na__CrossSectionView__SystemLogic.js`, see 8.2 |
| `Na__DrawView__ComposerPreset__.js` | 380 | **New (D12).** Enters and leaves the drawing render preset on the live composer, see 8.3 |
| `Na__DrawView__MaterialPreset__.js` | 300 | **New (D33, D40).** Reversible material overrides for Glass Transparency Off and Whitecard, see 8.4. Built as a self-contained stash-and-restore over the mesh materials rather than the MaterialsSystem whitecard pass, so exit never depends on loading-sequence internals |
| `Na__DrawView__ConfigState__.js` | 310 | **New (Phase 3).** One reader for the drawing config (main config over the system JSON over fallbacks) for the presets and the adapter; carries the section appearance (9.4) |
| `Na__DrawView__StyleRows__.js` | 160 | **New (Phase 3).** The four style toggles and the exclusion field built from record accessors, shared by the plan and elevation rows |
| `Na__DrawView__ProjectData__.js` | 380 | **New (5.7).** Owns `LayoutEditor__DrawingsData`, load event, skeleton, one save function |
| `Na__DrawView__Transitions__.js` | 260 | New split shared by both mode controllers: suspend and resume the 3D systems (orbit off, distance culling off, walk and fly released), the flight helper that hands a synthetic pose to `Na__PresentationMode__Camera__AnimateToScene`, and the carousel router registration |
| `Na__DrawView__AppConfig__.json` | 60 | Drawing background colour, 2D profile-line keys, transition defaults shared by plans and elevations |
| `Na__DrawView__Styles__DevMenu__.css` | 40 | Scene link row rules (relocated from the TrueVision elevation sheet so Phase 2 has them) |

The TrueVision `Na__DrawView__ProfileLines__` overlay is not ported: under D12 the composer route uses the existing ortho-aware `Na__2dProfileLines__Create` pre-pass.

### 8.2 Section adapter over the existing Cross Sections logic (D07)

The existing system is multi-plane, gizmo-driven and bound to carousel scenes by name. A drawing needs exactly one plane, no gizmo, live distance updates from a slider, and no interference with the live tool's own sections. The adapter:

- On drawing entry: `Na__CrossSection__SerializeSections()` snapshots the live tool's state; `RemoveAllSections()`; if the project has the feature disabled, `SetFeatureEnabled(true)` for the duration (restored on exit). Registers the drawing plane via `AddSectionFromHit(planePoint, normal, mode)` with `mode = 'PLAN'` for a floor plan (normal `(0,-1,0)`, point at the cut height) or `'UPRIGHT'` for a section (normal `(-nx, 0, -nz)`, point at `normal * distance`), names it `DrawingCut__<recordId>`, hides its gizmo with `SetSectionGizmoVisible(id, false)`, applies the drawing view depth through `SetSliceDepthM`.
- Live slider drags call a **new additive export** in `Na__CrossSectionView__SystemLogic.js`: `Na__CrossSection__SetSectionPositionMm(id, positionMm, liveDrag)`, which does exactly what the internal drag-move path does (write `plane.constant`, update the back plane and transforms, throttled cap recompute, exact recompute when `liveDrag` is false). About 40 lines, placed beside the drag handlers. A second small export `Na__CrossSection__GetSectionById(id)` for the adapter's checks.
- On drawing exit: remove the drawing section, restore the snapshot with `ApplySerializedSections`, restore the feature flag.
- Ordering hazard: `Na__CrossSectionView__SceneData.js` clears every section on `na-pm-scene-activated` when a scene has no binding. The drawing flight uses a synthetic approach scene, so the transition module dispatches the activated event and SceneData would wipe the cut a moment after the adapter applied it. Fix: the synthetic scene objects carry `PresentationMode__Scene__IsDrawingApproach: true`, `Na__PresentationMode__Camera__SceneTransition.js` forwards it in the event detail, and `RestoreForScene` returns early for it. Both are two-line edits recorded in the PORT NOTE and the ledger.
- The overlay draw stays where it is (after the composer, via `Na__SectionClipping__GetOverlayRenderer()`), so cap fills and profile outlines already work with the ortho camera.

### 8.3 Composer preset (D12)

`Na__DrawView__ComposerPreset__Enter({ orthoCamera, styles })` and `Exit()`:

- Finds the composer's `RenderPass` (the legacy tool's `passes[i].isRenderPass` walk) and swaps `renderPass.camera` to the drawing camera; disables `controls`.
- Fog: sets `fogPass.enabled = false` (PureEngine `insertFogPass` returns the pass; the preset stores the reference) and clears `scene.fog`; AO under MaxEngine: `pipeline.toggleAo(false)`; both restored on exit.
- Background: swaps `scene.background` for the drawing paper colour from `Na__DrawView__AppConfig__.json` (white) and restores it.
- Profile lines: creates the ortho-aware normals pre-pass with `Na__2dProfileLines__Create` (as the legacy tool does), publishes it to the render loop, and sets a fixed edge width from `RenderEffect__ProfileLines__Drawing2dEdgeWidth` (new AppConfig key, Appendix C) through `Na__LineworkSettings__SetProfileLineFactor` so the LineworkSettings compensation still applies to exports; restores the dynamic width on exit.
- Distance culling off and walk, fly, door proximity, billboards skipped for the duration (the render loop change below).
- The render loop in `Na__AppFlow__LoadingSequence.js` gains one branch ahead of the legacy `ElevationActive` flag: when `Na__DrawView__GetCamera()` returns a camera, the frame uses it for `renderProfileNormals` (2D variant), skips the 3D per-frame work, runs `composer.render()`, then the section overlay with the drawing camera, then `Na__DrawMarkup__SyncFrame()`, then the projected linework overlay sync (Phase 4). The legacy elevation flag path stays for the untouched tool.
- Thumbnails: `Na__PresentationMode__Thumbnail__Renderer.js` already renders "one frame through the active composer"; the drawing branch is therefore automatic once the RenderPass camera is swapped, but the section overlay must be drawn into the same frame before the framebuffer copy. One edit: after `composer.render()` in the thumbnail path, call the overlay renderer with the active camera. Markup layers are DOM and are not captured (deliberate, as TrueVision).

### 8.4 Material preset (D33, D40)

- **Whitecard** on a drawing or viewport: if MaxEngine is active, apply `Na__MaterialsSystem__ApplyWhitecardToIndexedMaterials` to every model group for the render and restore with `Na__MaterialsSystem__RestoreOriginalMaterials` plus the engine's own materials pass on exit. Under PureEngine it is already the look. Because the swap walks the model once per entry and exit, it runs on drawing entry, not per frame.
- **Glass Transparency Off**: for every material flagged transparent (exempt `MAT000E__` glazing and MaxEngine glass), stash the material on `mesh.userData.Na__DrawPreset__OriginalMaterial` and substitute a shared opaque white `MeshBasicMaterial` (with the whitecard polygon offset) for the render; restore on exit. Glass then reads as flat panes with their SketchUp edges.
- Both are also what the projection stage reads (Phase 4): with Glass Transparency Off the glazing occludes; with it on, glazing draws its pane edges but does not occlude (the lantern engine's rule).

### 8.5 `43__System__FloorPlanViews`

Port of TrueVision 42 with the D08 data move and the D07/D12 seams:

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__FloorPlan__AppConfig__.json` | 90 | TV config plus `FloorPlanViews__SceneGroup__TargetGroupId: "Group_004"`, plus the default Ground Floor Plan label |
| `Na__FloorPlan__ConfigState__.js` | 340 | Verbatim pattern |
| `Na__FloorPlan__ProjectJson__Data__.js` | 540 | Records now read from `LayoutEditor__DrawingsData__FloorPlans` through `Na__DrawView__ProjectData__`; scene link keys unchanged on the scene side; styles and exclusion accessors added |
| `Na__FloorPlan__ModeController__.js` | 600 | Enter, flip, exit, edit mode, refresh, resize; cut through the SectionAdapter, camera through the ComposerPreset, materials through the MaterialPreset; routing and 3D suspension delegated to `DrawView__Transitions__` |
| `Na__FloorPlan__OrthoCamera__.js` | 380 | Verbatim: look down, up = -Z, fit to bounds, pan never touches Y, `GetUnitsPerPixel` |
| `Na__FloorPlan__Framing__.js` | 220 | Verbatim: model measure, approach height from FOV, scene-shaped camera block, synthetic approach scene (with `IsDrawingApproach`) |
| `Na__FloorPlan__SceneLink__.js` | 340 | Verbatim: create scene, group resolution (name, id, first enabled, auto-enable, seed defaults), thumbnail path at creation, both-direction link |
| `Na__FloorPlan__DevMenu__Editor__.js` | 600 | Rows, Add Floor Plan, Seed From Model Storeys (degrades to `NoStoreysMessage`, D11), **Add Ground Floor Plan** quick action (datum 0), Let clients measure, Save Floor Plans, Save Thumbnail (upload through `R2AssetUpload`, D36) |
| `Na__FloorPlan__DevMenu__RowBuilders__.js` | 360 | Verbatim plus the Styles row (four toggles, D33) and the exclusion tokens field (D19) |
| `Na__FloorPlan__Styles__DevMenu__.css` | 120 | Verbatim classes `na-fp-dev__*` |

Storey detection: ValeVision has no storey system; `MeasureStoreys` scans loaded model group names for `Storey__` tokens (the TrueVision GLB convention) and returns an empty list otherwise.

### 8.6 `44__System__PlanAnnotations` and `45__System__PlanDimensions`

Ported near-verbatim from TrueVision 43 and 44 (21 files), renamed, with these divergences recorded in the PORT NOTEs:

- Imports of the focus arbiter point at `42__System__DrawingViewCore/Na__DrawView__MarkupFocus__.js`.
- `Na__AppUtils__SnapshotHistory` is ported as `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` (273 lines, verbatim).
- The dimension data module splits into `Na__PlanDimensions__Data__.js` (records, snapping, formatting, session array) and `Na__PlanDimensions__ConfigState__.js` (config fetch and getters) to respect the budget; the editor splits into `__Editor__.js` (state, placement, selection, crosshair wiring) and `__EditorPreview__.js` (the rubber-band preview nodes).
- `--Vale_HeaderHeight` exists in ValeVision (60 px, 48 px on small screens), so the toolbar and client bar land under the header as in TrueVision.
- Hotkeys stay scoped listeners attached only while a drawing is mounted (capture phase, `stopImmediatePropagation`), so the global `Na__AppUtils__ValeVision__HotkeyHandler__` never double-fires. The help panel gains a "Drawing markup" entry group in `Na__ValeVision__HotkeysDictionary__.json` flagged `Na__Hotkey__Advanced: true` with a no-op action id, documented as contextual.
- Client measuring (D13) is the same engine gated three ways (disclaimer gate, forced colour, session array); the grant lives at `LayoutEditor__DrawingsData__ClientDimensionsEnabled` and is edited from the Floor Plans panel.

### 8.7 Dev menu and shell wiring

- `index.html`: two new `<li>` sections in the Dev Tools list following the established static shell: `naFloorPlanDevItem / naFloorPlanDevToggle / naFloorPlanDevPanel` (Phase 2) and `naElevationDevItem / naElevationDevToggle / naElevationDevPanel` (Phase 3). Imports and `Initialize` calls in the Engine Entry Points region after the Presentation Mode block: `Na__FloorPlanMode__Initialize({ camera, controls, canvas, modelRoot }).then(enabled => enabled && Na__FloorPlan__DevMenu__Initialize({ modelRoot, camera, showToast }))`.
- `Na__AppFlow__LoadingSequence.js`: dispatch `na-layouteditor-drawingsdata-loaded`; the render loop branch of 8.3; resize handler calls `Na__FloorPlanMode__HandleResize`.
- Navigation toolbar: hides from the start of a drawing transition and returns on exit (listens to `na-floorplan-mode-changed`), as TrueVision's does, so it never sits over the annotation toolbar.
- CSS index: import the floor plan, annotation and dimension sheets in that order.

### 8.8 Hand-over test list

1. Dev Tools, Floor Plans: Add Ground Floor Plan on the reference project; a card appears in the Floor Plans group immediately.
2. Preview: the model cuts at datum plus 1200 mm, the camera rises and flips to the ortho drawing, white background, no fog or AO, profile lines at constant weight, cap fill and outlines present.
3. Drag the floor level slider while previewing: the cut follows live and lands exact on release.
4. Annotate: add, drag, double-click edit, Enter commits, Escape reverts, Ctrl+C/V/Z/Y, Delete. Toolbar size and weight fields.
5. Dimensions: two-click placement with crosshair, axis guide with arrow keys, Shift constrains, O toggles ortho, Alt frees, double-click vertex editing, undo stacks stay separate.
6. Save Floor Plans: R2 green toast; reload shows the plan, its framing and its markup.
7. Save Thumbnail: the card image is the drawing (upload route deployed).
8. Let clients measure on, open the project on the web build: the client bar appears, the disclaimer gates the first measurement, measurements are red and never saved.
9. Exit to a 3D scene from the carousel: orbit returns, sections restore to the live tool's state, materials restore under MaxEngine.
10. Cross Sections tool sections bound to a 3D scene are untouched after visiting a plan.

---

## 9. Phase 3 - Elevations and Sections (v2.19.0)

### 9.1 `46__System__ElevationViews`

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__Elevation__AppConfig__.json` | 120 | TV config plus `ElevationViews__SceneGroup__ElevationTargetGroupName: "Elevations"` / `Id: "Group_005"` and `...__SectionTargetGroupName: "Cross Sections"` / `Id: "Group_006"` (D28), face-pick and gizmo drag keys |
| `Na__Elevation__ConfigState__.js` | 440 | Verbatim pattern |
| `Na__Elevation__ProjectJson__Data__.js` | 560 | Records from `LayoutEditor__DrawingsData__Elevations`; `GetAxes`, `GetPlaneDistanceMm`, `WorldToRunMm`, `RunToWorldMm` verbatim; styles, exclusions, `SeededFrom` |
| `Na__Elevation__ModeController__.js` | 600 | Enter, flip, exit, refresh; section mode through the SectionAdapter's vertical plane; camera and materials through the presets; group target by mode |
| `Na__Elevation__OrthoCamera__.js` | 420 | Verbatim: basis-driven eye placement, projected-span framing, pan never touches the view axis |
| `Na__Elevation__Framing__.js` | 300 | Verbatim |
| `Na__Elevation__PlaneGizmo__.js` | 440 | Verbatim readout gizmo plus an additive face mesh export for the grip |
| `Na__Elevation__GizmoGrip__.js` | 340 | **New (D16).** The drag grip (9.2): raycast against the gizmo face mesh only, drag projected onto the plane normal, live and commit callbacks, orbit paused for the drag |
| `Na__Elevation__FacePick__.js` | 320 | **New (D16).** Face-pick seeding: reuses the legacy tool's raycast rules (4 px click threshold, first mesh hit, normal projected to XZ, horizontal faces fall back to `(0,0,1)`), converts the normal to a bearing (`azimuth = atan2(nx, -nz)` in the elevation convention), sets the plane origin to the hit X/Z, seeds or updates a record, then shows the gizmo |
| `Na__Elevation__DevMenu__Editor__.js` | 600 | TV editor plus **Pick Face** (new elevation) and **Re-pick** (existing row) buttons, Seed N/E/S/W, Save Elevations, Save Thumbnail |
| `Na__Elevation__DevMenu__RowBuilders__.js` | 520 | Verbatim rows (name, compass, bearing, Elevation/Section, Plane X and Z sliders, derived depth readout, Centre on model, View depth, actions) plus the Styles and exclusion rows |
| `Na__Elevation__SceneLink__.js` | 400 | TV logic; target group chosen by mode; creates the group when missing |
| `Na__Elevation__Styles__DevMenu__.css` | 110 | Verbatim minus the scene row rules (in 42), imported after the floor plan sheet |

Built 09-Sep-2026 as v2.19.0. ConfigState, OrthoCamera, Framing and PlaneGizmo are generated ports with the patches above; the rest are adapted or new.

### 9.2 Loose editing with the gizmo (D16)

(02-Oct-2026 note, W2-99: superseded in v2.71.4 by TrueVision's Drawing Planes and 2.1.0 Elevations editor - see D16; the paragraph is kept as it was built.) The TrueVision gizmo is a readout. Here it also carries a grip: pointer-down on the plane mesh (raycast against the gizmo only, `layers.set(1)` and `userData.naCrossSectionHelper` kept so it never prints or inks), drag projected onto the plane's own normal, live update of `Elevation__PlaneOriginMm` along that normal (the origin moves by `delta * normal`, so the run anchor stays at the world origin), throttled section recut through the adapter when in Section mode, exact recut on release, sliders and the depth readout refreshed live. The sliders remain the precise path and the values shown are what gets saved. Orbit controls are disabled for the duration of a grip drag and re-enabled on release, exactly as the Cross Sections tool does.

### 9.3 Hand-over test list

1. Seed N/E/S/W: four cards in the Elevations group; each previews head-on with north up on plans agreeing about which wall is which.
2. Pick Face on a rotated building: bearing and origin match the picked wall; the gizmo sits on the wall.
3. Drag the gizmo grip in Section mode: the cut follows; release lands exact; sliders show the new values.
4. Switch a row to Section: the card moves to the Cross Sections group on save.
5. Flip between two elevations and a plan without markup bleed; exit to 3D and back.
6. Annotate and dimension an elevation: run and height axes behave (height reads up the sheet).
7. Save Elevations, reload, Save Thumbnail.
8. Preview a plan and a section: the cut face and profile draw in the Doous dark grey (9.4); leave the drawing and the Cross Sections tool's own colours and sections are back.

### 9.4 Section appearance (added 09-Sep-2026)

Every plan cut and section drawing is drawn with the section colours the Doous project uses on its section scenes (fill `#505050`, line `#505050`, width 2 px), which read better than the tool's light default. They are the built-in defaults of `Na__DrawView__ConfigState__` and of `DrawingView__Section__Config` in `Na__DrawView__AppConfig__.json`, and `DrawingView__Config__SectionFillColour`, `SectionLineColour` and `SectionLineWidthPx` in `Na__AppConfig__Main.json` override them. The adapter sets them while the live tool is parked and the tool's own colours come back with its sections.

The adapter also gained `SuspendLiveTool` (park and hold, with or without a plane, so a plain elevation shows the building whole and a section-to-elevation flip does not rebuild the author's sections) and `Release` (the one way a drawing hands the tool back). Both mode controllers call them on entry and exit.

---

## 10. Phase 4 - Projected linework on scenes (v2.20.0)

### 10.1 `50__System__ProjectedLinework`

| File | Lines | Source | Change |
|---|---|---|---|
| `Na__ProjectedLinework__ClipKernel__.js` | 637 | LD ClipKernel | Verbatim. Zero imports. |
| `Na__ProjectedLinework__FlatBvh__.js` | 410 | LD FlatBvh | Verbatim |
| `Na__ProjectedLinework__ClipWorker__.js` | 154 | LD ClipWorker | Verbatim (relative import of the kernel only) |
| `Na__ProjectedLinework__WorkerPool__.js` | 407 | LD WorkerPool | Verbatim |
| `Na__ProjectedLinework__Scheduler__.js` | 154 | LD Scheduler | Verbatim |
| `Na__ProjectedLinework__DiffHarness__.js` | 248 | LD DiffHarness | Verbatim; kept so kernel changes are accepted by `Diff('cpu','legacy')` |
| `Na__ProjectedLinework__SoupBuilder__.js` | 480 | LD SoupBuilder | Adds `ViewMapFromBasis` returning either a signed-permutation map (fast path) or a 3x3 rotation, and a rotation branch in `BuildViewSoup` (D40) |
| `Na__ProjectedLinework__EdgeExtractor__.js` | 600 | LD EdgeExtractor | Rotation branch in `ToViewSpace`; intersection edges cached per model state and shared only across permutation views; authored-edge override retained for future GLB metadata |
| `Na__ProjectedLinework__AuthoredEdges__.js` | 260 | New | Ingests the SketchUp linework GLB `LineSegments2` geometry as the "authored" edge class (D18), occlusion-clipped like every other edge |
| `Na__ProjectedLinework__StageSampler__.js` | 420 | LD StageSampler | Samples the live model root (no clone): visible meshes only, skips helpers (`naCrossSectionHelper`, gizmos, grid lines, fog planes, billboards, linework roots), expands `InstancedMesh` instances, applies the exclusion tokens (D19), treats transparent materials as non-occluding unless Glass Transparency Off is set, clips triangles against the drawing cut plane and back plane so the projection respects the section |
| `Na__ProjectedLinework__ModelStage__.js` | 260 | LD ModelStage | Becomes a fingerprint and bounds helper (world matrices refreshed, BVH priming with three-mesh-bvh for the intersection pass) |
| `Na__ProjectedLinework__Projector__.js` | 480 | LD Projector | Basis from a drawing definition: plan = viewer +Y with north up; elevation from `GetAxes(azimuth)`; backend dispatch cpu / webgpu / legacy; `NeedsIntersectionEdges` |
| `Na__ProjectedLinework__WebGpuBackend__.js` | 322 | LD | Verbatim, opt-in, dynamic import |
| `Na__ProjectedLinework__CpuBackend__.js` | 300 | LD CpuBackend | `IncludeHiddenEdges` from the record's styles (D21) |
| `Na__ProjectedLinework__RasterPreview__.js` | 301 | LD RasterPreview | Verbatim (private renderer, ortho frustum = bounds, up = -Z) |
| `Na__ProjectedLinework__Pipeline__.js` | 600 | LD Pipeline | Split: scheduling, two-pass render, caches; fingerprint = model build token plus model group visibility plus record hash (datum, offset, depth, azimuth, origin, mode, styles, exclusions) |
| `Na__ProjectedLinework__Persistence__.js` | 380 | LD LineworkStore + new | Same block shape and three load gates; stores to R2 through `R2AssetUpload` on localhost (D20), caches in IndexedDB on device, records `FloorPlan__LineworkAsset` / `Elevation__LineworkAsset` |
| `Na__ProjectedLinework__SvgOverlay__.js` | 340 | LD SvgLayer | An `<svg id="naProjectedLineworkLayer">` above the canvas and below the markup layers (z 38), positioned from the canvas offset box, re-projected every frame through the DrawView broker; four line classes as presentation attributes: `visible`, `hidden` (dashed), `authored`, `section` (cap outline weight) |
| `Na__ProjectedLinework__ConfigAccess__.js` | 170 | LD ConfigAccess | Path and prefix changes |
| `Na__ProjectedLinework__DevMenu__Controls__.js` | 380 | LD ToolbarButton + new | Dev Tools section: enabled, backend, force render, bake to R2, clear cache, run Diff harness, timings table |
| `Na__ProjectedLinework__ViewDefinition__.js` | 330 | New | A drawing record read into a view: basis (identity for plans, derived from the azimuth for elevations), viewer vector, cut plane and depth (kept side away from the viewer), style flags, exclusion tokens, record hash and fingerprint |
| `Na__ProjectedLinework__ExportCompositor__.js` | 120 | New | Rasterises the overlay SVG at export size and draws it over the exported image |
| `Na__ProjectedLinework__AppConfig__.json` | 140 | LD config | Render, Performance, Preview, Persistence, Appearance per class, `Exclusions__DefaultCategoryTokens`, `Model__BuildToken` |
| `Na__ProjectedLinework__Styles__Main__.css` | 120 | LD css | Layer and preview rules only |

Units: ValeVision scene units are metres with +Y up, which is the lantern engine's stage space; `ScaleDivisor = 0.001` yields drawing millimetres. The kernel epsilons are absolute and correct at metre scale.

Built 09-Sep-2026 as v2.20.0. Hidden Lines (D21) means two things on a drawing: the parts of the model edges the occluders cover, and every edge between the viewer and the cut (above a plan's datum, in front of a section plane), both dashed. The section class is the outline where cut material meets the cut plane, never occlusion-tested because the cut is by definition the nearest thing to the viewer; crossings of transparent material join the visible class as thin lines. The legacy and WebGPU backends ignore the cut, so the Diff harness compares the CPU backend against the vendored generator on the uncut model. The worker file is loaded by relative URL from the worker pool, so the clip kernel chain stays import-free of three.js as the Lantern Designer requires.

### 10.2 Integration with plan and elevation scenes

- On drawing entry (after the composer preset), the pipeline schedules the drawing's views: the raster preview is not needed on screen because the composer render already is the underlay; the overlay shows the cached exact linework immediately if the fingerprint matches, otherwise it computes in workers and paints when done. The debounce and abort-on-change rules apply to slider drags.
- Style toggles per record (D33): Projected Linework shows or hides the overlay; Profile Linework Effect toggles the Sobel overlay in the composer preset; Glass Transparency Off and Whitecard drive both the render and the sampler's occluder rule.
- Image export of a drawing scene (Export Image while a drawing is on screen) composites the SVG overlay onto the exported raster at export resolution (the tiled renderer already draws the section overlay per tile; the SVG is rasterised once at output size and drawn over the assembled image).
- Baking (D20): Save Floor Plans / Save Elevations trigger `EnsureRendered` for every drawing whose asset is missing or stale, upload the linework JSON, and write the asset reference into the record before the project.json save. The dev section shows per-drawing status (cached, stale, missing).

### 10.3 Performance guard rails

- Below 8000 edges the pool is not woken; above it, one worker per core minus one, four shards per worker.
- Structured-cloning the soup per worker is the ceiling on large houses; the sampler restricts to the cut half-space and the exclusion list first, and the config carries `Performance__MaxTrianglesForExactLinework` above which the drawing keeps the preview-quality overlay from the raster path only and reports why.
- The intersection pass is skipped when the cut plane changes only in position (it is view-invariant and model-invariant), so slider drags re-clip but do not re-intersect.

### 10.4 Hand-over test list

1. Open a plan: exact linework appears over the flat render within a few seconds on the reference project; timings logged.
2. Toggle Projected Linework, Profile Linework Effect, Glass Transparency Off and Whitecard on the row: the drawing responds and the setting survives a save.
3. Hidden lines on: dashed class appears for elements above the cut.
4. Bake: the dev status turns cached, the asset exists on R2, a reload on the web build shows linework without computing.
5. A free-bearing elevation (for example 37 degrees) projects correctly via the rotation path.
6. `Diff('cpu','legacy')` on the plan view reports no moved segments beyond rounding.

---

## 11. Phase 5 - Layout Editor (v2.21.0)

### 11.1 Shell, mode and tabs (D22, D23, D24)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__LayoutEditor__TabStrip__.js` | 320 | `<nav id="naLayoutEditorTabStrip">` under the header: "3D Model" plus one tab per sheet in order; on localhost a "+" tab creates a sheet; read-only on the web (tabs still switch). Height published as `--Vale_LayoutTabStripHeight` so the canvas, menus and carousel shift down |
| `Na__LayoutEditor__ModeController__.js` | 480 | Enter and leave the editor: hides the carousel, group bar, nav toolbar, help and export overlays; shows `#naLayoutEditorHost` full-bleed; keeps the WebGL canvas alive but hidden (`display` untouched, `visibility: hidden`) so snapshots render offscreen; listens for `na-layouteditor-drawingsdata-loaded` |
| `Na__LayoutEditor__SheetModel__.js` | 520 | Sheet, layer, viewport, annotation and dimension records; ids; normalise; `Create*`, `Delete*`, `Reorder*`; reads and writes through `DrawView__ProjectData__` |
| `Na__LayoutEditor__ScaleManager__.js` | 260 | LD ScaleManager trimmed to 20/50/100 (D27): mm on paper to model mm, `ScreenPixelsPerMm`, scale labels |
| `Na__LayoutEditor__SheetLayout__.js` | 300 | LD SheetPdfLayout trimmed: paper rect, margins, title block band per style; viewports are free rectangles in paper mm (no fixed grid) |
| `Na__LayoutEditor__SheetSurface__.js` | 480 | Paper element scaled with a CSS transform plus an explicit scaler size (true paper pixels for export), grey stage from `--Vale_GreyCanvasBackground`, viewport hosts, SVG chrome overlay, markup hosts per viewport |
| `Na__LayoutEditor__Navigation__.js` | 300 | Wheel zoom about the cursor, middle or right drag pan, touch pinch; left button free for editing (LD SheetManager rules) |
| `Na__LayoutEditor__AppConfig__.json` | 220 | Sheet sizes, default A3 landscape, margins, title block styles and field rows, scales, handle sizes, panel widths and bounds, PDF settings |
| `Na__LayoutEditor__Styles__Main__.css` | 420 | Stage, paper, tab strip, handles |
| `Na__LayoutEditor__Styles__Panels__.css` | 380 | Left and right columns, foldable sections, resize handles, layer rows |

### 11.2 Title block (D26)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__LayoutEditor__SheetChrome__.js` | 520 | LD SheetChrome pattern: one flat list of paper-mm primitives (`Rect`, `Line`, `Text`, `Image`) rendered to the SVG overlay and to jsPDF; cap-height baselines; text measured through jsPDF metrics |
| `Na__LayoutEditor__TitleBlock__Modern__.js` | 300 | Vector title block: Vale logo (`../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png`), single-row field strip from config rows (client, site address, drawing number, revision, scale, date, drawn by) |
| `Na__LayoutEditor__TitleBlock__Classic__.js` | 260 | Scan-based: an `Image` primitive stretched to the full sheet from a per-size asset map (`A3` = the existing `35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png`; A4, A2, A1 fall back to the A3 scan until their scans are added), with text fields overlaid at configured paper-mm anchors per size |

Fields default from project.json (`projectName`, `projectCode`, client name where present) and are editable per sheet.

### 11.3 Viewports (D28, D29, D30)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__LayoutEditor__Viewport2d__.js` | 560 | A window onto a plan, elevation or section at a locked scale: hosts the drawing's raster underlay (the scene rendered through the composer preset offscreen at the required pixels per paper mm, cached by fingerprint), the projected linework SVG (from the cached asset or on-device compute) with its viewBox spanning exactly `frame body mm x scale denominator` of model space, and the markup host. Every handle crops or expands the window; a drag moves the frame; double-click enters the content and a drag then pans `Viewport__PanMm` (revised v2.21.7) |
| `Na__LayoutEditor__Viewport3d__.js` | 420 | Raster snapshot from the scene camera via `Na__UiFeature__RenderToDataUrl` (tiled renderer for export DPI) with the material preset applied; every handle crops, Shift on a corner scales proportionally (`Viewport__ImageScale`) (revised v2.21.7); snapshot cached by fingerprint and uploaded on localhost (D36) |
| `Na__LayoutEditor__ViewportHandles__.js` | 480 | Eight handles, hit test, drag state, cursor feedback, touch; lifted from `Na__PageLayoutSystem__Controls__Pc__.js` and `__TouchScreen__.js` conventions; body class carries `cursor` and `user-select` during a drag |
| `Na__LayoutEditor__SnapshotRenderer__.js` | 360 | Offscreen rendering for both viewport kinds with the style toggles, using the existing pipeline state via the lazy getter; restores every renderer state it touches |
| `Na__LayoutEditor__MarkupBridge__.js` | 520 | D34 both modes: "Scene" mounts the ported markup engines on the viewport with an adapter mapping paper px to drawing mm at the viewport scale (so annotations and dimensions edit the scene record); "Sheet" mounts them on the sheet's own layers; Import From Scene copies scene markup into the chosen layer |

### 11.4 Panels (D31, D32)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__LayoutEditor__PanelHost__.js` | 420 | Left and right columns with drag-to-resize widths (CSS custom properties `--Vale_LayoutLeftPanelWidth`, `--Vale_LayoutRightPanelWidth`, seeded from config on first apply), foldable sections with drag-to-resize heights, delegated input handling by `data-na-control` and `data-na-role` |
| `Na__LayoutEditor__Panel__Layers__.js` | 480 | Left panel: rows with eye, lock, name (double-click rename), type tag select, drag and arrows reorder (top is frontmost), add and delete, filter by type |
| `Na__LayoutEditor__Panel__ViewportSettings__.js` | 400 | Scene dropdown grouped by scene group (plans, elevations, sections, 3D), three-way scale toggle (2D only) showing the active scale, crop readouts, name, markup mode toggle, Import From Scene |
| `Na__LayoutEditor__Panel__Text__.js` | 340 | Font (Open Sans), size in paper mm, weight 300/400/600, colour, alignment, leader on or off; applies to the selection and to new text |
| `Na__LayoutEditor__Panel__Dimensions__.js` | 340 | Text size mm, colour, terminator tick/arrow/dot, extension offset, precision, units suffix; applies to the selection and to new dimensions |
| `Na__LayoutEditor__Panel__Styles__.js` | 280 | Per-viewport toggles: Projected Linework, Profile Linework Effect, Glass Transparency Off, Whitecard, plus Hidden Lines; Enhance Whitecard from v2.21.8; Base Image and Context Layer from v2.21.12, when the section became Render Composites |
| `Na__LayoutEditor__Panel__Shapes__.js` (v2.21.8) | 200 | Vectors: edges on or off, edge colour, edge weight in points, fill, fill colour, closure; the selection or the Draw tool's defaults. Edges and fill are either-or from v2.21.13, so a shape is an outline, a filled outline, or a solid |
| `Na__LayoutEditor__AxisLock__.js` (v2.21.13) | 170 | The arrow key axis lock the Draw and Dimension tools place against, and the axis maths Shift used to hold. A lock beats a snap by taking the snapped point's free coordinate, and lasts only until the point lands |

### 11.5 Export and persistence (D35)

| File | Lines (est.) | Notes |
|---|---|---|
| `Na__LayoutEditor__PdfExporter__.js` | 520 | jsPDF (the vendored UMD, injected as a classic script on first use) at true paper size; per 2D viewport: clip to the frame and write projected linework as vector lines (`setLineDashPattern` for hidden), dimensions and annotations as vector lines and text; 3D viewports as PNG; chrome from the primitive list; page size and scale in the document properties; filename `Na__{ProjectCode}__{SheetName}__{PaperSize}.pdf` |
| `Na__LayoutEditor__DevMenu__Controls__.js` | 380 | Dev Tools section: sheet list, New Sheet, Duplicate, Delete, Save Sheets (through `DrawView__ProjectData__`), Bake Snapshots and Linework, Export PDF |

Web viewers get the tab strip, pan and zoom, and a Download PDF button in the sheet toolbar; every editing affordance is created only on localhost (the same reveal pattern as the dev menu).

Built 09/10-Sep-2026 as v2.21.0, thirty-three files (the table above plus `SheetRecords__` split from the model for the line budget, `DimensionGeometry__`, `Assets__`, `Panel__Sheet__` and `Toolbar__`). Two deliberate departures from the tables: scene markup inside a viewport is drawn statically at scale rather than by mounting the live 44 and 45 engines on the sheet (editing a scene record happens in the drawing through Edit In Drawing, so one record never has two editors; Sheet mode and Import From Scene work as written), and the tab strip and host are created by their modules rather than authored in index.html. Sheet dimensions are stored as paper endpoints with the viewport they belong to and report paper length times that viewport's scale denominator. The 2D underlay is the composer render of the drawing window made offscreen through the section adapter and presets on the module's own orthographic camera; the 3D snapshot poses the main camera from the scene record and restores pose, layer visibility and cross sections afterwards.

v2.21.7 (10-Sep-2026) added three files: `Na__LayoutEditor__History__.js` (undo and redo, fifty whole-sheet snapshots per sheet, Ctrl+Z and Ctrl+Y), `Na__LayoutEditor__ContextMenu__.js` (the right-click menu) and `Na__LayoutEditor__AutoSave__.js` (a browser draft of every change, restored on the next load while unsaved, and a project save of its own after a sheet is created, renamed, reordered or deleted). The same release revised D29 and D30 (every handle crops, a drag moves, double-click enters the content), added a per-viewport lock (`Viewport__Locked`) and gave the page a full stage of room on every side.

v2.21.8 (10-Sep-2026) split the sheet tools into `Na__LayoutEditor__TextTool__.js` and `Na__LayoutEditor__DimensionTool__.js` (three-click placement with offset inference to parallel dimensions, inline value override), added `Na__LayoutEditor__Grips__.js` (dimension and shape grips), a vector Draw tool (`Na__LayoutEditor__ShapeGeometry__.js`, `Na__LayoutEditor__ShapeTool__.js`, `Na__LayoutEditor__Panel__Shapes__.js`, records `Sheet__Shapes`, layer type `vector`), sheet lineweights in points (`Sheet__Lineweights`, the Sheet panel), the Enhance Whitecard viewport style (`Na__LayoutEditor__Enhance__.js` over the image export's levels and sharpen), Space to clear the selection, and the selection order dimensions, text, shapes, viewports. v2.21.9 added `Na__LayoutEditor__RasterQuality__.js`: a global working resolution for the viewport pictures (Low, Medium, High from the `LayoutEditor__Raster__Config` block, remembered per browser, Medium by default) with the PDF and the Dev bakes pinned to the export level. v2.21.11 made the levels print resolutions (6, 12 and 20 pixels per millimetre) and gave the stored 3D snapshot an `Asset__PixelWidth`, so a picture rendered smaller than the working level asks for is re-rendered rather than shown blurred. v2.21.13 added `Na__LayoutEditor__AxisLock__.js` (the arrow key axis lock on the Draw and Dimension tools, left or right for X and up or down for Y, released by the same key or by the point landing, with the rubber band taking the axis colour) and `Shape__Stroked` on the shape record, which switches a shape's edges off and leaves its fill: edges and fill are either-or, never both off, and a fill no longer needs the shape closed, on the paper or in the PDF.

### 11.6 Hand-over test list

1. Tick Enable Layout Mode in the Dev menu (from v2.21.20 the tabs stay hidden on localhost until it is on), then New Sheet: a "Drawing 1" tab appears; A3 landscape with the Modern title block; switch to Classic: the scan stretches and the fields overlay.
2. Add a plan viewport at 1:50: linework and underlay land at scale (a 10 m wall measures 200 mm on the paper at 100 percent zoom); toggle 1:100 and 1:20.
3. Every handle crops (a corner in both axes); a drag moves the frame; double-click enters the content and a drag then pans; Shift on a 3D corner scales; a locked viewport (right-click, Lock viewport) refuses all of it; Ctrl+Z steps back through it all.
4. Layers: reorder changes stacking; lock prevents selection; type filter.
5. Text and dimension panels change new and selected items; sheet dimensions measure the model at scale. A dimension takes three clicks and lines up with a parallel neighbour on the third; its grips re-pick the points; double-click overrides the value; Space clears the selection.
5a. Draw (L): a polygon closes on its first point and fills from the Vectors panel; a line finishes on Enter; vertices drag; the PDF carries the shapes as vectors; the Sheet panel's lineweights in points change the linework and the dimensions on screen and in the PDF; Enhance Whitecard turns the grey faces white.
5b. Vectors panel: switching Edges off on a filled shape leaves the solid, and it still selects, drags and takes its vertices by the grips; switching Fill off puts the edges back, so no shape can be made invisible; both survive a save and reload and print the same way in the PDF.
5c. Axis lock: while drawing, left or right holds the next edge across the page and up or down holds it down the page, the band turning red or green; the same key releases; the lock clears when the point lands; with an axis locked, hovering a vertex somewhere else on the drawing lines the edge up with it. The same keys work on the dimension span, and go back to nudging the selection when no tool is placing.
6. Markup mode Scene edits the plan's own labels; Sheet mode keeps them separate; Import From Scene copies.
7. Styles per viewport: whitecard and opaque glass in a 3D viewport, hidden lines on a plan viewport.
8. Save, reload, tabs and content return; web build shows the tabs read-only with PDF download.
9. PDF opens at 420 x 297 mm with selectable text and vector linework; printed at 100 percent a 1:50 viewport measures true.

---

## 12. Cross-cutting integration list

| Area | Change |
|---|---|
| `index.html` | Import map (Phase 0); static shells: two dev menu `<li>` sections, `#naLayoutEditorTabStrip`, `#naLayoutEditorHost`; imports and `Initialize` calls in the Engine Entry Points region in this order: carousel, group selector, thumbnail context, scene editor, drawing project data, floor plan mode and dev panel, elevation gizmo and mode and dev panel, projected linework, layout editor tab strip and mode |
| `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` | Imports for every new stylesheet in dependency order (carousel, group selector, floor plan dev, elevation dev, annotations, dimensions, projected linework, layout editor main, layout editor panels) |
| `Na__AppFlow__LoadingSequence.js` | Drawings block load event; render loop drawing branch; resize hand-offs; `Na__ReinitializeModelBoundSystems` invalidates the projection fingerprint on a model group switch |
| `Na__PresentationMode__Camera__SceneTransition.js` | Forwards `IsDrawingApproach` in `na-pm-scene-activated` |
| `Na__CrossSectionView__SceneData.js` | Skips restore for drawing approach scenes |
| `Na__CrossSectionView__SystemLogic.js` | Two additive exports (`SetSectionPositionMm`, `GetSectionById`) |
| `Na__PresentationMode__Thumbnail__Renderer.js` | Section overlay drawn into the thumbnail frame |
| `Na__AppConfig__Main.json` | Keys in Appendix C |
| `Na__ValeVision__HotkeysDictionary__.json` | Contextual markup hotkeys documented (advanced group) |
| Help panel | New "Drawing markup" subsection listing the contextual keys |
| `WebApps/ValeVisionGallery/CloudflareWorker` | Asset route and handler (5.6); wrangler deploy by Adam |
| `WebApps/ValeVisionGallery/server.py` | Asset mirror endpoint |
| `ValeVision__DEVLOG__.md` | One entry per phase, newest first, in the house voice |
| `ValeVision__PARITY__TrueVisionLedger__.md` | Created in Phase 1, updated each phase |
| Caches | Localhost: purge the shared SW after every pull; GH Pages: hard reload. Renaming a cross-module export needs a note in the DEVLOG because the shared SW is stale-while-revalidate for sibling apps |

---

## 13. Risks and open items

| Risk | Mitigation |
|---|---|
| r184 upgrade regressions in the custom shaders and fat-line patch | Phase 0 checklist against pre-upgrade screenshots; the old vendored folder is only deleted after sign-off |
| Projection cost on house-scale models (ten to fifty times a lantern) | Baking on localhost (D20); cut half-space and exclusions before sampling; triangle ceiling with a graceful fallback; timings in the dev section |
| Worker soup cloning memory on very large models | Shard by edge count, keep the pool at cores minus one; consider `SharedArrayBuffer` later (needs COOP/COEP headers on GH Pages, which is not available, so R2 baking remains the real answer) |
| Section state leaking between the drawing cut and the live Cross Sections tool | Adapter snapshots and restores the live state; drawing approach scenes skip the per-scene restore |
| Composer route shading a drawing | The preset disables fog and AO and clears the background; verified by eye on the reference project |
| Free-bearing projection slower per view | Rotation path only when the basis is not a permutation; intersection edges still shared across the axis-aligned views |
| project.json growth | Markup is small; linework and snapshots are R2 assets, never inline |
| GH Pages fallback has no drawing assets | Missing asset triggers on-device computation with the raster preview shown first |
| Two title block styles drifting | Both are primitive lists rendered through the same chrome renderer; the Classic style only differs in one `Image` primitive and its field anchors |

Open items to settle during the build (not blocking):

- Exact Vale wording for the client measuring disclaimer paragraphs (AppConfig array; TrueVision's Noble Architecture wording is the placeholder).
- ~~Whether the Layout Editor tab strip should also appear on projects that have no sheets.~~ Settled by Adam on 11-Sep-2026 (v2.21.20): the live site shows the strip only when the project's data file has sheets; localhost shows it only while the project's Enable Layout Mode switch (Dev Tools, Layout Editor, stored as `LayoutEditor__DrawingsData__LayoutModeEnabled`, off by default) is on, sheets or not. 02-Oct-2026 note (W1-99): superseded by v2.45.0 (15-Sep-2026) - one rule on localhost and on the live site alike, the switch on and at least one sheet (see D22).
- Per-size Classic title block scans (A4, A2, A1) when available; the asset map has slots ready.
- PlanVision hand-off of exported PDFs is out of scope but the filename contract is chosen so that a later Build tool step can pick them up.

---

## Appendix A - File map (seeds the parity ledger)

| ValeVision file | TrueVision or Lantern Designer source | Parity |
|---|---|---|
| `21/Na__PresentationMode__SceneGroups__Data__.js` | TV `Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | verbatim (renamed) |
| `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | TV same | adapted (sixth group) |
| `21/Na__PresentationMode__UI__SceneGroupSelector__.js` | TV same | verbatim (tokens) |
| `21/Na__PresentationMode__DevMenu__GroupEditor__.js` | TV same | verbatim |
| `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js` | TV `DevMenu__SceneEditor.js` (rows) | adapted (split) |
| `21/Na__PresentationMode__DevMenu__SceneReorder__.js` | TV `DevMenu__SceneEditor.js` (reorder regions) | adapted (split) |
| `21/Na__PresentationMode__DevMenu__ScenePersistence__.js` | none (ValeVision save path) | new |
| `21/Na__PresentationMode__UI__SceneCarousel.js` (edited) | TV `UI__SceneCarousel.js` | adapted (router list, groups) |
| `21/Na__PresentationMode__DevMenu__SceneEditor.js` (edited) | TV `DevMenu__SceneEditor.js` | adapted |
| `03/Na__AppUtils__SnapshotHistory__.js` | TV `Na__AppUtils__SnapshotHistory.js` | verbatim |
| `03/Na__AppUtils__R2AssetUpload__.js` | none (ValeVision original, back-port candidate) | new |
| `42/Na__DrawView__ActiveView__.js` | TV `Na__DrawView__ActiveView__.js` | verbatim |
| `42/Na__DrawView__Navigation__.js` | TV `Na__DrawView__Navigation__.js` | verbatim |
| `42/Na__DrawView__MarkupMount__.js` | TV `Na__DrawView__MarkupMount__.js` | verbatim |
| `42/Na__DrawView__MarkupFocus__.js` | TV `Na__FloorPlan__MarkupFocus__.js` | verbatim (relocated) |
| `42/Na__DrawView__SceneLinkRow__.js` | TV `Na__DrawView__SceneLinkRow__.js` | verbatim |
| `42/Na__DrawView__SectionAdapter__.js` | TV `41__System__SectionCutEngine` (API only) | diverged (D07) |
| `42/Na__DrawView__ComposerPreset__.js` | TV `Na__DrawView__ProfileLines__.js` (purpose only) | diverged (D12) |
| `42/Na__DrawView__MaterialPreset__.js` | none | new |
| `42/Na__DrawView__ProjectData__.js` | none | new (D08) |
| `42/Na__DrawView__RenameDrawing__.js` | none | new (10-Sep-2026, see 5.8) |
| `42/Na__DrawView__Transitions__.js` | TV mode controllers (shared parts) | adapted (split) |
| `43/Na__FloorPlan__*` (10 files) | TV `42__System__FloorPlanViews` | adapted (data block, seams, styles) |
| `44/Na__PlanAnnotations__*` (8 files) | TV `43__System__PlanAnnotations` | verbatim (imports) |
| `45/Na__PlanDimensions__*` (15 files after splits) | TV `44__System__PlanDimensions` | verbatim (imports, splits) |
| `46/Na__Elevation__*` (13 files) | TV `45__System__ElevationViews` | adapted (face pick, gizmo grip, group by mode) |
| `50/Na__ProjectedLinework__*` (23 files) | LD `27__System__ProjectedEdges2d` | verbatim kernel set; adapted sampler, projector, pipeline, persistence, overlay |
| `51/Na__LayoutEditor__*` (33 files) | LD `30__System__DrawingEditorMode`, `05__Env2d`, VV `35__System__PageLayoutSystem` (patterns) | new (back-port candidate) |

## Appendix B - Event catalogue (new)

| Event | Detail | Emitted by | Consumed by |
|---|---|---|---|
| `na-presentation-group-changed` | `{ groupId, source }` | group bar, carousel | carousel, group bar |
| `na-presentation-groups-changed` | none | group editor | scene editor (normalise, commit, save) |
| `na-layouteditor-drawingsdata-loaded` | `{ block }` | loading sequence | DrawView ProjectData |
| `na-drawing-view-changed` | `{ kind, isActive }` | DrawView ActiveView | nav toolbar, tab strip, projected linework overlay |
| `na-floorplan-mode-changed` | `{ state, planId, isPlan }` | floor plan controller | dev panel, toolbar |
| `na-elevation-mode-changed` | `{ state, elevationId, isDrawing }` | elevation controller | dev panel, toolbar |
| `na-pm-scene-activated` | `{ sceneName, sceneId, isDrawingApproach }` | scene transition (edited) | cross section scene data (skips approaches) |
| `na-projectedlinework-changed` | `{ drawingId, status }` | projection pipeline | overlay, dev section, layout editor viewports |
| `na-layouteditor-mode-changed` | `{ isActive, sheetId }` | layout editor controller | carousel, toolbar, tab strip |
| `na-layouteditor-sheets-changed` | `{ reason, sheetId, itemId }` (reasons include `saved` from v2.21.7) | sheet model | mode controller, panels, toolbar, tab strip, Dev section, history, auto save |
| `na-layouteditor-tool-changed` | `{ tool }` | sheet tools | toolbar |
| `na-layouteditor-zoom-changed` | `{ zoom }` | sheet surface | toolbar |
| `na-layouteditor-history-changed` | `{ sheetId, undoDepth, redoDepth }` | history | toolbar |
| `na-layouteditor-request-drawing` | `{ viewportId, plan, elevation }` | viewport panel | mode controller (Edit In Drawing) |
| `na-layouteditor-asset-loaded` | `{ path }` | sheet chrome | sheet surface (rebuild once a logo or scan arrives) |

## Appendix C - Config keys added to `Na__AppConfig__Main.json`

| Key | Purpose |
|---|---|
| `RenderEffect__ProfileLines__Drawing2dEnabled` | Profile-line overlay on drawings |
| `RenderEffect__ProfileLines__Drawing2dEdgeColor` | Falls back to the 3D colour |
| `RenderEffect__ProfileLines__Drawing2dEdgeThresholdNormal` | Falls back to the 3D threshold |
| `RenderEffect__ProfileLines__Drawing2dEdgeWidth` | Fixed width on drawings |
| `DrawingView__Config__BackgroundColour` | Paper colour behind a drawing |
| `DrawingView__Config__TransitionIntoMs`, `__OutOfMs` | Shared flight timings |
| `ProjectedLinework__Config__Exclusions__DefaultCategoryTokens` | Default per-category exclusion list (planting, people, furniture tokens) |
| `LayoutEditor__Config__ReadOnlyOnWeb` | Guard for the web build |

System-owned config JSON files (each beside its modules): `Na__PresentationMode__SceneGroups__AppConfig__.json`, `Na__DrawView__AppConfig__.json`, `Na__FloorPlan__AppConfig__.json`, `Na__PlanAnnotations__AppConfig__.json`, `Na__PlanDimensions__AppConfig__.json`, `Na__Elevation__AppConfig__.json`, `Na__ProjectedLinework__AppConfig__.json`, `Na__LayoutEditor__AppConfig__.json`.
