/* =============================================================================
   PAINTERLYNPR - CAMERA | VIEW TYPES - PRESETS
   =============================================================================

   FILE       : PainterlyNPR__CameraRig__Presets__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - ViewTypes - Presets
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The camera presets - three perspectives and two elevations - and
                the zoom's range
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

import CameraConfig from './Na__CameraRig__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Engine__SHEET_HEIGHT_MM as SHEET_HEIGHT_MM } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';

// =============================================================================
// REGION | View Types - Presets
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__CameraRig__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const CAMERAS  =  PainterlyNPR__ConfigAccess__Section(CameraConfig, 'PainterlyNPR__CameraRig__Config', 'Cameras', ['Presets', 'Zoom']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Papers, Inks, Cameras and Views
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Camera Presets
    // ------------------------------------------------------------
    // The elevations are orthographic at a true scale: a preset's Scale sets its
    // half-height from the sheet's height (sheet mm x scale / 2000 metres), so
    // 1:50 stays 1:50 whatever paper the sheet is - 7.425 m on A3 (v0.8.3; it
    // was 1:100, 10 m, on the 300 x 200 mm sheet). Ceiling is the view profile's
    // limit on the Drawing Discipline (manifest section 11): a measured elevation
    // may be drawn with a natural pen, never a loose one. ZOOM is how far in and
    // out the wheel goes: far enough back to see the cottage in its garden and trees.
    const CAMERA_PRESETS = Object.fromEntries(Object.entries(CAMERAS.Presets).map(([key, preset]) =>
        [key, preset.Scale > 0 ? Object.assign({}, preset, { HalfHeight: SHEET_HEIGHT_MM * preset.Scale / 2000 }) : preset]));
    const ZOOM  =  CAMERAS.Zoom;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        CAMERA_PRESETS  as  PainterlyNPR__CameraRig__CAMERA_PRESETS,
        ZOOM            as  PainterlyNPR__CameraRig__ZOOM,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
