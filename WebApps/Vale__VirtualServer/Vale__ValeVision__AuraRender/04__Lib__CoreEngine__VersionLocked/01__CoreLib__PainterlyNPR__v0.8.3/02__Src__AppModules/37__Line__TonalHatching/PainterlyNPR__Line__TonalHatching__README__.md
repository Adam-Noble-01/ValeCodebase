# 37__Line__TonalHatching

**30-39 · Pen and ink linework** · real code since v0.5.0

Tone in pen: nested hatching that darkens without reshuffling.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__LineCandidates__Hatching__.mjs` - Tonal hatching: nested lines, so tone grows without reshuffling - each run as a hand draws it

**Belongs here**

- Tonal-art-map-inspired coherent stroke patterns: parallel lines at a spacing in millimetres, each with a fixed rank from a bit-reversed count, drawn where the tone beats its rank - a darker tone adds lines between those already drawn and never moves them.
- A second family crossing past a threshold (cross-hatching); direction and density per region from Art Direction (Hatch points), ownership resolved per pixel so two directions meet along a line and never overlap.
- Material take-up (render and brick take hatching, glass and planting do not), reach into light, hand-length strokes with jittered ends, breaks where the object under the line changes.
- Seeds keyed by the line's index and its source, so a tone change never reshuffles the pattern.

**Takes** light and material from `22`/`23`, tone and ownership from `66`, the discipline from `35`. **Gives** hatch strokes to `33`.

**Manifest:** §06 Pen-Stroke Synthesis; §07 (tonal-art-map-inspired coherent stroke patterns); §10 Point Types.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: `PainterlyNPR__LineCandidates__Hatching` and `__HatchRun`; the field's hatch channel in `FS_FIELD`.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
