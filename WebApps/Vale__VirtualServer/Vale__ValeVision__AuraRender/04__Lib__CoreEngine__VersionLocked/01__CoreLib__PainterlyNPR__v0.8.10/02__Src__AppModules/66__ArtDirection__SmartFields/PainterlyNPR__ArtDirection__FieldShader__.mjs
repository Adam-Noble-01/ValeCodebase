/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | SMART FIELDS - SHADER
   =============================================================================

   FILE       : PainterlyNPR__ArtDirection__FieldShader__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - SmartFields - Shader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The art direction field's fragment shader: irregular falloff,
                object and material targeting through the id buffers, and the
                sheet's vignette
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

import { PainterlyNPR__Engine__MAX_POINTS as MAX_POINTS } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_SLOTS as MATERIAL_SLOTS } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';

// =============================================================================
// REGION | Smart Fields - Shader
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the art direction field
    // ------------------------------------------------------------
    // Presence (how much of the drawing reaches the paper here) starts as an
    // irregular sheet vignette - never a mechanical circle - and each point bends
    // it. A point's falloff is modulated by seeded irregularity and, when it
    // targets an object or a material, by the ID buffers: a point is a field over
    // the scene's identities, not a dab of pixels (manifest section 10).
    // Output 0 is encoded for a byte target and read back by the CPU: presence,
    // weight / 2, (looseness + 1) / 2, (indication + 1) / 2. Output 1 is each
    // point type's reach, for Show influence: focus, fade, line, indication.
    // Outputs 2 and 3 are the line field, read back too: wobble / 3, break-up,
    // emphasis / 3, overdraw / 3; then hatch density, the hatching's owner / 16
    // (0 the Pen tab's shadow hatching, i + 1 a Hatch point), pressure / 3 and
    // (detail + 1) / 2. Ownership is resolved here, per pixel, by whichever
    // hatching is stronger - so two directions of hatching meet along a line,
    // never cross.
    const FS_FIELD = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        ${GLSL_COMMON}
        uniform sampler2D uData;
        uniform float uPxPerMm;
        uniform vec2 uSeed;
        uniform vec4 uVignette;
        uniform vec4 uVignetteB;
        uniform int uPointCount;
        uniform vec4 uPointA[${MAX_POINTS}];
        uniform vec4 uPointB[${MAX_POINTS}];
        uniform vec4 uPointC[${MAX_POINTS}];
        uniform vec4 uPointD[${MAX_POINTS}];
        uniform vec4 uPointE[${MAX_POINTS}];
        uniform float uHatchAmount;
        uniform float uHatchReach;
        uniform float uHatchTake[${MATERIAL_SLOTS}];
        layout(location = 0) out vec4 oField;
        layout(location = 1) out vec4 oInfluence;
        layout(location = 2) out vec4 oLineA;
        layout(location = 3) out vec4 oLineB;
        void main() {
            vec2 px = gl_FragCoord.xy;
            vec2 mm = px / uPxPerMm;
            vec2 q = (mm - uVignette.xy) / uVignette.zw;
            if (q.y < 0.0) q.y *= uVignetteB.w;
            float r = mix(length(q), max(abs(q.x), abs(q.y)), 0.3);
            float n1 = fbm(mm * 0.028 + uSeed) - 0.5;
            float n2 = fbm(mm * 0.11 + uSeed * 1.37 + 5.0) - 0.5;
            float presence = 1.0 - smoothstep(uVignetteB.x, uVignetteB.y, r + (n1 * 1.6 + n2 * 0.5) * uVignetteB.z);
            vec4 g = texelFetch(uData, ivec2(px), 0);
            bool solid = g.y > -0.5;
            float weight = 1.0; float loose = 0.0; float indication = 0.0; float detail = 0.0;
            float wobble = 1.0; float breakup = 0.0; float emphasis = 1.0; float overdraw = 1.0; float pressure = 1.0;
            float take = solid ? uHatchTake[int(g.z + 0.5)] : 0.0;
            float hatch = uHatchAmount * take * (1.0 - smoothstep(uHatchReach * 0.35, max(uHatchReach, 0.01), g.w));
            float owner = 0.0;
            vec4 reach = vec4(0.0);
            for (int i = 0; i < ${MAX_POINTS}; i++) {
                if (i >= uPointCount) break;
                vec4 A = uPointA[i]; vec4 B = uPointB[i]; vec4 C = uPointC[i]; vec4 D = uPointD[i]; vec4 E = uPointE[i];
                // The reach, measured in the point's own unit disc: into its axes (E.w
                // the turn), the short axis stretched by 1 / shape (E.z), divided by
                // the radius - so q is 1 on its ring whatever its size or shape. The
                // edge's irregularity is sampled there too, so a 10 mm point and a
                // 140 mm one fall off alike - the same full core (to 0.3), the same
                // soft, broken edge (out past 1) - and an ellipse's edge stretches
                // with it rather than wobbling at a fixed millimetre scale
                vec2 dv = mm - A.xy;
                vec2 lv = vec2(cos(E.w) * dv.x + sin(E.w) * dv.y, -sin(E.w) * dv.x + cos(E.w) * dv.y);
                vec2 q = vec2(lv.x, lv.y / max(E.z, 0.05)) / max(A.z, 1.0);
                float d = length(q);
                float irr = (fbm(q * 1.6 + vec2(B.w * 0.731, B.w * 0.377)) - 0.5) * 0.9;
                float f = 1.0 - smoothstep(0.30 + irr * 0.5, 1.0 + irr * 0.4, d);
                float aim = 1.0;
                if (B.y > 0.5 && B.y < 1.5) aim = abs(g.y - B.z) < 0.5 ? 1.0 : 0.1;
                else if (B.y > 1.5) aim = abs(g.z - B.z) < 0.5 ? 1.0 : 0.1;
                f = clamp(f * aim * A.w, 0.0, 1.0);
                int type = int(B.x + 0.5);
                if (type == 0) {                                                // <-- Focus: present, a touch heavier, tighter, every class kept
                    presence = max(presence, f); weight *= 1.0 + 0.2 * f; loose -= 0.25 * f;
                    wobble *= 1.0 - 0.5 * f; breakup *= 1.0 - f; detail = max(detail, f); reach.x = max(reach.x, f);
                } else if (type == 1) {                                         // <-- Fade to paper
                    presence *= 1.0 - f; reach.y = max(reach.y, f);
                } else if (type == 2) {                                         // <-- Line control: the manifest's six, and looseness
                    weight *= mix(1.0, C.x, f); loose += C.y * f; breakup = max(breakup, C.w * f);
                    emphasis *= mix(1.0, D.x, f); overdraw *= mix(1.0, D.y, f); pressure *= mix(1.0, D.z, f); wobble *= mix(1.0, E.y, f);
                    reach.z = max(reach.z, f);
                } else if (type == 3) {                                         // <-- Material indication: + express, - suppress
                    indication += C.z * f; reach.w = max(reach.w, f);
                } else if (type == 4) {                                         // <-- Hatch: aimed hatching stops dead at its target's edge
                    float h = solid && aim > 0.5 ? D.w * f * (1.0 - smoothstep(E.x * 0.75, E.x + 0.02, g.w)) : 0.0;
                    if (h > hatch) { hatch = h; owner = float(i + 1); }
                } else if (type == 5) {                                         // <-- Detail suppression: strip the subordinate classes
                    detail = min(detail, -f);
                } else if (type == 6) {                                         // <-- Drawing discipline: toward its own setting (C.y, its offset from the sheet's)
                    loose += C.y * f; reach.z = max(reach.z, f);
                }
            }
            oField = vec4(clamp(presence, 0.0, 1.0), clamp(weight * 0.5, 0.0, 1.0), clamp(loose * 0.5 + 0.5, 0.0, 1.0), clamp(indication * 0.5 + 0.5, 0.0, 1.0));
            oInfluence = reach;
            oLineA = vec4(clamp(wobble / 3.0, 0.0, 1.0), clamp(breakup, 0.0, 1.0), clamp(emphasis / 3.0, 0.0, 1.0), clamp(overdraw / 3.0, 0.0, 1.0));
            oLineB = vec4(clamp(hatch, 0.0, 1.0), owner / 16.0, clamp(pressure / 3.0, 0.0, 1.0), clamp(detail * 0.5 + 0.5, 0.0, 1.0));
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        FS_FIELD  as  PainterlyNPR__ArtDirection__FS_FIELD,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
