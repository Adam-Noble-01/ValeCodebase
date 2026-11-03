# 22__Pass__GeometryBuffers

**20-29 · Render graph and truth buffers** · real code since v0.5.0

The truth buffers: the scene projected through the camera into screen-space render targets.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__GeometryBuffers__Pass__.mjs` - The truth buffers: albedo, normals, depth, object and material ids and the light, in four targets at once; the navigation preview; the readback
- `PainterlyNPR__GeometryBuffers__Shaders__.mjs` - The truth buffers' fragment shader and the navigation preview's

**Belongs here**

- Albedo (restrained source colours), depth, view normals, object ID, material class ID, coverage, world position.
- One multiple-render-target geometry pass where supported - not a full scene render per buffer.

**Takes** geometry (`10`, `12`), camera (`70`), light (`23`). **Gives** the buffers every later pass reads.

**Manifest:** §05 Core Scene Buffers.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Geometry Buffers* - four MRT targets.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
