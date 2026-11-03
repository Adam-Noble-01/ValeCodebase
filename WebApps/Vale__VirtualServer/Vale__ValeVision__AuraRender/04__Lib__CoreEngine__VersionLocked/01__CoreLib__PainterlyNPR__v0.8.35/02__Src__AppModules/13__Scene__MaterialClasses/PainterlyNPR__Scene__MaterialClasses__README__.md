# 13__Scene__MaterialClasses

**10-19 · Scene input** · real code since v0.5.0

The material class registry, editable independently of literal SketchUp swatches.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__MaterialClasses__Config.json` - Material Classes and Their Watercolour Recipes
- `PainterlyNPR__MaterialClasses__Table__.mjs` - Every material class and its watercolour recipe, by key, and the slots the shaders hold them in

**Belongs here**

- Classes such as render, brick, stone, slate, glass, joinery, metal, terracotta, paving, lawn, foliage, bark, timber, sky.
- Maps a source material to a class; the class keys a recipe in `54__Wash__MaterialRecipes`.
- The Material Class ID buffer (`22`) carries it to every pass.

**Takes** source materials from `10`. **Gives** a class per surface.

**Manifest:** §04 Essential Identity Rules; §05 Core Scene Buffers.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the `MATERIAL_CLASSES` table.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
