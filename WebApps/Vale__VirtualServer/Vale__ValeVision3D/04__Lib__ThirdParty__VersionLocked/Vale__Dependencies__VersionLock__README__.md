# ValeVision3D - Version-Locked Vendor Dependencies

Pinned coordinated set (09-Sep-2026): vendor folders 01 to 04. Do not upgrade these packages independently.
The four vendor folders are byte-identical copies of the Vale Lantern Designer set at
`WebApps/Vale__LanternDesigner/04__Src__Dependencies__VersionLocked`, so both apps run
the same libraries and the projected linework engine ports between them unchanged.

| # | Folder | Package | Version | Browser entry |
|---|--------|---------|---------|---------------|
| 01 | `01__Vendor__ThreeJs__v0.184.0` | three | 0.184.0 | `build/three.module.js` (imports `build/three.core.js`) |
| 02 | `02__Vendor__ThreeMeshBvh__v0.9.9` | three-mesh-bvh | 0.9.9 | `src/index.js` |
| 03 | `03__Vendor__Clipper2Js__v0.9.0` | clipper2-js | 0.9.0 | `fesm2020/clipper2-js.mjs` |
| 04 | `04__Vendor__ThreeEdgeProjection__v0.0.10` | three-edge-projection | 0.0.10 at f794481 | `src/index.js` |
| 05 | `05__Vendor__JsPdf__v4.1.0` | jspdf | 4.1.0 (built 2026-02-02) | `jspdf.umd.js` (UMD, injected by tag) |
| 06 | `06__Vendor__Html2Canvas__v1.4.1` | html2canvas | 1.4.1 | `html2canvas.umd.js` (UMD, injected by tag) |
| 07 | `07__Vendor__PdfJs__v3.11.174` | pdfjs-dist | 3.11.174 | `build/pdf.min.js` (UMD, injected by tag; its worker is `build/pdf.worker.min.js`) |

Folder 03 (clipper2-js) was left out on 09-Sep-2026 and added on 10-Sep-2026 (v2.21.1): no ValeVision3D
module calls it, but three-edge-projection's SilhouetteGenerator imports it at module load, so without
the import map entry the whole module graph fails to resolve.

## The document-output vendors (05, 06, 07)

Vendors 05, 06 and 07 are NOT part of the coordinated 3D set. Each is independent of that set
and of the others, and can be upgraded on its own: rename its folder to the new version and
update every path string listed below. All three are UMD bundles injected as a `<script>` tag
the first time they are needed, never imported as ES modules, so none has an import map entry
and none ever will. 05 and 06 carry TrueVision3D's folder numbers and file names; 07 is this
app's own number for PDF.js and is offered to TrueVision3D, whose register still loads PDF.js
from another app's folder.

| Vendor | Read by | Config key (`Na__LayoutEditor__AppConfig__.json`) | Hard-coded fallback |
|---|---|---|---|
| jsPDF | `Na__LayoutEditor__PdfExporter__.js` (Download PDF; the specification's `Na__LayoutEditor__SpecPdf__.js` loads it through the exporter) | `LayoutEditor__Pdf__JsPdfScriptPath` | `Na__LayoutEditor__ConfigState__SheetSetup__.js` |
| html2canvas | the Statement Writer's PDF export (not in ValeVision3D yet) | `LayoutEditor__Statement__Html2CanvasScriptPath` | `Na__LayoutEditor__ConfigState__EditorSetup__.js` |
| PDF.js | the Drawing Register's PDF preview (not in ValeVision3D yet); the worker path is handed to PDF.js, not injected | `LayoutEditor__DrawingRegister__PdfJsScriptPath`, `LayoutEditor__DrawingRegister__PdfJsWorkerPath` | `Na__LayoutEditor__ConfigState__EditorSetup__.js` |

Each path is written down twice - in the config JSON and as a hard-coded default in a
ConfigState module - so moving a file means editing both, or the app silently falls back to a
path that no longer exists and the PDF button does nothing. Two test pages load jsPDF by path
too: `80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html` and
`80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html`.

The legacy Create Drawing page that Image Export opens
(`02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`) keeps
its own copy of jsPDF in `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/` and
loads it by relative path, so that copy stays until the folder is retired. It is the same 4.1.0
build: the same git blob as `05__Vendor__JsPdf__v4.1.0/jspdf.umd.js`.

## Index and import map

- SSOT for the path map: `Vale__Dependencies__ImportMap__Index__.json`
- Live wiring: `index.html` inline `<script type="importmap">` (must stay in sync with the JSON)
- Service worker: `ValeVision3D__Pwa__ServiceWorker__.js` (app root) caches nothing from this folder ahead of time; it keeps app files network-first (06-Oct-2026).
  lists the entry files under this folder. A path change here needs that list and its
  `PWA_SW_VERSION_TOKEN` updated in the same change (and the `WebApps/live_sw.js` copy).
- Vendors 05 to 07 are not on that precache list: a browser fetches each one the first time it
  is needed, and the shared worker then keeps it like any other script.

## Upgrade history

- 01-Oct-2026: the document-output vendors, for ValeVision3D v2.71.1: jsPDF 4.1.0 copied to
  `05__Vendor__JsPdf__v4.1.0` (the same git blob as the 35 copy and as TrueVision3D's 05),
  html2canvas 1.4.1 to `06__Vendor__Html2Canvas__v1.4.1` and PDF.js 3.11.174 (pdfjs-dist,
  Apache-2.0) to `07__Vendor__PdfJs__v3.11.174/build/`, each byte-identical to the build
  TrueVision3D runs at b2aa9151. The Layout Editor's config and its fallback read jsPDF from 05
  from now on; the 35 copy stays for the legacy Create Drawing page.
- 10-Sep-2026: clipper2-js 0.9.0 (`03__Vendor__Clipper2Js__v0.9.0`) copied from the Lantern Designer set and mapped, for ValeVision3D v2.21.1.
- 09-Sep-2026: three r160 (`04__Lib__ThirdParty__Three`, trimmed addons) replaced by this set for
  ValeVision3D v2.16.0. The old folder is retained until the r184 checklist in
  `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` section 6 is signed off, then deleted.

## Facts that matter for ValeVision3D code

- The logarithmic depth buffer is unchanged in behaviour: `gl_FragDepth = log2(1 + w) / log2(far + 1)`,
  so the fog and SSAO inversion `clipW = pow(far + 1, depth) - 1` still holds, and the fat-line
  depth bias patch that replaces `#include <logdepthbuf_fragment>` still finds that include in
  `LineMaterial`. The internal preprocessor define was renamed from `USE_LOGDEPTHBUF` to
  `USE_LOGARITHMIC_DEPTH_BUFFER`; no ValeVision3D shader references either name directly.
- `WebGLMultipleRenderTargets` no longer exists (multiple targets are `WebGLRenderTarget` with
  `count`); ValeVision3D never used it.
- `OrbitControls` now extends the `Controls` base class and connects to the DOM element passed to
  its constructor; `listenToKeyEvents`, `enabled`, `target`, `update` and `dispose` are unchanged.
- `FXAAShader` keeps the `resolution` uniform as 1 / pixel size but the filter itself was rewritten
  upstream after r160, so edge softness may differ slightly from the r160 build.
