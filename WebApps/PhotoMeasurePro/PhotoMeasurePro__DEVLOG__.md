# PhotoMeasurePro Development Log
# =========================================================


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
