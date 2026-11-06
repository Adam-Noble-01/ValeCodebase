# Disto Image Mapper: Version-Locked Vendor Dependencies

Pinned 05-Nov-2026. The browser loads these copies, never a CDN, so the app runs offline.

| # | Folder | Package | Version | Browser entry |
|---|--------|---------|---------|---------------|
| 01 | `01__Vendor__ThreeJs__v0.184.0` | three | 0.184.0 | `build/three.module.min.js` |

The same three.js as Lantern Designer's locked set, trimmed to what this app imports: the two minified builds,
`OrbitControls`, and the fat line trio (`LineSegments2`, `LineSegmentsGeometry`, `LineMaterial`). Copy further addons
from `Vale__LanternDesigner/04__Src__Dependencies__VersionLocked/01__Vendor__ThreeJs__v0.184.0` at this version, and add
them to the service worker's file list.

**Live wiring:** the `<script type="importmap">` block in `DistoImageMapper__AppIndex__.html`.
