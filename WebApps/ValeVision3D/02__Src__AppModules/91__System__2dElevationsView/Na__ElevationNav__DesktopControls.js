// =============================================================================
// VALEVISION3D - ELEVATION NAVIGATION - DESKTOP CONTROLS
// =============================================================================
//
// FILE      : Na__ElevationNav__DesktopControls.js
// NAMESPACE : ValeVision3D
// MODULE    : Na__ElevationNav__DesktopControls
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Desktop 2D pan and zoom controls for the elevation ortho camera
// CREATED   : 11-Mar-2026
//
// DESCRIPTION:
// - Middle mouse button hold + drag = pan the ortho camera in its local XY plane.
// - Right click + drag = pan (alternate input for same behaviour).
// - Scroll wheel = zoom (adjust ortho frustum half-height).
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
    const Na__DesktopNav__ZOOM_STEP = 0.9;                                       // <-- Scroll zoom factor per wheel tick
    const Na__DesktopNav__ZOOM_MIN  = 1;                                         // <-- Minimum frustum half-height (m)
    const Na__DesktopNav__ZOOM_MAX  = 60;                                        // <-- Maximum frustum half-height (m)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Desktop Controls Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Desktop 2D Navigation Controls
    // ------------------------------------------------------------
    function Na__ElevationNav__InitDesktopControls(camera, horizontalNormal, domElement, navConfig) {
        const ZOOM_STEP     = (navConfig && navConfig.zoomStep) || Na__DesktopNav__ZOOM_STEP; // <-- Config or fallback
        const ZOOM_MIN      = (navConfig && navConfig.zoomMin)  || Na__DesktopNav__ZOOM_MIN;  // <-- Config or fallback
        const ZOOM_MAX      = (navConfig && navConfig.zoomMax)  || Na__DesktopNav__ZOOM_MAX;  // <-- Config or fallback

        let active          = false;                                              // <-- Controls currently enabled
        let isPanning       = false;                                              // <-- Pan drag in progress
        let panStartX       = 0;                                                  // <-- Pointer X at pan start
        let panStartY       = 0;                                                  // <-- Pointer Y at pan start
        let orthoHalfHeight = camera.top;                                         // <-- Current frustum half-height
        let camOrigin       = camera.position.clone();                            // <-- Camera position at pan start

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


        // SUB FUNCTION | Handle Pointer Down (Start Pan)
        // ---------------------------------------------------------------
        function onPointerDown(event) {
            if (!active) return;
            if (event.button !== 1 && event.button !== 2) return;                 // <-- Middle (1) or right (2) only

            isPanning = true;
            panStartX = event.clientX;
            panStartY = event.clientY;
            camOrigin = camera.position.clone();
            domElement.style.cursor = 'grabbing';
            event.preventDefault();
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Pointer Move (Pan)
        // ---------------------------------------------------------------
        function onPointerMove(event) {
            if (!active || !isPanning) return;

            const deltaX        = event.clientX - panStartX;                      // <-- Screen pixel delta X
            const deltaY        = event.clientY - panStartY;                      // <-- Screen pixel delta Y
            const viewHeight    = domElement.clientHeight;
            const worldPerPixel = (orthoHalfHeight * 2) / viewHeight;             // <-- World units per screen pixel

            camera.position.copy(camOrigin);
            camera.position.addScaledVector(camRight, -deltaX * worldPerPixel);   // <-- Invert X for natural pan
            camera.position.addScaledVector(camUp,     deltaY * worldPerPixel);   // <-- Screen Y down = camera up

            Na__RenderLoop__RequestRender();
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Pointer Up (End Pan)
        // ---------------------------------------------------------------
        function onPointerUp(event) {
            if (!isPanning) return;
            if (event.button !== 1 && event.button !== 2) return;

            isPanning = false;
            domElement.style.cursor = '';
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Wheel (Zoom)
        // ---------------------------------------------------------------
        function onWheel(event) {
            if (!active) return;
            event.preventDefault();

            if (event.deltaY > 0) {
                orthoHalfHeight = Math.min(orthoHalfHeight / ZOOM_STEP, ZOOM_MAX);
            } else {
                orthoHalfHeight = Math.max(orthoHalfHeight * ZOOM_STEP, ZOOM_MIN);
            }

            updateFrustum();
            Na__RenderLoop__RequestRender();
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Suppress Context Menu During Active Controls
        // ---------------------------------------------------------------
        function onContextMenu(event) {
            if (active) event.preventDefault();                                   // <-- Suppress right-click menu
        }
        // ---------------------------------------------------------------


        // FUNCTION | Activate Desktop 2D Controls
        // ---------------------------------------------------------------
        function activate() {
            if (active) return;
            active = true;
            orthoHalfHeight = camera.top;                                         // <-- Sync from current frustum

            domElement.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            domElement.addEventListener('wheel', onWheel, { passive: false });
            domElement.addEventListener('contextmenu', onContextMenu);
        }
        // ---------------------------------------------------------------


        // FUNCTION | Deactivate Desktop 2D Controls
        // ---------------------------------------------------------------
        function deactivate() {
            if (!active) return;
            active = false;
            isPanning = false;
            domElement.style.cursor = '';

            domElement.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            domElement.removeEventListener('wheel', onWheel);
            domElement.removeEventListener('contextmenu', onContextMenu);
        }
        // ---------------------------------------------------------------


        // FUNCTION | Dispose Desktop 2D Controls
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

    // MODULE EXPORTS | Desktop Navigation Controls
    // ------------------------------------------------------------
    export {
        Na__ElevationNav__InitDesktopControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
