/* =============================================================================
   VGHLANTERN - CROSS SECTION VIEW | CAP GEOMETRY ENGINE
   =============================================================================

   FILE       : VghLantern__CrossSection__CapGeometry__.mjs
   NAMESPACE  : VghLantern
   MODULE     : CrossSection - CapGeometry
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compute boolean-style cap fills and clean profile loops for a plane
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Ported from ValeVision3D Na__CrossSectionView__CapGeometry.js, which is the
     proven implementation of the three.js "geometric section cap" technique:
     iterate every model triangle, intersect it with the section plane, collect the
     resulting contour segments, weld them into closed loops, then triangulate the
     loops (with holes) through THREE.ShapeUtils so the cut reads as a true boolean
     rather than as an open shell.
   - Interior clutter removal: contour segments are ORIENTED from each source
     triangle's facing. Where two solids touch - a glazing bar sitting on a base
     ring, a finial seated on a ridge - the coincident contact faces emit the same
     segment in opposite directions and those cancel in the weld stage, leaving
     only the true outer boundary of each cut island. That is what produces the
     SketchUp-style clean section with no internal linework.
   - Loops are classified by even-odd nesting: even depth is a solid outline, odd
     depth is a hole, which is what puts the void inside a hollow extrusion back on
     screen as a void rather than filling it in.
   - All maths is done in a 2D basis on the plane, and signed distances are
     evaluated in each mesh's LOCAL space, so vertices are only ever transformed
     when their triangle actually crosses the plane. That is what keeps a full
     lantern recompute inside a single frame without needing a BVH.

   ---------------------------------------------------------------------------

   DIFFERENCES FROM THE VALEVISION ORIGINAL

   - Takes an ARRAY of scene-graph roots rather than one model root, because this
     application keeps its solid geometry in three sibling groups (frame, glazing,
     components) and must never cut the helpers, the setting-out linework or the
     hover highlight.
   - The linework-GLB exclusion is gone; the equivalent here is the fat-line test,
     because LineSegments2 extends Mesh and would otherwise be sliced as though it
     were solid.

   - Returns plain typed arrays. This module creates no meshes and owns no
     materials - CapFactory does that.

   ============================================================================= */

import * as THREE from 'three';

// =============================================================================
// REGION | Cross Section Cap Geometry Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Numeric Tolerances
    // ------------------------------------------------------------
    // Only the epsilon lives here. Weld tolerance, minimum loop area and the
    // segment ceiling are config values and arrive through the options argument.
    const DIST_EPSILON  =  1e-9;                                             // <-- Signed distances snapped off exact zero, avoiding degenerate on-plane cases
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Basis Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Build an Orthonormal 2D Basis on a Plane
    // ------------------------------------------------------------
    // u and v span the plane, origin is the plane point closest to world zero.
    // Exported so anything that needs to reason in the plane's own coordinates
    // uses the same axes the caps were built in.
    export function VghLantern__CrossSection__CapGeometry__PlaneBasis(plane) {
        const n       =  plane.normal;                                       // <-- Unit normal, pointing at the KEPT half space
        const helper  =  (Math.abs(n.y) < 0.9)
            ? new THREE.Vector3(0, 1, 0)                                     // <-- World up for an upright section plane
            : new THREE.Vector3(1, 0, 0);                                    // <-- Fallback for a horizontal (plan) cut

        const u       =  new THREE.Vector3().crossVectors(helper, n).normalize();  // <-- In-plane "right" axis
        const v       =  new THREE.Vector3().crossVectors(n, u);                   // <-- In-plane "up" axis, orthonormal by construction
        const origin  =  n.clone().multiplyScalar(-plane.constant);                // <-- Point on the plane closest to the world origin

        return { u : u, v : v, n : n.clone(), origin : origin };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mesh Eligibility Filtering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether an Object Is One of This System's Own Helpers
    // ------------------------------------------------------------
    // Walks the parent chain so a cap or outline nested under the section group
    // is excluded whether it is tested directly or reached by descent.
    function VghLantern__CrossSection__CapGeometry__IsHelper(object3d) {
        let node  =  object3d;

        while (node) {
            if (node.userData && node.userData.VghLantern__CrossSection__Helper === true) return true;
            node  =  node.parent;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collect Cut-Eligible Meshes, Respecting Visibility
    // ------------------------------------------------------------
    // Recursive descent carrying the ancestor visibility flag, so a member hidden
    // by a display mode never contributes a cut face to the section.
    //
    // LineSegments2 and Line2 are excluded explicitly because both extend Mesh.
    // Without that test the setting-out linework would be sliced as though it were
    // solid and would emit contour segments from its camera-facing quads.
    function VghLantern__CrossSection__CapGeometry__CollectMeshes(roots) {
        const meshes  =  [];

        function visit(object3d) {
            if (!object3d.visible) return;                                   // <-- Hidden branch, skip the whole subtree
            if (VghLantern__CrossSection__CapGeometry__IsHelper(object3d)) return;

            if (object3d.isMesh && !object3d.isLine2 && !object3d.isLineSegments2) {
                meshes.push(object3d);
            }

            const children  =  object3d.children;
            for (let i = 0; i < children.length; i++) visit(children[i]);
        }

        for (let r = 0; r < roots.length; r++) {
            if (roots[r]) visit(roots[r]);
        }
        return meshes;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Triangle to Plane Segment Extraction
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Scratch Objects for the Allocation-Free Hot Loop
    // ------------------------------------------------------------
    const SCRATCH_PLANE    =  new THREE.Plane();
    const SCRATCH_MATRIX   =  new THREE.Matrix4();
    const SCRATCH_SPHERE   =  new THREE.Sphere();
    const SCRATCH_VEC_A    =  new THREE.Vector3();
    const SCRATCH_VEC_B    =  new THREE.Vector3();
    const SCRATCH_VEC_C    =  new THREE.Vector3();
    const SCRATCH_EDGE_1   =  new THREE.Vector3();
    const SCRATCH_EDGE_2   =  new THREE.Vector3();
    const SCRATCH_NORMAL   =  new THREE.Vector3();
    const SCRATCH_TANGENT  =  new THREE.Vector3();
    const SCRATCH_HIT_1    =  new THREE.Vector3();
    const SCRATCH_HIT_2    =  new THREE.Vector3();
    const SCRATCH_DELTA    =  new THREE.Vector3();
    // ------------------------------------------------------------


    // SUB FUNCTION | Extract Oriented Intersection Segments From One Mesh
    // ------------------------------------------------------------
    // Signed distances are computed against the plane pulled back into the mesh's
    // local space, which is sign-exact under any affine transform, and only the few
    // crossing triangles are then lifted to world space. Each segment is oriented
    // by cross(triangleNormal, planeNormal) in WORLD space so that opposing contact
    // faces cancel later in the weld stage.
    //
    // Segments are appended to outSegments as four floats - x1, y1, x2, y2 - in the
    // plane's own 2D coordinates. Returns false when the segment ceiling is hit.
    function VghLantern__CrossSection__CapGeometry__ExtractMeshSegments(mesh, plane, basis, outSegments, maxSegments) {
        const geometry  =  mesh.geometry;
        if (!geometry || !geometry.attributes || !geometry.attributes.position) return true;

        // BROAD PHASE | World bounding sphere against the plane distance
        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
        if (geometry.boundingSphere !== null) {
            SCRATCH_SPHERE.copy(geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);
            if (Math.abs(plane.distanceToPoint(SCRATCH_SPHERE.center)) > SCRATCH_SPHERE.radius) {
                return true;                                                 // <-- Mesh sits entirely on one side, so it has no cut face
            }
        }

        // LOCAL SPACE PLANE | Pull the world plane back through the inverse world matrix
        SCRATCH_MATRIX.copy(mesh.matrixWorld).invert();
        SCRATCH_PLANE.copy(plane).applyMatrix4(SCRATCH_MATRIX);
        const localNormal    =  SCRATCH_PLANE.normal;
        const localConstant  =  SCRATCH_PLANE.constant;

        const positionAttr  =  geometry.attributes.position;
        const indexAttr     =  geometry.index;
        const vertexCount   =  positionAttr.count;

        // SIGNED DISTANCES | One per unique vertex, snapped off exact zero
        const distances  =  new Float32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            let d  =  localNormal.x * positionAttr.getX(i)
                    + localNormal.y * positionAttr.getY(i)
                    + localNormal.z * positionAttr.getZ(i)
                    + localConstant;
            if (d > -DIST_EPSILON && d < DIST_EPSILON) d  =  DIST_EPSILON;   // <-- On-plane vertices are treated as kept side
            distances[i]  =  d;
        }

        const triangleCount  =  indexAttr ? (indexAttr.count / 3) : (vertexCount / 3);
        const worldMatrix    =  mesh.matrixWorld;
        const u              =  basis.u;
        const v              =  basis.v;
        const origin         =  basis.origin;
        const planeNormal    =  basis.n;

        for (let t = 0; t < triangleCount; t++) {
            const ia  =  indexAttr ? indexAttr.getX(t * 3)     : t * 3;
            const ib  =  indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
            const ic  =  indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

            const da  =  distances[ia];
            const db  =  distances[ib];
            const dc  =  distances[ic];

            const sa  =  da > 0;
            const sb  =  db > 0;
            const sc  =  dc > 0;
            if (sa === sb && sb === sc) continue;                            // <-- All three vertices one side, no crossing

            // CROSSING TRIANGLE | Gather the world space vertices
            SCRATCH_VEC_A.fromBufferAttribute(positionAttr, ia).applyMatrix4(worldMatrix);
            SCRATCH_VEC_B.fromBufferAttribute(positionAttr, ib).applyMatrix4(worldMatrix);
            SCRATCH_VEC_C.fromBufferAttribute(positionAttr, ic).applyMatrix4(worldMatrix);

            // EDGE INTERSECTIONS | Exactly two edges cross the plane
            let hitCount  =  0;
            const edges  =  [
                [SCRATCH_VEC_A, SCRATCH_VEC_B, da, db],
                [SCRATCH_VEC_B, SCRATCH_VEC_C, db, dc],
                [SCRATCH_VEC_C, SCRATCH_VEC_A, dc, da]
            ];
            for (let e = 0; e < 3 && hitCount < 2; e++) {
                const p1  =  edges[e][0];
                const p2  =  edges[e][1];
                const d1  =  edges[e][2];
                const d2  =  edges[e][3];
                if ((d1 > 0) === (d2 > 0)) continue;                         // <-- This edge does not cross

                const fraction  =  d1 / (d1 - d2);                           // <-- Zero-crossing parameter along the edge
                const target    =  (hitCount === 0) ? SCRATCH_HIT_1 : SCRATCH_HIT_2;
                target.copy(p1).lerp(p2, fraction);
                hitCount++;
            }
            if (hitCount !== 2) continue;                                    // <-- Defensive: degenerate triangle

            // ORIENTATION | Segment direction follows cross(triangleNormal, planeNormal)
            SCRATCH_EDGE_1.subVectors(SCRATCH_VEC_B, SCRATCH_VEC_A);
            SCRATCH_EDGE_2.subVectors(SCRATCH_VEC_C, SCRATCH_VEC_A);
            SCRATCH_NORMAL.crossVectors(SCRATCH_EDGE_1, SCRATCH_EDGE_2);
            SCRATCH_TANGENT.crossVectors(SCRATCH_NORMAL, planeNormal);
            SCRATCH_DELTA.subVectors(SCRATCH_HIT_2, SCRATCH_HIT_1);

            let h1  =  SCRATCH_HIT_1;
            let h2  =  SCRATCH_HIT_2;
            if (SCRATCH_DELTA.dot(SCRATCH_TANGENT) < 0) {
                h1  =  SCRATCH_HIT_2;                                        // <-- Swapped to enforce consistent winding
                h2  =  SCRATCH_HIT_1;
            }

            // PROJECT INTO PLANE 2D | (point - origin) dotted with u and v
            const r1x  =  h1.x - origin.x, r1y = h1.y - origin.y, r1z = h1.z - origin.z;
            const r2x  =  h2.x - origin.x, r2y = h2.y - origin.y, r2z = h2.z - origin.z;
            outSegments.push(
                r1x * u.x + r1y * u.y + r1z * u.z,
                r1x * v.x + r1y * v.y + r1z * v.z,
                r2x * u.x + r2y * u.y + r2z * u.z,
                r2x * v.x + r2y * v.y + r2z * v.z
            );

            if (outSegments.length / 4 > maxSegments) return false;          // <-- Safety abort, model exceeds the live budget
        }

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Segment Welding, Cancellation and Loop Chaining
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Weld Segments and Cancel Opposing Duplicates
    // ------------------------------------------------------------
    // Endpoints are quantised to a weld grid. Identical opposite-direction segments
    // - the contact face between two touching solids - annihilate, and identical
    // same-direction segments - coincident coplanar skins - collapse to one.
    // Output is a point table plus the surviving directed segments.
    function VghLantern__CrossSection__CapGeometry__WeldAndCancel(segments, weldTolerance) {
        const inverseTolerance  =  1 / weldTolerance;
        const keyToId           =  new Map();                                // <-- Quantised coordinate key to point id
        const pointsX           =  [];
        const pointsY           =  [];
        const segmentCounts     =  new Map();                                // <-- Directed "a>b" key to multiplicity

        function pointId(x, y) {
            const qx   =  Math.round(x * inverseTolerance);
            const qy   =  Math.round(y * inverseTolerance);
            const key  =  qx + '|' + qy;

            let id  =  keyToId.get(key);
            if (id === undefined) {
                id  =  pointsX.length;
                keyToId.set(key, id);
                pointsX.push(qx * weldTolerance);                            // <-- Snapped coordinates stored, for stability downstream
                pointsY.push(qy * weldTolerance);
            }
            return id;
        }

        for (let i = 0; i < segments.length; i += 4) {
            const a  =  pointId(segments[i],     segments[i + 1]);
            const b  =  pointId(segments[i + 2], segments[i + 3]);
            if (a === b) continue;                                           // <-- Degenerate once quantised

            const reverseKey    =  b + '>' + a;
            const reverseCount  =  segmentCounts.get(reverseKey);
            if (reverseCount > 0) {
                if (reverseCount === 1) segmentCounts.delete(reverseKey);    // <-- Opposing pair annihilates, an interior edge
                else segmentCounts.set(reverseKey, reverseCount - 1);
                continue;
            }

            const forwardKey  =  a + '>' + b;
            segmentCounts.set(forwardKey, (segmentCounts.get(forwardKey) || 0) + 1);
        }

        return { pointsX : pointsX, pointsY : pointsY, segmentCounts : segmentCounts };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Chain Surviving Segments Into Closed Loops
    // ------------------------------------------------------------
    function VghLantern__CrossSection__CapGeometry__ChainLoops(pointsX, pointsY, segmentCounts) {
        const adjacency  =  new Map();                                       // <-- Point id to array of destination ids

        for (const key of segmentCounts.keys()) {
            const separator  =  key.indexOf('>');
            const a          =  Number(key.slice(0, separator));
            const b          =  Number(key.slice(separator + 1));

            let list  =  adjacency.get(a);
            if (!list) { list = []; adjacency.set(a, list); }
            list.push(b);
        }

        const loops  =  [];
        let openChainCount  =  0;

        for (const entry of adjacency) {
            const startId    =  entry[0];
            const startList  =  entry[1];

            while (startList.length > 0) {
                const loopIds  =  [startId];
                let current    =  startList.pop();
                loopIds.push(current);
                let closed  =  false;

                for (let guard = 0; guard < 200000; guard++) {
                    if (current === startId) { closed = true; break; }       // <-- Walked back to the start, a closed loop
                    const nextList  =  adjacency.get(current);
                    if (!nextList || nextList.length === 0) break;           // <-- Dead end, an open chain and discarded
                    current  =  nextList.pop();
                    loopIds.push(current);
                }

                if (!closed || loopIds.length < 4) {                         // <-- A closed loop repeats its start, so a triangle is four ids
                    openChainCount++;
                    continue;
                }

                loopIds.pop();                                               // <-- Drop the repeated start id
                const points  =  new Array(loopIds.length);
                for (let i = 0; i < loopIds.length; i++) {
                    points[i]  =  { x : pointsX[loopIds[i]], y : pointsY[loopIds[i]] };
                }
                loops.push(points);
            }
        }

        return { loops : loops, openChainCount : openChainCount };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loop Classification and Triangulation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Shoelace Signed Area of a Loop
    // ------------------------------------------------------------
    function VghLantern__CrossSection__CapGeometry__SignedArea(points) {
        let area  =  0;

        for (let i = 0, len = points.length; i < len; i++) {
            const p1  =  points[i];
            const p2  =  points[(i + 1) % len];
            area  +=  (p1.x * p2.y) - (p2.x * p1.y);
        }
        return area * 0.5;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Even-Odd Point In Polygon Test
    // ------------------------------------------------------------
    function VghLantern__CrossSection__CapGeometry__PointInLoop(px, py, points) {
        let inside  =  false;

        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi  =  points[i].x, yi = points[i].y;
            const xj  =  points[j].x, yj = points[j].y;
            const crosses  =  ((yi > py) !== (yj > py))
                && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
            if (crosses) inside  =  !inside;
        }
        return inside;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Classify Loop Nesting and Triangulate the Fills
    // ------------------------------------------------------------
    // Even nesting depth is a solid outline, odd depth is a hole. Each hole is
    // assigned to its smallest containing loop, then every outer loop is earcut
    // triangulated with its own holes through THREE.ShapeUtils.
    function VghLantern__CrossSection__CapGeometry__TriangulateLoops(loops, minLoopArea) {
        const kept  =  [];

        for (let i = 0; i < loops.length; i++) {
            const area  =  VghLantern__CrossSection__CapGeometry__SignedArea(loops[i]);
            if (Math.abs(area) < minLoopArea) continue;                      // <-- Discard sliver loops
            kept.push({ Points : loops[i], Area : area, Depth : 0, Parent : -1 });
        }

        // NESTING DEPTH | Counted by testing one representative vertex per loop
        for (let i = 0; i < kept.length; i++) {
            const sample  =  kept[i].Points[0];
            let depth       =  0;
            let parent      =  -1;
            let parentArea  =  Infinity;

            for (let j = 0; j < kept.length; j++) {
                if (i === j) continue;
                if (VghLantern__CrossSection__CapGeometry__PointInLoop(sample.x, sample.y, kept[j].Points)) {
                    depth++;
                    const absoluteArea  =  Math.abs(kept[j].Area);
                    if (absoluteArea < parentArea) { parentArea = absoluteArea; parent = j; } // <-- Smallest container is the immediate parent
                }
            }
            kept[i].Depth   =  depth;
            kept[i].Parent  =  parent;
        }

        // TRIANGULATION | Outer loops filled with their own direct holes
        const capTriangles2d  =  [];                                         // <-- Flat list of 2D triangle vertices

        for (let i = 0; i < kept.length; i++) {
            if (kept[i].Depth % 2 !== 0) continue;                           // <-- A hole, handled with its parent

            const contour  =  kept[i].Points.map(function(p) { return new THREE.Vector2(p.x, p.y); });
            const holes    =  [];

            for (let j = 0; j < kept.length; j++) {
                if (kept[j].Depth === kept[i].Depth + 1 && kept[j].Parent === i) {
                    holes.push(kept[j].Points.map(function(p) { return new THREE.Vector2(p.x, p.y); }));
                }
            }

            try {
                const faces      =  THREE.ShapeUtils.triangulateShape(contour, holes);
                const allPoints  =  contour.concat.apply(contour, holes);

                for (let f = 0; f < faces.length; f++) {
                    const face  =  faces[f];
                    capTriangles2d.push(
                        allPoints[face[0]].x, allPoints[face[0]].y,
                        allPoints[face[1]].x, allPoints[face[1]].y,
                        allPoints[face[2]].x, allPoints[face[2]].y
                    );
                }
            } catch (triangulationError) {
                console.warn('[VghLantern CrossSection] Cap triangulation failed for one loop - the profile line is kept and the fill is skipped.', triangulationError);
            }
        }

        return { kept : kept, capTriangles2d : capTriangles2d };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Compute Cap Fill and Profile Outline Geometry for a Section Plane
    // ------------------------------------------------------------
    // roots   - array of Object3D to cut, normally the three solid model groups
    // plane   - THREE.Plane whose normal points toward the KEPT half space
    // options - { WeldToleranceWorld, MinLoopAreaWorld, MaxSegments }
    //
    // Returns world-space typed arrays plus diagnostics:
    //   { FillPositions, OutlinePositions, LoopCount, OpenChainCount, Aborted }
    export function VghLantern__CrossSection__CapGeometry__Compute(roots, plane, options) {
        const settings     =  options || {};
        const weldTol      =  settings.WeldToleranceWorld;
        const minLoopArea  =  settings.MinLoopAreaWorld;
        const maxSegments  =  settings.MaxSegments;

        const basis   =  VghLantern__CrossSection__CapGeometry__PlaneBasis(plane);
        const meshes  =  VghLantern__CrossSection__CapGeometry__CollectMeshes(Array.isArray(roots) ? roots : [roots]);

        // SEGMENT EXTRACTION | Oriented 2D contour segments from every eligible mesh
        const segments  =  [];
        let aborted  =  false;

        for (let m = 0; m < meshes.length; m++) {
            if (!VghLantern__CrossSection__CapGeometry__ExtractMeshSegments(meshes[m], plane, basis, segments, maxSegments)) {
                aborted  =  true;                                            // <-- Density guard tripped
                break;
            }
        }
        if (aborted || segments.length === 0) {
            return { FillPositions : null, OutlinePositions : null, LoopCount : 0, OpenChainCount : 0, Aborted : aborted };
        }

        // WELD, CANCEL, CHAIN, CLASSIFY, TRIANGULATE
        const welded   =  VghLantern__CrossSection__CapGeometry__WeldAndCancel(segments, weldTol);
        const chained  =  VghLantern__CrossSection__CapGeometry__ChainLoops(welded.pointsX, welded.pointsY, welded.segmentCounts);
        const filled   =  VghLantern__CrossSection__CapGeometry__TriangulateLoops(chained.loops, minLoopArea);

        // WORLD SPACE OUTPUT | Plane 2D coordinates lifted back through the basis
        const u       =  basis.u;
        const v       =  basis.v;
        const origin  =  basis.origin;

        function lift(x, y, out, offset) {
            out[offset]      =  origin.x + u.x * x + v.x * y;
            out[offset + 1]  =  origin.y + u.y * x + v.y * y;
            out[offset + 2]  =  origin.z + u.z * x + v.z * y;
        }

        // CAP FILL TRIANGLES
        let fillPositions  =  null;
        if (filled.capTriangles2d.length > 0) {
            fillPositions  =  new Float32Array((filled.capTriangles2d.length / 2) * 3);
            for (let i = 0, o = 0; i < filled.capTriangles2d.length; i += 2, o += 3) {
                lift(filled.capTriangles2d[i], filled.capTriangles2d[i + 1], fillPositions, o);
            }
        }

        // PROFILE OUTLINE SEGMENTS | Every kept loop edge, outer boundaries and holes alike
        let outlinePositions  =  null;
        let edgeCount  =  0;
        for (let i = 0; i < filled.kept.length; i++) edgeCount += filled.kept[i].Points.length;

        if (edgeCount > 0) {
            outlinePositions  =  new Float32Array(edgeCount * 6);
            let o  =  0;

            for (let i = 0; i < filled.kept.length; i++) {
                const points  =  filled.kept[i].Points;
                for (let p = 0, len = points.length; p < len; p++) {
                    const p1  =  points[p];
                    const p2  =  points[(p + 1) % len];
                    lift(p1.x, p1.y, outlinePositions, o);
                    lift(p2.x, p2.y, outlinePositions, o + 3);
                    o  +=  6;
                }
            }
        }

        return {
            FillPositions    : fillPositions,
            OutlinePositions : outlinePositions,
            LoopCount        : filled.kept.length,
            OpenChainCount   : chained.openChainCount,
            Aborted          : false
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
