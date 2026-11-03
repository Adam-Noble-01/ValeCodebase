/* =============================================================================
   PAINTERLYNPR - CAMERA | VIEW TYPES - CAMERA RIG
   =============================================================================

   FILE       : PainterlyNPR__CameraRig__Camera__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - ViewTypes - CameraRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The camera of the current render: computed from the state,
                projecting and unprojecting sheet pixels, presets, orbit and zoom,
                and aerial perspective
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Aerial perspective is measured from the subject, not the eye: stepping back
     to take in the garden never fogs the cottage.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Camera Rig
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__LookAt,
    PainterlyNPR__Maths__Multiply,
    PainterlyNPR__Maths__Ortho,
    PainterlyNPR__Maths__Perspective,
    PainterlyNPR__Maths__Clamp        as  Clamp,
    PainterlyNPR__Maths__SmoothStep   as  SmoothStep,
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__CameraRig__CAMERA_PRESETS  as  CAMERA_PRESETS,
    PainterlyNPR__CameraRig__ZOOM            as  ZOOM,
} from './PainterlyNPR__CameraRig__Presets__.mjs';

// =============================================================================
// REGION | View Types - Camera Rig
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Camera Rig
// -----------------------------------------------------------------------------

    // MODULE STATE | The Camera of the Current Render
    // ------------------------------------------------------------
    let Camera  =  null;
    // ------------------------------------------------------------


    // FUNCTION | Compute the Camera From the State
    // ------------------------------------------------------------
    function PainterlyNPR__CameraRig__Compute() {
        const c       =  State.Camera;
        const yaw     =  c.Yaw * DEG;
        const pitch   =  c.Pitch * DEG;
        const dir     =  [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
        const eye     =  V3Add(c.Target, V3Scale(dir, c.Distance));
        const view    =  PainterlyNPR__Maths__LookAt(eye, c.Target, [0, 1, 0]);
        const W = Gpu.Width, H = Gpu.Height, aspect = W / H;
        const ortho   =  c.Mode === 'Ortho';
        const proj    =  ortho ? PainterlyNPR__Maths__Ortho(-c.HalfHeight * aspect, c.HalfHeight * aspect, -c.HalfHeight, c.HalfHeight, 0.1, 1200)
                               : PainterlyNPR__Maths__Perspective(c.FovY * DEG, aspect, 0.1, 1200);
        const viewProj  =  PainterlyNPR__Maths__Multiply(proj, view);
        const forward   =  V3Normalise(V3Sub(c.Target, eye));
        Camera  =  {
            Eye        :  eye,
            Forward    :  forward,
            View       :  view,
            ViewProj   :  viewProj,
            ViewRot    :  new Float32Array([view[0], view[1], view[2], view[4], view[5], view[6], view[8], view[9], view[10]]),
            Ortho      :  ortho,
            HalfHeight :  c.HalfHeight,
            TanHalf    :  Math.tan(c.FovY * DEG / 2),
            FocalPx    :  (H / 2) / Math.tan(c.FovY * DEG / 2),
            PxPerMetre :  H / (2 * c.HalfHeight),
            Width      :  W,
            Height     :  H,
            Ceiling    :  c.Ceiling,
        };
        const horizonPoint  =  ortho ? [c.Target[0], 0, c.Target[2]] : V3Add(eye, V3Scale(V3Normalise([forward[0], 0, forward[2]]), 5000));
        Camera.HorizonPx  =  Clamp(PainterlyNPR__CameraRig__Project(horizonPoint).Y, -1, H + 1);
        return Camera;
    }
    // ------------------------------------------------------------


    // FUNCTION | Project a World Point to Sheet Pixels (origin bottom left) and View Depth
    // ------------------------------------------------------------
    function PainterlyNPR__CameraRig__Project(p) {
        const m   =  Camera.ViewProj;
        const v   =  Camera.View;
        const cx  =  m[0] * p[0] + m[4] * p[1] + m[8]  * p[2] + m[12];
        const cy  =  m[1] * p[0] + m[5] * p[1] + m[9]  * p[2] + m[13];
        const cw  =  m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
        const vz  =  v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
        return { X: (cx / cw * 0.5 + 0.5) * Camera.Width, Y: (cy / cw * 0.5 + 0.5) * Camera.Height, Depth: -vz };
    }
    // ------------------------------------------------------------


    // FUNCTION | Unproject Sheet Pixels and a View Depth to a World Point
    // ------------------------------------------------------------
    function PainterlyNPR__CameraRig__Unproject(x, y, depth) {
        const v   =  Camera.View;
        const nx  =  (x / Camera.Width) * 2 - 1;
        const ny  =  (y / Camera.Height) * 2 - 1;
        const aspect  =  Camera.Width / Camera.Height;
        const ax  =  [v[0], v[4], v[8]], ay = [v[1], v[5], v[9]], az = [v[2], v[6], v[10]];
        const vx  =  Camera.Ortho ? nx * Camera.HalfHeight * aspect : nx * Camera.TanHalf * aspect * depth;
        const vy  =  Camera.Ortho ? ny * Camera.HalfHeight : ny * Camera.TanHalf * depth;
        return V3Add(V3Add(V3Add(Camera.Eye, V3Scale(ax, vx)), V3Scale(ay, vy)), V3Scale(az, -depth));
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Camera Preset
    // ------------------------------------------------------------
    function PainterlyNPR__CameraRig__ApplyPreset(key) {
        const preset  =  CAMERA_PRESETS[key];
        State.CameraPreset  =  key;
        State.Camera        =  { Mode: preset.Mode, Yaw: preset.Yaw, Pitch: preset.Pitch, Distance: preset.Distance, Target: preset.Target.slice(), FovY: preset.FovY, HalfHeight: preset.HalfHeight, Ceiling: preset.Ceiling };
    }
    // ------------------------------------------------------------


    // FUNCTION | Orbit and Zoom
    // ------------------------------------------------------------
    function PainterlyNPR__CameraRig__Orbit(dx, dy) {
        const c  =  State.Camera;
        c.Yaw    =  c.Yaw - dx * 0.25;
        c.Pitch  =  Clamp(c.Pitch + dy * 0.2, -2, 48);
        State.CameraPreset  =  'Custom';
    }

    function PainterlyNPR__CameraRig__Zoom(delta) {
        const c  =  State.Camera;
        const k  =  Math.exp(Clamp(delta, -300, 300) * 0.0012);
        if (c.Mode === 'Ortho') c.HalfHeight = Clamp(c.HalfHeight * k, ZOOM.MinHalfHeight, ZOOM.MaxHalfHeight);
        else c.Distance = Clamp(c.Distance * k, ZOOM.MinDistance, ZOOM.MaxDistance);
        State.CameraPreset  =  'Custom';
    }
    // ------------------------------------------------------------


    // FUNCTION | Aerial Perspective - the depths over which the drawing fades
    // ------------------------------------------------------------
    // Measured from the subject, never from the eye: stepping back to take in the
    // whole garden must not fog the cottage. What fades is what lies well beyond
    // what the camera looks at - the trees behind a little, the distant belt most.
    function PainterlyNPR__CameraRig__AerialRange() {
        const subject  =  State.Camera.Distance;
        return [subject + 8, subject + 150];
    }

    function PainterlyNPR__CameraRig__Aerial(depth) {
        const range  =  PainterlyNPR__CameraRig__AerialRange();
        return SmoothStep(range[0], range[1], depth);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__CameraRig__Aerial,
        PainterlyNPR__CameraRig__AerialRange,
        PainterlyNPR__CameraRig__ApplyPreset,
        PainterlyNPR__CameraRig__Compute,
        PainterlyNPR__CameraRig__Orbit,
        PainterlyNPR__CameraRig__Project,
        PainterlyNPR__CameraRig__Unproject,
        PainterlyNPR__CameraRig__Zoom,
        Camera  as  PainterlyNPR__CameraRig__Camera,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
