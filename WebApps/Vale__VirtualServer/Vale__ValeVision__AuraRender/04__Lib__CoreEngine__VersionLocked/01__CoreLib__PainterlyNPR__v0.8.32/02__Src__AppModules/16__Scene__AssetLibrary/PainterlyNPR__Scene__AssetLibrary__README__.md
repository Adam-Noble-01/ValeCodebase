# 16__Scene__AssetLibrary

**10-19 · Scene input** · real code since v0.6.0 (30-Oct-2026)

The asset library in the scene: library assets (`12__Data__AssetLibrary`) built into the scene package as plops, the catalogue the app reads, and the catalogue stage the factory draws one asset on.

Adam, 30-Oct-2026: "Add a pull out Assets menu ... build a factory that creates a image of the proxy object and a rendered version as a webp ... build a assets library folder ... Build drag and drop assets system."

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__AssetLibrary__Placement__.mjs` | ~290 | A plop's transform (turn about +Y, scale, position); `Place` (one plop into the package being built); `PlaceAll` (every plop, after the cottage, spliced in among the shadow casters); `MakePlacement` (an index asset and a point on the ground into a plop, by its Placement rules); `NextUid`; `BuildStage` (the catalogue environment) |
| `PainterlyNPR__AssetLibrary__Planting__.mjs` | ~290 | Tree, Conifer, Mound, Spire, Hedge, Topiary, Grass, Reeds: the cottage garden's tree, plant, mound, spire and hedge, the planters' grass and the pond's reeds, made functions of their parameters, their own seed and a placement |
| `PainterlyNPR__AssetLibrary__Objects__.mjs` | ~330 | Planter, Bench, PicketFence, PottedStandard (v0.8.12: a ball standard in a square lead planter, its SquarePlanter, a tuft of strap leaves) and the turned box they are built of (the builder's box is square to the world) |
| `PainterlyNPR__AssetLibrary__Catalogue__.mjs` | ~120 | The index read once (and again after the factory writes), assets by Id, file URLs versioned by their last render, search and filters |
| `Na__AssetLibrary__Config.json` | | Where the library is (from the engine's root, resolved from Placement's own URL since v0.8.2, so a wrapper's pinned copy reads the library pinned beside it), a plop's limits, the stage, and every generator with its defaults |

## How a plop gets into the drawing

- **A plop carries its recipe**: generator, parameters, kind, material, role and flowers, copied from the asset's DAT when it is dropped - with its own seed, turn and scale. The drawing rebuilds exactly from the settings object alone, with or without the library, and an asset improved later never changes a finished drawing.
- **After the cottage**: `PainterlyNPR__ScenePackage__Build` (10) runs every part, then `PlaceAll`, then `Pack`. The plops' objects take the Ids after the far belt, so no existing Id or seed moves; their triangles are spliced in at `CasterCount`, before the lawn and the belt, so they cast into the shadow map and stand in an elevation. With no plops the package is the one v0.5 built, byte for byte (the boot drawing hashes the same with and without this module).
- **Its own hand**: each organic carries `SeedKey: 'asset:' + Uid`, and the organic grammar (40) seeds from it, so removing one plop never changes another plant's strokes. An object drawn by its edges (bench, planter pot, fence) still takes its edges' Ids, so its hand can move when an earlier plop is removed.
- **Its own hand of the pen** (v0.8.12): a generator may give an organic `Hand: { Overdraw, Wobble }` from its parameters (PottedStandard's `Overdraw` and `Wobble`). The grammar (40) multiplies the field's own values by it on every stroke of that plant, as a Line Control point would: how the pen sketches over this asset travels with the asset and its plops. An organic without one draws exactly as before.
- **Per-plop randomisation** (manifest §07: "duplicated plant assets are visibly varied but re-render identically"): AutoRotate and AutoScale switch it on or off per asset (v0.8.14, Adam: "It only needs to be done for organic things like trees"; off, a plop lands square to the world at its own size, as SketchUp inserts it; left out, both are on). With AutoRotate on, Facing Random turns a plant at random, Camera turns its front (+Z) to the eye, Fixed keeps it; with AutoScale on, ScaleJitter varies its size; NewShapeEachPlop gives it a fresh shape seed (another oak, the same species), else the catalogue's own.

## The stage

`BuildStage` makes a package of its own: the asset at the origin as authored (its stage seed, no turn, scale 1 - the base asset), a disc of lawn under it (`GroundRadiusFactor` of its half-spread), no building (a footprint nothing is near) and no far belt.

**Takes** `State.Assets` (82, 85) and the library's index. **Gives** plops' objects, edges and organics in the scene package; the stage package and its bounds to 88.

**Manifest:** §03 Scene mode ("proxy placement"); §04 (assets with content identifiers); §07 (instance seeds).
