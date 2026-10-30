/* =============================================================================
   PAINTERLYNPR - HUD | PASS VIEWER - SHADER
   =============================================================================

   FILE       : PainterlyNPR__PassViewer__Shader__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - PassViewer - Shader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The pass viewer's fragment shader: one branch per view
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - At WebGL 2's sixteen-sampler limit: a new view shares uAux.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - views 22 (Base lines, the base buffer bound to
                   uAux) and 23 (Pen tiers, the ink's B channel): no new sampler

   ============================================================================= */

import { PainterlyNPR__MaterialClasses__MATERIAL_SLOTS as MATERIAL_SLOTS } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';

// =============================================================================
// REGION | Pass Viewer - Shader
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the pass viewer
    // ------------------------------------------------------------
    // One shader shows any buffer, sampled by UV so it serves the full sheet and
    // the thumbnails alike.
    const FS_VIEW = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        ${GLSL_COMMON}
        uniform int uView;
        uniform vec2 uViewport;
        uniform float uPxPerMm;
        uniform sampler2D uAlbedo; uniform sampler2D uNormal; uniform sampler2D uData; uniform sampler2D uField; uniform sampler2D uRegion;
        uniform sampler2D uSeeds; uniform sampler2D uPaper; uniform sampler2D uWash; uniform sampler2D uInk; uniform sampler2D uComposite;
        uniform sampler2D uFieldViz; uniform sampler2D uAccent; uniform sampler2D uFieldB; uniform sampler2D uFieldC;
        uniform sampler2D uAux;                                               // <-- One sampler for three views, to stay inside 16: the second accent layer (14), the shadow lines (17), the base lines (22)
        uniform sampler2D uClouds;
        uniform mat3 uViewRot;                                                // <-- The camera's turn, so view 21 can undo it: no sampler, the viewer stays at 16
        uniform vec3 uPaperSrgb; uniform vec3 uInkSrgb;
        uniform vec3 uMaterialColours[${MATERIAL_SLOTS}];
        out vec4 oColour;
        vec3 idColour(float id) {
            if (id < -0.5) return uPaperSrgb;
            return 0.35 + 0.55 * vec3(hash12(vec2(id * 7.31 + 1.7, 3.1)), hash12(vec2(id * 3.17 + 0.3, 8.9)), hash12(vec2(id * 5.11 + 4.2, 1.3)));
        }
        void main() {
            vec2 uv = gl_FragCoord.xy / uViewport;
            vec3 c = uPaperSrgb;
            if (uView == 0) c = texture(uComposite, uv).rgb;
            else if (uView == 1) { vec4 a = texture(uAlbedo, uv); c = a.a > 0.5 ? a.rgb : uPaperSrgb; }
            else if (uView == 2) { vec4 d = texture(uData, uv); c = d.y > -0.5 ? texture(uNormal, uv).rgb : uPaperSrgb; }
            else if (uView == 3) { vec4 d = texture(uData, uv); c = d.y > -0.5 ? vec3(1.0 - clamp(log(max(d.x, 0.5)) / log(260.0), 0.0, 1.0)) * vec3(0.96, 0.93, 0.88) : uPaperSrgb; }
            else if (uView == 4) c = idColour(texture(uData, uv).y);
            else if (uView == 5) { vec4 d = texture(uData, uv); c = d.y > -0.5 ? uMaterialColours[int(d.z + 0.5)] : uPaperSrgb; }
            else if (uView == 6) { vec4 d = texture(uData, uv); c = d.y > -0.5 ? mix(vec3(0.30, 0.33, 0.47), vec3(0.98, 0.94, 0.84), d.w) : uPaperSrgb; }
            else if (uView == 7) {
                vec4 f = texture(uField, uv); vec4 r = texture(uFieldViz, uv);
                c = mix(vec3(0.84, 0.55, 0.42), uPaperSrgb, f.r);
                c = mix(c, vec3(0.33, 0.47, 0.62), r.x * 0.55);
                c = mix(c, vec3(0.72, 0.56, 0.22), r.z * 0.55);
                c = mix(c, f.a >= 0.5 ? vec3(0.60, 0.26, 0.20) : vec3(0.45, 0.45, 0.48), r.w * 0.6);
            }
            else if (uView == 8) { vec4 r = texture(uRegion, uv); c = r.x < -0.5 ? uPaperSrgb : idColour(r.x); if (r.z > 0.5) c *= 0.62 + 0.38 * step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0)); }
            else if (uView == 9) { vec4 s = texture(uSeeds, uv); float dmm = min(length(s.xy), length(s.zw)) / uPxPerMm; c = mix(vec3(0.20, 0.24, 0.36), vec3(0.96, 0.94, 0.89), smoothstep(0.0, 9.0, dmm)); if (dmm < 10.0) c *= 0.86 + 0.14 * step(0.5, fract(dmm)); else c = uPaperSrgb; }
            else if (uView == 10) { vec4 p = texture(uPaper, uv); c = vec3(0.50 + 0.42 * p.r + 0.06 * p.b) * vec3(1.0, 0.98, 0.95); }
            else if (uView == 11 || uView == 19) c = toSrgb(texture(uWash, uv).rgb);   // 19: the same, after the Kuwahara - the viewer binds the filtered wash
            else if (uView == 12) c = mix(uPaperSrgb, uInkSrgb, clamp(texture(uInk, uv).a, 0.0, 1.0));
            else if (uView == 13) { vec4 a = texture(uAlbedo, uv); c = a.a > 0.5 ? mix(uPaperSrgb, a.rgb, 0.22) : uPaperSrgb; }
            else if (uView == 14 || uView == 15) {
                vec4 a = texture(uAlbedo, uv); vec4 k = texture(uAccent, uv);
                c = a.a > 0.5 ? mix(uPaperSrgb, a.rgb, uView == 14 ? 0.12 : 0.2) : uPaperSrgb;
                c = mix(c, vec3(0.58, 0.28, 0.22), k.r);
                if (uView == 14) {
                    vec4 k2 = texture(uAux, uv);
                    c = mix(c, vec3(0.86, 0.47, 0.56), k.g); c = mix(c, vec3(0.56, 0.46, 0.78), k.b); c = mix(c, vec3(0.92, 0.80, 0.40), k.a);
                    c = mix(c, vec3(0.93, 0.58, 0.24), k2.r); c = mix(c, vec3(0.80, 0.81, 0.86), k2.g); c = mix(c, vec3(0.45, 0.55, 0.85), k2.b);
                }
            }
            else if (uView == 16) {
                vec4 fa = texture(uField, uv); vec4 fb = texture(uFieldB, uv); vec4 fc = texture(uFieldC, uv);
                float weight = fa.g * 2.0; float detail = fc.a * 2.0 - 1.0;
                c = mix(uPaperSrgb, uInkSrgb, clamp((weight - 1.0) * 0.45, 0.0, 0.6));
                c = mix(c, vec3(1.0), clamp((1.0 - weight) * 0.8, 0.0, 0.6));
                c = mix(c, vec3(0.50, 0.38, 0.70), fc.r * 0.6);
                c = mix(c, vec3(0.80, 0.42, 0.30), fb.g * 0.6);
                c = mix(c, vec3(0.33, 0.47, 0.62), max(detail, 0.0) * 0.35);
                c = mix(c, vec3(0.86, 0.18, 0.62), max(-detail, 0.0) * 0.35);
            }
            else if (uView == 17) {
                vec4 a = texture(uAlbedo, uv); float k = texture(uAux, uv).r * 2.0;
                c = a.a > 0.5 ? mix(uPaperSrgb, a.rgb, 0.2) : uPaperSrgb;
                c = mix(c, vec3(0.30, 0.36, 0.50), clamp(k, 0.0, 1.0));
            }
            else if (uView == 18 || uView == 20) {                            // the buffer, or the masses the wash paints - bound to uClouds per view
                vec4 b = texture(uClouds, uv); float cov = clamp(1.0 - b.x, 0.0, 1.0); float lit = b.y / max(cov, 1e-3);
                c = mix(vec3(0.62, 0.74, 0.88), mix(vec3(0.42, 0.44, 0.54), vec3(0.99, 0.98, 0.96), clamp(lit, 0.0, 1.0)), cov);
            }
            else if (uView == 21) {                                           // the view normal turned back into the world: +x, up, +z (out of the front)
                vec4 d = texture(uData, uv);
                vec3 n = transpose(uViewRot) * normalize(texture(uNormal, uv).rgb * 2.0 - 1.0);
                c = d.y > -0.5 ? normalize(n) * 0.5 + 0.5 : uPaperSrgb;
            }
            else if (uView == 22) c = mix(uPaperSrgb, uInkSrgb, clamp(texture(uAux, uv).a, 0.0, 1.0));   // the base buffer: every eligible stroke at 0.13 mm
            else if (uView == 23) {                                           // the ink by pen: the tier rides in B as tier / 3
                vec4 k = texture(uInk, uv); float a = clamp(k.a, 0.0, 1.0);
                float t = a > 0.004 ? clamp(k.b / k.a, 0.0, 1.0) * 3.0 : 0.0;
                vec3 pen = t < 0.5 ? vec3(0.27, 0.45, 0.66) : (t < 1.5 ? vec3(0.30, 0.58, 0.30) : (t < 2.5 ? vec3(0.84, 0.56, 0.14) : vec3(0.74, 0.14, 0.12)));
                c = mix(uPaperSrgb, pen, a);
            }
            oColour = vec4(c, 1.0);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        FS_VIEW  as  PainterlyNPR__PassViewer__FS_VIEW,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
