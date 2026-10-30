# 10__Import__ScenePackage

**10-19 · Scene input** · real code since v0.5.0

Reads the versioned Painterly Scene Package - an export from SketchUp, never a `.skp` opened in the browser.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__ScenePackage__Build__.mjs` - The demo scene as the records a Painterly Scene Package carries: a brick cottage in its garden, built in code, part by part, in a fixed order
- `PainterlyNPR__ScenePackage__Cottage__.mjs` - The brick cottage of a storey and a half: walls and openings, the clay-tiled roof, chimneys, dormers, the oak porch and its truss, rainwater goods, the back wall, and every casement's joinery
- `PainterlyNPR__ScenePackage__Garden__.mjs` - The garden: the flagstone paths, the picket fence and gate, the bench and the planters, the cottage borders, hedges and trees, the pond, and the grass tufts

**Belongs here**

- The `.zip` bundle (a dedicated extension once stable) and its top-level manifest: schema version, coordinate system, scale, units, package ID, asset references.
- GLB geometry, chunked sensibly; semantic JSON; edge and stroke data; cameras and elevation planes; optional textures, proxies, palettes.
- GLB is the geometry transport, not the truth contract: semantics and linework travel beside it.

**Takes** a package from a local file or the project library. **Gives** geometry and records for `12`, `13` and `14`.

**Manifest:** §04 Package Model.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Scene Package* builds the demo scene in code instead (`PainterlyNPR__ScenePackage__Build`) - the same records an importer would produce.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
