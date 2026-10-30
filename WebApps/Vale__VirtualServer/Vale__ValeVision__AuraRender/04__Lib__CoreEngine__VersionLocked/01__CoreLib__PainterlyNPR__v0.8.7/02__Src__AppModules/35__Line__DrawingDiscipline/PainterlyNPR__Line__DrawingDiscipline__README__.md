# 35__Line__DrawingDiscipline

**30-39 · Pen and ink linework** · real code since v0.5.0

The Drawing Discipline macro: Technical -> Natural Pen -> Architectural Sketch -> Expressive Concept.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__DrawingDiscipline__Config.json` - Line Classes, the Drawing Discipline and the Pen
- `PainterlyNPR__DrawingDiscipline__Constants__.mjs` - The line classes, the four stops of the Drawing Discipline, and the Pen: every line control, its defaults and presets
- `PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs` - The Drawing Discipline at a looseness - four stops, interpolated - and the looseness that applies under the view's ceiling

**Belongs here**

- A multi-parameter macro, not one noise amplitude: wobble and drift by class, weight and pressure variation, endpoint behaviour, overdraw, small-detail suppression, break-up, organic gesture.
- View profiles set ceilings: Measured Elevation keeps strict centreline fidelity; Concept Elevation may loosen secondary lines.
- The geometry and camera never become inaccurate because the line style is loose.

**Takes** the style preset and view profile. **Gives** stroke parameters for `32`, `33` and `40`.

**Manifest:** §06 Global Macro: Drawing Discipline; §11 Elevation-Specific Constraints.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `DISCIPLINE_STOPS` and `PainterlyNPR__StrokeSynthesis__DisciplineAt` - four named stops, interpolated, capped by the camera's view profile.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
