# Wave W1 - Integrator Gate Report

```
Wave            : W1 (38 packages + W1-99). Ran: 24 DONE, 2 PARTIAL (W1-06, W1-17), 12 skipped by the workflow because a
                  dependency was not DONE (W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-36, W1-37,
                  W1-38). W1-99 (Parity Scribe) runs after this gate.
Gate run        : 02-Oct-2026, 02:13 - 02:45, on the quiescent tree (no package agent running)
VV repo HEAD    : 7b4e593a (unchanged; nothing committed, staged, stashed or reset - the index still holds exactly W0-02's 81
                  git mv renames)
TV pin          : b2aa9151 (NaWeb HEAD is still b2aa9151; TV working tree clean for na-apps/30__TrueVision__CoreAppCode)
Status          : PASS_WITH_NOTES - every gate green on the final run; the wave itself is incomplete (sections 4.1-4.3)
Fixes by gate   : 1 (seven STALE rows off the AppConfigParity allow-list, asked for by W1-34 and W1-35) - section 3
Open items      : 9 (section 4); the first three decide how the wave is finished
Evidence        : execution/scratch/W1-GATE/ (every command's full output; FINAL__*.txt is the final run)
```

Every command below ran from the VV app root `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` unless it says
otherwise. Nothing was started, stopped or restarted; nothing was deployed; no token was bumped; only read-only git
commands were run (status, diff, diff --cached, rev-parse, show, apply --check). Browser checks ran headless in my own
Chromium (Playwright from the npx cache): offline sandboxes answered from disk, or GET/HEAD-only on Adam's Flask server
with every other request aborted (section 1.1). Nothing was written to the server, R2 or any project.

---

## 1. Gates (final run, after the gate's one fix)

| Gate | Command | Exit | Result (exact counts) |
|---|---|---|---|
| G1 | `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` | 0 | PASS. App graph **527 modules** from 1 entry point, **0 failures** (W0: 518). Import-map targets 110 modules from 10 targets, 1 failure = the documented vendor known issue (three-edge-projection 0.0.10 `SilhouetteGeneratorWorker.js` extensionless specifier, unreachable), unchanged. |
| G2 | `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` | 0 | PASS. **459 files** checked (W0: 417); loader facade **37** editor names through mode, model, spec, config, viewport3d, pdf in 4 files (W0: 34); every named import resolves, every `Na__` identifier is imported or declared, every facade name is exported. |
| G3 | `python "...\execution\tools\path_gate_records_exempt.py" --root "...\ValeVision3D"` (OC-04) | 0 | **PASS (0 fail, 1 warn)**. Checked: css @import 28, new URL 41, path strings 177, folder tokens 33. The warn is the pre-existing `TestEnv__PrototypeTestingSandbox__DomAndLayout.html:46` sandbox path. (Raw `k2_path_gate.py` for reference: exit 1, 55 fail - all 55 G1 retired-name hits inside `ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md`, the plan itself; 0 in code; same as W0, OC-04.) |
| G4 naming | `node 80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs` | 0 | **PASS (0 fail, 0 warn)**: 537 shipped files + 40 test-folder files (banner only), 66 folders against the registry (W0: 56), 11 Layout Editor stylesheets. Baseline: 1 file recorded, 1 since rewritten. |
| G4 port notes | `node 80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs` | 0 | **PASS (0 fail, 128 warn, 136 pending)**: 573 files, 348 PORT NOTEs, 448 DEVELOPMENT LOGs. Baseline 139 files: 114 still as recorded, 25 since rewritten (full checks apply and pass). WARNs: 123 carry `[baseline 01-Oct-2026]`; the other 5 carry the verifier's `[legacy: ...]` marker (TV files with no module version: Invalidation and ModelToggle (W1-01), the floor-plan and elevation Dev-menu sheets (W1-08, W1-10), the ElevationGeometry page (W1-10)) - WARN by design. Pending placeholders: **136 in 101 files** - W1-01 x8, W1-02 x2, W1-03 x4, W1-04 x3, W1-05 x3, W1-06 x9, W1-08 x6, W1-09 x6, W1-10 x5, W1-11 x2, W1-12 x5, W1-13 x10, W1-14 x7, W1-15 x6, W1-16 x7, W1-17 x1, W1-18 x2, W1-23 x14, W1-24 x2, W1-29 x3, W1-30 x1, W1-31 x5, W1-32 x4, W1-33 x10, W1-34 x8, W1-35 x3 (x2 before FIX-1). |
| G4 UI parity | `node 80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs "D:\11_RefLib__...\30__TrueVision__CoreAppCode"`, and again with `--pin b2aa9151` | 0 / 0 | Report mode; identical at the working tree and at the pin: [1] fold PASS, [2] strip PASS (W1-34), [3] veil PASS (W1-33), [4] panels FAIL (TV 678 entries, VV 584; 100 only in TV, 6 only here; owner **W1-38 - skipped**), [5] order PASS, [6] motion PASS, [7] token WARN (shared SW token `2026-09-18-1` predates 16 VV releases; Adam's at deploy, DR-07). "1 of 7 checks fail (none blocking)" (W0: 3 of 7). Blocking run for the owners that landed: `--pin b2aa9151 --block 1,2,3` exit 0, "RESULT: PASS (1 non-blocking check(s) fail)". |
| G5 | every `*.test.mjs` / `*.test.cjs` / `*.test.py` in `80__Testing__PrototypeEnvironment` plus `Na__Test__StatementServer__.py --check` (test client only, no port), via `scratch/W1-GATE/run_g5.py` (PYTHONDONTWRITEBYTECODE=1) | 0 | **24 of 24 PASS** (W0: 16) - table below. No `*.test.cjs` exists. Every python test drives Flask test clients over temp folders; none needs the network. |

The first run (RUN1, before the fix) gave the same counts except: G4 port notes 135 pending (W1-35 x2), and
AppConfigParity exit 0 with "Every check passed (1 warning)" - the 7 STALE allow-list rows (exit 1 with `--strict`).

G5 per test (final run; exit code, PASS lines counted, FAIL lines counted, summary line):

| Test | Exit | PASS | FAIL | Summary | New in W1 (package) |
|---|---|---|---|---|---|
| Na__Test__AppConfigParity__.test.mjs | 0 | 8 | 0 | Every check passed. (RUN1: "(1 warning)") | - (W0-15; FIX-1) |
| Na__Test__DimensionRoundUp__.test.mjs | 0 | 21 | 0 | Every check passed. | W1-13 |
| Na__Test__DocumentKeys__.test.mjs | 0 | 75 | 0 | Every check passed. | W1-32 |
| Na__Test__DrawingDrafts__.test.mjs | 0 | 50 | 0 | ALL CHECKS PASSED (Doous on disk) | W1-06 |
| Na__Test__DrawingNotesRoute__.test.py | 0 | 43 | 0 | the drawing notes route reads, writes, keeps and refuses as it should | - |
| Na__Test__ElevationDepthFog__.test.mjs | 0 | 68 | 0 | All checks passed. | W1-09 |
| Na__Test__FloorPlanStoreyLevel__.test.mjs | 0 | 37 | 0 | every check passed | W1-08 |
| Na__Test__LoaderFacade__.test.mjs | 0 | 118 | 0 | every check passed (117) | W1-31 (W1-33 importer update) |
| Na__Test__LoaderStylesheets__.test.mjs | 0 | 7 | 0 | Every check passed. | - |
| Na__Test__NorthCompass__.test.mjs | 0 | 24 | 0 | every check passed | - |
| Na__Test__PerSceneLighting__.test.mjs | 0 | 40 | 0 | All checks passed. | - |
| Na__Test__ProjectDataSaveGuard__.test.py | 0 | 60 | 0 | FAILURES: 0 | - |
| Na__Test__ProjectQr__.test.mjs | 0 | 62 | 0 | 62 passed, 0 failed | W1-15 |
| Na__Test__PublishedApi__.test.py | 0 | 54 | 0 | FAILURES: 0 | - |
| Na__Test__ScrapbookApi__.test.py | 0 | 26 | 0 | saves, lists, quarantines and refuses as it should | - |
| Na__Test__ScrapbookDrawingTitle__.test.mjs | 0 | 40 | 0 | every check passed | - |
| Na__Test__ScrapbookScaleBar__.test.mjs | 0 | 36 | 0 | the scale bar draws the house bar and holds its rules | - |
| Na__Test__SheetImagesApi__.test.py | 0 | 42 | 0 | FAILURES: 0 | - |
| Na__Test__StatementServer__.py --check | 0 | 63 | 0 | FAILURES: 0 | - |
| Na__Test__TitleBlockCells__.test.mjs | 0 | 37 | 0 | ALL CHECKS PASSED | - |
| Na__Test__TransportFacade__.test.mjs | 0 | 176 | 0 | 175 passed, 0 failed; every check passed | - |
| Na__Test__UserSpellingsApi__.test.py | 0 | 62 | 0 | ALL PASSED | - |
| Na__Test__ViewportRotation__.test.mjs | 0 | 16 | 0 | Every check passed. | W1-14 |
| Na__Test__ViewportTitleText__.test.mjs | 0 | 28 | 0 | every check passed | - |

No G5 failure exists, so none is attributed to this wave. The two red tests the packages reported as FOREIGN during
the wave are green on the quiescent tree: `Na__Test__DrawingDrafts__` (W1-06's port, red until W1-10 landed
`Na__Elevation__AutoNameText__.js`; reported by W1-08, W1-11, W1-12, W1-18, W1-29, W1-30) and `Na__Test__LoaderFacade__`
(two CheckNames rows W1-31 F1 left for W1-33, added by W1-33; reported by W1-23, W1-24, W1-30). `git status` before and
after the gate differs only by the gate's own scratch files (115 lines, all under `execution/scratch/W1-GATE/`).

### 1.1 Extra checks run by the gate

| Check | Result |
|---|---|
| Verifier self-tests (`--self-test`): ParityNaming, PortNotes, UiParity (`--pin b2aa9151`), Exports | 19, 16, 18 and 4 cases, all PASS, exit 0 each - the gates still bite. |
| `Na__Test__AppConfigParity__.test.mjs --strict` | exit 1 before FIX-1 ("7 allow-list entries no longer differ (STALE)"); exit 0 after ("PASS no stale allow-list entry"). |
| Syntax sweep over every file the wave touched (`syntax_sweep.py`, 137 files) | `node --check` 91 JS/MJS: 0 failures; `py_compile` 1 .py (bytecode to scratch): 0; 32 JSON parsed with a duplicate-key hook (configs and the 22 hatch-library files): 0; 2 inline `<script>` blocks of the two new HTML pages: 0. Line endings: 115 LF, 22 CRLF, **0 mixed, 0 BOM**. |
| **Module link sweep in a real browser** (`link_sweep.mjs`): Chromium headless, every request answered from disk under a virtual host (any other host and any non-GET aborted), a VIRTUAL page = this app's index.html with its PWA scripts and boot module taken out and a sweep module put in (never written to disk) | **86 of 86 modules linked and evaluated, 0 failed**: all 83 W1-touched `.js` modules under `02__Src__AppModules` (inert ones included, which G1 does not reach) plus the Layout Editor hubs the loader imports that W1 did not touch (SheetModel, SpecData, ConfigState; ModeController, Viewport3d, PdfExporter, TabStrip and DevMenu Controls are among the 83) - pulling the whole editor graph. 477 requests: 473 from disk, **0 404**, 3 aborted (the three AD04 Open Sans TTFs on www.noble-architecture.com/assets, this app's own font host). The only console errors are those 3 aborted font loads. |
| The two browser test pages this wave added, on Adam's Flask server, GET/HEAD only (`run_w1_html_pages.mjs`) | `Na__Test__ProjectRecordAddress__.html` (W1-12): **ALL 15 CASES PASS** (`__TEST_RESULT` 15 / 0), 13 requests all 2xx, no console error. `Na__Test__ElevationGeometry__.html` (W1-10): **ALL CHECKS PASSED**, 20 requests all 2xx, no console error. |
| W0's two harness pages, offline from disk (W0 gate's runner, copied as `run_w0_html_harnesses.mjs`) | `Na__Test__SpecificationPdf__.html`: **DONE** - 1 page, 2,291 bytes, `%PDF-1.3`, 273 requests, 0 404, 0 off-machine. `Na__Test__TitleBlockCells__.html`: **DONE - 8 sheets built with no error**, 270 requests, 0 404, 0 off-machine. jsPDF 4.1.0 from vendor 05 in both. No regression from W1-24's PdfExporter changes. |
| **App boot, read-only** (`run_app_boot.mjs`): `http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous` headless, GET/HEAD to localhost only, every other host and every non-GET aborted, service workers blocked, nothing clicked, watched 78 s | `na-app-scene-ready` fired; 1 canvas; no loading overlay left up. 499 requests: 446 2xx/3xx from localhost, **0 4xx/5xx**, 53 aborted by design (44 project GLBs and the master index on cdn.noble-architecture.com/VaApps, 3 fonts, 4 DataLib files on raw.githubusercontent.com, the GitHub Pages master index, the R2 worker /health). **0 page errors (uncaught exceptions)**; all 68 console errors are those aborted fetches ("Failed to load resource", the GLB loader's "Failed to fetch", DataLib "Network error"); the warnings follow from them too (CfApi: worker /health unanswered, no master-index entry so writes refused - correct fail-closed behaviour offline). The Layout Editor stays unloaded (Doous has no sheets; Layout Mode off). The orchestrator's online smoke test is still needed for the by-eye items. |
| G6 transport rule | 0 hits of `na-truevision-api`, `NaProjectPortal/` or a `/r2/` route in `02__Src__AppModules` (node_modules excluded), `03__Style__AppStylesheets` or `index.html`. (The only hits anywhere are in `62__Feature__EmailWorkers/CloudflareWorker/node_modules/miniflare` - a vendor dev dependency, pre-existing, never shipped.) |
| Hatch library identity (outside G4's default scope) | `52__LayoutEditor__HatchPatternLibrary/` (22 JSON): only `Meta__Author "Adam Noble - Noble Architecture"` (the house author line every VV module carries) and the index's `Meta__PortedFrom` provenance line (names TrueVision as the source, as a PORT NOTE does); no NA URL, portal key, NA project code or `/na-apps/` path. W1-17 also ran ParityNaming on the 22 files by name: 0 / 0. |
| Release placeholders in every changed file, VV and WCP alike, plus the WCP Flask files and `execution/prepared/` (`vvrel_scan.py`) | 138 tokens in 102 files: the 136 in the verifier's scope (above), the two rule quotations in `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:200, :216` (exempt), and **one W0 leftover**: `04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md:62` `{{VVREL:W0-16}}` (open item 4.5). None in WCP files or `execution/prepared/`. |
| `git apply --check` of the three W0 prepared patches against today's live files (from `D:\10_CoreLib__ValeCodebase`) | W0-07.patch OK, W0-08.patch OK, W0-10.patch OK (exit 0 each) - W1 touched none of their targets. |
| Ignored by-products | `git status --ignored` over WebApps/ValeVision3D and WebApps/Whitecardopedia (node_modules, .claude, .wrangler skipped): 33 ignored entries, **0 ignored files modified after the W0 checkpoint** (22:25:19). |
| Reference project untouched | 0 files under `WebApps/Whitecardopedia/Projects/2026/3047__Doous` modified after the W0 checkpoint - no package saved project data. |
| OS temp | 19 `na-drafts-*` folders in `%TEMP%` (01-Oct 23:27 - 02-Oct 00:10), left by DrawingDrafts runs while AutoNameText was missing (TV's test makes the folder before loading; W1-06/W1-09/W1-10/W1-18 noted it). The passing runs leave none. Outside the repo; Adam may delete them. |

---

## 2. Cross-check against the Port Records

### 2.1 Repository state

| Check | Command | Result |
|---|---|---|
| HEAD | `git -C D:/10_CoreLib__ValeCodebase rev-parse HEAD` | `7b4e593ad45f8287306270ff4c740fcb3c3ba95a` - unchanged (start and end of the gate) |
| Index | `git diff --cached --name-status -M` | 81 entries, all `R` - exactly the set of W0-02's `git mv` renames in the W0 checkpoint list; nothing staged in W1 |
| TrueVision unchanged | `git -C D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb status --short -- na-apps/30__TrueVision__CoreAppCode` | 0 lines (start and end); NaWeb HEAD still `b2aa9151e86b...` |
| Shared infrastructure live files unchanged | `git status --porcelain=v1 --untracked-files=all` and `git diff HEAD --stat` on `WCP/Tools__DevUtils`, `WCP/02__Src__AppModules/62__Feature__AppInstallability`, `WCP/CloudflareWorker` | 0 lines and 0 lines; newest file times 18-Sep (SW logic), 15-Sep (worker index.js), 04-Sep (DevUtils). No W1 package wrote `execution/prepared/` (still W0-07, W0-08, W0-10 only). |
| WCP Flask files | crosscheck | untouched in W1: server.py last written 20:21:20 (W0-19), the five blueprints 22:24:23 (OC-05's placeholder fix), their .pyc 22:24:24 (the server's reload) - all before the W0 checkpoint |
| Local server | `curl http://localhost:8000/api/check-localhost` | **200** `{"isLocalhost": true, "message": "Server running on localhost"}` (start and end of the gate) |

### 2.2 Every changed file since the baseline belongs to a Port Record

`git -C D:/10_CoreLib__ValeCodebase status --porcelain=v1 --untracked-files=all`, minus the exact lines of
`execution/baseline_dirty__01-Oct-2026.txt` and the `ValeVision__AUDIT__TrueVisionParity__*` /
`ValeVision__WORKING_MEMORY__TrueVisionParity__*` records (`crosscheck.py`, `w0_unchanged.py`, `hash_attest.py`,
`edits_scope.py`, `hot_chain.py`; full lists in `crosscheck.txt`, `crosscheck.json`, `edits_scope.txt`, `hot_chain.txt`):

- **303 paths** (103 ` M`, 2 ` D`, 59 `RM`, 22 `R `, 117 `??`), classified against the W0 checkpoint
  (`checkpoints/W0__20261001-2225__files.txt`, 189 paths) and each file's time against the checkpoint (22:25:19):
  - **166 untouched in W1**: 161 W0 paths **byte-identical to the W0 checkpoint** (tracked: today's `git diff HEAD`
    section equals the checkpoint patch's; new: equal to the copy in the checkpoint zip), plus the 5 W0 `.pyc`
    by-products in `WCP/__pycache__` (checkpoint.py leaves .pyc out).
  - **137 touched in W1** (38 ` M`, 18 `RM`, 81 `??`): 109 new since W0 (81 new files, 28 tracked files first
    modified in W1) and 28 W0 paths written again. Cross-check of the classification: 0 paths changed since the W0
    checkpoint while their time says untouched, 0 rewritten with identical bytes; 3 W0 renames are not comparable
    section-for-section because git now pairs them differently after whole-file rewrites (ProjectData, the DrawView
    Dev sheet, the Elevation Dev sheet) - all three are W1-touched and hash-attested below.
- **Ownership of the 137**: 116 are named in the files part of a W1 Port Record; the other 21 are the hatch-library
  JSON files W1-17's record names by folder ("02__ConstructionMaterialHatches/ (15 files ...)", "05__SitePlanHatches/
  (6 files ...)"). **No W1-touched path is unowned.** Several owners occur only on hot files in their serial order or
  where a later record merely mentions a file (section 2.3).
- **Live bytes = the recorded bytes**: for 99 of the 137 the live SHA-1 / SHA-256 prefix is stated in a W1 Port Record;
  32 more are in a W1 package's scratch hash list (W1-04, W1-13 and W1-17's `sha256__written.txt` / `written*.json`);
  the last 6 (W1-10's) are byte-identical to `scratch/W1-10/candidates/`. **137 of 137 attested.**
- **Edits scope** (wp_canonical.json): 115 of the 137 are in a W1 package's `edits` / `hot_files`; the other 22 are all
  NEW files a package created (policy 6): the 21 hatch-library pack files (W1-17; its `edits` names the module, the
  stylesheet and the library index, and its `vv_targets` the two pack folders "(verbatim) (new)") and
  `80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs` (W1-32, "ported by this package (K3 section
  8)"). No existing file outside an edits list was written, except the one declared importer update: W1-33 rewrote four
  checks of W1-31's `Na__Test__LoaderFacade__.test.mjs` (its record 1.4) - a file W1-31 lists.
- **Declared edits not written**: `LE/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css` (W1-17,
  held back - open item 4.1). Every other declared edit of the 26 packages that ran is dirty.
- **Outside the VV app root**: nothing was written in W1 (no WCP file, no `.gitignore` / `.gitattributes`, no other app).

### 2.3 Hot-file chain integrity (live bytes = the last W1 editor's recorded final state)

| File | W1 serial order (state) | Live SHA-1 | Stated by the last editor |
|---|---|---|---|
| LE/01 `Na__LayoutEditor__Loader__.js` | W1-31 -> W1-33 -> W1-34 -> W1-21 (skipped) | 0ae79ea4 | W1-34 "sha1 e4155ad5 -> 0ae79ea4" |
| LE/01 `Na__LayoutEditor__LoadingScreen__.js` | W1-31 -> W1-33 | 9406389c | W1-33 :64 |
| LE/01 `Na__LayoutEditor__Styles__Boot__.css` | W1-33 -> W1-34 | cb6bfc03 | W1-34 "sha1 7806fd39 -> cb6bfc03" |
| LE/03 `Na__LayoutEditor__AppConfig__.json` | W1-32 -> W1-34 -> W1-35 -> W1-22, W1-25 (skipped) | f036fd76 | W1-35 "sha1 184b4ef4 -> f036fd76" |
| LE/05 `Na__LayoutEditor__ModeController__.js` | W1-32 -> W1-33 -> W1-34 -> W1-36 (skipped) | 38618bde | W1-34 "sha1 d522cafa -> 38618bde" |
| LE/05 `Na__LayoutEditor__TabStrip__.js` | W1-34 | c2ccc9f9 | W1-34 "sha1 4a60105f -> c2ccc9f9" |
| LE/40 `Na__LayoutEditor__Toolbar__.js` | W1-35 | 550db24f | W1-35 :20, :177 |
| LE/60 `Na__LayoutEditor__PdfExporter__.js` | W1-23 -> W1-24 -> W1-25, W1-28 (skipped) | c2b6a594 (sha256 d1b5385e70f1387c) | W1-24 "sha256 d1b5385e70f1387c" |
| VVM/40 `Na__DrawView__ProjectData__.js` | W1-05 -> W1-12 | 6d45915b | W1-12 "sha1 5b35803a -> 6d45915b" |
| VVM/01 `Na__AppFlow__LoadingSequence.js` | W1-01 (W1-11 only names it) | c2fd39de | W1-01 :48 |
| VVM/02 `Na__AppConfig__Main.json` | W1-03 | 2463e857 | W1-03 :46, :61 |
| VVM/03 `Na__AppUtils__ValeVision__HotkeyHandler__.js` | W1-29 (W1-32 names it) | 0bad5770 | W1-29 :21, :62 |
| VVM/03 `Na__AppUtils__KeyScope__.js` (new) | W1-29 | 4cc3e884 | W1-29 :13 (14,165 bytes) |
| LE/31 `Na__LayoutEditor__DocumentKeys__.js` (new) | W1-30 | 5c1c4d93 | W1-30 :17 |
| LE/15 `Na__LayoutEditor__ShapeRings__.js` (new) | W1-13 (W1-18 imports it) | f7901e68 (sha256 f3e9bbda) | W1-13 "sha256 f3e9bbda..." |
| LE/10 `Na__LayoutEditor__Styles__Main__.css` | W1-33 | 70fe7384 | W1-33 "sha1 2eb30c3b -> 70fe7384" |
| VV/80 `Na__Test__LoaderFacade__.test.mjs` | W1-31 -> W1-33 (importer update) | d5fc90c5 | W1-33 :94 |
| VV/03 `Na__CoreUi__Styles__Index__.css` | W1-06 (PARTIAL) -> W1-37 (skipped) | 5d519dba | W1-06 "sha1 c074af21 -> 5d519dba" |

No hot file changed after its last W1 owner finished. The W1-touched records the scribe owns are untouched:
`ValeVision__DEVLOG__.md` (last written 01-Oct 22:18, W0-99), `ValeVision__PARITY__TrueVisionLedger__.md` (22:08, W0-99).

### 2.4 Cross-package hand-overs checked in the live tree

- **W1-04 F1** (the walk exit needs W1-32's line): `Na__DrawView__Transitions__SuspendThreeD({ returnToOrbit : true })`
  is at LE ModeController `:658` (W1-32). Closed.
- **W1-31 F1 / W1-32 F1** (two CheckNames rows for VIEW_REGISTER / VIEW_STATEMENT): added by W1-33;
  `Na__Test__LoaderFacade__` 117/117. Closed. (The site-plan row stays with W1-21 - skipped; the test passes because
  VV's SheetModel does not export `Na__LeModel__DRAWING_SITEPLAN` yet.)
- **W1-06 F1 / W1-09 F4 / W1-10 F4** (re-run DrawingDrafts after W1-10): 50/50 in place, Doous on disk. Closed.
- **W1-29 F3 / W1-30 F1** (KeyScope reader, DocumentKeys Ready / Initialize in the ModeController): landed by W1-32
  (DocumentKeys test 75/75). Closed.
- **W1-34 F2 / W1-35 F2** (the seven STALE allow-list rows): FIX-1. Closed.

---

## 3. Fix made by the gate (byte-preserving Python, `scratch/W1-GATE/apply_gate_fixes.py`)

The script refuses to write unless the file is at its recorded SHA-1, LF and BOM-free, and every anchor matches exactly
once; it keeps LF, saves the pre-image to `scratch/W1-GATE/preimage/` and the written SHA-1 to `preimage/written.sha1`,
and has `--dry-run`, `--candidate` and `--restore`.

**FIX-1 - seven STALE rows off the AppConfigParity allow-list (W1-34 follow-up 2, W1-35 follow-up 2; the W0 gate's
FIX-2 precedent).** `VV/80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs` (W0-15's test; no W1
package lists it, so neither package could edit it). The seven values came level with TrueVision's in this wave, so the
test warned "STALE: take them off the list" and failed with `--strict`. Evidence (`stale_rows_evidence.txt`, live config
against TV's at the pin by `git show`): `MarginNotes/Description`, `Labels/NoSheets`, `Labels/TabsPreviousTitle`,
`Labels/TabsNextTitle`, `Labels/SpecificationTab` - equal; `Labels/MarginToggle`, `Labels/MarginToggleTitle` (vv-only) -
in neither app. Change:
- the W1-34 rows `Labels/NoSheets`, `TabsPreviousTitle`, `TabsNextTitle`, `SpecificationTab` removed;
- the W1-35 rows `Labels/MarginToggle`, `MarginToggleTitle` removed, and the `MarginNotes/Description` row with its
  `// MARGIN NOTES` group comment (the group held only that row);
- DEVELOPMENT LOG `02-Oct-2026 - Version 1.0.2 ({{VVREL:W1-35}})`, newest first, saying the gate made the change to
  complete W1-34's and W1-35's follow-ups (a W1-35 placeholder because W1-35's follow-up names all seven rows; every W1
  placeholder resolves to the same wave release). The entry avoids the deleted key's name, as W1-35's own log does.
- not changed: the `Panels/FocusNote` row (still differs from TV: the Floor Areas / Patterns / site-plan clauses are
  withheld; W1-32 F6 asks that its owner field name the packages that bring them - informational, see 4.8).

SHA-1 e5e7d03e -> 46ee9ef0, 27,775 -> 27,435 bytes, LF kept. Validated as a scratch candidate first (`--candidate`, run
with `--vv-file` on the real config and `--strict`: exit 0, "PASS no stale allow-list entry") and again live: "72
differences, every one a listed seam (brand 17, decision 12, identity 11, na-path 3, tv-defect 3, vv-only 6, withheld
20)", "PASS no stale allow-list entry", `--strict` exit 0; `node --check` OK; PortNotes `--files` PASS (0 fail, 0 warn,
1 pending: W1-35 x1); ParityNaming `--files` PASS (0 / 0); the final whole-tree run in section 1.

Restore: `python -B execution\scratch\W1-GATE\apply_gate_fixes.py --restore` (writes the pre-image back, only if the live
file is still at 46ee9ef0).

Not fixed by the gate (outside its remit, not caused by W1, or not small): section 4.

---

## 4. Open items

1. **W1-17 PARTIAL - one stylesheet held back; needs an orchestrator correction (OC).** Landed and green: the hatch
   module (LE/36 `Na__LayoutEditor__HatchPatterns__.js` 1.5.0) and the whole library (22 JSON). Held back:
   `LE/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css` - its only home is the Patterns panel's
   own `<link>` (W2-29), and W1-17 proved on a throwaway root that landing it now fails G4 (stylesheet-home) on its own
   file. Proposed OC (W1-17 F1): move the stylesheet from W1-17's edits to W2-29's and rule on its Source version line
   (TV's sheet has no version: a `- Legacy :` field). The live tree has no such file (checked). With that OC, W1-17's
   work is complete; its record says W1-19, W1-20 and W1-26 need only the module, which is landed.
2. **W1-06 PARTIAL is now satisfied.** Its only incomplete acceptance item ("Na__Test__DrawingDrafts__ (ported) passes
   against VV modules") waited on W1-10's AutoNameText; on the quiescent tree it passes **50/50 in place** (G5). Every
   other W1-06 item passed or is deferred to the smoke test. W1-06 can be counted DONE.
3. **Twelve packages did not run** (the workflow skips a package whose dependency is not DONE): W1-17 -> W1-19 -> W1-20
   -> W1-21 -> {W1-07, W1-22 -> W1-25 -> W1-26 -> W1-27, W1-28 -> W1-36}; W1-06 -> {W1-07, W1-37 -> W1-38}. With items 1
   and 2 resolved, all twelve are dispatchable in a W1 continuation (before W1-99, or W1-99 records them as pending).
   Interim states the tree carries until they land (each named by its package's record):
   - **Save Sheets shows no success toast** (W1-05 F2: "the one visible regression to know about" if W1-21 does not land
     in this wave) - the save lands, errors still show; W1-21 brings TV's SheetModel Save report and toast.
   - **Page Up / Page Down on a drawing tab do nothing** (W1-29 F4, W1-32 F3) - they no longer move the hidden 3D camera;
     sheet paging arrives with W1-36's Controls__Pc 1.4.0.
   - **1:200** is named by ScaleManager's TV DESCRIPTION while VV's `Scales AvailableScaleDenominators` is still
     [20, 50, 100] (W1-13 F2; comment-only until W1-22 adds 1:200, DR-17).
   - **UI parity [4] panels** fails (non-blocking) until W1-38 (PanelHost 1.6.0, Styles__Panels).
   - W1-21 owes the `DRAWING_SITEPLAN` CheckNames row (W1-31 F1, W1-33 F4); W1-26 owes the title-block QR cell with
     `QrCellNote`'s stale TV path (W1-15 F5); W1-07 owes AutoSave 1.5.0 (Modal 1.2.0's altLabel is ready, W1-06).
4. **Live-site viewer gap - a decision before W1 is deployed (W1-33 section 1.1, F1).** On the read-only live site
   (viewer mode) a Vale client's first drawing of a session now fills in uncovered until W4-09 lands the published
   viewer: (a) a one-line VV seam until W4-09 (drop `!Na__LeVw__IsViewerMode() && ` at the FirstOpen call, LE
   ModeController :688 today - W1-33's record says :678, before W1-34's hunk - listed under Divergences), or (b) hold
   the live deploy until W4-09. Localhost is unaffected.
5. **W0 leftover placeholder (not caused by W1):** `WebApps/ValeVision3D/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md:62`
   still reads `{{VVREL:W0-16}}`. W0-99 left it for the orchestrator (its record section 5) and OC-05's tool resolved
   only the WCP files. It should read `v2.71.1` (W0's release), byte-preserving, as OC-05 did. The W1-99 scribe's folder
   list (02, 03, 80, index.html, WCP, prepared) does not reach `04__Lib__ThirdParty__VersionLocked`, so tell it, or apply
   it with the OC-05 tool pattern. Comment-only (markdown); nothing reaches a page.
6. **Plan gaps with no owning package** (reported by W1 packages; not small, not the gate's): (a) TV v2.112.0's Fly
   controls 1.0.1 render-loop release (`Na__RenderLoop__StopActiveRender('fly-mode')`) is missing from VV's
   `10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js` - after one flight the loop keeps drawing every frame,
   and W1-36's acceptance (TV's `Na__Test__SheetPagingWalkExit__` "Fly the same") will fail until it is added (W1-04
   F2: fold the one-line hunk into W1-36 or a small package). (b) The specification number still uses the `?project=`
   token: `LE/50/Na__LayoutEditor__SpecPdf__.js:159`, `Na__LayoutEditor__SpecDocument__.js:162`,
   `Na__LayoutEditor__SpecEditor__Bar__.js:209` (W1-12 F1: give W1-25 or a follow-up the one-line seam to
   `Na__DrawData__GetDocumentCode`). (c) The elevation exclusion-token trim (W1-10 F3: plans trim since W1-08,
   elevations store as typed - decide in W2-05).
7. **Decisions for Adam recorded by the packages** (no action by the gate): W1-04 F3 (keep the seam-free ReturnToOrbit,
   recommended, or restore the planned SetOrbitMode seam); W1-35 1.1 (MarginNotes description taken whole, including the
   leaderless clause); W1-34 1.1 (menu rows carry the drag silently, no rename hover); W1-09 F2, W1-10 F2 (TV's comments
   naming NA projects kept verbatim in inert files - neutralise or not, DR-43); W1-16 F1 (TV's bronze frame, DR-13).
8. **Records hygiene for the next owners** (comments only; not edited by the gate because each needs more than a line):
   `46__System__NorthDirection/Na__North__ConfigState__.js`'s PORT NOTE Parity line still says the config does not carry
   ShownByDefault (it does since W1-11, F5) - the file is on the PortNotes baseline with a source-version WARN, so any
   edit makes the full checks apply and needs its Source version line researched too; the `Panels/FocusNote` allow-list
   row's owner still reads W1-32 (W1-32 F6 names W2-16 / W2-29 / W3-09 / W3-10, but the plan names no single owner for
   the remaining clauses - informational, the test passes); stale toolbar comments in Navigation `:30` and Eyedropper
   `:695` arrive corrected with W1-36 / W2-21's whole-file takes (W1-35 F3).
9. **Scratch carries TrueVision / NA text** (W1-09 F5, W1-10 F5: TV source copies and diffs at the pin): keep
   `execution/scratch/` out of any ValeCodebase commit. `checkpoint.py` already excludes the whole evidence folder.

---

## 5. For the W1-99 Parity Scribe

1. **Placeholders to resolve: 136 in 101 files**, all inside the PortNotes verifier's scope (section 1, G4 port notes),
   including the gate's own `{{VVREL:W1-35}}` in `Na__Test__AppConfigParity__.test.mjs:56` (FIX-1). None in WCP Flask
   files or `execution/prepared/` this wave. JSON files carry no placeholder (W1-16's SheetImages config and W1-17's
   hatch index say "parity package W1-16 / W1-17" in `Meta__PortedFrom` - optionally replace with the version). The W0
   leftover in the VersionLock README is item 4.5 (W0's release, not W1's). The PLAN's two rule quotations stay.
2. **Devlog top**: unchanged since W0-99 (`ValeVision__DEVLOG__.md` last written 01-Oct 22:18): line 4 is
   `## ValeVision3D v2.71.1 - 01-Oct-2026 - ...` (W0), then W0-06's records note (:243), then v2.71.0 (:271). Re-read it
   before allocating (Q-VER patch step: the next is v2.71.2 if nothing else lands first).
3. **Package states to carry**: 24 DONE; W1-06 PARTIAL but its last automatable item now passes (4.2); W1-17 PARTIAL
   (stylesheet held for an OC, 4.1); 12 not run (4.3) with the interim states listed there (the Save Sheets toast and
   Page Up / Page Down are user-visible).
4. **Gate results to carry**: G1 527 / 0; G2 459 PASS (facade 37); G3 PASS through the records-exempt wrapper (raw: 55
   hits in the audit report only, OC-04); G4 ParityNaming 0 / 0, PortNotes 0 fail / 123 baseline + 5 legacy WARNs, UI
   parity 1 of 7 failing ([4] panels, W1-38's; [1] fold, [2] strip, [3] veil PASS also when blocking; [7] token WARN);
   G5 24 / 24 (8 new tests); 86 / 86 modules link in a browser; the app boots with no uncaught error (read-only);
   FIX-1.
5. Records the gate wrote: this report, `Na__Test__AppConfigParity__.test.mjs` (FIX-1) and `execution/scratch/W1-GATE/`
   only (no devlog, ledger, AUDIT or WORKING_MEMORY edit).

---

## 6. Notes for the orchestrator and Adam (not failures)

- **Smoke test (online, by eye) still needed**: the packages deferred their in-app items to it - door clicks left-button
  only and the Video Studio preview (W1-02), fascia / parapet bleed gone from elevations (W1-03), walk exit on opening a
  sheet / plan / elevation (W1-04, after W1-32), "Drawings data loaded" (W1-05), Dev-menu folds and the green Update
  dialog (W1-06), Show Compass (W1-11, without saving), 3D hotkeys and key scope on drawing tabs (W1-29, W1-30, W1-32),
  the header fold and veils (W1-33), the tab strip and Drawings menu (W1-34; needs a project with Layout Mode on and
  sheets - Doous has neither), the toolbar without Notes / Undo / Redo / Fit / 100% (W1-35, DR-40 item 3), a PDF of
  "Elevations Test" (W1-23, W1-24). Saves are Adam's (they write R2 and the repository copy).
- **Visible changes for Vale users to name in the devlog** (from the records): right / middle click no longer toggles a
  door (W1-02, TV 1.8.0); elevation and plan base images lose sub-75 mm line bleed (W1-03); D, O, Delete and Escape on
  the 3D tab are no longer swallowed (W1-29); the five toolbar buttons are gone, their keys and right-click entries stay
  (W1-35); the first drawing's cover and header fold are TV's (W1-33); the tab strip is TV's five-tab design with three
  tabs here (W1-34).
- **Shared service worker**: no W1 package edited or bumped it; most records ask for the one consolidated W0/W1 bump at
  deploy (DR-07) and for W6-02 to precache their new modules (KeyScope, DocumentKeys and its key map, StoreyLevel,
  the 49 fog modules, FindDoorGroups, LocalProjectMirror ...). UI parity [7] warns the token predates 16 VV releases.
- **Deploy order** is unchanged from W0 (working memory section 6): W0-07's sync fix before any sync of projects with
  editor content; W0-08's service-worker package and one token bump with the renumber; worker 1.6.0 needs Adam's
  `wrangler dev` proof. All three prepared patches still apply cleanly to today's live files.

---

## 7. Evidence (execution/scratch/W1-GATE/)

`RUN1__*.txt` (first run of G1-G5) and `FINAL__*.txt` (final run, after FIX-1), each with `__summary.txt`;
`G5__RUN1__*.txt` / `G5__FINAL__*.txt` (each test's full output); `RUN1__EXTRA__*.txt` / `FINAL__EXTRA__*.txt` (self-tests,
UI parity blocking run, AppConfigParity `--strict`, `git apply --check`); `crosscheck.py` -> `crosscheck.json` /
`crosscheck.txt`; `w0_unchanged.py` -> `w0_unchanged.txt`; `hash_attest.py` -> `hash_attest.json`; `edits_scope.py` ->
`edits_scope.txt`; `hot_chain.py` -> `hot_chain.txt`; `syntax_sweep.py` -> `syntax_sweep.txt` (+ `syntax_tmp/`);
`vvrel_scan.py` -> `vvrel_scan.txt`; `ignored_check.py` -> `ignored_check.txt`; `link_sweep.mjs` -> `link_sweep.txt` /
`link_sweep_results.json`; `run_w1_html_pages.mjs` -> `w1_html_pages.txt` / `w1_html_pages_results.json`;
`run_w0_html_harnesses.mjs` -> `w0_html_harnesses.txt` / `html_harness_results.json`; `run_app_boot.mjs` ->
`app_boot.txt` / `app_boot_results.json`; `stale_rows_evidence.py` -> `stale_rows_evidence.txt`; `apply_gate_fixes.py` +
`preimage/` + `candidate/` (FIX-1); `followups.py` (the records' follow-up sections); `status_before_gates.txt` /
`status_final.txt`; the runners `run_gates.py`, `run_g5.py`, `run_extras.py`, `g5_table.py`.
