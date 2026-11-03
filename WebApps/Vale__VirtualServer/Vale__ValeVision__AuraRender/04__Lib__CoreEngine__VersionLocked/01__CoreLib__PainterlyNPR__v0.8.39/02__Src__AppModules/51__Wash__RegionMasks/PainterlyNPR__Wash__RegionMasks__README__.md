# 51__Wash__RegionMasks

**50-59 · Watercolour paint and paper** · real code since v0.5.0

The exact geometry mask and the artistic wash mask are independent.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__WashRegions__Pass__.mjs` - The wash masks loosened: a domain-warped region map with a depth guard, so a wash wanders past its edge as a brush does, never across a depth step

**Belongs here**

- Controlled dilation, distortion, feathering and paper absorption make the loosened mask.
- Pigment may stray past a pen line or withdraw within it; pen strokes stay on the true edge.
- Depth and object masks stop a background wash crossing a nearer object; explicit overrides when an overlap is wanted.

- Held at a round form's rim (v0.8.38): the warp stops at 24's band, so a wash strays only a hand's looseness past it.
- No flecks (v0.8.39): a warped read cut off from the rest of what it read, by a whole square ring of pixels reading something else, goes back to its own place. Left, it is an edge with a white ring round it. The test is exact, so a thin straight thing is never one.

**Takes** the truth buffers (`22`). **Gives** loosened region masks for `24` and `52`.

**Manifest:** §08 Paint Outside the Lines.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Wash Regions* - a domain-warped region map with a depth guard.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
