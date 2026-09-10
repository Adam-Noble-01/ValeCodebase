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
//     na-pause-render-loop     — hold every frame (a 2D sheet owns the screen); requests queue.
//     na-resume-render-loop    — lift a hold; one frame paints if anything asked meanwhile.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js registers window listeners for all three events.
// - Feature modules import Na__RenderLoop__RequestRender() after camera or scene changes.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.1.0
// - Pause and resume added so the Layout Editor can idle the engine while a sheet is open.
//
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
    const NA__PAUSE_RENDER_LOOP_EVENT     = 'na-pause-render-loop';      // <-- Hold every frame until resumed
    const NA__RESUME_RENDER_LOOP_EVENT    = 'na-resume-render-loop';     // <-- Lift a hold by reason
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


    // FUNCTION | Pause the Loop Entirely (reasons stack; every one must be lifted)
    // ------------------------------------------------------------
    function Na__RenderLoop__Pause(reason = 'general') {
        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {
            detail: { reason }                                              // <-- Who is holding the engine
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Resume After a Pause
    // ------------------------------------------------------------
    function Na__RenderLoop__Resume(reason = 'general') {
        window.dispatchEvent(new CustomEvent(NA__RESUME_RENDER_LOOP_EVENT, {
            detail: { reason }
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
        NA__PAUSE_RENDER_LOOP_EVENT,
        NA__RESUME_RENDER_LOOP_EVENT,
        Na__RenderLoop__RequestRender,
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender,
        Na__RenderLoop__Pause,
        Na__RenderLoop__Resume
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
