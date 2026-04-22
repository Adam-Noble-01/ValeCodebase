# =============================================================================
# WHITECARDVISION |  DEVELOPMENT LOG
# =============================================================================
- Add latest changes to the top of the file.
- Older changes descend in chronological order.


# -----------------------------------------------------------------------------
## WhitecardVision - v0.3.2 - 22-Apr-2026 - Nav gating + Final Preview auto-init

### Summary
Two connected improvements to navigation state and the Final Preview mode.
First, all tabs except "Projects" are now disabled on app load and only light up
once a project is opened. Second, Final Preview now auto-initialises with the
newest available image the moment the tab is opened, so the preview card is
never blank when output already exists. The "Final Preview" nav tab additionally
stays dark until at least one image file is recorded in the project (render,
edit iteration output, or whitecard).

### Navigation gating (`ModeManager`)
- `Wv__ModeManager__UpdateNavState(projectTree)` added.
  - `ProjectManager` tab: always enabled.
  - `Render`, `Editor`, `FilterSuite`: disabled until `projectTree` is truthy.
  - `FinalPreview`: force-disabled when no project is loaded; state handed off
    to `FinalPreview__Controller` once a project is active (image-existence
    rule applies from that point).
- `Wv__ModeManager__InstallNavigationBar()` updated:
  - Subscribes to `activeProjectChanged` to keep nav live.
  - Calls `UpdateNavState(null)` on install to establish the initial locked
    state before any project is selected.
  - Click guard added: disabled tabs bail out in JS even if CSS
    `pointer-events` is somehow bypassed.

### Final Preview auto-init + nav state (`FinalPreview__Controller`)
- `Wv__FinalPreview__Controller__ExtractTimeToken(path)` - extracts the
  `YYYYMMDDTHHMMSSZ` timestamp embedded in every generated output filename.
- `Wv__FinalPreview__Controller__GetNewestImagePath(projectTree)` - scans
  `RenderGroup__LastOutputPath` and every `EditIteration__LastOutputPath`,
  sorts descending by timestamp, and returns the winner. Falls back to
  `Wv__Whitecard__ImagePath` if no generated outputs exist yet.
- `Wv__FinalPreview__Controller__UpdateNavState(projectTree)` - queries
  `GetNewestImagePath` and toggles `Wv__App__NavTab--Disabled` on the
  Final Preview tab. Wired to both `activeProjectChanged` and
  `activeProjectMutated` so it stays live as generations complete.
- `Wv__FinalPreview__Controller__OnActivated()` - ModeManager hook. Finds
  the newest image path, resolves which source type it belongs to
  (`Render` / `Edit` / `Whitecard`), and calls `DisplayImage` so the canvas
  is always pre-populated on entry.
- "Show Whitecard" button wired and `HandleDownloadWhitecard` implemented.
- `ResetFromState` now also resets `DownloadWhitecardBtn` disabled state.
- Public API updated to export `OnActivated` alongside `Init`.

### CSS
- `.Wv__App__NavTab--Disabled` added to `WhitecardVision__CoreUi__Styles__NavigationBar__.css`:
  `opacity: 0.35`, `pointer-events: none`, `cursor: not-allowed`.

### Files modified
- `02__Src__AppModules/01__AppCore/WhitecardVision__AppCore__ModeManager__.js`
- `02__Src__AppModules/50__System__FinalPreview/WhitecardVision__FinalPreview__Controller__.js`
- `03__Style__AppStylesheets/WhitecardVision__CoreUi__Styles__NavigationBar__.css`

# -----------------------------------------------------------------------------
## WhitecardVision - v0.3.1 - 22-Apr-2026 - New project prompt + clean slug

### Summary
Replaced the auto-created "Untitled + timestamp" project flow with a
`window.prompt` upfront dialog, clean slug generation, and immediate JSON
seeding so the project file is correctly named from the moment it is written.

### New project flow (`+ New Project`)
- Clicking `+ New Project` (or the Render mode "New" button) now opens a
  browser prompt pre-filled with the default display name from config.
- Cancelling the prompt or submitting an empty string aborts without creating
  anything; an empty-string attempt shows a warning toast.
- The entered name is sanitised into a clean filesystem slug by the new
  `BuildCleanSlug` helper: spaces and disallowed chars collapse to a single
  hyphen, leading/trailing separators are stripped, max 64 chars. Examples:
  `"Appleton"` → `Appleton`, `"My House 01"` → `My-House-01`.
- The folder and JSON file use only this clean slug — no timestamp suffix.
  `Appleton__WcVisData/` and `Appleton__WcVisData__.json`.

### JSON seeded with display name at creation
- `ProjectFileManager.CreateProject` now accepts an optional `displayName`
  argument and forwards it in the POST body.
- Flask `HandleProjectCreate` reads `displayName` from the body (falls back
  to the slug if absent) and passes it to `BuildDefaultProjectJson`.
- `BuildDefaultProjectJson` now seeds `Wv__ProjectFile__Metadata__ProjectName`
  with `display_name` rather than the raw slug, so the file is correct from
  the first write — no post-creation rename call needed.
- The `RenameActiveProject` call that previously patched the name after
  creation has been removed from the create flow.

### Naming / refactors
- `BuildTimestampSlug` replaced by `BuildCleanSlug` in `ProjectActions`.
- `CreateUntitledProject` renamed to `CreateProjectWithPrompt`; public API
  and all call sites updated (Controller, RenderMode ProjectMetaPanel).
- `TriggerInlineNewProject` renamed to `TriggerNewProject`; `QueueRenameFocus`
  call removed since no inline rename step is required.
- Module-level comment in `ProjectActions` updated to reflect that a single
  `window.prompt` is now used for the create action.

### Files changed
- `02__Src__AppModules/10__System__ProjectManagerMode/WhitecardVision__ProjectManager__ProjectActions__.js`
- `02__Src__AppModules/10__System__ProjectManagerMode/WhitecardVision__ProjectManager__Controller__.js`
- `02__Src__AppModules/20__System__RenderImageMode/WhitecardVision__RenderMode__ProjectMetaPanel__.js`
- `02__Src__AppModules/02__AppData/WhitecardVision__AppData__ProjectFileManager__.js`
- `05__FlaskServerScripts/WhitecardVision__FlaskServer__Main__.py`


# -----------------------------------------------------------------------------
## WhitecardVision - v0.3.0 - 22-Apr-2026 - UX overhaul + Project Manager

### Summary
Large UX/session pass covering four big themes: shared UI primitives, Google
API feedback plumbing, a proper Prompt Templates Panel, and a brand new
Project Manager tab that replaces the old `window.prompt` based load/new flow.
Also: a clean mode-folder renumbering (PM=10, Render=20, Edit=30, Filter=40,
Preview=50) and a compiled-prompt `.md` export for debugging.

### New shared module - `09__SharedSystems__CommonElements/`
- `WhitecardVision__SharedElements__ResolutionPicker__.js` - `[1K | 2K | 4K]`
  segmented control; mounted in both Render and Edit output panels.
  Aspect ratio still enforced separately by the Whitecard/base image. Defaults
  to `2K`.
- `WhitecardVision__SharedElements__LoadingSpinner__.js` - `ShowOver(host)`
  and `Hide(host)` helpers with a WeakMap so multiple panels can have
  independent overlays. CSS dual-ring spinner shared via the common sheet.
- `WhitecardVision__SharedElements__ApiLogger__.js` - `LogSent`,
  `LogReceived`, `LogError`, `LogInfo` with the `DD-Mon-YYYY HH:MM:SS`
  convention universally applied. `ProjectFileManager.Generate()` wires this
  around every Gemini round-trip.
- `WhitecardVision__SharedElements__TemplatesPanel__.js` - full rewrite of
  the old template menu. Collapsible 1/3-width panel (default open) with a
  hamburger toggle, native `<details>` folders (all closed by default), a
  search bar, and lazy client-side hydration for any missing front matter.
  Items now render as `PromptTitle` (bold) + `PromptSummary` (muted) instead
  of raw filenames. Hosted by both Render and Edit via CSS grid with a
  `:has(.Wv__TemplatesPanel--Collapsed)` rule that folds the column to a
  thin 44px rail and expands the main content to fill the freed space.
- `WhitecardVision__SharedElements__CompiledPromptExporter__.js` - builds the
  exact payload that would be sent to Gemini (project meta + image index +
  structured prompt text + `generationConfig`) and downloads it as
  `<ProjectName>__CompiledPrompt__.md`. "Download Compiled Prompt" button
  added to Render, Edit, and Final Preview.

### Prompt template front matter
- Every `.md` in `10__Local__PromptTemplates/` now carries a front matter
  block: `PromptTitle`, `PromptSummary`, `DateCreated`, `PromptFlags`.
- `PromptConstructor__LoadMarkdown__` grew `ParseFrontMatter` and
  `GetFrontMatter(relPath)` so the builder can skip the block while the UI
  can surface it for search and display.
- Flask `/api/templates/tree` now peeks at each `.md` and includes a small
  `frontMatter` dict on every file node, so the client usually doesn't need
  to fetch individual files just to fill the panel.

### Edit mode restructure
- "Edit Iterations" moved from a vertical sidebar to a top horizontal bar,
  mirroring the Render "Project Meta" pattern.
- The workbench became a 3-column grid (`2fr main | 1fr templates`) with the
  same collapse/expand behaviour as Render.

### Mode folder renumbering
- `10__System__RenderImageMode` -> `20__System__RenderImageMode`.
- `20__System__EditImageMode`   -> `30__System__EditImageMode`.
- `30__System__FilterSuite`     -> `40__System__FilterSuite`.
- `40__System__FinalPreview`    -> `50__System__FinalPreview`.
- `10__System__ProjectManagerMode` is the new PM home.
- Every script `src`, CSS `@import`, and `configRelPath` token was updated
  in one pass (HTML, `Config__Main__.json`, `CoreUi__Styles__Index__.css`).

### New module - `10__System__ProjectManagerMode/` (Project Manager)
- `WhitecardVision__ProjectManager__Config__.json` - column list, default
  sort (`dateModifiedUtc` desc), delete-confirmation flag, untitled slug
  prefix.
- `WhitecardVision__ProjectManager__Styles__.css` - single unified card
  (toolbar + sortable table), sticky header row, active-row highlight,
  inline-rename input.
- `WhitecardVision__ProjectManager__ProjectActions__.js` - high-level
  project lifecycle: `CreateUntitledProject` (timestamped slug + default
  display name), `OpenProject` (loads + switches to Render mode),
  `DeleteProject` (with confirm), `CommitRename` (uses the new
  `RenameActiveProject` helper).
- `WhitecardVision__ProjectManager__ProjectList__.js` - renders the
  sortable/searchable table. Click a column header to sort (toggles
  asc/desc), type in the toolbar search to filter on name/slug/year/
  description/dates, click a project name to inline-rename, double-click to
  open. Inline rename commits on blur or `Enter`, cancels on `Esc`.
- `WhitecardVision__ProjectManager__Controller__.js` - wires the toolbar,
  installs the list, exposes `OnActivated()` for the Mode Manager, and
  `TriggerInlineNewProject()` for the Render "New" button. Auto-refreshes
  when the active project changes.

### Core shell changes
- `StateManager`: default `activeModeId` is `ProjectManager`.
- `ModeManager`: now dispatches a `controller.__OnActivated()` hook after
  every mode switch, so the PM can auto-refresh its project list.
- `Init`: bootstraps `ProjectManager__Controller` first; hotkeys remapped
  to `Ctrl+1 = ProjectManager`, `Ctrl+2 = Render`, `Ctrl+3 = Editor`,
  `Ctrl+4 = FilterSuite`, `Ctrl+5 = FinalPreview`.
- `Config__Main__.json`: `DefaultModeId = "ProjectManager"`; PM registered
  first in `Wv__AppConfig__Modes__Registered`.

### Server API
- `GET /api/projects` now returns both `projectName` (preferring
  `Metadata.ProjectName`, falling back to the folder slug) and a stable
  `projectSlug` used for URL paths. This lets the display name be edited
  without ever touching the filesystem slug.
- `DELETE /api/projects/{year}/{slug}` was already wired; now exercised
  end-to-end from the PM Delete row action.

### Client API wrapper
- `ProjectFileManager`:
  - `RenameActiveProject(newDisplayName)` - rewrites only
    `Metadata.ProjectName` and saves (folder slug stays fixed).
  - `DeleteProject` and `CreateProject` continue to exist; the latter still
    auto-loads the newly created project into the active state.

### Render mode rewire
- "New" button no longer opens a browser prompt. It switches to the
  Projects tab and triggers `CreateUntitledProject` + inline rename.
- "Load" button now simply switches to the Projects tab; the PM table is
  the single entry point for opening existing projects.

### UI polish pass (end of session)
- Removed the Project Manager title + subtitle (dead weight).
- Collapsed toolbar + table into one unified card instead of two floating
  panels separated by a gap.
- `Description` cell now uses `--Wv__Color__TextStrong` so it's readable.
- `Year` column renders `2026` instead of `Projects__2026`.
- Table scroller is capped by viewport height so the card never stretches
  into a huge empty column when the project list is short.

### Files created
- `02__Src__AppModules/09__SharedSystems__CommonElements/` ·
  `ResolutionPicker`, `LoadingSpinner`, `ApiLogger`, `TemplatesPanel`,
  `CompiledPromptExporter` (new module layer).
- `02__Src__AppModules/10__System__ProjectManagerMode/` · Config, Styles,
  Controller, ProjectList, ProjectActions (five files).

### Files removed
- `RenderMode__TemplatesTree__.js` (superseded by `TemplatesPanel`).

# -----------------------------------------------------------------------------
## WhitecardVision - v0.2.1 - 22-Apr-2026 - Code layout pass (ValeSpec alignment)

### Summary
- Comments and file layout only. No change to what the app does or how it runs.

### JavaScript
- Brought every first-party module in line with ValeSpec: regions, function
  sections, and public-API blocks in the AppCore/AppData/Utils/Shared/Systems
  trees, plus all four Prompt Constructor modules. Long files (StateManager,
  Project file manager, Templates panel) use nested section banners where it
  helps. The small note file in Prompt Constructor is still a stub only.
- Folders: `02__Src__AppModules` and `07__PromptConstructor`.

### Stylesheets
- All twelve app CSS files now follow the same pattern as the ValeSpec Product
  Index stylesheet: file headers, REGION / endregion blocks, and tidy
  indentation with properties lined up. The main Core UI index pulls sheets in
  three groups: base shell, shared widgets, then each system (Render, Edit,
  Filter, Final Preview).
- Style reference: ValeSpec product index sheet (names differ; layout rules match).

### Cursor rules (for agents)
- JavaScript: `12-WhitecardVision-JsCodeRegions-ValeStyle-.mdc`
- CSS: `13-WhitecardVision-CssCodeRegions-ValeStyle-.mdc`

# -----------------------------------------------------------------------------
## WhitecardVision - v0.2.0 - 22-Apr-2026 - First GH Push
# -----------------------------------------------------------------------------
- Source published to GitHub; app behaviour unchanged from v0.1.0 feature set.

## WhitecardVision - v0.1.0 - 22-Apr-2026 - Initial Buildout
# -----------------------------------------------------------------------------

### Scope completed
- Full Flask backend on port 8004 with **stdlib-only** server
  (`ThreadingHTTPServer`). No pip dependencies.
- Routes implemented:
  - `GET  /api/health`
  - `GET|POST|PUT|DELETE /api/projects[/:name]`
  - `GET  /api/templates/tree`
  - `GET  /api/templates/read?path=...`
  - `POST /api/images/upload`
  - `POST /api/generate/render`
  - `POST /api/generate/edit`
- Gemini proxy with hard block on any model id matching `flash-image`.
- Year-based project folder creation (`Projects__YYYY/{name}__WcVisData/`
  with the full 7-subfolder tree).
- Server-side aspect-ratio validation (hand-rolled PNG/JPEG header
  parser so we stay zero-dep).
- `.env` loader (stdlib) with `.env.example`, `.gitignore`, and setup
  `README.md` in `06__ExernalApiAndWorkers/01__Secrets/`.
- Launchers: `.py` and `.ps1` (port-busy prompt, health check,
  auto-open).

### Front-end
- Namespace `Wv__` enforced across every module.
- IIFE modules mount onto `window.Wv__<FQ Name>` exactly like ValeSpec.
- `AppCore` boot sequence:
  `ConfigLoader → StateManager → ModeManager → Per-mode Controllers`.
- System-local CSS + per-System Config JSONs (Render / Edit / Filter /
  Final Preview) - all imported by the central
  `WhitecardVision__CoreUi__Styles__Index__.css` hub.
- Prompt Constructor: 4 modules - `LoadMarkdown`, `BuildImageList`
  (Whitecard always at index 0), `BuildStructuredPrompt`,
  `BuildFinalPayload` (`imageConfig.imageSize="2K"` default).

### Render Mode
- ProjectMetaPanel · WhitecardSlot · ReferenceImageList (Material +
  Style, **10 combined cap**) · TemplatesTree · OutputPanel ·
  Controller.
- Generate flow: build-payload → save-project → proxy → persist
  PNG under `20__FinalExport__RenderMode/` → display.

### Edit Mode
- IterationList (New / Duplicate / Delete) — iterations live in
  `Wv__Project__EditIterations[]`, never overwritten.
- BaseSlot — per-iteration base image, aspect re-snapped on upload.
- PromptPanel — Target-Element / Preserve / Avoid fields.
- OutputPanel + Controller with `/api/generate/edit` flow.

### Filter Suite
- Placeholder controller only (no interactive behaviour this build).

### Final Preview
- Minimal viewer: flip between latest render and active edit output.

### Known limitations
- Gemini endpoint may take 30-60s per call; UI is locked during that.
- Filter Suite is intentionally inert - reserved for a later phase.
- No multi-user auth; single-user local workstation only.

### Follow-ups (not in scope for v0.1.0)
- Filter Suite actual tools (colour grade / composite).
- Better error surfacing for Gemini safety-filter rejections.
- Bulk export of all iterations.

# -----------------------------------------------------------------------------
