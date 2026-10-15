/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | GLAZE BAR RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__GlazeBarRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - GlazeBarRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw glazing bar centrelines and pane washes in 2D views
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Consumes the GlazeBarSet produced by VghLantern__Geometry__GlazeBarLayout.
   - Draws bar and transom centrelines into the bars layer, and an optional
     translucent glazing wash per slope face into the fills layer so the roof
     reads as glazed rather than as bare linework.
   - Performs no layout maths. If a bar is in the wrong place the fix belongs in
     GlazeBarLayout, not here.

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar Renderer Module
// =============================================================================

const VghLantern__Env2d__GlazeBarRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Fallback Widths
    // ------------------------------------------------------------
    const CSS_BAR            =  'VghLantern__Env2d__GlazeBar';               // <-- Sloping glazing bar centreline
    const CSS_TRANSOM        =  'VghLantern__Env2d__GlazeBar--transom';      // <-- Horizontal transom centreline
    const CSS_BAR_HIDDEN     =  'VghLantern__Env2d__GlazeBar--hidden';       // <-- Behind the viewing plane
    const CSS_PANE_FILL      =  'VghLantern__Env2d__PaneFill';               // <-- Glazing wash polygon
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Glaze Bar Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__GlazeBarRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var barsCfg       =  (env2d && env2d['VghLantern__Env2d__Config__GlazeBars']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__GlazeBars';

        return {
            BarStrokeWidthMm      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(barsCfg, 'BarStrokeWidthMm',     LABEL),
            TransomStrokeWidthMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(barsCfg, 'TransomStrokeWidthMm', LABEL),
            ShowPaneFills         : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(barsCfg, 'ShowPaneFills', LABEL),
            PaneFillOpacity       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(barsCfg, 'PaneFillOpacity',      LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bar Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Whether a Bar Sits Behind the Viewing Plane
    // ------------------------------------------------------------
    // Bars carry a SlopeKey identifying which face they belong to, which is a
    // more reliable hidden test than depth averaging: in a front elevation the
    // whole far slope is hidden regardless of individual bar depth.
    function VghLantern__Env2d__GlazeBarRenderer__IsHidden(bar, viewKey) {
        if (viewKey === 'plan') return false;
        if (viewKey === 'frontElevation') return bar.SlopeKey === 'short+';
        if (viewKey === 'sideElevation')  return bar.SlopeKey === 'long-';
        return false;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Bar into a Layer
    // ------------------------------------------------------------
    function VghLantern__Env2d__GlazeBarRenderer__DrawBar(targetLayer, bar, viewKey, config, isHidden) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var startPt  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(bar.Start, viewKey);
        var endPt    =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(bar.End, viewKey);

        var isTransom  =  bar.Role === 'transom';
        var cssClass   =  isTransom ? (CSS_BAR + ' ' + CSS_TRANSOM) : CSS_BAR;
        if (isHidden) cssClass  +=  ' ' + CSS_BAR_HIDDEN;

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(startPt, endPt, cssClass, {
            'stroke-width'     : isTransom ? config.TransomStrokeWidthMm : config.BarStrokeWidthMm,
            'data-vgh-bar-id'  : bar.Id,
            'data-vgh-slope'   : bar.SlopeKey
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Render All Glazing Bars for a View
    // ------------------------------------------------------------
    function VghLantern__Env2d__GlazeBarRenderer__Render(instance, barSet) {
        if (!instance || !barSet || !barSet.Bars) return;

        var config       =  VghLantern__Env2d__GlazeBarRenderer__ReadConfig();
        var viewKey      =  instance.ViewKey;
        var barsLayer    =  instance.GetLayer('bars');
        var hiddenLayer  =  instance.GetLayer('hidden');
        if (!barsLayer) return;

        var i, isHidden;
        for (i = 0; i < barSet.Bars.length; i++) {
            isHidden  =  VghLantern__Env2d__GlazeBarRenderer__IsHidden(barSet.Bars[i], viewKey);
            VghLantern__Env2d__GlazeBarRenderer__DrawBar(
                (isHidden && hiddenLayer) ? hiddenLayer : barsLayer,
                barSet.Bars[i], viewKey, config, isHidden
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glazing Pane Washes
// -----------------------------------------------------------------------------

    // FUNCTION | Render a Translucent Wash Over Each Glazing Face
    // ------------------------------------------------------------
    // Faces come straight from the skeleton solve, so the wash always matches
    // the true glazed area used by the specification takeoff.
    function VghLantern__Env2d__GlazeBarRenderer__RenderPaneFills(instance, skeleton) {
        if (!instance || !skeleton || !skeleton.Faces) return;

        var config  =  VghLantern__Env2d__GlazeBarRenderer__ReadConfig();
        if (!config.ShowPaneFills) return;

        var fillsLayer  =  instance.GetLayer('fills');
        if (!fillsLayer) return;

        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var viewKey       =  instance.ViewKey;

        var i, projected;
        for (i = 0; i < skeleton.Faces.length; i++) {
            projected  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoints(skeleton.Faces[i].Points, viewKey);

            fillsLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape(
                projected, CSS_PANE_FILL, true, {
                    'fill-opacity'     : config.PaneFillOpacity,
                    'data-vgh-face-id' : skeleton.Faces[i].Id,
                    'data-vgh-slope'   : skeleton.Faces[i].SlopeKey
                }
            ));
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__GlazeBarRenderer__Render           : VghLantern__Env2d__GlazeBarRenderer__Render,
        VghLantern__Env2d__GlazeBarRenderer__RenderPaneFills  : VghLantern__Env2d__GlazeBarRenderer__RenderPaneFills
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__GlazeBarRenderer  =  VghLantern__Env2d__GlazeBarRenderer;
