/* =============================================================================
   PAINTERLYNPR - STROKE | INK COMPOSITING - INK FAMILIES
   =============================================================================

   FILE       : PainterlyNPR__InkLayer__InkFamilies__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Stroke - InkCompositing - InkFamilies
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The inks - never pure black
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure constants, no imports.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config / Papers,
                   Inks, Cameras and Views
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import InkConfig from './Na__InkLayer__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Ink Compositing - Ink Families
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__InkLayer__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const INKS  =  PainterlyNPR__ConfigAccess__Section(InkConfig, 'PainterlyNPR__InkLayer__Config', 'Inks', ['Families']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Papers, Inks, Cameras and Views
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ink Families - never pure black
    // ------------------------------------------------------------
    const INK_FAMILIES = INKS.Families;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        INK_FAMILIES  as  PainterlyNPR__InkLayer__INK_FAMILIES,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
