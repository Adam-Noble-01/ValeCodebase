# 70__Camera__ViewTypes

**70-79 · Camera, views and sheets** · real code since v0.5.0

The camera and view types, each saved view with its own artistic profile.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__CameraRig__Config.json` - Camera Presets
- `PainterlyNPR__CameraRig__Camera__.mjs` - The camera of the current render: computed from the state, projecting and unprojecting sheet pixels, presets, orbit and zoom, and aerial perspective
- `PainterlyNPR__CameraRig__Presets__.mjs` - The camera presets - three perspectives and two elevations - and the zoom's range

**Belongs here**

- Perspective exterior and interior cameras; orthographic and parallel projection.
- Saved views with independently selectable artistic profiles; sections later, when packages carry clipping semantics.

**Takes** the user's composition. **Gives** a camera and its view profile.

**Manifest:** §11 Camera and View Types.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the camera presets: Three-quarter, Garden corner, Down the path, and the 1:100 Measured and Concept elevations; an elevation leaves out the perspective-only backdrop (the distant tree belt).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
