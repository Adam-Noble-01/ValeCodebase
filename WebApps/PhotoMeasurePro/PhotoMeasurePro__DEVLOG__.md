# PhotoMeasurePro Development Log
# =========================================================

## PhotoMeasurePro v0.4.0 - 21-Apr-2026
### Scene3D mode with analytical plane reconstruction + depth/seg cache pipeline

Introduced a new 3D measurement workflow to break out of single-plane limits when measuring elements that project in front of or behind the facade.

#### 3D mode and viewport
- Added `5. 3D Measure` mode and sidebar controls in `PhotoMeasurePro__App__.html`.
- Added Three.js viewport (`PhotoMeasurePro__ThreeViewport__Main__.js`) with orbit controls, analytical Facade/Side/Ground planes, offset planes, and 3D pick-to-measure interaction.
- Added `PhotoMeasurePro__ThreeViewport__OverlayHud__.js` for live scene diagnostics (status, snap mode, pending point, measurement count).

#### Scene reconstruction + 3D measurements
- Added `PhotoMeasurePro__SceneReconstruction3D__WorldOriginSolver__.js` to derive an analytical scene bundle from existing perspective basis + constraints + anchor corner.
- Added `PhotoMeasurePro__SceneReconstruction3D__PlaneOffsetManager__.js` for user-defined depth-offset planes (e.g. bay window projection planes).
- Added `PhotoMeasurePro__Measurement3D__Engine__.js` to capture two world picks and store true 3D mm distances.

#### Depth and segmentation server pipeline
- Added Flask routes:
  - `POST /api/scene3d/depth/<project_code>`
  - `POST /api/scene3d/segmentation/<project_code>`
  - `GET /api/scene3d/cache/<filename>`
- Added `05__Server__DepthAndSegmentation/PhotoMeasurePro__Server__DepthAndSegmentation__Main__.py`:
  - writes 16-bit depth PNG cache and class-id segmentation PNG cache.
  - currently uses a robust fallback pipeline (luma-gradient depth + heuristic segmentation) with optional `onnxruntime` detection for future model binding.
- Added `05__Server__DepthAndSegmentation/requirements.txt` for the scene3d pipeline dependencies.

#### State + schema + project persistence
- Extended app state with `scene3d` and `measurements3d` slices (`PhotoMeasurePro__AppCore__StateManager__.js`).
- Extended project schema to v2 with:
  - `PhotoMeasurePro__ProjectFile__Scene3D`
  - `PhotoMeasurePro__ProjectFile__Measurements3D`
- Updated init hydration/build bridge to persist and restore 3D settings, offset planes, and 3D measurements.
- Added `ProjectFileManager` helpers to trigger depth/seg generation through the new Flask API.

#### Notes
- The current depth mesh rendering path is intentionally lightweight (wireframe placeholder driven by cache availability) to keep interaction responsive while ML calibration is iterated.
- The architecture now supports upgrading the fallback depth/seg stage to full Depth-Anything + SAM ONNX inference without changing the app-side contract.

# ---------------------------------------------------------

## PhotoMeasurePro v0.4.1 - 21-Apr-2026
### Photo-locked 3D rebuild + version-locked ONNX dependency layout

Rebuilt the Scene3D analytical foundation so the default 3D view locks to the source photo calibration and anchor-space convention, while keeping depth/segmentation inference in fallback mode until real ONNX models are present.

#### 3D analytical scene corrections
- `PhotoMeasurePro__SceneReconstruction3D__WorldOriginSolver__.js` now returns a complete analytical bundle (`worldOrigin` with `R_wc` and `C`, plane world corners, per-plane image footprints).
- Enforced world convention for anchor-space planes: Facade on `Y=0`, Side on `X=0`, Ground on `Z=0`, with anchor at `(0,0,0)`.
- Height inference now uses projected vertical setup lines against the facade plane, with fallback only when needed.

#### Three viewport photo-lock + picking fixes
- `PhotoMeasurePro__ThreeViewport__Main__.js` camera setup now derives FOV from `f` and image height, places camera from solver pose, applies principal point via `setViewOffset`, and supports explicit `Align to Photo`.
- Plane meshes now use solver-provided world corners (quad geometry) rather than hard-coded centred planes.
- Per-plane orthorectified textures are generated from image footprints using homography inversion + bilinear sampling and attached as `CanvasTexture`.
- Removed hard-coded tessellated placeholder depth mesh (`UpdateDepthMesh` is now a no-op until real depth mesh phase).
- Raycast hit selection now prefers facade/side intersections ahead of ground-behind hits.
- Offset planes inherit parent plane size and orientation, and offset along parent normal in mm.

#### App wiring updates
- Added `Align to Photo` control in `PhotoMeasurePro__App__.html` and wired in `PhotoMeasurePro__AppCore__Init__.js`.
- Build Scene now auto-aligns to photo lock after successful analytical solve.
- Removed fabricated depth scale fit samples; `depthScaling` remains `null` until real calibrated samples exist.

#### New version-locked dependency folder
- Added `00__ThirdParty__VersionLockedDependencies/` under PhotoMeasurePro root with:
  - `00__DepthAnythingV2__Small__Onnx/README.md`
  - `01__MobileSAM__Onnx/README.md`
  - `02__OnnxRuntime__PythonWheels/README.md` (optional wheel cache)
  - `download_models.py` (re-runnable downloader with optional SHA256 validation)
- Added root `.gitignore` rules to exclude ONNX binaries from git tracking.

#### Flask + server pipeline integration
- `PhotoMeasurePro__FlaskServer__Localhost__.py` now resolves `VERSION_LOCKED_DEPS_PATH` and adds it to `sys.path`.
- `PhotoMeasurePro__Server__DepthAndSegmentation__Main__.py` now resolves model paths from the new `00__` dependency folder and logs one warning when model files are missing, then continues heuristic fallback generation.

# ---------------------------------------------------------

## PhotoMeasurePro v0.3.1 - 21-Apr-2026
### Export settings controls, visibility-filtered PNG output, and interaction guardrails polish

Focused follow-up to improve export usability and interaction safety: added a dedicated export settings panel, matched button styling with existing sidebar controls, and made both main-view and ortho exports respect per-element visibility toggles.

#### Export settings UI
- Replaced the plain export button row with a new **Export Settings** section in `PhotoMeasurePro__App__.html`.
- Added toggle controls for `Perspective Lines`, `Measurements`, `Constraints`, `Guides`, `Angles`, `Anchor Marker`, and `Ortho Crop Box`.
- Kept both export actions in the section: `Export Main View PNG` and `Export Rectified PNG`.
- Updated sidebar styling in `PhotoMeasurePro__CoreUi__Styles__Sidebar__.css` so the new export controls match existing panel/button visual language.

#### Export visibility state + wiring
- Added persistent `exportVisibility` state object in `PhotoMeasurePro__AppCore__StateManager__.js` with all toggles defaulted to enabled.
- Wired checkbox changes in `PhotoMeasurePro__AppCore__Init__.js` to patch `exportVisibility` live.
- Added render-sync so toggle inputs always reflect state.

#### Main-view export pipeline
- Main export now builds its SVG overlay from canvas viewport render logic (not raw DOM snapshot), enabling deterministic export filtering.
- Added `PhotoMeasurePro__CanvasViewport__BuildOverlaySvgDocumentForExport(...)` in `PhotoMeasurePro__CanvasViewport__Main__.js`.
- `PhotoMeasurePro__AppCore__ExportMainView(...)` now passes `currentState.exportVisibility` into overlay generation before PNG compositing.

#### Ortho export pipeline
- Extended ortho overlay rendering helpers in `PhotoMeasurePro__CanvasViewport__OrthoStage__.js` to accept visibility options.
- `PhotoMeasurePro__OrthoWarpAndExport__Engine__.js` now passes `currentState.exportVisibility` into ortho overlay SVG composition, including optional crop-box visibility.

#### Related stability/UX items in this patch set
- Ortho preview resolution increased from 1600px to 4096px long edge for clearer preview detail.
- Rectified PNG export now composites dimensions/annotations onto the exported image.
- Perspective setup lines cannot be deleted in Select mode.
- Perspective lines are only draggable in `setup` mode.
- Constraint lines are only draggable in `constraint` mode.

# ---------------------------------------------------------

## PhotoMeasurePro v0.3.0 - 21-Apr-2026
### Z-up coordinates, robust scaling and ortho rectification, guides, angles, and ValeSpec-style projects

Follow-up to the v0.2.0 modular rebuild: coordinate-space authority, fixes for wrong multipliers and skewed ortho, canvas-based homography warping, richer ortho UX, SketchUp-style guides, angle measurement, and structured local project save/load.

#### Coordinate space and setup
- Added `PhotoMeasurePro__MathUtils__CoordinateSpace__.js` as the single source of truth for Z-up, right-handed world axes: X = facade horizontal, Y = side horizontal (depth), Z = vertical up; semantic planes Facade (XZ), Side (YZ), Ground (XY).
- Default measurement and constraint planes set to Facade; setup line types renamed to semantic tokens (`FacadeHorizontal`, `SideHorizontal`, `Vertical`) with consistent colours and VP axis labelling.
- Endpoint hints on perspective setup lines (world-oriented Start/End labels, e.g. X/Y/Z roles).

#### Measurement accuracy (reported ~1.5–2× errors before fix)
- Replaced fragile focal-length fallback with multi-pair estimation and median (`CalculateFocalLengthRobust`); removed `max(w,h)` shortcut that biased scale.
- Per-plane scale via `constraintsByPlane` and optional anchor corner to propagate scale without applying one plane’s constraint to all planes.
- `GetOrthogonalBasis` anchors Gram-Schmidt on measured Z where possible and applies `OrientBasisToScreen` so world +Z reads screen-up and +X screen-right, fixing basis sign ambiguity (“flipping”).
- Planar homography (`PhotoMeasurePro__MathUtils__PlanarHomography__.js`) for mathematically consistent image-to-plane mapping.

#### Ortho mode (elevation-style flattening)
- Replaced CSS `matrix3d` rectification with offscreen canvas warp + bilinear sampling (`PhotoMeasurePro__OrthoWarpAndExport__CanvasRenderer__.js`) so preview and export match.
- `PhotoMeasurePro__CanvasViewport__OrthoStage__.js`: ortho pan/zoom, SVG overlay for dimensions on the rectified view, draggable crop rectangle, export respects crop; pixel cache invalidated only when geometry/source changes.
- Global Visual Settings dropdown: master sliders for axis line and dimension line thickness (`visualSettings` in state).

#### Measure mode: guides and angles
- `PhotoMeasurePro__Guides__Engine__.js`: perspective guides extended through vanishing points, snapping for measure/constraint endpoints.
- Sub-modes: Line / Guide / Angle with guide axis (X, Y, Z); hotkeys L, G, A, X, Y, Z, Esc.
- Angle lines: `PhotoMeasurePro__PerspectiveMath__GetAngleOnPlane` plus arc/label rendering in main SVG and ortho overlay when the guide axis lies on the active plane.

#### Project files (ValeSpec-like workflow)
- Schema + normalisation: `PhotoMeasurePro__AppUtils__ProjectSchemaValidator__.js` (versioned JSON, defaults filled).
- `PhotoMeasurePro__AppData__ProjectFileManager__.js`: list/create/load/save/delete via Flask, `localStorage` manifest, Export/Import JSON, base64-embedded images for portability.
- Flask `PhotoMeasurePro__FlaskServer__Localhost__.py`: `/api/projects` CRUD under `04__LocalProjectData/`.
- Sidebar Projects panel: New, Save, Save As, Export JSON, Import JSON, manifest list, dirty indicator; `Init` bridges state ↔ project document and invalidates ortho caches on load.

#### Files added (high-level)
- `02__Src__AppModules/04__MathUtils/PhotoMeasurePro__MathUtils__CoordinateSpace__.js`
- `02__Src__AppModules/04__MathUtils/PhotoMeasurePro__MathUtils__PlanarHomography__.js`
- `02__Src__AppModules/50__System__OrthoWarpAndExport/PhotoMeasurePro__OrthoWarpAndExport__CanvasRenderer__.js`
- `02__Src__AppModules/60__System__CanvasViewport/PhotoMeasurePro__CanvasViewport__OrthoStage__.js`
- `02__Src__AppModules/70__System__Guides/PhotoMeasurePro__Guides__Engine__.js`
- `02__Src__AppModules/03__AppUtils/PhotoMeasurePro__AppUtils__ProjectSchemaValidator__.js`
- `02__Src__AppModules/02__AppData/PhotoMeasurePro__AppData__ProjectFileManager__.js`

#### Files heavily touched (high-level)
- `PhotoMeasurePro__App__.html`, `PhotoMeasurePro__FlaskServer__Localhost__.py`
- `PhotoMeasurePro__AppCore__StateManager__.js`, `PhotoMeasurePro__AppCore__Init__.js`
- `PhotoMeasurePro__MathUtils__PerspectiveMath__.js`, `PhotoMeasurePro__PerspectiveSetup__Engine__.js`, `PhotoMeasurePro__ScaleConstraint__Engine__.js`
- `PhotoMeasurePro__Measurement__Engine__.js`, `PhotoMeasurePro__OrthoWarpAndExport__Engine__.js`
- `PhotoMeasurePro__CanvasViewport__Main__.js`, `PhotoMeasurePro__ImageSession__Main__.js`
- `PhotoMeasurePro__CoreUi__Styles__CanvasViewport__.css`, `PhotoMeasurePro__CoreUi__Styles__Sidebar__.css`

# ---------------------------------------------------------


# ---------------------------------------------------------
## PhotoMeasurePro v0.2.0 - 21-Apr-2026
### Full architecture rebuild to ValeSpec-style modular JavaScript + Flask localhost foundation

Complete project refactor from a React/TypeScript/Vite stack to a ValeSpec-style script-ordered modular JavaScript architecture, with a dedicated Flask localhost server and config-authority wiring.

#### Core architecture
- Rebuilt app shell as `PhotoMeasurePro__App__.html` with explicit script-order loading.
- Added modular system folders under `02__Src__AppModules` (AppCore, AppData, AppUtils, MathUtils, ImageSession, PerspectiveSetup, ScaleConstraint, Measurement, OrthoWarpAndExport, CanvasViewport).
- Added style hub and split stylesheets under `03__Style__AppStylesheets`.

#### Runtime and server
- Added `PhotoMeasurePro__FlaskServer__Localhost__.py` on `127.0.0.1:8003`.
- Added app config authority file `PhotoMeasurePro__AppConfig__Main__.json` and config loader.
- Added `file://` fallback config path to avoid fetch hard-fail when opened directly from disk.

#### Feature parity target
- Locked rebuild behavior contract in `PhotoMeasurePro__ParityChecklist__.md`.
- Ported perspective math and measurement logic from TypeScript to JavaScript modules.
- Preserved core workflows: setup lines, plane constraints, measurement labels, ortho preview, and PNG export.

#### Decommissioning legacy stack
- Removed legacy React/TypeScript/Vite implementation files and build configs.
- Updated README run flow to Flask-first localhost startup.

#### Files touched (high-level)
- `PhotoMeasurePro__App__.html`
- `PhotoMeasurePro__FlaskServer__Localhost__.py`
- `02__Src__AppModules/**`
- `03__Style__AppStylesheets/**`
- `PhotoMeasurePro__ParityChecklist__.md`
- `README.md`

# ---------------------------------------------------------
