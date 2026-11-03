/* =============================================================================
   PAINTERLYNPR - SCENE | MATERIAL CLASSES
   =============================================================================

   FILE       : PainterlyNPR__MaterialClasses__Table__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - MaterialClasses
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every material class and its watercolour recipe, by key, and the
                slots the shaders hold them in
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The table is Na__MaterialClasses__Config.json beside this file; the shaders
     read the class count and slots at load time.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config / Material
                   Classes and Their Recipes
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import MaterialsConfig from './Na__MaterialClasses__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Material Classes
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialClasses__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const RECIPES  =  PainterlyNPR__ConfigAccess__Section(MaterialsConfig, 'PainterlyNPR__MaterialClasses__Config', 'Recipes', ['Slots', 'Classes']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Classes and Their Recipes
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Material Classes
    // ------------------------------------------------------------
    // Albedo is the restrained source colour the truth buffer carries (and the
    // navigation preview shows). Pigment and Pigment2 are TRANSMITTANCE colours:
    // what one unit of density of that wash does to white paper; the wash mixes
    // between them wet-in-wet by Variation. Density is the dilution. The rest is
    // the recipe of manifest section 08: Mottle (broad density variation) at
    // MottleScale per mm, Flow (0 round, 1 streaked along the brush), Granulation,
    // Pooling at an edge PoolWidthMm wide, SoftMm (a wet edge feathered this far;
    // 0 a hard, drying edge), Withdraw (white slivers left between wash and line),
    // ReserveLit (lit planes left as paper), ShadowTake (how much shadow glaze it
    // takes), DryBrush (paper skipped on the grain) and Aerial (fades with distance).
    const MATERIAL_CLASSES = RECIPES.Classes;
    const MATERIAL_BY_KEY       =  Object.fromEntries(MATERIAL_CLASSES.map(m => [m.Key, m]));
    const MATERIAL_SLOTS        =  RECIPES.Slots;                            // <-- Uniform array length in the shaders; at least the class count (full since WindowPaint, Id 27)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        MATERIAL_BY_KEY   as  PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY,
        MATERIAL_CLASSES  as  PainterlyNPR__MaterialClasses__MATERIAL_CLASSES,
        MATERIAL_SLOTS    as  PainterlyNPR__MaterialClasses__MATERIAL_SLOTS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
