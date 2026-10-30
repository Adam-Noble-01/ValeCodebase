/* =============================================================================
   PAINTERLYNPR - ORGANIC | SMALL TREE - TWIG
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Twig__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - SmallTree - Twig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A twig forking off a branch, seen against the canopy
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Branches suggested through the canopy, as a hand draws a tree.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';

// =============================================================================
// REGION | Small Tree - Twig
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | A Twig - forking off a branch, seen against the canopy
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Twig(x, y, ux, uy, turn, lenPx, rng) {
        const rot   =  (a) => [ux * Math.cos(a) - uy * Math.sin(a), ux * Math.sin(a) + uy * Math.cos(a)];
        const bend  =  rng.Spread(0.25);
        const main  =  [], fork = [];
        for (let k = 0; k <= 6; k++) {
            const t  =  k / 6, d = rot(turn + bend * t);
            main.push({ X: x + d[0] * lenPx * t, Y: y + d[1] * lenPx * t });
        }
        const at  =  main[4];
        const d2  =  rot(turn + bend * 0.66 + (rng.Chance(0.5) ? 1 : -1) * rng.Range(22, 40) * DEG);
        for (let k = 0; k <= 4; k++) {
            const t  =  k / 4;
            fork.push({ X: at.X + d2[0] * lenPx * 0.45 * t, Y: at.Y + d2[1] * lenPx * 0.45 * t });
        }
        return [main, fork];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__Twig,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
