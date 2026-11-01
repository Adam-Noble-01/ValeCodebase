/* =============================================================================
   PAINTERLYNPR - WASH | PIGMENT MODEL - PIGMENTS
   =============================================================================

   FILE       : PainterlyNPR__PigmentModel__Pigments__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - PigmentModel - Pigments
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The pigments that belong to no one material: the shadow glaze, the
                clouds' undersides, the flowers' accent glazes and the marker's
                shadow lines
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Transmittance colours, as the material recipes' pigments are: what one unit
     of density does to white paper. They are Na__PigmentModel__Config.json beside
     this file.

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

import PigmentConfig from './Na__PigmentModel__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Pigment Model - Pigments
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__PigmentModel__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const PIGMENTS  =  PainterlyNPR__ConfigAccess__Section(PigmentConfig, 'PainterlyNPR__PigmentModel__Config', 'Pigments', ['Shadow', 'Cloud', 'Flowers', 'Marker']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Classes and Their Recipes
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pigments That Belong to No One Material
    // ------------------------------------------------------------
    const SHADOW_PIGMENT        =  PIGMENTS.Shadow;                          // <-- Ultramarine and burnt sienna: a cool, granulating neutral
    const CLOUD_PIGMENT         =  PIGMENTS.Cloud;                           // <-- Cloud undersides, grey-blue
    const FLOWER_PIGMENTS       =  PIGMENTS.Flowers;                                                                                          // <-- Dropped into the foliage as dabs: rose, lavender and cream by the accent layer's G, B and A, calendula and cornflower by the second layer's R and B; its G is a white flower - the foliage lifted to the paper, nothing laid in
    const MARKER_PIGMENT        =  PIGMENTS.Marker;                          // <-- A cool grey marker: the shadow lines beside reveals and glazing bars
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        CLOUD_PIGMENT    as  PainterlyNPR__PigmentModel__CLOUD_PIGMENT,
        FLOWER_PIGMENTS  as  PainterlyNPR__PigmentModel__FLOWER_PIGMENTS,
        MARKER_PIGMENT   as  PainterlyNPR__PigmentModel__MARKER_PIGMENT,
        SHADOW_PIGMENT   as  PainterlyNPR__PigmentModel__SHADOW_PIGMENT,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
