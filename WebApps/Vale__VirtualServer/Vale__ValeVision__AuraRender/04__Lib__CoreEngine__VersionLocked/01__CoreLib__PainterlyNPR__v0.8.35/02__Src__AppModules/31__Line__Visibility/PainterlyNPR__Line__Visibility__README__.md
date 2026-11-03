# 31__Line__Visibility

**30-39 · Pen and ink linework** · real code since v0.5.0

Occlusion with no impossible hidden lines and no bleed-through.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LineCandidates__Visibility__.mjs` - Whether a line is seen: each projected point tested against the truth buffers, a line split where it is lost and found - or let run out past the paint

**Belongs here**

- Each candidate tested against the depth buffer and split into visible runs.
- Coplanar authored strokes held by deliberate depth-bias and tolerance rules - never a blanket always-on-top cheat.
- A run remembers whether each end is a true corner, so overshoot never runs into an occluder.

**Takes** candidates (`30`) and depth (`22`). **Gives** visible runs for `32`.

**Manifest:** §06 Line Data Model.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `PainterlyNPR__LineCandidates__Visibility` - samples each projected edge against the depth buffer (the farthest of a 3x3 neighbourhood).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
