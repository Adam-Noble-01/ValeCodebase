# K2 - Canonical Target Maps and the Renumbering Procedure

TV = TrueVision3D (lead, HEAD b2aa9151, v2.172.0). VV = ValeVision3D (target, HEAD 7b4e593a, v2.71.0). Both trees were clean
when measured (01-Oct-2026). Paths are relative to each app root; in the tables `LE/` = `02__Src__AppModules/51__System__LayoutEditor/`,
`styles/` = `03__Style__AppStylesheets/`, and a bare `NN__...` folder is under `02__Src__AppModules/`.

**Machine-readable maps (the source of truth for the swarm):**

- `parity/data/target_folder_map.json` - 113 rows (top 49, le_sub 35, root_content 14, style 15).
- `parity/data/file_rename_map.json` - 25 rows (13 move, 4 rename, 3 shim, 5 retire).
- Rulebook: `parity/report/K2__NamingRulebook.md`.

**How they were built.** `parity/report/tools/k2_build_maps.py` generates both JSON files and every table between the
`BEGIN:K2` / `END:K2` markers below. Importer lists are measured from the live trees by `k2_refscan.py` (read-only grep with
import / css / string / comment / history classification); file and line counts come from `parity/ref/tree_*.tsv`. The builder
validates every row: required fields, enums, decision ids against `decisions.json`, finding and work-package ids, that every
`current_vv` exists in VV and every `tv_equivalent` exists in TV, that no two rows share a target, and that each number a VV-only
folder moves to is free in TV's current folder list AND absent from every folder name TV's devlog has ever used. Result: PASS.

**Assumption.** Adam accepts the recommended decisions. Every row lists the raw decision ids it depends on (`decision_refs`) and,
computed from K1's `parity/data/decision_raw_map.json`, the consolidated K1 decisions (`dr_refs`, e.g. DR-02). Where slices
disagreed and K1 has ruled, the rows follow K1's recommended answer (DR-07 no package edits the shared service worker, DR-08
site plans dormant, DR-10 Statement Writer last behind its switch, DR-12 QR switched off, DR-19 both hatch packs, DR-22/23
publishing and sharing after their prerequisites, DR-26 port the 48 placeholder and rename VV's own colliding ids, DR-29 TV's
storage folder names). Phases: **W1** = the atomic renumber (first, alone), **W1b** = hotkey file names (right after W1),
**W2** = with the feature ports, **W3** = deferred / decision-gated.

---

## 1. Headline

1. **One scripted change (W1) aligns every drawing-system path.** Seven folder moves (legacy `40__System__2dElevationsView` ->
   `91`, then 42->40, 43->42, 44->43, 45->44, 46->45, 47->46) and four co-located file moves/renames (2dProfileLines -> `05`,
   ComposerPreset -> RenderPreset, SnapshotHistory loses its `__`, DistanceCulling -> `05/`). The script
   (`tools/k2_renumber_apply.py`) was run on a full copy of VV: **94 files rewritten, 0 retired names left, ModuleGraph PASS
   (517 modules, 0 failures), Exports PASS (413 files), all 6 VV node tests PASS, k2 path gate PASS, and 70 shared drawing files
   now pair with TV by identical relative path** (69 + RenderPreset). Nothing in VV was touched.
2. **Corrections to the slice lists the script needed:** 31 PORT NOTE lines in 31 files become false at W1 (28 x "Import paths
   follow the ValeVision folder numbers (...)", 3 about SnapshotHistory's file name; no slice listed them; the script removes
   them); two test pages load jsPDF from the legacy 35 folder (`Na__Test__SpecificationPdf__.html:31`,
   `Na__Test__TitleBlockCells__.html:70`; S01/S09 missed them); DistanceCulling's own import changes depth when it moves.
   Snapping__ has **10** importing files, not 11 (S01 counted a comment). Full list in section 11.
3. **VV-only numbers.** Only one VV-only folder moves: legacy 40 -> **91** (W1). EmailWorkers keeps 62 (a nominal collision,
   recorded; DR-03 default "62 unchanged") and moves to **92** only if Adam asks (FR-22; K3 W6-03, after node_modules is
   untracked). Both numbers are proved free in TV now and in TV's history. Everything else VV-only stays and is reserved in a registry
   (section 8); the 9x band is VV's legacy/VV-only band (TV's own legacy PageLayoutSystem lived at 90).
4. **TV-only folders** land at TV's numbers, which are all free in VV once W1 has run: top-level 27, 47, 48, 49, 52, 53, 54, 55,
   80 and all 17 TV-only LE subfolders - some dormant or switched off (LE/21 site plans dormant, LE/52 Statement Writer behind its
   switch, LE/53 QR off) and 52, 53, LE/65, LE/66 only after the publishing prerequisites. VV never adds TV 62 AppInstallability,
   75, 76 or TV's app-root worker folder.

---

## 2. Target folder map - top level (`02__Src__AppModules/`)

<!-- BEGIN:K2:top -->
| Id | VV now | VV target | TV equivalent | Action | Phase | Importers to update | K1 DR | Raw decision ids |
|---|---|---|---|---|---|---|---|---|
| TF-T01 | 01__AppCore/ | 01__AppCore/ | 01__AppCore/ | **keep** | - | - | - | - |
| TF-T02 | 02__AppData/ | 02__AppData/ | 02__AppData/ | **keep** | - | - | DR-33 | D-S03a-03, D-S05a-04 |
| TF-T03 | 03__AppUtils/ | 03__AppUtils/ | 03__AppUtils/ | **keep** | W1 (SnapshotHistory) + W2 | - | DR-04, DR-27, DR-33 | D-S02b-12R, D-S11-08, D-S09-04, D-S12-01, D-S05a-04 |
| TF-T04 | 04__MathUtils/ | 04__MathUtils/ | 04__MathUtils/ | **keep** | - | - | - | - |
| TF-T05 | 05__RenderPipeline/ | 05__RenderPipeline/ | 05__RenderPipeline/ | **keep** | W1 (receives two files) | - | DR-03, DR-04 | D-S01-13, D-S01-07, D-S09-V02 |
| TF-T06 | 06__Scene__LightingEffects/ | 06__Scene__LightingEffects/ | 06__Scene__LightingEffects/ | **keep** | - | - | - | - |
| TF-T07 | 07__Scene__EnvironmentEffects/ | 07__Scene__EnvironmentEffects/ | 07__Scene__EnvironmentEffects/ | **keep** | - | - | - | - |
| TF-T08 | 10__NavigationAndCameras/ | 10__NavigationAndCameras/ | 10__NavigationAndCameras/ | **keep** | - | - | DR-33 | D-S05a-04 |
| TF-T09 | 11__CameraUtils/ | 11__CameraUtils/ | 11__CameraUtils/ | **keep** | - | - | - | - |
| TF-T10 | 15__ModelLoader/ | 15__ModelLoader/ | 15__ModelLoader/ | **keep** | - | - | - | - |
| TF-T11 | 20__System__MaterialsSystem/ | 20__System__MaterialsSystem/ | 20__System__MaterialsSystem/ | **keep** | - | - | - | - |
| TF-T12 | 21__System__PresentationMode/ | 21__System__PresentationMode/ | 21__System__PresentationMode/ | **keep** | - | - | - | - |
| TF-T13 | 25__System__3dObject__InteractionSystem/ | 25__System__3dObject__InteractionSystem/ | 25__System__3dObject__InteractionSystem/ | **keep** | - | - | DR-16 | D-S02b-02 |
| TF-T14 | 26__System__ToggleModelElements/ | 26__System__ToggleModelElements/ | 26__System__ToggleModelElements/ | **keep** | - | - | DR-09 | D-S01-14, D-S09-07 |
| TF-T15 | 28__System__GridLineSystem/ | 28__System__GridLineSystem/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T16 | 29__System__FogPlaneSystem/ | 29__System__FogPlaneSystem/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T17 | 30__System__ImageExport/ | 30__System__ImageExport/ | 30__System__ImageExport/ | **keep** | - | - | DR-03 | D-S09-10 |
| TF-T18 | 31__System__VideoStudio/ | 31__System__VideoStudio/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T19 | 35__System__PageLayoutSystem/ | - | - | **retire** | W2 (extract) + W3 (retire) | 9 files / 13 refs | DR-03, DR-43 | D-S01-02, D-S09-10, D-S03b-10 |
| TF-T20 | 40__System__2dElevationsView/ | 91__System__2dElevationsView/ | - | **renumber** | W1 | 4 files / 6 refs | DR-03 | D-S01-13, D-S01-02, D-S02a-04, D-S09-10 |
| TF-T21 | 41__System__CrossSectionView/ | 41__System__CrossSectionView/ | 41__System__SectionCutEngine/ | **keep** | - | - | DR-26, DR-41, DR-42 | D-S01-09, D-S01-04, D-S12-V02 |
| TF-T22 | 42__System__DrawingViewCore/ | 40__System__DrawingViewCore/ | 40__System__DrawingViewCore/ | **renumber** | W1 | 51 files / 124 refs | DR-02, DR-04 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03, D-S01-06, D-S02a-10 |
| TF-T23 | 43__System__FloorPlanViews/ | 42__System__FloorPlanViews/ | 42__System__FloorPlanViews/ | **renumber** | W1 | 11 files / 22 refs | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| TF-T24 | 44__System__PlanAnnotations/ | 43__System__PlanAnnotations/ | 43__System__PlanAnnotations/ | **renumber** | W1 | 7 files / 14 refs | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| TF-T25 | 45__System__PlanDimensions/ | 44__System__PlanDimensions/ | 44__System__PlanDimensions/ | **renumber** | W1 | 9 files / 33 refs | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| TF-T26 | 46__System__ElevationViews/ | 45__System__ElevationViews/ | 45__System__ElevationViews/ | **renumber** | W1 | 11 files / 23 refs | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| TF-T27 | 47__System__NorthDirection/ | 46__System__NorthDirection/ | 46__System__NorthDirection/ | **renumber** | W1 | 6 files / 13 refs | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| TF-T28 | 50__System__ProjectedLinework/ | 50__System__ProjectedLinework/ | 50__System__ProjectedLinework/ | **keep** | - | - | DR-16, DR-31 | D-S02b-01, D-S02b-02 |
| TF-T29 | 51__System__LayoutEditor/ | 51__System__LayoutEditor/ | 51__System__LayoutEditor/ | **keep** | - | - | - | - |
| TF-T30 | 60__Feature__FullScreenMode/ | 60__Feature__FullScreenMode/ | 76__System__FullscreenMode/ | **keep** | - | - | DR-03, DR-44 | D-S10-07, D-S01-05 |
| TF-T31 | 61__Feature__ShareProjectLink/ | 61__Feature__ShareProjectLink/ | - | **keep** | - | - | DR-03, DR-43 | D-S01-05, D-S01-10 |
| TF-T32 | 62__Feature__EmailWorkers/ | 62__Feature__EmailWorkers/ | - | **keep** | W3 (only on request; K3 W6-03) | 4 files / 4 refs | DR-03 | D-S01-08, D-S01-05 |
| TF-T33 | 63__Feature__AppNotificationEmail/ | 63__Feature__AppNotificationEmail/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T34 | 64__Feature__BreadcrumbNav/ | 64__Feature__BreadcrumbNav/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T35 | 69__System__SketchUpToValeVision__Utilities/ | 69__System__SketchUpToValeVision__Utilities/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T36 | 70__System__DevTools/ | 70__System__DevTools/ | 70__System__DevTools/ | **keep** | - | - | - | - |
| TF-T37 | 71__System__ExportRenderLayers/ | 71__System__ExportRenderLayers/ | - | **keep** | - | - | DR-03 | D-S01-05 |
| TF-T38 | - | 27__System__ContextMenuSystem/ | 27__System__ContextMenuSystem/ | **add** | W2 (with LE/52) | none in VV; 5 TV files outside it name it (they port unchanged) | DR-10, DR-44 | D-S07b-01, D-S10-11 |
| TF-T39 | - | 47__System__DrawingPlanes/ | 47__System__DrawingPlanes/ | **add** | W2 (after W1) | none in VV; 6 TV files outside it name it (they port unchanged) | DR-01, DR-02, DR-32 | D-S02a-01, D-S02a-11, D-S11-01 |
| TF-T40 | - | 48__System__CrossSectionViews/ | 48__System__CrossSectionViews/ | **add** | W2 (with the Dev-menu rebuild, WP-S02a-08/09) | none in VV; 2 TV files outside it name it (they port unchanged) | DR-26 | D-S02a-06, D-S09-09, D-S11-07 |
| TF-T41 | - | 49__System__ElevationDepthFog/ | 49__System__ElevationDepthFog/ | **add** | W2 (after W1) | none in VV; 12 TV files outside it name it (they port unchanged) | DR-02 | D-S02b-04 |
| TF-T42 | - | 52__System__Layout__PublishedDocuments/ | 52__System__Layout__PublishedDocuments/ | **add** | W2 late (publishing wave, after its prerequisites) | none in VV; 10 TV files outside it name it (they port unchanged) | DR-22, DR-25, DR-29 | D-S01-16, D-S08-01, D-S10-02 |
| TF-T43 | - | 53__Data__Layout__PublishedSchema/ | 53__Data__Layout__PublishedSchema/ | **add** | W2 late (publishing wave) | none in VV; 14 TV files outside it name it (they port unchanged) | DR-22, DR-29 | D-S01-16, D-S12-03, D-S08-01 |
| TF-T44 | - | 54__Feature__ColourPalette/ | 54__Feature__ColourPalette/ | **add** | W2 | none in VV; 6 TV files outside it name it (they port unchanged) | DR-01, DR-20 | D-S06b-01, D-S10-10 |
| TF-T45 | - | 55__Feature__SpellCheck/ | 55__Feature__SpellCheck/ | **add** | W2 | none in VV; 6 TV files outside it name it (they port unchanged) | DR-01, DR-20 | D-S06a-11, D-S06b-01, D-S06b-03 |
| TF-T46 | - | - | 62__Feature__AppInstallability/ | **keep** | - | - | DR-07 | D-S03b-07 |
| TF-T47 | - | - | 75__System__UserInstructionsSystem/ | **keep** | - | - | DR-44 | D-S10-11 |
| TF-T48 | - | - | 76__System__FullscreenMode/ | **keep** | - | - | DR-44 | D-S10-07 |
| TF-T49 | - | 80__CloudflareIntegration/ | 80__CloudflareIntegration/ | **add** | W2 (first, before any transport-importing port) | none in VV; 29 TV files outside it name it (they port unchanged) | DR-27 | D-S01-03, D-S09-04, D-S09-V01, D-S12-01, D-S07a-08 |
<!-- END:K2:top -->

Notes: "Importers to update" counts non-history files and references that name the CURRENT folder (imports, CSS, config strings
and comments - all edited by the W1 script; history documents are never edited). For TV-only folders the count is the TV files
outside the folder that name it (imports or comments); after W1 they port with unchanged specifiers. A **keep** row with `-` in
both VV columns means "VV stays without this TV folder" (TF-T46..T48). Full lists with line numbers are in the JSON
(`importers_to_update.main` / `all_files` / `tv_main`).

## 3. Target folder map - Layout Editor subfolders (`LE/`)

<!-- BEGIN:K2:le -->
| Id | VV now | VV target | TV equivalent | Action | Phase | Importers to update | K1 DR | Raw decision ids |
|---|---|---|---|---|---|---|---|---|
| TF-L01 | LE/01__Core__Loader/ | LE/01__Core__Loader/ | - | **keep** | - | - | DR-24 | D-S09-01, D-S11-05 |
| TF-L02 | LE/03__Core__Config/ | LE/03__Core__Config/ | LE/03__Core__Config/ | **keep** | W1b | - | DR-18, DR-33 | D-S03a-03, D-S04b-07, D-S05b-04 |
| TF-L03 | LE/05__Core__ModeController/ | LE/05__Core__ModeController/ | LE/05__Core__ModeController/ | **keep** | - | - | DR-25 | D-S01-11, D-S10-02 |
| TF-L04 | LE/07__Core__SheetData/ | LE/07__Core__SheetData/ | LE/07__Core__SheetData/ | **keep** | - | - | DR-08, DR-42 | D-S03b-02, D-S03b-08 |
| TF-L05 | LE/10__Core__SheetSurface/ | LE/10__Core__SheetSurface/ | LE/10__Core__SheetSurface/ | **keep** | - | - | DR-12 | D-S03a-06 |
| TF-L06 | LE/15__Core__Markup/ | LE/15__Core__Markup/ | LE/15__Core__Markup/ | **keep** | - | - | - | - |
| TF-L07 | LE/20__System__Viewports/ | LE/20__System__Viewports/ | LE/20__System__Viewports/ | **keep** | - | - | DR-01, DR-09 | D-S01-14, D-S04a-10 |
| TF-L08 | - | LE/21__System__SitePlanData/ | LE/21__System__SitePlanData/ | **add** | W2 (dormant) | none in VV; 12 TV files outside it name it (they port unchanged) | DR-08 | D-S04a-01, D-S06a-01, D-S06a-02, D-S03b-08 |
| TF-L09 | LE/25__System__RenderStyles/ | LE/25__System__RenderStyles/ | LE/25__System__RenderStyles/ | **keep** | - | - | DR-08 | D-S04a-01 |
| TF-L10 | - | LE/26__System__DraftMode/ | LE/26__System__DraftMode/ | **add** | W2 | none in VV; 6 TV files outside it name it (they port unchanged) | DR-01 | D-S04b-01, D-S05a-V2 |
| TF-L11 | - | LE/27__System__DrawingGrid/ | LE/27__System__DrawingGrid/ | **add** | W2 | none in VV; 14 TV files outside it name it (they port unchanged) | DR-01 | D-S04b-01 |
| TF-L12 | - | LE/28__System__ObjectSnap/ | LE/28__System__ObjectSnap/ | **add** | W2 | none in VV; 41 TV files outside it name it (they port unchanged) | DR-01, DR-05, DR-40 | D-S04b-01, D-S04b-02, D-S04b-09 |
| TF-L13 | LE/30__System__SheetTools/ | LE/30__System__SheetTools/ | LE/30__System__SheetTools/ | **keep** | W2 | - | DR-01, DR-05 | D-S04b-09, D-S05a-V2 |
| TF-L14 | - | LE/31__System__DocumentKeys/ | LE/31__System__DocumentKeys/ | **add** | W2 | none in VV; 8 TV files outside it name it (they port unchanged) | DR-33 | D-S03a-03 |
| TF-L15 | - | LE/32__System__OrthoMode/ | LE/32__System__OrthoMode/ | **add** | W2 | none in VV; 10 TV files outside it name it (they port unchanged) | DR-01 | D-S04b-01 |
| TF-L16 | - | LE/33__System__DrawingAxes/ | LE/33__System__DrawingAxes/ | **add** | W2 | none in VV; 7 TV files outside it name it (they port unchanged) | DR-01 | D-S04b-01 |
| TF-L17 | LE/35__System__DrawingTools/ | LE/35__System__DrawingTools/ | LE/35__System__DrawingTools/ | **keep** | - | - | - | - |
| TF-L18 | - | LE/36__System__HatchPatternTools/ | LE/36__System__HatchPatternTools/ | **add** | W2 | none in VV; 16 TV files outside it name it (they port unchanged) | DR-19 | D-S05b-01, D-S05b-02 |
| TF-L19 | - | LE/37__System__VectorTools/ | LE/37__System__VectorTools/ | **add** | W2 | none in VV; 22 TV files outside it name it (they port unchanged) | DR-18 | D-S05b-04 |
| TF-L20 | LE/40__Ui__Panels/ | LE/40__Ui__Panels/ | LE/40__Ui__Panels/ | **keep** | - | - | DR-08 | D-S04a-01 |
| TF-L21 | LE/50__Feature__Specification/ | LE/50__Feature__Specification/ | LE/50__Feature__Specification/ | **keep** | - | - | - | - |
| TF-L22 | - | LE/51__Feature__DrawingRegister/ | LE/51__Feature__DrawingRegister/ | **add** | W2 | none in VV; 5 TV files outside it name it (they port unchanged) | DR-11 | D-S07a-01, D-S03b-01, D-S03a-07 |
| TF-L23 | - | LE/52__Feature__StatementWriter/ | LE/52__Feature__StatementWriter/ | **add** | W2 last (behind LayoutEditor__Statement__Enabled) | none in VV; 25 TV files outside it name it (they port unchanged) | DR-10, DR-29 | D-S07b-01, D-S07b-03, D-S03a-08 |
| TF-L24 | - | LE/53__Feature__ProjectQrCode/ | LE/53__Feature__ProjectQrCode/ | **add** | W2 (switched off) | none in VV; 19 TV files outside it name it (they port unchanged) | DR-12, DR-23, DR-43 | D-S07a-04, D-S03a-06, D-S01-10, D-S09-08 |
| TF-L25 | - | LE/54__Feature__SheetImages/ | LE/54__Feature__SheetImages/ | **add** | W2 | none in VV; 15 TV files outside it name it (they port unchanged) | DR-29 | D-S07a-07, D-S08-14, D-S12-03 |
| TF-L26 | LE/55__Feature__Scrapbook/ | LE/55__Feature__Scrapbook/ | LE/55__Feature__Scrapbook/ | **keep** | - | - | - | - |
| TF-L27 | LE/56__Feature__ScrapbookCustom/ | LE/56__Feature__ScrapbookCustom/ | LE/56__Feature__ScrapbookCustom/ | **keep** | - | - | - | - |
| TF-L28 | LE/57__Feature__ScrapbookParametric/ | LE/57__Feature__ScrapbookParametric/ | LE/57__Feature__ScrapbookParametric/ | **keep** | - | - | DR-08, DR-12 | D-S04a-01, D-S03a-06 |
| TF-L29 | - | LE/58__Feature__ScrapbookSpecification/ | LE/58__Feature__ScrapbookSpecification/ | **add** | W2 | none in VV; 4 TV files outside it name it (they port unchanged) | DR-20 | D-S06a-11 |
| TF-L30 | - | LE/59__Feature__FloorAreas/ | LE/59__Feature__FloorAreas/ | **add** | W2 (last) | none in VV; 20 TV files outside it name it (they port unchanged) | DR-01 | D-S06b-01 |
| TF-L31 | LE/60__Feature__PdfExport/ | LE/60__Feature__PdfExport/ | LE/60__Feature__PdfExport/ | **keep** | - | - | DR-21 | D-S03a-05 |
| TF-L32 | - | LE/65__Feature__DocumentPublishing/ | LE/65__Feature__DocumentPublishing/ | **add** | W2 late (publishing wave) | none in VV; 7 TV files outside it name it (they port unchanged) | DR-22, DR-25, DR-29 | D-S01-16, D-S08-01, D-S10-02 |
| TF-L33 | - | LE/66__Feature__DocumentSharing/ | LE/66__Feature__DocumentSharing/ | **add** | W2 late (after 65) | none in VV; 16 TV files outside it name it (they port unchanged) | DR-22, DR-23, DR-43 | D-S01-10, D-S08-05, D-S09-08, D-S01-16 |
| TF-L34 | LE/70__DevTools__DevMenu/ | LE/70__DevTools__DevMenu/ | LE/70__DevTools__DevMenu/ | **keep** | - | - | - | - |
| TF-L35 | LE/80__Feature__WebViewer/ | LE/80__Feature__WebViewer/ | LE/80__Feature__WebViewer/ | **keep** | - | - | DR-22 | D-S01-16 |
<!-- END:K2:le -->

No LE subfolder is renumbered or renamed: the two apps aligned them on 15-Sep-2026 (VV v2.47.0 / TV v2.55.0). VV's only extra is
`LE/01__Core__Loader` (permanent, reserved; TV DEVLOG:11718 reserves LE/01 for a loader back-port).

## 4. Target folder map - app-root content folders

<!-- BEGIN:K2:root -->
| Id | VV now | VV target | TV equivalent | Action | Phase | Importers to update | K1 DR | Raw decision ids |
|---|---|---|---|---|---|---|---|---|
| TF-R01 | - | 50__ValeVision__UserConfig/ | 50__TrueVision__UserConfig/ | **add** | W2 (with 55) | - | DR-20 | D-S06b-03, D-S06a-11 |
| TF-R02 | 51__LayoutEditor__UserScrapbookContent/ | 51__LayoutEditor__UserScrapbookContent/ | 51__LayoutEditor__UserScrapbookContent/ | **keep** | - | - | - | - |
| TF-R03 | - | 52__LayoutEditor__HatchPatternLibrary/ | 52__LayoutEditor__HatchPatternLibrary/ | **add** | W2 (with LE/36) | - | DR-08, DR-19 | D-S05b-01, D-S04a-01 |
| TF-R04 | - | 01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/ | 01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/ | **add** | W2 | - | DR-43 | D-S03b-10 |
| TF-R05 | - | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/ | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/ | **add** | W2 | - | DR-03 | D-S01-02 |
| TF-R06 | - | 04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/ | 04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/ | **add** | W2 last (with LE/52) | - | DR-10, DR-29 | D-S07b-01, D-S03a-08 |
| TF-R07 | - | 04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/ | - | **add_later** | W2 (with LE/51) | - | DR-11, DR-36 | D-S03a-07, D-S11-06 |
| TF-R08 | 04__Lib__ThirdParty__Three/ | - | - | **retire** | W3 | 2 files / 2 refs | - | - |
| TF-R09 | - | - | 80__CloudflareIntegration/ | **keep** | - | - | DR-27 | D-S12-01 |
| TF-R10 | 60__DistributionEmails/ | 60__DistributionEmails/ | 60__DistributionEmails/ | **keep** | - | - | - | - |
| TF-R11 | 79__Testing__GenerateObjects/ | 79__Testing__GenerateObjects/ | 79__Testing__GenerateObjects/ | **keep** | - | - | - | - |
| TF-R12 | 80__Testing__PrototypeEnvironment/ | 80__Testing__PrototypeEnvironment/ | 80__Testing__PrototypeEnvironment/ | **keep** | - | - | - | - |
| TF-R13 | 00__Archive/ | 00__Archive/ | 00__ArchivedVersions/ | **keep** | - | - | - | - |
| TF-R14 | 95__SketchUpSisterTools__ToolsAndUtils/ | 95__SketchUpSisterTools__ToolsAndUtils/ | 90__rubyScript__SketchUpSisterTools__ToolsAndUtils/ | **keep** | - | - | - | - |
<!-- END:K2:root -->

## 5. Target folder map - `03__Style__AppStylesheets`

<!-- BEGIN:K2:style -->
| Id | VV now | VV target | TV equivalent | Action | Phase | Importers to update | K1 DR | Raw decision ids |
|---|---|---|---|---|---|---|---|---|
| TF-S01 | styles/Na__CoreUi__Styles__BaseLayout__.css | styles/Na__CoreUi__Styles__BaseLayout__.css | styles/Na__CoreUi__Styles__BaseLayout__.css | **keep** | - | - | - | - |
| TF-S02 | styles/Na__CoreUi__Styles__Fonts__.css | styles/Na__CoreUi__Styles__Fonts__.css | styles/Na__CoreUi__Styles__Fonts__.css | **keep** | W2 | - | DR-21 | D-S10-05 |
| TF-S03 | styles/Na__CoreUi__Styles__Index__.css | styles/Na__CoreUi__Styles__Index__.css | styles/Na__CoreUi__Styles__Index__.css | **keep** | W1 + W2 | - | DR-24, DR-44 | D-S09-01, D-S10-11 |
| TF-S04 | styles/Na__CoreUi__Styles__RenderCanvas__.css | styles/Na__CoreUi__Styles__RenderCanvas__.css | styles/Na__CoreUi__Styles__RenderCanvas__.css | **keep** | - | - | DR-44 | D-S10-04 |
| TF-S05 | styles/Na__ImageExport__Styles__ViewportOverlays__.css | styles/Na__ImageExport__Styles__ViewportOverlays__.css | styles/Na__ImageExport__Styles__ViewportOverlays__.css | **keep** | - | - | DR-44 | D-S10-04 |
| TF-S06 | styles/Na__PresentationMode__Styles__SceneCarousel__.css | styles/Na__PresentationMode__Styles__SceneCarousel__.css | styles/Na__PresentationMode__Styles__SceneCarousel__.css | **keep** | W2 | - | - | - |
| TF-S07 | styles/Na__UiFeature__Styles__AppHeader__.css | styles/Na__UiFeature__Styles__AppHeader__.css | styles/Na__UiFeature__Styles__AppHeader__.css | **keep** | - | - | DR-44 | D-S10-08 |
| TF-S08 | styles/Na__UiFeature__Styles__ControlsHelpPanel__.css | styles/Na__UiFeature__Styles__ControlsHelpPanel__.css | styles/Na__UiFeature__Styles__ControlsHelpPanel__.css | **keep** | - | - | - | - |
| TF-S09 | - | styles/Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css | styles/Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css | **add_later** | W3 | - | DR-44 | D-S10-11 |
| TF-S10 | styles/Na__UiFeature__Styles__DevToolsMenu__.css | styles/Na__UiFeature__Styles__DevToolsMenu__.css | styles/Na__UiFeature__Styles__DevToolsMenu__.css | **keep** | - | - | - | - |
| TF-S11 | styles/Na__UiFeature__Styles__DropdownAndToast__.css | styles/Na__UiFeature__Styles__DropdownAndToast__.css | styles/Na__UiFeature__Styles__DropdownAndToast__.css | **keep** | W2/W3 | - | DR-03, DR-44 | D-S10-06, D-S10-11, D-S01-02 |
| TF-S12 | styles/Na__UiFeature__Styles__LoadingOverlays__.css | styles/Na__UiFeature__Styles__LoadingOverlays__.css | styles/Na__UiFeature__Styles__LoadingOverlays__.css | **keep** | W2 | - | DR-39 | D-S10-03 |
| TF-S13 | styles/Na__UiFeature__Styles__NavigationToolbar__.css | styles/Na__UiFeature__Styles__NavigationToolbar__.css | styles/Na__UiFeature__Styles__NavigationToolbar__.css | **keep** | - | - | - | - |
| TF-S14 | - | - | styles/Na__UiFeature__Styles__PwaInstallability__.css | **keep** | - | - | - | - |
| TF-S15 | - | styles/Na__UiFeature__Styles__SceneInspector__.css | styles/Na__UiFeature__Styles__SceneInspector__.css | **add_later** | W3 (optional) | - | DR-44 | D-S10-11 |
<!-- END:K2:style -->

Every one of VV's 12 sheets differs from TV's (none identical, `git diff --no-index -w`); none is renamed. Content alignment is
owned by the UI slice packages named in each row's reason.

---

## 6. File rename map

<!-- BEGIN:K2:files -->
| Id | Kind | Level | VV now | VV target | TV twin | Phase | Importers | K1 DR | Raw decision ids |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | **move** | folder | 40__System__2dElevationsView/ | 91__System__2dElevationsView/ | - | W1 | 4 files | DR-03 | D-S01-13, D-S01-02, D-S02a-04 |
| FR-02 | **move** | folder | 42__System__DrawingViewCore/ | 40__System__DrawingViewCore/ | 40__System__DrawingViewCore/ | W1 | 51 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-03 | **move** | folder | 43__System__FloorPlanViews/ | 42__System__FloorPlanViews/ | 42__System__FloorPlanViews/ | W1 | 11 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-04 | **move** | folder | 44__System__PlanAnnotations/ | 43__System__PlanAnnotations/ | 43__System__PlanAnnotations/ | W1 | 7 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-05 | **move** | folder | 45__System__PlanDimensions/ | 44__System__PlanDimensions/ | 44__System__PlanDimensions/ | W1 | 9 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-06 | **move** | folder | 46__System__ElevationViews/ | 45__System__ElevationViews/ | 45__System__ElevationViews/ | W1 | 11 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-07 | **move** | folder | 47__System__NorthDirection/ | 46__System__NorthDirection/ | 46__System__NorthDirection/ | W1 | 6 files | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-08 | **move** | file | 40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js | 05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js | - | W1 | 3 files | DR-03 | D-S01-13, D-S02a-04 |
| FR-09 | **rename** | file | 42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js | 40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js | 40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js | W1 | 7 files | DR-04 | D-S01-06, D-S02a-10 |
| FR-10 | **rename** | file | 03__AppUtils/Na__AppUtils__SnapshotHistory__.js | 03__AppUtils/Na__AppUtils__SnapshotHistory.js | 03__AppUtils/Na__AppUtils__SnapshotHistory.js | W1 | 3 files | DR-04 | D-S02b-12R, D-S11-08 |
| FR-11 | **move** | file | 05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js | 05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js | 05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js | W1 | 7 files | DR-04, DR-07 | D-S01-07, D-S09-V02, D-S10-13 |
| FR-12 | **rename** | file | LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json | LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json | LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json | W1b | 6 files | DR-18, DR-33 | D-S03a-03, D-S05a-04, D-S04b-07, D-S05b-04 |
| FR-13 | **rename** | file | 02__AppData/Na__ValeVision__HotkeysDictionary__.json | 02__AppData/Na__Hotkeys__3dModelTab__.json | 02__AppData/Na__Hotkeys__3dModelTab__.json | W1b | 3 files | DR-33 | D-S03a-03, D-S05a-04 |
| FR-14 | **shim** | file | LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | LE/28__System__ObjectSnap/ (Na__LayoutEditor__ObjectSnap__Search__.js, __State__.js, __Marker__.js, __.js) | W2 | 12 files | DR-01, DR-05, DR-40 | D-S04b-09, D-S04b-02, D-S04b-01 |
| FR-15 | **retire** | file | LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | - | - | W2 (after the SheetTools/DrawingTools hub ports) | 12 files | DR-05 | D-S04b-09 |
| FR-16 | **shim** | file | - | 80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js | 80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js | W2 (first) | 29 files | DR-27 | D-S01-03, D-S09-04, D-S09-V01, D-S12-01, D-S07a-08 |
| FR-17 | **shim** | file | - | 03__AppUtils/Na__AppUtils__LocalProjectMirror__.js | 03__AppUtils/Na__AppUtils__LocalProjectMirror__.js | W2 (first) | 8 files | DR-27 | D-S01-03, D-S09-04, D-S12-01 |
| FR-18 | **retire** | file | 03__AppUtils/Na__AppUtils__R2DrawingNotes__.js | - | (role absorbed by 80/Na__CloudflareIntegration__ApiClient__.js ReadProjectFile/WriteProjectFile and 03/Na__AppUtils__LocalProjectMirror__.js WriteSiblingFile) | W2 late (WP-S06b-01 first extends it to 1.1.0; retire when the spec transport is re-based onto the facade) | 2 files | DR-27 | D-S12-01, D-S09-V01, D-S06b-V01 |
| FR-19 | **move** | file | 35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js | W2 | 4 files | DR-03 | D-S01-02 |
| FR-20 | **move** | file | 35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png | 01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png | 01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png (CONTENT DIFFERS - NA scan, never copied) | W2 | 3 files | DR-43 | D-S03b-10 |
| FR-21 | **retire** | folder | 35__System__PageLayoutSystem/ | - | (TV retired its copy, 90__System__PageLayoutSystem, in v2.155.0 - TV DEVLOG:1287) | W3 | 9 files | DR-03 | D-S01-02, D-S09-10 |
| FR-22 | **move** | folder | 62__Feature__EmailWorkers/ | 92__Feature__EmailWorkers/ | - | W3 (only on request; K3 W6-03) | 4 files | DR-03 | D-S01-08, D-S01-05 |
| FR-23 | **retire** | folder | 04__Lib__ThirdParty__Three/ | - | - | W3 | 2 files | - | - |
| FR-24 | **move** | region | styles/Na__UiFeature__Styles__DropdownAndToast__.css (lines 969-1239, REGION "Scene Inspector - Dev Tools Panel") | styles/Na__UiFeature__Styles__SceneInspector__.css | styles/Na__UiFeature__Styles__SceneInspector__.css | W3 (optional) | 1 files | DR-44 | D-S10-11 |
| FR-25 | **retire** | folder | 91__System__2dElevationsView/ (after FR-01) | - | - | W3 | 4 files | DR-03 | D-S01-02, D-S09-10 |
<!-- END:K2:files -->

Row notes that change how an agent executes the row:

- **FR-01..FR-11 are executed only by `k2_renumber_apply.py --mode git`** in one commit (W1). Agents must not hand-edit these
  paths.
- **FR-08 / FR-11** change folder depth, so their OWN relative imports are recomputed (script pass T4): 2dProfileLines
  `'../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js'` -> `'./Na__RenderEffect__SectionClipping__State.js'`;
  DistanceCulling `'../../04__MathUtils/Na__Math__Units.js'` -> `'../04__MathUtils/Na__Math__Units.js'` (TV :57 has the same).
- **FR-09** keeps VV's composer body and private `Na__DrawPreset` namespace; the PORT NOTE is rewritten by hand (rulebook
  section 3 has the filled text). RenderFrame gains an optional camera argument in the same package (S02a-F14) - the one
  non-mechanical edit allowed in W1, because TV callers pass `RenderFrame(cam)`.
- **FR-12 / FR-13** rename files only. FR-12's TV CONTENT lands with `ConfigState__KeyMap__` 1.11.0 (WP-S03a-02), never on VV's
  1.0.0 matcher (T would resolve to Trim). FR-13 keeps VV's root key and `ValeVision__*` actions.
- **FR-14 -> FR-15**: shim first (with the ObjectSnap port), delete after the hub and drawing-tool ports have repointed every
  importer; grep gate `Na__LayoutEditor__Snapping__|Na__LeOsnap__TONE_`.
- **FR-16 / FR-17** are new files (no `current_vv`): VV bodies at TV's paths. They must land before the first TV module that
  imports them (29 TV files mention the ApiClient, 27 import it).
- **FR-18** is conditional: under D-S09-V01 (c) the facade may keep calling R2DrawingNotes as a per-document client, in which
  case it stays. WP-S06b-01 first extends it to 1.1.0.
- **FR-19 / FR-20 copy** (the 35 originals go with FR-21); FR-20 copies VALE's scan (md5 59777a65), never TV's NA scan.

## 7. Twins kept apart on purpose (no shared path)

| VV | TV | Why it stays apart | Decision |
|---|---|---|---|
| `41__System__CrossSectionView/*` (7 files) | `41__System__SectionCutEngine/*` (7 files) | Different engines, same role (DIV-2); TD06 keeps VV's `CrossSection__SceneData` schema. | D-S01-09, D-S12-V02 |
| `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` body (after FR-09) | same path, TV body | Same path and exports; bodies differ (DIV-1, composer vs overlay). | D-S01-06 |
| `05__RenderPipeline/01__Engine__PureEngine/`, `02__Engine__MaxEngine/` | `05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` | VV's dual render engine (DIV-1). | - |
| `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js`, `Na__RenderEffect__LineworkSettings__State.js` | `40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js` | VV's ortho profile pass and linework state vs TV's overlay profile lines (DIV-1); never port TV's ProfileLines. | S02a-F15 |
| `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (NAMESPACE `Na__DrawSection`) | same path (NAMESPACE `Na__DrawView__SectionAdapter`) | Same path and 13 exports; VV body drives VV's 41 tool. | S01-F22 |
| `40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` | - | VV-only. | S01-F40 |
| `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` | `10__NavigationAndCameras/Na__Hotkeys__Manager.js` | Same role, independent implementations; VV's gains the KeyScope guard (WP-S03a-V03). | D-S05a-04 |
| `60__Feature__FullScreenMode/*` | `76__System__FullscreenMode/*` | Same feature, different implementation and number. | D-S10-07 |
| `03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` (+ `Na__AppUtils__R2DrawingNotes__.js` until FR-18) | `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` | VV-only per-route transport clients (DIV-4); the facade FR-16 presents TV's names over them. | D-S12-01 |
| `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` | same path | Same path and signature, different transport body (TV's own precedent for DIV-4: "identical signature, different transport"). | D-S12-01 |
| `LE/01__Core__Loader/*`, `LE/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` | - | VV lazy loader and its tab-code leaf. | D-S09-01, D-S03b-02 |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__ScenePersistence__.js`, `SceneReorder__`, `SceneRowBuilders__` | merged in TV's SceneEditor | VV's split accepted by TV v2.68.2. | S01-F65 |
| WCP `Server__ValeVision<Feature>__Api__.py`, `WCP/CloudflareWorker` | NAAPPS `ProjectVision__TrueVision<Feature>__Api__.py`, TV `80__CloudflareIntegration/CloudflareWorker` | Each app's own server and worker. | DIV-4 |

---

## 8. Collision table and the folder-number registry

<!-- BEGIN:K2:collisions -->
| No. | TV today | VV today | VV target | When | Status after the change |
|---|---|---|---|---|---|
| 01 | 01__AppCore | 01__AppCore | 01__AppCore | - | shared (same system, same name) |
| 02 | 02__AppData | 02__AppData | 02__AppData | - | shared (same system, same name) |
| 03 | 03__AppUtils | 03__AppUtils | 03__AppUtils | W1 (SnapshotHistory) + W2 | shared (same system, same name) |
| 04 | 04__MathUtils | 04__MathUtils | 04__MathUtils | - | shared (same system, same name) |
| 05 | 05__RenderPipeline | 05__RenderPipeline | 05__RenderPipeline | W1 (receives two files) | shared (same system, same name) |
| 06 | 06__Scene__LightingEffects | 06__Scene__LightingEffects | 06__Scene__LightingEffects | - | shared (same system, same name) |
| 07 | 07__Scene__EnvironmentEffects | 07__Scene__EnvironmentEffects | 07__Scene__EnvironmentEffects | - | shared (same system, same name) |
| 10 | 10__NavigationAndCameras | 10__NavigationAndCameras | 10__NavigationAndCameras | - | shared (same system, same name) |
| 11 | 11__CameraUtils | 11__CameraUtils | 11__CameraUtils | - | shared (same system, same name) |
| 15 | 15__ModelLoader | 15__ModelLoader | 15__ModelLoader | - | shared (same system, same name) |
| 20 | 20__System__MaterialsSystem | 20__System__MaterialsSystem | 20__System__MaterialsSystem | - | shared (same system, same name) |
| 21 | 21__System__PresentationMode | 21__System__PresentationMode | 21__System__PresentationMode | - | shared (same system, same name) |
| 25 | 25__System__3dObject__InteractionSystem | 25__System__3dObject__InteractionSystem | 25__System__3dObject__InteractionSystem | - | shared (same system, same name) |
| 26 | 26__System__ToggleModelElements | 26__System__ToggleModelElements | 26__System__ToggleModelElements | - | shared (same system, same name) |
| 27 | 27__System__ContextMenuSystem | - | 27__System__ContextMenuSystem | W2 (with LE/52) | VV gains TV's folder at TV's number |
| 28 | - | 28__System__GridLineSystem | 28__System__GridLineSystem | - | VV-only, reserved for VV in the registry |
| 29 | - | 29__System__FogPlaneSystem | 29__System__FogPlaneSystem | - | VV-only, reserved for VV in the registry |
| 30 | 30__System__ImageExport | 30__System__ImageExport | 30__System__ImageExport | - | shared (same system, same name) |
| 31 | - | 31__System__VideoStudio | 31__System__VideoStudio | - | VV-only, reserved for VV in the registry |
| 35 | - | 35__System__PageLayoutSystem | - | W2 (extract) + W3 (retire) | VV legacy, retired; number burnt (never reused) |
| 40 | 40__System__DrawingViewCore | 40__System__2dElevationsView | 40__System__DrawingViewCore | W1 | shared after W1: VV 40__System__2dElevationsView leaves for 91__System__2dElevationsView; VV 42__System__DrawingViewCore renumbers into it |
| 41 | 41__System__SectionCutEngine | 41__System__CrossSectionView | 41__System__CrossSectionView | - | same number and role, different engine (DIV-2, kept on purpose) |
| 42 | 42__System__FloorPlanViews | 42__System__DrawingViewCore | 42__System__FloorPlanViews | W1 | shared after W1: VV 42__System__DrawingViewCore leaves for 40__System__DrawingViewCore; VV 43__System__FloorPlanViews renumbers into it |
| 43 | 43__System__PlanAnnotations | 43__System__FloorPlanViews | 43__System__PlanAnnotations | W1 | shared after W1: VV 43__System__FloorPlanViews leaves for 42__System__FloorPlanViews; VV 44__System__PlanAnnotations renumbers into it |
| 44 | 44__System__PlanDimensions | 44__System__PlanAnnotations | 44__System__PlanDimensions | W1 | shared after W1: VV 44__System__PlanAnnotations leaves for 43__System__PlanAnnotations; VV 45__System__PlanDimensions renumbers into it |
| 45 | 45__System__ElevationViews | 45__System__PlanDimensions | 45__System__ElevationViews | W1 | shared after W1: VV 45__System__PlanDimensions leaves for 44__System__PlanDimensions; VV 46__System__ElevationViews renumbers into it |
| 46 | 46__System__NorthDirection | 46__System__ElevationViews | 46__System__NorthDirection | W1 | shared after W1: VV 46__System__ElevationViews leaves for 45__System__ElevationViews; VV 47__System__NorthDirection renumbers into it |
| 47 | 47__System__DrawingPlanes | 47__System__NorthDirection | 47__System__DrawingPlanes | W2 (after W1) | shared after W1: VV 47__System__NorthDirection leaves for 46__System__NorthDirection; TV's folder lands here with its port |
| 48 | 48__System__CrossSectionViews | - | 48__System__CrossSectionViews | W2 (with the Dev-menu rebuild, WP-S02a-08/09) | VV gains TV's folder at TV's number |
| 49 | 49__System__ElevationDepthFog | - | 49__System__ElevationDepthFog | W2 (after W1) | VV gains TV's folder at TV's number |
| 50 | 50__System__ProjectedLinework | 50__System__ProjectedLinework | 50__System__ProjectedLinework | - | shared (same system, same name) |
| 51 | 51__System__LayoutEditor | 51__System__LayoutEditor | 51__System__LayoutEditor | - | shared (same system, same name) |
| 52 | 52__System__Layout__PublishedDocuments | - | 52__System__Layout__PublishedDocuments | W2 late (publishing wave, after its prerequisites) | VV gains TV's folder at TV's number |
| 53 | 53__Data__Layout__PublishedSchema | - | 53__Data__Layout__PublishedSchema | W2 late (publishing wave) | VV gains TV's folder at TV's number |
| 54 | 54__Feature__ColourPalette | - | 54__Feature__ColourPalette | W2 | VV gains TV's folder at TV's number |
| 55 | 55__Feature__SpellCheck | - | 55__Feature__SpellCheck | W2 | VV gains TV's folder at TV's number |
| 60 | - | 60__Feature__FullScreenMode | 60__Feature__FullScreenMode | - | VV-only, reserved for VV in the registry |
| 61 | - | 61__Feature__ShareProjectLink | 61__Feature__ShareProjectLink | - | VV-only, reserved for VV in the registry |
| 62 | 62__Feature__AppInstallability | 62__Feature__EmailWorkers | 62__Feature__EmailWorkers | W3 (only on request; K3 W6-03) | nominal collision, kept (DR-03 default): VV EmailWorkers stays at 62 and moves to 92 only on request (FR-22, K3 W6-03); TV's AppInstallability is never ported (VV uses the WCP PWA) |
| 63 | - | 63__Feature__AppNotificationEmail | 63__Feature__AppNotificationEmail | - | VV-only, reserved for VV in the registry |
| 64 | - | 64__Feature__BreadcrumbNav | 64__Feature__BreadcrumbNav | - | VV-only, reserved for VV in the registry |
| 69 | - | 69__System__SketchUpToValeVision__Utilities | 69__System__SketchUpToValeVision__Utilities | - | VV-only, reserved for VV in the registry |
| 70 | 70__System__DevTools | 70__System__DevTools | 70__System__DevTools | - | shared (same system, same name) |
| 71 | - | 71__System__ExportRenderLayers | 71__System__ExportRenderLayers | - | VV-only, reserved for VV in the registry |
| 75 | 75__System__UserInstructionsSystem | - | - | - | TV-only, not ported |
| 76 | 76__System__FullscreenMode | - | - | - | TV-only, not ported |
| 80 | 80__CloudflareIntegration | - | 80__CloudflareIntegration | W2 (first, before any transport-importing port) | VV gains TV's folder at TV's number |
| 90 | - | - | - | - | TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse |
| 91 | - | - | 91__System__2dElevationsView | W1 | VV-only band: 40__System__2dElevationsView moves here |
| 92 | - | - | - | W3 (only on request; K3 W6-03) | VV-only band: reserved for 62__Feature__EmailWorkers if Adam asks for the move (FR-22, K3 W6-03) |
| 93 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 94 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 95 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 96 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 97 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 98 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
| 99 | - | - | - | - | free - VV-only band (93-99 for future VV-only folders) |
<!-- END:K2:collisions -->

**Registry proposal (both repos keep the same table, e.g. `ValeVision__NOTES__FolderNumberRegistry__.md` and a TV twin; WP-S01-05):**

| Band | Owner | Numbers |
|---|---|---|
| Shared (same system, same name and number) | TV names it, VV mirrors it | 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 40, 42-46, 50, 51, 70; plus 27, 47, 48, 49, 52, 53, 54, 55, 80 as their ports land |
| Same number, different engine | both, documented | 41 (DIV-2) |
| TV-only, never in VV | TV | 62 (AppInstallability; VV uses WCP's), 75, 76 |
| TV growth (VV never takes these) | TV | 22-24, 32-34, 36-39, 56-59, 65-68, 72-74, 77-79, 81-89 |
| VV-reserved (TV never takes these) | VV | 28, 29, 31, 35 (until retired, then burnt), 60, 61, 63, 64, 69, 71; 62 (FR-22 moves it to 92 only on request) |
| VV legacy / VV-only band | VV | 91 (2dElevationsView), 92 (reserved for EmailWorkers if FR-22 runs), 93-99 free for future VV-only folders |
| Burnt | nobody | 90 (TV's retired PageLayoutSystem, TV DEVLOG:1287); 35 after VV retires PageLayoutSystem |
| LE subfolders | TV names them | all; LE/01 reserved for VV's loader |
| Vendor folders `04__Lib__ThirdParty__VersionLocked/NN__Vendor__*` | TV numbers 01-06; VV takes 07 for PDF.js (offered to TV) | 07 PdfJs v3.11.174 |
| App root | each app | shared names 50 (token swapped), 51, 52, 60, 79, 80__Testing; VV 95 SketchUp tools vs TV 90 (out of drawing scope) |

Proof that the two new VV numbers are free: TV's current top level (37 folders) has no 91 or 92; the full list of folder names in
TV's devlog (`s01work/tv_devlog_foldernames.txt`, 79 names) contains `90__System__PageLayoutSystem` but no 91 or 92. The builder
re-checks this on every run.

---

## 9. The renumbering procedure (W1) - one atomic scripted change

**Owner:** one agent, alone. No other package may be in flight on VV while W1 runs (it rewrites 94 files, including the hot files
`index.html`, `Na__AppFlow__LoadingSequence.js`, the CSS index, the LE ModeController, SnapshotRenderer and MarkupBridge).

**Decisions that must be answered first** (K1 DR-02, DR-03, DR-04; DR-07 only for the deploy): D-S01-01 / D-S01-15 (renumber, and
that "its own file structure" means storage, not source tree), D-S01-13 (91 and 05), D-S01-06 (RenderPreset), D-S01-07 /
D-S09-V02 (DistanceCulling), D-S02b-12R (SnapshotHistory), D-S10-13 (service-worker token). The script has switches for every "no" answer: `--legacy 39`, `--no-renderpreset`,
`--no-distanceculling`, `--no-snapshothistory` (each variant dry-runs clean).

**Step 0 - preflight (read-only).**

1. Re-read the top of `ValeVision__DEVLOG__.md` and run `git -C D:/10_CoreLib__ValeCodebase status --short -- WebApps/ValeVision3D WebApps/Whitecardopedia`;
   both must be clean (parallel sessions bump devlogs).
2. Baseline: `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs`, `node .../Na__Verify__Exports__.mjs`,
   `python <parity>/report/tools/k2_path_gate.py --names ZZZ_NONE` (G1 switched off - the old names are expected before W1;
   baseline on 01-Oct-2026: ModuleGraph 517 modules / 0 failures, Exports 415 files PASS, path gate 0 fail).
3. `python <parity>/report/tools/k2_renumber_apply.py` (dry run): must print `RETIRED NAMES LEFT ... : 0` and the plan below.

**Step 1 - apply:** `python <parity>/report/tools/k2_renumber_apply.py --mode git --report <parity>/k2work/renumber_git_report.json`

What the script does, in order (byte-exact: CRLF/LF/BOM preserved; history documents never touched):

| Pass | Effect | Count (live tree, 01-Oct-2026) |
|---|---|---|
| T8 | delete the PORT NOTE bullets W1 makes false ("Import paths follow the ValeVision folder numbers ..." in 28 files, "Snapshot history imported from Na__AppUtils__SnapshotHistory__.js ..." in the two History files) and turn SnapshotHistory's own "File name carries the ValeVision double-underscore suffix." into "none." | 31 lines in 31 files |
| T1/T2 | 2dProfileLines specifiers -> `05__RenderPipeline/` (ComposerPreset :91,:93; SystemLogic :47 `'./'` -> `'../05__RenderPipeline/'`) | 3 |
| T3 | DistanceCulling specifiers -> `05__RenderPipeline/` (LoadingSequence :216, 31 FrameRenderer :112, 31 Timeline__Thumbnails :117, 42 Transitions :63). The shared WCP precache line (logic `:318`) is NOT touched by default (K1 DR-07: no package edits the shared worker); `--edit-wcp-sw` adds it if Adam wants it in W1. A stale entry is harmless: the install precache is best-effort per URL (logic :592-600). | 4 (+1 opt-in) |
| T4 | relative imports INSIDE the two files that change depth, recomputed from their new folder | 2 |
| T5 | `Na__AppUtils__SnapshotHistory__.js` -> `Na__AppUtils__SnapshotHistory.js` | 5 |
| T6 | `Na__DrawView__ComposerPreset__` -> `Na__DrawView__RenderPreset__` (+ banner and MODULE text) | 54 |
| T7 | the seven full folder names, one regex pass (each old name is unique, so no chained replacement) | 233 |
| moves | `git mv` F1-F4 (files) then D1-D7 (folders), each target free at its turn | 4 + 7 |

**Step 2 - gates (all must pass before commit):**

1. `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` - exit 0 (proved: 517 modules, 0 failures).
2. `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` - exit 0 (proved: PASS).
3. `python <parity>/report/tools/k2_path_gate.py` - default retired-name list; exit 0 (proved: PASS). It covers what the two
   harnesses cannot see: CSS `@import` (6 drawing lines in the CSS index), `new URL(..., import.meta.url)`, config path strings
   (legacy config `:67`), test path segments (`Na__Test__NorthCompass__.test.mjs:53`).
4. Every `80__Testing__PrototypeEnvironment/*.test.mjs` - all pass (proved: 6/6).
5. `git diff -M --stat` shows every moved file as a rename (R100 or near), and the script's pairing report shows 70 drawing files
   paired with TV by identical path (16 + 10 + 8 + 15 + 13 + 8); unpaired by design: VV `ThumbnailBake__`; TV `DevRowShell__`,
   `DraftGuard__`, `DraftMaths__`, `DrawingUsage__`, `ProfileLines__`, `StoreyRow__`, `StoreyLevel__`, `AutoName__`, `AutoNameText__`.
6. Adam's in-app smoke test (localhost, Flask): app loads; Tools > Elevation View (legacy, now 91) still works; a floor plan, an
   elevation and a section open from the carousel; the North compass and the Dev-menu drawing panels open; a sheet renders, a
   viewport bakes, Save Sheets works, PDF downloads; the Specification tab opens.

**Step 3 - records (same commit):** VV devlog entry (version picked from a fresh read of the devlog top); ledger "Folder
renumbering (DD-Mon-2026)" section with the old -> new map and the four file moves (historical rows unchanged); dated revision
note on VV plan D05 (`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:53`); hand-written PORT NOTE for FR-09. TV plan 4.1
(`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:304-322`) gets its dated note only if Adam allows TV edits (D-S01-12,
D-S11-06).

**Step 4 - deploy hazard (the shared Whitecardopedia service worker).** The SW precache is best-effort and contains only one W1 path
(DistanceCulling, left stale by default and fixed by the DR-07 service-worker package). HTML is network-first, but JS/CSS are stale-while-revalidate on the live site
(`Whitecardopedia__Pwa__ServiceWorker__Logic__.js:687-696`): a returning user's first load after deploy can run a cached
`LoadingSequence.js` that still imports the old folder paths next to a fresh `index.html` importing the new ones - two copies of
one module. A shell-token bump (`PWA_SW_VERSION_TOKEN`, logic :229) prevents it but also re-downloads every Vale model unless the
models cache gets its own token first: **D-S10-13 / K1 DR-07 (Adam's call)**. W1 neither edits nor bumps the shared worker; DR-07's
single service-worker package (cache split, unsaved-work hold, precache fixes) lands before the first deploy of swarm output. Which file VV registers is resolved in code (R0 P10, R6 F.8 C5): the WCP registrar registers the WebApps stub
`Na__Pwa__ServiceWorker__.js`, which imports the WCP logic file; `WebApps/live_sw.js` is an unreferenced saved copy (token
`2026-09-10-6` at `:68`; `:157` is its stale DistanceCulling precache line). Left: confirm at the W0 deploy that the live site
serves the same stub (S01 W7).

**Rollback:** W1 is one commit; `git revert <sha>` restores every path (the script writes only inside VV, plus the one WCP file
when `--edit-wcp-sw` is given).

**Why scripted rather than by hand:** 94 files, 332 replacements, two depth changes and a PORT NOTE clean-up; a missed specifier
blanks the page, and three of the path kinds (CSS `@import`, config strings, test path segments) are invisible to the module
graph harness. The script makes W1 repeatable on a fresh tree and testable on a copy, which is how it was proved here
(`k2work/renumber_sim_report.json`).

---

## 10. Ordering relative to the feature ports, and why

| Wave | What | Why here |
|---|---|---|
| W0 | Adam answers the decisions listed in section 9 (and D-S01-05 registry). | W1 cannot start with an open question about a target number. |
| **W1** | FR-01..FR-11 by script, alone, first. | Every TV file and test that will be ported into 40-49 (92 TV files with 175 import specifiers into 40/42-46, 24 into 47-49) ports with zero path edits only after it; TV 47/48/49 have no free slot before it; and W1 rewrites the hot files every later package edits, so running it later would collide with in-flight ports. Three slices (S01, S02a, S09) reached this order independently. |
| W1b | FR-12, FR-13 (hotkey file names, content unchanged) + identity hygiene (WP-S01-03R). | S04b/S05b add key rows and port tests that read TV's file names; renaming first removes D-S04b-07's interim "point the ported tests at KeyMappings". |
| W2 (start) | FR-16, FR-17 (transport facades at TV paths); 80 folder; Na__RenderLoop__IsPaused, ModelToggle and DoorAnim export additions (WP-S01-10). | Spec transport, Register, SheetImages, Publish, Statements and DrawingPlanes all import these names; landing them first keeps those ports verbatim. |
| W2 | Feature ports create their folders at TV's numbers (47, 48 with the Dev-menu rebuild, 49, 54, 55; LE 21 dormant, 26, 27, 28, 31, 32, 33, 36, 37, 51, 53 switched off, 54, 58, 59); FR-14 shim with the ObjectSnap port; FR-19/FR-20 copies with the LE config package (LE AppConfig is hot - serialise); app-root 50/52 with 55/36; 27 + vendor 06 + LE/52 last, behind the Statement switch. | Folder creation belongs to the package that owns the content; nothing to rename. |
| W2 (late) | FR-15 (delete Snapping__) after the SheetTools/DrawingTools hub ports; FR-18 after the spec transport sits on the facade; the publishing wave: 52, 53, LE/65 then LE/66 (after DR-06, DR-28, DR-29, DR-21, DR-11). | Each retirement waits for its last importer; publishing waits for its prerequisites. |
| W3 | FR-21 (retire 35), FR-25 (retire 91), FR-22 (62 -> 92, only on request), FR-23 (old three.js), FR-24 (SceneInspector split, optional and not recommended by DR-44); vendor 07 PdfJs only if the Register needs it before TV adopts it. | User-visible removals and housekeeping; none blocks a port. |

---

## 11. Corrections to the slice reports found while building the maps

1. **31 PORT NOTE lines become false at W1** and no slice listed them: "Import paths follow the ValeVision folder numbers (42
   DrawingViewCore, ...)" in 28 files of 42-46, the SnapshotHistory bullet in the two History files, and SnapshotHistory's own
   "File name carries the ValeVision double-underscore suffix." The script deletes or neutralises them (T8). The W1 preview diff
   (`k2work/renumber_W1_preview.diff`, 1,049 diff lines) shows every changed line for review.
2. **Two test pages** load jsPDF from 35 (`Na__Test__SpecificationPdf__.html:31`, `Na__Test__TitleBlockCells__.html:70`, the
   latter with `<base href="../">`); S01-F05, S09-F03 and WP-S01-02 list only the config and fallback (S06b-F54 caught one).
3. **Snapping__ importers = 10 files** (S04b-F02 was right); S01-F18 / WP-S01-04R / S11-V07 counted `SheetTools__.js`, which names
   it only in a comment (:336).
4. **D-S05a-04's "different schema"** for the 3D hotkey file is app tokens only (TV Manager :17-21); the file rename is safe.
5. **DistanceCulling's own import** changes depth when it moves (`../../04__MathUtils` -> `../04__MathUtils`); no slice listed it.
6. **WP-S03a-03 and WP-S03a-11 no longer exist** - superseded by WP-S03a-V03 and WP-S03a-V02.
7. **Na__Verify__Exports__ counts 415 files live vs 413 in the copy**: the two extra are untracked `.wrangler/tmp` build artefacts in
   `62__Feature__EmailWorkers/CloudflareWorker`, not source.
8. **The legacy Create Drawing entry is in `30__System__ImageExport`** (`Na__UiFeature__ImageExport__Controls.js:627`, plus
   index.html:354), so retiring 35 edits a shared 3D-tab module as well as index.html.

9. **Not a path change, so not in these maps:** S07a-F18 (action retire_vv) retires a BEHAVIOUR divergence - the Sheet panel's
   typed Drawing No. row - when the Drawing Register lands; it renames no file and is owned by S07a.

## 12. Open issues

- D-S10-13 / K1 DR-07 (service-worker token and cache split) gates the W1 DEPLOY, not the commit.
- Rows follow K1's recommended answers. If Adam answers otherwise the affected rows flip: DR-02 (b) cancels W1 entirely; DR-03 /
  D-S01-13 (b) -> run the script with `--legacy 39`; DR-04 parts -> `--no-renderpreset`, `--no-distanceculling`,
  `--no-snapshothistory`; DR-08 exclusion -> LE/21 not created; DR-22 (b) -> 52, 53, LE/65 not created and LE/80 stays VV's;
  DR-26 (decline the placeholder) -> 48 stays free.
- FR-18 depends on the transport body choice inside DR-27 (D-S09-V01 c keeps R2DrawingNotes as a per-document client).
- Site-plan, QR and Statement content that names NA (folder labels, OS licence text, Hub section) needs Vale values - DR-43, not
  a naming question.
- The vendor number 07 for PDF.js is VV-first; TV must record it (registry) or adopt it (back-port offer, D-S11-06).
- Resolved in code (R0 P10, R6 F.8 C5): VV registers the WCP stub, and `WebApps/live_sw.js` is an unreferenced saved copy;
  only the live site's copy is left to confirm, at the W0 deploy (S01 W7).

## 13. Tools (all in `parity/report/tools/`, all read-only on the apps unless stated)

| Tool | What it does |
|---|---|
| `k2_refscan.py` | Grep with classification (import / css / string / comment / history) over VV (+ WCP files) or TV; the source of every importer list. |
| `k2_build_maps.py` | Builds and validates both JSON maps and fills the tables in this file. Re-run after any tree change. |
| `k2_validate_maps.py` | Standalone JSON validation (fields, types, enums, decision ids, unique targets, VV-only numbers off TV's list). |
| `k2_renumber_apply.py` | The W1 change. `dry-run` (default, read-only), `copy --sim-dir` (proof on a copy), `git` (the one swarm agent that owns W1 - writes VV and the one WCP file). |
| `k2_renumber_preview_diff.py` | Writes `k2work/renumber_W1_preview.diff` from the copy, for review before W1. |
| `k2_path_gate.py` | Gate for path kinds the VV harnesses cannot see (CSS @import, `new URL`, config strings, folder tokens) plus retired names. Usable after every package. |
| `k2_renumber_touch.py`, `k2_lesub.py` | Working tools: the renumber touch list (reproduces verify_s01's 67 files / 235 refs exactly) and the per-folder inventory. |

Evidence files: `k2work/renumber_sim_report.json` (moves, files rewritten, pairing), `k2work/sim_gates.txt` (harness, gate and test
output on the copy), `k2work/renumber_W1_preview.diff`, `k2work/renumber_refs.json`, `k2work/renumber_touch_k2.tsv`. The 99 MB copy
was deleted after the run so no stale VV copy sits under `parity/` for other agents to grep; `k2_renumber_apply.py --mode copy
--sim-dir k2work/sim` recreates it in seconds (needed before re-running `k2_renumber_preview_diff.py`).
