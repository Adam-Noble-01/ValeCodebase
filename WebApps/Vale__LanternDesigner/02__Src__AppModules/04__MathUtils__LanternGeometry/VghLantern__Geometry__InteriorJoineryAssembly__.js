/* =============================================================================
   VGHLANTERN - INTERIOR JOINERY ASSEMBLY GEOMETRY
   =============================================================================

   FILE       : VghLantern__Geometry__InteriorJoineryAssembly__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - InteriorJoineryAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pure geometry for interior cornice, packer and eaves trim
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Interior joinery sweeps around the SAME eaves datum ring as the base frame.
     Section 0,0 is the eaves datum; +x runs inboard into the room.
   - Cornice and packer sections pass through as exported.
   - Eaves trim top edge is authored to the reference pitch plane
     y = x * tan(ReferencePitchDegrees). At any other roof pitch, top-edge
     vertices (those lying on that plane within tolerance) are remapped onto
     y = x * tan(currentPitch) so the board meets the pitched underside and
     does not clip through on steeper angles.
   - Contains no DOM access and no fetches. Faces passed in are never mutated.

   ============================================================================= */

// =============================================================================
// REGION | Interior Joinery Assembly Geometry Module
// =============================================================================

const VghLantern__Geometry__InteriorJoineryAssembly = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pitch Remap Guards
    // ------------------------------------------------------------
    const DEG_TO_RAD              =  Math.PI / 180;
    const TOP_PLANE_TOLERANCE_MM  =  0.75;                                   // <-- mm - export coords carry three decimals
    const FALLBACK_REF_PITCH_DEG  =  19.88;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loader Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Interior Joinery System Loader, if Present
    // ------------------------------------------------------------
    function VghLantern__InteriorJoineryAssembly__Loader() {
        return window.VghLantern__AppData__InteriorJoinerySystemLoader || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Reference Pitch the Assets Were Exported At
    // ------------------------------------------------------------
    function VghLantern__InteriorJoineryAssembly__ReferencePitchDegrees() {
        var loader  =  VghLantern__InteriorJoineryAssembly__Loader();
        if (loader) return loader.VghLantern__InteriorJoinerySystemLoader__ReferencePitchDegrees();
        return FALLBACK_REF_PITCH_DEG;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Transforms
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Deep Copy Faces With a Point Transform
    // ------------------------------------------------------------
    function VghLantern__InteriorJoineryAssembly__MapFaces(faces, transformPoint) {
        var out  =  [];
        var i, j, face, points;

        for (i = 0; i < faces.length; i++) {
            face    =  faces[i];
            points  =  [];
            for (j = 0; j < face.Points.length; j++) {
                points.push(transformPoint(face.Points[j]));
            }
            out.push({
                Points    : points,
                Rings     : face.Rings,
                Triangles : face.Triangles,
                AreaSqMm  : face.AreaSqMm,
                HoleCount : face.HoleCount
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remap Eaves Trim Top Edge Onto the Current Pitch Plane
    // ------------------------------------------------------------
    // The exported top edge lies on y = x * tan(refPitch). Vertices within
    // TOP_PLANE_TOLERANCE_MM of that plane (and above the seating mid-height so
    // lower returns are not touched) move onto y = x * tan(pitch).
    function VghLantern__InteriorJoineryAssembly__ReslopeEavesTrimTop(faces, pitchDegrees) {
        var refPitch  =  VghLantern__InteriorJoineryAssembly__ReferencePitchDegrees();
        var refTan    =  Math.tan(refPitch * DEG_TO_RAD);
        var pitchTan  =  Math.tan(Number(pitchDegrees) * DEG_TO_RAD);

        return VghLantern__InteriorJoineryAssembly__MapFaces(faces, function(pt) {
            var expectedY  =  pt.x * refTan;
            if (pt.y < -20) return { x: pt.x, y: pt.y };                     // <-- Leave the seat and lower returns alone
            if (Math.abs(pt.y - expectedY) > TOP_PLANE_TOLERANCE_MM) {
                return { x: pt.x, y: pt.y };
            }
            return { x: pt.x, y: pt.x * pitchTan };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Transform Every Resolved Part's Section for a Roof Pitch
    // ------------------------------------------------------------
    function VghLantern__InteriorJoineryAssembly__SectionsForPitch(parts, pitchDegrees) {
        var out  =  [];
        var i, part, faces;

        for (i = 0; i < parts.length; i++) {
            part   =  parts[i];
            faces  =  part.Faces;

            if (part.ReslopesTopWithRoofPitch) {
                faces  =  VghLantern__InteriorJoineryAssembly__ReslopeEavesTrimTop(faces, pitchDegrees);
            }

            out.push({
                PartKey               : part.PartKey,
                PartName              : part.PartName,
                AssetId               : part.AssetId,
                ElementType           : part.ElementType,
                SpecMaterial          : part.SpecMaterial,
                InheritsJoineryFinish : part.InheritsJoineryFinish === true,
                SectionAreaSqMm       : part.SectionAreaSqMm,
                Faces                 : faces
            });
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__InteriorJoineryAssembly__ReferencePitchDegrees  : VghLantern__InteriorJoineryAssembly__ReferencePitchDegrees,
        VghLantern__InteriorJoineryAssembly__ReslopeEavesTrimTop    : VghLantern__InteriorJoineryAssembly__ReslopeEavesTrimTop,
        VghLantern__InteriorJoineryAssembly__SectionsForPitch       : VghLantern__InteriorJoineryAssembly__SectionsForPitch
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__InteriorJoineryAssembly  =  VghLantern__Geometry__InteriorJoineryAssembly;
