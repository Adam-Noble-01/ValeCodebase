/* =============================================================================
   PAINTERLYNPR - APP DATA | ENGINE
   =============================================================================

   FILE       : PainterlyNPR__AppData__Engine__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppData - Engine
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The sheet, the engine's version and its limits: what every
                millimetre on the paper is measured against
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure constants, no imports: read at load time by the GPU resources and the
     shaders.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config / Sheet,
                   Engine and Limits
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import AppConfig from './PainterlyNPR__AppConfig__Main__.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Engine
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - PainterlyNPR__AppConfig__Main__.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const APP     =  PainterlyNPR__ConfigAccess__Section(AppConfig, 'PainterlyNPR__AppConfig__Main', 'App', ['AppVersion']);
    const SHEET   =  PainterlyNPR__ConfigAccess__Section(AppConfig, 'PainterlyNPR__AppConfig__Main', 'Sheet', ['SheetName', 'SheetWidthMm', 'SheetHeightMm', 'BasePxPerMm', 'PreviousSheetMm']);
    const ENGINE  =  PainterlyNPR__ConfigAccess__Section(AppConfig, 'PainterlyNPR__AppConfig__Main', 'Engine', ['ShadowMapSize', 'MaxPoints', 'JfaReachMm', 'RefineIdleMs', 'StrokeSpacingMm', 'AaPx']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet, Engine and Limits
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Sheet, Engine and Limits
    // ------------------------------------------------------------
    const ENGINE_VERSION      =  APP.AppVersion;
    const SHEET_NAME          =  SHEET.SheetName;                            // <-- A3: the paper the drawing is made for (v0.8.3)
    const SHEET_WIDTH_MM      =  SHEET.SheetWidthMm;                         // <-- Everything artistic is measured on the sheet
    const SHEET_HEIGHT_MM     =  SHEET.SheetHeightMm;
    const BASE_PX_PER_MM      =  SHEET.BasePxPerMm;                          // <-- 2100 x 1485 on screen; an export multiplies this, never the drawing
    const PREVIOUS_SHEET_MM   =  SHEET.PreviousSheetMm;                      // <-- [300, 200]: what a drawing that names no sheet was placed on
    const SHADOW_MAP_SIZE     =  ENGINE.ShadowMapSize;                       // <-- The garden is 34 m across: 8 mm texels; clamped to the GPU's limit at boot
    const MAX_POINTS          =  ENGINE.MaxPoints;                           // <-- Art Direction Points the field shader holds
    const JFA_REACH_MM        =  ENGINE.JfaReachMm;                          // <-- Past this a wash edge has no effect, so the distance field stops looking
    const REFINE_IDLE_MS      =  ENGINE.RefineIdleMs;                        // <-- The navigation preview holds until the camera has been still this long
    const STROKE_SPACING_MM   =  ENGINE.StrokeSpacingMm;                     // <-- Ribbon sample spacing: in millimetres, so an export draws the same strokes
    const AA_PX               =  ENGINE.AaPx;                                // <-- Ribbons are widened by this and faded in the shader: antialiasing without MSAA
    const DEG                 =  Math.PI / 180;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        AA_PX              as  PainterlyNPR__Engine__AA_PX,
        BASE_PX_PER_MM     as  PainterlyNPR__Engine__BASE_PX_PER_MM,
        DEG                as  PainterlyNPR__Engine__DEG,
        ENGINE_VERSION     as  PainterlyNPR__Engine__ENGINE_VERSION,
        JFA_REACH_MM       as  PainterlyNPR__Engine__JFA_REACH_MM,
        MAX_POINTS         as  PainterlyNPR__Engine__MAX_POINTS,
        PREVIOUS_SHEET_MM  as  PainterlyNPR__Engine__PREVIOUS_SHEET_MM,
        REFINE_IDLE_MS     as  PainterlyNPR__Engine__REFINE_IDLE_MS,
        SHADOW_MAP_SIZE    as  PainterlyNPR__Engine__SHADOW_MAP_SIZE,
        SHEET_HEIGHT_MM    as  PainterlyNPR__Engine__SHEET_HEIGHT_MM,
        SHEET_NAME         as  PainterlyNPR__Engine__SHEET_NAME,
        SHEET_WIDTH_MM     as  PainterlyNPR__Engine__SHEET_WIDTH_MM,
        STROKE_SPACING_MM  as  PainterlyNPR__Engine__STROKE_SPACING_MM,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
