# 17__Scene__MaterialAssignment

**10-19 · Scene input** · real code since v0.7.0 (30-Oct-2026)

Material classes given to an object or to one face of it, carried into the scene package after every build: the class's wash, hatching and courses follow. Also the material library the Assets drawer's Materials tab shows, and the sample each class is drawn on for its swatch.

Adam, 30-Oct-2026: "make a new assets tab for materials and built a materials application system which can handle per object and per face material asignment".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__MaterialAssignment__Faces__.mjs` | ~280 | An object's key (`#Id` for the scene's own, `Uid.Part` for a plop's part); every object's triangles; a triangle's corners and plane; `PickTriangle` (a ray against one object's triangles); `FaceTriangles` (a face as SketchUp has one: triangles joined across edges whose two sides agree on the normal at both ends, so a flat face or a smooth surface, never across a crease); `PickFace`; `FaceFrame` (axes, extent and a course clip for courses laid on a face) |
| `PainterlyNPR__MaterialAssignment__Apply__.mjs` | ~160 | `Assignable`, `PatternOf`; `ApplyOne` (the class into the face's or object's vertices; the object's record; its surfaces re-patterned or suppressed; courses laid fresh on a flat face given brick or tile; a flagstone path kept only while paving); `ApplyAll`, called by `PainterlyNPR__ScenePackage__Build` (10) after Pack |
| `PainterlyNPR__MaterialAssignment__Library__.mjs` | ~190 | The register read (07__Data__MaterialRecipes), joined to the class table; swatch file names and URLs; search; a drawing's assignments made (`Give`, which replaces what the same target had) and cleared (`Clear`: an object and its faces, one face, or a whole plop) |
| `PainterlyNPR__MaterialAssignment__Sample__.mjs` | ~170 | `BuildSample(key)`: the stage a class's swatch is drawn on, a block of wall (with the courses its class lays on all four sides), a slab of ground (with a flagstone path when paving), a mound of planting (16's Mound), or a log of bark; finished by 16's `FinishStage` |
| `Na__MaterialAssignment__Config.json` | | Where the library is (from the engine's root, resolved from Library's own URL since v0.8.2, so a wrapper's pinned copy reads the register pinned beside it), the most assignments a drawing holds, which classes lay which courses, what a face is (normal and plane tolerances, the weld), and the samples |

## How an assignment reaches the drawing

- **Data in the drawing**: `State.Materials` and the settings object's `Materials` (written only when there are any), each `{ Uid, Target: 'Object' | 'Face', Object, Face, Material }` (schema `11__Contracts__JsonSchemas/PainterlyNPR__Schema__MaterialAssignment__1.0.0__.json`). The scene is rebuilt from the drawing, so they are applied after every build, in the order made: a later one wins.
- **Keys that survive a rebuild**: an object is `#Id` (the cottage's Ids never move) or `Uid.Part` (a plop's part); a face is its object's key and the lowest place, among that object's triangles, of the face's triangles, the same whichever triangle was picked. The scene is built the same way every time, so the face is found again.
- **What follows at once**: the truth buffers carry each pixel's class, so the wash, the hatching's take, the hover and the picked material all read the new one. What this module makes follow: the object's own record (`MaterialId`, `MaterialKey`), and material indication's surfaces (36 skips one marked `Suppressed`) and flagstone paths.
- **The courses** (`Rules`): brick lays brick, clay tile and slate lay tile; a surface given any other class keeps none; a soldier course stays only while its wall is brick; a path keeps its flags only while it is paving. A flat face given brick or tile that had no courses gets its own, laid within its outline.
- **A plant's face is the plant**: its masses are smooth, so Face on an organic object gives the whole object (83 decides this).

**Takes** `State.Materials` (82's Materials tab, 83's menus, 85's settings object) and the packed scene package. **Gives** the package with the classes applied, to every pass; the material library to 82; the sample stages to 88.

**Manifest:** §04 (material classes in the package), §08 (material-specific behaviour).
