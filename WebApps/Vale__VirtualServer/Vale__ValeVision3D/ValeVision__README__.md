# ValeVision3D

## Overview

ValeVision 3D is Vale Garden Houses' 3D project viewer: a client or a member of staff walks round a project's
whitecard model, steps through its saved scenes, and (for app admins) authors floor plans, elevations, sections
and Layout Editor sheets from it.

- **Live:** `https://app.valegardenhouses.com/valevision/?project=<library id>` (e.g. `64135__Washington`; a bare
  job number and the old `2026/<folder>` also open it). Since v2.77.0 that plain link is a **staff link** (Vale
  sign-in). A client is sent a **client link**: `...?project=<library id>&share=<token>`.
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
| Client links (since v2.77.0) | `<project>/ValeVision3D/UserData__ShareLinks/<id>__ValeVision3DShareLinks__.json` (user data, git-ignored), made and read through `api/projects/<id>/shares` and `.../client-link` (`ValeVision3D__Api__ClientLinks__.py`); the page side is `02__Src__AppModules/93__Feature__ClientLinks/` |

**Who can do what (since v2.77.0, as Theia).**

| Who | Address | What they get |
|---|---|---|
| **Staff** (any Vale account) | `/valevision/?project=<id>` (a staff link) | the sign-in first, then the viewer; Employee and up get Share Project Link (Internal and External tabs) |
| **App admins** (AppAdmin: Adam, Shane) | the same | also the Dev Tools menu, every save and the Layout Editor's editing (`Na__AppUtils__DevGate__`) |
| **Clients** (no account) | `/valevision/?project=<id>&share=<token>` (a client link) | the model, the scene carousel and Tools & Settings with Camera Settings, Enter Full Screen and App Settings only (Export Image and Toggle Model Layers temporarily removed, v2.79.5); a guest bubble; a first-launch tour; on phones and tablets, full screen and landscape (forced on Android, asked for on iPhone and iPad, v2.80.0); on any phone, staff included, the phone layout (`65__Feature__PhoneUi`, v2.81.0: the bar folds away and pulls back down, navigation and Tools & Settings as corner icons, a shrinking carousel). Phone, tablet or computer is decided once, in index.html's head script, by what the device is (`<html data-na-device>`, v2.81.4), never by screen size: a computer always keeps its top bar. Each client link installs as the client's own app (v2.82.0: `Na__ClientLinks__AppManifest__`, a per-link manifest named for the project that opens only their link; index.html has NO static manifest link, Safari keeps the first it meets), offered by the install card after their first press on the model (`Na__ClientLinks__InstallApp__`: one tap on Chrome / Edge, pictured steps on iPhone and iPad) |

- A client link is made on **Share Project Link > External Client Sharing** (Theia's client link panel: who it is
  for, an expiry, Copy, Switch off, how often it was opened) or with the **client email** on the same tab. Employee
  and up make links and switch off their own; Management and App Admins switch off anyone's.
- **Client emails are sent from the app (v2.79.0):** the Client email panel sends the email straight to the client
  (up to 10 addresses) after the send check: what goes where, a checklist, a tick box that unlocks Send, then "Email
  sent to ...". Beside Send email (on the right), **Download Email** (v2.79.2) makes the same email as a file to
  paste into Outlook instead. A sent email signs off inside the card: Kind regards, the sender's name and role. The server (`ValeVision3D__Api__Email__.py`) lets an address outside Vale have only the client email
  with a live client link; the sender is CC'd and the admin blind-copied. Each sender may send 10 client emails an
  hour (Management and App Admins 20) and 30 internal ones. Guide: `62__Feature__EmailWorkers/` README.
- **The API decides** (`ValeVision3D__Api__ClientLinks__.py`, one guard before every request): a read needs a Vale
  sign-in. A live client link for that project opens only the three the client's page makes (its record, less the
  Gallery's production notes; its location; the drawings fingerprint), so a new read stays shut to clients until it is
  named in `CLIENT_READ_ENDPOINTS` (v2.83.1). Every write needs a sign-in at its route's level. A client link
  never authors, whoever is signed in on the device (`Na__DevGate__IsClientLink`), and never loads the Layout Editor.
- **The model files and the record (the library gate, 28-Oct-2026):** nginx sends a project's `ProjectData__<id>__.json`
  and its `ValeVision3D/Content__3dModel__GlbFiles/`, `Content__3dModel__AppGenerated/` and `Content__SitePlanData/`
  only after asking this app's API (`GET api/library-access`, nginx's auth_request). A Vale sign-in opens all of them.
  A live client link to that very project, in the cookie `vale_vv3d_files` (set by the door on that project's model
  folder), opens only a GLB directly in `Content__3dModel__GlbFiles/` (v2.83.1). The list is the valevision route's
  `LibraryProtected` in the Server Manager's routes file.
- *Client view on / off* in the bubble menu (or `?authoring=off|on`) still locks authoring on a staff page; opening a
  client link shows an admin exactly what the client sees.
- **Analytics (v2.78.0):** `03__AppUtils/Na__AppUtils__ActivityLog__.js` reports what a visit does (image exports,
  the lens, layers, full screen, Reset View, Help, settings, menus, the client tour, and a summary of each visit's time
  and moves on the model) to the shared activity ledger, each carrying the client link when there is one. The Server
  Manager's tab 05 (Insights) counts them.

**Key modules.** `03__AppUtils/Na__AppUtils__ProjectLoader.js` (where the project is, `Na__AppUtils__ApiUrl`),
`Na__AppUtils__UserSession__.js` (sign-in), `Na__AppUtils__DevGate__.js` (authoring), `93__Feature__ClientLinks/`
(client links: the External tab, the client's view, the tour), `Na__AppUtils__SaveProjectJson__.js`
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

### Ornament Fade (v2.92.0)

A ridge cresting is thousands of short lines in a metre cube; at a fixed pixel width, with every bar outlined by the profile lines, it reads as a black block from about 16 m out. After the models load, `05__RenderPipeline/Na__RenderEffect__OrnamentFade__.js` finds the ornament (since v2.93.0 every SketchUp library part: `extras.Na__LibraryAsset` written by the GLB Builder 2.15.0, a library code leading a node name, or a name holding `Cresting|Column|Pilaster|Handle`; `Finial`, `Spire`, `Urn` beside one; a cresting's flattened pieces within 300 mm that measure as small shapes) and lightens it with distance (columns twice as far off): untouched under about 7 m, fully light by about 21 m. Its segments move to a child fat line on a blending copy of the material, so every other line keeps its own material and the rest of the picture does not change. Orthographic views are never touched. A project with nothing named is not measured. Tunables: `Na__RenderEffect__OrnamentFade__Config__.json`; live trial: the testing server's "Linework density test" panel.

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
| `Na__RenderEffect__OrnamentFade__.js` (+ `__Core__`, `__Config__.json`) | Draws ornament (a node named Cresting, the finials beside it, its pieces flattened into the building) with a lighter pen from a distance: fat lines by alpha, profile edges through the profile pass's colour alpha. Perspective only; every other line untouched. |

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

The **Page Layout View System** is the 2D document composition page of ValeVision 3D, the **Drawing Editor**. Since v2.76.0 it opens as a page of the app's own window, not a new browser tab. It allows users to position rendered 3D viewport images onto an A3 title block template and export the final layout as an exact-scale PDF.

### Overview

When the user clicks **"Create Drawing"** in the Export Image panel, ValeVision3D renders the current 3D scene at the configured resolution and aspect ratio, then opens the **Drawing Editor** page (**LayoutVision 2D**) in the same window. The rendered image appears on an A3 landscape canvas (420×297mm) over a Vale title block template, centred in the drawing frame left of the title block.

**Saved Layouts in the Drawings menu** (v2.76.1): under Create Drawing, Tools & Settings > Drawings lists the job's saved layouts exactly as the Drawing Editor does (thumbnails, who updated and created each, Everyone / Mine, Open Drawing, and a Delete that stays muted until pointed at), and only when the job has some (signed-in people: the list needs an account). Open puts the layout on the editor's sheet without a new render; the one already on the sheet is outlined, and Open on it brings the editor back as it was. Delete is final (v2.76.2): the word delete has to be typed first, then the server removes the layout and every picture of it (the editor's rule: its creator, or Management and up). It replaced the Saved Drawings button. The cards are one shared module and stylesheet used by both (`Na__PageLayoutSystem__SavedList__.js`, `Na__PageLayoutSystem__Styles__SavedList__.css`).

### A Page of the App, Not a Tab (v2.76.0)

Adam, 09-Oct-2026: no more browser tabs opening; everything navigable from the app; the model paused while a drawing is edited.

```
Before   Create Drawing -> blank tab -> render -> window.__Na__PageLayout__PendingImage -> tab loads the page,
         which reads it (and the render bridge) through window.opener; Close = window.close(); the 3D tab
         kept rendering behind every tab
Now      Create Drawing -> render -> Na__DrawingPage__OpenPicture -> history entry ?project=<id>&page=drawing
         -> the page in a frame over the Model View (picture and bridge through window.parent);
         the 3D render loop held ('drawing-editor') until the Model View comes back
```

- **Address**: the Model View is `?project=<id>`, the Drawing Editor `?project=<id>&page=drawing` (`36__System__AppPages/Na__AppPages__Navigation__.js`). Opening it pushes a history entry, so the browser's Back and Forward and a mouse's side buttons move between the two.
- **Keys** on both pages and inside the editor: **Alt+Left** Back, **Alt+Right** Forward, **Alt+Backspace** Back. From the Model View, Back is the page before the app (often ValeVision Gallery). Taken in the capture phase, so the 3D view's fine camera nudge stays on Alt+W/A/S/D and Alt+Up/Down only. Left alone in a text box, while a dialog is open, and on the Layout Editor's drawing and document tabs.
- **Breadcrumbs**: the top-left card reads Project Gallery / project / **Model View** / **Drawing Editor** on the editor, Model View being the link back. The editor's sheet fits below it.
- **The model pauses**: while the editor is up the render loop is held, the 3D canvas hidden (by visibility, so a Re-Render still renders offscreen), the 3D menus and panels put away (`body.na-app-page--active`), and the 3D keys stand down (the key scope's new `page` scope). The 3D view is left exactly as it was (Orbit, Walk, Fly, a plan or an elevation).
- **Back keeps the drawing**: going back to the Model View keeps the drawing open, put away; Forward (Alt+Right), or Open on its card in the Drawings menu, returns to it as it was. The menu's Close is **Back to Model View** inside the app.
- **A new drawing asks first**: Create Drawing over an open drawing with changes not on the Vale Cloud asks **Save and Start New** (the editor comes up, saves through its own Save Drawing, then the new picture renders), **Discard and Start New** or **Cancel**. Someone who cannot save is asked only whether to replace it.
- **The page is embedded**: the same `Na__PageLayoutSystem__Layout__.html`, in a frame under the app's header (`?embed=1` puts its own header away), so its styles, keys and ids never meet the 3D app's. On its own (an old bookmark or link) it moves into the app at `?project=<id>&page=drawing`; `?standalone=1` keeps it alone. A tab an older ValeVision 3D opened keeps working until that tab is reloaded.
- **Activity**: the editor opening is reported to the activity ledger as a view ("the Drawing Editor").

### Side Menu, Saved Layouts, Composition Guide, Re-Render (v2.75.0)

- **Side menu** on the right: Drawing Layout, Saved Layouts, Composition Guide, Picture, Render Quality, Export, and Close. Every section starts folded (v2.75.1). The menu folds away, and its width drags from its left edge (double-click the edge for the default); it remembers (per browser) whether it was folded and its width.
- **Save Drawing** (Export) is the same save as Save Layout / Save Changes: a desaturated red "Save Drawing" until the Vale Cloud has the drawing, then a green "Drawing Saved" (red again after any change). Every confirmed save shows a green "Synced to the Vale Cloud" toast naming the layout, the job and the time.
- **Undo and redo** (v2.75.3): Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z (Cmd on a Mac), and Undo / Redo buttons in the menu's head. Steps are the picture's place, size and trims, the guide, and re-renders; undoing back to the saved drawing makes it clean again (`Na__PageLayoutSystem__UndoHistory__.js`).
- **An unsaved drawing is never closed without asking** (v2.75.2): closing or leaving the app (or the browser) brings up the browser's "Leave site?", then (if they stay, and the editor is on screen) the page's own Save Drawing / Keep Editing / Close Without Saving. In a tab of its own the menu's Close asks the same at once; inside the app it is Back to Model View, which loses nothing (`Na__PageLayoutSystem__UnsavedGuard__.js`).
- **Saved layouts per job, labelled by user.** Any staff account (Employee and up) saves; every signed-in account sees the job's layouts; anyone who can save may update any layout. The server stamps who created each layout and who updated it last (from the session). Delete: the creator, or Management and up. **Delete is final** (v2.76.2, Adam): the app asks you to type the word delete, then the server removes the layout, its picture, its thumbnail and its replaced pictures for good (no archive). Re-saves keep the last 5 replaced pictures per drawing until it is deleted. Each layout has its own Rev: a save built on an older copy is refused with the other person's name.
  - Data: `<project>/ValeVision3D/UserData__UserGeneratedContent__Images/ValeVision__PageLayouts__.json`, pictures and thumbnails in `PageLayouts/<layout id>/` beside it (user data: collected to the PC, never pushed over).
  - API: `api/projects/<id>/page-layouts` (GET list, POST save), `/page-layouts/files/<path>`, `/page-layouts/<layout id>/version?number=<n>`, `/page-layouts/<layout id>/delete` (`Server__Api/Api__ValeVision3D/ValeVision3D__Api__PageLayouts__.py`).
- **Every export is saved as a version first** (v2.94.0, Adam: "a version should always be saved when exported"). Both Export buttons open the **export dialog**: the scheme name or reference (it names the drawing; the default "Drawing Layout" is never taken as one), Full layout or Image only, the sheet as the PDF holds it, the version it becomes, and the file name with the reference marked: `{ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__{Date}__.pdf`, e.g. `60795__Brown__Scheme-2a__Rear-Garden-View__ValeVisionLayout__11-Nov-2026__.pdf` (`__ImageOnly__` before the date for the picture alone; patterns in the config). Three steps tick as they happen: the PDF is made in memory, the drawing is saved and frozen as a numbered version on the server, then the PDF downloads and is reported. A save that fails (no connection, someone saved first) turns its step red with the reason and offers Try Again (or Save as New Drawing and Export) and **Export Without Saving**, which the activity ledger marks "Saved: No". Someone who cannot save is told so and exports with Export PDF.
  - **Versions:** each one is a JSON file written once and never changed (`PageLayouts/<layout id>/<layout id>__Version__003__<stamp>.json`: sheet, picture place and trims, guide, render settings, the view it was rendered from) plus its picture and thumbnail, which never move to `00__Archive`. The layout lists them (`PageLayouts__Layout__Versions`), each with who made it, when and every export of it (`Version__Exports`: who, when, Full layout or Image only, the file name). Exporting a drawing that has not changed since its last version adds the export to that version instead of making a new one. A save that changes nothing writes nothing, so "last updated by" only ever names someone who changed the drawing.
  - **Seeing them:** every card in both lists (the editor's Saved Layouts, Tools & Settings > Drawings) says which version was exported last, by whom and when, and folds out Versions (n): thumbnail, who, when, the exports and the file name, and Open, which puts that version on the sheet exactly as exported (Save Changes then makes it the current drawing). The address `?project=<id>&page=drawing&layout=<layout id>&version=<n>` opens one directly: it is what the activity ledger's Path holds for each export, so tab 05 of the Server Manager leads straight to the drawing that was sent.
- **Recovery copy on this computer** (v2.94.0): while a drawing has changes not on the Vale Cloud, a copy (picture, layout, thumbnail) is kept in the browser's own storage (IndexedDB `Na__PageLayout__RecoveryDrafts`), written a moment after each change. If the app or browser closes, crashes or is shut without saving, the next time the editor opens on that job it shows the copy at the top of Saved Layouts as an amber "Not saved" card with Recover and Discard (the signed-in person's own only). It goes once the drawing is saved or deliberately thrown away (Close Without Saving, Discard and Start New); an exported version opened and not touched keeps none. Nothing extra goes to the server. Old copies are tidied after 14 days (`PageLayout__SavedLayouts__Config__Recovery*`).
- **Composition guide**: a grid of thirds and a centre cross over the drawing frame. Drag an edge or corner in or out; Shift (or Move Opposite Edges Together) moves the opposite edge too. Margins in mm from the frame (negative: outside it), Lock Guide, Reset to Frame. Visual only (no snapping), never printed, saved with the layout.
- **Render Quality and Re-Render**: the Export Image panel's choices (resolution, aspect ratio, anti-aliasing, Enhance Whitecard, linework, profile line and silly lines). Re-Render asks ValeVision 3D (`window.parent.Na__PageLayout__RenderBridge`, through the page's host link) to render the picture again from the view saved with it (camera, orbit target, layers, lighting, vertical correction), then restores the Model View's own view.

### Features

**Interactive 2D Canvas**
- Drag the viewport image to reposition it anywhere on the A3 document
- Scale with the corner discs (navy, a diagonal arrow): the whole picture and its crop scale about the opposite corner (v2.94.1)
- Trim with the edge tabs (white, an arrow across the edge): that edge of the visible picture moves in or out; a trim drag shows what it cuts, faintly
- The handle under the mouse grows and is labelled ("Drag to scale", "Drag to trim"); a drag shows its size or trim in mm
- Mouse wheel zoom toward cursor; middle/right-click pan
- Touch support: single-finger drag/resize/edge-clipping, two-finger pinch zoom + pan
- Handles appear when the picture is selected, on its visible (trimmed) edges: 4 scale corners, 4 trim tabs

**Exact A3-Scale PDF Export**
- **Export Full Layout** — saves title block + viewport image as a single flattened A3 PDF
- **Export Image Only** — saves viewport image at its current position/size (no title block)
- Both open the export dialog first (v2.94.0): named, saved as a version for the job, then downloaded
- All exports use millimeter-unit positioning matching the canvas layout exactly
- PDF files maintain exact 1:1 scale with the A3 document (no distortion)

**Vale-Branded UI**
- Header matches main ValeVision3D app styling (white background, Vale logo, blue border), with the shared sign-in bubble
- Side menu styled as the main app's Tools & Settings menu (the actions bar below the header was retired in v2.75.0)
- Canvas background uses Vale grey branding (#b0b5ba)

### Technical Architecture

**Data Transfer**
- Rendered image (a PNG Blob) left on the app's window as `window.__Na__PageLayout__PendingImage` and read by the page through `window.parent` (v2.76.0; `window.opener` before, and still for a tab an older version opened)
- Avoids localStorage 5-10 MB size limit (supports high-res 4096px exports up to 30+ MB)
- Layout page reads image on load, then clears the reference to free memory, and posts `Na__PageLayout__Ready` (the app checks it comes from its frame)

**Coordinate System**
- All image positioning stored in mm relative to A3 document origin (top-left)
- Canvas renderer converts mm to screen pixels using current zoom level
- PDF export maps mm coordinates directly to jsPDF units (zero conversion)

**Rendering Pipeline**
- DPR-aware canvas for sharp display on retina screens (internal resolution = display size × DPR)
- Multi-layer drawing: grey background → white A3 paper with shadow → title block PNG → viewport image
- Handles drawn at screen-pixel size (22 px discs, 28 x 16 px tabs) over the zoomed picture (`Na__PageLayoutSystem__ImageHandles__`)
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
| `Na__PageLayoutSystem__Layout__.html` | The page: header (on its own only), canvas and side menu; the head's script marks it embedded or moves it into the app |
| `Na__PageLayoutSystem__Styles__Main__.css` | Layout page styles (workspace, side menu, cards, toast, embedded); imports main app's header CSS |
| `Na__PageLayoutSystem__Config.json` | Sheet, drawing frame, PDF, canvas, navigation, guide, render choices, saving |
| `Na__PageLayoutSystem__Host__.js` | The page's link to ValeVision 3D: the picture, the render bridge, the ready signal, Back to Model View, what the app asks (Status, Save, StandAside, RevealSaved) |
| `Na__PageLayoutSystem__SystemLogic__Main__.js` | State, picture loading (from the app or a saved layout), drawing frame, canvas sizing |
| `Na__PageLayoutSystem__CanvasRenderPipeline__.js` | 2D rendering of A3 paper, title block, image (DrawImageLayer, shared with PDF and thumbnails), guide, handles |
| `Na__PageLayoutSystem__2dNavigationControls__.js` | Zoom toward cursor, middle/right-click pan |
| `Na__PageLayoutSystem__ImageHandles__.js` | The picture's scale corners and trim tabs: where they sit (the visible picture), hit test, the move, scale and trim drag, drawing and labels; shared by mouse, touch and screen (v2.94.1) |
| `Na__PageLayoutSystem__Controls__Pc__.js` | Mouse interaction: picture handles, guide drags (Shift pairs edges), cursor feedback |
| `Na__PageLayoutSystem__Controls__TouchScreen__.js` | Touch interaction: drag, resize, guide drags, pinch zoom, pan |
| `Na__PageLayoutSystem__CompositionGuide__.js` | The guide's geometry, drag and clamp maths, hit-testing, drawing, save and open |
| `Na__PageLayoutSystem__CompositionGuide__Controls__.js` | The menu's guide section (show, lock, pair edges, margins, reset) |
| `Na__PageLayoutSystem__SideMenu__.js` | Menu shell (sections start folded, fold away, drag width), the job's name, picture tools, Back to Model View (Close in a tab of its own) |
| `Na__PageLayoutSystem__SavedLayouts__Controls__.js` | Drawing Layout (name, save, save as new), Save Layout File (Export), the job's Saved Layouts list, the synced toast; opens a layout the app's Drawings menu picked |
| `Na__PageLayoutSystem__SavedList__.js` | The saved layout cards and Everyone / Mine, shared with the 3D app's Drawings menu (a leaf: no imports) |
| `Na__PageLayoutSystem__Styles__SavedList__.css` | Their look, loaded by both the page and the 3D app |
| `Na__PageLayoutSystem__LayoutStore__.js` | The page-layouts API client; building, opening and thumbnailing a layout |
| `Na__PageLayoutSystem__RenderControls__.js` | Render Quality section and Re-Render through ValeVision 3D's bridge |
| `Na__PageLayoutSystem__UserSession__.js` | The shared Vale sign-in (no wall), who may save or delete |
| `Na__PageLayoutSystem__UiNotify__.js` | Toast, the Synced to the Vale Cloud toast, and the page's own events |
| `Na__PageLayoutSystem__UnsavedGuard__.js` | The warning before an unsaved drawing is closed (leaving the app or browser; the menu's Close in a tab of its own), and the app's Save and Start New |
| `Na__PageLayoutSystem__UndoHistory__.js` | Undo and redo: Ctrl+Z / Ctrl+Y and the Undo / Redo buttons |
| `Na__PageLayoutSystem__PdfExport__A3__.js` | jsPDF integration for A3-scale PDF export: Build (in memory), FileName, Download, Report (v2.94.0: a library the export dialog drives) |
| `Na__PageLayoutSystem__ExportDialog__.js` | The export dialog: the reference, the kind, the preview, the version it becomes, the file name, then PDF, save, download, with Try Again and Export Without Saving (v2.94.0) |
| `Na__PageLayoutSystem__Styles__ExportDialog__.css` | Its look (imported by the main stylesheet) |
| `Na__PageLayoutSystem__ExportNaming__.js` | The PDF's file name and the address that opens a version again (a leaf, tested in Node) |
| `Na__PageLayoutSystem__RecoveryDraft__.js` | The recovery copies in IndexedDB (a leaf: put, list, get, remove, prune; never rejects) |
| `Na__PageLayoutSystem__RecoveryDraft__Controls__.js` | When a copy is kept and dropped, and the Recover / Discard cards |
| `01__Dependencies__VersionLocked/jspdf.umd.js` | jsPDF v4.1.0 vendored (1.2 MB self-contained UMD build) |

On the ValeVision 3D side: `30__System__ImageExport/Na__ImageExport__PageLayoutHandoff__.js` (the source view and render settings handed to the page, and their pose and restore) and `Na__ImageExport__PageLayoutBridge__.js` (the re-render bridge), and since v2.76.0 `36__System__AppPages/`:

| Module | Purpose |
| :----- | :------ |
| `Na__AppPages__Navigation__.js` | The app's pages in one window: addresses (`&page=`), history entries, Back / Forward, Alt+Left / Alt+Right / Alt+Backspace, the breadcrumb's page crumb, `na-app-page-changed` |
| `Na__AppPages__DrawingPage__Host__.js` | The Drawing Editor page: its frame, the render loop and key scope held while it is up, the picture handed over, a saved layout opened, the new drawing question |
| `Na__AppPages__SavedDrawings__.js` | Tools & Settings > Drawings: the job's saved layouts (the editor's own cards), shown only when there are some; Open and Delete |
| `Na__AppPages__Styles__.css` | The page host, and the 3D view's menus and panels put away while a page is up |

### Integration with Export Controls

The layout system shares the same render pipeline as the "Export Now" feature via a refactored helper function `Na__UiFeature__RenderToDataUrl()` in the Image Export Controls module. This helper handles both custom export mode (resized renderer + camera aspect adjustment) and viewport-native mode (current size), applies post-processing if "Enhance Whitecard" is enabled, and returns the rendered dataURL with metadata. Both "Export Now" and "Layout View" call this shared function, eliminating duplicated render logic.

As of v0.1.4, this shared helper also synchronizes profile-lines normal-buffer render and size state during capture/restore, preventing perspective mismatches in layout exports.

# -----------------------------------------------------------------------------

## Testing Server With Fake Users (v2.84.1, PC only)

Double-click `Start__ValeVision__TestServer__8032__.bat`: the app on <http://localhost:8032/valevision/?project=63403__Thrower>, in an amber frame, on sandbox data. The badge in the bottom corner signs in as a fake user of any permission level in one click, opens a real client link, and lists every problem found. Your own Vale account does not exist there, and the real mirror is never written. `--real` runs on the real mirror with your own account, in a red frame; `--reset-sandbox` starts the sandbox again. Settings: `80__Testing__LocalTestServer/Na__TestServer__Config.json`. None of it ever reaches the server.

## An MCP Server for Agents (v2.87.0, PC only)

`96__Dev__McpServer__Python`, registered in `~/.claude.json` as `valevision3d`: an agent opens a project in the real app on its own sandbox, looks at it, measures it, changes its planting and publishes it through named tools. Real data asks for a confirmation each time, and nothing deletes or forces on the server. Its README lists the tools.

## Placed Assets: Who Can Place What (v2.89.0, no approval since v2.96.0)

People and plants are on for every project unless an admin has unticked them in Dev Tools > Assets. Staff place them and every change is tracked by name. **Since v2.96.0 a save by any staff member goes straight into the project's record**, which is all a client reads: there is no waiting for an admin (the API's `NA_STAFF_SAVES_GO_STRAIGHT_IN`; False brings the v2.89.0 approval back). Who added each person, plant and path, and when, is kept beside the record in `ValeVision3D/UserData__SceneAssets/`, which holds staff names and is never served, and a right-click on one shows it to staff. Unsaved people and plants are saved as the Drawing Editor or the Layout Editor opens.

| Who | What |
|---|---|
| A client link, an Affiliate | Show and Transparency, and only when something is placed |
| An Employee, or Management, on a computer or tablet | Places, moves, swaps and deletes anything; Save puts it in front of clients. A right-click says who added it and when. The Changes tab: Remove My Changes. Phones only look |
| An AppAdmin | All of that. Remove Their Changes; Approve only for work left waiting from before v2.96.0. Line rules, drawings ticks, Update to Latest, the off switch |

The routes and sums are `Server__Api/Api__ValeVision3D/ValeVision3D__Api__SceneAssets__*.py`, and the page's side is `02__Src__AppModules/22__System__SceneAssets`.

## Vegetation (v2.83.0 to v2.91.0)

Linework plants: clean CAD shrubs drawn from rules and a seed, at the whitecard's own line weight.

| Who | Where | What |
|---|---|---|
| Everyone, client links and phones included, where there are plants | Tools & Settings > Vegetation | Show Vegetation, Transparency, remembered on the device |
| Staff on a computer or tablet, on any project | The Vegetation panel on the left, which unfolding Tools & Settings > Vegetation opens and folding it (or the panel's Close) shuts | Dropdown sections, one open at a time: Assets (the cards), Line Tool, Brush Tool, In This Project and Changes, with Undo, Redo and Save Vegetation at its foot. Closing Tools & Settings leaves it open |
| Staff, while the Vegetation panel is open | The model | Right-click a plant: Move, Bigger, Smaller, Copy, replace with pictures of the others, Delete. A plant of a path changes alone, and no other moves |
| An author (AppAdmin) | The same section | Vegetation Linework, Show on Live Drawings |
| An author | Plant scale, in every tool and on what is planted | The whole plant: 0.50 is the same bush at half the size. Width, depth and height fit one to a space |
| An author | Dev Tools > Vegetation | The one switch, where a viewer starts, Remove All |
| An author | A sheet's viewport | A Vegetation tick, off by default, puts plants over its vectors, on screen and in the PDF |
| SketchUp | Cloud Sync's Sync Vegetation tab | Proxies both ways, three-way, ValeVision wins a clash; a path's plants come in locked |

The library has shrubs, a clipped hedge (a card's Draw Path), and topiary: a ball, a standard and a cone. They draw in the live view, stills, thumbnails, video and a sheet's 3D pictures, on both engines, their fill at the brightness of a wall facing the camera, changing as you move. A planting change redraws a sheet's cached pictures. Plan of record: `ValeVision__PLAN__VegetationSystem__.md`. Code: `02__Src__AppModules/24__System__Vegetation` (its README). Library: `53__Vegetation__AssetLibrary`. A project's settings, every parameter of them, live in its record as `Vegetation__SceneData`. A project without that key costs one module and one listener.

## Entourage (v2.88.0 to v2.91.0)

People drawn in the plants' line language: flat figures that turn to the camera, line and face fading together, so they give a sense of scale without pulling the eye from the architecture. Dev Tools > Assets nests Entourage, Vegetation and Furnishings (to come), each with its own tick, which is the admin's off switch for that project.

| Who | Where | What |
|---|---|---|
| Everyone, client links and phones included, where there are people | Tools & Settings > Entourage | Show Entourage, Transparency (60% to start), remembered on the device |
| Staff on a computer or tablet, on any project | The Entourage panel on the left, which unfolding Tools & Settings > Entourage opens and folding it (or the panel's Close) shuts | Dropdown sections, one open at a time: Assets (the cards), In This Project and Changes, with Undo, Redo and Save Entourage at its foot. One of the two panels at a time: unfolding Entourage folds Vegetation, and the other way round |
| Staff, while the Entourage panel is open | The model | Drag a card on, a ring on hover, drag a person to move them, M, Ctrl+D, Delete, right-click to replace with pictures of the others or delete |
| An author (AppAdmin) | The same section | Entourage Linework, Show on Live Elevations |
| An author | Dev Tools > Assets > Entourage | The one switch, where a viewer starts, Remove All |
| An author | A sheet's viewport | An Entourage tick, off by default, puts people over its vectors, on screen and in the PDF. A plan never shows them |
| SketchUp | Cloud Sync's Sync Entourage tab | Proxies both ways, three-way, ValeVision wins a clash |

The library is 13 figures converted from the core component library's `60__Scene__Entourage__2D`: six men, six women and a Labrador. The code is `02__Src__AppModules/23__System__Entourage`, whose README has the files and the rules, and the library is `54__Entourage__AssetLibrary`. A new figure is a `.skp` in that folder and one call of the MCP tool `vv3d_entourage_import_skp`. What was baked into a GLB by tags 60 and 61 (Holt's silhouettes) still works by the old camera-follow billboards, and the two routes do not meet.

## Project Lighting (v2.98.0)

A project can turn its own sun, so its 3D view shades the faces its own way: the whitecard stays flat shaded, and which faces read lighter or greyer follows where the sun is. It lights the 3D view and every scene that has no lighting of its own, for staff and clients alike. Plans, elevations and Layout Editor sheet pictures keep the app's default lighting on every project (Adam: "3D view only").

Dev Tools > **Project Lighting**, under Render Engine (app admins only): Rotation, Height, Sun, Ambient and Sun casts shadows, the same controls as a scene's Lighting below. **Sun casts shadows is off by default** (v2.98.6, `Scene__Default__LightingConfig__ShadowsEnabled` false): tick it to give a project's 3D view the sun's shadows, which saves `SceneLighting__Sun__ShadowsEnabled` true; plans, elevations and sheet pictures have none. Every change lights the viewport at once; a line says where the sun is (in compass words once North Direction is set). **Save Project Lighting** asks first, as the camera and fog saves do: Save, Overwrite or Clear, whichever the press will do. **Use App Default** and **Undo Changes** are changes like any other until saved.

Stored as one top-level key of `project.json`, a section per light, holding only what differs from the app default (no key at all at the default), saved by PATCH as that one key:

```json
"SceneLighting__ProjectOverrides": {
    "SceneLighting__ProjectOverrides__Description"   : "This project's own lighting, set in the Dev menu's Project Lighting ...",
    "SceneLighting__ProjectOverrides__SchemaVersion" : 1,
    "SceneLighting__ProjectOverrides__Sun"           : { "SceneLighting__Sun__RotationDeg": 180, "SceneLighting__Sun__HeightDeg": 40 },
    "SceneLighting__ProjectOverrides__Ambient"       : { "SceneLighting__Ambient__Intensity": 3.1 }
}
```

`__Sun` holds `SceneLighting__Sun__RotationDeg`, `__HeightDeg`, `__Intensity` and `__ShadowsEnabled`; `__Ambient` holds `SceneLighting__Ambient__Intensity`. A later lighting override joins as a section of its own. `Scene__ProjectLighting__Enabled` false in the app config ignores every saved project lighting and hides the section; nothing is deleted. The modules are `06__Scene__LightingEffects/Na__Scene__ProjectLighting__.js` (load, working copy, save) and `Na__Scene__ProjectLighting__DevMenu__.js`; the layers themselves are in `Na__Scene__PerSceneLighting__.js`.

## Per-Scene Lighting (v2.71.0)

Any Presentation Mode scene can carry its own lighting, so a view whose subject faces away from the sun can be lit properly without changing any other scene. Every scene that is not given its own lighting keeps using the default: the project's lighting when it has its own (above), else the app's.

### Authoring

Dev Tools > Presentation Mode Scenes > open a scene > **Advanced** > **Lighting** (localhost only):

| Control | What it does |
| :------ | :----------- |
| Rotation | Turns the sun about the vertical axis, clockwise seen from above. 0 is the app's default direction; the slider runs 0 to 360. |
| Height | The sun's angle above the horizon. Lower lights the walls more strongly; 90 is straight overhead. |
| Sun | The strength of the sun (the directional light, the only light that casts shadows). |
| Ambient | The strength of the even fill light every face receives. |
| Sun casts shadows | Off by default (v2.98.6). Tick to give this scene the sun's shadows; untick to fade them out where the project's lighting has them on. |

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
- Floor plans and elevations always use the app's default lighting, in the viewer and on Layout Editor sheets, whatever the project's own.
- Image export, scene thumbnails, Update All Thumbnails and Download All Images render each scene in its own lighting.
- Shadows switch by strength (`LightShadow.intensity`), never by `castShadow`, so no material recompiles.

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js` | Owns both lights: the app default, the project's layer, resolve, the minimal stored block, flight blend, apply and capture. |
| `06__Scene__LightingEffects/Na__Scene__ProjectLighting__.js`, `Na__Scene__ProjectLighting__DevMenu__.js` | The project's own lighting: its record object and its Dev Tools section (above). |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneLightingRows__.js` | The Advanced > Lighting subsection. |
| `21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js` | Applies a scene's lighting on an instant apply and eases it over a flight. |
| `80__Testing__PrototypeEnvironment/Na__Test__PerSceneLighting__.test.mjs` | Node test of the lighting maths against the shipped app config. |

# -----------------------------------------------------------------------------