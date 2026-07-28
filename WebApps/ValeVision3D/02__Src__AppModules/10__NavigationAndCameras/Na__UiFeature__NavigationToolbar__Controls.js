// =============================================================================
// VALEVISION3D - FLOATING NAVIGATION TOOLBAR CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__NavigationToolbar__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Navigation Toolbar Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Bottom-centre floating navigation toolbar (Orbit / Walk / Fly / Reset / Help)
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Manages the always-visible floating navigation toolbar fixed to the
//   bottom centre of the 3D viewer canvas.
// - Navigation is the PRIMARY way users interact with the model, so these
//   controls live in their own pill toolbar rather than being buried in the
//   right-hand Tools & Settings menu (which stays focused on technical and
//   configuration tools).
// - Button order: Orbit | Walk | Fly | [Views] | Reset View | Help.
// - Views button is hidden until a project with PresentationMode__SavedCameraScenes
//   data loads; wiring is in index.html Engine Entry Points.
// - Orbit is always available; Walk and Fly buttons reveal only when enabled
//   for the current model (project.json Navmode__EnabledModes), matching the
//   gating previously used by the retired Tools-menu Navigation Mode section.
// - Enforces Walk/Fly mutual exclusivity via the same toggle wrappers the
//   old menu used ('silent-off' / 'return-to-orbit' hints).
// - Na__NavToolbar__SetActiveMode is the single UI entry point for active
//   mode highlighting — hotkeys and any other mode-changing code path call
//   it, so the toolbar always reflects the true mode. It also dispatches the
//   'na-navigation-mode-changed' CustomEvent for other interested modules.
// - Reset View exits Walk/Fly (return-to-orbit) then restores the canonical
//   project.json start state via Na__Camera__ProjectStartState.js.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeNavigationToolbar(options) from index.html.
// - options: { walkEnabled, flyEnabled, toggleWalk, toggleFly, openHelp }
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation. Supersedes the Tools-menu "Navigation Mode"
//   section from Na__UiFeature__NavigationModes__Controls.js (retired).
//
// 28-Jul-2026 - Version 1.1.0
// - Idle fade: toolbar idles at 50% opacity with no shadow, exactly like
//   the Tools & Settings menu — pure CSS hover/focus response (0.3s), no
//   JS timer lag in either direction. The only JS is FlashWake(): a 1s
//   opaque flash on mode changes so hotkey switches (which CSS hover
//   cannot see) still show the moved highlight. Boot never flashes
//   (WakeEnabled latch set after the initial SetActiveMode call).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Camera Project Start State (Reset View)
    // ------------------------------------------------------------
    import { Na__CameraStartState__ResetView } from './Na__Camera__ProjectStartState.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__NavToolbar__OrbitBtnId   = 'naNavToolbarOrbitBtn';    // <-- Orbit mode button
    const Na__NavToolbar__WalkBtnId    = 'naNavToolbarWalkBtn';     // <-- Walk mode button
    const Na__NavToolbar__FlyBtnId     = 'naNavToolbarFlyBtn';      // <-- Fly mode button
    const Na__NavToolbar__ResetBtnId   = 'naNavToolbarResetBtn';    // <-- Reset view button
    const Na__NavToolbar__HelpBtnId    = 'naNavToolbarHelpBtn';     // <-- Help panel button
    // ------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Events
    // ------------------------------------------------------------
    const Na__NavToolbar__ContainerId   = 'naNavToolbar';                     // <-- Toolbar pill container
    const Na__NavToolbar__ActiveClass   = 'na-nav-toolbar__btn--active';      // <-- Pale blue active highlight
    const Na__NavToolbar__WakeClass     = 'na-nav-toolbar--wake';             // <-- Short-lived opaque flash (hotkey mode changes)
    const NA__NAV_MODE_CHANGED_EVENT    = 'na-navigation-mode-changed';       // <-- Dispatched on every mode change
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Wake Flash Tuning
    // ------------------------------------------------------------
    const Na__NavToolbar__WakeFlashMs = 1000;                                 // <-- How long a hotkey wake stays opaque before fading back
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__NavToolbar__ToggleWalkFn    = null;     // <-- Walk mode toggle wrapper (mutual exclusivity hints)
    let Na__NavToolbar__ToggleFlyFn     = null;     // <-- Fly mode toggle wrapper (mutual exclusivity hints)
    let Na__NavToolbar__OpenHelpFn      = null;     // <-- Help panel open callback
    let Na__NavToolbar__ActiveMode      = 'orbit';  // <-- Currently active mode ('orbit' | 'walk' | 'fly')
    let Na__NavToolbar__WakeTimerHandle = null;     // <-- Pending wake-flash timeout (or null)
    let Na__NavToolbar__WakeEnabled     = false;    // <-- False during boot so init does not flash the toolbar
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hotkey Wake Flash
// -----------------------------------------------------------------------------

    // FUNCTION | Briefly Wake the Toolbar so a Mode Change is Visible
    // ------------------------------------------------------------
    // Pointer hover and keyboard focus are handled purely by CSS (instant,
    // matching the other menus). This flash exists only for hotkey-driven
    // mode changes, which CSS cannot see: it holds the toolbar opaque for
    // a moment so the moved highlight registers, then lets it fade back.
    // ------------------------------------------------------------
    function Na__NavToolbar__FlashWake() {
        if (!Na__NavToolbar__WakeEnabled) return;                            // <-- Stay faded during boot

        const toolbar = document.getElementById(Na__NavToolbar__ContainerId);
        if (!toolbar) return;

        toolbar.classList.add(Na__NavToolbar__WakeClass);                    // <-- Opaque + shadow via CSS

        if (Na__NavToolbar__WakeTimerHandle !== null) {
            clearTimeout(Na__NavToolbar__WakeTimerHandle);                   // <-- Restart any pending flash
        }

        Na__NavToolbar__WakeTimerHandle = setTimeout(() => {
            Na__NavToolbar__WakeTimerHandle = null;
            toolbar.classList.remove(Na__NavToolbar__WakeClass);             // <-- Fade back to idle (0.3s CSS)
        }, Na__NavToolbar__WakeFlashMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Mode Display
// -----------------------------------------------------------------------------

    // FUNCTION | Update Active Mode Highlight on the Toolbar
    // ------------------------------------------------------------
    // Single UI entry point for mode highlighting. Call from every code
    // path that changes the navigation mode (buttons, hotkeys, etc.).
    // activeMode: 'orbit' | 'walk' | 'fly'
    // ------------------------------------------------------------
    function Na__NavToolbar__SetActiveMode(activeMode) {
        Na__NavToolbar__ActiveMode = activeMode;

        const setActive = (btnId, isActive) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.classList.toggle(Na__NavToolbar__ActiveClass, isActive);     // <-- Pale blue highlight on active mode
            btn.setAttribute('aria-pressed', String(isActive));
        };

        setActive(Na__NavToolbar__OrbitBtnId, activeMode === 'orbit');
        setActive(Na__NavToolbar__WalkBtnId,  activeMode === 'walk');
        setActive(Na__NavToolbar__FlyBtnId,   activeMode === 'fly');

        Na__NavToolbar__FlashWake();                                         // <-- Brief wake so hotkey mode changes are visible

        window.dispatchEvent(new CustomEvent(NA__NAV_MODE_CHANGED_EVENT, {
            detail: { mode: activeMode }                                     // <-- Notify other modules of the mode change
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Currently Active Navigation Mode
    // ------------------------------------------------------------
    function Na__NavToolbar__GetActiveMode() {
        return Na__NavToolbar__ActiveMode;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Walk and Fly Button Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Reveal or Hide Walk and Fly Buttons Based on Enabled Flags
    // ------------------------------------------------------------
    function Na__UiFeature__RevealNavigationToolbarModes(walkEnabled, flyEnabled) {
        const walkBtn = document.getElementById(Na__NavToolbar__WalkBtnId);
        const flyBtn  = document.getElementById(Na__NavToolbar__FlyBtnId);

        if (walkBtn) walkBtn.style.display = walkEnabled ? '' : 'none';      // <-- Show Walk button only if enabled
        if (flyBtn)  flyBtn.style.display  = flyEnabled  ? '' : 'none';      // <-- Show Fly button only if enabled
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Button Click Handlers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Return to Orbit Mode from Any Active Mode
    // ------------------------------------------------------------
    function Na__NavToolbar__HandleOrbitClick() {
        if (Na__NavToolbar__ToggleWalkFn) Na__NavToolbar__ToggleWalkFn('return-to-orbit');  // <-- Exit walk if active
        if (Na__NavToolbar__ToggleFlyFn)  Na__NavToolbar__ToggleFlyFn('return-to-orbit');   // <-- Exit fly if active
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle Walk Mode (Deactivates Fly First)
    // ------------------------------------------------------------
    function Na__NavToolbar__HandleWalkClick() {
        if (Na__NavToolbar__ToggleFlyFn)  Na__NavToolbar__ToggleFlyFn('silent-off');        // <-- Deactivate fly silently if active
        if (Na__NavToolbar__ToggleWalkFn) Na__NavToolbar__ToggleWalkFn();                   // <-- Standard toggle with UI callbacks
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle Fly Mode (Deactivates Walk First)
    // ------------------------------------------------------------
    function Na__NavToolbar__HandleFlyClick() {
        if (Na__NavToolbar__ToggleWalkFn) Na__NavToolbar__ToggleWalkFn('silent-off');       // <-- Deactivate walk silently if active
        if (Na__NavToolbar__ToggleFlyFn)  Na__NavToolbar__ToggleFlyFn();                    // <-- Standard toggle with UI callbacks
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reset View to the Project Start State
    // ------------------------------------------------------------
    // Exits Walk/Fly back to orbit first (safe mode conversion), then
    // restores the canonical camera state loaded from the project JSON.
    // ------------------------------------------------------------
    function Na__NavToolbar__HandleResetClick() {
        Na__NavToolbar__HandleOrbitClick();                                  // <-- Safely return to orbit before restoring state
        Na__CameraStartState__ResetView();                                   // <-- Restore project.json start position/target/FOV
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Open the Navigation Help Panel
    // ------------------------------------------------------------
    function Na__NavToolbar__HandleHelpClick() {
        if (Na__NavToolbar__OpenHelpFn) Na__NavToolbar__OpenHelpFn();        // <-- Delegate to the help panel module
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Floating Navigation Toolbar
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeNavigationToolbar({ walkEnabled, flyEnabled, toggleWalk, toggleFly, openHelp } = {}) {
        Na__NavToolbar__ToggleWalkFn = toggleWalk;
        Na__NavToolbar__ToggleFlyFn  = toggleFly;
        Na__NavToolbar__OpenHelpFn   = openHelp;

        // REVEAL/HIDE WALK AND FLY BUTTONS
        Na__UiFeature__RevealNavigationToolbarModes(walkEnabled, flyEnabled);

        // WIRE TOOLBAR BUTTONS
        const wireButton = (btnId, handler) => {
            const btn = document.getElementById(btnId);
            if (btn) btn.addEventListener('click', handler);
        };

        wireButton(Na__NavToolbar__OrbitBtnId, Na__NavToolbar__HandleOrbitClick);
        wireButton(Na__NavToolbar__WalkBtnId,  Na__NavToolbar__HandleWalkClick);
        wireButton(Na__NavToolbar__FlyBtnId,   Na__NavToolbar__HandleFlyClick);
        wireButton(Na__NavToolbar__ResetBtnId, Na__NavToolbar__HandleResetClick);
        wireButton(Na__NavToolbar__HelpBtnId,  Na__NavToolbar__HandleHelpClick);

        // SET INITIAL ACTIVE STATE (Orbit is the default mode on load)
        // Pointer hover / keyboard focus wake is pure CSS — no listeners needed.
        // WakeEnabled stays false until after this call so boot never flashes.
        Na__NavToolbar__SetActiveMode('orbit');
        Na__NavToolbar__WakeEnabled = true;                                  // <-- Hotkey wake flashes allowed from here on

        // LISTEN FOR PROJECT DATA LOAD EVENT (async — reveals Walk/Fly once modes are known)
        window.addEventListener('na-navigation-modes-loaded', (event) => {
            const modes = event.detail && event.detail.enabledModes;
            if (!modes) return;
            Na__UiFeature__RevealNavigationToolbarModes(
                Boolean(modes.Navmode__EnabledModes__Walk),                  // <-- Walk enabled for this model
                Boolean(modes.Navmode__EnabledModes__Fly)                    // <-- Fly enabled for this model
            );
        }, { once: true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Hotkey API
// -----------------------------------------------------------------------------

    // FUNCTION | Set Orbit Mode (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__NavToolbar__SetOrbitMode() { Na__NavToolbar__HandleOrbitClick(); }
    // ------------------------------------------------------------

    // FUNCTION | Set Walk Mode (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__NavToolbar__SetWalkMode()  { Na__NavToolbar__HandleWalkClick();  }
    // ------------------------------------------------------------

    // FUNCTION | Set Fly Mode (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__NavToolbar__SetFlyMode()   { Na__NavToolbar__HandleFlyClick();   }
    // ------------------------------------------------------------

    // FUNCTION | Reset View (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__NavToolbar__ResetView()    { Na__NavToolbar__HandleResetClick(); }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Navigation Toolbar API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeNavigationToolbar,
        Na__UiFeature__RevealNavigationToolbarModes,
        Na__NavToolbar__SetActiveMode,
        Na__NavToolbar__GetActiveMode,
        Na__NavToolbar__SetOrbitMode,
        Na__NavToolbar__SetWalkMode,
        Na__NavToolbar__SetFlyMode,
        Na__NavToolbar__ResetView,
        NA__NAV_MODE_CHANGED_EVENT
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
