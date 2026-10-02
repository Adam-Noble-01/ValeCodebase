# ValeVision3D - Version-Locked Vendor Dependencies

Pinned coordinated set (09-Sep-2026). Do not upgrade these packages independently.
The four vendor folders are byte-identical copies of the Vale Lantern Designer set at
`WebApps/Vale__LanternDesigner/04__Src__Dependencies__VersionLocked`, so both apps run
the same libraries and the projected linework engine ports between them unchanged.

| # | Folder | Package | Version | Browser entry |
|---|--------|---------|---------|---------------|
| 01 | `01__Vendor__ThreeJs__v0.184.0` | three | 0.184.0 | `build/three.module.js` (imports `build/three.core.js`) |
| 02 | `02__Vendor__ThreeMeshBvh__v0.9.9` | three-mesh-bvh | 0.9.9 | `src/index.js` |
| 03 | `03__Vendor__Clipper2Js__v0.9.0` | clipper2-js | 0.9.0 | `fesm2020/clipper2-js.mjs` |
| 04 | `04__Vendor__ThreeEdgeProjection__v0.0.10` | three-edge-projection | 0.0.10 at f794481 | `src/index.js` |

Folder 03 (clipper2-js) was left out on 09-Sep-2026 and added on 10-Sep-2026 (v2.21.1): no ValeVision3D
module calls it, but three-edge-projection's SilhouetteGenerator imports it at module load, so without
the import map entry the whole module graph fails to resolve.
jsPDF (UMD classic script) is vendored separately under
`02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked` and is
independent of this set.

## Index and import map

- SSOT for the path map: `Vale__Dependencies__ImportMap__Index__.json`
- Live wiring: `index.html` inline `<script type="importmap">` (must stay in sync with the JSON)
- Shared service worker precache: `WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`
  lists the entry files under this folder. A path change here needs that list and its
  `PWA_SW_VERSION_TOKEN` updated in the same change (and the `WebApps/live_sw.js` copy).

## Upgrade history

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
