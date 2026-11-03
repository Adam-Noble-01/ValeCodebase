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
    // In the second layer (Lines.Dabs2): 0 calendula, 1 white chamomile, 2
    // cornflower, 3 paper left (v0.8.32: the wash and its shadow glaze lifted away).
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


    // FUNCTION | One Patch - a touch of wash that fills a picked unit, stopping short of its joints
    // ------------------------------------------------------------
    // Two axis vectors in sheet pixels, half the unit's sides less a little: a
    // squared-off outline round them, a shade uneven, so the wash fills the brick
    // as a hand drops it in and stays inside its lines (v0.8.21; a Dab is a blob
    // that took no notice of them). Channel R; nearly flat from heart to rim.
    function PainterlyNPR__AccentLayer__Patch(out, x, y, ax, ay, bx, by, amount, seed) {
        const n      =  16;
        const heart  =  [amount, 0, 0, 0], rim = [amount * 0.78, 0, 0, 0];
        const RX = new Array(n), RY = new Array(n);
        for (let k = 0; k < n; k++) {
            const t   =  (k / n) * Math.PI * 2 + Math.PI / n;
            const co  =  Math.cos(t), si = Math.sin(t);
            const su  =  Math.sign(co) * Math.pow(Math.abs(co), 0.42), sv = Math.sign(si) * Math.pow(Math.abs(si), 0.42);   // <-- A squared-off round: it fills the unit's corners
            const j   =  0.9 + 0.1 * PainterlyNPR__SeededRandom__HashUnit(k, seed);
            RX[k]  =  x + (su * ax + sv * bx) * j;
            RY[k]  =  y + (su * ay + sv * by) * j;
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


    // FUNCTION | One Ribbon - a flat strip of accent between two lines of points
    // ------------------------------------------------------------
    // a and b: lists of { X, Y, Amount } in sheet pixels, one across from the other.
    // Flat, its edges where its points say: for a shape with a long smooth edge, as
    // a brush goes round the side of a pot (v0.8.32), where overlapping dabs or
    // patches would leave steps.
    function PainterlyNPR__AccentLayer__Ribbon(out, a, b, channel) {
        const n  =  Math.min(a.length, b.length);
        if (n < 2) return;
        out.Reserve((n - 1) * 36);
        const d  =  out.Data;
        let o    =  out.Length;
        const put  =  (p) => { d[o++] = p.X; d[o++] = p.Y; for (let c = 0; c < 4; c++) d[o++] = c === channel ? p.Amount : 0; };
        for (let i = 0; i < n - 1; i++) {
            put(a[i]); put(b[i]); put(b[i + 1]);
            put(a[i]); put(b[i + 1]); put(a[i + 1]);
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
        draw(Gpu.Targets.Stone, [Indication.StoneDabs]);                      // <-- A rubble wall's washes: what the wash cuts its stones' shapes from (v0.8.20)
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
        PainterlyNPR__AccentLayer__Patch,
        PainterlyNPR__AccentLayer__Ribbon,
        PainterlyNPR__AccentLayer__Run,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
