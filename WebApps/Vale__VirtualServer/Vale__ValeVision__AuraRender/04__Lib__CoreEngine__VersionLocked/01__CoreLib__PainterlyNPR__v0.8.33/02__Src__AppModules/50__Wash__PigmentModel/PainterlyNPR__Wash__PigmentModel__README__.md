# 50__Wash__PigmentModel

**50-59 · Watercolour paint and paper** · real code since v0.5.0

The optical model for transparent pigment on paper.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__PigmentModel__Config.json` - Pigments That Belong to No One Material
- `PainterlyNPR__PigmentModel__Pigments__.mjs` - The pigments that belong to no one material: the shadow glaze, the clouds' undersides, the flowers' accent glazes and the marker's shadow lines

**Belongs here**

- Washes compose as transmittance - colour = paper x product of T^d - so glazes deepen and stay transparent instead of greying to mud.
- Pigment strength and wetness are distinct parameters: a dark wet wash spreads differently from a pale dry stroke.
- A muddy-colour guard, tested rather than assumed at every quality level.

**Takes** recipes (`54`) and fields (`51` to `53`). **Gives** pigment density and colour for `56`.

**Manifest:** §08 Paint Is a Compositor, Not a Flat Mesh Shader; Wash Recipe.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Watercolour* (`PainterlyNPR__Watercolour__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
