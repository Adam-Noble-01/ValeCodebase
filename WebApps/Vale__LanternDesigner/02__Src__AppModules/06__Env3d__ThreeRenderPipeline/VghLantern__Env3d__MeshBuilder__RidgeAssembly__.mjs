/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - RIDGE ASSEMBLY
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__RidgeAssembly__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder RidgeAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Extrude the real Vale multi part ridge along the ridge datum
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - A Vale ridge is not one section. It is a stack of up to six sharing one
     datum, and the model now says so:

         Ridge Core       47_2001   mill aluminium, the structural spine every
                                    hip core and glaze bar core welds to
         Ridge Beam       47_2021   Sapele, the decorative internal beam seen
                                    from the room, plumb cut into the block
         Ridge Blocking   47_2101   Sapele packer, substrate for the lead
         Ridge Flashing   47_2121   lead, the weathering projection
         Capping Block    47_2202   Sapele upstand, capped ridge only
         Ridge Capping    47_2201   powder coated aluminium, capped ridge only

   - Each part is extruded from its own authored cross-section along the ridge
     datum and lands in its own merged mesh. Six meshes rather than one is the
     whole point: each part is separately pickable, separately isolatable by
     element type, and separately countable on a cutting list.
   - This module PLACES and SWEEPS. Every millimetre of adaptation - the beam
     depth stretch, the blocking's re-solved seating faces, the flashing's
     re-folded wings, the plumb cut planes at the block - is done upstream in
     millimetre space by VghLantern__Geometry__RidgeAssembly, so the 2D drawing
     pipeline and the SketchUp exporter can reach the same numbers without
     touching Three.

   ---------------------------------------------------------------------------

   THE TWO RIDGE TYPES

   An Aluminium Capped Ridge carries all six parts. A Leaded Only Ridge carries
   the first four: with no decorative capping there is nothing for the capping
   block to carry either. Which parts a type includes is declared in the ridge
   system index and resolved by the loader, so this module never tests a type
   name - it extrudes whatever list it is handed, in the order it is handed it.

   WHAT IS NOT BUILT HERE

   The octagonal block at each ridge end is a mesh component rather than a swept
   section, so MeshBuilder__RidgeBlock owns it. It is a separate operation on
   separate data and shares nothing with this module but the placements the
   geometry brain publishes.

   ============================================================================= */

import {
    VghLantern__Env3d__MaterialLibrary__MillAluminium,
    VghLantern__Env3d__MaterialLibrary__LeadFlashing,
    VghLantern__Env3d__MaterialLibrary__SapeleHardwood,
    VghLantern__Env3d__MaterialLibrary__GlazeBarCap,
    VghLantern__Env3d__MaterialLibrary__GlazeBarTrim
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__SectionSolid__BuildRunSetMesh
} from './VghLantern__Env3d__MeshBuilder__SectionSolid__.mjs';

import {
    VghLantern__Env3d__PickIndex__Register,
    VghLantern__Env3d__PickIndex__ModeTriangle
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Ridge Assembly Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Lantern Config Locations
    // ------------------------------------------------------------
    const FINISH_BLOCK            =  'Lantern__FinishAndGlazing__Config';
    const FIELD_JOINERY_FINISH    =  'Lantern__FinishAndGlazing__Config__JoineryPaintFinish';
    const FIELD_FRAME_FINISH      =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    const DEFAULT_JOINERY_FINISH  =  'Farrow and Ball Ammonite';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Part Keys
    // ------------------------------------------------------------
    // Named rather than matched by string at the call sites, so a rename in the
    // index is one edit here rather than five scattered comparisons.
    const PART_CORE           =  'core';
    const PART_BEAM           =  'beam';
    const PART_BLOCKING       =  'blocking';
    const PART_FLASHING       =  'flashing';
    const PART_CAPPING_BLOCK  =  'cappingBlock';
    const PART_CAPPING        =  'capping';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Materials and Finishes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Field From a Lantern Config Block
    // ------------------------------------------------------------
    function VghLantern__Env3d__RidgeAssembly__ReadField(lantern, blockKey, fieldKey, fallback) {
        const block  =  lantern ? lantern[blockKey] : null;
        const value  =  block ? block[fieldKey] : null;
        return (value === null || value === undefined || value === '') ? fallback : value;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Two Finishes the Ridge Is Specified With
    // ------------------------------------------------------------
    // The beam is interior painted joinery and follows the master joinery finish.
    // The capping is exterior powder coating and follows the exterior finish, the
    // same macro the glaze bar cap follows - a ridge capping and a bar cap are the
    // same coating on the same roof and are never separately specified.
    //
    // A ridge that has diverged its capping stores its own value, and that wins.
    // Everything else in the stack is fixed material and takes no finish.
    function VghLantern__Env3d__RidgeAssembly__Finishes(lantern) {
        const Loader  =  window.VghLantern__AppData__RidgeSystemLoader;

        const joinery  =  VghLantern__Env3d__RidgeAssembly__ReadField(
            lantern, FINISH_BLOCK, FIELD_JOINERY_FINISH, DEFAULT_JOINERY_FINISH);

        const exterior  =  VghLantern__Env3d__RidgeAssembly__ReadField(
            lantern, FINISH_BLOCK, FIELD_FRAME_FINISH, '');

        const stored  =  Loader ? Loader.VghLantern__RidgeSystemLoader__CappingFinish(lantern) : '';

        return { Joinery : joinery, Capping : stored || exterior };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    // Two of the six are finished; the other four are fixed materials. The core
    // is bare mill extrusion and the two timber packers are bare Sapele, all
    // three concealed the moment the part above them is on, and the lead is lead.
    function VghLantern__Env3d__RidgeAssembly__MaterialForPart(partKey, finishes) {
        if (partKey === PART_CORE)          return VghLantern__Env3d__MaterialLibrary__MillAluminium();
        if (partKey === PART_BEAM)          return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Joinery);
        if (partKey === PART_FLASHING)      return VghLantern__Env3d__MaterialLibrary__LeadFlashing();
        if (partKey === PART_CAPPING)       return VghLantern__Env3d__MaterialLibrary__GlazeBarCap(finishes.Capping);
        if (partKey === PART_BLOCKING)      return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
        if (partKey === PART_CAPPING_BLOCK) return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
        return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name the Finish a Part Was Built In
    // ------------------------------------------------------------
    // The same branch the material lookup takes, answered as a name so the hover
    // inspector can quote it. Empty on every fixed material part, because a bare
    // extrusion and a concealed packer have no finish to quote.
    function VghLantern__Env3d__RidgeAssembly__FinishForPart(partKey, finishes) {
        if (partKey === PART_BEAM)    return finishes.Joinery;
        if (partKey === PART_CAPPING) return finishes.Capping;
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    // Everything downstream reads the part from here rather than parsing the mesh
    // name: the isolation toggle filters on ElementType, the hover inspector
    // labels from PartName, and a takeoff can total SectionAreaSqMm against the
    // ridge length without going back to the asset file.
    function VghLantern__Env3d__RidgeAssembly__StampUserData(mesh, part, finishName) {
        mesh.userData.VghLantern__PartKey         =  part.PartKey;
        mesh.userData.VghLantern__PartName        =  part.PartName;
        mesh.userData.VghLantern__AssetId         =  part.AssetId;
        mesh.userData.VghLantern__ElementType     =  part.ElementType;
        mesh.userData.VghLantern__ElementRole     =  part.ElementRole;
        mesh.userData.VghLantern__SpecMaterial    =  part.SpecMaterial;
        mesh.userData.VghLantern__SectionAreaSqMm =  part.SectionAreaSqMm;
        mesh.userData.VghLantern__PartFinish      =  finishName || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Ridge as a Multi Part Assembly
    // ------------------------------------------------------------
    // Returns a summary the takeoff and the warning system can read without
    // touching the scene graph. A missing system index is reported and yields an
    // empty summary rather than throwing: a lantern that cannot draw its ridge
    // must still draw everything else.
    //
    // A pyramid has no ridge and returns an empty summary without a warning. That
    // is not a failure, it is a roof form, and the block at its apex is still
    // built by the block builder.
    export async function VghLantern__Env3d__MeshBuilder__RidgeAssembly__Build(targetGroup, skeleton, lantern) {
        const summary  =  { Parts : [], RidgeLengthMm : 0, Warnings : [], DepthResolution : null, TypeKey : '' };
        if (!targetGroup || !skeleton) return summary;

        const Geometry  =  window.VghLantern__Geometry__RidgeAssembly;
        const Loader    =  window.VghLantern__AppData__RidgeSystemLoader;

        if (!Geometry || !Loader) {
            summary.Warnings.push('Ridge system is not available - no ridge built.');
            return summary;
        }

        const ridgeMember  =  Geometry.VghLantern__RidgeAssembly__RidgeMember(skeleton);
        if (!ridgeMember) return summary;                                      // <-- Pyramid: no ridge to build, and that is correct

        let parts;
        try {
            parts  =  await Loader.VghLantern__RidgeSystemLoader__ResolveParts(lantern);
        } catch (error) {
            summary.Warnings.push('Ridge parts could not be resolved: ' + error.message);
            return summary;
        }

        if (!parts || parts.length === 0) {
            summary.Warnings.push('Ridge system resolved no parts.');
            return summary;
        }

        // PITCH AND DEPTH | Resolved once for the whole assembly. The depth
        // resolution carries the hip's answer too, which this build does not use
        // but the summary publishes so the warning system can report a clamped
        // override once rather than once per assembly.
        const depths    =  Geometry.VghLantern__RidgeAssembly__DepthResolution(lantern, skeleton);
        const pitch     =  Geometry.VghLantern__RidgeAssembly__PitchDegrees(skeleton);
        const adapted   =  Geometry.VghLantern__RidgeAssembly__SectionsForPitch(parts, {
            PitchDegrees : pitch,
            BeamDeltaMm  : depths.Ridge.DeltaFromAuthoredMm
        });

        const finishes  =  VghLantern__Env3d__RidgeAssembly__Finishes(lantern);

        summary.DepthResolution  =  depths;
        summary.TypeKey          =  Loader.VghLantern__RidgeSystemLoader__TypeKey(lantern);
        summary.RidgeLengthMm    =  Math.hypot(
            ridgeMember.End.x - ridgeMember.Start.x,
            ridgeMember.End.y - ridgeMember.Start.y,
            ridgeMember.End.z - ridgeMember.Start.z);

        if (depths.Ridge.WasClamped) {
            summary.Warnings.push('Ridge beam depth override was limited to '
                + depths.Ridge.AdjustmentMm + 'mm; ' + depths.Ridge.RequestedAdjustmentMm + 'mm was requested.');
        }

        let p, part, material, spans, mesh, runs;

        for (p = 0; p < adapted.length; p++) {
            part  =  adapted[p];
            if (!part.Faces || part.Faces.length === 0) continue;

            // ONE RUN PER PART | The ridge is a single member, so the run set has
            // one entry. It is still built through the shared run-set path rather
            // than a special case, because the hip's four runs use the identical
            // call and one code shape across the two is worth more than the loop
            // saved on this one.
            runs  =  [{
                Record  : ridgeMember,
                StartMm : ridgeMember.Start,
                EndMm   : ridgeMember.End,
                Planes  : Geometry.VghLantern__RidgeAssembly__EndPlanesForPart(part.PartKey, skeleton)
            }];

            material  =  VghLantern__Env3d__RidgeAssembly__MaterialForPart(part.PartKey, finishes);
            spans     =  [];
            mesh      =  VghLantern__Env3d__SectionSolid__BuildRunSetMesh(
                part.Faces, runs, material,
                'VghLantern__Env3d__Ridge__' + part.PartKey,
                spans, 0);

            if (!mesh) continue;

            VghLantern__Env3d__RidgeAssembly__StampUserData(mesh, part,
                VghLantern__Env3d__RidgeAssembly__FinishForPart(part.PartKey, finishes));
            VghLantern__Env3d__PickIndex__Register(mesh, 'member', 'ridge__' + part.PartKey, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                ElementRole      : part.ElementRole,
                SpecMaterial     : part.SpecMaterial,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                PartFinish       : VghLantern__Env3d__RidgeAssembly__FinishForPart(part.PartKey, finishes)
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No ridge part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
