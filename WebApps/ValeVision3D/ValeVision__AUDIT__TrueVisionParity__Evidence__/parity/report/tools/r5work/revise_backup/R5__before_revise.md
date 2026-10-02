## Section E - Release Watermark, Parity Matrix and Feature-Gap Inventory

This section is the reference inventory: which TrueVision (TV) releases ValeVision (VV) holds, how far each drawing
system has drifted, every TV-only module and test with the canonical package that ports it, and every VV-only module
with its fate. It builds on slice S11 (release watermark, verified) and corrects it where other slices have better
evidence (E.1.2). Folders and decisions are not re-argued here: folder moves are Section A, naming Section B, wiring
and transport Section C, chrome and animation Section D, wave plan Section F.

**Conventions.** `TVM/` and `VVM/` are each app's `02__Src__AppModules`; `LE/` is `51__System__LayoutEditor/`. After
the renumber package W0-02 (K2 TF-T22..T27, FR-01..FR-11), VV's drawing folders carry TV's numbers, so a TV path in
this section is also the VV target path, except the twins K2 keeps apart (K2 TargetMaps section 7: VV
`41__System__CrossSectionView`, `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` with VV's body,
`LE/01__Core__Loader`, `LE/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js`). Package ids (`W0-01`..`W6-04`,
`WT-01`..`WT-12`) are K3's; decision ids (`DR-01`..`DR-44`) are K1's. A package "lands inert" when its modules link but
nothing calls them yet (K3 section 4).

**Reproducible.** Every table marked *(generated)* comes from scripts in `parity/report/tools/`:
`r5_exports_index.py` (exported `Na__*` names per file in both apps), `r5work/parse_appA.py` (S11 Appendix A as
data), `r5_release_map.py` (TV devlog entry -> files it names -> K3 `tv_sources` and test owners), `r5_overrides.py` (the
hand corrections, each with evidence), `r5_build.py` (E.1, E.2), `r5_git_intro.py` (read-only `git log --follow
--diff-filter=A` for the TV commit that added each TV-only file), `r5_inventory.py` (E.3, E.5), `r5_analysis.py`
(hand-written E.2 analysis rows) and `r5_assemble.py`. Inputs: `ref/drift_all.tsv`, `ref/tree_tv.tsv`,
`ref/tree_vv.tsv`, S11 Appendix A, `data/wp_canonical.json`, `data/findings_verified.json`, the TV devlog
(read-only). Machine-readable outputs: `report/tools/r5work/release_rows_final.json` (177 releases with class and
packages), `tv_only_inventory.json`, `open_by_folder.json`, `packages_by_folder.json`.

---

### E.1 Release watermark

#### E.1.1 Where the port was up to

- **High-water: TV v2.85.0** (20-Sep-2026), ported as VV v2.68.0. The last TV release ported was v2.83.0 (VV v2.70.0,
  the header fold), in VV commit `9d250d21` (21-Sep). VV's only later release, v2.71.0 (28-Sep, per-scene lighting),
  went the other way and became TV v2.161.0. No VV source, stylesheet, `index.html` or test cites a TV release after
  v2.85.0 (S11 verifier, B1-B2).
- **None of the 88 TV releases v2.86.0-v2.172.0 is in VV**: 77 never considered for VV, 7 parked on Adam's sign-off,
  2 not drawing work (v2.92.0, v2.139.1), 1 VV-origin (v2.161.0), 1 deliberate (v2.88.0, Project Admin address).
- **Below the high-water mark 28 releases are open or partial**, not S11's 18. The extra 10 are 4 "deliberate"
  non-ports that K1 reopens with a port-by-default answer (v2.32.0 DR-09, v2.69.0 DR-21, v2.71.0 and v2.76.1 DR-11)
  and 6 corrections from other slices' evidence (E.1.2).
- **Low-water: TV v2.28.0** (13-Sep, ViewportSnapMove never came across, S11). Every TV behaviour older than v2.28.0 is
  in VV; one configuration residue of v2.27.0 remains (`Drawing2dEdgeWidth`, S09-F33, W2-08).
- **Adam-confirmed in TV among the open releases**: v2.37.0 (flush joins, TV plan row V `:865` "Signed off
  14-Sep-2026", only the VV port parked at `:866`), v2.153.0 (box select over a viewport) and v2.155.0 (publishing).
  The open releases with no recorded confirmation ride on DR-01 (default (c): port in dependency order, name the
  unconfirmed TV releases in each VV devlog entry; the four gesture changes of DR-40 items 7-10 wait for Adam's yes,
  guards in W3-03, removed by W3-04).

Classification after reconciliation (177 rows: 172 TV devlog headings, v2.33.0 which has none, and four
unnumbered 14-Sep features VV ported):

| Class | Meaning | S11 (verified) | This section | Of the 88 later releases |
|---|---|---|---|---|
| PORTED | in VV, VV release cited | 55 | 51 | 0 |
| PARTIAL | part in VV; the rest has a package | 6 | 11 | 0 |
| PENDING-SIGNOFF | TV parked the VV port on Adam's sign-off | 17 | 17 | 7 |
| NOT-CONSIDERED | never weighed for VV | 79 | 80 | 77 |
| REOPENED | recorded as deliberate, K1 default now ports it | - | 4 | 0 |
| DELIBERATE | stays a VV divergence | 6 | 2 | 1 |
| NOT-DRAWING | 3D, PWA or shell only, nothing VV needs | 8 | 7 | 2 |
| VV-ORIGIN | TV took it from VV | 4 | 4 | 1 |
| N/A | TV-internal | 2 | 1 | 0 |
| **Open (needs a package)** | PARTIAL + PENDING + NOT-CONSIDERED + REOPENED | 102 | **112** | 84 |

Every one of the 112 open releases maps to at least one K3 package (E.1.4); the only release with work and no
package is v2.92.0, which K1 DR-44 places outside this alignment.

#### E.1.2 Corrections to S11 from the other slices *(generated from `r5_overrides.py`)*

Method: every finding of slices S01-S10 and S12 that cites a TV release was checked against S11's class for that
release (`r5work/findings_by_release.txt`), and the code or git history was opened where they disagreed. TV committed
releases in batches (for example `62dade1c` added the devlog headings v2.88.0-v2.95.0), and some module changes in a
batch appear in no devlog entry, so a port driven by devlog headings misses them (S05a-F54). Batch ranges below were
re-read with `git show <commit> -- TrueVision__DEVLOG__.md`; unlogged changes are attached to the release named in the
commit subject. "kept" rows keep S11's class but carry a residual or a note.

| TV release | Title | S11 class -> corrected | Why | Evidence | Packages |
|---|---|---|---|---|---|
| v2.27.0 | Edge Styles - Walls Black, Windows Grey, Furn... | PORTED (kept) | TV v2.27.0 removed Drawing2dEdgeWidth (bake width moved to the profileLinework Composite__Weight); VV keeps the key under DIV-1 | S09-F33 | W2-08 |
| v2.30.2 | The Drawing View Reads Its Own Config | N/A -> **PARTIAL** | VV loads the drawing-view config, but after the loading sequence starts; TV moved it (and ProjectData, section scene data) ahead of StartLoadingSequence; Drawing2d keys not aligned | S09-F07 (TV Index.html:1556-1570 vs VV index.html:1966, 2156, 2207-2209); S09-F33 | W0-17, W2-08 |
| v2.32.0 | Model Source - Existing and Proposed on One S... | DELIBERATE -> **REOPENED** | Model Source / design phases: K1 DR-09 default (a) is a dormant verbatim port | DR-09; S04a-F31; S09-F23 | W1-01, W2-16 |
| v2.37.0 | Projected Linework Matches the 3D View - Join... | PENDING-SIGNOFF (kept) | TV feature signed off by Adam on 14-Sep (TV plan row V L865 'That works great'); only the VV port was parked (L866) | S02b table row 2; DR-31 | W2-43, W2-06 |
| v2.57.0 | Match Properties to a Whole Selection, and On... | PORTED -> **PARTIAL** | VV Panel__Text defines Na__LePanelText__Many() but Refresh never calls it, so several selected texts show new-text defaults | S06a-F08 (VV LE/40 Panel__Text__.js:121, 157-176) | W2-36 |
| v2.65.0 | The Public Web Is a Viewer, Not a Disabled Ed... | PORTED -> **PARTIAL** | batch commit 4f6bb9ef (v2.63.1-v2.65.1, subject v2.65.0) also carried HoverTooltip 1.0.0, PointerDrag 1.5.0 RefreshBrokenTooltip, LeaderGeometry and SpecLinks (broken-bubble hover); unlogged, so VV v2.58.0 missed them | S05a-F10, S05a-F54; git show --stat 4f6bb9ef (re-checked 01-Oct) | W2-20, W3-03 |
| v2.67.0 | An Hour of Drawing Sat Behind One Button, and... | PORTED -> **PARTIAL** | close guard ported, but not the TrueVision__Pwa__HasUnsavedWork hold-off: the shared Whitecardopedia registrar reloads open VV pages over unsaved sheets | S11 Appendix A note; S10-V05 (WCP registrar 110-150, 195) | W0-08, W1-07 |
| v2.69.0 | The Register Was Never Given Its Font, So Eve... | DELIBERATE -> **REOPENED** | PdfFonts and the register font: K1 DR-21 default (a) embeds Open Sans | DR-21; S08-F13; S07a-F23 | W1-25, W4-18 |
| v2.71.0 | A Drawing Number Was Three Facts in a Trench... | DELIBERATE -> **REOPENED** | Document ID: K1 DR-11 default ports A's code with {project}_{drawing} until Vale phases exist | DR-11; S07a-F14; S03b-F04 | W1-13, W1-19, W1-21, W1-22 |
| v2.75.0 | Safari Reads the First Manifest and Never Loo... | NOT-DRAWING -> **NOT-CONSIDERED** | not presentation-only: batch commit 32767407 (v2.69.0-v2.75.0, subject v2.75.0) carried ItemClipboard 1.3.0 (Ctrl+X, one clipboard, exact cross-sheet paste) and registrar 1.2.0 (no reload on a first install); neither logged, neither in VV | S05a-F22, S05a-F54, S10-V05; git show --stat 32767407 (re-checked 01-Oct) | W2-21, W0-08 |
| v2.76.1 | DWG No. | DELIBERATE -> **REOPENED** | register column label follows the register (DR-11) | DR-11; S07a-F08 | W0-15, W4-18, W4-10 |
| v2.83.0 | The Top Bar Knows When It Is Not Wanted, and... | PORTED -> **PARTIAL** | the fold is identical, but the going-in veil was adapted away: no FirstOpen, no in-host .na-le-veil base mode, no specification job; VV covers the first open with the full-screen loader screen | S10-F01 (fold identical), S10-F04, S10-F05, S10-F06, S03a-F20, S09-F45 | W1-33 |
| v2.88.0 | The Site Address Was Only Ever Written Down i... | DELIBERATE (kept) | stays a VV divergence (no Project Admin); W1-12 makes VV's ProjectRecord read root facts and ports TV's address test | S03b-F19; K3 W1-12 | W1-12 |
| v2.90.0 | A Hatch Stopped Being a Site Plan Thing and B... | NOT-CONSIDERED (kept) | Eyedropper Shape__Hatch trait and ToolState hatch defaults landed in batch commit 62dade1c (v2.88.0-v2.95.0), described only in this entry at TV devlog :7494 and in neither file's log | S05a-F54 | W1-17, W1-26, W2-29, W3-12 |
| v2.92.0 | One Group's Images, Because the Whole Project... | NOT-DRAWING (kept) | presentation batch export; K3 has no package (DR-44: outside this alignment unless Adam wants it) | S11-V05; DR-44 | - |
| v2.95.0 | The Statements a Project Is Won On Were the O... | NOT-CONSIDERED (kept) | batch commit 62dade1c (v2.88.0-v2.95.0, subject v2.95.0) also carried unlogged nested LineworkModifier styling (SSOT 76-79) | S04a-F47 | W4-04, W4-05, W4-06, W4-12, W4-13, W4-15, W4-16, W2-13 |
| v2.98.0 | A Viewport Would Not Take the Arrow-Key Axis... | NOT-CONSIDERED (kept) | batch commit 6076ec10 (v2.96.0-v2.98.0, subject v2.98.0) carried the raster half of LineworkModifier styling | S04a-F47 | W3-03, W2-25, W3-04, W2-13 |
| v2.112.0 | Page Down Turns the Drawing, Ctrl+S Saves the... | NOT-CONSIDERED (kept) | the Walk/Fly exit third already works in VV (VV 42/Na__DrawView__Transitions__.js:114-115); Page Up/Down and the register Ctrl+S remain | S03a-F15 (partly refuted) | W1-36, W1-04, W4-10, W1-32 |
| v2.139.1 | Project Data Is Always Asked of the CDN, So a... | NOT-DRAWING (kept) | not needed: VV's project.json URL carries the build token (VV 03/Na__AppUtils__ProjectLoader.js:407-408 WithBuildToken) and the worker serves project.json no-cache (DR-28) | DR-28; code read 01-Oct | - |

Points re-checked in the code for this section: VV `LE/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js:121` defines
`Na__LePanelText__Many` and nothing calls it, where TV calls it at `:152`; VV has no `SheetTools__HoverTooltip__.js`
and its `PointerDrag__` has no `RefreshBrokenTooltip` (TV has 3); the Whitecardopedia registrar has no
`HasUnsavedWork` or `updateViaCache` (TV registrar `:37`, `:133-167`) and its token is still `'2026-09-18-1'`
(Whitecardopedia Logic `:229`); VV `03__AppUtils/Na__AppUtils__ProjectLoader.js:407-408` build-tokens every
`project.json` URL. S11's own c.1 verifier corrections (ten `no_action` rows hiding TV changes) need no new rows: they
sit in releases this table already carries, v2.37.0, v2.38.1, v2.87.0, v2.91.0, v2.94.0, v2.96.0, v2.105.0 and v2.107.0
(all open) and v2.92.0 (NOT-DRAWING, no package).

#### E.1.3 Watermark per area *(generated)*

| Area | High-water (newest ported) | VV release | Low-water (oldest open) | Open | of which partial | Main packages (primary owners) |
|---|---|---|---|---|---|---|
| LE sheet tools | v2.59.0 | VV v2.52.0 | v2.28.0 | 20 | 4 | W3-03, W2-21, W2-25, W2-42, W2-18, W3-01 |
| LE drawing tools | v2.60.0 | VV v2.53.0 | v2.41.0 | 7 | 0 | W1-26, W2-41, W2-27, W3-12, W3-03, W1-13 |
| LE viewports and render styles | v2.64.1 | VV v2.57.0 | v2.32.0 | 8 | 0 | W2-16, W1-14, W1-28, W2-18, W3-06, W2-09 |
| LE core (model, history, tabs, toolbar) | v2.73.0 | VV v2.62.0 | v2.67.0 | 7 | 1 | W1-07, W1-34, W4-13, W2-36, W3-13, W1-05 |
| LE title block, chrome and QR | v2.79.1 | VV v2.66.0 | v2.81.0 | 6 | 0 | W2-38, W1-15, W1-22, W1-26 |
| LE specification and notes | v2.78.1 | VV v2.66.1 | v2.91.0 | 5 | 0 | W2-32, W2-35, W2-30, W2-31, W1-21, W2-34 |
| LE scrapbooks | v2.85.0 | VV v2.68.0 | v2.96.0 | 5 | 0 | W2-37, W2-38, W2-39, W3-14, W1-26 |
| LE web viewer, PDF, publishing | v2.65.2 | VV v2.58.1 | v2.65.0 | 4 | 1 | W4-17, W4-08, W4-07, W4-02, W4-01, W2-20 |
| Projected linework (50) | v2.63.2 | VV v2.56.1 | v2.37.0 | 6 | 0 | W2-06, W2-43, W2-11, W2-16, W1-23 |
| Drawing core, plans, elevations, north, planes, fog (40-49) | v2.80.0 | VV v2.67.0 | v2.30.2 | 7 | 2 | W1-09, W1-03, W2-03, W1-08, W2-10, W1-06 |
| Floor areas (LE 59) | - | - | v2.104.0 | 3 | 0 | W3-10, W1-27, W3-17 |
| Register, Document ID, sheet images (LE 51, 54) | - | - | v2.69.0 | 5 | 0 | W1-16, W3-18, W4-18, W0-15, W1-13, W1-19 |
| Statement writer (LE 52) | - | - | v2.95.0 | 12 | 0 | W4-12, W4-05, W4-06, W4-16, W4-04, W4-14 |
| Site plans and hatch library | - | - | v2.48.0 | 7 | 0 | W2-14, W1-13, W2-16, W3-16, W1-17, W1-34 |
| Keyboard scopes | - | - | v2.110.0 | 3 | 0 | W1-29, W1-30, W1-36, W1-04 |
| Colour palette (54) | - | - | v2.126.0 | 2 | 0 | W1-37, W1-38, W1-17 |
| Persistence guards | - | - | v2.39.0 | 2 | 1 | W0-12, W1-07, W1-05 |
| Presentation / 3D (not drawing) | v2.68.0 | VV v2.63.0 | v2.58.2 | 1 | 1 | W2-07, W1-19 |
| App shell | - | - | v2.75.0 | 2 | 1 | W1-33, W2-21, W0-08 |

Against S11 B1: high-water marks are S11's except where a release moved to PARTIAL (the app shell's v2.83.0) or S11
counted a partial release (the drawing core's v2.84.0 compass half; the newest fully ported is v2.80.0). Low-water
marks move where E.1.2 opened an older release: LE core v2.106.0 -> v2.67.0 (unsaved-work hold), LE viewports v2.38.0
-> v2.32.0 (Model Source reopened), web viewer/PDF v2.155.0 -> v2.65.0 (broken-bubble hover), drawing core v2.82.0 ->
v2.30.2 (start-up order), and the app shell gains two open rows (v2.75.0, v2.83.0). S11's "Persistence guards" row
missed v2.146.0 (three guards round the project file).

#### E.1.4 Every TV release v2.24.0 - v2.172.0 *(generated)*

Legend. **Class**: bold = open (needs a package); "(S11: X) †" = corrected in E.1.2; "‡" = residual or note in E.1.2;
"TV-confirmed" = Adam confirmed the feature in TV. **VV release / porting packages**: for a PORTED row, the VV release that
carried it; for an open row, the K3 packages that carry the files the release's TV devlog entry names, primary owner
first. A release is fully in VV when every listed package has landed; the Parity Scribe (W0-99..W6-04) flips the row
then, and the row's packages name the release in their Port Record. Packages are computed (`r5_release_map.py`) and
hand-corrected for 73 rows where the file-count ranking put a supporting package first (`r5_overrides.py`
`WP_FIX`). **Decisions**: K1 decisions that change the release's scope (from the title and area); DR-01 marks every
open release with no recorded confirmation by Adam (all open releases from v2.86.0, every PENDING-SIGNOFF row and the
three NOT-CONSIDERED rows below it), not the PARTIAL and REOPENED rows of releases that were ported or decided. The S11 notes and TV test names per release stay in S11 Appendix A; E.5 maps the
tests.

| TV release (devlog line) | Date | Title (TV devlog, shortened) | Area | Class | VV release / porting packages (primary first) | Decisions |
|---|---|---|---|---|---|---|
| v2.172.0 (L5) | 29-Sep | R2 Holds Every Statement Picture Where the Statement Says It Is: a... | LE-STMT/PUB | **NOT-CONSIDERED** | W4-12, W4-05, W4-06, W4-14 | DR-01, DR-10, DR-22 |
| v2.171.0 (L64) | 29-Sep | The Web Viewer Shows a Statement's Published Pictures: No More 404s... | LE-STMT/PUB | **NOT-CONSIDERED** | W4-06, W4-12, W4-05, W4-14 | DR-01, DR-10, DR-22 |
| v2.170.0 (L126) | 29-Sep | A Published Statement Is the Read View: Every New Element Publishes... | LE-STMT/PUB | **NOT-CONSIDERED** | W4-12, W4-05, W4-06 | DR-01, DR-10, DR-22 |
| v2.169.0 (L205) | 29-Sep | The Web Viewer's Design Statements Tab Offers Nothing but Reading:... | LE-STMT/PUB | **NOT-CONSIDERED** | W4-06, W4-12 | DR-01, DR-10 |
| v2.168.0 (L275) | 29-Sep | The Materials Table Becomes a Finishes Comparison: Each Element's E... | LE-STMT | **NOT-CONSIDERED** | W4-12, W4-14, W4-16 | DR-01, DR-10 |
| v2.167.0 (L360) | 29-Sep | A Statement Ends the Same Way Every Time: a Drawing Schedule Synced... | LE-STMT/REG | **NOT-CONSIDERED** | W4-12, W4-16, W4-18, W4-04 | DR-01, DR-10, DR-11 |
| v2.166.0 (L466) | 29-Sep | Share: Every Read View Hands Out a Link That Opens That One Documen... | LE-PUB | **NOT-CONSIDERED** | W4-08, W4-07, W4-01, W1-15 | DR-01, DR-22, DR-23 |
| v2.165.0 (L556) | 29-Sep | A Figure's Title Lives Inside the Figure: It Starts at the Picture'... | LE-STMT | **NOT-CONSIDERED** | W4-12, W4-04 | DR-01, DR-10 |
| v2.164.0 (L620) | 29-Sep | A Site Plan Legend in the Parametric Scrapbook: Every Wash, Hatch a... | LE-SCRAP/SITE | **NOT-CONSIDERED** | W2-39, W3-14 | DR-01, DR-08, DR-19 |
| v2.163.0 (L704) | 29-Sep | The Project Specification Is Kept in Step With Its File, as a State... | LE-SPEC | **NOT-CONSIDERED** | W2-30, W2-31, W2-35 | DR-01, DR-10 |
| v2.162.0 (L797) | 29-Sep | Standard Sections: the Header, the Contents and the TrueVision 3D P... | LE-STMT | **NOT-CONSIDERED** | W4-12, W4-16, W1-15, W4-14 | DR-01, DR-10, DR-43 |
| v2.161.0 (L873) | 28-Sep | A Scene Can Turn the Sun, and Every Scene It Does Not Touch Keeps t... | PM (3D) | VV-ORIGIN | VV v2.71.0 | - |
| v2.160.0 (L967) | 23-Sep | A Published or Printed Site Plan Filled In Its Holes: the Lake Got... | LE-SITE/PUB | **NOT-CONSIDERED** | W1-13, W3-16, W4-03 | DR-01, DR-22, DR-08 |
| v2.159.0 (L1017) | 23-Sep | A Storey Seam Thirteen Microns Out Drew a Line Across Every Elevati... | PL | **PENDING-SIGNOFF** | W2-43 | DR-01, DR-16, DR-31 |
| v2.158.0 (L1077) | 23-Sep | The Tab Strip Is Five Tabs: 3D Model, Drawings (a Menu of Every Dra... | LE-CORE (UI) | **NOT-CONSIDERED** | W1-34, W4-13, W1-31, W1-32 | DR-01, DR-38 |
| v2.157.0 (L1161) | 23-Sep | Statement Writer Lockstep: The App's Copy and the Markdown File Are... | LE-STMT | **NOT-CONSIDERED** | W2-30, W4-06, W4-12 | DR-01, DR-10 |
| v2.156.0 (L1214) | 23-Sep | Published Drawings Loading Screen: Each Drawing Arrives Whole, Name... | LE-PUB | **NOT-CONSIDERED** | W4-17, W4-02, W4-09 | DR-01, DR-22 |
| v2.155.0 (L1266) | 23-Sep | Publishing: Drawings Are Baked Once on the Authoring Machine, and t... | LE-PUB | **NOT-CONSIDERED** TV-confirmed | W4-01, W4-17, W4-02, W4-03, W4-07, W4-09, W0-16, W6-03 | DR-22 |
| v2.154.0 (L1366) | 23-Sep | Layer Switches in One Red: Off, Unlock and Ref Show Which Layers Ar... | LE-CORE (UI) | **NOT-CONSIDERED** | W2-36, W3-13, W1-28, W2-21 | DR-01 |
| v2.153.0 (L1391) | 23-Sep | Box Select Over a Viewport: a Drag That Moves Nothing Draws the Box | LE-TOOLS | **NOT-CONSIDERED** TV-confirmed | W3-03, W2-21 | - |
| v2.152.0 (L1428) | 23-Sep | Dimension Line Weight and Line Style: Line pt and Dashed Lines in t... | LE-DRAW | **NOT-CONSIDERED** | W3-12, W1-26, W1-18, W1-28 | DR-01 |
| v2.151.0 (L1481) | 22-Sep | The Boolean Keys: Shift+U Union, Shift+S Subtract, Shift+T Trim and... | LE-DRAW/KEYS | **NOT-CONSIDERED** | W2-41, W3-03, W1-36, W3-07 | DR-01, DR-18, DR-33 |
| v2.150.0 (L1552) | 22-Sep | Boolean Tools and Vectors With Holes: Union, Subtract, Trim, Inters... | LE-DRAW | **NOT-CONSIDERED** | W2-27, W2-41, W1-13, W3-07, W3-03 | DR-01, DR-18 |
| v2.149.0 (L1669) | 22-Sep | The Move Anchor: Ctrl+Click an Item, Put the Red Cross on a Point,... | LE-TOOLS | **NOT-CONSIDERED** | W2-25, W3-03, W3-04 | DR-01, DR-40 |
| v2.148.0 (L1757) | 22-Sep | Project Floor Areas: One Master List of Floors Across Every Sheet,... | LE-AREAS | **NOT-CONSIDERED** | W3-17, W3-10, W1-27 | DR-01, DR-14 |
| v2.147.0 (L1795) | 22-Sep | Leaderless Notes: Whole Specification Groups Listed on a Sheet With... | LE-SPEC | **NOT-CONSIDERED** | W2-32, W1-21, W1-13, W1-19 | DR-01 |
| v2.146.0 (L1901) | 22-Sep | Three Guards Round the Project File: a Draft Is Judged Before It Go... | PERSIST | **NOT-CONSIDERED** | W1-07, W0-12, W1-05, W1-06 | DR-01, DR-30 |
| v2.145.0 (L2006) | 22-Sep | The Browser Draft of Unsaved Sheets Comes Back After a Reload, Whic... | LE-CORE | **NOT-CONSIDERED** | W1-07, W1-05, W1-21 | DR-01, DR-30 |
| v2.144.0 (L2084) | 22-Sep | A Specification Note Is Reworded Beside the Drawing, Spell-Checked... | LE-SPEC/SPELL | **NOT-CONSIDERED** | W2-34, W2-35, W3-03, W0-18 | DR-01, DR-20 |
| v2.143.0 (L2253) | 22-Sep | Overspill Note Regions: Boxes Drawn Anywhere on a Sheet That Hold t... | LE-SPEC | **NOT-CONSIDERED** | W2-22, W2-32, W3-11, W3-03 | DR-01 |
| v2.142.0 (L2384) | 22-Sep | A Viewport Groups With Its Notes, and What Is Placed Inside an Open... | LE-TOOLS | **NOT-CONSIDERED** | W2-21, W1-28, W3-03 | DR-01 |
| v2.141.0 (L2506) | 22-Sep | A Leader Travels With What It Is Moved With, and a Group Takes Its... | LE-TOOLS | **NOT-CONSIDERED** | W2-21, W3-03, W1-28, W1-14 | DR-01 |
| v2.140.0 (L2594) | 22-Sep | Hide Swings: a Roof Plan No Longer Draws the Top Storey's Door Swin... | PL/LE-VIEWPORT | **NOT-CONSIDERED** | W2-11, W2-16, W3-15, W1-22 | DR-01, DR-16 |
| v2.139.1 (L2700) | 21-Sep | Project Data Is Always Asked of the CDN, So a Tab Never Runs on a P... | SHELL (loader) | NOT-DRAWING ‡ | - | - |
| v2.139.0 (L2720) | 21-Sep | Round Up to 5 mm: a Dimension Can Show Its Figure Raised to the Nex... | LE-DRAW | **NOT-CONSIDERED** | W1-13, W2-26, W3-12, W1-28 | DR-01 |
| v2.138.0 (L2800) | 21-Sep | Viewports Turn on the Page: a Round Grip Off the Top of the Frame T... | LE-VIEWPORT | **NOT-CONSIDERED** | W1-14, W3-06, W3-03 | DR-01 |
| v2.137.0 (L2909) | 21-Sep | The Snap Marker Sits ON the Corner It Found: at 32x It Was Painted... | LE-TOOLS | **NOT-CONSIDERED** | W2-42, W2-24, W1-28 | DR-01 |
| v2.136.0 (L3013) | 21-Sep | Dimensioning a Heavy Plan: the Pointer Move Drops From 12 ms to Hal... | LE-VIEWPORT | **NOT-CONSIDERED** | W1-14, W1-28, W1-21, W5-01 | DR-01, DR-40 |
| v2.135.0 (L3158) | 21-Sep | An Author Zooms In to 6400%; the Web Viewer Still Stops at 800% | LE-CORE | **NOT-CONSIDERED** | W1-36 | DR-01 |
| v2.134.0 (L3216) | 21-Sep | The Cabinet Infill Is Held by Its Bottom Left Corner, Fitted by Any... | LE-SCRAP | **NOT-CONSIDERED** | W2-38 | DR-01 |
| v2.133.0 (L3302) | 21-Sep | The Browser's Colour Mixer Opened a Screen Away From the Field; It... | COLOUR | **NOT-CONSIDERED** | W1-37, W1-38 | DR-01, DR-20 |
| v2.132.0 (L3375) | 21-Sep | Tag the Face and It Fills: Hard Standing and Paving in Two Greys, a... | LE-SITE | **NOT-CONSIDERED** | W2-14 | DR-01, DR-08 |
| v2.131.0 (L3436) | 21-Sep | The Drawing Axes Overlay (F9): SketchUp's Red and Green Axes, Carri... | LE-TOOLS | **NOT-CONSIDERED** | W2-18, W2-42, W3-05 | DR-01 |
| v2.130.0 (L3544) | 21-Sep | The Vector Editor Could Draw a Line and a Rectangle and Move Their... | LE-DRAW | **NOT-CONSIDERED** | W2-27, W2-28, W1-14, W3-07 | DR-01, DR-18 |
| v2.129.0 (L3651) | 21-Sep | A Picked Vertex Was White on White Paper Once Zoomed In; a Grip Now... | LE-TOOLS | **NOT-CONSIDERED** | W2-19, W2-42, W3-03, W3-05 | DR-01 |
| v2.128.0 (L3801) | 21-Sep | A Cabinet Infill for the Scrapbook: Adam's Dashed Cross and Boxed N... | LE-SCRAP | **NOT-CONSIDERED** | W2-38, W2-37 | DR-01 |
| v2.127.0 (L3906) | 21-Sep | A Paste on Another Sheet Brings Its Layer: Found by Name, or Made W... | LE-TOOLS | **NOT-CONSIDERED** | W2-21, W1-20, W1-21, W3-03 | DR-01 |
| v2.126.0 (L3982) | 21-Sep | A Colour Palette Opens Above Every Colour Field; a Hatch Gets Its O... | COLOUR/LE-DRAW | **NOT-CONSIDERED** | W1-37, W1-17, W2-29, W3-12 | DR-01, DR-19, DR-20 |
| v2.125.0 (L4125) | 21-Sep | A Room's Label Starts in the Middle of Its Box, and in Edit Mode It... | LE-AREAS | **NOT-CONSIDERED** | W1-27, W3-10 | DR-01, DR-14 |
| v2.124.0 (L4193) | 21-Sep | Undo, Redo, Fit and the Zoom Readout Leave the Drawing Toolbar; The... | LE-CORE (UI) | **NOT-CONSIDERED** | W1-35, W5-01 | DR-01, DR-40 |
| v2.123.0 (L4231) | 21-Sep | A Right Click Moves Anything to Another Drawing Layer, and a Layer... | LE-TOOLS | **NOT-CONSIDERED** | W2-21, W3-13, W1-20, W3-03 | DR-01, DR-17 |
| v2.122.0 (L4366) | 21-Sep | A Drawing Title's Underline Runs Five Millimetres Past Its Words, a... | LE-SCRAP | **NOT-CONSIDERED** | W2-37, W1-26, W3-13 | DR-01 |
| v2.121.0 (L4436) | 21-Sep | Sheet Pictures Are Stored at Print Size, Not Render Size: a 13.8 MB... | LE-REG (images) | **NOT-CONSIDERED** | W1-16, W3-18, W3-09 | DR-01, DR-13 |
| v2.120.0 (L4504) | 21-Sep | The Project Portal Block's Code Is a Soft Grey, Not Black; the Titl... | LE-TITLE (QR) | **NOT-CONSIDERED** | W1-15, W1-26, W2-38 | DR-01, DR-12, DR-43 |
| v2.119.0 (L4561) | 21-Sep | Copy Arrays, SketchUp's Way: Drag a Copy, Type 1000 and Enter, Then... | LE-TOOLS | **NOT-CONSIDERED** | W3-03, W1-13, W2-23, W3-04 | DR-01, DR-40 |
| v2.118.0 (L4661) | 21-Sep | The Measurements Box Froze the Moment a Move Began, and a Move Coul... | LE-TOOLS | **NOT-CONSIDERED** | W3-03, W3-01, W3-04, W2-23 | DR-01 |
| v2.117.0 (L4766) | 21-Sep | Ctrl-Drag Copies, as in SketchUp LayOut: Duplicate and Move Are One... | LE-TOOLS | **NOT-CONSIDERED** | W3-03, W3-04, W2-21, W2-25 | DR-01, DR-40 |
| v2.116.0 (L4851) | 21-Sep | Sheet Images: a Picture on a Drawing Is Filed Under That Drawing's... | LE-REG (images) | **NOT-CONSIDERED** | W1-16, W3-18, W3-02, W3-09, W0-18 | DR-01, DR-13 |
| v2.115.0 (L4979) | 21-Sep | M Was Never Stuck: Every Click on the Paper Left the Keyboard in Wh... | KEYS | **NOT-CONSIDERED** | W1-29, W1-30, W1-36, W0-03 | DR-01, DR-33 |
| v2.114.0 (L5072) | 21-Sep | The Drawing Grid: SketchUp LayOut's Grid, Shown on F6 and Snapped T... | LE-TOOLS | **NOT-CONSIDERED** | W2-18, W3-05, W1-14 | DR-01 |
| v2.113.0 (L5206) | 21-Sep | Ortho Mode on F8, as in AutoCAD: a Held Shift, Latched - and Shift... | LE-TOOLS | **NOT-CONSIDERED** | W2-18, W3-05, W1-14 | DR-01 |
| v2.112.0 (L5324) | 21-Sep | Page Down Turns the Drawing, Ctrl+S Saves the Register, and Opening... | KEYS/LE-CORE | **NOT-CONSIDERED** ‡ | W1-36, W1-04, W4-10, W1-32 | DR-01, DR-11, DR-33 |
| v2.111.0 (L5404) | 21-Sep | Zoom Now, Redraw When It Rests: a Wheel Notch Was Rebuilding Things... | LE-VIEWPORT | **PENDING-SIGNOFF** | W1-28, W2-18, W1-36 | DR-01 |
| v2.110.0 (L5496) | 21-Sep | Three Tool Sets, Three Keyboards: a Letter Typed Into a Statement I... | KEYS | **NOT-CONSIDERED** | W1-29, W1-30, W1-32 | DR-01, DR-10, DR-33 |
| v2.109.0 (L5575) | 21-Sep | The Big Sheets Give the Small Title Block Cells Air, the Rev Cell S... | LE-TITLE | **NOT-CONSIDERED** | W1-22, W2-38 | DR-01 |
| v2.108.0 (L5635) | 21-Sep | The Scan Me Button's Handset Now Looks Like the Phone in Somebody's... | LE-TITLE (QR) | **NOT-CONSIDERED** | W2-38 | DR-01, DR-12 |
| v2.107.0 (L5662) | 21-Sep | Draft Mode, on LayOut's Own Key: A Heavy Sheet Was Never Slow to Dr... | LE-VIEWPORT | **PENDING-SIGNOFF** | W2-18, W2-16, W3-05 | DR-01 |
| v2.106.0 (L5787) | 21-Sep | The Layers List Was Only Ever the Order of the Viewports; Now It Is... | LE-CORE | **NOT-CONSIDERED** | W1-28, W1-19, W1-13 | DR-01 |
| v2.105.0 (L5925) | 21-Sep | A Floor Plan Is One Storey: Its Cut Picks the Floor, and Every Othe... | PL | **PENDING-SIGNOFF** | W2-43, W2-06, W2-15 | DR-01, DR-16 |
| v2.104.0 (L6030) | 21-Sep | A Room's Area Is Not Something to Store, It Is a Question to Ask th... | LE-AREAS | **NOT-CONSIDERED** | W1-27, W3-10, W3-17, W1-20 | DR-01, DR-14 |
| v2.103.0 (L6147) | 21-Sep | Every Pixel of the Depth Fog Was a Colour That Does Not Exist, and... | DRAW-CORE (fog) | **NOT-CONSIDERED** | W1-03, W1-09 | DR-01, DR-15 |
| v2.102.0 (L6201) | 21-Sep | The Project Portal Block Was Placed, Not Set: Every Gap Was a Basel... | LE-TITLE (QR) | **NOT-CONSIDERED** | W2-38 | DR-01, DR-12, DR-43 |
| v2.101.0 (L6251) | 21-Sep | The Fields Were the Gaps: Grassland, Rough Grassland and a Light Gr... | LE-SITE | **NOT-CONSIDERED** | W2-16, W1-17, W2-14 | DR-01, DR-08 |
| v2.100.0 (L6345) | 21-Sep | A Drawing Can Now Ask to Be Scanned: the Project Portal Block, Whos... | LE-TITLE (QR) | **NOT-CONSIDERED** | W2-38, W1-15, W2-37 | DR-01, DR-12, DR-43 |
| v2.99.0 (L6431) | 21-Sep | Four Things Wrong With a Statement Read on Paper - a Buried Heading... | LE-STMT | **NOT-CONSIDERED** | W4-15, W4-12, W4-14 | DR-01, DR-10 |
| v2.98.0 (L6509) | 21-Sep | A Viewport Would Not Take the Arrow-Key Axis Lock, Because It Was N... | LE-TOOLS | **NOT-CONSIDERED** ‡ | W3-03, W2-25, W3-04, W2-13 | DR-01 |
| v2.97.0 (L6573) | 20-Sep | A Picture in a Statement Can Now Be Placed and Trimmed From Its Own... | LE-STMT | **NOT-CONSIDERED** | W4-11, W4-12, W4-15 | DR-01, DR-10 |
| v2.96.0 (L6666) | 20-Sep | The Bar Belongs Under the Far Corner of the Building, Not Under the... | LE-SCRAP | **NOT-CONSIDERED** | W2-37 | DR-01 |
| v2.95.0 (L6771) | 20-Sep | The Statements a Project Is Won On Were the One Document the App Co... | LE-STMT | **NOT-CONSIDERED** ‡ | W4-04, W4-05, W4-06, W4-12, W4-13, W4-15, W4-16, W2-13 | DR-01, DR-10 |
| v2.94.0 (L6950) | 20-Sep | An Elevation Drew the Coach House Forty Metres Back as Hard as the... | DRAW-CORE (fog) | **NOT-CONSIDERED** | W1-09, W2-03, W2-12, W2-16 | DR-01, DR-15 |
| v2.93.0 (L7119) | 20-Sep | The Enhance Whitecard Effect Had One Setting, and That Setting Was... | LE-VIEWPORT | **PENDING-SIGNOFF** | W2-09, W2-16, W1-23, W1-38 | DR-01 |
| v2.92.0 (L7224) | 20-Sep | One Group's Images, Because the Whole Project Is a Long Job on a Ma... | PM | NOT-DRAWING ‡ | - | - |
| v2.91.0 (L7326) | 20-Sep | You Cannot Read the Specification and Tag a Drawing at the Same Tim... | LE-SPEC | **NOT-CONSIDERED** | W2-35, W1-32, W1-38, W2-30 | DR-01 |
| v2.90.0 (L7464) | 20-Sep | A Hatch Stopped Being a Site Plan Thing and Became Something Any Ve... | LE-DRAW | **NOT-CONSIDERED** ‡ | W1-17, W1-26, W2-29, W3-12 | DR-01, DR-08, DR-19 |
| v2.89.0 (L7530) | 20-Sep | A Site Plan Is Two Different Drawings, and the Panel That Tuned The... | LE-SITE | **NOT-CONSIDERED** | W2-14, W1-13, W2-16 | DR-01, DR-08 |
| v2.88.0 (L7624) | 20-Sep | The Site Address Was Only Ever Written Down in a Quotation, and Not... | LE-TITLE (record) | DELIBERATE ‡ | W1-12 | - |
| v2.87.0 (L7678) | 20-Sep | A Plan Knew How High It Was Cut and Not Which Floor That Was | DRAW-CORE | **PENDING-SIGNOFF** | W1-08, W2-10 | DR-01 |
| v2.86.0 (L7788) | 20-Sep | A Nudged Slider Could Move Every Drawing, and the Save Button Under... | DRAW-CORE | **PENDING-SIGNOFF** | W1-06, W1-10, W2-04, W2-05 | DR-01 |
| v2.85.0 (L7925) | 20-Sep | The Noodle Has Two Ends, and People Reach for Different Ones | LE-SCRAP | PORTED | VV v2.68.0 | - |
| v2.84.0 (L7979) | 20-Sep | The Compass Was Bigger Than the House, and Both It and the Planes W... | DRAW-CORE | **PARTIAL** | VV v2.67.0; W1-01, W1-11, W2-40, W2-01 | - |
| v2.83.0 (L8066) | 20-Sep | The Top Bar Knows When It Is Not Wanted, and Neither Crossing Is a... | SHELL/LE-CORE (UI) | **PARTIAL** (S11: PORTED) † | VV v2.70.0; W1-33 | DR-39 |
| v2.82.0 (L8181) | 20-Sep | Every Plan and Elevation Has a Plane You Can See, Grab and Snap - a... | DRAW-CORE | **PENDING-SIGNOFF** | W2-40, W2-01, W1-01 | DR-01 |
| v2.81.0 (L8314) | 20-Sep | A Drawing Can Be Scanned Into Its Own Model - Once Its Address Was... | LE-TITLE (QR) | **NOT-CONSIDERED** | W1-15, W1-22, W1-26 | DR-01, DR-12 |
| v2.80.0 (L8447) | 20-Sep | The App Had Been Calling the Green Axis North, and Adam Had Been Co... | DRAW-CORE | PORTED | VV v2.67.0 | - |
| v2.79.1 (L8549) | 20-Sep | When the Paper Runs Out, the Title Gives Way Before the Date Does | LE-TITLE | PORTED | VV v2.66.0 | - |
| v2.79.0 (L8604) | 19-Sep | A Title Block Cell Is a Width in Millimetres, Not a Share of the Pa... | LE-TITLE | PORTED | VV v2.66.0 | - |
| v2.78.1 (L8721) | 19-Sep | jsPDF's align Does Not Know About Letter-Spacing, So the Letterhead... | LE-SPEC/REG | PORTED | VV v2.66.1 | - |
| v2.78.0 (L8777) | 19-Sep | Selecting Something Is the First Half of Moving It, So Select Now P... | LE-TOOLS | **NOT-CONSIDERED** | W3-01, W3-03, W3-04, W5-01 | DR-01, DR-40 |
| v2.77.0 (L8878) | 19-Sep | The Tab and the Noodle Were Both in the Pictures, and I Read Them a... | LE-SCRAP | PORTED | VV v2.68.0 | - |
| v2.76.1 (L8962) | 19-Sep | DWG No. | LE-REG | **REOPENED** (S11: DELIBERATE) † | W0-15, W4-18, W4-10 | DR-11 |
| v2.76.0 (L8989) | 19-Sep | Two More Scrapbooks, a Scale Bar That Reads the Drawing Above It, a... | LE-SCRAP | PORTED | VV v2.68.0 / v2.69.0 | - |
| v2.75.0 (L9118) | 19-Sep | Safari Reads the First Manifest and Never Looks Again, and the Firs... | SHELL (PWA) | **NOT-CONSIDERED** (S11: NOT-DRAWING) † | W2-21, W0-08 | DR-01, DR-07 |
| v2.74.0 (L9208) | 19-Sep | One Client, One Site, One Place to Type Them | LE-TITLE | PORTED | VV v2.65.0 | - |
| v2.73.0 (L9306) | 19-Sep | Ctrl+S Had to Blur Before It Could Save, Because the Button Was Get... | LE-CORE | PORTED | VV v2.62.0 | - |
| v2.72.0 (L9364) | 19-Sep | Three Greys, Three Shadows and Three Letterheads for One Pack of Do... | LE-CORE (UI) | PORTED | VV v2.60.0 | - |
| v2.71.0 (L9445) | 19-Sep | A Drawing Number Was Three Facts in a Trench Coat, and Renumbering... | LE-REG | **REOPENED** (S11: DELIBERATE) † | W1-13, W1-19, W1-21, W1-22 | DR-11 |
| v2.70.0 (L9545) | 19-Sep | The Number Was Typed Twice and Shown Twice: a Tab Reads "D03 - 3D I... | LE-CORE | PORTED | VV v2.61.0 | - |
| v2.69.0 (L9676) | 19-Sep | The Register Was Never Given Its Font, So Every Reader Invented One | LE-REG (pdf fonts) | **REOPENED** (S11: DELIBERATE) † | W1-25, W4-18 | DR-11, DR-21 |
| v2.68.2 (L9778) | 19-Sep | Two Modules Describing a Menu That No Longer Exists: a Port That Ne... | PM | N/A | - | - |
| v2.68.1 (L9856) | 19-Sep | The Floor Was Shading Itself: a Grazing View Reads the Ground as It... | 3D | NOT-DRAWING | VV v2.59.1 | - |
| v2.68.0 (L9936) | 19-Sep | Twelve Rows of Buttons, and Only One of Them Belonged to the Scene... | PM | PORTED | VV v2.63.0 | - |
| v2.67.0 (L10127) | 19-Sep | An Hour of Drawing Sat Behind One Button, and Ctrl+W Never Asked | LE-CORE | **PARTIAL** (S11: PORTED) † | VV v2.62.0; W0-08, W1-07 | DR-07 |
| v2.66.0 (L10197) | 19-Sep | The Settle Was Buying Sixteen Copies of the Same Noise, and the Mon... | 3D | NOT-DRAWING | VV v2.59.0 | - |
| v2.65.2 (L10296) | 18-Sep | The Drawing Keeps the Finger: an iPad Was Turning the Page Every Ti... | LE-PUB (viewer) | PORTED | VV v2.58.1 | - |
| v2.65.1 (L10433) | 18-Sep | Walk Mode Stops Colliding With a Line Nothing Draws | 3D | NOT-DRAWING | VV v2.56.1 | - |
| v2.65.1 (L10352) | 18-Sep | The Viewer Keeps the Tabs, and the Page Is Where the Drawing Ends | LE-PUB (viewer) | PORTED | VV v2.58.0 | - |
| v2.65.0 (L10456) | 18-Sep | The Public Web Is a Viewer, Not a Disabled Editor | LE-PUB (viewer) | **PARTIAL** (S11: PORTED) † | VV v2.58.0; W2-20, W3-03 | - |
| v2.64.1 (L10549) | 18-Sep | A Moved Hopper Is a New Model: Content Stamps, and a Force Render T... | LE-VIEWPORT/PL | PORTED | VV v2.57.0 | - |
| v2.64.0 (L10612) | 18-Sep | Drawing Tabs Stay Rendered: the Viewport Cache | LE-VIEWPORT | PORTED | VV v2.57.0 | - |
| v2.63.2 (L10686) | 18-Sep | Linetype Linework Is a Drawing Layer, So the 3D Render Stops Drawin... | PL | PORTED | VV v2.56.1 | - |
| v2.63.1 (L10733) | 18-Sep | A Line Tagged Dashed in SketchUp Arrives Dashed on the Sheet | PL | PORTED | VV v2.56.1 | - |
| v2.63.0 (L10805) | 17-Sep | The Specification Is a Document Now: It Has a Revision, a Number, a... | LE-SPEC | PORTED | VV v2.56.0 | - |
| v2.62.0 (L10873) | 17-Sep | A Downloaded Sheet Is Named After the Drawing, Not After the App | LE-PUB (pdf) | PORTED | VV v2.55.0 | - |
| v2.61.1 (L10925) | 17-Sep | Viewport Captions Stop Eating Their Own Scale | LE-TITLE (chrome) | PORTED | VV v2.54.1 | - |
| v2.61.0 (L10982) | 17-Sep | The Title Block Says What Paper It Is, and Names Every Scale On the... | LE-TITLE | PORTED | VV v2.54.0 | - |
| v2.60.0 (L11048) | 17-Sep | Dimensions You Can Grab, Constrain, Type Into and Slide | LE-DRAW | PORTED | VV v2.53.0 | - |
| v2.59.0 (L11151) | 17-Sep | Container Editing, the Move Tool, and Dimensions You Can Actually Edit | LE-TOOLS | PORTED | VV v2.52.0 | - |
| v2.58.2 (L11297) | 17-Sep | The Progressive Renderer Was Rebuilding Its Buffer on Every Chunk | 3D (+LE) | **PARTIAL** | VV v2.54.0; W2-07, W1-19, W2-16 | - |
| v2.58.0 (L11399) | 17-Sep | Arrow Keys Constrain a Vertex Drag, a Typed Length Can Be Retyped,... | LE-TOOLS | PORTED | VV v2.52.0 | - |
| v2.57.0 (L11474) | 17-Sep | Match Properties to a Whole Selection, and One Markup Panel Open at... | LE-TOOLS | **PARTIAL** (S11: PORTED) † | VV v2.51.0; W2-36 | - |
| v2.56.2 (L11547) | 16-Sep | Carousel Holds Opaque Longer on First Reveal; Mobile Swap Breakpoin... | SHELL | NOT-DRAWING | VV v2.50.1 | - |
| v2.56.1 (L11568) | 16-Sep | Mobile Menu Swap: Also Trigger on Near-Square/Portrait Windows | SHELL | NOT-DRAWING | VV v2.49.1 | - |
| v2.56.0 (L11588) | 16-Sep | The Progressive Renderer, and the Tools Menu Brought Into Line With... | 3D/SHELL | VV-ORIGIN | VV v2.48.0-v2.48.1 | - |
| v2.55.0 (L11691) | 15-Sep | Layout Editor Sorted Into Numbered Subfolders, the Same as ValeVision | LE-CORE (structure) | VV-ORIGIN | VV v2.47.0 | - |
| v2.54.0 (L11779) | 14-Sep | Margin Notes Spread Out When the Column Has Room | LE-SPEC | PORTED | VV v2.44.0 | - |
| v2.53.0 (L11832) | 14-Sep | Scrapbook - Drag the Mapping Data Credentials and the North Point o... | LE-SCRAP | DELIBERATE | host VV v2.68.0 | DR-08 |
| v2.52.0 (L11894) | 14-Sep | Rotate Text - a Round Grip Turns a Text Box | LE-DRAW | PORTED | VV v2.41.0 | - |
| v2.51.0 (L11980) | 14-Sep | Project Specification, Read - the Notes as A4 Pages, to Print or Re... | LE-SPEC | PORTED | VV v2.43.0 | - |
| v2.50.0 (L12020) | 14-Sep | Zoom Inside a 3D Viewport - Frame the Picture, Enter to Keep It | LE-VIEWPORT | PORTED | VV v2.42.0 | - |
| v2.49.1 (L12116) | 14-Sep | Site Plan Tabs Look Like Every Other Tab | LE-SITE | **PENDING-SIGNOFF** | W1-34, W5-02 | DR-01, DR-08 |
| v2.49.0 (L12130) | 14-Sep | Site Plan Drawings, Part 2 - Site Plan Viewports at 1:500 and 1:1250 | LE-SITE | **PENDING-SIGNOFF** | W2-14, W2-16, W1-13 | DR-01, DR-08 |
| v2.48.1 (L12193) | 14-Sep | Doors Stay Shut on Elevations and Sections | PL | **PENDING-SIGNOFF** | W2-06, W1-23, W2-11, W2-15 | DR-01, DR-16 |
| v2.48.0 (L12259) | 14-Sep | Site Plan Drawings, Part 1 - Drawing Type, Tab Order and the Site P... | LE-SITE | **PENDING-SIGNOFF** | W2-14, W1-19, W1-34, W4-10 | DR-01, DR-08 |
| v2.47.0 (L12306) | 14-Sep | Type a Length While Dragging a Viewport | LE-TOOLS | PORTED | VV v2.39.0 | - |
| v2.46.0 (L12330) | 14-Sep | Type a Length While Dragging a Vertex | LE-TOOLS | PORTED | VV v2.35.0 | - |
| v2.45.0 (L12355) | 14-Sep | Vector Moves Snap to the Linework; Shift-Click Inserts a Vertex | LE-TOOLS | PORTED | VV v2.35.0 | - |
| v2.44.0 (L12382) | 14-Sep | Vector Undo, Redo, Copy, Paste and Duplicate | LE-TOOLS | PORTED | VV v2.35.0 | - |
| v2.43.0 (L12417) | 14-Sep | Dimension End Size - Resize Ticks, Arrows and Dots Per Dimension | LE-DRAW | PORTED | VV v2.34.0 | - |
| v2.42.0 (L12452) | 14-Sep | Doors Stand Open on Plans - Click One to Close It | PL/LE-VIEWPORT | **PENDING-SIGNOFF** | W2-06, W2-11, W1-02, W2-16, W3-15 | DR-01, DR-16 |
| v2.41.0 (L12545) | 14-Sep | Fixed Length Extension Lines - Dimensions Stand Clear of the Drawing | LE-DRAW | **PENDING-SIGNOFF** | W1-26, W1-19, W1-38, W3-12 | DR-01 |
| v2.40.0 (L12632) | 14-Sep | The Measurements Box and Drawing at Scale - Type the Size, Draw It... | LE-TOOLS | **PARTIAL** | VV v2.35.0; W1-18, W2-26, W3-12 | - |
| v2.39.0 (L12719) | 14-Sep | Save Sheets Says Where the Sheets Went - R2 and a Local Copy | PERSIST | **PARTIAL** | W1-05, W0-12 | - |
| v2.38.1 (L12796) | 14-Sep | Base Images Stop Showing Lines Through Faces - The Line Bias Was 75... | LE-VIEWPORT (3D) | **PENDING-SIGNOFF** | W1-03, W1-23, W2-15 | DR-01 |
| v2.38.0 (L12845) | 14-Sep | Viewport Frames Switch Off - Set Out With Them, Then Title the Draw... | LE-VIEWPORT | **PENDING-SIGNOFF** | W1-26, W1-19, W3-15 | DR-01 |
| v2.37.0 (L12893) | 14-Sep | Projected Linework Matches the 3D View - Joins Between Wall Pieces... | PL | **PENDING-SIGNOFF** ‡ TV-confirmed | W2-43, W2-06 | DR-31 |
| (unnumbered, 14-Sep) | 14-Sep | Dashed edges on vectors (TV LineStyleTool 1.0.0) | LE-DRAW | PORTED | VV v2.40.0 | - |
| (unnumbered, 14-Sep) | 14-Sep | Group / Ungroup (Ctrl+G) and multi-item copy (TV Groups 1.0.0, Item... | LE-TOOLS | PORTED | VV v2.38.0 | - |
| (unnumbered, 14-Sep) | 14-Sep | Eyedropper matches unlocked viewports (TV eyedropper 1.6.0; plan ro... | LE-TOOLS | **PARTIAL** | VV v2.36.0; W2-21, W1-26, W3-15 | - |
| (unnumbered, 14-Sep) | 14-Sep | Dimension text leader: drag the value off the line (TV DimensionGeo... | LE-DRAW | PORTED | VV v2.37.0 | - |
| v2.36.0 (L12978) | 14-Sep | Project Specification & Margin Notes - Notes Numbered by Their Plac... | LE-SPEC | PORTED | unrecorded (commit 66937440, ~14-Sep) | - |
| v2.35.0 (L13141) | 14-Sep | Leaders & Annotation Bubbles - a Note or a Specification Code on a... | LE-DRAW | PORTED | VV v2.32.0 | - |
| v2.34.0 (L13270) | 14-Sep | Box Select - A Window to the Right, a Crossing to the Left | LE-TOOLS | PORTED | VV v2.33.0 | - |
| v2.33.0 (no TV devlog entry) | 13-Sep | Drawing Layers: a grip to reorder, Lock / Unlock (TV plan section 1... | LE-CORE (UI) | PORTED | VV v2.31.0 | - |
| v2.32.1 (L13399) | 13-Sep | A Refused Snapshot Upload No Longer Claims a Picture R2 Never Received | LE-VIEWPORT | PORTED | VV v2.31.1 | - |
| v2.32.0 (L13479) | 13-Sep | Model Source - Existing and Proposed on One Sheet, the Same View of... | LE-VIEWPORT | **REOPENED** (S11: DELIBERATE) † | W1-01, W2-16 | DR-09 |
| v2.31.0 (L13611) | 13-Sep | Ortho Dimensions - Hold Shift for Horizontal or Vertical - and Snap... | LE-DRAW | PORTED | VV v2.29.0 | - |
| v2.30.2 (L13693) | 13-Sep | The Drawing View Reads Its Own Config | DRAW-CORE | **PARTIAL** (S11: N/A) † | W0-17, W2-08 | - |
| v2.30.1 (L13787) | 13-Sep | Undo Stops Saving the Project Behind Your Back | LE-CORE | PORTED | VV v2.64.0 | - |
| v2.30.0 (L13843) | 13-Sep | The Palette - Shift+B Sets What You Draw Next | LE-TOOLS | PORTED | VV v2.27.0 | - |
| v2.29.0 (L13905) | 13-Sep | Gradient Fills - Fade a Drawing Out Into the Page | LE-DRAW | PORTED | VV v2.26.0 | - |
| v2.28.0 (L14009) | 13-Sep | Viewports Copy, Paste and Snap Into Line - Set One Up Once, Line Th... | LE-TOOLS | **PARTIAL** | VV v2.35.0; W2-25, W3-04, W3-06 | DR-40 |
| v2.27.0 (L14263) | 13-Sep | Edge Styles - Walls Black, Windows Grey, Furniture Faint | LE-VIEWPORT/PL | PORTED ‡ | VV v2.28.0 + v2.30.0; residual: W2-08 | - |
| v2.27.0 (L14096) | 13-Sep | The Rectangle Tool - Corner to Corner, Then It Is Just a Polygon | LE-DRAW | PORTED | VV v2.25.0 | - |
| v2.26.1 (L14180) | 13-Sep | Vectors Redraw, the Click Stops Waiting on the Disk, and Vectors Sn... | LE-CORE | PORTED | VV v2.24.0 | - |
| v2.26.0 (L14462) | 12-Sep | The Eyedropper - Make That One Look Like This One | LE-TOOLS | PORTED | VV v2.24.0 | - |
| v2.25.0 (L14530) | 12-Sep | Supersampling - The Pixel Stops Guessing | 3D/LE-VIEWPORT | PORTED | VV v2.22.0 / v2.23.0 | - |
| v2.24.0 (L14644) | 11-Sep | The Drawing Editor Arrives - Tabs, Sheets, Viewports at Scale | LE-CORE | VV-ORIGIN | VV v2.21.x (origin); DevGate + harnesses back in VV v2.22.0 | - |

#### E.1.5 Reverse index: package -> TV releases it carries *(generated)*

For the Parity Scribe and the Port Records, in landing (K3 topological) order. Release numbers drop the `v2.` prefix;
**bold** = the package is the release's primary owner. Packages that carry no release (foundations, transport, scribe passes, the TrueVision lane)
are omitted.

| Package | Title (K3) | TV releases it carries (primary in bold) |
|---|---|---|
| W0-03 | Hotkey file names (name only) and identity hygiene | 115.0 |
| W0-08 | Shared Whitecardopedia service-worker package (prepared, not bumped) | **67.0**, 75.0 |
| W0-12 | VV transport facade at TV's paths: Na__CfApi and Na__LocalMirror (V... | 39.0, 146.0 |
| W0-15 | Layout Editor config foundation: AppConfig additive pass, ConfigSta... | **76.1** |
| W0-16 | Vendor and asset copies: jsPDF 4.1.0, html2canvas 1.4.1, PDF.js 3.1... | 155.0 |
| W0-17 | index.html start-up order aligned with TrueVision | **30.2** |
| W0-18 | Flask blueprints and app-root content: sheet images and user config... | 116.0, 144.0 |
| W1-01 | Render-loop overlays registry, IsPaused, model-toggle exports and t... | **32.0**, 82.0, **84.0** |
| W1-02 | Door module to the TV 1.9.0 contract, plus FindDoorGroups | 42.0 |
| W1-03 | Drawing-quality prerequisites: ortho depth bias and the supersample... | **38.1**, **103.0** |
| W1-04 | Transitions 1.1.0: the walk exit only when asked | 112.0 |
| W1-05 | Drawings data module: TV ProjectData 1.6.0 whole over the VV facade | **39.0**, 145.0, 146.0 |
| W1-06 | Draft core and the shared Dev-row shell | **86.0**, 146.0 |
| W1-08 | Floor plan storey level and TV's data-module convention | **87.0** |
| W1-09 | Elevation depth-fog pure modules (49 leaves, inert) | **94.0**, 103.0 |
| W1-10 | Elevation auto-name, identity statement and data module 1.1.0 (with... | 86.0 |
| W1-11 | North: Show Compass (TV 1.1.0 whole) | 84.0 |
| W1-12 | Project identity accessors: the document code and ProjectRecord's r... | **88.0** |
| W1-13 | Layout Editor pure leaves A: markup, records, numbering, scales, si... | 49.0, **71.0**, 89.0, 106.0, 119.0, **139.0**, 147.0, 150.0, **160.0** |
| W1-14 | Layout Editor pure leaves B: rotation, curves, drafting-aid state,... | 113.0, 114.0, 130.0, **136.0**, **138.0**, 141.0 |
| W1-15 | Project QR code (53) switched off, with a VV ProjectLink | **81.0**, 100.0, **120.0**, 162.0, 166.0 |
| W1-16 | Sheet Images render leaves (54), ahead of the shared-core ports | **116.0**, **121.0** |
| W1-17 | Hatch patterns leaf and the app-root hatch library | **90.0**, 101.0, 126.0 |
| W1-18 | GradientTool 1.1.0 and LineStyleTool 1.1.0 | **40.0**, 152.0 |
| W1-19 | Sheet record schema: SheetRecords 1.39.0 with the layer-stack restack | 38.0, 41.0, 48.0, 58.2, 71.0, 106.0, 147.0 |
| W1-20 | SheetModel units to TV level, with AreaGroups | 104.0, 123.0, 127.0 |
| W1-23 | Render signature alignment and the Describe stub (no behaviour change) | 38.1, 48.1, 93.0 |
| W1-29 | Key scope and the 3D hotkey guard | **110.0**, **115.0** |
| W1-30 | Document keyboard (31__System__DocumentKeys) | 110.0, 115.0 |
| W1-31 | Loader facade 1.2: TV's editor entry points, view names and the reg... | 158.0 |
| W1-32 | ModeController core realignment (feature-independent TV hunks) | 91.0, 110.0, 112.0, 158.0 |
| W1-33 | First-open veil and the header fold exactly as TV (Adam's "top nav... | **83.0** |
| W1-34 | Tab strip 2.0.0 with the Drawings menu, through the loader | 48.0, **49.1**, **158.0** |
| W1-21 | SheetModel facade 1.35.1, Sheets 1.4.0, History 1.7.0 and the late... | 71.0, 127.0, 136.0, 145.0, 147.0 |
| W1-07 | AutoSave 1.5.0 and the project-file draft guard | 67.0, **145.0**, **146.0** |
| W1-35 | Toolbar subtractive phase (TV 1.17.0/1.19.0) | **124.0** |
| W1-22 | Sheet identity: Document ID values, title blocks (Cells 1.2.0, Mode... | 71.0, 81.0, **109.0**, 140.0 |
| W1-25 | Embedded PDF fonts (PdfFonts) and Open Sans Medium | **69.0** |
| W1-26 | Chrome primitives and markup geometry: SheetChrome 1.14.0, ShapeGeo... | **38.0**, **41.0**, 81.0, 90.0, 120.0, 122.0, 152.0, 14-Sep eyedropper |
| W1-27 | Floor Areas core modules (inert, ahead of the hub and MarkupBridge) | **104.0**, **125.0**, 148.0 |
| W1-28 | Paint order: the Layers list is the stack (SheetSurface 1.13.0, Mar... | **106.0**, **111.0**, 136.0, 137.0, 139.0, 141.0, 142.0, 152.0, 154.0 |
| W1-36 | Navigation 1.3.0 and Controls 1.4.0/1.1.0 with the ModeController k... | 111.0, **112.0**, 115.0, **135.0**, 151.0 |
| W1-37 | Colour palette (54__Feature__ColourPalette) | **126.0**, **133.0** |
| W1-38 | PanelHost 1.6.0 and the panel stylesheet (TV Styles__Panels verbatim) | 41.0, 91.0, 93.0, 133.0 |
| W2-07 | Progressive-render remainder of TV v2.58.2 | **58.2** |
| W2-09 | Render-style quick wins: Enhance 1.1.0 strength and RenderComposite... | **93.0** |
| W2-08 | Main config: profile-line keys aligned with TV for drawing bakes | **27.0**, 30.2 |
| W2-10 | Viewport titles: ViewportTitleText 1.1.0 and the identity config (s... | 87.0 |
| W2-14 | Site-plan client leaves, dormant: GlbParse, Store on the VV facade,... | **48.0**, **49.0**, **89.0**, 101.0, **132.0** |
| W2-20 | Context menu 1.1.0 flyouts and the hover tooltip | **65.0** |
| W2-21 | SheetTools leaf modules, first set: EditScope 1.4.0, ItemClipboard... | **75.0**, 117.0, **123.0**, **127.0**, **141.0**, **142.0**, 153.0, 154.0, **14-Sep eyedropper** |
| W2-22 | Note-regions tool leaf (NoteRegions__Tool 1.0.0, inert ahead of the... | **143.0** |
| W2-23 | Measurements box 1.10.0 (with the Say echo line the drafting aids i... | 118.0, 119.0 |
| W2-27 | Vector tools pure leaves (State, Setup, Config, Geometry, Offset, B... | **130.0**, **150.0** |
| W2-30 | Specification lockstep core and transport over the VV facade, with... | 91.0, **157.0**, **163.0** |
| W2-32 | Notes margin layout: regions placement, the leaderless panel file a... | 143.0, **147.0** |
| W2-40 | Drawing Planes core leaves landed inert: Maths, ConfigState, AppCon... | **82.0**, 84.0 |
| W2-01 | Drawing Planes (47__System__DrawingPlanes) with its start-up and st... | 82.0, 84.0 |
| W2-03 | Elevation Depth Fog core and 3D wiring (render layer, Dev row, comp... | 94.0 |
| W2-04 | Floor Plans Dev menu rebuild (TV 2.0.0 editor and row builders) wit... | 86.0 |
| W2-05 | Elevations Dev menu rebuild (TV 2.1.0 editor and row builders, fog... | 86.0 |
| W2-12 | Depth fog on sheets: Viewport2d__DepthFog leaf, the composites dept... | 94.0 |
| W2-34 | Spell check (55__Feature__SpellCheck) with the Vale dictionary route | **144.0** |
| W2-42 | Object snap leaves landed inert: State, Geometry, Glyphs, Index, So... | 129.0, 131.0, **137.0** |
| W2-19 | Object snap switch-over: Search, Moves, GridMoves, controller, Menu... | **129.0** |
| W2-18 | Drafting-aid modules: Draft mode, Drawing Grid, Ortho mode and Draw... | **107.0**, 111.0, **113.0**, **114.0**, **131.0** |
| W2-24 | Grips 1.12.0 and its Paper CSS (painted on the point) | 137.0 |
| W2-25 | Move anchor and viewport snap move modules (inert; gestures switche... | **28.0**, 98.0, 117.0, **149.0** |
| W2-26 | Drawing tools onto object snap, grid and ortho (DimensionTool 1.12.... | 40.0, 139.0 |
| W2-28 | Vector tools interactive units, part 1, landed inert: Preview, Targ... | 130.0 |
| W2-29 | Patterns panel and the hatch ready chain | 90.0, 126.0 |
| W2-31 | Specification lockstep question card, bar status 1.3.0 and their wi... | 163.0 |
| W2-36 | Dependency-free panel fixes (Text 1.4.0, Styles 1.7.0, Shapes 1.8.x... | **57.0**, **154.0** |
| W2-37 | Parametric Scrapbook engine and core types to TV (engine 1.7.0, Sca... | **96.0**, 100.0, **122.0**, 128.0 |
| W2-35 | Specification Scrapbook (LE/58) and the left Specification tab | **91.0**, 144.0, 163.0 |
| W2-38 | New parametric element types landed inert: Cabinet Infill and the P... | **100.0**, **102.0**, **108.0**, 109.0, 120.0, **128.0**, **134.0** |
| W2-41 | Vector tools part 2 landed inert: Offset and Boolean tools, the ada... | 150.0, **151.0** |
| W2-43 | Projected linework new leaves landed inert: FlushJoins and Storeys | **37.0**, **105.0**, **159.0** |
| W2-06 | Projected linework (folder 50) to TV HEAD: flush joins, seams occlu... | 37.0, **42.0**, **48.1**, 105.0 |
| W2-11 | Plan doors leaf (PlanDoors 1.3.0, inert until the viewport converge... | 42.0, 48.1, **140.0** |
| W2-13 | Linework modifiers: VV LineworkSettings extension and the model-lay... | 95.0, 98.0 |
| W2-15 | SnapshotRenderer realignment to TV 1.13.0 (DIV-1 hunk replay, one o... | 38.1, 48.1, 105.0 |
| W2-16 | Viewport units whole-file convergence with Model Source and the sit... | 32.0, 42.0, 49.0, 58.2, 89.0, 93.0, 94.0, **101.0**, 107.0, 140.0 |
| W2-39 | Site-plan legend element and its link landed inert (dormant with si... | **164.0** |
| W3-01 | SheetTools hub sub-wave A: SheetTools__State 1.8.0 and ToolState 1.7.0 | **78.0**, 118.0 |
| W3-18 | Sheet Images storage and publish units and the stylesheet (inert) | 116.0, 121.0 |
| W3-02 | Sheet Images editing set (inert): Crop, Menu, Insert, Handles, Pane... | 116.0 |
| W3-03 | SheetTools hub sub-wave B (atomic): HitResolution 1.11.0, PointerPr... | 65.0, 78.0, **98.0**, **117.0**, **118.0**, **119.0**, 123.0, 127.0, 129.0, 138.0, 141.0, 142.0, 143.0, 144.0, 149.0, 150.0, 151.0, **153.0** |
| W3-04 | Gesture changes switched on (DR-40 items 7-10): auto-Move, Ctrl-dra... | 28.0, 78.0, 98.0, 117.0, 118.0, 119.0, 149.0 |
| W3-05 | Drafting aids switched on: Drawing Grid panel and attach, Drawing A... | 107.0, 113.0, 114.0, 129.0, 131.0 |
| W3-06 | Rotatable viewports: ViewportHandles 1.5.0, Viewport3dZoom 1.1.0, V... | 28.0, 138.0 |
| W3-07 | Vector tools and Booleans switched on: ShapeTool 1.10.0 and the Mod... | 130.0, 150.0, 151.0 |
| W3-09 | Sheet Images switched on: ModeController wiring, the Images panel a... | 116.0, 121.0 |
| W3-10 | Floor Areas switched on | 104.0, 125.0, 148.0 |
| W3-11 | Overspill note regions UI: region grips, the regions panel and Marg... | 143.0 |
| W3-12 | Dimensions and Vectors panels to TV (Panel__Dimensions 1.7.0, Panel... | 40.0, 41.0, 90.0, 126.0, 139.0, **152.0** |
| W3-13 | Layers panel 1.3.0 with the Ref switch, and ViewportLink 1.5.1 | 122.0, 123.0, 154.0 |
| W3-15 | Viewport panel to TV 1.10.0 (Frame, Rotation, Doors, Hide swings, a... | 38.0, 42.0, 140.0, 14-Sep eyedropper |
| W3-16 | PdfExporter full re-sync to TV 1.12.0 | 160.0 |
| W3-17 | Area Schedule parametric element (registered by the W3-14 panel) | 104.0, **148.0** |
| W3-14 | Parametric Scrapbook panel 1.8.0 and config to TV (all element type... | 164.0 |
| W4-01 | Published schema (53__Data__Layout__PublishedSchema) and the VV fix... | **155.0**, 166.0 |
| W4-17 | Published reader leaves landed inert: Paint, Urls, Config, Styles,... | 155.0, **156.0** |
| W4-02 | Published reader document closure: Document, Sheet, Elements, Viewp... | 155.0, 156.0 |
| W4-03 | Publisher bakers and transport (65: Raster, Sheet, Viewports, Trans... | 155.0, 160.0 |
| W4-04 | Statement Writer markdown engine (inert): Tokenise, Inline, Render,... | **95.0**, 165.0, 167.0 |
| W4-05 | Statement Writer pure modules (inert): data index, images, editor m... | 95.0, 170.0, 171.0, 172.0 |
| W4-15 | Statement Writer stylesheets (inert, verbatim) | 95.0, 97.0, **99.0** |
| W4-16 | Statement Writer standard sections (inert): Contents, Drawing Sched... | 95.0, 162.0, 167.0, 168.0 |
| W4-06 | Statement data, transport binding, reader and manager | 95.0, 157.0, **169.0**, 170.0, **171.0**, 172.0 |
| W4-07 | Publish orchestration and the share-link record (65 Publish__ and P... | 155.0, 166.0 |
| W4-08 | Document sharing: Share buttons and Open (66), SpecEditor Bar 1.4.0... | **166.0** |
| W4-18 | Drawing Register core landed inert: Data, DeleteDialog, Transaction... | 69.0, 76.1, 167.0 |
| W4-10 | Drawing Register on: Editor, Export, stylesheet, the Document Regis... | 48.0, 76.1, 112.0 |
| W4-09 | The web viewer shows published drawings (WebViewer 1.2.0, viewer gu... | 155.0, 156.0 |
| W4-11 | Context-menu renderer leaf and stylesheet (27__System__ContextMenuS... | **97.0** |
| W4-12 | Statement writing surface, standard registry, PDF, publish and the... | 95.0, 97.0, 99.0, 157.0, **162.0**, **165.0**, **167.0**, **168.0**, 169.0, **170.0**, 171.0, **172.0** |
| W4-13 | Statement Writer wiring: ModeController, loader facade and the Desi... | 95.0, 158.0 |
| W4-14 | Statement tests, fixtures and the statement test server | 99.0, 162.0, 168.0, 171.0, 172.0 |
| W5-01 | Toolbar taken whole at TV 1.24.0 | 78.0, 124.0, 136.0 |
| W5-02 | Stylesheet convergence: Styles__Main, Styles__Main__Paper, Boot and... | 49.1 |
| W6-03 | Legacy retirements: 35 PageLayoutSystem, 91 2dElevationsView, the o... | 155.0 |

---

### E.2 System-by-system parity matrix

Counts are files at the same relative path in the paired folders (`ref/drift_all.tsv`, VV folder translated to its TV
twin): **Both** = present in both, split into identical, header-only (code equal, comment/header lines differ) and
drifted; **diff lines** are the shared files' changed lines. TV-only folders are counted from `ref/tree_tv.tsv`.
"Open TV releases naming it" counts the open releases of E.1.4 whose TV devlog entry names a file in that folder or
the folder itself (so a hub such as `LE/07` or `LE/30` collects many; a change described only by function names is not
counted).

#### E.2.1 Top-level drawing folders 40-55 and the drawing-adjacent TV-only folders *(generated)*

| VV now -> K2 target (TF id) | TV folder | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Lines TV / VV | Diff lines (shared) |
|---|---|---|---|---|---|---|---|---|---|
| 40__System__2dElevationsView -> 91__System__2dElevationsView (TF-T20) | - | 0 | 0 | 0 | 0 | 0 (0) | 8 (2,407) | 0 / 2,407 | 0 |
| 41__System__CrossSectionView (kept, TF-T21) | 41__System__SectionCutEngine | 0 | 0 | 0 | 0 | 7 (2,638) | 7 (3,697) | 2,638 / 3,697 | 0 |
| 42__System__DrawingViewCore -> 40__System__DrawingViewCore (TF-T22) | 40__System__DrawingViewCore | 15 | 0 | 7 | 8 | 6 (2,493) | 2 (967) | 7,754 / 5,637 | 1,989 |
| 43__System__FloorPlanViews -> 42__System__FloorPlanViews (TF-T23) | 42__System__FloorPlanViews | 10 | 0 | 3 | 7 | 2 (564) | 0 (0) | 5,427 / 4,255 | 2,610 |
| 44__System__PlanAnnotations -> 43__System__PlanAnnotations (TF-T24) | 43__System__PlanAnnotations | 8 | 0 | 7 | 1 | 0 (0) | 0 (0) | 3,193 / 3,285 | 176 |
| 45__System__PlanDimensions -> 44__System__PlanDimensions (TF-T25) | 44__System__PlanDimensions | 15 | 0 | 13 | 2 | 0 (0) | 0 (0) | 6,958 / 6,727 | 795 |
| 46__System__ElevationViews -> 45__System__ElevationViews (TF-T26) | 45__System__ElevationViews | 13 | 0 | 5 | 8 | 2 (464) | 0 (0) | 7,449 / 6,276 | 3,559 |
| 47__System__NorthDirection -> 46__System__NorthDirection (TF-T27) | 46__System__NorthDirection | 8 | 0 | 5 | 3 | 0 (0) | 0 (0) | 2,091 / 2,080 | 323 |
| (none) -> 47__System__DrawingPlanes (TF-T39) | 47__System__DrawingPlanes | 0 | 0 | 0 | 0 | 9 (3,967) | 0 (0) | 3,967 / 0 | 0 |
| (none) -> 48__System__CrossSectionViews (TF-T40) | 48__System__CrossSectionViews | 0 | 0 | 0 | 0 | 1 (198) | 0 (0) | 198 / 0 | 0 |
| (none) -> 49__System__ElevationDepthFog (TF-T41) | 49__System__ElevationDepthFog | 0 | 0 | 0 | 0 | 8 (2,203) | 0 (0) | 2,203 / 0 | 0 |
| 50__System__ProjectedLinework (kept, TF-T28) | 50__System__ProjectedLinework | 25 | 0 | 11 | 14 | 3 (1,435) | 0 (0) | 11,834 / 9,845 | 1,522 |
| 51__System__LayoutEditor (kept, TF-T29) | 51__System__LayoutEditor | 155 | 2 | 40 | 113 | 186 (72,656) | 6 (2,740) | 150,637 / 62,817 | 29,838 |
| (none) -> 52__System__Layout__PublishedDocuments (TF-T42) | 52__System__Layout__PublishedDocuments | 0 | 0 | 0 | 0 | 11 (3,998) | 0 (0) | 3,998 / 0 | 0 |
| (none) -> 53__Data__Layout__PublishedSchema (TF-T43) | 53__Data__Layout__PublishedSchema | 0 | 0 | 0 | 0 | 4 (1,138) | 0 (0) | 1,138 / 0 | 0 |
| (none) -> 54__Feature__ColourPalette (TF-T44) | 54__Feature__ColourPalette | 0 | 0 | 0 | 0 | 6 (1,821) | 0 (0) | 1,821 / 0 | 0 |
| (none) -> 55__Feature__SpellCheck (TF-T45) | 55__Feature__SpellCheck | 0 | 0 | 0 | 0 | 7 (1,804) | 0 (0) | 1,804 / 0 | 0 |
| (none) -> 27__System__ContextMenuSystem (TF-T38) | 27__System__ContextMenuSystem | 0 | 0 | 0 | 0 | 9 (2,754) | 0 (0) | 2,754 / 0 | 0 |
| (none) -> 80__CloudflareIntegration (TF-T49) | 80__CloudflareIntegration | 0 | 0 | 0 | 0 | 2 (1,222) | 0 (0) | 1,222 / 0 | 0 |

#### E.2.2 Top-level systems: what is missing and what to do

| System (K2 target, TF id) | Open TV releases naming it | Key gaps (TV versions; evidence) | Recommended action and packages |
|---|---|---|---|
| 40__System__DrawingViewCore (VV 42 -> 40, TF-T22) | 8: 30.2, 39.0, 86.0 ... 145.0, 146.0 | ProjectData 1.2.0 -> 1.6.0 (save steps, IsLoaded, payload guard; v2.39.0, v2.86.0, v2.145.0, v2.146.0; S12-F10, S02a-F05); draft system DraftGuard/DraftMaths/DrawingUsage/DevRowShell (v2.86.0; S02a-F07..F09: VV Dev rows still write drawings live); Transitions 1.1.0 opt-in walk exit (v2.112.0; S03a-V03); Drawing2d keys (v2.27.0/v2.30.2; S09-F33). VV ahead: StyleRows is wired in VV and dead in TV (S11-V03). | Renumber in W0-02 (ComposerPreset -> RenderPreset path, FR-09). Then W1-04, W1-05, W1-06, W2-08; ThumbnailBake kept and offered (WT-06). Never port TV ProfileLines (DIV-1). |
| 41__System__CrossSectionView (kept, TF-T21) vs TV 41__System__SectionCutEngine | 1: 94.0 | Different engines, same role (DIV-2). TV's 41 never ports; TV code reaches sections through the SectionAdapter, which in VV lacks Serialize/Apply, outline width, SetModelRoot and RenderDepthInto (W2-02). Scene-activation event names differ (S09-F37). | keep_vv_divergence (DR-26, DR-41). W2-02 completes VV's adapter; TD06 schema fix is TV-side (WT-02). |
| 42__System__FloorPlanViews (VV 43 -> 42, TF-T23) | 3: 82.0, 87.0, 140.0 | Storey level StoreyLevel + StoreyRow + data 1.1.0 (v2.87.0; S02a-F23); Dev editor and row builders 2.0.0 rebuild with drafts and planes (v2.82.0, v2.86.0; S02a-F25, S02a-F26); TV editors pass the presentation config where VV data modules expect a drawings block (S02a-F04, critical). | W0-02 renumber; W1-08 (storey, data-module convention); W2-04 (Dev menu 2.0.0) keeping VV seams: mode controller 1.2.2, Styles/Exclusions rows (D33), Ground Floor quick action (D11), thumbnail bake (DR-32). |
| 43__System__PlanAnnotations (VV 44 -> 43, TF-T24) | 1: 126.0 | 7 of 8 shared files differ in headers only; the code gap is the colour-palette attach on the annotation toolbar swatch (v2.126.0). | W0-02 renumber; W1-37 (palette attach). |
| 44__System__PlanDimensions (VV 45 -> 44, TF-T25) | 0 | VV is ahead: its Data/Editor import the split ConfigState/EditorPreview; TV's split landed as files only and is unwired (S02b-F08, S11-V03). 13 of 15 shared files differ in headers only. | W0-02 renumber; keep_vv_divergence (never copy TV Data/Editor); W0-03 banner fix; TV rewire is WT-01 (DR-42 item 7). |
| 45__System__ElevationViews (VV 46 -> 45, TF-T26) | 2: 82.0, 86.0 | Auto-name and identity AutoName/AutoNameText (v2.86.0; S02a-F30); Dev editor 2.1.0 and row builders with planes, drafts, auto names, fog block (S02a-F31, S02a-F32); data module 1.1.0 with fog accessors; fog-source hook in the mode controller (v2.94.0). | W0-02 renumber; W1-10, W2-05 (with the 48 placeholder), W2-03 (fog hook); keep VV mode controller 1.1.1, D28 filing seam (DR-26), Styles/Exclusions rows (DR-32). |
| 46__System__NorthDirection (VV 47 -> 46, TF-T27) | 1: 84.0 | Show Compass needs TV CompassGizmo/DevMenu 1.1.0 whole, which needs the render-loop InteractiveOverlays registry (v2.84.0 half; S02a-F39). | W0-02 renumber; W1-01 (registry), W1-11 (North 1.1.0 whole). |
| 47__System__DrawingPlanes (TV-only, TF-T39) | 2: 82.0, 84.0 | Planes you can see, grab and snap for every plan and elevation, 9 files, 3,967 lines (v2.82.0, v2.84.0; S02a-F42, S01-F06). Supersedes VV's live FacePick/GizmoGrip (dead in TV since v2.82.0; S11-V09). | Add: W2-40 (leaves inert), W2-01 (switch-on with start-up and stylesheet wiring). Gate DR-01. |
| 48__System__CrossSectionViews (TV-only, TF-T40) | 1: 86.0 | Placeholder Dev panel 0.1.0 (v2.86.0) whose DOM ids collide with VV-only ids (DR-26). | Add with W2-05 after renaming VV's two VV-only ids (DR-26). |
| 49__System__ElevationDepthFog (TV-only, TF-T41) | 2: 94.0, 103.0 | Elevation depth fog (v2.94.0) and its colour fix (v2.103.0), 8 files, 2,203 lines (S01-F08, S02b-F38); sheets need Viewport2d__DepthFog and a render-frame callback VV's tiled renderer lacks (S04a-F30, DIV-1). | Add: W1-09 (pure leaves inert), W2-03 (core and 3D wiring), W2-12 (sheets). Gate DR-15. |
| 50__System__ProjectedLinework (kept, TF-T28) | 7: 32.0, 37.0, 42.0 ... 140.0, 159.0 | 3D-matching rules FlushJoins/SeamsOcclude/LineworkFirst (v2.37.0, v2.159.0), door pose (v2.42.0, v2.48.1), storeys (v2.105.0), hide swings (v2.140.0), unlogged LineworkModifier styling (v2.95.0/v2.98.0 commits; S04a-F47); ClipKernel 1.2.0, CpuBackend 1.4.0, Projector 1.5.0, Pipeline 1.5.0, ConfigAccess 1.2.0 (S02b-F11..F21); ModelStage 1.1.0 hidden by a no_action row (S11-V01). | W2-43 (FlushJoins, Storeys inert), W2-06 (folder to TV HEAD), W1-02 (door module contract), W2-13 (modifiers), W0-14 (Persistence). Keep VV-only folder-50 integrations (S02b-V01). Gates DR-16, DR-31. |
| 52__System__Layout__PublishedDocuments (TV-only, TF-T42) | 2: 155.0, 156.0 | The published reader, 11 files, 3,998 lines (v2.155.0, v2.156.0); TV's web viewer shows published files only, VV's renders on the reader's device (S08-F01 critical, S08-F04, S01-V06). | Add: W4-17 (leaves inert), W4-02 (reader closure), W4-09 (viewer wiring). Gates DR-22, DR-25. |
| 53__Data__Layout__PublishedSchema (TV-only, TF-T43) | 2: 155.0, 166.0 | Shared publish/read contract, 4 files (v2.155.0, v2.166.0 share links; S08-F03). | Add with a VV fixture: W4-01. Gates DR-22, DR-29. |
| 54__Feature__ColourPalette (TV-only, TF-T44) | 2: 126.0, 133.0 | Palette over every colour field (v2.126.0) and mixer placement (v2.133.0), 6 files. | Add: W1-37 (+ PanelHost attach W1-38). Gate DR-20 (Vale palette name). |
| 55__Feature__SpellCheck (TV-only, TF-T45) | 1: 144.0 | Practice-dictionary spell check (v2.144.0), 7 files; needs a user-config route (TV ProjectVision UserConfig API). | Add: W2-34 with the Vale dictionary route from W0-18 (50__ValeVision__UserConfig). Gate DR-20. |
| 27__System__ContextMenuSystem (TV-only, TF-T38) | 1: 97.0 | TV's 3D right-click menu (9 files); the Statement Writer imports only its renderer (v2.97.0; S09-F26). | Renderer + stylesheet only with W4-11 (DR-10); the rest skipped for drawing parity (DR-44). |
| 80__CloudflareIntegration (TV-only, TF-T49) | 1: 116.0 | TV's transport client (Na__CfApi, 33 exports) over na-truevision-api; imported by TV ProjectData, SheetModel__Sheets, Panel__ScrapbookParametric, SpecData__Transport, presentation SceneData (S11 Appendix D) and statement publishing (S07b-F18). | Same path and names, VV bodies over whitecardopedia-editor-api and WCP Flask (FR-16, W0-12; DR-27). Never copy TV's body (gate G6). |
| 40__System__2dElevationsView (VV-only legacy -> 91, TF-T20) | 0 | VV's legacy elevation tool; its 2dProfileLines effect feeds VV's composer (DIV-1). | Move to 91 and 2dProfileLines to 05 (FR-01, FR-08; W0-02); retire later (FR-25, W6-03; DR-03). |

#### E.2.3 Layout Editor subfolders *(generated)*

| LE subfolder | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Lines TV / VV | Diff lines (shared) | K2 |
|---|---|---|---|---|---|---|---|---|---|
| 01__Core__Loader | 0 | 0 | 0 | 0 | 0 (0) | 3 (1,271) | 0 / 1,271 | 0 | TF-L01 keep |
| 03__Core__Config | 7 | 0 | 1 | 6 | 1 (1,267) | 1 (856) | 5,260 / 3,659 | 3,186 | TF-L02 keep |
| 05__Core__ModeController | 3 | 0 | 0 | 3 | 0 (0) | 0 (0) | 2,415 / 1,695 | 1,718 | TF-L03 keep |
| 07__Core__SheetData | 19 | 0 | 6 | 13 | 3 (778) | 1 (158) | 9,253 / 6,043 | 3,974 | TF-L04 keep |
| 10__Core__SheetSurface | 11 | 0 | 3 | 8 | 1 (479) | 0 (0) | 6,062 / 4,117 | 2,156 | TF-L05 keep |
| 15__Core__Markup | 6 | 0 | 0 | 6 | 3 (692) | 0 (0) | 4,586 / 3,151 | 1,239 | TF-L06 keep |
| 20__System__Viewports | 13 | 0 | 4 | 9 | 6 (2,095) | 0 (0) | 7,519 / 4,385 | 1,637 | TF-L07 keep |
| 21__System__SitePlanData | 0 | 0 | 0 | 0 | 2 (1,168) | 0 (0) | 1,168 / 0 | 0 | TF-L08 add |
| 25__System__RenderStyles | 8 | 0 | 2 | 6 | 2 (504) | 0 (0) | 3,400 / 2,224 | 1,300 | TF-L09 keep |
| 26__System__DraftMode | 0 | 0 | 0 | 0 | 4 (649) | 0 (0) | 649 / 0 | 0 | TF-L10 add |
| 27__System__DrawingGrid | 0 | 0 | 0 | 0 | 5 (1,451) | 0 (0) | 1,451 / 0 | 0 | TF-L11 add |
| 28__System__ObjectSnap | 0 | 0 | 0 | 0 | 16 (5,534) | 0 (0) | 5,534 / 0 | 0 | TF-L12 add |
| 30__System__SheetTools | 18 | 0 | 2 | 16 | 4 (1,116) | 1 (455) | 14,599 / 9,913 | 5,731 | TF-L13 keep |
| 31__System__DocumentKeys | 0 | 0 | 0 | 0 | 2 (457) | 0 (0) | 457 / 0 | 0 | TF-L14 add |
| 32__System__OrthoMode | 0 | 0 | 0 | 0 | 3 (438) | 0 (0) | 438 / 0 | 0 | TF-L15 add |
| 33__System__DrawingAxes | 0 | 0 | 0 | 0 | 3 (680) | 0 (0) | 680 / 0 | 0 | TF-L16 add |
| 35__System__DrawingTools | 9 | 2 | 2 | 5 | 0 (0) | 0 (0) | 3,730 / 3,533 | 515 | TF-L17 keep |
| 36__System__HatchPatternTools | 0 | 0 | 0 | 0 | 3 (1,480) | 0 (0) | 1,480 / 0 | 0 | TF-L18 add |
| 37__System__VectorTools | 0 | 0 | 0 | 0 | 18 (7,385) | 0 (0) | 7,385 / 0 | 0 | TF-L19 add |
| 40__Ui__Panels | 12 | 0 | 0 | 12 | 1 (240) | 0 (0) | 7,449 / 5,562 | 2,343 | TF-L20 keep |
| 50__Feature__Specification | 23 | 0 | 10 | 13 | 8 (3,866) | 0 (0) | 12,492 / 7,693 | 2,007 | TF-L21 keep |
| 51__Feature__DrawingRegister | 0 | 0 | 0 | 0 | 10 (3,659) | 0 (0) | 3,659 / 0 | 0 | TF-L22 add |
| 52__Feature__StatementWriter | 0 | 0 | 0 | 0 | 33 (16,898) | 0 (0) | 16,898 / 0 | 0 | TF-L23 add |
| 53__Feature__ProjectQrCode | 0 | 0 | 0 | 0 | 6 (1,895) | 0 (0) | 1,895 / 0 | 0 | TF-L24 add |
| 54__Feature__SheetImages | 0 | 0 | 0 | 0 | 17 (4,709) | 0 (0) | 4,709 / 0 | 0 | TF-L25 add |
| 55__Feature__Scrapbook | 4 | 0 | 2 | 2 | 0 (0) | 0 (0) | 1,226 / 1,087 | 295 | TF-L26 keep |
| 56__Feature__ScrapbookCustom | 5 | 0 | 3 | 2 | 0 (0) | 0 (0) | 1,393 / 1,406 | 165 | TF-L27 keep |
| 57__Feature__ScrapbookParametric | 9 | 0 | 0 | 9 | 5 (3,804) | 0 (0) | 10,276 / 4,247 | 2,677 | TF-L28 keep |
| 58__Feature__ScrapbookSpecification | 0 | 0 | 0 | 0 | 5 (2,220) | 0 (0) | 2,220 / 0 | 0 | TF-L29 add |
| 59__Feature__FloorAreas | 0 | 0 | 0 | 0 | 10 (4,222) | 0 (0) | 4,222 / 0 | 0 | TF-L30 add |
| 60__Feature__PdfExport | 2 | 0 | 1 | 1 | 1 (250) | 0 (0) | 1,016 / 523 | 377 | TF-L31 keep |
| 65__Feature__DocumentPublishing | 0 | 0 | 0 | 0 | 7 (2,604) | 0 (0) | 2,604 / 0 | 0 | TF-L32 add |
| 66__Feature__DocumentSharing | 0 | 0 | 0 | 0 | 7 (2,116) | 0 (0) | 2,116 / 0 | 0 | TF-L33 add |
| 70__DevTools__DevMenu | 1 | 0 | 0 | 1 | 0 (0) | 0 (0) | 305 / 413 | 224 | TF-L34 keep |
| 80__Feature__WebViewer | 5 | 0 | 4 | 1 | 0 (0) | 0 (0) | 2,091 / 1,895 | 294 | TF-L35 keep |
| **Total LE/** | **155** | **2** | **40** | **113** | **186 (72,656)** | **6 (2,740)** | **150,637 / 62,817** | **29,838** | |

The LE totals reproduce the orchestrator's figures: 341 TV files (150,637 lines) and 161 VV files (62,817 lines); 155
shared paths (2 identical, 40 header-only, 113 drifted, 29,838 changed lines), 186 TV-only files (72,656 lines), 6
VV-only (2,740 lines). Only `LE/35__System__DrawingTools` holds identical files (2). Seventeen TV subfolders have no
VV counterpart (21, 26, 27, 28, 31, 32, 33, 36, 37, 51, 52, 53, 54, 58, 59, 65, 66); one VV subfolder has no TV
counterpart (`01__Core__Loader`).

#### E.2.4 Layout Editor subfolders: what is missing and what to do

| LE subfolder | Open TV releases naming it | Key gaps (TV versions; evidence) | Recommended action and packages |
|---|---|---|---|
| 01__Core__Loader | 0 | VV-only lazy loader (3 files). It must expose every TV editor entry point (S09-F11, S03a-F24), list every ported LE stylesheet in TV's cascade order (S03a-F23, S10-F16) and host the boot veil (S10-F04). | keep (DR-24 a; offer to TV under DR-36): W1-31 facade, W1-33 boot veil, W1-34 strip; stylesheet list gated by W0-04's test. |
| 03__Core__Config | 34: 32.0, 40.0, 41.0 ... 149.0, 151.0 | AppConfig 356 key-level differences (S03a-F01); ConfigState barrel lacks nine re-exports (S03a-F06); KeyMap 1.0.0 vs 1.11.0 with a live fallback bug (S03a-F07); register, statement and picture blocks absent (S07a-F13, S07b-F31). | W0-15 (XL, atomic) first; W0-03 renames KeyMappings -> Na__Hotkeys__DrawingTabs (FR-12); feature rows by owners. |
| 05__Core__ModeController | 16: 30.2, 32.0, 40.0 ... 143.0, 158.0 | MC 1.18.0 vs 1.32.0, the integration hub (S03a-F13 critical); 27 TV-only imports block a whole-file take (S11 Appendix D); VV-only API and listeners must survive (S09-F12). | W1-32 core hunks; each feature package adds its own hunk; W5-03 convergence check. |
| 07__Core__SheetData | 35: 32.0, 38.0, 39.0 ... 150.0, 152.0 | SheetRecords 1.15.0 vs 1.39.0 (S03b-F01 critical); RestackLegacyLayers before paint order (S03b-F03); Document ID (v2.71.0; S07a-F14 critical); SheetModel facade 1.18.0 vs 1.35.1, Sheets 1.1.0 vs 1.4.0, Layers 1.0.0 vs 1.4.0 with a VV orphan bug (S03b-F06, F08, F10); NormaliseMarginNotes drops region keys (S06b-F23 critical); AutoSave 1.5.0 (S03b-F16). | W1-13 (leaves), W1-19 (SheetRecords 1.39.0), W1-20 (units + AreaGroups), W1-21 (facade, History), W1-07 (AutoSave), W1-22 (identity); DrawingCode leaf kept (WT-10 offer). |
| 10__Core__SheetSurface | 22: 38.0, 81.0, 90.0 ... 158.0, 164.0 | SheetChrome code 1.8.0 vs 1.14.0 (S03b-F23); SheetSurface 1.6.0 vs 1.13.0 (S03b-F24); zoom-settle event (v2.111.0; S04b-F06); hatch deck and holed polylines (S05b-F28); TV-only TitleBlock__QrCell (S07a-F33). | W1-26 (chrome), W1-28 (surface, paint order), W1-22 (Cells 1.2.0, Modern 1.5.0, QR cell). |
| 15__Core__Markup | 19: 40.0, 41.0, 90.0 ... 152.0, 160.0 | MarkupBridge 1.10.0 vs 1.20.0 (S03b-F26); ShapeGeometry 1.5.0 vs 1.9.0 as a hunk seam (S05b-F21, S04b-V03); TV-only PaintOrder, ShapeRings, DimensionRounding (S03b-F25, S05b-F11). | W1-13 (leaves), W1-26 (ShapeGeometry 1.9.0, DimensionGeometry 1.6.0), W1-28 (MarkupBridge 1.20.0). |
| 20__System__Viewports | 24: 28.0, 32.0, 42.0 ... 144.0, 164.0 | Viewport2d 1.8.0 vs 1.16.0 (S04a-F09); render entry points take different arguments (S04a-F06); TV-only PlanDoors, ModelSource, Viewport2d__SitePlan, Viewport2d__DepthFog, ViewportRotation, VectorQuality. | W1-14, W1-23, W2-10, W2-11, W2-12, W2-16 (one import cycle with Model Source and the painter), W3-06. |
| 21__System__SitePlanData | 4: 48.0, 49.0, 132.0, 155.0 | TV-only site-plan store and GLB parser (v2.48.0, v2.49.0, v2.132.0). | Add dormant: W2-14 (DR-08 B); live only with W5-06 (DR-08 A). |
| 25__System__RenderStyles | 12: 32.0, 38.1, 42.0 ... 105.0, 140.0 | SnapshotRenderer 1.7.0 vs 1.13.0 (S04a-F05, DIV-1 hunks); Enhance/RenderComposites percent weight (v2.93.0); ModelLayers, EdgeStyles (S04a-F21, F23); TV-only SitePlanComposites. | W2-15 (one owner, hunk replay), W2-09, W2-13, W2-16; SitePlanComposites leaf in W1-13. |
| 26__System__DraftMode | 2: 107.0, 111.0 | Draft mode on K (v2.107.0) and zoom-settle redraw (v2.111.0). | Add: W1-14 (state), W2-18, W3-05 (on). DR-01. |
| 27__System__DrawingGrid | 1: 114.0 | Drawing Grid F6/F7 (v2.114.0). | Add: W1-14, W2-18, W3-05 (on); defaults per DR-40 item 5. |
| 28__System__ObjectSnap | 17: 28.0, 96.0, 98.0 ... 149.0, 150.0 | Object snap folder (v2.129.0, v2.137.0), viewport snap move (v2.28.0), move anchor (v2.149.0); Sources statically imports VectorTools Curves (S05b-F08 critical load-order trap). | Add: W2-42 (leaves), W2-19 (switch-over; Snapping shim FR-14), W2-25 (anchor, snap move inert), W3-04 (gestures on, DR-40), W3-08 (retire Snapping, FR-15). |
| 30__System__SheetTools | 35: 32.0, 40.0, 41.0 ... 152.0, 153.0 | Hubs 12-15 TV versions behind: PointerDrag, PointerPress, HitResolution, Keyboard, orchestrator (S05a-F12..F16); TV-only CopyDrag, HoverTooltip, NoteTooltip, LayerMenu; unlogged ItemClipboard 1.3.0 (S05a-F22); 12 TV-only systems must exist first (S05a-F30 critical). | W2-20, W2-21, W2-23, W2-24, W3-01, W3-03 (XL, atomic hub), W3-04; W3-08 retires VV Snapping. |
| 31__System__DocumentKeys | 3: 110.0, 112.0, 115.0 | Document-tab keyboard (v2.110.0, v2.115.0). | Add: W1-30 (DR-33 a, inert until the register and statements). |
| 32__System__OrthoMode | 1: 113.0 | Ortho on F8 (v2.113.0). | Add: W1-14, W2-18, W3-05. |
| 33__System__DrawingAxes | 1: 131.0 | Drawing axes F9 (v2.131.0). | Add: W2-18, W3-05. |
| 35__System__DrawingTools | 11: 40.0, 41.0, 104.0 ... 150.0, 152.0 | DimensionTool 1.5.0 vs 1.12.0 plus an unlogged v2.152.0 hunk (S05b-F13); tools must move onto object snap, grid and ortho (S04b-F29) without the TONE import trap (S04b-F63). | W1-18 (Gradient/LineStyle 1.1.0), W2-26, W3-07 (ShapeTool 1.10.0). |
| 36__System__HatchPatternTools | 5: 89.0, 90.0, 101.0, 150.0, 164.0 | Hatch on any vector (v2.90.0), patterns panel, hatch line weight/colour (v2.126.0), site packs (v2.101.0). | Add: W1-17 (leaf + app-root library), W2-29 (panel). DR-19. |
| 37__System__VectorTools | 5: 129.0, 130.0, 138.0, 150.0, 151.0 | Trim/extend/join/split/offset/fillet/chamfer, circles, arcs (v2.130.0), Booleans and holes (v2.150.0, v2.151.0), 18 files. | Add: W1-14 (Curves), W2-27, W2-28, W2-41 (inert), W3-07 (on). DR-18. |
| 40__Ui__Panels | 29: 32.0, 38.0, 39.0 ... 152.0, 154.0 | PanelHost 1.4.0 vs 1.6.0 (S06a-F04); toolbar keeps buttons TV removed and lacks 11 tools (S06a-F06, F07); Panel__Text multi-select bug (S06a-F08); Viewport panel 1.4.1 vs 1.10.0 (S06a-F18); Dimensions/Vectors panels (S05b-F23, F24). | W1-38, W1-35, W2-36, W3-12, W3-13, W3-15, W4-10 (Panel__Sheet), W5-01 (toolbar whole). |
| 50__Feature__Specification | 9: 67.0, 69.0, 78.0 ... 147.0, 163.0 | SpecData barrel/State/Document behind (S06b-F07..F10); SpecMargin 1.3.0 vs 1.5.0 (S06b-F20); lockstep (S06b-F02); Reload Local loses an unsynced edit (S06b-F03); TV-only regions, leaderless notes, lockstep units. | W2-22, W2-30, W2-31, W2-32, W3-11; SpecPdf fonts with W1-25. |
| 51__Feature__DrawingRegister | 4: 69.0, 71.0, 112.0, 167.0 | Register tab, numbering, transactions, PDF (v2.69.0-v2.79.1, v2.112.0, v2.167.0); Editor statically imports 31, 65 and 66 (S07a-F22). | Add: W1-13 (Numbering), W4-18 (core inert), W4-10 (on). DR-11. |
| 52__Feature__StatementWriter | 14: 95.0, 97.0, 99.0 ... 171.0, 172.0 | Design Statements, 33 files, 16,898 lines, 12 releases v2.95.0-v2.172.0; NA planning content; live-file tests (S07b-F45). | Add last, switched off: W2-30 (Lockstep leaf), W4-04, W4-05, W4-06, W4-12 (XL), W4-13, W4-14, W4-15, W4-16. DR-10, DR-43. |
| 53__Feature__ProjectQrCode | 6: 81.0, 100.0, 120.0, 155.0, 162.0, 166.0 | Project QR, title-block QR cell and Portal block (v2.81.0 ... v2.162.0); NA URLs. | Add switched off with a VV ProjectLink: W1-15; Vale resolver W5-05 (DR-12, DR-43). |
| 54__Feature__SheetImages | 4: 116.0, 121.0, 129.0, 142.0 | Pictures on sheets filed by drawing number (v2.116.0, v2.121.0), 17 files; hub cycle (S05a-V01). | Add: W1-16, W3-18 (inert), W3-02, W3-09 (on); Flask route W0-18. DR-13, DR-29. |
| 55__Feature__Scrapbook | 2: 91.0, 134.0 | Scrapbook tab hover text (TV 1.2.1, v2.91.0; S06a-F24). | W1-32 (Panel__Scrapbook), W2-37 (TileDrag). |
| 56__Feature__ScrapbookCustom | 1: 104.0 | Measured-room portability hunk (v2.104.0; S06a-F27). | W2-36. |
| 57__Feature__ScrapbookParametric | 12: 87.0, 100.0, 102.0 ... 148.0, 164.0 | Engine TV 1.2.0 -> 1.7.0 (slide, choices, Refit, adopt, base; S06a-F32); grips (S06a-F36); ViewportLink Refit and FactsPatch (S06a-F35); panel's static NA-only imports (S06a-F38 critical). | W2-37, W2-38, W2-39 (types inert), W3-13, W3-14 (panel 1.8.0), W3-17 (Area Schedule). |
| 58__Feature__ScrapbookSpecification | 2: 91.0, 144.0 | Specification Scrapbook, the left Specification tab (v2.91.0, v2.144.0; S06a-F45). | Add: W2-35. |
| 59__Feature__FloorAreas | 5: 104.0, 106.0, 125.0, 148.0, 150.0 | Floor areas, 10 files (v2.104.0, v2.125.0, v2.148.0); touches about 25 shared modules (S06b-F38). | Add: W1-27 (core inert), W3-10 (on). DR-14. |
| 60__Feature__PdfExport | 11: 32.0, 49.0, 69.0 ... 143.0, 160.0 | PdfExporter 1.2.0 vs 1.12.0 (S08-F12); PdfFonts absent (S08-F13). | W1-24 (interim), W1-25 (PdfFonts), W3-16 (full re-sync). DR-21. |
| 65__Feature__DocumentPublishing | 2: 155.0, 160.0 | Publishing (v2.155.0, confirmed by Adam in TV; v2.160.0; statement publishing v2.170.0-v2.172.0 lives in LE/52). | Add: W4-03, W4-07. DR-22. |
| 66__Feature__DocumentSharing | 1: 166.0 | Share links (v2.166.0). | Add: W4-07, W4-08. DR-23. |
| 70__DevTools__DevMenu | 2: 32.0, 37.0 | Live-phase bake filter and the Layout Mode row. | W2-17 (DR-25 keeps the VV row). |
| 80__Feature__WebViewer | 3: 65.0, 155.0, 156.0 | WebViewer 1.1.0 vs 1.2.0 plus the unlogged published-reader integration (S08-F14). | W4-09 (DR-22, DR-25). |

#### E.2.5 Shared folders outside 40-55 that the drawing system imports *(generated)*

| Folder (same number both apps) | Both | Ident. | Header-only | Drifted | TV-only files (lines) | VV-only files (lines) | Diff lines (shared) |
|---|---|---|---|---|---|---|---|
| 01__AppCore | 3 | 0 | 1 | 2 | 1 (1) | 2 (394) | 2,036 |
| 02__AppData | 1 | 0 | 0 | 1 | 1 (221) | 3 (488) | 282 |
| 03__AppUtils | 4 | 0 | 1 | 3 | 3 (957) | 6 (1,370) | 987 |
| 06__Scene__LightingEffects | 2 | 0 | 1 | 1 | 0 (0) | 0 (0) | 45 |
| 10__NavigationAndCameras | 20 | 1 | 4 | 15 | 1 (354) | 1 (202) | 2,679 |
| 15__ModelLoader | 2 | 0 | 1 | 1 | 2 (560) | 0 (0) | 1,200 |
| 21__System__PresentationMode | 13 | 0 | 4 | 9 | 1 (196) | 4 (1,897) | 4,647 |
| 26__System__ToggleModelElements | 3 | 0 | 0 | 3 | 7 (1,856) | 0 (0) | 523 |
| 30__System__ImageExport | 8 | 0 | 3 | 5 | 0 (0) | 1 (184) | 1,906 |
| 70__System__DevTools | 4 | 0 | 1 | 3 | 2 (785) | 2 (404) | 1,094 |

These are wiring surfaces, not drawing systems: their drift is ported only where a drawing package needs it (for
example `03__AppUtils` KeyScope W1-29, ProjectLoader helpers W0-11, R2AssetUpload W0-14; `15__ModelLoader` ortho depth
bias W1-03; `01__AppCore` loading sequence W0-13, W2-07; `26__System__ToggleModelElements` PhaseLibrary W1-01). Their
TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group
and storey UI, `70` AssetCullDistance) belong to no slice and no K3 package (see the open issues). TV's
`15/Na__ModelLoader__MultiModel.js` imports two of them statically (`:94` LineworkColours, `:99` InstanceConsolidation),
so W1-03 must stay a hunk port of the ortho depth bias, never a whole-file take. `70` Cache & Storage is
the optional W5-04 (DR-44), and `10` `Na__Hotkeys__Manager.js` stays TV's twin of VV's own 3D hotkey handler (W1-29
only reads it as the reference for the key-scope gate).

---

### E.3 TV-only module inventory

265 TV-only files (100,039 lines): the 186 `LE/` files (72,656 lines) and 79 files
outside it (27,383 lines) - the TV-only top-level folders 27, 47, 48, 49, 52, 53, 54, 55 and 80, TV's 41
section engine, and the TV-only files inside the shared drawing folders 40, 42, 45, 50 and `03__AppUtils` (KeyScope,
LocalProjectMirror). Actions: decision-gated 173, adapted 35, verbatim 35, excluded 16, path/body/rename/no owner 6.

**Action vocabulary.** *verbatim* = take TV HEAD `b2aa9151` text, re-apply only the standard seams (banner token,
console prefix, PORT NOTE, VV-only exports; K3 R3); *adapted* = a slice finding records a VV seam beyond those
(transport through the VV facade, VV identity, VV config); *verbatim\** = no slice finding names the file, so the
package default (verbatim) applies; *gated* = a K1 decision changes scope, with its default in the cell (for example
"dormant (DR-08 B)" = ported, inert until Vale data exists; "switched off (DR-10)" = behind
`LayoutEditor__Statement__Enabled = false`); *excluded*, *path only*, *VV body* = the file is never copied (reason in
the cell). **Since** = the oldest TV release whose devlog entry names the file; where the file is never named, the
range of releases in the TV commit that added it (with the commit id), from `r5_git_intro.py`.

Summary by feature group *(generated)*:

| Group | Files | Lines | Packages | Decisions | Default action |
|---|---|---|---|---|---|
| A. Drawing core, planes, sections and fog (top level) | 35 | 12,527 | W0-02, W1-06, W1-08, W1-09, W1-10, W2-40, W2-01, W2-03, W2-05 | DR-15, DR-26 | adapted 15; excluded 8; gated, verbatim 6; gated, adapted 3; verbatim 2; path only 1 |
| B. Projected linework (50) | 3 | 1,435 | W2-43, W2-06 | DR-16, DR-31 | gated, adapted 3 |
| C. Drafting aids and object snap (LE 26, 27, 28, 32, 33) | 31 | 8,752 | W1-14, W2-42, W2-19, W2-18, W2-25 | DR-40 | verbatim 24; adapted 4; gated, verbatim* 2; gated, verbatim 1 |
| D. Keyboard scopes (LE 31, key files, KeyScope) | 4 | 1,961 | W0-03, W0-15, W1-29, W1-30 | DR-33 | gated, adapted 3; rename + content 1 |
| E. Vector tools, Booleans and hatching (LE 36, 37; ShapeRings) | 22 | 9,250 | W1-13, W1-14, W1-17, W2-27, W2-28, W2-29, W2-41 | DR-18, DR-19 | gated, verbatim 20; adapted 1; gated, adapted 1 |
| F. Site plans (LE 21; site-plan units) | 8 | 3,881 | W1-13, W2-14, W2-16, W2-39 | DR-08 | gated, verbatim 5; gated, adapted 2; gated, verbatim* 1 |
| G. Viewports, rotation, doors, quality, Model Source | 5 | 1,462 | W1-14, W2-12, W2-11, W2-16 | DR-09, DR-15, DR-16 | gated, adapted 2; adapted 2; gated, verbatim 1 |
| H. Sheet tools and records (shared LE subfolders) | 9 | 2,201 | W1-13, W1-20, W2-20, W2-21, W3-03 | DR-14, DR-17, DR-40 | adapted 6; gated, adapted 2; gated, verbatim 1 |
| I. Specification, notes, spell check, Specification Scrapbook (LE 50, 58; 55) | 20 | 7,890 | W2-22, W2-30, W2-32, W2-34, W2-31, W2-35, W3-11 | DR-20 | adapted 7; verbatim 6; gated, adapted 6; no owner 1 |
| J. Floor areas (LE 59; Area Schedule) | 11 | 4,890 | W1-27, W3-10, W3-17 | DR-14 | gated, verbatim 11 |
| K. Title block, Project QR and parametric types (LE 53; QR cell; Cabinet Infill) | 9 | 4,174 | W1-15, W1-22, W2-38 | DR-12, DR-43 | gated, adapted 4; gated, verbatim 3; verbatim 1; gated, verbatim* 1 |
| L. Drawing Register (LE 51) | 10 | 3,659 | W1-13, W4-18, W4-10 | DR-11 | gated, adapted 10 |
| M. Sheet Images (LE 54) | 17 | 4,709 | W1-16, W3-18, W3-02 | DR-13 | gated, adapted 17 |
| N. Statement Writer (LE 52) and its context-menu renderer (27) | 42 | 19,652 | W2-30, W4-04, W4-05, W4-15, W4-16, W4-06, W4-11, W4-12 | DR-10, DR-43 | gated, verbatim 20; gated, adapted 12; excluded 7; verbatim 1; verbatim (lands now with the spec lockstep, DR-10) 1; gated, verbatim* 1 |
| O. Publishing, sharing, published documents (LE 65, 66; 52, 53 top level) | 29 | 9,856 | W4-01, W4-17, W4-02, W4-03, W4-07, W4-08 | DR-22, DR-23 | gated, adapted 28; no owner 1 |
| P. PDF fonts | 1 | 250 | W1-25 | DR-21 | gated, adapted 1 |
| Q. Colour palette (54 top level) | 6 | 1,821 | W1-37 | DR-20 | gated, adapted 6 |
| R. Transport and project file (80; LocalProjectMirror) | 3 | 1,669 | W0-12 | - | VV body 2; excluded 1 |

App-root content and vendor folders that go with these modules (K2 TargetMaps section 4):

| TV folder | Files (lines) | VV target (K2) | Package | Decisions |
|---|---|---|---|---|
| `50__TrueVision__UserConfig/` | 1 (404) | `50__ValeVision__UserConfig/` (TF-R01), Vale dictionary | W0-18 | DR-20 |
| `52__LayoutEditor__HatchPatternLibrary/` | 24 (1,592) | same path (TF-R03); Construction pack first, Site Plan pack with DR-08 | W1-17 | DR-08, DR-19 |
| `01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/` | 1 | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/` with Vale's own scan, never TV's (TF-R04, FR-20) | W0-16 | DR-43 |
| `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0`, `06__Vendor__Html2Canvas__v1.4.1` | vendor | same paths (TF-R05, TF-R06, FR-19) | W0-16 | DR-03 |
| PDF.js 3.11.174 (TV loads it from PlanVision's NA path) | vendor | `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` (TF-R07; moved to W0 by K3 section 12) | W0-16 | DR-11 |

Per-file inventory *(generated)*. `LE/` = `TVM/51__System__LayoutEditor/`; file names are exact.


**A. Drawing core, planes, sections and fog (top level)** (35 files, 12,527 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js | 486 | 1.0.0 | v2.86.0 | adapted | W1-06 |
| TVM/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js | 491 | 1.0.0 | v2.86.0 | adapted | W1-06 |
| TVM/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js | 246 | 1.0.0 | v2.86.0 | verbatim | W1-06 |
| TVM/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js | 156 | 1.0.0 | v2.86.0 | verbatim | W1-06 |
| TVM/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js | 738 | 1.0.0 | v2.19.0 | excluded: DIV-1: VV keeps 05/Na__RenderEffect__2dProfileLines__ (K2 section 7) | - |
| TVM/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js | 376 | 1.1.0 | v2.94.0 | path only: FR-09 renames VV ComposerPreset to this path and names; VV body kept (DIV-1, DR-04) | W0-02 |
| TVM/41__System__SectionCutEngine/Na__SectionCut__CapGeometry__.js | 601 | 1.0.0 | v2.94.0 | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__CapMeshes__.js | 372 | 1.1.0 | v2.12.0-16.2 (f264be71) | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__ConfigState__.js | 298 | 1.0.0 | v2.12.0-16.2 (f264be71) | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__Engine__.js | 712 | 1.2.0 | v2.94.0 | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__Engine__AppConfig__.json | 22 | - | v2.94.0 | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__SceneData__.js | 342 | 1.0.0 | v2.94.0 | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js | 291 | 1.0.0 | v2.94.0 | excluded: DIV-2: VV keeps 41__System__CrossSectionView (TF-T21; DR-26, DR-41) | - |
| TVM/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__StoreyRow__.js | 227 | 1.0.0 | v2.87.0 | adapted | W1-08 |
| TVM/42__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js | 337 | 1.0.0 | v2.87.0 | adapted | W1-08 |
| TVM/45__System__ElevationViews/Na__Elevation__AutoNameText__.js | 176 | 1.0.0 | v2.86.0 | adapted | W1-10 |
| TVM/45__System__ElevationViews/Na__Elevation__AutoName__.js | 288 | 1.0.0 | v2.86.0 | adapted | W1-10 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json | 76 | - | v2.82.0 | adapted | W2-40 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__Bounds__.js | 382 | 1.0.0 | v2.82.0 | adapted | W2-40 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__ConfigState__.js | 356 | 1.0.0 | v2.82.0 | adapted | W2-40 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__DevMenu__Controls__.js | 397 | 1.0.0 | v2.82.0 | adapted | W2-01 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__Grip__.js | 824 | 1.0.0 | v2.82.0 | adapted | W2-01 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__Maths__.js | 411 | 1.0.0 | v2.82.0 | adapted | W2-40 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__Overlay__.js | 828 | 1.1.0 | v2.82.0 | adapted | W2-01 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__PlaneMesh__.js | 551 | 1.0.0 | v2.82.0 | adapted | W2-40 |
| TVM/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css | 142 | - | v2.82.0 | adapted | W2-01 |
| TVM/48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js | 198 | 0.1.0 | v2.86.0 | gated, adapted - DR-26 | W2-05 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__AppConfig__.json | 44 | - | v2.94.0 | gated, verbatim - DR-15 | W1-09 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js | 263 | 1.0.0 | v2.94.0 | gated, verbatim - DR-15 | W1-09 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__DevMenu__Row__.js | 314 | 1.0.0 | v2.94.0 | gated, adapted - DR-15 | W2-03 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js | 402 | 1.0.0 | v2.94.0 | gated, verbatim - DR-15 | W1-09 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__RecordData__.js | 189 | 1.0.0 | v2.94.0 | gated, verbatim - DR-15 | W1-09 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js | 631 | 1.0.0 | v2.94.0 | gated, adapted - DR-15 | W2-03 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__Shader__.js | 253 | 1.0.0 | v2.94.0 | gated, verbatim - DR-15 | W1-09 |
| TVM/49__System__ElevationDepthFog/Na__ElevationDepthFog__Styles__DevMenu__.css | 107 | - | v2.94.0 | gated, verbatim - DR-15 | W2-03 |

**B. Projected linework (50)** (3 files, 1,435 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/50__System__ProjectedLinework/Na__ProjectedLinework__DoorPose__.js | 807 | 1.3.0 | v2.42.0 | gated, adapted - DR-16 a | W2-06 |
| TVM/50__System__ProjectedLinework/Na__ProjectedLinework__FlushJoins__.js | 308 | 1.1.0 | v2.37.0 | gated, adapted - DR-31 | W2-43 |
| TVM/50__System__ProjectedLinework/Na__ProjectedLinework__Storeys__.js | 320 | 1.0.0 | v2.105.0 | gated, adapted - DR-16 a | W2-43 |

**C. Drafting aids and object snap (LE 26, 27, 28, 32, 33)** (31 files, 8,752 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/26__System__DraftMode/Na__LayoutEditor__DraftMode__.js | 311 | 1.1.0 | v2.107.0 | adapted | W2-18 |
| LE/26__System__DraftMode/Na__LayoutEditor__DraftMode__Config__.json | 32 | - | v2.107.0 | adapted | W2-18 |
| LE/26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js | 107 | 1.0.0 | v2.107.0 | verbatim | W1-14 |
| LE/26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css | 199 | - | v2.107.0 | adapted | W2-18 |
| LE/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js | 669 | 1.0.0 | v2.114.0 | verbatim | W2-18 |
| LE/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__Config__.json | 89 | - | v2.114.0 | verbatim | W2-18 |
| LE/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js | 383 | 1.0.0 | v2.114.0 | verbatim | W1-14 |
| LE/27__System__DrawingGrid/Na__LayoutEditor__Panel__DrawingGrid__.js | 247 | 1.0.0 | v2.114.0 | verbatim | W2-18 |
| LE/27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css | 63 | - | v2.114.0 | verbatim | W2-18 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__.js | 707 | 1.0.0 | v2.149.0 | gated, verbatim* - gesture held (DR-40) | W2-25 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__Config__.json | 34 | - | v2.149.0 | gated, verbatim* - gesture held (DR-40) | W2-25 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js | 309 | 1.0.0 | v2.129.0 | verbatim | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Config__.json | 79 | - | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Geometry__.js | 219 | 1.0.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Glyphs__.js | 157 | 1.0.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__GridMoves__.js | 330 | 1.2.0 | v2.113.0 | verbatim | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Index__.js | 296 | 1.1.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Marker__.js | 265 | 1.0.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Menu__.js | 350 | 1.0.0 | v2.128.0 | verbatim | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Moves__.js | 159 | 1.0.0 | v2.128.0 | verbatim | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js | 657 | 1.1.0 | v2.128.0 | verbatim | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Sources__.js | 565 | 1.2.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__State__.js | 337 | 1.0.0 | v2.128.0 | verbatim | W2-42 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css | 432 | - | v2.128.0 | adapted | W2-19 |
| LE/28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js | 638 | 1.6.0 | v2.28.0 | gated, verbatim - gesture held (DR-40) | W2-25 |
| LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js | 230 | 1.0.0 | v2.113.0 | verbatim | W2-18 |
| LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json | 28 | - | v2.113.0 | verbatim | W2-18 |
| LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js | 180 | 1.0.0 | v2.113.0 | verbatim | W1-14 |
| LE/33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js | 550 | 1.0.0 | v2.131.0 | verbatim | W2-18 |
| LE/33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__Config__.json | 43 | - | v2.131.0 | verbatim | W2-18 |
| LE/33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css | 87 | - | v2.131.0 | verbatim | W2-18 |

**D. Keyboard scopes (LE 31, key files, KeyScope)** (4 files, 1,961 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/03__AppUtils/Na__AppUtils__KeyScope__.js | 237 | 1.1.0 | v2.109.0 | gated, adapted - DR-33 a | W1-29 |
| LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json | 1,267 | - | v2.114.0 | rename + content: FR-12 renames VV KeyMappings__.json (W0-03); KeyMap 1.11.0 content in W0-15 (DR-33) | W0-03, W0-15 |
| LE/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json | 73 | - | v2.109.0 | gated, adapted - DR-33 a | W1-30 |
| LE/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js | 384 | 1.1.0 | v2.109.0 | gated, adapted - DR-33 a | W1-30 |

**E. Vector tools, Booleans and hatching (LE 36, 37; ShapeRings)** (22 files, 9,250 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js | 385 | 1.1.0 | v2.150.0 | adapted | W1-13 |
| LE/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js | 997 | 1.5.0 | v2.89.0 | gated, adapted - DR-19 | W1-17 |
| LE/36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js | 456 | 1.1.0 | v2.89.0 | gated, verbatim - DR-19 | W2-29 |
| LE/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css | 27 | - | v2.89.0 | gated, verbatim - DR-19 | W1-17 |
| LE/37__System__VectorTools/Na__LayoutEditor__Panel__VectorTools__.js | 424 | 1.1.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-41 |
| LE/37__System__VectorTools/Na__LayoutEditor__Styles__VectorTools__.css | 77 | - | v2.129.0 | gated, verbatim - DR-18 a | W2-41 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__.js | 709 | 1.2.0 | v2.130.0 | gated, verbatim - DR-18 a | W2-41 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__ArcTool__.js | 470 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__BooleanTool__.js | 690 | 1.1.0 | v2.150.0 | gated, verbatim - DR-18 a | W2-41 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Boolean__.js | 549 | 1.0.0 | v2.150.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__CircleTool__.js | 353 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Config__.json | 208 | - | v2.129.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js | 389 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W1-14 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Geometry__.js | 684 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__JoinTool__.js | 382 | 1.1.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__OffsetTool__.js | 419 | 1.1.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-41 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Offset__.js | 480 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Preview__.js | 218 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Setup__.js | 153 | 1.0.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__State__.js | 296 | 1.1.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-27 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Targets__.js | 504 | 1.2.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |
| LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__TrimTool__.js | 380 | 1.1.0 | v2.129.0 | gated, verbatim - DR-18 a | W2-28 |

**F. Site plans (LE 21; site-plan units)** (8 files, 3,881 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js | 633 | 1.2.0 | v2.55.0 | gated, verbatim - dormant (DR-08 B) | W2-16 |
| LE/21__System__SitePlanData/Na__SitePlan__GlbParse__.js | 366 | 1.0.0 | v2.48.0 | gated, verbatim - dormant (DR-08 B) | W2-14 |
| LE/21__System__SitePlanData/Na__SitePlan__Store__.js | 802 | 1.2.0 | v2.48.0 | gated, adapted - dormant (DR-08 B) | W2-14 |
| LE/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js | 439 | 1.0.0 | v2.93.0 | gated, verbatim - dormant (DR-08 B) | W1-13 |
| LE/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json | 65 | - | v2.89.0 | gated, verbatim - dormant (DR-08 B) | W1-13 |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js | 240 | 1.0.0 | v2.91.0 | gated, verbatim - dormant (DR-08 B) | W2-14 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegendLink__.js | 442 | 1.0.0 | v2.164.0 | gated, verbatim* - dormant (DR-08 B) | W2-39 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js | 894 | 1.0.0 | v2.164.0 | gated, adapted - dormant (DR-08 B) | W2-39 |

**G. Viewports, rotation, doors, quality, Model Source** (5 files, 1,462 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/20__System__Viewports/Na__LayoutEditor__ModelSource__.js | 305 | 1.1.0 | v2.32.0 | gated, adapted - dormant (DR-09 a) | W2-16 |
| LE/20__System__Viewports/Na__LayoutEditor__PlanDoors__.js | 459 | 1.3.0 | v2.42.0 | gated, adapted - DR-16 a | W2-11 |
| LE/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js | 240 | 1.0.0 | v2.136.0 | adapted | W1-14 |
| LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js | 145 | 1.0.0 | v2.94.0 | gated, verbatim - DR-15 | W2-12 |
| LE/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js | 313 | 1.0.0 | v2.138.0 | adapted | W1-14 |

**H. Sheet tools and records (shared LE subfolders)** (9 files, 2,201 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__AreaGroups__.js | 292 | 1.0.0 | v2.104.0 | gated, verbatim - DR-14 A | W1-20 |
| LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js | 178 | 1.0.0 | v2.147.0 | adapted | W1-13 |
| LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js | 308 | 1.0.0 | v2.143.0 | adapted | W1-13 |
| LE/15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js | 102 | 1.0.0 | v2.139.0 | adapted | W1-13 |
| LE/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js | 205 | 1.0.0 | v2.106.0 | adapted | W1-13 |
| LE/30__System__SheetTools/Na__LayoutEditor__LayerMenu__.js | 195 | 1.0.0 | v2.123.0 | gated, adapted - DR-17 | W2-21 |
| LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__CopyDrag__.js | 494 | 1.2.0 | v2.117.0 | gated, adapted - gesture held (DR-40) | W3-03 |
| LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HoverTooltip__.js | 122 | 1.1.0 | v2.63.1-65.1 (4f6bb9ef) | adapted | W2-20 |
| LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__NoteTooltip__.js | 305 | 1.0.0 | v2.144.0 | adapted | W2-21 |

**I. Specification, notes, spell check, Specification Scrapbook (LE 50, 58; 55)** (20 files, 7,890 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/50__Feature__Specification/Na__LayoutEditor__NoteRegions__.js | 346 | 1.0.1 | v2.143.0 | adapted | W2-32 |
| LE/50__Feature__Specification/Na__LayoutEditor__NoteRegions__Grips__.js | 518 | 1.0.0 | v2.143.0 | verbatim | W3-11 |
| LE/50__Feature__Specification/Na__LayoutEditor__NoteRegions__Tool__.js | 268 | 1.0.0 | v2.143.0 | verbatim | W2-22 |
| LE/50__Feature__Specification/Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js | 510 | 1.0.0 | v2.147.0 | verbatim | W2-32 |
| LE/50__Feature__Specification/Na__LayoutEditor__Panel__MarginNotes__Regions__.js | 511 | 1.0.0 | v2.143.0 | verbatim | W3-11 |
| LE/50__Feature__Specification/Na__LayoutEditor__SpecData__Lockstep__.js | 1,045 | 1.0.0 | v2.163.0 | adapted | W2-30 |
| LE/50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js | 365 | 1.0.0 | v2.163.0 | verbatim | W2-31 |
| LE/50__Feature__Specification/Na__LayoutEditor__SpecMargin__Column__.js | 303 | 1.0.0 | v2.143.0 | verbatim | W2-32 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Panel__ScrapbookSpecification__.js | 797 | 1.2.0 | v2.91.0 | adapted | W2-35 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__.js | 446 | 1.0.1 | v2.91.0 | adapted | W2-35 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__Config__.json | 89 | - | v2.91.0 | adapted | W2-35 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js | 469 | 1.1.0 | v2.144.0 | adapted | W2-35 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Styles__ScrapbookSpecification__.css | 419 | 1.2.0 | v2.91.0 | adapted | W2-35 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__.js | 99 | 1.0.0 | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__Config__.json | 46 | - | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__Dictionary__.js | 556 | 1.0.0 | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__Field__.js | 630 | 1.0.0 | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css | 115 | 1.0.0 | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/Na__SpellCheck__WordBar__.js | 211 | 1.0.0 | v2.144.0 | gated, adapted - Vale name/dictionary (DR-20) | W2-34 |
| TVM/55__Feature__SpellCheck/README__SpellCheck__.md | 147 | - | v2.144.0 | no owner: README with no K3 owner (W1-37 ports ColourPalette's README): add to the folder's package | - |

**J. Floor areas (LE 59; Area Schedule)** (11 files, 4,890 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js | 668 | 1.1.0 | v2.104.0 | gated, verbatim - DR-14 A | W3-17 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__.js | 849 | 1.2.2 | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Config__.json | 158 | - | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Geometry__.js | 566 | 1.1.0 | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__LabelGrip__.js | 315 | 1.0.0 | v2.125.0 | gated, verbatim - DR-14 A | W3-10 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Menu__.js | 204 | 1.1.1 | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Paint__.js | 231 | 1.1.0 | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Table__.js | 492 | 1.1.0 | v2.104.0 | gated, verbatim - DR-14 A | W3-10 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Tool__.js | 309 | 1.0.0 | v2.104.0 | gated, verbatim - DR-14 A | W1-27 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__Panel__FloorAreas__.js | 871 | 1.2.1 | v2.104.0 | gated, verbatim - DR-14 A | W3-10 |
| LE/59__Feature__FloorAreas/Na__LayoutEditor__Styles__FloorAreas__.css | 227 | - | v2.104.0 | gated, verbatim - DR-14 A | W3-10 |

**K. Title block, Project QR and parametric types (LE 53; QR cell; Cabinet Infill)** (9 files, 4,174 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js | 479 | 1.0.0 | v2.81.0 | gated, verbatim - switched off (DR-12 A); NA content off (DR-43) | W1-22 |
| LE/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json | 47 | - | v2.81.0 | gated, adapted - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js | 863 | 1.0.0 | v2.81.0 | gated, verbatim - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js | 226 | 1.0.0 | v2.81.0 | gated, verbatim - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js | 196 | 1.1.0 | v2.81.0 | gated, adapted - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js | 397 | 1.2.0 | v2.81.0 | gated, adapted - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/53__Feature__ProjectQrCode/README__ProjectQrCode__.md | 166 | - | v2.81.0 | gated, adapted - switched off (DR-12 A); NA content off (DR-43) | W1-15 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js | 990 | 1.2.0 | v2.128.0 | verbatim | W2-38 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js | 810 | 1.3.0 | v2.100.0 | gated, verbatim* - switched off (DR-12 A); NA content off (DR-43) | W2-38 |

**L. Drawing Register (LE 51)** (10 files, 3,659 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Data__.js | 377 | 1.0.1 | v2.69.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__DeleteDialog__.js | 64 | - | v2.69.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Editor__.js | 688 | 1.3.0 | v2.79.0 | gated, adapted - DR-11 A code | W4-10 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Export__.js | 171 | 1.0.1 | v2.69.0 | gated, adapted - DR-11 A code | W4-10 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Notes__.js | 196 | 1.0.1 | v2.69.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js | 113 | 1.0.1 | v2.69.0 | gated, adapted - DR-11 A code | W1-13 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js | 846 | 1.1.0 | v2.79.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Preview__.js | 204 | 1.1.0 | v2.69.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Transactions__.js | 425 | 1.2.0 | v2.79.0 | gated, adapted - DR-11 A code | W4-18 |
| LE/51__Feature__DrawingRegister/Na__LayoutEditor__Styles__DrawingRegister__.css | 575 | - | v2.78.1 | gated, adapted - DR-11 A code | W4-10 |

**M. Sheet Images (LE 54)** (17 files, 4,709 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/54__Feature__SheetImages/Na__LayoutEditor__Panel__SheetImages__.js | 309 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__.js | 196 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Config__.json | 122 | - | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Crop__.js | 525 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Encode__.js | 389 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Geometry__.js | 472 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Handles__.js | 259 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Insert__.js | 382 | 1.2.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Menu__.js | 118 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W3-02 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js | 172 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Painter__.js | 229 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Pdf__.js | 112 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Publish__.js | 464 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W3-18 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js | 212 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js | 304 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W1-16 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js | 208 | 1.0.0 | v2.116.0 | gated, adapted - DR-13 a | W3-18 |
| LE/54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css | 236 | 1.1.0 | v2.116.0 | gated, adapted - DR-13 a | W3-18 |

**N. Statement Writer (LE 52) and its context-menu renderer (27)** (42 files, 19,652 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__AppConfig__.json | 76 | - | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Gesture__RightClickGuard__.js | 315 | 1.0.0 | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Picking__HitResolver__.js | 318 | 1.0.0 | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__README__.md | 225 | - | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Section__DoorInteraction__.js | 211 | 1.0.0 | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Section__ModelVisibility__.js | 621 | 1.0.0 | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Styles__.css | 157 | - | v2.10.0 | verbatim | W4-11 |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__SystemLogic__.js | 437 | 1.0.0 | v2.10.0 | excluded: 3D right-click menu: skipped for drawing parity (DR-44); only the renderer comes with the Statement Writer (W4-11) | - |
| TVM/27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui__MenuRenderer__.js | 394 | 1.0.0 | v2.10.0 | gated, verbatim - switched off (DR-10) | W4-11 |
| LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__.js | 1,195 | 1.2.0 | v2.95.0 | gated, adapted - switched off (DR-10) | W4-06 |
| LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js | 361 | 1.0.0 | v2.95.0 | gated, adapted - switched off (DR-10) | W4-05 |
| LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js | 434 | 1.1.0 | v2.95.0 | gated, adapted - switched off (DR-10) | W4-06 |
| LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Images__.js | 352 | 1.2.0 | v2.95.0 | gated, verbatim - switched off (DR-10) | W4-05 |
| LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js | 245 | 1.0.0 | v2.157.0 | verbatim (lands now with the spec lockstep, DR-10) | W2-30 |
| LE/52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Figure__.js | 474 | 1.0.0 | v2.165.0 | gated, verbatim - switched off (DR-10) | W4-04 |
| LE/52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Inline__.js | 421 | 1.0.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-04 |
| LE/52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Render__.js | 397 | 1.2.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-04 |
| LE/52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Serialise__.js | 287 | 1.0.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-04 |
| LE/52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Tokenise__.js | 501 | 1.0.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim* - switched off (DR-10) | W4-04 |
| LE/52__Feature__StatementWriter/03__Ui__Page/Na__LayoutEditor__Statement__Manager__.js | 407 | 1.1.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-06 |
| LE/52__Feature__StatementWriter/03__Ui__Page/Na__LayoutEditor__Statement__Page__.js | 1,039 | 1.6.0 | v2.88.0-95.0 (62dade1c) | gated, adapted - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__.js | 683 | 1.4.0 | v2.95.0 | gated, verbatim - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Cards__.js | 724 | 1.3.0 | v2.95.0 | gated, adapted - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Figure__.js | 839 | 1.2.0 | v2.97.0 | gated, verbatim - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Move__.js | 323 | 1.1.0 | v2.162.0 | gated, verbatim - switched off (DR-10) | W4-05 |
| LE/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Typing__.js | 570 | 1.0.0 | v2.95.0 | gated, verbatim - switched off (DR-10) | W4-05 |
| LE/52__Feature__StatementWriter/05__Ui__Reader/Na__LayoutEditor__Statement__Reader__.js | 178 | 1.1.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-06 |
| LE/52__Feature__StatementWriter/06__Export__Pdf/Na__LayoutEditor__Statement__Pdf__.js | 449 | 1.2.0 | v2.88.0-95.0 (62dade1c) | gated, verbatim - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/07__Export__Publish/Na__LayoutEditor__Statement__Publish__.js | 349 | 1.2.0 | v2.88.0-95.0 (62dade1c) | gated, adapted - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/07__Export__Publish/Na__LayoutEditor__Statement__Publish__Images__.js | 312 | 1.2.0 | v2.88.0-95.0 (62dade1c) | gated, adapted - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js | 401 | 1.0.0 | v2.170.0 | gated, adapted - switched off (DR-10) | W4-05 |
| LE/52__Feature__StatementWriter/08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__.css | 1,049 | - | v2.95.0 | gated, verbatim - switched off (DR-10) | W4-15 |
| LE/52__Feature__StatementWriter/08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__Document__.css | 1,330 | 2.1.1 | v2.95.0 | gated, verbatim - switched off (DR-10) | W4-15 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Config__.json | 191 | - | v2.162.0 | gated, adapted - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Contents__.js | 248 | 1.0.0 | v2.162.0 | gated, verbatim - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__DrawingSchedule__.js | 579 | 1.0.0 | v2.167.0 | gated, verbatim - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__DrawingSchedule__Live__.js | 140 | 1.0.0 | v2.167.0 | gated, verbatim - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Finishes__.js | 644 | 1.0.0 | v2.168.0 | gated, verbatim - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Footer__.js | 311 | 1.0.0 | v2.167.0 | gated, adapted - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Header__.js | 324 | 1.0.0 | v2.162.0 | gated, adapted - switched off (DR-10) | W4-16 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Registry__.js | 818 | 1.3.0 | v2.162.0 | gated, verbatim - switched off (DR-10) | W4-12 |
| LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js | 323 | 1.1.0 | v2.162.0 | gated, adapted - switched off (DR-10); NA content off (DR-43) | W4-12 |

**O. Publishing, sharing, published documents (LE 65, 66; 52, 53 top level)** (29 files, 9,856 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__.js | 707 | 1.1.0 | v2.155.0 | gated, adapted - DR-22 a | W4-07 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Config__.json | 54 | - | v2.155.0 | gated, adapted - DR-22 a | W4-03 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Panel__.js | 285 | 1.1.0 | v2.155.0 | gated, adapted - DR-22 a | W4-07 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Raster__.js | 340 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-03 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Sheet__.js | 479 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-03 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Transport__.js | 282 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-03 |
| LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Viewports__.js | 457 | 1.1.0 | v2.155.0 | gated, adapted - DR-22 a | W4-03 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js | 454 | 1.0.0 | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-08 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Config__.json | 61 | - | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-08 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Links__.js | 418 | 1.0.0 | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-07 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Manifest__.js | 487 | 1.0.0 | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-07 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Open__.js | 364 | 1.0.0 | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-08 |
| LE/66__Feature__DocumentSharing/Na__LayoutEditor__Styles__Share__.css | 220 | - | v2.162.0-165.0 (55014c6a) | gated, adapted - DR-23 a | W4-08 |
| LE/66__Feature__DocumentSharing/README__DocumentSharing__.md | 112 | - | v2.166.0 | gated, adapted - DR-23 a | W4-08 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Config__.json | 133 | - | v2.155.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Document__.js | 621 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-02 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Elements__.js | 653 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-02 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__LoadingScreen__.js | 596 | 1.0.0 | v2.156.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Paint__.js | 522 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Sheet__.js | 298 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-02 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Styles__Main__.css | 123 | - | v2.155.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Unpublished__.js | 226 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js | 340 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-17 |
| TVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Viewports__.js | 426 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-02 |
| TVM/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md | 60 | - | v2.155.0 | no owner: README with no K3 owner (W1-37 ports ColourPalette's README): add to the folder's package | - |
| TVM/53__Data__Layout__PublishedSchema/Na__PublishedSchema__.json | 189 | - | v2.155.0 | gated, adapted - DR-22 a | W4-01 |
| TVM/53__Data__Layout__PublishedSchema/Na__PublishedSchema__Paths__.js | 678 | 1.1.0 | v2.155.0 | gated, adapted - DR-22 a | W4-01 |
| TVM/53__Data__Layout__PublishedSchema/Na__PublishedSchema__Version__.js | 172 | 1.0.0 | v2.155.0 | gated, adapted - DR-22 a | W4-01 |
| TVM/53__Data__Layout__PublishedSchema/README__PublishedSchema__.md | 99 | - | v2.155.0 | gated, adapted - DR-22 a | W4-01 |

**P. PDF fonts** (1 files, 250 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| LE/60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js | 250 | 1.0.0 | v2.52.0-54.0 (ffbaee21) | gated, adapted - DR-21 a | W1-25 |

**Q. Colour palette (54 top level)** (6 files, 1,821 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/54__Feature__ColourPalette/Na__ColourPalette__.js | 88 | 1.0.0 | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |
| TVM/54__Feature__ColourPalette/Na__ColourPalette__Config__.json | 196 | - | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |
| TVM/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js | 448 | 1.1.0 | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |
| TVM/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js | 733 | 1.1.0 | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |
| TVM/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css | 205 | - | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |
| TVM/54__Feature__ColourPalette/README__ColourPalette__.md | 151 | - | v2.126.0 | gated, adapted - Vale name/dictionary (DR-20) | W1-37 |

**R. Transport and project file (80; LocalProjectMirror)** (3 files, 1,669 lines)

| TV file | Lines | TV ver | Since (TV release) | Action | Package |
|---|---|---|---|---|---|
| TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js | 447 | 1.2.0 | v2.39.0 | VV body: FR-17: same path and 8 exports over WCP Flask (DIV-4, DR-27) | W0-12 |
| TVM/80__CloudflareIntegration/FutureCfHelpersEtc__ForServerlessFeaturesSuchAsClientComments__.note | 1 | - | v2.0.1 | excluded: TV note file; nothing to port | - |
| TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js | 1,221 | 1.5.0 | v2.7.0 | VV body: FR-16: same path, 33 exports over whitecardopedia-editor-api (DIV-4, DR-27) | W0-12 |

---

### E.4 ValeVision-only inventory

Every VV file or folder with no TV twin at the same path, in the drawing system and in the shared folders it touches,
with its fate. *keep* = permanent VV divergence (recorded once in the ledger, W0-06); *keep + offer* = keep in VV and
offer to TV in the TrueVision lane (only with Adam's per-package approval, DR-36); *rename/move* = becomes the TV twin's
path; *retire* = removed once nothing needs it.

**Drawing system (40-55 and LE)**

| VV path today | Files (lines), version | Fate | Package | Evidence and decisions |
|---|---|---|---|---|
| `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` | 1 (758), 1.1.0 | keep + offer | W1-31 (facade), W1-34, W4-08 (share check), W0-04 (stylesheet-list test) | DR-24 (a), offer under DR-36; ledger rows L1122/L1230 vs L1244 contradict (S11 B4.6) |
| `LE/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js` | 1 (240), 1.0.0 | keep, restyled as TV's veil (`.na-le-veil--boot`) | W1-33 | DR-39; S10-F04 |
| `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` | 1 (273) | keep; gains the 3D-furniture hiding block from `Styles__Main__` | W1-33 | DR-39; S10-V01 |
| `LE/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` | 1 (158), 1.0.0 | keep + offer | WT-10 | DR-42 item 4; S03b-F04 |
| `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | 1 (856) | rename/move to `Na__Hotkeys__DrawingTabs__.json` (FR-12), then TV's content | W0-03, W0-15 | DR-33 |
| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 1 (455), 1.2.0 | retire: re-export shim over `LE/28__System__ObjectSnap` (FR-14), deleted when its 11 importers move (FR-15) | W2-19, W3-08 | DR-05; S04b-F63 TONE trap |
| `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js` | 1 (534), 1.3.0 | rename/move to `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` with TV's eight export names; VV body kept (DIV-1) | W0-02 | DR-04; FR-09 |
| `42__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` | 1 (433), 1.0.1 | keep + offer (bake on add, seed and Update stays a seam in the 2.x Dev menus) | WT-06 | DR-32, DR-42; S01-F40, S11 B5 |
| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed | W2-02; TV side WT-02 | DR-26, DR-41; TF-T21 |
| `40__System__2dElevationsView/` | 8 (2,407) | rename/move to `91__System__2dElevationsView/` (FR-01); `Na__RenderEffect__2dProfileLines__.js` to `05__RenderPipeline/` (FR-08); retire 91 later (FR-25) | W0-02, W6-03 | DR-03 |
| `35__System__PageLayoutSystem/` | 25 (35,501) | retire after jsPDF and the Classic scan leave it (FR-19, FR-20, FR-21) | W0-16, W6-03 | DR-03, DR-43 |

**Shared folders the drawing system touches**

| VV path today | Files (lines) | Fate | Package | Evidence and decisions |
|---|---|---|---|---|
| `03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` | 1 (237), 1.2.0 | keep (DIV-4); fronted by the facade at TV's path | W0-12 | DR-27; K2 section 7 |
| `03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | 1 (296) | retire when the specification transport moves onto the facade (FR-18) | W2-30, W2-33 | DR-27 |
| `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` | 1 (287) | rename/move to TV's `Na__AppUtils__SnapshotHistory.js` (FR-10; 2 importers) | W0-02 | DR-04 |
| `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` | 1 (163) | keep (twin of TV `10__NavigationAndCameras/Na__Hotkeys__Manager.js`); gains the KeyScope guard | W1-29 | DR-33; S03b-V01 |
| `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | 1 (313) | rename/move to `Na__Hotkeys__3dModelTab__.json` (FR-13); VV array key and action names kept | W0-03 | DR-33 |
| `03__AppUtils/Na__AppUtils__LoadingOverlay__.js`, `__ResilientLoad__.js`; `01__AppCore/Na__AppCore__GpuLifecycle__.js`, `__LoadWatchdog__.js` | 4 (781) | keep (VV 3D start-up; TF-T01, TF-T03) | - | - |
| `02__AppData/Na__AppConfig__MaterialsLibrary.json` (+ `.rb` utility) | 2 (175) | keep (VV materials library) | - | - |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js`, `__SceneReorder__.js`, `__ScenePersistence__.js` | 3 (1,530) | keep (TV withdrew its copies in v2.68.2, "do not re-port"); correct the PORT NOTEs that still say "back-port" | W0-06 | S01-F65, S11 c.3 |
| `21__System__PresentationMode/Na__PresentationMode__DevTools__CameraPathVisualizer.js` | 1 (367) | keep (VV dev tool) | - | - |
| `70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js`, `Na__UiFeature__RenderEngine__DevControls.js`; `30__System__ImageExport/Na__UiFeature__LineworkSettings__Controls.js` | 3 (588) | keep (VV dual render engine and linework settings, DIV-1) | - | K2 section 7 |
| `10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js` | 1 (202) | keep (3D only) | - | - |

**VV-only top-level folders outside the drawing system** (K2 TF-T15..T37, registry DR-03 (i)): keep `28__System__GridLineSystem`
(3, 1,075), `29__System__FogPlaneSystem` (7, 1,983), `31__System__VideoStudio` (18, 14,367; its preview hides
authoring overlays per DR-32), `60__Feature__FullScreenMode` (4, 376; twin of TV `76__System__FullscreenMode`, DR-44
keeps VV's), `61__Feature__ShareProjectLink` (8, 1,209; app link, not TV's document sharing; DR-43),
`63__Feature__AppNotificationEmail` (3, 547), `64__Feature__BreadcrumbNav` (2, 347),
`69__System__SketchUpToValeVision__Utilities` (3, 713), `71__System__ExportRenderLayers` (28, 8,936).
`62__Feature__EmailWorkers` (27, 4,544) keeps its number for now and moves to `92__Feature__EmailWorkers` only after
its tracked `node_modules` is removed (FR-22, W6-03 on request; DR-03).

**VV-ahead behaviour inside shared files** (no VV-only file, but VV does something TV does not; each is a seam every
whole-file port must re-apply until the TV package lands):

| Behaviour | Where in VV | TV today | Keep as seam in | Offer to TV |
|---|---|---|---|---|
| Per-drawing Styles and Exclusions rows (VV D33) | VV `43/...DevMenu__RowBuilders__.js:92-93, 367-368`; `46/...:96-97, 563-564` | record keys only; `40/Na__DrawView__StyleRows__.js` imported by nothing (S11-V03) | W2-04, W2-05 | WT-09 (DR-42, D-S11-10) |
| PlanDimensions config split, single-sourced | `45/Na__PlanDimensions__ConfigState__.js`, `__EditorPreview__.js` | files only, unwired; LE MarkupBridge reads the unloaded copy (S11 B5) | no port of TV Data/Editor (S02b-F08) | WT-01 |
| Add Viewport list rebuilt on every refresh | `LE/40/...Panel__ViewportSettings__.js` 1.4.1, ModeController 1.15.1 | fill-once bug at TV `:647` | W3-15 | WT-04 |
| Styled confirm dialog | `index.html` 1322-1333; `Na__UiFeature__Styles__DropdownAndToast__.css` 1375-1462 | `window.confirm` fallback | - | WT-05 (DR-44) |
| Ground Floor Plan quick action (VV D11) | `43/...DevMenu__Editor__.js:23, 54` | none (StoreyLevel may supersede it) | W2-04 | WT-06 |
| Pose-preserving mode release and entry | VV Switcher, walk/fly, SceneTransition | none | - | WT-06 |
| Toast offset 96 px; 3D canvas and safe frame clear the tab strip | VV DropdownAndToast, RenderCanvas, ViewportOverlays CSS | 40 px; canvas under the strip | - | WT-07 (DR-44) |
| Sections filed under "Cross Sections" (VV D28) | `46/...SceneLink__.js:186-187` | all filed under "Elevations" | W2-05 (temporary, until TV 48 passes 0.1.0) | DR-26 |
| Per-project Layout Mode switch | `LayoutEditor__DrawingsData__LayoutModeEnabled` | none; TV hides drafts by publishing | W1-34, W2-17 | re-decide at publishing (DR-25) |
| Bake before save (VV D20) | plan and elevation Update | publish-time bake | until DR-22 lands | do not offer (DR-32) |

There are no VV-only tests today: all ten VV `Na__Test__*` files have TV namesakes (E.5).

---

### E.5 Test parity matrix

TV has 102 files in `80__Testing__PrototypeEnvironment` (91 `Na__Test__` files, 3 `Na__Verify__` harnesses and 8
environment files); VV has 30 (20 at the folder's top level), of which 19 share a TV name, and all 19 differ. K3's
ownership rule applies: a TV test is ported by the package that creates the modules it imports, earlier packages may
run named sections from a scratch copy, later ones re-run it, and W6-01 closes the inventory. K3 status counts: ported 80, ported over a VV copy 6, VV-owned 12
(environment 7, suites 3, harnesses 2), VV has it and re-runs it 1, excluded 3.

*(generated)* "In VV today" compares content with line endings normalised. "TV releases whose devlog cites it" lists
the E.1.4 releases whose entry names the test (release numbers without `v2.`).

| TV test file | TV lines | In VV today | K3 status | Runner | Ported by | Sections run earlier | Re-run by | TV releases whose devlog cites it |
|---|---|---|---|---|---|---|---|---|
| Na__TestEnv__ObjectSnapBundle__.cjs | 103 | no | ported | node | W2-19 | - | - | 129.0 |
| Na__TestEnv__Styles__PrototypeSandbox__.css | 833 | yes (differs, 1054 lines) | vv-owned environment | environment | - | - | - | - |
| Na__Test__AreaSchedule__.test.mjs | 277 | no | ported | node | W3-17 | - | - | 104.0, 148.0, 164.0 |
| Na__Test__AuthoringZoomMax__.test.mjs | 185 | no | ported | node | W1-36 | W0-15 | - | 135.0 |
| Na__Test__BubbleNoteTooltip__.test.mjs | 321 | no | ported | node | W3-03 | - | - | 144.0 |
| Na__Test__ColourPalette__.test.mjs | 353 | no | ported | node | W1-38 | - | - | 126.0, 133.0 |
| Na__Test__CopyDrag__.test.cjs | 587 | no | ported | node | W3-03 | - | W3-04 | 117.0, 119.0, 149.0 |
| Na__Test__CrossSheetClipboard__.test.cjs | 227 | no | ported | node | W3-03 | - | - | 114.0, 123.0, 127.0, 130.0, 142.0 |
| Na__Test__DimensionRoundUp__.test.mjs | 108 | no | ported | node | W1-13 | - | W3-12 | 139.0 |
| Na__Test__DocumentKeys__.test.mjs | 269 | no | ported | node | W1-32 | W1-29 | W4-10 | 110.0, 112.0 |
| Na__Test__DraftGuard__.test.cjs | 297 | no | ported | node | W1-07 | - | - | 146.0 |
| Na__Test__DraftRestore__.test.mjs | 364 | no | ported | node | W1-07 | - | - | 145.0, 146.0 |
| Na__Test__DrawingAxes__.test.mjs | 447 | no | ported | node | W3-05 | W2-18 | W5-01 | 131.0, 137.0 |
| Na__Test__DrawingDrafts__.test.mjs | 301 | no | ported | node | W1-06 | - | W2-04 | 86.0 |
| Na__Test__DrawingGrid__.test.mjs | 303 | no | ported | node | W3-05 | W2-18 | W5-01 | 114.0, 123.0, 129.0, 137.0 |
| Na__Test__DrawingPlanes__.test.mjs | 237 | no | ported | node | W2-01 | - | - | 82.0 |
| Na__Test__DrawingProfileLines__.html | 240 | no | excluded | browser on WCP Flask (G5) | - | - | - | - |
| Na__Test__DrawingTabKeys__.test.mjs | 402 | no | ported | node | W1-36 | W0-15 | - | 115.0, 135.0, 151.0 |
| Na__Test__ElevationDepthFog__.test.mjs | 295 | no | ported | node | W1-09 | - | W2-03, W2-16 | 94.0 |
| Na__Test__ElevationGeometry__.html | 245 | no | ported | browser on WCP Flask (G5) | W1-10 | - | - | - |
| Na__Test__EnhanceWhitecardStrength__.test.mjs | 279 | no | ported | node | W2-09 | - | - | 93.0 |
| Na__Test__FloorAreas__.test.mjs | 176 | no | ported | node | W1-27 | - | W3-10 | 104.0, 125.0, 148.0 |
| Na__Test__FloorPlanStoreyLevel__.test.mjs | 152 | no | ported | node | W1-08 | - | - | 87.0 |
| Na__Test__FlushJoins__.test.mjs | 173 | no | ported | node | W2-43 | - | W2-06 | 159.0 |
| Na__Test__GroupMoveSnapping__.test.cjs | 210 | no | ported | node | W3-03 | - | - | 114.0, 123.0, 129.0, 140.0, 141.0, 149.0 |
| Na__Test__HatchLineControls__.test.mjs | 409 | no | ported | node | W3-12 | W1-19 | - | 126.0 |
| Na__Test__HideSwings__.test.mjs | 331 | no | ported | node | W2-16 | W1-19 | W3-15 | 140.0 |
| Na__Test__IosTextureProbe__.html | 423 | no | excluded | browser on WCP Flask (G5) | - | - | - | 103.0 |
| Na__Test__LayerMenu__.test.mjs | 758 | no | ported | node | W2-21 | W1-20 | W3-13 | 123.0, 127.0, 129.0, 138.0, 142.0, 154.0 |
| Na__Test__LayerStack__.test.mjs | 277 | no | ported | node | W1-28 | W1-19 | W3-13 | 106.0, 154.0 |
| Na__Test__LeaderlessNotes__.test.mjs | 381 | no | ported | node | W2-32 | W1-13, W1-21 | - | 147.0 |
| Na__Test__MoveAnchor__.test.mjs | 525 | no | ported | node | W3-04 | - | - | 149.0 |
| Na__Test__MoveRetype__.test.mjs | 401 | no | ported | node | W3-03 | - | - | 118.0, 129.0 |
| Na__Test__NorthCompass__.test.mjs | 119 | yes (differs, 127 lines) | ported (replaces VV copy) | node | W0-02 | - | W1-11 | - |
| Na__Test__NoteRegions__.test.mjs | 384 | no | ported | node | W2-32 | W1-13, W1-21 | - | 143.0, 147.0 |
| Na__Test__ObjectSnap__.test.mjs | 368 | no | ported | node | W2-19 | - | W3-11, W5-01 | 129.0, 137.0, 138.0, 143.0 |
| Na__Test__OrthoMode__.test.mjs | 464 | no | ported | node | W3-05 | W2-18 | W5-01 | 113.0, 129.0, 137.0 |
| Na__Test__PaintedOnThePoint__.test.mjs | 344 | no | ported | node | W2-24 | - | - | 137.0, 138.0 |
| Na__Test__PerSceneLighting__.test.mjs | 309 | yes (differs, 312 lines) | vv-owned suite | node | - | - | W6-01 | 161.0 |
| Na__Test__ProjectDataSaveGuard__.test.py | 184 | no | ported | python (+ WCP Flask route) | W0-09 | - | - | 146.0 |
| Na__Test__ProjectQr__.test.mjs | 469 | no | ported | node | W1-15 | - | W5-05 | 81.0, 120.0 |
| Na__Test__ProjectQr__Decode__.py | 117 | no | ported | python | W1-15 | - | W5-05 | 81.0, 120.0 |
| Na__Test__ProjectRecordAddress__.html | 148 | no | ported | browser on WCP Flask (G5) | W1-12 | - | - | 88.0 |
| Na__Test__PublishedReader__.test.mjs | 590 | no | ported | node | W4-02 | - | W4-09 | 155.0, 156.0 |
| Na__Test__PublishedReader__Harness__.html | 135 | no | ported | browser on WCP Flask (G5) | W4-02 | - | - | 155.0 |
| Na__Test__PublishedSchema__.test.mjs | 650 | no | ported | node | W4-01 | - | - | 155.0, 156.0, 166.0 |
| Na__Test__Reference__TyporaTheme__.css | 545 | no | ported | - | W4-14 | - | - | 97.0 |
| Na__Test__ScrapbookApi__.test.py | 152 | yes (differs, 167 lines) | vv-owned suite | python (+ WCP Flask route) | - | - | W6-01 | 76.0 |
| Na__Test__ScrapbookCabinetInfill__.test.mjs | 335 | no | ported | node | W2-38 | - | - | 128.0, 134.0, 164.0 |
| Na__Test__ScrapbookDrawingTitle__.test.mjs | 281 | yes (differs, 178 lines) | ported (replaces VV copy) | node | W2-37 | - | - | 96.0, 122.0 |
| Na__Test__ScrapbookProjectQr__.test.mjs | 430 | no | ported | node | W2-38 | - | - | 100.0, 102.0, 106.0, 108.0, 109.0, 120.0 |
| Na__Test__ScrapbookScaleBar__.test.mjs | 148 | yes (differs, 156 lines) | ported (replaces VV copy) | node | W2-37 | - | - | 76.0, 96.0 |
| Na__Test__ScrapbookServer__.py | 97 | yes (differs, 135 lines) | vv-owned suite | python (+ WCP Flask route) | - | - | W6-01 | 76.0, 77.0 |
| Na__Test__ScrapbookSiteLegend__.test.mjs | 278 | no | ported | node | W2-39 | - | - | 164.0 |
| Na__Test__SetMoveLeaderTips__.test.cjs | 736 | no | ported | node | W3-03 | - | - | 141.0, 142.0, 149.0, 150.0 |
| Na__Test__ShareLinks__.test.mjs | 452 | no | ported | node | W4-08 | - | W5-01 | 166.0 |
| Na__Test__SheetImagesApi__.test.py | 152 | no | ported | python (+ WCP Flask route) | W0-18 | - | - | 116.0 |
| Na__Test__SheetImages__.test.mjs | 474 | no | ported | node | W3-09 | W1-16 | - | 116.0, 121.0 |
| Na__Test__SheetPagingWalkExit__.test.mjs | 252 | no | ported | node | W1-36 | - | - | 112.0, 115.0, 135.0 |
| Na__Test__SheetsNormaliseOnce__.test.mjs | 266 | no | ported | node | W1-21 | - | - | 136.0 |
| Na__Test__SitePlanComposites__.test.mjs | 1052 | no | ported | node | W2-14 | - | - | 89.0, 90.0, 100.0, 101.0, 106.0, 126.0 +1 |
| Na__Test__SitePlanComposites__Output__.html | 32 | no | ported | browser on WCP Flask (G5) | W2-14 | - | - | 89.0, 90.0 |
| Na__Test__SitePlanFaces__.test.mjs | 200 | no | ported | node | W2-16 | - | - | 160.0 |
| Na__Test__SitePlanStore__.test.mjs | 263 | no | ported | node | W2-14 | - | - | 132.0 |
| Na__Test__SpecInlineEdit__.test.mjs | 294 | no | ported | node | W2-35 | - | - | 144.0, 163.0 |
| Na__Test__SpecLockstep__.test.mjs | 374 | no | ported | node | W2-30 | - | - | 163.0 |
| Na__Test__SpecificationPdf__.html | 122 | yes (differs, 114 lines) | vv-has, re-run | browser on WCP Flask (G5) | - | - | W0-16, W1-25 | - |
| Na__Test__SpellCheckDictionary__.test.mjs | 257 | no | ported | node | W2-34 | - | - | 144.0 |
| Na__Test__SpellCheckField__.html | 196 | no | ported | browser on WCP Flask (G5) | W2-34 | - | - | 144.0 |
| Na__Test__StatementDomRoundTrip__.html | 175 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 95.0 |
| Na__Test__StatementFigureTitle__.test.mjs | 176 | no | ported | node | W4-04 | - | - | 165.0 |
| Na__Test__StatementFigure__.html | 284 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 97.0, 99.0 |
| Na__Test__StatementFinishes__.html | 105 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 168.0, 171.0, 172.0 |
| Na__Test__StatementFinishes__.test.mjs | 337 | no | ported | node | W4-12 | - | - | 168.0, 171.0, 172.0 |
| Na__Test__StatementLockstep__.test.mjs | 158 | no | ported | node | W2-30 | - | - | 157.0 |
| Na__Test__StatementPublish__.test.mjs | 424 | no | ported | node | W4-12 | - | - | 170.0, 171.0, 172.0 |
| Na__Test__StatementRoundTrip__.test.mjs | 179 | no | ported | node | W4-04 | - | - | 95.0, 157.0, 167.0 |
| Na__Test__StatementSchedule__.test.mjs | 353 | no | ported | node | W4-12 | - | - | 167.0 |
| Na__Test__StatementServer__.py | 240 | no | ported | python (+ WCP Flask route) | W0-19 | - | W4-06, W4-14 | - |
| Na__Test__StatementStandard__.html | 77 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 162.0, 167.0, 168.0 |
| Na__Test__StatementStandard__.test.mjs | 280 | no | ported | node | W4-12 | - | - | 162.0, 167.0, 168.0 |
| Na__Test__StatementTyping__.html | 229 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 95.0 |
| Na__Test__StatementTypography__.html | 235 | no | ported | browser on WCP Flask (G5) | W4-14 | - | - | 97.0 |
| Na__Test__StoreyBand__.test.mjs | 186 | no | ported | node | W2-06 | - | W2-16 | 105.0 |
| Na__Test__TitleBlockCells__.html | 200 | yes (differs, 199 lines) | ported (replaces VV copy) | browser on WCP Flask (G5) | W1-22 | - | - | 79.0 |
| Na__Test__TitleBlockCells__.test.mjs | 237 | yes (differs, 205 lines) | ported (replaces VV copy) | node | W1-22 | - | W1-26 | 79.0, 79.1, 109.0 |
| Na__Test__TitleBlockScaleCell__.html | 194 | no | ported | browser on WCP Flask (G5) | W1-26 | - | - | 61.0, 61.1 |
| Na__Test__UserSpellingsApi__.test.py | 243 | no | ported | python (+ WCP Flask route) | W0-18 | - | - | 144.0 |
| Na__Test__VectorBooleans__.test.mjs | 726 | no | ported | node | W3-07 | - | - | 150.0, 151.0 |
| Na__Test__VectorQuality__.test.mjs | 227 | no | ported | node | W1-28 | - | W5-01 | 136.0, 137.0 |
| Na__Test__VectorTools__.test.mjs | 428 | no | ported | node | W3-07 | W2-27 | - | 130.0 |
| Na__Test__ViewportRotation__.test.mjs | 344 | no | ported | node | W1-14 | - | W3-06 | 138.0 |
| Na__Test__ViewportTitleText__.test.mjs | 171 | yes (differs, 134 lines) | ported (replaces VV copy) | node | W2-10 | - | - | - |
| Na__Verify__Exports__.mjs | 343 | yes (differs, 343 lines) | vv-owned harness | node | - | - | W0-02 | every release (integration gates G1/G2) |
| Na__Verify__ModuleGraph__.mjs | 378 | yes (differs, 378 lines) | vv-owned harness | node | - | - | W0-02 | every release (integration gates G1/G2) |
| Na__Verify__RubySyntax__.py | 181 | no | excluded | python | - | - | - | - |
| TestEnv__FlaskLocalServer.bat | 50 | yes (differs, 32 lines) | vv-owned environment | environment | - | - | - | - |
| TestEnv__FlaskLocalServer.py | 302 | yes (differs, 291 lines) | vv-owned environment | environment | - | - | - | - |
| TestEnv__PrototypeTestingSandbox__DomAndLayout.html | 261 | yes (differs, 267 lines) | vv-owned environment | environment | - | - | - | - |
| TestEnv__PrototypeTestingSandbox__Main__.js | 1453 | yes (differs, 1748 lines) | vv-owned environment | environment | - | - | - | - |
| TestEnv__README__.md | 104 | yes (differs, 118 lines) | vv-owned environment | environment | - | - | - | - |
| TestEnv__SubAppData__Config.json | 175 | yes (differs, 183 lines) | vv-owned environment | environment | - | - | - | - |

What porting the tests needs beyond the package that creates their modules:

- **Runners.** `.mjs`/`.cjs` suites run under node from the VV root; `.py` suites need the WCP Flask blueprints first
  (`Na__Test__ProjectDataSaveGuard__` W0-09, `Na__Test__SheetImagesApi__` and `Na__Test__UserSpellingsApi__` W0-18,
  `Na__Test__StatementServer__` W0-19); `.html` harnesses run in a browser on the WCP Flask server (gate G5).
- **Fixtures, not live projects.** Seven statement suites copy the real modules into a scratch tree; five of them read
  TV's live RB05 statement and fail 2, 1, 5, 1 and 3 checks at TV HEAD for CRLF, edited content and a stale expectation
  (S07b-F45); they port against a committed VV fixture
  (W4-14, and WT-03 on the TV side). The schema suites compare VV-before with VV-after and whitelist exactly the keys
  TV's normaliser adds (S03b-V04).
- **Known red in TV.** `Na__Test__StoreyBand__` passes 52 of 53 at TV HEAD because TV's ConfigAccess fallback build
  token lags its JSON (S02b-F33); VV keeps the two equal when W2-06 lands (DR-31 item 4), and WT-09 fixes TV.
  TV's `Na__Verify__ModuleGraph__` exits 1 on a string false positive in `21` SceneEditor that VV must not inherit
  (S09-F43, fixed in W0-04).
- **Gaps in both apps.** No TV test covers the tab strip, the fold or the veils (S10-F35) and none covers the register
  numbering (S07a-F54) or the published Flask routes (S08-F38); K3 adds VV-only checks for them:
  `Na__Verify__UiParity__.mjs`, `Na__Verify__ParityNaming__.mjs`, `Na__Verify__PortNotes__.mjs`,
  `Na__Test__LoaderStylesheets__.test.mjs` (W0-04), `Na__Test__AppConfigParity__.test.mjs` (W0-15),
  `Na__Test__TransportFacade__.test.mjs` (W0-12), `Na__Test__DrawingNotesRoute__.test.py` (W0-09),
  `Na__Test__PublishedApi__.test.py` (W0-19), `Na__Test__LoaderFacade__.test.mjs` (W1-31),
  `Na__Test__LineworkModifiers__.test.mjs` (W2-13), `Na__Test__RegisterNumbering__.test.mjs` (W4-18).
- **Baseline.** VV's harnesses pass today: Exports on 415 files; ModuleGraph 517 modules from one entry, 0 failures
  (S11 (d), S09-F43). Every package keeps them green (G1, G2); the module count only grows.
