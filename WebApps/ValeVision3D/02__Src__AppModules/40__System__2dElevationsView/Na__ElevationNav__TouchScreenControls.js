// =============================================================================
// VALEVISION3D - ELEVATION NAVIGATION - TOUCHSCREEN CONTROLS
// =============================================================================
//
// FILE      : Na__ElevationNav__TouchScreenControls.js
// NAMESPACE : ValeVision3D
// MODULE    : Na__ElevationNav__TouchScreenControls
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Touchscreen 2D pan and zoom controls for the elevation ortho camera
// CREATED   : 11-Mar-2026
//
// DESCRIPTION:
// - Single finger drag = pan the ortho camera in its local XY plane.
// - Two-finger pinch = zoom (adjust ortho frustum half-height).
// - Two-finger drag = simultaneous pan while pinching.
// - Directly manipulates the ortho camera position along its local right/up vectors.
// - Activated when elevation view mode is entered, deactivated on return to 3D.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Zoom Limits
    // ------------------------------------------------------------
    const Na__TouchNav__ZOOM_MIN = 1;                                            // <-- Minimum frustum half-height (m)
    const Na__TouchNav__ZOOM_MAX = 60;                                           // <-- Maximum frustum half-height (m)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute Distance Between Two Touches
    // ---------------------------------------------------------------
    function getTouchDistance(t0, t1) {
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Compute Midpoint Between Two Touches
    // ---------------------------------------------------------------
    function getTouchMidpoint(t0, t1) {
        return {
            x: (t0.clientX + t1.clientX) * 0.5,
            y: (t0.clientY + t1.clientY) * 0.5
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Touch Controls Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Touchscreen 2D Navigation Controls
    // ------------------------------------------------------------
    function Na__ElevationNav__InitTouchControls(camera, horizontalNormal, domElement) {
        let active          = false;                                              // <-- Controls currently enabled
        let touchCount      = 0;                                                  // <-- Active touch count
        let orthoHalfHeight = camera.top;                                         // <-- Current frustum half-height

        // PAN STATE | Single Finger
        let panStartX       = 0;                                                  // <-- Touch X at pan start
        let panStartY       = 0;                                                  // <-- Touch Y at pan start
        let camOrigin       = camera.position.clone();                            // <-- Camera position at pan start

        // PINCH STATE | Two Fingers
        let pinchStartDist  = 0;                                                  // <-- Initial pinch distance
        let pinchStartHalfH = 0;                                                  // <-- Frustum half-height at pinch start
        let pinchStartMid   = { x: 0, y: 0 };                                    // <-- Midpoint at pinch start
        let pinchCamOrigin  = camera.position.clone();                            // <-- Camera position at pinch start

        const camRight = new THREE.Vector3();                                     // <-- Camera local right vector
        const camUp    = new THREE.Vector3(0, 1, 0);                              // <-- Camera local up (world Y)
        camRight.crossVectors(camUp, horizontalNormal).normalize();               // <-- Perpendicular to normal and up


        // SUB FUNCTION | Update Ortho Frustum from Current Half-Height
        // ---------------------------------------------------------------
        function updateFrustum() {
            const aspect = domElement.clientWidth / domElement.clientHeight;
            const halfW  = orthoHalfHeight * aspect;

            camera.left   = -halfW;
            camera.right  =  halfW;
            camera.top    =  orthoHalfHeight;
            camera.bottom = -orthoHalfHeight;
            camera.updateProjectionMatrix();
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Touch Start
        // ---------------------------------------------------------------
        function onTouchStart(event) {
            if (!active) return;
            event.preventDefault();

            touchCount = event.touches.length;

            if (touchCount === 1) {
                panStartX = event.touches[0].clientX;                             // <-- Record single-finger start
                panStartY = event.touches[0].clientY;
                camOrigin = camera.position.clone();
            } else if (touchCount === 2) {
                pinchStartDist  = getTouchDistance(event.touches[0], event.touches[1]); // <-- Record initial pinch distance
                pinchStartHalfH = orthoHalfHeight;                                // <-- Record frustum at pinch start
                pinchStartMid   = getTouchMidpoint(event.touches[0], event.touches[1]);
                pinchCamOrigin  = camera.position.clone();
            }
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Touch Move
        // ---------------------------------------------------------------
        function onTouchMove(event) {
            if (!active) return;
            event.preventDefault();

            touchCount = event.touches.length;

            if (touchCount === 1) {
                const deltaX        = event.touches[0].clientX - panStartX;       // <-- Screen pixel delta X
                const deltaY        = event.touches[0].clientY - panStartY;       // <-- Screen pixel delta Y
                const viewHeight    = domElement.clientHeight;
                const worldPerPixel = (orthoHalfHeight * 2) / viewHeight;         // <-- World units per screen pixel

                camera.position.copy(camOrigin);
                camera.position.addScaledVector(camRight, -deltaX * worldPerPixel); // <-- Invert X for natural pan
                camera.position.addScaledVector(camUp,     deltaY * worldPerPixel); // <-- Screen Y down = camera up

                Na__RenderLoop__RequestRender();

            } else if (touchCount === 2 && pinchStartDist > 0) {
                const currentDist = getTouchDistance(event.touches[0], event.touches[1]);
                const scale       = pinchStartDist / currentDist;                 // <-- >1 = pinch in (zoom out), <1 = spread (zoom in)

                orthoHalfHeight = Math.max(
                    Na__TouchNav__ZOOM_MIN,
                    Math.min(Na__TouchNav__ZOOM_MAX, pinchStartHalfH * scale)
                );
                updateFrustum();

                // SIMULTANEOUS PAN | Two-finger drag while pinching
                const currentMid    = getTouchMidpoint(event.touches[0], event.touches[1]);
                const midDeltaX     = currentMid.x - pinchStartMid.x;
                const midDeltaY     = currentMid.y - pinchStartMid.y;
                const viewHeight    = domElement.clientHeight;
                const worldPerPixel = (orthoHalfHeight * 2) / viewHeight;

                camera.position.copy(pinchCamOrigin);
                camera.position.addScaledVector(camRight, -midDeltaX * worldPerPixel);
                camera.position.addScaledVector(camUp,     midDeltaY * worldPerPixel);

                Na__RenderLoop__RequestRender();
            }
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Touch End
        // ---------------------------------------------------------------
        function onTouchEnd(event) {
            if (!active) return;

            touchCount = event.touches.length;

            if (touchCount === 1) {
                panStartX = event.touches[0].clientX;                             // <-- Transition from pinch to single-finger pan
                panStartY = event.touches[0].clientY;
                camOrigin = camera.position.clone();
            }
        }
        // ---------------------------------------------------------------


        // FUNCTION | Activate Touchscreen 2D Controls
        // ---------------------------------------------------------------
        function activate() {
            if (active) return;
            active = true;
            orthoHalfHeight = camera.top;                                         // <-- Sync from current frustum

            domElement.addEventListener('touchstart',  onTouchStart,  { passive: false });
            domElement.addEventListener('touchmove',   onTouchMove,   { passive: false });
            domElement.addEventListener('touchend',    onTouchEnd);
            domElement.addEventListener('touchcancel', onTouchEnd);
        }
        // ---------------------------------------------------------------


        // FUNCTION | Deactivate Touchscreen 2D Controls
        // ---------------------------------------------------------------
        function deactivate() {
            if (!active) return;
            active = false;
            touchCount = 0;

            domElement.removeEventListener('touchstart',  onTouchStart);
            domElement.removeEventListener('touchmove',   onTouchMove);
            domElement.removeEventListener('touchend',    onTouchEnd);
            domElement.removeEventListener('touchcancel', onTouchEnd);
        }
        // ---------------------------------------------------------------


        // FUNCTION | Dispose Touchscreen 2D Controls
        // ---------------------------------------------------------------
        function dispose() {
            deactivate();
        }
        // ---------------------------------------------------------------


        return { activate, deactivate, dispose };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Touchscreen Navigation Controls
    // ------------------------------------------------------------
    export {
        Na__ElevationNav__InitTouchControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
