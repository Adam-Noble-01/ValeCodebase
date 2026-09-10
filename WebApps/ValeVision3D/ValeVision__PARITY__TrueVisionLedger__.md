# ValeVision 3D - TrueVision Parity Ledger

Tracks every module pair between ValeVision 3D and TrueVision 3D for the systems ported under
`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. One row per pair. Update the row whenever either
side changes; log fixes made here that TrueVision still needs in the Pending back-port table at the foot.

Parity states: `verbatim` (logic identical, headers and console prefix differ), `adapted` (deliberate
divergences listed in the file's PORT NOTE), `diverged` (same purpose, different implementation),
`new` (no TrueVision counterpart yet, back-port candidate).

TrueVision root: `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`.
ValeVision root: `WebApps/ValeVision3D`.

---

## Phase 0 - Libraries (v2.16.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `04__Lib__ThirdParty__VersionLocked/` (three r184, three-mesh-bvh 0.9.9, clipper2-js 0.9.0, three-edge-projection 0.0.10) | esm.sh three r160 import map | diverged | ValeVision runs the Lantern Designer's locked set; TrueVision stays on r160 until it adopts the projection engine. clipper2-js added 10-Sep-2026 (v2.21.1): three-edge-projection imports it at module load | 10-Sep-2026 |

## Phase 1 - Scene Groups (v2.17.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | adapted | Sixth default group Cross Sections (D09) | 09-Sep-2026 |
| `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | verbatim | Console prefix only; the ValeVision carousel has no idle fade to inherit | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | adapted | Async confirm dialog instead of window.confirm | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js` 1.0.0 | rows inside `21/Na__PresentationMode__DevMenu__SceneEditor.js` | adapted | Split out; no Advanced fold, no nav mode or layer timing rows, four action buttons | 09-Sep-2026 |
| `21/Na__PresentationMode__Styles__SceneGroupSelector__.css` | `21/Na__PresentationMode__Styles__SceneGroupSelector__.css` + dev row rules from the carousel sheet | adapted | Dev row controls carried in this sheet rather than the carousel sheet | 09-Sep-2026 |
| `21/Na__PresentationMode__ProjectJson__SceneData.js` 1.2.0 | `21/Na__PresentationMode__ProjectJson__SceneData.js` | adapted | ValeVision keeps projectCode context and the IMG-slot thumbnail self-heal; group-aware sort and BroadcastScenesChanged ported | 09-Sep-2026 |
| `21/Na__PresentationMode__UI__SceneCarousel.js` 1.2.0 | `21/Na__PresentationMode__UI__SceneCarousel.js` (v2.18.0 state) | adapted | Views toggle, ShowCarouselByDefault, thumbnail fallback and orbit pivot re-arm kept; idle fade and wake not ported | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneReorder__.js` 1.0.0 | reorder regions inside `21/Na__PresentationMode__DevMenu__SceneEditor.js` | adapted | Split out; helpers take (scenes, config) instead of reading editor state | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__ScenePersistence__.js` 1.0.0 | none | new | ValeVision's own R2SaveProjectJson save and Flask thumbnail upload, split out of the editor | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneEditor.js` 1.3.0 | `21/Na__PresentationMode__DevMenu__SceneEditor.js` (v2.19.0 state) | adapted | GET-merge + R2SaveProjectJson save path, Flask thumbnail endpoint, confirm dialog, no drawing-scene guard until Phase 2 | 09-Sep-2026 |

## Phase 2 - Drawing Substrate, Floor Plans, Annotations, Dimensions (v2.18.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `42/Na__DrawView__ActiveView__.js` 1.0.0 | `40/Na__DrawView__ActiveView__.js` 1.0.0 | verbatim | Console prefix, folder numbers | 09-Sep-2026 |
| `42/Na__DrawView__Navigation__.js` 1.0.0 | `40/Na__DrawView__Navigation__.js` | verbatim | | 09-Sep-2026 |
| `42/Na__DrawView__MarkupMount__.js` 1.0.0 | `40/Na__DrawView__MarkupMount__.js` 1.0.0 | verbatim | Dimension config getters imported from the split ConfigState module | 09-Sep-2026 |
| `42/Na__DrawView__MarkupFocus__.js` 1.1.0 | `42/Na__FloorPlan__MarkupFocus__.js` 1.1.0 | verbatim (relocated) | Namespace Na__DrawFocus__ | 09-Sep-2026 |
| `42/Na__DrawView__SceneLinkRow__.js` 1.0.0 | `40/Na__DrawView__SceneLinkRow__.js` 1.0.0 | verbatim | | 09-Sep-2026 |
| `42/Na__DrawView__SectionAdapter__.js` 1.2.0 | `41/Na__SectionCut__Engine__.js` (surface only) | diverged (D07) | Drives Na__CrossSectionView__SystemLogic; snapshots and restores the live tool; drawing colours, SuspendLiveTool and Release (Phase 3); vertical plane sign fix and GetPlaneDefinition (Phase 4) | 09-Sep-2026 |
| `42/Na__DrawView__ComposerPreset__.js` 1.2.0 | `40/Na__DrawView__ProfileLines__.js` (purpose only) | diverged (D12) | Composer route; reuses the legacy 2D profile pre-pass; config through ConfigState (Phase 3); export overrides (Phase 4) | 09-Sep-2026 |
| `42/Na__DrawView__MaterialPreset__.js` 1.1.0 | none | new | Self-contained stash and restore, not the MaterialsSystem whitecard pass; config through ConfigState (Phase 3) | 09-Sep-2026 |
| `42/Na__DrawView__ProjectData__.js` 1.0.0 | none | new (D08) | Owns LayoutEditor__DrawingsData and the one drawings save | 09-Sep-2026 |
| `42/Na__DrawView__Transitions__.js` 1.0.0 | mode controllers (shared parts) | adapted (split) | Walk and fly returned to orbit through the toolbar | 09-Sep-2026 |
| `42/Na__DrawView__AppConfig__.json`, `Na__DrawView__Styles__DevMenu__.css` | scene row rules in the TV elevation sheet | adapted | Config new; CSS relocated | 09-Sep-2026 |
| `43/Na__FloorPlan__ConfigState__.js`, `OrthoCamera__`, `SceneLink__` | `42/` same names 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `43/Na__FloorPlan__Framing__.js` 1.0.0 | `42/Na__FloorPlan__Framing__.js` 1.0.0 | adapted | Approach scene carries IsDrawingApproach | 09-Sep-2026 |
| `43/Na__FloorPlan__ProjectJson__Data__.js` 1.1.0 | `42/` same 1.0.0 | adapted | Drawings block, styles, exclusions, asset slot | 09-Sep-2026 |
| `43/Na__FloorPlan__ModeController__.js` 1.2.1 | `42/` same 1.1.0 | adapted | Section adapter, presets, shared transitions; holds and releases the live tool (Phase 3) | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__Editor__.js` 1.1.0 | `42/` same 1.0.0 | adapted | Drawings save, asset thumbnails, Ground Floor Plan, confirm dialog | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__RowBuilders__.js` 1.2.0 | `42/` same 1.0.0 | adapted | Styles row and exclusion field through the shared StyleRows (Phase 3) | 09-Sep-2026 |
| `43/Na__FloorPlan__AppConfig__.json`, `Styles__DevMenu__.css` | `42/` same | adapted | Extra labels; style toggle rules | 09-Sep-2026 |
| `44/Na__PlanAnnotations__*` (6 js, json, css) | `43/` same | verbatim | Imports repointed; focus arbiter from 42 | 09-Sep-2026 |
| `45/Na__PlanDimensions__Data__.js` + `ConfigState__.js` | `44/Na__PlanDimensions__Data__.js` 1.0.0 | adapted (split) | Config layer split out | 09-Sep-2026 |
| `45/Na__PlanDimensions__Editor__.js` + `EditorPreview__.js` | `44/Na__PlanDimensions__Editor__.js` 1.0.0 | adapted (split) | Rubber-band preview split out | 09-Sep-2026 |
| `45/Na__PlanDimensions__*` (9 other js, json, css) | `44/` same | verbatim | Imports repointed | 09-Sep-2026 |
| `03/Na__AppUtils__SnapshotHistory__.js` | `03/Na__AppUtils__SnapshotHistory.js` | verbatim | File name suffix | 09-Sep-2026 |
| `03/Na__AppUtils__R2AssetUpload__.js` | `80/Na__CloudflareIntegration__ApiClient__.js` (thumbnail part) | new | Worker asset route plus Flask mirror | 09-Sep-2026 |
| `41/Na__CrossSectionView__SystemLogic.js`, `SceneData.js` (edited) | n/a | n/a | Additive exports; approach-scene skip | 09-Sep-2026 |
| `21/Na__PresentationMode__Camera__SceneTransition.js`, `Thumbnail__Renderer.js` (edited) | TV same | adapted | isDrawingApproach; frame hook and CaptureAndUpload | 09-Sep-2026 |

## Phase 3 - Elevations and Sections (v2.19.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `42/Na__DrawView__ConfigState__.js` 1.0.0 | none (TV ConfigState pattern) | new | Main config over system JSON over fallbacks; carries the Doous section colours | 09-Sep-2026 |
| `42/Na__DrawView__StyleRows__.js` 1.0.0 | none | new | Style toggles and exclusion field shared by plans and elevations | 09-Sep-2026 |
| `46/Na__Elevation__ConfigState__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Additive GetSectionGroupTarget (D28), GetFacePickSetup and GetGripSetup (D16) | 09-Sep-2026 |
| `46/Na__Elevation__OrthoCamera__.js` 1.0.0 | `45/` same 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `46/Na__Elevation__Framing__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Approach scene carries IsDrawingApproach | 09-Sep-2026 |
| `46/Na__Elevation__PlaneGizmo__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Additive GetFaceMesh export; helpers also carry naCrossSectionHelper | 09-Sep-2026 |
| `46/Na__Elevation__ProjectJson__Data__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Drawings block, styles, exclusions, asset slot, SeededFrom, AzimuthFromNormal | 09-Sep-2026 |
| `46/Na__Elevation__SceneLink__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Target group by drawing type; SyncSceneGroup moves the card | 09-Sep-2026 |
| `46/Na__Elevation__ModeController__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Section adapter (plain elevation holds the tool), presets, shared transitions, live styles | 09-Sep-2026 |
| `46/Na__Elevation__DevMenu__Editor__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Drawings save, Pick Face and Re-pick, gizmo grip, mode-based groups, asset thumbnails, confirm dialog | 09-Sep-2026 |
| `46/Na__Elevation__DevMenu__RowBuilders__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Re-pick button; shared styles row and exclusion field | 09-Sep-2026 |
| `46/Na__Elevation__FacePick__.js` 1.0.0 | none (rules from VV `40/Na__ElevationView__SystemLogic.js`) | new (D16) | Click threshold, first mesh hit, XZ normal, bearing from normal | 09-Sep-2026 |
| `46/Na__Elevation__GizmoGrip__.js` 1.0.0 | none | new (D16) | Drag along the plane normal against the gizmo face mesh only; orbit paused for the drag | 09-Sep-2026 |
| `46/Na__Elevation__AppConfig__.json`, `Styles__DevMenu__.css` | `45/` same | adapted | Section group, FacePick and Grip blocks, extra labels; scene row rules live in 42 | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__RowBuilders__.js`, `ModeController__.js` (edited) | `42/` same | adapted | Shared style rows; hold and release of the live tool | 09-Sep-2026 |

## Phase 4 - Projected Linework (v2.20.0, 09-Sep-2026)

Source root for this phase: `WebApps/Vale__LanternDesigner/02__Src__AppModules/27__System__ProjectedEdges2d` (Lantern Designer, LD).

| ValeVision | Lantern Designer | Parity | Notes | Checked |
|---|---|---|---|---|
| `50/Na__ProjectedLinework__ClipKernel__.js` | LD `ClipKernel__.mjs` | verbatim | Header restyled, identifiers renamed; zero imports kept | 09-Sep-2026 |
| `50/Na__ProjectedLinework__FlatBvh__.js` | LD `FlatBvh__.mjs` | verbatim | | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ClipWorker__.js` | LD `ClipWorker__.mjs` | adapted | Done reply carries HiddenSegments | 09-Sep-2026 |
| `50/Na__ProjectedLinework__WorkerPool__.js` | LD `WorkerPool__.mjs` | adapted | Run resolves { Segments, HiddenSegments } | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Scheduler__.js`, `DiffHarness__.js`, `RasterPreview__.js`, `WebGpuBackend__.js` | LD same | verbatim | Identifiers and console prefix | 09-Sep-2026 |
| `50/Na__ProjectedLinework__SoupBuilder__.js` | LD `SoupBuilder__.mjs` | adapted | ViewMapFromBasis: permutation or rotation (D40); TurnPoint shared | 09-Sep-2026 |
| `50/Na__ProjectedLinework__EdgeExtractor__.js` | LD `EdgeExtractor__.mjs` | adapted | Instances, viewer vector, SplitByCut, ToDrawingSegments; authored key Na__AuthoredEdges | 09-Sep-2026 |
| `50/Na__ProjectedLinework__StageSampler__.js` | LD `StageSampler__.mjs` | adapted | Live model root, helper flags, InstancedMesh, exclusions (D19), transparency rule, cut clipping, section outline | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ModelStage__.js` | LD `ModelStage__.mjs` | adapted | Fingerprint and BVH priming only; clone group for the vendored backends | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Projector__.js` | LD `Projector__.mjs` | adapted | Basis from the view definition; collection and sample split; hidden edges option | 09-Sep-2026 |
| `50/Na__ProjectedLinework__CpuBackend__.js` | LD `CpuBackend__.mjs` | adapted | Four classes; cut split; authored pass | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Pipeline__.js` | LD `Pipeline__.mjs` | adapted (split) | One drawing; model fingerprint; asset before compute; triangle ceiling | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Persistence__.js` | LD `LineworkStore__.mjs` | adapted | R2 asset per drawing, record reference, IndexedDB, bake before save (D20) | 09-Sep-2026 |
| `50/Na__ProjectedLinework__SvgOverlay__.js` | LD `SvgLayer__.mjs` | adapted | Standalone SVG over the canvas; per-frame transform; export markup | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ConfigAccess__.js` | LD `ConfigAccess__.mjs` | adapted | Typed getters; Main.json override for exclusions | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ViewDefinition__.js` | LD `Projector__.mjs` (basis table) | new | Record to basis, cut, fingerprint | 09-Sep-2026 |
| `50/Na__ProjectedLinework__AuthoredEdges__.js` | none | new (D18) | SketchUp linework GLBs as the authored class | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ExportCompositor__.js` | none | new | Overlay onto exported images | 09-Sep-2026 |
| `50/Na__ProjectedLinework__DevMenu__Controls__.js` | LD `ToolbarButton__.mjs` (purpose) | new | Dev menu section with the console helpers as buttons | 09-Sep-2026 |
| `50/Na__ProjectedLinework__AppConfig__.json`, `Styles__Main__.css` | LD config and stylesheet | adapted | ValeVision keys and blocks; layer and dev rules only | 09-Sep-2026 |
| `43/Na__FloorPlan__ModeController__.js` 1.2.2, `46/Na__Elevation__ModeController__.js` 1.1.1 (edited) | TV same | adapted | ApplyStyles announces the change | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__Editor__.js`, `46/Na__Elevation__DevMenu__Editor__.js` (edited) | TV same | adapted | Bake before save | 09-Sep-2026 |
| `26/Na__UiFeature__ModelToggle__Controls.js`, `30/Na__UiFeature__ImageExport__Controls.js`, `01/Na__AppFlow__LoadingSequence.js` (edited) | n/a | n/a | Visibility event; export compositing; overlay sync | 09-Sep-2026 |

## Phase 5 - Layout Editor (v2.21.0, 10-Sep-2026)

No TrueVision counterpart exists for this phase. Sources are pattern-level: the Lantern Designer's `30__System__DrawingEditorMode` (LD) and ValeVision's own `35__System__PageLayoutSystem` (VV). Every module is a back-port candidate.

| ValeVision | Source | Parity | Notes | Checked |
|---|---|---|---|---|
| `51/Na__LayoutEditor__AppConfig__.json`, `ConfigState__.js` | LD config access | adapted | Sheet, style, title block, scales, viewport, text, dimensions, linework, panels, navigation, PDF, labels | 10-Sep-2026 |
| `51/Na__LayoutEditor__ScaleManager__.js` | LD `ScaleManager__` | adapted | 20, 50, 100 only (D27) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetLayout__.js` | LD `SheetPdfLayout__` | adapted | Free viewports, no view grid | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetModel__.js` 1.0.1, `SheetRecords__.js` | none | new | Records in `LayoutEditor__DrawingsData__Sheets`; split for the line budget | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetChrome__.js` | LD `SheetChrome__` | adapted | Polyline, rotated text, clipped groups; title blocks split out | 10-Sep-2026 |
| `51/Na__LayoutEditor__TitleBlock__Modern__.js` | LD `SheetChrome__` (title block region) | adapted | ValeVision fields | 10-Sep-2026 |
| `51/Na__LayoutEditor__TitleBlock__Classic__.js` | VV title block scan | new | Scan stretched to the sheet, anchored fields (D26) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetSurface__.js` | LD `SheetSurface__` | adapted | Frames, selection layer, per-frame content by the viewport modules | 10-Sep-2026 |
| `51/Na__LayoutEditor__Navigation__.js` | LD `SheetManager__` (navigation) | adapted | Scroll-based pan, pinch | 10-Sep-2026 |
| `51/Na__LayoutEditor__ViewportHandles__.js` 1.1.0 | VV `Controls__Pc__` | adapted | Millimetre space; every handle crops, corners both axes (D29, D30 revised) | 10-Sep-2026 |
| `51/Na__LayoutEditor__Viewport2d__.js`, `Viewport3d__.js`, `SnapshotRenderer__.js`, `Assets__.js` | none | new | Underlay and snapshot pipeline; R2 snapshots (D36) | 10-Sep-2026 |
| `51/Na__LayoutEditor__MarkupBridge__.js`, `DimensionGeometry__.js` | VV 44 and 45 (rules) | adapted | Static scene markup at scale; native sheet markup (D34) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetTools__.js` 1.4.0 | VV `Controls__Pc__` (pointer conventions) | new | Select, move, crop, content editing, locks, context menu, text, dimension, keys | 10-Sep-2026 |
| `51/Na__LayoutEditor__History__.js` | VV 44 `PlanAnnotations__History__` (pattern) | adapted | Per-sheet undo and redo, fifty whole-sheet snapshots | 10-Sep-2026 |
| `51/Na__LayoutEditor__ContextMenu__.js` | none | new | Right-click menu in the house style | 10-Sep-2026 |
| `51/Na__LayoutEditor__AutoSave__.js` | none | new | Browser draft of every change; structural changes save the project | 10-Sep-2026 |
| `51/Na__LayoutEditor__TextTool__.js` | VV 51 `SheetTools__` 1.3.0 (split) | new | Text placement, the inline field for text and dimension values | 10-Sep-2026 |
| `51/Na__LayoutEditor__DimensionTool__.js` | VV 51 `SheetTools__` 1.3.0 (split) | new | Three-click placement, offset inference, inline value | 10-Sep-2026 |
| `51/Na__LayoutEditor__Grips__.js` | VV 51 `ViewportHandles__` (pattern) | new | Dimension and shape grips, rubber band | 10-Sep-2026 |
| `51/Na__LayoutEditor__ShapeGeometry__.js`, `ShapeTool__.js`, `Panel__Shapes__.js` | none | new | Vector lines, polylines and polygons; Vectors layer type; Vectors panel | 10-Sep-2026 |
| `51/Na__LayoutEditor__Enhance__.js` | VV 30 `ImageExport__PostProcessEffects__Pipeline` | adapted | Levels and sharpen on a viewport render (Enhance Whitecard style) | 10-Sep-2026 |
| `51/Na__LayoutEditor__PanelHost__.js`, `Panel__Sheet__`, `Panel__Layers__`, `Panel__ViewportSettings__`, `Panel__Text__`, `Panel__Dimensions__`, `Panel__Styles__` | LD panel columns (purpose) | new | D31, D32, D33 | 10-Sep-2026 |
| `51/Na__LayoutEditor__Toolbar__.js`, `TabStrip__.js`, `ModeController__.js`, `DevMenu__Controls__.js` | LD mode tab, VV 43 mode pattern | new | D22 to D24 | 10-Sep-2026 |
| `51/Na__LayoutEditor__PdfExporter__.js` | VV `PdfExport__A3__`, LD `DrawToPdf` | adapted | Any paper size, vector content (D35) | 10-Sep-2026 |
| `51/Na__LayoutEditor__Styles__Main__.css`, `Styles__Panels__.css` | LD stylesheet | adapted | | 10-Sep-2026 |
| `index.html`, `03/Na__CoreUi__Styles__Index__.css`, seven header-anchored stylesheets (edited) | n/a | n/a | Dev item, imports, init; CSS imports; tab strip offset | 10-Sep-2026 |

---

## Pending back-port (ValeVision to TrueVision)

| Item | Where | Why TrueVision wants it |
|---|---|---|
| Scene row builders and reorder helpers split out of the scene editor | `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js`, `21/Na__PresentationMode__DevMenu__SceneReorder__.js` | The TrueVision editor is 1622 lines, over the house budget |
| Ground Floor Plan quick action and the per-drawing style toggles | `43/Na__FloorPlan__DevMenu__Editor__.js`, `43/Na__FloorPlan__DevMenu__RowBuilders__.js` | One-click start for most jobs; styles shared with sheet viewports |
| Dimension config and preview splits | `45/Na__PlanDimensions__ConfigState__.js`, `45/Na__PlanDimensions__EditorPreview__.js` | TrueVision's data and editor modules are 988 and 907 lines |
| R2 asset upload utility | `03/Na__AppUtils__R2AssetUpload__.js` | One path for every binary asset with a local mirror |
| Async confirm dialog for destructive dev actions | `21/Na__PresentationMode__DevMenu__GroupEditor__.js`, scene editor | Replaces window.confirm, which blocks the render loop and cannot be styled |
| Pick Face, Re-pick and the gizmo grip | `46/Na__Elevation__FacePick__.js`, `46/Na__Elevation__GizmoGrip__.js`, editor wiring | Loose editing of the drawing plane in the 3D view; the sliders stay the precise path |
| Sections filed by drawing type | `46/Na__Elevation__SceneLink__.js`, config section group keys | The Elevations and Cross Sections groups hold what their names say |
| Shared drawing style rows and config state | `42/Na__DrawView__StyleRows__.js`, `42/Na__DrawView__ConfigState__.js` | One row builder and one config reader for every drawing kind |
| Rotation path in the soup builder and edge extractor (Lantern Designer) | `50/Na__ProjectedLinework__SoupBuilder__.js`, `EdgeExtractor__.js` | A free-bearing view without a fourth basis table entry |
| Hidden segments through the worker pool (Lantern Designer) | `50/Na__ProjectedLinework__ClipWorker__.js`, `WorkerPool__.js` | The kernel already computes them; the pool now returns them |
| The whole Layout Editor (sheets, viewports at scale, PDF) | `51/Na__LayoutEditor__*` | TrueVision has no sheet output; the module set only depends on the drawing records and the projection pipeline |
