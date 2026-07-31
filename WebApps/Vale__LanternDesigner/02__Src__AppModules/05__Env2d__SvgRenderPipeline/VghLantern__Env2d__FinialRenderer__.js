/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | FINIAL RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__FinialRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - FinialRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw finials, bases and cresting at their solved anchor points
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Places discrete components from 05__Data__LanternComponentLibrary onto the
     anchor points the SkeletonSolver publishes (ridge ends, or a single apex on
     a pyramid).
   - Uses the component's Na__Asset__Profile2D elevation outline when present.
     A component with no 2D profile falls back to a proportional placeholder, so
     a newly indexed 3D-only asset still shows where it sits.
   - This is the 2D half of the deliberate 2D/3D asset split: the same component
     JSON serves the gallery thumbnail and the elevation linework here, while the
     3D environment reads its mesh or GLB from the same file.

   ============================================================================= */

// =============================================================================
// REGION | Finial Renderer Module
// =============================================================================

const VghLantern__Env2d__FinialRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Placeholder Proportions
    // ------------------------------------------------------------
    const CSS_FINIAL           =  'VghLantern__Env2d__Finial';               // <-- Traced component outline
    const CSS_FINIAL_FALLBACK  =  'VghLantern__Env2d__Finial--placeholder';  // <-- Proportional placeholder
    const CSS_FINIAL_ANCHOR    =  'VghLantern__Env2d__FinialAnchor';         // <-- Plan-view anchor marker
    const PLAN_MARKER_FACTOR   =  0.5;                                       // <-- Plan marker radius as a share of width; a proportion, not a config value
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Finial Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__FinialRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var finialCfg     =  (env2d && env2d['VghLantern__Env2d__Config__Finials']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Finials';

        return {
            ShowInPlan            : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(finialCfg, 'ShowInPlan',      LABEL),
            ShowInElevation       : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(finialCfg, 'ShowInElevation', LABEL),
            FallbackHeightMm      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(finialCfg, 'FallbackHeightMm',     LABEL),
            FallbackWidthMm       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(finialCfg, 'FallbackWidthMm',      LABEL),
            OutlineStrokeWidthMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(finialCfg, 'OutlineStrokeWidthMm', LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Outline Placement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Map a Component Outline into View Space at an Anchor
    // ------------------------------------------------------------
    // A component's Profile2D outline is authored in its own local space with
    // x across and y up from its seating point. In elevation the local axes map
    // straight onto the view axes, remembering that SVG y runs downward.
    function VghLantern__Env2d__FinialRenderer__PlaceOutline(outlinePoints, anchorPt2d) {
        var placed  =  [];
        var i, localX, localY;

        for (i = 0; i < outlinePoints.length; i++) {
            localX  =  Number(outlinePoints[i].x) || 0;
            localY  =  Number(outlinePoints[i].y) || 0;
            placed.push({ x: anchorPt2d.x + localX, y: anchorPt2d.y - localY });
        }

        return placed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Proportional Placeholder Outline
    // ------------------------------------------------------------
    // A simple spike-and-ball silhouette. Reads as "a finial goes here" without
    // pretending to be a specific product.
    function VghLantern__Env2d__FinialRenderer__PlaceholderOutline(anchorPt2d, widthMm, heightMm) {
        var halfWidth  =  widthMm / 2;

        return [
            { x: anchorPt2d.x - halfWidth,       y: anchorPt2d.y },
            { x: anchorPt2d.x - halfWidth,       y: anchorPt2d.y - (heightMm * 0.18) },
            { x: anchorPt2d.x - (halfWidth * 0.55), y: anchorPt2d.y - (heightMm * 0.30) },
            { x: anchorPt2d.x - (halfWidth * 0.55), y: anchorPt2d.y - (heightMm * 0.62) },
            { x: anchorPt2d.x,                   y: anchorPt2d.y - heightMm },
            { x: anchorPt2d.x + (halfWidth * 0.55), y: anchorPt2d.y - (heightMm * 0.62) },
            { x: anchorPt2d.x + (halfWidth * 0.55), y: anchorPt2d.y - (heightMm * 0.30) },
            { x: anchorPt2d.x + halfWidth,       y: anchorPt2d.y - (heightMm * 0.18) },
            { x: anchorPt2d.x + halfWidth,       y: anchorPt2d.y }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anchor Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw One Finial in Elevation
    // ------------------------------------------------------------
    function VghLantern__Env2d__FinialRenderer__DrawElevationFinial(targetLayer, anchorPt2d, outlinePoints, config, anchorId) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        var hasOutline  =  outlinePoints && outlinePoints.length > 2;
        var placed      =  hasOutline
            ? VghLantern__Env2d__FinialRenderer__PlaceOutline(outlinePoints, anchorPt2d)
            : VghLantern__Env2d__FinialRenderer__PlaceholderOutline(anchorPt2d, config.FallbackWidthMm, config.FallbackHeightMm);

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape(
            placed,
            hasOutline ? CSS_FINIAL : (CSS_FINIAL + ' ' + CSS_FINIAL_FALLBACK),
            false,
            {
                'stroke-width'      : config.OutlineStrokeWidthMm,
                'data-vgh-anchor-id': anchorId
            }
        ));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Finial Anchor in Plan
    // ------------------------------------------------------------
    // In plan a finial is a small marker at the anchor rather than an outline,
    // matching how Vale annotate lantern plans.
    function VghLantern__Env2d__FinialRenderer__DrawPlanAnchor(targetLayer, anchorPt2d, config, anchorId) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var radius      =  config.FallbackWidthMm * PLAN_MARKER_FACTOR;

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateCircle(
            anchorPt2d, radius, CSS_FINIAL_ANCHOR, {
                'stroke-width'      : config.OutlineStrokeWidthMm,
                'data-vgh-anchor-id': anchorId
            }
        ));
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Finials at Every Solved Anchor
    // ------------------------------------------------------------
    // Async because the component outline is fetched on demand. The placeholder
    // draws immediately if the asset has no 2D profile.
    async function VghLantern__Env2d__FinialRenderer__Render(instance, skeleton, lantern) {
        if (!instance || !skeleton || !skeleton.FinialAnchors || !lantern) return;

        var finialsCfg  =  lantern['Lantern__Finials__Config'] || {};
        if (finialsCfg['Lantern__Finials__Config__Enabled'] !== true) return;

        var config  =  VghLantern__Env2d__FinialRenderer__ReadConfig();
        var viewKey =  instance.ViewKey;
        var isPlan  =  viewKey === 'plan';

        if (isPlan  && !config.ShowInPlan)      return;
        if (!isPlan && !config.ShowInElevation) return;

        var componentLayer  =  instance.GetLayer('components');
        if (!componentLayer) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var componentId   =  finialsCfg['Lantern__Finials__Config__FinialComponentId'] || '';

        var outlinePoints  =  null;
        if (!isPlan && componentId && window.VghLantern__AppData__ComponentIndexLoader) {
            outlinePoints  =  await window.VghLantern__AppData__ComponentIndexLoader
                .VghLantern__ComponentIndexLoader__GetOutlinePoints(componentId);
        }

        var i, anchor, anchorPt2d;
        for (i = 0; i < skeleton.FinialAnchors.length; i++) {
            anchor      =  skeleton.FinialAnchors[i];
            anchorPt2d  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(anchor.Position, viewKey);

            if (isPlan) {
                VghLantern__Env2d__FinialRenderer__DrawPlanAnchor(componentLayer, anchorPt2d, config, anchor.Id);
            } else {
                VghLantern__Env2d__FinialRenderer__DrawElevationFinial(componentLayer, anchorPt2d, outlinePoints, config, anchor.Id);
            }
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
        VghLantern__Env2d__FinialRenderer__Render               : VghLantern__Env2d__FinialRenderer__Render,
        VghLantern__Env2d__FinialRenderer__PlaceholderOutline   : VghLantern__Env2d__FinialRenderer__PlaceholderOutline
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__FinialRenderer  =  VghLantern__Env2d__FinialRenderer;
