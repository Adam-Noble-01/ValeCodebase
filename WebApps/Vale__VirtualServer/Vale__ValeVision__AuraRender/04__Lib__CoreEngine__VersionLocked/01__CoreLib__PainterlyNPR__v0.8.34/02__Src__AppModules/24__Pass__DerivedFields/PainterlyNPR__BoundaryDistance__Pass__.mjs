/* =============================================================================
   PAINTERLYNPR - PASS | DERIVED FIELDS - BOUNDARY DISTANCE
   =============================================================================

   FILE       : PainterlyNPR__BoundaryDistance__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Pass - DerivedFields - BoundaryDistance
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Jump flooding: how far every pixel is from a wash edge, for both
                wash layers at once - pooling, tide marks and wet edges read it
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Past JFA_REACH_MM a wash edge has no effect, so the flood stops looking.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Boundary Distance
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__Engine__JFA_REACH_MM as JFA_REACH_MM } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__PaintPxPerMm,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Derived Fields - Boundary Distance
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shaders - jump flooding, distance to a wash edge
    // ------------------------------------------------------------
    // Seeds are stored as OFFSETS from the pixel, not positions: offsets stay
    // small, so half floats hold them exactly at any sheet size. Both wash layers
    // flood in one run: xy the base wash, zw the shadow glaze.
    const FS_JFA_INIT = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uRegion;
        out vec4 oSeed;
        const float NONE = 30000.0;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            ivec2 size = textureSize(uRegion, 0);
            vec4 c = texelFetch(uRegion, p, 0);
            bool edgeBase = false; bool edgeShadow = false;
            for (int k = 0; k < 4; k++) {
                ivec2 o = k == 0 ? ivec2(1, 0) : (k == 1 ? ivec2(-1, 0) : (k == 2 ? ivec2(0, 1) : ivec2(0, -1)));
                ivec2 q = p + o;
                if (q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y) continue;
                vec4 n = texelFetch(uRegion, q, 0);
                if (abs(n.x - c.x) > 0.5) edgeBase = true;
                if (abs(n.z - c.z) > 0.5) edgeShadow = true;
            }
            oSeed = vec4(edgeBase ? vec2(0.0) : vec2(NONE), edgeShadow ? vec2(0.0) : vec2(NONE));
        }`;

    const FS_JFA_STEP = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uSeeds;
        uniform int uStep;
        out vec4 oSeed;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            ivec2 size = textureSize(uSeeds, 0);
            vec4 best = texelFetch(uSeeds, p, 0);
            float dB = dot(best.xy, best.xy);
            float dS = dot(best.zw, best.zw);
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    if (x == 0 && y == 0) continue;
                    ivec2 o = ivec2(x, y) * uStep;
                    ivec2 q = p + o;
                    if (q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y) continue;
                    vec4 s = texelFetch(uSeeds, q, 0);
                    vec2 cb = s.xy + vec2(o);
                    float db = dot(cb, cb);
                    if (db < dB) { dB = db; best.xy = cb; }
                    vec2 cs = s.zw + vec2(o);
                    float ds = dot(cs, cs);
                    if (ds < dS) { dS = ds; best.zw = cs; }
                }
            }
            oSeed = best;
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boundary Distance
// -----------------------------------------------------------------------------

    // MODULE STATE | Which Jump-Flood Target Holds the Answer
    // ------------------------------------------------------------
    let DistanceTarget  =  null;
    // ------------------------------------------------------------


    // FUNCTION | Pass - Jump Flooding, Both Wash Layers at Once
    // ------------------------------------------------------------
    // log2 steps from the reach a wash edge can matter at, then a final step of 1
    // again: the "JFA+1" that cleans up the few pixels plain flooding misses.
    function PainterlyNPR__BoundaryDistance__Run() {
        const T  =  Gpu.Targets;
        PainterlyNPR__GpuResources__Fullscreen(T.SeedsA, Gpu.Programs.JfaInit, { uRegion: { t: T.Regions.Textures[0] } });
        let from = T.SeedsA, to = T.SeedsB;
        let step  =  1;
        while (step < JFA_REACH_MM * Math.max(Gpu.PxPerMm, PainterlyNPR__GpuResources__PaintPxPerMm())) step *= 2;   // <-- The washes read it in the paint's millimetres (v0.8.15): never reach less than they need
        const steps  =  [];
        for (let s = step; s >= 1; s = s >> 1) steps.push(s);
        steps.push(1);
        for (const s of steps) {
            PainterlyNPR__GpuResources__Fullscreen(to, Gpu.Programs.JfaStep, { uSeeds: { t: from.Textures[0] }, uStep: { i: s } });
            [from, to]  =  [to, from];
        }
        DistanceTarget  =  from;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__BoundaryDistance__Run,
        DistanceTarget  as  PainterlyNPR__BoundaryDistance__DistanceTarget,
        FS_JFA_INIT     as  PainterlyNPR__BoundaryDistance__FS_JFA_INIT,
        FS_JFA_STEP     as  PainterlyNPR__BoundaryDistance__FS_JFA_STEP,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
