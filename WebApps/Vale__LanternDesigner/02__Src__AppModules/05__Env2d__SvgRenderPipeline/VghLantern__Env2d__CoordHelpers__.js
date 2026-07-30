/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | COORDINATE HELPERS
   =============================================================================

   FILE       : VghLantern__Env2d__CoordHelpers__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - CoordHelpers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project solved millimetre geometry into 2D view space
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The only place a 3D millimetre point becomes a 2D drawing point.
   - Every 2D renderer projects through this module, so plan and elevation views
     can never disagree about orientation or handedness.
   - Pure maths. No DOM, no SVG, no state.

   ---------------------------------------------------------------------------

   PROJECTION CONVENTION:
   Model space is right handed with +Z up (see SkeletonSolver). SVG space is
   y-down, so every projection negates the vertical component. One SVG user unit
   equals one millimetre, which keeps every stroke width and dimension offset
   directly readable as a real-world size.

       View            Horizontal      Vertical        Viewer looks along
       -----------     -----------     -----------     ------------------
       plan            +X              -Y              -Z  (down onto roof)
       frontElevation  +X              -Z              +Y  (at the long face)
       sideElevation   +Y              -Z              -X  (at the short face)

   ============================================================================= */

// =============================================================================
// REGION | 2D Coordinate Helpers Module
// =============================================================================

const VghLantern__Env2d__CoordHelpers = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Keys and Projection Table
    // ------------------------------------------------------------
    const VIEW_PLAN             =  'plan';                                   // <-- Looking down onto the roof
    const VIEW_FRONT_ELEVATION  =  'frontElevation';                         // <-- Looking at the long face
    const VIEW_SIDE_ELEVATION   =  'sideElevation';                          // <-- Looking at the short face

    // Each projector maps a model point to SVG user units.
    const VGHLANTERN__ENV2D__PROJECTORS  =  {
        'plan'           : function(pt) { return { x:  pt.x, y: -pt.y }; },
        'frontElevation' : function(pt) { return { x:  pt.x, y: -pt.z }; },
        'sideElevation'  : function(pt) { return { x:  pt.y, y: -pt.z }; }
    };

    // Depth key drives painter's-order sorting so nearer members draw last.
    const VGHLANTERN__ENV2D__DEPTH_KEYS  =  {
        'plan'           : function(pt) { return  pt.z; },
        'frontElevation' : function(pt) { return -pt.y; },
        'sideElevation'  : function(pt) { return  pt.x; }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Point Projection
// -----------------------------------------------------------------------------

    // FUNCTION | Whether a View Key is Recognised
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__IsKnownView(viewKey) {
        return !!VGHLANTERN__ENV2D__PROJECTORS[viewKey];
    }
    // ------------------------------------------------------------


    // FUNCTION | Project a Single Model Point into a View
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__ProjectPoint(point, viewKey) {
        var projector  =  VGHLANTERN__ENV2D__PROJECTORS[viewKey] || VGHLANTERN__ENV2D__PROJECTORS[VIEW_PLAN];
        return projector(point);
    }
    // ------------------------------------------------------------


    // FUNCTION | Project a List of Model Points into a View
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__ProjectPoints(points, viewKey) {
        var out  =  [];
        var i;
        for (i = 0; i < points.length; i++) {
            out.push(VghLantern__Env2d__CoordHelpers__ProjectPoint(points[i], viewKey));
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Project a Skeleton Member to a 2D Segment
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__ProjectMember(member, viewKey) {
        return {
            Id       : member.Id,
            Role     : member.Role,
            Start    : VghLantern__Env2d__CoordHelpers__ProjectPoint(member.Start, viewKey),
            End      : VghLantern__Env2d__CoordHelpers__ProjectPoint(member.End, viewKey),
            DepthKey : VghLantern__Env2d__CoordHelpers__MemberDepth(member, viewKey)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Mean Viewer-Axis Depth of a Member
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__MemberDepth(member, viewKey) {
        var depthFn  =  VGHLANTERN__ENV2D__DEPTH_KEYS[viewKey] || VGHLANTERN__ENV2D__DEPTH_KEYS[VIEW_PLAN];
        return (depthFn(member.Start) + depthFn(member.End)) / 2;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sort Projected Segments Back to Front
    // ------------------------------------------------------------
    // Painter's algorithm stand-in. Adequate for a whitecard wireframe, where
    // members never intersect mid-span.
    function VghLantern__Env2d__CoordHelpers__SortByDepth(projectedSegments) {
        return projectedSegments.slice().sort(function(a, b) {
            return a.DepthKey - b.DepthKey;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Extents and Fitting
// -----------------------------------------------------------------------------

    // FUNCTION | Compute the 2D Extents of a Set of Projected Points
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__ExtentsOfPoints(points2d) {
        if (!points2d || !points2d.length) return null;

        var minX  =  Infinity, maxX  =  -Infinity;
        var minY  =  Infinity, maxY  =  -Infinity;
        var i;

        for (i = 0; i < points2d.length; i++) {
            if (points2d[i].x < minX) minX  =  points2d[i].x;
            if (points2d[i].x > maxX) maxX  =  points2d[i].x;
            if (points2d[i].y < minY) minY  =  points2d[i].y;
            if (points2d[i].y > maxY) maxY  =  points2d[i].y;
        }

        return {
            MinX : minX, MaxX : maxX,
            MinY : minY, MaxY : maxY,
            Width  : maxX - minX,
            Height : maxY - minY
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Compute the 2D Extents of a Skeleton in a Given View
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, viewKey) {
        if (!skeleton || !skeleton.Members || !skeleton.Members.length) return null;

        var points  =  [];
        var i;
        for (i = 0; i < skeleton.Members.length; i++) {
            points.push(VghLantern__Env2d__CoordHelpers__ProjectPoint(skeleton.Members[i].Start, viewKey));
            points.push(VghLantern__Env2d__CoordHelpers__ProjectPoint(skeleton.Members[i].End, viewKey));
        }

        return VghLantern__Env2d__CoordHelpers__ExtentsOfPoints(points);
    }
    // ------------------------------------------------------------


    // FUNCTION | Grow Extents by a Uniform Margin
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__PadExtents(extents, marginMm) {
        if (!extents) return null;

        return {
            MinX   : extents.MinX - marginMm,
            MaxX   : extents.MaxX + marginMm,
            MinY   : extents.MinY - marginMm,
            MaxY   : extents.MaxY + marginMm,
            Width  : extents.Width  + (marginMm * 2),
            Height : extents.Height + (marginMm * 2)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Segment Geometry Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Midpoint of a 2D Segment
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__Midpoint2d(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Length of a 2D Segment
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__Length2d(a, b) {
        var dx  =  b.x - a.x;
        var dy  =  b.y - a.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Unit Normal of a 2D Segment
    // ------------------------------------------------------------
    // Used to offset dimension lines clear of the geometry they annotate.
    function VghLantern__Env2d__CoordHelpers__UnitNormal2d(a, b) {
        var dx      =  b.x - a.x;
        var dy      =  b.y - a.y;
        var length  =  Math.sqrt((dx * dx) + (dy * dy));
        if (length === 0) return { x: 0, y: -1 };
        return { x: -dy / length, y: dx / length };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Offset a 2D Point Along a Direction
    // ------------------------------------------------------------
    function VghLantern__Env2d__CoordHelpers__OffsetPoint2d(point, direction, distance) {
        return { x: point.x + (direction.x * distance), y: point.y + (direction.y * distance) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VIEW_PLAN                                        : VIEW_PLAN,
        VIEW_FRONT_ELEVATION                             : VIEW_FRONT_ELEVATION,
        VIEW_SIDE_ELEVATION                              : VIEW_SIDE_ELEVATION,

        VghLantern__Env2d__CoordHelpers__IsKnownView      : VghLantern__Env2d__CoordHelpers__IsKnownView,
        VghLantern__Env2d__CoordHelpers__ProjectPoint     : VghLantern__Env2d__CoordHelpers__ProjectPoint,
        VghLantern__Env2d__CoordHelpers__ProjectPoints    : VghLantern__Env2d__CoordHelpers__ProjectPoints,
        VghLantern__Env2d__CoordHelpers__ProjectMember    : VghLantern__Env2d__CoordHelpers__ProjectMember,
        VghLantern__Env2d__CoordHelpers__MemberDepth      : VghLantern__Env2d__CoordHelpers__MemberDepth,
        VghLantern__Env2d__CoordHelpers__SortByDepth      : VghLantern__Env2d__CoordHelpers__SortByDepth,

        VghLantern__Env2d__CoordHelpers__ExtentsOfPoints  : VghLantern__Env2d__CoordHelpers__ExtentsOfPoints,
        VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton: VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton,
        VghLantern__Env2d__CoordHelpers__PadExtents       : VghLantern__Env2d__CoordHelpers__PadExtents,

        VghLantern__Env2d__CoordHelpers__Midpoint2d       : VghLantern__Env2d__CoordHelpers__Midpoint2d,
        VghLantern__Env2d__CoordHelpers__Length2d         : VghLantern__Env2d__CoordHelpers__Length2d,
        VghLantern__Env2d__CoordHelpers__UnitNormal2d     : VghLantern__Env2d__CoordHelpers__UnitNormal2d,
        VghLantern__Env2d__CoordHelpers__OffsetPoint2d    : VghLantern__Env2d__CoordHelpers__OffsetPoint2d
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__CoordHelpers  =  VghLantern__Env2d__CoordHelpers;
