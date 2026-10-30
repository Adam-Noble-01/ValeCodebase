# 34__Stroke__InkCompositing

**30-39 · Pen and ink linework** · real code since v0.5.0

Ink on paper, and ink with wash.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__InkLayer__Config.json` - Inks
- `PainterlyNPR__InkLayer__InkFamilies__.mjs` - The inks - never pure black
- `PainterlyNPR__InkLayer__Pass__.mjs` - The ribbons drawn into the ink layer, and the debug lines for the Lines view

**Belongs here**

- Ink families: warm grey, cool grey, sepia, Payne's grey, soft black - never pure black.
- Deposition and overlap darkening; tiny pooling where strokes cross.
- Paper-grain break-up: a pen rides the peaks, and a dry pen skips the valleys.
- The ink/wash relationship is selective - no one mandatory global layer order.

**Takes** ribbons (`33`) and paper (`55`). **Gives** the ink layer for `56`.

**Manifest:** §06 Pen-Stroke Synthesis; §08 Final Ink Interaction.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: regions *Ink Layer* and *Compositor*.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
