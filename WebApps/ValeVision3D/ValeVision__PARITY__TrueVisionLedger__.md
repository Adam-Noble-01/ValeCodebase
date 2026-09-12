# ValeVision 3D - TrueVision Parity Ledger

Tracks every module pair between ValeVision 3D and TrueVision 3D for the systems ported under
`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. One row per pair. Update the row whenever either
side changes; log fixes made here that TrueVision still needs in the Pending back-port table at the foot.

Parity states: `verbatim` (logic identical, headers and console prefix differ), `adapted` (deliberate
divergences listed in the file's PORT NOTE), `diverged` (same purpose, different implementation),
`new` (no TrueVision counterpart yet, back-port candidate).

TrueVision root: `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`
(working copy for the re-alignment: `D:\WE10_--_Public-Repo_--_Live-Website\na-apps\30__TrueVision__CoreAppCode`).
ValeVision root: `WebApps/ValeVision3D`.

**Direction of travel reversed, 10-Sep-2026.** The back-port is now under way and is
planned in `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` in the TrueVision
root. Rows below are closed from the TrueVision side as each phase lands. Five
structural divergences are deliberate and permanent - the drawing render path, the
section engine, the drawings-block location, the persistence transport and (until now)
the library baseline; see section 2.2 of that plan before assuming a file copies.

### Back-port progress

| Phase | Scope | State |
|---|---|---|
| A | Version-locked libraries (r184 set) | **done** - TrueVision v2.20.0, live |
| B | Drawing core, drawings-block migration | **done** - v2.21.0 |
| TD06 | Section data in ValeVision's schema | **done** - v2.21.0 |
| C | Floor plan / elevation feature parity | **mostly done** - v2.21.0. Pick Face, gizmo grip, scene editor splits, styles, exclusions, dimension splits and the confirm dialog all landed. Ground Floor Plan quick action and sections-filed-by-type still outstanding |
| D | Projected linework | **done** - v2.22.0, all 24 files |
| E | Layout Editor | **done** - v2.23.0, all 49 files |
| F | Authoring gate (TrueVision-only, TD01) | **done** - v2.24.0 |

**Closed from the Pending back-port table below**: scene row builders and reorder
splits; per-drawing style toggles; dimension config and preview splits; the R2 asset
upload utility; the async confirm dialog; Pick Face and the gizmo grip; shared drawing
style rows and config state; the whole Layout Editor.

**Still outstanding**: the Ground Floor Plan quick action, sections filed by drawing
type, and the two Lantern Designer items (the rotation path in the soup builder, hidden
segments through the worker pool) which are ValeVision-to-ValeVision rather than
back-ports.

**New in TrueVision, not in ValeVision** - candidates for the return trip:
`Na__AppUtils__DevGate__` (authoring unlocked by flag rather than hostname, so an
installed app can author), and the two verification harnesses
`Na__Verify__ModuleGraph__` and `Na__Verify__Exports__`, which between them prove that
every file resolves and every imported NAME exists. The second caught faults in this
port repeatedly and ValeVision has no equivalent.

### Return trip - TrueVision to ValeVision (12-Sep-2026)

The first batch under the new direction of travel. Everything below was authored in
TrueVision during the re-alignment and has now been ported back.

| Item | Why | State |
|---|---|---|
| Glass transmission detected | `IsTransparent` asked only about `transparent`/`opacity`. Glazing exported through KHR_materials_transmission has `transparent:false` and `opacity:1` - see-through because light passes through it, not because the slot is blended. Glass Transparency Off silently did nothing to it in BOTH apps | **ported** |
| Viewport styles reach the linework | `FromPlan`/`FromElevation` gain a styles override and Viewport2d passes the viewport's own. Without it a Render Composites toggle changed the raster and not the vectors drawn over it | **ported** |
| Context Layer renamed and moved last | `baseImage` is the toggle that turns the backing render off; it is now labelled Context Layer and sits last, and the old `contextLayer` toggle (which hid the existing building and landscape, emptying a renovation drawing) is gone from the panel. Key unchanged, so nothing saved changes meaning | **ported** |
| Backend `auto` + hardware probe | Picks the fastest backend that is CORRECT per view. The GPU cannot apply a drawing cut, so plans and section elevations always take the CPU; plain elevations take the card. Probe rejects software fallback adapters, which pass every API check and are slower than the CPU backend | **ported** |
| Dev menu shows the resolved backend | Per drawing, because auto is one answer per view, not one per session | **ported** |
| `Na__AppUtils__DevGate__` | Authoring gated on a flag rather than a hostname | **ported**, routed conservatively - see below |
| `Na__Verify__ModuleGraph__`, `Na__Verify__Exports__` | One proves every FILE resolves, the other every NAME. Both found real faults during the re-alignment | **ported** |
| Dev Tools menu in the top bar | The menu sat fixed over the top-left of the viewport, permanently, whether or not it was open - which is where the model is. The trigger is now a pill beside the logo and only the flyout drops down, clearing the drawing tab strip. The drag handle sizes the panel (the container is a header flex item) and moved inside the list, since the container no longer establishes a positioned containing block | **ported** |
| Render Composites panel in the LEFT column | TrueVision moved it under Drawing Layers on 12-Sep-2026 and the move never came back; ValeVision's file header said left while its code said right | **fixed** |
| Supersampler promoted to the render pipeline | `05/Na__RenderEffect__Supersampler__.js`. This file was ours - the video studio wrote it on 11-Sep - and TrueVision generalised it for two frame routes and two consumers. It comes back as the shared module and `31/Na__VideoStudio__Export__Supersampler.js` is now an ALIAS re-export of it, so the video studio and the still exporter cannot end up with different jitter tables. Verified in the browser: the two exported names are the same function object | **ported** |
| Supersampled static exports | `30/Na__ImageExport__StaticExport__TiledRenderer.js` gains `antiAliasSamples`, per tile. Resolution was never the fix - a bigger export gets SMALLER steps, not fewer - and FXAA searches about 20 px along an edge, so a step on a two-degree line outruns it and comes back smeared as well as stepped. FXAA now stands aside during accumulation. Measured identically in both trees: 1 sample gives 2 grey levels on a shallow line, 4 gives 5, 16 gives 17 | **ported** |
| Layout Editor sample count per quality level | `AntiAliasSamples` on each raster level (Low 1, Medium 4, High 16) carried through `Na__LeRaster__Fit` beside the pixel size, so a picture can never be rendered at one level's resolution and another's anti-aliasing. High is also the PDF and Dev bake level | **ported** |

**Deliberately NOT ported, each checked rather than assumed:**

- *Supersampling in Export Render Layers.* Those are structural conditioning maps -
  depth, normals, edges - and the average of two normals across an edge describes no
  surface, nor does the average of two depths describe any point in space. Beauty wants
  coverage; a conditioning map wants the truth at the sample point. The shared tile plan
  still keeps the two registered pixel for pixel.
- *TrueVision's TARGET ROUTE and its sRGB present transfer.* Kept in the shared file so
  both trees hold one identical module, but ValeVision has no caller: every picture here
  goes through the composer, which leaves its frame in a read buffer ready to average.
  TrueVision needs it because DIV-1 means a drawing draws straight to the bound
  framebuffer and has no read buffer to hand.
- *TrueVision's profile-buffer resize fix.* It resized the renderer per tile and never
  the Sobel buffers, so its drawing outlines were computed at viewport resolution and
  stretched across the sheet. Checked here: `setProfileLinesSize(fbW, fbH)` has been in
  this tiled renderer since v1.1.0. Nothing to fix.
- *TrueVision's composer-route fix for the 3D snapshot.* Its tiled renderer accepted a
  pipeline getter and ignored it, so sheet 3D viewports were a bare `renderer.render`.
  Checked here: every tile has always gone through the composer. Nothing to fix.

- *The 2D viewport camera fix.* TrueVision passed the main perspective camera where the
  framed ortho belonged. ValeVision passes the main camera at that same line and is RIGHT
  to: its ComposerPreset swaps the composer's RenderPass camera to the ortho, so the ortho
  draws regardless. This is DIV-1, working as designed.
- *TrueVision's dual key-convention read.* TrueVision needed to read both
  `Styles__GlassOpaque` and `glassOpaque` because its ported modules disagreed. ValeVision
  is internally consistent on the plain spelling, so adding the dual read would be
  cargo-culting a fix for a bug it does not have.
- *The MaterialPreset init.* TrueVision never called it, so Whitecard and Glass Transparency
  Off swapped zero materials. ValeVision has always called it.
- *The drawings-block migration.* ValeVision never nested drawings inside the presentation
  block, so there is nothing to migrate.
- *SectionAdapter and RenderPreset.* TrueVision-specific by construction (DIV-1, DIV-2).

**The dev menu port carries one deliberate divergence.** The trigger's `<details>`
also resets `max-height` and `overflow`, because ValeVision's base dropdown sheet clamps
and scrolls the details element and TrueVision's does not - without the reset the header
pill inherits a viewport-height scroll box. Two ValeVision-only rules were repointed
rather than copied: Video Studio's timeline clamp now targets the flyout list (it was
clamping what is now the pill), and the Scene Inspector's `min-width: 290px` on the
details was dropped, the panel's own width having replaced it.

**DevGate routing is narrower here on purpose.** ValeVision's hostname test does more work
than TrueVision's: the loader picks the local Flask server over GitHub Pages, and the save
path writes a Flask mirror beside the R2 write. Those are DATA-PATH uses and keep the raw
test - `Na__AppUtils__ProjectLoader`, `Na__PresentationMode__ProjectJson__SceneData`,
`Na__DrawView__ProjectData__`, `Na__ProjectedLinework__Persistence__`,
`Na__LayoutEditor__Assets__` and the breadcrumb nav. Only the authoring surfaces were
routed. Unlocking authoring on the live site must not send the loader hunting for a server
that is not there.

---

**One defect found in the shared vendor set, present in ValeVision too:**
`04__Vendor__ThreeEdgeProjection__v0.0.10/src/worker/SilhouetteGeneratorWorker.js`
imports `'../SilhouetteGenerator'` with no file extension, which no browser can resolve.
It is reachable only through the `three-edge-projection/worker` import map entry, which
neither app imports, so it is latent rather than live in both. Left unpatched to keep
the vendor folders byte-identical. If either app ever imports that entry, fix it in all
three copies or drop the map entry.

---

## Phase 0 - Libraries (v2.16.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `04__Lib__ThirdParty__VersionLocked/` (three r184, three-mesh-bvh 0.9.9, clipper2-js 0.9.0, three-edge-projection 0.0.10) | `04__Lib__ThirdParty__VersionLocked/` (same four, byte-identical, 598 files) | **verbatim** | **CLOSED 10-Sep-2026** by TrueVision v2.20.0. Vendor folders copied byte-for-byte from ValeVision; import maps identical bar the eleven-vs-eleven key order. Index JSON and README renamed to the `TrueVision__` prefix. `THREE.REVISION` reads 184 at runtime in both apps | 10-Sep-2026 |

## Phase 1 - Scene Groups (v2.17.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | adapted | Sixth default group Cross Sections (D09) | 09-Sep-2026 |
| `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | verbatim | Console prefix only; the ValeVision carousel has no idle fade to inherit | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | adapted | Async confirm dialog instead of window.confirm | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js` 1.1.0 | rows inside `21/Na__PresentationMode__DevMenu__SceneEditor.js` | adapted | Split out; no Advanced fold, no layer timing row, four action buttons; Nav Mode switch inline since v2.21.17, reading Orbit, Fly, Walk (TV: Orbit, Walk, Fly) | 11-Sep-2026 |
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
| `51/Na__LayoutEditor__RasterQuality__.js` | none | new | Global working raster level (Low, Medium, High); the PDF and bakes at the export level | 10-Sep-2026 |
| `51/Na__LayoutEditor__PanelHost__.js`, `Panel__Sheet__`, `Panel__Layers__`, `Panel__ViewportSettings__`, `Panel__Text__`, `Panel__Dimensions__`, `Panel__Styles__` | LD panel columns (purpose) | new | D31, D32, D33 | 10-Sep-2026 |
| `51/Na__LayoutEditor__Toolbar__.js`, `TabStrip__.js`, `ModeController__.js`, `DevMenu__Controls__.js` | LD mode tab, VV 43 mode pattern | new | D22 to D24 | 10-Sep-2026 |
| `51/Na__LayoutEditor__PdfExporter__.js` | VV `PdfExport__A3__`, LD `DrawToPdf` | adapted | Any paper size, vector content (D35) | 10-Sep-2026 |
| `51/Na__LayoutEditor__Styles__Main__.css`, `Styles__Panels__.css` | LD stylesheet | adapted | | 10-Sep-2026 |
| `index.html`, `03/Na__CoreUi__Styles__Index__.css`, seven header-anchored stylesheets (edited) | n/a | n/a | Dev item, imports, init; CSS imports; tab strip offset | 10-Sep-2026 |

## Per-Scene Navigation Modes (v2.21.17, 11-Sep-2026)

Ported after the plan marked it not applicable (plan section 7.2): Adam asked for scenes and Video Studio keyframes to keep their Orbit, Fly or Walk mode.

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `10/Na__NavigationModes__Switcher.js` 1.0.0 | `10/Na__NavigationModes__Switcher.js` 1.0.0 | adapted | No registration (the toolbar exposes index.html's wrappers); active mode read from the walk and fly systems; adds pose-preserving ReleaseToOrbit and EnterModeAtPose, the look-ahead target and label normalisation | 11-Sep-2026 |
| `10/Na__Navmode__WalkMode__SystemLogic.js` 1.1.0, `10/Na__Navmode__FlyMode__SystemLogic.js` 1.1.0 (edited) | TV same | adapted | SyncFromCamera re-seats the mode on a pose placed from outside | 11-Sep-2026 |
| `21/Na__PresentationMode__Camera__SceneTransition.js` 1.4.0 | TV same (31-Aug-2026 state) | adapted | Same key and orbit-on-arrival rule. The release keeps the live view with a look-ahead target (TV re-aims at the old target); arrival puts the pose back over the entry nudges and keeps the scene's lens; the instant snap frames free-look scenes but never switches mode (page load opens in orbit by decision); capture stores a look-ahead target in walk or fly | 11-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneEditor.js` 1.3.2 | TV `CaptureLiveNavigationMode` | adapted | Recorded on Update Camera and Add Scene From Camera; TV records it on its single Update Scene | 11-Sep-2026 |
| `31/Na__VideoStudio__*` (preview controller 1.2.0, timeline menu 1.1.0, dev menu 1.2.1, dragger 1.0.1, video data 1.2.1, thumbnails 1.0.1, frame renderer 1.0.1) | none | new | Video Studio is ValeVision only: Go To lands in the keyframe's mode, the menu switch sets it, Stop restores the pre-play mode; stills and exports resync orbit only in orbit | 11-Sep-2026 |

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
| Pose-preserving mode release and entry, look-ahead capture target | `10/Na__NavigationModes__Switcher.js`, walk and fly `SyncFromCamera`, `21/Na__PresentationMode__Camera__SceneTransition.js` 1.4.0 | TrueVision arrives in walk or fly with the entry nudges and the mode's default lens still applied, and its free-look captures store orbit's leftover target, which only shows if the scene is later switched to orbit |
