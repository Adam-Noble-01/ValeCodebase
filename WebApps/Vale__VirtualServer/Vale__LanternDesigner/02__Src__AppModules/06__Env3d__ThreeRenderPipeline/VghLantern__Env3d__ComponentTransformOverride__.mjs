/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | COMPONENT TRANSFORM OVERRIDE
   =============================================================================

   FILE       : VghLantern__Env3d__ComponentTransformOverride__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ComponentTransformOverride
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Apply per-asset millimetre position offsets from component JSON
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Brute-force alignment aid. Each component JSON may carry an optional
     Na__Asset__3jsOveride__Transform block with X / Y / Z offsets in millimetres.
   - Values are Three.js world-axis offsets (Y = up). +200 on Y lifts the
     component 200 mm; -200 lowers it. Missing block, missing keys, or zero
     values are ignored so a blank object costs nothing at runtime.
   - Edit the JSON, clear the asset cache / rebuild the scene, and nudge until
     the seating looks right. Not a substitute for fixing the SketchUp origin.

   ---------------------------------------------------------------------------

   JSON SHAPE:
       "Na__Asset__3jsOveride__Transform" : {
           "Na__Asset__3jsOveride__Transform__X_mm" : 0,
           "Na__Asset__3jsOveride__Transform__Y_mm" : 200,
           "Na__Asset__3jsOveride__Transform__Z_mm" : 0
       }

   ============================================================================= */

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Component Transform Override Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Asset Field Names
    // ------------------------------------------------------------
    const ASSET_FIELD_TRANSFORM  =  'Na__Asset__3jsOveride__Transform';
    const FIELD_OFFSET_X_MM      =  'Na__Asset__3jsOveride__Transform__X_mm';
    const FIELD_OFFSET_Y_MM      =  'Na__Asset__3jsOveride__Transform__Y_mm';
    const FIELD_OFFSET_Z_MM      =  'Na__Asset__3jsOveride__Transform__Z_mm';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Offset Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Millimetre Offset Key
    // ------------------------------------------------------------
    // Zero and non-finite values return 0 so the caller can skip them with a
    // single truthy check on the resolved triple.
    function VghLantern__Env3d__ComponentTransformOverride__ReadMm(block, fieldName) {
        if (!block) return 0;

        const raw  =  Number(block[fieldName]);
        if (!Number.isFinite(raw) || raw === 0) return 0;

        return raw;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve World-Space Offset From Asset JSON
    // ------------------------------------------------------------
    // Returns null when there is nothing to apply, so the placement path can
    // stay a single early-exit rather than adding 0,0,0 every time.
    export function VghLantern__Env3d__ComponentTransformOverride__ResolveOffset(assetData) {
        if (!assetData) return null;

        const block  =  assetData[ASSET_FIELD_TRANSFORM];
        if (!block || typeof block !== 'object') return null;

        const offsetXMm  =  VghLantern__Env3d__ComponentTransformOverride__ReadMm(block, FIELD_OFFSET_X_MM);
        const offsetYMm  =  VghLantern__Env3d__ComponentTransformOverride__ReadMm(block, FIELD_OFFSET_Y_MM);
        const offsetZMm  =  VghLantern__Env3d__ComponentTransformOverride__ReadMm(block, FIELD_OFFSET_Z_MM);

        if (offsetXMm === 0 && offsetYMm === 0 && offsetZMm === 0) return null;

        return {
            x : VghLantern__Env3d__ConfigAccess__MmToWorld(offsetXMm),          // <-- Three.js +X
            y : VghLantern__Env3d__ConfigAccess__MmToWorld(offsetYMm),          // <-- Three.js +Y up
            z : VghLantern__Env3d__ConfigAccess__MmToWorld(offsetZMm)           // <-- Three.js +Z
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Override Offset Onto a Placed Object3D
    // ------------------------------------------------------------
    // Called after the local origin has been seated on the anchor. The override
    // is additive, so X/Y/Z edit as deltas against the solved placement.
    export function VghLantern__Env3d__ComponentTransformOverride__Apply(object3d, assetData) {
        if (!object3d) return false;

        const offset  =  VghLantern__Env3d__ComponentTransformOverride__ResolveOffset(assetData);
        if (!offset) return false;

        object3d.position.x  +=  offset.x;
        object3d.position.y  +=  offset.y;
        object3d.position.z  +=  offset.z;

        object3d.userData.VghLantern__TransformOverrideMm  =  {
            X_mm : assetData[ASSET_FIELD_TRANSFORM][FIELD_OFFSET_X_MM] || 0,
            Y_mm : assetData[ASSET_FIELD_TRANSFORM][FIELD_OFFSET_Y_MM] || 0,
            Z_mm : assetData[ASSET_FIELD_TRANSFORM][FIELD_OFFSET_Z_MM] || 0
        };

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
