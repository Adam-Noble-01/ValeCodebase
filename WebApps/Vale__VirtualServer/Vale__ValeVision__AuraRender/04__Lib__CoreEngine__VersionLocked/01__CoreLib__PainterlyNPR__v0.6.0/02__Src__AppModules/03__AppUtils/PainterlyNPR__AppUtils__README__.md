# 03__AppUtils

**01-09 · The spine** · real code since v0.5.0

Small, pure helpers shared by every band. Nothing here touches the DOM or the GPU.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__AppUtils__ConfigAccess__.mjs` - Read a section of a JSON config document - a copy, checked for every key the reader needs, or a loud failure that names the file and key
- `PainterlyNPR__AppUtils__Maths__.mjs` - Vectors, matrices as WebGL reads them, and colour from hex to linear light
- `PainterlyNPR__AppUtils__SeededRandom__.mjs` - Every stroke, wash and grain is seeded: independent streams, child seeds by label, hashed noise - and the one place randomness is unpredictable

**Belongs here**

- SeededRandom - mulberry32 streams and child seeds derived from identity labels (the same algorithm as AudioSPACE, so a seed means the same thing in both). `Math.random()` appears nowhere but where a fresh seed is minted.
- ConfigAccess - loud config reads: a missing key throws, never a silent default.
- Maths - vectors, matrices, projection, curves and resampling.
- Noise - seeded value, gradient and cellular noise for CPU passes, mirrored in GLSL so both sides agree.
- ColourScience - sRGB and linear light, pigment transmittance.

**Takes** -. **Gives** -.

**Manifest:** Design Thesis ("Randomness should create organic variety but remain controlled, seeded and reproducible"); §14 Deterministic Recall.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: regions *Seeded Random* and *Maths* (`PainterlyNPR__SeededRandom__*`, `PainterlyNPR__Maths__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
