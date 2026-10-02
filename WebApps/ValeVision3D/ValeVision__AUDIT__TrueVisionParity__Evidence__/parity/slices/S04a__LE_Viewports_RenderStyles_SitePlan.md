# S04a - Layout Editor: Viewports, Render Styles, Site Plans, Model Source

Parity slice report, TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target). Read-only analysis,
01-Oct-2026. TV git root HEAD b2aa9151 (devlog top v2.172.0), VV git root HEAD 7b4e593a (devlog top
v2.71.0).

Path shorthand used below (expand before use):

| Short | Full path (relative to each app root) |
|---|---|
| `LE/` | `02__Src__AppModules/51__System__LayoutEditor/` |
| `LE/20/` | `LE/20__System__Viewports/` |
| `LE/21/` | `LE/21__System__SitePlanData/` (TV only) |
| `LE/25/` | `LE/25__System__RenderStyles/` |
| `LE/40/` | `LE/40__Ui__Panels/` |
| `M/` | `02__Src__AppModules/` |
| TV root | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` |
| VV root | `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` |

Every module name below is `Na__LayoutEditor__<Name>__.js` unless written in full. "VV lacks X (TV vN)"
means the TV module DEVELOPMENT LOG entry X, released in TV devlog version vN, has no counterpart in the VV
file.

---

## (a) Scope - what was examined

| Folder | TV files | TV lines | VV files | VV lines |
|---|---|---|---|---|
| `LE/20__System__Viewports` | 19 | 7,519 | 13 | 4,385 |
| `LE/21__System__SitePlanData` | 2 | 1,168 | 0 | 0 |
| `LE/25__System__RenderStyles` | 10 | 3,400 | 8 | 2,224 |
| `LE/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js` | 1 | 240 | 0 | 0 |
| **Total** | **32** | **12,327** | **21** | **6,609** |

State of the 32 TV files (from `ref/drift_all.tsv`, every row re-checked with `git diff --no-index -w`):

- 6 "header-only": ForceRender, RasterQuality, Viewport3dZoom, ViewportIdentity__Config,
  EdgeStyles__Config, RenderComposites__Config. **Four of these six are misclassified** (see F04):
  Viewport3dZoom carries TV 1.1.0 code at TV line 265-269, and the three JSON configs are shorter than the
  120-line "header" window, so every real data change in them reads as header.
- 15 drifted: Viewport2d, Viewport2d__Frame, Viewport2d__Linework, Viewport2d__Window, Viewport3d,
  ViewportClipboard, ViewportHandles, ViewportIdentity, ViewportTitleText, EdgeStyles, Enhance, ModelLayers,
  ModelLayers__Config, RenderComposites, SnapshotRenderer.
- 11 TV-only: ModelSource, PlanDoors, VectorQuality, Viewport2d__DepthFog, Viewport2d__SitePlan,
  ViewportRotation (all `LE/20/`); Na__SitePlan__GlbParse__, Na__SitePlan__Store__ (`LE/21/`);
  SitePlanComposites + its Config (`LE/25/`); Panel__SitePlanComposites (`LE/40/`).
- VV-only in scope: none.

Also read (to establish wiring and evidence): TV `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`
(sections 2.2, 3, 10.2, 12), `TrueVision__PLAN__SitePlanDrawings__.md` (whole), `TrueVision__PLAN__SitePlanComposites__.md`
(sections 0-4, 6, 11b, 11c, 12), `TrueVision__NOTES__LayoutEditorPerformance__.md` (headings, section 5); TV devlog
entries v2.32.0, v2.58.2, v2.89.0, v2.93.0, v2.94.0, v2.111.0, v2.136.0, v2.138.0, v2.140.0, v2.155.0, v2.159.0 and
the file lists of v2.42.0, v2.48.x, v2.49.x, v2.64.x, v2.101.0, v2.105.0, v2.132.0, v2.137.0, v2.160.0, v2.164.0;
VV `ValeVision__PARITY__TrueVisionLedger__.md` (lines 1-110, 400-530, 625-775, 1085-1247); VV
`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (decisions table, storey note); git history of TV commits
`6076ec10` and `55014c6a` (unlogged changes, see F47 / F21); the consumers of every TV-only module (grep of
`M/`); VV `03__AppUtils/Na__AppUtils__ProjectLoader.js` (asset URLs), VV `15__ModelLoader` exports, VV
`26__System__ToggleModelElements`, VV/TV `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`,
VV/TV `50__System__ProjectedLinework` listings, WCP `server.py` routes and `WCP/Projects/2026/3047__Doous` layout,
and the shared Tags SSOT `Plugins/Na__Common__DataLib__CoreSuEntityStandards/Na__DataLib__CoreIndex__Tags__.json`.
Line endings: every file in scope is CRLF in both apps except **VV `LE/25/Na__LayoutEditor__Enhance__.js`, which is
LF** (git warns on diff).

Not read at all: the GLB Builder's Site Plan Export (SketchUp Plugins repository), the ProjectVision build and R2
sync scripts, WCP `CloudflareWorker/src`, and any Vale GLB (so whether Vale linework GLBs carry LineworkModifier
nodes is unverified). Not examined in depth (owned by other slices, referenced only as wiring): `LE/05` ModeController/TabStrip,
`LE/07` SheetModel/SheetRecords/ScaleManager, `LE/10` SheetSurface/SheetChrome, `LE/26` DraftMode, `LE/28`
ObjectSnap, `LE/30` SheetTools, `LE/36` HatchPatternTools, `LE/40` panels other than Panel__SitePlanComposites,
`LE/55`/`57` Scrapbooks, `LE/60` PdfExporter, `LE/65` DocumentPublishing, `M/49__System__ElevationDepthFog`,
`M/50__System__ProjectedLinework`, `M/26__System__ToggleModelElements`, `M/25__System__3dObject__InteractionSystem`.

---

## (b) Narrative findings by sub-system

### b.1 How far apart the two copies are, in one paragraph

The last TV->VV return trips that touched this slice are dated 13-20 Sep 2026 (VV v2.28.0 composites weights,
v2.30.0 edge styles, v2.31.1 snapshot stamp, v2.42.0 3D zoom, v2.57.0 viewport cache + content stamps,
v2.67.0 identity/title text, v2.70.0 snapshot queue depth, v2.71.0 per-scene lighting, which went VV->TV as
TV v2.161.0). Since then TV has landed, inside this slice alone: Enhance Whitecard strength (v2.93.0), depth fog
per drawing (v2.94.0), raster honouring of nested detail tags (commit `6076ec10`, 21-Sep, unlogged), one storey
per plan for door poses (v2.105.0), Draft mode guards (v2.107.0), the Vector quality control (v2.136.0), rotatable
viewports (v2.138.0), Hide swings (v2.140.0), per-viewport fill colour and line-type scale (commit `55014c6a`,
29-Sep, unlogged) and the site plan legend hook (v2.164.0). Older TV-first features that were never offered to VV
are still absent: Model Source / design phases (v2.32.0), plan doors (v2.42.0, v2.48.1) and the whole site plan
system (v2.48.0 onward). The net effect is that 9 of the 15 drifted VV files carry the comment "less its design
phase lines" or an equivalent, i.e. every port into them is a hand merge.

### b.2 What is already aligned (do not redo)

- **Viewport cache** (TV v2.64.0 / v2.64.1 -> VV v2.57.0): Park/Restore/Release by body, LiveState, `stillWanted`,
  `ForgetPaths`, ForceRender's single `ForgetCollections`, the content-stamp `ModelHash`. VV Viewport2d 1.8.0,
  Frame 1.1.0, Viewport3d 1.6.0, SnapshotRenderer 1.6.0 carry them "less the design phase lines" (ledger
  line 1171, 1179).
- **ForceRender** 1.1.0 and **RasterQuality** 1.0.0: code identical (RasterQuality differs by one comment separator
  at TV line 165).
- **3D viewport zoom** (TV v2.50.0 -> VV v2.42.0): Viewport3dZoom 1.0.0, Viewport3d window/Place/ExportRectMm,
  Handles 1.4.0 note, TiledRenderer `viewWindow` (VV TiledRenderer 1.4.0).
- **Render composite weights** (TV v2.27.0 -> VV v2.28.0) and **edge styles / owner tags** (TV v2.27.0 -> VV
  v2.30.0), through VV's own width consumers (DIV-1).
- **Per-scene lighting in snapshots**: VV SnapshotRenderer 1.7.0 / Viewport3d 1.6.1 == TV 1.13.0 / 1.8.1 for this
  feature (ledger line 1208). Only header text is stale (F49; the survey wrote F48 here - corrected by verifier).
- **Snapshot queue depth** (`QUEUE_EVENT`, `GetOutstanding`): verbatim both sides (ledger line 1242).
- **ViewportTitleText 1.0.0 / ViewportIdentity 1.0.0** (TV v2.80.0 -> VV v2.67.0).
- **Owners** (`M/50/Na__ProjectedLinework__Owners__.js`) exports are identical in both apps, so the site plan
  painter's owner-table calls resolve in VV unchanged.

### b.3 SnapshotRenderer (TV 1.13.0, 1,085 lines vs VV 1.7.0, 639 lines) - the hub

Everything a viewport draws goes through `Na__LeSnap__Render2d` / `Render3d`. The VV copy is a correct DIV-1
adaptation and must stay one; it must not be overwritten whole.

**DIV-1 seams VV must keep** (VV `LE/25/Na__LayoutEditor__SnapshotRenderer__.js`):
- `Na__DrawView__ComposerPreset__Enter({ camera, styles, edgeWidthPx })` (VV :502) where TV calls
  `Na__DrawView__RenderPreset__Enter` + `Na__DrawProfile__SetEdgeWidth` (TV :906).
- Model edge width through `Na__LineworkSettings__SetLineworkBaseOverride` (VV :504, :523, :581, :597) where TV
  writes every line material's `linewidth` itself (`Na__LeSnap__SetModelEdgeWidth`, TV :678).
- Section outline width through `Na__CrossSection__GetAppearance` / `SetLineWidth` (VV, DIV-2) where TV uses
  `Na__SectCutCfg__GetAppearance` / `SetAppearance`.
- `RenderToCanvas({ camera : Na__LeSnap__Camera })` (VV :511): VV's composer preset swaps the RenderPass camera to
  the ortho; TV passes the framed ortho itself (TV :933) and draws through `renderFrame`.
- `Na__ModelToggle__SetCategoryVisibility(key, false, true)` - exact key, silent (VV :451-452). TV uses the token
  matcher for context categories and `SetCategoryVisibleByKey` for Model Layers. VV's setter is already exact-key
  (Map lookup) and its silent flag is what keeps the fingerprints from resetting mid-render; keep it.
- `CONTEXT_CATEGORIES` with `ValeVision__SceneEntourageSilhouette` (VV 1.3.1, :418). TV's list (TV :571) lacks the
  `TrueVision__SceneEntourageSilhouette` category that its own ModelLayers config and the Tags SSOT define, so in TV
  "Context Layer off" leaves entourage silhouettes in the picture: **back-port to TV** (F08).
- **[Verifier addition] Render3d section save/restore** through VV's own Cross Sections tool:
  `Na__CrossSection__SerializeSections` / `ApplySerializedSections` (VV :570, :607, imported from
  `41__System__CrossSectionView` at VV :162) where TV calls `Na__SectSerialize__Serialize` / `Apply` from
  `41__System__SectionCutEngine/Na__SectionCut__Serialize__.js` (TV :213, :1008, :1050). Same data by TD06, different
  engine (DIV-2). This is a seventh seam the survey's list missed; see V03 for routing all three section calls
  through the adapter in both apps.
- **[Verifier addition] The phase hunks touch DIV-1 caches.** TV `Na__LeSnap__InvalidateSceneCaches` (called by
  EnterPhase/ExitPhase) calls `Na__DrawProfile__InvalidateSceneCache` from TV-only `40/Na__DrawView__ProfileLines__.js`
  plus `pipeline.invalidateProfileLinesCache()`. A VV replay of the 1.6.0 phase hunks must call VV's own profile-line
  cache reset (composer / `40__System__2dElevationsView` profile lines) instead - or a no-op while Model Source is
  dormant - never import ProfileLines.

**What VV lacks** (TV log entries newer than VV's port point):
- 1.6.0 (v2.32.0) design phases: `GetModelRoot(modelSourceId)` (TV :434), `PhaseFingerprints` (:468),
  `OnPhaseChanged` (:491), `EnterPhase` / `ExitPhase` (:771, :805), `MoveChild`, `InvalidateSceneCaches`, the
  `PHASE_HOLD` render-loop pause, and a `modelSourceId` argument to Render2d and Render3d.
- 1.7.0 / 1.7.1 (v2.42.0, v2.48.1) door pose: `Na__PlDoors__Apply(root, definition.DoorPose, definition.Cut)` before
  the cut and `Na__PlDoors__Restore` in the finally (TV :897).
- 1.12.0 (v2.94.0) depth fog: an 11th Render2d argument `depthFog`; `Na__ElevFog__SetSource` borrowed for the render
  (TV :882); `renderFrame : fogLayer ? Na__ElevFog__RenderLayerFrame : RenderPreset__RenderFrame` (TV :936); Enhance
  skipped for a fog image (TV :942).
- 1.12.1 (v2.105.0) storey doors: the drawing's cut handed to `Na__PlDoors__Apply`.
- v2.93.0 Enhance strength: `Na__LeEnhance__Apply(canvas, weights.enhancePct)` on both paths (TV :942, :1034).
- Commit `6076ec10` (21-Sep, unlogged in this module): nested LineworkModifier rules - `ModifierRuleFor` (TV :617),
  cached per-tag cloned materials (`ModifierMaterial`), hidden detail nodes - inside `SetModelEdgeWidth`, plus the
  exports `SetModelEdgeWidth` / `RestoreModelEdgeWidth`. These cannot be copied: VV's tiled exporter rewrites every
  linework width from `Na__LineworkSettings` at render start, so VV needs the rule list expressed through
  `Na__LineworkSettings` (decision D-S04a-08).

**The signature trap (F06).** The two apps' render entry points no longer take the same positional arguments:

| Function | TV | VV |
|---|---|---|
| `Na__LeSnap__Render2d` | `(definition, windowMm, styles, w, h, modelLayers, samples, weights, modelSourceId, stillWanted, depthFog)` TV :863 | `(definition, windowMm, styles, w, h, modelLayers, samples, weights, stillWanted)` VV :469 |
| `Na__LeSnap__Render3d` | `(sceneRecord, styles, w, h, modelLayers, samples, weights, modelSourceId, viewWindow, stillWanted)` TV :991 | `(sceneRecord, styles, w, h, modelLayers, samples, weights, viewWindow, stillWanted)` VV :555 |
| `Na__LeVp2d__EnsureLinework` | `(definition, onPhase, force, modelSource, waited)` TV Linework :132 | `(definition, onPhase, force)` VV Linework :113 |
| `Na__LeSnap__GetModelFingerprint` / `GetPipelineFingerprint` / `GetModelRoot` | take `modelSourceId` | take nothing |
| `Na__LeVp2d__Describe` | returns `{ source, definition, window, modelSource }` | returns `{ source, definition, window }` |

A TV caller pasted into VV (Viewport3d `RenderNow` passes `..., weights, renderId, view, stillWanted`) would hand VV
`viewWindow = null` and `stillWanted = view` - a zoomed 3D viewport would silently render its whole picture, with no
error. Callers outside this slice are affected too: TV `LE/60/PdfExporter__.js:428` and
`LE/65/Publish__Viewports__.js:316` pass `described.modelSource` to EnsureLinework. Recommendation: give VV the TV
signatures now (null/undefined in the new slots), whatever is decided about Model Source; the VV ledger row for
the viewport cache already records "stillWanted ninth here, tenth there" as a divergence.

**[Verifier correction] Describe must NOT return `modelSource : null`.** TV code dereferences
`described.modelSource.renderId` / `.status` with no guard in at least eight places (TV Viewport2d :343-:354, :442,
:530, :593, :618; Frame :314, :387, :430). Until ModelSource exists in VV, VV's `Describe` should return a stub with
the Resolve shape - `{ groupId : null, label : '', storedId : null, explicit : false, missing : false, isLive : true,
renderId : null, status : 'live' }` - so a pasted TV hunk cannot throw. The complete VV caller list for the
signature change was re-checked: Viewport2d, Frame, Linework, Viewport3d, SnapshotRenderer and PdfExporter :213 are
the only VV files that call Render2d / Render3d / EnsureLinework / GetModelRoot / Get*Fingerprint.

### b.4 Viewport 2D units (Viewport2d, Frame, Window, Linework, DepthFog, SitePlan)

The 15-Sep split (VV v2.47.0 first, TV v2.55.0 second) gives both apps the same units, so a port is file for
file. Since the split TV has added:

- **Window** (TV 1.2.0 vs VV 1.0.0): 1.1.0 (v2.138.0) rotation - `ToFrame`, `FrameToPaper`, `RotationDeg`, and
  `ToPaper`/`FromPaper` carrying the turn (TV :112); 1.2.0 (v2.140.0) Hide swings - `PoseFor`, `SwingExcludeTokens`;
  the door pose (`Na__LeDoors__PoseFor`, `ShutPoseFor`, v2.42.0 / v2.48.1) and `modelSource` in `Describe`
  (TV :144). VV `Describe` (VV :97) calls `Na__PlView__FromPlan(plan, override, exclude)` with three arguments; TV
  passes a fourth `doorPose`, which VV's `M/50/Na__ProjectedLinework__ViewDefinition__.js:314/:340` does not accept.
- **Frame** (TV 1.4.0 vs VV 1.1.0): 1.2.0 (v2.94.0) the fog image layer made between linework and markup
  (`PlaceFog`, `ClearFog`, `RenderFog`, `ScheduleFog`, TV :345-:417); 1.3.0 (v2.107.0) Draft drops scheduled renders;
  1.4.0 (v2.140.0) `Na__LeDoors__RasterLayers`; `RasterWeights` carries `enhancePct` (v2.93.0) and `modifiers`
  (commit `6076ec10`); `RasterModifiers` / `RasterModifierToken` (TV :189, :223) - unlogged in the module's log.
- **Linework** (TV 1.2.0 vs VV 1.1.0): 1.2.0 `StyleBands` drops an owner switched off in Model Layers per owner id
  (needed for nested LineworkModifier owners, SSOT 76-79) and `StyleToken` carries the Model Layers token;
  `EnsureLinework` Model Source; `StyleBands(..., siteRules)` Z-index + greyscale (v2.89.0); `BandPaths` exported.
- **Viewport2d** (TV 1.16.0 vs VV 1.8.0): 1.6.0 Model Source, 1.7.0 / 1.8.0 door poses, 1.9.0 site plan
  viewports, 1.12.0 fog (`RenderFogForExport`, TV :613), 1.13.0 Draft (`MarkRasterOnly`, TV :307), 1.14.0 rotation
  key in `GetSnapSource` (TV :475), 1.15.0 Hide swings (`RasterLayers` at all five Render2d call sites), 1.16.0
  legend exports (`SitePlanLegend`, `SitePlanStoreId`); the raster-modifier token in the underlay key.
- **DepthFog unit** (TV-only, 1.0.0, v2.94.0, 145 lines): `Na__LeVp2d__FogFor(viewport, described)` (TV :106) reads
  `Na__ElevData__GetDepthFog` / `GetDepthFogPlane` from `M/45__System__ElevationViews` (VV `M/46`) and
  `Na__ElevFogCfg__*` / `Na__ElevFogMath__Token` from TV-only `M/49__System__ElevationDepthFog`. Note: VV's
  `M/29__System__FogPlaneSystem` (VV-only) is a different thing - a two-plane post-process fog for the 3D view - and
  is not a substitute.
- **SitePlan unit** (TV-only, 1.2.0, 633 lines): site plan viewport painting; see b.8.

All TV-only branches in these units are **inert without their data** (no `Viewport__SitePlan`, no fog record, no
closed doors, `RotationDeg` 0, no design phases, Draft off). That is what makes "take TV's file whole, re-apply
VV's header and folder numbers" (port_whole_reapply_vv) the right action for Window, Frame, Linework, Viewport2d and
Viewport3d - provided the modules they import exist in VV first (the enabling leaves of WP-S04a-01). The only VV
code seam in these five files is the folder numbering (`40__` -> `42__`, `42__` -> `43__`, `45__` -> `46__`, etc.)
and the console prefix.

**[Verifier correction - V01] The enabling leaves of WP-01 are NOT enough for any of these whole-file takes.** A
whole-file take is all-or-nothing: an ES module that imports a missing file or name fails, and because VV's
`LE/01__Core__Loader` reaches the editor through `import()` of ModeController, Viewport3d and PdfExporter, one
missing import stops the whole Layout Editor loading. The verifier resolved every relative import of every TV file
in this slice against VV (folder numbers mapped, exported names checked; script `parity/verify_s04a/imports.py`).
What each TV file needs that VV does not have today:

| TV file (HEAD) | Imports VV lacks (file missing, or name missing) |
|---|---|
| Viewport2d 1.16.0 | ModelSource, DraftMode__State, PlanDoors, SitePlan Store, Viewport2d__DepthFog, Viewport2d__SitePlan; SheetModel `IsSitePlanViewport`; Frame `RasterModifierToken`/`PlaceFog`/`ClearFog`/`RenderFog`/`ScheduleFog` |
| Viewport2d__Frame 1.4.0 | DraftMode__State, PlanDoors, Viewport2d__DepthFog; folder-50 ConfigAccess `Na__PlCfg__GetLineworkModifiers` |
| Viewport2d__Linework 1.2.0 | ModelSource (which pulls Store + Viewport2d__SitePlan: an import cycle Linework -> ModelSource -> SitePlan painter -> Linework) |
| Viewport2d__Window 1.2.0 | ModelSource, PlanDoors, ViewportRotation |
| Viewport3d 1.8.1 | ModelSource, DraftMode__State |
| ViewportIdentity 1.1.0 | ModelSource, M/26 PhaseLibrary; SheetModel `IsSitePlanViewport`; VV 43 FpData `STOREY_CHANGED_EVENT`, `GetStoreyLevel` |
| EdgeStyles 1.1.0 | SitePlan Store |
| ModelLayers 1.4.0 | SitePlan Store |
| Viewport3dZoom, ViewportClipboard, ViewportHandles | ViewportRotation only |
| ViewportTitleText, Enhance, RenderComposites | nothing (take whole at any time) |
| ModelSource 1.1.0 (TV-only) | ConfigState `GetModelSourceSetup`, PhaseLibrary, SitePlan Store, Viewport2d__SitePlan |
| PlanDoors 1.3.0 (TV-only) | ConfigState `GetPlanDoorsSetup`, FpData `GetStoreyLevel`, folder-50 DoorPose, ViewportRotation |
| Viewport2d__DepthFog (TV-only) | VV 46 ElevData `GetDepthFog`/`GetDepthFogPlane`, M/49 ConfigState and Maths |
| Viewport2d__SitePlan (TV-only) | SheetModel `IsSitePlanViewport`, Store, EdgeStyles `FillHex`, LE/36 HatchPatterns, SitePlanComposites, Linework `BandPaths` |
| SitePlan Store (TV-only) | TV-only M/80 `Na__CfApi__GetLoadedProjectData`; ProjectLoader `GetProjectFolderFromUrl`/`GetYearFromUrl` (VV has neither); GlbParse |

Consequences for the plan: (1) Viewport2d, Frame, Linework, Window, Viewport3d, ViewportIdentity, EdgeStyles and
ModelLayers can only be taken whole at the END, once Model Source, plan doors, depth fog, the site plan client, Draft
State and the folder-50 / 43 / 46 / 49 / LE-36 pieces from other slices all exist in VV. (2) Until then every feature
WP must replay hunks into these files; "through the whole-file takes" in WP-03/05/06/07/08/10 is not executable
mid-sequence. (3) A verbatim ModelSource drags in the whole site plan client and the hatch slice, so WP-05 must either
use an adapted ModelSource (CategoryKeys without the site plan branch, swapped for the verbatim file when WP-10
lands) or land together with WP-10. See the added convergence package WP-S04a-14.

### b.5 Viewport 3D, zoom, handles, clipboard

- **Viewport3d** (TV 1.8.1 vs VV 1.6.1): VV lacks 1.5.0 Model Source (`FingerprintWhenReady`, TV :232; null
  fingerprint while a phase loads), 1.8.0 Draft (Fill returns before any key), `enhancePct` in the weights object
  (TV RenderNow :422-433), and `Asset__Samples` on the stored snapshot record (TV v2.58.2; TV writes it in RenderNow
  and reads it when re-using a stored picture). VV's own log text "ValeVision only; TrueVision has no per-scene
  lighting" is stale (TV v2.161.0).
- **Viewport3dZoom** (TV 1.1.0 vs VV 1.0.0): `OnWheel` reads the cursor through `Na__LeVpRot__ToFrame` (TV :269) so a
  turned picture zooms about the cursor. One import, one changed line.
- **ViewportHandles** (TV 1.5.0 vs VV 1.4.0, 667 vs 455 lines): rotatable viewports (v2.138.0) - outline and handles
  carried by a transform (`PlaceAt`, TV :208) instead of `left/top` (which the browser rounds before the paper zoom -
  the same fault v2.137.0 fixed for grips and the snap marker); the rotate grip on a stem (`RotateGrip`,
  `OnRotateGrip`, TV :225, :240); `RotateStart` / `RotateTo` (TV :610, :630); hit test in the level frame (TV :404-
  :409); crops and pans in the frame's own axes with `TurnedRect` (TV :471); `CursorFor` turning the arrow.
  **[Verifier correction] Not harmless on its own:** TV Handles' draw routine (TV :327-:347) adds the rotate stem
  and grip to EVERY selected viewport, sized from `Na__LeCfg__GetViewportSetup().rotateGripOffsetPx`, which VV's
  ConfigState does not return today (NaN placement), and the grip does nothing until SheetTools HitResolution,
  PointerPress and PointerDrag call `OnRotateGrip` / `RotateStart` / `RotateTo`. Take Handles in the same step as
  the viewport rotate config (F44) and that SheetTools wiring (F25), never alone. The CSS classes it uses
  (`na-le-grip--rotate`, `--stem`) already exist in VV's Paper stylesheet.
- **ViewportClipboard** (TV 1.4.0 vs VV 1.2.0): 1.3.0 (v2.123.0) `LayerFor` refuses a reference layer
  (`Layer__Selectable === false`, TV :366); 1.4.0 (v2.138.0) a turned viewport pasted at a click lands by the box
  round its turned frame (`Na__LeVpRot__Bounds`, TV :380). TV's PORT NOTE still says "Ported to: ValeVision3D
  (pending)" - stale, VV has had it since v2.35.0.

### b.6 Viewport rotation (TV v2.138.0) as a feature

`Na__LayoutEditor__ViewportRotation__.js` (TV-only, 313 lines, 1.0.0) is a **pure leaf with no imports**
(`Na__LeVpRot__FIELD = 'Viewport__RotationDeg'`, `WrapDeg`, `Deg`, `IsTurned`, `Settle`, `TurnVector`, `Centre`,
`ToPaper`, `ToFrame`, `Corners`, `Bounds`, `Contains`, `DistanceTo`, `CssRotate`, `PdfTurn`). Porting it alone
changes nothing (every `Deg` reads 0). The feature, however, is wired into **31 TV modules** (grep of
`Na__LeVpRot__|Viewport__RotationDeg|ViewportRotation__`): in this slice Window, Viewport2d, Viewport3dZoom,
ViewportClipboard, ViewportHandles, PlanDoors; elsewhere AppConfig, SheetModel__Viewports, SheetRecords,
SheetChrome, SheetSurface, Groups, MarkupBridge, ObjectSnap GridMoves/Index/Search/ViewportSnapMove, Eyedropper,
SelectionBox, SelectionSet, SheetTools__ContextMenu, VectorTools__Targets, Panel__ViewportSettings,
ScrapbookParametric LinkNoodle/ViewportLink, ScrapbookSpecification, FloorAreas, PdfExporter, Publish__Viewports,
`M/52__System__Layout__PublishedDocuments/Na__PubDoc__Viewports__.js` and the TV service worker. Config:
`LayoutEditor__Viewport__RotateStepDeg` 90, `RotateDetentDeg` 2, `RotateGripOffsetPx` 22, `RotateNote`; VV's
ConfigState has rotate keys only for text (`ConfigState__ToolSetup__.js:79`), not for viewports
(TV `ConfigState__SheetSetup__.js:342`). Record: `Viewport__RotationDeg`, written only while turned (absent = level).
Test: `80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs` (52 checks; loads ObjectSnap
Geometry/Index, SheetChrome, Window, ViewportHandles, ViewportRotation).

**[Verifier correction]** The grep gives 32 files including the leaf (31 consumers), but SheetTools
`HitResolution`, `PointerPress` and `PointerDrag` also carry the feature through Handles' `OnRotateGrip`,
`RotateStart` and `RotateTo` (TV HitResolution :201/:535, PointerPress :345, PointerDrag :665): 34 consumers in all.
Of the 31 grep hits, nine live in files VV does not have (ObjectSnap GridMoves/Index/Search/ViewportSnapMove,
VectorTools__Targets, ScrapbookSpecification, FloorAreas, Publish__Viewports, `M/52` PubDoc Viewports, the TV
service worker) plus the new PlanDoors; they arrive with those features. The VV files to wire now are: AppConfig,
ConfigState__SheetSetup, SheetModel__Viewports, SheetRecords, SheetChrome, SheetSurface, Groups, MarkupBridge,
Viewport2d, Window, Viewport3dZoom, ViewportClipboard, ViewportHandles, Eyedropper, SelectionBox, SelectionSet,
SheetTools ContextMenu / HitResolution / PointerPress / PointerDrag, Panel__ViewportSettings,
ScrapbookParametric LinkNoodle and ViewportLink, PdfExporter, and VV-only `LE/30/Na__LayoutEditor__Snapping__.js`.
ViewportRotation and VectorQuality both carry the TV PORT NOTE "ValeVision: not yet ported - it waits for Adam's
sign-off" (see D-S04a-10).

### b.7 Render styles (EdgeStyles, Enhance, ModelLayers, RenderComposites)

- **Enhance** (TV 1.1.0 vs VV 1.0.0, v2.93.0): `Apply(canvas, strengthPercent)` interpolates levels and sharpen from
  no-op to full (TV :125); 0 skips both passes; sharpen never called with opacity 0 (the `|| 1.0` trap in the export
  effect). Self-contained; port verbatim. VV's file is LF - write it back CRLF.
- **RenderComposites** (TV 1.3.0 vs VV 1.1.0) and config (TV Meta 1.4.0 vs VV 1.2.0): 1.2.0 a third weight kind
  `percent` (Enhance Whitecard `Strength`, default 100, 0-100 step 5) that joins `RasterToken` (TV :295); 1.3.0 a
  `depthFog` row first in the inventory (toggle, no weight). VV FALLBACK (VV :103) has neither. The Render
  Composites panel (`LE/40/Panel__Styles__.js`, TV 1.7.0 vs VV 1.6.1) must learn the `%` suffix.
- **EdgeStyles** (TV 1.1.0 vs VV 1.0.0) and config (TV Meta 1.2.0 vs VV 1.0.0): 1.1.0 (v2.49.0) site plan defaults
  from the store (`SitePlanDefault`, TV :365; `AliasForHex`, TV :347) and the accent colours red, green, blue; later,
  unlogged in the module: `new-planting-green` and `dark-blue` (config), `Weight__Max` 10.00 (v2.89.0; code fallback
  6.00), the per-layer dash scale `dashScale` / `Category__LineTypeScale` (v2.89.0 P4c for site plans; commit
  `55014c6a` 29-Sep made it a per-viewport override for ANY dashed category) and per-viewport fill overrides
  `Category__FillHex` (`FillHex`, TV :424; commit `55014c6a`). **The Line scale override is not site-plan-only**:
  TV `Panel__ModelLayers__.js:180,223,293` offers it on every dashed row and TV
  `SheetRecords__.js:543-558` keeps it for every key; only FillHex is restricted to the site plan prefix
  (TV SheetRecords :559).
- **ModelLayers** (TV 1.4.0 vs VV 1.1.0) and config (TV Meta 1.2.0 vs VV 1.1.1): 1.2.0 `Groups(categoryKeys)` for a
  design phase; 1.3.0 site plan layers grouped ahead of model groups; 1.4.0 `Group__AlwaysShow` (the
  linework-modifiers group, SSOT 76-79); unlogged `StoreyEquivalentKey` (TV :218) - a `Storey__<Storey>__<Element>`
  category wears the whole-model row's style (found 20-Sep). The config adds a `linework-modifiers` group
  (`TrueVision__LineworkModifier__FineDetail` 0.5 dark-grey, `__VeryFineDetail` 0.25 mid-grey) and
  `Fallback__StoreyElementPrefix`. VV's config must keep its own `ValeVision__` keys, its coarse
  Existing/Proposed rows (10 and 5 tags) and its `legacy` group (VV-only, deliberate).

### b.8 Site plans - what TV's feature comprises

Built across TV v2.48.0 (14-Sep) to v2.164.0 (29-Sep), with unlogged additions on 29-Sep (`55014c6a`). Three
repositories (TV app, ProjectVision build/sync, SketchUp Plugins GLB Builder) and the shared Tags SSOT.

| Piece | TV location | Notes |
|---|---|---|
| Drawing type | `Sheet__DrawingType` stored only as `'siteplan'` (SP07); Sheet panel first row "Architectural Drawing / Site Plan Drawing" | LE/07 SheetRecords/SheetModel, LE/40 Panel__Sheet |
| Tab grouping | **[Verifier correction]** SP08's `3D Model \| architectural \| + \| site plans \| Project Specification` strip is gone: TV v2.158.0 (TabStrip 2.0.0) made the strip five tabs (3D Model \| Drawings \| Specification \| Document Register \| Design Statements). Site plans are now rows of the Drawings menu, in the register's order (SheetModel `TabGroup` / `NextOrder` still group them), with the class `na-le-tabs__menu-row--siteplan` and the hover "Site plan drawing" (TV TabStrip :476-:481). VV's strip is still one tab per sheet (TV devlog v2.158.0: "NOT in ValeVision") | LE/05 TabStrip 2.0.0 (S03a slice), SheetModel `IsSitePlanSheet`, `TabGroup` |
| Store | `LE/21/Na__SitePlan__Store__.js` 1.2.0 (802 lines): two stores (`existing`, `proposed`; legacy `SitePlan__DrawingData` read as proposed), store-qualified keys (`<stem>@existing`), project data keys `SitePlan__DataStores` / `SitePlan__DataStore`, manifest `TrueVision__SitePlanData__Manifest__.json` schema 1, Z-index derivation, face-only fill layers | Reads `Na__CfApi__GetLoadedProjectData` (TV-only `M/80__CloudflareIntegration`) and `Na__AppUtils__IsRunningOnLocalhost / GetProjectFolderFromUrl / GetYearFromUrl`; CDN base `https://cdn.noble-architecture.com/NaProjectPortal`, repo dir `na-project-portal`, content dir `30__TrueVision__AppContent` (Store :118-:120, URL builders `FolderUrls` :267, `Candidates` :290, `ProjectDataBlocks` :455) |
| GLB parser | `LE/21/Na__SitePlan__GlbParse__.js` 1.0.0 (366 lines), **no imports**; LINES + COLOR_0 and LINE_LOOP rings -> drawing mm (X x 1000, +Z x 1000) | Node-testable |
| Painter | `LE/20/Viewport2d__SitePlan__.js` 1.2.0: three decks (fills -> patterns -> linework), store id per viewport, legend (`SitePlanLegend`), window culling | Imports Store, HatchPatterns (`LE/36`), SitePlanComposites, EdgeStyles `FillHex`, Owners |
| Composites | `LE/25/SitePlanComposites__.js` 1.0.0 + config: block / location plan (`SitePlan__PlanType`, auto by 1:500 boundary), deck switches (`SitePlan__Composites`), location plan rule (proposal fills only, Rec. 709 greyscale, boundary ink kept by tag pattern `^\d{2}__SitePlan__Boundary__`) | Imports ScaleManager `Coerce` only |
| Panel | `LE/40/Panel__SitePlanComposites__.js` 1.0.0: left column after Render Composites, hidden off a site plan sheet | ModeController registers it |
| Scales | `LayoutEditor__Scales__SitePlanScaleDenominators` [100, 200, 500, 1250, 2500, 5000], default 500 | LE/07 ScaleManager `IsListed` |
| Styles | EdgeStyles site defaults, accents, dash scale, weight max 10, fill overrides; ModelLayers site groups | b.7 |
| Hatches | `LE/36__System__HatchPatternTools` (HatchPatterns, Panel__Patterns, CSS) + app-root `52__LayoutEditor__HatchPatternLibrary/05__SitePlanHatches` (Grassland, Gravel, MixedWoodland, PondsAndLakes, RoughGrassland) | other slice |
| Furniture | Scrapbook items (Mapping Data Credentials with `{OsLicenceNumber}`, North Point; TV v2.53.0), Parametric site legend (v2.164.0) | NA-specific content (OS licence) |
| PDF / publish / viewer | PdfExporter `SitePlanDrawing`, Publish__Viewports, WebViewer splits site plan sheets after the plus | other slices |
| Data pipeline | GLB Builder Site Plan Export (Plugins), ProjectVision build `discover_truevision_siteplan_stores`, R2 sync of `SitePlan__DrawingData__{Existing,Proposed}` | outside the app root |

What VV has: nothing of it. VV's ScaleManager, WebViewer, TabStrip, Scrapbook and Parametric engine are recorded
as "adapted: one drawing type" (ledger lines 78, 79, 1166, 1181, 1184). TV marks every site plan file "Back-port :
goes to ValeVision3D with the site plan feature, if that is ever ported" (Viewport2d__SitePlan :47,
SitePlanComposites :45, Panel__SitePlanComposites :40); TV's composites plan section 3.5 says any VV port is "a
surgical merge of the non-site-plan parts only", and its ledger row P10 "Adam's sign-off, then offer the
ValeVision port" is not started. TV `TrueVision__PLAN__SitePlanDrawings__.md` row 7 "ValeVision question - asked
14-Sep-2026" is still open. **[Verifier addition]** TV's composites plan 3.5 goes further: a whole-file copy of
Viewport2d__SitePlan, EdgeStyles, SheetRecords or ScaleManager "would import `Na__SpStore__*` symbols that do not
exist there and fail `Na__Verify__Exports__.mjs` immediately", so "any port to ValeVision is a surgical merge of the
non-site-plan parts only". D-S04a-01 option B overrides that standing guidance on purpose (it brings the Store in,
dormant); the decision text must say so.

**Why it matters for parity even if VV never draws a site plan**: the site plan code is woven through the shared
modules - Viewport2d, Linework, EdgeStyles, ModelLayers, ModelSource, ViewportIdentity in this slice; SheetRecords,
SheetModel (Sheets, Viewports), TabStrip, ScaleManager, Panel__Sheet, Panel__ViewportSettings, Panel__ModelLayers,
PdfExporter, Publish__Viewports, WebViewer, Scrapbook, ScrapbookParametric elsewhere (27 TV modules import a site
plan API). While VV has none of it, every one of those 27 files stays permanently "adapted" and every future TV
change to them must be hand-merged. **Recommendation (D-S04a-01): port the client side dormant** - the modules
verbatim, a VV transport adapter in the Store's three URL functions, VV stems, a VV config flag that hides the
Drawing Type row until Vale has a site plan pipeline - and decide the Vale data pipeline separately (D-S04a-03).

VV-specific facts that shape the adaptation:
- VV's project assets are `https://cdn.noble-architecture.com/VaApps/Projects/...` (VV `ProjectLoader.js:92`), with
  a master index and a build-version `?v=` token (`Na__AppUtils__WithBuildToken`, :251) instead of TV's export-time
  `?v=`; per-project local folders are `WCP/Projects/{year}/{folderId}/` (e.g. `2026/3047__Doous` holds
  `LayoutEditor/Linework`, `LayoutEditor/Snapshots`, `project.json`); WCP `server.py` serves `/Whitecardopedia/<path>`
  and a catch-all from the app root (:899, :956).
- VV has **no synchronous accessor for the loaded project.json** (no `Na__CfApi__GetLoadedProjectData` equivalent;
  VV's `Na__DrawData__GetBlock` holds only the drawings block). **[Verifier correction]** None is needed: TV's only
  caller, `ProjectDataBlocks()`, runs inside the async `Na__SpStore__Find` (TV Store :455, :505), and VV's
  `Na__AppUtils__FetchProjectJson(projectCode)` is memoised (ProjectLoader :372-:375, R2 first, GH Pages fallback,
  `/api/projects/<code>` on localhost) and is already re-called that way by GridLineSystem, FogPlaneSystem and
  2dElevationsView. The VV adapter can `await` it; no LoadingSequence change.
- **[Verifier correction]** `Na__AppUtils__WithBuildToken` (ProjectLoader :251) is a private helper, NOT exported;
  `Na__AppUtils__ResolveAssetUrl` (:464) returns a `{ primary, fallback }` pair (R2, then GH Pages) without the token.
  VV also has no `GetProjectFolderFromUrl` / `GetYearFromUrl` (TV Store :99-:101): VV names a project by
  `GetProjectCodeFromUrl` + `NormalizeProjectFolderId`, whose folderId already carries the year
  (`2026/3047__Doous`). The adapter therefore needs WithBuildToken exported (a ProjectLoader edit) or its own token
  logic, and must try `primary` then `fallback`.
- VV category keys are `ValeVision__` (e.g. `ValeVision__Linetype__DoorSwings`), while the shared Tags SSOT's
  `SitePlan__ExportFileNameStem` values are `TrueVision__SitePlan__...` (**39** entries by a JSON walk of the live
  SSOT - the survey's 42 was a miscount). The stem prefix is hard-coded in **four** places in TV's editor, not three:
  SheetRecords :434 `SITEPLAN_CATEGORY_PREFIX`, EdgeStyles :98 `SITEPLAN_PREFIX`, Store :124 `RED_LINE_STEM`, and the
  TV-only `LE/57/Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js` :133-:137 (a list of five
  `TrueVision__SitePlan__` keys) (D-S04a-03).
- **[Verifier addition - V04] Vale models already arrive with `TrueVision__` stems and VV renames them at load.**
  Doous's project.json lists `Doous__TrueVision__MainBuildingModel__ProposedWalls__LineworkModel__.glb` and twelve
  more `TrueVision__` GLBs (built by "TrueVision3D GLB Builder Linework v1.5.0"), and VV's
  `15__ModelLoader/Na__ModelLoader__MultiModel.js` `ParseModelUrl` rewrites any namespace to `ValeVision__${category}`
  (:175; the regex at :145 accepts `ValeVision|NaModel|TrueVision`). So the exporter needs no Vale variant for stems: the VV Store adapter can apply the same rule to each
  manifest `Layer__Stem` (`TrueVision__SitePlan__X` -> `ValeVision__SitePlan__X`), and VV's four prefix constants
  become `ValeVision__SitePlan__`.
- NA-specific content needing a Vale version or a decision: the OS licence number in the Scrapbook credentials, the
  `SitePlanNoData` label naming `30__TrueVision__AppContent`, the NA CDN prefix. The hatch pack (OS symbology) is
  brand-neutral.

### b.9 Model Source (TV v2.32.0)

`LE/20/Na__LayoutEditor__ModelSource__.js` (TV-only, 305 lines, 1.1.0, **no PORT NOTE block**) resolves
`Viewport__ModelSourceId` (null = Project Default) against `M/26__System__ToggleModelElements/
Na__ModelGroup__PhaseLibrary__.js` (TV-only). `renderId` is null for the live phase, so a viewport of the live
phase takes exactly the old path. The Viewport panel's Model Source row and the context menu's Model items are
**hidden on a project with one model** (`HasChoices()` = groups > 1; TV `Panel__ViewportSettings__.js:651-668`,
`ModelSource__.js` MenuItems returns `[]`). So on a single-model project TV shows exactly what VV shows today.

The cost of leaving it out: Viewport2d, Frame, Linework, Window, Viewport3d, SnapshotRenderer, ModelLayers and
ViewportIdentity all carry "less its design phase lines" divergences, and the signature trap of b.3 exists only
because of it. The PhaseLibrary would import cleanly in VV (VV's `15__ModelLoader/Na__ModelLoader__MultiModel.js`
exports `LoadAllModels`, `SeparateOrbitCubeUrl`, `ClassifyUrls`, `Na__ModelCategories__LoadOrder`; VV's render loop
has `Pause`/`Resume`), and TV already handles a project with no model groups (Resolve: "groupId ... null on a project
with no model groups"). Missing in VV for the dormant path: `Na__ModelToggle__BorrowRegistry` / `RestoreRegistry`,
a section-engine model-root hook (TV imports `Na__SectionCut__SetModelRoot` straight from its 41 engine - a DIV-2
leak; VV should take it through `Na__DrawView__SectionAdapter__`), the Pipeline's optional `modelRoot` /
fingerprint arguments (VV `Pipeline__.js:321, :593`), the record key in SheetRecords/SheetModel, and the config
block `LayoutEditor__ModelSource__Config` (MaxCachedPhases 3) + 9 labels. VV `MaterialPreset__SetModelRoot` already
exists (VV `42/Na__DrawView__MaterialPreset__.js:299`). ModelSource 1.1.0 imports the site plan store and painter
(`CategoryKeys` answers a site plan viewport's layers), so a verbatim ModelSource also needs the site plan modules
present (dormant), or an adapted copy.

Vale context: Vale schemes are separate project folders (`3038__Gordon__Scheme-03` / `-04`,
`55164__Quinn__Scheme-02`, `57994__Harris__Scheme-02`), one model each. A Vale "Model Source" that offers sibling
scheme projects as phases is conceivable but is new design, not parity. **Recommendation (D-S04a-02): dormant
port** (PhaseLibrary verbatim, registering no groups), which removes every "less its design phase lines" seam while
the UI stays exactly as today.

**[Verifier corrections]**
- A dormant port needs NO LoadingSequence change. Checked in TV: `Na__PhaseLib__IsLive(null)` is true (PhaseLibrary
  :450-:453), so `Resolve().renderId` is null for every viewport; `Na__LeSource__WaitFor(null)` resolves true at once
  (ModelSource :166-:168); `StatusText` answers '' without a renderId; every `.status` reader is behind a renderId
  guard. TV's LoadingSequence calls (`Initialize` :714, `SetGroups` :759, `SetLive` :1007/:1024) and TV-only
  `Na__UiFeature__ModelGroupSelector` exist only to register real groups; VV can skip them until it has groups.
- The section-engine hook is not free in VV: VV's Cross Sections tool sets its model root only in
  `Na__CrossSection__Initialize` (VV `41/Na__CrossSectionView__SystemLogic.js` :1648) and exports no setter, so
  `Na__DrawView__SectionAdapter__SetModelRoot` in VV is either a no-op while dormant or a new export in VV's live
  section tool (owned by the DIV-2 / S02a slice).
- The benefit of B is coupled to D-S04a-01. ModelSource 1.1.0 imports the site plan Store and painter, and
  Viewport2d, Linework, Identity, EdgeStyles and ModelLayers import site plan modules too, so if site plans stay
  excluded (D-S04a-01 = C) those files stay hand-merged whatever happens to Model Source, and ModelSource itself must
  be the adapted copy.

### b.10 Plan doors and Hide swings (TV v2.42.0, v2.48.1, v2.105.0, v2.138.0, v2.140.0)

`LE/20/Na__LayoutEditor__PlanDoors__.js` (TV-only, 459 lines, 1.3.0): every door on a 2D plan stands open
(`Viewport__ClosedDoors` lists the closed ones by ADR or ADR::MOD), elevations and sections draw doors shut, a click
on a door in the selected plan viewport toggles it after the double-click window, the context menu leads with Close
door / Open door / Open all doors, and Hide swings (`Viewport__HideSwings`, default from the plan's storey:
`HideSwingsOnStoreys ["roof"]`) removes arcs and the `...__Linetype__DoorSwings` category from vectors and the base
image. Dependencies (all absent in VV): `M/50/Na__ProjectedLinework__DoorPose__.js` and `__Storeys__.js`,
DoorPose/Storey hooks in Projector, Pipeline (AppendSwings), StageSampler and ViewDefinition (4th `doorPose`
argument); the door module's TV 1.9.0 API (`ComputePanelLocalPose`, `ApplyPanelTransform`, `DescribeDoors`;
VV `M/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` is 1.7.1 and
already speaks the same ADR / MOD / ROT naming, so the ledger's "same contract first" condition is met at the
naming level) and `Na__DoorAnimation__FindDoorGroups.js` (TV-only); `Na__FpData__GetStoreyLevel` (TV v2.87.0);
SheetTools HitResolution / PointerPress / ContextMenu; Panel__ViewportSettings Doors row; SheetRecords / SheetModel
keys; config `LayoutEditor__PlanDoors__Config` (OpenOnPlans, ShutOnElevations, DrawSwings, SwingStepDegrees,
ClickToToggle, ClickDelayMs, HideSwingsOnStoreys, SwingCategoryKeys) and 10 labels. VV adaptation:
`SwingCategoryKeys ["ValeVision__Linetype__DoorSwings"]` (the key VV's ModelLayers config already defines). VV has
no storey system (VV port plan: "ValeVision has no storey system; MeasureStoreys ... returns an empty list"), so
the storey-driven behaviours (roof plan hides swings by default, one storey per plan) are inert in VV - port them
as they are. Test: `Na__Test__HideSwings__.test.mjs` (47 checks), `Na__Test__StoreyBand__.test.mjs`.
**[Verifier correction]** "VV has no storey system" is too strong. VV has the 3D storey system
(`26__System__ToggleModelElements/3dObject__ViewBuildingStoreys__SystemLogic__.js`, `Na__StoreySystem__DetectStoreys`)
and its model loader parses `Storey__<Storey>__<Element>` GLBs "for TrueVision parity" (MultiModel `ParseModelUrl`).
What VV lacks is the drawing side (folder-50 `Storeys__`, 43 FpData `GetStoreyLevel`) and storey-exported Vale
models (Doous has none). The storey rules are inert only while Vale exports stay whole-model; a storey-exported
Vale project would switch them on. The exact door-module names DoorPose needs and VV 1.7.1 lacks:
`Na__DoorAnim__MOD_TYPE_ROT_ONLY`, `MOD_TYPE_FIXED`, `DescribeDoors`, `ComputePanelLocalPose`, `ApplyPanelTransform`,
`GetLiveProgress`, plus `Na__DoorAnimation__FindDoorGroups.js` and folder-50 ConfigAccess `Na__PlCfg__GetStoreySetup`.
TV PlanDoors' own PORT NOTE: "Back-port: PENDING to ValeVision3D, on Adam's sign-off" (:53).

### b.11 Depth fog per drawing (TV v2.94.0)

The fog is the drawing's (Elevation record, Dev Tools > Elevations); the viewport only decides whether to show it
(Render Composites "Depth Fog", default on). On a sheet it is a separate image made between linework and markup,
rendered through Render2d with a fog source and `renderFrame : Na__ElevFog__RenderLayerFrame`. TV's own devlog
says it plainly: "Not in ValeVision. ValeVision keeps its composer running for a drawing, so the two draw calls land
elsewhere there; everything else carries over." Confirmed: VV's `Na__ImageExport__StaticExport__TiledRenderer.js`
(1.4.0) has no `renderFrame` callback route at all (TV's 2.0.0 does, TV :232-:269). VV needs (D-S04a-05) either
TV's callback route added to its tiled renderer and used only by the fog image (recommended - the underlay keeps
the composer route, DIV-1 intact) or a fog-only composer pass. Everything else - the DepthFog unit, the Frame fog
layer, `RenderFogForExport`, the composite row, the `depthFog` style key, `DefaultStyles.DepthFog`, the
`.na-le-frame__fog` CSS rules (TV `Styles__Main__Paper__.css`), the PDF and publish fog images - ports as is once
`M/49__System__ElevationDepthFog` exists in VV.

**[Verifier corrections]** (a) TV's tiled renderer is **2.1.0** (viewWindow, 14-Sep), not 2.0.0; the callback route
arrived in 2.0.0. (b) TV TiledRenderer's own PORT NOTE says "Back-port: the supersampling is worth carrying back;
the callback route is not" - written before the fog image existed. D-S04a-05 (a) knowingly reverses that line and
the decision text must say so. (c) **V03:** the fog image cannot be rendered in VV by porting folder 49 alone:
`M/49/Na__ElevationDepthFog__RenderLayer__.js` imports `Na__SectionCut__RenderDepthInto` from TV's
`41__System__SectionCutEngine` (RenderLayer :105, used at :476 so a section's cut faces read on the plane). VV's
Cross Sections tool and both SectionAdapters export nothing equivalent, so WP-07 also needs a VV DIV-2 route
(adapter `RenderDepthInto` over VV's cap meshes) from the section / depth fog slice.

### b.12 Vector quality (TV v2.136.0)

`LE/20/Na__LayoutEditor__VectorQuality__.js` (TV-only, 240 lines, 1.0.0): the toolbar's Vector control (Low / Medium
/ High) holds 2D frames on their own compositor layer (`body.na-le-vector-hold` -> `.na-le-frame--2d { will-change:
opacity }`, not in the web viewer) while a sheet is redrawn. Imports only ConfigState. Wiring: SheetSurface
(`Ready` on mount, `NoteRedraw` per redrawn frame), Toolbar (select after Raster, change event), the Paper
stylesheet rule, `Na__LeCfg__GetVectorQualitySetup` (ConfigState SheetSetup), `LayoutEditor__VectorQuality__Config`
(DefaultLevel medium, ReleaseAfterMs 1200), labels VectorLabel / VectorLow / VectorMedium / VectorHigh / VectorTitle,
localStorage key `Na__LayoutEditor__VectorLevel`. The same release also made `GetActiveSheet` normalise once per
announcement (SheetModel__Sheets 1.2.0, `Na__Test__SheetsNormaliseOnce__`) - a separate, larger performance win
owned by the SheetData slice. Adam had not confirmed the control at v2.136.0 ("NOT yet confirmed by him").

### b.13 Model-layer hygiene that is not site-plan specific

- Per-viewport **Line scale** (`Category__LineTypeScale`, 0.1-10) on any dashed category and the Model Layers
  Advanced fold's **Line scale** column (TV `Panel__ModelLayers__.js:180`) - unlogged in TV (commit `55014c6a`).
- `StoreyEquivalentKey` (ModelLayers) and `Fallback__StoreyElementPrefix` - harmless in VV (no `Storey__`
  categories today), worth having so a storey-exported Vale model styles correctly.
- Nested LineworkModifier tags (SSOT 76-79): rows in the shared Tags SSOT; TV reads them through
  `M/50/Na__ProjectedLinework__ConfigAccess__.js` `GetLineworkModifiers` (fallback list at :123-:127), AuthoredEdges
  and StageSampler (commit `6076ec10`), and in this slice through Frame `RasterModifiers`, SnapshotRenderer,
  Linework 1.2.0 and ModelLayers 1.4.0. VV folder 50 has none of it (no `GetLineworkModifiers`). **Unverified**:
  whether VV's GLB export writes LineworkModifier nodes under `ValeVision__` names - check one VV linework GLB before
  porting the raster half.
  **[Verifier: partly checked]** Two live Vale linework GLBs were read from the public CDN (Doous ProposedWalls and
  ProposedWindows, `VaApps/Projects/2026/3047__Doous/`, generator "TrueVision3D GLB Builder Linework v1.5.0"): no
  "LineworkModifier" or `76__`-`79__` string anywhere in their JSON chunks, and node names are component names with
  no tag metadata. Today's Vale data therefore carries no modifier tags; the feature would be inert in VV until a
  Vale model is re-exported with a newer builder and 76-79 tags. Note also that the modifier owner keys are
  `TrueVision__LineworkModifier__*` in TV's ConfigAccess fallback (:123-:127) and folder-50 config.
  Commit attribution: Linework 1.2.0 (20-Sep) was committed in `62dade1c` (the v2.95.0 commit), not `6076ec10`;
  both commits carry LineworkModifier work (ConfigAccess, StageSampler, ModelLayers).

---

## (c) Module-by-module table

Paths relative to each app root; TV and VV paths are identical unless stated. "VV" column empty = file absent.

| # | TV path | TV ver | VV path | VV ver | State | What VV lacks or does differently (TV devlog) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| 1 | LE/20/ForceRender__.js | 1.1.0 | same | 1.1.0 | header-only | Nothing in code. TV PORT NOTE :42 "Back-port: PENDING to ValeVision3D" is stale (VV ported 1.1.0 in v2.57.0) | fix_ledger (TV header) | - | - |
| 2 | LE/20/RasterQuality__.js | 1.0.0 | same | 1.0.0 | header-only | One comment separator line (TV :165) | no_action | - | - |
| 3 | LE/20/Viewport2d__.js | 1.16.0 | same | 1.8.0 | drifted (337) | 1.6.0 Model Source (v2.32.0); 1.7.0 plan doors (v2.42.0); 1.8.0 elevation doors shut (v2.48.1); 1.9.0 site plans (v2.49.0); 1.12.0 depth fog + `RenderFogForExport` (v2.94.0); 1.13.0 Draft + `MarkRasterOnly` (v2.107.0); 1.14.0 rotation in snap key (v2.138.0); 1.15.0 `RasterLayers` at 5 call sites (v2.140.0); 1.16.0 legend exports (v2.164.0); raster-modifier token in the underlay key (commit 6076ec10) | port_whole_reapply_vv (only at the end - V01; hunk replay before) | Header, console prefix, folder numbers only | Leaves (WP-01), ModelSource, PlanDoors, DepthFog unit, SitePlan unit + Store, DraftMode State, Frame 1.4.0, SheetModel `IsSitePlanViewport` (verifier added) |
| 4 | LE/20/Viewport2d__Frame__.js | 1.4.0 | same | 1.1.0 | drifted (261) | 1.2.0 fog layer (v2.94.0); 1.3.0 Draft (v2.107.0); 1.4.0 RasterLayers (v2.140.0); `RasterWeights.enhancePct` (v2.93.0); `RasterModifiers`/`RasterModifierToken` (6076ec10); phase fingerprint in ScheduleUnderlay (v2.32.0) | port_whole_reapply_vv | Folder numbers | DraftMode State, PlanDoors, DepthFog unit, EdgeStyles, ModelLayers IsOn, folder-50 `GetLineworkModifiers`, SnapshotRenderer signature |
| 5 | LE/20/Viewport2d__Linework__.js | 1.2.0 | same | 1.1.0 | drifted (123) | 1.2.0 IsOn per owner + Model Layers token in StyleToken (20-Sep, committed in `62dade1c`, the v2.95.0 commit - verifier corrected "v2.98.0 commit"); Model Source in EnsureLinework (v2.32.0); `siteRules` in StyleBands (v2.89.0); BandPaths export (v2.55.0) | port_whole_reapply_vv (only at the end - V01; hunk replay before) | - | ModelSource (whose verbatim copy imports the SitePlan painter, which imports Linework: one cycle, land together), SnapshotRenderer `GetModelRoot(id)`, Pipeline `GetCached(def, fp)` / `RenderDefinition(..., root)` |
| 6 | LE/20/Viewport2d__Window__.js | 1.2.0 | same | 1.0.0 | drifted (93) | 1.1.0 rotation mappings (v2.138.0); 1.2.0 swing pose/tokens (v2.140.0); door pose (v2.42.0/v2.48.1); modelSource in Describe (v2.32.0) | port_whole_reapply_vv | - | ViewportRotation, PlanDoors, ModelSource, folder-50 ViewDefinition 4th arg |
| 7 | LE/20/Viewport3d__.js | 1.8.1 | same | 1.6.1 | drifted (157) | 1.5.0 Model Source (v2.32.0); 1.8.0 Draft (v2.107.0); enhancePct (v2.93.0); `Asset__Samples` write/read (v2.58.2) | port_whole_reapply_vv | Folder numbers; correct the stale "TrueVision has no per-scene lighting" log line | ModelSource, DraftMode State, SnapshotRenderer signature, SheetRecords Asset__Samples |
| 8 | LE/20/Viewport3dZoom__.js | 1.1.0 | same | 1.0.0 | header-only (misclassified) | 1.1.0 rotation-aware OnWheel (v2.138.0), TV :269 | port_verbatim | - | ViewportRotation |
| 9 | LE/20/ViewportClipboard__.js | 1.4.0 | same | 1.2.0 | drifted (43) | 1.3.0 reference layers refused (v2.123.0); 1.4.0 turned paste (v2.138.0). TV PORT NOTE "Ported to ... (pending)" stale | port_verbatim | - | ViewportRotation; reference-layer support (`Layer__Selectable`, Layers slice) |
| 10 | LE/20/ViewportHandles__.js | 1.5.0 | same | 1.4.0 | drifted (274) | 1.5.0 rotate grip, turned hit/drag, `PlaceAt` transform placement, `TurnedRect` (v2.138.0) | port_verbatim (never alone: it draws a rotate grip on every selected viewport - verifier) | - | ViewportRotation; viewport rotate config (`rotateGripOffsetPx` etc. in `GetViewportSetup`); SheetTools HitResolution/PointerPress/PointerDrag wiring in the same step; SheetSurface turned frames |
| 11 | LE/20/ViewportIdentity__.js | 1.1.0 (+v2.86.0 hunk) | same | 1.0.0 | drifted (152) | 1.1.0 storey `level` fact (v2.87.0); typed elevation name `Elevation__NameIsAuto` (v2.86.0); PhaseOf via ModelSource; site plan branch | port_whole_reapply_vv | `PhaseOf` answers none while no groups (dormant library) | ModelSource (dormant), M/26 PhaseLibrary (imported directly), 43 FpData `GetStoreyLevel` + `STOREY_CHANGED_EVENT`, SheetModel `IsSitePlanViewport`. 46 Elevation AutoName is NOT an import (verifier): Identity only reads the record key `Elevation__NameIsAuto`; absent, VV titles read exactly as today |
| 12 | LE/20/ViewportIdentity__Config__.json | - | same | - | header-only (real data) | `Phase` block (`Phase__ExistingLabelContains`), `Words__GenericPlan` | port_verbatim | - | #11 |
| 13 | LE/20/ViewportTitleText__.js | 1.1.0 | same | 1.0.0 | drifted (141) | 1.1.0 level fact, `SaysNoMore`, `SOURCE_*`, Compose `source` (v2.87.0) | port_verbatim | - | Test `Na__Test__ViewportTitleText__` (TV 171 vs VV 134 lines) |
| 14 | LE/20/ModelSource__.js | 1.1.0 | - | - | tv-only | Per-viewport design phase (v2.32.0); site plan CategoryKeys (v2.49.0) | needs_decision (D-S04a-02; recommend dormant port_verbatim) | Phase library registers no groups | PhaseLibrary, SpStore + SitePlan unit (or adapted CategoryKeys), ConfigState `GetModelSourceSetup`, SheetModel `UpdateViewport modelSourceId` |
| 15 | LE/20/PlanDoors__.js | 1.3.0 | - | - | tv-only | Plan doors open / elevations shut / click toggle / Hide swings (v2.42.0, v2.48.1, v2.138.0, v2.140.0) | port_adapted | `SwingCategoryKeys ["ValeVision__Linetype__DoorSwings"]`; storey rules inert | Folder-50 DoorPose + Storeys + Projector/Pipeline/ViewDefinition; door module 1.9.0 + FindDoorGroups; 43 FpData storey; ViewportRotation; config + labels; SheetTools; Panel Doors row |
| 16 | LE/20/VectorQuality__.js | 1.0.0 | - | - | tv-only | Vector Low/Medium/High (v2.136.0) | port_verbatim | - | ConfigState getter, AppConfig block, SheetSurface, Toolbar, Paper CSS, labels |
| 17 | LE/20/Viewport2d__DepthFog__.js | 1.0.0 | - | - | tv-only | Fog per drawing on sheets (v2.94.0) | port_verbatim | Import paths `45__` -> `46__` | `M/49__System__ElevationDepthFog` (ConfigState, Maths), 46 Elevation data `GetDepthFog`/`GetDepthFogPlane` |
| 18 | LE/20/Viewport2d__SitePlan__.js | 1.2.0 | - | - | tv-only | Site plan painter (v2.49.0, v2.55.0 split, v2.101.0 pattern ink, v2.164.0 legend, 55014c6a fill overrides) | needs_decision (D-S04a-01; recommend dormant port_verbatim) | - | Store, HatchPatterns (`LE/36`), SitePlanComposites, EdgeStyles FillHex, SheetModel `IsSitePlanViewport` |
| 19 | LE/20/ViewportRotation__.js | 1.0.0 | - | - | tv-only | Rotatable viewports leaf (v2.138.0) | port_verbatim | - | None (pure leaf) |
| 20 | LE/21/Na__SitePlan__GlbParse__.js | 1.0.0 | - | - | tv-only | Site plan GLB parser (v2.48.0) | port_verbatim (with D-S04a-01) | - | None (pure leaf) |
| 21 | LE/21/Na__SitePlan__Store__.js | 1.2.0 | - | - | tv-only | Two stores, qualified keys, Z-index, face-only fills (v2.48.0, v2.49.0, P9c, v2.132.0) | build_vv_transport + port_adapted | Replace `FolderUrls`/`Candidates`/`ProjectDataBlocks` + constants with VV adapter (VaApps CDN, folderId, WCP local path, build token, project.json accessor); stem prefix per D-S04a-03 | VV project.json accessor; D-S04a-03 |
| 22 | LE/25/EdgeStyles__.js | 1.1.0 (+unlogged) | same | 1.0.0 | drifted (133) | 1.1.0 site plan defaults + accents (v2.49.0); dash scale `Category__LineTypeScale` (v2.89.0, 55014c6a); `FillHex` (55014c6a); fallback weight max 6.00 | port_whole_reapply_vv (needs the Store FILE present - F36/WP-10; until then hunk replay of the non-site-plan parts, as TV's composites plan 3.5 prescribes) | `SITEPLAN_PREFIX` per D-S04a-03 | Store `GetLayers` (dormant), ConfigState `GetLineweightSetup`/`PtToMm` |
| 23 | LE/25/EdgeStyles__Config__.json | Meta 1.2.0 | same | Meta 1.0.0 | header-only (real data) | red, green, new-planting-green, dark-blue, blue; `Weight__Max` 10.00; SsotVersionRead 2.3.0 | port_verbatim | - | #22 |
| 24 | LE/25/Enhance__.js | 1.1.0 | same | 1.0.0 | drifted (98) | 1.1.0 strength percent (v2.93.0) | port_verbatim | Save CRLF (VV copy is LF) | RenderComposites 1.2.0, SnapshotRenderer enhancePct |
| 25 | LE/25/ModelLayers__.js | 1.4.0 (+unlogged) | same | 1.1.0 | drifted (111) | 1.2.0 Groups(categoryKeys) (v2.32.0); 1.3.0 site plan groups (v2.49.0); 1.4.0 Group__AlwaysShow (6076ec10); StoreyEquivalentKey (unlogged) | port_whole_reapply_vv (needs the Store FILE present - F36/WP-10; hunk replay before) | `FALLBACK.stripPrefix 'ValeVision__'`; the '=' exact-token comment example | Store `GetLayers` (dormant; `Groups()` calls it on every build and gets [] with no data) |
| 26 | LE/25/ModelLayers__Config__.json | Meta 1.2.0 | same | Meta 1.1.1 | drifted (141) | `linework-modifiers` group (76-79), `Fallback__StoreyElementPrefix/Note`, SsotVersionRead 2.4.0 | port_adapted (merge) | Keep VV `ValeVision__` keys, coarse rows, `legacy` group; add the new group as `ValeVision__LineworkModifier__*` | VV export naming (verify) |
| 27 | LE/25/RenderComposites__.js | 1.3.0 | same | 1.1.0 | drifted (76) | 1.2.0 `percent` kind (v2.93.0); 1.3.0 `depthFog` row (v2.94.0) | port_verbatim | - | Panel__Styles `%` suffix |
| 28 | LE/25/RenderComposites__Config__.json | Meta 1.4.0 | same | Meta 1.2.0 | header-only (real data) | `depthFog` layer row; Enhance `percent` weight | port_verbatim | Meta notes may name VV's version | #27 |
| 29 | LE/25/SnapshotRenderer__.js | 1.13.0 | same | 1.7.0 | drifted (700) | 1.6.0 phases (v2.32.0); 1.7.0/1.7.1 door pose (v2.42.0/v2.48.1); 1.12.0 fog (v2.94.0); 1.12.1 storey doors (v2.105.0); enhancePct (v2.93.0); LineworkModifier rules (6076ec10) | port_adapted (hunk replay) | Keep every DIV-1 seam (b.3) and the Render3d `Na__CrossSection__SerializeSections`/`ApplySerializedSections` seam; fog via the tiled renderer's callback route; modifiers via LineworkSettings; phase hunks' `InvalidateSceneCaches` to VV's own profile-line caches, never TV's ProfileLines | Signature alignment, PhaseLibrary + ModelToggle Borrow/Restore/`SetCategoryVisibleByKey` (or keep VV's exact-key silent setter) + SectionAdapter SetModelRoot, DoorPose, 49 RenderLayer (which itself needs a VV `RenderDepthInto` route - V03), VV TiledRenderer callback route |
| 30 | LE/25/SitePlanComposites__.js | 1.0.0 | - | - | tv-only | Block / location plan, decks (v2.89.0) | port_verbatim (with D-S04a-01) | - | ScaleManager `Coerce` |
| 31 | LE/25/SitePlanComposites__Config__.json | Meta 1.0.0 | - | - | tv-only | Decks, PlanTypes, LocationPlan rule | port_verbatim | `LocationPlan__ProposalFillMaterialIds` reads the shared Materials SSOT ids - keep | #30 |
| 32 | LE/40/Panel__SitePlanComposites__.js | 1.0.0 | - | - | tv-only | Site Plan Render Composites panel (v2.89.0) | port_verbatim (with D-S04a-01) | - | PanelHost, SheetModel `IsSitePlanSheet`/`IsSitePlanViewport`, ModeController registration |

---

## (d) Wiring notes

**d.1 Hot files outside this slice** (each WP's `hot_files` lists the subset it edits):

| Hot file (both apps unless marked) | Why this slice needs it |
|---|---|
| `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` | Blocks `LayoutEditor__ModelSource__Config`, `LayoutEditor__PlanDoors__Config`, `LayoutEditor__VectorQuality__Config`; `LayoutEditor__Viewport__` RotateStepDeg/RotateDetentDeg/RotateGripOffsetPx/RotateNote and `DefaultStyles.DepthFog`; `LayoutEditor__Scales__SitePlanScaleDenominators` + default; labels (Model Source 9, Doors 10, Vector 5, site plan 19, Drawing Type 3, Patterns 9). Viewport rotation and the Model Layers Fill / Line scale headings have NO AppConfig keys - TV uses in-code fallback strings (`Panel__ViewportSettings__.js:515-528`, `Panel__ModelLayers__.js:177-180`), so they travel with the code |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` (+ `ConfigState__.js` re-exports) | `GetModelSourceSetup`, `GetPlanDoorsSetup`, `GetVectorQualitySetup`, viewport rotate keys, site plan scales, depthFog default |
| `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | Ready chain gains `Na__LeSpComp__Ready()`, `Na__LeHatch__Ready()`; `Na__LePanelSpComp__Register()`; `Na__LeSource__Initialize()`; listener on `Na__PhaseLib__CHANGED_EVENT` (refresh frames + panels) - TV ModeController :343-:380, :533, :1193-:1251 |
| `LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` | Site plan tab grouping (site plans after the plus) |
| `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | `STYLE_KEYS` + `depthFog` (VV :214 lacks it), `Viewport__RotationDeg`, `Viewport__ClosedDoors`, `Viewport__HideSwings`, `Viewport__ModelSourceId`, `Viewport__SitePlan` block (StoreId, PlanType, Composites), `Sheet__DrawingType`, `SITEPLAN_CATEGORY_PREFIX`, `Category__LineTypeScale` (any key) and `Category__FillHex` (site plan keys) in `NormaliseProjectedEdges`, `Asset__Samples` |
| `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js`, `__Sheets__.js`, `__Viewports__.js` | Patch keys `rotationDeg`, `closedDoors`, `hideSwings`, `modelSourceId`, `sitePlan`, `sitePlanStoreId`, `drawingType`; `IsSitePlanSheet`, `IsSitePlanViewport`, `TabGroup`, drawing type constants |
| `LE/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js` | Site plan scale list (`IsListed`), 1:200 in the main list (v2.140.0) |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js` | VectorQuality `Ready` / `NoteRedraw`; turned frames in `RefreshFrames` (TV 1.12.0) |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js` | Turned group (`PushGroup(..., turn)`) for frame line and caption |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css` | `.na-le-frame__fog` rules; `body.na-le-vector-hold` rule (VV links this sheet already in `Na__LeLoad__STYLESHEETS`, Loader :128 - no new link needed) |
| `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js`, `__PointerPress__.js`, `__PointerDrag__.js`, `__ContextMenu__.js` | Rotate grip first in hit order; door click toggle; Rotate 90 / Reset rotation / Model / door menu items |
| `LE/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` | Rotation deg row (-90/+90/Level), Doors row (Open all, Hide swings), Model Source row (hidden on one model), site plan Add flow, store select, Plan type |
| `LE/40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js` (+ `Styles__Panels__.css`) | `percent` weight with `%` suffix (TV 1.7.0); Depth Fog row from config |
| `LE/40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js` | Phase categories (1.2.0), site plan rows (1.3.0), Fill and Line scale columns (55014c6a) |
| `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` | Vector select after Raster |
| `LE/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js` | Drawing Type row (site plans) |
| `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | `SitePlanDrawing`, `RenderFogForExport`, `EnsureLinework(..., described.modelSource)` (TV :410-:441), `PdfTurn` for turned viewports |
| `LE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | Model Source in the bake list |
| `M/50__System__ProjectedLinework/` ViewDefinition, Pipeline, Projector, StageSampler, ConfigAccess, AuthoredEdges, + new DoorPose, Storeys | Door pose arg, model root, swings, modifiers |
| `M/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` | `BorrowRegistry` / `RestoreRegistry` exports (Model Source) |
| `M/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (VV) | `SetModelRoot` seam (DIV-2) for Model Source |
| `M/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` (VV) | Optional `renderFrame` callback route for the fog image (D-S04a-05) |
| `M/05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js` (VV) | Per-tag modifier overrides (D-S04a-08) |
| `M/01__AppCore/Na__AppFlow__LoadingSequence.js` (VV) | **[Verifier correction]** Not needed for this slice: a dormant PhaseLibrary works uninitialised (IsLive(null) true, WaitFor(null) resolves true), and the site plan Store adapter can await the memoised `Na__AppUtils__FetchProjectJson` instead of a loaded-project accessor. Only a real (non-dormant) Model Source would need TV's Initialize / SetGroups / SetLive calls |
| `M/03__AppUtils/Na__AppUtils__ProjectLoader.js` (VV) | [Verifier addition] Export `Na__AppUtils__WithBuildToken` (private today, :251) for the site plan Store adapter, or let the adapter carry its own token rule |
| `M/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js` (VV, the live section tool) | [Verifier addition] A `SetModelRoot` export (model root is set only in Initialize, :1648) if Model Source is ever more than dormant; a `RenderDepthInto` equivalent for the depth fog layer (V03). Both through `42/Na__DrawView__SectionAdapter__.js` |
| Rotation wiring that exists in VV (verifier addition): `LE/15__Core__Markup/Na__LayoutEditor__Groups__.js`, `__MarkupBridge__.js`, `LE/30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js`, `__SelectionBox__.js`, `__SelectionSet__.js`, `LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js`, `__ViewportLink__.js` | Each reads `Na__LeVpRot__*` or `Viewport__RotationDeg` in TV; WP-S04a-03 omitted them |
| `WCP/Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` (outside VV) | [Verifier addition] Where VV's project.json is assembled (`valeVision_ModelUrls`, :836/:886): the VV counterpart of TV's `05__ProjectVision__CoreAppCode/ProjectVision__BuildScript__.py` `discover_truevision_siteplan_stores` (:564, writes `SitePlan__DataStores` at :618) |
| `VV/index.html` | None for this slice if everything lands inside the editor (VV lazy-loads the editor through `LE/01__Core__Loader`); only if the PhaseLibrary must be initialised at page level |
| WCP `server.py`, WCP `CloudflareWorker/src/index.js` | Only for the site plan pipeline (WP-S04a-11): no new route is strictly required if GLBs are read as static files, but the R2 sync must publish the folders |

**d.2 Import seams that change between apps** (re-apply on every whole-file take): folder numbers
`40__System__DrawingViewCore` -> `42__`, `41__System__SectionCutEngine` -> `41__System__CrossSectionView` (DIV-2,
through the adapter), `42__System__FloorPlanViews` -> `43__`, `45__System__ElevationViews` -> `46__`,
`46__System__NorthDirection` -> `47__`; console prefix `[TrueVision3D LayoutEditor]` -> `[ValeVision3D LayoutEditor]`;
header line; category literals `TrueVision__` -> `ValeVision__` (SnapshotRenderer CONTEXT_CATEGORIES, ModelLayers
FALLBACK, PlanDoors config, site plan prefix).

**d.3 Order of operations (module graph)**: TV units import downward only (Frame <- Window; Linework <- Window,
Frame; SitePlan <- Window, Frame, Linework; DepthFog standalone). **[Verifier correction]** Not quite: Linework
imports ModelSource, and ModelSource 1.1.0 imports the SitePlan painter, which imports Linework - a cycle (harmless
in ES modules because nothing is used at load time, but the three files must land in one step, or ModelSource must
be the adapted copy until WP-10). Leaves first: ViewportRotation, GlbParse,
DraftMode__State (other slice), SitePlanComposites (needs ScaleManager only), VectorQuality (config only). Then
the record layer (SheetRecords/SheetModel keys), then Window/Frame/Linework/DepthFog/SitePlan, then Viewport2d,
Viewport3d, then SnapshotRenderer, then panels and ModeController. Run `80__Testing__PrototypeEnvironment/
Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` (both present in VV) after every step that edits a
`.js` (the TV composites plan's critique C8 learned this the hard way).

**d.4 Event names to wire**: `na-model-phase-library-changed` (PhaseLib), `na-siteplan-store-changed` (SpStore,
listened to by Panel__ViewportSettings / Panel__ModelLayers / frames), `na-layouteditor-vector-quality-changed`,
`na-layouteditor-viewport-identity-changed` (gains reasons `phases`, `level`), `na-layouteditor-snapshot-queue`
(already in both).

---

## (e) UI notes (identical-experience items)

| UI item | TV | VV today | Notes |
|---|---|---|---|
| Rotate grip on a selected viewport | Round grip on a stem off the top edge, rotate cursor, Shift = 90 degree steps, 2 degree detent | none | v2.138.0; panel Rotation deg box with -90 / +90 / Level; menu Rotate 90 cw / ccw, Reset rotation |
| Toolbar Vector control | Low / Medium / High beside Raster | none | v2.136.0; per browser |
| Render Composites: Depth Fog row | first row, toggle | none | v2.94.0; needs fog system |
| Render Composites: Enhance Whitecard Strength | number box with `%` | toggle only | v2.93.0 |
| Model Layers Advanced fold: Fill, Line scale columns | present | absent | 55014c6a; Line scale for any dashed row |
| Doors row (Viewport panel) | "N closed", Open all, Hide swings, storey note | none | v2.42.0 / v2.140.0; pointer cursor over a door on a selected plan |
| Model Source row / Model menu items | hidden on a one-model project | none | Identical on screen for VV when dormant |
| Site plan UI | Drawing Type row, Add Site Plan Viewport (scale + store), Plan type, Site Plan Render Composites panel, Patterns panel, site plan rows in the Drawings menu (TabStrip 2.0.0, v2.158.0 - the old "after the plus" tab group is gone; verifier), "Loading site plan data..." badge | none | Gate behind a VV flag until data exists (D-S04a-01) |
| Frame badges | "Loading design phase: ...", site plan status | none | come with the modules |
| Draft outline of vector-less frames | `na-le-frame__body--raster-only` | none | with Draft mode (other slice) |

The top bar fold animation Adam named is outside this slice (contextual top bar fold, TV v2.83.0 -> VV v2.70.0,
ledger :1235-:1246, recorded verbatim there).

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S04a-01 | Should ValeVision get site plan drawings? | (A) Port fully now with Vale data (client + VV transport + Whitecardopedia sync + an exporter target). (B) Port the client code dormant: modules verbatim, VV transport adapter written, Drawing Type row hidden by a VV config flag until a Vale site plan pipeline exists. (C) Keep excluded: every one of the 27 TV modules that touch site plans stays a hand-merged "adapted" file forever | **B**, then A when Adam wants Vale location/block plans (UK planning applications need both, so it is likely). B removes the largest single source of shared-file drift at no visible cost |
| D-S04a-02 | Should ValeVision get Model Source / design phases? | (A) Keep excluded. (B) Dormant port: PhaseLibrary + ModelSource verbatim, no groups registered, UI hidden exactly as TV hides it on a one-model project. (C) Vale-specific: offer sibling `__Scheme-NN` projects as phases (new design) | **B**; C only as a future feature request |
| D-S04a-03 | Vale site plan data layout and naming | Folder under VV's own prefix (`VaApps/Projects/{folderId}/SitePlan__DrawingData__{Existing,Proposed}/` and the WCP local mirror) vs a `LayoutEditor/SitePlanData/` subfolder; manifest name (`TrueVision__SitePlanData__Manifest__.json` vs `ValeVision__...`); category stem prefix (`ValeVision__SitePlan__` vs the SSOT's `TrueVision__SitePlan__`); project.json key (`SitePlan__DataStores`) | Keep TV's folder names and keys inside VV's own R2 prefix; `ValeVision__SitePlan__` stems (matches every other VV category); store accepts both manifest names; one stem-prefix constant |
| D-S04a-04 | NA-specific site plan furniture in Vale | Share the OS hatch pack; Scrapbook credentials with Vale's own OS licence/attribution, or none | Share the hatch pack; VV Scrapbook config stays Vale's own and empty until Adam supplies Vale's licence text |
| D-S04a-05 | How does VV render a drawing's fog image under DIV-1? | (a) Add TV's `renderFrame` callback route to VV's tiled renderer, used only by the fog image. (b) A fog-only pass through the composer. (c) No fog on VV sheets | **(a)** - smallest change, keeps DIV-1 for the underlay |
| D-S04a-06 | Align render entry-point signatures now? | Adopt TV's positional signatures for Render2d / Render3d / EnsureLinework / fingerprints in VV (new slots null) vs keep VV's | **Adopt TV's** - removes a silent-failure trap for every future port |
| D-S04a-07 | Port method for the drifted viewport files | Whole-file take + re-apply VV seams vs hunk replay | Whole file for Window, Frame, Linework, Viewport2d, Viewport3d, Handles, Clipboard, Zoom, Identity, TitleText, EdgeStyles, ModelLayers, RenderComposites, Enhance (after the enabling leaves exist); hunk replay only for SnapshotRenderer |
| D-S04a-08 | Nested LineworkModifier styling in VV's base image | Extend `Na__LineworkSettings` with per-tag overrides (export compensation still applies) vs TV's material swap | Extend LineworkSettings; first verify VV GLBs carry modifier nodes |
| D-S04a-09 | Vector quality default for VV | Medium (TV default) vs High (VV today) | Medium, matching TV, once Adam has confirmed the control in TV |
| D-S04a-10 (verifier) | TV's PORT NOTEs gate this slice's ports on Adam's sign-off: ViewportRotation and VectorQuality "ValeVision: not yet ported - it waits for Adam's sign-off"; PlanDoors "Back-port: PENDING to ValeVision3D, on Adam's sign-off"; the realign plan's Model Source row P "ask at sign-off" and plan doors row AA "Pending Adam's sign-off" (both with "Tested by Adam" still blank); site plans P10 "Adam's sign-off, then offer the ValeVision port". Does the instruction to align VV exactly with TV count as that sign-off? | (a) Yes, for everything in this slice. (b) Yes, but only for features Adam has tested in TV; the rest wait. (c) No - ask feature by feature | (b): record the sign-off once in the VV ledger, port what Adam has tested in TV, and hold rotation, vector quality, plan doors and Model Source until their TV "Tested by Adam" rows are filled (or port them dormant) |

**[Verifier notes on the decisions above]**
- D-S04a-01: option B knowingly overrides TV's standing guidance (composites plan 3.5: "any port to ValeVision is a
  surgical merge of the non-site-plan parts only"); say so when asking Adam. If C is chosen, EdgeStyles, ModelLayers,
  Viewport2d, Linework, Identity and ModelSource stay hand-merged for good, which also removes most of D-S04a-02's
  benefit.
- D-S04a-02: B's payoff (whole-file takes) only materialises together with D-S04a-01 = B, because ModelSource 1.1.0
  imports the site plan Store and painter. With D-S04a-01 = C, B still works with an adapted ModelSource.
- D-S04a-03: evidence now favours "keep the exporter and the manifest exactly as TV writes them and normalise in VV":
  Vale GLBs already carry `TrueVision__` stems (Doous) and VV's model loader renames them to `ValeVision__` at load
  (MultiModel :175). Apply the same rule to manifest stems in the VV Store adapter; set VV's four prefix constants to
  `ValeVision__SitePlan__`. No Vale exporter target is needed for naming.
- D-S04a-05: option (a) reverses TV TiledRenderer's PORT NOTE ("the callback route is not [worth carrying back]"),
  which predates the fog image; option (a) still needs V03 (a VV `RenderDepthInto` route) before the fog draws.
- D-S04a-06: adopt the TV signatures, but have VV's interim `Describe` return a Resolve-shaped stub, never null
  (b.3 correction).

---

## (g) Proposed work packages

Sizes: S < 300 changed lines, M < 1,000, L < 3,000, XL larger or multi-repo.

**WP-S04a-01 - Enabling leaves and signature alignment (M).** **[Verifier correction: this text disagreed with the
structured return; the structured version is the one to use.]** Port `ViewportRotation__.js` (verbatim) and
`LE/26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js` (verbatim, a 107-line leaf with no imports,
coordinated with the Draft slice); align `Na__LeSnap__Render2d/Render3d/GetModelFingerprint/GetPipelineFingerprint/
GetModelRoot` and `Na__LeVp2d__EnsureLinework` to TV's signatures with null slots (D-S04a-06), and make
`Na__LeVp2d__Describe` return a Resolve-shaped `modelSource` stub (never null). The survey's earlier draft also put
GlbParse and SitePlanComposites here; they belong to WP-10 and wait for D-S04a-01. Hot files: VV SnapshotRenderer,
Viewport2d, Frame, Linework, Window, Viewport3d, PdfExporter (call sites only). Acceptance: both verifiers pass; a
3D viewport zoomed to 150% still renders its window; `Na__Test__ViewportRotation__` leaf checks pass on VV's copy.
Depends on: none.

**WP-S04a-02 - Render style quick wins (S).** Enhance 1.1.0 (CRLF), RenderComposites 1.2.0 + config percent row,
`enhancePct` in Frame RasterWeights, Viewport3d RenderNow and VV SnapshotRenderer (`Na__LeEnhance__Apply(canvas,
weights.enhancePct)`), Panel__Styles `%` suffix. Tests: `Na__Test__EnhanceWhitecardStrength__.test.mjs` (23).
Acceptance: typing 40 stores `Viewport__CompositeWeights.enhanceWhitecard: 40`, re-keys 2D and 3D raster tokens;
0 skips both passes. Depends on WP-01 (signatures).

**WP-S04a-03 - Rotatable viewports (L).** Handles 1.5.0, Window 1.1.0, Zoom 1.1.0, Clipboard 1.4.0, Viewport2d
snap key; SheetSurface/SheetChrome turned frames; SheetTools hit/press/drag; ContextMenu; Panel__ViewportSettings
rotation row; SheetRecords/SheetModel `Viewport__RotationDeg`; config + labels; PdfExporter `PdfTurn`; ObjectSnap
Index/Search/GridMoves where present in VV. Tests: `Na__Test__ViewportRotation__` (52),
`Na__Test__PaintedOnThePoint__` (handles placement). Acceptance: Shift lands 0/90/180/-90; a 30 degree crop keeps
the opposite edge to 0.01 mm; level viewports save byte-identical; PDF turned. Depends on WP-01; coordinate with the
SheetSurface, SheetTools, ObjectSnap and PdfExport slices. **[Verifier corrections]** Window cannot be taken whole
here (TV Window imports ModelSource and PlanDoors) - replay only its 1.1.0 rotation hunk (ToFrame, FrameToPaper,
RotationDeg, turned ToPaper/FromPaper); Viewport2d likewise takes only the snap-key hunk. Handles, Zoom and
Clipboard can be whole. Add the rotation consumers WP-03 left out: Groups, MarkupBridge, Eyedropper, SelectionBox,
SelectionSet, ScrapbookParametric LinkNoodle and ViewportLink (see b.6). Handles and the SheetTools wiring and the
rotate config land in one step (b.5).

**WP-S04a-04 - Vector quality control (S).** Module verbatim; SheetSurface `Ready` / `NoteRedraw`; Toolbar select;
Paper CSS rule; ConfigState getter; AppConfig block; labels. Test `Na__Test__VectorQuality__` (33). Acceptance:
Medium holds during redraws and releases 1200 ms after the last; High never holds; not in the web viewer.
Depends on: none (SheetSurface slice coordination).

**WP-S04a-05 - Model Source, dormant (L).** PhaseLibrary (verbatim, no groups registered), ModelSource (verbatim,
needs WP-10 dormant store or an adapted CategoryKeys), ModelToggle Borrow/Restore, SectionAdapter `SetModelRoot`,
Pipeline optional root/fingerprint, SnapshotRenderer `EnterPhase/ExitPhase/PhaseFingerprints/OnPhaseChanged`,
Viewport2d/Frame/Linework/Window/Viewport3d phase lines (by the whole-file takes), ModelLayers `Groups(keys)`,
ViewportIdentity PhaseOf, ModeController init + listener, record key, panel row and menu items (hidden), config +
labels. Acceptance: no visible change on any VV project; every VV render produces the same key and pixels as before
(compare a Doous sheet before/after); verifiers pass. Depends on D-S04a-02, WP-01. **[Verifier corrections]** Use the
ADAPTED ModelSource (CategoryKeys without the site plan branch, no Store/painter imports) unless WP-10 lands in the
same step: the verbatim file pulls the whole site plan client and the hatch slice. The phase lines in Viewport2d,
Frame, Linework, Window and Viewport3d are hunk replays here, not whole-file takes (V01). No LoadingSequence change is
needed for the dormant library. `SectionAdapter__SetModelRoot` in VV is a no-op stub while dormant (VV's Cross
Sections tool has no root setter). The phase hunks in SnapshotRenderer map `InvalidateSceneCaches` to VV's own
profile-line caches.

**WP-S04a-06 - Plan doors and Hide swings (L).** PlanDoors (adapted config), Window/Frame/Viewport2d door hooks,
SnapshotRenderer door pose (hunk), folder-50 DoorPose + Storeys + Projector/Pipeline/ViewDefinition/StageSampler,
door module 1.9.0 + FindDoorGroups, 43 FpData storey level, SheetTools door click/menu, Panel Doors row, records,
config + labels. Tests `Na__Test__HideSwings__` (47), `Na__Test__StoreyBand__`. Acceptance: on Doous a plan draws
doors open with swings, a click closes one (one undo step), elevations draw doors shut, the 3D view's doors never
move. Depends on WP-01, folder-50 slice, 25-interaction door module.

**WP-S04a-07 - Depth fog on sheets (L).** DepthFog unit, Frame fog layer, Viewport2d fog paths +
`RenderFogForExport`, RenderComposites 1.3.0 + config depthFog row, SheetRecords `depthFog` style key, AppConfig
DefaultStyles.DepthFog, Paper CSS, SnapshotRenderer fog source (hunk) with VV TiledRenderer callback route
(D-S04a-05), PdfExporter fog. Test `Na__Test__ElevationDepthFog__` (68). Acceptance: frame stack `underlay,
linework, fog, markup`; toggling fog re-renders neither underlay nor linework; PDF carries the fog PNG with a soft
mask. Depends on the 49-folder port and 46 Elevation data, WP-01. **[Verifier addition]** Also depends on a VV DIV-2
route for `Na__SectionCut__RenderDepthInto`, which TV's 49 RenderLayer imports straight from TV's section engine
(V03 / WP-S04a-15).

**WP-S04a-08 - Linework modifiers and model-layer hygiene (M).** Frame `RasterModifiers`, Viewport2d key,
Linework 1.2.0, ModelLayers 1.4.0 + StoreyEquivalentKey + config group (`ValeVision__LineworkModifier__*`),
EdgeStyles dash scale for any category, Panel__ModelLayers Line scale column, SheetRecords `Category__LineTypeScale`,
SnapshotRenderer modifier rules through LineworkSettings (D-S04a-08). Acceptance: switching a modifier row off removes
it from vectors and base image; a Line scale of 0.5 halves dashes only. Depends on folder-50 ConfigAccess /
AuthoredEdges / StageSampler modifiers; VV GLB check.

**WP-S04a-09 - Viewport titles: level and typed names (S).** ViewportTitleText 1.1.0, ViewportIdentity 1.1.0 +
v2.86.0 hunk + config. Test `Na__Test__ViewportTitleText__` (TV version). Acceptance: a plan with a storey letters
"PROPOSED GROUND FLOOR PLAN" in TV's rules; VV with no storeys letters exactly as before. Depends on 43 FpData storey
level and 46 AutoName (other slices). **[Verifier correction]** ViewportIdentity imports ModelSource and the
PhaseLibrary directly, so this WP depends on WP-05 (as the structured return says) and cannot run before it as the
suggested order below had it. ViewportTitleText 1.1.0 alone has no imports and can go at any time. 46 AutoName is a
record-key dependency only (not an import). Also run VV's own `Na__Test__ScrapbookDrawingTitle__` (it loads
ViewportTitleText; TV's copy is 281 lines against VV's 178).

**WP-S04a-10 - Site plans, client side, dormant (XL).** Store (VV adapter), SitePlan unit, Panel__SitePlanComposites,
Viewport2d/Linework/EdgeStyles/ModelLayers/ModelSource/Identity site branches (via the whole-file takes), records,
SheetModel, TabStrip, ScaleManager, Panel__Sheet, Panel__ViewportSettings, PdfExporter, HatchPatterns + Patterns
panel + `52__LayoutEditor__HatchPatternLibrary/05__SitePlanHatches`, VV config flag, VV labels. Tests
`Na__Test__SitePlanStore__` (32), `Na__Test__SitePlanComposites__` (108), `Na__Test__SitePlanFaces__`.
Acceptance: with the flag off nothing changes on screen; with the flag on and a test store, a 1:500 block plan and a
1:1250 location plan paint, snap and print. Depends on D-S04a-01, D-S04a-03, D-S04a-04, WP-01, WP-05, the hatch and
SheetData slices. **[Verifier corrections]** "Tabs group after the plus" is TabStrip 1.x behaviour; TV v2.158.0
(TabStrip 2.0.0) lists site plans as marked rows of the Drawings menu - the acceptance follows whichever strip VV has
when this lands (S03a owns TabStrip). No LoadingSequence edit: the Store adapter awaits the memoised
`Na__AppUtils__FetchProjectJson`. The adapter normalises manifest stems `TrueVision__SitePlan__` ->
`ValeVision__SitePlan__` (V04) and needs `WithBuildToken` exported from VV's ProjectLoader. Swap WP-05's adapted
ModelSource for the verbatim file in this WP, landing Linework, ModelSource and the painter together (import cycle).

**WP-S04a-11 - Vale site plan data pipeline (XL, outside the app root).** R2 layout under `VaApps/Projects/
{folderId}/`, WCP local mirror, Whitecardopedia sync registering `SitePlan__DataStores` in project.json, GLB Builder
export target for a Vale project, manifest naming. Acceptance: a Vale project exported from SketchUp draws a site
plan on localhost and live. Depends on D-S04a-01 (A), D-S04a-03. **[Verifier corrections]** Vale GLBs already come
out of the same "TrueVision3D GLB Builder" with `TrueVision__` stems, so no exporter naming target is needed (V04);
the VV-side work is where the export lands (`WCP/Projects/{year}/{folder}/SitePlan__DrawingData__{Existing,Proposed}/`,
served on localhost by the WCP catch-all route, :956) and registering `SitePlan__DataStores` in project.json from
`WCP/Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` (the counterpart of
TV's `discover_truevision_siteplan_stores`), plus the R2 sync (`AutomationUtil__SyncSingleProject__ToCloudAndWeb__`,
`AutomationUtil__BuildCloudflareBucket__`). TV's own site plan plan warns that "ValeVision Cloud Sync -
`TagVisibilityCapture__.rb`" turns site plan tags into scene-visibility categories unless their SSOT entries carry no
`Glb__ExportFileNameStem`; check that before the first Vale export.

**WP-S04a-12 - Ledger and header hygiene (S).** TV PORT NOTEs (ForceRender :42, Viewport3dZoom :55,
ViewportClipboard :93-:94, Viewport3d :49, SnapshotRenderer :41-:42 - only its "3D view window of 1.8.0, likewise"
half; the door-pose half is still true) to say VV has those versions; TV ModelSource,
GlbParse, Store get PORT NOTE blocks; TV module logs record `6076ec10` and `55014c6a`; VV Frame/Linework/Window
"Back-port: the same split applies to TrueVision's copy" -> done (TV v2.55.0); VV SnapshotRenderer 1.7.0 and
Viewport3d 1.6.1 "TrueVision has no per-scene lighting" -> ported as TV v2.161.0; VV ledger subfolder table
(:1128-:1129) - ViewportSnapMove now lives in TV `LE/28__System__ObjectSnap`, the TV-only list lacks VectorQuality,
ViewportRotation, Viewport2d__DepthFog, Viewport2d__SitePlan, SitePlanComposites and folder 21; TV composites plan
3.5 names the old `52__System__SitePlanData`; TV devlog v2.159.0 says "ValeVision has FlushJoins 1.0.0" - VV has no
FlushJoins module. Acceptance: grep for "PENDING" / "pending" in the five TV headers returns only real pending items.

**WP-S04a-13 - Back-ports to TV (S).** `TrueVision__SceneEntourageSilhouette` in TV SnapshotRenderer
CONTEXT_CATEGORIES; VV v2.45.1 Add Viewport scene list rebuilt on every refresh (TV `Panel__ViewportSettings__.js:646-647`
still fills only while `options.length <= 1`); SectionAdapter `SetModelRoot` in TV (route the phase swap through the
DIV-2 adapter). Acceptance: Context Layer off hides silhouettes in TV; a plan added after a sheet opens appears in Add
Viewport without reload. **[Verifier addition]** The VV v2.45.1 fix had two halves (ledger :1231): the panel's
rebuild AND ModeController 1.15.1's listeners that refresh the Viewport panel on `na-presentation-mode-scenes-loaded` /
`-cleared` (VV ModeController :866-:867). TV's ModeController has neither listener, so back-port both.

Suggested order: WP-12 and WP-13 any time; WP-01 -> (WP-02, WP-04, WP-09) -> WP-03 -> WP-05 -> WP-10 -> WP-06 ->
WP-07 -> WP-08; WP-11 only after D-S04a-01 (A).

**[Verifier corrected order]** WP-12, WP-13 and WP-15 any time; WP-01 -> (WP-02, WP-04, ViewportTitleText alone) ->
WP-03 -> WP-05 (adapted ModelSource) -> WP-09 -> WP-10 (verbatim ModelSource swapped in) -> WP-06 -> WP-07 -> WP-08
-> WP-14 (whole-file convergence, last); WP-11 only after D-S04a-01 (A). Every WP before WP-14 replays hunks into the
eight shared files listed in V01.

**WP-S04a-14 - Whole-file convergence (M, verifier addition).** Once every import in the V01 table resolves in VV,
take Viewport2d, Frame, Linework, Window, Viewport3d, ViewportIdentity, EdgeStyles and ModelLayers whole from TV and
re-apply only the header, console prefix, folder numbers and `ValeVision__` literals. Acceptance: a normalised diff
(folder map + prefix) of each against TV shows header lines only; both verifiers pass; Doous render keys unchanged.

**WP-S04a-15 - Section calls through the DIV-2 adapter, both apps (S, verifier addition).** Add to both
SectionAdapters: Serialize / Apply (TV: `Na__SectSerialize__*`; VV: `Na__CrossSection__SerializeSections` /
`ApplySerializedSections`), the outline width get/set (TV `Na__SectCutCfg__*Appearance`; VV
`Na__CrossSection__GetAppearance` / `SetLineWidth`), SetModelRoot (TV `Na__SectionCut__SetModelRoot`; VV stub or a new
export) and RenderDepthInto (TV `Na__SectionCut__RenderDepthInto`; VV new). Point both SnapshotRenderers and TV's 49
RenderLayer at the adapter. Acceptance: neither SnapshotRenderer imports from its `41__` folder; section save/restore
in a 3D render and the section outline width are unchanged.

---

## (h) Findings index (ids used in the structured return)

| Id | Category | Title | Action | Severity |
|---|---|---|---|---|
| S04a-F01 | folder | 20__System__Viewports aligned by name; VV lacks 6 TV-only modules | no_action | medium |
| S04a-F02 | folder | 21__System__SitePlanData exists only in TV (moved from top-level 52 in TV v2.155.0) | needs_decision | high |
| S04a-F03 | folder | 25__System__RenderStyles aligned; VV lacks SitePlanComposites + config | no_action | low |
| S04a-F04 | tooling | drift_all "header-only" hides real changes in 4 rows | no_action | medium |
| S04a-F05 | drift | SnapshotRenderer TV 1.13.0 vs VV 1.7.0 | port_adapted | high |
| S04a-F06 | wiring | Render entry points take different positional arguments | update_wiring | high |
| S04a-F07 | permanent_divergence | SnapshotRenderer DIV-1 seams must survive every port | keep_vv_divergence | high |
| S04a-F08 | vv_only | TV Context Layer misses the entourage silhouette category | backport_to_tv | low |
| S04a-F09 | drift | Viewport2d TV 1.16.0 vs VV 1.8.0 | port_whole_reapply_vv | high |
| S04a-F10 | drift | Viewport2d__Frame TV 1.4.0 vs VV 1.1.0 | port_whole_reapply_vv | medium |
| S04a-F11 | drift | Viewport2d__Linework TV 1.2.0 vs VV 1.1.0 | port_whole_reapply_vv | medium |
| S04a-F12 | drift | Viewport2d__Window TV 1.2.0 vs VV 1.0.0 | port_whole_reapply_vv | medium |
| S04a-F13 | drift | Viewport3d TV 1.8.1 vs VV 1.6.1 | port_whole_reapply_vv | medium |
| S04a-F14 | drift | Viewport3dZoom TV 1.1.0 vs VV 1.0.0 | port_verbatim | low |
| S04a-F15 | drift | ViewportHandles TV 1.5.0 vs VV 1.4.0 | port_verbatim | medium |
| S04a-F16 | drift | ViewportClipboard TV 1.4.0 vs VV 1.2.0 | port_verbatim | low |
| S04a-F17 | drift | ViewportIdentity TV 1.1.0 vs VV 1.0.0 (+config) | port_whole_reapply_vv | medium |
| S04a-F18 | drift | ViewportTitleText TV 1.1.0 vs VV 1.0.0 | port_verbatim | low |
| S04a-F19 | ledger | ForceRender / RasterQuality aligned; TV header stale | fix_ledger | low |
| S04a-F20 | drift | Enhance TV 1.1.0 vs VV 1.0.0 | port_verbatim | low |
| S04a-F21 | drift | EdgeStyles TV 1.1.0 (+unlogged) vs VV 1.0.0 (+config) | port_whole_reapply_vv | medium |
| S04a-F22 | drift | RenderComposites TV 1.3.0 vs VV 1.1.0 (+config) | port_verbatim | medium |
| S04a-F23 | drift | ModelLayers TV 1.4.0 (+unlogged) vs VV 1.1.0 (+config) | port_whole_reapply_vv | medium |
| S04a-F24 | missing_module | ViewportRotation leaf | port_verbatim | medium |
| S04a-F25 | wiring | Viewport rotation wired through 31 TV files | update_wiring | medium |
| S04a-F26 | missing_module | VectorQuality | port_verbatim | medium |
| S04a-F27 | missing_module | PlanDoors (open on plans, shut on elevations, Hide swings) | port_adapted | high |
| S04a-F28 | wiring | Plan doors rest on folder-50 / door-module pieces VV lacks | update_wiring | high |
| S04a-F29 | missing_module | Viewport2d__DepthFog | port_verbatim | medium |
| S04a-F30 | wiring | Fog images need a tiled-renderer callback route VV lacks (DIV-1) | port_adapted | medium |
| S04a-F31 | missing_module | ModelSource | needs_decision | high |
| S04a-F32 | wiring | Model Source support chain missing in VV | update_wiring | high |
| S04a-F33 | wiring | TV swaps the phase root through the section engine, not the adapter | backport_to_tv | low |
| S04a-F34 | decision | Site plans - largest source of shared-file drift | needs_decision | critical |
| S04a-F35 | missing_module | Na__SitePlan__GlbParse__ | port_verbatim | low |
| S04a-F36 | transport | Site plan Store needs a VV transport adapter | build_vv_transport | high |
| S04a-F37 | missing_module | Viewport2d__SitePlan painter | port_verbatim | high |
| S04a-F38 | missing_module | SitePlanComposites + config | port_verbatim | medium |
| S04a-F39 | ui | Panel__SitePlanComposites | port_verbatim | medium |
| S04a-F40 | data_schema | Site plan record fields, stems and project data keys | needs_decision | high |
| S04a-F41 | transport | No Vale site plan data pipeline | build_vv_transport | medium |
| S04a-F42 | decision | NA-specific site plan furniture | needs_decision | low |
| S04a-F43 | data_schema | VV SheetRecords drops every viewport field this slice adds | update_wiring | high |
| S04a-F44 | wiring | Config and ConfigState gaps | update_wiring | medium |
| S04a-F45 | wiring | ModeController registrations missing | update_wiring | medium |
| S04a-F46 | wiring | Draft mode guards compiled into three viewport files | update_wiring | medium |
| S04a-F47 | drift | Nested LineworkModifier styling (SSOT 76-79), unlogged in TV | port_adapted | medium |
| S04a-F48 | ui | Per-viewport Line scale (any dashed category) and Fill overrides | port_adapted | medium |
| S04a-F49 | ledger | Stale PORT NOTEs, logs and ledger rows | fix_ledger | low |
| S04a-F50 | vv_only | VV Add Viewport list refresh fix missing in TV | backport_to_tv | low |
| S04a-F51 | ledger | TV devlog claims VV has FlushJoins; it does not | fix_ledger | low |
| S04a-F52 | test | Tests to port with this slice | port_test | medium |
| S04a-F53 | ui | Viewport and render-style UI VV users do not see | port_verbatim | medium |
| S04a-F54 | ledger | Already aligned (do not re-port) | no_action | low |
| S04a-V01 | wiring | [Verifier] Whole-file takes need their whole import closure: eight shared files can only be taken whole at the end | update_wiring | high |
| S04a-V02 | ui | [Verifier] TabStrip 2.0.0 (TV v2.158.0) replaced the "site plans after the plus" tab group with marked rows of a Drawings menu | update_wiring | medium |
| S04a-V03 | wiring | [Verifier] Section-engine calls bypass the DIV-2 adapter in both SnapshotRenderers and in TV's fog render layer (RenderDepthInto) | update_wiring | medium |
| S04a-V04 | data_schema | [Verifier] Vale GLBs already carry TrueVision__ stems and VV renames them at load; site plan stems should be normalised the same way | build_vv_transport | medium |
| S04a-V05 | decision | [Verifier] TV PORT NOTEs gate rotation, vector quality, plan doors, Model Source and site plans on Adam's sign-off | needs_decision | medium |

Findings the verifier corrected (field-level, see Verification): F05, F06, F07, F09, F10, F11, F12, F13, F15, F17, F21,
F23, F25, F27, F28, F30, F31, F32, F33, F34, F36, F37, F40, F41, F43 (severity high -> medium), F47, F49, F50, F52.
None was refuted outright.

---

## Verification

Adversarial verification of this slice, 01-Oct-2026, read-only on both apps, NAAPPS and WCP. Working files:
`parity/verify_s04a/` (`vvonly.py` - VV-only code lines per shared file after mapping folder numbers and prefixes;
`imports.py` - every relative import of a TV file resolved against VV, file and exported names; `rot_files.txt`,
`siteplan_files.txt`; two Vale GLBs read from the public CDN).

### What was checked

- **Coverage.** Every file of LE/20, LE/21, LE/25 and Panel__SitePlanComposites listed from disk in both apps (TV
  19 + 2 + 10 + 1 = 32; VV 13 + 0 + 8 = 21) and matched against `ref/drift_all.tsv` and table (c): all 32 TV and all
  21 VV files are accounted for, no VV-only file in scope. PhaseLibrary (M/26) and DraftMode__State (LE/26), which
  this slice depends on, are covered by F32 and F46.
- **Critical and high findings: all 14 checked** (F02, F05, F06, F07, F09, F27, F28, F31, F32, F34, F36, F37, F40,
  F43), plus a sample of 28 medium and low ones.
- **"VV lacks X" claims.** 27 identifiers searched across all of VVM (rotation, vector quality, depth fog, plan doors,
  door pose, Model Source, PhaseLib, site plan, FlushJoins, renderFrame, BorrowRegistry, LineworkModifier,
  enhancePct, Asset__Samples, LineTypeScale, FillHex, storeys, Draft). Every claimed absence held; the only hits were
  unrelated (text and door rotation, the video studio's renderFrame, a cross-section cap colour) - except storeys:
  VV DOES have a 3D storey system (see the F27 correction).
- **No hidden VV-only code** in the shared files: `vvonly.py` found no VV code in Window, Linework, Viewport2d, Frame,
  Viewport3d, Viewport3dZoom, Clipboard, Handles, Identity, TitleText, EdgeStyles, Enhance, ModelLayers or
  RenderComposites that is not an older TV state, so whole-file takes lose nothing of VV's - but in SnapshotRenderer
  it found a seventh DIV seam the survey missed (Render3d section save/restore through VV's Cross Sections tool).
- **Versions and devlog references**: every TV and VV module version in table (c) re-read from the file logs; TV devlog
  headings for v2.32.0, v2.42.0, v2.48.x, v2.49.0, v2.55.0, v2.58.2, v2.64.x and v2.86.0-v2.164.0 matched the claims;
  v2.155.0 :1284 (folder move), v2.158.0 (tab strip) and v2.159.0 :1067 (the FlushJoins claim) read in full; commits
  `6076ec10`, `55014c6a` and `62dade1c` re-listed with `git show --stat`.
- **Signatures** (F06) re-read at TV SnapshotRenderer :863/:991, Linework :132 and VV :469/:555/:113; every VV
  caller listed (only Viewport2d, Frame, Linework, Viewport3d, SnapshotRenderer and PdfExporter :213).
- **Transport** (F36, F41): TV Store :97-:124, :267, :290, :455, :505; VV ProjectLoader exports, :92, :251, :372,
  :464; WCP `server.py` routes; TV build script `05__ProjectVision__CoreAppCode/ProjectVision__BuildScript__.py`
  :59-:63, :564, :618; WCP `Tools__DevUtils` build scripts.
- **Record schema** (F43): VV `NormaliseViewport` (:361-:443), `NormaliseSheet` (:644-:700),
  `NormaliseProjectedEdges` and `NormaliseCompositeWeights` read in full.
- **Config, ModeController, Draft, tests, ledger lines, PORT NOTEs**: AppConfig / ConfigState key counts; TV
  ModeController :297, :343-:344, :378-:379, :533, :1193, :1206, :1247 and VV :828, :866-:867; DraftMode__State
  exports; both test folders; VV ledger :78, :79, :1128-:1129, :1166, :1171, :1179, :1181, :1184, :1208, :1231,
  :1242; TV PORT NOTE markers of every slice file.

### What was corrected (field-level; the full replacement text is in the structured return)

- **F06 / D-S04a-06 / WP-01**: VV's interim `Describe` must return a Resolve-shaped stub, not `modelSource : null`
  (TV dereferences `described.modelSource.renderId` unguarded in 8+ places).
- **F07 / F05**: a seventh seam (Render3d `Na__CrossSection__SerializeSections` / `ApplySerializedSections`) and the
  phase hunks' `InvalidateSceneCaches` mapped to VV's own profile-line caches.
- **F09-F13, F17, F21, F23**: whole-file takes only at the end (V01), with the exact missing imports per file;
  Identity's AutoName dependency is a record key, not an import; Identity imports PhaseLibrary directly; EdgeStyles
  and ModelLayers need the Store file.
- **F15**: Handles 1.5.0 is not harmless alone - it draws a rotate grip on every selected viewport from a config
  value VV does not return.
- **F25**: 34 consumers (SheetTools HitResolution / PointerPress / PointerDrag reach rotation through Handles); seven
  VV files missing from WP-03's hot list.
- **F27 / F28**: VV has a 3D storey system and loads `Storey__` GLBs; the exact door-module names DoorPose needs.
- **F30**: TV TiledRenderer is 2.1.0; its PORT NOTE says the callback route is not worth carrying back; the fog
  layer also needs `RenderDepthInto` (V03).
- **F31 / F32**: the dormant port needs no LoadingSequence change; VV's section tool has no model-root setter; the
  benefit is coupled to D-S04a-01; use an adapted ModelSource until WP-10.
- **F33**: broadened - both SnapshotRenderers import their own section engine for three things, not one (V03,
  WP-15).
- **F34 / V02**: the site plan tab group is now a marked row of TabStrip 2.0.0's Drawings menu.
- **F36**: no project.json accessor is needed (memoised `FetchProjectJson`, awaited inside the async Find);
  `WithBuildToken` is private; VV has no `GetProjectFolderFromUrl` / `GetYearFromUrl`.
- **F37**: the painter also needs Linework 1.2.0's `BandPaths` export (an import cycle with Linework and ModelSource).
- **F40 / V04**: 39 SSOT stems, not 42; four hard-coded prefixes, not three; normalise stems in VV as the model
  loader already does.
- **F41**: the VV registration point is the WCP build script; no exporter naming target is needed.
- **F43**: VV keeps unknown top-level keys (rotation, doors, model source, the site plan block, drawing type and
  `Asset__Samples` all survive a VV save); it loses only `Viewport__Styles.depthFog`, `Category__LineTypeScale`,
  `Category__FillHex`, and clamps edge weights above 3.00. Severity lowered to medium.
- **F47**: two live Vale linework GLBs carry no LineworkModifier data; Linework 1.2.0 was committed in `62dade1c`.
- **F49**: VV SnapshotRenderer carries the queue-depth code (commit `9d250d21`, 21-Sep) with no log entry.
- **F50**: the back-port has two halves (the panel rebuild and ModeController's two scene-broadcast listeners).
- **F52**: four more TV tests load this slice's modules; VV's own ScrapbookDrawingTitle test must be re-run.
- **Report text**: the b.2 cross-reference (F48 -> F49), the MD WP-01 text (now matches the structured return), the
  suggested order (WP-09 needs WP-05), table (c) rows 3, 5, 10, 11, 22, 25 and 29, d.1 hot files, d.3 module graph.

### What was added

- Findings S04a-V01 to V05; decision D-S04a-10; work packages WP-S04a-14 (whole-file convergence) and WP-S04a-15
  (section calls through the adapter, both apps); replacements WP-S04a-03R, 05R, 07R, 10R, 11R and 13R for packages
  whose scope, hot files or dependencies were wrong (the originals are marked refuted in the structured return).

### What remains unverified

- Whether a newer GLB Builder export of a Vale model writes LineworkModifier tags (only two pre-modifier Doous GLBs
  were read), and how TV's exporter records nested tags in a GLB.
- The SketchUp Plugins exporters (GLB Builder Site Plan Export, ValeVision Cloud Sync `TagVisibilityCapture__.rb`)
  and the Whitecardopedia R2 sync were not read beyond file names and the lines cited.
- Runtime behaviour: nothing was executed in either app; the "harmless when dormant" statements rest on reading the
  code paths (IsLive(null), WaitFor(null), the status guards), not on a run.
- The internals of TV `M/49`, `M/50` DoorPose / Storeys, `LE/36` HatchPatterns and `LE/57` SiteLegend beyond their
  imports.
- The label counts in F44 (Doors 10, site plan 19, Patterns 9) were sampled, not counted one by one.
