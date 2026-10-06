// -----------------------------------------------------------------------------
// REGION | UI Feature - Camera Lens Controls
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Math Utils
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from './Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lens Conversion Defaults
    // ------------------------------------------------------------
    const Na__UiFeature__LensDefaults = {
        minFocalLengthMM: 28,                                          // <-- Minimum lens focal length
        maxFocalLengthMM: 75,                                          // <-- Maximum lens focal length
        defaultFocalLengthMM: null,                                    // <-- Null uses current camera FOV
        sensorHeightMM: 24                                             // <-- Full-frame sensor height
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Focal Length to Vertical FOV
    // ------------------------------------------------------------
    function Na__UiFeature__LensFocalToFov(focalLengthMM, sensorHeightMM) {
        const fovRadians = 2 * Math.atan(sensorHeightMM / (2 * focalLengthMM));
        return THREE.MathUtils.radToDeg(fovRadians);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Vertical FOV to Focal Length
    // ------------------------------------------------------------
    function Na__UiFeature__LensFovToFocal(fovDegrees, sensorHeightMM) {
        const fovRadians = THREE.MathUtils.degToRad(fovDegrees);
        return sensorHeightMM / (2 * Math.tan(fovRadians / 2));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp Lens Value
    // ------------------------------------------------------------
    function Na__UiFeature__ClampLensValue(value, minValue, maxValue) {
        return Math.min(Math.max(value, minValue), maxValue);
    }
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Re-Sync Hook
    // ------------------------------------------------------------
    // Assigned during initialization; a no-op before then so callers never
    // have to guard against the panel not existing yet.
    // ------------------------------------------------------------
    let Na__UiFeature__SyncLensFromCamera = () => {};
    // ------------------------------------------------------------


    // FUNCTION | Re-Read the Live Camera and Update the Lens Readout
    // ------------------------------------------------------------
    // For callers that would rather not dispatch an event.
    // ------------------------------------------------------------
    function Na__UiFeature__SyncCameraLensControl() {
        Na__UiFeature__SyncLensFromCamera();
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Camera Lens Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeCameraLensControls(camera, config = {}) {
        if (!camera) return;
        
        const lensConfig = { ...Na__UiFeature__LensDefaults, ...config };
        const panel = document.getElementById('naCameraLensPanel');
        const slider = document.getElementById('naCameraLensSlider');
        const valueLabel = document.getElementById('naCameraLensValue');
        const toggleButton = document.getElementById('naCameraLensToggle');
        
        if (!panel || !slider || !valueLabel || !toggleButton) return;
        
        const currentFocal = Na__UiFeature__LensFovToFocal(camera.fov, lensConfig.sensorHeightMM);
        const initialFocal = lensConfig.defaultFocalLengthMM ?? currentFocal;
        const clampedFocal = Na__UiFeature__ClampLensValue(initialFocal, lensConfig.minFocalLengthMM, lensConfig.maxFocalLengthMM);
        
        slider.min = lensConfig.minFocalLengthMM;
        slider.max = lensConfig.maxFocalLengthMM;
        slider.step = 1;
        slider.value = Math.round(clampedFocal);
        valueLabel.textContent = `${Math.round(clampedFocal)} mm`;
        
        const applyLens = (focalLengthMM) => {
            const fovDegrees = Na__UiFeature__LensFocalToFov(focalLengthMM, lensConfig.sensorHeightMM);
            camera.fov = fovDegrees;
            camera.updateProjectionMatrix();
            Na__VerticalCorrection__ApplyFrame();                                   // <-- Re-apply vertical correction after projection rebuild
            valueLabel.textContent = `${Math.round(focalLengthMM)} mm`;
            Na__RenderLoop__RequestRender();                                        // <-- Invalidate render after FOV change
        };
        
        applyLens(clampedFocal);

        slider.addEventListener('input', (event) => {
            const focalLength = parseFloat(event.target.value);
            applyLens(focalLength);
        });

        // RE-SYNC FROM THE LIVE CAMERA | Added 14-Aug-2026
        // ------------------------------------------------------------
        // This readout used to be written in exactly two places: once at init,
        // and again whenever the slider itself moved. Nine other modules also
        // write camera.fov (Reset View, Walk and Fly entry and exit, saved
        // camera configs, Presentation Mode transitions, Video Studio preview
        // and Go To), and none of them touched this label. The moment any of
        // them ran, the panel carried on reporting a focal length the camera no
        // longer had, which is how a keyframe could honestly record 55mm while
        // this said 45mm.
        //
        // Anything that changes camera.fov outside this control should now
        // dispatch na-camera-fov-changed, or call the exported sync directly.
        // ------------------------------------------------------------
        Na__UiFeature__SyncLensFromCamera = () => {
            const liveFocal = Na__UiFeature__LensFovToFocal(camera.fov, lensConfig.sensorHeightMM);

            // The slider is clamped to the panel's range but the label is not:
            // a Video Studio keyframe can hold a lens outside 24-75mm, and
            // showing the clamped number instead of the real one would be the
            // very lie this exists to stop.
            slider.value = Math.round(Na__UiFeature__ClampLensValue(
                liveFocal, lensConfig.minFocalLengthMM, lensConfig.maxFocalLengthMM
            ));
            valueLabel.textContent = `${Math.round(liveFocal)} mm`;
        };

        window.addEventListener('na-camera-fov-changed', Na__UiFeature__SyncLensFromCamera);
        
        toggleButton.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
        });
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Lens Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeCameraLensControls,
        Na__UiFeature__SyncCameraLensControl
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
