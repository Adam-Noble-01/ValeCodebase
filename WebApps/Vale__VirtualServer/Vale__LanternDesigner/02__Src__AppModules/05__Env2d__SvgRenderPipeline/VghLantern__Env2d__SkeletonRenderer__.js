/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | SKELETON RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__SkeletonRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - SkeletonRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw solved skeleton members and the construction grid
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Draws the skeletal construction lines that are the backbone of every 2D
     view: builders upstand, builders upstand posts, the base frame, eaves, ridge and hips.
   - Members behind the viewing plane are drawn dashed into the hidden layer so
     an elevation reads correctly without a full hidden-line solver.
   - Also owns the construction grid, because the grid exists to measure the
     skeleton against and shares its millimetre space.
   - Reads geometry only from the supplied SolvedSkeleton. It never solves.

   ROLE TO CSS CLASS MAP:
       builders upstand        VghLantern__Env2d__Member--buildersUpstand
       buildersUpstandPost    VghLantern__Env2d__Member--buildersUpstandPost
       buildersUpstandReveal  VghLantern__Env2d__Member--buildersUpstandReveal
       frame       VghLantern__Env2d__Member--frame
       eaves       VghLantern__Env2d__Member--eaves
       ridge       VghLantern__Env2d__Member--ridge
       hip         VghLantern__Env2d__Member--hip
       verge       VghLantern__Env2d__Member--verge

   THE KERB REVEAL:
   'buildersUpstandReveal' members trace the inner face of the upstand - the hole the
   daylight comes down. They are an annotation rather than a section, so they are
   always drawn dashed and are never treated as hidden linework.

   The two views want different things from that same line:

       PLAN       It is the setting-out line the builder cuts to, nothing sits
                  over it, and it runs the full length of the lantern. Annotation
                  red, coarse dash, drawn in the geometry layer.
       ELEVATION  It is a concealed edge behind a solid upstand, it runs only the
                  base assembly height, and red would read as a dimension that is
                  not there. Mid grey, a quarter-length dash so the run still
                  reads as dashed, and drawn into the hidden layer so the lantern
                  linework passes over the top of it.

   Both the colour and the dash come from named config and token values, so the
   split is one class and one config key apart - not a hardcoded view test.

   ============================================================================= */

// =============================================================================
// REGION | Skeleton Renderer Module
// =============================================================================

const VghLantern__Env2d__SkeletonRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Stroke Width Fallbacks
    // ------------------------------------------------------------
    const CSS_MEMBER_BASE      =  'VghLantern__Env2d__Member';               // <-- Base class on every member line
    const CSS_MEMBER_PREFIX    =  'VghLantern__Env2d__Member--';             // <-- Role modifier prefix
    const CSS_MEMBER_HIDDEN    =  'VghLantern__Env2d__Member--hidden';       // <-- Behind the viewing plane
    const CSS_MEMBER_REVEAL_ELEVATION  =  'VghLantern__Env2d__Member--buildersUpstandRevealElevation'; // <-- Reveal seen in elevation, not in plan
    const CSS_NODE_MARKER      =  'VghLantern__Env2d__NodeMarker';           // <-- Optional joint marker
    const ROLE_BUILDERS_UPSTAND_REVEAL     =  'buildersUpstandReveal';                              // <-- Inner face of the upstand
    const VIEW_KEY_PLAN        =  'plan';                                    // <-- The one view that is not an elevation
    const CSS_GRID_MINOR       =  'VghLantern__Env2d__Grid--minor';
    const CSS_GRID_MAJOR       =  'VghLantern__Env2d__Grid--major';
    const CSS_GRID_AXIS        =  'VghLantern__Env2d__Grid--axis';
    const MAX_GRID_LINES_PER_AXIS    =  400;                                 // <-- Guards against a runaway grid at wide zoom; not a design value, a safety cap
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Skeleton Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;

        return {
            Skeleton : (env2d && env2d['VghLantern__Env2d__Config__Skeleton']) || {},
            Grid     : (env2d && env2d['VghLantern__Env2d__Config__Grid'])     || {}
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stroke Width in Millimetres for a Member Role
    // ------------------------------------------------------------
    // Every role maps onto a named key that Na__Env2d__Config.json always
    // defines - no per-role or generic hardcoded width lives in JS, so a
    // missing key surfaces as a loud console error rather than a plausible
    // guessed line weight.
    function VghLantern__Env2d__SkeletonRenderer__StrokeWidthForRole(skeletonCfg, roleKey) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var configKey  =  {
            buildersUpstand : 'BuildersUpstandStrokeWidthMm',
            buildersUpstandPost   : 'BuildersUpstandStrokeWidthMm',
            buildersUpstandReveal : 'BuildersUpstandRevealStrokeWidthMm',
            frame      : 'FrameStrokeWidthMm',
            eaves      : 'EavesStrokeWidthMm',
            ridge      : 'RidgeStrokeWidthMm',
            hip        : 'HipStrokeWidthMm',
            verge      : 'HipStrokeWidthMm'
        }[roleKey] || 'MemberStrokeWidthMm';

        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            skeletonCfg, configKey, 'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Skeleton');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Whether a View Reads Across a Vertical Plane
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__IsElevationView(viewKey) {
        return viewKey !== VIEW_KEY_PLAN;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Whether a Member Is Drawn Beneath the Geometry Layer
    // ------------------------------------------------------------
    // The reveal earns its red in plan, where it is the setting-out line the
    // builder cuts to and nothing overlaps it. In elevation it is the far side
    // of a hole seen through a solid upstand, so it belongs under the linework
    // rather than over it. Dropping it into the hidden layer is what puts it
    // there - it is NOT given the hidden member class, because it is an
    // annotation and must not be faded on top of being underlaid.
    function VghLantern__Env2d__SkeletonRenderer__IsUnderlaid(member, viewKey) {
        return member.Role === ROLE_BUILDERS_UPSTAND_REVEAL
            && VghLantern__Env2d__SkeletonRenderer__IsElevationView(viewKey);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Whether a Member Sits Behind the Viewing Plane
    // ------------------------------------------------------------
    // Plan views have no hidden members. In elevation, anything on the far half
    // of the viewer axis is treated as hidden - accurate enough for a whitecard
    // wireframe where members do not cross mid-span.
    function VghLantern__Env2d__SkeletonRenderer__IsHidden(member, viewKey) {
        if (!VghLantern__Env2d__SkeletonRenderer__IsElevationView(viewKey)) return false;
        if (member.Role === ROLE_BUILDERS_UPSTAND_REVEAL) return false;                  // <-- Already an annotation; never fade it further

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var depth         =  CoordHelpers.VghLantern__Env2d__CoordHelpers__MemberDepth(member, viewKey);
        return depth < 0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Skeleton Member into a Layer
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__DrawMember(targetLayer, member, viewKey, skeletonCfg, isHidden) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var startPt  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(member.Start, viewKey);
        var endPt    =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(member.End, viewKey);

        var cssClass  =  CSS_MEMBER_BASE + ' ' + CSS_MEMBER_PREFIX + member.Role;
        if (isHidden) cssClass  +=  ' ' + CSS_MEMBER_HIDDEN;

        var attrs  =  {
            'stroke-width'        : VghLantern__Env2d__SkeletonRenderer__StrokeWidthForRole(skeletonCfg, member.Role),
            'data-vgh-member-id'  : member.Id,
            'data-vgh-role'       : member.Role
        };
        if (member.Role === ROLE_BUILDERS_UPSTAND_REVEAL) {
            // An elevation only ever shows the reveal over the base assembly
            // height, so it takes the finer pattern - the plan dash would leave
            // barely one stroke across that run and stop reading as dashed.
            var inElevation  =  VghLantern__Env2d__SkeletonRenderer__IsElevationView(viewKey);
            if (inElevation) cssClass  +=  ' ' + CSS_MEMBER_REVEAL_ELEVATION;

            attrs['stroke-dasharray']  =  window.VghLantern__AppCore__ConfigLoader.VghLantern__ConfigLoader__RequireString(
                skeletonCfg,
                inElevation ? 'BuildersUpstandRevealDashPatternElevationMm' : 'BuildersUpstandRevealDashPatternMm',
                'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Skeleton');
        } else if (isHidden && skeletonCfg.HiddenDashPatternMm) {
            attrs['stroke-dasharray']  =  skeletonCfg.HiddenDashPatternMm;
        }

        targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(startPt, endPt, cssClass, attrs));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw Joint Markers at Member Ends
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__DrawNodeMarkers(targetLayer, skeleton, viewKey, skeletonCfg) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var radius        =  window.VghLantern__AppCore__ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            skeletonCfg, 'NodeMarkerRadiusMm', 'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Skeleton');

        var seen  =  {};
        var i, ends, e, pt, key;

        for (i = 0; i < skeleton.Members.length; i++) {
            ends  =  [skeleton.Members[i].Start, skeleton.Members[i].End];
            for (e = 0; e < 2; e++) {
                pt   =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(ends[e], viewKey);
                key  =  Math.round(pt.x) + ':' + Math.round(pt.y);
                if (seen[key]) continue;                                     // <-- One marker per coincident projected node
                seen[key]  =  true;
                targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateCircle(pt, radius, CSS_NODE_MARKER, null));
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render All Skeleton Members for a View
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__Render(instance, skeleton) {
        if (!instance || !skeleton || !skeleton.Members) return;

        var config        =  VghLantern__Env2d__SkeletonRenderer__ReadConfig();
        var viewKey       =  instance.ViewKey;
        var geometryLayer =  instance.GetLayer('geometry');
        var hiddenLayer   =  instance.GetLayer('hidden');
        if (!geometryLayer || !hiddenLayer) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        // Draw back to front so nearer members overlay farther ones.
        var ordered  =  skeleton.Members.slice().sort(function(a, b) {
            return CoordHelpers.VghLantern__Env2d__CoordHelpers__MemberDepth(a, viewKey)
                 - CoordHelpers.VghLantern__Env2d__CoordHelpers__MemberDepth(b, viewKey);
        });

        var i, isHidden, isUnderlaid;
        for (i = 0; i < ordered.length; i++) {
            isHidden     =  VghLantern__Env2d__SkeletonRenderer__IsHidden(ordered[i], viewKey);
            isUnderlaid  =  VghLantern__Env2d__SkeletonRenderer__IsUnderlaid(ordered[i], viewKey);
            VghLantern__Env2d__SkeletonRenderer__DrawMember(
                (isHidden || isUnderlaid) ? hiddenLayer : geometryLayer,
                ordered[i], viewKey, config.Skeleton, isHidden
            );
        }

        if (config.Skeleton.ShowNodeMarkers === true) {
            VghLantern__Env2d__SkeletonRenderer__DrawNodeMarkers(geometryLayer, skeleton, viewKey, config.Skeleton);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction Grid
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw One Family of Grid Lines
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__DrawGridFamily(targetLayer, extents, spacingMm, strokeWidthMm, cssClass) {
        if (spacingMm <= 0) return;

        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        var countX  =  Math.ceil(extents.Width  / spacingMm);
        var countY  =  Math.ceil(extents.Height / spacingMm);
        if (countX > MAX_GRID_LINES_PER_AXIS || countY > MAX_GRID_LINES_PER_AXIS) return;

        var startX  =  Math.floor(extents.MinX / spacingMm) * spacingMm;
        var startY  =  Math.floor(extents.MinY / spacingMm) * spacingMm;
        var attrs   =  { 'stroke-width': strokeWidthMm };
        var x, y;

        for (x = startX; x <= extents.MaxX; x += spacingMm) {
            targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                { x: x, y: extents.MinY }, { x: x, y: extents.MaxY }, cssClass, attrs));
        }
        for (y = startY; y <= extents.MaxY; y += spacingMm) {
            targetLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                { x: extents.MinX, y: y }, { x: extents.MaxX, y: y }, cssClass, attrs));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Construction Grid Across the Current ViewBox
    // ------------------------------------------------------------
    function VghLantern__Env2d__SkeletonRenderer__RenderGrid(instance) {
        if (!instance) return;

        var config    =  VghLantern__Env2d__SkeletonRenderer__ReadConfig();
        var gridCfg   =  config.Grid;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var GRID_LABEL    =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Grid';
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(gridCfg, 'Enabled', GRID_LABEL)) return;

        var gridLayer  =  instance.GetLayer('grid');
        if (!gridLayer) return;

        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var box           =  instance.GetViewBox();
        var zoomScale     =  instance.GetZoomScale();

        var minorSpacing  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'MinorSpacingMm', GRID_LABEL);
        var majorSpacing  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'MajorSpacingMm', GRID_LABEL);
        var hideMinorAt   =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'HideMinorBelowZoomScale', GRID_LABEL);

        if (zoomScale >= hideMinorAt) {
            VghLantern__Env2d__SkeletonRenderer__DrawGridFamily(
                gridLayer, box, minorSpacing,
                ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'MinorStrokeWidthMm', GRID_LABEL),
                CSS_GRID_MINOR
            );
        }

        VghLantern__Env2d__SkeletonRenderer__DrawGridFamily(
            gridLayer, box, majorSpacing,
            ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'MajorStrokeWidthMm', GRID_LABEL),
            CSS_GRID_MAJOR
        );

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(gridCfg, 'ShowOriginAxes', GRID_LABEL)) {
            gridLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                { x: box.MinX, y: 0 }, { x: box.MaxX, y: 0 }, CSS_GRID_AXIS, { 'stroke-width': 1.4 }));
            gridLayer.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                { x: 0, y: box.MinY }, { x: 0, y: box.MaxY }, CSS_GRID_AXIS, { 'stroke-width': 1.4 }));
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
        VghLantern__Env2d__SkeletonRenderer__Render      : VghLantern__Env2d__SkeletonRenderer__Render,
        VghLantern__Env2d__SkeletonRenderer__RenderGrid  : VghLantern__Env2d__SkeletonRenderer__RenderGrid
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__SkeletonRenderer  =  VghLantern__Env2d__SkeletonRenderer;
