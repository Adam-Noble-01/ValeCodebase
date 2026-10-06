// =============================================================================
// VALEVISION3D - NAVIGATION MODES ENABLED STATE
// =============================================================================
//
// FILE       : Na__NavigationModes__State.js
// NAMESPACE  : Na__NavigationModes
// MODULE     : Navigation Modes State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shared accessor for per-model navigation mode enable flags
// CREATED    : 09-Jun-2026
//
// DESCRIPTION:
// - Single source of truth for which navigation modes are enabled for the
//   current model session.
// - Orbit is always available and is never stored here (it is the default).
// - Walk and Fly flags default to TRUE.  A mode is only lost when project.json
//   stores an explicit false against it (Navmode__EnabledModes key), which the
//   dev menu writes when a mode is unticked and saved.  An absent key, an
//   absent block, or a session with no ?project= code all resolve to enabled.
// - Consumed by the Navigation Modes user-facing UI (to decide visibility)
//   and by the hotkey registration (to gate Walk/Fly hotkeys).
//
// INTEGRATION:
// - Call Na__NavigationModes__SetEnabledModes() from the loading sequence
//   after project.json is read.
// - Read Na__NavigationModes__IsWalkEnabled() and Na__NavigationModes__IsFlyEnabled()
//   from any module that needs to react to the enabled flags.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Jun-2026 - Version 1.0.0
// - Initial implementation as part of navigation modes port.
//
// 21-Aug-2026 - Version 1.1.0
// - Walk and Fly inverted from opt-in to opt-out: both now default to enabled
//   and are only switched off by an explicit false in project.json.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Enabled Navigation Mode Flags
    // ------------------------------------------------------------
    let Na__NavigationModes__WalkEnabled  = true;    // <-- Walk mode available for this model (default ON)
    let Na__NavigationModes__FlyEnabled   = true;    // <-- Fly mode available for this model (default ON)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Setters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve a Single Mode Flag (Opt-Out Semantics)
    // ------------------------------------------------------------
    // Only an explicit false disables a mode.  Undefined, null, a missing key
    // and any legacy string form all resolve to enabled, so older project.json
    // files that predate this key keep every mode.
    // ------------------------------------------------------------
    function Na__NavigationModes__ResolveModeFlag(flagValue) {
        if (flagValue === false || flagValue === 'false') return false;      // <-- Explicitly switched off for this model
        return true;                                                         // <-- Absent or truthy ==> enabled
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Enabled Modes from Project Data
    // ------------------------------------------------------------
    function Na__NavigationModes__SetEnabledModes(enabledModesConfig) {
        const config = enabledModesConfig || {};                             // <-- No block in project.json ==> defaults stand

        Na__NavigationModes__WalkEnabled = Na__NavigationModes__ResolveModeFlag(config.Navmode__EnabledModes__Walk);
        Na__NavigationModes__FlyEnabled  = Na__NavigationModes__ResolveModeFlag(config.Navmode__EnabledModes__Fly);

        console.log(`[NavigationModes] Enabled modes resolved — Walk: ${Na__NavigationModes__WalkEnabled}, Fly: ${Na__NavigationModes__FlyEnabled}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Back the Resolved Flags as a project.json-Shaped Block
    // ------------------------------------------------------------
    // Used by the loading sequence so every listener on the
    // 'na-navigation-modes-loaded' event receives fully resolved booleans
    // rather than the raw (possibly partial) project.json block.
    // ------------------------------------------------------------
    function Na__NavigationModes__GetEnabledModes() {
        return {
            "Navmode__EnabledModes__Walk" : Na__NavigationModes__WalkEnabled, // <-- Resolved Walk flag
            "Navmode__EnabledModes__Fly"  : Na__NavigationModes__FlyEnabled   // <-- Resolved Fly flag
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Getters
// -----------------------------------------------------------------------------

    // FUNCTION | Is Walk Mode Enabled for This Model?
    // ------------------------------------------------------------
    function Na__NavigationModes__IsWalkEnabled() {
        return Na__NavigationModes__WalkEnabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Fly Mode Enabled for This Model?
    // ------------------------------------------------------------
    function Na__NavigationModes__IsFlyEnabled() {
        return Na__NavigationModes__FlyEnabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is More Than One Mode Available? (Used to Gate Tools Menu Visibility)
    // ------------------------------------------------------------
    function Na__NavigationModes__HasMultipleModes() {
        return Na__NavigationModes__WalkEnabled || Na__NavigationModes__FlyEnabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Navigation Modes State API
    // ------------------------------------------------------------
    export {
        Na__NavigationModes__SetEnabledModes,
        Na__NavigationModes__GetEnabledModes,
        Na__NavigationModes__IsWalkEnabled,
        Na__NavigationModes__IsFlyEnabled,
        Na__NavigationModes__HasMultipleModes
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
