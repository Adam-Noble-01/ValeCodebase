# ValePlanner Development Log
# =========================================================
# ---------------------------------------------------------

## ValePlanner v0.5.1 - 31-Mar-2026
### Timecard Clock-In Grace Period + Panel Normalization

**Overview**
- Added a 6-minute grace period to Timecard clock-in behavior and aligned panel rendering so early-minute entries display as normalized hour values.

**Timecard Behavior Updates**
- Added a dedicated clock-in grace helper in core logic:
  - Clock-ins with minute value `<= 6` now flatten to `HH:00` (for example `08:04` -> `08:00`).
- Wired grace normalization directly into `Clock In` record creation path so new entries are saved with normalized clock-in time labels.
- Added view-model normalization for stored clock-in text so existing historical entries also render with grace normalization in the panel.

**Panel + Duration Consistency**
- Updated Timecard row normalization so worked-duration calculation uses the same normalized clock-in value shown in the panel.
- Kept auth-hash validation/backfill semantics unchanged by continuing to validate against raw persisted payload values.

**Files Changed**
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__CoreLogic__.js`


## ValePlanner v0.5.0 - 26-Mar-2026
### Localhost JSON Persistence + API Route Hardening

**Overview**
- Implemented localhost-backed JSON persistence so Schedule and Timecard data now write to disk and survive full page refresh.

**Persistence Architecture**
- Added JSON API endpoints in `server.py`:
  - `GET` / `PUT` for workers data
  - `GET` / `PUT` for timecard data
- Added structured API responses (`ok`, `data`/`message`/`error`) with JSON content headers and no-store caching.
- Added request-body validation and file read/write error handling for safer disk updates.

**Frontend Data Flow Updates**
- Added persistence client module:
  - `02__Src__AppModules/70__System__DevTools/Na__System__PersistenceApi.js`
- Updated app bootstrap/init to:
  - load workers from localhost API first
  - fallback to seed JSON when API is unavailable
- Added debounced workers autosave after state mutations.
- Updated Timecard core logic to:
  - lazy-load data from localhost API
  - persist on `Clock In` / `Clock Out`
  - persist hash backfill/normalization updates
- Updated Timecard event handlers for async clock actions.

**Route and Localhost Startup Hardening**
- Hardened API route resolution in `server.py` to support nested path usage by matching route suffixes.
- Switched persistence API calls from absolute paths to relative `api/data/...` paths to avoid subpath 404 behavior.
- Updated localhost launchers to stop stale listeners on port `8000` before starting server:
  - `Start__ValePlanner__Localhost__8000__.bat`
  - `Start__ValePlanner__Localhost__8000__.ps1`

**Files Changed**
- `server.py`
- `Start__ValePlanner__Localhost__8000__.bat`
- `Start__ValePlanner__Localhost__8000__.ps1`
- `02__Src__AppModules/70__System__DevTools/Na__System__PersistenceApi.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__Bootstrap.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__CoreLogic__.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__EventHandlers__.js`



# ---------------------------------------------------------
## ValePlanner v0.4.0 - 26-Mar-2026
### Schedule Board Stability + Hover Controls + Undo/Redo Hotkeys

**Overview**
- Improved schedule board interaction reliability for create/edit/delete workflows and added keyboard undo/redo support for shift data changes.

**Schedule Interaction Fixes**
- Fixed drag-create persistence issue where draft blocks could disappear on mouse release.
- Improved block editing flow with dedicated top-left edit target and shared metadata update path (task title + color class).
- Added stronger cell/create guarding to prevent accidental new-block creation when interacting with existing shift blocks.

**Controls and Deletion UX**
- Updated `Edit` and `Delete` controls to render as hover-only affordances on shift blocks.
- Hardened delete interaction so button `mousedown` does not trigger drag/create behavior.
- Delete now reliably removes both rendered block and underlying shift data payload.

**Hotkeys + History**
- Added a dedicated app hotkeys module for keyboard command handling.
- Implemented workers history stacks in state store for undo/redo support.
- Added:
  - `Ctrl+Z` / `Cmd+Z` -> Undo last workers change
  - `Ctrl+Y` / `Cmd+Shift+Z` -> Redo workers change
- Undo/redo now restores or reapplies accidental shift deletions and other shift mutations.

**Files Changed**
- `02__Src__AppModules/10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__Interactions.js`
- `02__Src__AppModules/10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__Render.js`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__ScheduleBoard__.css`
- `02__Src__AppModules/02__AppCore/Na__AppCore__StateStore.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__HotkeysHandler.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`

# ---------------------------------------------------------
# 

# ---------------------------------------------------------
## ValePlanner v0.3.0 - 26-Mar-2026
### Timecard Tab + Monthly Chronology + Clock In/Out Workflow

**Overview**
- Added a new `Timecard` main tab for quick daily clock tracking with entry integrity hashing and month-grouped records.

**Feature Additions**
- Added `Timecard` top-level tab in header and app render routing.
- Added new Timecard feature module set:
  - `Na__Feature__Data__TimecardData__.json`
  - `Na__Feature__TimecardSystem__UniqueHashGenerator__.js`
  - `Na__Feature__TimecardSystem__CoreLogic__.js`
  - `Na__Feature__TimecardSystem__EventHandlers__.js`
  - `Na__Feature__TimecardSystem__TabLayout__.css`
  - `Na__Feature__TimecardSystem__StyleSheet__.css`

**Data + Validation**
- Added month-key grouped timecard JSON schema using Vale naming style:
  - `Timecard__March-2026` (seeded with 24/25/26-Mar-2026 records)
  - `Timecard__May-2026` (future month bucket)
- Implemented deterministic auth-hash generation and validation per entry using canonical date/time payloads.
- Added hash integrity status rendering in the Timecard table.

**Chronology + UX Updates**
- Month cards now render in descending chronology (latest month first).
- Empty month cards are hidden (months with no entries do not render).
- Added quick action buttons:
  - `Clock In` creates a new open entry for current date/time.
  - `Clock Out` closes the most recent open entry.
- Added summary metrics and feedback messaging for open shifts and action results.

**Styling + Integration**
- Added Timecard layout and visual style sheets.
- Imported Timecard styles into core stylesheet index.
- Updated state typing and app routing to support `mainTab: 'timecard'`.

**Files Changed**
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`
- `02__Src__AppModules/04__AppTypes/Na__AppTypes__Schema.js`
- `02__Src__AppModules/12__Feature__HeaderAndTabs/Na__Feature__HeaderAndTabs__Render.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__Data__TimecardData__.json`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__UniqueHashGenerator__.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__CoreLogic__.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__EventHandlers__.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__TabLayout__.css`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__StyleSheet__.css`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`

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
