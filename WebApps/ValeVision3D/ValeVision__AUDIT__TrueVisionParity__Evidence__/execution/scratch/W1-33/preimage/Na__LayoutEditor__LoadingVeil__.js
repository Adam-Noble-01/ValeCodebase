// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - LOADING VEILS
// =============================================================================
//
// FILE       : Na__LayoutEditor__LoadingVeil__.js
// NAMESPACE  : Na__LeVeil
// MODULE     : Layout Editor - Loading Veils (the wait for a drawing, and the way back to the model)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Cover the two jarring crossings between the 3D model and the drawings, each tied to the work it is waiting on
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - Two crossings were cold drops, and this covers both. What it does NOT do
//   is duplicate the screen ValeVision already has:
//
//     GOING IN   Na__LeLoadScreen already owns the screen, because the editor
//                is lazily loaded here and something has to cover the import.
//                This module only lends it the WAIT - DrawingSettled - so it
//                stops hiding two frames after the sheet opens and starts
//                hiding when the sheet is actually drawn.
//     COMING OUT "Loading Your 3D Model", which is this module's own, shown at
//                once, lifted when the camera has arrived.
//
// - COMING OUT shows immediately, and deliberately so. The thing it exists to
//   hide - the 3D view flicking through stale 2D viewport frames as the render
//   loop restarts - happens at once, so a veil that waited would let the reader
//   see precisely what it was added to prevent.
//
// WHAT EACH ONE WAITS FOR - none of it is a timer:
// - THE DRAWING: the number of .na-le-frame elements carrying a loaded <img>
//   reaching the viewport count the MODEL says the sheet has. The expected
//   count is read from the model, not the page, which is what stops "nothing
//   queued yet" being mistaken for "finished" - in TrueVision the render queue
//   is not filled until about 800ms after the tab is pressed, and a first
//   version that watched only the queue called itself done at 600ms, before
//   the sheet had started.
// - THE CAMERA: the first scene in the carousel is requested, and the veil
//   lifts when the presentation camera reports it has stopped transitioning.
//
// NEITHER CAN STRAND ANYONE. The camera wait has a hard cap, and the drawing
// wait gives up on a viewport that has plainly stopped coming rather than
// holding the reader while a render that failed elsewhere never arrives.
//
// INTEGRATION:
// - Na__LayoutEditor__ModeController__ calls ReturnTo3d from Leave and
//   Dismiss3d from Enter, and re-exports the drawing wait for the loader.
// - Na__LayoutEditor__Loader__ awaits that wait before hiding its screen. It
//   cannot import this module directly without defeating the lazy load, so it
//   reaches it through the editor facade.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js
// - Ported on     : 20-Sep-2026 for ValeVision3D (TrueVision v2.83.0)
// - Parity        : adapted
// - Divergences   : TrueVision builds its own going-in veil; here that job
//                   belongs to Na__LeLoadScreen, which ValeVision already has
//                   because its editor is lazily loaded, so only the WAIT is
//                   ported and the veil element is not. No text metrics job
//                   either: ValeVision has no PdfFonts module to preload.
// - Back-port     : n/a
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
// - Initial port, with the top bar fold.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Labels, the Render Queue Depth, and the Presentation Camera
    // ------------------------------------------------------------
    import { Na__LeCfg__GetLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__LeSnap__GetOutstanding } from '../25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js';
    import { Na__PresentationMode__UI__GoToSceneAtIndex } from '../../21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js';
    import { Na__PresentationMode__Camera__IsTransitioning } from '../../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Timings
    // ------------------------------------------------------------
    const Na__LeVeil__MIN_VISIBLE_MS = 500;       // <-- Once shown it stays this long; a spinner that blinks reads as a fault
    const Na__LeVeil__SETTLE_MS      = 300;       // <-- Held-quiet window before a wait is called finished
    const Na__LeVeil__POLL_MS        = 120;       // <-- How often the pictures on the paper, or the camera, are looked at
    const Na__LeVeil__GIVEUP_MS      = 2500;      // <-- Queue quiet and the count not moving: a viewport that is not coming
    const Na__LeVeil__KICK_MS        = 450;       // <-- Grace for a camera move to start before "not moving" means "arrived"
    const Na__LeVeil__CAP_OUT_MS     = 12000;     // <-- Last resort coming out; a camera move is seconds, never this
    const Na__LeVeil__FADE_MS        = 320;       // <-- Matches the fade in the stylesheet
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Classes
    // ------------------------------------------------------------
    const Na__LeVeil__CLASS      = 'na-le-veil';
    const Na__LeVeil__VISIBLE    = 'na-le-veil--visible';
    const Na__LeVeil__SHOWN      = 'na-le-veil--shown';
    const Na__LeVeil__OVER_MODEL = 'na-le-veil--over-model';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Coming-Out Veil
    // ------------------------------------------------------------
    let Na__LeVeil__Out      = null;   // <-- { root, status, shownAt, pending }
    let Na__LeVeil__OutToken = 0;      // <-- Bumped to abandon a wait that has been overtaken
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Veil Element
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Veil, the First Time One Is Wanted
    // ------------------------------------------------------------
    // Built from the start-up screen's own spinner class, so the two cannot
    // drift apart - the same reason Na__LeLoadScreen borrows it.
    // ------------------------------------------------------------
    function Na__LeVeil__Build(headline) {
        const root = document.createElement('div');
        root.className = Na__LeVeil__CLASS + ' ' + Na__LeVeil__OVER_MODEL;
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        const text = document.createElement('p');
        text.className   = 'na-le-veil__text';
        text.textContent = headline;
        const status = document.createElement('p');
        status.className = 'na-le-veil__status';
        root.appendChild(spinner);
        root.appendChild(text);
        root.appendChild(status);
        document.body.appendChild(root);
        return { root : root, status : status, shownAt : 0, pending : [] };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Veil Up
    // ------------------------------------------------------------
    function Na__LeVeil__Show(veil) {
        if (!veil || veil.root.classList.contains(Na__LeVeil__VISIBLE)) return;
        veil.root.classList.add(Na__LeVeil__VISIBLE);
        void veil.root.offsetWidth;                                              // <-- Commit the display change before the opacity one, or the fade is skipped
        veil.root.classList.add(Na__LeVeil__SHOWN);
        veil.shownAt = Date.now();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take It Down, Never in a Blink
    // ------------------------------------------------------------
    function Na__LeVeil__Hide(veil) {
        if (!veil || !veil.root.classList.contains(Na__LeVeil__VISIBLE)) return;
        const held = Math.max(0, Na__LeVeil__MIN_VISIBLE_MS - (Date.now() - veil.shownAt));
        setTimeout(() => {
            veil.root.classList.remove(Na__LeVeil__SHOWN);
            setTimeout(() => veil.root.classList.remove(Na__LeVeil__VISIBLE), Na__LeVeil__FADE_MS);
        }, held);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Waits
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | How Many Viewports Have a Picture on Them
    // ------------------------------------------------------------
    // A drawn viewport is a frame carrying an <img> that has decoded. complete
    // alone is not enough - it is also true for an image that failed - so the
    // natural width is checked too.
    // ------------------------------------------------------------
    function Na__LeVeil__DrawnCount() {
        const layer = document.querySelector('.na-le-paper__viewports');
        if (!layer) return 0;                                                    // <-- The surface has not built the sheet yet
        let drawn = 0;
        for (const frame of layer.children) {
            const img = frame.querySelector('img');
            if (img && img.complete && img.naturalWidth > 0) drawn += 1;
        }
        return drawn;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wait for the Sheet to Actually Be Drawn
    // ------------------------------------------------------------
    // Expected is the sheet's viewport count, read from the model rather than
    // the page, which is what removes the race: nought of two is plainly not
    // finished, however early it is asked.
    // ------------------------------------------------------------
    function Na__LeVeil__DrawingSettled(expected, onProgress) {
        if (!expected) return Promise.resolve(true);                             // <-- Nothing on this sheet to draw
        return new Promise((resolve) => {
            let quietSince = 0;
            let lastDrawn  = -1;
            let lastChange = Date.now();
            const stop = () => { clearInterval(timer); resolve(true); };
            const tick = () => {
                const drawn = Na__LeVeil__DrawnCount();
                if (drawn !== lastDrawn) { lastDrawn = drawn; lastChange = Date.now(); if (onProgress) onProgress(drawn, expected); }

                const quiet = Na__LeSnap__GetOutstanding() === 0;
                if (drawn >= expected && quiet) {
                    if (!quietSince) quietSince = Date.now();
                    else if (Date.now() - quietSince >= Na__LeVeil__SETTLE_MS) stop();     // <-- Every picture is up and nothing is still rendering
                    return;
                }
                quietSince = 0;

                // A VIEWPORT THAT IS NOT COMING. Nothing queued, nothing new
                // painted for a good while: whatever is missing is not going to
                // arrive, and waiting on it would hold a reader in front of a
                // spinner for a render that failed somewhere else.
                if (quiet && Date.now() - lastChange >= Na__LeVeil__GIVEUP_MS) stop();
            };
            const timer = setInterval(tick, Na__LeVeil__POLL_MS);
            tick();
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait for the Camera to Arrive
    // ------------------------------------------------------------
    // The move has already been requested by the caller. KICK_MS covers the
    // case where it never starts at all - the camera was already on that scene,
    // or the project has no scenes - so "not transitioning" is only believed
    // once a transition has been seen, or once the grace has run out.
    // ------------------------------------------------------------
    function Na__LeVeil__CameraSettled(token) {
        return new Promise((resolve) => {
            const began = Date.now();
            let seen    = false;
            const stop  = () => { clearInterval(timer); resolve(true); };
            const tick = () => {
                if (token !== Na__LeVeil__OutToken) return stop();               // <-- Overtaken: the reader went back into a drawing
                const moving = Na__PresentationMode__Camera__IsTransitioning();
                if (moving) { seen = true; return; }
                if (seen || Date.now() - began >= Na__LeVeil__KICK_MS) stop();    // <-- Arrived, or was never going to move
            };
            const timer = setInterval(tick, Na__LeVeil__POLL_MS);
            tick();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Coming Out
// -----------------------------------------------------------------------------

    // FUNCTION | Cover the Return to the Model, and Send the Camera Home
    // ------------------------------------------------------------
    // Called from Leave, every time. Shows AT ONCE: the flicker of stale 2D
    // viewport frames it hides happens immediately, so a delayed veil would
    // show the reader exactly what it was added to prevent.
    //
    // The camera is sent to the first scene in the carousel - the first
    // presentation scene, as the reader sees the strip - through the same
    // GoToSceneAtIndex a number-key press uses, so the scene's group,
    // visibility state and navigation mode are all applied the ordinary way
    // rather than the camera being moved behind the app's back.
    // ------------------------------------------------------------
    function Na__LeVeil__ReturnTo3d() {
        const token = ++Na__LeVeil__OutToken;
        if (!Na__LeVeil__Out) Na__LeVeil__Out = Na__LeVeil__Build(Na__LeCfg__GetLabel('VeilModelHeadline', 'Loading Your 3D Model'));
        const veil = Na__LeVeil__Out;
        veil.pending = [{ message : Na__LeCfg__GetLabel('VeilCameraMove', 'Returning to the First Scene'), done : false }];
        Na__LeVeil__Show(veil);
        if (veil.status) veil.status.textContent = veil.pending[0].message;

        try { Na__PresentationMode__UI__GoToSceneAtIndex(1); }                   // <-- The first card in the strip; a project with no scenes is a silent no-op
        catch (error) { console.warn('[ValeVision3D LayoutEditor] Could not return to the first scene:', error); }

        let finished = false;
        const done = () => {
            if (finished || token !== Na__LeVeil__OutToken) return;
            finished = true;
            clearTimeout(capTimer);
            if (veil.status) veil.status.textContent = '';
            Na__LeVeil__Hide(veil);
        };
        const capTimer = setTimeout(done, Na__LeVeil__CAP_OUT_MS);
        return Na__LeVeil__CameraSettled(token).then(done);
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop the Coming-Out Veil Because a Drawing Was Opened Again
    // ------------------------------------------------------------
    // Pressing a drawing tab while the model is still settling must not leave
    // its veil hanging over the editor. Bumping the token abandons the wait.
    // ------------------------------------------------------------
    function Na__LeVeil__Dismiss3d() {
        Na__LeVeil__OutToken += 1;
        if (Na__LeVeil__Out) Na__LeVeil__Hide(Na__LeVeil__Out);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Loading Veils API
    // ------------------------------------------------------------
    export {
        Na__LeVeil__DrawingSettled,
        Na__LeVeil__ReturnTo3d,
        Na__LeVeil__Dismiss3d
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
