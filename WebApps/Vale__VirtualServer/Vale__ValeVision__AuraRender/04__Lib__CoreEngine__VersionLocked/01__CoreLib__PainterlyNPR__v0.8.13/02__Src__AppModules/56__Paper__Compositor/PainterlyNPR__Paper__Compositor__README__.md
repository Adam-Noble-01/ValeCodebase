# 56__Paper__Compositor

**50-59 · Watercolour paint and paper** · real code since v0.5.0

The paper-space composite: where the drawing becomes one image.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__Compositor__Pass__.mjs` - Ink, wash and paper into one image, in paper space; and bare paper (v0.8.1): `PainterlyNPR__Compositor__BarePaper(sizePx, repeatPx)`, the same programs over an empty wash and no ink, as a tile that repeats with no seam, for a wrapper's page round its pictures (ValeVision AURA's drawing sheets)

**Belongs here**

- Washes, ink and paper texture combined; reserved whites kept.
- Selective ink/wash relationships; the final colour management to sRGB.

**Takes** washes (`50`), ink (`34`), paper (`55`), art direction (`65`). **Gives** the still, and bare paper.

**Manifest:** §05 render graph; §08.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Compositor* (`PainterlyNPR__Compositor__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
