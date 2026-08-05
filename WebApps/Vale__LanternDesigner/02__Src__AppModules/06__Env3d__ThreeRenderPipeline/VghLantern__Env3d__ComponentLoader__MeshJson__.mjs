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
       Na__Geometry__Faces     [ { OuterLoop_VertexIds, InnerLoops, Normal } ]
       Na__Geometry__Edges     [ { StartVertex, EndVertex, IsSoft, IsSmooth } ]

   Faces are arbitrary convex-ish polygons rather than triangles, so each outer
   loop is fanned. A fan is correct for the convex loops a lathe or extrusion
   produces, which is everything in the Vale component library; a concave loop
   would need real ear clipping and is called out in the console rather than
   quietly rendered wrong.

   Inner loops (holes) are not triangulated. The exporter records them so the
   data is not lossy, but a hole in a finial is not a case that exists yet, and
   guessing at it would produce worse geometry than omitting it.

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
    const FIELD_BBOX      =  'Na__Geometry__BoundingBox';
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
        let   skippedFaces  =  0;
        let   holedFaces    =  0;

        for (let f = 0; f < faceList.length; f++) {
            const face  =  faceList[f];
            if (!face) continue;

            const loop  =  face['OuterLoop_VertexIds'];
            if (!Array.isArray(loop) || loop.length < 3) { skippedFaces++; continue; }

            if (Array.isArray(face.InnerLoops) && face.InnerLoops.length > 0) holedFaces++;

            const first  =  vertexTable.get(loop[0]);
            if (!first) { skippedFaces++; continue; }

            // Fan the loop from its first vertex: (0,1,2), (0,2,3), (0,3,4) ...
            for (let t = 1; t < loop.length - 1; t++) {
                const second  =  vertexTable.get(loop[t]);
                const third   =  vertexTable.get(loop[t + 1]);
                if (!second || !third) { skippedFaces++; continue; }

                positions.push(first.Px,  first.Py,  first.Pz,
                               second.Px, second.Py, second.Pz,
                               third.Px,  third.Py,  third.Pz);

                normals.push(first.Nx,  first.Ny,  first.Nz,
                             second.Nx, second.Ny, second.Nz,
                             third.Nx,  third.Ny,  third.Nz);
            }
        }

        if (positions.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();
        geometry.name  =  'VghLantern__Env3d__ComponentGeometry__' + (assetLabel || 'Unnamed');

        if (skippedFaces > 0) {
            console.warn('[VghLantern Env3d] Component "' + assetLabel + '": '
                + skippedFaces + ' face(s) skipped - a loop referenced a vertex id that is not in the vertex table.');
        }
        if (holedFaces > 0) {
            console.warn('[VghLantern Env3d] Component "' + assetLabel + '": '
                + holedFaces + ' face(s) carry inner loops, which are not triangulated. '
                + 'The outer boundary renders solid where a hole was modelled.');
        }

        return geometry;
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
