/* =============================================================================
   NAAUDIO - APP CORE | MODE MANAGER
   =============================================================================

   FILE       : NaAudio__AppCore__ModeManager__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppCore - ModeManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build, Play and Wiring - which class of interaction the pointer is doing
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Three application modes, borrowed from the build / live split in a life simulation
     game, because it solves exactly the same problem.
   - BUILD  : arrange the space. Modules can be picked up and moved. Every control on
              every module is inert, and every parameter is frozen.
   - PLAY   : work the instruments. Every control is live. Modules cannot be moved.
   - WIRING : patch the signal. Modules are pinned and every control is frozen; the
              ports and the cables are the only live things in the scene.
   - Selection works in all three, so the inspector is always reachable.

   ---------------------------------------------------------------------------

   WHY THIS EXISTS

   Without it the gestures collide. A module's pad is its drag handle, its steps are its
   controls, and its ports sit on the same shell - all within a few centimetres of each
   other in a space the user is orbiting around. Reaching for one and catching another is
   not an occasional slip, it is the common case.

   The consequence is not a wobbly layout. It is a REWRITTEN RHYTHM: the user goes to
   move a sequencer, clips a step on the way past, and their pattern is silently
   different. Nothing announces it. That is data loss dressed up as a near miss, and no
   amount of care from the user fixes it, because the targets genuinely overlap.

   Modes make the collision impossible rather than unlikely.

   ---------------------------------------------------------------------------

   WHY WIRING IS A MODE AND NOT A TOOL BUTTON

   Patching has the same problem as placement and a worse version of it. A port is small,
   it lives on the module shell, and a cable arcs directly over the controls of whatever
   it passes. A stray grab while patching would edit an instrument; a stray grab while
   playing would unplug one.

   Making it modal costs a keystroke and removes the entire class of error. It also means
   the ports and cables can be picked in wiring mode WITHOUT competing with anything -
   there is nothing else live to compete with - so they can stay small and quiet rather
   than having to shout over the controls beside them.

   ---------------------------------------------------------------------------

   HOW IT IS ENFORCED

   Not by each control checking the mode - that is the version that gets forgotten.
   Every interactive handle declares which modes its click and its drag are live in
   when it registers, and NaAudio__Env3d__Interaction filters the raycast against the
   current mode before anything else happens.

   A handle that is not live in the current mode is not merely ignored on click: it is
   invisible to the picker entirely. So it does not take the hover, it does not set the
   cursor, and it does not occlude the pad behind it.

   ============================================================================= */

import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from './NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Mode Manager
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Three Modes
    // ------------------------------------------------------------
    // Published as a frozen vocabulary. A handle declares its live modes with these,
    // never with a bare string, so a typo is a thrown reference rather than a control
    // that silently never activates.
    export const NaAudio__Mode  =  Object.freeze({
        Build  : 'build',
        Play   : 'play',
        Wiring : 'wiring'
    });

    // The order the switch presents them in, and the order Tab cycles through.
    export const NaAudio__Mode__Order  =  Object.freeze([
        NaAudio__Mode.Build,
        NaAudio__Mode.Play,
        NaAudio__Mode.Wiring
    ]);

    // 'Live everywhere'. Named ...__All rather than ...__Both since wiring joined, and
    // renamed rather than aliased on purpose - a list called Both that holds three
    // entries is the kind of small lie that costs somebody an afternoon later.
    export const NaAudio__Mode__All  =  NaAudio__Mode__Order;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Presentation Per Mode
    // ------------------------------------------------------------
    // Read by the HUD indicator, the ground stage and the port factory. Held here rather
    // than in the HUD because the mode owns what it means, and two places will describe
    // it differently within a month.
    export const NaAudio__Mode__Presentation  =  Object.freeze({
        build : {
            Label       : 'Build',
            Pigment     : 'SlateBlue',
            Hint        : 'Move modules. Controls and cables are frozen.',
            ShowGrid    : true
        },
        play : {
            Label       : 'Play',
            Pigment     : 'SageGreen',
            Hint        : 'Work the controls. Modules are pinned.',
            ShowGrid    : false
        },
        wiring : {
            Label       : 'Wiring',
            Pigment     : 'Ochre',
            Hint        : 'Drag port to port to patch. Click a cable to unplug it.',
            ShowGrid    : false
        }
    });
    // ------------------------------------------------------------


    // MODULE VARIABLES | Current Mode
    // ------------------------------------------------------------
    // Play is the default. The space arrives already arranged and already patched, and
    // the first thing anybody wants to do is hear it - not move it and not rewire it.
    let currentMode  =  NaAudio__Mode.Play;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode State
// -----------------------------------------------------------------------------

    // FUNCTION | The Current Mode
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__Current() {
        return currentMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Application Is In Build Mode
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__IsBuild() {
        return currentMode === NaAudio__Mode.Build;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Application Is In Wiring Mode
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__IsWiring() {
        return currentMode === NaAudio__Mode.Wiring;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Mode List Includes the Current Mode
    // ------------------------------------------------------------
    // The single test the interaction layer runs against every handle. An absent or
    // empty list means 'live in every mode', which keeps the common case free of
    // ceremony.
    export function NaAudio__ModeManager__Allows(modeList) {
        if (!modeList || modeList.length === 0) return true;
        return modeList.indexOf(currentMode) >= 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Presentation Block for the Current Mode
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__Presentation() {
        return NaAudio__Mode__Presentation[currentMode];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Switching
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Mode
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__Set(mode) {
        if (NaAudio__Mode__Order.indexOf(mode) < 0) {
            console.warn('[NaAudio ModeManager] Unknown mode "' + mode + '". Use one of NaAudio__Mode: ' + NaAudio__Mode__Order.join(', ') + '.');
            return currentMode;
        }
        if (mode === currentMode) return currentMode;

        const previous  =  currentMode;
        currentMode     =  mode;

        NaAudio__EventBus__Publish(NaAudio__Event.ModeChanged, {
            Mode         : currentMode,
            PreviousMode : previous,
            Presentation : NaAudio__Mode__Presentation[currentMode]
        });

        return currentMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step to the Next or Previous Mode in the Switch Order
    // ------------------------------------------------------------
    export function NaAudio__ModeManager__Cycle(direction) {
        const count  =  NaAudio__Mode__Order.length;
        const index  =  NaAudio__Mode__Order.indexOf(currentMode);
        const step   =  (direction === -1) ? -1 : 1;

        return NaAudio__ModeManager__Set(NaAudio__Mode__Order[(index + step + count) % count]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind the Mode Keyboard Shortcut
    // ------------------------------------------------------------
    // Tab steps forward through Build, Play and Wiring; Shift+Tab steps back. Tab
    // because it is the one key nothing else in the application wants and it reads as
    // 'switch context'. preventDefault is essential - the browser's own focus traversal
    // would otherwise walk the transport bar on every press.
    //
    // Shift+Tab is not decoration. With two modes a forward-only toggle was its own
    // inverse; with three, getting back to the one you just left costs two presses, and
    // the mode you just left is overwhelmingly the one you want next.
    export function NaAudio__ModeManager__BindKeyboard() {
        window.addEventListener('keydown', function (event) {
            const target  =  event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            if (event.code === 'Tab') {
                event.preventDefault();
                NaAudio__ModeManager__Cycle(event.shiftKey ? -1 : 1);
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
