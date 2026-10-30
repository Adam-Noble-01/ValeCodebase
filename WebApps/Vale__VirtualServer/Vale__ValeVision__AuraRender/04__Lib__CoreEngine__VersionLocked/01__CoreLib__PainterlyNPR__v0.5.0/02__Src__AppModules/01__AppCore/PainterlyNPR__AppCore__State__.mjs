/* =============================================================================
   PAINTERLYNPR - APP CORE | STATE
   =============================================================================

   FILE       : PainterlyNPR__AppCore__State__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppCore - State
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Everything a render depends on, in one flat object - the object
                the settings JSON serialises, a save records and a load puts back
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - State is mutated in place by the interface and read by every pass; nothing
     replaces it.
   - It starts as Na__AppState__Config.json beside this file says; the Kuwahara
     filter's wash defaults there are off until turned up, so a drawing made
     before the filter is the drawing it was.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config /
                   Application State
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import StateConfig from './Na__AppState__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__DrawingDiscipline__PEN_DEFAULTS as PEN_DEFAULTS } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';

// =============================================================================
// REGION | State
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AppState__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const START  =  PainterlyNPR__ConfigAccess__Section(StateConfig, 'PainterlyNPR__AppState__Config', 'Start', ['KuwaharaDefaults', 'State']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Application State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Kuwahara Filter's Starting Point - off until turned up
    // ------------------------------------------------------------
    // The wash's settings for 57__Wash__KuwaharaFilter. Amount 0: a drawing made
    // before the filter, or with it off, is the drawing it was. Sky is its amount
    // on the sky, kept apart so the sky's own paint can stay as it is.
    const KUWAHARA_DEFAULTS  =  Object.freeze(START.KuwaharaDefaults);
    // ------------------------------------------------------------


    // MODULE STATE | Everything a Render Depends On
    // ------------------------------------------------------------
    // One flat object, serialised whole as the settings JSON. The application
    // proper resolves seven configuration layers into this (02__Src__AppModules/
    // 06__System__ConfigResolution); for now it starts from Na__AppState__Config.json.
    const State  =  Object.assign(START.State, {
        Pen           :  Object.assign({}, PEN_DEFAULTS),
        Kuwahara      :  Object.assign({}, KUWAHARA_DEFAULTS),                // <-- 57__Wash__KuwaharaFilter on the wash
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        KUWAHARA_DEFAULTS  as  PainterlyNPR__AppCore__KUWAHARA_DEFAULTS,
        State              as  PainterlyNPR__AppCore__State,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
