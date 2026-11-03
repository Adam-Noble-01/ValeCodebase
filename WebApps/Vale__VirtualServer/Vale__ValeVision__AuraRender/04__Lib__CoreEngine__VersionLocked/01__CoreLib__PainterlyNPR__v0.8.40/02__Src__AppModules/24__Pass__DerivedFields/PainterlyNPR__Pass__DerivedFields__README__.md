# 24__Pass__DerivedFields

**20-29 · Render graph and truth buffers** · real code since v0.5.0

Fields derived from the truth buffers, allocated on demand and released when stale.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__BoundaryDistance__Pass__.mjs` - Jump flooding: how far every pixel is from a wash edge, for both wash layers at once - pooling, tide marks and wet edges read it
- `PainterlyNPR__ProfileLines__Pass__.mjs` (v0.8.38) - Where a round thing ends on the sheet, found on the truth buffers: the rim of every ball, bowl, stem and downpipe, for the pen to trace (30) and the washes to be held by (51, 52)
- `Na__ProfileLines__Config.json` - What makes a rim round, which material classes need not be asked, how a rim is traced and what the washes do at it

**Belongs here**

- Signed or unsigned distance to a wash boundary (jump flooding).
- Stroke flow direction, paper absorption, wetness.
- A round form's rim: a Sobel over the normals, depth and object ids, as ValeVision 3D's profile lines (v0.8.38). It has no holes for a warp to walk through since `22`'s smooth flag has no flat middle on a turning facet (v0.8.39).

**Takes** masks from `51` and buffers from `22`. **Gives** fields for `52`, `53` and `40`.

**Manifest:** §05 Derived Painterly Buffers.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Boundary Distance* - one jump-flood run gives the distance field of two wash layers at once.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
