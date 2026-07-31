# VghLantern Development Log
# =========================================================


# ---------------------------------------------------------
## Vale__LanternDesigner v0.4.4 - 31-Jul-2026
### Projects table: tighter Actions column and Client Name for drawings

#### Added
- **Client Name** column on the Projects table (sortable, searchable, inline-editable).
- Client Name field on the New Project modal.
- Value writes to `VghLantern__ProjectFile__Metadata__ClientName`, which already drives the Drawing Editor title block, Specification schedule, and Document Preview / PDF metadata.
- Seeded Client Name `"David Brent"` on project 6969.

#### Changed
- Actions column shrinks to content width so Open / Edit / Delete no longer leave a wide empty strip.
- Project list / manifest / server list responses now carry `clientName`.

#### Files
- `VghLantern__DocManagement__Styles__Main__.css`, `Na__DocManagement__Config.json`
- `VghLantern__DocManagement__ProjectList__.js`, `VghLantern__DocManagement__ProjectActions__.js`
- `VghLantern__AppData__ProjectFileManager__.js`, `VghLantern__FlaskServer__Localhost__.py`
- `07__LocalProjectData/VghLantern__ProjectFile__6969__David_Brent__.json`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.4.3 - 31-Jul-2026
### Pitch annotation arc sized to stay compact and centred on the hip

#### Fixed
- The mid-hip pitch arc introduced in v0.4.1 used a radius small enough that a 22.5° sweep produced almost no visible curvature - it read as a flat, tick-ended line rather than an arc.
- A first attempt enlarged the radius to 900mm, but because a shallow 22.5° arc's bow is a fixed proportion of its own chord, this dragged the whole symbol (baseline, arc, ticks) a long way out from the pivot - the horizontal reference line ended up floating below the roofline and the text drifted off-centre toward the ridge.
- Settled on a modest radius (320mm) that keeps the whole assembly (baseline + arc + ticks + text) tight at the true hip midpoint, and tightened the radius safety cap (`len * 0.22`) so it only ever engages on genuinely small lanterns rather than routinely overriding the configured size.

#### Config
- `Na__Env2d__Config.json` → `AngleArcRadiusMm` (320), `AngleTickLengthMm` (55), `AngleTextOffsetFromSlopeMm` (60).

#### Files
- `VghLantern__Env2d__DimensionRenderer__.js`, `Na__Env2d__Config.json`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.4.2 - 31-Jul-2026
### Inline project row edit and simplified status tracker

#### Added
- **Edit** action on each Projects table row. Pressing Edit turns Project Name and Document Name into text inputs and Status into a dropdown; the Edit button becomes **Save** (with Cancel alongside). Save writes via the existing `POST /api/projects/{code}` path through `ProjectFileManager.SaveProject`.

#### Changed
- Document status options simplified to three values with a clear traffic-light scheme:
  - **Draft** (red)
  - **For Approval** (yellow)
  - **Issued** (green)
- Status config, CSS tokens, badge classes, and sort order updated to match. Legacy five-status values (`In Progress`, `Pending Approval`, `Approved`, `Completed`) are no longer offered.

#### Files
- `Na__DocManagement__Config.json`, `VghLantern__CoreUi__Styles__Variables__.css`, `VghLantern__DocManagement__Styles__Main__.css`
- `VghLantern__DocManagement__ProjectList__.js`, `VghLantern__DocManagement__ProjectActions__.js`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.4.1 - 31-Jul-2026
### Elevation pitch annotation centred on the hip

#### Changed
- Pitch angle annotation on front and side elevations sits at the **midpoint of the silhouette hip** instead of crowding the eaves corner.
- Restored the arched angle line: horizontal baseline, arc from horizontal to the slope, and tick marks at both arc ends - matching issued Vale drawing convention.
- Angle text uses a larger config-sized font (`AngleTextFontSizeMm`) and a paper-white halo (`--angle` modifier) so it stays readable at 1:50 sheet scale.
- `paint-order` is included in Env2d SVG style serialisation so the halo survives PDF export.

#### Config
- `Na__Env2d__Config.json` → `AngleTextFontSizeMm` (115), `AngleTextOffsetFromSlopeMm` (55, radial clearance past the arc), `AngleArcRadiusMm` (280), `AngleTickLengthMm` (50).


# ---------------------------------------------------------
## Vale__LanternDesigner v0.4.0 - 31-Jul-2026
### Full PWA support on Windows, iOS and Android, a real caching service worker, an honest read-only notice for the hosted build, and Component Index thumbnails at a consistent line weight and scale

**Status: the PWA and web demo work is written, not yet run.** Every file is syntax-checked, every path and precache entry is verified to resolve, and the URL resolver and service worker routing are unit-tested against all four deployment surfaces. None of it has been exercised in a browser. The Component Index work at the end of this entry is the exception - that is confirmed working in the running app.

#### The problem
- Installability was a copy of the ValeSpec scaffolding and had never worked. The manifest and the head both pointed at `01__AppAssets__VghLantern/Na__VghLanternApp__Icon__192x192.png` and its 512 sibling; the folder contained nothing but an empty `UiIcons__MenuIcons__ToolsMenu`. Six references, two files, zero of them present. Chromium will not offer an install for a manifest whose icons 404.
- The service worker was a no-op with **no fetch handler at all**. It existed purely to satisfy the "has a service worker" criterion. No offline, no caching, nothing.
- The manifest declared `"scope": "/"` and `"start_url": "/VghLantern__App__.html"`. Correct only where the app root is the origin root, which is true on localhost:8006 and false on any hosted sub-path. Under GitHub Pages both pointed at the wrong place.
- There was no iOS path. Safari has no `beforeinstallprompt` and no programmatic install, so a manifest alone gets an iPhone user nowhere.

#### Assets (`01__AppAssets__VghLantern`)
- **The 404 is fixed.** ValeSpec's 192 and 512 icons copied in under the VghLantern names, as agreed, pending a lantern-specific icon.
- The Vale header logo copied in as well. It previously resolved through `../assets__CommonApplicationAssets/`, which sits **above** the app folder and therefore outside any Lantern-scoped service worker, so it could never be cached for offline use.

#### PWA module set (`62__Feature__AppInstallability` - rebuilt)
Ported from the Whitecardopedia stack, which was by a wide margin the best of the three implementations in the codebase, with two of its decisions deliberately **not** carried over. Whitecardopedia puts its worker at the WebApps root and pulls the logic in via `importScripts()` purely so one worker can cover two apps; Lantern is a single app, so its worker belongs at its own root. Whitecardopedia also hand-maintains a ninety-entry precache list, which is why its version token needs bumping on nearly every commit.

- **`Url__Constructor`** resolves the app root three ways in order: a `<meta name="vale-pwa-base">` override, the `Vale__LanternDesigner` path segment, then the directory of the current document. The app is a single page served from its own folder root, so the last of those is always correct and the segment probe is belt-and-braces for a hosted sub-path. Everything else in the stack reads its paths from here, and the static manifest and apple-touch-icon hrefs are rewritten to absolute URLs at load so the manifest, the worker scope and the start URL can never resolve from three different bases.
- **`PlatformDetector`** produces twelve platform tokens. Handles the iPadOS-reports-as-MacIntel quirk through `maxTouchPoints`, the legacy `navigator.standalone` flag, and four display-mode queries including `window-controls-overlay` for the Windows app shell.
- **`SessionState`** holds a per-platform dismissal ladder of 1 minute, 1 hour, 1 day, 1 week, 1 month, in localStorage with an in-memory fallback so private browsing cannot throw.
- **`PromptUi`** renders two variants in vanilla DOM so it can mount before the app finishes booting: a compact bottom bar and a centred instruction sheet with an animated arrow.
- **Five handlers.** Chromium captures `beforeinstallprompt` and drives the native dialog; iOS Safari walks through the share sheet with the arrow pointing down on iPhone and up on iPad; iOS non-Safari explains that only Safari can install and offers to copy the link; macOS Safari covers File then Add to Dock; InstalledStandalone is a real handler rather than a null so the controller needs no special case.
- **The Chromium handler attaches its listener at module load, not at `activate()`.** Chromium can fire `beforeinstallprompt` before the controller has initialised and the event is never replayed. Whitecardopedia papers over this with a retry loop; capturing early removes the race instead.
- **`InstallController`** waits 4.5 s then retries up to six times at 1.5 s, probes `getInstalledRelatedApps()`, and subscribes to live standalone changes. It also **defers while the web demo notice is on screen**, so a first-time web visitor reads one panel at a time.
- **`ServiceWorker__Registrar`** gates on secure context, bridges `controllerchange` to a single guarded reload, and offers three escalating resets. `purgeAppCache()` preserves `VghLantern__Project__*` and `VghLantern__ProjectManifest` **by prefix** - on the hosted build that mirror is the only copy of a user's work, so a purge that took it would be destructive. It aborts rather than proceeding if it cannot snapshot those keys first. `ClearCache` typed into the console still works as it does elsewhere.

#### Service worker (`Na__ServiceWorker__VghLantern.js` - rewritten in place)
- **The filename is unchanged on purpose.** Registering a differently named worker would leave the old registration in place as an orphan rather than replacing it.
- Two buckets, `vghlantern-shell-vN` and `vghlantern-data-vN`. The superseded `na-vghlantern-cache-` prefix is still in the owned list so anything the stub left behind is cleaned up on first activate.
- **`/api/*` is bypassed entirely.** Those routes carry live project state and health checks; a cached answer there would be actively wrong. On GitHub Pages they fall outside the scope anyway, but on localhost the scope is the origin root and the explicit bypass is what makes it safe.
- HTML is network-first so a stale document cannot load against a newer module graph. **All JSON is network-first**, with `cache: 'no-store'` on the network leg so a "network-first" read cannot be quietly satisfied by the browser's own HTTP disk cache. Treating the whole extension this way is simpler than an allow-list and safer during development, where an edited config must never be shadowed. Everything else is stale-while-revalidate.
- **Precache is twelve entries**, not ninety: the document, the stylesheet index, the two vendor builds the app actually loads, the icons, and the boot-critical JSON. The rest enters the cache through stale-while-revalidate as it is first requested, so the app is fully offline after one visit with no file list to keep in step with the source tree.

#### Manifest (`VghLantern__Pwa__Manifest__.webmanifest` - new)
- `start_url` and `scope` are now **relative to the manifest**, so the same file is correct on localhost, on GitHub Pages and on any future custom domain.
- `id` is `vghlantern-designer`, resolved against the origin. This matters: every Vale app shares the `github.io` origin, so a path-based id risks colliding with another app's.
- Gains `display_override` led by `window-controls-overlay`, `handle_links`, `categories`, `lang`, and **`maskable` icon entries**, which were absent before and are why an installed Android icon would otherwise render badly.

#### Web demo mode (`63__Feature__WebDemoMode` - new)
The app runs perfectly well without the Flask server. Every loader already falls back to a static file, and `ProjectFileManager` already catches an unreachable server and falls back to localStorage. What it cannot do is **write to disk**, and that gap is invisible: a save succeeds into localStorage and the user has no way to know their work never reached a file. This exists to make it visible.

- **`EnvironmentDetector`** classifies hostname-first so the answer is available with no race against boot, then confirms with a health probe. Not localhost means demo, resolved immediately. Localhost with a live health route means full mode. **Localhost with a dead one also means demo**, which catches opening the app without starting the server. The probe only runs on localhost; probing the hosted build would add a guaranteed 404 for no information.
- **`NoticeModal`** shows once per browser session, then leaves a persistent badge in the header that reopens it. It states plainly that projects live in this browser alone and are lost if browser data is cleared, and points at the localhost build for real editing.
- **Editing stays enabled.** Locking the app down would make it useless for showing the tool to someone. The warning plus an escape hatch covers the real risk, which is silent data loss.
- That escape hatch is **Export all projects**, which writes every stored project into one JSON bundle. One file rather than a loop of downloads, because a loop trips popup blocking and a bundle is easier to hand back to the local build later.

#### Verification performed
- All fourteen new and rewritten JS files pass `node --check`.
- Manifest parses; `start_url`, `scope` and all four icon entries resolve to files that exist. An initial `../../../` was one level too deep and was caught here.
- All 95 local references in the app HTML and all 18 stylesheet imports resolve.
- All 12 precache entries resolve.
- The URL resolver was run against localhost, GitHub Pages, a custom-domain sub-path and a root-mounted custom domain. All four produce correct roots, scopes and start URLs.
- Service worker routing was tested against 14 representative URLs covering all five classifications. No misroutes.
- No global is read that is not defined, beyond `VghLantern__AppData__ProjectFileManager` and the opt-in `VghLantern__App__SuppressReload` flag, which nothing sets yet by design.

#### Known and accepted
- `ComponentIndexLoader` and `ProfileIndexLoader` request the origin-absolute `/api/component-index` and `/api/profile-index` first. On the hosted build those 404 before the static fallback succeeds, so the console shows two expected 404s on load. Harmless, and left alone rather than reworked as part of a PWA change.
- The install prompt covers Chromium, both iOS paths and macOS Safari. Desktop and Android Firefox get no handler, because neither offers a usable install route worth prompting for.

#### Component Index (`50__System__ComponentIndex`) - consistent thumbnails and an insertion origin marker
**Confirmed working in the browser**, unlike the PWA work above.

The gallery traced every profile with an inline `stroke-width` of `max(Width, Height) / 120 * 6` while the stylesheet also applied `vector-effect: non-scaling-stroke`. Those two together make the attribute a **screen-pixel** width that is then scaled by the size of the section, so the 120mm eaves drew at well over twice the line weight of the 50mm glazing bar. Nothing marked where a profile is inserted onto the skeleton, either.

- **The outline weight is a fixed `1.5` owned by the stylesheet** and no inline attribute is emitted at all. Paired with the non-scaling stroke that was already there, every section now reads at one weight whatever it measures. This is what `ProfilePathTracer` in the SketchUp plugin has always done, and this change brings the two galleries into line.
- **The viewBox is square and centred on the outline**, sized off the longer edge plus 12% either side, rather than padded per axis. Padding each axis independently left a wide eaves tight to the sides of its square well while a narrow glazing bar floated with slack all round. A square box frames every section to the same proportion of its well.
- **The insertion origin carries a red diagonal cross** at `(0, 0)`, which needs no transform because only Y is negated when the path is built. It is turned 45 degrees so it cannot be read as part of the section - an upright crosshair lies along the outline edges on most lantern profiles. Its arms are sized off the framed span, so like the stroke it is the same size on every card. `--VghLantern_SvgOriginLine` is the new token.
- **The cross is drawn after the path, not before.** `ProfilePathTracer` draws its marker first because its profile line has no fill; the Lantern preview path *is* filled, so a marker underneath is buried on any profile whose origin sits inside the section rather than on its boundary.
- **A small / medium / large thumbnail toggle** sits in the toolbar at 140 / 190 / 260px. Grid columns are a **fixed width per setting rather than a `1fr` stretch**, so a card is the same size whatever the viewport - which is the point of having the control at all. Below 600px the row falls back to a fluid fill so the large setting cannot overflow the panel. Changing size swaps classes on the live DOM instead of re-rendering, so the grid does not drop back to loading shims on every click.

The detail panel picks all of this up for free. It already called `BuildPreviewSvg` rather than tracing its own copy, so there was one place to change.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.3.0 - 30-Jul-2026
### Drawing Editor: one layout and one chrome description shared by sheet and PDF, 3D snapshots framed at the frame's own aspect, and sheet setup persisted on the project file

**Status: tested and confirmed working.** Sheet and export are in parity, the 3D frame matches on both surfaces, and sheet setup survives a session.

#### The problem
- The sheet and its PDF were drawn by two independent authors. The screen was a CSS grid inside a flex column with the notes block and titleblock as DOM; the exporter re-solved the same rectangles in millimetres and re-drew the same furniture with jsPDF. Anything not expressed as a shared config number drifted: font stack, font weight, letter spacing, text baselines, rule colours, and the position of every caption.
- The 3D view was the worst of it. The snapshot was captured into a fixed **2000 x 1400** buffer whatever shape the frame was. On screen `object-fit: contain` letterboxed it; on paper `addImage` stretched it to fill. Same lantern, two different framings.
- Nothing about the sheet was saved. Sheet size, orientation, scale, gutter positions, zoom and the 3D viewpoint were session variables, so every reopen started from the config defaults.

#### One geometry source (`SheetPdfLayout__.js`, `SheetManager__.js`, `ViewportFrame__.js`)
- **The screen sheet is now positioned from the layout solve.** Each frame and its drawable body are placed at the solved paper rectangle divided by `ScreenPixelsPerMm` and nothing else. The CSS grid, the flex column and the per-surface layout maths are gone.
- `Solve()` returns the grid's **column and row tracks**, so the gutter handles sit on the solved gutter centre lines rather than on a second implementation of the same division. It also returns `LabelMm` and `ScreenPixelsPerMm`.
- `ViewportFrame__CellSizeMm()` and `SlotBodySizeMm()` are **removed**. They were a parallel copy of the layout arithmetic, including a second implementation of the notes-band reservation, which is exactly the kind of duplicate that drifts.
- `ViewPlacement__ApplyTrueScale()` takes the body rectangle from the solve instead of measuring the laid-out element, so screen rounding can no longer reach the drawn scale. `BuildFitRequests()` fits against the same rectangles.
- The paper's outline is an **outline, not a border**: a border comes out of the content box and would leave the chrome overlay scaled a couple of pixels smaller than the frames positioned inside it.

#### One chrome description (`SheetChrome__.js` - new)
- Everything printed on a sheet that is not a view - frame boxes, caption strips, captions, scale labels, the notes block, the titleblock - is built **once** as a flat list of paper-millimetre primitives (`Rect`, `Line`, `Text`, `Image`).
- That one list is rendered **two ways**: to an SVG overlay whose viewBox is the paper in millimetres for the Drawing Editor, and to jsPDF calls for the export. Same order, same coordinates, same face, same weights. The overlay is pointer-transparent, so clicking a dimension or double-clicking the 3D frame still reaches the view underneath.
- **Baselines are absolute and derived from cap height.** A baseline is the only vertical anchor SVG and PDF agree on exactly; line boxes, half-leading and flex baseline alignment have no equivalent in a PDF content stream.
- **Text is measured through jsPDF.** A throwaway document holds the Helvetica metrics the export will use, so a titleblock value truncated on paper is truncated at the same character on screen. The font stack leads with Helvetica for the same reason - Arial is metrically identical and is what Windows substitutes.
- New **`Config__SheetStyle`** block owns colours, strokes, weights, letter spacing and the font stack for both surfaces at once. `Config__PdfExport` keeps its colour values as fallbacks only.
- The Document Preview mode still renders `TitleBlockRenderer` and `AnnotationLayer` markup as DOM, so their CSS moved to the Document Preview stylesheet, with its one consumer.

#### 3D snapshot parity (`ViewPlacement__.js`)
- The snapshot is rendered at the frame's paper millimetres times `PdfExport.SnapshotPixelsPerMm`, so it has the **frame's exact aspect** and fills its rectangle on both surfaces with no fitting in between.
- The offscreen stage is sized to that aspect **before** the camera preset is fitted. The preset fits against whatever aspect the surface is at, and the capture then renders without refitting; if the two disagree the fit is wrong, and a frame taller than the stage had its model clipped at the sides.
- The snapshot cache fingerprint now includes the frame size, so changing sheet size or dragging a gutter re-shoots rather than reusing an image fitted to the previous frame.

#### Sheet setup persisted (`ProjectSchemaValidator__.js`, `ProjectFileManager__.js`, `SheetManager__.js`)
- New **`VghLantern__ProjectFile__DrawingLayout`** block on the project file: sheet size key, orientation, scale denominator, whether the scale was chosen by hand, column and row shares, sheet zoom, and the 3D view camera states.
- Restored on `projectChanged` **before** the redraw, so a project opens on the paper, scale and viewpoint it was saved with rather than on the defaults followed by a visible correction. Every field may be null, and null means fall back to config, which is what a project created before this block existed needs to do.
- Writes go through `MarkDirty()`, so the existing AppCore debounce turns a gutter drag or a run of zoom steps into a single disk write rather than one per event.
- A saved sheet size is checked against the size table and a saved scale against the denominator list before either is applied, so a stale value cannot put the sheet on an unreadable scale.

#### PDF export
- `SheetPdfExporter__.js` no longer draws anything of its own. It rasterises the views into the solved body rectangles, then hands the shared chrome primitives to the shared renderer. It **reuses the layout the editor laid the screen sheet out with** rather than re-solving, so an export cannot disagree with the sheet the user approved.
- Draw order is unchanged and still deliberate: views first, chrome over the top, because a view is an opaque raster that fills its body rectangle to the millimetre. The on-screen overlay stacks the same way.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.2 - 30-Jul-2026
### Preview & Send and Drawing Editor: drawings last, compact title block, PDF-faithful preview, true scale sheet views, sheet navigation, live 3D camera, and true-size PDF export

#### Document Preview (`40__System__DocumentPreviewMode`)
- **Page order** is now config-driven (`Config__Page.PageOrder`: specification then drawing). Both on-screen preview and PDF export read the same `DocumentState.ListPageKinds()` path so they cannot diverge.
- **Drawing title block** is height-capped from `TitleBlockHeightMm` (reduced to **14 mm**, logo **28 mm**) so the four view frames reclaim page space. Preview wraps the title strip in `DocPreview__TitleHost`; PDF strip height uses the same config value and row Labels.
- **WYSIWYG specification pages** — new **`PrintDocumentRenderer`** builds print-faithful HTML from `DocumentModel` (same sequence as `PdfExporter`). Specification Mode keeps its interactive card UI; Preview & Send no longer dumps that abstraction into the paper preview.
- **Drawing Editor viewport gutters** — drag the space between the 2×2 frames to rebalance column/row shares. Hover shows a grab cursor and blue handle; scale stays fixed (larger frame shows more model at the same 1:N). Shares persist for the session and feed PDF layout via `GetGridShares`.
- **Env2d corner view titles** — in-viewport draftsman labels (not sheet frame captions) at **0.25×** size (`ViewLabelSizeFactor` 0.00875), with a text-width underline rule, and plan renamed **Plan View**. Labels anchor just under the drawn content (not the empty viewBox edge). Gutter resize handles idle as light dotted lines; hover/drag keeps the solid blue accent.
- **Sheet ↔ PDF WYSIWYG parity** — Drawing Editor and PDF export now share one millimetre SSOT (`Sheet.BlockGapMm`, titleblock paddings/logo caps, notes typography/columns, frame label font). Screen chrome is driven by CSS variables injected from config; PDF titleblock/notes/logo use the same numbers; `CellSizeMm` reserves the notes band like `SheetPdfLayout.Solve`.

#### Scale correctness (the headline fix)
- **Sheet views were never drawn at the quoted scale.** Every frame caption and the titleblock quoted the `ScaleManager` denominator, but nothing applied it: each view was independently fitted to its frame by `Env2d__RenderPipeline__FitIfNeeded`, so a 4000 mm side elevation drew larger than a 6000 mm front elevation on the same sheet at the same stated scale.
- **`ViewPlacement__ApplyTrueScale()`** now gives each orthographic frame a viewBox spanning exactly **(frame body millimetres x scale denominator)** of model space, centred on that view's projected extents. The quoted scale and the drawn scale are the same number.
- The body rectangle is **measured from the laid-out frame** rather than taken from the requested grid cell. The notes block takes its height off the grid, so the two differ, and a viewBox whose aspect does not match its box is letterboxed by `preserveAspectRatio` and quietly draws under scale.
- **A manually chosen scale now sticks.** Auto fit re-ran on every rebuild and silently overwrote the toolbar selection, which is why changing the Scale dropdown appeared to do nothing. Auto fit still picks the opening scale, then stands down for the session once the user chooses.
- Frame caption strips are pinned to their configured paper height, because the body maths subtracts `FrameLabelHeightMm` and a font-driven strip height put the drawn scale slightly off its quoted value.

#### PDF export (`SheetPdfLayout__.js`, `SheetPdfExporter__.js` - both new)
- **`SheetPdfLayout__.js`** solves the paper millimetre rectangle of every element on a sheet: view grid, each frame and its drawable body, notes block, titleblock strip. Pure arithmetic, no DOM and no jsPDF. Honours `ColumnSharesPct` / `RowSharesPct`, preferring the live session shares from `SheetManager__GetGridShares()` so an exported sheet matches frames the user has dragged.
- **`SheetPdfExporter__.js`** writes the sheet as a single-page PDF and is the owner of scale correctness in print. Three things have to agree and all three are forced: the page is created at the sheet's real millimetre size; each view's viewBox is **rewritten** to span exactly one scale window before rasterising; the raster is placed into that same rectangle so nothing is refitted between the maths and the paper.
- Verified end to end on an A3 landscape export: PDF MediaBox came out as **1190.55 x 841.89 pt**, which is exactly 420 x 297 mm, and a 10,000 mm lantern drew 100 mm wide at 1:100.
- Views are rasterised at **12 px/mm (about 305 dpi) as PNG**, because a drawing is thin dark lines on white that JPEG turns into grey haloes. Frame chrome, notes and the titleblock are drawn **natively**, so issued text stays selectable and searchable.
- **Draw order matters and is deliberate.** Views are laid down in one pass and every rule and caption drawn over them in a second. A view is an opaque raster filling its body rectangle to the millimetre, so chrome drawn first is painted over along every shared edge.
- Page size and drawn scale are written into the **document properties** as well as the page geometry, so a short print can be diagnosed from the file itself.
- New **`VghLantern__DrawingEditor__Config__PdfExport`** block: filename pattern and tokens, raster density, block gaps, stroke weights, print colours and metadata author strings.

#### Env2d export fidelity
- **`Env2d__RenderPipeline__ToSvgMarkup()` now bakes computed styles inline** before serialising. The live SVG is styled entirely through CSS classes and custom properties, none of which travel with a detached markup string, so serialised raw the views rasterised as black shapes with no strokes. This was a **latent bug affecting the existing Document Preview PDF export** as well, which is fixed by the same change. Only the eighteen properties that decide how a shape is painted are copied, so an exported sheet is not inflated by hundreds of irrelevant declarations.

#### Sheet navigation and direct editing
- **Wheel zooms about the cursor; right drag or middle drag pans.** Pan was originally on left click, whose pointer capture swallowed every click before it reached a dimension or the 3D frame. Left click is now completely free for editing. The browser context menu is suppressed inside the sheet stage and middle-button autoscroll is blocked.
- Zoom is a CSS transform on the sheet plus an explicit size on the scaler, so the sheet keeps its true paper-pixel dimensions for export while the host's own scrollbars provide the pan surface. Zoom survives sheet rebuilds within a session.
- **Dimensions are editable directly on the sheet**, through the same `ConstraintResolver` path as the Lantern Editor. The floating input is positioned through the sheet's zoom transform, so it lands centred on the text at any zoom rather than only at 100 percent.
- **Fit Views and Refresh are removed** along with their config flags. The sheet live-updates on every geometry solve and every toolbar change, so both were dead weight. Double-click zoom reset is removed too; the gesture belongs to the 3D frame.

#### Live 3D camera editing on the sheet
- **Double-click the 3D frame** to swap the snapshot for a live orbitable surface. The frame takes a blue border to show which viewport owns the keyboard, and **Escape** ends the session.
- On exit the snapshot is **re-captured from wherever the camera was left**, and that camera is remembered: later geometry edits and sheet rebuilds re-shoot the 3D view from the chosen angle instead of snapping back to the isometric preset.
- **`RenderPipeline__GetCameraState()` / `SetCameraState()`** expose camera position and orbit target as plain data, so classic scripts can hold and replay a camera without touching Three.js types.
- Sheet pan and wheel stand down over a live camera canvas so the two navigation systems never fight, and a sheet rebuild or mode exit mid-session tears the session down safely.

#### Drawing output no longer carries modelling aids
- The **Env2d construction grid** is cleared from each sheet frame after it renders. Cleared after the fact rather than suppressed inside the renderer, so the Lantern Editor viewport keeps its grid untouched. Config: `ViewGrid.ShowConstructionGrid`.
- The **Env3d ground grid is never built** into a sheet viewport. `SceneManager__Create()` and `RenderPipeline__Mount()` now take options, and the Drawing Editor mounts both of its 3D surfaces with `{ ShowGroundPlane : false }`.
- **Suppressed at build time, not hidden at capture time, and this matters:** the lighting rig attaches into the same `helpers` group as the grid, so hiding that group removes every light and renders the lantern as an unlit black silhouette.
- Sheet snapshots frame tighter than the live view via `Snapshot.FramePaddingFactor`, because the bounding-sphere fit plus the interactive padding left a wide flat lantern tiny in its frame.

#### Performance and resource fixes
- **The 3D snapshot is cached against a fingerprint** of the lantern config and camera preset. Every entry to the mode previously mounted a fresh WebGL context, rebuilt the scene, rendered a supersampled frame and PNG-encoded it on the main thread (about 1 s of a measured 1.3 s entry), then threw it all away on exit. Re-entry with unchanged geometry now does no WebGL work at all.
- **WebGL contexts are actually released.** `renderer.dispose()` does not free a context; that waits for garbage collection, so repeated tab switching stacked live contexts toward the browser's hard cap, at which point the browser starts killing the oldest context. `SceneManager__Destroy()` now calls `forceContextLoss()`.
- **Sheet redraws are no longer dropped.** A request arriving while a build was in flight was silently discarded, leaving the sheet showing stale geometry. Requests are latched and replayed when the build lands.
- **`THREE.Color: Unknown color role-fixed`** warning fixed: the material builder parsed a sentinel string as a colour on every glazing and line material build. The colour is now constructed only in the branch that uses it.
- Toolbar render order fixed so the Scale dropdown shows the settled denominator on first entry rather than a stale one.

#### Document Preview - visit requirement removed
- **The Drawing Editor visit requirement is gone** (open item from v0.0.1). Preview and Send previously showed empty drawing frames unless the Drawing Editor had been opened that session. Entering Preview now composes the sheet headlessly when nothing is cached, then releases the hidden surfaces immediately. This became safe because the true-scale viewBox maths never reads on-screen layout.

#### Files touched (Drawing Editor, PDF export and supporting environments)

| Area | Path |
|------|------|
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfLayout__.js` |
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfExporter__.js` |
| Drawing Editor | `VghLantern__DrawingEditor__SheetManager__.js`, `ViewPlacement__.js`, `ViewportFrame__.js`, `Na__DrawingEditor__Config.json`, `Styles__Main__.css` |
| 2D environment | `05__Env2d__SvgRenderPipeline/VghLantern__Env2d__RenderPipeline__.js`, `DimensionEditor__.js` |
| 3D environment | `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SceneManager__.mjs`, `RenderPipeline__.mjs`, `SnapshotExporter__.mjs`, `CameraRig__.mjs`, `MaterialLibrary__.mjs`, `Na__Env3d__Config.json` |
| App core | `01__AppCore/VghLantern__AppCore__Init__.js` |
| App shell | `VghLantern__App__.html` (two new Drawing Editor scripts) |

#### Open items

- **`ProfileTraceRenderer` full silhouette**, **provisional library dimensions**, **Gable and Mono Pitch roof forms** and **empty dev tooling folders** all stand as recorded in v0.0.1.
- **Vector PDF output** - jsPDF cannot place vector SVG, so orthographic views are rasterised at 12 px/mm. True vector linework in the PDF needs either a different writer or an SVG-to-PDF path drawer. Worth revisiting before drawings are issued to the workshop at A1.
- **A manually chosen scale can overflow its frame.** Picking too fine a scale for a large lantern clips the view at the frame edge, which is honest CAD behaviour but currently silent. A toolbar warning when the chosen scale does not fit would be kinder.
- **Notes are truncated to one line each** in the PDF, because the notes block height is measured on one line per note. A long project note is cut rather than wrapped.

# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.1 - 30-Jul-2026
### Initial wireframe release — app shell, geometry solver, 2D/3D environments, drawing sheet, specification, PDF

First build of the **VghLantern Roof Lantern Designer**, a parametric roof lantern configurator for Vale Garden Houses. Structure, naming, interaction model, and project-file workflow are deliberately **modelled on ValeSpec** so the two apps read as one family. The app is a static HTML/CSS/JS shell with a **Flask localhost server on port 8006** for project read/write and per-user menu state. Where ValeSpec drives a single **SVG** pipeline, VghLantern runs **two render environments side by side** — a 2D SVG pipeline for plan/elevation linework and dimension editing, and a Three.js pipeline for the 3D rendition — both fed from one **geometry solver** so they can never disagree about the model.

#### App shell and core (`VghLantern__App__.html`, `01__AppCore`)
- **Seven modes** in `VghLantern__AppCore__ModeManager__.js`: **`DocManagement`**, **`LanternEditor`**, **`Viewport3d`**, **`DrawingEditor`**, **`Specification`**, **`DocumentPreview`**, **`ComponentIndex`**. Descriptor table maps each mode to its panel id plus an **`IsFullBleed`** flag so viewport modes lose panel padding.
- **`VghLantern__AppCore__StateManager__.js`** — event emitter holding `currentProject`, active lantern index, and the last solved geometry; emits **`appConfigLoaded`**, **`componentIndexLoaded`**, **`profileIndexLoaded`**, **`projectChanged`**, **`lanternSelected`**, **`lanternUpdated`**, **`geometrySolved`**, **`modeChanged`**, **`dirtyStateChanged`**.
- **`VghLantern__AppCore__Init__.js`** — boot order, delegated listener binding via **`VghLantern__AppCore__InitSystemModules()`** (bound once, not per render), debounced autosave, and **`VghLantern__AppCore__OnModeExited`** so heavyweight systems can release resources. The 3D viewport drops its GL context on exit; Drawing Editor and Specification flush pending edits.
- **`VghLantern__AppCore__ConfigLoader__.js`** — loads the app config SSOT then merges each system's local overlay (`Na__LanternEditor__Config.json`, `Na__Env2d__Config.json`, `Na__Env3d__Config.json`, `Na__DrawingEditor__Config.json`, `Na__Specification__Config.json`, `Na__DocPreview__Config.json`, `Na__DocManagement__Config.json`, `Na__LanternEditor__Warnings__.json`).

#### Configuration SSOT (`02__AppData/VghLantern__AppConfig__Main__.json`)
- App identity, port **8006**, data folder paths, autosave debounce, default mode.
- **`VghLantern__RoofForm__Options__Config`** — selectable forms **Hipped Ridge**, **Pyramid**, with **Gable** and **Mono Pitch** present but listed in `DisabledRoofForms` (visible, not yet selectable). Labels must match the canonical set in `ProjectSchemaValidator` because **`SkeletonSolver`** branches on them.
- **`VghLantern__Lantern__GlobalDefaults__Config`** — every new lantern seeds from here (2400 × 1400 mm, 150 mm builders upstand, 25° pitch, 500 mm target bar spacing).
- **`VghLantern__DataLibraries__Config`** — locations of the two generated library indexes and the GLB asset folder.

#### Geometry solver (`04__MathUtils__LanternGeometry`)
The single source of geometric truth; both render environments and the takeoff consume its output rather than deriving their own.
- **`VghLantern__Geometry__SkeletonSolver__.js`** — resolves a lantern config into a named member skeleton (eaves, ridge, hips, verges, closing sections) as 3D points in millimetres, branching on roof form.
- **`VghLantern__Geometry__RoofPitchCalculator__.js`** — pitch angle is the stored property and roof height derives from it; this is the one place angle ⇄ rise conversion happens (`DefaultPitchDegrees`).
- **`VghLantern__Geometry__GlazeBarLayout__.js`** — distributes glazing bars per slope by **target spacing**, rounded to whole panes, returning bar lines with their slope association.
- **`VghLantern__Geometry__ConstraintResolver__.js`** — clamps interdependent dimensions so the editor cannot produce an unbuildable lantern.
- **`VghLantern__Geometry__QuantityTakeoff__.js`** — pure function over solved skeleton + bar set returning linear metres per member role, glazing areas, and component counts. No DOM, no config reads.

#### 2D environment (`05__Env2d__SvgRenderPipeline`)
- **`VghLantern__Env2d__RenderPipeline__.js`** orchestrates layer renderers: **`PlanViewRenderer`**, **`ElevationViewRenderer`**, **`SkeletonRenderer`**, **`GlazeBarRenderer`**, **`ProfileTraceRenderer`**, **`FinialRenderer`**, **`DimensionRenderer`**.
- **`VghLantern__Env2d__DimensionEditor__.js`** — click a dimension, type a value, commit. Ported from the ValeSpec inline-dimension pattern so the interaction feels identical.
- **`VghLantern__Env2d__ViewportInstance__.js`** / **`ViewportControls__.js`** — pan/zoom per viewport instance, with **`ActiveController`** tracking so **zoom-extents** hotkeys hit the viewport the user is actually in.
- **`VghLantern__Env2d__ProfileTraceRenderer__.js`** — draws true section outlines from the profile library at member positions, resolving profile ids through `ProfileIndexLoader`.

#### 3D environment (`06__Env3d__ThreeRenderPipeline`)
- **ESM boundary:** Three.js is module-only, so **`VghLantern__Env3d__Bootstrap__.mjs`** is the single `<script type="module">` entry. It publishes the pipeline onto `window` and dispatches **`vghlantern-env3d-ready`**, with a `WhenReady` queue so classic scripts can call in before the module graph settles.
- **`SceneManager`**, **`CameraRig`** (OrbitControls + named view presets), **`LightingRig`**, **`MaterialLibrary`** (whitecard finish set).
- **Mesh builders:** **`MeshBuilder__ProfileSweep__.mjs`** sweeps a 2D library profile along a solved skeleton member (hand-rolled merge rather than `BufferGeometryUtils`, because every member needs its own material slot); **`MeshBuilder__Skeleton__.mjs`** builds the frame from solved members; **`MeshBuilder__Glazing__.mjs`** fills the panes.
- **`ComponentLoader__Glb__.mjs`** — loads finials, bases, cresting, and vents from GLB, falling back to a proportional placeholder when an asset is missing rather than dropping the component.
- **`SnapshotExporter__.mjs`** — offscreen render at a requested size for placement on drawing sheets.

#### Lantern Editor (`20__System__LanternAssembly__EditorMode`)
- **`ControlDescriptors__.js` is the SSOT for controls** — every slider, dropdown, and toggle is declared as data (bounds, step, options source, visibility predicate). **`ControlPanel__.js`** is a generic renderer over those descriptors, so a new control is a data edit, not new DOM code.
- **Seven section modules** supply descriptors: **`FormAndSize`**, **`GlazingBars`**, **`RidgeAndHips`**, **`Finials`**, **`BuildersUpstandAndBase`**, **`Ventilation`**, **`FinishAndGlazing`**. Dropdown options come from the library indexes filtered by **`ApplicableRoles`**, so no module hardcodes a category-to-role mapping.
- **`WarningSystem__.js`** + **`Na__LanternEditor__Warnings__.json`** — declarative rules evaluated against lantern metrics and solved geometry; renders inline warnings and errors in the editor.
- **`ViewportHost__2d__.js`** / **`ViewportHost__3d__.js`** — host the two environments inside the editor split layout, with view tabs (plan / front / side) and an optional live 3D preview.

#### 3D View mode (`25__System__Viewport3dMode`)
- Full-bleed dedicated 3D mode with a floating control overlay (**`Viewport3d__Controls__.js`**): lantern selector, view presets, zoom extents, skeleton-mode label.
- Reuses the same **`VghLantern__Env3d__RenderPipeline__`** API as the editor host — no second pipeline. Configured from a **`DedicatedViewportMode`** block inside `Na__Env3d__Config.json` rather than a new config file, keeping all 3D settings in one place.

#### Drawing Editor (`30__System__DrawingEditorMode`)
- **All layout maths in paper millimetres**, scaled to pixels only for screen, so print and preview share one geometry model.
- **`ScaleManager__.js`** — standard scale ladder, fit-to-frame selection, model ⇄ paper conversion.
- **`ViewportFrame__.js`** builds captioned frames from the config's view slots; **`ViewPlacement__.js`** fills them, taking 2D views as static SVG and the 3D view as a snapshot. Rendered output is **cached** (`CachedSvgMarkup`, `CachedSnapshots`) so Document Preview can compose a sheet after the Drawing Editor has been exited.
- **`TitleBlockRenderer__.js`** — Vale-branded title block resolving fields from project metadata; **`AnnotationLayer__.js`** — general plus project-specific notes block.
- **`SheetManager__.js`** — orchestrates sheet size/orientation, drives scale fitting, and renders. Redraws are **debounced** and gated on **`IsModeVisible()`**, and it subscribes only to `geometrySolved` and `projectChanged` (not `lanternUpdated`, which already triggers a solve) to avoid redundant passes.
- **`DescribeSheet()`** exposes sheet size, orientation, view snapshots, and an `IsComposed` flag as the contract for Document Preview.

#### Specification (`35__System__SpecificationMode`)
- **`DocumentModel__.js`** — solves each lantern in the project independently, runs the takeoff, then aggregates. Handles single- and multi-lantern projects and collects warnings alongside the numbers.
- **`TakeoffTableRenderer__.js`** — one generic table builder driven by configurable column definitions, unit suffixes, and decimal places; renders linear, area, and component tables without per-table code.
- **`ScheduleRenderer__.js`** — lantern schedule, finish schedule, document header.
- **`JobNotes__.js`** — editable job notes with debounced autosave via **`VghLantern__StateManager__MarkDirty()`**, which the core autosave listener picks up through `dirtyStateChanged`. **`BuildStatic()`** returns print-safe markup instead of a live editor.
- **`DescribeDocument()`** builds header and section markup **on demand** rather than scraping the DOM, so the preview and PDF work even if Specification mode was never opened.

#### Document Preview and PDF (`40__System__DocumentPreviewMode`)
- **`DocumentState__.js`** — view toggles and page geometry (paper size, orientation, margins). Toggle keys mirror `VghLantern__UserMenu__ModeDocumentPreview__Config` exactly so persistence needs no key translation.
- **`MenuDataHandler__.js`** — loads and debounce-saves per-user menu state through `GET`/`POST /api/user-menu-config/{slug}` into `08__LocalUserData`.
- **`DocIssueHandler__.js`** — classifies errors and warnings from project state, the geometry solve, and the specification model; **errors block PDF export**.
- **`PdfMetadataResolver__.js`** — filename pattern plus embedded document properties, with filename sanitisation.
- **`PageRenderer__.js`** — paginates the document from `DescribeSheet()` and `DescribeDocument()`; **`PdfExporter__.js`** writes it out via version-locked jsPDF. Drawing views are rasterised (jsPDF cannot place vector SVG), 3D snapshots pass through as images, and the title block, notes, and specification tables are drawn **natively from structured data** so body text stays selectable.

#### Component Index (`50__System__ComponentIndex`)
- Sortable, searchable gallery of every profile and component in the two libraries, with a detail view showing metadata, outline data, and bounding box — the same inspection workflow as the ValeSpec Product Index.

#### Data libraries (`05__Data__LanternComponentLibrary`, `06__Data__LanternProfileLibrary`)
- **Unified asset schema** shared by both libraries: metadata block, 2D profile points, optional 3D mesh (inline or GLB URL), and behaviour block (sweep or placement).
- **Profile coordinate convention:** origin sits on the skeleton line at the section's bottom-centre; **x** spans ±half-width, **y** rises into the member. Each asset carries its own origin note.
- **Component coordinate convention:** finials and bases use the seating point; cresting uses the centre of one repeat; vents use the centre of the pane they replace.
- **Worked examples** so the whole pipeline renders end to end: three profiles (**`PRF_GLB0001`** 50 mm capped glazing bar, **`PRF_RDG0001`** 90 mm capped ridge, **`PRF_HIP0001`** 75 mm hip) and four components (**`VGH_FIN0001`** ball-and-spike finial, **`VGH_FIN0101`** moulded finial base, **`VGH_CRS0001`** fleur cresting, **`VGH_VNT0001`** manual roof vent). Dimensions are provisional pending real Vale sections.
- **`VghLantern__ProfileDataIndex__.json`** / **`VghLantern__ComponentDataIndex__.json`** are **generated output** — marked `DoNotEditByHand`, served by the Flask server at `/api/profile-index` and `/api/component-index` with `no-store`, with the static files as a fallback.

#### Version-locked dependencies (`04__Src__Dependencies__VersionLocked`)
- Coordinated 3D / projection set **01–04**: **three 0.184.0**, **three-mesh-bvh 0.9.9**, **clipper2-js 0.9.0**, **three-edge-projection 0.0.10 @ f794481**. Upgraded together, never independently.
- **05**: **jsPDF 4.1.0**, independent of that set. UMD classic script, so it is loaded by a plain `<script src>` and reaches the app as `window.jspdf` — deliberately **not** in the import map.
- **`Vale__Dependencies__ImportMap__Index__.json`** is the SSOT for the path map. A browser cannot read an import map from JSON, so the inline `<script type="importmap">` in `VghLantern__App__.html` mirrors it by hand.
- `package.json` / `package-lock.json` pin the same versions exactly for `npm ci`; the browser loads the vendored copies, not `node_modules`.

#### Styles (`03__Style__AppStylesheets`)
- **`VghLantern__CoreUi__Styles__Index__.css`** is a hub that `@import`s the core sheets plus every system-local stylesheet, so each mode's CSS lives beside its modules.
- **`Variables__.css`** carries the Vale brand token block verbatim, then a **`VghLantern_`** extension block for viewport overlays, warning and error backgrounds, and sheet chrome. System sheets reference tokens only — no stray hex literals.

#### Server (`VghLantern__FlaskServer__Localhost__.py`)
- Port **8006**; project CRUD backed by `07__LocalProjectData/`; per-user menu config in `08__LocalUserData/`; generated library indexes served with `no-store`; `.webmanifest` MIME mapping for PWA install; health endpoint and console restart flags carried over from ValeSpec.

#### PWA (`62__Feature__AppInstallability`)
- Web app manifest and a minimal service worker (`skipWaiting` on install, legacy `na-vghlantern-cache-` eviction on activate, no `fetch` handler).

#### Housekeeping — folder numbering and vendor consolidation
- Root folder numbers were duplicated (`03__` used three times, `04__` twice). Renumbered so each root series entry is unique, with the data libraries starting after the dependency store: **`05__Data__LanternComponentLibrary`**, **`06__Data__LanternProfileLibrary`**, **`07__LocalProjectData`**, **`08__LocalUserData`**. All config paths, loader constants, server constants, `.gitignore`, and README references updated.
- A partial **r160** Three.js copy had been vendored into `02__Src__AppModules/08__Vendor__ThreeJs__VersionLocked`, shadowing the curated **0.184.0** locked set. Removed; the import map now points at `04__Src__Dependencies__VersionLocked`. jsPDF moved out of `02__Src__AppModules/41__SystemHelper__PdfExportLibrary__VersionLocked` into the same store. The 3D modules import only `three`, `three/addons/controls/OrbitControls.js`, and `three/addons/loaders/GLTFLoader.js`, and use none of the APIs removed between r160 and 0.184, so the version jump needed no code changes.

#### Files touched (representative)

| Area | Path |
|------|------|
| App shell | `VghLantern__App__.html` |
| Server | `VghLantern__FlaskServer__Localhost__.py` |
| Launchers | `Start__VghLantern__Localhost__8006__.bat`, `...__.ps1`, `Start__VghLantern__WindowsStartUp__Silent__8006__.bat` |
| Service worker | `Na__ServiceWorker__VghLantern.js` |
| App core | `02__Src__AppModules/01__AppCore/VghLantern__AppCore__Init__.js`, `ModeManager__.js`, `StateManager__.js`, `ConfigLoader__.js` |
| App config SSOT | `02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json` |
| Project IO | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProjectFileManager__.js` |
| Library loaders | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProfileIndexLoader__.js`, `ComponentIndexLoader__.js` |
| App utils | `02__Src__AppModules/03__AppUtils/VghLantern__AppUtils__UnitConverter__.js`, `ProjectSchemaValidator__.js`, `HotkeyHandler__.js`, `DateFormatter__.js`, `AutofillGuard__.js` |
| Geometry | `02__Src__AppModules/04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js` + 4 siblings |
| 2D environment | `02__Src__AppModules/05__Env2d__SvgRenderPipeline/*` (13 modules + config + CSS) |
| 3D environment | `02__Src__AppModules/06__Env3d__ThreeRenderPipeline/*` (12 `.mjs` + config + CSS) |
| Notifications | `02__Src__AppModules/07__AppNotifications__UserAlerts/*` |
| Projects mode | `02__Src__AppModules/10__System__DocumentManagementMode/*` |
| Lantern Editor | `02__Src__AppModules/20__System__LanternAssembly__EditorMode/*` (17 files) |
| 3D View mode | `02__Src__AppModules/25__System__Viewport3dMode/*` |
| Drawing Editor | `02__Src__AppModules/30__System__DrawingEditorMode/*` (8 files) |
| Specification | `02__Src__AppModules/35__System__SpecificationMode/*` (7 files) |
| Document Preview | `02__Src__AppModules/40__System__DocumentPreviewMode/*` (8 files) |
| Component Index | `02__Src__AppModules/50__System__ComponentIndex/*` |
| PWA | `02__Src__AppModules/62__Feature__AppInstallability/*` |
| Stylesheets | `03__Style__AppStylesheets/*` (7 sheets) |
| Dependencies | `04__Src__Dependencies__VersionLocked/Vale__Dependencies__ImportMap__Index__.json`, `05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` |
| Component library | `05__Data__LanternComponentLibrary/*` (4 assets + index + READMEs) |
| Profile library | `06__Data__LanternProfileLibrary/*` (5 assets + index + README) |
| npm pins | `package.json`, `package-lock.json` |

#### Open items

- **`ProfileTraceRenderer` full silhouette** — only the section-cut trace mode is implemented. The full-silhouette sweep (projecting every profile vertex along a member to build the outer outline) is the next pass.
- **Library dimensions are provisional** — all nine worked assets carry plausible but invented sections. They must be replaced with measured Vale profiles before any output goes to a client or the workshop.
- **Drawing Editor visit requirement** — Document Preview composes drawing views from `ViewPlacement`'s cache, so the Drawing Editor must be opened once per session for sheet views to appear in the preview and PDF. Worth removing by having `DescribeSheet()` compose headlessly.
- **Gable and Mono Pitch roof forms** are listed but disabled; `SkeletonSolver` does not branch for them yet.
- **Dev tooling folders** (`60__Dev__WebBuildUtils` index builders, `65__Dev__CadObjectBuilder`) are scaffolded but empty. Until the builders exist, both library indexes are maintained by hand despite being marked as generated output.




# ---------------------------------------------------------
