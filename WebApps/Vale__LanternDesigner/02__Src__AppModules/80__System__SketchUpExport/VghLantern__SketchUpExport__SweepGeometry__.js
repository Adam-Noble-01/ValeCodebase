/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | SWEEP GEOMETRY
   =============================================================================

   FILE       : VghLantern__SketchUpExport__SweepGeometry__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - SweepGeometry
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn sections and members into the two vertex rings of a prism
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - The whole exporter speaks one geometry primitive: a PRISM, which is two
     rings of millimetre points plus the ring spans that say which run of each
     is an outer loop and which is a hole. Every part of a Vale lantern - a
     glaze bar, a mitred base frame side, a hollow upstand, a pane of glass -
     is that shape, so the SketchUp importer only ever has to know how to build
     one thing.
   - This module is the only place that construction happens. The encoders
     decide WHICH sections go WHERE; this file turns that into vertices.
   - Pure maths. No DOM, no config file reads, no state. Given the same section
     and the same member it always returns the same rings.

   ---------------------------------------------------------------------------

   THE SECTION FRAME (unchanged from the render environments):
       section +x  ->  the member's ACROSS axis
       section +y  ->  the member's UP axis
       extrusion   ->  along the member's own length axis

   The up reference is model +Z projected perpendicular to the member, which is
   what lets a common rafter and a hip both come out correctly with no per-role
   special casing. A member that is exactly vertical falls back to model +Y.

   ---------------------------------------------------------------------------

   WHY THE MITRE CONSTRUCTION IS REPEATED HERE:

   VghLantern__Env3d__MeshBuilder__BaseFrameAssembly slides each end ring along
   the side axis onto the corner's vertical mitre plane, and this file does the
   same thing. That is a deliberate second copy of about thirty lines, not an
   oversight: the Env3d version is welded to THREE.js buffer construction and
   world-space axis swapping, and neither belongs in an exporter that speaks
   millimetres. Both consume the SAME upstream answers - DatumRing and
   SectionsForPitch from VghLantern__Geometry__BaseFrameAssembly - so the
   sections and the ring they are swept around can never disagree; only the
   vertex assembly is written twice. If a third consumer ever needs it, this is
   the copy to hoist into 04__MathUtils__LanternGeometry.

   ---------------------------------------------------------------------------

   WINDING CONTRACT:
   Sections arrive already normalised by SectionLoopBuilder - outer rings
   counter clockwise in the section frame, holes clockwise. Every ring is
   emitted in that same order, which is what lets the importer raise a wall quad
   per section edge in the given order and get an outward normal every time,
   on the holes as well as the outer loop.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Sweep Geometry Module
// =============================================================================

const VghLantern__SketchUpExport__SweepGeometry = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const GEOMETRY_CONFIG_KEY    =  'VghLantern__SketchUpExport__Config__Geometry';
    const GEOMETRY_CONFIG_LABEL  =  'Na__SketchUpExport__Config.json -> VghLantern__SketchUpExport__Config__Geometry';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Numeric Guards
    // ------------------------------------------------------------
    const PLANE_DENOMINATOR_EPSILON  =  1e-6;                                // <-- Below this the slide direction is parallel to the plane
    const VECTOR_LENGTH_EPSILON      =  1e-9;                                // <-- Below this a direction vector is degenerate
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Geometry Config Block
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Config() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[GEOMETRY_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Geometry Number via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__ConfigNumber(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__SweepGeometry__Config(), key, GEOMETRY_CONFIG_LABEL);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vector Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Millimetre Point
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Point(x, y, z) {
        return { x: x, y: y, z: z };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Subtract Two Points into a Vector
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise a Vector, or Null if Degenerate
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Normalise(v) {
        var length  =  Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
        if (length < VECTOR_LENGTH_EPSILON) return null;
        return { x: v.x / length, y: v.y / length, z: v.z / length };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cross Product of Two Vectors
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Cross(a, b) {
        return {
            x: (a.y * b.z) - (a.z * b.y),
            y: (a.z * b.x) - (a.x * b.z),
            z: (a.x * b.y) - (a.y * b.x)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dot Product of Two Vectors
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Dot(a, b) {
        return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
    }
    // ------------------------------------------------------------


    // FUNCTION | Distance Between Two Millimetre Points
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__Distance(a, b) {
        var dx  =  a.x - b.x;
        var dy  =  a.y - b.y;
        var dz  =  a.z - b.z;
        return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Basis
// -----------------------------------------------------------------------------

    // FUNCTION | The Local Axes of a Member Running Start to End
    // ------------------------------------------------------------
    // Along is the member's own length axis, Across is horizontal across it and
    // Up is perpendicular to both. On a sloping member the Up axis IS the slope
    // normal, which is exactly where a glaze bar cap has to point, and it comes
    // out that way with no role ever being named.
    //
    // Returns null for a degenerate member so the caller can skip it rather than
    // emit a part with NaN coordinates that would fail silently in SketchUp.
    function VghLantern__SketchUpExport__SweepGeometry__MemberBasis(startPoint, endPoint) {
        var along  =  VghLantern__SweepGeometry__Normalise(
                          VghLantern__SweepGeometry__Subtract(endPoint, startPoint));
        if (!along) return null;

        var verticalLimit  =  VghLantern__SweepGeometry__ConfigNumber('VerticalDotLimit');
        var modelUp        =  { x: 0, y: 0, z: 1 };
        var upReference    =  Math.abs(VghLantern__SweepGeometry__Dot(along, modelUp)) > verticalLimit
            ? { x: 0, y: 1, z: 0 }                                            // <-- Vertical member: fall back to model +Y
            : modelUp;

        var across  =  VghLantern__SweepGeometry__Normalise(
                           VghLantern__SweepGeometry__Cross(upReference, along));
        if (!across) return null;

        var up  =  VghLantern__SweepGeometry__Normalise(
                       VghLantern__SweepGeometry__Cross(along, across));
        if (!up) return null;

        return { Along: along, Across: across, Up: up };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Normalisation
// -----------------------------------------------------------------------------

    // FUNCTION | Wrap a Bare Outline Into the Section Face Shape
    // ------------------------------------------------------------
    // The profile library hands back a plain array of {x,y} for a ridge or hip
    // section, while the glaze bar and base frame systems hand back full
    // SectionLoopBuilder faces with ring spans and holes. Everything downstream
    // works on the richer shape, so a bare outline is promoted to a one ring
    // face here rather than being special cased in four encoders.
    function VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline(outlinePoints) {
        if (!Array.isArray(outlinePoints)) return null;

        var minimumPoints  =  VghLantern__SweepGeometry__ConfigNumber('MinOutlinePoints');
        if (outlinePoints.length < minimumPoints) return null;

        var points  =  [];
        var i;

        for (i = 0; i < outlinePoints.length; i++) {
            points.push({
                x : Number(outlinePoints[i].x) || 0,
                y : Number(outlinePoints[i].y) || 0
            });
        }

        return {
            Points : points,
            Rings  : [ { Start: 0, Count: points.length } ]
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ring Spans of a Face, or a Single Span Covering It
    // ------------------------------------------------------------
    // A face that arrived without ring spans is one closed loop by definition,
    // so rather than reject it the whole point array becomes ring zero.
    function VghLantern__SweepGeometry__RingsOf(face) {
        if (face && Array.isArray(face.Rings) && face.Rings.length > 0) return face.Rings;
        if (face && Array.isArray(face.Points)) return [ { Start: 0, Count: face.Points.length } ];
        return [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy Ring Spans Into Plain Payload Objects
    // ------------------------------------------------------------
    function VghLantern__SweepGeometry__CopyRings(rings) {
        var out  =  [];
        var i;

        for (i = 0; i < rings.length; i++) {
            out.push({ Start: rings[i].Start, Count: rings[i].Count });
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Construction and Vertex Sliding
// -----------------------------------------------------------------------------

    // FUNCTION | The Vertical Mitre Plane at One Corner of a Plan Ring
    // ------------------------------------------------------------
    // The plane through the corner whose horizontal normal bisects the two
    // adjoining side directions. On a rectangle that is the 45 degree plan
    // mitre; the construction holds for any convex ring, so a non-square plan
    // needs no special case.
    //
    // Ported from VghLantern__Env3d__MeshBuilder__BaseFrameAssembly. See the
    // file header for why this copy exists.
    function VghLantern__SketchUpExport__SweepGeometry__MitrePlaneAt(sides, cornerIndex) {
        if (!Array.isArray(sides) || sides.length < 4) return null;

        var previous  =  sides[(cornerIndex + 3) % 4];
        var current   =  sides[cornerIndex];

        var nx     =  previous.Direction.x + current.Direction.x;
        var ny     =  previous.Direction.y + current.Direction.y;
        var length =  Math.hypot(nx, ny);
        if (length <= 0) return null;

        return {
            Point  : { x: current.Start.x, y: current.Start.y, z: 0 },
            Normal : { x: nx / length,     y: ny / length,     z: 0 }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Vertical Plane Through a Point With a Horizontal Normal
    // ------------------------------------------------------------
    // What a plumb cut is: the glaze bar trim stops on a vertical plane rather
    // than square across the bar, so the cut face reads plumb from inside the
    // room whatever the roof pitch.
    function VghLantern__SketchUpExport__SweepGeometry__VerticalPlane(pointMm, normalMm) {
        var normal  =  VghLantern__SweepGeometry__Normalise({ x: normalMm.x, y: normalMm.y, z: 0 });
        if (!normal) return null;

        return {
            Point  : { x: pointMm.x, y: pointMm.y, z: Number(pointMm.z) || 0 },
            Normal : normal
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Slide One Vertex Along an Axis Onto a Plane
    // ------------------------------------------------------------
    // The vertex moves along the member axis only, so the section is unchanged
    // in its own frame and only the cut angle differs. A vertex further from the
    // plane slides further, which IS the mitre.
    function VghLantern__SweepGeometry__SlideOntoPlane(pointMm, axis, plane) {
        if (!plane) return pointMm;

        var denominator  =  VghLantern__SweepGeometry__Dot(axis, plane.Normal);
        if (Math.abs(denominator) < PLANE_DENOMINATOR_EPSILON) return pointMm;

        var offset  =  VghLantern__SweepGeometry__Subtract(plane.Point, pointMm);
        var slide   =  VghLantern__SweepGeometry__Dot(offset, plane.Normal) / denominator;

        return VghLantern__SweepGeometry__Point(
            pointMm.x + (axis.x * slide),
            pointMm.y + (axis.y * slide),
            pointMm.z + (axis.z * slide)
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prism Construction - Members
// -----------------------------------------------------------------------------

    // FUNCTION | Sweep a Section Along a Member Into a Prism
    // ------------------------------------------------------------
    // The general case: any section face swept from startPoint to endPoint,
    // optionally cut at either end onto a given plane instead of square across
    // the member.
    //
    // @param face       Section face - Points in the section frame plus ring spans
    // @param startPoint Member start, millimetres in model space
    // @param endPoint   Member end, millimetres in model space
    // @param options    Optional { StartPlane, EndPlane, DatumOffsetMm }
    // @return           { Rings, PointsA, PointsB, LengthMm } or null
    function VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(face, startPoint, endPoint, options) {
        if (!face || !Array.isArray(face.Points) || face.Points.length < 3) return null;

        var minimumLength  =  VghLantern__SweepGeometry__ConfigNumber('MinMemberLengthMm');
        var lengthMm       =  VghLantern__SweepGeometry__Distance(startPoint, endPoint);
        if (lengthMm < minimumLength) return null;

        var basis  =  VghLantern__SketchUpExport__SweepGeometry__MemberBasis(startPoint, endPoint);
        if (!basis) return null;

        var settings     =  options || {};
        var datumOffset  =  (typeof settings.DatumOffsetMm === 'number')
            ? settings.DatumOffsetMm
            : VghLantern__SweepGeometry__ConfigNumber('SectionDatumOffsetMm');

        var ends     =  [
            { Origin: startPoint, Plane: settings.StartPlane || null },
            { Origin: endPoint,   Plane: settings.EndPlane   || null }
        ];
        var ringSets =  [ [], [] ];
        var e, i, sectionX, sectionY, placed;

        for (e = 0; e < ends.length; e++) {
            for (i = 0; i < face.Points.length; i++) {
                sectionX  =  face.Points[i].x;
                sectionY  =  face.Points[i].y + datumOffset;

                placed  =  VghLantern__SweepGeometry__Point(
                    ends[e].Origin.x + (basis.Across.x * sectionX) + (basis.Up.x * sectionY),
                    ends[e].Origin.y + (basis.Across.y * sectionX) + (basis.Up.y * sectionY),
                    ends[e].Origin.z + (basis.Across.z * sectionX) + (basis.Up.z * sectionY)
                );

                ringSets[e].push(
                    VghLantern__SweepGeometry__SlideOntoPlane(placed, basis.Along, ends[e].Plane));
            }
        }

        return {
            Rings    : VghLantern__SweepGeometry__CopyRings(VghLantern__SweepGeometry__RingsOf(face)),
            PointsA  : ringSets[0],
            PointsB  : ringSets[1],
            LengthMm : lengthMm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prism Construction - Datum Ring Sides
// -----------------------------------------------------------------------------

    // FUNCTION | Sweep a Section Along One Datum Ring Side, Mitred Both Ends
    // ------------------------------------------------------------
    // The ring side sweep used by the base frame and the interior joinery. The
    // side's local basis matches the shared section frame the assets are
    // authored in: Across is -Outward (section -x runs outboard), Up is model
    // +Z, and the sweep runs along the side direction.
    //
    // Both end rings are slid onto the corner mitre planes, so two adjacent
    // sides meet on coincident faces and the ring closes watertight rather than
    // leaving the open butt an unmitred sweep would.
    //
    // @param face          Section face, authored about the eaves datum
    // @param side          Datum ring side - Start, End, Direction, Outward, LengthMm
    // @param startPlane    Mitre plane at the side's start corner, or null
    // @param endPlane      Mitre plane at the side's end corner, or null
    // @param datumLevelMm  Height of the datum the section origin sits at
    // @return              { Rings, PointsA, PointsB, LengthMm } or null
    function VghLantern__SketchUpExport__SweepGeometry__PrismAlongRingSide(face, side, startPlane, endPlane, datumLevelMm) {
        if (!face || !Array.isArray(face.Points) || face.Points.length < 3) return null;
        if (!side) return null;

        var minimumSide  =  VghLantern__SweepGeometry__ConfigNumber('MinRingSideLengthMm');
        if (Number(side.LengthMm) < minimumSide) return null;

        var acrossX  =  -side.Outward.x;                                      // <-- Section -x runs outboard
        var acrossY  =  -side.Outward.y;
        var along    =  { x: side.Direction.x, y: side.Direction.y, z: 0 };

        var ends     =  [
            { Origin: side.Start, Plane: startPlane || null },
            { Origin: side.End,   Plane: endPlane   || null }
        ];
        var ringSets =  [ [], [] ];
        var e, i, sectionX, sectionY, placed;

        for (e = 0; e < ends.length; e++) {
            for (i = 0; i < face.Points.length; i++) {
                sectionX  =  face.Points[i].x;
                sectionY  =  face.Points[i].y;

                placed  =  VghLantern__SweepGeometry__Point(
                    ends[e].Origin.x + (acrossX * sectionX),
                    ends[e].Origin.y + (acrossY * sectionX),
                    datumLevelMm + sectionY
                );

                ringSets[e].push(
                    VghLantern__SweepGeometry__SlideOntoPlane(placed, along, ends[e].Plane));
            }
        }

        return {
            Rings    : VghLantern__SweepGeometry__CopyRings(VghLantern__SweepGeometry__RingsOf(face)),
            PointsA  : ringSets[0],
            PointsB  : ringSets[1],
            LengthMm : Number(side.LengthMm)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prism Construction - Plan Rings and Slabs
// -----------------------------------------------------------------------------

    // FUNCTION | Extrude a Set of Plan Rings Vertically Into a Prism
    // ------------------------------------------------------------
    // The builders upstand and its reveal. Ring zero is the outer footprint
    // wound counter clockwise in plan; any further ring is a hole and is wound
    // clockwise, which is the same convention the section faces arrive in, so
    // the importer raises its wall quads the same way for both.
    //
    // @param planRings   Array of arrays of {x,y} - ring zero outer, rest holes
    // @param baseLevelMm Bottom of the prism
    // @param topLevelMm  Top of the prism
    // @return            { Rings, PointsA, PointsB, LengthMm } or null
    function VghLantern__SketchUpExport__SweepGeometry__PrismFromPlanRings(planRings, baseLevelMm, topLevelMm) {
        if (!Array.isArray(planRings) || planRings.length === 0) return null;

        var minimumThickness  =  VghLantern__SweepGeometry__ConfigNumber('MinPrismThicknessMm');
        var heightMm          =  topLevelMm - baseLevelMm;
        if (Math.abs(heightMm) < minimumThickness) return null;

        var rings    =  [];
        var pointsA  =  [];
        var pointsB  =  [];
        var r, i, ring, start;

        for (r = 0; r < planRings.length; r++) {
            ring   =  planRings[r];
            if (!Array.isArray(ring) || ring.length < 3) continue;

            start  =  pointsA.length;
            rings.push({ Start: start, Count: ring.length });

            for (i = 0; i < ring.length; i++) {
                pointsA.push(VghLantern__SweepGeometry__Point(ring[i].x, ring[i].y, baseLevelMm));
                pointsB.push(VghLantern__SweepGeometry__Point(ring[i].x, ring[i].y, topLevelMm));
            }
        }

        if (rings.length === 0) return null;

        return { Rings: rings, PointsA: pointsA, PointsB: pointsB, LengthMm: Math.abs(heightMm) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Extrude a Planar Polygon Along Its Own Normal Into a Slab
    // ------------------------------------------------------------
    // How a pane of glass is built: the solved glazing face is offset off the
    // glaze bar datum to the bedding face, then given its unit thickness
    // outwards from there, so changing the thickness moves the OUTER surface
    // and leaves the bedded face exactly where the bar put it.
    //
    // @param polygonPoints  Ring of {x,y,z} millimetre points, any winding
    // @param offsetMm       Distance from the polygon to the near face
    // @param thicknessMm    Slab thickness, measured on from the near face
    // @return               { Rings, PointsA, PointsB, LengthMm, Normal } or null
    function VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon(polygonPoints, offsetMm, thicknessMm) {
        if (!Array.isArray(polygonPoints) || polygonPoints.length < 3) return null;

        var minimumThickness  =  VghLantern__SweepGeometry__ConfigNumber('MinPrismThicknessMm');
        if (Math.abs(thicknessMm) < minimumThickness) return null;

        var normal  =  VghLantern__SweepGeometry__PolygonNormal(polygonPoints);
        if (!normal) return null;

        var pointsA  =  [];
        var pointsB  =  [];
        var nearOffset  =  offsetMm;
        var farOffset   =  offsetMm + thicknessMm;
        var i, p;

        for (i = 0; i < polygonPoints.length; i++) {
            p  =  polygonPoints[i];
            pointsA.push(VghLantern__SweepGeometry__Point(
                p.x + (normal.x * nearOffset),
                p.y + (normal.y * nearOffset),
                p.z + (normal.z * nearOffset)));
            pointsB.push(VghLantern__SweepGeometry__Point(
                p.x + (normal.x * farOffset),
                p.y + (normal.y * farOffset),
                p.z + (normal.z * farOffset)));
        }

        return {
            Rings    : [ { Start: 0, Count: polygonPoints.length } ],
            PointsA  : pointsA,
            PointsB  : pointsB,
            LengthMm : Math.abs(thicknessMm),
            Normal   : normal
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Newell Normal of a Planar Polygon
    // ------------------------------------------------------------
    // Newell rather than a cross product of the first two edges, because the
    // first three points of a solver face can be very nearly collinear on a
    // shallow hip end and would give a normal made mostly of rounding error.
    function VghLantern__SweepGeometry__PolygonNormal(polygonPoints) {
        var nx  =  0;
        var ny  =  0;
        var nz  =  0;
        var i, current, next;

        for (i = 0; i < polygonPoints.length; i++) {
            current  =  polygonPoints[i];
            next     =  polygonPoints[(i + 1) % polygonPoints.length];

            nx  +=  (current.y - next.y) * (current.z + next.z);
            ny  +=  (current.z - next.z) * (current.x + next.x);
            nz  +=  (current.x - next.x) * (current.y + next.y);
        }

        return VghLantern__SweepGeometry__Normalise({ x: nx, y: ny, z: nz });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__SweepGeometry__MemberBasis         : VghLantern__SketchUpExport__SweepGeometry__MemberBasis,
        VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline     : VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline,
        VghLantern__SketchUpExport__SweepGeometry__MitrePlaneAt        : VghLantern__SketchUpExport__SweepGeometry__MitrePlaneAt,
        VghLantern__SketchUpExport__SweepGeometry__VerticalPlane       : VghLantern__SketchUpExport__SweepGeometry__VerticalPlane,
        VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember    : VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember,
        VghLantern__SketchUpExport__SweepGeometry__PrismAlongRingSide  : VghLantern__SketchUpExport__SweepGeometry__PrismAlongRingSide,
        VghLantern__SketchUpExport__SweepGeometry__PrismFromPlanRings  : VghLantern__SketchUpExport__SweepGeometry__PrismFromPlanRings,
        VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon    : VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon,
        VghLantern__SketchUpExport__SweepGeometry__Distance            : VghLantern__SweepGeometry__Distance
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__SweepGeometry  =  VghLantern__SketchUpExport__SweepGeometry;
