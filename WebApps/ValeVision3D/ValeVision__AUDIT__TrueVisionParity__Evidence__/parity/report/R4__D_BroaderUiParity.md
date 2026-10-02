## Section D - Broader UI Parity

This section answers Adam's ask 4: broader UI parity, starting with his own example, "the top nav bar animation used
in TrueVision when in Layout editor". Evidence base: slice S10 with its verifier corrections (S10-V01 to V05), the UI
parts of S03a (b.6-b.9), S06a (b.2, b.3, e) and S08 (B6, e), the 64 findings in category `ui`, the canonical artefacts
K1 (DR ids), K2 (target paths) and K3 (wp ids), and a re-read of the code on 01-Oct-2026 at TV HEAD b2aa9151 and VV
HEAD 7b4e593a. Two read-only helpers back the mechanical claims:

- `report/tools/r4_fold_diff.py` compares the fold, veil, tab-strip, hiding-block and host CSS declaration by
  declaration, with comments stripped. Its output is `report/tools/r4_fold_tables.md`.
- `report/tools/r4_tokens.py` compares every `--Vale_*`, `--Na_Le_*` and `--na-le-*` definition in both apps.

Nothing here was run in a browser. Anything that needs an eye is in the D.4 checklist.

**Short names used in this section.** The K2 renumber leaves every UI path unchanged except
`44__System__PlanAnnotations` -> `43__System__PlanAnnotations` (TF-T24). New top-level folders land at TV's numbers:
27 (TF-T38), 52 (TF-T42), 54 (TF-T44) and 55 (TF-T45). `LE/` = `02__Src__AppModules/51__System__LayoutEditor/`.

| Short name | TV path | VV path (K2 target) |
|---|---|---|
| AppHeader | `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css` | same |
| LoadingOverlays | `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` | same |
| DropdownAndToast | `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` | same |
| BaseLayout, Fonts, RenderCanvas | `03__Style__AppStylesheets/Na__CoreUi__Styles__BaseLayout__.css`, `...__Fonts__.css`, `...__RenderCanvas__.css` | same |
| ViewportOverlays | `03__Style__AppStylesheets/Na__ImageExport__Styles__ViewportOverlays__.css` | same |
| CSS index | `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` | same |
| Index.html / index.html | `Index.html` (app root) | `index.html` (app root) |
| Main(LE) | `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` | same |
| Main__Paper | `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css` | same |
| Boot | (none: TV keeps these rules in Main(LE)) | `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` |
| ModeController | `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` (1.32.0) | same (1.18.0) |
| TabStrip | `LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` (2.0.0) | same (1.5.0) |
| LoadingVeil | `LE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` (1.1.0) | same (1.0.0) |
| Loader / LoadingScreen | (none: TV imports the editor at start-up) | `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (1.1.0) / `...LoadingScreen__.js` (1.0.0) |
| Toolbar | `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` (1.24.0) | same (1.9.0) |
| AppConfig(LE) | `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` | same |
| WCP worker | (TV has its own, `62__Feature__AppInstallability`) | `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` |

### D.0 Summary

| What Adam sees | Same today? | What differs | Closed by (K3) | Decision |
|---|---|---|---|---|
| The fold itself: CSS rules, tokens and the body class that triggers it | **Yes**, declaration for declaration | Only comments differ, plus the brand title at 600 px and narrower | Nothing to port. W0-04 guards it | - |
| Which presses fold the bar | No | TV also folds on Specification, Document Register and Design Statements pressed from the 3D view. VV folds only on a drawing tab | W1-32, W1-34; later W4-10 (Register) and W4-13 (Statements) | DR-38, DR-10 |
| What covers the first drawing | No | VV puts a full-screen opaque "Loading Layout Editor..." cover over the header and strip, so the fold plays unseen. TV shows "Your Drawings Are Loading" inside the editor area after 550 ms, with the fold in view | W1-33 | DR-39, DR-24 |
| Tab strip | No | TV 2.0.0 has five tabs and a Drawings menu. VV 1.5.0 has one tab per sheet | W1-34 | DR-38, DR-25, DR-01 |
| Toolbar | No | VV still has Notes, Undo, Redo, Fit and 100%, and lacks 12 TV controls | W1-35, then W5-01 | DR-40 item 3, DR-01 |
| Panels, colour palette, context menus, tooltips | No | See D.2.1 rows 10-18 | W1-37, W1-38, W2-20, W2-21, W2-35, W2-36, W3-03, W3-13 | DR-20, DR-17, DR-40 |
| Published-drawing cover, web viewer dock | No | VV has no publishing yet | W4-17, W4-09, W4-08 | DR-22, DR-23 |
| Confirm dialog, toast height, 3D canvas under the strip | No, and **TV is the side behind** | See D.2.1 rows 25, 26 and 29 | WT-05, WT-07 (TrueVision lane) | DR-36, DR-44 |
| Open Sans Medium (500) | No | VV has no Medium face, so weight 500 renders at 400 | W1-25 | DR-21 |
| Reduced motion | Yes | Neither app has a live `prefers-reduced-motion` rule in its drawing UI (D.5 item 1) | W0-04 guards it | - |

### D.1 The top-bar fold in the Layout Editor (Adam's named example)

#### D.1.1 How TrueVision does it now

The fold arrived in TV v2.83.0 (20-Sep). TV v2.158.0 (TabStrip 2.0.0 with ModeController 1.30.0) widened the set of
presses that fold the bar. AppHeader, LoadingOverlays and LoadingVeil have not changed since commit bef15277 of
20-Sep (S10-F01).

| Part | Element | Resting (3D view) | Folded (drawing or document tab) | Transition | z | Evidence |
|---|---|---|---|---|---|---|
| Header | `header.app-header` | `position:fixed; top:0; height:var(--Vale_HeaderHeight)`: 60 px, or 48 px at <= 600 px. `box-shadow:0 2px 8px rgba(0,0,0,0.08)`. `border-bottom:2px solid var(--Vale_PrimaryBrand)`. Global `box-sizing:border-box`, so the border sits inside the 60 px | `top:calc(-1 * var(--Vale_HeaderHeight))`; `box-shadow:0 0 0 rgba(0,0,0,0)` | `top` and `box-shadow` take `--Vale_HeaderFoldDuration` 1000 ms on `--Vale_HeaderFoldEase` `cubic-bezier(0.40, 0.00, 0.20, 1)`. `--Vale_HeaderFoldDelay` 1000 ms is declared **only on the folded rule**, so the hold applies when leaving; the base shorthand carries delay 0, so the bar comes straight back | 1001 | AppHeader 28, 42-57, 143, 209-213, 229-232, 234-238; BaseLayout 10 |
| Tab strip | `nav#naLayoutEditorTabStrip.na-le-tabs`, inserted after the header by `Na__LeTabs__Initialize` (TabStrip 626-641) | `position:fixed; top:var(--Vale_HeaderHeight); height:var(--Vale_LayoutTabStripHeight)`. The strip publishes 36 px while shown (TabStrip 176-177, 218-225) | `top:0` | `top` 1000 ms on the same curve. Delay 1000 ms on the folded rule, "identical to the header's, or the two come apart during the hold" | 999 | Main(LE) 66-81; AppHeader 247-254 |
| Editor host | `#naLayoutEditorHost.na-le-host` | `top:calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight))`. Hidden on the 3D tab | `top:var(--Vale_LayoutTabStripHeight)` | **None.** The host is laid out at its folded size in the frame the class lands, and the bars slide up over it ("a curtain lifting"). This is required: Enter fits the paper on the next frame (`Na__LeNav__Fit`), so a host still growing would fit every sheet to a short stage | 600 | Main(LE) 269-279; AppHeader 177-185, 258-265; ModeController 755 |
| 3D furniture | `.na-dropdown-menu`, `#naBreadcrumbNav`, `#naPresentationCarousel`, `#naNavToolbar`, `#naNavHelpPanel`, `.na-export-overlay`, `.na-projected-linework`, `.controls-instructions-panel` | shown | `display:none !important` | instant | 1001-1004 | Main(LE) 31-51, loaded at start-up from TV's CSS index (161-174) |
| 3D canvas | `#renderCanvas` | `top:var(--Vale_HeaderHeight)` (under the header only) | `visibility:hidden`, set by Enter; the canvas stays alive for snapshots | **Deliberately not part of the fold.** An attempt to slide it was taken back out | 0 | RenderCanvas 9-14; AppHeader 195-200, 269-285; ModeController 701-702 |
| Drawings menu | `#naLayoutEditorDrawingsMenu.na-le-tabs__menu`, on `<body>` | placed under the strip by JS when it opens | **Not moved by the fold.** It is placed only on open, scroll and resize, and any mode change shuts it | none | 1002 | TabStrip 421-432, 508-519, 649-662; Main(LE) 200-215 |

**The JavaScript that toggles it.** There is exactly one class, `na-layout-editor--active` (ModeController 425).

- `Na__LeMode__Enter` adds it at line 700, only when the editor was not already active. Just before that,
  `Na__LeMode__CloseModelMenus` shuts every 3D menu (469-473, 699).
- `Na__LeMode__Leave` removes it at line 777.
- Enter runs in the same task as the click, so the hold starts at the click.
- Nothing in JavaScript reads the class; only CSS does (S10 verification).
- The strip publishes `--Vale_LayoutTabStripHeight` (36 px or 0 px) and body class `na-layout-tabs--visible`, and
  fires one `resize` on change (TabStrip 218-225). The host's folded `top` comes from that variable.
- The strip is shown when `Na__LeCfg__IsEnabled() && sheets.length > 0` (TabStrip 316).

**Presses that fold the bar in TV 2.0.0:**

- A Drawings-menu row (TabStrip 478-485).
- An end arrow landing on Drawings (TabStrip 192, 341).
- From the 3D view, the Specification, Document Register and Design Statements tabs (TabStrip 346-361). Each calls
  `Na__LeMode__EnterUnder` (ModeController 883-888; called at 902, 929 and 958), which runs `Enter(null)` with
  `Na__LeMode__Quiet = true` (444). The first sheet is laid out underneath, and the bar folds on a document tab too.

**The covers on either side of the fold.**

- **Going in.** `Na__LeVeil__FirstOpen` (LoadingVeil 315-364) mounts `.na-le-veil` inside the host:
  - Look: `position:absolute; inset:0; z-index:40`, 94 % white, `backdrop-filter:blur(3px)`, 320 ms fade
    (LoadingOverlays 283-296). The tabs stay readable and the header folds over it.
  - Timing: shown only if the first open is still busy at 550 ms (LoadingVeil 103, 353). Once shown it stays at least
    500 ms, with a 25 s cap (104, 109, 354).
  - Once per session (124, 316-317). Enter calls it only when not in the web viewer and not Quiet
    (ModeController 733-737).
  - Words: the headline "Your Drawings Are Loading" (LoadingVeil 321), then the first outstanding job: "Drawing the
    Views  -  n of N", "Reading the Project Specification" or "Preparing the Drawing Fonts" (339-350). These are code
    fallbacks; neither AppConfig(LE) has `Veil*` keys (checked).
- **Coming out.** `Na__LeVeil__ReturnTo3d` (LoadingVeil 386-408) mounts `.na-le-veil.na-le-veil--over-model` on the
  body:
  - Look: `position:fixed; z-index:500`, above the canvas and host but below the strip (999) and header (1001), so
    the unfold is watched over it (LoadingOverlays 298-301).
  - Behaviour: shown at once with "Loading Your 3D Model" / "Returning to the First Scene". The camera is sent to
    scene 1 through `GoToSceneAtIndex(1)`, and the veil lifts when the camera stops (12 s cap).

**Reduced motion: none, on purpose.** A `prefers-reduced-motion` branch once collapsed the fold to 0.01 ms on the
studio PC: Windows Animation effects off (`MinAnimate = 0`) is reported by Chromium as `reduce`. The branch was
removed. AppHeader 290-310 and TV devlog v2.83.0 (lines 8098-8107) keep the reasoning so nobody re-adds it blind.

**The timeline, from TV's own measurements** (TV devlog v2.83.0, lines 8084-8096, 8115, 8140):

| Time | What happens |
|---|---|
| Click | The class lands and the host takes its final height (862 px) in the same task |
| 0-1000 ms | Header and strip "dead still" through 999 ms |
| 550 ms | First-open veil appears, if still drawing (first drawing of the session only) |
| 1000-2000 ms | The bars glide. The header's bottom edge equals the strip's top edge at all seven sampled points |
| During the glide | `transform: none` throughout; the Dev Tools flyout still opens at y=106 |
| Veil trace | Up at 621 ms; "1 of 2" at 2147 ms; "2 of 2" at 3494 ms; gone by 4350 ms |
| Back to 3D | Delay 0; the bar is moving within 250 ms |

At 600 px and narrower the header is 48 px, so the fold travels 48 px. Accepted in both apps: the strip's `top` now
eases 12 px when the window crosses the 600 px breakpoint (TV devlog 8162-8166).

#### D.1.2 How ValeVision does it now (VV v2.70.0)

**The CSS is the same.** The mechanical comparison (`r4_fold_diff.py`, comments stripped) finds:

| Region | TV lines | VV lines | Same / differ / TV-only / VV-only declarations |
|---|---|---|---|
| Header base rule | AppHeader 40-58 | AppHeader 40-58 | 14 / 0 / 0 / 0 |
| Fold region | AppHeader 167-310 | AppHeader 166-265 | **11 / 0 / 0 / 0** |
| Narrow screen (<= 600 px) | AppHeader 125-164 | AppHeader 125-164 | 4 / 0 / 1 (`.app-header__title font-size:18px`) / 1 (`display:none`) |
| Editor host | Main(LE) 265-283 | Main(LE) 61-79 | 10 / 0 / 0 / 0 |
| 3D-furniture hiding block | Main(LE) 20-59 | Main(LE) 20-58 | 6 / 0 / 0 / 0 (VV keeps the strip-height token in Boot 22-24) |
| Tab strip region | Main(LE) 62-262 | Boot 18-193 | 62 / 0 / 48 (the Drawings menu, 10 selectors) / 32 (rename and + tab, 6 selectors) |
| Loading-veil region | LoadingOverlays 253-339 | LoadingOverlays 266-344 | 27 / 2 (`.na-le-veil` `position` absolute vs fixed, `z-index` 40 vs 500) / 2 (`--over-model`) / 0 |

All 15 `--Vale_*` tokens have identical values in both apps, as do all `--Na_Le_*` tokens (`r4_tokens.py`).

**The difference is in the JavaScript and the lazy loader.**

- **Toggle.** Identical: ModeController 284 (constant), 517 (add), 561 (remove); CloseModelMenus 365-369 and 516.
- **Warm path.** If the editor is already loaded, a sheet tab calls `Na__LeLoad__Enter` (TabStrip 309, Loader 589),
  which runs Enter inside the click task, exactly as TV. But VV has no going-in veil to show.
- **Cold path** (the first press of a session, which is the normal case today), Loader 388-422:
  1. `WithEditor` shows `Na__LeLoadScreen` at once (390).
  2. The editor imports while its 8 stylesheets link in parallel (325).
  3. `Na__LeMode__Initialize` runs (329).
  4. The action calls Enter, and only then does the class land (517).
  5. The screen waits on `AwaitFirstDrawing` (376-384, 418).
  6. It fades over 500 ms (LoadingScreen 60).
- **The cover.** It is the start-up overlay, `.loading-overlay.na-le-loading` (LoadingScreen 83-91):
  `position:fixed`, the full viewport, opaque `#ffffff`, `z-index:9999` (LoadingOverlays 28-42).
  - Headline "Loading Layout Editor..." (LoadingScreen 61).
  - Statuses "Fetching the drawing tools", "Reading the drawing settings", then "Drawing the Views  -  n of N"
    (Loader 144-146, 380).
  - It covers the header and the strip, so the 1 s hold and the 1 s glide run unseen. When it fades, the bar is
    mid-glide or already gone.
- **Which presses fold.** Drawing tabs only. The Specification tab exists only while a sheet is open (TabStrip
  342-351). There are no Register or Statements tabs, and `OpenSpecification` calls `Enter(null)` directly
  (ModeController 650).
- **The gate.** Enter needs `Na__LeMode__IsAvailable()`, which is Layout Mode on AND at least one sheet
  (ModeController 327-330, 498; Loader 503-507). TV needs `Na__LeCfg__IsEnabled()` (ModeController 679). DR-25 keeps
  VV's gate for now.
- **Coming out.** The same behaviour and words: the ReturnTo3d port in VV LoadingVeil (281-310). The CSS differs:
  VV's base `.na-le-veil` is itself the fixed z 500 rule (LoadingOverlays 293-306), and no `--over-model` rule
  exists, although the module adds that class (LoadingVeil 131).
- **Never seen with the strip up.** VV devlog v2.70.0, lines 199-206: "THE VEILS ARE NOT BROWSER-VERIFIED HERE. A
  project with sheets would not load on a local static server, so the tab strip never appeared"; only the tokens and
  `transform: none` were checked. Line 216: "Not yet confirmed by Adam."

#### D.1.3 Every difference, line by line

Line numbers are TV / VV. "Identical" means the same declarations or code with comments stripped.

| # | Aspect | TrueVision | ValeVision | State | What Adam sees | Owner |
|---|---|---|---|---|---|---|
| 1 | Fold tokens | AppHeader 210-212 | AppHeader 206-208 | identical | nothing | guard: W0-04 check (1) |
| 2 | Header base rule (fixed, 60 px, z 1001, shadow, 2 px border) | AppHeader 42-57 | AppHeader 42-57 | identical. Only the comment on `--Vale_PrimaryBrand` differs (NA vs Vale; both `#172b3a`, line 29) | nothing | - |
| 3 | Header transition shorthand (delay 0 on the base rule) | AppHeader 229-232 | AppHeader 225-228 | identical | - | - |
| 4 | Folded header (`top -HeaderHeight`, shadow 0, delay 1000 ms) | AppHeader 234-238 | AppHeader 230-234 | identical | - | - |
| 5 | Strip transition and folded `top:0` with the same delay | AppHeader 247-254 | AppHeader 244-251 | identical | - | - |
| 6 | Host folded `top:var(--Vale_LayoutTabStripHeight)`, no transition | AppHeader 263-265 | AppHeader 260-262 | identical | - | - |
| 7 | Reduced motion | No rule; reasons in region 290-310 | No rule; reasons in region header 194-200 | same policy | Windows Animation effects off: the fold still animates in both | W0-04 check (6) |
| 8 | Comments | 202 says "Only the 480ms between them is new" (**stale**: 1000 ms hold plus 1000 ms glide); 195-200 and 269-285 say the canvas sits under the header only | 190-192 say the canvas is below the header and strip, and hidden on a sheet | comment-only | nothing | TV hygiene: WT-08 (DR-36) |
| 9 | <= 600 px header: 48 px; title | 143 / 159 `font-size:18px` | 143 / 159 `display:none` ("VGH logo carries the brand") | brand divergence | VV shows the logo alone on phones | keep (DR-44 item 3, D-S10-08) |
| 10 | Strip base rule (fixed, `top` header height, z 999) | Main(LE) 66-81 | Boot 33-48 | identical; different file by design | nothing | keep (DR-24); W0-04 check (2) |
| 11 | Strip height publish (36 px, body class, one `resize`) | TabStrip 173-177, 218-225 | TabStrip 143-146, 207-214 | identical | - | - |
| 12 | Host base rule | Main(LE) 269-279 | Main(LE) 65-75 | identical | - | - |
| 13 | 3D-furniture hiding block | Main(LE) 42-51, loaded with the page | Main(LE) 41-50, linked by the loader on first use (Loader 125-134, 325). Safe today: Run waits for the sheets to load (264-277) before Enter adds the class | same rules, different timing | none today; it becomes a fault once the class is added at the click | W1-33 moves it to Boot (S10-V01) |
| 14 | Class constant, add, remove | ModeController 425 / 700 / 777 | ModeController 284 / 517 / 561 | identical | - | - |
| 15 | 3D menus shut on entry | 469-473, 699 | 365-369, 516 | identical | - | - |
| 16 | Entry gate | `Na__LeCfg__IsEnabled()` (679) | `Na__LeMode__IsAvailable()` = Layout Mode AND a sheet (327-330, 498) | divergence | VV: no strip and no fold while a project's Layout Mode is off | keep until publishing (DR-25 (a); re-decided at W4-09) |
| 17 | Click to class | In the click task (TabStrip 480, ModeController 700) | Warm: in the click task (Loader 589). Cold: after import, stylesheets and Initialize (388-422) | different | VV cold: the hold starts late, under a cover | W1-33 (early class at the click) |
| 18 | Cover over the first drawing | In-host veil, z 40 inside the z 600 host; after 550 ms and only if still drawing; tabs stay readable; the header folds over it | Full-viewport opaque `.loading-overlay`, z 9999, from t=0 until drawn, then a 500 ms fade; header, strip and fold hidden | **different (the visible gap)** | VV hides the animation Adam named | W1-33 (DR-39 cover (a)) |
| 19 | Cover words | "Your Drawings Are Loading" + "Drawing the Views  -  n of N" / "Reading the Project Specification" / "Preparing the Drawing Fonts" (LoadingVeil 321, 339-350) | "Loading Layout Editor..." (LoadingScreen 61) + "Fetching the drawing tools" / "Reading the drawing settings" (Loader 144-145) + "Drawing the Views" (146) | different | sentence case and a different headline in VV | W1-33 (DR-39 wording (a): TV headline; VV's two pre-load lines kept first, in Title Case) |
| 20 | What the cover waits for | drawing count + specification + text metrics (ModeController 712-737) | drawing count only (595-600); `PreloadMetrics` returns nothing | different | VV can lift before the specification is in | W1-32 (PreloadMetrics returns its promise) + W1-33 |
| 21 | How often the first-drawing cover shows | Once per session (LoadingVeil 124, 316). Skipped under Quiet (ModeController 733), so the first drawing after a document tab still gets it | Only with the editor's first load; later actions get no screen (Loader 389) | different | after W1-34, a VV drawing opened after a document tab would open uncovered | W1-33 (TV's FirstOpen at TV's call site; see D.5 item 4) |
| 22 | Document tabs from the 3D view | fold via EnterUnder (883-888) | none; `OpenSpecification` calls `Enter(null)` (650) | different | TV folds on Specification, Register and Statements | W1-32 (EnterUnder, Quiet), W1-34 (tabs), W4-10, W4-13 |
| 23 | Coming-out veil CSS | `.na-le-veil` in-host base + `--over-model` fixed z 500 (LoadingOverlays 283-301) | base `.na-le-veil` fixed z 500 (293-306); no `--over-model` rule | different CSS, same look | nothing today; the in-host and published covers need TV's two modes | W1-33 (TV region verbatim) |
| 24 | Veil constants | 103-111 (with SHOW_AFTER 550 ms, CAP_IN 25 s) | 94-100 (coming-out set only) | subset | - | W1-33 (LoadingVeil 1.1.0 whole; VV keeps `DrawingSettled`) |
| 25 | Keyboard at entry | `RestartSheetKeys` + `Na__LePc__TakeKeyboard` (611-617, 694, 709) | `AttachSheetInput` (511, 526) | different | in TV the stage has the keys once the fold ends | W1-32, W1-36 |
| 26 | Proof in a browser | measured (TV devlog 8084-8096, 8115, 8140); strip 2.0.0 proved on RB05 at 375 px (TV devlog 1140-1152) | not browser-verified with the strip shown (VV devlog 199-206, 216) | gap | VV's fold has never been watched with a strip | D.4 checks 1-3 (baseline) |
| 27 | Records | TV PORT NOTEs: LoadingVeil "Back-port: PENDING" (54); TabStrip "PENDING ... after Adam's sign-off" (60) | Ledger 1240 says VV "carries only the `--over-model` veil" (false: there is no such rule); 1241 and LoadingVeil PORT NOTE 57-61 record the going-in veil as deliberately not ported; 1244 contradicts 1230 and Loader 51 | stale | - | W0-06 (ledger), W1-33 (VV PORT NOTE rewrite), WT-08 (TV notes) |
| 28 | Shell cache | TV bumps its own token per release (v2.158.0: `2026-09-23-06`, TV devlog 1128-1129) | Every fold or veil change is shell CSS or JS under WCP token `'2026-09-18-1'` (WCP worker 229), unbumped since 18-Sep | gap | a warm Vale client can pair new JS with old CSS until refreshed | W0-08 (registrar first), W6-02 (token request); Adam bumps at deploy (DR-07) |

#### D.1.4 Change list for the fold (K3 order)

**Nothing edits AppHeader in either app.** The fold rules stay byte-identical; `hot_file_ownership.json` lists no
editor for that file.

| Order | wp | What it changes for the fold | Gates (K3 `gated_by`) | Serial constraints (K3 hot files) |
|---|---|---|---|---|
| 1 | W0-04 | `Na__Verify__UiParity__` guards: (1) the AppHeader fold region; (2) the Boot tab-strip region against TV Main(LE); (3) the LoadingOverlays veil region; (4) Styles__Panels; (5) stylesheet order; (6) no `prefers-reduced-motion` in AppHeader; plus the token warning. Checks (1) and (6) pass today | DR-03, DR-05, DR-24, DR-34, DR-43 | - |
| 2 | W0-06 | Ledger: fold section re-verified 01-Oct-2026; row 1240 reworded; the pending return trip "TabStrip 2.0.0 + ModeController 1.30.0 EnterUnder (TV v2.158.0)" added; the 19 "no service worker" rows corrected; one status for the loader (rows 1230 and 1244) | DR-02, DR-03, DR-07, DR-24, DR-26, DR-35, DR-36 | records only |
| 3 | W0-08 | Shared worker package, prepared but not bumped: registrar at TV 1.1.0-1.3.0 with the unsaved-work hold (`window.Na__Pwa__HasUnsavedWork`), no reload on first install, `updateViaCache:'none'`; the lazily linked LE stylesheets precached | DR-07, DR-27, DR-28, DR-29 | only W0-08 and W6-02 edit the WCP worker (R6) |
| 4 | W1-31 | Loader facade 1.2: `VIEW_REGISTER`, `VIEW_STATEMENT`, `OpenRegister` and `OpenStatements` (refusing cleanly while absent), `IsSitePlanSheet` (false in VV), a feature-presence answer, and `CheckNames` rows | DR-01, DR-24, DR-25, DR-38, DR-39 | Loader: W1-31 -> W1-33 -> W1-34 -> W1-21 |
| 5 | W1-32 | `EnterUnder` and `Quiet`; `OpenSpecification` through EnterUnder; `PreloadMetrics` returns its promise; the Leave ordering | DR-01, DR-24, DR-25 | ModeController: W1-32 -> W1-33 -> W1-34 -> W1-36 |
| 6 | **W1-33** | **The fold fix itself**, listed below | DR-01, DR-24, DR-39 | Boot: W1-33 -> W1-34; Main(LE): W1-33 -> W5-02 |
| 7 | W1-34 | TabStrip 2.0.0, which shows document tabs from the 3D view, so the bar now folds on Specification too | DR-01, DR-24, DR-25, DR-38 | TabStrip: W1-34 -> W4-10 -> W4-13 |
| 8 | W1-36 | `RestartSheetKeys` / `TakeKeyboard` on every drawing entry, so the stage has the keys when the fold ends | DR-01, DR-33 | after W1-34 |
| 9 | W4-10, W4-13 | The Document Register tab, and the Design Statements tab behind `LayoutEditor__Statement__Enabled`. Both fold via EnterUnder | W4-10: DR-01, DR-05, DR-08, DR-11, DR-21, DR-37, DR-38. W4-13: DR-01, DR-10, DR-24, DR-38 | W4-10 -> W4-09 -> W4-13 |
| 10 | W4-09 | Web viewer: `WaitForFirstDrawing` resolves at once in the viewer; the published cover is wired | DR-01, DR-22, DR-25 | after W4-10 |
| 11 | W6-02 | One consolidated token request; Adam bumps at deploy | DR-07 | - |
| 12 | WT-08 | TV record hygiene: AppHeader 202 ("480ms"); Index.html 1730 ("one tab per sheet"); TabStrip 29-31 ("canvas ... shift down"; the canvas does not); stale LoadingVeil and ModeController PORT NOTEs | DR-36 | TrueVision lane |

**What W1-33 does** (WP-S10-01 + WP-S10-03R, read against the code):

1. **Hiding block.** Move it verbatim, comment included, from VV Main(LE) 30-50 to Boot, ahead of the Tab Strip
   region, and delete it from Main(LE). Add the VV-only `body.na-layout-editor--active .na-vs-tl`
   (S10-V03), recorded as a divergence (a W1-33 adaptation since R6 F.8 C22).
2. **Veil CSS.** Replace VV's "Layout Editor Return-to-Model Veil" region (LoadingOverlays 268-344) with TV's "Layout
   Editor Loading Veils" region (255-339). Keep the VV-only Load Error State, `--opaque` and `__status--error` rules.
3. **LoadingVeil.** Take TV LoadingVeil 1.1.0 whole. Keep VV's `Na__LeVeil__DrawingSettled` export and add an
   `immediate` option to `FirstOpen`. Call FirstOpen from Enter when not in the web viewer and not `Quiet`, at TV's
   call site, outside the not-active block (TV ModeController 733).
4. **Boot veil.** Restyle the loader's loading state as `.na-le-veil.na-le-veil--boot`:
   - geometry: fixed; `top:calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight))`; left, right and
     bottom 0; z 600;
   - look: opaque `#ffffff`, no blur, because the 3D canvas is still painted until Enter hides it (VV
     ModeController 518-519);
   - plus `body.na-layout-editor--active .na-le-veil--boot { top: var(--Vale_LayoutTabStripHeight) }`.

   The error state keeps today's full-screen `.loading-overlay--error`.
5. **Early class.** For a non-quiet press that will enter, the loader adds the class at the click, before the import.
   It removes it again on load failure (Loader 395-398), when the editor's config has it off (401-404), when Enter
   returns not-true (591), and on the error state's Back to 3D Model.
6. **No drawing wait in the loader.** It hides the boot veil straight after `action(editor)`; the in-host veil takes
   over. `WaitForFirstDrawing` resolves at once off the sheet view.
7. **Records.** Rewrite VV LoadingVeil's PORT NOTE divergence (57-61). Log ModeController 1.19.0, Loader 1.2.0,
   LoadingScreen 1.1.0 and LoadingVeil 1.1.0.

**Hand-over detail.**

- **Z-order.** The boot veil and the host share z 600. The host is appended to `<body>` by `Na__LeMode__Build` at the
  first Enter (VV ModeController 382-383), after the loading screen's root (LoadingScreen 83-91), so it paints above
  the boot veil the moment Enter un-hides it.
- **Rule.** `FirstOpen(..., { immediate:true })` must show its veil synchronously inside Enter. Otherwise one frame
  of the bare stage shows between the two covers.
- **Seam (settled by R6 F.8 C22; R0.2.11 Q-COVER part 2).** No source said how Enter learns that the loader's cover is up.
  LoadingScreen now exports `Na__LeLoadScreen__IsShown()` (true while its loading state is up, not fading and not the
  error state), and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to FirstOpen at TV's call site, so
  `Enter(sheetId)` keeps TV's signature (D.5 item 5).

#### D.1.5 Target behaviour, case by case

| Case | TrueVision (lead) | ValeVision after W1-33 and W1-34 | Remaining difference |
|---|---|---|---|
| 1. First drawing of a session; VV editor not yet loaded | The class lands at the click; the host shows at its final size under the bars; the hold runs 0-1 s; the in-host veil appears at 550 ms if still drawing; the glide runs 1-2 s; the veil lifts when every viewport `<img>` is decoded | The class lands at the click; 3D furniture vanishes at once; an opaque boot veil sits under the strip with "Your Drawings Are Loading" and Title Case pre-load lines; the hold and glide run over it; when the editor arrives, the in-host veil takes over in the same frame and lifts when drawn | VV shows a cover from t=0, because the editor is not there yet. This follows from keeping the lazy loader (DR-24 (a)) |
| 2. First drawing; VV editor already loaded (for example by a Dev action) | as case 1 | identical | none |
| 3. Specification (later Register or Statements) pressed from the 3D view | The bar folds; the first sheet opens quietly underneath; no veil; the page shows at once | Warm: identical. Cold: early class and boot veil while the editor imports only; no drawing wait; then the page | cold VV shows a short cover; its words are R0.2.11 Q-COVER part 1, Adam's (D.5 item 6) |
| 4. First drawing after case 3 | in-host veil (once per session), after 550 ms if still drawing | identical (TV's FirstOpen) | none |
| 5. Second and later drawings | no veil; the bar stays folded | identical | none |
| 6. 3D Model tab | The class is removed; the bar returns with no hold; "Loading Your 3D Model" sits at z 500 under the strip and header; the camera goes to scene 1; the veil lifts when it stops | identical | none |
| 7. Editor fails to load (VV only) | n/a | Full-screen error state (Reload Page, Back to 3D Model); the class is removed and the header comes back down | VV-only, by design |
| 8. Project with Layout Mode off (VV only) | n/a (TV has no such switch) | no strip, no fold | recorded divergence (DR-25); W5-07 retires the switch on a 'retire' answer at W4-09 (R6 F.8 C33) |

### D.2 Every other UI surface of the drawing experience

#### D.2.1 Surface by surface

"TV" means HEAD b2aa9151; "VV today" means HEAD 7b4e593a. All paths follow D.0's short names or are spelled out.

| # | Surface | TrueVision (lead) | ValeVision today | Action (K3) | Decision | Notes |
|---|---|---|---|---|---|---|
| 1 | Tab strip: tab set | Five tabs from the 3D view, all the same weight: 3D Model / Drawings (caret) / Specification / Document Register / Design Statements (TabStrip 321-361) | 3D Model, one tab per sheet, a + tab on localhost, and "Project Specification" only while a sheet is open (TabStrip 307-351) | W1-34. The Register tab comes with W4-10; Design Statements with W4-13, only if `LayoutEditor__Statement__Enabled` is on | DR-38 (a), DR-10, DR-01 | By default VV shows four tabs, not five: the DR-10 default builds Statements switched off. TV shows the Statements tab even on a project with none (TV devlog 1136-1137) |
| 2 | Drawings menu | On `<body>`, fixed, z 1002, `min-width:220px`, `max-width:min(380px, calc(100vw - 16px))`, 8 px inside the window, 12 px above its bottom, scrolls inside itself. Rows "D03 - 3D Images" in register order; the open row bold, tinted and focused; the whole number on hover; a site-plan hover; "+ New sheet" after a rule when editable. Closes on Escape, an outside press or a mode change. Up, Down, Home and End walk the rows (TabStrip 421-615; Main(LE) 170-260) | none | W1-34: 10 TV menu selectors (48 declarations) into Boot; 6 rename / + selectors out | DR-38 | The menu is not re-placed during a fold (D.1.1). That is identical in both apps, so K3 W1-34's acceptance line "during and after the header fold" should read "after the fold" (D.5 item 2; R6 F.8 C23 made that change) |
| 3 | Sheet reorder and rename | Not on the strip: the register reorders (`Register__Editor` BindRowDrag; `Register__Numbering` writes `Sheet__Order`); the Sheet panel renames | Double-click rename and drag reorder on the tabs (TabStrip 182-201, 316-330), VV's only reorder path | W1-34 keeps drag-to-reorder on the Drawings-menu rows (localhost, editable) as a recorded divergence; W4-10 removes it when the register lands | DR-38 reorder (a) | S10-V02 |
| 4 | End arrows | Shown only on overflow. They step tabs; landing on Drawings opens the last drawing read, or the first, without the menu (TabStrip 248-303, 192, 341). Titles "The tab before/after this one" | They step tabs. Titles "The drawing before/after this one" | W1-34 | DR-38 | proved by TV at 375 px (TV devlog 1149-1150) |
| 5 | When the strip shows | `IsEnabled()` and a sheet (316) | `IsAvailable()`: Layout Mode on and a sheet (TabStrip 302) | W1-34 keeps `IsAvailable` | DR-25 (a) | re-decided with publishing (W4-09) |
| 6 | Strip labels, aria, classes | see D.2.2; `aria-label="Project documents"` (632); Specification tab class `na-le-tabs__tab--specification` | `aria-label="Drawing sheets"` (406); class `--spec`, which gets an 8 px gap from Styles__Specification | W1-34. Drop the dead `--spec` rule in VV; offer the same deletion to TV in WT-08 so `Styles__Specification` stays byte-identical | DR-38 | The strip's labels must equal the loader's fallbacks, or tabs rename themselves when the editor loads (S10 wiring note 3) |
| 7 | Going-in, return and boot covers | D.1.1 | D.1.2 | W1-33 | DR-39 | see D.2.4 |
| 8 | Published-drawing cover (web viewer, every tab) | `Na__PubDoc__LoadingScreen__` 1.0.0 (TV v2.156.0), detailed in D.2.4 | none (VV has no publishing; its viewer renders sheets on the device) | W4-17 (inert leaf), W4-09 (wiring); needs W1-33's two-mode veil CSS | DR-22 (a) | Mirror TV in not linking `Na__PubDoc__Styles__Main__.css` (D.5 item 1) |
| 9 | Toolbar | 1.24.0: 12 controls VV lacks; Undo, Redo, Fit, 100% and Notes removed (D.2.3) | 1.9.0. Its log has 1.9.0 twice (Toolbar 32, 44) and 1.8.0 twice (S10 B4) | W1-35 (subtractive), then W5-01 (TV 1.24.0 whole); W0-06 fixes the log order | DR-40 item 3; DR-01; DR-13, DR-14, DR-18, DR-23 (W5-01 gates) | K3 ruling: no interim feature buttons |
| 10 | Panel host | PanelHost 1.6.0: tab hover text (`spec.hint`); `LinkedPairRow` / `ShowLink`; a typable box beside every slider; every colour input handed to the palette | 1.4.0 | W1-38 (whole), W1-32 (passes the hint labels) | DR-17 | S10-F11, S06a b.2 |
| 11 | Panels look | Styles__Panels (TV v2.154.0): one faint red (`#9b3b3b` on `#fbf3f3`, border `#e8c9c9`) for Off, Unlock and Ref; `flex-wrap` on toggle groups (live at once); rangebox; padlock pair; Ref button | VV colours only the lock | W1-38 (CSS verbatim); W2-36 (Layers Off-red, no Ref yet); W3-13 (Ref switch) | DR-17 | The diff is TV additions only, plus one moved rule with an unchanged cascade (S10-F10) |
| 12 | Left column tabs | Document Preferences / Specification (TV ModeController 521-536); needs 58 | no left tabs | W2-35, which also registers the `'document'` tab. One tab alone is invisible (`strip.hidden = tabs.length < 2`, PanelHost 273) | DR-01, DR-20 | S06a b.2 verifier |
| 13 | Selection focus | Selecting a viewport folds the markup accordion (`FOLD_GROUP`) | the sections stay open | W1-32 | - | S03a-V02 |
| 14 | Colour palette popover | `54__Feature__ColourPalette` (Picker 1.1.0): a white card of swatches (Monochrome greys from the DataLib SSOT MTE100 series; Dimensions red, blue and green at 150), with the browser mixer opened from a proxy on top; z 1299 / 1300; closes on pick, outside press, Escape, resize or scroll. Its CSS is imported by the CSS index, never injected | the bare browser colour mixer | W1-37 (module; attach on `VVM/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js`; CSS index line at TV's position, index 182); W1-38 (PanelHost attach) | DR-20 (2): identical swatches, named "Vale Garden Houses Standard" | Cascade note: VV's loader-linked editor sheets land after the CSS index, so 54 and 55 come before them (S10 wiring note 12) |
| 15 | Context-menu renderer | ContextMenu 1.1.0: flyout cards (after `FLYOUT_OPEN_MS`, Right and Left keys, Escape closes the flyout first), muted row hints, a "mixed" ring; `.na-le-menu--flyout` at z 1201 (Main__Paper 649) | 1.0.0; menu at z 1200 (Main__Paper 425) | W2-20 (verbatim; imports nothing; same three exports) | DR-34 | |
| 16 | Context-menu rows | SheetTools__ContextMenu 1.7.0 adds: a Layer row with a flyout (LayerMenu 1.0.0); picture rows; Rotate 90 and Reset rotation; Vector tools; Show in Specification; Boolean; `MenuOpenShape`, `MenuFinishView`, `MenuUnlock`, `MenuSnapOff` | 1.2.0. **Already has the container-aware rows** (S10 verifier): do not re-port them | W2-21 (LayerMenu leaf), W3-03 (rows, one atomic hub change); feature rows land with their features | DR-40 | S10-F13, S05a-F42 |
| 17 | Pointer tooltips | HoverTooltip 1.1.0 (`.na-le-hovertip`, fixed, z 1000 at Main__Paper 452, flips at the window edge, bold lead). NoteTooltip 1.0.0: after 500 ms on a bubble, "EW01  Loggia Arcade"; off on press, wheel, key or drag; never on reference layers | none | W2-20 (HoverTooltip), W2-21 (NoteTooltip leaf), W3-03 (wiring and `Na__Test__BubbleNoteTooltip__`) | - | NoteTooltip also needs `Na__LeLeadGeo__NoteFor` and `Na__LeModel__IsLayerSelectable` (S10-F14) |
| 18 | Button and tab tooltips | Toolbar titles read from each feature's config on every sync; strip hovers ("{drawing} is open. Press to choose another drawing"); panel tab hints | fixed strings; no tab hints | W5-01, W1-34, W1-32 + W1-38 | DR-40 item 7 | VV's Select and Move tooltips change only with auto-Move (S06a-V02) |
| 19 | 3D right-click (27) | `27__System__ContextMenuSystem`: isolate floor, hide element, doors (orbit, mouse only) | none | Not ported. W4-11 ports only its renderer and stylesheet, for the Statement Writer | DR-44, DR-10 | TF-T38 |
| 20 | Dev Tools menu: items and order | Navigation Modes, Presentation Scenes editor, Floor Plans, Elevations, Cross Sections (48 placeholder), North, Projected Linework, Layout Editor, Cache & Storage (TV Index.html 554-639) | Navigation Modes, Render Engine (VV-only), Cross Sections (VV 41 tool gate), Presentation Scenes editor, Floor Plans, Elevations, North, Projected Linework, Layout Editor, Export Render Layers (VV-only) (VV index.html 809-988) | W2-05 adds TV's 48 item and renames VV's colliding `naCrossSection*` ids (K2 S4); W2-01, W2-04 and W2-05 rebuild the plan, elevation and planes panels (S02a-F58) | DR-26 | Reordering VV's own items to TV's order is cosmetic and **unowned** (S10-F36; D.5 item 9) |
| 21 | Dev Tools: Layout Editor section | DevMenu 1.3.0: the live-phase bake filter (Model Source) | 1.4.0, ahead structurally: loader-aware, with the Enable Layout Mode switch | keep VV's file; W2-17 adds the filter; W1-34 rewords `NoSheets` | DR-25, DR-09 | S10-F36 |
| 22 | Full screen | `76__System__FullscreenMode`: a Tools row with an ON/OFF badge driven by `fullscreenchange`, and a "Better in Full Screen" card on every app open, suppressed on localhost (Prompt 1.2.0) | `60__Feature__FullScreenMode`: an "Enter / Exit Full Screen" row | keep VV's (K2 TF-T30, 60 reserved); adopt TV's 76 only on request | DR-44 | If adopted, two VV importers break: index.html 1383 and the CSS index 69 (S10-F27) |
| 23 | User guide | `75__System__UserInstructionsSystem` 2.4.0, with no drawing content | none | not ported (TF-T47) | DR-44 | 3D tab only |
| 24 | Breadcrumb | none; TV's hiding rule for `#naBreadcrumbNav` is a harmless leftover | `64__Feature__BreadcrumbNav` 1.0.0 (Whitecardopedia navigation, Alt+Backspace) | keep (TF-T34) | - | hidden on drawing tabs in both (Main(LE) hiding block) |
| 25 | Toasts | `.na-toast` `bottom:40px` (DropdownAndToast 1262-1281) | identical rule except `bottom:96px` (1248-1267) | WT-07: TV takes 96 px | DR-44, DR-36 | Toasts use weight 500, which renders as 400 in VV until W1-25. Save-toast wording (`SavedLocalMessage`) belongs to transport (Section C) |
| 26 | Confirm dialog | Same `Na__AppUtils__ConfirmDialog` 1.0.0, but no `#naConfirmDialog` markup and no CSS, so it falls back to `window.confirm` (ConfirmDialog 143-147) | Markup at index.html 1323-1330; CSS at DropdownAndToast 1375-1462, plus `--secondary` at 383-402 | **WT-05** brings VV's markup and CSS into TV. VV keeps its own through every index and CSS edit (S09-V01) | DR-36, DR-44 | Do not copy VV 1464-1509 (the VV-only Navigation Mode Selector) |
| 27 | Web viewer dock | `< n/N > Fit - + PDF Share`. PDF opens the baked file or toasts "This drawing has no published PDF yet."; an unpublished drawing shows a grey "Drawing has not yet been published officially" panel | `< 1 / 3 Fit - + PDF >` (VV v2.58.0) | W4-08 (Share), W4-09 (published path) | DR-22, DR-23 | S08 (e) |
| 28 | Fonts | Open Sans 400, 600, 500 and 300, local first then the NA CDN (Fonts 10-57) | 400, 600 and 300 only, from `www.noble-architecture.com/assets/AD04_...` (Fonts 12, 23, 34) | W1-25 adds Medium 500; a Vale-owned copy is the target, with AD04 as the interim | DR-21 | The Statement Writer's headings need 500 (S07b-F41) |
| 29 | 3D canvas and safe frame under a visible strip | Canvas `top:var(--Vale_HeaderHeight)` (RenderCanvas 9, 14): the strip hides the top 36 px of the 3D view and of the image-export safe frame | Both clear the strip (RenderCanvas 9, 14; ViewportOverlays 29, 32) | WT-07: TV takes VV's two rules | DR-44 | Since TabStrip 2.0.0, TV's strip is up on every project with drawings, so this shows in TV now |
| 30 | Snap marker and snap options | Colour by target (purple linework, blue vector, orange text, red dimension, slate paper or grid); 18 px glyphs; the snap options menu and Snap split button (ObjectSnap CSS 139-180) | Colour by tool (blue vertex/Draw, orange dimension, purple carry) | W2-19 (marker, menu and CSS; deletes VV's old `.na-le-osnap*` rules in the same commit); the split button comes with W5-01 | DR-40 item 2 | `--na-le-osnap-rgb` is the only shared token whose values differ (`r4_tokens.py`) |
| 31 | Spell-check UI | `55__Feature__SpellCheck` field and word bar; CSS from the CSS index (190) | none | W2-34 | DR-20 (1) | Vale dictionary route `/api/valevision/user-config/spellings` |
| 32 | Phones and iPad | 48 px header; the strip overflows at 375 px and shows its arrows; the menu stays inside the window; the viewer dock and touch controls differ in headers only; iPad "drawing keeps the finger" (TV v2.65.2) | the same, except the title is hidden and one tab per sheet; the iPad fix is already in (VV v2.58.1) | W1-34 | DR-44 item 3 | TabStrip 2.0.0 was "NOT tried on a real phone" (TV devlog 1152), so the D.4 check covers both apps |
| 33 | Keyboard focus | The menu focuses the open row; arrow keys, Home and End walk it; Escape gives focus back to the tab; keys stop before reaching the sheet (TabStrip 542-605); `RestartSheetKeys` / `TakeKeyboard`; KeyScope keeps 3D keys off drawing and document tabs; DocumentKeys; 17 `:focus-visible` rules | none of these; 9 `:focus-visible` rules. Neither app styles `.na-le-tabs__tab:focus-visible` | W1-34 (menu keys), W1-29 (KeyScope), W1-30 (DocumentKeys), W1-32 + W1-36 (restart and take the keyboard; Controls__Pc 1.4.0 stage press) | DR-33 | The extra 8 TV rules belong to TV-only controls (S10 B12) |
| 34 | Reduced motion | No live rule (D.5 item 1). The Spec Scrapbook halo says "NO prefers-reduced-motion BRANCH" (Styles__ScrapbookSpecification 390-396) | No rule | Ports carry these comments verbatim (W2-35, W4-17); W0-04 check (6) | - | S10-F31 |
| 35 | Cache & Storage dev panel | `70__System__DevTools/Na__UiFeature__DevMenu__CacheAndStorage__Controls.js` 1.0.0, with its own stylesheet | none (`PurgeAppCache__Button` only) | W5-04, adapted to `window.Whitecardopedia__Pwa__ServiceWorker__Registrar` (WCP Registrar 378) | DR-44, DR-07 | worth it, given the stale token |
| 36 | PWA install prompt | TV's own `62__Feature__AppInstallability` and its stylesheet | Whitecardopedia's stack (index.html 19 manifest, 34-44 scripts, 45 stylesheet) | permanent divergence (TF-T46, TF-S14) | DR-07 | Number 62 is a nominal collision with VV's `62__Feature__EmailWorkers` (nothing ports across it). EmailWorkers moves to `92__Feature__EmailWorkers` only if Adam asks (D-S01-08 (a); TF-T32, FR-22, W6-03, after its node_modules are untracked); the DR-03 default keeps 62 |

#### D.2.2 Tab-strip labels that must equal TV's

Read from both AppConfig(LE) files (`LayoutEditor__Labels__*`, TV line / VV line). After W1-34, VV's config values
**and** the TabStrip's code fallbacks equal TV's config text. The strip draws before the editor's config loads
(`Na__LeLoad__GetLabel` returns fallbacks until then, Loader 558-560), so any mismatch makes a tab rename itself on
load.

| Key | TV value (line) | VV today (line) | VV after W1-34 |
|---|---|---|---|
| `ModelTab` | "3D Model" (589) | "3D Model" (468) | unchanged |
| `DrawingsTab` | "Drawings" (590) | - | add |
| `DrawingsTabTitle` | "The drawings of this project. Press to choose one" (591) | - | add |
| `DrawingsTabOpenTitle` | "{drawing} is open. Press to choose another drawing" (592) | - | add |
| `SpecificationTab` | "Specification" (933) | "Project Specification" (716) | "Specification". The web viewer dock reads the same label (S10 WP-S10-04R note) |
| `SpecificationTabTitle` / `SpecificationTabUnsynced` | same text in both (934-935 / 717-718) | same | unchanged |
| `RegisterTab` / `RegisterTabTitle` | "Document Register" / "Every drawing of the project - its number, revision and status, and the revision notes" (593-594) | - | add (the tab shows from W4-10) |
| `StatementsTab` / `StatementsTabTitle` | "Design Statements" / "The written documents of this project - the pre-application statement, the design and access statement" (595-596) | - | add (the tab shows from W4-13 and only if DR-10 switches it on) |
| `TabsPreviousTitle` / `TabsNextTitle` | "The tab before this one" / "The tab after this one" (679-680) | "The drawing before/after this one" (506-507) | TV's |
| `AddSheetTab` / `AddSheetTitle` | "+" / "New sheet" (598-599) | same (469-470) | unchanged (now a menu row) |
| `SitePlanTabTitle` | "Site plan drawing" (620) | - | add (inert unless DR-08 brings site plans) |
| `TabStripNote` | the description of the strip (597) | - | add |
| `NoSheets` | "No sheets yet. New Sheet below makes the first; the tab strip and its Drawings menu appear with it." (677) | "No sheets yet. New Sheet makes the first one and opens it." (501) | TV's (DevMenu fallback too) |
| `SheetTabEditTitle` | "Double-click to rename, drag to reorder" (623) | same (490) | Dead in TV. In VV it is still used, on the Drawings-menu rows, until W4-10 (DR-38) |
| `LayoutModeLabel` and 4 sibling keys | - | "Enable Layout Mode" (502) | keep (DR-25) |

TV v2.158.0 leaves three label questions to Adam (TV devlog 1131-1138):

- "Document Register" or "Drawing Register";
- "Design Statements" or "Design Statement";
- whether the Drawings tab shows the open drawing's code.

These are config values. VV takes whatever TV's config holds at port time (DR-01 pin b2aa9151).

#### D.2.3 The toolbar, wave by wave

K3 rules out interim feature buttons (K3 section 11): W1-35 only removes buttons, and W5-01 takes TV's file whole.

| When | The editable toolbar reads (groups separated by gaps) | Evidence |
|---|---|---|
| TV 1.24.0 (the target) | name / Select, Move, Text, Leader, Dimension, Draw, Rectangle, Circle, Arc, Floor Area, Eyedropper / Image / Snap + arrow / Draft / Grid / Grid Snap / Ortho / Axes / hints / Raster / Vector / Save Sheets, Download PDF, Share | TV Toolbar Mount 423-597; W5-01 acceptance |
| VV today (1.9.0) | name / Select, Move, Text, Leader, Dimension, Draw, Rectangle, Eyedropper / Snap / Notes / hints / Undo, Redo / Fit, 100% / Raster / Save Sheets, Download PDF | VV Toolbar Mount 257-361 |
| VV after W1-35 | name / Select ... Eyedropper / Snap / hints / Raster / Save Sheets, Download PDF. Read-only: name / Raster / read-only note / Download PDF. No doubled separator. Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, right-click Zoom to fit and "Show notes margin" still work | W1-35 acceptance; S10-F09 |
| VV in waves W2 to W4 | The buttons are unchanged. Snap is repointed to `28__System__ObjectSnap` (W2-19). F3, F6-F9 and K work from W3-05; Circle and Arc work by key and the Vector Tools panel from W3-07; pictures by panel and drag from W3-09; Floor Area from W3-10; Share elsewhere from W4-08 | K3 section 11; W3-05 ("the toolbar buttons arrive with W5-01") |
| VV after W5-01 | identical to TV 1.24.0, with the VV header only. Select and Move tooltips take TV's wording only if W3-04 (auto-Move) has landed | W5-01 |

#### D.2.4 Loading covers in both apps

| Cover | TrueVision | ValeVision today | ValeVision target |
|---|---|---|---|
| App start-up (`#loadingOverlay`) | `.loading-overlay`, full viewport, z 9999 | same | unchanged |
| Editor lazy load (VV only) | n/a: the editor is imported by Index.html 901-904 | full-screen `.loading-overlay.na-le-loading`, z 9999 | the boot veil under the strip, opaque, z 600 (W1-33); the error state stays full-screen |
| First drawing of a session | the in-host veil (z 40), after 550 ms, once per session, not under Quiet, not in the viewer | only the lazy-load cover | TV's FirstOpen (W1-33) |
| Back to the 3D model | `--over-model`, fixed, z 500, at once | the same look (the base rule is fixed z 500) | TV's CSS region verbatim (W1-33) |
| Published drawing (web viewer, every tab press) | `Na__PubDoc__LoadingScreen__` 1.0.0, detailed below | none | W4-17 + W4-09, after W1-33's CSS |
| Image export and video (`#naLayoutLoadingOverlay`) | the same element | plus VV-only `--opaque` and `__status--error` (Video Studio) | keep (S10-F29) |
| Design-phase switch | TV-only `#naModelGroupTransitionOverlay` | none | out of drawing scope (DR-09) |

The published-drawing cover in detail:

- An opaque `#ffffff` cover rises at once, with no fade.
- After 350 ms, if the drawing is still coming, the words fade in over 240 ms: "{drawing} is now loading", where
  {drawing} is the tab label such as "D02 - Elevations".
- A faint status line (`#9aa1a8`, weight 300) steps through the jobs actually outstanding every 900 ms.
- The words stay at least 600 ms. The cover lifts when every file, picture and font has arrived (320 ms fade), with a
  20 s cap.
- It reuses the in-host `.na-le-veil` classes.
- Source: `TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Config__.json`, `PubDoc__Loading__Config`;
  `Na__PubDoc__LoadingScreen__.js` 78-88.

#### D.2.5 Stacking order (z-index ladder)

The ladder must end identical in both apps. Values were read from the CSS listed.

| z | Layer | TV | VV today | VV target |
|---|---|---|---|---|
| 0 | 3D canvas | yes | yes | - |
| 12 (inside the host) | Register and Statements pages (TV ModeController 877-879) | yes | - | W4-10, W4-12 |
| 40 (inside the host) | in-host loading veil; published cover | yes | - | W1-33; W4-09 |
| 500 | export overlay; coming-out veil | yes | yes | - |
| 600 | editor host | yes | yes | - |
| 600 | VV boot veil (VV-only; DOM order puts it under the host) | - | - | W1-33 |
| 999 | tab strip | yes | yes | - |
| 1000 | hover tooltip | yes | - | W2-20 |
| 1001 | header; Tools and Dev dropdowns | yes | yes | - |
| 1002 | Drawings menu; 3D nav toolbar (hidden on drawing tabs) | yes | toolbar only | W1-34 |
| 1003 / 1004 | help panel / scene carousel (both hidden on drawing tabs) | yes | yes | - |
| 1200 / 1201 | sheet context menu / its flyout | yes | 1200 only | W2-20 |
| 1299 / 1300 | palette proxy / palette card | yes | - | W1-37 |
| 1400 | Video Studio timeline menu (VV-only) | - | yes | keep |
| 9999 | toasts, start-up overlay, confirm dialog | toast and start-up only | all three (plus the lazy-load screen today) | WT-05 adds the dialog to TV |
| 10000+ | image-export overlays | yes | yes | - |
| 10050 | Publish Drawings dialog (S08 (e)) | yes | - | W4-07 |

#### D.2.6 Where UI rules live in ValeVision

This belongs to Section C (wiring); the UI-critical rules in brief:

- Anything drawn before the editor exists goes in **Boot**: the strip, the Drawings menu, the boot veil, and (after
  W1-33) the 3D-furniture hiding block.
- Anything shown on the way out of the editor, or by modules that load without it, goes in **LoadingOverlays**: the
  veils and the published cover.
- The palette (54) and spell check (55) go in **VV's CSS index** (K2 S5, TF-T44, TF-T45).
- Every editor sheet TV imports from its CSS index joins **`Na__LeLoad__STYLESHEETS`** in TV's order, with WebViewer
  last (K2 S5; W0-04's `Na__Test__LoaderStylesheets__`; W5-02 convergence).

### D.3 Brand versus behaviour

**ValeVision keeps its own values (brand and identity).**

| Item | VV keeps | Evidence and rule |
|---|---|---|
| Header logo and alt | `../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png`, "Vale Garden Houses" (index.html 163-167) | TV Index.html 170-174 (NA logo); DR-44 item 3 |
| Header title | "ValeVision 3D" (index.html 176); hidden at 600 px and narrower (AppHeader 159) | TV keeps 18 px (159), recorded as deliberate in TV v2.9.0; D-S10-08 |
| Page `<title>`, favicon, apple-touch icons, manifest | `ValeVision3D`; the Vale icon; Whitecardopedia's manifest (index.html 10-19) | TF-T46 |
| `theme-color` | `#172b3a`, the same in both | - |
| Colour tokens | **Nothing to re-brand**: all 15 `--Vale_*` tokens are identical (`--Vale_PrimaryBrand` `#172b3a` in both); token names are shared and never renamed | `r4_tokens.py`; K2 S1 |
| Typeface | Open Sans (Vale's face per VV plan D14); **hosting** moves to a Vale-owned copy, with AD04 as the interim | DR-21; K2 V1 |
| Colour palette name | "Vale Garden Houses Standard"; swatches identical | DR-20 (2) |
| Console prefix | `[ValeVision3D <System>]` | K2 C1 |
| App-named globals and storage keys | never `window.TrueVision__*`; `window.Na__Pwa__HasUnsavedWork`; storage keys swap the app token | K2 K4, B2 |
| NA-only content | Project Portal / QR block, the `/q/` and `/s/` URLs, "TrueVision 3D Project Hub", NA letterheads, the logo stand-in text, TV's placeholder Classic scan: Vale values or switched off | DR-43; K2 V2; the parity lint W0-04 |
| Identity written into published data | "Published by ValeVision3D"; a Vale share-sheet title; the SchemaRef pointed at VV's folder | S08-V04; W4-07, W4-08 |
| VV-only furniture | Breadcrumb (64), Share Project Link (61), email (62; to 92 only if Adam asks, DR-03 / FR-22), notifications (63), Video Studio (31), Export Render Layers (71), the Render Engine and Navigation Mode Selector controls, the loader's error state | TF-T18, TF-T31 to TF-T35, TF-T37; S10-F29 |
| PWA stack | Whitecardopedia's registrar, worker and prompt | TF-T46, TF-S14; DR-07 |

**Must match TrueVision (behaviour and layout).**

| Item | Rule | Owner |
|---|---|---|
| Fold tokens, rules, body class `na-layout-editor--active` | byte-identical (K2 S1, S3) | guard W0-04 |
| When the fold fires; what covers it; its words, timings and Title Case | TV's | W1-32, W1-33, W1-34 |
| Strip: tabs, order, labels, hovers, aria, Drawings menu, arrows | TV's config text and code | W1-34 |
| Toolbar order, words and lit states | TV 1.24.0 | W1-35, W5-01 |
| Panels: CSS, tab hints, slider boxes, the one-red switches, left column tabs | TV's | W1-38, W1-32, W2-35, W2-36, W3-13 |
| Context menus (flyouts, hints, rows), pointer and note tooltips | TV's | W2-20, W2-21, W3-03 |
| Colour palette behaviour | TV's | W1-37, W1-38 |
| Snap marker colour by target | TV's | W2-19 (DR-40 item 2) |
| Covers: first-open, return, published | TV's | W1-33, W4-17, W4-09 |
| Confirm dialog look; toast height; canvas clearance | equal in both. **VV's values win**, so these are TV edits | WT-05, WT-07 (DR-36) |
| Font weights, including Medium 500 | TV's | W1-25 |
| Keyboard and focus handling | TV's | W1-29, W1-30, W1-34, W1-36 |
| z-index ladder (D.2.5) | equal | as listed |
| Reduced-motion policy | no branch on the fold | guard W0-04 |
| Web viewer dock and Unpublished panel | TV's | W4-08, W4-09 |

**Same behaviour, different structure (permanent seams).** Each is recorded in the ledger by W0-06 and the scribes.

| Seam | Why | Guard |
|---|---|---|
| Tab-strip CSS in Boot, not Main(LE) | the strip draws before VV's lazily loaded editor (DR-24) | W0-04 check (2) keeps the regions identical |
| Lazy loader and boot veil (`LE/01__Core__Loader`) | DR-24 (a); TV reserves LE/01 for it (TF-L01) | W1-31 facade checks; `Na__Test__LoaderFacade__` |
| Editor stylesheets in `Na__LeLoad__STYLESHEETS`, not the CSS index | DR-24; K2 S5 | `Na__Test__LoaderStylesheets__` |
| 54 and 55 cascade before the editor sheets in VV, after them in TV | the loader appends at the end of `<head>` (S10 wiring note 12) | the 55 port checks its host fields |
| The Layout Mode gate on the strip | DR-25 (a), until publishing | re-decided at W4-09 |
| Drag-to-reorder on Drawings-menu rows | DR-38, until the register | removed by W4-10 |
| The VV-only `--boot` modifier and the `.na-vs-tl` hide selector | lazy load; Video Studio | listed in PORT NOTE Divergences |

### D.4 Manual acceptance checklist (both apps side by side)

**Set-up.**

- Use the same-shaped project in both apps: at least three sheets, the first with two or more viewports, and a
  specification. In VV, the project's Layout Mode must be on (DR-25).
- Serve TV from `NAAPPS/ProjectVision__LocalServer__Main__.py` and VV from `WCP/server.py`. VV v2.70.0 records that a
  project with sheets would not load on a plain static server (VV devlog 202-203).
- Use desktop Chrome at 1920x1080, plus a 375 px device emulation. Hard reload both apps, and clear site data for VV
  (it runs under the shared Whitecardopedia worker).
- Leave Windows "Animation effects" **off**. It must not matter.

**How to read the table.** "Both" is what each app must do once the named package has landed. The last column is the
only difference allowed.

| # | Run after | Do this in both apps | Expected in both | Allowed VV difference |
|---|---|---|---|---|
| 1 | now (baseline) | DevTools > Elements on the 3D view: compare `--Vale_HeaderFoldDuration`, `--Vale_HeaderFoldEase` and `--Vale_HeaderFoldDelay` on `:root`, and the computed `transform` of `.app-header` | the same strings in both (`1000ms`, `cubic-bezier(0.40, 0.00, 0.20, 1)`, `1000ms`); `transform: none` | - |
| 2 | now (baseline) | Open a drawing, press 3D Model, then press a drawing again. The second entry is warm in VV, with no cover in either app | Header and strip hold 1 s, then glide 1 s as one object (no gap, no shadow smudge over the tabs); the paper does not jump when the glide ends; on 3D Model the bar drops back with no hold | none: this is the fold Adam named, seen in VV with the strip up for the first time (VV devlog 199-206) |
| 3 | now (baseline) | VV: cold first drawing of a session | Known gap: a full-screen "Loading Layout Editor..." hides the header, strip and fold (D.1.2) | this check records the gap; check 4 replaces it |
| 4 | W1-33 | Leave the Tools & Settings menu open, then press the first drawing (cold in VV) | The menu, nav toolbar, help panel and carousel vanish **at the click**; header and strip stay visible; the hold and glide run with the strip welded; "Your Drawings Are Loading" with "Drawing the Views  -  1 of 2" sits below the strip; it lifts only when both viewports are drawn | VV's cover appears at once, is opaque white and first shows "Fetching the Drawing Tools" / "Reading the Drawing Settings"; TV's appears after 550 ms if still drawing |
| 5 | W1-33 | Watch the hand-over in VV (slow the network to Fast 3G) | no blink or bare-stage frame between the boot cover and the in-host veil; no 3D model shows through | - |
| 6 | W1-33 | Open a second drawing | no veil; the bar stays folded | - |
| 7 | W1-33 | Press 3D Model | The bar drops at once with no hold; "Loading Your 3D Model" sits over the model with the strip and header above it; the camera flies to scene 1; the veil lifts when it stops | - |
| 8 | W1-33 | VV only: force a load failure (block a module in DevTools), then press Back to 3D Model | full-screen error state; the header comes back down; `body` has no `na-layout-editor--active` | VV-only path |
| 9 | W1-33 | VV only: switch Layout Mode off in the Dev section while a cold load runs | no body class left behind; no strip | VV-only path |
| 10 | W1-33 | DevTools: watch `body` classes while pressing a drawing tab, then 3D Model | `na-layout-editor--active` appears at the click and disappears at 3D Model | - |
| 11 | W1-34 | 3D view, with the header down | The strip sits under the header, 36 px high, in the same greys: "3D Model / Drawings (caret) / Specification", all the same weight | TV also shows Document Register and Design Statements; VV gains them at checks 30 and 31 |
| 12 | W1-34 | Press Drawings | A menu hangs under the tab: every sheet as "D0n - Name" in order; whole numbers on hover; the open row bold, tinted and focused; "+ New sheet" after a rule when editable | - |
| 13 | W1-34 | In the menu: Down, Down, Home, End, then Escape; reopen it and press outside it | the arrows walk the rows; Escape shuts the menu and gives focus back to the Drawings tab; an outside press shuts it; the sheet underneath never moves | - |
| 14 | W1-34 | Pick a row | The menu shuts first, then the fold runs; Drawings is the active tab, with "{number} is open. Press to choose another drawing" on its hover; pressing Drawings again only toggles the menu | - |
| 15 | W1-34 | Fresh load, then press Specification from the 3D view | the bar folds; no "Your Drawings Are Loading"; the specification page shows | cold VV shows a short cover while the editor imports; its words are R0.2.11 Q-COVER part 1 (D.5 item 6) |
| 16 | W1-34 | After check 15, pick a drawing | the first-drawing veil appears (once per session) if still drawing after 550 ms | - |
| 17 | W1-34 | 375 px wide | The header is 48 px; the strip overflows and shows its end arrows; "next" from 3D Model opens a drawing without the menu; the menu stays 8 px inside the window; the fold travels 48 px | VV hides the title, so the logo stands alone (brand) |
| 18 | W1-34 | Reorder two sheets | the Drawings menu lists them in the new order | TV reorders from the Document Register; VV by dragging menu rows until W4-10 (DR-38) |
| 19 | W1-34 | VV cold load: watch the strip's labels and hovers before and after the editor finishes loading | nothing renames itself | - |
| 20 | W1-34 | A project with no sheets | no strip, no fold | VV also hides the strip when Layout Mode is off |
| 21 | W1-34 | VV: DevTools > Network on a cold load | no editor module is fetched before a tab is pressed | - |
| 22 | W1-35 | Look at the toolbar | VV reads as in D.2.3 "after W1-35"; Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z work; right-click Zoom to fit works; "Show notes margin" works | TV has the extra controls until W5-01 |
| 23 | W1-36 | Page Down, then return from the Specification, then tick a panel checkbox, click the paper and press M | Page Down turns to the next drawing and stops at the last; returning restarts the sheet keyboard; M picks Move | - |
| 24 | W1-37, W1-38 | Click any colour field in a panel, and the 3D Plan Annotations dimension swatch | A white swatch card opens with the browser mixer over it; it shuts on pick, outside press, Escape, resize or scroll | VV's palette is titled "Vale Garden Houses Standard" (DR-20) |
| 25 | W1-38 | Hover the panel column tabs; drag a slider; narrow the right column | hover text on the tabs; a number box beside each slider; scale buttons wrap instead of clipping | - |
| 26 | W2-36, W3-13 | A hidden, a locked and a reference layer | all three switches show the same faint red | - |
| 27 | W2-35 | The left column | tabs "Document Preferences / Specification"; Show in Specification pulses the row (after W3-03) | - |
| 28 | W3-03 | Right-click a text box, a viewport and bare paper | identical rows; the Layer row opens a flyout of layers in list order with the holder dotted; a mixed selection is ringed; Escape closes the flyout first | rows for features Adam declines (DR-13, DR-14, DR-18) |
| 29 | W3-03 | Rest the pointer on a linked specification bubble for 0.5 s | "EW01  Note title" appears beside the pointer and flips at the window edge; it goes on press, wheel, key or drag | - |
| 30 | W4-10 | Document Register from the 3D view, then from a drawing | the bar folds; no drawing veil; the register page shows | VV phases and document codes per DR-11 |
| 31 | W4-13 | Design Statements (only if DR-10 switches it on) | as check 30 | absent while the switch is off (DR-10 default) |
| 32 | W4-09 | Web viewer (`?authoring=off`): open D02, then press another tab mid-load, then 3D Model | The cover rises at once; after 350 ms "D02 - Front Elevation is now loading" with a faint status stepping through jobs; another tab takes the cover over without a blink; 3D Model drops it; the dock reads `< n/N > Fit - + PDF Share` | Vale share link form (DR-23) |
| 33 | W5-01 | Look at the toolbar | identical order, words, lit states and hovers to TV 1.24.0 | the Select and Move tooltips follow DR-40 item 7 |
| 34 | W1-25 | DevTools console: `document.fonts.check('500 1em "Open Sans"')`; a toast; a dropdown heading | `true`; Medium weight in both | font host per DR-21 |
| 35 | WT-05 (TV) | Delete a sheet from the Dev section in each app | the same styled modal: a light secondary Cancel and a red Confirm; Escape and the backdrop cancel; `window.confirm` is never reached | - |
| 36 | WT-07 (TV) | Save Sheets on a drawing tab and in the web viewer; then look at the 3D view of a project with sheets | the toast sits at the same height (96 px); the 3D view and the export safe frame start below the strip in both | - |
| 37 | any wave | Windows Animation effects off (`prefers-reduced-motion: reduce`) | the fold still animates; the veils still fade | - |
| 38 | W0-08 + Adam's deploy | Live site, fresh browser profile: open a VV project; then deploy a changed LE stylesheet and reload | the model loads once and there is no self-reload on the first worker claim; the changed stylesheet shows on the first load after the deploy | (TV behaves this way since v2.75.0) |

### D.5 Corrections and open points raised while writing this section

1. **No live reduced-motion rule exists in either app.** S10 B12 names TV's published reader tier fade
   (`TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Styles__Main__.css` 116-121) as "TV's only branch". But
   that stylesheet is linked by nothing: grep over `02__Src__AppModules`, `03__Style__AppStylesheets` and Index.html
   finds only the file itself and README 58. So the rule is inert in TV too. W4-17 ports the file unlinked, as TV
   has it; whether TV should link it is WT-12 / S08's call.
2. **Correct K3 W1-34's acceptance line.** It said the menu "hangs under the strip during and after the header fold";
   it should say "after the fold". `Na__LeTabs__PlaceMenu` (TabStrip 508-519) runs only on open (574), on a re-render
   while the menu is open (370), on scroll (649) and on resize (655-659), and a mode change shuts the menu (662). This is
   identical in TV (S03a verifier, (e) note 3). Settled: R6 F.8 C23 made this change in `wp_canonical.json`.
3. **W0-04 note: when each UI check can pass.** The note said the UI gate fails "until W1-30/W1-31". In the code:
   - check (1) AppHeader and check (6) no reduced-motion pass **today**;
   - check (3) the veil region passes after W1-33;
   - check (2) the Boot tab-strip region passes after W1-34;
   - check (4) Styles__Panels passes after W1-38.

   Run the gate as a report until W1-38. Settled: R6 F.8 C2 rewrote W0-04's note (each check blocks once its owner is DONE,
   every check from W1-99).
4. **DR-39's third question needs no loader change.** S03a-V05 / D-S03a-11 proposed a loader-only wait for "the
   first drawing after a document tab". W1-33 instead ports TV's `FirstOpen` at TV's call site, which gives that
   behaviour by itself:
   - the call sits outside the not-active block (TV ModeController 733);
   - it is skipped under Quiet;
   - its once-per-session flag (LoadingVeil 124, 316-317) is still unused after a quiet entry, so the first real
     drawing tab gets the veil.
5. **Seam: how `immediate` reaches FirstOpen (settled; R0.2.11 Q-COVER part 2).** TV's `Enter(sheetId)` takes no option,
   and no source said how VV's Enter learns that the loader's cover is up. Options were: the loader passes an option
   through the facade, or LoadingVeil checks the cover itself (`#naLayoutEditorLoading` visible). The veil must show
   synchronously inside Enter (D.1.4, hand-over detail). Settled by R6 F.8 C22: LoadingScreen exports
   `Na__LeLoadScreen__IsShown()` and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to FirstOpen at
   TV's call site (a check of the loader's cover, made through LoadingScreen's own state); `Enter(sheetId)` keeps TV's
   signature.
6. **Open (Adam's, R0.2.11 Q-COVER part 1): what the cold-VV cover says on a document tab.** No source specifies it. TV never shows a cover there,
   because its editor is loaded at start-up. Recommended default: the boot cover with the two pre-load status lines
   and the same headline, and no drawing job; Adam confirms by eye (D.4 check 15).
7. **K3 header-line owners.** K3 W0-06's note says WP-S10-08R's header lines go to W1-29/W1-30/W1-31. The raw map and
   the package adaptations put them in W1-33 (ModeController, Loader, LoadingVeil) and W1-34 (TabStrip). The Toolbar
   PORT NOTE belongs to W0-06 or W1-35, since W1-34 does not edit the Toolbar. Settled: R6 F.8 C15 (W1-33 and W1-34
   write those lines; the Toolbar PORT NOTE is W0-06's).
8. **Five tabs need two answers.** "Identical strip" needs DR-10 answered (a) with the switch on. Until then VV
   shows four tabs after W4-10. DR-25 (a) also keeps VV's strip, and so its fold, hidden on any project whose Layout
   Mode is off, until a DR-25 'retire' answer releases W5-07 (R6 F.8 C33). The front matter lists every difference that
   remains on the K1 defaults and the answer that removes each (R0.1.8, E1-E13).
9. **Unowned and optional.**
   - Reordering VV's own Dev Tools items to TV's order (S10-F36, cosmetic) has no package.
   - The VV-only `.na-vs-tl` hide selector (S10-V03) is in W1-33's adaptations since R6 F.8 C22, as a recorded
     divergence.
   - The Drawings menu and the 3D nav toolbar share z 1002 on the 3D tab. DOM order decides between them; it is the
     same in both apps after the port. Worth one look.
10. **TV-side stale comments for WT-08.**
    - AppHeader 202 ("Only the 480ms between them is new"; the real figures are a 1000 ms hold and a 1000 ms glide).
    - Index.html 1730 ("3D Model plus one tab per sheet").
    - TabStrip 29-31 (says the canvas shifts down with the strip; TV's canvas does not).
    - LoadingVeil 54 ("Back-port: PENDING"; VV took it in v2.70.0).
    - ModeController and Toolbar ("Parity: verbatim").
11. **The shared-worker token** is `'2026-09-18-1'` (WCP worker 229) and every UI wave changes VV shell files. No
    package bumps it (R6); W0-08 must land the registrar fixes before the first bump; Adam bumps at deploy (DR-07,
    W6-02). Until then warm Vale clients may pair new editor JavaScript with old stylesheets.
