/* =============================================================================
   PAINTERLYNPR - PASS | GEOMETRY BUFFERS - SHADERS
   =============================================================================

   FILE       : PainterlyNPR__GeometryBuffers__Shaders__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Pass - GeometryBuffers - Shaders
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The truth buffers' fragment shader and the navigation preview's
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - GLSL uses single underscores only.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__MaterialClasses__MATERIAL_SLOTS as MATERIAL_SLOTS } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | Geometry Buffers - Shaders
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the truth buffers
    // ------------------------------------------------------------
    // Four outputs in one pass: albedo, view normal with shadow visibility, the
    // data the CPU reads (linear depth, object ID, material ID, light) and world
    // position. Normals are turned toward the viewer, so a face's winding never
    // matters.
    const FS_GBUFFER = `#version 300 es
        precision highp float;
        precision highp sampler2DShadow;
        in vec3 vWorld; in vec3 vNormal; in vec3 vViewPos; in vec4 vLightClip; flat in vec2 vIds;
        uniform vec3 uSunDir;
        uniform vec3 uCameraPos;
        uniform vec3 uViewDir;
        uniform int uOrtho;
        uniform mat3 uViewRot;
        uniform sampler2DShadow uShadowMap;
        uniform vec3 uAlbedo[${MATERIAL_SLOTS}];
        layout(location = 0) out vec4 oAlbedo;
        layout(location = 1) out vec4 oNormal;
        layout(location = 2) out vec4 oData;
        layout(location = 3) out vec4 oWorld;
        float visibility(float ndl) {
            vec3 p = vLightClip.xyz / vLightClip.w * 0.5 + 0.5;
            if (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;
            float bias = 0.0006 + 0.0025 * (1.0 - ndl);
            vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
            float sum = 0.0;
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) sum += texture(uShadowMap, vec3(p.xy + vec2(float(x), float(y)) * texel * 1.3, p.z - bias));
            }
            return sum / 9.0;
        }
        void main() {
            vec3 n = normalize(vNormal);
            vec3 toEye = uOrtho == 1 ? -uViewDir : normalize(uCameraPos - vWorld);
            if (dot(n, toEye) < 0.0) n = -n;
            float lambert = max(dot(n, uSunDir), 0.0);
            float vis = lambert > 0.0 ? visibility(lambert) : 0.0;
            int m = int(vIds.y + 0.5);
            oAlbedo = vec4(uAlbedo[m], 1.0);
            oNormal = vec4(normalize(uViewRot * n) * 0.5 + 0.5, vis);
            oData = vec4(-vViewPos.z, vIds.x, vIds.y, lambert * vis);
            oWorld = vec4(vWorld, lambert);
        }`;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fragment Shader - the navigation preview
    // ------------------------------------------------------------
    // The one place screen-space edge detection draws anything: it is the working
    // preview's coarse line, as the manifest allows, never the drawing's line.
    const FS_PREVIEW = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uAlbedo; uniform sampler2D uNormal; uniform sampler2D uData;
        uniform vec3 uPaper; uniform vec3 uInk;
        out vec4 oColour;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            ivec2 size = textureSize(uData, 0);
            vec4 a = texelFetch(uAlbedo, p, 0);
            vec4 d = texelFetch(uData, p, 0);
            vec3 n = texelFetch(uNormal, p, 0).xyz * 2.0 - 1.0;
            vec3 col = uPaper;
            if (a.a > 0.5) col = mix(uPaper, a.rgb, 0.55) * (0.82 + 0.18 * d.w);
            float e = 0.0;
            for (int k = 0; k < 4; k++) {
                ivec2 o = k == 0 ? ivec2(1, 0) : (k == 1 ? ivec2(-1, 0) : (k == 2 ? ivec2(0, 1) : ivec2(0, -1)));
                ivec2 q = clamp(p + o, ivec2(0), size - 1);
                vec4 dq = texelFetch(uData, q, 0);
                vec3 nq = texelFetch(uNormal, q, 0).xyz * 2.0 - 1.0;
                float dd = abs(dq.x - d.x) / max(min(dq.x, d.x), 0.01);
                e = max(e, smoothstep(0.02, 0.07, dd));
                if (abs(dq.y - d.y) > 0.5) e = max(e, 0.75);
                e = max(e, smoothstep(0.12, 0.35, 1.0 - dot(n, nq)));
            }
            oColour = vec4(mix(col, uInk, e * 0.8), 1.0);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        FS_GBUFFER  as  PainterlyNPR__GeometryBuffers__FS_GBUFFER,
        FS_PREVIEW  as  PainterlyNPR__GeometryBuffers__FS_PREVIEW,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
