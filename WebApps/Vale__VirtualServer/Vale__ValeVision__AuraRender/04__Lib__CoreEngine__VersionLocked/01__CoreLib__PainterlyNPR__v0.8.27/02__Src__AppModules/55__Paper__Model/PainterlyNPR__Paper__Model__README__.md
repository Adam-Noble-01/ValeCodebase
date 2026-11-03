# 55__Paper__Model

**50-59 · Watercolour paint and paper** · real code since v0.5.0

Paper as a first-class medium.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__Paper__Config.json` - Papers
- `PainterlyNPR__Paper__Pass__.mjs` - The paper's relief, in millimetres: grain, tooth and the emboss the washes and the ink settle into
- `PainterlyNPR__Paper__Presets__.mjs` - The papers: cold-pressed, hot-pressed, cartridge and textured ivory

**Belongs here**

- Cold-pressed, hot-pressed, cartridge and textured ivory presets: grain, tone, absorbency, ink response.
- A consistent print-scale texture defined in millimetres - never a pixel-fixed overlay that changes with export resolution.
- Grain, pigment, linework and wash edges share one paper model.

**Takes** a paper preset (`05__Data__PaperLibrary`). **Gives** paper height and tone for `34`, `50` and `56`.

**Manifest:** §08 Paper as a First-Class Medium.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Paper* - procedural paper in millimetres.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
