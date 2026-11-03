/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - CAMERA MOVES
   =============================================================================

   FILE       : PainterlyNPR__Navigation__CameraMoves__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - CameraMoves
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What each navigation gesture does to the camera: orbit, pan,
                dolly and zoom, the keyboard's moves, the reset, and the guards
                that keep the camera above the ground and within its range
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - The camera is the engine's own (State.Camera: Yaw, Pitch, Distance, Target,
     FovY, HalfHeight), Y up, orbiting its Target. These are OrbitControls'
     moves written for it: a drag's rotation and a pan's offset are worked out
     in degrees and metres here, from the pixels the handlers report and the
     height of the drawing on screen.
   - Pure state changes: Apply() moves the camera and guards it, Commit() tells
     the render graph (Camera bumped, the navigation preview asked for; the
     drawing refines when the camera rests). No DOM.

   WHY THE PAN IS SCREEN SPACE:
   - OrbitControls' screenSpacePanning: the target slides along the drawing's own
     right and up, by the world size of a pixel at the target's depth, so what
     lies at the target stays under the pointer. An elevation pans by its scale.

   WHY THE FLOOR GUARD HOLDS THE TILT:
   - ValeVision lifts a camera that dips below the ground. Here the tilt is held
     at the lowest that keeps the eye above it, so the distance - the zoom the
     user chose - never changes behind their back.

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import { PainterlyNPR__CameraRig__ApplyPreset } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import {
    PainterlyNPR__CameraRig__CAMERA_PRESETS  as  CAMERA_PRESETS,
    PainterlyNPR__CameraRig__ZOOM            as  ZOOM,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Presets__.mjs';
import {
    PainterlyNPR__Navigation__KEYS    as  KEYS,
    PainterlyNPR__Navigation__LIMITS  as  LIMITS,
    PainterlyNPR__Navigation__SPEEDS  as  SPEEDS,
    PainterlyNPR__Navigation__WHEEL   as  WHEEL,
} from './PainterlyNPR__Navigation__Mappings__.mjs';

// =============================================================================
// REGION | Navigation - Camera Moves
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Camera's Frame
// -----------------------------------------------------------------------------

    // FUNCTION | The Drawing's Right and Up in the World, and Forward on the Ground
    // ------------------------------------------------------------
    // The eye sits at Target + (sin Yaw cos Pitch, sin Pitch, cos Yaw cos Pitch) x
    // Distance, looking at the target with Y up. Right is forward x up; Up is
    // right x forward; Flat is forward with its height taken out (the keyboard's
    // "forwards", which stays sound looking straight down).
    function PainterlyNPR__Navigation__Basis() {
        const c   =  State.Camera;
        const sy  =  Math.sin(c.Yaw * DEG),   cy  =  Math.cos(c.Yaw * DEG);
        const sp  =  Math.sin(c.Pitch * DEG), cp  =  Math.cos(c.Pitch * DEG);
        return {
            Right :  [cy, 0, -sy],
            Up    :  [-sy * sp, cp, -cy * sp],
            Flat  :  [-sy, 0, -cy],
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The World Size of One Screen Pixel at the Target's Depth
    // ------------------------------------------------------------
    // heightPx: the drawing's height on screen. OrbitControls uses the element's
    // height alone, so a wide window does not distort the speed.
    function PainterlyNPR__Navigation__MetresPerPixel(heightPx) {
        const c  =  State.Camera;
        const h  =  Math.max(1, heightPx || 1);
        return c.Mode === 'Ortho' ? (2 * c.HalfHeight) / h : (2 * c.Distance * Math.tan(c.FovY * DEG / 2)) / h;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What a Gesture Is Worth
// -----------------------------------------------------------------------------

    // FUNCTION | A Drag's Rotation in Degrees - { Yaw, Pitch }
    // ------------------------------------------------------------
    // OrbitControls: a drag the drawing's height turns a full circle; right turns
    // the camera left round the target, down raises it.
    function PainterlyNPR__Navigation__RotationOf(dxPx, dyPx, heightPx) {
        const perPx  =  360 * SPEEDS.RotateSpeed / Math.max(1, heightPx || 1);
        return { Yaw: -dxPx * perPx, Pitch: dyPx * perPx };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Drag's Pan in Metres - the target's offset [x, y, z]
    // ------------------------------------------------------------
    // Content follows the pointer: dragging right moves the target left, dragging
    // down (screen y grows) moves it up.
    function PainterlyNPR__Navigation__PanOf(dxPx, dyPx, heightPx) {
        const k  =  PainterlyNPR__Navigation__MetresPerPixel(heightPx) * SPEEDS.PanSpeed;
        const b  =  PainterlyNPR__Navigation__Basis();
        return [0, 1, 2].map((i) => (-b.Right[i] * dxPx + b.Up[i] * dyPx) * k);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Middle Drag's Dolly - the log of the distance's factor
    // ------------------------------------------------------------
    // Dragging down (dy > 0) moves further, up nearer: x 1 / 0.95 every 100 px.
    function PainterlyNPR__Navigation__DollyOfDrag(dyPx) {
        return -Math.log(SPEEDS.DollyPer100Px) * dyPx / 100;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Wheel Delta's Zoom - the log of the distance's factor
    // ------------------------------------------------------------
    // The engine's own zoom rule (PainterlyNPR__CameraRig__Zoom): positive delta,
    // the wheel turned towards the user, moves further away.
    function PainterlyNPR__Navigation__DollyOfWheel(delta) {
        return Clamp(delta, -WHEEL.StepClamp, WHEEL.StepClamp) * WHEEL.ZoomRate;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Keyboard's Move This Frame, in Metres - [x, y, z]
    // ------------------------------------------------------------
    // held: the Set of held move actions. Forwards and sideways stay level;
    // up and down are straight up and down. Alt: a fifth of the step.
    function PainterlyNPR__Navigation__KeyMove(held, fine) {
        if (!held || !held.size) return null;
        const scale  =  fine ? KEYS.FineScale : 1;
        const step   =  KEYS.MoveStepM * scale;
        const rise   =  KEYS.ElevationStepM * scale;
        const b      =  PainterlyNPR__Navigation__Basis();
        const move   =  [0, 0, 0];
        const add    =  (v, k) => { for (let i = 0; i < 3; i++) move[i] += v[i] * k; };
        if (held.has('MoveForward')) add(b.Flat, step);
        if (held.has('MoveBack'))    add(b.Flat, -step);
        if (held.has('MoveRight'))   add(b.Right, step);
        if (held.has('MoveLeft'))    add(b.Right, -step);
        if (held.has('MoveUp'))      move[1] += rise;
        if (held.has('MoveDown'))    move[1] -= rise;
        return move;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Moving the Camera
// -----------------------------------------------------------------------------

    // FUNCTION | Keep the Camera Within Its Range and Above the Ground
    // ------------------------------------------------------------
    // Distance (or an elevation's half-height) within the camera rig's Zoom
    // range; tilt within the limits; then the floor guard: the eye's height,
    // Target.y + Distance sin(Pitch), at least MinEyeHeightM.
    function PainterlyNPR__Navigation__Guard() {
        const c  =  State.Camera;
        if (c.Mode === 'Ortho') c.HalfHeight = Clamp(c.HalfHeight, ZOOM.MinHalfHeight, ZOOM.MaxHalfHeight);
        else c.Distance = Clamp(c.Distance, ZOOM.MinDistance, ZOOM.MaxDistance);
        let pitch  =  Clamp(c.Pitch, LIMITS.PitchMinDeg, LIMITS.PitchMaxDeg);
        const need  =  (LIMITS.MinEyeHeightM - c.Target[1]) / Math.max(1e-6, c.Distance);
        if (need >= 1) pitch = LIMITS.PitchMaxDeg;
        else if (need > -1) pitch = Math.max(pitch, Math.min(LIMITS.PitchMaxDeg, Math.asin(need) / DEG));
        c.Pitch  =  pitch;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply One Frame's Move - true when the camera changed
    // ------------------------------------------------------------
    // move: { Yaw, Pitch (degrees), Pan [x, y, z] (metres, the target), Dolly
    // (the log of the distance's factor), Eye [x, y, z] (metres, the keyboard),
    // Rig (the target moves with the eye) }. Any part may be left out.
    function PainterlyNPR__Navigation__Apply(move) {
        const c  =  State.Camera;
        if (!c || !move) return false;
        const before  =  JSON.stringify(c);
        if (move.Yaw)   c.Yaw   +=  move.Yaw;
        if (move.Pitch) c.Pitch +=  move.Pitch;
        if (move.Pan) for (let i = 0; i < 3; i++) c.Target[i] += move.Pan[i];
        if (move.Dolly) {
            const k  =  Math.exp(move.Dolly);
            if (c.Mode === 'Ortho') c.HalfHeight *= k;
            else c.Distance *= k;
        }
        if (move.Eye) PainterlyNPR__Navigation__MoveEye(move.Eye, move.Rig === true);
        c.Yaw  =  ((c.Yaw + 180) % 360 + 360) % 360 - 180;                     // <-- Kept in -180..180 so a saved camera reads sensibly
        PainterlyNPR__Navigation__Guard();
        const changed  =  JSON.stringify(c) !== before;
        if (changed) State.CameraPreset = 'Custom';
        return changed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Eye (and with the rig, the target), Then Look Again
    // ------------------------------------------------------------
    // ValeVision's keyboard: the camera moves and OrbitControls turns it back to
    // the target, so W walks in, A and D swing round. With the rig the target
    // travels too and nothing turns. An elevation keeps its distance: only its
    // angle can change.
    function PainterlyNPR__Navigation__MoveEye(delta, rig) {
        const c    =  State.Camera;
        const sy   =  Math.sin(c.Yaw * DEG),   cy  =  Math.cos(c.Yaw * DEG);
        const sp   =  Math.sin(c.Pitch * DEG), cp  =  Math.cos(c.Pitch * DEG);
        const eye  =  [c.Target[0] + sy * cp * c.Distance + delta[0], c.Target[1] + sp * c.Distance + delta[1], c.Target[2] + cy * cp * c.Distance + delta[2]];
        if (rig) { for (let i = 0; i < 3; i++) c.Target[i] += delta[i]; return; }
        const d    =  [eye[0] - c.Target[0], eye[1] - c.Target[1], eye[2] - c.Target[2]];
        const len  =  Math.hypot(d[0], d[1], d[2]);
        if (len < 1e-6) return;
        c.Yaw    =  Math.atan2(d[0], d[2]) / DEG;
        c.Pitch  =  Math.asin(Clamp(d[1] / len, -1, 1)) / DEG;
        if (c.Mode !== 'Ortho') c.Distance = len;
    }
    // ------------------------------------------------------------


    // FUNCTION | Tell the Render Graph: the camera moved, show the preview
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__Commit() {
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resets
// -----------------------------------------------------------------------------

    // FUNCTION | Whether a Key Names One of the Camera Presets
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__IsPreset(key) {
        return !!(key && CAMERA_PRESETS[key]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Back to a Preset's View, Whole (R)
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__ResetView(key) {
        if (!PainterlyNPR__Navigation__IsPreset(key)) return false;
        PainterlyNPR__CameraRig__ApplyPreset(key);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Back to a Preset's Framing, Keeping the Angle and the Target (0)
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__ResetZoom(key) {
        const base  =  CAMERA_PRESETS[key];
        const c     =  State.Camera;
        if (!base || !c) return false;
        c.Distance    =  base.Distance;
        c.HalfHeight  =  base.HalfHeight;
        PainterlyNPR__Navigation__Guard();
        State.CameraPreset  =  'Custom';
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Navigation__Apply,
        PainterlyNPR__Navigation__Basis,
        PainterlyNPR__Navigation__Commit,
        PainterlyNPR__Navigation__DollyOfDrag,
        PainterlyNPR__Navigation__DollyOfWheel,
        PainterlyNPR__Navigation__Guard,
        PainterlyNPR__Navigation__IsPreset,
        PainterlyNPR__Navigation__KeyMove,
        PainterlyNPR__Navigation__MetresPerPixel,
        PainterlyNPR__Navigation__PanOf,
        PainterlyNPR__Navigation__ResetView,
        PainterlyNPR__Navigation__ResetZoom,
        PainterlyNPR__Navigation__RotationOf,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
