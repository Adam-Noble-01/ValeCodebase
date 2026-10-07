// =============================================================================
// VALEVISION THEIA - PLAYER - CINEMA MODE (THE PAGE DIMS WHILE A VIDEO PLAYS)
// =============================================================================
//
// FILE       : Na__Player__CinemaMode__.js
// NAMESPACE  : Na__Cinema
// MODULE     : Player - Cinema Mode
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fade the light Vale page to a mid-dark grey while a video is
//              actually playing, and back to the Vale colours whenever it is not
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Adds body.theia--cinema while the video plays; the stylesheets redefine
//   the colour tokens under it (a mid-dark grey, not black: Adam, 07-Oct-2026)
//   and every surface fades over 1.2 s.
// - ONLY WHILE PLAYING: pausing, the end of a video, or a video being swapped
//   lifts it again. Lifting waits 0.4 s, so a seek or the step from one video
//   to the next does not flicker.
// - Config TheiaConfig__Player__CinemaDimOnPlay switches it off.
// - LEAVING IT (Adam, 07-Oct-2026): a click on the page outside the player
//   pauses the video (LeaveOnOutsideClick), so the page fades back; so does
//   Escape (Na__Player__Keyboard__). Clicks on anything that does a job of its
//   own - the list, the header, a dialog, the sign-in - are left alone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.1.0
// - LeaveOnOutsideClick.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build. The dim became a mid-dark grey, and lifts sooner, the same
//   day on Adam's notes.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Cinema Mode
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';

    const Na__Cinema__CLASS    = 'theia--cinema';
    const Na__Cinema__LIFT_MS  = 400;
    const Na__Cinema__OWN_JOB  = 'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [role="menu"], '
                               + '[role="menuitem"], [role="dialog"], [contenteditable="true"], .theia-dialog__backdrop, .theia-toasts, '
                               + '.ValeUserLogin__Overlay, .ValeUserLogin__Mount, .loading-overlay';   // <-- Clicks here do their own job


    // FUNCTION | Follow a Video Element
    // ------------------------------------------------------------
    function Na__Cinema__Attach(video) {
        if (!Na__AppConfig__Get('Player__CinemaDimOnPlay', true)) return;
        let lift = null;
        const dim = () => {
            if (lift) { clearTimeout(lift); lift = null; }
            document.body.classList.add(Na__Cinema__CLASS);
        };
        const undim = () => {
            if (lift) clearTimeout(lift);
            lift = setTimeout(() => { lift = null; if (video.paused || video.ended) document.body.classList.remove(Na__Cinema__CLASS); }, Na__Cinema__LIFT_MS);
        };
        video.addEventListener('playing', dim);
        video.addEventListener('pause', undim);
        video.addEventListener('ended', undim);
        video.addEventListener('emptied', undim);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Click on the Page Outside the Player Pauses It
    // ------------------------------------------------------------
    // keep: the player's own card (the video and its details). leave: pauses.
    // ------------------------------------------------------------
    function Na__Cinema__LeaveOnOutsideClick(keep, leave) {
        document.addEventListener('click', (event) => {
            if (event.button !== 0 || event.defaultPrevented) return;
            const target = event.target instanceof Element ? event.target : null;
            if (!target || !target.isConnected) return;                       // <-- Gone already: the list redrew under the click
            if (keep.contains(target) || target.closest(Na__Cinema__OWN_JOB)) return;
            leave();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Cinema__Attach, Na__Cinema__LeaveOnOutsideClick };

// endregion -------------------------------------------------------------------
