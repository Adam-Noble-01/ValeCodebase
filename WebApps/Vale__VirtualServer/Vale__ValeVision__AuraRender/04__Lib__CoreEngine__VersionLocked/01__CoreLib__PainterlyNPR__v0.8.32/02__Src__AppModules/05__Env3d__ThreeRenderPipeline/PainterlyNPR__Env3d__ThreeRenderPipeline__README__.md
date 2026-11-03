# 05__Env3d__ThreeRenderPipeline

**01-09 · The spine** · reserved: a README until real code arrives

Scene mode's 3D viewport: navigation and the working preview.

**Belongs here**

- SceneManager, CameraRig (orbit, pan, frame), Interaction (selection and picking by Object ID).
- The Navigation / Working Preview: basic materials, the accurate camera, coarse line candidates, reduced-resolution targets.
- three.js from `04__Src__Dependencies__VersionLocked`. The painterly passes do not live here: they live in 20 to 66, behind the render graph.

**Takes** the semantic scene (`12`) and a camera (`70`). **Gives** a responsive viewport and the truth buffers' camera.

**Manifest:** §03 Scene mode; §12 Two Quality Regimes; §13 Three.js.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Camera Rig* and the navigation preview (`PainterlyNPR__CameraRig__*`, `PainterlyNPR__GeometryBuffers__Preview`).
