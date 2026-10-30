# 33__Stroke__Synthesis

**30-39 · Pen and ink linework** · real code since v0.5.0

Turns each line into the mark a pen would make.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__StrokeSynthesis__Config.json` - Stroke Synthesis
- `PainterlyNPR__StrokeSynthesis__Pen__.mjs` - One stroke as a pen would make it - resampled in millimetres, wobbled, tapered, pressed and overdrawn by the discipline - into one ribbon buffer

**Belongs here**

- Variable-width, tapered 2D ribbons in paper space; widths in millimetres at print scale, converted for the preview.
- Pressure and opacity along the stroke; tapered, rounded or dry caps.
- Smooth, imperfect drift - never per-pixel jitter or a visible sine wave.
- Endpoint overshoot and undershoot at true corners only; controlled breaks; sparse overdraw.
- Seeds from the source edge's identity and the style, so a re-render is identical.

**Takes** prioritised runs (`32`) and the discipline (`35`). **Gives** ribbon geometry for `34`.

**Manifest:** §06 Pen-Stroke Synthesis.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Stroke Synthesis* (`PainterlyNPR__StrokeSynthesis__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
