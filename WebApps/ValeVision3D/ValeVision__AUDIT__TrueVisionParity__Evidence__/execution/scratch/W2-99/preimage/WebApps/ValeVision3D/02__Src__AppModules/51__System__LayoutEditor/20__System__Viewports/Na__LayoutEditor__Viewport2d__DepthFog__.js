// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - VIEWPORT 2D - DEPTH FOG
// =============================================================================
//
// FILE       : Na__LayoutEditor__Viewport2d__DepthFog__.js
// NAMESPACE  : Na__LeVp2d
// MODULE     : Layout Editor - Viewport 2D - Depth Fog
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What depth fog a 2D viewport wants, if any - from its drawing's own record and its own Render Composites toggle
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - THE FOG IS THE DRAWING'S; WHETHER TO SHOW IT IS THE VIEWPORT'S. The three
//   numbers and the on / off live on the elevation's record and are set in
//   Dev Tools > Elevations, because a fog belongs to where a drawing is taken
//   from - its plane, its building - and must not be set twice. A viewport
//   adds only the one thing a sheet can legitimately disagree about: its
//   Render Composites row, Depth Fog, which is ON by default ("show the
//   drawing's fog, if it has one") so that switching an elevation's fog on
//   reaches every sheet that draws it, and OFF lets one elevation stand fogged
//   on one sheet and bare on another.
//
// - FogFor answers null for every reason a viewport can have no fog - the row
//   unticked, a drawing that is not an elevation (floor plans carry the same
//   block when their row is wired, and get their branch here then), a fog that
//   is switched off - or { token, source }:
//     token   changes whenever the fog's PICTURE would: the three numbers, the
//             configured colour and ceiling, and where the plane stands. It is
//             the fog image's own key; the base image and the vectors never
//             see it, because fog moves no pixel of one and no line of the
//             other.
//     source  what Na__LeSnap__Render2d is handed to draw the fog image. It
//             holds the values AS READ HERE, not closures over the record, so
//             the image rendered is the image the token names even when the
//             record is edited while the render waits its turn in the queue.
//
// - Imports no other Viewport 2D unit, so the Frame unit and
//   Na__LayoutEditor__Viewport2d__ can both import it without a cycle.
//
// INTEGRATION:
// - The Frame unit asks when a debounced fog render's turn comes;
//   Na__LayoutEditor__Viewport2d__ asks in Fill (the key), ForceRender and
//   RenderFogForExport.
// - Every other module imports Na__LayoutEditor__Viewport2d__.js, never this
//   unit.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js
// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-12}}, with the Render Composites Depth Fog
//                   row and the tiled renderer's opt-in frame routine route. TrueVision's own note said
//                   "not yet ported" and its fog plan still awaits Adam's test; it comes across under
//                   DR-01 (c), and v2.94.0 is named as not yet confirmed by Adam in TrueVision.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. The imports are TrueVision's paths unchanged: since the folder renumber
//     the elevation data module sits in 45 and the fog modules in 49 in both apps.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Depth Fog build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Elevation's Own Fog, and Where Its Plane Stands
    // ------------------------------------------------------------
    import {
        Na__ElevData__GetDepthFog,
        Na__ElevData__GetDepthFogPlane
    } from '../../45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Config and Maths (the token)
    // ------------------------------------------------------------
    import { Na__ElevFogCfg__IsEnabled, Na__ElevFogCfg__GetAppearance } from '../../49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js';
    import { Na__ElevFogMath__Token } from '../../49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Viewport Style Key
    // ------------------------------------------------------------
    // The Render Composites row. Absent on a viewport saved before the row
    // existed, which reads as ON - the record layer writes the default in.
    // ------------------------------------------------------------
    const Na__LeVp2d__FOG_STYLE_KEY = 'depthFog';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | The Depth Fog This Viewport Wants, or Null
    // ------------------------------------------------------------
    // described is what Na__LeVp2d__Describe answered for the viewport.
    // ------------------------------------------------------------
    function Na__LeVp2d__FogFor(viewport, described) {
        if (!viewport || !described || !described.definition) return null;
        if (!Na__ElevFogCfg__IsEnabled()) return null;                           // <-- The whole system, switched off in its config

        const styles = viewport.Viewport__Styles;
        if (styles && styles[Na__LeVp2d__FOG_STYLE_KEY] === false) return null;  // <-- This viewport shows its drawing bare

        const elevation = described.source ? described.source.elevation : null;
        if (!elevation) return null;                                             // <-- A floor plan: no fog row wired yet

        const settings = Na__ElevData__GetDepthFog(elevation);
        if (!settings.enabled) return null;

        const plane = Na__ElevData__GetDepthFogPlane(elevation);
        return {
            token  : Na__ElevFogMath__Token(settings, Na__ElevFogCfg__GetAppearance())
                   + '@' + Math.round(plane.distanceMm) + ':' + plane.normalX.toFixed(5) + ':' + plane.normalZ.toFixed(5),
            source : {
                getSettings : () => settings,
                getPlane    : () => plane
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Viewport 2D Depth Fog Unit
    // ------------------------------------------------------------
    export {
        Na__LeVp2d__FogFor
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
