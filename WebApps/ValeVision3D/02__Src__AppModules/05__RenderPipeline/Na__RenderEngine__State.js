// =============================================================================
// VALEVISION3D - RENDER ENGINE STATE
// =============================================================================
//
// FILE       : Na__RenderEngine__State.js
// NAMESPACE  : Na__RenderEngine
// MODULE     : Render Engine State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shared accessor for the per-model render engine selection
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Single source of truth for which render engine is configured and which is
//   currently active for the session.
// - Two distinct concepts:
//     CONFIGURED engine — the engine saved in project.json
//       (RenderEngine__Config.RenderEngine__Active). When this is 'MaxEngine'
//       the user-facing Tools menu section becomes visible and MaxEngine
//       activates by default on load.
//     ACTIVE engine — the engine currently driving the composer. The user can
//       switch live between PureEngine and MaxEngine when MaxEngine is
//       configured for the model.
// - PureEngine is ALWAYS the default. Models without a RenderEngine__Config
//   key behave exactly as before this feature existed.
// - This module holds state only — the actual composer rebuild lives in the
//   loading sequence (listens for the na-render-engine-switch event).
//
// INTEGRATION:
// - Loading sequence calls Na__RenderEngine__SetConfiguredEngine() after
//   reading project.json.
// - UI modules dispatch 'na-render-engine-switch' with detail { engine } and
//   read the getters for status display.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation as part of the dual render engine port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Engine Name Identifiers
    // ------------------------------------------------------------
    const Na__RenderEngine__PURE = 'PureEngine';   // <-- Default lightweight whitecard pipeline
    const Na__RenderEngine__MAX  = 'MaxEngine';    // <-- Full PBR + SSAO pipeline (per-model opt-in)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Engine Selection State
    // ------------------------------------------------------------
    let Na__RenderEngine__ConfiguredEngine = Na__RenderEngine__PURE;   // <-- Engine saved in project.json (drives menu visibility)
    let Na__RenderEngine__ActiveEngine     = Na__RenderEngine__PURE;   // <-- Engine currently driving the composer
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Setters
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Configured Engine from Project Data
    // ------------------------------------------------------------
    function Na__RenderEngine__SetConfiguredEngine(engineName) {
        Na__RenderEngine__ConfiguredEngine = (engineName === Na__RenderEngine__MAX)
            ? Na__RenderEngine__MAX
            : Na__RenderEngine__PURE;                                  // <-- Anything else resolves to the safe default

        console.log(`[RenderEngine] Configured engine for this model: ${Na__RenderEngine__ConfiguredEngine}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Record the Currently Active Engine
    // ------------------------------------------------------------
    // Called by the loading sequence after a composer (re)build completes.
    // ------------------------------------------------------------
    function Na__RenderEngine__SetActiveEngine(engineName) {
        Na__RenderEngine__ActiveEngine = (engineName === Na__RenderEngine__MAX)
            ? Na__RenderEngine__MAX
            : Na__RenderEngine__PURE;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Getters
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Configured Engine for This Model
    // ------------------------------------------------------------
    function Na__RenderEngine__GetConfiguredEngine() {
        return Na__RenderEngine__ConfiguredEngine;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Currently Active Engine
    // ------------------------------------------------------------
    function Na__RenderEngine__GetActiveEngine() {
        return Na__RenderEngine__ActiveEngine;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is MaxEngine Available for This Model? (Gates Tools Menu Visibility)
    // ------------------------------------------------------------
    function Na__RenderEngine__IsMaxEngineEnabled() {
        return Na__RenderEngine__ConfiguredEngine === Na__RenderEngine__MAX;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is MaxEngine Currently Active?
    // ------------------------------------------------------------
    function Na__RenderEngine__IsMaxEngineActive() {
        return Na__RenderEngine__ActiveEngine === Na__RenderEngine__MAX;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Engine State API
    // ------------------------------------------------------------
    export {
        Na__RenderEngine__PURE,
        Na__RenderEngine__MAX,
        Na__RenderEngine__SetConfiguredEngine,
        Na__RenderEngine__SetActiveEngine,
        Na__RenderEngine__GetConfiguredEngine,
        Na__RenderEngine__GetActiveEngine,
        Na__RenderEngine__IsMaxEngineEnabled,
        Na__RenderEngine__IsMaxEngineActive
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
