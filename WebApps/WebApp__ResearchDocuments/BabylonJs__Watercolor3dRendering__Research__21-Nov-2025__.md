## Implementing "Pen & Wash" Watercolour Style In Babylon.js

###### Research Compiles - 21-Nov-2025

---

### 1. Introduction: The Convergence of Digital 3D and Analog Aesthetics

The pursuit of non-photorealistic rendering (NPR) within real-time graphics engines represents a fundamental divergence from the industry’s dominant trajectory. While the last decade of computer graphics development has been largely defined by the pursuit of Physically Based Rendering (PBR). an algorithmic attempt to model the behavior of light, energy conservation, and surface reflectance with optical precision, NPR seeks to simulate the subjective, interpretative qualities of artistic media. Among the various styles of NPR, the "Pen & Wash" aesthetic is uniquely challenging. It demands the synthesis of two distinct, often contradictory visual languages: the precise, structural definition of ink lines (the "Pen") and the fluid, chaotic, and stochastic dispersion of pigment (the "Wash").

Achieving this aesthetic in a web-based environment using Babylon.js requires a **sophisticated understanding of both the engine’s rendering pipeline** and the physical properties of the media being emulated. Unlike cel-shading, which relies on simple quantization of lighting vectors to create hard-edged bands of colour, a watercolour simulation must account for hydrodynamics, pigment granulation, edge darkening, and paper absorption. Furthermore, the "Pen" component cannot simply be a wireframe render; it must exhibit the geometric irregularities, variable line weights, and "jitter" characteristic of a hand-drawn sketch.

This report provides an exhaustive technical blueprint for implementing a Pen & Wash rendering pipeline in Babylon.js. It addresses the specific constraints of utilizing `.glb` (glTF) assets, the standard transmission format for 3D on the web,and details the necessary interventions in the asset loading process, material definition, and post-processing architecture. By synthesizing data from technical documentation, community research, and shader theory, this document outlines a stratified rendering approach that leverages Babylon.js’s Node Material Editor (NME), Geometry Buffer Renderer, and Post-Process System to achieve a result that transcends standard real-time rendering.



##### 1.1 The Theoretical Basis of Digital Watercolour

To reconstruct the watercolour look digitally, one must first deconstruct the analoge phenomenon. watercolour painting is a subtractive colour process where transparent pigment is suspended in water and applied to a textured, absorbent surface (paper). The visual result is governed by fluid dynamics and particularities of particle density.

The primary visual artifacts that a shader must emulate include:

**Granulation:** The tendency of heavy pigment particles to settle into the "valleys" of the paper’s texture, creating a grainy, uneven distribution of colour. In 3D, this suggests a relationship between the shading model and a screen-space texture mask.

**The "Coffee Ring" Effect:** As a wet wash dries, capillary action pulls pigment towards the perimeter of the droplet or stroke, resulting in a higher concentration of colour at the edges. In a 3D context, this implies that surface curvature and viewing angles (Fresnel effects) must drive pigment density.

**Turbulence and Flow:** Unlike the uniform albedo of a PBR material, watercolour exhibits internal turbulence where the pigment has dispersed unevenly. This requires coordinate domain warping and noise functions to disrupt the uniformity of the underlying texture maps.

**Transparency and Glazing:** watercolour is rarely opaque. Light passes through the pigment, reflects off the white paper, and passes back through the pigment. This interactions means that "white" in a 3D watercolour scene is not white paint, but the absence of geometry or the total transparency of the shader, revealing the background substrate.



##### 1.2 The "Pen" as Structural Abstraction

The ink line in a Pen & Wash illustration serves as a boundary representation. It delimits form and separates foreground from background. However, in technical or artistic sketching, these lines are rarely perfect mathematical projections. They exhibit:

**Overstriking:** Lines that continue slightly past a vertex or corner.

**Gap and Breakage:** Lines that fade or break where the pen pressure was light or the paper texture interfered with ink deposition.

**Jitter:** High-frequency deviations in the path of the line, representing the biomechanical tremor of the human hand.

Implementing this in Babylon.js requires "Edge Detection," a process of analysing the rendered scene’s geometric properties,specifically discontinuities in depth (Z-buffer) and surface normal orientation,to procedurally generate outlines that can then be stylised.

---

### 2. The Asset Pipeline: Intercepting GLB Rendering

To utilise `.glb` files presents the first major architectural hurdle. The glTF format is explicitly designed for PBR workflows. A standard GLB file contains meshes assigned to a `PBRMaterial`, with textures mapped to slots like Base colour (Albedo), Metallic, and Roughness. To achieve a painterly vibe, the rendering engine must be prevented from treating these assets as photorealistic objects.



### 2.1 The Limitations of Standard Import Methods

Babylon.js offers several methods for loading assets, including `SceneLoader.Append` and `SceneLoader.ImportMesh`. These methods typically parse the glTF data and immediately construct the corresponding Babylon meshes and PBR materials in the active scene. This behaviour is undesirable for an NPR pipeline because it may result in a "flash" of photorealistic rendering before scripts can swap the materials, or it may clutter the scene with materials that immediately need to be disposed of.

More critically, the standard `PBRMaterial` does not support the specific shading logic required for watercolour,such as domain-warped UVs or quantized lighting ramps,without significant modification. While it is possible to inject code into PBR shaders using `PBRCustomMaterial` or material plugins, the most robust and artistic-friendly approach is to replace the material entirely with a custom definition built in the Node Material Editor (NME).



##### 2.2 The `LoadAssetContainerAsync` Strategy

The optimal workflow for high-fidelity material replacement utilizes the `SceneLoader.LoadAssetContainerAsync` method. Unlike standard import functions, this method loads the assets into a detached `AssetContainer` rather than the active scene.1 This container acts as a holding area, allowing for the programmatic inspection and modification of every mesh and material before they are ever rendered to the screen.

This strategy enables a "Load-Process-Instantiate" workflow:

**Asynchronous Loading:** The GLB is parsed, and geometry is loaded into memory, but it is not yet part of the scene graph.

**Material Iteration:** The code iterates through the `container.meshes` array.

**Texture Extraction:** For each mesh, the pipeline identifies the original `PBRMaterial` and extracts critical maps,primarily the Albedo (Base colour) and occasionally the Normal map. These textures are the only link between the artist’s original intent (e.g., "this object is red with a logo") and the new watercolour shader.

**Material Replacement:** A new stylized material is instantiated and assigned to the mesh.

**Scene Integration:** The processed assets are added to the scene using `container.addAllToScene()`.

#### 2.3 Handling Material Cloning and Performance

A significant challenge in this pipeline is the management of shader instances. If a GLB contains 100 objects, each with a unique texture, creating 100 unique `NodeMaterial` instances can be performance-prohibitive. Research indicates that cloning Node Materials can take significant millisecond time per operation, leading to long initialization delays.

To mitigate this, the report recommends a caching strategy. The pipeline should maintain a dictionary of generated NPR materials, keyed by the unique ID of the source texture. When processing a mesh, the system first checks if a watercolour material for that specific albedo texture already exists. If so, it applies the existing material instance. If not, it clones a "Master" watercolour material, assigns the new texture, and caches it. This ensures that the expensive shader compilation and linking steps are minimized.

| **Feature**              | **Standard PBR Workflow**    | **NPR Asset Container Workflow**      |
| ------------------------ | ---------------------------- | ------------------------------------- |
| **Loading Method**       | `SceneLoader.Append`         | `SceneLoader.LoadAssetContainerAsync` |
| **Material Type**        | `PBRMaterial`                | `NodeMaterial` (Custom)               |
| **Render Timing**        | Immediate upon load          | Deferred until processing complete    |
| **Texture Handling**     | Automatic PBR mapping        | Manual extraction and reassignment    |
| **Lighting Calculation** | Physical energy conservation | Stylized quantization & diffusion     |



#### 2.4 Preserving UV Coordinates

It is crucial to note that while the shading model changes, the geometric mapping does not. The glTF format relies on explicit UV coordinates (TexCoord0) to map textures to geometry. The NPR shader must utilize these same UV sets to map the extracted Albedo textures. While the "Wash" effect will involve distorting these UVs to simulate fluid motion, the coordinate *origin* remains the data stored in the GLB mesh.4

---

#### 3. The Substrate: Emulating the Paper Surface

In a physical Pen & Wash painting, the paper is not merely a passive background; it is an active participant in the lighting model. The paper provides the texture, the white point, and the unified grain that ties the disparate elements of the scene together. Implementing this requires a layered approach that separates the paper simulation from the 3D geometry.



#### 3.1 Screen-Space v. Object-Space Texturing

A common mistake in 3D watercolour implementation is mapping the paper texture directly to the 3D objects using their UV coordinates. This results in the "papier-mâché" effect, where the paper grain rotates and scales with the object, destroying the illusion of a painting surface.

The correct approach for a Pen & Wash style is **Screen-Space Texturing**. The paper grain must appear to be a static plane through which the 3D world is viewed, or a canvas upon which the image is projected. This is achieved by using `screen.position` or viewport coordinates to sample the grain texture, rather than `mesh.uv`.5



#### 3.2 Implementation via Post-Processing

The most effective method for applying the paper substrate is through a full-screen **Post-Process**. This ensures that the grain is applied uniformly across the entire image, affecting both the 3D objects and the empty background equally.

Babylon.js allows for the creation of custom post-processes using the `BABYLON.PostProcess` class. This class takes a fragment shader that receives the rendered scene as a texture (often called `textureSampler`).

The mixing logic typically follows a "Multiply" or "Linear Burn" blend mode.7 In the fragment shader:

OpenGL Shading Language

```
vec4 scenecolour = texture2D(textureSampler, vUV);
vec4 papercolour = texture2D(paperSampler, vUV);
gl_Fragcolour = scenecolour * papercolour;
```

This mathematical multiplication ensures that the white areas of the scene remain white (assuming white paper), while darker areas pick up the grain and roughness of the substrate.



#### 3.3 Handling Aspect Ratio and Scaling

Real watercolour paper has a fixed physical grain size. However, digital screens vary wildly in resolution and aspect ratio. If the paper texture is simply stretched to fit the screen UVs (0 to 1), the grain will appear stretched on widescreen monitors.

To maintain a consistent, naturalistic grain, the shader must account for the screen's aspect ratio. This involves passing the screen width and height as uniforms to the shader and correcting the UV scaling factor so that the texture tiles square, regardless of the viewport dimensions.9



#### 3.4 Advanced Substrate Interactions: Parallax

While a static overlay is sufficient for basic effects, a high-fidelity simulation can implement a "Parallax Substrate." In this technique, the UV coordinates used to sample the paper texture are slightly offset based on the camera's movement vector. This creates a subtle sensation that the viewer is looking *at* a canvas, but the paint is moving slightly across it, or that the camera is panning over a large sheet of paper. This prevents the "dirty lens" feeling where the texture feels stuck to the monitor glass rather than part of the world.

------



## 4. The Wash: Node Material Architecture

The core of the painterly look,the "Wash",is defined by how the 3D surface interacts with light and colour. Since we have stripped the GLB of its PBR material, we must construct a new shading model using Babylon.js's **Node Material Editor (NME)**. This visual graph-based approach is powerful because it compiles down to optimized GLSL while allowing for rapid artistic iteration.10

The "Wash" shader must perform three critical abstractions: Light Quantization, Pigment Turbulence, and Edge Darkening.



### 4.1 Lighting Models: From Lambert to Toon

Standard rendering uses Lambertian or Blinn-Phong shading, which results in smooth, continuous gradients of light falloff. Watercolour, however, implies distinct "pools" of wetness and colour.

To achieve this, the NME graph should utilize a **Lights** block to calculate the raw diffuse intensity (N dot L), but instead of outputting this value directly, it should be used as the input for a remapping function.

- **Stepped Gradients:** Passing the light intensity through a `Step` or `SmoothStep` node creates distinct bands of colour,a "Toon" look.11
- **watercolour Softness:** Unlike the hard edges of anime shading, watercolour bands are soft. The `SmoothStep` function is ideal here, as it allows for a definable transition zone between the "lit" and "shadowed" wash. By modulating the `edge0` and `edge1` parameters of the smooth step with a noise function, the terminator line (the border between light and shadow) can be made to wobble and diffuse, mimicking the irregular drying of paint on rough paper.



### 4.2 Pigment Turbulence: Simulating Dispersion

A flat colour looks like plastic. A watercolour wash has internal variation caused by pigment particles bunching together or dispersing. This is simulated via **Domain Warping** or **Coordinate Perturbation**.4

In the NME graph:

**Noise Generation:** A `SimplexPerlin3D` block generates a noise field. Crucially, this should be driven by the `WorldPosition` of the mesh, not Screen Space. This ensures that the "texture" of the paint is attached to the object surface.

**UV Distortion:** The output of this noise block is scaled down (e.g., by a factor of 0.02 to 0.05) and added to the mesh's original `UV` coordinates.

**Sampling:** This distorted UV vector is then connected to the `Texture` block containing the Albedo map extracted from the GLB.

The result is that the image texture appears to "swim" or bleed slightly, breaking the rigid digital precision of the texture mapping. This simulates the physical phenomenon of wet pigment diffusing into the fibers of the paper.12



### 4.3 The Coffee Ring Effect: Fresnel Inversion

One of the most distinct signatures of watercolour is the "Coffee Ring" effect, where edges of a form appear darker and more saturated due to pigment accumulation.

This is simulated in Babylon.js using the **Fresnel** node in NME.13

- The Fresnel node calculates the dot product between the view vector and the surface normal. It typically outputs 0 at the center of the object (facing the camera) and 1 at the grazing angles (edges).
- By inverting this value and passing it through a `Pow` (Power) node to sharpen the curve, we isolate the rim of the object.
- This "Rim Mask" is then used to interpolate (Lerp) between the base colour and a darker, more saturated version of that colour.
- *Insight:* This technique effectively replaces the "Rim Light" common in PBR (which adds white to the edge) with a "Rim Darkening" (which adds pigment), flipping the lighting logic to match the physical medium.



### 4.4 coloured Shadows and the Shadow Depth Wrapper

Shadows in watercolour are rarely black. They are "glazes" of transparent, cool colours (often blues, violets, or Paynes Grey) laid over the warm substrate.

Standard shadow generators in Babylon.js cast black occlusion. To achieve coloured shadows in NME:

**Shadow Depth Wrapper:** The custom NME material must be assigned a `ShadowDepthWrapper` to participate correctly in shadow casting.14 This ensures the object renders into the shadow map depth buffer.

**Shadow Data:** The `Lights` block in NME outputs a `shadow` value (0.0 for shadowed, 1.0 for lit).

**colour Mixing:** Instead of multiplying the final colour by the shadow factor (which fades to black), use a `Mix` node.

- **Input A:** The shadow colour (e.g., a cool violet).
- **Input B:** The lit surface colour.
- **Alpha:** The `shadow` output from the Lights block.
- This results in a "Lit" object that transitions into a "Violet" shadow, retaining the luminosity characteristic of watercolour.14

------



## 5. The Pen: Algorithmic Line Extraction



While the NME handles the surface shading, the "Pen" outlines provide the structural definition essential to the style. In 3D graphics, there are no intrinsic "lines," so they must be mathematically extracted from the geometry. The most robust method for a "Pen & Wash" style, which requires capturing both silhouettes and internal details, is **Image-Space Edge Detection** via Post-Processing.



### 5.1 The Geometry Buffer (G-Buffer) Strategy



Image-space edge detection relies on analyzing the rendered frame to find discontinuities. However, analyzing the final RGB colour buffer is unreliable,a black texture on a white object creates a visual "edge" that is not a geometric edge.

To solve this, Babylon.js employs the **GeometryBufferRenderer**.16 This renderer generates auxiliary textures that are not displayed to the screen but are readable by shaders:

1. **Depth Buffer:** Encodes the distance of each pixel from the camera. Abrupt changes in depth indicate the silhouette of an object against the background.
2. **Normal Buffer:** Encodes the orientation of the surface vector at each pixel. Abrupt changes in normal direction indicate a sharp corner or crease (e.g., the edge of a cube or the fold of a cloth).



### 5.2 The Sobel Operator Implementation



The core of the edge detection is the **Sobel Operator**, a convolution filter used to calculate the gradient of image intensity.

In the custom post-process shader 18:

1. The shader samples the Depth and Normal textures.
2. For every pixel, it samples the surrounding 8 pixels (the kernel).
3. It applies the Sobel matrix weights to these samples to compute the gradient magnitude (rate of change).
4. If the gradient magnitude exceeds a defined threshold, the pixel is flagged as an edge.

The Sobel operator is preferred over simpler difference filters because it is isotropic (detects edges in all directions equally) and provides a gradient magnitude that can be used to drive line weight (stronger edges = thicker lines).



### 5.3 Stylizing the Line: Jitter and Imperfection



A raw Sobel filter produces technically perfect, single-pixel lines. This looks like a CAD wireframe, not a pen sketch. To achieve the "Pen" look, the shader must introduce algorithmic imperfection.



#### 5.3.1 Coordinate Jitter



To simulate the tremor of a human hand, we apply **Coordinate Jitter**.20 Before sampling the G-Buffer to detect edges, the sampling coordinates (UVs) are perturbed by a noise function.

- **Mechanism:** `distortedUV = originalUV + (noise(originalUV) * jitterStrength)`.
- **Result:** The edge detection algorithm "looks" for the edge in slightly the wrong place. When the edge is drawn, it appears offset from the actual geometry. By animating the noise seed over time, the lines can appear to "boil" or wiggle, creating a lively, animated sketch feel.



#### 5.3.2 Line Breakage and Texture



Real pens skip over the rough texture of paper. This is simulated by modulating the opacity of the detected edge with a high-frequency noise mask.22

- **Logic:** If an edge is detected, the opacity is not simply 1.0 (black). It is `1.0 * PaperNoise`.
- **Result:** The lines appear textured and broken, rather than solid digital vectors.



#### 5.3.3 Variable Width via Distance



Uniform line widths look artificial. In a real drawing, lines often thicken at junctions or pressure points. While we cannot measure "pressure" in a 3D render, we can use the **Depth** value to modulate line width.

- **Depth-Based Scaling:** By multiplying the edge threshold or the thickness kernel by the depth value, lines can be made thinner for distant objects and thicker for foreground objects.23 This not only improves the artistic look but also reduces aliasing artifacts on distant geometry.

------



##### 6. The Abstraction Layer: The Kuwahara Filter

One of the most advanced techniques for bridging the gap between 3D rendering and 2D painting is the **Kuwahara Filter**. While edge detection handles the lines and NME handles the colour, the underlying textures of a GLB (often photographs of real materials) can still look too "detailed" and realistic, breaking the watercolour illusion.



##### 6.1 Painterly Abstraction

The Kuwahara filter is a non-linear smoothing filter used to create a painterly effect.24 Unlike a Gaussian blur, which softens everything, the Kuwahara filter is edge-preserving. It works by abstracting complex textures into regions of flat colour, simulating the stroke of a broad brush.



#### 6.2 The Algorithm

The filter operates by calculating the mean (average colour) and variance (standard deviation) of colour within four sub-regions (quadrants) surrounding a pixel.

The algorithm samples pixels in the top-left, top-right, bottom-left, and bottom-right quadrants relative to the center pixel.

It calculates the variance for each quadrant. High variance means the quadrant contains complex details or edges. Low variance means the quadrant is mostly a solid colour.

The filter outputs the mean colour of the quadrant with the **lowest variance**.



### 6.3 Implementation in Babylon.js

Babylon.js does not include a Kuwahara filter in its default pipeline, so it must be implemented as a custom `PostProcess` shader. The GLSL code for Kuwahara is standard in the graphics community.

- **Placement:** This filter should be applied *before* the Edge Detection pass. This ensures that the "paint" is smoothed out, but the "pen" lines drawn on top remain sharp and crisp.
- **Performance:** The Kuwahara filter is computationally expensive (O(N^2) relative to kernel radius). For a real-time web application, a kernel radius of 3 to 5 pixels is usually the upper limit before frame rates drop.
- **Generalized Kuwahara:** More advanced versions, like the Anisotropic Kuwahara 25, orient the kernel along the flow of the image structure. While visually superior, providing directionality to the brush strokes, they require computing a structure tensor, which may be prohibitively expensive for a standard WebGL pipeline targeting mobile devices.

------



## 7. Performance Considerations and Optimization



Implementing a multi-stage NPR pipeline imposes a significant load on the GPU. Standard PBR is optimized for efficiency; the Pen & Wash pipeline involves multiple render targets (MRTs) and complex fragment shader logic.



### 7.1 The Cost of Post-Processing



Every active `PostProcess` implies a full-screen quad render. Chaining a Kuwahara filter, an Edge Detection filter, and a Paper Composite filter means the scene is effectively being processed three additional times per frame.

- **Optimization:** Combine compatible passes. The Edge Detection and Paper Composite can technically be merged into a single shader pass to reduce draw calls. The Kuwahara filter, requiring neighbor sampling, typically needs its own pass.



### 7.2 WebGL vs. WebGPU



Babylon.js supports both WebGL 1/2 and WebGPU. For a complex NPR pipeline, **WebGPU** offers distinct advantages, particularly in how it handles compute shaders (which could be used for more efficient edge detection or fluid simulation) and reduced overhead for draw calls. However, glTF loading and NME are fully compatible with WebGL 2, ensuring broad compatibility.26



### 7.3 Freezing and Baking



If the scene contains static elements, performance can be drastically improved by **freezing** the generated shadow maps.27 Since watercolour shadows are stylized and diffused, they do not need the pixel-perfect updates of a hard-shadow PBR simulation. Setting shadow generators to `REFRESHRATE_RENDER_ONCE` can save significant GPU cycles.

Similarly, if the "paper grain" does not need to animate (no jitter), the paper texture lookup can be optimized or baked into the display pass rather than calculated procedurally.

------



## 8. Step-by-Step Implementation Roadmap



Based on the analysis of the research snippets, the following roadmap defines the optimal path for implementation.



### Phase 1: Infrastructure Setup



1. Initialize the `Engine` and `Scene`.
2. Enable the `GeometryBufferRenderer` on the scene instance. This is a prerequisite for the "Pen" layer.
3. Configure the `LoadAssetContainerAsync` pattern for GLB ingestion.



### Phase 2: The "Wash" Material (NME)



1. Open the Node Material Editor.
2. Create a graph that accepts `Albedo` (Texture), `WorldPosition`, `Normals`, and `UVs`.
3. Implement the **Turbulence Block**: Use `SimplexPerlin3D` driven by `WorldPosition` to offset the UVs feeding the Albedo texture.
4. Implement the **Lighting Block**: Use `Lights` node -> `SmoothStep` to create soft, quantized lighting bands.
5. Implement the **Shadow Block**: Use `ShadowDepthWrapper` logic and `Mix` nodes to tint shadows violet/blue.
6. Export this graph as a JSON file to be loaded at runtime.



### Phase 3: The "Pen" Post-Process



1. Write a custom GLSL fragment shader for Edge Detection.
2. Implement the Sobel operator sampling `textureSampler` (scene colour), `depthSampler` (from G-Buffer), and `normalSampler` (from G-Buffer).
3. Add noise-based UV perturbation to the sampling coordinates to create line jitter.
4. Instantiate this as a `BABYLON.PostProcess` and attach it to the camera.



### Phase 4: The "Substrate" Composite



1. Obtain a seamless watercolour paper texture.
2. Create a final PostProcess (or integrate into the Pen pass) that multiplies the screen colour by the paper texture.
3. Ensure the aspect ratio of the texture is corrected using screen width/height uniforms.



### Phase 5: Integration



1. In the asset loading callback, iterate through the container's meshes.
2. Clone the "Master" NME wash material for each mesh.
3. Assign the mesh's original Albedo texture to the clone.
4. Assign the new material to the mesh.
5. Add the container to the scene.

------



## 9. Conclusion



The creation of a "Pen & Wash" style in Babylon.js is a testament to the engine's flexibility. It requires the developer to step outside the bounds of the "correct" PBR rendering path and embrace the "incorrect" physics of art. By substituting the optical precision of physically based rendering with the statistical abstraction of the Kuwahara filter, the fluid dynamics of domain-warped shaders, and the structural synthesis of edge detection, one can transform rigid 3D geometry into a living illustration.

The path detailed in this report,leveraging the Asset Container for material interception, the Node Material Editor for pigment simulation, and the Post-Process pipeline for structural stylization,represents the state-of-the-art workflow for web-based NPR. It balances the aesthetic demands of the style with the performance constraints of the browser, providing a robust foundation for any application seeking to evoke the charm of ink and watercolour.

| **Technique**      | **Implementation Tool**   | **Purpose in Pen & Wash**                           |
| ------------------ | ------------------------- | --------------------------------------------------- |
| **Asset Loading**  | `LoadAssetContainerAsync` | Prevents PBR rendering, allows material swap.       |
| **Pigment Flow**   | `NodeMaterial` (NME)      | Simulates wet paint, turbulence, and dispersion.    |
| **Edge Darkening** | `Fresnel` Node (NME)      | Simulates the "coffee ring" effect of drying paint. |
| **Outline (Pen)**  | `PostProcess` + G-Buffer  | Generates structural lines from depth/normals.      |
| **Sketchiness**    | UV Jitter (GLSL)          | Adds human imperfection to the calculated lines.    |
| **Abstraction**    | Kuwahara Filter           | Removes photorealism; creates "brush strokes."      |
| **Substrate**      | Multiply Blend            | Integrates the paper texture into the lighting.     |