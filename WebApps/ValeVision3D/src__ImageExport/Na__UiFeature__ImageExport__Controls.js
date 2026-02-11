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
        aspectRatios: 'aspectRatios',
        defaultAspectIndex: 'defaultAspectIndex',
        resolutions: 'resolutions',
        defaultResolutionIndex: 'defaultResolutionIndex',
        customEnabled: 'customEnabled'
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


    // HELPER FUNCTION | Download Image
    // ------------------------------------------------------------
    function Na__UiFeature__DownloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    // ------------------------------------------------------------

    // endregion --------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Export Controls Initialization and UI
    // -------------------------------------------------------------------------

    // FUNCTION | Initialize Image Export Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeImageExportControls(renderer, scene, camera, getComposer, config = {}, postProcessConfig = null) {
        if (!renderer || !scene || !camera) return;
        
        if (!Na__UiFeature__ValidateExportConfig(config)) return;
        const exportConfig = config;
        const toggleButton = document.getElementById('naImageExportToggle');
        const panel = document.getElementById('naImageExportPanel');
        const customToggle = document.getElementById('naImageExportCustomToggle');
        const ratioSlider = document.getElementById('naImageExportRatioSlider');
        const ratioValue = document.getElementById('naImageExportRatioValue');
        const resSlider = document.getElementById('naImageExportResolutionSlider');
        const resValue = document.getElementById('naImageExportResolutionValue');
        const exportButton = document.getElementById('naImageExportAction');
        const enhanceToggle = document.getElementById('naImageExportEnhanceToggle'); // <-- Enhance Whitecard toggle
        
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
        
        let isCustomEnabled = exportConfig.customEnabled;
        let isEnhanceEnabled = enhanceEnabledDefault; // <-- Track enhance toggle state
        let ratioIndex = Na__UiFeature__ClampIndex(exportConfig.defaultAspectIndex, 0, exportConfig.aspectRatios.length - 1);
        let resIndex = Na__UiFeature__ClampIndex(exportConfig.defaultResolutionIndex, 0, exportConfig.resolutions.length - 1);
        
        const updateControlsState = () => {
            ratioSlider.disabled = !isCustomEnabled;
            resSlider.disabled = !isCustomEnabled;
            customToggle.checked = isCustomEnabled;
        };
        
        const updateLabels = () => {
            ratioValue.textContent = exportConfig.aspectRatios[ratioIndex];
            resValue.textContent = `${exportConfig.resolutions[resIndex] / 1024}k`;
        };
        
        ratioSlider.min = 0;
        ratioSlider.max = exportConfig.aspectRatios.length - 1;
        ratioSlider.step = 1;
        ratioSlider.value = ratioIndex;
        
        resSlider.min = 0;
        resSlider.max = exportConfig.resolutions.length - 1;
        resSlider.step = 1;
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
        // SUB FUNCTION | Handle Export Action
        // ------------------------------------------------------------
        exportButton.addEventListener('click', () => {
            if (!isCustomEnabled) {
                const composer = typeof getComposer === 'function' ? getComposer() : null;
                
                if (composer) {
                    composer.render();
                } else {
                    renderer.render(scene, camera);
                }
                
                // Apply post-processing if enhance is enabled
                // ------------------------------------------------------------
                let finalCanvas = renderer.domElement; // <-- Default to renderer canvas
                if (isEnhanceEnabled && postProcessConfig) {
                    const offscreenCanvas = document.createElement('canvas'); // <-- Create offscreen canvas
                    offscreenCanvas.width = renderer.domElement.width; // <-- Set width
                    offscreenCanvas.height = renderer.domElement.height; // <-- Set height
                    const offscreenCtx = offscreenCanvas.getContext('2d'); // <-- Get context
                    offscreenCtx.drawImage(renderer.domElement, 0, 0); // <-- Copy renderer canvas
                    finalCanvas = Na__PostProcess__RunPipeline(offscreenCanvas, postProcessConfig); // <-- Apply post-processing
                }
                
                const dataUrl = finalCanvas.toDataURL('image/png'); // <-- Get data URL from final canvas
                Na__UiFeature__DownloadImage(dataUrl, 'ValeVision3D__Viewport.png');
                return;
            }
            
            const ratio = Na__UiFeature__ParseAspectRatio(exportConfig.aspectRatios[ratioIndex]);
            const targetHeight = exportConfig.resolutions[resIndex];
            const targetWidth = Math.round(targetHeight * (ratio.width / ratio.height));
            
            const size = renderer.getSize(new THREE.Vector2());
            const pixelRatio = renderer.getPixelRatio();
            const composer = typeof getComposer === 'function' ? getComposer() : null;
            const originalAspect = camera.aspect;
            
            renderer.setPixelRatio(1);
            renderer.setSize(targetWidth, targetHeight);
            
            camera.aspect = targetWidth / targetHeight;
            camera.updateProjectionMatrix();
            
            if (composer) {
                composer.setSize(targetWidth, targetHeight);
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
            
            // Apply post-processing if enhance is enabled
            // ------------------------------------------------------------
            let finalCanvas = renderer.domElement; // <-- Default to renderer canvas
            if (isEnhanceEnabled && postProcessConfig) {
                const offscreenCanvas = document.createElement('canvas'); // <-- Create offscreen canvas
                offscreenCanvas.width = targetWidth; // <-- Set width
                offscreenCanvas.height = targetHeight; // <-- Set height
                const offscreenCtx = offscreenCanvas.getContext('2d'); // <-- Get context
                offscreenCtx.drawImage(renderer.domElement, 0, 0); // <-- Copy renderer canvas
                finalCanvas = Na__PostProcess__RunPipeline(offscreenCanvas, postProcessConfig); // <-- Apply post-processing
            }
            
            const dataUrl = finalCanvas.toDataURL('image/png'); // <-- Get data URL from final canvas
            Na__UiFeature__DownloadImage(dataUrl, `ValeVision3D__${targetWidth}x${targetHeight}.png`);
            
            camera.aspect = originalAspect;
            camera.updateProjectionMatrix();
            
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(size.x, size.y);
            if (composer) {
                composer.setSize(size.x, size.y);
            }
        });
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
