# 12__Scene__SemanticModel

**10-19 · Scene input** · real code since v0.5.0

The scene's identity in memory: what each thing is, independent of how it is drawn.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__SemanticModel__Builder__.mjs` - A package builder: the records a Painterly Scene Package carries, and the primitives that fill them - objects, edges, surfaces, triangles, boxes, walls with reveals, prisms, cylinders, lumpy spheres and an opening's lines

**Belongs here**

- Stable object IDs that survive ordinary revisions and re-export; content hashes where useful - never filenames.
- Source component hierarchy and instance paths: an instance is not its shared definition.
- Category, tag, visibility and artistic role (focal, architecture, planting, furniture, context, ground).

**Takes** records from `10`. **Gives** identities every pass, point and seed is keyed by.

**Manifest:** §04 Essential Identity Rules.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `addObject` in `PainterlyNPR__ScenePackage__Build` - every object carries an Id, Name, Category, Material and Role.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
