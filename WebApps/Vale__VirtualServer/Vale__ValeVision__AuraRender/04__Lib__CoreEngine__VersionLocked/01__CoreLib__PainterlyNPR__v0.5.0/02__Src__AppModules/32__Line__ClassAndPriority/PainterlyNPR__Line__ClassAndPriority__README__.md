# 32__Line__ClassAndPriority

**30-39 · Pen and ink linework** · real code since v0.5.0

What survives artistic simplification.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LineCandidates__ClassAndPriority__.mjs` - A class's width and ink under the hierarchy contrast, and the lines a corner earns: construction lines and run-ons

**Belongs here**

- Primary (silhouettes, rooflines, openings, major divisions), secondary (reveals, cills, mullions, joinery), tertiary (furniture, paving joints, selected brickwork, foliage accents), optional (construction marks, tiny detail).
- Priority scoring: profile lines against a farther surface are promoted.
- Simplification before wobble: "increasing looseness should first simplify or remove low-priority information".

**Takes** visible runs (`31`), discipline (`35`), art direction (`65`). **Gives** prioritised runs for `33`.

**Manifest:** §06 Line Hierarchy.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the classify-and-simplify loop in `PainterlyNPR__LineCandidates__Run` (profile promotion, a stable keep-score per edge against the discipline's Keep by class) and `PainterlyNPR__LineCandidates__SplitByPresence` (lost and found edges).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
