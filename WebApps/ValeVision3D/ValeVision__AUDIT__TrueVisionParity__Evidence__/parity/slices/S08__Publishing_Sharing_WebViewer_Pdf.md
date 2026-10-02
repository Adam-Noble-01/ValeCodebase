# S08 - Publishing, Sharing, Web Viewer, PDF Export, Published Documents and Schema

**Parity slice S08 of the TrueVision (TV, lead) -> ValeVision (VV, target) drawing-system alignment.**
Analysed 01-Oct-2026, read-only, against TV HEAD b2aa9151 (devlog top v2.172.0, 29-Sep-2026) and
VV HEAD 7b4e593a (devlog top v2.71.0, 28-Sep-2026).

Path shorthand: `TV/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`,
`VV/` = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`, `TVM/`/`VVM/` = `<app>/02__Src__AppModules`,
`LE/` = `51__System__LayoutEditor`, `NAAPPS/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps`,
`WCP/` = `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia`, `PORTAL/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-project-portal`.

Everything below was read from source. Nothing was run in a browser, no worker was probed, nothing was deployed.
Where a statement is inference rather than something read, it says so.

---

## (a) Scope - what was examined

| Area | TV | VV |
|---|---|---|
| `LE/60__Feature__PdfExport` | 3 files, 1,016 lines (PdfExporter 1.12.0, PdfFilename 1.0.0, PdfFonts 1.0.0) | 2 files, 523 lines (PdfExporter 1.2.0, PdfFilename 1.0.0) |
| `LE/65__Feature__DocumentPublishing` | 7 files, 2,604 lines | **absent** |
| `LE/66__Feature__DocumentSharing` | 7 files, 2,116 lines (incl. README) | **absent** |
| `LE/80__Feature__WebViewer` | 5 files, 2,091 lines (WebViewer 1.2.0) | 5 files, 1,895 lines (WebViewer 1.1.0) |
| `52__System__Layout__PublishedDocuments` (top level) | 11 files, 3,998 lines (incl. README) | **absent** |
| `53__Data__Layout__PublishedSchema` (top level) | 4 files, 1,138 lines (incl. README) | **absent** |
| R2 client | `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` 1.5.0 (1,221 lines; Published region 977-1175) | `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`, `__R2AssetUpload__.js`, `__R2DrawingNotes__.js` (791 lines) |
| Worker | `TV/80__CloudflareIntegration/CloudflareWorker` (na-truevision-api; `src/CloudflareWorker__Main__.js` 1.1.0, `src/handlers/CloudflareHandler__R2__.js` 1.1.0, wrangler.toml, deploy.bat) | `WCP/CloudflareWorker` (whitecardopedia-editor-api; `src/index.js` 1.5.0, 6 handlers, 4 helpers, wrangler.jsonc) |
| Local server | `NAAPPS/ProjectVision__TrueVisionPublished__Api__.py` 1.0.0 (448 lines) on the 8090 ProjectVision server | `WCP/server.py` (Flask, port 8000) + `WCP/Server__ValeVisionScrapbook__Api__.py` (no publishing blueprint) |
| VV-only | - | `VVM/61__Feature__ShareProjectLink` (8 files, 1,209 lines) |
| Tests | `Na__Test__PublishedReader__.test.mjs` (590) + `__Harness__.html` (135), `Na__Test__PublishedSchema__.test.mjs` (650), `Na__Test__ShareLinks__.test.mjs` (452), `Na__Test__SpecificationPdf__.html` (122), `Na__Test__StatementPublish__.test.mjs` (424, statement - out of scope), `Na__Verify__Exports__/ModuleGraph__` | `Na__Test__SpecificationPdf__.html` (114), `Na__Verify__Exports__/ModuleGraph__` only |
| Docs read | `TV/TrueVision__PLAN__PublishingSystem__.md` (whole), `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` (DIV-4, TD01-TD06), TV devlog v2.62, v2.63, v2.65.0-v2.65.2, v2.69, v2.135, v2.155, v2.156, v2.166, v2.169-v2.172; `66__.../README__DocumentSharing__.md`, `52__.../README__PublishedDocuments__.md`, `53__.../README__PublishedSchema__.md`; the example fixture folder `PORTAL/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/06__Layout__PublishedDocuments` (39 files, 688 KB); website `NaWeb/s/index.html`, `NaWeb/q/index.json` | `VV/ValeVision__PARITY__TrueVisionLedger__.md` (rows 1113-1192, 121, 130-176, 1214-1246), VV devlog v2.55, v2.56, v2.58.0, v2.58.1, `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` D01-D40 and 5.6/11.5, `VV/.cursor/rules/08-R2IndexArchitecture--ValeVision3D-SSOT-.mdc`, `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` (purge functions), shared SW `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` |

Drift rows (from `ref/drift_all.tsv`): PdfExporter **drifted** (585 vs 339 lines, 364 diff lines, 1.12.0 vs 1.2.0);
PdfFilename **header-only**; PdfFonts **tv-only**; all 7 of 65 and all 7 of 66 **tv-only**; WebViewer **drifted** (706 vs
496, 254 diff lines, 1.2.0 vs 1.1.0); `Styles__WebViewer__.css`, `WebViewer__Drawings__` (1.1.0/1.1.0), `__Spec__`
(1.0.0/1.0.0), `__TouchControls__` (1.1.0/1.1.0) **header-only** (confirmed with `git diff --no-index -w`: header and
port note lines only).

Coupled modules read because this slice cannot be wired without them (they belong to other slices): TV/VV
`05__Core__ModeController/Na__LayoutEditor__ModeController__.js` (1.32.0 vs 1.18.0), `10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js`
(1.13.0 vs 1.6.0), `20__System__Viewports/Na__LayoutEditor__Viewport2d__.js` (1.16.0 vs 1.8.0), `07__Core__SheetData/*`
(DocumentId), `03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` (1.9.0 vs 1.3.0), `Na__LayoutEditor__AppConfig__.json`,
`50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js` (1.0.0/1.0.0, 28 diff lines), `40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`
(1.24.0 vs 1.9.0), `50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js` (1.4.0 vs 1.2.0), VV
`01__Core__Loader/Na__LayoutEditor__Loader__.js` 1.1.0, VV `05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`,
`03__AppUtils/Na__AppUtils__ProjectLoader.js` (both), `03__AppUtils/Na__AppUtils__DevGate__.js` (both, effectively verbatim).

---

## (b) Narrative findings by sub-system

### B1. The headline: VV's web viewer still renders every drawing on the reader's phone

TV v2.155.0 (23-Sep-2026, devlog lines 1266-1363) split the drawing system into **an authoring renderer and a
published-document reader that computes nothing**, because "older iPhones crash the moment a drawing tab is pressed,
the iPad Pro crashes on complex drawings and the Pixel after a few tabs". The reader (`TVM/52__System__Layout__PublishedDocuments`)
cannot import the projection pipeline, the snapshot renderer or the tiled exporter (checked statically by
`Na__Test__PublishedReader__`); the publisher (`TVM/LE/65__Feature__DocumentPublishing`) bakes each drawing once on the
authoring machine; the shared contract (`TVM/53__Data__Layout__PublishedSchema`) names every file both sides use.

VV has none of the three. Its web viewer (VV v2.58.0, ported from TV v2.65.0/v2.65.1) is the pre-v2.155 design:

- `VVM/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:539` calls `Na__LeSurface__SetSheet(sheet)`
  unconditionally on Enter, and `:779`/`:785` again on `loaded` and `active` sheet changes - so a reader's device builds
  every viewport frame and renders it. TV closed both paths (`TVM/.../ModeController__.js:747-754` "THE WEB VIEWER NEVER
  RENDERS A SHEET" and `:1124-1137`, "that second path was still rendering every viewport on a phone").
- `VVM/LE/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js:83,289-296` - the dock's PDF button calls
  `Na__LePdf__ExportSheet` on the reader's device, i.e. it renders every viewport at the export level (20 px/mm, 16
  samples). TV v2.155 removed this: "the single most expensive thing the app can do, and the button most likely to take
  a phone down" (`TVM/.../WebViewer__.js:310-347`).
- VV's 2D underlays render THROUGH the EffectComposer (DIV-1, `VVM/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js`),
  so the per-viewport cost on a reader is, by construction, at least TV's pre-v2.155 cost. (Inference from the
  architecture; VV phone crashes have not been reported in anything read.)

**This is the single most valuable alignment in the slice** - it is both a parity gap and a reliability fix.

### B2. The TV publish pipeline end to end, and exactly what it writes where

Entry: "Publish drawings..." in the Drawing Register's bar (`TVM/LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Editor__.js:90,539`),
authoring only, opens `Na__LePubPanel__Open` (`65/Na__LayoutEditor__Publish__Panel__.js`). The panel lists every sheet as
`published` / `stale` / `never` (`Na__LePub__Status`, `Publish__.js:201-222`), ticks stale and never-published by
default, and offers "Also push to R2 (clients see it)" **off by default** (`Publish__Config__.json` `Behaviour__PushToR2Default:false`).

Orchestration (`65/Na__LayoutEditor__Publish__.js`, `Na__LePub__PublishSheets` 572-681, `Na__LePub__PublishOne` 249-431):

1. `LocalReady` - one `GET /api/truevision/published/list` so a stale 8090 server fails at once (`Transport__.js:98-108`).
2. Specification loaded (capped 15 s) so the notes margin and every bubble's note are present.
3. Per sheet:
   1. Document id must pass `Na__PubSchema__IsDocumentId` (segment regex `^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$`).
   2. **Revision**: read the old local manifest; a different revision letter -> `POST /archive` zips the whole document
      folder to `00__Archive__Revisions/<DocId>__Revision__<old>.zip` (never overwrites an existing zip; adds a timestamp)
      and removes the folder; same letter -> overwrite in place.
   3. `Na__LePubSheet__Build` - the sheet file and one element file per kind, each carrying the authoring records verbatim
      plus resolved keys (`Dimension__Text`, `Area__AreaM2`/`Area__LabelText`, `Annotation__Lines`/`Runs`,
      `Leader__SpecCode/Heading/Text`) and `Elements__LayerSvg` - each layer's markup as the editor draws it
      (`Na__LeMarkup__BuildLayerPrimitives` -> `Na__LeChrome__ToSvgMarkup`). Embedded data: images (logo, classic scan)
      are hashed into `02__Shared__Images/Image__<hash>.<ext>`; sheet pictures become `na-published:/../05__Layout__DrawingDocs__Images/...`
      references.
   4. `Na__LePubVp__Bake` per viewport in paint-plan order: one render at the export level, stepped down by halvings to
      the four tiers (`Publish__Raster__.js`), a fog mask per screen tier where the drawing has depth fog, one paint-ready
      linework SVG, all named by ONE content hash over all of the viewport's bytes.
   5. The PDF baked by the editor's own exporter with `{ strict:false, pictureCompression:'FAST' }` (`Publish__.js:308-327`).
   6. Element files, sheet file, then `Document__Manifest__.json` written **last** locally; then `POST /prune` keeps only
      what the new manifest names, scoped to that one document.
   7. With R2 ticked: upload assets, upload files, **list back and compare sizes** (`VerifyR2`), then the manifest,
      then prune that document's stale keys (`Publish__.js:396-410`).
4. Orphans (published ids no sheet produces any more) are archived and removed from R2 only when EVERY sheet is being
   published; otherwise only reported.
5. Last of all: `PublishedDocuments__Unpublished__.json` (sheet paper of every unpublished drawing), then the share-link
   record `PublishedDocuments__ShareLinks__.json` (66, v2.166.0; failure is a warning), then
   `PublishedDocuments__Index__.json` - locally, then (if ticked) to R2 in the same order (`Publish__.js:635-670`).

**What lands where (TV):**

| Item | Local (8090 server) | R2 (worker) |
|---|---|---|
| Root | `PORTAL/<yy>-Projects/<folder>/30__TrueVision__AppContent/06__Layout__PublishedDocuments/` | `NaProjectPortal/<yy>-Projects/<folder>/30__TrueVision__AppContent/06__Layout__PublishedDocuments/` |
| Index / unpublished / share record | root `PublishedDocuments__Index__.json`, `__Unpublished__.json`, `__ShareLinks__.json` | same keys, `Cache-Control: public, max-age=60, must-revalidate` |
| Per document | `<DocId>/Document__Manifest__.json`, `Document__Sheet__.json`, `01__Elements__Data/Elements__<Kind>__.json`, `02__Viewports__Vector/<Vp>__Linework__<hash>.svg`, `03__Viewports__Raster/<Vp>__Tier01__Fit__<hash>.webp`, `__Tier02__Read__`, `__Tier03__Detail__`, `<Vp>__Print__<hash>.png`, `<Vp>__FogMask__Tier0N__<Name>__<hash>.webp`, `Document__Print__<hash>.pdf` | same; content-hashed names `public, max-age=31536000, immutable` (`ApiClient__.js:1001-1007`) |
| Shared | `01__Shared__Patterns/Hatch__*__<hash>.svg`, `02__Shared__Images/Image__<hash>.<ext>` | same |
| Archive | `00__Archive__Revisions/<DocId>__Revision__<rev>.zip` | **never** (client refuses the segment, `ApiClient__.js:1032`; local write route refuses it; the R2 sync skips `00__` folders) |

Tiers (`53/Na__PublishedSchema__.json` `PublishedSchema__RasterTiers`): Tier01 Fit 2 px/mm cap 1,024 WebP q0.90
(UpToZoom 1.5); Tier02 Read 6 px/mm cap 3,072 WebP q0.92 (UpToZoom 4.5); Tier03 Detail 12 px/mm cap 5,120 WebP q0.94;
Print 20 px/mm cap 8,192 PNG (never loaded to look at).

**Transport, TV**: local `NAAPPS/ProjectVision__TrueVisionPublished__Api__.py` (routes 39-45: `POST|PUT /api/truevision/published/file`,
`GET .../file` (JSON only), `GET .../list`, `POST .../archive`, `POST .../prune`; guards: year `^\d{2}$`, project
`^[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$`, segment regex, `_is_inside`, extensions json/svg/webp/png/pdf/md/note, content
sniffing, atomic temp-then-rename, 256 MB cap). R2 through the generic worker: `PUT /r2/upload?key=&cacheControl=` (raw),
falling back to `POST /r2/write` base64; `POST /r2/list` paginated by cursor; `POST /r2/delete` (`ApiClient__.js:1059-1172`).
**No new worker route was needed in TV** (`PLAN__PublishingSystem__.md` 3.4).

**The "q" folder**: publishing writes NOTHING to a `q/` folder. `q/` (and the new `s/`) are folders at the root of the
noble-architecture.com website repo (`NaWeb/q/index.html`, `NaWeb/q/index.json`, `NaWeb/s/index.html`): `q/index.json`
is the printed-QR resolver's project index written by the ProjectVision build script, and `s/index.html` (v2.166.0)
reads it to turn `https://www.noble-architecture.com/s/?RB05&open=Sheet_004` into the project's TrueVision address.
VV has no equivalent website folders.

TV status caveats (from v2.155/v2.166 "NOT yet"): the R2 push was first exercised by Adam's live publishes; a real
revision change A->B had not been archived at v2.155; **the AA00 example folder is "the approved version and must be
brought up to the final file shape"** (it still differs from what the publisher writes - e.g. its index rows carry
`Document__Marks` where the publisher now writes `PublishedDocuments__Unpublished__.json`).

### B3. What the TV web viewer reads, and from where

Only through `52/Na__PubDoc__Urls__.js` (`For`, 194-207), which wraps `Na__AppUtils__ResolveAssetUrl`:
**live site: R2 through the CDN first** (`https://cdn.noble-architecture.com/NaProjectPortal/<yy>-Projects/<folder>/30__TrueVision__AppContent/06__...`),
GitHub Pages repository copy second; **localhost: repository copy first** (`${origin}/na-project-portal/...`), R2 second.
The worker is never read by the viewer. A 404 is never retried; a network error or 5xx once (`Urls__.js:229-297`).
Rasters and SVGs go in as `<image href>` with the first URL only (`Urls__.Direct`). Order of reads for a drawing tab
(`52/Na__PubDoc__Document__.js`): index (once per session) -> branch published/unpublished FIRST -> unpublished: the
shared unpublished-paper file once, nothing else -> published: manifest, sheet, element files, then each viewport's tier
picture, fog mask and linework. The PDF button opens the baked `Document__Print__<hash>.pdf` (`Na__PubDoc__PdfUrl`) in a
new tab and builds nothing. A loading cover (`52/Na__PubDoc__LoadingScreen__.js`, v2.156.0) rises at once, names the
drawing, cycles through what is outstanding, and lifts when every file, `<image>` load event and the fonts have settled
(350 ms before words, 600 ms minimum, 20 s cap).

**VV equivalent (recommended)**: live -> `https://cdn.noble-architecture.com/VaApps/Projects/{folderId}/06__Layout__PublishedDocuments/...`
first, GitHub Pages `https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects/{folderId}/06__...`
second (only exists if committed). Localhost -> the Flask-served copy `http://127.0.0.1:8000/Projects/{folderId}/06__...`
first, then R2. **VV's `Na__AppUtils__ResolveAssetUrl` cannot be reused unchanged for the localhost order**: its
`fallback` is the GitHub Pages URL, not a local one (`VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:464-475`; TV's
fallback is `${window.location.origin}/na-project-portal/...`, `TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:223-236`).
Ported verbatim, VV's reader on localhost would ask GitHub Pages first and then show the previously pushed R2 copy - an
author would publish, reload and see yesterday's drawing (the exact failure `Urls__.js:189-193` warns about).

**A second VV localhost trap**: `WCP/server.py:956-977` serves `index.html` with HTTP 200 for any missing path. The
reader's "a 404 is an answer" rule cannot work against it: a missing local JSON is "downloaded but could not be read as
json" (then falls through to R2), and a missing local picture is a broken `<image>` because `Direct` hands out only the
first URL. Either the new published blueprint serves published files itself (with real 404s), or `serve_static` must
return 404 under `/Projects/` - see S08-F22. *(Verifier: cross-reference corrected; it read "S08-F13".)*

**A third VV trap (added by verifier, S08-V02)**: VV's `Na__AppUtils__ResolveAssetUrl` returns `{ primary: ghUrl,
fallback: ghUrl }` whenever the project's master-index entry has `hasImages_R2 === false`
(`VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:468-473`). 11 of the 152 entries in
`WCP/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json` carry that flag (all 2025 projects, e.g.
`2025/BL-61732__Ball`). A reader that resolves published paths through it, as TV's `Urls__.For` does, would look for
published files on GitHub Pages only, where (D-S08-08 (a)) they are never committed: every drawing of those projects
would show the grey "could not be loaded" mask on the live site. The VV `Urls__.For` seam must build the R2 URL itself
from the configured R2 base (`Na__AppUtils__R2BaseUrl` / AppConfig `ProjectData__AssetUrls__R2BaseUrl`, never a
hard-coded CDN string - VV rule `.cursor/rules/08-...mdc:79`), ignoring the images flag, with GitHub Pages second.

### B4. The published schema and its versioning

`53__Data__Layout__PublishedSchema` is the only module both sides import (`README__PublishedSchema__.md`). One integer,
`Version__Schema: 1`, gates everything: the reader refuses newer AND older (`Na__PublishedSchema__Version__.js` Judge,
`ReadsIndex`, `ReadsManifest`) with a human reason that reaches the grey mask. The publisher never types the number
(`Na__PubVer__Stamp`). Adding `Files__ShareLinks` in Paths 1.1.0 was additive and did not bump it. The **readable schema
is the AA00 example folder** in the TV project portal; `Na__Test__PublishedSchema__` (59 checks) walks it.

VV adaptation points in 53 (everything else verbatim):
- `Meta__SchemaRef` / `SCHEMA REF` header lines name the TV portal path - VV must name its own example folder.
- `Version__MinReader: "v2.142.0"` is a **TV app version**; it is informational only (not read by the gate) but is
  meaningless in VV (VV is at v2.71.0) - set it to the VV release that ships the reader.
- `Na__PubVer__Stamp` writes `Publish__ByApp : 'TrueVision3D Layout Editor'` and the refusal reasons say "a newer/older
  version of TrueVision" (`Version__.js` REASON table and Stamp) - VV strings.
- `Folders__Description` and Paths.js comments say every path is "relative to a project's 30__TrueVision__AppContent";
  in VV the project-relative root is the project folder itself (`VaApps/Projects/{folderId}/`), so the same relative
  paths land at `VaApps/Projects/{folderId}/06__Layout__PublishedDocuments/...` with no code change - only the comments
  change. **Keep `Version__Schema` = 1 and every folder/file name identical**, so the two apps' publishers and readers
  stay byte-compatible and one test suite shape serves both.

### B5. PDF export

**PdfExporter: TV 1.12.0 vs VV 1.2.0.** *(Verifier correction: the two version sequences are NOT the same numbering.
VV's header log is VV's own: VV 1.0.3 = Projected Linework / Hidden Lines composite weights, VV 1.1.0 = style bands
"Ported from TrueVision3D (Edge Styles)", VV 1.2.0 = ExportRectMm "Ported from TrueVision3D (PdfExporter 1.3.0,
v2.50.0)" (`VVM/LE/60__.../PdfExporter__.js:38-58`). TV's 1.0.3 (design phase), 1.1.0 (spec wait) and 1.2.0 (site
plans) are different changes. So "VV 1.2.0" must never be read as "VV has TV 1.0.0-1.2.0": VV has TV 1.3.0 (logged as VV
1.2.0) but not TV 1.0.3 or 1.2.0.)* VV also carries, WITHOUT header entries, the behaviour of TV 1.1.0 (spec wait before
export: `Na__LeSpec__EnsureLoaded` + `Na__LeMargin__Report` imports) and 1.5.0 (named file, via the PdfFilename leaf, VV
v2.55.0). What VV lacks, by TV version (TV devlog release in brackets):

| TV ver | What | Depends on (VV status) |
|---|---|---|
| 1.0.3 | Linework projected from the viewport's design phase (`described.modelSource`) [v2.32.0] | ModelSource (TV-only) |
| 1.2.0 / 1.12.0 | Site plan fills, hatches, holed faces even-odd [v2.49.0, v2.160.0] | 21__System__SitePlanData, ShapeRings, 36__System__HatchPatternTools (TV-only) |
| 1.4.0 | Open Sans embedded via `Na__LePdfFonts__` (14-Sep-2026; no TV devlog heading names it) | PdfFonts (TV-only) - see below |
| 1.6.0 | Depth fog image over the linework [v2.94.0] | 49__System__ElevationDepthFog, `Na__LeVp2d__RenderFogForExport` (TV-only) |
| 1.7.0 | Page laid down in the Layers list's order through `Na__LePaint__Plan`; chrome built with `includeFrames:false`, each viewport's frame+caption via `BuildViewportFrame` straight over it; margin via `Na__LeMargin__Push` in the sheet step; markup per layer via `BuildLayerPrimitives` [v2.106.0] | 15__Core__Markup/PaintOrder (TV-only), SheetChrome 1.14.0, MarkupBridge 1.20.0 |
| 1.8.0 | Sheet pictures cut to print copies before drawing (`Na__LeImgPdf__Prepare`); `'picture'` and `'qr'` primitives offset [v2.116.0] | 54__Feature__SheetImages, 53__Feature__ProjectQrCode (TV-only) |
| 1.9.0 | Turned viewports print turned (`Na__LeVpRot__PdfTurn`) [v2.138.0] | 20/ViewportRotation (TV-only) |
| 1.10.0 | Overspill note regions; toast counts notes that fitted nowhere [v2.143.0] | SpecMargin 1.5.0 + SpecMargin__Column (TV-only) |
| 1.11.0 | Every viewport picture packed `'FAST'` (Sub predictor) - Chrome's/Android's PDF engine garbles a Paeth picture over ~60 MB decoded into black blocks; `options` `{ strict, pictureCompression }` used by the publisher [v2.155.0] | **none - independent** |
| (unversioned) | `Na__LePdf__LoadLibrary` exported (jsPDF alone, for the statement PDF); `EnsureJsPdf` also awaits fonts; `putOnlyUsedFonts:true`; `await doc.save(..., { returnPromise:true })` | fonts for `putOnlyUsedFonts`; rest independent |

VV PdfExporter seams to keep (`VVM/LE/60__.../PdfExporter__.js`): `42__System__DrawingViewCore` path (`:77`), console
prefix and `subject : 'ValeVision3D sheet ...'` (`:276`), `code : fields.DrawingNumber` in the file name (`:248`, VV has
no composed `DocumentId`; TV `:477` uses `fields.DocumentId`).

**PdfFilename**: header-only; verbatim. No action.

**jsPDF location**: VV injects jsPDF from the legacy page-layout folder,
`./02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js`
(`VVM/LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json:402`, `ConfigState__SheetSetup__.js:396`). TV moved its copy to
`TV/04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` in v2.155 Phase 0 (and html2canvas to
`06__Vendor__Html2Canvas__v1.4.1`), with the version-lock README saying 05/06 are not part of the coordinated 3D set.
**The two files are the same jsPDF 4.1.0 build, identical after CRLF->LF normalisation** (1,201,529 vs 1,234,402 bytes,
126 vs 32,999 CRLFs). VV already has `VV/04__Lib__ThirdParty__VersionLocked/` (01-04 + import-map index + README). Every
string to change in VV: AppConfig `:402`, SheetSetup fallback `:396`, `VV/80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:70`,
`Na__Test__SpecificationPdf__.html:31`. (`35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html:40` keeps its own
relative copy until 35 is retired - another slice; `30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js:627`
still opens that page.)

**PdfFonts and VV's Helvetica divergence (ledger row 1169, 17/19-Sep-2026).** VV has no `Na__LayoutEditor__PdfFonts__`,
no `Pdf` font block, no TTF cuts. Its sheet chrome measures and prints in jsPDF's non-embedded Helvetica
(`VVM/LE/10__.../SheetChrome__.js:19,130,151-185`), its `LayoutEditor__Style__FontFamily` is `"Helvetica, Arial, 'Open Sans', sans-serif"`,
and the title block cell widths were **re-measured in Helvetica** (ledger row 121; `Na__Test__TitleBlockCells__` fixture).
But:
- VV's own port decision **D14 says "Open Sans 300/400/600"** (`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:62`).
- VV's screen UI font is Open Sans (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css`, loaded from
  `www.noble-architecture.com/assets/...`), and `LayoutEditor__Text__FontFamily` (annotations) is
  `"'Open Sans', Helvetica, Arial, sans-serif"` - so VV annotations are Open Sans on screen and Helvetica in the PDF today.
- A non-embedded standard-14 face is substituted differently by every PDF reader: TV v2.69.0 measured "Same file, three
  faces" (PDF.js, Adam's reader, MuPDF) when its register fell back to Helvetica (devlog 9676-9775). VV's PDFs have this
  property permanently.
- The published reader's `Sheet__FontFamily` "is the one font setting that must not drift from the authoring side's"
  (`52/Na__PubDoc__Config__.json` `PubDoc__Sheet__Config`) - whatever VV decides, the reader config must carry the same
  family the editor measured with.
- **No Vale-specific typeface files exist** in `VV/`, `WCP/04__Assets__AppGraphics` or `WebApps/assets__CommonApplicationAssets`
  (searched for .ttf/.otf/.woff*). "Embedded fonts with Vale typefaces" would need font files and a licence first.
- **(Verifier) The Vale typeface IS Open Sans.** VV's own brand token is `--Vale_FontFamily : 'Open Sans', sans-serif;
  /* <-- Primary font */` (`VV/03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css:35`), and the same token
  is Open Sans in every Vale app (ValeSpec, Lantern Designer, Whitecardopedia). No other Vale face is defined anywhere in
  the Vale WebApps tree. So "embedded fonts with Vale typefaces" and "embed Open Sans" are the same answer; option (b)
  below only exists if Vale's PRINT brand differs from its web brand, which nothing in the repositories says.
- **(Verifier) No new font files are needed.** VV's screen already loads the three Open Sans cuts (300/400/600) from
  `https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/AD04_0{1,2,3}_-_Standard-Font_-_Open-Sans-*.ttf`
  (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css`). TV's `Na__LePdfFonts__` takes `FontCdnBase` and a
  per-cut `FileName` from config (TV AppConfig `LayoutEditor__Pdf__Config`), so VV can point the PDF at exactly the files
  its screen paints with (TV's own design rule: "the same CDN URL the CSS @font-face uses"). A VV-owned copy is optional,
  not a prerequisite.
- **(Verifier) Lower re-flow risk than stated.** Open Sans sets NARROWER than Helvetica: VV ledger row 121 re-measured
  TV's Open Sans cell widths in the wider Helvetica and "All still hold". Switching to Open Sans therefore cannot make a
  cell overflow that fits today; the re-measure is a confirmation, not a redesign.

Recommendation: port PdfFonts and embed **Open Sans** (VV's D14 face, its screen face and its brand token), with
`FontCdnBase`/`Fonts[].FileName` pointing at the AD04 TTFs VV's @font-face already uses (or a VV-owned copy, Adam's
choice) rather than TV's `na-apps/01__Assets__NaApps__CommonAssets` path; switch VV's `LayoutEditor__Style__FontFamily` to Open Sans-first; re-measure the title block rows and update
`Na__Test__TitleBlockCells__`; wire SheetChrome measuring (SheetChrome slice), SpecPdf (`await EnsureLoaded` + `Install` -
VV ledger 1169 already notes "this module needs no change beyond installing the cuts") and the exporter. Other TV callers
of PdfFonts that arrive with other slices must be wired at the same time: `57__Feature__ScrapbookParametric/...Panel__ScrapbookParametric__.js`
(awaits the cuts before measuring linked labels, TV :215, :400-412; S06a) and `51__Feature__DrawingRegister/...Register__Pdf__.js`
(S07a). Decision D-S08-03.

### B6. Web viewer - VV 1.1.0 vs TV 1.2.0 (+ the unversioned v2.155/v2.156 integration)

`git diff --no-index -w` shows VV lacks, in `80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js`:
- the published path: `Na__LeVw__EnsureIndex`, `Na__LeVw__ShowPublished` (`TV:519-570`: loading cover up at once, index
  once, paper sized from the index row or the sheet's layout, `Na__LeSurface__ShowPublished`, fit, `Na__PubDoc__Build`
  at the fitted density, one `innerHTML`, `WatchPaint`, `Finish`), `Na__LeVw__WatchZoom` (tier swap on
  `ZOOM_SETTLED_EVENT`), `Na__LeVw__Release` (previous drawing's pictures dropped first), token-guarded late shows;
- the PDF button opening the baked PDF or toasting "This drawing has no published PDF yet." (`TV:323-347`);
- Share in the dock (1.2.0, `TV:352-359`, `Na__LeShareUi__Open`);
- the register document and `ShowRegister` (TV-only Drawing Register);
- teardown cancelling the loading cover and releasing pictures.
TV's header DEVLOG for this file records only 1.0.0-1.2.0; the v2.155/v2.156 changes went in without a version entry
(TV-side header gap). TV imports `Na__LeModel__IsSitePlanSheet` (line 84) and never uses it (dead import - VV must not
copy it, VV has no such export).

*(Verifier)* TV's `Na__LeVw__Documents()` (`TV WebViewer__.js:181-189`) NO LONGER splits site plans out - it maps every
sheet in model order, adds the specification, then the register (its comment still says "then site plans"; stale). VV's
ledger row ("TrueVision splits site plan sheets out") is therefore out of date too. The only VV seam left in
`Documents()` is the absent `register` entry. The other imports the 1.2.0 file adds already exist in VV:
`Na__LeLayout__Solve`, `Na__LeSurface__GetPixelsPerMm`, `Na__LeSurface__GetElements`, `Na__LeModel__GetTabLabel` (all
exported by VV). Missing: `ShowPublished`, `ZOOM_SETTLED_EVENT`, `GetDocumentId`, 52 and 66.

The other four files are header-only - no work beyond the TV-side port notes, which still say "Back-port : candidate
(ValeVision has no web viewer)" although VV has had it since v2.58.0.

Wiring the published viewer in VV needs, outside the viewer: ModeController viewer guards (S08-F15; verifier corrected the reference from "S08-F24"), SheetSurface
`ShowPublished` + `ZOOM_SETTLED_EVENT` (S08-F25; VV `SheetSurface__.js` 1.6.0 has neither, and has no single layer
`Stack` element - its paper holds `Frames`, `ChromeSvg`, `MarkupSvg`, `FocusSvg`, `Handles` separately, lines 157-174, so
`ShowPublished` must hide those), and the VV loader's first-drawing wait (S08-F26: `Na__LeMode__WaitForFirstDrawing`,
`VVM/.../ModeController__.js:595-600`, waits on `Na__LeVeil__DrawingSettled`, which in a viewer that renders nothing only
ends at `GIVEUP_MS` 2,500 ms, `LoadingVeil__.js:97`).

### B7. Sharing (66) and VV's own 61__Feature__ShareProjectLink

TV v2.166.0: every read view has a **Share** button; one press copies a link that opens that one document read-only
on any device. Link: `https://www.noble-architecture.com/s/?RB05&open=Sheet_004` (project CODE + permanent document
KEY only). Keys are rules in code (`66/Na__LayoutEditor__Share__Links__.js`): a drawing's **sheet id** (never its
number), `Statement_<Doc__Id>`, `Specification`, `Register`; parsing is liberal (`spec`, `statement-2`, `sheet_4`, then
document id or drawing number). The **share-link record** `06__Layout__PublishedDocuments/PublishedDocuments__ShareLinks__.json`
(Adam's "dynamic manifest") is written by Publish Drawings just before the index and by every statement publish; the
buttons hand out the address on record; `Share__Open` reads a key's target from it before its own rules. Buttons: web
viewer dock beside PDF (WebViewer 1.2.0), editor toolbar beside Download PDF (Toolbar 1.24.0, always the live address),
specification bar in Read (SpecEditor Bar 1.4.0), register and statements (TV-only). `Share__Open` is started from
`TV/Index.html:904,1733-1738` straight after the editor is asked to start; a reader is shown the document as soon as the
sheets are known (before the 3D model loads), with the loading screen lifted and put back if they go to the 3D Model tab
(listens for `na-app-scene-ready`, dispatched by `TVM/01__AppCore/Na__AppFlow__LoadingSequence.js:443`).

VV has none of 66. VV's `61__Feature__ShareProjectLink` is a different, project-level feature: it builds
`?project=<code>` on **the current page's origin** (`61/Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js:31-40`,
`new URL(window.location.href)`) and a branded Vale email. The Tools menu item labelled "Share Project Link"
(`VV/index.html:606-619`) is actually `naSendEmailMenuButton`, driven by `62__Feature__EmailWorkers`
(`62/...UiInteractionLogic__.js:60`), which reuses 61's `GetShareContext`, email HTML and download helpers. 61's own
`Na__Feature__ShareProjectLink__Initialize` looks for `naShareProjectLinkMenuButton`, which no longer exists in
`index.html`, and is called nowhere - so 61's UI files (`UiInteractionLogic__`, `FormOverlay__` and its stylesheet) look
dead while its URL and email builders are live (read, not run). *(Verifier: confirmed; two refinements - the dead
overlay's stylesheet is still imported by `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:61`, so retiring
the UI files means removing that import too; and `63__Feature__AppNotificationEmail/...PayloadBuilder__.js:25,63` also
reuses 61's `GetShareContext`, so 61's URL builder has two live callers.)* Keep 61's live parts (VV-only, Vale client workflow);
note that from localhost it hands out a localhost link - the fault TV's Share avoids by taking the base from config
(`Share__Config__.json` `Link__BaseUrlNote`).

**VV does not need a `s/` resolver to get stable links.** VV's `?project=` already resolves a bare numeric code, a
folder name or a full folderId through the R2 master index (`VV/.../ProjectLoader.js:260-279,335-351`), and a project
rename updates that index. So the VV link form can be
`<VV live app URL>?project=<code>&open=<key>` with the same keys and the same `open` parameter, configured in VV's
`Na__LayoutEditor__Share__Config__.json` (`Link__BaseUrl`, `Link__QueryPattern`). The VV live app is GitHub Pages
(`https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/`, seen in `VVM/63__Feature__AppNotificationEmail/...GenerateEmail__Logic__.js:37`);
a short resolver only becomes worth building if Vale gets its own domain (D-S08-05).

**VERIFIER CORRECTION (S08-V01) - a bare project code is NOT a safe link key in VV, and TV's link builder rejects VV's
usual `?project=` value.**
- **Codes collide.** 13 VV numeric project codes are shared by two or three projects (schemes) in the master index:
  3038 (`2026/3038__Gordon__Scheme-03`, `-04`), 55164, 56662, 57994, 59908, 61511, 61721, 61922, 62104 (three
  `Fenner Scheme-0n`), 62361, 63568, 63578 (`Yates__Orangery`, `Yates__Porch`), 63592. `LookupIndexEntry` resolves a bare
  code to ONE of them (newest year wins; on a tie the later index entry wins, `ProjectLoader.js:196-200`). Sheet ids
  repeat across projects (`Sheet_001`...), so `?project=3038&open=Sheet_004` can silently open the OTHER scheme's
  drawing - a wrong document in front of a client.
- **VV's `?project=` is normally the folderId.** Whitecardopedia opens VV with `?project=<folderId>`
  (`WCP/02__Src__AppModules/61__Feature__PwaAppHelpers/Na__Feature__PwaAppHelpers__ValeVisionLinkRouting__Logic__.js:53`,
  `11__Feature__ProjectViewer/...ImageCarousel.jsx:95`), and VV's own R2 rule says a project "must be openable via
  `?project=<folderId>`" (`VV/.cursor/rules/08-R2IndexArchitecture--ValeVision3D-SSOT-.mdc:15`). TV's
  `Na__LeShareLink__CurrentProject()` (`66/Share__Links__.js:309-317`) takes the raw `GetProjectCodeFromUrl()` and keeps it
  only if it matches `CODE_PATTERN = /^[A-Za-z0-9]{2,12}$/` (:119). `2026/3047__Doous` fails, so `UrlFor` returns `''` and
  **every Share button hands out no link** in a session opened from Whitecardopedia. Share__Links is therefore
  `port_adapted`, not verbatim.
- Recommended VV form (D-S08-13): `<VV live app URL>?project={folderId}&open={documentKey}` (folderId URL-encoded, the
  canonical VV key; unique - no duplicate folder names in the index), with a VV `CurrentProject()` that takes the
  resolved folderId (and the index entry's `projectCode` for display only) and a project-token pattern that admits
  `/`, `_`, `-`, `.` and the three legacy space-containing folder names. Trade-off for Adam: a folderId link breaks if the
  project is later RENAMED (the rename handler moves the R2 folder and updates the index); a code link survives renames
  but is ambiguous for 13 codes. A middle path is the folder name without the year (unique today), which
  `LookupIndexEntry` also resolves.

### B8. Transport for VV (DIV-4) - what VV's worker and Flask mirror need so VV publishes into ITS OWN storage

**What VV has today**: worker `whitecardopedia-editor-api` (`WCP/CloudflareWorker/src/index.js` 1.5.0) - every non-health
request must carry `X-Editor-Api-Key` (`index.js:112-116,148`); semantic per-project routes matched by suffix before the
greedy save route (`:160-214`); `POST .../assets` takes a JSON base64 body, path-guarded to
`PresentationMode/Thumbnails|LayoutEditor/(Linework|Snapshots)`, 25 MB decoded ceiling, `cacheControl:'no-cache, max-age=0'`,
and **bumps the GLOBAL build manifest** `VaApps/Index/Na__BuildVersion__Manifest__.json` on every write
(`handlers/CloudflareHandler__ProjectAsset__.js:51-52,140-148`; `ProjectEditor__.js:59,160-171`). CORS methods are
`GET, POST, OPTIONS` (`CloudflareHelper__Cors__.js:72`). The API key reaches the browser only from Flask's
`GET /api/editor-config` (`WCP/server.py:334-361`), so VV R2 writes are possible only where the Flask server runs - a
stronger posture than TV's (see S08-F17; verifier corrected the reference from "S08-F38"). Client: `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (R2 first, Flask mirror
second, base64).

*(Verifier)* Both workers bind the SAME bucket, `noble-architecture-cdn`, on the same Cloudflare account
(`WCP/CloudflareWorker/wrangler.jsonc` and `TV/80__CloudflareIntegration/CloudflareWorker/wrangler.toml`). What keeps TV's
unauthenticated worker out of `VaApps/` is only its `R2_PREFIX` check, which every one of its six routes applies
(read :93-94, write :163-164, list :217-220, delete :270-271, upload :311-312, copy :360-361 of
`CloudflareHandler__R2__.js`). Any TV hardening must keep that prefix check; VV must never be given a route on TV's worker.

**What publishing needs that VV cannot do today**: raw uploads of WebP/PNG/SVG/JSON/PDF into a new folder, files larger
than 25 MB (an A1 print PNG or a baked PDF can be), a LIST of one document's keys with sizes (for the verify step and the
scoped prune), a DELETE of named keys, correct `Cache-Control` per file class, and **no build-manifest bump** (a bump
changes `?v=` on every project's `project.json` and GLB URLs - `ProjectLoader.js:251-254,407-408,497-519` - so a publish
would make every Vale client re-download every model).

**Proposed VV worker routes** (new handler `WCP/CloudflareWorker/src/handlers/CloudflareHandler__PublishedDocuments__.js`,
routes added to `index.js` BEFORE the generic `^/api/editor/projects/(.+)$` save route, same auth and CORS helpers):

| # | Method and path | Request | Guards | R2 key | Stored metadata | Response |
|---|---|---|---|---|---|---|
| W1 | `POST /api/editor/projects/{folderId}/published/file?path=<rel>` | **raw body** (streamed to R2 as TV's `/r2/upload` does), `Content-Type` of the file | key; folderId `^\d{4}/[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$`; rel: 1-6 segments, each `^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$`, no `.`/`..`, first segment not `00__Archive__Revisions`, last ends `.json/.svg/.webp/.png/.pdf/.md`; 1 B to ~95 MB (Cloudflare's request ceiling is 100 MB on the free/pro plans) | `VaApps/Projects/{folderId}/06__Layout__PublishedDocuments/{rel}` | `contentType` from the extension when the header is missing or generic (TV v2.172 lesson: `.webp` went up as `application/octet-stream`); `cacheControl` = `public, max-age=31536000, immutable` when the name matches `__[0-9a-f]{10}\.(svg\|webp\|png\|pdf)$`, else `public, max-age=60, must-revalidate` | `{ ok, key, path, bytes, publicUrl }`; **no `na_write_build_manifest`** |
| W2 | `POST /api/editor/projects/{folderId}/published/list` | JSON `{ document?, cursor? }` | key; document matches the segment regex | prefix `VaApps/Projects/{folderId}/06__Layout__PublishedDocuments/[document/]` | - | `{ ok, objects:[{ path, size }], truncated, cursor }`, `path` relative to the published root (the form a manifest names files in) |
| W3 | `POST /api/editor/projects/{folderId}/published/delete` | JSON `{ document, paths:[rel,...] }` | key; every path must start with `<document>/` (**server-side scope**, which TV only enforces in the client, `Publish__Transport__.js:253`); never a root file, never the archive; at most 1,000 | those keys | - | `{ ok, removed:[], failed:[] }` |

POST with a raw body avoids editing the shared CORS helper; if PUT is preferred, `CloudflareHelper__Cors__.js:72` must add
it. Deploying the worker needs Adam's wrangler login (VV D36 precedent).

*(Verifier) Guard details the table must carry:*
- The folderId pattern above refuses three real projects: `2025/FN-62104__Fenner Scheme-01`, `-02`, `-03` have a SPACE in
  the folder name (master index). Either admit a single space inside the folder segment (never in a published path), or
  record that those three legacy projects cannot publish (S08-V06). TV's `PROJECT_PATTERN` has the same limit.
- W2's and W3's `document` (and the Flask `archive`/`prune` `document` parameter) must use TV's stricter
  `DOCUMENT_PATTERN = ^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$` (no dot, 3-80 chars, `ProjectVision__TrueVisionPublished__Api__.py:89`),
  not the 1-160-char segment regex: the publisher only checks the looser `Na__PubSchema__IsDocumentId`
  (`53/Paths__.js:107,250-251`), so an id the Flask archive/prune refuses would fail half-way through a publish. The VV
  document-id adapter (D-S08-06) must emit ids that pass the stricter pattern.
- Path segments: at most SIX (TV `_relative_parts`, `len(parts) > 6` refused); the extension allowlist in TV also has
  `.note` (unused by the publisher).

**Proposed VV Flask mirror** (new blueprint `WCP/Server__ValeVisionPublished__Api__.py`, a port of
`NAAPPS/ProjectVision__TrueVisionPublished__Api__.py`, registered in `WCP/server.py` beside the scrapbook blueprint at
`:91-97`; the server must be restarted - its own `--reboot` console command - before the routes answer):
`GET /api/valevision/published/list`, `GET|POST|PUT /api/valevision/published/file`, `POST /api/valevision/published/archive`,
`POST /api/valevision/published/prune`, taking the same query shape as TV's (`project-folder`, `year`, `path`,
`document`, `revision`) so VV's Transport differs from TV's by its constants only. Root:
`WCP/Projects/{year}/{folder}/06__Layout__PublishedDocuments` (VV has no content sub-folder); `YEAR_PATTERN` must become
`^\d{4}$` (TV `^\d{2}$`); keep every other guard (segment regex, `_is_inside`, extension allowlist, byte sniffing, atomic
writes, never-overwrite archive, document-scoped prune). Do NOT reuse `server.py`'s `get_project_path`
(`server.py:128-160`): with a `/` in the id it joins the path with no inside-the-tree check.

**Proposed VV client utility**: `VVM/03__AppUtils/Na__AppUtils__R2PublishedDocs__.js` beside the other R2 utilities
(`Upload(relativePath, blob)`, `List(documentId)`, `Delete(documentId, paths)`, `IsConfigured()`), reusing
`Na__AppUtils__R2FetchWorkerConfig` (`R2SaveProjectJson__.js:233`). Because VV's worker config is fetched asynchronously
while TV's `Na__LePubNet__R2Ready()` is synchronous and is called without `await` by `Publish__.js:585` and the share
manifest, VV's `Transport__` must prefetch the config in `LocalReady` and answer `R2Ready` from the cache.

**Write order - TV vs VV convention (D-S08-02)**: TV publishes local-first, R2 only on a deliberate tick, manifest
last, index last. VV's convention is "R2 = SSOT, Flask mirror second" (`R2AssetUpload__.js:13-17`, `.cursor/rules/08-...`).
The publish pipeline's guarantees (archive before replace, verify before manifest, document-scoped prune, index last)
depend on TV's order; a published document is a deliverable built locally and reviewed before a client sees it.
Recommendation: keep TV's order for publishing only, and record it as a deliberate VV exception.

**CRITICAL - VV's project sync would delete published drawings from R2.** `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`
`na_purge_stale_r2_images` (`:659-680`) lists `VaApps/Projects/{folderId}/` **with no Delimiter** (`:667`, so every
sub-folder is included; also unpaginated, first 1,000 keys only) and deletes every `.png/.jpg/.jpeg/.webp` whose bare file
name is not one of the project folder's TOP-LEVEL images (`na_collect_local_image_names`, `:645-656`, `iterdir()`). Called
on every sync (`:926`, `:959`). Every published tier picture, print PNG and fog mask would be removed on the next sync,
leaving manifests that name missing files (the reader then shows "This drawing could not be loaded"). By the same
reading it already threatens `PresentationMode/Thumbnails/*.webp` and `LayoutEditor/Snapshots/*.png` written by VV's asset
route (not verified against R2 - the bucket was not listed). TV's sync avoids this by skipping `00__` folders and its
publisher never sweeps. Fix before VV's first R2 publish: purge top-level keys only (`Delimiter='/'`), or skip
`06__Layout__PublishedDocuments/`, `LayoutEditor/`, `PresentationMode/` and `00__*` prefixes.

*(Verifier, code re-read: `:628-680`, calls `:926` and `:959`.)* Confirmed: `list_objects_v2(Bucket, Prefix=f"{r2_prefix}/")`
with no `Delimiter` and no continuation, keep-set from `wcp_dir.iterdir()` top-level files only, match on the bare file
name. **The exposure is live today, not only after publishing**: the local mirror (which the asset route keeps in step
with R2) holds 25 `PresentationMode/Thumbnails/*.webp` across 7 projects and 18 `LayoutEditor/Snapshots/*.webp` in
`2026/3047__Doous`; each is a deletion candidate on R2 at the next full or images-only sync of its project. Those 43 are
committed to git, so (once pushed) the live app would fall back to the GitHub Pages copy (one R2 404 per asset, possibly
stale) - degraded, not blank. Published files (not committed, D-S08-08 (a)) and S07a's planned sheet-image folder would have NO
fallback. So WP-S08-04 is urgent on its own merits and is a prerequisite of S07a's sheet images as well as of
publishing. The bucket itself was not listed, so whether a purge has already removed anything is unverified.

**Rename/delete**: `CloudflareHandler__ProjectRename__.js` moves every key under the old prefix with `httpMetadata`
preserved (`na_copy_object`), so a published folder follows a renamed project with its cache headers; the index's
informational `Project__Folder` would then be stale until the next publish (low). Project delete removes it (correct).

### B9. Service worker and caching

TV v2.155 added a `tv-published-<token>` cache class: content-hashed published assets cache-first with an LRU cap of 240,
JSON network-first, PDFs not cached (`TVM/62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js:688-707,851-860,1084,1128-1136`),
and bumps the token on every release that adds imports (v2.155 `2026-09-23-03`, v2.156 `-04`, v2.166 `2026-09-29-01`).
VV runs under the **shared Whitecardopedia/ValeVision worker** `WebApps/Na__Pwa__ServiceWorker__.js` with its logic in
`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (token
`2026-09-18-1`, `:229`; owned origins include `https://cdn.noble-architecture.com`, `:251-254`). Without a change,
published files on the CDN would be classified as: `.json` -> `other` (passthrough), `.webp`/`.pdf` -> `other`
(passthrough), `.png`/`.svg` -> `shell` (stale-while-revalidate into the shell cache, `:249,397-399`). It works, but
without TV's offline behaviour and with print PNGs able to land in the shell cache if ever fetched. Add a
`wpwa-published-` class (same patterns as TV's, rooted at `06__Layout__PublishedDocuments`) and bump the token with the
release - Adam's call, because a bump evicts every Vale app's caches including models (ledger 152-160).
**Ledger row 1189 ("ValeVision has no service worker") is wrong** and contradicts the same ledger at 137-160.
*(Verifier: confirmed - `VV/index.html:19,34-44` links the Whitecardopedia PWA manifest and registrar. The same stale claim
sits in code: `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:121` "ValeVision3D has no Service Worker, so freshness is
achieved by ... ?v=". Correct both. TV's own token has moved on to `2026-09-29-03`, `TrueVision__Pwa__ServiceWorker__Logic__.js:682`.)*

### B10. Identity and branding adaptations (never a blind copy)

- Console prefixes `[TrueVision3D ...]`, header banners, `Publish__ByApp`, `Behaviour__AppVersion: "v2.166.0"` and the
  built-in floor `appVersion : 'v2.166.0'` (`Publish__.js:99`), `Debug__PrefixNote`, `Version__MinReader`.
- Publish failure wording "give it a drawing number in the register" (`Publish__.js:257`) - VV has no register; say the
  Drawing No. field in the Sheet panel.
- Share config `Link__BaseUrl` (NA website `s/`), `Labels__NotRecorded` ("publishing the drawings records it" - fine),
  `Labels__OpenMissingDrawing` ("here is its current document register" - VV has no register: open the first sheet or
  the specification instead).
- Unpublished grey panel text ("Drawing has not yet been published officially", Adam's words) and loading labels are
  practice-neutral and can stay; `Label__Fog`, `Label__SheetImage`, `Label__Pattern` name TV-only features (harmless).
- Publish dialog inline CSS uses `"Open Sans","Segoe UI"` and ink `#172b3a`; VV's sheet ink is the same `#172b3a`
  (both AppConfigs) and VV's UI face is Open Sans - no change needed. The share box CSS uses `--Na_Le_Chrome`,
  `--Na_Le_ChromeRule`, `--Na_Le_Ink`, `--Na_Le_InkMuted`, `--Vale_FontFamily`, all of which VV defines
  (`VVM/LE/10__.../Na__LayoutEditor__Styles__Surfaces__.css`, `VV/03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css`).
- Fixture/example content: the AA00 example is Noble Architecture data ("Mr & Mrs Example", AA00 document ids). As a
  schema fixture it carries no client-facing branding, but it should be replaced by a real VV publish of the VV reference
  project (`2026/3047__Doous`, VV D37) as soon as publishing works.
- **(Verifier, S08-V04) Identity strings written INTO published data and links, missed above** (each would ship
  Noble Architecture / TrueVision identity into Vale's R2 data or into a link a Vale client receives):
  - `'Meta__SchemaRef' : 'na-project-portal/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/06__Layout__PublishedDocuments'`
    hard-coded in the DATA the publisher writes: `65/Publish__.js:355` (every manifest), `:522` (the index), `:549` (the
    unpublished file), `65/Publish__Sheet__.js:271` (every element file) and `:408` (every sheet file); and
    `66/Share__Manifest__.js:123` (`SCHEMA_REF`, the share record). Also in `52/Na__PubDoc__Config__.json:10`,
    `53/Na__PublishedSchema__.json:10`, `65/Publish__Config__.json:10`.
  - `'Meta__Note' : 'Published by TrueVision. ...'` in every element file (`65/Publish__Sheet__.js:272`). So
    Publish__Sheet is NOT "header only" (module table corrected below).
  - `66/Share__Links__.js:127` built-in floor `baseUrl : 'https://www.noble-architecture.com/s/'` and
    `queryPattern : '?{projectCode}&open={documentKey}'`: if the Share config fails to load, a VV Share button hands out
    a Noble Architecture link. Links is NOT verbatim.
  - `66/Share__Button__.js:320` native share-sheet title fallback `box.Name || 'Noble Architecture'`.
  - `66/Share__Manifest__.js:122` `APP_VERSION = 'v2.166.0'` (stamped on a statement-triggered record).
  - `53/Na__PublishedSchema__.json:22` `Folders__Description` and `:43` `Files__ShareLinksNote` ("TrueVision v2.166.0"),
    `53/Version__.js:66-67,151` (already listed), console prefixes `[TrueVision3D PubDoc]`, `[TrueVision3D Share]`,
    `[TrueVision3D Publish]`, `[TrueVision3D PublishedSchema]`.
  - `65/Publish__.js:527` `'Project__ContentFolder' : '30__TrueVision__AppContent/' + root` and `:526`
    `'Project__Folder' : GetYearFromUrl() + '-Projects/' + folder` - with the VV facades these would write the
    nonsense `2026-Projects/3047__Doous`; VV writes `Project__Folder: '2026/3047__Doous'` and
    `Project__ContentFolder: '06__Layout__PublishedDocuments'`.

### B11. Dependencies on other slices (why 65 and the exporter cannot simply be copied today)

Static named imports that VV cannot resolve today (each makes the module fail to link):

| Importer (TV) | Missing in VV | Owner (other slice) |
|---|---|---|
| PdfExporter 1.12.0, Publish__Sheet, Publish__Viewports | `Na__LePaint__Plan` / `STEP_*` (`15__Core__Markup/Na__LayoutEditor__PaintOrder__.js`, TV-only 1.0.0) | markup / paint order |
| PdfExporter, Publish__Sheet | `Na__LeMarkup__BuildLayerPrimitives` (MarkupBridge 1.20.0; VV 1.10.0 has `BuildSheetPrimitives` only) | markup |
| PdfExporter, Publish__Viewports | `Na__LeChrome__BuildViewportFrame`, `Build(..., { includeFrames:false })` (SheetChrome 1.14.0; VV 1.5.0) | sheet surface / chrome |
| PdfExporter, Publish__Viewports | `Na__LeRings__FacesFromRings` (`15/ShapeRings` 1.1.0, TV-only) | vector tools |
| PdfExporter | `Na__LeHatch__DrawPdf` (`36__System__HatchPatternTools`, TV-only) | hatch |
| PdfExporter, Publish__Viewports | `Na__LeVp2d__RenderFogForExport`, `Na__LeVp2d__SitePlanDrawing` (Viewport2d 1.16.0; VV 1.8.0 exports neither) | viewports / depth fog / site plans |
| PdfExporter, Publish__Viewports, WebViewer | `Na__LeModel__IsSitePlanViewport`, `Na__LeModel__IsSitePlanSheet` | sheet data / site plans |
| PdfExporter | `Na__LeImgPdf__Prepare` (`54__Feature__SheetImages`), `Na__LeVpRot__*` (`20/ViewportRotation`) | sheet images, viewport rotation |
| Publish__Sheet | `Na__LeArea__Is/Value/NameOf/FormatArea` (`59__Feature__FloorAreas`, TV-only) | floor areas |
| Publish__, Share__Manifest/Button/Open, WebViewer | `Na__LeModel__GetDocumentId` (TV SheetRecords `Na__LeRec__DocumentId` 1604-1608: stored, else project code + phase + number) | drawing numbering / register |
| Share__Manifest/Button/Open | `52__Feature__StatementWriter/.../Na__LayoutEditor__Statement__Data__.js` | statement writer (TV-only) |
| Share__Open | `Na__LeMode__OpenRegister`, `Na__LeMode__OpenStatements` (ModeController 1.32.0), `Na__DrawData__IsLoaded` (TV 40/ProjectData) | mode controller, drawing core |
| WebViewer 1.2.0 | `Na__LeSurface__ShowPublished`, `Na__LeSurface__ZOOM_SETTLED_EVENT` (SheetSurface 1.13.0) | sheet surface |
| Publish__, Transport, Urls, Share__Links/Manifest | `Na__AppUtils__GetProjectFolderFromUrl`, `Na__AppUtils__GetYearFromUrl` | VV ProjectLoader (DIV-4, this slice proposes a facade) |

The planner therefore has two orders available: (1) land those slices first and then port 65/PdfExporter verbatim
(recommended - it is what "identical" means), or (2) if Adam wants the phone-safe reader sooner, have the owning slices add
null-returning stub exports (`RenderFogForExport` -> `null`, `SitePlanDrawing` -> `null`, `IsSitePlanViewport` -> `false`,
`IsSitePlanSheet` -> `false`) and port 65 with them - but PaintOrder, BuildLayerPrimitives, BuildViewportFrame and
FloorAreas are not stubbable without changing what the published sheet looks like (D-S08-11).

---

## (c) Module-by-module table

`state`: tv-only / drifted / header-only / vv-only / absent-both. Paths relative to each app root.

| TV path | TV ver | VV path | VV ver | State | What VV lacks or does differently (TV devlog) | Recommended action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | 1.12.0 | same path | 1.2.0 (header; behaviour of TV 1.1.0/1.3.0/1.5.0 present) | drifted | 1.0.3 design phase (v2.32), 1.2.0/1.12.0 site plans (v2.49, v2.160), 1.4.0 Open Sans, 1.6.0 fog (v2.94), 1.7.0 paint order (v2.106), 1.8.0 pictures (v2.116), 1.9.0 rotation (v2.138), 1.10.0 regions (v2.143), 1.11.0 FAST packing + options (v2.155), LoadLibrary export, returnPromise save | Two steps: now port 1.11.0 + options + LoadLibrary + returnPromise (port_adapted); later port_whole_reapply_vv | Console prefix; subject "ValeVision3D sheet"; `42__System__DrawingViewCore` path; filename `code : fields.DrawingNumber` until VV DocumentId exists | PdfFonts; PaintOrder; MarkupBridge 1.20; SheetChrome 1.14; ShapeRings; Hatch; Viewport2d 1.16; SheetImages; ViewportRotation; ModelSource; SpecMargin 1.5 |
| `.../60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js` | 1.0.0 | same | 1.0.0 | header-only | nothing | no_action | - | - |
| `.../60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js` | 1.0.0 | - | - | tv-only | No embedded font: every PDF prints non-embedded Helvetica (ledger 1169 deliberate divergence); TV v2.69 register fix shows the reader-substitution fault | port_verbatim (module) after D-S08-03 | Console prefix; config paths point at VV-owned TTF location | ConfigState SheetSetup `GetPdfSetup` fonts + `PdfFontCuts`; AppConfig Pdf block; SheetChrome measuring; SpecPdf; PdfExporter |
| `.../50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js` | 1.0.0 | same | 1.0.0 | drifted (28 lines) | `await Na__LePdfFonts__EnsureLoaded()`, `Install(doc)`, `await save({returnPromise:true})` | port_adapted with PdfFonts | `42__` drawing-core path | PdfFonts |
| `.../65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__.js` | 1.1.0 | - | - | tv-only | Whole publish orchestration (v2.155) + share record (v2.166) | port_adapted | Console prefix; appVersion floor; `Project__Folder` = VV folderId (`2026/3047__Doous`) not `yy-Projects/folder`; `Project__ContentFolder` = `06__Layout__PublishedDocuments`; failure wording (no register) | 53; Transport; PdfExporter 1.11 options; Sheet; Viewports; Raster; 66 Manifest; `Na__LeModel__GetDocumentId` |
| `.../65__.../Na__LayoutEditor__Publish__Config__.json` | 1.0.0 | - | - | tv-only | Behaviour + labels | port_adapted | `Behaviour__AppVersion` = VV release; `Meta__SchemaRef` | - |
| `.../65__.../Na__LayoutEditor__Publish__Panel__.js` | 1.1.0 | - | - | tv-only | The Publish Drawings dialog (v2.155, share line v2.166) | port_verbatim | Console prefix only; entry point differs (no register) | Publish__; entry point decision D-S08-04 |
| `.../65__.../Na__LayoutEditor__Publish__Raster__.js` | 1.0.0 | - | - | tv-only | Tier ladder by halvings, fog mask, SHA-256 names; refuses a browser that writes PNG for WebP | port_verbatim | Header only | 53 |
| `.../65__.../Na__LayoutEditor__Publish__Sheet__.js` | 1.0.0 | - | - | tv-only | Sheet + element files with resolved keys and per-layer SVG; portable images | ~~port_verbatim (after deps)~~ **port_adapted (after deps)** - verifier | ~~Header only~~ **`Meta__SchemaRef` (:271, :408) and `'Published by TrueVision'` (:272) written into every element/sheet file; `Na__LePubSheet__IMAGES_DIR = '05__Layout__DrawingDocs__Images'` (:81) must equal VV's sheet-image folder (D-S08-14 vs S07a D-S07a-07)** | PaintOrder; MarkupBridge 1.20 (`BuildLayerPrimitives`; `FormatDimension`/`DimensionValueMm` VV has); SpecMargin `Push` (VV has); SpecData__Document `GetNoteEntry` (VV has); FloorAreas; SheetChrome `ToSvgMarkup` (VV has) |
| `.../65__.../Na__LayoutEditor__Publish__Viewports__.js` | 1.1.0 | - | - | tv-only | Per-viewport bake (v2.155), holed site faces (v2.160) | port_verbatim (after deps) | Header only | Viewport2d 1.16 (fog, site plan exports); SheetChrome `BuildViewportFrame`; ShapeRings; `IsSitePlanViewport` |
| `.../65__.../Na__LayoutEditor__Publish__Transport__.js` | 1.0.0 | - | - | tv-only | Local filing + R2 + verify + scoped prune | port_adapted (same exports) | `Na__LePubNet__API = '/api/valevision/published'`; R2 via `Na__AppUtils__R2PublishedDocs__`; R2Ready answered from a prefetched config; restart hint names `WCP/server.py` | VV worker W1-W3; Flask blueprint; client util; ProjectLoader facade |
| `.../66__Feature__DocumentSharing/Na__LayoutEditor__Share__Links__.js` | 1.0.0 | - | - | tv-only | Key rules, liberal parser, BuildUrl (v2.166) | ~~port_verbatim (rules)~~ **port_adapted** - verifier | Keys and `Parse` verbatim (keep `Register` and `Statement_` reserved); base/pattern come from config. **Adapt**: built-in floor `baseUrl`/`queryPattern` (:125-129, NA `s/`), `CurrentProject()` (:309-317) and `CODE_PATTERN` (:119) - VV's `?project=` is normally the folderId, which the TV pattern rejects (no link at all); project token per D-S08-13 | ProjectLoader facade; D-S08-13 |
| `.../66__.../Na__LayoutEditor__Share__Manifest__.js` | 1.0.0 | - | - | tv-only | The share-link record | port_adapted | Statement imports and the statement listener removed (no Statement Writer); register entry omitted; `Project__Folder` VV form | 52 Urls; 53; 65 Transport; DocumentId |
| `.../66__.../Na__LayoutEditor__Share__Button__.js` | 1.0.0 | - | - | tv-only | The Share box (copy before await, Safari) | port_adapted | Statement/register kinds removed; native share-sheet title fallback `'Noble Architecture'` (:320) -> a Vale string (verifier) | Links; Manifest; DevGate (VV has) |
| `.../66__.../Na__LayoutEditor__Share__Open__.js` | 1.0.0 | - | - | tv-only | Opens `?open=<key>` in Read view; reader shown before the model | port_adapted | Started by the VV loader only when `?open=` is present (keeps the lazy start-up); missing drawing -> first sheet or specification (no register); `Na__DrawData__IsLoaded` or the VV `LOADED_EVENT`; needs `na-app-scene-ready` | ModeController (`OpenSpecification`, `Enter`, `Ready`); SpecEditor (VV has `SetView`, `VIEW_READ`); VV LoadingSequence event |
| `.../66__.../Na__LayoutEditor__Share__Config__.json` | 1.0.0 | - | - | tv-only | Base URL, pattern, waits, labels | port_adapted | `Link__BaseUrl` = VV live app; `Link__QueryPattern` = `?project={projectCode}&open={documentKey}`; register wording | D-S08-05 |
| `.../66__.../Na__LayoutEditor__Styles__Share__.css` | - | - | - | tv-only | Share box styles | port_verbatim | Linked by the VV loader (`Na__LeLoad__STYLESHEETS`) before the WebViewer sheet, not by the CSS index | Loader STYLESHEETS |
| `.../66__.../README__DocumentSharing__.md` | - | - | - | tv-only | Design doc | port_adapted | VV link form, no `s/`, no register/statements | - |
| `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` | 1.2.0 | same | 1.1.0 | drifted | Published path (v2.155), loading screen (v2.156), Share in dock (v2.166), baked-PDF button, release/tier swap | port_whole_reapply_vv | Keep VV `Documents()` (no site-plan split, no register); drop dead `IsSitePlanSheet` import; console prefix | 52; SheetSurface `ShowPublished`/`ZOOM_SETTLED_EVENT`; 66 Button; ModeController guards; DocumentId |
| `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Drawings__.js` | 1.1.0 | same | 1.1.0 | header-only | nothing | no_action | - | - |
| `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Spec__.js` | 1.0.0 | same | 1.0.0 | header-only | nothing | no_action | - | - |
| `.../80__Feature__WebViewer/Na__LayoutEditor__WebViewer__TouchControls__.js` | 1.1.0 | same | 1.1.0 | header-only | nothing | no_action | - | - |
| `.../80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css` | - | same | - | header-only | nothing (VV links it last via the loader, documented) | no_action | - | - |
| `02__Src__AppModules/52__System__Layout__PublishedDocuments/Na__PubDoc__Document__.js` | 1.0.0 | - | - | tv-only | Index/document loading, one-string sheet build, progress events | port_verbatim | Console prefix | 53; Urls; Paint; Sheet; Elements; Viewports; Unpublished |
| `52__.../Na__PubDoc__Urls__.js` | 1.0.0 | - | - | tv-only | One URL builder, R2-first live, repo-first localhost, no retry on 404 | port_adapted | `FromPage` from `?project=` via VV `NormalizeProjectFolderId` (or the facade); localhost first URL = `${origin}/Projects/{folderId}/{path}` (Flask) because VV's `ResolveAssetUrl` fallback is GitHub Pages; **live: build the R2 URL from the configured R2 base, NOT through `ResolveAssetUrl`, whose `hasImages_R2:false` gate (11 projects) returns GitHub Pages only (verifier, S08-V02)** | VV ProjectLoader |
| `52__.../Na__PubDoc__Viewports__.js` | 1.0.0 | - | - | tv-only | Tier ladder, byte budget, no decode retry | port_verbatim | Header only | 53; Paint |
| `52__.../Na__PubDoc__Sheet__.js`, `Na__PubDoc__Paint__.js`, `Na__PubDoc__Elements__.js`, `Na__PubDoc__Unpublished__.js` | 1.0.0 | - | - | tv-only | Mark list emitter, SVG primitives, element painters (dimension arrangement must be checked against the editor), grey mask | port_verbatim | Console prefixes | 53 |
| `52__.../Na__PubDoc__LoadingScreen__.js` | 1.0.0 | - | - | tv-only | The drawing loading cover (v2.156) | port_verbatim | Header only; reuses `na-le-veil` classes VV already has (`Na__UiFeature__Styles__LoadingOverlays__.css:293-332`) | - |
| `52__.../Na__PubDoc__Config__.json` | 1.0.0 | - | - | tv-only | Reader settings | port_adapted | `Sheet__FontFamily` = VV authoring family (D-S08-03) - **verbatim (`'Open Sans', ...`) if D-S08-03 (a) lands BEFORE the first publish; VV's Helvetica stack if VV publishes first, because element text is line-broken at publish with the authoring metrics (verifier)**; `Debug__PrefixNote`; `Meta__SchemaRef` | D-S08-03 |
| `52__.../Na__PubDoc__Styles__Main__.css` | - | - | - | tv-only | Host-only styles; NOT linked by the TV app (only by the harness) | port_verbatim | Leave unlinked, as TV does | - |
| `52__.../README__PublishedDocuments__.md` | - | - | - | tv-only | Design doc | port_adapted | VV paths | - |
| `02__Src__AppModules/53__Data__Layout__PublishedSchema/Na__PublishedSchema__.json` | 1.0.0 (schema 1) | - | - | tv-only | The contract | port_adapted (keys verbatim) | `Meta__SchemaRef`, `Version__MinReader`, description text about `30__TrueVision__AppContent` | - |
| `53__.../Na__PublishedSchema__Paths__.js` | 1.1.0 | - | - | tv-only | Every path builder | port_verbatim | Comment lines only | - |
| `53__.../Na__PublishedSchema__Version__.js` | 1.0.0 | - | - | tv-only | Version gate + stamp | port_adapted | `Publish__ByApp` and reason strings say ValeVision3D | - |
| `53__.../README__PublishedSchema__.md` | - | - | - | tv-only | Parity rule + example link | port_adapted | VV example folder path | - |
| `02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (Published region 977-1175) | 1.5.0 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__R2PublishedDocs__.js` (new) | - | permanent divergence | VV has no published client | build_vv_transport | VV worker routes W1-W3, `X-Editor-Api-Key`, raw POST | VV worker |
| `80__CloudflareIntegration/CloudflareWorker/src/*` (generic `/r2/*`, open) | 1.1.0 | `WCP/CloudflareWorker/src/index.js` + new `handlers/CloudflareHandler__PublishedDocuments__.js` | 1.5.0 | permanent divergence | No published routes | build_vv_transport | See B8 W1-W3; no manifest bump; server-side scoped delete | wrangler deploy (Adam) |
| `NAAPPS/ProjectVision__TrueVisionPublished__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionPublished__Api__.py` (new) + `WCP/server.py` registration | - | permanent divergence | No local filing routes | build_vv_transport | `/api/valevision/published/*`; 4-digit year; `Projects/{year}/{folder}/06__...` | Flask restart |
| - | - | `02__Src__AppModules/61__Feature__ShareProjectLink/*` (8 files) | - | vv-only | Project-level share + email used by 62 EmailWorkers; link from `window.location`; its own Initialize/FormOverlay look dead (button id gone from index.html) | keep_vv_divergence (live builders); ask Adam before retiring the dead UI files | Optional: take the live base from the Share config | - |
| `80__Testing__PrototypeEnvironment/Na__Test__PublishedSchema__.test.mjs` | 1.1.0 | - | - | tv-only | 59 checks against the example folder | port_test | VV fixture path; 6A against VV share config | 53; VV fixture |
| `80__Testing__PrototypeEnvironment/Na__Test__PublishedReader__.test.mjs` + `__Harness__.html` | 1.0.0 | - | - | tv-only | 63 checks + import walk | port_test | VV fixture; live-URL checks rewritten to `VaApps/Projects`; import walk allowlist adds VV's `Na__AppUtils__ResilientLoad__` leaf; forbidden folders add VV `40__System__2dElevationsView`, `41__System__CrossSectionView`, `42__System__DrawingViewCore`, `31__System__VideoStudio` | 52; 53 |
| `80__Testing__PrototypeEnvironment/Na__Test__ShareLinks__.test.mjs` | 1.0.0 | - | - | tv-only | 68 checks incl. s/ resolver in a sandbox | port_test | Drop the s/ + q/ region (no resolver) or replace it with the `?project=` form against VV's master index copy | 66 |
| `80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html` | - | same | - | drifted (jsPDF path, fonts) | jsPDF path; fonts | port_adapted | New jsPDF path; expect embedded font | WP-S08-01/03 |
| - | - | new `80__Testing__PrototypeEnvironment/Na__Test__PublishedApi__.test.py` (+ server) | - | new | No test of the VV local filing routes; TV has none either | port_test (new) | Pattern from VV `Na__Test__ScrapbookApi__.test.py` / `__ScrapbookServer__.py` (with `sys.dont_write_bytecode`) | Flask blueprint |

---

## (d) Wiring notes (every edit outside the new folders)

1. **VV ModeController** (`VVM/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`): Enter `:539` -> `if (!Na__LeVw__IsViewerMode()) Na__LeSurface__SetSheet(sheet)`; `:540-542` -> viewer calls `Na__LeVw__ShowDrawing(sheet)` and only the editor schedules `Na__LeNav__Fit`; `Na__LeMode__OnSheetsChanged` `:772-786` -> TV's viewer branch (`TV:1124-1137`); `Na__LeMode__WaitForFirstDrawing` `:595-600` -> resolve at once in viewer mode (the published cover handles the wait); import `Na__LeVw__ShowRegister` only if/when the register lands. ModeController belongs to another slice - these are the S08 seams it must carry.
2. **VV SheetSurface** (`.../10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js`): add `Na__LeSurface__ShowPublished(page)` (TV `:458-503`) adapted to hide VV's `Frames`/`ChromeSvg`/`MarkupSvg`/`FocusSvg`/`Handles` (no `Stack` in VV) and `Na__LeSurface__ZOOM_SETTLED_EVENT` (TV 1.10.0, v2.111). Interim if the SheetSurface slice lands later: the viewer listens to `ZOOM_EVENT` debounced by `Tiers__SwapDebounceMs` (220 ms).
3. **VV Loader** (`.../01__Core__Loader/Na__LayoutEditor__Loader__.js`): `Na__LeLoad__STYLESHEETS` `:125-134` add `66__Feature__DocumentSharing/Na__LayoutEditor__Styles__Share__.css` BEFORE the WebViewer sheet (which must stay last); on start-up, when `?open=` is present, load the editor and `import('../66__.../Na__LayoutEditor__Share__Open__.js')` then `Na__LeShareOpen__Initialize` (TV does this from `Index.html:1733-1738`; VV must not import 66 on the start-up path).
4. **VV index.html**: only if the loader does not own the `?open=` start (prefer the loader); nothing else.
5. **VV LoadingSequence** (`VVM/01__AppCore/Na__AppFlow__LoadingSequence.js:476-488`): dispatch `window.dispatchEvent(new CustomEvent('na-app-scene-ready'))` where the overlay is hidden, as TV does at `TVM/01__AppCore/Na__AppFlow__LoadingSequence.js:443` (Share__Open, and TV's PWA installer, listen for it).
6. **VV 42/ProjectData** (`VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`): add `Na__DrawData__IsLoaded()` (TV `40/...:573`) or adapt Share__Open to the VV `Na__DrawData__LOADED_EVENT`.
7. **VV SheetModel/SheetRecords**: `Na__LeModel__GetDocumentId(sheet)` - decision D-S08-06. It names every published folder and the archive zips and is the share fallback key, so it must be settled before the first publish.
8. **VV ProjectLoader** (`VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js`): add `Na__AppUtils__GetProjectFolderFromUrl()` and `Na__AppUtils__GetYearFromUrl()` as VV-meaning facades over `NormalizeProjectFolderId(GetProjectCodeFromUrl())` (folder part and 4-digit year), so 52/65/66 port with their imports unchanged; document the same-name/VV-meaning seam in the PORT NOTE. *(Verifier: in practice VV's `?project=` is the URL-encoded folderId (Whitecardopedia link routing), which the facades can split without the index; for a bare code or folder name `NormalizeProjectFolderId` is synchronous but only correct once `Na__AppUtils__InitMasterIndex()` has resolved (before that it returns `2026/<code>`), so the facades must only be called after the project load - true for 52/65/66, which run after the sheets arrive. `GetProjectCodeFromUrl()` keeps its VV meaning (raw `?project=`) - it is NOT a project code, which is why Share__Links must be adapted, D-S08-13.)*
9. **VV ConfigState SheetSetup + AppConfig**: `GetPdfSetup` gains `fontFamily`, `fontBasePath`, `fontCdnBase`, `fonts` and the private `PdfFontCuts` + `FALLBACKS.pdfFonts` (TV `:547-559`); `LayoutEditor__Pdf__Config` gains `FontFamily`, `FontBasePath`, `FontCdnBase`, `Fonts[]`; `JsPdfScriptPath` moves (WP-S08-01); `LayoutEditor__Style__FontFamily` per D-S08-03.
10. **VV SheetChrome**: measuring document gets the cuts installed and `ApplyPdfFont` (TV `SheetChrome__.js:192,232-258,1020`) - SheetChrome slice.
11. **Entry points for Share**: WebViewer dock (in the file); `40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` after Download PDF (VV `:355`; TV 1.24.0 `:576-582`, label fallback `ShareDrawing`); `50__.../Na__LayoutEditor__SpecEditor__Bar__.js` after Print in Read (VV `:184-187`; TV 1.4.0 `:204-210`).
12. **Entry point for Publish**: TV opens it from the Drawing Register (`Register__Editor__.js:90,539`). VV interim: the Layout Editor Dev section (`VVM/LE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js`, beside "Bake Snapshots and Linework" `:342` and "Export PDF" `:345`, via a dynamic `import()` of the panel) - localhost-only, matching "never built for a reader".
13. **WCP worker**: new handler + routes in `WCP/CloudflareWorker/src/index.js` before `:214`; optional `PUT` in `CloudflareHelper__Cors__.js:72`; wrangler deploy.
14. **WCP Flask**: `WCP/server.py` registers `valevision_published_api` beside `:96`; header route list `:20-40` updated; restart. Fix or bypass the `serve_static` 200-for-missing fallback `:956-977` for published paths.
15. **WCP sync pipeline**: `AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:659-680` purge scoped to top-level keys.
16. **Shared SW**: `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` `wpwa-published-` cache + patterns + owned prefix + activate keep-list + token bump.
17. **ValeCodebase .gitignore**: publish output policy (D-S08-08).
18. *(Verifier)* **Single owner per shared seam** (the same edits are specified in sibling slices; do not let two swarm agents edit them in parallel): ModeController viewer guards and `WaitForFirstDrawing` (S03a); SheetSurface `ShowPublished` + `ZOOM_SETTLED_EVENT` (S03b, inside its SheetSurface 1.13.0 port); `GetDocumentId`/`GetPhase` (S03b D-S03b-01 + S07a register port); `na-app-scene-ready` in LoadingSequence (S09 WP-S09-08); sheet-image storage folder (S07a D-S07a-07 vs D-S08-14); PdfFonts callers in the Parametric Scrapbook (S06a) and Register PDF (S07a). S08's WPs should depend on those WPs rather than re-implement them.

---

## (e) UI notes

- **Web viewer dock**: TV order is `< n/N > Fit - + PDF Share` (Share added v2.166 beside PDF; under the register the
  dock shares the register). VV's dock today reads `< 1 / 3 Fit - + PDF >` (VV devlog v2.58.0). After porting, PDF opens
  the baked file in a new tab and toasts "This drawing has no published PDF yet." for an unpublished one.
- **Loading cover** (v2.156): instant opaque cover, "D02 - Front Elevation is now loading", faint status line cycling
  the outstanding jobs; reuses `na-le-veil`, `loading-spinner` (present in VV). The VV loader's own full-screen loading
  screen ("Drawing the Views - n of m") must not stack on it (wiring note 1/3).
- **Unpublished drawing**: real paper, title block and notes margin with a grey panel "Drawing has not yet been
  published officially" and the reason line.
- **Share box**: anchored popover, link already copied, Copy link / Share... (native share sheet) / Open; warnings for
  unpublished drawings; an author-only note when the project has no record yet.
- **Publish Drawings dialog**: modal (z-index 10050), list with states, All/None, "Also push to R2 (clients see it)",
  progress log, results with archive/orphan/warning lines and "Share links recorded for N document(s)".
- **Zoom ceiling**: the reader stops at 800% in both apps today; TV's authoring 6400% (v2.135, Navigation 1.3.0) is the
  navigation slice's.
- **Tab strip**: TV v2.158 (TabStrip 2.0.0: 3D Model / Drawings menu / Specification / Document Register / Design
  Statements) and v2.83 top-bar fold (already in VV v2.70.0 per ledger 1235) belong to the UI slices; the viewer's
  `Documents()` list will need the register entry only if the register is ported.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S08-01 | Where do VV's published documents live? | (a) `VaApps/Projects/{folderId}/06__Layout__PublishedDocuments/` (and `WCP/Projects/{folderId}/06__...` locally) - schema names verbatim; (b) `.../LayoutEditor/PublishedDocuments/` to match VV's existing `LayoutEditor/Linework|Snapshots` asset folders (changes `Folders__Root` in the shared contract) | (a): the schema stays byte-identical in both apps and the paths need no code change because VV's project-relative root is the project folder itself |
| D-S08-02 | Publish write order in VV | (a) TV's: local first, R2 only on the deliberate tick, verify, manifest last, index last; (b) VV's R2-first two-phase convention | (a), recorded as a deliberate exception to the R2-first rule (the rule is about project data; a published document is a deliverable reviewed locally first) |
| D-S08-03 | VV PDF/sheet typeface | (a) port PdfFonts, embed Open Sans (VV D14, VV's screen face and VV's brand token `--Vale_FontFamily`) from the AD04 TTFs VV's @font-face already loads, or a VV-owned copy; switch the sheet font to Open Sans-first; re-measure title block cells; (b) a different Vale PRINT face (none is defined anywhere in the Vale apps - needs files and a licence); (c) keep non-embedded Helvetica (ledger 1169 status quo) | (a). (c) leaves every Vale PDF rendering in a different face in every reader (TV v2.69 measured three faces from one file) and keeps screen annotations (Open Sans) different from print. *(Verifier: (a) IS the Vale typeface - `--Vale_FontFamily` is Open Sans in every Vale app; and Open Sans sets narrower than Helvetica, so no title block cell that fits today can overflow.)* Decide BEFORE the first publish: the reader's `Sheet__FontFamily` must match the face the published text was broken with |
| D-S08-04 | Where is Publish Drawings opened in VV? | (a) port the Drawing Register (another slice) and use its bar, as TV; (b) interim entry in the Layout Editor Dev section; (c) a toolbar button | (a) for an identical experience; (b) until the register lands |
| D-S08-05 | VV share link form | (a) `<VV live app URL>?project=<code>&open=<key>`, resolved by VV's R2 master index, base and pattern in config; (b) a short resolver page like TV's `s/` on a Vale-controlled host | (a) now; (b) only if Vale moves to its own domain (the base is config, the keys are permanent). *(Verifier: keep the base-URL part of (a) but NOT a bare code as the project token - see D-S08-13.)* |
| D-S08-06 | What is a VV document id? | (a) the stored Drawing No. (sanitised to the segment regex), falling back to VV's default `<code>-<order>`; (b) TV's three-fact composition (project code + phase + number) once the register/phase work is ported | Decide before the first publish: (a) as the interim adapter, migrating to (b) only together with the register; a change of id makes new folders and archives the old ones. *(Verifier: (1) this is the SAME decision as D-S03b-01 and S07a's register port (WP-S07a-01 flips the title block to `DocumentId`); decide once for all three slices, and if the register/phase port is scheduled before the publisher, skip the interim adapter so no published folder ever has to migrate. (2) The adapter must emit ids matching TV's stricter local `DOCUMENT_PATTERN ^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$` (no dot, 3-80 chars), which the archive and prune routes enforce; the segment regex alone is not enough.)* |
| D-S08-07 | Statements and the register in VV's share and viewer | (a) omit both kinds now, keep their key constants reserved; (b) wait for those features | (a) |
| D-S08-08 | Commit policy for published output in the ValeCodebase repo | (a) ignore `Projects/**/06__Layout__PublishedDocuments/` (R2 is the reader's source; the GitHub Pages fallback then has no copy); (b) commit everything except `00__Archive__Revisions`; (c) commit all | (a) or (b); never commit archive zips (TV's `**/00__Archive/` rule does not match `00__Archive__Revisions` either - a TV-side note) |
| D-S08-09 | Fix the Whitecardopedia sync purge (shared Vale pipeline) | (a) purge top-level keys only (`Delimiter='/'`); (b) skip named prefixes (`06__Layout__PublishedDocuments/`, `LayoutEditor/`, `PresentationMode/`, `00__`) | (a) - it is what the function's own docstring intends ("superseded images/thumbnails" at the project root); must precede VV's first R2 publish |
| D-S08-10 | Shared SW: add a published cache class and bump the token? | (a) yes with the publishing release; (b) no class, rely on HTTP cache headers | (a); the bump is Adam's call because it evicts every Vale app's caches |
| D-S08-11 | Order of work: wait for the dependency slices, or stub to get the phone-safe reader sooner? | (a) wait, then port 65/PdfExporter verbatim; (b) stub `RenderFogForExport`/`SitePlanDrawing`/`IsSitePlan*` now | (a); (b) only for fog/site plans - PaintOrder, BuildLayerPrimitives, BuildViewportFrame and FloorAreas cannot be stubbed without changing the published sheet |
| D-S08-12 | Size ceiling and upload mode of the new worker route | (a) raw streamed body up to ~95 MB; (b) base64 JSON as the existing asset route (25 MB, whole file in Worker memory) | (a) |
| D-S08-13 *(verifier)* | Which project token does a VV Share link carry? | (a) the folderId `2026/3047__Doous` (VV's canonical key, unique, what Whitecardopedia and the VV R2 rule use; breaks if the project is later renamed); (b) the folder name without the year `3047__Doous` (unique today, resolved by `LookupIndexEntry`, also breaks on rename); (c) the bare numeric code (survives renames, but 13 VV codes are shared by 2-3 schemes, so a link can open the wrong project) | (a) or (b); never (c) while codes collide. Whichever: adapt `Share__Links` `CurrentProject`/`CODE_PATTERN`/built-in floor, keep the document keys and `open` parameter verbatim |
| D-S08-14 *(verifier)* | Where do VV sheet pictures live (the publisher points published sheets at them)? | (a) TV's `05__Layout__DrawingDocs__Images/<DocumentId>/` directly under the project folder, beside `06__Layout__PublishedDocuments` (65/52/53 verbatim; same philosophy as D-S08-01 (a)); (b) S07a's D-S07a-07 `LayoutEditor/SheetImages/<DocumentId>/`, which requires VV to change `Na__LePubSheet__IMAGES_DIR` (Publish__Sheet:81) and the schema test's expectation (`Na__Test__PublishedSchema__` :443) | Decide once with S07a. (a) keeps the publisher, reader and tests verbatim; if (b) is kept, it is a one-constant VV seam - the reader resolves any `/../<path>` reference generically (`53/Paths__.js:454-467`) |

---

## (g) Proposed work packages

Order: WP-01, WP-02, WP-04 and WP-13 can start at once. WP-05/06 (transport) and WP-07 (schema) next. WP-08 (reader)
after WP-07. WP-09 (publisher) after WP-02, 06, 07 and the dependency slices. WP-10 (viewer) after WP-08 and the
SheetSurface/ModeController seams. WP-11 (sharing) after WP-08 and WP-09. WP-03 (fonts) after D-S08-03 and with the
SheetChrome slice. WP-12 (SW) with WP-10. WP-14 last.

### WP-S08-01 - Move jsPDF to the version-locked vendor folder (S)
Files VV: `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` (new copy of the 35 file),
`Vale__Dependencies__VersionLock__README__.md`, `Vale__Dependencies__ImportMap__Index__.json` (note only; UMD, not a map entry).
Hot: `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json:402`, `LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js:396`,
`80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:70`, `Na__Test__SpecificationPdf__.html:31`.
Acceptance: every jsPDF string resolves to a real file; Download PDF and the specification Download work; both harnesses
load jsPDF; `Na__Verify__Exports__`/`ModuleGraph__` pass; the legacy copy in 35 stays until 35 is retired.

### WP-S08-02 - PdfExporter interim parity: FAST packing and publish options (S)
Port TV 1.11.0's `Na__LePdf__AddPicture` ('FAST' unless `options.pictureCompression`), `options` through
`BuildDocument`/`DrawViewport`/`ExportSheet` with `strict`, the `LoadLibrary`/`EnsureJsPdf` split and `LoadLibrary`
export, `await doc.save(name, { returnPromise:true })`; catch the header DEVLOG up (VV 1.3.0) listing what is present and
what is deliberately absent. Hot: `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`.
Acceptance: a sheet with a large plan underlay opens in Chrome's PDF viewer with no black blocks; the file's image
streams use the Sub predictor; `options.strict` throws on a missing source; exports unchanged plus `LoadLibrary`.

### WP-S08-03 - Embedded PDF fonts (M-L, after D-S08-03)
New `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js` (verbatim below the header); TTF cuts (300/400/600) in a
VV-owned location. Hot: AppConfig `LayoutEditor__Pdf__Config` (+fonts) and `LayoutEditor__Style__FontFamily`,
`ConfigState__SheetSetup__.js` (`GetPdfSetup`, `PdfFontCuts`, fallbacks), `10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js`
(measuring doc + `ApplyPdfFont`, coordinated with the SheetChrome slice), `50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js`,
`PdfExporter__.js` (`EnsureLoaded` + `Install` + `putOnlyUsedFonts`), `Na__Test__TitleBlockCells__.test.mjs`/`.html` fixture,
`52__.../Na__PubDoc__Config__.json` `Sheet__FontFamily` (when 52 exists).
Acceptance: PyMuPDF/pdf.js report `OpenSans` Type0 Identity-H EMBEDDED in a sheet PDF, the specification PDF and (later)
a published PDF; text still extracts; no title block cell overflows on any paper size (cells re-measured); screen and PDF
caption truncation agree. Tests: TitleBlockCells re-run; SpecificationPdf harness.
*(Verifier)* `FontCdnBase` + `Fonts[].FileName` can name the AD04 Open Sans TTFs VV's `Na__CoreUi__Styles__Fonts__.css`
already loads (no new files); `FontBasePath` may be left empty or point at a VV-owned copy. Coordinate the other
PdfFonts callers as they arrive: S06a's Parametric Scrapbook panel (TV awaits the cuts before measuring linked labels)
and S07a's `Register__Pdf__`, and S03a's loader wait (TV's first-open veil waits for "PDF text metrics"). Risk is lower
than "Medium": Open Sans sets narrower than the Helvetica VV measures with today, so a cell that fits today cannot
overflow. This WP must land BEFORE WP-S08-09's first real publish (or WP-S08-08 ships `Sheet__FontFamily` = VV's
Helvetica stack and is changed again later).

### WP-S08-04 - Stop the sync pipeline deleting sub-folder pictures (S, critical, before any VV R2 publish)
*(Verifier: urgent on its own - the purge already targets the 25 PresentationMode thumbnails and 18 Layout Editor
snapshots mirrored under 7 projects, and it would also delete S07a's planned sheet images. Schedule it first, independent
of the publishing programme; it blocks S07a's sheet-image R2 writes too.)*
Hot: `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:659-680` (and the GLB purge
`:626-640` for consistency). Acceptance: a dry run against a fake S3 client listing keys under
`06__Layout__PublishedDocuments/`, `LayoutEditor/Snapshots/`, `PresentationMode/Thumbnails/` deletes none of them and
still deletes a stale top-level image; the list call paginates.

### WP-S08-05 - VV server side: worker routes and the Flask mirror (L)
New: `WCP/CloudflareWorker/src/handlers/CloudflareHandler__PublishedDocuments__.js` (W1 file, W2 list, W3 delete per B8),
`WCP/Server__ValeVisionPublished__Api__.py` (port of the TV API; 4-digit year; `Projects/{year}/{folder}/06__...`).
Hot: `WCP/CloudflareWorker/src/index.js` (routes before the save route; header list), optionally
`WCP/CloudflareWorker/src/CloudflareHelper__Cors__.js:72`, `WCP/server.py` (blueprint registration, header list,
`serve_static` 404 for missing files under `/Projects/`), `D:/10_CoreLib__ValeCodebase/.gitignore` (D-S08-08).
Acceptance: unauthenticated calls 401; a path with `..`, an archive segment, a bad extension or a seventh segment is 400 *(verifier: was "sixth"; TV allows six segments, `_relative_parts` refuses `len(parts) > 6`)*; a W3/archive/prune `document` that fails `^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$` is 400; the three `FN-62104__Fenner Scheme-0n` folders either publish or are refused with a stated reason (S08-V06);
W1 stores `contentType` and the right `cacheControl`, does not touch `VaApps/Index/Na__BuildVersion__Manifest__.json`;
W2 pages by cursor and returns paths relative to the root; W3 refuses any path outside `<document>/`; Flask writes are
atomic, sniffed, never overwrite an archive, prune only one document; worker deployed by Adam (wrangler); Flask restarted.
Tests: new `Na__Test__PublishedApi__.test.py` (Flask test client, `sys.dont_write_bytecode = True`); a node script
exercising the handler with an in-memory R2 double.

### WP-S08-06 - VV client transport utility (S-M)
New `VVM/03__AppUtils/Na__AppUtils__R2PublishedDocs__.js` (`IsConfigured`, `Upload`, `List`, `Delete`; raw POST with
`X-Editor-Api-Key`; types from extension). Hot: `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` (the
`GetProjectFolderFromUrl`/`GetYearFromUrl` facades, D-S08 wiring note 8).
Acceptance: upload/list/delete round-trip against `wrangler dev`; `Na__Verify__Exports__` passes.

### WP-S08-07 - Published schema (53) and the VV fixture (M)
New `VVM/53__Data__Layout__PublishedSchema/` (4 files: verbatim keys; seams per B4). VV example folder: initially a copy of
TV's AA00 fixture (schema data only) at a VV location (e.g. `WCP/Projects/2026/AA00__ExampleProjectStructure/06__Layout__PublishedDocuments`
or under `VV/80__Testing__PrototypeEnvironment/`), replaced by a real VV publish of `2026/3047__Doous` after WP-09.
Tests: port `Na__Test__PublishedSchema__.test.mjs` (VV paths; region 6A against the VV share config).
Acceptance: all checks pass; schema version 1 in both apps; the README links the VV example both ways.

### WP-S08-08 - Published reader (52) (M)
New `VVM/52__System__Layout__PublishedDocuments/` (11 files). Seams: `Na__PubDoc__Urls__.js` (`FromPage`, localhost
Flask-first URL), `Na__PubDoc__Config__.json` (`Sheet__FontFamily`, prefixes), console prefixes.
Tests: port `Na__Test__PublishedReader__.test.mjs` + `__Harness__.html` (VV fixture, VV CDN URLs, extended import walk).
Acceptance: every fixture document builds; an unpublished drawing fetches nothing; the import walk reaches no renderer,
projection, model loader or image exporter; tier ladder steps, holds one tier, respects the byte budget, never retries a
failed tier; on VV localhost the first URL is the Flask copy and on the live origin the R2 CDN.
*(Verifier: the live first URL must be the R2 CDN for EVERY project, including the 11 whose index entry has
`hasImages_R2:false` - build it from the configured R2 base, not through `ResolveAssetUrl` (S08-V02). `Sheet__FontFamily`
follows D-S08-03 (verbatim Open Sans only if WP-S08-03 has landed).)*

### WP-S08-09 - Publisher (65) and its entry point (L)
New `VVM/LE/65__Feature__DocumentPublishing/` (7 files; Transport adapted, Publish__/Config adapted, the rest verbatim).
Hot: `LE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` (interim "Publish drawings..." entry, D-S08-04),
`LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js` + `SheetModel__Sheets__.js` + `SheetRecords__.js`
(`GetDocumentId`, D-S08-06), `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` (options from WP-02).
Depends: WP-02, 05, 06, 07; PaintOrder, MarkupBridge 1.20, SheetChrome 1.14, ShapeRings, FloorAreas, Viewport2d exports
(or D-S08-11 stubs). *(Verifier: also D-S08-03/WP-S08-03 (the face the published text is broken with), D-S08-06 merged
with D-S03b-01, D-S08-14 (sheet-image folder, with S07a) and WP-S08-04 (purge fix). VV seams to add to the Publish__
adaptation: `Meta__SchemaRef` at :355, :522, :549; `Project__Folder` / `Project__ContentFolder` at :526-527; in
Publish__Sheet `Meta__SchemaRef`/`Meta__Note` at :271-272, :408 and `IMAGES_DIR` at :81.)*
Acceptance: `3047__Doous` publishes locally with no failures; every manifest file exists at its size; re-publishing the
same revision overwrites and prunes; a revision change writes `00__Archive__Revisions/<id>__Revision__<old>.zip` and never
overwrites it; with the R2 tick, list-back sizes match before the manifest goes up, the index goes up last, the build
manifest is untouched, and only that document's stale keys are removed; the baked PDF opens in Chrome without garbling.
Tests: the reader harness pictures of the published sheets match the editor (dimension arrangement checked against a
screenshot, as `Na__PubDoc__Elements__.js` demands).

### WP-S08-10 - The web viewer shows published drawings (M)
Hot: `LE/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` (port_whole_reapply_vv from TV 1.2.0, keeping VV's
`Documents()`), `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` (viewer guards, `WaitForFirstDrawing`),
`LE/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js` (`ShowPublished`, `ZOOM_SETTLED_EVENT`),
`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (first-drawing wait in viewer mode).
Acceptance (TV v2.155 test, with `?authoring=off`): opening every drawing makes 0 WebGL draw calls and 0 snapshot renders;
the PDF button opens the baked PDF (200, application/pdf) or toasts; tiers swap on zoom with no draws; the previous
drawing's images are released; a tab pressed mid-load takes the cover over; the loader screen does not wait 2.5 s for
renders that never come; with authoring on, the editor path is unchanged.
*(Verifier: the ModeController seams (viewer never SetSheet, `WaitForFirstDrawing` skip) are ALSO specified by S03a
(its module table "`:752-755`, `:1131-1138` viewer never SetSheet", and its wait contract "document views and the viewer
skip"), and `ShowPublished`/`ZOOM_SETTLED_EVENT` are inside S03b's SheetSurface 1.13.0 port. Give each seam ONE owner -
recommended: S03a owns the ModeController hunks and S03b owns SheetSurface; WP-S08-10 then only ports WebViewer 1.2.0 and
depends on those two WPs instead of editing the same files in parallel.)*

### WP-S08-11 - Document sharing (66) and its buttons (L)
New `VVM/LE/66__Feature__DocumentSharing/` (7 files; ~~Links verbatim~~ Links adapted (verifier, D-S08-13); Manifest/Button/Open/Config/README adapted; CSS
verbatim). Hot: `LE/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` (dock Share - if not already in WP-10),
`LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` (Share after Download PDF), `LE/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js`
(Share after Print, Read only), `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (STYLESHEETS + `?open=` start),
`VVM/01__AppCore/Na__AppFlow__LoadingSequence.js` (`na-app-scene-ready`), `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`
(`IsLoaded`), `LE/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__.js` (record call already in the TV file).
Tests: port `Na__Test__ShareLinks__.test.mjs` without the s/ + q/ region (or with a VV `?project=` region).
*(Verifier: depends on D-S08-13 - Links is port_adapted (`CurrentProject`, `CODE_PATTERN`, the built-in floor
`baseUrl`/`queryPattern` at :125-129); Button's `'Noble Architecture'` share title (:320); Manifest's `APP_VERSION`/
`SCHEMA_REF` (:122-123). Acceptance must include: a session opened as `?project=2026%2F3047__Doous` (the Whitecardopedia
form) hands out a working link, and a link for `2026/3038__Gordon__Scheme-03` never opens Scheme-04.)*
Acceptance: each button copies the configured live link (never a localhost one); a link opens the drawing's Read view
in the viewer before the 3D model loads and the loading screen returns on the 3D Model tab; the specification link
opens Read; a deleted sheet's link opens the first sheet/specification with a toast; publish writes the record locally
and (ticked) to R2 just before the index.

### WP-S08-12 - Shared service worker published cache (S, Adam's sign-off)
Hot: `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`.
Acceptance: hashed published assets are cache-first with an LRU cap, published JSON network-first, PDFs passthrough;
the activate handler keeps the new bucket; token bumped and logged.

### WP-S08-13 - Ledger and documentation (S)
VV: `ValeVision__PARITY__TrueVisionLedger__.md` - a new return-trip section for TV v2.155/156/166 (52, 53, 65, 66,
PdfFonts, PdfExporter 1.4-1.12, WebViewer 1.2.0) with per-row parity states; correct row 1189 (the shared SW); add the
transport rows (W1-W3, Flask blueprint) as DIV-4 divergences. VV devlog entries per release. TV-side (backport_to_tv,
headers only): the "ValeVision has no web viewer" port notes in `80__Feature__WebViewer/*` and `66/Share__Links__.js`;
PdfExporter's stale "Parity: verbatim" PORT NOTE; the missing v2.155/v2.156 DEVLOG entries in `WebViewer__.js` and
`SheetSurface__.js`; the dead `IsSitePlanSheet` import; `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` DIV-4
("TrueVision: no Flask at all" is no longer true: the 8090 server carries six API modules); the AA00 example folder
still not at the final file shape (v2.155 NOT YET).

### WP-S08-14 - PdfExporter full re-sync to TV 1.12.0 (M, last)
After the dependency slices land: take TV's whole file and re-apply the VV seams (console prefix, subject, `42__` path,
filename code until DocumentId). Acceptance: diff against TV is header + seams only; every PDF feature present in VV
(paint order, frames over viewports, turned viewports, pictures, regions, fog, site plans when they exist) prints as the
screen shows; tests from the owning slices pass.

---

## Evidence index (quick reference)

- TV publish plan: `TV/TrueVision__PLAN__PublishingSystem__.md` 1-537 (status 7-12; folders 228-292; publish order 353-369; revisions 371-387; transport 389-402; SW 404-420; reader 426-458; share links 522-537).
- TV devlog: v2.172 5-61; v2.171 64-123; v2.170 126-202; v2.169 205-272 (worker has no authorisation 262-271); v2.166 466-553; v2.156 1214-1263; v2.155 1266-1363; v2.135 3158-3213; v2.69 9676-9775; v2.65.2 10296-10349; v2.65.1 10352-10430; v2.65.0 10456-10546; v2.63 10805-10870; v2.62 10873-10922.
- VV devlog: v2.58.0 1321-1438 (SW "nothing to bump" 1394-1395); v2.58.1 1265-1318; v2.56.0 1590-1623 (Helvetica 1611-1615); v2.55.0 1626-1644.
- VV ledger: 121 (title block re-measured in Helvetica), 137-160 (shared SW), 1135 (PdfFonts TV-only base), 1168-1169, 1180-1190 (web viewer rows; 1189 wrong), 1241 (LoadingVeil, no PdfFonts).
- VV R2 rule: `VV/.cursor/rules/08-R2IndexArchitecture--ValeVision3D-SSOT-.mdc` (R2 live, GH fallback, folderId is the stable key).

---

## Verification

**Adversarial verifier pass, 01-Oct-2026, read-only against the same HEADs (TV b2aa9151, VV 7b4e593a) plus
`WCP/` and `NAAPPS/`.** Every check below was made by opening the cited file; nothing was run in a browser, no worker or
R2 bucket was probed. A copy of the survey's text before this pass is in `parity/verify_s08/S08__before_verify.md`.

### Coverage

Every in-scope file in `ref/tree_tv.tsv`, `ref/tree_vv.tsv` and `ref/drift_all.tsv` is accounted for in section (c)
or the findings: TV `LE/60` (3), `LE/65` (7), `LE/66` (7), `LE/80` (5), top-level `52` (11) and `53` (4),
`TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, the TV worker (5 files), the 8090 published
API, and the five TV tests; VV `LE/60` (2), `LE/80` (5), `61__Feature__ShareProjectLink` (8, incl. the `00__Archive`
email template, which needs no action), the three VV R2 utils, the WCP worker (index, 6 handlers, 4 helpers), `server.py`
and the scrapbook blueprint. Not material and no action: TV
`02__Src__AppModules/80__CloudflareIntegration/FutureCfHelpersEtc__ForServerlessFeaturesSuchAsClientComments__.note`
(1 line). TV `Na__Test__StatementPublish__.test.mjs` belongs to S07b (statements publish to `10__StatementDocs`), not
to this slice.

Search hygiene for the swarm: `VVM/62__Feature__EmailWorkers/CloudflareWorker/node_modules` sits INSIDE
`02__Src__AppModules`; any grep of `VVM/` must exclude it (it floods results with wrangler/miniflare code).

### Claims checked (all 18 critical/high findings, and all 30 medium/low - F30 and F38 only lightly)

- **Critical**: F01 confirmed - VV ModeController `:539` unconditional `SetSheet`, `:779`/`:785` in `OnSheetsChanged`;
  VV WebViewer `:83` imports and `:289-296` calls `Na__LePdf__ExportSheet`; VV 2D underlays are rendered on the device
  (`Viewport2d__Frame__.js:206` -> `Na__LeSnap__Render2d`), 3D ones come from baked snapshots. TV `:747-754` and
  `:1125-1141` guard both paths. A full search of `VVM/` (all folders) found no published-document, share-link,
  embedded-font or document-id equivalent under any name. F02 confirmed and strengthened (live exposure today; see B8).
- **High**: F03-F05, F07-F11, F13-F15, F17, F18 confirmed against source; F06, F12, F16 corrected (below).
  Verified specifically: worker auth on every non-health route (`index.js:148`), route order, asset guard, 25 MB cap,
  `no-cache`, manifest bump (`ProjectAsset__.js:51-52,140-148`; also DrawingNotes `:135`); the global manifest consumed
  by `WithBuildToken` on project.json and every GLB (`ProjectLoader.js:251-254,407-408,497-519`); CORS
  `GET, POST, OPTIONS` and `Content-Type, X-Editor-Api-Key` (`Cors__.js:72-73`); Flask blueprint registration
  (`server.py:91-97`), `get_project_path` (`:128-160`), editor-config (`:334-361`), `serve_static` 200-for-missing
  (`:956-977`); TV Transport imports, API constant and sync `R2Ready` (`Transport__.js:43-46,55,202-206`), called
  without await (`Publish__.js:585`, `Share__Manifest__.js:413`); TV publisher strings and steps
  (`Publish__.js:99,257,318,572-681`); TV local API routes and guards
  (`ProjectVision__TrueVisionPublished__Api__.py:40-44,82-93,110-165`); TV ApiClient published region (`:978-1175`,
  cache policy `:1001-1007`); TV/VV ProjectLoader helpers and `ResolveAssetUrl`; TV worker prefix checks; v2.169 "no
  authorisation" (devlog 262-271) and `deploy.bat` without `--env production`; Register entry point
  (`Register__Editor__.js:90,539`) and VV Dev section (`DevMenu__Controls__.js:342,345`).
- **Versions and devlog references**: every TV devlog version the slice cites was found where the index puts it
  (v2.32, v2.49, v2.62, v2.63, v2.65.0-2, v2.69, v2.83, v2.94, v2.106, v2.111, v2.116, v2.135, v2.138, v2.143,
  v2.155, v2.156, v2.160, v2.166, v2.169-v2.172), and every VV one (v2.55, v2.56, v2.58.0/1, v2.70, v2.71).
  PdfExporter 1.12.0 = v2.160 (23-Sep) confirmed. jsPDF: TV 1,234,402 B / 32,999 CRLF and VV 1,201,529 B / 126 CRLF
  hash identically after normalisation (sha1 0407d0bc...). Test counts (Schema 59, Reader 63, ShareLinks 68) match
  devlog v2.166.
- **Medium/low**: F19-F27, F29-F44, F46-F48 confirmed (F32: TV's token has since moved to `2026-09-29-03`;
  F44 refined). F45 corrected (incomplete). Not re-checked: F30 beyond the rule text, F38 beyond the existence of VV's
  scrapbook test pattern.

### Corrections made in this file

1. Cross-references: "S08-F13" -> S08-F22 (B3), "S08-F24" -> S08-F15 (B6), "S08-F38" -> S08-F17 (B8).
2. **F12** - VV's PdfExporter header numbers are VV's own (VV 1.2.0 = TV 1.3.0 ExportRectMm, logged; VV 1.0.3 and 1.1.0
   are not TV's 1.0.3/1.1.0). The survey said VV's header lacks TV 1.3.0; it logs it as VV 1.2.0.
3. **F13 / D-S08-03** - the Vale typeface IS Open Sans (`--Vale_FontFamily`, every Vale app); the PDF can embed the AD04
   TTFs VV's screen already loads (no new files); re-flow risk is low (Open Sans is narrower than the Helvetica VV
   measures with); two more PdfFonts callers to coordinate (S06a Parametric Scrapbook, S07a Register PDF).
4. **F14** - TV's `Documents()` no longer splits site plans; the only VV seam is the absent register entry.
5. **F06 / module table** - Publish__Sheet is `port_adapted`, not verbatim/"header only": `Meta__SchemaRef` and
   "Published by TrueVision" are written into every element and sheet file, and `IMAGES_DIR` must match VV's
   sheet-image folder (D-S08-14).
6. **F16 / module table** - Share__Links is `port_adapted`, not verbatim (NA built-in base URL; `CurrentProject` rejects
   VV's folderId); Share__Button carries a "Noble Architecture" fallback string.
7. **F28 / D-S08-05** - a bare project code is not a safe VV link token (D-S08-13).
8. **F11 / D-S08-06** - one decision with D-S03b-01 and S07a's register port; ids must pass the stricter local
   `DOCUMENT_PATTERN`.
9. **F02 / WP-S08-04** - live exposure today; urgent independently of publishing; also protects S07a's sheet images.
10. **WP-S08-05** - "sixth segment" -> seventh (TV allows six); document and folder guards added to the acceptance.
11. **WP-S08-03/08/09/10/11** - dependencies and seams added (fonts before the first publish; D-S08-13/14; one owner for
    the ModeController/SheetSurface seams shared with S03a/S03b).
12. **F39 / B9** - VV ProjectLoader `:121` repeats the stale "no Service Worker" claim.
13. **F44** - the dead overlay's stylesheet is still imported (`Na__CoreUi__Styles__Index__.css:61`); 63 also reuses 61.

No finding was refuted outright: every one of the 48 rests on a true observation. The corrections above are to actions,
adaptations, versions and recommendations.

### Findings added by the verifier

- **S08-V01 (high)** - VV share links: 13 numeric project codes are shared by 2-3 schemes, so a code link can open the
  wrong project; and VV's `?project=` is normally the folderId, which TV's `Share__Links` rejects, so every Share button
  would hand out no link. -> D-S08-13.
- **S08-V02 (medium)** - VV `ResolveAssetUrl` sends 11 projects (`hasImages_R2:false`) to GitHub Pages only; the reader
  must build the R2 URL itself.
- **S08-V03 (high)** - sheet-image folder conflict: the publisher hard-codes `05__Layout__DrawingDocs__Images`; S07a's
  D-S07a-07 recommends `LayoutEditor/SheetImages`. -> D-S08-14.
- **S08-V04 (medium)** - NA/TrueVision identity written into published data and links (list in B10).
- **S08-V05 (medium)** - the same seams are specified by S03a, S03b, S07a, S09 and S06a; one owner each (wiring note 18).
- **S08-V06 (low)** - three VV folders contain a space and fail the proposed worker/Flask guards.
- New work package **WP-S08-15** (decision gate) and decisions **D-S08-13**, **D-S08-14** (section f).

### WP-S08-15 - Cross-slice decision gate for publishing (S, added by the verifier)
Adam decides, once for every slice that touches them: D-S08-03 (PDF/sheet face), D-S08-06 = D-S03b-01 (document id),
D-S08-13 (share-link project token) and D-S08-14 = D-S07a-07 (sheet-image folder). Record the answers in
`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (new D-numbers) and in S03b/S07a/S08. Blocks WP-S08-07,
WP-S08-08, WP-S08-09, WP-S08-11 and S07a's sheet images. Acceptance: four recorded answers; each names the constant or
config value it sets (`Sheet__FontFamily`, the document-id adapter or TV composition, `Link__QueryPattern` and the Links
project-token rule, `Na__LePubSheet__IMAGES_DIR`).

### Still unverified

- Whether any R2 object has ALREADY been deleted by the purge (the bucket was not listed).
- Live behaviour: no publish was run, no worker route exercised, no phone tested, no PDF opened; the 2.5 s loader wait
  and the "no link" Share behaviour are read from code, not observed.
- The bodies of TV `52` Elements/Paint/Sheet/Viewports/LoadingScreen and `66` Button/Open beyond imports, exports and the
  strings quoted; the TV test bodies beyond headers and fixture paths.
- (Resolved during the pass) VV renders each 2D underlay live the first time its frame is shown in a session:
  `Na__LeVp2d__ScheduleUnderlay` (`Viewport2d__Frame__.js:181-215`) calls `Na__LeSnap__Render2d` whenever the wanted key
  differs from the rendered one; there is no baked-2D-underlay lookup on that path. What remains unmeasured is the cost
  on a real phone.
- Vale's print brand: only the web token was found; whether Vale wants a different face on paper is Adam's knowledge.
