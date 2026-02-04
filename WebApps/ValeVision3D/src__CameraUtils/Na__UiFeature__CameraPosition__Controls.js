// -----------------------------------------------------------------------------
// REGION | UI Feature - Camera Position Reporting
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Output Defaults
    // ------------------------------------------------------------
    const Na__UiFeature__CameraPositionDefaults = {
        precision: 4
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Float Value
    // ------------------------------------------------------------
    function Na__UiFeature__FormatValue(value, precision) {
        return parseFloat(value.toFixed(precision));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Camera JSON
    // ------------------------------------------------------------
    function Na__UiFeature__BuildCameraJson(camera, controls, precision) {
        const position = camera.position;
        const rotation = camera.rotation;
        const target = controls?.target;
        
        return {
            position: {
                x: Na__UiFeature__FormatValue(position.x, precision),
                y: Na__UiFeature__FormatValue(position.y, precision),
                z: Na__UiFeature__FormatValue(position.z, precision)
            },
            rotation: {
                x: Na__UiFeature__FormatValue(rotation.x, precision),
                y: Na__UiFeature__FormatValue(rotation.y, precision),
                z: Na__UiFeature__FormatValue(rotation.z, precision)
            },
            target: target
                ? {
                    x: Na__UiFeature__FormatValue(target.x, precision),
                    y: Na__UiFeature__FormatValue(target.y, precision),
                    z: Na__UiFeature__FormatValue(target.z, precision)
                }
                : null,
            fov: Na__UiFeature__FormatValue(camera.fov, precision)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy Text to Clipboard
    // ------------------------------------------------------------
    async function Na__UiFeature__CopyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Camera Position Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeCameraPositionControls(camera, controls, config = {}) {
        if (!camera) return;
        
        const settings = { ...Na__UiFeature__CameraPositionDefaults, ...(config || {}) };
        const toggleButton = document.getElementById('naCameraPositionToggle');
        const panel = document.getElementById('naCameraPositionPanel');
        const output = document.getElementById('naCameraPositionOutput');
        const refreshButton = document.getElementById('naCameraPositionRefresh');
        const copyButton = document.getElementById('naCameraPositionCopy');
        
        if (!toggleButton || !panel || !output || !refreshButton || !copyButton) {
            return;
        }
        
        const updateOutput = () => {
            const data = Na__UiFeature__BuildCameraJson(camera, controls, settings.precision);
            output.value = JSON.stringify(data, null, 2);
        };
        
        toggleButton.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            if (!isOpen) {
                updateOutput();
            }
        });
        
        refreshButton.addEventListener('click', () => {
            updateOutput();
        });
        
        copyButton.addEventListener('click', async () => {
            updateOutput();
            await Na__UiFeature__CopyToClipboard(output.value);
        });
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Camera Position API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeCameraPositionControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
