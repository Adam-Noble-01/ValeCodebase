/* =============================================================================
   PAINTERLYNPR - ORGANIC | ORNAMENTAL GRASS - TUFTS
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Tufts__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - OrnamentalGrass - Tufts
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Grass tufts along the path and the fence: grass suggested, never
                drawn blade by blade
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A handful of tufts where the lawn meets a hard edge.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - drawn with the base technical pen, 0.13 mm

   ============================================================================= */

import {
    PainterlyNPR__Maths__Clamp  as  Clamp,
    PainterlyNPR__Maths__Lerp   as  Lerp,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__MaxDepth3 } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__DrawingDiscipline__ROLE_LOOSENESS as ROLE_LOOSENESS } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__OrganicGrammar__Emit } from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Ornamental Grass - Tufts
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | Grass Tufts Along the Path and the Fence - grass suggests grass
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Tufts(strokes, globalL, ceiling, pushDebug) {
        const L  =  Clamp(globalL + ROLE_LOOSENESS.Ground, 0, ceiling);
        Scene.Tufts.forEach((tuft, ti) => {
            const base  =  PainterlyNPR__CameraRig__Project(tuft.Base);
            if (base.X < 0 || base.Y < 0 || base.X >= Gpu.Width || base.Y >= Gpu.Height) return;
            if (PainterlyNPR__GeometryBuffers__MaxDepth3(base.X, base.Y) < base.Depth - 0.05 - base.Depth * 0.003) return;
            tuft.Blades.forEach((blade, bi) => {
                const a  =  PainterlyNPR__CameraRig__Project(blade[0]), b = PainterlyNPR__CameraRig__Project(blade[1]);
                const pts  =  [];
                for (let k = 0; k <= 4; k++) pts.push({ X: Lerp(a.X, b.X, k / 4), Y: Lerp(a.Y, b.Y, k / 4) });
                PainterlyNPR__OrganicGrammar__Emit(pts, strokes, { Class: 3, Seed: 90000 + ti * 7 + bi, Alpha: 0.7, Loose: L, TaperIn: 0.1, TaperOut: 0.6, Wobble: 0.2, SpacingMm: 0.2, Source: 'Tuft' }, pushDebug);
            });
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
        PainterlyNPR__OrganicGrammar__Tufts,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
