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
    function VghLantern__ComponentPathRenderer__Place(anchorPt2d, localX, localY) {
        return {
            x : anchorPt2d.x + (Number(localX) || 0),
            y : anchorPt2d.y - (Number(localY) || 0)
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
    function VghLantern__ComponentPathRenderer__EmitLine(path, anchorPt2d) {
        var start  =  path['Start_mm'];
        var end    =  path['End_mm'];
        if (!start || !end) return '';

        return VghLantern__ComponentPathRenderer__Segment(
            VghLantern__ComponentPathRenderer__Place(anchorPt2d, start.X, start.Y),
            VghLantern__ComponentPathRenderer__Place(anchorPt2d, end.X, end.Y)
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit One Arc Primitive
    // ------------------------------------------------------------
    function VghLantern__ComponentPathRenderer__EmitArc(path, anchorPt2d) {
        var start   =  path['StartPoint_mm'];
        var end     =  path['EndPoint_mm'];
        var radius  =  Number(path['Radius_mm']) || 0;
        if (!start || !end || radius <= 0) return '';

        var sweepDeg   =  Math.abs(Number(path['Sweep_deg']) || 0);
        var largeArc   =  sweepDeg > 180 ? 1 : 0;
        var startPt    =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, start.X, start.Y);
        var endPt      =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, end.X, end.Y);
        var radiusText =  VghLantern__ComponentPathRenderer__Fmt(radius);

        return 'M' + VghLantern__ComponentPathRenderer__Fmt(startPt.x) + ' ' + VghLantern__ComponentPathRenderer__Fmt(startPt.y)
             + 'A' + radiusText + ' ' + radiusText + ' 0 ' + largeArc + ' 0 '
             + VghLantern__ComponentPathRenderer__Fmt(endPt.x) + ' ' + VghLantern__ComponentPathRenderer__Fmt(endPt.y);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit One Circle Primitive
    // ------------------------------------------------------------
    // SVG has no circle command inside path data, so a full turn is drawn as two
    // half arcs meeting at the horizontal extremes.
    function VghLantern__ComponentPathRenderer__EmitCircle(path, anchorPt2d) {
        var centre  =  path['Center_mm'];
        var radius  =  Number(path['Radius_mm']) || 0;
        if (!centre || radius <= 0) return '';

        var leftPt   =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, Number(centre.X) - radius, centre.Y);
        var rightPt  =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, Number(centre.X) + radius, centre.Y);
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
    function VghLantern__ComponentPathRenderer__EmitPolygon(path, anchorPt2d) {
        var vertices  =  path['Vertices_mm'];
        if (!Array.isArray(vertices) || vertices.length < 3) return '';

        var out  =  '';
        for (var i = 0; i < vertices.length; i++) {
            var placed  =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, vertices[i].X, vertices[i].Y);
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
    function VghLantern__ComponentPathRenderer__BuildPathData(paths, anchorPt2d) {
        if (!Array.isArray(paths) || !anchorPt2d) return '';

        var segments  =  [];

        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (!path) continue;

            var fragment  =  '';
            if (path.PathType === PATH_TYPE_LINE)         fragment  =  VghLantern__ComponentPathRenderer__EmitLine(path, anchorPt2d);
            else if (path.PathType === PATH_TYPE_ARC)     fragment  =  VghLantern__ComponentPathRenderer__EmitArc(path, anchorPt2d);
            else if (path.PathType === PATH_TYPE_CIRCLE)  fragment  =  VghLantern__ComponentPathRenderer__EmitCircle(path, anchorPt2d);
            else if (path.PathType === PATH_TYPE_POLYGON) fragment  =  VghLantern__ComponentPathRenderer__EmitPolygon(path, anchorPt2d);

            if (fragment) segments.push(fragment);
        }

        return segments.join('');
    }
    // ------------------------------------------------------------


    // FUNCTION | Flatten a Legacy Profile2D Outline into SVG Path Data
    // ------------------------------------------------------------
    // Assets authored before the unified export carry one closed outline of
    // points instead of a primitive list. Same placement rule, one shape.
    function VghLantern__ComponentPathRenderer__BuildOutlinePathData(outlinePoints, anchorPt2d) {
        if (!Array.isArray(outlinePoints) || outlinePoints.length < 3 || !anchorPt2d) return '';

        var out  =  '';
        for (var i = 0; i < outlinePoints.length; i++) {
            var placed  =  VghLantern__ComponentPathRenderer__Place(anchorPt2d, outlinePoints[i].x, outlinePoints[i].y);
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
        VghLantern__ComponentPathRenderer__BuildPathData         : VghLantern__ComponentPathRenderer__BuildPathData,
        VghLantern__ComponentPathRenderer__BuildOutlinePathData  : VghLantern__ComponentPathRenderer__BuildOutlinePathData
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ComponentPathRenderer  =  VghLantern__Env2d__ComponentPathRenderer;
