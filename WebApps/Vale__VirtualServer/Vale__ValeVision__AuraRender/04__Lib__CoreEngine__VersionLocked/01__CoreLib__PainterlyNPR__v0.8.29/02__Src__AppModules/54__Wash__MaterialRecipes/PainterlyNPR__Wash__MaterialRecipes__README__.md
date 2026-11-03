# 54__Wash__MaterialRecipes

**50-59 · Watercolour paint and paper** · reserved: a README until real code arrives

How each material class paints. The engine stays reusable; recipes define the variation.

**Belongs here**

- Render and plaster, brick and masonry, timber, glass, roofing and slate, planting, paving, sky.
- Recipe data lives in `07__Data__MaterialRecipes`; this module reads and applies it.
- Not every pigment behaviour on every material.

**Takes** a material class (`13`). **Gives** a recipe for `50` to `53`.

**Manifest:** §08 Material-Specific Behaviour.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the recipes in `MATERIAL_CLASSES`; v0.2.0 added clay plain tile (graded, deeper at the eaves), white-painted timber, lavender, hedge and conifer, and `FLOWER_PIGMENTS` for the accent glazes.
