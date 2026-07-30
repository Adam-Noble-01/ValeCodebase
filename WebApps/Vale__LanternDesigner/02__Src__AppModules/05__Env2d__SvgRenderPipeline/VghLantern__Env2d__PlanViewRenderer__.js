/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | PLAN VIEW RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__PlanViewRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - PlanViewRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compose the plan view of a solved lantern
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Owns the plan view only. It decides WHICH layer renderers run and in what
     order; the individual renderers decide HOW each layer looks.
   - The plan is the primary sizing surface: it carries the width, depth, ridge
     length and eaves projection dimensions, all typed-editable.
   - Composition is deliberately declarative and short. Anything that grows
     complicated belongs in its own layer renderer, not here.

   ============================================================================= */

// =============================================================================
// REGION | Plan View Renderer Module
// =============================================================================

const VghLantern__Env2d__PlanViewRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Identity
    // ------------------------------------------------------------
    const VIEW_KEY  =  'plan';                                               // <-- Matches the projector and config key
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Composition
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Plan View into a Viewport Instance
    // ------------------------------------------------------------
    // The instance must already have been created for VIEW_KEY. Returns true
    // when geometry was drawn, so the caller can show an empty-state message.
    async function VghLantern__Env2d__PlanViewRenderer__Render(instance, skeleton, barSet, lantern) {
        if (!instance || instance.ViewKey !== VIEW_KEY) return false;

        var Grid       =  window.VghLantern__Env2d__SkeletonRenderer;
        var GlazeBars  =  window.VghLantern__Env2d__GlazeBarRenderer;
        var Profiles   =  window.VghLantern__Env2d__ProfileTraceRenderer;
        var Finials    =  window.VghLantern__Env2d__FinialRenderer;
        var Dimensions =  window.VghLantern__Env2d__DimensionRenderer;

        instance.ClearAllLayers();

        if (!skeleton) return false;

        // Order matters: fills sit under linework, dimensions over everything.
        if (Grid) {
            Grid.VghLantern__Env2d__SkeletonRenderer__RenderGrid(instance);
            Grid.VghLantern__Env2d__SkeletonRenderer__Render(instance, skeleton);
        }

        if (GlazeBars) {
            GlazeBars.VghLantern__Env2d__GlazeBarRenderer__RenderPaneFills(instance, skeleton);
            GlazeBars.VghLantern__Env2d__GlazeBarRenderer__Render(instance, barSet);
        }

        // Awaited because both fetch asset outlines from the data libraries.
        if (Profiles) await Profiles.VghLantern__Env2d__ProfileTraceRenderer__Render(instance, skeleton, barSet, lantern);
        if (Finials)  await Finials.VghLantern__Env2d__FinialRenderer__Render(instance, skeleton, lantern);

        if (Dimensions) Dimensions.VghLantern__Env2d__DimensionRenderer__Render(instance, skeleton, lantern);

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the View Key This Renderer Serves
    // ------------------------------------------------------------
    function VghLantern__Env2d__PlanViewRenderer__ViewKey() {
        return VIEW_KEY;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__PlanViewRenderer__Render   : VghLantern__Env2d__PlanViewRenderer__Render,
        VghLantern__Env2d__PlanViewRenderer__ViewKey  : VghLantern__Env2d__PlanViewRenderer__ViewKey
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__PlanViewRenderer  =  VghLantern__Env2d__PlanViewRenderer;
