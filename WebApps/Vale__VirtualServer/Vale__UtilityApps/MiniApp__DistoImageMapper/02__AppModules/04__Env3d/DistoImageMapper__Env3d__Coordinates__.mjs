/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | COORDINATES
   =============================================================================

   FILE       : DistoImageMapper__Env3d__Coordinates__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - Coordinates
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The one translation between the survey's model space and three.js
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - MODEL: the DISTO's frame. Millimetres, Z up, right handed. The first point is
     the origin and the second lies on the X axis, on its negative side.
   - WORLD: three.js. Metres, Y up, right handed.
   - model (X, Y, Z) mm  ->  world (X / 1000, Z / 1000, -Y / 1000)
     This is a quarter turn about X, so handedness survives and nothing mirrors.
   - Colours follow SketchUp: red model X, green model Y, blue model Z.

   ============================================================================= */

import * as THREE from 'three';

// -----------------------------------------------------------------------------
// REGION | Model to World
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Scale
    // ------------------------------------------------------------
    const MM_PER_METRE  =  1000;
    // ------------------------------------------------------------


    // FUNCTION | A Model Position in Millimetres as a World Vector
    // ------------------------------------------------------------
    export function DistoImageMapper__Coords__ModelToWorld(positionMm, target = new THREE.Vector3()) {
        return target.set(positionMm.X / MM_PER_METRE, positionMm.Z / MM_PER_METRE, -positionMm.Y / MM_PER_METRE);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Model Axis as a World Direction
    // ------------------------------------------------------------
    export function DistoImageMapper__Coords__AxisToWorld(axisName) {
        if (axisName === 'X') return new THREE.Vector3(1, 0, 0);
        if (axisName === 'Y') return new THREE.Vector3(0, 0, -1);
        return new THREE.Vector3(0, 1, 0);                                   // <-- Model Z is world up
    }
    // ------------------------------------------------------------


    // FUNCTION | A Length in Millimetres as World Units
    // ------------------------------------------------------------
    export function DistoImageMapper__Coords__MmToWorld(lengthMm) {
        return lengthMm / MM_PER_METRE;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet to Model
// -----------------------------------------------------------------------------

    // FUNCTION | A 2D CAD Coordinate as a Model Position on Its Sheet
    // ------------------------------------------------------------
    // The fit comes from SurveyBuilder. The axis the sheet does not use takes
    // normalValueMm: the sheet's plane.
    export function DistoImageMapper__Coords__SheetToModel(fit, u, v, normalValueMm) {
        const positionMm  =  { X : 0, Y : 0, Z : 0 };
        positionMm[fit.UAxis]       =  (u - fit.UOffsetMm) * fit.USign;      // <-- Sign is +1 or -1, so it is its own inverse
        positionMm[fit.VAxis]       =  (v - fit.VOffsetMm) * fit.VSign;
        positionMm[fit.NormalAxis]  =  normalValueMm;
        return positionMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Sheet's Plane Sits, in Model Millimetres
    // ------------------------------------------------------------
    // On the far side of the model from whoever reads the sheet, so the model never
    // hides its drawing. SurveyBuilder's header explains ViewerSign.
    export function DistoImageMapper__Coords__SheetPlaneMm(fit, contentBoundsMm, offsetMm) {
        return fit.ViewerSign > 0
            ? contentBoundsMm.Min[fit.NormalAxis] - offsetMm
            : contentBoundsMm.Max[fit.NormalAxis] + offsetMm;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
