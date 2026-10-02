## Section A - Folder Naming and Folder Divergence (Recommended Alignments)

This section answers Adam's ask 1. It is built on K2 (`parity/data/target_folder_map.json`, `parity/data/file_rename_map.json`,
`parity/report/K2__NamingRulebook.md`, `parity/report/K2__TargetMaps.md`); decisions are cited as K1 DR ids and work as K3 package
ids. Every live fact was re-checked on 01-Oct-2026 against the trees at the surveyed heads: TV `b2aa9151` and VV `7b4e593a`, both
app trees clean (`git status`). Module renames inside folders are Section B, wiring and transport are Section C, stylesheet content
and the header fold are Section D.

### A.0 Conclusions

1. **Only the drawing core is out of line.** VV keeps DrawingViewCore..NorthDirection at 42-47; TV keeps them at 40 and 42-46. Seven
   top-level numbers (40, 42-47) name different systems in the two apps. Every TV drawing file and test therefore needs its paths
   rewritten on the way into VV, and TV's 47, 48 and 49 have no slot (S01-F01, S02a-F01, S09-F01, S11-F45). How it happened: VV plan
   D05 (`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:53`) kept the legacy 40 and 41 and shifted the new folders up. TV's
   realign plan then fixed that translated map "for the whole of this work"
   (`TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:288-291, :304-321`). TV added 47, 48 and 49 afterwards.
2. **The fix is one scripted, atomic renumber, run first and alone: K3 W0-02** (K2 calls it "W1"; gated by DR-02, DR-03, DR-04). It
   moves legacy 40 to 91, then 42->40, 43->42, 44->43, 45->44, 46->45 and 47->46, plus four co-located file moves. A dry run on the
   live tree today rewrites 94 files with 332 replacements and leaves 0 retired names. K2's run on a full copy passed both harnesses,
   the path gate and 6/6 node tests, and afterwards 70 drawing files pair with TV by identical path.

   **This rests on one assumption Adam must confirm (DR-02, D-S01-15).** His brief says VV keeps "its own R2 Worker and file
   structure". This section reads "file structure" as VV's storage layout: the `VaApps/Projects/{folderId}/` prefix and VV's own
   worker and Flask server (A.2.8), not the source tree. If he means the source tree, DR-02 (b) applies: W0-02 is cancelled and every
   port has to translate folder paths instead.
3. **The Layout Editor subfolders already align.** Both apps renumbered them on 15-Sep-2026 (TV v2.55.0, TV DEVLOG:11691; VV v2.47.0).
   That leaves 17 pairs, 17 TV-only subfolders to add at TV's numbers, and one VV-only subfolder (`LE/01__Core__Loader`), which is kept
   and reserved.
4. **VV-only folders stay where they are and are registered:** 28, 29, 31, 60, 61, 63, 64, 69 and 71. Legacy 40 moves (to 91, then
   retires). 62 EmailWorkers moves to 92 only if Adam asks. Legacy 35 PageLayoutSystem retires once its jsPDF and Vale Classic scan
   have been copied out. 91 and the old three.js folder retire with it (W6-03).
5. **TV-only folders land at TV's exact number and name:** 27 (partial), 47, 48, 49, 52, 53, 54, 55 and 80 (client only). Each is
   created by the package that brings its content. TV's 62 AppInstallability, 75, 76 and TV's app-root worker folder never come to VV.
6. **Two live threats to the numbering, found here:**
   - An unmerged TV branch already uses VV-reserved number 63 (`63__System__LocalFileParity`).
   - K2's registry leaves nine numbers with no owner.

   A.2.7 fixes both. Corrections to K2 and K3 are listed in A.4.

**Ids used.** `TF-Tnn` / `TF-Lnn` / `TF-Rnn` / `TF-Snn` are K2 target-map rows (top level, LE, app root, styles) in
`parity/data/target_folder_map.json`. `FR-nn` are K2 file rows in `parity/data/file_rename_map.json`. `W0-02` etc. are K3 packages in
`parity/data/wp_canonical.json`. K2 uses its own phase labels; the K3 §10 crosswalk maps them as follows:

| K2 phase | K3 package |
|---|---|
| "W1" (renumber) | W0-02 |
| "W1b" (hotkey file names) | W0-03 |
| "W2 (first)" (facade) | W0-12 |
| "W2" vendor and asset copies | W0-16 |
| "W3" (retirements) | W6-03 |

Path shorthand follows the report:

| Shorthand | Path |
|---|---|
| `TVM/` | `TV/02__Src__AppModules/` |
| `VVM/` | `VV/02__Src__AppModules/` |
| `LE/` | `51__System__LayoutEditor/` |
| `WCP/` | `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia` |

The tables in A.1 come from `parity/report/tools/r1_folder_tables.py`, which reads `parity/ref/tree_*.tsv`; output is in
`parity/report/tools/r1_out/`.

---

### A.1 Current folder maps, side by side

#### A.1.1 Top level `02__Src__AppModules` (TV 37 folders, VV 37) - files / lines

| No. | TV | VV | Relation today |
|---|---|---|---|
| 01 | `01__AppCore` (4 / 1,839) | same name (5 / 2,320) | pair |
| 02 | `02__AppData` (2 / 563) | same name (4 / 892) | pair |
| 03 | `03__AppUtils` (7 / 1,927) | same name (10 / 2,635) | pair |
| 04 | `04__MathUtils` (1 / 38) | same name (1 / 38) | pair |
| 05 | `05__RenderPipeline` (9 / 3,397, flat) | same name (12 / 3,963, + VV-only `01__Engine__PureEngine/`, `02__Engine__MaxEngine/`) | pair |
| 06 | `06__Scene__LightingEffects` (2 / 745) | same name (2 / 754) | pair |
| 07 | `07__Scene__EnvironmentEffects` (3 / 1,023) | same name (2 / 817) | pair |
| 10 | `10__NavigationAndCameras` (21 / 5,991) | same name (21 / 6,788) | pair |
| 11 | `11__CameraUtils` (5 / 1,172) | same name (7 / 1,322) | pair |
| 15 | `15__ModelLoader` (4 / 1,668) | same name (2 / 1,154) | pair |
| 20 | `20__System__MaterialsSystem` (2 / 715) | same name (2 / 976) | pair |
| 21 | `21__System__PresentationMode` (14 / 8,851) | same name (17 / 9,769) | pair |
| 25 | `25__System__3dObject__InteractionSystem` (5 / 2,989) | same name (4 / 2,518) | pair |
| 26 | `26__System__ToggleModelElements` (10 / 3,350) | same name (3 / 1,331) | pair |
| 27 | `27__System__ContextMenuSystem` (9 / 2,754) | - | TV-only |
| 28 | - | `28__System__GridLineSystem` (3 / 1,075) | VV-only |
| 29 | - | `29__System__FogPlaneSystem` (7 / 1,983) | VV-only |
| 30 | `30__System__ImageExport` (8 / 2,046) | same name (9 / 2,636) | pair |
| 31 | - | `31__System__VideoStudio` (18 / 14,367) | VV-only |
| 35 | - | `35__System__PageLayoutSystem` (25 / 35,501) | VV-only legacy. TV retired its copy, by then at 90, in v2.155.0 (TV DEVLOG:1287). |
| 40 | `40__System__DrawingViewCore` (21 / 7,754) | `40__System__2dElevationsView` (8 / 2,407) | **collision**: VV's legacy Elevation View sits on TV's core number; VV's core is at 42 |
| 41 | `41__System__SectionCutEngine` (7 / 2,638) | `41__System__CrossSectionView` (7 / 3,697) | same role, different engine (DIV-2); no file name in common |
| 42 | `42__System__FloorPlanViews` (12 / 5,427) | `42__System__DrawingViewCore` (17 / 5,637) | **collision**: VV holds TV-40's system |
| 43 | `43__System__PlanAnnotations` (8 / 3,193) | `43__System__FloorPlanViews` (10 / 4,255) | **collision**: VV holds TV-42's system |
| 44 | `44__System__PlanDimensions` (15 / 6,958) | `44__System__PlanAnnotations` (8 / 3,285) | **collision**: VV holds TV-43's system |
| 45 | `45__System__ElevationViews` (15 / 7,449) | `45__System__PlanDimensions` (15 / 6,727) | **collision**: VV holds TV-44's system |
| 46 | `46__System__NorthDirection` (8 / 2,091) | `46__System__ElevationViews` (13 / 6,276) | **collision**: VV holds TV-45's system |
| 47 | `47__System__DrawingPlanes` (9 / 3,967) | `47__System__NorthDirection` (8 / 2,080) | **collision**: VV holds TV-46's system; TV's 47 has no VV slot |
| 48 | `48__System__CrossSectionViews` (1 / 198) | - | TV-only (placeholder 0.1.0) |
| 49 | `49__System__ElevationDepthFog` (8 / 2,203) | - | TV-only; no slot under VV's shift, because VV 50 is taken (S02b-F02) |
| 50 | `50__System__ProjectedLinework` (28 / 11,834) | same name (25 / 9,845) | pair |
| 51 | `51__System__LayoutEditor` (341 / 150,637) | same name (161 / 62,817) | pair |
| 52 | `52__System__Layout__PublishedDocuments` (11 / 3,998) | - | TV-only |
| 53 | `53__Data__Layout__PublishedSchema` (4 / 1,138) | - | TV-only |
| 54 | `54__Feature__ColourPalette` (6 / 1,821) | - | TV-only |
| 55 | `55__Feature__SpellCheck` (7 / 1,804) | - | TV-only |
| 60 | - | `60__Feature__FullScreenMode` (4 / 376) | VV-only; same feature as TV 76 |
| 61 | - | `61__Feature__ShareProjectLink` (8 / 1,209) | VV-only |
| 62 | `62__Feature__AppInstallability` (17 / 5,498) | `62__Feature__EmailWorkers` (27 / 4,544 without node_modules; 1,877 tracked, 1,857 of them node_modules) | **collision**, non-drawing. WCP's PWA folder is also 62. |
| 63 | - | `63__Feature__AppNotificationEmail` (3 / 547) | VV-only; an unmerged TV branch claims 63 (A.2.7) |
| 64 | - | `64__Feature__BreadcrumbNav` (2 / 347) | VV-only |
| 69 | - | `69__System__SketchUpToValeVision__Utilities` (3 / 713) | VV-only |
| 70 | `70__System__DevTools` (6 / 2,188) | same name (6 / 1,587) | pair |
| 71 | - | `71__System__ExportRenderLayers` (28 / 8,936) | VV-only |
| 75 | `75__System__UserInstructionsSystem` (4 / 1,298) | - | TV-only |
| 76 | `76__System__FullscreenMode` (3 / 915) | - | TV-only; same feature as VV 60 |
| 80 | `80__CloudflareIntegration` (2 / 1,222: the ApiClient and a `.note`) | - | TV-only client. TV's worker sits in the app-root `80__CloudflareIntegration/`. |

The 47 numbers fall into five groups:

| Relation | Count | Numbers |
|---|---|---|
| Pair (same name and number) | 18 | 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 50, 51, 70 |
| Same number, different engine | 1 | 41 (DIV-2) |
| Collision | 8 | 40, 42-47, 62 |
| TV-only | 10 | 27, 48, 49, 52, 53, 54, 55, 75, 76, 80 |
| VV-only | 10 | 28, 29, 31, 35, 60, 61, 63, 64, 69, 71 |

Of the eight collisions, six are the drawing shift (VV 42-47). 40 is the legacy tool that the shift stepped round. 62 is
unrelated to drawings. Only 69 file pairs differ by folder number; the 180 pairs in 50 and 51 already share paths (S01 §1, verifier
counts).

#### A.1.2 Layout Editor subfolders `LE/` (TV 34, VV 18; TV 341 files / 150,637 lines, VV 161 / 62,817)

| LE subfolder | TV files / lines | VV files / lines | Same names | TV-only | VV-only | Note |
|---|---|---|---|---|---|---|
| `01__Core__Loader` | - | 3 / 1,271 | - | - | 3 | VV lazy loader (Loader, LoadingScreen, Styles__Boot). TV DEVLOG:11718-11719 reserves LE/01 for it. DR-24. |
| `03__Core__Config` | 8 / 5,260 | 8 / 3,659 | 7 | 1 | 1 | One file under two names: VV `Na__LayoutEditor__KeyMappings__.json` = TV `Na__Hotkeys__DrawingTabs__.json` (FR-12, W0-03) |
| `05__Core__ModeController` | 3 / 2,415 | 3 / 1,695 | 3 | 0 | 0 | |
| `07__Core__SheetData` | 22 / 9,253 | 20 / 6,043 | 19 | 3 | 1 | VV-only `Na__LayoutEditor__DrawingCode__.js` is kept (K2 §7) |
| `10__Core__SheetSurface` | 12 / 6,062 | 11 / 4,117 | 11 | 1 | 0 | |
| `15__Core__Markup` | 9 / 4,586 | 6 / 3,151 | 6 | 3 | 0 | |
| `20__System__Viewports` | 19 / 7,519 | 13 / 4,385 | 13 | 6 | 0 | |
| `21__System__SitePlanData` | 2 / 1,168 | - | - | 2 | - | TV-only. Moved here from top-level 52 in TV v2.155.0 (TV DEVLOG:1284). |
| `25__System__RenderStyles` | 10 / 3,400 | 8 / 2,224 | 8 | 2 | 0 | |
| `26__System__DraftMode` | 4 / 649 | - | - | 4 | - | TV-only |
| `27__System__DrawingGrid` | 5 / 1,451 | - | - | 5 | - | TV-only |
| `28__System__ObjectSnap` | 16 / 5,534 | - | - | 16 | - | TV-only |
| `30__System__SheetTools` | 22 / 14,599 | 19 / 9,913 | 18 | 4 | 1 | VV-only `Na__LayoutEditor__Snapping__.js`: shim, then retire (FR-14 W2-19, FR-15 W3-08) |
| `31__System__DocumentKeys` | 2 / 457 | - | - | 2 | - | TV-only |
| `32__System__OrthoMode` | 3 / 438 | - | - | 3 | - | TV-only |
| `33__System__DrawingAxes` | 3 / 680 | - | - | 3 | - | TV-only |
| `35__System__DrawingTools` | 9 / 3,730 | 9 / 3,533 | 9 | 0 | 0 | |
| `36__System__HatchPatternTools` | 3 / 1,480 | - | - | 3 | - | TV-only |
| `37__System__VectorTools` | 18 / 7,385 | - | - | 18 | - | TV-only |
| `40__Ui__Panels` | 13 / 7,449 | 12 / 5,562 | 12 | 1 | 0 | |
| `50__Feature__Specification` | 31 / 12,492 | 23 / 7,693 | 23 | 8 | 0 | |
| `51__Feature__DrawingRegister` | 10 / 3,659 | - | - | 10 | - | TV-only |
| `52__Feature__StatementWriter` | 33 / 16,898 | - | - | 33 | - | TV-only; nine nested subfolders, `01__Core__Data` .. `09__Standard__Sections` |
| `53__Feature__ProjectQrCode` | 6 / 1,895 | - | - | 6 | - | TV-only. Moved here from top-level 53 in TV v2.155.0 (TV DEVLOG:1284-1285). |
| `54__Feature__SheetImages` | 17 / 4,709 | - | - | 17 | - | TV-only |
| `55__Feature__Scrapbook` | 4 / 1,226 | 4 / 1,087 | 4 | 0 | 0 | |
| `56__Feature__ScrapbookCustom` | 5 / 1,393 | 5 / 1,406 | 5 | 0 | 0 | |
| `57__Feature__ScrapbookParametric` | 14 / 10,276 | 9 / 4,247 | 9 | 5 | 0 | |
| `58__Feature__ScrapbookSpecification` | 5 / 2,220 | - | - | 5 | - | TV-only |
| `59__Feature__FloorAreas` | 10 / 4,222 | - | - | 10 | - | TV-only |
| `60__Feature__PdfExport` | 3 / 1,016 | 2 / 523 | 2 | 1 | 0 | |
| `65__Feature__DocumentPublishing` | 7 / 2,604 | - | - | 7 | - | TV-only |
| `66__Feature__DocumentSharing` | 7 / 2,116 | - | - | 7 | - | TV-only |
| `70__DevTools__DevMenu` | 1 / 305 | 1 / 413 | 1 | 0 | 0 | |
| `80__Feature__WebViewer` | 5 / 2,091 | 5 / 1,895 | 5 | 0 | 0 | |

In total: 17 pairs (no LE number or name differs), 17 TV-only subfolders (151 files / 57,565 lines), and 35 more TV-only files inside
the shared subfolders. Together those are the 186 TV-only LE files. VV has 6 VV-only files.

#### A.1.3 App root

| TV | VV | Relation | Note / K2 row |
|---|---|---|---|
| `00__ArchivedVersions/` (111 files) | `00__Archive/` (2 zips) | same role, different name | Outside drawing scope; keep both (TF-R13) |
| `01__AppAssets__TrueVision/` (26): `05__AppAssets__SkyDomes` 2, `06__AppAssets__TitleBlocks` 1, `UiIcons__MenuIcons__NavigationMenu` 7, `UiIcons__MenuIcons__ToolsMenu` 16 | `01__AppAssets__ValeVision/` (40): `05__AppAssets__SkyDomes` 2, `MeasureToolIcons` 5 (VV-only, unnumbered), `UiIcons__MenuIcons__NavigationMenu` 8, `UiIcons__MenuIcons__ToolsMenu` 25 (both icon folders hold VV-only `01__ProductionFiles*` source subfolders) | token-swapped pair | VV lacks `06__AppAssets__TitleBlocks` (TF-R04) |
| `04__Lib__ThirdParty__VersionLocked/` (600 files: vendors 01-06 plus the `TrueVision__Dependencies__*` index files) | same name (598 files: vendors 01-04 plus the `Vale__Dependencies__*` index files) | pair; the 596 files of vendors 01-04 match by path | VV lacks `05__Vendor__JsPdf__v4.1.0` and `06__Vendor__Html2Canvas__v1.4.1` (TF-R05, TF-R06) |
| - | `04__Lib__ThirdParty__Three/` (17 tracked) | VV-only legacy; shares app-root number 04 | Retire (FR-23) |
| `50__TrueVision__UserConfig/` (`TrueVision__UserSpellings__.json`) | - | TV-only | Add with the token swapped (TF-R01) |
| `51__LayoutEditor__UserScrapbookContent/`: `00__Deleted__Quarantine`, `01__ScrapbookItems__General`, index | same name: `01`-`05__ScrapbookItems__*` (each with `.gitkeep`), index | pair; subfolders differ | VV's five categories are the full set. TV lacks 02-05, so TV saves into them fail (S06a-F30, TV back-port WT-04). Both servers create `00__Deleted__Quarantine` on the first delete (`WCP/Server__ValeVisionScrapbook__Api__.py:84, :349-351`; `NAAPPS/ProjectVision__TrueVisionScrapbook__Api__.py:74, :339-341`). |
| `52__LayoutEditor__HatchPatternLibrary/` (24) | - | TV-only | Add (TF-R03) |
| `60__DistributionEmails/` | same name | pair (file name token-swapped) | Keep (TF-R10) |
| `79__Testing__GenerateObjects/` (4) | same name (4) | pair | Keep (TF-R11) |
| `80__CloudflareIntegration/` (the TV worker: `CloudflareWorker/`, 5 files) | - | TV-only; TV has two app-root 80s | VV never gets it: VV's worker is `WCP/CloudflareWorker` (K2 N9, TF-R09) |
| `80__Testing__PrototypeEnvironment/` (102 files, flat) | same name (20 flat, plus `TestEnv__CompletedFeaturesDocs` 1, `TestEnv__CurrentFeatureTestScripts` 2, `TestEnv__GlbFiles` 7) | pair | Keep VV's three subfolders. Ported TV tests land flat under TV's names (K2 F7). |
| `90__rubyScript__SketchUpSisterTools__ToolsAndUtils/` (3) | `95__SketchUpSisterTools__ToolsAndUtils/` (1 `.lnk`) | same role, different number and name | Outside scope; the registry records it (TF-R14) |
| `Index.html`, and `Na__Pwa__ServiceWorker__.js` (TV's own service-worker stub) | `index.html`; no stub (WCP's `WebApps/Na__Pwa__ServiceWorker__.js` serves VV) | | Keep the lowercase name (K2 F8); never port TV's stub (TF-T46) |
| Root docs: DEVLOG, README, 12 PLAN, 6 NOTES, 3 TASKS, `DEPENDENCY_CHART.md`, `__StupidProof__...md` | DEVLOG, PARITY ledger, `PLAN__TrueVisionPort__LayoutEditor`, README, `Research__...md`, `TASK__...md`, `install-guide.html` | | W0-06 adds `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` and `ValeVision__NOTES__FolderNumberRegistry__.md` (K2 F8) |

#### A.1.4 `03__Style__AppStylesheets` (TV 15, VV 12)

Drift is counted as diff lines with whitespace ignored (measured 01-Oct-2026).

| Stylesheet | TV lines | VV lines | Drift | Relation |
|---|---|---|---|---|
| `Na__CoreUi__Styles__BaseLayout__.css` | 38 | 37 | 4 | pair |
| `Na__CoreUi__Styles__Fonts__.css` | 61 | 38 | 29 | pair |
| `Na__CoreUi__Styles__Index__.css` | 191 | 113 | 126 | pair. TV imports the LE sheets here; VV links them from `LE/01__Core__Loader` (Section C). |
| `Na__CoreUi__Styles__RenderCanvas__.css` | 19 | 19 | 4 | pair |
| `Na__ImageExport__Styles__ViewportOverlays__.css` | 133 | 142 | 18 | pair |
| `Na__PresentationMode__Styles__SceneCarousel__.css` | 1,215 | 1,087 | 318 | pair |
| `Na__UiFeature__Styles__AppHeader__.css` | 310 | 265 | 117 | pair; the header-fold rules are in sync (S01-F53) |
| `Na__UiFeature__Styles__ControlsHelpPanel__.css` | 255 | 254 | 10 | pair |
| `Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css` | 87 | - | - | TV-only |
| `Na__UiFeature__Styles__DevToolsMenu__.css` | 176 | 182 | 8 | pair |
| `Na__UiFeature__Styles__DropdownAndToast__.css` | 1,301 | 1,509 | 1,003 | pair. VV still holds the Scene Inspector region that TV split out. |
| `Na__UiFeature__Styles__LoadingOverlays__.css` | 339 | 344 | 180 | pair |
| `Na__UiFeature__Styles__NavigationToolbar__.css` | 453 | 528 | 187 | pair |
| `Na__UiFeature__Styles__PwaInstallability__.css` | 447 | - | - | TV-only |
| `Na__UiFeature__Styles__SceneInspector__.css` | 272 | - | - | TV-only |

No stylesheet name differs between the apps. Every shared sheet differs in content, and that convergence is Section D's.

#### A.1.5 Nested folders worth knowing

| Where | TV | VV | Treatment |
|---|---|---|---|
| `05__RenderPipeline/` | flat (9 files) | `01__Engine__PureEngine/` (1), `02__Engine__MaxEngine/` (2) | VV's dual engine stays (DIV-1). DistanceCulling leaves `02__Engine__MaxEngine/` for TV's path (FR-11), and MaxEngine Setup stays. |
| `LE/52__Feature__StatementWriter/` | 9 subfolders | - | Created verbatim (S07b-F02) |
| `35__System__PageLayoutSystem/` | - | `01__Dependencies__VersionLocked/`, `02__VizDpt__TitleBlock__Pdf__/`, `03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` | Retired with 35; see A.2.6 for what must be kept |
| `62__Feature__EmailWorkers/CloudflareWorker/` | - | `assets/`, `src/`, `node_modules/` (1,857 tracked files) | Moves only with FR-22 |
| `61__Feature__ShareProjectLink/00__Archive/`, `71__System__ExportRenderLayers/01__SystemModules/` | - | VV-only | Keep |

#### A.1.6 Folder names inside TV source that become seams when a file is ported

Counts cover TVM, TV styles and `TV/Index.html` (.js, .css, .json, .html files).

| Token in TV source | TV files / lines | VV replacement | Rule |
|---|---|---|---|
| `01__AppAssets__TrueVision` | 3 / 22 | `01__AppAssets__ValeVision` | K2 N7, N8 |
| `50__TrueVision__UserConfig` | 4 / 9 (three in 55 SpellCheck, one in the LE/58 config) | `50__ValeVision__UserConfig` | N7, TF-R01 |
| `30__TrueVision__AppContent` | 28 / 43 | None: VV's project root `VaApps/Projects/{folderId}/` replaces it (DR-29) | K2 V2; Section C |
| `/na-apps/20__PlanVision__CoreAppCode` (PDF.js) | 2 / 4 | `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` | TF-R07 |
| `/na-apps/30__TrueVision__CoreAppCode`, `NaProjectPortal` | 6 / 7 and 3 / 5 | None (NA-only); the VV prefix is `VaApps/Projects/` | K2 R1, V2 |
| VV's pre-renumber names in TV comments outside a PORT NOTE | 2 lines: `TVM/40__System__DrawingViewCore/Na__DrawView__ConfigState__.js:33` names `Na__DrawView__ComposerPreset__`; `TVM/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css:67` names `42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js` | The current names | After W0-02, G3 (path gate, retired-name check) fails if either line is ported verbatim. W1-06 takes the CSS file. Offer TV the comment fix in WT-08. |

The 15 other TV lines that name VV's old folders are PORT NOTE "Ported from: ValeVision3D 42__..." lines. A whole-file port
replaces TV's PORT NOTE with VV's own (K2 H5), so none of them reach VV.

---

### A.2 Recommended target map for VV (from K2), and why

#### A.2.1 Final top-level map

Numbers 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 50, 51 and 70 keep their shared names unchanged (content alignment is Sections B, C and
D). Every other number:

| No. | VV target | Kind | Gets there by (K3) | K2 row | DR |
|---|---|---|---|---|---|
| 27 | `VVM/27__System__ContextMenuSystem/`: renderer and stylesheet only (2 of TV's 9 files) | shared number, partial by design (3D right-click menu not ported) | W4-11 | TF-T38 | DR-10, DR-44 |
| 28, 29, 31 | `28__System__GridLineSystem`, `29__System__FogPlaneSystem`, `31__System__VideoStudio` | VV-reserved | keep | TF-T15, T16, T18 | DR-03 |
| 35 | none: `35__System__PageLayoutSystem` retired, number burnt | VV legacy | W0-16 copies out, W6-03 retires | TF-T19; FR-19, FR-20, FR-21 | DR-03, DR-43 |
| 40 | `VVM/40__System__DrawingViewCore/` (from 42; ComposerPreset renamed to RenderPreset) | shared | **W0-02** | TF-T22; FR-02, FR-09 | DR-02, DR-04 |
| 41 | `VVM/41__System__CrossSectionView/` plus a new `README__CrossSectionView__.md` | same number, different engine (DIV-2) | keep; README in W0-06 (R6 F.8 C14); gate ids renamed in W2-05 | TF-T21 | DR-26, DR-41 |
| 42 | `VVM/42__System__FloorPlanViews/` (from 43) | shared | **W0-02** | TF-T23, FR-03 | DR-02 |
| 43 | `VVM/43__System__PlanAnnotations/` (from 44) | shared | **W0-02** | TF-T24, FR-04 | DR-02 |
| 44 | `VVM/44__System__PlanDimensions/` (from 45) | shared | **W0-02** | TF-T25, FR-05 | DR-02 |
| 45 | `VVM/45__System__ElevationViews/` (from 46) | shared | **W0-02** | TF-T26, FR-06 | DR-02 |
| 46 | `VVM/46__System__NorthDirection/` (from 47) | shared | **W0-02** | TF-T27, FR-07 | DR-02 |
| 47 | `VVM/47__System__DrawingPlanes/` (new) | shared | W2-40 (inert leaves), then W2-01 (wired) | TF-T39 | DR-01, DR-02, DR-32 |
| 48 | `VVM/48__System__CrossSectionViews/` (placeholder 0.1.0) | shared | W2-05 | TF-T40 | DR-26 |
| 49 | `VVM/49__System__ElevationDepthFog/` (new) | shared | W1-09 (inert leaves), then W2-03 | TF-T41 | DR-02, DR-15 |
| 52 | `VVM/52__System__Layout__PublishedDocuments/` | shared | W4-17 (inert leaves), then W4-02 | TF-T42 | DR-22, DR-25, DR-29 |
| 53 | `VVM/53__Data__Layout__PublishedSchema/` | shared | W4-01 | TF-T43 | DR-22, DR-29 |
| 54 | `VVM/54__Feature__ColourPalette/` | shared | W1-37 | TF-T44 | DR-01, DR-20 |
| 55 | `VVM/55__Feature__SpellCheck/` | shared | W2-34 | TF-T45 | DR-01, DR-20 |
| 60 | `60__Feature__FullScreenMode` | VV-reserved (TV's twin is 76) | keep | TF-T30 | DR-44 |
| 61 | `61__Feature__ShareProjectLink` | VV-reserved | keep | TF-T31 | DR-03, DR-43 |
| 62 | `62__Feature__EmailWorkers`, moving to 92 only on request | nominal collision with TV's and WCP's 62 | W6-03 if D-S01-08 is answered (a) | TF-T32, FR-22 | DR-03 |
| 63 | `63__Feature__AppNotificationEmail`, moving to 93 if TV merges its own 63 | VV-reserved, under threat | keep (A.2.7) | TF-T33 | R0.2.11 Q-63 (A.4 #5) |
| 64, 69, 71 | `64__Feature__BreadcrumbNav`, `69__System__SketchUpToValeVision__Utilities`, `71__System__ExportRenderLayers` | VV-reserved | keep | TF-T34, T35, T37 | DR-03 |
| 80 | `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (the client facade, with a VV body) | shared number | W0-12 | TF-T49, FR-16 | DR-27 |
| 91 | `VVM/91__System__2dElevationsView/` (from 40), later retired and burnt | VV legacy band | W0-02 moves it; W6-03 retires it | TF-T20; FR-01, FR-25 | DR-03 |
| 92 | `VVM/92__Feature__EmailWorkers/` | VV band | W6-03, on request | FR-22 | DR-03 |
| - | Never added: TV 62 AppInstallability, 75 UserInstructionsSystem, 76 FullscreenMode | TV-only | - | TF-T46, T47, T48 | DR-07, DR-44 |

#### A.2.2 Layout Editor target

The 17 pairs keep their names, which are already TV's. `LE/01__Core__Loader` stays VV-only and reserved (TF-L01, DR-24). The 17
TV-only subfolders are created at TV's paths. Each folder is created by the package that brings its content; no package makes an
empty placeholder folder (S06b-F48). The "Created first by" column is computed from the K3 `vv_targets` "(new)" entries in
topological order.

| VV target | Created first by | Later packages | Final status | DR |
|---|---|---|---|---|
| `VVM/51__System__LayoutEditor/21__System__SitePlanData/` | W2-14 | W5-06 (data pipeline, only under DR-08 (A)) | dormant | DR-08 |
| `.../26__System__DraftMode/`, `27__System__DrawingGrid/`, `32__System__OrthoMode/` | W1-14 (state leaves) | W2-18 (inert) | switched on by W3-05 | DR-01 |
| `.../28__System__ObjectSnap/` | W2-42 (inert leaves) | W2-19 (switch-over plus the Snapping__ shim, FR-14), W3-08 (retires Snapping__, FR-15) | live from W2-19 | DR-01, DR-05, DR-40 |
| `.../31__System__DocumentKeys/` | W1-30 | - | live | DR-33 |
| `.../33__System__DrawingAxes/` | W2-18 (inert) | - | switched on by W3-05 | DR-01 |
| `.../36__System__HatchPatternTools/` | W1-17 (with the app-root library) | W2-29 (Patterns panel) | live | DR-19 |
| `.../37__System__VectorTools/` | W1-14 (leaves) | W2-27, W2-28, W2-41 (inert) | switched on by W3-07 | DR-18 |
| `.../51__Feature__DrawingRegister/` | W1-13 (numbering leaf) | W4-18 (inert core) | switched on by W4-10 | DR-11 |
| `.../52__Feature__StatementWriter/` (with its nine subfolders) | W2-30 (`01__Core__Data` lockstep) | W4-04 .. W4-16 | behind `LayoutEditor__Statement__Enabled = false` | DR-10, DR-29 |
| `.../53__Feature__ProjectQrCode/` | W1-15 | W5-05 (only if Adam picks a Vale resolver) | switched off | DR-12, DR-43 |
| `.../54__Feature__SheetImages/` | W1-16 (render leaves) | W3-18, W3-02 (inert) | switched on by W3-09 | DR-13, DR-29 |
| `.../58__Feature__ScrapbookSpecification/` | W2-35 | - | live | DR-20 |
| `.../59__Feature__FloorAreas/` | W1-27 (inert) | - | switched on by W3-10 | DR-14 |
| `.../65__Feature__DocumentPublishing/` | W4-03 | W4-07 | after its prerequisites | DR-22 |
| `.../66__Feature__DocumentSharing/` | W4-07 | W4-08 | after 65 | DR-22, DR-23 |

#### A.2.3 App root and styles target

| Target (relative to VV app root) | Action | K3 | K2 | DR |
|---|---|---|---|---|
| `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` | add: copy of VALE's own scan (md5 59777a65) | W0-16 | TF-R04, FR-20 | DR-43 |
| `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` | add: copy from 35. Same 4.1.0 build as TV's; the bytes differ only in line endings, and both normalise to md5 44fd7777. | W0-16 | TF-R05, FR-19 | DR-03 |
| `04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/` | add | W0-16 (K3 moved it from K2's "with LE/52") | TF-R06 | DR-10 |
| `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` | add, at a VV-first vendor number | W0-16 | TF-R07 | DR-11, DR-36 |
| `50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` | add, token swapped | W0-18 | TF-R01 | DR-20 |
| `52__LayoutEditor__HatchPatternLibrary/` | add | W1-17 | TF-R03 | DR-08 (site-plan pack), DR-19 |
| `04__Lib__ThirdParty__Three/` | retire | W6-03 | TF-R08, FR-23 | DR-03 |
| `00__Archive/`, `51__LayoutEditor__UserScrapbookContent/`, `60__DistributionEmails/`, `79__Testing__GenerateObjects/`, `80__Testing__PrototypeEnvironment/`, `95__SketchUpSisterTools__ToolsAndUtils/` | keep | - | TF-R02, R10-R14 | - |
| TV's app-root `80__CloudflareIntegration/` and `Na__Pwa__ServiceWorker__.js` | never | - | TF-R09, TF-T46 | DR-07, DR-27 |
| `03__Style__AppStylesheets/`: 12 sheets keep their names | keep. W0-02 rewrites the six drawing `@import` lines (CSS index :85-90). Later `@import` lines are added in DAG order: W1-06, W1-37, W2-01, W2-03, W2-34, W4-11, W5-02, W5-04, W6-03 (`parity/data/hot_file_ownership.json`). | - | TF-S01..S13 | DR-24, DR-44 |
| `Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css` | add only if the optional Cache & Storage panel is ported | W5-04 | TF-S09 | DR-44 |
| `Na__UiFeature__Styles__PwaInstallability__.css` | never (VV uses WCP's PWA) | - | TF-S14 | DR-07 |
| `Na__UiFeature__Styles__SceneInspector__.css` | not recommended; K3 has no package for it | (W5-04, on request only) | TF-S15, FR-24 | DR-44 |

#### A.2.4 Why each move

| Row | Change | Reason (evidence) |
|---|---|---|
| FR-01 | `40__System__2dElevationsView` -> `91__System__2dElevationsView` | It must vacate TV's 40. The 9x band is where TV kept its own legacy (`90__System__PageLayoutSystem` until v2.155.0, TV DEVLOG:1287). 91 is absent from TV's current 37 folders and from all 80 folder names extracted from TV's devlog (`parity/s01work/tv_devlog_foldernames.txt`). S02a's 39 was rejected because 39 sits in the 3x/4x ranges TV is still filling (K2 §14 #11; D-S01-13). |
| FR-02..FR-07 | 42->40, 43->42, 44->43, 45->44, 46->45, 47->46 | TV holds 175 import specifiers (plus 6 CSS imports and 17 path strings) into 40 and 42-46, across 92 files, and 24 more into 47-49 (K2 TF-T22, K2 §14 #1). After the move, TV files and tests port with no path edits, 47/48/49 get their TV slots, and 70 drawing files pair with TV by identical path. S01, S02a and S09 reached this independently; it reverses VV D05 and TV plan 4.1 (DR-02). |
| FR-08 | `Na__RenderEffect__2dProfileLines__.js` -> `05__RenderPipeline/` | A file's folder follows its base name (K2 N5). Every `Na__RenderEffect__*` file lives in 05 in both apps, and TV's 40 holds only `Na__DrawView__*` files (DR-03). |
| FR-09 | `Na__DrawView__ComposerPreset__.js` -> `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | The two files have the same eight exports, and TV's RenderPreset was ported from it "interface only" (DR-04). The body stays VV's (DIV-1). Section B has the details. |
| FR-10 | `Na__AppUtils__SnapshotHistory__.js` -> `Na__AppUtils__SnapshotHistory.js` | TV leads naming. There are 2 importers per app (DR-04). |
| FR-11 | `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` -> `05__RenderPipeline/` | TV's 40 Transitions and its 42 and 45 mode controllers import TV's path. The file's own import changes depth (`../../04__MathUtils` becomes `../04__MathUtils`). (DR-04; K2 §14 #10) |
| FR-19, FR-20 | Copy jsPDF and the Vale Classic scan out of 35 | This mirrors TV v2.155.0 (TV DEVLOG:1287-1290). The LE stops depending on legacy 35 (S01-F05, S03b-F36, S08-F20, S09-F03, S09-F04). |
| FR-21, FR-23, FR-25 | Retire 35, the old three.js folder and 91 | User-visible removals, made once nothing needs them (DR-03; see A.2.6) |
| FR-22 | 62 -> 92 | Nothing ports across 62, so the collision is nominal. The move is deferred until node_modules is untracked (D-S01-08). |
| TF-T49, FR-16 | Add `VVM/80__CloudflareIntegration/` | 29 TV files outside 80 name it (27 import it). They port unchanged once the facade exists at TV's path (DR-27; Section C). |

#### A.2.5 The named cases

**`40__System__2dElevationsView` (legacy Tools > Elevation View).**
- **W0-02 (D1, FR-01)** moves it to 91 after FR-08 has taken `Na__RenderEffect__2dProfileLines__.js` to `05__RenderPipeline/`. The
  composer's 2D profile pass (`Na__DrawView__ComposerPreset__.js:91-93`) depends on that file, so it outlives the tool. The script
  rewrites the tool's own fetch path (`Na__ElevationView__SystemLogic.js:67`, `Na__Elev__CONFIG_PATH`) and its imports
  (`VV/index.html:1375-1376`).
- **W6-03 (FR-25)** retires 91 once Adam confirms. It drops the legacy call from the image-export override chain at
  `VV/index.html:1874` (`Na__ElevationView__GetExportOverrides() || ...ComposerPreset__GetExportOverrides()`, which becomes the
  RenderPreset call alone). It also removes the import pair, the initialiser at `:2149` and the Tools-menu entry at `:519-526`.
  91 is then burnt.

**`41__System__CrossSectionView` (VV's live section tool) versus TV `41__System__SectionCutEngine`.**
- Keep VV's name (K2 N6, TF-T21, DR-26). No file name is shared, so renaming the folder would resolve none of TV's 16 import
  statements into 41 (K2 §14 #7). Ported files reach the engine through `40/Na__DrawView__SectionAdapter__.js`, and
  `CrossSection__SceneData` stays VV's schema (DR-41).
- Add `VVM/41__System__CrossSectionView/README__CrossSectionView__.md` naming the twins and TV's 48 (A.4 #3; W0-06 creates it
  since R6 F.8 C14).
- When TV's 48 placeholder lands (W2-05), VV renames its own colliding Dev-gate ids (`naCrossSectionDevItem/Toggle/Panel/EnableCheck/Save`
  at `VV/index.html:855-866` and `41/Na__UiFeature__CrossSectionView__DevControls.js:79-83`) to `naCrossSectionToolDev*`. TV's
  `48/Na__CrossSection__DevMenu__Editor__.js` then ports byte for byte (DR-26).

**`35__System__PageLayoutSystem` (legacy Create Drawing page).**
- Extract first: W0-16 copies jsPDF and VALE's Classic A3 scan (A.2.3), then repoints LE AppConfig `:105-108` and `:402`, the
  `ConfigState__SheetSetup__.js:396` fallback and the two test pages (`Na__Test__SpecificationPdf__.html:31`,
  `Na__Test__TitleBlockCells__.html:70`).
- The originals stay until W6-03, because the Create Drawing tab still opens
  `./02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`
  (`30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js:627`, button `VV/index.html:354`, overlay `:215`).
- TV's `TitleBlock__ClassicScan__A3__.png` (md5 7614f27e) is a red "PLACEHOLDER" image, opened and checked here. It must never be
  copied (A.4 #1).

**Non-drawing collisions and near-twins.**

| Case | Treatment |
|---|---|
| 62: VV EmailWorkers versus TV/WCP AppInstallability | Record the collision now and move to 92 only on request (W6-03). |
| 60 versus 76: full screen | Keep VV's 60 unless Adam wants TV's startup invitation (DR-44, D-S10-07). |
| 27 ContextMenuSystem | Shared number, partial content (renderer and styles only; W4-11). |
| 75 UserInstructionsSystem | Not ported (DR-44). |
| App root, TV's two 80s (worker and testing) | Neither app changes; VV never adds the worker folder. |
| App root, VV's two 04s | Ends when FR-23 retires `04__Lib__ThirdParty__Three`. |
| `00__Archive` versus `00__ArchivedVersions`; 95 versus 90 sister tools | Out of scope; recorded in the registry. |
| Scrapbook content subfolders | VV's layout is the complete one; the fix is TV-side (WT-04). |

#### A.2.6 Retirements, and what each must keep

| Retire | When | Keep or do first | Remove or repoint | Evidence |
|---|---|---|---|---|
| `VVM/35__System__PageLayoutSystem/` (25 tracked files) | W6-03, after Adam confirms the user-visible removal (hard gate) | jsPDF and the Vale Classic A3 scan (W0-16). **Also decide** what to do with the other Vale title-block material, which no package keeps: the "VizDpt" A3 variant (`02__VizDpt__TitleBlock__Pdf__/`, pdf and png, md5 05085a29, a CRITICAL NOTE panel layout) and the 12 per-size A1-A3 layout PDFs and PNGs in `03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/`. Options: copy them beside the Classic scan in `06__AppAssets__TitleBlocks/`, or leave them to git history. | Create Drawing button `:354`, overlay `:215`, handler `ImageExport__Controls.js:564-646`, and comments in four LE files (TF-T19). 35 is burnt. | TF-T19, FR-21, S03b-F36 |
| `VVM/91__System__2dElevationsView/` (7 files after FR-08) | W6-03 | 2dProfileLines is already in 05 (W0-02); keep RenderPreset's `GetExportOverrides` | `VV/index.html:1375-1376`, `:1874`, `:2149`, `:519-526`; FacePick comment `:39`. 91 is burnt. | TF-T20, FR-25, DR-03 |
| `VV/04__Lib__ThirdParty__Three/` (17 tracked files) | W6-03 | nothing: superseded by vendor 01 (three r184, VV D40) | Comments only: `WCP/.../Whitecardopedia__Pwa__ServiceWorker__Logic__.js:131` and `WebApps/live_sw.js:41`. Re-run `k2_refscan.py` before deleting. | TF-R08, FR-23, S01-F56 |
| Move, not retire: 62 -> 92 | W6-03, only if D-S01-08 is answered (a) | Untrack the 1,857 tracked node_modules files first. Adam re-points `BUILD__Deploy__EmailWorker.bat.lnk` (a binary file holding an absolute path). | CSS index `:65`, `VV/index.html:1382`, the 63 PayloadBuilder comment `:12` | TF-T32, FR-22, S01-F57 |
| Files, not folders: `Na__LayoutEditor__Snapping__.js` (FR-14 W2-19, FR-15 W3-08) and `Na__AppUtils__R2DrawingNotes__.js` (FR-18 W2-33) | see Sections B and C | | | |

#### A.2.7 Reserved ranges: the folder-number registry

`VV/ValeVision__NOTES__FolderNumberRegistry__.md` is created by W0-06, and W0-04's naming lint fails on any folder number the registry
does not list. The table is K2's (K2 N3, K2 §8, DR-03 option (i)). The additions made here are marked **(R1)**.

| Number space | Shared (TV names it, VV mirrors it) | TV-only and TV growth (VV never takes these) | VV-reserved (TV never takes these) | Burnt |
|---|---|---|---|---|
| Module top level (`02__Src__AppModules/NN__`) | 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 40, 42-46, 50, 51, 70; then 27, 47, 48, 49, 52, 53, 54, 55 and 80 as their ports land. 41 is the same number with a different engine (DIV-2). | TV-only, never in VV: 62, 75, 76. TV growth: **08, 09, 12-14, 16-19 (R1: unowned in K2; R0.2.11 Q-REG)**, 22-24, 32-34, 36-39, 56-59, 65-68, 72-74, 77-79, 81-89 | 28, 29, 31, 60, 61, 63, 64, 69, 71; 62 (to 92 only on request, FR-22). VV band: 91 (legacy), 92 (EmailWorkers), 93-99 free | 90 (TV's PageLayoutSystem); 35 and 91 once W6-03 retires them |
| LE subfolders (`LE/NN__`) | every TV number | TV's | 01 (VV loader). **R1 proposal:** LE/91-99 for any future VV-only LE subfolder. | - |
| Vendors (`04__Lib__ThirdParty__VersionLocked/NN__Vendor__`) | 01-06 | - | 07 PdfJs v3.11.174 (VV-first, offered to TV) | - |
| Asset subfolders (`01__AppAssets__<App>/NN__AppAssets__`) | 05, 06 | - | VV's unnumbered `MeasureToolIcons` | - |
| App root | 01 (token swapped), 02, 03, 04, 50 (token swapped), 51, 52, 60, 79, 80__Testing | TV `80__CloudflareIntegration` (worker) | `04__Lib__ThirdParty__Three` (until FR-23); 95 sister tools (TV uses 90) | - |

**Live threat to 63 (R1).** TV branch `claude/westfarm-intro-notes-37b804` (commit 4db73420, 22-Sep-2026, not in TV main, checked
out in a worktree under `na-project-portal/26-Projects/RB05__WestFarm/30__TrueVision__AppContent/.claude/worktrees/`) adds
`TVM/63__System__LocalFileParity/` (Logic, Modal, Registry, Styles, Watcher). The same commit edits drawing-system files
(`Na__AppUtils__LocalProjectMirror__.js`, `40/Na__DrawView__ProjectData__.js`, LE AutoSave and SpecData Draft/Transport) and adds
`NAAPPS/ProjectVision__TrueVisionFileWatch__Api__.py`. TV main has no 63 today.

If it merges as 63:
- K2 N2 forces VV's `63__Feature__AppNotificationEmail` to move, because a VV-only folder may not hold a number TV uses.
- The feature is drawing-system, so VV will want it at TV's 63.

Recommendation, which needs a decision (no K1 DR covers it; R0.2.11 Q-63, named in W0-06 and W6-03 by R6 F.8 C35):
- **(a) Preferred:** before the branch merges, Adam renames the folder to a TV-growth number, for example
  `65__System__LocalFileParity`. That costs 5 files plus `Index.html` on an unmerged branch.
- **(b) Fallback:** VV moves 63 to `VVM/93__Feature__AppNotificationEmail/`. That costs 3 files and one import at
  `VVM/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js:25`. The template loads through
  `new URL('./...', import.meta.url)`, so it is move-safe. It can travel with W6-03, next to 62 -> 92.

Either way, the registry only binds TV once a TV twin exists: WT-08 adds `TV/TrueVision__NOTES__FolderNumberRegistry__.md`
(R6 F.8 C32; DR-36 (b)). TV itself reassigned 52 and 53 in v2.155.0 (TV DEVLOG:1284-1286), so "never reuse a number" is today a VV-side rule
only.

#### A.2.8 Project-storage folder names (names only; transport is Section C)

New VV content sits under the existing prefix `VaApps/Projects/{folderId}/`, using TV's relative folder names verbatim:

- `05__Layout__DrawingDocs__Images/<DocumentId>/`
- `06__Layout__PublishedDocuments/`
- `10__StatementDocs/`

This is K2 R3 and DR-29 (A); `ValeVision__StatementDocs__.json` is config only. Existing VV object names do not change: `project.json`,
`ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/`, `LayoutEditor/Snapshots/` and `PresentationMode/Thumbnails/` (K2 R2).
Nothing may be written into these subfolders until Adam has applied the sync-purge fix (DR-06, W0-07, swarm rule R8).

---

### A.3 The renumbering procedure (W0-02: atomic, scripted, verified)

#### A.3.1 What it changes

The tool is `parity/report/tools/k2_renumber_apply.py`, which has dry-run, copy and git modes. Its default dry run was re-run on the
live tree on 01-Oct-2026 and matches K2 exactly.

| Pass | Effect | Count |
|---|---|---|
| F1-F4 file moves | FR-08 2dProfileLines -> 05; FR-10 SnapshotHistory name; FR-11 DistanceCulling -> 05; FR-09 ComposerPreset -> RenderPreset | 4 |
| D1-D7 folder moves | FR-01 40 -> 91, then FR-02..FR-07 (each target is free when its turn comes) | 7 folders; 81 file paths change (71 + 8 + 2) |
| T8 | Delete the PORT NOTE bullets that W0-02 makes false ("Import paths follow the ValeVision folder numbers ...", the SnapshotHistory bullets) | 31 lines |
| T1-T6 | 2dProfileLines specifiers (3); DistanceCulling specifiers (4; the shared WCP precache line is excluded); recomputed self-imports of the two files that change depth (2); SnapshotHistory (5); ComposerPreset -> RenderPreset (54) | 68 |
| T7 | The seven full old folder names, in one pass. Every old name is unique, so no replacement can chain. | 233 |
| Total | 94 files rewritten (48 inside the moved folders, 46 outside), 332 replacements; **0 retired names left** | |

All rewrites are byte-exact (CRLF, LF and BOM are preserved). History documents are skipped: the devlog, the ledger, `__PLAN__`,
`Research__` and `TASK__` files. The only hand edits are the FR-09 PORT NOTE (filled example in K2 rulebook §3) and the optional
camera argument on `RenderFrame` (S02a-F14).

#### A.3.2 Runbook

**Step 0: preflight (read-only).**
1. W0-01 has recorded DR-02, DR-03 and DR-04 (or their defaults), and Adam has committed that PLAN edit on its own, so it is in
   HEAD: W0-01 writes `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` inside the VV app root, and item 2 would otherwise
   refuse the tree (the Wave 0 deadlock, R6 F.8 C10). DR-07 gates only the deploy.
2. `git -C D:/10_CoreLib__ValeCodebase status --short -- WebApps/ValeVision3D` is empty (W0-01's commit is in HEAD). The script refuses a dirty VV tree
   in git mode (`k2_renumber_apply.py:269-273`). Today WCP is not clean (A.4 #6): Adam commits or sets aside that sync data first
   (R6 F.5.2 W0 entry; F.8 C4).
3. Read the top of `VV/ValeVision__DEVLOG__.md` fresh (parallel sessions bump it).
4. No other VV package is in flight. Close editors on VV, stop `WCP/server.py`, and make sure no shell has its working directory
   inside `02__Src__AppModules`: on Windows, a directory rename fails while another process holds a handle inside it.
5. `git worktree list`: nobody is working in the stale VV worktrees (risk 7 in A.3.4).
6. Baselines, all re-run 01-Oct-2026:
   - `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs`: 517 modules, 0 failures. One known vendor issue
     (three-edge-projection worker) is reported in the import-map targets and is unchanged by W0-02.
   - `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs`: 415 files, PASS.
   - `python <parity>/report/tools/k2_path_gate.py --names ZZZ_NONE`: PASS (0 fail, 1 warn).
7. `python <parity>/report/tools/k2_renumber_apply.py` (dry run) prints `RETIRED NAMES LEFT ...: 0`.

**Step 1: apply.**
`python <parity>/report/tools/k2_renumber_apply.py --mode git --report <parity>/k2work/renumber_git_report.json`, without
`--edit-wcp-sw` (DR-07). Then make the two hand edits.

**Step 2: gates, all of which must pass before the commit.**
1. ModuleGraph and Exports exit 0 (K3 gates G1, G2).
2. `k2_path_gate.py` with its default retired-name list exits 0 (K3 gate G3). Today 288 lines fail it; the copy run showed 0.
3. Every `80__Testing__PrototypeEnvironment/*.test.mjs` passes (6/6).
4. `git diff -M --stat` shows every move as a rename.
5. The pairing report shows 70 files: 16 + 10 + 8 + 15 + 13 + 8. Unpaired by design are VV `ThumbnailBake__` and TV `DevRowShell__`,
   `DraftGuard__`, `DraftMaths__`, `DrawingUsage__`, `ProfileLines__`, `StoreyRow__`, `StoreyLevel__`, `AutoName__` and
   `AutoNameText__`.

**Step 3: Adam's smoke test on localhost (the W0-02 acceptance list).**
The app loads; legacy Elevation View works from 91; a plan, an elevation and a section open; the North compass and the Dev panels
open; a sheet renders, bakes, saves and prints to PDF; the Specification tab opens.

**Step 4: commit W0-02 on its own.**
Adam commits it, code only, before any other W0 package is dispatched (R6 F.8 C10; K3 R11). That keeps K2's one-commit `git revert` possible, which K3's "one commit per wave"
rule would lose (A.4 #8). The records follow in W0-06 and W0-99 (Step 5).

**Step 5: records.**
- W0-06 writes the ledger's "Folder renumbering" old-to-new table with the four file moves, the registry file, the dated D05 note
  in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, the realign-plan mirror and the 41 README (R6 F.8 C14).
- W0-99 writes the devlog entry, taking the version from a fresh read.
- Historical rows keep their paths (K2 §13).
- TV plan 4.1 (`TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:304-321`) gets its dated note only through WT-08
  (DR-36).

**Step 6: deploy.** Do not deploy before W0-08 is prepared and Adam has made the DR-07 token call (risk 5 in A.3.4).

**Rollback.**
- After the commit: `git revert <W0-02 sha>`.
- If the apply stopped partway: `git reset --hard HEAD`. This is safe only because Step 0 demanded a clean tree. Then delete any
  new-named folders left holding ignored files (`git status --ignored`), clear the lock and re-run.

**If Adam declines part of the plan.** DR-02 (b) cancels W0-02. DR-03 (b) runs `--legacy 39`. Declining parts of DR-04 runs
`--no-renderpreset`, `--no-distanceculling` or `--no-snapshothistory`. Each variant dry-runs clean (K2 §9).

#### A.3.3 Place in the waves (K3)

| Package | Folder work | Depends on |
|---|---|---|
| W0-01 | Records the DR-02, DR-03 and DR-04 answers as VV D-numbers; Adam commits that PLAN edit alone before W0-02 is dispatched (R6 F.8 C10) | - |
| **W0-02** | The renumber (FR-01..FR-11); the highest-contention package (21 hot files), run alone, then committed alone (R6 F.8 C10) | W0-01, committed by Adam |
| W0-03 | Hotkey JSON file names (FR-12, FR-13). `VV/index.html` is edited in the serial order W0-02 -> W0-03 -> W0-17. | W0-02 |
| W0-05 | Port-order map, computed on the renumbered tree | W0-02 |
| W0-06 | Registry file, ledger folder map, D05 note, realign-plan mirror (and the 41 README, R6 F.8 C14) | W0-02 |
| W0-04 | Swarm gates, including the "unregistered folder number" lint | W0-03, W0-06 |
| W0-08 | Shared service-worker package: precache line :318 repointed to 05, cache split, registrar hold. Prepared, not bumped. | W0-02 |
| W0-12 | `VVM/80__CloudflareIntegration/` facade | W0-09, W0-10, W0-11, W0-03 |
| W0-16 | Vendors 05, 06 and 07 and `06__AppAssets__TitleBlocks` (copies out of 35) | W0-15 |
| W0-18 | `50__ValeVision__UserConfig/` | W0-09 |
| W0-99 | Devlog entry and ledger "Folder renumbering" section | every W0 package |
| W1-W4 | TV-only folders, created by their owner packages (A.2.1, A.2.2) | wave barrier (K3 R11) |
| W6-03 | Retire 35, 91 and the old three.js folder; 62 -> 92 on request | W5-99 and Adam's hard gate |
| WT-08 | TV plan 4.1 note; TV registry twin (R6 F.8 C32) | DR-36 (b), per-package approval |

#### A.3.4 Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Path kinds the module-graph harness cannot see**: CSS `@import` (CSS index :85-90), `new URL(..., import.meta.url)`, config path strings (`Na__Elev__CONFIG_PATH` at legacy SystemLogic:67), description text (`Na__AppConfig__Main.json:385`; ScrapbookParametric Config :90), test path segments (`Na__Test__NorthCompass__.test.mjs:53`), `// @delegate:` lines in `VV/index.html` and LoadingSequence, and quoted folder tokens | The script rewrites all of them (T7). The K2 path gate (`k2_path_gate.py`: retired names, CSS imports, `new URL`, path strings, folder tokens) runs in W0-02 and after every package (G3). Today it checks 28 CSS imports, 34 `new URL` calls, 152 path strings and 11 folder tokens. |
| 2 | **Config paths into VV-only folders**: the LE config into 35 (AppConfig :105-108, :402; SheetSetup :396; test pages :31 and :70; ImageExport :627) and the TV config tokens in A.1.6 | W0-16 repoints the 35 paths before W6-03 deletes anything. App-token folder names are re-applied seams on every port, and the W0-04 lint fails on NA-only markers outside its exemptions: the whole PORT NOTE block of a file, history documents and the named TrueVisionHub statement file; a hit on W0-04's baseline allow-list prints WARN (K3 G4, R6 F.8 C13). |
| 3 | **TV comments carrying VV's pre-renumber names** (A.1.6: ConfigState :33, Styles__DevMenu__.css :67) bring retired names back on a verbatim port | G3 flags them. Rewrite them at port time (W1-06 takes the CSS) and offer TV the fix (WT-08). |
| 4 | **R2 and asset keys** | No stored data or key embeds a module path: 0 of the 161 project JSON files under `WCP/Projects/` contain `02__Src__AppModules`, and R2 object names carry no folder numbers (K2 R2). W0-02 needs no data migration. New storage folders wait for DR-06 / W0-07 (A.2.8). |
| 5 | **The shared service-worker cache.** VV runs under WCP's worker (`VV/index.html:44`). By code, the registrar registers `WebApps/Na__Pwa__ServiceWorker__.js` (`Whitecardopedia__Pwa__Url__Constructor__.js:38, :225-232`), which `importScripts` the logic file. On the live site, JS and CSS are stale-while-revalidate (`...ServiceWorker__Logic__.js:696`) while HTML is network-first (`:686-689`). A returning visitor's first load after deploy can therefore run a cached `LoadingSequence.js` with the old specifiers beside a fresh `index.html` with the new ones. That gives duplicate module instances, or a 404 that stops the boot. Old-path entries then stay in the uncapped shell cache (token `2026-09-18-1`, `:229`). The precache line `:318` (DistanceCulling) goes stale, which is harmless because the install is best-effort per URL (`:592-600`). `WebApps/live_sw.js` is an older, unreferenced tracked copy of the logic file (token `2026-09-10-6` at `:68`; `:157` is its DistanceCulling precache line). | W0-08 prepares the fix and Adam bumps the token at the W0 deploy (DR-07). The localhost smoke test cannot show this hazard, because development origins are network-first-revalidate (`:692-694`), so check the first post-deploy load on the live site. |
| 6 | **Parallel sessions**: devlog bumps, hot-file edits, TV moving after the pin | Follow the Step 0 preflight. One owner per file per wave (K3 R1). At every wave start, re-run `k2_build_maps.py`, which re-checks VV-only numbers against TV's current folders and devlog, and diff TV's top level against the registry (the 63 branch shows why). |
| 7 | **`.claude` worktrees hold pre-renumber copies of VV**: `VV/.claude/worktrees/drawing-layout-editor-controls-6ecdac` (bb290544), `VV/.claude/worktrees/valevision-config-timeout-c1cffd` (dde6935a), `WebApps/.claude/worktrees/valevision-user-data-arch-976836` (dde6935a), plus an empty, unregistered `valevision-user-data-features-acf1ae`. All their commits are already in main. They are excluded by `.git/info/exclude` (`**/.claude/worktrees/`), and the K2 tools skip `.claude`. | Never grep an app or WebApps root. Any swarm agent that runs in its own worktree must branch from the W0-02 commit or later: a branch cut earlier that adds a file under an old folder brings that folder back on merge, which G3 and the W0-04 lint will flag. Adam may remove the stale worktrees (`git worktree remove`; his call). |
| 8 | **A half-applied renumber.** The script writes all 94 files before the first `git mv` and exits on a failed move without undoing anything (`k2_renumber_apply.py:320-341`). | Step 0 item 4 (no open handles) and the documented rollback. Improve the script: move first and then write to the final paths, or roll back automatically on failure. |
| 9 | **Hot-file contention**: W0-02 rewrites 21 hot files, including `VV/index.html`, the CSS index, LoadingSequence, the LE ModeController, SnapshotRenderer and MarkupBridge | Run it alone. After it, keep the serial orders in `parity/data/hot_file_ownership.json` (index.html: W0-02 -> W0-03 -> W0-17; LoadingSequence: W0-02 -> W0-13). |
| 10 | **Provenance** | History documents are never rewritten. In-module log and comment text that names an old folder IS rewritten (the zero-hit acceptance requires it), so the ledger's old-to-new table is the bridge. TV PORT NOTEs naming VV's old paths stay in TV (K2 §13). |
| 11 | **The tools live in a temporary scratchpad.** K3 gate G3 and the W0-02 commands run scripts from the session-specific `parity/report/tools/`. | Before the swarm starts, copy `k2_renumber_apply.py` and `k2_path_gate.py` somewhere durable. The gate belongs in VV as `80__Testing__PrototypeEnvironment/Na__Verify__PathGate__.py` (K2 F7 naming), in W0-04. |

---

### A.4 Corrections and additions to K2 and K3 found while writing this section

| # | Finding | Evidence | Action |
|---|---|---|---|
| 1 | K2 FR-20 calls TV's Classic scan an "NA scan". It is a placeholder image showing the word PLACEHOLDER four times, as S03b-F36 said. | `TV/01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (md5 7614f27e), viewed | Wording only. VV still copies its own scan (md5 59777a65). |
| 2 | Folder 35 holds Vale title-block material that no package keeps: the VizDpt A3 variant and 12 per-size A1-A3 layouts | `VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/` (md5 05085a29), `03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (12 files), viewed | Done: W6-03's hard gate (R6 F.8 C31); the choice is R0.2.11 Q-35ASSETS |
| 3 | No K3 package creates `VVM/41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6 and TF-T21; DR-26 lists it) | Searched every `vv_targets` entry in `wp_canonical.json` | Done: W0-06 creates it (R6 F.8 C14) |
| 4 | K2's registry leaves 08, 09, 12-14 and 16-19 unowned, so the W0-04 "unregistered number" lint has gaps | Set check of K2 N3 bands over 01-99 | Assign them to TV growth (A.2.7); R0.2.11 Q-REG, named in W0-04 and W0-06 (R6 F.8 C35) |
| 5 | An unmerged TV branch takes VV-reserved 63 (`63__System__LocalFileParity`) and changes drawing-system files | `git show 4db73420`; absent from TV main | New decision, not in K1: R0.2.11 Q-63 (rename it on the branch, or move VV 63 -> 93; A.2.7) |
| 6 | W0-02's acceptance demands a clean WCP tree. Today WCP has unrelated sync output: modified `03__AppData/Na__AppData__MasterConfig__Main.json` and `Na__MasterIndex__ProjectLocations__.json` (19 lines added, 1 removed) and an untracked `Projects/2026/64348__Mathison/`. The script itself checks only VV. | `git status --short -- WebApps/Whitecardopedia`; `k2_renumber_apply.py:269-273` | Adam commits or sets aside the sync output first (R6 F.5.2 W0 entry; F.8 C4) |
| 7 | The script has no rollback once the text pass has run | `k2_renumber_apply.py:320-341` | A.3.4 risk 8 |
| 8 | K2's rollback (one W1 commit) conflicts with K3 R11 and S11 B10.7 (Adam commits per wave) | `K2__TargetMaps.md` §9 "Rollback"; `K3__WorkPackages.md:44` | Commit W0-02 alone (A.3.2 Step 4); now in K3 R11 and the W0-01 and W0-02 acceptance (R6 F.8 C10) |
| 9 | Two TV comment lines carry VV's pre-renumber names outside a PORT NOTE | A.1.6 | Port-time rewrite (W1-06); offer TV the fix (WT-08) |
| 10 | WT-08 does not list a TV twin of the registry, although K2 §8 says both repos keep the table; TV already reuses its own numbers (52/53) | `wp_canonical.json` WT-08 targets; TV DEVLOG:1284-1286 | Done: WT-08 lists it (R6 F.8 C32) |
| 11 | The registered service worker, by code, is the WebApps stub, not `live_sw.js`. That narrows S01 W7 and K2 open issue 6; what the deployed site actually serves is still unverified (R0 P10: resolved in code, one live check left at the W0 deploy; R6 F.8 C5). | `Whitecardopedia__Pwa__Url__Constructor__.js:38, :225-232`; `WebApps/Na__Pwa__ServiceWorker__.js` | Check on the live site at the W0 deploy |
| 12 | 27 is a partial folder by design (2 of TV's 9 files) and lands in W4-11, not K2's "W2 (with LE/52)" | K3 W4-11 `vv_targets` | Registry entry: "shared number, partial content (DR-44)" |
| 13 | K2's JSON shows `[0, 0]` file counts for vendor and legacy-library rows, because the tree snapshots skip `04__Lib__*`. On disk: TV 600 vendor files, VV 598, VV `04__Lib__ThirdParty__Three` 17 tracked. | `parity/ref/tree_*.tsv` versus `find` and `git ls-files` | Data note only |
| 14 | The gate and renumber scripts sit in a temporary scratchpad | K3 G3 command text | A.3.4 risk 11 |
