/* =============================================================================
   VGHLANTERN - 3D MEASURE TOOL | SNAP SOLVER
   =============================================================================

   FILE       : VghLantern__Measure3d__SnapSolver__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Measure3d - SnapSolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Find what the cursor is on, the corner nearest it, and the straight end of a dimension
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - THE MEASURED THING IS THE BUILT MESH. Every point comes off the triangles the
     3D View is drawing, in three.js world metres, so a dimension audits the model
     exactly as built. Nothing here computes lantern geometry.
   - FACE HITS. The first visible face along a ray, skipping the half a cross
     section has cut away, with its normal turned to face the eye.
   - VERTEX HITS. The corner nearest the cursor within the aperture, found around
     the face under the cursor (and around the first solid face behind any glass),
     then checked visible: a ray from the eye must meet nothing first. Glass never
     hides a corner, as in the drawings.
   - THE STRAIGHT LINE NUDGE (SolveEnd). Polycam's axis system: within the snap
     angle of red, green or blue - or, in Face to Face, square to the first face -
     the line snaps to that direction and the dimension is dead straight.

   ---------------------------------------------------------------------------

   WHY A BVH, AND WHY INDIRECT:
   A plain Raycaster tests every triangle of every merged mesh, which the hover
   inspector can afford once a frame but a corner search cannot: it casts a ray
   from the eye to every candidate. three-mesh-bvh (already vendored for the
   projected drawings) answers each ray in microseconds. It is built with
   indirect: true, which sorts a buffer of its own instead of REORDERING THE
   GEOMETRY'S INDEX - the default would scramble the triangle spans every pick
   table is written against, and the shared GLB geometry the projection stage
   reads. The trees are held in a WeakMap keyed by geometry, never attached to
   it, so no other raycast in the app changes behaviour, and a rebuilt model's
   disposed geometry takes its tree with it.

   WHY THE AXES COME FROM PointToWorld:
   Red, green and blue are model X, Y and Z (SketchUp's axes, the lantern's own),
   which three.js draws as X, Z and Y. The swap lives in one place
   (Env3d__ConfigAccess__PointToWorld); the axis directions here are derived
   from it rather than written out a second time.

   ============================================================================= */

import * as THREE from 'three';
import { MeshBVH, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__SceneGroup,
    VghLantern__Env3d__SceneGroupSet__Solid3d
} from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SceneManager__.mjs';

import { VghLantern__Env3d__PickIndex__IsVisible } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__PickIndex__.mjs';
import { VghLantern__CrossSection__IsPointClipped } from '../26__System__CrossSectionView/VghLantern__CrossSection__SystemLogic__.mjs';

import {
    VghLantern__Measure3d__ConfigAccess__RequireNumber,
    VghLantern__Measure3d__ConfigAccess__RequireBoolean
} from './VghLantern__Measure3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Measure Tool Snap Solver Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Snap Directions, by Key
    // ------------------------------------------------------------
    export const VghLantern__Measure3d__Axis  =  Object.freeze({
        X      : 'x',                                                       // <-- Red: model X, the lantern's length
        Y      : 'y',                                                       // <-- Green: model Y, its width
        Z      : 'z',                                                       // <-- Blue: model Z, up
        Square : 'square',                                                  // <-- Square to the first face
        Free   : 'free'                                                     // <-- No snap: the true 3D line
    });

    const MODEL_AXIS_KEYS   =  ['x', 'y', 'z'];
    const ELEMENT_GLAZING   =  'Glazing';                                   // <-- userData.VghLantern__ElementType the glazing builder stamps
    const DEDUPE_LATTICE    =  1e6;                                         // <-- Corners closer than a micron (world metres x 1e6) are one corner
    const SEARCH_MARGIN     =  1.5;                                         // <-- The corner search sphere runs this much past the aperture, so a corner at its edge is never missed
    const MIN_LENGTH_WORLD  =  1e-9;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Trees, and the Axes Once Resolved
    // ------------------------------------------------------------
    const VghLantern__Measure3d__SnapSolver__Trees  =  new WeakMap();      // <-- geometry -> MeshBVH, or null when it cannot hold one
    let   VghLantern__Measure3d__SnapSolver__AxisVectors  =  null;          // <-- { x, y, z } world unit vectors, resolved on first use
    // ------------------------------------------------------------


    // MODULE VARIABLES | Scratch Objects (Reused, So a Hover Pass Allocates Little)
    // ------------------------------------------------------------
    const _inverse       =  new THREE.Matrix4();
    const _normalMatrix  =  new THREE.Matrix3();
    const _localRay      =  new THREE.Ray();
    const _sphere        =  new THREE.Sphere();
    const _localSphere   =  new THREE.Sphere();
    const _scale         =  new THREE.Vector3();
    const _camSpace      =  new THREE.Vector3();
    const _ndc           =  new THREE.Vector2();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Axes and Units
// -----------------------------------------------------------------------------

    // FUNCTION | The World Direction of Red, Green or Blue
    // ------------------------------------------------------------
    // Model X, Y and Z passed through the one axis swap, so this module never
    // states the swap itself. Model Y comes out as world -Z; a direction's sign
    // makes no difference to an axis line.
    export function VghLantern__Measure3d__SnapSolver__AxisWorld(axisKey) {
        if (!VghLantern__Measure3d__SnapSolver__AxisVectors) {
            const resolved  =  {};
            const unitMm    =  { x : { x : 1, y : 0, z : 0 }, y : { x : 0, y : 1, z : 0 }, z : { x : 0, y : 0, z : 1 } };

            for (let i = 0; i < MODEL_AXIS_KEYS.length; i++) {
                const key    =  MODEL_AXIS_KEYS[i];
                const world  =  VghLantern__Env3d__ConfigAccess__PointToWorld(unitMm[key]);
                resolved[key]  =  Object.freeze(new THREE.Vector3(world.x, world.y, world.z).normalize());
            }
            VghLantern__Measure3d__SnapSolver__AxisVectors  =  resolved;
        }
        return VghLantern__Measure3d__SnapSolver__AxisVectors[axisKey] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a World Length to Millimetres
    // ------------------------------------------------------------
    // Through the app's unit authority (UnitConverter, "the only place permitted to
    // convert between unit spaces"), exactly as Env3d__ConfigAccess__MmToWorld
    // goes the other way; the inverse of that scale only if AppUtils is absent.
    export function VghLantern__Measure3d__SnapSolver__WorldToMm(worldLength) {
        const UnitConverter  =  window.VghLantern__AppUtils__UnitConverter;
        if (UnitConverter && UnitConverter.VghLantern__UnitConverter__WorldToMm) {
            return UnitConverter.VghLantern__UnitConverter__WorldToMm(worldLength);
        }

        const oneMm  =  VghLantern__Env3d__ConfigAccess__MmToWorld(1);
        return oneMm > 0 ? worldLength / oneMm : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Number of Millimetres at the Chosen Precision
    // ------------------------------------------------------------
    // Rounded to the nearest: whole millimetres by default, two places for
    // forensic work. Never a minus zero.
    export function VghLantern__Measure3d__SnapSolver__FormatNumber(valueMm, decimals) {
        const places  =  Math.max(0, Math.min(6, Math.round(Number(decimals) || 0)));
        const value   =  Number(valueMm);
        if (!isFinite(value)) return '';

        const text  =  value.toFixed(places);
        return Number(text) === 0 ? (0).toFixed(places) : text;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Length as the Tool Prints It
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__SnapSolver__FormatMm(valueMm, decimals) {
        const text  =  VghLantern__Measure3d__SnapSolver__FormatNumber(valueMm, decimals);
        return text ? text + ' mm' : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Dimension's Parts Along Model X, Y and Z, in Millimetres
    // ------------------------------------------------------------
    // Unsigned: an audit asks how far, not which way.
    export function VghLantern__Measure3d__SnapSolver__ModelPartsMm(startWorld, endWorld) {
        const delta  =  new THREE.Vector3().subVectors(endWorld, startWorld);

        return {
            X : VghLantern__Measure3d__SnapSolver__WorldToMm(Math.abs(delta.dot(VghLantern__Measure3d__SnapSolver__AxisWorld('x')))),
            Y : VghLantern__Measure3d__SnapSolver__WorldToMm(Math.abs(delta.dot(VghLantern__Measure3d__SnapSolver__AxisWorld('y')))),
            Z : VghLantern__Measure3d__SnapSolver__WorldToMm(Math.abs(delta.dot(VghLantern__Measure3d__SnapSolver__AxisWorld('z'))))
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Screen and World
// -----------------------------------------------------------------------------

    // FUNCTION | Project a World Point to Canvas Pixels
    // ------------------------------------------------------------
    // view is { Width, Height } in CSS pixels. Returns out, or null for a point on
    // or behind the near plane (which has no place on the screen). Uses the
    // camera's matrices as last drawn, so a point lands where the model shows it.
    export function VghLantern__Measure3d__SnapSolver__ToScreen(point, camera, view, out) {
        _camSpace.copy(point).applyMatrix4(camera.matrixWorldInverse);
        if (_camSpace.z > -camera.near) return null;

        _camSpace.applyMatrix4(camera.projectionMatrix);                     // <-- applyMatrix4 divides by w: this is NDC
        out.X  =  (_camSpace.x + 1) / 2 * view.Width;
        out.Y  =  (1 - _camSpace.y) / 2 * view.Height;
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | World Metres Covered by One Screen Pixel at a Point
    // ------------------------------------------------------------
    // What sizes a reticle in pixels and turns the vertex aperture into a search
    // radius. Taken at the point's depth along the view, not its straight-line
    // distance, because that is what the perspective divide scales by.
    export function VghLantern__Measure3d__SnapSolver__WorldPerPixel(point, camera, view) {
        _camSpace.copy(point).applyMatrix4(camera.matrixWorldInverse);
        const depth   =  Math.max(-_camSpace.z, camera.near);
        const halfFov =  THREE.MathUtils.degToRad(camera.fov) / 2;
        return (2 * depth * Math.tan(halfFov)) / Math.max(1, view.Height);
    }
    // ------------------------------------------------------------


    // FUNCTION | A World Ray Through a Canvas Pixel
    // ------------------------------------------------------------
    // Returns a new Ray, so a caller can cast several without one overwriting
    // another.
    export function VghLantern__Measure3d__SnapSolver__RayAt(raycaster, camera, view, screenX, screenY) {
        _ndc.set((screenX / Math.max(1, view.Width)) * 2 - 1, -(screenY / Math.max(1, view.Height)) * 2 + 1);
        raycaster.setFromCamera(_ndc, camera);
        return raycaster.ray.clone();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What Can Be Measured
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether One Scene Node Is a Mesh the Tool Can Measure
    // ------------------------------------------------------------
    // Fat lines are meshes in three.js (LineSegments2 extends Mesh) on instanced
    // geometry, and the section outline is one of them: they are skipped by kind.
    // Visibility walks the ancestors, because element views and display modes
    // hide layers at different levels of the graph.
    function VghLantern__Measure3d__SnapSolver__IsMeasurable(node) {
        if (!node || !node.isMesh) return false;
        if (node.isInstancedMesh || node.isLineSegments2 || node.isLine2) return false;

        const geometry  =  node.geometry;
        if (!geometry || !geometry.isBufferGeometry || geometry.isInstancedBufferGeometry) return false;
        if (!geometry.attributes || !geometry.attributes.position) return false;

        return VghLantern__Env3d__PickIndex__IsVisible(node);
    }
    // ------------------------------------------------------------


    // FUNCTION | Collect Every Visible Mesh a Measurement Can Land On
    // ------------------------------------------------------------
    // The solid model, and with includeSectionCuts the cross section's cut faces.
    // Held by the caller and rebuilt when the model or the view changes, so a
    // hover pass never walks the scene graph.
    export function VghLantern__Measure3d__SnapSolver__CollectMeshes(surface, includeSectionCuts) {
        const meshes  =  [];
        if (!surface || !surface.Groups) return meshes;

        const groupNames  =  VghLantern__Env3d__SceneGroupSet__Solid3d.slice();
        if (includeSectionCuts) groupNames.push(VghLantern__Env3d__SceneGroup.Overlay__Section);

        for (let i = 0; i < groupNames.length; i++) {
            const group  =  surface.Groups[groupNames[i]];
            if (!group) continue;

            group.updateMatrixWorld(true);                                   // <-- A group built since the last draw has no world matrices yet
            group.traverse(function(node) {
                if (VghLantern__Measure3d__SnapSolver__IsMeasurable(node)) meshes.push(node);
            });
        }
        return meshes;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Mesh Is Glass
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__SnapSolver__IsGlass(mesh) {
        return !!(mesh && mesh.userData && mesh.userData.VghLantern__ElementType === ELEMENT_GLAZING);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tree for One Geometry, Built on First Use
    // ------------------------------------------------------------
    function VghLantern__Measure3d__SnapSolver__TreeOf(geometry) {
        const Trees  =  VghLantern__Measure3d__SnapSolver__Trees;
        if (Trees.has(geometry)) return Trees.get(geometry);

        let tree  =  null;
        if (geometry.attributes.position.count >= 3) {
            try {
                tree  =  new MeshBVH(geometry, { indirect : true });          // <-- Never reorders the index: see the header
            } catch (error) {
                console.warn('[VghLantern__Measure3d__SnapSolver] Could not index a mesh for measuring:', error && error.message);
                tree  =  null;
            }
        }
        Trees.set(geometry, tree);
        return tree;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Mesh's Bounding Sphere in World Space
    // ------------------------------------------------------------
    function VghLantern__Measure3d__SnapSolver__WorldSphere(mesh, target) {
        const geometry  =  mesh.geometry;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        return target.copy(geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Hits
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Every Hit of a World Ray on One Mesh, in World Terms
    // ------------------------------------------------------------
    // The tree works in the geometry's own space, so the ray goes in through the
    // inverse world matrix and each hit comes back out through the world matrix.
    // Distances are re-measured in world metres, because a scaled component's
    // local distances are not.
    function VghLantern__Measure3d__SnapSolver__HitsOnMesh(mesh, worldRay, farWorld, out) {
        const tree  =  VghLantern__Measure3d__SnapSolver__TreeOf(mesh.geometry);
        if (!tree) return;

        _inverse.copy(mesh.matrixWorld).invert();
        _localRay.copy(worldRay).applyMatrix4(_inverse);

        const hits  =  tree.raycast(_localRay, THREE.DoubleSide, 0, Infinity);
        for (let i = 0; i < hits.length; i++) {
            const point     =  hits[i].point.clone().applyMatrix4(mesh.matrixWorld);
            const distance  =  point.distanceTo(worldRay.origin);
            if (distance > farWorld) continue;

            out.push({ Mesh : mesh, Point : point, Distance : distance, FaceIndex : hits[i].faceIndex, LocalNormal : hits[i].face.normal });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The First Visible Face Along a World Ray
    // ------------------------------------------------------------
    // options: { Far : world metres (default all the way), SkipGlass : true to
    // look through the glass }. Returns { Mesh, Point, Distance, Normal,
    // FaceIndex, IsGlass } or null. Hits in the half a cross section removed are
    // skipped: clipping is a shader effect, so the ray still finds that half.
    export function VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes, worldRay, options) {
        const far        =  (options && typeof options.Far === 'number') ? options.Far : Infinity;
        const skipGlass  =  !!(options && options.SkipGlass);
        const hits       =  [];

        for (let i = 0; i < meshes.length; i++) {
            const mesh  =  meshes[i];
            if (skipGlass && VghLantern__Measure3d__SnapSolver__IsGlass(mesh)) continue;
            if (!worldRay.intersectsSphere(VghLantern__Measure3d__SnapSolver__WorldSphere(mesh, _sphere))) continue;

            VghLantern__Measure3d__SnapSolver__HitsOnMesh(mesh, worldRay, far, hits);
        }

        hits.sort(function(a, b) { return a.Distance - b.Distance; });

        for (let i = 0; i < hits.length; i++) {
            if (VghLantern__CrossSection__IsPointClipped(surface, hits[i].Point)) continue;

            const hit  =  hits[i];
            _normalMatrix.getNormalMatrix(hit.Mesh.matrixWorld);
            const normal  =  hit.LocalNormal.clone().applyMatrix3(_normalMatrix).normalize();
            if (normal.dot(worldRay.direction) > 0) normal.negate();         // <-- Face the eye: glass is double sided, and the cut shows inside faces

            return {
                Mesh      : hit.Mesh,
                Point     : hit.Point,
                Distance  : hit.Distance,
                Normal    : normal,
                FaceIndex : hit.FaceIndex,
                IsGlass   : VghLantern__Measure3d__SnapSolver__IsGlass(hit.Mesh)
            };
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vertex Hits
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Gather the Corners Within a World Sphere, Across Every Mesh
    // ------------------------------------------------------------
    // Each mesh's tree is asked for the triangles meeting the sphere and every
    // corner of those inside it is kept, once (corners repeat across the triangles
    // that share them, and across meshes that meet).
    function VghLantern__Measure3d__SnapSolver__CornersNear(meshes, centre, radius, found) {
        const radiusSq  =  radius * radius;

        for (let i = 0; i < meshes.length; i++) {
            const mesh  =  meshes[i];
            const reach  =  VghLantern__Measure3d__SnapSolver__WorldSphere(mesh, _sphere);
            if (reach.center.distanceTo(centre) > reach.radius + radius) continue;

            const tree  =  VghLantern__Measure3d__SnapSolver__TreeOf(mesh.geometry);
            if (!tree) continue;

            // The sphere goes into local space at the smallest scale, so it holds at
            // least every corner the world sphere does; each is then judged in world.
            _scale.setFromMatrixScale(mesh.matrixWorld);
            const minScale  =  Math.max(1e-12, Math.min(Math.abs(_scale.x), Math.abs(_scale.y), Math.abs(_scale.z)));
            _inverse.copy(mesh.matrixWorld).invert();
            _localSphere.center.copy(centre).applyMatrix4(_inverse);
            _localSphere.radius  =  radius / minScale;

            const matrixWorld  =  mesh.matrixWorld;
            tree.shapecast({
                intersectsBounds   : function(box) {
                    return _localSphere.intersectsBox(box) ? INTERSECTED : NOT_INTERSECTED;
                },
                intersectsTriangle : function(triangle, triangleIndex) {
                    const corners  =  [triangle.a, triangle.b, triangle.c];
                    for (let c = 0; c < 3; c++) {
                        const world  =  corners[c].clone().applyMatrix4(matrixWorld);
                        if (world.distanceToSquared(centre) > radiusSq) continue;

                        const key  =  Math.round(world.x * DEDUPE_LATTICE) + '|' + Math.round(world.y * DEDUPE_LATTICE) + '|' + Math.round(world.z * DEDUPE_LATTICE);
                        if (!found.has(key)) found.set(key, { Point : world, Mesh : mesh, FaceIndex : triangleIndex });
                    }
                    return false;                                            // <-- Keep going: every triangle in reach
                }
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Corner Can Be Seen From the Eye
    // ------------------------------------------------------------
    // A ray from the eye to the corner must meet nothing nearer than the corner by
    // more than the tolerance. The corner's own triangles meet that ray at the
    // corner itself, which the tolerance excludes. Glass never hides a corner.
    export function VghLantern__Measure3d__SnapSolver__IsCornerVisible(surface, meshes, camera, point) {
        if (VghLantern__CrossSection__IsPointClipped(surface, point)) return false;

        const eye        =  new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
        const toCorner   =  new THREE.Vector3().subVectors(point, eye);
        const distance   =  toCorner.length();
        if (distance <= 0) return false;

        const tolerance  =  VghLantern__Env3d__ConfigAccess__MmToWorld(
            VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'VisibilityToleranceMm'));
        const ray        =  new THREE.Ray(eye, toCorner.divideScalar(distance));

        return !VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes, ray, { Far : distance - tolerance, SkipGlass : true });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Visible Corner Nearest the Cursor, Within the Aperture
    // ------------------------------------------------------------
    // cursor is { X, Y } in canvas pixels; view { Width, Height }. Returns
    // { Point, Mesh, FaceIndex, ScreenX, ScreenY } or null.
    //
    // Where to look: around the face under the cursor, and around the first solid
    // face behind it when that face is glass (so a bar's corner reads through the
    // glass, as it does on screen). With nothing under the cursor - it is just off
    // a corner, over the backdrop - a ring of rays round it finds the surfaces
    // beside it.
    export function VghLantern__Measure3d__SnapSolver__FindVertex(surface, meshes, camera, raycaster, view, cursor) {
        const aperturePx  =  VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'VertexAperturePx');
        const centres     =  [];

        const first  =  VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes,
            VghLantern__Measure3d__SnapSolver__RayAt(raycaster, camera, view, cursor.X, cursor.Y), null);

        if (first) {
            centres.push(first.Point);
            if (first.IsGlass) {
                const solid  =  VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes,
                    VghLantern__Measure3d__SnapSolver__RayAt(raycaster, camera, view, cursor.X, cursor.Y), { SkipGlass : true });
                if (solid) centres.push(solid.Point);
            }
        } else {
            const rayCount  =  Math.max(0, Math.round(VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'VertexSearchRingRays')));
            const radii     =  [aperturePx * 0.5, aperturePx];

            for (let r = 0; r < radii.length && centres.length === 0; r++) {
                for (let i = 0; i < rayCount; i++) {
                    const angle  =  (i / rayCount) * Math.PI * 2;
                    const hit    =  VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes,
                        VghLantern__Measure3d__SnapSolver__RayAt(raycaster, camera, view,
                            cursor.X + Math.cos(angle) * radii[r], cursor.Y + Math.sin(angle) * radii[r]), null);
                    if (hit) centres.push(hit.Point);
                }
            }
        }
        if (!centres.length) return null;

        const found  =  new Map();
        for (let i = 0; i < centres.length; i++) {
            const radius  =  aperturePx * SEARCH_MARGIN *
                VghLantern__Measure3d__SnapSolver__WorldPerPixel(centres[i], camera, view);
            VghLantern__Measure3d__SnapSolver__CornersNear(meshes, centres[i], radius, found);
        }

        // Nearest the cursor on screen first, within the aperture.
        const candidates  =  [];
        const screen      =  { X : 0, Y : 0 };
        found.forEach(function(corner) {
            if (!VghLantern__Measure3d__SnapSolver__ToScreen(corner.Point, camera, view, screen)) return;

            const gap  =  Math.hypot(screen.X - cursor.X, screen.Y - cursor.Y);
            if (gap > aperturePx) return;
            candidates.push({ Point : corner.Point, Mesh : corner.Mesh, FaceIndex : corner.FaceIndex, ScreenX : screen.X, ScreenY : screen.Y, Gap : gap });
        });
        candidates.sort(function(a, b) { return a.Gap - b.Gap; });

        const limit  =  Math.max(1, Math.round(VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'VertexCandidateLimit')));
        for (let i = 0; i < candidates.length && i < limit; i++) {
            if (VghLantern__Measure3d__SnapSolver__IsCornerVisible(surface, meshes, camera, candidates[i].Point)) return candidates[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Straight Line Nudge
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Directions a Dimension May Snap To
    // ------------------------------------------------------------
    // Red, green and blue always; in Face to Face, square to the first face as
    // well - unless that square IS one of the axes (within AxisCoincideDegrees),
    // when it is that axis, so one direction is never offered under two names.
    // Returns { List : [{ Key, Vector }], SquareAlias : axis key or '' }.
    function VghLantern__Measure3d__SnapSolver__Directions(request) {
        const list  =  [];
        for (let i = 0; i < MODEL_AXIS_KEYS.length; i++) {
            list.push({ Key : MODEL_AXIS_KEYS[i], Vector : VghLantern__Measure3d__SnapSolver__AxisWorld(MODEL_AXIS_KEYS[i]) });
        }

        let squareAlias  =  '';
        const squareWanted  =  request.Tool === 'face' && !!request.StartNormal &&
            VghLantern__Measure3d__ConfigAccess__RequireBoolean('Snap', 'SquareToFaceEnabled');

        if (squareWanted) {
            const coincide  =  Math.cos(THREE.MathUtils.degToRad(
                VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'AxisCoincideDegrees')));

            for (let i = 0; i < list.length; i++) {
                if (Math.abs(list[i].Vector.dot(request.StartNormal)) >= coincide) squareAlias  =  list[i].Key;
            }
            if (!squareAlias) list.push({ Key : VghLantern__Measure3d__Axis.Square, Vector : request.StartNormal.clone().normalize() });
        }
        return { List : list, SquareAlias : squareAlias, SquareWanted : squareWanted };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Square-to-Face Direction a Draft Offers, If It Offers One
    // ------------------------------------------------------------
    // Null for Vertex to Vertex, with the snap switched off, or when the first
    // face's square is one of the axes (it is offered under the axis's name). The
    // overlay draws a guide for it only when this returns one.
    export function VghLantern__Measure3d__SnapSolver__SquareDirection(tool, startNormal) {
        const directions  =  VghLantern__Measure3d__SnapSolver__Directions({ Tool : tool, StartNormal : startNormal });
        const last        =  directions.List[directions.List.length - 1];
        return (last && last.Key === VghLantern__Measure3d__Axis.Square) ? last.Vector : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Square Lock Resolves To for This Draft
    // ------------------------------------------------------------
    // 'square' when the face offers its own square, the axis key it coincides with,
    // or '' when Square to Face does not apply (Vertex to Vertex, or switched off),
    // so the Down arrow never locks a direction the draft does not have.
    export function VghLantern__Measure3d__SnapSolver__SquareLockKey(tool, startNormal) {
        const directions  =  VghLantern__Measure3d__SnapSolver__Directions({ Tool : tool, StartNormal : startNormal });
        if (!directions.SquareWanted) return '';
        return directions.SquareAlias || VghLantern__Measure3d__Axis.Square;
    }
    // ------------------------------------------------------------


    // FUNCTION | Solve Where a Dimension Ends
    // ------------------------------------------------------------
    // request: {
    //   Tool         'vertex' | 'face'
    //   Start        first point (world)
    //   StartNormal  the first face's normal (Face to Face), else null
    //   Target       the vertex or face point under the cursor (world)
    //   TargetNormal the face's normal under the cursor (Face to Face), else null
    //   LockKey      'x' | 'y' | 'z' | 'square' | '' - an arrow key lock
    //   HoldNearest  Shift: the nearest direction, whatever the angle
    //   Free         Alt: no snap at all
    // }
    // Returns { End, AxisKey, Direction, LengthWorld, NearestKey, AngleOffDegrees, IsLocked }.
    //
    // Snapped, Face to Face ends where the axis line through Start meets the plane
    // of the face under the cursor, so between two parallel faces the dimension is
    // exactly the gap wherever on the second face the cursor is; Vertex to Vertex
    // takes the axis part of Start to Target, as AutoCAD's linear dimension does.
    // Free, it is the true 3D line.
    export function VghLantern__Measure3d__SnapSolver__SolveEnd(request) {
        const start    =  request.Start;
        const delta    =  new THREE.Vector3().subVectors(request.Target, start);
        const length   =  delta.length();
        const answer   =  {
            End : request.Target.clone(), AxisKey : VghLantern__Measure3d__Axis.Free, Direction : null,
            LengthWorld : length, NearestKey : '', AngleOffDegrees : 0, IsLocked : false
        };
        if (length < MIN_LENGTH_WORLD) return answer;

        const directions  =  VghLantern__Measure3d__SnapSolver__Directions(request);
        const unit        =  delta.clone().divideScalar(length);

        let nearest  =  null;
        for (let i = 0; i < directions.List.length; i++) {
            const angle  =  THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(unit.dot(directions.List[i].Vector)))));
            if (!nearest || angle < nearest.Angle) nearest  =  { Key : directions.List[i].Key, Vector : directions.List[i].Vector, Angle : angle };
        }
        answer.NearestKey       =  nearest.Key;
        answer.AngleOffDegrees  =  nearest.Angle;

        // Which direction, if any: Alt frees, an arrow key locks, Shift holds the
        // nearest, and otherwise the snap angle decides.
        let chosen  =  null;
        if (request.Free) {
            chosen  =  null;
        } else if (request.LockKey) {
            const lockKey  =  (request.LockKey === VghLantern__Measure3d__Axis.Square && directions.SquareAlias)
                ? directions.SquareAlias
                : request.LockKey;
            for (let i = 0; i < directions.List.length; i++) {
                if (directions.List[i].Key === lockKey) chosen  =  directions.List[i];
            }
            answer.IsLocked  =  !!chosen;
        } else if (request.HoldNearest) {
            chosen  =  nearest;
            answer.IsLocked  =  true;
        } else if (nearest.Angle <= VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'AxisSnapAngleDegrees')) {
            chosen  =  nearest;
        }
        if (!chosen) return answer;

        const direction  =  chosen.Vector;
        let   along      =  delta.dot(direction);

        if (request.Tool === 'face' && request.TargetNormal) {
            const facing  =  direction.dot(request.TargetNormal);
            if (Math.abs(facing) >= VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'PlaneMinCosine')) {
                along  =  delta.dot(request.TargetNormal) / facing;           // <-- The axis line meets the second face's plane
            }
        }

        answer.End          =  start.clone().addScaledVector(direction, along);
        answer.AxisKey      =  chosen.Key;
        answer.Direction    =  direction.clone();
        answer.LengthWorld  =  Math.abs(along);
        return answer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
