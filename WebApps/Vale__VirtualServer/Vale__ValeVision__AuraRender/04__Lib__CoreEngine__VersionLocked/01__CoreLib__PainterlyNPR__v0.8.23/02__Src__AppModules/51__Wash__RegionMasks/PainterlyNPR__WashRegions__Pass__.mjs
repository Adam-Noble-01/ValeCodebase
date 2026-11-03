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
        out vec4 oRegion;
        vec4 dataAt(vec2 px) { ivec2 s = textureSize(uData, 0); return texelFetch(uData, clamp(ivec2(px), ivec2(0), s - 1), 0); }
        void main() {
            vec2 px = gl_FragCoord.xy;
            vec2 mm = px / uPxPerMm;
            vec4 own = dataAt(px);
            vec2 broad = vec2(fbm(mm * 0.055 + uSeedA), fbm(mm * 0.055 + uSeedA + vec2(31.7, 11.1))) - 0.5;
            vec2 ragged = vec2(vnoise(mm * 0.6 + uSeedB), vnoise(mm * 0.6 + uSeedB + vec2(7.3, 19.9))) - 0.5;
            vec2 warp = (broad * 4.0 * uBleedMm + ragged * 2.0 * uRaggedMm) * uPxPerMm;
            vec4 dsp = dataAt(px + warp);
            // Painted window joinery is reserved, as a painter cuts round it: never washed
            // over, never bled into - a frame and its bars stay paper at any distance
            bool reserve = abs(own.z - uReserveId) < 0.5 || abs(dsp.z - uReserveId) < 0.5;
            vec4 base = (reserve || dsp.x > own.x * 1.02 + 0.04) ? own : dsp;
            vec2 broadS = vec2(fbm(mm * 0.07 + uSeedB * 1.3), fbm(mm * 0.07 + uSeedB * 1.3 + vec2(5.1, 2.9))) - 0.5;
            vec2 warpS = (broadS * 4.0 * uShadowBleedMm + ragged * 1.4 * uRaggedMm) * uPxPerMm;
            vec4 dsS = dataAt(px + warpS);
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
