/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | PROFILE TRACE RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__ProfileTraceRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - ProfileTraceRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Trace swept section profiles along skeleton members in 2D
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Upgrades a member from a single centreline to a real sectional band, so an
     elevation shows the actual width of a glazing bar, ridge or hip rather than
     a schematic line.
   - Profiles come from 06__Data__LanternProfileLibrary via ProfileIndexLoader
     using the same Na__Asset__Profile2D schema the SketchUp ProfilePathTracer
     exports, so a section drawn in SketchUp needs no conversion.
   - Off by default. The editor uses centrelines for responsiveness; the drawing
     editor turns tracing on for issued output.

   ---------------------------------------------------------------------------

   TWO LEVELS OF FIDELITY:
   1. BAND TRACE (implemented) - the profile's overall width is offset either
      side of the member centreline to give a true-width band with end caps.
      Correct for the rectangular and near-rectangular sections that make up
      most of a Vale lantern, and cheap enough to redraw live.
   2. FULL SILHOUETTE (TODO, next implementation pass) - sweep every vertex of
      the Profile2D outline along the member and emit the outer silhouette plus
      internal moulding lines. Needed for decorative ridge and eaves sections.
      Hook: VghLantern__Env2d__ProfileTraceRenderer__TraceFullSilhouette.

   ============================================================================= */

// =============================================================================
// REGION | Profile Trace Renderer Module
// =============================================================================

const VghLantern__Env2d__ProfileTraceRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Trace Limits
    // ------------------------------------------------------------
    const CSS_TRACE_BAND    =  'VghLantern__Env2d__ProfileTrace';            // <-- Traced section band outline
    const CSS_TRACE_CAP     =  'VghLantern__Env2d__ProfileTrace--cap';       // <-- End cap across the band
    const MIN_TRACEABLE_WIDTH_MM   =  2;                                     // <-- Below this a band is not worth drawing; a rendering threshold, not a config value
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Profile Trace Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__ProfileTraceRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var traceCfg      =  (env2d && env2d['VghLantern__Env2d__Config__ProfileTrace']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__ProfileTrace';

        return {
            Enabled             : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(traceCfg, 'Enabled', LABEL),
            TraceStrokeWidthMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(traceCfg, 'TraceStrokeWidthMm', LABEL),
            MaxTracedMembers    : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(traceCfg, 'MaxTracedMembers',   LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Profile Width Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Overall Width of a Profile Outline in Millimetres
    // ------------------------------------------------------------
    // The Profile2D outline is a list of { x, y } section points in millimetres.
    // Its x extent is the width the section presents in elevation.
    function VghLantern__Env2d__ProfileTraceRenderer__OutlineWidthMm(outlinePoints) {
        if (!outlinePoints || !outlinePoints.length) return 0;

        var minX  =  Infinity;
        var maxX  =  -Infinity;
        var i, x;

        for (i = 0; i < outlinePoints.length; i++) {
            x  =  Number(outlinePoints[i].x);
            if (isNaN(x)) continue;
            if (x < minX) minX  =  x;
            if (x > maxX) maxX  =  x;
        }

        if (minX === Infinity) return 0;
        return maxX - minX;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Profile Id Assigned to a Member Role
    // ------------------------------------------------------------
    // The role-to-config-field mapping lives in the data layer so the 3D sweep
    // builder resolves through exactly the same table.
    function VghLantern__Env2d__ProfileTraceRenderer__ProfileIdForRole(lantern, roleKey) {
        var ProfileLoader  =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!ProfileLoader) return '';

        return ProfileLoader.VghLantern__ProfileIndexLoader__ProfileIdForRole(lantern, roleKey);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Band Tracing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw a True-Width Band Along One Projected Segment
    // ------------------------------------------------------------
    function VghLantern__Env2d__ProfileTraceRenderer__DrawBand(targetLayer, startPt, endPt, widthMm, config, dataId) {
        if (widthMm < MIN_TRACEABLE_WIDTH_MM) return;

        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var normal    =  CoordHelpers.VghLantern__Env2d__CoordHelpers__UnitNormal2d(startPt, endPt);
        var halfWidth =  widthMm / 2;

        var a  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__OffsetPoint2d(startPt, normal,  halfWidth);
        var b  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__OffsetPoint2d(endPt,   normal,  halfWidth);
        var c  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__OffsetPoint2d(endPt,   normal, -halfWidth);
        var d  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__OffsetPoint2d(startPt, normal, -halfWidth);

        var attrs  =  {
            'stroke-width'     : config.TraceStrokeWidthMm,
            'data-vgh-trace-id': dataId
        };

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape([a, b], CSS_TRACE_BAND, false, attrs));
        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape([d, c], CSS_TRACE_BAND, false, attrs));
        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape([a, d], CSS_TRACE_CAP,  false, attrs));
        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape([b, c], CSS_TRACE_CAP,  false, attrs));
    }
    // ------------------------------------------------------------


    // FUNCTION | Trace Section Bands Along Skeleton Members and Glazing Bars
    // ------------------------------------------------------------
    // Async because profile outlines are fetched on demand from the profile
    // library. Callers may ignore the returned promise; the trace simply appears
    // once the outlines resolve.
    async function VghLantern__Env2d__ProfileTraceRenderer__Render(instance, skeleton, barSet, lantern) {
        var config  =  VghLantern__Env2d__ProfileTraceRenderer__ReadConfig();
        if (!config.Enabled || !instance || !skeleton) return;

        var ProfileIndexLoader  =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!ProfileIndexLoader) return;

        var traceLayer  =  instance.GetLayer('geometry');
        if (!traceLayer) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var viewKey       =  instance.ViewKey;

        var traceables  =  (skeleton.Members || []).concat((barSet && barSet.Bars) || []);
        if (traceables.length > config.MaxTracedMembers) {
            traceables  =  traceables.slice(0, config.MaxTracedMembers);
        }

        var widthCache  =  {};                                               // <-- One fetch per profile id per render
        var i, item, profileId, widthMm, outline, startPt, endPt;

        for (i = 0; i < traceables.length; i++) {
            item       =  traceables[i];
            profileId  =  VghLantern__Env2d__ProfileTraceRenderer__ProfileIdForRole(lantern, item.Role);
            if (!profileId) continue;

            if (widthCache[profileId] === undefined) {
                outline                 =  await ProfileIndexLoader.VghLantern__ProfileIndexLoader__GetOutlinePoints(profileId);
                widthCache[profileId]   =  VghLantern__Env2d__ProfileTraceRenderer__OutlineWidthMm(outline);
            }
            widthMm  =  widthCache[profileId];
            if (!widthMm) continue;

            startPt  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(item.Start, viewKey);
            endPt    =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(item.End, viewKey);

            VghLantern__Env2d__ProfileTraceRenderer__DrawBand(traceLayer, startPt, endPt, widthMm, config, item.Id);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Full Silhouette Sweep - Not Yet Implemented
    // ------------------------------------------------------------
    // Reserved hook for fidelity level 2 described in the file header. Returns
    // false so a caller can fall back to band tracing without branching on
    // module availability.
    function VghLantern__Env2d__ProfileTraceRenderer__TraceFullSilhouette() {
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__ProfileTraceRenderer__Render               : VghLantern__Env2d__ProfileTraceRenderer__Render,
        VghLantern__Env2d__ProfileTraceRenderer__OutlineWidthMm       : VghLantern__Env2d__ProfileTraceRenderer__OutlineWidthMm,
        VghLantern__Env2d__ProfileTraceRenderer__ProfileIdForRole     : VghLantern__Env2d__ProfileTraceRenderer__ProfileIdForRole,
        VghLantern__Env2d__ProfileTraceRenderer__TraceFullSilhouette  : VghLantern__Env2d__ProfileTraceRenderer__TraceFullSilhouette
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ProfileTraceRenderer  =  VghLantern__Env2d__ProfileTraceRenderer;
