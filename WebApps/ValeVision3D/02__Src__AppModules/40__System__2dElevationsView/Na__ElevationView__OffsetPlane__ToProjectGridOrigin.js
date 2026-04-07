// =============================================================================
// VALEVISION3D - ELEVATION VIEW OFFSET PLANE TO PROJECT GRID ORIGIN
// =============================================================================
//
// FILE       : Na__ElevationView__OffsetPlane__ToProjectGridOrigin.js
// NAMESPACE  : Na__ElevOffsetPlane
// MODULE     : Elevation View - Grid Origin Anchor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load the project's saved grid origin offset and expose it as a
//              Three.js Vector3 so the elevation plane centres on the UCS origin
//              (the red X marker) rather than the raw raycast hit point.
// CREATED    : 13-Mar-2026
//
// DESCRIPTION:
// - Fetches the project JSON from the Flask API using the URL project code.
// - Reads GridLine__Grid__Offset__Config.GridLine__Grid__Config__Offset__OffsetXMm
//   and GridLine__Grid__Config__Offset__OffsetZMm (saved by the grid Save Position button).
// - Converts mm values to Three.js units (1 unit = 1000 mm).
// - Negates the Z offset to match the Three.js convention used by the grid system.
// - Caches the result as a THREE.Vector3 for synchronous reads during face selection.
// - Na__ElevationView__SystemLogic.js imports this module and uses the cached point
//   as the XZ anchor when positioning the elevation plane and ortho camera.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Mar-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Math Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Code URL Utility
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached Grid Origin Point
    // ------------------------------------------------------------
    let Na__ElevOffsetPlane__GridOriginPoint = null; // <-- Cached THREE.Vector3 of grid origin in scene units
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Core Logic - Fetch and Resolve Grid Origin
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Project Grid Offset Config from Flask API
    // ------------------------------------------------------------
    async function Na__ElevOffsetPlane__FetchProjectGridConfig() {
        try {
            const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
            if (!projectCode) return null;                                              // <-- No project code in URL

            const projectData  = await Na__AppUtils__FetchProjectJson(projectCode);     // <-- Uses GH Pages URL on production, Flask API on localhost
            const offsetConfig = projectData.GridLine__Grid__Offset__Config;
            if (!offsetConfig) return null;                                             // <-- Project has no saved grid offset

            return offsetConfig;
        } catch (err) {
            console.warn('[ValeVision3D] ElevOffsetPlane: could not fetch project grid config:', err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Load and Cache Grid Origin as Three.js Vector3
    // ------------------------------------------------------------
    async function Na__ElevOffsetPlane__LoadGridOrigin() {
        const offsetConfig = await Na__ElevOffsetPlane__FetchProjectGridConfig();
        if (!offsetConfig) {
            console.log('[ValeVision3D] ElevOffsetPlane: no grid origin found — elevation will use hit point');
            return;
        }

        const offsetXMm = offsetConfig.GridLine__Grid__Config__Offset__OffsetXMm;      // <-- X offset in mm
        const offsetZMm = offsetConfig.GridLine__Grid__Config__Offset__OffsetZMm;      // <-- Z offset in mm

        if (!Number.isFinite(offsetXMm) || !Number.isFinite(offsetZMm)) {
            console.warn('[ValeVision3D] ElevOffsetPlane: invalid offset values in project config');
            return;
        }

        const originX =  Na__Math__ConvertMmToUnits(offsetXMm);                        // <-- Convert mm to units (+X)
        const originZ = -Na__Math__ConvertMmToUnits(offsetZMm);                        // <-- Negate Z to match Three.js convention

        Na__ElevOffsetPlane__GridOriginPoint = new THREE.Vector3(originX, 0, originZ); // <-- Store as Vector3 (Y is zero; Y comes from hit point)
        console.log('[ValeVision3D] ElevOffsetPlane: grid origin loaded at', Na__ElevOffsetPlane__GridOriginPoint.toArray());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Cached Grid Origin Point
    // ------------------------------------------------------------
    function Na__ElevOffsetPlane__GetGridOriginPoint() {
        return Na__ElevOffsetPlane__GridOriginPoint; // <-- Returns THREE.Vector3 or null if not yet loaded
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Grid Origin Anchor API
    // ------------------------------------------------------------
    export {
        Na__ElevOffsetPlane__LoadGridOrigin,
        Na__ElevOffsetPlane__GetGridOriginPoint
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
