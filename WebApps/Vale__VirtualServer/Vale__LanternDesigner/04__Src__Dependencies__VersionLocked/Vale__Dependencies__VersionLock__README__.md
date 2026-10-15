# Vale Lantern Designer — Version-Locked Vendor Dependencies

Pinned coordinated set (30-Jul-2026). Do not upgrade these packages independently.

| # | Folder | Package | Version | Browser entry |
|---|--------|---------|---------|---------------|
| 01 | `01__Vendor__ThreeJs__v0.184.0` | three | 0.184.0 | `build/three.module.js` |
| 02 | `02__Vendor__ThreeMeshBvh__v0.9.9` | three-mesh-bvh | 0.9.9 | `src/index.js` |
| 03 | `03__Vendor__Clipper2Js__v0.9.0` | clipper2-js | 0.9.0 | `fesm2020/clipper2-js.mjs` |
| 04 | `04__Vendor__ThreeEdgeProjection__v0.0.10` | three-edge-projection | 0.0.10 @ f794481 | `src/index.js` |
| 05 | `05__Vendor__JsPdf__v4.1.0` | jspdf | 4.1.0 | `jspdf.umd.js` |

Folders 01–04 are the coordinated 3D / projection set and move together. Folder 05
(jsPDF) is independent of that set and may be upgraded on its own.

## Index / import map

- **SSOT for path map:** `Vale__Dependencies__ImportMap__Index__.json`
- **Live wiring:** `VghLantern__App__.html` → `<script type="importmap">` (must stay in sync with the JSON)

jsPDF is a UMD classic script, not an ES module, so it is **not** in the import map.
It is loaded by a plain `<script src>` tag in `VghLantern__App__.html` before the
Document Preview modules and reaches the app as the `window.jspdf` global, consumed
by `VghLantern__DocPreview__PdfExporter__.js`.

npm lockfile at project root (`package.json` / `package-lock.json`) mirrors this set for `npm ci`. Browser runtime loads the vendored copies above, not `node_modules`.
