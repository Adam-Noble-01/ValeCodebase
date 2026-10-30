/* =============================================================================
   PAINTERLYNPR - SYSTEM | GPU RESOURCES - SHARED SHADERS
   =============================================================================

   FILE       : PainterlyNPR__GpuResources__SharedShaders__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - GpuResources - SharedShaders
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The GLSL every pass shares - noise in millimetres, colour - and
                the vertex shaders: the scene, a fullscreen triangle, ribbons and
                debug lines
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - GLSL uses single underscores only: GLSL ES reserves the double underscore.

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

// =============================================================================
// REGION | Gpu Resources - Shared Shaders
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Shared GLSL - noise in millimetres, colour
    // ------------------------------------------------------------
    // Every noise here is evaluated in SHEET MILLIMETRES, so a wash's mottling, a
    // drying edge's raggedness and the paper's grain are the same at any export
    // resolution (manifest section 08: never a pixel-fixed overlay).
    //
    // Value noise is interpolated with the QUINTIC fade, and every octave is turned
    // off the axes. With the cubic fade the cell boundaries show as straight creases,
    // and a wash stretched along its brush direction turned them into long seams.
    const GLSL_COMMON = `
        float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
        float vnoise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
            float s = 0.0; float a = 0.5; mat2 r = mat2(0.80, -0.60, 0.60, 0.80);
            p = mat2(0.94, 0.34, -0.34, 0.94) * p;
            for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = r * p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
            return s / 0.96875;
        }
        float fbm3(vec2 p) {
            float s = 0.0; float a = 0.5; mat2 r = mat2(0.80, -0.60, 0.60, 0.80);
            p = mat2(0.94, 0.34, -0.34, 0.94) * p;
            for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = r * p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
            return s / 0.875;
        }
        float worley(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); float d = 8.0;
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 g = vec2(float(x), float(y));
                    vec2 r = g + hash22(i + g) - f;
                    d = min(d, dot(r, r));
                }
            }
            return sqrt(d);
        }
        vec3 toSrgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    `;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Vertex Shaders
    // ------------------------------------------------------------
    const VS_SCENE = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        layout(location = 2) in vec2 aIds;
        uniform mat4 uViewProj;
        uniform mat4 uView;
        uniform mat4 uLightViewProj;
        out vec3 vWorld;
        out vec3 vNormal;
        out vec3 vViewPos;
        out vec4 vLightClip;
        flat out vec2 vIds;
        void main() {
            vWorld = aPosition;
            vNormal = aNormal;
            vViewPos = (uView * vec4(aPosition, 1.0)).xyz;
            vLightClip = uLightViewProj * vec4(aPosition, 1.0);
            vIds = aIds;
            gl_Position = uViewProj * vec4(aPosition, 1.0);
        }`;

    const VS_FULLSCREEN = `#version 300 es
        void main() {
            vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        }`;

    const VS_RIBBON = `#version 300 es
        layout(location = 0) in vec2 aPos;
        layout(location = 1) in vec4 aInk;
        layout(location = 2) in float aExpand;
        uniform vec2 uSize;
        out float vAlpha; out float vDry; out float vSide; out float vHalf; out float vExpand;
        void main() {
            gl_Position = vec4(aPos / uSize * 2.0 - 1.0, 0.0, 1.0);
            vAlpha = aInk.x; vDry = aInk.y; vSide = aInk.z; vHalf = aInk.w; vExpand = aExpand;
        }`;

    const VS_LINES = `#version 300 es
        layout(location = 0) in vec2 aPos;
        layout(location = 1) in vec4 aColour;
        uniform vec2 uSize;
        out vec4 vColour;
        void main() { gl_Position = vec4(aPos / uSize * 2.0 - 1.0, 0.0, 1.0); vColour = aColour; }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        GLSL_COMMON    as  PainterlyNPR__Shaders__GLSL_COMMON,
        VS_FULLSCREEN  as  PainterlyNPR__Shaders__VS_FULLSCREEN,
        VS_LINES       as  PainterlyNPR__Shaders__VS_LINES,
        VS_RIBBON      as  PainterlyNPR__Shaders__VS_RIBBON,
        VS_SCENE       as  PainterlyNPR__Shaders__VS_SCENE,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
