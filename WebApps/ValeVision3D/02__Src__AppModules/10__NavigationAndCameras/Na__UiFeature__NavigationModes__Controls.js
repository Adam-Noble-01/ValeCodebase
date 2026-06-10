// =============================================================================
// VALEVISION3D - NAVIGATION MODES USER CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__NavigationModes__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : NavigationModes User Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : User-facing Tools menu section for switching navigation modes
// CREATED    : 09-Jun-2026
//
// DESCRIPTION:
// - Manages the "Navigation Modes" section in the Tools & Settings menu.
// - The section is hidden by default.  It becomes visible only when more than
//   one navigation mode is enabled for the current model (i.e. Walk or Fly is
//   enabled in project.json in addition to the always-available Orbit).
// - On init, only the buttons for enabled modes are shown.
// - Enforces mutual exclusivity: activating Walk deactivates Fly and vice versa.
// - Tracks and displays the currently active mode (Orbit / Walk / Fly) with a
//   status badge on each button, matching TrueVision3D's tri-state UX.
// - Call Na__UiFeature__RevealNavigationModesSection() from the dev controls
//   onSaved callback so the section visibility updates immediately after a
//   developer saves new mode flags without requiring a page reload.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeNavigationModesControls(options) from index.html
//   after the loading sequence has completed.
// - options: { walkEnabled, flyEnabled, toggleWalk, toggleFly }
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Jun-2026 - Version 1.0.0
// - Initial implementation as part of navigation modes port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__NavModesUi__SectionId       = 'naNavigationModesItem';       // <-- Top-level <li> in Tools menu
    const Na__NavModesUi__ToggleBtnId     = 'naNavigationModesToggle';     // <-- Submenu open/close button
    const Na__NavModesUi__PanelId         = 'naNavigationModesPanel';      // <-- Collapsible submenu panel
    const Na__NavModesUi__OrbitBtnId      = 'naNavModeOrbitBtn';           // <-- Orbit mode button
    const Na__NavModesUi__WalkBtnId       = 'naNavModeWalkBtn';            // <-- Walk mode button
    const Na__NavModesUi__FlyBtnId        = 'naNavModeFlyBtn';             // <-- Fly mode button
    const Na__NavModesUi__OrbitStatusId   = 'naNavModeOrbitStatus';        // <-- Orbit status badge
    const Na__NavModesUi__WalkStatusId    = 'naNavModeWalkStatus';         // <-- Walk status badge
    const Na__NavModesUi__FlyStatusId     = 'naNavModeFlyStatus';          // <-- Fly status badge
    const Na__NavModesUi__WalkItemId      = 'naNavModeWalkItem';           // <-- Walk button <li> container
    const Na__NavModesUi__FlyItemId       = 'naNavModeFlyItem';            // <-- Fly button <li> container
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__NavModesUi__ToggleWalkFn      = null;   // <-- Walk mode toggle callback
    let Na__NavModesUi__ToggleFlyFn       = null;   // <-- Fly mode toggle callback
    let Na__NavModesUi__WalkEnabled       = false;  // <-- Walk mode enabled for this model
    let Na__NavModesUi__FlyEnabled        = false;  // <-- Fly mode enabled for this model
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Status Display
// -----------------------------------------------------------------------------

    // FUNCTION | Update Active Mode Status Badges
    // ------------------------------------------------------------
    // Updates button active classes and status text for all three mode buttons.
    // activeMode: 'orbit' | 'walk' | 'fly'
    // ------------------------------------------------------------
    function Na__NavModesUi__UpdateModeStatus(activeMode) {
        const orbitBtn    = document.getElementById(Na__NavModesUi__OrbitBtnId);
        const walkBtn     = document.getElementById(Na__NavModesUi__WalkBtnId);
        const flyBtn      = document.getElementById(Na__NavModesUi__FlyBtnId);
        const orbitStatus = document.getElementById(Na__NavModesUi__OrbitStatusId);
        const walkStatus  = document.getElementById(Na__NavModesUi__WalkStatusId);
        const flyStatus   = document.getElementById(Na__NavModesUi__FlyStatusId);

        const setActive = (btn, statusEl, isActive) => {
            if (!btn) return;
            btn.classList.toggle('na-navmode__btn--active', isActive);
            if (statusEl) statusEl.textContent = isActive ? 'Active' : 'Off';
        };

        setActive(orbitBtn,  orbitStatus,  activeMode === 'orbit');
        setActive(walkBtn,   walkStatus,   activeMode === 'walk');
        setActive(flyBtn,    flyStatus,    activeMode === 'fly');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Reveal or Hide Navigation Modes Section Based on Enabled Flags
    // ------------------------------------------------------------
    function Na__UiFeature__RevealNavigationModesSection(walkEnabled, flyEnabled) {
        const section  = document.getElementById(Na__NavModesUi__SectionId);
        const walkItem = document.getElementById(Na__NavModesUi__WalkItemId);
        const flyItem  = document.getElementById(Na__NavModesUi__FlyItemId);

        const hasMultiple = walkEnabled || flyEnabled;                       // <-- Show if at least one extra mode enabled
        if (section) section.style.display = hasMultiple ? '' : 'none';     // <-- Toggle section visibility

        if (walkItem) walkItem.style.display = walkEnabled ? '' : 'none';   // <-- Show Walk button only if enabled
        if (flyItem)  flyItem.style.display  = flyEnabled  ? '' : 'none';   // <-- Show Fly button only if enabled

        Na__NavModesUi__WalkEnabled = walkEnabled;
        Na__NavModesUi__FlyEnabled  = flyEnabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Navigation Modes User Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeNavigationModesControls({ walkEnabled, flyEnabled, toggleWalk, toggleFly } = {}) {
        Na__NavModesUi__ToggleWalkFn = toggleWalk;
        Na__NavModesUi__ToggleFlyFn  = toggleFly;

        // REVEAL/HIDE SECTION AND INDIVIDUAL MODE BUTTONS
        Na__UiFeature__RevealNavigationModesSection(walkEnabled, flyEnabled);

        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        const toggleBtn = document.getElementById(Na__NavModesUi__ToggleBtnId);
        const panel     = document.getElementById(Na__NavModesUi__PanelId);

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        }

        // WIRE ORBIT BUTTON (return to orbit from any mode)
        const orbitBtn = document.getElementById(Na__NavModesUi__OrbitBtnId);
        if (orbitBtn) {
            orbitBtn.addEventListener('click', () => {
                if (Na__NavModesUi__ToggleWalkFn) Na__NavModesUi__ToggleWalkFn('return-to-orbit');
                if (Na__NavModesUi__ToggleFlyFn)  Na__NavModesUi__ToggleFlyFn('return-to-orbit');
            });
        }

        // WIRE WALK BUTTON
        const walkBtn = document.getElementById(Na__NavModesUi__WalkBtnId);
        if (walkBtn) {
            walkBtn.addEventListener('click', () => {
                if (Na__NavModesUi__ToggleFlyFn)  Na__NavModesUi__ToggleFlyFn('silent-off');  // <-- Deactivate fly silently if active
                if (Na__NavModesUi__ToggleWalkFn) Na__NavModesUi__ToggleWalkFn();
            });
        }

        // WIRE FLY BUTTON
        const flyBtn = document.getElementById(Na__NavModesUi__FlyBtnId);
        if (flyBtn) {
            flyBtn.addEventListener('click', () => {
                if (Na__NavModesUi__ToggleWalkFn) Na__NavModesUi__ToggleWalkFn('silent-off');  // <-- Deactivate walk silently if active
                if (Na__NavModesUi__ToggleFlyFn)  Na__NavModesUi__ToggleFlyFn();
            });
        }

        // SET INITIAL STATUS DISPLAY
        Na__NavModesUi__UpdateModeStatus('orbit');

        // LISTEN FOR PROJECT DATA LOAD EVENT (async — reveals section once modes are known)
        window.addEventListener('na-navigation-modes-loaded', (event) => {
            const modes = event.detail && event.detail.enabledModes;
            if (!modes) return;
            Na__UiFeature__RevealNavigationModesSection(
                Boolean(modes.Navmode__EnabledModes__Walk),                  // <-- Walk enabled for this model
                Boolean(modes.Navmode__EnabledModes__Fly)                    // <-- Fly enabled for this model
            );
        }, { once: true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Navigation Modes User Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeNavigationModesControls,
        Na__UiFeature__RevealNavigationModesSection,
        Na__NavModesUi__UpdateModeStatus
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
