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
     view: kerb, kerb posts, the base frame, eaves, ridge and hips.
   - Members behind the viewing plane are drawn dashed into the hidden layer so
     an elevation reads correctly without a full hidden-line solver.
   - Also owns the construction grid, because the grid exists to measure the
     skeleton against and shares its millimetre space.
   - Reads geometry only from the supplied SolvedSkeleton. It never solves.

   ROLE TO CSS CLASS MAP:
       kerb        VghLantern__Env2d__Member--kerb
       kerbPost    VghLantern__Env2d__Member--kerbPost
       kerbReveal  VghLantern__Env2d__Member--kerbReveal
       frame       VghLantern__Env2d__Member--frame
       framePost   VghLantern__Env2d__Member--framePost
       eaves       VghLantern__Env2d__Member--eaves
       ridge       VghLantern__Env2d__Member--ridge
       hip         VghLantern__Env2d__Member--hip
       verge       VghLantern__Env2d__Member--verge

   THE KERB REVEAL:
   'kerbReveal' members trace the inner face of the upstand - the hole the
   daylight comes down. They are an annotation rather than a section, so they
   are always drawn dashed in the annotation red, in plan and in elevation
   alike, and they are never treated as hidden linework.

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
    const CSS_NODE_MARKER      =  'VghLantern__Env2d__NodeMarker';           // <-- Optional joint marker
    const ROLE_KERB_REVEAL     =  'kerbReveal';                              // <-- Inner face of the upstand
    const CSS_GRID_MINOR       =  'VghLantern__Env2d__Grid--minor';
    const CSS_GRID_MAJOR       =  'VghLantern__Env2d__Grid--major';
    const CSS_GRID_AXIS        =  'VghLantern__Env2d__Grid--axis';

    // Fallbacks used only when the Env2d config has not resolved.
    const FALLBACK_STROKE_WIDTHS  =  {
        kerb       : 8,
        kerbPost   : 8,
        kerbReveal : 6,
        frame      : 8,
        framePost  : 8,
        eaves      : 8,
        ridge      : 9,
        hip        : 8,
        verge      : 8
    };
    const FALLBACK_MEMBER_STROKE_MM  =  6;
    const FALLBACK_REVEAL_DASH_MM    =  '90 60';                             // <-- Reveal dash when config has not resolved
    const MAX_GRID_LINES_PER_AXIS    =  400;                                 // <-- Guards against a runaway grid at wide zoom
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
    function VghLantern__Env2d__SkeletonRenderer__StrokeWidthForRole(skeletonCfg, roleKey) {
        var configKey  =  {
            kerb       : 'KerbStrokeWidthMm',
            kerbPost   : 'KerbStrokeWidthMm',
            kerbReveal : 'KerbRevealStrokeWidthMm',
            frame      : 'FrameStrokeWidthMm',
            framePost  : 'FrameStrokeWidthMm',
            eaves      : 'EavesStrokeWidthMm',
            ridge      : 'RidgeStrokeWidthMm',
            hip        : 'HipStrokeWidthMm',
            verge      : 'HipStrokeWidthMm'
        }[roleKey];

        if (configKey && typeof skeletonCfg[configKey] === 'number') return skeletonCfg[configKey];
        if (typeof skeletonCfg.MemberStrokeWidthMm === 'number')     return skeletonCfg.MemberStrokeWidthMm;
        return FALLBACK_STROKE_WIDTHS[roleKey] || FALLBACK_MEMBER_STROKE_MM;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Whether a Member Sits Behind the Viewing Plane
    // ------------------------------------------------------------
    // Plan views have no hidden members. In elevation, anything on the far half
    // of the viewer axis is treated as hidden - accurate enough for a whitecard
    // wireframe where members do not cross mid-span.
    function VghLantern__Env2d__SkeletonRenderer__IsHidden(member, viewKey) {
        if (viewKey === 'plan') return false;
        if (member.Role === ROLE_KERB_REVEAL) return false;                  // <-- Already an annotation; never fade it further

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
        if (member.Role === ROLE_KERB_REVEAL) {
            attrs['stroke-dasharray']  =  skeletonCfg.KerbRevealDashPatternMm || FALLBACK_REVEAL_DASH_MM;
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
        var radius        =  (typeof skeletonCfg.NodeMarkerRadiusMm === 'number') ? skeletonCfg.NodeMarkerRadiusMm : 9;

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

        var i, isHidden;
        for (i = 0; i < ordered.length; i++) {
            isHidden  =  VghLantern__Env2d__SkeletonRenderer__IsHidden(ordered[i], viewKey);
            VghLantern__Env2d__SkeletonRenderer__DrawMember(
                isHidden ? hiddenLayer : geometryLayer,
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
        if (gridCfg.Enabled === false) return;

        var gridLayer  =  instance.GetLayer('grid');
        if (!gridLayer) return;

        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var box         =  instance.GetViewBox();
        var zoomScale   =  instance.GetZoomScale();

        var minorSpacing  =  (typeof gridCfg.MinorSpacingMm === 'number') ? gridCfg.MinorSpacingMm : 100;
        var majorSpacing  =  (typeof gridCfg.MajorSpacingMm === 'number') ? gridCfg.MajorSpacingMm : 500;
        var hideMinorAt   =  (typeof gridCfg.HideMinorBelowZoomScale === 'number') ? gridCfg.HideMinorBelowZoomScale : 0.35;

        if (zoomScale >= hideMinorAt) {
            VghLantern__Env2d__SkeletonRenderer__DrawGridFamily(
                gridLayer, box, minorSpacing,
                (typeof gridCfg.MinorStrokeWidthMm === 'number') ? gridCfg.MinorStrokeWidthMm : 0.7,
                CSS_GRID_MINOR
            );
        }

        VghLantern__Env2d__SkeletonRenderer__DrawGridFamily(
            gridLayer, box, majorSpacing,
            (typeof gridCfg.MajorStrokeWidthMm === 'number') ? gridCfg.MajorStrokeWidthMm : 1.2,
            CSS_GRID_MAJOR
        );

        if (gridCfg.ShowOriginAxes !== false) {
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
