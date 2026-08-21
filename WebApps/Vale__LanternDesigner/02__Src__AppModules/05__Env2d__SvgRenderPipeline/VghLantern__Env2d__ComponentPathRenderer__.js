/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | COMPONENT PATH RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__ComponentPathRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - ComponentPathRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn a component's Na__Geometry__Paths block into SVG path data
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The unified component schema stores each 2D view as a list of drawing
     primitives - Line, Arc, Circle, Polygon - rather than one closed outline.
     This module flattens that list into a single SVG path string placed at an
     anchor point.
   - One path element per component, not one per primitive. A spire finial is
     157 line segments; drawing it as 157 SVG elements at four ridge ends would
     put six hundred nodes in the DOM for one decorative item.

   ---------------------------------------------------------------------------

   THE PLACEMENT INVARIANT:
   Every asset is authored about its origin point, and the three exported views
   are aligned so that local X always runs across the view and local Y always
   runs up it:

       front elevation   local X = model X,  local Y = model Z
       right elevation   local X = model Y,  local Y = model Z
       top plan          local X = model X,  local Y = model Y

   Each of those maps onto its 2D view the same way, because the view projectors
   negate exactly the axis the asset calls Y. So placement is one expression for
   all three views, with no per-view special case:

       viewX = anchorX + localX
       viewY = anchorY - localY

   ARC WINDING:
   The exporter authors sweeps counter-clockwise in a Y-up frame. Negating Y to
   reach SVG's Y-down frame reflects the geometry, which reverses the direction
   of travel, so the SVG sweep flag is 0 rather than 1.

   ---------------------------------------------------------------------------

   COMPONENTS THAT ARE TURNED IN PLAN

   A finial is a solid of revolution and looks the same whichever way round it is
   set, so for years the placement above was all this module needed. A ridge end
   cap is not: it has a front and a back, one sits at each end of the ridge turned
   180 degrees from the other, and the ridge itself runs along world X or world Y
   depending on which way the lantern is proportioned.

   So a caller may pass an ORIENTATION - a 2x2 matrix applied to the asset's local
   coordinates before the anchor is added:

       viewX = anchorX + (M00 * localX) + (M01 * localY)
       viewY = anchorY - (M10 * localX) - (M11 * localY)

   Omitting it is the identity and every existing call keeps its behaviour.

   WHY A MATRIX AND NOT AN ANGLE

   In PLAN a turn is a real rotation of the linework and the matrix is the
   rotation. In an ELEVATION it cannot be, because an elevation of a rotated
   object is not recoverable from an elevation of the unrotated one - unless the
   turn is a quarter of a circle, in which case the answer is simply the asset's
   OTHER exported elevation, possibly mirrored. A ridge is always solved along a
   world axis, so every turn this module is asked for is a quarter turn, and
   OrientedView below answers both halves of the question at once: which of the
   three exported blocks to read, and the matrix to read it through.

   A matrix with a negative determinant is a mirror, and a mirror reverses the
   direction of travel round an arc, so the sweep flag flips back to 1 there.

   ============================================================================= */

// =============================================================================
// REGION | Component Path Renderer Module
// =============================================================================

const VghLantern__Env2d__ComponentPathRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Key Mapping and Path Types
    // ------------------------------------------------------------
    const VIEW_KEY_TO_ASSET_VIEW  =  {
        'frontElevation' : 'front',
        'sideElevation'  : 'right',
        'plan'           : 'plan'
    };

    const PATH_TYPE_LINE     =  'Line';
    const PATH_TYPE_ARC      =  'Arc';
    const PATH_TYPE_CIRCLE   =  'Circle';
    const PATH_TYPE_POLYGON  =  'Polygon';

    const COORD_DECIMALS     =  3;                                           // <-- Sub-micron in millimetres; never a visible rounding

    const IDENTITY_ORIENTATION  =  { M00 : 1, M01 : 0, M10 : 0, M11 : 1 };

    // Cosine and sine of the four quarter turns, exact rather than computed, so a
    // plan rotation lands on clean numbers instead of on 6.1e-17.
    const QUARTER_COS  =  [1,  0, -1,  0];
    const QUARTER_SIN  =  [0,  1,  0, -1];

    // WHICH EXPORTED BLOCK AN ELEVATION READS AFTER A QUARTER TURN, AND WHETHER IT
    // IS MIRRORED. Indexed by quarter turn. Derived once rather than reasoned about
    // at the call site: a cap turned a quarter of a circle presents the face the
    // asset exported as its RIGHT elevation to a viewer standing at the front.
    const FRONT_AFTER_TURN  =  [
        { AssetViewKey : 'front', ScaleX :  1 },
        { AssetViewKey : 'right', ScaleX : -1 },
        { AssetViewKey : 'front', ScaleX : -1 },
        { AssetViewKey : 'right', ScaleX :  1 }
    ];

    const SIDE_AFTER_TURN  =  [
        { AssetViewKey : 'right', ScaleX :  1 },
        { AssetViewKey : 'front', ScaleX :  1 },
        { AssetViewKey : 'right', ScaleX : -1 },
        { AssetViewKey : 'front', ScaleX : -1 }
    ];

    const QUARTER_TURNS  =  4;
    const DEGREES_PER_QUARTER  =  90;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Coordinate Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Map an Asset View Key from a Viewport View Key
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__AssetViewKey(viewKey) {
        return VIEW_KEY_TO_ASSET_VIEW[viewKey] || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Trim a Number to the Working Precision
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__Fmt(value) {
        var rounded  =  Number(value);
        if (!isFinite(rounded)) return '0';
        return String(Number(rounded.toFixed(COORD_DECIMALS)));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place a Local Component Point into View Space
    // ------------------------------------------------------------
    // A missing orientation is the identity, which is the placement invariant in
    // the header and what every caller drawing an unturned component wants.
    function VghLantern__ComponentPathRenderer__Place(anchorPt2d, localX, localY, orientation) {
        var lx  =  Number(localX) || 0;
        var ly  =  Number(localY) || 0;
        var m   =  orientation || IDENTITY_ORIENTATION;

        return {
            x : anchorPt2d.x + (m.M00 * lx) + (m.M01 * ly),
            y : anchorPt2d.y - ((m.M10 * lx) + (m.M11 * ly))
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether an Orientation Reflects Rather Than Rotates
    // ------------------------------------------------------------
    // Read only by the arc emitter, to decide which way round a sweep travels.
    function VghLantern__ComponentPathRenderer__IsMirrored(orientation) {
        var m  =  orientation || IDENTITY_ORIENTATION;
        return ((m.M00 * m.M11) - (m.M01 * m.M10)) < 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Block to Read and the Matrix to Read It Through
    // ------------------------------------------------------------
    // Answers both halves of a turned placement at once, because they are one
    // decision: in plan the turn is a rotation of the plan linework, and in an
    // elevation it is a choice between the two exported elevations plus a possible
    // mirror. See the header for why an elevation cannot be anything else.
    //
    // planRotationDegrees is the counter-clockwise turn about model +Z the
    // placement carries - the same number the 3D builder feeds into rotation.y.
    // It is snapped to the nearest quarter turn, which is exact for every
    // placement the solver produces because a ridge always runs along a world axis.
    //
    // Returns null for an unknown view key, so a caller can bail with one test.
    function VghLantern__ComponentPathRenderer__OrientedView(viewKey, planRotationDegrees) {
        var assetViewKey  =  VghLantern__ComponentPathRenderer__AssetViewKey(viewKey);
        if (!assetViewKey) return null;

        var turns  =  Math.round((Number(planRotationDegrees) || 0) / DEGREES_PER_QUARTER);
        var q      =  ((turns % QUARTER_TURNS) + QUARTER_TURNS) % QUARTER_TURNS;

        if (assetViewKey === 'plan') {
            return {
                AssetViewKey : 'plan',
                Orientation  : {
                    M00 :  QUARTER_COS[q], M01 : -QUARTER_SIN[q],
                    M10 :  QUARTER_SIN[q], M11 :  QUARTER_COS[q]
                }
            };
        }

        var table  =  (assetViewKey === 'right') ? SIDE_AFTER_TURN : FRONT_AFTER_TURN;
        var entry  =  table[q];

        return {
            AssetViewKey : entry.AssetViewKey,
            Orientation  : { M00 : entry.ScaleX, M01 : 0, M10 : 0, M11 : 1 }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit a Move-To Plus Line-To Pair
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__Segment(fromPt, toPt) {
        return 'M' + VghLantern__ComponentPathRenderer__Fmt(fromPt.x) + ' ' + VghLantern__ComponentPathRenderer__Fmt(fromPt.y)
             + 'L' + VghLantern__ComponentPathRenderer__Fmt(toPt.x)   + ' ' + VghLantern__ComponentPathRenderer__Fmt(toPt.y);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Primitive Emitters
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Emit One Line Primitive
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__EmitLine(path, anchorPt2d, orientation) {
        var start  =  path['Start_mm'];
        var end    =  path['End_mm'];
        if (!start || !end) return '';

        return VghLantern__ComponentPathRenderer__Segment(
            VghLantern__ComponentPathRenderer__Place(anchorPt2d, start.X, start.Y, orientation),
            VghLantern__ComponentPathRenderer__Place(anchorPt2d, end.X, end.Y, orientation)
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit One Arc Primitive
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__EmitArc(path, anchorPt2d, orientation) {
        var start   =  path['StartPoint_mm'];
        var end     =  path['EndPoint_mm'];
        var radius  =  Number(path['Radius_mm']) || 0;
        if (!start || !end || radius <= 0) return '';

        var sweepDeg   =  Math.abs(Number(path['Sweep_deg']) || 0);
        var largeArc   =  sweepDeg > 180 ? 1 : 0;
        var startPt    =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, start.X, start.Y, orientation);
        var endPt      =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, end.X, end.Y, orientation);
        var radiusText =  VghLantern__ComponentPathRenderer__Fmt(radius);

        // A rotation preserves the direction of travel and a mirror reverses it,
        // so the sweep flag negated once by the Y flip is negated back again here.
        var sweepFlag  =  VghLantern__ComponentPathRenderer__IsMirrored(orientation) ? 1 : 0;

        return 'M' + VghLantern__ComponentPathRenderer__Fmt(startPt.x) + ' ' + VghLantern__ComponentPathRenderer__Fmt(startPt.y)
             + 'A' + radiusText + ' ' + radiusText + ' 0 ' + largeArc + ' ' + sweepFlag + ' '
             + VghLantern__ComponentPathRenderer__Fmt(endPt.x) + ' ' + VghLantern__ComponentPathRenderer__Fmt(endPt.y);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit One Circle Primitive
    // ------------------------------------------------------------
    // SVG has no circle command inside path data, so a full turn is drawn as two
    // half arcs meeting at the horizontal extremes.
    // The two extremes are stepped off IN VIEW SPACE from the placed centre rather
    // than in local space before it. Under the identity that is the same arithmetic;
    // under a turn it is the only version that stays a circle, because stepping
    // along local X first would step along the rotated axis.
    function VghLantern__ComponentPathRenderer__EmitCircle(path, anchorPt2d, orientation) {
        var centre  =  path['Center_mm'];
        var radius  =  Number(path['Radius_mm']) || 0;
        if (!centre || radius <= 0) return '';

        var centrePt =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, centre.X, centre.Y, orientation);
        var leftPt   =  { x : centrePt.x - radius, y : centrePt.y };
        var rightPt  =  { x : centrePt.x + radius, y : centrePt.y };
        var rText    =  VghLantern__ComponentPathRenderer__Fmt(radius);
        var leftX    =  VghLantern__ComponentPathRenderer__Fmt(leftPt.x);
        var rightX   =  VghLantern__ComponentPathRenderer__Fmt(rightPt.x);
        var yText    =  VghLantern__ComponentPathRenderer__Fmt(leftPt.y);

        return 'M' + leftX + ' ' + yText
             + 'A' + rText + ' ' + rText + ' 0 1 0 ' + rightX + ' ' + yText
             + 'A' + rText + ' ' + rText + ' 0 1 0 ' + leftX  + ' ' + yText;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit One Polygon Primitive
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__EmitPolygon(path, anchorPt2d, orientation) {
        var vertices  =  path['Vertices_mm'];
        if (!Array.isArray(vertices) || vertices.length < 3) return '';

        var out  =  '';
        for (var i = 0; i < vertices.length; i++) {
            var placed  =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, vertices[i].X, vertices[i].Y, orientation);
            out  +=  (i === 0 ? 'M' : 'L')
                  +  VghLantern__ComponentPathRenderer__Fmt(placed.x) + ' '
                  +  VghLantern__ComponentPathRenderer__Fmt(placed.y);
        }
        return out + 'Z';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Flatten a Paths Array into One SVG Path String at an Anchor
    // ------------------------------------------------------------
    // orientation is optional; omitting it draws the component set square, which is
    // what a solid of revolution wants and what every caller wanted before turned
    // components existed.
    function VghLantern__ComponentPathRenderer__BuildPathData(paths, anchorPt2d, orientation) {
        if (!Array.isArray(paths) || !anchorPt2d) return '';

        var segments  =  [];

        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (!path) continue;

            var fragment  =  '';
            if (path.PathType === PATH_TYPE_LINE)         fragment  =  VghLantern__ComponentPathRenderer__EmitLine(path, anchorPt2d, orientation);
            else if (path.PathType === PATH_TYPE_ARC)     fragment  =  VghLantern__ComponentPathRenderer__EmitArc(path, anchorPt2d, orientation);
            else if (path.PathType === PATH_TYPE_CIRCLE)  fragment  =  VghLantern__ComponentPathRenderer__EmitCircle(path, anchorPt2d, orientation);
            else if (path.PathType === PATH_TYPE_POLYGON) fragment  =  VghLantern__ComponentPathRenderer__EmitPolygon(path, anchorPt2d, orientation);

            if (fragment) segments.push(fragment);
        }

        return segments.join('');
    }
    // ------------------------------------------------------------


    // FUNCTION | Flatten a Legacy Profile2D Outline into SVG Path Data
    // ------------------------------------------------------------
    // Assets authored before the unified export carry one closed outline of
    // points instead of a primitive list. Same placement rule, one shape.
    function VghLantern__ComponentPathRenderer__BuildOutlinePathData(outlinePoints, anchorPt2d, orientation) {
        if (!Array.isArray(outlinePoints) || outlinePoints.length < 3 || !anchorPt2d) return '';

        var out  =  '';
        for (var i = 0; i < outlinePoints.length; i++) {
            var placed  =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, outlinePoints[i].x, outlinePoints[i].y, orientation);
            out  +=  (i === 0 ? 'M' : 'L')
                  +  VghLantern__ComponentPathRenderer__Fmt(placed.x) + ' '
                  +  VghLantern__ComponentPathRenderer__Fmt(placed.y);
        }
        return out + 'Z';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ComponentPathRenderer__AssetViewKey          : VghLantern__ComponentPathRenderer__AssetViewKey,
        VghLantern__ComponentPathRenderer__OrientedView          : VghLantern__ComponentPathRenderer__OrientedView,
        VghLantern__ComponentPathRenderer__BuildPathData         : VghLantern__ComponentPathRenderer__BuildPathData,
        VghLantern__ComponentPathRenderer__BuildOutlinePathData  : VghLantern__ComponentPathRenderer__BuildOutlinePathData
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ComponentPathRenderer  =  VghLantern__Env2d__ComponentPathRenderer;
