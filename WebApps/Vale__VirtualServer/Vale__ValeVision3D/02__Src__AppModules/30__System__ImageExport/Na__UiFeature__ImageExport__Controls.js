// -----------------------------------------------------------------------------
// REGION | UI Feature - Image Export Controls
// -----------------------------------------------------------------------------
//
// EXPORT PIPELINE NOTE (08-Jul-2026):
// - Custom-resolution exports no longer resize the live renderer + composer to
//   the full export resolution (which exhausted GPU memory at 4K and silently
//   delivered blank PNGs). They now delegate to the dedicated static tiled
//   export renderer (Na__ImageExport__StaticExport__TiledRenderer.js) which
//   keeps GPU framebuffer memory at viewport scale regardless of output size.
// - All export flows are async with try/catch/finally: failures surface as a
//   red status message, the button always unlocks, and a null toBlob result
//   is treated as a failure instead of showing "Download Ready!".
// - The Layout View tab is pre-opened synchronously inside the click gesture
//   (popup-blocker safe now that renders take many seconds) and receives the
//   image as a Blob instead of a ~40-90MB base64 data URL string.
//
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Post Process Pipeline
    // ------------------------------------------------------------
    import { Na__PostProcess__RunPipeline } from './Na__ImageExport__PostProcessEffects__Pipeline.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Static Tiled Export Renderer
    // ------------------------------------------------------------
    import { Na__StaticExport__RenderToCanvas } from './Na__ImageExport__StaticExport__TiledRenderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextPaint } from './Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Viewport Overlays
    // ------------------------------------------------------------
    import { Na__UiFeature__CreateViewportOverlays, Na__UiFeature__UpdateViewportOverlays } from './Na__UiFeature__ImageExport__ViewportOverlays.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Loading Overlay Controller
    // @delegate: ../03__AppUtils/Na__AppUtils__LoadingOverlay__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__LoadingOverlay__Create } from '../03__AppUtils/Na__AppUtils__LoadingOverlay__.js';

    // MODULE IMPORTS | Projected Linework Compositor (port Phase 4)
    // @delegate: ../50__System__ProjectedLinework/Na__ProjectedLinework__ExportCompositor__.js
    // ------------------------------------------------------------
    import { Na__PlExport__Apply } from '../50__System__ProjectedLinework/Na__ProjectedLinework__ExportCompositor__.js';
    // ------------------------------------------------------------
    // ------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Export Configuration and Defaults
    // -------------------------------------------------------------------------

    // MODULE CONSTANTS | Export Config Keys
    // ------------------------------------------------------------
    const Na__UiFeature__ExportConfigKeys = {
        aspectRatios           : 'ImageExport__Config__AspectRatios',           // <-- Aspect ratio options array key
        defaultAspectIndex     : 'ImageExport__Config__DefaultAspectIndex',     // <-- Default aspect ratio index key
        resolutions            : 'ImageExport__Config__Resolutions',             // <-- Pixel height resolution options key
        defaultResolutionIndex : 'ImageExport__Config__DefaultResolutionIndex', // <-- Default resolution index key
        customEnabled          : 'ImageExport__Config__CustomEnabled',          // <-- Custom size toggle default key
        antiAliasSamples       : 'ImageExport__Config__AntiAliasSamples'        // <-- Sub-pixel samples averaged per tile
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Supersampling Fallback
    // ------------------------------------------------------------
    // Used when the config block predates the key. A still is one frame, so
    // sixteen samples costs seconds on a job the user already waits for, and
    // whitecard line work is exactly the case that needs all sixteen.
    // ------------------------------------------------------------
    const Na__UiFeature__DefaultAntiAliasSamples = 16;
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Export Helper Utilities
    // -------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Aspect Ratio
    // ------------------------------------------------------------
    function Na__UiFeature__ParseAspectRatio(ratioString) {
        const parts = ratioString.split(':').map(Number);
        if (parts.length !== 2 || parts.some(Number.isNaN)) {
            return { width: 3, height: 2 };
        }
        return { width: parts[0], height: parts[1] };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp Index
    // ------------------------------------------------------------
    function Na__UiFeature__ClampIndex(value, minValue, maxValue) {
        return Math.min(Math.max(value, minValue), maxValue);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate Export Config
    // ------------------------------------------------------------
    function Na__UiFeature__ValidateExportConfig(config) {
        if (!config || typeof config !== 'object') return false;
        if (!Array.isArray(config[Na__UiFeature__ExportConfigKeys.aspectRatios])) return false;
        if (!Array.isArray(config[Na__UiFeature__ExportConfigKeys.resolutions])) return false;
        if (typeof config[Na__UiFeature__ExportConfigKeys.defaultAspectIndex] !== 'number') return false;
        if (typeof config[Na__UiFeature__ExportConfigKeys.defaultResolutionIndex] !== 'number') return false;
        if (typeof config[Na__UiFeature__ExportConfigKeys.customEnabled] !== 'boolean') return false;
        if (config[Na__UiFeature__ExportConfigKeys.aspectRatios].length === 0) return false;
        if (config[Na__UiFeature__ExportConfigKeys.resolutions].length === 0) return false;
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Export Config to Internal Short Keys
    // ------------------------------------------------------------
    function Na__UiFeature__NormalizeExportConfig(config) {
        return {
            aspectRatios           : config[Na__UiFeature__ExportConfigKeys.aspectRatios],           // <-- Map long JSON key to short internal name
            defaultAspectIndex     : config[Na__UiFeature__ExportConfigKeys.defaultAspectIndex],     // <-- Map long JSON key to short internal name
            resolutions            : config[Na__UiFeature__ExportConfigKeys.resolutions],             // <-- Map long JSON key to short internal name
            defaultResolutionIndex : config[Na__UiFeature__ExportConfigKeys.defaultResolutionIndex], // <-- Map long JSON key to short internal name
            customEnabled          : config[Na__UiFeature__ExportConfigKeys.customEnabled],          // <-- Map long JSON key to short internal name
            // Defaulted here rather than at the call site, so a config block
            // written before supersampling existed still exports supersampled.
            antiAliasSamples       : Number.isFinite(config[Na__UiFeature__ExportConfigKeys.antiAliasSamples])
                                   ? config[Na__UiFeature__ExportConfigKeys.antiAliasSamples]
                                   : Na__UiFeature__DefaultAntiAliasSamples
        };
    }
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Export Settings, Published for Batch Callers
    // ------------------------------------------------------------
    // Everything the Download Image button needs, captured at init and read
    // back through getters so a caller always gets the CURRENT slider
    // positions rather than whatever they were when the panel was built.
    //
    // WHY THIS EXISTS: the Presentation Scenes Dev menu can export every scene
    // in the project one after another, and "at the current export settings"
    // has to mean the same thing there as it does at the button - same
    // resolution, same aspect, same enhance state, same supersampling, same
    // projected-linework overlay. A second copy of that resolution logic is a
    // second thing to forget to update. Null until the panel initialises,
    // which is also the honest answer to "what would an export do right now"
    // on a build where the export config failed to validate.
    // ------------------------------------------------------------
    let Na__UiFeature__ImageExport__LiveSettings = null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download Image from Blob via Object URL
    // ------------------------------------------------------------
    function Na__UiFeature__DownloadBlob(blob, filename) {
        const url  = URL.createObjectURL(blob);   // <-- Create temporary object URL from blob
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);                 // <-- Free memory immediately after triggering download
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Canvas to PNG Blob (Promise, Fails Loudly)
    // ------------------------------------------------------------
    // toBlob returns null when the browser cannot encode (canvas too
    // large for the platform, out of memory). The old code silently
    // skipped the download but still reported success - now it throws.
    // ------------------------------------------------------------
    function Na__UiFeature__CanvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);                                                    // <-- Encoded successfully
                    } else {
                        reject(new Error('The image could not be encoded on this device. Try a lower export resolution.'));
                    }
                }, 'image/png');
            } catch (encodeError) {
                reject(encodeError);                                                      // <-- Synchronous encode failure
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Render Pipeline State from Getter
    // ------------------------------------------------------------
    function Na__UiFeature__ResolveRenderPipelineState(getRenderPipelineState) {
        const noop = () => {};
        if (typeof getRenderPipelineState !== 'function') {
            return { composer: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop };
        }

        const pipelineState = getRenderPipelineState();
        if (!pipelineState) {
            return { composer: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop };
        }

        // BACKWARD COMPAT | Legacy getter may return composer directly
        // ------------------------------------------------------------
        if (typeof pipelineState.render === 'function' && !pipelineState.composer) {
            return { composer: pipelineState, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop };
        }

        return {
            composer            : pipelineState.composer || null,
            renderProfileNormals: (typeof pipelineState.renderProfileNormals === 'function') ? pipelineState.renderProfileNormals : noop,
            setProfileLinesSize : (typeof pipelineState.setProfileLinesSize === 'function') ? pipelineState.setProfileLinesSize : noop,
            setFxaaSize         : (typeof pipelineState.setFxaaSize === 'function') ? pipelineState.setFxaaSize : noop
        };
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Shared Render-to-Canvas Helper
    // -------------------------------------------------------------------------

    // FUNCTION | Render Scene to Canvas with Current Export Settings
    // ------------------------------------------------------------
    // Shared by both "Download Image" and "Layout View" handlers.
    //
    // Viewport mode  : captures the live framebuffer at its current size
    //                  (cheap - no engine state is touched).
    // Custom mode    : delegates to the dedicated static tiled export
    //                  renderer so GPU memory stays flat at any resolution.
    //
    // Post-processing (enhance) runs in place on the captured canvas.
    //
    // Returns: Promise<{ canvas, width, height, aspectRatio, wasClamped }>
    // ------------------------------------------------------------
    async function Na__UiFeature__RenderToCanvas(renderer, scene, camera, getRenderPipelineState, postProcessConfig, isEnhanceEnabled, isCustomEnabled, exportConfig, ratioIndex, resIndex, getElevationOverrides, onProgress) {

        const progress = (typeof onProgress === 'function') ? onProgress : () => {};

        // ELEVATION OVERRIDE | Check if we are in 2D elevation mode
        // ------------------------------------------------------------
        const elevOverrides = (typeof getElevationOverrides === 'function')
            ? getElevationOverrides()                                       // <-- Returns overrides object or null
            : null;
        const isElevationMode = elevOverrides !== null;                      // <-- True when exporting the 2D ortho view

        // NON-CUSTOM MODE | Capture at current viewport size (engine untouched)
        // ------------------------------------------------------------
        if (!isCustomEnabled) {
            const pipelineState = Na__UiFeature__ResolveRenderPipelineState(getRenderPipelineState); // <-- Resolve render pipeline state
            const composer      = pipelineState.composer;                                            // <-- Composer reference

            if (composer) {
                if (isElevationMode) {
                    elevOverrides.renderProfileNormals(elevOverrides.camera); // <-- 2D profile normals with ortho camera
                } else {
                    pipelineState.renderProfileNormals();                     // <-- 3D profile normals with persp camera
                }
                composer.render();                    // <-- Render via post-processing composer
            } else {
                const renderCamera = isElevationMode ? elevOverrides.camera : camera; // <-- Pick active camera
                renderer.render(scene, renderCamera);                                  // <-- Direct render fallback
            }

            // Copy WebGL buffer to 2D canvas for reliable pixel readback
            // ------------------------------------------------------------
            const captureCanvas  = document.createElement('canvas'); // <-- Create offscreen 2D canvas
            captureCanvas.width  = renderer.domElement.width;         // <-- Match renderer width
            captureCanvas.height = renderer.domElement.height;        // <-- Match renderer height
            const captureCtx     = captureCanvas.getContext('2d');    // <-- Get 2D context
            captureCtx.drawImage(renderer.domElement, 0, 0);          // <-- Copy WebGL pixels immediately

            // Apply post-processing in place if enhance is enabled
            // ------------------------------------------------------------
            if (isEnhanceEnabled && postProcessConfig) {
                await Na__PostProcess__RunPipeline(captureCanvas, postProcessConfig, progress); // <-- Strip-based, mutates captureCanvas
            }

            await Na__PlExport__Apply(captureCanvas, elevOverrides ? elevOverrides.camera : null); // <-- Projected linework over a drawing (port Phase 4)

            return {
                canvas      : captureCanvas,               // <-- Final 2D canvas with rendered image
                width       : captureCanvas.width,         // <-- Rendered width in pixels
                height      : captureCanvas.height,        // <-- Rendered height in pixels
                aspectRatio : null,                        // <-- No custom aspect ratio (viewport native)
                wasClamped  : false                        // <-- Viewport capture is never clamped
            };
        }

        // CUSTOM MODE | Static tiled export at configured aspect ratio and resolution
        // ------------------------------------------------------------
        const ratio        = Na__UiFeature__ParseAspectRatio(exportConfig.aspectRatios[ratioIndex]); // <-- Parse selected aspect ratio
        const targetHeight = exportConfig.resolutions[resIndex];                                      // <-- Target height from resolution slider
        const targetWidth  = Math.round(targetHeight * (ratio.width / ratio.height));                 // <-- Calculate width from ratio

        const result = await Na__StaticExport__RenderToCanvas({
            renderer,
            scene,
            camera,
            getRenderPipelineState,
            elevationOverrides : elevOverrides,            // <-- Ortho export overrides or null for 3D
            targetWidth,
            targetHeight,
            antiAliasSamples   : exportConfig.antiAliasSamples,   // <-- Each tile drawn N times on sub-pixel jitter and averaged
            onProgress         : progress
        });

        // Apply post-processing in place if enhance is enabled
        // ------------------------------------------------------------
        if (isEnhanceEnabled && postProcessConfig) {
            await Na__PostProcess__RunPipeline(result.canvas, postProcessConfig, progress); // <-- Strip-based, mutates result canvas
        }

        await Na__PlExport__Apply(result.canvas, elevOverrides ? elevOverrides.camera : null); // <-- Projected linework over a drawing (port Phase 4)

        return {
            canvas      : result.canvas,                          // <-- Final 2D canvas with rendered image
            width       : result.width,                           // <-- Rendered width in pixels (post-clamp)
            height      : result.height,                          // <-- Rendered height in pixels (post-clamp)
            aspectRatio : exportConfig.aspectRatios[ratioIndex],  // <-- Selected aspect ratio string
            wasClamped  : result.wasClamped                       // <-- True when device limits reduced the output size
        };
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Export Controls Initialization and UI
    // -------------------------------------------------------------------------

    // FUNCTION | Initialize Image Export Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeImageExportControls(renderer, scene, camera, getRenderPipelineState, config = {}, postProcessConfig = null, getElevationOverrides = null) {
        if (!renderer || !scene || !camera) return;

        if (!Na__UiFeature__ValidateExportConfig(config)) return;
        const exportConfig     = Na__UiFeature__NormalizeExportConfig(config); // <-- Normalize long JSON keys to short internal names
        const toggleButton     = document.getElementById('naImageExportToggle');
        const panel            = document.getElementById('naImageExportPanel');
        const customToggle     = document.getElementById('naImageExportCustomToggle');
        const ratioSlider      = document.getElementById('naImageExportRatioSlider');
        const ratioValue       = document.getElementById('naImageExportRatioValue');
        const resSlider        = document.getElementById('naImageExportResolutionSlider');
        const resValue         = document.getElementById('naImageExportResolutionValue');
        const exportButton     = document.getElementById('naImageExportAction');
        const layoutViewButton = document.getElementById('naLayoutViewAction'); // <-- Layout View button
        const enhanceToggle    = document.getElementById('naImageExportEnhanceToggle'); // <-- Enhance Whitecard toggle

        if (!toggleButton || !panel || !customToggle || !ratioSlider || !ratioValue || !resSlider || !resValue || !exportButton) {
            return;
        }

        // Initialize enhance toggle state from config
        // ------------------------------------------------------------
        const enhanceEnabledDefault = postProcessConfig && postProcessConfig.ImageExport__PostProcessEffects__Enabled !== undefined
            ? postProcessConfig.ImageExport__PostProcessEffects__Enabled
            : true; // <-- Default to enabled if config missing
        if (enhanceToggle) {
            enhanceToggle.checked = enhanceEnabledDefault; // <-- Set initial state
        }

        let isCustomEnabled  = exportConfig.customEnabled;
        let isEnhanceEnabled = enhanceEnabledDefault; // <-- Track enhance toggle state
        let ratioIndex       = Na__UiFeature__ClampIndex(exportConfig.defaultAspectIndex, 0, exportConfig.aspectRatios.length - 1);
        let resIndex         = Na__UiFeature__ClampIndex(exportConfig.defaultResolutionIndex, 0, exportConfig.resolutions.length - 1);

        const updateControlsState = () => {
            ratioSlider.disabled = !isCustomEnabled;
            resSlider.disabled   = !isCustomEnabled;
            customToggle.checked = isCustomEnabled;
        };

        const updateLabels = () => {
            ratioValue.textContent = exportConfig.aspectRatios[ratioIndex];
            resValue.textContent   = `${exportConfig.resolutions[resIndex] / 1024}k`;
        };

        ratioSlider.min   = 0;
        ratioSlider.max   = exportConfig.aspectRatios.length - 1;
        ratioSlider.step  = 1;
        ratioSlider.value = ratioIndex;

        resSlider.min   = 0;
        resSlider.max   = exportConfig.resolutions.length - 1;
        resSlider.step  = 1;
        resSlider.value = resIndex;

        updateLabels();
        updateControlsState();

        // Initialize viewport overlays
        // ------------------------------------------------------------
        Na__UiFeature__CreateViewportOverlays(); // <-- Create overlay DOM elements
        // ------------------------------------------------------------

        toggleButton.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);

            // Update overlay visibility based on panel state
            // ------------------------------------------------------------
            const panelIsNowOpen = panel.classList.contains('is-open'); // <-- Check new panel state
            if (panelIsNowOpen) { // <-- Panel is now open
                Na__UiFeature__UpdateViewportOverlays(exportConfig.aspectRatios[ratioIndex], true); // <-- Show overlay with current aspect ratio

                // Also expand Camera Lens panel so user is aware of lens setting before export
                const cameraLensPanel = document.getElementById('naCameraLensPanel'); // <-- Get camera lens panel
                if (cameraLensPanel) {
                    cameraLensPanel.classList.add('is-open'); // <-- Ensure lens panel is open alongside export panel
                }
            } else { // <-- Panel is now closed
                Na__UiFeature__UpdateViewportOverlays(exportConfig.aspectRatios[ratioIndex], false); // <-- Hide overlay
            }
            // ------------------------------------------------------------
        });

        customToggle.addEventListener('change', (event) => {
            isCustomEnabled = event.target.checked;
            updateControlsState();

            // Update overlay visibility based on custom export state
            // ------------------------------------------------------------
            if (panel.classList.contains('is-open')) { // <-- Check if panel is open
                if (isCustomEnabled) { // <-- Custom export enabled
                    Na__UiFeature__UpdateViewportOverlays(exportConfig.aspectRatios[ratioIndex], true); // <-- Show overlay
                } else { // <-- Custom export disabled
                    Na__UiFeature__UpdateViewportOverlays(exportConfig.aspectRatios[ratioIndex], false); // <-- Hide overlay
                }
            }
            // ------------------------------------------------------------
        });

        if (enhanceToggle) {
            enhanceToggle.addEventListener('change', (event) => {
                isEnhanceEnabled = event.target.checked; // <-- Update enhance state
            });
        }

        ratioSlider.addEventListener('input', (event) => {
            ratioIndex = parseInt(event.target.value, 10);
            updateLabels();

            // Update overlay with new aspect ratio if panel is open
            // ------------------------------------------------------------
            if (panel.classList.contains('is-open')) { // <-- Check if panel is open
                Na__UiFeature__UpdateViewportOverlays(exportConfig.aspectRatios[ratioIndex], true); // <-- Update overlay with new ratio
            }
            // ------------------------------------------------------------
        });

        resSlider.addEventListener('input', (event) => {
            resIndex = parseInt(event.target.value, 10);
            updateLabels();
        });

        // PUBLISH THE LIVE SETTINGS | For callers that export without the button
        // ------------------------------------------------------------
        // Getters, not a snapshot: the Presentation Scenes batch export reads
        // this at the moment it runs, so it honours a slider the user moved
        // after the panel was built. Defaults are already in place here -
        // ratioIndex and resIndex were clamped out of the config above - so a
        // caller that arrives before anything has been touched gets exactly
        // what pressing Download Image would have given it.
        // ------------------------------------------------------------
        Na__UiFeature__ImageExport__LiveSettings = {
            renderer               : renderer,
            scene                  : scene,
            camera                 : camera,
            getRenderPipelineState : getRenderPipelineState,
            postProcessConfig      : postProcessConfig,
            exportConfig           : exportConfig,
            getElevationOverrides  : getElevationOverrides,
            GetIsCustomEnabled     : () => isCustomEnabled,
            GetIsEnhanceEnabled    : () => isEnhanceEnabled,
            GetRatioIndex          : () => ratioIndex,
            GetResIndex            : () => resIndex
        };
        // ------------------------------------------------------------


        // ------------------------------------------------------------
        // SUB FUNCTION | Loading Overlay Controller (Shared by Both Handlers)
        // ------------------------------------------------------------
        // Thin wrapper over the shared controller. The implementation moved to
        // Na__AppUtils__LoadingOverlay__ so Video Studio renders behind the same
        // spinner rather than carrying a second copy of it.
        // ------------------------------------------------------------
        function Na__UiFeature__CreateOverlayController(actionButton) {
            return Na__AppUtils__LoadingOverlay__Create({ actionButton });
        }
        // ------------------------------------------------------------


        // ------------------------------------------------------------
        // SUB FUNCTION | Handle Export Now Action
        // ------------------------------------------------------------
        let downloadInProgress = false;                                    // <-- Guard against double-click

        exportButton.addEventListener('click', async () => {
            if (downloadInProgress) return;                                // <-- Ignore if already running
            downloadInProgress = true;                                     // <-- Lock

            const overlayUi = Na__UiFeature__CreateOverlayController(exportButton);
            const unlock    = () => { downloadInProgress = false; };

            overlayUi.show('Rendering Your Image...');                     // <-- Phase 1 message

            try {
                await Na__ExportYield__NextPaint();                          // <-- Let the overlay paint before heavy work

                const result = await Na__UiFeature__RenderToCanvas(        // <-- Render (tiled when custom mode is on)
                    renderer, scene, camera, getRenderPipelineState,
                    postProcessConfig, isEnhanceEnabled,
                    isCustomEnabled, exportConfig, ratioIndex, resIndex,
                    getElevationOverrides,
                    overlayUi.setStatus                                    // <-- Live progress (tiles / enhance phases)
                );

                overlayUi.setStatus('Encoding Image...');                  // <-- Phase 2 message
                await Na__ExportYield__NextPaint();                          // <-- Paint before the encode blocks

                const blob = await Na__UiFeature__CanvasToBlob(result.canvas); // <-- Throws on encode failure (no silent empty PNG)

                const filename = isCustomEnabled                           // <-- Generate filename based on mode
                    ? `ValeVision3D__${result.width}x${result.height}.png`
                    : 'ValeVision3D__Viewport.png';
                Na__UiFeature__DownloadBlob(blob, filename);               // <-- Trigger download via object URL

                Na__RenderLoop__RequestRender();                           // <-- Refresh viewport
                const doneMessage = result.wasClamped
                    ? `Download Ready! (Reduced to ${result.width}x${result.height} for this device)`
                    : 'Download Ready!';
                overlayUi.dismiss(doneMessage, false, 2500, unlock);       // <-- Success dismiss then unlock

            } catch (exportError) {
                console.error('[ImageExport] Export failed:', exportError);
                Na__RenderLoop__RequestRender();                           // <-- Engine state was restored by the tiled renderer's finally
                const reason = (exportError && exportError.message) ? exportError.message : 'Unknown error';
                overlayUi.dismiss(`Export Failed - ${reason}`, true, 5000, unlock); // <-- Error dismiss then unlock
            }
        });
        // ------------------------------------------------------------


        // ------------------------------------------------------------
        // SUB FUNCTION | Handle Layout View Action (with Loading Overlay)
        // ------------------------------------------------------------
        let layoutViewInProgress = false;                                    // <-- Guard against double-click

        if (layoutViewButton) {
            layoutViewButton.addEventListener('click', async () => {
                if (layoutViewInProgress) return;                            // <-- Ignore if already running
                layoutViewInProgress = true;                                 // <-- Lock

                const overlayUi = Na__UiFeature__CreateOverlayController(layoutViewButton);
                const unlock    = () => { layoutViewInProgress = false; };

                overlayUi.show('Rendering Your Image...');                   // <-- Phase 1 message

                // PRE-OPEN TAB | Must happen synchronously inside the click gesture.
                // Tiled renders take many seconds; a window.open after the render
                // would be popup-blocked (transient activation expires).
                // ------------------------------------------------------------
                let layoutTab = null;
                try {
                    layoutTab = window.open('', '_blank');                   // <-- Placeholder tab while the render runs
                    if (layoutTab) {
                        layoutTab.document.write(
                            '<!DOCTYPE html><html><head><title>Preparing Drawing Layout...</title></head>'
                            + '<body style="margin:0; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif; color:#555555;">'
                            + '<p style="text-align:center;">Preparing your drawing layout...<br>This tab will load automatically when the image render completes.</p>'
                            + '</body></html>'
                        );
                        layoutTab.document.close();
                    }
                } catch (tabError) {
                    layoutTab = null;                                        // <-- Popup blocked; fall back to opening after render
                }

                try {
                    await Na__ExportYield__NextPaint();                        // <-- Let the overlay paint before heavy work

                    const result = await Na__UiFeature__RenderToCanvas(      // <-- Render (tiled when custom mode is on)
                        renderer, scene, camera, getRenderPipelineState,
                        postProcessConfig, isEnhanceEnabled,
                        isCustomEnabled, exportConfig, ratioIndex, resIndex,
                        getElevationOverrides,
                        overlayUi.setStatus                                  // <-- Live progress (tiles / enhance phases)
                    );

                    overlayUi.setStatus('Encoding Image...');                // <-- Phase 2 message
                    await Na__ExportYield__NextPaint();                        // <-- Paint before the encode blocks

                    const blob = await Na__UiFeature__CanvasToBlob(result.canvas); // <-- Blob transfer (no 40-90MB base64 string)

                    overlayUi.setStatus('Sending To Drawing Document...');   // <-- Phase 3 message

                    // Store rendered image data on window global for the layout tab to read
                    // ------------------------------------------------------------
                    window.__Na__PageLayout__PendingImage = {                // <-- Set global property
                        blob        : blob,                                  // <-- PNG blob (layout tab creates its own object URL)
                        width       : result.width,                          // <-- Image width in pixels
                        height      : result.height,                         // <-- Image height in pixels
                        aspectRatio : result.aspectRatio                     // <-- Aspect ratio string or null
                    };

                    // Navigate the pre-opened tab to the Page Layout System
                    // ------------------------------------------------------------
                    const layoutUrl = new URL('./02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html', window.location.href).href;
                    if (layoutTab && !layoutTab.closed) {
                        layoutTab.location.href = layoutUrl;                 // <-- Load layout page in the placeholder tab
                    } else {
                        window.open(layoutUrl, '_blank');                    // <-- Fallback (may be popup-blocked; best effort)
                    }

                    // LISTEN FOR POSTMESSAGE | Layout tab confirms it loaded successfully
                    // ------------------------------------------------------------
                    let layoutMessageReceived = false;                       // <-- Track if message arrived
                    let layoutDismissed       = false;                       // <-- Guard against double dismiss

                    function Na__LayoutView__Finish() {
                        if (layoutDismissed) return;                         // <-- Only dismiss once
                        layoutDismissed = true;
                        overlayUi.dismiss('Success! See new tab for your Drawing Layout', false, 2500, unlock);
                    }

                    function Na__LayoutView__OnMessage(event) {
                        if (event.data && event.data.type === 'Na__PageLayout__Ready') {
                            layoutMessageReceived = true;                    // <-- Mark received
                            window.removeEventListener('message', Na__LayoutView__OnMessage); // <-- Clean up listener
                            Na__LayoutView__Finish();                        // <-- Show success and dismiss
                        }
                    }

                    window.addEventListener('message', Na__LayoutView__OnMessage); // <-- Register listener

                    // TIMEOUT FALLBACK | Dismiss after 8s if no postMessage received
                    // ------------------------------------------------------------
                    setTimeout(() => {
                        if (!layoutMessageReceived) {
                            window.removeEventListener('message', Na__LayoutView__OnMessage); // <-- Clean up listener
                            Na__LayoutView__Finish();                        // <-- Dismiss regardless
                        }
                    }, 8000);

                } catch (layoutError) {
                    console.error('[ImageExport] Layout view failed:', layoutError);
                    if (layoutTab && !layoutTab.closed) {
                        try { layoutTab.close(); } catch (closeError) {}     // <-- Remove the orphaned placeholder tab
                    }
                    Na__RenderLoop__RequestRender();                         // <-- Engine state was restored by the tiled renderer's finally
                    const reason = (layoutError && layoutError.message) ? layoutError.message : 'Unknown error';
                    overlayUi.dismiss(`Layout Failed - ${reason}`, true, 5000, unlock); // <-- Error dismiss then unlock
                }
            });
        }
        // ------------------------------------------------------------
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Programmatic Export (batch callers)
    // -------------------------------------------------------------------------

    // FUNCTION | Are the Export Controls Live Yet?
    // ------------------------------------------------------------
    function Na__UiFeature__ImageExport__IsReady() {
        return Na__UiFeature__ImageExport__LiveSettings !== null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Live View at the Current Export Settings
    // ------------------------------------------------------------
    // Exactly what Download Image renders, minus the overlay and the save.
    // Returns { canvas, width, height, aspectRatio, wasClamped }, or null when
    // the export panel never initialised - a caller that gets null should say
    // so rather than invent a size, because "the settings" would then be a
    // fiction.
    //
    // THROWS ON A FAILED RENDER, like the button's own path: the tiled
    // renderer refuses rather than hand back a blank canvas, and a batch needs
    // to hear that on the scene it happened to, not at the end.
    // ------------------------------------------------------------
    async function Na__UiFeature__ImageExport__RenderCurrentView(onStatus) {
        const live = Na__UiFeature__ImageExport__LiveSettings;
        if (!live) return null;

        return Na__UiFeature__RenderToCanvas(
            live.renderer, live.scene, live.camera, live.getRenderPipelineState,
            live.postProcessConfig, live.GetIsEnhanceEnabled(),
            live.GetIsCustomEnabled(), live.exportConfig,
            live.GetRatioIndex(), live.GetResIndex(),
            live.getElevationOverrides,
            (typeof onStatus === 'function') ? onStatus : null
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Encode a Rendered Canvas and Save It to the User's Downloads
    // ------------------------------------------------------------
    // Shares the button's encoder, which THROWS on failure rather than saving
    // an empty PNG, and the button's object-URL download path - so a batch
    // save and a single save are the same gesture as far as the browser and
    // the file system are concerned.
    // ------------------------------------------------------------
    async function Na__UiFeature__ImageExport__DownloadCanvas(canvas, filename) {
        if (!canvas || !filename) return false;
        const blob = await Na__UiFeature__CanvasToBlob(canvas);
        Na__UiFeature__DownloadBlob(blob, filename);
        return true;
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Module Exports
    // -------------------------------------------------------------------------

    // MODULE EXPORTS | Image Export API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeImageExportControls,
        Na__UiFeature__ImageExport__IsReady,
        Na__UiFeature__ImageExport__RenderCurrentView,
        Na__UiFeature__ImageExport__DownloadCanvas
    };
    // ------------------------------------------------------------

// endregion --------------------------------------------------------------

// endregion -------------------------------------------------------------------
