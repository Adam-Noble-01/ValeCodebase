// =============================================================================
// VALEVISION3D - CROSS SECTION VIEW DEV CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__CrossSectionView__DevControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Cross Section View - Dev Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dev-menu section for enabling and saving the per-project cross section tool
// CREATED    : 14-Jul-2026
//
// DESCRIPTION:
// - Localhost-only dev menu section (mirrors the Render Engine dev controls).
// - "Enable For This Project" checkbox toggles the feature LIVE so the
//   developer can preview the Tools menu section and section cuts before
//   committing anything.
// - "Save Cross Section Config" merges the CrossSection__Config block into
//   project.json via the R2-first two-phase save (Worker SSOT, then Flask
//   mirror). The saved block captures the enabled flag plus the current
//   Advanced style values so projects load with the chosen appearance.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeCrossSectionDevControls(options) from
//   index.html after the UI controls are initialised.
// - options: { showToast }
// - The dev checkbox is synced from project.json by the index.html listener
//   for 'na-crosssection-config-loaded'.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Jul-2026 - Version 1.0.0
// - Initial implementation as part of the cross section tool.
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

    // MODULE IMPORTS | Cross Section System Logic
    // ------------------------------------------------------------
    import {
        Na__CrossSection__SetFeatureEnabled,
        Na__CrossSection__IsFeatureEnabled,
        Na__CrossSection__GetAppearance
    } from './Na__CrossSectionView__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__SectDevMenu__ItemId      = 'naCrossSectionDevItem';        // <-- Dev menu list item container
    const Na__SectDevMenu__ToggleId    = 'naCrossSectionDevToggle';      // <-- Submenu open/close button
    const Na__SectDevMenu__PanelId     = 'naCrossSectionDevPanel';       // <-- Collapsible submenu panel
    const Na__SectDevMenu__EnableId    = 'naCrossSectionDevEnableCheck'; // <-- Enable-for-project checkbox
    const Na__SectDevMenu__SaveBtnId   = 'naCrossSectionDevSave';        // <-- Save Cross Section Config button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Logic
// -----------------------------------------------------------------------------

    // FUNCTION | Save Cross Section Config to project.json — R2-First
    // ------------------------------------------------------------
    async function Na__SectDevMenu__SaveToProject(showToast) {
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

            // MERGE CROSS SECTION CONFIG | Enabled flag + current Advanced style
            const enabled    = Na__CrossSection__IsFeatureEnabled();
            const appearance = Na__CrossSection__GetAppearance();
            projectData.CrossSection__Config = {
                "CrossSection__Enabled"     : enabled,
                "CrossSection__FillColor"   : appearance.fillColor,
                "CrossSection__LineColor"   : appearance.lineColor,
                "CrossSection__LineWidthPx" : appearance.lineWidthPx
            };

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast);

            console.log(`[CrossSectionDevMenu] Cross section config saved (enabled: ${enabled})`);
            if (showToast) showToast(`Cross section tool ${enabled ? 'enabled' : 'disabled'} for this project.`);
        } catch (error) {
            console.error('[CrossSectionDevMenu] Save failed:', error);
            if (showToast) showToast(`Save failed — ${error.message}`, true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Sync the Dev Checkbox to an Enabled State
    // ------------------------------------------------------------
    function Na__UiFeature__SyncCrossSectionDevCheckbox(enabled) {
        const enableCheck = document.getElementById(Na__SectDevMenu__EnableId);
        if (enableCheck) enableCheck.checked = (enabled === true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Cross Section Dev Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeCrossSectionDevControls({ showToast } = {}) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Dev menu only on localhost

        const menuItem    = document.getElementById(Na__SectDevMenu__ItemId);
        const toggleBtn   = document.getElementById(Na__SectDevMenu__ToggleId);
        const panel       = document.getElementById(Na__SectDevMenu__PanelId);
        const enableCheck = document.getElementById(Na__SectDevMenu__EnableId);
        const saveBtn     = document.getElementById(Na__SectDevMenu__SaveBtnId);

        if (!menuItem || !enableCheck || !saveBtn) return;                   // <-- Guard: DOM not ready

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        // SET INITIAL CHECKBOX STATE
        enableCheck.checked = Na__CrossSection__IsFeatureEnabled();

        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        }

        // WIRE ENABLE CHECKBOX | Live preview toggle (no save)
        enableCheck.addEventListener('change', () => {
            Na__CrossSection__SetFeatureEnabled(enableCheck.checked);        // <-- State event reveals/hides the Tools section
        });

        // WIRE SAVE BUTTON
        saveBtn.addEventListener('click', async () => {
            const enabled = Na__CrossSection__IsFeatureEnabled();

            const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                title        : 'Save Cross Section Config?',
                message      : `This will ${enabled ? 'ENABLE' : 'DISABLE'} the cross section tool for this model in project.json (including the current section style).`,
                confirmLabel : 'Save',
                isDestructive: false
            });
            if (!confirmed) return;

            await Na__SectDevMenu__SaveToProject(showToast);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Cross Section Dev Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeCrossSectionDevControls,
        Na__UiFeature__SyncCrossSectionDevCheckbox
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
