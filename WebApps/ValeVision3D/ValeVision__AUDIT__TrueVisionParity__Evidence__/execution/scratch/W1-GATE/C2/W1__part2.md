# Wave W1 - Integrator Gate Report

> This file holds both Wave 1 gate runs. **PART 2** (the continuation gate, 02-Oct-2026 09:17-09:42) comes first and
> is the current state of the wave. **PART 1** (02-Oct-2026 02:13-02:45, the gate of W1 part 1, released as v2.71.2)
> follows below the second rule, byte for byte as its gate wrote it; where the two differ, PART 2 is current.

---

## PART 2 - Continuation gate (W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-36, W1-37, W1-38)

```
Wave            : W1 continuation (workflow run wf_2aeb57ef-e2a): the 12 packages skipped in part 1 (OC-10).
                  11 DONE (W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-37, W1-38) and 1 PARTIAL
                  (W1-36: landed and green; its one open item is a TrueVision test held back - section 4.1).
                  W1-99 (Parity Scribe, v2.71.3) runs after this gate.
Gate run        : 02-Oct-2026, 09:17 - 09:42, on the quiescent tree (no package agent running; last package write
                  09:08:12, W1-36)
Baseline of
this gate       : the W1 part-1 checkpoint execution/checkpoints/W1a__20261002-0331 (written 03:31:37)
VV repo HEAD    : 7b4e593a (unchanged; nothing committed, staged, stashed or reset - the index still holds exactly
                  W0-02's 81 git mv renames, all R100)
TV pin          : b2aa9151 (NaWeb HEAD still b2aa9151; TV working tree clean for na-apps/30__TrueVision__CoreAppCode)
Status          : PASS_WITH_NOTES - every gate green on the final run; one package PARTIAL and two items that need an
                  orchestrator correction (section 4)
Fixes by gate   : 1 - FIX-C1, eight STALE rows off the AppConfigParity allow-list and one row relabelled, asked for by
                  W1-22 F3, W1-25 F3 and W1-26 F1 (section 3)
Open items      : section 4 (4.1-4.3 need the orchestrator; the rest are notes and hand-overs)
Evidence        : execution/scratch/W1-GATE/C2/ (every command's full output; FINAL__*.txt is the final run)
```

Every command below ran from the VV app root `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` unless it says
otherwise. Nothing was started, stopped or restarted; nothing was deployed; no token was bumped; only read-only git
commands were run (status, diff, diff --cached, rev-parse, show, ls-tree, apply --check). Browser checks ran headless in
my own Chromium (Playwright from the npx cache): offline sandboxes answered from disk, or GET/HEAD-only on Adam's Flask
server with every other request aborted (section 1.1). Nothing was written to the server, R2 or any project. The one
repository file the gate wrote is FIX-C1's test (section 3).

### 1. Gates (final run, after FIX-C1)

| Gate | Command | Exit | Result (exact counts) |
|---|---|---|---|
| G1 | `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` | 0 | PASS. App graph **554 modules** from 1 entry point, **0 failures** (W1a: 527). Import-map targets 110 modules from 10 targets, 1 failure = the documented vendor known issue (three-edge-projection 0.0.10 `SilhouetteGeneratorWorker.js` extensionless specifier, unreachable), unchanged. |
| G2 | `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` | 0 | PASS. **470 files** checked (W1a: 459); loader facade **38** editor names through mode, model, spec, config, viewport3d, pdf in 4 files (W1a: 37). |
| G3 | `python -B "...\execution\tools\path_gate_records_exempt.py" --root "...\ValeVision3D"` (OC-04) | 0 | **PASS (0 fail, 1 warn)**. Checked: css @import 29, new URL 43, path strings 193, folder tokens 36 (W1a: 28 / 41 / 177 / 33). The warn is the pre-existing `TestEnv__PrototypeTestingSandbox__DomAndLayout.html:46` sandbox path. Raw `k2_path_gate.py` for reference: exit 1, 55 fail - all 55 are G1 retired-name hits inside `ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` (the plan); 0 in code; the same 55 as W0 and W1a (OC-04). Not caused by this wave. |
| G4 naming | `node 80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs` | 0 | **PASS (0 fail, 0 warn)**: 551 shipped files + 50 test-folder files (banner only) (W1a: 537 + 40), 68 folders against the registry (W1a: 66), 11 Layout Editor stylesheets. Baseline: 1 file recorded, 1 since rewritten. |
| G4 port notes | `node 80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs` | 0 | **PASS (0 fail, 123 warn, 80 pending)**: 597 files, 370 PORT NOTEs, 468 DEVELOPMENT LOGs (W1a: 573 / 348 / 448). Baseline 139 files: 103 still as recorded, 36 since rewritten (W1a: 114 / 25) - their full checks apply and pass. WARNs: 112 carry `[baseline 01-Oct-2026]`; 11 are declared `- Legacy :` / source-version markers, WARN by design - 5 from part 1 (Invalidation, ModelToggle, the floor-plan and elevation Dev sheets, the ElevationGeometry page) and 6 from the continuation: History x2 (TV's log repeats 1.3.0, W1-21), MarkupBridge (TV's log repeats 1.12.0, W1-28), Styles__Surfaces (unversioned sheet, W1-22), the Colour Palette stylesheet (W1-37), the TitleBlockScaleCell page (W1-26). Pending placeholders: **80 in 68 files** - W1-07 x3, W1-19 x3, W1-20 x10, W1-21 x6, W1-22 x8, W1-25 x6, W1-26 x11 (10 + FIX-C1's 1), W1-27 x6, W1-28 x10, W1-36 x9, W1-37 x5, W1-38 x3. No part-1 or W0 placeholder is left. |
| G4 UI parity | `node 80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs "D:\11_RefLib__...\30__TrueVision__CoreAppCode"`, and again with `--pin b2aa9151` | 0 / 0 | Report mode; identical at the working tree and at the pin: [1] fold PASS, [2] strip PASS, [3] veil PASS, **[4] panels PASS** ("152 rules, 526 declarations, equal to TrueVision's" - W1-38; W1a: FAIL), [5] order PASS ("Colour Palette and Spell Check: after Boot, in order" - W1-37), [6] motion PASS, [7] token WARN (shared SW token `2026-09-18-1` predates 17 VV releases, newest v2.71.2; Adam's at deploy, DR-07). **"0 of 7 checks fail"** (W1a: 1 of 7). Blocking: `--pin b2aa9151 --block all` exit 0, "RESULT: PASS (0 non-blocking check(s) fail)"; `--block 1,2,3` exit 0. |
| G5 | every `*.test.mjs` / `*.test.cjs` / `*.test.py` in `80__Testing__PrototypeEnvironment` plus `Na__Test__StatementServer__.py --check` (test client only, no port), via `C2/run_g5.py` (PYTHONDONTWRITEBYTECODE=1) | 0 | **33 of 33 PASS** (W1a: 24) - table below. The first `*.test.cjs` (DraftGuard, W1-07) runs under plain `node` (node:test). Every python test drives Flask test clients over temp folders; none needs the network. |

The first run (RUN1, 09:17, before the fix) gave the same counts except: `Na__Test__AppConfigParity__` exit 0 with
"Every check passed (1 warning)" - **8 STALE allow-list entries** (exit 1 with `--strict`, "1 FAILED"), and G4 port
notes 79 pending (W1-26 x10). Every other line of RUN1 equals the final run.

G5 per test (final run; exit code, PASS lines counted, FAIL lines counted, the test's own summary line):

| Test | Exit | PASS | FAIL | Summary | New / changed in the continuation |
|---|---|---|---|---|---|
| Na__Test__AppConfigParity__.test.mjs | 0 | 8 | 0 | Every check passed. (RUN1: "(1 warning)", 8 STALE) | changed: W1-26 (+2 rows), FIX-C1 |
| Na__Test__AuthoringZoomMax__.test.mjs | 0 | 12 | 0 | Every check passed. | **new** - W1-36 (TV 1.0.0) |
| Na__Test__ColourPalette__.test.mjs | 0 | 55 | 0 | 55 passed, 0 failed | **new** - W1-38 (TV 1.1.0) |
| Na__Test__DimensionRoundUp__.test.mjs | 0 | 21 | 0 | Every check passed. | - |
| Na__Test__DocumentKeys__.test.mjs | 0 | 75 | 0 | Every check passed. (reads the mode controller W1-36 changed) | - |
| Na__Test__DraftGuard__.test.cjs | 0 | 11 | 0 | # tests 11, # pass 11, # fail 0 | **new** - W1-07 (TV 1.0.0) |
| Na__Test__DraftRestore__.test.mjs | 0 | 27 | 0 | Every check passed | **new** - W1-07 (TV 1.0.0) |
| Na__Test__DrawingDrafts__.test.mjs | 0 | 50 | 0 | ALL CHECKS PASSED | - |
| Na__Test__DrawingNotesRoute__.test.py | 0 | 43 | 0 | the drawing notes route reads, writes, keeps and refuses as it should | - |
| Na__Test__ElevationDepthFog__.test.mjs | 0 | 68 | 0 | All checks passed. | - |
| Na__Test__FloorAreas__.test.mjs | 0 | 48 | 0 | PASS - every check passed. (47 checks) | **new** - W1-27 (TV 1.0.0) |
| Na__Test__FloorPlanStoreyLevel__.test.mjs | 0 | 37 | 0 | PASS - every check passed. | - |
| Na__Test__LayerStack__.test.mjs | 0 | 24 | 0 | PASS - every check passed. (23 checks) | **new** - W1-28 (TV 1.0.0) |
| Na__Test__LoaderFacade__.test.mjs | 0 | 119 | 0 | PASS - every check passed (118). (W1a: 117; +1 the DRAWING_SITEPLAN row, W1-21) | - |
| Na__Test__LoaderStylesheets__.test.mjs | 0 | 7 | 0 | Every check passed. | - |
| Na__Test__NorthCompass__.test.mjs | 0 | 24 | 0 | PASS - every check passed. | - |
| Na__Test__PerSceneLighting__.test.mjs | 0 | 40 | 0 | All checks passed. | - |
| Na__Test__ProjectDataSaveGuard__.test.py | 0 | 60 | 0 | FAILURES: 0 | - |
| Na__Test__ProjectQr__.test.mjs | 0 | 62 | 0 | 62 passed, 0 failed | - |
| Na__Test__PublishedApi__.test.py | 0 | 54 | 0 | FAILURES: 0 | - |
| Na__Test__ScrapbookApi__.test.py | 0 | 26 | 0 | saves, lists, quarantines and refuses as it should | - |
| Na__Test__ScrapbookDrawingTitle__.test.mjs | 0 | 40 | 0 | PASS - every check passed. | - |
| Na__Test__ScrapbookScaleBar__.test.mjs | 0 | 36 | 0 | the scale bar draws the house bar and holds its rules | - |
| Na__Test__SheetImagesApi__.test.py | 0 | 42 | 0 | FAILURES: 0 | - |
| Na__Test__SheetPagingWalkExit__.test.mjs | 0 | 18 | 0 | Every check passed. ("Fly the same": PASS, OC-08) | **new** - W1-36 (TV 1.1.0) |
| Na__Test__SheetsNormaliseOnce__.test.mjs | 0 | 26 | 0 | Every check passed. | **new** - W1-21 (TV 1.0.1) |
| Na__Test__StatementServer__.py --check | 0 | 63 | 0 | FAILURES: 0 | - |
| Na__Test__TitleBlockCells__.test.mjs | 0 | 52 | 0 | ALL CHECKS PASSED (W1a: 37 checks) | changed: W1-22 (TV checks, Vale fixture), W1-26 (Open Sans numbers) |
| Na__Test__TransportFacade__.test.mjs | 0 | 176 | 0 | 175 passed, 0 failed; every check passed | - |
| Na__Test__UserSpellingsApi__.test.py | 0 | 62 | 0 | ALL PASSED | - |
| Na__Test__VectorQuality__.test.mjs | 0 | 33 | 0 | Every check passed. | **new** - W1-28 (TV 1.0.1) |
| Na__Test__ViewportRotation__.test.mjs | 0 | 16 | 0 | Every check passed. | - |
| Na__Test__ViewportTitleText__.test.mjs | 0 | 28 | 0 | PASS - every check passed. | - |

**No G5 failure exists, so none is attributed to this wave.** No package of the continuation reported a foreign
failure. The one TrueVision test the wave did not land (`Na__Test__DrawingTabKeys__`, W1-36) is held outside the tree
and is section 4.1.

#### 1.1 Extra checks run by the gate

| Check | Result |
|---|---|
| Verifier self-tests (`--self-test`): ParityNaming, PortNotes, UiParity (`--pin b2aa9151`), Exports | 19, 16, **19** and 4 cases, all PASS, exit 0 each. UiParity has one case more than in W1a: "[4] panels: this app's copy (equal to TrueVision's today) fails on every one of 1204 one-character mutations" - it runs now that the panels sheet is TrueVision's (W1-38), so check [4] still bites. |
| `Na__Test__AppConfigParity__.test.mjs --strict` | exit 1 before FIX-C1 ("8 allow-list entries no longer differ (STALE)", "1 FAILED"); exit 0 after ("PASS no stale allow-list entry"). |
| `git apply --check` of the three W0 prepared patches against today's live files (from `D:\10_CoreLib__ValeCodebase`) | W0-07.patch, W0-08.patch, W0-10.patch: exit 0 each - the continuation touched none of their targets. No continuation package wrote `execution/prepared/` (still W0-07, W0-08, W0-10 only, all 01-Oct). |
| Syntax sweep over the 75 continuation-touched files (`C2/extras_c2.py` A) | `node --check` 63 JS / MJS / CJS: 0 failures; 3 JSON parsed with a duplicate-key hook (the LE AppConfig, the Floor Areas config, the Colour Palette config): 0; 2 inline `<script>` blocks of the two changed / new HTML pages: 0; 7 other (CSS, README). Line endings: **65 LF, 10 CRLF, 0 mixed, 0 BOM** (each CRLF file kept its own endings: Loader, ModeController, the Fly controls, DrawingCode, SpecDocument, LinkNoodle, PdfExporter, Paper CSS, the CSS index, the TitleBlockCells page). |
| **Module link sweep in a real browser** (`C2/link_sweep_c2.mjs`, the W1a gate's method): Chromium headless, every request answered from disk under a virtual host (any other host and any non-GET aborted), a VIRTUAL page = this app's index.html with its PWA scripts and boot module taken out and a sweep module put in (never written to disk); the loader and the editor hubs imported first (the app's own entry order - W1-27 F6) | **224 of 224 modules linked and evaluated, 0 failed**: EVERY dirty `.js` under `02__Src__AppModules` - W0's, part 1's and the continuation's (52 of them touched in the continuation, the inert Floor Areas modules and the QR cell included, which G1 does not reach). 525 requests: 521 from disk, **0 404**, 3 aborted (the three AD04 Open Sans cuts on the off-machine font host, by design). The only console errors are those 3 aborted font loads. |
| **The three PDF harness pages, offline** (`C2/run_html_pages_c2.mjs`): served from the ValeCodebase root as their USAGE says; the configured font host answered in memory from the four AD04 cuts in the NaWeb repository at the pin (`git show b2aa9151:assets/AD04_-_LIBR_-_Common_-_Front-Files/...`, byte-identical to the host's, per W1-25 / W1-26); any other host aborted | `Na__Test__SpecificationPdf__.html` (W0's page, now driving W1-25's SpecPdf 1.0.0 and PdfFonts 1.0.0, and W1-26's chrome): **DONE** - `3047_SPEC__ProjectSpecification__A4__RevB__02-Oct-2026__.pdf`, 1 page, **31,668 bytes** (Open Sans embedded; W1a: 2,291 bytes Helvetica), `%PDF-1.3`, the three cuts fetched, 305 requests, 0 404, 0 aborted. `Na__Test__TitleBlockCells__.html` (W1-22): **DONE - 9 sheets built with no error**, DOCUMENT ID rows, the A2 strip a fifth wider (Client 43.2, SiteAddress 84.0, Title 223.6, DocumentId 28.8), 299 requests, 0 404. `Na__Test__TitleBlockScaleCell__.html` (W1-26, new): **DONE - 6 sheets built with no error**, console prefix `[ValeVision3D LayoutEditor]`; 1 404 = the Vale logo resolved relative to the test folder, which W1-26 declared (TrueVision's page has the same). |
| The two part-1 browser test pages, on Adam's Flask server, GET/HEAD only (`C2/run_w1_html_pages.mjs`) | `Na__Test__ProjectRecordAddress__.html` (W1-12): **ALL 15 CASES PASS** (15 / 0), 13 requests all 2xx, no console error. `Na__Test__ElevationGeometry__.html` (W1-10): **ALL CHECKS PASSED**, 20 requests all 2xx, no console error. No regression from the continuation. |
| **App boot with the drawing editor, read-only** (`C2/run_app_editor_c2.mjs`): `http://localhost:8000/ValeVision3D/index.html?project=2026/57994__Harris__Scheme-02` (Layout Mode on, two sheets) headless; GET/HEAD to localhost only, every other host and every non-GET aborted, service workers blocked, an ephemeral context; the script opens the Drawings menu, opens the first drawing, presses the stage, presses Page Down | `na-app-scene-ready` fired. Tab strip: 3D Model / Drawings / Specification. Drawings menu: **"D01 - Elevations"** (hover "D01"), **"D02 - Drawing 2"** (hover "D02"), "+ New sheet" (W1-21's tab code). D01 opened: "Layout Editor ready (editable)", loaded on first use in 2,443 ms; the paper carries one `na-le-paper__stack` and 2 frames (W1-28); the title block reads **DOCUMENT ID 57994_D01** (W1-22), **REV Revision A** (W1-26), SCALE 1:50 @ ISO A2, DRAWN BY Vale Garden Houses; `window.Na__Pwa__HasUnsavedWork` is a function (W1-07's seam); 11 colour inputs, and `[ValeVision3D ColourPalette] 13 colour(s) in 1 palette(s)` (W1-37 / W1-38). **Page Down turned D01 "Elevations" into D02 "Drawing 2"** (W1-36). 674 requests: 643 2xx/3xx from localhost, **0 4xx/5xx**, 31 aborted by design (21 project GLBs / assets on cdn.noble-architecture.com/VaApps, 7 font-host requests, 2 R2 worker, 1 GitHub Pages master index). **0 page errors (uncaught exceptions)**; all 37 console errors are those aborted fetches ("Failed to load resource", the GLB loader's "Failed to fetch"); the PdfFonts warning "PDF font unavailable" x3 is the designed fallback with the host aborted (Helvetica stays). The by-eye items stay with the orchestrator's online smoke test (section 6). |
| G6 transport rule (`C2/extras_c2.py` C) | **0 hits** of `na-truevision-api`, `NaProjectPortal/` or a `/r2/` route in 550 files of `02__Src__AppModules` (node_modules skipped) and `03__Style__AppStylesheets`, nor in `index.html`. (5 `TrueVision__` literals were also listed - all inside PORT NOTE / DEVELOPMENT LOG / comment blocks the naming lint exempts: AutoSave :81 (W1-07's seam description), ConfigState__SheetSetup__ :66 (TV's 1.9.0 log), and three from W0 / part 1; G4 naming passes 0 / 0.) |
| Release placeholders in every dirty file, VV and WCP alike, plus the WCP Flask files and `execution/prepared/` (`C2/extras_c2.py` B) | 82 tokens in 69 files: the 80 in the verifier's scope (G4 above), and the two rule quotations in `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:200, :216` (exempt). None in WCP files or `execution/prepared/`. The W0-16 leftover the W1a gate reported (VersionLock README :62) is resolved (v2.71.1, the orchestrator's `tools/fix_records_after_W1a.py`, 03:31:04). |
| Ignored by-products and project data (`C2/extras_c2.py` D) | `git status --ignored` over WebApps/ValeVision3D and WebApps/Whitecardopedia (node_modules, .claude, .wrangler skipped): 33 ignored entries, **0 ignored files modified after the W1a checkpoint**; **0 files under `WebApps/Whitecardopedia/Projects/` modified after it** - no package saved project data. |
| OS temp (outside the repository) | TrueVision's test design writes stub modules `Na__Test__<name>__*.mjs` into `%TEMP%` and leaves them (238 there now, from 22-Sep on - TrueVision's own runs included; the continuation's ported tests add DraftRestore, LayerStack, VectorQuality, SheetsNormaliseOnce, AuthoringZoomMax, SheetPagingWalkExit and the palette's stubs). Harmless; Adam may delete them. |

### 2. Cross-check against the Port Records

#### 2.1 Repository state

| Check | Command | Result |
|---|---|---|
| HEAD | `git -C D:/10_CoreLib__ValeCodebase rev-parse HEAD` | `7b4e593ad45f8287306270ff4c740fcb3c3ba95a` - unchanged (start 09:17 and end 09:41) |
| Index | `git diff --cached --name-status -M` | 81 entries, all `R100` - W0-02's `git mv` renames; nothing staged in the continuation |
| TrueVision unchanged | `git -C D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb status --short -- na-apps/30__TrueVision__CoreAppCode` | **0 lines** (start and end); NaWeb HEAD still `b2aa9151e86b...` |
| Shared infrastructure live files unchanged | `git status --porcelain=v1 --untracked-files=all` and `git diff HEAD --stat` on `WCP/Tools__DevUtils`, `WCP/02__Src__AppModules/62__Feature__AppInstallability`, `WCP/CloudflareWorker/src` | 0 lines and empty, for all three; newest files 04-Sep (DevUtils migration log), 18-Sep (SW logic), 15-Sep (worker index.js) |
| WCP Flask files | mtimes against the W1a checkpoint (03:31:37) | untouched in the continuation: server.py 01-Oct 20:21:20 (W0-19), the five W0 blueprints 01-Oct 22:24:23 (OC-05), the Scrapbook blueprint 22-Sep; no new `.pyc` |
| Records the scribe owns | mtimes | `ValeVision__DEVLOG__.md` and `ValeVision__PARITY__TrueVisionLedger__.md` last written 02-Oct 03:15:20 (W1-99 part 1); `ValeVision__NOTES__FolderNumberRegistry__.md` 03:31:04 (the orchestrator's W1a records fix) - none touched by a continuation package |
| Local server | `curl http://localhost:8000/api/check-localhost` | **200** `{"isLocalhost": true, "message": "Server running on localhost"}` (start and end of the gate) |

#### 2.2 Every changed file since the baseline belongs to a Port Record

`git -C D:/10_CoreLib__ValeCodebase status --porcelain=v1 --untracked-files=all`, minus the exact lines of
`execution/baseline_dirty__01-Oct-2026.txt` and the `ValeVision__AUDIT__TrueVisionParity__*` /
`ValeVision__WORKING_MEMORY__TrueVisionParity__*` records (`C2/crosscheck_c2.py`; full lists in `C2/crosscheck_c2.txt`,
`C2/crosscheck_c2.json`; the first run before FIX-C1 in `C2/RUN1__crosscheck_c2.*`):

- **356 paths** (131 ` M`, 2 ` D`, 59 `RM`, 22 `R `, 142 `??`), classified against the W1a checkpoint
  (`checkpoints/W1a__20261002-0331__files.txt`, 298 paths) and each file's time against it (03:31:37):
  - **281 untouched in the continuation**: **276 byte-identical to the W1a checkpoint** (tracked: today's `git diff HEAD
    --binary -M` section equals the checkpoint patch's; new: equal to the copy in the checkpoint zip), plus the 5 W0
    `.pyc` by-products in `WCP/__pycache__` (checkpoint.py leaves `.pyc` out; all dated before W1a). **0 changed since
    the checkpoint while their time says untouched.** All 298 checkpoint paths are still dirty.
  - **75 touched in the continuation** (48 ` M`, 1 `RM`, 26 `??`): 53 new since W1a, 22 W1a paths written again.
- **Ownership: 75 of 75 are named in the files part of a continuation Port Record**; none is unowned. Per record:
  W1-07 3, W1-19 2, W1-20 10, W1-21 5, W1-22 10, W1-25 6, W1-26 11, W1-27 7, W1-28 8, W1-36 7, W1-37 8, W1-38 3 (80
  writes; the LE AppConfig was written by W1-22, W1-25 and W1-26, ConfigState__SheetSetup__ and the TitleBlockCells
  test by W1-22 and W1-26, PdfExporter by W1-25 and W1-28).
- **Live bytes = the recorded bytes: 75 of 75 attested.** 74 live SHA-1 / SHA-256 prefixes are stated in a
  continuation Port Record (for every multi-writer file, by the LAST writer - section 2.3); the 75th,
  `Na__Test__AppConfigParity__.test.mjs`, is FIX-C1's (its hash in `C2/preimage/written.sha1`; its pre-image is
  W1-26's recorded c369fe72).
- **Edits scope** (wp_canonical.json): 69 of the 75 are in a continuation package's `edits` / `hot_files`; the other 6
  are each declared in their record: `10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js` (W1-36 by OC-08),
  `50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js` (W1-25 by OC-09),
  `57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js` (W1-28, a declared
  unavoidable importer update: TV fixed the same in LinkNoodle 1.2.1 with the layer stack), the two new TV test ports
  `Na__Test__DraftGuard__.test.cjs` / `Na__Test__DraftRestore__.test.mjs` (W1-07), and `Na__Test__AppConfigParity__.test.mjs`
  (W1-26, then FIX-C1). Per package, one more case: **W1-26 wrote three existing files outside its own edits list** -
  the LE AppConfig, `ConfigState__SheetSetup__.js` and the AppConfigParity test - declared and argued in its section
  1.1 (OC-01 moved W1-22's brand seam for Modern 1.5.0 to W1-26, and that seam is a config key, its reader and its
  allow-list row); it wrote after their last listed W1 editors had finished (AppConfig after W1-25, SheetSetup after
  W1-22) and before any later one. Open item 4.3. (Modern and QrCell are W1-22's listed edits moved to W1-26 by OC-01.)
- **Declared edits not written**: `80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs` (W1-36) - held,
  absent from the live tree (open item 4.1). Every other declared edit of the 12 packages is dirty.
- **Outside the VV app root**: nothing was written in the continuation (no WCP file, no `.gitignore` / `.gitattributes`,
  no other app).

#### 2.3 Hot-file chain integrity (live bytes = the last editor's recorded final state; `C2/hot_chain_c2.txt`)

| File | W1 serial order (part = W1a or continuation) | Live SHA-1 (SHA-256) | Live hash stated by |
|---|---|---|---|
| LE/01 `Na__LayoutEditor__Loader__.js` | W1-31 -> W1-33 -> W1-34 (W1a) -> W1-21 | 0a390e66 | W1-21 "14c6e3f7 -> 0a390e66" |
| LE/03 `Na__LayoutEditor__AppConfig__.json` | W1-32 -> W1-34 -> W1-35 (W1a) -> W1-22 -> W1-25; then W1-26 (outside its list) | 543b7919 | W1-26 "82efca9a -> 543b7919" |
| LE/03 `Na__LayoutEditor__ConfigState__SheetSetup__.js` | W1-22; then W1-26 (outside its list) | c6739f68 | W1-26 "293867e9 -> c6739f68" |
| LE/05 `Na__LayoutEditor__ModeController__.js` | W1-32 -> W1-33 -> W1-34 (W1a) -> W1-36 | 26a24216 (1f3a1fa8) | W1-36 "e621a645 -> 1f3a1fa8" |
| LE/07 `Na__LayoutEditor__AutoSave__.js` | W1-07 | 037e6cce | W1-07 |
| LE/07 `Na__LayoutEditor__History__.js` | W1-21 | b5786aa7 | W1-21 |
| LE/07 `Na__LayoutEditor__SheetModel__.js` | W1-21 | c795e861 | W1-21 |
| LE/07 `Na__LayoutEditor__SheetRecords__.js` | W1-19 | f98593fb (57922a03) | W1-19 |
| LE/10 `Na__LayoutEditor__Controls__Pc__.js` | W1-36 | 9e123697 (6eeda8a9) | W1-36 |
| LE/10 `Na__LayoutEditor__Controls__TouchScreen__.js` | W1-36 | 5ec2690c (22cf50c5) | W1-36 |
| LE/10 `Na__LayoutEditor__Styles__Main__Paper__.css` | W1-28 (next W2-20) | 6a923cd2 (a12bbdf6) | W1-28 |
| LE/15 `Na__LayoutEditor__MarkupBridge__.js` | W1-28 | e9a5992a (e78b1671) | W1-28 |
| LE/50 `Na__LayoutEditor__SpecPdf__.js` | W1-25 | b4cc24b3 | W1-25 |
| LE/60 `Na__LayoutEditor__PdfExporter__.js` | W1-23 -> W1-24 (W1a) -> W1-25 -> W1-28 (next W3-16) | 4d103048 (f35e86c7) | W1-28 "e3ef49ca -> f35e86c7" |
| VV/03 `Na__CoreUi__Styles__Index__.css` | W1-06 (W1a) -> W1-37 (next W2-01) | 74711196 | W1-37 "5d519dba -> 74711196" |
| VV/80 `Na__Test__TitleBlockCells__.html` | W1-22 | ba334f2f | W1-22 |
| VV/80 `Na__Test__TitleBlockCells__.test.mjs` | W1-22 -> W1-26 | 06883696 | W1-26 "96bb8209 -> 06883696" |
| VV/80 `Na__Test__AppConfigParity__.test.mjs` (not in hot_file_ownership) | W1-26 -> the gate (FIX-C1) | 11131bb5 | the gate, `C2/preimage/written.sha1` |

No hot file changed after its last continuation editor finished, and every continuation editor read its pre-image at
the bytes its predecessor recorded (each record names the lock holder before it; the W1a bytes are the checkpoint's).

#### 2.4 Cross-package hand-overs checked in the live tree

- **W1-19 F3 -> W1-21** (the loader's tab label follows the drawing number's default): the Drawings menu reads
  "D01 - Elevations" / "D02 - Drawing 2" in the real app (1.1). Closed. The `Na__LeRec__SheetShortCode` removal stays open
  (W1-21 F4 -> W6-01, section 4.4).
- **W1-19 F4 / W1-20 F4 -> W1-22** (1:200): `Scales AvailableScaleDenominators` is [20, 50, 100, 200] and equals TV's
  (stale-row evidence). Closed.
- **W1-20 F2 -> W1-21** (the facade re-exports the unit APIs): G2 PASS; AreaGroups reachable; FloorAreas links (sweep). Closed.
- **W1-21 F5 -> W1-07** (DraftRestore against the late start): 27 / 27. Closed.
- **W1-22 F2 -> W1-26** (Modern's Vale brand seam): `LayoutEditor__TitleBlock__LogoFallbackText` "VALE GARDEN HOUSES",
  its SheetSetup reader and its allow-list row (brand, permanent). Closed - with open item 4.3.
- **W1-22 F4 -> W1-26** (Open Sans re-measure): TitleBlockCells 52 / 52. Closed.
- **W1-22 F3, W1-25 F3, W1-26 F1 -> the integrator** (the 8 STALE rows, RowsNote's label): FIX-C1. Closed.
- **W1-25 F1 / F2 -> W1-26** (SheetChrome 1.14.0 embeds the cuts; SheetSetup's Style FontFamily fallback): the spec page
  PDF is 31,668 bytes with Open Sans (1.1); SheetSetup's fallback is TV's "'Open Sans', Helvetica, Arial, sans-serif".
  Closed.
- **W1-28 F4 -> W1-36** (NoteZoomGesture from the wheel and the pinch): landed in Navigation 1.3.0 / Controls 1.4.0 /
  TouchScreen 1.1.0 (W1-36 item 3). Closed; the wheel half of W1-28's acceptance 3a is for the smoke test.
- **W1-37 -> W1-38** (PanelHost's attach line): ColourPalette 55 / 55; 11 colour inputs in the real editor. Closed.
- **OC-01** (QrCell + Modern 1.5.0 after SheetChrome 1.14.0): landed by W1-26, QR switched off. Closed.
- **OC-08** (Fly controls 1.0.1, Navigation :30 comment): `Na__RenderLoop__StopActiveRender('fly-mode')` at FlyModeControls
  :198; Navigation's INTEGRATION is TV's; SheetPagingWalkExit "Fly the same" PASS. Closed.
- **OC-09** (document code in the specification): SpecPdf :157 and SpecDocument :177 read `Na__DrawData__GetDocumentCode`
  (the spec page names `3047_SPEC__...`). Closed for W1-25; the SpecEditor Bar stays with W2-31 as OC-09 says.
- Part 1's interim states, now closed: Save Sheets' success toast (W1-21), Page Up / Page Down on a drawing tab (W1-36 -
  seen working in the app, 1.1), the 1:200 description without the scale (W1-22), UI parity [4] (W1-38), the
  DRAWING_SITEPLAN CheckNames row (W1-21), the QR cell's stale TV path (W1-26), AutoSave 1.5.0 (W1-07).

### 3. Fix made by the gate (byte-preserving Python, `C2/apply_gate_fixes_c2.py`)

The script refuses to write unless the file is at its recorded SHA-1 (W1-26's landed c369fe72), LF and BOM-free, and
every anchor matches exactly once; it keeps LF, saves the pre-image to `C2/preimage/` and the written SHA-1 to
`C2/preimage/written.sha1`, and has `--dry-run`, `--candidate` and `--restore`.

**FIX-C1 - eight STALE rows off the AppConfigParity allow-list and RowsNote relabelled (W1-22 F3, W1-25 F3, W1-26 F1;
the W0 gate's FIX-2 and the W1a gate's FIX-1 precedents).** `VV/80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs`
(W0-15's VV-only test, last written by W1-26; no continuation package lists it for these rows, and each of the three
records hands them to the integrator). The values came level with TrueVision's in this continuation, so the test warned
"STALE: take them off the list" and failed with `--strict`. Evidence (`C2/stale_rows_evidence_c2.txt`: the live config
against TV's at the pin, read in memory): `Style/Description`, `Style/FontFamily`, `Style/TitleValueWeightNote`,
`Pdf/Description` (W1-25), `TitleBlock/Rows`, `Scales/Description`, `Scales/AvailableScaleDenominators` (W1-22) - EQUAL;
`TitleBlock/ClassicFieldAnchors/A3/DrawingNumber` (vv-only, W1-22) - in neither app; `TitleBlock/RowsNote` - DIFFERS by 4
word runs only: a client's name and a client's postal address (left out) and this app's A3 title width ("beside this app's
34 mm logo cell", 104 where TV says 98). Change:
- the STYLE group (its comment and its three rows) and the SCALES group (its comment and its two rows), each with the
  blank line after it - every row in them was stale;
- the rows `TitleBlock/Rows`, `TitleBlock/ClassicFieldAnchors/A3/DrawingNumber` and `Pdf/Description`;
- `TitleBlock/RowsNote` relabelled from `'withheld', 'W1-22'` to `'identity', 'permanent'`, why "a client's name and
  postal address left out; this app's 34 mm logo cell" (W1-22 F3's wording);
- DEVELOPMENT LOG `02-Oct-2026 - Version 1.0.4 ({{VVREL:W1-26}})`, newest first, naming the rows in words (as 1.0.2 did)
  and saying the gate made the change to complete W1-22's, W1-25's and W1-26's follow-ups. A W1-26 placeholder because
  W1-26 F1 names all eight rows and the file's newest entry (1.0.3) already carries W1-26's; every continuation
  placeholder resolves to the same release.
- not changed: every other row (`Panels/FocusNote` still differs and keeps its row; see 4.4).

SHA-1 c369fe72 -> 11131bb5, 28,334 -> 27,815 bytes, LF kept. Validated as a scratch candidate first (`--candidate`, run
with `--vv-file` on the real config and `--strict`: exit 0, "PASS no stale allow-list entry") and again live: "66
differences, every one a listed seam (brand 18, decision 12, identity 12, na-path 3, tv-defect 4, vv-only 6, withheld
11)" (before: identity 11, withheld 12), "PASS no stale allow-list entry", `--strict` exit 0; `node --check` OK; PortNotes
`--files` PASS (0 fail, 0 warn, 2 pending: W1-26 x2); ParityNaming `--files` PASS (0 / 0); the final whole-tree run in
section 1.

Restore: `python -B execution\scratch\W1-GATE\C2\apply_gate_fixes_c2.py --restore` (writes the pre-image back, only if
the live file is still at 11131bb5).

Not fixed by the gate (outside its remit, not caused by this wave, or not small): section 4.

### 4. Open items

1. **W1-36 PARTIAL - `Na__Test__DrawingTabKeys__` (TV 1.0.0, v2.115.0) is prepared and HELD; needs an orchestrator
   correction.** Everything W1-36 lists is landed and green (Navigation 1.3.0, Controls__Pc 1.4.0, TouchScreen 1.1.0,
   the ModeController keyboard hunks, OC-08's Fly controls; AuthoringZoomMax 12 / 12, SheetPagingWalkExit 18 / 18;
   Page Down seen working in the app). The held test scores 46 / 53 on this tree: its 7 sheet-keyboard checks need
   TrueVision's `SheetTools__Keyboard__` 1.10.0+ (TakeKeyFromControl, EnterLeavesField), which W3-03 lands (1.18.0);
   with TV's two keyboard units at the pin laid over the tree it scores 53 / 53 (W1-36 `scratch/W1-36/overlay_tv_keyboard.py`).
   The canonical plan gives the test to W1-36 and W3-03 does not list it, so it would either land red in every G5 run
   until W3-03 or never run against Keyboard 1.18.0. The file is at `execution/scratch/W1-36/out/80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs`
   (28,142 B, sha256 5333ac53). W1-36 proposes: **W3-03 lands it** (`python -B execution/scratch/W1-36/build_w1_36.py --land-held-test`)
   and runs it (53 / 53 expected), changing its `Ported on` placeholder id to its own; the alternative is landing it now
   with 7 known failures. The gate agrees with the proposal: G5 stays green and the test proves W3-03's keyboard.
2. **The sheet PDF's file name lost the project code (since W1-19) and no package owns the fix before W3-16; needs an
   orchestrator correction.** TrueVision's PdfExporter names a sheet PDF from `fields.DocumentId` (TV `:477`) - a change
   made in TrueVision's v2.75.0 batch commit 32767407 (19-Sep-2026) that its module DEVELOPMENT LOG never recorded
   (`git log -L` at the pin; W1-28's record calls it "1.5.0's file name", but TV's 1.5.0 entry is the naming scheme this app
   already has). This app's PdfExporter still passes `code : fields.DrawingNumber`
   (`60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js:342`, `projectCode : Na__DrawData__GetProjectCode()` at
   `:346`), and its PORT NOTE's "Not here yet" list (:51-53) does not name the change, because TV's log does not. Since
   W1-19 took TV's DrawingNumber default ("D01", DR-11), a never-numbered sheet downloads as
   `D01__<Name>__<Paper>__Rev<x>__<date>__.pdf` - no project code (before the wave: `2026_3047__Doous-01__...`, the
   `?project=` token form; TV: `<code>_<phase>_D01__...`; this app's intended form: `3047_D01__...`). Raised by W1-19 F2
   ("before the W1 release"), W1-22 F1 and W1-28 F3 (which proposes W3-16 or an OC). Not fixed by the gate: it is an
   unlogged TrueVision hunk into a hot file (serial order W1-23 -> W1-24 -> W1-25 -> W1-28, next W3-16) with a seam
   decision (W1-22 F1 proposes `projectCode : Na__DrawData__GetDocumentCode()`, a marked VV seam; TV's comment on the line
   quotes an NA example code), a PORT NOTE change and a log entry. Proposed OC: give the two lines (with the PORT NOTE
   naming 32767407 and a log entry) to one W2 package that edits nothing else in PdfExporter, or keep the interim name
   until W3-16 (adding the commit to W3-16's brief, since the PORT NOTE cannot remind it) and say so in the devlog.
   Nothing is deployed, so no Vale user sees it yet.
3. **W1-26 wrote three files outside its canonical edits list - ratify or revert.** The LE AppConfig (+
   `LayoutEditor__TitleBlock__LogoFallbackText`, the QrCellNote path fix W1-15 F5 asked for, the DocumentIdNote's
   Helvetica clause out), `ConfigState__SheetSetup__.js` (the `logoFallbackText` reader; the Style FontFamily fallback made
   TV's, W1-25 F2) and `Na__Test__AppConfigParity__.test.mjs` (two allow-list rows). Declared and argued in W1-26's
   section 1.1: OC-01 moved Modern 1.5.0 to W1-26 "with W1-22's seams for them (... Vale brand)", and that seam is DR-43's
   default "strings in config with Vale values" (K2 V1) - a config key, a reader and an allow-list row. No conflict
   resulted (2.3: each file was written after its last listed editor and its next editor is W2-14 / none / the gate), all
   gates are green, and the real editor prints Vale's title block. The gate recommends ratifying it as an OC (OC-01's
   brand seam lives in AppConfig + SheetSetup); the alternative, W1-26's own revert path (`scratch/W1-26/preimage/`) plus
   TV's constant set to Vale's text in Modern (W1-22 F2 (b)), would leave a brand string in code.
4. **Records hygiene for later owners** (comments and dead code only; nothing breaks):
   - `Na__LeRec__SheetShortCode` in `07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` has no importer since W1-21
     (function :1666-1675, export :1791, PORT NOTE bullet :50), and the DrawingCode leaf's StoredNumber note (:71-77) still
     says the loader reads the stored number (W1-19 F3, W1-21 F4) - for the W6-01 sweep, as both records propose.
   - `Na__Test__TitleBlockCells__.html` (and TV's ScaleCell page) should wait for `Na__LePdfFonts__EnsureLoaded()` before
     measuring, as the app does (W1-22 F6, W1-26 F8) - W6-01.
   - W1-27 F4: W1-27's `depends_on` omits W1-21 (FloorAreas imports the facade 1.35.1's AnnounceAreas, GetAreaGroups,
     AddAreaGroup, AreaGroupKey, LayerIndexAboveDrawings); it held only because W1-21 ran first - a catalogue note.
   - Carried from part 1 and unchanged: the North ConfigState PORT NOTE Parity line (W1-11 F5); the `Panels/FocusNote`
     allow-list owner still reads W1-32 (W1-32 F6); the Eyedropper :695 comment (W2-21, OC-11).
   - Config notes still quote TrueVision's illustrative codes with an NA job stage (`WW88_T04_D100` in
     `TitleBlock/DocumentIdNote`, `PS01_T02_D01` in `Pdf/FilenamePatternNote`); the second was already in this app's config
     at HEAD 7b4e593a and neither is ever rendered - noted for DR-43 hygiene (W6-01), not caused by this wave.
5. **Decisions for Adam recorded by the packages** (no action by the gate): W1-28 F2 (3047__Doous D01's PDF now covers the
   2D viewport's caption with a white vector, as the screen always did); W1-21 F2 (RenumberSheets writes no number
   without a register block - one line to delete once R2 is checked and W4-10 lands); W1-26 1.3 (SheetSetup's
   `qrCellEnabled` fallback stays TV's `true`; the config ships `false`); W1-07 5.2 (every pre-upgrade browser draft is
   asked about once, TV's wording); W1-38 5 (a TV quirk: the slider's suffix shows the whole reading while typing); W1-25
   F5 (move the four font sources together when a Vale-owned copy is named, DR-21); DR-01 (c) - every TV release each
   record names as unconfirmed.
6. **Carried from part 1, still open:** the live-site viewer gap before any deploy of v2.71.2+ (W1-33; working memory
   issue 02-Oct 03:31); the elevation exclusion-token trim (W2-05, OC-11); the SpecEditor Bar's document code (W2-31,
   OC-09).
7. **Notes for dispatching Wave 3** (from the records): W1-27 F2 - from W3-03 (Keyboard 1.18.0 dispatches
   `Tool__FloorArea`) until W3-10 lands the panel, A would arm the Area tool with no panel: keep the binding off in between
   or land W3-10 with W3-03; W1-27 F3 - the Area tool needs RectangleTool >= 1.3.0 and ShapeTool >= 1.7.0 (W2-26, W3-07);
   W1-28 F5 - until W3-03 / W2-21 / W3-06 a press on a grouped viewport's frame selects the viewport alone, and copying a
   group holding a dimension or a viewport pastes it without them; 4.1 above for W3-03.

### 5. For the W1-99 Parity Scribe (continuation release)

1. **Placeholders to resolve: 80 in 68 files**, all inside the PortNotes verifier's scope - W1-07 x3, W1-19 x3, W1-20 x10,
   W1-21 x6, W1-22 x8, W1-25 x6, W1-26 x11, W1-27 x6, W1-28 x10, W1-36 x9, W1-37 x5, W1-38 x3 - including the gate's own
   `{{VVREL:W1-26}}` at `80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs:56` (FIX-C1, log 1.0.4)
   beside W1-26's at `:69` (1.0.3). None in WCP Flask files or `execution/prepared/`. JSON files carry none (W1-37's
   palette config and W1-27's Floor Areas config record their port in `Meta__PortedFrom` / verbatim). The PLAN's two rule
   quotations stay. W1-36's held test (`execution/scratch/W1-36/out/...DrawingTabKeys...`) carries one W1-36 placeholder
   and is not in the tree - leave it to the package that lands it.
2. **Devlog top** (`ValeVision__DEVLOG__.md`, last written 02-Oct 03:15:20): line 4 is `## ValeVision3D v2.71.2 - 02-Oct-2026 -
   The Tab Strip Becomes TrueVision's, ...` (W1 part 1), then v2.71.1 (:267). Re-read it before allocating (Q-VER patch
   step: the next is **v2.71.3** if nothing else lands first).
3. **Package states to carry**: 11 DONE; W1-36 PARTIAL (4.1: one TV test held, everything else landed). Prepared-only:
   none in the continuation. Held: none (no DR-40 gesture was touched).
4. **Gate results to carry**: G1 554 / 0; G2 470 PASS (facade 38); G3 PASS through the records-exempt wrapper (raw: the
   55 audit-report hits, OC-04); G4 ParityNaming 0 / 0, PortNotes 0 fail / 112 baseline + 11 declared Legacy WARNs, UI parity
   **0 of 7 failing** with `--block all` passing (only [7] token WARN, Adam's at deploy); G5 **33 / 33** (9 new TV tests);
   224 / 224 modules link in a browser; the three PDF harness pages DONE (the spec PDF embeds Open Sans); the real editor
   opens a drawing with no uncaught error; FIX-C1.
5. **Folder registry** (`ValeVision__NOTES__FolderNumberRegistry__.md`, which the scribe keeps): the continuation created
   two folders whose ValeVision column still reads "-": `54__Feature__ColourPalette` (row :116, W1-37) and LE/
   `59__Feature__FloorAreas` (row :233, W1-27) - fill them as `tools/fix_records_after_W1a.py` did for part 1's ten (the
   lint passes either way; it reads the class column).
6. Records the gate wrote: this report, `Na__Test__AppConfigParity__.test.mjs` (FIX-C1) and `execution/scratch/W1-GATE/C2/`
   only (no devlog, ledger, registry, AUDIT or WORKING_MEMORY edit).

### 6. Notes for the orchestrator and Adam (not failures)

- **Smoke test (online, by eye) still needed** - the packages deferred these to it (a project with Layout Mode on and
  sheets, e.g. 2026/57994__Harris__Scheme-02; never Save Sheets on a live project for a check): the title block's
  DOCUMENT ID and "Revision A", the A2 cells a fifth wider (W1-22, W1-26); Download PDF in Open Sans and the PDF's name
  (4.2) (W1-25, W1-26, W1-28); the Layers list is the paint order - drag Text under Viewports and back (W1-28); a wheel /
  touchpad zoom holds and settles, 6400% on localhost and 800% with `?authoring=off`, Page Down / Page Up between drawings
  (W1-36); a panel colour field and the 3D tab's dimension colour open the palette with Chrome's mixer stacked on it - the
  stacking is the thing to look at (W1-37, W1-38); the opacity number boxes and the wrapping Scale buttons (W1-38); the
  draft question for an old browser draft and the two-window save guard (W1-07, Adam only - it writes R2); Ctrl+G with a
  viewport, the Margin Notes undo step, Save Sheets' toast (W1-21, W1-28); pressing A does nothing (W1-27); fly, leave Fly,
  the render loop goes idle (W1-36). The gate's read-only headless run (1.1) already saw the editor open, the
  DOCUMENT ID / Revision A strip, the palette config load and Page Down work, with no uncaught error.
- **Visible changes for Vale users to name in the devlog** (from the records): tabs and menus read "D01 - <name>"
  (W1-21); the title block's number cell is DOCUMENT ID `<code>_D01` and the Rev cell "Revision A" (W1-22, W1-26); 1:200
  joins the scales (W1-22); sheet text is measured and printed in the embedded Open Sans, PDFs grow 16-30 KB (W1-25,
  W1-26); a layer dragged under the Viewports layer draws under the drawing, and a PDF prints a caption under markup laid
  over it (W1-28); vector quality Medium (W1-28, DR-40 item 6); Page Up / Page Down turn the drawings (W1-36); the palette
  on every colour field (W1-37, W1-38); deleting a layer re-homes its vectors and hiding a layer deselects its items
  (W1-20); a margin change is its own undo step (W1-21, DR-40 item 4); a stale browser draft is asked about (W1-07);
  Save Sheets says where the sheets went again (W1-21); the PDF file name (4.2).
- **Shared service worker**: no package edited or bumped it; every record asks for the one consolidated W0/W1 bump at
  deploy (DR-07) - several call a mixed cache unsafe (W1-21, W1-26, W1-28: an old SheetSurface with the new Paper sheet
  buries every note under the drawings) - and for W6-02 to precache the new modules (PdfFonts, TitleBlock__QrCell__, the
  53 and 54 SheetImages modules now linked, AreaGroups, the Floor Areas folder, the Colour Palette folder). UI parity [7]
  warns the token predates 17 VV releases.
- **Deploy order** is unchanged from W0 / W1a (working memory section 6): W0-07's sync fix before any sync of projects
  with editor content; W0-08's service-worker package and one token bump with the renumber; worker 1.6.0 needs Adam's
  `wrangler dev` proof. All three prepared patches still apply cleanly to today's live files.

### 7. Evidence (execution/scratch/W1-GATE/C2/)

`RUN1__*.txt` (first run of G1-G5, 09:17) and `FINAL__*.txt` (final run, 09:31, after FIX-C1), each with `__summary.txt`
and `__console.txt`; `G5__RUN1__*.txt` / `G5__FINAL__*.txt` (each test's full output) and `G5__FINAL__table.txt`;
`RUN1__EXTRA__*.txt` / `FINAL__EXTRA__*.txt` (self-tests, UI parity blocking runs `--block 1,2,3` and `--block all`,
AppConfigParity `--strict`, `git apply --check`); `crosscheck_c2.py` -> `crosscheck_c2.json` / `crosscheck_c2.txt`
(`RUN1__crosscheck_c2.*` before the fix); `hot_chain_c2.py` -> `hot_chain_c2.txt`; `extras_c2.py` -> `extras_c2.txt`
(`RUN1__extras_c2.txt`; syntax sweep, placeholders, G6, by-products, shared infrastructure; `syntax_tmp/`);
`link_sweep_c2.mjs` (+ `adapt_link_sweep_c2.py`) -> `link_sweep_c2.txt` / `link_sweep_c2_results.json`;
`run_html_pages_c2.mjs` -> `html_pages_c2.txt` / `html_pages_c2_results.json`; `run_w1_html_pages.mjs` ->
`w1_html_pages.txt` / `w1_html_pages_results.json`; `run_app_editor_c2.mjs` (+ `adapt_app_editor_c2.py`) ->
`app_editor_c2.txt` / `app_editor_c2_results.json`; `stale_rows_evidence_c2.py` -> `stale_rows_evidence_c2.txt` (TV's
side as word counts only); `apply_gate_fixes_c2.py` + `preimage/` + `candidate/` (FIX-C1); `status_before_gates.txt` /
`status_final.txt` (retaken at 09:44: it differs from the first only by 153 new paths, every one inside this folder;
0 lines outside it changed, 0 gone); `W1__part2.md` + `compose_report_c2.py` (+ `retime_report_c2.py`) build this
report from this part and the untouched part-1 text; the runners `run_gates.py`,
`run_g5.py`, `run_extras.py`, `g5_table.py` (copied from the W1a gate, `run_extras.py` with the `--block all` run added);
`W1__part1__as_written_0235.md` (the part-1 report as it stood, sha1 fd31b67b, kept beside the evidence). No TrueVision
file was copied into the scratch: TV text was read with `git show` at the pin, in memory.

---

## PART 1 - the gate of 02-Oct-2026 02:13-02:45 (W1 part 1, released as v2.71.2), preserved as written

