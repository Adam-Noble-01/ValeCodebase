// =============================================================================
// VALEVISION3D - RENDER ENGINE USER CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__RenderEngine__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : RenderEngine User Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : User-facing Tools menu section for switching render engines
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Manages the "Render Engine" section in the Tools & Settings menu.
// - The section is hidden by default.  It becomes visible only when MaxEngine
//   is configured for the current model in project.json — models on the
//   default PureEngine show no trace of this feature.
// - Contains two buttons (PureEngine / MaxEngine) with tri-state status
//   badges showing which engine is currently active (reuses the navmode
//   button styling for visual consistency).
// - Buttons dispatch the na-render-engine-switch event; the loading sequence
//   owns the actual pipeline rebuild and answers with na-render-engine-changed,
//   which this module listens to for status updates (so dev-menu switches
//   update this UI too).
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeRenderEngineControls() from index.html after
//   the loading sequence has started.
// - Call Na__UiFeature__RevealRenderEngineSection(visible) to show/hide the
//   section (e.g. live after a dev-menu save).
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

    // MODULE IMPORTS | Render Engine State
    // ------------------------------------------------------------
    import {
        Na__RenderEngine__PURE,
        Na__RenderEngine__MAX,
        Na__RenderEngine__GetActiveEngine
    } from './Na__RenderEngine__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__EngineUi__SectionId    = 'naRenderEngineItem';         // <-- Top-level <li> in Tools menu
    const Na__EngineUi__ToggleBtnId  = 'naRenderEngineToggle';       // <-- Submenu open/close button
    const Na__EngineUi__PanelId      = 'naRenderEnginePanel';        // <-- Collapsible submenu panel
    const Na__EngineUi__PureBtnId    = 'naRenderEnginePureBtn';      // <-- PureEngine button
    const Na__EngineUi__MaxBtnId     = 'naRenderEngineMaxBtn';       // <-- MaxEngine button
    const Na__EngineUi__PureStatusId = 'naRenderEnginePureStatus';   // <-- PureEngine status badge
    const Na__EngineUi__MaxStatusId  = 'naRenderEngineMaxStatus';    // <-- MaxEngine status badge
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Status Display
// -----------------------------------------------------------------------------

    // FUNCTION | Update Active Engine Status Badges
    // ------------------------------------------------------------
    function Na__EngineUi__UpdateEngineStatus(activeEngine) {
        const pureBtn    = document.getElementById(Na__EngineUi__PureBtnId);
        const maxBtn     = document.getElementById(Na__EngineUi__MaxBtnId);
        const pureStatus = document.getElementById(Na__EngineUi__PureStatusId);
        const maxStatus  = document.getElementById(Na__EngineUi__MaxStatusId);

        const setActive = (btn, statusEl, isActive) => {
            if (!btn) return;
            btn.classList.toggle('na-navmode__btn--active', isActive);       // <-- Reuses navmode tri-state styling
            if (statusEl) statusEl.textContent = isActive ? 'Active' : 'Off';
        };

        setActive(pureBtn, pureStatus, activeEngine !== Na__RenderEngine__MAX);
        setActive(maxBtn,  maxStatus,  activeEngine === Na__RenderEngine__MAX);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Reveal or Hide the Render Engine Section
    // ------------------------------------------------------------
    // Visible only when MaxEngine is configured for the current model.
    // PureEngine-only models (the default) never see this section.
    // ------------------------------------------------------------
    function Na__UiFeature__RevealRenderEngineSection(visible) {
        const section = document.getElementById(Na__EngineUi__SectionId);
        if (section) section.style.display = visible ? '' : 'none';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Render Engine User Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeRenderEngineControls() {
        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        const toggleBtn = document.getElementById(Na__EngineUi__ToggleBtnId);
        const panel     = document.getElementById(Na__EngineUi__PanelId);

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        }

        // WIRE ENGINE BUTTONS | Dispatch switch requests to the loading sequence
        const pureBtn = document.getElementById(Na__EngineUi__PureBtnId);
        if (pureBtn) {
            pureBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('na-render-engine-switch', {
                    detail: { engine: Na__RenderEngine__PURE }
                }));
            });
        }

        const maxBtn = document.getElementById(Na__EngineUi__MaxBtnId);
        if (maxBtn) {
            maxBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('na-render-engine-switch', {
                    detail: { engine: Na__RenderEngine__MAX }
                }));
            });
        }

        // SET INITIAL STATUS DISPLAY
        Na__EngineUi__UpdateEngineStatus(Na__RenderEngine__GetActiveEngine());

        // LISTEN FOR ENGINE CHANGES (covers dev-menu switches and load-time MaxEngine activation)
        window.addEventListener('na-render-engine-changed', (event) => {
            const engine = event.detail && event.detail.engine;
            Na__EngineUi__UpdateEngineStatus(engine);
        });

        // LISTEN FOR PROJECT DATA LOAD EVENT (async — reveals section + syncs badges once config is known)
        window.addEventListener('na-render-engine-loaded', (event) => {
            const config = event.detail && event.detail.renderEngineConfig;
            if (!config) return;
            const maxConfigured = (config.RenderEngine__Active === Na__RenderEngine__MAX);
            Na__UiFeature__RevealRenderEngineSection(maxConfigured);         // <-- Section visible only when MaxEngine configured
            Na__EngineUi__UpdateEngineStatus(maxConfigured ? Na__RenderEngine__MAX : Na__RenderEngine__PURE);
        }, { once: true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Engine User Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeRenderEngineControls,
        Na__UiFeature__RevealRenderEngineSection
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
