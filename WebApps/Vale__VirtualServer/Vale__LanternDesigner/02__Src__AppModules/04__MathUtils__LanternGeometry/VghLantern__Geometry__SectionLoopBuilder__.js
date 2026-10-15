/* =============================================================================
   VGHLANTERN - GEOMETRY | SECTION LOOP BUILDER
   =============================================================================

   FILE       : VghLantern__Geometry__SectionLoopBuilder__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - SectionLoopBuilder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn an exported 2D path soup into closed, wound, triangulated faces
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The Component Editor exports a view as an unordered list of line segments.
     Nothing in that export states which segments form which loop, which way round
     a loop runs, or which loops are holes - a viewer that only draws linework has
     never needed to know. A solid does.
   - This module answers those three questions and nothing else. It takes the
     Na__Geometry__Paths array from any 2D view block and returns closed loops,
     each classified as an outer boundary or a hole, wound consistently, with a
     triangulation of the resulting face.
   - Pure arithmetic. No THREE, no DOM, no fetch. The 3D extruder consumes this,
     and the 2D renderers can consume the same output when they need filled
     sections rather than linework.

   ---------------------------------------------------------------------------

   WHY THE WINDING HAS TO BE REBUILT RATHER THAN TRUSTED

   The five glaze bar assets do not agree with each other. Measured by signed
   area, the core and the 45 mm and 90 mm trims come out counter-clockwise while
   the cap and the 70 mm trim come out clockwise. That is not a fault in the
   export - a silhouette walk has no reason to prefer a direction - but an
   extruder that trusts it builds two of the five parts inside out, and the fault
   only shows up as backface culling swallowing a part at certain camera angles.

   So the winding is discarded on arrival and recomputed from nesting depth:
   even depth is a solid boundary and is forced counter-clockwise, odd depth is a
   hole and is forced clockwise.

   ---------------------------------------------------------------------------

   TOLERANCE

   Endpoints are matched on a quantised lattice rather than by distance search,
   which is what keeps stitching linear in the segment count rather than
   quadratic in a nearest-point search.

   The lattice was originally set at one micron, matching the three decimal
   places a SketchUp export carries. That was too fine, and the failure mode is
   worth recording because it is invisible until a whole part vanishes.

   The hip blocking section (48_2101) exports one segment whose two endpoints sit
   at x = -20.001 and -6.001 while the segments meeting them sit at -20.000 and
   -6.000. Those are the same points - the mirrored side of the identical section
   comes out exactly 20.000 and 6.000 - and the difference is the last digit of a
   float that went through a rotation somewhere upstream. At a one micron lattice
   they land in ADJACENT CELLS, four vertices end up with one edge each, five open
   chains get discarded, and the part silently produces no faces and no solid.

   Ten microns welds that and is still an order of magnitude finer than the
   finest real feature anywhere in the library - a little over a tenth of a
   millimetre, on a tight moulding return. Setting the lattice AT the export's own
   precision was the mistake: any two coordinates that should be identical but
   differ in their last digit are then guaranteed to fall apart.

   ============================================================================= */

// =============================================================================
// REGION | Section Loop Builder Module
// =============================================================================

const VghLantern__Geometry__SectionLoopBuilder = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Stitching and Classification Tolerances
    // ------------------------------------------------------------
    const STITCH_TOLERANCE_MM   =  0.01;                                     // <-- Endpoint weld lattice, ten microns
    const MIN_LOOP_VERTICES     =  3;                                        // <-- A loop needs at least a triangle
    const MIN_LOOP_AREA_SQMM    =  0.0001;                                   // <-- Below this a loop is a degenerate sliver
    const MIN_EAR_AREA          =  1e-12;                                    // <-- Collinearity guard inside ear clipping
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Path Field Names as Exported
    // ------------------------------------------------------------
    const FIELD_PATH_TYPE   =  'PathType';
    const FIELD_START       =  'Start_mm';
    const FIELD_END         =  'End_mm';
    const PATH_TYPE_LINE    =  'Line';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Endpoint Lattice
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Quantise a Point to the Stitching Lattice
    // ------------------------------------------------------------
    // The key is a string rather than a composite object so it can index a plain
    // map, which is what keeps stitching linear in the segment count instead of
    // quadratic in a nearest-point search.
    function VghLantern__SectionLoopBuilder__LatticeKey(x, y) {
        return Math.round(x / STITCH_TOLERANCE_MM) + '|' + Math.round(y / STITCH_TOLERANCE_MM);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Exported Path Endpoint
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__ReadPoint(raw) {
        if (!raw) return null;

        var x  =  Number(raw.X);
        var y  =  Number(raw.Y);
        if (!isFinite(x) || !isFinite(y)) return null;

        return { x : x, y : y };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Segment Stitching
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Collect Unique, Non-Degenerate Segments From the Path List
    // ------------------------------------------------------------
    // Duplicates are dropped rather than tolerated. A segment listed twice would
    // give its two endpoints degree four, and the walk below would then have a
    // choice of exits at a vertex where the outline has only one - which is how a
    // stitcher silently produces a figure of eight instead of two loops.
    //
    // Only straight Line paths are consumed. The glaze bar exports carry nothing
    // else - arcs are already flattened to segments by the exporter - and an arc
    // that did appear would be reported rather than silently skipped.
    function VghLantern__SectionLoopBuilder__CollectSegments(pathList, warnings) {
        var segments  =  [];
        var vertices  =  {};                                                  // <-- LatticeKey -> { x, y, Index }
        var seenPair  =  {};                                                  // <-- Undirected segment key -> true
        var i, path, startRaw, endRaw, startKey, endKey, pairKey, unhandled;

        unhandled  =  0;

        for (i = 0; i < pathList.length; i++) {
            path  =  pathList[i];
            if (!path) continue;

            if (path[FIELD_PATH_TYPE] !== PATH_TYPE_LINE) { unhandled++; continue; }

            startRaw  =  VghLantern__SectionLoopBuilder__ReadPoint(path[FIELD_START]);
            endRaw    =  VghLantern__SectionLoopBuilder__ReadPoint(path[FIELD_END]);
            if (!startRaw || !endRaw) continue;

            startKey  =  VghLantern__SectionLoopBuilder__LatticeKey(startRaw.x, startRaw.y);
            endKey    =  VghLantern__SectionLoopBuilder__LatticeKey(endRaw.x,   endRaw.y);
            if (startKey === endKey) continue;                                // <-- Zero length once quantised

            pairKey  =  (startKey < endKey) ? (startKey + '>' + endKey) : (endKey + '>' + startKey);
            if (seenPair[pairKey]) continue;                                  // <-- Already have this edge
            seenPair[pairKey]  =  true;

            if (!vertices[startKey]) vertices[startKey]  =  { x : startRaw.x, y : startRaw.y, Key : startKey, Edges : [] };
            if (!vertices[endKey])   vertices[endKey]    =  { x : endRaw.x,   y : endRaw.y,   Key : endKey,   Edges : [] };

            vertices[startKey].Edges.push(segments.length);
            vertices[endKey].Edges.push(segments.length);
            segments.push({ StartKey : startKey, EndKey : endKey, Used : false });
        }

        if (unhandled > 0) {
            warnings.push(unhandled + ' non-line path(s) ignored - only straight segments are stitched.');
        }

        return { Segments : segments, Vertices : vertices };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Walk the Stitched Graph Into Closed Loops
    // ------------------------------------------------------------
    // A clean section is a set of simple cycles in which every vertex has degree
    // exactly two, so the walk never has to choose. Where the degree is higher the
    // first unused edge is taken and the anomaly is reported: guessing quietly at
    // a junction is what turns a bad export into a plausible but wrong solid, and
    // a wrong solid becomes a wrong cutting list.
    function VghLantern__SectionLoopBuilder__WalkLoops(graph, warnings) {
        var segments  =  graph.Segments;
        var vertices  =  graph.Vertices;
        var loops     =  [];
        var open      =  0;
        var branching =  0;
        var key, i, seed, chainKeys, currentKey, nextEdge, closed, guard;

        // Degree check first, so the report describes the export rather than the walk.
        for (key in vertices) {
            if (!Object.prototype.hasOwnProperty.call(vertices, key)) continue;
            if (vertices[key].Edges.length !== 2) branching++;
        }
        if (branching > 0) {
            warnings.push(branching + ' vertex/vertices do not have exactly two edges - the outline is not a set of simple loops.');
        }

        for (i = 0; i < segments.length; i++) {
            if (segments[i].Used) continue;

            segments[i].Used  =  true;
            seed        =  segments[i];
            chainKeys   =  [seed.StartKey, seed.EndKey];
            currentKey  =  seed.EndKey;
            closed      =  false;
            guard       =  segments.length + 1;                               // <-- Hard stop: a walk can never exceed the edge count

            while (guard-- > 0) {
                nextEdge  =  VghLantern__SectionLoopBuilder__NextUnusedEdge(vertices[currentKey], segments);
                if (nextEdge === -1) break;

                segments[nextEdge].Used  =  true;
                currentKey  =  (segments[nextEdge].StartKey === currentKey)
                    ? segments[nextEdge].EndKey
                    : segments[nextEdge].StartKey;

                if (currentKey === chainKeys[0]) { closed  =  true; break; }
                chainKeys.push(currentKey);
            }

            if (closed && chainKeys.length >= MIN_LOOP_VERTICES) {
                loops.push(VghLantern__SectionLoopBuilder__KeysToPoints(chainKeys, vertices));
            } else {
                open++;
            }
        }

        if (open > 0) {
            warnings.push(open + ' open chain(s) discarded - they cannot bound a solid.');
        }

        return loops;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the First Unused Edge Leaving a Vertex
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__NextUnusedEdge(vertex, segments) {
        if (!vertex) return -1;

        var i;
        for (i = 0; i < vertex.Edges.length; i++) {
            if (!segments[vertex.Edges[i]].Used) return vertex.Edges[i];
        }
        return -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Key Chain Back to Real Coordinates
    // ------------------------------------------------------------
    // The lattice is only ever a matching device. The points handed on are the
    // original exported coordinates, so no precision is lost to the weld.
    function VghLantern__SectionLoopBuilder__KeysToPoints(chainKeys, vertices) {
        var points  =  [];
        var i, vertex;

        for (i = 0; i < chainKeys.length; i++) {
            vertex  =  vertices[chainKeys[i]];
            points.push({ x : vertex.x, y : vertex.y });
        }
        return points;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loop Measurement and Classification
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Signed Area of a Closed Loop
    // ------------------------------------------------------------
    // Positive is counter-clockwise in a right-handed XY frame. The shoelace sum
    // is exact for a polygon and doubles as the section area the takeoff needs.
    function VghLantern__SectionLoopBuilder__SignedArea(points) {
        var total  =  0;
        var i, j;

        for (i = 0, j = points.length - 1; i < points.length; j = i++) {
            total  +=  (points[j].x * points[i].y) - (points[i].x * points[j].y);
        }
        return total / 2;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Point in Polygon by Crossing Number
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__ContainsPoint(points, testX, testY) {
        var inside  =  false;
        var i, j, xi, yi, xj, yj, straddles;

        for (i = 0, j = points.length - 1; i < points.length; j = i++) {
            xi  =  points[i].x;  yi  =  points[i].y;
            xj  =  points[j].x;  yj  =  points[j].y;

            straddles  =  (yi > testY) !== (yj > testY);
            if (straddles && testX < ((xj - xi) * (testY - yi) / (yj - yi)) + xi) inside  =  !inside;
        }
        return inside;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Classify Loops by Nesting Depth and Normalise Winding
    // ------------------------------------------------------------
    // Depth is counted by containment against every other loop, which handles an
    // island inside a hole inside a boundary without a special case. Even depth is
    // solid, odd depth is a hole, and each loop is then reversed if its measured
    // winding disagrees with what its depth requires.
    //
    // Containment is tested with a loop's own vertex. That is safe here because
    // the loops are disjoint - a section's boundaries never cross - so a vertex of
    // one loop is either strictly inside another or strictly outside it.
    function VghLantern__SectionLoopBuilder__Classify(rawLoops) {
        var measured  =  [];
        var i, j, area, depth, isHole, points;

        for (i = 0; i < rawLoops.length; i++) {
            area  =  VghLantern__SectionLoopBuilder__SignedArea(rawLoops[i]);
            if (Math.abs(area) < MIN_LOOP_AREA_SQMM) continue;                // <-- Degenerate sliver, not a face
            measured.push({ Points : rawLoops[i], SignedArea : area });
        }

        for (i = 0; i < measured.length; i++) {
            depth  =  0;
            for (j = 0; j < measured.length; j++) {
                if (i === j) continue;
                if (VghLantern__SectionLoopBuilder__ContainsPoint(measured[j].Points, measured[i].Points[0].x, measured[i].Points[0].y)) depth++;
            }

            isHole  =  (depth % 2) === 1;
            points  =  measured[i].Points;

            // Force the winding the depth demands: solids counter-clockwise, holes clockwise.
            if (isHole === (measured[i].SignedArea > 0)) {
                points  =  points.slice().reverse();
                measured[i].SignedArea  =  -measured[i].SignedArea;
            }

            measured[i].Points   =  points;
            measured[i].Depth    =  depth;
            measured[i].IsHole   =  isHole;
            measured[i].AreaAbs  =  Math.abs(measured[i].SignedArea);
        }

        return measured;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hole Bridging
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Index of the Rightmost Vertex of a Loop
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__RightmostIndex(points) {
        var best  =  0;
        var i;

        for (i = 1; i < points.length; i++) {
            if (points[i].x > points[best].x) best  =  i;
        }
        return best;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Bridge Would Cross Any Edge
    // ------------------------------------------------------------
    // Segments sharing an endpoint with the bridge are skipped, since touching at
    // the join is the whole point of a bridge rather than a crossing.
    function VghLantern__SectionLoopBuilder__BridgeIsClear(fromPt, toPt, rings) {
        var r, points, i, j;

        for (r = 0; r < rings.length; r++) {
            points  =  rings[r];
            for (i = 0, j = points.length - 1; i < points.length; j = i++) {
                if (VghLantern__SectionLoopBuilder__SharesEndpoint(fromPt, toPt, points[j], points[i])) continue;
                if (VghLantern__SectionLoopBuilder__SegmentsCross(fromPt, toPt, points[j], points[i])) return false;
            }
        }
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether Two Segments Share Either Endpoint
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__SharesEndpoint(a1, a2, b1, b2) {
        return (a1.x === b1.x && a1.y === b1.y) || (a1.x === b2.x && a1.y === b2.y)
            || (a2.x === b1.x && a2.y === b1.y) || (a2.x === b2.x && a2.y === b2.y);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Proper Segment Intersection Test
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__SegmentsCross(a1, a2, b1, b2) {
        var d1  =  VghLantern__SectionLoopBuilder__Cross(b1, b2, a1);
        var d2  =  VghLantern__SectionLoopBuilder__Cross(b1, b2, a2);
        var d3  =  VghLantern__SectionLoopBuilder__Cross(a1, a2, b1);
        var d4  =  VghLantern__SectionLoopBuilder__Cross(a1, a2, b2);

        return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cross Product of Two Vectors From a Shared Origin
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__Cross(origin, a, b) {
        return ((a.x - origin.x) * (b.y - origin.y)) - ((a.y - origin.y) * (b.x - origin.x));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Splice Every Hole Into Its Outer Boundary
    // ------------------------------------------------------------
    // Ear clipping works on one simple polygon, so a boundary with holes has to
    // become one first. Each hole is joined to the boundary by a doubled-back
    // bridge, which leaves the face area unchanged and the polygon simple.
    //
    // Holes are taken rightmost-first and bridged to the nearest boundary vertex
    // that can see them. Doing the rightmost first means an already-spliced bridge
    // is on the correct side to be seen by the next hole, so a boundary with
    // several holes resolves without backtracking.
    //
    // ringPoints is the flat concatenation of the outer loop and every hole loop,
    // and every merged point carries the index it came from in that array. The
    // extruder needs this: it raises walls from the ORIGINAL loops, where each
    // edge appears exactly once, and caps them with the bridged triangulation.
    // Without the mapping it would have to raise walls from the bridged outline
    // instead, and the doubled-back bridge edges would each throw off a
    // zero-width wall - geometry that is invisible on screen and fatal to a
    // boolean.
    function VghLantern__SectionLoopBuilder__BridgeHoles(outerPoints, holeList, ringPoints) {
        var merged  =  [];
        var i;

        for (i = 0; i < outerPoints.length; i++) merged.push({ Point : outerPoints[i], Source : i });
        if (!holeList || holeList.length === 0) return merged;

        // Holes are addressed by their offset into the flat ring array, so sorting
        // carries the offset along with the points.
        var pending  =  [];
        var offset   =  outerPoints.length;
        var h;

        for (h = 0; h < holeList.length; h++) {
            pending.push({ Points : holeList[h], Offset : offset });
            offset  +=  holeList[h].length;
        }

        pending.sort(function(a, b) {
            return b.Points[VghLantern__SectionLoopBuilder__RightmostIndex(b.Points)].x
                 - a.Points[VghLantern__SectionLoopBuilder__RightmostIndex(a.Points)].x;
        });

        var hole, holeIndex, holePt, bestIndex, bestDist, dx, dy, dist, rotated, k, mergedPts;

        for (h = 0; h < pending.length; h++) {
            hole       =  pending[h].Points;
            holeIndex  =  VghLantern__SectionLoopBuilder__RightmostIndex(hole);
            holePt     =  hole[holeIndex];
            bestIndex  =  -1;
            bestDist   =  Infinity;

            mergedPts  =  [];
            for (i = 0; i < merged.length; i++) mergedPts.push(merged[i].Point);

            for (i = 0; i < merged.length; i++) {
                dx    =  merged[i].Point.x - holePt.x;
                dy    =  merged[i].Point.y - holePt.y;
                dist  =  (dx * dx) + (dy * dy);
                if (dist >= bestDist) continue;
                if (!VghLantern__SectionLoopBuilder__BridgeIsClear(holePt, merged[i].Point, [mergedPts, hole])) continue;

                bestDist   =  dist;
                bestIndex  =  i;
            }

            if (bestIndex === -1) continue;                                   // <-- No clear bridge: leave the hole out rather than corrupt the face

            // Rotate the hole so it starts and ends at the bridge point, then splice
            // it in after the boundary vertex, returning to that vertex afterwards.
            rotated  =  [];
            for (k = 0; k < hole.length; k++) {
                i  =  (holeIndex + k) % hole.length;
                rotated.push({ Point : hole[i], Source : pending[h].Offset + i });
            }
            rotated.push({ Point : holePt, Source : pending[h].Offset + holeIndex });

            merged  =  merged.slice(0, bestIndex + 1)
                .concat(rotated)
                .concat([{ Point : merged[bestIndex].Point, Source : merged[bestIndex].Source }])
                .concat(merged.slice(bestIndex + 1));
        }

        return merged;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Triangulation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Point Falls Inside a Triangle
    // ------------------------------------------------------------
    function VghLantern__SectionLoopBuilder__PointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
        var d1  =  ((px - bx) * (ay - by)) - ((ax - bx) * (py - by));
        var d2  =  ((px - cx) * (by - cy)) - ((bx - cx) * (py - cy));
        var d3  =  ((px - ax) * (cy - ay)) - ((cx - ax) * (py - ay));

        var hasNeg  =  (d1 < 0) || (d2 < 0) || (d3 < 0);
        var hasPos  =  (d1 > 0) || (d2 > 0) || (d3 > 0);

        return !(hasNeg && hasPos);
    }
    // ------------------------------------------------------------


    // FUNCTION | Ear Clip a Simple Counter-Clockwise Polygon
    // ------------------------------------------------------------
    // Returns a flat list of vertex index triples into the supplied point array.
    // Standard ear clipping: quadratic in the vertex count, which at 205 points -
    // the largest section in the glaze bar set - is a few thousand operations run
    // once per profile and then cached, so the simpler algorithm is the right
    // trade against a monotone decomposition nobody would want to maintain.
    //
    // The retry counter is the safety valve. A polygon that has been made
    // non-simple by a bad bridge would otherwise spin here forever; instead the
    // clip gives up and returns what it has, and the caller sees a short list.
    function VghLantern__SectionLoopBuilder__Triangulate(points) {
        var count  =  points.length;
        if (count < MIN_LOOP_VERTICES) return [];

        var indices  =  [];
        var i;
        for (i = 0; i < count; i++) indices.push(i);

        var triangles  =  [];
        var retries    =  0;
        var maxRetries =  count * 2;
        var prev, curr, next, ax, ay, bx, by, cx, cy, px, py, area, isEar, k, testIndex;

        while (indices.length > MIN_LOOP_VERTICES) {
            isEar  =  false;

            for (i = 0; i < indices.length; i++) {
                prev  =  indices[(i - 1 + indices.length) % indices.length];
                curr  =  indices[i];
                next  =  indices[(i + 1) % indices.length];

                ax  =  points[prev].x;  ay  =  points[prev].y;
                bx  =  points[curr].x;  by  =  points[curr].y;
                cx  =  points[next].x;  cy  =  points[next].y;

                area  =  ((bx - ax) * (cy - ay)) - ((by - ay) * (cx - ax));
                if (area <= MIN_EAR_AREA) continue;                           // <-- Reflex or collinear: not an ear

                // An ear must also be empty of every other vertex of the polygon.
                //
                // A vertex that merely sits ON a corner of the candidate is skipped
                // rather than counted as an occupant. Bridging a hole deliberately
                // duplicates two positions - the hole's bridge point and the
                // boundary vertex it joins - and a containment test that treats a
                // boundary touch as "inside" would reject every ear touching either
                // of them, which starves the clip and collapses the face.
                isEar  =  true;
                for (k = 0; k < indices.length; k++) {
                    testIndex  =  indices[k];
                    if (testIndex === prev || testIndex === curr || testIndex === next) continue;

                    px  =  points[testIndex].x;
                    py  =  points[testIndex].y;
                    if ((px === ax && py === ay) || (px === bx && py === by) || (px === cx && py === cy)) continue;

                    if (VghLantern__SectionLoopBuilder__PointInTriangle(ax, ay, bx, by, cx, cy, px, py)) {
                        isEar  =  false;
                        break;
                    }
                }

                if (!isEar) continue;

                triangles.push(prev, curr, next);
                indices.splice(i, 1);
                break;
            }

            if (isEar) { retries  =  0; continue; }

            // No ear found this sweep. Drop the sharpest vertex and try again, so a
            // single bad vertex costs one triangle rather than the whole face.
            if (++retries > maxRetries) break;
            indices.splice(0, 1);
        }

        if (indices.length === MIN_LOOP_VERTICES) {
            triangles.push(indices[0], indices[1], indices[2]);
        }

        return triangles;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build Faces From an Exported 2D View Path List
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     Faces : [ {
    //       Points     : [{x,y}]     flat vertex array: outer loop then each hole
    //       Rings      : [ { Start, Count, IsHole } ]  spans into Points
    //       Triangles  : [i,i,i,...] indices into Points, counter-clockwise
    //       AreaSqMm   : solid area of this face, net of its holes
    //       HoleCount  : number of holes bridged in
    //     } ],
    //     Loops     : [ { Points, SignedArea, IsHole, Depth } ],
    //     AreaSqMm  : total solid area across every face, net of holes,
    //     Warnings  : [ string ]
    //   }
    //
    // The vertex array and the ring spans are the contract that lets a consumer
    // build a closed solid: walls are raised ring by ring, where every edge occurs
    // exactly once, and the triangle list caps both ends over the same vertices.
    function VghLantern__SectionLoopBuilder__BuildFaces(pathList) {
        var warnings  =  [];

        if (!Array.isArray(pathList) || pathList.length === 0) {
            return { Faces : [], Loops : [], AreaSqMm : 0, Warnings : ['No paths supplied.'] };
        }

        var graph     =  VghLantern__SectionLoopBuilder__CollectSegments(pathList, warnings);
        var rawLoops  =  VghLantern__SectionLoopBuilder__WalkLoops(graph, warnings);
        var loops     =  VghLantern__SectionLoopBuilder__Classify(rawLoops);

        var faces     =  [];
        var totalArea =  0;
        var i, j, k, outer, holes, holeArea, ringPoints, rings, merged, mergedPts, triangles, mapped;

        for (i = 0; i < loops.length; i++) {
            if (loops[i].IsHole) continue;
            outer     =  loops[i];
            holes     =  [];
            holeArea  =  0;

            // A hole belongs to this boundary when it sits exactly one level deeper
            // and inside it. Anything deeper is an island within that hole and is
            // itself an outer boundary, picked up on its own pass.
            for (j = 0; j < loops.length; j++) {
                if (!loops[j].IsHole) continue;
                if (loops[j].Depth !== outer.Depth + 1) continue;
                if (!VghLantern__SectionLoopBuilder__ContainsPoint(outer.Points, loops[j].Points[0].x, loops[j].Points[0].y)) continue;
                holes.push(loops[j].Points);
                holeArea  +=  loops[j].AreaAbs;
            }

            // Flat vertex array and the ring spans that index into it.
            ringPoints  =  outer.Points.slice();
            rings       =  [{ Start : 0, Count : outer.Points.length, IsHole : false }];
            for (j = 0; j < holes.length; j++) {
                rings.push({ Start : ringPoints.length, Count : holes[j].length, IsHole : true });
                for (k = 0; k < holes[j].length; k++) ringPoints.push(holes[j][k]);
            }

            merged     =  VghLantern__SectionLoopBuilder__BridgeHoles(outer.Points, holes, ringPoints);
            mergedPts  =  [];
            for (j = 0; j < merged.length; j++) mergedPts.push(merged[j].Point);

            triangles  =  VghLantern__SectionLoopBuilder__Triangulate(mergedPts);
            if (triangles.length === 0) {
                warnings.push('A boundary of ' + outer.Points.length + ' vertices produced no triangles.');
                continue;
            }

            // Re-index the triangulation off the bridged outline and back onto the
            // flat ring array, so caps and walls address one shared vertex set.
            mapped  =  [];
            for (j = 0; j < triangles.length; j++) mapped.push(merged[triangles[j]].Source);

            faces.push({
                Points     : ringPoints,
                Rings      : rings,
                Triangles  : mapped,
                AreaSqMm   : outer.AreaAbs - holeArea,
                HoleCount  : holes.length
            });
            totalArea  +=  outer.AreaAbs - holeArea;
        }

        if (faces.length === 0) warnings.push('No closed boundary could be built from this path list.');

        return { Faces : faces, Loops : loops, AreaSqMm : totalArea, Warnings : warnings };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Faces From a Whole Asset Document's Named View
    // ------------------------------------------------------------
    // Convenience wrapper. viewKey defaults to the top plan, which is the view a
    // swept section is authored in: the bar runs vertically in the source model,
    // so looking down it gives the cross-section.
    function VghLantern__SectionLoopBuilder__BuildFacesFromAsset(assetJson, viewKey) {
        var key   =  viewKey || 'Na__Asset__Plan2D__Top';
        var view  =  assetJson && assetJson[key];

        if (!view) {
            return { Faces : [], Loops : [], AreaSqMm : 0, Warnings : ['Asset has no "' + key + '" block.'] };
        }
        return VghLantern__SectionLoopBuilder__BuildFaces(view['Na__Geometry__Paths']);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SectionLoopBuilder__BuildFaces           : VghLantern__SectionLoopBuilder__BuildFaces,
        VghLantern__SectionLoopBuilder__BuildFacesFromAsset  : VghLantern__SectionLoopBuilder__BuildFacesFromAsset,
        VghLantern__SectionLoopBuilder__Triangulate          : VghLantern__SectionLoopBuilder__Triangulate,
        VghLantern__SectionLoopBuilder__SignedArea           : VghLantern__SectionLoopBuilder__SignedArea
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__SectionLoopBuilder  =  VghLantern__Geometry__SectionLoopBuilder;
