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
// - Na__RenderLoop__IsPaused answers whether any hold is in place. Pause and
//   Resume keep a mirror of the holds, reason for reason, before they dispatch,
//   because the modules taken from TrueVision ask this module rather than the
//   render loop (TrueVision keeps its holds here).
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js registers window listeners for all three events.
// - Feature modules import Na__RenderLoop__RequestRender() after camera or scene changes.
// - Modules that must not act while a sheet holds the engine read
//   Na__RenderLoop__IsPaused.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js - the name
//                   Na__RenderLoop__IsPaused only, with a ValeVision body (K2 X3); the rest of the file is
//                   ValeVision's own
// - Source version: TrueVision's file has no version line or log; IsPaused as it has stood since TrueVision3D
//                   v2.24.0 (11-Sep-2026, commit aa580db3; read at b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2
// - Parity        : adapted
// - Divergences   :
//   - The holds are ValeVision's events: Pause and Resume dispatch na-pause-render-loop and
//     na-resume-render-loop, and the loading sequence keeps the reason set its render loop obeys.
//     TrueVision's Pause and Resume keep the set in this module and dispatch nothing. The set here is a
//     mirror of the sequence's, counted the same way (a missing or empty reason is 'general'), so
//     IsPaused answers as TrueVision's does.
//   - Pause and Resume return nothing; TrueVision's return the number of holds left (no caller reads it).
//   - Resume asks for no frame itself: the loading sequence paints one when the last hold clears and a
//     frame was asked for meanwhile.
// - Legacy        : TrueVision's copy of this file has no module version, so the Source version names the
//                   release and the commit instead.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.1 (TrueVision's IsPaused, v2.71.2)
// - Na__RenderLoop__IsPaused, TrueVision's name for "is any hold in place?",
//   answered from a mirror of the holds that Pause and Resume keep. The
//   pause and resume events, and the loading sequence's own reason set,
//   are unchanged.
//
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
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Holds, Mirrored
    // ------------------------------------------------------------
    // A SET of reasons rather than a boolean, because more than one system can
    // want the loop stopped at once. The loading sequence keeps the set its
    // render loop obeys, fed by the two events above; this is its mirror, kept
    // by Pause and Resume themselves, so the question TrueVision's modules ask
    // of this module - is the engine held? - has an answer here.
    // ------------------------------------------------------------
    const Na__RenderLoop__PauseReasons = new Set();                         // <-- Every reason paused and not yet resumed
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
        Na__RenderLoop__PauseReasons.add(reason || 'general');              // <-- Mirrored first, so IsPaused already answers for the listeners
        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {
            detail: { reason }                                              // <-- Who is holding the engine
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Resume After a Pause
    // ------------------------------------------------------------
    function Na__RenderLoop__Resume(reason = 'general') {
        Na__RenderLoop__PauseReasons.delete(reason || 'general');           // <-- Mirrored first, as Pause does
        window.dispatchEvent(new CustomEvent(NA__RESUME_RENDER_LOOP_EVENT, {
            detail: { reason }
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Any Hold in Place?
    // ------------------------------------------------------------
    // TrueVision's question, answered from the mirror above: true from the
    // moment a holder pauses until the last one resumes.
    // ------------------------------------------------------------
    function Na__RenderLoop__IsPaused() {
        return Na__RenderLoop__PauseReasons.size > 0;
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
        Na__RenderLoop__Resume,
        Na__RenderLoop__IsPaused
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
