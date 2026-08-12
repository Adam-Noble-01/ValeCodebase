/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | EDGE EXTRACTOR
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__EdgeExtractor__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - EdgeExtractor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Find the lines worth drawing before anything decides what hides them
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Produces the candidate linework of a lantern: the hard creases, the silhouette
     against the view, and the lines where two solids cut through one another.
   - Everything the clip kernel later trims comes from here. If a line is not found
     in this file it cannot appear on the drawing, however good the occlusion pass.

   ---------------------------------------------------------------------------

   THE THREE KINDS OF LINE, AND WHAT EACH COSTS

     HARD EDGE       Two faces meet at more than the threshold angle. A property of
                     the model alone: true from every direction. Found once per
                     geometry and reused for every view and every instance.

                     WHERE THE AUTHOR SAID OTHERWISE, THE AUTHOR WINS. A library
                     component carries the soften, smooth and hide state set on it
                     in SketchUp, and the component loader attaches that to
                     geometry.userData. The threshold is a guess at what somebody
                     meant; the authored flag is what they actually did, and it
                     can express things an angle never can - a shallow edge
                     deliberately left hard, a steep one deliberately softened,
                     and a hidden edge, which no threshold can represent at all.

                     Mapping: hidden drops the edge from every view; soft demotes
                     it to silhouette only, so a softened lathe keeps its profile
                     without drawing its tessellation; anything still visible is a
                     crease. Smooth alone does NOT demote it, because a smooth
                     edge stays visible in SketchUp - it is only mistaken for a
                     hidden one because the Soften/Smooth slider sets both flags
                     at once.

                     Geometry with no authored data - every swept section and
                     prism, and any asset older than schema 1.2.0 - falls back to
                     the threshold untouched.

     SILHOUETTE      Two faces meet gently, but one turns towards the viewer and the
                     other away, so the model's outline breaks there. This is the
                     only part that depends on which view is being drawn, and it is
                     a sign comparison over data already in hand.

     INTERSECTION    Two separate solids pass through one another, and the line of
                     the cut is not an edge of either. This is what draws a finial
                     spike against the ridge behind it. It was 13 percent of every
                     render and it is now computed ONCE per lantern.

   ---------------------------------------------------------------------------

   WHY THE INTERSECTION PASS IS VIEW INVARIANT

   Worth stating plainly, because it is what removes the 13 percent. The pass works
   pair by pair, and it expresses each pair in the frame of the first mesh:

       BtoA  =  inverse(meshA.matrixWorld) * meshB.matrixWorld

   Turning the lantern to face a different view multiplies BOTH matrices by the same
   rotation, and the inverse cancels it. So the cut lines, expressed in stage space,
   are identical for the plan, the front and the side. Only the final placement into
   view space differs, and that is a permutation of three numbers.

   A note on the word "stage space" throughout this file. It means the space the
   staged model is built in: Env3d world units, metres, +Y up. It is NOT the
   application's model space, which is millimetres and +Z up. Nothing here ever
   sees model space; the meshes arrive already placed.

   The vendored library recomputes this for every view. It has no way not to: its
   generator takes a scene and hands back finished lines, with nowhere to put a
   result that outlives one call.

   ---------------------------------------------------------------------------

   ON THE VERTEX HASHING

   Pairing the two triangles that share an edge is done by rounding each corner to
   four decimal places and matching the resulting strings, which is the approach the
   vendored library uses and is kept deliberately: it is the definition of "the same
   corner" that produced the linework currently on screen, and a tighter or looser
   rule would change which edges are found.

   It is also the slowest part of extraction, which is why its result is cached per
   GEOMETRY. Lanterns repeat: every finial of a given design shares one geometry
   through the component cache, so the hashing happens once no matter how many are
   fitted, and once no matter how many views are drawn.

   ---------------------------------------------------------------------------

   PUBLIC API:
       ExtractStageEdges(meshes, upAxis, upSign, thresholdAngle) -> Float64Array
       ExtractIntersectionEdges(meshes, slicer)          -> Promise<Float64Array>
       ToViewSpace(stageEdges, axisMap, yOffset)         -> { Count, Verts }

   ============================================================================= */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

import { generateIntersectionEdges }
    from '../../04__Src__Dependencies__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/utils/generateIntersectionEdges.js';

// =============================================================================
// REGION | Projected Edges Edge Extractor Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tolerances Carried From the Vendored Implementation
    // ------------------------------------------------------------
    const HASH_DECIMALS        =  4;
    const HASH_PRECISION       =  Math.pow(10, HASH_DECIMALS);
    const FACING_EPSILON       =  1e-10;                                      // <-- Below this a face counts as edge on to the view
    const DEGENERATE_EPSILON   =  1e-16;                                      // <-- An edge this close to vertical projects to a point
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Authored Edge Classification
    // ------------------------------------------------------------
    // Written by the component loader onto geometry.userData. Values must match
    // VghLantern__Env3d__MeshJson__EDGE_*; they are restated rather than
    // imported so this module keeps no dependency on the 3D pipeline.
    const AUTHORED_USERDATA_KEY  =  'VghLantern__AuthoredEdges';
    const AUTHORED_ALWAYS        =  0;
    const AUTHORED_SILHOUETTE    =  1;
    const AUTHORED_NEVER         =  2;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Per Geometry Candidate Cache
    // ------------------------------------------------------------
    // Keyed by geometry so that repeated instances share one analysis, and held
    // weakly so a geometry dropped by the component cache takes its candidates with
    // it rather than pinning them for the life of the session.
    const VghLantern__ProjectedEdges__EdgeExtractor__Candidates  =  new WeakMap();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Per Geometry Authored Edge Hash Cache
    // ------------------------------------------------------------
    // Hashing the authored list is the same string work as hashing the mesh, so
    // it is held for the life of the geometry alongside the candidates. Weak
    // for the same reason: a dropped geometry takes its map with it.
    const VghLantern__ProjectedEdges__EdgeExtractor__AuthoredCache  =  new WeakMap();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Per Geometry Self Intersection Cache
    // ------------------------------------------------------------
    // A mesh checked against ITSELF uses an identity transform, so the cut lines it
    // finds belong to the geometry and not to the instance. Held in geometry-local
    // space and placed per instance, which is what makes a lantern carrying eight
    // identical finials pay for one of them.
    const VghLantern__ProjectedEdges__EdgeExtractor__SelfIntersections  =  new WeakMap();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Reusable Scratch
    // ------------------------------------------------------------
    const _inverseMatrix   =  new THREE.Matrix4();
    const _localDirection  =  new THREE.Vector3();
    const _bToA            =  new THREE.Matrix4();
    const _identity        =  new THREE.Matrix4();
    const _pair            =  new Float64Array(6);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per Geometry Candidate Analysis
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Hash the Authored Edge List Under This Module's Own Rule
    // ------------------------------------------------------------
    // The component loader attaches the author's soft / hidden decisions as raw
    // stage-space coordinate pairs rather than as hashes, so the definition of
    // "the same corner" stays in this file next to the rule that produced the
    // linework already on screen. Both directions are stored, because a shared
    // edge is walked one way by one triangle and the other way by its partner.
    //
    // Returns null when the geometry carries no authored data, which is the
    // signal to fall back to the angle threshold. That covers every swept
    // section and prism in a lantern, and every library asset exported before
    // schema 1.2.0.
    function VghLantern__ProjectedEdges__EdgeExtractor__AuthoredMap(geometry) {
        const attached  =  geometry.userData ? geometry.userData[AUTHORED_USERDATA_KEY] : null;
        if (!attached || !attached.Coords || !attached.Modes) return null;

        const cached  =  VghLantern__ProjectedEdges__EdgeExtractor__AuthoredCache.get(geometry);
        if (cached) return cached;

        const coords  =  attached.Coords;
        const modes   =  attached.Modes;
        const map     =  new Map();

        for (let i = 0, m = 0; i + 5 < coords.length; i += 6, m++) {
            const startHash  =
                Math.round(coords[i]     * HASH_PRECISION) + ',' +
                Math.round(coords[i + 1] * HASH_PRECISION) + ',' +
                Math.round(coords[i + 2] * HASH_PRECISION);

            const endHash  =
                Math.round(coords[i + 3] * HASH_PRECISION) + ',' +
                Math.round(coords[i + 4] * HASH_PRECISION) + ',' +
                Math.round(coords[i + 5] * HASH_PRECISION);

            if (startHash === endHash) continue;

            map.set(startHash + '_' + endHash, modes[m]);
            map.set(endHash + '_' + startHash, modes[m]);
        }

        VghLantern__ProjectedEdges__EdgeExtractor__AuthoredCache.set(geometry, map);
        return map;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Analyse One Geometry Into Always and Conditional Edges
    // ------------------------------------------------------------
    // Splitting the result in two is what makes the per view pass cheap. An edge
    // whose faces already meet sharply enough is an edge from every direction, so
    // it is settled here and never reconsidered. Only the gentle joins, where the
    // question is whether the view happens to break the outline, carry their two
    // face normals forward to be tested per view.
    //
    // A boundary edge - one with no second face - is always drawn, matching the
    // vendored behaviour of flushing every unmatched entry at the end of the pass.
    function VghLantern__ProjectedEdges__EdgeExtractor__Analyse(geometry, thresholdAngle) {
        const cached  =  VghLantern__ProjectedEdges__EdgeExtractor__Candidates.get(geometry);
        if (cached && cached.ThresholdAngle === thresholdAngle) return cached;

        const positionAttr  =  geometry.attributes.position;
        const indexAttr     =  geometry.index;
        const indexCount    =  indexAttr ? indexAttr.count : positionAttr.count;
        const thresholdDot  =  Math.cos(THREE.MathUtils.DEG2RAD * thresholdAngle);
        const authored      =  VghLantern__ProjectedEdges__EdgeExtractor__AuthoredMap(geometry);

        const always       =  [];
        const conditional  =  [];
        const edgeData     =  {};

        const ax = [ 0, 0, 0 ], ay = [ 0, 0, 0 ], az = [ 0, 0, 0 ];
        const hashes  =  [ '', '', '' ];
        const slots   =  [ 0, 0, 0 ];

        for (let i = 0; i < indexCount; i += 3) {

            for (let corner = 0; corner < 3; corner++) {
                const vertex  =  indexAttr ? indexAttr.getX(i + corner) : (i + corner);
                slots[corner]  =  vertex;

                ax[corner]  =  positionAttr.getX(vertex);
                ay[corner]  =  positionAttr.getY(vertex);
                az[corner]  =  positionAttr.getZ(vertex);

                hashes[corner]  =
                    Math.round(ax[corner] * HASH_PRECISION) + ',' +
                    Math.round(ay[corner] * HASH_PRECISION) + ',' +
                    Math.round(az[corner] * HASH_PRECISION);
            }

            if (hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[2] === hashes[0]) continue;

            // Normal as three.js derives it: (c - b) crossed with (a - b).
            const ux  =  ax[2] - ax[1], uy  =  ay[2] - ay[1], uz  =  az[2] - az[1];
            const vx  =  ax[0] - ax[1], vy  =  ay[0] - ay[1], vz  =  az[0] - az[1];

            let nx  =  (uy * vz) - (uz * vy);
            let ny  =  (uz * vx) - (ux * vz);
            let nz  =  (ux * vy) - (uy * vx);

            const lengthSq  =  (nx * nx) + (ny * ny) + (nz * nz);
            if (lengthSq > 0) {
                const inverseLength  =  1 / Math.sqrt(lengthSq);
                nx  *=  inverseLength;
                ny  *=  inverseLength;
                nz  *=  inverseLength;
            } else {
                nx  =  0; ny  =  0; nz  =  0;
            }

            for (let j = 0; j < 3; j++) {
                const jNext  =  (j + 1) % 3;
                const hash         =  hashes[j] + '_' + hashes[jNext];
                const reverseHash  =  hashes[jNext] + '_' + hashes[j];

                const partner  =  edgeData[reverseHash];

                if (partner) {
                    const dot  =  (nx * partner.Nx) + (ny * partner.Ny) + (nz * partner.Nz);

                    // The author's own classification wins where the asset
                    // carries one. The angle threshold is a guess at what they
                    // meant; this is what they actually did.
                    const authoredMode  =  authored ? authored.get(hash) : undefined;

                    if (authoredMode === AUTHORED_NEVER) {
                        // Hidden by hand. Draws in no view, silhouette included.
                    } else if (authoredMode === AUTHORED_ALWAYS) {
                        always.push(
                            ax[j], ay[j], az[j],
                            ax[jNext], ay[jNext], az[jNext]
                        );
                    } else if (authoredMode === AUTHORED_SILHOUETTE) {
                        conditional.push(
                            ax[j], ay[j], az[j],
                            ax[jNext], ay[jNext], az[jNext],
                            nx, ny, nz,
                            partner.Nx, partner.Ny, partner.Nz
                        );
                    } else if (dot <= thresholdDot) {
                        always.push(
                            ax[j], ay[j], az[j],
                            ax[jNext], ay[jNext], az[jNext]
                        );
                    } else {
                        conditional.push(
                            ax[j], ay[j], az[j],
                            ax[jNext], ay[jNext], az[jNext],
                            nx, ny, nz,
                            partner.Nx, partner.Ny, partner.Nz
                        );
                    }

                    edgeData[reverseHash]  =  null;
                } else if (!(hash in edgeData)) {
                    edgeData[hash]  =  {
                        Slot0 : slots[j],
                        Slot1 : slots[jNext],
                        Nx : nx, Ny : ny, Nz : nz
                    };
                }
            }
        }

        // Anything still unmatched is a boundary edge and is always drawn -
        // unless the author hid it by hand, which is an instruction rather than
        // a hint and outranks the fact that it happens to bound a face.
        for (const key in edgeData) {
            const entry  =  edgeData[key];
            if (!entry) continue;
            if (authored && authored.get(key) === AUTHORED_NEVER) continue;

            always.push(
                positionAttr.getX(entry.Slot0), positionAttr.getY(entry.Slot0), positionAttr.getZ(entry.Slot0),
                positionAttr.getX(entry.Slot1), positionAttr.getY(entry.Slot1), positionAttr.getZ(entry.Slot1)
            );
        }

        const result  =  {
            ThresholdAngle : thresholdAngle,
            Always         : new Float64Array(always),
            Conditional    : new Float64Array(conditional)
        };

        VghLantern__ProjectedEdges__EdgeExtractor__Candidates.set(geometry, result);
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hard and Silhouette Extraction
// -----------------------------------------------------------------------------

    // FUNCTION | Extract Hard and Silhouette Edges in Stage Space
    // ------------------------------------------------------------
    // upAxis and upSign describe where the viewer stands, in stage space: the view
    // looks down the axis numbered upAxis, in the direction given by the sign. The
    // direction is turned into each mesh's own frame once per mesh, exactly as the
    // vendored code does, so the silhouette test can be answered against normals
    // that were never transformed.
    export function VghLantern__ProjectedEdges__EdgeExtractor__ExtractStageEdges(meshes, upAxis, upSign, thresholdAngle) {
        const collected  =  [];

        for (let m = 0; m < meshes.length; m++) {
            const mesh        =  meshes[m];
            const candidates  =  VghLantern__ProjectedEdges__EdgeExtractor__Analyse(mesh.geometry, thresholdAngle);
            const e           =  mesh.matrixWorld.elements;

            _localDirection.set(0, 0, 0);
            _localDirection.setComponent(upAxis, upSign);

            _inverseMatrix.copy(mesh.matrixWorld).invert();
            _localDirection.transformDirection(_inverseMatrix);

            const px  =  _localDirection.x;
            const py  =  _localDirection.y;
            const pz  =  _localDirection.z;

            const always  =  candidates.Always;
            for (let i = 0; i < always.length; i += 6) {
                VghLantern__ProjectedEdges__EdgeExtractor__PushWorld(collected, e, always, i);
            }

            const conditional  =  candidates.Conditional;
            for (let i = 0; i < conditional.length; i += 12) {
                let thisDot   =  (px * conditional[i + 6])  + (py * conditional[i + 7])  + (pz * conditional[i + 8]);
                let otherDot  =  (px * conditional[i + 9])  + (py * conditional[i + 10]) + (pz * conditional[i + 11]);

                if (Math.abs(thisDot)  < FACING_EPSILON) thisDot   =  0;
                if (Math.abs(otherDot) < FACING_EPSILON) otherDot  =  0;

                // One face turned towards the viewer and the other away means the
                // outline of the solid breaks along this edge, so it is drawn even
                // though the two faces meet gently.
                if (Math.sign(thisDot) === Math.sign(otherDot)) continue;

                VghLantern__ProjectedEdges__EdgeExtractor__PushWorld(collected, e, conditional, i);
            }
        }

        return new Float64Array(collected);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Transform One Candidate Edge Into Stage Space
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__EdgeExtractor__PushWorld(target, e, source, offset) {
        for (let end = 0; end < 2; end++) {
            const at  =  offset + (end * 3);
            const x   =  source[at];
            const y   =  source[at + 1];
            const z   =  source[at + 2];

            const w  =  1 / ((e[3] * x) + (e[7] * y) + (e[11] * z) + e[15]);

            target.push(
                ((e[0] * x) + (e[4] * y) + (e[8]  * z) + e[12]) * w,
                ((e[1] * x) + (e[5] * y) + (e[9]  * z) + e[13]) * w,
                ((e[2] * x) + (e[6] * y) + (e[10] * z) + e[14]) * w
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Intersection Extraction
// -----------------------------------------------------------------------------

    // FUNCTION | Extract the Lines Where Solids Cut Through One Another
    // ------------------------------------------------------------
    // Computed once per lantern and reused by every view - see the note at the head
    // of this file for why that is sound. The tri-tri intersection itself is left to
    // the vendored routine: it is correct, and reimplementing robust triangle
    // intersection would be trading real risk for no certain gain.
    //
    // What IS done here is refusing to call it more often than the geometry
    // requires. Two refusals, and on a real lantern they carry most of the cost:
    //
    //   SELF INTERSECTIONS ARE A PROPERTY OF THE GEOMETRY
    //     A mesh checked against itself uses an identity transform, so the answer
    //     depends on the geometry and nothing else. Every finial of a given design
    //     shares one geometry through the component cache, so the answer is found
    //     once and placed as many times as the lantern has finials. The vendored
    //     library has this as a TODO in its own source and never got to it.
    //
    //   SEPARATED SOLIDS CANNOT INTERSECT
    //     Two meshes whose world bounding boxes miss each other have no cut line
    //     between them, and most pairs on a lantern are exactly that: a finial at
    //     one corner against a finial at the other. Six comparisons settles it
    //     where a dual tree descent would have had to start walking.
    //
    // slicer, when supplied, is awaited between pairs so a large lantern does not
    // hold the interface for the whole pass.
    export async function VghLantern__ProjectedEdges__EdgeExtractor__ExtractIntersectionEdges(meshes, slicer, report) {
        const collected  =  [];
        const boxes      =  [];

        for (let i = 0; i < meshes.length; i++) {
            boxes.push(VghLantern__ProjectedEdges__EdgeExtractor__WorldBox(meshes[i]));
        }

        let pairsTested  =  0;
        let pairsSkipped =  0;
        let selfReused   =  0;

        for (let i = 0; i < meshes.length; i++) {
            const meshA  =  meshes[i];
            const bvhA   =  VghLantern__ProjectedEdges__EdgeExtractor__BoundsTree(meshA.geometry);

            // ------------------------------------------------------
            // This mesh against itself, from the per geometry cache.
            // ------------------------------------------------------
            if (slicer) await slicer.Tick();

            const cachedSelf  =  VghLantern__ProjectedEdges__EdgeExtractor__SelfIntersections.get(meshA.geometry);
            let   selfLocal   =  cachedSelf;

            if (selfLocal) {
                selfReused++;
            } else {
                _identity.identity();
                const found  =  generateIntersectionEdges(bvhA, bvhA, _identity, []);

                selfLocal  =  new Float64Array(found.length * 6);
                for (let k = 0; k < found.length; k++) {
                    const line  =  found[k];
                    selfLocal[k * 6]      =  line.start.x;
                    selfLocal[k * 6 + 1]  =  line.start.y;
                    selfLocal[k * 6 + 2]  =  line.start.z;
                    selfLocal[k * 6 + 3]  =  line.end.x;
                    selfLocal[k * 6 + 4]  =  line.end.y;
                    selfLocal[k * 6 + 5]  =  line.end.z;
                }

                VghLantern__ProjectedEdges__EdgeExtractor__SelfIntersections.set(meshA.geometry, selfLocal);
                pairsTested++;
            }

            for (let s = 0; s < selfLocal.length; s += 6) {
                VghLantern__ProjectedEdges__EdgeExtractor__PushWorld(collected, meshA.matrixWorld.elements, selfLocal, s);
            }

            // ------------------------------------------------------
            // This mesh against every later one.
            // ------------------------------------------------------
            for (let j = i + 1; j < meshes.length; j++) {
                if (!VghLantern__ProjectedEdges__EdgeExtractor__BoxesOverlap(boxes[i], boxes[j])) {
                    pairsSkipped++;
                    continue;
                }

                if (slicer) await slicer.Tick();
                pairsTested++;

                const meshB  =  meshes[j];
                const bvhB   =  VghLantern__ProjectedEdges__EdgeExtractor__BoundsTree(meshB.geometry);

                _bToA.copy(meshA.matrixWorld).invert().multiply(meshB.matrixWorld);

                const found  =  generateIntersectionEdges(bvhA, bvhB, _bToA, []);
                if (found.length === 0) continue;

                const e  =  meshA.matrixWorld.elements;
                for (let k = 0; k < found.length; k++) {
                    const line  =  found[k];

                    _pair[0]  =  line.start.x;  _pair[1]  =  line.start.y;  _pair[2]  =  line.start.z;
                    _pair[3]  =  line.end.x;    _pair[4]  =  line.end.y;    _pair[5]  =  line.end.z;

                    VghLantern__ProjectedEdges__EdgeExtractor__PushWorld(collected, e, _pair, 0);
                }
            }
        }

        if (report) {
            report.PairsTested   =  pairsTested;
            report.PairsSkipped  =  pairsSkipped;
            report.SelfReused    =  selfReused;
        }

        return new Float64Array(collected);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | A Mesh's Bounding Box in Stage Space
    // ------------------------------------------------------------
    // Taken from the geometry's own box put through the mesh's transform, which for
    // a rotated part gives a box slightly larger than the part needs. That is the
    // safe direction to be wrong in: an over-large box costs a pair test that finds
    // nothing, where an under-large one would lose a real cut line.
    function VghLantern__ProjectedEdges__EdgeExtractor__WorldBox(mesh) {
        const geometry  =  mesh.geometry;
        if (!geometry.boundingBox) geometry.computeBoundingBox();

        return new THREE.Box3().copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Whether Two Stage Space Boxes Touch At All
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__EdgeExtractor__BoxesOverlap(a, b) {
        return !(a.max.x < b.min.x || a.min.x > b.max.x ||
                 a.max.y < b.min.y || a.min.y > b.max.y ||
                 a.max.z < b.min.z || a.min.z > b.max.z);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | The Bounds Tree a Geometry Already Has, or a New One
    // ------------------------------------------------------------
    // ModelStage primes these for the whole stage before anything asks. The fallback
    // matters only for a geometry that arrived by some other route, and it matches
    // the leaf size the vendored intersection pass would have chosen for itself.
    function VghLantern__ProjectedEdges__EdgeExtractor__BoundsTree(geometry) {
        if (geometry.boundsTree) return geometry.boundsTree;

        geometry.boundsTree  =  new MeshBVH(geometry, { maxLeafSize : 1 });
        return geometry.boundsTree;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Placement
// -----------------------------------------------------------------------------

    // FUNCTION | Turn Stage Space Edges to Face One View
    // ------------------------------------------------------------
    // Three things happen in one sweep, because each is a couple of instructions and
    // the array is long:
    //
    //   PERMUTE     Move the three components about to face the view. Exact.
    //
    //   LIFT        Nudge every edge a hair towards the viewer. Without this an
    //               edge lying exactly in the surface it belongs to is judged to be
    //               occluded by that surface and the model comes out blank. The
    //               vendored library applies the same lift for the same reason.
    //
    //   DROP        Discard edges that point straight at the viewer. They project
    //               to a point, so there is nothing to draw and the clip pass would
    //               divide by their zero length.
    export function VghLantern__ProjectedEdges__EdgeExtractor__ToViewSpace(stageEdges, axisMap, yOffset) {
        const s0  =  axisMap.Source[0], g0  =  axisMap.Sign[0];
        const s1  =  axisMap.Source[1], g1  =  axisMap.Sign[1];
        const s2  =  axisMap.Source[2], g2  =  axisMap.Sign[2];

        const sourceCount  =  Math.floor(stageEdges.length / 6);
        const verts        =  new Float64Array(sourceCount * 6);
        const lift         =  (typeof yOffset === 'number') ? yOffset : 0;

        let kept  =  0;

        for (let i = 0; i < sourceCount; i++) {
            const at  =  i * 6;

            const x0  =  g0 * stageEdges[at     + s0];
            const y0  =  g1 * stageEdges[at     + s1] + lift;
            const z0  =  g2 * stageEdges[at     + s2];
            const x1  =  g0 * stageEdges[at + 3 + s0];
            const y1  =  g1 * stageEdges[at + 3 + s1] + lift;
            const z1  =  g2 * stageEdges[at + 3 + s2];

            const dx  =  x1 - x0;
            const dy  =  y1 - y0;
            const dz  =  z1 - z0;

            const lengthSq  =  (dx * dx) + (dy * dy) + (dz * dz);
            if (!(lengthSq > 0)) continue;

            // Vertical in view space means the whole edge lands on one point.
            const vertical  =  Math.abs(dy) / Math.sqrt(lengthSq);
            if (vertical >= 1 - DEGENERATE_EPSILON) continue;

            const out  =  kept * 6;
            verts[out]      =  x0;
            verts[out + 1]  =  y0;
            verts[out + 2]  =  z0;
            verts[out + 3]  =  x1;
            verts[out + 4]  =  y1;
            verts[out + 5]  =  z1;
            kept++;
        }

        return {
            Count : kept,
            Verts : verts.slice(0, kept * 6)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
