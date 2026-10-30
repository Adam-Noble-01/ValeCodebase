/* =============================================================================
   PAINTERLYNPR - ORGANIC | GRAMMAR FRAMEWORK - STYLES
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Styles__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - GrammarFramework - Styles
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : How each kind of plant is drawn: how much outline survives, how
                broken it is, and the interior rhythm at a density per square
                millimetre
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

import OrganicConfig from './Na__OrganicGrammar__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Grammar Framework - Styles
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__OrganicGrammar__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const STYLES  =  PainterlyNPR__ConfigAccess__Section(OrganicConfig, 'PainterlyNPR__OrganicGrammar__Config', 'Styles', ['Styles']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Indication and Organic Styles
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Organic Styles - how each kind of plant is drawn
    // ------------------------------------------------------------
    // Outline scales how much of the canopy's contour survives; Gap how broken it
    // is; Marks the internal rhythm (arcs of leaf clusters, upright spikes,
    // drooping ticks) at Density per square millimetre of the sheet. Edge is the
    // outline's own hand - leaf clumps, needles or one loose line - and EdgeMm the
    // size of a clump or needle along it, on the sheet.
    const ORGANIC_STYLES = STYLES.Styles;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        ORGANIC_STYLES  as  PainterlyNPR__OrganicGrammar__ORGANIC_STYLES,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
