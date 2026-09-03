/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - GLAZE BAR END CAP
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__GlazeBarEndCap__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder GlazeBarEndCap
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Close the cut end of every glaze bar cap at the eaves
   CREATED    : 21-Aug-2026

   DESCRIPTION:
   - 45_1001 is the small cast cap welded to the end of 45_2021. Without it the
     bare extrusion section is left on show at the foot of every bar, which is
     the one thing on a Vale eaves that reads as unfinished.
   - One per bar that has an eaves end. A bar running ridge to hip has none and
     takes none.
   - Placed and oriented entirely from VghLantern__Geometry__GlazeBarAssembly, so
     the drawings and the SketchUp export can place it from the same answer
     without touching Three.

   ---------------------------------------------------------------------------

   THE ORIENTATION IS A BASIS, NOT TWO ANGLES

   A glaze bar is turned in plan AND tilted to its slope, and a hip bar is turned
   to neither of the roof's axes. Composing that from a plan rotation and a pitch
   rotation means fixing an order of application, and an order that is written
   down in one place and assumed in another is how a part ends up mirrored on one
   slope and right on the other three.

   So the geometry publishes three unit vectors - AxisX, AxisY, AxisZ, being where
   the asset's OWN axes point once placed - and this module builds a rotation
   matrix from them. How far the asset is turned within that frame is declared in
   the glaze bar system index as RotationDegrees, so an asset that turns out to
   have been authored lying on its side is corrected in a JSON file rather than
   here.

   THE MILLIMETRE TO WORLD SWAP IS A CHANGE OF BASIS HERE, NOT A SWAP. Model
   (x, y, z) lands as world (x, z, -y), and applying that to a point or to a bare
   direction is the swap itself. But the basis above rotates a MESH, and the mesh
   arrives from the MeshJson loader with its vertices already swapped into world
   orientation. Rotating world oriented vertices by a model space basis lands the
   swap on the part twice. So the basis is carried across as S * M * S inverse,
   which ApplyBasis writes out as its three columns. Both forms are rotations and
   both preserve handedness, which is exactly why the wrong one is not obvious:
   it produces a clean placement, just a quarter turn about the bar.

   WHY THE MATERIAL IS THE COMPONENT ROLE AND NOT THE BAR CAP ROLE

   The cap follows the GLAZE BAR CAP finish, so the two are always the same
   colour. But it is built through the component role, because the two palettes
   are identical in colour, roughness, metalness and clear coat and differ in
   exactly one thing: CapFinishes carries FlatShading, which is right for an
   extrusion with hard section edges and wrong for a cast part whose rolled nose
   is exported with averaged normals already baked in. The ridge end cap is built
   the same way for the same reason.

   ============================================================================= */

import * as THREE from 'three';

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
// REGION | Glaze Bar End Cap Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Lantern Config Location and Asset Fields
    // ------------------------------------------------------------
    const BARS_BLOCK            =  'Lantern__GlazingBars__Config';
    const FIELD_CAP_FINISH      =  'Lantern__GlazingBars__Config__CapFinish';

    const ASSET_FIELD_MESH_3D   =  'Na__Asset__Mesh3D';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Specification Identity
    // ------------------------------------------------------------
    const PART_KEY     =  'glazeBarEndCap';
    const DEFAULT_NAME =  'Glaze Bar End Cap';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finish and Orientation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Finish the Cap Is Powder Coated In
    // ------------------------------------------------------------
    // THE GLAZE BAR CAP'S OWN FINISH, read exactly as the composite builder reads
    // it and with no fallback of its own. A fallback here would be the one way the
    // two could end up different colours: the schema validator seeds this field
    // from the exterior finish on load, so a lantern that reaches a renderer with
    // it empty has skipped normalisation, and the material library answers an
    // empty name with a neutral that deliberately matches no real product. Both
    // parts then read as wrong together, which is what a fault should look like.
    function VghLantern__Env3d__GlazeBarEndCap__Finish(lantern) {
        const bars  =  lantern ? lantern[BARS_BLOCK] : null;
        return bars ? (bars[FIELD_CAP_FINISH] || '') : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Turn a Placement Basis Into a Mesh Rotation
    // ------------------------------------------------------------
    // The columns come from the geometry module rather than being swapped here,
    // because the exporter places this same cap from the same placement and the
    // two must not each carry their own opinion about how model space reaches
    // world. See VghLantern__GlazeBarAssembly__WorldBasis for why this is a change
    // of basis and not a swap of the three vectors.
    //
    // A placement whose basis will not resolve is left unrotated rather than
    // guessed at: the cap then sits square to the lantern, which reads as wrong
    // at a glance, where a guessed rotation would read as merely odd.
    function VghLantern__Env3d__GlazeBarEndCap__ApplyBasis(mesh, placement) {
        const Geometry  =  window.VghLantern__Geometry__GlazeBarAssembly;
        const basis     =  Geometry ? Geometry.VghLantern__GlazeBarAssembly__WorldBasis(placement) : null;
        if (!basis) return;

        mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(
            new THREE.Vector3(basis.ColumnX.x, basis.ColumnX.y, basis.ColumnX.z),
            new THREE.Vector3(basis.ColumnY.x, basis.ColumnY.y, basis.ColumnY.z),
            new THREE.Vector3(basis.ColumnZ.x, basis.ColumnZ.y, basis.ColumnZ.z)
        ));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Place an End Cap on Every Glaze Bar That Reaches the Eaves
    // ------------------------------------------------------------
    // Returns a summary the warning system can read without touching the scene
    // graph. A missing asset is reported once and yields no caps rather than
    // throwing: a lantern that cannot draw its bar ends must still draw its bars.
    export async function VghLantern__Env3d__MeshBuilder__GlazeBarEndCap__Build(targetGroup, barSet, lantern) {
        const summary  =  { PlacedCount : 0, AssetId : '', Warnings : [] };
        if (!targetGroup || !barSet) return summary;

        const Geometry  =  window.VghLantern__Geometry__GlazeBarAssembly;
        const Loader    =  window.VghLantern__AppData__GlazeBarSystemLoader;

        if (!Geometry || !Loader) {
            summary.Warnings.push('Glaze bar system is not available - no bar end cap placed.');
            return summary;
        }

        const placements  =  Geometry.VghLantern__GlazeBarAssembly__EndCapPlacements(barSet, lantern);
        if (placements.length === 0) return summary;                           // <-- No bar reaches an eaves, which is a roof form rather than a fault

        const relationship  =  Geometry.VghLantern__GlazeBarAssembly__EndCapGeometry();
        summary.AssetId     =  relationship.AssetId;

        let asset;
        try {
            asset  =  await Loader.VghLantern__GlazeBarSystemLoader__LoadEndCapAsset();
        } catch (error) {
            summary.Warnings.push('Glaze bar end cap could not be loaded: ' + error.message);
            return summary;
        }

        const meshBlock  =  asset ? asset[ASSET_FIELD_MESH_3D] : null;
        if (!meshBlock) {
            summary.Warnings.push('Glaze bar end cap ' + relationship.AssetId
                + ' carries no 3D mesh - every bar will read as an open extrusion at the eaves.');
            return summary;
        }

        const finishName  =  VghLantern__Env3d__GlazeBarEndCap__Finish(lantern);
        const material    =  VghLantern__Env3d__MaterialLibrary__Component(finishName);

        let i, placement, mesh, world;

        for (i = 0; i < placements.length; i++) {
            placement  =  placements[i];

            // Geometry is shared across every placement by the MeshJson loader's
            // own cache, so forty bars cost one buffer and forty Mesh wrappers.
            mesh  =  VghLantern__Env3d__MeshJson__BuildMesh(relationship.AssetId, meshBlock, material);
            if (!mesh) {
                summary.Warnings.push('Glaze bar end cap ' + relationship.AssetId + ' produced no geometry.');
                return summary;
            }

            mesh.name  =  'VghLantern__Env3d__GlazeBarEndCap__' + placement.Id;

            world  =  VghLantern__Env3d__ConfigAccess__PointToWorld(placement.Point);
            mesh.position.set(world.x, world.y, world.z);
            VghLantern__Env3d__GlazeBarEndCap__ApplyBasis(mesh, placement);

            mesh.userData.VghLantern__PartKey       =  PART_KEY;
            mesh.userData.VghLantern__PartName      =  relationship.PartName || DEFAULT_NAME;
            mesh.userData.VghLantern__AssetId       =  relationship.AssetId;
            mesh.userData.VghLantern__ElementType   =  relationship.ElementType;
            mesh.userData.VghLantern__ElementRole   =  relationship.ElementRole;
            mesh.userData.VghLantern__SpecMaterial  =  relationship.SpecMaterial;
            mesh.userData.VghLantern__PartFinish    =  finishName;

            VghLantern__Env3d__PickIndex__RegisterWhole(mesh, 'component', PART_KEY, {
                PlacementId   : placement.Id,
                ComponentId   : relationship.AssetId,
                BarId         : placement.BarId,
                SlopeKey      : placement.SlopeKey,
                Anchor        : { Id : placement.Id, Role : 'glazeBarEaves' },
                IsPlaceholder : false
            });

            targetGroup.add(mesh);
            summary.PlacedCount++;
        }

        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
