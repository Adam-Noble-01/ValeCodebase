// -----------------------------------------------------------------------------
// REGION | UI Feature - Image Export Controls
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
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
    function Na__UiFeature__InitializeImageExportControls(renderer, scene, camera, getComposer, config = {}) {
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
        
        if (!toggleButton || !panel || !customToggle || !ratioSlider || !ratioValue || !resSlider || !resValue || !exportButton) {
            return;
        }
        
        let isCustomEnabled = exportConfig.customEnabled;
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
        
        toggleButton.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
        });
        
        customToggle.addEventListener('change', (event) => {
            isCustomEnabled = event.target.checked;
            updateControlsState();
        });
        
        ratioSlider.addEventListener('input', (event) => {
            ratioIndex = parseInt(event.target.value, 10);
            updateLabels();
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
                
                const dataUrl = renderer.domElement.toDataURL('image/png');
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
            
            const dataUrl = renderer.domElement.toDataURL('image/png');
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
