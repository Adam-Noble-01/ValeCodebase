/* =============================================================================
   PAINTERLYNPR - HUD | PASS VIEWER - VIEW LIST
   =============================================================================

   FILE       : PainterlyNPR__PassViewer__ViewList__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - PassViewer - ViewList
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The buffer views: what each shows and how
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

import ViewsConfig from './Na__PassViewer__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Pass Viewer - View List
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__PassViewer__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const VIEW_LIST  =  PainterlyNPR__ConfigAccess__Section(ViewsConfig, 'PainterlyNPR__PassViewer__Config', 'Views', ['Views']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Papers, Inks, Cameras and Views
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Buffer Views
    // ------------------------------------------------------------
    // Id is the debug shader's switch. Every pass shows its first view as its
    // thumbnail; the truth buffers have six.
    const VIEWS = VIEW_LIST.Views;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        VIEWS  as  PainterlyNPR__PassViewer__VIEWS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
