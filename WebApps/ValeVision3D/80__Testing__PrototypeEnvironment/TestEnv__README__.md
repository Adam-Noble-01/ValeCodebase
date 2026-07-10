# ValeVision3D - Prototype Testing Environment
# ---------------------------------------------------------

## Purpose
- This subproject provides a sandboxed, self-contained environment for quickly developing and experimenting with new ValeVision3D features before integrating them into the main codebase. 
- The goal is to speed up isolated feature development, test interactions, and debug with greater agility.


## Folder Structure
- This is a base structure for the prototype testing environment.
- New scripts may be added for testing specific features or interactions.
```
ValeVision3D/  # Main project folder (1 LEVEL UP FROM THIS FOLDER)
│
├── 80__Testing__PrototypeEnvironment/                      # Sandbox folder in the main ValeVision3D project
   └── TestEnv__GlbFiles/                                   # Local storage for .glb files 
   ├── TestEnv__PrototypeTestingSandbox__DomAndLayout.html  # HTML for the prototype sandbox UI/layout
   ├── TestEnv__PrototypeTestingSandbox__Main__.js          # Main JS logic for prototype sandbox
   ├── TestEnv__PrototypeTestingSandbox__Stylesheet.css     # CSS styling for prototype sandbox
   ├── TestEnv__SubAppData__Config.json                     # Configuration file for the prototype sandbox for enabling/disabling features / settings / etc
   └── TestEnv__FlaskLocalServer.py                         # Flask server hosting the test environment
   └── TestEnv__FlaskLocalServer.bat                        # Batch file to start the Flask server
   └── TestEnv__CurrentFeatureTestScripts/                  # Folder for the current feature test scripts, keeps a clean separation of not yet validated features.
```

## `TestEnv__GlbFiles` Folder:
- Store local .glb models here for loading within the test environment.
- Loads any .glb files placed in this folder into the test environment.

# ---------------------------------------------------------
## How This Environment Works
- The testing environment runs separately from the main ValeVision3D application using its own local Flask server and port.
- Existing core engine scripts and controls from the parent ValeVision3D project are reused.
- GLB files are loaded from the local `glb-assets` folder (for easy offline testing and asset management).
- UI elements clearly indicate TESTING MODE at the top of the application.
- Keeps the "TEST ENVIRONMENT" banner active in the top left corner of the application to avoid confusing this workspace with production.


# ---------------------------------------------------------
## Key Features

### GLB Model Loader:
- LoadS ANY `.glb` models locally from the `TestEnv__GlbFiles` folder for experimentation and easy hot-reloading.

### Statistics Debug Overlay:
- Live performance and scene stats display panel in the top left corner of the application.
  - Reports the current frame rate, the number of meshes, and the number of vertices in the scene.

### Node Graph Explorer:
- On the right screen is a entire panel that is exposed by default but can be folded back against the right margin to maximise the viewport area.
- This panel contains a tree view to inspect the full scene node hierarchy of the loaded .glb.
- Toggle visibility of any node/mesh for model isolation and debugging.
- Default is all children of the root node are visible, the tree graph can be collapsed at each level to hide the children if needed.
- Toggle visibility of any node/mesh for model isolation and debugging.
- Shows the entire node hierarchy of the loaded .glb clearly to help diagnose problematic model hierarchies or meshes.

### Refresh Models Button:
- Located in the Node Graph Explorer panel header (orange button with circular arrow icon).
- Click to reload all GLB models from the `TestEnv__GlbFiles` folder without resetting the camera position.
- Useful during development when updating model files - no need to refresh the entire browser.
- Preserves your current camera position and orbit target for seamless iteration.
- Automatically cleans up old model data and rebuilds the node tree.

### Single source of engine code:
- All modules related to the base render engine PC controls are passed through from the established ValeVision3D engine scripts.

# ---------------------------------------------------------

## Door Animation Regression Matrix

Place matching mesh and linework GLBs in `TestEnv__GlbFiles`.

1. **Legacy ROT_ONLY:** click a single hinged door, reverse it mid-motion, and
   confirm mesh/linework remain synchronized.
2. **Signed and mirrored rotation:** test positive/negative degree names and a
   negative-determinant mirrored ADR instance.
3. **Interior sign:** verify an `InteriorDoor` with
   `InteriorRotationInverted` both false and true.
4. **Bifold:** use `ROT_ONLY + ROT_MVE` panels; confirm all panels rotate/move
   in lockstep and duration equals base duration × `BifoldDurationMultiplier`.
5. **Sliding:** use `MVE_ONLY + FIXED`; confirm moving leaves translate and
   fixed leaves remain static while the ADR state stays lockstep.
6. **Exterior double click:** use an ADR name containing
   `ExteriorDoubleDoor` with two `ROT_ONLY` MODs and paired ROT siblings.
   Clicking MOD001 or MOD002 must animate only that leaf.
7. **Independent reversal:** reverse each exterior-double leaf independently
   during opening and closing; no progress jump is allowed.
8. **Nearest-leaf proximity:** enter Walk mode near each hinge, cross the
   centreline, and confirm the previous leaf closes while the nearest opens.
   ValeVision production thresholds remain unchanged; the sandbox uses its
   own configured threshold.
9. **Lockstep compatibility:** confirm Interior Double Doors, bifolds,
   sliding doors, and unknown ADRs never infer independence from panel count.
10. **Kill switches:** set `IndependentPanelsEnabled` false for exterior-double
    lockstep fallback, then set `MultiPanelEnabled` false for legacy ROT-only
    rollback.
11. **Refresh/rebind:** use Refresh Models and confirm the registry points to
    the new roots, clicks work once, and no duplicate pointer handlers appear.
12. **Load guards:** remove door groups or use an ADR with no recognized MOD;
    confirm the scan skips it with diagnostics and the viewer continues.

# ---------------------------------------------------------

## Development Workflow
- Rapidly prototype and test new features in isolation without affecting the main ValeVision3D application.
- Once satisfied, migrate stable functions and features back into the main ValeVision3D codebase (one directory up).
- Use the node explorer and toggle tools to diagnose problematic model hierarchies or meshes.
- Always preserve the use of existing engine code from the main ValeVision3D project to ensure rendering/controls remain consistent.




