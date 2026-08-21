/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | RIDGE END CAP RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__RidgeEndCapRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - RidgeEndCapRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw the cast cap that closes each end of the ridge capping
   CREATED    : 20-Aug-2026

   DESCRIPTION:
   - The 2D counterpart of Env3d's MeshBuilder RidgeEndCap, and a sibling of the
     FinialRenderer: same anchor points, same exported linework, same placement
     invariant of putting the asset's local origin on the point.
   - It has its own module rather than a branch inside the finial renderer because
     the two answer to different owners. A finial is a component the user picks
     from a list and can switch off; an end cap is a fixed part of the capped
     ridge, declared in the ridge system index and present whenever the capping is.

   ---------------------------------------------------------------------------

   WHY THIS EXISTS AT ALL

   The cap is what the finial stands on. The finial asset is authored from 100mm
   above the ridge datum upwards, because that is the height of the cap's top
   face, so an elevation drawn without the cap shows a ball floating 100mm clear
   of the ridge line. The 3D viewport gained the cap first; this is the drawing
   set catching up, and the two are drawn from the same asset file so they cannot
   disagree.

   THE CAP IS TURNED AND THE FINIAL IS NOT

   A finial is a solid of revolution. A cap is not: it has a front and a back, and
   the two on a ridge sit 180 degrees apart. ComponentPathRenderer OrientedView
   turns the placement's plan rotation into the pair of answers a view needs -
   which of the three exported blocks to read, and the matrix to read it through -
   so nothing about that reasoning lives here.

   WHY THE DRAW IS SYNCHRONOUS AND THE LOAD IS NOT

   The same bargain the FinialRenderer strikes, for the same reason: the cap asset
   is megabytes and loads on demand, so this draws whatever is resident, starts
   the fetch for whatever is not, and asks the editor's 2D host to redraw when it
   lands. A viewport that stalled behind a fetch would be worse than one that
   gains a cap a frame later.

   ============================================================================= */

// =============================================================================
// REGION | Ridge End Cap Renderer Module
// =============================================================================

const VghLantern__Env2d__RidgeEndCapRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class and Asset Block Names
    // ------------------------------------------------------------
    const CSS_END_CAP  =  'VghLantern__Env2d__RidgeEndCap';                  // <-- Traced cap linework

    const BLOCK_PLAN   =  'Na__Asset__Plan2D__Top';
    const BLOCK_FRONT  =  'Na__Asset__Elevation2D__Front';
    const BLOCK_RIGHT  =  'Na__Asset__Elevation2D__Right';
    const PATHS_KEY    =  'Na__Geometry__Paths';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Asset Requests
    // ------------------------------------------------------------
    // Guards against a load-triggered redraw asking for the same asset again while
    // its fetch is still in flight.
    let VghLantern__Env2d__RidgeEndCapRenderer__Requested  =  new Set();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Finial Section of the 2D Config
    // ------------------------------------------------------------
    // Deliberately the FINIAL block rather than one of its own. The cap and the
    // finial are one item on a drawing - a ridge end - and a drawing that showed
    // the cap but not the ball, or set them in different line weights, would be
    // wrong in a way no separate switch would ever be wanted for.
    function VghLantern__Env2d__RidgeEndCapRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var finialCfg     =  (env2d && env2d['VghLantern__Env2d__Config__Finials']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Finials';

        return {
            ShowInPlan            : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(finialCfg, 'ShowInPlan',      LABEL),
            ShowInElevation       : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(finialCfg, 'ShowInElevation', LABEL),
            OutlineStrokeWidthMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(finialCfg, 'OutlineStrokeWidthMm', LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Request an Asset and Redraw When It Lands
    // ------------------------------------------------------------
    function VghLantern__Env2d__RidgeEndCapRenderer__RequestAsset(anchorRole, assetId) {
        if (!assetId) return;
        if (VghLantern__Env2d__RidgeEndCapRenderer__Requested.has(assetId)) return;

        var Loader  =  window.VghLantern__AppData__RidgeSystemLoader;
        if (!Loader) return;

        VghLantern__Env2d__RidgeEndCapRenderer__Requested.add(assetId);

        Loader.VghLantern__RidgeSystemLoader__LoadEndCapAsset(anchorRole).then(function(assetData) {
            VghLantern__Env2d__RidgeEndCapRenderer__Requested.delete(assetId);
            if (!assetData) return;

            // The editor's 2D viewport host owns both surfaces and knows how to
            // redraw them from current state, so the redraw is asked for there
            // rather than by reaching back into the pipeline with a surface this
            // renderer does not hold.
            var ViewportHost  =  window.VghLantern__LanternEditor__ViewportHost__2d;
            if (ViewportHost && typeof ViewportHost.VghLantern__ViewportHost2d__Redraw === 'function') {
                ViewportHost.VghLantern__ViewportHost2d__Redraw();
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Asset Block One Oriented View Reads
    // ------------------------------------------------------------
    function VghLantern__Env2d__RidgeEndCapRenderer__BlockKey(assetViewKey) {
        if (assetViewKey === 'plan')  return BLOCK_PLAN;
        if (assetViewKey === 'right') return BLOCK_RIGHT;
        return BLOCK_FRONT;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | SVG Path Data for One Placed Cap
    // ------------------------------------------------------------
    // Empty string when the asset is not resident yet or carries no linework for
    // this view. There is no placeholder: unlike a finial, a cap is not something
    // the user chose and might be waiting to see, and a dashed stand-in on the
    // ridge line would read as a set-out fault rather than as a pending load.
    function VghLantern__Env2d__RidgeEndCapRenderer__PathData(placement, anchorPt2d, viewKey) {
        var PathRenderer  =  window.VghLantern__Env2d__ComponentPathRenderer;
        var Loader        =  window.VghLantern__AppData__RidgeSystemLoader;
        if (!PathRenderer || !Loader) return '';

        var variant  =  Loader.VghLantern__RidgeSystemLoader__EndCapVariant(placement.Role);
        if (!variant) return '';

        var assetData  =  Loader.VghLantern__RidgeSystemLoader__PeekComponentAsset(variant.AssetId);
        if (!assetData) {
            VghLantern__Env2d__RidgeEndCapRenderer__RequestAsset(placement.Role, variant.AssetId);
            return '';
        }

        var oriented  =  PathRenderer.VghLantern__ComponentPathRenderer__OrientedView(
            viewKey, placement.PlanRotationDegrees);
        if (!oriented) return '';

        var block  =  assetData[VghLantern__Env2d__RidgeEndCapRenderer__BlockKey(oriented.AssetViewKey)];
        var paths  =  block ? block[PATHS_KEY] : null;
        if (!Array.isArray(paths) || paths.length === 0) return '';

        return PathRenderer.VghLantern__ComponentPathRenderer__BuildPathData(
            paths, anchorPt2d, oriented.Orientation);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render an End Cap at Every Ridge End
    // ------------------------------------------------------------
    // Kept async for callers that already await the component layer renderers,
    // though it no longer awaits a fetch itself - see the module header.
    //
    // Two placements on a hipped ridge, one at the apex of a pyramid, none on a
    // Leaded Only ridge. The ridge type veto is asked of the same loader the 3D
    // builder asks, so the two views cannot show different ridges.
    async function VghLantern__Env2d__RidgeEndCapRenderer__Render(instance, skeleton, lantern) {
        if (!instance || !skeleton) return;

        var Geometry  =  window.VghLantern__Geometry__RidgeAssembly;
        var Loader    =  window.VghLantern__AppData__RidgeSystemLoader;
        if (!Geometry || !Loader) return;

        if (Loader.VghLantern__RidgeSystemLoader__AllowsEndCaps(lantern) === false) return;

        var config  =  VghLantern__Env2d__RidgeEndCapRenderer__ReadConfig();
        var isPlan  =  instance.ViewKey === 'plan';

        if (isPlan  && !config.ShowInPlan)      return;
        if (!isPlan && !config.ShowInElevation) return;

        var placements  =  Geometry.VghLantern__RidgeAssembly__EndCapPlacements(skeleton);
        if (placements.length === 0) return;

        var componentLayer  =  instance.GetLayer('components');
        if (!componentLayer) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var i, placement, anchorPt2d, pathData;

        for (i = 0; i < placements.length; i++) {
            placement   =  placements[i];
            anchorPt2d  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(placement.Point, instance.ViewKey);
            pathData    =  VghLantern__Env2d__RidgeEndCapRenderer__PathData(placement, anchorPt2d, instance.ViewKey);
            if (!pathData) continue;

            // One path element per cap however many primitives it holds, the same
            // way a finial is drawn: a 169 segment cap at two ridge ends is two
            // DOM nodes rather than three hundred and thirty eight.
            componentLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePath(
                pathData, CSS_END_CAP, {
                    'stroke-width'          : config.OutlineStrokeWidthMm,
                    'fill'                  : 'none',
                    'data-vgh-anchor-id'    : placement.Id,
                    'data-vgh-component-id' : (Loader.VghLantern__RidgeSystemLoader__EndCapVariant(placement.Role) || {}).AssetId || ''
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
        VghLantern__Env2d__RidgeEndCapRenderer__Render : VghLantern__Env2d__RidgeEndCapRenderer__Render
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__RidgeEndCapRenderer  =  VghLantern__Env2d__RidgeEndCapRenderer;
