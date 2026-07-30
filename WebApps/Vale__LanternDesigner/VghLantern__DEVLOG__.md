# VghLantern Development Log
# =========================================================


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.2 - 30-Jul-2026
### Preview & Send and Drawing Editor: drawings last, compact title block, PDF-faithful preview, true scale sheet views, sheet navigation, live 3D camera, and true-size PDF export

#### Document Preview (`40__System__DocumentPreviewMode`)
- **Page order** is now config-driven (`Config__Page.PageOrder`: specification then drawing). Both on-screen preview and PDF export read the same `DocumentState.ListPageKinds()` path so they cannot diverge.
- **Drawing title block** is height-capped from `TitleBlockHeightMm` (reduced to **14 mm**, logo **28 mm**) so the four view frames reclaim page space. Preview wraps the title strip in `DocPreview__TitleHost`; PDF strip height uses the same config value and row Labels.
- **WYSIWYG specification pages** — new **`PrintDocumentRenderer`** builds print-faithful HTML from `DocumentModel` (same sequence as `PdfExporter`). Specification Mode keeps its interactive card UI; Preview & Send no longer dumps that abstraction into the paper preview.
- **Drawing Editor viewport gutters** — drag the space between the 2×2 frames to rebalance column/row shares. Hover shows a grab cursor and blue handle; scale stays fixed (larger frame shows more model at the same 1:N). Shares persist for the session and feed PDF layout via `GetGridShares`.
- **Env2d corner view titles** — in-viewport draftsman labels (not sheet frame captions) at **0.25×** size (`ViewLabelSizeFactor` 0.00875), with a text-width underline rule, and plan renamed **Plan View**. Labels anchor just under the drawn content (not the empty viewBox edge). Gutter resize handles idle as light dotted lines; hover/drag keeps the solid blue accent.
- **Sheet ↔ PDF WYSIWYG parity** — Drawing Editor and PDF export now share one millimetre SSOT (`Sheet.BlockGapMm`, titleblock paddings/logo caps, notes typography/columns, frame label font). Screen chrome is driven by CSS variables injected from config; PDF titleblock/notes/logo use the same numbers; `CellSizeMm` reserves the notes band like `SheetPdfLayout.Solve`.

#### Scale correctness (the headline fix)
- **Sheet views were never drawn at the quoted scale.** Every frame caption and the titleblock quoted the `ScaleManager` denominator, but nothing applied it: each view was independently fitted to its frame by `Env2d__RenderPipeline__FitIfNeeded`, so a 4000 mm side elevation drew larger than a 6000 mm front elevation on the same sheet at the same stated scale.
- **`ViewPlacement__ApplyTrueScale()`** now gives each orthographic frame a viewBox spanning exactly **(frame body millimetres x scale denominator)** of model space, centred on that view's projected extents. The quoted scale and the drawn scale are the same number.
- The body rectangle is **measured from the laid-out frame** rather than taken from the requested grid cell. The notes block takes its height off the grid, so the two differ, and a viewBox whose aspect does not match its box is letterboxed by `preserveAspectRatio` and quietly draws under scale.
- **A manually chosen scale now sticks.** Auto fit re-ran on every rebuild and silently overwrote the toolbar selection, which is why changing the Scale dropdown appeared to do nothing. Auto fit still picks the opening scale, then stands down for the session once the user chooses.
- Frame caption strips are pinned to their configured paper height, because the body maths subtracts `FrameLabelHeightMm` and a font-driven strip height put the drawn scale slightly off its quoted value.

#### PDF export (`SheetPdfLayout__.js`, `SheetPdfExporter__.js` - both new)
- **`SheetPdfLayout__.js`** solves the paper millimetre rectangle of every element on a sheet: view grid, each frame and its drawable body, notes block, titleblock strip. Pure arithmetic, no DOM and no jsPDF. Honours `ColumnSharesPct` / `RowSharesPct`, preferring the live session shares from `SheetManager__GetGridShares()` so an exported sheet matches frames the user has dragged.
- **`SheetPdfExporter__.js`** writes the sheet as a single-page PDF and is the owner of scale correctness in print. Three things have to agree and all three are forced: the page is created at the sheet's real millimetre size; each view's viewBox is **rewritten** to span exactly one scale window before rasterising; the raster is placed into that same rectangle so nothing is refitted between the maths and the paper.
- Verified end to end on an A3 landscape export: PDF MediaBox came out as **1190.55 x 841.89 pt**, which is exactly 420 x 297 mm, and a 10,000 mm lantern drew 100 mm wide at 1:100.
- Views are rasterised at **12 px/mm (about 305 dpi) as PNG**, because a drawing is thin dark lines on white that JPEG turns into grey haloes. Frame chrome, notes and the titleblock are drawn **natively**, so issued text stays selectable and searchable.
- **Draw order matters and is deliberate.** Views are laid down in one pass and every rule and caption drawn over them in a second. A view is an opaque raster filling its body rectangle to the millimetre, so chrome drawn first is painted over along every shared edge.
- Page size and drawn scale are written into the **document properties** as well as the page geometry, so a short print can be diagnosed from the file itself.
- New **`VghLantern__DrawingEditor__Config__PdfExport`** block: filename pattern and tokens, raster density, block gaps, stroke weights, print colours and metadata author strings.

#### Env2d export fidelity
- **`Env2d__RenderPipeline__ToSvgMarkup()` now bakes computed styles inline** before serialising. The live SVG is styled entirely through CSS classes and custom properties, none of which travel with a detached markup string, so serialised raw the views rasterised as black shapes with no strokes. This was a **latent bug affecting the existing Document Preview PDF export** as well, which is fixed by the same change. Only the eighteen properties that decide how a shape is painted are copied, so an exported sheet is not inflated by hundreds of irrelevant declarations.

#### Sheet navigation and direct editing
- **Wheel zooms about the cursor; right drag or middle drag pans.** Pan was originally on left click, whose pointer capture swallowed every click before it reached a dimension or the 3D frame. Left click is now completely free for editing. The browser context menu is suppressed inside the sheet stage and middle-button autoscroll is blocked.
- Zoom is a CSS transform on the sheet plus an explicit size on the scaler, so the sheet keeps its true paper-pixel dimensions for export while the host's own scrollbars provide the pan surface. Zoom survives sheet rebuilds within a session.
- **Dimensions are editable directly on the sheet**, through the same `ConstraintResolver` path as the Lantern Editor. The floating input is positioned through the sheet's zoom transform, so it lands centred on the text at any zoom rather than only at 100 percent.
- **Fit Views and Refresh are removed** along with their config flags. The sheet live-updates on every geometry solve and every toolbar change, so both were dead weight. Double-click zoom reset is removed too; the gesture belongs to the 3D frame.

#### Live 3D camera editing on the sheet
- **Double-click the 3D frame** to swap the snapshot for a live orbitable surface. The frame takes a blue border to show which viewport owns the keyboard, and **Escape** ends the session.
- On exit the snapshot is **re-captured from wherever the camera was left**, and that camera is remembered: later geometry edits and sheet rebuilds re-shoot the 3D view from the chosen angle instead of snapping back to the isometric preset.
- **`RenderPipeline__GetCameraState()` / `SetCameraState()`** expose camera position and orbit target as plain data, so classic scripts can hold and replay a camera without touching Three.js types.
- Sheet pan and wheel stand down over a live camera canvas so the two navigation systems never fight, and a sheet rebuild or mode exit mid-session tears the session down safely.

#### Drawing output no longer carries modelling aids
- The **Env2d construction grid** is cleared from each sheet frame after it renders. Cleared after the fact rather than suppressed inside the renderer, so the Lantern Editor viewport keeps its grid untouched. Config: `ViewGrid.ShowConstructionGrid`.
- The **Env3d ground grid is never built** into a sheet viewport. `SceneManager__Create()` and `RenderPipeline__Mount()` now take options, and the Drawing Editor mounts both of its 3D surfaces with `{ ShowGroundPlane : false }`.
- **Suppressed at build time, not hidden at capture time, and this matters:** the lighting rig attaches into the same `helpers` group as the grid, so hiding that group removes every light and renders the lantern as an unlit black silhouette.
- Sheet snapshots frame tighter than the live view via `Snapshot.FramePaddingFactor`, because the bounding-sphere fit plus the interactive padding left a wide flat lantern tiny in its frame.

#### Performance and resource fixes
- **The 3D snapshot is cached against a fingerprint** of the lantern config and camera preset. Every entry to the mode previously mounted a fresh WebGL context, rebuilt the scene, rendered a supersampled frame and PNG-encoded it on the main thread (about 1 s of a measured 1.3 s entry), then threw it all away on exit. Re-entry with unchanged geometry now does no WebGL work at all.
- **WebGL contexts are actually released.** `renderer.dispose()` does not free a context; that waits for garbage collection, so repeated tab switching stacked live contexts toward the browser's hard cap, at which point the browser starts killing the oldest context. `SceneManager__Destroy()` now calls `forceContextLoss()`.
- **Sheet redraws are no longer dropped.** A request arriving while a build was in flight was silently discarded, leaving the sheet showing stale geometry. Requests are latched and replayed when the build lands.
- **`THREE.Color: Unknown color role-fixed`** warning fixed: the material builder parsed a sentinel string as a colour on every glazing and line material build. The colour is now constructed only in the branch that uses it.
- Toolbar render order fixed so the Scale dropdown shows the settled denominator on first entry rather than a stale one.

#### Document Preview - visit requirement removed
- **The Drawing Editor visit requirement is gone** (open item from v0.0.1). Preview and Send previously showed empty drawing frames unless the Drawing Editor had been opened that session. Entering Preview now composes the sheet headlessly when nothing is cached, then releases the hidden surfaces immediately. This became safe because the true-scale viewBox maths never reads on-screen layout.

#### Files touched (Drawing Editor, PDF export and supporting environments)

| Area | Path |
|------|------|
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfLayout__.js` |
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfExporter__.js` |
| Drawing Editor | `VghLantern__DrawingEditor__SheetManager__.js`, `ViewPlacement__.js`, `ViewportFrame__.js`, `Na__DrawingEditor__Config.json`, `Styles__Main__.css` |
| 2D environment | `05__Env2d__SvgRenderPipeline/VghLantern__Env2d__RenderPipeline__.js`, `DimensionEditor__.js` |
| 3D environment | `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SceneManager__.mjs`, `RenderPipeline__.mjs`, `SnapshotExporter__.mjs`, `CameraRig__.mjs`, `MaterialLibrary__.mjs`, `Na__Env3d__Config.json` |
| App core | `01__AppCore/VghLantern__AppCore__Init__.js` |
| App shell | `VghLantern__App__.html` (two new Drawing Editor scripts) |

#### Open items

- **`ProfileTraceRenderer` full silhouette**, **provisional library dimensions**, **Gable and Mono Pitch roof forms** and **empty dev tooling folders** all stand as recorded in v0.0.1.
- **Vector PDF output** - jsPDF cannot place vector SVG, so orthographic views are rasterised at 12 px/mm. True vector linework in the PDF needs either a different writer or an SVG-to-PDF path drawer. Worth revisiting before drawings are issued to the workshop at A1.
- **A manually chosen scale can overflow its frame.** Picking too fine a scale for a large lantern clips the view at the frame edge, which is honest CAD behaviour but currently silent. A toolbar warning when the chosen scale does not fit would be kinder.
- **Notes are truncated to one line each** in the PDF, because the notes block height is measured on one line per note. A long project note is cut rather than wrapped.

# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.1 - 30-Jul-2026
### Initial wireframe release — app shell, geometry solver, 2D/3D environments, drawing sheet, specification, PDF

First build of the **VghLantern Roof Lantern Designer**, a parametric roof lantern configurator for Vale Garden Houses. Structure, naming, interaction model, and project-file workflow are deliberately **modelled on ValeSpec** so the two apps read as one family. The app is a static HTML/CSS/JS shell with a **Flask localhost server on port 8006** for project read/write and per-user menu state. Where ValeSpec drives a single **SVG** pipeline, VghLantern runs **two render environments side by side** — a 2D SVG pipeline for plan/elevation linework and dimension editing, and a Three.js pipeline for the 3D rendition — both fed from one **geometry solver** so they can never disagree about the model.

#### App shell and core (`VghLantern__App__.html`, `01__AppCore`)
- **Seven modes** in `VghLantern__AppCore__ModeManager__.js`: **`DocManagement`**, **`LanternEditor`**, **`Viewport3d`**, **`DrawingEditor`**, **`Specification`**, **`DocumentPreview`**, **`ComponentIndex`**. Descriptor table maps each mode to its panel id plus an **`IsFullBleed`** flag so viewport modes lose panel padding.
- **`VghLantern__AppCore__StateManager__.js`** — event emitter holding `currentProject`, active lantern index, and the last solved geometry; emits **`appConfigLoaded`**, **`componentIndexLoaded`**, **`profileIndexLoaded`**, **`projectChanged`**, **`lanternSelected`**, **`lanternUpdated`**, **`geometrySolved`**, **`modeChanged`**, **`dirtyStateChanged`**.
- **`VghLantern__AppCore__Init__.js`** — boot order, delegated listener binding via **`VghLantern__AppCore__InitSystemModules()`** (bound once, not per render), debounced autosave, and **`VghLantern__AppCore__OnModeExited`** so heavyweight systems can release resources. The 3D viewport drops its GL context on exit; Drawing Editor and Specification flush pending edits.
- **`VghLantern__AppCore__ConfigLoader__.js`** — loads the app config SSOT then merges each system's local overlay (`Na__LanternEditor__Config.json`, `Na__Env2d__Config.json`, `Na__Env3d__Config.json`, `Na__DrawingEditor__Config.json`, `Na__Specification__Config.json`, `Na__DocPreview__Config.json`, `Na__DocManagement__Config.json`, `Na__LanternEditor__Warnings__.json`).

#### Configuration SSOT (`02__AppData/VghLantern__AppConfig__Main__.json`)
- App identity, port **8006**, data folder paths, autosave debounce, default mode.
- **`VghLantern__RoofForm__Options__Config`** — selectable forms **Hipped Ridge**, **Pyramid**, with **Gable** and **Mono Pitch** present but listed in `DisabledRoofForms` (visible, not yet selectable). Labels must match the canonical set in `ProjectSchemaValidator` because **`SkeletonSolver`** branches on them.
- **`VghLantern__Lantern__GlobalDefaults__Config`** — every new lantern seeds from here (2400 × 1400 mm, 150 mm kerb, 25° pitch, 3 bars long slope / 1 short).
- **`VghLantern__DataLibraries__Config`** — locations of the two generated library indexes and the GLB asset folder.

#### Geometry solver (`04__MathUtils__LanternGeometry`)
The single source of geometric truth; both render environments and the takeoff consume its output rather than deriving their own.
- **`VghLantern__Geometry__SkeletonSolver__.js`** — resolves a lantern config into a named member skeleton (eaves, ridge, hips, verges, closing sections) as 3D points in millimetres, branching on roof form.
- **`VghLantern__Geometry__RoofPitchCalculator__.js`** — angle ⇄ rise conversion so the editor can be driven either way (`DefaultPitchDriveMode`).
- **`VghLantern__Geometry__GlazeBarLayout__.js`** — distributes glazing bars per slope by **count** or **target spacing**, returning bar lines with their slope association.
- **`VghLantern__Geometry__ConstraintResolver__.js`** — clamps interdependent dimensions so the editor cannot produce an unbuildable lantern.
- **`VghLantern__Geometry__QuantityTakeoff__.js`** — pure function over solved skeleton + bar set returning linear metres per member role, glazing areas, and component counts. No DOM, no config reads.

#### 2D environment (`05__Env2d__SvgRenderPipeline`)
- **`VghLantern__Env2d__RenderPipeline__.js`** orchestrates layer renderers: **`PlanViewRenderer`**, **`ElevationViewRenderer`**, **`SkeletonRenderer`**, **`GlazeBarRenderer`**, **`ProfileTraceRenderer`**, **`FinialRenderer`**, **`DimensionRenderer`**.
- **`VghLantern__Env2d__DimensionEditor__.js`** — click a dimension, type a value, commit. Ported from the ValeSpec inline-dimension pattern so the interaction feels identical.
- **`VghLantern__Env2d__ViewportInstance__.js`** / **`ViewportControls__.js`** — pan/zoom per viewport instance, with **`ActiveController`** tracking so **zoom-extents** hotkeys hit the viewport the user is actually in.
- **`VghLantern__Env2d__ProfileTraceRenderer__.js`** — draws true section outlines from the profile library at member positions, resolving profile ids through `ProfileIndexLoader`.

#### 3D environment (`06__Env3d__ThreeRenderPipeline`)
- **ESM boundary:** Three.js is module-only, so **`VghLantern__Env3d__Bootstrap__.mjs`** is the single `<script type="module">` entry. It publishes the pipeline onto `window` and dispatches **`vghlantern-env3d-ready`**, with a `WhenReady` queue so classic scripts can call in before the module graph settles.
- **`SceneManager`**, **`CameraRig`** (OrbitControls + named view presets), **`LightingRig`**, **`MaterialLibrary`** (whitecard finish set).
- **Mesh builders:** **`MeshBuilder__ProfileSweep__.mjs`** sweeps a 2D library profile along a solved skeleton member (hand-rolled merge rather than `BufferGeometryUtils`, because every member needs its own material slot); **`MeshBuilder__Skeleton__.mjs`** builds the frame from solved members; **`MeshBuilder__Glazing__.mjs`** fills the panes.
- **`ComponentLoader__Glb__.mjs`** — loads finials, bases, cresting, and vents from GLB, falling back to a proportional placeholder when an asset is missing rather than dropping the component.
- **`SnapshotExporter__.mjs`** — offscreen render at a requested size for placement on drawing sheets.

#### Lantern Editor (`20__System__LanternAssembly__EditorMode`)
- **`ControlDescriptors__.js` is the SSOT for controls** — every slider, dropdown, and toggle is declared as data (bounds, step, options source, visibility predicate). **`ControlPanel__.js`** is a generic renderer over those descriptors, so a new control is a data edit, not new DOM code.
- **Eight section modules** supply descriptors: **`FormAndSize`**, **`RoofPitch`**, **`GlazingBars`**, **`RidgeAndHips`**, **`Finials`**, **`KerbAndBase`**, **`Ventilation`**, **`FinishAndGlazing`**. Dropdown options come from the library indexes filtered by **`ApplicableRoles`**, so no module hardcodes a category-to-role mapping.
- **`WarningSystem__.js`** + **`Na__LanternEditor__Warnings__.json`** — declarative rules evaluated against lantern metrics and solved geometry; renders inline warnings and errors in the editor.
- **`ViewportHost__2d__.js`** / **`ViewportHost__3d__.js`** — host the two environments inside the editor split layout, with view tabs (plan / front / side) and an optional live 3D preview.

#### 3D View mode (`25__System__Viewport3dMode`)
- Full-bleed dedicated 3D mode with a floating control overlay (**`Viewport3d__Controls__.js`**): lantern selector, view presets, zoom extents, skeleton-mode label.
- Reuses the same **`VghLantern__Env3d__RenderPipeline__`** API as the editor host — no second pipeline. Configured from a **`DedicatedViewportMode`** block inside `Na__Env3d__Config.json` rather than a new config file, keeping all 3D settings in one place.

#### Drawing Editor (`30__System__DrawingEditorMode`)
- **All layout maths in paper millimetres**, scaled to pixels only for screen, so print and preview share one geometry model.
- **`ScaleManager__.js`** — standard scale ladder, fit-to-frame selection, model ⇄ paper conversion.
- **`ViewportFrame__.js`** builds captioned frames from the config's view slots; **`ViewPlacement__.js`** fills them, taking 2D views as static SVG and the 3D view as a snapshot. Rendered output is **cached** (`CachedSvgMarkup`, `CachedSnapshots`) so Document Preview can compose a sheet after the Drawing Editor has been exited.
- **`TitleBlockRenderer__.js`** — Vale-branded title block resolving fields from project metadata; **`AnnotationLayer__.js`** — general plus project-specific notes block.
- **`SheetManager__.js`** — orchestrates sheet size/orientation, drives scale fitting, and renders. Redraws are **debounced** and gated on **`IsModeVisible()`**, and it subscribes only to `geometrySolved` and `projectChanged` (not `lanternUpdated`, which already triggers a solve) to avoid redundant passes.
- **`DescribeSheet()`** exposes sheet size, orientation, view snapshots, and an `IsComposed` flag as the contract for Document Preview.

#### Specification (`35__System__SpecificationMode`)
- **`DocumentModel__.js`** — solves each lantern in the project independently, runs the takeoff, then aggregates. Handles single- and multi-lantern projects and collects warnings alongside the numbers.
- **`TakeoffTableRenderer__.js`** — one generic table builder driven by configurable column definitions, unit suffixes, and decimal places; renders linear, area, and component tables without per-table code.
- **`ScheduleRenderer__.js`** — lantern schedule, finish schedule, document header.
- **`JobNotes__.js`** — editable job notes with debounced autosave via **`VghLantern__StateManager__MarkDirty()`**, which the core autosave listener picks up through `dirtyStateChanged`. **`BuildStatic()`** returns print-safe markup instead of a live editor.
- **`DescribeDocument()`** builds header and section markup **on demand** rather than scraping the DOM, so the preview and PDF work even if Specification mode was never opened.

#### Document Preview and PDF (`40__System__DocumentPreviewMode`)
- **`DocumentState__.js`** — view toggles and page geometry (paper size, orientation, margins). Toggle keys mirror `VghLantern__UserMenu__ModeDocumentPreview__Config` exactly so persistence needs no key translation.
- **`MenuDataHandler__.js`** — loads and debounce-saves per-user menu state through `GET`/`POST /api/user-menu-config/{slug}` into `08__LocalUserData`.
- **`DocIssueHandler__.js`** — classifies errors and warnings from project state, the geometry solve, and the specification model; **errors block PDF export**.
- **`PdfMetadataResolver__.js`** — filename pattern plus embedded document properties, with filename sanitisation.
- **`PageRenderer__.js`** — paginates the document from `DescribeSheet()` and `DescribeDocument()`; **`PdfExporter__.js`** writes it out via version-locked jsPDF. Drawing views are rasterised (jsPDF cannot place vector SVG), 3D snapshots pass through as images, and the title block, notes, and specification tables are drawn **natively from structured data** so body text stays selectable.

#### Component Index (`50__System__ComponentIndex`)
- Sortable, searchable gallery of every profile and component in the two libraries, with a detail view showing metadata, outline data, and bounding box — the same inspection workflow as the ValeSpec Product Index.

#### Data libraries (`05__Data__LanternComponentLibrary`, `06__Data__LanternProfileLibrary`)
- **Unified asset schema** shared by both libraries: metadata block, 2D profile points, optional 3D mesh (inline or GLB URL), and behaviour block (sweep or placement).
- **Profile coordinate convention:** origin sits on the skeleton line at the section's bottom-centre; **x** spans ±half-width, **y** rises into the member. Each asset carries its own origin note.
- **Component coordinate convention:** finials and bases use the seating point; cresting uses the centre of one repeat; vents use the centre of the pane they replace.
- **Worked examples** so the whole pipeline renders end to end: five profiles (**`PRF_GLB0001`** 50 mm capped glazing bar, **`PRF_RDG0001`** 90 mm capped ridge, **`PRF_HIP0001`** 75 mm hip, **`PRF_EVK0001`** 120 mm eaves/kerb, **`PRF_CLS0001`** 45 mm closing section) and four components (**`VGH_FIN0001`** ball-and-spike finial, **`VGH_FIN0101`** moulded finial base, **`VGH_CRS0001`** fleur cresting, **`VGH_VNT0001`** manual roof vent). Dimensions are provisional pending real Vale sections.
- **`VghLantern__ProfileDataIndex__.json`** / **`VghLantern__ComponentDataIndex__.json`** are **generated output** — marked `DoNotEditByHand`, served by the Flask server at `/api/profile-index` and `/api/component-index` with `no-store`, with the static files as a fallback.

#### Version-locked dependencies (`04__Src__Dependencies__VersionLocked`)
- Coordinated 3D / projection set **01–04**: **three 0.184.0**, **three-mesh-bvh 0.9.9**, **clipper2-js 0.9.0**, **three-edge-projection 0.0.10 @ f794481**. Upgraded together, never independently.
- **05**: **jsPDF 4.1.0**, independent of that set. UMD classic script, so it is loaded by a plain `<script src>` and reaches the app as `window.jspdf` — deliberately **not** in the import map.
- **`Vale__Dependencies__ImportMap__Index__.json`** is the SSOT for the path map. A browser cannot read an import map from JSON, so the inline `<script type="importmap">` in `VghLantern__App__.html` mirrors it by hand.
- `package.json` / `package-lock.json` pin the same versions exactly for `npm ci`; the browser loads the vendored copies, not `node_modules`.

#### Styles (`03__Style__AppStylesheets`)
- **`VghLantern__CoreUi__Styles__Index__.css`** is a hub that `@import`s the core sheets plus every system-local stylesheet, so each mode's CSS lives beside its modules.
- **`Variables__.css`** carries the Vale brand token block verbatim, then a **`VghLantern_`** extension block for viewport overlays, warning and error backgrounds, and sheet chrome. System sheets reference tokens only — no stray hex literals.

#### Server (`VghLantern__FlaskServer__Localhost__.py`)
- Port **8006**; project CRUD backed by `07__LocalProjectData/`; per-user menu config in `08__LocalUserData/`; generated library indexes served with `no-store`; `.webmanifest` MIME mapping for PWA install; health endpoint and console restart flags carried over from ValeSpec.

#### PWA (`62__Feature__AppInstallability`)
- Web app manifest and a minimal service worker (`skipWaiting` on install, legacy `na-vghlantern-cache-` eviction on activate, no `fetch` handler).

#### Housekeeping — folder numbering and vendor consolidation
- Root folder numbers were duplicated (`03__` used three times, `04__` twice). Renumbered so each root series entry is unique, with the data libraries starting after the dependency store: **`05__Data__LanternComponentLibrary`**, **`06__Data__LanternProfileLibrary`**, **`07__LocalProjectData`**, **`08__LocalUserData`**. All config paths, loader constants, server constants, `.gitignore`, and README references updated.
- A partial **r160** Three.js copy had been vendored into `02__Src__AppModules/08__Vendor__ThreeJs__VersionLocked`, shadowing the curated **0.184.0** locked set. Removed; the import map now points at `04__Src__Dependencies__VersionLocked`. jsPDF moved out of `02__Src__AppModules/41__SystemHelper__PdfExportLibrary__VersionLocked` into the same store. The 3D modules import only `three`, `three/addons/controls/OrbitControls.js`, and `three/addons/loaders/GLTFLoader.js`, and use none of the APIs removed between r160 and 0.184, so the version jump needed no code changes.

#### Files touched (representative)

| Area | Path |
|------|------|
| App shell | `VghLantern__App__.html` |
| Server | `VghLantern__FlaskServer__Localhost__.py` |
| Launchers | `Start__VghLantern__Localhost__8006__.bat`, `...__.ps1`, `Start__VghLantern__WindowsStartUp__Silent__8006__.bat` |
| Service worker | `Na__ServiceWorker__VghLantern.js` |
| App core | `02__Src__AppModules/01__AppCore/VghLantern__AppCore__Init__.js`, `ModeManager__.js`, `StateManager__.js`, `ConfigLoader__.js` |
| App config SSOT | `02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json` |
| Project IO | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProjectFileManager__.js` |
| Library loaders | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProfileIndexLoader__.js`, `ComponentIndexLoader__.js` |
| App utils | `02__Src__AppModules/03__AppUtils/VghLantern__AppUtils__UnitConverter__.js`, `ProjectSchemaValidator__.js`, `HotkeyHandler__.js`, `DateFormatter__.js`, `AutofillGuard__.js` |
| Geometry | `02__Src__AppModules/04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js` + 4 siblings |
| 2D environment | `02__Src__AppModules/05__Env2d__SvgRenderPipeline/*` (13 modules + config + CSS) |
| 3D environment | `02__Src__AppModules/06__Env3d__ThreeRenderPipeline/*` (12 `.mjs` + config + CSS) |
| Notifications | `02__Src__AppModules/07__AppNotifications__UserAlerts/*` |
| Projects mode | `02__Src__AppModules/10__System__DocumentManagementMode/*` |
| Lantern Editor | `02__Src__AppModules/20__System__LanternAssembly__EditorMode/*` (17 files) |
| 3D View mode | `02__Src__AppModules/25__System__Viewport3dMode/*` |
| Drawing Editor | `02__Src__AppModules/30__System__DrawingEditorMode/*` (8 files) |
| Specification | `02__Src__AppModules/35__System__SpecificationMode/*` (7 files) |
| Document Preview | `02__Src__AppModules/40__System__DocumentPreviewMode/*` (8 files) |
| Component Index | `02__Src__AppModules/50__System__ComponentIndex/*` |
| PWA | `02__Src__AppModules/62__Feature__AppInstallability/*` |
| Stylesheets | `03__Style__AppStylesheets/*` (7 sheets) |
| Dependencies | `04__Src__Dependencies__VersionLocked/Vale__Dependencies__ImportMap__Index__.json`, `05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` |
| Component library | `05__Data__LanternComponentLibrary/*` (4 assets + index + READMEs) |
| Profile library | `06__Data__LanternProfileLibrary/*` (5 assets + index + README) |
| npm pins | `package.json`, `package-lock.json` |

#### Open items

- **`ProfileTraceRenderer` full silhouette** — only the section-cut trace mode is implemented. The full-silhouette sweep (projecting every profile vertex along a member to build the outer outline) is the next pass.
- **Library dimensions are provisional** — all nine worked assets carry plausible but invented sections. They must be replaced with measured Vale profiles before any output goes to a client or the workshop.
- **Drawing Editor visit requirement** — Document Preview composes drawing views from `ViewPlacement`'s cache, so the Drawing Editor must be opened once per session for sheet views to appear in the preview and PDF. Worth removing by having `DescribeSheet()` compose headlessly.
- **Gable and Mono Pitch roof forms** are listed but disabled; `SkeletonSolver` does not branch for them yet.
- **Dev tooling folders** (`60__Dev__WebBuildUtils` index builders, `65__Dev__CadObjectBuilder`) are scaffolded but empty. Until the builders exist, both library indexes are maintained by hand despite being marked as generated output.




# ---------------------------------------------------------
