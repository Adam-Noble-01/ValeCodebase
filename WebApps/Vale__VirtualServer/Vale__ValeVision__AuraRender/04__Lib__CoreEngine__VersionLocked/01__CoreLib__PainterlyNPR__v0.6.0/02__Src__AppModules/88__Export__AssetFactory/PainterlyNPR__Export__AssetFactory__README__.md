# 88__Export__AssetFactory

**80-89 · Export** · real code since v0.6.0 (30-Oct-2026)

The rendering environment factory: each library asset drawn alone in the catalogue environment, as its proxy (PXY) and as pen and wash (RND), with its three.js model (MOD) and its measured bounds, written into its own folder in `12__Data__AssetLibrary`.

Adam, 30-Oct-2026: "Create a rendering enviroment factory for capturing consitent asset thumbnails in both rendered and proxy from".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__AssetFactory__Run__.mjs` | ~240 | `Run` over a list of assets: the stage, the catalogue style and camera, the two pictures, the model, the uploads, the DAT's Geometry and Factory; the drawing put back exactly afterwards |
| `PainterlyNPR__AssetFactory__Glb__.mjs` | ~150 | The MOD file: the asset's own triangles as a binary glTF, one primitive per material class, its albedo as base colour, double-sided, the asset's Id and names in the node's extras |
| `Na__AssetFactory__Config.json` | | The catalogue's style (seed, sun, sky as paper), camera (three-quarter, fitted) and pictures (512 px WebP) |

## Consistent by construction

- **The stage** (16's `BuildStage`): the asset alone at the origin as authored - its stage seed, no turn, scale 1 - on a disc of lawn; no building, no far belt.
- **The style**: the app's starting state (`PainterlyNPR__AppCore__DefaultState`), the seed 20261030, the default sun, no sky wash and no clouds. Whatever the sheet held, the same asset gives the same pictures.
- **The camera**: yaw 28, pitch 9, 30 degrees, fitted so the taller of the asset's height and its spread takes 86% of the square picture.
- **The pictures**: the sheet's centre square, read back from the compositor (RND) and from the navigation preview drawn into a target of its own (PXY), scaled to 512 x 512 WebP.

## Its manners

- It draws in the app, on the sheet, so its work is seen; it holds the graph in the Proxy work mode while it runs, so no stray refinement starts against the stage. The drawing - every State key by reference, the scene, the work mode - is put back exactly: the sheet's hash and the whole State are the same before and after (checked with three plops in a measured elevation).
- It writes only through the local server: `POST /api/assets/<AssetId>/<Slot>` (60's server), into the asset's own folder, named from its DAT; the DAT gains only Geometry (Bounds) and Factory (StageSeed kept, Status, RenderedOn, EngineVersion, StageVersion, Camera, ThumbnailPx). With no such route it says so and writes nothing.
- 26 assets in about 23 s at 1x.

**Takes** the catalogue (16), the render graph (20), the GPU (21). **Gives** MOD, PXY and RND files and the DAT's measured bounds.

**Manifest:** §14 (export); §04 (proxy and environment assets with content identifiers).
