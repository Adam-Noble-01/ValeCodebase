## Section B - Module Naming Divergence (Recommended Alignments)

Scope: module file names, the header identity lines (banner, `FILE`, `NAMESPACE`, `MODULE`), exported names and the identifier families that travel inside module code. Folder numbers are Section A, wiring (imports, events, transport routes) Section C, DOM ids and CSS Section D, the full module inventory Section E and the swarm order Section F. Every VV path given as a recommendation is a K2 target path (after the W0-02 renumber), relative to the app root. Work is cited by canonical K3 package (`W0-02` ...), decisions by K1 register id (`DR-02` ...) with the raw slice decision ids beside them where K2 lists them. Evidence: K2 rulebook and maps, the 28 `module_naming` findings (S01, S02a, S02b, S03a, S03b, S05a, S06a, S06b, S07a, S07b, S09, S11, S12) and an independent extraction run for this section over both live trees (TV HEAD b2aa9151, VV HEAD 7b4e593a, both clean on 01-Oct-2026; tools in B.6).

### B.0 Conclusions

1. **Module names are already nearly identical; the divergence is concentrated in a few files.** After the K2 renumber, 343 VV/TV source files (.js/.css/.json under `02__Src__AppModules` and `03__Style__AppStylesheets`: 292 JS, 30 CSS, 21 JSON) pair by identical relative path; 280 of them are the drawing system or its import surface and 251 sit in folders 40-55. Every TV `FILE` line equals its file name, and so does every VV one except a VV-only worker entry (`62__Feature__EmailWorkers/CloudflareWorker/src/index.js`); between twins the `FILE` lines differ only where K2 renames the file (FR-09, FR-10) or where one side has no header block (4 legacy files, B.3.1).
2. **Six path changes align every shared module name**, all scripted in W0-02 (FR-08 2dProfileLines to 05, FR-09 ComposerPreset to RenderPreset, FR-10 SnapshotHistory, FR-11 DistanceCulling) and W0-03 (FR-12, FR-13 hotkey files). Two VV-bodied files are created at TV's paths (FR-16, FR-17 in W0-12), one VV module is shimmed then retired (FR-14 W2-19, FR-15 W3-08), one retired (FR-18 W2-33), two vendor/asset files copied (FR-19, FR-20 in W0-16). The other 11 K2 rows are folder moves and retirements (Section A).
3. **NAMESPACE lines differ in 25 twins, and only one is wrong.** 17 only carry the app name as the namespace value (`TrueVision3D` / `ValeVision3D`: swap, no action); 5 have no `NAMESPACE` line on one side (legacy headers); 2 are deliberate VV-bodied twins (`Na__DrawPreset` in RenderPreset, `Na__DrawSection` in SectionAdapter - K2 H3); 1 is a real VV error: `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` says `Na__RenderEffect` while its seven exports are `Na__SectionClipping__*` (VV :6, :146-153). W0-03 owns that fix since R6 F.8 C12 (B.3.1).
4. **Exported names: three true renames, three placement divergences.** Renames: the 8 `Na__DrawView__ComposerPreset__*` names (W0-02), `Na__LeTools__SnapShapeTranslation` which TV renamed `Na__LeOsnap__ShapeTranslation` in `LE/28 ObjectSnap__Moves__` (lands with W2-19 + W3-03), and two dead `Na__StaticExport__*` wrappers where TV re-exports `Na__TilePlan__*` (W2-03). Placement: the snap API moving from `Snapping__` to the 28 ObjectSnap family (FR-14/FR-15), 13 `Na__PlanDim__*` config getters that TV exports from `44 Data__` and VV from `44 ConfigState__` (DR-42 item 7; a seam in every ported importer), and `Na__LeModel__AnnounceRestore` (W1-21).
5. **VV-only export names in shared drawing files: 18 in 12 files** (S01-F41's 18-in-12 recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, the loader facade), 4 retire (three with whole-file ports in W1-21 and W3-03, and the `Na__ElevData__SetSeededFrom` setter, which DR-32 leaves without a writer), 1 needed a ruling (`Na__ElevData__SetAzimuthDeg`: retire it with W2-05, the planner's ruling R0.2.11 Q-AZIMUTH, applied by R6 F.8 C20). The 3D support modules the drawing system imports carry 33 more VV-only names, all kept.
6. **TV names VV must add to modules it keeps with VV bodies: 12 names in 4 modules** (ProjectLoader 2 in W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter's four new calls (six names, W2-02; proposed in B.3.5, fixed by R6 F.8 C25) and the two facades (W0-12). Inside 40-55, TV drawing files import 232 names that VV's twins lack across 62 modules: 4 resolve with the FR-09 rename, 11 are the PlanDimensions getters (placement seam above), and the other 217 arrive with the package K3 already assigns to each module.
7. **App tokens inside names.** One TV module VV takes carries TV's token in its file name (`LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js`): keep the name (F1), exclude it by config (DR-43, W4-12) and the W0-04 naming lint carries a named exception for it (R6 F.8 C13). VV's own token stays in two VV-only names (the 3D hotkey handler and its JSON root key, DR-33).
8. **VV-only modules that stay** are the deliberate divergences: DIV-1 render engine and profile pass (05, 30, 70), DIV-2 `41__System__CrossSectionView` (7 files), DIV-4 `R2SaveProjectJson__`, the lazy loader `LE/01__Core__Loader` and its `DrawingCode__` leaf, `ThumbnailBake__`, the 3D hotkey handler and the folder-21 Presentation Mode splits. **VV gains 246 TV-only code files** (counts by system in B.4.2; full list in Section E).
9. **Gaps this section found in K1-K3** (each also in Open issues): the SectionClipping__State header has no owner; W0-14 should take TV's `MODULE` line for R2AssetUpload (K2 H3); no package creates `41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); W0-04's lint needs the TrueVisionHub exception; W1-10 must re-apply `Na__ElevData__STYLE_KEYS` (DR-32); W6-03 says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk). Section F's F.8 has since closed each of them in `wp_canonical.json` (C12, C18, C14, C13, C20, C31; B.5).

### B.1 The naming rulebook (condensed from K2)

**The one-sentence rule (K2):** code identity - folders, file names, namespaces, exports, events, CSS names, data keys - is TrueVision's; app identity - the app token in banners, console prefixes, category keys, project files, storage keys that embed the app name, routes, hosts and brand values - stays ValeVision's. TV is the lead: never rename a TV name to fit VV and never "fix" one side only. The full contract, with filled header examples, is `parity/report/K2__NamingRulebook.md`.

| Family | MUST MATCH TV | MUST STAY VV | Example (VV, K2 target) | K2 rule |
|---|---|---|---|---|
| Folders | TV's `NN__Category__Name` for every shared system, top level and LE sub-folders | VV-only numbers, registered; legacy goes to 91-99 | `02__Src__AppModules/40__System__DrawingViewCore/` (was 42) | N1-N9, Section A |
| Module file names | Character for character, including legacy names without the trailing `__` | Names of VV-only modules | `02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory.js` (FR-10) | F1 |
| Placement | A file follows its base name; split units and `__Config__.json` sit with their base | `LE/01__Core__Loader` is VV-reserved | `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` (FR-08) | N4, N5 |
| Config, style, README, test names | `Na__<System>__AppConfig__.json`, `Na__<Prefix>__<Feature>__Config__.json`, `Na__<System>__Styles__<Role>__.css`, `README__<Topic>__.md`, `Na__Test__<Feature>__.test.mjs`, `Na__Verify__<X>__.mjs` | VV-only legacy `__Config.json`, `__Stylesheet__.css` and `Na__GridLineSysem__*` keep their names (hard-coded paths, S01-F63) | `02__Src__AppModules/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json` | F3, F5-F7 |
| Hotkey files | TV's three file names | Root key `Na__ValeVision__HotkeysDictionary`, `ValeVision__*` actions, VV's handler | `02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json` (FR-13) | F4, DR-33 |
| Root documents and project files | TV's numbered content folder names (`10__StatementDocs/`) | `ValeVision__<KIND>__<Topic>__.md`, `ValeVision__DrawingNotes__.json`, lowercase `index.html` | `ValeVision__NOTES__FolderNumberRegistry__.md` | F8, F9 |
| Header lines | Banner text after the token; `FILE`, `NAMESPACE`, `MODULE`, `AUTHOR`, `PURPOSE`, `CREATED`; DESCRIPTION and INTEGRATION; on a whole-file port TV's module version and DEVELOPMENT LOG | Token `VALEVISION3D - `; the PORT NOTE block (VV format: Ported from, Source version, Ported on, Parity, Divergences, Back-port) | K2 section 3 filled examples | H1-H7, DR-34 |
| VV-bodied twins (DIV-1, DIV-2, DIV-4) | `FILE`, `MODULE`, banner and every exported name | Private `NAMESPACE` (`Na__DrawPreset`, `Na__DrawSection`), listed under Divergences | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | H3 |
| Namespaces and exports | `Na__<Ns>__<VerbNoun>`, constants `Na__<Ns>__SCREAMING_SNAKE`; TV's name for a shared mechanism even over a VV body; names missing from shared VV modules added at TV's paths first | VV-only exports: additive, listed under PORT NOTE Divergences, re-added after every whole-file port | `Na__RenderLoop__IsPaused` beside VV's pause events (W1-01) | X1-X4 |
| Console prefixes | TV's system word | `[ValeVision3D <System>]` | `[ValeVision3D LayoutEditor]` | C1 |
| CSS properties, classes, DOM ids | Names (TV itself uses `--Vale_*`); classes `na-le-*`; ids | Values for brand; a colliding VV-only id is renamed by VV | `naCrossSectionToolDev*` (DR-26) | S1-S5, Section D |
| Window events | TV's names and `_EVENT` constants (43 shared) | VV-only events (21); never copy TV's broken variants | `Na__LeModel__CHANGED_EVENT` | E1-E3, Section C |
| Browser storage | TV's keys | Keys that embed the app name swap the token | `Na__ValeVision__StatementDraft__<id>` | B1-B3 |
| Data keys | Blocks and record keys (`LayoutEditor__DrawingsData`) | Model category prefix `ValeVision__`; `CrossSection__SceneData`; no `window.TrueVision__*` reads | `ValeVision__Vegetation` | K1-K4 |
| Transport | Client paths and export names (`Na__CfApi__*`, `Na__LocalMirror__*`) | Bodies, worker routes, `/api/valevision/*`, `X-ValeVision-*`, `VaApps/Projects/` | `02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (FR-16) | R1-R6, Section C |
| Config values | Keys | Brand values; NA-only markers never ship | `LayoutEditor__Pdf__FontCdnBase` with a Vale value | V1, V2 |

**Gates every package passes on names (K2 section 12, K3 G1-G4):** `Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` (G1, G2), `parity/report/tools/k2_path_gate.py` (G3), and from W0-04 on `Na__Verify__ParityNaming__.mjs` + `Na__Verify__PortNotes__.mjs` (G4: `VALEVISION3D` banners, `FILE` lines, no `[TrueVision3D`, no `TrueVision__` literal, no `window.TrueVision__`, no NA-only marker outside the exempt parts: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04's baseline allow-list prints WARN instead of failing - K3 G4, R6 F.8 C13). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).

### B.2 Complete file-level rename map (K2 `file_rename_map.json`, 25 rows)

Rendered from `parity/data/file_rename_map.json`. VV paths are as they are today (HEAD 7b4e593a); the target column is the K2 target. Importer abbreviations: `LE/NN/` = `02__Src__AppModules/51__System__LayoutEditor/NN__*/`, `NN/` = `02__Src__AppModules/NN__*/`; "comments" lines are text references the same change rewrites. K2 used its own phase labels; the K3 column gives the canonical package (K3 crosswalk: K2 "W1" = W0-02, "W1b" = W0-03). FR-01..FR-11 are executed only by `k2_renumber_apply.py --mode git` in W0-02 - no agent hand-edits those paths.

#### B.2.1 File and region rows

| FR | Kind | VV now | VV target (K2) | TV twin | Why | Importers to update | Own imports to fix | Risk | K3 | K1 DR | Raw decisions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FR-08 | move | 02__Src__AppModules/40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js | 02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js | - | VV-only DIV-1 profile pass leaves the legacy folder; a file follows its base name, so it sits beside every other Na__RenderEffect__* file (K2 N5). | 40/Na__RenderEffect__2dProfileLines__.js (comments :5,7); 42/Na__DrawView__ComposerPreset__.js:93 (comments :91); 40/Na__ElevationView__SystemLogic.js:47 | '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js' -> './Na__RenderEffect__SectionClipping__State.js' (still resolves either way; normalised) | Low (2 importers). | W0-02 | DR-03 | D-S01-13, D-S02a-04 |
| FR-09 | rename | 02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js | 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js | 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js | Same eight exports; TV built RenderPreset from VV ComposerPreset 1.2.0 "interface only" (TV 40/Na__DrawView__RenderPreset__.js:24-25, :31-32). Composer body and private NAMESPACE Na__DrawPreset stay (K2 H3); RenderFrame gains an optional camera (S02a-F14). | 42/Na__DrawView__ComposerPreset__.js:274,276,311,324,333,368,405,426,434,447,486,507... (comments :5); 43/Na__FloorPlan__ModeController__.js:120,121,122,123,346,357,628; 46/Na__Elevation__ModeController__.js:112,113,114,115,375,386,716; LE/25/Na__LayoutEditor__SnapshotRenderer__.js:129,130,131,132,502,513,526; index.html:1412,1874,2211; 01/Na__AppFlow__LoadingSequence.js:425,1323 (comments :1319); 42/Na__DrawView__ConfigState__.js (comments :30) | - | Low mechanically (6 live importer files + the file itself, 52 code refs); behaviour unchanged. | W0-02 | DR-04 | D-S01-06, D-S02a-10 |
| FR-10 | rename | 02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory__.js | 02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory.js | 02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory.js | VV added a trailing __ on port; TV is the naming lead and keeps legacy suffix-less names (ConfirmDialog.js, ProjectLoader.js in both apps). | 44/Na__PlanAnnotations__History__.js:65 (comments :38,63); 45/Na__PlanDimensions__History__.js:61 (comments :38,59); 03/Na__AppUtils__SnapshotHistory__.js (comments :5) | - | None (2 importers, both in folders W0-02 renumbers anyway). | W0-02 | DR-04 | D-S02b-12R, D-S11-08 |
| FR-11 | move | 02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js | 02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js | 02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js | Same module one level deeper in VV; TV 40 Transitions and 42/45 ModeControllers import it from 05/. Its own import changes depth (TV :57 already has the new form). | 05/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js (comments :5,30); 01/Na__AppFlow__LoadingSequence.js:216; 31/Na__VideoStudio__Export__FrameRenderer.js:112; 31/Na__VideoStudio__Timeline__Thumbnails.js:117; 42/Na__DrawView__Transitions__.js:63; WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:318; WebApps/live_sw.js:157 | '../../04__MathUtils/Na__Math__Units.js' -> '../04__MathUtils/Na__Math__Units.js' (TV :57 has the same) | Low. The shared WCP precache entry (logic :318) goes stale but cannot break an install: the precache is best-effort per URL (logic :592-600). | W0-02 | DR-04, DR-07 | D-S01-07, D-S09-V02, D-S10-13 |
| FR-12 | rename | 02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json | 02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json | 02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json | TV v2.115.0 renamed the file (TV DEVLOG:5043); internal LayoutEditor__KeyMappings__* keys were kept, so only the file name moves now. | LE/03/Na__LayoutEditor__ConfigState__KeyMap__.js:63 (comments :13,154); LE/03/Na__LayoutEditor__AppConfig__.json:277,457; LE/03/Na__LayoutEditor__ConfigState__.js (comments :154); LE/10/Na__LayoutEditor__Controls__Pc__.js (comments :19); LE/10/Na__LayoutEditor__Controls__TouchScreen__.js (comments :29); LE/30/Na__LayoutEditor__Measurements__.js (comments :56) | - | Low for the name-only step; the content step is behaviour (T would reach Trim without the When-aware matcher). | W0-03 (name); W0-15 (TV content, KeyMap 1.11.0) | DR-18, DR-33 | D-S03a-03, D-S05a-04, D-S04b-07, D-S05b-04 |
| FR-13 | rename | 02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json | 02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json | 02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json | Same per-entry schema, app tokens only (TV 10/Na__Hotkeys__Manager.js:17-21); VV keeps root key Na__ValeVision__HotkeysDictionary, ValeVision__* actions and its handler. | 03/Na__AppUtils__ValeVision__HotkeyHandler__.js:116 (comments :13,28); 10/Na__UiFeature__NavigationHelpPanel__Controls.js:84 (comments :22); index.html (comments :1261,1776) | - | Low: two runtime fetches (HotkeyHandler :116, NavigationHelpPanel :84) - miss the second and the help panel empties. | W0-03 | DR-33 | D-S03a-03, D-S05a-04 |
| FR-14 | shim | 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | 02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/ (Na__LayoutEditor__ObjectSnap__Search__.js, __State__.js, __Marker__.js, __.js) | Step 1 of 2: re-export shim that imports only 28 __Search__ and __State__ and declares the three TONE strings locally (TV did the same, 28/Na__LayoutEditor__ObjectSnap__.js:60-63); never import the controller (cycle). | LE/35/Na__LayoutEditor__ShapeTool__.js:121 (comments :82); LE/05/Na__LayoutEditor__ModeController__.js:228; LE/30/Na__LayoutEditor__SheetTools__.js (comments :336); LE/30/Na__LayoutEditor__SheetTools__ContextMenu__.js:100; LE/30/Na__LayoutEditor__SheetTools__HitResolution__.js:112; LE/30/Na__LayoutEditor__SheetTools__Keyboard__.js:123; LE/30/Na__LayoutEditor__SheetTools__PointerDrag__.js:137; LE/30/Na__LayoutEditor__Snapping__.js (comments :5); LE/35/Na__LayoutEditor__DimensionTool__.js:129; LE/35/Na__LayoutEditor__LeaderTool__.js:77; LE/35/Na__LayoutEditor__RectangleTool__.js:98; LE/40/Na__LayoutEditor__Toolbar__.js:110 | - | Medium: visible snap behaviour change in one step (marker colours by target, D-S04b-02). | W2-19 | DR-01, DR-05, DR-40 | D-S04b-09, D-S04b-02, D-S04b-01 |
| FR-15 | retire | 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js | (deleted) | - | Step 2 of 2: delete when no importer is left; grep gate Na__LayoutEditor__Snapping__ / Na__LeOsnap__TONE_. | LE/35/Na__LayoutEditor__ShapeTool__.js:121 (comments :82); LE/05/Na__LayoutEditor__ModeController__.js:228; LE/30/Na__LayoutEditor__SheetTools__.js (comments :336); LE/30/Na__LayoutEditor__SheetTools__ContextMenu__.js:100; LE/30/Na__LayoutEditor__SheetTools__HitResolution__.js:112; LE/30/Na__LayoutEditor__SheetTools__Keyboard__.js:123; LE/30/Na__LayoutEditor__SheetTools__PointerDrag__.js:137; LE/30/Na__LayoutEditor__Snapping__.js (comments :5); LE/35/Na__LayoutEditor__DimensionTool__.js:129; LE/35/Na__LayoutEditor__LeaderTool__.js:77; LE/35/Na__LayoutEditor__RectangleTool__.js:98; LE/40/Na__LayoutEditor__Toolbar__.js:110 | - | Low. | W3-08 | DR-05 | D-S04b-09 |
| FR-16 | shim | (new file) | 02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js | 02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js | New VV-bodied facade at TV's path: NAMESPACE Na__CfApi, TV's 33 export names and signatures, bodies over whitecardopedia-editor-api + WCP Flask + VaApps/Projects/ (DIV-4). | 29 TV files that port with unchanged specifiers (list in the JSON) | - | High value / medium risk: transport semantics (S12 b.4-b.6); land before the first port that imports it. | W0-12 | DR-27 | D-S01-03, D-S09-04, D-S09-V01, D-S12-01, D-S07a-08 |
| FR-17 | shim | (new file) | 02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js | 02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js | New VV-bodied local-mirror shim at TV's path: Na__LocalMirror, 8 exports, over WCP/server.py routes. | 8 TV files that port with unchanged specifiers (list in the JSON) | - | Medium (localhost writes). | W0-12 | DR-27 | D-S01-03, D-S09-04, D-S12-01 |
| FR-18 | retire | 02__Src__AppModules/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js | (deleted) | (role absorbed by 80/Na__CloudflareIntegration__ApiClient__.js ReadProjectFile/WriteProjectFile and 03/Na__AppUtils__LocalProjectMirror__.js WriteSiblingFile) | VV-only per-document notes client; its role moves into the facade (ReadProjectFile / WriteProjectFile) and LocalMirror WriteSiblingFile. | LE/50/Na__LayoutEditor__SpecData__Transport__.js:90 (comments :30,37,89); 03/Na__AppUtils__R2DrawingNotes__.js (comments :5) | - | Low. | W2-33 | DR-27 | D-S12-01, D-S09-V01, D-S06b-V01 |
| FR-19 | move | 02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js | 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js | Identical jsPDF 4.1.0 build at TV's vendor path (TV moved its copy in v2.155.0). Copy now; the 35 original goes with FR-21. | LE/03/Na__LayoutEditor__AppConfig__.json:402; LE/03/Na__LayoutEditor__ConfigState__SheetSetup__.js:396; 80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html:31; 80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:70 | - | Low. | W0-16 | DR-03 | D-S01-02 |
| FR-20 | move | 02__Src__AppModules/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png | 01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png | 01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png (CONTENT DIFFERS - NA scan, never copied) | TV's asset path and file name, VALE's own scan (md5 59777a65), never TV's NA scan. Copy now. | LE/03/Na__LayoutEditor__AppConfig__.json:105,106,107,108; 35/Na__PageLayoutSystem__Config.json:6; 35/Na__PageLayoutSystem__SystemLogic__Main__.js:33 | - | Low. | W0-16 | DR-43 | D-S03b-10 |
| FR-24 | move | 03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css (lines 969-1239, REGION "Scene Inspector - Dev Tools Panel") | 03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css | 03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css | Optional: TV split the Scene Inspector region out of DropdownAndToast; DR-44 recommends not doing it for drawing parity. | 03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css (new @import) | - | Low (cascade order kept by importing it immediately after DropdownAndToast). | W5-04 (only on request) | DR-44 | D-S10-11 |

#### B.2.2 Folder and retirement rows (detail in Section A)

| FR | Kind | VV now | VV target (K2) | TV twin | Importers | Risk | K3 | K1 DR | Raw decisions |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | move | 02__Src__AppModules/40__System__2dElevationsView/ | 02__Src__AppModules/91__System__2dElevationsView/ | - | 4 files | Low. | W0-02 | DR-03 | D-S01-13, D-S01-02, D-S02a-04 |
| FR-02 | move | 02__Src__AppModules/42__System__DrawingViewCore/ | 02__Src__AppModules/40__System__DrawingViewCore/ | 02__Src__AppModules/40__System__DrawingViewCore/ | 51 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-03 | move | 02__Src__AppModules/43__System__FloorPlanViews/ | 02__Src__AppModules/42__System__FloorPlanViews/ | 02__Src__AppModules/42__System__FloorPlanViews/ | 11 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-04 | move | 02__Src__AppModules/44__System__PlanAnnotations/ | 02__Src__AppModules/43__System__PlanAnnotations/ | 02__Src__AppModules/43__System__PlanAnnotations/ | 7 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-05 | move | 02__Src__AppModules/45__System__PlanDimensions/ | 02__Src__AppModules/44__System__PlanDimensions/ | 02__Src__AppModules/44__System__PlanDimensions/ | 9 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-06 | move | 02__Src__AppModules/46__System__ElevationViews/ | 02__Src__AppModules/45__System__ElevationViews/ | 02__Src__AppModules/45__System__ElevationViews/ | 11 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-07 | move | 02__Src__AppModules/47__System__NorthDirection/ | 02__Src__AppModules/46__System__NorthDirection/ | 02__Src__AppModules/46__System__NorthDirection/ | 6 files | Mechanical; scripted in W0-02 (Section A) | W0-02 | DR-02 | D-S01-01, D-S01-15, D-S02a-01, D-S09-02, D-S02b-V03 |
| FR-21 | retire | 02__Src__AppModules/35__System__PageLayoutSystem/ | (retired) | (TV retired its copy, 90__System__PageLayoutSystem, in v2.155.0 - TV DEVLOG:1287) | 9 files | Medium (user-visible menu item removed). | W6-03 | DR-03 | D-S01-02, D-S09-10 |
| FR-22 | move | 02__Src__AppModules/62__Feature__EmailWorkers/ | 02__Src__AppModules/92__Feature__EmailWorkers/ | - | 4 files | Medium (deploy shortcut .lnk embeds an absolute path). | W6-03 (only on request) | DR-03 | D-S01-08, D-S01-05 |
| FR-23 | retire | 04__Lib__ThirdParty__Three/ | (retired) | - | 2 files | None. | W6-03 | - | - |
| FR-25 | retire | 02__Src__AppModules/91__System__2dElevationsView/ (after FR-01) | (retired) | - | 4 files | Medium (user-visible tool removed). | W6-03 | DR-03 | D-S01-02, D-S09-10 |

#### B.2.3 Execution notes that change how an agent runs a row

- **FR-09** keeps VV's composer body; the script rewrites `FILE`, banner and `MODULE` (preview `parity/k2work/renumber_W1_preview.diff:130-137`) but the PORT NOTE is hand-written (K2 rulebook section 3 filled example) and `RenderFrame` gains its optional camera argument in the same change - the one non-mechanical edit W0-02 allows. The four names TV's LE SnapshotRenderer imports (Enter, Exit, GetExportOverrides, RenderFrame) then resolve.
- **FR-10** - the script also rewrites the file's own `FILE` line (preview diff :59-60) and deletes the two PORT NOTE bullets that become false (PlanAnnotations / PlanDimensions History :38).
- **FR-11** - after the move, give the banner TV's text (`DISTANCE CULLING`, TV :2; VV says `DISTANCE CULLING (MAXENGINE ONLY)`, VV :2) and keep the MaxEngine-only note in the PORT NOTE (K2 H1). Not in the K2 script: a one-line hand edit inside W0-02.
- **FR-12** renames the file only; TV's key content lands with `ConfigState__KeyMap__` 1.11.0 in W0-15, never on VV's 1.0.0 matcher (T would reach Trim, S03a-F08, S09-F06). **FR-13** must repoint both fetches (HotkeyHandler :116 and NavigationHelpPanel :84) or the help panel empties (S03a-F30).
- **FR-14 -> FR-15:** the shim lands with the ObjectSnap switch-over (W2-19) and is deleted by W3-08 after the hub and drawing-tool ports (W3-03) have repointed the 10 importing files (S01's "11" counted a comment at `LE/30/Na__LayoutEditor__SheetTools__.js:336`).
- **FR-16 / FR-17** must exist before the first TV module that imports them: 16 TV drawing-system files import 21 of the 33 `Na__CfApi__*` names (27 TV files in all) and 6 import all 8 `Na__LocalMirror__*` names (S01-F13, recounted - B.3.5).
- **FR-18** is conditional on DR-27: if the facade keeps `R2DrawingNotes__` as a per-document client (D-S09-V01 c) the file stays; it is then the one VV-only file whose `NAMESPACE` line must be corrected to `Na__R2Notes` (its exports; S06b-F49, K2 H2).
- **FR-19 / FR-20 copy, never move**; the 35 originals go with FR-21. **FR-25** retires 7 files (6 JS + 1 JSON after FR-08 moves 2dProfileLines out; verified on disk), not the 4 W6-03's estimate note says.

### B.3 Namespace and export divergences between twins, and how to resolve each

Twins = a VV file and a TV file at the same K2 target path (343 pairs). Inside folders 40-55, paired at today's file names, the slices and this extraction agree: one `NAMESPACE` divergence (SectionAdapter), no `FILE`-line divergence, 18 VV-only names in 12 files (S01-F41). Pairing at K2 targets adds RenderPreset (FR-09), whose private `NAMESPACE` is deliberate (H3). The extraction extends the check to the whole tree and to the support modules TV drawing files import.

#### B.3.1 Header identity lines (`NAMESPACE`, `FILE`, `MODULE`, banner)

| Twin (K2 target, under `02__Src__AppModules/` unless noted) | Line | TV | VV | Cause | Resolution | K3 | Rule / DR |
|---|---|---|---|---|---|---|---|
| `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | NAMESPACE :6 | `Na__DrawView__RenderPreset` | `Na__DrawPreset` (after FR-09) | VV composer body (DIV-1) | Keep; list under PORT NOTE Divergences | W0-02 | H3, DR-04 |
| same file | FILE :5, MODULE :7, banner :2 | `...RenderPreset__.js`, "Render Preset" | `...ComposerPreset__.js`, "Composer Preset" | Pre-rename | Rewritten by the script (T6) | W0-02 | FR-09 |
| `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` | NAMESPACE :6 | `Na__DrawView__SectionAdapter` | `Na__DrawSection` (52 private identifiers use it) | VV body drives the live 41 tool (DIV-2) | Keep; the 13 exports are identical (TV :253-267, VV :480-494) | W2-02 | H3, DR-26 |
| `03__AppUtils/Na__AppUtils__SnapshotHistory.js` | FILE :5 | `Na__AppUtils__SnapshotHistory.js` | `Na__AppUtils__SnapshotHistory__.js` | VV rename on port | Rewritten by the script (T5) | W0-02 | FR-10 |
| `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` | NAMESPACE :6, MODULE :7 | `Na__SectionClipping`; "Render Pipeline - Section Clipping State" | `Na__RenderEffect`; "Section Clipping State" | VV authored the file (14-Jul-2026); TV ported it on 31-Aug-2026 "unchanged apart from the header" (TV DEVELOPMENT LOG) with its own NAMESPACE and MODULE lines | Set `NAMESPACE : Na__SectionClipping` (the 7 exports, VV :146-153) and TV's `MODULE`; keep VV's DESCRIPTION / INTEGRATION (dual engine, 41 CrossSectionView) as declared divergences. Body identical (git diff -w: header only) | W0-03 (R6 F.8 C12) | H2 |
| `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` | MODULE :7 | "App Utils - R2 Asset Upload" | "R2AssetUpload" | VV header style | Take TV's `MODULE` line when W0-14 adopts TV's upload contract | W0-14 | H3 |
| `44__System__PlanDimensions/Na__PlanDimensions__Data__.js` | banner :2, MODULE :7 | "DATA MODEL AND CONFIG" | "DATA MODEL" | VV moved the config getters into `ConfigState__` (B.3.3) | Keep VV's text (true for VV) until TV adopts the split; PORT NOTE Divergences | WT-01 (TV lane) | DR-42 item 7 |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | MODULE :7 | "(into the drawings, and back to the model)" | "(the wait for a drawing, and the way back to the model)" | VV 1.0.0 vs TV 1.1.0 | Whole-file take brings TV's line; VV's `DrawingSettled` export is re-applied | W1-33 | H2, DR-39 |
| `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` | MODULE :7 | "(the admin system's own facts)" | "(the project's own facts)" | VV has no admin system; it reads the project root | Keep VV's wording (it describes VV's body); PORT NOTE Divergences | W1-12 | DR-35 (TV v2.88.0 kept permanent) |
| `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js` | banner :2 | "DISTANCE CULLING" | "DISTANCE CULLING (MAXENGINE ONLY)" | VV dual-engine qualifier | TV's banner; qualifier into the PORT NOTE (B.2.3) | W0-02 (hand edit) | H1 |
| `05__RenderPipeline/Na__RenderLoop__Invalidation.js` | FILE / NAMESPACE / MODULE | (none: TV has a banner only) | full header | TV legacy header | Keep VV's header; nothing to match | W1-01 | H2 |
| `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` | banner :2, MODULE :7 | "STATIC EXPORT TILED RENDERER" | "STATIC TILED EXPORT RENDERER" | Wording | Take TV's text when W2-03 edits the file | W2-03 | H1, H2 |
| `21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js` | banner :2, MODULE :7 | "PROJECT DATA SCENE DATA" | "PROJECT JSON SCENE DATA" | TV reworded | Align on next touch (3D side; no drawing package edits it) | - | H1, H2 |
| `30__System__ImageExport/Na__ImageExport__AsyncYield__.js` | whole header | present (NAMESPACE `Na__ExportYield`) | missing (84 vs 113 lines) | VV copy predates TV's header | Out of drawing scope (no TV drawing importer); add on next touch | - | H2 |
| `10__NavigationAndCameras/` DefaultNavmode Ipad/Mouse controls, OrbitMode SystemLogic | header block | missing (OrbitMode keeps only `FILE` and `PURPOSE`, TV :5-6) | present | TV legacy headers | Keep VV's; out of scope | - | - |
| 17 twins (05 ProfileLines effect, 10 Fly/Walk x6, 25 x3, 26 ViewBuildingStoreys, 70 PurgeAppCache, 5 stylesheets) | NAMESPACE | `TrueVision3D` | `ValeVision3D` | App name used as the namespace value | None - token swap is correct (H1) | - | H1 |

Identity leaks in VV source today (the G4 baseline, verified by grep): banner `TRUEVISION3D - PLAN DIMENSIONS - STYLES` at `44__System__PlanDimensions/Na__PlanDimensions__Styles__.css:8` and console prefix `[TrueVision3D LayoutEditor]` at `51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js:431` (both W0-03); `window.TrueVision__Pwa__ProjectContext` read at `SpecPdf__.js:147` (W0-12, replaced by `Na__CfApi__GetProjectDisplayName`). `LE/07/Na__LayoutEditor__AutoSave__.js:48` names TV's global inside its PORT NOTE block, which G4 exempts (R6 F.8 C13).

#### B.3.2 Same function, different exported name (true renames)

| Module (K2 target) | VV name today | TV name | Importers | Resolution | K3 |
|---|---|---|---|---|---|
| `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` | `Na__DrawView__ComposerPreset__{ApplyStyles, Enter, Exit, GetCamera, GetExportOverrides, Initialize, IsActive, RenderFrame}` | `Na__DrawView__RenderPreset__{same eight}` | 6 VV files + the file itself, 52 code refs (FR-09) | Scripted rename (T6) | W0-02 |
| VV `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js` -> TV `51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Moves__.js` | `Na__LeTools__SnapShapeTranslation` (used by VV PointerDrag) | `Na__LeOsnap__ShapeTranslation` (TV also adds `Na__LeOsnap__GroupTranslation`) | VV PointerDrag | Arrives with the Moves unit (W2-19) and the whole-file takes of HitResolution 1.11.0 and PointerDrag 1.19.0 (W3-03); no shim (W3-01 records it as the only VV export TV drops) | W2-19, W3-03 |
| `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` | `Na__StaticExport__ClampToDeviceLimits`, `Na__StaticExport__IsIosDevice` (wrappers, VV :173, :184; no VV importer) | re-exports `Na__TilePlan__ClampToDeviceLimits`, `Na__TilePlan__IsIosDevice` (TV :541-542) | none (TV drawing files import only `Na__StaticExport__RenderToCanvas`) | Replace the wrappers by TV's re-export (X1) | W2-03 (first VV editor) |

Checked and **not** renames: `Na__PresentationMode__UI__SCENE_ACTIVE_EVENT` (TV :148, `na-presentation-mode-scene-activated`) and VV's `SCENE_SELECTED_EVENT` (VV :212, `na-pm-scene-selected`) are different events; Fly/Walk `SetFovOverride` (TV) and `SyncFromCamera` (VV) are different functions. Neither is imported by a TV drawing file.

#### B.3.3 Same names, different module (placement divergences)

| Names | TV module | VV module | Who is affected | Resolution | K3 / DR |
|---|---|---|---|---|---|
| 11 of VV's 14 `Na__LeOsnap__*` (CHANGED_EVENT, Clear, Find, HideMarker, IsEnabled, KIND_END, KIND_MID, SetEnabled, ShowMarker, Snap, Toggle); the 3 `TONE_*` have no TV home | `LE/28__System__ObjectSnap/` (`ObjectSnap__`, `__Search__`, `__State__`, `__Marker__`) | `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 10 VV importing files | FR-14 shim, FR-15 delete | W2-19, W3-08; DR-05 |
| 13 `Na__PlanDim__*` config getters (GetAxisLockSetup, GetClientModeSetup, GetCrosshairSetup, GetDisclaimerSetup, GetEditingSetup, GetGridSetup, GetInteractionSetup, GetLabel, GetLayerSetup, GetLineSetup, GetTextSetup, IsEnabled, Load) | `44__System__PlanDimensions/Na__PlanDimensions__Data__.js` (TV's `ConfigState__` duplicates them but only MarkupBridge :259 loads it) | `44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js` (VV `Data__` re-imports them, :83) | TV drawing files import 11 of them from `Data__`: 9 files inside 44, FloorPlan DevMenu Editor, MarkupMount, PlanAnnotations Toolbar, both mode controllers | Seam in every ported TV importer: import from `ConfigState__` (VV files say so in their PORT NOTEs, e.g. `44/Na__PlanDimensions__AxisLock__.js:57`). Packages that take such a TV file: W2-04 (states it), W1-37 (PlanAnnotations Toolbar), W2-03 (Elevation ModeController hunk). G2 catches a miss. TV half: WT-01 | DR-42 item 7 |
| `Na__LeModel__AnnounceRestore` | `LE/07/Na__LayoutEditor__SheetModel__.js` (facade) | `LE/07/Na__LayoutEditor__SheetModel__Sheets__.js` (re-exported by the facade) | AutoSave, History (import from the facade in both apps) | Moves to the facade with SheetModel 1.35.1 + Sheets 1.4.0 | W1-21 |

#### B.3.4 VV-only exported names in shared files

Inside folders 40-55 (18 names in 12 files, excluding the 8 ComposerPreset names). Rule X2: a kept name is additive, listed under PORT NOTE Divergences and re-applied after every whole-file take of its file.

| File (K2 target, under `02__Src__AppModules/`) | VV-only name | Ruling | Why | DR | K3 |
|---|---|---|---|---|---|
| `40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | `Na__DrawData__GetLayoutModeEnabled` | Keep | Layout Mode switch | DR-25 | W1-05 re-applies |
| `40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | `Na__DrawData__SetLayoutModeEnabled` | Keep | Layout Mode switch | DR-25 | W1-05 re-applies |
| `42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js` | `Na__FloorPlanMode__ApplyStyles` | Keep | D33 per-drawing style rows; VV keeps its own 42 controller | DR-32 | W2-04 (calls kept) |
| `42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` | `Na__FpData__STYLE_KEYS` | Keep | D33 | DR-32 | W1-08 re-adds |
| `45__System__ElevationViews/Na__Elevation__ConfigState__.js` | `Na__ElevCfg__GetSectionGroupTarget` | Keep (temporary) | D28 section filing; trigger "TV 48 past 0.1.0" | DR-26 | no change (TV and VV both 1.0.0) |
| `45__System__ElevationViews/Na__Elevation__ModeController__.js` | `Na__ElevationMode__ApplyStyles` | Keep | D33; VV keeps its own 45 controller | DR-32 | W2-05 (calls kept) |
| `45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` | `Na__ElevData__STYLE_KEYS` | Keep | D33 | DR-32 | **W1-10 must re-add** (its adaptations name only SeededFrom) |
| `45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` | `Na__ElevData__SetAzimuthDeg` | Ruling needed | FacePick seeding; only caller is VV's Elevation DevMenu Editor, which W2-05 replaces with TV 2.1.0 | DR-32 | W1-10 / W2-05 |
| `45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` | `Na__ElevData__SetSeededFrom` | Retire the setter, keep the field | DR-32: stop writing new values, preserve existing ones on read and save; only caller is the VV editor W2-05 replaces | DR-32 | W1-10 / W2-05 |
| `45__System__ElevationViews/Na__Elevation__SceneLink__.js` | `Na__ElevLink__SyncSceneGroup` | Keep (temporary) | D28 filing | DR-26 | W2-04, W2-05 keep |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | `Na__LeVeil__DrawingSettled` | Keep | Lazy-loader veil hand-over | DR-24, DR-39 | W1-33 re-applies |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | `Na__LeMode__IsAvailable` | Keep | Loader facade + Layout Mode | DR-24, DR-25 | W1-32 re-applies |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | `Na__LeMode__IsLayoutModeOn` | Keep | Layout Mode | DR-25 | W1-32 |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | `Na__LeMode__SetLayoutMode` | Keep | Layout Mode | DR-25 | W1-32 |
| `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | `Na__LeMode__WaitForFirstDrawing` | Keep | Loader wait contract | DR-24 | W1-31, W1-32, W1-33 |
| `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js` | `Na__LeModel__AnnounceRestore` | Retire from this file | TV keeps it in the SheetModel facade (B.3.3) | DR-05 | W1-21 |
| `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | `Na__LeRec__SheetShortCode` | Retire | Its only consumer is VV's Sheets__, replaced whole by W1-21; W1-19 keeps it exported until then | DR-24 | W1-19 -> W1-21 |
| `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js` | `Na__LeTools__SnapShapeTranslation` | Retire (renamed by TV) | B.3.2 | DR-05 | W3-03 |

In the 3D support modules TV drawing files import (33 names): all **kept**. TV code never needs them, and they shadow no TV name except the TiledRenderer pair in B.3.2.

| Module (under `02__Src__AppModules/`) | VV-only names | Purpose / note |
|---|---|---|
| `03__AppUtils/Na__AppUtils__ProjectLoader.js` | `Na__AppUtils__EmitFallbackToast`, `Na__AppUtils__GhBaseUrl_Fallback`, `Na__AppUtils__InitBuildManifest`, `Na__AppUtils__InitFromConfig`, `Na__AppUtils__InitMasterIndex`, `Na__AppUtils__R2BaseUrl_Fallback` | VV master-index / build-manifest loader (W0-11 adds TV's 2 names beside them) |
| `05__RenderPipeline/Na__RenderLoop__Invalidation.js` | `NA__PAUSE_RENDER_LOOP_EVENT`, `NA__RESUME_RENDER_LOOP_EVENT` | VV's event-based pause (K2 E2); W1-01 adds TV's IsPaused beside it (X3) |
| `10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js` | `Na__FlyMode__SyncFromCamera` | VV 3D navigation |
| `10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` | `Na__WalkMode__SyncFromCamera` | VV 3D navigation |
| `10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js` | `Na__NavToolbar__ResetView`, `Na__NavToolbar__SetFlyMode`, `Na__NavToolbar__SetOrbitMode`, `Na__NavToolbar__SetWalkMode` | VV toolbar API; W1-04 uses SetOrbitMode as the walk exit |
| `20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js` | `Na__MaterialsSystem__IsExemptName`, `Na__MaterialsSystem__LoadLibrary` | VV materials library |
| `21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js` | `Na__PresentationMode__Camera__ResolveSceneNavigationMode`, `Na__PresentationMode__KEY__NAVIGATION_MODE` | VV per-scene navigation mode |
| `21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js` | `Na__PresentationMode__ProjectJson__GetActiveProjectCode`, `Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair`, `Na__PresentationMode__ProjectJson__SetActiveImageList`, `Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget`, `Na__PresentationMode__ProjectJson__SortScenesForPlayback` | VV scene data helpers (W0-14 uses GetActiveProjectCode) |
| `21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js` | `Na__PresentationMode__Thumbnail__SetFrameRenderer` | VV frame-renderer hook (W0-14 adapts the call shape) |
| `21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js` | `Na__PresentationMode__UI__SCENE_SELECTED_EVENT`, `Na__PresentationMode__UI__ToggleSceneCarousel` | VV carousel event and toggle (not TV's SCENE_ACTIVE_EVENT) |
| `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` | `Na__DoorAnimation__GetBaseDurationMs`, `Na__DoorAnimation__GetSpeedScale`, `Na__DoorAnimation__SetSpeedScale`, `Na__DoorAnimation__SnapAllClosed` | Video Studio door speed and snap-closed (W1-02 keeps them) |
| `26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` | `Na__ModelToggle__GetCategories` | VV category list |
| `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` | `Na__StaticExport__ClampToDeviceLimits`, `Na__StaticExport__IsIosDevice` | see B.3.2 (replace with TV's re-export) |

#### B.3.5 TV names VV must add to modules it keeps with VV bodies (rules X3, X4)

Computed from every `import { ... }` in TV folders 40-55 against VV's exports at the same K2 target: outside 40-55 VV lacks exactly 12 imported names in 4 modules it keeps, matching S01-F15 and S01-V01/V02. Each must exist before the first TV importer lands; the K3 graph already orders it so (W1-01 before W2-01 Drawing Planes, W1-02 before W2-06 DoorPose, W0-12 before every facade importer - checked transitively in `wp_canonical.json`).

| Module (K2 target, under `02__Src__AppModules/`) | TV names to add | TV importers | VV body | K3 | Rule / DR |
|---|---|---|---|---|---|
| `03__AppUtils/Na__AppUtils__ProjectLoader.js` | `Na__AppUtils__GetProjectFolderFromUrl`, `Na__AppUtils__GetYearFromUrl` | 12 / 11 TV files (50 Persistence, LE Assets, SitePlan Store, Statement, ProjectQr, SheetImages, Publish, Share, PubDoc) | VV meaning: ?project-folder= / &year=, else the master index for ?project=; never project.json folderId (S12-V02) | W0-11 | DR-27 |
| `05__RenderPipeline/Na__RenderLoop__Invalidation.js` | `Na__RenderLoop__IsPaused` | 47/Na__DrawingPlanes__Grip__.js | Mirror VV's hold reasons inside the module; keep `na-pause/resume-render-loop` events | W1-01 | X3 |
| `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` | `Na__DoorAnim__ApplyPanelTransform`, `Na__DoorAnim__ComputePanelLocalPose`, `Na__DoorAnim__DescribeDoors`, `Na__DoorAnim__GetLiveProgress`, `Na__DoorAnim__MOD_TYPE_FIXED`, `Na__DoorAnim__MOD_TYPE_ROT_ONLY` | 50/Na__ProjectedLinework__DoorPose__.js | Merge TV 1.8.0/1.9.0 onto VV 1.7.1 (also FindAdrAncestor, IsDoorOpen, MOD_TYPE_MVE_ONLY, MOD_TYPE_ROT_MVE, ResolveHitPanel); keep VV's four `Na__DoorAnimation__*` | W1-02 | X4, DR-16 |
| `26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` | `Na__ModelToggle__BorrowRegistry`, `Na__ModelToggle__RestoreRegistry`, `Na__ModelToggle__SetCategoryVisibleByKey` | LE/25/Na__LayoutEditor__SnapshotRenderer__.js (TV :212) | VV bodies; keep the `na-model-visibility-changed` dispatch | W1-01 | X3, X4 |
| `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (new in both apps) | Proposed: `Na__DrawView__SectionAdapter__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`, `__SetModelRoot`, `__RenderDepthInto` | Replaces TV SnapshotRenderer's 41 imports (`Na__SectSerialize__Serialize/Apply` :213, used :1008, :1050; `Na__SectCutCfg__Get/SetAppearance` :223, used for `lineWidthPx` only :877, :902, :956; `Na__SectionCut__SetModelRoot` :244, used :786, :819) and 49 RenderLayer's `Na__SectionCut__RenderDepthInto` (:105) | VV bodies over the 41 tool (W2-02: SerializeSections / ApplySerializedSections, GetAppearance / SetLineWidth, a no-op SetModelRoot, a cap-only depth render); TV pass-throughs (WT-02). SetModelRoot and RenderDepthInto are named in S04a/S02b; the other four are proposed here from K3's wording - W2-02 fixes them and WT-02 uses the same | W2-02 (VV), WT-02 (TV) | DR-26, DR-42 item 1 |
| `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (new) | 33 `Na__CfApi__*`, 8 `Na__LocalMirror__*` (TV's names and signatures) | 16 TV drawing files import 21 `Na__CfApi__*` names (27 TV files in all); 6 import all 8 `Na__LocalMirror__*` | VV bodies (FR-16, FR-17) | W0-12 | DR-27 |

Inside 40-55, TV drawing files import 232 names VV's twins lack today, across 62 modules. Every one of those modules has a K3 package that takes TV's file (whole or by hunk replay) - except `44__System__PlanDimensions/Na__PlanDimensions__Data__.js` (the 11 getters of B.3.3) and `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` (4 names, resolved by FR-09). The modules, names and TV importers are listed in `parity/report/tools/out/r2b_importnames.json`; each module's owner is the K3 package that names its TV source in `parity/data/wp_canonical.json`.

#### B.3.6 Cross-module name collisions (the same exported name in two different modules)

| Names | Count | Where | Ruling |
|---|---|---|---|
| `Na__LeOsnap__*` | 11 | VV `LE/30 Snapping__` vs TV `LE/28` ObjectSnap units | Intended overlap during the shim; FR-14 then FR-15 (W2-19, W3-08) |
| `Na__PlanDim__*` | 13 | VV `44 ConfigState__` vs TV `44 Data__` + `ConfigState__` | Placement seam, DR-42 item 7 (B.3.3) |
| `Na__SectCap__*` | 2 | VV `41 Na__CrossSectionView__CapGeometry.js` vs TV `41 Na__SectionCut__CapGeometry__.js` | DIV-2 twins share the namespace: TV 41 is never ported into VV (DR-26, DR-41); G2 stays clean only while that holds |
| `Na__SectSceneData__*` | 4 | VV `41 Na__CrossSectionView__SceneData.js` vs TV `41 Na__SectionCut__SceneData__.js` | Same as above; VV keeps the `CrossSection__SceneData` schema (K2 rule K2, TD06) |
| `Na__LeModel__AnnounceRestore` | 1 | VV Sheets__ + facade vs TV facade | W1-21 |
| `Na__TilePlan__*` | 2 | TV re-exports from TiledRenderer | W2-03 (B.3.2) |
| `Na__ModelLoader__ApplyProfileLineColoursToMeshRoot` | 1 | TV split it into `15/Na__ModelLoader__LineworkColours__.js` (re-exported by MultiModel) | 3D side, no TV drawing importer; VV keeps one file (W1-03 ports only the two drawing fixes) |
| `Na__Supersampler__*` | 2 | VV `05 Supersampler__` and `31 Na__VideoStudio__Export__Supersampler.js` | VV-internal duplicate, out of scope |
| `Na__UiFeature__InitializeLocalhostDevMenu` | 1 | TV has it in 26 and 70 | TV-internal duplicate, out of scope |

Total 37 names; none is unexplained. Shared prefix without a shared name: VV `41/Na__CrossSectionView__SystemLogic.js` exports 35 `Na__CrossSection__*` names and TV `48/Na__CrossSection__DevMenu__Editor__.js` (NAMESPACE `Na__XSecDev`) exports `Na__CrossSection__DevMenu__Initialize` - no clash, but their DOM ids do clash (VV `index.html:855-866` and 41 DevControls :79-83 vs TV `Index.html:600-605` and 48 :79-81): VV renames its own five ids to `naCrossSectionToolDev*` in W2-05 (DR-26, Section D).

#### B.3.7 App tokens inside module and export names

| Name | Token | Where | Ruling |
|---|---|---|---|
| `Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (NAMESPACE `Na__LeStmtHub`; ID `TrueVisionHub`, block `StatementStandard__TrueVisionHub__Config`, prefix `TrueVisionHub__`, :102-104; 19 "TrueVision" strings) | TV | `02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/` | Keep TV's file name, ID and keys (F1, K1: the Standard Registry :140 imports it and statements carry the `TrueVisionHub` marker); exclude it from DEFINITIONS by config (DR-43, W4-12). **W0-04 declares a named G4 exception for this one file (R6 F.8 C13)**, without which G4 fails on "TrueVision 3D Project Hub"; the section is present but never rendered (R0 PD-15); WT-03 (DR-42 item 6) would move the branding into config |
| `Na__AppUtils__FetchTrueVisionProjectData` | TV | `03__AppUtils/Na__AppUtils__ProjectLoader.js` | Not imported by any TV drawing file; never added to VV (DR-09: no design phases) |
| `Na__AppUtils__ValeVision__HotkeyHandler__.js` (`Na__ValeVision__HotkeyHandler__Initialize`, `__Destroy`) | VV | `03__AppUtils/` | Keep (DR-33); its TV twin `10__NavigationAndCameras/Na__Hotkeys__Manager.js` is not ported |
| `Na__ValeVision__HotkeysDictionary` (JSON root key) | VV | `02__AppData/Na__Hotkeys__3dModelTab__.json` after FR-13 | Keep (K2 F4) |
| `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`; `50__ValeVision__UserConfig/`, `01__AppAssets__ValeVision/` | VV | project files, app-root folders | Token swap of TV's names (K2 F9, N7, N8) |

#### B.3.8 New names proposed by K2/K3, checked against the rulebook

| Proposed name | Proposed by | Kind | Check | Verdict |
|---|---|---|---|---|
| `Na__CfApi__GetProjectDisplayName()` | W0-12 (K3 ruling; VerbNoun form of WP-S12-V18's `Na__CfApi__ProjectDisplayName`) | VV-only export in the VV-bodied facade | X1 VerbNoun; X2 additive. S01-V04 had proposed `Na__DrawData__GetProjectDisplayName` - K3's facade name wins (the facade sits at TV's path, so a TV back-port makes every reader identical) | Adopt; one accessor only; used by W3-14, W4-12, W4-18 and SpecPdf |
| `Na__DrawData__GetDocumentCode()` | W1-12 | VV-only export in shared `40/Na__DrawView__ProjectData__.js` | X1, X2; W1-05 takes ProjectData whole first, so W1-12 adds it after | Adopt; re-apply after any later whole-file take |
| SectionAdapter calls (B.3.5) | W2-02 / WT-02 | new exports | X1 with TV's adapter prefix `Na__DrawView__SectionAdapter__` | Fix the six names in W2-02 |
| Gesture guard constants | W3-03 | VV-only constants | K3 left them unnamed; X1 requires `Na__<Ns>__SCREAMING_SNAKE` in each file's own namespace, listed in its PORT NOTE | Name in W3-03 |
| `Na__Verify__ParityNaming__.mjs`, `Na__Verify__PortNotes__.mjs`, `Na__Verify__UiParity__.mjs`, `Na__Test__LoaderStylesheets__.test.mjs`, `Na__Test__DrawingNotesRoute__.test.py`, `Na__Test__TransportFacade__.test.mjs`, `Na__Test__AppConfigParity__.test.mjs`, `Na__Test__PublishedApi__.test.py`, `Na__Test__LoaderFacade__.test.mjs`, `Na__Test__LineworkModifiers__.test.mjs`, `Na__Test__RegisterNumbering__.test.mjs` | W0-04, W0-09, W0-12, W0-15, W0-19, W1-31, W2-13, W4-18 | VV-only tests in `80__Testing__PrototypeEnvironment/` | F7 pattern; none collides with a TV test name (TV `80__Testing__PrototypeEnvironment` listed) | Adopt |
| WCP `Server__ValeVisionShared__Lib__.py`, `Server__ValeVisionSheetImages__Api__.py`, `Server__ValeVisionUserConfig__Api__.py`, `Server__ValeVisionPublished__Api__.py`, `Server__ValeVisionStatements__Api__.py` | W0-09, W0-18, W0-19 | Flask modules | R5 / F10 (precedent `Server__ValeVisionScrapbook__Api__.py`; `__Lib__` for the shared helper) | Adopt |
| WCP `CloudflareWorker/src/handlers/CloudflareHandler__ProjectFiles__.js`, `CloudflareHandler__ProjectMerge__.js`, `CloudflareWorker/src/CloudflareHelper__PathGuards__.js` | W0-10 | worker files | F10 (precedents `CloudflareHandler__DrawingNotes__.js`, `CloudflareHelper__Cors__.js`) | Adopt |
| `ValeVision__NOTES__FolderNumberRegistry__.md`, `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md`, `ValeVision__NOTES__StatementWriter__.md` | W0-06, W4-99 | root documents | F8 (mirrors TV's `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`, `TrueVision__NOTES__StatementWriter__.md`) | Adopt |
| `03__AppUtils/Na__AppUtils__R2StatementDocs__.js`, `CloudflareHandler__StatementDocs__.js` (S07b-F03); `Na__AppUtils__R2PublishedDocs__` (WP-S08-06) | slices | per-feature transport clients | Superseded by DR-27 (A): one facade at TV's paths and one generic files handler (W0-10, W0-11) | **Do not create** |

### B.4 VV-only modules that stay, and what VV gains

#### B.4.1 VV-only modules in the drawing system and its import surface

| VV module (K2 target, under `02__Src__AppModules/`) | Size | NAMESPACE | Status | Rationale | DR | K3 |
|---|---|---|---|---|---|---|
| `40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` | 433 lines | `Na__DrawThumb` | Stays | Bakes carousel thumbnails on add, seed and Update (VV seam kept in TV's 2.x menus); offered to TV | DR-32 | W2-04, W2-05; TV: WT-06 |
| `41__System__CrossSectionView/` | 7 files / 3,697 lines | several | Stays | DIV-2 live Cross Sections tool; TV's twin `41__System__SectionCutEngine/` (7 files) is never ported; add `README__CrossSectionView__.md` naming the twins (K2 N6, F6) | DR-26, DR-41 | README: W0-06 (R6 F.8 C14) |
| `51__System__LayoutEditor/01__Core__Loader/` | 3 files / 1,271 lines | several | Stays | Lazy editor loader (keeps ~73 modules off start-up); LE/01 reserved for VV | DR-24 | W1-31, W1-33 |
| `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` | 158 lines | `Na__LeCode` | Stays | Tab-code string leaf of the loader; SheetRecords keeps importing it; offered to TV | DR-24, DR-42 item 4 | W1-19; TV: WT-10 |
| `05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` | 217 lines | `ValeVision3D` | Stays (moved by FR-08) | DIV-1 ortho profile pass of the composer route | DR-03 | W0-02 |
| `05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js` | 310 lines | `Na__LineworkSettings` | Stays | DIV-1 linework state; gains TV's linework modifiers as `ValeVision__LineworkModifier__*` | DR-31 | W2-13 |
| `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` | 185 lines | `Na__RenderPipeline` | Stays | DIV-1 dual engine (TV twin `05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` not ported) | - | - |
| `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js` | 342 lines | `Na__RenderPipeline` | Stays | DIV-1 dual engine | - | - |
| `05__RenderPipeline/Na__RenderEngine__State.js` | 155 lines | `Na__RenderEngine` | Stays | DIV-1 engine state | - | - |
| `05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js` | 191 lines | `Na__UiFeature` | Stays | DIV-1 engine switch | - | - |
| `30__System__ImageExport/Na__UiFeature__LineworkSettings__Controls.js` | 184 lines | `Na__UiFeature` | Stays | DIV-1 linework controls | - | - |
| `70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js` | 174 lines | `Na__UiFeature` | Stays | DIV-1 dev controls | - | - |
| `70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js` | 230 lines | `Na__UiFeature` | Stays | DIV-1 dev controls | - | - |
| `03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` | 237 lines | `Na__AppUtils` | Stays | DIV-4 per-route client the facade fronts; VV Dev savers | DR-27 | W0-12; W2-33 (optional saver migration) |
| `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` | 163 lines | `Na__AppUtils` | Stays | 3D keys; twin of TV `10__NavigationAndCameras/Na__Hotkeys__Manager.js`; gated by KeyScope | DR-33 | W0-03 (fetch path), W1-29 |
| `03__AppUtils/Na__AppUtils__LoadingOverlay__.js` | 170 lines | `Na__AppUtils` | Stays | VV app core (3D start-up) | - | - |
| `03__AppUtils/Na__AppUtils__ResilientLoad__.js` | 217 lines | `Na__AppUtils` | Stays | VV app core | - | - |
| `01__AppCore/Na__AppCore__GpuLifecycle__.js` | 231 lines | `Na__AppCore` | Stays | VV app core | - | - |
| `01__AppCore/Na__AppCore__LoadWatchdog__.js` | 163 lines | `Na__AppCore` | Stays | VV app core; its global is read by the shared WCP registrar (S01-V05) | - | - |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__ScenePersistence__.js` | 237 lines | `Na__PresentationMode` | Stays | VV split of the scene editor, accepted by TV v2.68.2 (S01-F65) | - | W0-06 (headers) |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneReorder__.js` | 303 lines | `Na__PresentationMode` | Stays | as above | - | W0-06 |
| `21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js` | 990 lines | `Na__PmRows` | Stays | as above (NAMESPACE `Na__PmRows`) | - | W0-06 |
| `21__System__PresentationMode/Na__PresentationMode__DevTools__CameraPathVisualizer.js` | 367 lines | `Na__PresentationMode` | Stays | VV dev tool | - | - |
| `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 455 lines | `Na__LeOsnap` | Retires | Superseded by `LE/28__System__ObjectSnap/` (FR-14, FR-15) | DR-05 | W2-19, W3-08 |
| `03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | 296 lines | `Na__AppUtils` | Retires | Role absorbed by the facade (FR-18) | DR-27 | W2-33 |
| `91__System__2dElevationsView/` | 7 files / 2,190 lines | several | Retires | Legacy Elevation View: moved 40 -> 91 (FR-01), retired later (FR-25) | DR-03 | W0-02, W6-03 |
| `35__System__PageLayoutSystem/` | 9 files / 35,314 lines (incl. the 32,999-line vendored jsPDF) | several | Retires | Legacy Create Drawing (FR-19/FR-20 copies first, FR-21) | DR-03 | W0-16, W6-03 |

VV-only feature folders 28, 29, 31, 60, 61, 63, 64, 69 and 71 stay and are registered (62 moves to 92 only on request) - Section A. VV-only 3D files outside the drawing system (`02__AppData/Na__AppConfig__MaterialsLibrary.json`, `10/Na__Navmode__OrbitPivot__InteractionSwap.js`, three `11/...VerticalCorrection...` files) stay and are out of scope.

#### B.4.2 TV-only modules VV gains, counted by system (full list in Section E)

A TV-only code file (.js/.mjs/.cjs/.css/.json with no VV twin at its K2 target) counts as **gained** when a VV-wave K3 package (W0-W6) creates it at TV's path. READMEs, HTML harnesses and assets are not counted here. Several gained systems land dormant or switched off (site plans DR-08, Statement Writer DR-10, QR DR-12) and the publishing set waits for its prerequisites (DR-22).

**Drawing core and drawing systems (40-50)**

| System | Gained files | Lines | K3 packages | Not gained |
|---|---|---|---|---|
| 40__System__DrawingViewCore | 4 | 1,379 | W1-06 | 1 (DIV-1: VV keeps 05 2dProfileLines + LineworkSettings (K2 s.7)) |
| 41__System__SectionCutEngine | 0 | 0 | - | 7 (DIV-2: TV cut engine; VV keeps 41__System__CrossSectionView (DR-26, DR-41)) |
| 42__System__FloorPlanViews | 2 | 564 | W1-08 | - |
| 45__System__ElevationViews | 2 | 464 | W1-10 | - |
| 47__System__DrawingPlanes | 9 | 3,967 | W2-01, W2-40 | - |
| 48__System__CrossSectionViews | 1 | 198 | W2-05 | - |
| 49__System__ElevationDepthFog | 8 | 2,203 | W1-09, W2-03 | - |
| 50__System__ProjectedLinework | 3 | 1,435 | W2-06, W2-43 | - |

**Layout Editor (51)**

| System | Gained files | Lines | K3 packages | Not gained |
|---|---|---|---|---|
| LE/07__Core__SheetData | 3 | 778 | W1-13, W1-20 | - |
| LE/10__Core__SheetSurface | 1 | 479 | W1-22 | - |
| LE/15__Core__Markup | 3 | 692 | W1-13 | - |
| LE/20__System__Viewports | 6 | 2,095 | W1-14, W2-11, W2-12, W2-16 | - |
| LE/21__System__SitePlanData | 2 | 1,168 | W2-14 | - |
| LE/25__System__RenderStyles | 2 | 504 | W1-13 | - |
| LE/26__System__DraftMode | 4 | 649 | W1-14, W2-18 | - |
| LE/27__System__DrawingGrid | 5 | 1,451 | W1-14, W2-18 | - |
| LE/28__System__ObjectSnap | 16 | 5,534 | W2-19, W2-25, W2-42 | - |
| LE/30__System__SheetTools | 4 | 1,116 | W2-20, W2-21, W3-03 | - |
| LE/31__System__DocumentKeys | 2 | 457 | W1-30 | - |
| LE/32__System__OrthoMode | 3 | 438 | W1-14, W2-18 | - |
| LE/33__System__DrawingAxes | 3 | 680 | W2-18 | - |
| LE/36__System__HatchPatternTools | 3 | 1,480 | W1-17, W2-29 | - |
| LE/37__System__VectorTools | 18 | 7,385 | W1-14, W2-27, W2-28, W2-41 | - |
| LE/40__Ui__Panels | 1 | 240 | W2-14 | - |
| LE/50__Feature__Specification | 8 | 3,866 | W2-22, W2-30, W2-31, W2-32, W3-11 | - |
| LE/51__Feature__DrawingRegister | 10 | 3,659 | W1-13, W4-10, W4-18 | - |
| LE/52__Feature__StatementWriter | 33 | 16,898 | W2-30, W4-04, W4-05, W4-06, W4-12, W4-15, W4-16 | - |
| LE/53__Feature__ProjectQrCode | 5 | 1,729 | W1-15, W5-05 | - |
| LE/54__Feature__SheetImages | 17 | 4,709 | W1-16, W3-02, W3-18 | - |
| LE/57__Feature__ScrapbookParametric | 5 | 3,804 | W2-38, W2-39, W3-17 | - |
| LE/58__Feature__ScrapbookSpecification | 5 | 2,220 | W2-35 | - |
| LE/59__Feature__FloorAreas | 10 | 4,222 | W1-27, W3-10 | - |
| LE/60__Feature__PdfExport | 1 | 250 | W1-25 | - |
| LE/65__Feature__DocumentPublishing | 7 | 2,604 | W4-03, W4-07 | - |
| LE/66__Feature__DocumentSharing | 6 | 2,004 | W4-07, W4-08 | - |

**Document and feature systems (52-55)**

| System | Gained files | Lines | K3 packages | Not gained |
|---|---|---|---|---|
| 52__System__Layout__PublishedDocuments | 10 | 3,938 | W4-02, W4-17 | - |
| 53__Data__Layout__PublishedSchema | 3 | 1,039 | W4-01 | - |
| 54__Feature__ColourPalette | 5 | 1,670 | W1-37 | - |
| 55__Feature__SpellCheck | 6 | 1,657 | W2-34 | - |

**Support modules the drawing system imports**

| System | Gained files | Lines | K3 packages | Not gained |
|---|---|---|---|---|
| 03__AppUtils | 2 | 684 | W0-12, W1-29 | - |
| 05__RenderPipeline | 1 | 170 | W1-01 | 1 (DIV-1: VV dual engine 05/01__Engine__PureEngine + 02__Engine__MaxEngine) |
| 25__System__3dObject__InteractionSystem | 1 | 107 | W1-02 | - |
| 26__System__ToggleModelElements | 1 | 602 | W1-01 | 4 (3D-tab storey and dev-menu files, no package); 2 (DR-09: no Design Phase menu in VV) |
| 27__System__ContextMenuSystem | 2 | 551 | W4-11 | 6 (DR-44: TV 3D right-click menu not ported (renderer and styles only, W4-11)) |
| 80__CloudflareIntegration | 1 | 1,221 | W0-12 | - |

Drawing system and support modules: **244 files (92,960 lines) gained**, 21 TV-only files not gained, each for a recorded reason. Elsewhere in the tree VV gains 2 optional 3D-tab files (Cache & Storage panel and its sheet, W5-04, DR-44) and does not take 31 (62 AppInstallability x15, 75 x3, 76 x3, the 01 ProjectDataLoader placeholder, 10 Hotkeys Manager, the PwaInstallability and SceneInspector sheets, and 3D-tab files no package names: 07 DefaultFogEffect, 11 ViewModeFov DevControls, 15 InstanceConsolidation and LineworkColours, 21 Visibility StateCapture, 70 AssetCullDistance). Overall 246 gained of 298 TV-only code files.

### B.5 Open issues

1. No K3 package owns the `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` header fix (`NAMESPACE` / `MODULE` to TV's, B.3.1); recommended: add it to W0-03 (header-only, no import change). Settled: W0-03 owns it since R6 F.8 C12.
2. No K3 package creates `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); recommended: W0-06. Settled: W0-06 creates it (R6 F.8 C14).
3. W0-04's naming lint (G4) needs a declared exception for `LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (TV-token file name, ID and NA product strings kept at TV's path by W4-12), or W4-12 fails its own gate. Settled: W0-04's adaptations and acceptance and gate G4 name it (R6 F.8 C13).
4. W1-10's adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` loses its only caller when W2-05 replaces VV's Elevation DevMenu Editor with TV 2.1.0 - keep it as a FacePick seam or retire it (ruling for W1-10/W2-05); the `SetSeededFrom` setter retires under DR-32 (no new writes; the field is still read and preserved). Settled: W1-10 re-adds `Na__ElevData__STYLE_KEYS` and keeps both setters through W1, and W2-05 retires them (R6 F.8 C20; the planner's ruling R0.2.11 Q-AZIMUTH).
5. W0-14 should take TV's `MODULE` line for `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (K2 H3); its adaptations do not mention the header. Settled: R6 F.8 C18.
6. The four non-slice-named SectionAdapter names (`__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`) are proposed here (B.3.5); W2-02 must fix them before WT-02 copies them. Settled: R6 F.8 C25 fixes the six names for W2-02 and WT-02.
7. Every TV file that imports a `Na__PlanDim__*` config getter from `44 Data__` needs the `ConfigState__` seam in VV; W2-04 states it, W1-37 and W2-03 do not (B.3.3). Settled: R6 F.8 C24.
8. W6-03's estimate note counts 4 files in 91; the folder holds 7 after FR-08 (verified on disk); FR-25's importer list (4 files) is unaffected. Settled: R6 F.8 C31.
9. K3-proposed names awaiting Adam's confirmation (K3 open issues): `Na__CfApi__GetProjectDisplayName`, the gesture guard constants and the 11 VV-only test/verifier names; B.3.8 finds them rule-compliant.
10. S01-V04 (`Na__DrawData__GetProjectDisplayName`) and K3 (`Na__CfApi__GetProjectDisplayName`) named the same accessor differently; this section follows K3. Only one may be created.
11. Rows follow K1's recommended answers; a different answer to DR-02/DR-03/DR-04 flips FR-01..FR-11 (K2 script switches `--legacy 39`, `--no-renderpreset`, `--no-distanceculling`, `--no-snapshothistory`).
12. Two small hand edits are assigned here and are in neither the K2 script nor the K3 adaptations: the DistanceCulling banner after FR-11 (W0-02) and replacing the TiledRenderer `Na__StaticExport__ClampToDeviceLimits` / `IsIosDevice` wrappers by TV's `Na__TilePlan__*` re-export (W2-03). Settled: R6 F.8 C11 (W0-02) and C26 (W2-03).

### B.6 Method and reproducibility

| Tool (`parity/report/tools/`) | What it does |
|---|---|
| `r2b_extract.py` | Walks both trees' `02__Src__AppModules` and `03__Style__AppStylesheets` (skips node_modules, .wrangler, .claude, vendored 04__Lib), reads header lines and exports with a comment- and string-aware scanner, maps every VV path to its K2 target (FR-01..FR-13) and pairs twins. Read-only. |
| `r2b_analyse.py` | NAMESPACE / FILE / MODULE / banner divergences, export differences, cross-module name collisions, shared prefixes; the TV drawing import surface. |
| `r2b_importnames.py` | Every `import { ... }` in TV folders 40-55 checked against VV's exports at the same target (B.3.5). |
| `r2b_tvonly.py` | TV-only files gained per K3 `vv_targets` (B.4.2). |
| `r2b_render.py` | Writes this section from the outputs above, `data/file_rename_map.json` and the curated rulings; asserts every VV-only name, collision and module has a ruling. |

Cross-checks: the extraction reproduces S01's 18 VV-only names in 12 files, its single in-40-55 NAMESPACE divergence, K2's 70 drawing pairs and the S01-V01/V02/F15 missing names exactly; spot checks opened the cited lines in both trees (SectionAdapter, SectionClipping__State, TiledRenderer, the PlanDimensions imports, the TrueVisionHub module, the DOM ids).
