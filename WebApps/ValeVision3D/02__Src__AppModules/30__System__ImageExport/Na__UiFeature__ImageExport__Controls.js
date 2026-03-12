// -----------------------------------------------------------------------------
// REGION | UI Feature - Image Export Controls
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Post Process Pipeline
    // ------------------------------------------------------------
    import { Na__PostProcess__RunPipeline } from './Na__ImageExport__PostProcessEffects__Pipeline.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Viewport Overlays
    // ------------------------------------------------------------
    import { Na__UiFeature__CreateViewportOverlays, Na__UiFeature__UpdateViewportOverlays } from './Na__UiFeature__ImageExport__ViewportOverlays.js';
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
        customEnabled          : 'ImageExport__Config__CustomEnabled'           // <-- Custom size toggle default key
    };
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
            customEnabled          : config[Na__UiFeature__ExportConfigKeys.customEnabled]           // <-- Map long JSON key to short internal name
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download Image from Data URL
    // ------------------------------------------------------------
    function Na__UiFeature__DownloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href     = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
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
    // Renders the scene at the configured resolution and aspect ratio,
    // applies post-processing if enhance is enabled, and returns an
    // object with the captured canvas and image metadata.
    //
    // Always copies the WebGL framebuffer into a 2D offscreen canvas
    // immediately after render() to guarantee reliable pixel readback,
    // regardless of the renderer's preserveDrawingBuffer setting.
    //
    // Returns: { canvas, width, height, aspectRatio }
    // ------------------------------------------------------------
    function Na__UiFeature__RenderToCanvas(renderer, scene, camera, getRenderPipelineState, postProcessConfig, isEnhanceEnabled, isCustomEnabled, exportConfig, ratioIndex, resIndex) {

        // NON-CUSTOM MODE | Render at current viewport size
        // ------------------------------------------------------------
        if (!isCustomEnabled) {
            const pipelineState = Na__UiFeature__ResolveRenderPipelineState(getRenderPipelineState); // <-- Resolve render pipeline state
            const composer      = pipelineState.composer;                                            // <-- Composer reference

            if (composer) {
                pipelineState.renderProfileNormals(); // <-- Refresh profile normals before compose render
                composer.render();                    // <-- Render via post-processing composer
            } else {
                renderer.render(scene, camera); // <-- Direct render fallback
            }

            // Copy WebGL buffer to 2D canvas for reliable pixel readback
            // ------------------------------------------------------------
            const captureCanvas  = document.createElement('canvas'); // <-- Create offscreen 2D canvas
            captureCanvas.width  = renderer.domElement.width;         // <-- Match renderer width
            captureCanvas.height = renderer.domElement.height;        // <-- Match renderer height
            const captureCtx     = captureCanvas.getContext('2d');    // <-- Get 2D context
            captureCtx.drawImage(renderer.domElement, 0, 0);          // <-- Copy WebGL pixels immediately

            // Apply post-processing if enhance is enabled
            // ------------------------------------------------------------
            const finalCanvas = (isEnhanceEnabled && postProcessConfig)
                ? Na__PostProcess__RunPipeline(captureCanvas, postProcessConfig) // <-- Apply post-processing pipeline
                : captureCanvas;                                                  // <-- Use capture canvas directly

            return {
                canvas      : finalCanvas,                 // <-- Final 2D canvas with rendered image
                width       : renderer.domElement.width,   // <-- Rendered width in pixels
                height      : renderer.domElement.height,  // <-- Rendered height in pixels
                aspectRatio : null                         // <-- No custom aspect ratio (viewport native)
            };
        }

        // CUSTOM MODE | Render at configured aspect ratio and resolution
        // ------------------------------------------------------------
        const ratio         = Na__UiFeature__ParseAspectRatio(exportConfig.aspectRatios[ratioIndex]); // <-- Parse selected aspect ratio
        const targetHeight  = exportConfig.resolutions[resIndex];                                      // <-- Target height from resolution slider
        const targetWidth   = Math.round(targetHeight * (ratio.width / ratio.height));                 // <-- Calculate width from ratio

        const size           = renderer.getSize(new THREE.Vector2()); // <-- Store current renderer size
        const pixelRatio     = renderer.getPixelRatio();               // <-- Store current pixel ratio
        const pipelineState  = Na__UiFeature__ResolveRenderPipelineState(getRenderPipelineState); // <-- Resolve render pipeline state
        const composer       = pipelineState.composer;                 // <-- Composer reference
        const originalAspect = camera.aspect;                          // <-- Store original camera aspect

        renderer.setPixelRatio(1);                   // <-- Set pixel ratio to 1 for exact resolution
        renderer.setSize(targetWidth, targetHeight); // <-- Resize renderer to target dimensions

        camera.aspect = targetWidth / targetHeight; // <-- Update camera aspect ratio
        camera.updateProjectionMatrix();             // <-- Apply camera changes

        if (composer) {
            composer.setSize(targetWidth, targetHeight);                  // <-- Resize composer
            pipelineState.setProfileLinesSize(targetWidth, targetHeight); // <-- Resize profile lines render target
            pipelineState.setFxaaSize(targetWidth, targetHeight);         // <-- Resize FXAA resolution uniform
            pipelineState.renderProfileNormals();                         // <-- Refresh profile normals at export dimensions
            composer.render();                                            // <-- Render via composer
        } else {
            renderer.render(scene, camera); // <-- Direct render fallback
        }

        // Copy WebGL buffer to 2D canvas for reliable pixel readback
        // ------------------------------------------------------------
        const captureCanvas  = document.createElement('canvas'); // <-- Create offscreen 2D canvas
        captureCanvas.width  = targetWidth;                       // <-- Match target width
        captureCanvas.height = targetHeight;                      // <-- Match target height
        const captureCtx     = captureCanvas.getContext('2d');    // <-- Get 2D context
        captureCtx.drawImage(renderer.domElement, 0, 0);          // <-- Copy WebGL pixels immediately

        // Apply post-processing if enhance is enabled
        // ------------------------------------------------------------
        const finalCanvas = (isEnhanceEnabled && postProcessConfig)
            ? Na__PostProcess__RunPipeline(captureCanvas, postProcessConfig) // <-- Apply post-processing pipeline
            : captureCanvas;                                                  // <-- Use capture canvas directly

        // Restore renderer, camera, and composer to original state
        // ------------------------------------------------------------
        camera.aspect = originalAspect; // <-- Restore camera aspect
        camera.updateProjectionMatrix(); // <-- Apply camera restore

        renderer.setPixelRatio(pixelRatio);  // <-- Restore pixel ratio
        renderer.setSize(size.x, size.y);    // <-- Restore renderer size
        if (composer) {
            composer.setSize(size.x, size.y);                              // <-- Restore composer size
            pipelineState.setProfileLinesSize(size.x, size.y);             // <-- Restore profile lines render target size
            pipelineState.setFxaaSize(size.x, size.y);                     // <-- Restore FXAA resolution uniform
            pipelineState.renderProfileNormals();                           // <-- Refresh profile normals for live viewport after restore
        }

        return {
            canvas      : finalCanvas,                            // <-- Final 2D canvas with rendered image
            width       : targetWidth,                            // <-- Rendered width in pixels
            height      : targetHeight,                           // <-- Rendered height in pixels
            aspectRatio : exportConfig.aspectRatios[ratioIndex]   // <-- Selected aspect ratio string
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Scene to DataURL - Wrapper for Layout View
    // ------------------------------------------------------------
    // Thin wrapper around Na__UiFeature__RenderToCanvas for the
    // Layout View path, which requires a PNG data URL string to
    // pass to the Page Layout System via window globals.
    //
    // Returns: { dataUrl, width, height, aspectRatio }
    // ------------------------------------------------------------
    function Na__UiFeature__RenderToDataUrl(renderer, scene, camera, getRenderPipelineState, postProcessConfig, isEnhanceEnabled, isCustomEnabled, exportConfig, ratioIndex, resIndex) {
        const result = Na__UiFeature__RenderToCanvas(           // <-- Delegate to canvas render helper
            renderer, scene, camera, getRenderPipelineState,
            postProcessConfig, isEnhanceEnabled,
            isCustomEnabled, exportConfig, ratioIndex, resIndex
        );
        return {
            dataUrl     : result.canvas.toDataURL('image/png'), // <-- Encode canvas to PNG data URL string
            width       : result.width,                          // <-- Pass through width
            height      : result.height,                         // <-- Pass through height
            aspectRatio : result.aspectRatio                     // <-- Pass through aspect ratio
        };
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Export Controls Initialization and UI
    // -------------------------------------------------------------------------

    // FUNCTION | Initialize Image Export Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeImageExportControls(renderer, scene, camera, getRenderPipelineState, config = {}, postProcessConfig = null) {
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
        

        // ------------------------------------------------------------
        // SUB FUNCTION | Handle Export Now Action
        // ------------------------------------------------------------
        let downloadInProgress = false;                                    // <-- Guard against double-click

        exportButton.addEventListener('click', () => {
            if (downloadInProgress) return;                                // <-- Ignore if already running
            downloadInProgress = true;                                     // <-- Lock

            // DOM references for layout loading overlay
            // ------------------------------------------------------------
            const loadingOverlay = document.getElementById('naLayoutLoadingOverlay'); // <-- Overlay container
            const loadingStatus  = document.getElementById('naLayoutLoadingStatus');  // <-- Status text element

            // SHOW OVERLAY | Phase 1 - "Rendering Your Image..."
            // ------------------------------------------------------------
            exportButton.classList.add('is-loading');                      // <-- Dim the button
            if (loadingOverlay && loadingStatus) {
                loadingStatus.textContent = 'Rendering Your Image...';     // <-- Phase 1 message
                loadingStatus.classList.remove('na-layout-loading-overlay__status--success'); // <-- Reset success state
                loadingOverlay.classList.remove('na-layout-loading-overlay--fade-out');        // <-- Reset fade-out
                loadingOverlay.classList.add('na-layout-loading-overlay--visible');            // <-- Show overlay
            }

            // DEFER RENDER | Allow overlay to paint before blocking render
            // ------------------------------------------------------------
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {

                    const result = Na__UiFeature__RenderToCanvas(          // <-- Render to 2D canvas using shared helper
                        renderer, scene, camera, getRenderPipelineState,
                        postProcessConfig, isEnhanceEnabled,
                        isCustomEnabled, exportConfig, ratioIndex, resIndex
                    );

                    // UPDATE OVERLAY | Phase 2 - "Encoding Image..."
                    // ------------------------------------------------------------
                    if (loadingStatus) {
                        loadingStatus.textContent = 'Encoding Image...';   // <-- Phase 2 message
                    }

                    const filename = isCustomEnabled                        // <-- Generate filename based on mode
                        ? `ValeVision3D__${result.width}x${result.height}.png`
                        : 'ValeVision3D__Viewport.png';

                    // HELPER | Dismiss overlay with success state
                    // ------------------------------------------------------------
                    function Na__ImageExport__DismissOverlay() {
                        if (loadingStatus) {
                            loadingStatus.textContent = 'Download Ready!';                              // <-- Phase 3 message
                            loadingStatus.classList.add('na-layout-loading-overlay__status--success');  // <-- Green text
                        }
                        setTimeout(() => {
                            if (loadingOverlay) {
                                loadingOverlay.classList.add('na-layout-loading-overlay--fade-out');    // <-- Start fade-out
                                setTimeout(() => {
                                    loadingOverlay.classList.remove('na-layout-loading-overlay--visible');  // <-- Hide completely
                                    loadingOverlay.classList.remove('na-layout-loading-overlay--fade-out'); // <-- Reset fade class
                                }, 400);
                            }
                            exportButton.classList.remove('is-loading');   // <-- Re-enable button
                            downloadInProgress = false;                    // <-- Unlock
                        }, 2500);
                    }

                    // ENCODE AND DOWNLOAD | Async PNG blob encoding - non-blocking
                    // ------------------------------------------------------------
                    result.canvas.toBlob((blob) => {
                        if (blob) {
                            Na__UiFeature__DownloadBlob(blob, filename); // <-- Trigger download via object URL
                        }
                        Na__RenderLoop__RequestRender();                 // <-- Refresh viewport after renderer restore
                        Na__ImageExport__DismissOverlay();               // <-- Show success and dismiss overlay
                    }, 'image/png');

                });
            });
        });
        // ------------------------------------------------------------


        // ------------------------------------------------------------
        // SUB FUNCTION | Handle Layout View Action (with Loading Overlay)
        // ------------------------------------------------------------
        let layoutViewInProgress = false;                                    // <-- Guard against double-click

        if (layoutViewButton) {
            layoutViewButton.addEventListener('click', () => {
                if (layoutViewInProgress) return;                            // <-- Ignore if already running
                layoutViewInProgress = true;                                 // <-- Lock

                // DOM references for layout loading overlay
                // ------------------------------------------------------------
                const loadingOverlay = document.getElementById('naLayoutLoadingOverlay'); // <-- Overlay container
                const loadingStatus  = document.getElementById('naLayoutLoadingStatus');  // <-- Status text element

                // SHOW OVERLAY | Phase 1 - "Rendering Your Image..."
                // ------------------------------------------------------------
                layoutViewButton.classList.add('is-loading');                 // <-- Dim the button
                if (loadingOverlay && loadingStatus) {
                    loadingStatus.textContent = 'Rendering Your Image...';   // <-- Phase 1 message
                    loadingStatus.classList.remove('na-layout-loading-overlay__status--success'); // <-- Reset success state
                    loadingOverlay.classList.remove('na-layout-loading-overlay--fade-out');        // <-- Reset fade-out
                    loadingOverlay.classList.add('na-layout-loading-overlay--visible');            // <-- Show overlay
                }

                // DEFER RENDER | Allow overlay to paint before blocking render
                // ------------------------------------------------------------
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {

                        const result = Na__UiFeature__RenderToDataUrl(       // <-- Render using shared helper
                            renderer, scene, camera, getRenderPipelineState,
                            postProcessConfig, isEnhanceEnabled,
                            isCustomEnabled, exportConfig, ratioIndex, resIndex
                        );

                        // UPDATE OVERLAY | Phase 2 - "Sending To Drawing Document..."
                        // ------------------------------------------------------------
                        if (loadingStatus) {
                            loadingStatus.textContent = 'Sending To Drawing Document...'; // <-- Phase 2 message
                        }

                        // Store rendered image data on window global for new tab to read
                        // ------------------------------------------------------------
                        window.__Na__PageLayout__PendingImage = {            // <-- Set global property
                            dataUrl     : result.dataUrl,                    // <-- PNG data URL
                            width       : result.width,                      // <-- Image width in pixels
                            height      : result.height,                     // <-- Image height in pixels
                            aspectRatio : result.aspectRatio                 // <-- Aspect ratio string or null
                        };

                        // Open the Page Layout System in a new browser tab
                        // ------------------------------------------------------------
                        window.open('./02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html', '_blank'); // <-- Open layout page

                        // HELPER | Dismiss overlay with success state
                        // ------------------------------------------------------------
                        function Na__LayoutView__DismissOverlay() {
                            if (loadingStatus) {
                                loadingStatus.textContent = 'Success! See new tab for your Drawing Layout'; // <-- Phase 3 message
                                loadingStatus.classList.add('na-layout-loading-overlay__status--success');   // <-- Green text
                            }

                            setTimeout(() => {
                                if (loadingOverlay) {
                                    loadingOverlay.classList.add('na-layout-loading-overlay--fade-out');     // <-- Start fade-out
                                    setTimeout(() => {
                                        loadingOverlay.classList.remove('na-layout-loading-overlay--visible');  // <-- Hide completely
                                        loadingOverlay.classList.remove('na-layout-loading-overlay--fade-out'); // <-- Reset fade class
                                    }, 400);
                                }
                                layoutViewButton.classList.remove('is-loading');  // <-- Re-enable button
                                layoutViewInProgress = false;                    // <-- Unlock
                            }, 2500);
                        }

                        // LISTEN FOR POSTMESSAGE | Layout tab confirms it loaded successfully
                        // ------------------------------------------------------------
                        let layoutMessageReceived = false;                   // <-- Track if message arrived

                        function Na__LayoutView__OnMessage(event) {
                            if (event.data && event.data.type === 'Na__PageLayout__Ready') {
                                layoutMessageReceived = true;                // <-- Mark received
                                window.removeEventListener('message', Na__LayoutView__OnMessage); // <-- Clean up listener
                                Na__LayoutView__DismissOverlay();            // <-- Show success and dismiss
                            }
                        }

                        window.addEventListener('message', Na__LayoutView__OnMessage); // <-- Register listener

                        // TIMEOUT FALLBACK | Dismiss after 8s if no postMessage received
                        // ------------------------------------------------------------
                        setTimeout(() => {
                            if (!layoutMessageReceived) {
                                window.removeEventListener('message', Na__LayoutView__OnMessage); // <-- Clean up listener
                                Na__LayoutView__DismissOverlay();            // <-- Dismiss regardless
                            }
                        }, 8000);

                    });
                });
            });
        }
        // ------------------------------------------------------------
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Module Exports
    // -------------------------------------------------------------------------

    // MODULE EXPORTS | Image Export API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeImageExportControls
    };
    // ------------------------------------------------------------

// endregion --------------------------------------------------------------

// endregion -------------------------------------------------------------------
