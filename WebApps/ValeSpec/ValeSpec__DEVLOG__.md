# ValeSpec Development Log
# =========================================================


# ---------------------------------------------------------
## ValeSpec v0.1.8 - 17-Apr-2026
### Ironmongery finish fills, materials SSOT (MAT600), DevTools plugin, CAD viewer tools

End-to-end work tying **SketchUp vector export**, **app config**, **SVG ironmongery rendering**, and the **TrueVision materials library** so assembly previews can show **filled handle regions** coloured by the user’s **global ironmongery finish**, plus standalone **CAD Object Viewer** inspection tools.

#### Ironmongery — fills and finish colour in ValeSpec

- **Feasibility:** Fills need **face** geometry, not edge-only data. The CAD exporter now emits `PathType: "Polygon"` from selected **loose faces** (outer loop vertices in mm), ahead of arcs/lines in `Paths` so SVG draws fills under strokes.
- **`ValeSpec__AppConfig__Main__.json`:** `ValeSpec__Ironmongery__GlobalDefaults__Config__AvailableFinishes` is a structured list of `{ Name, MatCode, HexColor }` (e.g. Brass / Satin Nickel / Bronze) so the UI and renderer share one mapping from finish name to preview colour.
- **`ValeSpec__SvgDrawing__IronmongeryRenderer__.js`:** `RenderPaths` draws polygons first with a `fillColor`, then lines as before.
- **`ValeSpec__SvgDrawing__RenderPipeline__.js`:** Reads `globalIronmongeryFinish` from `StateManager`, resolves `HexColor` from config, passes it into `RenderIronmongery` (assembly + thumbnail paths).
- **`ValeSpec__AssemblyEditor__SvgPreview__.js`:** Listens for `globalFinishChanged` and re-renders the preview so finish changes update immediately.

#### Materials library — SSOT and MAT600 series

- **Authoritative file:** `NaWeb/.../02__AppData/Na__AppConfig__MaterialsLibrary.json` (3-digit `MAT{NNN}__Category__Variant` names). **ValeVision3D** carries a **mirrored** copy for local/web renderer use.
- **v2.2.1 (2026-04-17):** Root key aligned to `Na__AppConfig__MaterialsLibrary`; **`MAT600__MetalSeries__`** added (generic metals **MAT600–MAT603**; ironmongery **MAT611** Chrome, **MAT612** Brass, **MAT613** Bronze, **MAT614** SatinNickle) with `BaseColor` aligned to SketchUp RGB samples where supplied.
- **Cursor rule:** `NaWeb/.../.cursor/rules/materials-library-single-source-of-truth.mdc` — registration workflow and naming; use **Matte** (not “Matt”) in material copy.

#### SketchUp — `Na__DevTools` plugin

- New **Noble Architecture DevTools** extension: loader, hotkey/menu binder, `HtmlDialog` shell (tabs aligned with **Na__EdgeUtil** style), and **`Na__DevUtil__LoadMaterials__`** — on-demand port of the web materials library loader (preview cubes in the active model). Lives under the SketchUp **Plugins** tree beside other NA extensions.

#### CAD Object Viewer (`65__Dev__CadObjectBuilder`)

- **Faces** toolbar control (**off** by default): toggles semi-transparent polygon fills for exported `Polygon` paths; **P** shortcut.
- **Measure** tool: vertex snap (screen-space tolerance scales with zoom), two-point distance readout on an SVG overlay; **M** shortcut; clears path selection while active.
- Path list / inspector support polygon rows and detail.
- **Fix:** Stylesheet `href` was corrected from `...Main__.csss` to `...Main__.css` in the standalone viewer HTML files so the external CSS loads. If interactions still fail, check the browser console for script errors.

#### Files touched (representative)

| Area | Path |
|------|------|
| CAD export | `65__Dev__CadObjectBuilder/ValeSpec__CadObjectBuilder__JsonExporter__.rb` |
| App config | `02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json` |
| SVG ironmongery | `02__Src__AppModules/05__SvgDrawing__RenderPipeline/ValeSpec__SvgDrawing__IronmongeryRenderer__.js` |
| Render pipeline | `02__Src__AppModules/05__SvgDrawing__RenderPipeline/ValeSpec__SvgDrawing__RenderPipeline__.js` |
| Assembly preview | `02__Src__AppModules/20__System__ProductAssembly__EditorMode/ValeSpec__AssemblyEditor__SvgPreview__.js` |
| Materials SSOT | `NaWeb/.../Na__AppConfig__MaterialsLibrary.json` |
| Materials mirror | `ValeVision3D/.../Na__AppConfig__MaterialsLibrary.json` |
| Materials rule | `NaWeb/.../.cursor/rules/materials-library-single-source-of-truth.mdc` |
| DevTools plugin | `SketchUp 2026/Plugins/Na__DevTools__*.rb`, `Na__DevTools__Modules__/*` |
| CAD viewer | `65__Dev__CadObjectBuilder/ValeSpec__CadObjectViewer__.html`, optional `...AppMain__.html`, `...StyleSheet__Main__.css` |


# ---------------------------------------------------------
## ValeSpec v0.1.7 - 17-Apr-2026
### Document Management — Sortable headers without glyphs; REGION layout

Follow-up to the sortable Projects table (v0.1.6): **sort direction arrows are removed** from column headers. Sorting behaviour is unchanged; **hover** and **active-column** styling on `.ValeSpec__DocManagement__SortableHeader` still show which column drives the order and that headers are interactive.

`ValeSpec__DocManagement__ProjectList__.js` is structured with **ValeDesignSuite-style `REGION` blocks** (constants, comparators, header cell builder, table fragments, render/events, public API). Sortable `<th>` markup is simplified to label text plus `data-sort-field` (no nested spans or indicator helper).

`ValeSpec__DocManagement__Styles__Main__.css` drops **SortIndicator**, **SortIndicator--inactive**, and **SortableHeaderContent** (previously used for label + glyph layout).

#### Files touched

| Area | Path |
|------|------|
| Project table | `10__System__DocumentManagementMode/ValeSpec__DocManagement__ProjectList__.js` |
| Styles | `10__System__DocumentManagementMode/ValeSpec__DocManagement__Styles__Main__.css` |


# ---------------------------------------------------------
## ValeSpec v0.1.6 - 17-Apr-2026
### Document Management — Sortable Projects table

The Projects list (Document Management mode) is now an interactive table: column headers sort the manifest rows without changing underlying storage order. Default view is **newest Date Created first** (descending).

#### Behaviour

- **Default load:** sort field `dateCreated`, direction `desc`.
- **Clickable headers:** Project Code, Project Name, Document Name, Status, Date Created, Last Modified. Actions column is not sortable.
- **Toggle:** repeated clicks on the same column flip ascending / descending. Clicking a different column selects that field and starts **ascending**, then toggles on further clicks.
- **Indicators:** active column shows up/down arrow; inactive sortable columns show a dimmed bidirectional hint.
- **Data layer:** `ValeSpec__ProjectFileManager__ListProjects()` is unchanged; sorting applies to a copied array inside `ProjectList` render only.

#### Implementation

- `ValeSpec__DocManagement__ProjectList__.js` — module state for `sortField` / `sortDirection`, comparators for text (numeric-aware `localeCompare`), ISO dates (`Date.parse`), and status (workflow order then label). `ValeSpec__ProjectList__ToggleSortByField` exposed for delegation.
- `ValeSpec__DocManagement__ProjectActions__.js` — existing `#ValeSpec__DocManagement__TableContainer` click delegate handles `.ValeSpec__DocManagement__SortableHeader` before row Open/Delete buttons.
- `ValeSpec__DocManagement__Styles__Main__.css` — pointer, hover, active header chrome; flex row for label + sort glyph.

#### Files touched

| Area | Path |
|------|------|
| Project table | `10__System__DocumentManagementMode/ValeSpec__DocManagement__ProjectList__.js` |
| Row + header actions | `10__System__DocumentManagementMode/ValeSpec__DocManagement__ProjectActions__.js` |
| Styles | `10__System__DocumentManagementMode/ValeSpec__DocManagement__Styles__Main__.css` |

#### Note

`Na__DocManagement__Config.json` still documents `DefaultSortField` / `DefaultSortDirection` for **DateModified**; the live UI default for the table is **Date Created desc** as above. Align config in a future pass if other consumers should read it.

# ---------------------------------------------------------
## ValeSpec v0.1.5 - 16-Apr-2026
### Document Preview — Header, PDF export, summary, and layout

Document preview gains a formal header and Issued workflow, native A4 PDF via jsPDF (no canvas snapshot of the header), richer summary totals, reordered sections, and tighter pagination behaviour.

#### Preview header and Issued

- Left: Vale logo, project name, project code. Right: Document Control grid (document name, section, revision, author, status badge, revision date, Issued).
- On PDF finalisation, `ValeSpec__DocPreview__DocIssueHandler__.js` stamps `ValeSpec__ProjectFile__Metadata__DateIssued` (ISO), saves via `ProjectFileManager.SaveProject`, with a placeholder for a future email path. Stamp runs before the export model; `PageRenderer` runs after so the Issued cell updates.
- Fix: `DocIssueHandler` reads `state.currentProject` (not an unused `projectData` reference).

#### PDF — branding and blocks

- Rasterising the HTML header (`foreignObject` → canvas → `toDataURL`) caused `SecurityError: Tainted canvases may not be exported`. Export now uses `RenderBrandingNative` (jsPDF only): logo via `fetch` + blob → data URL, plus drawn text, rects, and lines. Layout parity is intentional, not a DOM screenshot.
- Document Control in the PDF matches the on-screen grid (column widths, row heights, vertical dividers, padding).
- Warnings use `ValeSpec__PdfExporter__RenderWarningsTable` (rounded panel, red text on light red, row dividers), not a solid red header bar.

#### PDF — pagination and spacing

- A4 (`210 × 297 mm`), footer reserve, page label `Page 01 of NN` bottom-right.
- If a table fits on one page but not in the space left on the current page, the whole table moves to the next page. Very tall tables may still break across pages with repeated headers.
- `ensureSpace` can print centred grey “Continued on next page...” when a break leaves a large blank tail (~20 mm+).
- Section 03 pre-measures each assembly (title, diagram, full spec table) and combines with the section heading where possible to reduce orphan headings.
- Section gap: `SECTION_BOTTOM_GAP_MM` doubled in the exporter; preview sections use doubled top margin (`--Vale_Spacing_XLarge`).

#### Section order (preview + PDF)

1. Ironmongery Schedule Summary & Totals  
2. Warnings Section  
3. Full Ironmongery Schedule Per Assembly  
4. Special Job Notes Section  

Config: `Na__DocPreview__Config.json`; fallbacks in `DocumentState`; render order in `PageRenderer` and the exporter.

#### Summary table

- `ValeSpec__DocumentModel__BuildAssemblyHardwareRecords` aggregates handles, locking hardware, euro cylinders, hinges (with projection where relevant), cabin hooks, and cabin hook eyes.
- `BuildSummaryRows` collation no longer uses a Detail key. The Detail column was removed from preview and PDF.

#### Colour, fonts, metadata, cleanup

- `ValeSpec__PdfExporter__CssRgbToTriplet` composites `rgba()` over white for soft tints.
- Open Sans Regular / SemiBold TTF via `ValeSpec__PdfExporter__LoadAndRegisterFonts`, with Helvetica fallback.
- `ValeSpec__DocPreview__PdfMetadataResolver__.js` fills jsPDF document properties from `StateManager.currentProject`. Script order in `ValeSpec__App__.html`: DocIssueHandler → PdfMetadataResolver → PdfExporter.
- Removed unused measurement / legacy warning-box helpers in the exporter.
- jsPDF: bundled `jspdf.umd.js` under `02__Src__AppModules/41__SystemHelper__PdfExportLibrary__VersionLocked/` (local copy; not loaded from a CDN).

#### Project metadata (seed + migration)

- `ValeSpec__AppData__ProjectFileManager__.js` — new projects seed `DateIssued` and `Author` (empty) under `ValeSpec__ProjectFile__Metadata`.
- `ValeSpec__AppUtils__ProjectSchemaValidator__.js` — older projects get missing fields normalised to `''`.

#### On-screen preview and CSS

- `ValeSpec__DocPreview__PageRenderer__.js` — Document Control with Issued; sections and summary without Detail.
- `ValeSpec__DocPreview__Styles__Main__.css` — header stack, doc-control chrome, badges, print rules, section spacing.

#### Local server

- `ValeSpec__FlaskServer__Localhost__.py` — `Na__Server__TryHandleSharedAssetRead` sends `Access-Control-Allow-Origin: *` for shared assets so logo `fetch` is not blocked by opaque CORS.

#### Result

Preview and PDF stay aligned on document control and section flow. PDFs avoid canvas taint, match DC and warnings visually, carry more useful summary totals, use clearer spacing, and paginate tables more predictably, with continuation text when a break leaves a large gap.

#### Files touched

| Area | Path |
|------|------|
| PDF export | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__PdfExporter__.js` |
| Issued stamp | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__DocIssueHandler__.js` *(new)* |
| PDF metadata | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__PdfMetadataResolver__.js` *(new)* |
| Preview | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__PageRenderer__.js` |
| Model | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__DocumentModel__.js` |
| State | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__DocumentState__.js` |
| Config | `40__System__DocumentPreviewMode/Na__DocPreview__Config.json` |
| Styles | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__Styles__Main__.css` |
| App data | `02__AppData/ValeSpec__AppData__ProjectFileManager__.js` |
| Schema | `03__AppUtils/ValeSpec__AppUtils__ProjectSchemaValidator__.js` |
| jsPDF | `41__SystemHelper__PdfExportLibrary__VersionLocked/jspdf.umd.js` *(bundled)* |
| Bootstrap | `ValeSpec__App__.html` |
| Server | `ValeSpec__FlaskServer__Localhost__.py` |

#### Note (replaces older PDF description)

The older *Document Preview — PDF Export* entry below describes the original pageless export. **v0.1.5** is the reference for A4 pagination, footers, native branding, and summary/section layout.

# ---------------------------------------------------------
## ValeSpec v0.1.4 - 16-Apr-2026
### Document Preview — Floating tools and saved menu state

Document preview gets a ValeVision-style floating tools panel, per-user persistence for menu position and toggles, and optional “studio baseline” defaults in main app config for one designated user slug.

#### UI — floating tools

- Replaces the old preview toolbar with a right-side floating, draggable panel: nested sections for Diagram Layout, Document Sections, and Actions.
- Icons: copied `Icon__ToolsMenu__*__540p__.png` into `01__AppAssets__ValeSpec/UiIcons__MenuIcons__ToolsMenu/`.

#### Persistence model

- Static defaults JSON plus disk-backed JSON per user slug via the local server API.
- `ValeSpec__DocPreview__MenuDataHandler__.js` loads, sanitises, debounced-saves, and exposes overrides for `DocumentState` and `PageRenderer`.
- `ValeSpec__UserMenu__AppDefaults__Config` in `ValeSpec__AppConfig__Main__.json` holds application-wide defaults for the Doc Preview “studio baseline” (menu position, toggles).
- User slug `AdamW` dual-writes: each save updates `05__LocalUserData/ValeSpec__AppData__UserMenuConfig__AdamW__.json` and the matching block in the main app config. All other users write only their own file under `05__LocalUserData/`.

#### Client load order

1. Packaged defaults JSON  
2. Main app `AppDefaults` section (mapped onto `ValeSpec__UserMenu__ModeDocumentPreview__Config` keys)  
3. Per-user file from `GET /api/user-menu-config/{slug}` when present  

User file overrides app defaults; if there is no per-user file, app defaults apply.

#### Server (`ValeSpec__FlaskServer__Localhost__.py`)

- `GET` / `POST` `/api/user-menu-config/<userSlug>` — read/write `ValeSpec__AppData__UserMenuConfig__<slug>__.json` under `05__LocalUserData/`.
- On `POST` for `AdamW`, after writing the user file, sync `ValeSpec__UserMenu__AppDefaults__Config` in `02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json` from the saved Document Preview section (menu X/Y, section open states, diagram mode, schedule/summary/job-notes toggles, persist flags). Other users’ POSTs do not change main app config.

#### Client modules

- `ValeSpec__DocPreview__MenuDataHandler__.js` — merges defaults, main app config, and user API payload; debounced POST; dispatches `ValeSpec__UserMenuConfigLoaded` for re-hydration.
- `ValeSpec__DocPreview__DocumentState__.js` — applies persisted view overrides when enabled; pushes changes back through MenuDataHandler.
- `ValeSpec__DocPreview__PageRenderer__.js` — applies floating-menu position and section-open state; saves after drag and toggles; re-renders when user menu config finishes loading.
- `ValeSpec__App__.html` — MenuDataHandler before DocumentState and PageRenderer.

#### Defaults seed

- `ValeSpec__AppData__UserMenuConfig__Defaults__.json` — meta and placeholders for four app modes; Document Preview populated with initial toggles and persistence flags.

#### Result

Preview tools match ValeVision-style UX; positions and toggles survive per user; machines without a user file still get defaults from main app config; AdamW’s saves remain the checked-in team baseline without other users overwriting shared JSON.

#### Files touched

| Area | Path |
|------|------|
| Icons | `01__AppAssets__ValeSpec/UiIcons__MenuIcons__ToolsMenu/*` *(from ValeVision)* |
| Defaults | `02__Src__AppModules/02__AppData/ValeSpec__AppData__UserMenuConfig__Defaults__.json` |
| App config | `02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json` *(adds `ValeSpec__UserMenu__AppDefaults__Config`)* |
| Menu handler | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__MenuDataHandler__.js` |
| State | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__DocumentState__.js` |
| Preview | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__PageRenderer__.js` |
| Styles | `40__System__DocumentPreviewMode/ValeSpec__DocPreview__Styles__Main__.css` |
| Bootstrap | `ValeSpec__App__.html` |
| Server | `ValeSpec__FlaskServer__Localhost__.py` |
| Runtime data | `05__LocalUserData/ValeSpec__AppData__UserMenuConfig__<UserSlug>__.json` *(per user)* |

# ---------------------------------------------------------
## ValeSpec v0.1.3 - 16-Apr-2026
### Progressive Web App (Planner parity)

**Overview**
- ValeSpec is now installable as a PWA using the same baseline pattern as ValePlanner: Web App Manifest, service worker registration, and a minimal service worker lifecycle (no offline asset precache or `fetch` interception).
- PWA wiring lives in a dedicated feature folder; install icons are ValeSpec-specific PNGs derived from the shared Vale SVG.

**Manifest and install metadata (`02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest`)**
- `id` and `start_url`: `/ValeSpec__App__.html` (matches the documented local server entry URL).
- `scope`: `/`; `display`: `standalone`; `theme_color` / `background_color`: `#172b3a`; `launch_handler.client_mode`: `navigate-existing` (Planner-aligned).
- Icons: `192x192` and `512x512` PNG under `01__AppAssets__ValeSpec/` (paths relative to manifest file).

**Service worker registration (`Na__Feature__AppInstallability__ServiceWorkerRegistration__.js`)**
- Exposes `window.ValeSpec__Feature__AppInstallability.ValeSpec__AppInstallability__RegisterServiceWorkerAsync`.
- Registers only when `navigator.serviceWorker` exists and the page is a secure context or on `localhost` / `127.0.0.1` (same guard idea as ValePlanner).
- Script URL: `./Na__ServiceWorker__ValeSpec.js`; scope `./` (app root next to `ValeSpec__App__.html`).

**Service worker (`Na__ServiceWorker__ValeSpec.js`, app root)**
- `install`: `skipWaiting()` so updates can activate without waiting for all tabs to close.
- `activate`: delete any Cache Storage entries prefixed `na-valespec-cache-` (legacy cleanup hook), then `clients.claim()`.
- No `fetch` handler — installability without changing caching or API behaviour.

**Bootstrap wiring**
- `ValeSpec__App__.html` — `<link rel="manifest" …>`; favicon / `apple-touch-icon` point at the new PNGs; registration script loaded before `ValeSpec__AppCore__Init__.js`.
- `ValeSpec__AppCore__Init__.js` — calls `ValeSpec__AppInstallability__RegisterServiceWorkerAsync()` during startup (after connection monitor/banner init).

**Local server (`ValeSpec__FlaskServer__Localhost__.py`)**
- Request handler `extensions_map` includes `.webmanifest` → `application/manifest+json` so browsers receive the correct manifest MIME type (matches ValePlanner `server.py`).

**Icons**
- Source: `../assets__CommonApplicationAssets/AppIcons/Icon__MainValeIcon__.svg`.
- Outputs: `01__AppAssets__ValeSpec/Na__ValeSpecApp__Icon__192x192.png`, `Na__ValeSpecApp__Icon__512x512.png` (rasterised via `resvg-py` where Cairo is unavailable).

**Files added or touched (PWA)**
- `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest` *(new)*
- `02__Src__AppModules/62__Feature__AppInstallability/Na__Feature__AppInstallability__ServiceWorkerRegistration__.js` *(new)*
- `Na__ServiceWorker__ValeSpec.js` *(new)*
- `01__AppAssets__ValeSpec/Na__ValeSpecApp__Icon__192x192.png` *(new)*
- `01__AppAssets__ValeSpec/Na__ValeSpecApp__Icon__512x512.png` *(new)*
- `ValeSpec__App__.html`
- `02__Src__AppModules/01__AppCore/ValeSpec__AppCore__Init__.js`
- `ValeSpec__FlaskServer__Localhost__.py`

# ---------------------------------------------------------
## ValeSpec v0.1.2 - 16-Apr-2026
### Server — Conservative Heartbeat + Console Restart Flags + Log Housekeeping

**Overview**
- Brought ValeSpec server and connection monitor in line with ValePlanner's latest conservative server parity changes.
- Cleaned up server console output: health pings suppressed, timestamp format made human-readable.

**Connection Monitor (`ValeSpec__AppNotifications__ServerConnectionMonitor__.js`)**
- Replaced periodic `setInterval` heartbeat (every 6 seconds) with click-based health probing (20-second cooldown).
- Added `IsHealthCheckInFlight` guard to prevent overlapping health requests.
- Updated `ReportApiFailure` to suppress the `lost` state until the server has been confirmed stable at least once (matches ValePlanner early-return approach).
- Updated `InitializeMonitor` config to accept `clickHealthCooldownMs` (with backward-compatible `healthIntervalMs` fallback).

**Server (`ValeSpec__FlaskServer__Localhost__.py`)**
- `log_message` now suppresses all `api/system/health` requests from console output — health pings are infrastructure noise and do not belong in the request log.
- `log_message` timestamp changed from verbose UTC ISO format to readable local time: `16-Apr-2026 - 12:30`.
- Added `REGION | Console Flags - Runtime Restart Commands`:
  - `NA__SERVER__RESTART_FLAG_TOKENS` — accepted restart tokens (`--r`, `--R`, `--restart`, `--Restart`).
  - `Na__Server__ConsoleCommandReader` — daemon thread reads stdin and queues commands.
  - `Na__Server__TryHandleQueuedConsoleCommands` — drains queue and signals restart.
  - `Na__Server__RunHttpLoopWithConsoleCommands` — replaces `serve_forever()` with a restartable `handle_request()` loop.
- Updated `main()`:
  - Prints restart flags hint in startup banner (non-silent mode only).
  - Spawns command reader thread when running interactively (non-silent + isatty).
  - Server now runs in a restart loop; typing a restart flag in the console restarts the handler without killing the process.
  - `finally` block ensures the command reader stop event is always signalled on exit.

**Files Changed**
- `02__Src__AppModules/07__AppNotifications__UserAlerts/ValeSpec__AppNotifications__ServerConnectionMonitor__.js`
- `ValeSpec__FlaskServer__Localhost__.py`

# ---------------------------------------------------------
## ValeSpec v0.1.1 - 15-Apr-2026

### Assembly Editor — Progress persistence, save action UX, and naming-style correction
**Overview**
- Implemented per-assembly wizard progress persistence so step bubbles are no longer session-only/global state.
- Added two dedicated modules:
  - `ValeSpec__AssemblyEditor__ProgressState__Save__.js` — subscribes to StepManager state and persists progress into assembly data.
  - `ValeSpec__AssemblyEditor__ProgressState__Load__.js` — hydrates StepManager progress from assembly data on refresh/select.
- Extended `ValeSpec__AssemblyEditor__StepManager__.js` with explicit state APIs for reliable hydration/reset:
  - `ValeSpec__StepManager__GetStateSnapshot()`
  - `ValeSpec__StepManager__ApplyProgressState(progressState)`
  - `ValeSpec__StepManager__ResetProgressState()`
- Refactored `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` so **Save Assembly** is a fixed always-visible action below the step cards (removed old misc-step gating).
- Added schema normalisation in `ValeSpec__AppUtils__ProjectSchemaValidator__.js` for `Assembly__ProgressState__Config`, including legacy data migration support.
- Updated `ValeSpec__DocEditor__SectionManager__.js` so:
  - new assemblies start with clean progress state
  - duplicated assemblies reset progress state (do not inherit completion).
- Wired module load order in `ValeSpec__App__.html` and added fixed action bar styling in `ValeSpec__AssemblyEditor__Styles__Main__.css`.

**Reflection / Follow-up**
- Initial implementation used short inner completed-step keys (`doorType`, `dimensions`, etc.) inside progress data.
- User feedback flagged this as non-conformant with ValeSpec key style.
- Corrected by migrating persisted completed-step keys to full styled names:
  - `Assembly__ProgressState__Config__CompletedSteps__DoorType`
  - `Assembly__ProgressState__Config__CompletedSteps__Dimensions`
  - `Assembly__ProgressState__Config__CompletedSteps__Finish`
  - `Assembly__ProgressState__Config__CompletedSteps__Handles`
  - `Assembly__ProgressState__Config__CompletedSteps__Hinges`
  - `Assembly__ProgressState__Config__CompletedSteps__Hooks`
  - `Assembly__ProgressState__Config__CompletedSteps__Misc`
- Save/load + schema validator now support both formats for backward compatibility and auto-normalise legacy keys forward.

**Result**
- Assembly step progress is now reliable, per-assembly, and persisted to project data.
- Save action is always available in editor flow, reducing friction when revisiting existing assemblies.
- Persisted progress keys now match project naming conventions.

### Document Preview — Style consolidation and single sources of truth
**Overview**
- Eliminated duplicated hex colour literals spread across DocPreview CSS, Variables.css, and the PDF exporter by wiring everything back to authoritative single sources.
- **`ValeSpec__CoreUi__Styles__Variables__.css`** — Added one missing token: `--Vale_PrimaryBrand_Dark: #0f1e28` for button hover/pressed states.
- **`ValeSpec__DocPreview__Styles__Main__.css`** — Replaced 9 hard-coded hex literals in screen rules with `var()` references to existing tokens (`--ValeSpec_PreviewBackground`, `--ValeSpec_PreviewPaperShadow`, `--Vale_PrimaryBrand`, `--Vale_TextLight`, `--Vale_BackgroundLight`, `--Vale_PrimaryBrand_Dark`). The `@media print` block retains its literals intentionally — `print-color-adjust: exact` requires literal values for reliable cross-browser print colour forcing.
- **`ValeSpec__DocPreview__PdfExporter__.js`** — Added `hexToRgb()` helper and `ValeSpec__PdfExporter__ResolveColours()` function (Config Resolution region) that reads `DocPreview__SpecTable__Config` from the already-loaded app state (same access pattern as `ResolveConfig()`). The 5 brand/table `const` colour declarations (`COLOUR_BRAND_PRIMARY`, `COLOUR_TABLE_HEADER_BG`, `COLOUR_TABLE_HEADER_FG`, `COLOUR_TABLE_ALT_ROW`, `COLOUR_RULE_LINE`) changed to `var` so they can be overwritten at runtime. Export function calls `ResolveColours()` immediately after `ResolveConfig()` and reassigns these variables before any rendering begins. Fallback constants remain as a safety net when config is absent.
- **`Na__DocPreview__Config.json`** — No changes. Already held the correct colour values (`DocPreview__SpecTable__Config__HeaderBackground`, `HeaderTextColor`, `AltRowBackground`); it was just not being consumed. Now actively drives PDF rendering.

**Result**
- To change a brand colour: update `Variables.css` (screen) + `Na__DocPreview__Config.json` (PDF) — 2 explicit files, 0 hunting for stray literals. Previously the same values appeared in 3–4 locations. The CSS/jsPDF duality is unavoidable (CSS vars cannot feed into jsPDF), but it is now explicit and documented rather than silent divergence.


### Hardware schedule spec table — granular rows and single source of truth
**Overview**
- **`ValeSpec__DocPreview__SpecTableRenderer__.js`** — Replaced one-line compound cells with **atomic rows**: locking type vs locking points, cylinder, hinges (per leaf / projection / hand), handles (type vs height), cabin hooks (type / hook count / eye count), then miscellaneous (+ optional **Miscellaneous Notes** when `OtherText` is set).
- **`ValeSpec__SpecTableRenderer__GetSpecRows(assembly)`** — New ordered row list drives both HTML and PDF so **Document Editor summary**, **Document Preview**, and **PDF export** stay aligned without duplicated string-building logic.
- **`ValeSpec__DocPreview__PdfExporter__.js`** — `ExtractSpecRows` now consumes `GetSpecRows` from the spec table renderer (fallback row skeleton only if the helper is missing).
- **Row order (user-facing):** Door Type → Dimensions → **Handle Type / Handle Height** → locking + cylinder → hinge rows → cabin hook rows → Miscellaneous.
- **File structure:** Region comment blocks added inside the spec table renderer (utilities, extractors by domain, row schema/render, public API) for easier navigation and folding.

**Result**
- Specification tables read as separate labelled facts instead of dense comma-separated detail strings; PDF and on-screen tables match labels and order by construction.


### Data-driven assembly warnings (config, editor, preview, PDF)
**Overview**
- **`Na__AssemblyEditor__Config.json`** — Added **`AssemblyEditor__WarningRules__Config`**: rules array (`RuleId`, `ObjectType`, `Condition`, `ThresholdMm` / `ThresholdValue`, `EditorNotification`, `DocumentWarning`) plus global settings in the same block: **`CentredNotificationDurationMs`**, **`HingeProjection8ModalMessage`**, **`HeightMismatchModalMessage`**. Removed the separate **`AssemblyEditor__Warnings__Config`** object so warning copy and timing live in one place.
- **`ValeSpec__AssemblyEditor__WarningSystem__.js`** — Evaluation engine (`EvaluateWarnings`, `ApplyWarningsToAssembly`), centred overlay notification, inline warning sections in step cards; persists **`Assembly__Warnings__Config__ActiveWarnings`** on the assembly.
- **`ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js`** — Calls `ApplyWarningsToAssembly` after dimension updates; **`await ValeSpec__WarningSystem__EnsureConfig()`** during init so rules are loaded before any synchronous evaluation.
- **`ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles__.js`** — Re-evaluates warnings after hinge projection updates (e.g. 8-inch rule).
- **`ValeSpec__AssemblyEditor__Styles__Main__.css`** — **`WarningSection`** (inline card) and **`CentredNotification`** (full-screen overlay).
- **`ValeSpec__DocPreview__PageRenderer__.js`** + **`ValeSpec__DocPreview__Styles__Main__.css`** — Warning callouts after each assembly spec table in preview (with print colour-adjust helpers where needed).
- **`ValeSpec__DocPreview__PdfExporter__.js`** — Warning boxes after spec tables; height included in the measurement pass.
- **`ValeSpec__AppUtils__ProjectSchemaValidator__.js`** — Ensures **`Assembly__Warnings__Config`** and **`ActiveWarnings`** array exist on normalised assemblies.

**Result**
- Threshold-based warnings are data-driven from JSON; active warnings flow to saved project data, on-screen preview, and exported PDF.


### Warning system reliability fixes (same release)
**Overview**
- **Rules not applied at runtime:** `EnsureConfig()` was only used by hinge/height **modal** helpers, so the rules array stayed empty during dimension commits. **Fix:** preload **`ValeSpec__WarningSystem__EnsureConfig()`** inside **`DoorTypeAndDimensions__Init`** (async init path already awaited by layout).
- **Exact threshold (e.g. 1050 mm):** `WidthOver` / `HeightOver` used strict **`>`**, so width **equal** to the limit never fired. **Fix:** **`>=`** / **`<=`** for Over/Under conditions so the configured mm value is inclusive.

**Result**
- Single-door width at the configured limit (e.g. 1050 mm) correctly triggers warnings, centred notification, and inline sections after the fix.


# ---------------------------------------------------------
## ValeSpec v0.1.0 - 15-Apr-2026

### Project schema validation + canonical load/save alignment
**Overview**
- Added **`ValeSpec__AppUtils__ProjectSchemaValidator__.js`** as the schema compatibility utility for project data:
  - normalises project metadata/global settings defaults
  - normalises assembly blocks (door type, opening direction, handing, fixed panel, dimensions, lever config)
  - migrates legacy data shape variants to canonical keys/values expected by current UI modules.
- Wired normalisation into **all ProjectFileManager IO paths** in `ValeSpec__AppData__ProjectFileManager__.js`:
  - `CreateProject`
  - `LoadProject` (with cache repair writeback when mutations occur)
  - `SaveProject`
  - `SyncFromServer` cache hydration.
- Verified local project data alignment (including `ValeSpec__ProjectFile__2601__.json`) against canonical schema expectations.

**Result**
- Existing and legacy project files now enter the app in a stable, consistent shape, reducing UI fallback/reset behaviour caused by schema drift.


### Assembly Editor hydration race fix (edit existing assembly)
**Overview**
- Fixed async initialisation ordering so assembly refresh waits for form controls/config to finish building:
  - `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` now awaits step/sub-module init
  - `ValeSpec__AssemblyEditor__Layout__.js` now awaits sub-module initialisation before first render/refresh cycle.
- This prevents early `RefreshFromAssembly(...)` calls from running before Door Type options are present in the DOM.

**Result**
- Editing an existing assembly now reliably rehydrates Door Type and related controls without forcing users to reselect values to restore preview.


### Header documentation hardening for schema dependency
**Overview**
- Added explicit “IMPORTANT” header notes in relevant scripts to point to schema-normalisation ownership and dependency:
  - `ValeSpec__AppUtils__ProjectSchemaValidator__.js`
  - `ValeSpec__AppData__ProjectFileManager__.js`
  - `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js`
  - `ValeSpec__DocEditor__SectionManager__.js`

**Result**
- Future maintenance has clearer guidance on where schema compatibility is enforced and which modules depend on canonicalised project data.


# ---------------------------------------------------------
## ValeSpec v0.0.9 - 15-Apr-2026

### App-wide browser autofill suppression
**Overview**
- Added **`ValeSpec__AppUtils__AutofillGuard__.js`** — sets `autocomplete="off"` (and `autocapitalize` / `autocorrect` on relevant text-like controls) on all `input`, `textarea`, and `select` elements; runs an initial pass on `document.documentElement` and uses a **`MutationObserver`** so dynamically injected UI (e.g. New Project modal, Assembly Editor, Document Editor) is covered without repeating attributes in every module.
- **Shell:** `ValeSpec__App__.html` — script load immediately after `ValeSpec__AppUtils__DateFormatter__.js`; the guard self-invokes `Install()` at parse time so it runs before downstream scripts.
- **Cad dev viewer:** `65__Dev__CadObjectBuilder/ValeSpec__CadObjectViewer__.html` — same script included via relative path for consistent behaviour.

**Result**
- Chromium / Edge “Saved info” and similar autofill dropdowns are suppressed across the ValeSpec SPA; behaviour is centralised for future fields.


### SVG Assembly Preview — Dimension witness lines and height/width geometry

**Overview**
- **`ValeSpec__SvgDrawing__DimensionRenderer__.js`** — Red dimension annotations now include **perpendicular witness (extension) lines** from the frame toward the dimension line, with **separate calculations for width vs height** so they do not share one inset model incorrectly.
- **Width (below frame):** Vertical witnesses from bottom jambs (`ExtensionInsetFromCornerMm` gap along the sill), horizontal dimension line, ticks at outer corners, optional continuation **past** the horizontal dimension line (`ExtensionPastDimensionLineMm`).
- **Height (left of frame):** Main vertical line spans full assembly **`height_mm`** (frame top `svgTopY` to bottom `svgBotY`); ticks at those endpoints; horizontal witnesses use their **own X-axis endpoints** — start at **negative X** (`-ExtensionInsetFromCornerMm`) for the same small clearance gap as the bottom dimension, end at `dimX - ExtensionPastDimensionLineMm` past the vertical dimension line; **Y** aligns with true frame top/bottom (no vertical shrink of the measured graphic vs label).
- **`ValeSpec__DimensionRenderer__ParseMm`** — Parses dimension config lengths as numbers to avoid string/number concatenation bugs in witness coordinates.
- **Region blocks** — File structured into collapsible regions: module state, shared helpers, width rendering, height rendering, public entry point.
- **`Na__SvgDrawing__Config.json`** — `SvgDrawing__Dimension__Config` documents **`ExtensionPastDimensionLineMm`** and **`ExtensionInsetFromCornerMm`** alongside line colour, tick size, and offset from frame.

**Result**
- Assembly Editor SVG dimensions match the frame size in both label and line geometry; left-side height dimension spacing and end-line behaviour are consistent with the lower width dimension; config and code stay aligned for future tuning.


### Remove per-assembly door Quantity (duplicate assemblies preferred)
- Removed Step 2 quantity input and `Assembly__DoorType__Config__Quantity` from project data; wizard step relabelled to **Dimensions** (`ValeSpec__AssemblyEditor__StepManager__.js`, `Na__AssemblyEditor__Config.json`).
- New assemblies omit the field (`ValeSpec__DocEditor__SectionManager__.js`); `RefreshFromAssembly` drops the legacy key when loading older JSON (`ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js`).


### Assembly Editor — Handle step order, naming, and handle dropdown placeholder
**Overview**
- **Step order:** **Handle Specification** is now step **4** (immediately after **Ironmongery Finish**); **Hinge Projection** is step **5**; later steps renumbered (`ValeSpec__AssemblyEditor__StepManager__.js`, `Na__AssemblyEditor__Config.json`, `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js`). Save-button gating list updated to `…, finish, handles, hinges, hooks`.
- **Lever → Handle (UI + code):** Progress labels and form copy use **Handle** / **Handle Specification** / **Handles**; step id `levers` replaced with **`handles`**. Module renamed to **`ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles__.js`** (replaces `HingesAndLevers__`); public API `ValeSpec__HingesAndHandles__Init` / `RefreshFromAssembly`. **`ValeSpec__AppCore__StateManager__.js`** — `globalHandleType`, `SetGlobalHandleType`, event **`globalHandleTypeChanged`**; autosave listener in **`ValeSpec__AppCore__Init__.js`** updated. On-disk project JSON **unchanged** (`Assembly__Lever__Config`, `ValeSpec__ProjectFile__GlobalSettings__LeverType`) for backward compatibility.
- **Handle type `<select>`:** First option is a visible disabled placeholder **`Please select field`** (no `hidden` on the option) so new assemblies show an explicit prompt before a product is chosen; change handler ignores empty value until a real option is selected.
- **Preview spec table:** Row label **Handle Type & Qty**; helper renamed to `ValeSpec__SpecTableRenderer__GetHandleDesc` (`ValeSpec__DocPreview__SpecTableRenderer__.js`).

**Result**
- Wizard order matches the intended ironmongery flow (finish → handle type/height → hinge projection); terminology is consistent with “handle” in the UI while existing project files keep loading without migration.


### Assembly Editor — Next button below step content (Ironmongery Finish)
**Overview**
- **Cause:** `StepManager` appends the shared **Next »** footer to each step body first; modules that **`appendChild`** to the step body were inserting fields *after* the footer, so **Next** appeared above the controls (notably **Ironmongery Finish**).
- **Fix:** **`ValeSpec__AssemblyEditor__GlobalSettings__.js`** — insert the finish form group with **`insertBefore(group, footerEl)`** (same pattern as other configurators). **`ValeSpec__AssemblyEditor__Styles__Main__.css`** — footer row uses **`width: 100%`** and **`box-sizing: border-box`** so the Next row spans the card and stays right-aligned.

**Result**
- **Next »** sits below the step fields at the bottom-right of each expanded section; Finish step matches the rest of the wizard.



# ---------------------------------------------------------
## ValeSpec v0.0.8 - 15-Apr-2026

### Codebase Housekeeping — Import JSON Removal and Region Block Rollout

**Overview**
- Removed the redundant **Import JSON** feature from the Projects page. All project data is authoratively loaded via the Flask server (`SyncFromServer` on tab entry), making the local file-picker path obsolete — imported projects were never written back to the server, leaving them orphaned from the disk store.
- Applied **region comment blocks** across six JS files to improve collapsibility and readability in the IDE.

**Import JSON — Removed**
- `ValeSpec__DocManagement__ProjectActions__.js` — removed `ValeSpec__ProjectActions__OnImportClick` function (hidden file input handler), the `Import JSON` button HTML from `Render`, and the `importBtn` event binding. Description block updated.
- `ValeSpec__AppData__ProjectFileManager__.js` — removed `ValeSpec__ProjectFileManager__ImportProjectFromJson` function (FileReader + JSON.parse pipeline) and its public API export entry. Description block updated to "export only".
- `ValeSpec__DocManagement__ProjectList__.js` — empty-state message updated: "Create a new project to get started." (removed import reference).
- `ValeSpec__DocManagement__Styles__Main__.css` — removed `.ValeSpec__DocManagement__BtnSecondary` and `:hover` rules (exclusively used by the now-deleted Import JSON button; modal Cancel buttons use the separate `ValeSpec__Modal__BtnSecondary` class and are unaffected).

**Region Blocks Added**
- `ValeSpec__DocManagement__ProjectActions__.js` — 4 sub-regions: Modal Dialog Helpers / New Project Flow / Project Row Actions / Render and Initialisation.
- `ValeSpec__SvgDrawing__RenderPipeline__.js` — 4 sub-regions: Config Loading and Sub-Renderer Initialisation / Assembly Data Extraction Helpers / Viewport and ViewBox Calculation / SVG Render Functions.
- `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` — 6 sub-regions: Config Loading and Basic State Utilities / Dimension Constraint and Profile Helpers / Dimension Input Event Handling and Debounce / Door Condition and Door Type Option Resolution / Assembly State Change Handlers / UI State Helpers / DOM Building Steps 1 and 2 / Summary Callbacks, Refresh and Initialisation.
- `ValeSpec__AppData__ProjectFileManager__.js` — 4 sub-regions: Manifest Read and Write Helpers / Server API Communication / Project CRUD Operations / Server Sync and JSON Export.

**Result**
- Import JSON feature is fully excised with no orphaned references; codebase is cleaner with zero dead-path code in the project management flow. Key long-form JS files are now collapsible by logical grouping, making navigation faster in the IDE.

# ---------------------------------------------------------
## ValeSpec v0.0.7 - 15-Apr-2026

### Document Preview — PDF Export (jsPDF, ValeVision3D Parity)

**Overview**
- Added full **Export PDF** from Document Preview: users download a final specification PDF aligned with on-screen preview content.
- **Library:** Vendored **jsPDF v4.1.0** UMD build (`jspdf.umd.js`) copied from ValeVision3D into `02__Src__AppModules/41__SystemHelper__PdfExportLibrary__VersionLocked/` — version-locked, CDN independent, loaded via `<script>` before preview modules; accessed as `window.jspdf.jsPDF`.
- **Exporter (as of this version):** `ValeSpec__DocPreview__PdfExporter__.js` — async pipeline: resolves `DocPreview__PdfExport__Config` from app config (with fallbacks: 300 DPI, JPEG 0.92, 210 mm width, 15 mm padding, FlateEncode compression); single **pageless** PDF page (`format: [210, totalHeightMm]`); assembly SVGs rasterised to **JPEG at 300 DPI** via offscreen canvas; branding, assembly titles, eight-row spec tables, and job notes rendered as **selectable vector text** (`doc.text()`); logo embedded from same path as preview; filename `ValeSpec__{ProjectName}__.pdf` (sanitised). **Superseded:** see **ValeSpec v0.1.5** for A4 multi-page export, footers, metadata, and Date Issued stamping.
- **Config:** `Na__DocPreview__Config.json` — new `DocPreview__PdfExport__Config` section (`TargetDpi`, `JpegQuality`, `PageWidthMm`, `PagePaddingMm`, `Compress`, `FloatPrecision`).
- **UI:** `ValeSpec__DocPreview__PageRenderer__.js` — enabled **Export PDF** button (`#ValeSpec__DocPreview__BtnExport`), click calls `ValeSpec__PdfExporter__Export()`; loading state disables button and shows “Generating PDF…”.
- **Styles:** `ValeSpec__DocPreview__Styles__Main__.css` — export button styled as primary (matches Back); `:disabled` state for generation feedback.
- **Shell:** `ValeSpec__App__.html` — script order: `jspdf.umd.js` → SpecTableRenderer → PageRenderer → PdfExporter.

**Result**
- Final PDF matches preview structure (branding, per-assembly drawing + spec table, job notes); drawings are high-res raster; body text remains selectable in PDF viewers.

### Document Preview — Preview vs PDF Width Alignment

**Overview**
- **Diagnosis:** Content width was already aligned (794 px paper with 56 px inner padding ≈ 180 mm content; PDF 210 mm page with 15 mm margins = 180 mm). The app felt narrower because **two** nested wrappers both used `var(--Vale_Spacing_Large)` on the mode panel and `#ValeSpec__DocPreview__Container`, stacking ~43 px extra grey gutter before the paper.
- **Fix:** `ValeSpec__DocPreview__Styles__Main__.css` — `#ValeSpec__App__ModeDocPreview { padding: 0; }` so only the preview container supplies outer spacing; removes redundant double margin without changing paper or PDF math.
- **PDF:** No change required — no double margins in the export pipeline.

**Result**
- Preview mode uses horizontal space more like a PDF viewer; paper no longer sits inside an accidental double frame.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.6 - 15-Apr-2026

### App Notifications — Server Connection Monitor + Banner (ValePlanner Parity)

**Overview**
- Ported the ValePlanner pattern (health polling + subscriber state machine + fixed top-centre banner) into ValeSpec under `02__Src__AppModules/07__AppNotifications__UserAlerts/`:
  - `ValeSpec__AppNotifications__ServerConnectionMonitor__.js` — polls `api/system/health`, `online`/`offline` hooks, `ReportApiSuccess` / `ReportApiFailure` for other modules to reuse.
  - `ValeSpec__AppNotifications__ServerConnectionBanner__.js` — injects `#vsServerStatusBanner`, red “connection lost” / green “restored” (auto-hide after 5s on reconnect).
  - `ValeSpec__AppNotifications__Styles__ServerConnectionBanner__.css` — banner presentation.
- Wired into the app: `@import` in `03__Style__AppStylesheets/ValeSpec__CoreUi__Styles__Index__.css`, script tags in `ValeSpec__App__.html` (monitor before banner, before `Init`), and early boot in `ValeSpec__AppCore__Init__.js`.
- **Z-index fix:** banner was painting under the fixed app header (`--Vale_ZIndex_Header` 1000); raised banner stacking to **1100** so it appears above header/nav but below modals/toasts.
- **Startup-offline behaviour:** original monitor gated “lost” on `hasEverBeenStable`, so no banner if Flask was already down on first load; adjusted failure handling so the first transition from `unknown` can surface `lost` while keeping reconnect and green restored flow intact.
- Local dev: localhost guard includes ValeSpec port **8002**; health endpoint remains `GET /api/system/health` on `ValeSpec__FlaskServer__Localhost__.py`.

**Result**
- Users see a clear server-disconnection overlay during localhost dev when Flask stops or is unreachable, including cold-start with server down, with recovery feedback when the server returns.

### Server Save Trace Logging + Localhost Launcher Visibility Improvements

**Overview**
- Upgraded server save logging in `ValeSpec__FlaskServer__Localhost__.py` so each `POST /api/projects/{code}` now emits:
  - save summary (`code`, `source`, `payloadBytes`, `changedKeys`)
  - per-key JSON path changes with `added/updated/removed` + old/new values
- Added request context propagation from frontend save calls by sending `X-ValeSpec-UpdateSource` in `ValeSpec__AppData__ProjectFileManager__.js`, with explicit autosave/manual source labels wired from `ValeSpec__AppCore__Init__.js`.
- Updated CORS preflight allow-headers to include `X-ValeSpec-UpdateSource` so browser requests remain clean and predictable.
- Refined localhost launch workflow:
  - `Start__ValeSpec__Localhost__8002__.ps1` now supports interactive port-busy actions (Restart/Open/Exit), keeps output visible, and pauses before close for log review.
  - `Start__ValeSpec__Localhost__8002__.bat` now wraps/delegates to the PowerShell launcher to keep behavior consistent.
- Result: project save diagnostics are now key/value-specific and launcher behavior now supports reliable, visible server-call debugging in a persistent console.

### Door Type UI Refactor — Opening Direction Toggle + Dropdown Placeholder Fix

**Overview**
- Replaced the single combined Door Type dropdown (which merged opening direction into entries like "Outward Opening Double Doors") with two separate controls in Step 1:
  - **Opening Direction toggle** — a radio-backed styled button pair ("Outward Opening" / "Inward Opening"), Outward selected by default.
  - **Door Type dropdown** — short-form list: Double Doors, Bifold Doors (greyed out / Coming Soon), Single Door, Window Panel (greyed out / Coming Soon).
- Added `Assembly__DoorType__Config__OpeningDirection` as a new first-class field in the project data model, stored alongside `Assembly__DoorType__Config__Type` (which now holds the short form, e.g. `"Double Doors"`).
- Updated `ValeSpec__AppConfig__Main__.json` with `DisabledDoorTypes`, `OpeningDirections`, and `DefaultOpeningDirection` config keys.
- Updated `Na__AssemblyEditor__Config.json` `DoorTypeProfileMap` keys to use the new short door type names (`"Double Doors"`, `"Single Door"`, etc.).
- Updated all downstream display consumers to compose the full label from direction + type:
  - `ValeSpec__DocPreview__PageRenderer__.js` — assembly title composition.
  - `ValeSpec__DocPreview__SpecTableRenderer__.js` — spec table door type cell.
  - `ValeSpec__DocEditor__SectionManager__.js` — default title builder and new assembly creation (now includes `OpeningDirection: 'Outward'`).
  - `ValeSpec__AssemblyEditor__SvgPreview__.js` — default aspect ratio profile lookup and `IsAssemblyConfigured` check.
  - `ValeSpec__SvgDrawing__RenderPipeline__.js` — `IsDoorTypeConfigured` check updated for empty-string handling.
- All `indexOf('Single')` / `indexOf('Double')` checks in `HingeCalculator`, `LockingCalculator`, `ResolveDoorCondition`, and `HingesAndLevers` handing visibility still match the new short names — no changes needed there.
- Added **"Please Select"** disabled/hidden placeholder `<option>` to every dropdown across the Assembly Editor wizard:
  - Door Type, Hinge Projection, Lever Type, Ironmongery Finish, Cabin Hook Size.
  - When `RefreshFromAssembly` sets a real value the placeholder is bypassed; on a fresh/unconfigured assembly the placeholder shows, clearly indicating the field needs user input.
- Added CSS styles in `ValeSpec__AssemblyEditor__Styles__Main__.css`:
  - `.ValeSpec__ToggleBtnGroup` / `.ValeSpec__ToggleBtn` for the opening direction toggle (hidden radio; active state uses muted light grey `#e2e6ea` with label colour text — see follow-up polish below).
  - Disabled `<option>` italic/grey styling for future door types.
- Updated sample project file `ValeSpec__ProjectFile__12645__.json` to use new schema.

**Result**
- Door opening direction is now a standalone data field ready for future hardware/position logic branching.
- Door type selection is cleaner with disabled future items visible but clearly unavailable.
- All dropdowns show "Please Select" when unconfigured, giving clear visual feedback on which steps remain incomplete.

### Assembly Editor & Document Editor — Follow-up UX (v0.0.6 polish)

**Overview**
- **Step 1 order:** In `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js`, **Door Type** dropdown is built and inserted **before** **Opening Direction** so users pick the door type first (matches workflow preference).
- **Wizard breathing room:** Active step card body in `ValeSpec__AssemblyEditor__Styles__Main__.css` uses `display: flex; flex-direction: column; gap: 16px` so form groups (dropdowns, toggles, sliders) are not stacked flush.
- **Opening direction toggle — less dominant:** `.ValeSpec__ToggleBtn--active` no longer uses primary blue fill; active segment uses light grey `#e2e6ea` and standard label colour so the control stays readable without competing with primary actions.
- **Miscellaneous — Other details:** `ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous__.js` — "Other" free text is a **`<textarea>`** (multi-line, `rows: 4`) instead of a single-line text input so spaces and paragraphs work as expected; form-group CSS extended for `textarea` (resize vertical, min-height, focus/disabled parity).
- **Document Editor — centre column width:** `#ValeSpec__DocEditor__Container` `max-width` increased from **794px** to **953px** (+20%) so the document column is less narrow on wide screens.
- **Document Editor — assembly card thumbnail vs table:** Thumbnail box adjusted to **280×200px** (wider than the original 200×200 for a larger drawing area **without** increasing height; avoids the overly tall 300×300 square). Scoped spec table typography in editor cards tightened slightly (`~0.68–0.72rem`, reduced cell padding) so the table stays compact beside the wider preview.

**Result**
- Assembly wizard reads top-to-bottom in a clearer order with calmer toggle styling and room between controls; long "Other" notes are usable; Document Editor uses horizontal space better with a balanced thumbnail/table row.

### Assembly Editor — Miscellaneous "Other Details": Newlines + Debounced Persistence (v0.0.6 follow-up)

**Overview**
- **Enter / multi-line:** `OtherText` was written with `.trim()` on every `input` and the field was refreshed from assembly on each `assemblyUpdated`, so a trailing newline was removed immediately and looked like Enter did nothing. Persistence now stores the **raw textarea value** (newlines preserved).
- **Debounced state commit:** `input` on the Other textarea schedules a commit after **2000 ms** idle (`OTHER_TEXT_COMMIT_DELAY_MS`); **blur** and `FlushToAssembly()` (e.g. **Save Assembly**) commit immediately. Pending timers are cleared when misc checkboxes change.
- **No fighting the caret:** `RefreshFromAssembly` skips overwriting the textarea while the field is focused or a delayed commit is pending, so external sync does not clobber in-progress typing.
- **Server autosave batching:** `ValeSpec__AppCore__Init__.js` debounces `ValeSpec__ProjectFileManager__SaveProject` triggers on `assemblyUpdated`, `globalFinishChanged`, and `globalLeverTypeChanged` by **2000 ms** (`VALESPEC__AUTOSAVE_DEBOUNCE_MS`), so localhost Flask `[PROJECT_SAVE]` / `[PROJECT_CHANGE]` logs and disk writes batch after typing pauses instead of on every keystroke.

**Files**
- `02__Src__AppModules/20__System__ProductAssembly__EditorMode/ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous__.js`
- `02__Src__AppModules/01__AppCore/ValeSpec__AppCore__Init__.js`

**Result**
- Multi-line "Other" notes behave like a normal textarea; project JSON and server saves align with a 2s idle window rather than per-keypress spam.

### Document Editor + Preview — Assembly Data & SVG Preview Alignment

**Context**
- Modes already re-render on `modeChanged` via `ValeSpec__AppCore__Init__.js` (`OnModeEntered`); the issue was not missing tab refresh, but **read paths** in Document Preview and **wrong JSON keys** vs what the Assembly Editor writes.

**Overview**
- Fixed `ValeSpec__DocPreview__SpecTableRenderer__.js` so all spec rows read the same schema as persisted assemblies (`Assembly__DoorType__Config`, `Assembly__Locking__Config`, `Assembly__Hinge__Config`, `Assembly__Lever__Config`, `Assembly__CabinHooks__Config`, `Assembly__Miscellaneous__Config`). Previously getters targeted non-existent keys (e.g. `Assembly__MultiPointRequirement`, `Assembly__HingeRequirement`), so Preview tables showed dashes despite valid project data.
- Fixed `ValeSpec__DocPreview__PageRenderer__.js` assembly titles: use `Assembly__Identity__Config__Title` and `Assembly__DoorType__Config__Type` (not `CustomTitle` / `DoorType`).
- Fixed Preview SVG thumbnails: pass `hardwareIndex` from `StateManager` into `ValeSpec__RenderPipeline__RenderThumbnail(...)` so lever/ironmongery vector lookup matches Document Editor thumbnails.
- Fixed `ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers__.js`: persist hinge projection under `Assembly__Hinge__Config__Assembly__Hinge__Config__Projection` instead of a stray top-level `HingeProjection` field.
- Result: Document Preview spec tables and drawing previews stay consistent with Assembly Editor output; hardware-accurate SVG previews show handles where the index provides vector data.

### Document Editor — Assembly Cards Use Preview Spec Table + Thumbnail Layout

**Overview**
- `ValeSpec__DocEditor__SectionManager__.js` now reuses `ValeSpec__DocPreview__SpecTableRenderer__RenderSpecTable(assembly)` for each configured assembly instead of a three-line text summary, so Document Editor shows the same eight-row hardware schedule as Preview (Door Type, Dimensions, Locking, Hinges, Lever, Cylinder, Cabin Hooks, Miscellaneous).
- Section block layout reworked: title full width, then a body row with SVG thumbnail beside the table (thumbnail sizing refined in follow-up polish — see **Assembly Editor & Document Editor — Follow-up UX**), action buttons below.
- `ValeSpec__DocEditor__Styles__Main__.css` — vertical card flex, `.ValeSpec__DocEditor__SectionBodyRow`, compact scoped overrides for `.ValeSpec__DocPreview__SpecTable` inside editor cards (table sizing further tuned in v0.0.6 polish).
- `ValeSpec__DocPreview__Styles__Main__.css` — `.ValeSpec__DocPreview__DrawingContainer` gains `max-height: 360px` and `overflow: hidden` so preview-page door drawings do not dominate vertical space.
- Result: specs are readable in Document Editor and aligned with Preview; thumbnails stay smaller; Preview drawings scale within a bounded height.

### SVG — Door Opening Symbols (Elevation Swings + Fixed Panel)

**Overview**
- New module `ValeSpec__SvgDrawing__OpeningSymbolRenderer__.js` draws opening-direction graphics per door panel after the panel layer and before the frame in `ValeSpec__SvgDrawing__RenderPipeline__.js` (`LayerOpening` / `ThumbLayerOpening`).
- `Na__SvgDrawing__Config.json` — `SvgDrawing__Opening__Config` for swing/fixed stroke colour, widths, and dash arrays.
- **Operable panels:** two dashed lines forming a triangle — both lines start at the **top and bottom corners of the handle side** and meet at the **midpoint of the hinge stile** (left panel: apex on left edge; right panel: apex on right edge). Rendered **per panel** so double doors get independent symbols.
- **Fixed panels:** when `Assembly__Opening__Config__FixedPanel` is `left` or `right`, that leaf draws a corner-to-corner **X** using the fixed-line settings; `none` keeps both leaves as swing triangles.
- Assembly data: `Assembly__Opening__Config__FixedPanel` persisted from Assembly Editor.
- `Na__AssemblyEditor__Config.json` — `AssemblyEditor__FixedPanel__Config` with dropdown labels/values.
- `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` — Fixed Panel `<select>` after door type (visible for double door types), change handler updates assembly and visibility; opening config cleared when door type is unconfigured.
- `ValeSpec__App__.html` — script load for `ValeSpec__SvgDrawing__OpeningSymbolRenderer__.js`.
- **Presentation:** fixed-panel X uses the **same** dash pattern and stroke width as swing lines (`FixedDashArray` / `FixedStrokeWidthMm` aligned with swing in config) so only geometry differs, not linetype.
- Result: elevations show standard swing triangles per opening leaf and an X only on fixed leaves, with consistent dashed styling across both symbol types.

### Door Configurator — Dimension Text Entry Commit Stabilization (v0.0.6 follow-up)

**Overview**
- Refactored `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` to split **typing state** from **committed state** for Width/Height numeric inputs:
  - Added delayed commit scheduling for typed integer input (`AssemblyEditor__Slider__Config__DimensionInputCommitDelayMs`, default `450` ms).
  - Added immediate commit paths on **Enter**, **blur**, and **change**.
  - Preserved slider responsiveness while typing, without forcing text-value replacement during active delayed commits.
- Clamping logic remains profile-driven via `AssemblyEditor__DoorPanelDefaults__Config` but is now applied through explicit commit flows:
  - In-range typed integers commit as entered.
  - Out-of-range values are clamped on explicit commit events.
  - Empty/invalid intermediate typing states no longer force immediate fallback defaults while the user is still editing.
- Added overwrite guards so `RefreshFromAssembly(...)` does not clobber active Width/Height typing when a field is focused or a delayed commit is pending.
- Normalised quantity persistence in `OnQuantityChange()`:
  - Canonical write target is `Assembly__DoorType__Config__Quantity`.
  - Legacy top-level `assembly['Quantity']` is removed to avoid split source-of-truth drift.
- Config update in `Na__AssemblyEditor__Config.json`:
  - Added `AssemblyEditor__Slider__Config__DimensionInputCommitDelayMs : 450`.

**Result**
- Width/Height entry behaves as a stable, typed-integer workflow with commit-aware clamping and reduced input fighting during edits, while preserving downstream assembly update, SVG preview refresh, and document data consistency.

### Document Management — Project list status sync + manifest robustness

**Context**
- The PROJECTS table reads workflow status from each manifest row’s `status` field. Document status lives in project JSON as `ValeSpec__ProjectFile__Metadata__DocumentStatus`. Previously, manifest create/update paths did not consistently store `status`, so the table re-rendered but still showed **Draft** (or stale values) after changing status in Document Editor.

**Overview**
- **`ValeSpec__AppData__ProjectFileManager__.js`**
  - Normalized manifest entry shape: `projectCode`, `projectName`, `documentName`, **`status`**, `dateCreated`, `dateModified` — built from metadata via shared helpers.
  - **`AddToManifest`** — accepts status and both dates; **`UpdateManifestEntry`** — full row refresh from metadata (including **`DocumentStatus`**), not only name/date.
  - **`CreateProject`** / **`ImportProjectFromJson`** — write manifest with correct initial/imported status and dates.
  - **`ListProjects()`** — hydrates each row from the cached project (`localStorage` key `ValeSpec__Project__{code}`) when manifest fields are missing or out of date; persists repaired manifest when differences are detected (self-heal for older sessions).
  - **`SyncFromServer`** — after each project file is fetched, manifest entries are rebuilt from loaded JSON metadata so server list + cache stay aligned with on-disk `DocumentStatus`.
- **`ValeSpec__AppCore__Init__.js`**
  - **`OnModeEntered('DocManagement')`** — runs document-management render: re-bind project actions, **`SyncFromServer`** (await), then **`ProjectList__Render`**, so switching back to PROJECTS pulls latest disk state before painting the table.

**Files**
- `02__Src__AppModules/02__AppData/ValeSpec__AppData__ProjectFileManager__.js`
- `02__Src__AppModules/01__AppCore/ValeSpec__AppCore__Init__.js`

**Result**
- Changing document status in Document Editor updates the PROJECTS tab Status column reliably; stale or legacy manifest rows are repaired automatically; returning to PROJECTS after edits reflects server-backed JSON without relying on a full page reload.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.5 - 15-Apr-2026
### Assembly Editor Workflow Refactor + Save Pipeline Hardening

**Overview**
- Added `Save Assembly` final-step gate behavior so button visibility is controlled by wizard progression through steps `1-6` before reaching `Misc`.
- Added `Misc -> Other` option with conditional text input and persisted `Assembly__Miscellaneous__Config__OtherText` support.
- Refactored coupled `HooksAndMisc` implementation into two separate modules:
  - `ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks__.js`
  - `ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous__.js`
- Rewired orchestrator/script loading so hooks and misc now initialise/refresh independently from `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` and `ValeSpec__App__.html`.
- Added config-driven hooks/misc schema in `Na__AssemblyEditor__Config.json` to reduce hardcoded values (options, defaults, min/max, Other/NA behavior).
- Hardened save flow to flush step controls before save and perform explicit project persistence from Save action (not only event-chain autosave).
- Updated `ValeSpec__ProjectFileManager__ServerWrite(...)` to return deterministic success/failure results and updated autosave lifecycle for global finish/lever changes.
- Result: Assembly Editor section behavior is more modular, data-driven, and save reliability to project JSON is improved.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.4 - 15-Apr-2026
### SVG Dimension Edit -> UI Panel Sync

**Overview**
- Fixed Assembly Editor sync gap where clicking SVG dimensions and entering values updated state/SVG but did not refresh right-side UI controls.
- Added `assemblyUpdated` observer routing in `ValeSpec__AssemblyEditor__Layout__.js` so assembly changes now propagate to Door Configurator UI refresh.
- Added non-destructive `ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate(...)` in `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js`.
- Preserved existing full refresh path for `assemblySelected` / mode-entry while avoiding `Next`-progress reset during frequent live updates.
- Result: SVG inline width/height edits now keep Quantity & Dimensions panel values and sliders in sync immediately.

### Assembly Preview Adaptive Sizing + Layout Cleanup

**Overview**
- Fixed Assembly Editor layout config key wiring so `Na__AssemblyEditor__Config.json` values now apply correctly in `ValeSpec__AssemblyEditor__Layout__.js` (with backward-safe fallback support).
- Reworked preview card sizing in `ValeSpec__AssemblyEditor__SvgPreview__.js` to be data-driven from rendered SVG `viewBox` ratio instead of fixed geometry.
- Added adaptive fit behavior using preview-panel available space + resize handling (`ResizeObserver` and `window` resize fallback), improving behavior for both wide and tall assemblies.
- Removed fixed card sizing constraints from `ValeSpec__AssemblyEditor__Styles__Main__.css` and kept the required panel-side margin behavior.
- Extended SVG viewport config in `Na__SvgDrawing__Config.json` to support per-side render padding (`Top/Right/Bottom/Left`) and updated `ValeSpec__SvgDrawing__RenderPipeline__.js` viewBox calculation to use asymmetric padding.
- Reduced effective top render-space padding by 25% via viewport config (while keeping other sides unchanged) so top whitespace now responds as expected.

### Door Panel Defaults + Condition Rules (Config Driven)

**Overview**
- Added `AssemblyEditor__DoorPanelDefaults__Config` in `Na__AssemblyEditor__Config.json` with explicit door-type profile mapping and per-profile min/max/default dimensions.
- Wired new assembly creation in `ValeSpec__DocEditor__SectionManager__.js` so new panels now use config-driven defaults (Double `1800 x 2100`, Single `900 x 2100`) instead of hard-coded values.
- Updated `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` to apply door-type defaults/min/max when changing door type, and to clamp entered values against profile limits.
- Updated dimension click-edit limits in `ValeSpec__AssemblyEditor__SvgPreview__.js` so inline SVG edits use the same configured min/max constraints (including 1600-3000 door height range).
- Added `AssemblyEditor__DoorConditionWarnings__Config` with rule thresholds/messages (3 hinges, tall-door 4 hinges, Double Top, Subject to Review) and wired condition state updates from dimension changes.
- Updated `ValeSpec__MathUtils__HingeCalculator__.js` thresholds to align with current rule intent (`949/1899` standard limits, `950+` wide condition, `2250` tall threshold), and aligned warning message key reading in `ValeSpec__AssemblyEditor__WarningSystem__.js`.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.3 - 15-Apr-2026
### Full Codebase Naming Convention Refactor — ValeSpec Three-Part Namespace

**Overview**
- Applied the `ValeSpec__<FeatureOrSystem>__<FunctionPurpose>` three-part naming convention across the entire codebase.
- All module-level functions, private helpers, and public API keys now follow this convention consistently.
- The underscore prefix pattern (`_functionName`) has been fully replaced — the namespace itself establishes scope.
- All cross-module method calls updated throughout to use the new public API keys.
- A dedicated `.cursor/rules` MDC file created for ValeSpec to enforce the naming convention going forward.

**Files Updated — AppCore**
- `ValeSpec__AppCore__ConfigLoader__.js` — all functions renamed to `ValeSpec__ConfigLoader__*`
- `ValeSpec__AppCore__ModeManager__.js` — all functions renamed to `ValeSpec__ModeManager__*`
- `ValeSpec__AppCore__StateManager__.js` — all functions renamed to `ValeSpec__StateManager__*`
- `ValeSpec__AppCore__Init__.js` — all functions renamed to `ValeSpec__AppCore__*`, all cross-module calls updated

**Files Updated — AppData**
- `ValeSpec__AppData__HardwareIndexLoader__.js` — all functions renamed to `ValeSpec__HardwareIndexLoader__*`
- `ValeSpec__AppData__ProjectFileManager__.js` — all functions renamed to `ValeSpec__ProjectFileManager__*`

**Files Updated — AppUtils & MathUtils**
- `ValeSpec__AppUtils__DateFormatter__.js` — all functions renamed to `ValeSpec__DateFormatter__*`
- `ValeSpec__MathUtils__HingeCalculator__.js` — renamed to `ValeSpec__HingeCalculator__CalculateHingesPerLeaf`
- `ValeSpec__MathUtils__LockingCalculator__.js` — renamed to `ValeSpec__LockingCalculator__CalculateLocking`

**Files Updated — SvgDrawing Render Pipeline**
- `ValeSpec__SvgDrawing__CoordHelpers__.js` — all functions renamed to `ValeSpec__CoordHelpers__*`
- `ValeSpec__SvgDrawing__DimensionRenderer__.js` — renamed to `ValeSpec__DimensionRenderer__*`
- `ValeSpec__SvgDrawing__DoorFrameRenderer__.js` — renamed to `ValeSpec__DoorFrameRenderer__*`
- `ValeSpec__SvgDrawing__DoorPanelRenderer__.js` — renamed to `ValeSpec__DoorPanelRenderer__*`
- `ValeSpec__SvgDrawing__IronmongeryRenderer__.js` — renamed to `ValeSpec__IronmongeryRenderer__*`
- `ValeSpec__SvgDrawing__RenderPipeline__.js` — renamed to `ValeSpec__RenderPipeline__*`, all sub-renderer calls updated

**Files Updated — Document Management Mode**
- `ValeSpec__DocManagement__ProjectList__.js` — renamed to `ValeSpec__ProjectList__*`
- `ValeSpec__DocManagement__ProjectActions__.js` — renamed to `ValeSpec__ProjectActions__*`

**Files Updated — Assembly Editor Mode**
- `ValeSpec__AssemblyEditor__GlobalSettings__.js` — renamed to `ValeSpec__GlobalSettings__*`
- `ValeSpec__AssemblyEditor__WarningSystem__.js` — renamed to `ValeSpec__WarningSystem__*`
- `ValeSpec__AssemblyEditor__StepManager__.js` — renamed to `ValeSpec__StepManager__*`
- `ValeSpec__AssemblyEditor__SvgPreview__.js` — renamed to `ValeSpec__SvgPreview__*`
- `ValeSpec__AssemblyEditor__Layout__.js` — renamed to `ValeSpec__Layout__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` — renamed to `ValeSpec__DoorConfigurator__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` — renamed to `ValeSpec__DoorTypeAndDimensions__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers__.js` — renamed to `ValeSpec__HingesAndLevers__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc__.js` — renamed to `ValeSpec__HooksAndMisc__*`

**Files Updated — Document Editor Mode**
- `ValeSpec__DocEditor__DocumentHeader__.js` — renamed to `ValeSpec__DocumentHeader__*`
- `ValeSpec__DocEditor__JobNotes__.js` — renamed to `ValeSpec__JobNotes__*`
- `ValeSpec__DocEditor__SectionManager__.js` — renamed to `ValeSpec__SectionManager__*`

**Files Updated — Document Preview Mode**
- `ValeSpec__DocPreview__PageRenderer__.js` — renamed to `ValeSpec__PageRenderer__*`
- `ValeSpec__DocPreview__SpecTableRenderer__.js` — renamed to `ValeSpec__SpecTableRenderer__*`

**Tooling Added**
- `.cursor/rules/01-NamingConvention-ValeSpec-Functions-And-Variables.mdc` — enforces the three-part convention for all future AI-assisted development on this project

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.2 - 15-Apr-2026
### First GitHub Push

**Overview**
- First pushed to GitHub 15-Apr-2026
- Still a extremely early stage project.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.1 - 15-Apr-2026
### Initial WireFrame Release

**Overview**
-Initial wireframe release of the ValeSpec project.
- Built basic hardware data index loader.
- Built supporting tooling such as the hardware data index loader and the hardware data viewer.
  - This is a CAD style viewer which is used to view the hardware data index.
- Built out the SketchUp Ruby Script to produce the Json files for the hardware data index.


# ---------------------------------------------------------
