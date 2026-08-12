/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | FINIAL RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__FinialRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - FinialRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw finials at their solved anchor points
   CREATED    : 30-Jul-2026
   UPDATED    : 05-Aug-2026 - unified component schema, real linework in all views

   DESCRIPTION:
   - Places discrete components from 05__Data__LanternComponentLibrary onto the
     anchor points the SkeletonSolver publishes: the two ridge ends on a hipped
     or gabled roof, or the single apex on a pyramid.
   - Every asset is authored about its origin point in SketchUp, so placing a
     component is simply putting its local 0,0 on the anchor. There is no
     per-asset offset table and nothing to keep in step by hand.
   - Draws the component's real exported linework:
       elevation views  Na__Asset__Elevation2D__Front / __Right
       plan view        Na__Asset__Plan2D__Top
     An asset that predates the unified export falls back to its Profile2D
     outline, and an asset with neither falls back to a proportional
     placeholder, so a newly indexed 3D-only part still shows where it sits.

   ---------------------------------------------------------------------------

   WHY THE DRAW IS SYNCHRONOUS AND THE LOAD IS NOT:
   Component assets are one to three megabytes and load on demand, so the first
   render after a selection change usually has no geometry to draw yet. Rather
   than make the whole 2D pipeline await a fetch, this renderer draws whatever
   is resident, kicks off the load for whatever is not, and asks the pipeline to
   redraw when the asset lands. The user sees a placeholder for one frame
   instead of a stalled viewport.

   ============================================================================= */

// =============================================================================
// REGION | Finial Renderer Module
// =============================================================================

const VghLantern__Env2d__FinialRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Placeholder Proportions
    // ------------------------------------------------------------
    const CSS_FINIAL           =  'VghLantern__Env2d__Finial';               // <-- Traced component linework
    const CSS_FINIAL_FALLBACK  =  'VghLantern__Env2d__Finial--placeholder';  // <-- Proportional placeholder
    const CSS_FINIAL_ANCHOR    =  'VghLantern__Env2d__FinialAnchor';         // <-- Plan-view anchor marker
    const PLAN_MARKER_FACTOR   =  0.5;                                       // <-- Plan marker radius as a share of width; a proportion, not a config value
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Anchor Roles Published by the Skeleton Solver
    // ------------------------------------------------------------
    // The solver names anchors by WHERE they are on the roof; the lantern names
    // components by WHAT goes there. This is the join between the two.
    const ANCHOR_ROLE_APEX       =  'apex';

    const FINIALS_BLOCK          =  'Lantern__Finials__Config';
    const FIELD_ENABLED          =  'Lantern__Finials__Config__Enabled';
    const FIELD_COMPONENT_ID     =  'Lantern__Finials__Config__FinialComponentId';
    const FIELD_AT_APEX          =  'Lantern__Finials__Config__PlaceAtApex';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Asset Requests
    // ------------------------------------------------------------
    // Guards against a load-triggered redraw requesting the same asset again
    // and again while its fetch is still in flight.
    let VghLantern__Env2d__FinialRenderer__Requested  =  new Set();
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
// REGION | Anchor Filtering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Finial Belongs at This Anchor
    // ------------------------------------------------------------
    // Place at Apex is a user choice and defaults off, so a pyramid takes a
    // finial only when it has been asked for. Every other anchor - the two ridge
    // ends - takes one as soon as finials are fitted at all, which is what Fit
    // Finials already said.
    function VghLantern__Env2d__FinialRenderer__AnchorWanted(anchor, finialsCfg) {
        if (!anchor) return false;

        if (anchor.Role === ANCHOR_ROLE_APEX) return finialsCfg[FIELD_AT_APEX] !== false;

        return true;                                                         // <-- Ridge ends, and any unfamiliar role, still get drawn
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Request an Asset and Redraw When It Lands
    // ------------------------------------------------------------
    function VghLantern__Env2d__FinialRenderer__RequestAsset(componentId) {
        if (!componentId) return;
        if (VghLantern__Env2d__FinialRenderer__Requested.has(componentId)) return;

        var ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        if (!ComponentLoader) return;

        VghLantern__Env2d__FinialRenderer__Requested.add(componentId);

        ComponentLoader.VghLantern__ComponentIndexLoader__LoadAsset(componentId).then(function(assetData) {
            VghLantern__Env2d__FinialRenderer__Requested.delete(componentId);
            if (!assetData) return;

            // The editor's viewport host owns both 2D surfaces and knows how to
            // redraw them from current state, so the redraw is asked for there
            // rather than by reaching back into the pipeline with a surface this
            // renderer does not have.
            var ViewportHost  =  window.VghLantern__LanternEditor__ViewportHost__2d;
            if (ViewportHost && typeof ViewportHost.VghLantern__ViewportHost2d__Redraw === 'function') {
                ViewportHost.VghLantern__ViewportHost2d__Redraw();
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the SVG Path Data for a Component at an Anchor
    // ------------------------------------------------------------
    // Returns { PathData, IsPlaceholder }. Reads only what is already resident;
    // a missing asset triggers a background load and draws the placeholder for
    // this frame.
    function VghLantern__Env2d__FinialRenderer__ResolvePathData(componentId, anchorPt2d, viewKey, config) {
        var PathRenderer     =  window.VghLantern__Env2d__ComponentPathRenderer;
        var ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;

        if (!componentId || !PathRenderer || !ComponentLoader) {
            return {
                PathData      : VghLantern__Env2d__FinialRenderer__PlaceholderPathData(anchorPt2d, config),
                IsPlaceholder : true
            };
        }

        var assetData  =  ComponentLoader.VghLantern__ComponentIndexLoader__PeekAsset(componentId);
        if (!assetData) {
            VghLantern__Env2d__FinialRenderer__RequestAsset(componentId);
            return {
                PathData      : VghLantern__Env2d__FinialRenderer__PlaceholderPathData(anchorPt2d, config),
                IsPlaceholder : true
            };
        }

        // Unified schema: the exported drawing linework for this view
        var assetViewKey  =  PathRenderer.VghLantern__ComponentPathRenderer__AssetViewKey(viewKey);
        var blockKey      =  (assetViewKey === 'plan')  ? 'Na__Asset__Plan2D__Top'
                          :  (assetViewKey === 'right') ? 'Na__Asset__Elevation2D__Right'
                          :                               'Na__Asset__Elevation2D__Front';

        var block  =  assetData[blockKey];
        if (block && Array.isArray(block['Na__Geometry__Paths']) && block['Na__Geometry__Paths'].length > 0) {
            return {
                PathData      : PathRenderer.VghLantern__ComponentPathRenderer__BuildPathData(block['Na__Geometry__Paths'], anchorPt2d),
                IsPlaceholder : false
            };
        }

        // Legacy schema: one closed outline, only meaningful in elevation
        var profile2d  =  assetData['Na__Asset__Profile2D'];
        var points     =  profile2d && profile2d['Na__Asset__Profile2D__Points'];
        if (Array.isArray(points) && points.length > 2 && assetViewKey !== 'plan') {
            return {
                PathData      : PathRenderer.VghLantern__ComponentPathRenderer__BuildOutlinePathData(points, anchorPt2d),
                IsPlaceholder : false
            };
        }

        return {
            PathData      : VghLantern__Env2d__FinialRenderer__PlaceholderPathData(anchorPt2d, config),
            IsPlaceholder : true
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Proportional Placeholder Outline
    // ------------------------------------------------------------
    // A simple spike-and-ball silhouette. Reads as "a finial goes here" without
    // pretending to be a specific product.
    function VghLantern__Env2d__FinialRenderer__PlaceholderOutline(anchorPt2d, widthMm, heightMm) {
        var halfWidth  =  widthMm / 2;

        return [
            { x: anchorPt2d.x - halfWidth,             y: anchorPt2d.y },
            { x: anchorPt2d.x - halfWidth,             y: anchorPt2d.y - (heightMm * 0.18) },
            { x: anchorPt2d.x - (halfWidth * 0.55),    y: anchorPt2d.y - (heightMm * 0.30) },
            { x: anchorPt2d.x - (halfWidth * 0.55),    y: anchorPt2d.y - (heightMm * 0.62) },
            { x: anchorPt2d.x,                         y: anchorPt2d.y - heightMm },
            { x: anchorPt2d.x + (halfWidth * 0.55),    y: anchorPt2d.y - (heightMm * 0.62) },
            { x: anchorPt2d.x + (halfWidth * 0.55),    y: anchorPt2d.y - (heightMm * 0.30) },
            { x: anchorPt2d.x + halfWidth,             y: anchorPt2d.y - (heightMm * 0.18) },
            { x: anchorPt2d.x + halfWidth,             y: anchorPt2d.y }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Placeholder Outline as SVG Path Data
    // ------------------------------------------------------------
    function VghLantern__Env2d__FinialRenderer__PlaceholderPathData(anchorPt2d, config) {
        var points  =  VghLantern__Env2d__FinialRenderer__PlaceholderOutline(
            anchorPt2d, config.FallbackWidthMm, config.FallbackHeightMm);

        var out  =  '';
        for (var i = 0; i < points.length; i++) {
            out  +=  (i === 0 ? 'M' : 'L') + points[i].x.toFixed(3) + ' ' + points[i].y.toFixed(3);
        }
        return out + 'Z';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anchor Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw One Resolved Component at an Anchor
    // ------------------------------------------------------------
    // One path element per component regardless of how many primitives it holds,
    // so a 157-segment spire at two ridge ends costs two DOM nodes.
    function VghLantern__Env2d__FinialRenderer__DrawComponent(targetLayer, resolved, componentId, config, anchorId) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        if (!resolved || !resolved.PathData) return;

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePath(
            resolved.PathData,
            resolved.IsPlaceholder ? (CSS_FINIAL + ' ' + CSS_FINIAL_FALLBACK) : CSS_FINIAL,
            {
                'stroke-width'          : config.OutlineStrokeWidthMm,
                'fill'                  : 'none',
                'data-vgh-anchor-id'    : anchorId,
                'data-vgh-component-id' : componentId || ''
            }
        ));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Finial Anchor Marker in Plan
    // ------------------------------------------------------------
    // Used only when the component has no plan linework of its own.
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
    // Kept async for callers that already await it, but it no longer awaits a
    // fetch itself - see the module header for why.
    async function VghLantern__Env2d__FinialRenderer__Render(instance, skeleton, lantern) {
        if (!instance || !skeleton || !skeleton.FinialAnchors || !lantern) return;

        var finialsCfg  =  lantern[FINIALS_BLOCK] || {};
        if (finialsCfg[FIELD_ENABLED] !== true) return;

        var config  =  VghLantern__Env2d__FinialRenderer__ReadConfig();
        var viewKey =  instance.ViewKey;
        var isPlan  =  viewKey === 'plan';

        if (isPlan  && !config.ShowInPlan)      return;
        if (!isPlan && !config.ShowInElevation) return;

        var componentLayer  =  instance.GetLayer('components');
        if (!componentLayer) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var componentId   =  finialsCfg[FIELD_COMPONENT_ID] || '';

        for (var i = 0; i < skeleton.FinialAnchors.length; i++) {
            var anchor  =  skeleton.FinialAnchors[i];
            if (!VghLantern__Env2d__FinialRenderer__AnchorWanted(anchor, finialsCfg)) continue;

            var anchorPt2d  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(anchor.Position, viewKey);
            var resolved    =  VghLantern__Env2d__FinialRenderer__ResolvePathData(componentId, anchorPt2d, viewKey, config);

            // In plan, a component with no plan linework of its own reads better
            // as a small seating marker than as an elevation spike drawn flat,
            // which is how Vale annotate lantern plans anyway.
            if (isPlan && resolved.IsPlaceholder) {
                VghLantern__Env2d__FinialRenderer__DrawPlanAnchor(componentLayer, anchorPt2d, config, anchor.Id);
                continue;
            }

            VghLantern__Env2d__FinialRenderer__DrawComponent(
                componentLayer, resolved, componentId, config, anchor.Id);
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
