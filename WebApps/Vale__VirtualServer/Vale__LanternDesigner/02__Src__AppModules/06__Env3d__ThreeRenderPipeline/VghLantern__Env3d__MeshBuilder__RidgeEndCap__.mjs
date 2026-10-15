/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - RIDGE END CAP
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__RidgeEndCap__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder RidgeEndCap
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Place the cast aluminium cap that closes each end of the ridge
   CREATED    : 20-Aug-2026

   DESCRIPTION:
   - The decorative cap on the end of the ridge capping. It closes the extrusion,
     forms the weathering detail over the ridge end, and carries the finial.
   - Placed at the ridge end points - the same junction the octagonal block hangs
     from, seen from above the roof rather than below it - with its origin
     directly on the point and no vertical offset. The asset is authored about
     that datum and occupies 56 to 100 above it, which is the same band the
     capping section occupies, so the cap reads as the end of that extrusion.
   - Separate from the ridge assembly builder for the reason the block builder is:
     it is a mesh component placed at a point, not a section swept along a line.
     Its data comes from the component library and is built through the MeshJson
     loader.

   ---------------------------------------------------------------------------

   TWO VARIANTS, CHOSEN BY WHAT THE ANCHOR IS

   47_1011  RIDGE END   Carries a socket face 95mm in from the point whose section
                        is the capping's own outline. RidgeAssembly cuts the
                        capping back to that plane, so the two meet with no
                        fitting and nothing overlaps.

   47_1012  APEX        The pyramid variant. Four hips converge on one point with
                        no ridge and no capping, so a socket would open onto
                        nothing; this one closes as a full octagon instead.

   A square lantern reaches the apex case without anybody choosing Pyramid,
   because the ridge collapses to a point on its own. That is why the variant is
   resolved from the placement's anchor role rather than from the roof form the
   user picked.

   THE ROTATION IS THE MIRROR

   The asset's local +Y points back down the ridge towards the middle, so the two
   caps sit 180 degrees apart. The cap is symmetric across its local X, which
   makes that turn identical to the mirrored instance the workshop drawing shows -
   so both ends share one buffer and there is no reflected geometry to build.

   WHY THE MATERIAL IS THE COMPONENT ROLE AND NOT THE BAR CAP ROLE

   The cap follows the RIDGE CAPPING finish, so cap, capping and finial move
   together when the capping is diverged to White Painted or Lead. But it is built
   through the component role rather than the glaze bar cap role, because the two
   palettes are identical in colour, roughness, metalness and clear coat and
   differ in exactly one thing: CapFinishes carries FlatShading, which is right
   for a welded extrusion with hard section edges and wrong for a cast cap whose
   rolled edges are exported with averaged normals already baked in.

   WHERE THE GEOMETRY IS CACHED

   In the MeshJson loader's own cache, keyed by asset id. Unlike the block, this
   mesh does not change with the ridge beam depth - nothing about it is stretched -
   so there is no depth in the key and no reason for a cache of its own.

   ============================================================================= */

import {
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__Component
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__MeshJson__BuildMesh
} from './VghLantern__Env3d__ComponentLoader__MeshJson__.mjs';

import {
    VghLantern__Env3d__PickIndex__RegisterWhole
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Ridge End Cap Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Lantern Config Location and Asset Fields
    // ------------------------------------------------------------
    const FINISH_BLOCK         =  'Lantern__FinishAndGlazing__Config';
    const FIELD_FRAME_FINISH   =  'Lantern__FinishAndGlazing__Config__FrameFinish';

    const ASSET_FIELD_MESH_3D  =  'Na__Asset__Mesh3D';
    const DEG_TO_RAD           =  Math.PI / 180;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Specification Identity
    // ------------------------------------------------------------
    // Trim and Decoration, identical to the capping this part terminates.
    // Decoration is the drawing office word and belongs in ElementRole;
    // ElementType stays inside the five word vocabulary the isolation views and
    // the specification tables filter on.
    const PART_KEY        =  'ridgeEndCap';
    const ELEMENT_TYPE    =  'Trim';
    const ELEMENT_ROLE    =  'Decoration';
    const SPEC_MATERIAL   =  'Powder Coated Aluminium';
    const DEFAULT_NAME    =  'Ridge End Cap';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finish Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Finish the Cap Is Powder Coated In
    // ------------------------------------------------------------
    // The ridge capping's finish, falling back to the lantern's exterior finish
    // when the capping has not been diverged. That is the same order the ridge
    // assembly builder resolves the capping itself in, asked of the same loader,
    // so the cap cannot end up a different colour from the extrusion it closes.
    //
    // An empty answer is passed straight through rather than substituted, for the
    // reason the loader documents: the material library answers an unknown finish
    // with a neutral that deliberately matches no real product, so an
    // un-normalised project reads as wrong rather than as a plausible cap in the
    // wrong colour.
    function VghLantern__Env3d__RidgeEndCap__Finish(lantern) {
        const Loader  =  window.VghLantern__AppData__RidgeSystemLoader;

        const block     =  lantern ? lantern[FINISH_BLOCK] : null;
        const exterior  =  block ? (block[FIELD_FRAME_FINISH] || '') : '';
        const stored    =  Loader ? (Loader.VghLantern__RidgeSystemLoader__CappingFinish(lantern) || '') : '';

        return stored || exterior;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Place an End Cap at Every Ridge End
    // ------------------------------------------------------------
    // Two placements on a hipped ridge, one at the apex of a pyramid, none on a
    // Leaded Only ridge - that type carries no capping, so there is nothing for a
    // cap to close and no warning to raise about its absence.
    //
    // Plan rotation maps straight onto a Three rotation about world +Y, the same
    // as the block's: the millimetre-to-world swap sends model +X to world +X and
    // model +Y to world -Z, and a counter-clockwise turn about model +Z comes out
    // as the same angle about world +Y with no sign change.
    //
    // Returns a summary the warning system can read without touching the scene
    // graph. A missing variant is reported rather than thrown: a lantern that
    // cannot draw its end caps must still draw everything else.
    export async function VghLantern__Env3d__MeshBuilder__RidgeEndCap__Build(targetGroup, skeleton, lantern) {
        const summary  =  { PlacedCount : 0, AssetIds : [], Warnings : [] };
        if (!targetGroup || !skeleton) return summary;

        const Geometry  =  window.VghLantern__Geometry__RidgeAssembly;
        const Loader    =  window.VghLantern__AppData__RidgeSystemLoader;

        if (!Geometry || !Loader) {
            summary.Warnings.push('Ridge system is not available - no ridge end cap placed.');
            return summary;
        }

        // NO CAPPING, NO CAP | A Leaded Only ridge finishes in lead over a timber
        // block and has no aluminium extrusion for a cap to close. Silently correct
        // rather than a warning, the same way finials simply do not appear on it.
        if (Loader.VghLantern__RidgeSystemLoader__AllowsEndCaps(lantern) === false) return summary;

        const placements  =  Geometry.VghLantern__RidgeAssembly__EndCapPlacements(skeleton);
        if (placements.length === 0) return summary;                           // <-- A roof form with no ridge and no apex

        const finishName  =  VghLantern__Env3d__RidgeEndCap__Finish(lantern);
        const material    =  VghLantern__Env3d__MaterialLibrary__Component(finishName);

        let i, placement, variant, asset, mesh, world;

        for (i = 0; i < placements.length; i++) {
            placement  =  placements[i];
            variant    =  Loader.VghLantern__RidgeSystemLoader__EndCapVariant(placement.Role);

            if (!variant) {
                summary.Warnings.push('No end cap is declared for a "' + placement.Role
                    + '" anchor - the ridge will read as unterminated and the finial as unseated.');
                continue;
            }

            try {
                asset  =  await Loader.VghLantern__RidgeSystemLoader__LoadEndCapAsset(placement.Role);
            } catch (error) {
                summary.Warnings.push('Ridge end cap ' + variant.AssetId + ' could not be loaded: ' + error.message);
                continue;
            }

            const meshBlock  =  asset ? asset[ASSET_FIELD_MESH_3D] : null;
            if (!meshBlock) {
                summary.Warnings.push('Ridge end cap ' + variant.AssetId
                    + ' carries no 3D mesh - the ridge will read as unterminated.');
                continue;
            }

            // Geometry is shared between placements by the MeshJson loader's own
            // cache, so the second cap costs a Mesh wrapper and nothing else.
            mesh  =  VghLantern__Env3d__MeshJson__BuildMesh(variant.AssetId, meshBlock, material);
            if (!mesh) {
                summary.Warnings.push('Ridge end cap ' + variant.AssetId + ' produced no geometry.');
                continue;
            }

            mesh.name  =  'VghLantern__Env3d__RidgeEndCap__' + placement.Id;

            world  =  VghLantern__Env3d__ConfigAccess__PointToWorld(placement.Point);
            mesh.position.set(world.x, world.y, world.z);
            mesh.rotation.y  =  Number(placement.PlanRotationDegrees) * DEG_TO_RAD;

            mesh.userData.VghLantern__PartKey       =  PART_KEY;
            mesh.userData.VghLantern__PartName      =  variant.PartName || DEFAULT_NAME;
            mesh.userData.VghLantern__AssetId       =  variant.AssetId;
            mesh.userData.VghLantern__ElementType   =  ELEMENT_TYPE;
            mesh.userData.VghLantern__ElementRole   =  ELEMENT_ROLE;
            mesh.userData.VghLantern__SpecMaterial  =  SPEC_MATERIAL;
            mesh.userData.VghLantern__PartFinish    =  finishName;

            // A placed cap is its own object rather than one of a merged set, so it
            // registers whole - the same way the block and a finial do.
            // Anchor is spelled the way the finial's record spells it, because the
            // inspector reads that shape to name what it is hovering: without it a
            // cap would report as an unnamed placed component.
            VghLantern__Env3d__PickIndex__RegisterWhole(mesh, 'component', PART_KEY, {
                PlacementId   : placement.Id,
                ComponentId   : variant.AssetId,
                Anchor        : { Id : placement.Id, Role : placement.Role },
                IsPlaceholder : false
            });

            targetGroup.add(mesh);
            summary.PlacedCount++;

            if (summary.AssetIds.indexOf(variant.AssetId) === -1) summary.AssetIds.push(variant.AssetId);
        }

        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
