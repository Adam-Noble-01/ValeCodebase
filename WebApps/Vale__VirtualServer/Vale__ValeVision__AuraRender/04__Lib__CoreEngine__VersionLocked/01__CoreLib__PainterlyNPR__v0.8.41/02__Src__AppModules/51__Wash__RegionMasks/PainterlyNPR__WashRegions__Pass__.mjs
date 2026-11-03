/* =============================================================================
   PAINTERLYNPR - WASH | REGION MASKS
   =============================================================================

   FILE       : PainterlyNPR__WashRegions__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - RegionMasks
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The wash masks loosened: a domain-warped region map with a depth
                guard, so a wash wanders past its edge as a brush does, never
                across a depth step
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Two layers at once: the base wash and the shadow glaze.
   - HELD AT A ROUND FORM'S RIM (v0.8.38): a straight edge has its pen line to
     stray past and it reads as loose. A round thing's wash wandering a millimetre
     off its outline reads as a misprint, so the warp stops at the band 24 finds,
     less a hand's looseness (Wash -> Round forms; at 0, as it was).
   - NO FLECKS (v0.8.39): a warped read cut off from the rest of what it read goes
     back to its own place, with the same control. Left, each was an edge with a
     white ring round it: Adam's dots on a bowl.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Wash Regions
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__SeededRandom__Offset } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__PaintPxPerMm,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
import { PainterlyNPR__ProfileLines__WashUniforms } from '../24__Pass__DerivedFields/PainterlyNPR__ProfileLines__Pass__.mjs';

// =============================================================================
// REGION | Region Masks
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - loosened wash regions
    // ------------------------------------------------------------
    // The artistic wash mask, independent of the exact geometry mask (manifest
    // section 08, Paint Outside the Lines): each pixel takes the region of a point
    // displaced by broad and ragged noise, so pigment strays past a pen line or
    // withdraws within it - except that a FARTHER surface may never paint across a
    // nearer one. The shadow glaze is warped on its own: it was a separate brush.
    const FS_REGIONS = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        ${GLSL_COMMON}
        uniform sampler2D uData;
        uniform float uPxPerMm;
        uniform vec2 uSeedA; uniform vec2 uSeedB;
        uniform float uBleedMm; uniform float uRaggedMm; uniform float uShadowBleedMm; uniform float uShadowThreshold;
        uniform float uReserveId;
        uniform sampler2D uProfile; uniform float uHold; uniform float uLoosePx; uniform int uFleckPx;
        out vec4 oRegion;
        vec4 dataAt(vec2 px) { ivec2 s = textureSize(uData, 0); return texelFetch(uData, clamp(ivec2(px), ivec2(0), s - 1), 0); }
        // The warp walked out from this pixel: a round form's band across its way stops
        // it short. Only a pixel already within a hand's looseness of the band may read
        // across it, so the wash strays that far past the line and no further
        vec2 held(vec2 px, vec2 warp) {
            float len = length(warp);
            if (uHold <= 0.0 || len < 0.5) return warp;
            ivec2 s = textureSize(uProfile, 0);
            int steps = int(min(ceil(len / 1.25), 48.0));
            for (int k = 0; k <= steps; k++) {
                float at = len * float(k) / float(steps);
                if (texelFetch(uProfile, clamp(ivec2(px + warp / len * at), ivec2(0), s - 1), 0).r > 0.5) return warp / len * mix(len, at < uLoosePx ? min(len, uLoosePx) : max(at - 1.0, 0.0), uHold);
            }
            return warp;
        }
        vec2 warpAt(vec2 px) {
            vec2 mm = px / uPxPerMm;
            vec2 broad = vec2(fbm(mm * 0.055 + uSeedA), fbm(mm * 0.055 + uSeedA + vec2(31.7, 11.1))) - 0.5;
            vec2 ragged = vec2(vnoise(mm * 0.6 + uSeedB), vnoise(mm * 0.6 + uSeedB + vec2(7.3, 19.9))) - 0.5;
            return (broad * 4.0 * uBleedMm + ragged * 2.0 * uRaggedMm) * uPxPerMm;
        }
        // A fleck: a few pixels reading something cut off from the rest of it, a leaf's thin tip
        // carried away on its own. No brush leaves that. Kept, it is an edge like any other, and
        // a wash withdraws from every edge it has: a white ring on a bowl or on the ground. Asked
        // exactly: a whole square ring of pixels round it with none reading the same. Anything
        // that goes on past it, however thin, must cross the ring, so a thin straight thing never is
        bool reads(vec2 q, float id) { return abs(dataAt(q + held(q, warpAt(q))).y - id) < 0.5; }
        bool fleck(vec2 px, float id) {
            for (int r = 1; r <= uFleckPx; r++) {
                bool open = false;
                for (int i = -r; i < r && !open; i++) {
                    float a = float(i), b = float(r);
                    open = reads(px + vec2(a, -b), id) || reads(px + vec2(b, a), id) || reads(px + vec2(-a, b), id) || reads(px + vec2(-b, -a), id);
                }
                if (!open) return true;
            }
            return false;
        }
        void main() {
            vec2 px = gl_FragCoord.xy;
            vec2 mm = px / uPxPerMm;
            vec4 own = dataAt(px);
            vec2 broad = vec2(fbm(mm * 0.055 + uSeedA), fbm(mm * 0.055 + uSeedA + vec2(31.7, 11.1))) - 0.5;
            vec2 ragged = vec2(vnoise(mm * 0.6 + uSeedB), vnoise(mm * 0.6 + uSeedB + vec2(7.3, 19.9))) - 0.5;
            vec2 warp = (broad * 4.0 * uBleedMm + ragged * 2.0 * uRaggedMm) * uPxPerMm;
            vec4 dsp = dataAt(px + held(px, warp));
            // Painted window joinery is reserved, as a painter cuts round it: never washed
            // over, never bled into - a frame and its bars stay paper at any distance
            bool reserve = abs(own.z - uReserveId) < 0.5 || abs(dsp.z - uReserveId) < 0.5;
            vec4 base = (reserve || dsp.x > own.x * 1.02 + 0.04) ? own : dsp;
            if (uHold > 0.0 && abs(base.y - own.y) > 0.5 && fleck(px, base.y)) base = own;
            vec2 broadS = vec2(fbm(mm * 0.07 + uSeedB * 1.3), fbm(mm * 0.07 + uSeedB * 1.3 + vec2(5.1, 2.9))) - 0.5;
            vec2 warpS = (broadS * 4.0 * uShadowBleedMm + ragged * 1.4 * uRaggedMm) * uPxPerMm;
            vec4 dsS = dataAt(px + held(px, warpS));
            vec4 sh = dsS.x > own.x * 1.02 + 0.04 ? own : dsS;
            float shadow = (sh.y > -0.5 && sh.w < uShadowThreshold) ? 1.0 : 0.0;
            oRegion = vec4(base.y, base.z, shadow, min(base.x, 60000.0));
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wash Regions
// -----------------------------------------------------------------------------

    // FUNCTION | Pass - Loosen the Wash Masks
    // ------------------------------------------------------------
    function PainterlyNPR__WashRegions__Run() {
        PainterlyNPR__GpuResources__Fullscreen(Gpu.Targets.Regions, Gpu.Programs.Regions, {
            uData            :  { t: Gpu.Targets.GBuffer.Textures[2] },
            uPxPerMm         :  { f: PainterlyNPR__GpuResources__PaintPxPerMm() },   // <-- The paint's millimetres: the bleed shrinks with the picture (v0.8.15)
            uSeedA           :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'wash-broad') },
            uSeedB           :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'wash-ragged') },
            uBleedMm         :  { f: State.Wash.BleedMm },
            uRaggedMm        :  { f: 0.18 + 0.12 * State.Wash.BleedMm },
            uShadowBleedMm   :  { f: State.Wash.BleedMm * 0.6 },
            uShadowThreshold :  { f: 0.16 },
            uReserveId       :  { f: MATERIAL_BY_KEY.WindowPaint.Id },
            uProfile         :  { t: Gpu.Targets.Profile.Textures[0] },
            uHold            :  { f: State.Wash.RoundBound != null ? State.Wash.RoundBound : 1 },   // <-- A drawing set saved before it (v0.8.38) has none, and a wrapper may merge its Wash over the state
            uLoosePx         :  { f: PainterlyNPR__ProfileLines__WashUniforms().LoosePx },
            uFleckPx         :  { i: PainterlyNPR__ProfileLines__WashUniforms().FleckPx },
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__WashRegions__Run,
        FS_REGIONS  as  PainterlyNPR__WashRegions__FS_REGIONS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
