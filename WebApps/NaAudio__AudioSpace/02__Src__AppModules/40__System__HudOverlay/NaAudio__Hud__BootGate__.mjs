/* =============================================================================
   NAAUDIO - HUD OVERLAY | BOOT GATE
   =============================================================================

   FILE       : NaAudio__Hud__BootGate__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - BootGate
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Report boot progress, then take the gesture that unlocks the audio
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Covers the viewport while config and the catalogue load, showing what stage the
     boot has reached, then presents a single button.
   - That button is not decoration. Every browser suspends a fresh AudioContext until a
     real user gesture arrives, and its click handler is where AudioSPACE gets one.

   ---------------------------------------------------------------------------

   THIS GATE CANNOT BE REMOVED, ONLY MOVED

   It looks like an extra click between the user and the application, and there is a
   standing temptation to delete it and call resume() on load instead. That does not
   work: without a gesture the context stays suspended, every scheduled note is placed
   on a clock that is not advancing, and the entire application is silent with no error
   in the console.

   The gesture can be attached to some OTHER first interaction if a better one presents
   itself. It cannot be attached to nothing.

   ---------------------------------------------------------------------------

   THE SCENE IS ALREADY BUILT BEHIND IT

   The 3D space is constructed and rendering before the gate is dismissed, so the fade
   reveals a space that is already there rather than a blank canvas that then populates.
   Only the audio graph waits for the gesture - which is why NaAudio__ModuleBase__Attach
   is separate from __Create.

   ============================================================================= */

import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Boot Gate
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Element Ids and Classes
    // ------------------------------------------------------------
    const MOUNT_ID          =  'NaAudio__Hud__BootGate';
    const CSS_DISMISSED     =  'NaAudio__BootGate--dismissed';
    const CSS_READY         =  'NaAudio__BootGate--ready';

    const FADE_OUT_MS       =  520;                                          // <-- Must match the CSS transition on the gate
    // ------------------------------------------------------------


    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let gateElement     =  null;
    let statusElement   =  null;
    let buttonElement   =  null;
    let detailElement   =  null;
    let onEnterHandler  =  null;
    let isReady         =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Boot Gate Into the Document
    // ------------------------------------------------------------
    export function NaAudio__BootGate__Build(mountElement, appMeta) {
        gateElement     =  document.getElementById(MOUNT_ID) || mountElement;
        gateElement.innerHTML  =  '';

        const card  =  document.createElement('div');
        card.className  =  'NaAudio__BootGate__Card';

        const mark  =  document.createElement('div');
        mark.className  =  'NaAudio__BootGate__Mark';
        mark.innerHTML  =  NaAudio__BootGate__MarkSvg();
        card.appendChild(mark);

        const title  =  document.createElement('h1');
        title.className    =  'NaAudio__BootGate__Title';
        title.textContent  =  appMeta ? appMeta.AppName : 'AudioSPACE';
        card.appendChild(title);

        const subtitle  =  document.createElement('p');
        subtitle.className    =  'NaAudio__BootGate__Subtitle';
        subtitle.textContent  =  appMeta ? appMeta.AppLongName : 'Spatial Music Production Environment';
        card.appendChild(subtitle);

        statusElement  =  document.createElement('p');
        statusElement.className    =  'NaAudio__BootGate__Status';
        statusElement.textContent  =  'Starting';
        card.appendChild(statusElement);

        buttonElement  =  document.createElement('button');
        buttonElement.className    =  'NaAudio__BootGate__Button';
        buttonElement.textContent  =  'Enter the space';
        buttonElement.disabled     =  true;
        buttonElement.addEventListener('click', NaAudio__BootGate__OnEnterClicked);
        card.appendChild(buttonElement);

        detailElement  =  document.createElement('p');
        detailElement.className  =  'NaAudio__BootGate__Detail';
        detailElement.textContent  =  'Audio starts on your first click - every browser requires it.';
        card.appendChild(detailElement);

        const version  =  document.createElement('p');
        version.className    =  'NaAudio__BootGate__Version';
        version.textContent  =  appMeta ? (appMeta.AppVersion + '  -  ' + appMeta.AppStage) : '';
        card.appendChild(version);

        gateElement.appendChild(card);

        NaAudio__BootGate__SubscribeToBoot();
        return gateElement;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Boot Mark - Three Primitives, One Composition
    // ------------------------------------------------------------
    // A circle, a triangle and a bar in three palette pigments. The same vocabulary the
    // 3D space is built from, so the application announces its visual language before it
    // has drawn a single frame of it.
    function NaAudio__BootGate__MarkSvg() {
        return [
            '<svg viewBox="0 0 120 120" width="88" height="88" aria-hidden="true">',
            '  <circle cx="44" cy="46" r="30" fill="#DFA9A1"/>',
            '  <path d="M78 26 L102 74 L54 74 Z" fill="#9BB28C" opacity="0.88"/>',
            '  <rect x="22" y="88" width="76" height="10" rx="5" fill="#D98F5C"/>',
            '  <circle cx="44" cy="46" r="30" fill="none" stroke="#2B2A28" stroke-width="1.4" opacity="0.35"/>',
            '</svg>'
        ].join('');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot Progress
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Follow the Boot Sequence
    // ------------------------------------------------------------
    function NaAudio__BootGate__SubscribeToBoot() {
        NaAudio__EventBus__Subscribe(NaAudio__Event.BootStageChanged, function (payload) {
            if (statusElement) statusElement.textContent  =  payload.Message;
        });

        NaAudio__EventBus__Subscribe(NaAudio__Event.BootFailed, function (payload) {
            NaAudio__BootGate__ShowFailure(payload);
        });

        NaAudio__EventBus__Subscribe(NaAudio__Event.BootComplete, function () {
            NaAudio__BootGate__SetReady();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Arm the Enter Button
    // ------------------------------------------------------------
    function NaAudio__BootGate__SetReady() {
        isReady  =  true;
        if (!buttonElement) return;

        buttonElement.disabled  =  false;
        gateElement.classList.add(CSS_READY);
        statusElement.textContent  =  'Ready';
        buttonElement.focus();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Report a Boot Failure Without Dismissing the Gate
    // ------------------------------------------------------------
    // The gate deliberately stays up on failure. Dismissing it would reveal a half-built
    // 3D space that looks almost right, and 'almost right' is far harder to diagnose than
    // a stated error.
    function NaAudio__BootGate__ShowFailure(payload) {
        if (!statusElement) return;

        gateElement.classList.add('NaAudio__BootGate--failed');
        statusElement.textContent  =  'Could not start';

        detailElement.textContent  =  (payload && payload.Error)
            ? String(payload.Error)
            : 'An unknown error occurred during boot.';

        if (buttonElement) {
            buttonElement.disabled     =  true;
            buttonElement.textContent  =  'Boot failed';
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Gesture
// -----------------------------------------------------------------------------

    // FUNCTION | Register What Happens When the User Enters
    // ------------------------------------------------------------
    // The handler runs SYNCHRONOUSLY inside the click, and it must - a resume() call
    // reached through a promise chain or a timer has lost the gesture by the time it
    // arrives, and the context stays suspended.
    export function NaAudio__BootGate__OnEnter(handler) {
        onEnterHandler  =  handler;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle the Enter Click
    // ------------------------------------------------------------
    function NaAudio__BootGate__OnEnterClicked() {
        if (!isReady || !onEnterHandler) return;

        buttonElement.disabled     =  true;
        buttonElement.textContent  =  'Starting audio';

        const result  =  onEnterHandler();

        // The gate is dismissed once the handler's own promise settles, so the space is
        // never revealed while the audio graph is still being built - which would show a
        // silent, apparently broken sequencer for a beat or two.
        Promise.resolve(result)
            .then(NaAudio__BootGate__Dismiss)
            .catch(function (error) {
                console.error('[NaAudio BootGate] Audio start failed:', error);
                NaAudio__BootGate__ShowFailure({ Error: error.message });
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Fade the Gate Out and Remove It
    // ------------------------------------------------------------
    export function NaAudio__BootGate__Dismiss() {
        if (!gateElement) return;

        gateElement.classList.add(CSS_DISMISSED);

        // Removed rather than merely hidden. A full-viewport element left in the document
        // continues to intercept pointer events unless every one of its pointer-events
        // rules is right, and a 3D space that silently ignores the mouse is a genuinely
        // baffling bug to chase.
        setTimeout(function () {
            if (gateElement && gateElement.parentNode) gateElement.parentNode.removeChild(gateElement);
            gateElement  =  null;
        }, FADE_OUT_MS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
