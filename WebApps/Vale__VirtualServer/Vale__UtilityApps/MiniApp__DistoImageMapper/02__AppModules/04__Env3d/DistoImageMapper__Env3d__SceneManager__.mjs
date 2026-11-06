/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | SCENE MANAGER
   =============================================================================

   FILE       : DistoImageMapper__Env3d__SceneManager__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - SceneManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The renderer, the scene and the on-demand draw loop
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Draws only when asked. Once the camera and photos settle the loop stops, so a
     laptop on site keeps its battery.
   - Each frame runs the registered tasks in order (camera, then photos, then
     overlays), then draws. A task that returns true asks for another frame.

   ============================================================================= */

import * as THREE from 'three';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Frame Timing
    // ------------------------------------------------------------
    const FIRST_FRAME_MS  =  16;                                             // <-- A frame after a pause counts as one frame, not the pause
    const LONGEST_FRAME_MS =  80;                                            // <-- A stall never jumps an animation
    const MAX_PIXEL_RATIO =  2;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Renderer and Loop
    // ------------------------------------------------------------
    let Renderer       =  null;
    let Scene          =  null;
    let ActiveCamera   =  null;
    let HostElement    =  null;
    let FramePending   =  false;
    let LoopRunning    =  false;
    let LastFrameMs    =  0;
    let ViewportWidth  =  1;
    let ViewportHeight =  1;

    const FrameTasks       =  [];
    const ResizeCallbacks  =  [];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mounting and Resizing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Follow the Host Element's Size
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SceneManager__HandleResize() {
        const width   =  Math.max(HostElement.clientWidth, 1);
        const height  =  Math.max(HostElement.clientHeight, 1);
        if (width === ViewportWidth && height === ViewportHeight) return;

        ViewportWidth   =  width;
        ViewportHeight  =  height;
        Renderer.setSize(width, height);
        ResizeCallbacks.forEach(callback => callback(width, height));
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Create the Renderer Inside a Host Element
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__Mount(hostElement, backdropColour) {
        HostElement  =  hostElement;

        Renderer  =  new THREE.WebGLRenderer({ antialias : true, alpha : false, powerPreference : 'high-performance' });
        Renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        Renderer.setClearColor(new THREE.Color(backdropColour), 1);
        Renderer.localClippingEnabled  =  true;                              // <-- The clipping box cuts the sheets and axes, material by material
        HostElement.appendChild(Renderer.domElement);

        Scene  =  new THREE.Scene();

        new ResizeObserver(DistoImageMapper__Env3d__SceneManager__HandleResize).observe(HostElement);
        DistoImageMapper__Env3d__SceneManager__HandleResize();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Draw Loop
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Run One Frame
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SceneManager__Frame(nowMs) {
        FramePending  =  false;

        const elapsedMs  =  LoopRunning ? Math.min(nowMs - LastFrameMs, LONGEST_FRAME_MS) : FIRST_FRAME_MS;
        LastFrameMs      =  nowMs;

        let wantsAnother  =  false;
        for (const task of FrameTasks) {
            if (task(elapsedMs)) wantsAnother  =  true;
        }

        if (ActiveCamera) Renderer.render(Scene, ActiveCamera);

        LoopRunning  =  wantsAnother;
        if (wantsAnother) DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask for a Frame
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__Invalidate() {
        if (FramePending || !Renderer) return;
        FramePending  =  true;
        window.requestAnimationFrame(DistoImageMapper__Env3d__SceneManager__Frame);
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Task That Runs Before Every Draw
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__AddFrameTask(task) {
        FrameTasks.push(task);
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Callback for Viewport Size Changes
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__OnResize(callback) {
        ResizeCallbacks.push(callback);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Access
// -----------------------------------------------------------------------------

    // FUNCTION | The Scene
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__Scene() {
        return Scene;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Renderer
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__Renderer() {
        return Renderer;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Canvas
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__Canvas() {
        return Renderer.domElement;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Viewport Size in CSS Pixels
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__ViewportSize() {
        return { Width : ViewportWidth, Height : ViewportHeight };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Camera the Loop Draws With
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__SetCamera(camera) {
        ActiveCamera  =  camera;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw Now and Save the Picture as a PNG
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SceneManager__SaveImage(fileName) {
        Renderer.render(Scene, ActiveCamera);                                // <-- The buffer only holds its picture until this task ends
        Renderer.domElement.toBlob(blob => {
            if (!blob) return;
            const link  =  document.createElement('a');
            link.href      =  URL.createObjectURL(blob);
            link.download  =  fileName;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        }, 'image/png');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
