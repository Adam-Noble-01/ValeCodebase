/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | STAGE SAMPLER
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__StageSampler__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - StageSampler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Read a staged 3D model out into plain numbers, once per lantern
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Walks the staged THREE.Group and writes every triangle it will ever need into
     three flat arrays: world space corners, which way the material faces, and
     whether the mesh carried a mirroring transform.
   - The LAST module in the projection chain that knows three.js exists. Everything
     downstream - the soup, the tree, the clip kernel, the workers - sees numbers.

   ---------------------------------------------------------------------------

   WHY THIS IS SPLIT OUT AND CACHED PER LANTERN

   Reading the model is the same work whichever view is being drawn. The corners of
   a triangle in world space do not change when the drawing changes; only which way
   the model is turned changes, and turning it is a permutation of three numbers
   which SoupBuilder does per view for almost nothing.

   So this runs once per lantern and its result is cached alongside the staged
   model. Three views then share one traversal, one matrix pass and one read of
   every buffer attribute in the scene.

   ---------------------------------------------------------------------------

   WHICH OBJECTS ARE TAKEN

   The same set the vendored library's own collector would take, narrowed by the
   two guarantees ModelStage already makes:

       isMesh        Line objects carry a geometry but not triangles. ModelStage
                     hides the ones its builders emit as fallbacks; this checks
                     anyway, because a geometry read as triangles when it is not
                     produces silent nonsense rather than an error.

       visible       The flag ModelStage uses to take something out of the
                     projection without removing it from the scene graph.

       3+ vertices   An empty geometry has nothing to contribute and would only
                     add an awkward zero triangle case downstream.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Sample(stage)  -> { Count, Vertices, Sides, Inverted, Meshes, MeshCount }

   ============================================================================= */

import * as THREE from 'three';

import {
    VGHLANTERN__PROJECTED_EDGES__SIDE_FRONT,
    VGHLANTERN__PROJECTED_EDGES__SIDE_BACK,
    VGHLANTERN__PROJECTED_EDGES__SIDE_DOUBLE
} from './VghLantern__ProjectedEdges__SoupBuilder__.mjs';

// =============================================================================
// REGION | Projected Edges Stage Sampler Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Mesh Collection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Gather Every Mesh the Projection Should See
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__StageSampler__Collect(stage) {
        const meshes  =  [];
        if (!stage) return meshes;

        stage.traverse(function(object3d) {
            if (object3d.isMesh !== true) return;
            if (object3d.visible !== true) return;

            const geometry  =  object3d.geometry;
            if (!geometry || !geometry.attributes) return;

            const position  =  geometry.attributes.position;
            if (!position || position.count < 3) return;

            meshes.push(object3d);
        });

        return meshes;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | How Many Triangles One Mesh Contributes
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__StageSampler__TriangleCount(mesh) {
        const geometry  =  mesh.geometry;
        const count     =  geometry.index
            ? geometry.index.count
            : geometry.attributes.position.count;

        return Math.floor(count / 3);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reduce a Mesh's Material to a Side Code
    // ------------------------------------------------------------
    // A multi material mesh is read from its first slot. No Env3d builder emits
    // draw groups, so in practice this never fires; when it does, the first slot is
    // a far better guess than refusing the mesh and losing its occlusion entirely.
    //
    // The numeric codes happen to match three.js exactly, but they are mapped
    // rather than passed through so that the downstream modules never depend on
    // that coincidence continuing to hold.
    function VghLantern__ProjectedEdges__StageSampler__SideCode(mesh) {
        let material  =  mesh.material;
        if (Array.isArray(material)) material  =  material[0];
        if (!material) return VGHLANTERN__PROJECTED_EDGES__SIDE_FRONT;

        if (material.side === THREE.DoubleSide) return VGHLANTERN__PROJECTED_EDGES__SIDE_DOUBLE;
        if (material.side === THREE.BackSide)   return VGHLANTERN__PROJECTED_EDGES__SIDE_BACK;

        return VGHLANTERN__PROJECTED_EDGES__SIDE_FRONT;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sampling
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Staged Model Into Flat Triangle Arrays
    // ------------------------------------------------------------
    // Counted first and filled second. One extra traversal buys exactly sized
    // typed arrays, which is worth it here: the fill pass touches every vertex of
    // the model and a growing buffer would copy the whole thing repeatedly.
    //
    // Vertices are transformed by hand rather than through Vector3.applyMatrix4.
    // The arithmetic is identical, including the perspective divide that an affine
    // matrix leaves at one, but it avoids three object writes per corner across
    // something like a hundred and twenty thousand corners.
    export function VghLantern__ProjectedEdges__StageSampler__Sample(stage) {
        const meshes  =  VghLantern__ProjectedEdges__StageSampler__Collect(stage);

        let total  =  0;
        for (let m = 0; m < meshes.length; m++) {
            total  +=  VghLantern__ProjectedEdges__StageSampler__TriangleCount(meshes[m]);
        }

        const vertices  =  new Float64Array(total * 9);
        const sides     =  new Uint8Array(total);
        const inverted  =  new Uint8Array(total);

        let written  =  0;

        for (let m = 0; m < meshes.length; m++) {
            const mesh      =  meshes[m];
            const geometry  =  mesh.geometry;
            const position  =  geometry.attributes.position;
            const index     =  geometry.index;

            mesh.updateWorldMatrix(true, false);                              // <-- Nothing renders this stage, so nothing else refreshes the matrix
            const e  =  mesh.matrixWorld.elements;

            const sideCode      =  VghLantern__ProjectedEdges__StageSampler__SideCode(mesh);
            const isMirrored    =  mesh.matrixWorld.determinant() < 0 ? 1 : 0;
            const triangleCount =  VghLantern__ProjectedEdges__StageSampler__TriangleCount(mesh);

            for (let t = 0; t < triangleCount; t++) {
                const out  =  written * 9;

                for (let corner = 0; corner < 3; corner++) {
                    const slot    =  (t * 3) + corner;
                    const vertex  =  index ? index.getX(slot) : slot;

                    const x  =  position.getX(vertex);
                    const y  =  position.getY(vertex);
                    const z  =  position.getZ(vertex);

                    const w  =  1 / ((e[3] * x) + (e[7] * y) + (e[11] * z) + e[15]);
                    const at =  out + (corner * 3);

                    vertices[at]      =  ((e[0] * x) + (e[4] * y) + (e[8]  * z) + e[12]) * w;
                    vertices[at + 1]  =  ((e[1] * x) + (e[5] * y) + (e[9]  * z) + e[13]) * w;
                    vertices[at + 2]  =  ((e[2] * x) + (e[6] * y) + (e[10] * z) + e[14]) * w;
                }

                sides[written]     =  sideCode;
                inverted[written]  =  isMirrored;
                written++;
            }
        }

        // Meshes travels with the result because the edge extractor needs the same
        // set, chosen by the same rules. Deriving it twice would risk the two
        // passes quietly disagreeing about what is in the drawing.
        return {
            Count     : written,
            Vertices  : vertices,
            Sides     : sides,
            Inverted  : inverted,
            Meshes    : meshes,
            MeshCount : meshes.length
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
