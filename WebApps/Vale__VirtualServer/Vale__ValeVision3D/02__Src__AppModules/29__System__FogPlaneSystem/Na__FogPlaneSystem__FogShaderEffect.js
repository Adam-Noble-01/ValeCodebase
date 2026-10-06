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
            'uPlaneBNormal'            : { value: new THREE.Vector3(0.0, 0.0, 1.0) }
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

            void main() {
                vec4 texel = texture2D(tDiffuse, vUv);

                if (uFogEnabled < 0.5) {
                    gl_FragColor = texel;
                    return;
                }

                float storedDepth = texture2D(tDepth, vUv).x;

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

                vec3 finalColor = mix(texel.rgb, uFogColor, fogFactor);
                gl_FragColor = vec4(finalColor, texel.a);
            }
        `
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fog Pass Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create Planar Fog Post-Processing Pass
    // ------------------------------------------------------------
    function Na__FogPlane__CreateFogPass(effectConfig) {
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

        return fogPass;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Uniform Updates
// -----------------------------------------------------------------------------

    // FUNCTION | Update Fog Pass Camera Uniforms Each Frame
    // ------------------------------------------------------------
    function Na__FogPlane__UpdateFogPassPerFrame(fogPass, camera) {
        if (!fogPass || !camera) return;

        fogPass.uniforms['uCameraFar'].value = camera.far;
        fogPass.uniforms['uInverseProjectionMatrix'].value.copy(camera.projectionMatrixInverse);
        fogPass.uniforms['uCameraWorldMatrix'].value.copy(camera.matrixWorld);
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
