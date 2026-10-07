// =============================================================================
// VALEVISION THEIA - PLAYER - FULLSCREEN
// =============================================================================
//
// FILE       : Na__Player__Fullscreen__.js
// NAMESPACE  : Na__Fullscreen
// MODULE     : Player - Fullscreen
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fill the screen with the player, on every device that allows it
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - The whole player (video, Theia's controls and overlays) goes fullscreen
//   wherever the browser allows an element to (computers, Android, iPad).
// - An iPhone only lets the video itself go fullscreen, in Apple's own player
//   (webkitEnterFullscreen): the video and its quality are the same, the
//   controls are Apple's.
// - Must be called inside a click: browsers refuse fullscreen otherwise.
//
// LANDSCAPE ON A PHONE:
// - A wide video on a phone or tablet turns the screen to landscape as it goes
//   fullscreen, so the picture uses the whole length of the screen, and the
//   screen is let go again on the way out (config Player__LandscapeInFullscreen).
// - Only Android allows a page to do that. Elsewhere (iPad, and any browser
//   that refuses) the screen stays as the viewer holds it, and the controls
//   show a short "turn your phone sideways" hint instead (WantsLandscape).
// - An iPhone hands fullscreen to Apple's own player, which turns with the
//   phone by itself; nothing of Theia's is drawn over it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// 07-Oct-2026 - Version 1.1.0
// - Landscape on a phone (above): Enter turns the screen for a wide video,
//   leaving fullscreen lets it go; WantsLandscape for the controls' hint.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    let Na__Fullscreen__Turned = false;   // <-- Theia turned the screen; turn it back on the way out

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Landscape on a Phone
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This a Phone or Tablet (a touch screen, not a mouse)?
    // ------------------------------------------------------------
    function Na__Fullscreen__IsHandheld() {
        try { return window.matchMedia('(pointer: coarse)').matches; }
        catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Video Wider Than It Is Tall?
    // ------------------------------------------------------------
    // From the video once it has loaded, else from the shape the stage has
    // already taken from the file's record. Unknown reads as wide: every
    // video Theia publishes is.
    // ------------------------------------------------------------
    function Na__Fullscreen__IsWideVideo(container, video) {
        if (video && video.videoWidth > 0 && video.videoHeight > 0) return video.videoWidth > video.videoHeight;
        const stage  = (container && container.closest('.theia-stage')) || container;
        const aspect = stage ? parseFloat(getComputedStyle(stage).getPropertyValue('--theia-aspect')) : NaN;
        return !(aspect > 0) || aspect > 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Should This Fullscreen Be Landscape? (a wide video, on a phone or tablet)
    // ------------------------------------------------------------
    function Na__Fullscreen__WantsLandscape(container, video) {
        return Na__AppConfig__Get('Player__LandscapeInFullscreen', true) !== false
            && Na__Fullscreen__IsHandheld()
            && Na__Fullscreen__IsWideVideo(container, video);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Turn the Screen to Landscape (Android; elsewhere it is refused, quietly)
    // ------------------------------------------------------------
    // 'landscape' allows either way round, so a viewer can still flip the
    // phone over. Must follow the fullscreen request: a page may only lock
    // the screen while it is fullscreen.
    // ------------------------------------------------------------
    function Na__Fullscreen__TurnToLandscape(container, video) {
        if (!Na__Fullscreen__WantsLandscape(container, video)) return;
        const orientation = window.screen && window.screen.orientation;
        if (!orientation || typeof orientation.lock !== 'function') return;
        try {
            const p = orientation.lock('landscape');
            if (p && p.then) p.then(() => { Na__Fullscreen__Turned = true; }).catch(() => {});
        } catch (error) { /* not allowed here: the controls' hint covers it */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Let the Screen Go Once Fullscreen Has Ended
    // ------------------------------------------------------------
    function Na__Fullscreen__ReleaseTurn() {
        if (Na__Fullscreen__Element() || !Na__Fullscreen__Turned) return;
        Na__Fullscreen__Turned = false;
        try { window.screen.orientation.unlock(); } catch (error) { /* already free */ }
    }
    document.addEventListener('fullscreenchange', Na__Fullscreen__ReleaseTurn);
    document.addEventListener('webkitfullscreenchange', Na__Fullscreen__ReleaseTurn);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fullscreen
// -----------------------------------------------------------------------------

    // FUNCTION | Is Anything Fullscreen Now?
    // ------------------------------------------------------------
    function Na__Fullscreen__Element() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter: the container if the browser allows it, else the video (iPhone)
    // ------------------------------------------------------------
    // A wide video on a phone turns the screen to landscape once fullscreen
    // has been granted (see LANDSCAPE ON A PHONE above).
    // ------------------------------------------------------------
    function Na__Fullscreen__Enter(container, video) {
        try {
            if (container.requestFullscreen) {
                const p = container.requestFullscreen({ navigationUI: 'hide' });
                if (p && p.then) p.then(() => Na__Fullscreen__TurnToLandscape(container, video)).catch(() => {});
                else Na__Fullscreen__TurnToLandscape(container, video);
                return true;
            }
            if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
                Na__Fullscreen__TurnToLandscape(container, video);
                return true;
            }
            if (video && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return true; }   // <-- iPhone: Apple's player turns with the phone
        } catch (error) { /* the browser said no: stay in the page */ }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Leave
    // ------------------------------------------------------------
    function Na__Fullscreen__Exit() {
        try {
            if (document.exitFullscreen && document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
            else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
        } catch (error) { /* already out */ }
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle
    // ------------------------------------------------------------
    function Na__Fullscreen__Toggle(container, video) {
        if (Na__Fullscreen__Element()) Na__Fullscreen__Exit();
        else Na__Fullscreen__Enter(container, video);
    }
    // ------------------------------------------------------------


    // FUNCTION | Hear Changes
    // ------------------------------------------------------------
    function Na__Fullscreen__OnChange(fn) {
        document.addEventListener('fullscreenchange', fn);
        document.addEventListener('webkitfullscreenchange', fn);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Fullscreen__Element,
        Na__Fullscreen__Enter,
        Na__Fullscreen__Exit,
        Na__Fullscreen__Toggle,
        Na__Fullscreen__OnChange,
        Na__Fullscreen__WantsLandscape
    };

// endregion -------------------------------------------------------------------
