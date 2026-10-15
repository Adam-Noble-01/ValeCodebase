/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | COMPONENT LOADER - MESH JSON
   =============================================================================

   FILE       : VghLantern__Env3d__ComponentLoader__MeshJson__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ComponentLoader MeshJson
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Construct Three.js geometry from a Na__Asset__Mesh3D block
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The unified component schema carries its 3D geometry inline as an indexed
     vertex / face list with per-vertex normals, rather than as an external GLB.
     This module is the constructor for that format.
   - Output is a single THREE.BufferGeometry per asset, built once and cached.
     Placements clone the resulting mesh, so four identical finials share one
     geometry and one material upload.

   ---------------------------------------------------------------------------

   THE MESH FORMAT:
       Na__Geometry__Vertices  [ { VertexId, PosX_mm, PosY_mm, PosZ_mm,
                                   Normal_X, Normal_Y, Normal_Z } ]
       Na__Geometry__Faces     [ { OuterLoop_VertexIds, InnerLoops, Normal,
                                   Na__Face__IsDisplayed } ]
       Na__Geometry__Edges     [ { StartVertex, EndVertex, Na__Edge__IsSoft,
                                   Na__Edge__IsSmooth, Na__Edge__IsDisplayed } ]

   HIDDEN FACES ARE PRESENT AND MUST BE FILTERED:
   Schema 1.2.0 stopped dropping hidden geometry during capture, because a flag
   that says "hidden" is worthless if the thing it describes was culled before
   the flag could be written - which is what made a round trip back into
   SketchUp impossible. The consequence here is that Na__Geometry__Faces now
   contains faces the author hid, and this loader has to skip them or they
   render solid. Na__Face__IsDisplayed is the resolved answer; pre-1.2.0 assets
   carry neither key and every face is drawn, exactly as before.

   Edges do not affect this shaded mesh - the exporter already averaged vertex
   normals across smoothed edges via face.mesh(7), so smooth shading is baked
   into Normal_X/Y/Z. They are attached to geometry.userData all the same,
   because the 2D drawing pipeline reads them from there. See
   AttachAuthoredEdges below.

   Faces are arbitrary polygons rather than triangles, so each outer loop is
   triangulated. A CONVEX loop is fanned from its first vertex, which is exact
   and costs nothing. A CONCAVE loop is ear clipped through THREE.ShapeUtils,
   because fanning one fills the hollow it turns back on.

   THAT IS NOT HYPOTHETICAL. The glaze bar end cap 45_1001 is a 3mm shell swept
   into an arch: each end of it is a 54 point C, strongly concave, enclosing
   199mm2 of metal around a mouth the bar slides into. Fanned, it came out as a
   filled 700mm2 slab and the part read as a solid block with its ends bricked
   up - which looked so much like an export fault that the SketchUp component was
   rebuilt twice before the renderer was suspected.

   Inner loops (holes) are still not triangulated. The exporter records them so
   the data is not lossy, but nothing in the library models one yet, and a face
   that carries one is reported rather than quietly rendered solid.

   AXES:
   SketchUp exports are Z-up in millimetres. Three.js is Y-up in world units.
   The swap matches VghLantern__Env3d__ConfigAccess__PointToWorld exactly:

       worldX =  X
       worldY =  Z
       worldZ = -Y

   Normals take the same swap, without the millimetre scale.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Mesh JSON Component Loader Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Mesh Block Field Names
    // ------------------------------------------------------------
    const FIELD_VERTICES  =  'Na__Geometry__Vertices';
    const FIELD_FACES     =  'Na__Geometry__Faces';
    const FIELD_EDGES     =  'Na__Geometry__Edges';
    const FIELD_BBOX      =  'Na__Geometry__BoundingBox';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Concavity Tolerance
    // ------------------------------------------------------------
    // How hard a corner has to turn back before the loop counts as concave. It is
    // an area in square millimetres, not an angle, so it scales with the size of
    // the corner rather than firing on every rounded fillet: a lathe turning is a
    // ring of very slightly convex corners and must not be dragged through the ear
    // clipper, while the 90 degree return on a shell section must be.
    const CONCAVE_EPSILON  =  1e-6;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Authored Edge Draw Modes
    // ------------------------------------------------------------
    // Read by the ProjectedEdges extractor. Kept here because this is where an
    // asset's edge flags are translated into a drawing decision exactly once.
    //
    //   ALWAYS      the author left this edge hard and visible, so it is a
    //               crease and draws from every direction.
    //   SILHOUETTE  the author softened it. It is not an interior line, but the
    //               outline may still break there, so it stays eligible as a
    //               silhouette - which is what gives a softened lathe its
    //               profile instead of a bald patch.
    //   NEVER       the author hid it with Edit > Hide. It draws in no view.
    export const VghLantern__Env3d__MeshJson__EDGE_ALWAYS      =  0;
    export const VghLantern__Env3d__MeshJson__EDGE_SILHOUETTE  =  1;
    export const VghLantern__Env3d__MeshJson__EDGE_NEVER       =  2;

    export const VghLantern__Env3d__MeshJson__USERDATA_EDGES   =  'VghLantern__AuthoredEdges';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Geometry Cache Keyed by Asset Id
    // ------------------------------------------------------------
    let VghLantern__Env3d__MeshJson__GeometryCache  =  {};                   // <-- assetId to THREE.BufferGeometry
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vertex Table Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Vertex Id Lookup with World-Space Values
    // ------------------------------------------------------------
    // Vertices are stored by string id and referenced by id from every face, so
    // resolving them once into a Map beats scanning the array per face vertex.
    function VghLantern__Env3d__MeshJson__BuildVertexTable(vertexList) {
        const table  =  new Map();

        for (let i = 0; i < vertexList.length; i++) {
            const vertex  =  vertexList[i];
            if (!vertex || !vertex.VertexId) continue;

            table.set(vertex.VertexId, {
                Px : VghLantern__Env3d__ConfigAccess__MmToWorld(vertex.PosX_mm),
                Py : VghLantern__Env3d__ConfigAccess__MmToWorld(vertex.PosZ_mm),   // <-- Model Z up becomes world Y up
                Pz : -VghLantern__Env3d__ConfigAccess__MmToWorld(vertex.PosY_mm),  // <-- Model Y depth becomes world -Z
                Nx : Number(vertex.Normal_X) || 0,
                Ny : Number(vertex.Normal_Z) || 0,                                 // <-- Same swap, unscaled
                Nz : -(Number(vertex.Normal_Y) || 0)
            });
        }

        return table;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Did the Author Hide This Face in SketchUp?
    // ------------------------------------------------------------
    // Na__Face__IsDisplayed already folds in the tag visibility, so it is
    // preferred; Na__Face__IsHidden is the raw Edit > Hide flag and is the
    // fallback. A face carrying neither key predates schema 1.2.0 and is drawn.
    function VghLantern__Env3d__MeshJson__FaceIsHidden(face) {
        if (face['Na__Face__IsDisplayed'] === false) return true;
        return face['Na__Face__IsHidden'] === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a BufferGeometry from a Mesh3D Block
    // ------------------------------------------------------------
    // Returns null when the block carries nothing drawable, which is the signal
    // for the caller to fall back to a GLB or a placeholder.
    export function VghLantern__Env3d__MeshJson__BuildGeometry(meshBlock, assetLabel) {
        if (!meshBlock) return null;

        const vertexList  =  meshBlock[FIELD_VERTICES];
        const faceList    =  meshBlock[FIELD_FACES];

        if (!Array.isArray(vertexList) || vertexList.length === 0) return null;
        if (!Array.isArray(faceList)   || faceList.length === 0)   return null;

        const vertexTable  =  VghLantern__Env3d__MeshJson__BuildVertexTable(vertexList);

        const positions  =  [];
        const normals    =  [];
        let   skippedFaces    =  0;
        let   holedFaces      =  0;
        let   hiddenFaces     =  0;
        let   clippedFaces    =  0;
        let   concaveFailures =  0;

        for (let f = 0; f < faceList.length; f++) {
            const face  =  faceList[f];
            if (!face) continue;

            if (VghLantern__Env3d__MeshJson__FaceIsHidden(face)) { hiddenFaces++; continue; }

            const loop  =  face['OuterLoop_VertexIds'];
            if (!Array.isArray(loop) || loop.length < 3) { skippedFaces++; continue; }

            if (Array.isArray(face.InnerLoops) && face.InnerLoops.length > 0) holedFaces++;

            const corners  =  [];
            let   resolved  =  true;
            for (let c = 0; c < loop.length; c++) {
                const corner  =  vertexTable.get(loop[c]);
                if (!corner) { resolved = false; break; }
                corners.push(corner);
            }
            if (!resolved) { skippedFaces++; continue; }

            const triangles  =  VghLantern__Env3d__MeshJson__TriangulateLoop(corners, face);
            if (triangles === null) { concaveFailures++; continue; }
            if (triangles.WasClipped) clippedFaces++;

            for (let t = 0; t < triangles.Indices.length; t += 3) {
                const a  =  corners[triangles.Indices[t]];
                const b  =  corners[triangles.Indices[t + 1]];
                const c  =  corners[triangles.Indices[t + 2]];

                positions.push(a.Px, a.Py, a.Pz,  b.Px, b.Py, b.Pz,  c.Px, c.Py, c.Pz);
                normals.push(  a.Nx, a.Ny, a.Nz,  b.Nx, b.Ny, b.Nz,  c.Nx, c.Ny, c.Nz);
            }
        }

        if (positions.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();
        geometry.name  =  'VghLantern__Env3d__ComponentGeometry__' + (assetLabel || 'Unnamed');

        VghLantern__Env3d__MeshJson__AttachAuthoredEdges(geometry, meshBlock, vertexTable);

        if (skippedFaces > 0) {
            console.warn('[VghLantern Env3d] Component "' + assetLabel + '": '
                + skippedFaces + ' face(s) skipped - a loop referenced a vertex id that is not in the vertex table.');
        }
        if (holedFaces > 0) {
            console.warn('[VghLantern Env3d] Component "' + assetLabel + '": '
                + holedFaces + ' face(s) carry inner loops, which are not triangulated. '
                + 'The outer boundary renders solid where a hole was modelled.');
        }
        if (hiddenFaces > 0) {
            console.info('[VghLantern Env3d] Component "' + assetLabel + '": '
                + hiddenFaces + ' face(s) hidden by the author in SketchUp and not rendered.');
        }
        if (clippedFaces > 0) {
            console.info('[VghLantern Env3d] Component "' + assetLabel + '": '
                + clippedFaces + ' concave face(s) ear clipped. A fan would have filled them in.');
        }
        if (concaveFailures > 0) {
            console.warn('[VghLantern Env3d] Component "' + assetLabel + '": '
                + concaveFailures + ' face(s) could not be triangulated and were dropped. '
                + 'A self-intersecting or degenerate loop is the usual cause.');
        }

        return geometry;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Triangulate One Face Loop
    // ------------------------------------------------------------
    // Returns { Indices, WasClipped } addressing the corner array it was handed,
    // or null when the loop cannot be triangulated at all.
    //
    // A CONVEX loop is fanned from its first vertex. That is exact, allocates
    // nothing, and covers every lathe turning and every plain extrusion end in
    // the library - which is almost all of it.
    //
    // A CONCAVE loop is ear clipped. Fanning one is not a rough approximation, it
    // is wrong: the fan spans the hollow the loop turns back around, so a C comes
    // out as a filled D. The ear clip runs in the face's OWN plane, projected
    // onto whichever pair of world axes that plane is most square to, because a
    // face lying flat in world Y projected onto XY would collapse to a line.
    function VghLantern__Env3d__MeshJson__TriangulateLoop(corners, face) {
        const count  =  corners.length;
        if (count < 3) return null;

        if (!VghLantern__Env3d__MeshJson__LoopIsConcave(corners)) {
            const fan  =  [];
            for (let t = 1; t < count - 1; t++) fan.push(0, t, t + 1);
            return { Indices : fan, WasClipped : false };
        }

        // SWAP THE NORMAL FIRST. The corners arrived already swapped into Three's
        // frame by the vertex table, and the authored normal has not been - so
        // choosing a projection axis from the raw one picks an axis of the WRONG
        // FRAME. On the glaze bar end cap, whose ends face SketchUp +Y, that chose
        // the single plane those faces are perpendicular to: the polygon collapsed
        // to a line and the clipper returned no triangles at all, which drew the
        // ends as nothing and read on screen as see-through.
        const normal  =  VghLantern__Env3d__MeshJson__NormalToThree(face.Normal);

        // DROP THE AXIS THE FACE FACES ALONG. The normal's largest component names
        // the axis the face is most perpendicular to, which is the one carrying the
        // least of its shape, so it is the one to discard.
        const ax  =  Math.abs(normal.x);
        const ay  =  Math.abs(normal.y);
        const az  =  Math.abs(normal.z);

        const flat  =  corners.map(function(corner) {
            if (ax >= ay && ax >= az) return new THREE.Vector2(corner.Py, corner.Pz);
            if (ay >= ax && ay >= az) return new THREE.Vector2(corner.Pz, corner.Px);
            return new THREE.Vector2(corner.Px, corner.Py);
        });

        let clipped;
        try {
            clipped  =  THREE.ShapeUtils.triangulateShape(flat, []);
        } catch (error) {
            return null;
        }
        // Zero triangles from a loop that is genuinely a polygon means the
        // projection degenerated. Reported rather than silently dropped, because a
        // dropped face renders as a hole and a hole looks like a material fault.
        if (!Array.isArray(clipped) || clipped.length === 0) return null;

        // ShapeUtils works to its own winding, and the projection above may have
        // reflected the loop, so the triangles come back facing either way. The
        // authored normal decides which is right, and correcting it here means no
        // component needs a two sided material to hide the question.
        const wound  =  VghLantern__Env3d__MeshJson__WindToNormal(clipped, corners, normal);
        return { Indices : wound, WasClipped : true };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Loop Turns Both Ways
    // ------------------------------------------------------------
    // A convex loop turns the same way at every corner. One that turns back on
    // itself anywhere is concave and cannot be fanned. Measured with the cross
    // product of successive edges projected onto the face's dominant plane, which
    // is the same projection the ear clip uses.
    function VghLantern__Env3d__MeshJson__LoopIsConcave(corners) {
        const count  =  corners.length;
        if (count < 4) return false;                                          // <-- A triangle is always convex

        let sawPositive  =  false;
        let sawNegative  =  false;

        for (let i = 0; i < count; i++) {
            const a  =  corners[i];
            const b  =  corners[(i + 1) % count];
            const c  =  corners[(i + 2) % count];

            const ux  =  b.Px - a.Px, uy = b.Py - a.Py, uz = b.Pz - a.Pz;
            const vx  =  c.Px - b.Px, vy = c.Py - b.Py, vz = c.Pz - b.Pz;

            const cx  =  (uy * vz) - (uz * vy);
            const cy  =  (uz * vx) - (ux * vz);
            const cz  =  (ux * vy) - (uy * vx);

            // Signed against the first corner's normal, so the test is about the
            // face's own plane rather than about world up.
            const sense  =  (cx * a.Nx) + (cy * a.Ny) + (cz * a.Nz);
            if (sense >  CONCAVE_EPSILON) sawPositive  =  true;
            if (sense < -CONCAVE_EPSILON) sawNegative  =  true;
            if (sawPositive && sawNegative) return true;
        }

        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Authored Face Normal in Three's Frame
    // ------------------------------------------------------------
    // The same axis swap the vertex table applies to positions, without the
    // millimetre scale. Kept as its own function because using it on one of the
    // two and not the other is exactly the mistake that dropped the end caps.
    function VghLantern__Env3d__MeshJson__NormalToThree(authored) {
        const n  =  Array.isArray(authored) ? authored : [0, 0, 1];
        return { x : n[0], y : n[2], z : -n[1] };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wind Every Triangle to Face the Authored Normal
    // ------------------------------------------------------------
    // normal is ALREADY in Three's frame - see NormalToThree above.
    function VghLantern__Env3d__MeshJson__WindToNormal(triangles, corners, normal) {
        const out  =  [];

        for (let t = 0; t < triangles.length; t++) {
            const tri  =  triangles[t];
            const a    =  corners[tri[0]];
            const b    =  corners[tri[1]];
            const c    =  corners[tri[2]];
            if (!a || !b || !c) continue;

            const ux  =  b.Px - a.Px, uy = b.Py - a.Py, uz = b.Pz - a.Pz;
            const vx  =  c.Px - a.Px, vy = c.Py - a.Py, vz = c.Pz - a.Pz;

            const cx  =  (uy * vz) - (uz * vy);
            const cy  =  (uz * vx) - (ux * vz);
            const cz  =  (ux * vy) - (uy * vx);

            const facing  =  (cx * normal.x) + (cy * normal.y) + (cz * normal.z);

            if (facing < 0) out.push(tri[0], tri[2], tri[1]);
            else            out.push(tri[0], tri[1], tri[2]);
        }

        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Attach the Authored Edge Classification to a Geometry
    // ------------------------------------------------------------
    // The drawing pipeline used to decide which lines a component deserves by
    // measuring the angle between its faces. That works on a box and fails on
    // everything an author actually cares about: it cannot tell a deliberately
    // hidden edge from a shallow one, and it will happily draw the tessellation
    // of a lathe it thinks is creased. The asset already carries the author's
    // real answer, so it is carried through to where the decision is made.
    //
    // Coordinates are stage-space (the same values written into the position
    // attribute), stored as pairs so the extractor can hash them under its own
    // rule rather than this module guessing at it. Math.fround is applied
    // because the position attribute is Float32: without it a coordinate here
    // would be the Float64 original and could round to a different hash bucket
    // than the same corner read back out of the buffer.
    //
    // Nothing is attached when the asset carries no edge list, and the
    // extractor then falls back to the angle threshold exactly as before - so
    // pre-1.2.0 library assets, swept sections and prisms are all untouched.
    function VghLantern__Env3d__MeshJson__AttachAuthoredEdges(geometry, meshBlock, vertexTable) {
        const edgeList  =  meshBlock[FIELD_EDGES];
        if (!Array.isArray(edgeList) || edgeList.length === 0) return;

        const coords  =  [];
        const modes   =  [];

        for (let i = 0; i < edgeList.length; i++) {
            const edge  =  edgeList[i];
            if (!edge) continue;

            const start  =  vertexTable.get(edge.StartVertex);
            const end    =  vertexTable.get(edge.EndVertex);
            if (!start || !end) continue;

            coords.push(Math.fround(start.Px), Math.fround(start.Py), Math.fround(start.Pz),
                        Math.fround(end.Px),   Math.fround(end.Py),   Math.fround(end.Pz));
            modes.push(VghLantern__Env3d__MeshJson__EdgeDrawMode(edge));
        }

        if (modes.length === 0) return;

        geometry.userData[VghLantern__Env3d__MeshJson__USERDATA_EDGES]  =  {
            Coords : new Float64Array(coords),
            Modes  : new Uint8Array(modes)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Translate One Edge's Authored Flags into a Draw Mode
    // ------------------------------------------------------------
    // Hidden beats everything: Edit > Hide is an explicit instruction and the
    // edge draws in no view. Soft demotes the edge to silhouette only, because
    // a soft edge is not an interior line but the outline can still break
    // there. Smooth on its own does NOT demote it - per SketchUp's own
    // definition a smooth edge stays visible, and it is only ever mistaken for
    // a hidden one because the Soften/Smooth slider sets both flags together.
    //
    // Reads the Na__Edge__ spelling first and falls back to the flat 1.1.0
    // keys, so a library asset exported before schema 1.2.0 still classifies.
    function VghLantern__Env3d__MeshJson__EdgeDrawMode(edge) {
        if (VghLantern__Env3d__MeshJson__EdgeFlag(edge, 'IsHidden')) {
            return VghLantern__Env3d__MeshJson__EDGE_NEVER;
        }

        // IsDisplayed already folds in soft, hidden and tag visibility.
        if (edge['Na__Edge__IsDisplayed'] === false) {
            return VghLantern__Env3d__MeshJson__EDGE_SILHOUETTE;
        }

        if (VghLantern__Env3d__MeshJson__EdgeFlag(edge, 'IsSoft')) {
            return VghLantern__Env3d__MeshJson__EDGE_SILHOUETTE;
        }

        return VghLantern__Env3d__MeshJson__EDGE_ALWAYS;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Edge Flag Across Both Schema Spellings
    // ------------------------------------------------------------
    function VghLantern__Env3d__MeshJson__EdgeFlag(edge, shortName) {
        const prefixed  =  edge['Na__Edge__' + shortName];
        if (typeof prefixed === 'boolean') return prefixed;
        return edge[shortName] === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build or Fetch the Cached Geometry for an Asset
    // ------------------------------------------------------------
    export function VghLantern__Env3d__MeshJson__GetGeometry(assetId, meshBlock) {
        if (!assetId) return null;

        if (VghLantern__Env3d__MeshJson__GeometryCache[assetId]) {
            return VghLantern__Env3d__MeshJson__GeometryCache[assetId];
        }

        const geometry  =  VghLantern__Env3d__MeshJson__BuildGeometry(meshBlock, assetId);
        if (!geometry) return null;

        VghLantern__Env3d__MeshJson__GeometryCache[assetId]  =  geometry;
        return geometry;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Placeable Mesh for an Asset
    // ------------------------------------------------------------
    // The mesh sits with its LOCAL ORIGIN at the object origin, because the
    // asset was authored about its origin point group in SketchUp. Placement is
    // therefore a position set and nothing else - no bounding box maths, no
    // seating offset, and no chance of the 2D and 3D views disagreeing about
    // where a component sits.
    export function VghLantern__Env3d__MeshJson__BuildMesh(assetId, meshBlock, material) {
        const geometry  =  VghLantern__Env3d__MeshJson__GetGeometry(assetId, meshBlock);
        if (!geometry) return null;

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  'VghLantern__Env3d__Component__' + assetId;
        mesh.castShadow     =  true;
        mesh.receiveShadow  =  true;

        mesh.userData.VghLantern__ComponentId   =  assetId;
        mesh.userData.VghLantern__IsPlaceholder =  false;
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Diagnostics and Cache Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Report the Millimetre Extents Recorded in a Mesh Block
    // ------------------------------------------------------------
    // Read from the block rather than measured off the geometry, so a caller can
    // size a placement before the geometry has been built.
    export function VghLantern__Env3d__MeshJson__ExtentsMm(meshBlock) {
        const bbox  =  meshBlock ? meshBlock[FIELD_BBOX] : null;
        if (!bbox) return null;

        return {
            MinX : bbox['Na__Geometry__MinX_mm'],
            MaxX : bbox['Na__Geometry__MaxX_mm'],
            MinY : bbox['Na__Geometry__MinY_mm'],
            MaxY : bbox['Na__Geometry__MaxY_mm'],
            MinZ : bbox['Na__Geometry__MinZ_mm'],
            MaxZ : bbox['Na__Geometry__MaxZ_mm']
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Every Cached Component Geometry
    // ------------------------------------------------------------
    // Called when the component library is rebuilt during authoring. Geometry is
    // a GPU resource, so it is disposed rather than dropped.
    export function VghLantern__Env3d__MeshJson__ClearCache() {
        const keys  =  Object.keys(VghLantern__Env3d__MeshJson__GeometryCache);

        for (let i = 0; i < keys.length; i++) {
            const geometry  =  VghLantern__Env3d__MeshJson__GeometryCache[keys[i]];
            if (geometry && typeof geometry.dispose === 'function') geometry.dispose();
        }
        VghLantern__Env3d__MeshJson__GeometryCache  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
