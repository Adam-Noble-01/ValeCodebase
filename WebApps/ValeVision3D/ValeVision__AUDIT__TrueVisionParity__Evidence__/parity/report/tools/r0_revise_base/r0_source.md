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
  - running either app;
  - Whitecardopedia and NAAPPS internals beyond the files named.
- **Method:**
  - 18 slice surveys, each checked by an adversarial verifier: 1,077 verified findings, 98 of them added by verifiers;
  - three syntheses: K1 (decisions), K2 (target maps and naming rules) and K3 (work packages);
  - every fact this section cites was re-opened on 01-Oct-2026 (path:line given), or comes from a cited finding.

**How to use this document (for the delegating agent)**

| Question | Answered in |
|---|---|
| What must Adam decide, and what happens if he does not answer? | **R0.2** (DR-01 to DR-44, K1). DR ids gate packages. |
| What must stay different in VV, and where does each difference live? | **R0.3** (PD-01 to PD-19 and the tables after it). The swarm never "fixes" these. |
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
| Work packages | `parity/data/wp_canonical.json` (164 packages, DAG, critical path, tests); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (92 files) | W0-nn ... W6-nn, WT-nn |
| Evidence | `parity/data/findings_verified.json` (1,077 findings), `parity/slices/S*.md`, query helper `python parity/data/q.py` | S01-F04 (survey), S07a-V02 (verifier) |

**Reading rules.**

1. **DR ids gate packages.** Each K3 package lists `gated_by`. When a DR is unanswered, the package runs on that DR's default, unless its `hard_gate` says it must wait. 23 packages are hard-gated:
   - W0-07, W0-08, W0-10;
   - W3-04;
   - W4-12, W4-13;
   - W5-04, W5-05, W5-06;
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

- **The port stopped on 20-Sep-2026.** The newest TV release in VV is v2.85.0. TrueVision has shipped 88 releases since (v2.86.0 to v2.172.0), and none of them reached VV.
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
| Releases | v2.24.0 to v2.172.0 (177 rows classified) | v2.16.0 to v2.71.0 (the drawing-system releases) | 55 ported, 6 partial, 17 pending sign-off, 79 never considered, 6 deliberately not ported, 8 not drawing work, 4 VV-origin, 2 not applicable | S11 B3 (verifier-corrected). The W0-06 acceptance still quotes the pre-verifier tally (55/6/14/83/6/7/4/2); use this one |
| Tests | 102 files in `80__Testing__PrototypeEnvironment` | 30 | W6-01 closes the TV inventory | S11 (a); K3 section 11 |
| Verified findings | - | - | 1,077: 31 critical, 309 high, 472 medium, 265 low | `q.py --format count` |
| Findings by action | - | - | port_verbatim 191, port_adapted 179, update_wiring 154, needs_decision 142, port_whole_reapply_vv 75, keep_vv_divergence 70, no_action 63, build_vv_transport 54, port_test 48, fix_ledger 43, backport_to_tv 30, rename_move 17, retire_vv 7, renumber_folder 4 | `q.py --format count` |
| Decisions | - | - | 363 raw ids merged into 44 DRs: 7 before Wave 0, 33 before the wave that needs them, 4 can wait | K1 section 5 |
| Work | - | - | 221 raw packages merged into 164: 152 VV packages in W0-W6 (about 154,399 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines) | K3 section 1; `wp_canonical.json` |
| Contention | - | - | 92 files are written by more than one package. The worst are the LE ModeController (19 packages), the LE AppConfig (16) and the Loader (15) | `hot_file_ownership.json` |
| Harness baseline (VV) | - | - | ModuleGraph 517 modules, 0 failures; Exports 415 files PASS; 6 of 6 node tests pass | K2 section 9 step 0 |

#### R0.1.2 Where the port was up to (S11, as reconciled by its verifier)

- **High-water mark: TV v2.85.0** (20-Sep-2026), ported as VV v2.68.0. The last TV release ported was v2.83.0, the top-bar fold, which became VV v2.70.0.
- **VV's only later release went the other way.** VV v2.71.0 (28-Sep, per-scene lighting) became TV v2.161.0.
- **Nothing from TV v2.86.0 onward is in VV.** TV shipped those 88 releases between 20 and 29 Sep:
  - 76 of them between 20 and 23 Sep, 43 on 21 Sep alone;
  - 12 on 28-29 Sep.
- **How those 88 are classified:**
  - 77 never considered for VV;
  - 7 parked "on Adam's sign-off";
  - 1 deliberately not ported (v2.88.0);
  - 1 VV-origin (v2.161.0);
  - 2 not drawing work.
- **Low-water mark: TV v2.28.0** (13-Sep, viewport snap move). Between the low-water and high-water marks, 18 releases are open or only partly ported. Examples: v2.37.0 flush joins (signed off by Adam in TV on 14-Sep), v2.42.0 and v2.48.1 plan doors, site plans v2.48.0-v2.49.1, v2.78.0 select-picks-move, v2.82.0 drawing planes.
- **There is no single watermark.** Each feature area has its own low-water release (S11 B1 table):
  - sheet tools: v2.28.0;
  - drawing tools: v2.41.0;
  - viewports: v2.38.0;
  - projected linework: v2.37.0;
  - drawing core: v2.82.0.
- **The VV parity ledger is out of date.** It records none of the 88 later releases, and about 40 of its rows are stale or contradictory (S11 B4).
- **S11's module table cannot be run as written** (S11 verifier, S11-V01, S11-V02):
  - 10 rows marked no_action hide TV changes that VV lacks;
  - 44 of the 62 whole-file rows import TV modules VV does not have.

Section E carries the per-module watermark.

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
| P1 | Adam answers DR-01 to DR-07 (or accepts the K1 defaults in writing) and the devlog version-step question (R0.2.1, Q-VER). W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. | Adam, then W0-01 | K1 section 1; K3 W0-01; DR-35 |
| P2 | Pin the source at TV b2aa9151. Every Port Record says "read at HEAD b2aa9151". A later TV commit needs a fresh pin and a fresh DR-01 answer. | planner | DR-01; K2 H5 example |
| P3 | `git -C D:/10_CoreLib__ValeCodebase status --short -- WebApps/ValeVision3D WebApps/Whitecardopedia` must be empty before W0-02. At 14:15 on 01-Oct-2026 the VV app folder was clean, but Whitecardopedia showed 3 entries that someone has to commit or park first:<br>- `M .../03__AppData/Na__AppData__MasterConfig__Main.json`<br>- `M .../03__AppData/Na__MasterIndex__ProjectLocations__.json`<br>- `?? Projects/2026/64348__Mathison/`<br>The TV app folder was clean. | Adam | K2 section 9 step 0; git status run for this section |
| P4 | The baseline gates are green from the VV root:<br>- `Na__Verify__ModuleGraph__.mjs`: 517 modules, 0 failures<br>- `Na__Verify__Exports__.mjs`: 415 files PASS<br>- `k2_path_gate.py --names ZZZ_NONE`: 0 fail<br>- the 6 VV node tests pass | W0-02 agent | K2 section 9 step 0 |
| P5 | Read the top of `VV/ValeVision__DEVLOG__.md` (v2.71.0 today) and the ledger again before any version is allocated. Parallel sessions bump them. Only the wave's Parity Scribe writes either file (K3 R5). | scribe (Wn-99) | K3 R5, R11 |
| P6 | W0-01 publishes swarm rules R1-R11 and gates G1-G7. W0-04 lands the naming lint, the PORT NOTE verifier and the UI parity gate before Wave 1. | W0-01, W0-04 | K3 section 2 |
| P7 | W0-02 runs alone: no other package may be in flight on VV. It rewrites 94 files, including `index.html`, `Na__AppFlow__LoadingSequence.js`, the CSS index, the LE ModeController, SnapshotRenderer and MarkupBridge. | planner | K2 section 9 |
| P8 | Agents search only `02__Src__AppModules`, `03__Style__AppStylesheets`, `80__Testing__PrototypeEnvironment` or named files, never an app or git root. Both app roots hold stale `.claude/worktrees` copies (VV 2, TV 2), and `62__Feature__EmailWorkers` holds 1,857 tracked `node_modules` files. Edits go to the live app folders, never to a worktree. | every agent | `ls` of both roots, 01-Oct-2026; K2 TF-T32 |
| P9 | Adam's live actions are scheduled:<br>- apply the sync fix (W0-07) before Sheet Images go live (W3-09) and before anything publishes (W4-03, W4-07);<br>- deploy worker 1.6.0 (W0-10) before those features go live;<br>- bump the shared service-worker token at each deploy (W0-08, W6-02);<br>- answer DR-40 items 7-10 for W3-04;<br>- approve each WT package (DR-36). | Adam | K3 hard gates; swarm rules R6-R8 |
| P10 | Confirm which service-worker file the deployed VV site registers before W0-08 edits one. Candidates: the Whitecardopedia logic file (token `'2026-09-18-1'` at `:229`), or the stale tracked `D:/10_CoreLib__ValeCodebase/WebApps/live_sw.js` (token `'2026-09-10-6'` at `:68`, last commit ff8c492a, 10-Sep). | Adam, W0-08 | K2 sections 9 and 12 (K2 cites `:157`; the token is at `:68`) |

#### R0.1.6 Critical path (K3 section 7)

| Wave | Longest chain | Est. lines | Human gate on or beside the chain |
|---|---|---|---|
| W0 | W0-01 -> W0-02 -> W0-07 -> W0-10 -> W0-12 -> W0-13 -> W0-99 | 5,599 | DR-02 to DR-04 (W0-02 script switches); W0-07 is prepared only, and Adam applies it; W0-10 is built under `wrangler dev`, and Adam deploys it |
| W1 | W1-13 -> W1-19 -> W1-20 -> W1-21 -> W1-22 -> W1-25 -> W1-26 -> W1-27 -> W1-28 -> W1-36 -> W1-99 | 12,950 | DR-01 recorded (W1 reads it) |
| W2 | W2-40 -> W2-01 -> W2-03 -> W2-34 -> W2-35 -> W2-16 -> W2-39 -> W2-99 | 13,570 | - |
| W3 | W3-18 -> W3-02 -> W3-03 -> W3-05 -> W3-07 -> W3-09 -> W3-10 -> W3-17 -> W3-14 -> W3-99 | 11,330 | W3-04 (gestures) sits beside the chain, held for Adam's yes; W3-09 needs W0-07 applied before it writes to R2 |
| W4 | W4-04 -> W4-05 -> W4-06 -> W4-07 -> W4-08 -> W4-10 -> W4-12 -> W4-13 -> W4-14 -> W4-99 | 19,460 | W4-12 and W4-13 land switched off (DR-10) |
| W5 | W5-01 -> W5-05 -> W5-99 | 1,320 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12). Without it, the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
| W6 | W6-03 -> W6-01 -> W6-04 | 950 | W6-03 waits for Adam to confirm the user-visible removals (DR-03) |
| **All** | **52 packages** (55 by package count) | **65,179** | Every wave starts only after the previous wave's Parity Scribe pass; Adam commits once per wave (K3 R11) |

The TrueVision lane runs serially outside the wave barrier: WT-01 -> WT-09 -> WT-02 -> WT-12 -> WT-03 -> WT-04 -> WT-05 -> WT-06 -> WT-07 -> WT-10 -> WT-11 -> WT-08 (4,010 lines). It runs only under DR-36 (b).

#### R0.1.7 Top risks

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| T1 | **Live R2 data loss.** The Whitecardopedia sync lists `VaApps/Projects/{folderId}/` recursively: Prefix only, no Delimiter, first 1,000 keys. It deletes every `.png`/`.jpg`/`.jpeg`/`.webp` whose bare name is not a local top-level image. That already threatens the 25 PresentationMode thumbnails and 18 Layout Editor snapshots on R2, and it would delete every sheet picture, published picture and statement picture this programme adds. | `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:659-680` (`list_objects_v2` at `:667`), called at `:926` and `:959`; S12-F01, S08-F02, S07b-V01 (critical) | DR-06; W0-07 is prepared and dry-run, then Adam applies it; no package writes new content under project subfolders until then (K3 R8) |
| T2 | **The first deploy breaks open sessions or evicts every model cache.** One service-worker token names the shell, thumbs, data and models caches. The registrar reloads open pages without checking for unsaved sheets. After W0-02, a cached `LoadingSequence.js` with old paths can run next to a new `index.html`. | WCP logic `:229`; K2 section 9 step 4; DR-07 | DR-07; W0-08 lands the cache split and the unsaved-work hold before the first deploy; no package bumps the token; Adam bumps at deploy |
| T3 | **Copying TV's transport would open Vale data.** TV's worker checks only a prefix and authorises nothing, and both workers bind the same bucket. A TV key builder in VV would write under `NaProjectPortal/`. | S08-F17, S12-F38, S07b-F50; bucket lines `wrangler.toml:35` and `wrangler.jsonc:25` | DR-27 facade with VV bodies (W0-12); gate G6; PD-03 |
| T4 | **Whole-file ports silently delete VV behaviour.** At risk:<br>- 18 VV-only exports in 12 shared files;<br>- seven DIV-1 seams in SnapshotRenderer;<br>- four folder-50 integrations TV never wired;<br>- VV-ahead dimension split, StyleRows and per-drawing style toggles. | S01-F41, S04a-F07, S02b-V01, S11-V03 | R0.3; PORT NOTE Divergences (K2 H5); gate G4; per-host grep acceptance; W0-05 port-order map |
| T5 | **Hubs fail to load until everything they import exists.** The SheetTools hub statically needs 12 TV-only systems. A barrel name landed ahead of its unit stops the whole editor. Two further traps: the TONE import, and ObjectSnap Sources importing VectorTools Curves. | S05a-F30, S05a-V02, S04b-F63, S05b-F08 (critical); W0-15 risk | DR-05; inert leaf landings checked by G2; hub split into W3-01 and W3-03 |
| T6 | **Saved Vale sheets meet new schemas.** SheetRecords is 24 versions behind; the layer-stack restack must run before the paint order; VV's NormaliseMarginNotes drops region and leaderless keys. | S03b-F01, S03b-F03, S06b-F23 (critical) | W1-19 (restack), then W1-28 and W2-32; test on a copy of `2026/3047__Doous` |
| T7 | **Live specification faults stay open until Wave 2.** VV's spec Sync overwrites on-disk edits and restores drafts unasked; Reload Local marks the file as the cloud copy. | S06b-F01 (critical), S06b-F03 | W2-30 fixes them. It depends only on W1-99, so it could move to W1 (open issue) |
| T8 | **Untried TV behaviour reaches Vale authors.** Most of the 88 releases close "NOT tried by Adam". 68 TV module files mention his sign-off. Four gestures change habits Vale authors already have. | DR-01 evidence; DR-40 | DR-01 (c): name every unconfirmed release; one acceptance checklist; gestures held by guards in W3-03 and switched on by W3-04 after Adam's yes |
| T9 | **Noble Architecture identity leaks into Vale output.** QR Symbol and Sheet Images Setup fail open to NA addresses. TV loads PDF.js from PlanVision's NA path. NA content sits in statements, scrapbooks and the title block. | S07a-V02, S07a-F58, K3 section 12, DR-43 | NA-only features off until Vale content exists; Vale values in config; W0-16 vendors PDF.js; gate G4 NA-marker lint |
| T10 | **TV defects get copied.** Examples: the LF-only statement tokeniser on CRLF checkouts, the amber register warning, hatch on new shapes, faulty event and key lists. | S07b-F10 (critical); DR-37 | DR-37: fix in TV first (WT lane) or carry a VV-side seam; K2 rule E3 |
| T11 | **Parallel agents collide on shared files.** 92 files are written by more than one package. Parallel sessions also bump the VV devlog. | `hot_file_ownership.json` | DR-05 one owner per file; the serial orders in `hot_file_ownership.json`; scribe-only records (K3 R5) |

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
| 1 | **DR-01** Port gate | Decides whether the 01-Oct request is Adam's sign-off for the 88 untried TV releases. It gates 121 packages in W1-W6, and W3-04 is hard-gated on it. | (c): port everything in dependency order, flag unconfirmed releases, hold the four gestures |
| 2 | **DR-02** Renumber | W0-02 is the first coding package and every other Wave 0 package depends on it. Answer (b) cancels it, and every 40-49 port then carries path translation (K2 section 12). | (a): renumber first and alone |
| 3 | **DR-03** Legacy 40 and the VV-only numbers | Sets the W0-02 script's target for legacy 40 (`--legacy 39` if overridden) and the registry. W6-03 is hard-gated on it. | 91 and 05; registry (i); 62 unchanged |
| 4 | **DR-04** Three renames inside the renumber | Script switches `--no-renderpreset`, `--no-distanceculling` and `--no-snapshothistory`. | All three in VV, no TV or WCP edit |
| 5 | **DR-05** Swarm rules | One owner per file, leaves first, hubs atomic and last. Used by W0-04, W0-05 and every hub package. | (a) |
| 6 | **DR-06** Sync purge fix | Hard gate on W0-07. No new R2 subfolder content until Adam applies the fix. | Fix prepared and dry-run only |
| 7 | **DR-07** Shared service-worker policy | Hard gates on W0-08 and W6-02. Governs the deploy of W0-02 itself. | Nobody edits or bumps the worker; Adam bumps at deploy |
| 8 | **Q-VER** Devlog version step (not a DR) | Adam's written rule says patch bumps for `ValeVision__DEVLOG__.md` (`devlog-entries-use-patch-bumps.md`, 21-Aug-2026). That rule lives in the SketchUp Plugins project memory, which ValeVision sessions may not load; that would explain why the VV devlog has used minor bumps since (v2.16.0 to v2.71.0). DR-34 and S11 B10 assume minor releases from v2.72.0. W0-01 records the answer and the scribes follow it (K3 section 14). | Not set by K1 or K3. Suggested: patch bumps from v2.71.1, because the written rule is the only explicit instruction on record. |

**Tier 2: Wave 0 packages read these but run on the K1 default if unanswered.** Answering them before the transport and config packages start avoids rework.

| DR | Read by (Wave 0) | Default if unanswered |
|---|---|---|
| DR-27, DR-28, DR-29, DR-30 (transport, routes, storage layout, save guard) | W0-07 to W0-14, W0-18, W0-19. W0-10 (worker deploy) is hard-gated | Facade (A); one project-files route family; TV folder names inside VV's prefix; guard behind a flag, R2 judging off |
| DR-33 (hotkey files) | W0-03 | All three key files renamed; KeyScope; DocumentKeys now |
| DR-10, DR-21, DR-43 (Statement switch, fonts, NA content) | W0-15 (config foundation), W0-16 | Statement Writer built last and switched off; PdfFonts pointing at the AD04 TTFs; NA-only features off |
| DR-13, DR-20, DR-22, DR-37 (sheet images, spell check, publishing, TV defects) | W0-18, W0-19 (Flask blueprints) | As recommended; TV defects carried as VV-side seams |
| DR-24, DR-26, DR-34, DR-35, DR-36 (loader, sections, versions, ledger, TV edits) | W0-04, W0-06 (gates, ledger restructure) | Loader kept; 41 name kept; TV module versions adopted; ledger restructured in place; no TV edits |

<!-- R0:DECISIONS -->

### R0.3 Permanent Divergence Register

**The rule.**

- Code identity is TrueVision's; app identity, transport and the engines listed below are ValeVision's (K2 one-sentence rule).
- This register is a **closed list**:
  - a difference between VV and TV that is not listed here is drift, and converges to TV. Listed means: permanent (R0.3.1 to R0.3.4), kept until TrueVision catches up (R0.3.5), or temporary with a named trigger (R0.3.6);
  - a port that removes a listed seam is a regression.
- Every seam is written in the hosting file's PORT NOTE `Divergences` field (K2 H5).
- Where a check exists, it is enforced:
  - G4: naming and PORT NOTE lint;
  - G6: no TV transport;
  - a per-host grep in the package's acceptance.

#### R0.3.1 The five structural divergences as they stand on 01-Oct-2026

Source: `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` section 2.2 (`:78-157`) and TD06 (`:189`).

| DIV | Status | Where the difference lives in VV (K2 target paths) | Rule for the swarm | Evidence |
|---|---|---|---|---|
| **DIV-1** Drawing render path (plan `:83-99`): VV draws through the EffectComposer with an ortho RenderPass and fog/AO off; TV bypasses its composer and lays a Sobel overlay quad over a flat render | **Live, permanent** | - `VVM/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`. Today this is `42/Na__DrawView__ComposerPreset__.js`; FR-09 in W0-02 gives it TV's file name and exports, keeps VV's composer body and keeps the private NAMESPACE `Na__DrawPreset`<br>- `VVM/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` (moved by FR-08) and `Na__RenderEffect__LineworkSettings__State.js`<br>- `VVM/05__RenderPipeline/01__Engine__PureEngine/` and `02__Engine__MaxEngine/`<br>- the MaterialPreset dual style-key read<br>- seven seams in `VVM/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` | - The eight exports match TV: ApplyStyles, Enter, Exit, GetCamera, GetExportOverrides, Initialize, IsActive, RenderFrame. RenderFrame gains an optional camera in W0-02.<br>- Never port `TVM/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js`.<br>- TV calls to `Na__DrawProfile__SetEdgeWidth` / `InvalidateSceneCache` map to `Enter({edgeWidthPx})` / a documented no-op.<br>- SnapshotRenderer is hunk-replayed only (W2-15), never taken whole.<br>- VV keeps edge width 1.0; TV's is 0.55. | K1 DR-04; K2 FR-09 and section 7; S02a-F15, S02a-F16, S02a-F17, S04a-F07 |
| **DIV-2** Section engine (plan `:101-115`; TD06 `:189`) | **Live, permanent.** TD06 makes VV's schema the reference. TV deviates in two places (positionMm sign, camelCase per-scene entries); these are fixed in TV only | - `VVM/41__System__CrossSectionView/`: 7 files, 3,697 lines, name kept. K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins, but no K3 package creates it yet (open issue: add it to W0-06)<br>- `VVM/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`: same path and 13 exports as TV, VV body, NAMESPACE `Na__DrawSection`<br>- block `CrossSection__SceneData` (VV schema)<br>- VV's user-facing Cross Section Tool and its per-project gate | - Never port `TVM/41__System__SectionCutEngine/*`, above all `Serialize` and `SceneData`.<br>- Ported TV callers of `Na__SectionCut__*` go through SectionAdapter.<br>- VV renames its own gate ids to `naCrossSectionToolDev*`, so TV's 48 placeholder ports byte for byte (W2-05).<br>- TD06 fix in TV: WT-02 (DR-41, DR-36).<br>- TV-side gap: TV's `CrossSection__SceneData` is on none of TV's three dev-owned key lists, so TV's own syncs can wipe its section bindings. The fix is WT-12; VV is unaffected. | K1 DR-26, DR-41; K2 rule K2 and section 7; S01-F04, S01-F22, S02a-F20, S02a-F59, S09-F55, S12-F32 |
| **DIV-3** Location of drawing records (plan `:117-133`) | **Closed.** Both apps own the top-level `LayoutEditor__DrawingsData` block (`TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js:179`; VV today `42/...:106`) | VV-only keys inside the block:<br>- `LayoutEditor__DrawingsData__LayoutModeEnabled` (VV `:112`, `:323-331`; TV has none)<br>- `Elevation__SeededFrom` (preserve on read and save; stop writing new values) | - No VV migration.<br>- W1-05 takes TV ProjectData 1.6.0 whole and re-applies LayoutModeEnabled (key, getter, setter, skeleton, normalise).<br>- VV 41 SceneData registers through `Na__DrawData__RegisterSectionBlockProvider`. | DR-25, DR-32; K3 W1-05; S12-F32. The W0-06 acceptance lists DIV-1 to DIV-4 as permanent; DIV-3 is closed, as both ProjectData files show |
| **DIV-4** Persistence transport (plan `:135-148`) | **Live, permanent, and wider after this programme.** VV builds its own facade, worker 1.6.0 and Flask blueprints instead of copying TV's | See PD-03 | Never copy TV's transport (gate G6) | DR-27 to DR-30; PD-03 |
| **DIV-5** Library baseline (plan `:150-157`) | **Closed.** Both have `04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0`, ThreeMeshBvh 0.9.9, Clipper2Js 0.9.0 and ThreeEdgeProjection 0.0.10 (`ls` of both folders, 01-Oct-2026) | Residual:<br>- VV gains TV's `05__Vendor__JsPdf__v4.1.0` and `06__Vendor__Html2Canvas__v1.4.1` (W0-16)<br>- VV-first `07__Vendor__PdfJs__v3.11.174`, because TV loads PDF.js from PlanVision's NA path<br>- VV's index files keep `Vale__Dependencies__*`<br>- legacy `04__Lib__ThirdParty__Three/` retires in W6-03 | Vendor numbers follow TV. Number 07 goes in the registry and is offered to TV (DR-42). | K2 N8, TF-R05 to TF-R08, FR-23; K3 section 12 |

#### R0.3.2 Named adapter seams VV keeps (the closed list)

| PD | What stays different | Why | Where it lives in VV (K2 target paths) | How the swarm keeps it | Evidence |
|---|---|---|---|---|---|
| **PD-01** | DIV-1 render route | Drawings through VV's composer; TV's interface names | As DIV-1 above | Hunk replay in SnapshotRenderer (W2-15); W2-03 adds only TV's fog-source hook; PORT NOTE "diverged (DIV-1)" | DIV-1 row |
| **PD-02** | DIV-2 section engine and schema | VV's live Cross Sections tool; TD06 | As DIV-2 above | Never port TV 41; add `README__CrossSectionView__.md` (not yet in any K3 package) | DIV-2 row |
| **PD-03** | Transport and storage (DIV-4) | VV keeps its own worker, Flask server and R2 prefix. VV's worker requires `X-Editor-Api-Key`; TV's authorises nothing | **Client facade, VV bodies at TV's paths:**<br>- `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (FR-16)<br>- `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (FR-17)<br>- `Na__AppUtils__GetProjectFolderFromUrl` / `GetYearFromUrl` in `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` (W0-11)<br>- `Na__CfApi__GetProjectDisplayName` (VV-only additive export)<br>**VV-only clients:**<br>- `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`, kept for VV dev menus<br>- `VVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js`: same path as TV, VV body, path guard and localhost gate<br>- `R2DrawingNotes` until W2-33<br>**Server side:**<br>- worker `WCP/CloudflareWorker` (`whitecardopedia-editor-api`, 6 route-specific handlers today, plus the guarded project-files family in 1.6.0)<br>- `WCP/server.py` with `WCP/Server__ValeVision<Feature>__Api__.py` blueprints (today one: `WCP/Server__ValeVisionScrapbook__Api__.py`), routes `/api/valevision/<feature>` and headers `X-ValeVision-*`<br>- Flask deletes go to quarantine (`00__Deleted__Quarantine`)<br>- Local-server recognition: `/api/check-localhost` today. W0-09 adds `GET /api/health` (service `whitecardopedia-local-dev`), and each ported module changes one SERVICE constant<br>**R2 keys:**<br>- under `VaApps/Projects/<folderId>/` only<br>- existing object names stay: `project.json`, `ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/`, `LayoutEditor/Snapshots/`, `PresentationMode/Thumbnails/`<br>- new content takes TV's relative names: `05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` | - The project folder is resolved only from the URL token through the master index, never from project.json's folderId (wrong in 54 of 155 files, missing in 10).<br>- The facade feature-detects worker routes.<br>- Gate G6: no `na-truevision-api`, no `NaProjectPortal/`, no TV key builder, no file copied from `TV/80__CloudflareIntegration`.<br>- Worker routes are proven under `wrangler dev`; only Adam deploys them (W0-10).<br>- Section C has the route table. | DR-27 to DR-30; K2 R1-R6, F10, N9; S06a-F02, S06a-F28, S06b-F55, S07b-F50, S07b-F55, S08-F17, S09-F30, S12-F23, S12-F38; `wrangler.jsonc:16,25`; K3 W0-12 |
| **PD-04** | Shared Whitecardopedia PWA | VV is one of several Vale apps under one worker | - `VV/index.html:19` links WCP's manifest<br>- VV never adds TV's `62__Feature__AppInstallability`<br>- the unsaved-work flag is the neutral `window.Na__Pwa__HasUnsavedWork`, never `TrueVision__Pwa__HasUnsavedWork` | Only W0-08 and W6-02 touch `WCP/.../62__Feature__AppInstallability/*`; Adam bumps the token; every Port Record carries a SHARED SERVICE WORKER note (K3 R6) | DR-07; K2 K4, TF-T46; S01-F62 item 5 |
| **PD-05** | Lazy Layout Editor loader | Keeps about 73 modules (1.9 MB) off every start-up | - `VVM/51__System__LayoutEditor/01__Core__Loader/`: `Na__LayoutEditor__Loader__.js`, `Na__LayoutEditor__LoadingScreen__.js`, `Na__LayoutEditor__Styles__Boot__.css`<br>- `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` (tab-code leaf)<br>- `VV/index.html` initialises only the loader for the editor<br>- loader-facing VV-only exports: LoadingVeil `DrawingSettled`; ModeController `IsAvailable`, `IsLayoutModeOn`, `SetLayoutMode`, `WaitForFirstDrawing` | - Every TV LE stylesheet joins `Na__LeLoad__STYLESHEETS` (Loader `:125-134`) in TV's CSS-index order.<br>- Tab-strip CSS and the 3D-furniture hiding block live in Styles__Boot.<br>- TV entry points go through the facade with literal `import()` (W1-31).<br>- TV reserves LE/01 for this loader (TV DEVLOG `:11718`).<br>- Fix the ledger contradiction (rows 1122, 1230, 1244) and the PORT NOTE at Loader `:51`. | DR-24; K2 N4, S5; S01-F39, S03a-F22, S03a-F43, S03a-F45, S09-F10, S10-F24 |
| **PD-06** | VV's plan and elevation mode controllers, and the menu features where VV is ahead | VV 1.2.2 / 1.1.1 route through SectionAdapter, RenderPreset, MaterialPreset and Transitions; TV's 1.1.0 call 41 directly | - `VVM/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js` (today 43)<br>- `VVM/45__System__ElevationViews/Na__Elevation__ModeController__.js` (today 46)<br>Seams re-applied inside TV's 2.x editors and row builders:<br>- Styles/Exclusions rows (D33) in the Advanced fold<br>- the Ground Floor Plan quick action (D11)<br>- thumbnail bake on add, seed and Update (`VVM/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js`)<br>- bake-before-save on Update (D20) | - Keep VV's controllers; W2-03 adds only TV's fog-source hook.<br>- W2-04 and W2-05 re-apply the seams.<br>- Styles/Exclusions, Ground Floor Plan and ThumbnailBake are offered to TV (WT-06, WT-09); bake-before-save is not. | DR-32; S02a-F19, S02a-F24, S02a-F27, S11-F29, S11-F32, S11-V03 |
| **PD-07** | Data path stays on the hostname test; no saving from the live site | VV loads from Flask on localhost and from GitHub Pages live; the editor key reaches the browser only from localhost Flask | - `VVM/03__AppUtils/Na__AppUtils__DevGate__.js:19-27`: DevGate unlocks UI only<br>- `VVM/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js:596-597`: bake gated by `Na__AppUtils__IsRunningOnLocalhost`<br>- the Persistence FolderId line (VV's `NormalizeProjectFolderId`)<br>- the Assets localhost upload gate (re-applied by W0-14) | Never route data-path writes through DevGate; config labels say "Saving needs the local Whitecardopedia server". An unlocked live session cannot sync the specification either | DR-31; S02b-F27, S02b-F28, S03b-F20, S06b-F56, S12-F39 |
| **PD-08** | Project-data load contract and VV-only main-config blocks | VV dispatches `na-layouteditor-drawingsdata-loaded` before the scenes, with `{block, projectCode}`; VV's main config carries the Vale look | - `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`<br>- `VVM/02__AppData/Na__AppConfig__Main.json` blocks `DrawingView__Config` and `ProjectedLinework__Config` | - Never take TV's LoadingSequence whole: W0-13 adds only `sceneConfig` in the detail and `na-app-scene-ready`.<br>- Add main-config blocks only for a landed module. | S09-F18, S09-F32 |
| **PD-09** | VV-only exports, events and dispatchers that TV lacks | VV behaviour that TV never wired, or wired broken | - 18 VV-only export names in 12 shared files (S01-F41)<br>- 21 VV-only events (K2 E2), including `na-layouteditor-loader-changed` and `na-pause-render-loop` / `na-resume-render-loop`, with TV's name added beside them (X3)<br>- VV's SceneTransition dispatch and names<br>- the `na-model-visibility-changed` dispatcher in `VVM/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js`<br>- the folder-50 hooks `Na__PlExport__Apply` (30 ImageExport Controls), `Na__PlOverlay__SyncFrame` (LoadingSequence) and `Na__PlStore__BakeBeforeSave` (42/45 DevMenu editors)<br>- the LE ModeController's scene-broadcast listeners that refresh the Viewport panel (VV 1.15.1; offered to TV in WT-04) | - Re-add after every whole-file port and list in the PORT NOTE.<br>- Never rename a TV export to fit VV.<br>- Grep acceptance on the four folder-50 names in every package touching those hosts.<br>- Never copy TV's broken event variants (K2 E3). | S01-F41, S02b-V01, S03a-F14, S04a-F50, S09-F37, S09-F38; K2 X2, X3, E2, E3 |
| **PD-10** | VV-only resilience modules and the styled confirm dialog | Context loss, load budgets, the save path, and a modal where TV falls back to `window.confirm` | - `VVM/01__AppCore/Na__AppCore__GpuLifecycle__.js` and `Na__AppCore__LoadWatchdog__.js`<br>- `VVM/03__AppUtils/Na__AppUtils__ResilientLoad__.js` and `Na__AppUtils__LoadingOverlay__.js`<br>- the config-load timeout and import-map guard in `VV/index.html`<br>- VV's confirm-dialog markup and CSS | - Every port of `index.html`, LoadingSequence or `03__AppUtils` preserves them.<br>- VV browser tests answer the modal; they never stub `window.confirm`.<br>- The confirm dialog is offered to TV (WT-05). | S09-F51, S09-V01, S07b-F42 |
| **PD-11** | 3D hotkey handler and dictionary schema | VV's 3D keys use their own handler; TV's Manager is outside drawing scope | - `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (twin of TV `10/Na__Hotkeys__Manager.js`); it gains only the KeyScope guard (W1-29)<br>- the file is renamed `VVM/02__AppData/Na__Hotkeys__3dModelTab__.json` (FR-13), but keeps the root key `Na__ValeVision__HotkeysDictionary` and the `ValeVision__*` actions | File names are TV's (W0-03); content and root key stay VV's | DR-33; K2 F4, section 7 |
| **PD-12** | App identity tokens | Two apps, two identities | - banner `VALEVISION3D - ...`<br>- console `[ValeVision3D <System>]`<br>- storage keys that embed the app name: `ValeVision3D__AuthoringUnlocked`, `Na__ValeVision__StatementDraft__<id>`, IndexedDB `ValeVision3D__ProjectedLinework`<br>- model category keys `ValeVision__*`<br>- sibling files `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`<br>- root documents `ValeVision__<KIND>__*.md`<br>- lowercase `index.html`<br>- no `window.TrueVision__*` reads | - Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__` outside PORT NOTE "Ported from" lines.<br>- Module names and namespaces stay identical to TV. One header fix is due: `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` should name its NAMESPACE `Na__R2Notes` (K2 H2). | K2 H1, H2, C1, B2, K3, K4, F8, F9; S01-F62, S05a-F48, S05b-F55, S06a-F02, S06b-F49 |
| **PD-13** | Brand values | Vale Garden Houses' look | - `--Vale_*` token values (the names are shared; TV itself uses `--Vale_*`) in `VV/03__Style__AppStylesheets/`<br>- header logo, alt text, title, favicon, touch icons, manifest and theme colour in `VV/index.html`<br>- the header title hidden at 600 px and below (`Na__UiFeature__Styles__AppHeader__.css:159`; TV v2.9.0 records it as deliberate)<br>- SpecDocument takes the project name from the folder id and the logo from config<br>- brand values in the LE AppConfig (keys stay TV's) | Keys TV's, values VV's (K2 V1); never rename `--Vale_*` | S10-F23, S06b-F34, S01-F47; K2 S1, V1 |
| **PD-14** | Title-block assets | Vale's own Classic scan; TV's Classic is an NA placeholder | `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (FR-20 copies Vale's scan, md5 59777a65, out of 35); the logo stand-in text goes into config | Never copy TV's scan; W0-16 copies and never moves | DR-43; K2 FR-20; TV plan TD04 `:187` |
| **PD-15** | NA content never ships; NA-only features land switched off | Noble Architecture identity, URLs and planning content | - QR (LE/53) off: Symbol fails closed; `FALLBACKS.baseUrl` is empty until a Vale resolver exists; `LayoutEditor__TitleBlock__QrCellEnabled` false<br>- Statement Writer "TrueVision 3D Project Hub" section excluded by config<br>- Standard Scrapbook empty; Custom Scrapbook not seeded<br>- Document ID phases are Vale's, never NA's T01-T04<br>- spell-check dictionary is Vale's (`VV/50__ValeVision__UserConfig/`)<br>- PDF.js from VV vendor 07, never `/na-apps/20__PlanVision__CoreAppCode` | Gate G4 NA-marker lint: `NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/30__TrueVision__CoreAppCode`, `noble-architecture.com/q/` and `/s/`. Allow-list `cdn.noble-architecture.com/VaApps` and `www.noble-architecture.com/assets` | DR-11, DR-12, DR-20, DR-43; K2 V2; S06a-F25, S07a-F58, S07a-V02 |
| **PD-16** | VV-only systems and folders | Vale features with no TV twin | See R0.3.3 | Never overwritten by a port; numbers reserved in the registry (W0-06) | DR-03; K2 N2, N3 |
| **PD-17** | Naming twins and reserved numbers | Same role, different implementation | - `41__System__CrossSectionView` against TV `41__System__SectionCutEngine`<br>- `60__Feature__FullScreenMode` against TV `76__System__FullscreenMode`<br>- VV `index.html` against TV `Index.html`<br>- `95__SketchUpSisterTools__ToolsAndUtils` against TV `90__rubyScript__...`<br>- `00__Archive` against TV `00__ArchivedVersions`<br>- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (until moved to 92), 63, 64, 69, 71, 91-99<br>- 90 is burnt (TV's retired PageLayoutSystem) | A new VV-only folder takes the lowest free number in 93-99; a new TV folder skips every VV-reserved number | K2 N2, N3, N6, section 7, section 8 |
| **PD-18** | Specification file, key and routes | DIV-4 applied to one sibling file; the document schema (`ProjectSpecification__*`) is identical | `ValeVision__DrawingNotes__.json` beside `project.json`; worker `/api/editor/projects/{folderId}/drawing-notes`; Flask `/api/projects/<folder>/drawing-notes` (kept as aliases) | After W2-30, the difference lives only in the facade; `R2DrawingNotes` retires in W2-33. The specification port needs no worker change | S06b-F06, S06b-F55, S12-F22; K2 FR-18 |
| **PD-19** | ProjectRecord: VV has no Project Admin system | TV reads NA Project Admin documents over `80__CloudflareIntegration`, with a PlanVision address fallback; VV's facts live in its own project data | `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` (VV body). W1-12 moves its read of `clientDrawingName` and `siteAddress` to the project root through the facade's loaded data. Today it looks in the PresentationMode block, which is dormant | Keep VV's body; never import TV's admin reads; record the divergence in the PORT NOTE | S03b-F19, S12-F24; K3 W1-12 |

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
| NA content:<br>- NA logo and letterheads; "Noble Architecture Ltd"<br>- the "TrueVision 3D Project Hub" section<br>- the `/q/` and `/s/` resolvers and the Project Portal block<br>- TV's NA Classic scan<br>- NA site-plan furniture and the OS licence block<br>- NA job phases T01-T04<br>- PDF.js from `/na-apps/20__PlanVision__CoreAppCode`<br>- `window.TrueVision__*` globals | Brand and data safety | Vale values through config; NA-only features switched off (PD-15) | DR-11, DR-12, DR-43; K2 V2, K4 |
| TV's own "ValeVision : not yet ported" PORT NOTE lines | VV writes its own PORT NOTE | K2 H5 format | K2 H5 |

#### R0.3.5 Divergence kept on purpose because VV is ahead (until TrueVision catches up)

| Item | VV seam | Retired when | Evidence |
|---|---|---|---|
| Plan-dimension split (ConfigState and EditorPreview single-sourced) | `VVM/44__System__PlanDimensions/` (today 45) | TV adopts it (WT-01, DR-36) | S02b-F08, S11-V03 |
| StyleRows and per-drawing Styles/Exclusions toggles (D33) | `VVM/40__System__DrawingViewCore/Na__DrawView__StyleRows__.js` callers in the 42/45 row builders | TV finishes its half-landed back-port (WT-09) | S11-V03; DR-32 |
| LE Dev menu structure (VV 1.4.0 against TV 1.3.0) | `VVM/51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | TV adopts it; W2-17 adds only TV's live-phase bake filter | S03a-F27, S10-F36 |
| Authenticated, path-guarded statement and publish routes; delete to quarantine | WCP worker and blueprints | Offered to TV as hardening (DR-28, DR-42) | S07b-F50, S07b-F55, S08-F17 |

#### R0.3.6 Temporary divergences, each with its retirement trigger

| Divergence | Seam | Retired by | Evidence |
|---|---|---|---|
| Per-project Layout Mode switch | `LayoutModeEnabled` in `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js`; ModeController `IsAvailable`/`IsLayoutModeOn`/`SetLayoutMode`; Loader `IsAvailable` | Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then | DR-25 |
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
