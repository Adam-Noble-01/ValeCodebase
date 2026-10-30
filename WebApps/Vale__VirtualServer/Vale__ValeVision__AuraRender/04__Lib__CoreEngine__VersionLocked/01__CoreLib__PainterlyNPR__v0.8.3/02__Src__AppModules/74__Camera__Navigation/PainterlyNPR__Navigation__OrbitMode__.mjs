/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - ORBIT MODE
   =============================================================================

   FILE       : PainterlyNPR__Navigation__OrbitMode__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - OrbitMode
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The 3D navigation mode: ValeVision 3D's orbit mode without its
                orbit helper cube - orbit, pan, dolly and zoom by mouse, fingers
                and keys - attached to whatever element shows the drawing
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - Attach(element, options) wires the three handlers (mouse, touch, hotkeys)
     to one session and returns { Detach, Home }. PainterlyNPR's sheet and every
     wrapper's view (ValeVision AURA's 3D Environment) attach the same way, so
     the drawing is navigated alike in each.
   - ONE MOVE A FRAME: the handlers report what each event is worth; the session
     gathers it and applies it once an animation frame, so a burst of pointer or
     wheel events is one camera change, one bump and one preview request.
   - DAMPING (fingers, by default): each frame applies a share of the orbit and
     pan still owed and keeps the rest, so the view eases to a stop after the
     finger lifts. Zoom is never damped.
   - HELD KEYS move the camera every frame they are down.
   - SETTLE: once nothing is owed, no key is held and no button or finger is down,
     OnSettle is called once - the host saves its settings there.
   - THE HOME VIEW (R, and 0's framing) is the last camera preset the camera was
     on when a gesture began, or the options' Home().

   OPTIONS (every one optional):
   - Canvas      : the element whose on-screen height scales a drag (default the element)
   - Active()    : whether the keyboard is this view's now (default always)
   - Allowed(e)  : whether a press or a wheel may be taken (default always)
   - Locked()    : true holds the camera still (PainterlyNPR's view lock)
   - OnLocked()  : said once a gesture while locked
   - OnMove()    : after each frame that moved the camera
   - OnSettle()  : once the camera comes to rest after moving
   - OnTap(e)    : a click or tap that never became a drag
   - OnReset(key): after R put the camera back on preset key
   - Home()      : the preset R returns to (default: tracked)

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Navigation__Apply,
    PainterlyNPR__Navigation__Commit,
    PainterlyNPR__Navigation__DollyOfDrag,
    PainterlyNPR__Navigation__DollyOfWheel,
    PainterlyNPR__Navigation__IsPreset,
    PainterlyNPR__Navigation__KeyMove,
    PainterlyNPR__Navigation__PanOf,
    PainterlyNPR__Navigation__ResetView,
    PainterlyNPR__Navigation__ResetZoom,
    PainterlyNPR__Navigation__RotationOf,
} from './PainterlyNPR__Navigation__CameraMoves__.mjs';
import {
    PainterlyNPR__Navigation__DampingFor,
    PainterlyNPR__Navigation__DAMPING  as  DAMPING,
    PainterlyNPR__Navigation__KEYS     as  KEYS,
} from './PainterlyNPR__Navigation__Mappings__.mjs';
import { PainterlyNPR__NavigationMouse__Attach } from './PainterlyNPR__Navigation__MouseHandler__.mjs';
import { PainterlyNPR__NavigationTouch__Attach } from './PainterlyNPR__Navigation__TouchHandler__.mjs';
import { PainterlyNPR__NavigationKeys__Attach } from './PainterlyNPR__Navigation__HotkeyHandler__.mjs';

// =============================================================================
// REGION | Navigation - Orbit Mode
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Session
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Nothing Owed Worth Another Frame
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__Spent(owed) {
        return Math.abs(owed.Yaw) < DAMPING.StopBelowDeg && Math.abs(owed.Pitch) < DAMPING.StopBelowDeg
            && Math.hypot(owed.Pan[0], owed.Pan[1], owed.Pan[2]) < DAMPING.StopBelowM && owed.Dolly === 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Attach the Orbit Mode to an Element - { Detach, Home }
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__Attach(element, options) {
        const o     =  options || {};
        const call  =  (fn, ...args) => { if (typeof fn === 'function') { try { return fn(...args); } catch (error) { console.error('[PainterlyNPR Navigation]', error); } } return undefined; };
        const S     =  {
            Owed    :  { Yaw: 0, Pitch: 0, Pan: [0, 0, 0], Dolly: 0, Share: 1 },  // <-- What the gestures are owed; Share: the part applied a frame
            Held    :  new Set(),                                             // <-- Held move keys
            Fine    :  false,
            Rig     :  false,
            Grips   :  0,                                                     // <-- Buttons and fingers down
            Frame   :  0,
            Moved   :  false,                                                 // <-- Moved since the last settle
            Noted   :  false,                                                 // <-- The lock said so this gesture
            Home    :  PainterlyNPR__Navigation__IsPreset(State.CameraPreset) ? State.CameraPreset : 'ThreeQuarter',
            Off     :  [],
        };

        const locked  =  () => {
            if (!call(o.Locked)) return false;
            if (!S.Noted) { S.Noted = true; call(o.OnLocked); }
            return true;
        };
        const height  =  () => {
            const target  =  o.Canvas || element;
            return (target.getBoundingClientRect && target.getBoundingClientRect().height) || target.clientHeight || 1;
        };
        const home  =  () => {
            const named  =  call(o.Home);
            return PainterlyNPR__Navigation__IsPreset(named) ? named : S.Home;
        };
        const wake  =  () => { if (!S.Frame) S.Frame = requestAnimationFrame(step); };

        // ONE FRAME | Apply a share of what is owed, the held keys' move, then guard and tell
        // ------------------------------------------------------------
        const step  =  () => {
            S.Frame  =  0;
            if (S.Held.size && call(o.Active) === false) S.Held.clear();     // <-- The view left the screen with a key down
            const owed   =  S.Owed;
            const share  =  owed.Share;
            const move   =  {
                Yaw    :  owed.Yaw * share,
                Pitch  :  owed.Pitch * share,
                Pan    :  owed.Pan.map((v) => v * share),
                Dolly  :  owed.Dolly,
                Eye    :  PainterlyNPR__Navigation__KeyMove(S.Held, S.Fine),
                Rig    :  S.Rig,
            };
            const keep  =  share < 1 ? 1 - share : 0;
            owed.Yaw *= keep; owed.Pitch *= keep; owed.Pan = owed.Pan.map((v) => v * keep); owed.Dolly = 0;
            if (PainterlyNPR__Navigation__Spent(owed)) { owed.Yaw = 0; owed.Pitch = 0; owed.Pan = [0, 0, 0]; }

            if (PainterlyNPR__Navigation__Apply(move)) {
                PainterlyNPR__Navigation__Commit();
                S.Moved  =  true;
                call(o.OnMove);
            }
            if (!PainterlyNPR__Navigation__Spent(owed) || S.Held.size) { wake(); return; }
            if (S.Moved && S.Grips === 0) { S.Moved = false; call(o.OnSettle); }
        };
        // ------------------------------------------------------------

        // THE SESSION | What the handlers call
        // ------------------------------------------------------------
        const session  =  {
            Element  :  element,
            Active   :  () => call(o.Active) !== false,
            Allowed  :  (e) => call(o.Allowed, e) !== false,
            Start    :  () => {
                S.Noted  =  false;
                if (PainterlyNPR__Navigation__IsPreset(State.CameraPreset)) S.Home = State.CameraPreset;   // <-- The view this gesture leaves is the one R comes back to
            },
            Grip     :  (n) => {
                S.Grips  =  Math.max(0, S.Grips + n);
                if (S.Grips === 0 && !S.Frame && S.Moved) wake();             // <-- Let the next frame settle it
            },
            Rotate   :  (dx, dy, type) => {
                if (locked()) return;
                const r  =  PainterlyNPR__Navigation__RotationOf(dx, dy, height());
                S.Owed.Yaw += r.Yaw; S.Owed.Pitch += r.Pitch; S.Owed.Share = PainterlyNPR__Navigation__DampingFor(type);
                wake();
            },
            Pan      :  (dx, dy, type) => {
                if (locked()) return;
                const p  =  PainterlyNPR__Navigation__PanOf(dx, dy, height());
                for (let i = 0; i < 3; i++) S.Owed.Pan[i] += p[i];
                S.Owed.Share  =  PainterlyNPR__Navigation__DampingFor(type);
                wake();
            },
            Dolly    :  (dyPx) => { if (locked()) return; S.Owed.Dolly += PainterlyNPR__Navigation__DollyOfDrag(dyPx); wake(); },
            DollyBy  :  (log) => { if (locked() || !Number.isFinite(log)) return; S.Owed.Dolly += log; wake(); },
            Zoom     :  (delta) => { if (locked()) return; S.Owed.Dolly += PainterlyNPR__Navigation__DollyOfWheel(delta); wake(); },
            Tap      :  (e) => call(o.OnTap, e),
            Modifiers:  (fine, rig) => { S.Fine = !!fine; S.Rig = !!rig; },
            AnyHeld  :  () => S.Held.size > 0,
            Hold     :  (action, down) => {
                if (!down) { S.Held.delete(action); return; }
                if (locked()) return;
                S.Held.add(action);
                wake();
            },
            ReleaseKeys :  () => S.Held.clear(),
            Action   :  (name) => {
                if (locked()) return;
                if (name === 'ZoomIn')  { session.Zoom(-KEYS.ZoomKeyStep); return; }
                if (name === 'ZoomOut') { session.Zoom(KEYS.ZoomKeyStep); return; }
                const key  =  home();
                if (name === 'ResetView' && PainterlyNPR__Navigation__ResetView(key)) {
                    S.Owed  =  { Yaw: 0, Pitch: 0, Pan: [0, 0, 0], Dolly: 0, Share: 1 };
                    PainterlyNPR__Navigation__Commit();
                    call(o.OnReset, key);
                    call(o.OnSettle);
                } else if (name === 'ResetZoom' && PainterlyNPR__Navigation__ResetZoom(key)) {
                    PainterlyNPR__Navigation__Commit();
                    call(o.OnMove);
                    call(o.OnSettle);
                }
            },
        };
        // ------------------------------------------------------------

        S.Off.push(PainterlyNPR__NavigationMouse__Attach(session));
        S.Off.push(PainterlyNPR__NavigationTouch__Attach(session));
        S.Off.push(PainterlyNPR__NavigationKeys__Attach(session));

        return {
            Home    :  home,
            Detach  :  () => {
                S.Off.splice(0).forEach((off) => off());
                if (S.Frame) cancelAnimationFrame(S.Frame);
                S.Frame  =  0;
                S.Held.clear();
            },
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
        PainterlyNPR__Navigation__Attach,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
