# S02a - Drawing Core, Floor Plans, Elevations, North, Drawing Planes, Section Engines

**Slice:** S02a of the TrueVision (TV) -> ValeVision (VV) drawing-system parity analysis
**Prepared:** 01-Oct-2026, read-only against TV `b2aa9151` (devlog top v2.172.0) and VV `7b4e593a` (devlog top v2.71.0)
**Direction:** TV is the source of truth. VV keeps its own transport (Flask `WCP/server.py` + worker `whitecardopedia-editor-api`, R2 prefix `VaApps/Projects/{folderId}/`) and its permanent divergences DIV-1 (composer render route) and DIV-2 (live Cross Sections tool as the section engine).

Path shorthand: `TVM/` = `TV/02__Src__AppModules`, `VVM/` = `VV/02__Src__AppModules`. All paths in tables are relative to each app root unless prefixed.

Evidence method: `drift_all.tsv` rows for the seven folder pairs; every DEVELOPMENT LOG compared entry by entry (script `parity/work_s02a/devlogs.py`); `git diff --no-index -w` on every drifted file; a comment-stripped code diff (`codediff.py`) on every "header-only" file; export-set comparison of every pair (`exports.py cmp`); and an import-resolution check that takes each TV file's relative imports, maps them through the current folder map and reports every file or exported NAME that VV lacks (`check_names.py`, output in `parity/work_s02a/port_blockers.txt`, summarised in Appendix A). Nothing was run in either app; where a conclusion rests on code reading alone it says so.

---

## (a) Scope

| Area | TV folder | files / lines | VV folder | files / lines |
|---|---|---|---|---|
| Drawing core | `40__System__DrawingViewCore` | 21 / 7,754 | `42__System__DrawingViewCore` | 17 / 5,637 |
| Section engine | `41__System__SectionCutEngine` | 7 / 2,638 | `41__System__CrossSectionView` | 7 / 3,697 |
| Floor plans | `42__System__FloorPlanViews` | 12 / 5,427 | `43__System__FloorPlanViews` | 10 / 4,255 |
| Elevations | `45__System__ElevationViews` | 15 / 7,449 | `46__System__ElevationViews` | 13 / 6,276 |
| North | `46__System__NorthDirection` | 8 / 2,091 | `47__System__NorthDirection` | 8 / 2,080 |
| Drawing planes | `47__System__DrawingPlanes` | 9 / 3,967 | - | 0 |
| Cross section views | `48__System__CrossSectionViews` | 1 / 198 | - | 0 |
| Legacy elevation tool | - | - | `40__System__2dElevationsView` | 8 / 2,407 |
| **Total** | | **73 / 29,524** | | **63 / 24,352** |

Also read: `TVM/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js` (TV-only, required by planes and the compass), both `Index.html`/`index.html` wiring blocks, both CSS indexes, both `Na__AppFlow__LoadingSequence.js` render branches, `TVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` (dependency), the Layout Editor (LE) modules that import these folders (Appendix B), and the docs `TrueVision__PLAN__DrawingPlanes__.md`, `TrueVision__PLAN__DrawingMenus__.md`, `TrueVision__PLAN__DraftMode__.md`, `TrueVision__NOTES__StandardDrawingGroups__.md`, `TrueVision__NOTES__DrawingNumberingSchema__.md`, `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` (s.2.2, 3, 3.2, 4.1, 7, 8, 12), VV `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` decisions D05/D06/D07/D11/D12/D16/D20/D28/D33, and the VV parity ledger (lines 1-110, 855-937, 938-1247).

Shared-file states (drift_all.tsv, current folder map): drawing core 15 shared (7 header-only, 8 drifted), 6 TV-only, 2 VV-only; floor plans 10 shared (3 header-only, 7 drifted), 2 TV-only; elevations 13 shared (5 header-only, 8 drifted), 2 TV-only; north 8 shared (5 header-only, 3 drifted); section engines 0 shared (7 v 7, different engines by design).

**Correction for the orchestrator:** `TrueVision__PLAN__DraftMode__.md` is the Layout Editor's LayOut-style *Draft Mode* (K key, `51/26__System__DraftMode`). It contains nothing about `Na__DrawView__DraftGuard__` / `DraftMaths__`. Those are specified in `TrueVision__PLAN__DrawingMenus__.md` section 3 and TV devlog v2.86.0 (line 7788).

**Tooling note:** `drift_all.tsv` column `vv_ver` is not VV's current version. It is the `- Source version:` line of VV's PORT NOTE (the TV version VV was ported FROM). Example: `43/Na__FloorPlan__DevMenu__Editor__.js` reads `vv_ver 1.0.0` but its DEVELOPMENT LOG top is 1.2.0 (15-Sep-2026, line 59); `43/Na__FloorPlan__ModeController__.js` reads 1.1.0 but is 1.2.2. Use the DEVELOPMENT LOG tops quoted in table (c).

---

## (b) Narrative findings by sub-system

### b1. Folder numbering - the +1/+2 shift has run out of room

VV decision D05 (`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:53`) kept VV's legacy `40__System__2dElevationsView` and `41__System__CrossSectionView` in place and shifted the new drawing folders up: VV 42 DrawingViewCore, 43 FloorPlanViews, 44 PlanAnnotations, 45 PlanDimensions, 46 ElevationViews, then VV 47 NorthDirection (v2.67.0). TV kept 40-46 and has since added **47 DrawingPlanes, 48 CrossSectionViews and 49 ElevationDepthFog** (v2.82.0, v2.86.0, v2.94.0). Under the "fixed" map (TV realign plan s.4.1, lines 304-321) TV 47 cannot land at VV 47 (North is there), and TV 49 has no slot at all (VV 50 is ProjectedLinework).

Two ways out:
- **Option B (recommended): renumber VV to TV's numbers.** VV 42->40, 43->42, 44->43, 45->44, 46->45, 47->46; VV `40__System__2dElevationsView` moves out of the way (to a free slot such as `39__System__2dElevationsView`, or is retired - decision D-S02a-04); VV `41__System__CrossSectionView` keeps 41 (TV 41 is `SectionCutEngine`; same number, different engine, DIV-2). New folders then land at 47/48/49 exactly as TV has them, and every later port is file-for-file with no path translation. Measured cost: 51 VV files / 124 references to `42__System__DrawingViewCore`, 11/22 to `43__`, 7/14 to `44__`, 9/33 to `45__`, 11/23 to `46__`, 6/13 to `47__`, 4/6 to `40__System__2dElevationsView` (counts include comments; scanned in `02__Src__AppModules`, `index.html`, `03__Style__AppStylesheets`, `80__Testing__PrototypeEnvironment`). Mechanical, verifiable with VV's own `Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs`.
- **Option A: keep the shift.** TV 47 -> VV 48, TV 48 -> VV 49, TV 49 -> no slot (would need a non-conforming number). Every port pays a path rewrite forever, and the 44/45 PlanAnnotations/PlanDimensions pair (another slice) keeps its own offset.

This is cross-slice (44/45/50/51 import these folders) so it must be decided once, executed first and alone (WP-S02a-01).

### b2. Drawing core (TV 40 / VV 42)

**Identical code (header-only):** `ActiveView__`, `Navigation__`, `MarkupFocus__`, `SceneLinkRow__`, `StyleRows__` - comment-stripped diff = 0 lines. `MarkupMount__` differs only because VV imports the split `Na__PlanDimensions__ConfigState__` (VV ahead; nothing to do).

**`Na__DrawView__ProjectData__` (TV 1.6.0, VV 1.2.0) - the main seam.** TV gained, in order: 1.1.0 (14-Sep) local-copy mirror and `Save(showToast, report)`; 1.2.0 common fields (VV has); 1.3.0 (20-Sep, v2.86) `RegisterPayloadGuard` - the copy any save is about to write is handed to the draft guard so an unfinished Dev-menu edit goes out as last Updated; 1.4.0 (21-Sep, v2.116) `RegisterSaveStep` (before/payload/after phases, used by Sheet Images publishing); 1.5.0 (22-Sep, v2.145) `IsLoaded` (LE late-start draft restore); 1.6.0 (22-Sep, v2.146) the save guard - `GetBase`, `WhenBaseKnown`, `CheckBase` against the local server's drawings fingerprint, `LayoutEditor__DrawingsData__SavedIso` stamp. TV `Save(showToast, report, registerKeys)` at `TVM/40/Na__DrawView__ProjectData__.js:710`; VV `Save(showToast)` at `VVM/42/Na__DrawView__ProjectData__.js:380` (GET `/api/projects/{code}` from Flask at :389, merge, `Na__AppUtils__R2SaveProjectJson`). Exports TV-only: `GetBase, IsLoaded, RegisterPayloadGuard, RegisterSaveStep, RegisterSectionBlockProvider, SAVED_ISO_KEY, WhenBaseKnown`; VV-only: `Get/SetLayoutModeEnabled` (VV's per-project Layout Mode switch, used by VV's lazy loader - keep). The TV legacy-migration region and `Na__DevSavedKeys` concern are TV-only (DIV-3 history) and must not be ported. The adaptation is: keep VV's fetch-merge-R2-first transport, add the TV registration hooks and `report`/`registerKeys` parameters, fill `report.local = { ok: localSuccess, skipped: false, error }` from `R2SaveProjectJson`'s `{ r2Success, localSuccess }` (`VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js:184-219`) and suppress that utility's own "Saved to R2" toast when a report is passed (TV callers toast "where it landed" themselves via `Na__DrawShell__WhereSaved`). The base guard (1.6.0) needs a Flask `drawings-fingerprint` route and base header - a transport work package (WP-S02a-15).

**`Na__DrawView__RowAccordion__` (no version field; TV changed 20-Sep, v2.86).** TV adds a change guard (`SetChangeGuard`), open listeners (`OnOpenChanged`), `RequestOpenId` (a header click ASKS), and `lead`/`trail` header elements; `Wrap` returns `name`. TV's PORT NOTE: "SetOpenId, IsOpen, GetOpenId and CloseIfOpen are unchanged, so ValeVision's callers would run against this file as they are ... (2) goes back with the Floor Plans and Elevations menu rebuild" (`TVM/40/Na__DrawView__RowAccordion__.js:42-52`). Port whole.

**`Na__DrawView__RenameDrawing__` (TV 1.1.0, VV 1.0.0).** TV 1.1.0 (20-Sep) adds `StageHolders`/`StageFloorPlan`/`StageElevation` (`:399`, `:426`): the card, the section binding key and the sheet fingerprints brought into step in memory with an undo, for the Update flow that owns the save. VV has its own seam: the re-stamp goes through the LE loader (`Na__LeLoad__PrepareRestamp` / `Na__LeLoad__RestampForScene`) because VV lazy-loads the editor; TV reaches `Viewport3d` by dynamic import (`ResolveRestamp`, `:127`). Port the Stage functions onto VV's loader route (VV must call `PrepareRestamp` before staging so the stamper is loaded).

**`Na__DrawView__Transitions__` (TV 1.1.0, VV 1.0.0).** TV 1.1.0 (21-Sep, v2.112) adds `ReturnToOrbit` and makes `SuspendThreeD(options)` leave Walk/Fly only when `options.returnToOrbit === true` (`TVM/40/Na__DrawView__Transitions__.js:171-172`). The Layout Editor passes it (`TVM/51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:707`); the snapshot renderer does not (`TVM/51/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js:905`), so a sheet picture rendered from the 3D tab no longer drops somebody walking back into Orbit. VV's `SuspendThreeD()` always converts (`VVM/42/Na__DrawView__Transitions__.js:114-115`) and VV's snapshot renderer calls it per picture (`VVM/51/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js:501`), so VV still has the "render kicks a walker into Orbit" behaviour TV removed. TV's original fault (SetActiveMode only repainting the toolbar) does NOT exist in VV: VV's `Na__NavToolbar__SetOrbitMode` runs `HandleOrbitClick`, which calls the registered walk/fly toggles with `'return-to-orbit'` (`VVM/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js:233-236, 403`). Adaptation: `ReturnToOrbit` = VV's `Na__NavToolbar__SetOrbitMode()`; keep VV's culling import path `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js`; keep VV's `Initialize` call (VV's mode controllers fly through `Transitions__FlyTo`; TV's are uninitialised by design). **[Verifier correction - a regression trap]** In VV, `SuspendThreeD()` has two more callers that TV does not have: VV's own floor plan and elevation mode controllers (`VVM/43/Na__FloorPlan__ModeController__.js:465`, `VVM/46/Na__Elevation__ModeController__.js:526`). TV's controllers do not use Transitions and do nothing about Walk. Port the `options.returnToOrbit` gate alone and opening a plan or elevation from the carousel while walking would stop leaving Walk, so Walk physics would keep driving a hidden camera under the drawing. That is a regression of behaviour VV has today. Change both VV controller calls to `SuspendThreeD({ returnToOrbit : true })` in the same change. The LE ModeController call (`VVM/51/05/...:524`) is owned by slice S03a's whole-file port of the LE ModeController (S03a line 495), so coordinate rather than edit it twice.

**`Na__DrawView__ConfigState__` (TV 1.0.1) and `AppConfig__.json`.** TV moved the fallback/configured `ProfileEdgeWidth` from 1.0 to 0.55 because TV's live drawing views draw at 0.55 through its overlay route. VV's composer route writes the width straight to the pass uniform each frame (`VVM/42/Na__DrawView__ComposerPreset__.js` header), so VV does not have the "bake leaves the live view thicker" fault. Keep 1.0 (DIV-1).

**`Na__DrawView__MaterialPreset__` (both 1.1.0).** TV reads both key spellings (`Styles__GlassOpaque` and `glassOpaque`) and drops the MaxEngine gate. VV's ledger records a deliberate non-port (`VV/ValeVision__PARITY__TrueVisionLedger__.md:898-900`: "cargo-culting a fix for a bug it does not have"); VV callers always pass mapped flags (`Na__FpData__GetStyles` / `Na__ElevData__GetStyles`). Keep, but re-check if a TV caller that passes raw record styles is ever ported verbatim.

**`Na__DrawView__Styles__DevMenu__.css`.** TV appends a "Drawing Panel Shell" region (`.na-draw-dev__*`: panel head, swatch, chips, captions, two-column actions grid, green commit button, danger zone) for the rebuilt panels. All `na-pm-dev__*` classes these panels reuse already exist in VV (checked: `square-btn`, `btn`, `btn--primary`, `btn--danger`, `rule`, `advanced*`, `scene-badge`...). TV imports this sheet LAST in its CSS index (`TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:149`); VV imports it FIRST (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:85`). The new region overrides `.na-pm-dev__btn:disabled`, so the cascade order must match TV.

**TV-only drawing-core modules.**
- `Na__DrawView__DraftMaths__` (246 lines, pure, imports nothing): snapshot / changed keys / restore-in-place / substitute-in-payload. Port verbatim.
- `Na__DrawView__DrawingUsage__` (156, pure): counts the sheet viewports drawn from a drawing using `Sheet__Name`, `Sheet__Fields__DrawingNumber`, `Sheet__Viewports`, `Viewport__Kind`, `Viewport__DrawingId`, `Viewport__SceneId` - VV's sheet records carry all of them (`VVM/51/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js:363-367, 654`). Port verbatim.
- `Na__DrawView__DevRowShell__` (486): panel head with +, header chips, Update/Revert, danger zone, Advanced fold, the Update and Delete dialogs, `WhereSaved(report)`. Imports `21/Na__PresentationMode__DevMenu__Modal__` (`Confirm`), `ProjectData.GetSheetsArray`, `DrawingUsage`. Port verbatim; wording "writes R2 and the local project file" is true for VV too (R2 first, then the Flask mirror). Needs Modal >= 1.1.0 (below).
- `Na__DrawView__DraftGuard__` (491): one live draft across both panels, owners per type, `ConfirmLeave`, `Revert`, `SaveActive`, `SaveBlock`; registers the payload guard and the accordion's change guard at load. Imports DraftMaths, `ProjectData` (`CHANGED_EVENT`, `RegisterPayloadGuard`, `Save`), RowAccordion (`GetOpenId`, `SetOpenId`, `SetChangeGuard`, `OnOpenChanged`), Modal. Port verbatim after the ProjectData and RowAccordion upgrades. Imported by the two editors only. **[Verifier correction]** The 48 placeholder imports `DevRowShell` (`BuildPanelHead`), not DraftGuard; it names DraftGuard only in a comment (`TVM/48/...Editor__.js:30`). DevRowShell's importers are the two editors, the two row builders, the 48 placeholder and TV 49's fog row.
- `Na__DrawView__ProfileLines__` (738) and `Na__DrawView__RenderPreset__` (376): TV's DIV-1 route (flat render + Sobel overlay quad). Not ported. See b4.

**VV-only drawing-core modules.**
- `Na__DrawView__ComposerPreset__` (534, 1.3.0) - DIV-1 counterpart; see b4 for the rename recommendation.
- `Na__DrawView__ThumbnailBake__` (433, 1.0.1) - queues added/seeded drawings, opens each, records framing, captures, uploads, saves once; `Bake Missing Thumbnails`. VV ledger lists it as a pending back-port (`VV/ValeVision__PARITY__TrueVisionLedger__.md:1232`). TV's v2.86 rebuild solved part of the same problem differently ("Update also takes the picture", only when the drawing is on screen); TV still has no bake for newly added cards. Keep in VV and re-wire into the rebuilt editors (decision D-S02a-02); its `save` adapter must call the draft guard's `SaveBlock` because the panel-level Save buttons disappear in TV's 2.x editors.

### b3. The draft system and the menu rebuild (TV v2.86.0 / v2.87.0, 20-Sep-2026)

TV v2.86.0 (devlog line 7788, plan `TrueVision__PLAN__DrawingMenus__.md`) rebuilt Dev Tools > Floor Plans and Elevations "like the Presentation Scenes panel": one row open across both panels; an open row is a DRAFT (edits live, kept only by a green, confirmed **Update** that names what changed and which sheet viewports draw from the drawing, then writes R2 + local in one save and re-renders the card thumbnail when on screen); **Revert**; a leave prompt; Delete below a rule behind the app dialog; a + in the panel head; no Save-all; `Let clients measure` saves at once; a third **Cross Sections** placeholder panel between Elevations and North; and, for elevations, "Viewed from N/E/S/W" replaced by a north-derived statement plus auto names (`Elevation__NameIsAuto`). It also fixed that TV's Save Floor Plans/Save Elevations had written only the presentation block since 10-Sep.

VV's editors (floor plans 1.2.0, elevations 1.2.0) already fold rows and save through `Na__DrawData__Save`, but still write live on every slider (TV v2.86 "Still open: NOT in ValeVision. Its rows already fold and save through Na__DrawData__Save, but still write live; the draft guard, the shell and the Update flow are the port", devlog lines 7917-7920). That live-write fault is the main functional risk VV carries in this slice: any other save (Save Sheets, north, rename) writes a half-moved plane.

The rebuilt TV editors are 2.0.0/2.1.0 rewrites (diffs of 1,280 and 1,549 lines), so the port is "take TV's file whole and re-apply VV seams" (WP-S02a-08). VV seams and VV-only features to decide/re-apply:
1. **Section engine calls.** TV editors call the engine directly: `Na__SectionCut__SetPlaneHeightMm` (`TVM/42/Na__FloorPlan__DevMenu__Editor__.js:211, 421`), `Na__SectionCut__SetPlaneDistanceMm` (`TVM/45/Na__Elevation__DevMenu__Editor__.js:130, 440`). VV: `Na__DrawView__SectionAdapter__SetPlaneHeightMm` / `...SetPlaneDistanceMm` (identical adapter exports in both apps).
2. **Dimension label getter.** TV imports `Na__PlanDim__GetLabel` from `44/...PlanDimensions__Data__`; VV has it in `45/...PlanDimensions__ConfigState__` (VV split).
3. **Styles + Exclusions rows (VV D33).** TV's 2.x row builders do not import `Na__DrawView__StyleRows__` at all; in TV the StyleRows module is imported by nothing (only a comment in `49/...DevMenu__Row__.js:40`), and nothing calls `Na__FpData__SetStyle` / `Na__ElevData__SetStyle` / `SetExcludeTokens`. TV records keep the keys (RenderPreset and the projection read them) but TV has no UI to set them; TV's live plan/elevation views apply no per-record style (their mode controllers import neither preset). VV's rows (`VVM/43/Na__FloorPlan__DevMenu__RowBuilders__.js:367`, `VVM/46/Na__Elevation__DevMenu__RowBuilders__.js:563`) plus `Na__FloorPlanMode__ApplyStyles` / `Na__ElevationMode__ApplyStyles` implement D33. Decision D-S02a-02.
4. **Ground Floor Plan quick action (VV D11).** Absent from TV 2.0.0 (`VVM/43/...Editor__.js:450, 714`; TV realign ledger still "C | Ground Floor Plan quick action | - | Not yet ported", TV plan line 764). Decision D-S02a-02.
5. **Bake projected linework before save (VV D20).** VV editors call `Na__PlStore__BakeBeforeSave` before the drawings save (`VVM/43/...Editor__.js:577`, `VVM/46/...Editor__.js:711`). TV's 2.x editors no longer call it anywhere (only its definition in `TVM/50/Na__ProjectedLinework__Persistence__.js:616` remains; no devlog entry mentions removing it). Whether TV's Update should bake is unverified; decision D-S02a-02 and a TV back-port question. **[Verifier correction]** TV did not drop this call: TV's editors NEVER called it. `git log -S Na__PlStore__` over TV's 42, 45 and `Index.html` finds no commit; the only commit naming it is `35615d29` (10-Sep, Persistence only). TV also records this itself: `TV/TrueVision__PLAN__PublishingSystem__.md:31` says it "has no callers ... The comment above it describes a call graph that does not exist". TV then moved drawing bakes to publish time (v2.155.0: publisher `51__System__LayoutEditor/65__Feature__DocumentPublishing`, reader `52__System__Layout__PublishedDocuments`, slice S08). So VV D20 is VV-only behaviour from the start. VV should keep it until VV adopts TV's publish-time bake (S08), and it is not a TV back-port candidate in its current form.
6. **Thumbnail bake on add/seed + Bake Missing Thumbnails** (VV v2.46.0). Decision D-S02a-02.
7. **Sections filed by drawing type (VV D28).** VV's `Na__ElevLink__SyncSceneGroup` moves a card between "Elevations" and "Cross Sections" when the mode flips; TV files everything into Elevations (TV realign ledger "Sections filed by drawing type - Not yet ported", line 767). Re-apply on TV's `onModeChange` handler (`TVM/45/...Editor__.js:883`).
8. **Pick Face / gizmo grip.** VV's editor drives `Na__Elevation__FacePick__`, `GizmoGrip__`, `PlaneGizmo__` directly; TV's 2.x editors use 47 DrawingPlanes instead ("Aim at face" is VV's pick). After the port VV's three modules become unused, exactly as TV's are ("still on disk and initialised, unused since v2.82.0", devlog 7921-7922). Keep the files and the three init lines in `index.html` until TV deletes them, then delete in lockstep.
9. **Data-module calling convention (critical).** TV editors pass the PRESENTATION config as the first argument of `Na__FpData__CreatePlan(config, ...)` / `DeletePlan(config, ...)` (`TVM/42/...Editor__.js:957, 1064`) and `Na__ElevData__CreateElevation(config, ...)` / `DeleteElevation(config, ...)` (`TVM/45/...Editor__.js:1075, 1228`). TV's data modules ignore that argument for records. VV's data modules treat argument 1 as an optional DRAWINGS block (`Na__FpData__Block`, `VVM/43/Na__FloorPlan__ProjectJson__Data__.js:160`; `Na__ElevData__Block`, `VVM/46/...ProjectJson__Data__.js:181`) and `EnsureArray` would create `LayoutEditor__DrawingsData__FloorPlans` INSIDE `PresentationMode__SavedCameraScenes` - a silent data fault on the next save. Every current VV caller passes `null` or nothing (checked by grep: all 18 external call sites - 43 editor x4, 43 mode x1, 46 editor x4, 46 mode x1, 42 RenameDrawing x2, 50 ViewDefinition x2, 51 SheetModel__Viewports x4), so adopting TV's convention (records always from `Na__DrawData__Get*Array`) is safe. The data modules must be ported (TV's signature) before or with the editors.
10. **Seed / centre on the BUILDING.** TV 1.1.0 (v2.82) centres new elevations and Seed N/E/S/W on `Na__PlaneBounds__Measure` (building only); VV still centres on the whole model bounds (landscape included) via `Na__ElevFrame__MeasureModel`. Comes with the editor port once 47 exists.
11. **Modal.** TV editors and the shell use `21/Na__PresentationMode__DevMenu__Modal__` 1.1.0 (`details`, `footnote`, `isCommit`) and 1.2.0 (`altLabel`); VV's Modal is 1.0.0 (code diff 67 lines) and VV's 1.x editors use `03/Na__AppUtils__ConfirmDialog`. The modal CSS (`.na-pm-modal__details`, `__message--footnote`, `__btn--commit`) lives in `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css` (TV lines 1034-1049, 1189-1195).
12. **Elevation fog block.** TV 2.1.0 row builders import `49/...DevMenu__Row__` and `Na__ElevData__Get/SetDepthFog` (v2.94). Either port 49 first (another slice) or land 2.0.0 behaviour with the fog block omitted and add it in WP-S02a-14.
13. **AppConfig labels.** Union, not replace: TV adds Update/Revert/Delete, storey and auto-name/identity labels; VV keeps `GroundFloorPlan*`, `Style*`, `Exclusions*`, `BakeThumbnailsLabel`, `PickFace*`, `SectionTargetGroup*` while their features stay.

### b4. Render path (DIV-1) and the naming question

TV: `RenderPreset__` (8 exports: `ApplyStyles, Enter, Exit, GetCamera, GetExportOverrides, Initialize, IsActive, RenderFrame`) over `ProfileLines__` (Sobel overlay quad), used by the LE snapshot renderer, the depth fog layer and Index.html; TV's live drawing branch in the render loop renders `renderer.render` + `Na__DrawProfile__RenderOverlay` + `Na__ElevFog__RenderOverlay` + `Na__SectionCut__RenderOverlay` (`TVM/01__AppCore/Na__AppFlow__LoadingSequence.js:1171-1177`). VV: `ComposerPreset__` with the SAME 8 export suffixes (`Na__DrawView__ComposerPreset__*`), used by both mode controllers, the LE snapshot renderer, the loading sequence (`RenderFrame`) and index.html, and it reuses `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__`.

TV 1.1.0 (20-Sep, v2.94) added depth fog to `RenderFrame` between silhouettes and cut fills; VV's composer route will need the equivalent when 49 is ported (WP-S02a-14).

**Recommendation (module naming):** rename VV `Na__DrawView__ComposerPreset__.js` -> `Na__DrawView__RenderPreset__.js` and its exports `Na__DrawView__ComposerPreset__*` -> `Na__DrawView__RenderPreset__*`, keeping VV's composer implementation and namespace comment, with a PORT NOTE stating "same file name and interface as TV; composer route (DIV-1, D12)". TV's own plan says "the seam is the eight function names" (`TVM/40/Na__DrawView__RenderPreset__.js` DESCRIPTION) - VV currently has the same functions under a different name, so every TV caller (LE `SnapshotRenderer__`, future depth-fog layer) needs a rename on port. Five VV importers change (`01/Na__AppFlow__LoadingSequence.js:425`, `43/...ModeController__.js:123`, `46/...ModeController__.js:115`, `51/25/...SnapshotRenderer__.js:132`, `index.html:1412,1874,2211`). `ProfileLines__` stays TV-only (no VV file); TV LE code that calls `Na__DrawProfile__SetEdgeWidth` / `InvalidateSceneCache` remains a documented seam (VV passes `edgeWidthPx` through `Enter`, ComposerPreset 1.3.0).

**[Verifier correction - the names match, the signatures do not]** Two of the eight functions differ:
- `RenderFrame`: TV's is `RenderFrame(camera)`. It needs the camera, does not check `IsActive`, and draws flat render + silhouettes + fog + cut (`TVM/40/Na__DrawView__RenderPreset__.js:297`). VV's is `RenderFrame()`. It uses the camera stored by `Enter` and returns false when the preset is not active (`VVM/42/Na__DrawView__ComposerPreset__.js:405`).
- `Enter`: TV's takes `{ camera, styles }` or a bare styles object. VV's also takes `edgeWidthPx`.

TV's LE SnapshotRenderer passes `(cam) => Na__DrawView__RenderPreset__RenderFrame(cam)` as its bake renderer (TV `:938`), while VV bakes through `RenderToCanvas({ camera })`. Slice S04a keeps VV's SnapshotRenderer as a DIV-1 adaptation that must not be overwritten whole. The rename therefore removes a NAME translation only. If it goes ahead, give VV's renamed `RenderFrame` an optional `camera` argument (used when given, else the `Enter` camera) so that a verbatim TV call is still correct.

**Live-view style difference (to verify visually):** VV's live carousel drawing applies the record's styles (`MaterialPreset` whitecard default true under MaxEngine, glass, profile linework); TV's live drawing applies none (TV mode controllers do not import either preset - verified from import lists). The same record can therefore look different in the two apps' carousels. Not a VV port item; flagged for Adam's eye when testing.

### b5. Section engines (DIV-2 / TD06)

- **Adapter surface is identical:** `Na__DrawView__SectionAdapter__` exports the same 13 names in both apps (TV pass-through over `Na__SectionCut__*`, VV 1.2.0 parks/restores the live Cross Sections tool). Keep.
- **Scene-data APIs differ (by design):** both export `CaptureForScene, GetProjectBlock, RenameSceneKey, RestoreForScene`; TV adds `BLOCK_KEY, FindEntryKey, LOADED_EVENT, Load, RemoveForScene` and registers `GetProjectBlock` with ProjectData through `RegisterSectionBlockProvider`; VV adds `IsCaptureEnabled/SetCaptureEnabled` (capture-on-scene-update toggle, VV scene editor) and VV's ProjectData imports `Na__SectSceneData__GetProjectBlock` directly. Serialization: TV `41/Na__SectionCut__Serialize__.js` (`Na__SectSerialize__Serialize/Apply`) vs VV `Na__CrossSection__SerializeSections/ApplySerializedSections` inside the 1,753-line `SystemLogic`. The LE snapshot renderer calls these directly in both apps (TV: `Serialize__` + `ConfigState__` appearance + `Engine__.SetModelRoot`; VV: `Na__CrossSection__SerializeSections/ApplySerializedSections/GetAppearance/SetLineWidth`) - a permanent seam in that LE file.
- **The schema keys match, but the `positionMm` SIGN does not (code reading; not executed).** VV writes `positionMm = ConvertUnitsToMm(-plane.constant)` (`VVM/41/Na__CrossSectionView__SystemLogic.js:1502`) and restores through a point `normal * positionMm` (`:1540-1542`, plane built at `:567` as `new THREE.Plane(n, -n.dot(point))`, i.e. constant = -positionMm). TV writes `positionMm = ConvertUnitsToMm(record.plane.constant)` (`TVM/41/Na__SectionCut__Serialize__.js:194`) and restores constant = +positionMm (`:261` via `UpsertVerticalPlane`, whose plane is `(-viewX, 0, -viewZ)` with constant = distance). For the same `normalXyz`, the two apps therefore build planes mirrored through the world origin: a TV-written plan cut `{normalXyz:[0,-1,0], positionMm:1200}` (TV keeps y <= 1.2 m) would restore in VV as the plane y = -1.2 m. Each app round-trips its own data correctly, and the two apps never read each other's projects today, so there is no live fault - but TD06 ("TrueVision writes ValeVision's schema verbatim, so a project document from either app is readable by the other", realign plan s.3.2) is not met, and TV's own mapping table says `-record.plane.constant` (line ~245). VV needs no change; the fix (and a migration for already-saved TV bindings) is TV's. Decision D-S02a-03.
  **[Verifier: confirmed by re-derivation, with more TV-side evidence; severity lowered to medium]**
  - VV's drawing plan cut goes through `SectionAdapter__UpsertHorizontalPlane` with normal (0,-1,0) and position -cutHeight (`VVM/42/Na__DrawView__SectionAdapter__.js:298-300`). That gives constant = +cutHeight, so VV writes positionMm = -1200 for a 1200 mm cut. TV writes +1200.
  - TV removed the negation on purpose. Its comment (`TVM/41/Na__SectionCut__Serialize__.js`, above `positionMm`) says "the two engines store plane.constant with opposite signs for the same normal". That premise is false: a `THREE.Plane`'s constant is fixed by its normal and its position, and both engines build the plan plane with normal (0,-1,0) and constant = +h. TV's round-trip test only proves TV to TV.
  - TV's own plan is inconsistent too. Its example `"positionMm": 1200` (realign plan line 217) disagrees with its mapping row `-record.plane.constant` (line 245), which would give -1200.
  - No live fault today: neither app reads the other's projects. Severity is therefore medium, not high.
  - Hazard for the swarm: never port TV's `Serialize__` logic into VV's 41.
- **TV's per-scene section restore listener is dead (TV-only, back-port item).** TV `Na__SectionCut__SceneData__` listens for `'na-pm-scene-activated'` (`TVM/41/...SceneData__.js:104, 299-308`), which no TV module dispatches (TV's carousel raises `'na-presentation-mode-scene-activated'`, `TVM/21/Na__PresentationMode__UI__SceneCarousel.js:148, 350`). VV's scene transition does dispatch it (`VVM/21/Na__PresentationMode__Camera__SceneTransition.js:451`). No VV action.
- **Drawing-approach flag:** VV's synthetic approach scenes carry `PresentationMode__Scene__IsDrawingApproach: true` (`VVM/43/Na__FloorPlan__Framing__.js:209`, `VVM/46/Na__Elevation__Framing__.js:287`) and VV's scene transition forwards `isDrawingApproach`; TV's framing modules do not set it (`TVM/42/Na__FloorPlan__Framing__.js:191-196`) although TV's SceneData checks for it. VV ahead; back-port item.
- **Depth into a foreign buffer (TV engine 1.2.0, caps 1.1.0, 20-Sep, v2.94):** `Na__SectionCut__RenderDepthInto` / `Na__SectMesh__RenderDepthInto` exist only for the elevation depth fog (49). VV's Cross Sections tool has no equivalent; it is needed when 49 is ported (WP-S02a-14 proposes an adapter-level function in both apps).
- **Helper flags:** VV's section tool skips `userData.naCrossSectionHelper`; TV uses `naSectionCutHelper`. VV's `PlaneGizmo` sets both. The compass and the drawing planes are added to the scene OUTSIDE the model root in both apps, and VV clips only model-root materials (`VVM/41/...SystemLogic.js:325-338`), so the ported compass/planes are not clipped; setting `naCrossSectionHelper` as well is optional defence (raycast/cap filters).

### b6. Floor plans (TV 42 / VV 43)

- **Storey level (TV v2.87.0, 20-Sep):** new `Na__FloorPlan__StoreyLevel__` (337 lines, pure; levels ground/first/second/roof/basement, guess from name then cut-height bands; a pick is stored, a guess never is), `Na__FloorPlan__DevMenu__StoreyRow__` (227; dropdown + "guessed from..." note + Confirm), `ProjectJson__Data__` 1.1.0 (`FloorPlan__StoreyLevel`, `GetStoreyLevel, IsStoreyLevelSet, GetStoreyLevelChoices, SetStoreyLevel, STOREY_CHANGED_EVENT 'na-floorplan-storey-changed'`), `ConfigState__` 1.1.0 (`GetStoreyLevelSetup`), AppConfig block `FloorPlanViews__StoreyLevels__Config` + six labels, CSS `.na-fp-dev__storey-note`. VV has none of it. Downstream: LE `ViewportIdentity__` 1.1.0, `ViewportTitleText__` 1.1.0, Scrapbook `DrawingTitle__` 1.1.0 / `ViewportLink__` 1.3.0 / panel 1.3.0 (title "PROPOSED GROUND FLOOR PLAN"), `PlanDoors__` and Hide Swings (v2.140: roof plans hide swings by default from the storey), `Panel__ViewportSettings__` 1.9.0 (Doors note). These LE ports cannot compile against VV until this lands (Appendix A).
- **Data module:** besides the storey, TV keeps the `sceneConfig` first-argument convention (b3 item 9). VV's extra normalisation (`FloorPlan__Dimensions` default, trimmed exclusion tokens) is harmless; TV's `Na__PlanDim__GetPlanDimensions` seeds the dimensions array lazily (`TVM/44/Na__PlanDimensions__Data__.js:384-388`). TV-only accessors `Get/SetLineworkAsset` exist but nothing in TV calls them.
- **Mode controller - VV is ahead, keep VV.** TV `Na__FloorPlan__ModeController__` is still 1.1.0 (07-Sep): it calls `41/Na__SectionCut__*` directly, owns its own suspend/culling, flies with `AnimateToScene`, and applies no presets. VV 1.2.2 routes through SectionAdapter, ComposerPreset, MaterialPreset and Transitions and exports `ApplyStyles`. TV's plan claimed the controllers would "port unchanged" through RenderPreset (realign plan s.2.2 DIV-1); that never happened in TV. No VV action; offer TV a back-port.
- **Scene link:** TV still exports `Na__FpLink__SyncSceneName` (the realign plan s.7.2 said delete it); VV deleted it. Nothing to port.
- **Group resolution trap shared by both apps:** `TrueVision__NOTES__StandardDrawingGroups__.md` (20-Sep, NOT built) found that both SceneLink modules match a group by name, then by a configured id (`Group_004`/`Group_005`) that only means "Floor Plans"/"Elevations" on default-seeded projects, so drawings were filed into "Interior 3D - First Floor" on RB05. VV has the same id step (and `Group_006` for Cross Sections). Not a parity gap; a shared open item for whichever app builds Standard Groups first.

### b7. Elevations (TV 45 / VV 46)

- **Auto name + identity (TV v2.86.0):** `Na__Elevation__AutoNameText__` (176, pure) and `Na__Elevation__AutoName__` (288; imports north `FacingWordForAzimuth`/`TrueBearingForAzimuth`). Names follow the north-derived direction until typed over (`Elevation__NameIsAuto`); a typed name reaches sheet titles through LE `ViewportIdentity__`; the row states "East elevation - the side of the building that faces east, seen looking west"; the stored bearing moves under Advanced as "Model bearing". VV still shows the "Viewed from" N/E/S/W compass-preset strip named by the model's -Z axis (VV ledger row 87: "This tree's Elevations menu still names its presets by the model's axes"). VV already has the north system (v2.67.0), so nothing blocks this.
- **Depth fog (TV v2.94.0):** `ProjectJson__Data__` 1.1.0 lends `Elevation__DepthFog` (normaliser writes it switched off), `Get/SetDepthFog`, `GetDepthFogPlane`; `ModeController__` 1.1.0 hands the fog layer two closures (`Na__ElevFog__SetSource`) and clears them on exit; editor 2.1.0 / row builders 2.1.0 carry the fog block. All rest on `49__System__ElevationDepthFog` (another slice). VV adaptation: ModeController register/clear calls, and fog drawn inside VV's composer `RenderFrame` (DIV-1).
- **VV-only record key `Elevation__SeededFrom`** ('facepick'|'preset'|'manual'), written by VV's normaliser and Pick Face (`VVM/46/...ProjectJson__Data__.js:138`); TV records lack it; once VV takes TV's editors nothing writes anything but the 'manual' default. Decision D-S02a-05.
- **Scene link:** VV's `SyncSceneGroup` (D28) and `Na__ElevCfg__GetSectionGroupTarget` stay; TV's stale `SyncSceneName` is not ported.
- **Mode controller - keep VV** (same analysis as floor plans) plus the fog hook.
- **FacePick, GizmoGrip, PlaneGizmo:** code-identical (PlaneGizmo differs only by VV's extra helper flag and export order). Superseded by 47 in TV (see b3 item 8).
- **Missing test in VV:** `TV/80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html` (245 lines; imports elevation ConfigState, Framing, OrthoCamera, ProjectJson__Data) - VV has no equivalent.

### b8. North (TV 46 / VV 47)

North was ported 20-Sep as VV v2.67.0 (VV ledger lines 57-87). Code-identical: `Compass__`, `ConfigState__`, `PickTool__`, stylesheet. Deliberately adapted in VV because VV lacks `Na__RenderLoop__InteractiveOverlays__`: `CompassGizmo__` (VV 1.0.0 has no `IsKept/SetKept`, sets `visible` directly) and `DevMenu__Editor__` (no Show Compass button; the panel shuts on `na-layouteditor-mode-changed` and the compass steps out during `na-layouteditor-snapshot-queue` - a fault VV's own port test found). AppConfig lacks `ShownByDefault` and the three Show Compass labels. `ProjectJson__Data__`: `Save(showToast, report)` in TV vs `Save(showToast)` in VV. VV's ledger instruction stands: "When the registry is ported, take TrueVision's 1.1.0 whole" (`VVM/47/Na__North__CompassGizmo__.js:55`, `...DevMenu__Editor__.js:52`). TV v2.84.0 also quartered the compass size - VV already has the quartered values (config diff shows only the Show Compass keys differ).

### b9. Drawing Planes (TV 47) and Interactive Overlays

TV v2.82.0 (20-Sep, devlog 8181) + v2.84.0 (persistent shown set): every plan and elevation has a coloured plane in the 3D view (translucent face, solid outline, a faint see-through outline, a boxed name tab, three corner grips, view arrows), switchable singly or "All plans"/"All elevations", draggable along its normal on an ABSOLUTE snap grid (10/25/50/100/250/500 mm), "Move to face" and "Aim at face" picks, a drag readout, sized from the building only (landscape excluded, bottom edge 100 mm above the ground cut). Nine files (3,967 lines) + `05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js` (170 lines; overlays invisible by default, switched on only inside the interactive 3D frame by `BeginFrame` / `EndFrame` in the render loop, `TVM/01/Na__AppFlow__LoadingSequence.js:1189, 1447`) + test `Na__Test__DrawingPlanes__.test.mjs` (47 checks). The editors register SOURCES (`Na__PlaneOverlay__RegisterSource`); a drag claims the draft (DraftGuard).

VV adaptation:
- `Na__DrawingPlanes__Grip__` imports `Na__RenderLoop__IsPaused`, which VV's `05__RenderPipeline/Na__RenderLoop__Invalidation.js` does not export (VV's pause is event based, `NA__PAUSE_RENDER_LOOP_EVENT`). Add an `IsPaused` query (mirror the reason set) in VV's Invalidation module.
- Place `BeginFrame` in VV's render loop after the drawing branch (VV's `Na__RenderLoop__RenderFrame`, `VVM/01/Na__AppFlow__LoadingSequence.js:1312-1340`) and `EndFrame` in the tick's finally. VV has render paths TV lacks (Video Studio preview inside the tick at `:1331`, its exporter, Export Render Layers); decide whether planes may show during Video Studio preview playback (unverified; place Begin after that branch to be safe). **[Verifier correction]** In VV the Video Studio preview is not a separate return branch: it is the first arm of the same if/else as Walk, Fly and Orbit (`:1331-1344`), and the same composer or refiner frame follows. "Begin after that branch" therefore does NOT keep overlays out of the preview. Do what TV does: call `BeginFrame()` straight after the drawing early-return. If Adam wants overlays hidden during preview playback, wrap that call in `if (!Na__VideoStudio__Preview__IsPlaying())`. Video Studio's EXPORT renders through `31/Na__VideoStudio__Export__FrameRenderer.js:371` (`composer.render()`, outside the tick), so the registry covers it by design: overlays are invisible between ticks. The same applies to `71__System__ExportRenderLayers` and the `30` tiled export, but the 71 SceneStateGuard and ShadowMask passes traverse and toggle scene state, so check that none of them sets `visible = true` on scene children outside the model root.
- Bounds config: `BuildingCategoryTokens ["MainBuildingModel","Storey__"]`, `GroundCategoryTokens ["LandscapeEnvironment"]` are substring matches on the model root's direct children (`Na__PlaneBounds__HasToken`, `TVM/47/Na__DrawingPlanes__Bounds__.js:110-113, 217-229`). VV's current category keys are `ValeVision__MainBuildingModel__*` and `ValeVision__LandscapeEnvironment` (VV ModelLayers config), which these tokens would match; older VV exports with coarse categories ("Landscape", "Walls" - TV plan line 133) would not. The TV plan's note that VV's keys are "shorter" may be stale. Verify on a real VV project (D37 Doous) before choosing tokens. **[Verifier correction]** VV's loader names each model-root child group by its category key (`VVM/15__ModelLoader/Na__ModelLoader__MultiModel.js:857`, `categoryGroup.name = category`). The keys come from three regexes (`:145-148`):
  - current exports: `ValeVision__<Category>` (e.g. `ValeVision__MainBuildingModel__Existing/__Proposed/__ProposedDoors`, `ValeVision__LandscapeEnvironment`, `ValeVision__SiteBoundaries`);
  - storey exports: `Storey__<Storey>__<Element>`;
  - every older `__Layer-XX__` export: one bucket, `ValeVision__LegacyModel`.
  No VV path produces 'Landscape' or 'Walls' categories: the TV Bounds PORT NOTE (`TVM/47/Na__DrawingPlanes__Bounds__.js:47-50`) is stale. TV's tokens therefore match VV's current and storey exports as shipped (case-insensitive substring), and the AppConfig ports verbatim. A legacy single-bucket project matches no building token and takes TV's own `usedFallback` path: planes are sized from everything except ground and ignore tokens. That is a degrade, not a failure. Spot-check one legacy and one current project rather than writing VV-specific tokens.
- localStorage keys (`Na__DrawingPlanes__*`, `Na__North__CompassShown`) are origin-scoped; no change.
- `three/addons/lines/*` import-map entries exist in VV (`index.html:86`).

### b10. Cross Section Views (TV 48)

`Na__CrossSection__DevMenu__Editor__.js` (198 lines, 0.1.0): a placeholder panel (shared head with a disabled +, a note, and the list of elevations whose type is Section). Imports `DevRowShell.BuildPanelHead`, `ProjectData.CHANGED_EVENT`, `ElevData.GetElevations/IsSection`. **DOM id collision:** it binds `naCrossSectionDevItem`, `naCrossSectionDevToggle`, `naCrossSectionDevPanel` (`TVM/48/...Editor__.js:79-81`), which VV already uses for its live tool's per-project gate "Cross Section Tool" (`VV/index.html:855-866`, owned by `41/Na__UiFeature__CrossSectionView__DevControls.js`). Decision D-S02a-06. No export collision (`Na__CrossSection__DevMenu__Initialize` is new in VV's namespace).

### b11. VV legacy `40__System__2dElevationsView`

Still live in VV: a user-facing Tools menu item "Elevation View" (`VV/index.html:518-535`, init `index.html:2149`), its export overrides chained before the drawing preset's (`index.html:1874`), and `Na__RenderEffect__2dProfileLines__` is the ortho-aware profile pass VV's ComposerPreset is built on (`VVM/42/Na__DrawView__ComposerPreset__.js:93`). VV D06 keeps it "untouched for now"; TV has no counterpart (TV retired its page-layout tool, TD02, and never had this one). It blocks Option B's slot 40. Decision D-S02a-04: keep and renumber (e.g. 39) or retire the menu item and move `2dProfileLines` into DrawingViewCore.

### b12. TV releases v2.80-v2.172 touching these systems

| TV release | What | Files in scope | VV status |
|---|---|---|---|
| v2.80.0 (20-Sep) | North direction; elevations named from north; viewport identity | 46/* | Ported VV v2.67.0 (compass as TV 1.1.0 minus registry) |
| v2.82.0 (20-Sep) | Drawing planes; InteractiveOverlays; seed/centre on building; editors 1.1.0 | 47/*, 05 overlays, 42/45 editors | **Not ported** |
| v2.84.0 (20-Sep) | Compass quartered; Show Compass; planes shown set kept per project | 46 gizmo/editor/config, 47 overlay | Size ported; Show Compass and persistent planes **not** |
| v2.86.0 (20-Sep) | Menus rebuilt: drafts, DevRowShell, DraftGuard, DraftMaths, DrawingUsage, AutoName(Text), 48 placeholder, RowAccordion guard, RenameDrawing Stage*, ProjectData 1.3.0, Modal 1.1.0 | 40, 42, 45, 48, 21 | **Not ported** (VV ledger row 87: awaiting sign-off) |
| v2.87.0 (20-Sep) | Floor plan storey (sixth title fact) | 42 data/config/StoreyLevel/StoreyRow | **Not ported** |
| v2.94.0 (20-Sep) | Elevation depth fog | 45 data/mode/editor/rows, 40 RenderPreset 1.1.0 (+49) | **Not ported** (49 is TV-only) |
| v2.105.0 (21-Sep) | A floor plan is one storey (doors/swings by storey band) | 50 Storeys/DoorPose, LE SnapshotRenderer | Not ported ("rides with the pending plan doors port") - other slice |
| v2.112.0 (21-Sep) | Opening a drawing really leaves Walk; render-held suspend | 40 Transitions 1.1.0 | **Not ported** |
| v2.116.0 (21-Sep) | Sheet images; save steps | 40 ProjectData 1.4.0 | Not ported (LE slice needs `RegisterSaveStep`) |
| v2.140.0 (22-Sep) | Hide swings on roof plans; 1:200 | LE PlanDoors (needs 42 storey) | Not ported - depends on storey |
| v2.145.0 (22-Sep) | Draft of unsaved sheets survives either load order | 40 ProjectData 1.5.0 `IsLoaded` | Not ported |
| v2.146.0 (22-Sep) | Three guards round the project file | 40 ProjectData 1.6.0, local server routes, Modal 1.2.0 | Not ported (needs Flask routes) |
| v2.159.0 (23-Sep) | Storey seam flush-join tolerance | 50 | other slice |
| v2.161.0 (28-Sep) | Per-scene lighting | (VV-authored; ported to TV) | VV ahead; ThumbnailBake 1.0.1 carries the light |

TV git history confirms the target is stable: folders 41, 42, 45, 46, 47 and 48 were last changed by commits dated 20-Sep-2026 (`66cdd175` v2.82, `bef15277`, `62dade1c` v2.95 - the last carrying the v2.94 depth-fog edits to `41/...Engine__` 1.2.0 `RenderDepthInto`, `41/...CapMeshes__` 1.1.0 and four elevation files), and folder 40 by 22-Sep-2026 (`ProjectData__` 1.5.0/1.6.0, v2.145/v2.146); the 21-Sep `Transitions__` 1.1.0 (v2.112) and `ProjectData__` 1.4.0 (v2.116) fall between. TV's devlog records no explicit Adam sign-off for v2.80-v2.87 drawing items, though later releases build on them (v2.140 and v2.105 cite the v2.87 storey). VV's ledger row 87 still says "awaiting Adam's sign-off there" (decision D-S02a-07).

### b13. Layout Editor modules that depend on this slice (ordering)

From the import maps of both apps (Appendix B), these LE ports are blocked until the listed S02a work lands:

| LE module (TV path) | Needs from S02a | WP |
|---|---|---|
| `20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js` 1.1.0 (+v2.86 chosen-name hunk) | `Na__FpData__GetStoreyLevel`, `STOREY_CHANGED_EVENT`; `Elevation__NameIsAuto` written by AutoName | 05, 06 |
| `20__System__Viewports/Na__LayoutEditor__ViewportTitleText__.js` 1.1.0, Scrapbook `DrawingTitle__` 1.1.0, `ViewportLink__` 1.3.0, `Panel__ScrapbookParametric__` 1.3.0 | the storey `level` fact (through ViewportIdentity) | 05 |
| `20__System__Viewports/Na__LayoutEditor__PlanDoors__.js` (TV-only; Hide Swings v2.140) | `Na__FpData__GetStoreyLevel` | 05 |
| `40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` 1.9.0 | `Na__FpData__GetStoreyLevel` | 05 |
| `20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js` (TV-only) | `Na__ElevData__GetDepthFog`, `GetDepthFogPlane` (+49) | 14 |
| `25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` | `RenderPreset` name (rename), fog source (+49); section/profile calls stay seams | 12, 14 |
| `07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` 1.4.0/1.5.0, `SheetModel__` 1.35.0 | `Na__DrawData__IsLoaded`; `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY` | 03, 15 |
| `54__Feature__SheetImages/...Publish__.js` | `Na__DrawData__RegisterSaveStep` | 03 |
| `51__Feature__DrawingRegister/...Transactions__.js` | `Na__DrawData__Save(showToast, report, registerKeys)` | 03 |
| `66__Feature__DocumentSharing/...Share__Open__.js` | `Na__DrawData__IsLoaded` | 03 |
| `05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | `SuspendThreeD({ returnToOrbit: true })` | 11 |

The LE "Drawings" tab menu (TV v2.158.0, `TabStrip__` 2.0.0) lists SHEETS and depends only on ProjectData's sheets array; nothing in this slice blocks it.

---

## (c) Module-by-module table

State key: HO = header-only (code identical), DR = drifted, TV = TV-only, VV = VV-only. Versions are DEVELOPMENT LOG tops.

### Drawing core

| TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 40/Na__DrawView__ActiveView__.js | 1.0.0 | 42/same | 1.0.0 | HO | nothing | no_action | - | - |
| 40/Na__DrawView__AppConfig__.json | - | 42/same | - | HO | `ProfileEdgeWidth` 0.55 + note (TV) vs 1.0 | keep_vv_divergence | DIV-1 width | - |
| 40/Na__DrawView__ConfigState__.js | 1.0.1 | 42/same | 1.0.0 | HO | 1.0.1 (13-Sep) fallback 0.55 | keep_vv_divergence | keep 1.0 | - |
| 40/Na__DrawView__DevRowShell__.js | 1.0.0 | - | - | TV | v2.86 panel shell | port_verbatim | paths; Modal >= 1.1.0 | DrawingUsage, ProjectData report, Modal |
| 40/Na__DrawView__DraftGuard__.js | 1.0.0 | - | - | TV | v2.86 draft guard | port_verbatim | paths only | DraftMaths, RowAccordion, ProjectData RegisterPayloadGuard+report, Modal |
| 40/Na__DrawView__DraftMaths__.js | 1.0.0 | - | - | TV | v2.86 pure maths | port_verbatim | - | - |
| 40/Na__DrawView__DrawingUsage__.js | 1.0.0 | - | - | TV | v2.86 pure usage | port_verbatim | - | - |
| 40/Na__DrawView__MarkupFocus__.js | 1.1.0 | 42/same | 1.1.0 | HO | nothing | no_action | - | - |
| 40/Na__DrawView__MarkupMount__.js | 1.0.0 | 42/same | 1.0.0 | DR | VV imports split dimension ConfigState (VV ahead) | no_action | - | - |
| 40/Na__DrawView__MaterialPreset__.js | 1.1.0 | 42/same | 1.1.0 | DR | TV dual key read, no engine gate | keep_vv_divergence | VV ledger 898-900 decision | - |
| 40/Na__DrawView__Navigation__.js | 1.0.0 | 42/same | 1.0.0 | HO | nothing | no_action | - | - |
| 40/Na__DrawView__ProfileLines__.js | 1.0.0 | - | - | TV | DIV-1 overlay route | keep_vv_divergence | VV uses composer + 40/2dProfileLines | - |
| 40/Na__DrawView__ProjectData__.js | 1.6.0 | 42/same | 1.2.0 | DR | 1.3.0 payload guard, 1.4.0 save steps, 1.5.0 IsLoaded, 1.6.0 base guard + SavedIso, report/registerKeys | port_adapted | keep VV Flask+R2SaveProjectJson transport, LayoutModeEnabled; no migration region | R2SaveProjectJson result; WCP server (1.6.0) |
| 40/Na__DrawView__RenameDrawing__.js | 1.1.0 | 42/same | 1.0.0(+loader 15-Sep) | DR | 1.1.0 StageHolders/StageFloorPlan/StageElevation | port_adapted | restamp via `Na__LeLoad__PrepareRestamp/RestampForScene` | - |
| 40/Na__DrawView__RenderPreset__.js | 1.1.0 | 42/Na__DrawView__ComposerPreset__.js | 1.3.0 | TV/VV pair | same 8-function interface, opposite route; TV 1.1.0 fog in RenderFrame | rename_move | rename VV file+exports to RenderPreset, keep composer route | 49 for fog |
| 40/Na__DrawView__RowAccordion__.js | (v2.86) | 42/same | (v2.21.14) | DR | change guard, OnOpenChanged, RequestOpenId, lead/trail | port_whole_reapply_vv | console prefix only | - |
| 40/Na__DrawView__SceneLinkRow__.js | 1.0.0 | 42/same | 1.0.0 | HO | nothing | no_action | - | - |
| 40/Na__DrawView__SectionAdapter__.js | 1.0.0 | 42/same | 1.2.0 | DR | DIV-2 implementations; identical 13 exports | keep_vv_divergence | - | - |
| 40/Na__DrawView__StyleRows__.js | 1.0.0 | 42/same | 1.0.0 | HO | identical; unused in TV | no_action | keep (VV D33) | D-S02a-02 |
| 40/Na__DrawView__Styles__DevMenu__.css | - | 42/same | - | DR | "Drawing Panel Shell" region | port_adapted | import LAST in CSS index | DevRowShell |
| 40/Na__DrawView__Transitions__.js | 1.1.0 | 42/same | 1.0.0 | DR | 1.1.0 ReturnToOrbit + options.returnToOrbit | port_adapted | ReturnToOrbit = VV SetOrbitMode; MaxEngine culling path; keep Initialize | LE ModeController call |
| - | - | 42/Na__DrawView__ThumbnailBake__.js | 1.0.1 | VV | VV-only bake | keep_vv_divergence (+backport) | save adapter -> DraftGuard SaveBlock | D-S02a-02 |

### Section engines

| TV path | TV ver | VV path | VV ver | State | Difference | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 41__System__SectionCutEngine/* (CapGeometry 1.0.0, CapMeshes 1.1.0, ConfigState 1.0.0, Engine 1.2.0, Engine AppConfig, SceneData 1.0.0, Serialize 1.0.0) | - | 41__System__CrossSectionView/* (CapGeometry 1.0.0, Config.json, PlaneGizmo 1.0.0, SceneData 1.1.0, SystemLogic 1.1.0, UiFeature Controls 1.1.0, DevControls 1.0.0) | - | TV/VV | DIV-2 engines; same CrossSection__SceneData keys; opposite positionMm sign; TV restore listener dead; TV lacks approach flag; TV engine 1.2.0 / caps 1.1.0 add RenderDepthInto for the 49 fog | keep_vv_divergence | RenderDepthInto equivalent when 49 lands (WP-14) | D-S02a-03, 49 |

### Floor plans

| TV path | TV ver | VV path | VV ver | State | What VV lacks | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 42/Na__FloorPlan__AppConfig__.json | - | 43/same | - | HO | storey block + 6 labels | port_adapted | union with VV labels | StoreyLevel |
| 42/Na__FloorPlan__ConfigState__.js | 1.1.0 | 43/same | 1.0.0 | DR | `GetStoreyLevelSetup` | port_verbatim | paths | StoreyLevel |
| 42/Na__FloorPlan__DevMenu__Editor__.js | 2.0.0 | 43/same | 1.2.0 | DR | 1.1.0 planes, 2.0.0 rebuild | port_whole_reapply_vv | SectionAdapter, PlanDim ConfigState, VV-only features per D-S02a-02 | 03,04,05,07 |
| 42/Na__FloorPlan__DevMenu__RowBuilders__.js | 2.0.0 | 43/same | 1.2.0 | DR | 2.0.0 shell rows + storey row | port_whole_reapply_vv | styles/exclusions row per D-S02a-02 | DevRowShell, StoreyRow |
| 42/Na__FloorPlan__DevMenu__StoreyRow__.js | 1.0.0 | - | - | TV | v2.87 storey dropdown | port_verbatim | - | data 1.1.0 |
| 42/Na__FloorPlan__Framing__.js | 1.0.0 | 43/same | 1.0.0 | HO | VV adds IsDrawingApproach (VV ahead) | keep_vv_divergence (+backport) | - | - |
| 42/Na__FloorPlan__ModeController__.js | 1.1.0 | 43/same | 1.2.2 | DR | TV older; VV drawing-core routed | keep_vv_divergence | - | - |
| 42/Na__FloorPlan__OrthoCamera__.js | 1.0.0 | 43/same | 1.0.0 | HO | nothing | no_action | - | - |
| 42/Na__FloorPlan__ProjectJson__Data__.js | 1.1.0 | 43/same | 1.1.1 | DR | storey API; TV first-arg convention | port_whole_reapply_vv | keep STYLE_KEYS export, Dimensions default, trimmed tokens | StoreyLevel, ConfigState 1.1.0 |
| 42/Na__FloorPlan__SceneLink__.js | 1.0.0 | 43/same | 1.0.0 | DR | TV keeps stale SyncSceneName | no_action | - | - |
| 42/Na__FloorPlan__StoreyLevel__.js | 1.0.0 | - | - | TV | v2.87 pure | port_verbatim | - | - |
| 42/Na__FloorPlan__Styles__DevMenu__.css | - | 43/same | - | DR | storey note region | port_adapted | keep VV style-toggle region per D-S02a-02 | - |

### Elevations

| TV path | TV ver | VV path | VV ver | State | What VV lacks | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 45/Na__Elevation__AppConfig__.json | - | 46/same | - | HO | 12 labels (auto name, identity, update/revert/delete, plane captions) | port_adapted | union; keep SectionTargetGroup keys | - |
| 45/Na__Elevation__AutoNameText__.js | 1.0.0 | - | - | TV | v2.86 pure | port_verbatim | - | - |
| 45/Na__Elevation__AutoName__.js | 1.0.0 | - | - | TV | v2.86 | port_verbatim | 46->47 north path until renumber | north (present) |
| 45/Na__Elevation__ConfigState__.js | 1.0.0 | 46/same | 1.0.0 | DR | VV adds GetSectionGroupTarget (D28) | keep_vv_divergence | - | - |
| 45/Na__Elevation__DevMenu__Editor__.js | 2.1.0 | 46/same | 1.2.0 | DR | 1.1.0 planes, 2.0.0 rebuild, 2.1.0 fog | port_whole_reapply_vv | SectionAdapter.SetPlaneDistanceMm; SyncSceneGroup on mode change; VV features per D-S02a-02 | 03,04,06,07 (+49) |
| 45/Na__Elevation__DevMenu__RowBuilders__.js | 2.1.0 | 46/same | 1.1.0 | DR | identity statement, Advanced bearing, fog block | port_whole_reapply_vv | styles row per D-S02a-02; fog block staged | AutoName, DevRowShell (+49) |
| 45/Na__Elevation__FacePick__.js | 1.0.0 | 46/same | 1.0.0 | HO | identical; unused in TV since v2.82 | no_action | delete in lockstep later | - |
| 45/Na__Elevation__Framing__.js | 1.0.0 | 46/same | 1.0.0 | HO | VV IsDrawingApproach (VV ahead) | keep_vv_divergence (+backport) | - | - |
| 45/Na__Elevation__GizmoGrip__.js | 1.0.0 | 46/same | 1.0.0 | HO | identical; unused in TV | no_action | - | - |
| 45/Na__Elevation__ModeController__.js | 1.1.0 | 46/same | 1.1.1 | DR | TV 1.1.0 fog source; otherwise TV older | keep_vv_divergence | add fog SetSource with 49 | 49 |
| 45/Na__Elevation__OrthoCamera__.js | 1.0.0 | 46/same | 1.0.0 | HO | nothing | no_action | - | - |
| 45/Na__Elevation__PlaneGizmo__.js | 1.0.0 | 46/same | 1.0.0 | DR | VV extra helper flag | keep_vv_divergence | - | - |
| 45/Na__Elevation__ProjectJson__Data__.js | 1.1.0 | 46/same | 1.1.1 | DR | depth fog API; TV first-arg convention | port_whole_reapply_vv | keep SeededFrom per D-S02a-05, SetAzimuthDeg until editor port | 49 RecordData |
| 45/Na__Elevation__SceneLink__.js | 1.0.0 | 46/same | 1.1.0 | DR | VV SyncSceneGroup (D28); TV stale SyncSceneName | keep_vv_divergence (+backport) | - | - |
| 45/Na__Elevation__Styles__DevMenu__.css | - | 46/same | - | DR | identity/compass-mark region | port_adapted | keep style-toggle region per D-S02a-02 | - |

### North

| TV path | TV ver | VV path | VV ver | State | What VV lacks | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 46/Na__North__AppConfig__.json | - | 47/same | - | HO | ShownByDefault + 3 labels | port_verbatim | - | overlays |
| 46/Na__North__CompassGizmo__.js | 1.1.0 | 47/same | 1.0.0 | DR | registry, IsKept/SetKept | port_whole_reapply_vv | take TV whole (VV ledger) | InteractiveOverlays |
| 46/Na__North__Compass__.js | 1.0.0 | 47/same | 1.0.0 | HO | nothing | no_action | - | - |
| 46/Na__North__ConfigState__.js | 1.0.0 | 47/same | 1.0.0 | HO | nothing | no_action | - | - |
| 46/Na__North__DevMenu__Editor__.js | 1.1.0 | 47/same | 1.0.0 | DR | Show Compass; SyncCompass kept-or-open | port_whole_reapply_vv | D-S02a-09 on VV's sheet listeners | overlays |
| 46/Na__North__PickTool__.js | 1.0.0 | 47/same | 1.0.0 | HO | nothing | no_action | - | - |
| 46/Na__North__ProjectJson__Data__.js | 1.0.0 | 47/same | 1.0.0 | DR | `Save(showToast, report)` | port_adapted | needs ProjectData report | WP-03 |
| 46/Na__North__Styles__DevMenu__.css | 1.0.0 | 47/same | 1.0.0 | HO | nothing | no_action | - | - |

### TV-only systems and VV-only legacy

| TV path | TV ver | VV path | State | Purpose | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|
| 47__System__DrawingPlanes/ (AppConfig, Bounds, ConfigState, DevMenu__Controls, Grip, Maths, Overlay, PlaneMesh, Styles) | 1.x (v2.82/v2.84) | - | TV | planes in the 3D view | port_adapted | tokens verified on Doous; `IsPaused` in Invalidation; Begin/End in VV loop | InteractiveOverlays, DraftGuard (editors) |
| 05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js | 1.0.0 | - | TV | overlays invisible except interactive 3D frame | port_verbatim | LoadingSequence wiring | - |
| 48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js | 0.1.0 | - | TV | Cross Sections placeholder | port_adapted | DOM ids (D-S02a-06) | DevRowShell |
| - | - | 40__System__2dElevationsView/* (8 files) | VV | legacy Tools > Elevation View; 2dProfileLines | needs_decision | D-S02a-04 | - |

---

## (d) Wiring notes

1. **VV `index.html`** - add imports + init for `Na__PlaneOverlay__Initialize({ scene, modelRoot })`, `Na__PlaneGrip__Initialize({ renderer, camera, controls, modelRoot, showToast })`, `Na__PlaneUi__Initialize({ showToast })` (TV `Index.html:1747-1749`); `Na__CrossSection__DevMenu__Initialize()` inside the elevation mode `.then` (TV `:1767`); the Cross Sections `<li>` between Elevations and North (TV `:599-608`) with non-colliding ids (D-S02a-06). Init signatures for the floor plan / elevation mode controllers and editors are already identical (TV `:1676-1688, 1755-1768` v VV `:2219-2246`). Keep VV's `Na__DrawView__Transitions__Initialize` and ComposerPreset/RenderPreset init with `pipelineRef`. If the rename (WP-12) lands, update `index.html:1412, 1874, 2211`.
2. **CSS index** (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`) - add `47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css` after the elevation and north sheets; move the DrawView dev sheet to the end of the drawing group (TV `:105-149` order).
3. **Render loop** (`VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`) - `Na__InteractiveOverlays__BeginFrame()` on the 3D path after the drawing branch; `EndFrame()` in the tick's finally (TV `:1189`, `:1447`). Later, fog in the drawing branch (VV renders through `Na__DrawView__ComposerPreset__RenderFrame`, `:1323`).
4. **Invalidation** (`VVM/05__RenderPipeline/Na__RenderLoop__Invalidation.js`) - export `Na__RenderLoop__IsPaused`.
5. **Presentation modal** (`VVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` 1.0.0 -> TV 1.2.0) + modal CSS rules in `Na__PresentationMode__Styles__SceneCarousel__.css`.
6. **R2 save utility** (`VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`) - an option to suppress its own success toast and pass the mirror error text back, so `Na__DrawData__Save(showToast, report)` can fill `report.local`.
7. **Layout Editor call sites** - `51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:524` -> `SuspendThreeD({ returnToOrbit: true })`; `51/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` import rename to RenderPreset.
8. **Local server** (`WCP/server.py`) - only for the v2.146 save guard (WP-15): `GET /api/projects/<code>/drawings-fingerprint`, a base header on the project POST with 409 on mismatch, backups before overwrite (TV `NAAPPS/ProjectVision__LocalServer__Main__.py` functions `_drawings_fingerprint`, `_backup_before_overwrite`, `_list_backups`). The worker `whitecardopedia-editor-api` needs no change for anything in this slice (TV notes R2 is not judged either).
9. **Section bindings** - VV ProjectData keeps importing `Na__SectSceneData__GetProjectBlock` directly; adding `RegisterSectionBlockProvider` is optional (TV's is a registration to avoid an import cycle VV does not have).
10. **Devlog / versions** - every WP adds a `## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title` entry; `VV/ValeVision__DEVLOG__.md` is a hot file for all of them (serialise version numbers).
11. **[Verifier addition] Thumbnail capture signature (DIV-4 seam missed by the name check).**
    - TV: `Na__PresentationMode__Thumbnail__CaptureAndUpload(sceneId, targetWidthPx)` writes through `Na__CfApi__WriteThumbnailWebp` (`TVM/21/...Thumbnail__Renderer.js:261`).
    - VV: `CaptureAndUpload(sceneId, projectCode, showToast)` returns `{ ok:false, error:'missing scene id or project code' }` when no project code is given (`VVM/21/...Thumbnail__Renderer.js:229-231`).
    - TV's 2.x editors call it with the scene id only (`TVM/42/...Editor__.js:858`, `TVM/45/...Editor__.js:992`). Ported whole, every Update would toast "Thumbnail upload failed" and leave the card's picture as it was.
    - The same fault is ALREADY LIVE in VV: VV's ported Presentation Scenes batch op calls it with one argument (`VVM/21/Na__PresentationMode__DevMenu__BatchOps__.js:353`, wired to Update All Thumbnails at `SceneEditor.js:1360`). By code reading every batch thumbnail fails in VV today.
    - Fix once, in VV's renderer: when the second argument is not a string, take the project code from `Na__DrawData__GetProjectCode()` (or the ProjectLoader) and treat a number as `targetWidthPx`. TV callers then port verbatim and the batch op works. See S02a-V01.
12. **[Verifier addition] Shared service worker token.**
    - In production VV's shell JS is served stale-while-revalidate by the shared WebApps worker, keyed on `PWA_SW_VERSION_TOKEN` (`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`, `'2026-09-18-1'`). The VV ledger (`:161-175`) records four releases that added exports without a bump.
    - Every WP here adds or moves exports. The folder renumber (WP-01) moves about 70 module paths, so a warm client can run an old cached `index.html` or LE module against paths that now 404.
    - TV bumped its own token for the same reason in v2.86.0 (devlog: "Service worker token 2026-09-20-3").
    - Record "token needed" in each WP's devlog entry and let Adam decide the bump (S09 decision D-S09-06). See S02a-V02.

## (e) UI notes

- **Dev Tools > Floor Plans / Elevations** must look and behave as TV's: one row open across both panels; folded headers carry the plane's colour swatch, the name and chips (SECTION / ON SCREEN / NOT UPDATED); + in the panel head; captions over control groups; two-column actions grid (Preview/Annotate, then green Update/Revert); Delete alone below a rule; Advanced fold (model bearing); the Drawing Planes bar (All plans, All elevations, Snap, increment stepper) at the head of both panels; Show plane / Move to face / Aim at face under each name; the storey dropdown with its "guessed from ..." note and Confirm; the elevation identity statement with the compass mark. Dialogs: the Presentation Scenes modal with a details list, footnote and a green or red confirm.
- **Dev Tools > Cross Sections** placeholder between Elevations and North (TV `Index.html:599`).
- **Dev Tools > North Direction** gains Show Compass (pressed state, disabled until north is set).
- **3D view**: coloured drawing planes and the compass can stay up with the panels shut; neither ever appears in a sheet, thumbnail or export.
- **Top-bar fold animation** (TV v2.83.0) is outside this slice; the VV ledger records it ported as VV v2.70.0 (`VV/ValeVision__PARITY__TrueVisionLedger__.md:1235-1246`).
- **Visual check for Adam:** carousel plan/elevation look (b4) - VV applies whitecard/glass presets live, TV does not.

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S02a-01 | Renumber VV's drawing folders to TV's numbers? | (B) VV 42->40, 43->42, 44->43, 45->44, 46->45, 47->46, new 47/48/49 as TV; relocate VV 40 legacy. (A) keep D05 shift; TV 47->48, 48->49, 49 has no slot | **B**, executed first and alone (WP-01). It is the only option that gives every later port identical paths |
| D-S02a-02 | VV-only features in the rebuilt menus: Styles/Exclusions rows (D33) + live ApplyStyles, Ground Floor Plan (D11), thumbnail bake + Bake Missing (v2.46), bake linework before save (D20) | keep all as VV seams; keep some; drop all for identical menus | Keep all four inside TV's 2.x layout (Styles/Exclusions inside TV's Advanced fold, Ground Floor beside +, bake on add/seed/Update) and raise each as a TV back-port so the menus converge |
| D-S02a-03 | `CrossSection__SceneData` positionMm sign differs (TV +constant, VV -constant) | fix TV to VV's convention (+ migrate TV's saved bindings); accept and document | Fix TV (TD06 says VV's schema wins; TV's own mapping table says -constant); no VV change |
| D-S02a-04 | VV legacy `40__System__2dElevationsView` (user Tools > Elevation View) | keep and renumber (e.g. 39); retire the tool and move `Na__RenderEffect__2dProfileLines__` into DrawingViewCore | Keep the tool for now (D06), renumber to 39 to free slot 40; revisit retirement once drawings cover its use |
| D-S02a-05 | VV-only record key `Elevation__SeededFrom` | keep writing; stop writing (leave existing values); back-port | Stop writing new values when TV's editors arrive, keep reading/preserving existing ones |
| D-S02a-06 | DOM-id collision for the Cross Sections placeholder (`naCrossSectionDevItem/Toggle/Panel` used by VV's Cross Section Tool gate) | rename the 48 ids (both apps); rename VV's 41 gate ids; merge the placeholder into VV's gate item | Rename the 48 ids to `naCrossSectionViewsDev*` in VV and offer the same ids to TV. **[Verifier: prefer the second option]** Rename VV's own VV-only gate instead: `naCrossSectionDev{Item,Toggle,Panel,EnableCheck,Save}` -> `naCrossSectionToolDev*`. That is two files (`VV/index.html:855-866` and the constants at `VVM/41/Na__UiFeature__CrossSectionView__DevControls.js:79-83`; no CSS uses the ids). TV's 48 module then ports byte-for-byte and TV needs no change |
| D-S02a-07 | Port gate: TV v2.80-v2.87 drawing items show no recorded sign-off | port now; wait | Confirm with Adam; later TV work builds on them, so porting is low risk |
| D-S02a-08 | Mode controllers: TV 1.1.0 is older than VV 1.2.2 | keep VV; adopt TV's | Keep VV (DIV-1/DIV-2 seams), add the fog hook; offer TV the drawing-core routing |
| D-S02a-09 | North compass once overlays exist: drop VV's sheet-open and snapshot-queue listeners? | take TV 1.1.0 whole; keep listeners as defence | Take TV whole (VV ledger's own instruction); overlays cover every render path |
| D-S02a-10 | Rename `ComposerPreset__` -> `RenderPreset__` in VV | rename; keep | Rename (same interface, DIV-1 stays inside the file) |

## (g) Proposed work packages

Order: WP-01 -> WP-02, WP-03 -> WP-04 -> (WP-05, WP-06, WP-07, WP-11, WP-12 in parallel) -> WP-08 -> (WP-09, WP-10) -> WP-14 (after slice owning 49) -> WP-15 (after transport slice) ; WP-13 last.

**[Verifier corrections to the work packages - read before delegating]**
- WP-11 and WP-12 both edit `VVM/43/...ModeController__.js` and `VVM/46/...ModeController__.js` (WP-11 for `returnToOrbit`, WP-12 for the import rename). Run them one after the other, not in parallel.
- WP-04's test (`Na__Test__DrawingDrafts__.test.mjs:58-60`) also loads `45/Na__Elevation__AutoNameText__.js`, which this plan ports in WP-06. Move AutoNameText into WP-04: it is pure and imports nothing.
- WP-04 and WP-S03b-05 both take `21/Na__PresentationMode__DevMenu__Modal__.js` to 1.2.0. Give it to WP-04 (1.2.0 whole plus the modal CSS); S03b-05 then depends on WP-04.
- WP-03 and S03b's WP-S03b-04/05 both edit `42/Na__DrawView__ProjectData__.js`. WP-03 owns 1.3.0-1.5.0 plus the SavedIso stamp. The 1.6.0 base guard goes to the transport owner.
- **WP-S02a-14 is REFUTED as a duplicate**: WP-S02b-04 already covers 49, the 41 cap-depth export, the SectionAdapter pass-through, the ComposerPreset fog call, and the elevation data, mode controller, row builder and editor fog hooks. WP-S02b-05 covers LE `Viewport2d__DepthFog__`. Keep this slice's notes (F34, F57) as input to those WPs.
- **WP-S02a-15 is REFUTED as a duplicate**: WP-S03b-05 already covers ProjectData 1.6.0 (`GetBase`, `WhenBaseKnown`, `CheckBase`, `SAVED_ISO_KEY`), the base header, and the `WCP/server.py` fingerprint, 409 and backup, with the 32-check Python test. WP-S09-06 covers the same routes.
- New WP-S02a-16 (thumbnail capture signature, S02a-V01): fix VV's `CaptureAndUpload` to accept TV's call shape before WP-08.

**WP-S02a-01 Folder renumber (gated on D-S02a-01, D-S02a-04).** Move VV 42..47 to 40, 42..46 and relocate `40__System__2dElevationsView`; rewrite every import/`@delegate`/CSS/fetch path; update header FILE paths, PORT NOTE folder notes, ledger and plan paths. Acceptance: `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` pass; `grep -r "42__System__DrawingViewCore\|43__System__FloorPlanViews\|46__System__ElevationViews\|47__System__NorthDirection"` in `02__Src__AppModules`, `index.html`, `03__Style__AppStylesheets` returns nothing; app boots on localhost, a plan and an elevation preview and a sheet opens (Adam). Size L.
  **[Verifier corrections]**
  - The acceptance grep must list all SEVEN old names: add `44__System__PlanAnnotations`, `45__System__PlanDimensions` and `40__System__2dElevationsView`. Measured: 67 files outside the moved folders reference an old name. That includes `02__AppData/Na__AppConfig__Main.json:385`, `10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js:384` (`@delegate`), `01__AppCore/Na__AppFlow__LoadingSequence.js`, three files in 21 and `80__Testing__PrototypeEnvironment/Na__Test__NorthCompass__.test.mjs`. Add the first two to the hot files.
  - The module-graph harness only reads JS import specifiers (`Na__Verify__ModuleGraph__.mjs:72`). It cannot see:
    - `fetch()` and config paths written from the app root (e.g. `40__System__2dElevationsView/Na__ElevationView__SystemLogic.js:67`, `CONFIG_PATH = './02__Src__AppModules/40__System__2dElevationsView/...'`);
    - CSS `@import` lines;
    - the LE loader's `Na__LeLoad__STYLESHEETS` list.
    The seven-name grep is the gate for these.
  - Use `git mv` so history follows. Move in this order: 40 to 39 first, then 42 to 40, 43 to 42, 44 to 43, 45 to 44, 46 to 45, 47 to 46. Every old name carries a unique system suffix, so the text replacements cannot collide.
  - Run it only when no other VV session is working: a renumber under a parallel session's edits breaks both.
  - Record the service-worker token need (S02a-V02, D-S09-06).

**WP-S02a-02 Interactive overlays.** New `05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js` (verbatim); Begin/End wiring; `Na__RenderLoop__IsPaused` in Invalidation. Acceptance: module graph passes; with no overlay registered every render path is byte-for-byte unchanged (spot check a thumbnail and a sheet 3D viewport); a registered test group is visible only in live 3D frames. Size S. **[Verifier correction]** Call `BeginFrame` straight after the drawing early-return, as TV does. The Video Studio preview is an arm of the same if/else, not a separate branch (see b9). If overlays should stay out of the video preview, guard the call with `!Na__VideoStudio__Preview__IsPlaying()`. Implement `IsPaused` as a reason set kept inside `Na__RenderLoop__Pause`/`Resume`. That set is complete: every VV pause goes through those two functions (the only external caller is the LE ModeController, `:523/:567`).

**WP-S02a-03 ProjectData seam.** `Na__DrawData__IsLoaded`, `RegisterPayloadGuard` + payload copy, `RegisterSaveStep` + phases, `SAVED_ISO_KEY` stamp, `Save(showToast, report, registerKeys)` filling `report.local`/`report.steps`/`report.cloudSaved`; R2SaveProjectJson quiet option; North `Save(showToast, report)`. Keep VV transport and LayoutModeEnabled; no migration. Acceptance: exports verifier lists the 5 new names; a save with a report shows one toast; a save with a registered payload guard writes the guarded copy (Node test against stubs, pattern of TV `Na__Test__DraftGuard__.test.cjs` minus the base guard). Size M. **[Verifier notes]**
  - The guard and the save steps must run on a JSON deep copy of the drawings block put into the merged `projectData`, as TV does at `TVM/40/...ProjectData__.js:775-779`. VV's Save currently assigns the LIVE block by reference (`VVM/42/...ProjectData__.js:401`), so a guard run there would revert the author's open draft in memory.
  - VV has a single writer of the drawings block (`Na__DrawData__Save` is the only place that sets `projectData[BLOCK_KEY]`; checked across every `R2SaveProjectJson` caller), so the guard covers every save.
  - `registerKeys.localFirst` (TV register deletions) has no VV equivalent: `R2SaveProjectJson` always writes R2 first. Leave it to the register slice (S07a).
  - The base-guard (1.6.0) part of the TV DraftGuard test belongs to WP-S03b-05.

**WP-S02a-04 Draft core.** `DraftMaths__`, `DrawingUsage__`, `DevRowShell__`, `DraftGuard__` (verbatim); `RowAccordion__` (TV whole); `RenameDrawing__` Stage functions on VV's loader route; DrawView CSS shell region + CSS index order; Modal 1.2.0 + modal CSS. Tests: port `Na__Test__DrawingDrafts__.test.mjs` (folder paths; fixture from VV's D37 project or its `builtFixture()`). Acceptance: test passes; existing VV panels still fold (callers unchanged); module graph + exports pass. Size M. **[Verifier correction]** Add `46/Na__Elevation__AutoNameText__.js` (pure, verbatim) to this WP: the DrawingDrafts test loads it (`:60`).

**WP-S02a-05 Floor plan storey.** `StoreyLevel__`, `DevMenu__StoreyRow__`, `ConfigState__` 1.1.0, `ProjectJson__Data__` TV 1.1.0 whole (TV first-argument convention; keep VV extras), AppConfig storey block + labels, CSS storey note. Test: `Na__Test__FloorPlanStoreyLevel__.test.mjs` (paths). Acceptance: test passes (36 checks incl. config-vs-fallback); a plan named "Roof Plan" reports storey roof without writing the record; `Na__FpData__CreatePlan(presentationConfig, {})` adds the plan to `LayoutEditor__DrawingsData__FloorPlans` and leaves the presentation block untouched. Size M.

**WP-S02a-06 Elevation auto name + data.** `AutoNameText__`, `AutoName__`; `ProjectJson__Data__` TV 1.1.0 whole minus the fog import until 49 (or with it, if 49 has landed), TV first-argument convention, SeededFrom per D-S02a-05; labels; identity CSS. Test: port `Na__Test__ElevationGeometry__.html`. Acceptance: with north set, a new elevation is named "<Word> Elevation", a second "<Word> Elevation 2"; typed names stick; `Na__ElevData__CreateElevation(presentationConfig, {})` writes to the drawings block only. Size M.

**WP-S02a-07 Drawing planes.** `47__System__DrawingPlanes/` (9 files) with VV category tokens checked on Doous; index.html init; CSS index import. Test: `Na__Test__DrawingPlanes__.test.mjs` (47 checks). Acceptance: test passes; on Doous the plane spans the building (not the site); drag snaps to the absolute grid; no plane in a thumbnail, a sheet 3D viewport or an image export with planes switched on (Adam). Size L. **[Verifier correction]** Port the AppConfig tokens verbatim (see b9). VV's current and storey exports match them, and legacy `ValeVision__LegacyModel` projects use TV's whole-model fallback. Two extra checks: a plane hovered in front of a VV Cross Sections gizmo takes the drag (the Grip listens in the capture phase, `TVM/47/...Grip__.js:669`); and Video Studio export frames and Export Render Layers show no plane.

**WP-S02a-08 Floor Plans and Elevations menus.** TV `DevMenu__Editor__` 2.0.0/2.1.0 and `DevMenu__RowBuilders__` 2.0.0/2.1.0 whole, re-applying: SectionAdapter calls; PlanDim label from ConfigState; SyncSceneGroup on mode change; D-S02a-02 features (styles/exclusions + ApplyStyles, Ground Floor Plan, ThumbnailBake via `SaveBlock`, BakeBeforeSave on Update); fog block staged; AppConfig label union; style-toggle CSS kept. Acceptance: TV DrawingMenus plan s.2 items 1-17 reproduced (rows fold; NOT UPDATED chip; another panel's save writes the last-updated record; leave prompt; Update dialog names the sheets; Delete dialog; + adds on the building centre; panel follows the carousel); module graph + exports pass; Adam tests on Doous. Size XL.

**WP-S02a-09 Cross Sections placeholder.** `48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js` with D-S02a-06 ids; `<li>` + init. Acceptance: panel lists Section-type elevations; VV's Cross Section Tool gate still works. Size S.

**WP-S02a-10 North Show Compass.** CompassGizmo + DevMenu Editor TV 1.1.0 whole, AppConfig keys. Test: re-run `Na__Test__NorthCompass__.test.mjs`. Acceptance: compass kept across reload; absent from sheets/thumbnails/exports while kept. Size S.

**WP-S02a-11 Transitions 1.1.0.** ReturnToOrbit + options gate on VV's SetOrbitMode; LE ModeController passes `{ returnToOrbit: true }`. Test: port `Na__Test__SheetPagingWalkExit__.test.mjs` transitions checks. Acceptance: walking in 3D while a scene save restamps sheet viewports stays in Walk; opening a sheet while walking leaves Walk. Size S. **[Verifier correction]** The scope must also change VV's two VV-only callers, `VVM/43/Na__FloorPlan__ModeController__.js:465` and `VVM/46/Na__Elevation__ModeController__.js:526`, to `SuspendThreeD({ returnToOrbit : true })`. Otherwise opening a plan or elevation while walking stops leaving Walk. Add both files to the hot files. Add an acceptance line: opening a floor plan and an elevation from the carousel while walking lights Orbit. The LE ModeController line belongs to S03a's whole-file port; coordinate, do not edit twice. Run after or before WP-12, never alongside it.

**WP-S02a-12 RenderPreset rename (D-S02a-10).** Rename file + exports; update five importers; PORT NOTE. Acceptance: module graph + exports pass; plan/elevation preview, sheet bake and image export unchanged. Size S. **[Verifier correction]** There are five importers plus the comment at `42/Na__DrawView__ConfigState__.js:30`. `Na__Verify__Exports__` does not read `index.html`, so the index lines (`1412, 1874, 2211`) need the grep check. Give the renamed `RenderFrame` an optional `camera` argument (see b4).

**WP-S02a-13 Ledger and documents.** VV ledger rows for every new module; close superseded "Pending back-port" rows (Pick Face/grip superseded by planes; scene editor splits withdrawn; style rows/config state, dimension splits, confirm dialog, R2 asset upload, whole LE closed); a back-port memo for TV (positionMm sign, dead scene-activated listener, missing IsDrawingApproach, unused StyleRows, dropped BakeBeforeSave, Ground Floor Plan, ThumbnailBake, SyncSceneGroup, stale realign-plan rows "FacePick + GizmoGrip - not yet ported"). Size S.

**[REFUTED by verifier: duplicate of WP-S02b-04 (+ WP-S02b-05 for the LE layer), which already scopes every item below. Treat this text as input to those WPs.]** **WP-S02a-14 Depth-fog hooks (after the slice that ports 49).** Elevation data fog API, ModeController SetSource, fog in VV's composer RenderFrame, editor/row fog block, LE `Viewport2d__DepthFog__` unblocked. DIV-2 seam: TV's fog layer draws the live cut's caps into its depth buffer through `Na__SectionCut__RenderDepthInto` (engine 1.2.0) / `Na__SectMesh__RenderDepthInto` (caps 1.1.0), imported straight from TV 41 (`TVM/49/Na__ElevationDepthFog__RenderLayer__.js:476`). VV needs the same capability over its live Cross Sections caps; recommended shape: a `Na__DrawView__SectionAdapter__RenderDepthInto` added to BOTH apps' adapters (TV pass-through, VV over `41/Na__CrossSectionView__SystemLogic`), so the 49 layer imports the adapter and ports verbatim. Size M.

**[REFUTED by verifier: duplicate of WP-S03b-05 (ProjectData 1.6.0 + `WCP/server.py` fingerprint/409/backup + the 32-check Python test) and WP-S09-06 (the same Flask routes). Keep F06 as evidence for those WPs.]** **WP-S02a-15 Drawings save guard (after the transport slice).** Flask fingerprint route, base header + 409, backups; client `GetBase`, `WhenBaseKnown`, `CheckBase`. Test: adapt `Na__Test__ProjectDataSaveGuard__.test.py` to `WCP/server.py`. Size M.

---

## Appendix A - names TV files import that VV does not have (check_names.py, current folder map)

- Floor plan editor 2.0.0: `Na__FpData__GetStoreyLevelChoices`, `STOREY_CHANGED_EVENT`; files DraftGuard, DevRowShell, 47 Overlay/Grip/DevMenu__Controls/Maths/ConfigState; `Na__DrawRename__StageFloorPlan`; `41/Na__SectionCut__Engine__.js` (`SetPlaneHeightMm`, VV seam); `Na__PlanDim__GetLabel` (VV: 45 ConfigState).
- Floor plan row builders 2.0.0: StoreyRow, DevRowShell.
- Elevation editor 2.1.0: `41/...Engine__` (`SetPlaneDistanceMm`, seam); `Na__ElevData__GetDepthFog`; AutoName; DraftGuard; DevRowShell; `Na__DrawRename__StageElevation`; 47 Overlay/Bounds/Grip/DevMenu__Controls/Maths.
- Elevation row builders 2.1.0: `Na__ElevData__Get/SetDepthFog`; `49/...DevMenu__Row__`; AutoName; DevRowShell.
- DraftGuard: DraftMaths; `Na__DrawData__RegisterPayloadGuard`; `Na__DrawFold__SetChangeGuard`, `OnOpenChanged`.
- DevRowShell: DrawingUsage. 48 placeholder: DevRowShell. AutoName: AutoNameText. StoreyRow: storey data API.
- Planes Grip: `Na__RenderLoop__IsPaused`; Planes Overlay: `05/...InteractiveOverlays__`.
- North CompassGizmo 1.1.0: InteractiveOverlays; North editor 1.1.0: `Na__NorthGizmo__IsKept/SetKept`.
- Floor plan data 1.1.0: `Na__FpCfg__GetStoreyLevelSetup`, StoreyLevel. Elevation data 1.1.0: `49/...RecordData__`.
- Transitions 1.1.0 / Elevation ModeController 1.1.0: `05/Na__RenderEffect__DistanceCulling__.js` (VV path `05/02__Engine__MaxEngine/`), `41/...Engine__` (seam), `Na__PlanDim__Load` (VV: ConfigState), 49 RenderLayer.
- LE: ViewportIdentity/PlanDoors/Panel__ViewportSettings need `Na__FpData__GetStoreyLevel` (+`STOREY_CHANGED_EVENT`); Viewport2d__DepthFog needs `Na__ElevData__GetDepthFog/GetDepthFogPlane` + 49; SnapshotRenderer needs RenderPreset, `41/Serialize__`, `ProfileLines__`, `41/ConfigState__`, 49; AutoSave needs `IsLoaded, GetBase, WhenBaseKnown, SAVED_ISO_KEY`; SheetModel needs `IsLoaded`.

## Appendix B - who imports the drawing folders (outside them)

TV: LoadingSequence (ActiveView, MarkupMount, ProfileLines, SectionCut Engine, both ModeControllers, ElevFog); 21 BatchOps/SceneEditor/SceneLightingRows/Thumbnail renderer; 30 TiledRenderer (ProfileLines, SectionCut); 50 ProjectedLinework (ProjectData, ActiveView, both ModeControllers, both data modules); 51 LE ModeController, Assets, AutoSave, SheetModel(+Common, State, Viewports), SheetRecords, MarkupBridge, PlanDoors, Viewport2d__DepthFog, ViewportIdentity, SnapshotRenderer, Panel__ViewportSettings, Specification (7), DrawingRegister (3), StatementWriter (3), SheetImages (2), Scrapbook panel, PdfExporter, Publish, Share (2).
VV: LoadingSequence (ActiveView, ComposerPreset, MarkupMount, ProjectData, both ModeControllers); 21 SceneEditor/ScenePersistence (41 SceneData), SceneLightingRows, SceneRowBuilders (RenameDrawing); 50 ProjectedLinework (same as TV); 51 Loader (ProjectData incl. LayoutModeEnabled), ModeController, Assets, AutoSave, SheetModel(+Common, State, Viewports), SheetRecords, MarkupBridge, ViewportIdentity, SnapshotRenderer (41 SystemLogic, ComposerPreset, MaterialPreset, SectionAdapter, Transitions), Panel__ViewportSettings, Specification (6), PdfExporter.

---

## Verification

**Verifier:** adversarial pass, 01-Oct-2026. Read-only against TV `b2aa9151` and VV `7b4e593a`. Scripts and outputs are in `parity/verify_s02a/`: `codecmp.py`, `jsonkeys.py`, `sigcheck.py` (parameter-count drift for every named import of a TV file against the mapped VV module), `devlog_scope*.py`. Nothing was run in either app.

### Coverage

Every file in scope was enumerated from `tree_tv.tsv`, `tree_vv.tsv` and `drift_all.tsv`:
- TV 40 (21 files), 41 (7), 42 (12), 45 (15), 46 (8), 47 (9) and 48 (1): 73 files.
- VV 42 (17), 41 (7), 43 (10), 46 (13), 47 (8) and 40 legacy (8): 63 files.

Each file is accounted for in table (c) or in an aggregated row (41 engines, 47 planes, VV 40 legacy, VV 41 tool). No in-scope file is missing.

One tooling note: `drift_all.tsv` labels both `Framing__` pairs "header-only", although each carries a one-line code difference past the header (VV's `IsDrawingApproach`). The survey had already caught this.

### What was checked

**Critical and high findings: all 17 opened and checked (100 percent).** F01, F04, F05, F07, F08, F09, F21, F23, F25, F26, F27, F30, F31, F32, F41, F42 and F49.

**Medium and low findings: 38 of 42 sampled.**

**Method:**
- File headers and DEVELOPMENT LOG tops for every claimed version.
- `git log` on both repos for every in-scope folder since 12-Sep. Nothing touched TV 40-48 after 22-Sep, or VV 42/43/46/47 after 28-Sep.
- A comment-stripped code diff of every pair the survey calls code-identical: confirmed, 0 lines.
- AppConfig key diffs.
- Searches across VVM (all folders, `node_modules` excluded) for every "VV lacks" item, under other names too: draft guard, payload guard, save steps, IsLoaded, storey level, auto names, interactive overlays, drawing planes. None exists in VV.
- Every rename and renumber importer re-counted. The F01 counts reproduce exactly (51/124, 11/22, 7/14, 9/33, 11/23, 6/13, 4/6). There are 67 unique referencing files outside the moved folders.
- TV and VV call sites read for every dependency claim.

### Corrections made in place (marked [Verifier ...] above)

1. **F12 / WP-11 (Transitions).** VV's own floor plan and elevation mode controllers call `SuspendThreeD()` bare (`VVM/43/...ModeController__.js:465`, `VVM/46/...:526`). TV's controllers never use Transitions. Port the options gate alone and VV stops leaving Walk when a drawing opens. Both callers must pass `{ returnToOrbit : true }`. The LE ModeController line belongs to S03a.
2. **F14 / WP-12 (RenderPreset rename).** The eight names match but two signatures do not: TV `RenderFrame(camera)` against VV `RenderFrame()`, and VV's `Enter` also takes `edgeWidthPx`. S04a keeps VV's SnapshotRenderer as a DIV-1 adaptation. The rename removes a name translation only. Give `RenderFrame` an optional camera.
3. **F21 (positionMm sign).** Confirmed by re-derivation through VV's SectionAdapter. TV's Serialize comment rests on a false premise. TV's own plan example (line 217) contradicts its mapping (line 245). Severity lowered from high to medium: no live fault, and no VV change.
4. **F27 / b3 item 5 (BakeBeforeSave).** TV did not "drop" the call: its editors never had it (git `-S` history). TV's `PLAN__PublishingSystem__.md:31` says it has no callers, and v2.155 moved baking to publish time. Keep VV's D20 bake until VV adopts publish-time baking (S08). It is not a back-port in its current form.
5. **F41 / WP-02 (overlay Begin placement).** VV's Video Studio preview is an arm of the same if/else as Walk, Fly and Orbit, so "Begin after that branch" does not exclude it. Begin goes right after the drawing early-return, guarded by `!Na__VideoStudio__Preview__IsPlaying()` if wanted. Video export, Export Render Layers and tiled export render outside the tick.
6. **F43 / WP-07 (planes bounds tokens).** VV has no 'Landscape' or 'Walls' categories. Category groups are named `ValeVision__*` or `Storey__*`, and every legacy export lands in one bucket, `ValeVision__LegacyModel`. TV's tokens port verbatim. Legacy projects take TV's whole-model fallback. Severity lowered from medium to low.
7. **F46 / D-S02a-06 (DOM ids).** Preferred fix: rename VV's VV-only gate ids (two files) so TV's 48 module ports byte-for-byte and TV needs no change.
8. **F01 / WP-01 (renumber).**
   - The acceptance grep needs all seven old names; two hot files were missing.
   - The module-graph harness cannot see `fetch()` or config paths, CSS `@import`, or the loader stylesheet list.
   - Use `git mv` in the order 40 to 39 first, then 42 to 40 and down; schedule it with no parallel VV session; record the service-worker token need.
9. **b2.** DraftGuard is imported by the two editors only; the 48 placeholder imports DevRowShell.
10. **WP-04.** Must also carry `AutoNameText__`: the ported DrawingDrafts test loads it.
11. **WP-03.** The payload guard must act on a deep copy; VV's Save assigns the live block by reference.
12. **WP-11 and WP-12** share two hot files: serialise them.

### Refuted work packages (duplicates of other slices)

- **WP-S02a-14 (depth-fog hooks):** fully inside WP-S02b-04 and WP-S02b-05.
- **WP-S02a-15 (drawings save guard):** fully inside WP-S03b-05 and WP-S09-06.

The findings behind them (F06, F34, F57) stand as evidence for those WPs.

Ownership overlaps to settle in planning:
- `21/...DevMenu__Modal__` 1.2.0: give it to WP-S02a-04; S03b-05 then depends on it.
- `42/...ProjectData__`: 1.3.0-1.5.0 in WP-S02a-03, 1.6.0 in S03b-05.

### Added

- **S02a-V01 - Thumbnail capture signature (medium).**
  - TV `CaptureAndUpload(sceneId, targetWidthPx)` against VV `CaptureAndUpload(sceneId, projectCode, showToast)`, which refuses a call without a project code. Name-only checks cannot see this.
  - TV's 2.x editors pass the scene id only (`TVM/42/...Editor__.js:858`, `TVM/45/...:992`), so every ported Update would fail to re-render its card.
  - The same fault is already live in VV's ported Presentation Scenes batch op (`VVM/21/...BatchOps__.js:353`, wired at `SceneEditor.js:1360`): by code reading, "Update All Thumbnails" fails for every scene in VV today.
  - Fix in VV's renderer: resolve the project code itself when it is not passed. That fixes both and lets TV callers port verbatim. New **WP-S02a-16**, before WP-08.
- **S02a-V02 - Service-worker token for every export- or path-changing WP (medium).** The shared WebApps worker serves VV shell JS stale-while-revalidate (`WCP/.../Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`). The renumber moves about 70 module paths. TV bumped its own token for v2.86. Gate on D-S09-06.

### Still unverified (code reading only, nothing run)

- The positionMm mirror and its cross-app effect: no cross-app fixture was run.
- VV's "Update All Thumbnails" failure: inferred from the guard clause at `VVM/21/...Thumbnail__Renderer.js:230-231`. Adam can confirm with one press on localhost.
- Whether VV's 71 Export Render Layers passes (SceneStateGuard, ShadowMask traversal) ever set `visible = true` on scene children outside the model root, which would defeat the overlay registry.
- Pointer precedence between the planes Grip (capture phase) and VV's 41 Cross Sections gizmos and 25 object interaction.
- The live-carousel look difference (F55) and the full UI list (F58): not inspected visually.
- Bounds behaviour on a real VV project (Doous): category names come from the loader code, not from a loaded model.
- `WCP/server.py` and the worker source were not opened by this pass; transport items now sit with S03b and S09.
