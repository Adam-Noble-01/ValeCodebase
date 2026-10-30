/* =============================================================================
   PAINTERLYNPR - WASH | LAYER STACK - ACCENT LAYER
   =============================================================================

   FILE       : PainterlyNPR__AccentLayer__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - LayerStack - AccentLayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The accent layer: ragged dabs of colour - picked-out units,
                flowers - blended by MAX between the base wash and the glaze
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A picked-out brick deepens its own wash toward the second pigment; under a
     flower the foliage lifts almost to the paper.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Accent Layer
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__SeededRandom__HashUnit } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__LineCandidates__Lines as Lines } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__MaterialIndication__Indication as Indication } from '../36__Line__MaterialIndication/PainterlyNPR__MaterialIndication__Pass__.mjs';

// =============================================================================
// REGION | Layer Stack - Accent Layer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Accent Layer
// -----------------------------------------------------------------------------

    // FUNCTION | One Dab - a ragged seven-sided blob of accent
    // ------------------------------------------------------------
    // Two axis vectors in sheet pixels (so a dab can lie on a foreshortened
    // brick), a channel - 0 picked-out units, 1 rose, 2 lavender, 3 cream - and an
    // amount: full at the heart and a third at the rim, so the glaze feathers.
    function PainterlyNPR__AccentLayer__Dab(out, x, y, ax, ay, bx, by, channel, amount, seed) {
        const n      =  7;
        const heart  =  [0, 0, 0, 0], rim = [0, 0, 0, 0];
        heart[channel]  =  amount;
        rim[channel]    =  amount * 0.35;
        const RX = new Array(n), RY = new Array(n);
        for (let k = 0; k < n; k++) {
            const t  =  (k / n) * Math.PI * 2 + 0.4 * PainterlyNPR__SeededRandom__HashUnit(k, seed);
            const j  =  0.75 + 0.45 * PainterlyNPR__SeededRandom__HashUnit(k + 17, seed);
            RX[k]  =  x + (Math.cos(t) * ax + Math.sin(t) * bx) * j;
            RY[k]  =  y + (Math.cos(t) * ay + Math.sin(t) * by) * j;
        }
        out.Reserve(n * 18);
        const d  =  out.Data;
        let o    =  out.Length;
        const put  =  (px, py, c) => { d[o++] = px; d[o++] = py; d[o++] = c[0]; d[o++] = c[1]; d[o++] = c[2]; d[o++] = c[3]; };
        for (let k = 0; k < n; k++) {
            const k1  =  (k + 1) % n;
            put(x, y, heart); put(RX[k], RY[k], rim); put(RX[k1], RY[k1], rim);
        }
        out.Length  =  o;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - the Accent Layer
    // ------------------------------------------------------------
    // Every dab into one RGBA8 target, blended by MAX so overlapping touches never
    // build past a full glaze. The washes read it: R deepens the unit's own wash
    // and greys it a touch; G, B and A glaze the flower pigments over the foliage.
    function PainterlyNPR__AccentLayer__Run() {
        const gl    =  Gpu.Gl;
        const draw  =  (T, all) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, T.Fbo);
            gl.viewport(0, 0, T.Width, T.Height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const sets  =  all.filter(set => set.Length);
            if (!sets.length) return;
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MAX);
            gl.blendFunc(gl.ONE, gl.ONE);
            PainterlyNPR__GpuResources__Use(Gpu.Programs.Lines, { uSize: { v2: [T.Width, T.Height] } });
            gl.bindVertexArray(Gpu.Vaos.Dabs);
            for (const set of sets) {
                gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Dabs);
                gl.bufferData(gl.ARRAY_BUFFER, set.Data.subarray(0, set.Length), gl.DYNAMIC_DRAW);
                gl.drawArrays(gl.TRIANGLES, 0, set.Length / 6);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindVertexArray(null);
            gl.blendEquation(gl.FUNC_ADD);
            gl.disable(gl.BLEND);
        };
        draw(Gpu.Targets.Accent, [Lines.Dabs, Indication.Dabs]);
        draw(Gpu.Targets.Accent2, [Lines.Dabs2]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AccentLayer__Dab,
        PainterlyNPR__AccentLayer__Run,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
