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

   TWO SETS, NOT ONE - AND ONLY BECAUSE OF GLASS

   Everything collected DRAWS its edges. Not everything collected HIDES what is
   behind it. Those two sets are identical for every part of a lantern except the
   glazing, which is the one thing on the roof you can see through, and which the
   projection would otherwise treat as a solid wall: double sided, so never
   backface culled, and sitting directly in front of the ridge and hip beams, the
   internal joinery and every far side bar.

   Model.GlazingOccludes decides. False - the default - keeps glass drawing its own
   pane edges while leaving its triangles out of the clip pass, which is what a
   drawing office does by putting glass on a layer the hidden line calculation
   ignores. True restores strict hidden line removal.

   The raster preview renders the occluder soup and so loses glass along with it.
   That is correct rather than a side effect: the preview is defined as the same
   occluders seen from the same direction.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Sample(stage)  -> { Count, Vertices, Sides, Inverted,
                           Meshes, MeshCount, OccluderMeshCount }

       Meshes is the EDGE set. Vertices/Sides/Inverted are the OCCLUDER set.
       MeshCount above OccluderMeshCount means glass is being seen through.

   ============================================================================= */

import * as THREE from 'three';

import {
    VGHLANTERN__PROJECTED_EDGES__SIDE_FRONT,
    VGHLANTERN__PROJECTED_EDGES__SIDE_BACK,
    VGHLANTERN__PROJECTED_EDGES__SIDE_DOUBLE
} from './VghLantern__ProjectedEdges__SoupBuilder__.mjs';

import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

// MODULE CONSTANTS | Element Classification
// ------------------------------------------------------------
// The key every Env3d mesh builder stamps and the ElementFilter reads. Used here
// for one purpose only: telling glass apart from everything else.
const USERDATA_ELEMENT_TYPE  =  'VghLantern__ElementType';
const ELEMENT_TYPE_GLAZING   =  'Glazing';
// ------------------------------------------------------------

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


    // SUB FUNCTION | Which Collected Meshes Actually Hide What Is Behind Them
    // ------------------------------------------------------------
    // Returns one flag per mesh, in the order Collect gathered them.
    //
    // THE ONE PLACE THE EDGE SET AND THE OCCLUDER SET DIFFER, and it is deliberate.
    // Everywhere else in this module the two are the same set chosen by the same
    // rules, precisely so the passes cannot quietly disagree about what is in the
    // drawing. Glass is the exception, because glass is the one thing on a lantern
    // that you can see through.
    //
    // With glazing occluding, the projection is textbook hidden line removal and
    // the drawing loses everything inside the roof: the ridge and hip beams, the
    // internal joinery, every far side bar. It is not marginal - at 25 degrees the
    // near slope of glass runs 214mm in front of the ridge beam at its own mid
    // height. A drawing office solves this by putting glass on a layer the hidden
    // line calculation ignores while still plotting it, and Model.GlazingOccludes
    // false is that layer.
    //
    // Identified by the element type the mesh carries rather than by its name or
    // its material, because the stage flattens every builder into one group and the
    // element type is the vocabulary the whole application already classifies on.
    function VghLantern__ProjectedEdges__StageSampler__OccluderFlags(meshes) {
        const model  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Model');
        const flags  =  new Array(meshes.length);

        if (model.GlazingOccludes !== false) {
            flags.fill(true);
            return flags;
        }

        for (let m = 0; m < meshes.length; m++) {
            const data  =  meshes[m].userData;
            const type  =  data ? data[USERDATA_ELEMENT_TYPE] : null;
            flags[m]    =  type !== ELEMENT_TYPE_GLAZING;
        }

        return flags;
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
        const meshes    =  VghLantern__ProjectedEdges__StageSampler__Collect(stage);
        const occludes  =  VghLantern__ProjectedEdges__StageSampler__OccluderFlags(meshes);

        // Counted and filled over the OCCLUDERS only. The two passes must agree on
        // which meshes are skipped or the exactly sized buffer stops being exactly
        // sized, so both read the one flag array rather than re-deciding.
        let total       =  0;
        let occluderCount  =  0;
        for (let m = 0; m < meshes.length; m++) {
            if (!occludes[m]) continue;
            total  +=  VghLantern__ProjectedEdges__StageSampler__TriangleCount(meshes[m]);
            occluderCount++;
        }

        const vertices  =  new Float64Array(total * 9);
        const sides     =  new Uint8Array(total);
        const inverted  =  new Uint8Array(total);

        let written  =  0;

        for (let m = 0; m < meshes.length; m++) {
            if (!occludes[m]) continue;                                       // <-- Draws its own edges, hides nothing: see OccluderFlags

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

        // Meshes travels with the result because the edge extractor needs it,
        // derived here rather than gathered again so the two passes cannot quietly
        // disagree about what is in the drawing.
        //
        // It is the EDGE set, and the triangle arrays beside it are the OCCLUDER
        // set. Those are the same list except for glass, which draws its own pane
        // edges without hiding what is behind it - see OccluderFlags. Both counts
        // are reported so that difference is a number somebody can read rather than
        // an assumption: MeshCount above OccluderMeshCount means glass is being
        // seen through, and the two being equal means it is not.
        return {
            Count             : written,
            Vertices          : vertices,
            Sides             : sides,
            Inverted          : inverted,
            Meshes            : meshes,
            MeshCount         : meshes.length,
            OccluderMeshCount : occluderCount
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
