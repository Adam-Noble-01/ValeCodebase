# 36__Line__MaterialIndication

**30-39 · Pen and ink linework** · real code since v0.5.0

Material indication: the illustrator's selected surface cues - a few brick courses, tile courses, soldier courses and flagstone joints - laid procedurally on the real surfaces and drawn only where they tell. Never every brick, never a texture map.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__MaterialIndication__Config.json` - Material Indication Patterns
- `Na__MaterialIndication__Views__Config.json` - Material Indication - the Indication View's Colours
- `PainterlyNPR__MaterialIndication__Pass__.mjs` - Material chosen, never textured: courses, joints, tiles and flags laid at their real gauge, each unit weighed, and only the chosen few handed to the pen
- `PainterlyNPR__MaterialIndication__Patterns__.mjs` - The indication patterns: each material's units, gauge and how it asks to be shown

**Belongs here**

- Indication patterns by material class, measured in metres on the surface: brick (75 mm courses, 225 mm units, half bond), plain clay tile (100 mm gauge), soldier courses over openings, stone flags; stone, render, timber boarding and slate to follow. The model carries no brick or tile geometry - the package's indication surfaces, or a material class's faces, are enough.
- Laying out: courses fill a surface at its gauge, as brickwork is set out, bonded course to course, clipped to a gable's rake and cut round its openings. The marks belong to the building and hold still while the camera moves.
- Choosing: an importance per unit from the surface's structure (its corners, its openings, its base, under the eaves) plus seeded patches between; then the sheet's say - a course too fine to read on the paper goes, a lit plane bleaches texture while the half-tones keep it, the Drawing Discipline simplifies first - and the art direction field on top, where an Indication point expresses or suppresses by area, object or material.
- Output: marks handed to the same visibility test (against their own object, so never over a plant), lost-and-found and stroke synthesis as every line (`31`, `33`); units picked out with a darker touch, as accents for the wash (`52`, `54`).

**Takes** the package's indication surfaces (or material-class faces), the truth buffers, the art direction field and the style preset. **Gives** stroke candidates for `33` and accent dabs for `52`.

**Manifest:** §06 Line Hierarchy (optional detail is lost first); §08 Material Recipes - selected surface cues; §10 Art Direction Points.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup` (v0.2.0): `INDICATION_PATTERNS`; the scene package's `Surfaces` and `Paths`; region *Material Indication* - `PainterlyNPR__MaterialIndication__Surface`, `__Flags`, `__Importance`, `__Structure`, `__Pick`; the Indication point (code 3) in the art direction field; the accent layer's R channel for picked units. Its buffer view shows every joint the pattern lays, the ones drawn, and the ones lost to the paper.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
