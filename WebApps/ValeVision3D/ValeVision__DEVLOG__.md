# ValeVision3D Development Log
# =========================================================

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
  - Previously use Babylon.js for the 3D engine.
  - Now using Three.js for the 3D engine.
- Refactored the old codebase to be more modular and maintainable.
# ---------------------------------------------------------