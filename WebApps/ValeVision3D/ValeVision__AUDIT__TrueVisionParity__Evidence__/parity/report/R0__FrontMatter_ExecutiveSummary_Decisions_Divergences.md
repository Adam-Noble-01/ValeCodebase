# ValeVision 3D <- TrueVision 3D: Drawing System and Layout Editor Parity Audit

## Executive Summary, Decision Register and Permanent Divergence Register

### R0.0 Front matter

**Date:** 01-Oct-2026. **For:** Adam Noble, and the planning agent that will hand the code changes to a parallel coding swarm. **Status:** a read-only audit. Nothing in either app, in NAAPPS or in Whitecardopedia was changed.

**What was compared**

| | TrueVision 3D (TV): lead, source of truth | ValeVision 3D (VV): target |
|---|---|---|
| Client | Noble Architecture | Vale Garden Houses |
| App root | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` | `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` |
| Git root and HEAD | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb` at **b2aa9151** (30-Sep-2026 09:07) | `D:\10_CoreLib__ValeCodebase` at **7b4e593a** (28-Sep-2026 16:41) |
| Devlog top | **TrueVision3D v2.172.0 - 29-Sep-2026** (`TV/TrueVision__DEVLOG__.md:5`) | **ValeVision3D v2.71.0 - 28-Sep-2026** (`VV/ValeVision__DEVLOG__.md:4`) |
| Working tree, 01-Oct-2026 14:15 | app folder clean | app folder clean. Whitecardopedia has 2 modified data files and 1 untracked project folder (see R0.1.5, P3) |
| Local server | `NAAPPS/ProjectVision__LocalServer__Main__.py` | `WCP/server.py` (Flask) |
| Cloudflare worker | `na-truevision-api` (`TV/80__CloudflareIntegration/CloudflareWorker/wrangler.toml:24`) | `whitecardopedia-editor-api` (`WCP/CloudflareWorker/wrangler.jsonc:16`) |
| R2 | bucket `noble-architecture-cdn` (`wrangler.toml:35`), prefix `NaProjectPortal/` | same bucket (`wrangler.jsonc:25`), prefix `VaApps/Projects/{folderId}/` |
| Service worker | its own (`TVM/62__Feature__AppInstallability/`) | the shared Whitecardopedia worker (`VV/index.html:19` links its manifest; token `'2026-09-18-1'` at `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`) |

**Scope.**

- **In scope:**
  - the Drawing System: VV 41-47 and 50 against TV 40-50, including TV-only 47, 48 and 49;
  - the Layout Editor (`51__System__LayoutEditor`). TV has 34 subfolders; VV has 17 of them plus its own `LE/01__Core__Loader`;
  - TV-only folders the editor needs: 27, 52, 53, 54, 55 and 80;
  - the wiring around them: entry HTML, CSS index, loader, config, events, keys, service worker and test harnesses;
  - the app chrome around the editor: header fold, tab strip, veils, toolbar and menus;
  - data model, persistence and transport. VV keeps its own worker, Flask server and R2 prefix.
- **Out of scope:**
  - 3D-only features unless they touch the editor (VV 28, 29, 31, 60-64, 69, 71; TV 62, 75, 76);
  - TV v2.92.0, the presentation batch export (DR-44: outside this alignment unless Adam wants it), and the twelve TV-only 3D-tab files no drawing package needs: `07` DefaultFogEffect, `11` ViewModeFov DevControls, `15` InstanceConsolidation and LineworkColours, `21` Visibility StateCapture, `26` model-group and storey UI (six files; the model-group selector and its overlay also fall under DR-09 (a)) and `70` AssetCullDistance DevControls (R2 B.4.2, R5 E.2.5). TV's `15` MultiModel imports two of them, so W1-03 stays a hunk port;
  - running either app;
  - Whitecardopedia and NAAPPS internals beyond the files named.
- **Method:**
  - 18 slice surveys, each checked by an adversarial verifier: 1,077 verified findings, 98 of them added by verifiers;
  - three syntheses: K1 (decisions), K2 (target maps and naming rules) and K3 (work packages);
  - every fact this section cites was re-opened on 01-Oct-2026 (path:line given), or comes from a cited finding.

**How to use this document (for the delegating agent)**

| Question | Answered in |
|---|---|
| What must Adam decide, and what happens if he does not answer? | **R0.2**: DR-01 to DR-44 (K1), Q-VER (R0.2.1) and six questions this report raised (R0.2.11). DR ids gate packages. |
| What must stay different in VV, and where does each difference live? | **R0.3** (PD-01 to PD-26 and the tables after it). The swarm never "fixes" these. |
| What will still differ from TrueVision when the programme ends, and which answer removes each difference? | **R0.1.8** |
| Which folders are renumbered, created or retired, and when? | **Section A** (K2 `target_folder_map.json`; the scripted renumber W0-02) |
| Which files, exports, keys, events and CSS names change? | **Section B** (K2 Naming Rulebook; `file_rename_map.json`) |
| What must each ported module be wired to? | **Section C** (entry HTML, CSS index, loader, config, events, keys, service worker; the transport table) |
| What will a user see differently? | **Section D** (header fold, tab strip, veils, toolbar, panels, menus) |
| Where was the port up to, module by module? | **Section E** (watermark, ledger, per-module inventory) |
| Who does what, in what order, with which gates? | **Section F** (K3 waves W0-W6 and the TrueVision lane WT, hot-file ownership, tests, critical path) |

**Canonical machine-readable artefacts.** `parity/` means `ValeVision__AUDIT__TrueVisionParity__Evidence__/parity`.

| Artefact | File | Cite as |
|---|---|---|
| Decisions | `parity/data/decision_register.json` (44 DRs); `parity/data/decision_raw_map.json` (all 363 raw decision ids mapped) | DR-nn |
| Target folders and files | `parity/data/target_folder_map.json` (113 rows, TF-*); `parity/data/file_rename_map.json` (25 rows, FR-*); rules in `parity/report/K2__NamingRulebook.md` | TF-*, FR-*, rule ids (N1, H5, X2 ...) |
| Work packages | `parity/data/wp_canonical.json` (165 packages, DAG, critical path, tests; every Section F correction applied, recorded in `parity/data/wp_corrections_applied.json`); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (93 files) | W0-nn ... W6-nn, WT-nn |
| Evidence | `parity/data/findings_verified.json` (1,077 findings), `parity/slices/S*.md`, query helper `python parity/data/q.py` | S01-F04 (survey), S07a-V02 (verifier) |
| Release watermark | `parity/report/tools/r5work/release_rows_final.json` (177 TV releases, each with its class, packages and gating DRs; Section E, E.1) | TV release (v2.nn.n) |

**Reading rules.**

1. **DR ids gate packages.** Each K3 package lists `gated_by`. When a DR is unanswered, the package runs on that DR's default, unless its `hard_gate` says it must wait. 24 packages are hard-gated:
   - W0-07, W0-08, W0-10;
   - W3-04;
   - W4-12, W4-13;
   - W5-04, W5-05, W5-06, W5-07;
   - W6-02, W6-03;
   - WT-01 to WT-12.
2. **Raw ids come from the slice reports.** Map `D-Sxx-nn` and `WP-Sxx-nn` through the two raw-map files.
3. **K2's phase labels are not K3 waves** (K3 section 10):
   - K2 "W1" = W0-02;
   - K2 "W1b" = W0-03;
   - K2 "W2 (first)" = W0-12.
4. **Every VV path in this report is a K2 target path**, i.e. the path after the W0-02 renumber. Where today's path differs, it follows in brackets, e.g. `VVM/40__System__DrawingViewCore/` (today `42__System__DrawingViewCore/`). Path shorthand: `TV/`, `VV/`, `TVM/` = `TV/02__Src__AppModules`, `VVM/`, `LE/` = `51__System__LayoutEditor/`, `WCP/` = `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia`, `NAAPPS/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps`.

### R0.1 Executive Summary

**Verdict.** ValeVision's drawing system is an older, partial copy of TrueVision's:

- **The port stopped on 20-Sep-2026.** The newest TV release in VV is v2.85.0. TrueVision has shipped 88 releases since (v2.86.0 to v2.172.0), and none of them reached VV. Below that mark, 28 older release rows are still open or only partly ported (R0.1.2).
- **VV's Layout Editor is less than half of TV's:** 47% of the files and 42% of the lines. Seventeen whole TV Layout Editor subsystems are missing, and every shared hub is behind.
- **Some things already match:**
  - the top-bar fold animation Adam named (tokens identical at `TV/03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css:210-212` and `VV/...:206-208`; body class `na-layout-editor--active` at TV ModeController `:425` and VV `:284`). What differs is when it fires, and that VV's first open covers it (S10 B1);
  - the Layout Editor subfolder numbers (aligned 15-Sep-2026);
  - the drawings data block;
  - three.js r184.

**Recommendation.**

- Converge by adoption: TrueVision at b2aa9151 is the source.
- Run one scripted folder renumber first, alone (W0-02).
- Take TV files whole, leaves first and hubs last.
- Keep VV's own worker, Flask server and R2 layout behind a facade with TV's names.
- Allow exactly the named seams in R0.3, and nothing else.

**End state.** Run on the K1 defaults alone, the programme ends with an editor that matches TrueVision's code and behaviour but still differs on screen in thirteen ways (R0.1.8):

- **Two are permanent by design:** the lazy loader's cover on a cold first open, and Vale's brand content.
- **Three close only when TrueVision changes,** because VV is ahead or carries a fix TV lacks.
- **Eight close when Adam gives the answer, or takes the live action, named in their row:** the Design Statements tab, the Layout Mode switch, the QR cell, Vale phases in the Document ID, the four held gestures, site plans, design phases and the live publishing path.

#### R0.1.1 State of parity in numbers

| Measure | TrueVision | ValeVision | Gap | Source |
|---|---|---|---|---|
| Layout Editor (`LE/`) | 341 files, 150,637 lines | 161 files, 62,817 lines | VV has 47% of the files and 42% of the lines | `ref/tree_*.tsv` |
| `LE/` shared relative paths | 155 | 155 | 2 identical, 40 differ only in headers, 113 drifted (29,838 diff lines) | `ref/drift_summary.json` |
| `LE/` TV-only | 186 files, 72,656 lines (48% of TV's editor) | - | 17 whole subfolders (151 files) plus 35 files inside shared subfolders | `report/tools/r0_stats.py` |
| `LE/` VV-only | - | 6 files | 4 permanent: the loader's 3 files and the DrawingCode leaf (DR-24). `KeyMappings__.json` is renamed in W0-03; `Snapping__.js` is retired in W3-08 | K2 FR-12, FR-14, FR-15 |
| Drawing core (VV 42-47 and 50, against TV 40-46 and 50) | 44,706 lines | 38,105 lines | 94 shared files: 0 identical, 51 header-only, 43 drifted (10,974 diff lines). 13 TV-only files, 2 VV-only | `ref/drift_summary.json` |
| TV-only drawing-system folders | 47 DrawingPlanes (9 files), 48 CrossSectionViews (1), 49 ElevationDepthFog (8), 52 PublishedDocuments (11), 53 PublishedSchema (4), 54 ColourPalette (6), 55 SpellCheck (7), 27 ContextMenuSystem (9) | none of them | 55 files, 17,883 lines | `ref/tree_tv.tsv` |
| Section engine (DIV-2) | `41__System__SectionCutEngine`, 7 files, 2,638 lines | `41__System__CrossSectionView`, 7 files, 3,697 lines | 0 shared paths, by design | `ref/drift_summary.json` |
| Releases | v2.24.0 to v2.172.0 (177 rows classified) | v2.16.0 to v2.71.0 (the drawing-system releases) | 51 ported, 11 partial, 17 pending sign-off, 80 never considered, 4 reopened by K1 defaults, 2 deliberately not ported, 7 not drawing work, 4 VV-origin, 1 not applicable. **112 open** (partial, pending, never considered and reopened), 28 of them at or below the high-water mark | Section E (E.1.1, E.1.2), data `report/tools/r5work/release_rows_final.json`, recounted 01-Oct-2026. It corrects S11 B3 (55/6/17/79/6/8/4/2, 102 open) from other slices' evidence. W0-06 acceptance item 1 carries this tally since R6 F.8 C34 (R0.2.9 note) |
| Tests | 102 files in `80__Testing__PrototypeEnvironment` | 30 | W6-01 closes the TV inventory | S11 (a); K3 section 11 |
| Verified findings | - | - | 1,077: 31 critical, 309 high, 472 medium, 265 low | `q.py --format count` |
| Findings by action | - | - | port_verbatim 191, port_adapted 179, update_wiring 154, needs_decision 142, port_whole_reapply_vv 75, keep_vv_divergence 70, no_action 63, build_vv_transport 54, port_test 48, fix_ledger 43, backport_to_tv 30, rename_move 17, retire_vv 7, renumber_folder 4 | `q.py --format count` |
| Decisions | - | - | 363 raw ids merged into 44 DRs: 7 before Wave 0, 33 before the wave that needs them, 4 can wait | K1 section 5 |
| Work | - | - | 221 raw packages merged into 164, plus W5-07 that R6 F.8 C33 added: 165 - 153 VV packages in W0-W6 (about 154,649 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines) | K3 section 1; `wp_canonical.json` |
| Contention | - | - | 93 files are written by more than one package. The worst are the LE ModeController (20 packages), the LE AppConfig (17) and the Loader (16) | `hot_file_ownership.json` |
| Harness baseline (VV) | - | - | ModuleGraph 517 modules, 0 failures; Exports 415 files PASS; 6 of 6 node tests pass | K2 section 9 step 0 |

#### R0.1.2 Where the port was up to (Section E's reconciliation of S11)

- **High-water mark: TV v2.85.0** (20-Sep-2026), ported as VV v2.68.0 (`VV/ValeVision__DEVLOG__.md:320`).
- **The most recent port was only partial.** VV v2.70.0 (devlog `:133-134`, committed in `9d250d21` on 21-Sep) took TV v2.83.0, the top-bar fold:
  - the fold is identical;
  - the going-in veil was adapted away: no FirstOpen, no in-host veil base mode, no specification job. VV covers the first open with its full-screen loader instead.

  Section E (E.1.2) therefore classes v2.83.0 as PARTIAL, not PORTED. W1-33 completes it.
- **VV's only later release went the other way.** VV v2.71.0 (28-Sep, per-scene lighting) became TV v2.161.0.
- **Nothing from TV v2.86.0 onward is in VV.** TV shipped those 88 releases between 20 and 29 Sep:
  - 76 of them between 20 and 23 Sep, 43 on 21 Sep alone;
  - 12 on 28-29 Sep.
- **How those 88 are classified:**
  - 77 never considered for VV;
  - 7 parked "on Adam's sign-off";
  - 1 deliberately not ported (v2.88.0);
  - 1 VV-origin (v2.161.0);
  - 2 not drawing work (v2.92.0, v2.139.1).
- **Low-water mark: TV v2.28.0** (13-Sep, viewport snap move). One configuration residue of v2.27.0 also remains (`Drawing2dEdgeWidth`, S09-F33, W2-08).
- **At or below the high-water mark, 28 release rows are open or only partly ported, not the 18 that S11 counted.**
  - The 28 are 27 numbered releases plus the unnumbered 14-Sep eyedropper feature.
  - By class: 11 partial, 10 pending sign-off, 4 reopened, 3 never considered.
  - Section E adds ten rows to S11's 18. Four are "deliberate" non-ports that the K1 defaults reopen: v2.32.0 (DR-09), v2.69.0 (DR-21), v2.71.0 and v2.76.1 (DR-11).
  - The other six are corrections from other slices' evidence. v2.30.2, v2.57.0, v2.65.0, v2.67.0 and v2.83.0 become PARTIAL. v2.75.0 becomes never considered, because its batch commit carried unlogged ItemClipboard 1.3.0 and registrar 1.2.0 changes.
  - Other open examples: v2.37.0 flush joins (signed off by Adam in TV on 14-Sep), v2.42.0 and v2.48.1 plan doors, site plans v2.48.0-v2.49.1, v2.78.0 select-picks-move, v2.82.0 drawing planes.
- **There is no single watermark.** Each feature area has its own low-water release (Section E, E.1.3). Where Section E moved S11 B1's value, the old value is in brackets:
  - LE sheet tools: v2.28.0;
  - LE drawing tools: v2.41.0;
  - LE viewports and render styles: v2.32.0 (S11: v2.38.0; Model Source reopened);
  - projected linework (50): v2.37.0;
  - drawing core, plans, elevations, north, planes and fog (40-49): v2.30.2 (S11: v2.82.0; the start-up config order);
  - LE core: v2.67.0 (S11: v2.106.0; the unsaved-work hold);
  - LE web viewer, PDF and publishing: v2.65.0 (S11: v2.155.0; the broken-bubble hover).
- **The VV parity ledger is out of date.** It records none of the 88 later releases, and about 40 of its rows are stale or contradictory (S11 B4).
- **S11's module table cannot be run as written** (S11 verifier, S11-V01, S11-V02):
  - 10 rows marked no_action hide TV changes that VV lacks;
  - 44 of the 62 whole-file rows import TV modules VV does not have.

Section E carries the full release table (E.1.4) and the per-module watermark. Its data file, `report/tools/r5work/release_rows_final.json`, is the canonical source: W0-06 seeds the ledger's Release Watermark from it (R0.2.9 note).

#### R0.1.3 Biggest gaps by system

| # | System | VV today against TV HEAD | Owning K3 packages | Gating DRs |
|---|---|---|---|---|
| 1 | Document system | All missing:<br>- LE/52 Statement Writer: 33 files, 16,898 lines<br>- LE/51 Drawing Register: 10 files, 3,659 lines<br>- LE/65 publishing: 7 files, 2,604 lines<br>- LE/66 sharing: 7 files, 2,116 lines<br>- top-level 52 PublishedDocuments: 11 files, 3,998 lines<br>- top-level 53 PublishedSchema: 4 files, 1,138 lines<br>VV's web viewer still renders drawings and builds PDFs on the reader's device (S08-F01, critical). | W4-01 to W4-18; W4-11 (27 renderer) | DR-10, DR-11, DR-22, DR-23 |
| 2 | Layout Editor records and hubs | - SheetRecords 1.15.0 against 1.39.0 (S03b-F01, critical)<br>- ModeController 1.18.0 against 1.32.0 (S03a-F13, critical)<br>- SheetTools: 16 drifted files, 5,731 diff lines; the hub needs 12 TV-only systems first (S05a-F30, critical)<br>- SheetData: 3,974 diff lines<br>- Config: 3,186 diff lines | W0-15; W1-19 to W1-22, W1-28; W1-32, W1-36; W3-01, W3-03 (XL, atomic) | DR-01, DR-05, DR-11, DR-14 |
| 3 | Drafting aids | All missing:<br>- LE/28 ObjectSnap: 16 files, 5,534 lines<br>- LE/27 DrawingGrid: 5 files, 1,451 lines<br>- LE/26 DraftMode: 4 files, 649 lines<br>- LE/32 OrthoMode: 3 files, 438 lines<br>- LE/33 DrawingAxes: 3 files, 680 lines<br>Also missing: the move anchor and viewport rotation. VV has only the pre-folder `Snapping__.js`. | W1-14, W2-18, W2-19, W2-25, W2-42, W3-05, W3-06, W3-08 | DR-01, DR-40 |
| 4 | Vector tools and Booleans | LE/37 missing: 18 files, 7,385 lines | W1-14, W2-27, W2-28, W2-41, W3-07 | DR-18 |
| 5 | Sheet content | Missing:<br>- LE/54 Sheet Images: 17 files, 4,709 lines<br>- LE/59 Floor Areas: 10 files, 4,222 lines<br>- LE/58 Specification Scrapbook: 5 files, 2,220 lines<br>- LE/53 Project QR: 6 files, 1,895 lines<br>- LE/36 Hatch: 3 files, 1,480 lines, plus the app-root hatch library<br>Behind:<br>- LE/57 Parametric Scrapbook: 5 TV-only files, 9 drifted<br>- LE/50 Specification: 8 TV-only files, 13 drifted | W1-15 to W1-17, W1-27; W2-29 to W2-39; W3-02, W3-09 to W3-18 | DR-12, DR-13, DR-14, DR-19, DR-20 |
| 6 | Drawing core (40-50) | Missing:<br>- 47 Drawing Planes: 9 files, 3,967 lines<br>- 49 Depth Fog: 8 files, 2,203 lines<br>- the 48 placeholder<br>- 11 TV-only files to port into shared folders: DraftGuard, DraftMaths, DevRowShell, DrawingUsage, StoreyLevel, StoreyRow, AutoName, AutoNameText, DoorPose, FlushJoins, Storeys<br>Folder 50 last took TV v2.64.1. | W0-02; W1-01 to W1-11; W2-01 to W2-06, W2-40, W2-43 | DR-02, DR-15, DR-16, DR-31, DR-32 |
| 7 | Viewports, render styles, site plans | - LE/20: 6 TV-only files, 9 drifted<br>- LE/25: 2 TV-only files, 6 drifted<br>- LE/21 site plans (2 files, 1,168 lines) and Model Source: missing | W2-09 to W2-16, W3-06, W3-15 | DR-08, DR-09 |
| 8 | Editor chrome | - TabStrip 1.5.0 against 2.0.0<br>- LoadingVeil 1.0.0 against 1.1.0<br>- Toolbar 1.9.0 against 1.24.0<br>- PanelHost 1.4.0 against 1.6.0<br>- Missing: 54 ColourPalette, 55 SpellCheck, LE/31 DocumentKeys<br>- VV's full-screen loader hides the header fold on the first open (S10 B1.4) | W1-29 to W1-38, W2-34, W5-01, W5-02 | DR-33, DR-38, DR-39, DR-40 |
| 9 | Transport and persistence | - No facade yet for TV's 33 `Na__CfApi__*` and 8 `Na__LocalMirror__*` names<br>- Flask has one blueprint<br>- No save guard<br>- The Whitecardopedia sync purges subfolder images on R2 (S12-F01, critical) | W0-07, W0-09 to W0-14, W0-18, W0-19 | DR-06, DR-27 to DR-30 |

#### R0.1.4 Recommended strategy: converge by adoption, behind named seams

1. **TrueVision is the source of truth, pinned at b2aa9151 (v2.172.0).** Everything TV shipped up to that commit is ported in dependency order. Every release Adam has not confirmed is named in the VV devlog entry that lands it. The four mouse-gesture changes wait for his explicit yes (DR-01 (c), DR-40 items 7-10). Anything TV ships after b2aa9151 needs a fresh pin.
2. **Make paths identical first.** One agent runs K2's scripted renumber (W0-02), alone:
   - VV 42-47 become TV 40, 42-46;
   - legacy 40 moves to 91;
   - ComposerPreset becomes RenderPreset, keeping VV's body;
   - DistanceCulling and SnapshotHistory move to TV's paths.

   The script was proven on a copy: 94 files rewritten, ModuleGraph and Exports PASS, and 70 drawing files paired with TV by identical path (K2 section 1). Every later port then copies TV paths unchanged (DR-02, DR-03, DR-04).
3. **Take files whole; re-apply only listed seams.** A TV file is taken verbatim at b2aa9151. It is landed only once everything it imports exists in VV, so leaves go first and hubs last, with no throwaway stubs (DR-05; K3 rules R1-R3). It takes TV's module version and DEVELOPMENT LOG (DR-34). Only the seams in R0.3 are re-applied, and each is listed in the file's PORT NOTE `Divergences` (K2 H5).
4. **VV keeps its own R2 worker and file structure.** "File structure" means VV's storage layout under `VaApps/Projects/{folderId}/`, not its source tree (DR-02). Ported modules reach VV's worker and Flask server through a VV-written facade with TV's paths and export names (W0-12, DR-27). New content folders take TV's relative names inside VV's prefix (DR-29).
5. **Identity follows one rule.** Code identity (folder and file names, exports, events, CSS names, data keys) is TrueVision's. App identity, brand values and NA-only content are ValeVision's (K2, one-sentence rule; DR-43).
6. **VV differs from TV in exactly the places listed in R0.3.** Any other difference is drift and converges to TV. Removing a listed seam is a regression.
7. **TrueVision-side work** (back-ports, TV defect fixes) runs only in the WT lane, with Adam's approval package by package (DR-36). Until he approves, VV carries the seams the WT lane would remove.

#### R0.1.5 Prerequisites before any swarm agent starts

| # | Prerequisite | Owner | Evidence |
|---|---|---|---|
| P1 | Adam answers DR-01 to DR-07 (or accepts the K1 defaults in writing) and the devlog version-step question (R0.2.1, Q-VER). He also sees the six questions this report raised (R0.2.11). Each has a default; three of them (Q-REG, Q-63, Q-BACKUP) are read by Wave 0. W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, and each question is named in the packages it gates (R6 F.8 C35). | Adam, then W0-01 | K1 section 1; K3 W0-01; DR-35; R0.2.11 |
| P2 | Pin the source at TV b2aa9151. Every Port Record says "read at HEAD b2aa9151". A later TV commit needs a fresh pin and a fresh DR-01 answer. | planner | DR-01; K2 H5 example |
| P3 | `git -C D:/10_CoreLib__ValeCodebase status --short -- WebApps/ValeVision3D WebApps/Whitecardopedia` must be empty before W0-02. At 14:15 on 01-Oct-2026 the VV app folder was clean, but Whitecardopedia showed 3 entries that someone has to commit or park first:<br>- `M .../03__AppData/Na__AppData__MasterConfig__Main.json`<br>- `M .../03__AppData/Na__MasterIndex__ProjectLocations__.json`<br>- `?? Projects/2026/64348__Mathison/`<br>The TV app folder was clean. | Adam | K2 section 9 step 0; git status run for this section |
| P4 | The baseline gates are green from the VV root:<br>- `Na__Verify__ModuleGraph__.mjs`: 517 modules, 0 failures<br>- `Na__Verify__Exports__.mjs`: 415 files PASS<br>- `k2_path_gate.py --names ZZZ_NONE`: 0 fail<br>- the 6 VV node tests pass | W0-02 agent | K2 section 9 step 0 |
| P5 | Read the top of `VV/ValeVision__DEVLOG__.md` (v2.71.0 today) and the ledger again before any version is allocated. Parallel sessions bump them. Only the wave's Parity Scribe writes either file (K3 R5). | scribe (Wn-99) | K3 R5, R11 |
| P6 | W0-01 publishes swarm rules R1-R11 and gates G1-G7. W0-04 lands the naming lint, the PORT NOTE verifier and the UI parity gate before Wave 1. | W0-01, W0-04 | K3 section 2 |
| P7 | W0-02 runs alone: no other package may be in flight on VV. It rewrites 94 files, including `index.html`, `Na__AppFlow__LoadingSequence.js`, the CSS index, the LE ModeController, SnapshotRenderer and MarkupBridge. | planner | K2 section 9 |
| P8 | Agents search only `02__Src__AppModules`, `03__Style__AppStylesheets`, `80__Testing__PrototypeEnvironment` or named files, never an app or git root. Both app roots hold stale `.claude/worktrees` copies (VV 2, TV 2), and `62__Feature__EmailWorkers` holds 1,857 tracked `node_modules` files. Edits go to the live app folders, never to a worktree. | every agent | `ls` of both roots, 01-Oct-2026; K2 TF-T32 |
| P9 | Adam's live actions are scheduled:<br>- apply the sync fix (W0-07) before Sheet Images go live (W3-09) and before anything publishes (W4-03, W4-07);<br>- deploy worker 1.6.0 (W0-10) before those features go live;<br>- bump the shared service-worker token at each deploy (W0-08, W6-02);<br>- answer DR-40 items 7-10 for W3-04;<br>- approve each WT package (DR-36). | Adam | K3 hard gates; swarm rules R6-R8 |
| P10 | **Resolved in code; one live check left.** VV registers Whitecardopedia's worker, never `live_sw.js`:<br>- `VV/index.html:34` loads WCP's Url constructor and `:44` its registrar;<br>- the registrar registers `getServiceWorkerUrl()` (Registrar `:97-105`, `:191-195`), which resolves the WebApps-root stub `Na__Pwa__ServiceWorker__.js` (Url constructor `:38`, `:225-231`). On WCP's dev port, Flask serves the stub at the origin root (`WCP/server.py:915-928`);<br>- the stub `importScripts` the WCP logic file (stub `:24`, `:31`), whose token is `'2026-09-18-1'` (`:229`);<br>- `D:/10_CoreLib__ValeCodebase/WebApps/live_sw.js` is an unreferenced saved copy of that logic file: FILE line `:5`, token `'2026-09-10-6'` at `:68`, last commit ff8c492a (10-Sep).<br>Left: at the W0 deploy, confirm the live site serves the same stub (the GitHub Pages copy is assumed to match the repository). | Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; R3 C.6; K2 sections 9 and 12; code read 01-Oct-2026 (`live_sw.js`: token at `:68`; `:157` is its stale DistanceCulling precache line) |

#### R0.1.6 Critical path (K3 section 7)

| Wave | Longest chain | Est. lines | Human gate on or beside the chain |
|---|---|---|---|
| W0 | W0-01 -> W0-02 -> W0-07 -> W0-10 -> W0-12 -> W0-13 -> W0-99 | 5,599 | DR-02 to DR-04 (W0-02 script switches); W0-07 is prepared only, and Adam applies it; W0-10 is built under `wrangler dev`, and Adam deploys it |
| W1 | W1-13 -> W1-19 -> W1-20 -> W1-21 -> W1-22 -> W1-25 -> W1-26 -> W1-27 -> W1-28 -> W1-36 -> W1-99 | 12,950 | DR-01 recorded (W1 reads it) |
| W2 | W2-40 -> W2-01 -> W2-03 -> W2-34 -> W2-35 -> W2-16 -> W2-39 -> W2-99 | 13,570 | - |
| W3 | W3-18 -> W3-02 -> W3-03 -> W3-05 -> W3-07 -> W3-09 -> W3-10 -> W3-17 -> W3-14 -> W3-99 | 11,330 | W3-04 (gestures) sits beside the chain, held for Adam's yes; W3-09 needs W0-07 applied before it writes to R2 |
| W4 | W4-04 -> W4-05 -> W4-06 -> W4-07 -> W4-08 -> W4-10 -> W4-12 -> W4-13 -> W4-14 -> W4-99 | 19,460 | W4-12 and W4-13 land switched off (DR-10) |
| W5 | W5-01 -> W5-05 -> W5-07 -> W5-99 | 1,570 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12), and W5-07 (R6 F.8 C33) only if he answers DR-25 'retire' at W4-09. Without the conditional packages (W5-04 to W5-07), the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
| W6 | W6-03 -> W6-01 -> W6-04 | 950 | W6-03 waits for Adam to confirm the user-visible removals (DR-03) |
| **All** | **53 packages** (56 by package count) | **65,429** | Every wave starts only after the previous wave's Parity Scribe pass; Adam commits once per wave (K3 R11) |

The TrueVision lane runs serially outside the wave barrier: WT-01 -> WT-09 -> WT-02 -> WT-12 -> WT-03 -> WT-04 -> WT-05 -> WT-06 -> WT-07 -> WT-10 -> WT-11 -> WT-08 (4,010 lines). It runs only under DR-36 (b).

#### R0.1.7 Top risks

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| T1 | **Live R2 data loss.** The Whitecardopedia sync lists `VaApps/Projects/{folderId}/` recursively: Prefix only, no Delimiter, first 1,000 keys. It deletes every `.png`/`.jpg`/`.jpeg`/`.webp` whose bare name is not a local top-level image.<br>- By code reading, every full or images sync (`na_sync_all`, `na_sync_images`; the GLB-only sync at `:964` does not purge) therefore deletes the R2 copies of PresentationMode thumbnails and Layout Editor snapshots. The repository holds 25 thumbnails (7 projects) and 18 snapshots (all in `2026/3047__Doous`). Whether R2 still holds their copies is unverified.<br>- It would also delete every sheet picture, published picture and statement picture this programme adds. | `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:659-680` (`list_objects_v2` at `:667`), called at `:926` and `:959`; S12-F01 ("Not verified against R2"), S08-F02, S07b-V01 (critical); local counts by `find` under `WCP/Projects`, 01-Oct-2026; R2 state is an open item in R3 C.6 | DR-06; W0-07 is prepared and dry-run, then Adam applies it; Adam checks what R2 holds before he applies it (R3 C.6); no package writes new content under project subfolders until then (K3 R8) |
| T2 | **The first deploy breaks open sessions or evicts every model cache.** One service-worker token names the shell, thumbs, data and models caches. The registrar reloads open pages without checking for unsaved sheets. After W0-02, a cached `LoadingSequence.js` with old paths can run next to a new `index.html`. | WCP logic `:229`; K2 section 9 step 4; DR-07 | DR-07; W0-08 lands the cache split and the unsaved-work hold before the first deploy; no package bumps the token; Adam bumps at deploy |
| T3 | **Copying TV's transport would open Vale data.** TV's worker checks only a prefix and authorises nothing, and both workers bind the same bucket. A TV key builder in VV would write under `NaProjectPortal/`. | S08-F17, S12-F38, S07b-F50; bucket lines `wrangler.toml:35` and `wrangler.jsonc:25` | DR-27 facade with VV bodies (W0-12); gate G6; PD-03 |
| T4 | **Whole-file ports silently delete VV behaviour.** At risk:<br>- 18 VV-only exports in 12 shared files;<br>- seven DIV-1 seams in SnapshotRenderer;<br>- four folder-50 integrations TV never wired;<br>- VV-ahead dimension split, StyleRows and per-drawing style toggles. | S01-F41, S04a-F07, S02b-V01, S11-V03 | R0.3; PORT NOTE Divergences (K2 H5); gate G4; per-host grep acceptance; W0-05 port-order map |
| T5 | **Hubs fail to load until everything they import exists.** The SheetTools hub statically needs 12 TV-only systems. A barrel name landed ahead of its unit stops the whole editor. Two further traps: the TONE import, and ObjectSnap Sources importing VectorTools Curves. | S05a-F30, S05a-V02, S04b-F63, S05b-F08 (critical); W0-15 risk | DR-05; inert leaf landings checked by G2; hub split into W3-01 and W3-03 |
| T6 | **Saved Vale sheets meet new schemas.** SheetRecords is 24 versions behind; the layer-stack restack must run before the paint order; VV's NormaliseMarginNotes drops region and leaderless keys. | S03b-F01, S03b-F03, S06b-F23 (critical) | W1-19 (restack), then W1-28 and W2-32; test on a copy of `2026/3047__Doous` |
| T7 | **Live specification faults stay open until Wave 2.** VV's spec Sync overwrites on-disk edits and restores drafts unasked; Reload Local marks the file as the cloud copy. | S06b-F01 (critical), S06b-F03 | W2-30 fixes them. It depends only on W1-99, so it could move to W1 (open issue) |
| T8 | **Untried TV behaviour reaches Vale authors.** Most of the 88 releases close "NOT tried by Adam". 68 TV module files mention his sign-off. Four gestures change habits Vale authors already have. | DR-01 evidence; DR-40 | DR-01 (c): name every unconfirmed release; one acceptance checklist; gestures held by guards in W3-03 and switched on by W3-04 after Adam's yes |
| T9 | **Noble Architecture identity leaks into Vale output.** QR Symbol and Sheet Images Setup fail open to NA addresses. TV loads PDF.js from PlanVision's NA path. NA content sits in statements, scrapbooks and the title block. | S07a-V02, S07a-F58, K3 section 12, DR-43 | NA-only features off until Vale content exists; Vale values in config; W0-16 vendors PDF.js; gate G4 NA-marker lint |
| T10 | **TV defects get copied.** Examples: the LF-only statement tokeniser on CRLF checkouts, the amber register warning, hatch on new shapes, faulty event and key lists. | S07b-F10 (critical); DR-37 | DR-37: fix in TV first (WT lane) or carry a VV-side seam; K2 rule E3 |
| T11 | **Parallel agents collide on shared files.** 93 files are written by more than one package. Parallel sessions also bump the VV devlog. | `hot_file_ownership.json` | DR-05 one owner per file; the serial orders in `hot_file_ownership.json`; scribe-only records (K3 R5) |

#### R0.1.8 End state under the K1 defaults versus an identical editor

Adam asked for an identical Drawing Layout Editor. The K1 defaults stop short of that wherever acting would put untried behaviour, NA-only content or a live-data change in front of Vale users (R0.2, "How defaults work").

A programme run on the defaults alone therefore ends, after W6-04, with the differences below, and every package that waits for an answer is still held.

- Each row names the answer or action that removes the difference.
- E8 and E9 are permanent by design. So are the structural divergences of R0.3.1, which show on screen only through E8.
- Section D (R4) has the case-by-case detail.

| # | What a Vale user sees under the defaults | What TrueVision shows | What removes it | Permanent by design? |
|---|---|---|---|---|
| E1 | Four tabs: 3D Model, Drawings, Specification, Document Register. Design Statements is built (W4-12, W4-13) but switched off (`LayoutEditor__Statement__Enabled = false`) | Five tabs, Design Statements included, even on a project with no statement (R4 D.2.1 #1) | DR-10 answered (a) with the switch on | No |
| E2 | On a project whose Layout Mode is off: no tab strip, so no header fold (R4 D.1.5 case 8) | No such switch: the strip shows whenever the editor is enabled and a sheet exists (`TVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js:316`) | Adam re-decides DR-25 at the publishing port (W4-09) and answers 'retire', as K1 recommends; W5-07 then removes the switch (R6 F.8 C33) | No (R0.3.6) |
| E3 | No QR code in the title block's end cell and no Project Portal block (`ProjectQr__Enabled` and `LayoutEditor__TitleBlock__QrCellEnabled` false) | A QR code to NA's `/q/` resolver in the title block and in the Portal block | DR-12: a Vale resolver (W5-05, hard-gated), then both switches on. The Portal wording is DR-43 | No |
| E4 | A two-part Document ID, `{project}_{drawing}`, in the title block, the register, PDF names and published folders | Three parts, `{project}_{phase}_{drawing}`, with NA's phases T01-T04 | DR-11: Adam supplies Vale's phase list (a config change, needed before the first publish) | The format converges; the phase names stay Vale's (PD-15) |
| E5 | Four gestures held: auto-Move after a select, Ctrl-drag copy, viewport carry and the move anchor (guard constants from W3-03) | All four live | DR-40 items 7-10 answered yes; W3-04 removes the guards | No |
| E6 | No site-plan drawings: the Drawing Type row is hidden and the site-plan code (LE/21, the composites panel, the legend) is dormant | Location and block plans at 1:100 to 1:5000 | DR-08 (A) with a Vale site-data pipeline (W5-06, hard-gated, XL) | No |
| E7 | No design phases: no Model Source choice per viewport and no Design Phase menu. TV hides the same UI on one-model projects, so the two match on any single-model project | Phase UI on projects with existing and proposed models | DR-09 (d): real phases, which needs Vale multi-model projects | No |
| E8 | Cold first open of a session: an opaque cover under the strip from the first frame, reading "Your Drawings Are Loading" with VV's two pre-load lines, while the editor downloads. A cold Specification, Register or Statements press shows a short cover. A failed load shows VV's full-screen error state | The in-host veil only after 550 ms, and only if still drawing; nothing on a document tab; no load-failure state, because the editor loads at start-up | Only DR-24 (b), dropping the lazy loader, which K1 does not recommend. The cover's words on a document tab are Q-COVER | **Yes** (DR-24, PD-05) |
| E9 | Vale brand content: Vale logo, title and palette name; the header title hidden at 600 px and narrower; an empty Standard Scrapbook and an unseeded Custom Scrapbook; no Project Hub section; Vale's Classic scan; a Vale spell-check dictionary | Noble Architecture's equivalents | Vale content for each NA-only item (DR-43, DR-20) | **Yes** for brand values (PD-13, PD-15). The scrapbooks and the statement section fill only when Adam supplies Vale content |
| E10 | Authoring extras VV keeps: the Styles/Exclusions rows, the Ground Floor Plan quick action and the thumbnail bake in the plan and elevation Dev menus. Section-mode elevations are filed under "Cross Sections" (D28) | None of these rows; every elevation under "Elevations" | DR-36 (b) approving WT-06 and WT-09 (TV takes VV's rows). D28 retires when TV's 48 passes 0.1.0 (DR-26) | Until TrueVision adopts them (R0.3.5, R0.3.6) |
| E11 | App chrome where VV is ahead: a styled confirm dialog, toasts at 96 px, and the 3D canvas and export safe frame clearing the strip | `window.confirm`, toasts at 40 px, the canvas under the strip (R4 D.2.1 #25, #26, #29) | DR-36 (b) approving WT-05 and WT-07 (TV takes VV's) | Until TrueVision adopts them (PD-10, R0.3.5) |
| E12 | The register PDF boxes a "yellow" warning as amber (a W4-18 seam) | No box for a "yellow" warning: a TV defect (`TVM/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js:644` boxes only red and amber) | DR-36 (b) with WT-08 fixing TV; VV then drops its seam | Until TrueVision is fixed (DR-37) |
| E13 | Until Adam applies the sync fix (W0-07, DR-06) and deploys worker 1.6.0 (W0-10), no package writes sheet pictures or published files to R2. So the public site keeps VV's live viewer, which draws sheets on the reader's device (DR-22 default) | A published-only viewer | Adam's live actions (P9) | No |

### R0.2 Decision Register

All 44 canonical decisions from K1 are listed below. The source is `parity/data/decision_register.json`; the reasoning, options, conflicts and evidence are in `parity/report/K1__DecisionRegister.md` section 2.

**How defaults work (K1).**

- The default follows the recommendation, except where acting would:
  - edit TrueVision;
  - change shared Vale infrastructure (the Whitecardopedia service worker, registrar or sync pipeline);
  - deploy anything;
  - delete, migrate or re-bake live data;
  - put NA content, or a gesture change Adam has not confirmed, in front of Vale users.
- In those cases the default is the safe status quo. The gated work is prepared but not applied.
- Package ids in the Recommendation and Default columns have been translated from K1's raw ids to K3 canonical ids through `wp_raw_map.json`.
- The Blocks column, all from K3 `gated_by` and `hard_gate`, shows:
  - the scope of the decision;
  - the first coding package that reads it (the records packages W0-01 and W0-06 and the scribes are not counted);
  - the number of packages it gates, by wave;
  - any packages that must wait for Adam's answer.

#### R0.2.1 Answer these first

**Tier 1: these block Wave 0 (K1 urgency "before Wave 0").** Wave 0 itself depends only on DR-02 to DR-07. DR-01 gates Wave 1 onward but goes first because it frames everything (K3 W0-01 note).

| Order | DR | Why it must come first | If unanswered |
|---|---|---|---|
| 1 | **DR-01** Port gate | Decides whether the 01-Oct request is Adam's sign-off for the 88 untried TV releases. It gates 122 packages in W1-W6, and W3-04 is hard-gated on it. | (c): port everything in dependency order, flag unconfirmed releases, hold the four gestures |
| 2 | **DR-02** Renumber | W0-02 is the first coding package and every other Wave 0 package depends on it. Answer (b) cancels it, and every 40-49 port then carries path translation (K2 section 12). | (a): renumber first and alone |
| 3 | **DR-03** Legacy 40 and the VV-only numbers | Sets the W0-02 script's target for legacy 40 (`--legacy 39` if overridden) and the registry. W6-03 is hard-gated on it. | 91 and 05; registry (i); 62 unchanged |
| 4 | **DR-04** Three renames inside the renumber | Script switches `--no-renderpreset`, `--no-distanceculling` and `--no-snapshothistory`. | All three in VV, no TV or WCP edit |
| 5 | **DR-05** Swarm rules | One owner per file, leaves first, hubs atomic and last. Used by W0-04, W0-05 and every hub package. | (a) |
| 6 | **DR-06** Sync purge fix | Hard gate on W0-07. No new R2 subfolder content until Adam applies the fix. | Fix prepared and dry-run only |
| 7 | **DR-07** Shared service-worker policy | Hard gates on W0-08 and W6-02. Governs the deploy of W0-02 itself. | Nobody edits or bumps the worker; Adam bumps at deploy |
| 8 | **Q-VER** Devlog version step (not a DR) | Adam's written rule says patch bumps for `ValeVision__DEVLOG__.md` and file headers (`devlog-entries-use-patch-bumps.md`, 21-Aug-2026). The rule lives in the SketchUp Plugins project memory, which ValeVision sessions may not load.<br>Practice since 21-Aug has been mixed:<br>- minor steps from v2.15.0 (02-Sep) to v2.21.0 (10-Sep); v2.16.0-v2.21.0 are the port phases;<br>- patch steps v2.21.1-v2.21.21 (10-11 Sep, `VV/ValeVision__DEVLOG__.md:4763` to `:3942`);<br>- then minor steps from v2.22.0 (12-Sep, `:3862`) to v2.71.0 (`:4`), with `.1` for 13 follow-up fixes (v2.22.1 to v2.66.1).<br>So the recent practice is minor, and DR-34 and S11 B10 assume minor releases from v2.72.0. W0-01 records the answer and the scribes follow it (K3 section 14). | Not set by K1 or K3. Suggested: patch bumps from v2.71.1, because the written rule is the only explicit instruction on record. If Adam prefers the recent practice: minor bumps from v2.72.0 (R6 F.8 C6). |

**Tier 2: Wave 0 packages read these but run on the K1 default if unanswered.** Answering them before the transport and config packages start avoids rework.

| DR | Read by (Wave 0) | Default if unanswered |
|---|---|---|
| DR-27, DR-28, DR-29, DR-30 (transport, routes, storage layout, save guard) | W0-07 to W0-14, W0-18, W0-19. W0-10 (worker deploy) is hard-gated | Facade (A); one project-files route family; TV folder names inside VV's prefix; guard behind a flag, R2 judging off |
| DR-33 (hotkey files) | W0-03 | All three key files renamed; KeyScope; DocumentKeys now |
| DR-10, DR-21, DR-43 (Statement switch, fonts, NA content) | W0-15 (config foundation), W0-16 | Statement Writer built last and switched off; PdfFonts pointing at the AD04 TTFs; NA-only features off |
| DR-13, DR-20, DR-22, DR-37 (sheet images, spell check, publishing, TV defects) | W0-18, W0-19 (Flask blueprints) | As recommended; TV defects carried as VV-side seams |
| DR-24, DR-26, DR-34, DR-35, DR-36 (loader, sections, versions, ledger, TV edits) | W0-04, W0-06 (gates, ledger restructure) | Loader kept; 41 name kept; TV module versions adopted; ledger restructured in place; no TV edits |
| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root); each package names its question (R6 F.8 C35) | Unowned numbers become TV growth; 63 stays VV-reserved and nothing moves while TV's branch is unmerged; backups go to a folder outside the repository, keep 30 |

#### R0.2.2 Process and gates (the port gate first)

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-01** | Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | (c) Port everything in dependency order; flag unconfirmed TV releases in each VV devlog entry; one acceptance checklist; hold the four gesture changes. | (c), gesture changes held. | Every TV-only feature port (47, 48, 49, folder 50 to HEAD, LE 26-33, 37, 51-54, 57-59, 65/66, 54/55). First needed by **W1-01**; gates 124 packages (W0 2, W1 38, W2 42, W3 17, W4 18, W5 6, W6 1); hard gate: W3-04. | before Wave 0 |
| **DR-05** | Swarm integration rules: one owner per file, whole-file ports with re-applied seams, leaves first and hubs last, no throwaway stubs | (a) Whole-file owners win, one owner per file, hubs atomic and last, leaves first, no throwaway stubs or VV-only intermediates. | (a). | Every hot file and shared test; hubs atomic and last. First needed by **W0-05**; gates 43 packages (W0 3, W1 7, W2 17, W3 10, W4 3, W5 1, W6 1, WT 1). | before Wave 0 |

#### R0.2.3 Structure and naming

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-02** | Renumber VV's drawing folders to TV's numbers, first and alone (and what 'its own file structure' means) | (a) Renumber VV 42-47 to TV 40-46 first, alone, one agent (W0-02); read 'own file structure' as storage layout. | (a) as Wave 0's first package. | The renumber of VV 42-47 to TV 40-46; every port into 40-49. First needed by **W0-02**; gates 9 packages (W0 3, W1 1, W2 5). | before Wave 0 |
| **DR-03** | Where VV's legacy drawing tools and VV-only folders go: 40 2dElevationsView, 35 PageLayoutSystem, the VV-only number registry, 62 EmailWorkers | Legacy 40 -> 91, 2dProfileLines -> 05__RenderPipeline, 35 stays; retire both later; reserve VV-only numbers in a registry; 62 stays. | Same. | Slot 40 (legacy tool to 91), 2dProfileLines to 05, folder registry, 62 EmailWorkers. First needed by **W0-02**; gates 6 packages (W0 5, W6 1); hard gate: W6-03. | before Wave 0 |
| **DR-04** | Three name and path alignments made inside the renumber package: ComposerPreset -> RenderPreset, DistanceCulling to TV's path, SnapshotHistory to TV's file name | All three in VV inside W0-02: ComposerPreset -> RenderPreset (body kept), DistanceCulling -> 05/, SnapshotHistory -> TV's name. | Same; no TV or WCP edit. | RenderPreset, DistanceCulling and SnapshotHistory names/paths. First needed by **W0-02**; gates 3 packages (W0 3). | before Wave 0 |
| **DR-26** | Cross sections: VV's 41 folder name, TV's 48 placeholder and its DOM ids, and section filing (D28) | Keep 41 name; port TV 48 placeholder after renaming VV's own gate ids; keep D28 filing until TV 48 > 0.1.0. | Same. | 41 folder name, TV 48 placeholder, VV gate ids, D28 filing. First needed by **W2-02**; gates 4 packages (W0 1, W2 3). | before the wave that needs it |
| **DR-33** | Hotkey files and key scope: TV's per-tab file names and KeyScope in VV | Rename all three key files (VV 3D schema kept); scope 3D keys with KeyScope; DocumentKeys now. | Same. | Hotkey file names, KeyScope, DocumentKeys. First needed by **W0-03**; gates 7 packages (W0 2, W1 3, W2 1, W3 1). | before the wave that needs it |

#### R0.2.4 Transport, storage and shared Vale infrastructure

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-06** | Fix the Whitecardopedia sync purge (live R2 data loss) and make the sync preserve editor-owned keys | (a) Top-level-only paginated purge + one editor-owned key list, approved and run by Adam before any new R2 content. | Fix prepared and dry-run only; no new pictures to R2 subfolders until applied. | Every new R2 write under VaApps/Projects/{folderId}/ subfolders. First needed by **W0-07**; gates 12 packages (W0 5, W3 3, W4 2, W5 2); hard gate: W0-07. | before Wave 0 |
| **DR-07** | Shared Whitecardopedia service worker: token policy, cache split, and the reload guard for unsaved sheets | (a) Split models/thumbs token, registrar holds reload on unsaved work (neutral flag), then one shell bump per deploy wave; no package bumps. | No package edits or bumps the worker; Adam bumps at deploy. | Every deploy of swarm output; WCP registrar and SW logic. First needed by **W0-08**; gates 10 packages (W0 3, W1 1, W2 1, W3 2, W5 1, W6 1, WT 1); hard gate: W0-08, W6-02. | before Wave 0 |
| **DR-27** | How ported TV modules reach VV's own worker and Flask: one same-name facade at TV's paths, owned by S12 | (A) One same-name facade at TV's paths, owned by S12; spec lockstep may go first on R2Notes. | (A). | VV facade at TV paths (80/ApiClient, LocalProjectMirror, ProjectLoader helpers). First needed by **W0-08**; gates 15 packages (W0 9, W1 2, W2 2, W4 2). | before the wave that needs it |
| **DR-28** | VV server APIs: worker route shape, upload mode, build-manifest bumps, delete convention and local-server recognition | One guarded project-files worker family, raw uploads, no manifest bump for editor files, quarantine deletes, /api/health. | Same; only Adam deploys. | WCP worker 1.6.0 routes, uploads, manifest bumps, Flask deletes, /api/health. First needed by **W0-08**; gates 7 packages (W0 7); hard gate: W0-10. | before the wave that needs it |
| **DR-29** | Storage layout for new VV content: TV's relative folder names inside VV's own prefix, and what gets committed | (A) TV's relative folder names inside VV's prefix; commit JSON; Adam decides rasters/PDFs. | (A); JSON only. | New content folders under VaApps/Projects/{folderId}/; .gitignore. First needed by **W0-08**; gates 17 packages (W0 8, W1 1, W2 1, W3 3, W4 3, W5 1). | before the wave that needs it |
| **DR-30** | Save guards and the localhost overlay of editor-owned keys | Guard (B) flag-gated, overlay (B), notes route (b). | Same, R2 judging flag off. | Save guard, localhost overlay of editor-owned keys, notes route. First needed by **W0-07**; gates 7 packages (W0 5, W1 2). | before the wave that needs it |

Note: K3 ruling (section 11): DR-27's optional interim, putting the specification lockstep on R2Notes first, is not used. The lockstep goes straight onto the facade in W2-30, and R2DrawingNotes retires in W2-33 (K2 FR-18).

#### R0.2.5 Feature scope

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-08** | Site plans in ValeVision: port the client code dormant, port fully with a Vale data pipeline, or exclude | (B) Port the client code dormant and verbatim; Drawing Type row hidden by config; (A) when Vale wants location/block plans. | (B). | LE/21 SitePlanData, site-plan painter, panels, hatch packs. First needed by **W1-13**; gates 13 packages (W1 4, W2 4, W3 2, W4 1, W5 1, WT 1); hard gate: W5-06. | before the wave that needs it |
| **DR-09** | Design phases (Model Source, PhaseLibrary) in a single-model ValeVision | (a) Dormant verbatim PhaseLibrary/ModelSource, TV signatures now with null slots; no Design Phase UI, no modelGroups. | (a). | 26 PhaseLibrary, LE/20 ModelSource, viewport render signatures. First needed by **W1-01**; gates 9 packages (W1 2, W2 5, W3 2). | before the wave that needs it |
| **DR-10** | Statement Writer (Design Statements tab) for Vale: in scope, how it is gated, and when | In scope as an identical port with Vale words and VV transport, behind LayoutEditor__Statement__Enabled, scheduled last. | Built last with the switch OFF; Lockstep leaf now. | LE/52 StatementWriter, Design Statements tab, 27 renderer. First needed by **W0-15**; gates 15 packages (W0 2, W2 1, W4 10, WT 2); hard gate: W4-12, W4-13. | before the wave that needs it |
| **DR-11** | Drawing Register and TV's three-part Document ID for Vale drawings | A: register + Document ID; {project} = numeric projectCode via a VV accessor; Vale phases from Adam, fixed before the first publish. | A's code with format {project}_{drawing} until Vale phases arrive. | LE/51 DrawingRegister, Document ID, PDF and publish names. First needed by **W1-12**; gates 14 packages (W1 5, W3 2, W4 6, WT 1). | before the wave that needs it |
| **DR-12** | Project QR code, the title-block QR cell and the 'Project Portal' block for Vale | (A) Port switched off; later a GitHub Pages q/ resolver keyed by a permanent qrKey that survives renames. | (A). | LE/53 ProjectQrCode, title-block QR cell, Portal block. First needed by **W1-15**; gates 8 packages (W1 5, W2 1, W3 1, W5 1); hard gate: W5-05. | before the wave that needs it |
| **DR-13** | Sheet Images (pictures placed on sheets) in ValeVision | (a) Port with VV storage and transport; TV's bronze frame; lands with the SheetTools hub. | (a). | LE/54 SheetImages, hub picture hooks, sheet-image routes. First needed by **W0-18**; gates 7 packages (W0 1, W1 1, W3 4, W5 1). | before the wave that needs it |
| **DR-14** | Floor Areas (measured rooms and area schedules) in ValeVision | (A) Port: core inert before the hub, UI after; TV's group list. | (A). | LE/59 FloorAreas, Area Schedule, hub wiring. First needed by **W1-19**; gates 9 packages (W1 5, W3 3, W5 1). | before the wave that needs it |
| **DR-15** | Elevation Depth Fog in ValeVision, and how VV's composer path renders it | Port to 49 with DIV-1/DIV-2 seams; sheets via the renderFrame route; exports (b) if they must match sheets, else (a). | Port; sheets (a); exports (a). | 49 ElevationDepthFog on drawings, sheets and exports. First needed by **W1-03**; gates 8 packages (W1 3, W2 5). | before the wave that needs it |
| **DR-16** | Plan doors, storeys and Hide swings (TV realign rows AA and AH) | (a) All of it, plus door module 1.8.0. | (a) + 1.8.0. | Door module (25), folder 50 DoorPose/Storeys, LE plan doors. First needed by **W1-02**; gates 9 packages (W1 2, W2 5, W3 2). | before the wave that needs it |
| **DR-17** | Two universal additions: reference layers (the Ref switch) and the 1:200 scale | Port reference layers; add 1:200. | Both yes. | Panel__Layers Ref switch, 1:200 scale. First needed by **W1-19**; gates 4 packages (W1 3, W3 1). | before the wave that needs it |
| **DR-18** | Vector tools and Booleans (LE/37) with TV's keys | (a) Port with TV's 13 key rows, after the drawing-tool leaves. | (a). | LE/37 VectorTools and Booleans, drawing-tab keys. First needed by **W2-27**; gates 7 packages (W2 3, W3 2, W5 1, W6 1). | before the wave that needs it |
| **DR-19** | Hatch packs and the Patterns panel | Follow DR-08: verbatim Patterns panel and both packs under dormant site plans. | Verbatim panel, both packs. | App-root 52 HatchPatternLibrary, Panel__Patterns. First needed by **W1-17**; gates 4 packages (W1 1, W2 1, W3 1, W6 1). | before the wave that needs it |
| **DR-20** | Spell check with a Vale dictionary, and the colour palette's Vale name | Spell check with VV/50__ValeVision__UserConfig dictionary; palette swatches identical, named for Vale. | Same. | 55 SpellCheck (Vale dictionary), 54 ColourPalette name. First needed by **W0-18**; gates 4 packages (W0 1, W1 1, W2 2). | before the wave that needs it |
| **DR-21** | Embed Open Sans in VV's PDFs and text measurement (PdfFonts), and host the font files on a Vale-owned source | (a) Port PdfFonts, Open Sans embedded; (i) Vale-owned font copy. | (a) pointing at the AD04 TTFs VV already loads. | PdfFonts, Open Sans embedding, font host. First needed by **W0-15**; gates 9 packages (W0 1, W1 2, W3 1, W4 5). | before the wave that needs it |
| **DR-22** | Publishing pipeline and TV's published-only web viewer for Vale | (a) Adopt TV's publishing and published-only viewer; TV's local-first write order; register bar entry. | (a) after prerequisites; VV live viewer meanwhile. | 52 PublishedDocuments, 53 PublishedSchema, LE/65, LE/80 viewer. First needed by **W0-19**; gates 10 packages (W0 2, W3 1, W4 6, W5 1). | before the wave that needs it |
| **DR-23** | Share links (66 DocumentSharing) for Vale: link form and project token | App URL ?project={folderId}&open={key}; no resolver host; omit statements/register until they land. | Same, after publishing. | LE/66 DocumentSharing link form. First needed by **W2-01**; gates 4 packages (W2 1, W4 2, W5 1). | before the wave that needs it |

Note: Hard gates: the Statement Writer surface and wiring (W4-12, W4-13) land with `LayoutEditor__Statement__Enabled = false` until Adam answers DR-10. The Vale QR resolver (W5-05) and the site-plan pipeline (W5-06) run only on DR-12 and DR-08 answers that differ from the defaults.

#### R0.2.6 Architecture seams

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-24** | VV's lazy Layout Editor loader (LE/01__Core__Loader): keep, offer to TV, or drop | (a) Keep VV's loader as a permanent seam (TV offer optional); fix the ledger contradiction. | (a). | LE/01__Core__Loader facade and Na__LeLoad__STYLESHEETS. First needed by **W0-04**; gates 11 packages (W0 2, W1 4, W2 1, W4 2, W5 2). | before the wave that needs it |
| **DR-25** | VV's per-project Layout Mode switch | (a) Keep now; retire at the publishing port. | (a). | Layout Mode switch, TabStrip visibility, Loader IsAvailable. First needed by **W1-31**; gates 8 packages (W1 3, W2 1, W4 2, W5 2); hard gate: W5-07. | before the wave that needs it |
| **DR-31** | Projected linework (folder 50): the 3D-matching rules, the bake gate, linework modifiers, and the BuildToken re-bake | Port the 3D-matching rules now; keep the localhost bake gate; adopt modifiers; new BuildToken + Adam's re-bake. | Same; re-bake on Adam's checklist. | Folder 50 to TV HEAD, bake gate, LineworkModifiers, BuildToken re-bake. First needed by **W2-43**; gates 5 packages (W2 5). | before the wave that needs it |
| **DR-32** | Drawing-core seams VV keeps: its plan and elevation mode controllers, North overlays, Video Studio preview, VV-only menu features, Elevation__SeededFrom | Keep VV's mode controllers and VV-only menu seams (offer 3 to TV); take North 1.1.0; hide overlays in VS preview. | Same. | VV plan/elevation mode controllers, North 1.1.0, VV-only menu features. First needed by **W1-01**; gates 10 packages (W1 4, W2 5, WT 1). | before the wave that needs it |
| **DR-41** | Section data schema (TD06): fix TV's positionMm sign and per-scene entry keys to VV's schema | (A) Fix TV to VV's section schema; VV unchanged. | VV unchanged; never port TV 41 Serialize/SceneData. | TV 41 Serialize/SceneData (TV-side fix only). First needed by **W1-05**; gates 5 packages (W1 1, W2 1, WT 3). | can wait |

#### R0.2.7 User interface and behaviour

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-38** | Tab strip 2.0.0 before VV has a Register or Statements, and how VV reorders sheets afterwards | Strip 2.0.0 now with 3 tabs; keep drag-reorder on the Drawings menu until the Register lands. | Same. | TabStrip 2.0.0 and the Drawings menu; sheet reordering. First needed by **W1-31**; gates 4 packages (W1 2, W4 2). | before the wave that needs it |
| **DR-39** | Loading experience: TV's wording, TV's in-host veil with the header fold visible, and a veil for the first drawing after a document tab | TV wording, TV in-host veil with the fold visible, veil for the first drawing after a document tab. | Same. | Loader loading screen, LoadingVeil 1.1.0, Styles__Boot. First needed by **W1-31**; gates 3 packages (W1 2, W5 1). | before the wave that needs it |
| **DR-40** | Behaviour changes Vale authors will notice when VV takes TV's editor | (a) Accept TV behaviour for all ten items. | Items 1-6 adopted; 7-10 held. | Clipboard, snap colours, toolbar, undo reasons, grid defaults, vector quality, four gestures. First needed by **W1-21**; gates 18 packages (W1 4, W2 5, W3 8, W5 1); hard gate: W3-04. | before the wave that needs it |
| **DR-44** | UI outside the drawing editor: chrome details and 3D-tab extras | Mostly TV back-ports (safe frame, toast 96 px, confirm dialog); keep phone titles and VV full screen; skip 27/75. | VV unchanged. | Toast/canvas CSS, confirm dialog, 60/76 full screen, 3D-tab dev panels. First needed by **W4-11**; gates 4 packages (W4 1, W5 1, WT 2); hard gate: W5-04. | can wait |

Note: DR-40 items 7-10 are held by one-line guard constants that W3-03 lands; W3-04 removes them after Adam says yes (K3 section 11 and the W3-03/W3-04 package text). The fifth acceptance bullet of W0-01 said "W3-04 lands them held (W3-05 switches them on later)", which was wrong because W3-05 switches on the drafting aids; R6 F.8 C1 corrected it to "if unanswered, W3-03 writes the four guards and W3-04 stays held".

#### R0.2.8 Brand and content

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-43** | Vale replacements for NA content: public URLs, the Hub section, Portal and QR wording, title-block text and scan, scrapbook items | Never copy NA content; NA-only features off until Vale content exists; Hub excluded; Vale's own Classic scan. | Same. | NA content: URLs, Hub section, Portal/QR wording, title-block text and scan, scrapbook items. First needed by **W0-04**; gates 17 packages (W0 3, W1 3, W2 2, W3 1, W4 6, W5 1, WT 1). | can wait |

#### R0.2.9 Ledger and versioning

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-34** | Module version numbers after a whole-file port | (a) Adopt TV's module version + Source version PORT NOTE line on whole-file ports. | (a). | Module versions and DEVELOPMENT LOG on whole-file ports. First needed by **W0-04**; gates 14 packages (W0 2, W1 1, W2 6, W3 2, W4 1, W5 1, W6 1). | before the wave that needs it |
| **DR-35** | Shape of the VV parity ledger, and recording this register's answers | (b) Restructure the ledger in place; record each DR answer as a VV D-number. | (b). | VV ledger, devlog and plan records. First needed by **WT-08** (TV lane); gates 10 packages (W0 3, W1 1, W2 1, W3 1, W4 1, W5 1, W6 1, WT 1). | before the wave that needs it |

Note: W0-06 acceptance item 1 quoted S11's pre-verifier release tally ("55/6/14/83/6/7/4/2"). The canonical source is now Section E's `report/tools/r5work/release_rows_final.json`, and R6 F.8 C34 has replaced the item's watermark clause in `wp_canonical.json` with this text: "Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open" (R0.1.1, R0.1.2). The same row lists DIV-3 as closed with DIV-5 (R0.3.1).

#### R0.2.10 TrueVision-side work

| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |
|---|---|---|---|---|---|
| **DR-36** | May the swarm edit TrueVision? | (b) Yes, per-package approval; (a) until then. | (a) VV-only. | Every TrueVision-side package (WT lane). First needed by **WT-01** (TV lane); gates 13 packages (W0 1, WT 12); hard gate: WT-01 to WT-12. | before the wave that needs it |
| **DR-37** | TrueVision defects that verbatim ports would copy into VV | Fix in TV first: CRLF tokeniser, yellow/amber, hatch-on-new-shapes (after intent check), event/key-list faults. | VV-side seams for CRLF and amber; hatch as TV until confirmed. | TV defects a verbatim port would copy (CRLF tokeniser, amber, hatch, events). First needed by **W0-19**; gates 15 packages (W0 1, W2 3, W3 1, W4 7, WT 3). | before the wave that needs it |
| **DR-42** | Seam-minimising back-ports to offer TV, so more TV files port byte-for-byte | Offer all eleven back-ports to TV; Statement Writer prep first. | None; VV carries seams. | Eleven optional TV back-ports. First needed by **W1-19**; gates 18 packages (W1 2, W2 2, W3 2, W4 3, WT 9); hard gate: WT-10, WT-11. | can wait |

#### R0.2.11 Decisions raised by this report (not in K1)

The sections found six questions that no K1 DR covers.

- Each has a default, so none blocks Wave 0.
- The package in the Gates column must not start until the question is answered, or W0-01 has recorded its default.
- Q-AZIMUTH and the second half of Q-COVER were code rulings for the planner, and Section F has made both (R6 F.8 C20, C22, in `wp_canonical.json`). The rest are Adam's.
- Since R6 F.8 C35 each question is named in the packages of its Gates column, and W0-01 records each answer or default as a VV D-number.

| Id | Question | Options | Recommendation | Default if unanswered | Gates | Raised in |
|---|---|---|---|---|---|---|
| **Q-63** | TV's unmerged branch `claude/westfarm-intro-notes-37b804` (commit `4db73420`, 22-Sep-2026; not an ancestor of b2aa9151) adds `02__Src__AppModules/63__System__LocalFileParity/` (Logic, Modal, Registry, Styles, Watcher). It also edits five drawing-system files (`Na__AppUtils__LocalProjectMirror__.js`, TV 40 `Na__DrawView__ProjectData__.js`, LE AutoSave, SpecData Draft and Transport), `Index.html` and the NAAPPS local server. 63 is VV-reserved (`VVM/63__Feature__AppNotificationEmail/`); if the branch merges as 63, K2 N2 forces VV's folder to move. Which way? | (a) Adam renames the folder on the branch to a TV-growth number, e.g. `65__System__LocalFileParity`, before it merges (5 files plus `Index.html`).<br>(b) VV moves to `VVM/93__Feature__AppNotificationEmail/` (3 files; one import at `VVM/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js:25`), travelling with W6-03 | (a) | Nothing moves while the branch is unmerged; the registry keeps 63 VV-reserved. If it merges as 63 first, (b) runs with W6-03 | W0-06 (registry); W6-03 (hard-gated). A merged branch also changes five files pinned at b2aa9151: they need a fresh pin (DR-01) and follow-up hunks (R6 F.8 C3) | R1 A.2.7, A.4 #5; `git show --name-only 4db73420`; `git merge-base --is-ancestor 4db73420 b2aa9151` is false |
| **Q-35ASSETS** | Folder 35 holds Vale title-block material that no package keeps:<br>- the "VizDpt" A3 variant (`VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/`: a PDF and a PNG);<br>- 12 files in `VVM/35__System__PageLayoutSystem/03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (A1-A3 landscape and portrait layouts, each as PDF and PNG).<br>W0-16 copies only jsPDF and the Classic A3 scan. Keep or archive before W6-03 retires 35? | (a) Copy them beside the Classic scan in `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`.<br>(b) Leave them to git history | (a): 14 files keep Vale's own title-block artwork in the tree after 35 is burnt | Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them (W6-03's hard gate carries it since R6 F.8 C31) | W6-03 (hard-gated); W0-16 if answered (a) early | R1 A.2.6, A.4 #2 |
| **Q-REG** | K2's registry (K2 N3) gives 08, 09, 12-14 and 16-19 no owner, so W0-04's "unregistered folder number" lint has gaps | (a) TV growth: VV never takes them (R1 A.2.7).<br>(b) Another split Adam names | (a) | (a): W0-06 writes them as TV growth, extending DR-03 registry (i) | W0-06, W0-04 | R1 A.2.7, A.4 #4 |
| **Q-AZIMUTH** | `Na__ElevData__SetAzimuthDeg` is a VV-only export of `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46; defined `:437`, exported `:805`). Its only caller is VV's elevation Dev-menu editor (import `:130`, call `:402`), which W2-05 replaces with TV 2.1.0. TV has no such name. Keep or retire? | (a) Keep it as a FacePick seam.<br>(b) Retire it with W2-05 | (b), with one condition. W1-10 takes TV's data module 1.1.0 whole in Wave 1, while VV's old editor still imports `SetAzimuthDeg` and `SetSeededFrom` (`:130-131`) until W2-05 in Wave 2. So W1-10 keeps both setters exported, and W2-05 removes both: TV's 2.1.0 face pick writes the azimuth itself (`TVM/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js:730-739`), and DR-32 retires `SetSeededFrom` | As recommended (planner's ruling; nothing user-visible). Settled: R6 F.8 C20 applied it to W1-10 and W2-05 | W1-10, W2-05 | R2 B.3.4, B.5 #4 |
| **Q-COVER** | (1) What VV's boot cover says on a cold document-tab press (Specification, later Register or Statements, pressed from the 3D view before the editor has loaded). TV never shows a cover there, because its editor loads at start-up.<br>(2) How the `immediate` option reaches `Na__LeVeil__FirstOpen`, since TV's `Enter(sheetId)` takes no option | (1) The drawing cover's headline with VV's two pre-load status lines and no drawing job, or other words Adam names.<br>(2) The loader passes an option through the facade, or LoadingVeil checks the loader's cover (`#naLayoutEditorLoading` visible) itself | (1) The first, confirmed by eye (R4 D.4 check 15).<br>(2) Either, recorded as a VV seam in W1-33's PORT NOTE; the veil must show synchronously inside Enter | (1) As recommended.<br>(2) Settled by R6 F.8 C22: LoadingScreen exports `Na__LeLoadScreen__IsShown()` (true while the loader's cover is up) and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to `Na__LeVeil__FirstOpen` at TV's call site, so `Enter(sheetId)` keeps TV's signature; recorded in the three PORT NOTEs | W1-33 | R4 D.5 #5, #6 |
| **Q-BACKUP** | Where the Flask save guard keeps project backups (W0-09). DR-30 says only "outside D:/10_CoreLib__ValeCodebase", and its default leaves "the backup location in config for you to confirm" | (a) A folder outside the repository, keep 30.<br>(b) Another location Adam names | (a), mirroring TV's convention with Vale names. TV uses `NAAPPS/ProjectVision__LocalServer__Main__.py:112-117`: the environment variable `TRUEVISION_PROJECT_BACKUP_ROOT`, else `%LOCALAPPDATA%\NobleArchitecture\TrueVision\ProjectDataBackups`, keep 30. Suggested VV name: `%LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups` | W0-09 writes the suggested location into config; Adam confirms it before the first guarded save | W0-09 | K3 W0-09; DR-30 |

### R0.3 Permanent Divergence Register

**The rule.**

- Code identity is TrueVision's; app identity, transport and the engines listed below are ValeVision's (K2 one-sentence rule).
- This register is a **closed list**:
  - a difference between VV and TV that is not listed here is drift, and converges to TV. Listed means: permanent (R0.3.1 to R0.3.4), kept until TrueVision catches up (R0.3.5), or temporary with a named trigger (R0.3.6);
  - a port that removes a listed seam is a regression.
- Every seam is written in the hosting file's PORT NOTE `Divergences` field (K2 H5).
- Section C's seam table (R3 C.4, S1-S23) is the wiring contract for these rows, and every C.4 seam has a row here:
  - S1 PD-03; S2 PD-12, PD-13, PD-15; S3 PD-14; S4 and S20 DIV-2 (PD-02); S5 and S22 PD-05; S6 PD-01;
  - S7 R0.3.6 (Layout Mode); S8 PD-11; S9 PD-07; S10 PD-20; S11 PD-03 and PD-12; S12 PD-04; S13 PD-21;
  - S14 R0.3.6 (`Snapping__.js`); S15 PD-19; S16 PD-12 and PD-20; S17 PD-22; S18 PD-23; S19 PD-24; S21 PD-06; S23 PD-25.
- Section D's structural UI seams (R4 D.3) are PD-05, PD-26, and the R0.3.6 rows for the Layout Mode gate and drag-to-reorder. Its chrome items where VV's values win are in R0.3.5.
- Where a check exists, it is enforced:
  - G4: naming and PORT NOTE lint;
  - G6: no TV transport;
  - a per-host grep in the package's acceptance.

#### R0.3.1 The five structural divergences as they stand on 01-Oct-2026

Source: `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` section 2.2 (`:78-157`) and TD06 (`:189`).

| DIV | Status | Where the difference lives in VV (K2 target paths) | Rule for the swarm | Evidence |
|---|---|---|---|---|
| **DIV-1** Drawing render path (plan `:83-99`): VV draws through the EffectComposer with an ortho RenderPass and fog/AO off; TV bypasses its composer and lays a Sobel overlay quad over a flat render | **Live, permanent** | - `VVM/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`. Today this is `42/Na__DrawView__ComposerPreset__.js`; FR-09 in W0-02 gives it TV's file name and exports, keeps VV's composer body and keeps the private NAMESPACE `Na__DrawPreset`<br>- `VVM/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` (moved by FR-08) and `Na__RenderEffect__LineworkSettings__State.js`<br>- `VVM/05__RenderPipeline/01__Engine__PureEngine/` and `02__Engine__MaxEngine/`<br>- the MaterialPreset dual style-key read<br>- seven seams in `VVM/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` | - The eight exports match TV: ApplyStyles, Enter, Exit, GetCamera, GetExportOverrides, Initialize, IsActive, RenderFrame. RenderFrame gains an optional camera in W0-02.<br>- Never port `TVM/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js`.<br>- TV calls to `Na__DrawProfile__SetEdgeWidth` / `InvalidateSceneCache` map to `Enter({edgeWidthPx})` / a documented no-op.<br>- SnapshotRenderer is hunk-replayed only (W2-15), never taken whole.<br>- VV keeps edge width 1.0; TV's is 0.55. | K1 DR-04; K2 FR-09 and section 7; S02a-F15, S02a-F16, S02a-F17, S04a-F07 |
| **DIV-2** Section engine (plan `:101-115`; TD06 `:189`) | **Live, permanent.** TD06 makes VV's schema the reference. TV deviates in two places (positionMm sign, camelCase per-scene entries); these are fixed in TV only | - `VVM/41__System__CrossSectionView/`: 7 files, 3,697 lines, name kept. K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins; W0-06 creates it (R6 F.8 C14)<br>- `VVM/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`: same path and 13 exports as TV, VV body, NAMESPACE `Na__DrawSection`<br>- block `CrossSection__SceneData` (VV schema)<br>- VV's user-facing Cross Section Tool and its per-project gate | - Never port `TVM/41__System__SectionCutEngine/*`, above all `Serialize` and `SceneData`.<br>- Ported TV callers of `Na__SectionCut__*` go through SectionAdapter.<br>- VV renames its own gate ids to `naCrossSectionToolDev*`, so TV's 48 placeholder ports byte for byte (W2-05).<br>- TD06 fix in TV: WT-02 (DR-41, DR-36).<br>- TV-side gap: TV's `CrossSection__SceneData` is on none of TV's three dev-owned key lists, so TV's own syncs can wipe its section bindings. The fix is WT-12; VV is unaffected. | K1 DR-26, DR-41; K2 rule K2 and section 7; S01-F04, S01-F22, S02a-F20, S02a-F59, S09-F55, S12-F32 |
| **DIV-3** Location of drawing records (plan `:117-133`) | **Closed.** Both apps own the top-level `LayoutEditor__DrawingsData` block (`TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js:179`; VV today `42/...:106`) | VV-only keys inside the block:<br>- `LayoutEditor__DrawingsData__LayoutModeEnabled` (VV `:112`, `:323-331`; TV has none)<br>- `Elevation__SeededFrom` (preserve on read and save; stop writing new values) | - No VV migration.<br>- W1-05 takes TV ProjectData 1.6.0 whole and re-applies LayoutModeEnabled (key, getter, setter, skeleton, normalise).<br>- VV 41 SceneData registers through `Na__DrawData__RegisterSectionBlockProvider`. | DR-25, DR-32; K3 W1-05; S12-F32. DIV-3 is closed, as both ProjectData files show; W0-06 acceptance item 1 says so since R6 F.8 C34 |
| **DIV-4** Persistence transport (plan `:135-148`) | **Live, permanent, and wider after this programme.** VV builds its own facade, worker 1.6.0 and Flask blueprints instead of copying TV's | See PD-03 | Never copy TV's transport (gate G6) | DR-27 to DR-30; PD-03 |
| **DIV-5** Library baseline (plan `:150-157`) | **Closed.** Both have `04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0`, ThreeMeshBvh 0.9.9, Clipper2Js 0.9.0 and ThreeEdgeProjection 0.0.10 (`ls` of both folders, 01-Oct-2026) | Residual:<br>- VV gains TV's `05__Vendor__JsPdf__v4.1.0` and `06__Vendor__Html2Canvas__v1.4.1` (W0-16)<br>- VV-first `07__Vendor__PdfJs__v3.11.174`, because TV loads PDF.js from PlanVision's NA path<br>- VV's index files keep `Vale__Dependencies__*`<br>- legacy `04__Lib__ThirdParty__Three/` retires in W6-03 | Vendor numbers follow TV. Number 07 goes in the registry and is offered to TV (DR-42). | K2 N8, TF-R05 to TF-R08, FR-23; K3 section 12 |

#### R0.3.2 Named adapter seams VV keeps (the closed list)

| PD | What stays different | Why | Where it lives in VV (K2 target paths) | How the swarm keeps it | Evidence |
|---|---|---|---|---|---|
| **PD-01** | DIV-1 render route | Drawings through VV's composer; TV's interface names | As DIV-1 above | Hunk replay in SnapshotRenderer (W2-15); W2-03 adds only TV's fog-source hook; PORT NOTE "diverged (DIV-1)" | DIV-1 row |
| **PD-02** | DIV-2 section engine and schema | VV's live Cross Sections tool; TD06 | As DIV-2 above | Never port TV 41; W0-06 adds `README__CrossSectionView__.md` (R6 F.8 C14) | DIV-2 row |
| **PD-03** | Transport and storage (DIV-4) | VV keeps its own worker, Flask server and R2 prefix. VV's worker requires `X-Editor-Api-Key`; TV's authorises nothing | **Client facade, VV bodies at TV's paths:**<br>- `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (FR-16)<br>- `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (FR-17)<br>- `Na__AppUtils__GetProjectFolderFromUrl` / `GetYearFromUrl` in `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` (W0-11)<br>- `Na__CfApi__GetProjectDisplayName` (VV-only additive export)<br>**VV-only clients:**<br>- `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`, kept for VV dev menus<br>- `VVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js`: same path as TV, VV body, path guard and localhost gate<br>- `R2DrawingNotes` until W2-33<br>**Server side:**<br>- worker `WCP/CloudflareWorker` (`whitecardopedia-editor-api`, 6 route-specific handlers today, plus the guarded project-files family in 1.6.0)<br>- `WCP/server.py` with `WCP/Server__ValeVision<Feature>__Api__.py` blueprints (today one: `WCP/Server__ValeVisionScrapbook__Api__.py`), routes `/api/valevision/<feature>` and headers `X-ValeVision-*`<br>- Flask deletes go to quarantine (`00__Deleted__Quarantine`)<br>- Local-server recognition: `/api/check-localhost` today. W0-09 adds `GET /api/health` (service `whitecardopedia-local-dev`), and each ported module changes one SERVICE constant<br>**R2 keys:**<br>- under `VaApps/Projects/<folderId>/` only<br>- existing object names stay: `project.json`, `ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/`, `LayoutEditor/Snapshots/`, `PresentationMode/Thumbnails/`<br>- new content takes TV's relative names: `05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` | - The project folder is resolved only from the URL token through the master index, never from project.json's folderId (wrong in 54 of 155 files, missing in 10).<br>- The facade feature-detects worker routes.<br>- Gate G6: no `na-truevision-api`, no `NaProjectPortal/`, no TV key builder, no file copied from `TV/80__CloudflareIntegration`.<br>- Worker routes are proven under `wrangler dev`; only Adam deploys them (W0-10).<br>- Section C has the route table. | DR-27 to DR-30; K2 R1-R6, F10, N9; S06a-F02, S06a-F28, S06b-F55, S07b-F50, S07b-F55, S08-F17, S09-F30, S12-F23, S12-F38; `wrangler.jsonc:16,25`; K3 W0-12 |
| **PD-04** | Shared Whitecardopedia PWA | VV is one of several Vale apps under one worker | - `VV/index.html:19` links WCP's manifest<br>- VV never adds TV's `62__Feature__AppInstallability`<br>- the unsaved-work flag is the neutral `window.Na__Pwa__HasUnsavedWork`, never `TrueVision__Pwa__HasUnsavedWork` | Only W0-08 and W6-02 touch `WCP/.../62__Feature__AppInstallability/*`; Adam bumps the token; every Port Record carries a SHARED SERVICE WORKER note (K3 R6) | DR-07; K2 K4, TF-T46; S01-F62 item 5 |
| **PD-05** | Lazy Layout Editor loader | Keeps about 73 modules (1.9 MB) off every start-up | - `VVM/51__System__LayoutEditor/01__Core__Loader/`: `Na__LayoutEditor__Loader__.js`, `Na__LayoutEditor__LoadingScreen__.js`, `Na__LayoutEditor__Styles__Boot__.css`<br>- `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` (tab-code leaf)<br>- `VV/index.html` initialises only the loader for the editor<br>- loader-facing VV-only exports: LoadingVeil `DrawingSettled`; ModeController `IsAvailable`, `IsLayoutModeOn`, `SetLayoutMode`, `WaitForFirstDrawing`<br>- the boot veil's VV-only modifier class `.na-le-veil--boot` in Styles__Boot (W1-33) | - Every TV LE stylesheet joins `Na__LeLoad__STYLESHEETS` (Loader `:125-134`) in TV's CSS-index order.<br>- Tab-strip CSS and the 3D-furniture hiding block live in Styles__Boot.<br>- TV entry points go through the facade with literal `import()` (W1-31).<br>- TV reserves LE/01 for this loader (TV DEVLOG `:11718`).<br>- Fix the ledger contradiction (rows 1122, 1230, 1244) and the PORT NOTE at Loader `:51`. | DR-24; K2 N4, S5; S01-F39, S03a-F22, S03a-F43, S03a-F45, S09-F10, S10-F24; R4 D.3 |
| **PD-06** | VV's plan and elevation mode controllers, and the menu features where VV is ahead | VV 1.2.2 / 1.1.1 route through SectionAdapter, RenderPreset, MaterialPreset and Transitions; TV's 1.1.0 call 41 directly | - `VVM/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js` (today 43)<br>- `VVM/45__System__ElevationViews/Na__Elevation__ModeController__.js` (today 46)<br>Seams re-applied inside TV's 2.x editors and row builders:<br>- Styles/Exclusions rows (D33) in the Advanced fold<br>- the Ground Floor Plan quick action (D11)<br>- thumbnail bake on add, seed and Update (`VVM/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js`)<br>- bake-before-save on Update (D20) | - Keep VV's controllers; W2-03 adds only TV's fog-source hook.<br>- W2-04 and W2-05 re-apply the seams.<br>- Styles/Exclusions, Ground Floor Plan and ThumbnailBake are offered to TV (WT-06, WT-09); bake-before-save is not. | DR-32; S02a-F19, S02a-F24, S02a-F27, S11-F29, S11-F32, S11-V03 |
| **PD-07** | Data path stays on the hostname test; no saving from the live site | VV loads from Flask on localhost and from GitHub Pages live; the editor key reaches the browser only from localhost Flask | - `VVM/03__AppUtils/Na__AppUtils__DevGate__.js:19-27`: DevGate unlocks UI only<br>- `VVM/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js:596-597`: bake gated by `Na__AppUtils__IsRunningOnLocalhost`<br>- the Persistence FolderId line (VV's `NormalizeProjectFolderId`)<br>- the Assets localhost upload gate (re-applied by W0-14) | Never route data-path writes through DevGate; config labels say "Saving needs the local Whitecardopedia server". An unlocked live session cannot sync the specification either | DR-31; S02b-F27, S02b-F28, S03b-F20, S06b-F56, S12-F39 |
| **PD-08** | Project-data load contract and VV-only main-config blocks | VV dispatches `na-layouteditor-drawingsdata-loaded` before the scenes, with `{block, projectCode}`; VV's main config carries the Vale look | - `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`<br>- `VVM/02__AppData/Na__AppConfig__Main.json` blocks `DrawingView__Config` and `ProjectedLinework__Config` | - Never take TV's LoadingSequence whole: W0-13 adds only `sceneConfig` in the detail and `na-app-scene-ready`.<br>- Add main-config blocks only for a landed module. | S09-F18, S09-F32 |
| **PD-09** | VV-only exports, events and dispatchers that TV lacks | VV behaviour that TV never wired, or wired broken | - 18 VV-only export names in 12 shared files (S01-F41)<br>- 21 VV-only events (K2 E2), including `na-layouteditor-loader-changed` and `na-pause-render-loop` / `na-resume-render-loop`, with TV's name added beside them (X3)<br>- VV's SceneTransition dispatch and names<br>- the `na-model-visibility-changed` dispatcher in `VVM/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js`<br>- the folder-50 hooks `Na__PlExport__Apply` (30 ImageExport Controls), `Na__PlOverlay__SyncFrame` (LoadingSequence) and `Na__PlStore__BakeBeforeSave` (42/45 DevMenu editors)<br>- the LE ModeController's scene-broadcast listeners that refresh the Viewport panel (VV 1.15.1; offered to TV in WT-04) | - Re-add after every whole-file port and list in the PORT NOTE.<br>- Never rename a TV export to fit VV.<br>- Grep acceptance on the four folder-50 names in every package touching those hosts.<br>- Never copy TV's broken event variants (K2 E3). | S01-F41, S02b-V01, S03a-F14, S04a-F50, S09-F37, S09-F38; K2 X2, X3, E2, E3 |
| **PD-10** | VV-only resilience modules and the styled confirm dialog | Context loss, load budgets, the save path, and a modal where TV falls back to `window.confirm` | - `VVM/01__AppCore/Na__AppCore__GpuLifecycle__.js` and `Na__AppCore__LoadWatchdog__.js`<br>- `VVM/03__AppUtils/Na__AppUtils__ResilientLoad__.js` and `Na__AppUtils__LoadingOverlay__.js`<br>- the config-load timeout and import-map guard in `VV/index.html`<br>- VV's confirm-dialog markup and CSS | - Every port of `index.html`, LoadingSequence or `03__AppUtils` preserves them.<br>- VV browser tests answer the modal; they never stub `window.confirm`.<br>- The confirm dialog is offered to TV (WT-05). | S09-F51, S09-V01, S07b-F42 |
| **PD-11** | 3D hotkey handler and dictionary schema | VV's 3D keys use their own handler; TV's Manager is outside drawing scope | - `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (twin of TV `10/Na__Hotkeys__Manager.js`); it gains only the KeyScope guard (W1-29)<br>- the file is renamed `VVM/02__AppData/Na__Hotkeys__3dModelTab__.json` (FR-13), but keeps the root key `Na__ValeVision__HotkeysDictionary` and the `ValeVision__*` actions | File names are TV's (W0-03); content and root key stay VV's | DR-33; K2 F4, section 7 |
| **PD-12** | App identity tokens | Two apps, two identities | - banner `VALEVISION3D - ...`<br>- console `[ValeVision3D <System>]`<br>- storage keys that embed the app name: `ValeVision3D__AuthoringUnlocked`, `Na__ValeVision__StatementDraft__<id>`, IndexedDB `ValeVision3D__ProjectedLinework`<br>- model category keys `ValeVision__*`<br>- sibling files `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`<br>- root documents `ValeVision__<KIND>__*.md`<br>- lowercase `index.html`<br>- no `window.TrueVision__*` reads | - Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__`. Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file (PD-15); a hit on W0-04's baseline allow-list prints WARN instead of failing (K3 G4, R6 F.8 C13).<br>- Module names and namespaces stay identical to TV. One header fix is due: `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` should name its NAMESPACE `Na__R2Notes` (K2 H2). | K2 H1, H2, C1, B2, K3, K4, F8, F9; S01-F62, S05a-F48, S05b-F55, S06a-F02, S06b-F49 |
| **PD-13** | Brand values | Vale Garden Houses' look | - `--Vale_*` token values (the names are shared; TV itself uses `--Vale_*`) in `VV/03__Style__AppStylesheets/`<br>- header logo, alt text, title, favicon, touch icons, manifest and theme colour in `VV/index.html`<br>- the header title hidden at 600 px and below (`Na__UiFeature__Styles__AppHeader__.css:159`; TV v2.9.0 records it as deliberate)<br>- SpecDocument takes the project name from the folder id and the logo from config<br>- brand values in the LE AppConfig (keys stay TV's) | Keys TV's, values VV's (K2 V1); never rename `--Vale_*` | S10-F23, S06b-F34, S01-F47; K2 S1, V1 |
| **PD-14** | Title-block assets | Vale's own Classic scan; TV's Classic is an NA placeholder | `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (FR-20 copies Vale's scan, md5 59777a65, out of 35); the logo stand-in text goes into config | Never copy TV's scan; W0-16 copies and never moves | DR-43; K2 FR-20; TV plan TD04 `:187` |
| **PD-15** | NA content never reaches a Vale user; NA-only features land switched off | Noble Architecture identity, URLs and planning content | - QR (LE/53) off: Symbol fails closed; `FALLBACKS.baseUrl` is empty until a Vale resolver exists; `LayoutEditor__TitleBlock__QrCellEnabled` false<br>- the Statement Writer's "TrueVision 3D Project Hub" section is **present but never rendered**. Its module `VVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` lands inert at TV's path with W4-12, because TV's Registry imports it statically (`TVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Registry__.js:140`; `Na__LeStmtStd__DEFINITIONS` at `:155-162` has no filter)<br>- VV's Registry filters DEFINITIONS by config (a VV seam until TV's WT-03 adds the filter, DR-42 (6)), and VV's config excludes `TrueVisionHub`<br>- the Hub file reads the project name through `Na__CfApi__GetProjectDisplayName`, not `window.TrueVision__Pwa__ProjectContext` (TV `:206`)<br>- Standard Scrapbook empty; Custom Scrapbook not seeded<br>- Document ID phases are Vale's, never NA's T01-T04<br>- spell-check dictionary is Vale's (`VV/50__ValeVision__UserConfig/`)<br>- PDF.js from VV vendor 07, never `/na-apps/20__PlanVision__CoreAppCode` | - Gate G4 NA-marker lint: `NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/30__TrueVision__CoreAppCode`, `noble-architecture.com/q/` and `/s/`. Allow-list `cdn.noble-architecture.com/VaApps` and `www.noble-architecture.com/assets`.<br>- W0-04 adds one named G4 exception, for the Hub file above (R6 F.8 C13). That file carries TV's token in its file name, ID and keys, has 19 lines naming TrueVision, and holds NA product copy (e.g. TV `:124`). Without the exception, W4-12 fails its own gate (R2 B.3.7). No other file is excepted.<br>- If Adam wants no NA copy in VV's source at all, DR-43's other Hub options give the section Vale words (a 'ValeVision 3D Project Hub', or the TrueVisionHub id with VV words); keeping the module out of VV altogether is none of DR-43's options and would need a new, recorded Registry seam that drops the Hub import and its DEFINITIONS entry. | DR-10, DR-11, DR-12, DR-20, DR-42, DR-43; K2 V2; R2 B.3.7; K3 W4-12; S06a-F25, S07a-F58, S07a-V02 |
| **PD-16** | VV-only systems and folders | Vale features with no TV twin | See R0.3.3 | Never overwritten by a port; numbers reserved in the registry (W0-06) | DR-03; K2 N2, N3 |
| **PD-17** | Naming twins and reserved numbers | Same role, different implementation | - `41__System__CrossSectionView` against TV `41__System__SectionCutEngine`<br>- `60__Feature__FullScreenMode` against TV `76__System__FullscreenMode`<br>- VV `index.html` against TV `Index.html`<br>- `95__SketchUpSisterTools__ToolsAndUtils` against TV `90__rubyScript__...`<br>- `00__Archive` against TV `00__ArchivedVersions`<br>- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (moves to 92 only on request, FR-22), 63, 64, 69, 71, 91-99<br>- 90 is burnt (TV's retired PageLayoutSystem) | A new VV-only folder takes the lowest free number in 93-99; a new TV folder skips every VV-reserved number | K2 N2, N3, N6, section 7, section 8 |
| **PD-18** | Specification file, key and routes | DIV-4 applied to one sibling file; the document schema (`ProjectSpecification__*`) is identical | `ValeVision__DrawingNotes__.json` beside `project.json`; worker `/api/editor/projects/{folderId}/drawing-notes`; Flask `/api/projects/<folder>/drawing-notes` (kept as aliases) | After W2-30, the difference lives only in the facade; `R2DrawingNotes` retires in W2-33. The specification port needs no worker change | S06b-F06, S06b-F55, S12-F22; K2 FR-18 |
| **PD-19** | ProjectRecord: VV has no Project Admin system | TV reads NA Project Admin documents over `80__CloudflareIntegration`, with a PlanVision address fallback; VV's facts live in its own project data | `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` (VV body). W1-12 moves its read of `clientDrawingName` and `siteAddress` to the project root through the facade's loaded data. Today it looks in the PresentationMode block, which is dormant | Keep VV's body; never import TV's admin reads; record the divergence in the PORT NOTE | S03b-F19, S12-F24; K3 W1-12 |
| **PD-20** | Document code in document names | VV's `?project=` token is a folderId (`2026/3047__Doous`); TV's is a bare code (`TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:81-86`). Used raw, VV would print `2026/3047__Doous_D01`, a folder path inside a document name (S07a-V01) | - `Na__DrawData__GetDocumentCode()`, a VV-only export that W1-12 adds to `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (today 42). It returns the loaded project's `projectCode` through `Na__CfApi__GetLoadedProjectData()`, falling back to the master-index entry<br>- one marked seam in each document-name host: the DrawingNumber default in `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` (W1-19); the number in `VVM/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js`; `Na__LePdf__Filename` in `VVM/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`; `VVM/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js` (W4-18); the Sheet Images folder names (LE/54)<br>- the Statement Writer's `{code}` (R3 C.4 S16, W4-06) | - `Na__DrawData__GetProjectCode()` stays the transport token (`/api/projects/<token>`); only document uses take the accessor.<br>- Each host records its seam in the PORT NOTE Divergences, and every later whole-file port of a host re-applies it.<br>- The host seams retire only if TV adopts the accessor, which is not one of DR-42's eleven offers. | DR-11; R3 C.4 S10, S16; K3 W1-12; S07a-V01 |
| **PD-21** | Thumbnail call shape | VV's renderer takes `(sceneId, projectCode, showToast)` (VV `:229`); TV's callers pass `(sceneId, targetWidthPx)` (`TVM/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js:261`) | `VVM/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js`: `Na__PresentationMode__Thumbnail__CaptureAndUpload` accepts both shapes. A numeric second argument is the width, and the project code is then resolved inside. W0-14 adds this, which also fixes VV's Update All Thumbnails (K3 W0-14) | - Keep both shapes through every later port of the renderer or its callers; PORT NOTE Divergences.<br>- W0-14's node stub test pins `(id)`, `(id, 512)` and `(id, code, toast)`. | DR-27; R3 C.4 S13; K3 W0-14 |
| **PD-22** | Share-link token and base | VV's project token is a folderId that can hold `/`, `_`, `-`, `.` and spaces; TV's links carry a bare code and NA's resolver | `VVM/51__System__LayoutEditor/66__Feature__DocumentSharing/` (new, at TV's path):<br>- `Na__LayoutEditor__Share__Links__.js`: a project-token pattern admitting `/`, `_`, `-`, `.` and the three space-containing folders replaces `Na__LeShareLink__CODE_PATTERN` (`TVM/51__System__LayoutEditor/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Links__.js:119`, `/^[A-Za-z0-9]{2,12}$/`) (W4-07)<br>- `Na__LayoutEditor__Share__Config__.json`: VV's app URL replaces NA's `Link__BaseUrl` `https://www.noble-architecture.com/s/` (TV `:16`) (W4-08)<br>- `Na__LayoutEditor__Share__Button__.js`: a Vale share title replaces the "Noble Architecture" fallback (TV `:320`) (W4-08) | - Document keys and `?open=` stay verbatim. The link form is `?project={folderId}&open={key}`, with no resolver host (DR-23).<br>- Never a bare code while codes collide.<br>- G4 NA-marker lint; PORT NOTE Divergences. | DR-23, DR-43; R3 C.4 S17; K3 W4-07, W4-08 |
| **PD-23** | Published-reader URLs | On localhost VV's Flask answers `index.html` with 200 for a missing file under `/Projects/` (`WCP/server.py:958-977`), which breaks TV's "a 404 is an answer" rule. VV's R2 base also differs | `VVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` (new, at TV's path; W4-17):<br>- the localhost first URL is the facade's `repoUrl` form, `new URL('../Whitecardopedia/Projects/' + folderId + '/06__Layout__PublishedDocuments/...', AppRootUrl)`, whose `/Whitecardopedia/<path>` route answers real JSON 404s (`WCP/server.py:897-907`); `/Projects/...` would reach the catch-all (R6 F.8 C30)<br>- the live URL is built from `ProjectData__AssetUrls__R2BaseUrl` (`VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:145-146`). It never goes through VV's `Na__AppUtils__ResolveAssetUrl`, whose `hasImages_R2` gate (`:464-475`) sends some projects to GitHub Pages; TV's reader calls its own `ResolveAssetUrl` (TV `:54`, `:202`) | - Keep TV's retry rule verbatim: a 404 is never retried (TV `:26`, `:243`).<br>- PORT NOTE Divergences. | DR-22, DR-29; R3 C.4 S18, C.5, C.6; R6 F.8 C30 |
| **PD-24** | Site-plan store identity (dormant) | TV's store reads NA's CDN prefix and TrueVision-named manifest stems | `VVM/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js` (new, at TV's path; dormant; W2-14):<br>- the W0-12 facade names and VV identity replace `Na__SpStore__CDN_BASE` = `https://cdn.noble-architecture.com/NaProjectPortal` (`TVM/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js:118`)<br>- TV's folder names `SitePlan__DrawingData__{Existing,Proposed}/` and project key `SitePlan__DataStores`, inside VV's prefix<br>- manifest stems `TrueVision__SitePlan__` (TV `:124`) read as `ValeVision__SitePlan__`; both names accepted | - Dormant until DR-08 (A) and W5-06; the Drawing Type row stays hidden by config.<br>- G4 and G6 apply; PORT NOTE Divergences. | DR-08, DR-29; R3 C.4 S19; K3 W2-14; S04a-V04 |
| **PD-25** | Rename restamp route | VV's editor loads lazily, so a folder-40 module must not import an editor module; VV's section bindings live in its own 41 | `VVM/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js` (today 42):<br>- imports `Na__LeLoad__PrepareRestamp` and `Na__LeLoad__RestampForScene` from `VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js` (VV `:121`; Loader `:671`, `:681`). TV instead imports `TVM/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js` lazily (TV `:116-138`)<br>- imports `Na__SectSceneData__RenameSceneKey` from VV's own 41 (VV `:120`; TV `:118` imports it from TV 41) | - Never take TV's file whole. W1-06 re-applies TV's StageHolders, StageFloorPlan and StageElevation on this route.<br>- PORT NOTE Divergences. | DR-24, DR-41; R3 C.4 S23; K3 W1-06 |
| **PD-26** | Cascade order of the 54 and 55 stylesheets | VV's loader links the editor sheets at the end of `<head>` (`VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js:276`), after the whole CSS index. TV imports 54 and 55 after its editor sheets (`TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:182`, `:190`, after `:161-174`). So the order flips | `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`: the lines for `VVM/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css` (W1-37) and `VVM/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css` (W2-34) | - Both sheets keep their own namespaces (`.na-colour-palette*`, `.na-spellcheck-*`). The only exposure is an element carrying `.na-spellcheck-field` plus an editor class that sets `white-space`, `outline`, `cursor` or `user-select`.<br>- W2-34 checks every such host field, or VV also links 54 and 55 last from `Na__LeLoad__STYLESHEETS`.<br>- Record the order in both PORT NOTEs. | DR-24; R4 D.3, D.2.1 #14; S10 wiring note 12 |

#### R0.3.3 VV-only systems and modules (keep; never overwrite)

| VV path (target) | Files, lines | What it is | Where it meets the drawing system | Rule | Evidence |
|---|---|---|---|---|---|
| `VVM/31__System__VideoStudio/` | 18 files, 14,367 lines | Video Studio | - `FrameRenderer :112` and `Timeline__Thumbnails :117` import DistanceCulling (rewritten by W0-02)<br>- Authoring overlays hide during preview playback: guard BeginFrame with `!Na__VideoStudio__Preview__IsPlaying()`<br>- The timeline `.na-vs-tl` hides on drawing tabs | Keep | DR-32; S10-V03, S10-F29 |
| `VVM/28__System__GridLineSystem/` | 3 files, 1,075 lines | 3D grid lines | none | Keep; number reserved | K2 TF-T15 |
| `VVM/29__System__FogPlaneSystem/` | 7 files, 1,983 lines | 3D-view fog plane | Not a drawing fog. TV's 49 depth fog lands beside it and never reuses it | Keep | S02b-F03 |
| `VVM/60__Feature__FullScreenMode/` | 4 files, 376 lines | VV full-screen row | Twin of TV 76 | Keep (DR-44 default) | K2 TF-T30 |
| `VVM/61__Feature__ShareProjectLink/` | 8 files, 1,209 lines | Vale client project links | Complements per-document Share (LE/66); not a stand-in for the QR link | Keep; ask Adam before retiring its apparently dead UI | S07a-F35, S08-F44 |
| `VVM/62__Feature__EmailWorkers/` | 27 source files, 4,544 lines (plus 1,857 tracked `node_modules` files) | Email workers | Nominal number clash with TV/WCP 62 AppInstallability | Keep; move to `92__Feature__EmailWorkers` only on request (W6-03), after untracking `node_modules` | DR-03; K2 FR-22 |
| `VVM/63__Feature__AppNotificationEmail/`, `VVM/69__System__SketchUpToValeVision__Utilities/`, `VVM/71__System__ExportRenderLayers/` | 3 files / 547 lines; 3 / 713; 28 / 8,936 | VV-only features | none | Keep | K2 TF-T33, T35, T37 |
| `VVM/64__Feature__BreadcrumbNav/` | 2 files, 347 lines | Whitecardopedia breadcrumb | Both apps' Styles__Main hide it on drawing tabs | Keep | S10-F29 |
| `VVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__ScenePersistence__.js`, `SceneReorder__`, `SceneRowBuilders__` | 3 files | VV's split of the scene editor; TV withdrew it (v2.68.2) | none | Keep; correct the three PORT NOTEs that still ask for a back-port | S01-F65, S11-F33 |
| `VVM/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` (today 42) | 1 file | Drawing thumbnail bake | Re-wired into TV's 2.x editors (add, seed, Bake Missing) | Keep; offered to TV (WT-06) | S01-F40, S02a-F19, S11-F29 |
| `VVM/35__System__PageLayoutSystem/` | 25 files, 35,501 lines | Legacy Create Drawing | The LE config reads its jsPDF and scan until W0-16 copies them | Keep until W6-03, then 35 is burnt | DR-03; K2 FR-19 to FR-21 |
| `VVM/91__System__2dElevationsView/` (today `40__System__2dElevationsView/`) | 7 files after FR-08 moves 2dProfileLines out (8 today, 2,407 lines) | Legacy Elevation View tool | `VV/index.html:1375-1376` import its Controls and ExportOverrides | Moved by W0-02; retired by W6-03 | DR-03; K2 FR-01, FR-25 |
| `VV/install-guide.html`, `VV/95__SketchUpSisterTools__ToolsAndUtils/`, `VV/00__Archive/` | - | App-root extras | no drawing content | Keep | S10-V04; K2 TF-R13, TF-R14 |

#### R0.3.4 Never port into VV

| TrueVision item | Why not | VV keeps or uses instead | Evidence |
|---|---|---|---|
| `TVM/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js` | DIV-1 overlay route | Composer and `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` | S02a-F15 |
| `TVM/41__System__SectionCutEngine/*` (above all `Na__SectionCut__Serialize__.js` and `__SceneData__.js`) | DIV-2; TV's schema deviates from TD06 | `VVM/41__System__CrossSectionView/`, SectionAdapter | DR-41; K2 rule K2 |
| `TV/80__CloudflareIntegration/CloudflareWorker/`; the body of `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`; generic `/r2/read`, `/r2/write`, `/r2/list`, `/r2/delete`; any `NaProjectPortal/` or `30__TrueVision__AppContent` key builder | DIV-4; TV's worker is unauthenticated; the bucket is shared | The VV facade (W0-12) over `whitecardopedia-editor-api` and Flask | DR-27; S08-F17, S12-F38; gate G6 |
| `TVM/62__Feature__AppInstallability/*` (TV's service worker, registrar, manifest) | VV runs under Whitecardopedia's PWA | WCP 62 via W0-08 and W6-02 | DR-07; K2 TF-T46 |
| `TVM/75__System__UserInstructionsSystem/`, `TVM/76__System__FullscreenMode/` | 3D-tab extras outside drawing parity | VV 60 full screen | DR-44 |
| `TVM/01__AppCore/Na__AppFlow__LoadingSequence.js` taken whole; TV `Index.html`'s start-up import of the editor | VV's load contract and lazy loader | Hunks only (W0-13, W0-17); loader facade (W1-31) | S09-F18; DR-24 |
| `TVM/44__System__PlanDimensions/Na__PlanDimensions__Data__.js` and `__Editor__.js` taken whole | VV's ConfigState/EditorPreview split is ahead; TV's split copy is never loaded | VV's 15 files in `VVM/44__System__PlanDimensions/` until TV is rewired (WT-01) | S02b-F08, S11-V03 |
| TV's 2.x plan/elevation editors and row builders, or the ModelToggle, ImageExport or LoadingSequence hosts, taken whole without VV's seams | Would delete PD-06 and PD-09 behaviour | Whole-file take with seams re-applied (W2-04, W2-05) | DR-32; S02b-V01, S11-V03 |
| TV's broken event variants (the dead `na-pm-scene-activated` listener; the missing `na-model-visibility-changed` dispatcher) | VV's versions work | VV's dispatch and names | K2 E3; S09-F37, S09-F38 |
| TV's linework bake gate through DevGate; TD01-style live-site authoring writes | VV's data path stays on the hostname test | PD-07 | DR-31; S12-F39 |
| NA content:<br>- NA logo and letterheads; "Noble Architecture Ltd"<br>- the "TrueVision 3D Project Hub" section in any rendered statement (its module lands inert, PD-15)<br>- the `/q/` and `/s/` resolvers and the Project Portal block<br>- TV's NA Classic scan<br>- NA site-plan furniture and the OS licence block<br>- NA job phases T01-T04<br>- PDF.js from `/na-apps/20__PlanVision__CoreAppCode`<br>- `window.TrueVision__*` globals | Brand and data safety | Vale values through config; NA-only features switched off (PD-15) | DR-11, DR-12, DR-43; K2 V2, K4 |
| TV's own "ValeVision : not yet ported" PORT NOTE lines | VV writes its own PORT NOTE | K2 H5 format | K2 H5 |

#### R0.3.5 Divergence kept on purpose because VV is ahead (until TrueVision catches up)

| Item | VV seam | Retired when | Evidence |
|---|---|---|---|
| Plan-dimension split (ConfigState and EditorPreview single-sourced) | `VVM/44__System__PlanDimensions/` (today 45) | TV adopts it (WT-01, DR-36) | S02b-F08, S11-V03 |
| StyleRows and per-drawing Styles/Exclusions toggles (D33) | `VVM/40__System__DrawingViewCore/Na__DrawView__StyleRows__.js` callers in the 42/45 row builders | TV finishes its half-landed back-port (WT-09) | S11-V03; DR-32 |
| LE Dev menu structure (VV 1.4.0 against TV 1.3.0) | `VVM/51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | TV adopts it; W2-17 adds only TV's live-phase bake filter | S03a-F27, S10-F36 |
| Authenticated, path-guarded statement and publish routes; delete to quarantine | WCP worker and blueprints | Offered to TV as hardening (DR-28, DR-42) | S07b-F50, S07b-F55, S08-F17 |
| Toast offset and the strip clearance of the 3D canvas and the export safe frame | `.na-toast` `bottom: 96px` (`VV/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css:1250`; TV `:1264` has 40px); the canvas `top` (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__RenderCanvas__.css:9`, `:14`) and the safe frame (`VV/03__Style__AppStylesheets/Na__ImageExport__Styles__ViewportOverlays__.css:29`, `:32`) clear the tab strip | TV takes VV's values (WT-07; DR-44, DR-36) | R4 D.2.1 #25, #29, D.3; DR-44 |

#### R0.3.6 Temporary divergences, each with its retirement trigger

| Divergence | Seam | Retired by | Evidence |
|---|---|---|---|
| Per-project Layout Mode switch | `LayoutModeEnabled` in `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js`; ModeController `IsAvailable`/`IsLayoutModeOn`/`SetLayoutMode`; Loader `IsAvailable` | Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then, and W5-07 retires the switch on a 'retire' answer (R6 F.8 C33) | DR-25 |
| Section-mode elevations filed under "Cross Sections" (D28) | `VVM/45__System__ElevationViews/Na__Elevation__SceneLink__.js` (today 46, `:186-187`) | TV's 48 passes 0.1.0 | DR-26; S02a-F36 |
| Drag-to-reorder sheets on the Drawings menu rows | TabStrip 2.0.0 seam (W1-34) | The Drawing Register lands (W4-10) | DR-38 |
| Typed Drawing No. in the Sheet panel; Drawing Type row hidden | `VVM/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js` | Register: W4-10. Drawing Type row: TV takes the config gate (DR-42) | S07a-F18; DR-08 |
| Four gesture changes held (auto-Move, Ctrl-drag copy, viewport carry, move anchor) | One-line guard constants at the hub entry points (W3-03) | Adam's yes, then W3-04 | DR-01, DR-40 |
| Statement Writer switched off | `LayoutEditor__Statement__Enabled = false` | Adam answers DR-10 | DR-10; W4-12, W4-13 |
| Project QR off | `ProjectQr__Enabled` and `LayoutEditor__TitleBlock__QrCellEnabled` false | A Vale resolver exists (W5-05) | DR-12 |
| Site plans and design phases dormant | `VVM/51__System__LayoutEditor/21__System__SitePlanData/`, Model Source, the uninitialised PhaseLibrary | DR-08 answered (A), then W5-06; DR-09 (d) | DR-08, DR-09 |
| Helvetica in the specification PDF; font host | `VVM/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js`; `LayoutEditor__Pdf__FontCdnBase` pointing at the AD04 TTFs | PdfFonts (W1-25); Adam names a Vale-owned font host | DR-21; S06b-F35 |
| Per-document notes client | `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | W2-33 (FR-18) | S12-F22 |
| `Snapping__.js` | `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | Shim in W2-19, deleted in W3-08 (FR-14, FR-15) | S04b-F02 |
| Old hotkey file names | `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`, `VVM/02__AppData/Na__ValeVision__HotkeysDictionary__.json` | W0-03 (FR-12, FR-13) | DR-33 |
| Legacy 35 and 91 folders; 62 number | `VVM/35__System__PageLayoutSystem/`, `VVM/91__System__2dElevationsView/`, `VVM/62__Feature__EmailWorkers/` | W6-03 after Adam confirms; 62 to 92 only on request | DR-03 |
| Bake-before-save on Update (D20) | 42/45 DevMenu editors | VV adopts TV's publish-time bake (DR-22) | DR-32 |
| TV defects carried as VV-side seams (CRLF statement tokeniser, amber register warning) | The ported modules' PORT NOTE Divergences | TV fixed in the WT lane (WT-03 and others) | DR-37 |
| App-token statement draft keys; VV-first PDF.js vendor 07; the DrawingCode leaf | Storage key; `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/`; LE/07 leaf | TV takes the app-neutral names, vendor 07 and the leaf (DR-42; WT-10, WT-11) | K2 B3, TF-R07; DR-42 |
| `Elevation__SeededFrom` | Elevation records | Never deleted; VV stops writing it and preserves it on read and save | DR-32 |
| VV-only elevation setters `Na__ElevData__SetAzimuthDeg` and `Na__ElevData__SetSeededFrom` | `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46), kept exported by W1-10 because VV's old Dev-menu editor still imports them (`VVM/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js:130-131`, today 46) | W2-05 takes TV's 2.1.0 editor and removes both (Q-AZIMUTH) | R2 B.3.4; DR-32 |

#### R0.3.7 Findings once marked "permanent" that the decisions have superseded (do not act on them)

| Finding | It said | Superseded by | What holds now |
|---|---|---|---|
| S03a-F37 | Keep folder-number seams in mode-controller imports, rewrite paths on every port, no renumbering | DR-02 (W0-02) | After W0-02, paths port unchanged |
| S09-F22 | Keep DistanceCulling in `05__RenderPipeline/02__Engine__MaxEngine/` and re-point every import | DR-04 (FR-11 inside W0-02) | `VVM/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js` |
| S06a-F15 | The Model Layers panel's phase rows and site-plan columns stay TV-only | DR-08 (B), DR-09 (a): `Panel__ModelLayers` taken whole in W2-16 | The UI stays hidden on one-model projects, as in TV; no seam |
| S06a-F16 | Sheet panel Drawing Type and Register routing stay TV-only; port only the Enter-blur | DR-11 (Register adopted), DR-08 (B): `Panel__Sheet` 1.4.0 taken whole in W4-10 | One seam: hide the Drawing Type row (R0.3.6) |
| S06a-F19 | The Site Plan Composites panel stays absent | DR-08 (B): lands dormant in W2-14 | Dormant, not absent |
| S06a-F44 | The Site Plan Legend and its link stay absent and are excluded from config | DR-08 (B) and the K3 ruling: landed inert in W2-39, so `Panel__ScrapbookParametric` 1.8.0 is taken whole (W3-14) | Inert, not absent |
| S03a-F20 | Keep VV's loading-veil adaptation | DR-39 (W1-33): TV's in-host veil, wording and LoadingVeil 1.1.0 | Only VV's `DrawingSettled` export and the loader's boot veil (PD-05) stay |
| S06b-F55 (in part) | Confine the specification difference to Transport, Lockstep's two local-file functions and R2DrawingNotes | DR-27 and the K3 ruling: the specification goes onto the facade (W2-30) and R2DrawingNotes retires (W2-33) | The difference lives in the facade only (PD-18) |
| S03b-F20 (in part) | Keep VV's Assets file | W0-14 takes TV Assets 1.0.1 and Persistence 1.2.1 | The VV localhost gate and folder resolution are re-applied as seams (PD-07) |
