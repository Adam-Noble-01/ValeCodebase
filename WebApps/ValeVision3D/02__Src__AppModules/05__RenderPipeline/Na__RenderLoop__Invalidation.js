// =============================================================================
// VALEVISION3D - RENDER LOOP INVALIDATION EVENTS
// =============================================================================
//
// FILE       : Na__RenderLoop__Invalidation.js
// NAMESPACE  : Na__RenderLoop
// MODULE     : Render Loop Invalidation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dispatch custom events to request single or continuous render frames
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Thin event bus between UI/feature modules and the invalidation-based render loop.
// - Consumers call the request helpers; the loading sequence listens and schedules frames.
// - Three event types:
//     na-request-render        — schedule one render frame when the scene has changed.
//     na-request-active-render — enable continuous rendering (e.g. orbit, fly mode).
//     na-stop-active-render    — disable continuous rendering when interaction ends.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js registers window listeners for all three events.
// - Feature modules import Na__RenderLoop__RequestRender() after camera or scene changes.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation as part of the invalidation-based render loop.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Render Loop Custom Event Names
    // ------------------------------------------------------------
    const NA__REQUEST_RENDER_EVENT        = 'na-request-render';         // <-- Single-frame invalidation
    const NA__REQUEST_ACTIVE_RENDER_EVENT = 'na-request-active-render';  // <-- Start continuous rendering
    const NA__STOP_ACTIVE_RENDER_EVENT    = 'na-stop-active-render';     // <-- Stop continuous rendering
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Dispatch Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Request a Single Render Frame
    // ------------------------------------------------------------
    function Na__RenderLoop__RequestRender() {
        window.dispatchEvent(new CustomEvent(NA__REQUEST_RENDER_EVENT));   // <-- Notify render loop to paint once
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable Continuous Active Rendering
    // ------------------------------------------------------------
    function Na__RenderLoop__RequestActiveRender(reason = 'general') {
        window.dispatchEvent(new CustomEvent(NA__REQUEST_ACTIVE_RENDER_EVENT, {
            detail: { reason }                                              // <-- Caller context for debug logging
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Disable Continuous Active Rendering
    // ------------------------------------------------------------
    function Na__RenderLoop__StopActiveRender(reason = 'general') {
        window.dispatchEvent(new CustomEvent(NA__STOP_ACTIVE_RENDER_EVENT, {
            detail: { reason }                                              // <-- Caller context for debug logging
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Loop Invalidation API
    // ------------------------------------------------------------
    export {
        NA__REQUEST_RENDER_EVENT,
        NA__REQUEST_ACTIVE_RENDER_EVENT,
        NA__STOP_ACTIVE_RENDER_EVENT,
        Na__RenderLoop__RequestRender,
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
