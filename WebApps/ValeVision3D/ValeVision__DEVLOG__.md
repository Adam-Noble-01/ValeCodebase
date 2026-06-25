# ValeVision3D Development Log
# =========================================================

# ---------------------------------------------------------
## ValeVision3D v2.9.0 - 25-Jun-2026 - Build-Version Cache-Bust (Real-Time R2 Assets)

### Overview
ValeVision3D now consumes the shared R2 build-version manifest (written by the Whitecardopedia sync pipeline, see Whitecardopedia v0.6.0). As it has no Service Worker, freshness is achieved with a cache-bust token rather than cache eviction: the manifest `buildVersion` is appended as `?v=<buildVersion>` to `project.json` and GLB model URLs. A sync makes re-synced camera data and models visible immediately, while assets stay edge/browser-cacheable between builds so large GLB downloads remain cheap.

### Changes
- **Build manifest (ProjectLoader v1.4.0)** — `Na__AppUtils__InitBuildManifest` fetches the shared manifest (cache-busted, memoised, non-throwing) and stores the `buildVersion` token.
- **Cache-bust token** — `Na__AppUtils__WithBuildToken` appends `?v=<buildVersion>`; applied to `project.json` URLs in `FetchProjectJson` and to all GLB URL formats in `ExtractModelUrls`.
- **Loading sequence** — `InitBuildManifest()` kicked off early alongside `InitMasterIndex()`.
- **Config SSOT** — `ProjectData__AssetUrls__BuildManifestUrl` added to `Na__AppConfig__Main.json`.

### Files Changed
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`

# ---------------------------------------------------------
## ValeVision3D v2.8.0 - 25-Jun-2026 - SketchUp Camera Auto-Animation + R2 Master Index

### Overview
ValeVision3D now auto-builds Presentation Mode scenes from SketchUp-exported camera data (`ValeVison3D__SketchUpCameraData`), shows the scene carousel by default when two or more cameras exist, and uses human-readable card titles from the SketchUp scene description. All project assets resolve via the shared R2 master index (eliminating the 404 flood and the code-only folderId race that previously halted loading). See Whitecardopedia v0.5.0 for index generation/sync tooling and ValeVision Cloud Sync v0.2.0 for the SketchUp export pipeline.

### Changes
- **NEW `69__System__SketchUpToValeVision__Utilities/`** — three modules:
  - `Na__SketchUp__LoadSceneData__.js` — reads camera block; matches IMG## images/thumbnails from `project.json.images`.
  - `Na__SketchUp__ConvertSceneData__.js` — Z-up mm → Y-up PresentationMode schema; axis swap; vertical FOV; orbit target; `ShowCarouselByDefault: true`; >=2 scene gate; description-as-card-title.
  - `Na__SketchUp__AnimationScene__DataBridge__.js` — auto-build when no explicit PresentationMode block; dispatches `na-presentation-mode-scenes-loaded`.
- **R2-first assets (ProjectLoader v1.2.0)** — `FetchProjectJson` and `ResolveAssetUrl` try CDN then GH Pages; fallback toast.
- **Master index (ProjectLoader v1.3.0)** — `Na__AppUtils__InitMasterIndex`; resolves real `year/folderId` from numeric project code; honours `assetHome`.
- **Race fix (ProjectLoader v1.3.1)** — `FetchProjectJson` awaits index before building URLs; prevents memoised wrong `2026/63592` 404 that halted load and suppressed Presentation Mode.
- **Loading sequence (v1.5.0)** — early `InitMasterIndex`; SketchUp bridge after project.json load when no manual PresentationMode scenes.
- **Config SSOT** — `ProjectData__AssetUrls__IndexUrl` + fallback in `Na__AppConfig__Main.json`.
- **Reference doc** — `Research__RubySceneData__RIPDOWN__.md` (SketchUp Page/Camera API fields).

### Files Changed
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__LoadSceneData__.js` (new)
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__ConvertSceneData__.js` (new)
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js` (new)
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `Research__RubySceneData__RIPDOWN__.md` (new)

# ---------------------------------------------------------
## ValeVision3D v2.7.2 - 16-Jun-2026 - Carousel UI Cleanup: Remove Play Button and Pagination Dots

### Overview
Removed the play/pause slideshow button and pagination dot indicators from the Presentation Mode scene carousel. The slideshow auto-advance feature and all related state management were removed entirely; the dots were deemed redundant as thumbnails make the scene count self-evident.

### Changes
- **`Na__PresentationMode__UI__SceneCarousel.js`** — removed `DWELL_MS` constant; removed `IsPlaying` and `PlayTimer` state; removed `BuildDots`, `SlideshowAdvance`, `StartPlayback`, `StopPlayback`, `UpdatePlayButton`, `HandlePlayPauseClick` functions; removed `CancelCurrentTransition` import (now unused); removed dot-update logic from `SetActiveScene`; removed `StopPlayback` call-sites from `HandleCardClick`, `HandlePrevClick`, `HandleNextClick`, and `ToggleSceneCarousel`; removed auto-play startup block from `na-presentation-mode-scenes-loaded` handler; removed `StartPlayback`/`StopPlayback` from module exports.
- **`Na__PresentationMode__Styles__SceneCarousel__.css`** — removed Pagination Dots region (`.na-pm-carousel__dots`, `.na-pm-carousel__dot`, `.na-pm-carousel__dot--active`) and Play/Pause Button region (`.na-pm-carousel__play`, hover, `--playing` states).

### Files Changed
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js`
- `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css`

# ---------------------------------------------------------
## ValeVision3D v2.7.1 - 11-Jun-2026 - Presentation Mode Saved Camera Scenes

### Overview
Full Presentation Mode system for per-project saved camera scenes. Each project stores its own scene data inside its `project.json` under `PresentationMode__SavedCameraScenes`. Projects without this section are completely unaffected.

### Changes
- **New module folder:** `02__Src__AppModules/21__System__PresentationMode/`
- **`Na__PresentationMode__ProjectJson__SceneData.js`** — reads, validates, sorts and exposes saved scenes; thumbnail URL resolution; active scene id state.
- **`Na__PresentationMode__Camera__SceneTransition.js`** — captures/builds/applies/animates camera between scenes using quaternion slerp + position/target/FOV lerp with `easeInOutCubic`, `easeInOutQuad`, `linear` easing; uses `RequestActiveRender` during transitions.
- **`Na__PresentationMode__UI__SceneCarousel.js`** — bottom carousel (thumbnail cards, prev/next, pagination dots, play/pause); adaptive layout (adds `na-presentation-mode-active` to `<body>` → top toolbar); listens for `na-presentation-mode-scenes-loaded`.
- **`Na__PresentationMode__DevMenu__SceneEditor.js`** — localhost-only scene editor (add/update/rename/delete/reorder, FOV slider with live lens-mm readout, transition time slider, easing dropdown, WebP thumbnail regeneration, Save to Flask, Export JSON, Clear All).
- **`Na__PresentationMode__Thumbnail__Renderer.js`** — renders current WebGL framebuffer to a 480px WebP blob via offscreen 2D canvas downscale.
- **`Na__PresentationMode__DevTools__CameraPathVisualizer.js`** — CatmullRomCurve3 spline tube through scene camera positions + per-scene camera frustum markers + orbit target sphere markers; toggled from dev menu.
- **`Na__AppFlow__LoadingSequence.js`** (v1.4.0) — detects `PresentationMode__SavedCameraScenes` and dispatches `na-presentation-mode-scenes-loaded` with `sceneConfig` + `projectCode`.
- **`index.html`** — Views button added (hidden until scenes load), `#naPresentationCarousel` container, `#naPmDevEditorItem` dev section, all Presentation Mode init calls in Engine Entry Points.
- **`Na__PresentationMode__Styles__SceneCarousel__.css`** (new) — carousel layout, card styles, adaptive top-toolbar positioning, inactive-fade for toolbar and Tools menu.
- **`Na__UiFeature__Styles__DropdownAndToast__.css`** — collapsed Tools/Dev menu inactive opacity fade (0.78 → 1 on hover/focus/open).
- **`Na__CoreUi__Styles__Index__.css`** — added `@import` for the new carousel stylesheet.
- **`Whitecardopedia/server.py`** — new `POST /api/projects/<folder_id>/presentation-thumbnail/<scene_id>` endpoint to save WebP thumbnails into `PresentationMode/Thumbnails/`.

### Files Changed
- `02__Src__AppModules/21__System__PresentationMode/` (new folder, 6 new modules)
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `index.html`
- `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css` (new)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`
- `../Whitecardopedia/server.py`

# ---------------------------------------------------------
## ValeVision3D v2.7.0 - 11-Jun-2026 - MaxModel Load Speed + Model/HDRI/DataLib Caching Strategy

### Overview
MaxModel projects hung longer on load than whitecard models despite simpler geometry. The hang was a fixed MaxEngine overhead, not the GLB: 24.5 MB 4K HDRI fetch (uncached, awaited inside the materials swap), DataLib SSOT fetches from GitHub raw (uncached, cross-origin), and PMREM pre-filtering. Model GLBs from the R2 CDN were never service-worker cached at all (cross-origin → ignored), so offline sessions had no models.

### Changes
- **HDRI swapped to optimised 1024p version** (`HdriSkydome__...__OptimisedVersion__1024p__.hdr`, 1.46 MB vs 24.5 MB). `Scene__Environment__HdriUrl` updated; reflections-only use (glass/mirror env maps) is visually identical. RGBE decode + PMREM generation also drop sharply with the smaller source.
- **Caching strategy (implemented in the shared Whitecardopedia SW — see Whitecardopedia DEVLOG v0.4.0)**:
  - Model GLBs: network-first with 4 s slow-network grace fallback to cache + background refresh; offline fallback; 36-entry LRU.
  - HDRI: cache-first (immutable) + precached at SW install.
  - DataLib SSOT JSONs: network-first with offline fallback.
  - R2 CDN + GitHub raw origins now SW-managed (CORS-enabled allowlist).

### Files Changed
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `../Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`

# ---------------------------------------------------------
## ValeVision3D v2.6.1 - 11-Jun-2026 - HOTFIX - Vendored Three.js Broken Module Graph (No Models Loading)

### Overview
v2.6.0's local Three.js vendoring (fix M3) shipped an incomplete dependency graph — four transitive imports inside the vendored addons were never copied across, so every `three/addons/` import chain 404'd and the entire ES module graph failed to evaluate. **No model could load on any fresh client** (first observed on iPad).

### Root Cause
Vendored addons import relative files that were missing from `04__Lib__ThirdParty__Three/examples/jsm/`:
- `RenderPass.js` / `ShaderPass.js` → `postprocessing/Pass.js` (MISSING)
- `EffectComposer.js` → `postprocessing/MaskPass.js` + `shaders/CopyShader.js` (MISSING)
- `GLTFLoader.js` → `utils/BufferGeometryUtils.js` (MISSING)

### Fix
- Vendored the four missing files from `three@0.160.0` (exact match for the vendored core's `REVISION '160'`). Verified no further unresolved relative imports remain anywhere under `04__Lib__ThirdParty__Three/`.
- Whitecardopedia SW: version token bumped to `2026-06-11-2` (cache purge on all clients) and the vendored Three.js files added to the shell precache list (v2.6.0 claimed this but the entries were absent).

### New Files
- `04__Lib__ThirdParty__Three/examples/jsm/postprocessing/Pass.js`
- `04__Lib__ThirdParty__Three/examples/jsm/postprocessing/MaskPass.js`
- `04__Lib__ThirdParty__Three/examples/jsm/shaders/CopyShader.js`
- `04__Lib__ThirdParty__Three/examples/jsm/utils/BufferGeometryUtils.js`

# ---------------------------------------------------------
## ValeVision3D v2.6.0 - 11-Jun-2026 - PWA Stability Fix

### Overview
Comprehensive PWA stability pass addressing first-load hangs on iOS (especially from Whitecardopedia gallery → viewer handoff), progressive degradation after repeated loads, and service-worker version coherence.

### Critical Fixes
- **C1 — Unbounded load pipeline**: All `fetch` and `GLTFLoader.loadAsync` calls now go through `Na__AppUtils__ResilientLoad__` helpers (timeout + exponential-backoff retry). The loading overlay now transitions to an error state with a Retry button on any failure path — the overlay can no longer hang in a silent spinner state indefinitely.
- **C2 — GPU/memory leaks**: `Na__AppCore__GpuLifecycle__.js` wires `webglcontextlost`/`webglcontextrestored` handlers immediately after renderer creation, and registers a `pagehide` listener that disposes scene geometry, materials, textures, composer render targets, and the WebGLRenderer before the iOS WebContent process boots the next page.
- **C3 — Top-level config await**: The `await Na__AppConfig__LoadConfig()` call in `index.html` is now guarded by a `Promise.race` with a 10 s timeout and a visible error UI (error message + Retry button) rather than hanging silently.
- **C4 — SW version skew**: HTML responses now use network-first (not stale-while-revalidate) so deploys cannot pair stale HTML with freshly-revalidated modules. `controllerchange` bridge implemented in the SW Registrar (idle-only, single-session guard).

### Moderate Fixes
- **M1 — project.json timeout**: `Na__AppUtils__FetchProjectJson` uses `Na__ResilientLoad__FetchWithTimeout` (configurable via `LoadResilience__Config`). Promise-memoised per project code so duplicate calls (loading sequence + fog system) share one in-flight request.
- **M2 — Silent project fallback**: When `?project=` is present and `project.json` fails after retries, `Na__UiFeature__ShowLoadError` is shown instead of silently loading the legacy Clough default model.
- **M3 — Three.js CDN eliminated**: three@0.160.0 vendored locally under `04__Lib__ThirdParty__Three/`. Import map updated to local paths. All Three.js module files now ride the SW shell cache; no esm.sh cold-start cost on navigation.
- **M4 — Whitecardopedia memory**: React production builds + pinned Babel @7.29.7 in `app.html` (removes React dev overhead from shared iOS process memory budget).
- **M5 — Sequential GLB loads**: `Na__ModelLoader__LoadAllModels` now runs categories via a concurrency-capped pool (default 3 simultaneous, configurable). Mesh+linework within each category remain sequential.
- **M6 — No stall recovery**: `Na__AppCore__LoadWatchdog__.js` provides a total-budget timer (default 120 s) and a `visibilitychange` stall detector (default 30 s silence threshold) — iOS recovery hook so backgrounded mid-load sessions surface a Retry overlay rather than a frozen spinner.

### Low Fixes
- **L1 — SW controllerchange bridge**: Implemented (was documented but missing). Reloads exactly once per session, only when no load is in flight.
- **L2 — Duplicate project.json fetch**: Fixed via promise memoisation in `Na__AppUtils__ProjectLoader.js`.
- **L3 — Thumbnail LRU trim**: Now runs only after a successful cache `put` rather than on every thumbnail request.
- **L4 — Legacy manifest**: `Na__AppInstallability__Manifest.webmanifest` deleted (was unreferenced; could cause stale PWA identity for legacy installs).
- **L5 — Import map guard**: Inline script in `index.html` surfaces a readable unsupported-browser message when `HTMLScriptElement.supports('importmap')` returns false.
- **L6 — SW precache gap**: Expanded precache to include all `02__Src__AppModules/` entry-point JS files, both stylesheets, and `Na__AppConfig__Main.json` so the viewer boots from cache on poor connections.

### New Files
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js`
- `02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js`
- `02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js`
- `04__Lib__ThirdParty__Three/three.module.js` (+ all required jsm addons)

### Modified Files
- `index.html` — config await guard, import map local paths, GPU lifecycle wiring, import-map guard, `resilienceConfig` in loading sequence context
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — `LoadResilience__Config` block added
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — watchdog, resilient helpers, error overlay, project failure surfacing
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js` — resilient fetch, memoization
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — resilient GLTF loads, concurrency-capped pool
- `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` — error state styles

# ---------------------------------------------------------
## ValeVision3D v2.5.0 - 10-Jun-2026
### Floating Navigation Toolbar + Project-JSON Reset View + Navigation Help Panel

**Overview**
Navigation is the primary way users interact with the model, so the user-facing navigation controls have moved out of the right-hand Tools & Settings menu (where "Navigation Mode" was buried in a submenu) into a new always-visible floating pill toolbar fixed to the bottom centre of the viewer: Orbit | Walk | Fly | Reset View | Help. The Tools menu stays focused on technical/configuration tools (camera, export, grid, layers, elevation, render engine, sharing, fullscreen).

**New — Floating Navigation Toolbar (`Na__UiFeature__NavigationToolbar__Controls.js`)**
- White rounded pill with subtle shadow, bottom-centre, using the prepared `UiIcons__MenuIcons__NavigationMenu` PNG icons with text labels (icons-only below 560px width).
- Active mode highlighted with a soft pale blue background. `Na__NavToolbar__SetActiveMode` is the single UI entry point for mode highlighting — toolbar buttons, Alt+Shift+W/F hotkeys, and the walk/fly toggle wrappers all route through it, so the highlight stays correct no matter where the mode change originates. Dispatches `na-navigation-mode-changed` for future consumers.
- Same gating as before: Orbit always visible; Walk/Fly buttons revealed by `na-navigation-modes-loaded` (project.json `Navmode__EnabledModes`) and by the Dev menu save callback. Mutual exclusivity preserved via the existing 'silent-off' / 'return-to-orbit' toggle hints.
- The old Tools-menu "Navigation Mode" section and its module (`Na__UiFeature__NavigationModes__Controls.js`) are RETIRED — markup removed from index.html, module deleted. Underlying navigation mode logic (SystemLogic, ModeTransition, hotkeys, state) is untouched.

**New — Reset View from Project JSON (`Na__Camera__ProjectStartState.js`)**
- The loading sequence now captures the canonical start state immediately after applying the project.json camera config + resolved orbit target: raw `Camera__DefaultPosition` block (authoritative) plus an applied snapshot of position/rotation/FOV/orbit target (fallback when no project.json — e.g. app-config boot camera).
- Reset View exits Walk/Fly first (return-to-orbit), restores the snapshot, re-applies the raw project config via `Na__UiFeature__ApplyCameraConfig` (legacy `Camera__DefaultTarget` stripped — orbit target is owned by `OrbitHelperCube__Position`), then `controls.update()` + render invalidation. No hard-coded reset location anywhere.

**New — Navigation Help Panel (`Na__UiFeature__NavigationHelpPanel__Controls.js`)**
- Modal help card triggered by the toolbar Help button: Orbit (rotate/pan/zoom), Walk (WASD, mouse look, sprint, Esc), Fly (WASD + Q/E, boost, Esc), Reset View, fullscreen pointer, Escape behaviour.
- Walk/Fly instruction sections show only when those modes are enabled for the current model.
- Closes via the X button, clicking the backdrop, or pressing Escape.

**Files Changed**
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js`
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js`
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__Camera__ProjectStartState.js`
- NEW `03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css` (+ registered in `Na__CoreUi__Styles__Index__.css`)
- `index.html` — toolbar + help panel markup, old Navigation Mode menu removed, hotkey/toggle wrappers rewired to `Na__NavToolbar__SetActiveMode`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — canonical start state capture after saved camera re-apply
- DELETED `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationModes__Controls.js` (superseded by the toolbar)

# ---------------------------------------------------------
## ValeVision3D v2.4.3 - 10-Jun-2026
### Negative Door Swing Angles + PureEngine Whitecard Enforcement

**Overview**
Two follow-up fixes from Bagot MaxModel testing: doors named with negative degrees opened the wrong way, and PureEngine was showing glass opacity/face colours (a regression introduced by the v2.4.1 indexed-material preservation).

**Fix 1 — Negative Door Rotation Degrees (`3dObjectIInteraction__Animation__ClickToOpenDoors__.js`)**
- The MOD name degree parser did NOT support negative values (neither does TrueVision's original — this was a faithful port of the same gap). Worse, for `MOD001__ROT__-110-Deg__DoorPanel` the regex `/(\d+)-Deg/i` silently matched `110` (skipping the minus), so the door opened +110° — the wrong direction — with no warning.
- FIX: regex now `/(-?\d+)-Deg/i` and the validity guard accepts any non-zero signed integer. The pivot rotation already applies the angle directly via `setFromAxisAngle`, so a negative value naturally reverses the swing. Duration scaling already used `Math.abs` and needed no change. Walk/fly proximity opening inherits the fix (shared registry + ToggleDoor).
- Convention: `110-Deg` = standard swing, `-110-Deg` = reversed swing. Header docs updated.
- NOTE: TrueVision has the same bug — flag for a future TrueVision patch.

**Fix 2 — PureEngine Showing Opacity / Face Colours (regression from v2.4.1)**
- v2.4.1 made the loader preserve indexed MAT###__ materials (required for MaxEngine's swap). Side effect: under PureEngine the preserved glass material (exporter-enriched, transparent) rendered with opacity, and the legacy local-library swap — previously a silent no-op because load destroyed the names — suddenly started matching MAT101 and applying PBR glass.
- FIX: New `Na__MaterialsSystem__ApplyWhitecardToIndexedMaterials(group, baseMeshMaterialConfig)` — replaces every indexed-named material with the shared whitecard material (same params the loader uses), capturing originals first. The engine materials flow is now strictly:
  - PureEngine : restore loaded originals → whitecard ALL indexed materials (classic appearance, zero face colours/opacity)
  - MaxEngine  : restore loaded originals (indexed names back after any Pure whitecarding) → DataLib SSOT swap → glass/mirror env overrides
- The dead PureEngine local-library swap path was removed from the loading sequence (`Na__PureEngine__ApplyLocalLibraryMaterials` + the `Na__MaterialsSystem__LoadLibrary` import) — it had never matched anything before v2.4.1 because load-time whitecarding destroyed the names, so removal restores exact pre-v2.4.1 PureEngine visuals. Engine switching cycles Pure→Max→Pure verified consistent via the capture/restore contract.

**Files Changed**
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — signed degree regex + guard + docs
- `02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js` — new `ApplyWhitecardToIndexedMaterials` export
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — engine materials flow rework (restore-first in Max branch, whitecard pass in Pure branch, legacy local-library path removed)

# ---------------------------------------------------------
## ValeVision3D v2.4.2 - 10-Jun-2026
### Glass Realism Upgrade + Red Failure Toast Diagnostics

**Overview**
Two MaxEngine refinements following the first successful Bagot MaxModel render. The glass looked pale and cartoonish compared to TrueVision's dark reflective glass — root cause was config values, not the materials pipeline. Separately, data-file load failures (DataLib, HDR, materials library, GLBs, project.json) were only logged to console; they now surface as red toast notifications for instant diagnosis.

**Glass Realism — Root Cause Was Config Drift, Not Materials Code**
Both apps use the SAME DataLib glass entry (`MAT101__Glass__ClearDefault`: pale blue rgb(230,240,255), Opacity 0.2). TrueVision's darker, more realistic look comes from its `Scene__Environment` config:
- `GlassBrightnessMultiplier: 0.25` — darkens the glass colour to 25% at override time (the "more black" look)
- `GlassEnvMapIntensity: 1.0` — full HDR reflection strength
ValeVision's config (written during the v2.4.0 port) had `1.0` brightness (no darkening) and `0.8` intensity — hence the washed-out cartoon glass.

**Changes**
- `Na__AppConfig__Main.json` — `Scene__Environment` updated to TrueVision parity: `GlassBrightnessMultiplier: 0.25`, `GlassEnvMapIntensity: 1.0`, `MirrorEnvMapIntensity: 1.0`, `MirrorBrightnessBoost: 1.0`, plus `MirrorRoughnessOverride: 0.14` (TrueVision value, previously missing). NEW realism knobs beyond TrueVision: `GlassRoughnessOverride: 0.03` (sharper reflections than the DataLib 0.05) and `GlassOpacityOverride: null` (set a number to raise glass presence; null = DataLib value).
- `Na__MaterialsSystem__MaterialSwap.js` — `ApplyGlassEnvironmentOverrides` extended with `roughnessOverride` + `opacityOverride` options; console log now reports all applied values. Safe across engine switches: each MaxEngine activation builds fresh materials from the DataLib config, so the darkening multiplier never compounds.
- `Na__AppFlow__LoadingSequence.js` — passes the new glass/mirror override options from config.

**Red Failure Toasts — The Missing Event Bridge**
Sub-systems were already dispatching `na-show-toast` CustomEvents (DataLib loader, AO performance monitor) but NOTHING in ValeVision listened — failures were silently dropped. TrueVision has this bridge in its Index.html; ValeVision never received it during earlier ports.
- `index.html` — added the `na-show-toast` window listener bridging events to `Na__UiFeature__ShowToast` (red styling via existing `na-toast--error` class).
- NEW red-toast dispatch points:
  - `Na__Scene__DefaultSceneLighting.js` — HDR env URL missing or HDR load failure ("glass/mirror reflections disabled")
  - `Na__MaterialsSystem__LibraryLoader.js` — local materials library HTTP failure or fetch exception
  - `Na__AppFlow__LoadingSequence.js` — empty DataLib materials index (MaxEngine), project.json load failure, top-level model load error
  - `Na__ModelLoader__MultiModel.js` — per-GLB mesh/linework load failures (all four catch paths, named per category)
  - DataLib JSON fetch failures (already dispatched by `AppCore__DataLib__Loader.js`) now actually display via the new bridge

# ---------------------------------------------------------
## ValeVision3D v2.4.1 - 10-Jun-2026
### MaxModel Loading Fixes — Storey GLB Parsing, Indexed Material Preservation, Token-Based Door Collection

**Overview**
First MaxModel project (62609__Bagot) exposed three loading-path bugs that broke storey-based GLB sets exported by the TrueVision GLB Builder. Confirmed via DevTools network capture (only 5 of 13 GLBs requested), runtime scene report (storey files collapsed into `ValeVision__LegacyModel`), and the GLB export log (which proved `MAT101__Glass__ClearDefault` was correctly exported but never rendered). All three fixes are TrueVision-parity ports and are fully backwards compatible — existing whitecard/blockout projects behave identically.

**Bug 1 — Storey GLBs collapsed into one legacy bucket (5 of 13 files loaded)**
- `Na__ModelLoader__ParseModelUrl` had no storey branch. Filenames like `Bagot__Storey__GroundFloor__ProposedDoors__MeshModel__.glb` failed the primary `(ValeVision|NaModel|TrueVision)__` regex and fell into the legacy fallback, which assigns ALL matches to the single key `ValeVision__LegacyModel`. Each storey file overwrote the previous — only the last mesh+linework pair (ProposedWindows) survived classification.
- FIX: Added `Na__ModelUrl__StoreyParseRegex` (`/(?:.*?__)?Storey__([A-Za-z]+)__([A-Za-z]+)__(MeshModel|LineworkModel)__\.glb/i`) and a storey branch in `ParseModelUrl` — checked AFTER the primary regex, BEFORE the legacy fallback — producing distinct keys like `Storey__GroundFloor__ProposedWindows`. Storey categories load via the existing unordered second pass (same as TrueVision). The legacy fallback remains for genuinely old projects.

**Bug 2 — Glass never transparent (indexed materials whitecard-replaced at load)**
- `Na__ModelLoader__LoadSingleMesh` unconditionally replaced every untextured material with the shared whitecard material — destroying the `MAT101__Glass__ClearDefault` name before the MaxEngine DataLib swap could ever match it. The glass mesh was in the scene but rendered as opaque whitecard.
- FIX: New `Na__ModelLoader__PrepareMeshMaterial` resolver — materials matching `/^MAT\d{3}__/` are PRESERVED (cloned + DoubleSide + polygon offset only), exactly mirroring TrueVision's `CloneAndPrepareMaterial`. Non-indexed materials keep the exact previous treatment (textured → emissive prep, untextured → whitecard). Multi-material arrays now handled. Old whitecard GLBs contain zero indexed materials (export logs show "0 materials exported"), so PureEngine projects are unaffected.
- Diagnostic: logs `preserved N indexed material(s) for swap pass` per GLB when indexed materials are found.

**Bug 3 — Door animations dead (category key matching could never succeed)**
- LoadingSequence door init checked `categoryKey.includes('ProposedDoors') && categoryKey.includes('MeshModel')` — but Map category keys NEVER contain `MeshModel`/`LineworkModel` (those live on child root names via `userData.Na__ModelType`). This was silently broken for v4 flat projects too, not just storey sets.
- FIX: Ported TrueVision's token-based pattern: `Na__ResolveDoorCategoryNameTokens` (config-driven, defaults `['ProposedDoors', 'ExistingDoors']`) + `Na__CollectDoorModelGroups` which matches tokens against category keys (`Storey__GroundFloor__ProposedDoors` ✓) and pulls mesh/linework roots from group children via `userData.Na__ModelType`. Collected ARRAYS are passed to `Na__DoorAnimation__Initialize` (already array-capable since its original port) so multiple door categories — e.g. one per storey — all register.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — storey regex + parse branch; `Na__ModelLoader__PrepareMeshMaterial` with indexed preservation + array handling; header devlog
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — token-based door collection (v1.2.1)
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `3dObject__Interaction__DoorAnimation__CategoryNameTokens: ["ProposedDoors", "ExistingDoors"]`

**Expected Results (Bagot MaxModel)**
- All 13 GLBs request and render: walls, roofs, doors, existing walls, windows, landscape
- MaxEngine glass: `MAT101__Glass__ClearDefault` survives load → DataLib swap applies Opacity 0.2 / Transparent / DoubleSide / HDR env reflections
- Door click + walk/fly proximity animations work (ADR/MOD hierarchy preserved by exporter's DoorHandler)
- Model toggle menu lists each storey element category automatically

**Deliberately Out of Scope**
- TrueVision's Storey View / Storey Isolate UI controls (per-floor visibility UX — optional follow-up)
- `Na__ModelLoader__ConsolidateInstances` performance port

# ---------------------------------------------------------
## ValeVision3D v2.4.0 - 10-Jun-2026
### Dual Render Engine — PureEngine (Default) + MaxEngine (TrueVision PBR/SSAO Port)

**Overview**
ValeVision now has two render engines, selectable per model. **PureEngine** is the original super-simplified whitecard pipeline — unchanged, always the default; every existing project behaves identically. **MaxEngine** is the full TrueVision-equivalent pipeline (SSAO + AO blur, DataLib-driven PBR materials hot-swap, glass/mirror env overrides) for the rare projects that want full PBR. A new Dev-menu "Render Engine" section selects + saves the engine to `project.json` (standard GET-merge-POST). When MaxEngine is saved for a model, a "Render Engine" section appears in the user-facing Tools & Settings menu allowing live switching between both engines; PureEngine-only models show no trace of the feature. Door click + proximity animations work identically under both engines.

**Engine Architecture (Critical — see new .cursor rule)**
- `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` — the original `Na__RenderPipeline__PostProcessing__Setup.js` relocated verbatim (function renamed `Na__RenderPipeline__PureEngine__SetupComposer`). Zero behavioural change.
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js` — ported from TrueVision: RenderPass → ProfileLines → Fog → SSAO → AO Blur → FXAA, separate depth pre-pass RT (no composer-RT DepthTexture = no WebGL feedback loop), AO layer-1 exclusion, `camera.layers.enable(1)`. Exposes ValeVision's full pipeline-state contract (insertFogPass, depthTexture, profileNormal/ColorTarget, profileLinesPassRef) PLUS Max extras (renderDepthPrePass, setDepthPrePassSize, updateAoUniforms, setAoSize, monitorAoFrame, toggleAo) — so ImageExport / ElevationView / GridLines / 2D profile lines keep working under both engines.
- No cross-imports between engine folders. Shared infra (ProfileLines, RenderLoop Invalidation, RenderEngine state, user controls) lives in the parent `05__RenderPipeline/` folder.
- New rule file `.cursor/rules/07-RenderEngine-Architecture-.mdc` (alwaysApply) documents the separation so future agents cannot couple the engines.

**SSOT Materials — No Duplicate Data Files**
- New `01__AppCore/AppCore__DataLib__Loader.js` (ported from TrueVision) fetches the four `Na__DataLib__CoreIndex__*.json` files from the SAME GitHub raw URLs TrueVision uses (`Adam-Noble-01/Plugins/.../Na__Common__DataLib__CoreSuEntityStandards/`). MaxEngine material properties therefore come from the single source of truth — no locally-maintained copy was created.
- `Na__MaterialsSystem__LibraryLoader.js` — `BuildLookup` now resolves either root key (`Na__AppConfig__MaterialsLibrary` local / `Na__DataLib__CoreIndex__Materials` SSOT) + `forceRebuild` param for engine switches. PureEngine continues to use the unchanged local library path.
- `Na__MaterialsSystem__MaterialSwap.js` — upgraded to TrueVision parity: multi-material array handling, AoExclude layer-1 assignment (material flag + DataLib name tokens), mirror/glass environment override functions. NEW: original materials captured in `userData.na_originalMaterial` on first swap + `Na__MaterialsSystem__RestoreOriginalMaterials()` so switching back to PureEngine restores the exact pre-swap appearance (and clears AO layer tags). TrueVision's hardcoded MAT140 mirror debug counters were deliberately not ported.

**Loading Sequence (`Na__AppFlow__LoadingSequence.js` v1.2.0)**
- Engine-aware composer builder `Na__RenderEngine__BuildPipeline()`: PureEngine built at startup (always); rebuilt as MaxEngine after `project.json` read when configured; live runtime switching via `na-render-engine-switch` event (re-entrancy guarded, old composer/RTs disposed best-effort, fog pass re-inserted + tDepth rebound).
- Engine-aware materials: MaxEngine → `Na__DataLib__LoadAll()` → DataLib lookup → swap + glass/mirror env overrides + distance culling registration. PureEngine → restore originals → re-run unchanged local-library swap. DataLib fetch failure falls back gracefully (keeps current materials, toast shown).
- RenderFrame additions (no-ops under PureEngine): `updateAoUniforms`, `monitorAoFrame` (3 s startup-delay gated), `renderDepthPrePass`, `Na__DistanceCulling__Update`.
- Resize additions: `setDepthPrePassSize` / `setAoSize` (optional calls).
- **Door animations verified under MaxEngine**: startup order unchanged (materials swap → door registry scan), and the door system holds Object3D refs + transforms — never material refs — so swap/restore in either direction cannot break click-to-open or walk/fly proximity opening.

**New Files**
- `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` (relocated original; old file deleted)
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js`
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` (config-gated, off by default)
- `05__RenderPipeline/Na__RenderEngine__State.js` — configured vs active engine accessors
- `05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js` — user-facing Tools section (dynamic visibility)
- `07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js` + `__Shader.js` — custom log-depth SSAO (Three's SSAOPass cannot work with logarithmicDepthBuffer)
- `01__AppCore/AppCore__DataLib__Loader.js` — SSOT DataLib fetch
- `70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js` — dev radios + Save (live preview on radio change)
- `.cursor/rules/07-RenderEngine-Architecture-.mdc`

**Files Modified**
- `Na__AppFlow__LoadingSequence.js` — engine wiring (see above)
- `Na__MaterialsSystem__MaterialSwap.js` / `Na__MaterialsSystem__LibraryLoader.js` — TrueVision parity + restore support
- `Na__Scene__DefaultSceneLighting.js` — added `Na__Scene__ApplyEnvironmentMap` (HDR + PMREM, MaxEngine only)
- `Na__AppConfig__Main.json` — `RenderEngine__Config` default, `RenderEffect__AmbientOcclusion`, `Scene__Environment` (disabled until an HDR asset is added), `RenderEffect__DistanceCulling` (disabled)
- `index.html` — Tools + Dev menu HTML sections, config extraction, init calls, event listeners
- `TestEnv__PrototypeTestingSandbox__Main__.js` — import path updated to PureEngine setup

**project.json Schema Addition (per model, optional)**
```json
"RenderEngine__Config": { "RenderEngine__Active": "MaxEngine" }
```
Key absent or `"PureEngine"` → default behaviour, no visible change.

**Known Limits / Honest Notes**
- `Scene__Environment` is enabled and points at `./01__AppAssets__ValeVision/05__AppAssets__SkyDomes/HdriSkydome__RuralLandscape__AutumnField__SunnyDay__4k__.hdr` — a byte-identical copy of TrueVision's HDRI (MD5 verified), relocated into the proper app-assets tree mirroring TrueVision's `05__AppAssets__SkyDomes` convention. It is loaded lazily, only when MaxEngine activates, so PureEngine sessions never fetch the 4k HDR.
- AO `setSize` receives CSS pixels while the depth pre-pass RT is pixel-ratio scaled — ported as-is from TrueVision for visual parity (subtle SSAO sampling offset at DPR > 1).
- SSAO kernel is unseeded `Math.random()` (per TrueVision) — AO noise pattern varies per page load.

# ---------------------------------------------------------
## ValeVision3D v2.3.7 - 09-Jun-2026
### Navigation Modes — Walk and Fly Mode Port from TrueVision3D

**Overview**
Full port of Walk and Fly navigation modes from TrueVision3D into ValeVision3D. Both modes are gated by a per-model enable flag stored in `project.json` so legacy models are unaffected — Orbit remains the only mode unless a developer explicitly enables others. A new Dev-menu section lets the developer toggle Walk/Fly availability per model and save it to `project.json`. A new dynamic Tools menu section (hidden unless more than one mode is available) lets users switch between the enabled modes at runtime with a tri-state status indicator showing which mode is currently active. Doors open by proximity in both Walk and Fly modes, reusing ValeVision's existing door-proximity system unchanged.

**Files Added**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js` — Free-fly camera: smoothed velocity, yaw/pitch from Euler, no gravity or collision. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__DesktopControls.js` — WASD/QE/Space keyboard + pointer-lock mouse look for fly mode. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__TouchScreenControls.js` — Single-finger move, two-finger look, pinch vertical for fly mode on touch devices. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js` — Fly mode orchestration layer: init, toggle, door proximity wiring, render loop requests. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeEventListeners.js` — Alt+Shift+F hotkey and button wiring for fly mode. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__ModeTransition.js` — Smooth camera handoff between Orbit↔Walk and Orbit↔Fly; preserves orbit distance/elevation on return. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__NavigationModes__State.js` — Shared state accessor: stores Walk/Fly enabled flags read from project.json; drives hotkey gating and Tools menu visibility.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationModes__Controls.js` — User-facing Tools menu section: dynamically revealed when >1 mode is enabled; tri-state status badges; mutual exclusivity enforcement.
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__NavigationModes__DevControls.js` — Localhost-only dev section: Walk/Fly checkboxes + Save button (GET-merge-POST to `/api/projects/{code}`).

**Files Modified**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — Added `Na__WalkMode__GetSavedOrbitState`, `Na__WalkMode__ClampEntryPitch`, `Na__WalkMode__NudgeCapsuleForward` (required by ModeTransition); updated `Na__WalkMode__Deactivate` to accept `overrideCameraPosition` parameter.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js` — Routed activate/deactivate through `Na__Navmode__ModeTransition` for spatial continuity; stores camera ref for transition.
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — Added Fly Mode imports; reads `Navmode__EnabledModes` from project.json and sets state accessor; dispatches `na-navigation-modes-loaded` event; added Fly branch to `RenderFrame` with door-proximity update using fly camera position.
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — Added `Navmode__Settings.Navmode__FlyMode` block (all fly defaults), `Global__Hotkeys__ToggleFlyMode: Alt+Shift+F`, and `Navmode__EnabledModes` global default block (`Walk: false, Fly: false`).
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — Added `.na-navmode__btn`, `.na-navmode__btn--active`, `.na-navmode__status` tri-state button styles.
- `index.html` — Added Navigation Modes Tools menu HTML section (hidden by default); added Navigation Modes Dev menu HTML section; added Fly system imports; added FlyMode init; gated Walk/Fly hotkeys on per-model enable flags; added both new UI module init calls in Engine Entry Points.

**Architecture**
- Orbit is always on. Walk and Fly default to disabled in both AppConfig and project.json.
- `project.json` now supports an optional `Navmode__EnabledModes` key: `{ Navmode__EnabledModes__Walk: bool, Navmode__EnabledModes__Fly: bool }`.
- The loading sequence reads this key and broadcasts `na-navigation-modes-loaded` so the Tools menu and dev checkboxes update asynchronously without polling.
- The dev save writes the key back via the standard Flask GET-merge-POST to `/api/projects/{code}`; published to CDN via the normal git/GH Pages deployment flow.
- Door proximity is unchanged — fly mode reuses `3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` as-is; the render loop calls `Na__DoorProximity__Update(Na__FlyMode__GetCameraPosition())` while fly is active.

# ---------------------------------------------------------
## ValeVision3D v2.3.6 - 24-May-2026
### Profile Lines — Architectural Alignment with TrueVision (Mesh/Linework Discrimination Tags)

**Overview**
- Forward-looking, low-risk architectural port from TrueVision. ValeVision was already running fast and already had the basic `LineSegments2` filter in `collectMeshObjects`, but it was missing the explicit `userData.Na__ModelType` discrimination tags that TrueVision now uses. This port adds those tags + a defensive parent-chain guard so any future render effect (or collision/raycast/picking system) can cleanly filter "operate only on mesh roots" or "operate only on linework roots" without relying on `obj.isMesh` heuristics — which is unsafe because `LineSegments2` sets `isMesh = true` internally.
- No behaviour change in the current effect output. This is purely an architectural alignment so the two cousin codebases share the same discrimination contract.

**Why This Was Worth Doing Even Though ValeVision Is Already Fast**
- ValeVision currently uses `obj.isMesh && !obj.isLine2 && !obj.isLineSegments2` as the only filter in `collectMeshObjects`. That works for the current `LineSegments2` shape, but the moment any future loader produces a `Mesh` node nested inside a linework GLB tree (e.g. a hidden bounding mesh for frustum culling, or a debug placeholder), it would silently slip into the profile-colour material-swap pass and corrupt the linework's `LineMaterial`. The new third-line `Na__IsInsideLineworkGroup` guard prevents that class of bug from ever appearing.
- TrueVision now uses the same three-stage filter. Aligning ValeVision now means any future visual effect ported between the two apps will Just Work.

**Model Loader — Tagged Mesh and Linework Roots**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — both the priority-order loop AND the unordered-fallback loop now set:
    - `meshRoot.userData.Na__ModelType = 'mesh';` immediately after `Na__ModelLoader__LoadSingleMesh(...)` returns.
    - `lineworkRoot.userData.Na__ModelType = 'linework';` immediately after `Na__ModelLoader__LoadSingleLinework(...)` returns.
- These tags propagate to every descendant via the parent chain — they are read by walking `current.parent` upwards, so individual mesh nodes do NOT need to be tagged individually. One tag per GLB root is enough.
- Existing `Na__ProfileLineColorDominant` / `Na__ProfileLineColorByName` / `Na__ProfileLineColor` userData was left untouched — those are separate concerns (per-mesh dominant colour for the profile prepass) and continue to work as before.

**Profile Lines — Defensive Parent-Chain Guard**
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — added new helper `Na__IsInsideLineworkGroup(object)` that walks the ancestor chain testing for `userData.Na__ModelType === 'linework'`.
- `collectMeshObjects` now filters in three stages, each a defensive backstop for the next:
    1. `obj.isMesh` must be true (only real meshes considered).
    2. `obj.isLine2 / obj.isLineSegments2` must be false (fat-line shells set `isMesh = true` internally and must NEVER have their `LineMaterial` swapped).
    3. Ancestor chain must not be a linework GLB root (defensive: ignores any stray Mesh nodes nested inside a linework tree).
- The behaviour for the current scene graph is identical to before (the existing fat-line filter already caught everything that mattered). The architectural value is in stage 3 being there as a safety net for future scene graphs.

**Diagnostic Console Log (One-Shot Per Cache Rebuild)**
- `rebuildSceneCache` now logs `[ProfileLines] Scene cache rebuilt: N meshes (swap), M lines (hide)` after each rebuild. Fires once per scene-dirty event (typically once at startup, again on a model reload). Makes it trivial to confirm the mesh-vs-linework split is clean if you ever suspect something is being processed twice. Matches the same diagnostic added to TrueVision in its v2.2.5 port.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — added 4 `userData.Na__ModelType` tag assignments (2 in priority-order loop, 2 in unordered-fallback loop).
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — added `Na__IsInsideLineworkGroup` helper; expanded `collectMeshObjects` from a one-line `if` into a three-stage filter using the new helper; added one-shot diagnostic console log to `rebuildSceneCache`.

**Verification**
- No linter errors in either file.
- No behaviour change expected for current scenes; the existing `LineSegments2` filter already handled the only real-world case. New guard is a safety net.

**Known Future Opportunity (Not Done In This Pass)**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` `Na__WalkMode__SetCollisionMeshes` uses the same bare `if (!child.isMesh) return;` pattern (line ~280) and currently pushes every `LineSegments2` fat-line shell into the collision raycast set. ValeVision's collision counts are smaller than TrueVision's so this hasn't manifested as a felt slowdown, but it is the same architectural issue. Could be cleaned up in a future pass using the now-available `userData.Na__ModelType === 'linework'` tag.

# ---------------------------------------------------------
## ValeVision3D v2.3.5 - 21-May-2026
### Site Boundaries Toggle — Conditional Layer Support

**Overview**
- Added `Site Boundaries` as a first-class toggleable model layer, driven by the new `08__Site__Boundaries` SketchUp tag. When a project has boundary GLBs uploaded, a "Site Boundaries" toggle button appears automatically in the Model Parts List panel between "Doors" and "Landscape". Projects without boundary geometry are unaffected.

**Model Loader — Load Order**
- `"ValeVision__SiteBoundaries"` inserted into `Na__ModelCategories__LoadOrder` in `Na__ModelLoader__MultiModel.js` between `ProposedDoors` (tag 25) and `LandscapeEnvironment` (tags 07, 09), matching the tag-08 numeric position in the SSOT.
- The loader's URL parse regex already accepted `ValeVision__SiteBoundaries` filenames; no regex changes required.

**Toggle UI — Display Name**
- `"ValeVision__SiteBoundaries": "Site Boundaries"` added to `Na__ModelToggle__DisplayNames` in `Na__UiFeature__ModelToggle__Controls.js` at the correct position between ProposedDoors and Landscape.
- Button only appears when `TrueVision__SiteBoundaries__*` GLBs are present in the project's `valeVision_ModelUrls` array.

**Cloudflare Bucket Builder — Automatic project.json Sync**
- `AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` extended with a new `REGION | Project JSON Sync` containing four functions: `find_whitecardopedia_project_json`, `build_all_cdn_urls_for_project`, `refresh_project_json_model_urls`, `refresh_all_project_json_urls`.
- New **STEP 8** added to `main()` — runs after every execution (including when all R2 files are already up to date) to refresh `valeVision_ModelUrls` in every Whitecardopedia `project.json` from the current local GLB sync folder. Eliminates the previous requirement to manually run `AutomationUtil__FetchLocalProjects` after each new GLB export.
- `--dry-run-only` flag still suppresses all writes including STEP 8.
- Added `import json` to the script's imports.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — added `ValeVision__SiteBoundaries` to load order
- `02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` — added display name
- `Whitecardopedia/Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` — STEP 8 JSON sync

# ---------------------------------------------------------
## ValeVision3D v2.3.4 - 29-Apr-2026
### Dev Tools — Confirm Modals + Camera Configurations Grouping

**Overview**
- Added a shared in-app confirmation dialog that gates the four destructive Dev Tools writes to `project.json` so a stray click can no longer overwrite saved camera positions, fog settings, grid offsets, or orbit-max overrides.
- Reorganised the Dev Tools dropdown so "Save Camera Settings" and "Project Max Zoom Radius" no longer float as bare items at the top — both now live inside a single "Camera Configurations" submenu with proper section titles.

**Shared Confirm Dialog**
- New module `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js` exposing `Na__AppUtils__ConfirmDialog__Show({ title, message, confirmLabel, cancelLabel, isDestructive })` which returns a `Promise<boolean>`.
- Cancel / backdrop click / Escape resolve `false`; Confirm / Enter resolve `true`. Auto-cancels any prior open dialog so re-entry cannot leak listeners or promises. Falls back to `window.confirm()` if the modal markup is missing.
- Single `<div id="naConfirmDialog">` element added to `index.html` next to the toast notification, with backdrop, title, message, Cancel and Confirm buttons. Uses `aria-modal="true"` and `aria-hidden` toggling for accessibility.
- New CSS region appended to `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` covering `.na-confirm-dialog`, `.na-confirm-dialog__backdrop`, `.na-confirm-dialog__panel`, `.na-confirm-dialog__title|message|actions`, plus a destructive warm-red accent (`#b3382c`) via `.na-confirm-dialog__confirm--destructive`. No new stylesheet file — buttons reuse existing `na-dropdown-menu__action*` classes for visual consistency.

**Confirm-Gated Save Actions (project.json writes only)**
- Save Camera Settings — title "Overwrite Saved Camera?", message includes the project code.
- Save to Project (orbit max distance) — title "Save Orbit Max Override?", message includes the mm value and project code.
- Save Fog Settings — title "Overwrite Saved Fog Settings?".
- Save Grid Position — title "Overwrite Saved Grid Position?", message includes the project code.
- Apply Live, Clear from Project, Remove Plane A/B, and Place Fog Plane A/B were intentionally NOT gated (non-persistent or trivially redoable).

**Camera Configurations Submenu**
- Replaced the two floating items `naSaveCameraSettingsItem` and `naOrbitMaxDistanceItem` with one new submenu `Camera Configurations` (`naCameraConfigItem` / `naCameraConfigToggle` / `naCameraConfigPanel`).
- Inside the panel: a "Saved Camera + Orbit Target" heading with the Save Camera Settings action button, divider, then a "Project Max Zoom Radius" heading with the Effective display, Override input, and the Apply Live / Save to Project / Clear from Project buttons (flattened inline — no nested submenu).
- All inner control IDs preserved (`naSaveCameraSettingsButton`, `naOrbitMaxDistanceCurrent`, `naOrbitMaxDistanceInput`, `naOrbitMaxDistanceApply`, `naOrbitMaxDistanceSave`, `naOrbitMaxDistanceClear`) so existing JS bindings continue to work.
- `Na__UiFeature__SaveCameraSettings.js` now owns the wrapper visibility and the new submenu open/close toggle; lookup retargeted from `naSaveCameraSettingsItem` to `naCameraConfigItem`.
- `Na__UiFeature__OrbitMaxDistance__DevControls.js` had its now-redundant wrapper-reveal and submenu-toggle wiring trimmed (the parent submenu owns those concerns); only the inline orbit-max controls remain.

**Files Added**
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js`

**Files Changed**
- `index.html` — added `#naConfirmDialog` markup; replaced floating Save Camera + Project Max Zoom Radius items with a single `Camera Configurations` submenu containing both
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — appended `Confirm Dialog (Shared Destructive-Action Modal)` region with backdrop, panel, typography, and destructive-button styles
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — confirm-gated save; retargeted wrapper id to `naCameraConfigItem`; wired submenu toggle
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js` — confirm-gated save; removed redundant wrapper/submenu-toggle wiring
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js` — confirm-gated `Save Fog Settings` click handler
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js` — confirm-gated `Save Position` write inside `Na__GridUi__SavePositionToProject`

# ---------------------------------------------------------
## ValeVision3D v2.3.3 - 29-Apr-2026
### Orbit Max Zoom Distance — iPad +50% Bonus + Per-Project Override

**Overview**
- iPad / touch devices were noticeably more restricted than PC when zooming out from the helper cube. Added a config-driven multiplier so touch devices get +50% extra orbit-out distance by default while PC behaviour stays unchanged.
- Added a per-project override (`Navmode__OrbitMaxDistanceMm` in `project.json`) that replaces the per-device default for both PC and iPad equally — useful on the ~10% of projects with unusually large or small site footprints. iPad bonus does NOT stack on top of the project override.
- New "Project Max Zoom Radius" controls inside Dev Tools allow viewing the live effective cap, applying a value live for testing, saving it to `project.json` via the Flask API, or clearing it back to the per-device default.

**Default Config**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `Navmode__IpadControls__OrbitMaxDistanceMultiplier: 1.5` inside the existing `Navmode__IpadControls` block. iPad effective max becomes `50 m * 1.5 = 75 m` out of the box; PC stays at 60 m.

**Navigation Modules — Multiplier + Runtime-Mutable Cap**
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — multiplies `config.maxDistanceMm` by `config.maxDistanceMultiplier` (defaults to 1.0 when missing, so existing callers like Whitecardopedia / TestEnv are unaffected). Bundle now exposes `setMaxDistanceMm(mm)` for runtime mutation.
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — wheel-zoom clamp now reads `controls.maxDistance` live (instead of the closure-captured value) so post-init mutations affect both wheel and orbit equally. Same `setMaxDistanceMm(mm)` setter exposed.

**Per-Project Override Read in App Flow**
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — alongside the existing `Camera__DefaultPosition` and `OrbitHelperCube__Position` reads, captures `projectData.Navmode__OrbitMaxDistanceMm` and applies it to `Na__Controls__Orbit.maxDistance` post-fetch and pre-render-loop. iPad multiplier is intentionally NOT re-applied on top.

**index.html Wiring**
- Added `maxDistanceMultiplier` to the iPad branch of `Na__Navmode__ConfigPayload` so the iPad nav module receives the bonus from JSON.
- Initial Dev Tools dropdown markup added a top-level "Project Max Zoom Radius" submenu (subsequently flattened into the `Camera Configurations` submenu in v2.3.4).
- New init call `Na__UiFeature__InitializeOrbitMaxDistanceDevControls(...)` registered alongside `Na__UiFeature__InitializeSaveCameraButton(...)`.

**Dev Tools — New Module**
- New module `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js`. Mirrors the `Na__UiFeature__SaveCameraSettings.js` Flask round-trip pattern.
  - **Apply Live** — sets `controls.maxDistance` instantly via the nav-bundle setter, no persistence.
  - **Save to Project** — writes `Navmode__OrbitMaxDistanceMm` into `project.json`.
  - **Clear from Project** — deletes the key and restores the per-device default (PC: 60 m; iPad: 50 m × 1.5 = 75 m) by recomputing from the in-memory `Na__Navmode__ActiveConfig`.
- Live "Effective Max" display refreshed on every `OrbitControls 'change'` event, so panning/zooming reflects the cap immediately.
- All controls are localhost-gated via `Na__AppUtils__IsRunningOnLocalhost()` — production users never see them.

**Files Added**
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js`

**Files Changed**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `Navmode__IpadControls__OrbitMaxDistanceMultiplier: 1.5`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — applied multiplier to effective max distance; exposed `setMaxDistanceMm`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — wheel-zoom reads live `controls.maxDistance`; exposed `setMaxDistanceMm`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — applied `Navmode__OrbitMaxDistanceMm` from `project.json` post-fetch
- `index.html` — wired `maxDistanceMultiplier` into iPad payload; added initial `Project Max Zoom Radius` Dev Tools markup; imported and called the new dev-controls initializer

# ---------------------------------------------------------
## ValeVision3D v2.3.2 - 09-Apr-2026
### Email Workers — R2 CDN Contacts, BCC Admin Copy, Deployment Tooling

**Overview**
- Moved encrypted address book from Cloudflare Worker bundle to Cloudflare R2 CDN, enabling contact list updates without Worker redeployment.
- Frontend now fetches and decrypts the address book client-side using Web Crypto API (AES-256-GCM).
- Python encryption tool updated to upload directly to R2 via boto3 and auto-patch the decryption key into both `.dev.vars` and the frontend config JSON.
- Every outbound email is now BCC'd to the first contact in the encrypted address book (admin record-keeping). The BCC address is resolved at send time by the Worker fetching and decrypting the R2 address book — no email addresses are hardcoded or visible in committed code.
- Worker simplified to send-only (`/send` + `/verify-auth` + `/health`); contacts route removed.
- Added one-click deployment and local dev batch scripts.

**R2 CDN Contacts (replaces Worker /contacts route)**
- Encrypted address book uploaded to `cdn.noble-architecture.com/VaApps/ValeVision3D/data/Na__Email__AddressBook__Encrypted__.json`.
- New `Na__Feature__EmailWorkers__AddressBook__Decryptor__.js` — fetches encrypted JSON from CDN, decrypts with AES-256-GCM using key from config, returns normalised contact list.
- Config JSON now includes `ContactsCdnUrl` and `ContactsDecryptKeyB64` fields.
- Python encryption tool (`Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN`) now: encrypts → writes local copy → uploads to R2 → patches `.dev.vars` → patches config JSON. Single-command workflow.

**BCC Admin Copy**
- Worker reads `CONTACTS_CDN_URL` and `EMAIL_ADDRESSBOOK_KEY_B64` at send time, decrypts the address book, and uses the first entry's email as `bccRecipients` in the Microsoft Graph payload.
- BCC always fires, even when the admin is in the To list (enables self-test sends).
- If decryption fails, BCC is silently skipped — send still proceeds.

**Deployment Tooling**
- `CloudflareWorker/Deploy__Worker.bat` — loads API token from shared env file, deploys Worker, sets all Wrangler secrets.
- `CloudflareWorker/Dev__Worker.bat` — starts local dev server on port 8787 with `.dev.vars` secrets.
- Worker deployed to `https://valevision3d-email-worker.adam-fb3.workers.dev`.
- New `CLOUDFLARE_WORKERS_API_TOKEN` added to `Token__CloudflareAPI.env` (separate from R2 token, with Workers Scripts/KV/R2/Routes/D1 permissions).

**Security Fixes**
- Scrubbed leaked credentials from `.env.template` (all values replaced with `{{REDACTED}}`).
- Encryption tool no longer patches `.env.template` (only `.dev.vars` and config JSON).
- Removed hardcoded `BCC_ADMIN_EMAIL` from `wrangler.jsonc` — BCC address now derived from encrypted address book at runtime.
- Added `.wrangler/` to `.gitignore` to prevent build artifact commits.
- Force-pushed to erase intermediate commits containing leaked values from git history.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AddressBook__Decryptor__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Deploy__Worker.bat`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Dev__Worker.bat`

**Files Changed**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN` — added boto3 R2 upload, config JSON patching, removed `.env.template` patching
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__Config.json` — added CDN URL, decrypt key, verify-auth endpoint; changed API base URL to deployed Worker
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js` — contacts load via client-side decryptor instead of Worker API
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/src/index.js` — removed /contacts route and bundled JSON import; added BCC from R2 decrypt; simplified to send-only
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/wrangler.jsonc` — added account_id, CONTACTS_CDN_URL; removed BCC_ADMIN_EMAIL, ALLOWED_ORIGIN (moved to secret)
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.env.template` — all values replaced with `{{REDACTED}}`
- `.gitignore` — added `.wrangler/`, `.dev.vars`

# ---------------------------------------------------------
## ValeVision3D v2.3.1 - 09-Apr-2026
### Email Auth Overlay — Password-Gated Email Send Authorization

**Overview**
- Added a password authentication gate to the email send flow, preventing unauthorized use of the email system from publicly shared project links.
- When "Send email" is clicked, a password overlay appears requesting a shared internal password before the email is dispatched.
- Password is verified server-side by the Cloudflare Worker using timing-safe comparison against a Wrangler secret, returning an HMAC-SHA256 signed token valid for 30 days.
- The signed token is stored in `localStorage` and automatically included with subsequent send requests, so the password only needs to be entered once per month.

**New Frontend Modules**
- `Na__Feature__EmailWorkers__AuthOverlay__.js` — vanilla JS modal DOM builder with password input, show/hide toggle (eye icon), error display with shake animation, Submit/Cancel buttons, Enter/Escape keyboard support, and loading state during verification.
- `Na__Feature__EmailWorkers__AuthManager__.js` — `localStorage` token persistence (`valevision3d_email_auth_token` + `valevision3d_email_auth_expiry`) with `hasValidAuthToken()`, `saveAuthToken()`, `clearAuthToken()`, and `ensureAuthorized()` orchestrator that creates the overlay, calls the verify endpoint, and resolves with the token on success.

**Cloudflare Worker Changes (`src/index.js`)**
- New `POST /api/email/verify-auth` route — rate-limited to 5 password attempts per hour per IP (separate bucket from send), compares submitted password to `EMAIL_AUTH_PASSWORD` Wrangler secret using `crypto.subtle.timingSafeEqual`, returns an HMAC-SHA256 signed token with 30-day expiry on success.
- HMAC token utilities — `Na__EmailApi__CreateHmacToken` creates `base64url(payload).base64url(signature)` tokens, `Na__EmailApi__VerifyHmacToken` verifies signature and expiry.
- `POST /api/email/send` now requires `Authorization: Bearer <token>` header — validates the HMAC token signature and expiry before processing.
- CORS `Access-Control-Allow-Headers` updated to include `Authorization`.
- `ALLOWED_ORIGIN` moved from `wrangler.jsonc` `vars` to a Wrangler secret, eliminating `.dev.vars` override conflicts during local development.

**New Wrangler Secrets**
- `EMAIL_AUTH_PASSWORD` — the shared password for email send authorization.
- `EMAIL_AUTH_TOKEN_SECRET` — random 32+ character HMAC-SHA256 signing key for auth tokens.
- `ALLOWED_ORIGIN` — moved from plaintext vars to encrypted secret.

**Deployment Tooling**
- `CloudflareWorker/Deploy__Worker.bat` — one-click deploy script that loads the Cloudflare API token from `Token__CloudflareAPI.env`, deploys the Worker, and sets all Wrangler secrets.
- `CloudflareWorker/Dev__Worker.bat` — one-click local dev server launcher (`wrangler dev` on port 8787).

**Files Modified**
- `Na__Feature__EmailWorkers__ApiClient__.js` — added `verifyAuth(password)` method and `Authorization: Bearer` header on `sendEmail()`.
- `Na__Feature__EmailWorkers__UiInteractionLogic__.js` — `btnSend` handler now calls `ensureAuthorized()` before building payload; aborts silently on cancel.
- `Na__Feature__EmailWorkers__Config.json` — added `EmailWorkers__Config__VerifyAuthEndpoint: "/verify-auth"`.
- `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` — added auth overlay CSS region (z-index 3200, fade/slide-up animations, error shake animation).
- `CloudflareWorker/wrangler.jsonc` — removed `ALLOWED_ORIGIN` from vars, documented new secrets in comments.
- `CloudflareWorker/.dev.vars` — added `ALLOWED_ORIGIN`, `EMAIL_AUTH_PASSWORD`, and `EMAIL_AUTH_TOKEN_SECRET` for local dev.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AuthOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AuthManager__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Deploy__Worker.bat`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Dev__Worker.bat`

# ---------------------------------------------------------
## ValeVision3D v2.3.0 - 09-Apr-2026
### Email Workers — Internal Send-Email System via Microsoft Graph

**Overview**
- New "Send project email" feature in the Tools menu allowing users to send the ValeVision3D project share email directly to colleagues from within the app, without leaving the browser or using an external mail client.
- Uses a Cloudflare Worker backend that authenticates via Cloudflare Access JWT, decrypts an AES-256-GCM-encrypted internal address book, and sends HTML email through Microsoft Graph (client-credentials OAuth2 flow).
- Autocomplete recipient input with chip-based selection (Outlook-style) driven by the encrypted address book.
- Per-IP rate limiting (10 emails per hour, configurable).

**New Module: `62__Feature__EmailWorkers`**
- `Na__Feature__EmailWorkers__Config.json` — API routing config with localhost override for local dev.
- `Na__Feature__EmailWorkers__ApiClient__.js` — fetch wrapper with AbortController timeout, config-driven endpoint resolution, contacts and send methods.
- `Na__Feature__EmailWorkers__FormOverlay__.js` — programmatic modal DOM builder with recipients chip container, greeting names input, notes textarea, Cancel / Generate & download / Send email buttons.
- `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` — modal overlay CSS with chip, suggestion dropdown, and button styles matching the Vale Design Suite palette.
- `Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js` — chip-input controller with address-book filtering, freeform email entry, keyboard shortcuts (Enter, comma, semicolon), and click-to-remove chips.
- `Na__Feature__EmailWorkers__PayloadBuilder__.js` — assembles send payload by combining selected recipients with the existing Share Project Link email template (reuses `BuildEmailHtml` from `61__Feature__ShareProjectLink`).
- `Na__Feature__EmailWorkers__UiInteractionLogic__.js` — wires Tools menu button, overlay show/hide with chevron sync, non-blocking background contacts load, generate-download flow, and send-email flow with loading state and toast feedback.

**Cloudflare Worker: `62__Feature__EmailWorkers/CloudflareWorker`**
- `src/index.js` — Worker entry with CORS preflight, Cloudflare Access JWT verification (auto-bypassed in dev when team domain is unconfigured), AES-GCM address book decryption, Microsoft Graph `sendMail` via client-credentials token, per-IP sliding-window rate limiter, and health endpoint.
- `wrangler.jsonc` — Worker config with non-secret env vars (tenant ID, client ID, sender user, allowed origin, rate limit).
- `package.json` — dependencies: `jose` for JWT verification, `wrangler` for dev/deploy.
- `assets/Na__Email__AddressBook__Encrypted__.json` — AES-256-GCM encrypted address book (committed to git, safe to be public).
- `.env.template` — reference file listing all required env vars with placeholder values.
- `.dev.vars` — local dev secrets loaded automatically by `wrangler dev` (gitignored).

**Address Book Encryption Tooling**
- `Na__Email__AddressBook__Source__.json.--HIDDEN` — plaintext contact list (14 contacts, gitignored via `*.--HIDDEN` pattern).
- `Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN` — Python script using `cryptography` library for AES-256-GCM encryption. Generates a random 256-bit key, encrypts the contacts, writes the encrypted JSON to the Worker assets folder, and auto-patches the key into `.dev.vars` and `.env.template`. Single-command workflow for adding new contacts.

**Tools Menu Integration**
- New "Send project email" menu item added between "Share project link" and "Enter Full Screen" in the Tools & Settings dropdown.
- Reuses the Share Link icon asset.

**`.gitignore` Updates**
- Added `*.--HIDDEN` pattern to hide plaintext address book source and encryption tooling from git.
- Added `.dev.vars` pattern to hide wrangler local dev secrets.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__Config.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__ApiClient__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__PayloadBuilder__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__Source__.json.--HIDDEN`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/src/index.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/wrangler.jsonc`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/package.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/assets/Na__Email__AddressBook__Encrypted__.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.env.template`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.dev.vars`

**Files Changed**
- `index.html` — added Send Email menu item HTML, module import, and initialisation call
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` — added CSS import for email overlay stylesheet
- `.gitignore` — added `*.--HIDDEN` and `.dev.vars` patterns

# ---------------------------------------------------------
## ValeVision3D v2.2.0 - 07-Apr-2026
### Fog Plane System — Planar Fog with Camera Force Field

**Overview**
- Complete replacement of the old orbit-anchored radial fog system (which never rendered correctly) with a new planar fog system that lets users place up to two configurable fog planes to mask off sections of a building model.
- Each fog plane acts as both a visual fog boundary and a camera force field, preventing navigation into the fogged zone.

**New System: `29__System__FogPlaneSystem`**
- `Na__FogPlaneSystem__Config.json` — default fall-off distance, slider step values (250mm–20000mm), plane visual style (blue semi-transparent), camera constraint padding, fog colour.
- `Na__FogPlaneSystem__FogShaderEffect.js` — custom post-processing `ShaderPass` with GLSL fragment shader that reconstructs world position from the logarithmic depth buffer and computes signed distance from up to two world-space planes. Fall-off uses `smoothstep` between the plane surface and the configured distance. Background pixels are projected to `cameraFar` so linework and profile-line edges at geometry silhouettes are fogged correctly.
- `Na__FogPlaneSystem__PlaneCreation.js` — click-to-place system modelled on the Elevation View tool. Raycasts against model meshes, snaps the face normal to the nearest cardinal axis (X or Z), builds a blue semi-transparent `PlaneGeometry` group with a draggable inner handle. Drag moves the plane along its normal via screen-Y delta.
- `Na__FogPlaneSystem__CameraConstraint.js` — per-frame camera position clamping with configurable padding. Pushes camera and orbit target back to the plane surface if they cross to the fog side. Active even when planes are visually hidden.
- `Na__FogPlaneSystem__SaveSettings.js` — per-project save/load using the same GET-merge-POST pattern as the camera and grid save systems. Data stored under `FogPlane__Config` in `project.json`.
- `Na__FogPlaneSystem__SystemLogic.js` — main orchestrator: async config load, sub-module initialisation, fog pass creation, saved-state restoration, per-frame update dispatch, clipping-plane helpers.
- `Na__FogPlaneSystem__UiControls.js` — Dev Tools panel wiring: fog enable toggle (off by default), plane visibility toggle, discrete-step fall-off slider, Place Plane A/B buttons, Remove buttons, Save button.

**Dev Tools UI**
- New "Fog Effect" dropdown added to the Dev Tools menu with: Enable Fog toggle, Show Planes toggle, Fall-off Distance slider (250mm, 500mm, 1m, 2m, 2.5m, 5m, 10m, 20m), Place Fog Plane A/B buttons, Remove Plane buttons (appear after placement), Save Fog Settings button.

**Render Pipeline Changes**
- Fog `ShaderPass` is late-inserted into the `EffectComposer` chain (after Profile Lines, before FXAA) via a new `insertFogPass` method on the pipeline state object. This handles the async system initialisation that completes after the composer is already built.
- Fog shader correctly covers profile-line Sobel edges and linework at geometry silhouettes by projecting background-depth pixels (depth = 1.0) to `cameraFar` distance instead of skipping them. The normal prepass hides `LineSegments2` so the depth buffer has no linework data; the far-distance projection ensures those pixels still go through the fog calculation.

**Old System Removed**
- Deleted `Na__Scene__DefaultFogEffect.js` (orbit-anchored radial fog shader that never worked).
- Removed `Scene__Default__FogConfig` from `Na__AppConfig__Main.json`.
- Stripped all old fog imports, calls, state caching, and elevation-mode fog toggling from `index.html` and `Na__AppFlow__LoadingSequence.js`.
- Scene background set directly to white (`0xffffff`) instead of via the old fog helper.

**Files Added**
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__Config.json`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__FogShaderEffect.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__PlaneCreation.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__CameraConstraint.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SaveSettings.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js`

**Files Deleted**
- `02__Src__AppModules/07__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js`

**Files Changed**
- `index.html` — removed old fog imports/config/setup; added white background; added fog UI HTML to Dev Tools; added fog UI import and init call; added `showToast` passthrough to loading sequence context
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — removed old fog imports/state/per-frame update/elevation fog toggle; added fog system import and async init after model load; added fog pass pipeline insertion; added fog per-frame update in render loop
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — removed `Scene__Default__FogConfig` block
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — added `insertFogPass` method for late fog pass insertion into the composer chain; exposed in return object

# ---------------------------------------------------------
## ValeVision3D v2.1.5 - 07-Apr-2026
### Scene Inspector — Copy Tree to Clipboard

**Overview**
- Added a Copy Tree button to the Scene Inspector toolbar that serialises the last scanned node tree to plain text and writes it to the clipboard in two report formats.

**Feature Details**
- Copy Tree button added to the Scene Inspector toolbar row alongside Hide All, Restore All, and Isolate Pair.
- Button provides inline visual feedback: label changes briefly to `Copied!`, `Failed`, or `No scan yet` before restoring.
- Output contains two sections separated by dividers:
  1. **Concise Report** — type and node name only, indented with 4 spaces per level offset by 1 (Scene's direct children start flush; indentation begins at depth 2).
  2. **Full Report With States & Statistics** — pipe-separated fields: `Type Name  |  N triangles  |  Visible = True/False`. Triangle count segment only shown for Mesh nodes.
- Last scanned tree is cached in module state (`Na__SceneInspector__LastScannedTree`) after each Rescan so the copy operation does not require re-traversal.

**Files Changed**
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__SceneInspector__Controls.js` — new `REGION | Copy Tree to Clipboard` with `BuildNodeTextLineConcise`, `BuildNodeTextLineFull`, updated `WalkTreeToText` (lineBuilder callback), `CopyTreeToClipboard`; new DOM ID constant; new state variable; tree cache in scan handler; copy button wired in init
- `index.html` — Copy Tree button added to Scene Inspector toolbar

# ---------------------------------------------------------
## ValeVision3D v2.1.4 - 20-Mar-2026
### Tools Menu — Share Link + Full Screen Icon Update

**Overview**
- Updated the Tools menu icon wiring so the new dedicated Share Link and Full Screen icon assets are now used by their matching feature rows.

**UI Changes**
- Share project link row now uses `Icon__ToolsMenu__ShareLink__540p__.png`.
- Full screen row now uses `Icon__ToolsMenu__FullScreen__540p__.png`.
- Removed temporary text-based fullscreen icon styling now that the image icon is active.

**Files Changed**
- `index.html` — swapped icon source paths for Share Link and Full Screen rows.
- `02__Src__AppModules/60__Feature__FullScreenMode/Na__Feature__FullScreenMode__Stylesheet__.css` — removed `.na-dropdown-menu__btn-icon--text` styling block.

# ---------------------------------------------------------
## ValeVision3D v2.1.3 - 13-Mar-2026
### Tools Menu — Icon Set Added

**Overview**
- Added custom icon set to the Tools dropdown menu to improve visual clarity and reduce reliance on text-only labels.

**Icons Added**
- Five 540p PNG icons added to `01__AppAssets__ValeVision/UiIcons__MenuIcons__ToolsMenu/`:
  - `Icon__ToolsMenu__CameraSettings__540p__.png`
  - `Icon__ToolsMenu__ExportImage__540p__.png`
  - `Icon__ToolsMenu__GridSystem__540p__.png`
  - `Icon__ToolsMenu__ViewModelLayers__540p__.png`
  - `Icon__ToolsMenu__ElevationView__540p__.png`

**UI Changes**
- Each Tools menu button now displays its icon to the left of the label at 24px (1.2× base size).
- Icon uses `opacity: 0.75` to sit subordinate to the text label.
- `.na-dropdown-menu__btn-icon` and `.na-dropdown-menu__btn-label` CSS classes added to `Na__UiFeature__Styles__DropdownAndToast__.css`.
- Menu item order updated: Grid Lines moved to third position (above Toggle Model Layers).

**Files Changed**
- `index.html` — icon `<img>` elements and `<span>` label wrappers added to all 5 Tools menu buttons; Grid Lines item reordered to position 3
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — `.na-dropdown-menu__btn-icon` and `.na-dropdown-menu__btn-label` classes added

# ---------------------------------------------------------
## ValeVision3D v2.1.2 - 13-Mar-2026
### Elevation View — Grid Origin Plane Anchor

**Overview**
- Elevation planes are now anchored to the project's saved grid origin (the red X marker) rather than the raw raycast hit point. This aligns the elevation coordinate system to the project UCS so orthographic views are centred on the correct site reference point.

**New Module**
- `Na__ElevationView__OffsetPlane__ToProjectGridOrigin.js` — fetches the project's persisted `GridLine__Grid__Offset__Config` from the Flask API, converts `OffsetXMm`/`OffsetZMm` to Three.js units (Z negated to match the grid convention), and caches the result as a `THREE.Vector3`. Exports `Na__ElevOffsetPlane__LoadGridOrigin()` (async, called at init) and `Na__ElevOffsetPlane__GetGridOriginPoint()` (synchronous getter).

**Anchor Logic**
- A new `Na__Elev__GridAnchorPoint` state variable holds the resolved anchor: XZ from the grid origin, Y from the raycast hit point. This replaces `Na__Elev__HitPoint` as the positional anchor in both `Na__Elev__UpdatePlaneTransform` and `Na__Elev__UpdateOrthoCameraTransform`.
- If no grid origin is loaded (no project code, or project has no saved grid offset), the anchor falls back to the hit point — preserving the original behaviour.

**Freeform Nudge Config**
- Added `ElevationView__Plane__Config__AnchorOffsetXMm` and `ElevationView__Plane__Config__AnchorOffsetZMm` to `Na__ElevationView__Config.json` (both default `0`). These allow the anchor to be nudged away from the grid origin in world XZ without changing the saved grid UCS.

**Files Added**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__OffsetPlane__ToProjectGridOrigin.js`

**Files Changed**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__SystemLogic.js` — import, state variable, init call, anchor computation, plane and camera transform updates, cleanup reset
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__Config.json` — two new anchor offset keys

# ---------------------------------------------------------
## ValeVision3D v2.1.1 - 13-Mar-2026
### Grid Lines System — Configurable Scene Grid Overlay

**Overview**
- New Grid Lines system allowing users to overlay a configurable grid on the XZ plane. The grid is disabled by default and must be enabled via the "Show Grid" toggle in the toolbar. All parameters are driven by a dedicated JSON configuration file.

**Grid Controls**
- Grid Size: discrete steps (100mm, 250mm, 500mm, 1000mm, 2000mm, 2500mm, 5000mm) controlling cell spacing.
- Grid Height: linear slider (-1000mm to 1000mm, 100mm step) to raise or lower the grid plane along Y.
- Grid Style collapsible section containing:
  - Line Width: discrete pixel steps (0.10, 0.25, 0.50, 1.00, 1.50, 3.00 px) using Three.js addons fat lines (`LineMaterial` / `LineSegments2`) for accurate GPU-rendered width control — standard `LineBasicMaterial` linewidth is capped at 1px on most hardware.
  - Line Type: Solid, Dashed, or Dotted via `LineMaterial` dashing properties.
  - Line Colour: predefined palette dropdown (Grey, Red, Black, Mid Grey, Vale Blue).
  - Line Opacity: slider (20%–100%, default 50%) with transparent material blending.
  - Line Gap Size: scalar slider (0.2x–5.0x) visible only for Dashed/Dotted types.
- Localhost-only Grid Position section: X and Z axis offset sliders with a "Save Position" button that persists the current offsets and height to the project JSON via the Flask API (same pattern as Save Camera Settings). On next load, persisted offsets are read back from the project JSON and applied as initial slider values.

**Technical Approach — Fat Lines**
- Replaced `THREE.LineBasicMaterial` / `THREE.LineSegments` with `LineMaterial` / `LineSegments2` / `LineSegmentsGeometry` from `three/addons/lines` for robust line width rendering across all hardware.
- `LineMaterial.resolution` is updated on window resize to maintain correct pixel-width rendering.
- Z-axis offset is negated internally in the creation logic so the config and UI use intuitive positive values while correctly mapping to Three.js right-handed coordinates.

**Origin Marker (Localhost Dev Aid)**
- A red X marker renders at the grid origin on localhost, moving with X/Z position offsets to help align the grid to the model during development.

**Default State**
- Grid is disabled on startup. The user must check the "Show Grid" toggle to display it. No grid geometry is created until the user enables the toggle.

**Files Added**
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__Config.json`
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__GridCreationLogic.js`
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js`

**Files Changed**
- `index.html` — Grid Lines menu HTML, import, and initialization call with toast callback and pipeline ref

**Bug Fixes**
- Fixed a spurious white rectangle appearing near the origin when the grid was enabled. Root cause: the profile lines system caches scene objects once on init and never re-checks when new objects are added. Each call to `Na__GridLine__Update` disposes and recreates `LineSegments2` objects, leaving the cache pointing to stale references. The new objects were not hidden before the normal prepass, so `scene.overrideMaterial = MeshNormalMaterial` rendered their internal template quad as a white filled plane with profile edges. Fix: `invalidateProfileLinesCache()` is now called via the pipeline ref on every grid geometry rebuild (`Na__GridUi__ApplyUpdate`) and on every enable/disable toggle, forcing the cache to rebuild before the next render pass.

**Elevation View Config — MM Units**
- Elevation plane config values (Width, Height, Offset, LiftY, HandleWidth, HandleHeight) now use millimeters in `Na__ElevationView__Config.json` and are converted to scene units via `Na__Math__ConvertMmToUnits()` in `Na__ElevationView__SystemLogic.js`, aligning with AppConfig conventions.

# ---------------------------------------------------------
## ValeVision3D v2.1.0 - 13-Mar-2026
### Vertical Perspective Correction — Architectural Line Straightening

**Overview**
- New feature that corrects the perspective distortion of vertical lines when the camera is tilted up or down, a critical requirement for architectural imagery. When enabled, vertical world lines render as true pixel-aligned verticals in both the live viewport and all image exports.

**Technical Approach — Projection Matrix Shear**
- Applied a shift-lens correction directly to `camera.projectionMatrix` rather than a post-process shader, eliminating resampling artifacts.
- Each rendered frame: `camera.updateProjectionMatrix()` resets to a clean symmetric frustum, then `elements[9] += tan(pitch) * elements[5]` shifts the frustum asymmetrically to cancel vertical convergence. `projectionMatrixInverse` is kept in sync for correct raycasting.
- The pitch angle is derived from `camera.getWorldDirection()` each frame, so the correction tracks any camera movement in real time.
- `camera.updateProjectionMatrix()` is called at the start of `ApplyFrame` every frame to prevent the shear from compounding across frames — ensuring the horizon stays level.

**Navigation Lock**
- When vertical correction is active, orbit controls are disabled to prevent the jarring camera drift loop that occurs when navigating with the shear applied.
- A centred overlay notification ("Navigation locked — Vertical Correction is active") appears and fades automatically after 3 seconds.
- Any attempted navigation input (mouse, wheel, touch) while locked re-shows the notification so the user is clearly informed.

**Export Pipeline Integration**
- The correction is applied in both the "Download Image" (PNG) and "Create Drawing" (Layout View) export paths.
- In custom-resolution export mode, `camera.updateProjectionMatrix()` is called internally to apply the export aspect ratio, which previously wiped the shear. `Na__VerticalCorrection__ApplyFrame()` is now called immediately after to re-apply the correction before `composer.render()` fires.
- After the export restore block, `ApplyFrame()` is called again so the live viewport remains corrected immediately without waiting for the next render-loop frame.
- All calls are no-ops when the feature is disabled, with zero impact on users not using the toggle.
- Elevation view exports are unaffected (guarded by existing `isElevationMode` checks).

**UI**
- "Vertical Correction" toggle checkbox added inside the "Adjust Field of View" panel, below the Camera Lens Width slider, separated by an HR divider.
- Inherits the existing fold/collapse behaviour — the panel opens automatically when Export Image is clicked.
- HR divider also added in the Export Image panel between the Resolution slider and the Enhance Whitecard toggle for improved visual breathing room.

**Files Added**
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__Controls.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__NavLockNotification.js`

**Files Changed**
- `index.html` — toggle HTML, import, and initialization call with orbit controls reference
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — `Na__VerticalCorrection__ApplyFrame()` called in render loop after navigation updates
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraLens__Controls.js` — `ApplyFrame()` called after `updateProjectionMatrix()` in `applyLens()` so FOV changes preserve the correction
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js` — import + two `ApplyFrame()` insertions in custom export path
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — `.na-dropdown-menu__panel-divider` HR style + `.na-navlock-notification` overlay styles

# ---------------------------------------------------------

# ---------------------------------------------------------
##  ValeVision3D v2.0.8 - 12-Mar-2026
### Image Export Fix — Download Image Black Output + Elevation-Aware 2D Pipeline

**Overview**
- Fixed "Download Image" producing black PNGs, main-thread hang, and memory leak. Create Drawing (Layout View) already worked; root cause was synchronous render capture outside `requestAnimationFrame` plus blocking `toDataURL()` at 4K.
- Added elevation-aware export so Download Image and Create Drawing correctly render the 2D orthographic elevation view when the user is in Elevation View mode, instead of the 3D perspective pipeline.

**Download Image — Black Image + Hang Fix**
- Extracted `Na__UiFeature__RenderToCanvas` from `Na__UiFeature__RenderToDataUrl`; always copies WebGL framebuffer to a 2D offscreen canvas immediately after `render()` for reliable pixel readback regardless of `preserveDrawingBuffer`.
- Wrapped export handler in double `requestAnimationFrame` (same pattern as Create Drawing) so render and capture occur within a proper animation frame lifecycle.
- Replaced synchronous `canvas.toDataURL('image/png')` with async `canvas.toBlob()` + `URL.createObjectURL()` + `URL.revokeObjectURL()` to avoid blocking the main thread and large base64 string retention at 4K–6K resolution.
- Added loading overlay (phases: "Rendering Your Image...", "Encoding Image...", "Download Ready!") reusing the existing Layout View overlay system for visual feedback on slower devices.

**Elevation-Aware Export**
- Created `Na__ElevationView__ExportOverrides.js` in `40__System__2dElevationsView`. Listens for `na-elevation-camera-changed` to capture the ortho camera and 2D profile normals renderer.
- `Na__ElevationView__GetExportOverrides()` returns `null` in 3D mode, or an overrides object with `camera`, `renderProfileNormals`, `resizeFrustum`, `restoreFrustum` when in `VIEWING_ELEVATION`.
- `Na__UiFeature__RenderToCanvas` now accepts optional `getElevationOverrides`; when non-null, uses 2D profile normals and ortho camera instead of 3D pipeline, and updates ortho frustum for custom-resolution exports while preserving zoom level.
- Zero impact on real-time renderer; no `preserveDrawingBuffer` change; export logic branches only at export time.

**Files Added**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__ExportOverrides.js`

**Files Changed**
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`
- `index.html`

# ---------------------------------------------------------
## ValeVision3D v2.0.8  -  12-Mar-2026
### Elevation View System — 2D Elevation Tool

**Overview**
- New Elevation View tool allowing users to click a building face, place a configurable plane, and switch to a true orthographic 2D elevation view with independent profile lines rendering and 2D navigation controls.

**Elevation View — Core System (`Na__ElevationView__SystemLogic.js`)**
- Click any building face to define the elevation direction via raycasting and XZ-projected normals.
- Semi-transparent red-tinted plane spawns offset from the selected face with directional corner arrows indicating the camera look direction.
- Inner drag-handle rectangle with "Click and drag to set plane" label — only clicking this smaller region initiates constrained plane dragging along the face normal axis.
- Orthographic camera created and aligned to the horizontal face normal for perfect parallel projection.
- View switching between perspective orbit (3D) and orthographic elevation (2D) with automatic plane hide/show.
- Left-click-only drag restriction with orbit controls suppressed during drag and restored on release.

**2D Profile Lines Renderer (`Na__RenderEffect__2dProfileLines__.js`)**
- Independent 2D profile lines module sharing the 3D system's normal and colour render targets.
- Renders with the ortho camera instead of the captured perspective camera, fixing stale/misaligned profile line artifacts.
- Fixed edge width (no distance-based scaling) set once on activation from config, simplifying the 2D render pipeline.
- Render loop dynamically switches between 3D and 2D profile lines based on elevation mode state.

**2D Navigation Controls**
- `Na__ElevationNav__DesktopControls.js` — middle mouse + drag or right-click + drag for pan; scroll wheel for zoom; directly manipulates ortho camera position and frustum.
- `Na__ElevationNav__TouchScreenControls.js` — single finger drag for pan; two-finger pinch for zoom with simultaneous pan; prevents default touch behaviour.
- Controls activate on entering elevation view and deactivate on return to 3D.
- Zoom step, min, and max driven by config JSON with fallback defaults.

**Elevation View Config (`Na__ElevationView__Config.json`)**
- Four config sections: Plane, Camera, 2dProfileLines, Navigation.
- Plane section drives outer plane dimensions/appearance, inner drag handle size/opacity, label text, and directional arrow length/colour.
- Camera section covers ortho frustum half-height, camera distance, click threshold, and drag sensitivity.
- Async `fetch()` at init with per-key fallback defaults for graceful degradation.

**3D Fog Disabled in Elevation Mode**
- `uFogEnabled` uniform toggled to 0.0 when entering ortho view, restored when returning to 3D.
- Placeholder for future 2D fog plane system.

**UI Controls (`Na__UiFeature__ElevationView__Controls.js`)**
- Elevation View dropdown menu with "View Elevation", "Back To 3D", "Toggle Elevation Plane", and "Reselect Elevation Plane" actions.
- State-driven button visibility reacting to custom `na-elevation-state-changed` events.

# ---------------------------------------------------------


# ---------------------------------------------------------
## ValeVision3D v2.0.7  -  12-Mar-2026
### Page Layout System — Config Externalisation

**Overview**
- Created a standalone `Na__PageLayoutSystem__Config.json` that externalises every hard-coded parameter from the six Page Layout System JS modules.
- All sub-modules now read their settings from `state.config` (attached at boot) with typed fallback defaults for graceful degradation if the config fetch fails.
- Follows the project double-underscore naming convention (`PageLayout__Document__Config__WidthMm`, etc.) matching `Na__AppConfig__Main.json`.

**Config File — `Na__PageLayoutSystem__Config.json`**
- Four config sections covering the entire layout system:
  - `PageLayout__Document__Config` — A3 dimensions, title block path, fit-to-page padding, initial image placement fraction.
  - `PageLayout__PdfExport__Config` — PDF orientation, format, DPI, JPEG quality, compression, float precision, export filenames.
  - `PageLayout__CanvasAppearance__Config` — background colour, paper shadow, selection handle appearance, image border styling.
  - `PageLayout__Navigation__Config` — zoom min/max/factor, mouse hit radius, touch hit radius, minimum image size, minimum visible clipping.

**Loading Strategy**
- `Na__PageLayout__FetchConfig()` added to `SystemLogic__Main__` — fetches the JSON at boot with `try/catch` fallback.
- `Na__PageLayout__ResolveDocumentConfig()` extracts document settings with per-key type checks and fallback values.
- The full raw config object is attached to `state.config` so every sub-module reads its own section independently.
- Helper functions (`CalculateFitToPage`, `CalculateInitialImageTransform`) refactored to accept their previously hard-coded values as parameters from the resolved config.

**Sub-Module Config Resolution**
- `PdfExport__A3__` — `Na__PageLayout__ResolvePdfConfig(state)` reads all export parameters; `CreateDocument` and `FlattenSheetToDataUrl` now use the resolved config.
- `CanvasRenderPipeline__` — `Na__PageLayout__ResolveAppearanceConfig(state)` reads all visual styling; appearance object threaded through all draw functions.
- `2dNavigationControls__` — `Na__PageLayout__ResolveNavConfig(state)` reads zoom limits and step; resolved once at init.
- `Controls__Pc__` — `Na__PageLayout__ResolvePcConfig(state)` reads hit radius and minimum dimensions; removed obsolete render pipeline import.
- `Controls__TouchScreen__` — `Na__PageLayout__ResolveTouchConfig(state)` reads touch hit radius, zoom limits, and minimum dimensions.

**Files Added**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Config.json`

**Files Changed**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__CanvasRenderPipeline__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__2dNavigationControls__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.6  -  12-Mar-2026
### PDF Export — Canvas Corruption Fix, JPEG Pipeline & Data Validation

**Overview**
- Diagnosed and fixed vertical-stripe corruption in exported PDFs caused by browsers silently capping the 600 dpi offscreen canvas (`9921 × 7016 px`, ~70 M pixels).
- Switched the flattened sheet from PNG to JPEG (0.92 quality) for a 5-10× reduction in data URL size and memory pressure.
- Added three layers of validation to prevent corrupt PDFs from being saved.

**Root Cause — Canvas Dimension Capping**
- At 600 dpi the A3 offscreen canvas requests 9921 × 7016 px (~278 MB RGBA buffer).
- Some browser/GPU combinations silently allocate a smaller backing store while still reporting the requested `canvas.width`/`canvas.height`.
- `toDataURL` then serializes pixel data with the wrong row stride, producing the characteristic vertical-stripe corruption visible in the PDF.

**Canvas Allocation Validation**
- After setting `canvas.width` and `canvas.height`, a new guard checks the actual allocation matches the request; returns `null` with a descriptive console error if capped.
- Added a `getContext('2d')` null-check for total allocation failure.

**PNG → JPEG Switch**
- `FlattenSheetToDataUrl` now serializes as `image/jpeg` at `Na__PageLayout__JPEG_QUALITY` (0.92) instead of `image/png`.
- `addImage` format parameter changed from `'PNG'` to `'JPEG'` in both export functions.
- New constants: `Na__PageLayout__JPEG_QUALITY`, `Na__PageLayout__MIN_DATAURL_LEN`.

**Data URL Validation**
- The returned data URL is checked for null, empty, or suspiciously short length (< 1000 chars) before being passed to jsPDF.
- Both `ExportFullLayout` and `ExportImageOnly` now check for a `null` return from the flatten function and abort cleanly — no corrupt PDF is saved.

**Files Changed**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.5  -  12-Mar-2026
### Viewport Refresh — Camera Lens Slider & Post-Export Repaint

**Overview**
- Fixed two missing render-invalidation calls that prevented the viewport from updating after camera lens adjustments and after an image export completed.
- The app uses an invalidation-based render loop (`Na__RenderLoop__RequestRender`); these two systems were never wired into it.

**Camera Lens Slider — Real-Time FOV Feedback**
- `Na__UiFeature__CameraLens__Controls.js` — added `Na__RenderLoop__RequestRender` import from `../05__RenderPipeline/Na__RenderLoop__Invalidation.js`.
- Added `Na__RenderLoop__RequestRender()` as the last line of `applyLens()`, so every slider `input` event (and the initial load call) schedules a render frame immediately after `camera.updateProjectionMatrix()`.
- Previously the FOV was updated internally but no frame was scheduled, requiring a manual pan to trigger a repaint.

**Post-Export Viewport Repaint**
- `Na__UiFeature__ImageExport__Controls.js` — added same `Na__RenderLoop__RequestRender` import.
- Added `Na__RenderLoop__RequestRender()` after `Na__UiFeature__DownloadImage()` in the export button click handler, so the viewport repaints once the renderer, camera, and composer have been fully restored to viewport dimensions.
- The high-res render path (`Na__UiFeature__RenderToDataUrl`) and the restore block are untouched — ability to render above viewport resolution is preserved.

# ---------------------------------------------------------


# ---------------------------------------------------------
## ValeVision3D v2.0.4  -  11-Mar-2026
### Scene Inspector — Visibility Controls, Filter, Isolate Pair, Viewport Height

**Overview**
- Extended the Scene Inspector tool (introduced in v2.0.3) with a full set of interactive visibility controls for live scene debugging.
- All changes are self-contained within `Na__UiFeature__SceneInspector__Controls.js` and its companion HTML/CSS.

**Per-Node Visibility Dot Toggle**
- Visibility dots in the node tree are now interactive — click any dot to toggle `node.visible` on the live Three.js object and immediately invalidate the render loop.
- Dot colour syncs to the new state (green = visible, muted = hidden); tooltip updates to "Click to hide" / "Click to show".
- `e.stopPropagation()` prevents the dot click from also triggering the row expand/collapse.

**Node Registry and Visibility Snapshot**
- A flat `Na__SceneInspector__NodeRegistry` is built during tree rendering, storing `{ uuid, nodeRef, dotEl, wrapperEl, name }` for every node.
- On each scan, `Na__SceneInspector__VisibilitySnapshot` records the `node.visible` state of every registered node as the scan-time baseline.

**Hide All / Restore All**
- "Hide All" sets every registered node to `visible = false` and syncs all dot colours in one pass.
- "Restore All" reinstates the scan-time snapshot state so the scene returns to exactly how it looked at last scan.
- Both buttons added to a compact toolbar row below the filter input.

**Filter Input**
- Text input filters the displayed node tree by name fragment on every keystroke.
- On a non-empty query, all wrappers are hidden first; matching nodes and all their DOM ancestors (`.na-scene-inspector__node`, `.na-scene-inspector__children`) are then revealed, so parent groups always display when a child matches.
- Filter is cleared automatically on each Rescan.

**Isolate Pair Mode**
- "Isolate Pair" toggle button added to the same toolbar row as Hide All and Restore All (compact three-button layout).
- When active, toggling any node's dot also toggles the paired sibling model under the same ValeVision category group — i.e. the mesh model and its corresponding linework model are always switched together.
- Pairing algorithm: walks `nodeRef.parent` chain until a node matching `/^ValeVision__\w+__\w+/` is found (the category group), then toggles all other direct children of that group and syncs their dot elements from the registry.
- Button uses the existing `na-scene-inspector__toolbar-btn--active` CSS state for ON/OFF visual feedback.

**Viewport Height and Scrollability**
- Scene Inspector tree `max-height` changed from the fixed `360px` to `calc((100vh - var(--Vale_HeaderHeight) - 10px) / 1.2 - 280px)` to dynamically fill the available viewport.
- Outer Dev Tools panel given a matching `max-height` and `overflow-y: auto` so it scrolls when content exceeds the viewport.
- Both values divide by `1.2` to account for the inherited `transform: scale(1.2)` on the base `.na-dropdown-menu` class — without this correction the layout height is 1.2× the visual height, causing the bottom to overflow off-screen and the scrollbar to clip inside a region never visible to the user.

**Files Changed**
- `02__Src__AppModules/26__System__DevTools/Na__UiFeature__SceneInspector__Controls.js`
- `index.html`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`

# ---------------------------------------------------------
## ValeVision3D v2.0.3  -  11-Mar-2026
### Dev Tools Panel — Localhost-Only Developer Menu System

**Overview**
- Introduced a dedicated `Dev Tools` dropdown menu that appears exclusively on localhost and is hidden on all live deployments.
- Extracted two developer-only actions (`Save Camera Settings`, `Profile Lines`) from the public `Tools` menu into the new panel, keeping the user-facing Tools menu clean.
- Added a Scene Inspector tool for on-demand Three.js scene graph traversal and reporting.
- Added a drag-resize handle so the Dev Tools panel width can be adjusted at runtime.
- All new modules follow the existing Noble Architecture clean-code conventions and sit in a dedicated `70__System__DevTools` folder.

**Dev Tools Menu**
- New HTML shell added to `index.html` as a second `na-dropdown-menu--dev-localhost` container, pinned to the top-left of the viewport.
- New `Na__UiFeature__DevMenu__LocalhostOnly.js` gates the container via `Na__AppUtils__IsRunningOnLocalhost()` — mirrors the TrueVision cousin project pattern.
- `Save Camera Settings` and `Profile Lines` markup moved from the public `Tools` list into the new `Dev Tools` list with a section divider between them.

**Profile Lines — Extracted Module**
- New `Na__UiFeature__ProfileLines__Controls.js` owns Profile Lines button state, `aria-pressed` sync, status text, click handling, and render invalidation.
- Removes all inline Profile Lines wiring from `index.html`; replaced with a single `Na__UiFeature__InitializeProfileLinesControls(pipelineRef, profileLinesConfig)` call.
- Button restyled using new `na-dev-toggle` / `na-dev-toggle--active` classes, matching the TrueVision green active-dot indicator pattern.

**Scene Inspector**
- New `Na__UiFeature__SceneInspector__Controls.js` provides on-demand scene graph reporting.
- Scan button traverses the live `THREE.Scene` using `Object3D.traverse()`, building a plain data tree (no DOM interaction during traversal).
- Reports per-node: type badge (Mesh / Group / Light / Line / Camera), visibility dot (green / muted), name, and triangle/vertex counts for mesh nodes.
- Summary header shows total nodes, meshes, triangle count, line objects, and lights after each scan.
- Collapsible tree defaults to 3 levels expanded; click any parent row to expand/collapse its children.
- Works on-demand because `Na__AppFlow__StartLoadingSequence` is not awaited — models may load after boot.

**Drag-Resize Handle**
- Resize grip element added to the bottom-right corner of the Dev Tools container.
- Drag logic in `Na__UiFeature__DevMenu__LocalhostOnly.js` listens for `mousedown → mousemove → mouseup` on `document`, clamping new width between 220px and 640px.
- Grip rendered as a 3×3 dot grid via `radial-gradient` background — no image assets required.

**Styling**
- New CSS classes: `na-dev-toggle`, `na-dev-toggle--active`, `na-dev-toggle__label`, `na-dev-toggle__status`.
- New CSS classes: `na-scene-inspector__*` — tree rows, type badges (colour-coded by family), visibility dot, scrollable container, stats bar, scan button, resize handle.
- `na-dropdown-menu--dev-localhost` modifier positions the panel top-left, overrides `right`, and sets `transform-origin: top left`.

**Files Added**
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__DevMenu__LocalhostOnly.js`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__SceneInspector__Controls.js`

**Files Changed**
- `index.html`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.2  -  11-Mar-2026
### PDF Export — Flattened 600 dpi Pipeline & Config Naming Convention

**Overview**
- Replaced the multi-image PDF composition pipeline with a single flattened PNG export at 600 dpi.
- Both export modes (Full Layout and Image Only) now render the entire A3 sheet to one offscreen canvas before embedding, eliminating file-size blowout caused by embedding separate full-page PNGs per layer.
- Applied project naming conventions to the `imageExport` config block and its downstream consumers.

**PDF Export Rewrite**
- Added `Na__PageLayout__PDF_EXPORT_DPI = 600` and derived `Na__PageLayout__PIXELS_PER_MM` constants.
- Added `Na__PageLayout__FlattenSheetToDataUrl(state, includeTitleBlock)` — composites title block and viewport image onto a single `9921 × 7016 px` offscreen canvas at 600 dpi, applying all `clipTop/Right/Bottom/Left` values with the same clip-mask approach used in the live canvas preview.
- `Na__PageLayout__CreateA3Document` now passes `compress: true` and `floatPrecision: 'smart'` to jsPDF.
- Both export functions reduced to: flatten sheet → single `addImage` call → `doc.save`.

**Config Naming Convention**
- `imageExport` block renamed to `ImageExport__Config` with fully-qualified double-underscore key names throughout, matching the project convention.
- New `PageLayout__PdfExport__Config` block added documenting `TargetDpi`, `Compress`, and `FloatPrecision` settings.
- `Na__UiFeature__ExportConfigKeys` string values updated to new JSON key names.
- New `Na__UiFeature__NormalizeExportConfig` helper added — maps long JSON keys to short internal names so all downstream dot-property accesses remain unchanged.

**Files Changed**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `index.html`
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.1  -  11-Mar-2026
### Multi-Model Loader — TrueVision Namespace Support (Ribbins 62854)

**Overview**
- Fixed loader not recognising `TrueVision` namespace in project model URLs.
- Projects using SketchUp GLB Builder (TrueVision plugin) export naming (e.g. `Ribbins__TrueVision__MainBuildingModel__Existing__MeshModel__.glb`) were incorrectly classified as legacy, collapsing all four building models (Existing + Proposed, Mesh + Linework) into a single `ValeVision__LegacyModel` category.
- Only the last pair (Proposed) was loaded; Existing models were overwritten and never displayed.

**Root Cause**
- Primary URL parse regex accepted only `ValeVision` or `NaModel`; `TrueVision` fell through to legacy path.
- Legacy path assigns one mesh + one linework per category; multiple pairs overwrote each other.

**Fix**
- Added `TrueVision` to primary regex namespace alternation in `Na__ModelLoader__ParseModelUrl`.
- URLs now parse as `ValeVision__MainBuildingModel__Existing` and `ValeVision__MainBuildingModel__Proposed` (both already in load-order priority).
- All four GLBs load with separate model toggle controls.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.0  -  10-Mar-2026
### GPU Performance Overhaul — Profile Lines Pipeline Optimisation

**Overview**
- Ported all TrueVision3D v2.2.4 GPU performance optimisations to ValeVision3D.
- Diagnosed and resolved sustained 100% GPU usage introduced by the profile lines system.
- Root cause: the profile lines effect added two extra full-scene `renderer.render()` calls per frame (normal pass + profile colour pass), and the continuous RAF loop never idled.
- Implemented six targeted optimisations that reduce per-frame scene renders, cut profile colour pass cost by ~75%, eliminate per-frame allocations, fix a render loop spin issue, and add a user-facing toggle.

**Depth Pre-Pass Elimination**
- Attached a `DepthTexture` to the normal render target so the normal pass writes depth as a side-effect.
- Fog now reads depth from the normal pass instead of the render target's built-in depth texture.
- Falls back to the original depth texture when profile lines are disabled.

**Half-Resolution Profile Colour Buffer**
- Profile colour render target now created at 50% viewport dimensions (quarter the pixel count).
- The profile colour buffer only carries edge tint information; full resolution is unnecessary.
- `setSize()` updated to maintain half-res on window resize.

**Pre-Allocated Material Swap Cache**
- `cachedOriginalMaterials` is now a pre-allocated `Array` sized during `rebuildSceneCache()`.
- Per-frame material swap uses index-based `for` loops writing into fixed array slots instead of creating `{ object, material }` pairs every frame.
- Eliminates all per-frame heap allocations in the profile lines hot path.

**Scene Object Caching**
- Replaced per-frame `scene.traverseVisible()` calls with `scene.traverse()` and cached results.
- Added `cachedLineObjects`, `cachedMeshObjects`, `sceneCacheDirty` flag, `rebuildSceneCache()`, and `invalidateSceneCache()` methods.
- Cache is rebuilt only when models are loaded or scene structure changes.

**Invalidation-Based Render Loop**
- Replaced the unconditional `requestAnimationFrame` loop with an invalidation-based system.
- Frames are only scheduled when user interaction, animations, or explicit invalidation events require a redraw.
- Added `Na__RenderLoop__Invalidation.js` as a centralised event dispatcher for render requests.
- All UI controls (model toggles, walk mode, door animations) now dispatch render requests through the invalidation system.

**Orbit Controls Render Loop Fix**
- Added a 3-frame trailing budget after the orbit `end` event.
- Previously, `controls.update()` could return `true` after the user stopped interacting, keeping the render loop spinning indefinitely.
- The loop now renders the trailing frames then stops, dropping GPU usage to near-zero when idle.

**Profile Lines Toggle**
- Added "Profile Lines" ON/OFF button to the Tools dropdown menu.
- `toggleProfileLines()` disables both the shader pass and the pre-pass renders.
- Users can instantly halve per-frame GPU load by toggling profile lines off.

**Additional Optimisations**
- Directional light shadow map resolution reduced from 2048 to 1024.
- Renderer pixel ratio cap reduced from 2.0 to 1.5.
- Fat line segments re-enabled frustum culling with computed bounding geometry.
- Navigation controls (`updateMovement`/`updateNavigation`) now return booleans indicating change.

**Files Added**
- `02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js`

**Files Changed**
- `index.html`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js`
- `02__Src__AppModules/06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js`
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js`
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`
- `02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js`
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`

# ---------------------------------------------------------
## ValeVision3D v1.9.9  -  10-Mar-2026
### Profile Lines — Dynamic Edge Width, Smooth Threshold, Config Alignment

**Overview**
- Profile line edge width now scales dynamically with camera distance to the orbit target: thicker when zoomed in, thinner when zoomed out (reduces clustering on detailed items).
- Replaced hard threshold cutoff with `smoothstep` blending so transitions are gradual instead of abrupt.
- Aligned main app `Na__AppConfig__Main.json` profile lines with the tuned test environment values.

**Dynamic Edge Width**
- Added four config keys: `EdgeWidthMin`, `EdgeWidthMax`, `EdgeWidthDistanceNear`, `EdgeWidthDistanceFar`.
- `u_edgeWidth` uniform updated per-frame inside `renderProfileNormals()` using `camera.position.distanceTo(orbitTarget)`.
- Lerp: far distance = min width (thin), near distance = max width (thick).
- `orbitTarget` passed from `Na__AppFlow__LoadingSequence` via `Na__RenderPipeline__SetupComposer` into `Na__RenderEffect__ProfileLines__Create`.

**Smooth Threshold**
- Fragment shader now uses `smoothstep` instead of `if (edge > threshold)` for profile-line blending.
- Softness zone = half the threshold value on each side; transitions are smoother.

**Config Alignment**
- `Na__AppConfig__Main.json` profile lines: `EdgeWidth` 0.4→0.25, `EdgeWidthMin` 0.25→0.20, `EdgeWidthMax` 1.5→0.60, `DistanceNear` 2.0→1.0, `DistanceFar` 40.0→80.0.

**Key Files**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js`
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json`

# ---------------------------------------------------------
## ValeVision3D v1.9.8  -  10-Mar-2026
### Project Structure Alignment — TrueVision3D Numbered Layout

**Overview**
- Restructured ValeVision3D source folder layout to match TrueVision3D numbered band taxonomy for consistency across ValeDesignSuite projects.
- Moved flat `src__*` folders into `02__Src__AppModules/` with numbered bands; styles, distribution, and testing helpers relocated to their designated bands.
- Updated imports, config fetch paths, and cross-file references throughout the codebase.
- Browser-tested via Whitecardopedia localhost with random project; viewer boot, model loading, navigation, export, and Layout View handoff all verified.

**Folder Mapping (Numbered Bands)**
- `01__AppCore`, `02__AppData`, `03__AppUtils`, `04__MathUtils`, `05__RenderPipeline`
- `06__Scene__LightingEffects`, `07__Scene__EnvironmentEffects`
- `10__NavigationAndCameras`, `11__CameraUtils`
- `15__ModelLoader`
- `20__System__MaterialsSystem`, `25__System__3dObject__InteractionSystem`, `26__System__ToggleModelElements`
- `30__System__ImageExport`, `35__System__PageLayoutSystem`
- `03__Style__AppStylesheets`, `60__DistributionEmails`
- `79__Testing__GenerateObjects`, `80__Testing__PrototypeEnvironment`

**Key Files Updated**
- `index.html` — script/style import paths
- `Na__AppConfig__Loader.js` — config fetch path
- `Na__AppFlow__LoadingSequence.js` and runtime modules — module import paths
- `Na__UiFeature__ImageExport__Controls.js` — layout page path
- Page layout subtree and prototype sandbox HTML/JS/config — relative paths

# ---------------------------------------------------------
## ValeVision3D v1.9.7  -  27-Feb-2026
### Stylesheet Naming Standardization 

**Overview**
- Standardized stylesheet naming to the project namespace pattern (`Na__<DomainOrModule>__Styles__<FeatureOrScope>__.css`) for improved maintainability and clearer ownership by module.
- Updated stylesheet link/import wiring across main app, Page Layout System, and Test Environment to match renamed files.
- Removed all remaining Babylon/BABYLON engine references from ValeVision3D runtime/docs.
- Ported legacy `src__GenerateObjects` helper modules from Babylon APIs to Three.js-compatible utility modules.

**Stylesheet Refactor**
- Renamed `src__Styles` files to namespaced equivalents (Core UI, UiFeature, ImageExport scopes).
- Renamed Page Layout stylesheet to `Na__PageLayoutSystem__Styles__Main__.css`.
- Renamed Test Environment stylesheet to `Na__TestEnv__Styles__PrototypeSandbox__.css`.
- Updated `index.html`, Page Layout HTML, and TestEnv HTML to point at new stylesheet names.
- Updated `Na__CoreUi__Styles__Index__.css` import list to new filenames while preserving import order.


# ---------------------------------------------------------
## ValeVision3D v1.9.6  -  26-Feb-2026
### Orbit Anchor Hardening + Nav Damping Delegation

**Overview**
- Fixed an orbit regression where camera interaction could feel like head-look/first-person instead of stable orbit around the helper cube anchor.
- Orbit target resolution is now deterministic and robust across project reloads and saved camera data.
- Removed Dev__DefaultCube as an orbit/fog fallback anchor to avoid conflicting reference points.
- Added explicit warning logs for missing/unloadable helper cube paths so failures are immediately visible in console output.

**Orbit Target Precedence (Hardened)**
- `Na__AppFlow__LoadingSequence.js` now resolves orbit target in strict order:
  1. Loaded OrbitHelperCube GLB center (**authoritative**)
  2. Saved `OrbitHelperCube__Position` from `project.json` (only if helper cube center is unavailable)
  3. Keep current controls target (no implicit dev-cube override)
- If both helper center and saved orbit target exist, saved target is ignored and a warning is emitted to prevent hidden drift from stale values.

**Helper Cube Diagnostics**
- Added warning when no OrbitHelperCube URL is found in the model URL list.
- Added warning when OrbitHelperCube fails to load.
- Added warning when helper file loads but center cannot be resolved.
- Added warning when neither helper center nor saved orbit target can be applied.

**Legacy Camera Target Conflict Guard**
- During load, `Camera__DefaultTarget` is stripped from the applied camera payload so legacy target keys cannot overwrite helper-cube anchoring.
- Save Camera Settings now removes legacy `valeVision_Camera__DefaultPosition` and deprecated `Camera__DefaultTarget` before writing updated project data.

**Startup Fallback Update (No Dev Cube Anchor)**
- `index.html` no longer sets initial orbit target to `Dev__DefaultCube`.
- Initial target now derives from camera forward direction (temporary pre-load target only).
- Initial fog anchor now follows current orbit target reference rather than dev cube position.

**Key Files**
- `src__AppFlow/Na__AppFlow__LoadingSequence.js` — strict helper-first target precedence, warnings, and legacy target guard.
- `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — legacy camera payload cleanup before save.
- `index.html` — removed dev-cube pivot fallback and aligned initial fog anchor with orbit target.

**Nav Damping Delegation — Config-Driven OrbitControls Damping (Mouse + iPad)**

**Overview**
- Refactored orbit-controls damping into a dedicated delegated module so damping behavior is no longer hardcoded inside device nav initializers.
- Added a new top-level AppConfig group (`Navmode__Damping`) as the single source of truth for damping enable flags and damping factor values.
- Updated both desktop mouse controls and iPad/touch controls to consume the new damping payload shape.
- Removed legacy `EnableDamping` keys from `Navmode__MouseControls` and `Navmode__IpadControls` active read path.

**New Delegated Module**
- New file: `src__NavigationAndCameras/Na__Navmode__OrbitControls__Damping.js`.
- Exposes `Na__Navmode__ApplyOrbitControlsDamping(controls, dampingConfig)`.
- Applies:
  - `controls.enableDamping` from `dampingConfig.enabled`
  - `controls.dampingFactor` from `dampingConfig.factor`
- Includes internal clamp helper for damping factor bounds (`0.0` to `1.0`) and finite-value guard with safe default (`0.08`).

**AppConfig Schema Addition**
- Added new top-level `Navmode__Damping` group in `src__AppConfig/Na__AppConfig__Main.json`:
  - `Navmode__Damping__Description`
  - `Navmode__Damping__Mouse`
    - `Navmode__Damping__Mouse__Enabled`
    - `Navmode__Damping__Mouse__Factor`
  - `Navmode__Damping__Ipad`
    - `Navmode__Damping__Ipad__Enabled`
    - `Navmode__Damping__Ipad__Factor`
- Clarified in description that damping factor is **unitless** (not millimeters).

**Wiring Changes**
- `index.html` now extracts `Navmode__Damping` from AppConfig and builds a `damping` payload block for both device paths.
- Mouse/iPad nav modules now call the delegated damping module instead of setting damping directly.
- Added required `@delegate` breadcrumbs at both offload call sites:
  - `src__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js`
  - `src__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js`

**Units Compliance**
- Confirmed against world-units rule: damping factor remains dimensionless and is intentionally **not** passed through mm→units conversion.
- Existing mm-based navigation values (movement/elevation/min-max distance/zoom step) continue to use `Na__Math__ConvertMmToUnits`.

**Key Files**
- `src__NavigationAndCameras/Na__Navmode__OrbitControls__Damping.js` — new delegated damping module.
- `src__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — damping call delegated.
- `src__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — damping call delegated.
- `src__AppConfig/Na__AppConfig__Main.json` — new `Navmode__Damping` group + legacy damping key removal from device groups.
- `index.html` — new damping config extraction and payload wiring.

# ---------------------------------------------------------
## ValeVision3D v1.9.5  -  24-Feb-2026
### Layout View Loading Overlay — Spinner Feedback, Button State Fix, postMessage Handshake

**Overview**
- Added a full-screen loading overlay with 3-phase status messages when the "Layout View" button is clicked, providing clear visual feedback during image rendering, data transfer, and new-tab loading.
- Fixed the Layout View button remaining visually stuck in its pressed state after click.
- Added white hover text and `:active` press-in effect to the secondary action button for consistent interactive feel.
- Established a `postMessage` handshake between the parent tab and the layout tab so the overlay knows when the Drawing Document has finished loading.

**Loading Overlay (3-Phase Status Messages)**
- Phase 1: "Rendering Your Image..." — shown immediately on button click while the high-resolution render executes.
- Phase 2: "Sending To Drawing Document..." — shown after render completes and before the new tab confirms receipt.
- Phase 3: "Success! See new tab for your Drawing Layout" — shown in green when the layout tab sends back its `Na__PageLayout__Ready` postMessage.
- Overlay auto-dismisses 2.5 seconds after the success message with a smooth fade-out transition.
- 8-second timeout fallback dismisses the overlay if the postMessage is never received (cross-origin restrictions or popup blockers).

**Button State and Double-Click Guard**
- `layoutViewInProgress` flag prevents re-entry while the overlay is active.
- Button receives `.is-loading` class during the process (dimmed, `pointer-events: none`).
- `.is-loading` class removed on overlay dismiss, restoring the button to its default state.
- Render deferred via double `requestAnimationFrame` so the overlay paints to screen before the blocking render call.

**Button Hover and Active CSS**
- `.na-dropdown-menu__action--secondary:hover` now sets `color: #ffffff` for white text on hover.
- `.na-dropdown-menu__action--secondary:active` added with darker background and `scale(0.97)` press-in effect.
- `.na-dropdown-menu__action--secondary.is-loading` added for disabled appearance during loading.

**postMessage Handshake (Layout Tab → Parent Tab)**
- `Na__PageLayoutSystem__SystemLogic__Main__.js` now calls `window.opener.postMessage({ type: 'Na__PageLayout__Ready' }, '*')` at the end of `Na__PageLayout__Initialize()` after the image and title block are loaded and state is built.
- Parent tab listens for this message to transition from Phase 2 to Phase 3 (success).
- Listener is cleaned up after receipt; timeout fallback also cleans up the listener.

**Loading Overlay Styles**
- Reuses the existing `.loading-spinner` and `@keyframes spinner-rotate` from the app initialization overlay.
- Semi-transparent white background (`rgba(255,255,255,0.92)`) with `backdrop-filter: blur(4px)`.
- `z-index: 10000` ensures visibility above all other UI elements including the dropdown menu.
- `.na-layout-loading-overlay--visible` / `--fade-out` classes control display and opacity transitions.
- `.na-layout-loading-overlay__status--success` turns the status text green (`#2a7d4f`) with bold weight.

**Key Files**
- `index.html` — added `#naLayoutLoadingOverlay` element with spinner and status text inside `#root`.
- `src__Styles/loading-overlay.css` — added Layout View Loading Overlay region (container, visible, fade-out, status text, success variant).
- `src__Styles/ui-components.css` — added `:hover` white text, `:active` press effect, `.is-loading` disabled state for secondary action button.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — refactored Layout View click handler with overlay management, double-rAF render deferral, postMessage listener, timeout fallback, dismiss sequence.
- `src__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js` — added `postMessage` call to opener on successful initialization.

# ---------------------------------------------------------
## ValeVision3D v1.9.4  -  24-Feb-2026
### `index.html` Modularisation Pass — 5 New Modules, Walk Mode Controls, Region Structure

**Overview**
- Systematic extraction of all inline JavaScript logic from `index.html` into dedicated ES modules.
- `index.html` reduced from **1,075 lines → 691 lines** (~360 lines of inline JS removed).
- All extractions follow the `@delegate:` breadcrumb protocol (`03-dependency-Traversal-Protocol-.mdc`) so future agents can trace offloaded logic.
- Walk mode orchestration unified into shared modules consumed by both `index.html` and `TestEnv__PrototypeTestingSandbox__Main__.js`.
- Inline JS section restructured with 10 named region blocks for future navigation.

**New Module — `src__AppUtils/Na__AppUtils__ProjectLoader.js`**
- Extracted 5 pure utility functions from `index.html` (lines 617–721): `Na__AppUtils__IsRunningOnLocalhost`, `Na__AppUtils__GetProjectCodeFromUrl`, `Na__AppUtils__NormalizeProjectFolderId`, `Na__AppUtils__FetchProjectJson`, `Na__AppUtils__ExtractModelUrls`.
- Also extracts the `WebProjectsBaseUrl` and `DefaultProjectYear` constants.
- Zero dependencies — pure browser APIs (`window`, `fetch`, `URLSearchParams`) only.
- Housed in the new `src__AppUtils/` folder created for shared utility modules.

**New Module — `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js`**
- Extracted `Na__UiFeature__SaveCameraSettings` and `Na__UiFeature__InitializeSaveCameraButton` from `index.html` (lines 992–1053).
- Refactored both functions from closures over parent scope to explicit parameters: `(camera, controls, showToast)`.
- Imports `Na__UiFeature__BuildCameraJson` from the existing `Na__UiFeature__CameraPosition__Controls.js` and auth utilities from `Na__AppUtils__ProjectLoader.js`.

**New Module — `src__AppFlow/Na__AppFlow__LoadingSequence.js`**
- Extracted `Na__UiFeature__UpdateStatus` (private), `Na__UiFeature__ShowScene` (private), and `Na__AppFlow__StartLoadingSequence` (exported) from `index.html` — including the embedded RAF render loop and window resize handler.
- Refactored to accept a **context object** instead of closing over `index.html` scope variables; all Three.js instances and config values passed explicitly.
- `Na__RenderPipeline__State` is written back to a mutable `Na__AppFlow__PipelineRef = { current: null }` ref held in `index.html` so the `ImageExportControls` lazy getter `() => Na__AppFlow__PipelineRef.current` continues to work across the module boundary.
- `Na__LoadedModelGroups` and `Na__RenderComposer__Main` are now fully local to the function — removed from `index.html` outer scope.
- Module imports 14 source modules (GLTFLoader, RenderPipeline, ModelLoader, SceneLighting, FogEffect, MathUtils, CameraUtils, MaterialsSystem, ModelToggle, DoorAnimation, WalkMode, DoorProximity, AppUtils).
- Private DOM helpers (`UpdateStatus`, `ShowScene`) use `document.getElementById` directly, consistent with the `Na__UiFeature__ModelToggle__Controls.js` pattern.

**New Module — `src__NavigationAndCameras/Na__UiFeature__WalkModeControls.js`**
- Extracted walk mode init and toggle orchestration from both `index.html` and `TestEnv__PrototypeTestingSandbox__Main__.js`.
- Stores `controls`, `renderer`, and `useTouchControls` in module-level state at init time; callers pass them once only.
- `Na__UiFeature__ToggleWalkMode(onActivate, onDeactivate)` accepts optional callbacks for caller-side UI reactions (used by the test environment to update its walk mode status indicator and save button).
- Imports `Na__Navmode__WalkMode__SystemLogic`, `Na__Navmode__WalkMode__DesktopControls`, `Na__Navmode__WalkMode__TouchScreenControls`, and `Na__DoorProximity`.

**New Module — `src__NavigationAndCameras/Na__UiFeature__WalkModeEventListeners.js`**
- Pure event binding module — no Three.js dependencies, no state.
- `Na__UiFeature__InitializeWalkModeHotkey(toggleFn)` — registers the `Alt+Shift+W` keydown listener.
- `Na__UiFeature__InitializeWalkModeToggleButton(buttonId, toggleFn)` — wires a DOM button by ID; guards gracefully if the element doesn't exist (production has no such button; test env does).

**`index.html` Import Block Simplification**
- Removed 10 individual named imports across 4 import blocks (SystemLogic walk mode exports, DesktopControls, TouchControls, DoorProximity, RenderPipeline, GLTFLoader, ModelLoader, SceneLighting, ModelToggle, MaterialsSystem, CameraPosition, ApplyCameraConfig/BuildCameraJson).
- Added 5 new targeted imports (AppFlow, WalkModeControls, WalkModeEventListeners, AppUtils was added to dependent modules only, SaveCameraSettings).

**`TestEnv__PrototypeTestingSandbox__Main__.js` Updates**
- Trimmed `Na__Navmode__WalkMode__SystemLogic.js` import to the 4 still-needed exports: `SetCollisionMeshes`, `Update`, `IsActive`, `GetCapsulePosition` (render loop + save guard).
- Removed `Na__WalkModeDesktop__`, `Na__WalkModeTouch__`, `Na__DoorProximity__Initialize`, `Na__DoorProximity__SetEnabled` import lines entirely.
- Replaced 82 lines of walk mode setup with the new shared modules + test-env-specific `onActivate`/`onDeactivate` UI callbacks.

**`index.html` JavaScript Region Structure (10 Regions)**
- Added 10 named `// REGION |` / `// endregion` blocks to the inline script for future navigation and code-folding:
  1. Module Imports
  2. DOM References
  3. App Config Loading and Destructuring
  4. Dev Mode Config Extraction
  5. Device Detection
  6. Scene, Camera, Renderer and Navigation Setup
  7. Walk Mode System Initialization
  8. Dev Default Cube, Orbit Pivot and Fog Setup
  9. Camera UI Controls Initialization
  10. UI Notification Helpers
  11. Engine Entry Points

**Key Files**
- `src__AppUtils/Na__AppUtils__ProjectLoader.js` — new
- `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — new
- `src__AppFlow/Na__AppFlow__LoadingSequence.js` — new (new `src__AppFlow/` folder)
- `src__NavigationAndCameras/Na__UiFeature__WalkModeControls.js` — new
- `src__NavigationAndCameras/Na__UiFeature__WalkModeEventListeners.js` — new
- `index.html` — major inline JS reduction (1,075 → 691 lines)
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — walk mode imports and setup updated

# ---------------------------------------------------------
## ValeVision3D v1.9.3  -  24-Feb-2026
### AppConfig Key Wiring Fix — `Camera__DefaultMisc__Fov` Key Name Regression

**Bug Fixed — Broken Key Reference in `index.html` (2 locations)**
- Corrected two occurrences of the wrong key name `Camera__DefaultFov` → `Camera__DefaultMisc__Fov` in `index.html`.
- Both errors were in the `Camera__DefaultPosition` reading block; every other module in the codebase already used the correct key name.

**Location 1 — Initial FOV Application (line 492)**
- Block reads `Camera__DefaultMisc__Fov` from `Na__Config__CameraDefault` and applies it to `Na__Camera__Main.fov`.
- Previously the key was never found (`Camera__DefaultFov` does not exist), so the camera's initial FOV from AppConfig was silently never applied.

**Location 2 — Camera Lens Slider Guard (line 586)**
- Block sets `Na__CameraLens__Config.defaultFocalLengthMM = null` when a saved FOV is present in AppConfig, preventing the lens slider from overriding the camera's pre-set FOV on initialization.
- Previously the guard condition always evaluated to `false` (wrong key), meaning `Na__UiFeature__InitializeCameraLensControls` always used the hardcoded `defaultFocalLengthMM: 45` from `cameraLens` config and called `applyLens(45)` immediately, overriding the camera's starting FOV.
- Guard now fires correctly — `defaultFocalLengthMM` is set to `null`, and the lens slider initialises from the camera's current FOV state rather than the 45mm default.

**Full AppConfig Wiring Audit Performed**
- All 19 AppConfig sections traced end-to-end against their downstream consumer files.
- All other sections confirmed correct. Three dead-config items identified (not bugs, no behaviour change):
  - `Scene__Default__ControlsConfig` — extracted but superseded by `Navmode__Settings`; never consumed.
  - `Global__Hotkeys__ToggleWalkMode` — extracted but walk mode hotkey handler hardcodes `Alt+Shift+W` directly.
  - `MaterialsSystem__Config__FallbackToWhitecard` — defined in AppConfig but whitecard fallback is always implicit in the materials swap code.

**Key Files**
- `index.html` — two key name corrections in camera config reading block.

# ---------------------------------------------------------
## ValeVision3D v1.9.2  -  23-Feb-2026
### PBR Materials Swap System — Indexed Material Library, WebApp Renderer, SketchUp Export Modes

**Overview**
- Implemented a full programmatic PBR materials swapping pipeline spanning the SketchUp GLB exporter and the ValeVision3D WebApp renderer.
- Central single source of truth: `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` defines all indexed materials, their PBR settings, and optional texture URL overrides.
- Materials are identified by a strict naming convention (`MAT{NNN}__Category__Variant`) matched against SketchUp `display_name` at export time and against `material.name` in the Three.js scene graph at load time.
- Whitecard fallback guaranteed: any mesh whose material name is not found in the library renders exactly as before, preserving full schematic massing functionality.
- System deployed to both the main production render pipeline (`index.html`) and the test environment (`TestEnv__PrototypeTestingSandbox__Main__.js`), with shared module code and independent config files.

**Materials Library JSON Schema (v2.1.0)**
- `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` expanded to full PBR template structure.
- `MAT001__Default` is the complete reference template showing every possible key with default values; all other materials only specify keys that differ from these defaults.
- Per-material fields: `SketchUpName`, `Description`, `BaseColor` (rgb string), `Opacity`, `Transparent`, `IsDoubleSided`, `PbrRoughness`, `PbrMetallic`, `EmissiveFactor`, `EmissiveIntensity`, `NormalScale`, `OcclusionStrength`, `AlphaTest`, `DepthWrite`, `EnvMapIntensity`, and a `TextureMaps` section with 7 URL slots (`BaseColorUrl`, `NormalUrl`, `RoughnessUrl`, `MetallicUrl`, `EmissiveUrl`, `OcclusionUrl`, `AlphaUrl`).
- `null` texture URLs mean use scalar PBR values only; a non-null URL hot-swaps that texture channel at runtime.
- Sparse authoring: paint materials store 3 keys (SketchUpName, BaseColor, PbrRoughness); glass stores 8; only what diverges from defaults is written.
- `IsDoubleSided` is an explicit opt-in (`true` only for glass and mirror). Omitting it defaults to single-sided rendering, which is more performant for opaque surfaces.
- Initial series: MAT000 (default), MAT100 (glass, timber, mirror), MAT300 (Farrow & Ball paint range), MAT500 (hardwood timbers).

**WebApp — Library Loader Module (New)**
- New file: `src__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js`.
- `Na__MaterialsSystem__LoadLibrary(url, forceReload)` — async fetch with module-scope cache; returns null on failure rather than throwing.
- `Na__MaterialsSystem__BuildLookup(libraryData)` — flattens the nested series structure into a `Map<SketchUpName, MaterialConfig>` for O(1) lookups; cached after first build.
- `Na__MaterialsSystem__IsIndexedName(name)` — regex test `/^MAT\d{3}__/` to identify indexed material names without requiring a loaded library.

**WebApp — Material Swap Module (New)**
- New file: `src__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js`.
- `Na__MaterialsSystem__ApplyMaterials(modelGroup, lookupMap, materialsConfig)` — traverses a THREE.Group scene graph, identifies meshes with indexed material names, creates `THREE.MeshStandardMaterial` from library config, and replaces the existing material.
- Unmatched meshes are not touched; their whitecard material is preserved exactly as-is.
- Applies `IsDoubleSided` → `THREE.DoubleSide` / `THREE.FrontSide`, `Transparent`, `DepthWrite`, `EnvMapIntensity`, `AlphaTest`, and polygon offset.
- Material instances are cached by `SketchUpName` within a single traversal pass — multiple meshes sharing a material share the same instance.
- Texture URL loading is async and parallel via `Promise.all`; `material.needsUpdate = true` called after all textures resolve.
- Correct colour space set per texture type: sRGB for base colour/emissive, linear for normal/roughness/metallic/AO/alpha maps.

**WebApp — Main App Integration**
- `index.html`: added imports for both materials modules; added `Na__Config__MaterialsSystem` extraction from AppConfig.
- After `Na__ModelLoader__LoadAllModels` completes, performs a second pass: fetch library → build lookup → `for...of` with `await` over all loaded model groups, calling `Na__MaterialsSystem__ApplyMaterials` on each.
- Second pass is gated on `MaterialsSystem__Config__Enabled`; disabled flag bypasses entirely with no overhead.

**WebApp — Test Environment Integration**
- `TestEnv__PrototypeTestingSandbox__Main__.js`: imports both materials modules from `../src__MaterialsSystem/` (no code duplication).
- Material swap called after `TestEnv__LoadAllGlbFiles()` on initial load and again inside the model refresh path (after `TestEnv__LoadAllGlbFiles()` in the node explorer refresh sequence).

**AppConfig Schema Additions**
- New `MaterialsSystem__Config` section added to `src__AppConfig/Na__AppConfig__Main.json`:
  - `MaterialsSystem__Config__Enabled` — master on/off switch.
  - `MaterialsSystem__Config__LibraryUrl` — path to the library JSON (`./src__AppConfig/Na__AppConfig__MaterialsLibrary.json`).
  - `MaterialsSystem__Config__FallbackToWhitecard` — documents intent; whitecard fallback is always active.
  - `MaterialsSystem__Config__PolygonOffsetFactor` / `PolygonOffsetUnits` — passed to all created PBR materials to avoid Z-fighting with linework.
- Identical section added to `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` with library URL `../src__AppConfig/Na__AppConfig__MaterialsLibrary.json`.

**SketchUp Plugin — Material Lookup System (New)**
- New file: `Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb`.
- `Na__MaterialLookup__FetchLibrary` — HTTPS GET to the GitHub Pages URL with 10s connect / 15s read timeout; caches result in module state; returns nil on failure.
- `Na__MaterialLookup__BuildIndex` — parses fetched JSON, flattens all series into `{ SketchUpName => config_hash }` for O(1) lookups; skips `IsDefault` entries.
- `Na__MaterialLookup__IsIndexedMaterial?(name)` — regex `/^MAT\d{3}__/` check without requiring the library to be loaded.
- `Na__MaterialLookup__InLibrary?(name)` — exact key check against the built index.
- `Na__MaterialLookup__GetConfig(name)` — returns full config hash or nil.
- `Na__MaterialLookup__EnrichGltfMaterial(gltf_material, config)` — patches a glTF material hash in-place using `config.key?()` guards (sparse-safe): sets `metallicFactor`, `roughnessFactor`, `baseColorFactor` (with alpha from `Opacity`), `alphaMode: "BLEND"` when opacity < 1, `doubleSided` from `IsDoubleSided`, and `emissiveFactor`.
- `Na__MaterialLookup__ParseRgbString` — `"rgb(R, G, B)"` → `[r, g, b]` normalised 0–1.
- Added `require_relative` for new module in `Na__TrueVision__GlbBuilder__Main__.rb` after `MaterialHandling`.

**SketchUp Plugin — Material Handling (Updated)**
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialHandling__.rb` rewritten to support three export modes.
- `Na__MaterialEngine__SetExportMode(mode)` / `GetExportMode` — sets `:no_materials`, `:all_materials`, or `:indexed_only`.
- `:no_materials` — only the default whitecard material (index 0) is emitted; all mesh primitives reference it. Fastest export, sanitised output.
- `:all_materials` — all unique SketchUp materials exported with their colours; indexed materials additionally enriched with PBR via `Na__MaterialLookup__EnrichGltfMaterial`.
- `:indexed_only` — only materials matching `/^MAT\d{3}__/` and found in the library index are exported; non-indexed materials fall back to index 0 (whitecard). Avoids bloated GLB files with custom or unnamed materials.
- `Na__MaterialEngine__ResolveMaterialIndexForGroup` returns 0 in `:no_materials` mode regardless of material.

**SketchUp Plugin — UI (Updated)**
- `Na__TrueVision__GlbBuilder__UserInterface__.rb`: two new toggles added before the existing "Optimize Large Textures" option.
- **Toggle 1 — "Export Materials"**: unchecked by default. When unchecked, export mode is `:no_materials`.
- **Toggle 2 — "Export Standard Indexed Materials Only"**: greyed out (`opacity: 0.4`, `pointer-events: none`) when Toggle 1 is unchecked; enabled when Toggle 1 is checked; checked by default. Determines `:indexed_only` vs `:all_materials`.
- `Na__TrueVision__GlbBuilder__ToggleMaterials()` JS function enables/disables Toggle 2 group based on Toggle 1 state.
- Export callback reads `materialExportMode` string from JSON params, converts to symbol, calls `self.Na__MaterialEngine__SetExportMode(mode_sym)` before export proceeds.
- Safe fallback in the rescue block sets `:no_materials` on parse error.

**IsDoubleSided — Glass & Transparent Material Correctness**
- SketchUp glass panes are single-polygon faces; without double-sided rendering the backface is culled and the transparent surface either disappears from one side or a white backface bleeds through the opacity.
- `IsDoubleSided: true` in the library simultaneously triggers: `"doubleSided": true` in the exported glTF material entry (plugin side), and `side: THREE.DoubleSide` in the created `THREE.MeshStandardMaterial` (WebApp side).
- Opt-in only — opaque materials (paint, timber) omit `IsDoubleSided` entirely; the renderer defaults to `THREE.FrontSide` for better performance.

**Key Files**
- `src__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js` — new: library fetch, cache, index.
- `src__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js` — new: traverse, match, apply PBR.
- `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` — v2.1.0: full PBR schema, sparse authoring.
- `src__AppConfig/Na__AppConfig__Main.json` — added `MaterialsSystem__Config` section.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — added `MaterialsSystem__Config` section.
- `index.html` — materials module imports, config extraction, second-pass material swap after model load.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — materials imports, swap on initial load and on refresh.
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb` — new: URL fetch, index, enrich.
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialHandling__.rb` — rewritten: 3 export modes, PBR enrichment.
- `Na__TrueVision__GlbBuilder__UserInterface__.rb` — 2 new material export toggles, mode resolution in callback.
- `Na__TrueVision__GlbBuilder__Main__.rb` — added require_relative for MaterialLookupSystem.

# ---------------------------------------------------------
## ValeVision3D v1.9.1  -  23-Feb-2026
### Walk Mode Navigation System — First-Person Capsule Physics, Proximity Doors, Test Environment UI & Collision Exemptions

**Walk Mode Navigation System (First-Person)**
- Implemented a complete first-person walk mode navigation system as a fully self-contained module, separate from the existing orbit mode.
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — core capsule physics, gravity, stair-stepping, ground detection, camera yaw/pitch, activate/deactivate state management, and saved orbit state restore.
- Invisible character capsule: eye height 1620mm, capsule height 1800mm, capsule radius 280mm (all config-driven, integer mm in AppConfig, converted to Three.js units at runtime).
- Gravity (9810 mm/s²), terminal velocity cap, ground snapping via multi-point cross-pattern downward raycasting.
- Stair-stepping: capsule climbs steps up to 350mm by ankle-level raycast detection and vertical snap.
- Horizontal wall collision: 8 directional rays at 3 heights (ankle, waist, head); sliding response using hit face normal projection.
- Camera uses Horizontal FOV of 75 degrees; orbit mode FOV and camera state fully restored on deactivate.
- All config values stored as integer mm in `Na__AppConfig__Main.json` and `TestEnv__SubAppData__Config.json` under `Navmode__WalkMode` section.

**Desktop Controls Module**
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__DesktopControls.js`.
- WASD + Arrow keys for movement, Shift for sprint (1.8× multiplier), mouse for camera look via Pointer Lock API.
- On activate: requests pointer lock on the renderer canvas; on deactivate: exits pointer lock and removes all listeners.

**Touch Screen Controls Module**
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__TouchScreenControls.js`.
- Single finger joystick for directional movement, two-finger drag for head look/rotation, pinch gesture for strafe movement.
- Acceleration and smoothing applied to all touch inputs.

**Proximity Door Trigger System**
- New file: `src__3dObject__InteractionsSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js`.
- Detects capsule proximity to door assemblies (2000mm threshold, config-driven) and triggers existing door animations.
- Reuses `Na__DoorAnimation__DoorRegistry` and `Na__DoorAnimation__ToggleDoor` exported from the click-to-open doors module.
- Modified `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` to export internal registry and toggle function.

**Global Hotkey — Toggle Walk Mode**
- Alt + Shift + W toggles walk mode in both `index.html` (production) and the test environment.
- Hotkey string defined in new `Global__Hotkeys` section of AppConfig, parsed and evaluated in keydown handlers.

**AppConfig Schema Additions**
- Added `Global__Hotkeys` section to `Na__AppConfig__Main.json` and `TestEnv__SubAppData__Config.json`.
- Added `Navmode__WalkMode` section under `Navmode__Settings` with all walk mode parameters as integer mm values.

**Test Environment — Walk Mode UI Panel**
- Added walk mode toggle panel to `TestEnv__PrototypeTestingSandbox__DomAndLayout.html`: pedestrian icon, toggle button, active mode status indicator, and Alt+Shift+W hotkey hint.
- Panel positioned at `left: 300px` to avoid overlapping the existing storey visibility panel.
- Styles added to `TestEnv__PrototypeTestingSandbox__Stylesheet.css`.

**Test Environment — Save Default View Feature**
- Added "Save View" button to the walk mode panel in the test environment.
- Captures current orbit camera position (mm), rotation quaternion, FOV, and orbit target (mm) and POSTs to a new Flask endpoint `POST /api/save-default-view`.
- Flask server (`TestEnv__FlaskLocalServer.py`) reads `TestEnv__SubAppData__Config.json`, updates the `TestEnv__DefaultView` section, and writes it back to disk.
- On next page load, if `TestEnv__DefaultView` exists in config, the saved camera state is restored automatically — bypassing the default auto-center.
- Save button is disabled whilst in walk mode (must be in orbit mode); button title and state update dynamically on mode toggle.

**Collision Exemption System**
- `Na__WalkMode__SetCollisionMeshes` now filters out helper/dev objects that must always be ghostable.
- Implemented `Na__WalkMode__IsCollisionExempt(object)` which walks the full ancestor chain of each mesh and tests every node name against a keyword list using substring matching.
- Substring matching (not exact) is required because GLB files exported with a project prefix produce names like `NP03__01__OrbitHelperCube__MeshModel__` — exact matching silently fails for all project-prefixed variants.
- Exempt keywords: `'Dev__DefaultCube'` (programmatic pivot reference cube) and `'OrbitHelperCube'` (GLB orbit target cube, catches both root group and child mesh names).

**Key Files**
- `src__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — new: capsule physics, collision, gravity, stair stepping, activate/deactivate.
- `src__NavigationAndCameras/Na__Navmode__WalkMode__DesktopControls.js` — new: WASD + mouse Pointer Lock controls.
- `src__NavigationAndCameras/Na__Navmode__WalkMode__TouchScreenControls.js` — new: touch joystick, look, pinch controls.
- `src__3dObject__InteractionsSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` — new: proximity door trigger.
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — modified: exports `Na__DoorAnimation__DoorRegistry` and `Na__DoorAnimation__ToggleDoor`.
- `src__AppConfig/Na__AppConfig__Main.json` — added `Global__Hotkeys` and `Navmode__WalkMode` sections.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — mirrored AppConfig additions, stores `TestEnv__DefaultView`.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — walk mode integration, save view logic, toggle UI wiring.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — walk mode panel HTML.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — walk mode panel styles.
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.py` — added `/api/save-default-view` POST endpoint.
- `index.html` — walk mode imports, initialization, collision mesh wiring, render loop integration, hotkey listener.

# ---------------------------------------------------------
## ValeVision3D v1.9.0  -  18-Feb-2026
### Save Camera Settings — Localhost-Only Button & Full State Restore

**Save Camera Settings Feature**
- Added "Save Camera Settings" button to Tools menu, visible only when running on localhost (Flask server).
- Button saves current camera position, rotation, FOV, and orbit target directly to the job-specific `project.json` via existing Whitecardopedia Flask API (`POST /api/projects/<folder_id>`).
- Replaced old "Download Position Data" panel (textarea, import JSON, download JSON) to simplify UI for end users.
- Added toast notification for success/error feedback (green success, red error, auto-dismiss ~3.5s).
- Exported `Na__UiFeature__BuildCameraJson` from `Na__UiFeature__CameraPosition__Controls.js` for use by save handler.
- New functions: `Na__UiFeature__ShowToast`, `Na__UiFeature__SaveCameraSettings`, `Na__UiFeature__InitializeSaveCameraButton`.
- Removed `Na__UiFeature__InitializeCameraPositionControls` import and call; left `@delegate` breadcrumb per dependency traversal protocol.

**Loading Fix: Restore Full Camera State**
- Fixed issue where rotation and FOV were not restored on reload; only position appeared to persist.
- Root cause: OrbitHelperCube GLB load overwrote orbit target with GLB center, then `controls.update()` recalculated rotation and wiped saved state. Saved `OrbitHelperCube__Position` from `project.json` was never applied during load.
- Hoisted `Na__Saved__ProjectCameraConfig` and `Na__Saved__ProjectOrbitTarget` so they survive into post-OrbitCube block.
- After OrbitHelperCube loads, re-apply saved `OrbitHelperCube__Position` to `controls.target` (mm → units via `Na__Math__ConvertMmToUnits`).
- Re-apply `Na__UiFeature__ApplyCameraConfig` and call `controls.update()` to finalize.
- Ensures position, orbit target, FOV, and rotation all restore correctly on reload.

**Key Files**
- `index.html` — save button HTML, toast div, save handler, conditional visibility, loading-sequence re-apply block.
- `src__CameraUtils/Na__UiFeature__CameraPosition__Controls.js` — export `Na__UiFeature__BuildCameraJson`.
- `src__Styles/ui-components.css` — `.na-toast`, `.na-toast--visible`, `.na-toast--error` styles.

# ---------------------------------------------------------
## ValeVision3D v0.1.8  -  18-Feb-2026
### Scene Effects Delegation & Post-Processing Orbit-Anchored Fog

**Scene Effects Delegation**
- Moved default lighting and ground plane setup from inline `index.html` into dedicated module `src__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js`.
- Moved fog/environment setup into dedicated module `src__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js`.
- Architecture: AppConfig (JSON) → dedicated default-condition scripts → wider engine (render loop, main app).
- Added `@delegate:` breadcrumbs at extraction points per dependency traversal protocol.

**Fog Config Schema Migration**
- Replaced density-based fog fields with orbit-anchored envelope model in `Scene__Default__FogConfig`:
  - `Scene__Default__FogConfig__Description` — documents mm units and conversion requirement.
  - `Scene__Default__FogConfig__Enabled` — true/false flag.
  - `Scene__Default__FogConfig__Color` — integer RGB (e.g. 16777215 for white).
  - `Scene__Default__FogConfig__StartDistanceMm` — fog begins at this distance from orbit cube (default 30000 mm).
  - `Scene__Default__FogConfig__EndDistanceMm` — fog fully obscures beyond this distance (default 50000 mm).
- All distance values are integer millimeters; converted to Three.js scene units via `Na__Math__ConvertMmToUnits` in code.

**Post-Processing Fog Pass (Rewrite)**
- Replaced broken per-material opacity approach with screen-space post-processing ShaderPass.
- Fog now runs as final visual effect in the render pipeline: RenderPass → ProfileLines → **Fog Pass** → FXAA.
- Depth-based implementation: reads depth texture from render target, reconstructs world position from logarithmic depth buffer, computes distance from orbit anchor per pixel, blends fog color via `smoothstep(fogStart, fogEnd, dist)`.
- Covers all geometry types uniformly: meshes, linework (LineSegments2), and profile lines — no per-node traversal.
- Orbit cube sets fog zero point; when OrbitHelperCube loads, fog anchor switches from Dev__DefaultCube to orbit cube center.
- MM-to-units conversion applied in `Na__Scene__CreateFogPass` via `Na__Math__ConvertMmToUnits` for start/end distances.

**Render Pipeline Changes**
- Added `DepthTexture` to EffectComposer render target for fog pass depth reads.
- `Na__RenderPipeline__SetupComposer` now accepts optional `fogPass` parameter; inserts fog pass after profile lines, before FXAA.
- Fog pass receives depth texture uniform and per-frame camera matrices for world position reconstruction.

**Key Files**
- `src__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js` — ambient + directional light, conditional ground plane.
- `src__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js` — fog ShaderPass, CreateFogPass, UpdateFogPassUniforms, SetFogOrbitReference, ApplyFogBackground.
- `src__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — DepthTexture, fog pass insertion.
- `src__AppConfig/Na__AppConfig__Main.json` — Scene__Default__FogConfig schema.
- `index.html` — imports, fog pass creation, composer wiring, render loop uniform updates, orbit cube reference wiring.

# ---------------------------------------------------------
## ValeVision3D v0.1.7  -  18-Feb-2026
### Configuration Architecture Refactor — Scene Config Separation & Ground Plane Control

**Scene Configuration Restructure**
- Refactored monolithic `sceneConfig` object into four dedicated configuration objects following `Scene__GroundPlane` naming convention.
- New config sections: `Scene__Default__CameraConfig`, `Scene__Default__LightingConfig`, `Scene__Default__FogConfig`, `Scene__Default__ControlsConfig`.
- All property names follow double-underscore pattern: `Section__Subsection__PropertyName` for consistency and discoverability.
- Improved organization: camera, lighting, fog, and controls settings now logically separated.

**Ground Plane Configuration**
- Extracted ground plane settings from `sceneConfig` into dedicated `Scene__GroundPlane` section.
- Added `Scene__GroundPlane__Enabled` flag (default: `false`) to conditionally create ground plane.
- Prevents Z-fighting artifacts when landscape meshes are present in GLB models.
- Ground plane only renders when explicitly enabled, eliminating secondary line rendering issues.

**Property Mapping**
- **CameraConfig**: `Scene__Default__CameraConfig__Fov`, `Scene__Default__CameraConfig__Near`, `Scene__Default__CameraConfig__Far`.
- **LightingConfig**: `Scene__Default__LightingConfig__AmbientIntensity`, `Scene__Default__LightingConfig__DirectionalIntensity`.
- **FogConfig**: `Scene__Default__FogConfig__Density`, `Scene__Default__FogConfig__Color` (used for both background and fog).
- **ControlsConfig**: `Scene__Default__ControlsConfig__MovementSpeed`, `Scene__Default__ControlsConfig__ElevationSpeed`, `Scene__Default__ControlsConfig__EnableWASD`, `Scene__Default__ControlsConfig__EnableDamping`, `Scene__Default__ControlsConfig__StatusHideDelay`.
- **GroundPlane**: `Scene__GroundPlane__Enabled`, `Scene__GroundPlane__Size`, `Scene__GroundPlane__yAxisOffset`, `Scene__GroundPlane__ShadowOpacity`.

**Code Updates**
- Updated `index.html`: replaced `Na__Config__SceneConfig` with four new config constants.
- Updated scene background/fog initialization to use `Na__Config__FogConfig`.
- Updated camera constructor to use `Na__Config__CameraConfig`.
- Updated lighting setup function to use `Na__Config__LightingConfig`.
- Added conditional ground plane creation based on `Scene__GroundPlane__Enabled` flag.

**Test Environment Synchronization**
- Applied identical structural changes to `TestEnv__SubAppData__Config.json`.
- Updated `TestEnv__PrototypeTestingSandbox__Main__.js` with matching config constant refactoring.
- Test environment now uses same separated config structure as main application.

**Benefits**
- **Eliminates Z-fighting**: Ground plane can be disabled when landscape meshes are present.
- **Improved maintainability**: Related settings grouped logically by function.
- **Consistent naming**: All config properties follow established double-underscore convention.
- **Better discoverability**: Clear separation makes configuration easier to understand and modify.
- **Backward compatible**: All existing functionality preserved with improved structure.

**Key Files Modified**
- `src__AppConfig/Na__AppConfig__Main.json` — refactored config structure.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — matching test config structure.
- `index.html` — updated config constants and all property references.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — updated test environment config usage.

# ---------------------------------------------------------
## ValeVision3D v0.1.6  -  15-Feb-2026
### Building Storey Visibility System — Dolls House View & Per-Storey Toggle
*Note: Developed in Test Environment, Migrated to Production Module*

**Feature Overview**
- Per-storey visibility control for multi-storey building models enabling interior exploration.
- "Dolls house view" cut-away mode: hides topmost visible storey's roof to reveal interior spaces.
- Intelligent roof management: lower storey roofs remain visible as ceilings for spatial context.
- Individual storey toggle: show/hide specific floors independently.
- Roof mode toggle: switch between solid building (all roofs) and dolls house (topmost roof hidden).
- Automatic detection from GLB filenames: no manual configuration required.

**SketchUp GLB Builder v1.6.0 Integration**
- Storey-based export system: detects top-level storey containers tagged 90-93 at model root.
- Per-storey per-element export: children organized by element tags (walls 21, floors 22, roofs 23, etc.).
- World-space transform baking: storey container's transformation pre-multiplied into export root.
- Filename pattern: `{Prefix}Storey__{StoreyName}__{ElementType}__{Suffix}.glb` (e.g., "Storey__GroundFloor__ProposedWalls__MeshModel__.glb").
- Element tag granularity: split tag 10 (Existing) and tag 20 (Proposed) into individual element ranges for finer control.
- Parent transform parameter: `Na__GlbEngine__ExportEntitiesToGlb` and `Na__LineworkEngine__ExportLineworkToGlb` accept optional parent transform.
- Transform chain: `Z_UP_TO_Y_UP * storey.transformation * child.transformation` ensures correct vertical positioning.
- MAX_NESTING_DEPTH increased from 3 to 4 to support storey container nesting level.
- Backward compatible: non-storey models export identically using flat TAG_RANGES system.

**Module Architecture**
- Permanent module: `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__SystemLogic__.js`.
- Stateful design: maintains internal storey map, visibility state, roof map, and roof visibility flag.
- Clean separation: pure logic in module, DOM manipulation in caller.
- Public API: Initialize, DetectStoreys, SetStoreyVisibility, ShowOnlyBelow, ShowAll, ToggleStorey, ToggleRoof, GetState, GetStoreyDisplayName.
- Configuration support: accepts storey order and default roof visibility mode.
- Zero DOM dependencies: no HTML/CSS coupling, works with any UI framework.

**Storey Detection System**
- Pattern matching: scans loaded GLB model names for `Storey__{StoreyName}__` pattern.
- Supported storey names: GroundFloor, FirstFloor, SecondFloor, ThirdFloor (configurable order).
- Automatic grouping: models with matching storey names grouped together for batch visibility control.
- Roof detection: filters models with "Roof" substring (ProposedRoofs, ExistingRoofs) per storey.
- Custom storey support: detected storeys not in predefined order automatically appended.

**Intelligent Roof Visibility Logic**
- **Solid building mode** (default): All roofs visible for complete exterior view.
- **Dolls house mode**: Topmost visible storey's roof hidden (reveals interior), lower roofs shown as ceilings.
- Dynamic adaptation: roof logic recalculates when storey visibility changes.
- Example flow: GF + FF visible → GF roof shown (ceiling), FF roof hidden (see inside FF).
- Manual override: Roof toggle button switches between modes independent of storey state.

**User Interaction Modes**
- **Individual toggle**: Click storey button to show/hide that floor.
- **Dolls house cut**: Right-click storey button to show only that storey and below (architectural section).
- **Entire building**: "Show Entire Building" button restores all storeys with current roof mode.
- **Roof control**: Dedicated roof button toggles between solid building and dolls house view.

**Test Environment Integration**
- Storey panel UI: bottom-left panel with roof button (top) and storey buttons (ordered top to bottom).
- Visual feedback: green tint for visible storeys, red tint for hidden, blue tint for roof button.
- Icon system: eye (visible), no-entry (hidden), house (solid building), no-entry (dolls house).
- Separator line between roof and storey buttons for clear visual hierarchy.
- State synchronization: UI buttons reflect module state via `GetState()` API.

**Benefits**
- **Interior exploration**: Remove upper floors to see room layouts and spatial relationships.
- **Loft conversions**: Hide final roof to expose top floor interior design.
- **Construction phasing**: Show building progress by revealing storeys sequentially.
- **Client presentations**: Dynamic cut-away views without pre-rendered sections.
- **Accessibility**: Understand multi-storey layouts for wheelchair access planning.

**Technical Details**
- Module state: `{ map, order, hasStoreys, visibleState, roofMap, roofVisible }`.
- Detection complexity: O(n) where n = loaded models (single scan on load/refresh).
- Visibility updates: O(k) where k = models per storey (small filtered sets).
- Roof logic: O(m) where m = roof models per storey (typically 1-2).
- Three.js integration: sets `.visible` property on Object3D nodes (no geometry modification).

**Key Files**
- `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__SystemLogic__.js` — Core storey visibility module.
- `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__README__.md` — Integration documentation.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — Test environment integration (wrapper functions).
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — Storey panel HTML structure.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — Storey panel styling (bottom-left positioning).
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — StoreyVisibility configuration section.

# ---------------------------------------------------------
## ValeVision3D v0.1.5  -  15-Feb-2026
### 3D Object Interactions System — Click-to-Open Door Animation 
*Note: Migrated From Test Environment*

**Feature Migration to Main Application**
- Door animation feature promoted from test environment to production ValeVision3D application.
- New module system: `src__3dObject__InteractionsSystem/` for interactive 3D object behaviors.
- Dual model animation: synchronized rotation of mesh (solid geometry) and linework (edges) door models.
- Y-up coordinate space integration: proper vertical rotation axis `(0, 1, 0)` via transform conjugation in GLB export.
- Config-driven architecture: nested configuration under `3dObject__InteractionsSystem` → `3dObject__Interaction__DoorAnimation`.
- Fully qualified property names: `3dObject__Interaction__DoorAnimation__Enabled`, `AnimationDurationMs`, `DefaultRotationDeg`, `ClickThresholdPx`.

**SketchUp GLB Builder v1.5.0 Integration**
- Hierarchy-preserving GLB export for door assemblies (ADR-prefixed entities).
- Door Handler module (`Na__TrueVision__GlbBuilder__SpecialObject__DoorObjectHandling__.rb`) exports ADR > MOD/ROT/OuterShell node structures.
- Transform conjugation: `Z_UP * M_su * inv(Z_UP)` converts SketchUp Z-up local spaces to glTF Y-up.
- Inline detection during scene graph traversal: zero overhead when no doors present.
- Tag 25 mapping: `25__ProposedBuilding__Doors` exports as `*__ProposedDoors__MeshModel/LineworkModel__.glb`.
- Both mesh and linework exporters preserve identical hierarchy with matching node names.

**Main Application Integration**
- Module location: `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`.
- Auto-initialization after model loading if config enabled and door model groups found.
- Delta time tracking added to render loop for frame-rate-independent animation.
- Model loader category support: `ValeVision__MainBuildingModel__ProposedDoors` added to load order.
- Model toggle controls: "Doors" display name for visibility toggles.
- Configuration: `src__AppConfig/Na__AppConfig__Main.json` under `3dObject__InteractionsSystem`.

**Animation System Features**
- Click detection with orbit drag filtering (4px threshold).
- Raycasting against door meshes (both mesh and linework) with ADR ancestor lookup.
- Smooth easeInOutCubic animation (600ms default duration).
- Mid-animation reversal: click during animation to reverse direction with proportional duration scaling.
- Toggle behavior: CLOSED → OPENING → OPEN → CLOSING → CLOSED state machine.
- Pivot rotation around ROT hinge point using quaternion transforms.
- Per-door configuration: rotation angle parsed from MOD name (e.g., `MOD001__ROT__90-Deg__DoorPanel`).

**Test Environment Cleanup**
- Test scripts migrated to main app; test environment now imports from production module.
- Removed duplicate code: test feature scripts deleted, replaced with migration notes.
- Test config inherits door animation settings with proper nested structure.
- Clean separation: test environment validates production code, ready for next feature prototype.

**Naming Convention (SketchUp → glTF)**
- **ADR** = Door Assembly (e.g., `ADR002__InternalDoor__GroundFloor__PorchToLounge`)
- **MOD** = Modifier Object (e.g., `MOD001__ROT__90-Deg__DoorPanel`) — contains rotating geometry
- **ROT** = Rotation Point (e.g., `ROT001__RotationPoint__DoorHingeCentre`) — hinge pivot position

**Key Files**
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — Production door animation module.
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md` — Technical documentation.
- `src__AppConfig/Na__AppConfig__Main.json` — Door animation configuration.
- `index.html` — Import, initialization, delta time tracking, render loop integration.
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — ProposedDoors category support.
- `src__ModelToggle/Na__UiFeature__ModelToggle__Controls.js` — Doors visibility toggle.

# ---------------------------------------------------------
## ValeVision3D v0.1.4  -  14-Feb-2026
### Testing Environment — Prototype Sandbox & Click-to-Open Doors Feature (Initial Prototype)

**Test Environment Infrastructure**
- Created self-contained prototype testing sandbox (`80__Testing__PrototypeEnvironment/`) for rapid feature development before main integration.
- Standalone Flask server (`TestEnv__FlaskLocalServer.py`) on port 5500 serving test environment + parent ValeVision3D engine modules.
- Separate HTML/JS/CSS bootstrap reusing core engine (navigation, render pipeline, math utils) from parent project.
- Local GLB file loading from `TestEnv__GlbFiles/` folder with automatic discovery via Flask API endpoint.
- Live statistics overlay (FPS, mesh count, vertex count, GLB file count) for performance monitoring.
- Full node graph explorer panel (resizable, collapsible) with per-node visibility toggles for scene inspection.
- Tree view export to clipboard with visual hierarchy (emoji icons, indentation, visibility status).
- Testing mode banner and header modifications to clearly distinguish sandbox from production environment.

**Door Animation System (First Feature Test)**
- Click-to-open/close door animation system using scene graph naming conventions.
- Scans loaded GLB models for door assemblies (`ADR` prefix), modifier objects (`MOD__ROT__XX-Deg`), and rotation points (`ROT` prefix).
- Parses rotation angle from modifier name (e.g., `MOD001__ROT__90-Deg__DoorPanel` extracts 90 degrees).
- Raycasting with pointer movement threshold (4px) to distinguish clicks from orbit camera drags.
- Smooth animation with easeInOutCubic easing, configurable duration (600ms default).
- Pivot rotation around hinge point (Y-axis) using quaternion math for proper door swing.
- Toggle behavior: click closed door to open, click open door to close, click during animation to reverse from current position.
- Mid-animation reversal scales duration proportionally to remaining travel distance.
- Config-driven feature flag (`DoorAnimation__Enabled`) and parameters (duration, default rotation, click threshold).

**Architecture & Integration**
- Feature module pattern: standalone ES6 module (`Test__ModelInteraction__Animation__ClickToOpenDoors__.js`) with exported init and update functions.
- Config-driven feature system: test environment config JSON (`TestEnv__SubAppData__Config.json`) controls feature flags and parameters.
- Clean integration points: import in module region, initialize after GLB loading, update in render loop with delta time.
- Delta time tracking added to render loop for frame-rate-independent animation.
- Module structure follows ValeDesignSuite conventions: regions, 4-space indentation, inline comments, `Na__` namespace prefix.

**Development Workflow Benefits**
- Isolated feature prototyping without affecting production ValeVision3D environment.
- Live reloading and debugging with dedicated dev server and file structure.
- Node explorer provides immediate scene graph inspection for understanding model hierarchies.
- Performance overlay monitors frame rate impact of new features during development.
- Clean migration path: stable features copy from test scripts to main engine with minimal refactoring.

**Key Files Created**
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.py` — Flask dev server with GLB file API.
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.bat` — Server launch script.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — Test environment bootstrap and render loop.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — Test environment HTML layout.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — Test environment UI styles.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — Test environment configuration.
- `80__Testing__PrototypeEnvironment/TestEnv__README__.md` — Test environment documentation.
- `80__Testing__PrototypeEnvironment/TestEnv__CurrentFeatureTestScripts/Test__ModelInteraction__Animation__ClickToOpenDoors__.js` — Door animation feature module.

# ---------------------------------------------------------
## ValeVision3D v0.1.3c  -  13-Feb-2026
### Page Layout Touch Controls — Edge Handle Clipping Parity (iOS / Touchscreen)

**Issue Fixed**
- On touch devices (including iOS), image clipping via edge handles was not available in Layout View.
- Mouse controls supported edge clipping (`tc`, `bc`, `lc`, `rc`), but touch controls only supported body move + corner proportional resize.

**Touch Control Update**
- Added edge midpoint hit-testing in touch controls:
  - top-center (`tc`)
  - bottom-center (`bc`)
  - left-center (`lc`)
  - right-center (`rc`)
- Added one-finger edge-drag clipping logic matching PC behavior:
  - `rc` -> updates `clipRight`
  - `lc` -> updates `clipLeft`
  - `bc` -> updates `clipBottom`
  - `tc` -> updates `clipTop`
- Clip limits now enforce minimum visible content and max-clip bounds equivalent to PC constraints.

**Behavior Preserved**
- One-finger body drag still moves image.
- One-finger corner drag still performs proportional resize.
- Two-finger pinch/pan navigation path remains unchanged and still takes precedence for canvas navigation.

**Key File Modified**
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js`
  - Added edge hit-test branches.
  - Added clip state persistence in drag start transform.
  - Added edge clipping branches in touch move handler.
  - Updated module header comments to reflect clipping support.

# ---------------------------------------------------------
## ValeVision3D v0.1.3b  -  13-Feb-2026
### Layout View Export Fix — Profile Lines / Camera Projection Synchronization

**Issue Fixed**
- Layout View images could show profile lines at a slightly different perspective/FOV than the base render, creating a "layered perspective" look.
- Root cause was capture-time desynchronization between color pass (`composer.render()`) and profile-line normal pass (`renderProfileNormals()`), especially during custom export resize/aspect changes.

**Pipeline Synchronization Update**
- Export pipeline now resolves a full render pipeline state bundle instead of composer-only access.
- Capture order now enforces synchronized projection and buffer state:
  - camera aspect/projection update
  - composer resize
  - profile lines normal render target resize
  - profile normals re-render
  - composer render
- Restore order now also re-syncs profile lines after returning renderer/composer to live viewport size.

**3-Stage Naming / API Wiring**
- Naming convention preserved with `Na__...__...__...` style throughout new helper and state plumbing.
- Added `Na__UiFeature__ResolveRenderPipelineState(...)` helper in export controls.
- `Na__UiFeature__InitializeImageExportControls(...)` now accepts render-pipeline-state getter (composer + helpers), backward compatible with legacy composer getter shape.

**Key Files Modified**
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js`
  - Added render-pipeline-state resolver helper.
  - Updated export render path to call `setProfileLinesSize(...)` and `renderProfileNormals()` at capture and restore boundaries.
- `index.html`
  - Added shared `Na__RenderPipeline__State` module variable.
  - Updated image export initializer wiring to pass render-pipeline-state getter.
  - Updated render loop and resize code paths to use shared pipeline state consistently.

# ---------------------------------------------------------
## ValeVision3D v0.1.3  -  12-Feb-2026
### Render Effect — Profile Lines (SketchUp-Style Silhouette Edges)

**Profile Lines Feature**
- SketchUp-style "Profile Lines" effect: extra visible edges around rounded/cylindrical geometry (finials, chimney pots, turned details) so they read clearly in the whitecard view.
- Implemented as a post-processing pass: scene normals rendered to a separate buffer; Sobel edge detection on the normal buffer; dark profile lines composited over the scene before FXAA.
- Line geometry (LineSegments2) is hidden during the normal pass to avoid artifacts.
- Enable/disable and parameters (edge color, normal threshold, edge width) driven by AppConfig `RenderEffect__ProfileLines`.

**Config & Integration**
- New AppConfig block `RenderEffect__ProfileLines`: `Enabled`, `EdgeColor`, `EdgeThresholdNormal`, `EdgeThresholdDepth`, `EdgeWidth`.
- Composer setup returns `{ composer, renderProfileNormals, setProfileLinesSize }`; render loop calls `renderProfileNormals()` each frame before `composer.render()`; resize handler calls `setProfileLinesSize(width, height)`.

**Key Files**
- `src__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — normal buffer render, Sobel shader, pass creation.
- `src__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — optional ProfileLines pass insertion, config wiring.
- `src__AppConfig/Na__AppConfig__Main.json` — `RenderEffect__ProfileLines` block.
- `index.html` — config destructuring, composer result handling, loop and resize wiring.

# ---------------------------------------------------------
## ValeVision3D v0.1.2  -  12-Feb-2026
### 3D Render Pipeline — Ground Line Visibility & RenderConfig__Linework Naming

**Ground Line Visibility Fix**
- Ground line (building base meeting ground plane) was invisible in viewport due to depth fighting with mesh surfaces.
- Root cause: renderer uses `logarithmicDepthBuffer: true`; depth is written in fragment shader via `gl_FragDepth`, so WebGL polygon offset has no effect (hardware offset does not modify `gl_FragDepth`).
- Solution: fragment shader depth bias via `LineMaterial.onBeforeCompile` — after `#include <logdepthbuf_fragment>`, subtract a small configurable value from `gl_FragDepth` so line fragments win the depth test against coplanar mesh.
- Depth bias value configurable in AppConfig; default `0.00015` balances visibility of ground line without causing distant lines to pop in front of surfaces.

**RenderConfig__Linework Config & 3-Stage Naming**
- Linework config block renamed from `"linework"` to `"RenderConfig__Linework"` for consistency with 3-stage naming.
- All linework properties use `RenderConfig__Linework__*` keys: `EdgeColor`, `LineWidth`, `PolygonOffsetFactor`, `PolygonOffsetUnits`, `RenderOrder`, `DepthBias`.
- Downstream code in `Na__ModelLoader__MultiModel.js` updated to read `config.RenderConfig__Linework` and `lineworkConfig.RenderConfig__Linework__*` properties.
- Single source of truth for line appearance and depth behaviour; no other files reference these keys.

**Key Files Modified**
- `src__AppConfig/Na__AppConfig__Main.json` — `RenderConfig__Linework` block and property names.
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — depth bias hook on LineMaterial, config key references.

# ---------------------------------------------------------
## ValeVision3D v0.1.1  -  12-Feb-2026
### Page Layout System — Image Clipping with Edge Handles

**Edge Handle Clipping Feature**
- Edge handles (top, bottom, left, right) now clip/trim images instead of free resizing.
- Dragging edge handles inward crops the image from that edge while maintaining container size.
- Corner handles continue to scale the image proportionally (behavior unchanged).
- Clipping is non-destructive: image container maintains full dimensions; only visible portion changes.
- Minimum 10mm visible content enforced to prevent complete clipping.

**Technical Implementation**
- Added clip properties to `imageTransform` state: `clipTop`, `clipRight`, `clipBottom`, `clipLeft` (all in mm).
- Canvas rendering applies clipping via `ctx.clip()` with calculated visible region rectangle.
- Source image draw uses 9-parameter `drawImage()` to map clipped source region to full container bounds.
- PC controls updated: edge handle drag calculates clip values based on drag delta and enforces maximum clip constraints.
- Touch controls description clarified: only corner handles used on touch devices (edge handles PC-only).

**Code Organization**
- Created new "Selection Handle Rendering System" region in `Na__PageLayoutSystem__CanvasRenderPipeline__.js`.
- Extracted handle drawing logic into specialized functions:
  - `Na__PageLayout__DrawHandle()` — draws single handle square
  - `Na__PageLayout__DrawSelectionHandles()` — draws all 8 handles
  - `Na__PageLayout__DrawSelectionBorder()` — draws dashed selection border
- Improved code maintainability by grouping all handle rendering logic in dedicated region block.

**User Experience**
- Intuitive trimming workflow: drag edge handles inward to crop unwanted portions of image.
- Visual feedback: handles always show full container bounds for clear reference.
- Selection border indicates full container area; clipped image visible within that boundary.
- Allows precise image composition without affecting layout positioning.

**Key Files Modified**
- `src__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js` — added clip properties to state initialization.
- `src__PageLayoutSystem/Na__PageLayoutSystem__CanvasRenderPipeline__.js` — clipping render logic, reorganized handle system.
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js` — edge handle clipping behavior, clip value constraints.
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js` — updated description (no edge handles on touch).

# ---------------------------------------------------------
## ValeVision3D v0.1.0  -  12-Feb-2026
### OrbitHelperCube GLB Integration — Automatic Orbit Target Positioning

**Automatic Orbit Target from SketchUp Exported Cube**
- OrbitHelperCube GLB files exported from SketchUp now automatically define the camera orbit focus point.
- Cube GLB files follow naming pattern: `{ProjectName}__NN__OrbitHelperCube__MeshModel__.glb`.
- System detects OrbitHelperCube URLs in project model arrays and separates them from regular models.
- Cube center position (bounding box) becomes the orbit target, eliminating manual JSON configuration per project.
- Cube is hidden by default; visible only when `OrbitHelperCube__Debug__Visible` flag is enabled in AppConfig.

**Implementation**
- New functions in `Na__ModelLoader__MultiModel.js`:
  - `Na__ModelLoader__SeparateOrbitCubeUrl()` — filters OrbitHelperCube URL from model array.
  - `Na__ModelLoader__LoadOrbitHelperCube()` — loads cube GLB and extracts center position.
- OrbitHelperCube URL filtered before model loading, ensuring it never appears as a category or toggle button.
- Loading sequence: separate cube URL → load cube → set orbit target → load remaining models.
- Falls back to `Dev__DefaultCube` position when no OrbitHelperCube found (backward compatible).

**Configuration Changes**
- Removed `Camera__DefaultTarget` from `Camera__DefaultPosition` in AppConfig (orbit target now from cube or Dev__DefaultCube).
- Added `OrbitHelperCube__Debug__Visible: false` flag in `Dev__DeveloperMode` config.
- Project JSON files can remove `Camera__DefaultTarget` when OrbitHelperCube GLB is present.
- Camera UI JSON output split into two sections: `Camera__DefaultPosition` (Pos/Rotation/FOV) and `OrbitHelperCube__Position` (target) for easier copy/paste.

**Benefits**
- No manual orbit target configuration required per project — set in SketchUp instead.
- Consistent orbit positioning across projects using exported cube geometry.
- Debug visibility toggle allows inspection of orbit cube position when needed.
- Backward compatible: projects without OrbitHelperCube use Dev__DefaultCube fallback.

**Key Files**
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — cube detection, separation, and loading functions.
- `index.html` — loading sequence integration, orbit target application, debug flag parsing.
- `src__AppConfig/Na__AppConfig__Main.json` — removed Camera__DefaultTarget, added debug flag.
- `src__CameraUtils/Na__UiFeature__CameraPosition__Controls.js` — split JSON output format.

# ---------------------------------------------------------
## ValeVision3D v0.0.9  -  11-Feb-2026
### Page Layout View System (LayoutVision 2D)

**2D Page Layout System for A3 Document Composition**
- Standalone browser tab opens when user clicks "Layout View" button in Export Image panel.
- Rendered 3D viewport image positioned on A3 title block template (landscape 420x297mm).
- Full 2D canvas interaction: drag to reposition, corner/edge handles to resize image.
- Mouse wheel zoom toward cursor, middle/right-click pan, two-finger pinch/pan on touch.
- Exports exact A3-scale PDFs: "Export Full Layout" (title block + image) or "Export Image Only".
- Uses jsPDF v4.1.0 (version-locked, CDN independent, self-contained UMD build).

**Architecture**
- Data transfer via `window.opener` global property (avoids localStorage 5-10 MB size limit).
- All positioning stored in mm coordinates relative to A3 origin; maps directly to jsPDF units.
- DPR-aware canvas rendering for sharp display on retina screens.
- Image initially centered at 80% of A3 printable area with source aspect ratio preserved.
- PC controls: proportional corner resize, free edge resize, body drag.
- Touch controls: single-finger drag/resize, two-finger pinch zoom + pan.

**Key Modules**
- `Na__PageLayoutSystem__Layout__.html` — standalone page with Vale-branded header matching main app.
- `Na__PageLayoutSystem__SystemLogic__Main__.js` — orchestrator; loads image from opener, manages state.
- `Na__PageLayoutSystem__CanvasRenderPipeline__.js` — 2D rendering: A3 paper, title block, image, handles.
- `Na__PageLayoutSystem__2dNavigationControls__.js` — zoom toward cursor, pan on middle/right-click.
- `Na__PageLayoutSystem__Controls__Pc__.js` — left-click hit-test, drag/resize with cursor feedback.
- `Na__PageLayoutSystem__Controls__TouchScreen__.js` — touch drag/resize/pinch with gesture disambiguation.
- `Na__PageLayoutSystem__PdfExport__A3__.js` — jsPDF integration for exact A3-scale PDF export.
- `01__Dependencies__VersionLocked/jspdf.umd.js` — jsPDF v4.1.0 vendored dependency (1.2 MB).

**Integration**
- Shared render helper `Na__UiFeature__RenderToDataUrl()` in Export Controls module.
- Both "Export Now" and "Layout View" use same render pipeline (custom or viewport mode).
- Layout View button added to Export Image panel below "Export Now" button.
- Export controls refactored to eliminate code duplication between export paths.

**UI**
- Header matches main ValeVision app (white background, Vale logo, blue border); title "LayoutVision 2D".
- Secondary actions bar below header with Export Full Layout, Export Image Only, Close buttons.

# ---------------------------------------------------------
## ValeVision3D v0.0.8  -  11-Feb-2026
### Image Export Safe Frame & Rule of Thirds Grid Overlay

**Safe Frame Overlay**
- Transparent grey overlay bars (top, bottom, left, right) showing export crop area.
- Dynamically updates based on selected aspect ratio (3:2, 4:3, 16:9).
- Appears when Image Export panel is opened; hides when panel is closed.
- Automatically recalculates on window resize with debounced updates.
- Uses aspect ratio fitting algorithm for pillarbox (wider viewport) or letterbox (taller viewport) display.

**Rule of Thirds Grid Overlay**
- Composition guide lines dividing safe frame into 9 equal parts (3x3 grid).
- Vale blue (#182c3b) at 50% opacity for brand consistency.
- Line thickness 1.5px for improved visibility.
- Updates dynamically with aspect ratio changes.
- Positioned within safe frame area for accurate composition guidance.

**Implementation**
- New module `Na__UiFeature__ImageExport__ViewportOverlays.js` handles overlay creation, positioning, and updates.
- CSS module `image-export-overlays.css` provides styling with z-index 500 (between viewport and menu).
- Overlays use `pointer-events: none` to allow continued 3D interaction through overlay.
- Integrated into export controls with show/hide on panel toggle and aspect ratio slider changes.
- Overlay automatically hides when custom export is disabled.

**Key Files**
- `src__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js` — overlay logic and positioning calculations.
- `src__Styles/image-export-overlays.css` — overlay styles and animations.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — integration with export panel controls.
- `index.html` — overlay DOM elements added to root container.

# ---------------------------------------------------------
## 11-Feb-2026 - ValeVision3D v0.0.7
### Enhance Whitecard Post-Process Pipeline

**Image Export Post-Processing**
- Added "Enhance Whitecard" toggle to Export Image panel (default: on).
- Post-processing runs at export time only; viewport render pipeline unchanged.
- Canvas 2D pixel manipulation pipeline applied after Three.js render, before download.
- Config-driven effect order and parameters via `Na__AppConfig__Main.json` → `ImageExport__PostProcessEffects`.

**Levels Effect** (`Na__ImageExport__PostProcessEffects__Levels.js`)
- Pixel-level black/white/gamma remapping via ImageData.
- White point set to 230 clips light grays to pure white; dark lines preserved.
- Removes subtle face shading from render for clean whitecard line art.

**High Pass Sharpen Effect** (`Na__ImageExport__PostProcessEffects__HighPassSharpen.js`)
- CSS `blur()` filter for GPU-accelerated blur; high-pass layer = (original - blurred) / 2 + 128.
- Overlay blend mode sharpens black lines against white background.
- Configurable radius, blend mode, opacity.

**Pipeline Orchestrator** (`Na__ImageExport__PostProcessEffects__Pipeline.js`)
- Sorts effects by `Order` field; applies enabled effects sequentially.
- Each effect is a standalone module; pipeline reads config and invokes them.

**Key Files**
- `src__AppConfig/Na__AppConfig__Main.json` — `ImageExport__PostProcessEffects` config block.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — enhance toggle, pipeline integration.
- `src__ImageExport/Na__ImageExport__PostProcessEffects__*.js` — Levels, HighPassSharpen, Pipeline.

# ---------------------------------------------------------
## 10-Feb-2026 - ValeVision3D v0.0.6
### Dynamic Model Toggle System & Build Pipeline Integration

**Model Toggle Controls**
- Created `src__ModelToggle/Na__UiFeature__ModelToggle__Controls.js` module for per-category visibility toggling.
- Dynamic button generation from loaded model groups Map (category -> THREE.Group).
- User-friendly display names: "Existing Building", "Design Proposal", "Landscape".
- Pairs Mesh + Linework models per category into single toggle button.
- Active/inactive visual states with green dot indicator and line-through styling.
- Future-proof: automatically generates buttons for new categories (furniture, vegetation, context).
- Integrated as expandable dropdown menu item "Toggle Model Layers" positioned between "Export Image" and "Download Position Data".
- Panel title: "Model Parts List" displays category toggle buttons.
- Uses standard dropdown panel pattern with toggle button for consistent UI behavior.
- Panel expands/collapses dynamically matching other menu items (Adjust Camera Lens, Export Image, Download Position Data).

**Project.json Format v4**
- Introduced `valeVision_ModelUrls` array format to support multiple model URLs per project.
- Deprecated `valeVision_ModelUrl_BaseMesh` / `_Linework` (v3) format.
- Maintains backward compatibility in `Na__AppUtils__ExtractModelUrls` for all legacy formats (v1-v4).
- Cleans legacy keys when writing/updating project.json files.

**Build Automation Pipeline Updates**
- Updated `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`:
  - Removed version-based GLB selection (parse_glb_version, select_latest_glb_by_layer).
  - Added `__NaModel__` to `__ValeVision__` namespace rebranding in CDN URL generation.
  - Now discovers all root-level GLBs (skips `01__Archive/` subfolder).
  - **Critical fix**: Always updates model URLs in existing projects instead of skipping entirely.
  - Writes v4 `valeVision_ModelUrls` array format for all new and refreshed projects.
  - Added "Model URLs refreshed" counter and status messages to console output.
  - Fixed Unicode encoding errors in Windows console (replaced arrow and em-dash characters).
- Verified `AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` consistency with new naming.

**Validation & Testing**
- Successfully tested full pipeline on `2026/61721__Payne` project.
- Confirmed 6 GLB models discovered (Landscape, Existing Building, Proposed Building × 2 types each).
- Verified project.json updated with v4 format and `__ValeVision__` rebranded CDN URLs.
- Confirmed models load and render correctly in ValeVision3D viewer with new toggle controls.

# ---------------------------------------------------------


# ---------------------------------------------------------
## 10-Feb-2026 - ValeVision3D v0.0.5 
### Multi-Model Category Loading System
- New `Na__ModelLoader__MultiModel.js` module for loading multiple GLB model pairs.
- Models are now classified by ValeVision category (e.g. MainBuildingModel__Existing, LandscapeEnvironment).
- Priority-based sequential loading order matches GLB Builder tag range definitions.
- Each category gets its own THREE.Group enabling future per-category visibility toggling.
- URL parser accepts both `__ValeVision__` (preferred CDN) and `__NaModel__` (backstop) namespaces.
- Mesh and linework loading logic extracted from index.html into dedicated module.
- AppConfig modelDefaults now uses `modelUrls` array instead of separate base/linework URLs.
- Backwards-compatible project.json extraction supporting all four legacy URL formats (v1-v4).
- Cloudflare R2 sync script updated to rename `__NaModel__` to `__ValeVision__` in CDN filenames.
- R2 sync script now skips `01__Archive/` subfolder and pushes all root-level GLBs without version logic.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.4 
### Web Project Path Fixes
- Added absolute GitHub Pages base URL for project.json fetching.
- Added year-aware and legacy project ID normalization for web loading.
- Removed hard-coded 2025 web path to prevent 404 on new year projects.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.3 
### Normalized Navigation Controls
- Added normalized mouse wheel zoom with fixed step per tick.
- Added touch-first navigation module for iPad/mobile detection.
- Routed nav initialization through device-aware control selection.
- Added AppConfig-based navmode settings for mouse and iPad controls.
- Inverted mouse wheel zoom direction for expected scroll behavior.
- Added arrow key movement alongside WASD navigation.
- Added mouse wheel acceleration after 3 consecutive ticks for faster long-range zoom.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.2 
### Navigation, Units, and Camera Tools Updates
- Added Dev__DeveloperMode default cube for fixed scale + pivot reference.
- Standardized config units as integer millimeters with mm-to-units helpers.
- Updated camera defaults schema and live JSON export/import panel.
- Removed bounding-box recentering logic and added orbit limits by scale.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 04-Feb-2026 - ValeVision3D v0.1.0 
### Total Engine Rebuild and New Features
- Switched to a new engine architecture.
  - Previously used Babylon.js as the legacy engine for the 3D runtime.
  - Now using **Three.js** for the 3D engine.
- Refactored the old codebase to be more modular and maintainable.
# ---------------------------------------------------------