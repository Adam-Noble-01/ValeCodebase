/* =============================================================================
   PAINTERLYNPR - PAPER | MODEL - PRESETS
   =============================================================================

   FILE       : PainterlyNPR__Paper__Presets__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - Model - Presets
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The papers: cold-pressed, hot-pressed, cartridge and textured
                ivory
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

import PaperConfig from './Na__Paper__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Model - Presets
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Paper__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const PAPERS  =  PainterlyNPR__ConfigAccess__Section(PaperConfig, 'PainterlyNPR__Paper__Config', 'Presets', ['Presets']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Papers, Inks, Cameras and Views
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Paper Presets
    // ------------------------------------------------------------
    // CellMm is the cold-pressed bump spacing, ToothMm the fine tooth, both in
    // millimetres on the sheet. Contrast scales the relief the pigment and the pen
    // respond to.
    const PAPER_PRESETS = PAPERS.Presets;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PAPER_PRESETS  as  PainterlyNPR__Paper__PAPER_PRESETS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
