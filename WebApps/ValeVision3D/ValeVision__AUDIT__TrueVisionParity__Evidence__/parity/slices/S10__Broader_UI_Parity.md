# S10 - Broader UI Parity: Header Fold, Tab Strip, Veils, Loading Screens, Toolbar, Menus, Styles

Slice report for the TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target) drawing-system parity analysis.
Written 01-Oct-2026, read-only against:

- TV `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` (HEAD b2aa9151, devlog top v2.172.0)
- VV `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` (HEAD 7b4e593a, devlog top v2.71.0)
- WCP `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia` (shared service worker only)

Path shorthand: `TV/`, `VV/`, `TVM/` = `TV/02__Src__AppModules`, `VVM/`, `LE/` = `51__System__LayoutEditor/`, `WCP/`.
All diffs are `git diff --no-index -w` (CRLF-insensitive). Line numbers are 1-based in the current working copies.

---

## Contents

- (a) Scope
- (b) Narrative findings by sub-system
  - B1 The top bar fold ("the top nav bar animation")
  - B2 The tab strip (TV 2.0.0 compact strip vs VV 1.5.0 per-sheet strip)
  - B3 Veils and loading screens (first open, back to 3D, VV lazy-load screen, published drawings)
  - B4 The drawing toolbar
  - B5 Panels look
  - B6 Context menus, tooltips, colour palette popover, confirm dialog, toasts
  - B7 Stylesheet loading model and the service worker
  - B8 03__Style__AppStylesheets file by file
  - B9 Entry HTML (header markup, overlays, editor initialisation)
  - B10 Fonts
  - B11 TV-only / VV-only 3D-tab UI modules (27, 75, 76 vs 60, 62, 64, Cache & Storage)
  - B12 Mobile / iPad, keyboard focus, reduced motion
  - B13 Dev Tools menu sections
- (c) Module-by-module table
- (d) Wiring notes
- (e) UI notes - brand tokens vs behaviour and layout
- (f) Decisions needed
- (g) Proposed work packages
- (h) Manual acceptance checklist (both apps side by side)
- Appendix A - target stylesheet order for VV
- Appendix B - ledger corrections

---

## (a) Scope

### What was examined

| Area | TV files | VV files | Notes |
|---|---|---|---|
| `03__Style__AppStylesheets` | 15 (5,297 lines) | 12 (4,518 lines) | Every shared sheet diffed; TV-only `DevMenu__CacheAndStorage__`, `PwaInstallability__`, `SceneInspector__` read |
| Entry HTML | `Index.html` (1,862) | `index.html` (2,347) | Header, loading overlays, confirm dialog, Dev Tools items, Layout Editor initialisation |
| LE stylesheets | `10/Styles__Main` (593), `10/Styles__Main__Paper` (889), `10/Styles__Surfaces` (70), `40/Styles__Panels` (1,174), `50/Styles__Specification` (tab rules), `80/Styles__WebViewer` | `01/Styles__Boot` (273, VV-only), `10/Styles__Main` (362), `10/Styles__Main__Paper` (632), `10/Styles__Surfaces` (71), `40/Styles__Panels` (1,000), `50/Styles__Specification`, `80/Styles__WebViewer` | Main, Paper and Panels diffed in full |
| LE shell and UI JS | `05/TabStrip` 2.0.0, `05/LoadingVeil` 1.1.0, `05/ModeController` 1.32.0, `40/Toolbar` 1.24.0, `40/PanelHost` 1.6.0, `30/ContextMenu` 1.1.0, `30/SheetTools__ContextMenu` 1.7.0, `30/SheetTools__HoverTooltip` 1.1.0, `30/SheetTools__NoteTooltip` 1.0.0, `30/LayerMenu` 1.0.0, `70/DevMenu__Controls` 1.3.0, `80/WebViewer` 1.2.0 | `05/TabStrip` 1.5.0, `05/LoadingVeil` 1.0.0, `05/ModeController` 1.18.0, `40/Toolbar` 1.9.0, `40/PanelHost` 1.4.0, `30/ContextMenu` 1.0.0, `30/SheetTools__ContextMenu` 1.2.0, `70/DevMenu__Controls` 1.4.0, `80/WebViewer` 1.1.0, `01/Loader` 1.1.0, `01/LoadingScreen` 1.0.0 | Headers, imports, exports, the UI-relevant functions read line by line |
| Published drawings loading screen | `TVM/52/Na__PubDoc__LoadingScreen__.js` 1.0.0, `Na__PubDoc__Styles__Main__.css`, `Na__PubDoc__Config__.json` (Loading block), README | none | VV has no published system |
| Colour palette / spell check (UI side) | `TVM/54/*` README, styles, config display block; `TVM/55` README, styles | none | Logic belongs to the 54/55 slice |
| 3D-tab UI modules | `TVM/27` (8), `TVM/75` (4), `TVM/76` (3), `TVM/70/...CacheAndStorage__Controls.js` | `VVM/60` (4), `VVM/64` (2) | Headers and LE interplay only |
| Shared utilities | `TVM/03/Na__AppUtils__ConfirmDialog.js` 1.0.0 | same 1.0.0 | Markup and CSS presence checked |
| Service worker | TV `62/TrueVision__Pwa__ServiceWorker__Logic__.js` (references only) | `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` | Token and precache list |
| Records | TV devlog v2.83, v2.124, v2.154, v2.156, v2.158 (+ v2.8, v2.9, v2.10, v2.24, v2.65 notes); VV devlog v2.21.0, v2.45.0, v2.70.0; ledger 1-60, 1113-1160, 1180-1246; VV plan section 11.1 and D22-D24; both LE label blocks (Python key diff) | | |

Totals: about 96 files opened or diffed; in-scope file count about 59 TV / 38 VV.

### Not examined (left to other slices or not verifiable read-only)

- The Statement Writer, Drawing Register and Specification page stylesheets beyond their tab rules (their own slices).
- Region-by-region content of the 3D Tools & Settings menu in `DropdownAndToast` (3D-tab furniture, hidden on every drawing tab in both apps).
- Scene editor regions of `SceneCarousel` (presentation slice).
- Nothing was run in a browser. Every visual claim here is read from CSS and JS, cross-checked against the devlogs' own measurements. Items marked "verify" need an eye in the app.

---

## (b) Narrative findings by sub-system

### B1 The top bar fold ("the top nav bar animation used in TrueVision when in Layout editor")

**Verdict: the fold itself is already identical. What differs is when it fires (TV v2.158.0) and what covers it on VV's first open (the lazy loader's full-screen screen).**

#### B1.1 The CSS - rule for rule

The whole fold is one region in `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css`
(TV lines 168-310, VV lines 167-265). TV's file has not changed since the v2.83.0 commit
(`git log`: `bef15277 2026-09-20 "Minoe"`); VV ported it the same day (v2.70.0).

| Rule | TV | VV | Same? |
|---|---|---|---|
| Tokens `--Vale_HeaderFoldDuration 1000ms`, `--Vale_HeaderFoldEase cubic-bezier(0.40, 0.00, 0.20, 1)`, `--Vale_HeaderFoldDelay 1000ms` | 209-213 | 205-209 | yes |
| `.app-header { transition: top ..., box-shadow ... }` (delay 0 on the base rule) | 229-232 | 225-228 | yes |
| `body.na-layout-editor--active .app-header { top: calc(-1 * var(--Vale_HeaderHeight)); box-shadow: 0 0 0 transparent; transition-delay: var(--Vale_HeaderFoldDelay) }` (the one-way hold) | 234-238 | 230-234 | yes |
| `.na-le-tabs { transition: top ... }` | 247-249 | 244-246 | yes |
| `body.na-layout-editor--active .na-le-tabs { top: 0; transition-delay: ... }` (welded to the header) | 251-254 | 248-251 | yes |
| `body.na-layout-editor--active .na-le-host { top: var(--Vale_LayoutTabStripHeight) }` (host snaps, does not animate) | 263-265 | 260-262 | yes |
| `top`, never `transform` (Dev Tools flyout is a fixed descendant) | note 187-193 | note 183-188 | yes |
| No `prefers-reduced-motion` branch | region 290-310 | note in region header | yes (policy identical) |

Only comments differ: VV folds TV's two explanatory regions ("The 3D Canvas Is Deliberately Left Out", "Why There
Is No prefers-reduced-motion Branch") into its region header, and names its own canvas arrangement. No port needed.

#### B1.2 The JS that toggles it

Both apps toggle exactly one class, `na-layout-editor--active`, in the mode controller and nowhere else:

- TV `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`: constant line 425, `classList.add` line 700
  inside `Na__LeMode__Enter` when the editor was not active, `classList.remove` line 777 in `Na__LeMode__Leave`.
- VV same file: constant line 284, add line 517, remove line 561.

The selectors that hide 3D furniture under the same class (`.na-dropdown-menu`, `#naBreadcrumbNav`,
`#naPresentationCarousel`, `#naNavToolbar`, `#naNavHelpPanel`, `.na-export-overlay`, `.na-projected-linework`,
`.controls-instructions-panel`) are byte-identical in both `Styles__Main` files (TV 42-51, VV 41-50).

#### B1.3 What TV changed since v2.83.0 that changes the fold - v2.158.0 (TabStrip 2.0.0, ModeController 1.30.0)

- In TV the Specification, Document Register and Design Statements tabs are on the strip **from the 3D view**
  (`TabStrip` 2.0.0 lines 344-361). Pressing one calls `Na__LeMode__OpenSpecification / OpenRegister /
  OpenStatements`, each of which runs `Na__LeMode__EnterUnder()` (ModeController 883-888) -> `Enter(null)` ->
  the body class lands -> **the header folds on a document tab too**, with the first sheet laid out quietly underneath.
- In VV the Specification tab only exists while a sheet is open (`TabStrip` 1.5.0 line 343: `if (isActive)`), and VV
  has no Register or Statements tabs, so **in VV the fold only ever follows a drawing tab**.
- `EnterUnder` also sets `Na__LeMode__Quiet` (TV line 444) so the first-open veil is NOT put up under a document page
  (TV line 733). VV has no equivalent; see B3 and finding S10-F07.

#### B1.4 What VV's first open does to the fold

VV loads its editor lazily. The first press of a drawing tab shows `Na__LeLoadScreen`
(`LE/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js`), which is the start-up `.loading-overlay`
(`LoadingOverlays` lines 28-45: `position: fixed`, full viewport, `z-index: 9999`, opaque white). The body class is
only added when `Enter` runs, after the import, so the 1 s hold and 1 s glide happen **underneath an opaque full-screen
cover** that also hides the header and the tab strip. When the cover fades, the bar is already folded (or mid-glide).
In TV the bar folds in plain sight over a host-sized veil, with the tabs readable throughout. This is the single biggest
visible difference in "the top nav bar animation" between the two apps, and it only affects VV's first drawing of a
session. Finding S10-F04, work package WP-S10-03.

#### B1.5 Narrow screens

- Both redefine `--Vale_HeaderHeight: 48px` at `max-width: 600px`, so the fold travels 48 px in both.
- TV keeps the title at 18 px (`AppHeader` line 159); VV hides it (`display: none`, line 159, "VGH logo carries the
  brand"). TV's own v2.9.0 entry records this as deliberate ("it stays visible, unlike ValeVision which hides its
  title"). Brand choice - keep (S10-F23).

#### B1.6 Known, accepted (both apps, from their devlogs)

- The tab strip's `top` is transitioned, so crossing the 600 px breakpoint eases 12 px instead of snapping.
- Leaving the editor always returns the camera to the first presentation scene (coming-out veil).

---

### B2 The tab strip

| | TV `05/Na__LayoutEditor__TabStrip__.js` 2.0.0 (23-Sep, v2.158.0) | VV same file 1.5.0 (19-Sep, v2.61.0) |
|---|---|---|
| Tabs | 3D Model, Drawings (menu), Specification, Document Register, Design Statements | 3D Model, one tab per sheet, `+` (localhost), Project Specification (only while a sheet is open) |
| Shown when | Config enabled AND the project has a sheet (line 316) | `Na__LeLoad__IsAvailable()`: the project's Layout Mode switch is on AND it has a sheet (line 302) |
| Drawings menu | On `<body>`, fixed, `z-index: 1002`, hung under the strip, kept 8 px inside the window, scrolls inside itself; rows "D03 - 3D Images" in register order, open row marked and focused, `+ New sheet` row on localhost; Escape, outside press, any change of document shuts it; Up / Down / Home / End walk the rows (lines 421-615) | none |
| Rename / reorder | Gone from the strip (register and Sheet panel do it) | Double-click rename with the code as fixed text; drag to reorder (lines 180-201, 316-330) |
| Arrows | Step tabs; landing on Drawings opens the last drawing read (WeakMap `Activate`, lines 192, 341) | Step tabs, plus excluded |
| Hovers | Drawings "{drawing} is open. Press to choose another drawing"; Register and Statements hovers | Sheet tab: whole drawing number (+ "Double-click to rename, drag to reorder" on localhost) |
| Labels | `SpecificationTab` "Specification"; arrows "The tab before/after this one"; `aria-label="Project documents"` | "Project Specification"; "The drawing before/after this one"; `aria-label="Drawing sheets"` |
| Spec tab class | `na-le-tabs__tab--specification` (so the 8 px `--spec` margin in `Styles__Specification__` line 23 no longer applies: "the five sit as one row") | `na-le-tabs__tab--spec` (8 px left margin applies) |
| Reaches the editor | Static imports of ModeController, SheetModel, SpecData, ConfigState | Only through `Na__LayoutEditor__Loader__` (the lazy-load facade) |
| Port note | `Back-port : PENDING to ValeVision3D (offer after Adam's sign-off)` (line 60) | `Parity : new` (stale - it carries TV 1.5.0 / 1.6.0 ports) |

CSS: TV keeps the strip's rules in `LE/10/Styles__Main__.css` lines 62-262 (menu rules 170-260 added in v2.158, rename
rules removed). VV keeps them in `LE/01/Styles__Boot__.css` lines 29-191 (still the 1.x rules: `--add`, `__renaming`,
`__rename`; no `--menu-open`, `__caret`, `__menu`, `__menu-row`, `__menu-divider`). Everything that both still share
(strip, scroller, arrows, tab, active, model) is byte-identical. VV must keep these rules in `Styles__Boot` because the
strip is drawn before the editor's stylesheets are linked.

The compact strip is the visible change Adam made to the drawing system's navigation, and it is what makes the fold
fire on document tabs. Finding S10-F03 (port), S10-F07 (wiring), decisions D-S10-01 and D-S10-02.

---

### B3 Veils and loading screens

Four covers exist across the two apps:

| Cover | TV | VV |
|---|---|---|
| Going in, first drawing tab of a session | `Na__LeVeil__FirstOpen` (LoadingVeil 1.1.0 lines 315-364): mounted INSIDE the editor host (`.na-le-veil` `position:absolute; inset:0; z-index:40`, `LoadingOverlays` 283-296), so the tab strip stays readable above it and the header folds over it; waits 550 ms before showing (`SHOW_AFTER_MS`, line 103); headline "Your Drawings Are Loading"; status names the outstanding job: "Drawing the Views  -  1 of 2", "Reading the Project Specification", "Preparing the Drawing Fonts"; min visible 500 ms; cap 25 s. Not shown under a document tab (Quiet) and not in the web viewer | No in-host veil. `Na__LeLoadScreen` covers the lazy import AND (since v2.70.0) the drawing wait: full-screen `.loading-overlay`, shown at once, title "Loading Layout Editor...", statuses "Fetching the drawing tools", "Reading the drawing settings", then "Drawing the Views  -  n of N" (`Loader` 144-146, 376-384). Covers header and tabs. Only appears when the press also loads the editor |
| Coming out, back to 3D Model | `Na__LeVeil__ReturnTo3d`: `--over-model` (`fixed; z-index:500`, under the strip 999 and header 1001), shown at once, "Loading Your 3D Model" / "Returning to the First Scene", lifts when the camera stops | Same behaviour and words (VV LoadingVeil 281-310); VV's `.na-le-veil` base IS the fixed z500 rule (VV `LoadingOverlays` 293-306), and the module adds `--over-model` too (line 131) |
| Published drawing (web viewer, every tab press) | `TVM/52/Na__PubDoc__LoadingScreen__.js` 1.0.0 (v2.156.0): opaque cover rises at once with no fade; words fade in after 350 ms: "{drawing} is now loading" + faint status cycling real jobs (Reading the Drawing, Title Block and Notes, Viewport 2 of 3 - Picture ...); reuses `na-le-veil` classes with inline additions; config block `PubDoc__Loading__Config` | none (VV has no published system; its viewer still renders sheets on the device) |
| Lazy-load failure | n/a (TV has no lazy load) | `Na__LeLoadScreen` error state: message, reason, Reload Page, Back to 3D Model (`LoadingOverlays` VV-only "Load Error State" region 120-180, `Styles__Boot` 222-273) |

Three consequences for parity:

1. **VV has no in-host first-open veil at all.** After TabStrip 2.0.0 is ported, the editor will often already be
   loaded by the time the first drawing tab is pressed (a Specification or Register press from the 3D view, or a Dev
   action, loads it first). Then no cover appears for the expensive first render: the reader is handed a blank page
   that fills in, which is exactly what TV v2.83.0 and VV v2.70.0 were written to stop. VV needs TV's `FirstOpen`.
   (Verifier note: this reverses a divergence VV v2.70.0 recorded on purpose - "Two overlays over one crossing would be
   a duplication, not a port", VV devlog line 182, VV LoadingVeil PORT NOTE lines 57-61, ledger row 1241. The reversal
   is justified by the compact strip, but the port must rewrite that PORT NOTE and ledger row, not just add code.)
2. **VV's loader screen does not look like TV's veil**, hides the fold, and uses sentence case where Adam asked for
   Title Case ("Title case, and a plain '  -  ', both Adam's" - TV v2.83.0).
3. **The published loading screen depends on TV's two-mode veil CSS** (in-host base + `--over-model`). VV's
   one-mode CSS would mount it as a fixed full-viewport cover at z500 instead of inside the host.

Recommended design for VV (WP-S10-01 + WP-S10-03), keeping VV's lazy loader:

- Port TV's veil region of `LoadingOverlays` verbatim (two modes). VV's coming-out veil already adds `--over-model`.
- Port TV `LoadingVeil` 1.1.0 whole (FirstOpen, ReturnTo3d, Dismiss3d) and keep VV's `DrawingSettled` export as a seam;
  add one VV seam: `FirstOpen(host, { ..., immediate : true })` shows without the 550 ms wait when the loader's cover
  was already up, so there is no gap between the two.
- `Na__LeLoadScreen` loading state: same look and geometry as the in-host veil (class `na-le-veil` with a VV-only
  `na-le-veil--boot` modifier: `position:fixed; left:0; right:0; bottom:0; top:calc(var(--Vale_HeaderHeight) +
  var(--Vale_LayoutTabStripHeight)); z-index:600` and `body.na-layout-editor--active .na-le-veil--boot { top:
  var(--Vale_LayoutTabStripHeight) }` so it follows the fold exactly as the host does); headline "Your Drawings Are
  Loading"; statuses in Title Case ("Fetching the Drawing Tools", "Reading the Drawing Settings"). The error state
  keeps today's full-screen `.loading-overlay--error` look (VV-only, rare).
- The loader adds `na-layout-editor--active` at the moment of a non-quiet sheet press (before the import), so the
  1 s hold starts at the click exactly as in TV (where `Enter` is synchronous), the 3D furniture is hidden at the click,
  and the header folds over the boot veil. The loader removes the class again if the load fails or the editor's config
  has it off. Nothing reads that class as state except CSS (checked: only the two `Styles__Main` files, `AppHeader`, and
  the ModeController constant).
- **VERIFIER CORRECTION (S10-V01).** "The 3D furniture is hidden at the click" is NOT true in VV as things stand. The
  rule that hides it (`body.na-layout-editor--active .na-dropdown-menu, #naBreadcrumbNav, #naPresentationCarousel,
  #naNavToolbar, #naNavHelpPanel, .na-export-overlay, .na-projected-linework, .controls-instructions-panel
  { display:none !important }`) lives in VV `LE/10/Styles__Main__.css` lines 30-50, which the loader only starts to link
  inside `Na__LeLoad__Run` (Loader 325, in parallel with the import), so it applies only once that sheet has downloaded
  and parsed - on a cold load, well after the click. With the class added at the click, the Tools & Settings
  menu (z 1001), nav toolbar (z 1002), help panel (z 1003) and scene carousel (z 1004) would float over a z 600 boot veil,
  and the Tools menu would stay put while the header folds away from it, for the whole cold import. The block must move
  (verbatim, comment included) from VV `Styles__Main` to `Styles__Boot` (TV keeps it in its `Styles__Main`, which TV loads
  at start-up, so the cascade position relative to the 3D sheets is the same). Two more gaps: the 3D canvas is still
  painted under the boot veil until `Enter` hides it (`canvas.style.visibility`), so the `--boot` modifier must be opaque
  (`background-color:#ffffff`, no blur) or the model ghosts through the 94 % veil - TV's in-host veil sits over the opaque
  grey host instead; and the loader must also remove the class when `Na__LeMode__Enter` returns false (e.g. Layout Mode
  switched off meanwhile), not only on load failure / config-off / Back to 3D Model. Once WP-S10-04R lands, a document-tab
  press from the 3D view also enters (EnterUnder), so it gets the early class too, but no drawing wait.
- The loader stops waiting for the drawing itself (`AwaitFirstDrawing`); it hides its boot veil as soon as `Enter` has
  run, and the editor's own `FirstOpen` (shown `immediate`) takes over inside the host. When the press was a document
  tab (Specification, Register, Statements) the editor enters quietly and no drawing wait is shown at all, as TV.

---

### B4 The drawing toolbar (`LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`, TV 1.24.0 vs VV 1.9.0)

TV order (Mount, lines 423-597):
`name | Select, Move, Text, Leader, Dimension, Draw, Rectangle, Circle, Arc, Floor Area, Eyedropper, Image,
[Snap | arrow], Draft, Grid, Grid Snap, Ortho, Axes, (dropper hint), (scope hint) | Raster [Low/Medium/High],
Vector [Low/Medium/High] | Save Sheets (or read-only note), Download PDF, Share`

VV order (Mount, lines 257-361):
`name | Select, Move, Text, Leader, Dimension, Draw, Rectangle, Eyedropper, Snap, Notes, (dropper hint), (scope hint)
| Undo, Redo | Fit, 100% | Raster | Save Sheets (or read-only note), Download PDF`

What VV lacks, by TV devlog:

| TV toolbar version | TV app version | Change | Dependency in VV |
|---|---|---|---|
| 1.10.0 | v2.39.0 | One combined Save toast (R2 and local) | VV has the toast; wording differs (`SavedLocalMessage` keys are TV-only) - transport slice |
| 1.13.0 | v2.107.0 | Draft toggle (K) | `26__System__DraftMode` (TV-only) |
| 1.14.0 / 1.19.0 | v2.111.0 / v2.124.0 | Zoom readout split, then **removed** with Undo, Redo, Fit; keys and the right-click menu keep them | none - can be done now |
| 1.15.0 | v2.113.0 | Ortho toggle (F8) | `32__System__OrthoMode` |
| 1.16.0 | v2.114.0 | Grid, Grid Snap (F6/F7) | `27__System__DrawingGrid` |
| 1.17.0 | 21-Sep, between v2.114.0 and v2.116.0 (in the file's own log only; no app devlog entry) | **Notes toggle removed** (Margin Notes panel "Show notes margin" is the only switch) | none - VV's Margin Notes panel already has the switch (`50/Panel__MarginNotes__.js` line 80) |
| 1.18.0 | v2.116.0 | Image button | `54__Feature__SheetImages` |
| 1.20.0 | v2.129.0 | Snap split button with arrow and the snap options menu | `28__System__ObjectSnap` (VV has `30/Snapping__` instead) |
| 1.21.0 | v2.130.0 | Circle, Arc | `37__System__VectorTools` |
| 1.22.0 | v2.131.0 | Axes toggle (F9) | `33__System__DrawingAxes` |
| 1.23.0 | v2.163.0 | Save Sheets reports a spec held back by lockstep | spec lockstep (spec slice) |
| 1.24.0 | v2.166.0 | Share after Download PDF | `66__Feature__DocumentSharing` |
| (in 1.21/1.22 era) | v2.136.0 | Vector quality select | `20/Na__LayoutEditor__VectorQuality__.js` (TV-only) |
| (with Floor Areas) | v2.104.0 | Floor Area tool (A) | `59__Feature__FloorAreas` |

Two parts are independent of any other port and give an immediate visual match: remove Undo, Redo, Fit, 100% and
Notes (TV 1.17.0 + 1.19.0). The right-click "Zoom to fit", Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, and the key map's
`Nav__ZoomFit` / `Nav__ZoomActualSize` stay (both apps' key files carry them). The rest follows the feature modules;
once they exist the right move is to take TV's whole Toolbar 1.24.0 and re-apply VV's header (S10-F09, WP-S10-02 and
WP-S10-12). Note also VV's Toolbar DEVELOPMENT LOG has duplicate version numbers (1.8.0 on 17-Sep and 13-Sep, 1.9.0
on 19-Sep and 14-Sep); fix while editing.

---

### B5 Panels look

`LE/40/Na__LayoutEditor__Styles__Panels__.css` (TV 1,174 vs VV 1,000 lines). The diff (304 lines) is TV additions
only, plus one rule moved (`.na-le-select--compact`):

- `.na-le-toggle-group` gains `flex-wrap: wrap` and a `--tight` variant (scale buttons wrap instead of clipping; 1:200).
- `.na-le-row__inline-check` (Doors row "Hide swings").
- `.na-le-btn--ref` (reference layer button, v2.123.0).
- **One red for every switch away from its usual state** (v2.154.0): `.na-le-btn--eye.is-off`,
  `.na-le-btn--lock.is-locked`, `.na-le-btn--ref.is-reference` share #9b3b3b on #fbf3f3, border #e8c9c9, hover #f6e7e7.
  VV colours only the lock. Needs `Panel__Layers__` 1.3.0 to set `na-le-btn--eye` / `is-off` (TV 1.3.0 vs VV 1.1.0).
- `.na-le-input--rangebox`, `.na-le-range-suffix` (typable figure beside a slider).
- The "Linked Pair (two values and a padlock)" region (`.na-le-pair*`), used by TV `PanelHost` `LinkedPairRow` and
  `Panel__Dimensions__` (VV has neither: grep finds no `LinkedPairRow` / `na-le-pair` in VV).
- `.na-le-adv-unit` comment adds "%" for post passes.

All rules are additive and inert until their classes appear, so the stylesheet can be taken from TV verbatim now
(S10-F10). (Verifier precision: one TV change is live at once - `flex-wrap: wrap` on the existing
`.na-le-toggle-group`, which is the intended "scale buttons wrap instead of clipping"; the moved
`.na-le-select--compact` rule stays after the base `.na-le-input, .na-le-select` rule in both files, so the move
changes no cascade.) `PanelHost__` (TV 1.6.0 vs VV 1.4.0): 1.5.0 tab hover text (`spec.hint`), 1.6.0 hands every colour input
to the Colour Palette, and TV's 1.2.0 `LinkedPairRow` / `ShowLink` (S10-F11). TV's LEFT column also has two tabs
(Document Preferences | Specification, ModeController 1.20.0, 521-536) which depend on
`58__Feature__ScrapbookSpecification`; VV's left column has no tabs.

---

### B6 Context menus, tooltips, colour palette popover, confirm dialog, toasts

**Sheet context menu.** TV `30/Na__LayoutEditor__ContextMenu__.js` 1.1.0 adds flyouts (a submenu card beside its
row after `FLYOUT_OPEN_MS`, keyboard right/left, Escape takes the flyout first), muted row hints and a "mixed" ring.
Its CSS lives in TV `Styles__Main__Paper__` ("Selection States, Notes and the Context Menu" region:
`.na-le-menu__item--mixed`, `--hinted`, `.na-le-menu__hint`, `--submenu`, `--open`, `.na-le-menu--flyout`
z-index 1201). TV `SheetTools__ContextMenu__` 1.7.0 vs VV 1.2.0 adds: the Layer row with its flyout
(`LayerMenu__` 1.0.0, TV-only), picture rows (Sheet Images), Rotate 90 / Reset rotation on viewports, Vector tools row,
Show in Specification on a bubble, Boolean row. The look and the rows a reader sees after a right-click differ today
(S10-F13). **Verifier correction:** "container-aware menus" is NOT a VV gap - VV's menu already carries
`MenuEnterVector`, `MenuEnterDimension`, `MenuEnterGroup`, `MenuInsertVertex`, `MenuDeleteVertex`, `MenuCloseShape`
and `MenuCloseScope` (TV 1.1.0's "the menu belongs to the open container" was ported under VV's own numbering, which
does not line up with TV's: VV 1.1.0 = paste properties, 1.2.0 = leader clipboard). The TV-only row labels are
`MenuOpenShape`, `MenuFinishView`, `MenuUnlock`, `MenuSnapOff`, `MenuRotateViewportLeft/Right`,
`MenuResetViewportRotation`, `MenuShowInSpecification`, plus the adapter-supplied rows (Layer via LayerMenu, picture
rows via 54 SheetImages, Vector tools and Boolean via 37 VectorTools).

**Tooltips.** TV-only `SheetTools__HoverTooltip__` 1.1.0 (one shared `.na-le-hovertip`, fixed, z-index 1000, flips at
the window edge, bold lead) and `SheetTools__NoteTooltip__` 1.0.0 (a bubble names its note after 500 ms: "EW01  Loggia
Arcade"). CSS in TV `Main__Paper` "Linework Progress and the Hover Tooltip" region. VV has neither (S10-F14). Covered
by TV test `Na__Test__BubbleNoteTooltip__.test.mjs`. Button tooltips: TV's toolbar titles are read from each feature's
config on every sync; VV's are fixed strings for the tools it has - parity follows the toolbar port.

**Colour palette popover** (`TVM/54__Feature__ColourPalette`, v2.126.0, v2.133.0): every colour field opens a white
card of standard swatches (Monochrome greys from TV's DataLib SSOT `MTE100__GreyscaleSeries__`, and Dimensions red /
blue / green at 150) with the browser's colour mixer opened from a proxy directly on top of it; z-index 1300; closes on
pick, outside press, Escape, resize, scroll. VV fields open the bare browser mixer. TV's README is explicit that the
palette stylesheet must be imported by the style index, never injected on first use (S10-F12; wiring in (d)).

**Confirm dialog - TV is the one behind.** Both apps ship the same `03__AppUtils/Na__AppUtils__ConfirmDialog.js`
1.0.0, which falls back to native `window.confirm()` when `#naConfirmDialog` is missing (TV line 143-147). VV's
`index.html` has the markup (lines 1322-1333) and VV `DropdownAndToast` has the styled region (1376-1509). TV's
`Index.html` has no `#naConfirmDialog` and TV has no `.na-confirm-dialog` CSS anywhere, so every confirm in TV's
editor - 11 LE importers (SelectionSet, SheetTools Keyboard, SpecData Transport, SpecEditor Actions, Register Data and
Transactions, Statement Data, Manager and Editor, ScrapbookCustom panel, LE Dev section) plus the presentation Dev
modal - is the browser's grey system dialog. The ledger marks "Async confirm dialog" as closed. For an identical
experience the markup and CSS must go to TV (back-port, S10-F19).
**Verifier correction to the back-port scope:** VV's confirm-dialog CSS region is lines 1375-1462 only; lines
1464-1509 are VV's "Navigation Mode Selector Buttons" region (`.na-navmode__btn`, a VV-only Tools-menu control TV does
not have) and must not be copied. The markup's Cancel button is `na-dropdown-menu__action
na-dropdown-menu__action--secondary`, and TV has no `--secondary` rules at all (TV `DropdownAndToast` has only the base
`.na-dropdown-menu__action` at 480 and its `:hover` at 493), so VV lines 383-402 (`--secondary`, `:hover`, `:active`,
`.is-loading`) must go across too, placed before TV's `.na-dropdown-menu__action:hover` so the cascade matches VV's.
Without them TV's Cancel button renders as a dark primary button beside the red destructive one.

**Toasts.** Same element and look; position differs: TV `bottom: 40px` (`DropdownAndToast` 1264), VV `bottom: 96px`
(1250, "above the floating navigation toolbar"). On a drawing tab the nav toolbar is hidden in both, so the editor's
Save / PDF / layer toasts sit 56 px apart. In the web viewer TV's 40 px toast sits over the dock; VV's clears it.
Decision D-S10-06.

---

### B7 Stylesheet loading model and the service worker

**Two loading models, both deliberate.**

- TV imports every editor stylesheet at start-up from `03/Na__CoreUi__Styles__Index__.css` (lines 161-174), in this
  order: Surfaces, Main, Main__Paper, DraftMode, DrawingGrid, ObjectSnap, DrawingAxes, Panels, Specification,
  Specification__Notes, Specification__Read, SheetImages, Share, WebViewer (LAST); then ColourPalette (182) and
  SpellCheck (190). Feature panels that carry their own sheet link it themselves with `new URL('./...css',
  import.meta.url)` (Patterns, VectorTools, DrawingRegister, Statement x2, ScrapbookCustom / Parametric /
  Specification, FloorAreas).
- VV imports only `LE/01/Styles__Boot__.css` from its index (line 92); `Na__LayoutEditor__Loader__.js`
  `Na__LeLoad__STYLESHEETS` (lines 125-134) links 8 sheets when the editor first loads: Surfaces, Main, Main__Paper,
  Panels, Specification x3, WebViewer (LAST).

Every TV stylesheet ported into VV therefore needs a home decision. The rule set is in (d) and Appendix A.

**The shared service worker token is stale.** VV is served under Whitecardopedia's worker
(`WCP/.../Whitecardopedia__Pwa__ServiceWorker__Logic__.js`, scope covers `/ValeVision3D/`, line 250; live shell JS
and CSS are stale-while-revalidate and rely on the token). The token is `'2026-09-18-1'` (line 229; last commit
4a92a943 18-Sep). VV v2.70.0 (20-Sep) wrote "This release adds a module and two exports ... A warm client whose cached
copy of `Na__LayoutEditor__SnapshotRenderer__.js` lacks the two new exports will break the editor until a second
visit. The token needs bumping with this release." It was not bumped, and v2.71.0 (28-Sep) changed shell files again.
Separately, the ledger's 18-Sep row "ValeVision has no service worker or installability module, so there is no shell
cache to evict" is wrong. Every UI work package in this slice touches shell CSS or JS and must bump this token
(S10-F17). VV's loader-linked sheets are not in the precache list either - the same risk TV's ColourPalette README
warns about ("a lazily injected sheet ... paints the previous release on the first load after an edit"); the token bump
is the only guard.

**VERIFIER CORRECTION - the bump is Adam's call, and bumping as things stand has two side effects.**
- The ledger already records this exact question and Adam's answer: lines 89-94 and 159-173 ("Whether to bump before
  deploying is ADAM'S call, not a port's: the token evicts every Vale app's caches, models included. Raised with him on
  20-Sep-2026; not changed."). The models bucket is named from the same token (`wpwa-models-${PWA_SW_VERSION_TOKEN}`,
  WCP logic line 233), so every bump re-downloads every client's GLBs. Slices S04b, S06a, S08 and S11 treat it the same
  way. So "every package must bump" is withdrawn: F17 becomes a decision (D-S10-13), and the recommended fix is to give
  the models (and thumbnails) buckets a token of their own, so a shell bump costs only shell files and can then be routine.
- The ledger's 18-Sep row is not the only stale one: 19 rows say "n/a - this tree has no PWA worker" or "no service
  worker" (lines 340, 377, 384, 394, 404, 412, 420, 429, 439, 446, 452, 505, 522, 532, 542, 569, 615, 849, 1189), although
  the ledger's own section at 135-173 already corrects the premise.
- A bump makes the shared registrar reload every open VV page once (`controllerchange` bridge, Whitecardopedia registrar
  110-150). Unlike TV's registrar (1.1.0, 19-Sep) it does not hold back while the Layout Editor has unsaved sheets - VV
  deliberately skipped publishing the flag on the wrong belief that it has no worker (ledger row 236; S03b D-S03b-07) -
  and unlike TV's 1.2.0 (TV v2.75.0) it also reloads on a FIRST install, so every first visit to VV (and every first launch
  of an installed iPad icon) loads the model, reloads, and loads it again. TV 1.3.0 (29-Sep) also registers with
  `updateViaCache: 'none'` so a bump is seen at once; the WCP registrar registers with defaults (line 195). See S10-V05.

---

### B8 `03__Style__AppStylesheets` file by file

| File | TV lines | VV lines | -w diff (ins/del TV->VV) | Finding |
|---|---|---|---|---|
| `Na__CoreUi__Styles__BaseLayout__.css` | 38 | 37 | 2/3 (header) | identical |
| `Na__CoreUi__Styles__Fonts__.css` | 61 | 38 | 4/27 | VV lacks Open Sans Medium 500 (TV 29-45, added 20-Sep for the Statement Writer; also asked for by toasts and menu headings); VV fonts load only from `https://www.noble-architecture.com/assets/AD04_...` (an NA host) while TV loads local-first then the NA CDN. S10-F22 |
| `Na__CoreUi__Styles__Index__.css` | 191 | 113 | 36/114 | Loading model (B7); TV imports 75 UserInstructions, 76 Fullscreen, 27 ContextMenu, PwaInstallability, SceneInspector, CacheAndStorage, 47/49 dev sheets, LE sheets, 54, 55; VV imports 61/62/60/64, VideoStudio, ExportRenderLayers, Styles__Boot; DevToolsMenu imported last in VV, after AppHeader in TV (both valid: it must follow DropdownAndToast and AppHeader) |
| `Na__CoreUi__Styles__RenderCanvas__.css` | 19 | 19 | 2/2 | VV canvas clears the tab strip (`top: calc(header + strip)`, lines 9, 14); TV canvas is under the header only, so a visible strip overlays the top 36 px of the 3D view. D-S10-04 |
| `Na__ImageExport__Styles__ViewportOverlays__.css` | 133 | 142 | 15/6 | Same clearance difference for the safe frame (VV 29, 32); VV-only `--hide-thirds` (Video Studio) - keep |
| `Na__PresentationMode__Styles__SceneCarousel__.css` | 1,215 | 1,087 | 127/255 | Tab-strip clearance identical (line 204 both); scene editor regions belong to the presentation slice |
| `Na__UiFeature__Styles__AppHeader__.css` | 310 | 265 | 34/79 | Fold identical (B1); narrow-screen title brand divergence |
| `Na__UiFeature__Styles__ControlsHelpPanel__.css` | 255 | 254 | 5/6 | VV caps `.controls-panel-content` at `min(600px, calc(100vh - 180px))` - 3D tab only; offer to TV |
| `Na__UiFeature__Styles__DevToolsMenu__.css` | 176 | 182 | 7/1 | VV adds two resets because its base dropdown sheet clamps and scrolls `details` - equivalent result; keep |
| `Na__UiFeature__Styles__DropdownAndToast__.css` | 1,301 | 1,509 | 623/415 | 3D Tools menu regions differ (3D-tab furniture, hidden on every drawing tab in both). Relevant here: toast offset (B6), VV-only confirm dialog region (B6), VV-only Scene Inspector region (TV split it into its own file) |
| `Na__UiFeature__Styles__LoadingOverlays__.css` | 339 | 344 | 91/86 | Veil region (B3); TV-only Model Group Transition overlay (design phase switch - not drawing); VV-only Load Error State, `--opaque`, `__status--error` (keep) |
| `Na__UiFeature__Styles__NavigationToolbar__.css` | 453 | 528 | 135/60 | Comments; hidden class name `na-nav-toolbar--hidden` (TV, `NavigationToolbar__Controls` line 100) vs `na-nav-toolbar--drawing-hidden` (VV line 317) - each app consistent; 3D tab only |
| `Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css` | 87 | - | TV-only | Optional dev tool (B11) |
| `Na__UiFeature__Styles__PwaInstallability__.css` | 447 | - | TV-only | VV links `../Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__PwaInstallability__.css` (index.html line 45): permanent |
| `Na__UiFeature__Styles__SceneInspector__.css` | 272 | - | TV-only | Same rules as VV's `DropdownAndToast` region 970-1242 (28/27 lines differ): file-structure divergence only |

---

### B9 Entry HTML

- Header markup (TV `Index.html` 168-186, VV `index.html` 161-178) is structurally identical: `.app-header`, left logo
  container with `#naHeaderDevToolsSlot`, right `<h1 class="app-header__title">`. Differences are brand only: logo
  source and alt (NA PNG on the NA site vs `../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_
  HorizontalFormat__.png`), title text, favicon, apple-touch icons and manifest (VV uses Whitecardopedia's).
- Overlays: TV has `#naModelGroupTransitionOverlay` (design phase switch, TV v2.7.2 - not drawing). VV has the
  confirm dialog markup (1322-1333). Both have `#loadingOverlay` and `#naLayoutLoadingOverlay`.
- The tab strip is not in either page's markup; both insert `<nav id="naLayoutEditorTabStrip">` after `.app-header`
  from JS.
- Editor initialisation: TV imports ModeController, TabStrip, DevMenu and `66/Na__LayoutEditor__Share__Open__.js`
  (901-904) and initialises them at 1718-1734. VV imports only the loader (1442) and calls `Na__LeLoad__Initialize`
  (2270-2281). Keep VV's (lazy loading is VV's documented design, ledger 1087-1101); the Share-link opener belongs to
  the document sharing slice and would initialise through the loader in VV.

---

### B10 Fonts

- TV `Fonts.css`: Open Sans 400, 600, **500 (Medium)**, 300, each `src` local
  `../../01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/...` first, NA CDN second.
- VV `Fonts.css`: 400, 600, 300 only, each from `https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-
  Files/...`. VV's drawings and panels therefore depend on Noble Architecture's web host for their typeface, and any
  `font-weight: 500` (toasts, dropdown headings, and every Statement Writer heading once ported) is matched down to
  Regular.
- PDF embedding (`60/Na__LayoutEditor__PdfFonts__`, TV-only) is the PDF slice's; the screen face is this slice's.
- Recommendation: add the Medium face now (identical rendering), and decide where VV's font files live (D-S10-05).

---

### B11 TV-only / VV-only 3D-tab UI modules

None of these is part of the drawing editor; all are hidden or inert on drawing tabs. Listed so the planner can
decide whether "identical experience" extends to the 3D tab.

| Module | TV | VV | Notes |
|---|---|---|---|
| Right-click on the 3D model (isolate floor, hide element, doors) | `27__System__ContextMenuSystem` 1.0.0 (v2.10.0), CSS imported by TV index line 103 | none (VV slot 27 is free) | Orbit mode, mouse only; no LE interplay (grep finds no LE references) |
| User Guide overlay | `75__System__UserInstructionsSystem` 2.4.0 | none (slot 75 free) | No drawing content in TV's guide |
| Full screen | `76__System__FullscreenMode`: Tools row with ON/OFF badge driven by `fullscreenchange`; "Better in Full Screen" card on every app open, suppressed on locally served builds (Prompt 1.2.0) | `60__Feature__FullScreenMode` (Mar-2026, unversioned): menu row "Enter / Exit Full Screen", no invitation | Different folder number, type word and casing (`System`/`Fullscreen` vs `Feature`/`FullScreen`), namespaces `Na__UiFeature__FullscreenMode__*` vs `Na__Feature__FullScreenMode__*`. D-S10-07 |
| PWA install | `62__Feature__AppInstallability` + own stylesheet | Whitecardopedia's stack (index.html 33-45) | VV's 62 is `62__Feature__EmailWorkers`: a folder-number collision if ever adopted. Permanent |
| Breadcrumb | none (TV's `Styles__Main` still hides `#naBreadcrumbNav`, a harmless leftover from the port) | `64__Feature__BreadcrumbNav` 1.0.0 (Whitecardopedia navigation, Alt+Backspace) | Keep (Vale-only) |
| Cache & Storage dev panel | `70/Na__UiFeature__DevMenu__CacheAndStorage__Controls.js` 1.0.0 + stylesheet (v2.8.1) | none (VV has `PurgeAppCache__Button`) | Uses `window.TrueVision__Pwa__ServiceWorker__Registrar.clearCache`; VV would call Whitecardopedia's registrar. Useful given B7 |
| Share link / email / notifications | none | `61`, `62`, `63` | Vale-only |

---

### B12 Mobile / iPad, keyboard focus, reduced motion

- **Phones.** Header 48 px and fold identical; title brand divergence (B1.5). The TV compact strip fits five tabs on a
  desktop and shows its arrows at 375 px (TV v2.158 verified "at 375px the strip overflows, the next arrow from 3D
  Model opens D01 (no menu)"). The Drawings menu is clamped `min(380px, calc(100vw - 16px))` and 8 px inside the
  window. The web viewer dock and touch controls are header-only diffs (identical). iPad "drawing keeps the finger"
  (TV v2.65.2) is in VV v2.58.1.
- **Keyboard focus.** TV's Drawings menu: the open row takes focus on open, arrows / Home / End walk rows, Escape closes
  and returns focus to the tab, keys are stopped so the sheet underneath never nudges (TabStrip 542-605), plus
  `.na-le-tabs__menu-row:focus-visible`. Entering a drawing from another tab restarts the sheet keyboard and gives the
  stage focus (`RestartSheetKeys`, `Na__LePc__TakeKeyboard`, ModeController 1.25.0 lines 611-617), and three keyboards
  (3D, sheet, documents: `03/Na__AppUtils__KeyScope__` + `LE/31__System__DocumentKeys`, v2.110.0) keep a letter
  typed into a document a letter. VV has none of these. TV has 17 `:focus-visible` rules in scope vs VV 9; the extra
  8 belong to TV-only features (tab menu rows, padlock, snap menu rows, spec lockstep choices, leaderless grips,
  statement controls). Neither app styles `.na-le-tabs__tab:focus-visible` (browser default in both - same).
  (Verifier: counted as lines containing `:focus-visible` across `03__Style__AppStylesheets` plus every LE stylesheet:
  TV 17, VV 9 - the 16 / 8 quoted in finding S10-F30 is the same set miscounted. A press on the stage taking the
  keyboard back from a panel control, TV `Controls__Pc` 1.4.0 / v2.115.0 "M Was Never Stuck", is also missing in VV
  (`Controls__Pc` 1.1.0); it is owned by slice S03b, not repeated here.)
- **Reduced motion.** Identical policy: no `prefers-reduced-motion` branch on the fold in either app (Windows'
  Animation effects off on the studio PC reports `reduce`). TV's only branch is the published reader's tier fade
  (`TVM/52/Na__PubDoc__Styles__Main__.css` 116-121) and TV's Specification Scrapbook halo explicitly has none
  (`58/...Styles__ScrapbookSpecification__.css` 390-396). Ports must carry these comments verbatim so the branch is not
  re-added blind.

---

### B13 Dev Tools menu sections

- Drawing sections present in both: Navigation Modes, Presentation Scenes editor, Floor Plans, Elevations, Cross
  Sections, North, Projected Linework, Layout Editor. Order differs: VV lists Cross Sections before the scene editor,
  TV after Elevations (cosmetic, low).
- Layout Editor section: VV 1.4.0 is ahead structurally (loader facade, opening the section imports it) and carries the
  VV-only "Enable Layout Mode" switch (VV 1.2.0, labels `LayoutModeLabel`, `LayoutModeHint`, `LayoutModeOffNote`).
  TV 1.2.0 (TrueVision) names linework bakes only for viewports of the live design phase (Model Source, TV-only).
- The Dev Tools trigger lives in the header in both (`70/Na__UiFeature__DevMenu__LocalhostOnly.js`, equivalent
  behaviour), so it folds away with the bar on drawing tabs in both, and both close every open menu on entry
  (`Na__LeMode__CloseModelMenus`, TV 469-473, VV 365-369).

---

## (c) Module-by-module table

State: identical / header-only / drifted / tv-only / vv-only / diverged. Paths are relative to each app root.

| TV path | TV ver | VV path | VV ver | State | What VV lacks or does differently (TV devlog) | Recommended action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css` | v2.83.0 | same | v2.70.0 | header-only (rules) | Fold rules identical; VV hides title <=600px | no_action (record re-verified) | Title hidden stays (brand) | - |
| `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` | v2.83.0 | same | v2.70.0 | drifted | No in-host `.na-le-veil` base (abs, z40) / `--over-model` rule (v2.83.0); TV-only design-phase overlay | port_adapted (veil region verbatim) | Keep VV Load Error, `--opaque`, `__status--error`; add `--boot` modifier (WP-S10-03) | - |
| `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | 1.1.0 | same | 1.0.0 | drifted | No `FirstOpen` going-in veil (v2.83.0) | port_whole_reapply_vv | Keep `DrawingSettled` export; `immediate` option for the loader hand-over | S10-F05 |
| `.../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` | 2.0.0 | same | 1.5.0 | drifted | Compact 5-tab strip, Drawings menu, no rename/drag, labels (v2.158.0) | port_whole_reapply_vv | Imports via `Na__LeLoad__*` facade; visibility per D-S10-02; Register/Statements per D-S10-01 | S10-F07, ModeController EnterUnder |
| `.../05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.32.0 | same | 1.18.0 | drifted | UI-visible: `EnterUnder`/Quiet (1.30.0), FirstOpen call with viewportCount (v2.83), `PreloadMetrics` returns a promise, `returnToOrbit` (1.23.0), `RestartSheetKeys` (1.25.0), VIEW_REGISTER / VIEW_STATEMENT (Register, Statements) | port_adapted (S03a owns logic) | Keep `IsAvailable`, `WaitForFirstDrawing` (make it skip non-sheet views) | S03a |
| none | - | `.../01__Core__Loader/Na__LayoutEditor__Loader__.js` | 1.1.0 | vv-only | - | keep_vv_divergence | Add facade exports for the compact strip; early body class; hand-over to FirstOpen | WP-S10-03/04 |
| none | - | `.../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js` | 1.0.0 | vv-only | Looks like the start-up screen, not TV's veil | port_adapted (restyle loading state) | Error state unchanged | S10-F05 |
| `.../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` (tab strip region 62-262) | v2.158.0 | `.../01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` (29-191) | v2.45.0+ | drifted (by location: permanent) | Menu, caret, `--menu-open` rules; rename rules removed | port_verbatim (region) with TabStrip 2.0.0 | Rules live in Boot (pre-editor) | S10-F03 |
| `.../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` (rest) | - | same | - | header-only (by design) | Tab strip and Dev section moved to Boot (verifier: every other rule is identical, checked with comments stripped) | update_wiring (verifier, S10-V01): move the 3D-furniture hiding block (VV 30-50) to Boot with WP-S10-03R | - | WP-S10-03R |
| `.../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css` | v2.137+ | same | - | drifted (429) | Stack z-order, clear frames, vector hold, fog, 2 px dashed counter-scaled edges, grips state colours, viewport carry, hover tooltip, context-menu flyout rules; osnap rules moved to 28 | port_whole_reapply_vv (deferred) | Keep VV osnap block until 28 lands | SheetSurface 1.13, Grips, ObjectSnap, ViewportSnapMove, VectorQuality, DepthFog |
| `.../10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css` | v2.72.0 | same | - | header-only | - | no_action | - | - |
| `.../40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css` | v2.154.0 | same | - | drifted (additive) | One-red switches (v2.154.0), Ref button (v2.123.0), padlock pair, rangebox, wrap / tight scale buttons | port_verbatim | Header lines only | - |
| `.../40__Ui__Panels/Na__LayoutEditor__PanelHost__.js` | 1.6.0 | same | 1.4.0 | drifted | Tab hints (1.5.0), Colour Palette attach (1.6.0), LinkedPairRow (TV 1.2.0) | port_adapted | Palette attach once 54 exists | 54 slice |
| `.../40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` | 1.24.0 | same | 1.9.0 | drifted | Undo/Redo/Fit/100% and Notes removed (1.17.0, 1.19.0); 12 new controls | port_adapted now (slim); port_whole_reapply_vv later | VV header; fix duplicate devlog versions | 26, 27, 28, 32, 33, 37, 54, 59, 66, VectorQuality |
| `.../30__System__SheetTools/Na__LayoutEditor__ContextMenu__.js` | 1.1.0 | same | 1.0.0 | drifted | Flyouts, hints, mixed ring (v2.123.0 era) | port_verbatim | - | Main__Paper menu CSS |
| `.../30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js` | 1.7.0 | same | 1.2.0 | drifted | Layer row, picture rows, rotate, vector tools, Show in Specification, Boolean | port_adapted (sheet-tools slice) | Rows for absent features omitted | LayerMenu, 54, 37, NoteFor |
| `.../30__System__SheetTools/Na__LayoutEditor__LayerMenu__.js` | 1.0.0 | - | - | tv-only | Layer flyout (v2.123.0) | port_verbatim | - | ContextMenu 1.1.0, SheetModel__Layers 1.3.0 (MoveToLayer) |
| `.../30__System__SheetTools/Na__LayoutEditor__SheetTools__HoverTooltip__.js` | 1.1.0 | - | - | tv-only | Pointer tooltip | port_verbatim | - | Main__Paper hovertip rules |
| `.../30__System__SheetTools/Na__LayoutEditor__SheetTools__NoteTooltip__.js` | 1.0.0 | - | - | tv-only | Bubble names its note (v2.144.0) | port_verbatim | - | HoverTooltip, LeaderGeometry `NoteFor`, SpecLinks |
| `.../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` (tab rules 19-40) | v2.162.0 | same | - | drifted | `--spec` margin dead in TV (tab is `--specification`) | port with TabStrip | Unsynced dot rule is linked lazily in VV: fine (tab dot only matters once the editor is loaded) | S10-F03 |
| `.../70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | 1.3.0 | same | 1.4.0 | drifted (VV ahead) | VV: facade + Layout Mode switch; TV: design-phase bake naming | keep_vv_divergence | NoSheets wording per D-S10-02 | D-S10-02 |
| `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` | 1.2.0 | same | 1.1.0 | drifted | Published reader + loading screen; dock Share (v2.155-2.166) | port_adapted (publishing slice) | VV R2 / worker | 52, 53, 66 |
| `.../80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css` | - | same | - | header-only | - | no_action | Stays LAST in loader list | - |
| `02__Src__AppModules/52__System__Layout__PublishedDocuments/Na__PubDoc__LoadingScreen__.js` | 1.0.0 | - | - | tv-only | Published cover (v2.156.0) | port_verbatim | Config block in VV's PubDoc config | S10-F05, 52 port |
| `02__Src__AppModules/52__System__Layout__PublishedDocuments/Na__PubDoc__Styles__Main__.css` | - | - | - | tv-only | Not linked anywhere in TV (only its README mentions it) | no_action (mirror TV) | - | 52 port |
| `02__Src__AppModules/54__Feature__ColourPalette/*` (Picker 1.1.0, Manager 1.1.0, Styles) | 1.1.0 | - | - | tv-only | Palette popover (v2.126.0, v2.133.0) | port_verbatim (54 slice) | CSS from VV index; DataLib SSOT key check; palette contents D-S10-10 | - |
| `02__Src__AppModules/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css` | - | - | - | tv-only | Field and word bar | port_verbatim (55 slice) | CSS from VV index | 55 slice |
| `02__Src__AppModules/27__System__ContextMenuSystem/*` | 1.0.0 | - | - | tv-only | 3D right-click | needs_decision (optional) | Same folder number free in VV | - |
| `02__Src__AppModules/75__System__UserInstructionsSystem/*` | 2.4.0 | - | - | tv-only | User Guide | needs_decision (optional) | - | - |
| `02__Src__AppModules/76__System__FullscreenMode/*` | 1.0.0 / 1.2.0 | `02__Src__AppModules/60__Feature__FullScreenMode/*` | (unversioned) | diverged | Badge + startup card (v2.8.0) | needs_decision | Renumber 60 -> 76 if adopted | - |
| none | - | `02__Src__AppModules/64__Feature__BreadcrumbNav/*` | 1.0.0 | vv-only | - | keep_vv_divergence | - | - |
| `02__Src__AppModules/70__System__DevTools/Na__UiFeature__DevMenu__CacheAndStorage__Controls.js` | 1.0.0 | - | - | tv-only | Dev panel (v2.8.1) | port_adapted (optional) | Whitecardopedia registrar | - |
| `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js` | 1.0.0 | same | 1.0.0 | header-only | TV lacks the markup and CSS | backport_to_tv | - | - |
| `03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` | - | same | - | drifted | Medium 500 face; host | port_adapted | Vale-owned host per D-S10-05 | - |
| `03__Style__AppStylesheets/Na__CoreUi__Styles__RenderCanvas__.css`, `Na__ImageExport__Styles__ViewportOverlays__.css` | - | same | - | drifted | VV clears the strip; TV does not | needs_decision | - | - |
| `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` | - | same | - | drifted | Toast 40 vs 96 px; VV confirm and inspector regions | needs_decision / backport_to_tv / rename_move | - | - |
| `03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css` | - | (region in DropdownAndToast) | - | tv-only file | File split only | rename_move (optional) | - | - |
| `WCP/.../Whitecardopedia__Pwa__ServiceWorker__Logic__.js` | - | (shared) | token 2026-09-18-1 | - | Not bumped for v2.70.0 / v2.71.0 | needs_decision (verifier: D-S10-13 - Adam's call per ledger 159-173; split the models / thumbs cache token first) | - | WP-S10-15 first |
| TV `62/TrueVision__Pwa__ServiceWorker__Registrar__.js` | 1.3.0 | `WCP/.../Whitecardopedia__Pwa__ServiceWorker__Registrar__.js` | (own log, 1.2.0 of 26-Jun) | drifted (verifier) | No unsaved-work hold-off (TV 1.1.0), reloads on a first install (TV 1.2.0, v2.75.0), no `updateViaCache:'none'` (TV 1.3.0) | port_adapted (verifier, S10-V05, WP-S10-15) | Neutral flag name per S03b D-S03b-07 | D-S03b-07 |
| none | - | `02__Src__AppModules/31__System__VideoStudio/Na__VideoStudio__Timeline__Stylesheet__.css` (`.na-vs-tl`, fixed, z 1000; shown by `Timeline__Controls` 807-820) | 1.0.0 | vv-only | Not in the drawing-tab hiding list and does not listen for the editor; if a video path is open it floats over the editor host (z 600). Localhost Dev feature | update_wiring (verifier, S10-V03): add to VV's hiding block as a recorded VV-only selector | - | S10-V01 |
| none | - | `install-guide.html` (858 lines), `02__Src__AppModules/03__AppUtils/Na__AppUtils__LoadingOverlay__.js` | - | vv-only | Verifier coverage: a PWA install guide page and the export overlay helper for `#naLayoutLoadingOverlay` (image export, Video Studio, thumbnail bake, render layers). No drawing-editor content | no_action (Vale-only) | - | - |

---

## (d) Wiring notes

1. **Where a ported stylesheet goes in VV** (the single most error-prone wiring point):
   - Drawn before the editor exists (tab strip and its Drawings menu, the boot veil, the Dev section's sheet list):
     `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`.
   - Shown on the way OUT of the editor, or reused by modules that load without the editor (coming-out veil, published
     loading screen): `03/Na__UiFeature__Styles__LoadingOverlays__.css` (as now).
   - Sheets TV imports from its CSS index between `Surfaces` and `WebViewer`: append to `Na__LeLoad__STYLESHEETS`
     (`Loader` 125-134) in TV's order - see Appendix A. `WebViewer` stays LAST.
   - Feature panels that link their own sheet via `new URL('./...css', import.meta.url)` (Patterns, VectorTools,
     DrawingRegister, Statement x2, ScrapbookCustom/Parametric/Specification, FloorAreas): no wiring - they work
     unchanged under lazy loading.
   - Top-level features used outside the editor (`54__Feature__ColourPalette` - also the 3D tab's Plan Annotations
     toolbar; `55__Feature__SpellCheck`): VV `03/Na__CoreUi__Styles__Index__.css`, after the Boot import, as TV
     (182, 190). TV's README forbids injecting the palette CSS on first use.
2. **Loader facade for the compact strip** (`Na__LayoutEditor__Loader__.js`): add `Na__LeLoad__VIEW_REGISTER`,
   `VIEW_STATEMENT`, `OpenRegister`, `OpenStatements` (load-then-call; stubs returning false until the features land),
   `IsSitePlanSheet` (false in VV), `CloseMenu` passthrough not needed. Extend `Na__LeLoad__CheckNames` (284-295) with
   the two new view names so a rename is caught in the console.
3. **Labels before the editor loads.** `Na__LeLoad__GetLabel` returns the fallback until the editor's config loads
   (`Loader` lines ~558-560). The strip renders before that, so VV's `LayoutEditor__Labels__Config` values for
   `ModelTab`, `DrawingsTab`, `SpecificationTab`, `RegisterTab`, `StatementsTab`, `TabsPreviousTitle`,
   `TabsNextTitle`, `AddSheetTab`, `AddSheetTitle` must equal the fallbacks in the ported TabStrip, or a tab renames
   itself the moment the editor arrives. Add the TV keys (`DrawingsTab`, `DrawingsTabTitle`, `DrawingsTabOpenTitle`,
   `RegisterTab`, `RegisterTabTitle`, `StatementsTab`, `StatementsTabTitle`, `TabStripNote`, `SitePlanTabTitle`),
   change `SpecificationTab` to "Specification", `TabsNextTitle` / `TabsPreviousTitle` to "The tab after / before this
   one", and reword `NoSheets` per D-S10-02.
4. **ModeController seams** (S03a implements; listed because the fold and veils depend on them): `Na__LeMode__Quiet`
   + `EnterUnder`; `FirstOpen` call in `Enter` gated `!viewer && !Quiet`, with `viewportCount` read from the model;
   `PreloadMetrics` returns its promise; `WaitForFirstDrawing` resolves at once when `View !== VIEW_SHEET` (today it
   only checks `Active`, line 596, so a quiet document-tab entry would hold the loader's screen for a sheet nobody asked
   for); `OpenSpecification` uses `EnterUnder` (VV line 650 calls `Enter(null)` directly).
5. **Loader hand-over** (WP-S10-03): set `na-layout-editor--active` and show the boot veil on a non-quiet sheet press
   before the import; remove the class on load failure, on "Back to 3D Model", and when the editor's config has it off;
   after `action(editor)` hide the boot veil (no drawing wait) - the editor's `FirstOpen` takes over with
   `immediate : true`.
6. **Toolbar slimming** removes the toolbar's imports of `Na__LeNav__Fit`, `Na__LeNav__ZoomTo`,
   `Na__LeHist__CHANGED_EVENT/CanUndo/CanRedo/Undo/Redo`, `Na__LeSurface__ZOOM_EVENT/GetZoom`,
   `Na__LeModel__UpdateMarginNotes`, `Na__LeRec__MarginNotes` (VV Toolbar 89-118) and their listener entries in Mount and
   Unmount; `Na__Verify__Exports__.mjs` must still pass. The right-click menu (`MenuZoomFit`, Undo, Redo) and the
   specification bar keep the `Undo` / `Redo` labels.
7. **Service worker.** Bump `PWA_SW_VERSION_TOKEN` in `WCP/02__Src__AppModules/62__Feature__AppInstallability/
   Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (line 229) with every release that touches VV shell JS or CSS,
   with a log line naming the VV version (the file's own convention, lines 30-216).
   **Verifier correction:** only per D-S10-13 - the ledger records the bump as Adam's call (it evicts every Vale app's
   caches, models included; raised 20-Sep, not changed). No swarm package bumps it on its own. Before bumping becomes
   routine: (a) give `wpwa-models-` and `wpwa-thumbs-` a token of their own (WCP logic 229-233) so a shell bump keeps the
   GLBs; (b) land S10-V05 in the WCP registrar (unsaved-work hold-off, no reload on a first install, `updateViaCache:'none'`).
8. **Confirm dialog back-port to TV**: TV `Index.html` needs VV's markup block (VV 1322-1333) after `#naToastNotification`
   (TV line 798), and TV needs the `.na-confirm-dialog` CSS region (VV `DropdownAndToast` 1375-1462 - NOT to 1509: 1464-1509
   is VV's VV-only Navigation Mode Selector region) plus VV's `.na-dropdown-menu__action--secondary` rules (VV 383-402),
   which the dialog's Cancel button uses and TV lacks; TV's PWA token
   (`TVM/62/TrueVision__Pwa__ServiceWorker__Logic__.js`) must be bumped. (Corrected by the verifier.)
9. **No new module crosses into the 3D tab.** Every fold, veil and strip change keys on `na-layout-editor--active`,
   `na-layout-tabs--visible` or `--Vale_LayoutTabStripHeight`; no 3D-tab file needs editing except the decisions in
   D-S10-04 / D-S10-06.
10. **(Verifier, S10-V01) The 3D-furniture hiding block moves to `Styles__Boot` before any early body class.** VV
    `LE/10/Styles__Main__.css` lines 30-50 (comment plus the eight `body.na-layout-editor--active ...` selectors and their
    `display:none !important`) go verbatim into `LE/01/Styles__Boot__.css`, ahead of the Tab Strip region, and are removed
    from `Styles__Main`. In TV the same block sits in `Styles__Main`, which TV loads at start-up, so this restores TV's
    timing rather than diverging from it. Optional VV-only line in the same rule: `body.na-layout-editor--active .na-vs-tl`
    (the Video Studio timeline, S10-V03), recorded as a VV divergence.
11. **(Verifier) Colour palette attach points.** Besides `PanelHost` 1.6.0, TV attaches the palette in its 3D-tab
    `43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js`; VV's equivalent is
    `44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js` (its dimension colour swatch, `na-plan-anno__swatch`),
    which the 54 slice must wire for the same behaviour on the 3D tab.
12. **(Verifier) Cascade order of 54 / 55 against the editor sheets.** In TV the palette and spell-check sheets import
    AFTER every editor sheet (index 182, 190 after 161-174). In VV, loader-linked editor sheets are appended to the end of
    `<head>` and so land AFTER the whole CSS index, 54 and 55 included - the order flips. Both sheets use their own
    namespaces (`.na-colour-palette*`, `.na-spellcheck-*`), so the only exposure is an element carrying both
    `.na-spellcheck-field` and an editor class that sets the same property (`white-space`, `outline`, `cursor`,
    `user-select`); the 55 slice must check its host fields, or VV can link 54/55 last from the loader list as well.

---

## (e) UI notes - brand tokens vs behaviour and layout

**Brand (VV keeps its own):**
- Header logo image and alt, `.app-header__title` text, favicon, apple-touch icons, manifest, `theme-color`.
- Narrow-screen title hidden in VV (logo carries the brand) - D-S10-08 confirms.
- `--Vale_*` token NAMES are shared by both apps (TV kept them as a legacy of the original port). Their VALUES in the
  shared sheets are identical: `--Vale_PrimaryBrand` and text are `#172b3a` in both (NA brand blue and Vale brand
  blue happen to be the same hex), so there is no colour token to re-brand in any sheet of this slice.
- Typeface: Open Sans in both. Hosting is an independence question, not a brand one (D-S10-05).
- Colour palette CONTENTS (if Adam wants a Vale group) - D-S10-10. The palette's look is not brand-specific.

**Behaviour and layout (must match TV):**
- Fold tokens and rules (already match), tab strip structure and menu, veil geometry / timing / words, toolbar order,
  panel rules, context-menu flyouts and rows, tooltips, confirm dialog look (after the back-port), toast position
  (after D-S10-06), focus and keyboard handling, z-index ladder (verifier-corrected order): canvas 0 < in-host veil 40
  (inside the host) < export overlay 500 = coming-out veil 500 < editor host 600 (= the proposed VV boot veil) < tab strip
  999 < hover tooltip 1000 (fixed) < header 1001 = dropdown menus 1001 < Drawings menu 1002 = nav toolbar 1002 (hidden on
  drawing tabs) < help panel 1003 < scene carousel 1004 < context menu 1200 / flyout 1201 < colour palette proxy 1299 /
  palette 1300 < VV-only video timeline menu 1400 < toast 9999 = start-up overlay 9999 = VV confirm dialog 9999 < image
  export overlays 10000+.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S10-01 | VV has no Document Register (51) or Statement Writer (52) yet. Port the compact strip before they land? | (a) Port now with 3D Model, Drawings, Specification; add Document Register and Design Statements as their features land. (b) Show all five with placeholder pages. (c) Wait for both features | (a). The strip, the Drawings menu and the document-tab fold are independent of those pages; the two tabs are one `appendChild` each once `OpenRegister` / `OpenStatements` exist |
| D-S10-02 | VV's per-project "Enable Layout Mode" switch hides the strip (here and on the live site) until Adam turns it on; TV shows the strip whenever the project has a sheet | (a) Keep VV's gate (recorded divergence). (b) Retire it now (match TV). (c) Back-port it to TV | (a) until VV has the publishing system (52/53): TV keeps unfinished drawings away from clients by publishing (the viewer shows only published drawings, the grey "not yet published" panel otherwise); VV has no such guard, so retiring the gate now would show Vale clients unfinished sheets. Retire it with the publishing port |
| D-S10-03 | VV's first open: keep the full-screen "Loading Layout Editor..." cover or make it look and sit exactly like TV's in-host veil (header and tabs visible, the fold seen)? | (a) Restyle as TV's veil with the loader hand-over (WP-S10-03). (b) Keep the start-up look | (a). It is the one place the fold Adam named is hidden in VV |
| D-S10-04 | 3D canvas and image-export safe frame under the tab strip: VV moves both below the strip; TV leaves them under the header, so a visible strip covers the top 36 px of the 3D view and of the safe frame | (a) Back-port VV's clearance to TV (TV v2.65.1 already back-ported it for the nav toolbar, help panel and dropdown). (b) Align VV to TV. (c) Record as divergence | (a), after a look in TV at a project with sheets to confirm the safe frame's top is hidden today. Not part of the drawing editor; low |
| D-S10-05 | Where VV's Open Sans files live: today `https://www.noble-architecture.com/assets/AD04_...` (an NA host) | (a) Vale-owned copy (e.g. `WebApps/assets__CommonApplicationAssets/Fonts/` or VV's R2 / CDN) with the NA URL as second source. (b) Keep NA host | (a), in line with "its own R2 Worker and file structure independent of TrueVision's". Add the Medium (500) face either way |
| D-S10-06 | Toast offset: TV 40 px, VV 96 px | (a) VV takes 40 px on drawing tabs only (`body.na-layout-editor--active .na-toast { bottom: 40px }`), keeping 96 px on the 3D tab. (b) TV takes 96 px (clears the web viewer dock). (c) Leave | (b): VV's offset also clears the viewer's dock; one value in both. Low |
| D-S10-07 | Full screen: VV's older 60 "Enter / Exit Full Screen" row vs TV's 76 (ON/OFF badge, startup invitation, suppressed on localhost) | (a) Adopt TV's 76 in VV (renumber 60 -> 76, rename namespaces, Tools row in VV's menu style). (b) Keep VV's | (a) only if the 3D tab is in scope for "identical"; not needed for the drawing editor |
| D-S10-08 | Narrow-screen header title (TV 18 px, VV hidden) | (a) Keep both (brand). (b) Show VV's at 18 px | (a) |
| D-S10-09 | Confirm dialogs: TV has no markup / CSS and falls back to `window.confirm`; VV shows a styled modal | (a) Back-port VV's markup and CSS to TV. (b) Remove VV's (match TV's native dialog) | (a). The ledger already treats it as back-ported |
| D-S10-10 | Colour palette contents for VV (TV's: NA DataLib SSOT greys + Dimensions red / blue / green) | (a) Identical palette (greys checked against VV's own DataLib SSOT). (b) Add a Vale group (e.g. Vale blue #172b3a) | (a) for parity; a Vale group is an additive config edit later |
| D-S10-11 | TV-only 3D-tab modules 27 (3D right-click), 75 (User Guide), Cache & Storage dev panel, Scene Inspector stylesheet split | Port each / skip | Skip for drawing parity; Cache & Storage is worth porting (adapted to Whitecardopedia's registrar) given the stale-token history |
| D-S10-12 (verifier) | The compact strip removes drag-to-reorder from the tabs. In TV a sheet is reordered only from the Document Register (`Register__Editor` BindRowDrag, `Register__Numbering` writes `Sheet__Order`); TV's Sheet panel renames but does not reorder. VV has no Document Register, its Sheet panel only renames, and its Dev section only creates, duplicates and deletes - so after WP-S10-04 a VV sheet could not be reordered at all | (a) Keep drag-to-reorder on the Drawings menu rows in VV (localhost, editable) until the register is ported - a recorded VV divergence, removed with the register port. (b) Add Move earlier / Move later to VV's Dev section sheet list (calls the existing `Na__LeLoad__ReorderSheet`). (c) Port the Document Register (51__Feature__DrawingRegister, slice S07a) before the compact strip | (a): smallest change, nothing lost, and it disappears with the register port; (c) if the register is due first anyway |
| D-S10-13 (verifier) | The shared Whitecardopedia service-worker token: bump it for the VV releases this work produces? The ledger (89-94, 159-173) already records it as Adam's call - a bump evicts every Vale app's caches, models included - raised 20-Sep and not changed | (a) Split the cache names first (models and thumbnails get their own token, WCP logic 229-233), land S10-V05 in the registrar, then bump the shell token once per VV deploy wave. (b) Bump as is, once per deploy wave, accepting the model re-download and the reload of open pages. (c) Never bump; rely on stale-while-revalidate and a second visit | (a). Until Adam answers, no package bumps the token; packages list the WCP file as a hot file only so the release that does bump knows what it covers |

---

## (g) Proposed work packages

Sizes: S < 1 day, M 1-2 days, L 3+ days. Every package ends with `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs`
and `Na__Verify__ModuleGraph__.mjs` passing in VV, a VV devlog entry (minor bump, VV convention), the ledger rows, and
the shared service worker token bump (WP-S10-08 owns the convention; every package that ships shell CSS / JS bumps it).
**Verifier correction:** the token bump is NOT a per-package step - it follows D-S10-13 (Adam's call; ledger 159-173).
Read "WCP service worker" in the hot-file lists below as "note it in the release that bumps", not "bump it here".

### WP-S10-01 - Veil CSS to TV's two-mode region (S)
- Scope: replace VV `LoadingOverlays` region "Layout Editor Return-to-Model Veil" (269-344) with TV's "Layout Editor
  Loading Veils" region (256-339) verbatim; keep VV-only Load Error State, `--opaque`, `__status--error`.
- Files VV: `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css`.
- Hot files: `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`.
- Acceptance: the veil region's rules equal TV's byte for byte (comments may name VV); returning to 3D still shows
  "Loading Your 3D Model" over the canvas and under the strip and header (VV module adds `--over-model`).
- Risk: none functional (the one VV veil already carries `--over-model`).

### WP-S10-02 - Toolbar slimmed to TV (S)
- Scope: remove Notes, Undo, Redo, Fit and 100% buttons, their gaps, imports and listeners (TV Toolbar 1.17.0 +
  1.19.0); keep the keys and right-click entries; DESCRIPTION and PURPOSE text as TV's; fix VV's duplicate devlog
  version numbers; bump to 1.10.0.
- Files VV: `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`.
- Hot files: WCP service worker.
- Acceptance: toolbar reads `name | Select Move Text Leader Dimension Draw Rectangle Eyedropper | Snap | Raster |
  Save Sheets, Download PDF` with no doubled separator; Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z undo and redo on the stage;
  right-click on bare paper offers Zoom to fit, Undo, Redo; Margin Notes panel "Show notes margin" still toggles the
  margin; read-only viewer shows the read-only note and Download PDF.
- Verifier notes: (1) the read-only branch of the toolbar is only reachable with the web viewer switched off in config
  (`Na__LeVw__IsViewerMode` = not editable AND `LayoutEditor__WebViewer__Config` enabled; a viewer session mounts no
  toolbar at all), so test that item with the viewer off. (2) Mirror TV 1.19.0's separator placement exactly: VV today
  closes the editable block with a Gap and then adds another after Fit / 100%, so deleting only the buttons would leave
  `name | | Raster` in the read-only branch. (3) Safe to remove the history listener: VV's undo also re-announces the
  sheet through `Na__LeModel__AnnounceRestore` (History line 213), which is what TV 1.19.0 relies on to re-sync.

### WP-S10-03 - First-open veil and fold, exactly as TV (M) - SUPERSEDED BY WP-S10-03R (verifier)
> REFUTED by verifier as written: the early body class would leave the 3D menus, nav toolbar, help panel and carousel
> floating over the boot veil (their hiding rule is lazily linked); the canvas would ghost through a 94 % veil; Enter
> returning false is not handled; and the "Specification from the 3D view" acceptance item cannot be tested before
> WP-S10-04. Use WP-S10-03R at the end of this section.
- Scope: (1) port TV `LoadingVeil` 1.1.0 whole, keep `DrawingSettled` export, add the `immediate` option;
  (2) restyle `Na__LeLoadScreen`'s loading state as `.na-le-veil.na-le-veil--boot` (geometry in (b) B3), headline
  "Your Drawings Are Loading", Title Case statuses; error state unchanged; (3) loader: early body class on non-quiet
  sheet presses, hide the boot veil after `action(editor)`, remove the class on failure / disabled / Back to 3D Model;
  (4) ModeController: call `FirstOpen(host, { specification, textMetrics, viewportCount, immediate })` from `Enter`
  when not viewer and not Quiet; `PreloadMetrics` returns its promise; `WaitForFirstDrawing` returns at once off a sheet.
- Files VV: `.../05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`,
  `.../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js`, `.../01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`.
- Hot files: `.../05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `.../01__Core__Loader/Na__LayoutEditor__Loader__.js`,
  `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` (from WP-S10-01),
  `.../03__Core__Config/Na__LayoutEditor__AppConfig__.json` (optional `Veil*` labels), WCP service worker.
- Depends on: WP-S10-01; D-S10-03.
- Acceptance: cold first press of a drawing tab: the strip and header stay visible; within the area below the strip a
  94 % white blurred veil with the spinner, "Your Drawings Are Loading" and "Drawing the Views  -  1 of N"; the header
  holds 1 s and glides up 1 s with the strip welded to it, over the veil; the veil lifts when every viewport `<img>` is
  decoded. Warm (editor already loaded) first drawing: same veil, shown after 550 ms only if still drawing. A
  Specification press from the 3D view: fold happens, no drawing veil. A forced load failure shows the error state
  full-screen and Back to 3D Model returns with the header down. No regression: Leave still shows "Loading Your 3D
  Model".
- Risk: two covers in sequence - mitigated by identical look and position and the `immediate` hand-over.

### WP-S10-04 - Compact tab strip (TV 2.0.0) (L) - SUPERSEDED BY WP-S10-04R (verifier)
> REFUTED by verifier as written: its risk line says sheet reorder "must remain reachable from the Sheet panel and the
> Dev section", but neither has a reorder control in VV (and TV reorders only from the Document Register), so the port as
> scoped would remove VV's only way to reorder sheets. It also misses the async `CreateSheet` of the "+ New sheet" row and
> the `Ready()` wait VV does not need. Use WP-S10-04R, which depends on the new decision D-S10-12.
- Scope: take TV `TabStrip` 2.0.0 whole; re-apply VV seams (header, console prefix, imports only from the loader
  facade, `IsAvailable` per D-S10-02, async `Enter` / `OpenSpecification`); Register / Statements tabs per D-S10-01;
  copy TV `Styles__Main` tab strip region (62-262) into `Styles__Boot` (drop rename rules, add menu rules); labels per
  (d) 3; facade exports per (d) 2; ModeController `EnterUnder` + Quiet; Spec tab class `--specification` (leave the
  dead `--spec` rule as TV does, or remove it in both).
- Files VV: `.../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js`, `.../01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`.
- Hot files: `.../01__Core__Loader/Na__LayoutEditor__Loader__.js`, `.../05__Core__ModeController/Na__LayoutEditor__ModeController__.js`,
  `.../03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `.../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css`,
  `.../70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` (NoSheets wording), WCP service worker,
  `ValeVision__PARITY__TrueVisionLedger__.md`.
- Depends on: WP-S10-03, D-S10-01, D-S10-02, S03a ModeController work.
- Acceptance (mirrors TV v2.158.0's own proof): from the 3D view the strip reads `3D Model | Drawings ▾ |
  Specification` (+ the two document tabs when present), all tabs the same weight; Drawings opens a menu under it with
  every sheet as "D0n - Name" in order, the whole number on hover, the open sheet bold and focused, and on localhost
  "+ New sheet" after a rule; a row opens its drawing and Drawings becomes the active tab with "D0n is open" on its
  hover; pressing Drawings while a drawing is open only toggles the menu; Escape shuts it and refocuses the tab; Up /
  Down / Home / End walk rows; a press outside shuts it; at 375 px the arrows appear, next-from-3D-Model opens the
  last drawing read (or the first) without the menu; Specification from the 3D view folds the bar and shows the page
  with no drawing veil; a project with no sheets shows no strip (and, per D-S10-02, with Layout Mode off); labels do
  not change when the editor finishes loading.
- Tests: none in TV for the strip; add the strip checks to WP-S10-05's gate (rule equality) and verify by hand
  (checklist h).

### WP-S10-05 - UI parity gate script (S)
- Scope: new `80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs` in VV (optionally the same file in TV)
  taking the TV root as an argument: asserts (1) AppHeader fold region rules equal TV's (comments stripped); (2)
  `Styles__Boot` tab-strip region equals TV `Styles__Main` tab-strip region; (3) `LoadingOverlays` veil region equals
  TV's; (4) `Styles__Panels` rules equal TV's; (5) every TV editor stylesheet imported by TV's CSS index exists in VV's
  `Na__LeLoad__STYLESHEETS` or CSS index in the same relative order (when VV has the file); (6) the shared service
  worker token differs from the one recorded at the last release (warning).
- Files VV: `80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs` (new).
- Hot files: none.
- Acceptance: passes after WP-S10-01/04/06; fails on a deliberate one-character change to any guarded rule.

### WP-S10-06 - Panels look (S)
- Scope: TV `Styles__Panels` verbatim (VV header); `PanelHost` 1.5.0 (`spec.hint` as tab hover text) and pass TV's
  hint text: `PanelTabPropertiesHint` from the ModeController's Properties RegisterTab call (TV ModeController 538), and
  the Scrapbook tab's hint from `Na__LeScrap__Label('TabHint', ...)` inside `Na__LePanelScrap__RegisterTab` (TV
  Panel__Scrapbook 216-220) - verifier: there is no `PanelTabScrapbookHint` key; `LinkedPairRow` /
  `ShowLink` (TV 1.2.0) for the dimension slice to use; 1.6.0 palette attach after the 54 port.
- Files VV: `.../40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css`, `.../40__Ui__Panels/Na__LayoutEditor__PanelHost__.js`.
- Hot files: `.../05__Core__ModeController/Na__LayoutEditor__ModeController__.js` (RegisterTab hints), `Na__LayoutEditor__Scrapbook` panel RegisterTab (hint), WCP service worker.
- Acceptance: rules equal TV's (gate); scale buttons wrap in a narrow right column instead of clipping; locked layer
  button colour unchanged; panel tabs show hover text.

### WP-S10-07 - Confirm dialog to TrueVision (S, TV-side) - SUPERSEDED BY WP-S10-07R (verifier)
> REFUTED by verifier as written: the cited CSS range (VV 1376-1509) sweeps in VV's VV-only Navigation Mode Selector
> region (1464-1509), and the scope misses `.na-dropdown-menu__action--secondary` (VV 383-402), which TV lacks and the
> dialog's Cancel button needs. Use WP-S10-07R.
- Scope: add VV's `#naConfirmDialog` markup to TV `Index.html` and the `.na-confirm-dialog` region to TV
  `DropdownAndToast` (or a new TV stylesheet imported by TV's index); TV devlog entry; ledger row.
- Files TV: `Index.html`, `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`.
- Hot files: `TV/Index.html`, `TV/02__Src__AppModules/62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js`.
- Acceptance: deleting a sheet from TV's Dev section, deleting a specification note and the register's destructive
  actions show the styled modal (destructive button red) identical to VV's; Escape / backdrop cancel; no
  `window.confirm` reached (console check).

### WP-S10-08 - Ledger, headers and the shared service worker token (S) - SUPERSEDED BY WP-S10-08R (verifier)
> REFUTED by verifier as written: it bumps the shared token on its own, which the ledger (159-173) records as Adam's call
> because the bump evicts every Vale app's caches, models included; and its ledger fix names one stale "no service worker"
> row where there are 19. Use WP-S10-08R.
- Scope: bump WCP token and log VV v2.70.0 / v2.71.0 / this wave; apply Appendix B corrections; VV file headers:
  ModeController 1.19.0 and Loader 1.2.0 entries for the v2.70.0 veil wiring (never logged), TabStrip and Toolbar PORT
  NOTEs ("adapted from TrueVision3D", divergences = loader facade, Layout Mode gate); TV-side PORT NOTE notes for
  LoadingVeil ("Back-port: PENDING" is stale - ported to VV v2.70.0) and ModeController ("Parity: verbatim" is stale).
- Files VV: `ValeVision__PARITY__TrueVisionLedger__.md`, headers of the four VV modules above.
- Files TV: headers of `LE/05/Na__LayoutEditor__LoadingVeil__.js`, `LE/05/Na__LayoutEditor__ModeController__.js` (comment-only).
- Hot files: `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`.
- Acceptance: token changed and logged; ledger rows in Appendix B corrected; `git diff` of code lines is empty for the
  header-only edits.

### WP-S10-09 - Fonts (S)
- Scope: add the Open Sans Medium (500) `@font-face` to VV `Fonts.css`; move sources to the D-S10-05 location with the
  NA URL as the second source (TV's two-source pattern).
- Files VV: `03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` (+ font files at the chosen location).
- Hot files: WCP service worker.
- Depends on: D-S10-05.
- Acceptance: `document.fonts.check('500 1em "Open Sans"')` true after load; a toast and a dropdown heading render in
  Medium; DevTools Network shows the fonts from the chosen host.

### WP-S10-10 - Toast offset and 3D canvas clearance (S)
- Scope: implement D-S10-06 and D-S10-04.
- Files: per decision (VV `DropdownAndToast` or TV `DropdownAndToast`; TV `RenderCanvas` + `ViewportOverlays`).
- Hot files: the app's service worker token.
- Acceptance: the Save Sheets toast sits at the same height in both apps on a drawing tab and in the web viewer; with a
  sheet in the project the 3D view and the safe frame start at the same place in both apps.

### WP-S10-11 - Context menu flyouts, Layer row and tooltips (M)
- Scope: TV `ContextMenu` 1.1.0 verbatim; `LayerMenu` 1.0.0; `SheetTools__HoverTooltip` 1.1.0; `SheetTools__NoteTooltip`
  1.0.0; the matching CSS blocks from TV `Main__Paper` ("Selection States, Notes and the Context Menu" flyout rules,
  `.na-le-hovertip*`); `SheetTools__ContextMenu` rows that do not depend on absent features (Layer row, Show in
  Specification, viewport rotate if rotation is ported).
- Files VV: `.../30__System__SheetTools/Na__LayoutEditor__ContextMenu__.js`, `Na__LayoutEditor__LayerMenu__.js` (new),
  `Na__LayoutEditor__SheetTools__HoverTooltip__.js` (new), `Na__LayoutEditor__SheetTools__NoteTooltip__.js` (new).
- Hot files: `.../30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js`, `Na__LayoutEditor__SheetTools__PointerDrag__.js`,
  `Na__LayoutEditor__SheetTools__.js`, `.../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`,
  `.../03__Core__Config/Na__LayoutEditor__AppConfig__.json` (`Menu*` labels), WCP service worker.
- Depends on: SheetModel__Layers 1.3.0 (MoveToLayer, reference layers), LeaderGeometry `NoteFor`, SpecLinks (other slices).
  Verifier: the exact missing VV exports are `Na__LeModel__MoveToLayer` and `Na__LeModel__ItemLayerId` (LayerMenu),
  `Na__LeModel__IsLayerSelectable` and `Na__LeLeadGeo__NoteFor` (NoteTooltip); `ContextMenu` 1.1.0 itself imports nothing
  and keeps the same three exports, so it can go first on its own. Skip "container" rows - VV already has them (B6).
- Tests to port: `Na__Test__LayerMenu__.test.mjs`, `Na__Test__BubbleNoteTooltip__.test.mjs`.
- Acceptance: right-click a text box: Layer row under Delete with the current layer at its end; hovering it opens a
  flyout of layers in list order, the holder dotted; a mixed selection rings; Escape closes the flyout first; resting on
  a linked bubble for 0.5 s shows "EW01  Note title" beside the pointer, flipping at the window edge.

### WP-S10-12 - Toolbar full parity (M)
- Scope: once the toolbar's feature modules exist in VV, take TV `Toolbar` 1.24.0 whole and re-apply VV's header;
  copy the Snap split CSS (`28/Styles__ObjectSnap__.css` 139-180) with the ObjectSnap port.
- Files VV: `.../40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`.
- Hot files: loader `Na__LeLoad__STYLESHEETS` (new feature sheets), WCP service worker.
- Depends on: WP-S10-02 and the ports of 26, 27, 28, 32, 33, 37, 54, 59, 66 and `20/VectorQuality`.
- Tests to port: `Na__Test__VectorQuality__.test.mjs` (+ each feature's own).
- Acceptance: toolbar identical to TV's order and words (section B4), each toggle lit while on, hover text from each
  feature's config.

### WP-S10-13 - Published drawings loading screen (S)
- Scope: port `TVM/52/Na__PubDoc__LoadingScreen__.js` verbatim and the `PubDoc__Loading__Config` block; wire from VV's
  web viewer exactly as TV's (`Begin`, `Progress`, `WatchPaint`, `Finish`, `CancelAll`).
- Files VV: `02__Src__AppModules/52__System__Layout__PublishedDocuments/Na__PubDoc__LoadingScreen__.js`.
- Hot files: `02__Src__AppModules/52__System__Layout__PublishedDocuments/Na__PubDoc__Config__.json`,
  `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js`, WCP service worker.
- Depends on: WP-S10-01 and the publishing slice (52/53 port, VV R2 paths through VV's worker).
- Tests to port: `Na__Test__PublishedReader__.test.mjs` (progress events).
- Acceptance: on a published VV drawing: the cover rises at once; after 350 ms "D02 - Front Elevation is now loading"
  with a faint status stepping through real jobs; the cover lifts only when every picture and font is in; pressing
  another tab mid-load takes the cover over without a blink; pressing 3D Model drops it.

### WP-S10-14 - Optional 3D-tab ports (M)
- Scope: per D-S10-07 and D-S10-11 (Full screen 76 replacing 60; Cache & Storage panel adapted to Whitecardopedia's
  registrar; Scene Inspector CSS split). Not required for drawing parity.
- Verifier: renumbering VV 60 breaks exactly two importers, `index.html` line 1383 (`Na__Feature__FullScreenMode__Initialize`)
  and `03/Na__CoreUi__Styles__Index__.css` line 69; neither is in the WCP precache list, so only the token guards them.

### WP-S10-03R - First-open veil and fold, exactly as TV (M) - verifier replacement for WP-S10-03
- Scope: (1) Move the 3D-furniture hiding block (VV `LE/10/Styles__Main__.css` lines 30-50, comment included) verbatim
  into `LE/01/Styles__Boot__.css` and delete it from `Styles__Main` (TV loads the same block at start-up, so this restores
  TV's timing). (2) Port TV `LoadingVeil` 1.1.0 whole; keep VV's `DrawingSettled` export; add an `immediate` option to
  `FirstOpen`; rewrite VV LoadingVeil's PORT NOTE divergence (it currently says the going-in veil is deliberately not
  ported). (3) Restyle `Na__LeLoadScreen`'s loading state as `.na-le-veil.na-le-veil--boot`: fixed; top
  `calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight))`; left, right, bottom 0; z-index 600; OPAQUE
  (`background-color:#ffffff`, `backdrop-filter:none`, because the 3D canvas is still painted underneath until Enter hides
  it); and `body.na-layout-editor--active .na-le-veil--boot { top: var(--Vale_LayoutTabStripHeight) }`. TV headline "Your
  Drawings Are Loading", Title Case statuses ("Fetching the Drawing Tools", "Reading the Drawing Settings"); the error
  state keeps today's full-screen `.loading-overlay--error`. (4) Loader: after the `IsAvailable` check and only for a
  non-quiet press that will enter, add `na-layout-editor--active` before the import; remove it on load failure, when the
  editor's config has it off, when `Na__LeMode__Enter` returns false, and on the error state's Back to 3D Model; hide the
  boot veil straight after `action(editor)` with no drawing wait. (5) ModeController: `PreloadMetrics` returns its
  promise; call `FirstOpen(host, { specification, textMetrics, viewportCount, immediate })` from `Enter` when not a viewer
  and not `Na__LeMode__Quiet` (introduce the flag here, false until WP-S10-04R's `EnterUnder` sets it); `WaitForFirstDrawing`
  resolves at once when the view is not the sheet view. (6) Log ModeController 1.19.0 / Loader 1.2.0 / LoadingScreen 1.1.0 /
  LoadingVeil 1.1.0 entries and bump the WCP token.
- Files VV: `51/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`, `51/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css`,
  `51/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`, `51/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js`,
  `51/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`.
- Hot files: `03/Na__UiFeature__Styles__LoadingOverlays__.css` (WP-S10-01), `51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`
  (optional `Veil*` labels), `ValeVision__PARITY__TrueVisionLedger__.md` (row 1241 and the Loader row), WCP service worker.
- Depends on: WP-S10-01; D-S10-03.
- Acceptance: cold first press of a drawing tab - the Tools & Settings menu, nav toolbar, help panel and carousel vanish
  AT THE CLICK; strip and header stay visible and the header holds 1 s then glides 1 s with the strip welded to it, over an
  opaque white cover below the strip with the spinner and "Your Drawings Are Loading"; no 3D model visible through it; the
  cover hands over to the in-host veil with no blink and lifts only when every viewport `<img>` is decoded. Editor already
  loaded (via a Dev action): the in-host veil after 550 ms only if still drawing. Forced load failure: full-screen error
  state; Back to 3D Model returns with the header down and no body class. Layout Mode switched off during the load: no
  body class left behind. Leaving still shows "Loading Your 3D Model". `Na__Verify__Exports__.mjs` and
  `Na__Verify__ModuleGraph__.mjs` pass. (The Specification-from-3D-view check moves to WP-S10-04R.)
- Risk: medium; two covers in sequence (same look and geometry, `immediate` hand-over); every failure path must drop the
  class.

### WP-S10-04R - Compact tab strip (TV 2.0.0) with the Drawings menu (L) - verifier replacement for WP-S10-04
- Scope: everything in WP-S10-04 (TV TabStrip 2.0.0 whole with VV seams; TV's tab-strip CSS region into `Styles__Boot`,
  menu rules in, rename rules out; facade exports `VIEW_REGISTER`, `VIEW_STATEMENT`, `OpenRegister`, `OpenStatements`
  (stubs until the features land), `IsSitePlanSheet` (false in VV) and their `CheckNames` entries; ModeController
  `EnterUnder` + `Quiet`, `OpenSpecification` through `EnterUnder`; TV labels in VV's LE config with equal fallbacks;
  `--specification` class) plus: (a) the D-S10-12 reorder path - recommended: keep VV's drag-to-reorder on the Drawings
  menu rows (localhost, editable) as a recorded divergence until the Document Register is ported; (b) the "+ New sheet"
  row awaits `Na__LeLoad__CreateSheet` (a promise in VV, synchronous in TV) before `Na__LeLoad__Enter`; (c) drop TV's
  `Na__LeMode__Ready().then(Render)` - VV renders at once and re-renders on `Na__LeLoad__STATE_EVENT`, which must stay
  wired; (d) a cold document-tab press gets the loader's early body class but no drawing wait (WP-S10-03R).
- Files VV: `51/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js`, `51/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`,
  `51/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`,
  `51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- Hot files: `51/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` (dead `--spec` rule),
  `51/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` (NoSheets fallback text; reorder buttons if D-S10-12 (b)),
  `ValeVision__PARITY__TrueVisionLedger__.md`, WCP service worker. (No edit, but check: the web viewer's dock names
  its specification entry from the same `SpecificationTab` label, so it will read "Specification", as TV's does.)
- Depends on: WP-S10-03R, D-S10-01, D-S10-02, D-S10-12, S03a ModeController work.
- Acceptance: every WP-S10-04 item, plus: Specification pressed from the 3D view folds the bar and shows the page with no
  drawing veil and no loading screen held for a sheet nobody asked for (cold and warm); a sheet can still be reordered by
  the path D-S10-12 chose; "+ New sheet" on a cold editor creates one sheet and opens it; tab labels do not change when
  the editor finishes loading.
- Risk: medium-high; a static import of an editor module in the strip would put the whole editor back on start-up
  (`Na__Verify__ModuleGraph__.mjs` and a cold-load network check catch it).

### WP-S10-07R - Confirm dialog to TrueVision (S, TV-side) - verifier replacement for WP-S10-07
- Scope: VV's `#naConfirmDialog` markup (VV `index.html` 1322-1333) into TV `Index.html` after `#naToastNotification`
  (TV line 798); VV `DropdownAndToast` lines 1375-1462 (the Confirm Dialog region only) into TV `DropdownAndToast` (or a
  new TV sheet imported from TV's index); VV lines 383-402 (`.na-dropdown-menu__action--secondary`, its `:hover`,
  `:active` and `.is-loading`) into TV `DropdownAndToast` before TV's `.na-dropdown-menu__action:hover` (line 493); TV
  devlog entry; TV PWA token bump; ledger "Async confirm dialog" row re-closed with the date.
- Files TV: `Index.html`, `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`.
- Hot files: TV `Index.html`, TV `02__Src__AppModules/62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js`,
  VV `ValeVision__PARITY__TrueVisionLedger__.md`.
- Depends on: D-S10-09.
- Acceptance: deleting a sheet from TV's Dev section, deleting a specification note and the register's destructive actions
  show the styled modal - light secondary Cancel, red destructive Confirm - identical to VV's; Escape and the backdrop
  cancel; `window.confirm` is never reached; no `.na-navmode__btn` rules arrive in TV; TV `Na__Verify__Exports__.mjs` passes.

### WP-S10-08R - Ledger, headers and the service-worker records (S) - verifier replacement for WP-S10-08
- Scope: header and ledger work only, no token bump (that is D-S10-13). Ledger: rewrite the 19 rows that say "n/a - this
  tree has no PWA worker" / "no service worker" (340, 377, 384, 394, 404, 412, 420, 429, 439, 446, 452, 505, 522, 532, 542,
  569, 615, 849, 1189) to "VV sits under the shared Whitecardopedia worker; bump per D-S10-13", reopen row 236 (the PWA
  unsaved-work flag) pending S10-V05 / S03b D-S03b-07, and apply Appendix B items 2-10. VV headers: ModeController and
  Loader entries for the v2.70.0 veil wiring, TabStrip and Toolbar PORT NOTEs ("adapted from TrueVision3D"; divergences =
  loader facade, Layout Mode gate), Toolbar's duplicate 1.8.0 / 1.9.0 entries. TV headers (comment-only): LoadingVeil
  ("Back-port: PENDING" stale), ModeController and Toolbar ("Parity: verbatim" stale), TabStrip DESCRIPTION canvas line.
  Serialise behind WP-S10-03R and WP-S10-04R, or fold the header lines into them, since they edit the same files.
- Files VV: `ValeVision__PARITY__TrueVisionLedger__.md`, headers of `05/ModeController`, `01/Loader`, `05/TabStrip`, `40/Toolbar`.
- Files TV: headers of `LE/05/LoadingVeil`, `LE/05/ModeController`, `LE/05/TabStrip`, `LE/40/Toolbar` (comment-only).
- Hot files: `ValeVision__PARITY__TrueVisionLedger__.md` (every slice writes to it).
- Acceptance: no row still says VV has no service worker; `git diff` shows comment / header lines only in the JS files.

### WP-S10-15 - Shared registrar brought up to TV's (S, Whitecardopedia - Vale's own infrastructure) - verifier, new
- Scope: in `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`,
  port TV registrar 1.2.0 (sample `navigator.serviceWorker.controller` before registering; a first claim is not an update
  and does not reload), 1.3.0 (`register(url, { scope, updateViaCache:'none' })`), and 1.1.0's hold-off (the idle check
  also waits while the Layout Editor has unsaved work) through a neutral `window.Na__Pwa__HasUnsavedWork` published by VV
  AutoSave (`Na__LeAuto__HasUnsavedWork` is already exported) - the name per S03b D-S03b-07. Log the registrar version.
- Files: the WCP registrar; VV `51/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` (one publish call).
- Hot files: the WCP logic file (only if D-S10-13 bumps in the same release); S03b's WP that owns the AutoSave flag.
- Depends on: D-S03b-07 (flag name); must land BEFORE the first token bump under D-S10-13.
- Acceptance: a fresh origin's first load registers the worker and does NOT reload (model loads once); a second
  `controllerchange` on a controlled page reloads once; with unsaved sheets open the reload waits (and gives up after the
  registrar's timeout); Whitecardopedia's own pages behave as before.
- Risk: low-medium; shared with Whitecardopedia, so test both apps.

---

## (h) Manual acceptance checklist - both apps side by side

Set-up: the same-shaped project in both (at least three sheets, the first with two or more viewports, a specification);
desktop Chrome at 1920x1080 plus a 375 px emulation; hard reload both and clear site data for VV (the shared worker).
On the studio PC leave Windows "Animation effects" OFF (it must not matter).

1. 3D view, header down: logo and title (brand differs, size and position equal); strip directly under the header,
   36 px, same greys; tab texts identical (VV's two document tabs per D-S10-01).
2. Press Drawings: the menu opens under the tab with identical rows, bold open row, hover numbers, `+ New sheet` on
   localhost; Escape returns focus to the tab; arrow keys walk rows.
3. First drawing of the session (cold): tabs stay visible; veil inside the editor area only; "Your Drawings Are
   Loading" and "Drawing the Views  -  1 of 2"; the header waits 1 s then glides up for 1 s with the strip welded to
   it (no gap, no shadow smudge); the editor area is already full height (paper does not jump when the fold ends).
4. Second drawing: no veil; the bar stays folded.
5. Specification from the 3D view: the bar folds; no "Your Drawings Are Loading"; the page is shown.
6. 3D Model: the bar drops at once (no hold); "Loading Your 3D Model" over the model with the strip and header above it;
   the camera flies to the first scene; the veil lifts when it stops.
7. Toolbar: identical buttons and order; no Undo / Redo / Fit / 100% / Notes; Ctrl+Z and the right-click Zoom to fit
   still work.
8. Panels: a locked, a hidden and a reference layer each show the same faint red; scale buttons wrap the same way in a
   narrow column; panel tabs show the same hover text.
9. Right-click a text box, a viewport and bare paper: identical rows and flyouts (after WP-S10-11).
10. Rest the pointer on a specification bubble: the same tooltip after half a second (after WP-S10-11).
11. Any destructive action (delete a sheet from the Dev section): the same styled confirm modal in both (after WP-S10-07).
12. Save Sheets: the toast appears at the same height in both.
13. 375 px wide: header 48 px; TV shows the title, VV the logo alone (brand); the strip scrolls with end arrows; the
    Drawings menu stays inside the window; the fold travels 48 px.
14. Web viewer (authoring locked): same dock, same tabs, same fold; published loading cover once VV publishes.
15. DevTools > Elements: `body.na-layout-editor--active` appears at the click on a drawing tab in both (VV: before the
    editor finishes loading) and disappears on 3D Model; `.app-header` computed `transform` is `none` throughout.
16. (Verifier) Cold first drawing in VV with the Tools & Settings menu left open beforehand: the menu, nav toolbar, help
    panel and scene carousel all disappear at the click, exactly as in TV - none of them hangs over the loading cover or
    stays behind while the header glides away - and no 3D model shows through the cover.
17. (Verifier) After the compact strip: reorder two sheets in each app (TV from the Document Register; VV by the path
    D-S10-12 chose) and confirm the Drawings menu lists them in the new order in both.
18. (Verifier) Any confirm in TV after WP-S10-07R: the Cancel button is the light secondary button, as in VV.
19. (Verifier) After WP-S10-15, in a fresh browser profile on the live site: open a VV project - the model loads once and
    the page does not reload itself when the worker first takes control (TV already behaves so since v2.75.0).

---

## Appendix A - target stylesheet order for VV (cascade must equal TV's)

`Na__LeLoad__STYLESHEETS` (loader), mirroring TV's CSS index lines 161-174, including only files VV has:

1. `10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css`
2. `10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css`
3. `10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`
4. `26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css` (when ported)
5. `27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css` (when ported)
6. `28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css` (when ported)
7. `33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css` (when ported)
8. `40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css`
9. `50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css`
10. `50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css`
11. `50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css`
12. `54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css` (when ported)
13. `66__Feature__DocumentSharing/Na__LayoutEditor__Styles__Share__.css` (when ported)
14. `80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css` - LAST

VV `03/Na__CoreUi__Styles__Index__.css`, after the `Styles__Boot` import: `54__Feature__ColourPalette/Na__ColourPalette__Styles__.css`,
then `55__Feature__SpellCheck/Na__SpellCheck__Styles__.css` (TV 182, 190).

Self-linking (no entry anywhere): `36/Styles__Patterns`, `37/Styles__VectorTools`, `51/Styles__DrawingRegister`,
`52/08__Style__Stylesheets/Styles__Statement` and `__Statement__Document`, `56/Styles__ScrapbookCustom`,
`57/Styles__ScrapbookParametric`, `58/Styles__ScrapbookSpecification`, `59/Styles__FloorAreas`.

Pre-editor: tab strip + Drawings menu + boot veil in `01/Styles__Boot`; both veils' shared rules in `03/LoadingOverlays`.
Verifier additions: the 3D-furniture hiding block (VV `Styles__Main` 30-50) also belongs in `01/Styles__Boot` (S10-V01).
And note that VV's cascade cannot match TV's for 54 / 55: TV imports them after the editor sheets, while VV's
loader-linked editor sheets always land after the whole CSS index (see wiring note 12).

## Appendix B - ledger corrections

1. Line ~1189 "The service worker cache token bump ... **n/a** - ValeVision has no service worker or installability
   module": wrong. VV is served under Whitecardopedia's worker (`Whitecardopedia__Pwa__ServiceWorker__Logic__.js`,
   scope folders line 250, VV precache entries 276-344); its token must be bumped for VV shell changes.
   (Verifier: 19 rows carry the same wrong premise - 340, 377, 384, 394, 404, 412, 420, 429, 439, 446, 452, 505, 522, 532,
   542, 569, 615, 849, 1189 - and row 236 skipped the PWA unsaved-work flag because of it; the ledger's own section at
   135-173 already says the premise is wrong and that the bump is Adam's call, D-S10-13.)
2. Section "Contextual top bar fold and loading veils" (1235-1246): add that the fold rules were re-verified identical
   on 01-Oct-2026, that TV's AppHeader / LoadingOverlays / LoadingVeil have not changed since 20-Sep (bef15277), and
   add the pending return trip "TabStrip 2.0.0 + ModeController 1.30.0 EnterUnder (TV v2.158.0)" which changes when the
   fold fires.
3. "Pending back-port" closed item "Async confirm dialog": TV has the module but no markup or CSS; it falls back to
   `window.confirm`. Re-open until WP-S10-07.
4. VV v2.70.0 edits to `ModeController` (WaitForFirstDrawing, veil wiring) and `Loader` (AwaitFirstDrawing) are not in
   either file's DEVELOPMENT LOG; versions were not bumped (ModeController still 1.18.0, Loader 1.1.0).
5. VV `TabStrip` and `Toolbar` PORT NOTEs read "Parity: new / Lantern Designer"; both now carry TrueVision ports.
   VV Toolbar's devlog has 1.8.0 and 1.9.0 twice each.
6. TV `LoadingVeil` PORT NOTE "Back-port: PENDING to ValeVision3D" is stale (VV v2.70.0, adapted). TV `ModeController`
   "Parity: verbatim; Divergences: console prefix, header and folder numbers only" is far from true today.
7. (Verifier) TV `Toolbar` PORT NOTE says "Parity: verbatim; Divergences: console prefix, header and folder numbers
   only" - untrue today (TV 1.24.0 has twelve controls VV lacks and has removed five that VV still shows).
8. (Verifier) Ledger lines 44-49 say ValeVision has no equivalent of `Na__Verify__ModuleGraph__` / `Na__Verify__Exports__`;
   both are in VV `80__Testing__PrototypeEnvironment`.
9. (Verifier) Ledger row 1240 says ValeVision "carries only the `--over-model` veil": VV has no `--over-model` rule at all -
   its base `.na-le-veil` IS the fixed z500 geometry. Reword when WP-S10-01 lands (then it is verbatim).
10. (Verifier) TV `TabStrip` DESCRIPTION says "the canvas, menus, breadcrumb and carousel shift down" with the strip; TV's
    canvas does not (S10-F20). Comment-only fix in TV, or the back-port in D-S10-04.

---

## Verification

Adversarial verification, 01-Oct-2026, read-only against the same working copies (TV HEAD b2aa9151, VV HEAD 7b4e593a,
WCP service worker last committed 4a92a943). Every check opened the actual files; CSS was compared declaration by
declaration with comments stripped (a small Python normaliser), not by eye. A backup of the survey's text is at
`scratchpad/parity/verify_s10/S10__Broader_UI_Parity.ORIGINAL.md`.

### What was checked

- **All 7 high findings (F02, F03, F04, F06, F07, F16, F17) - 100 %**, and all 29 others at least on their headline claim.
  About 178 individual line, version, devlog and behaviour claims in all.
- The fold: rule-for-rule diff of both `AppHeader` sheets (54 declarations each; the only difference is the <=600 px title);
  `git log` of TV `AppHeader`, `LoadingOverlays` and `LoadingVeil` (last touched bef15277, 20-Sep); every reader of
  `na-layout-editor--active` in both apps (CSS only, plus the ModeController constant and a Loader comment).
- The tab strip: both TabStrip files read in full; TV's imports mapped one by one onto VV's loader facade (missing:
  `VIEW_REGISTER`, `VIEW_STATEMENT`, `OpenRegister`, `OpenStatements`, `IsSitePlanSheet`; not needed: `Ready`); TV's
  `Na__LeTabs__CloseMenu` has no importer; the tab-strip CSS region of TV `Styles__Main` against VV `Styles__Boot`
  (the first 62 shared declarations identical; TV adds 48 menu declarations, VV keeps 32 rename / plus declarations);
  label keys (TV 603, VV 423, 13 same-key different text, exactly as stated).
- The veils and loaders: both `LoadingVeil` files, both `LoadingOverlays` veil regions, VV `Loader` and `LoadingScreen`
  in full, TV `Na__PubDoc__LoadingScreen__` and its config block, TV ModeController `Enter` / `Leave` / `EnterUnder`.
- The toolbar (TV log 1.10-1.24, TV Mount order, VV Mount and imports, VV export surface and importers, VV undo path),
  `Styles__Panels` (full declaration diff), `PanelHost`, `ContextMenu`, `SheetTools__ContextMenu` (row labels compared),
  the three TV-only menu / tooltip modules and their imports against VV's exports.
- `03__Style__AppStylesheets` (all 15 / 12 files enumerated from `tree_*.tsv`), both entry pages, the CSS indexes, fonts,
  toast, canvas clearance, confirm dialog (markup, CSS, every importer), `--Vale_` tokens, z-indexes, focus-visible
  counts, the Dev Tools item order, 27 / 60 / 64 / 75 / 76 / Cache & Storage, the WCP service worker, the ledger rows
  and every cited TV / VV devlog line.

### Verdicts

- **Confirmed** (core claim right as written or after a precision fix): F01-F14, F16-F36. No finding was refuted.
- **Partly verified**: F15 - the region layout and the osnap move to `28__System__ObjectSnap` were confirmed; the
  individual rule claims (stack z-order, transparent frames, dashed edges, grips, fog) were not re-checked line by line.
- **Corrected - the one recommendation that would have done harm**: F17. The survey told every package to bump the
  shared Whitecardopedia token. The ledger (89-94, 159-173) records that question as Adam's, put to him on 20-Sep and
  declined, because the token also names the models bucket (WCP logic 229-233) and a bump re-downloads every Vale
  client's GLBs; a bump also makes the shared registrar reload open pages, without TV's unsaved-work hold-off and even on
  a first install. F17's action is now `needs_decision` (D-S10-13), WP-S10-08 is replaced by WP-S10-08R (records only),
  and the registrar fixes are a new package, WP-S10-15 (S10-V05).
- **Corrected** (details in the returned deltas): F03 (reorder path, async CreateSheet), F04 (the early body class needs
  the hiding block in Boot, an opaque boot veil, the Enter-false path), F06 (reverses VV v2.70.0's recorded divergence),
  F09 (separator placement in the read-only branch), F10 (`flex-wrap` on `.na-le-toggle-group` is live at once), F12
  (VV `44` PlanAnnotations toolbar is a second attach point), F13 (VV already has container-aware menus; exact TV-only
  rows listed), F14 (NoteTooltip / LayerMenu also need `IsLayerSelectable`, `ItemLayerId`, `MoveToLayer`), F16 (Boot gets
  the hiding block too; VV cannot reproduce TV's 54/55-after-editor cascade), F18 (four more stale records), F19 (the CSS
  range was wrong and the secondary-button rules were missing), F24 (Boot contents), F25 (NA schema path in the header;
  VV's 52 folder needs its own PubDoc config), F27 (the two importers a renumber breaks), F28 (TV's Scene Inspector sheet
  adds instance-count styling, so not a pure file split), F30 (focus-visible count 17 / 9; stage-press keyboard owned by
  S03b), F35 (TV has 91 `Na__Test__` files, 62 of them `.mjs`).
- **Report text corrected**: B3 (S10-V01 note, F06 reversal note), B5 (live `flex-wrap`), B6 (container menus; confirm
  dialog scope), B7 (the bump is Adam's call; 19 stale ledger rows; registrar gaps), B12 (counts), (c) table rows,
  (d) wiring notes 7, 8 and 10-12, (e) z-index ladder (the hover tooltip at 1000 was listed above the Drawings menu at
  1002), (f) D-S10-12 and D-S10-13, (g) preamble (no per-package bump), WP-S10-02 notes, WP-S10-06 hint keys,
  WP-S10-03 / 04 / 07 / 08 superseded by 03R / 04R / 07R / 08R, new WP-S10-15, (h) items 16-19, Appendix A, Appendix B
  item 1 (19 rows) and items 7-10.

### What was added

- **S10-V01 (high, wiring)**: the 3D-furniture hiding block must move from VV `Styles__Main` (30-50, lazily linked) to
  `Styles__Boot` before the loader adds the body class at the click; otherwise the menus (z 1001), nav toolbar (1002),
  help panel (1003) and carousel (1004) float over the boot veil while the header folds away.
- **S10-V02 (high, decision D-S10-12)**: the compact strip removes VV's only sheet-reorder control. TV reorders only from
  the Document Register; VV has no register, its Sheet panel only renames, its Dev section only creates, duplicates and
  deletes.
- **S10-V03 (low, VV-only)**: the Video Studio timeline (`.na-vs-tl`, z 1000) is not hidden on drawing tabs and does not
  listen for the editor, so an open timeline floats over the editor host (localhost Dev feature).
- **S10-V04 (low, coverage)**: VV `install-guide.html` and `03__AppUtils/Na__AppUtils__LoadingOverlay__.js` were not in
  the survey; both are Vale-only with no drawing-editor content - no action.
- **S10-V05 (medium, port_adapted to Vale's own registrar)**: the Whitecardopedia registrar VV runs under lacks TV
  registrar 1.1.0 (hold the update reload while the editor has unsaved work), 1.2.0 (no reload on a first install - every
  first VV visit loads the model twice today) and 1.3.0 (`updateViaCache:'none'`). Must land before any token bump.
- **Decisions D-S10-12** (sheet reorder after the compact strip) **and D-S10-13** (the token and the cache split).
- **WP-S10-03R, WP-S10-04R, WP-S10-07R, WP-S10-08R** replace WP-S10-03, -04, -07 and -08; **WP-S10-15** is new.

### Still unverified

- Nothing was run in a browser: the fold timing, veil hand-over, z-order outcomes and font rendering are read from CSS
  and JS. Checklist items 3, 6, 13, 16 and the 375 px items need an eye in both apps.
- Whether the Drawings menu (z 1002) and the 3D nav toolbar (z 1002, top-centre in presentation mode) can overlap on a
  narrow 3D view: equal z-index, decided by DOM order (the menu is appended last). Same in both apps after the port, so
  not a parity issue; worth one look.
- `Na__LayoutEditor__Styles__Main__Paper__.css` rule-level claims in F15 (see above), and the Scene Carousel diff beyond
  confirming that every rule difference is in the Presentation Dev editor (`.na-pm-dev__*`, `.na-pm-modal__*`) plus the
  presentation-mode nav toolbar `top` (line 202 in both), whose `--Vale_HeaderHeight` fallback differs (TV 60px, VV 54px;
  inert while the token is defined) - no slice in this run appears to own that 3D-tab Dev editor drift.
- The live site: whether a deployed VV client is currently running a stale shell from the 18-Sep token.
