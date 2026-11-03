/* =============================================================================
   PAINTERLYNPR - ATMOS | DISTANT LANDSCAPE - DISTANT TREES
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__DistantTrees__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - DistantLandscape - DistantTrees
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The distant trees: a loose, sketchy line round the far belt, just
                indicating trees in the background
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Adam, 29-Oct-2026: "a really sketchy, loose line around them to just indicate
     trees in the background".

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - the far belt's line is the base technical pen,
                   0.13 mm; 7 · Distant trees' Pen weight is its ink (its width only
                   in the variable mode)

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__DrawingDiscipline__ROLE_LOOSENESS as ROLE_LOOSENESS } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Chop,
    PainterlyNPR__OrganicGrammar__Contours,
    PainterlyNPR__OrganicGrammar__Decorate,
    PainterlyNPR__OrganicGrammar__Frame,
    PainterlyNPR__OrganicGrammar__Runs,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Distant Landscape - Distant Trees
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | The Distant Trees - a loose line round the far belt
    // ------------------------------------------------------------
    // The belt 160 to 225 m off is one object, so its true silhouette is traced
    // from the ID buffer as a plant's is, and drawn only where it stands against
    // the sky or the far ground beyond it: in front, the hedgerow, the field
    // trees and the house draw their own edges. Small crowns, broken often, with
    // searching passes beside the first - an indication of trees, never their
    // outline. Pen -> 7 · Distant trees -> Far belt. Appended after every other stroke, so
    // switching it on or off leaves each earlier stroke's seed where it was;
    // none in an elevation, which never draws the belt.
    function PainterlyNPR__OrganicGrammar__DistantTrees(strokes, globalL, ceiling, pushDebug) {
        const pen  =  State.Pen;
        if (!(pen.DistantBelt > 0.005) || Camera.Ortho || !Cpu.Valid) return 0;
        const id       =  Scene.Ids.Belt;
        const pxPerMm  =  Gpu.PxPerMm;
        const W = Gpu.Width, H = Gpu.Height;
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y += 4) {
            for (let x = 0; x < W; x += 4) {
                if (PainterlyNPR__GeometryBuffers__ObjectAt(x, y) !== id) continue;
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
        }
        if (x1 < 0) return 0;
        const box      =  [Math.max(0, x0 - 6), Math.max(0, y0 - 6), Math.min(W - 1, x1 + 6), Math.min(H - 1, y1 + 6)];
        const step     =  Math.max(1.25, 0.45 * pxPerMm);
        const probe    =  step + 1.5;
        const passes   =  1 + Math.ceil(pen.DistantSketch - 1e-6);
        const L        =  Clamp(globalL + ROLE_LOOSENESS.Context + 0.2, 0, ceiling);   // <-- Looser than the garden's planting
        const clump    =  2.2 * pxPerMm;                                              // <-- A far crown, a couple of millimetres on the sheet
        const seed     =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'distant-trees');
        const before   =  strokes.length;
        PainterlyNPR__OrganicGrammar__Contours(box, step, (x, y) => PainterlyNPR__GeometryBuffers__ObjectAt(x, y) === id).forEach((contour, ci) => {
            const P  =  PainterlyNPR__OrganicGrammar__Frame(contour);
            for (const p of P) {
                const ox = p.X + p.NX * probe, oy = p.Y + p.NY * probe, ix = p.X - p.NX * probe, iy = p.Y - p.NY * probe;
                const dIn  =  PainterlyNPR__GeometryBuffers__DepthAt(ix, iy);
                p.Sil    =  PainterlyNPR__GeometryBuffers__ObjectAt(ox, oy) < 0 || PainterlyNPR__GeometryBuffers__DepthAt(ox, oy) >= dIn - (0.05 + dIn * 0.004);
                p.Light  =  PainterlyNPR__GeometryBuffers__LightAt(ix, iy);
            }
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.Sil).forEach((run, ri) => {
                for (let pass = 0; pass < passes; pass++) {
                    const cover  =  pass ? Clamp(pen.DistantSketch - (pass - 1), 0, 1) : 1;
                    if (cover < 0.02) continue;
                    const rng   =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, `${ci}:${ri}:${pass}`));
                    const off   =  pass ? (rng.Chance(0.5) ? 1 : -1) * rng.Range(0.2, 0.55) * (1 + 0.4 * (pass - 1)) * pxPerMm : 0;
                    const line  =  PainterlyNPR__OrganicGrammar__Decorate(run, 'Clumps', clump, off, rng);
                    PainterlyNPR__OrganicGrammar__Chop(line, rng, strokes, pushDebug, {
                        DrawMm   :  [2.5, 8].map(v => v * (0.55 + 0.45 * Math.min(pen.DistantBelt, 2)) * (pass ? 0.4 + 0.4 * cover : 1)),
                        GapMm    :  [0.9, 3.4].map(v => v * (pass ? 1.6 / cover : 1) / Math.max(0.25, pen.DistantBelt)),
                        LitGap   :  1.2,
                        Class    :  2,
                        Weight   :  pen.DistantWeight,                     // <-- Its Pen weight: ink with the technical pens, width in the variable mode
                        Ink      :  pen.DistantWeight,
                        Source   :  'Distant',
                        Shade    :  0.4,
                        Alpha    :  pass ? 0.5 / (1 + 0.3 * (pass - 1)) : 0.72,
                        Loose    :  L,
                        TaperIn  :  0.5,
                        TaperOut :  0.9,
                        Wobble   :  0.9,
                        Profile  :  false,
                        Seed     :  PainterlyNPR__SeededRandom__DeriveSeed(seed, `s${ci}:${ri}:${pass}`),
                    });
                }
            });
        });
        return strokes.length - before;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__DistantTrees,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
