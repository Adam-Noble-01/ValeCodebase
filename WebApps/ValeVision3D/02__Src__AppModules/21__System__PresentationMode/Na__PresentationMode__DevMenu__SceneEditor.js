// =============================================================================
// VALEVISION3D - PRESENTATION MODE - DEV MENU SCENE EDITOR
// =============================================================================
//
// FILE       : Na__PresentationMode__DevMenu__SceneEditor.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Dev Menu Scene Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only scene editor inside the Dev Tools menu for
//              creating, editing, and saving Presentation Mode saved scenes
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Gated behind Na__AppUtils__IsRunningOnLocalhost(); completely invisible
//   on production/hosted builds.
// - Renders a scene list inside the static #naPmDevEditorPanel container
//   (declared in index.html Dev Tools section).
// - Per-scene controls: Name (text input), Order (number), Set as Default,
//   FOV slider with live lens-mm readout, Transition Time slider (camera
//   movement speed), Easing dropdown, Update From Camera, Regenerate
//   Thumbnail, Save Scene, Delete Scene.
// - Global controls: Add New Scene From Camera, Export JSON, Save All To
//   Project (Flask GET-merge-POST), Clear All Scenes.
// - Save All / Save Scene use the same Flask POST /api/projects/<code>
//   pattern as all other Dev menu saves (Na__UiFeature__SaveCameraSettings).
// - Thumbnail regeneration renders the Three.js composer to a small WebP
//   via the thumbnail renderer module and POSTs the file to the Flask
//   /api/projects/<code>/presentation-thumbnail/<scene_id> endpoint.
//   On non-localhost the button downloads the WebP (fallback path; this
//   code is only reached on localhost anyway due to the guard).
//
// INTEGRATION:
// - Called from index.html after Na__UiFeature__InitializeLocalhostDevMenu.
// - Requires camera, controls, and showToast references from index.html scope.
// - Scene data state is owned by Na__PresentationMode__ProjectJson__SceneData.
// - Carousel/layout refresh via re-dispatched 'na-presentation-mode-scenes-loaded'.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Helpers
    // @delegate: ./Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetSavedCameraScenes,
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__SetActiveConfig,
        Na__PresentationMode__ProjectJson__GetSortedScenes
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Scene Transition (capture + build)
    // @delegate: ./Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__Camera__CaptureCurrentSceneState,
        Na__PresentationMode__Camera__BuildSceneCameraJson
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // NOTE | Carousel refresh happens via the 'na-presentation-mode-scenes-loaded'
    //        event re-dispatched by Na__PmDev__CommitWorkingScenes — no direct import.
    // @delegate: ./Na__PresentationMode__UI__SceneCarousel.js

    // MODULE IMPORTS | Thumbnail Renderer
    // @delegate: ./Na__PresentationMode__Thumbnail__Renderer.js
    // ------------------------------------------------------------
    import { Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp } from './Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation (FOV slider live preview)
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Slider Ranges and Defaults
    // ------------------------------------------------------------
    const Na__PmDev__FOV_MIN              = 5;     // <-- Minimum FOV degrees
    const Na__PmDev__FOV_MAX              = 90;    // <-- Maximum FOV degrees
    const Na__PmDev__FOV_DEFAULT          = 30;    // <-- Default FOV when not set
    const Na__PmDev__TRANSITION_MIN_MS    = 300;   // <-- Minimum transition duration
    const Na__PmDev__TRANSITION_MAX_MS    = 8000;  // <-- Maximum transition duration
    const Na__PmDev__TRANSITION_DEFAULT   = 1800;  // <-- Default transition duration
    const Na__PmDev__SENSOR_HEIGHT_MM     = 24;    // <-- Full-frame sensor height (matches cameraLens AppConfig)
    const Na__PmDev__EASING_OPTIONS       = ['easeInOutCubic', 'easeInOutQuad', 'linear']; // <-- Available easing names
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Editor Runtime References
    // ------------------------------------------------------------
    let Na__PmDev__Camera        = null;  // <-- Live camera reference from index.html
    let Na__PmDev__Controls      = null;  // <-- Live controls reference
    let Na__PmDev__ShowToast     = null;  // <-- Toast notification helper
    let Na__PmDev__WorkingScenes = [];    // <-- Single shared editable scenes array (rows mutate these objects)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lens Conversion Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert FOV Degrees to Focal Length MM
    // ------------------------------------------------------------
    function Na__PmDev__FovToFocalMm(fovDegrees) {
        const fovRad = (fovDegrees * Math.PI) / 180;
        return Na__PmDev__SENSOR_HEIGHT_MM / (2 * Math.tan(fovRad / 2)); // <-- Inverse tangent formula
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Focal Length MM to FOV Degrees
    // ------------------------------------------------------------
    function Na__PmDev__FocalMmToFov(focalMm) {
        return (2 * Math.atan(Na__PmDev__SENSOR_HEIGHT_MM / (2 * focalMm)) * 180) / Math.PI; // <-- Arctangent formula
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Working Data (in-memory editable copy)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Deep Clone the Active Config's Scenes Array
    // ------------------------------------------------------------
    function Na__PmDev__GetWorkingScenes() {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        if (!config) return [];
        const scenes = config.PresentationMode__SavedCameraScenes__Scenes;
        return Array.isArray(scenes) ? JSON.parse(JSON.stringify(scenes)) : []; // <-- Deep clone so edits don't corrupt live state
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Fresh Default Config Block (first scene added)
    // ------------------------------------------------------------
    function Na__PmDev__BuildDefaultConfig(scenes) {
        return {
            PresentationMode__SavedCameraScenes__Description : 'Optional per-project saved camera scenes for Presentation Mode. Camera position and orbit target values are integer millimetres; rotations and FOV use the same format as Camera__DefaultPosition.',
            PresentationMode__SavedCameraScenes__Enabled                 : true,
            PresentationMode__SavedCameraScenes__ShowCarouselByDefault   : true,
            PresentationMode__SavedCameraScenes__AutoPlayEnabledByDefault: false,
            PresentationMode__SavedCameraScenes__DefaultSceneId          : scenes[0]?.PresentationMode__Scene__Id || null,
            PresentationMode__SavedCameraScenes__Scenes                  : scenes
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Merge Working Scenes Back Into Active Config
    // ------------------------------------------------------------
    // Creates a fresh default config block when the project has no existing
    // PresentationMode section (first scene added via dev menu), then
    // re-dispatches the scenes-loaded event so the carousel, adaptive top-
    // toolbar layout, and Views button all update live without a reload.
    // ------------------------------------------------------------
    function Na__PmDev__CommitWorkingScenes(updatedScenes, projectCode) {
        let config = Na__PresentationMode__ProjectJson__GetActiveConfig();

        if (!config) {
            config = Na__PmDev__BuildDefaultConfig(updatedScenes);          // <-- First scene: create the section from scratch
        }

        config.PresentationMode__SavedCameraScenes__Scenes = updatedScenes;  // <-- Write back in-place

        // KEEP DEFAULT SCENE ID VALID
        const defaultId = config.PresentationMode__SavedCameraScenes__DefaultSceneId;
        const defaultStillExists = updatedScenes.some(s => s.PresentationMode__Scene__Id === defaultId);
        if (!defaultStillExists) {
            config.PresentationMode__SavedCameraScenes__DefaultSceneId = updatedScenes[0]?.PresentationMode__Scene__Id || null;
        }

        Na__PresentationMode__ProjectJson__SetActiveConfig(config, projectCode); // <-- Re-register updated config

        // LIVE UI REFRESH | Re-dispatch the scenes event (or cleared event when empty)
        if (updatedScenes.length > 0) {
            window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-loaded', {
                detail : { sceneConfig: config, projectCode, skipCameraApply: true }  // <-- skipCameraApply: don't jump camera mid-edit
            }));
        } else {
            window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-cleared')); // <-- Restore legacy bottom-toolbar layout
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Row DOM Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the FOV Slider Row for a Scene
    // ------------------------------------------------------------
    function Na__PmDev__BuildFovRow(scene, onChange) {
        const currentFov  = (scene.PresentationMode__Scene__CameraPosition
            && scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc
            && scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc.Camera__DefaultMisc__Fov)
            || Na__PmDev__FOV_DEFAULT;

        const currentMm   = Math.round(Na__PmDev__FovToFocalMm(currentFov));

        const row = document.createElement('div');
        row.className = 'na-pm-dev__slider-row';

        const label = document.createElement('label');
        label.className   = 'na-pm-dev__label';
        label.textContent = 'FOV';

        const slider = document.createElement('input');
        slider.type  = 'range';
        slider.className = 'na-pm-dev__slider';
        slider.min   = Na__PmDev__FOV_MIN;
        slider.max   = Na__PmDev__FOV_MAX;
        slider.step  = '0.1';
        slider.value = currentFov.toFixed(1);

        const valueDisplay = document.createElement('span');
        valueDisplay.className   = 'na-pm-dev__value';
        valueDisplay.textContent = `${currentFov.toFixed(1)}° / ${currentMm}mm`;

        slider.addEventListener('input', () => {
            const fov   = parseFloat(slider.value);
            const lenMm = Math.round(Na__PmDev__FovToFocalMm(fov));
            valueDisplay.textContent = `${fov.toFixed(1)}° / ${lenMm}mm`; // <-- Live readout
            onChange(fov);
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueDisplay);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Transition Time Slider Row
    // ------------------------------------------------------------
    function Na__PmDev__BuildTransitionRow(scene, onChange) {
        const currentMs = Number.isFinite(scene.PresentationMode__Scene__TransitionTimeToNextSceneMs)
            ? scene.PresentationMode__Scene__TransitionTimeToNextSceneMs
            : Na__PmDev__TRANSITION_DEFAULT;

        const row = document.createElement('div');
        row.className = 'na-pm-dev__slider-row';

        const label = document.createElement('label');
        label.className   = 'na-pm-dev__label';
        label.textContent = 'Move Speed';

        const slider = document.createElement('input');
        slider.type  = 'range';
        slider.className = 'na-pm-dev__slider';
        slider.min   = Na__PmDev__TRANSITION_MIN_MS;
        slider.max   = Na__PmDev__TRANSITION_MAX_MS;
        slider.step  = '100';
        slider.value = currentMs;

        const valueDisplay = document.createElement('span');
        valueDisplay.className   = 'na-pm-dev__value';
        valueDisplay.textContent = `${(currentMs / 1000).toFixed(1)}s`;

        slider.addEventListener('input', () => {
            const ms = parseInt(slider.value, 10);
            valueDisplay.textContent = `${(ms / 1000).toFixed(1)}s`;       // <-- Live seconds readout
            onChange(ms);
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueDisplay);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Easing Dropdown Row
    // ------------------------------------------------------------
    function Na__PmDev__BuildEasingRow(scene, onChange) {
        const currentEasing = scene.PresentationMode__Scene__TransitionEasing || 'easeInOutCubic';

        const row = document.createElement('div');
        row.className = 'na-pm-dev__row';

        const label = document.createElement('label');
        label.className   = 'na-pm-dev__label';
        label.textContent = 'Easing';

        const select = document.createElement('select');
        select.className = 'na-pm-dev__select';

        Na__PmDev__EASING_OPTIONS.forEach((opt) => {
            const option  = document.createElement('option');
            option.value  = opt;
            option.text   = opt;
            option.selected = opt === currentEasing;
            select.appendChild(option);
        });

        select.addEventListener('change', () => onChange(select.value));

        row.appendChild(label);
        row.appendChild(select);
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Single Scene Editor Row
    // ------------------------------------------------------------
    function Na__PmDev__BuildSceneRow(scene, allScenes, rowIndex, projectCode, onMutate) {
        const sceneId = scene.PresentationMode__Scene__Id;

        const wrapper = document.createElement('div');
        wrapper.className    = 'na-pm-dev__scene-row';
        wrapper.dataset.sceneId = sceneId;

        // SCENE HEADER
        const header = document.createElement('div');
        header.className = 'na-pm-dev__scene-header';

        const titleEl = document.createElement('strong');
        titleEl.textContent = `#${rowIndex + 1} — ${scene.PresentationMode__Scene__Name || sceneId}`;
        header.appendChild(titleEl);
        wrapper.appendChild(header);

        // NAME INPUT
        const nameRow = document.createElement('div');
        nameRow.className = 'na-pm-dev__row';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name';
        nameLabel.className = 'na-pm-dev__label';
        const nameInput = document.createElement('input');
        nameInput.type      = 'text';
        nameInput.className = 'na-pm-dev__input';
        nameInput.value     = scene.PresentationMode__Scene__Name || '';
        nameInput.addEventListener('input', () => {
            scene.PresentationMode__Scene__Name = nameInput.value;          // <-- Update working copy directly
            titleEl.textContent = `#${rowIndex + 1} — ${nameInput.value || sceneId}`;
        });
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        wrapper.appendChild(nameRow);

        // ORDER INPUT
        const orderRow = document.createElement('div');
        orderRow.className = 'na-pm-dev__row';
        const orderLabel = document.createElement('label');
        orderLabel.textContent = 'Order';
        orderLabel.className = 'na-pm-dev__label';
        const orderInput = document.createElement('input');
        orderInput.type      = 'number';
        orderInput.className = 'na-pm-dev__input na-pm-dev__input--short';
        orderInput.value     = Number.isFinite(scene.PresentationMode__Scene__Order) ? scene.PresentationMode__Scene__Order : rowIndex + 1;
        orderInput.addEventListener('change', () => {
            const v = parseInt(orderInput.value, 10);
            scene.PresentationMode__Scene__Order = Number.isFinite(v) ? v : rowIndex + 1;
        });
        orderRow.appendChild(orderLabel);
        orderRow.appendChild(orderInput);
        wrapper.appendChild(orderRow);

        // FOV SLIDER
        wrapper.appendChild(Na__PmDev__BuildFovRow(scene, (newFov) => {
            if (!scene.PresentationMode__Scene__CameraPosition) {
                scene.PresentationMode__Scene__CameraPosition = {};
            }
            if (!scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc) {
                scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc = {};
            }
            scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc.Camera__DefaultMisc__Fov = newFov;
            scene.PresentationMode__Scene__LensMm = Math.round(Na__PmDev__FovToFocalMm(newFov)); // <-- Keep lens mm in sync
            if (Na__PmDev__Camera) {
                Na__PmDev__Camera.fov = newFov;
                Na__PmDev__Camera.updateProjectionMatrix();                 // <-- Live preview in viewport
                Na__RenderLoop__RequestRender();                            // <-- Redraw frame so FOV change is visible
            }
        }));

        // TRANSITION TIME SLIDER
        wrapper.appendChild(Na__PmDev__BuildTransitionRow(scene, (newMs) => {
            scene.PresentationMode__Scene__TransitionTimeToNextSceneMs = newMs;
        }));

        // EASING DROPDOWN
        wrapper.appendChild(Na__PmDev__BuildEasingRow(scene, (newEasing) => {
            scene.PresentationMode__Scene__TransitionEasing = newEasing;
        }));

        // ACTION BUTTONS ROW
        const actionsRow = document.createElement('div');
        actionsRow.className = 'na-pm-dev__actions';

        // UPDATE FROM CAMERA
        const updateBtn = document.createElement('button');
        updateBtn.type        = 'button';
        updateBtn.className   = 'na-pm-dev__btn';
        updateBtn.textContent = 'Update Camera';
        updateBtn.title       = 'Overwrite this scene with the current camera position/rotation/FOV';
        updateBtn.addEventListener('click', () => {
            if (!Na__PmDev__Camera) return;
            const built = Na__PresentationMode__Camera__BuildSceneCameraJson(Na__PmDev__Camera, Na__PmDev__Controls);
            if (!built) return;
            scene.PresentationMode__Scene__CameraPosition = { ...built.cameraPosition };
            scene.PresentationMode__Scene__OrbitHelperCubePosition = { ...built.orbitHelperCubePosition };
            onMutate('save-one', scene);                                    // <-- Commit + persist immediately
        });
        actionsRow.appendChild(updateBtn);

        // THUMBNAIL
        const thumbBtn = document.createElement('button');
        thumbBtn.type        = 'button';
        thumbBtn.className   = 'na-pm-dev__btn';
        thumbBtn.textContent = 'Regen Thumb';
        thumbBtn.title       = 'Render the current viewport as a WebP thumbnail for this scene';
        thumbBtn.addEventListener('click', async () => {
            await Na__PmDev__RegenerateThumbnail(scene, projectCode);       // <-- Render + upload WebP
            onMutate('save-one', scene);                                    // <-- Persist updated ThumbnailUrl + refresh carousel
        });
        actionsRow.appendChild(thumbBtn);

        // SAVE THIS SCENE
        const saveBtn = document.createElement('button');
        saveBtn.type        = 'button';
        saveBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--primary';
        saveBtn.textContent = 'Save Scene';
        saveBtn.addEventListener('click', () => onMutate('save-one', scene));
        actionsRow.appendChild(saveBtn);

        // DELETE
        const deleteBtn = document.createElement('button');
        deleteBtn.type        = 'button';
        deleteBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => onMutate('delete', scene));
        actionsRow.appendChild(deleteBtn);

        wrapper.appendChild(actionsRow);
        return wrapper;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Thumbnail Regeneration
// -----------------------------------------------------------------------------

    // FUNCTION | Render Viewport WebP and POST to Flask Thumbnail Endpoint
    // ------------------------------------------------------------
    async function Na__PmDev__RegenerateThumbnail(scene, projectCode) {
        const sceneId = scene.PresentationMode__Scene__Id;

        try {
            const blob = await Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp(); // <-- Render Three.js viewport
            if (!blob) {
                Na__PmDev__ShowToast && Na__PmDev__ShowToast('Thumbnail render failed.', true);
                return;
            }

            const formData = new FormData();
            formData.append('thumbnail', blob, `${sceneId}.webp`);

            const url = `${window.location.origin}/api/projects/${projectCode}/presentation-thumbnail/${sceneId}`;
            const response = await fetch(url, { method: 'POST', body: formData });

            if (response.ok) {
                const result = await response.json();
                const relUrl = result.url || `PresentationMode/Thumbnails/${sceneId}.webp`;
                scene.PresentationMode__Scene__ThumbnailUrl = relUrl;       // <-- Update working scene with saved path
                Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Thumbnail saved: ${relUrl}`);
            } else {
                // FALLBACK | Download blob directly if server endpoint unavailable
                const a = document.createElement('a');
                a.href     = URL.createObjectURL(blob);
                a.download = `${sceneId}.webp`;
                a.click();
                URL.revokeObjectURL(a.href);
                Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Thumbnail downloaded — place in PresentationMode/Thumbnails/${sceneId}.webp`);
            }
        } catch (error) {
            console.error('[ValeVision3D] Thumbnail regeneration error:', error);
            Na__PmDev__ShowToast && Na__PmDev__ShowToast('Thumbnail error — see console.', true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Flask Save (GET-Merge-POST)
// -----------------------------------------------------------------------------

    // FUNCTION | Save PresentationMode Block to project.json via Flask
    // ------------------------------------------------------------
    async function Na__PmDev__SaveToFlask(updatedScenes, projectCode) {
        if (!projectCode) {
            Na__PmDev__ShowToast && Na__PmDev__ShowToast('No project loaded.', true);
            return false;
        }

        const fetchUrl = `${window.location.origin}/api/projects/${projectCode}`;

        try {
            const getResponse = await fetch(fetchUrl);                       // <-- Fetch current project.json
            if (!getResponse.ok) {
                Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Project not found: ${projectCode}`, true);
                return false;
            }

            const projectData = await getResponse.json();

            const config = Na__PresentationMode__ProjectJson__GetActiveConfig(); // <-- Current full config block

            // MERGE UPDATED SCENES into the config
            if (config) {
                config.PresentationMode__SavedCameraScenes__Scenes = updatedScenes;
            }

            projectData.PresentationMode__SavedCameraScenes = config || {
                PresentationMode__SavedCameraScenes__Enabled         : true,
                PresentationMode__SavedCameraScenes__ShowCarouselByDefault : true,
                PresentationMode__SavedCameraScenes__AutoPlayEnabledByDefault : false,
                PresentationMode__SavedCameraScenes__DefaultSceneId  : updatedScenes[0]?.PresentationMode__Scene__Id || null,
                PresentationMode__SavedCameraScenes__Scenes          : updatedScenes
            };

            const postResponse = await fetch(fetchUrl, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(projectData, null, 4)               // <-- Preserve indentation for readability
            });

            if (postResponse.ok) {
                Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Presentation scenes saved to ${projectCode}`);
                return true;
            }

            const err = await postResponse.json().catch(() => ({}));
            Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Save failed: ${err.error || 'Unknown error'}`, true);
            return false;

        } catch (error) {
            console.error('[ValeVision3D] Presentation mode save error:', error);
            Na__PmDev__ShowToast && Na__PmDev__ShowToast('Save failed — server unreachable.', true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Editor Panel Render
// -----------------------------------------------------------------------------

    // FUNCTION | Rebuild the Entire Scene Editor Panel
    // ------------------------------------------------------------
    function Na__PmDev__RenderEditorPanel(projectCode) {
        const panel = document.getElementById('naPmDevEditorPanel');
        if (!panel) return;

        panel.innerHTML = '';                                                // <-- Clear and rebuild

        // REFRESH SHARED WORKING ARRAY from current config; rows mutate
        // these exact objects so every save path includes in-row edits.
        Na__PmDev__WorkingScenes = Na__PmDev__GetWorkingScenes();

        if (Na__PmDev__WorkingScenes.length === 0) {
            const empty = document.createElement('p');
            empty.className   = 'na-pm-dev__empty';
            empty.textContent = 'No scenes defined. Add a scene below.';
            panel.appendChild(empty);
        } else {
            // SORT AND RENDER SCENE ROWS (sorted view of the shared array)
            const sorted = [...Na__PmDev__WorkingScenes].sort((a, b) =>
                ((a.PresentationMode__Scene__Order ?? 999) - (b.PresentationMode__Scene__Order ?? 999))
            );

            sorted.forEach((scene, index) => {
                const row = Na__PmDev__BuildSceneRow(scene, sorted, index, projectCode, async (action, targetScene) => {
                    if (action === 'delete') {
                        const ok = await Na__AppUtils__ConfirmDialog__Show({
                            title        : 'Delete Scene?',
                            message      : `Delete scene "${targetScene.PresentationMode__Scene__Name}"?`,
                            confirmLabel : 'Delete',
                            isDestructive: true
                        });
                        if (!ok) return;
                        Na__PmDev__WorkingScenes = Na__PmDev__WorkingScenes.filter(
                            s => s.PresentationMode__Scene__Id !== targetScene.PresentationMode__Scene__Id
                        );
                        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes, projectCode);
                        await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes, projectCode);
                        Na__PmDev__RenderEditorPanel(projectCode);          // <-- Rebuild panel after delete
                    } else if (action === 'save-one') {
                        // targetScene is an object inside the shared array — its edits are already in place
                        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes, projectCode);
                        await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes, projectCode);
                    }
                });
                panel.appendChild(row);
            });
        }

        // GLOBAL ACTION BUTTONS
        const globalActions = document.createElement('div');
        globalActions.className = 'na-pm-dev__global-actions';

        // ADD NEW SCENE
        const addBtn = document.createElement('button');
        addBtn.type        = 'button';
        addBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--primary';
        addBtn.textContent = '+ Add Scene From Camera';
        addBtn.addEventListener('click', () => Na__PmDev__AddSceneFromCamera(projectCode));
        globalActions.appendChild(addBtn);

        // SAVE ALL
        const saveAllBtn = document.createElement('button');
        saveAllBtn.type        = 'button';
        saveAllBtn.className   = 'na-pm-dev__btn';
        saveAllBtn.textContent = 'Save All To Project';
        saveAllBtn.addEventListener('click', async () => {
            Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes, projectCode); // <-- Include all in-row edits + refresh UI
            await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes, projectCode);
        });
        globalActions.appendChild(saveAllBtn);

        // EXPORT JSON
        const exportBtn = document.createElement('button');
        exportBtn.type        = 'button';
        exportBtn.className   = 'na-pm-dev__btn';
        exportBtn.textContent = 'Export JSON';
        exportBtn.addEventListener('click', () => Na__PmDev__ExportJson(projectCode));
        globalActions.appendChild(exportBtn);

        // CLEAR ALL
        const clearBtn = document.createElement('button');
        clearBtn.type        = 'button';
        clearBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--danger';
        clearBtn.textContent = 'Clear All Scenes';
        clearBtn.addEventListener('click', () => Na__PmDev__ClearAllScenes(projectCode));
        globalActions.appendChild(clearBtn);

        panel.appendChild(globalActions);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Mutations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Generate Next Unique Scene Id
    // ------------------------------------------------------------
    function Na__PmDev__GetNextSceneId(existingScenes) {
        const usedIds = new Set(existingScenes.map(s => s.PresentationMode__Scene__Id));
        let n = existingScenes.length + 1;
        let candidate = `Scene_${String(n).padStart(3, '0')}`;
        while (usedIds.has(candidate)) {                                    // <-- Avoid collisions after deletes
            n++;
            candidate = `Scene_${String(n).padStart(3, '0')}`;
        }
        return candidate;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a New Scene From the Current Camera Position
    // ------------------------------------------------------------
    // Builds the scene from the live camera, renders + uploads the WebP
    // thumbnail, commits to the in-memory config (which refreshes the
    // carousel and layout), and auto-saves the project.json via Flask.
    // ------------------------------------------------------------
    async function Na__PmDev__AddSceneFromCamera(projectCode) {
        if (!Na__PmDev__Camera) return;

        const existing   = Na__PmDev__WorkingScenes;                        // <-- Shared array (preserves in-row edits)
        const sceneId    = Na__PmDev__GetNextSceneId(existing);             // <-- Auto Scene_001, Scene_002 ...
        const nextNum    = existing.length + 1;
        const maxOrder   = existing.reduce((max, s) => Math.max(max, s.PresentationMode__Scene__Order ?? 0), 0);

        const built      = Na__PresentationMode__Camera__BuildSceneCameraJson(Na__PmDev__Camera, Na__PmDev__Controls);
        if (!built) return;

        const currentFov = parseFloat(Na__PmDev__Camera.fov.toFixed(4));
        const lensMm     = Math.round(Na__PmDev__FovToFocalMm(currentFov));

        const newScene   = {
            PresentationMode__Scene__Id                    : sceneId,
            PresentationMode__Scene__Name                  : `Scene ${nextNum}`,
            PresentationMode__Scene__Order                 : maxOrder + 1,
            PresentationMode__Scene__ThumbnailUrl          : `PresentationMode/Thumbnails/${sceneId}.webp`,
            PresentationMode__Scene__LensMm                : lensMm,
            PresentationMode__Scene__TransitionTimeToNextSceneMs : Na__PmDev__TRANSITION_DEFAULT,
            PresentationMode__Scene__TransitionEasing      : 'easeInOutCubic',
            PresentationMode__Scene__CameraPosition        : built.cameraPosition,
            PresentationMode__Scene__OrbitHelperCubePosition: built.orbitHelperCubePosition
        };

        // RENDER + UPLOAD THUMBNAIL FIRST so the carousel card has an image
        await Na__PmDev__RegenerateThumbnail(newScene, projectCode);        // <-- Sets ThumbnailUrl on success

        Na__PmDev__WorkingScenes = [...existing, newScene];                 // <-- Append to shared array
        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes, projectCode); // <-- Updates config + live UI refresh

        const saved = await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes, projectCode); // <-- Auto-persist to project.json
        Na__PmDev__RenderEditorPanel(projectCode);                          // <-- Rebuild panel to show new row

        if (saved) {
            Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Scene "${newScene.PresentationMode__Scene__Name}" added and saved to ${projectCode}.`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Export PresentationMode JSON Block as Download
    // ------------------------------------------------------------
    function Na__PmDev__ExportJson(projectCode) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        if (!config) return;

        const jsonStr = JSON.stringify({ PresentationMode__SavedCameraScenes: config }, null, 4);
        const blob    = new Blob([jsonStr], { type: 'application/json' });
        const a       = document.createElement('a');
        a.href        = URL.createObjectURL(blob);
        a.download    = `PresentationMode__SavedCameraScenes__${projectCode || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear All Presentation Scenes with Confirmation
    // ------------------------------------------------------------
    async function Na__PmDev__ClearAllScenes(projectCode) {
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title        : 'Clear All Scenes?',
            message      : 'This will delete all Presentation Mode scenes from this project.',
            confirmLabel : 'Clear All',
            isDestructive: true
        });
        if (!ok) return;

        Na__PmDev__WorkingScenes = [];                                       // <-- Empty the shared array
        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes, projectCode);
        await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes, projectCode);
        Na__PmDev__RenderEditorPanel(projectCode);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Localhost-Only Presentation Mode Scene Editor
    // ------------------------------------------------------------
    function Na__PresentationMode__DevMenu__InitializeSceneEditor(camera, controls, showToast) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Production guard: never shown hosted

        Na__PmDev__Camera    = camera;
        Na__PmDev__Controls  = controls;
        Na__PmDev__ShowToast = showToast;

        const menuItem  = document.getElementById('naPmDevEditorItem');     // <-- Dev menu wrapper li
        const toggleBtn = document.getElementById('naPmDevEditorToggle');   // <-- Open/close button
        const panel     = document.getElementById('naPmDevEditorPanel');    // <-- Content container

        if (!menuItem || !toggleBtn || !panel) return;

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));

            if (!isOpen) {
                const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
                Na__PmDev__RenderEditorPanel(projectCode);                  // <-- Rebuild on each open so data is fresh
            }
        });

        // RE-RENDER WHEN SCENES LOAD (project switch during same session)
        window.addEventListener('na-presentation-mode-scenes-loaded', () => {
            if (panel.classList.contains('is-open')) {
                const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
                Na__PmDev__RenderEditorPanel(projectCode);                  // <-- Refresh if panel already open
            }
        });

        console.log('[ValeVision3D] Presentation Mode Dev Editor initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Dev Menu Scene Editor API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__DevMenu__InitializeSceneEditor
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
