// =============================================================================
// VALEVISION3D - ELEVATION VIEW SYSTEM LOGIC
// =============================================================================
//
// FILE       : Na__ElevationView__SystemLogic.js
// NAMESPACE  : Na__ElevationView
// MODULE     : Elevation View - Core System Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Raycasting face selection, elevation plane creation, orthographic
//              camera setup, constrained plane dragging, and view mode switching
// CREATED    : 11-Mar-2026
//
// DESCRIPTION:
// - Lets the user click a building face to define an elevation direction.
// - Projects the hit face normal onto the XZ plane so the elevation is upright.
// - Spawns a semi-transparent vertical plane 1 unit (1 m) outward from the face.
// - Creates an OrthographicCamera aligned to the horizontal face normal.
// - Provides view switching between the perspective orbit camera and elevation.
// - Supports constrained plane dragging along the face normal axis (3D mode only).
// - Dispatches custom events so the UI controls module can react to state changes.
// - Loads configuration from Na__ElevationView__Config.json at init time.
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

    // MODULE IMPORTS | 2D Profile Lines and Navigation Controls
    // ------------------------------------------------------------
    import { Na__2dProfileLines__Create } from './Na__RenderEffect__2dProfileLines__.js';
    import { Na__ElevationNav__InitDesktopControls } from './Na__ElevationNav__DesktopControls.js';
    import { Na__ElevationNav__InitTouchControls } from './Na__ElevationNav__TouchScreenControls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const Na__Elev__CONFIG_PATH = './02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__Config.json';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Elevation Plane Fallback Defaults
    // ------------------------------------------------------------
    const Na__Elev__FB_PLANE_WIDTH          = 50;                                     // <-- Plane width in scene units (50 m)
    const Na__Elev__FB_PLANE_HEIGHT         = 30;                                     // <-- Plane height in scene units (30 m)
    const Na__Elev__FB_PLANE_OFFSET         = 1.0;                                    // <-- Default offset from face (1 m)
    const Na__Elev__FB_PLANE_FILL_COLOR     = '#ff6666';                              // <-- Plane fill colour (red tint)
    const Na__Elev__FB_PLANE_FILL_OPACITY   = 0.05;                                   // <-- Plane fill opacity (5%)
    const Na__Elev__FB_PLANE_EDGE_COLOR     = '#ff3333';                              // <-- Plane edge colour
    const Na__Elev__FB_PLANE_LABEL_TEXT     = 'Click and drag to set plane';          // <-- Plane label text
    const Na__Elev__FB_PLANE_LABEL_COLOR   = '#cc3333';                              // <-- Plane label colour
    const Na__Elev__FB_PLANE_LABEL_OPACITY = 0.35;                                   // <-- Plane label opacity
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Camera Fallback Defaults
    // ------------------------------------------------------------
    const Na__Elev__FB_ORTHO_HALF_HEIGHT    = 15;                                     // <-- Initial ortho frustum half-height (m)
    const Na__Elev__FB_CAMERA_DISTANCE      = 80;                                     // <-- Ortho camera distance from plane (m)
    const Na__Elev__FB_CLICK_THRESHOLD_PX   = 4;                                      // <-- Max pointer movement for a click
    const Na__Elev__FB_DRAG_SCALE           = 0.05;                                   // <-- Drag sensitivity factor
    // ------------------------------------------------------------


    // MODULE CONSTANTS | 2D Profile Lines Fallback Defaults
    // ------------------------------------------------------------
    const Na__Elev__FB_2D_EDGE_WIDTH        = 1.0;                                    // <-- Fixed 2D profile line width (px)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Navigation Fallback Defaults
    // ------------------------------------------------------------
    const Na__Elev__FB_ZOOM_STEP            = 0.9;                                    // <-- Scroll zoom factor per wheel tick
    const Na__Elev__FB_ZOOM_MIN             = 1;                                      // <-- Minimum frustum half-height (m)
    const Na__Elev__FB_ZOOM_MAX             = 60;                                     // <-- Maximum frustum half-height (m)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | State Enum
    // ------------------------------------------------------------
    const Na__Elev__STATE_IDLE              = 'IDLE';                                  // <-- No elevation active
    const Na__Elev__STATE_SELECTING         = 'SELECTING';                             // <-- Waiting for face click
    const Na__Elev__STATE_READY             = 'ELEVATION_READY';                       // <-- Plane + camera created, 3D view active
    const Na__Elev__STATE_VIEWING           = 'VIEWING_ELEVATION';                     // <-- Ortho camera active
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Core References (set on init)
    // ------------------------------------------------------------
    let Na__Elev__Scene              = null;                                            // <-- Three.js scene
    let Na__Elev__PerspCamera        = null;                                            // <-- Main perspective camera
    let Na__Elev__Renderer           = null;                                            // <-- WebGLRenderer
    let Na__Elev__OrbitControls      = null;                                            // <-- OrbitControls instance
    let Na__Elev__PipelineRef        = null;                                            // <-- { current: pipelineState }
    let Na__Elev__ModelRoot          = null;                                            // <-- Model root group for raycasting
    // ------------------------------------------------------------


    // MODULE VARIABLES | Config (loaded async at init)
    // ------------------------------------------------------------
    let Na__Elev__Config             = null;                                            // <-- Parsed JSON config (null until fetched)
    // ------------------------------------------------------------


    // MODULE VARIABLES | Elevation Objects
    // ------------------------------------------------------------
    let Na__Elev__CurrentState       = Na__Elev__STATE_IDLE;                            // <-- Current system state
    let Na__Elev__PlaneMesh          = null;                                            // <-- Elevation plane mesh
    let Na__Elev__PlaneEdges         = null;                                            // <-- Elevation plane edge lines
    let Na__Elev__PlaneGroup         = null;                                            // <-- Group holding plane + edges
    let Na__Elev__OrthoCamera        = null;                                            // <-- Orthographic camera for elevation
    let Na__Elev__HorizontalNormal   = null;                                            // <-- Face normal projected onto XZ
    let Na__Elev__HitPoint           = null;                                            // <-- Original raycast hit point
    let Na__Elev__OrthoHalfHeight    = Na__Elev__FB_ORTHO_HALF_HEIGHT;                  // <-- Current frustum half-height
    // ------------------------------------------------------------


    // MODULE VARIABLES | Raycaster and Pointer State
    // ------------------------------------------------------------
    const Na__Elev__Raycaster        = new THREE.Raycaster();                           // <-- Reusable raycaster
    const Na__Elev__PointerNDC       = new THREE.Vector2();                             // <-- Normalised device coordinates
    let Na__Elev__PointerDownX       = 0;                                               // <-- Pointer X at pointerdown
    let Na__Elev__PointerDownY       = 0;                                               // <-- Pointer Y at pointerdown
    let Na__Elev__PointerIsDown      = false;                                           // <-- Pointer currently pressed
    // ------------------------------------------------------------


    // MODULE VARIABLES | Drag State
    // ------------------------------------------------------------
    let Na__Elev__IsDragging         = false;                                           // <-- Plane drag active flag
    let Na__Elev__DragStartPointerY  = 0;                                               // <-- Screen Y at drag start
    let Na__Elev__DragStartOffset    = 0;                                               // <-- Plane offset at drag start
    let Na__Elev__PlaneOffset        = Na__Elev__FB_PLANE_OFFSET;                       // <-- Current offset along normal
    // ------------------------------------------------------------


    // MODULE VARIABLES | Bound Event Handler References
    // ------------------------------------------------------------
    let Na__Elev__BoundOnPointerDown   = null;                                          // <-- Stored bound handler for cleanup
    let Na__Elev__BoundOnPointerUp     = null;                                          // <-- Stored bound handler for cleanup
    let Na__Elev__BoundOnPointerMove   = null;                                          // <-- Stored bound handler for cleanup
    let Na__Elev__SelectionActive      = false;                                         // <-- Selection listeners currently attached
    let Na__Elev__DragListenersActive  = false;                                         // <-- Drag listeners currently attached
    // ------------------------------------------------------------


    // MODULE VARIABLES | 2D Profile Lines and Navigation Controls
    // ------------------------------------------------------------
    let Na__Elev__UseTouchControls    = false;                                          // <-- Device input mode flag
    let Na__Elev__NavControls         = null;                                           // <-- Desktop or touch nav controller
    let Na__Elev__2dProfileLines      = null;                                           // <-- 2D profile lines renderer (lazy-created)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loader and Resolvers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Elevation View Config JSON
    // ------------------------------------------------------------
    async function Na__Elev__FetchConfig() {
        try {
            const response = await fetch(Na__Elev__CONFIG_PATH);                        // <-- Fetch config JSON
            if (!response.ok) {
                console.warn(`[ValeVision3D] Elevation config fetch returned ${response.status}, using fallback defaults`);
                return null;
            }
            return await response.json();                                               // <-- Parse and return config object
        } catch (err) {
            console.warn('[ValeVision3D] Failed to load elevation config, using fallback defaults:', err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Config Value with Fallback
    // ------------------------------------------------------------
    function Na__Elev__CfgVal(section, key, fallback) {
        if (!Na__Elev__Config || !Na__Elev__Config[section]) return fallback;
        const val = Na__Elev__Config[section][key];
        return (val !== undefined && val !== null) ? val : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Plane Config Values
    // ------------------------------------------------------------
    function Na__Elev__PlaneWidth()       { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__WidthUnits',    Na__Elev__FB_PLANE_WIDTH); }
    function Na__Elev__PlaneHeight()      { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__HeightUnits',   Na__Elev__FB_PLANE_HEIGHT); }
    function Na__Elev__PlaneOffsetUnits() { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__OffsetUnits',   Na__Elev__FB_PLANE_OFFSET); }
    function Na__Elev__PlaneFillColor()   { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__FillColor',     Na__Elev__FB_PLANE_FILL_COLOR); }
    function Na__Elev__PlaneFillOpacity() { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__FillOpacity',   Na__Elev__FB_PLANE_FILL_OPACITY); }
    function Na__Elev__PlaneEdgeColor()   { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__EdgeColor',     Na__Elev__FB_PLANE_EDGE_COLOR); }
    function Na__Elev__PlaneLabelText()   { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__LabelText',     Na__Elev__FB_PLANE_LABEL_TEXT); }
    function Na__Elev__PlaneLabelColor()  { return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__LabelColor',    Na__Elev__FB_PLANE_LABEL_COLOR); }
    function Na__Elev__PlaneLabelOpacity(){ return Na__Elev__CfgVal('ElevationView__Plane__Config',  'ElevationView__Plane__Config__LabelOpacity',  Na__Elev__FB_PLANE_LABEL_OPACITY); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Camera Config Values
    // ------------------------------------------------------------
    function Na__Elev__CfgOrthoHalfHeight() { return Na__Elev__CfgVal('ElevationView__Camera__Config', 'ElevationView__Camera__Config__OrthoHalfHeight',  Na__Elev__FB_ORTHO_HALF_HEIGHT); }
    function Na__Elev__CfgCameraDistance()   { return Na__Elev__CfgVal('ElevationView__Camera__Config', 'ElevationView__Camera__Config__CameraDistance',    Na__Elev__FB_CAMERA_DISTANCE); }
    function Na__Elev__CfgClickThreshold()   { return Na__Elev__CfgVal('ElevationView__Camera__Config', 'ElevationView__Camera__Config__ClickThresholdPx', Na__Elev__FB_CLICK_THRESHOLD_PX); }
    function Na__Elev__CfgDragScale()        { return Na__Elev__CfgVal('ElevationView__Camera__Config', 'ElevationView__Camera__Config__DragScale',        Na__Elev__FB_DRAG_SCALE); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve 2D Profile Lines Config Values
    // ------------------------------------------------------------
    function Na__Elev__Cfg2dEdgeWidth() { return Na__Elev__CfgVal('ElevationView__2dProfileLines__Config', 'ElevationView__2dProfileLines__Config__EdgeWidth', Na__Elev__FB_2D_EDGE_WIDTH); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Navigation Config Object for Nav Controls
    // ------------------------------------------------------------
    function Na__Elev__BuildNavConfig() {
        return {
            zoomStep : Na__Elev__CfgVal('ElevationView__Navigation__Config', 'ElevationView__Navigation__Config__ZoomStep', Na__Elev__FB_ZOOM_STEP),
            zoomMin  : Na__Elev__CfgVal('ElevationView__Navigation__Config', 'ElevationView__Navigation__Config__ZoomMin',  Na__Elev__FB_ZOOM_MIN),
            zoomMax  : Na__Elev__CfgVal('ElevationView__Navigation__Config', 'ElevationView__Navigation__Config__ZoomMax',  Na__Elev__FB_ZOOM_MAX)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Custom Event Dispatchers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispatch Elevation State Changed Event
    // ------------------------------------------------------------
    function Na__Elev__DispatchStateChange(newState) {
        Na__Elev__CurrentState = newState;                                              // <-- Update internal state
        window.dispatchEvent(new CustomEvent('na-elevation-state-changed', {
            detail: { state: newState }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Selection Raycasting
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Handle Pointer Down During Selection
    // ------------------------------------------------------------
    function Na__Elev__SelectionPointerDown(event) {
        Na__Elev__PointerDownX = event.clientX;                                         // <-- Record X
        Na__Elev__PointerDownY = event.clientY;                                         // <-- Record Y
        Na__Elev__PointerIsDown = true;                                                 // <-- Mark pressed
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Pointer Up During Selection (Click Detection)
    // ------------------------------------------------------------
    function Na__Elev__SelectionPointerUp(event) {
        if (!Na__Elev__PointerIsDown) return;                                           // <-- Guard: no prior pointerdown
        Na__Elev__PointerIsDown = false;                                                // <-- Reset pointer state

        const threshold = Na__Elev__CfgClickThreshold();
        const deltaX = Math.abs(event.clientX - Na__Elev__PointerDownX);                // <-- Horizontal movement
        const deltaY = Math.abs(event.clientY - Na__Elev__PointerDownY);                // <-- Vertical movement
        if (deltaX > threshold || deltaY > threshold) {
            return;                                                                     // <-- Too much movement, orbit drag
        }

        const rect = Na__Elev__Renderer.domElement.getBoundingClientRect();             // <-- Canvas bounds
        Na__Elev__PointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        Na__Elev__PointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        Na__Elev__Raycaster.setFromCamera(Na__Elev__PointerNDC, Na__Elev__PerspCamera);

        const meshes = [];                                                              // <-- Collect intersectable meshes
        Na__Elev__ModelRoot.traverse((child) => {
            if (child.isMesh) meshes.push(child);
        });

        if (meshes.length === 0) return;                                                // <-- No meshes to test

        const intersections = Na__Elev__Raycaster.intersectObjects(meshes, false);
        if (intersections.length === 0) return;                                         // <-- No intersection

        const hit = intersections[0];                                                   // <-- First hit
        const faceNormal = hit.face.normal.clone();                                     // <-- Face normal in object space
        faceNormal.transformDirection(hit.object.matrixWorld);                           // <-- Transform to world space

        Na__Elev__ProcessFaceSelection(hit.point.clone(), faceNormal);
    }
    // ------------------------------------------------------------


    // FUNCTION | Process a Face Selection Hit
    // ------------------------------------------------------------
    function Na__Elev__ProcessFaceSelection(hitPoint, worldNormal) {
        const horizontalNormal = new THREE.Vector3(worldNormal.x, 0, worldNormal.z);
        if (horizontalNormal.lengthSq() < 0.001) {
            horizontalNormal.set(0, 0, 1);                                             // <-- Fallback for purely vertical faces
        }
        horizontalNormal.normalize();                                                   // <-- Unit vector in XZ plane

        console.log('[ValeVision3D] Elevation: face selected at', hitPoint.toArray(), 'normal:', horizontalNormal.toArray());

        Na__Elev__HitPoint = hitPoint;                                                  // <-- Store hit point
        Na__Elev__HorizontalNormal = horizontalNormal;                                  // <-- Store projected normal
        Na__Elev__PlaneOffset = Na__Elev__PlaneOffsetUnits();                            // <-- Reset offset from config

        Na__Elev__RemoveSelectionListeners();                                           // <-- Stop listening for selection
        document.body.classList.remove('na-elevation-selecting');                        // <-- Restore cursor

        Na__Elev__CreateElevationPlane();                                               // <-- Build plane
        Na__Elev__CreateOrthoCamera();                                                  // <-- Build ortho camera
        Na__Elev__CreateNavControls();                                                  // <-- Build 2D nav controls
        Na__Elev__AttachDragListeners();                                                // <-- Enable plane dragging

        Na__Elev__DispatchStateChange(Na__Elev__STATE_READY);                           // <-- Notify UI
        Na__RenderLoop__RequestRender();                                                // <-- Trigger render
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2D Navigation and Profile Lines Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create 2D Navigation Controls for Current Elevation
    // ---------------------------------------------------------------
    function Na__Elev__CreateNavControls() {
        if (Na__Elev__NavControls) Na__Elev__NavControls.dispose();                    // <-- Dispose previous if any

        const navConfig = Na__Elev__BuildNavConfig();                                   // <-- Config-driven zoom limits

        if (Na__Elev__UseTouchControls) {
            Na__Elev__NavControls = Na__ElevationNav__InitTouchControls(
                Na__Elev__OrthoCamera, Na__Elev__HorizontalNormal, Na__Elev__Renderer.domElement, navConfig
            );
        } else {
            Na__Elev__NavControls = Na__ElevationNav__InitDesktopControls(
                Na__Elev__OrthoCamera, Na__Elev__HorizontalNormal, Na__Elev__Renderer.domElement, navConfig
            );
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Wrapped 2D Profile Normals Render (Hides Elevation Plane)
    // ---------------------------------------------------------------
    function Na__Elev__Render2dProfileNormals(camera) {
        if (!Na__Elev__2dProfileLines) return;

        const wasVisible = Na__Elev__PlaneGroup ? Na__Elev__PlaneGroup.visible : false;
        if (Na__Elev__PlaneGroup) Na__Elev__PlaneGroup.visible = false;                // <-- Hide plane to prevent profile line artifacts

        Na__Elev__2dProfileLines.renderProfileNormals(camera);

        if (Na__Elev__PlaneGroup) Na__Elev__PlaneGroup.visible = wasVisible;           // <-- Restore plane visibility
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Elevation Plane Creation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Canvas Texture for Elevation Plane
    // ---------------------------------------------------------------
    function Na__Elev__CreatePlaneCanvasTexture(planeW, planeH) {
        const canvasW   = 1024;                                                         // <-- Canvas pixel width
        const canvasH   = Math.round(canvasW * (planeH / planeW));                      // <-- Maintain plane aspect ratio
        const canvas    = document.createElement('canvas');
        canvas.width    = canvasW;
        canvas.height   = canvasH;
        const ctx       = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvasW, canvasH);                                         // <-- Start with transparent background

        const fillColor   = Na__Elev__PlaneFillColor();
        const fillOpacity = Na__Elev__PlaneFillOpacity();
        ctx.fillStyle     = fillColor;
        ctx.globalAlpha   = fillOpacity;
        ctx.fillRect(0, 0, canvasW, canvasH);                                          // <-- Semi-transparent red fill

        const labelText    = Na__Elev__PlaneLabelText();
        const labelColor   = Na__Elev__PlaneLabelColor();
        const labelOpacity = Na__Elev__PlaneLabelOpacity();
        const fontSize     = Math.round(canvasH * 0.07);                                // <-- Font size proportional to canvas
        ctx.globalAlpha    = labelOpacity;
        ctx.fillStyle      = labelColor;
        ctx.font           = `${fontSize}px Arial, sans-serif`;
        ctx.textAlign      = 'center';
        ctx.textBaseline   = 'middle';
        ctx.fillText(labelText, canvasW * 0.5, canvasH * 0.5);                         // <-- Centered label

        ctx.globalAlpha = 1.0;                                                          // <-- Reset alpha

        const texture       = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Create Elevation Plane at Current Offset
    // ------------------------------------------------------------
    function Na__Elev__CreateElevationPlane() {
        Na__Elev__DisposeElevationPlane();                                              // <-- Remove previous if any

        const planeW = Na__Elev__PlaneWidth();
        const planeH = Na__Elev__PlaneHeight();

        const planeGeometry = new THREE.PlaneGeometry(planeW, planeH);

        const canvasTexture = Na__Elev__CreatePlaneCanvasTexture(planeW, planeH);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map         : canvasTexture,
            transparent : true,
            side        : THREE.DoubleSide,
            depthWrite  : false
        });

        Na__Elev__PlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        Na__Elev__PlaneMesh.name = 'Na__ElevationView__Plane';

        const edgesGeometry = new THREE.EdgesGeometry(planeGeometry);
        Na__Elev__PlaneEdges = new THREE.LineSegments(
            edgesGeometry,
            new THREE.LineBasicMaterial({ color: Na__Elev__PlaneEdgeColor(), linewidth: 2 })
        );

        Na__Elev__PlaneGroup = new THREE.Group();
        Na__Elev__PlaneGroup.name = 'Na__ElevationView__PlaneGroup';
        Na__Elev__PlaneGroup.add(Na__Elev__PlaneMesh);
        Na__Elev__PlaneGroup.add(Na__Elev__PlaneEdges);

        Na__Elev__UpdatePlaneTransform();                                               // <-- Position and orient
        Na__Elev__Scene.add(Na__Elev__PlaneGroup);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Plane Position and Orientation
    // ------------------------------------------------------------
    function Na__Elev__UpdatePlaneTransform() {
        if (!Na__Elev__PlaneGroup || !Na__Elev__HitPoint || !Na__Elev__HorizontalNormal) return;

        const position = Na__Elev__HitPoint.clone().addScaledVector(
            Na__Elev__HorizontalNormal,
            Na__Elev__PlaneOffset                                                       // <-- Offset along outward normal
        );

        Na__Elev__PlaneGroup.position.copy(position);

        const lookTarget = position.clone().add(Na__Elev__HorizontalNormal);            // <-- Look along normal
        Na__Elev__PlaneGroup.up.set(0, 1, 0);                                          // <-- Keep upright
        Na__Elev__PlaneGroup.lookAt(lookTarget);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispose Elevation Plane Objects
    // ------------------------------------------------------------
    function Na__Elev__DisposeElevationPlane() {
        if (Na__Elev__PlaneGroup) {
            Na__Elev__Scene.remove(Na__Elev__PlaneGroup);                               // <-- Remove from scene

            if (Na__Elev__PlaneMesh) {
                Na__Elev__PlaneMesh.geometry.dispose();
                if (Na__Elev__PlaneMesh.material.map) Na__Elev__PlaneMesh.material.map.dispose(); // <-- Dispose canvas texture
                Na__Elev__PlaneMesh.material.dispose();
            }
            if (Na__Elev__PlaneEdges) {
                Na__Elev__PlaneEdges.geometry.dispose();
                Na__Elev__PlaneEdges.material.dispose();
            }

            Na__Elev__PlaneGroup = null;
            Na__Elev__PlaneMesh  = null;
            Na__Elev__PlaneEdges = null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orthographic Camera Creation
// -----------------------------------------------------------------------------

    // FUNCTION | Create Orthographic Camera Aligned to Elevation Normal
    // ------------------------------------------------------------
    function Na__Elev__CreateOrthoCamera() {
        const aspect      = window.innerWidth / window.innerHeight;                     // <-- Viewport aspect ratio
        const camDistance  = Na__Elev__CfgCameraDistance();
        Na__Elev__OrthoHalfHeight = Na__Elev__CfgOrthoHalfHeight();                     // <-- Reset frustum height from config

        const halfW = Na__Elev__OrthoHalfHeight * aspect;                               // <-- Frustum half-width
        const halfH = Na__Elev__OrthoHalfHeight;                                        // <-- Frustum half-height

        Na__Elev__OrthoCamera = new THREE.OrthographicCamera(
            -halfW, halfW,                                                              // <-- Left, Right
             halfH, -halfH,                                                             // <-- Top, Bottom
            0.1,                                                                        // <-- Near
            camDistance * 2                                                              // <-- Far
        );
        Na__Elev__OrthoCamera.name = 'Na__ElevationView__OrthoCamera';
        Na__Elev__Scene.add(Na__Elev__OrthoCamera);                                     // <-- Add to scene for matrix updates

        Na__Elev__UpdateOrthoCameraTransform();                                         // <-- Position and orient
        console.log('[ValeVision3D] Elevation: ortho camera created at', Na__Elev__OrthoCamera.position.toArray());
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Ortho Camera Position and LookAt
    // ------------------------------------------------------------
    function Na__Elev__UpdateOrthoCameraTransform() {
        if (!Na__Elev__OrthoCamera || !Na__Elev__HitPoint || !Na__Elev__HorizontalNormal) return;

        const camDistance = Na__Elev__CfgCameraDistance();
        const planeCenter = Na__Elev__HitPoint.clone().addScaledVector(
            Na__Elev__HorizontalNormal,
            Na__Elev__PlaneOffset
        );

        const cameraPos = planeCenter.clone().addScaledVector(
            Na__Elev__HorizontalNormal,
            camDistance                                                                  // <-- Place camera far along normal
        );

        Na__Elev__OrthoCamera.position.copy(cameraPos);
        Na__Elev__OrthoCamera.up.set(0, 1, 0);                                         // <-- Keep upright
        Na__Elev__OrthoCamera.lookAt(planeCenter);
        Na__Elev__OrthoCamera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Ortho Camera Frustum Size
    // ------------------------------------------------------------
    function Na__Elev__UpdateOrthoFrustum() {
        if (!Na__Elev__OrthoCamera) return;

        const aspect = window.innerWidth / window.innerHeight;
        const halfW  = Na__Elev__OrthoHalfHeight * aspect;
        const halfH  = Na__Elev__OrthoHalfHeight;

        Na__Elev__OrthoCamera.left   = -halfW;
        Na__Elev__OrthoCamera.right  =  halfW;
        Na__Elev__OrthoCamera.top    =  halfH;
        Na__Elev__OrthoCamera.bottom = -halfH;
        Na__Elev__OrthoCamera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera Swap Mechanism
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the RenderPass from the EffectComposer
    // ------------------------------------------------------------
    function Na__Elev__GetRenderPass() {
        const pipeline = Na__Elev__PipelineRef ? Na__Elev__PipelineRef.current : null;
        if (!pipeline || !pipeline.composer) {
            console.warn('[ValeVision3D] Elevation: pipeline not available');
            return null;
        }

        const passes = pipeline.composer.passes;
        if (!passes || passes.length === 0) {
            console.warn('[ValeVision3D] Elevation: composer has no passes');
            return null;
        }

        for (let i = 0; i < passes.length; i++) {
            if (passes[i].isRenderPass) return passes[i];
        }

        if (passes[0] && passes[0].camera) return passes[0];                           // <-- Fallback: first pass with a camera

        console.warn('[ValeVision3D] Elevation: no RenderPass found in composer');
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Camera Used by the Render Pipeline
    // ------------------------------------------------------------
    function Na__ElevationView__GetActiveCamera() {
        if (Na__Elev__CurrentState === Na__Elev__STATE_VIEWING && Na__Elev__OrthoCamera) {
            return Na__Elev__OrthoCamera;                                               // <-- Ortho camera when in elevation view
        }
        return Na__Elev__PerspCamera;                                                   // <-- Perspective camera otherwise
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch to Orthographic Elevation Camera
    // ------------------------------------------------------------
    function Na__Elev__ActivateOrthoCamera() {
        const renderPass = Na__Elev__GetRenderPass();
        if (!renderPass || !Na__Elev__OrthoCamera) {
            console.error('[ValeVision3D] Elevation: cannot activate ortho camera - renderPass:', !!renderPass, 'orthoCamera:', !!Na__Elev__OrthoCamera);
            return false;
        }

        Na__Elev__OrthoCamera.updateMatrixWorld(true);                                  // <-- Force matrix update before swap
        renderPass.camera = Na__Elev__OrthoCamera;                                      // <-- Swap camera on render pass
        Na__Elev__OrbitControls.enabled = false;                                        // <-- Disable orbit controls

        if (!Na__Elev__2dProfileLines) {
            Na__Elev__2dProfileLines = Na__2dProfileLines__Create(Na__Elev__Renderer, Na__Elev__Scene, Na__Elev__PipelineRef); // <-- Lazy-create 2D profile lines
        }

        // SET FIXED 2D EDGE WIDTH | One-time set from config (not per-frame)
        const pipeline = Na__Elev__PipelineRef ? Na__Elev__PipelineRef.current : null;
        if (pipeline && pipeline.profileLinesPassRef) {
            pipeline.profileLinesPassRef.material.uniforms.u_edgeWidth.value = Na__Elev__Cfg2dEdgeWidth(); // <-- Fixed width from config
        }

        if (Na__Elev__NavControls) Na__Elev__NavControls.activate();                    // <-- Activate 2D navigation controls

        window.dispatchEvent(new CustomEvent('na-elevation-camera-changed', {
            detail: {
                camera:                  Na__Elev__OrthoCamera,
                isOrtho:                 true,
                horizontalNormal:        Na__Elev__HorizontalNormal,
                render2dProfileNormals:  Na__Elev__Render2dProfileNormals
            }
        }));

        console.log('[ValeVision3D] Elevation: ortho camera activated');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore Perspective Camera and Orbit Controls
    // ------------------------------------------------------------
    function Na__Elev__RestorePerspCamera() {
        const renderPass = Na__Elev__GetRenderPass();
        if (!renderPass || !Na__Elev__PerspCamera) return false;

        renderPass.camera = Na__Elev__PerspCamera;                                      // <-- Restore perspective camera
        Na__Elev__OrbitControls.enabled = true;                                         // <-- Re-enable orbit controls
        Na__Elev__OrbitControls.update();

        if (Na__Elev__NavControls) Na__Elev__NavControls.deactivate();                  // <-- Deactivate 2D navigation controls

        window.dispatchEvent(new CustomEvent('na-elevation-camera-changed', {
            detail: { camera: Na__Elev__PerspCamera, isOrtho: false }
        }));

        console.log('[ValeVision3D] Elevation: perspective camera restored');
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Drag Interaction (3D Mode Only)
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Drag Pointer Down
    // ------------------------------------------------------------
    function Na__Elev__DragPointerDown(event) {
        if (event.button !== 0) return;                                                 // <-- Left click only
        if (Na__Elev__CurrentState !== Na__Elev__STATE_READY) return;                   // <-- 3D mode only (plane hidden in 2D)

        const rect = Na__Elev__Renderer.domElement.getBoundingClientRect();
        const ndc  = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        Na__Elev__Raycaster.setFromCamera(ndc, Na__Elev__PerspCamera);                 // <-- Always persp camera in 3D mode

        if (!Na__Elev__PlaneMesh) return;
        const hits = Na__Elev__Raycaster.intersectObject(Na__Elev__PlaneMesh, false);
        if (hits.length === 0) return;                                                  // <-- Did not click on plane

        Na__Elev__IsDragging = true;                                                    // <-- Begin drag
        Na__Elev__DragStartPointerY = event.clientY;                                    // <-- Record start Y
        Na__Elev__DragStartOffset = Na__Elev__PlaneOffset;                              // <-- Record start offset
        Na__Elev__OrbitControls.enabled = false;                                        // <-- Suppress orbit during drag
        Na__Elev__Renderer.domElement.style.cursor = 'grabbing';
        event.preventDefault();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drag Pointer Move
    // ------------------------------------------------------------
    function Na__Elev__DragPointerMove(event) {
        if (!Na__Elev__IsDragging) return;

        const dragScale    = Na__Elev__CfgDragScale();
        const deltaY       = event.clientY - Na__Elev__DragStartPointerY;              // <-- Screen pixel delta
        const offsetChange = deltaY * dragScale;                                        // <-- Map pixels to units
        Na__Elev__PlaneOffset = Na__Elev__DragStartOffset + offsetChange;               // <-- Apply new offset

        Na__Elev__UpdatePlaneTransform();                                               // <-- Reposition plane
        Na__Elev__UpdateOrthoCameraTransform();                                         // <-- Reposition camera
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drag Pointer Up
    // ------------------------------------------------------------
    function Na__Elev__DragPointerUp() {
        if (!Na__Elev__IsDragging) return;
        Na__Elev__IsDragging = false;                                                   // <-- End drag
        Na__Elev__OrbitControls.enabled = true;                                         // <-- Restore orbit controls
        Na__Elev__Renderer.domElement.style.cursor = '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Attach Drag Event Listeners
    // ------------------------------------------------------------
    function Na__Elev__AttachDragListeners() {
        if (Na__Elev__DragListenersActive) return;

        Na__Elev__BoundOnPointerDown = Na__Elev__DragPointerDown;
        Na__Elev__BoundOnPointerMove = Na__Elev__DragPointerMove;
        Na__Elev__BoundOnPointerUp   = Na__Elev__DragPointerUp;

        Na__Elev__Renderer.domElement.addEventListener('pointerdown', Na__Elev__BoundOnPointerDown);
        window.addEventListener('pointermove', Na__Elev__BoundOnPointerMove);
        window.addEventListener('pointerup', Na__Elev__BoundOnPointerUp);
        Na__Elev__DragListenersActive = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Drag Event Listeners
    // ------------------------------------------------------------
    function Na__Elev__RemoveDragListeners() {
        if (!Na__Elev__DragListenersActive) return;

        Na__Elev__Renderer.domElement.removeEventListener('pointerdown', Na__Elev__BoundOnPointerDown);
        window.removeEventListener('pointermove', Na__Elev__BoundOnPointerMove);
        window.removeEventListener('pointerup', Na__Elev__BoundOnPointerUp);
        Na__Elev__DragListenersActive = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Mode Listener Management
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Attach Selection Listeners
    // ------------------------------------------------------------
    function Na__Elev__AttachSelectionListeners() {
        if (Na__Elev__SelectionActive) return;

        const canvas = Na__Elev__Renderer.domElement;
        canvas.addEventListener('pointerdown', Na__Elev__SelectionPointerDown);
        canvas.addEventListener('pointerup', Na__Elev__SelectionPointerUp);
        Na__Elev__SelectionActive = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Selection Listeners
    // ------------------------------------------------------------
    function Na__Elev__RemoveSelectionListeners() {
        if (!Na__Elev__SelectionActive) return;

        const canvas = Na__Elev__Renderer.domElement;
        canvas.removeEventListener('pointerdown', Na__Elev__SelectionPointerDown);
        canvas.removeEventListener('pointerup', Na__Elev__SelectionPointerUp);
        Na__Elev__SelectionActive = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Window Resize Handler
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Handle Window Resize for Ortho Camera
    // ------------------------------------------------------------
    function Na__Elev__OnWindowResize() {
        if (Na__Elev__OrthoCamera) {
            Na__Elev__UpdateOrthoFrustum();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Elevation View System
    // ------------------------------------------------------------
    function Na__ElevationView__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot, useTouchControls) {
        Na__Elev__Scene            = scene;
        Na__Elev__PerspCamera      = camera;
        Na__Elev__Renderer         = renderer;
        Na__Elev__OrbitControls    = controls;
        Na__Elev__PipelineRef      = pipelineRef;
        Na__Elev__ModelRoot        = modelRoot;
        Na__Elev__UseTouchControls = useTouchControls || false;                         // <-- Store device input mode

        Na__Elev__FetchConfig().then((config) => {
            Na__Elev__Config = config;                                                  // <-- Store parsed config (null on failure)
            if (config) console.log('[ValeVision3D] Elevation config loaded');
        });

        window.addEventListener('resize', Na__Elev__OnWindowResize);
        console.log('[ValeVision3D] Elevation View system initialized');
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Face Selection Mode
    // ------------------------------------------------------------
    function Na__ElevationView__StartSelection() {
        if (Na__Elev__CurrentState === Na__Elev__STATE_VIEWING) {
            Na__Elev__RestorePerspCamera();                                             // <-- Return to 3D first
        }

        Na__Elev__CleanupCurrentElevation();                                            // <-- Dispose old plane/camera
        document.body.classList.add('na-elevation-selecting');                           // <-- Crosshair cursor
        Na__Elev__AttachSelectionListeners();
        Na__Elev__DispatchStateChange(Na__Elev__STATE_SELECTING);
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch to Elevation (Ortho) View
    // ------------------------------------------------------------
    function Na__ElevationView__ViewElevation() {
        if (Na__Elev__CurrentState !== Na__Elev__STATE_READY) return;

        Na__Elev__UpdateOrthoCameraTransform();                                         // <-- Ensure camera is positioned

        const success = Na__Elev__ActivateOrthoCamera();
        if (!success) {
            console.error('[ValeVision3D] Elevation: failed to activate ortho camera');
            return;
        }

        if (Na__Elev__PlaneGroup) Na__Elev__PlaneGroup.visible = false;                 // <-- Hide plane in 2D mode

        Na__Elev__DispatchStateChange(Na__Elev__STATE_VIEWING);
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Return to 3D Perspective View
    // ------------------------------------------------------------
    function Na__ElevationView__BackTo3D() {
        if (Na__Elev__CurrentState !== Na__Elev__STATE_VIEWING) return;

        const success = Na__Elev__RestorePerspCamera();
        if (!success) {
            console.warn('[ValeVision3D] Elevation: failed to restore perspective camera');
        }

        if (Na__Elev__PlaneGroup) Na__Elev__PlaneGroup.visible = true;                  // <-- Show plane in 3D mode

        Na__Elev__DispatchStateChange(Na__Elev__STATE_READY);
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Elevation Plane Visibility
    // ------------------------------------------------------------
    function Na__ElevationView__TogglePlane() {
        if (!Na__Elev__PlaneGroup) return false;

        Na__Elev__PlaneGroup.visible = !Na__Elev__PlaneGroup.visible;                   // <-- Flip visibility
        Na__RenderLoop__RequestRender();
        return Na__Elev__PlaneGroup.visible;                                            // <-- Return new state
    }
    // ------------------------------------------------------------


    // FUNCTION | Reselect Elevation Face (Dispose and Re-enter Selection)
    // ------------------------------------------------------------
    function Na__ElevationView__Reselect() {
        Na__ElevationView__StartSelection();                                            // <-- Cleans up and re-enters selection
    }
    // ------------------------------------------------------------


    // FUNCTION | Check if Elevation is Active (Plane + Camera Exist)
    // ------------------------------------------------------------
    function Na__ElevationView__IsActive() {
        return Na__Elev__CurrentState === Na__Elev__STATE_READY ||
               Na__Elev__CurrentState === Na__Elev__STATE_VIEWING;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current State
    // ------------------------------------------------------------
    function Na__ElevationView__GetState() {
        return Na__Elev__CurrentState;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cleanup Current Elevation Objects
    // ------------------------------------------------------------
    function Na__Elev__CleanupCurrentElevation() {
        if (Na__Elev__CurrentState === Na__Elev__STATE_VIEWING) {
            Na__Elev__RestorePerspCamera();                                             // <-- Ensure perspective is restored
        }

        Na__Elev__RemoveDragListeners();

        if (Na__Elev__NavControls) {
            Na__Elev__NavControls.dispose();                                            // <-- Dispose 2D navigation controls
            Na__Elev__NavControls = null;
        }

        Na__Elev__DisposeElevationPlane();

        if (Na__Elev__OrthoCamera && Na__Elev__Scene) {
            Na__Elev__Scene.remove(Na__Elev__OrthoCamera);                              // <-- Remove ortho camera from scene
        }

        Na__Elev__OrthoCamera      = null;
        Na__Elev__HorizontalNormal = null;
        Na__Elev__HitPoint         = null;
        Na__Elev__PlaneOffset      = Na__Elev__PlaneOffsetUnits();
        Na__Elev__2dProfileLines   = null;                                              // <-- Clear 2D profile lines reference
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation View System API
    // ------------------------------------------------------------
    export {
        Na__ElevationView__Initialize,
        Na__ElevationView__StartSelection,
        Na__ElevationView__ViewElevation,
        Na__ElevationView__BackTo3D,
        Na__ElevationView__TogglePlane,
        Na__ElevationView__Reselect,
        Na__ElevationView__IsActive,
        Na__ElevationView__GetState,
        Na__ElevationView__GetActiveCamera
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
