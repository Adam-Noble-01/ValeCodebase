# ValeVision3D

## Overview

ValeVision 3D is Vale Garden Houses' 3D project viewer: a client or a member of staff walks round a project's
whitecard model, steps through its saved scenes, and (for app admins) authors floor plans, elevations, sections
and Layout Editor sheets from it.

- **Live:** `https://app.valegardenhouses.com/valevision/?project=<library id>` (e.g. `64135__Washington`; a bare
  job number and the old `2026/<folder>` also open it).
- **Code:** `WebApps/Vale__VirtualServer/Vale__ValeVision3D` (this folder), pushed to `/srv/vale/Vale__ValeVision3D`
  by the Vale Virtual Server Manager. Moved here from `WebApps/ValeVision3D` on 06-Oct-2026 (v2.72.0).

---

## Architecture

One server, one origin, one store (since v2.72.0). Nothing comes from GitHub Pages, Cloudflare R2 or a Worker.

| Piece | Where |
| :-- | :-- |
| The app (static) | this folder, served by nginx at `/valevision/` |
| Its API (Flask) | `Server__Api/Api__ValeVision3D/wsgi.py`, proxied at `/valevision/api/` (systemd `vale@ValeVision3D`, port from the URL Configurator) |
| Project record | `Vale__Projects__MasterLibrary/ValeProjects__<yyyy>/<id>/ProjectData__<id>__.json` (read and saved through `api/projects/<id>`) |
| Models | `<project>/ValeVision3D/Content__3dModel__GlbFiles/` (bare file names in `valeVision_ModelUrls`) |
| Scene thumbnails | `<project>/ValeVision3D/Content__AnimationScenes__Thumbnails/` |
| Drawings, snapshots, sheet pictures, published documents, statements | `<project>/ValeVision3D/UserData__UserGeneratedContent__Drawings/` (user data: through the API only) |
| Spelling dictionary, custom scrapbook | `50__UserData__SpellCheckDictionary/`, `51__UserData__LayoutEditorScrapbook/` in this folder (user data) |
| Sign-in | the shared Vale sign-in (`/AppAssets__CommonApplicationAssets/Shared__UserLogin/`, `api/accounts/*`), users register `Server__UserAccountData` |
| Videos for clients | the Video Studio's **Publish to Theia** (since v2.73.0): one MP4 per path, at its own export settings, uploaded into ValeVision Theia (`/theia/`, `Vale__ValeVision__TheiaVideoPlayer`) while it renders; the path keeps its title, description and publish stamp in `VideoStudio__Config`, in step with Theia both ways |

**Who can do what.** Anyone with a project link can view it (clients have no account). Staff sign in with their
Vale email address and password (top right); the initials bubble's menu holds their options. **App admins**
(permission level AppAdmin: Adam, Shane) also get the Dev Tools menu, every save and the Layout Editor's editing
(`Na__AppUtils__DevGate__`); the API checks the level again on every write. *Client view on / off* in the bubble
menu (or `?authoring=off|on`) lets an admin see exactly what a client sees.

**Key modules.** `03__AppUtils/Na__AppUtils__ProjectLoader.js` (where the project is, `Na__AppUtils__ApiUrl`),
`Na__AppUtils__UserSession__.js` (sign-in), `Na__AppUtils__DevGate__.js` (authoring), `Na__AppUtils__SaveProjectJson__.js`
and `Na__AppUtils__AssetUpload__.js` (Dev menu saves and uploads), `Na__AppUtils__LocalProjectMirror__.js` and
`80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (TrueVision's storage names, now over this
app's API, kept for parity).

**Run it on the PC:** `python WebApps/Vale__VirtualServer/Server__DeveloperTools/ValeDev__LocalServer__.py`, then
`http://127.0.0.1:8030/valevision/?project=64135__Washington`. It reads and writes the real mirror (Collect and Push
move data between the PC and the server).

---

## 3D Object Interactions System

ValeVision3D supports **interactive 3D objects** that respond to user input. The 3D Object Interactions System enables click-based and proximity-based behaviors for specific model elements exported with special naming conventions from SketchUp.

### Click-to-Open Door Animation

**Overview:**  
Doors modeled with the ADR/MOD/ROT/MVE/FIXED naming contract automatically
become interactive. Hinged, bifold, and sliding products share one panel engine;
explicit `ExteriorDoubleDoor` ADRs support independent leaves.

**Key Features:**
- Click detection with orbit drag filtering (distinguishes clicks from camera movement)
- Smooth eased animation (easeInOutCubic interpolation)
- Mid-animation reversal support (click again to reverse direction)
- Signed rotation and translation values encoded in MOD names
- Multi-panel bifold/sliding lockstep with bifold duration scaling
- Mirrored-instance and config-gated interior rotation sign handling
- Independent exterior-double orbit clicks with coupled-pair Walk/Fly proximity
- Dual model synchronization (mesh and linework animate together)
- No model modification required (works via scene graph node transforms)

**SketchUp Setup:**
- Name door assembly groups with `ADR` prefix (e.g., `ADR002__InternalDoor__GroundFloor__PorchToLounge`)
- Create `MOD001__ROT__90-Deg__DoorPanel` child group containing all rotating geometry
- Create `ROT001__RotationPoint__DoorHingeCentre` child group positioned at door hinge
- Place all doors on SketchUp tag `25__ProposedBuilding__Doors`

**GLB Export:**
- Requires GLB Builder Utility v1.5.0+ with door handler module
- Exports preserve ADR > MOD/ROT hierarchy (not flattened)
- Transform conjugation ensures Y-up coordinate spaces for proper rotation

**Configuration:**
```json
{
    "3dObject__InteractionsSystem": {
        "3dObject__Interaction__DoorAnimation": {
            "3dObject__Interaction__DoorAnimation__Enabled": true,
            "3dObject__Interaction__DoorAnimation__AnimationDurationMs": 600,
            "3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier": 3.0,
            "3dObject__Interaction__DoorAnimation__DefaultRotationDeg": 90,
            "3dObject__Interaction__DoorAnimation__ClickThresholdPx": 4,
            "3dObject__Interaction__DoorAnimation__MultiPanelEnabled": true,
            "3dObject__Interaction__DoorAnimation__InteriorRotationInverted": false,
            "3dObject__Interaction__DoorAnimation__IndependentPanelsEnabled": true,
            "3dObject__Interaction__DoorAnimation__IndependentPanelAdrNameTokens": [
                "ExteriorDoubleDoor"
            ]
        }
    }
}
```

**Module Location:**  
`02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`

**Full Documentation:**  
See `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md`.

---

# -----------------------------------------------------------------------------
## Layout View Export — Profile Lines Synchronization (v0.1.4)

Layout View receives a pre-rendered PNG from the main viewer export pipeline. It does **not** run Three.js post-processing in the layout tab.  
This means profile-line correctness in Layout View is fully determined at capture time in the main app.

### What Was Fixed

- Export capture now uses a shared render pipeline state bundle:
  - `composer`
  - `renderProfileNormals()`
  - `setProfileLinesSize(...)`
- During export capture (custom and viewport-native), profile normals are explicitly refreshed before `composer.render()`.
- During restore after custom export render, profile-line render target size and normal buffer are refreshed again for live viewport consistency.

### Why This Matters

Without synchronized normal-pass refresh at the same camera/aspect/size as the color pass, Sobel/profile lines can appear offset in the baked export image (visual "double perspective" effect).  
The updated pipeline ensures camera projection and profile-line buffers are captured in lockstep.

### Integration Notes

- `Na__UiFeature__InitializeImageExportControls(...)` now consumes a render-pipeline-state getter.
- Existing/legacy composer-only getter shape remains backward compatible in the export module helper.
- Naming follows existing 3-stage convention (`Na__...__...__...`) for all new helper/state plumbing.

# -----------------------------------------------------------------------------
## 3D Render Pipeline — Mesh, Linework & Ground Line Visibility

The live 3D viewport uses a **mesh + linework** rendering model: each category loads a pair of GLBs (base mesh for surfaces, linework for edges). Surfaces and lines are rendered in one pass with depth testing; linework is drawn on top via render order and depth bias so edges (including the ground line) stay visible.

### Pipeline Overview

1. **Scene** — Three.js scene with ambient + directional light, optional fog, ground plane (shadow-only at `groundYOffset`).
2. **Models** — Per category: mesh root (white or textured materials) and linework root (fat lines from `LineSegments2` + `LineMaterial`). Both receive the same transforms; linework is a separate GLB so SketchUp can export edges explicitly.
3. **Renderer** — WebGLRenderer with `logarithmicDepthBuffer: true` for better depth precision at distance. Shadow map: PCF soft shadows.
4. **Composer** — EffectComposer: RenderPass (scene + camera) then FXAA pass. Output is the final viewport image.

Mesh materials use polygon offset (factor/units from config) to push surfaces back; linework uses polygon offset to pull lines forward. **With a logarithmic depth buffer, the hardware polygon offset is ignored** because depth is written in the fragment shader via `gl_FragDepth`. So linework also uses a **fragment shader depth bias**: after the logarithmic depth include, a small value is subtracted from `gl_FragDepth` so line fragments (including the ground line where the building meets the ground plane) win the depth test against coplanar mesh and no longer disappear.

### RenderConfig__Linework Config

Linework behaviour is fully config-driven under **`models.RenderConfig__Linework`** in `Na__AppConfig__Main.json`, using 3-stage naming:

| Key | Purpose |
| :-- | :------ |
| `RenderConfig__Linework__EdgeColor` | Line color (e.g. 0 for black). |
| `RenderConfig__Linework__LineWidth` | Screen-space line width in pixels. |
| `RenderConfig__Linework__PolygonOffsetFactor` / `Units` | Polygon offset (only effective when logarithmic depth buffer is off). |
| `RenderConfig__Linework__RenderOrder` | Render order so linework draws after mesh (e.g. 999). |
| `RenderConfig__Linework__DepthBias` | Value subtracted from `gl_FragDepth` in line fragment shader so lines stay in front of coplanar mesh (e.g. 0.00015). |

The depth bias is applied in `Na__ModelLoader__LoadSingleLinework` via `LineMaterial.onBeforeCompile`, which patches the fragment shader after the logarithmic depth block. Increasing `RenderConfig__Linework__DepthBias` makes lines more reliably visible (e.g. ground line) but too large a value can make distant lines float in front of surfaces; the default is tuned for typical architectural scale.

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `index.html` | Scene, camera, renderer, ground plane, composer, render loop. |
| `Na__ModelLoader__MultiModel.js` | Loads mesh + linework GLBs per category; applies materials and depth-bias hook to LineMaterial; reads `config.RenderConfig__Linework`. |
| `Na__RenderPipeline__PostProcessing__Setup.js` | EffectComposer with RenderPass + ProfileLines pass (optional) + FXAA; returns composer + profile-lines helpers. |
| `Na__AppConfig__Main.json` | `models.baseMesh`, `models.RenderConfig__Linework`, `scene` (ground, fog, etc.). |

# -----------------------------------------------------------------------------

## Image Export — Enhance Whitecard Post-Process Effects

The "Enhance Whitecard" toggle in the Export Image panel applies a post-process pipeline to exported images. Post-processing runs **only at export time** on the rendered canvas; the live viewport pipeline is unchanged.

### Flow

1. Three.js renders at target resolution (viewport or custom).
2. Canvas is copied to an offscreen canvas.
3. Pipeline reads `ImageExport__PostProcessEffects` config, sorts effects by `Order`.
4. Effects applied in sequence → final canvas → PNG download.

### Methods Employed

**Levels** — Pixel-level tonal remapping (black point, white point, gamma). Pixels above the white point (e.g. 230) are clamped to pure white; darker values remapped linearly. Removes light grey shading from faces and background.

**High Pass Sharpen** — Blurred copy is subtracted from original; result centered at grey (128) and composited with Overlay blend. Sharpens edges (black lines) without amplifying noise. Uses Canvas 2D `filter: blur()` for GPU blur.

**Pipeline** — Config-driven orchestrator: sorts effects by `Order`, calls each enabled effect in turn. Each effect is a standalone module; pipeline imports and invokes them.

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `Na__ImageExport__PostProcessEffects__Levels.js` | Levels adjustment via ImageData |
| `Na__ImageExport__PostProcessEffects__HighPassSharpen.js` | High pass + overlay blend |
| `Na__ImageExport__PostProcessEffects__Pipeline.js` | Config-driven effect orchestration |
| `Na__UiFeature__ImageExport__Controls.js` | Export UI, enhance toggle, pipeline call |
| `Na__AppConfig__Main.json` | Post-process config (`ImageExport__PostProcessEffects`) |

### Config

Effect order and parameters are defined in `Na__AppConfig__Main.json` under `ImageExport__PostProcessEffects`. Effects are ordered by `Order` (1, 2, …). The "Enhance Whitecard" toggle controls whether the pipeline runs (default: on).

# -----------------------------------------------------------------------------
## Image Export "Safe Frame" Overlay & Rule Of Thirds Grid Overlay
### "Safe Frame" Overlay
- When the image export menu it opened it will overlay a "Safe Frame" over the 3D model viewport.
  - This is a transparent grey overlay each side of the viewport.
  - It is tied to reflect the selected aspect ratio of the viewport.
  - When the aspect ratio is changed the safe frame will be updated to reflect the new aspect ratio.
  - The overlay hides again when the image export menu is closed.
  - This allows for quick visual reference of the viewport aspect ratio and the safe frame before exporting the image.
  - This makes it obvious what is in the shot across different screen widths.

### Rule Of Thirds Grid Overlay
- When the image export menu it opened it will overlay a Rule Of Thirds Grid on the image.
  - This is a transparent grid of lines that divides the space within the safe frame into 9 equal parts.
    - It is tied to reflect the selected aspect ratio of the viewport.
  - When the aspect ratio is changed the rule of thirds grid will be updated to reflect the new aspect ratio.
  - The overlay hides again when the image export menu is closed.
  - This allows for quick visual reference of the viewport aspect ratio and the rule of thirds grid before exporting the image.
  - This makes it obvious what is in the shot across different screen widths.
  - Allows for proper composition of the image by placing the subject of interest on the rule of thirds grid lines.

# -----------------------------------------------------------------------------
## OrbitHelperCube GLB Integration — Automatic Orbit Target Positioning

The **OrbitHelperCube** system automatically sets the camera orbit focus point from a cube GLB exported from SketchUp, eliminating the need to manually configure orbit target positions in project JSON files.

### Overview

When a project includes an OrbitHelperCube GLB file (named `{ProjectName}__NN__OrbitHelperCube__MeshModel__.glb`), ValeVision3D automatically:
1. Detects the cube URL in the project's model array
2. Loads the cube GLB and calculates its bounding box center
3. Sets the camera orbit target to the cube's center position
4. Hides the cube by default (visible only when debug flag is enabled)

This allows you to position the orbit focus point directly in SketchUp by placing and exporting a cube, rather than manually calculating and entering millimeter coordinates in JSON.

### How It Works

**Detection & Separation**
- The system scans model URLs for files matching the OrbitHelperCube naming pattern
- The cube URL is separated from regular model URLs before loading
- Regular models load normally; the cube is handled separately

**Orbit Target Calculation**
- Cube GLB is loaded via GLTFLoader
- Bounding box is computed from the loaded mesh geometry
- Center point (in 3D units) becomes the orbit target
- OrbitControls target is updated automatically

**Visibility Control**
- Cube is added to the scene but hidden by default (`visible = false`)
- Set `OrbitHelperCube__Debug__Visible: true` in `Na__AppConfig__Main.json` → `Dev__DeveloperMode` to show the cube for debugging
- Cube never appears in model toggle buttons (filtered out before category classification)

### Fallback Behavior

When no OrbitHelperCube GLB is found in a project:
- System falls back to `Dev__DefaultCube` position from AppConfig
- Projects without OrbitHelperCube continue to work as before
- Backward compatible with existing projects that use `Camera__DefaultTarget` in JSON

### Project JSON Format

Projects with OrbitHelperCube GLB should **remove** `Camera__DefaultTarget` from their camera configuration:

```json
{
  "valeVision_Camera__DefaultPosition": {
    "Camera__DefaultPos": { ... },
    "Camera__DefaultRotation": { ... },
    "Camera__DefaultMisc": { ... }
    // Camera__DefaultTarget removed — now comes from OrbitHelperCube GLB
  }
}
```

The orbit target position is still reported in the Camera JSON export panel, but in a separate `OrbitHelperCube__Position` section for easy reference.

### Configuration

**Debug Visibility Flag**
- Location: `Na__AppConfig__Main.json` → `Dev__DeveloperMode` → `OrbitHelperCube__Debug__Visible`
- Default: `false` (cube hidden)
- Set to `true` to show the cube mesh in the scene for debugging orbit positioning

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `Na__ModelLoader__MultiModel.js` | Cube detection regex, URL separation, GLB loading, center extraction |
| `index.html` | Loading sequence integration, orbit target application, debug flag handling |
| `Na__AppConfig__Main.json` | Debug visibility flag configuration |
| `Na__UiFeature__CameraPosition__Controls.js` | Split JSON output format (Camera + OrbitHelperCube sections) |

### Benefits

- **No Manual Configuration** — Set orbit position visually in SketchUp instead of calculating coordinates
- **Consistent Positioning** — Orbit focus matches exported cube geometry exactly
- **Debug Support** — Toggle cube visibility to verify orbit positioning
- **Backward Compatible** — Existing projects continue to work with Dev__DefaultCube fallback

# -----------------------------------------------------------------------------
## Page Layout View System (LayoutVision 2D)

The **Page Layout View System** is a standalone 2D document composition tool that opens in a new browser tab. It allows users to position rendered 3D viewport images onto an A3 title block template and export the final layout as an exact-scale PDF.

### Overview

When the user clicks **"Layout View"** in the Export Image panel, ValeVision3D renders the current 3D scene at the configured resolution and aspect ratio, then opens a new tab with the **LayoutVision 2D** page layout system. The rendered image appears on an A3 landscape canvas (420×297mm) over a Vale title block template.

### Features

**Interactive 2D Canvas**
- Drag the viewport image to reposition it anywhere on the A3 document
- Resize using corner handles (proportional scaling maintaining aspect ratio)
- Clip/trim image using edge handles (intuitive inward drag to crop image from that edge)
- Mouse wheel zoom toward cursor; middle/right-click pan
- Touch support: single-finger drag/resize/edge-clipping, two-finger pinch zoom + pan
- Selection handles appear when image is selected (8 handles: 4 corners + 4 edges)

**Exact A3-Scale PDF Export**
- **Export Full Layout** — saves title block + viewport image as a single flattened A3 PDF
- **Export Image Only** — saves viewport image at its current position/size (no title block)
- All exports use millimeter-unit positioning matching the canvas layout exactly
- PDF files maintain exact 1:1 scale with the A3 document (no distortion)

**Vale-Branded UI**
- Header matches main ValeVision3D app styling (white background, Vale logo, blue border)
- Secondary actions bar below header with primary/secondary/close button styles
- Canvas background uses Vale grey branding (#b0b5ba)

### Technical Architecture

**Data Transfer**
- Rendered image passed from main app to layout page via `window.opener` global property
- Avoids localStorage 5-10 MB size limit (supports high-res 4096px exports up to 30+ MB)
- Layout page reads image on load, then clears the reference to free memory

**Coordinate System**
- All image positioning stored in mm relative to A3 document origin (top-left)
- Canvas renderer converts mm to screen pixels using current zoom level
- PDF export maps mm coordinates directly to jsPDF units (zero conversion)

**Rendering Pipeline**
- DPR-aware canvas for sharp display on retina screens (internal resolution = display size × DPR)
- Multi-layer drawing: grey background → white A3 paper with shadow → title block PNG → viewport image
- Selection handles drawn at screen-pixel size (8px squares) over zoomed image
- Dashed border around selected image for visual clarity

**Interaction**
- Hit-test system determines mouse position relative to image body or resize handles
- PC controls: left-click drag on body (move), corner handles (proportional scale), edge handles (clip/trim), empty space (deselect)
- Touch controls: single-touch on image (move), corner handles (proportional scale), edge handles (clip/trim), two-touch (canvas zoom/pan)
- Edge handle clipping: drag top/bottom/left/right handles inward to crop image from that edge
- Clipping maintains image container size; only visible portion changes (allows non-destructive trimming)
- All coordinates transformed through canvas pan/zoom for accurate interaction at any zoom level

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `Na__PageLayoutSystem__Layout__.html` | Standalone HTML page with header, canvas, action buttons |
| `Na__PageLayoutSystem__Stylesheet__.css` | Layout page styles; imports main app's header.css |
| `Na__PageLayoutSystem__SystemLogic__Main__.js` | State management, image loading, canvas sizing, resize handling |
| `Na__PageLayoutSystem__CanvasRenderPipeline__.js` | 2D rendering of A3 paper, title block, image, handles |
| `Na__PageLayoutSystem__2dNavigationControls__.js` | Zoom toward cursor, middle/right-click pan |
| `Na__PageLayoutSystem__Controls__Pc__.js` | Mouse interaction: hit-test, drag, resize, cursor feedback |
| `Na__PageLayoutSystem__Controls__TouchScreen__.js` | Touch interaction: drag, resize, pinch zoom, pan |
| `Na__PageLayoutSystem__PdfExport__A3__.js` | jsPDF integration for A3-scale PDF export |
| `01__Dependencies__VersionLocked/jspdf.umd.js` | jsPDF v4.1.0 vendored (1.2 MB self-contained UMD build) |

### Integration with Export Controls

The layout system shares the same render pipeline as the "Export Now" feature via a refactored helper function `Na__UiFeature__RenderToDataUrl()` in the Image Export Controls module. This helper handles both custom export mode (resized renderer + camera aspect adjustment) and viewport-native mode (current size), applies post-processing if "Enhance Whitecard" is enabled, and returns the rendered dataURL with metadata. Both "Export Now" and "Layout View" call this shared function, eliminating duplicated render logic.

As of v0.1.4, this shared helper also synchronizes profile-lines normal-buffer render and size state during capture/restore, preventing perspective mismatches in layout exports.

# -----------------------------------------------------------------------------

## Per-Scene Lighting (v2.71.0)

Any Presentation Mode scene can carry its own lighting, so a view whose subject faces away from the sun can be lit properly without changing any other scene. Every scene that is not given its own lighting keeps using the default.

### Authoring

Dev Tools > Presentation Mode Scenes > open a scene > **Advanced** > **Lighting** (localhost only):

| Control | What it does |
| :------ | :----------- |
| Rotation | Turns the sun about the vertical axis, clockwise seen from above. 0 is the default direction; the slider runs 0 to 360. |
| Height | The sun's angle above the horizon. Lower lights the walls more strongly; 90 is straight overhead. |
| Sun | The strength of the sun (the directional light, the only light that casts shadows). |
| Ambient | The strength of the even fill light every face receives. |
| Sun casts shadows | Untick to fade the sun's shadows out for this scene. |

Every change lights the viewport straight away: that is the preview. **Save Lighting** writes it to the project, **Use Default** puts every control back, and a double-click on a slider puts that one setting back. Update Scene and Add Scene From Camera also capture whatever lighting the viewport is showing.

### Data

Stored on the scene record in `project.json`, holding only the settings that differ from the default:

```json
"PresentationMode__Scene__Lighting": {
    "Scene__Lighting__Description"      : "This scene's own lighting. Only the settings that differ from ...",
    "Scene__Lighting__RotationDeg"      : 135,
    "Scene__Lighting__AmbientIntensity" : 3.2
}
```

An absent key follows the default, and an absent block is the default lighting. The five keys are `Scene__Lighting__RotationDeg`, `Scene__Lighting__HeightDeg`, `Scene__Lighting__DirectionalIntensity`, `Scene__Lighting__AmbientIntensity` and `Scene__Lighting__ShadowsEnabled`.

### Config

| Key | Purpose |
| :-- | :------ |
| `Scene__Default__LightingConfig__AmbientIntensity`, `__DirectionalIntensity` | Default strengths. |
| `Scene__Default__LightingConfig__DirectionalPosXMm`, `__DirectionalPosYMm`, `__DirectionalPosZMm` | Default sun position, integer mm from the model origin (50000, 100000, 40000). Its direction shades the faces; its distance keeps the shadow camera clear of the model. |
| `Scene__Default__LightingConfig__ShadowsEnabled` | Default shadows on or off. |
| `Scene__PerSceneLighting__Enabled` | false ignores every stored override and hides the controls. Nothing is deleted. |
| `Scene__PerSceneLighting__BlendDuringFlight` | true eases the lighting over a camera flight; false cuts to it at the start of the flight. |
| `Scene__PerSceneLighting__HeightMinDeg`, `__HeightMaxDeg`, `__DirectionalIntensityMax`, `__AmbientIntensityMax` | Slider ranges. |

### Where It Applies

- Carousel flights ease the lighting in step with the camera; instant scene applies (page load, the batch walks, Layout Editor 3D viewports) set it at once.
- Floor plans and elevations always use the default lighting, in the viewer and on Layout Editor sheets.
- Image export, scene thumbnails, Update All Thumbnails and Download All Images render each scene in its own lighting.
- Shadows switch by strength (`LightShadow.intensity`), never by `castShadow`, so no material recompiles.

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js` | Owns both lights: defaults, resolve, the minimal stored block, flight blend, apply and capture. |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneLightingRows__.js` | The Advanced > Lighting subsection. |
| `21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js` | Applies a scene's lighting on an instant apply and eases it over a flight. |
| `80__Testing__PrototypeEnvironment/Na__Test__PerSceneLighting__.test.mjs` | Node test of the lighting maths against the shipped app config. |

# -----------------------------------------------------------------------------