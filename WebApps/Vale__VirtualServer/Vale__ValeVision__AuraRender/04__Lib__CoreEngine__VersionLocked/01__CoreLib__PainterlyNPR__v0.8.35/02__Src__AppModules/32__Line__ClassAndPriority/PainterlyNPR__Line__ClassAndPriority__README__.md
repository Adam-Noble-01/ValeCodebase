# 32__Line__ClassAndPriority

**30-39 · Pen and ink linework** · real code since v0.5.0

What survives artistic simplification.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LineCandidates__ClassAndPriority__.mjs` - A class's ink under the hierarchy contrast, and the lines a corner earns: construction lines and run-ons (the base pen since v0.8.0)

**The technical pens** (v0.8.0, written fresh, Adam's specification `08__Data__StrokeLibrary/PainterlyNPR__PenPresets__PointWeights__.md`)

- `Na__TechnicalPens__Config.json` - the one place a pen width is decided: STAEDTLER Mars matic 700 M013, M018, M025, M035 - Base lines 0.13 mm, Minor features 0.18, Structural lines 0.25, Profile lines 0.35, absolute widths on the printed sheet; which pen each part of the scene takes (by Category, Material, Role); the silhouette and ground-line promotions; what simplification, Lost in light and points may do to a pen; the Technical and Variable modes. The same keys and names as ValeVision AURA's annotation pens.
- `PainterlyNPR__TechnicalPens__Tiers__.mjs` (282 lines) - the pens and their rules: `EdgeTier` (an edge's pen, the strongest that applies), `PointSteps` and `Shift` (a point's weight in whole pens), `WidthMm` (exact in the technical mode), `PxPerMm` and `SetPrintPxPerMm` (the print density a host can set), the constants every producer reads.
- A line's class (Primary to Optional) stays visibility and priority - presence needed, lost in light, ink. Its pen is decided apart, from what it belongs to: a wall's silhouette 0.35, a roof edge 0.25, window joinery 0.18, its brickwork 0.13.

**Belongs here**

- Primary (silhouettes, rooflines, openings, major divisions), secondary (reveals, cills, mullions, joinery), tertiary (furniture, paving joints, selected brickwork, foliage accents), optional (construction marks, tiny detail).
- Priority scoring: profile lines against a farther surface are promoted.
- Simplification before wobble: "increasing looseness should first simplify or remove low-priority information".

**Takes** visible runs (`31`), discipline (`35`), art direction (`65`). **Gives** prioritised runs for `33`.

**Manifest:** §06 Line Hierarchy.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the classify-and-simplify loop in `PainterlyNPR__LineCandidates__Run` (profile promotion, a stable keep-score per edge against the discipline's Keep by class) and `PainterlyNPR__LineCandidates__SplitByPresence` (lost and found edges).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
