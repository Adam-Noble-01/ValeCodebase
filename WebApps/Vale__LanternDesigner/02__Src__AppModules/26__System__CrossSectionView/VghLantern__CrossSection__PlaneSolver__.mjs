/* =============================================================================
   VGHLANTERN - CROSS SECTION VIEW | PLANE SOLVER
   =============================================================================

   FILE       : VghLantern__CrossSection__PlaneSolver__.mjs
   NAMESPACE  : VghLantern
   MODULE     : CrossSection - PlaneSolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Derive the lateral and longitudinal cut planes from the model
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The whole of "where does the cut go". Two named cuts, both upright, both dead
     centre on the lantern, derived from the solved bounds rather than from any
     stored number, so a plane can never disagree with the model it is cutting.
   - ValeVision places its planes by clicking a face, because it sections whole
     buildings where no two cuts are alike. A lantern is a single symmetrical
     object, so the two cuts a reviewer actually wants are fixed and this module
     computes them outright.

   ---------------------------------------------------------------------------

   WHICH CUT IS WHICH

       Lateral       The plane runs ALONG the long way of the lantern, so it
                     travels with the ridge and opens the whole length of the
                     roof. Its normal is therefore the SHORT horizontal axis.

       Longitudinal  The plane runs across the SHORT way, cutting the lantern
                     through like a slice of bread and showing one bay in
                     section. Its normal is the LONG horizontal axis.

   Which world axis is long is read from the bounds every time, so a lantern
   entered wider than it is deep sections exactly as sensibly as one entered the
   other way round. No assumption is made about which way the length was typed.

   ---------------------------------------------------------------------------

   WHICH HALF IS KEPT

   A section plane's normal points at the half that SURVIVES. Both normals here
   point toward negative world X and negative world Z, which removes the half
   nearest the camera in every one of the four preset views - isometric sits at
   +X +Y +Z, front elevation at +Z and side elevation at +X. A reviewer therefore
   always ends up looking INTO the lantern rather than at the back of an
   uncut half, without the plane needing to chase the camera around.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Cross Section Plane Solver Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cut Orientation Keys
    // ------------------------------------------------------------
    // Named for the cut's own direction of travel, matching how the two views are
    // spoken about in the workshop rather than how their normals point.
    export const VghLantern__CrossSection__PlaneSolver__Lateral       =  'lateral';
    export const VghLantern__CrossSection__PlaneSolver__Longitudinal  =  'longitudinal';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Kept Side Normals
    // ------------------------------------------------------------
    // Frozen because they are read every solve and must never be mutated by a
    // caller that assumes it was handed a copy.
    const NORMAL_ACROSS_X  =  Object.freeze({ x : -1, y : 0, z :  0 });      // <-- Cuts perpendicular to world X, keeps the -X half
    const NORMAL_ACROSS_Z  =  Object.freeze({ x :  0, y : 0, z : -1 });      // <-- Cuts perpendicular to world Z, keeps the -Z half
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bounds Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Model Centre and Horizontal Spans in World Units
    // ------------------------------------------------------------
    // Preferred source is the solved skeleton bounds the surface already holds,
    // because those are the lantern's designed extents. A tall finial or a deep
    // base moves a raw geometry box in the vertical only, so nothing is gained by
    // measuring the meshes when the design already states the answer.
    //
    // Returns null when there is no model, which is what tells the caller there is
    // nothing to cut rather than to cut through empty space at the origin.
    function VghLantern__CrossSection__PlaneSolver__Extents(surface) {
        const bounds  =  surface ? surface.LastBounds : null;
        if (!bounds) return null;

        const centreMm  =  {
            x : (bounds.MinX + bounds.MaxX) / 2,
            y : (bounds.MinY + bounds.MaxY) / 2,
            z : (bounds.MinZ + bounds.MaxZ) / 2
        };

        const spanXmm  =  Math.abs(bounds.MaxX - bounds.MinX);               // <-- Model X, which is world X
        const spanYmm  =  Math.abs(bounds.MaxY - bounds.MinY);               // <-- Model Y depth, which is world Z

        if (spanXmm <= 0 && spanYmm <= 0) return null;                       // <-- Degenerate model, no meaningful cut

        return {
            CentreWorld : VghLantern__Env3d__ConfigAccess__PointToWorld(centreMm),
            SpanXmm     : spanXmm,
            SpanYmm     : spanYmm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Solve the Cut Plane for a Named Orientation
    // ------------------------------------------------------------
    // Returns { Plane, LongAxis } or null when the surface holds no model.
    // Plane is a THREE.Plane in world space whose normal points at the kept half.
    export function VghLantern__CrossSection__PlaneSolver__Solve(surface, orientationKey) {
        const extents  =  VghLantern__CrossSection__PlaneSolver__Extents(surface);
        if (!extents) return null;

        const longAxisIsWorldX  =  extents.SpanXmm >= extents.SpanYmm;

        // A lateral cut travels along the long way, so its normal is the SHORT
        // horizontal axis. A longitudinal cut travels across the short way, so its
        // normal is the LONG horizontal axis. Everything else follows from that.
        const cutsAcrossWorldX  =  (orientationKey === VghLantern__CrossSection__PlaneSolver__Longitudinal)
            ? longAxisIsWorldX
            : !longAxisIsWorldX;

        const source  =  cutsAcrossWorldX ? NORMAL_ACROSS_X : NORMAL_ACROSS_Z;
        const normal  =  new THREE.Vector3(source.x, source.y, source.z);

        const centre  =  new THREE.Vector3(
            extents.CentreWorld.x, extents.CentreWorld.y, extents.CentreWorld.z
        );

        const plane  =  new THREE.Plane().setFromNormalAndCoplanarPoint(normal, centre);

        return {
            Plane    : plane,
            LongAxis : longAxisIsWorldX ? 'x' : 'z'                          // <-- Reported for diagnostics, not used to draw
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
