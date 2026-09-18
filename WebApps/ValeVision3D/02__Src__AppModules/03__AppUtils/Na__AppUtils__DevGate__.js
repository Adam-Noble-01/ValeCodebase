// =============================================================================
// VALEVISION3D - APP UTILS - AUTHORING GATE
// =============================================================================
//
// FILE       : Na__AppUtils__DevGate__.js
// NAMESPACE  : Na__DevGate
// MODULE     : App Utils - Authoring Gate
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Decide whether this session may AUTHOR, separately from where it is served
// CREATED    : 12-Sep-2026
//
// DESCRIPTION:
// - Every dev panel, every save button and the Layout Editor's editing surface
//   ask this one question rather than testing the hostname themselves.
// - THE POINT OF SPLITTING THIS OUT. "Am I on localhost" and "may I author" used
//   to be the same test, and they are not the same question. Tying authoring to
//   a hostname means the drawing tools only exist while a local server happens
//   to be running on that one machine.
// - WHAT THIS DELIBERATELY DOES NOT DO is decide where project data comes from.
//   Na__AppUtils__IsRunningOnLocalhost still owns that, and in ValeVision it
//   owns more than it does in TrueVision: the loader picks the local Flask
//   server over GitHub Pages, and the save path writes a Flask mirror beside the
//   R2 write. Unlocking authoring on the live site must not make either of those
//   start looking for a server that is not there - so the data path keeps the
//   raw hostname test and only the authoring surfaces come through here.
// - This is not a security boundary and is not pretending to be one. Writes are
//   authorised by the editor API key; this decides whether the UI is offered.
//
// INTEGRATION:
// - Unlock:   Na__DevGate__Unlock()   or  ?authoring=on   in the URL
// - Re-lock:  Na__DevGate__Lock()     or  ?authoring=off
// - Both are also exposed on window for the console.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 03__AppUtils/Na__AppUtils__DevGate__.js 1.0.0
// - Ported on     : 12-Sep-2026
// - Parity        : verbatim (console prefix and the data-path note differ)
// - Divergences   : The list of surfaces routed through it is ValeVision's own, because
//                   ValeVision's Flask mirror and GH Pages fallback are data-path uses of
//                   the hostname test and must NOT be routed here.
// - Back-port     : n/a (this IS the port)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Sep-2026 - Version 1.1.0
// - The stored flag is tri-state: unlocked, LOCKED, or nothing said. An
//   explicit lock now closes authoring on localhost too, so ?authoring=off is
//   how the read-only web build - the Layout Editor's document viewer included
//   - is seen without deploying it. Before this, Lock() and ?authoring=off
//   cleared the key and localhost carried on authoring, which made the web
//   build's own behaviour unreachable from a development machine.
//   Ported from TrueVision3D 1.1.0.
//
// 12-Sep-2026 - Version 1.0.0
// - Ported from TrueVision, where it was written for plan decision TD01.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Environment Detection
    // ------------------------------------------------------------
    // @delegate: ./Na__AppUtils__ProjectLoader.js
    // ------------------------------------------------------------
    import { Na__AppUtils__IsRunningOnLocalhost } from './Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Key and URL Parameter
    // ------------------------------------------------------------
    const Na__DevGate__STORAGE_KEY = 'ValeVision3D__AuthoringUnlocked';
    const Na__DevGate__URL_PARAM   = 'authoring';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Resolved Unlock State
    // ------------------------------------------------------------
    // Resolved ONCE, on first ask. A gate that could change answer mid-session
    // would leave half the dev panels built and half not, which is worse than
    // either answer on its own.
    // ------------------------------------------------------------
    let Na__DevGate__Resolved = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Private
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Persisted Flag: Unlocked, Locked, or Nothing Said
    // ------------------------------------------------------------
    // THREE ANSWERS, NOT TWO, and the third is what makes the live web build
    // previewable. true is an explicit unlock, false an explicit LOCK, and null
    // "this device has not been asked". Only an explicit lock can close
    // authoring on localhost - the absence of an unlock cannot, or localhost
    // would never author at all.
    // Wrapped, because localStorage throws outright in a private window and in
    // some embedded contexts, and a thrown gate would take the whole app down
    // rather than simply keeping authoring closed.
    // ------------------------------------------------------------
    function Na__DevGate__ReadStored() {
        try {
            const value = window.localStorage.getItem(Na__DevGate__STORAGE_KEY);
            if (value === 'true')  return true;
            if (value === 'false') return false;
            return null;
        }
        catch (error) { return null; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Persisted Flag
    // ------------------------------------------------------------
    // A lock is now RECORDED rather than forgotten. It used to clear the key,
    // which on localhost meant Na__DevGate__Lock() and ?authoring=off did
    // nothing whatsoever - the one place a developer would want to use them,
    // to see the read-only web build without deploying it.
    // ------------------------------------------------------------
    function Na__DevGate__WriteStored(unlocked) {
        try {
            window.localStorage.setItem(Na__DevGate__STORAGE_KEY, unlocked ? 'true' : 'false');
            return true;
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply an ?authoring= Parameter, If Present
    // ------------------------------------------------------------
    // Returns true when the URL said something, so the caller knows the URL beat
    // whatever was stored.
    // ------------------------------------------------------------
    function Na__DevGate__ApplyUrlParam() {
        try {
            const value = new URLSearchParams(window.location.search).get(Na__DevGate__URL_PARAM);
            if (value === null) return false;
            const on = (value === 'on' || value === '1' || value === 'true');
            Na__DevGate__WriteStored(on);
            console.log(`[ValeVision3D] Authoring ${on ? 'UNLOCKED' : 'locked'} by URL parameter and remembered on this device.`);
            return true;
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | May This Session Author?
    // ------------------------------------------------------------
    function Na__DevGate__IsAuthoringEnabled() {
        if (Na__DevGate__Resolved !== null) return Na__DevGate__Resolved;

        Na__DevGate__ApplyUrlParam();                                            // <-- URL beats storage, and updates it

        const onLocalhost = Na__AppUtils__IsRunningOnLocalhost();
        const stored      = Na__DevGate__ReadStored();                           // <-- true unlocked, false locked, null nothing said
        // AN EXPLICIT ANSWER WINS, WHEREVER THIS IS SERVED. Said nothing:
        // localhost authors and everywhere else does not, as it always has.
        Na__DevGate__Resolved = (stored === null) ? onLocalhost : stored;

        if (Na__DevGate__Resolved && !onLocalhost) {
            console.log('[ValeVision3D] Authoring is unlocked on a non-localhost origin. Run Na__DevGate__Lock() to close it again.');
        }
        if (!Na__DevGate__Resolved && onLocalhost) {
            console.log('[ValeVision3D] Authoring is LOCKED on localhost: this is the read-only web build. Run Na__DevGate__Unlock() (or ?authoring=on) and reload to author again.');
        }
        return Na__DevGate__Resolved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Unlock Authoring on This Device
    // ------------------------------------------------------------
    // Takes effect on the next load, deliberately: see the note on the resolved
    // state above.
    // ------------------------------------------------------------
    function Na__DevGate__Unlock() {
        const ok = Na__DevGate__WriteStored(true);
        console.log(ok
            ? '[ValeVision3D] Authoring unlocked. Reload to build the dev surfaces.'
            : '[ValeVision3D] Could not persist the unlock (storage unavailable).');
        return ok;
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Lock Authoring on This Device
    // ------------------------------------------------------------
    function Na__DevGate__Lock() {
        const ok = Na__DevGate__WriteStored(false);
        console.log(ok
            ? '[ValeVision3D] Authoring locked. Reload to hide the dev surfaces.'
            : '[ValeVision3D] Could not clear the unlock (storage unavailable).');
        return ok;
    }
    // ------------------------------------------------------------


    // FUNCTION | Expose the Two Switches on window for the Console
    // ------------------------------------------------------------
    function Na__DevGate__Initialize() {
        window.Na__DevGate__Unlock = Na__DevGate__Unlock;
        window.Na__DevGate__Lock   = Na__DevGate__Lock;
        Na__DevGate__IsAuthoringEnabled();                                       // <-- Resolve now, so the URL parameter is honoured before any panel asks
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Authoring Gate API
    // ------------------------------------------------------------
    export {
        Na__DevGate__IsAuthoringEnabled,
        Na__DevGate__Unlock,
        Na__DevGate__Lock,
        Na__DevGate__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
