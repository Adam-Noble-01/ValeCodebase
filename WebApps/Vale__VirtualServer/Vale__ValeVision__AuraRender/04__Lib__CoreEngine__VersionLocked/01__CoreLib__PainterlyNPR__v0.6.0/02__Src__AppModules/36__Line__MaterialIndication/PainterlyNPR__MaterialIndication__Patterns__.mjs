/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION - PATTERNS
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__Patterns__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication - Patterns
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The indication patterns: each material's units, gauge and how it
                asks to be shown
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure constants, no imports.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config / Material
                   Indication and Organic Styles
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Material Indication - Patterns
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const PATTERNS  =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Patterns', ['Patterns']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Indication and Organic Styles
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Indication Patterns
    // ------------------------------------------------------------
    // Material indication is the illustrator's "selected surface cues" (manifest
    // section 08): brick suggested by a few courses where the eye expects them,
    // never every brick. Each pattern is measured in metres on the real surface -
    // a brick course is 75 mm, a plain tile's gauge 100 mm - so the marks are true
    // to the building and stay put when the camera moves. LineMm and Ink style the
    // pen; Perpend is how often a joint between units is ticked; Pick how often a
    // unit is picked out with a darker touch of wash; Floor a minimum importance
    // (soldier courses are embellishments, drawn unless something suppresses them).
    const INDICATION_PATTERNS = PATTERNS.Patterns;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        INDICATION_PATTERNS  as  PainterlyNPR__MaterialIndication__INDICATION_PATTERNS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
