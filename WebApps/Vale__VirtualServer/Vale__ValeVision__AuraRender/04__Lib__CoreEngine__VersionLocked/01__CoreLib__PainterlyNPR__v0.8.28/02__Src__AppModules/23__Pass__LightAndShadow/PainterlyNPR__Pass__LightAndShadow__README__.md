# 23__Pass__LightAndShadow

**20-29 · Render graph and truth buffers** · real code since v0.5.0

Restrained tonal information: light as a decision about where a glaze goes, not a lighting simulation.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LightAndShadow__Pass__.mjs` - The sun: its direction from the state, its shadow camera, and the shadow map

**Belongs here**

- A sun shadow map with soft filtering; Lambert light per surface.
- Contact washes and occlusion where buildings meet the ground.

**Takes** geometry and the sun. **Gives** light and shadow in the truth buffers.

**Manifest:** §05 Lighting / Shadow / Occlusion.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Light and Shadow* (`PainterlyNPR__LightAndShadow__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
