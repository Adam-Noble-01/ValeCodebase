// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - VIEWPORT 2D - WINDOW
// =============================================================================
//
// FILE       : Na__LayoutEditor__Viewport2d__Window__.js
// NAMESPACE  : Na__LeVp2d
// MODULE     : Layout Editor - Viewport 2D - Window
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The model window a 2D viewport looks through, and the projection definition it draws
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - Window: the frame's paper size times the scale denominator, in drawing
//   millimetres, centred on the viewport's pan, with its local, paper and
//   from-paper mappings. Everything in the frame is placed from that one
//   rectangle.
// - Describe: the source records, the projection definition (the viewport's
//   own Render Composites toggles and Model Layers exclusion tokens folded
//   in), the window and the viewport's Model Source, in one go. The Model
//   Source is always the live model here (ValeVision3D has no design
//   phases), answered in the shape TrueVision3D's callers read.
// - Imports no other Viewport 2D unit, so the Frame and Linework units and
//   Na__LayoutEditor__Viewport2d__ can all import it without a cycle.
//
// INTEGRATION:
// - Na__LayoutEditor__Viewport2d__ re-exports Window and Describe and calls
//   them from CentreOnDrawing, Fill, GetSnapSource, ForceRender and
//   RenderForExport. The Frame unit reads both for the debounced underlay
//   render; the Linework unit reads Window to lay out the linework SVG.
// - Every other module imports Na__LayoutEditor__Viewport2d__.js, never
//   this unit.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__Viewport2d__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js,
//                   ported from this unit (TrueVision3D v2.55.0). Describe's Model Source is replayed
//                   here as a hunk, the live model's answer standing in for Na__LeSource__Resolve
// - Source version: 1.2.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-23}} (Describe's Model Source)
// - Parity        : adapted (the moved code, and that hunk)
// - Divergences   :
//   - Describe's modelSource is a fixed answer in Resolve's shape for the live model
//     (Na__LeVp2d__LiveModelSource): ValeVision3D has no design phases and no Model Source module
//     (DR-09). TrueVision3D's callers read modelSource.renderId and .status unguarded, so it is never
//     null.
//   - Not here yet: TrueVision3D's turned viewport (1.1.0: ToFrame, FrameToPaper, RotationDeg and the
//     turn in ToPaper and FromPaper) and the door pose and Hide swings tokens in Describe (1.2.0).
// - Back-port     : none (TrueVision3D took the split in v2.55.0).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (Describe's Model Source, {{VVREL:W1-23}})
// - Describe hands back the viewport's Model Source with the source, the
//   definition and the window, as TrueVision3D's Describe does. ValeVision3D
//   has no design phases, so it is always the live model, in the shape
//   TrueVision3D's Na__LeSource__Resolve gives it: groupId null, label '',
//   storedId null, explicit false, missing false, isLive true, renderId null,
//   status 'live' - a new object each time. Never null: TrueVision3D's
//   callers read modelSource.renderId and .status with no guard. The
//   definition and the window are unchanged, so every key is too.
//
// 15-Sep-2026 - Version 1.0.0
// - Split out of Na__LayoutEditor__Viewport2d__.js; the code moved verbatim.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Model and Model Layers
    // ------------------------------------------------------------
    import { Na__LeModel__ResolveViewportSource } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
    import { Na__LeModelLayers__ExcludeTokens } from '../25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Projected Linework (definitions)
    // ------------------------------------------------------------
    import {
        Na__PlView__FromPlan,
        Na__PlView__FromElevation
    } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__ViewDefinition__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Window and Definition
// -----------------------------------------------------------------------------

    // FUNCTION | The Model Window of a Viewport, With Its Paper Mappings
    // ------------------------------------------------------------
    function Na__LeVp2d__Window(viewport) {
        const frame = viewport.Viewport__FrameMm;
        const D     = viewport.Viewport__ScaleDenominator;
        const w     = frame.WidthMm  * D;
        const h     = frame.HeightMm * D;
        const cx    = viewport.Viewport__PanMm.X;
        const cy    = viewport.Viewport__PanMm.Y;
        const ox    = cx - (w / 2);
        const oy    = cy - (h / 2);
        const win = {
            CentreX : cx, CentreY : cy, WidthMm : w, HeightMm : h, OriginX : ox, OriginY : oy, Denominator : D, Frame : frame,
            ToLocal   : (dx, dy) => ({ x : (dx - ox) / D, y : (dy - oy) / D }),
            ToPaper   : (dx, dy) => ({ x : frame.X + ((dx - ox) / D), y : frame.Y + ((dy - oy) / D) }),
            FromPaper : (px, py) => ({ x : ox + ((px - frame.X) * D), y : oy + ((py - frame.Y) * D) })
        };
        return win;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Model Source Every Viewport Draws Here: the Live Model
    // ------------------------------------------------------------
    // TrueVision3D's Describe hands back Na__LeSource__Resolve(viewport), and
    // its callers read modelSource.renderId and .status with no guard.
    // ValeVision3D has no design phases (DR-09), so every viewport draws the
    // model the 3D view holds: the answer Resolve gives a viewport of the live
    // model on a project with no model groups, a new object each time so no
    // caller can change another's.
    // ------------------------------------------------------------
    function Na__LeVp2d__LiveModelSource() {
        return { groupId : null, label : '', storedId : null, explicit : false, missing : false, isLive : true, renderId : null, status : 'live' };
    }
    // ------------------------------------------------------------


    // FUNCTION | Source Records, Projection Definition and Window in One Go
    // ------------------------------------------------------------
    function Na__LeVp2d__Describe(viewport) {
        const source = Na__LeModel__ResolveViewportSource(viewport);

        // The viewport's own Render Composites toggles override the drawing
        // record's, so a sheet can show the same drawing two ways - and so a
        // toggle in the panel governs the LINEWORK as well as the raster behind
        // it. Without the override the vectors keep whatever the drawing record
        // said and the panel only appears to work.
        const override   = viewport.Viewport__Styles || null;
        // AND THE MODEL LAYERS PANEL GOES IN AS EXCLUSION TOKENS, which is the
        // whole of how a hidden category leaves the vectors. The tokens are
        // part of the definition, so they are part of its RecordHash, so two
        // viewports of one drawing that hide different things key differently
        // and cache separately without another word being said about it.
        const exclude    = Na__LeModelLayers__ExcludeTokens(viewport);
        const definition = source.plan
            ? Na__PlView__FromPlan(source.plan, override, exclude)
            : (source.elevation ? Na__PlView__FromElevation(source.elevation, override, exclude) : null);

        return { source : source, definition : definition, window : Na__LeVp2d__Window(viewport), modelSource : null };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Viewport 2D Window Unit
    // ------------------------------------------------------------
    export {
        Na__LeVp2d__Window,
        Na__LeVp2d__Describe
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
