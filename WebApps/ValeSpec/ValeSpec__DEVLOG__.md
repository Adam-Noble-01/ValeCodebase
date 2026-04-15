# ValeSpec Development Log
# =========================================================


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
- **Exporter:** `ValeSpec__DocPreview__PdfExporter__.js` — async pipeline: resolves `DocPreview__PdfExport__Config` from app config (with fallbacks: 300 DPI, JPEG 0.92, 210 mm width, 15 mm padding, FlateEncode compression); single **pageless** PDF page (`format: [210, totalHeightMm]`); assembly SVGs rasterised to **JPEG at 300 DPI** via offscreen canvas; branding, assembly titles, eight-row spec tables, and job notes rendered as **selectable vector text** (`doc.text()`); logo embedded from same path as preview; filename `ValeSpec__{ProjectName}__.pdf` (sanitised).
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
