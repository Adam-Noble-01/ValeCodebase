# 61__Atmos__DistantLandscape

**60-64 · Atmosphere** · real code since v0.5.0

Distant woodland, hedgerows, tree belts and open-field horizons.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__OrganicGrammar__DistantTrees__.mjs` - The distant trees: a loose, sketchy line round the far belt, just indicating trees in the background

**Belongs here**

- Seeded canopy masses along a horizon or terrain-following curve; trunks and shadow accents only where useful.
- Background seeds stored apart, so revising a window never regenerates the landscape.

**Takes** the camera (world space for direction). **Gives** background masses.

**Manifest:** §09 Procedural Methods.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the distant tree belt, built from its own fixed background seed. Since v0.3.1 a middle distance between the garden and the belt - a field hedgerow, bushes and tree clumps 25 to 50 m back, drawn as context - so the belt stays a backdrop.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
