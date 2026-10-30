# 86__Export__StillRender

**80-89 · Workspace, project and export** · real code since v0.5.0

The final high-resolution still.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__Export__Png__.mjs` - Export a PNG: the sheet, or the buffer on view, at a scale

**Belongs here**

- Off-screen output with print dimensions and clear DPI controls; PNG first.
- Tiled rendering with overlap and guard bands for blur, bleed and large-radius pigment work; seam-free tiles from global seeds and page coordinates.

**Takes** a composed sheet. **Gives** a PNG in `23__Generated__RenderedStills`.

**Manifest:** §12 Print Output.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Export* - PNG at 1x and 2x, untiled.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
