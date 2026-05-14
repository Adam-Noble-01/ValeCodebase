# ValePlanner Development Log
# =========================================================
# ---------------------------------------------------------

# ---------------------------------------------------------
## ValePlanner v0.5.4 - 14-May-2026
### Timecard Admin — Safe Row Delete + Deterministic Hash Repair

**Overview**
- Extended the retrospective timecard Python editor (`70__AminUtils`) so accidental duplicate or wrong rows can be removed without leaving **invalid `Timecard__AuthHash` values**.
- Row hashes bind `monthKey` and **array row index**, so deleting a row shifts indices; after removal the tool recomputes **SHA-256** hashes for **all** remaining row objects using the same canonical string rules as `Na__Feature__TimecardSystem__UniqueHashGenerator__.js`.
- Before any write, the tool saves a **timestamped backup** of the JSON next to `Na__Feature__Data__TimecardData__.json` (`*.bak.json`).

**Admin Tool**
- Added **Delete Selected Row** next to retrospective save; confirmation dialog lists date, clocks, month bucket, and row index.
- On failed save after deletion, in-memory rollback restores the popped row and repairs hashes again.

**Files Changed**
- `70__AminUtils/ValePlanner__Admin__RetrospectiveEditor.py`

# ---------------------------------------------------------
## ValePlanner v0.5.3 - 15-Apr-2026
### Schedule — Timeline Auto-Extend + Drag Render Performance

**Overview**
- Schedule timeline now extends progressively as shift blocks are dragged or resized past the visible boundary, adding one clean hour at a time rather than jumping to a fixed wide range.
- Eliminated profile image flicker and general drag jank by replacing the full DOM re-render on every `mousemove` with a surgical fast-path that only mutates the draft card's position style.

**Timeline Auto-Extend**
- Updated `Na__Schedule__GetBounds` to accept an optional `draftShift` argument so live drag position is factored into visible bounds before any re-render.
- Replaced binary `{ 480, 1020 }` / `{ 360, 1260 }` hard-switch with a progressive calculation: bounds extend to the nearest whole-hour boundary above (or below) the current content extents. Grid grows one hour at a time as the user drags.
- Absolute drag ceiling raised from `bounds.end` to `1260` (9 pm) for all three interaction modes (`create`, `move`, `resize`) in `Na__Schedule__SetupDragHandlers`.
- Move action top clamp changed from `bounds.start` to `420` (7 am) so shifts can be dragged upward to allow early-morning start times, with the grid extending progressively in the same manner.

**Drag Render Performance**
- Added surgical fast-path in `Na__Schedule__RenderScheduleBoard`: when a drag is active and both bounds and the draft's column are unchanged, the function mutates `draftCard.style.top`, `draftCard.style.height`, and the time label text directly and returns without any `innerHTML` replacement.
- Bounds (`boundsStart`, `boundsEnd`) and draft column index are stored as `data-` attributes on `#naScheduleGridMain` after each full render so the fast-path can compare correctly on the next frame.
- Scroll position in `.na-schedule-grid-scroll` is saved before and restored after any full re-render triggered during drag (bounds expansion, column change on move).
- Added `Na__AppCore__LastRenderedHeaderState` module variable tracking `mainTab`, `viewMode`, and `currentDate`. `Na__Header__RenderShell` (which replaces `rootElement.innerHTML` including the profile image node) is now only called when one of those three values actually changes — never during drag, never on clock tick, never on shift selection or workers mutation. Profile image `<img>` node now persists for the entire session unless the user switches tabs or navigates weeks.

**Files Changed**
- `02__Src__AppModules/10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__DataTransforms.js`
- `02__Src__AppModules/10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__Interactions.js`
- `02__Src__AppModules/10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__Render.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`

# ---------------------------------------------------------
## ValePlanner v0.5.2 - 14-Apr-2026
### Server Connection Warning Banner + PWA Enablement + Silent Startup

**Overview**
- Added modular server connection monitoring with a top-center warning banner that appears only after a previously stable localhost connection is lost, warning that edits are no longer being persisted.
- Enabled ValePlanner installability metadata with a dedicated web manifest, planner-specific app icons, and service worker registration.
- Added Windows `8001` launchers including a silent startup launcher designed for `shell:startup` workflows.

**Connection Reliability**
- Added monitor module:
  - `02__Src__AppModules/70__System__DevTools/Na__System__ServerConnectionStatus__Monitor.js`
- Added banner UI module:
  - `02__Src__AppModules/70__System__DevTools/Na__System__ServerConnectionStatus__Banner.js`
- Added banner stylesheet:
  - `03__Style__AppStylesheets/Na__UiSystem__Styles__ServerConnectionStatusBanner__.css`
- Wired monitor + banner initialization from app bootstrap.
- Updated persistence API module to report GET/PUT success/failure signals into the connection monitor.
- Added health endpoint in `server.py`:
  - `GET api/system/health`

**PWA and Branding**
- Updated `index.html` icon URLs to use:
  - `01__AppAssets__ValePlanner/Na__ValePlannerApp__Icon__192x192.png`
  - `01__AppAssets__ValePlanner/Na__ValePlannerApp__Icon__512x512.png`
- Added manifest:
  - `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest`
- Added service worker registration module:
  - `02__Src__AppModules/62__Feature__AppInstallability/Na__Feature__AppInstallability__ServiceWorkerRegistration__.js`
- Added app-root service worker:
  - `Na__ServiceWorker__ValePlanner.js`

**Startup and Server Runtime**
- Added `8001` launchers:
  - `Start__ValePlanner__Localhost__8001__.bat`
  - `Start__ValePlanner__Localhost__8001__.ps1`
- Added silent startup launcher:
  - `Start__ValePlanner__WindowsStartUp__Silent__8001__.bat`
- Hardened launchers to avoid force-killing other apps on shared localhost ports (warn-and-exit when `8001` is occupied).
- Updated `server.py` with:
  - `--silent` mode for no-console launches
  - `--log-file` output redirection for silent runtime logs
  - `.webmanifest` MIME mapping for installability metadata

**Files Changed**
- `index.html`
- `server.py`
- `ValePlanner__README__.md`
- `02__Src__AppModules/02__AppCore/Na__AppCore__Bootstrap.js`
- `02__Src__AppModules/70__System__DevTools/Na__System__PersistenceApi.js`
- `02__Src__AppModules/70__System__DevTools/Na__System__DevTools__LocalhostGuard.js`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`
- `02__Src__AppModules/70__System__DevTools/Na__System__ServerConnectionStatus__Monitor.js`
- `02__Src__AppModules/70__System__DevTools/Na__System__ServerConnectionStatus__Banner.js`
- `03__Style__AppStylesheets/Na__UiSystem__Styles__ServerConnectionStatusBanner__.css`
- `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest`
- `02__Src__AppModules/62__Feature__AppInstallability/Na__Feature__AppInstallability__ServiceWorkerRegistration__.js`
- `Na__ServiceWorker__ValePlanner.js`
- `Start__ValePlanner__Localhost__8001__.bat`
- `Start__ValePlanner__Localhost__8001__.ps1`
- `Start__ValePlanner__WindowsStartUp__Silent__8001__.bat`

# ---------------------------------------------------------
## ValePlanner v0.4.6 - 02-Apr-2026
### Analytics — Min-Hours Threshold (Donut) + Calendar Bar Labels

**Overview**
- Added a **Min Hours** range slider on the **Time Distribution by Task** card (0–5 hrs, 0.25 step). Tasks whose **aggregated hours in the selected range** fall **below** the threshold no longer get individual donut slices; their hours roll into a single **Other** slice so totals stay honest while the legend stays readable.
- **Hours per Day** bar chart x-axis labels now use **real calendar days** (`Na__Utils__FormatUkDateCompact`, e.g. **Tue 31 Mar**) instead of weekday-only labels, so multiple weeks in one range no longer look like duplicate Mon/Tue/Wed bars.

**Date Utilities**
- Added **`Na__Utils__FormatUkDateCompact`** in shared dates helpers for compact UK-style chart labels (weekday + day + short month).

**Files Changed**
- `02__Src__AppModules/05__AppUtils/Na__Utils__Dates.js`
- `02__Src__AppModules/11__Feature__Analytics/Na__Feature__Analytics__Render.js`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Analytics__.css`

# ---------------------------------------------------------
## ValePlanner v0.4.5 - 01-Apr-2026
### Analytics Task Collation (Case-Insensitive) + All-Time Default Range

**Overview**
- Updated analytics aggregation so repeated job names collate into one task bucket across all matching stints.
- Task-name grouping is now case-insensitive and whitespace-normalised, so `king`, `KING`, and `King` all aggregate together.
- Pie chart task labels now render in Title Case for consistent naming.
- Analytics initial load now defaults to all available shift dates (min->max) instead of current-month-first, so historical hours are included immediately.
- Existing range handles remain active, so users can still narrow the time window after load.

**Files Changed**
- `02__Src__AppModules/11__Feature__Analytics/Na__Feature__Analytics__Render.js`

# ---------------------------------------------------------
## ValePlanner v0.4.4 - 26-Mar-2026
### Analytics Time Range (Levels Bar) + Muted Palette + Current-Month Default

**Overview**
- Added a **Photoshop Levels–style** time range control between the three summary cards and the doughnut / bar charts: canvas **area + contour line** shows **hours per calendar day** across the full shift span; **two draggable triangle handles** clamp the filtered range; **Total Tracked Hours**, **Total Tasks** (filtered shift count), and both charts update live while dragging.
- **Default filter** is the **current calendar month** (first–last day via local dates). If no shifts fall in that month, the range falls back to the min–max shift dates; if there are no shifts, the month range is still used for an empty view.
- **Chart colours** use a **fixed desaturated palette** (~25% lower saturation than the previous Tailwind-like set); the **Hours per Day** bar chart assigns **one colour per bar** (palette cycling).
- **Date handling** in analytics uses shared **`Na__Utils__Dates.js`** helpers only: **`Na__Utils__FormatLocalDateAsYyyyMmDd`**, **`Na__Utils__ParseYyyyMmDdToLocalDate`**, **`Na__Utils__FormatUkDateLong`** (header labels), **`Na__Utils__FormatUkWeekdayShort`** (bar axis), **`Na__Utils__CompareYyyyMmDd`** (sorting).
- **Levels UI polish**: track **horizontal margin** and card **`overflow: visible`** so the **left handle** stays visible at the start of the range; initial histogram draw deferred with **`requestAnimationFrame`** so canvas size matches layout.

**Files Changed**
- `02__Src__AppModules/11__Feature__Analytics/Na__Feature__Analytics__Render.js`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Analytics__.css`

# ---------------------------------------------------------
## ValePlanner v0.4.3 - 26-Mar-2026
### UK Date Standardisation + Canonical YYYY-MM-DD + Seed Week w/c 23-Mar-2026

**Overview**
- Standardised all planner and timecard dates on a single UK-oriented convention: **canonical storage** as ISO-style `YYYY-MM-DD` (local calendar, not UTC-shifted), and **user-facing** labels as **31 Mar 2026** (with shared helpers for **31-Mar-2026** and ordinal **31ˢᵗ March 2026** where needed).
- Realigned demo **Workers** and **Timecard** seed data to **week commencing 23-Mar-2026** (Mon **2026-03-23** … Sun **2026-03-29**). Initial schedule `currentDate` is set to **2026-03-23** so week view opens on that seed week without navigation (swap back to `Na__Utils__GetTodayDateString()` when you want live “today” again).

**Date Utilities (`Na__Utils__Dates.js`)**
- Added **`Na__Utils__ParseYyyyMmDdToLocalDate`** and **`Na__Utils__FormatLocalDateAsYyyyMmDd`** so week boundaries and `ShiftDateByDays` never use `toISOString().split('T')[0]` for the calendar day.
- Added UK formatters: **`Na__Utils__FormatUkDateLong`**, **`Na__Utils__FormatUkDateHyphen`**, **`Na__Utils__FormatUkDateOrdinal`**, **`Na__Utils__FormatUkWeekdayShort`**, **`Na__Utils__CompareYyyyMmDd`**.
- **`GetWeekDates`**, **`GetWeekRangeLabel`**, **`GetDayLabel`** now use **`en-GB`** (day-first) instead of **`en-US`**.
- Preserved pre-refactor implementations in a **commented** `REGION | Redundant / Legacy Date Helpers` block for traceability.

**Timecard**
- **`Timecard__Date`** rows are stored as **`YYYY-MM-DD`**; new clock-ins use the same via **`Na__Timecard__FormatDateLabel`** (delegates to shared local formatter).
- **`Na__Timecard__MigrateLegacyTimecardDates`** runs on first datastore hydrate to rewrite legacy `DD-MMM-YYYY` (and `Sept`/`Sep` month tokens) to **`YYYY-MM-DD`**, clears affected **`Timecard__AuthHash`** values, and persists when migration mutates data so hashes backfill on next view-model build.
- Timecard table **Date** column renders **`Na__Utils__FormatUkDateLong`** while storage stays canonical.

**Analytics**
- Bar chart day labels use **`Na__Utils__FormatUkWeekdayShort`**; sorting uses **`Na__Utils__CompareYyyyMmDd`**; range chip labels use **`FormatUkDateLong`**.

**Types**
- JSDoc notes on **`Na__Shift.date`** and **`Na__PlannerState.currentDate`**: **`YYYY-MM-DD`**.

**Files Changed**
- `02__Src__AppModules/05__AppUtils/Na__Utils__Dates.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__CoreLogic__.js`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__TimecardSystem__EventHandlers__.js`
- `02__Src__AppModules/11__Feature__Analytics/Na__Feature__Analytics__Render.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`
- `02__Src__AppModules/03__AppData/Na__AppData__Workers__AdamW__.json`
- `02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__Data__TimecardData__.json`
- `02__Src__AppModules/04__AppTypes/Na__AppTypes__Schema.js`


# ---------------------------------------------------------
## ValePlanner v0.4.2 - 26-Mar-2026
### Schedule Week / Day Navigation + Calendar Default Date

**Overview**
- Added fluid week-by-week (and day-by-day) navigation in the Schedule header and replaced the fixed seed calendar anchor with today’s date on first load.

**Header + Navigation UX**
- Wrapped the schedule date range / day label in a `na-date-nav` cluster with previous and next arrow buttons flanking the existing pill.
- Arrow navigation is view-mode aware: **Week** moves `currentDate` by ±7 days; **Day** moves by ±1 day.
- Navigation clears transient schedule interaction state (`selectedShiftId`, `draftShift`, `pendingDrag`) so the board does not carry stale selection across weeks.

**Date Utilities**
- Added `Na__Utils__ShiftDateByDays` for ISO `YYYY-MM-DD` arithmetic used by navigation.
- Added `Na__Utils__GetTodayDateString` so initial `currentDate` matches the real calendar day instead of a hardcoded historical date.

**App Core**
- Wired `data-action="navigate-date"` handlers in header event binding alongside existing tab, view-mode, and reset controls.

**Styling**
- Added `.na-date-nav` and `.na-date-nav__arrow` rules aligned with existing header pill and muted text tokens.

**Note (Data vs Calendar)**
- Shifts render only on columns whose date matches each shift’s `date` field; if seed or persisted workers still use older ISO dates, use the arrows to reach that week or add shifts for the current week.

**Files Changed**
- `02__Src__AppModules/05__AppUtils/Na__Utils__Dates.js`
- `02__Src__AppModules/12__Feature__HeaderAndTabs/Na__Feature__HeaderAndTabs__Render.js`
- `02__Src__AppModules/02__AppCore/Na__AppCore__ValePlannerApp.js`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__HeaderAndTabs__.css`


## ValePlanner v0.5.1 - 31-Mar-2026
### Timecard Clock-In Grace Period + Panel Normalisation

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


# ---------------------------------------------------------
## ValePlanner v0.4.1 - 26-Mar-2026
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
