// =============================================================================
// VALEVISION THEIA - PLAYER - KEYBOARD
// =============================================================================
//
// FILE       : Na__Player__Keyboard__.js
// NAMESPACE  : Na__Keys
// MODULE     : Player - Keyboard
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The keys people expect of a video player
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
//   Space or K    play / pause          F            fullscreen
//   Left / Right  back / on 5 s         J / L        back / on 10 s
//   M             sound on / off        Shift+N / P  next / previous video
//   Home / End    start / end           0 - 9        jump to 0% - 90%
//   Escape        pause (the page fades back from cinema; left to menus too)
// - Ignored while typing in a field, so editing a title never pauses the video.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.1.0
// - Escape pauses (Adam).
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Keyboard
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';


    // FUNCTION | Wire the Keys: actions { toggle, stop, seekBy, seekTo, fullscreen, mute, next, previous }
    // ------------------------------------------------------------
    function Na__Keys__Attach(actions) {
        const step = Number(Na__AppConfig__Get('Player__SeekStepSeconds', 5)) || 5;
        document.addEventListener('keydown', (event) => {
            const target = event.target;
            if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (document.querySelector('.theia-dialog')) return;                // <-- A dialog owns the keyboard while open
            const key = event.key;
            let handled = true;
            if (key === ' ' || key === 'k' || key === 'K') {
                if (target && target.tagName === 'BUTTON' && key === ' ') return;  // <-- A focused button already answers Space
                actions.toggle();
            } else if (key === 'ArrowLeft')        actions.seekBy(-step);
            else if (key === 'ArrowRight')         actions.seekBy(step);
            else if (key === 'j' || key === 'J')   actions.seekBy(-10);
            else if (key === 'l' || key === 'L')   actions.seekBy(10);
            else if (key === 'f' || key === 'F')   actions.fullscreen();
            else if (key === 'm' || key === 'M')   actions.mute();
            else if (key === 'N' && event.shiftKey) actions.next();
            else if (key === 'P' && event.shiftKey) actions.previous();
            else if (key === 'Home')               actions.seekTo(0);
            else if (key === 'End')                actions.seekTo(Infinity);
            else if (/^[0-9]$/.test(key))          actions.seekToFraction(Number(key) / 10);
            else if (key === 'Escape') {                                       // <-- Not swallowed: a menu still closes on it too
                actions.stop();
                handled = false;
            }
            else handled = false;
            if (handled) event.preventDefault();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Keys__Attach };

// endregion -------------------------------------------------------------------
