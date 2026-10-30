# 21__System__GpuResources

**20-29 · Render graph and truth buffers** · real code since v0.5.0

GPU memory as a first-class constraint, managed from the beginning.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__GpuResources__Config.json` - Render Target Formats
- `PainterlyNPR__GpuResources__Core__.mjs` - The context, programs, render targets and the shadow map, sized to the sheet and resized for an export, and what the CPU holds between passes
- `PainterlyNPR__GpuResources__FloatBuilder__.mjs` - A growable float array: ribbons, debug lines, dabs and quads are built in one
- `PainterlyNPR__GpuResources__SharedShaders__.mjs` - The GLSL every pass shares - noise in millimetres, colour - and the vertex shaders: the scene, a fullscreen triangle, ribbons and debug lines

**Belongs here**

- A render-target pool with a format chosen per buffer; scratch targets reused.
- Explicit disposal of stale high-resolution textures; a memory budget per quality tier.
- Maximum texture and renderbuffer size checks before an export is attempted.

**Takes** requests from passes. **Gives** targets, freed when stale.

**Manifest:** §05 ("GPU memory, not just execution time, will become a constraint"); §12.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *GPU Resources* (`PainterlyNPR__GpuResources__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
