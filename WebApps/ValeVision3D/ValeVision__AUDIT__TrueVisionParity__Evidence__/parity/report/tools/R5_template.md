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
| **Open (needs a package)** | PARTIAL + PENDING + NOT-CONSIDERED + REOPENED | 102 | **{{N_OPEN}}** | 84 |

Every one of the {{N_OPEN}} open releases maps to at least one K3 package (E.1.4); the only release with work and no
package is v2.92.0, which K1 DR-44 places outside this alignment.

#### E.1.2 Corrections to S11 from the other slices *(generated from `r5_overrides.py`)*

Method: every finding of slices S01-S10 and S12 that cites a TV release was checked against S11's class for that
release (`r5work/findings_by_release.txt`), and the code or git history was opened where they disagreed. TV committed
releases in batches (for example `62dade1c` added the devlog headings v2.88.0-v2.95.0), and some module changes in a
batch appear in no devlog entry, so a port driven by devlog headings misses them (S05a-F54). Batch ranges below were
re-read with `git show <commit> -- TrueVision__DEVLOG__.md`; unlogged changes are attached to the release named in the
commit subject. "kept" rows keep S11's class but carry a residual or a note.

{{E1_CORRECTIONS}}

Points re-checked in the code for this section: VV `LE/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js:121` defines
`Na__LePanelText__Many` and nothing calls it, where TV calls it at `:152`; VV has no `SheetTools__HoverTooltip__.js`
and its `PointerDrag__` has no `RefreshBrokenTooltip` (TV has 3); the Whitecardopedia registrar has no
`HasUnsavedWork` or `updateViaCache` (TV registrar `:37`, `:133-167`) and its token is still `'2026-09-18-1'`
(Whitecardopedia Logic `:229`); VV `03__AppUtils/Na__AppUtils__ProjectLoader.js:407-408` build-tokens every
`project.json` URL. S11's own c.1 verifier corrections (ten `no_action` rows hiding TV changes) need no new rows: they
sit in releases this table already carries, v2.37.0, v2.38.1, v2.87.0, v2.91.0, v2.94.0, v2.96.0, v2.105.0 and v2.107.0
(all open) and v2.92.0 (NOT-DRAWING, no package).

#### E.1.3 Watermark per area *(generated)*

{{E1_AREA}}

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
hand-corrected for {{N_WPFIX}} rows where the file-count ranking put a supporting package first (`r5_overrides.py`
`WP_FIX`). **Decisions**: K1 decisions that change the release's scope (from the title and area); DR-01 marks every
open release with no recorded confirmation by Adam (all open releases from v2.86.0, every PENDING-SIGNOFF row and the
three NOT-CONSIDERED rows below it), not the PARTIAL and REOPENED rows of releases that were ported or decided. The S11 notes and TV test names per release stay in S11 Appendix A; E.5 maps the
tests.

{{E1_RELEASES}}

#### E.1.5 Reverse index: package -> TV releases it carries *(generated)*

For the Parity Scribe and the Port Records, in landing (K3 topological) order. Release numbers drop the `v2.` prefix;
**bold** = the package is the release's primary owner. Packages that carry no release (foundations, transport, scribe passes, the TrueVision lane)
are omitted.

{{E1_REVERSE}}

---

### E.2 System-by-system parity matrix

Counts are files at the same relative path in the paired folders (`ref/drift_all.tsv`, VV folder translated to its TV
twin): **Both** = present in both, split into identical, header-only (code equal, comment/header lines differ) and
drifted; **diff lines** are the shared files' changed lines. TV-only folders are counted from `ref/tree_tv.tsv`.
"Open TV releases naming it" counts the open releases of E.1.4 whose TV devlog entry names a file in that folder or
the folder itself (so a hub such as `LE/07` or `LE/30` collects many; a change described only by function names is not
counted).

#### E.2.1 Top-level drawing folders 40-55 and the drawing-adjacent TV-only folders *(generated)*

{{E2_TOP}}

#### E.2.2 Top-level systems: what is missing and what to do

{{E2_TOP_ANALYSIS}}

#### E.2.3 Layout Editor subfolders *(generated)*

{{E2_LE}}

The LE totals reproduce the orchestrator's figures: 341 TV files (150,637 lines) and 161 VV files (62,817 lines); 155
shared paths (2 identical, 40 header-only, 113 drifted, 29,838 changed lines), 186 TV-only files (72,656 lines), 6
VV-only (2,740 lines). Only `LE/35__System__DrawingTools` holds identical files (2). Seventeen TV subfolders have no
VV counterpart (21, 26, 27, 28, 31, 32, 33, 36, 37, 51, 52, 53, 54, 58, 59, 65, 66); one VV subfolder has no TV
counterpart (`01__Core__Loader`).

#### E.2.4 Layout Editor subfolders: what is missing and what to do

{{E2_LE_ANALYSIS}}

#### E.2.5 Shared folders outside 40-55 that the drawing system imports *(generated)*

{{E2_ADJ}}

These are wiring surfaces, not drawing systems: their drift is ported only where a drawing package needs it (for
example `03__AppUtils` KeyScope W1-29, ProjectLoader helpers W0-11, R2AssetUpload W0-14; `15__ModelLoader` ortho depth
bias W1-03; `01__AppCore` loading sequence W0-13, W2-07; `26__System__ToggleModelElements` PhaseLibrary W1-01). Their
TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group
and storey UI, `70` AssetCullDistance; also `07` DefaultFogEffect and `11` ViewModeFov DevControls) belong to no slice and no
K3 package: they are outside this alignment as 3D-tab features (the front matter's scope, R0.0; the model-group selector and its
overlay also fall under DR-09 (a)), and Section B records each (B.4.2). TV's
`15/Na__ModelLoader__MultiModel.js` imports two of them statically (`:94` LineworkColours, `:99` InstanceConsolidation),
so W1-03 must stay a hunk port of the ortho depth bias, never a whole-file take. `70` Cache & Storage is
the optional W5-04 (DR-44), and `10` `Na__Hotkeys__Manager.js` stays TV's twin of VV's own 3D hotkey handler (W1-29
only reads it as the reference for the key-scope gate).

---

### E.3 TV-only module inventory

{{N_E3}} TV-only files ({{N_E3_L}} lines): the {{N_E3_LE}} `LE/` files ({{N_E3_LE_L}} lines) and {{N_E3_OUT}} files
outside it ({{N_E3_OUT_L}} lines) - the TV-only top-level folders 27, 47, 48, 49, 52, 53, 54, 55 and 80, TV's 41
section engine, and the TV-only files inside the shared drawing folders 40, 42, 45, 50 and `03__AppUtils` (KeyScope,
LocalProjectMirror). Actions: {{E3_ACT}}.

**Ownership check.** Every file below has a package or a recorded reason not to port. A basename check of all
{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}
files outside K3, all of them the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu files,
the 80 note). The one K3 gap this section found is closed: `README__PublishedDocuments__.md` (52) had no package, so this
section assigned it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08 each
carry their folder's README), and Section F's F.8 C30 added it to W4-17's `vv_targets` and `edits` in `wp_canonical.json`
(01-Oct-2026). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of
its `tv_sources`.

**Action vocabulary.** *verbatim* = take TV HEAD `b2aa9151` text, re-apply only the standard seams (banner token,
console prefix, PORT NOTE, VV-only exports; K3 R3); *adapted* = a slice finding records a VV seam beyond those
(transport through the VV facade, VV identity, VV config); *verbatim\** = no slice finding names the file, so the
package default (verbatim) applies; *gated* = a K1 decision changes scope, with its default in the cell (for example
"dormant (DR-08 B)" = ported, inert until Vale data exists; "switched off (DR-10)" = behind
`LayoutEditor__Statement__Enabled = false`); *excluded*, *path only*, *VV body* = the file is never copied (reason in
the cell). **Since** = the oldest TV release whose devlog entry names the file; where the file is never named, the
range of releases in the TV commit that added it (with the commit id), from `r5_git_intro.py`.

Summary by feature group *(generated)*:

{{E3_SUMMARY}}

App-root content and vendor folders that go with these modules (K2 TargetMaps section 4):

| TV folder | Files (lines) | VV target (K2) | Package | Decisions |
|---|---|---|---|---|
| `50__TrueVision__UserConfig/` | 1 (404) | `50__ValeVision__UserConfig/` (TF-R01), Vale dictionary | W0-18 | DR-20 |
| `52__LayoutEditor__HatchPatternLibrary/` | 24 (1,592) | same path (TF-R03); Construction pack first, Site Plan pack with DR-08 | W1-17 | DR-08, DR-19 |
| `01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/` | 1 | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/` with Vale's own scan, never TV's (TF-R04, FR-20) | W0-16 | DR-43 |
| `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0`, `06__Vendor__Html2Canvas__v1.4.1` | vendor | same paths (TF-R05, TF-R06, FR-19) | W0-16 | DR-03 |
| PDF.js 3.11.174 (TV loads it from PlanVision's NA path) | vendor | `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` (TF-R07; moved to W0 by K3 section 12) | W0-16 | DR-11 |

Per-file inventory *(generated)*. `LE/` = `TVM/51__System__LayoutEditor/`; file names are exact.

{{E3_INVENTORY}}

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
| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 1 (455), 1.2.0 | retire: re-export shim over `LE/28__System__ObjectSnap` (FR-14), deleted when its 10 importing files move (FR-15; S01's 11 counted the comment at `LE/30/Na__LayoutEditor__SheetTools__.js:336`, K2 TargetMaps section 11) | W2-19, W3-08 | DR-05; S04b-F63 TONE trap |
| `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js` | 1 (534), 1.3.0 | rename/move to `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` with TV's eight export names; VV body kept (DIV-1) | W0-02 | DR-04; FR-09 |
| `42__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` | 1 (433), 1.0.1 | keep + offer (bake on add, seed and Update stays a seam in the 2.x Dev menus) | WT-06 | DR-32, DR-42; S01-F40, S11 B5 |
| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed (W2-02); the five Dev-gate ids `naCrossSectionDev*` (`index.html:855-866`, DevControls `:79-83`) become `naCrossSectionToolDev*` (W2-05); a new `README__CrossSectionView__.md` names the twins (K2 N6; W0-06 creates it, R6 F.8 C14) | W2-02, W2-05, W0-06; TV side WT-02 | DR-26, DR-41; TF-T21 |
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

{{E5_TESTS}}

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
