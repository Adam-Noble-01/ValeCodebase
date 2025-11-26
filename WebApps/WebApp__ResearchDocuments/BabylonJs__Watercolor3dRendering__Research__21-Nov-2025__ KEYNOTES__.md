## Implementing "Pen & Wash" Watercolour Style In Babylon.js

### Key Notes 

###### Research Compiles - 21-Nov-2025

---



##### 2.2 The `LoadAssetContainerAsync` Strategy

The optimal workflow for high-fidelity material replacement utilizes the `SceneLoader.LoadAssetContainerAsync` method. Unlike standard import functions, this method loads the assets into a detached `AssetContainer` rather than the active scene.1 This container acts as a holding area, allowing for the programmatic inspection and modification of every mesh and material before they are ever rendered to the screen.

This strategy enables a "Load-Process-Instantiate" workflow:

**Asynchronous Loading:** The GLB is parsed, and geometry is loaded into memory, but it is not yet part of the scene graph.

**Material Iteration:** The code iterates through the `container.meshes` array.

**Texture Extraction:** For each mesh, the pipeline identifies the original `PBRMaterial` and extracts critical maps,primarily the Albedo (Base colour) and occasionally the Normal map. These textures are the only link between the artist’s original intent (e.g., "this object is red with a logo") and the new watercolour shader.

**Material Replacement:** A new stylized material is instantiated and assigned to the mesh.

**Scene Integration:** The processed assets are added to the scene using `container.addAllToScene()`.



----

