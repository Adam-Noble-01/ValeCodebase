/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | CLIPPING BOX
   =============================================================================

   FILE       : DistoImageMapper__Env3d__ClipBox__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - ClipBox
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A box round the survey that keeps the points inside it, or those
                outside it, and whose six faces are views and DXF projections
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - THE BOX: in the survey's own frame turned about the vertical by its yaw. Its
     local axes: a runs along the Front, b goes in from the Front, z is up. It is
     held as Min and Max along each, in model millimetres, so a face is one number.
   - THE FACES ARE AURA'S DRAWING PLANES (ValeVision AURA's Na__Environment3d__
     DrawingPlanes__, after TrueVision 3D's): a faint face in its own colour, its
     name in capitals in a boxed tab inside its top-left corner, a boxed plus inside
     each of the other corners, and arrows the way the face looks while it is lit.
     Dragged by a grip or its name along its own normal only, snapped on the
     absolute grid of that axis; Escape puts it back. A face square on to a parallel
     view is left out (it would cover the drawing and cannot be dragged). A face
     turned away from the eye is drawn faint, without handles: orbit round to it.
   - EACH FACE IS A VIEW, seen from outside looking in, with its own right and up
     (DistoImageMapper__Env3d__ClipBox__Face). The DXF faces use the same frame, so
     a face's drawing and its view in the app agree. At yaw 0 the Front is the
     DISTO's own 2DW (X across, Z up) and the Top is its 2DG (X, Y).
   - NEVER IN A PICTURE: an SVG layer over the canvas, so Save Image never holds it.
   - Remembered per survey (by its name) in the settings file's ClipBox block (AppCore -
     UserConfig): the box, the mode and the faces' names, with the snap and the clip.
   - WHAT YOU SEE IS WHAT IS KEPT (Adam, 06-Nov-2026: "Make the clipping box clip the
     elements in the viewport too so its a WSIWYG ... add a toggle though to retain the
     current behaviour"). With Clip the View on (the default) the view is a section box:
     ViewClip gives the planes that cut what the box leaves out as a face moves, the
     tripod and its sight lines included (his pick, 1.5.1). Inside, the plan is cut to the
     box's footprint and an elevation to the box as that sheet sees it, so every kept
     point's place on them stays. Points and photos go whole, by their point.
   - ALL POINTS KEEPS THE INSIDE WHILE THE BOX SHOWS AND THE VIEW IS CLIPPED (his pick,
     1.5.1: "Cut view and drawings"): ActingMode says Inside, so the view, the filmstrip
     and the drawings agree. Hide the box or untick the clip and every point is back.

   ============================================================================= */

import * as THREE from 'three';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__UserConfig__Get, DistoImageMapper__UserConfig__Save } from '../01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs';
import { DistoImageMapper__Coords__ModelToWorld, DistoImageMapper__Coords__MmToWorld } from './DistoImageMapper__Env3d__Coordinates__.mjs';
import { DistoImageMapper__Env3d__CameraRig__ActiveCamera } from './DistoImageMapper__Env3d__CameraRig__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__AddFrameTask,
    DistoImageMapper__Env3d__SceneManager__Canvas,
    DistoImageMapper__Env3d__SceneManager__Invalidate
} from './DistoImageMapper__Env3d__SceneManager__.mjs';


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Faces, Modes, Storage
    // ------------------------------------------------------------
    export const DistoImageMapper__Env3d__ClipBox__FaceKeys  =  ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'];
    export const DistoImageMapper__Env3d__ClipBox__Modes     =  { All : 'All', Inside : 'Inside', Outside : 'Outside' };

    const FACES  =  {                                                        // <-- [local axis, sign]: Out the outward normal; Right and Up the face's view from outside
        Front  : { Out : [1, -1], Right : [0,  1], Up : [2, 1] },
        Back   : { Out : [1,  1], Right : [0, -1], Up : [2, 1] },
        Left   : { Out : [0, -1], Right : [1, -1], Up : [2, 1] },
        Right  : { Out : [0,  1], Right : [1,  1], Up : [2, 1] },
        Top    : { Out : [2,  1], Right : [0,  1], Up : [1, 1] },
        Bottom : { Out : [2, -1], Right : [0, -1], Up : [1, 1] }
    };

    const SVG_NS        =  'http://www.w3.org/2000/svg';
    const DEG_TO_RAD    =  Math.PI / 180;
    const NEAR_M        =  0.05;                                             // <-- A face is cut this far in front of a perspective eye
    const INSIDE_EPS_MM =  0.001;
    const VIEW_CUT_GROW_MM =  0.5;                                          // <-- The view's cut stands this far out on the kept side
    const NAME_MAX      =  60;
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Box, the Layer, a Drag
    // ------------------------------------------------------------
    const Box  =  {
        YawDeg  :  0,
        Min     :  [-1000, -1000, 0],                                        // <-- Local a, b, z in mm
        Max     :  [1000, 1000, 2000],
        Mode    :  'All',
        Shown   :  false,
        Names   :  {}
    };

    let SurveyKey   =  '';                                                   // <-- Whose box this is: the survey's name
    let Layer       =  null;                                                 // <-- The SVG over the canvas
    let Hover       =  '';                                                   // <-- The face whose handle is under the pointer
    let Drag        =  null;                                                 // <-- { Key, PointerId, Axis, Sign, StartMm, ValueMm, Param0, Origin, Dir, Steep, Moved, X, Y }
    let WasShown    =  false;
    const Listeners =  [];
    const Raycaster =  new THREE.Raycaster();
    const Pointer   =  new THREE.Vector2();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frames and Maths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Config's Box Section
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Cfg() {
        return DistoImageMapper__Config__Section('ClipBox');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Box's Local Axes as Model Directions: a, b, z
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Axes() {
        const turn  =  Box.YawDeg * DEG_TO_RAD;
        const c     =  Math.cos(turn);
        const s     =  Math.sin(turn);
        return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Model Millimetres to the Box's Frame and Back
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__ToLocal(positionMm) {
        const turn  =  Box.YawDeg * DEG_TO_RAD;
        const c     =  Math.cos(turn);
        const s     =  Math.sin(turn);
        return [positionMm.X * c + positionMm.Y * s, -positionMm.X * s + positionMm.Y * c, positionMm.Z];
    }

    function DistoImageMapper__Env3d__ClipBox__ToModel(local) {
        const turn  =  Box.YawDeg * DEG_TO_RAD;
        const c     =  Math.cos(turn);
        const s     =  Math.sin(turn);
        return { X : local[0] * c - local[1] * s, Y : local[0] * s + local[1] * c, Z : local[2] };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dot Product of a Model Position and a Direction
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Dot(positionMm, direction) {
        return positionMm.X * direction[0] + positionMm.Y * direction[1] + positionMm.Z * direction[2];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Model Direction as a World Direction (model Z is world up)
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__DirToWorld(direction) {
        return new THREE.Vector3(direction[0], direction[2], -direction[1]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Angle Kept Between -180 and 180 Degrees
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Wrap(degrees) {
        let value  =  ((Number(degrees) || 0) % 360 + 360) % 360;
        if (value > 180) value -= 360;
        return Math.round(value * 1000) / 1000;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Millimetres With Their Thousands Grouped by a Space ("6 050")
    // ------------------------------------------------------------
    // A space, not a comma: on a drawing a comma is a decimal point to half of Europe
    // (AURA's and TrueVision's rule).
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__FormatMm(valueMm) {
        const rounded  =  Math.round(valueMm);
        const digits   =  String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return rounded < 0 ? `-${digits}` : digits;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Face: Its Frame, Corners and Ranges
    // ------------------------------------------------------------
    // Right, Up and View are model unit vectors as seen from outside the box looking
    // in. U and V are the face's absolute drawing coordinates (p . Right, p . Up),
    // so at yaw 0 the Front reads X across and Z up, as the DISTO's own 2DW does.
    // Corners: top-left, top-right, bottom-right, bottom-left, as seen.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Face(key) {
        const definition  =  FACES[key];
        const axes        =  DistoImageMapper__Env3d__ClipBox__Axes();
        const scaled      =  ([axis, sign]) => axes[axis].map(value => value * sign);
        const [rightAxis, rightSign]  =  definition.Right;
        const [upAxis, upSign]        =  definition.Up;
        const [outAxis, outSign]      =  definition.Out;
        const side    =  (axis, sign, high) => ((sign > 0) === high ? Box.Max[axis] : Box.Min[axis]);
        const fixed   =  outSign > 0 ? Box.Max[outAxis] : Box.Min[outAxis];
        const corner  =  (uHigh, vHigh) => {
            const local  =  [0, 0, 0];
            local[outAxis]    =  fixed;
            local[rightAxis]  =  side(rightAxis, rightSign, uHigh);
            local[upAxis]     =  side(upAxis, upSign, vHigh);
            return DistoImageMapper__Env3d__ClipBox__ToModel(local);
        };

        const right    =  scaled(definition.Right);
        const up       =  scaled(definition.Up);
        const out      =  scaled(definition.Out);
        const corners  =  [corner(false, true), corner(true, true), corner(true, false), corner(false, false)];
        const centre   =  {
            X : corners.reduce((sum, c) => sum + c.X, 0) / 4,
            Y : corners.reduce((sum, c) => sum + c.Y, 0) / 4,
            Z : corners.reduce((sum, c) => sum + c.Z, 0) / 4
        };
        const dot  =  DistoImageMapper__Env3d__ClipBox__Dot;

        return {
            Key      :  key,
            Name     :  Box.Names[key] || key,
            Colour   :  DistoImageMapper__Env3d__ClipBox__Cfg().FaceColours[key],
            Out      :  out,
            Right    :  right,
            Up       :  up,
            View     :  out.map(value => -value),
            Axis     :  outAxis,
            Sign     :  outSign,
            ValueMm  :  fixed,
            Corners  :  corners,
            Centre   :  centre,
            U        :  [dot(corners[0], right), dot(corners[1], right)],
            V        :  [dot(corners[3], up), dot(corners[0], up)],
            DepthMm  :  Box.Max[outAxis] - Box.Min[outAxis]
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Model Position on a Face's Drawing: { U, V, Depth } in mm (Depth: in from the face)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Project(face, positionMm) {
        const dot  =  DistoImageMapper__Env3d__ClipBox__Dot;
        return {
            U     :  dot(positionMm, face.Right),
            V     :  dot(positionMm, face.Up),
            Depth :  dot(positionMm, face.View) - dot(face.Corners[0], face.View)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Box's Eight Corners and Twelve Edges, in Model mm
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Corners() {
        const corners  =  [];
        for (let i = 0; i < 8; i++) {
            corners.push(DistoImageMapper__Env3d__ClipBox__ToModel([
                i & 1 ? Box.Max[0] : Box.Min[0],
                i & 2 ? Box.Max[1] : Box.Min[1],
                i & 4 ? Box.Max[2] : Box.Min[2]
            ]));
        }
        return corners;
    }

    export function DistoImageMapper__Env3d__ClipBox__Edges() {
        const corners  =  DistoImageMapper__Env3d__ClipBox__Corners();
        const pairs    =  [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        return pairs.map(([a, b]) => [corners[a], corners[b]]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Model Position Inside the Box
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__IsInside(positionMm) {
        const local  =  DistoImageMapper__Env3d__ClipBox__ToLocal(positionMm);
        for (let i = 0; i < 3; i++) {
            if (local[i] < Box.Min[i] - INSIDE_EPS_MM || local[i] > Box.Max[i] + INSIDE_EPS_MM) return false;
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Does the Box Keep a Model Position (always, with the box off)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__IsKept(positionMm) {
        const mode  =  DistoImageMapper__Env3d__ClipBox__ActingMode();
        if (mode === 'All') return true;
        const inside  =  DistoImageMapper__Env3d__ClipBox__IsInside(positionMm);
        return mode === 'Inside' ? inside : !inside;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Mode the Box Acts In: All Points Keeps the Inside While the Box Shows and the View Is Clipped
    // ------------------------------------------------------------
    // Adam's pick (1.5.1): what the view leaves out, the drawings leave out too. The
    // Points list still says All points; the count under it says what is kept.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__ActingMode() {
        if (Box.Mode === 'All' && Box.Shown && DistoImageMapper__Env3d__ClipBox__IsClipView()) return 'Inside';
        return Box.Mode;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Changing the Box
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Tell the App, and Remember the Box Once It Settles
    // ------------------------------------------------------------
    // kind: Geometry, Mode, Names, Shown. live: true while a face is being dragged.
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Emit(kind, live) {
        if (!live) DistoImageMapper__Env3d__ClipBox__Save();
        Listeners.forEach(listener => listener(kind, Boolean(live)));
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Snap: { Enabled, IncrementMm }, This Viewer's Last Choice Else the Config's
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Snap() {
        const config  =  DistoImageMapper__Env3d__ClipBox__Cfg();
        const stored  =  DistoImageMapper__UserConfig__Get('ClipBox').Snap;
        if (stored && typeof stored.Enabled === 'boolean' && config.SnapIncrementsMm.includes(stored.IncrementMm)) return stored;
        return { Enabled : true, IncrementMm : config.SnapDefaultMm };
    }

    export function DistoImageMapper__Env3d__ClipBox__SetSnap(snap) {
        DistoImageMapper__UserConfig__Get('ClipBox').Snap  =  { Enabled : Boolean(snap.Enabled), IncrementMm : Number(snap.IncrementMm) };
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // FUNCTION | Clip the View to the Box: On Unless Turned Off (the settings file's ClipBox.ClipView)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__IsClipView() {
        return DistoImageMapper__UserConfig__Get('ClipBox').ClipView !== false;
    }

    export function DistoImageMapper__Env3d__ClipBox__SetClipView(isOn) {
        DistoImageMapper__UserConfig__Get('ClipBox').ClipView  =  Boolean(isOn);
        DistoImageMapper__UserConfig__Save();
        DistoImageMapper__Env3d__ClipBox__Emit('View', false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Model Plane as a three.js Plane in the World (what lies on its normal's side is drawn)
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__WorldPlane(directionModel, pointMm) {
        return new THREE.Plane().setFromNormalAndCoplanarPoint(
            DistoImageMapper__Env3d__ClipBox__DirToWorld(directionModel).normalize(), DistoImageMapper__Coords__ModelToWorld(pointMm)
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | The View's Clipping Planes, or null When Nothing Is Clipped
    // ------------------------------------------------------------
    // { Intersection, Box3d, ForSheet(normalAxis) }. Inside: the planes face in and
    // anything past any one of them is cut. Outside: they face out and only what is
    // past all of them (inside the box) is cut: three.js's clipIntersection.
    // Inside, a sheet is cut to the box as that sheet sees it: the plan (normal Z) to
    // the box's footprint, a sheet standing up to the box's extent along its own
    // across axis and its height (exact: the box only turns about Z), so a kept
    // point's place on it is never cut. Outside, a sheet loses only what lies in the
    // box itself: a hole the size of the box's shadow would take the places of kept
    // points in front of it or behind it.
    // Every plane stands VIEW_CUT_GROW_MM out on the kept side, so a point lying on a
    // face (kept by IsInside's tolerance) is never cut by that face.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__ViewClip() {
        const mode  =  DistoImageMapper__Env3d__ClipBox__ActingMode();
        if (mode === 'All' || !SurveyKey || !DistoImageMapper__Env3d__ClipBox__IsClipView()) return null;
        const keepInside  =  mode === 'Inside';
        const grow        =  DistoImageMapper__Coords__MmToWorld(VIEW_CUT_GROW_MM) * (keepInside ? 1 : -1);
        const plane       =  (directionModel, pointMm) => {
            const worldPlane  =  DistoImageMapper__Env3d__ClipBox__WorldPlane(directionModel, pointMm);
            worldPlane.constant  +=  grow;
            return worldPlane;
        };
        const facePlane   =  key => {
            const face  =  DistoImageMapper__Env3d__ClipBox__Face(key);
            return plane(keepInside ? face.View : face.Out, face.Corners[0]);
        };
        const corners     =  DistoImageMapper__Env3d__ClipBox__Corners();
        const axisPlanes  =  axis => {                                       // <-- The box's extent along a model axis, two planes facing in
            const values  =  corners.map(corner => corner[axis]);
            const unit    =  { X : [1, 0, 0], Y : [0, 1, 0], Z : [0, 0, 1] }[axis];
            const at      =  value => ({ X : axis === 'X' ? value : 0, Y : axis === 'Y' ? value : 0, Z : axis === 'Z' ? value : 0 });
            return [plane(unit, at(Math.min(...values))), plane(unit.map(v => -v), at(Math.max(...values)))];
        };
        const box3d  =  DistoImageMapper__Env3d__ClipBox__FaceKeys.map(facePlane);
        const sides  =  box3d.slice(0, 4);                                   // <-- Front, Back, Left, Right: the footprint
        return {
            Intersection :  !keepInside,
            Box3d        :  box3d,
            ForSheet     :  normalAxis => {
                if (!keepInside) return box3d;
                return normalAxis === 'Z' ? sides : [...axisPlanes(normalAxis === 'X' ? 'Y' : 'X'), ...axisPlanes('Z')];
            }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Face's Position on Its Axis, Snapped on the Absolute Grid
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__SnapValue(valueMm) {
        const snap  =  DistoImageMapper__Env3d__ClipBox__Snap();
        if (!snap.Enabled) return Math.round(valueMm);
        return Math.round(valueMm / snap.IncrementMm) * snap.IncrementMm;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move One Face, Never Past Its Opposite Face
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__SetSide(key, valueMm) {
        const [axis, sign]  =  FACES[key].Out;
        const minimum       =  DistoImageMapper__Env3d__ClipBox__Cfg().MinimumSizeMm;
        if (sign > 0) Box.Max[axis]  =  Math.max(valueMm, Box.Min[axis] + minimum);
        else          Box.Min[axis]  =  Math.min(valueMm, Box.Max[axis] - minimum);
        return sign > 0 ? Box.Max[axis] : Box.Min[axis];
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit the Box Round Positions, in Its Current Turn, Out to the Grid
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Fit(positionsMm) {
        const config     =  DistoImageMapper__Env3d__ClipBox__Cfg();
        const increment  =  Math.max(DistoImageMapper__Env3d__ClipBox__Snap().IncrementMm, 1);
        const low        =  [Infinity, Infinity, Infinity];
        const high       =  [-Infinity, -Infinity, -Infinity];
        for (const positionMm of positionsMm) {
            const local  =  DistoImageMapper__Env3d__ClipBox__ToLocal(positionMm);
            for (let i = 0; i < 3; i++) {
                low[i]   =  Math.min(low[i], local[i]);
                high[i]  =  Math.max(high[i], local[i]);
            }
        }
        if (!positionsMm.length) {
            low.splice(0, 3, -1000, -1000, 0);
            high.splice(0, 3, 1000, 1000, 2000);
        }
        Box.Min  =  low.map(value => Math.floor((value - config.MarginMm) / increment) * increment);
        Box.Max  =  high.map(value => Math.ceil((value + config.MarginMm) / increment) * increment);
        DistoImageMapper__Env3d__ClipBox__Emit('Geometry', false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn the Box About Its Own Centre (degrees, about model Z)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__SetYaw(degrees, live) {
        const centre  =  DistoImageMapper__Env3d__ClipBox__ToModel(Box.Min.map((value, i) => (value + Box.Max[i]) / 2));
        const half    =  Box.Max.map((value, i) => (value - Box.Min[i]) / 2);
        Box.YawDeg    =  DistoImageMapper__Env3d__ClipBox__Wrap(degrees);
        const local   =  DistoImageMapper__Env3d__ClipBox__ToLocal(centre);
        Box.Min       =  local.map((value, i) => value - half[i]);
        Box.Max       =  local.map((value, i) => value + half[i]);
        DistoImageMapper__Env3d__ClipBox__Emit('Geometry', live);
    }
    // ------------------------------------------------------------


    // FUNCTION | Square the Box to a Wall Through Two Points, Then Fit It Round Them All
    // ------------------------------------------------------------
    // The Front runs from the first point toward the second, and faces the tripod
    // when the survey has one. Returns false when the points are too close on plan.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__SquareTo(firstMm, secondMm, stationMm, positionsMm) {
        const dx  =  secondMm.X - firstMm.X;
        const dy  =  secondMm.Y - firstMm.Y;
        if (Math.hypot(dx, dy) < DistoImageMapper__Env3d__ClipBox__Cfg().SquareMinimumMm) return false;

        let yaw  =  Math.atan2(dy, dx) / DEG_TO_RAD;
        if (stationMm) {
            const turn  =  yaw * DEG_TO_RAD;
            const side  =  (stationMm.X - firstMm.X) * -Math.sin(turn) + (stationMm.Y - firstMm.Y) * Math.cos(turn);
            if (side > 0) yaw += 180;                                        // <-- The tripod stood in front: the Front faces it
        }
        Box.YawDeg  =  DistoImageMapper__Env3d__ClipBox__Wrap(yaw);
        DistoImageMapper__Env3d__ClipBox__Fit(positionsMm);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Points Inside, Outside, or All of Them
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__SetMode(mode) {
        Box.Mode  =  DistoImageMapper__Env3d__ClipBox__Modes[mode] || 'All';
        DistoImageMapper__Env3d__ClipBox__Emit('Mode', false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Box Over the View
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__SetShown(isShown) {
        Box.Shown  =  Boolean(isShown);
        if (!Box.Shown) Hover  =  '';
        DistoImageMapper__Env3d__ClipBox__Emit('Shown', false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Name a Face (an empty name gives back its own)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__SetName(key, name) {
        if (!FACES[key]) return;
        const cleaned  =  String(name || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
        Box.Names[key]  =  cleaned || key;
        DistoImageMapper__Env3d__ClipBox__Emit('Names', false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Copy of the Box: { YawDeg, Min, Max, Mode, Shown, Names }
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__State() {
        return { YawDeg : Box.YawDeg, Min : Box.Min.slice(), Max : Box.Max.slice(), Mode : Box.Mode, Shown : Box.Shown, Names : { ...Box.Names } };
    }
    // ------------------------------------------------------------


    // FUNCTION | Listen for a Change: (kind, live) => {}
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__OnChange(listener) {
        Listeners.push(listener);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Remembering the Box per Survey
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Save the Settled Box Under the Survey's Name
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Save() {
        if (!SurveyKey) return;
        const section  =  DistoImageMapper__UserConfig__Get('ClipBox');
        if (!section.Surveys || typeof section.Surveys !== 'object') section.Surveys  =  {};
        section.Surveys[SurveyKey]  =  { YawDeg : Box.YawDeg, Min : Box.Min.slice(), Max : Box.Max.slice(), Mode : Box.Mode, Names : { ...Box.Names } };
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Saved Box, if It Reads Back Whole
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Read(surveyName) {
        const surveys   =  DistoImageMapper__UserConfig__Get('ClipBox').Surveys || {};
        const stored    =  surveys[surveyName];
        const isTriple  =  value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
        if (!stored || !isTriple(stored.Min) || !isTriple(stored.Max) || !Number.isFinite(stored.YawDeg)) return null;
        if (stored.Min.some((value, i) => value >= stored.Max[i])) return null;
        return stored;
    }
    // ------------------------------------------------------------


    // FUNCTION | Start a Survey's Box: Its Saved One, Else Square to the DISTO's Axes Round Every Point
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Begin(survey) {
        SurveyKey  =  survey.Name || 'Survey';
        Drag       =  null;
        Hover      =  '';
        Box.Names  =  Object.fromEntries(DistoImageMapper__Env3d__ClipBox__FaceKeys.map(key => [key, key]));

        const stored  =  DistoImageMapper__Env3d__ClipBox__Read(SurveyKey);
        if (stored) {
            Box.YawDeg  =  DistoImageMapper__Env3d__ClipBox__Wrap(stored.YawDeg);
            Box.Min     =  stored.Min.slice();
            Box.Max     =  stored.Max.slice();
            Box.Mode    =  DistoImageMapper__Env3d__ClipBox__Modes[stored.Mode] || 'All';
            for (const key of DistoImageMapper__Env3d__ClipBox__FaceKeys) {
                const name  =  stored.Names && typeof stored.Names[key] === 'string' ? stored.Names[key].trim() : '';
                if (name) Box.Names[key]  =  name.slice(0, NAME_MAX);
            }
            Box.Shown  =  Box.Mode !== 'All';
            DistoImageMapper__Env3d__ClipBox__Emit('Geometry', false);
            return;
        }

        Box.YawDeg  =  0;
        Box.Mode    =  'All';
        Box.Shown   =  false;
        DistoImageMapper__Env3d__ClipBox__Fit(survey.Points.map(point => point.PositionMm));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Over the Canvas
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make an SVG Element With Attributes, Inside a Parent
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Svg(tagName, attributes, parent) {
        const element  =  document.createElementNS(SVG_NS, tagName);
        for (const [name, value] of Object.entries(attributes || {})) {
            if (value !== null && value !== undefined) element.setAttribute(name, String(value));
        }
        if (parent) parent.appendChild(element);
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Face's Polygon on Screen, Cut at the Eye's Near Plane
    // ------------------------------------------------------------
    // Returns the screen polygon and each corner's own screen point (null when that
    // corner is behind a perspective eye).
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__OnScreen(cornersMm, camera, width, height) {
        const view     =  cornersMm.map(cornerMm => DistoImageMapper__Coords__ModelToWorld(cornerMm).applyMatrix4(camera.matrixWorldInverse));
        const near     =  camera.isPerspectiveCamera ? NEAR_M : -Infinity;
        const inFront  =  point => -point.z >= near;
        const toScreen =  point => {
            const ndc  =  point.clone().applyMatrix4(camera.projectionMatrix);
            return [(ndc.x + 1) / 2 * width, (1 - ndc.y) / 2 * height];
        };

        const kept  =  [];
        for (let i = 0; i < view.length; i++) {
            const a  =  view[i];
            const b  =  view[(i + 1) % view.length];
            if (inFront(a)) kept.push(a);
            if (inFront(a) !== inFront(b)) {
                const t  =  (-near - a.z) / (b.z - a.z);
                kept.push(a.clone().lerp(b, t));
            }
        }
        return {
            Polygon :  kept.length >= 2 ? kept.map(toScreen) : [],
            Points  :  view.map(point => (inFront(point) ? toScreen(point) : null))
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Arrow From a to b on Screen
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Arrow(parent, a, b, colour) {
        const dx  =  b[0] - a[0];
        const dy  =  b[1] - a[1];
        const length  =  Math.hypot(dx, dy);
        if (length < 6) return;
        const ux  =  dx / length;
        const uy  =  dy / length;
        const head  =  Math.min(9, length * 0.4);
        const wing  =  head * 0.55;
        DistoImageMapper__Env3d__ClipBox__Svg('path', {
            class : 'DistoImageMapper__ClipBox__Arrow', stroke : colour, fill : 'none',
            d     : `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`
                  + `M${(b[0] - ux * head - uy * wing).toFixed(1)} ${(b[1] - uy * head + ux * wing).toFixed(1)}`
                  + `L${b[0].toFixed(1)} ${b[1].toFixed(1)}`
                  + `L${(b[0] - ux * head + uy * wing).toFixed(1)} ${(b[1] - uy * head - ux * wing).toFixed(1)}`
        }, parent);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Face: Fill and Outline, Then, Facing the Eye, Its Grips and Name
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__DrawFace(face, camera, width, height, isActive, isBack) {
        const config   =  DistoImageMapper__Env3d__ClipBox__Cfg();
        const shown    =  DistoImageMapper__Env3d__ClipBox__OnScreen(face.Corners, camera, width, height);
        if (shown.Polygon.length < 2) return;
        const points   =  shown.Polygon.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const centreX  =  shown.Polygon.reduce((sum, p) => sum + p[0], 0) / shown.Polygon.length;
        const centreY  =  shown.Polygon.reduce((sum, p) => sum + p[1], 0) / shown.Polygon.length;
        const colour   =  face.Colour;

        const group  =  DistoImageMapper__Env3d__ClipBox__Svg('g', {
            class : `DistoImageMapper__ClipBox__Face${isActive ? ' is-active' : ''}${isBack ? ' is-back' : ''}`
        }, Layer);
        DistoImageMapper__Env3d__ClipBox__Svg('polygon', {
            class : 'DistoImageMapper__ClipBox__Fill', points, fill : colour,
            'fill-opacity' : isActive ? config.FillOpacityActive : isBack ? config.FillOpacityBack : config.FillOpacity
        }, group);
        DistoImageMapper__Env3d__ClipBox__Svg('polygon', {
            class : 'DistoImageMapper__ClipBox__Outline', points, fill : 'none', stroke : colour,
            'stroke-width'   : isActive ? config.OutlineWidthActivePx : config.OutlineWidthPx,
            'stroke-opacity' : isBack ? config.BackOpacity : 1
        }, group);
        if (isBack) return;                                                  // <-- Turned away: orbit round to take hold of it

        if (isActive) {                                                      // <-- Arrows the way the face looks: into the box
            const spanMm   =  Math.max(face.U[1] - face.U[0], face.V[1] - face.V[0]);
            const lengthMm =  Math.min(config.ArrowLengthMaxMm, Math.max(config.ArrowLengthMinMm, spanMm * config.ArrowLengthFraction));
            const ends     =  face.Corners.map(c => ({ X : c.X + face.View[0] * lengthMm, Y : c.Y + face.View[1] * lengthMm, Z : c.Z + face.View[2] * lengthMm }));
            const tips     =  DistoImageMapper__Env3d__ClipBox__OnScreen(ends, camera, width, height).Points;
            shown.Points.forEach((p, i) => {
                if (p && tips[i]) DistoImageMapper__Env3d__ClipBox__Arrow(group, p, tips[i], colour);
            });
        }

        const inward  =  (x, y, px) => {                                     // <-- Inside a corner: toward the face's middle, by a little
            const dx  =  centreX - x;
            const dy  =  centreY - y;
            const length  =  Math.hypot(dx, dy) || 1;
            const k  =  Math.min(px, length * 0.4) / length;
            return [x + dx * k, y + dy * k];
        };

        const grip  =  config.GripPx;
        [1, 2, 3].forEach(i => {                                             // <-- A boxed plus inside the top-right, bottom-right and bottom-left corners
            const at  =  shown.Points[i];
            if (!at) return;
            const [x, y]  =  inward(at[0], at[1], grip * 0.9);
            const handle  =  DistoImageMapper__Env3d__ClipBox__Svg('g', { class : 'DistoImageMapper__ClipBox__Grip', 'data-handle' : 'grip', 'data-face' : face.Key }, group);
            DistoImageMapper__Env3d__ClipBox__Svg('rect', { x : x - grip / 2, y : y - grip / 2, width : grip, height : grip, rx : 2, class : 'DistoImageMapper__ClipBox__Pad', stroke : colour }, handle);
            DistoImageMapper__Env3d__ClipBox__Svg('path', {
                d : `M${x - grip * 0.28} ${y}H${x + grip * 0.28}M${x} ${y - grip * 0.28}V${y + grip * 0.28}`, stroke : colour, class : 'DistoImageMapper__ClipBox__Plus'
            }, handle);
            DistoImageMapper__Env3d__ClipBox__Svg('title', null, handle).textContent  =  `Drag to move the ${face.Name} face in or out`;
        });

        const corner  =  shown.Points[0];                                    // <-- The name: a boxed tab inside the top-left corner, in capitals
        if (!corner) return;
        const label  =  face.Name === face.Key ? face.Key.toUpperCase() : `${face.Name.toUpperCase()} (${face.Key.toUpperCase()})`;
        const tab    =  DistoImageMapper__Env3d__ClipBox__Svg('g', { class : 'DistoImageMapper__ClipBox__Tab', 'data-handle' : 'name', 'data-face' : face.Key }, group);
        const rect   =  DistoImageMapper__Env3d__ClipBox__Svg('rect', { rx : 2, class : 'DistoImageMapper__ClipBox__Pad', stroke : colour }, tab);
        const text   =  DistoImageMapper__Env3d__ClipBox__Svg('text', { class : 'DistoImageMapper__ClipBox__Name', fill : colour }, tab);
        text.textContent  =  label;
        let textWidth  =  0;
        try { textWidth  =  text.getComputedTextLength(); } catch (error) { textWidth  =  0; }
        const boxWidth   =  (textWidth || label.length * 6.4) + 12;
        const boxHeight  =  18;
        let boxX  =  centreX >= corner[0] ? corner[0] + 4 : corner[0] - 4 - boxWidth;     // <-- Toward the middle of the face, whichever way it lies on screen
        let boxY  =  centreY >= corner[1] ? corner[1] + 4 : corner[1] - 4 - boxHeight;
        if (boxX + boxWidth > width - 2) boxX  =  corner[0] - 4 - boxWidth;                // <-- A face seen edge-on has no middle: keep its name on the screen
        if (boxX < 2) boxX  =  Math.min(corner[0] + 4, width - boxWidth - 2);
        if (boxY + boxHeight > height - 2) boxY  =  corner[1] - 4 - boxHeight;
        if (boxY < 2) boxY  =  Math.min(corner[1] + 4, height - boxHeight - 2);
        for (const [name, value] of Object.entries({ x : boxX, y : boxY, width : boxWidth, height : boxHeight })) rect.setAttribute(name, value.toFixed(1));
        text.setAttribute('x', (boxX + 6).toFixed(1));
        text.setAttribute('y', (boxY + 12.6).toFixed(1));
        DistoImageMapper__Env3d__ClipBox__Svg('title', null, tab).textContent  =  `${face.Name}: drag to move this face in or out`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drag's Readout Beside the Pointer
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__DrawReadout(width, height) {
        const format  =  DistoImageMapper__Env3d__ClipBox__FormatMm;
        const size    =  Box.Max.map((value, i) => value - Box.Min[i]);
        const name    =  Box.Names[Drag.Key] || Drag.Key;
        const text    =  Drag.Steep
            ? 'Orbit round: this face is square on to you'
            : `${name}: ${format(Drag.ValueMm)} mm${DistoImageMapper__Env3d__ClipBox__Snap().Enabled ? '' : ' (free)'}   Box ${format(size[0])} x ${format(size[1])} x ${format(size[2])} mm`;
        const group  =  DistoImageMapper__Env3d__ClipBox__Svg('g', { class : 'DistoImageMapper__ClipBox__Readout' }, Layer);
        const rect   =  DistoImageMapper__Env3d__ClipBox__Svg('rect', { rx : 3 }, group);
        const label  =  DistoImageMapper__Env3d__ClipBox__Svg('text', null, group);
        label.textContent  =  text;
        let textWidth  =  0;
        try { textWidth  =  label.getComputedTextLength(); } catch (error) { textWidth  =  0; }
        const boxWidth   =  (textWidth || text.length * 6.6) + 14;
        const boxHeight  =  22;
        const boxX  =  Math.max(4, Math.min(width - boxWidth - 4, Drag.X + 16));
        const boxY  =  Math.max(4, Math.min(height - boxHeight - 4, Drag.Y + 16));
        for (const [attribute, value] of Object.entries({ x : boxX, y : boxY, width : boxWidth, height : boxHeight })) rect.setAttribute(attribute, value.toFixed(1));
        label.setAttribute('x', (boxX + 7).toFixed(1));
        label.setAttribute('y', (boxY + 15).toFixed(1));
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Box (each frame while shown; the loop only runs when something moves)
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Draw() {
        const isVisible  =  Box.Shown && Boolean(SurveyKey);
        if (!isVisible && !WasShown) return;
        WasShown  =  isVisible;
        while (Layer.firstChild) Layer.firstChild.remove();
        Layer.classList.toggle('is-shown', isVisible);
        Layer.classList.toggle('is-dragging', isVisible && Boolean(Drag));
        if (!isVisible) return;

        const canvas  =  DistoImageMapper__Env3d__SceneManager__Canvas();
        const width   =  canvas.clientWidth;
        const height  =  canvas.clientHeight;
        if (!width || !height) return;
        Layer.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const camera   =  DistoImageMapper__Env3d__CameraRig__ActiveCamera();
        camera.updateMatrixWorld();
        const look      =  camera.getWorldDirection(new THREE.Vector3());
        const squareOn  =  Math.cos(DistoImageMapper__Env3d__ClipBox__Cfg().MinAxisAngleDeg * DEG_TO_RAD);
        const active    =  Drag ? Drag.Key : Hover;

        const faces  =  DistoImageMapper__Env3d__ClipBox__FaceKeys.map(key => {
            const face     =  DistoImageMapper__Env3d__ClipBox__Face(key);
            const centre   =  DistoImageMapper__Coords__ModelToWorld(face.Centre);
            const out      =  DistoImageMapper__Env3d__ClipBox__DirToWorld(face.Out);
            const toEye    =  camera.isOrthographicCamera ? look.clone().negate() : camera.position.clone().sub(centre).normalize();
            const depth    =  -centre.clone().applyMatrix4(camera.matrixWorldInverse).z;
            return { Face : face, Depth : depth, Facing : out.dot(toEye), SquareOn : camera.isOrthographicCamera && Math.abs(out.dot(look)) > squareOn };
        });

        faces
            .filter(item => !item.SquareOn)                                  // <-- Square on to a parallel view: it would cover the drawing
            .sort((a, b) => (a.Facing >= -0.02) - (b.Facing >= -0.02) || b.Depth - a.Depth)   // <-- Faint back faces first, then far to near
            .forEach(item => DistoImageMapper__Env3d__ClipBox__DrawFace(
                item.Face, camera, width, height, item.Face.Key === active, item.Facing < -0.02
            ));

        if (Drag) DistoImageMapper__Env3d__ClipBox__DrawReadout(width, height);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Each Frame: Draw the Box Where the Camera Now Sees It
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__FrameTask() {
        if (Layer) DistoImageMapper__Env3d__ClipBox__Draw();
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dragging a Face
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Pointer's Ray in World Space
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Ray(event) {
        const rect    =  DistoImageMapper__Env3d__SceneManager__Canvas().getBoundingClientRect();
        const camera  =  DistoImageMapper__Env3d__CameraRig__ActiveCamera();
        Pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        camera.updateMatrixWorld();
        Raycaster.setFromCamera(Pointer, camera);
        return Raycaster.ray;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where on an Axis the Pointer's Ray Passes Nearest: { Param, Alignment }, or null When Parallel
    // ------------------------------------------------------------
    // TrueVision 3D's ClosestParamOnAxis, as AURA has it. Both directions unit length.
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__ClosestParam(axisOrigin, axisDir, rayOrigin, rayDir) {
        const w      =  axisOrigin.clone().sub(rayOrigin);
        const b      =  axisDir.dot(rayDir);
        const dw     =  axisDir.dot(w);
        const ew     =  rayDir.dot(w);
        const denom  =  1 - b * b;
        if (Math.abs(denom) < 1e-6) return null;
        return { Param : (b * ew - dw) / denom, Alignment : Math.abs(b) };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Pointer Is Over the Layer (for the readout)
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Track(event) {
        const rect  =  Layer.getBoundingClientRect();
        Drag.X  =  event.clientX - rect.left;
        Drag.Y  =  event.clientY - rect.top;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Press a Grip or a Name: the Drag Starts From Where the Face Is
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Press(event) {
        if (event.button !== 0 || Drag) return;
        const handle  =  event.target && event.target.closest ? event.target.closest('[data-handle]') : null;
        const key     =  handle ? handle.getAttribute('data-face') : '';
        if (!FACES[key]) return;
        event.preventDefault();
        event.stopPropagation();                                             // <-- The face's, never the orbit's

        const face    =  DistoImageMapper__Env3d__ClipBox__Face(key);
        const origin  =  DistoImageMapper__Coords__ModelToWorld(face.Centre);
        const dir     =  DistoImageMapper__Env3d__ClipBox__DirToWorld(face.Out).normalize();
        const ray     =  DistoImageMapper__Env3d__ClipBox__Ray(event);
        const nearest =  DistoImageMapper__Env3d__ClipBox__ClosestParam(origin, dir, ray.origin, ray.direction);
        const limit   =  Math.cos(DistoImageMapper__Env3d__ClipBox__Cfg().MinAxisAngleDeg * DEG_TO_RAD);

        Drag  =  {
            Key       :  key,
            PointerId :  event.pointerId,
            StartMm   :  face.ValueMm,
            ValueMm   :  face.ValueMm,
            Sign      :  face.Sign,
            Param0    :  nearest ? nearest.Param : 0,
            Origin    :  origin,
            Dir       :  dir,
            Steep     :  !nearest || nearest.Alignment > limit,
            Moved     :  false,
            X         :  0,
            Y         :  0
        };
        DistoImageMapper__Env3d__ClipBox__Track(event);
        try { Layer.setPointerCapture(event.pointerId); } catch (error) { /* a synthetic pointer */ }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Move: the Point on the Normal Nearest the Pointer's Ray, Snapped on the Grid
    // ------------------------------------------------------------
    // From where the drag began, by how far along the normal the pointer has gone;
    // the face's absolute position on its axis is then snapped. Too square on to
    // the view, the face holds where it is.
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Move(event) {
        if (!Drag || event.pointerId !== Drag.PointerId) return;
        DistoImageMapper__Env3d__ClipBox__Track(event);
        const ray      =  DistoImageMapper__Env3d__ClipBox__Ray(event);
        const nearest  =  DistoImageMapper__Env3d__ClipBox__ClosestParam(Drag.Origin, Drag.Dir, ray.origin, ray.direction);
        const limit    =  Math.cos(DistoImageMapper__Env3d__ClipBox__Cfg().MinAxisAngleDeg * DEG_TO_RAD);
        Drag.Steep     =  !nearest || nearest.Alignment > limit;
        if (!Drag.Steep) {
            const alongMm  =  (nearest.Param - Drag.Param0) * 1000;          // <-- World metres along the outward normal
            const wanted   =  DistoImageMapper__Env3d__ClipBox__SnapValue(Drag.StartMm + alongMm * Drag.Sign);
            const value    =  DistoImageMapper__Env3d__ClipBox__SetSide(Drag.Key, wanted);
            if (value !== Drag.ValueMm) {
                Drag.ValueMm  =  value;
                Drag.Moved    =  true;
                DistoImageMapper__Env3d__ClipBox__Emit('Geometry', true);
            }
        }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Let Go: the Face Stays, or Escape Puts It Back
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__Release(event, keep) {
        if (!Drag || (event && event.pointerId !== undefined && event.pointerId !== Drag.PointerId)) return;
        const drag  =  Drag;
        Drag  =  null;
        try { Layer.releasePointerCapture(drag.PointerId); } catch (error) { /* already released */ }
        if (!keep && drag.Moved) DistoImageMapper__Env3d__ClipBox__SetSide(drag.Key, drag.StartMm);
        if (drag.Moved) DistoImageMapper__Env3d__ClipBox__Emit('Geometry', false);
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pointer Over a Grip or a Name Lights Its Face
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__ClipBox__SetHover(key) {
        if (Drag || Hover === key) return;
        Hover  =  key;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mounting and Access
// -----------------------------------------------------------------------------

    // FUNCTION | Lay the Box's Layer Over the Viewport (Once, After the Camera's Frame Task)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__Mount(hostElement) {
        Layer  =  DistoImageMapper__Env3d__ClipBox__Svg('svg', { class : 'DistoImageMapper__ClipBox__Layer', 'aria-hidden' : 'true' }, hostElement);
        Layer.addEventListener('pointerdown', DistoImageMapper__Env3d__ClipBox__Press);
        Layer.addEventListener('pointermove', DistoImageMapper__Env3d__ClipBox__Move);
        Layer.addEventListener('pointerup', event => DistoImageMapper__Env3d__ClipBox__Release(event, true));
        Layer.addEventListener('pointercancel', event => DistoImageMapper__Env3d__ClipBox__Release(event, false));
        Layer.addEventListener('pointerover', event => {
            const handle  =  event.target && event.target.closest ? event.target.closest('[data-handle]') : null;
            if (handle) DistoImageMapper__Env3d__ClipBox__SetHover(handle.getAttribute('data-face'));
        });
        Layer.addEventListener('pointerout', event => {
            const next  =  event.relatedTarget;
            if (!next || !next.closest || !next.closest('[data-handle]')) DistoImageMapper__Env3d__ClipBox__SetHover('');
        });
        window.addEventListener('keydown', event => {                        // <-- Before the app's own keys: Escape here only puts the face back
            if (event.key !== 'Escape' || !Drag) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            DistoImageMapper__Env3d__ClipBox__Release(null, false);
        }, true);
        DistoImageMapper__Env3d__SceneManager__AddFrameTask(DistoImageMapper__Env3d__ClipBox__FrameTask);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Face Being Dragged
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__ClipBox__IsDragging() {
        return Boolean(Drag);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
