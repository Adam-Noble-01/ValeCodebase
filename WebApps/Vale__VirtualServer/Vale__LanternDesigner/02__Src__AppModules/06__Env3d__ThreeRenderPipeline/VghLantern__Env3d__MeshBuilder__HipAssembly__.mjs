/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - HIP ASSEMBLY
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__HipAssembly__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder HipAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Extrude the real Vale multi part hip along every hip datum
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - A Vale hip is four sections sharing one datum, the same way the ridge is six
     and a glaze bar is three:

         Hip Core       48_2001   mill aluminium, welded to the eaves extrusion
                                  at its foot and the ridge core at its head
         Hip Beam       48_2021   Sapele, the decorative internal beam seen from
                                  the room, plumb cut at both ends
         Hip Blocking   48_2101   Sapele fillet, substrate for the lead
         Hip Flashing   48_2121   lead, the weathering projection

   - Each part is extruded along all four hip datums and lands in ONE merged mesh
     per part rather than one per hip: four hips times four parts would otherwise
     be sixteen draw calls for geometry sharing four materials.
   - This module PLACES and SWEEPS. The section angle solve, the depth stretch
     and the end cut planes are all done upstream in millimetre space by
     VghLantern__Geometry__HipAssembly.

   ---------------------------------------------------------------------------

   THE THREE END TREATMENTS AT THE EAVES, AND WHY THEY DIFFER

       beam   plumb cut at BOTH ends: 18mm inboard of the eaves datum corner at
              its foot, and flush on the octagonal block facet at its head. Both
              cuts are vertical planes with the same horizontal normal - the
              hip's own plan direction, which on a square corner is the 45 degree
              bisector and is also the outward normal of the facet it dies into.

       core   extended 42.5mm along its own pitch past the eaves datum, square
              cut, landing on the eaves extrusion it is welded to. The same
              extension a glaze bar core takes, read from the base frame system
              so the two cannot drift apart.

       blocking / flashing
              OVERSAIL past the eaves datum to the outer edge of the glass, level
              with the glaze bar cap ends. The weathering over a hip has to see
              water off the roof; stopping it on the datum would deliver it into
              the corner of the frame, which is the one place on a lantern water
              must never be put. The distance is not authored - it falls out of
              the roof and lengthens as the pitch flattens - and it lands exactly
              on the glass corner because the glazing builder extends that corner
              by the same construction. See Geometry HipAssembly OversailFoot.

   All four run up to the ridge end point at their head; only the beam is cut back
   there.

   THE GLAZE BAR HIP

   A lantern specified with a Glaze Bar Hip is drawn with hip beams and the
   substitution is reported. The type is offered before its geometry exists so a
   specification can carry the intent; drawing nothing at all would be worse than
   drawing the wrong hip, and drawing the wrong hip silently would be worse than
   both.

   ============================================================================= */

import {
    VghLantern__Env3d__MaterialLibrary__MillAluminium,
    VghLantern__Env3d__MaterialLibrary__LeadFlashing,
    VghLantern__Env3d__MaterialLibrary__SapeleHardwood,
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
// REGION | Hip Assembly Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Lantern Config Locations
    // ------------------------------------------------------------
    const FINISH_BLOCK            =  'Lantern__FinishAndGlazing__Config';
    const FIELD_JOINERY_FINISH    =  'Lantern__FinishAndGlazing__Config__JoineryPaintFinish';
    const DEFAULT_JOINERY_FINISH  =  'Farrow and Ball Ammonite';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Part Keys
    // ------------------------------------------------------------
    const PART_CORE      =  'core';
    const PART_BEAM      =  'beam';
    const PART_BLOCKING  =  'blocking';
    const PART_FLASHING  =  'flashing';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Materials and Finishes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The One Finish the Hip Is Specified With
    // ------------------------------------------------------------
    // Only the beam is finished, and it is interior painted joinery following the
    // master joinery finish - the same decision, made once, that the ridge beam
    // and the interior cornice follow. Nothing else in a hip is ever seen: the
    // core is buried, the fillet is under lead, and the lead is lead.
    function VghLantern__Env3d__HipAssembly__JoineryFinish(lantern) {
        const block  =  lantern ? lantern[FINISH_BLOCK] : null;
        const value  =  block ? block[FIELD_JOINERY_FINISH] : null;
        return (value === null || value === undefined || value === '') ? DEFAULT_JOINERY_FINISH : value;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    function VghLantern__Env3d__HipAssembly__MaterialForPart(partKey, joineryFinish) {
        if (partKey === PART_CORE)     return VghLantern__Env3d__MaterialLibrary__MillAluminium();
        if (partKey === PART_BEAM)     return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(joineryFinish);
        if (partKey === PART_FLASHING) return VghLantern__Env3d__MaterialLibrary__LeadFlashing();
        if (partKey === PART_BLOCKING) return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
        return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    function VghLantern__Env3d__HipAssembly__StampUserData(mesh, part, finishName) {
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

    // FUNCTION | Build Every Hip in the Roof as a Multi Part Assembly
    // ------------------------------------------------------------
    // Returns a summary the takeoff and the warning system can read without
    // touching the scene graph. A missing system index is reported and yields an
    // empty summary rather than throwing.
    export async function VghLantern__Env3d__MeshBuilder__HipAssembly__Build(targetGroup, skeleton, lantern) {
        const summary  =  { Parts : [], HipCount : 0, Warnings : [], DepthResolution : null, TypeKey : '' };
        if (!targetGroup || !skeleton) return summary;

        const Geometry       =  window.VghLantern__Geometry__HipAssembly;
        const RidgeGeometry  =  window.VghLantern__Geometry__RidgeAssembly;
        const Loader         =  window.VghLantern__AppData__HipSystemLoader;

        if (!Geometry || !RidgeGeometry || !Loader) {
            summary.Warnings.push('Hip system is not available - no hips built.');
            return summary;
        }

        const hips  =  Geometry.VghLantern__HipAssembly__HipMembers(skeleton);
        if (hips.length === 0) return summary;                                 // <-- A roof form with no hips, which is not a failure

        let resolved;
        try {
            resolved  =  await Loader.VghLantern__HipSystemLoader__ResolveParts(lantern);
        } catch (error) {
            summary.Warnings.push('Hip parts could not be resolved: ' + error.message);
            return summary;
        }

        const parts  =  resolved ? resolved.Parts : [];
        if (!parts || parts.length === 0) {
            summary.Warnings.push('Hip system resolved no parts.');
            return summary;
        }

        // THE TYPE ACTUALLY BUILT | A substitution is surfaced rather than
        // absorbed. What is on screen is not what was specified, and the person
        // reading the specification has to be told so by something other than
        // their own memory.
        summary.TypeKey  =  Loader.VghLantern__HipSystemLoader__TypeKey(lantern);
        if (resolved.BuildType && resolved.BuildType.WasSubstituted) {
            summary.Warnings.push(resolved.BuildType.Message);
        }

        // PITCH AND DEPTH | The ridge geometry module owns the depth resolution
        // because the two depths are one decision. Asking it here rather than
        // holding a second copy is what stops the pair drifting apart.
        const depths   =  RidgeGeometry.VghLantern__RidgeAssembly__DepthResolution(lantern, skeleton);
        const pitch    =  RidgeGeometry.VghLantern__RidgeAssembly__PitchDegrees(skeleton);
        const adapted  =  Geometry.VghLantern__HipAssembly__SectionsForPitch(parts, {
            PitchDegrees : pitch,
            BeamDeltaMm  : depths.Hip.DeltaFromAuthoredMm
        });

        const joineryFinish  =  VghLantern__Env3d__HipAssembly__JoineryFinish(lantern);

        summary.DepthResolution  =  depths;
        summary.HipCount         =  hips.length;

        if (depths.Hip.WasClamped) {
            summary.Warnings.push('Hip beam depth override was limited to '
                + depths.Hip.AdjustmentMm + 'mm; ' + depths.Hip.RequestedAdjustmentMm + 'mm was requested.');
        }

        let p, part, h, run, runs, material, spans, mesh;

        for (p = 0; p < adapted.length; p++) {
            part  =  adapted[p];
            if (!part.Faces || part.Faces.length === 0) continue;

            // ONE RUN PER HIP | Each hip answers its own end treatment for this
            // part, because the cut planes depend on the hip's own plan direction
            // and every corner points a different way. The pitch goes in because
            // the blocking and the flashing oversail past the eaves datum by a
            // distance the roof decides rather than one anybody authored.
            runs  =  [];
            for (h = 0; h < hips.length; h++) {
                run  =  Geometry.VghLantern__HipAssembly__RunForPart(part.PartKey, hips[h], pitch);
                runs.push({
                    Record  : hips[h],
                    StartMm : run.StartMm,
                    EndMm   : run.EndMm,
                    Planes  : run.Planes
                });
            }

            material  =  VghLantern__Env3d__HipAssembly__MaterialForPart(part.PartKey, joineryFinish);
            spans     =  [];
            mesh      =  VghLantern__Env3d__SectionSolid__BuildRunSetMesh(
                part.Faces, runs, material,
                'VghLantern__Env3d__Hip__' + part.PartKey,
                spans, 0);

            if (!mesh) continue;

            VghLantern__Env3d__HipAssembly__StampUserData(mesh, part,
                part.PartKey === PART_BEAM ? joineryFinish : '');
            VghLantern__Env3d__PickIndex__Register(mesh, 'member', 'hip__' + part.PartKey, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                ElementRole      : part.ElementRole,
                SpecMaterial     : part.SpecMaterial,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                PartFinish       : part.PartKey === PART_BEAM ? joineryFinish : '',
                BuiltHipCount    : spans.length
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No hip part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
