// =============================================================================
// VALEVISION3D - RENDER EFFECT - PROFILE LINES
// =============================================================================
//
// FILE      : Na__RenderEffect__ProfileLines__.js
// NAMESPACE : ValeVision3D
// MODULE    : Na__RenderEffect__ProfileLines__
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : SketchUp-style profile lines via normal-discontinuity edge detection
// CREATED   : 2025
//
// DESCRIPTION:
// - Renders extra visible edges around rounded/cylindrical geometry by detecting
//   normal discontinuities and compositing dark lines over the scene.
// - Normal buffer rendered using MeshNormalMaterial scene override pass.
// - Line geometry (LineSegments2) hidden during the normal pass to avoid artifacts.
// - Profile colour pass composites linework vertex colours over a flat fallback colour.
// - ShaderPass applies a Sobel operator on the normal buffer to detect and draw edges.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Mar-2026 - Version 1.0.0
// - Initial stable release.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports and Constants
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Linework Settings Runtime Factors
    // ------------------------------------------------------------
    import { Na__LineworkSettings__GetProfileLineFactor } from './Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Config Values
    // ------------------------------------------------------------
    const PROFILE_LINES__DEFAULT_EDGE_COLOR            = 3355443;  // <-- Dark grey (0x333333)
    const PROFILE_LINES__DEFAULT_EDGE_THRESHOLD_NORMAL = 0.3;      // <-- Normal gradient sensitivity
    const PROFILE_LINES__DEFAULT_EDGE_THRESHOLD_DEPTH  = 0.002;    // <-- Depth discontinuity (reserved)
    const PROFILE_LINES__DEFAULT_EDGE_WIDTH            = 1.0;      // <-- Line thickness in pixels
    const PROFILE_LINES__DEFAULT_EDGE_WIDTH_MIN        = 0.25;     // <-- Minimum edge width (far distance)
    const PROFILE_LINES__DEFAULT_EDGE_WIDTH_MAX        = 1.5;      // <-- Maximum edge width (near distance)
    const PROFILE_LINES__DEFAULT_EDGE_WIDTH_DIST_NEAR  = 2.0;      // <-- Distance at which max width applies (world units)
    const PROFILE_LINES__DEFAULT_EDGE_WIDTH_DIST_FAR   = 40.0;     // <-- Distance at which min width applies (world units)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert Integer Color to Three.js Color
    // ---------------------------------------------------------------
    function intColorToThree(intColor) {
        const r = ((intColor >> 16) & 255) / 255; // <-- Extract red channel
        const g = ((intColor >>  8) & 255) / 255; // <-- Extract green channel
        const b = ( intColor        & 255) / 255; // <-- Extract blue channel
        return new THREE.Color(r, g, b);
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Walk Parent Chain to Detect Linework GLB Root
    // ---------------------------------------------------------------
    // The model loader tags each linework GLB root with
    //   userData.Na__ModelType = 'linework'
    // This helper walks an object's ancestor chain testing for that tag so
    // that any node nested anywhere inside a linework GLB tree can be cleanly
    // identified and skipped by passes that should only operate on meshes.
    // ---------------------------------------------------------------
    function Na__IsInsideLineworkGroup(object) {
        let current = object;                                                 // <-- Start at the object itself
        while (current) {
            if (current.userData && current.userData.Na__ModelType === 'linework') {
                return true;                                                  // <-- Found linework root in ancestor chain
            }
            current = current.parent;                                         // <-- Walk up scene graph
        }
        return false;                                                         // <-- No linework ancestor found
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Collect Line Objects for Normal-Pass Visibility Toggle
    // ---------------------------------------------------------------
    function collectLineObjects(scene) {
        const lineObjects = [];
        scene.traverse((obj) => {
            if (obj.isLine2 || obj.isLineSegments2) lineObjects.push(obj); // <-- Collect all line segment objects
        });
        return lineObjects;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Collect Visible Mesh Objects
    // ---------------------------------------------------------------
    // Filters in three stages, each a defensive backstop for the next:
    //   1. obj.isMesh must be true ........................... only real meshes considered
    //   2. obj.isLine2 / obj.isLineSegments2 must be false ... fat-line shells set isMesh=true internally and must NEVER have their LineMaterial swapped
    //   3. ancestor chain must not be a linework GLB root .... defensive: ignore any stray Mesh nodes nested inside a linework GLB tree
    // ---------------------------------------------------------------
    function collectMeshObjects(scene) {
        const meshObjects = [];
        scene.traverse((obj) => {
            if (!obj.isMesh)                        return;                  // <-- Only real meshes are considered
            if (obj.isLine2 || obj.isLineSegments2) return;                  // <-- LineSegments2 sets isMesh=true internally; their LineMaterial must NEVER be swapped
            if (Na__IsInsideLineworkGroup(obj))     return;                  // <-- Defensive: ignore stray Mesh nodes nested inside a linework GLB root
            meshObjects.push(obj);                                            // <-- Real surface mesh; eligible for the profile-colour swap
        });
        return meshObjects;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Profile Lines Shader Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build Profile Lines Shader (Sobel on Normals)
    // ---------------------------------------------------------------
    function buildProfileLinesShader(config) {
        const edgeColor = intColorToThree(
            Number.isFinite(config.RenderEffect__ProfileLines__EdgeColor)
                ? config.RenderEffect__ProfileLines__EdgeColor
                : PROFILE_LINES__DEFAULT_EDGE_COLOR
        );
        const edgeThresholdNormal = Number.isFinite(config.RenderEffect__ProfileLines__EdgeThresholdNormal)
            ? config.RenderEffect__ProfileLines__EdgeThresholdNormal
            : PROFILE_LINES__DEFAULT_EDGE_THRESHOLD_NORMAL;
        const edgeWidth = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidth)
            ? config.RenderEffect__ProfileLines__EdgeWidth
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH;

        return {
            uniforms: {
                tDiffuse:              { value: null },
                tNormal:               { value: null },
                tProfileColor:         { value: null },
                resolution:            { value: new THREE.Vector2(1, 1) },
                u_edgeColor:           { value: edgeColor },
                u_edgeThresholdNormal: { value: edgeThresholdNormal },
                u_edgeWidth:           { value: edgeWidth },
                u_sillyAmplitudePx:    { value: 0.0 },                        // <-- Silly Lines wave amplitude in px (0 = straight)
                u_sillyWavelengthPx:   { value: 120.0 },                      // <-- Silly Lines wavelength in px
                u_sillyPxOffset:       { value: new THREE.Vector2(0, 0) }     // <-- Full-image px offset (tiled exports keep waves seam-free)
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tNormal;
                uniform sampler2D tProfileColor;
                uniform vec2      resolution;
                uniform vec3      u_edgeColor;
                uniform float     u_edgeThresholdNormal;
                uniform float     u_edgeWidth;
                uniform float     u_sillyAmplitudePx;
                uniform float     u_sillyWavelengthPx;
                uniform vec2      u_sillyPxOffset;

                varying vec2 vUv;

                void main() {
                    vec2  invRes = 1.0 / resolution;
                    float stepX  = invRes.x * u_edgeWidth;
                    float stepY  = invRes.y * u_edgeWidth;

                    // SILLY LINES | Sine-wave perturbation of the edge sampling UV.
                    // Phase runs in full-image pixel space so waves stay continuous
                    // across export tiles. The scene colour is sampled unperturbed -
                    // only the detected edges wobble.
                    vec2 sampleUv = vUv;
                    if (u_sillyAmplitudePx > 0.0) {
                        vec2  pxCoord = vUv * resolution + u_sillyPxOffset;
                        float phase   = 6.2831853 / u_sillyWavelengthPx;
                        sampleUv += vec2(sin(pxCoord.y * phase), sin(pxCoord.x * phase)) * u_sillyAmplitudePx * invRes;
                    }

                    vec3 nC = texture2D(tNormal, sampleUv).rgb;
                    vec3 nL = texture2D(tNormal, sampleUv - vec2(stepX, 0.0)).rgb;
                    vec3 nR = texture2D(tNormal, sampleUv + vec2(stepX, 0.0)).rgb;
                    vec3 nD = texture2D(tNormal, sampleUv - vec2(0.0, stepY)).rgb;
                    vec3 nU = texture2D(tNormal, sampleUv + vec2(0.0, stepY)).rgb;

                    float gx   = length(nR - nL);
                    float gy   = length(nU - nD);
                    float edge = sqrt(gx * gx + gy * gy);

                    vec4  sceneColor   = texture2D(tDiffuse, vUv);
                    vec3  profileColor = texture2D(tProfileColor, sampleUv).rgb;
                    float softness     = u_edgeThresholdNormal * 0.5;
                    float blend        = smoothstep(u_edgeThresholdNormal - softness, u_edgeThresholdNormal + softness, edge);

                    gl_FragColor = mix(sceneColor, vec4(profileColor, 1.0), blend);
                }
            `
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Profile Lines Effect - Core API
// -----------------------------------------------------------------------------

    // FUNCTION | Create Normal Render Target and Profile Lines Pass
    // ------------------------------------------------------------
    function Na__RenderEffect__ProfileLines__Create(renderer, scene, camera, config, width, height, orbitTarget) {
        const pixelRatio = renderer.getPixelRatio();
        const w          = (width  || window.innerWidth)  * pixelRatio; // <-- Physical pixel width
        const h          = (height || window.innerHeight) * pixelRatio; // <-- Physical pixel height

        const normalRenderTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter:     THREE.LinearFilter,
            magFilter:     THREE.LinearFilter,
            format:        THREE.RGBAFormat,
            type:          THREE.UnsignedByteType,
            depthBuffer:   true,
            stencilBuffer: false,
            depthTexture:  new THREE.DepthTexture(w, h, THREE.FloatType) // <-- Shared with fog to eliminate the separate depth pre-pass
        });
        normalRenderTarget.texture.name = 'ProfileLines_NormalBuffer';

        const halfW = Math.max(1, Math.ceil(w * 0.5));                       // <-- Half-res width
        const halfH = Math.max(1, Math.ceil(h * 0.5));                       // <-- Half-res height
        const profileColorRenderTarget = new THREE.WebGLRenderTarget(halfW, halfH, {
            minFilter:     THREE.LinearFilter,
            magFilter:     THREE.LinearFilter,
            format:        THREE.RGBAFormat,
            type:          THREE.UnsignedByteType,
            depthBuffer:   true,
            stencilBuffer: false
        });
        profileColorRenderTarget.texture.name = 'ProfileLines_ProfileColorBuffer';

        const normalMaterial  = new THREE.MeshNormalMaterial();                  // <-- Override material for normal prepass
        const shaderConfig    = {
            RenderEffect__ProfileLines__EdgeColor:           config.RenderEffect__ProfileLines__EdgeColor,
            RenderEffect__ProfileLines__EdgeThresholdNormal: config.RenderEffect__ProfileLines__EdgeThresholdNormal,
            RenderEffect__ProfileLines__EdgeThresholdDepth:  config.RenderEffect__ProfileLines__EdgeThresholdDepth,
            RenderEffect__ProfileLines__EdgeWidth:           config.RenderEffect__ProfileLines__EdgeWidth
        };
        const profileLinesShader = buildProfileLinesShader(shaderConfig);        // <-- Build shader from config
        const profileLinesPass   = new ShaderPass(profileLinesShader);           // <-- Create postprocess pass
        profileLinesPass.material.uniforms.tNormal.value       = normalRenderTarget.texture;       // <-- Bind normal buffer
        profileLinesPass.material.uniforms.tProfileColor.value = profileColorRenderTarget.texture; // <-- Bind colour buffer

        const fallbackProfileColor         = profileLinesPass.material.uniforms.u_edgeColor.value.clone();
        const profileColorFallbackMaterial = new THREE.MeshBasicMaterial({
            color              : fallbackProfileColor,
            side               : THREE.DoubleSide,
            polygonOffset      : true,
            polygonOffsetFactor: 2,
            polygonOffsetUnits : 2
        });

        // DYNAMIC EDGE WIDTH CONFIG | Distance-Based Scaling Parameters
        const edgeWidthMin      = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidthMin)
            ? config.RenderEffect__ProfileLines__EdgeWidthMin
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH_MIN;
        const edgeWidthMax      = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidthMax)
            ? config.RenderEffect__ProfileLines__EdgeWidthMax
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH_MAX;
        const edgeWidthDistNear = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidthDistanceNear)
            ? config.RenderEffect__ProfileLines__EdgeWidthDistanceNear
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH_DIST_NEAR;
        const edgeWidthDistFar  = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidthDistanceFar)
            ? config.RenderEffect__ProfileLines__EdgeWidthDistanceFar
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH_DIST_FAR;
        const edgeWidthDistRange = edgeWidthDistFar - edgeWidthDistNear; // <-- Precompute denominator
        const edgeWidthStatic    = Number.isFinite(config.RenderEffect__ProfileLines__EdgeWidth)
            ? config.RenderEffect__ProfileLines__EdgeWidth
            : PROFILE_LINES__DEFAULT_EDGE_WIDTH;                          // <-- Base width when distance scaling is unavailable
        let cachedLineObjects = [];
        let cachedMeshObjects = [];
        let cachedOriginalMaterials = [];                                    // <-- Pre-allocated per-mesh material backup array
        let sceneCacheDirty = true;


        // SUB FUNCTION | Resize Render Targets to Match Viewport
        // ---------------------------------------------------------------
        function setSize(nw, nh) {
            const currentPixelRatio = renderer.getPixelRatio();
            const nwPx = nw * currentPixelRatio;
            const nhPx = nh * currentPixelRatio;
            normalRenderTarget.setSize(nwPx, nhPx);                                      // <-- Resize normal buffer (full-res, also carries the shared depth texture)
            profileColorRenderTarget.setSize(
                Math.max(1, Math.ceil(nwPx * 0.5)),                                      // <-- Half-res width
                Math.max(1, Math.ceil(nhPx * 0.5))                                       // <-- Half-res height
            );
            profileLinesPass.material.uniforms.resolution.value.set(nwPx, nhPx);        // <-- Update shader resolution uniform
        }
        // ---------------------------------------------------------------
        setSize(width || window.innerWidth, height || window.innerHeight);


        // SUB FUNCTION | Rebuild Cached Scene Object Collections
        // ---------------------------------------------------------------
        function rebuildSceneCache() {
            cachedLineObjects = collectLineObjects(scene);
            cachedMeshObjects = collectMeshObjects(scene);
            cachedOriginalMaterials = new Array(cachedMeshObjects.length);    // <-- Pre-allocate to mesh count; slots reused every frame
            sceneCacheDirty = false;

            console.log(                                                      // <-- One-shot diagnostic; verifies mesh/linework split is clean
                `[ProfileLines] Scene cache rebuilt: `
                + `${cachedMeshObjects.length} meshes (swap), `
                + `${cachedLineObjects.length} lines (hide)`
            );
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Invalidate Cached Scene Object Collections
        // ---------------------------------------------------------------
        function invalidateSceneCache() {
            sceneCacheDirty = true;
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Render Normal and Profile Colour Pre-Passes
        // ---------------------------------------------------------------
        function renderProfileNormals() {
            const widthFactor = Na__LineworkSettings__GetProfileLineFactor();           // <-- User thickness factor (Advanced Linework Settings)
            if (orbitTarget && edgeWidthDistRange > 0) {
                const dist = camera.position.distanceTo(orbitTarget);                   // <-- Camera-to-target distance
                const t    = 1.0 - Math.max(0, Math.min(1, (dist - edgeWidthDistNear) / edgeWidthDistRange)); // <-- 1 = near (thick), 0 = far (thin)
                profileLinesPass.material.uniforms.u_edgeWidth.value = (edgeWidthMin + t * (edgeWidthMax - edgeWidthMin)) * widthFactor; // <-- Lerp: far=min, near=max, scaled by user factor
            } else {
                profileLinesPass.material.uniforms.u_edgeWidth.value = edgeWidthStatic * widthFactor; // <-- Static config width scaled by user factor
            }

            if (sceneCacheDirty) {
                rebuildSceneCache();
            }

            const lineObjects = cachedLineObjects; // <-- Reuse cached line segment objects
            const meshObjects = cachedMeshObjects; // <-- Reuse cached mesh objects

            lineObjects.forEach((obj) => { obj.visible = false; }); // <-- Hide linework for normal prepass

            const savedOverrideMaterial = scene.overrideMaterial;
            const savedClearColor       = renderer.getClearColor(new THREE.Color());
            const savedClearAlpha       = renderer.getClearAlpha();

            // PASS 1 | Normal buffer (meshes only, MeshNormalMaterial override)
            renderer.setClearColor(0.5, 0.5, 1.0, 1.0);    // <-- View-space forward normal; background is uniform
            scene.overrideMaterial = normalMaterial;
            renderer.setRenderTarget(normalRenderTarget);
            renderer.clear();
            renderer.render(scene, camera);
            scene.overrideMaterial = savedOverrideMaterial;

            // PASS 2 | Profile colour at half-res (meshes fallback + linework vertex colours)
            lineObjects.forEach((obj) => { obj.visible = true; }); // <-- Restore linework for colour pass

            for (let i = 0, len = meshObjects.length; i < len; i++) {
                cachedOriginalMaterials[i] = meshObjects[i].material;        // <-- Stash into pre-allocated slot (no per-frame object creation)
                meshObjects[i].material = profileColorFallbackMaterial;      // <-- Swap mesh to flat fallback colour
            }

            renderer.setClearColor(fallbackProfileColor, 1.0); // <-- Background pixels receive fallback colour
            renderer.setRenderTarget(profileColorRenderTarget);
            renderer.clear();
            renderer.render(scene, camera);                    // <-- Meshes (dark fallback) + lines (vertex colours) in one depth context
            renderer.setRenderTarget(null);

            for (let i = 0, len = meshObjects.length; i < len; i++) {
                meshObjects[i].material = cachedOriginalMaterials[i];        // <-- Restore original mesh materials
            }

            renderer.setClearColor(savedClearColor, savedClearAlpha);
        }
        // ---------------------------------------------------------------


        return {
            pass: profileLinesPass,
            normalRenderTarget,
            profileColorRenderTarget,
            depthTexture: normalRenderTarget.depthTexture,               // <-- Reusable depth from the normal pass (avoids a separate depth pre-pass)
            setSize,
            renderProfileNormals,
            invalidateSceneCache
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Profile Lines API
    // ------------------------------------------------------------
    export {
        Na__RenderEffect__ProfileLines__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
