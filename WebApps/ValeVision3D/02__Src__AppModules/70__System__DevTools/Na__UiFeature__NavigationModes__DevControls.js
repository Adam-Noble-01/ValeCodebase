// =============================================================================
// VALEVISION3D - NAVIGATION MODES DEV CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__NavigationModes__DevControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : NavigationModes Dev Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dev-menu section for toggling and saving per-model navigation modes
// CREATED    : 09-Jun-2026
//
// DESCRIPTION:
// - Localhost-only dev menu section.  Allows the developer to enable or disable
//   Walk and Fly navigation modes for the current model.
// - On "Save Navigation Modes", merges the new Navmode__EnabledModes block into
//   project.json via the R2-first two-phase save: R2 SSOT (Worker) first, then
//   local disk mirror (Flask).
// - Orbit mode is always enabled (displayed read-only) — only Walk and Fly are
//   configurable toggles.
// - After saving, calls the provided onSaved callback so the caller can show a
//   toast and update the user-facing Tools menu visibility in real time.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeNavigationModesDevControls(options) after the
//   loading sequence has run (so the project code is available in the URL).
// - options: { isWalkEnabled, isFlyEnabled, onSaved, showToast }
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Jun-2026 - Version 1.0.0
// - Initial implementation as part of navigation modes port.
//
// 26-Jun-2026 - Version 1.1.0
// - Replaced GET-merge-POST-to-Flask with R2-first two-phase save via
//   Na__AppUtils__R2SaveProjectJson (R2 SSOT write, then Flask mirror).
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

    // MODULE IMPORTS | R2-First Save Utility
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__NavModesDevMenu__ItemId        = 'naNavModesDevItem';        // <-- Dev menu list item container
    const Na__NavModesDevMenu__ToggleId      = 'naNavModesDevToggle';      // <-- Submenu open/close button
    const Na__NavModesDevMenu__PanelId       = 'naNavModesDevPanel';       // <-- Collapsible submenu panel
    const Na__NavModesDevMenu__WalkCheckId   = 'naNavModesDevWalkCheck';   // <-- Walk mode checkbox
    const Na__NavModesDevMenu__FlyCheckId    = 'naNavModesDevFlyCheck';    // <-- Fly mode checkbox
    const Na__NavModesDevMenu__SaveBtnId     = 'naNavModesDevSave';        // <-- Save Navigation Modes button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Logic
// -----------------------------------------------------------------------------

    // FUNCTION | Save Navigation Mode Flags to project.json (R2-First)
    // ------------------------------------------------------------
    async function Na__NavModesDevMenu__SaveToProject(walkEnabled, flyEnabled, showToast) {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            if (showToast) showToast('No project loaded — cannot save.', true);
            return;
        }

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) throw new Error(`Failed to fetch project: ${projectResponse.status}`);
            const projectData = await projectResponse.json();

            // MERGE NAVIGATION MODE FLAGS
            projectData.Navmode__EnabledModes = {
                "Navmode__EnabledModes__Walk" : walkEnabled,                 // <-- Walk mode enabled for this model
                "Navmode__EnabledModes__Fly"  : flyEnabled                   // <-- Fly mode enabled for this model
            };

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast);

            console.log(`[NavModesDevMenu] Navigation modes saved — Walk: ${walkEnabled}, Fly: ${flyEnabled}`);
            if (showToast) showToast('Navigation modes saved.');
        } catch (error) {
            console.error('[NavModesDevMenu] Save failed:', error);
            if (showToast) showToast(`Save failed — ${error.message}`, true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Navigation Modes Dev Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeNavigationModesDevControls({ isWalkEnabled, isFlyEnabled, onSaved, showToast } = {}) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Dev menu only on localhost

        const menuItem  = document.getElementById(Na__NavModesDevMenu__ItemId);
        const toggleBtn = document.getElementById(Na__NavModesDevMenu__ToggleId);
        const panel     = document.getElementById(Na__NavModesDevMenu__PanelId);
        const walkCheck = document.getElementById(Na__NavModesDevMenu__WalkCheckId);
        const flyCheck  = document.getElementById(Na__NavModesDevMenu__FlyCheckId);
        const saveBtn   = document.getElementById(Na__NavModesDevMenu__SaveBtnId);

        if (!menuItem || !walkCheck || !flyCheck || !saveBtn) return;        // <-- Guard: DOM not ready

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        // SET INITIAL CHECKBOX STATE FROM PROJECT DATA
        walkCheck.checked = Boolean(isWalkEnabled);                          // <-- Reflect current project setting
        flyCheck.checked  = Boolean(isFlyEnabled);                           // <-- Reflect current project setting

        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        }

        // WIRE SAVE BUTTON
        saveBtn.addEventListener('click', async () => {
            const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                title        : 'Save Navigation Modes?',
                message      : 'This will update project.json with the selected navigation mode settings.',
                confirmLabel : 'Save',
                isDestructive: false
            });
            if (!confirmed) return;

            const walkEnabled = walkCheck.checked;
            const flyEnabled  = flyCheck.checked;

            await Na__NavModesDevMenu__SaveToProject(walkEnabled, flyEnabled, showToast);

            if (onSaved) onSaved({ walkEnabled, flyEnabled });               // <-- Notify caller (e.g. update Tools menu)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Navigation Modes Dev Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeNavigationModesDevControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
