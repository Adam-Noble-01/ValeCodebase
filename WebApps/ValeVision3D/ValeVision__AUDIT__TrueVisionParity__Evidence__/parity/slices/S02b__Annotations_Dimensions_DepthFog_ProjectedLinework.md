# S02b - Plan Annotations, Plan Dimensions, Elevation Depth Fog, Projected Linework

Parity analysis, TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target). Read-only audit, 01-Oct-2026.

- TV app root `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` (devlog top v2.172.0, 29-Sep-2026)
- VV app root `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` (devlog top v2.71.0, 28-Sep-2026)
- Paths below are relative to each app root unless written in full. `TVM/` = `02__Src__AppModules` under TV, `VVM/` = the same under VV.

---

## Contents

- (a) Scope
- (b) Narrative findings by sub-system
  - b.1 Plan annotations (TV 43 / VV 44)
  - b.2 Plan dimensions (TV 44 / VV 45) - the split that only one app finished
  - b.3 Projected linework (50 / 50) - what VV already has, what it lacks, version by version
  - b.4 The door module dependency (25) - the one hard sequencing constraint
  - b.5 Elevation depth fog (TV 49, no VV folder) and VV's own 29 FogPlaneSystem
  - b.6 Lantern Designer items
  - b.7 The three TV documents in scope
  - b.8 Cross-slice items found on the way (15 ModelLoader, 05 Supersampler, 03 SnapshotHistory, 52 Published Documents)
  - b.9 Ledger, PORT NOTE and devlog accuracy
- (c) Module-by-module table
- (d) Wiring notes
- (e) UI notes
- (f) Decisions needed
- (g) Work packages
- Appendix A - normalised code diff counts
- Appendix B - TV back-port markers versus what is really pending
- Appendix C - evidence index

---

## (a) Scope

### Folders and file counts

| App | Folder | Files | Lines | Notes |
|---|---|---|---|---|
| TV | `TVM/43__System__PlanAnnotations` | 8 | 3,193 | |
| VV | `VVM/44__System__PlanAnnotations` | 8 | 3,285 | same 8 file names |
| TV | `TVM/44__System__PlanDimensions` | 15 | 6,958 | holds VV's split files too, but does not use them (b.2) |
| VV | `VVM/45__System__PlanDimensions` | 15 | 6,727 | same 15 file names |
| TV | `TVM/49__System__ElevationDepthFog` | 8 | 2,211 | TV-only folder, authored 20-Sep-2026 (v2.94.0) |
| VV | (none) | 0 | 0 | numbers 48 and 49 are free in VV |
| TV | `TVM/50__System__ProjectedLinework` | 28 | 11,834 | 25 shared + 3 TV-only (DoorPose, FlushJoins, Storeys) |
| VV | `VVM/50__System__ProjectedLinework` | 25 | 9,845 | no VV-only file |
| VV | `VVM/29__System__FogPlaneSystem` | 7 | 1,990 | VV-only, examined for overlap with the depth fog |

In scope: 59 TV files, 55 VV files. About 60 supporting files were read for wiring (door module x2 + FindDoorGroups, both LoadingSequences, VV ComposerPreset, VV CrossSectionView SystemLogic, TV SectionCut Engine + CapMeshes, both Index.html and CSS indexes, both Main configs, both MultiModel loaders, both Supersamplers, VV R2AssetUpload + ProjectLoader, the WCP worker asset handler, TV/VV Viewport2d__Window, TV PlanDoors, TV Viewport2d__DepthFog, TV Elevation ProjectJson Data + ModeController, TV MarkupBridge, TV FloorPlan ModeController, VV Thumbnail renderer, VV TiledRenderer, six TV tests, three TV docs, the VV parity ledger, the TV realign plan, both devlogs, the Lantern Designer projection folder).

### Method

1. `ref/drift_all.tsv` rows for the four folder pairs.
2. A normalised code diff of every shared file: header block stripped (through the closing `// ====` after DEVELOPMENT LOG), `TrueVision`/`ValeVision` and folder numbers (`40/42`, `42/43`, `43/44`, `44/45`, `45/46`, `46/47`) normalised, whitespace collapsed. This separates real code drift from identity text. Counts are in Appendix A. Diffs were kept in `scratchpad/parity/work_s02b/diffs/`.
3. Full import/export graph of folders 50, 49 and 29 in both apps (`work_s02b/imports_50_49.txt`).
4. Every DEVELOPMENT LOG and PORT NOTE header in scope (`work_s02b/hdr_*.txt`), cross-checked against TV devlog entries v2.27.0, v2.37.0, v2.42.0, v2.48.1, v2.63.1/2, v2.64.1, v2.94.0, v2.103.0, v2.105.0, v2.126.0, v2.140.0, v2.159.0.
5. Ledger rows (VV `ValeVision__PARITY__TrueVisionLedger__.md` phases 2 and 4, the 13-Sep and 18-Sep return trips, the pending back-port table) and TV realign plan rows V, X, AA, AH.

### A caution the swarm must read first

**Version numbers collide between the apps.** VV numbered its own ports of TV work. VV `ClipWorker` 1.1.0, VV `WorkerPool` 1.1.0, VV `ModelStage` 1.1.0 and VV `DevMenu__Controls` 1.1.0 are NOT TV's 1.1.0 of those files. Example: VV ModelStage 1.1.0 is TV ModelStage 1.2.0 (the content stamp); TV's 1.1.0 (edge rules in the fingerprint) is not in VV. Never decide "VV is behind" by comparing numbers. Use the table in (c), which is built from code, not from headers.

**The TV back-port markers are stale in places** (Appendix B). They under-report what is pending (Pipeline 1.5.0, Projector 1.5.0, StageSampler 1.2.0, ConfigAccess 1.2.0, CpuBackend 1.4.0 are not in them). *Corrected by verifier:* the PORT NOTE markers do NOT list ConfigAccess 1.1.1, Projector 1.4.1 or ModelStage 1.2.0 as pending (ModelStage's marker correctly says 1.2.0 was ported as VV v2.57.0); the only stale "PENDING" for an already-ported change is the CpuBackend 1.3.1 DEVELOPMENT LOG entry ("Back-port PENDING to ValeVision3D"), which VV took as its CpuBackend 1.2.1.

**Verifier caution - this slice overlaps four others and conflicts with two.** Read the "## Verification" section at the end before scheduling: S02a's D-S02a-01 recommends renumbering VV's drawing folders to TV's numbers (which would delete every folder-number seam this report lists), S02a WP-14 / S09 WP-07, WP-08, WP-12 / S04a WP-06, WP-07, WP-08 / S06b WP-08 cover the same files as WP-S02b-01, 03, 04, 05, 06 and 07, and S09 WP-10 renames SnapshotHistory in the opposite direction to D-S02b-12.

---

## (b) Narrative findings by sub-system

### b.1 Plan annotations (TV `43__System__PlanAnnotations` / VV `44__System__PlanAnnotations`)

- Seven of eight files are code-identical after normalisation (Data, Editor, History, Hotkeys, Overlay, Styles, AppConfig). The only differences are identity text, folder numbers and two import seams:
  - VV's `Na__PlanAnnotations__Toolbar__.js` imports `Na__PlanDim__GetTextSetup` from `45/Na__PlanDimensions__ConfigState__.js`; TV imports it from `44/Na__PlanDimensions__Data__.js` (b.2).
  - Both History modules import the shared snapshot history under different file names: VV `03__AppUtils/Na__AppUtils__SnapshotHistory__.js`, TV `03__AppUtils/Na__AppUtils__SnapshotHistory.js` (b.8).
- **One real delta: TV Toolbar 1.1.0 (21-Sep-2026, TV v2.126.0 "A Colour Palette Opens Above Every Colour Field").** `TVM/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js` imports `Na__ColourPalette__Attach` from `../54__Feature__ColourPalette/Na__ColourPalette__.js` and calls it once on the dimension colour `<input type="color">` (one import block, one line in the swatch builder). VV Toolbar is 1.0.0. VV has no `54__Feature__ColourPalette` folder, so this waits for the Colour Palette port (another slice). TV's `Na__Test__ColourPalette__.test.mjs` fails by name on any colour input built without `Na__ColourPalette__Attach`, so porting that test to VV without this hunk will fail.
- The AppConfig descriptions in both apps still say annotations are stored "nested within PresentationMode__SavedCameraScenes". Since DIV-3 they live in `LayoutEditor__DrawingsData`. Cosmetic, the same in both apps, no action needed for parity.

### b.2 Plan dimensions (TV `44__System__PlanDimensions` / VV `45__System__PlanDimensions`) - the split that only one app finished

**Functionally, plan dimensioning is identical in the two apps.** Every record, overlay, editing, axis lock, crosshair, client mode and disclaimer rule is the same code. The whole 795-line diff is one structural difference:

- On 09-Sep-2026 (VV v2.18.0, port Phase 2) VV split TV's 1.0.0 files to stay under the 900-line budget:
  - the config fetch and every `Get*Setup` getter -> `Na__PlanDimensions__ConfigState__.js`
  - the rubber-band preview -> `Na__PlanDimensions__EditorPreview__.js`
  - all nine consumers in VV import from ConfigState. VV `Data` is 662 lines and VV `Editor` is 843.
  - *Verifier precision:* 17 VV files import `Na__PlanDimensions__ConfigState__.js` - 11 inside 45 (AxisLock, ClientMode, Crosshair, Data, Disclaimer, Editor, EditorPreview, History, Hotkeys, Overlay, VertexEditor) and 6 outside (44 Toolbar :109, 43 FloorPlan ModeController :194 and DevMenu Editor :184, 46 Elevation ModeController :199, 42 MarkupMount :116, 51 MarkupBridge :180). The failure modes of a blind copy differ by file: TV's `Editor` imports `GetEditingSetup/GetInteractionSetup/GetLayerSetup/GetLineSetup` from `Data`, which VV's `Data` does not export, so copying TV's Editor alone fails to LINK; copying TV's `Data` alone links but creates a second, never-loaded config state (TV's own latent defect).
- On 10-Sep-2026 TV copied both split files in "verbatim" (their TV PORT NOTEs say so, `TVM/44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js:28-33`) **but never rewired anything to them**:
  - TV `Data` still holds the whole config layer (`Na__PlanDim__Load` at `Data__.js:259`, exported at `:949`) and is 989 lines. TV `Editor` still holds the preview inline and is 908 lines. Both are over the 900-line budget that TV's own realign plan sets ("keep the splits rather than re-merging", `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:295-297`).
  - TV `EditorPreview__.js` is imported by nothing. TV `ConfigState__.js` is imported only by that orphan and by `TVM/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js:259`.
  - TV's mode controllers load config through Data (`TVM/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js:160-163`, `45/Na__Elevation__ModeController__.js:179`), so **TV's ConfigState is never loaded**. TV's MarkupBridge therefore reads ConfigState's built-in fallbacks for the plan-dimension Line and Text setup. Today the only fallback that differs from the JSON is `FontFamily`: `'Open Sans', sans-serif` instead of `'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. It is a latent TV defect: any later JSON edit will silently not reach the Layout Editor's plan-dimension markup in TV.
- **The ledger says this is closed and it is not.** `ValeVision__PARITY__TrueVisionLedger__.md:34-37` lists "dimension config and preview splits" as closed, while the pending back-port table still lists it at `:1220`.

**Instruction for the swarm: do NOT copy TV's `Na__PlanDimensions__Data__.js` or `Na__PlanDimensions__Editor__.js` over VV's.** That would re-merge the split and break VV's nine consumers (they import from ConfigState). VV's arrangement is the target. The fix goes the other way: rewire TV to the split (a TV-side job for Adam to approve), after which the two folders copy file for file.

*Verifier - full TV rewire list (WP-S02b-10R).* TV files that import config getters (`Get*Setup`, `GetLabel`, `Load`) from `44/Na__PlanDimensions__Data__.js` today: inside 44 - AxisLock :75, ClientMode :68, Crosshair :54, Disclaimer :51, Editor :83 and :131, EditorPreview :60 (it imports from BOTH Data and ConfigState), History :45, Hotkeys :74, Overlay :97, VertexEditor :75; outside 44 - `40/Na__DrawView__MarkupMount__.js:103`, `43/Na__PlanAnnotations__Toolbar__.js:102`, `42/Na__FloorPlan__DevMenu__Editor__.js:220` (GetLabel), `42/Na__FloorPlan__ModeController__.js:163` (Load), `45/Na__Elevation__ModeController__.js:179` (Load), and `51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js:258` (record getters, which stay on Data). The original WP-S02b-10 hot-file list named only six of these.

Minor: VV `45/Na__PlanDimensions__Styles__.css:8` still carries the title line `TRUEVISION3D - PLAN DIMENSIONS - STYLES` inside its body comment.

### b.3 Projected linework (`50__System__ProjectedLinework` in both apps)

#### b.3.1 What VV already has (no action)

Taken over the earlier return trips and verified in code:

| TV work | TV version | In VV as | Evidence |
|---|---|---|---|
| Owner tags per segment (edge styles), CPU-only kept renders, asset schema 2 | v2.27.0 (13-Sep) | VV v2.30.0 | Owners code-identical. ClipKernel, ClipWorker, WorkerPool, EdgeExtractor, StageSampler, AuthoredEdges, CpuBackend, Projector and Persistence owner paths are code-identical. Ledger `:673-701` |
| Linetype annotation linework (uncut, unclipped) | v2.63.1/2 (18-Sep) | VV v2.56.1 (ConfigAccess 1.0.1, CpuBackend 1.2.1, Projector 1.1.1) | `Na__PlCpu__SplitAnnotation` identical. Ledger `:342-368` |
| Content stamp in the model fingerprint | v2.64.1 (ModelStage 1.2.0) | VV v2.57.0 (VV ModelStage 1.1.0) | Only TV's edge-rule lines differ. Ledger `:1178` |
| `Na__PlPipe__ForgetCollections` (a forced render repaints) | v2.64.1 | VV v2.57.0 | `VVM/50/...Pipeline__.js:585`; used by VV `ForceRender__.js:144`. Neither app's Pipeline header logs it |
| Rotation path (D40) in SoupBuilder / EdgeExtractor; hidden segments through the worker pool | VV originals (port Phase 4) | Both apps identical | SoupBuilder, WorkerPool and ClipWorker have zero normalised code diff (b.6) |

Eleven files are code-identical, so they need no action: ClipWorker, WorkerPool, DiffHarness, Owners, ExportCompositor, FlatBvh, RasterPreview, Scheduler, SoupBuilder, SvgOverlay and Styles__Main. WebGpuBackend differs only in comments.

#### b.3.2 What VV lacks - by TV feature, oldest first

| # | TV feature | TV devlog | Files touched in folder 50 | Adam's sign-off in TV |
|---|---|---|---|---|
| 1 | **Design-phase seams**: optional model root in `RenderDefinition` and optional fingerprint in `GetCached` | v2.32.0 (Pipeline 1.2.0, 13-Sep) | Pipeline | TV PORT NOTE calls this a TV divergence (no model groups in VV). Every existing caller passes neither, so it is harmless to take verbatim (decision D-S02b-08) |
| 2 | **Projected linework matches the 3D view**: `HideFlushJoins` (on), `SeamsOcclude` (on), `LineworkFirst` (off), all three in the fingerprint, BuildToken `2026-09-14-flush-joins` | v2.37.0 (14-Sep) | NEW FlushJoins 1.0.0; ClipKernel 1.2.0; EdgeExtractor 1.3.0; AuthoredEdges 1.2.0 (Categories); CpuBackend 1.3.0; Projector 1.2.0; Pipeline 1.3.0; ConfigAccess 1.1.0; ModelStage 1.1.0; DevMenu__Controls 1.1.0; AppConfig | **Signed off 14-Sep-2026** ("That works great", realign plan row V `:865`). VV port "Pending Adam's sign-off" (`:866`) |
| 3 | **Plan door pose**: Layout Editor plans draw doors open, with swing arcs; a click closes one | v2.42.0 (14-Sep) | NEW DoorPose 1.0.0; ViewDefinition 1.1.0; StageSampler 1.1.0 (posed panels keep copied matrices); Projector 1.3.0; Pipeline 1.4.0 | Row AA: "Tested by Adam" is blank (`:886`). VV port pending |
| 4 | **Doors shut on elevations and sections**, plus `PutBack` | v2.48.1 (14-Sep) | DoorPose 1.1.0; ViewDefinition 1.2.0; Projector 1.4.0 | Row AH: not tested by Adam. VV port pending with AA (`:913`) |
| 5 | **Nested LineworkModifier tags** (SSOT 76-79): a detail nested in Walls or Windows draws under its own owner key | 20-Sep (StageSampler 1.2.0). **No TV devlog entry**; mentioned only in passing in v2.159.0 (`TrueVision__DEVLOG__.md:1037`) | StageSampler 1.2.0 (`ModifierOwnerFor`, prefix match because three.js strips `::`); AuthoredEdges per-node owners (**not logged** in its header); ConfigAccess `GetLineworkModifiers` (**not logged**); AppConfig `ProjectedLinework__LineworkModifiers__Config` | Unknown - no devlog entry to say |
| 6 | **One storey per plan**: a plan stands open only its own storey's doors, and storey-bound annotation (`Linetype__DoorSwings`, `Linetype__ClearanceLines`) keeps to its band | v2.105.0 (21-Sep) | NEW Storeys 1.0.0; DoorPose 1.2.0; Projector 1.5.0; CpuBackend 1.4.0; Pipeline 1.5.0; ConfigAccess 1.2.0; AppConfig `ProjectedLinework__Storeys__Config` | Not recorded as tested |
| 7 | **Hide swings**: the hit test ignores swing ground when a pose draws no swings | v2.140.0 (22-Sep) | DoorPose 1.3.0 (the rest is Layout Editor) | "NOT tried by Adam; NOT in ValeVision" (`TrueVision__DEVLOG__.md:2700` region) |
| 8 | **Flush joins at modelling tolerance**: 1e-4 m in place of 1e-5 / 1e-6; BuildToken `2026-09-23-flush-tolerance` | v2.159.0 (23-Sep) | FlushJoins 1.1.0; AppConfig | Fault found on Adam's RB05 D02 |
| 9 | Persistence 1.2.1: FetchAsset reads the URL's project folder | 14-Sep | Persistence | **Not applicable to VV** (DIV-4, b.3.4) |

All of items 2-8 are TV-authored and marked "Back-port PENDING to ValeVision3D, on Adam's sign-off".

**Correction to the TV devlog.** TV v2.159.0 says "ValeVision has FlushJoins 1.0.0 with the old tolerances and the same fault waiting" (`TrueVision__DEVLOG__.md:1067`). That is wrong. VV has no FlushJoins file and no `HideFlushJoins`/`SeamsOcclude`/`LineworkFirst` code anywhere in `VVM/` (searched). VV is missing the whole of feature 2, not just its tolerance. In practice, VV elevations today draw every flush join TV v2.37.0 removed: the head-height line across a render wall, sill lines across piers, the line under a fascia, and the join between an old wall and a new one.

#### b.3.3 Per-file deltas (code, not headers)

| File | TV ver | VV ver | What TV has that VV lacks (normalised +TV / -VV lines) |
|---|---|---|---|
| AppConfig.json | - | - | +25/-5: `Projection__HideFlushJoins/SeamsOcclude/LineworkFirst` (v2.37.0); `Storeys__Config` (Enabled, CategoryPrefix `Storey__`, FloorToleranceMm 500, AnnotationTokens `Linetype__DoorSwings`, `Linetype__ClearanceLines`) (v2.105.0); `LineworkModifiers__Config` (four TagName -> OwnerKey rows, OwnerKey `TrueVision__LineworkModifier__FineDetail/VeryFineDetail`); `Model__BuildToken` `2026-09-23-flush-tolerance` (VV `2026-09-18-linetype-annotation`); annotation note; `DiffLabel` "Run Diff" (VV "Run Diff (cpu vs legacy)") |
| AuthoredEdges | 1.2.0 | 1.1.0 | +54/-17: `Categories` Set of linework-shipping categories, named before the visibility test (1.2.0); per-node owner tags for nested LineworkModifier nodes via `Na__PlSampler__ModifierOwnerFor` (unlogged, 20-Sep) |
| ClipKernel | 1.2.0 | 1.1.0 | +8/-1: `settings.SeamsOcclude` - a triangle side along the edge is the crossing (`TVM/50/...ClipKernel__.js:308`). Without it, the output is byte-identical |
| ConfigAccess | 1.2.0 | 1.0.1 | +57/-2: projection fallbacks + getters for the three rules (1.1.0); `GetStoreySetup` (1.2.0); `GetLineworkModifiers` (unlogged); fallback build token. **TV defect**: fallback `buildToken '2026-09-21-storey-swings'` (`:129`) is not the JSON's `2026-09-23-flush-tolerance` (`AppConfig:120`), and the comment above `GetAnnotationSetup` reads "Get the Model Sampling Setup" (`:389`) |
| CpuBackend | 1.4.0 | 1.2.1 | +34/-8: `SeamsOcclude` posted to workers; linework-first Set into both extractions; `Na__PlFlush__CutFlushJoins` before the clip (1.3.0); storey band for annotation with `Na__PlStorey__ForCut/MarkKeys/KeepEdges`, `Storey` in the report (1.4.0) |
| DevMenu__Controls | 1.1.0 | 1.1.0 (different content) | +16/-4: three timings rows (Linework first, Seams occlude, Flush joins) and the Diff note (TV 1.1.0, v2.37.0) |
| EdgeExtractor | 1.3.0 | 1.2.0 | +41/-10: optional `lineworkCategories` Set in `ExtractStageEdges` and `ExtractIntersectionEdges`; lazy trees; `PairsLinework`/`SelfLinework` counters (1.3.0) |
| ModelStage | 1.2.0 | 1.1.0 (= TV 1.2.0) | +4/-0: `edges`/`seams`/`joins` in the fingerprint (TV 1.1.0) |
| Persistence | 1.2.1 | 1.2.0 | +17/-6: TV `Na__PlStore__FolderId` from the URL's year and project folder (1.2.1, TV R2 layout - n/a for VV); `Na__DevGate__IsAuthoringEnabled` in place of `IsRunningOnLocalhost` for `BakeBeforeSave` (TD01). *Verifier: BOTH deltas are VV seams - do not port either (see b.3.4 correction). Also keep VV's IndexedDB name `ValeVision3D__ProjectedLinework`.* |
| Pipeline | 1.5.0 | 1.1.0 (+ForgetCollections) | +60/-19: optional model root and fingerprint (1.2.0); collection key carries linework-first (`lf0/lf1`) plus report fields (1.3.0); door pose hash `dp...` in the key and `Na__PlDoors__AppendSwings` (1.4.0); storey band `st...` in the key, swings left off per storey, the storey in the report (1.5.0) |
| Projector | 1.5.0 | 1.1.1 | +66/-6: rules in `BuildOptions`, forced off for a named backend (1.2.0); door pose Apply / `SwingEdges` / `PutBack` around `Collect` (1.3.0, 1.4.0); `Storeys` rule and `Na__PlDoors__Storeys` measured on **every** collection (1.5.0, `TVM/50/...Projector__.js:359`); `LineworkCategories` on the collection; trees primed only for testable instances |
| StageSampler | 1.2.0 | 1.1.0 | +62/-14: `posedMods` -> copied matrices and `PosedModsDrawn` (1.1.0); `Na__PlSampler__ModifierOwnerFor` + style owner per mesh (1.2.0) |
| ViewDefinition | 1.2.0 | 1.0.0 | +50/-21: `Na__PlView__DoorPose` normaliser, fourth argument on `FromPlan`/`FromElevation`, `d` in the record hash (1.1.0, 1.2.0). `Na__PlView__Flags` reads both `Styles__X` and `x` spellings in TV; VV reads one. Both return the same value, because `GetStyles` returns flag names in both apps |
| WebGpuBackend | 1.0.0 | 1.0.0 | Comments only |
| DoorPose (TV-only) | 1.3.0 | - | 807 lines. 13 exports: `Apply`, `PutBack`, `Restore`, `SwingEdges`, `AppendSwings`, `HitTest`, `IsClosed`, `KeyFor`, `KEY_JOIN`, `Records`, `StoreySamples`, `Storeys`, `StoreyBand` |
| FlushJoins (TV-only) | 1.1.0 | - | 308 lines, imports nothing (worker-safe). One export, `Na__PlFlush__CutFlushJoins` |
| Storeys (TV-only) | 1.0.0 | - | 320 lines, imports nothing, pure. 11 exports. Matches `Storey__<Key>__<Element>` **unanchored**, so VV's `Storey__${storeyName}__${elementType}` categories (`VVM/15__ModelLoader/Na__ModelLoader__MultiModel.js:146,194`) match as they stand |

#### b.3.4 Persistence and transport (DIV-4)

- **TV 1.2.1 (`Na__PlStore__FolderId`) must not be ported.** TV fixed a TV-only mismatch: its bake uploads to the URL's folder (`26-Projects/PS01__MustersRoad`) while FetchAsset read a folder named after the code. In VV, upload and fetch both use `Na__AppUtils__NormalizeProjectFolderId(projectCode)` (`VVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js:199`, `VVM/50/...Persistence__.js:447`), so they already agree. Keep VV's line as a permanent seam.
- ~~**The authoring gate should follow TV.**~~ **REFUTED by verifier (recommendation reversed): keep VV's `IsRunningOnLocalhost()` bake gate.** VV's `03/Na__AppUtils__DevGate__.js` header says the gate decides only whether authoring UI is OFFERED and that "the data path keeps the raw hostname test", because VV's writes depend on the local Flask server; its PORT NOTE lists this as a deliberate divergence from TV. `BakeBeforeSave` is a data-path write: it uploads through `Na__AppUtils__R2AssetUpload`, which fetches the worker URL and key from Flask `GET /api/editor-config` (`03/Na__AppUtils__R2SaveProjectJson__.js:96`) and then writes the Flask mirror. VV applies the same rule to Layout Editor asset writes (`51/07/Na__LayoutEditor__Assets__.js:144` `Na__LeAssets__CanUpload` uses `IsRunningOnLocalhost`, where TV's uses DevGate). Under DevGate an installed or GitHub Pages VV session with `?authoring=on` would render every drawing and then fail at the worker-config fetch. TV can use DevGate because its transport writes straight to its worker with no Flask (`TV 03/Na__AppUtils__R2AssetUpload__.js` PORT NOTE). So VV's line 597 is a permanent DIV-4 seam alongside the folder-id line. Note also that TV never calls `BakeBeforeSave` at all (see Verification, S02b-V01), so TV's TD01 edit there is dead code in TV.
- **No worker or server change is needed for this slice.**
  - The WCP worker's asset guard already allows `LayoutEditor/Linework` (`WebApps/Whitecardopedia/CloudflareWorker/src/handlers/CloudflareHandler__ProjectAsset__.js:51`), and so does the client guard (`R2AssetUpload__.js`).
  - Door pose and fog data nest inside records already saved under `LayoutEditor__DrawingsData`.
  - The asset schema stays at 2.
- **The BuildToken bump has an operational cost.** Every baked VV linework asset (R2 and IndexedDB) reads as stale once. Until each VV project is re-baked on an authoring machine (Save Floor Plans / Save Elevations, or Dev > Bake All to R2), public viewers will compute linework in their own browser on first open. Plan a re-bake pass per live VV project (D-S02b-09).

### b.4 The door module dependency (`25__System__3dObject__InteractionSystem`) - the one hard sequencing constraint

`Na__ProjectedLinework__DoorPose__.js` imports:

- `Na__DoorAnimation__FindDoorGroups` from `25/Na__DoorAnimation__FindDoorGroups.js`. This is a TV-only 107-line file (v1.1.0, 06-Jun-2026). **VV has no such file.**
- From `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`: `Na__DoorAnim__MOD_TYPE_ROT_ONLY`, `MOD_TYPE_FIXED`, `DescribeDoors`, `ComputePanelLocalPose`, `ApplyPanelTransform` and `GetLiveProgress`. These are TV door module 1.9.0 (14-Sep) exports. **VV's module (1.7.1) exports none of them.** It defines the constants and `ApplyPanelTransform` internally but does not export them, and `DescribeDoors`, `ComputePanelLocalPose` and `GetLiveProgress` do not exist.

ES modules link all-or-nothing. As soon as VV's Projector, Pipeline or CpuBackend take their TV versions, the import of DoorPose fails to link. That breaks `Na__PlPipe__Initialize` in `index.html`, the Dev section, and every Layout Editor 2D viewport. Projector 1.5.0 also calls `Na__PlDoors__Storeys` on every collection, even with no door pose (`Projector__.js:359`).

**The door module upgrade must land first.** Merge TV 1.9.0 (and 1.8.0, decision D-S02b-11) onto VV 1.7.1 while keeping VV's own `Na__DoorAnimation__SnapAllClosed`, `GetSpeedScale`, `SetSpeedScale` and `GetBaseDurationMs`, which Video Studio uses. Export comparison:

- TV-only: `ApplyPanelTransform`, `ComputePanelLocalPose`, `DescribeDoors`, `FindAdrAncestor`, `GetLiveProgress`, `IsDoorOpen`, `MOD_TYPE_*` x4, `ResolveHitPanel`
- VV-only: `GetBaseDurationMs`, `GetSpeedScale`, `SetSpeedScale`, `SnapAllClosed`

VV models use the same `ProposedDoors`/`ExistingDoors` category tokens and the ADR/MOD/ROT naming, because VV 1.7.0 "backported the complete multi-panel engine from the current TrueVision reference". TV row AA's precondition ("needs ValeVision's door module to carry the same ADR / MOD / ROT contract first", realign plan `:887`) is therefore met for naming. The missing part is the exports.

### b.5 Elevation depth fog (TV `49__System__ElevationDepthFog`, no VV folder) and VV's own `29__System__FogPlaneSystem`

#### b.5.1 What TV built (v2.94.0, 20-Sep; shader fix v2.103.0, 21-Sep)

**A paper-white fog that thickens behind a drawing's plane.** It is drawn as a layer over the finished drawing, so it fades linework as well as surfaces.

**Record.** Three numbers per drawing, saved inside the elevation record as `Elevation__DepthFog { DepthFog__Enabled (false), DepthFog__StartDepthMm (1000), DepthFog__EndDepthMm (15000), DepthFog__FalloffPercent (50) }`. The block is written on first read (off) by the elevation normaliser. Nothing is added at the top of the project file.

**Modules (8 files, 2,211 lines):**

| Module | Exports | Imports | Port |
|---|---|---|---|
| `Na__ElevationDepthFog__AppConfig__.json` | - | - | verbatim. Colour `#ffffff`, MaxOpacity 1, EdgeGuardPx 1, EmptyReachPx 12, labels |
| `__ConfigState__` (`Na__ElevFogCfg`) | `Load`, `IsEnabled`, `GetDefaults`, `GetLimits`, `GetAppearance`, `GetLabel`, `FormatLabel` | the JSON only | verbatim |
| `__Maths__` (`Na__ElevFogMath`) | 18 exports - block normaliser, Schlick bias, `DepthBehindPlane`, `SolveAffineDepth`, `Token`, ... | nothing (pure) | verbatim |
| `__RecordData__` (`Na__ElevFogData`) | `Ensure`, `Read`, `Write`, `KEY_ELEVATION`, `KEY_FLOORPLAN` | ConfigState, Maths | verbatim |
| `__Shader__` | `VERTEX`, `FRAGMENT` | nothing | verbatim (includes the v2.103.0 premultiplied fix, which is **not logged** in its header) |
| `__RenderLayer__` (`Na__ElevFog`) | `Initialise({renderer, scene})`, `SetSource({getSettings, getPlane})` (returns the previous source), `GetSource`, `IsWanted`, `RenderOverlay(camera)`, `RenderLayerFrame(camera)`, `Dispose` | three, `three/addons/postprocessing/Pass.js` `FullScreenQuad`, 04 Units, **`41__System__SectionCutEngine/Na__SectionCut__Engine__.js` `Na__SectionCut__RenderDepthInto`** (TV section engine, DIV-2) | adapted |
| `__DevMenu__Row__` (`Na__ElevFogRow__Build`) | `Build` | ConfigState, **`40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js` (`Na__DrawShell__Button`, `Na__DrawShell__Caption`) - TV-only file** | adapted |
| `__Styles__DevMenu__.css` | `.na-depthfog-dev*` | relies on `.na-draw-dev__caption` and `.na-draw-dev__choice` (TV 40 dev-row CSS, **absent in VV**) and `.na-pm-dev__btn`/`__input` (present in VV) | verbatim, plus its dependency |

**TV wiring:**

- **Init:** `Index.html:919` (import), `:1783` `Na__ElevFog__Initialise({ renderer, scene })`. NOT localhost-only.
- **CSS:** `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:130`.
- **Overlay call - three places carry TV's drawing frame sequence** (flat render -> silhouettes -> FOG -> cut fills):
  - `01__AppCore/Na__AppFlow__LoadingSequence.js:1176`
  - `40/Na__DrawView__RenderPreset__.js:302` (Layout Editor bake)
  - `21/Na__PresentationMode__Thumbnail__Renderer.js:196` (card thumbnail)
- **Source:** `45/Na__Elevation__ModeController__.js:471` `SetSource({ getSettings: () => GetDepthFog(elevation), getPlane: () => GetDepthFogPlane(elevation) })`, cleared at `:644`.
- **Record:** `45/Na__Elevation__ProjectJson__Data__.js` 1.1.0 - `GetDepthFog`, `SetDepthFog`, `GetDepthFogPlane` (`:484-526`), `Ensure` in the normaliser (`:276`) and in the creator (`:641`).
- **Dev row:** `45/...DevMenu__RowBuilders__.js:602` places the Fog block under View depth and above Advanced. `...DevMenu__Editor__` 2.1.0 words the Update/Discard dialogs. Fog is not a move key.
- **Section caps:** `41/Na__SectionCut__Engine__.js:547` `RenderDepthInto` -> `CapMeshes__.js:340`, which draws the caps into whatever depth target is bound with no clear, so a poche reads as lying on the plane.
- **Sheet side (Layout Editor, another slice):**
  - new `51/20/Na__LayoutEditor__Viewport2d__DepthFog__.js` (`Na__LeVp2d__FogFor`)
  - `Viewport2d__Frame__` 1.2.0 (a sixth frame layer, between linework and markup) and `Viewport2d__` 1.12.0
  - `25/SnapshotRenderer__` 1.12.0 - borrows the source and renders the fog alone as a premultiplied tiled image (`:882-948`)
  - `RenderComposites__` 1.3.0 + config 1.4.0 - the "Depth Fog" composite, first in the list, on by default
  - `SheetRecords__` 1.23.0 - `Viewport__Styles.depthFog`
  - `ConfigState__SheetSetup__` 1.7.0 and `AppConfig__.json` `DefaultStyles.DepthFog`
  - `PdfExporter__` 1.6.0 - the fog image after the vectors, as 'PNG'
  - `Styles__Main__Paper__.css`
- **Bake clamp:** v2.103.0 added `min(rgb, a)` to TV's supersampler present pass (`TVM/05__RenderPipeline/Na__RenderEffect__Supersampler__.js:379`). The fog's own-layer images are premultiplied, and this keeps them valid in every browser.

**Status in TV.** `TrueVision__PLAN__ElevationDepthFog__.md:4` reads "Awaiting Adam's test. Not in ValeVision", with the ledger "Next: Adam's test. Then the ValeVision question" (`:211`). Floor plans and cross sections are not wired in TV either; `KEY_FLOORPLAN` exists but nothing uses it.

#### b.5.2 How it must land in VV (DIV-1 and DIV-2 adaptation)

- **One frame call site, not three.** VV renders a drawing through its composer: `VVM/42/Na__DrawView__ComposerPreset__.js` `RenderFrame` (`:405-420`) runs normals pre-pass -> `composer.render()` -> section overlay. VV's thumbnail renderer reaches the same `RenderFrame` through `Na__PmThumb__FrameRenderer` (`VVM/21/...Thumbnail__Renderer.js:183`). One `Na__ElevFog__RenderOverlay(Na__DrawPreset__Camera)` between `composer.render()` (or the plain render) and `drawOverlay(...)` therefore covers both the on-screen drawing and the card thumbnail.
  - The TV header itself predicts this: "ValeVision keeps its composer running for a drawing (DIV-1), so the two calls land in different places there; the layer itself carries over as it stands" (`RenderLayer__.js:69-73`).
  - Both apps use `logarithmicDepthBuffer: true` (VV `index.html:1658`, TV `Index.html:1098`), so the shader's linear-orthographic-depth assumption holds.
- **The export path needs a hook.** VV's tiled exporter renders a drawing through the composer with `elevationOverrides` from `ComposerPreset__GetExportOverrides` (`:447-472`). That object offers `camera`, `renderProfileNormals`, `resizeFrustum` and `restoreFrustum`, but no fog hook. An export of a fogged elevation, and the Layout Editor's `Render2d` (which uses the same exporter, `VVM/51/25/...SnapshotRenderer__.js:469-526`), would otherwise ship without fog.
  - *Corrected by verifier:* the tiled renderer DOES draw something after the composer: per tile, after `renderEffectChain()` or `supersampler.present()`, it calls the section overlay through the 05 registry (`Na__SectionClipping__GetOverlayRenderer`, `TiledRenderer.js:399, 566-568`). So the hook must draw the FOG ONLY, called per tile between the composer/present step and that existing `sectionOverlayRenderer(activeCamera)` call. A hook that also drew the section overlay would draw it twice.
  - For the sheet's own fog image, add a frame override that draws only `Na__ElevFog__RenderLayerFrame`.
  - The Layout Editor's base image must never carry fog (TV D6). TV enforces this by setting the fog source to null for a picture (`TV 51/25/Na__LayoutEditor__SnapshotRenderer__.js:882`, handed back at :948). VV's SnapshotRenderer must do the same around `Render2d`, or the new hook will bake fog into underlays whenever an elevation with fog is open.
  - VV-only wrinkle: VV composites the projected-linework vectors onto every image export of a drawing AFTER the raster (`30/Na__UiFeature__ImageExport__Controls.js:295, 330` -> `Na__PlExport__Apply`, which draws only when the overlay is painted; TV's image export has no such call). A per-tile fog therefore sits UNDER the vectors, and vectors behind the plane print unfogged. See decision D-S02b-V02.
- **On screen, neither app fogs the projected-linework SVG overlay.** The overlay is a DOM SVG above the WebGL canvas in both apps (`Na__PlOverlay__Paint` from both Pipelines). The fog layer fades only what is in the canvas: surfaces, fat SketchUp linework and VV's 2D profile lines. Vectors are fogged only on sheets, where the fog image sits above `div.linework`.
- **Section caps in VV.** VV's caps live in `Na__CrossSectionView__SystemLogic.js` `Na__Sect__OverlayScene`, holding `CapRoot` and `HelperRoot` (`VVM/41/...SystemLogic.js:454-470`). VV's `Na__Sect__RenderOverlay` (`:435-448`) is no substitute: it binds the screen and clears depth.
  - VV needs a depth-only equivalent of TV's `RenderDepthInto`. It must render `CapRoot` only (not the gizmos in `HelperRoot`) into the bound target with `autoClear` off and no clear.
  - Export it from 41 and reach it through VV's `42/Na__DrawView__SectionAdapter__.js` (the DIV-2 seam). Then point RenderLayer's one import at the adapter instead of `41__System__SectionCutEngine`.
  - *Verifier - preferred shape (from S02a WP-S02a-14):* TV also has a `40/Na__DrawView__SectionAdapter__.js`. Add `Na__DrawView__SectionAdapter__RenderDepthInto(camera)` to BOTH adapters (TV: a pass-through to `Na__SectionCut__RenderDepthInto`, a one-line TV change for Adam to approve; VV: over 41 CrossSectionView). RenderLayer then imports the adapter in both apps and differs only by folder number. Without the TV change, the VV-only repoint above is a permanent seam. Either way, VV and TV both use the 05 `Na__SectionClipping__*` registry pattern for the overlay renderer, so a `SetDepthRenderer`/`GetDepthRenderer` pair there is a third option that avoids any 49 -> 42 -> 41 import chain.
- **Elevation editor model.** TV's fog row is a draft edit under `40/Na__DrawView__DraftGuard__` and `DraftMaths__` (TV-only). VV's elevation Dev editor edits the live record and saves through "Save Elevations". The row is written for this ("it is handed read() and write(patch) and calls onChanged()", `DevMenu__Row__.js:36-39`). In VV, give it VV's accessors, ask for a render on change, and save with the existing elevations save. If DraftGuard is ported in another slice first, use TV's wiring as it stands.
- **Dependencies from other slices:**
  - `Na__DrawView__DevRowShell__.js` and its `.na-draw-dev__*` CSS (TV 40 -> VV 42)
  - VV `46/Na__Elevation__ProjectJson__Data__.js` (three getters plus Ensure), `46/...ModeController__.js` (SetSource/clear), `46/...DevMenu__RowBuilders__.js` and `...DevMenu__Editor__.js`
  - VV `05/Na__RenderEffect__Supersampler__.js` (the v2.103.0 clamp, missing in VV)

#### b.5.3 VV `29__System__FogPlaneSystem` - no overlap, no conflict

- **What it is.** VV's 3D-view fog: up to two face-picked world planes (A, B), a shared fall-off, a camera "forcefield" that stops the camera crossing a plane, Alt+Shift+F, and per-project `FogPlane__Config` saved through `R2SaveProjectJson`. It is a composer `ShaderPass` that reconstructs world position from the log depth buffer (`Na__FogPlaneSystem__FogShaderEffect.js`). It "replaces the old orbit-anchored radial fog", which is the fog TV's composer still has (TV fog plan section 3.2).
- **It cannot reach a drawing.** VV's `ComposerPreset` switches it off on entering a drawing and back on leaving (`ComposerPreset__.js:290, 301, 341`).
- **Different jobs, different namespaces.** `Na__FogPlane*` versus `Na__ElevFog*`, different config keys, different storage (top-level `FogPlane__Config` versus a nested `Elevation__DepthFog`), and no shared hotkey.
- **Do not try to reuse FogPlane for drawings.** Its composer pass is blind to the fat linework and is switched off for drawings. That is exactly why TV made the depth fog a separate layer.
- **Keep 29 as a VV-only 3D feature.** Its file names lack the trailing `__` (legacy). Optional tidy only, not parity.

### b.6 Lantern Designer items (the ledger's "rotation path in the soup builder" and "hidden segments through the worker pool")

- **TV has not touched these files.** TV SoupBuilder, WorkerPool and ClipWorker are code-identical to VV's (zero normalised diff). TV EdgeExtractor differs from VV only by v2.37.0's linework-first additions; `ToViewSpace` through the soup builder's view map (D40) is identical.
- **The Lantern Designer still lacks both.** `WebApps/Vale__LanternDesigner/02__Src__AppModules/27__System__ProjectedEdges2d/` has no `ViewMapFromBasis` or rotation path, and only its ClipKernel computes `HiddenSegments` (`VghLantern__ProjectedEdges__ClipKernel__.mjs:92,563`). Its WorkerPool and ClipWorker do not carry them.
- **The ledger files these in the wrong table.** They are VV -> Lantern Designer back-ports, not TV <-> VV parity items. The ledger lists them in "Pending back-port (ValeVision to TrueVision)" (`:1226-1227`), although TV already holds both. Move them to a Lantern Designer table. If they are ever ported to LD, take VV's post-v2.37.0 EdgeExtractor only if LD also wants linework-first.
  - *Verifier nuance:* the ledger's own progress note (`:39-42`) already says these two items "are ValeVision-to-ValeVision rather than back-ports". Only the two table rows contradict it, so this is a two-row tidy, not a misunderstanding.

### b.7 The three TV documents in scope

- **`TrueVision__PLAN__ElevationDepthFog__.md`** is the authoritative design: system map, decisions D1-D9, module map, tests. Use it as the brief for the depth fog work packages. Note D5 (a viewport shows its drawing's fog unless told not to), D6 (the base image is never fogged), D8 (glass fogged at the pane; textured cut-outs take the fog behind them) and D9 (no fog pixel is quite clear: 2/255 veil, paper-white colour plane).
- **`__StupidProof__Plan__Fix__ProfileLines__GPU__Drain__.md`** (May 2026) concerns the 3D profile lines in `05__RenderPipeline`, with VV as the reference implementation. TV now has VV's `isLine2/isLineSegments2` filter plus a defensive `Na__IsInsideLineworkGroup` (`TVM/05/Na__RenderEffect__ProfileLines__.js:88-106`). Nothing for VV to port, nothing in this slice's folders.
- **`TrueVision__NOTES__LayoutEditorPerformance__.md`** (v2.136.0) is Layout Editor work: SheetModel normalise-once, the Vector control (`Na__LayoutEditor__VectorQuality__`). Projected linework code is unchanged by it. It records that the projected segments are cached in memory (`Na__PlPipe__`) and IndexedDB (`Na__PlStore__RememberRender`), and that the vectors' cache must not learn about fog. Both points are already true in VV's code. Route the note to the Layout Editor slice.

### b.8 Cross-slice items found on the way

1. **Fat-line orthographic depth bias** (TV v2.38.1, MultiModel 1.3.0, `RenderConfig__Linework__OrthoDepthBiasMm: 2` in TV `02__AppData/Na__AppConfig__Main.json:90`).
   - VV still applies the fixed `0.00015` log-depth bias to every camera (`VVM/15__ModelLoader/Na__ModelLoader__MultiModel.js:683-692`). Through the drawing cameras' 10 mm to 500 m range that is about 75 mm.
   - So VV's drawing base images (on-screen plans and elevations, sheet underlays, exports) show SketchUp lines through faces at setbacks under about 75 mm (fascias, parapets). This is exactly what TV fixed on 14-Sep.
   - TV realign plan row X (`:871-874`): "ValeVision port: Pending... if ValeVision's loader carries the same fixed depth bias" - **it does**.
   - Owner: the 15 ModelLoader slice. Listed here because it is the base image under every projected linework drawing.
2. **Supersampler premultiplied clamp** (TV v2.103.0). VV `05/Na__RenderEffect__Supersampler__.js` has no `min(rgb, a)`. It is needed before fog layer images are baked in VV. Owner: the 05 slice. A prerequisite of the depth fog sheet work.
   - *Verifier:* no other slice report mentions either item 1 or item 2 (searched every `slices/*.md`), so WP-S02b-11 is their only owner and must be scheduled from this slice. VV's Supersampler is its own 1.1.0 (16-Sep), so the clamp is a hunk merge, not a file copy.
3. **`Na__AppUtils__SnapshotHistory__.js` (VV) versus `Na__AppUtils__SnapshotHistory.js` (TV).** Both History modules in this slice import it. Owner: the 03 slice. The house convention is a trailing `__`, so the cleaner alignment is for TV to rename (D-S02b-12).
   - *Verifier: conflicts with S09 WP-S09-10*, which renames VV's file to TV's name (dropping `__`) and updates VV's two History imports. Because the stated goal is to align VV to TV and only two importers exist in each app (verified), the VV-side rename in WP-S09-10 is the default; a TV rename to the `__` convention is an optional house-style tidy for Adam. Do not schedule both.
4. **Published Documents (52).** TV `52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js:163` builds its folder id "EXACTLY AS `Na__PlStore__FolderId` BUILDS IT", and its loading screen counts "fog masks" and "linework" as published layers (`Na__PubDoc__LoadingScreen__.js:33,105,221-245`). When 52 is ported to VV, its URL builder must mirror VV's `Na__AppUtils__NormalizeProjectFolderId`, not TV's FolderId. Fog masks become a published layer once the depth fog exists in VV.

### b.9 Ledger, PORT NOTE and devlog accuracy

- **Phase 2 rows** (`:982-985`) are still true for VV, but miss TV's Toolbar 1.1.0 and the fact that TV never wired the split.
- **Phase 4 rows** (`:1011-1039`) describe VV against the Lantern Designer, checked 09-Sep. They track none of the TV-to-VV deltas in b.3.2. Only the 13-Sep (owner tags) and 18-Sep (linetype, content stamp, ForgetCollections) return trips cover parts of folder 50.
- **"Dimension config and preview splits" is listed as closed** (`:34-37`). It is not wired in TV.
- **The two Lantern Designer rows are mis-filed** (b.6).
- **TV's v2.159.0 "Not done" note about VV FlushJoins is wrong** (b.3.2).
- **TV header devlog gaps:**
  - AuthoredEdges per-node modifiers, ConfigAccess `GetLineworkModifiers` and the LineworkModifier feature itself (no TV devlog version at all)
  - ClipWorker and WorkerPool owner tags ("never logged")
  - Pipeline `ForgetCollections` (neither app)
  - Shader and Supersampler v2.103.0
- **TV back-port markers are stale** (Appendix B).
- **Version numbers collide across apps** (a).

---

## (c) Module-by-module table

State key: **identical** = no code difference after normalisation; **identity** = only app name, folder numbers or console prefix differ; **drift** = TV code VV lacks; **tv-only** / **vv-only**; **structural** = same behaviour, different file split.

### c.1 Plan annotations

| TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `TVM/43__System__PlanAnnotations/Na__PlanAnnotations__AppConfig__.json` | - | `VVM/44__System__PlanAnnotations/...AppConfig__.json` | - | identity | Description names `project.json` in VV and `TrueVision__ProjectData__.json` in TV | no_action | keep VV wording | - |
| `.../Na__PlanAnnotations__Data__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `.../Na__PlanAnnotations__Editor__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `.../Na__PlanAnnotations__History__.js` | 1.1.0 | same | 1.1.0 | identity | SnapshotHistory file name (b.8-3) | no_action | follow the 03 decision | D-S02b-12 |
| `.../Na__PlanAnnotations__Hotkeys__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `.../Na__PlanAnnotations__Overlay__.js` | 1.1.0 | same | 1.1.0 | identical | - | no_action | - | - |
| `.../Na__PlanAnnotations__Styles__.css` | - | same | - | identical | - | no_action | - | - |
| `.../Na__PlanAnnotations__Toolbar__.js` | **1.1.0** | same | 1.0.0 | **drift** | Colour Palette attach on the dimension colour input (TV v2.126.0, 21-Sep) | port_adapted | keep VV's `GetTextSetup` import from `45/...ConfigState__.js`; add the 54 import and the one call | VV `54__Feature__ColourPalette` port |

### c.2 Plan dimensions

| TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `TVM/44__System__PlanDimensions/Na__PlanDimensions__AppConfig__.json` | - | `VVM/45__System__PlanDimensions/...` | - | identity | description wording | no_action | - | - |
| `.../Na__PlanDimensions__ConfigState__.js` | 1.0.0 | same | 1.0.0 | identical (**orphan in TV**: never loaded) | VV uses it; TV does not | keep_vv_divergence | - | TV rewire (WP-S02b-10) |
| `.../Na__PlanDimensions__EditorPreview__.js` | 1.0.0 | same | 1.0.0 | identical (**orphan in TV**) | VV Editor imports it; TV Editor does not | keep_vv_divergence | - | TV rewire |
| `.../Na__PlanDimensions__Data__.js` | 1.0.0 (989 lines) | same | 1.0.0 (662) | structural | TV keeps the config layer inline (+315 lines); same record logic | keep_vv_divergence. **Do not copy TV's file** | - | TV rewire |
| `.../Na__PlanDimensions__Editor__.js` | 1.0.0 (908) | same | 1.0.0 (843) | structural | TV keeps the preview inline (+88) | keep_vv_divergence. **Do not copy TV's file** | - | TV rewire |
| `.../Na__PlanDimensions__AxisLock__.js`, `ClientMode__`, `Crosshair__`, `Disclaimer__`, `History__`, `Hotkeys__`, `Overlay__`, `VertexEditor__` | 1.0.0 | same | 1.0.0 | identity (imports only) | VV imports getters from ConfigState; TV from Data | keep_vv_divergence | - | TV rewire |
| `.../Na__PlanDimensions__Grid__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `.../Na__PlanDimensions__Styles__.css` | 1.0.0 | same | 1.0.0 | identical | VV inner title line reads TRUEVISION3D (`:8`) | no_action (header tidy in WP-S02b-09) | - | - |

### c.3 Projected linework

| TV path (`TVM/50__System__ProjectedLinework/`) | TV ver | VV path (`VVM/50__System__ProjectedLinework/`) | VV ver | State | What VV lacks (TV devlog) | Action | VV adaptation (seams to re-apply) | Depends on |
|---|---|---|---|---|---|---|---|---|
| `Na__ProjectedLinework__AppConfig__.json` | - | same | - | drift | 3 Projection keys (v2.37.0); Storeys block (v2.105.0); LineworkModifiers block (20-Sep); BuildToken (v2.159.0); DiffLabel | port_adapted | OwnerKey prefix `ValeVision__LineworkModifier__...`; a new VV BuildToken; keep VV Appearance; VV `Na__AppConfig__Main.json` `ProjectedLinework__Config` exclusion override stays | D-S02b-07, D-S02b-09 |
| `Na__ProjectedLinework__AuthoredEdges__.js` | 1.2.0 | same | 1.1.0 | drift | Categories Set (v2.37.0); per-node modifier owners (20-Sep, unlogged) | port_whole_reapply_vv | header, console prefix | ConfigAccess, StageSampler |
| `Na__ProjectedLinework__ClipKernel__.js` | 1.2.0 | same | 1.1.0 | drift | SeamsOcclude (v2.37.0) | port_whole_reapply_vv | header only | - |
| `Na__ProjectedLinework__ClipWorker__.js` | 1.0.0 | same | 1.1.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__ConfigAccess__.js` | 1.2.0 | same | 1.0.1 | drift | 1.1.0 rules (v2.37.0); 1.2.0 `GetStoreySetup` (v2.105.0); `GetLineworkModifiers` (unlogged) | port_whole_reapply_vv | OwnerKey prefix in fallbacks; **fallback buildToken equal to the JSON** (TV's are not); fix the duplicate comment heading | - |
| `Na__ProjectedLinework__CpuBackend__.js` | 1.4.0 | same | 1.2.1 | drift | 1.3.0 rules (v2.37.0); 1.4.0 storey annotation (v2.105.0) | port_whole_reapply_vv | header | FlushJoins, Storeys |
| `Na__ProjectedLinework__DevMenu__Controls__.js` | 1.1.0 | same | 1.1.0* | drift | three timings rows and the Diff note (v2.37.0) | port_whole_reapply_vv | `42__System__DrawingViewCore` import path | - |
| `Na__ProjectedLinework__DiffHarness__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__DoorPose__.js` | 1.3.0 | - | - | **tv-only** | v2.42.0 / v2.48.1 / v2.105.0 / v2.140.0 | port_verbatim | header and console prefix only | **door module 1.9.0 + FindDoorGroups (b.4)**; Storeys; ConfigAccess 1.2.0 |
| `Na__ProjectedLinework__EdgeExtractor__.js` | 1.3.0 | same | 1.2.0 | drift | linework first (v2.37.0) | port_whole_reapply_vv | header | - |
| `Na__ProjectedLinework__ExportCompositor__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__FlatBvh__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__FlushJoins__.js` | 1.1.0 | - | - | **tv-only** | v2.37.0 + v2.159.0 tolerance | port_verbatim | header | - |
| `Na__ProjectedLinework__ModelStage__.js` | 1.2.0 | same | 1.1.0* | drift | edge rules in the fingerprint (TV 1.1.0, v2.37.0) | port_whole_reapply_vv | `42__System__DrawingViewCore` path | ConfigAccess 1.1.0 |
| `Na__ProjectedLinework__Owners__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__Persistence__.js` | 1.2.1 | same | 1.2.0 | drift / permanent | 1.2.1 FolderId (TV R2 layout); DevGate gate | ~~port_adapted (gate only)~~ **keep_vv_divergence (verifier)**: no code change | **keep `NormalizeProjectFolderId` (DIV-4)**; ~~adopt `Na__DevGate__IsAuthoringEnabled`~~ **keep `IsRunningOnLocalhost` (VV data-path rule, b.3.4)**; keep IndexedDB name; refresh PORT NOTE only | D-S02b-06R |
| `Na__ProjectedLinework__Pipeline__.js` | 1.5.0 | same | 1.1.0 | drift | 1.2.0 model root (v2.32.0); 1.3.0 (v2.37.0); 1.4.0 (v2.42.0); 1.5.0 (v2.105.0) | port_whole_reapply_vv | folder paths 42->43, 45->46, 40->42 | DoorPose, Storeys; D-S02b-08 |
| `Na__ProjectedLinework__Projector__.js` | 1.5.0 | same | 1.1.1 | drift | 1.2.0 (v2.37.0); 1.3.0 (v2.42.0); 1.4.0 (v2.48.1); 1.5.0 (v2.105.0) | port_whole_reapply_vv | header | DoorPose, Storeys, ConfigAccess 1.2.0 |
| `Na__ProjectedLinework__RasterPreview__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__Scheduler__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__SoupBuilder__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__StageSampler__.js` | 1.2.0 | same | 1.1.0* | drift | 1.1.0 posed mods (v2.42.0); 1.2.0 LineworkModifier (20-Sep) | port_whole_reapply_vv | comment examples use `ValeVision__...` | ConfigAccess |
| `Na__ProjectedLinework__Storeys__.js` | 1.0.0 | - | - | **tv-only** | v2.105.0 | port_verbatim | header | - |
| `Na__ProjectedLinework__Styles__Main__.css` | - | same | - | identical | - | no_action | - | - |
| `Na__ProjectedLinework__SvgOverlay__.js` | 1.0.0 | same | 1.0.0 | identical | - | no_action | - | - |
| `Na__ProjectedLinework__ViewDefinition__.js` | 1.2.0 | same | 1.0.0 | drift | 1.1.0 / 1.2.0 door poses (v2.42.0, v2.48.1); dual-spelling Flags (harmless) | port_whole_reapply_vv | folder paths 42->43, 45->46 | - |
| `Na__ProjectedLinework__WebGpuBackend__.js` | 1.0.0 | same | 1.0.0 | identity (comments) | - | port_verbatim (comment sync) or no_action | - | - |
| `Na__ProjectedLinework__WorkerPool__.js` | 1.0.0 | same | 1.1.0 | identical | - | no_action | - | - |

`*` = the same number denotes different content in the two apps (a).

### c.4 Elevation depth fog (VV target folder `VVM/49__System__ElevationDepthFog/`, D-S02b-04)

| TV path (`TVM/49__System__ElevationDepthFog/`) | TV ver | VV path | VV ver | State | What VV lacks | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `Na__ElevationDepthFog__AppConfig__.json` | - | `VVM/49__System__ElevationDepthFog/` same | - | tv-only | v2.94.0 | port_verbatim | Description: paper colour white for VV too. *Verifier: confirmed - VV `42/Na__DrawView__AppConfig__.json:8` `DrawingView__Render__BackgroundColour` is `#ffffff`, as TV's; no NA branding in any 49 file* | - |
| `Na__ElevationDepthFog__ConfigState__.js` | 1.0.0 | same | - | tv-only | v2.94.0 | port_verbatim | header | - |
| `Na__ElevationDepthFog__Maths__.js` | 1.0.0 | same | - | tv-only | v2.94.0 | port_verbatim | header | - |
| `Na__ElevationDepthFog__RecordData__.js` | 1.0.0 | same | - | tv-only | v2.94.0 | port_verbatim | header | - |
| `Na__ElevationDepthFog__Shader__.js` | 1.0.0 (+v2.103.0 unlogged) | same | - | tv-only | v2.94.0 + v2.103.0 | port_verbatim | log v2.103.0 in its header | - |
| `Na__ElevationDepthFog__RenderLayer__.js` | 1.0.0 | same | - | tv-only | v2.94.0 | port_adapted | `RenderDepthInto` from the VV section adapter (DIV-2); console prefix | VV 41/42 cap depth export |
| `Na__ElevationDepthFog__DevMenu__Row__.js` | 1.0.0 | same | - | tv-only | v2.94.0 | port_adapted | DevRowShell from VV 42 (port it) or VV-local caption/choice; VV accessors (no DraftGuard) | S02a DevRowShell + dev-row CSS |
| `Na__ElevationDepthFog__Styles__DevMenu__.css` | - | same | - | tv-only | v2.94.0 | port_verbatim | `@import` in VV `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` (a Dev-menu sheet, NOT the Layout Editor loader list) | `.na-draw-dev__*` rules |

### c.5 VV-only

| VV path | Ver | State | Action |
|---|---|---|---|
| `VVM/29__System__FogPlaneSystem/` (7 files, 1,990 lines) | 1.0.0-1.1.0 | vv-only 3D fog; off in drawings | keep_vv_divergence |

---

## (d) Wiring notes

### d.1 Import-graph changes in folder 50 after the port (VV)

```
CpuBackend   -> + FlushJoins (Na__PlFlush__CutFlushJoins)
             -> + Storeys (ForCut, MarkKeys, KeepEdges)
Projector    -> + DoorPose (Apply, PutBack, SwingEdges, Storeys)
             -> + ConfigAccess.GetStoreySetup
Pipeline     -> + DoorPose (AppendSwings, StoreyBand)
             -> + Storeys (Describe)
             -> + ViewDefinition.Hash
ModelStage   -> + ConfigAccess.GetProjectionSetup
StageSampler -> + ConfigAccess.GetLineworkModifiers
AuthoredEdges-> + ConfigAccess.GetLineworkModifiers, StageSampler.ModifierOwnerFor
DoorPose     -> three; 25/Na__DoorAnimation__FindDoorGroups.js;
                25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js (1.9.0 exports);
                StageSampler, SoupBuilder, EdgeExtractor, Owners, Storeys, ConfigAccess; 04/Na__Math__Units.js
Persistence  -> NO CHANGE (verifier): keeps ProjectLoader.NormalizeProjectFolderId AND IsRunningOnLocalhost (D-S02b-06R)
```

*Verifier:* every new folder-50 import above resolves in VV except the door module ones. `StageSampler.NameMatches`, `SoupBuilder.ViewMapFromBasis/TurnPoint`, `EdgeExtractor.ToDrawingSegments`, `Owners.Read/IdFor`, `ViewDefinition.Hash` and `04/Na__Math__Units.ConvertMmToUnits` are all exported by VV's current files (checked export blocks). `FindDoorGroups` relies only on `userData.Na__ModelType` and category-group names, which VV's loader sets the same way (`15/Na__ModelLoader__MultiModel.js:857, 865, 879`), so it ports verbatim.

Folder-number seams in folder 50 imports, TV -> VV:

- `40__System__DrawingViewCore` -> `42__System__DrawingViewCore` (DevMenu, ExportCompositor, ModelStage, Persistence, Pipeline, SvgOverlay)
- `42__System__FloorPlanViews` -> `43__System__FloorPlanViews` (Pipeline, ViewDefinition)
- `45__System__ElevationViews` -> `46__System__ElevationViews` (Pipeline, ViewDefinition)

### d.2 App-level wiring

- **`index.html`, projected linework:** no change. VV `index.html:2255-2266` already initialises ConfigAccess (`SetAppConfig`), the overlay, the pipeline and the Dev section, exactly as TV `Index.html:1705-1714` does. VV also calls `Na__DevGate__Initialize()` first.
- **`index.html`, depth fog:** add one import and `Na__ElevFog__Initialise({ renderer : Na__Renderer__Main, scene : Na__Scene__Main })` after the projected linework block, as in TV (`Index.html:919,1777-1784`). Not localhost-only.
- **CSS:** add `@import` of `49__System__ElevationDepthFog/Na__ElevationDepthFog__Styles__DevMenu__.css` to `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`, beside lines 89-91. It styles the Dev menu, not the Layout Editor, so it does not belong in the loader's `Na__LeLoad__STYLESHEETS`. *Verifier: mirror TV's cascade order - TV imports the fog sheet at `:130`, BEFORE the DrawView dev sheet at `:149`, whose `.na-draw-dev__caption/__choice` rules the fog sheet builds on; S02a moves VV's DrawView dev sheet last, so place the fog sheet before it.*
- **Render loop (DIV-1):** the single fog call goes in VV `42/Na__DrawView__ComposerPreset__.js` `RenderFrame`, after the composer and before the section overlay. Do not add it to `01/Na__AppFlow__LoadingSequence.js`. VV's loop delegates the drawing frame to the preset (`LoadingSequence.js:1320-1329`), and the thumbnail goes through the same preset. *Verifier: S09 WP-S09-08 says "add the fog overlay call to the drawing branch and the matching ComposerPreset/Thumbnail hooks". In VV that would draw the fog two or three times per frame, because the drawing branch and the thumbnail both run `ComposerPreset__RenderFrame` (`LoadingSequence.js:1323`, `21/...Thumbnail__Renderer.js:183`). This report's single-call rule wins.*
- **Export (DIV-1):** extend `ComposerPreset__GetExportOverrides` with a post-composer hook (~~fog, then section overlay~~ *verifier: fog ONLY - the tiled renderer already draws the section overlay per tile at `:566-568`*) and call it per tile in `30/Na__ImageExport__StaticExport__TiledRenderer.js`, after the composer/`supersampler.present()` and before the existing `sectionOverlayRenderer(activeCamera)`. The Layout Editor fog image needs a fog-only frame option on the same path. The Layout Editor underlay render must null the fog source (TV SnapshotRenderer `:882`), and VV's `Na__PlExport__Apply` vectors land above the fog (D-S02b-V02).
- **VV-only folder-50 integrations to PRESERVE (verifier, S02b-V01):** `30/Na__UiFeature__ImageExport__Controls.js:53, 295, 330` (`Na__PlExport__Apply`), `01/Na__AppFlow__LoadingSequence.js:435, 1327` (`Na__PlOverlay__SyncFrame` each drawing frame), `43/...DevMenu__Editor__.js:122, 577` and `46/...DevMenu__Editor__.js:111, 711` (`Na__PlStore__BakeBeforeSave`), and `26/Na__UiFeature__ModelToggle__Controls.js:178` (dispatches `na-model-visibility-changed`, which both Pipelines listen for). TV has none of the four, although its own realign plan s.9.3 lists all four as integration edits. Any swarm task that takes a TV version of one of these host files must keep these lines.
- **Section (DIV-2):**
  - New depth-only cap export in `41/Na__CrossSectionView__SystemLogic.js`: `CapRoot` only, bound target, `autoClear` off, no `clearDepth`, no `setRenderTarget(null)`.
  - Surfaced through `42/Na__DrawView__SectionAdapter__.js`.
  - RenderLayer imports it from the adapter.
- **Elevation records:** `46/Na__Elevation__ProjectJson__Data__.js` gains `GetDepthFog`, `SetDepthFog`, `GetDepthFogPlane` (built from VV's existing `GetAxes` and `GetPlaneDistanceMm`), plus `Na__ElevFogData__Ensure(record, KEY_ELEVATION)` in the normaliser and the creator. The source is set in `46/...ModeController__.js` while an elevation is on screen and cleared on leaving. The row goes in `46/...DevMenu__RowBuilders__.js` under View depth.
- **Door module:** `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` (merge to the TV 1.9.0 contract) plus `25/Na__DoorAnimation__FindDoorGroups.js` (new). Its README is updated too.

### d.3 Layout Editor consumers (owned by the Layout Editor slices; listed so the planner serialises them)

- **Plan doors / hide swings:**
  - `51/20/Na__LayoutEditor__PlanDoors__.js` (new; imports `Na__FpData__GetStoreyLevel` from 42/43, `Na__PlDoors__HitTest`, `Na__PlProjector__SCALE_DIVISOR`, `Na__LeVpRot__Contains`)
  - `51/20/Na__LayoutEditor__Viewport2d__Window__.js` `Describe`: the fourth argument `Na__LeDoors__PoseFor` / `ShutPoseFor`, and `SwingExcludeTokens` (TV `:156-165`; VV `:111-114` passes three)
  - `51/25/SnapshotRenderer__` - DoorPose Apply/Restore around Render2d, and the cut
  - SheetTools units (door click, menu rows, cursor), `40/Panel__ViewportSettings__` (Doors row, Open all, Hide swings)
  - `07/SheetRecords__` (`Viewport__ClosedDoors`, `Viewport__HideSwings`), SheetModel Viewports (`closedDoors`, `hideSwings` patch keys)
  - `03/ConfigState__SheetSetup__` (`GetPlanDoorsSetup`: `OpenOnPlans`, `ShutOnElevations`, `DrawSwings`, `HideSwingsOnStoreys`, `SwingCategoryKeys`)
  - `03/AppConfig__.json` (PlanDoors block; labels; `SwingCategoryKeys` must be `ValeVision__Linetype__DoorSwings`)
  - `Styles__Panels__.css`
  - Prerequisites: VV `43__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js` (TV v2.87.0, S02a) for the roof-plan default; `Na__LayoutEditor__ViewportRotation__` (TV v2.138.0) for `At`; the 1:200 scale (v2.140.0) only if the HideSwings test is ported whole.
- **Linework modifiers:**
  - `51/25/Na__LayoutEditor__ModelLayers__Config__.json` - the LineworkModifiers group, `Layer__CategoryKey` `ValeVision__LineworkModifier__FineDetail/VeryFineDetail`, `Group__AlwaysShow`
  - `51/20/Na__LayoutEditor__Viewport2d__Frame__.js` (imports `Na__PlCfg__GetLineworkModifiers`, widths)
  - `51/20/Na__LayoutEditor__Viewport2d__Linework__.js` (modifier owner keys are never top-level categories)
- **Depth fog sheet side:** `Viewport2d__DepthFog__` (new), `Viewport2d__Frame__` (sixth layer), `Viewport2d__` (fog key, ForceRender, export twin), `SnapshotRenderer__` (fog image), `RenderComposites__` plus config (the `depthFog` composite, lowest Order), `SheetRecords__` (`Viewport__Styles.depthFog`), `ConfigState__SheetSetup__` and `AppConfig__.json` (`DefaultStyles.DepthFog`), `PdfExporter__`, `Styles__Main__Paper__.css`.

### d.4 Order of work (dependency chain)

```
WP-S02b-01 door module (25) ---> WP-S02b-02 folder 50 port ---> WP-S02b-06 LE plan doors / hide swings
                                         |                  \--> WP-S02b-07 LE linework modifiers
                                         \--> WP-S02b-08 tests (FlushJoins, StoreyBand)
S02a DevRowShell + 46 elevation core ---> WP-S02b-04 depth fog core + 3D wiring ---> WP-S02b-05 depth fog sheet side
05 Supersampler clamp (WP-S02b-11) ------------------------------------------------^
54 ColourPalette (other slice) ---> WP-S02b-03 annotation toolbar
WP-S02b-09 ledger/headers: after each of the above.  WP-S02b-10: TV side, independent.
```

*Verifier additions to the order:*
- **Gate 0 - folder numbers.** If Adam takes S02a's D-S02a-01 option B (renumber VV 42..47 to TV's 40..46), WP-S02a-01 must land BEFORE any S02b package. All the folder-number seams in this report (40->42, 42->43, 43->44, 44->45, 45->46) then disappear, VV 44/45 become 43/44, and F01's "keep" recommendation no longer applies. If option A is kept, the seams stand as written. Either way, decide before the swarm starts. Running both at once would conflict on every file in this slice.
- **Dedupe before dispatch.** WP-S02b-01 overlaps the door part of WP-S09-07; WP-S02b-03 = the 44 Toolbar hunk of WP-S06b-08; WP-S02b-04 overlaps WP-S02a-14, WP-S09-08 and WP-S09-12; WP-S02b-05 = WP-S04a-07; WP-S02b-06 = WP-S04a-06 (which also lists the folder-50 DoorPose/Storeys files); WP-S02b-07 is a subset of WP-S04a-08. Give each file set one owner.

---

## (e) UI notes

- **Projected Linework Dev section (localhost).** TV's timings table has three more rows: "Linework first" (`off - every mesh crease` or `on, N categories`), "Seams occlude" and "Flush joins" (`hidden`/`drawn`). The Diff note adds "Both sides ran without the 3D-matching rules". The button reads "Run Diff" (VV: "Run Diff (cpu vs legacy)"). No CSS change.
- **Drawings themselves.** After the port, VV elevations lose flush-join lines (wall bands, pier sill lines, fascia undersides, old/new wall joins) on screen, in sheet linework, in the PDF and in exports. In the Layout Editor, VV plans draw doors open with swing arcs and elevations draw doors shut. That is a visible change on existing Vale sheets, so warn Adam before the first publish after the port.
- **Elevations Dev row.** A "Fog" block under View depth: Off/On, then Depth / End / Fall-off as three columns with labels above, and a sentence underneath ("fog from 1000 to 15000 mm behind the plane - 50% by half way").
- **Plan annotation toolbar (3D drawing view).** The dimension colour swatch opens the Colour Palette (standard colours) above the browser's colour menu.
- **Layout Editor (other slices):** the Viewport panel's "Doors - Open all - [ ] Hide swings" row and note; context menu rows Close door / Open door / Open all doors; pointer cursor over a door on a plan; Render Composites "Depth Fog" first in the list; Model Layers "Linework modifiers" group.
- **Not in this slice:** the contextual top-bar fold animation Adam named (TV v2.83.0) was already ported to VV v2.70.0 (ledger `:1235-1246`). Nothing in folders 43, 44, 49 or 50 touches the top bar.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S02b-01 | Port the projected-linework 3D-matching rules (TV v2.37.0, signed off by Adam in TV on 14-Sep) and the flush tolerance (v2.159.0) to VV now? | a) now; b) wait | **a)**. VV draws the same false lines today. Folder 50 only, no TV-only dependency. Note: the TV devlog wrongly believes VV has FlushJoins 1.0.0 |
| D-S02b-02 | Port door pose, storeys and hide swings (TV rows AA and AH, v2.105.0, v2.140.0) to VV? Adam has not recorded a test of AA or AH in TV | a) all now (folder 50 + door module now, Layout Editor plan doors in the LE wave); b) folder 50 only with no LE caller (no visible change except the storey annotation band); c) defer | **a)**. If deferred, b) is still needed to keep folder 50 file-for-file, because Projector/Pipeline 1.5.0 import DoorPose regardless |
| D-S02b-03 | Port the Elevation Depth Fog to VV? TV plan: "Awaiting Adam's test... then the ValeVision question" | a) port with the DIV-1/DIV-2 adaptations; b) wait for Adam's TV test | **a)** after S02a lands DevRowShell and the 46 elevation core. Pure modules port verbatim; three seams adapt |
| D-S02b-04 | VV folder for the depth fog | a) `49__System__ElevationDepthFog` (same as TV); b) a shifted number | **a)**. The n+1 shift (VV 42-47 = TV 40-46) cannot continue past 47 (VV 50 is taken). Same-number matches the 50/51 precedent (realign plan `:320`) and lets `Na__Test__ElevationDepthFog__` port with no path edit. TV 47 DrawingPlanes and 48 CrossSectionViews need the same rule from their slices |
| D-S02b-05 | Plan dimensions split: which side moves? | a) keep VV's split, rewire TV; b) un-split VV to mirror TV | **a)**. TV's plan says keep splits (`:295-297`); TV Data/Editor are over budget; TV's ConfigState is a never-loaded orphan feeding MarkupBridge. TV-side change for Adam to approve |
| D-S02b-06 | VV linework bake gate | a) `Na__DevGate__IsAuthoringEnabled()` (TV TD01); b) keep `IsRunningOnLocalhost()` | ~~**a)**~~ **Verifier (D-S02b-06R): b).** VV's DevGate header and PORT NOTE keep data-path writes on the hostname test, because VV writes need Flask (`/api/editor-config`, then the mirror). VV's LE asset gate `Na__LeAssets__CanUpload` follows the same rule. A DevGate gate would make an unlocked non-localhost session render every drawing and then fail the upload. Record it as a permanent seam |
| D-S02b-07 | LineworkModifier owner keys in VV | a) `ValeVision__LineworkModifier__FineDetail/VeryFineDetail` with LE ModelLayers rows; b) skip the feature | **a)**. Harmless if a VV model carries no 76-79 tags (it falls back to the parent category). Confirm the VV SketchUp export (Linework GLB 1.6.0, SSOT 76-79) is the same pipeline |
| D-S02b-08 | Take TV's design-phase seams (Pipeline 1.2.0 optional model root/fingerprint) into VV although VV has no Model Source | a) take verbatim; b) strip | **a)**. No caller passes them, so no behaviour change, and the file becomes identical. b) leaves a permanent hunk to re-apply on every future port |
| D-S02b-09 | BuildToken and re-bake after the port | a) new VV token + a localhost "Bake All to R2" per live VV project before the next publish; b) TV's token value | **a)**. Use a VV-specific token value (for example `2026-10-xx-tv-parity`), keep ConfigAccess fallbacks equal to the JSON, and schedule the re-bake; otherwise public viewers compute linework on their devices |
| D-S02b-10 | Version numbers in VV after whole-file ports | a) adopt TV's version and DEVELOPMENT LOG verbatim, with a VV PORT NOTE listing seams; b) keep VV's own numbering | **a)**. Ends the cross-app collisions in (a) and makes future diffs mechanical |
| D-S02b-11 | Take TV door module 1.8.0 (left-button-only clicks; `FindAdrAncestor`, `ResolveHitPanel`, `IsDoorOpen` exports) with 1.9.0? | a) yes; b) 1.9.0 only | **a)**. Right-drag is VV's orbit pan, so a right-click toggling a door is a bug in VV too. The 1.8.0 exports are what TV's context menu (27) needs if it is ported |
| D-S02b-12 | SnapshotHistory file name (`__` suffix in VV, none in TV) | a) TV renames to the `__` convention; b) VV drops `__` | ~~**a)**, owned by the 03 slice.~~ *Verifier: conflicts with S09 WP-S09-10, which does b). Given the stated goal (VV aligns to TV) and only two importers per app, b) via WP-S09-10 is the default; a) is optional for Adam. Schedule exactly one.* It touches two History imports in each app's annotations/dimensions folders |
| D-S02b-V02 (verifier) | VV image exports composite projected-linework vectors AFTER the raster (`Na__PlExport__Apply`, VV-only). A per-tile fog therefore sits under the vectors, so lines behind the plane print unfogged | a) accept: raster fogged, vectors crisp; b) composite a fog-only layer (`RenderLayerFrame` through the tiled path) AFTER `Na__PlExport__Apply`, matching TV's sheet rule (fog above vectors); c) leave fog out of image exports | **b)** if Adam wants exports to match sheets; otherwise a). TV has no reference: its image export carries no projected vectors |
| D-S02b-V03 (verifier) | Folder numbering: S02a D-S02a-01 (renumber VV to TV's numbers) vs this slice's F01 (keep VV 44/45) | a) renumber first (WP-S02a-01), then run S02b with no folder seams; b) keep the fixed map and the seams | Decide before dispatch. **a)** best matches "align exactly", at the cost of one large mechanical WP; S02b's D-S02b-04 (fog in 49) holds under both |

---

## (g) Work packages

### WP-S02b-01 - Door module to the TrueVision 1.9.0 contract (VV 25) - size M

- **Scope:**
  - Merge TV `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` 1.8.0 + 1.9.0 onto VV 1.7.1: exported MOD type constants, `ComputePanelLocalPose`, exported `ApplyPanelTransform`, `GetLiveProgress`, `DescribeDoors`, `ScanGroupsInto`, `FindAdrAncestor`, `ResolveHitPanel`, `IsDoorOpen`, left-button-only clicks.
  - Keep VV's `SnapAllClosed`, `GetSpeedScale`, `SetSpeedScale`, `GetBaseDurationMs` and VV bootstrap/thresholds.
  - Port `25/Na__DoorAnimation__FindDoorGroups.js` (new, header rename). Update the README.
- **Files VV:** `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`, `.../Na__DoorAnimation__FindDoorGroups.js` (new), `.../3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md`
- **Hot files:** `ValeVision__DEVLOG__.md`, `ValeVision__PARITY__TrueVisionLedger__.md`
- **Depends on:** D-S02b-02, D-S02b-11. Coordinate if a 25/27 context-menu slice also edits this file.
- **Acceptance:**
  - Export set = TV's set ∪ VV's four Video Studio exports.
  - Orbit click opens/closes doors as before; Video Studio "start with doors shut" still works; walk-mode proximity unchanged.
  - `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` pass.
  - `DescribeDoors` on a VV project returns the registry's own records (as TV v2.42.0 verified).

### WP-S02b-02 - Projected linework folder 50 to TV HEAD (rules, flush tolerance, modifiers, door pose, storeys) - size L

> **Verifier: superseded by WP-S02b-02R.** Persistence is NOT edited (both TV deltas are VV seams, and TV's file does not link in VV). The JSON can be taken whole. The package is gated on the folder-number decision. Acceptance adds the scratch link simulation, the StoreyBand 53/53 run including the token check, and a check that the VV-only integrations (S02b-V01) are still in place.

- **Scope:**
  - Take TV's whole files for AuthoredEdges, ClipKernel, ConfigAccess, CpuBackend, DevMenu__Controls, EdgeExtractor, ModelStage, Pipeline, Projector, StageSampler, ViewDefinition (and WebGpuBackend comments).
  - New: FlushJoins, Storeys, DoorPose.
  - ~~Persistence: gate only.~~ **Persistence: no code change (verifier, D-S02b-06R)** - both TV deltas are VV seams; refresh its PORT NOTE only.
  - AppConfig JSON merge. *(Verifier: the two JSONs differ only in the keys listed in b.3.3; the Appearance block is already identical, so take TV's JSON whole and re-apply only the OwnerKey prefix and a VV BuildToken. TV's `LineworkModifiers__Description` contradicts itself - "matched as a prefix" and then "Exact match against the tag name, not a substring" - and the code does a prefix match, so drop the second sentence when porting.)*
  - *Verifier gate:* runs after WP-S02b-01 AND after the folder-number decision (D-S02b-V03 / D-S02a-01). If VV is renumbered first, drop every folder-path seam below.
- **Re-apply VV seams:**
  - header titles VALEVISION3D and console prefix
  - folder numbers 40->42, 42->43, 45->46
  - Persistence keeps `NormalizeProjectFolderId`
  - OwnerKey prefix `ValeVision__`
  - new VV BuildToken in the JSON and the fallbacks
  - VV `Na__AppConfig__Main.json` exclusion override untouched
- **Files VV:** `50__System__ProjectedLinework/*` (14 files changed or new + JSON)
- **Hot files:** `ValeVision__DEVLOG__.md`, ledger. (`index.html` is NOT touched - the init is unchanged.)
- **Depends on:** WP-S02b-01; D-S02b-01/02/07/08/09/10
- **Tests:** port `Na__Test__FlushJoins__.test.mjs` and `Na__Test__StoreyBand__.test.mjs` (WP-S02b-08)
- **Acceptance:**
  - The normalised diff of folder 50 against TV is empty except the listed seams.
  - Both verifiers pass; the FlushJoins and StoreyBand tests pass against VV's files (including the fallback-equals-JSON checks).
  - In the app on a VV project with projected linework (for example Doous), with writes refused:
    - the Dev timings read "Linework first: off - every mesh crease / Seams occlude: on / Flush joins: hidden"
    - an elevation projected with rules on versus off (Run Diff, or two forced renders) loses only flush-join and seam-leak segments, with the ground line whole
    - definitions outside the Layout Editor carry `DoorPose null` and hash as before
    - a plan on a model with two or more `Storey__` groups and linetype swings keeps only its storey's swing/clearance annotation
  - A re-bake of one project's drawings succeeds (asset schema 2, owner tags present).

### WP-S02b-03 - Plan annotation toolbar: Colour Palette attach - size S

> **Verifier: DUPLICATE - merge into WP-S06b-08 (Colour Palette).** That package already lists `VVM/44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js` as a hot file and gives the exact hunk (S06b item 9, at VV `:255`). Keep this text as the acceptance note only.

- **Scope:** `44/Na__PlanAnnotations__Toolbar__.js` -> TV 1.1.0. Add the `54__Feature__ColourPalette/Na__ColourPalette__.js` import and `Na__ColourPalette__Attach(input)` on the dimension colour input. Keep VV's `GetTextSetup` from `45/...ConfigState__.js`.
- **Hot files:** devlog, ledger
- **Depends on:** the VV `54__Feature__ColourPalette` port (other slice)
- **Acceptance:** module graph and exports pass; in the plan view the swatch opens the palette and a pick recolours the selected dimension; `Na__Test__ColourPalette__.test.mjs` (if ported) passes with no unattached colour input reported in folder 44.

### WP-S02b-04 - Elevation Depth Fog core and 3D wiring - size L

> **Verifier: superseded by WP-S02b-04R (see Verification).** Corrections: (1) the export hook draws the fog ONLY; the tiled renderer already draws the section overlay per tile; (2) the acceptance line "projected vectors behind the plane fade" holds only on sheets - on screen the projected linework is a DOM SVG above the canvas in both apps and is not fogged; (3) image exports composite VV-only `Na__PlExport__Apply` vectors above the fog (D-S02b-V02); (4) the scope overlaps WP-S02a-14 (46 hooks, ComposerPreset call, DIV-2 seam) and WP-S09-08/12 (render-loop and index wiring). WP-S09-08's LoadingSequence fog call must NOT be done in VV; (5) the DIV-2 seam preferably goes through `Na__DrawView__SectionAdapter__RenderDepthInto` in both apps.

- **Scope:**
  - New `VVM/49__System__ElevationDepthFog/` (8 files; 5 verbatim, RenderLayer and DevMenu Row adapted, CSS verbatim).
  - 41 depth-only cap render export and a 42 SectionAdapter pass-through.
  - 42 ComposerPreset `RenderFrame` fog call, plus the post-composer hook in `GetExportOverrides`.
  - 30 TiledRenderer calls that hook per tile.
  - 46 ProjectJson Data `GetDepthFog` / `SetDepthFog` / `GetDepthFogPlane` and Ensure in the normaliser and creator; 46 ModeController SetSource/clear; 46 RowBuilders Fog block under View depth; 46 DevMenu Editor wording if VV words changes.
  - `index.html` import and `Initialise`; CSS index `@import`.
- **Hot files:** `index.html`, `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`, `41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js`, `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js`, `42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`, `46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js`, `46__System__ElevationViews/Na__Elevation__ModeController__.js`, `46__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js`, `46__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js`, `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`, devlog, ledger
- **Depends on:** D-S02b-03/04; S02a's DevRowShell (`42/Na__DrawView__DevRowShell__.js` + `.na-draw-dev__*` CSS); WP-S02b-11 for baked layers
- **Tests:** `Na__Test__ElevationDepthFog__.test.mjs` (68 checks, verbatim)
- **Acceptance:**
  - The test passes against `VVM/49/...Maths__.js`; both verifiers pass.
  - On a VV elevation, with writes refused:
    - every elevation record gains `Elevation__DepthFog` (off) on first read
    - switching it on fogs surfaces AND fat linework AND projected vectors behind the plane, while a section's poche stays solid
    - the card thumbnail shows the fog
    - an image export of a fogged elevation carries it
    - a perspective camera gets none
    - VV FogPlane is still disabled in drawings and works in 3D
  - A drawing with fog off renders byte-identical to before (the fog costs one null check).

### WP-S02b-05 - Depth fog on sheets (Layout Editor side) - size M (coordinate with the LE slice)

> **Verifier: DUPLICATE of WP-S04a-07 (Depth fog on sheets)**, which covers the same LE files plus the VV TiledRenderer callback route (D-S04a-05). Merge into WP-S04a-07 and keep this text as dependency and acceptance notes. Add to that package: null the fog source around the underlay `Render2d` (TV SnapshotRenderer `:882`, D6).

- **Scope:**
  - New `51/20/Na__LayoutEditor__Viewport2d__DepthFog__.js` (import paths `45->46` for elevation data).
  - `Viewport2d__Frame__` (sixth layer), `Viewport2d__` (key, ForceRender, export twin).
  - `SnapshotRenderer__` fog image through VV's tiled path (fog-only frame).
  - `RenderComposites__` + config (`depthFog`, lowest Order, on by default); `SheetRecords__` `Viewport__Styles` closed list + `depthFog`; `ConfigState__SheetSetup__` + `AppConfig__.json` `DefaultStyles.DepthFog`.
  - `PdfExporter__` (fog PNG after the vectors, before the markup); `Styles__Main__Paper__.css` rule (VV loads it through the loader list).
- **Hot files:** `51/20/Na__LayoutEditor__Viewport2d__Frame__.js`, `51/20/Na__LayoutEditor__Viewport2d__.js`, `51/25/Na__LayoutEditor__SnapshotRenderer__.js`, `51/25/Na__LayoutEditor__RenderComposites__.js` + `__Config__.json`, `51/07/Na__LayoutEditor__SheetRecords__.js`, `51/03/Na__LayoutEditor__ConfigState__SheetSetup__.js`, `51/03/Na__LayoutEditor__AppConfig__.json`, `51/60/Na__LayoutEditor__PdfExporter__.js`, `51/10/Na__LayoutEditor__Styles__Main__Paper__.css`, `51/01__Core__Loader/Na__LayoutEditor__Loader__.js` (STYLESHEETS only if a new sheet is added)
- **Depends on:** WP-S02b-04, WP-S02b-11, the LE baseline for these files
- **Acceptance:**
  - A fogged elevation on a sheet shows the frame stack `underlay, linework, fog, markup`.
  - Unticking Depth Fog on one viewport shows it bare there and fogged on another sheet.
  - The base image is never fogged; the underlay and vector keys do not change when fog changes.
  - The PDF holds the fog image with a soft mask (check with PyMuPDF as TV did).
  - Fog image pixels have colour = alpha and minimum alpha 2/255.

### WP-S02b-06 - Plan doors and hide swings in the Layout Editor - size L (LE slice owner)

> **Verifier: DUPLICATE of WP-S04a-06 (Plan doors and Hide swings).** Merge into it. Note that WP-S04a-06 ALSO lists the folder-50 DoorPose/Storeys/Projector/Pipeline/ViewDefinition/StageSampler files and the door module, which belong to WP-S02b-02 and WP-S02b-01 here. The planner must strip them from WP-S04a-06 or the same files get two owners.

- **Scope:**
  - New `51/20/Na__LayoutEditor__PlanDoors__.js` (1.3.0).
  - `Viewport2d__Window__` Describe passes the pose and the swing tokens; SnapshotRenderer Apply/Restore with the cut; SheetTools click/menu/cursor.
  - `Panel__ViewportSettings__` Doors row + Hide swings; SheetRecords/SheetModel keys; ConfigState SheetSetup `GetPlanDoorsSetup`.
  - AppConfig PlanDoors block (`SwingCategoryKeys` `ValeVision__Linetype__DoorSwings`) and labels; `Styles__Panels__.css`.
- **Hot files:** `51/20/Na__LayoutEditor__Viewport2d__Window__.js`, `51/25/Na__LayoutEditor__SnapshotRenderer__.js`, `51/30/Na__LayoutEditor__SheetTools__*.js` (HitResolution, PointerPress, ContextMenu units), `51/40/Na__LayoutEditor__Panel__ViewportSettings__.js`, `51/40/Na__LayoutEditor__Styles__Panels__.css`, `51/07/Na__LayoutEditor__SheetRecords__.js`, `51/07/Na__LayoutEditor__SheetModel__Viewports__.js`, `51/03/Na__LayoutEditor__ConfigState__SheetSetup__.js`, `51/03/Na__LayoutEditor__AppConfig__.json`
- **Depends on:** WP-S02b-02; S02a `43/Na__FloorPlan__StoreyLevel__.js`; LE `Na__LayoutEditor__ViewportRotation__` (v2.138.0)
- **Tests:** `Na__Test__HideSwings__.test.mjs` (adapted: `42__System__FloorPlanViews` -> `43__System__FloorPlanViews`; scale assertions need 1:200 (v2.140.0) - drop or port the scale)
- **Acceptance:** as TV v2.42.0 / v2.48.1 / v2.140.0 verification - plans draw doors open with arcs; elevations shut; a click toggles one door as one undo step; a locked viewport still toggles; a roof plan hides swings by default; the 3D view's doors never move; both verifiers pass.

### WP-S02b-07 - Linework modifier styling in the Layout Editor - size S (LE slice owner)

> **Verifier: SUBSET of WP-S04a-08 (Linework modifiers and model-layer hygiene)**, which also carries the raster side (SnapshotRenderer modifier rules, commit 6076ec10). Merge into it. On the open question in D-S02b-07, the pipeline is confirmed: VV's GLBs are exported by the same `Na__TrueVision__GlbBuilderUtility` (ValeVision Cloud Sync calls it through `04__Plugin__SyncFeatures/03__GlbExportBridge/Na__ValeVisionCloudSync__GlbExportBridge__.rb:57`), and that builder writes nested LineworkModifier nodes (`Na__TrueVision__GlbBuilder__EngineCore__LineworkModelHandling__.rb:15, 76`). Whether Vale's SketchUp models actually carry tags 76-79 is still unverified.

- **Scope:** ModelLayers config LineworkModifiers group (`ValeVision__LineworkModifier__FineDetail/VeryFineDetail`, SketchUp tags 76-79, `Group__AlwaysShow`); `Viewport2d__Frame__` widths per modifier; `Viewport2d__Linework__` modifier keys never a top-level category.
- **Hot files:** `51/25/Na__LayoutEditor__ModelLayers__Config__.json`, `51/20/Na__LayoutEditor__Viewport2d__Frame__.js`, `51/20/Na__LayoutEditor__Viewport2d__Linework__.js`
- **Depends on:** WP-S02b-02, D-S02b-07
- **Acceptance:** a VV model with a 76-79 nested tag draws that detail at its own weight; one without draws exactly as before.

### WP-S02b-08 - Port the slice tests - size S

- **Scope:**
  - Verbatim, with a header rename (no path edits needed when the folder numbers are 50 and 49): `Na__Test__FlushJoins__.test.mjs`, `Na__Test__StoreyBand__.test.mjs`, `Na__Test__ElevationDepthFog__.test.mjs`.
  - Adapted, after WP-06: `Na__Test__HideSwings__.test.mjs`. *Verifier: more than paths. Besides `42__System__FloorPlanViews` -> 43 (`:119`, `:239`), the expectations that read the shipped config name `TrueVision__Linetype__DoorSwings` (`:144`, `:147`, `:282`, `:284`) must become `ValeVision__Linetype__DoorSwings`, and the 1:200 checks (`:139`) need the 1:200 port or removal.*
  - *Verifier - identity in fixtures:* the StoreyBand and FlushJoins tests name an NA client project in comments, labels and a variable (`RB05 West Farm`, `RB05`, StoreyBand `:17`, `:60`, `:65`, `:91`, `:100`; FlushJoins `:30`, `:137`), and the DepthFog test names "RB05's South West Elevation" (`:16`, `:162`). No VV test names an NA project today. Keep the numbers and rename the labels (for example "three-storey fixture") when copying into the Vale repo - a header-only rename is not enough.
  - *Verifier - TV baseline:* run read-only on 01-Oct-2026 with TEMP pointed at the scratchpad. FlushJoins passes 8/8, ElevationDepthFog 68/68 and HideSwings all checks. **StoreyBand FAILS 1 of 53** ("the fallback build token equals the shipped one" -> `2026-09-21-storey-swings`), because TV v2.159.0 bumped the JSON token and not the ConfigAccess fallback (S02b-F33). A verbatim copy of TV's ConfigAccess into VV fails the same check until the fallback is set equal to VV's JSON token.
  - Route to the LE dimension slice (it tests `51/15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js`, not plan dimensions): `Na__Test__DimensionRoundUp__.test.mjs`.
  - Route to S02a: `Na__Test__FloorPlanStoreyLevel__.test.mjs`.
- **Files VV:** `80__Testing__PrototypeEnvironment/` (new tests)
- **Depends on:** WP-02, WP-04, WP-06
- **Acceptance:** each ported test exits 0 with `node`; none edits app files.

### WP-S02b-09 - Ledger, PORT NOTEs, headers and devlog - size S

- **Scope:**
  - Ledger: a new return-trip section per landed WP; Phase 2/4 notes; the dimension split recorded as "VV split; TV copied but not wired"; the Lantern Designer rows moved out of the VV->TV table.
  - PORT NOTE blocks in every ported file (TV version, seams).
  - VV `45/Na__PlanDimensions__Styles__.css:8` title.
  - A VV devlog entry per release (`## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title`).
- **Hot files:** `ValeVision__PARITY__TrueVisionLedger__.md`, `ValeVision__DEVLOG__.md`
- **Depends on:** each WP it records
- **Acceptance:** every ledger row in scope matches the code; no PORT NOTE claims "verbatim" where a seam exists.

### WP-S02b-10 - TV-side back-ports (only on Adam's approval) - size S

> **Verifier: superseded by WP-S02b-10R** (complete TV file list; it also fixes TV's red StoreyBand check; one TV session with WP-S09-14).

- **Scope (TV files):**
  - Rewire TV `44__System__PlanDimensions`: all consumers import `Na__PlanDimensions__ConfigState__.js`; the mode controllers call ConfigState's `Load`; Editor uses `EditorPreview__`; Data and Editor drop the duplicated regions (back under 900 lines).
  - TV ConfigAccess fallback `buildToken` equal to the JSON; fix the duplicate comment heading.
  - Correct TV devlog v2.159.0's VV note.
  - Refresh the stale back-port markers (Appendix B).
- **Hot files (TV):** `42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js`, `45__System__ElevationViews/Na__Elevation__ModeController__.js`, `43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js`, `TrueVision__DEVLOG__.md`
- *Verifier - incomplete; see WP-S02b-10R.* The rewire also touches `40/Na__DrawView__MarkupMount__.js:103`, `42/Na__FloorPlan__DevMenu__Editor__.js:220`, every 44 consumer (AxisLock, ClientMode, Crosshair, Disclaimer, Editor, EditorPreview, History, Hotkeys, Overlay, VertexEditor, Data) and `51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js:258-259`. Overlaps WP-S09-14 (TV back-ports); hand both to one TV session.
- **Depends on:** D-S02b-05
- **Acceptance:** TV and VV `PlanDimensions` folders have zero normalised code diff; TV's MarkupBridge reads loaded config (FontFamily from the JSON); TV verifiers pass.

### WP-S02b-11 - Cross-slice prerequisites for drawing quality - size S (owners: 05 and 15 slices)

- **Scope:**
  - VV `15__ModelLoader/Na__ModelLoader__MultiModel.js`: orthographic cameras take `RenderConfig__Linework__OrthoDepthBiasMm` (2 mm) through `abs(projectionMatrix[2][2]) / 2`, perspective unchanged (TV v2.38.1 / MultiModel 1.3.0), plus the key in VV `02__AppData/Na__AppConfig__Main.json`.
  - VV `05__RenderPipeline/Na__RenderEffect__Supersampler__.js`: `min(rgb, a)` in the present pass (TV v2.103.0).
- **Hot files:** `15__ModelLoader/Na__ModelLoader__MultiModel.js`, `02__AppData/Na__AppConfig__Main.json`, `05__RenderPipeline/Na__RenderEffect__Supersampler__.js`
- **Depends on:** nothing
- **Acceptance:**
  - Elevation base images lose the 30 mm-setback line bleed (pixel diff as TV row X); a perspective render is unchanged to the pixel.
  - A supersampled premultiplied layer has colour <= alpha everywhere; opaque frames are unchanged.

---

## Appendix A - normalised code diff counts (TV-only lines / VV-only lines, header stripped)

| Folder | File | +TV | -VV |
|---|---|---|---|
| Annotations | AppConfig.json | 1 | 1 (description) |
| Annotations | History | 2 | 2 (SnapshotHistory name) |
| Annotations | Toolbar | 6 | 3 |
| Annotations | Data, Editor, Hotkeys, Overlay, Styles | 0 | 0 |
| Dimensions | Data | 315 | 10 |
| Dimensions | Editor | 88 | 21 |
| Dimensions | AxisLock / ClientMode / Crosshair / Disclaimer / History / Hotkeys / Overlay / VertexEditor | 1-4 | 1-6 (imports) |
| Dimensions | ConfigState, EditorPreview, Grid, Styles | 0 | 0 |
| Linework | AppConfig.json | 25 | 5 |
| Linework | AuthoredEdges | 54 | 17 |
| Linework | ClipKernel | 8 | 1 |
| Linework | ConfigAccess | 57 | 2 |
| Linework | CpuBackend | 34 | 8 |
| Linework | DevMenu__Controls | 16 | 4 |
| Linework | EdgeExtractor | 41 | 10 |
| Linework | ModelStage | 4 | 0 |
| Linework | Persistence | 17 | 6 |
| Linework | Pipeline | 60 | 19 |
| Linework | Projector | 66 | 6 |
| Linework | StageSampler | 62 | 14 |
| Linework | ViewDefinition | 50 | 21 |
| Linework | WebGpuBackend | 18 | 17 (comments only) |
| Linework | ClipWorker, WorkerPool, DiffHarness, Owners, ExportCompositor, FlatBvh, RasterPreview, Scheduler, SoupBuilder, SvgOverlay, Styles__Main | 0 | 0 |

## Appendix B - TV back-port markers versus what is really pending

| File (TV) | Marker says PENDING | Really pending for VV | Already in VV |
|---|---|---|---|
| AuthoredEdges | 1.2.0 | 1.2.0 + unlogged modifier owners | 1.1.0 owners |
| ClipKernel | 1.2.0 | 1.2.0 | owners |
| ConfigAccess | 1.1.0 | 1.1.0, 1.2.0, `GetLineworkModifiers` | 1.1.1 (annotation) |
| CpuBackend | 1.3.0 | 1.3.0, 1.4.0 | 1.3.1 (annotation) |
| DevMenu__Controls | 1.1.0 | 1.1.0 | edge-style backend wording |
| DoorPose | whole file | 1.0.0-1.3.0 | - |
| EdgeExtractor | 1.3.0 | 1.3.0 | 1.2.0 owners |
| FlushJoins | whole file | 1.0.0, 1.1.0 | - |
| ModelStage | 1.1.0 (1.2.0 done) | 1.1.0 | 1.2.0 content stamp |
| Pipeline | 1.3.0, 1.4.0 | 1.2.0 (seam), 1.3.0, 1.4.0, **1.5.0** | 1.1.0, ForgetCollections |
| Projector | 1.2.0-1.4.0 | 1.2.0, 1.3.0, 1.4.0, **1.5.0** | 1.1.0, 1.4.1 |
| StageSampler | 1.1.0 | 1.1.0, **1.2.0** | owners |
| Storeys | whole file | 1.0.0 | - |
| ViewDefinition | 1.1.0, 1.2.0 | 1.1.0, 1.2.0 | - |
| Persistence | "n/a (this IS the back-port)" | gate only; 1.2.1 not applicable | 1.2.0 schema 2 |
| 49 (all files) | "ValeVision: not yet ported" | whole folder | - |

*Verifier note on this table:* the "Marker says PENDING" column is accurate (checked against `ref/tv_portnote_markers.txt`). The only over-report is inside a DEVELOPMENT LOG entry, not a marker: TV CpuBackend 1.3.1 (18-Sep) still says "Back-port PENDING to ValeVision3D", although VV took it as CpuBackend 1.2.1. TV ClipWorker and WorkerPool log only 1.0.0, while their code equals VV's 1.1.0 (owner tags). That confirms the "never logged" note.

## Appendix C - evidence index

- `ref/drift_all.tsv` rows for `44__System__PlanAnnotations`, `45__System__PlanDimensions`, `50__System__ProjectedLinework`
- Normalised diffs: `scratchpad/parity/work_s02b/diffs/*.diff`. Headers: `work_s02b/hdr_*.txt`. Import graph: `work_s02b/imports_50_49.txt`
- TV devlog: v2.37.0 `:12893`, v2.38.1 `:12796`, v2.42.0 `:12452`, v2.48.1 `:12193`, v2.94.0 `:6950`, v2.103.0 `:6147`, v2.105.0 `:5925`, v2.126.0 `:3982`, v2.140.0 `:2594`, v2.159.0 `:1017` (VV claim at `:1067`)
- TV realign plan rows V `:862-866`, X `:871-874`, AA `:884-887`, AH `:910-913`, line budget `:295-297`, folder map `:304-321`
- VV ledger `:22-49` (progress), `:342-368` (linetype), `:673-701` (edge styles), `:960-1039` (phases 2-4), `:1178-1179` (content stamp, ForgetCollections), `:1214-1232` (pending back-port)
- Door module exports: TV `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js:47-60` (1.9.0 log), VV same file `:43-56` (1.7.1 log)
- VV ComposerPreset `:290-341` (fog plane off in drawings), `:405-420` (RenderFrame), `:447-472` (export overrides)
- VV CrossSectionView SystemLogic `:435-470`; TV SectionCut Engine `:539-550`, CapMeshes `:323-347`
- VV MultiModel `:683-692` (fixed depth bias); TV Main config `:90` (`OrthoDepthBiasMm`)
- WCP worker `CloudflareHandler__ProjectAsset__.js:51` (asset guard)


---

## Verification

Adversarial verification, 01-Oct-2026. Read-only on both apps, NAAPPS and WCP. All scratch output is in `scratchpad/parity/verify_s02b/`: independent code-only diffs in `diffs/`, the importer map script `importers.py`, the link simulation `simulate.py` with its mirrors in `sim/`, and the test scratch files in `tmp/`. TV tests were run with `TEMP`/`TMP` pointed at `verify_s02b/tmp`, so nothing was written outside the scratchpad. A pre-verification copy of this report is `verify_s02b/S02b__report__before_verification.md.bak`.

### What was checked

1. **Coverage.** Every file in scope was enumerated from `tree_tv.tsv`, `tree_vv.tsv` and `drift_all.tsv`: TV 43 (8), 44 (15), 49 (8), 50 (28) = 59; VV 44 (8), 45 (15), 50 (25), 29 (7) = 55. Every file is accounted for in tables c.1 to c.5. No VV-only file exists in 44, 45 or 50.
2. **Independent drift check.** All 48 shared files (8 + 15 + 25) were re-diffed by a different method: comments stripped entirely (not just the header), with identity strings kept and then normalised separately. The same files drift and the same files are code-identical as in Appendix A. The 11 "identical" linework files differ only by `[TrueVision3D ...]` / `[ValeVision3D ...]` strings in console calls, and WebGpuBackend has zero code difference once comments are stripped. Every VV-only code line in a drifted folder-50 file is the "before" side of a TV change, or a Persistence seam. VV has no folder-50 feature that a whole-file port would lose.
3. **Every "VV lacks" claim** was searched across all of `VVM/` (all folders, case-insensitive): FlushJoin, SeamsOcclude, LineworkFirst, HideFlushJoins, DoorPose, PlDoors, StoreyBand, PlStorey, GetStoreySetup, LineworkModifier, ModifierOwnerFor, GetLineworkModifiers, DepthFog, ElevFog, FindDoorGroups, `min(rgb`, OrthoDepthBias. No match in VV for any of them. Related VV code exists but is not equivalent: VV's `26/3dObject__ViewBuildingStoreys__SystemLogic__.js` storey detection (used to seed floor plans), and VV's `29__System__FogPlaneSystem` (a 3D fog).
4. **A link simulation on a scratch mirror of VV's code**, using VV's own `Na__Verify__Exports__.mjs`:
   - **A** - TV folder 50 copied (with folder seams; VV Persistence kept): exactly 7 unresolved names, all DoorPose -> door module: `FindDoorGroups.js` file missing, plus `MOD_TYPE_ROT_ONLY`, `MOD_TYPE_FIXED`, `DescribeDoors`, `ComputePanelLocalPose`, `ApplyPanelTransform`, `GetLiveProgress`. Nothing else in VV, including the VV Layout Editor, breaks.
   - **B** - A plus TV's door module copied verbatim: 4 unresolved names, all in `31/Na__VideoStudio__Playback__SceneAnimations.js` (`SetSpeedScale`, `GetSpeedScale`, `GetBaseDurationMs`, `SnapAllClosed`). This proves the "merge, keep VV's four exports" rule.
   - **C** - B plus TV folder 49: 2 more failures, `42/Na__DrawView__DevRowShell__.js` (missing in VV) and `41__System__SectionCutEngine/Na__SectionCut__Engine__.js` (the DIV-2 seam).
   - The VV baseline on the real tree passes both verifiers (415 files).
5. **TV tests run read-only:** FlushJoins 8/8, ElevationDepthFog 68/68 and HideSwings pass. **StoreyBand fails 1 of 53** in TV today (the build-token check, see S02b-F33).
6. **About 110 individual claims checked** against the files. They cover all 13 critical and high findings (F08, F11, F12, F13, F16, F17, F20, F21, F24, F26, F37, F45, F53) and every medium and low finding at least at the evidence level. Also checked: line references, TV devlog entries (v2.27.0 to v2.159.0), the ledger rows, realign-plan rows V/X/AA/AH, and the other slice reports for overlaps.

### What was corrected

- **S02b-F28 / D-S02b-06 - recommendation reversed (keep VV's localhost bake gate).** VV's DevGate deliberately leaves data-path writes on the hostname test, and VV's `BakeBeforeSave` is a data-path write: Flask `/api/editor-config`, then the Flask mirror. VV's LE asset gate follows the same rule. Persistence becomes "no code change". TV's whole Persistence would not even link in VV, because VV's ProjectLoader has no `GetProjectFolderFromUrl`/`GetYearFromUrl`.
- **S02b-F42 - wrong detail.** The VV tiled renderer DOES draw the section overlay per tile after the composer (`TiledRenderer.js:399, 566-568`). The new hook must draw the fog only, before that call. The LE underlay must null the fog source (TV D6, SnapshotRenderer `:882`).
- **S02b-F31 / section (a) - partly wrong.** The TV markers do not over-report ConfigAccess 1.1.1, Projector 1.4.1 or ModelStage 1.2.0. Only CpuBackend 1.3.1's devlog line is stale.
- **S02b-F01 - action changed to needs_decision.** It conflicts with S02a's D-S02a-01 (renumber VV to TV's numbers), which, if chosen, removes every folder seam in this slice.
- **S02b-F05 / D-S02b-12 - direction conflict with S09 WP-S09-10**, which renames VV's file. The VV-side rename is the default for "align VV to TV".
- **S02b-F08 - precision.** 17 VV files import ConfigState, not 9. Copying TV's Editor fails to LINK. Copying TV's Data alone creates a second, unloaded config.
- **S02b-F09 / WP-S02b-10 - incomplete TV file list** (now 16 TV files plus MarkupBridge).
- **S02b-F33 - severity raised to medium.** TV's own StoreyBand test is red because of it.
- **S02b-F49 / F50 - tests need more than a header rename.** NA project names (RB05 West Farm) appear in the fixtures. HideSwings expects `TrueVision__Linetype__DoorSwings` from the shipped config.
- **S02b-F11 - precision.** The Appearance block is already identical. TV's LineworkModifiers description contradicts itself (prefix vs "exact match"), and the code does a prefix match.
- **S02b-F39 - better seam.** Add `Na__DrawView__SectionAdapter__RenderDepthInto` to both apps (S02a WP-14), or use a 05 SectionClipping depth registry. TV has both the adapter and the registry.
- **WP-S02b-04 acceptance.** On screen the projected-linework SVG overlay is not fogged in either app (it sits above the canvas). Only sheets fog vectors.

### What was added

- **S02b-V01 (high) - VV-only folder-50 integrations TV never wired.** These must survive every port of their host files. They are `Na__PlExport__Apply` in `30/Na__UiFeature__ImageExport__Controls.js:53,295,330`, the per-frame `Na__PlOverlay__SyncFrame` in `01/Na__AppFlow__LoadingSequence.js:435,1327`, `Na__PlStore__BakeBeforeSave` in `43/...DevMenu__Editor__.js:122,577` and `46/...DevMenu__Editor__.js:111,711`, and the `na-model-visibility-changed` dispatch in `26/Na__UiFeature__ModelToggle__Controls.js:178`. TV has none of the four, although TV's realign plan s.9.3 lists all four. TV's pipeline and SnapshotRenderer listen for the visibility event, but nothing in TV dispatches it. S09 WP-S09-14 already has the TV-side event fix, and S02a D-S02a-02 covers the bake.
- **S02b-V02 (medium) - fog and projected vectors in VV exports.** VV composites the vectors AFTER the raster, so per-tile fog lies under them. Decision D-S02b-V02.
- **S02b-V03 (high) - cross-slice duplicates and conflicts** the planner must resolve before dispatch:

  | S02b package | Overlaps | Note |
  |---|---|---|
  | WP-S02b-01 | WP-S09-07 (door part), WP-S04a-06 (door module listed) | keep S02b-01 as owner |
  | WP-S02b-02 | WP-S04a-06 (lists folder-50 DoorPose/Storeys/Projector/Pipeline/ViewDefinition/StageSampler) | strip those files from S04a-06 |
  | WP-S02b-03 | WP-S06b-08 | duplicate - merged there |
  | WP-S02b-04 | WP-S02a-14, WP-S09-08, WP-S09-12 | S09-08's LoadingSequence fog call would double-draw in VV |
  | WP-S02b-05 | WP-S04a-07 | duplicate |
  | WP-S02b-06 | WP-S04a-06 | duplicate |
  | WP-S02b-07 | WP-S04a-08 | subset |
  | WP-S02b-08 tests | WP-S04a-06/07 test lists (HideSwings, StoreyBand, ElevationDepthFog) | port each test once |
  | WP-S02b-10 | WP-S09-14 | one TV session |
  | D-S02b-12 | WP-S09-10 | opposite rename direction |
  | F01 | D-S02a-01 | renumber vs keep |

- **S02b-V04 (low, tooling) - the link simulation as a pre-flight gate.** `verify_s02b/simulate.py` scenarios A/B/C reproduce the dependency chain on a code-only mirror (about 12 MB) without touching the apps.
- **Pipeline note for D-S02b-07.** VV GLBs are produced by the same `Na__TrueVision__GlbBuilderUtility` through ValeVision Cloud Sync's `Na__ValeVisionCloudSync__GlbExportBridge__.rb:57`, and that builder writes nested LineworkModifier nodes (`...EngineCore__LineworkModelHandling__.rb:15, 76`). Whether Vale models carry tags 76-79 is still unverified.

### Work packages

- Refuted as superseded: WP-S02b-02, WP-S02b-04 and WP-S02b-10, replaced by **WP-S02b-02R**, **WP-S02b-04R** and **WP-S02b-10R** (returned in the structured output).
- Refuted as duplicates: WP-S02b-03 (-> WP-S06b-08), WP-S02b-05 (-> WP-S04a-07), WP-S02b-06 (-> WP-S04a-06) and WP-S02b-07 (-> WP-S04a-08). Their text above stays as dependency and acceptance notes.
- WP-S02b-01, 08, 09 and 11 stand. WP-S02b-11 is the only owner of the ortho depth bias and the supersampler clamp; no other slice mentions them.

### Replacement work packages (verifier)

**WP-S02b-02R - Projected linework folder 50 to TV HEAD (corrected) - size L**
- **Scope.**
  - Take TV's whole files: AuthoredEdges, ClipKernel, ConfigAccess, CpuBackend, DevMenu__Controls, EdgeExtractor, ModelStage, Pipeline, Projector, StageSampler and ViewDefinition. The WebGpuBackend comment sync is optional.
  - New files: FlushJoins, Storeys and DoorPose.
  - Take TV's AppConfig JSON whole, re-applying `ValeVision__LineworkModifier__*` OwnerKeys and a VV BuildToken. Drop the self-contradicting "Exact match" sentence.
  - **Persistence: no code change** (PORT NOTE only).
- **Seams.**
  - VALEVISION3D headers and the `[ValeVision3D ...]` console prefix.
  - Folder paths 40->42, 42->43 and 45->46, only if VV is not renumbered first.
  - The ConfigAccess fallback token equals VV's JSON token.
  - TV versions and development logs are adopted, with a VV PORT NOTE (D-S02b-10).
- **Depends on.** WP-S02b-01 and D-S02b-V03; also D-S02b-01, 02, 07, 08, 09 and 10.
- **Acceptance.**
  - The scratch link simulation shows zero unresolved names. Both verifiers exit 0 on the real tree.
  - The normalised diff against TV shows only the listed seams, plus Persistence (folder id, localhost gate, IndexedDB name).
  - `Na__Test__FlushJoins__` passes 8/8 and `Na__Test__StoreyBand__` passes 53/53.
  - The Dev timings rows read as in TV.
  - Rules on versus rules off removes only flush-join and seam-leak segments.
  - Definitions outside the LE carry `DoorPose null`, and their hashes are unchanged.
  - Bake All to R2 on localhost uploads schema-2 assets.
  - The four S02b-V01 integrations are still present.

**WP-S02b-04R - Elevation Depth Fog core and 3D wiring (corrected) - size L**
- **Scope - new VVM/49.**
  - Five files verbatim plus the CSS. Log v2.103.0 in the Shader header.
  - RenderLayer gets one changed import, the cap-depth function. The preferred shape is `Na__DrawView__SectionAdapter__RenderDepthInto` in both apps' adapters: TV a pass-through (with Adam's approval), VV rendering 41 `CapRoot` only into the bound target with `autoClear` off, no clear and no `setRenderTarget`.
  - The DevMenu Row is wired after S02a's DevRowShell lands, with VV elevation accessors and no DraftGuard.
- **Scope - 46 elevation files.**
  - `GetDepthFog`, `SetDepthFog` and `GetDepthFogPlane` verbatim from TV 45 1.1.0 (VV's `GetAxes` and `GetPlaneDistanceMm` have the same semantics), plus Ensure in the normaliser and the creator.
  - ModeController `SetSource` and clear.
  - RowBuilders Fog block.
- **Scope - render and export wiring.**
  - 42 ComposerPreset `RenderFrame`: ONE `Na__ElevFog__RenderOverlay` after the composer and before `drawOverlay`. This covers the screen and the thumbnail.
  - `GetExportOverrides` gains a fog-only member. 30 TiledRenderer calls it per tile after the composer or `supersampler.present()`, and before its existing `sectionOverlayRenderer(activeCamera)`.
  - `index.html` gets the import and `Initialise`. The CSS `@import` goes before the DrawView dev sheet.
  - NO LoadingSequence call.
- **Depends on.** D-S02b-03, D-S02b-04, D-S02b-V02 and D-S02b-V03; S02a DevRowShell (WP-S02a-04); WP-S02b-11.
- **Acceptance.**
  - The ElevationDepthFog test passes 68/68, and the simulation shows no failures in 49.
  - With fog off, the drawing renders byte-identical to before.
  - On screen, surfaces, fat SketchUp lines and the 2D profile lines fade behind the plane. The poche stays solid, the projected-linework SVG overlay stays unfogged (as in TV), and a perspective camera gets no fog.
  - The card thumbnail shows the fog.
  - The image-export raster carries the fog and the section overlay is drawn once per tile. Projected vectors follow D-S02b-V02.
  - LE underlays stay unfogged.
  - FogPlane is unchanged.
- **Ownership.** Merge with WP-S02a-14 and with the fog parts of WP-S09-08 and WP-S09-12.

**WP-S02b-10R - TV-side back-ports (complete) - size M, TV only, on Adam's approval, one session with WP-S09-14**
- **Scope.**
  - (1) PlanDimensions rewire over every file listed in b.2 (16 TV files). Editor uses EditorPreview. Data and Editor drop the duplicated regions and come back under 900 lines.
  - (2) The ConfigAccess fallback token equals the JSON token, and the GetAnnotationSetup comment is fixed.
  - (3) Devlog and PORT NOTE corrections: v2.159.0's VV note, the CpuBackend 1.3.1 line, and the unlogged ClipWorker, WorkerPool, AuthoredEdges, ConfigAccess, Shader and Supersampler changes.
  - (4) Optional: the four S02b-V01 integrations TV's plan s.9.3 expected.
- **Acceptance.**
  - TV StoreyBand passes 53/53.
  - The PlanDimensions folders have zero normalised code diff.
  - MarkupBridge reads the loaded FontFamily.
  - The TV verifiers exit 0.

### Finding index (verifier verdicts)

| Verdict | Findings |
|---|---|
| Confirmed as written | F02, F03, F04, F06, F07, F10, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24, F25, F26, F27, F29, F32, F34, F35, F38, F40, F44, F45, F46, F47, F48, F51, F52, F53, F54, F55, F56 |
| Confirmed, with precision or routing corrections | F08, F09, F11, F30, F33, F36, F37, F39, F41, F43, F49, F50 |
| Recommendation or detail changed | F01 (needs_decision), F05 (VV-side rename), F28 (keep_vv_divergence), F31 (marker claim corrected), F42 (hook spec) |
| Refuted outright | none |

### What remains unverified

- Runtime behaviour. No app was run. All rendering claims (fog placement, flush-join removal on Vale models, door pose with VV's registry, export compositing) come from reading the code.
- Whether Vale SketchUp models use tags 76-79, Storey__ groups with doors on two or more storeys, or `Linetype__DoorSwings` / `ClearanceLines` GLBs. The VV test GLBs (March 2026) carry none.
- Whether TV's on-screen projected-linework SVG overlay goes out of register on pan or zoom. Nothing in TV calls `Na__PlOverlay__SyncFrame` per frame, but this was not observed in the running app.
- TV v2.140.0's "old records load byte-identical" and v2.94.0's record compatibility claims were taken from the TV devlog, not re-run.
- Na__Verify__ModuleGraph__ was run on the real VV tree only, not on the simulated mirrors (they have no index.html or import map).
