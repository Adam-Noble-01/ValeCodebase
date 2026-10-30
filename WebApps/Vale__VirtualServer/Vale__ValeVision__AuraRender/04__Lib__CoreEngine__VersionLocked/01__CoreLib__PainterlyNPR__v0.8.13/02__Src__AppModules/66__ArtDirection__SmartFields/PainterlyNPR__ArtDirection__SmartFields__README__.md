# 66__ArtDirection__SmartFields

**65-69 · Art direction** · real code since v0.5.0

Influence that selects intelligently without claiming machine learning.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__SmartFields__Config.json` - Smart Fields - Line Run-out and Vignette (the vignette's shape since v0.5.3, retuned to reach further down the sheet; the app no longer matches the experiment there)
- `PainterlyNPR__ArtDirection__FieldShader__.mjs` - The art direction field's fragment shader: irregular falloff, object and material targeting through the id buffers, and the sheet's vignette
- `PainterlyNPR__ArtDirection__Field__.mjs` - The art direction field: every point's influence rendered into one field the lines and the washes both obey, read back for the CPU, and the run-out points. Since v0.8.9 a host showing only part of the sheet fits the vignette to that part: `PainterlyNPR__ArtDirection__SetFrame({ CentreMm, Scale })` (the frame's middle in sheet mm, its size over the sheet's, across and up apart), `null` for the sheet's own (pixel for pixel as before); the caller bumps `Composition`. ValeVision AURA uses it for its viewports.

**Belongs here**

- A radial or elliptical falloff modulated by paper location, clicked material, instance identity, luminance, depth, normals, protection masks and seeded low-frequency irregularity.
- Show Influence reveals the generated mask for diagnosis.

**Takes** points (`65`) and the truth buffers (`22`). **Gives** a field every downstream pass reads.

**Manifest:** §10 Smart Influence Fields.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the art-direction field pass (`PainterlyNPR__ArtDirection__*`) - irregular falloff, object and material targeting through the ID buffers.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
