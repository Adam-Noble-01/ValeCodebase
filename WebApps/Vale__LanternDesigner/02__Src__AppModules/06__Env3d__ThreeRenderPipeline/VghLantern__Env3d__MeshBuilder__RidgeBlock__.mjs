/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - RIDGE BLOCK
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__RidgeBlock__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder RidgeBlock
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Place the octagonal ridge block the ridge and hips die into
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - The block at each ridge end is the one junction in a Vale roof where six
     members meet: the ridge from one side, two hips from below, and the
     weathering above. All of them are plumb cut against its flat facets, which
     is what the block is for.
   - Also known on the shop floor as the lighting block, because its turned base
     can be swapped for a hook and an internal wiring conduit to hang a light
     fixture from.
   - Separate from the ridge assembly builder because it is a different kind of
     thing: a mesh component placed at a point, not a section swept along a line.
     Its data comes from the component library rather than the profile library
     and it is built through the MeshJson loader.

   ---------------------------------------------------------------------------

   PLACEMENT

   The origin goes directly on the ridge end point - the convergence of the ridge
   datum and the tops of the two hip construction triangles - with no vertical
   offset. The asset hangs from 27mm below its own origin, which is exactly where
   its top face belongs relative to the ridge datum, so an offset here would be
   correcting something the export already got right.

   The block is then rotated about vertical to square its facets to the roof.
   Its octagon has flats facing along its own local axes and both diagonals, so
   aligning one pair with the ridge lands the hip facets on the 45 degree
   diagonals for free.

   THE STRETCH

   A ridge beam deeper than the 230mm standard would push its moulded underside
   through the block's turning. So the block's straight prism stretches by the
   same delta as the ridge beam depth, holding the authored 6mm clearance at
   every pitch. The turning below travels rigid - it is a lathe profile, and a
   lathe profile 9 percent taller reads as a different block.

   ONE CACHED GEOMETRY, NOT ONE PER DEPTH

   The stretched mesh is cached here rather than in the MeshJson loader's own
   cache, and the cache holds exactly one entry.

   The loader's cache is keyed by asset id and lives until the pipeline is
   disposed, which is right for a finial and wrong for this. The block's geometry
   changes with the ridge beam depth, so it would need the depth in its key, and
   dragging the depth slider through forty positions would leave forty entries in
   a cache nothing ever evicts. Here the previous entry is disposed the moment the
   depth changes, so the count stays at one.

   WHAT THE CACHE ACTUALLY BUYS, AND WHAT IT DOES NOT

   SceneManager treats geometry as builder-owned and disposes it on every rebuild,
   so the cached geometry is disposed out from under this module each time the
   model is redrawn. That is survivable and deliberate rather than a leak: a
   THREE.BufferGeometry keeps its CPU-side attributes after dispose and simply
   re-uploads when it is next rendered, which is the same bargain the component
   loader's finial cache already makes.

   So what the cache saves is the CPU work - reading 3432 vertices out of JSON and
   fanning 2830 polygon faces into triangles - and not a GPU upload. That is the
   expensive half. Both placements in a lantern share the one geometry, which does
   mean dispose() is called on it twice per rebuild; Three treats a second dispose
   as a no-op beyond re-dispatching its event.

   THE PROJECTED EDGES STAGE CALLS THIS TOO

   ProjectedEdges ModelStage builds the same builders into a detached group, and
   its header says plainly that nothing there is ever disposed - because a stage
   shares geometry with the live viewport and disposing would empty the viewport.

   This module disposes on a CACHE KEY CHANGE, which is a different thing and stays
   within that rule for the case that actually arises: the stage and the viewport
   build the same lantern at the same ridge depth, the key matches, and nothing is
   disposed. A stage built for a DIFFERENT lantern at a different depth does
   replace the entry, and the viewport's meshes then hold a disposed geometry -
   which re-uploads on its next render rather than vanishing, exactly as the
   component loader's own shared cache already behaves. Bounded at one entry is
   worth that, because the alternative is one geometry per position of a slider
   somebody drags.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__GlazeBarTrim
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__MeshJson__BuildGeometry
} from './VghLantern__Env3d__ComponentLoader__MeshJson__.mjs';

import {
    VghLantern__Env3d__PickIndex__RegisterWhole
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Ridge Block Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Lantern Config Location and Identity
    // ------------------------------------------------------------
    const FINISH_BLOCK            =  'Lantern__FinishAndGlazing__Config';
    const FIELD_JOINERY_FINISH    =  'Lantern__FinishAndGlazing__Config__JoineryPaintFinish';
    const DEFAULT_JOINERY_FINISH  =  'Farrow and Ball Ammonite';

    const ASSET_FIELD_MESH_3D     =  'Na__Asset__Mesh3D';
    const DEG_TO_RAD              =  Math.PI / 180;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Single Entry Geometry Cache
    // ------------------------------------------------------------
    // One key, one geometry. Every block in a lantern is the same depth, so two
    // placements share one buffer and one upload, and a depth change disposes the
    // previous buffer rather than stacking another beside it.
    let VghLantern__Env3d__RidgeBlock__CacheKey       =  '';
    let VghLantern__Env3d__RidgeBlock__CacheGeometry  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build or Fetch the Stretched Block Geometry
    // ------------------------------------------------------------
    // Returns null when the asset carries no mesh block, which is the one case
    // worth failing on: a ridge block with no geometry is a broken export rather
    // than a lantern without a block.
    function VghLantern__Env3d__RidgeBlock__Geometry(asset, beamDeltaMm) {
        const Geometry  =  window.VghLantern__Geometry__RidgeAssembly;
        if (!Geometry) return null;

        const cacheKey  =  Geometry.VghLantern__RidgeAssembly__BlockCacheKey(beamDeltaMm);
        if (cacheKey === VghLantern__Env3d__RidgeBlock__CacheKey && VghLantern__Env3d__RidgeBlock__CacheGeometry) {
            return VghLantern__Env3d__RidgeBlock__CacheGeometry;
        }

        const meshBlock  =  asset ? asset[ASSET_FIELD_MESH_3D] : null;
        if (!meshBlock) return null;

        const stretched  =  Geometry.VghLantern__RidgeAssembly__StretchBlockMesh(meshBlock, beamDeltaMm);
        const geometry   =  VghLantern__Env3d__MeshJson__BuildGeometry(stretched, 'ridgeBlock');
        if (!geometry) return null;

        if (VghLantern__Env3d__RidgeBlock__CacheGeometry) {
            VghLantern__Env3d__RidgeBlock__CacheGeometry.dispose();             // <-- GPU resource, disposed rather than dropped
        }

        VghLantern__Env3d__RidgeBlock__CacheKey       =  cacheKey;
        VghLantern__Env3d__RidgeBlock__CacheGeometry  =  geometry;
        return geometry;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose the Cached Block Geometry
    // ------------------------------------------------------------
    // Called from the pipeline's full dispose alongside the other cache clears.
    export function VghLantern__Env3d__MeshBuilder__RidgeBlock__ClearCache() {
        if (VghLantern__Env3d__RidgeBlock__CacheGeometry) {
            VghLantern__Env3d__RidgeBlock__CacheGeometry.dispose();
        }
        VghLantern__Env3d__RidgeBlock__CacheKey       =  '';
        VghLantern__Env3d__RidgeBlock__CacheGeometry  =  null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Finish the Block Is Painted In
    // ------------------------------------------------------------
    // Interior painted joinery, following the master joinery finish - the block
    // reads as part of the ridge and hip beams it terminates, and those follow
    // the same macro.
    function VghLantern__Env3d__RidgeBlock__JoineryFinish(lantern) {
        const block  =  lantern ? lantern[FINISH_BLOCK] : null;
        const value  =  block ? block[FIELD_JOINERY_FINISH] : null;
        return (value === null || value === undefined || value === '') ? DEFAULT_JOINERY_FINISH : value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Place a Block at Every Ridge End
    // ------------------------------------------------------------
    // Two placements on a hipped ridge, one at the apex of a pyramid, none on a
    // roof form that has neither.
    //
    // Plan rotation maps straight onto a Three rotation about world +Y: the
    // millimetre-to-world swap sends model +X to world +X and model +Y to world
    // -Z, and a counter-clockwise turn about model +Z comes out as the same angle
    // about world +Y with no sign change.
    export async function VghLantern__Env3d__MeshBuilder__RidgeBlock__Build(targetGroup, skeleton, lantern) {
        const summary  =  { PlacedCount : 0, AssetId : '', Warnings : [] };
        if (!targetGroup || !skeleton) return summary;

        const Geometry  =  window.VghLantern__Geometry__RidgeAssembly;
        const Loader    =  window.VghLantern__AppData__RidgeSystemLoader;

        if (!Geometry || !Loader) {
            summary.Warnings.push('Ridge system is not available - no ridge block placed.');
            return summary;
        }

        const placements  =  Geometry.VghLantern__RidgeAssembly__BlockPlacements(skeleton);
        if (placements.length === 0) return summary;                           // <-- A roof form with no ridge and no apex

        let asset;
        try {
            asset  =  await Loader.VghLantern__RidgeSystemLoader__LoadBlockAsset();
        } catch (error) {
            summary.Warnings.push('Ridge block could not be loaded: ' + error.message);
            return summary;
        }
        if (!asset) {
            summary.Warnings.push('Ridge block asset is missing - the ridge and hips will read as unterminated.');
            return summary;
        }

        const depths    =  Geometry.VghLantern__RidgeAssembly__DepthResolution(lantern, skeleton);
        const geometry  =  VghLantern__Env3d__RidgeBlock__Geometry(asset, depths.Ridge.DeltaFromAuthoredMm);

        if (!geometry) {
            summary.Warnings.push('Ridge block carries no 3D mesh - the ridge and hips will read as unterminated.');
            return summary;
        }

        const relationship  =  Loader.VghLantern__RidgeSystemLoader__BlockRelationship();
        const material      =  VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(
            VghLantern__Env3d__RidgeBlock__JoineryFinish(lantern));

        summary.AssetId  =  relationship ? (relationship.BlockAssetId || '') : '';

        let i, placement, mesh, world;

        for (i = 0; i < placements.length; i++) {
            placement  =  placements[i];

            mesh  =  new THREE.Mesh(geometry, material);                       // <-- Geometry shared between placements, not cloned
            mesh.name           =  'VghLantern__Env3d__RidgeBlock__' + placement.Id;
            mesh.castShadow     =  true;
            mesh.receiveShadow  =  true;

            world  =  VghLantern__Env3d__ConfigAccess__PointToWorld(placement.Point);
            mesh.position.set(world.x, world.y, world.z);
            mesh.rotation.y  =  Number(placement.PlanRotationDegrees) * DEG_TO_RAD;

            mesh.userData.VghLantern__PartKey      =  'ridgeBlock';
            mesh.userData.VghLantern__PartName     =  'Ridge Block';
            mesh.userData.VghLantern__AssetId      =  summary.AssetId;
            mesh.userData.VghLantern__ElementType  =  'Trim';
            mesh.userData.VghLantern__ElementRole  =  'Decorative Trim';
            mesh.userData.VghLantern__SpecMaterial =  'Sapele Hardwood';
            mesh.userData.VghLantern__PartFinish   =  VghLantern__Env3d__RidgeBlock__JoineryFinish(lantern);

            // A placed block is its own object rather than one of a merged set,
            // so it registers whole - the same way a finial does.
            VghLantern__Env3d__PickIndex__RegisterWhole(mesh, 'component', 'ridgeBlock', {
                PlacementId  : placement.Id,
                ComponentId  : summary.AssetId,
                StretchMm    : depths.Ridge.DeltaFromAuthoredMm
            });

            targetGroup.add(mesh);
            summary.PlacedCount++;
        }

        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
