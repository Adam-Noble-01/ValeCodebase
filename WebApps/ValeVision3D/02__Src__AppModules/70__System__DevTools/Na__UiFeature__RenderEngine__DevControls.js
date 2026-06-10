// =============================================================================
// VALEVISION3D - RENDER ENGINE DEV CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__RenderEngine__DevControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : RenderEngine Dev Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dev-menu section for selecting and saving the per-model render engine
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Localhost-only dev menu section.  Lets the developer choose which render
//   engine the current model uses: PureEngine (default) or MaxEngine.
// - Radio-style selection: exactly one engine is selected at a time.
// - Selecting an engine immediately switches the live preview (dispatches
//   na-render-engine-switch) so the developer can see the result before saving.
// - On "Save Render Engine", merges the RenderEngine__Config block into
//   project.json via the same GET-merge-POST pattern used by camera, fog,
//   orbit-max-distance, and navigation mode settings (Flask /api/projects).
// - After saving, calls the provided onSaved callback so the caller can show
//   a toast and update the user-facing Tools menu visibility in real time.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeRenderEngineDevControls(options) after the
//   loading sequence has started (project code available in the URL).
// - options: { onSaved, showToast }
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation as part of the dual render engine port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__IsRunningOnLocalhost
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Engine State
    // ------------------------------------------------------------
    import {
        Na__RenderEngine__PURE,
        Na__RenderEngine__MAX,
        Na__RenderEngine__GetActiveEngine
    } from '../05__RenderPipeline/Na__RenderEngine__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__EngineDevMenu__ItemId      = 'naRenderEngineDevItem';      // <-- Dev menu list item container
    const Na__EngineDevMenu__ToggleId    = 'naRenderEngineDevToggle';    // <-- Submenu open/close button
    const Na__EngineDevMenu__PanelId     = 'naRenderEngineDevPanel';     // <-- Collapsible submenu panel
    const Na__EngineDevMenu__PureRadioId = 'naRenderEngineDevPureRadio'; // <-- PureEngine radio input
    const Na__EngineDevMenu__MaxRadioId  = 'naRenderEngineDevMaxRadio';  // <-- MaxEngine radio input
    const Na__EngineDevMenu__SaveBtnId   = 'naRenderEngineDevSave';      // <-- Save Render Engine button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Logic
// -----------------------------------------------------------------------------

    // FUNCTION | Save Render Engine Selection to project.json
    // ------------------------------------------------------------
    async function Na__EngineDevMenu__SaveToProject(engineName, showToast) {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            if (showToast) showToast('No project loaded — cannot save.', true);
            return;
        }

        try {
            const fetchUrl = `${window.location.origin}/api/projects/${projectCode}`;

            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) throw new Error(`Failed to fetch project: ${projectResponse.status}`);
            const projectData = await projectResponse.json();

            projectData.RenderEngine__Config = {
                "RenderEngine__Active" : engineName                          // <-- 'PureEngine' or 'MaxEngine'
            };

            const saveResponse = await fetch(fetchUrl, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(projectData, null, 4)
            });

            if (!saveResponse.ok) throw new Error(`Failed to save project: ${saveResponse.status}`);

            console.log(`[RenderEngineDevMenu] Render engine saved: ${engineName}`);
            if (showToast) showToast(`Render engine saved: ${engineName}.`);
        } catch (error) {
            console.error('[RenderEngineDevMenu] Save failed:', error);
            if (showToast) showToast('Save failed — see console.', true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Currently Selected Engine from the Radio Inputs
    // ------------------------------------------------------------
    function Na__EngineDevMenu__GetSelectedEngine() {
        const maxRadio = document.getElementById(Na__EngineDevMenu__MaxRadioId);
        return (maxRadio && maxRadio.checked) ? Na__RenderEngine__MAX : Na__RenderEngine__PURE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sync Radio Inputs to an Engine Name
    // ------------------------------------------------------------
    function Na__UiFeature__SyncRenderEngineDevRadios(engineName) {
        const pureRadio = document.getElementById(Na__EngineDevMenu__PureRadioId);
        const maxRadio  = document.getElementById(Na__EngineDevMenu__MaxRadioId);
        if (pureRadio) pureRadio.checked = (engineName !== Na__RenderEngine__MAX);
        if (maxRadio)  maxRadio.checked  = (engineName === Na__RenderEngine__MAX);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Render Engine Dev Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeRenderEngineDevControls({ onSaved, showToast } = {}) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Dev menu only on localhost

        const menuItem  = document.getElementById(Na__EngineDevMenu__ItemId);
        const toggleBtn = document.getElementById(Na__EngineDevMenu__ToggleId);
        const panel     = document.getElementById(Na__EngineDevMenu__PanelId);
        const pureRadio = document.getElementById(Na__EngineDevMenu__PureRadioId);
        const maxRadio  = document.getElementById(Na__EngineDevMenu__MaxRadioId);
        const saveBtn   = document.getElementById(Na__EngineDevMenu__SaveBtnId);

        if (!menuItem || !pureRadio || !maxRadio || !saveBtn) return;        // <-- Guard: DOM not ready

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        // SET INITIAL RADIO STATE FROM ACTIVE ENGINE
        Na__UiFeature__SyncRenderEngineDevRadios(Na__RenderEngine__GetActiveEngine());

        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        }

        // WIRE RADIO INPUTS | Live preview switch on selection
        const Na__EngineDevMenu__OnRadioChange = () => {
            const selectedEngine = Na__EngineDevMenu__GetSelectedEngine();
            window.dispatchEvent(new CustomEvent('na-render-engine-switch', {
                detail: { engine: selectedEngine }                           // <-- Loading sequence rebuilds the pipeline live
            }));
        };
        pureRadio.addEventListener('change', Na__EngineDevMenu__OnRadioChange);
        maxRadio.addEventListener('change', Na__EngineDevMenu__OnRadioChange);

        // WIRE SAVE BUTTON
        saveBtn.addEventListener('click', async () => {
            const selectedEngine = Na__EngineDevMenu__GetSelectedEngine();

            const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                title        : 'Save Render Engine?',
                message      : `This will set ${selectedEngine} as the render engine for this model in project.json.`,
                confirmLabel : 'Save',
                isDestructive: false
            });
            if (!confirmed) return;

            await Na__EngineDevMenu__SaveToProject(selectedEngine, showToast);

            if (onSaved) onSaved({ engine: selectedEngine });                // <-- Notify caller (e.g. update Tools menu visibility)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Engine Dev Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeRenderEngineDevControls,
        Na__UiFeature__SyncRenderEngineDevRadios
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
