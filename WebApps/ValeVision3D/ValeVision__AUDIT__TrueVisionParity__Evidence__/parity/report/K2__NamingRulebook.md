# K2 - Naming Rulebook (ValeVision3D aligned to TrueVision3D's drawing system)

TV = TrueVision3D (lead, HEAD b2aa9151, v2.172.0). VV = ValeVision3D (target, HEAD 7b4e593a, v2.71.0).
Paths are relative to each app root. `TVM`/`VVM` = `02__Src__AppModules`; `LE/` = `51__System__LayoutEditor/`.
WCP = `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia` (VV's Flask server, Cloudflare worker and shared service worker).

This is the swarm's contract. Every rule says either **MUST MATCH TV** (copy TrueVision character for character) or
**MUST STAY VV** (ValeVision's own identity or infrastructure). It consolidates S01's rules R1-R23 with the verifier's
additions and the conflict rulings in section 14. It assumes Adam accepts the recommended decisions. Where a rule hangs
on a decision, the raw decision ids are given (K1 consolidates them).

**The one-sentence rule.** Code identity (folders, file names, namespaces, exports, events, CSS names, data keys) is
TrueVision's. App identity (the app token in banners, console prefixes, category keys, project files, storage keys
that embed the app name, routes, hosts, brand values) stays ValeVision's.

---

## 1. Folders

| Id | Rule | Side | Example (VV) | Evidence |
|---|---|---|---|---|
| N1 | TV is the numbering authority. A VV folder holding the same system as a TV folder has TV's exact `NN__Category__Name`, at top level, in LE subfolders and in nested sub-subfolders. | MUST MATCH TV | `VVM/42__System__DrawingViewCore/` becomes `VVM/40__System__DrawingViewCore/` (W1). `LE/52__Feature__StatementWriter/01__Core__Data/` is created verbatim. | S01 R1; D-S01-01, D-S01-15, D-S02a-01, D-S09-02 |
| N2 | A VV-only folder never takes a number TV uses now or has used (TV devlog history included). VV-only numbers are recorded in a shared registry; legacy VV tools go to the 9x band. | MUST STAY VV (reserved numbers) | `40__System__2dElevationsView` moves to `91__System__2dElevationsView`; 28, 29, 31, 35, 60, 61, 63, 64, 69, 71 stay and are registered. | S01 R2; D-S01-05, D-S01-13 |
| N3 | Reserved bands (proposal for the registry, both repos): **TV-only growth** 22-24, 32-34, 36-39, 56-59, 65-68, 72-74, 77-79, 81-89. **VV-reserved** 28, 29, 31, 35, 60, 61, 62 (it moves to 92 only if Adam asks, FR-22), 63, 64, 69, 71 and 91-99 (91 legacy 2dElevationsView, 92 EmailWorkers if it moves, 93-99 future VV-only). **Burnt** 90 (TV's retired `90__System__PageLayoutSystem`, TV DEVLOG:1287). A new VV-only top-level folder takes the lowest free number in 93-99. A new TV folder skips every VV-reserved number. | both | A future VV-only "ProductionKpi" system would be `93__System__ProductionKpi`. | this report; D-S01-05 |
| N4 | LE subfolder numbers are TV's. VV's only extra, `LE/01__Core__Loader`, is reserved for VV (TV's own devlog reserves LE/01 for a loader back-port, TV DEVLOG:11718). | MUST MATCH TV (+ LE/01 VV-reserved) | `LE/28__System__ObjectSnap/` created at 28. | S01 R3; D-S09-01, D-S11-05 |
| N5 | A file's folder follows its base name; split units and `__Config__.json` files sit with their base (VV ledger 1115-1117). | MUST MATCH TV | `Na__RenderEffect__2dProfileLines__.js` lives in `05__RenderPipeline/` beside `Na__RenderEffect__ProfileLines__.js`, not in a DrawView folder. | S01 R3 |
| N6 | DIV folders keep their own name when no TV file would resolve against a rename. | MUST STAY VV | `41__System__CrossSectionView/` stays (TV `41__System__SectionCutEngine/` has no file of the same name); add `41__System__CrossSectionView/README__CrossSectionView__.md` naming the twins. | D-S01-09 |
| N7 | App-root content folders mirror TV. The app token appears only where TV's folder carries TV's token. | MUST MATCH TV (token swapped) | `50__ValeVision__UserConfig/`, `51__LayoutEditor__UserScrapbookContent/`, `52__LayoutEditor__HatchPatternLibrary/` | S01 R16; D-S06b-03 |
| N8 | Assets and vendors use TV's subfolder numbers under each app's own root; vendor index files keep VV's `Vale__` prefix. | MUST MATCH TV (numbers) / MUST STAY VV (asset root, index names) | `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (Vale's scan), `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/`, `Vale__Dependencies__ImportMap__Index__.json` | S01 R17; D-S03b-10 |
| N9 | VV never creates TV's app-root worker folder; VV's worker stays in WCP. | MUST STAY VV | VV gains `VVM/80__CloudflareIntegration/` (client) only; worker = `WCP/CloudflareWorker`. | S12-F43; D-S12-01 |

## 2. File names

| Id | Rule | Side | Example | Evidence |
|---|---|---|---|---|
| F1 | Pattern `Na__<System>__<Part>__.<ext>` with the trailing double underscore for new files; a shared module's file name equals TV's character for character, legacy names WITHOUT the trailing `__` included. Never "fix" one side. | MUST MATCH TV | VV `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` becomes `Na__AppUtils__SnapshotHistory.js` (TV's name). `Na__AppUtils__ProjectLoader.js` stays suffix-less in both apps. | S01 R4; D-S02b-12R, D-S11-08 |
| F2 | The header `FILE` line equals the file name. | MUST MATCH TV | `// FILE       : Na__DrawView__RenderPreset__.js` after FR-09. | S01 R4 |
| F3 | Config files: top-level system `Na__<System>__AppConfig__.json`; LE subsystem and 5x features `Na__<Prefix>__<Feature>__Config__.json`; app-wide `02__AppData/Na__AppConfig__Main.json`. VV-only legacy `__Config.json` names stay. | MUST MATCH TV | `LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json` | S01 R5 |
| F4 | Hotkey files: three, one per kind of tab, TV's names. Internal JSON keys stay as they are (TV kept `LayoutEditor__KeyMappings__*`); the 3D file's root key and actions carry VV's token. | MUST MATCH TV (file names) / MUST STAY VV (root key `Na__ValeVision__HotkeysDictionary`, actions `ValeVision__*`) | `02__AppData/Na__Hotkeys__3dModelTab__.json`, `LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json`, `LE/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json` | TV DEVLOG:5041-5044; D-S03a-03, D-S05a-04 |
| F5 | Stylesheets `Na__<System>__Styles__<Role>__.css`; VV-only legacy `__Stylesheet__.css` names stay. | MUST MATCH TV | `LE/28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css` | S01 R6 |
| F6 | READMEs: a ported README keeps TV's exact name (TV has both styles: `Na__ContextMenuSystem__README__.md`, `README__SpellCheck__.md`). A new VV README uses TV's current style `README__<Topic>__.md`. | MUST MATCH TV | `41__System__CrossSectionView/README__CrossSectionView__.md` (new) | tree_tv.tsv |
| F7 | Tests keep TV's names: `Na__Test__<Feature>__.test.mjs` / `.test.cjs` / `.test.py` / `.html`, bundles `Na__TestEnv__<X>Bundle__.cjs`, verifiers `Na__Verify__<X>__.mjs`, sandbox `TestEnv__*`. | MUST MATCH TV | `80__Testing__PrototypeEnvironment/Na__Test__ObjectSnap__.test.mjs` | S01 R6 |
| F8 | Root documents `ValeVision__<KIND>__<Topic>__.md` (DEVLOG, README, PLAN, NOTES, PARITY, TASKS); VV keeps `index.html` lowercase and ported prose says "index.html". | MUST STAY VV | `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` (mirror of TV's plan name) | S01 R16, R19 |
| F9 | Sibling project files that carry TV's token swap it; TV's numbered content subfolders keep TV's names. | MUST STAY VV (token) / MUST MATCH TV (folder names) | `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`; `10__StatementDocs/` | S01 R13; D-S07b-03, D-S12-03 |
| F10 | VV-only transport/server files are named after their VV siblings (they have no TV twin). | MUST STAY VV | `WCP/Server__ValeVisionStatements__Api__.py`, `WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectFiles__.js` | S07b-F03; S12 b.5 |

## 3. Headers: banner, NAMESPACE / MODULE lines, PORT NOTE, DEVELOPMENT LOG, version

| Id | Rule | Side |
|---|---|---|
| H1 | Banner line 2 is `VALEVISION3D - ` followed by TV's text after `TRUEVISION3D - ` verbatim. No `TRUEVISION3D` banner may remain in VV src or styles (the PlanDimensions styles banner, `45/Na__PlanDimensions__Styles__.css:8`, is a known leak). | MUST MATCH TV (text) / MUST STAY VV (token) |
| H2 | `FILE`, `NAMESPACE`, `MODULE`, `AUTHOR`, `PURPOSE`, `CREATED` lines are TV's verbatim (CREATED keeps TV's date, not the port date). A VV-only file's `NAMESPACE` line names the short namespace its code actually uses (known fix: `03/Na__AppUtils__R2DrawingNotes__.js` should read `Na__R2Notes`, S06b-F49). | MUST MATCH TV |
| H3 | Exception for VV-bodied twins (DIV-1 RenderPreset, DIV-2 SectionAdapter, the transport facades): `FILE`, `MODULE`, banner text and every EXPORTED name are TV's; `NAMESPACE` may keep VV's private short namespace (`Na__DrawPreset`, `Na__DrawSection`) because the body's private identifiers use it; the PORT NOTE lists it under Divergences. | mixed |
| H4 | DESCRIPTION and INTEGRATION: TV's text verbatim; only app names change ("TrueVision" -> "ValeVision" where it names the running app, never where it names TrueVision as the source). | MUST MATCH TV |
| H5 | PORT NOTE replaces TV's own PORT NOTE block (TV's "ValeVision : not yet ported" lines are not copied). Fields, in order: `Ported from`, `Source version`, `Ported on`, `Parity` (verbatim / adapted / diverged), `Divergences` (one bullet per LIVE difference - delete bullets that stop being true, e.g. "Import paths follow the ValeVision folder numbers" after W1), `Back-port`. VV-authored modules use `Authored in : ValeVision3D first (vX); since ported back whole from TrueVision3D <ver> (HEAD b2aa9151)` (S05a-F05). | VV format |
| H6 | DEVELOPMENT LOG: on a whole-file port the file takes TV's module version and TV's DEVELOPMENT LOG verbatim; VV's own history goes to one PORT NOTE line and the VV devlog. | MUST MATCH TV (D-S05a-01, D-S11-03, D-S02b-10, D-S06b-10) |
| H7 | Regions, rules and spacing as VV plan 4.2 (79-dash `// REGION` + `Name` rule, 60-dash function rules, single `export { }` block, no default exports, no globals). | MUST MATCH TV (both apps share it) |

**Filled example - a VV file ported whole from TV** (`VVM/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js`,
TV source 1.0.0 from TrueVision3D v2.113.0, 21-Sep-2026). Everything not shown is TV's text verbatim.

```js
// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - ORTHO MODE - STATE
// =============================================================================
//
// FILE       : Na__LayoutEditor__OrthoMode__State__.js
// NAMESPACE  : Na__LeOrtho
// MODULE     : Layout Editor - Ortho Mode - State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Whether Ortho mode is on, and the one rule every tool asks: is the axis held for this point
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - ONE FLAG AND ONE RULE. Ortho mode (F8, as in AutoCAD) holds every point
//   ... (TrueVision's DESCRIPTION, verbatim) ...
//
// INTEGRATION:
// - Na__LayoutEditor__OrthoMode__ (the controller) is the only caller of
//   ... (TrueVision's INTEGRATION, verbatim) ...
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js
// - Source version: 1.0.0 (TrueVision3D v2.113.0, 21-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : DD-Mon-2026 for ValeVision3D v2.NN.0
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.0.0
// - Initial implementation: the flag, its reader, the remembered copy, the
//   Shift override switch and Resolve.
//
// =============================================================================
```

**Filled example - a VV-bodied twin** (FR-09, after W1): banner `VALEVISION3D - DRAWING VIEW CORE - RENDER PRESET`,
`FILE : Na__DrawView__RenderPreset__.js`, `NAMESPACE : Na__DrawPreset` (VV private), `MODULE : Drawing View Core - Render Preset`, then:

```js
// PORT NOTE:
// - Authored in   : ValeVision3D first (as Na__DrawView__ComposerPreset__.js 1.0.0, 09-Sep-2026); renamed to
//                   TrueVision's interface name in ValeVision3D v2.NN.0 (folder renumber, W1)
// - Twin          : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js 1.1.0
//                   (ported FROM this file, interface only)
// - Parity        : diverged (DIV-1: identical eight exports, composer route instead of TV's overlay route)
// - Divergences   :
//   - Body drives VV's EffectComposer (D12); NAMESPACE keeps the private Na__DrawPreset.
//   - RenderFrame takes an optional camera, as TV's RenderFrame(camera) does.
// - Back-port     : none (the interface is the seam).
```

## 4. Namespaces and exported identifiers

| Id | Rule | Side | Example |
|---|---|---|---|
| X1 | Exported names, short namespaces and constants are TV's (`Na__<Ns>__<VerbNoun>`, constants `Na__<Ns>__SCREAMING_SNAKE`). | MUST MATCH TV | `Na__DrawView__RenderPreset__Enter` (was `Na__DrawView__ComposerPreset__Enter`) |
| X2 | A VV-only export is additive, listed under PORT NOTE Divergences, and re-added after every whole-file port (18 such names in 12 shared files today, S01-F41). Never rename a TV export to fit VV. | MUST STAY VV (additive) | `Na__LeMode__IsLayoutModeOn` (D-S01-11) |
| X3 | Where both apps implement one mechanism differently, VV exports TV's name with a VV body, so TV files keep their imports. | MUST MATCH TV (name) | `Na__RenderLoop__IsPaused` added to VV `05/Na__RenderLoop__Invalidation.js` (S01-V01); `Na__CfApi__*` in the facade (FR-16) |
| X4 | Names missing from shared VV modules are added at TV's paths before their consumers are ported. | MUST MATCH TV | `Na__ModelToggle__SetCategoryVisibleByKey`, six `Na__DoorAnim__*` (S01-V02) |

## 5. Console prefixes

| Id | Rule | Side | Example |
|---|---|---|---|
| C1 | `[ValeVision3D]` or `[ValeVision3D <System>]`, `<System>` exactly TV's word. Today TV uses `[TrueVision3D]`, `[TrueVision3D LayoutEditor]`, `[TrueVision3D Share]`, `[TrueVision3D ProjectQr]`, `[TrueVision3D Statement]`, `[TrueVision3D Publish]`. No `[TrueVision3D` string may remain in VV src (known leak: `LE/50/Na__LayoutEditor__SpecPdf__.js:431`). | MUST STAY VV (token) / MUST MATCH TV (system word) | `console.warn('[ValeVision3D LayoutEditor] ...')` |

## 6. CSS custom properties, classes, DOM ids

| Id | Rule | Side | Example |
|---|---|---|---|
| S1 | Custom-property NAMES are one shared vocabulary - TV itself uses `--Vale_*`. Values may differ for brand. Never rename `--Vale_*` in either app. | MUST MATCH TV | `--Vale_HeaderFoldDuration`, `--Vale_HeaderFoldEase`, `--Vale_HeaderFoldDelay` (TV AppHeader.css:210-212, VV :206-208, identical) |
| S2 | LE tokens `--Na_Le_*`, `--na-le-*`, `--na-spec-*`, `--Na_Viewer*` are shared names. | MUST MATCH TV | `--Na_Le_InkMuted`, `--na-le-osnap-rgb` |
| S3 | Classes `na-<block>__<element>--<modifier>`, LE `na-le-*`, state classes `.is-open`; body state classes identical. | MUST MATCH TV | `body.na-layout-editor--active` (drives the header fold) |
| S4 | DOM ids `naCamelCase`, identical to TV. When a TV id collides with a VV-only id, the VV-only id is renamed (VV-only names never hold a name TV uses - same rule as N2), so TV's file ports byte-for-byte with no TV edit. | MUST MATCH TV | TV 48's `naCrossSectionDevItem/Toggle/Panel` vs VV 41's Cross Section Tool gate: VV renames its own gate ids (VV index.html:855-866, `41/Na__UiFeature__CrossSectionView__DevControls.js:79-83`; no CSS uses them), e.g. to `naCrossSectionToolDev*` (K1 DR-26; D-S02a-06 asked the reverse) |
| S5 | An editor stylesheet TV imports from its CSS index joins VV's `Na__LeLoad__STYLESHEETS` (`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:125-134`) in TV's relative order (Surfaces first, WebViewer last). 54 ColourPalette and 55 SpellCheck sheets go to VV's CSS index. | MUST MATCH TV (order) / MUST STAY VV (loader list) | `new URL('../28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css', import.meta.url).href` after Main__Paper |

## 7. Window events

| Id | Rule | Side | Example |
|---|---|---|---|
| E1 | Event names `na-kebab-case` and their constants `Na__<Ns>__<X>_EVENT` are TV's (43 shared today). | MUST MATCH TV | `Na__LeModel__CHANGED_EVENT = 'na-layouteditor-sheets-changed'` |
| E2 | VV-only events stay (21 today); a VV event that implements a shared mechanism differently (`na-pause-render-loop` / `na-resume-render-loop`) keeps working, and TV's NAME for the shared API is added beside it (X3). | MUST STAY VV | `na-layouteditor-loader-changed` (VV loader) |
| E3 | Do not copy TV's known-broken event variants over VV's working ones (dead `na-pm-scene-activated` listener, missing `na-model-visibility-changed` dispatcher, D-S09-11). | MUST STAY VV until TV is fixed | - |

## 8. Browser storage (localStorage, sessionStorage, IndexedDB)

| Id | Rule | Side | Example |
|---|---|---|---|
| B1 | Keys are TV's (the apps run on different origins). | MUST MATCH TV | `na-layouteditor-osnap`, `na-layouteditor-ortho`, `Na__LayoutEditor__Draft__<code>`, `Na__LayoutEditor__SpecDraft__<code>` |
| B2 | A key or database name that embeds the app name swaps the token. | MUST STAY VV (token) | `ValeVision3D__AuthoringUnlocked` (TV `TrueVision3D__AuthoringUnlocked`); `Na__ValeVision__StatementDraft__<id>` (TV `Na__TrueVision__StatementDraft__<id>`); IndexedDB `ValeVision3D__ProjectedLinework` (TV `TrueVision3D__ProjectedLinework`) |
| B3 | Offer TV app-neutral names so this seam disappears (`Na__LayoutEditor__Statement*`). | back-port offer | D-S01-04 item 3, D-S11-06 |

## 9. Data keys (project data, model categories)

| Id | Rule | Side | Example |
|---|---|---|---|
| K1 | Project-data blocks and record keys are TV's (3-stage `System__Block__Key`, sibling `__Description`). | MUST MATCH TV | `LayoutEditor__DrawingsData`, `LayoutEditor__DrawingRegister`, `PresentationMode__SavedCameraScenes` |
| K2 | `CrossSection__SceneData` is VV's schema (TD06); never port TV 41 `SceneData`/`Serialize`. | MUST STAY VV | D-S12-V02 |
| K3 | Runtime model category keys carry the app token; SketchUp tag names are shared; every `TrueVision__<Category>` literal in a ported file is a seam to swap. | MUST STAY VV (token) | `ValeVision__Vegetation` (TV `TrueVision__Vegetation`); `ValeVision__SceneEntourageSilhouette` (VV-only) |
| K4 | Window globals named after an app are identity seams: VV never reads `window.TrueVision__*`. Use a module accessor (preferred) or a neutral `window.Na__*` global VV publishes. | MUST STAY VV | `window.TrueVision__Pwa__ProjectContext` -> a project-display-name accessor over `project.json` (S01-V04); `window.TrueVision__Pwa__HasUnsavedWork` -> `window.Na__Pwa__HasUnsavedWork` honoured by WCP's registrar (S01-V05) |

## 10. Storage, R2, worker, local server

| Id | Rule | Side | Example |
|---|---|---|---|
| R1 | Bucket `noble-architecture-cdn` is shared with TV; isolation is by prefix and worker. Every VV key sits under `VaApps/Projects/<folderId>/` (folderId `YYYY/<code>__<Name>`, may contain spaces - encode per segment). Never `NaProjectPortal/`. | MUST STAY VV | `VaApps/Projects/2026/3047__Doous/project.json` |
| R2 | Existing VV object names stay: `project.json`, `ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/<name>.json`, `LayoutEditor/Snapshots/<hash>.webp`, `PresentationMode/Thumbnails/<scene>.webp`. | MUST STAY VV | - |
| R3 | New content folders under the project folder use TV's folder names verbatim so `53__Data__Layout__PublishedSchema`, the facade constants and the blueprints port unchanged. | MUST MATCH TV | `.../06__Layout__PublishedDocuments/`, `.../10__StatementDocs/`, `.../05__Layout__DrawingDocs__Images/` (D-S12-03 A, D-S08-01 a; K1 DR-29 rules the same for sheet pictures over D-S07a-07's `LayoutEditor/SheetImages/`) |
| R4 | Worker `whitecardopedia-editor-api` keeps route-specific handlers and `X-Editor-Api-Key`; new routes per S12 b.5 (`/project`, `/merge-keys`, `/files/read`, `/files/write`, `/files/upload`, `/files/list`, `/files/copy`, `/files/delete`). VV never gets TV's generic `/r2/*`. | MUST STAY VV | `POST /api/editor/projects/{folderId}/merge-keys` |
| R5 | Flask: routes `/api/valevision/<feature>`; blueprints `WCP/Server__ValeVision<Feature>__Api__.py` registered in `WCP/server.py`; headers `X-ValeVision-*`; reuse the existing project routes before adding new ones. | MUST STAY VV | `X-ValeVision-Drawings-Base` (TV `X-TrueVision-Drawings-Base`, LocalProjectMirror__.js:108); `/api/valevision/user-config/spellings` |
| R6 | Client transport: TV's file paths and export names with VV bodies (DIV-4). | MUST MATCH TV (names) / MUST STAY VV (bodies) | `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (Na__CfApi), `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (Na__LocalMirror) (D-S09-04, D-S12-01) |

## 11. Config values, hosts and brand

| Id | Rule | Side | Example |
|---|---|---|---|
| V1 | Brand lives in config VALUES, never in keys or code; keys are TV's. | MUST MATCH TV (keys) / MUST STAY VV (values) | `LayoutEditor__Pdf__FontCdnBase` key kept; value is a Vale-owned host (D-S03a-05, D-S10-05) |
| V2 | NA-only markers never ship in VV: `NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/30__TrueVision__CoreAppCode`, `/na-apps/20__PlanVision__CoreAppCode` (TV LE AppConfig:1200-1201, PDF.js), the `/q/` and `/s/` resolvers, NA logo and letterheads, `Noble Architecture Ltd`, and the "TrueVision 3D Project Hub" section in any rendered statement (its module lands inert at TV's path, excluded from DEFINITIONS by config and named in G4's one exception: DR-43, R0 PD-15). `cdn.noble-architecture.com/VaApps/...` and `www.noble-architecture.com/assets/...` are VV's own and allowed. | MUST STAY VV | PDF.js from `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` (D-S03a-07) |

## 12. Gates every package must pass (names)

1. `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` exit 0.
2. `python parity/report/tools/k2_path_gate.py --root <VV app root>` exits 0 (CSS @import, `new URL`, config path strings, folder tokens - the classes of path the two harnesses cannot see).
3. The naming lint of WP-S01-08R once it exists: no `TRUEVISION3D` banner, no `[TrueVision3D` prefix, no `TrueVision__` literal, no `window.TrueVision__`, no `/api/truevision`, no NA-only marker (V2). Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04's baseline allow-list prints WARN instead of failing (K3 G4, W0-04; R6 F.8 C13).

## 13. Never rewrite

History documents (`ValeVision__DEVLOG__.md`, `ValeVision__PARITY__TrueVisionLedger__.md`, `ValeVision__PLAN__*.md`) keep the
paths they recorded; add dated notes instead (the ledger gains a "Folder renumbering" section with the old -> new map). TV
source comments that name VV's old paths are provenance and stay (TV edits are D-S01-12 / D-S11-06).

## 14. Naming conflicts between slices - rulings

| # | Conflict | Ruling | Why (evidence) |
|---|---|---|---|
| 1 | Renumber VV's drawing folders first (S01, S02a, S09) vs keep VV numbers and translate (S02b-F01 option A, VV D05, TV plan 4.1) | **Renumber first, alone (W1).** Same as K1 DR-02. | TV holds 175 import specifiers (+6 CSS, 17 path strings) into 40/42-46 across 92 files and 24 into 47-49 (measured); TV 47 DrawingPlanes collides with VV 47 North; the scripted change was run on a full copy of VV: 0 retired names left, ModuleGraph (517 modules) and Exports (413 files) PASS, all 6 VV node tests PASS, 70 drawing files pair with TV by identical path. Decisions D-S01-01, D-S01-15, D-S02a-01 (B), D-S09-02 (b), D-S02b-V03 (a). |
| 2 | SnapshotHistory: VV renames (D-S02b-12R a, WP-S09-10) vs TV renames to the `__` house style (D-S11-08 b) | **VV takes TV's name `Na__AppUtils__SnapshotHistory.js`, inside W1.** Same as K1 DR-04. | TV is the naming lead and itself keeps suffix-less legacy names in 03 (`ConfirmDialog.js`, `ProjectLoader.js` in both apps); 2 importers in each app; TV edits are not authorised (D-S11-06). |
| 3 | Snapping__ retirement: single commit (WP-S01-04R, S11-V07) vs one-wave shim (D-S04b-09, WP-S04b-06R) | **Shim for one wave, then delete (FR-14, FR-15).** The shim imports only `__Search__` and `__State__`, declares the three TONE strings locally. Same as K1 DR-05. | TV did exactly this ("a re-export for an hour", TV ObjectSnap__.js:60-63); importing the controller would close the cycle TV documents at ObjectSnap__.js:33-37 (VV Measurements__.js:118-120 imports the three tools). Importers: **10 files** (S01's "11" counted `SheetTools__.js`, which names it only in a comment at :336). |
| 4 | Hotkey files: rename all three (D-S03a-03 a) vs keep VV's 3D dictionary name (D-S05a-04 a, "different schema") | **Rename both VV JSON files to TV's names, name only, in W1b**; keep VV's root key, `ValeVision__*` actions and VV's handler; TV's drawing-tab CONTENT lands only with ConfigState__KeyMap__ 1.11.0 (WP-S03a-02). | TV's Manager says its schema "is the same schema ValeVision3D's hotkey dictionary uses" (TV 10/Na__Hotkeys__Manager.js:17-21); the difference is app tokens only. Two fetches to repoint (HotkeyHandler :116, NavigationHelpPanel :84). The handler question stays D-S05a-04. Same as K1 DR-33. |
| 5 | ComposerPreset (VV) vs RenderPreset (TV) | **Rename VV's file and exports to `Na__DrawView__RenderPreset__*`; keep the composer body.** Same as K1 DR-04. | TV's RenderPreset was ported from VV ComposerPreset 1.2.0 "interface only" and says "the seam is the eight function names" (TV RenderPreset__.js:24-25, :31-32). 6 importer files. D-S01-06 (a), D-S02a-10. |
| 6 | Where 2dProfileLines goes: 05__RenderPipeline (S01) vs 40__System__DrawingViewCore (S02a option) | **`05__RenderPipeline/`.** Same as K1 DR-03. | Base-name placement (N5): every `Na__RenderEffect__*` file is in 05 in both apps; TV 40 holds only `Na__DrawView__*` files. 2 importers. D-S01-13 (a). |
| 7 | Section engine folder: keep `41__System__CrossSectionView` vs rename to `41__System__SectionCutEngine` | **Keep VV's name** (+ README naming the twins). Same as K1 DR-26. | No TV file name exists in VV's 41, so a rename resolves none of TV's 16 import statements into 41 (14 in 12 TV code files, 2 in Index.html); TV's own LE seam goes through SectionAdapter (back-port offer D-S01-04 item 1). D-S01-09 (a). |
| 8 | 62 EmailWorkers vs TV/WCP 62 AppInstallability | **Keep (nominal collision recorded; the DR-03 default leaves 62 unchanged). Move to `92__Feature__EmailWorkers` only if Adam asks** (D-S01-08 (a); FR-22 in K3 W6-03), after untracking node_modules. Same as K1 DR-03. | Nothing ports across 62 (VV uses WCP's PWA). 1,877 tracked files, 1,857 in node_modules; a `.lnk` holds an absolute path. 92 never used by TV. D-S01-08. |
| 9 | 35 PageLayoutSystem: what to keep before retiring | **W2 copies** `jspdf.umd.js` to `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/` and VALE's scan to `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png`; repoint LE AppConfig :105-108, :402, SheetSetup :396 **and the two test pages** (`Na__Test__SpecificationPdf__.html:31`, `Na__Test__TitleBlockCells__.html:70`, missed by S01/S09). **W3 retires** the folder with the Create Drawing button (index.html:354, :215) and its handler (ImageExport Controls :564-646). 35 stays reserved. Same as K1 DR-03. | Mirrors TV v2.155.0 (TV DEVLOG:1287-1290). D-S01-02, D-S09-10, D-S03b-10. |
| 10 | DistanceCulling path: TV's `05/` (D-S01-07 a) vs VV's `05/02__Engine__MaxEngine/` (D-S09-V02 a) | **Move to `05/` inside W1** (D-S09-V02 b, because W1 runs). Same as K1 DR-04. | TV's 40 Transitions and 42/45 ModeControllers import it from 05/. Move fixes its own import depth (`'../../04__MathUtils/...'` -> `'../04__MathUtils/...'`, as TV :57). The shared WCP precache line :318 is left to the DR-07 service-worker package (no package edits the shared worker); a stale entry is harmless because the precache is best-effort per URL (WCP logic :592-600). |
| 11 | Legacy 40 target number: 91 (S01) vs 39 (S02a) | **91.** Same as K1 DR-03. | 9x is the legacy band TV used (`90__System__PageLayoutSystem`, retired v2.155.0); 91 never used by TV; 39 sits in the 3x/4x ranges TV is still filling. The script supports `--legacy 39` if Adam overrides. D-S01-13 (a). |
