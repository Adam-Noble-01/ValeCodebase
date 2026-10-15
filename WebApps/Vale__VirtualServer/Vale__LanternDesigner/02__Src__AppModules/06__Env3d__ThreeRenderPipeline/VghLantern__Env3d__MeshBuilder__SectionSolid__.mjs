/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - SECTION SOLID
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__SectionSolid__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder SectionSolid
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Extrude a stitched section along a member as a closed manifold solid
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - The extruder every Vale swept assembly is built on. It was written inside
     the glaze bar composite, and now that the ridge and the hip need the same
     construction it lives here instead of being copied twice.
   - Takes a SectionLoopBuilder face, a start and end point already in world
     space, and an optional cut plane per end, and appends a closed solid to a
     shared position and index buffer.
   - Pure geometry construction. No scene access, no materials, no config beyond
     the millimetre-to-world scale.

   ---------------------------------------------------------------------------

   WHY THIS DOES NOT USE THREE.ExtrudeGeometry

   ExtrudeGeometry emits unwelded triangles with the cap vertices separate from
   the wall vertices, so the result is a shell that renders correctly and is not
   a solid: no edge is shared, so nothing downstream can tell inside from
   outside.

   That matters because these solids get cut. The cutting list this tool exists
   to produce comes from booleans against the hip, the ridge and the block, and a
   boolean against a shell either fails outright or silently returns the wrong
   volume - which would surface as a specification table quietly under-reporting
   a length nobody re-measures.

   So the geometry is assembled by hand: one vertex per section point per end,
   walls raised ring by ring, both ends capped over those same vertices. Every
   edge is shared by exactly two triangles and every normal points out.

   ---------------------------------------------------------------------------

   THE SECTION FRAME

   Every Vale section - glaze bar, base frame, interior joinery, ridge and hip -
   is authored in the same convention, taken from the asset's Top Plan view of a
   member modelled running vertically:

       section +x  ->  across the member
       section +y  ->  out through the roof
       section  0  ->  the member's datum, ON its skeleton polyline

   Because the frame is shared, an assembly's parts fit with no fitting, and this
   module needs to know nothing about which assembly it is extruding.

   ---------------------------------------------------------------------------

   END PLANES, WHICH IS WHAT A PLUMB CUT IS

   An end with no plane is cut square across the member's own axis. An end WITH
   one has every vertex of its ring slid along the member axis onto that plane,
   so vertices at different section depths land at different stations. On a
   sloping member cut by a vertical plane that is exactly a plumb cut: the
   joiner's cut, not the sawbench's.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Section Solid Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Geometry Guards
    // ------------------------------------------------------------
    const MIN_MEMBER_LENGTH_MM  =  0.5;                                      // <-- Below this a member is degenerate
    const VERTICAL_DOT_LIMIT    =  0.999;                                    // <-- Above this a member is effectively vertical
    const MIN_SECTION_POINTS    =  3;                                        // <-- A section needs at least a triangle
    const PLANE_PARALLEL_LIMIT  =  1e-6;                                     // <-- Below this the member runs along the cut plane
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Orientation
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Orientation Basis for a Member
    // ------------------------------------------------------------
    // Local Z runs along the member, local Y is its up direction and local X is
    // across it. World up projected perpendicular to the member is what makes a
    // common rafter, a hip and a level ridge all read correctly without any of
    // them being a special case: on a sloping member that projection is the
    // slope normal, which is exactly where a cap has to point.
    //
    // Members that are exactly vertical fall back to the model depth axis for
    // their up reference, since world up gives them nothing to cross with.
    export function VghLantern__Env3d__SectionSolid__MemberBasis(startVec, endVec) {
        const along    =  new THREE.Vector3().subVectors(endVec, startVec).normalize();
        const worldUp  =  new THREE.Vector3(0, 1, 0);

        const upReference  =  Math.abs(along.dot(worldUp)) > VERTICAL_DOT_LIMIT
            ? new THREE.Vector3(0, 0, -1)
            : worldUp;

        const across  =  new THREE.Vector3().crossVectors(upReference, along).normalize();
        const up      =  new THREE.Vector3().crossVectors(along, across).normalize();

        return { Along : along, Across : across, Up : up };
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a Model-Space Cut Plane to World Space
    // ------------------------------------------------------------
    // Point takes the standard mm-to-world axis swap. The normal takes the swap
    // without scaling: a model normal (x, y, 0) lands as world (x, 0, -y) and
    // stays unit length.
    export function VghLantern__Env3d__SectionSolid__PlaneToWorld(planeMm) {
        if (!planeMm) return null;

        const pointWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(planeMm.Point);
        return {
            Point  : new THREE.Vector3(pointWorld.x, pointWorld.y, pointWorld.z),
            Normal : new THREE.Vector3(planeMm.Normal.x, planeMm.Normal.z, -planeMm.Normal.y)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a Pair of Model-Space Cut Planes to World Space
    // ------------------------------------------------------------
    // Convenience for the { Start, End } shape every assembly's end treatments
    // answer in. A null pair passes straight through as null.
    export function VghLantern__Env3d__SectionSolid__PlanesToWorld(planesMm) {
        if (!planesMm) return null;

        return {
            Start : planesMm.Start ? VghLantern__Env3d__SectionSolid__PlaneToWorld(planesMm.Start) : null,
            End   : planesMm.End   ? VghLantern__Env3d__SectionSolid__PlaneToWorld(planesMm.End)   : null
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifold Solid Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cumulative Perimeter Distance at Every Section Vertex
    // ------------------------------------------------------------
    // Returns one distance per vertex of the flat ring array, in world units,
    // restarting at zero for each ring. This is the texture U coordinate:
    // walking it round the section lays the map across the member rather than
    // along it.
    //
    // The seam where a ring closes does not line up with a whole texture repeat,
    // so a fine grain shows one discontinuity somewhere on the perimeter. It
    // lands on an arris, where an extrusion's die lines genuinely do break.
    function VghLantern__Env3d__SectionSolid__PerimeterDistances(face) {
        const points    =  face.Points;
        const distances =  new Array(points.length).fill(0);
        let r, ring, k, index, previous, running, dx, dy;

        for (r = 0; r < face.Rings.length; r++) {
            ring     =  face.Rings[r];
            running  =  0;

            for (k = 0; k < ring.Count; k++) {
                index  =  ring.Start + k;

                if (k > 0) {
                    previous  =  ring.Start + k - 1;
                    dx  =  points[index].x - points[previous].x;
                    dy  =  points[index].y - points[previous].y;
                    running  +=  VghLantern__Env3d__ConfigAccess__MmToWorld(Math.sqrt((dx * dx) + (dy * dy)));
                }
                distances[index]  =  running;
            }
        }

        return distances;
    }
    // ------------------------------------------------------------


    // FUNCTION | Extrude One Section Face Into a Closed Manifold Solid
    // ------------------------------------------------------------
    // face is a SectionLoopBuilder face: a flat vertex array, ring spans into it,
    // and a counter-clockwise triangulation addressing those same vertices.
    //
    // Vertex layout is two rings of the section, the near end first:
    //     index i          section point i at the start of the member
    //     index i + count  the same point at the end of the member
    // Walls are raised between them ring by ring, so every section edge appears
    // exactly once and produces exactly one quad. Both ends are then capped over
    // those same vertices, the near end wound backwards so it faces outwards.
    //
    // Appends to the caller's buffers and returns the TRIANGLE COUNT contributed,
    // which is what lets a raycast hit on a merged buffer still name the member
    // it landed on.
    //
    // datumOffsetMm shifts the whole section along its +y, for the rare case of a
    // part whose datum is not the one its asset was authored about. Every current
    // caller passes zero.
    export function VghLantern__Env3d__SectionSolid__Build(face, startVec, endVec, targetPositions, targetIndices, targetUvs, endPlanes, datumOffsetMm) {
        const points  =  face.Points;
        const count   =  points.length;
        if (count < MIN_SECTION_POINTS) return 0;

        const basis        =  VghLantern__Env3d__SectionSolid__MemberBasis(startVec, endVec);
        const baseIx       =  targetPositions.length / 3;
        const lengthWorld  =  startVec.distanceTo(endVec);
        const datumOffset  =  Number(datumOffsetMm) || 0;

        const planes  =  [
            endPlanes && endPlanes.Start ? endPlanes.Start : null,
            endPlanes && endPlanes.End   ? endPlanes.End   : null
        ];

        // PERIMETER DISTANCE ROUND THE SECTION
        // Used as the U coordinate below, measured in world units so a texture
        // repeat is tiles per world unit and the grain holds its real size on a
        // member of any length. Measured per ring, because each ring is a closed
        // loop in its own right.
        const perimeter  =  VghLantern__Env3d__SectionSolid__PerimeterDistances(face);

        // BOTH RINGS OF VERTICES
        // Section x runs along the member's across axis, section y along its up
        // axis, and the ring is placed at whichever end it belongs to.
        //
        // UVs put U across the section and V along the member. A texture that
        // varies in U and holds steady in V therefore lands as lines running the
        // length of the member - which is what an extrusion's die lines are, and
        // why the brushed grain needs no special mapping to sit the right way
        // round.
        const ends  =  [startVec, endVec];
        let e, i, sx, sy, origin, px, py, pz, plane, denominator, slide;

        for (e = 0; e < ends.length; e++) {
            origin  =  ends[e];
            plane   =  planes[e];

            for (i = 0; i < count; i++) {
                sx  =  VghLantern__Env3d__ConfigAccess__MmToWorld(points[i].x);
                sy  =  VghLantern__Env3d__ConfigAccess__MmToWorld(points[i].y + datumOffset);

                px  =  origin.x + (basis.Across.x * sx) + (basis.Up.x * sy);
                py  =  origin.y + (basis.Across.y * sx) + (basis.Up.y * sy);
                pz  =  origin.z + (basis.Across.z * sx) + (basis.Up.z * sy);

                // PLANE-CUT END - slide the vertex along the member axis onto the
                // cut plane. Vertices at different section depths land at
                // different stations, which is what makes the cut face read plumb
                // rather than square.
                if (plane) {
                    denominator  =  (basis.Along.x * plane.Normal.x)
                                 +  (basis.Along.y * plane.Normal.y)
                                 +  (basis.Along.z * plane.Normal.z);
                    if (Math.abs(denominator) > PLANE_PARALLEL_LIMIT) {
                        slide  =  (((plane.Point.x - px) * plane.Normal.x)
                                +  ((plane.Point.y - py) * plane.Normal.y)
                                +  ((plane.Point.z - pz) * plane.Normal.z)) / denominator;
                        px  +=  basis.Along.x * slide;
                        py  +=  basis.Along.y * slide;
                        pz  +=  basis.Along.z * slide;
                    }
                }

                targetPositions.push(px, py, pz);
                targetUvs.push(perimeter[i], e === 0 ? 0 : lengthWorld);
            }
        }

        // WALLS, ONE RING AT A TIME
        // Winding follows from the section winding, which SectionLoopBuilder has
        // already normalised: outer rings counter-clockwise, holes clockwise. The
        // same quad order therefore faces outwards on a boundary and inwards on a
        // hole, which is outwards from the solid in both cases.
        let r, ring, k, currentIx, nextIx, near0, near1, far0, far1;

        for (r = 0; r < face.Rings.length; r++) {
            ring  =  face.Rings[r];

            for (k = 0; k < ring.Count; k++) {
                currentIx  =  ring.Start + k;
                nextIx     =  ring.Start + ((k + 1) % ring.Count);

                near0  =  baseIx + currentIx;
                near1  =  baseIx + nextIx;
                far0   =  near0  + count;
                far1   =  near1  + count;

                targetIndices.push(near0, near1, far1);
                targetIndices.push(near0, far1,  far0);
            }
        }

        // END CAPS OVER THE SAME VERTICES
        // The far end takes the triangulation as authored. The near end takes it
        // reversed, so its normal points back down the member rather than into it.
        const triangles  =  face.Triangles;
        let t;

        for (t = 0; t < triangles.length; t += 3) {
            targetIndices.push(
                baseIx + triangles[t + 2],
                baseIx + triangles[t + 1],
                baseIx + triangles[t]
            );
            targetIndices.push(
                baseIx + count + triangles[t],
                baseIx + count + triangles[t + 1],
                baseIx + count + triangles[t + 2]
            );
        }

        return ((face.Rings.reduce(function(sum, span) { return sum + span.Count; }, 0)) * 2)
             + ((triangles.length / 3) * 2);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Merged Member Set Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Extrude One Section Along Many Runs and Merge the Result
    // ------------------------------------------------------------
    // runs is a list of { Record, StartMm, EndMm, Planes }:
    //     Record   whatever the caller wants a raycast hit to name
    //     StartMm  model-space millimetre end points, already carrying whatever
    //     EndMm    extension or shortening the assembly's end treatments called
    //              for
    //     Planes   optional { Start, End } cut planes in MODEL space
    //
    // One buffer for the whole set rather than one mesh per run. Four hips times
    // four parts would otherwise be sixteen draw calls for geometry sharing four
    // materials, and a divided lantern already carries dozens of glaze bars.
    //
    // memberSpansOut is filled with the triangle span each run occupies, so a
    // raycast hit on the merged buffer can still name the individual member.
    // Degenerate runs are absent from it, exactly as they are from the buffer.
    export function VghLantern__Env3d__SectionSolid__BuildRunSetMesh(faces, runs, material, meshName, memberSpansOut, datumOffsetMm) {
        if (!Array.isArray(faces) || faces.length === 0) return null;
        if (!Array.isArray(runs)  || runs.length  === 0) return null;

        const positions  =  [];
        const indices    =  [];
        const uvs        =  [];
        const minLength  =  VghLantern__Env3d__ConfigAccess__MmToWorld(MIN_MEMBER_LENGTH_MM);

        let r, f, run, startWorld, endWorld, startVec, endVec, planesWorld, spanCount;
        let triangleCursor  =  0;

        for (r = 0; r < runs.length; r++) {
            run  =  runs[r];
            if (!run || !run.StartMm || !run.EndMm) continue;

            startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(run.StartMm);
            endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(run.EndMm);
            startVec    =  new THREE.Vector3(startWorld.x, startWorld.y, startWorld.z);
            endVec      =  new THREE.Vector3(endWorld.x,   endWorld.y,   endWorld.z);

            if (startVec.distanceTo(endVec) < minLength) continue;             // <-- Degenerate run, absent from the buffer and from the spans

            planesWorld  =  VghLantern__Env3d__SectionSolid__PlanesToWorld(run.Planes);

            spanCount  =  0;
            for (f = 0; f < faces.length; f++) {
                spanCount  +=  VghLantern__Env3d__SectionSolid__Build(
                    faces[f], startVec, endVec, positions, indices, uvs, planesWorld, datumOffsetMm);
            }
            if (spanCount === 0) continue;

            if (Array.isArray(memberSpansOut)) {
                memberSpansOut.push({ Record : run.Record, SpanStart : triangleCursor, SpanCount : spanCount });
            }
            triangleCursor  +=  spanCount;
        }

        if (indices.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));       // <-- U across the section, V along the member, both in world units
        geometry.setIndex(indices);
        geometry.computeVertexNormals();                                       // <-- Smooth normals; the part materials shade flat, so hard arrises survive
        geometry.computeBoundingSphere();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName || 'VghLantern__Env3d__SectionSolidSet';
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
