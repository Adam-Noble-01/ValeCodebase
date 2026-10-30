/* =============================================================================
   PAINTERLYNPR - PAPER | MODEL
   =============================================================================

   FILE       : PainterlyNPR__Paper__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - Model
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The paper's relief, in millimetres: grain, tooth and the emboss
                the washes and the ink settle into
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Procedural, seeded, measured on the sheet: an export at twice the pixels is
     the same paper, sharper.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Paper
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__SeededRandom__Offset } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from './PainterlyNPR__Paper__Presets__.mjs';

// =============================================================================
// REGION | Model
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the paper
    // ------------------------------------------------------------
    // Relief in millimetres: cold-pressed bumps (cellular), a fine tooth, and two
    // directions of fibre. B is the relief lit from the upper left - the emboss the
    // compositor lays over everything, pigment and ink included.
    const FS_PAPER = `#version 300 es
        precision highp float;
        ${GLSL_COMMON}
        uniform float uPxPerMm;
        uniform vec2 uSeed;
        uniform vec4 uPaperA;
        uniform vec4 uPaperB;
        out vec4 oPaper;
        float fibres(vec2 mm) {
            vec2 a = mat2(0.94, 0.34, -0.34, 0.94) * mm;
            vec2 b = mat2(0.57, -0.82, 0.82, 0.57) * mm;
            return 0.5 * (vnoise(a * vec2(0.45, 5.0) + uSeed) + vnoise(b * vec2(0.4, 4.2) + uSeed.yx));
        }
        float heightAt(vec2 mm) {
            // Bumps from a domain-warped cellular field, so no two are the same size or
            // shape, over a broad undulation and a fine tooth: cold-pressed, not pebbles
            vec2 warp = vec2(fbm3(mm * 0.35 + uSeed), fbm3(mm * 0.35 + uSeed + 7.7)) - 0.5;
            float cell = smoothstep(0.1, 0.9, 1.0 - worley(mm / uPaperA.x + warp * 1.3 + uSeed));
            float broad = fbm3(mm / (uPaperA.x * 1.8) + uSeed * 0.7);
            float tooth = fbm3(mm / uPaperA.z + uSeed * 1.7);
            float h = (cell * uPaperA.y + broad * 0.35 + tooth * uPaperA.w + fibres(mm) * uPaperB.x) / (uPaperA.y + 0.35 + uPaperA.w + uPaperB.x);
            return clamp(0.5 + (h - 0.5) * uPaperB.y * 1.6, 0.0, 1.0);
        }
        void main() {
            vec2 mm = gl_FragCoord.xy / uPxPerMm;
            float h = heightAt(mm);
            float e = 0.06;
            vec2 grad = vec2(heightAt(mm + vec2(e, 0.0)) - heightAt(mm - vec2(e, 0.0)), heightAt(mm + vec2(0.0, e)) - heightAt(mm - vec2(0.0, e))) / (2.0 * e);
            oPaper = vec4(h, fibres(mm), dot(grad, normalize(vec2(-0.55, 0.85))), 0.0);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paper
// -----------------------------------------------------------------------------

    // FUNCTION | Pass - the Paper's Relief, in Millimetres
    // ------------------------------------------------------------
    function PainterlyNPR__Paper__Run() {
        const p  =  PAPER_PRESETS[State.Paper.Preset];
        PainterlyNPR__GpuResources__Fullscreen(Gpu.Targets.Paper, Gpu.Programs.Paper, {
            uPxPerMm :  { f: Gpu.PxPerMm },
            uSeed    :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'paper') },
            uPaperA  :  { v4: [p.CellMm, p.CellWeight, p.ToothMm, p.ToothWeight] },
            uPaperB  :  { v4: [p.FibreWeight, p.Contrast, 0, 0] },
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
        PainterlyNPR__Paper__Run,
        FS_PAPER  as  PainterlyNPR__Paper__FS_PAPER,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
