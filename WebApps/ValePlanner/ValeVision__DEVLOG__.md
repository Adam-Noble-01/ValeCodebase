# ValePlanner Development Log
# =========================================================
# ---------------------------------------------------------
## ValePlanner v0.1.0 - 26-Mar-2026
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
## ValePlanner v0.2.0 - 26-Mar-2026
### Static Module Refactor + Version-Locked Dependencies

**Overview**
- Refactored ValePlanner from TypeScript/Vite mockup format into a static JavaScript module architecture using Vale naming and regional structuring conventions.

**Architecture**
- Added new app entrypoint `index.html` with deterministic module bootstrap.
- Introduced numbered module structure:
  - `02__Src__AppModules/02__AppCore/`
  - `03__AppData/`
  - `04__AppTypes/`
  - `05__AppUtils/`
  - `10__Feature__ScheduleBoard/`
  - `11__Feature__Analytics/`
  - `12__Feature__HeaderAndTabs/`
  - `70__System__DevTools/`

**Dependency Management**
- Added `02__Src__AppModules/01__AppDependencies__VersionLocked/`.
- Downloaded and pinned only used runtime dependency:
  - `chart.umd.4.4.3.min.js` (Chart.js v4.4.3).
- Removed dependency on React/Vite runtime in the new app implementation.

**Feature Parity**
- Preserved key behaviors from the previous mockup:
  - Day/week schedule view toggle
  - Shift create/move/resize/delete
  - Shift title editing
  - Reset workflow
  - Analytics charts and aggregate summaries

**Localhost Workflow**
- Added Python localhost test workflow:
  - `python -m http.server 8000`
- Added Windows launcher:
  - `Start__ValePlanner__Localhost__8000__.bat`

# ---------------------------------------------------------
# 

