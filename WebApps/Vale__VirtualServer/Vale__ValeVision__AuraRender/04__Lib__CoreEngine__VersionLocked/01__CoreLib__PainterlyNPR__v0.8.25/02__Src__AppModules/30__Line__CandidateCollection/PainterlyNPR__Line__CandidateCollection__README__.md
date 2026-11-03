# 30__Line__CandidateCollection

**30-39 · Pen and ink linework** · real code since v0.5.0

Collects line candidates from the seven sources, in order of authority.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LineCandidates__Collect__.mjs` - Every line the drawing might have - authored, hard and silhouette edges from the scene's own records, and the organic grammars' marks - collected, tested, classified and simplified

**Belongs here**

- 1 source-authored SketchUp lines; 2 mesh hard edges, respecting soft/smooth/hidden; 3 view-dependent silhouettes; 4 material and object boundaries; 5 screen-space supplements (Sobel-like - previews and diagnostics only); 6 procedural lines; 7 user-directed accents.
- A candidate holds source ID, instance, edge/stroke ID, class, priority, visibility, anchor, projected path, style reference, stable seed and view modifiers. The geometric centreline stays exact even when the drawn line is displaced.

**Takes** `12`, `14`, `22`. **Gives** candidates for `31`.

**Manifest:** §06 Line Extraction and Classification; Line Data Model.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `PainterlyNPR__LineCandidates__Run` (sources 1 to 3 and 6: authored, hard and smooth-silhouette edges, and the organic grammars' procedural lines; `PainterlyNPR__LineCandidates__IsSilhouette`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
