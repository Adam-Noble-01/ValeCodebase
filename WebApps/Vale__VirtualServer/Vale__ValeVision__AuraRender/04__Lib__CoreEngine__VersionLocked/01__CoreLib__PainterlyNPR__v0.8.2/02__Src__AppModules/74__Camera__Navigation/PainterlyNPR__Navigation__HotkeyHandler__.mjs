/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - HOTKEY HANDLER
   =============================================================================

   FILE       : PainterlyNPR__Navigation__HotkeyHandler__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - HotkeyHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The keyboard's camera: W A S D and the arrows move it, Q and E
                lower and raise it (Alt finer, Shift moving the target too), R
                resets the view, + and - zoom, 0 resets the zoom
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - Every key is the mappings' (MatchKey): ValeVision's 3D Model tab keys with
     PainterlyNPR's zoom keys. A held key is held in the session, which moves
     the camera each frame it stays down; the others act once a press.
   - ONLY WHEN THE KEYBOARD IS THE CAMERA'S: the session says whether its view is
     the one on screen (Active), and no key acts while a field, a list, a slider
     or anything editable has the focus - a focused slider keeps its arrows.
   - Nothing acts while Ctrl or Cmd is held (Ctrl + D duplicates a point,
     Ctrl + S saves), and a one-press key not with Alt either.
   - Every key taken is taken from the browser: the arrows would scroll the page,
     Alt + an arrow would go back a page, Alt + E would open Edge's menu.
   - Releasing the window (blur) lets every held key go: no keyup ever arrives
     for a key held while the focus left.

   ============================================================================= */

import {
    PainterlyNPR__Navigation__MatchKey,
    PainterlyNPR__Navigation__KEYS  as  KEYS,
} from './PainterlyNPR__Navigation__Mappings__.mjs';

// =============================================================================
// REGION | Navigation - Hotkey Handler
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether the Focus Takes Typing (or a Slider Its Arrows)
    // ------------------------------------------------------------
    function PainterlyNPR__NavigationKeys__IsTyping() {
        const focus  =  document.activeElement;
        if (!focus || focus === document.body) return false;
        return /^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName) || focus.isContentEditable === true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Modifier Named in the Mappings Is Held
    // ------------------------------------------------------------
    function PainterlyNPR__NavigationKeys__Holds(event, name) {
        if (name === 'Alt')   return !!event.altKey;
        if (name === 'Shift') return !!event.shiftKey;
        if (name === 'Ctrl')  return !!event.ctrlKey;
        if (name === 'Meta')  return !!event.metaKey;
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen for the Keyboard - returns a detach function
    // ------------------------------------------------------------
    // session: the orbit mode's session (Active, Start, Hold, Modifiers, Action,
    // AnyHeld, ReleaseKeys).
    function PainterlyNPR__NavigationKeys__Attach(session) {
        const modifiers  =  (e) => session.Modifiers(PainterlyNPR__NavigationKeys__Holds(e, KEYS.FineModifier), PainterlyNPR__NavigationKeys__Holds(e, KEYS.RigModifier));

        const down  =  (e) => {
            modifiers(e);
            if (e.defaultPrevented || !session.Active() || PainterlyNPR__NavigationKeys__IsTyping()) return;
            if (e.key === 'Alt' && session.AnyHeld()) { e.preventDefault(); return; }   // <-- Alt pressed mid-move: not the browser's menu
            if (e.ctrlKey || e.metaKey) return;
            const binding  =  PainterlyNPR__Navigation__MatchKey(e);
            if (!binding) return;
            if (binding.Held) {
                e.preventDefault();
                if (!e.repeat) session.Start();
                session.Hold(binding.Action, true);
                return;
            }
            if (e.altKey) return;
            e.preventDefault();
            if (e.repeat && binding.Action === 'ResetView') return;           // <-- A held R resets once
            session.Start();
            session.Action(binding.Action);
        };

        const up  =  (e) => {
            modifiers(e);
            const binding  =  PainterlyNPR__Navigation__MatchKey(e);
            if (binding && binding.Held) session.Hold(binding.Action, false);
        };

        const blur  =  () => {
            session.Modifiers(false, false);
            session.ReleaseKeys();
        };

        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);

        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
            blur();
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__NavigationKeys__Attach,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
