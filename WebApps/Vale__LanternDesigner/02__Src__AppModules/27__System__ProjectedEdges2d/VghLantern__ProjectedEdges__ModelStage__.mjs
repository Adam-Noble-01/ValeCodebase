/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | MODEL STAGE
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__ModelStage__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - ModelStage
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the real Env3d solid model into a detached group, off screen
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Calls the SAME Env3d mesh builders the live 3D viewport calls, into a plain
     THREE.Group that is never added to a scene and never rendered.
   - That is the whole point of the experiment. The projected linework is not a
     second interpretation of the lantern, it is the actual 3D model measured, so
     it cannot drift from what the 3D viewport shows.
   - No renderer, no camera, no WebGL context. Every builder takes a target group
     and solved geometry and nothing else, which is what makes this possible.

   ---------------------------------------------------------------------------

   WHY NOTHING HERE IS EVER DISPOSED

   Three reasons, and they compound:

     1. The stage is never rendered, so no GPU buffer is ever allocated for it.
        The geometries are plain typed arrays and ordinary garbage collection
        reclaims them the moment the group is dropped.

     2. ComponentLoader__Glb__ hands back scene.clone(true) of a session cached
        GLB. A THREE clone SHARES geometry and material references with its
        source, so calling dispose here would empty the finials out of the live
        3D viewport and out of every sheet snapshot after it.

     3. MaterialLibrary materials are shared and flagged as such precisely because
        they must outlive any one build.

   Dropping the reference is the correct and complete teardown. Do not add a
   dispose pass here.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Build(skeleton, barSet, lantern)  -> Promise<THREE.Group>
       PrimeBoundsTrees(stage, yieldMs)  -> Promise<count of BVHs built>
       CountTriangles(group)             -> total triangle count, for cost logging

   ---------------------------------------------------------------------------

   ON SIMPLIFYING THE INPUT, AND WHY THERE IS NO CODE FOR IT HERE

   Welding vertices to drawing resolution was tried and removed. The reasoning was
   sound - at 1:50 a 0.25mm pen cannot resolve a 12.5mm feature, so finer detail
   cannot appear on paper - but measured on a real lantern it made the projection
   SLOWER, not faster: 11.5 seconds against 7.5, while also thinning the linework.
   Welding rewrites the triangle set, and the clipping pass appears to react worse
   to the resulting long thin triangles than it does to the many small regular ones
   it replaced.

   Do not reintroduce it without a measurement in front of you.

   ============================================================================= */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

import { VghLantern__Env3d__MeshBuilder__Skeleton__Build }           from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__MeshBuilder__Skeleton__.mjs';
import { VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__.mjs';
import { VghLantern__Env3d__MeshBuilder__BaseFrameAssembly__Build }  from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__MeshBuilder__BaseFrameAssembly__.mjs';
import { VghLantern__Env3d__MeshBuilder__Glazing__Build }            from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__MeshBuilder__Glazing__.mjs';
import { VghLantern__Env3d__MeshBuilder__GlazeBarComposite__Build }  from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__MeshBuilder__GlazeBarComposite__.mjs';
import { VghLantern__Env3d__ComponentLoader__Glb__Build }            from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ComponentLoader__Glb__.mjs';

import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';
import { VghLantern__ProjectedEdges__Scheduler__CreateSlicer } from './VghLantern__ProjectedEdges__Scheduler__.mjs';

// =============================================================================
// REGION | Projected Edges Model Stage Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Stage Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Solid Model Into a Detached Group
    // ------------------------------------------------------------
    // Build order mirrors Env3d__RenderPipeline__Render exactly, so a reader
    // comparing the two files sees the same sequence. The groups are flattened
    // into one here because the projector wants every mesh in one world, not four
    // clearable buckets.
    export async function VghLantern__ProjectedEdges__ModelStage__Build(skeleton, barSet, lantern) {
        const model  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Model');
        const stage  =  new THREE.Group();
        stage.name   =  'VghLantern__ProjectedEdges__Stage';

        if (model.IncludeGlazing === true) {
            VghLantern__Env3d__MeshBuilder__Glazing__Build(stage, skeleton);
        }

        if (model.IncludeFrame === true) {
            VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build(stage, skeleton, lantern);
            await VghLantern__Env3d__MeshBuilder__BaseFrameAssembly__Build(stage, skeleton, lantern);
            await VghLantern__Env3d__MeshBuilder__Skeleton__Build(stage, skeleton, barSet, lantern);
        }

        if (model.IncludeGlazeBars === true) {
            await VghLantern__Env3d__MeshBuilder__GlazeBarComposite__Build(stage, barSet, lantern);
        }

        if (model.IncludeComponents === true) {
            await VghLantern__Env3d__ComponentLoader__Glb__Build(stage, skeleton, lantern);
        }

        VghLantern__ProjectedEdges__ModelStage__HideUnprojectable(stage);
        return stage;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Hide Anything the Projector Cannot Take
    // ------------------------------------------------------------
    // three-edge-projection collects its work with getAllMeshes, which gathers every
    // object carrying a geometry and is VISIBLE, then builds a MeshBVH from each.
    // Two kinds of object on this stage would fail that:
    //
    //   LINE GEOMETRY   The skeleton builder returns THREE.LineSegments whenever a
    //                   member's authored profile cannot be swept - a fallback that
    //                   fires per role, so a stage can be mostly solid and still
    //                   carry a few line objects. A BVH over line geometry is not a
    //                   thing, and the failure is a long way from the cause.
    //
    //   EMPTY GEOMETRY  A builder that produced nothing still adds its container.
    //                   Nothing to project, and a zero triangle BVH is a needless
    //                   edge case to leave lying about.
    //
    // Hidden rather than removed, because visibility is precisely the flag the
    // collector reads, and hiding leaves the scene graph intact for anyone reading
    // it in a debugger. Everything touched here was created by this build - the GLB
    // components are per-build clones - so nothing shared is being altered.
    function VghLantern__ProjectedEdges__ModelStage__HideUnprojectable(stage) {
        stage.traverse(function(object3d) {
            const geometry  =  object3d.geometry;
            if (!geometry) return;

            if (object3d.isMesh !== true) {
                object3d.visible  =  false;
                return;
            }

            const position  =  geometry.attributes ? geometry.attributes.position : null;
            if (!position || position.count < 3) object3d.visible  =  false;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Bounds Tree Priming
// -----------------------------------------------------------------------------

    // FUNCTION | Build Each Geometry's BVH Once and Leave It on the Geometry
    // ------------------------------------------------------------
    // three-edge-projection builds bounds trees in TWO places and keeps neither:
    // the intersection edge pass builds one per geometry at maxLeafSize 1, and the
    // clipping pass builds another per geometry at the default. Both check
    // geometry.boundsTree first. Building it here once satisfies both, halving the
    // BVH work in a single run - and because a staged model is cached and reused
    // across views, the second and third view pay nothing for it at all.
    //
    // WHY MUTATING SHARED GEOMETRY IS SAFE HERE, having checked rather than assumed:
    //
    //   The component geometries on this stage are shared with the live 3D viewport
    //   through the MeshJson cache, and MeshBVH does mutate what it is given: it
    //   generates an index where there is none, and it REORDERS that index.
    //
    //   Reordering only changes rendered output when a geometry carries draw groups,
    //   because a group addresses a contiguous index range. No Env3d builder calls
    //   addGroup and GLTFLoader emits one mesh per primitive, so in practice nothing
    //   staged here has them. The guard below skips any geometry that does anyway,
    //   which costs one property read and closes the case permanently.
    //
    //   Nothing else in the application reads boundsTree. The accelerated raycast
    //   extension is not installed, so to every other consumer this property is
    //   inert - it is memory, and nothing more.
    //
    //   The indirect option would avoid reordering entirely, but three-mesh-bvh
    //   0.9.9 ships no indirect variant of bvhcast, which is the exact call both
    //   projection passes rely on. Not available, rather than not preferred.
    export async function VghLantern__ProjectedEdges__ModelStage__PrimeBoundsTrees(stage, yieldEveryMs) {
        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        if (performanceCfg.CacheBoundsTrees !== true) return 0;
        if (!stage) return 0;

        const maxLeafSize  =  (typeof performanceCfg.BvhMaxLeafSize === 'number')
            ? performanceCfg.BvhMaxLeafSize
            : 1;

        const geometries  =  new Set();
        stage.traverse(function(object3d) {
            if (object3d.isMesh !== true || object3d.visible !== true) return;
            if (object3d.geometry) geometries.add(object3d.geometry);
        });

        const slicer  =  VghLantern__ProjectedEdges__Scheduler__CreateSlicer(yieldEveryMs);
        let   built   =  0;

        for (const geometry of geometries) {
            if (geometry.boundsTree) continue;                                // <-- Already primed by an earlier stage sharing this geometry
            if (geometry.groups && geometry.groups.length > 1) continue;      // <-- Multi material: leave the index order alone and let the library build its own

            await slicer.Tick();
            geometry.boundsTree  =  new MeshBVH(geometry, { maxLeafSize : maxLeafSize });
            built++;
        }

        return built;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cost Reporting
// -----------------------------------------------------------------------------

    // FUNCTION | Count Every Triangle the Projector Will Actually See
    // ------------------------------------------------------------
    // Reported alongside the elapsed time so the cost of the projection can be read
    // against the size of what was fed to it. Edge extraction is roughly linear in
    // triangles and the clipping pass is worse than linear, so this number is the
    // first thing to look at when the overlay feels slow.
    //
    // The same visible and isMesh filter the library's own collector applies, so the
    // figure logged is the work that was really done rather than the work that was
    // staged and then set aside.
    export function VghLantern__ProjectedEdges__ModelStage__CountTriangles(stage) {
        let total  =  0;
        if (!stage) return total;

        stage.traverse(function(object3d) {
            if (object3d.isMesh !== true || object3d.visible !== true) return;

            const geometry  =  object3d.geometry;
            if (!geometry || !geometry.attributes || !geometry.attributes.position) return;

            total  +=  geometry.index
                ? (geometry.index.count / 3)
                : (geometry.attributes.position.count / 3);
        });

        return Math.round(total);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
