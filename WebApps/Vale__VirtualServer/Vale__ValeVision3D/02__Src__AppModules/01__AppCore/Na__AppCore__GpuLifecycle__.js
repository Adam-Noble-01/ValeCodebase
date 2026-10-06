// =============================================================================
// VALEVISION3D - APP CORE - GPU LIFECYCLE MANAGER
// =============================================================================
//
// FILE       : Na__AppCore__GpuLifecycle__.js
// NAMESPACE  : Na__AppCore
// MODULE     : GpuLifecycle
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : WebGL context-loss recovery and GPU memory cleanup on navigation
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Na__GpuLifecycle__AttachContextLossHandlers: wires webglcontextlost and
//   webglcontextrestored to the canvas. Context loss shows a Reload overlay;
//   restored stops the render loop and prompts reload because rebuilding the
//   full pipeline reliably from a restored context is not safe.
// - Na__GpuLifecycle__DisposeAll: traverses the THREE.js scene graph disposing
//   all geometries, materials, and textures, then disposes the composer render
//   targets and finally the WebGLRenderer. Called from the pagehide listener
//   so GPU memory is released before the same iOS WebContent process boots the
//   next page (gallery ↔ viewer cycles).
// - Disposal is performed through the shared Na__RenderEngine__State pipeline
//   surface only; no engine-specific modules are imported.
// - The active RAF frame is stopped before disposal so three.js does not try
//   to render into a disposed renderer.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial release. Part of PWA stability fix (C2).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Disposal Guard
    // ------------------------------------------------------------
    let Na__GpuLifecycle__Disposed         = false;   // <-- Prevents double-dispose if pagehide fires twice
    let Na__GpuLifecycle__RenderLoopActive = false;   // <-- Set by caller; used to request RAF stop before disposal
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Context Loss Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Attach WebGL Context Loss and Restore Handlers
    // ------------------------------------------------------------
    // Call immediately after WebGLRenderer creation in index.html.
    //
    // Params:
    //   renderer         {THREE.WebGLRenderer}
    //   canvas           {HTMLCanvasElement}
    //   stopRenderLoop   {Function}  Zero-arg function that cancels the active RAF.
    // ------------------------------------------------------------
    function Na__GpuLifecycle__AttachContextLossHandlers(renderer, canvas, stopRenderLoop) {
        if (!canvas) return;                                                  // <-- Guard: canvas must exist

        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();                                           // <-- Required: prevents browser discarding context without recovery attempt

            console.error('[GpuLifecycle] WebGL context lost. Stopping render loop.');

            if (typeof stopRenderLoop === 'function') stopRenderLoop();       // <-- Halt rendering immediately

            // SHOW CONTEXT LOSS OVERLAY
            const overlay   = document.getElementById('loadingOverlay');
            const indicator = document.getElementById('loadingIndicator');

            if (indicator) { indicator.style.display = 'none'; }

            if (overlay) {
                overlay.style.display     = 'flex';
                overlay.style.opacity     = '1';
                overlay.classList.add('loading-overlay--error');

                const errorIcon      = document.createElement('div');
                errorIcon.className  = 'loading-error-icon';
                errorIcon.textContent = '⚠';

                const errorMsg       = document.createElement('p');
                errorMsg.className   = 'loading-error-message';
                errorMsg.textContent = 'The 3D viewer lost its graphics connection. Please reload the page.';

                const reloadBtn       = document.createElement('button');
                reloadBtn.className   = 'loading-error-retry-btn';
                reloadBtn.textContent = 'Reload';
                reloadBtn.addEventListener('click', () => window.location.reload());

                overlay.appendChild(errorIcon);
                overlay.appendChild(errorMsg);
                overlay.appendChild(reloadBtn);
            }
        });

        canvas.addEventListener('webglcontextrestored', () => {
            // A restored context requires a full pipeline rebuild. The safest
            // recovery path on iOS is a page reload rather than attempting
            // in-place reconstruction which is fragile across engine variants.
            console.warn('[GpuLifecycle] WebGL context restored. Prompting reload for safe recovery.');
            window.location.reload();
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene and Renderer Disposal
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispose a Single Material (handles material arrays)
    // ---------------------------------------------------------------
    function Na__GpuLifecycle__DisposeMaterial(material) {
        if (!material) return;

        const materials = Array.isArray(material) ? material : [material];   // <-- Normalise to array

        for (const mat of materials) {
            if (!mat || typeof mat.dispose !== 'function') continue;

            // Dispose all map/texture slots
            const textureKeys = [
                'map', 'lightMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap',
                'alphaMap', 'aoMap', 'emissiveMap', 'envMap', 'gradientMap', 'specularMap',
                'displacementMap', 'transmissionMap', 'thicknessMap'
            ];
            for (const key of textureKeys) {
                if (mat[key] && typeof mat[key].dispose === 'function') {
                    mat[key].dispose();                                        // <-- Free GPU texture memory
                }
            }

            mat.dispose();                                                     // <-- Free material GPU resources
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Traverse Scene and Dispose Geometry + Materials
    // ---------------------------------------------------------------
    function Na__GpuLifecycle__DisposeSceneObjects(scene) {
        if (!scene) return;

        scene.traverse((object) => {
            if (object.geometry && typeof object.geometry.dispose === 'function') {
                object.geometry.dispose();                                    // <-- Free geometry buffer data
            }
            if (object.material) {
                Na__GpuLifecycle__DisposeMaterial(object.material);           // <-- Free material + textures
            }
        });
    }
    // ---------------------------------------------------------------


    // FUNCTION | Dispose All GPU Resources (Renderer, Scene, Composer)
    // ------------------------------------------------------------
    // Call from the pagehide listener. After this function completes the
    // renderer, scene geometry, and all post-processing render targets are
    // freed from GPU memory, leaving the iOS WebContent process in a cleaner
    // state for the next page load.
    //
    // Params:
    //   opts {object}:
    //     renderer      {THREE.WebGLRenderer}    - The active renderer.
    //     scene         {THREE.Scene}            - The active scene.
    //     pipelineState {object|null}            - Na__RenderPipeline__State (shared surface).
    //     stopRenderLoop{Function}               - Zero-arg function that cancels the active RAF.
    // ------------------------------------------------------------
    function Na__GpuLifecycle__DisposeAll({ renderer, scene, pipelineState, stopRenderLoop }) {
        if (Na__GpuLifecycle__Disposed) return;                               // <-- Prevent double-dispose
        Na__GpuLifecycle__Disposed = true;

        console.log('[GpuLifecycle] pagehide: beginning GPU resource disposal.');

        // STOP RENDER LOOP (must halt RAF before disposing renderer)
        if (typeof stopRenderLoop === 'function') stopRenderLoop();

        // DISPOSE SCENE OBJECTS (geometries + materials + textures)
        Na__GpuLifecycle__DisposeSceneObjects(scene);

        // DISPOSE COMPOSER AND RENDER TARGETS (via shared pipeline state surface)
        if (pipelineState) {
            if (pipelineState.composer && typeof pipelineState.composer.dispose === 'function') {
                pipelineState.composer.dispose();                             // <-- EffectComposer disposal
            }
            const rtKeys = [
                'profileNormalTarget', 'profileColorTarget',
                'depthTarget', 'aoTarget', 'aoBlurTarget'
            ];
            for (const key of rtKeys) {
                if (pipelineState[key] && typeof pipelineState[key].dispose === 'function') {
                    pipelineState[key].dispose();                             // <-- WebGLRenderTarget disposal
                }
            }
        }

        // DISPOSE RENDERER LAST
        if (renderer && typeof renderer.dispose === 'function') {
            renderer.dispose();                                               // <-- Release WebGL context and associated GPU memory
            renderer.forceContextLoss();                                      // <-- Explicitly release context handle (iOS best practice)
        }

        console.log('[GpuLifecycle] GPU resource disposal complete.');
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | GPU Lifecycle API
    // ------------------------------------------------------------
    export {
        Na__GpuLifecycle__AttachContextLossHandlers,
        Na__GpuLifecycle__DisposeAll
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
