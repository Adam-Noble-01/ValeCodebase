# S12 - Data Model, Persistence and R2 Transport Parity (TrueVision -> ValeVision)

Slice S12 of the TrueVision (TV) / ValeVision (VV) drawing-system parity analysis, 01-Oct-2026.
Read-only analysis. TV is the source of truth; VV keeps its own Cloudflare worker
(`whitecardopedia-editor-api`), its own Flask server and its own R2 layout (`VaApps/Projects/{folderId}/`).

Path shorthand (expand to absolute Windows paths):

| Short | Absolute |
|---|---|
| `TV/` | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` (HEAD b2aa9151, devlog top v2.172.0) |
| `VV/` | `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` (HEAD 7b4e593a, devlog top v2.71.0) |
| `TVM/`, `VVM/` | `TV/02__Src__AppModules`, `VV/02__Src__AppModules` |
| `LE/` | `51__System__LayoutEditor/` under TVM or VVM |
| `NAAPPS/` | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps` (TV's ProjectVision local server) |
| `WCP/` | `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia` (VV's Flask server, VV's worker, VV's sync pipeline) |

Folder map in force (fixed for the re-alignment, TV realign plan s4.1): VV `42__System__DrawingViewCore` = TV `40`;
VV `41__System__CrossSectionView` <-> TV `41__System__SectionCutEngine` (DIV-2); `50`, `51` same. Every TV import of
`../40__System__DrawingViewCore/...` is a mechanical path seam (`../42__...`) in VV.

---

## (a) Scope

### What was examined

**TrueVision (about 52 files read in full or in the relevant regions)**

- Transport: `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` 1.5.0 (1,221 lines, read whole);
  `TV/80__CloudflareIntegration/CloudflareWorker/` (`src/CloudflareWorker__Main__.js` 1.1.0, `src/handlers/CloudflareHandler__R2__.js` 1.1.0,
  `wrangler.toml`, `package.json`, `deploy.bat`); `TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` 1.2.0 (whole);
  `Na__AppUtils__R2AssetUpload__.js` 1.0.1 (whole); `Na__AppUtils__ProjectLoader.js` 2.0.1; `Na__AppUtils__DevGate__.js` 1.1.0;
  `TVM/01__AppCore/Na__AppLoader__ProjectDataLoader__.js` (a 1-line placeholder); `Na__AppFlow__LoadingSequence.js` (project-data region 340-361, 700-980).
- Drawing core and sheet data: `TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` 1.6.0 (whole);
  `LE/07__Core__SheetData/` AutoSave 1.5.0, ProjectRecord 1.1.0, Assets 1.0.1, SheetRecords 1.39.0 (normaliser and log), SheetModel__Sheets 1.4.0 (RenumberSheets).
- Every TV drawing module that performs I/O (grep of `fetch(`, `Na__CfApi__`, `/api/`, `/r2/`, `localStorage`, `indexedDB` over 40-55, 03, 01:
  223 call sites, 102 files; kept as `parity/work_s12/tv_io_raw.txt`), with the import graph of the transport modules
  (`parity/work_s12/imports.txt`). Read in detail: SpecData Transport 1.3.0 (header/imports), SpecData Lockstep, SpecData Document,
  Register Data and Transactions, Register Pdf, Statement Data Transport (exports), Statement Publish and Publish Images, SheetImages
  Store / Source / Publish, Publish Transport, Share Manifest, PubDoc Urls, SpellCheck Dictionary, ScrapbookCustom Transport, ProjectQr Symbol,
  SitePlan Store, Panel ScrapbookParametric, ProjectedLinework Persistence 1.2.1, PerSceneLighting, SectionCut SceneData / Serialize.
- Local server: `NAAPPS/ProjectVision__LocalServer__Main__.py` (config, guard, backups, routes 616-826), and the route/constant blocks of
  `ProjectVision__TrueVisionPublished__Api__.py`, `__TrueVisionSheetImages__Api__.py`, `__TrueVisionStatements__Api__.py`,
  `__TrueVisionUserConfig__Api__.py`, `__TrueVisionScrapbook__Api__.py`; the dev-owned key lists in
  `NAAPPS/05__ProjectVision__CoreAppCode/CloudflareR2__ModelSync__Main__.py:121-130,541-545` and `ProjectVision__BuildScript__.py:83-92`.
- TV devlog entries v2.39.0 (L12719), v2.139.1 (L2700), v2.145.0 (L2006), v2.146.0 (L1901), v2.155.0 (L1266), v2.172.0 (L5);
  realign plan `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` s2.2 DIV-4 (L135-148) and s3.1 TD03 (L260-280).
- 80__Testing__PrototypeEnvironment: the 31 tests that touch persistence (listed in (g)).

**ValeVision and Whitecardopedia (about 48 files plus a data census)**

- `VVM/03__AppUtils/`: `Na__AppUtils__R2SaveProjectJson__.js` 1.2.0, `__R2AssetUpload__.js` 1.0.0, `__R2DrawingNotes__.js` 1.0.0 (all whole);
  `Na__AppUtils__ProjectLoader.js` 1.4.0 (most); DevGate (diff).
- `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` 1.2.0 (whole); ThumbnailBake (header).
- `LE/07`: AutoSave 1.3.0, ProjectRecord 1.0.0 (whole), Assets 1.0.0 (diff), SheetRecords 1.15.0 (normaliser), SheetModel facade (listeners);
  `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (late-start announcement); SpecData Transport 1.1.0 (header);
  ScrapbookCustom Transport (diff against TV).
- `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js` 1.7.0 (L660-760); `VVM/21__System__PresentationMode/` SceneData (active config),
  Thumbnail Renderer; `VVM/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js`; the nine VV dev-menu savers (grep).
- `WCP/CloudflareWorker/`: `src/index.js` 1.5.0, all six handlers, all four helpers, `wrangler.jsonc`, `package.json`, `.env.template`,
  `Deploy__Worker.bat`, `Dev__Worker.bat`.
- `WCP/server.py` (routes, helpers, run block), `WCP/Server__ValeVisionScrapbook__Api__.py` (header, routes).
- `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` (upload, purge, image list, thumbnail repoint, main
  sync actions), `AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py` (apply), `AutomationUtil__R2Common__Lib__.py` (upload);
  the SketchUp plugin that runs it (`...\Plugins\Na__ValeVisionCloudSync__Modules__\03__Plugin__CoreAppLogic\Na__ValeVisionCloudSync__CoreAppLogic__ConfigLoader__.rb:66`).
- `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (classification, strategies).
- `VV/ValeVision__PARITY__TrueVisionLedger__.md` (L1-176, transport rows), `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` D01-D40,
  `VV/ValeVision__DEVLOG__.md` (deploy notes L4998, L5072; R2DrawingNotes checkpoint L2610).
- Data census (read-only): root keys of all 155 `WCP/Projects/*/*/project.json` and of the 8 TV
  `na-project-portal/*-Projects/*/30__TrueVision__AppContent/TrueVision__ProjectData__.json`; key-tree diff of `LayoutEditor__DrawingsData`
  (`parity/work_s12/tv_block_keys.txt`, `vv_block_keys.txt`).

### What was NOT examined / could not be verified

- R2 itself (no bucket access): the live state of VaApps keys, whether the VV worker's `/drawing-notes` route (index 1.5.0) is deployed,
  and whether the purge in (b.9) has already deleted any R2 object. Everything said about R2 contents is by code reading.
- Cloudflare account plan limits (request body size, CPU time) - not verified.
- The TV ProjectVision sync and build scripts beyond their dev-owned key lists.
- Feature internals owned by other slices (SheetRecords 1.39 field-by-field, Statement Writer, Publishing, Sheet Images, Site Plan,
  Spell Check, Register); here they are covered only at their transport boundary, and cross-referenced to S03b, S04a, S06a/b, S07a/b, S08, S09.

### File counts in scope

| | TV | VV / WCP |
|---|---|---|
| Transport client modules | 3 (ApiClient, LocalProjectMirror, R2AssetUpload) | 3 (R2SaveProjectJson, R2AssetUpload, R2DrawingNotes) |
| Worker source files | 2 JS + 3 config (generic `/r2/*`) | 11 JS + 5 config (route-per-feature, API key) |
| Local server | Main + 5 API blueprints (6 Python) | `server.py` + 1 blueprint |
| Drawing modules doing project/R2/server I/O | 25 distinct: 16 import `Na__CfApi__` (ProjectData + 15 LE), 1 more imports only `Na__LocalMirror__` (Register Transactions; 6 import it in all), 2 import `R2AssetUpload` (Assets, Persistence), 4 more call local `/api/` routes directly (SheetImages Store, ScrapbookCustom Transport, SpellCheck Dictionary, Statement Editor Cards), 2 more read through `ResolveAssetUrl` / Publish Transport (PubDoc Urls, Share Manifest) | 6 (ProjectData, Assets, Persistence, SpecData Transport, ScrapbookCustom Transport, ThumbnailBake via Thumbnail Renderer) |
| Persistence tests | 31 | 3 (scrapbook only) |

---

## (b) Narrative findings by sub-system

### b.1 Executive summary

1. **The transports are structurally different and must stay so** (DIV-4): TV writes through an unauthenticated generic worker
   (`/r2/read|write|list|delete|upload|copy` over `NaProjectPortal/`) and mirrors to disk through the ProjectVision server; VV writes
   through a route-per-feature worker that needs `X-Editor-Api-Key`, a key only Flask hands out (`/api/editor-config`, `WCP/server.py:334-358`),
   so VV authoring is localhost-only by construction (VV D24). VV must not copy TV's worker or ApiClient FILE.
2. **The cheapest way to an identical editor is a same-path, same-name VV transport facade** (D-S12-01): a VV-authored
   `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (namespace `Na__CfApi`, TV's 33 export names, 27 of them used by TV
   modules) and `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (namespace `Na__LocalMirror`, 8 names), plus two identity helpers in VV's
   ProjectLoader. With them, the 16 TV drawing-system modules (40-55) that import the client (17 counting R2AssetUpload; 26 importers app-wide
   including the 11/21/70 dev controls), 6 that import the mirror, and every TV "Transport unit"
   (SpecData, Statement, Publish, SheetImages, ScrapbookCustom) port verbatim or with one-constant seams, and TV's name-stubbed tests port too.
   This is exactly the pattern TV already uses for `Na__AppUtils__R2AssetUpload__` ("identical signature, different transport",
   `TVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js:23-37`).
3. **VV needs new worker routes** (one deploy, D-S12-02): a project GET, a server-side `merge-keys`, and one guarded "project files" family
   (read / write / upload / list / copy / delete) whose allow-listed path families cover sibling documents, assets, sheet images,
   published documents and statements. Plus folderId validation and a capability list on `/api/editor/health`.
4. **VV needs Flask routes** (no deploy): TV v2.146's guarded project POST (`drawings-fingerprint`, a base header, 409, backups outside the repo,
   atomic writes), a generic sibling `files/<name>` route, `/api/health`, and a JSON 404 for unknown `/api/*` (today the catch-all answers
   200 with `index.html`, `WCP/server.py:956-977`). Feature blueprints follow the scrapbook precedent: `/api/valevision/<feature>`.
5. **CRITICAL, before any user content goes to R2 under the project prefix**: the Whitecardopedia sync that the SketchUp Cloud Sync plugin runs
   deletes every R2 image under `VaApps/Projects/{folderId}/` whose BASENAME is not a top-level local image
   (`AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:645-680`, called at 925-926 and 958-959). By code reading that already
   wipes `PresentationMode/Thumbnails/*.webp` and `LayoutEditor/Snapshots/*` on R2 at each full/images sync, and would wipe sheet images,
   published tiers and statement pictures. It also uploads the WHOLE local `project.json` (`:715-738`, `:927/936/987`), so a local copy behind
   R2 regresses R2's drawings - the exact data-loss class TV fixed with `DEV_OWNED_PROJECT_DATA_KEYS` in v2.39.0.
6. **VV has no `Na__DevSavedKeys` equivalent**: on localhost it loads `project.json` from disk only (`ProjectLoader.js:395-404`), although its own
   save utility calls R2 the SSOT (`R2SaveProjectJson__.js:15-19`). TV loads the base file and overlays the dev-owned keys from R2
   (`LoadingSequence.js:352-361, 738-747`). Recommended for VV (D-S12-04), with one SSOT list reused by the overlay, the worker allow-list and the
   sync pipeline.
7. **The persistence core is four TV versions behind**: `Na__DrawView__ProjectData__` 1.2.0 vs 1.6.0 (payload guard v2.86.0, save steps v2.116.0,
   `IsLoaded` v2.145.0, base guard and `SavedIso` v2.146.0) and AutoSave 1.3.0 vs 1.5.0 (+ undocumented `Suspend/Resume/DiscardSavedDraft`).
   Both port whole once the facade exists.
8. **Every editor save bumps VV's GLOBAL build manifest** (`ProjectEditor__.js:239`, `ProjectAsset__.js:148`, `DrawingNotes__.js:135`), and VV
   appends that token to every project.json and GLB URL (`ProjectLoader.js:121-125, 251-254`). TV's save cadence (structural auto save,
   register, spec sync, sheet-image steps, publishing) would make every client re-download every GLB after each save. New routes must not bump
   (D-S12-06).
9. **VV's "repository copy" URL must be app-root relative**, not `window.location.origin` relative: VV is served from
   `https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/` live and `http://127.0.0.1:8000/ValeVision3D/` on Flask, so the sibling
   `Whitecardopedia/Projects/...` copy is `new URL('../Whitecardopedia/Projects/...', appRoot)`. TV's `${origin}/na-project-portal/...` shape
   would 404 on GitHub Pages.
10. **Schema is close**: the drawings block differs only by TV's `LayoutEditor__DrawingsData__SavedIso` and VV's `__LayoutModeEnabled`;
    **[Corrected by verifier]** `CrossSection__SceneData` shares only its three BLOCK keys (`__Description`, `__Version`, `__Scenes`): the
    per-scene ENTRIES differ - VV stores `CrossSection__SceneBinding__*` with `CrossSection__Section__*` sections (VV 41 SceneData.js:229-245,
    read back only in that form at :406-433; all 5 VV project.json files with the block use it), TV stores the raw camelCase snapshot
    (`sections[].name/normalXyz/positionMm`, TV 41 Na__SectionCut__SceneData__.js:220-226 via Serialize__.js:167-200). Each app would read the
    other's entries as "no cuts". TD06 ("byte-compatible") is NOT met; see S12-V01. Per-scene lighting (`PresentationMode__Scene__Lighting`) is identical. New top-level key
    when the register arrives: `LayoutEditor__DrawingRegister`. Sibling file names map by config (`TrueVision__DrawingNotes__.json` ->
    `ValeVision__DrawingNotes__.json`, `TrueVision__StatementDocs__.json` -> `ValeVision__StatementDocs__.json`).
11. **Dormant VV bug found**: VV ProjectRecord reads `clientDrawingName` / `siteAddress` from the PRESENTATION block
    (`ProjectRecord__.js:100-107` via `GetActiveConfig`, which holds `PresentationMode__SavedCameraScenes`, `SceneData.js:124`), not from the
    project.json root its header promises.
12. **TV back-port candidates surfaced**: TV's three dev-owned lists lack `CrossSection__SceneData` (noted open in v2.39.0) and
    `LayoutEditor__DrawingRegister`; TV Register Data hard-codes `TrueVision__ProjectData__.json` via a `ProjectFileLocation` trick
    (`Register__Data__.js:320-322`); TV's worker has no auth and is configured `ENVIRONMENT = "development"` (any origin echoed,
    `CloudflareWorker__Main__.js:154-179`, `wrangler.toml` vars); R2 is not judged by TV's save guard (v2.146.0 "NOT done").

### b.2 The two transports today

| Concern | TrueVision | ValeVision |
|---|---|---|
| Project document | `TrueVision__ProjectData__.json` in `NaProjectPortal/{yy}-Projects/{folder}/30__TrueVision__AppContent/` | `project.json` in `VaApps/Projects/{yyyy}/{folder}/` |
| Project identity in URL | `?project=RB05&project-folder=RB05__WestFarm&year=26` | `?project=3047` -> master index -> `2026/3047__Doous` (`ProjectLoader.js:335-351`) |
| Worker | `na-truevision-api`, generic `/r2/*`, prefix guard only, no auth (`CloudflareHandler__R2__.js:43-72, 93-96`) | `whitecardopedia-editor-api`, `/api/editor/projects/{folderId}[/visibility|rename|delete|drawing-notes|assets]`, `X-Editor-Api-Key` on every non-health route (`index.js:112-153`) |
| Worker URL / key source | `Na__AppConfig__Main.json` `CloudflareConfig__WorkerBaseUrl`, `Na__CfApi__Initialize` from `TV/index.html:950` | Flask `GET /api/editor-config` reads `Tools__DevUtils/API__Cloudflare/Token__CloudflareAPI.env` (`server.py:334-358`); memoised by `Na__AppUtils__R2FetchWorkerConfig` |
| Load, localhost | repo file (static) + R2 overlay of `Na__DevSavedKeys` (`LoadingSequence.js:728-747`) | Flask `GET /api/projects/<code>` (disk only) |
| Load, web | CDN with `cache:'no-cache'` (v2.139.1, `ProjectLoader.js:133-162`) | CDN with `?v=<buildVersion>`, GH Pages fallback (`ProjectLoader.js:372-440`) |
| Drawings save | client merge on in-memory base -> `/r2/write` whole doc; then local mirror merges the saved keys into a FRESH disk read (`ProjectData__.js:710-836`, `LocalProjectMirror__.js:229-262`) | fresh Flask GET -> overlay 3 blocks -> worker whole-doc POST -> Flask whole-doc POST (`ProjectData__.js:380-430`, `R2SaveProjectJson__.js:184-219`) |
| Save guard | v2.146: fingerprint check before R2, base header on local write (409), backups outside repo | none |
| Asset write | `/r2/write` base64 (`ApiClient__.js:452-491`) | `/assets` base64 + Flask multipart mirror (`R2AssetUpload__.js:135-174`) |
| Large binary write | `PUT /r2/upload` raw stream, `/r2/copy` (worker 1.1.0, v2.116.0) | none |
| Sibling documents | allow-listed `ProjectFileNames` via `/r2/read|write` + `/api/projects/<code>/files/<name>` | only `ValeVision__DrawingNotes__.json` via `/drawing-notes` routes (worker and Flask) |
| Local server identity | `/api/health` -> `service: 'na-projectvision-local-dev'` | `/api/check-localhost` -> `{ isLocalhost: true }`; Flask `debug=True` (routes reload) |
| Sync pipeline vs editor keys | `DEV_OWNED_PROJECT_DATA_KEYS` merged from R2 before upload | whole local file uploaded; recursive image purge |

### b.3 Complete I/O inventory of TV's drawing system, with VV today and VV to build

Key: W = worker route (VV `whitecardopedia-editor-api`, base `.../api/editor`), F = Flask route on `WCP/server.py` (localhost:8000),
R2 key = under `VaApps/Projects/{folderId}/` unless noted. Route names marked NEW are specified in b.5 / b.6.

| # | Feature / operation | TV client (file:line) | TV transport | VV today | VV to build |
|---|---|---|---|---|---|
| A1 | Project data load, localhost | `LoadingSequence.js:736-747` -> `ProjectLoader.FetchTrueVisionProjectData:133-162`, `Na__CfApi__ReadProjectData:294-305` | static repo file + `POST /r2/read` overlay of 8 keys | Flask `GET /api/projects/<code>` only | facade `ReadProjectData` -> NEW W `GET /projects/{folderId}/project`; overlay VV editor-owned keys (D-S12-04) |
| A2 | Project data load, web | `ProjectLoader.js:145-156` | CDN `cache:'no-cache'` | CDN `?v=` then GH | unchanged (VV keeps its loader) |
| A3 | Merge base registration | `LoadingSequence.js:925` `SetLoadedProjectData` | in memory | none | `Na__CfApi__SetLoadedProjectData(projectData)` in VV LoadingSequence before the drawings dispatch |
| A4 | Drawings save (Save Sheets, structural auto save, rename, north, plan/elevation saves, register renumber/delete) | `ProjectData__.js:710-836` | pre-check `GET /api/projects/<code>/drawings-fingerprint`; save steps; `MergeAndSaveKeys` -> `/r2/write` whole doc; `Na__LocalMirror__MergeKeys` -> static GET + `POST /api/projects/<code>` with `X-TrueVision-Drawings-Base`; steps after | Flask GET + overlay + `R2SaveProjectJson` (W `POST /projects/{folderId}` whole doc, then F `POST /api/projects/<code>` whole doc) | port ProjectData 1.6.0 verbatim over the facade: NEW W `POST /projects/{folderId}/merge-keys` (fallback: existing whole-doc save); facade LocalMirror -> F guarded `POST /api/projects/<folderId>` + NEW F `GET .../drawings-fingerprint` |
| A5 | Keys saved by A4 | `ProjectData__.js:756-775` | `LayoutEditor__DrawingsData` (+`__SavedIso` stamp), `PresentationMode__SavedCameraScenes`, `CrossSection__SceneData` (provider), `registerKeys.cloud/local` | same three blocks (no stamp) | same, plus `SavedIso`; section block via `RegisterSectionBlockProvider` from VV 41 SceneData |
| A6 | Drawing Register block | `Register__Data__.js:260-301` (Save), `:310-345` (Load), `Register__Transactions__.js:300-380` | `ReadProjectData` + `MergeAndSaveKeys({LayoutEditor__DrawingRegister})` + `LocalMirror.MergeKeys`; local load = static GET of `TrueVision__ProjectData__.json` derived from `ProjectFileLocation('TrueVision__DrawingNotes__.json').repoUrl` | none (no register) | facade covers all calls; the local-load trick is a seam (or TV back-port `Na__CfApi__ProjectDataLocation`, F31); add the key to the editor-owned list |
| A7 | Register numbering read | `SheetModel__Sheets__.js:260-272` | `GetLoadedProjectData().LayoutEditor__DrawingRegister` | none | facade `GetLoadedProjectData` |
| A8 | Project name for register PDF / parametric title | `Register__Pdf__.js:212-217`, `Panel__ScrapbookParametric__.js:289-297` | `window.TrueVision__Pwa__ProjectContext`, `data.Project__Name` (absent in TV data too) | n/a | seam: `displayName || projectName` (F34) |
| A9 | Client / site address facts | `ProjectRecord__.js` 1.1.0 | `AdminFileLocation` / `PlansFileLocation` static reads (NA admin + PlanVision files) | reads the presentation block by mistake (`ProjectRecord__.js:100-107`) | keep VV divergence (no admin system); read root via `GetLoadedProjectData()` (F24); facade returns `null` for Admin/Plans locations |
| A10 | Site plan data | `SitePlan__Store__.js:116-120, 274, 455-470` | `GetLoadedProjectData().SitePlan__DataStores` + static files under `30__TrueVision__AppContent/<folder>` | none | S04a transport adapter (its three URL functions); data key read through the facade |
| B1 | Baked projected linework | `Persistence__.js:561`; read via `ResolveAssetUrl` | `WriteProjectAsset` -> `/r2/write` JSON; key `.../LayoutEditor/Linework/<name>.json`; IndexedDB `TrueVision3D__ProjectedLinework` | `R2AssetUpload` (W `/assets` + F `/assets`); IndexedDB `ValeVision3D__ProjectedLinework` | port Persistence 1.2.1 verbatim (with F06 identity helpers); keep VV DB name |
| B2 | 3D viewport snapshots | `Assets__.js:159-171` | `/r2/write` base64; `LayoutEditor/Snapshots/<hash>.webp|png` | same paths via `/assets` | port Assets 1.0.1 verbatim |
| B3 | Presentation / drawing thumbnails | `Na__CfApi__WriteThumbnailWebp` (`ApiClient__.js:410-429`) | `/r2/write` base64; `PresentationMode/Thumbnails/<scene>.webp` | `R2AssetUpload` from Thumbnail Renderer (`:235-242`) and ThumbnailBake | facade `WriteThumbnailWebp` -> existing `/assets` |
| C1 | Specification read (cloud) | `SpecData__Transport__.js:325` `ReadProjectFile(fileName)` when `UsesWorker` | `/r2/read`; CDN otherwise | `Na__R2Notes__ReadCloud` (W `GET .../drawing-notes`, else CDN) | facade `ReadProjectFile('ValeVision__DrawingNotes__.json')` -> existing W `GET /drawing-notes` (or NEW files/read) |
| C2 | Specification read (local) | Lockstep `ReadLocalFile` -> `ProjectFileLocation().repoUrl` with Last-Modified | static repo file | Flask `GET /api/projects/{folderId}/drawing-notes` | facade `repoUrl` = `../Whitecardopedia/Projects/{folderId}/ValeVision__DrawingNotes__.json` (served by `server.py:899-909` with real 404 and Last-Modified) |
| C3 | Specification write | `SpecData__Transport__.js:653` `WriteProjectFile`; `Lockstep:389` `Na__LocalMirror__WriteSiblingFile` | `/r2/write`; `POST /api/projects/<code>/files/<name>` (backed up) | `Na__R2Notes__Write` (W POST then F POST), `WriteLocal` | facade -> W `POST /drawing-notes` (or files/write); mirror -> NEW F `POST /api/projects/<folderId>/files/<name>` (backup, atomic) |
| C4 | Spec drafts | `SpecData__Draft__.js:122-137`, `Lockstep:299` | `Na__LayoutEditor__SpecDraft__<code>`, `Na__LayoutEditor__SpecDiscarded__<code>` | `SpecDraft` only | ported with the units |
| D1 | Statement index | `Statement__Data__Transport__.js:187-257` | `ProjectFile*('TrueVision__StatementDocs__.json')` + `WriteSiblingFile` | none | facade + F-SIB family + F files route; config `IndexFileName` = `ValeVision__StatementDocs__.json` |
| D2 | Statement files (md, html, pictures) | `Transport:278-352`, `Publish__.js:271-282`, `Publish__Images__.js:256-281` | `StatementFileLocation`, `/r2/read|write` under `30__TrueVision__AppContent/10__StatementDocs/<path>`; local `/api/truevision/statements/{tree,file,image,folder,move,delete}` | none | facade (F-STMT family on NEW files routes) + NEW blueprint `/api/valevision/statements/*` (S07b) |
| D3 | Statement drafts / view | `Statement__Data__.js:158-159, 302-331`, `Page__.js:179` | `Na__TrueVision__StatementDraft__<id>`, `...Discarded__`, `...StatementView__` | none | rename brand-bearing keys (F35) |
| E1 | Sheet images upload/copy/list/delete (R2) | `SheetImages__Publish__.js:287-364` | `PUT /r2/upload` raw (fallback `/r2/write`), `/r2/copy`, `/r2/list`, `/r2/delete` under `.../05__Layout__DrawingDocs__Images/<docId>/<file>` | none | facade `SheetImage*` over NEW files upload/copy/list/delete (F-IMG family) |
| E2 | Sheet images local | `SheetImages__Store__.js:61-62, 70-121` | `/api/truevision/sheet-images/{upload,reconcile,list}` with `project-folder`,`year` | none | NEW blueprint `/api/valevision/sheet-images/*` (S07a); constant seams ROUTE, SERVICE |
| E3 | Sheet images read | `SheetImages__Source__.js:107-115` | localhost: repo then CDN; web: CDN, repo, Pages (`Sources__PagesBaseUrl`) | none | facade `SheetImageLocation` (repoUrl app-root relative, `relative` = `Whitecardopedia/Projects/...`), config PagesBaseUrl `https://adam-noble-01.github.io/ValeCodebase/WebApps` |
| E4 | Save step contract | `ProjectData__.js:291-307, 868-895` | `RegisterSaveStep` before/payload/after | none | ProjectData 1.6.0 |
| F1 | Publishing local | `Publish__Transport__.js:55-190` | `/api/truevision/published/{file,list,archive,prune}` | none | NEW blueprint `/api/valevision/published/*` (S08); constant seam `Na__LePubNet__API` |
| F2 | Publishing R2 | `Publish__Transport__.js:202-256` -> `ApiClient__.js:1001-1172` | `PUT /r2/upload` (immutable / 60 s cache), `/r2/list`, `/r2/delete` per document; archive folder refused | none | facade `Published*` over NEW files routes (F-PUB family; delete scoped to one document server-side) |
| F3 | Published reader | `52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` | `ResolveAssetUrl` (CDN first on web, repo first on localhost) | none | VV `ResolveAssetUrl` localhost fallback = Flask copy (F06) |
| F4 | Share links manifest | `Share__Manifest__.js:402-431` | through Publish Transport (local first, R2 when asked) | none | as F1/F2; VV share links keep `?project=<code>` |
| G1 | User spelling dictionary | `SpellCheck__Dictionary__.js:97-122, 355-466` | `/api/health` probe, `GET|POST /api/truevision/user-config/spellings`; static `50__TrueVision__UserConfig/TrueVision__UserSpellings__.json` | none | NEW blueprint `/api/valevision/user-config/spellings`; `VV/50__ValeVision__UserConfig/` (S06a/b) |
| H1 | Custom scrapbook | `ScrapbookCustom__Transport__.js` | `/api/truevision/scrapbook...` | `/api/valevision/scrapbook...` via `Server__ValeVisionScrapbook__Api__.py` | parity - keep |
| I1 | Hatch library | `HatchPatterns__.js:165` | static | none | static folder `VV/52__LayoutEditor__HatchPatternLibrary` (S05b), no transport |
| J1 | Register / PDF exports | `Register__Pdf__.js` | client-side download; logo static | n/a | no transport |
| K1 | Sheets draft | `AutoSave__.js:174, 251-266` | `Na__LayoutEditor__Draft__<code>` `{savedAt, sheets, base}` | same key, no `base` | AutoSave 1.5.0 |
| K2 | Register draft | `Register__Data__.js:112` | `Na__DrawingRegister__Draft__<code>` | none | with register |
| L1 | Project QR resolver | `ProjectQr__Symbol__.js:103, 237-262` | NA `q/index.json` | n/a | NA-only; VV share link (S07a) |
| M1 | Config JSONs (about 40) | `*ConfigState*`, `*__Config__.json` | static | static | no transport |

### b.4 The VV transport adapter (facade) - specification

**Principle.** VV writes its own two modules at TV's paths with TV's export names and signatures, implemented over VV's worker, Flask and
R2 layout. Nothing of TV's transport is copied. TV modules then import them unchanged. Precedent in TV itself:
`R2AssetUpload__.js:14-19` ("keeping the name and signature means the projection pipeline and the Layout Editor port between the two trees
without an edit") and DIV-1 (`RenderPreset` "presents the same interface").

**Files (new in VV)**

- `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` - namespace `Na__CfApi`, header "VALEVISION3D - CLOUDFLARE
  INTEGRATION - R2 API CLIENT", PORT NOTE: "Ported from: TrueVision3D 80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js 1.5.0
  (interface only); Parity: diverged (identical export names and signatures, different transport); Divergences: whitecardopedia-editor-api with
  X-Editor-Api-Key from Flask /api/editor-config; keys VaApps/Projects/{folderId}/...; Admin and PlanVision locations answer null;
  Initialize is async and takes no URL." The folder `80__CloudflareIntegration` also aligns VV's module tree with TV's.
- `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` - namespace `Na__LocalMirror`, same PORT NOTE pattern.
- Additions to `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` (F06).

**Module state and initialisation**

- `Na__CfApi__Initialize()` (async; VV signature): on localhost `await Na__AppUtils__InitMasterIndex()`, `await Na__AppUtils__R2FetchWorkerConfig()`
  (reuse the existing memoised fetch, `R2SaveProjectJson__.js:85-117`), probe `GET {base}/health` once for `{ version, routes }` (b.5 W0),
  compute and cache `folderId`. **[Corrected by verifier]** The folderId comes ONLY from the URL token through the master index:
  `?project=` already year-prefixed (`2026/3047__Doous`, which is how Whitecardopedia opens VV), else a `Na__AppUtils__LookupIndexEntry` hit.
  NEVER from `GetLoadedProjectData().folderId`: that field is missing in 10 and WRONG in 54 of the 155 local project.json files
  (e.g. `2025/43822__Napthine` stores `43822__Napthine`, `2025/59494__Weeks` stores `2025/WK-3007__Weeks`; census 01-Oct-2026, S12-V02), so
  preferring it would write a third of projects to a non-existent R2 prefix. Nor the `NormalizeProjectFolderId` legacy guess
  `2026/<code>` (ProjectLoader.js:350) when the index has no entry: then `IsConfigured()` is false and writes are refused. Resolves
  `{ configured, routes }`; never throws. Off localhost resolves `{ configured:false }` and every write reports "Worker not configured".
- `Na__CfApi__IsConfigured()` stays synchronous: `Boolean(config && folderId)`. VV's LoadingSequence awaits `Initialize` before it dispatches the
  drawings block, so no TV module asks before the answer exists. Folder names may contain spaces (3 projects: `2025/FN-62104__Fenner Scheme-01..03`),
  so every URL is built per encoded segment.
- App root for repository URLs: `const Na__CfApi__AppRootUrl = new URL('../../', import.meta.url)` (the ValeVision3D folder);
  `repoUrl(rel) = new URL('../Whitecardopedia/Projects/' + folderId + '/' + rel, Na__CfApi__AppRootUrl).href` (encode segments). Correct on
  Flask (`/Whitecardopedia/...` proxy route, real 404s) and on GitHub Pages (`/ValeCodebase/WebApps/Whitecardopedia/...`).
- CDN base from `Na__AppConfig__Main.json ProjectData__AssetUrls__R2BaseUrl` (`https://cdn.noble-architecture.com/VaApps/Projects`).

**Export table - `Na__CfApi__*` (all 33 TV exports; "used" = imported by a TV module)**

| TV export (signature) | Used by (TV) | VV implementation |
|---|---|---|
| `Initialize(workerBaseUrl)` | `TV/index.html:950` | async `Initialize()` as above, called from VV LoadingSequence |
| `IsConfigured()` | ProjectData, SpecData Document/Transport, Statement Transport/Publish, SheetImages Publish, Publish Transport, R2AssetUpload, LoadingSequence | config and folderId known |
| `GetProjectContext()` -> `{projectFolder, yearCode, projectCode}` | dev controls (11, 70) | `{ projectFolder:'3047__Doous', yearCode:'2026', projectCode:'3047', folderId:'2026/3047__Doous' }` |
| `SetLoadedProjectData(d)` / `GetLoadedProjectData()` | LoadingSequence; SheetModel__Sheets, SitePlan Store, Register Data/Pdf, Panel ScrapbookParametric, dev controls | in-memory; `MergeAndSaveKeys` keeps it current |
| `BuildContentCdnUrl(folder, year, rel)` | PresentationMode SceneData | `${R2Base}/${year}/${folder}/${rel}` |
| `ReadProjectData()` -> `{ok, data, missing}` | LoadingSequence, Register Data | W0 capability `project` ? NEW W `GET /projects/{folderId}/project` : CDN `${R2Base}/${folderId}/project.json?t=${Date.now()}` `cache:'no-store'` |
| `WriteProjectData(doc)` | (none outside) | existing W `POST /projects/{folderId}` (needs `projectCode`; upserts index; bumps manifest) |
| `MergeAndSaveKeys(partial)` (queued) | ProjectData, Register Data, dev controls | NEW W `POST /projects/{folderId}/merge-keys {set, drawingsBase?, bumpBuild:false}`; fallback (route missing, or 409 `missing`): base = localhost ? fresh F `GET /api/projects/<folderId>` : deep clone of loaded data; `WriteProjectData({...base, ...partial})` |
| `DeleteProjectKeys(names)` | dev controls | merge-keys `{remove:names}`; same fallback |
| `WriteThumbnailWebp(sceneId, blob)` -> `{ok, relUrl}` | Thumbnail Renderer | existing W `POST /projects/{folderId}/assets` (`PresentationMode/Thumbnails/<id>.webp`) |
| `WriteProjectAsset(rel, payload, type)` -> `{ok, relUrl, publicUrl}` | R2AssetUpload | existing W `/assets` (same three-root guard, `ProjectAsset__.js:51`); NEW files/upload for blobs over a threshold once available |
| `ProjectFileLocation(name)` -> `{key, cdnUrl, repoUrl}` or null | SpecData Transport, Lockstep, Statement Transport, Register Data | allow-list `['ValeVision__DrawingNotes__.json','ValeVision__StatementDocs__.json']` |
| `ReadProjectFile(name)` -> `{ok, data, missing}` | SpecData Transport, Statement Transport | notes: existing W `GET /drawing-notes`; other names: NEW W `POST /files/read` |
| `WriteProjectFile(name, doc)` -> `{ok, error}` (R2 only) | SpecData Transport, Statement Transport | NEW W `POST /files/write` (no bump); before the deploy, notes only via existing W `POST /drawing-notes` (bumps) |
| `StatementFileLocation(path)` -> `{key, cdnUrl, repoUrl, path}` or null | Statement Transport, Publish, Publish Images | TV's segment / suffix / depth rules verbatim (`ApiClient__.js:532-535, 651-674`); root `10__StatementDocs/` under the project folder |
| `ReadStatementFile(path)` -> `{ok, text, missing}` | Statement Transport | NEW W `POST /files/read` |
| `WriteStatementFile(path, payload, type)` -> `{ok, publicUrl, key, path}` | Statement Transport, Publish, Publish Images | text -> `/files/write`; Blob -> `/files/upload` |
| `AdminFileLocation(name)` / `PlansFileLocation(name)` | ProjectRecord (TV) | always `null` (VV has no admin or PlanVision files); exported for name parity |
| `SHEET_IMAGES_DIR`, `SHEET_IMAGES_ARCHIVE` | SheetImages Publish | `'05__Layout__DrawingDocs__Images'` (D-S12-03), `'00__Archive'` |
| `SheetImageLocation(folder, file)` -> `{key, cdnUrl, repoUrl, relative, folder, file}` | SheetImages Source | TV regexes (`ApiClient__.js:768-769`); `relative = 'Whitecardopedia/Projects/' + folderId + '/' + DIR + '/' + folder + '/' + file` |
| `SheetImagesPrefix()` | (internal) | relative prefix for list |
| `ListSheetImages()` -> `{ok, objects:[{key, folder, file, size, etag}]}` | SheetImages Publish | NEW W `POST /files/list {prefix:'05__.../'}` paginated |
| `UploadSheetImage(folder, file, blob)` -> `{ok, key}` | SheetImages Publish | NEW W `POST /files/upload?path=&cacheControl=public, max-age=31536000, immutable` raw body |
| `CopySheetImage(from, to, file)` -> `{ok, key, missing?}` | SheetImages Publish | NEW W `POST /files/copy`; fallback CDN read + upload (TV's own fallback, `ApiClient__.js:936-943`) |
| `DeleteSheetImage(folder, file)` | SheetImages Publish | NEW W `POST /files/delete` (managed names only) |
| `PublishedLocation(rel)`, `PublishedPrefix(docId)` | (internal) | TV rules verbatim (`ApiClient__.js:1001-1055`), archive refused |
| `ListPublished(docId)` -> `{ok, objects:[{key, path, size}]}` | Publish Transport | NEW W `/files/list` |
| `UploadPublished(rel, blob)` | Publish Transport | NEW W `/files/upload` with TV's two cache policies (`:1006-1007`) |
| `DeletePublished(rel)` | Publish Transport | NEW W `/files/delete` (scoped to one document server-side) |

Failure contract: identical to TV - every function resolves `{ ok:false, error }`, never throws; `'Worker not configured'` / `'No project-folder in URL'`
strings may be reworded for VV ("the local Whitecardopedia server is not running"), but keep the shapes.

**Export table - `Na__LocalMirror__*` (all 8, all used)**

| TV export | Used by (TV) | VV implementation (Flask, localhost only, never throws) |
|---|---|---|
| `MergeKeys(partial, {drawingsBase})` (queued) | ProjectData, Register Data, Register Transactions | fresh F `GET /api/projects/<folderId>` (`no-store`) -> `{...disk, ...partial}` -> F `POST /api/projects/<folderId>` with `X-ValeVision-Drawings-Base` when `drawingsBase !== undefined` (`'none'` for null); 409 -> `{conflict:true, drawings}`; 200 -> `{ok, drawings, backup}` |
| `DrawingsFingerprint()` -> `{ok, skipped, unsupported, error, drawings:{savedIso, digest}}` | ProjectData | NEW F `GET /api/projects/<folderId>/drawings-fingerprint`; a non-JSON 200 or 404/405 without JSON -> `unsupported`. **[Verifier]** On today's Flask this URL does NOT reach the HTML catch-all: `@app.route('/api/projects/<path:folder_id>')` (server.py:408) captures `2026/3047__Doous/drawings-fingerprint` and answers a JSON 404 `{error:'Project not found: ...'}`, which TV's mirror code reads as "route exists, project missing" (TV LocalProjectMirror__.js:289-291). The VV facade must treat that answer as `unsupported` too (saves then stay unjudged, as TV intends) |
| `WriteSiblingFile(name, doc)` | SpecData Lockstep, Statement Transport | NEW F `POST /api/projects/<folderId>/files/<name>`; until it exists, the notes file through the existing `/drawing-notes` POST |
| `StatementTree()`, `WriteStatementFile(path, text)`, `MakeStatementFolder(path)`, `MoveStatement(from, to)`, `DeleteStatement(path)` | Statement Transport, Publish | NEW F blueprint `/api/valevision/statements/{tree,file,folder,move,delete}?project-folder=&year=` (S07b) |

**ProjectLoader additions (VV, F06)** - additive exports, no behaviour change for existing callers:

- `Na__AppUtils__GetProjectFolderFromUrl()`: `?project-folder=` when present (TV style), else the folder segment of `NormalizeProjectFolderId(?project=)`
  (`'3047__Doous'`), else null.
- `Na__AppUtils__GetYearFromUrl()`: `?year=` when present, else the 4-digit year of the resolved folderId (`'2026'`), else **null**
  ([Corrected by verifier] not `'2026'`: a guessed year sends writes to a wrong prefix; TV's `'26'` default is a TV-layout convenience). Both
  helpers resolve through the master index (`LookupIndexEntry`), never the legacy `2026/<code>` fallback, and answer null until
  `InitMasterIndex` has settled.
  (TV answers two digits, `'26'`; every TV module that builds `${year}-Projects/...` is a TV-layout module with its own seam - SitePlan Store,
  Publish meta, Share Manifest meta, ProjectQr - see (c).)
- `Na__AppUtils__ResolveAssetUrl(folderId, rel)`: on localhost return `fallback` = the Flask copy (`${origin}/Whitecardopedia/Projects/${folderId}/${rel}`)
  instead of GitHub Pages, matching TV's "repository copy as served to this page" (`TV ProjectLoader.js:223-236`); web unchanged.

**What then ports verbatim (with only constant seams)**

| TV unit | Seams left in VV |
|---|---|
| `LE/50/SpecData__Transport__` 1.3.0, `SpecData__Lockstep__`, `SpecData__Document__` 1.1.0 | none in code; config `LayoutEditor__Specification__FileName` = `ValeVision__DrawingNotes__.json`, no `LegacyFileName`. **[Verifier]** Lockstep also imports the Statement Writer's PURE verdict module `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (245 lines, no imports; TV Lockstep__.js:120-127), which VV lacks, and the v2.163.0 lockstep touches SpecData, State, Draft, Editing, SpecEditor__Bar, SpecLockstep (the asking UI) and ModeController. That port is owned by WP-S06b-01 (which already carries the pure leaf; WP-S07b-01 was refuted as its duplicate) |
| `LE/52/.../Statement__Data__Transport__` | config `IndexFileName`; none in code |
| `LE/54/SheetImages__Store__` | `ROUTE` `/api/valevision/sheet-images`, `SERVICE` (see D-S12-07) |
| `LE/54/SheetImages__Source__`, `__Publish__` | none (config `Sources__PagesBaseUrl`) |
| `LE/65/Publish__Transport__` | `Na__LePubNet__API` `/api/valevision/published`; restart wording |
| `LE/56/ScrapbookCustom__Transport__` | already adapted (keep VV's probe or adopt `/api/health`, D-S12-07) |
| `55/SpellCheck__Dictionary__` | `SERVER_SERVICE`, config `Dictionary__ApiPath` / `DictionaryFile`, key prefix `TrueVision__UserSpellings__` (S06 decision) |
| `40/ProjectData__`, `LE/07/AutoSave__`, `Assets__`, `50/Persistence__` | VV-only re-applies listed in (c). **[Verifier]** Assets and Persistence are NOT verbatim: TV gates upload/bake on `Na__DevGate__IsAuthoringEnabled` (TD01), VV on `Na__AppUtils__IsRunningOnLocalhost`, and VV's DevGate PORT NOTE says the Flask-mirror data path must keep the hostname test (VV D24). Keep VV's gate as a seam; also the stored linework `Description` text names "TrueVision drawing" (TV Persistence) |

### b.5 VV worker API to build (`whitecardopedia-editor-api` 1.6.0)

All routes behind the existing `X-Editor-Api-Key` check (`index.js:147-153`), CORS via `na_build_cors_headers` (methods `GET, POST, OPTIONS`,
headers `Content-Type, X-Editor-Api-Key`, `CloudflareHelper__Cors__.js:72-73`). Use GET/POST only (no `PUT`) and pass bases in JSON bodies so
CORS needs no change. Match every NEW route BEFORE the generic `^/api/editor/projects/(.+)$` save route (`index.js:211-219`).

| # | Method + path | Request | Guards | R2 effect | Response | Manifest bump |
|---|---|---|---|---|---|---|
| W0 | `GET /api/editor/health` (extend) | - | none (unauthenticated today) | - | `{ ok, worker, version:'1.6.0', routes:['save','assets','drawing-notes','project','merge-keys','files'] }` | no |
| W1 | `GET /api/editor/projects/{folderId}/project` | - | key; folderId pattern | read `VaApps/Projects/{folderId}/project.json` | 200 document, `Cache-Control: no-store`; 404 `{missing:true}` | no |
| W2 | `POST /api/editor/projects/{folderId}/merge-keys` | `{ set:{k:v}, remove:[k], drawingsBase?:'iso:<stamp>'|'none', bumpBuild?:false }` | key; folderId; every key in `set`/`remove` must match the editor-owned families (D-S12-04 SSOT, e.g. `^(LayoutEditor__|PresentationMode__|CrossSection__|Navmode__|Camera__|OrbitHelperCube__|FogPlane__|RenderEngine__|VideoStudio__|GridLine__|RenderEffect__)`); project.json must exist (else 409 `{missing:true}`) | read-merge-write project.json (`no-cache, max-age=0`); when `drawingsBase` given and differs from `'iso:' + current.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__SavedIso` (or `'none'`) -> 409 `{conflict:true, drawings:{savedIso}}` | `{ success, drawings:{savedIso} }` | only when `bumpBuild:true` |
| W3 | `POST .../{folderId}/files/read` | `{ path }` | family allow-list (below) | get | `{ ok, data|text, encoding?, contentType, lastModified }`; 404 `{missing:true}` | no |
| W4 | `POST .../{folderId}/files/write` | `{ path, data, encoding?:'base64', contentType?, cacheControl? }` | families; size cap; never `project.json` | put | `{ ok, key, size }` | no |
| W5 | `POST .../{folderId}/files/upload?path=&cacheControl=` | raw body, `Content-Type` | families; size cap | streamed put (as TV `/r2/upload`, `CloudflareHandler__R2__.js:297-339`) | `{ ok, key, size, etag }` | no |
| W6 | `POST .../{folderId}/files/list` | `{ prefix, cursor?, limit? }` | prefix must be a family root (`05__.../`, `06__.../[doc/]`, `10__StatementDocs/[...]`) | list | `{ ok, objects:[{path,size,etag,uploaded}], truncated, cursor }` (paths relative to the project folder) | no |
| W7 | `POST .../{folderId}/files/copy` | `{ from, to, cacheControl? }` | both paths in the SAME family | get+put, metadata kept | `{ ok, key }`; 404 `{missing:true}` | no |
| W8 | `POST .../{folderId}/files/delete` | `{ path }` or `{ paths:[...] }` (<=1000) | F-IMG: managed names only (`__[0-9a-f]{10}.(webp|jpg|png)$`); F-PUB: every path under ONE document folder (S08's server-side scope); F-SIB / F-STMT / F-THUMB / F-ASSET: refused | delete | `{ ok, deleted }` | no |

**Path families (server-side allow-list; paths relative to `VaApps/Projects/{folderId}/`; no leading `/`, no `\`, no `.`/`..` segment):**

| Id | Pattern | Ops |
|---|---|---|
| F-SIB | `^(ValeVision__DrawingNotes__|ValeVision__StatementDocs__)\.json$` | read, write |
| F-THUMB | `^PresentationMode/Thumbnails/[A-Za-z0-9_.-]+\.(webp|png)$` | read, write, upload |
| F-ASSET | `^LayoutEditor/(Linework|Snapshots)/[A-Za-z0-9_.-]+\.(webp|png|json)$` | read, write, upload |
| F-IMG | `^05__Layout__DrawingDocs__Images/` + folder `^[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$` (not `00__Archive`) + file `^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}\.(webp|jpe?g|png)$` | all |
| F-PUB | `^06__Layout__PublishedDocuments/` + 1-6 segments `^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$`, ext `json|svg|webp|png|pdf|md`, first segment never `00__Archive__Revisions` | all |
| F-STMT | `^10__StatementDocs/` + 1-5 segments `^[A-Za-z0-9_\-. &()\[\]]{1,140}$`, ext `md|html|json|txt|jpe?g|png|webp|gif|tiff?|bmp|svg` | read, write, upload, list |

**Cross-cutting worker changes**

- Validate `folderId` once in `index.js` for every `/projects/` route with the rename handler's pattern `^\d{4}/[^<>:"/\\|?*\x00-\x1F]+$`
  (`ProjectRename__.js:84`; [verifier] that handler applies it only to the NEW folderId from the body, :225 - no handler checks the URL
  folderId today). The save, assets and drawing-notes handlers accept any decoded string. All 152 master-index folderIds and all 155 local
  folders pass this pattern (verifier census); S08's stricter W1 pattern `^\d{4}/[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$` would REFUSE the three
  `2025/FN-62104__Fenner Scheme-0n` projects (spaces), so use this one. **[Corrected by verifier]** The validation protects only workers
  that carry it (1.6.0+) against FUTURE unknown suffixes; on a worker deployed before 1.6.0 there is no validation, an unknown POST such as
  `.../2026/X/files/write` still falls into the generic save route and is refused only because the body lacks `projectCode`. Against an old
  worker the protection is the facade's W0 capability check, so the facade must never call a NEW route the health answer does not list.
- Both workers bind the SAME bucket `noble-architecture-cdn` (TV `wrangler.toml` `[[r2_buckets]]`, VV `wrangler.jsonc` `r2_buckets`): TV under
  `NaProjectPortal/`, VV under `VaApps/`. Every new VV handler hard-prefixes `VaApps/Projects/{folderId}/` as the existing ones do, so a VV path
  bug can never reach TV content. R2 keys are literal strings (no `..` resolution on R2); the Flask mirrors must still realpath-fence.
- Feature detection by W0 `routes` rather than error sniffing (TV sniffs "Unknown R2 operation", `ApiClient__.js:882-886`).
- Cache policy: sibling docs and thumbnails `no-cache, max-age=0` (VV convention); content-hashed names `public, max-age=31536000, immutable`;
  mutable published files `public, max-age=60, must-revalidate` (TV `ApiClient__.js:1006-1007`).
- Size caps: keep the asset handler's 25 MB decoded cap for base64 writes (`ProjectAsset__.js:52`); raw uploads stream - the Cloudflare request
  body limit applies (not verified for this account).
- Tidy: `na_write_build_manifest` exists twice (`ProjectEditor__.js:160-171` and `CloudflareHelper__BuildManifest__.js:70-81`); new handlers
  import the helper.
- New files: `src/handlers/CloudflareHandler__ProjectFiles__.js`, `src/handlers/CloudflareHandler__ProjectMerge__.js`,
  `src/CloudflareHelper__PathGuards__.js`; edits: `src/index.js` (routing, folderId validation, header route list, dev log 1.6.0).
- Deploy: Adam runs `WCP/CloudflareWorker/Deploy__Worker.bat` (`npx wrangler deploy`, account `fb32e89aeb7dce82f8391f6496ec8b34`, the same
  account as TV's worker). No new secrets (`EDITOR_API_KEY`, `ALLOWED_ORIGIN` already set per `.env.template`). Local proof first with
  `Dev__Worker.bat` (wrangler dev on 8787) and `EDITOR_WORKER_URL=http://127.0.0.1:8787/api/editor` in `Token__CloudflareAPI.env`.

### b.6 Flask mirror to build (`WCP/server.py` + blueprints)

| # | Route | Behaviour | TV source |
|---|---|---|---|
| L1 | `GET /api/health` | `{status:'ok', service:'whitecardopedia-local-dev', app:'ValeVision3D', port:8000}`; keep `/api/check-localhost` | `LocalServer__Main__.py:637-645` |
| L2 | `GET|POST /api/<path:rest>` (registered so it ranks above the static catch-all) | 404 JSON `{error:'no such API route'}` - ends the "unknown GET answers 200 with index.html" trap (`server.py:956-977`). **[Verifier]** The trap applies to GETs OUTSIDE `/api/projects/` (`/api/health`, and the `/api/valevision/` sheet-images, published, statements and user-config routes); an unknown POST there gets werkzeug's HTML 405. Under `/api/projects/<path:folder_id>` a missing sub-route is captured by `get_project` (JSON 404 "Project not found") or `save_project` (400 "Missing required field" / 404), and L2 cannot change that (the more specific rule wins), so clients must read those answers as "route missing" too | - |
| L3 | `POST /api/projects/<path:folder_id>` (edit) | if `X-ValeVision-Drawings-Base` present: compare with `_drawings_fingerprint(disk)`; mismatch -> 409 `{error, conflict:true, drawings}`; else back up the file first, write atomically (temp + `os.replace` with retries), answer `{success, drawings, backup}`. Keep `validate_project_json` (projectName, projectCode) | `:673-704`, `:401-418`, `:429-459`, `write_text_atomic` in `TrueVisionUserConfig__Api__.py:220` |
| L4 | `GET /api/projects/<path:folder_id>/drawings-fingerprint` | `{status, drawings:{savedIso, digest:'sha1:...'}}` of `LayoutEditor__DrawingsData` canonical JSON (sorted keys, no spaces), `no-store` | `:707-725` |
| L5 | `GET /api/projects/<path:folder_id>/backups` | backups of project.json and sibling files, newest first | `:728-751` |
| L6 | `GET|POST /api/projects/<path:folder_id>/files/<name>` | allow-list `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`; GET missing -> 404 `{missing:true}`, sends `Last-Modified`, `no-store`; POST backs up, writes atomically. Keep `/drawing-notes` as an alias (the current client uses it) | `:754-799` |
| L7 | blueprint `Server__ValeVisionSheetImages__Api__.py` -> `/api/valevision/sheet-images/{list,upload,reconcile}` | port of TV 478-line API: root `Whitecardopedia/Projects/{yyyy}/{folder}/05__Layout__DrawingDocs__Images/`, `00__Archive` local only | `ProjectVision__TrueVisionSheetImages__Api__.py:76-93, 260-362` |
| L8 | blueprint `Server__ValeVisionPublished__Api__.py` -> `/api/valevision/published/{file,list,archive,prune}` | port of TV 448-line API; `00__Archive__Revisions` local only | `ProjectVision__TrueVisionPublished__Api__.py:79-94, 253-408` |
| L9 | blueprint `Server__ValeVisionStatements__Api__.py` -> `/api/valevision/statements/{tree,file,image,folder,move,delete}` | port of TV 451-line API (delete to quarantine per S07b D-S07b-08) | `ProjectVision__TrueVisionStatements__Api__.py:68-82, 177-412` |
| L10 | blueprint `Server__ValeVisionUserConfig__Api__.py` -> `/api/valevision/user-config/spellings` | port of TV 418-line API; folder `VV/50__ValeVision__UserConfig/` | `ProjectVision__TrueVisionUserConfig__Api__.py:86-104, 348-368` |
| L11 | shared `Server__ValeVisionShared__Lib__.py` | `write_text_atomic`/`write_bytes_atomic` (retry delays `(0.05,0.1,0.2,0.4,0.8)`), `backup_before_overwrite` (root `%LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups` or `VALEVISION_PROJECT_BACKUP_ROOT`, keep 30), `resolve_project_dir(project_folder, year | folder_id)` with `os.path.realpath` containment under `Whitecardopedia/Projects` (also fixes `get_project_path`'s missing `..` guard, `server.py:128-157`), `drawings_fingerprint`, `json_404` | `LocalServer__Main__.py:110-131, 377-459` |

All blueprints take TV's query names `project-folder` and `year` (VV year is 4 digits: `YEAR_PATTERN = ^\d{4}$`) and also accept
`folder-id=YYYY/Folder`. Flask runs `debug=True` (`server.py:1007-1011`), so new routes load on save; TV's "restart the server" texts are harmless.

### b.7 Schema compatibility

**Top-level project document keys** (census: 155 VV `project.json`, 8 TV project data files)

| Key | Written by | TV | VV | Note |
|---|---|---|---|---|
| `LayoutEditor__DrawingsData` | editor (ProjectData) | 3/8 files | 4/155 | single owner, written whole |
| `PresentationMode__SavedCameraScenes` | editor (scenes) and VV sync (thumbnail repoint) | 3/8 | 9/155 | VV pipeline rewrites IMG-slot thumbnails in it (`SyncSingleProject...py:383-431`) - see b.9 |
| `CrossSection__SceneData` | editor (section provider) | 0/8 | 5/155 | TD06: identical BLOCK keys (`__Description`, `__Version:1`, `__Scenes`); TV dispatches `{block}`, VV `{sceneData}` (DIV-2, keep). **[Verifier] Per-scene entries are NOT compatible** (S12-V01): VV `CrossSection__SceneBinding__{SceneId,UpdatedIso,GizmosVisible,SliceDepthM,FillColor,LineColor,LineWidthPx,Sections[CrossSection__Section__*]}`; TV `{gizmosVisible, sliceDepthM, fillColor, lineColor, lineWidthPx, sections[{name,mode,normalXyz,positionMm,enabled,gizmoVisible}], sceneId}`. VV keeps its own 41 writer/reader; never port TV 41 SceneData/Serialize into VV |
| `LayoutEditor__DrawingRegister` | editor (register) | 0/8 local files | - | new when the register is ported; `DrawingRegister__Document__*`, `__Numbering`, `__Revisions` (`Register__Data__.js:126-144`). [Verifier] TV writes it to R2 (`MergeAndSaveKeys`) AND disk (`Na__LocalMirror__MergeKeys`, Register__Data__.js:280, :284); none of the 8 local TV files carries one yet |
| `Camera__DefaultPosition`, `OrbitHelperCube__Position`, `Navmode__EnabledModes`, `Navmode__OrbitMaxDistanceMm` | dev menus | yes | yes | |
| `RenderEffect__AssetCullDistanceMm`, `Navmode__FovOverrides` | TV dev menus | yes | - | TV-only features |
| `FogPlane__Config`, `RenderEngine__Config`, `CrossSection__Config`, `VideoStudio__Config`, `GridLine__Grid__Offset__Config` | VV dev menus | - | yes | VV-only |
| `SitePlan__DataStores` / `SitePlan__DataStore` | TV build | 3/8 | - | S04a |
| `projectCode`, `projectName` | pipelines | yes | yes | TV code reads `Project__Name` (absent in both) - F34 |
| `images`, `allImages`, `displayImages`, `thumbnailImage`, `valeVision_ModelUrls`, `ValeVison3D__SketchUpCameraData`, `folderId`, `basePath`, ... | VV pipelines | - | yes | never written by the editor; W2 refuses them |

**Drawings block sub-keys** (code census): identical except TV `LayoutEditor__DrawingsData__SavedIso` (v2.146.0) and VV
`LayoutEditor__DrawingsData__LayoutModeEnabled` (VV ProjectData 1.1.0; keep, re-apply in the port). Record-level differences
(sheet, viewport, shape, dimension fields) are S03b's; the data census shows 94 TV-only key paths, none conflicting. VV-only record keys seen:
`Elevation__LineworkAsset`, `Elevation__SeededFrom`, `Elevation__ExcludeCategoryTokens` (the first is the shared Persistence slot - TV also
writes it, the TV data set simply has none).

**Per-scene lighting**: `PresentationMode__Scene__Lighting` on a scene record with `Scene__Lighting__*` (`PerSceneLighting__.js:98-101`),
header-only drift - identical, rides in the drawings save payload.

**Migrations and shims**

- TV ProjectData's legacy migration (drawings nested in the presentation block) is inert on VV data (`HasLegacyDrawings` false). Keep the
  region verbatim for a minimal diff, or drop it as a documented divergence (S02a's call); no VV migration is needed.
- `SavedIso` absent on every existing VV block: TV's `LearnBase` treats that as `null`/fingerprint, and the first VV save stamps it.
- AutoSave 1.5.0 asks about any draft written before drafts recorded their `base`: every VV browser draft existing at upgrade time triggers
  the question once (Apply / Discard / Decide Later). Note it in the hand-over.
- Spec file: no `LegacyFileName` for VV.
- Statement index, sheet image records, published manifests use relative paths, but TV's statement index stores the published HTML's absolute
  CDN `url` (`Statement__Publish__.js:302`); VV's rename route rewrites only model URLs (`ProjectRename__.js:132-150`) - F33.

**Browser storage** (per origin; VV and TV never share an origin: VV live `adam-noble-01.github.io`, localhost 8000; TV `www.noble-architecture.com`, 8090)

| Key | TV | VV | Recommendation |
|---|---|---|---|
| `Na__LayoutEditor__Draft__<code>` | `{savedAt, sheets, base}` | `{savedAt, sheets}` | keep name; 1.5.0 format |
| `Na__LayoutEditor__SpecDraft__<code>` / `...SpecDiscarded__<code>` | both | first only | keep names |
| `Na__DrawingRegister__Draft__<code>` | yes | - | keep name with register |
| `Na__TrueVision__StatementDraft__`, `...StatementDiscarded__`, `...StatementView__`, **`...StatementLast__`, `...StatementMono__`** ([verifier] the last two in `Statement__Page__.js`, missed by the survey) | yes | - | rename `Na__ValeVision__...` (brand-bearing, as VV did for `ValeVision3D__AuthoringUnlocked`) |
| `na-layouteditor-osnap` | `'1'`/`'0'` (ObjectSnap__State) | `'1'`/`'0'` (VV-only 30/Snapping__) | [verifier] same key, same format - no migration |
| IndexedDB `TrueVision3D__ProjectedLinework` | yes | `ValeVision3D__ProjectedLinework` | keep VV name (existing seam) |
| UI prefs (`na-layouteditor-*`, `Na__LayoutEditor__RasterLevel`, `...VectorLevel`, `na-colourpalette-active`, ...) | yes | partial | keep names verbatim |

**VV equivalent of `Na__DevSavedKeys`** (D-S12-04): one SSOT list in `VVM/02__AppData/Na__AppConfig__Main.json`, e.g.
`ProjectData__EditorOwnedKeys`: `PresentationMode__SavedCameraScenes`, `LayoutEditor__DrawingsData`, `LayoutEditor__DrawingRegister`,
`CrossSection__SceneData`, `CrossSection__Config`, `Navmode__EnabledModes`, `Navmode__OrbitMaxDistanceMm`, `Camera__DefaultPosition`,
`OrbitHelperCube__Position`, `FogPlane__Config`, `RenderEngine__Config`, `VideoStudio__Config`, `GridLine__Grid__Offset__Config`.
Read by the VV LoadingSequence (overlay), by the sync pipeline (preserve from R2; it can read the JSON from disk), and mirrored as prefix
families in the worker's W2 guard. [Verifier] Each of the nine VV savers was checked against this list (SaveCameraSettings writes Camera__ and
OrbitHelperCube__; ScenePersistence writes PresentationMode__SavedCameraScenes and CrossSection__SceneData; one saver each for the rest).
SaveCameraSettings also DELETES the legacy `valeVision_Camera__DefaultPosition` (35/155 files; still read as a fallback by VV LoadingSequence.js:683):
W2's `remove` must allow that one legacy key, or a saver moved to `DeleteProjectKeys` (WP-S12-16 option) is refused.

### b.8 The save guards (TV v2.145.0 and v2.146.0) for VV

| Layer | TV implementation | VV need | VV build |
|---|---|---|---|
| Late start (v2.145) | `Na__DrawData__IsLoaded`; SheetModel CHANGED-only + late announce; AutoSave key waits | VV solved the late start in its loader (`Loader__.js:299-309, 339`) but the SheetModel still hears LOADED and CHANGED (`SheetModel__.js:506-507`) | ProjectData 1.5.0 `IsLoaded`, AutoSave 1.4.0 key wait; SheetModel 1.35.0 is S03b |
| 1 - draft judged | AutoSave 1.5.0 `JudgeDraft`/`AskAboutDraft` (`:314, :369`), Modal 1.2.0 third button | same hazard (two windows, agent edits, git checkouts) | AutoSave 1.5.0 + `21/Na__PresentationMode__DevMenu__Modal__` 1.2.0 (VV 1.0.0) |
| 2 - save judged | `CheckBase` before R2 (`ProjectData__.js:531-539`); `X-TrueVision-Drawings-Base` on the local write; 409 | same | ProjectData 1.6.0 over the facade; Flask L3/L4; header `X-ValeVision-Drawings-Base` (facade-internal) |
| 2b - R2 judged | not done ("The Worker would need the same base header", v2.146.0) | VV writes R2 FIRST too | optional W2 `drawingsBase` (VV-first; back-port candidate) - D-S12-05 |
| 3 - copies kept | backups outside the repo, 30 per file | VV repo is also public (GitHub Pages) | L11 backup root outside `ValeCodebase` |

### b.9 Pipeline and sync interactions (outside the app, inside VV's storage)

1. **Recursive image purge (critical).** `na_collect_local_image_names` keeps TOP-LEVEL local image names only (`:645-656`);
   `na_purge_stale_r2_images` lists every key under `VaApps/Projects/{yyyy}/{folder}/` without a delimiter and deletes any `.png/.jpg/.jpeg/.webp`
   whose basename is not in that set (`:659-680`), in `na_sync_all` (`:925-926`) and `na_sync_images` (`:958-959`). Run by the SketchUp
   ValeVision Cloud Sync plugin (`ConfigLoader__.rb:66`). Locally, `2026/3047__Doous` holds 18 `LayoutEditor/Snapshots/*.webp` and 25
   `PresentationMode/Thumbnails/*` files exist across projects; their R2 copies are deletion candidates on each such sync (not verified on R2;
   GitHub Pages fallbacks may hide it). Sheet images, published tiers and statement pictures would be deleted the same way. Also the listing is
   not paginated (first 1,000 keys). Fix: only keys with no `/` after the prefix are purge candidates; paginate.
2. **Whole-file project.json upload (high).** `na_upload_project_json_to_r2` uploads the local file whole (`:715-738`; `:927`, `:936`, `:987`);
   the audit/backfill tool does the same with `force` (`AutomationUtil__AuditAndBackfillR2...py:188-192`). Fix: before upload, read R2's
   project.json, take the editor-owned keys from R2, apply the pipeline's own `PresentationMode__SavedCameraScenes` thumbnail repoint to R2's
   copy of that block, write the merged document locally AND to R2 (TV ModelSync pattern, `CloudflareR2__ModelSync__Main__.py:541-551`).
3. **Global build-manifest bump (medium-high).** Every editor save, asset upload and notes write rewrites `VaApps/Index/Na__BuildVersion__Manifest__.json`;
   the token is global (one value for all projects) and is appended to every project.json and GLB URL. New routes never bump; the merge route
   bumps only on request (D-S12-06).
4. **Rename / delete.** The rename route moves EVERY object under the old prefix (`ProjectRename__.js:242-290`) and rewrites only
   `valeVision_ModelUrls`/`valeVision_ModelUrl`/`basePath`; any absolute URL stored in drawing data breaks (F33). Delete removes everything
   (correct). The Flask mirrors of both operate on the whole local folder.
5. **Service worker.** VV IS under the shared Whitecardopedia worker in production (ledger L135-175). Its classifier sends CDN `.png`/`.svg` to the
   SHELL strategy (stale-while-revalidate, uncapped shell cache; `ServiceWorker__Logic__.js:240-250, 687-697`), so published SVG/PNG tiers and
   PNG sheet images would accumulate in the shell cache. TV added a dedicated `tv-published-` cache at v2.155.0 (F37).
6. **[Verifier] VV's own sources state the opposite of 1-2.** `VVM/42/Na__DrawView__ProjectData__.js:15-17` ("the SketchUp cloud sync
   only ever patches its own keys, so this block survives a re-sync untouched and needs no entry on any dev-owned key list"),
   `:135` (the block `Description` WRITTEN into every project.json: "The SketchUp cloud sync never writes this key."),
   `VVM/41/Na__CrossSectionView__SceneData.js:18-20` and `VVM/01/Na__AppFlow__LoadingSequence.js:719` ("survives cloud re-syncs"). By code
   reading the sync uploads the whole local project.json (`:715-738`), so these hold only while disk and R2 agree. Correct them with
   WP-S12-01 (they become true once editor keys are preserved) and do not carry the sentence into the re-applied description (WP-S12-07).

### b.10 Deploy, CORS, auth, path guards and risk register

- **Order of landing**: (1) sync-pipeline fixes; (2) Flask core (no deploy; debug reload); (3) worker 1.6.0 locally under `wrangler dev`, then
  Adam deploys; (4) facade and ProjectLoader additions (feature-detect W0, fall back to existing routes, so (4) may land before (3));
  (5) ProjectData / AutoSave ports; (6) feature transports. The worker change is backward compatible: no existing route changes behaviour except
  folderId validation (a correctly formed `YYYY/Folder` id is unaffected).
- **Who**: agents prepare and test; Adam runs `Deploy__Worker.bat` (interactive wrangler auth), and signs off the pipeline change because the
  SketchUp plugin runs it on live projects.
- **CORS**: unchanged if GET/POST only and the drawings base travels in the body. Flask `CORS(app)` (all origins) is localhost-bound.
  The worker's allow-list (`CloudflareHelper__Cors__.js:50-55`) names `noble-architecture.github.io` and `www.noble-architecture.com` but not
  the live VV origin `adam-noble-01.github.io` (`WCP/LOG__ProjectWebLinks.md`); harmless while every worker call comes from localhost, and a
  reason not to add worker reads to the live read path (use the CDN there, as TV does).
- **Auth**: every new worker route behind `X-Editor-Api-Key`; the key reaches the browser only from localhost Flask - keep. TV's worker model (no auth,
  `ENVIRONMENT = "development"` echoes any origin, `CloudflareWorker__Main__.js:154-179`, `wrangler.toml` top-level vars) must not be copied.

| Risk | Severity | Mitigation |
|---|---|---|
| R2 purge deletes subfolder images (b.9.1) | critical | WP-S12-01 before any new R2 content |
| Sync overwrites R2 editor keys from a stale local file (b.9.2) | high | WP-S12-01 |
| Phase-2 mirror failure leaves disk behind R2; next whole-doc save regresses R2 | medium | facade merge-keys; TV's "pending local + Retry Local Sync" pattern (`Register__Transactions__.js:340-380`); D-S12-04 overlay |
| Global manifest churn re-downloads GLBs | medium-high | D-S12-06 |
| Old worker misroutes new POSTs into the save route | medium | folderId validation + W0 capability detection |
| Flask unknown GET answers 200 HTML | medium | L2 |
| repoUrl built from `window.location.origin` 404s on GitHub Pages | high (correctness) | facade app-root rule (b.4) |
| `get_project_path` accepts `..` (`server.py:133-136`) | low (localhost) | L11 containment |
| Non-atomic Flask writes (`server.py:467-468, 809-811`) | medium | L11 atomic writes |
| Absolute URLs in data vs VV rename | medium | F33 |
| Large raw uploads vs Cloudflare body / CPU limits | unknown | raw streaming (W5); verify plan limits |
| VV worker `/drawing-notes` deployment state unrecorded | low | check with Adam (`GET .../api/editor/health` cannot show it today; W0 will) |
| [Verifier] Facade derives folderId from project.json `folderId` (wrong in 54/155, missing in 10) | high | master index only (b.4 correction, S12-V02) |
| [Verifier] A TV section module ported into VV reads VV's prefixed entries as "no cuts" (and vice versa) | medium | VV keeps its 41 SceneData; TV back-port D-S12-V02 (S12-V01) |
| [Verifier] Seven slices build overlapping transport packages | high (duplicate or conflicting code) | D-S12-V01 single owners |

---

## (c) Module-by-module table

State: DR = drifted, HO = header-only, TVO = tv-only, VVO = vv-only, AD = adapted (deliberate), PD = permanent divergence.

| TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently (TV devlog) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` | 1.5.0 (+ Statement region v2.95.0, Published region v2.155.0, both unlogged in its header) | `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (new) | - | TVO | the whole interface (33 names; 27 used): sibling files v2.36.0, admin v2.74.0, PlanVision v2.88.0, statements v2.95.0, sheet images v2.116.0, published v2.155.0 | build_vv_transport | VV facade, b.4 | W1-W8, ProjectLoader additions |
| `TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` | 1.2.0 | `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (new) | - | TVO | local copy v2.39.0, sibling files, statements half v2.95.0, fingerprint and base header v2.146.0 | build_vv_transport | VV facade over Flask L3-L9 | Flask core |
| `TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` | 2.0.1 | same | 1.4.0 | DR (different apps' loaders, 637 diff lines) | `GetProjectFolderFromUrl`, `GetYearFromUrl`; repository fallback in `ResolveAssetUrl`; `cache:'no-cache'` (v2.139.1; VV uses `?v=` instead) | update_wiring | additive exports (b.4); keep VV fetch path | - |
| `TVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js` | 1.0.1 | same | 1.0.0 | AD (identical signature, different transport) | failure contract: TV returns `r2Success:false`, VV throws (`R2AssetUpload__.js:195-205, 212`); no `relUrl` in VV result | port_adapted | VV keeps two-phase transport (or calls the facade); adopt TV's non-throwing contract; fix VV Thumbnail Renderer (`:236-242`) | - |
| - | - | `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` | 1.2.0 | VVO | two-phase whole-doc save for VV dev menus | keep_vv_divergence | stays for VV-only dev menus; drawing modules stop using it; optionally move the 9 VV dev savers to `Na__CfApi__MergeAndSaveKeys` as TV does | facade |
| - | - | `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | 1.0.0 | VVO | notes client used only by VV SpecData Transport 1.1.0 | retire_vv | becomes unused when SpecData Transport 1.3.0 ports over the facade; delete then | spec port (S06b) |
| `TVM/03__AppUtils/Na__AppUtils__DevGate__.js` | 1.1.0 | same | 1.1.0 | DR (brand only) | - | no_action | storage key `ValeVision3D__AuthoringUnlocked` stays | - |
| `TVM/01__AppCore/Na__AppFlow__LoadingSequence.js` (project-data region) | 1.3.1 | same | 1.7.0 | DR | `Na__DevSavedKeys` overlay (`:352-361, 738-747`), `SetLoadedProjectData` (`:925`), drawings dispatch after scenes with `sceneConfig` (`:958-968`), section dispatch always (`:976-980`) | update_wiring | add Initialize, editor-owned overlay (D-S12-04), SetLoadedProjectData; keep VV's loader and `{sceneData}` section detail (DIV-2) | facade, D-S12-04 |
| `TVM/01__AppCore/Na__AppLoader__ProjectDataLoader__.js` | (1-line placeholder) | - | - | TVO | nothing | no_action | do not port | - |
| `TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | 1.6.0 | `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | 1.2.0 | DR (742 diff lines) | 1.1.0 local copy + `Save(showToast, report)` (v2.39.0); 1.3.0 `RegisterPayloadGuard` (v2.86.0); 1.4.0 `RegisterSaveStep` (v2.116.0); 1.5.0 `IsLoaded` (v2.145.0); 1.6.0 base guard, `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY` (v2.146.0); `registerKeys` cloud/local/localFirst (register); `RegisterSectionBlockProvider` hook | port_whole_reapply_vv | re-apply: `LayoutModeEnabled` key/getter/setter/skeleton/normalise; VV description text **minus its last sentence** ([verifier] `Na__DrawData__DESCRIPTION` is WRITTEN into every project file as `LayoutEditor__DrawingsData__Description`, and its "The SketchUp cloud sync never writes this key." is false until WP-S12-01 lands - the sync uploads the whole local project.json; the VV header's "survives a re-sync untouched and needs no entry on any dev-owned key list" is false for the same reason); `../42__` paths; section provider registered FROM VV 41 SceneData; migration region inert | facade, Flask L3/L4; [verifier] WP-S02a-15 was refuted as a duplicate of WP-S03b-05 + WP-S09-06 - coordinate with those |
| `TVM/41__System__SectionCutEngine/Na__SectionCut__SceneData__.js` | 1.0.0 | `VVM/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js` | 1.1.0 | PD (DIV-2; TD06 block keys identical, **per-scene entry schema DIFFERENT** - S12-V01) | registers its block getter with ProjectData | update_wiring | one-line `Na__DrawData__RegisterSectionBlockProvider(Na__SectSceneData__GetProjectBlock)` at init (replaces ProjectData's hard import, `VV ProjectData__.js:94`) | ProjectData port |
| `LE/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` | 1.5.0 | same | 1.3.0 | DR (314) | 1.4.0 key waits for `IsLoaded` (v2.145.0); 1.5.0 `JudgeDraft`, `AskAboutDraft`, `PutDraftBack`, base in draft, no write while asking (v2.146.0); `Suspend`, `Resume`, `DiscardSavedDraft` (register transactions; not in its log) | port_adapted | keep VV PORT NOTE divergence on `TrueVision__Pwa__HasUnsavedWork` (or publish a VV flag - the shared SW registrar exists, ledger L135-175); labels in VV AppConfig | ProjectData 1.6.0, Modal 1.2.0 |
| `TVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` | 1.2.0 | same | 1.0.0 | DR (69) | `altLabel` / `altIsDestructive` third button (v2.146.0) | port_verbatim | VV styling tokens | - |
| `LE/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` | 1.1.0 | same | 1.0.0 | AD (235) | TV reads NA admin and PlanVision files (v2.74.0, v2.88.0) | keep_vv_divergence | fix VV source: read `clientDrawingName`/`siteAddress` from `Na__CfApi__GetLoadedProjectData()` root, not the presentation block (`:100-107`) | facade |
| `LE/07__Core__SheetData/Na__LayoutEditor__Assets__.js` | 1.0.1 | same | 1.0.0 | DR (48) | 1.0.1 folder from URL (module log 14-Sep-2026; no devlog entry found), DevGate gate. [Verifier] VV never had TV's 1.0.1 bug (VV's NormalizeProjectFolderId already resolves the real folder through the master index), so this is parity only | port_adapted ([verifier] was port_verbatim) | `../42__` path; KEEP `Na__AppUtils__IsRunningOnLocalhost()` in `CanUpload` (VV DevGate PORT NOTE + D24: the Flask-mirror data path keeps the hostname test; with TV's DevGate gate an unlocked live session uploads, fails and, with TV's R2AssetUpload contract, toasts red) | ProjectLoader additions |
| `TVM/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js` | 1.2.1 | same | 1.2.0 | DR (78) | 1.2.1 `FolderId()` from URL; DevGate gate | port_adapted ([verifier] was port_verbatim) | keep DB name `ValeVision3D__ProjectedLinework`; console prefix; the stored block `Description` ("one ValeVision drawing"); KEEP the `IsRunningOnLocalhost()` gate on bake-before-save (same reason as Assets: a bake on the live site is CPU spent on an upload that cannot land) | ProjectLoader additions |
| `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | 1.39.0 | same | 1.15.0 | DR (1229) | schema owner (S03b) - transport-relevant: `Shape__Image` (1.27/1.29, v2.116.0), `Viewport__ImageZoom` (1.19), snapshot asset fields | port_whole_reapply_vv (S03b) | land BEFORE features that add record keys/enums: VV normalisers reset unknown enum values (e.g. `TitleBlockStyle`, paper size) | S03b |
| `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js` | 1.4.0 | same | 1.1.0 | DR | reads register numbering through `Na__CfApi__GetLoadedProjectData` (`:260-272`) | port_adapted (S03b) | none once the facade exists | facade |
| `LE/50__Feature__Specification/Na__LayoutEditor__SpecData__Transport__.js` | 1.3.0 | same | 1.1.0 | DR (394) | lockstep, `WriteLocalCopy`, reloads (v2.163.0); TV transport units | port_verbatim (with facade) | config file name only | facade, Flask L6 (S06b) |
| `LE/50__Feature__Specification/Na__LayoutEditor__SpecData__Lockstep__.js` | - | - | - | TVO | file lockstep (v2.163.0) | port_verbatim | none | facade (S06b); [verifier] also the pure `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (imported at :120-127; VV has no 52 folder) and the rest of the v2.163.0 spec units (WP-S06b-01). S06b's verifier opened D-S06b-V01 on the same transport question as D-S12-01 |
| `LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Data__.js` | 1.0.1 | - | - | TVO | register block persistence | port_adapted | seam at `:320-322` (TV file names) unless TV adds `Na__CfApi__ProjectDataLocation` | facade, register decision |
| `LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Transactions__.js` | - | - | - | TVO | localFirst + rollback through `LocalMirror.MergeKeys`, AutoSave Suspend/Resume | port_verbatim | none | ProjectData 1.6.0, AutoSave |
| `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js` | 1.1.0 | - | - | TVO | statements transport (v2.95.0, v2.157.0) | port_verbatim (with facade) | config index name | facade, F-STMT, L9 (S07b) |
| `LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js` | 1.0.x | - | - | TVO | local filing (v2.116.0) | port_adapted | ROUTE, SERVICE constants | L7 (S07a) |
| `LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js`, `__Publish__.js` | - | - | - | TVO | URL candidates, save step | port_verbatim | config `Sources__PagesBaseUrl` | facade F-IMG, ProjectData 1.4.0 (S07a) |
| `LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Transport__.js` | - | - | - | TVO | publish transport (v2.155.0) | port_adapted | `Na__LePubNet__API` constant | facade F-PUB, L8 (S08) |
| `LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__.js`, `LE/66/...Share__Manifest__.js` | - | - | - | TVO | write `Project__Folder` = `{yy}-Projects/{folder}`, `Project__ContentFolder` = `30__TrueVision__AppContent/...` into published meta (`Publish__.js:526-527`, `Share__Manifest__.js:355`) | port_adapted | VV values `{yyyy}/{folder}`, content folder `''` (S08) | S08 |
| `52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` | - | - | - | TVO | reader URL builder via `ResolveAssetUrl` | port_verbatim | none once VV ResolveAssetUrl falls back to the Flask copy on localhost | ProjectLoader additions (S08) |
| `55__Feature__SpellCheck/Na__SpellCheck__Dictionary__.js` | 1.0.0 | - | - | TVO | dictionary via local API (v2.144.0) | port_adapted | `SERVER_SERVICE`, config paths, key prefix | L10 (S06a/b) |
| `LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Transport__.js` | 1.0.0 | same | 1.0.0 | AD | VV probe `/api/check-localhost`, routes `/api/valevision/scrapbook` | keep_vv_divergence | optional realign to `/api/health` (D-S12-07) | - |
| `LE/21__System__SitePlanData/Na__SitePlan__Store__.js` | 1.2.0 | - | - | TVO | TV-layout paths (`:116-120, 274`) | port_adapted (S04a) | VV transport adapter in its URL functions | facade (S04a) |
| `NAAPPS/ProjectVision__LocalServer__Main__.py` | (v2.146.0 guard, backups) | `WCP/server.py` | - | PD (different servers) | fingerprint, base header, backups, atomic writes, `files/<name>`, `/api/health` | build_vv_transport | L1-L6, L11 | - |
| `NAAPPS/ProjectVision__TrueVisionSheetImages__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionSheetImages__Api__.py` (new) | - | TVO | - | build_vv_transport | L7 | L11 |
| `NAAPPS/ProjectVision__TrueVisionPublished__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionPublished__Api__.py` (new) | - | TVO | - | build_vv_transport | L8 | L11 |
| `NAAPPS/ProjectVision__TrueVisionStatements__Api__.py` | - | `WCP/Server__ValeVisionStatements__Api__.py` (new) | - | TVO | - | build_vv_transport | L9 | L11, statements decision |
| `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionUserConfig__Api__.py` (new) | - | TVO | - | build_vv_transport | L10 | L11 |
| `NAAPPS/ProjectVision__TrueVisionScrapbook__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionScrapbook__Api__.py` | 1.0.0 | AD (logic identical) | - | no_action | - | - |
| `TV/80__CloudflareIntegration/CloudflareWorker/src/CloudflareWorker__Main__.js`, `handlers/CloudflareHandler__R2__.js` | 1.1.0 | `WCP/CloudflareWorker/src/index.js` + handlers | 1.5.0 | PD (DIV-4) | generic `/r2/*`, raw upload, copy | build_vv_transport | W0-W8 in VV's own style | - |
| `NAAPPS/05__ProjectVision__CoreAppCode/CloudflareR2__ModelSync__Main__.py` (`DEV_OWNED_PROJECT_DATA_KEYS`) | - | `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` | - | PD (different pipelines) | editor-key preservation; top-level-only purge | build_vv_transport | b.9 fixes | - |
| `WCP/.../Whitecardopedia__Pwa__ServiceWorker__Logic__.js` | - | (VV runs under it) | token 2026-09-18-1 | - | TV v2.155.0 published cache | update_wiring | classify `05__`/`06__` CDN files | S08 |

---

## (d) Wiring notes

1. **VV LoadingSequence** (`VVM/01__AppCore/Na__AppFlow__LoadingSequence.js:672-760`):
   after `Na__AppUtils__InitMasterIndex()` add `await Na__CfApi__Initialize()` (localhost only; failures logged, never fatal); after
   `FetchProjectJson` and before any dispatch: overlay the editor-owned keys from `Na__CfApi__ReadProjectData()` on localhost (D-S12-04) and
   call `Na__CfApi__SetLoadedProjectData(projectData)`; pass `sceneConfig` in the `na-layouteditor-drawingsdata-loaded` detail (TV's third Load
   argument; harmless for VV). Do not move the dispatch order unless S02a/S09 decide to.
2. **VV 41 SceneData -> 42 ProjectData**: replace the hard import (`VV ProjectData__.js:94`) by registration from
   `Na__CrossSectionView__SceneData.js` init.
3. **AppConfig keys** (`VVM/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json`): `LayoutEditor__Specification__FileName`
   (already VV), `LayoutEditor__Statement__IndexFileName` = `ValeVision__StatementDocs__.json`, draft-question labels (`DraftApplied`,
   `DraftDiscarded`, `DraftLeftAside`), `SavedLocalMessage`/`SavedLocalFailedMessage`; SheetImages `Sources__PagesBaseUrl`.
4. **`VVM/02__AppData/Na__AppConfig__Main.json`**: `ProjectData__EditorOwnedKeys` (SSOT for overlay, worker families, pipeline).
5. **Facade consumers outside the drawing system** (optional, TV pattern): the nine VV dev savers (`11/SaveCameraSettings`,
   `11/OrbitMaxDistance`, `21/ScenePersistence`, `28/GridLine`, `29/FogPlane`, `31/VideoStudio`, `41/CrossSectionView DevControls`,
   `70/NavigationModes`, `70/RenderEngine`) each fetch the whole disk document and write it whole; moving them to `MergeAndSaveKeys` removes most
   whole-doc writes.
6. **Verification harness**: `VV/80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` must resolve every facade name TV modules import;
   add a facade presence check because TV tests stub by NAME (`Na__Test__DraftGuard__.test.cjs:55-66` strips imports and injects stubs).
7. **Module graph**: the facade imports only `03__AppUtils/Na__AppUtils__ProjectLoader.js` and `Na__AppUtils__R2SaveProjectJson__.js`
   (`R2FetchWorkerConfig`), keeping it a near-leaf the lazy LE loader never has to load early.

## (e) UI notes

- Save confirmations become TV's: "Sheets saved to R2 and locally." / "...but the local copy was not written: {cause}." (v2.39.0), replacing VV's
  "Saved to R2 ✓" plus a separate red mirror toast (`R2SaveProjectJson__.js:206, 215`).
- New modal: the draft question (Apply Draft / Discard Draft / Decide Later), shown once for every pre-upgrade VV draft.
- Refusal toast before R2 when the drawings on disk moved on (v2.146.0 wording).
- On the live VV site, TV's "Cloudflare Worker not configured" texts appear where TV would have allowed web authoring (TD01); VV cannot (key
  only on localhost). Reword where the text is a config label; the hard-coded ProjectData toast is acceptable as is.
- Register "Retry Local Sync" (TV) is the model for VV's phase-2 failure recovery.

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S12-01 | How do TV modules reach VV's storage? | (A) VV-authored facade at TV's paths with TV's names (`80__CloudflareIntegration` ApiClient, `LocalProjectMirror`, ProjectLoader helpers); (B) rewrite every TV Transport unit body over new per-feature VV clients (`R2DrawingNotes`, a new `R2StatementDocs`, ...) and seam every non-Transport caller (16 modules); (C) hybrid | **A.** Every TV Transport unit, Lockstep, Register, SheetImages and Publish module ports verbatim or with constant seams; TV's name-stubbed tests port; matches TV's own R2AssetUpload/RenderPreset precedent. It does not copy TV's transport (DIV-4 holds). Supersedes S07b's `R2StatementDocs` client and S06b's VV-transport rewrite; agrees with S07a and S09 (D-S09-04). |
| D-S12-02 | Shape of the new worker API | (A) one guarded "project files" family + merge-keys + project GET; (B) route per feature (S07b statements routes, S08 W1-W3, sheet-image routes) | **A.** One handler, one deploy, server-side family rules (stronger than TV's client-only guards), maps 1:1 to the facade; S08's server-side delete scope and S07b's statement guards become family rules. |
| D-S12-03 | Relative storage layout inside `VaApps/Projects/{folderId}/` | (A) TV's folder names verbatim (`05__Layout__DrawingDocs__Images`, `06__Layout__PublishedDocuments`, `10__StatementDocs`); (B) VV names (e.g. `LayoutEditor/SheetImages/<id>/`, S07a D-S07a-07). Sub-question: commit the new local binary folders to the ValeCodebase repo (TV commits its portal) or git-ignore rasters/PDFs | **A**, so `53__Data__Layout__PublishedSchema`, the facade constants and the Python blueprints port verbatim; the project root replaces TV's `30__TrueVision__AppContent`. Commit JSON; Adam to decide on rasters/PDFs (repo size vs GitHub Pages fallback). |
| D-S12-04 | VV localhost load source | (A) disk only (today); (B) TV's base file + R2 overlay of editor-owned keys, with one SSOT list reused by worker and pipeline | **B.** VV already calls R2 the SSOT (`R2SaveProjectJson__.js:15-19`); protects against a disk behind R2 (failed mirror, other machine). |
| D-S12-05 | Scope of the save guard in VV | (A) port TV v2.146 as is (local fingerprint, base header, backups); (B) A plus VV-first R2 judging through `merge-keys` `drawingsBase` | **B**, flag-gated; offer it back to TV (its v2.146 log lists it as not done). Backups outside the repo either way. |
| D-S12-06 | Should editor writes bump the global build manifest? | (A) yes (status quo; every save makes every client re-fetch every GLB); (B) no for merge-keys and files routes; keep for SketchUp syncs, rename, visibility, delete | **B.** project.json is already `no-cache, max-age=0`; drawing files carry their own cache policy. |
| D-S12-07 | How do ported transport modules recognise VV's local server? | (A) add `/api/health` (`service:'whitecardopedia-local-dev'`) and change one constant per module; (B) keep `/api/check-localhost` and rewrite each probe function (ScrapbookCustom precedent) | **A**, keeping `/api/check-localhost` for existing callers. |
| D-S12-08 | Sync-pipeline changes (outside the app, run by the SketchUp plugin on live projects) | (A) fix purge scope and preserve editor keys now, before any new R2 content; (B) defer | **A**, with Adam's sign-off and a dry run on a test project (`2026/3047__Doous`, VV D37). |
| D-S12-V01 (verifier) | Who owns each transport and persistence work package? Seven slices propose overlapping, partly conflicting packages | (A) S12 owns the transport (facade, worker, Flask core, blueprints, pipeline) and the persistence core; feature slices own feature modules and depend on S12's packages; (B) each feature slice builds its own transport | **A**, given D-S12-01 option A. Merge: WP-S09-06 into WP-S12-05 + WP-S12-03; WP-S08-06 into WP-S12-02 (no R2PublishedDocs client under A); WP-S07a-02 into WP-S12-05/07; transport halves of WP-S07a-06, WP-S07b-03, WP-S08-05 into WP-S12-04 + WP-S12-11/13/12; WP-S06b-02 into WP-S12-03 (L6 alias, atomic writes, Last-Modified); the blueprint half of WP-S06b-09 into WP-S12-14; WP-S08-12 and WP-S12-15 into one SW package; AutoSave 1.5.0 + Modal 1.2.0: WP-S12-08 or WP-S03b-05, not both (identical content). Open conflicts the merge must settle: folder names (D-S12-03 vs D-S07a-07), probe (D-S12-07 vs WP-S06b-09's `/api/check-localhost`), spec transport (D-S12-01 vs D-S06b-V01, D-S07b-10). |
| D-S12-V02 (verifier) | TD06 is not met: TV writes camelCase per-scene section entries, VV writes and reads `CrossSection__SceneBinding__*`. Fix TV? | (A) back-port to TV: Capture maps to VV's prefixed entry schema, Restore reads prefixed and falls back to camelCase; correct TV plan s3.2; (B) accept two entry schemas and amend TD06 to "block keys only" | **A** (Adam's TD06 intent was one schema; VV holds the only real data - 5 projects - and is unaffected). VV needs nothing either way: keep VV 41 SceneData; never port TV 41 SceneData/Serialize. |

## (g) Proposed work packages

Each package lists acceptance checks; "Hot" = files outside the package's own new files that it edits.

**WP-S12-01 - Sync pipeline safety (prerequisite) - M**
- Scope: `na_purge_stale_r2_images` purges top-level keys only and paginates; `na_upload_project_json_to_r2` (all three call sites) and the audit
  tool's `force` path preserve editor-owned keys from R2 (read `ProjectData__EditorOwnedKeys` from `VVM/02__AppData/Na__AppConfig__Main.json`),
  apply the thumbnail repoint to R2's scene block, and write the merged document locally too; report preserved keys.
- Hot: `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`, `AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py`, `AutomationUtil__R2Common__Lib__.py`, `VVM/02__AppData/Na__AppConfig__Main.json`.
- Acceptance: a Python test with an in-memory S3 stub proves (1) `PresentationMode/Thumbnails/x.webp`, `LayoutEditor/Snapshots/y.webp`,
  `05__Layout__DrawingDocs__Images/D01/z__0123456789.webp` survive a sync while a superseded top-level `IMG01__...png` is purged; (2) R2's
  `LayoutEditor__DrawingsData` survives a sync from a local file without it; (3) a repointed IMG thumbnail lands in R2's scene block.
- Tests: new `WCP/Tools__DevUtils/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py`.

**WP-S12-02 - ProjectLoader identity helpers - S**
- Scope: `GetProjectFolderFromUrl`, `GetYearFromUrl`, localhost fallback in `ResolveAssetUrl` (b.4).
- Hot: `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js`.
- Acceptance: node test with stubbed `window.location` and index: `?project=3047` -> `3047__Doous`/`2026`; `?project=2026/3047__Doous` same;
  unknown code -> folder null; `?project-folder=&year=` honoured; existing exports unchanged (`Na__Verify__Exports__` passes).
  [Verifier] Also: before the master index settles, and for a code with no index entry, both helpers answer null (never the
  `2026/<code>` legacy guess); `?project=2025/59494__Weeks` answers `59494__Weeks`/`2025` even though that project.json stores
  `folderId: 2025/WK-3007__Weeks`. Overlaps WP-S08-06's ProjectLoader half and WP-S09-06 (D-S12-V01).

**WP-S12-03 - Flask persistence core - M**
- Scope: L1-L6 and L11 (shared helper; atomic writes; backups outside the repo; containment in `get_project_path`).
- Hot: `WCP/server.py`.
- Acceptance: port `Na__Test__ProjectDataSaveGuard__.test.py` (32 checks) to `WCP` against a temporary `Projects` root: fingerprint invariant to
  formatting and to keys outside the block; matching base lands and answers the new fingerprint; stale base refused with the file untouched and
  no backup; hand-edited file refuses; no header never judged; `none` only matches a file without a block; backups mirror the path outside the
  repo, byte-identical, capped at 30; `files/<name>` allow-list; unknown `/api/x` GET -> 404 JSON.
- Tests: `Na__Test__ProjectDataSaveGuard__.test.py` (adapted), new `Na__Test__FlaskApi404__.test.py`.

**WP-S12-04 - Worker 1.6.0: project GET, merge-keys, files family - L**
- Scope: W0-W8, path families, folderId validation, no-bump rules, dev log; local proof under `wrangler dev`; Adam deploys.
- Hot: `WCP/CloudflareWorker/src/index.js`, `WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectEditor__.js` (import the helper instead of
  its local manifest copy, optional).
- Acceptance: node tests importing the handlers with a Map-backed `env.R2_BUCKET`: every family allows its own and refuses neighbours
  (`project.json`, `00__Archive...`, `..`, cross-family copy, delete outside one published document, unmanaged sheet-image name); merge-keys refuses
  pipeline keys, answers 409 on a stale `drawingsBase` and on a missing project.json; files routes never touch the manifest; `/health` lists routes.
  After deploy: `GET /api/editor/health` shows `version:'1.6.0'`.
- Tests: new `WCP/CloudflareWorker/tests/Na__Test__EditorWorker__ProjectFiles__.test.mjs`, `...__MergeKeys__.test.mjs`.

**WP-S12-05 - VV transport facade - L**
- Scope: `VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (33 names), `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`
  (8 names), both feature-detecting W0 and falling back to existing routes.
- Hot: none beyond new files (imports ProjectLoader and R2SaveProjectJson read-only).
- Acceptance: `Na__Verify__Exports__` resolves every name in `parity/work_s12/imports.txt`'s TV "USED NAMES"; node test with stubbed `fetch`
  checks keys, CDN and repository URLs (GitHub Pages sub-path), allow-lists, queueing of `MergeAndSaveKeys`, fallback to whole-doc save when
  merge-keys is missing, `never throws`. [Verifier] Plus: the folderId comes from the URL token through the master index only, never from
  project.json's `folderId` (wrong in 54 of 155 files) - a fixture whose project.json carries a stale `folderId` must still write to the
  index folder; an unresolved token leaves `IsConfigured()` false; the fingerprint answer "404 + Project not found" (today's Flask) reads as
  `unsupported`; folder names with spaces are encoded per segment.
- Tests: new `VV/80__Testing__PrototypeEnvironment/Na__Test__TransportFacade__.test.mjs`.

**WP-S12-06 - Loading-sequence wiring and the editor-owned key list - M**
- Scope: d.1, d.4; overlay on localhost (D-S12-04).
- Hot: `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`, `VVM/02__AppData/Na__AppConfig__Main.json`.
- Acceptance: on localhost with R2 holding a newer `LayoutEditor__DrawingsData` than disk, the session loads R2's block and logs the overlay;
  `Na__CfApi__GetLoadedProjectData()` equals the document the session runs; web load unchanged.

**WP-S12-07 - Persistence core: ProjectData 1.6.0 (transport half; [verifier] coordinate with WP-S03b-05 and WP-S09-06 - WP-S02a-15 was refuted by the S02a verifier as their duplicate) - M**
- Scope: port TV ProjectData whole; re-apply VV seams (c); provider registration from VV 41 SceneData.
- Hot: `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`, `VVM/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js`.
- Acceptance: Save writes R2 (merge-keys) then disk (guarded) and reports `local`; a stale disk refuses before R2 with the toast; the block is
  stamped `SavedIso`; section bindings ride when present; `LayoutModeEnabled` survives a save.
- Tests: `Na__Test__DraftGuard__.test.cjs` (ProjectData half, paths 40->42), `Na__Test__DrawingDrafts__.test.mjs` if S02a ports DraftGuard.

**WP-S12-08 - AutoSave 1.5.0 and Modal 1.2.0 (coordinate with S03b WP-S03b-05) - M**
- Hot: `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js`, `VVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js`, `VVM/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- Acceptance: the 11 DraftGuard tests and the 27 DraftRestore tests pass against VV modules; `Suspend/Resume/DiscardSavedDraft` exported.
- Tests: `Na__Test__DraftGuard__.test.cjs`, `Na__Test__DraftRestore__.test.mjs`.
- [Verifier] Same content as WP-S03b-05 (AutoSave 1.5.0, Suspend/Resume/DiscardSavedDraft, Modal 1.2.0 as its prerequisite): keep ONE owner
  (D-S12-V01); whichever survives must own Modal 1.2.0 explicitly (WP-S03b-05 lists it only as a prerequisite). The VV PORT NOTE premise
  "ValeVision has no service worker" is wrong (ledger L135-175), and the shared registrar
  (`WCP/.../Whitecardopedia__Pwa__ServiceWorker__Registrar__.js:116-145`) reloads on `controllerchange` holding back only for
  `window.Na__LoadWatchdog__IsLoadingActive` - publishing a VV unsaved-work flag does nothing until that shared file reads it.

**WP-S12-09 - Asset modules verbatim and the upload contract - S** **[REFUTED by verifier: "verbatim" swaps VV's `IsRunningOnLocalhost()` upload/bake gate for TV's DevGate (TD01), against VV's DevGate PORT NOTE and D24; an unlocked live session would bake, attempt uploads that cannot land and - with TV's non-throwing contract - toast red on every snapshot. Replaced by WP-S12-V09R.]**
- Scope: Assets 1.0.1, Persistence 1.2.1 verbatim; VV `R2AssetUpload` returns `{r2Success:false, ...}` instead of throwing and adds `relUrl`;
  Thumbnail Renderer tests `r2Success`.
- Hot: `VVM/03__AppUtils/Na__AppUtils__R2AssetUpload__.js`, `VVM/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js`.
- Acceptance: a refused upload never reports a stored picture; snapshots and linework read back from `VaApps/Projects/{folderId}/LayoutEditor/...`.

**WP-S12-V09R (verifier) - Asset modules ported with VV's gate, and the upload contract - S**
- Scope: Assets 1.0.1 and Persistence 1.2.1 taken from TV with three VV seams: `../42__` path, `CanUpload`/bake-before-save keep
  `Na__AppUtils__IsRunningOnLocalhost()` (not `Na__DevGate__IsAuthoringEnabled`), Persistence keeps its DB name, console prefix and the stored
  `Description` ("one ValeVision drawing"). VV `R2AssetUpload` adopts TV's non-throwing contract (`{r2Success:false, localSuccess:false,
  publicUrl:null, relUrl:null, error}`, `relUrl` on success) but returns a silent `skipped` result off localhost; Thumbnail Renderer tests `r2Success`.
- Hot: the four files of WP-S12-09; Persistence is also in S02b's scope (single owner).
- Acceptance: a refused or failed upload never reports a stored snapshot, linework block or thumbnail; on the live site with authoring
  unlocked no upload is attempted and no toast is shown; snapshots and linework read back from `VaApps/Projects/{folderId}/LayoutEditor/...`
  on the web and from the Flask copy on localhost; PORT NOTEs record the gate divergence.

**WP-S12-V18 (verifier) - Project display name for printed documents - S**
- Scope: one VV seam that answers the project's display name (`projectNameAlias || displayName || projectName` from the loaded project
  data, or the presentation config's `projectName` as the title block already does), exported from the VV facade as
  `Na__CfApi__ProjectDisplayName()` (back-port candidate), and used where TV reads `window.TrueVision__Pwa__ProjectContext`: VV's already-ported
  `SpecPdf__.js:147-148` (today it never prints a name - nothing in VV or Whitecardopedia defines that global), `SpecDocument__.js`, and on
  arrival `Register__Pdf__.js:212-216` and `Panel__ScrapbookParametric__.js:289-297`. Also the title block's Project default,
  `Na__LeRec__BuildFields` (VV SheetRecords__.js:768-769, TV :1683-1684, identical): it reads `projectName || displayName` from
  `Na__PresentationMode__ProjectJson__GetActiveConfig()`, which is the `PresentationMode__SavedCameraScenes` block - no presentation block in
  either data set carries a name (0/9 VV, 0/3 TV), so the default never fills in either app (S12-V03; a TV back-port too). Name precedence is
  the owner's call: root `projectName` 155/155, `displayName` 31/155, `projectNameAlias` 7/155.
- Acceptance: the specification PDF of `2026/3047__Doous` prints its project name; a new sheet's Project field fills from the project data;
  no module reads `window.TrueVision__Pwa__ProjectContext` in VV.

**WP-S12-10 - ProjectRecord reads the project root - S**
- Hot: `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js`.
- Acceptance: a project.json with root `siteAddress` / `clientDrawingName` seeds the Common fields; the presentation block is not read.

**WP-S12-11 - Sheet-images blueprint (with S07a) - M**: L7 on L11. Hot: `WCP/server.py` (register). Tests: `Na__Test__SheetImagesApi__.test.py` adapted.
**WP-S12-12 - Published blueprint (with S08) - M**: L8 on L11. Hot: `WCP/server.py`. Tests: published API test written from TV's routes (none in TV's suite beyond the reader/schema tests).
**WP-S12-13 - Statements blueprint (with S07b, if statements are ported) - M**: L9 on L11. Hot: `WCP/server.py`. Tests: `Na__Test__StatementServer__.py` adapted.
**WP-S12-14 - User-config blueprint (with S06a/b) - S**: L10 on L11, `VV/50__ValeVision__UserConfig/`. Hot: `WCP/server.py`. Tests: `Na__Test__UserSpellingsApi__.test.py` adapted.

**WP-S12-15 - Cache hygiene - S**
- Scope: D-S12-06 in the worker (part of WP-04) and the Whitecardopedia SW: classify CDN files under `05__Layout__DrawingDocs__Images/` and
  `06__Layout__PublishedDocuments/` (hashed: cache-first in a capped cache; JSON: network-first; PDF: not cached), token bump decision with Adam.
- Hot: `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`.

**WP-S12-16 - Retire / realign VV-only transport clients - S**
- Scope: delete `Na__AppUtils__R2DrawingNotes__.js` once no importer remains (after the spec port); keep `R2SaveProjectJson` for VV dev menus;
  optionally move the nine dev savers to the facade.
- Hot: VV dev-saver files listed in d.5 (only if the option is taken).

**WP-S12-17 - Ledger, PORT NOTEs and docs - S**
- Scope: VV ledger "Transport (DIV-4)" section (facade mapping, worker 1.6.0 routes and deploy state, Flask routes); fix stale rows (F40);
  PORT NOTEs on the two facades; VV devlog entries (patch/minor per VV convention).
- Hot: `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md`.

Dependency order: WP-01 -> (WP-02, WP-03) -> WP-05 -> WP-06 -> WP-07 -> WP-08; WP-04 any time before the features that need new routes
(WP-05 falls back meanwhile); WP-V09R (replaces WP-09)/WP-10/WP-V18 after WP-02/WP-05; WP-11..14 after WP-03 (and WP-04 for R2 halves); WP-15 with WP-04 and S08;
WP-16 after S06b's spec port; WP-17 last. [Verifier] Before any of these is scheduled, settle D-S12-V01 (single owners across S03b, S06b,
S07a, S07b, S08, S09 and S12).

### Tests to port (TV 80__Testing__PrototypeEnvironment, persistence-related)

`Na__Test__ProjectDataSaveGuard__.test.py`, `Na__Test__DraftGuard__.test.cjs`, `Na__Test__DraftRestore__.test.mjs`,
`Na__Test__DrawingDrafts__.test.mjs`, `Na__Test__SheetImages__.test.mjs`, `Na__Test__SheetImagesApi__.test.py`, `Na__Test__SpecLockstep__.test.mjs`,
`Na__Test__SpecInlineEdit__.test.mjs`, `Na__Test__StatementPublish__.test.mjs`, `Na__Test__StatementRoundTrip__.test.mjs`,
`Na__Test__StatementServer__.py`, `Na__Test__UserSpellingsApi__.test.py`, `Na__Test__SpellCheckDictionary__.test.mjs`,
`Na__Test__PublishedSchema__.test.mjs`, `Na__Test__PublishedReader__.test.mjs`, `Na__Test__ShareLinks__.test.mjs`,
`Na__Test__SitePlanStore__.test.mjs`, `Na__Test__SheetsNormaliseOnce__.test.mjs`, `Na__Test__ProjectRecordAddress__.html` (VV variant).
VV today has only `Na__Test__ScrapbookApi__.test.py` and `Na__Test__ScrapbookServer__.py` on the transport side.

---

## Appendix - evidence index (path:line)

- TV ApiClient: constants `:94-98`; `ReadKey` `:224-250`; `WriteKey` `:260-282`; `MergeAndSaveKeys` `:348-363`; asset guard `:450`;
  `ProjectFileNames` `:510-514`; statements `:532-535, 651-729`; admin `:553-574`; PlanVision `:589-608`; sheet images `:766-972`;
  published `:1001-1172`; exports `:1184-1218`.
- TV worker: routes `CloudflareWorker__Main__.js:46-95`; CORS `:116-179`; R2 ops `CloudflareHandler__R2__.js:43-392`; `wrangler.toml` vars
  `ENVIRONMENT = "development"`, `R2_PREFIX = "NaProjectPortal/"`.
- TV LocalProjectMirror: `:100-108` constants; `:229-262` MergeKeys; `:278-297` fingerprint; `:307-319` sibling; `:336-423` statements.
- TV ProjectData 1.6.0: keys `:179-191`; base state `:252-255`; `LearnBase` `:502-519`; `CheckBase` `:531-539`; Save `:710-836`; hooks `:851-879`.
- TV AutoSave: Modal import `:153`; `Key` `:218`; `JudgeDraft` `:314`; `AskAboutDraft` `:369`; Suspend/Resume/Discard `:620-635`.
- TV LoadingSequence: `:352-361`, `:728-747`, `:922-925`, `:958-980`.
- TV ProjectLoader: `:92-104`, `:133-162`, `:223-236`.
- TV LocalServer: `:103-105`, `:114-131`, `:225-238`, `:401-459`, `:648-826`.
- TV pipeline dev-owned lists: `CloudflareR2__ModelSync__Main__.py:121-130, 541-551`; `ProjectVision__BuildScript__.py:83-92`.
- TV devlog: v2.39.0 L12719-12800; v2.139.1 L2700-2718; v2.145.0 L2006-2083; v2.146.0 L1901-2004; v2.155.0 L1266-1365; v2.172.0 L5-63.
- VV worker: `index.js:112-116, 147-153, 155-225`; `CloudflareHelper__Cors__.js:41-78`; `ProjectEditor__.js:92-171, 203-254`;
  `ProjectAsset__.js:51-52, 136-148`; `DrawingNotes__.js:73-146`; `ProjectRename__.js:84, 132-150, 242-335`; `wrangler.jsonc`; `.env.template`.
- VV Flask: `server.py:74-96, 128-171, 322-358, 408-484, 708-818, 899-909, 956-977, 1007-1011`.
- VV clients: `R2SaveProjectJson__.js:15-19, 85-117, 129-165, 184-219`; `R2AssetUpload__.js:70, 135-232`; `R2DrawingNotes__.js:54, 183-276`;
  `ProjectLoader.js:121-125, 169-254, 303-351, 372-475, 535-547`.
- VV core: `ProjectData__.js:94, 112, 135, 208-218, 380-430`; `LoadingSequence.js:672-760`; `AutoSave__.js:42-60, 169-205, 311`;
  `SheetModel__.js:506-507`; `Loader__.js:299-309, 339`; `ProjectRecord__.js:100-107`; `SceneData.js:124`; `Thumbnail__Renderer.js:235-242`.
- VV pipeline: `AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:383-431, 446-490, 603-680, 715-760, 909-990`;
  `ConfigLoader__.rb:66`.
- VV service worker: `Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229, 240-262, 640-697`.
- VV ledger: L19-20 (DIV list), L135-175 (service worker), L187-190 (drawings block row), L642 (R2AssetUpload row); VV plan D08, D20, D24, D36, D39.

---

## Verification

Adversarial verification, 01-Oct-2026, read-only on both apps, WCP and NAAPPS. Pre-verification copy:
`parity/verify_s12_r2/S12_report_before_verify.md`; census scripts in `parity/verify_s12_r2/`. Edits made above are marked
"[Verifier]", "[Corrected by verifier]" or "REFUTED by verifier".

### What was checked

- **All 50 findings** (16 of 16 critical/high), **all 17 work packages**, **all 8 decisions**, and the narrative claims of b.1-b.10.
- Recomputed the import graph: TV ApiClient exports 33 names, 27 imported, by 26 modules app-wide, 16 of them in 40-55; LocalMirror 8/8 by 6;
  VV has no `Na__CfApi__`/`Na__LocalMirror__`/`GetProjectFolderFromUrl`/`GetYearFromUrl` anywhere except four comments.
- Read in source: TV ApiClient 1.5.0 (init, key builders, read/merge/write, assets, siblings, statements, sheet images, published, exports);
  TV worker 1.1.0 (`CloudflareWorker__Main__.js`, `CloudflareHandler__R2__.js`, `wrangler.toml`, `deploy.bat`: no auth check, top-level
  `ENVIRONMENT = "development"`, deploy without `--env production`); TV LocalProjectMirror 1.2.0 whole; TV ProjectData 1.6.0 (log, constants,
  base guard, Save, hooks, exports); TV/VV LoadingSequence project-data regions; TV/VV AutoSave headers and function lists; TV/VV ProjectLoader;
  TV/VV R2AssetUpload; VV R2SaveProjectJson and R2DrawingNotes; VV ProjectData 1.2.0 Save; TV/VV 41 SceneData, TV Serialize, VV SystemLogic
  snapshot; VV ProjectRecord and the presentation active config; TV SpecData Transport/Lockstep/Document imports; TV Register Data; TV Statement
  Publish; TV PubDoc Urls; TV SheetImages Source; TV PublishedSchema; VV worker `index.js`, all six handlers, the CORS helper, `wrangler.jsonc`,
  `.env.template`, both `.bat`; every route of `WCP/server.py`; the sync script (purge, upload, repoint, actions, `main`), the audit tool, the
  other five pipeline scripts, the plugin config line; the shared SW logic and registrar; the TV local server (Flask app, guard, fingerprint,
  atomic write) and the four TV blueprints (routes, 2-digit `YEAR_PATTERN`, 256 MB cap); TV devlog v2.146.0 whole and the index rows of all 14
  cited versions; TV plan DIV-4, TD01-TD06 and s3.2; VV plan D08/D20/D24/D36/D37/D39; VV ledger L130-190; VV devlog deploy notes.
- Data censuses (read-only): root keys of 155 VV / 8 TV project files (b.7 numbers reproduced); project.json `folderId` against the real folder;
  name fields; the per-scene section entries of the 5 VV files carrying `CrossSection__SceneData`; browser-storage keys in both trees;
  schema-key literals in both trees; the rename pattern against 152 index folderIds and 155 disk folders (all pass; 3 contain spaces).
- Cross-checked the other slices' transport packages and their verifiers' outputs (S02a, S03a, S06b, S07a, S07b, S08, S09).

### Verdicts

| Verdict | Ids |
|---|---|
| Confirmed as written | F01 F02 F03 F05 F08 F09 F12 F13 F16 F17 F18 F21 F22 F23 F24 F26 F27 F28 F29 F30 F33 F36 F37 F38 F39 F41 F42 F43 F44 F45 F47 F48 F49 F50 |
| Corrected | F04 (folderId source), F06 (no default year; index only), F07 (shared bucket; legacy key), F10 (stored description; dead coordination target), F11 (registrar reads no flag; duplicate of WP-S03b-05), F14 (old-worker protection; S08 pattern conflict), F15 (trap scope), F19 and F20 (port_adapted: keep VV's gate), F25 (Statement Lockstep dependency, owner WP-S06b-01, deploy conditional), F31 (legacy key), F32 (section entries differ), F34 (wider scope; VV SpecPdf affected today), F35 (two more keys), F40 (more stale statements), F46 (schema not identical) |
| Refuted findings | none |
| Refuted work packages | WP-S12-09 (replaced by WP-S12-V09R) |
| Added findings | S12-V01 section entry schema differs (TD06 not met); S12-V02 project.json `folderId` unreliable; S12-V03 printed project name never fills; S12-V04 seven slices build overlapping transport packages |
| Added work packages | WP-S12-V09R, WP-S12-V18 |
| Added decisions | D-S12-V01 (single owners), D-S12-V02 (TD06 back-port) |

### The corrections that matter most

1. **Facade folderId (S12-V02, F04, F06).** b.4 said "prefer `GetLoadedProjectData().folderId`". That field is missing in 10 and wrong in 54 of
   the 155 project files; following it would write a third of projects to prefixes the app never reads. Corrected to the master index only.
2. **Section schema (S12-V01, F32, F46).** "Byte-compatible (TD06)" is false at entry level. VV is unaffected as long as it keeps its own 41
   SceneData; a swarm agent must not port TV's 41 SceneData or Serialize into VV.
3. **Asset modules are not verbatim (F19, F20, WP-S12-09).** TV's DevGate gate contradicts VV's DevGate PORT NOTE and D24.
4. **Spec lockstep has a hidden dependency (F25).** It imports the Statement Writer's pure Lockstep module; WP-S06b-01 already owns that port.
5. **Ownership (S12-V04, D-S12-V01).** S03b, S06b, S07a, S07b, S08, S09 and S12 each propose part of the same transport; several conflict
   (folder names, probe route, spec transport). Settle owners before scheduling.

### Coverage

Every in-scope file is accounted for by a finding or a table row above. Marked **no action** by the verifier (not covered by the survey):
`NAAPPS/ProjectVision__ProjectManager__Api__.py` (Studio Project Manager; no TV drawing module calls `/api/manager`); the TV local server's
`/api/dev/projects`, `/sync-cdn` and `/backups` routes (operator-facing; only a comment in LocalProjectMirror mentions `/backups`);
`WCP/CloudflareWorker/src/CloudflareHelper__MasterConfigR2__.js` and `__MasterIndexR2__.js` (rename, visibility, delete only); the WCP pipeline
scripts `BuildCloudflareBucket` (GLB uploads, local model URLs), `FetchLocalProjects` (new projects from the template; existing ones get model
URLs only), `UpdateProjectImages` (local image list), `PromoteProjectType` (key-level `ProjectType` patch on R2) and `GenerateGalleryThumbnails`
(local `thumbnailImage`) - none overwrites R2's editor keys. Of the 87 TV drawing-system files (40-55) with I/O markers, 56 are not named by
file in the report: 4 are covered under short names (Statement Page, Statement Editor Cards, Statement Publish Images, Share Links) and the other
52 are static config loads (`*ConfigState*`, `*__Config__.json`), title-block image assets (SheetChrome `LoadAsset`), PDF fonts and UI
preferences in localStorage, covered by row M1 and the browser-storage table.

### Still unverified

- R2 itself: whether the purge has already deleted objects, and which worker version is deployed (so whether `/drawing-notes` is live).
- Cloudflare plan limits (request body, CPU time) for raw uploads.
- Whether the production `ALLOWED_ORIGIN` secret names `adam-noble-01.github.io`.
- Runtime behaviour: nothing was run in a browser or against a server.
- The "31 persistence-related tests" count: the 19 tests named in (g) exist in TV; the rest of the count was not reproduced.
