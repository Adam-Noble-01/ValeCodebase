# 14__Scene__SourceLinework

**10-19 · Scene input** · reserved: a README until real code arrives

Authored SketchUp lines as first-class strokes: the artist's intent, not a by-product of triangles.

**Belongs here**

- Lines drawn on faces (glazing bars, sash detail, joinery), curves and thickness classes.
- Greyscale edge-palette and line-thickness tags read as stroke class, print weight, pressure or priority.
- Soft, smooth and hidden flags carried explicitly - never inferred from GLB topology.
- The link from each source edge to the strokes drawn from it.

**Takes** edge data from `10`. **Gives** authored candidates for `30`.

**Manifest:** §04 Source Linework as Artistic Intent.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `addEdge` and `openingLines` in `PainterlyNPR__ScenePackage__Build` - every edge carries its Kind (Hard, Authored, Smooth), Class and object; glazing bars, courses and joints are authored lines with no geometry at all.
