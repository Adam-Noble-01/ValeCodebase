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
| `04__Lib__ThirdParty__VersionLocked/` (three r184, three-mesh-bvh 0.9.9, three-edge-projection 0.0.10) | esm.sh three r160 import map | diverged | ValeVision runs the Lantern Designer's locked set; TrueVision stays on r160 until it adopts the projection engine | 09-Sep-2026 |

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
| `42/Na__DrawView__SectionAdapter__.js` 1.1.0 | `41/Na__SectionCut__Engine__.js` (surface only) | diverged (D07) | Drives Na__CrossSectionView__SystemLogic; snapshots and restores the live tool; drawing colours, SuspendLiveTool and Release (Phase 3) | 09-Sep-2026 |
| `42/Na__DrawView__ComposerPreset__.js` 1.1.0 | `40/Na__DrawView__ProfileLines__.js` (purpose only) | diverged (D12) | Composer route; reuses the legacy 2D profile pre-pass; config through ConfigState (Phase 3) | 09-Sep-2026 |
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

## Phase 4 to Phase 5

Rows are added as each phase lands. Planned pairs are listed in Appendix A of the plan document.

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
