/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | ELEVATION VIEW RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__ElevationViewRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - ElevationViewRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compose the front and side elevation views of a solved lantern
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Serves BOTH elevations from one module, because a front and a side elevation
     differ only in which world axis lies across the page - a fact the projector
     already encodes. Splitting them into two files would duplicate composition
     logic for no gain.
   - Elevations carry the height family of dimensions: overall height, builders upstand
     height, ridge rise and the pitch angle.
   - Hidden linework (members behind the cutting plane) is delegated to the
     skeleton renderer, which already separates its hidden layer.

   ============================================================================= */

// =============================================================================
// REGION | Elevation View Renderer Module
// =============================================================================

const VghLantern__Env2d__ElevationViewRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Supported View Keys
    // ------------------------------------------------------------
    const VIEW_FRONT  =  'frontElevation';                                   // <-- Reads across world X
    const VIEW_SIDE   =  'sideElevation';                                    // <-- Reads across world Y
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Composition
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test Whether a View Key Is an Elevation
    // ------------------------------------------------------------
    function VghLantern__Env2d__ElevationViewRenderer__IsElevation(viewKey) {
        return viewKey === VIEW_FRONT || viewKey === VIEW_SIDE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render an Elevation View into a Viewport Instance
    // ------------------------------------------------------------
    async function VghLantern__Env2d__ElevationViewRenderer__Render(instance, skeleton, barSet, lantern) {
        if (!instance) return false;
        if (!VghLantern__Env2d__ElevationViewRenderer__IsElevation(instance.ViewKey)) return false;

        var Skeleton   =  window.VghLantern__Env2d__SkeletonRenderer;
        var GlazeBars  =  window.VghLantern__Env2d__GlazeBarRenderer;
        var Profiles   =  window.VghLantern__Env2d__ProfileTraceRenderer;
        var Finials    =  window.VghLantern__Env2d__FinialRenderer;
        var Dimensions =  window.VghLantern__Env2d__DimensionRenderer;

        instance.ClearAllLayers();

        if (!skeleton) return false;

        if (Skeleton) {
            Skeleton.VghLantern__Env2d__SkeletonRenderer__RenderGrid(instance);
            Skeleton.VghLantern__Env2d__SkeletonRenderer__Render(instance, skeleton);
        }

        if (GlazeBars) {
            GlazeBars.VghLantern__Env2d__GlazeBarRenderer__RenderPaneFills(instance, skeleton);
            GlazeBars.VghLantern__Env2d__GlazeBarRenderer__Render(instance, barSet);
        }

        if (Profiles) await Profiles.VghLantern__Env2d__ProfileTraceRenderer__Render(instance, skeleton, barSet, lantern);
        if (Finials)  await Finials.VghLantern__Env2d__FinialRenderer__Render(instance, skeleton, lantern);

        if (Dimensions) Dimensions.VghLantern__Env2d__DimensionRenderer__Render(instance, skeleton, lantern);

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__ElevationViewRenderer__Render       : VghLantern__Env2d__ElevationViewRenderer__Render,
        VghLantern__Env2d__ElevationViewRenderer__IsElevation  : VghLantern__Env2d__ElevationViewRenderer__IsElevation,

        VGHLANTERN__ENV2D__VIEW_FRONT_ELEVATION  : VIEW_FRONT,
        VGHLANTERN__ENV2D__VIEW_SIDE_ELEVATION   : VIEW_SIDE
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ElevationViewRenderer  =  VghLantern__Env2d__ElevationViewRenderer;
