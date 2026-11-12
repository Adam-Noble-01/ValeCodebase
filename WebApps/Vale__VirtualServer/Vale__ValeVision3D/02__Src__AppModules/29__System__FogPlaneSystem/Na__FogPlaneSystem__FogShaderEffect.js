// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - FOG SHADER EFFECT
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__FogShaderEffect.js
// NAMESPACE  : Na__FogPlane
// MODULE     : FogShaderEffect
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Post-processing planar fog ShaderPass with two independent planes
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Custom full-screen ShaderPass that reconstructs world position from the
//   logarithmic depth buffer and applies fog based on signed distance from
//   up to two configurable world-space planes.
// - Each plane has an independent active flag, position, and normal.
// - A shared fall-off distance controls the transition from clear to full fog.
// - Replaces the old orbit-anchored radial fog system.
// - PLANTS AND PEOPLE ARE FOGGED BY THEIR OWN DISTANCE (v2.98.1). The depth read
//   here is the profile normal pass's, which plants' lines and see-through fills
//   are left out of, so a hedge in front of a plane was fogged by the sky behind
//   it. The pass's render first has Na__FogPlaneSystem__OwnLayers__.js draw the
//   marked layers alone, then the shader lays them over the fogged model. With
//   nothing drawn, uLayerOn stays 0 and the old route is taken unchanged.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Nov-2026 - Version 1.2.0 (ValeVision3D v2.98.1)
// - Plants and people in front of a fog plane: the pass draws them alone and the
//   shader fogs them by their own depth, the model behind them by its own. The
//   camera handed in each frame is kept for that draw; switching the fog off
//   gives back its memory. CreateFogPass takes the scene.
//
// 22-Oct-2026 - Version 1.1.0 (thumbnails whited out by fog, v2.76.4)
// - UpdateFogPassPerFrame brings the camera's world matrix up to date before
//   copying it. three.js only refreshes it inside a render, so a camera moved
//   since its last frame handed the fog its OLD pose: the live loop ran one
//   frame behind, and a capture straight after a jump (Update All Thumbnails)
//   rebuilt every world position along the previous scene's rays. Falla
//   Scheme-02's Patio View, looking straight at plane A, came out white.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Post Processing
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Layers Fogged by Their Own Distance (plants, people)
    // @delegate: ./Na__FogPlaneSystem__OwnLayers__.js
    // ------------------------------------------------------------
    import {
        Na__FogLayers__Draw,
        Na__FogLayers__Release
    } from './Na__FogPlaneSystem__OwnLayers__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Planar Fog Shader Definition
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Planar Fog Shader
    // ------------------------------------------------------------
    const Na__FogPlane__Shader = {

        uniforms: {
            'tDiffuse'                 : { value: null },
            'tDepth'                   : { value: null },
            'uCameraFar'               : { value: 1000.0 },
            'uInverseProjectionMatrix' : { value: new THREE.Matrix4() },
            'uCameraWorldMatrix'       : { value: new THREE.Matrix4() },
            'uFogColor'                : { value: new THREE.Vector3(1.0, 1.0, 1.0) },
            'uFogEnabled'              : { value: 0.0 },
            'uFalloffDistance'         : { value: 1.0 },
            'uPlaneAActive'            : { value: 0.0 },
            'uPlaneAPosition'          : { value: new THREE.Vector3() },
            'uPlaneANormal'            : { value: new THREE.Vector3(1.0, 0.0, 0.0) },
            'uPlaneBActive'            : { value: 0.0 },
            'uPlaneBPosition'          : { value: new THREE.Vector3() },
            'uPlaneBNormal'            : { value: new THREE.Vector3(0.0, 0.0, 1.0) },
            'tLayerColour'             : { value: null },                     // <-- Plants and people alone, premultiplied by their own blending
            'tLayerDepth'              : { value: null },                     // <-- Their own depth
            'uLayerOn'                 : { value: 0.0 },                      // <-- 1 only for a picture whose layers were drawn
            'uLayerTexel'              : { value: new THREE.Vector2(1.0, 1.0) }
        },

        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,

        fragmentShader: /* glsl */`
            uniform sampler2D tDiffuse;
            uniform sampler2D tDepth;
            uniform sampler2D tLayerColour;
            uniform sampler2D tLayerDepth;
            uniform float     uLayerOn;
            uniform vec2      uLayerTexel;
            uniform float     uCameraFar;
            uniform mat4      uInverseProjectionMatrix;
            uniform mat4      uCameraWorldMatrix;
            uniform vec3      uFogColor;
            uniform float     uFogEnabled;
            uniform float     uFalloffDistance;
            uniform float     uPlaneAActive;
            uniform vec3      uPlaneAPosition;
            uniform vec3      uPlaneANormal;
            uniform float     uPlaneBActive;
            uniform vec3      uPlaneBPosition;
            uniform vec3      uPlaneBNormal;

            varying vec2 vUv;

            // How much fog a surface at this stored depth takes, on this pixel's ray:
            // the model at its depth, and a plant or figure at its own
            float fogAmountAt(float storedDepth) {

                // Background pixels (depth 1.0) have no geometry but may have
                // linework or profile-line edges composited by earlier passes.
                // Project them to cameraFar so the fog calculation still runs;
                // if the view ray crosses a fog plane the pixel gets fully fogged.
                float clipW = (storedDepth >= 1.0)
                    ? uCameraFar
                    : pow(uCameraFar + 1.0, storedDepth) - 1.0;

                vec2 ndc = vUv * 2.0 - 1.0;
                vec4 clipPos = vec4(ndc, 0.0, 1.0);
                vec4 viewRay = uInverseProjectionMatrix * clipPos;
                vec3 viewDir = normalize(viewRay.xyz / viewRay.w);
                vec3 viewPosition = viewDir * (clipW / max(-viewDir.z, 0.0001));

                vec4 worldPos = uCameraWorldMatrix * vec4(viewPosition, 1.0);

                float fogFactor = 0.0;

                // Plane A: signed distance along normal (negative = fog side)
                if (uPlaneAActive > 0.5) {
                    float distA = dot(worldPos.xyz - uPlaneAPosition, uPlaneANormal);
                    if (distA < 0.0) {
                        fogFactor = max(fogFactor, smoothstep(0.0, uFalloffDistance, abs(distA)));
                    }
                }

                // Plane B: signed distance along normal (negative = fog side)
                if (uPlaneBActive > 0.5) {
                    float distB = dot(worldPos.xyz - uPlaneBPosition, uPlaneBNormal);
                    if (distB < 0.0) {
                        fogFactor = max(fogFactor, smoothstep(0.0, uFalloffDistance, abs(distB)));
                    }
                }

                return fogFactor;
            }

            void main() {
                vec4 texel = texture2D(tDiffuse, vUv);

                if (uFogEnabled < 0.5) {
                    gl_FragColor = texel;
                    return;
                }

                float storedDepth = texture2D(tDepth, vUv).x;
                float fogFactor   = fogAmountAt(storedDepth);
                vec3  finalColor  = mix(texel.rgb, uFogColor, fogFactor);

                // PLANTS AND PEOPLE BY THEIR OWN DISTANCE. The layer drawn alone is
                // Pm, already multiplied by its share A, and the picture so far is
                // C = Pm + (1 - A) B. So the layer takes the fog at its own depth
                // and what is behind it the fog at the model's. Where the two depths
                // agree this is the line above exactly. The resolve keeps one depth
                // sample, so an edge pixel takes the nearest depth round it.
                if (uLayerOn > 0.5) {
                    vec4 layer = texture2D(tLayerColour, vUv);
                    if (layer.a > 0.002) {
                        float layerDepth = texture2D(tLayerDepth, vUv).x;
                        layerDepth = min(layerDepth, texture2D(tLayerDepth, vUv + vec2(uLayerTexel.x, 0.0)).x);
                        layerDepth = min(layerDepth, texture2D(tLayerDepth, vUv - vec2(uLayerTexel.x, 0.0)).x);
                        layerDepth = min(layerDepth, texture2D(tLayerDepth, vUv + vec2(0.0, uLayerTexel.y)).x);
                        layerDepth = min(layerDepth, texture2D(tLayerDepth, vUv - vec2(0.0, uLayerTexel.y)).x);
                        if (layerDepth < 1.0 && layerDepth <= storedDepth + 0.0001) {   // In front of the model here, or at its own depth
                            float layerFog = fogAmountAt(layerDepth);
                            finalColor = layer.rgb * (1.0 - layerFog) + layer.a * layerFog * uFogColor
                                       + (1.0 - fogFactor) * (texel.rgb - layer.rgb)
                                       + (1.0 - layer.a) * fogFactor * uFogColor;
                        }
                    }
                }

                gl_FragColor = vec4(finalColor, texel.a);
            }
        `
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fog Pass Factory
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Each Pass's Scene and the Camera Its Picture Is Drawn With
    // ------------------------------------------------------------
    const Na__FogPlane__PassContext = new WeakMap();                         // <-- fogPass -> { scene, camera }
    // ------------------------------------------------------------


    // FUNCTION | Create Planar Fog Post-Processing Pass
    // ------------------------------------------------------------
    // scene is where the layers fogged by their own distance are found. The pass
    // draws them alone first, inside its own render, so every chain that runs
    // the composer has them with no change of its own.
    // ------------------------------------------------------------
    function Na__FogPlane__CreateFogPass(effectConfig, scene) {
        const fogPass = new ShaderPass(Na__FogPlane__Shader);

        const fogColorHex = (effectConfig && Number.isFinite(effectConfig.FogPlane__Effect__Config__Color))
            ? effectConfig.FogPlane__Effect__Config__Color
            : 16777215;
        const fogEnabled  = Boolean(effectConfig && effectConfig.FogPlane__Effect__Config__EnabledByDefault === true);
        const falloffMm   = (effectConfig && Number.isFinite(effectConfig.FogPlane__Falloff__Config__DefaultMm))
            ? effectConfig.FogPlane__Falloff__Config__DefaultMm
            : 1000;

        const fogColor = new THREE.Color(fogColorHex);
        fogPass.uniforms['uFogColor'].value.set(fogColor.r, fogColor.g, fogColor.b);
        fogPass.uniforms['uFogEnabled'].value    = fogEnabled ? 1.0 : 0.0;
        fogPass.uniforms['uFalloffDistance'].value = Na__Math__ConvertMmToUnits(falloffMm);

        // THE LAYERS FIRST | Plants and people alone, through the camera this picture
        // was handed (UpdateFogPassPerFrame), then the shader as before
        const context = { scene : scene || null, camera : null };
        Na__FogPlane__PassContext.set(fogPass, context);
        const shaderRender = fogPass.render;                                 // <-- ShaderPass's own
        fogPass.render = function (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
            Na__FogLayers__Draw(renderer, context.scene, context.camera, readBuffer, fogPass.uniforms);
            shaderRender.call(fogPass, renderer, writeBuffer, readBuffer, deltaTime, maskActive);
        };

        return fogPass;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Uniform Updates
// -----------------------------------------------------------------------------

    // FUNCTION | Update Fog Pass Camera Uniforms Each Frame
    // ------------------------------------------------------------
    // The world matrix is refreshed HERE, not trusted: three.js updates it only
    // inside a render, and every caller runs before its render, often straight
    // after the camera was placed. A stale matrix fogs the wrong half of the view.
    // ------------------------------------------------------------
    function Na__FogPlane__UpdateFogPassPerFrame(fogPass, camera) {
        if (!fogPass || !camera) return;

        camera.updateMatrixWorld();                                          // <-- The pose the camera has NOW, not at its last render
        fogPass.uniforms['uCameraFar'].value = camera.far;
        fogPass.uniforms['uInverseProjectionMatrix'].value.copy(camera.projectionMatrixInverse);
        fogPass.uniforms['uCameraWorldMatrix'].value.copy(camera.matrixWorld);

        const context = Na__FogPlane__PassContext.get(fogPass);
        if (context) context.camera = camera;                                // <-- The plants and people are drawn through the camera the fog was given
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Uniform Setters
// -----------------------------------------------------------------------------

    // FUNCTION | Set Plane Uniforms by Slot (A or B)
    // ------------------------------------------------------------
    function Na__FogPlane__SetPlaneUniforms(fogPass, planeId, positionUnits, normalVec, active) {
        if (!fogPass) return;

        const prefix = (planeId === 'B') ? 'uPlaneB' : 'uPlaneA';

        fogPass.uniforms[prefix + 'Active'].value = active ? 1.0 : 0.0;

        if (positionUnits && positionUnits.isVector3) {
            fogPass.uniforms[prefix + 'Position'].value.copy(positionUnits);
        }
        if (normalVec && normalVec.isVector3) {
            fogPass.uniforms[prefix + 'Normal'].value.copy(normalVec);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Fog Fall-Off Distance
    // ------------------------------------------------------------
    function Na__FogPlane__SetFalloffDistance(fogPass, distanceMm) {
        if (!fogPass || !Number.isFinite(distanceMm)) return;
        fogPass.uniforms['uFalloffDistance'].value = Na__Math__ConvertMmToUnits(distanceMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Fog Enabled State
    // ------------------------------------------------------------
    function Na__FogPlane__SetEnabled(fogPass, enabled) {
        if (!fogPass) return;
        fogPass.uniforms['uFogEnabled'].value = enabled ? 1.0 : 0.0;
        if (!enabled) Na__FogLayers__Release(fogPass.uniforms);              // <-- No fog, so no layer target held, nor bound
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Fog Plane Shader Effect API
    // ------------------------------------------------------------
    export {
        Na__FogPlane__CreateFogPass,
        Na__FogPlane__UpdateFogPassPerFrame,
        Na__FogPlane__SetPlaneUniforms,
        Na__FogPlane__SetFalloffDistance,
        Na__FogPlane__SetEnabled
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
