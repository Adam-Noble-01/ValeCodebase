// =============================================================================
// VALEVISION3D - VIDEO STUDIO - KEYFRAME DRAGGER
// =============================================================================
//
// FILE       : Na__VideoStudio__Viewport__KeyframeDragger.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Keyframe Dragger
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Grab waypoint markers in the viewport and drag them, with the
//              path reflowing live under the pointer
// CREATED    : 13-Aug-2026
//
// DESCRIPTION:
// - Lets a saved keyframe be repositioned by dragging its numbered marker in
//   the 3D view, rather than by re-flying to the spot and recapturing.
// - Plain drag slides the waypoint across the horizontal plane it already sits
//   on, so its height never changes by accident. That is the movement you want
//   almost every time: nudging a route left or right around a corner.
// - Shift and drag moves it vertically instead, along the world Y axis only.
// - Ctrl and drag constrains movement to a single world axis, X or Z, chosen
//   from the direction of the first real travel. That gives square, orthogonal
//   moves instead of the free diagonal a plain drag produces, which is what you
//   want when squaring a route up to a building. A coloured guide line marks
//   the committed axis.
// - Ctrl and Shift together turns the waypoint instead of moving it: dragging
//   left and right yaws the shot about world up, so a camera can be re-aimed
//   without flying back to it and recapturing.
// - Lens and timings are never touched by a drag.
//
// MODIFIERS ARE RESOLVED IN ONE PLACE:
// - Ctrl+Shift has to mean something of its own without colliding with what
//   Ctrl and Shift each mean alone, so a single resolver maps the modifier
//   state to one of three exclusive modes and everything downstream reads that
//   rather than testing the keys again.  Changing modifiers mid-drag re-anchors
//   to the waypoint's current state, so no key press ever teleports it.
//
// PICKING IS IN SCREEN SPACE, NOT BY RAYCAST:
// - The markers are drawn as sprites with sizeAttenuation off so they stay a
//   constant size on screen at any distance. Three's Sprite.raycast does not
//   account for that, so a raycast hit area would shrink with distance and a
//   far waypoint would be nearly impossible to grab.
// - Projecting each waypoint to screen coordinates and taking the nearest one
//   inside a pixel radius matches exactly what the user sees: the dot is the
//   same size everywhere, so it is equally grabbable everywhere.
//
// WHY THE LISTENERS SIT ON WINDOW IN THE CAPTURE PHASE:
// - OrbitControls binds pointerdown on the canvas. Listeners on that same
//   element fire in registration order regardless of the capture flag, so a
//   capture listener on the canvas would not reliably win. Binding to window
//   with capture true fires on the way DOWN to the canvas, which is always
//   before anything bound on the canvas itself, so stopping propagation there
//   reliably prevents an orbit rotation from starting under the drag.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Visualizer Handles
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathVisualizer__IsVisible,
        Na__VideoStudio__PathVisualizer__GetDragTargets,
        Na__VideoStudio__PathVisualizer__SetHovered,
        Na__VideoStudio__PathVisualizer__SetDragPreview,
        Na__VideoStudio__PathVisualizer__SetDragRotation,
        Na__VideoStudio__PathVisualizer__GetMarkerQuaternion,
        Na__VideoStudio__PathVisualizer__SetAxisGuide,
        Na__VideoStudio__PathVisualizer__EndDragPreview
    } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetActiveVideoId,
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__SetKeyframePosition,
        Na__VideoStudio__ProjectJson__SetKeyframeRotation
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Preview Playback State
    // @delegate: ./Na__VideoStudio__Playback__PreviewController.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Preview__IsPlaying } from './Na__VideoStudio__Playback__PreviewController.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Picking and Movement
    // ------------------------------------------------------------
    const Na__VsDrag__GRAB_RADIUS_PX   = 22;      // <-- Screen-space pick radius around a marker
    const Na__VsDrag__MIN_RAY_SLOPE    = 0.0015;  // <-- Below this the ground plane is edge-on; ignore the sample
    const Na__VsDrag__MOVED_EVENT      = 'na-video-studio-keyframe-moved';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Ctrl Axis Constraint
    // ------------------------------------------------------------
    // The axis is chosen from the first bit of real movement rather than
    // immediately, so a Ctrl drag does not commit to whichever direction the
    // very first pixel of pointer jitter happened to fall in.
    // ------------------------------------------------------------
    const Na__VsDrag__AXIS_COMMIT_UNITS = 0.15;   // <-- 150mm of travel before the axis locks
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Drag Modes and Rotation Feel
    // ------------------------------------------------------------
    // The three modifier states are mutually exclusive and resolved in one
    // place, so Ctrl+Shift can mean something of its own without colliding with
    // what Ctrl and Shift each mean alone.
    // ------------------------------------------------------------
    const Na__VsDrag__MODE_HORIZONTAL = 'horizontal';  // <-- No modifier, or Ctrl for an axis lock
    const Na__VsDrag__MODE_VERTICAL   = 'vertical';    // <-- Shift
    const Na__VsDrag__MODE_ROTATE     = 'rotate';      // <-- Ctrl + Shift

    const Na__VsDrag__ROTATE_RAD_PER_PX = 0.004;       // <-- About 250px for a quarter turn
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__VsDrag__Renderer      = null;    // <-- Live renderer, for its canvas
    let Na__VsDrag__Camera        = null;    // <-- Live perspective camera
    let Na__VsDrag__Controls      = null;    // <-- OrbitControls, disabled during a drag
    let Na__VsDrag__IsInitialized = false;   // <-- Guard double init
    // ------------------------------------------------------------


    // MODULE VARIABLES | Drag State
    // ------------------------------------------------------------
    let Na__VsDrag__ActiveIndex      = -1;      // <-- Handle being dragged, or -1
    let Na__VsDrag__ActiveKeyframeId = null;    // <-- Keyframe id being dragged
    let Na__VsDrag__Mode             = Na__VsDrag__MODE_HORIZONTAL;   // <-- Resolved from the modifier keys
    let Na__VsDrag__PointerId        = null;    // <-- Pointer that owns the drag
    let Na__VsDrag__ControlsWereOn   = true;    // <-- OrbitControls state to restore
    let Na__VsDrag__DidMove          = false;   // <-- Distinguishes a drag from a click
    let Na__VsDrag__OwnedCursor      = null;    // <-- Cursor value this module set, or null
    let Na__VsDrag__IsAxisLocked     = false;   // <-- True while Ctrl is held on a horizontal drag
    let Na__VsDrag__LockedAxis       = null;    // <-- 'x' or 'z' once enough travel has committed one
    let Na__VsDrag__RotateAnchorX    = 0;       // <-- Screen X where the current rotate gesture began
    let Na__VsDrag__DidRotate        = false;   // <-- Orientation changed, so commit a rotation too
    // ------------------------------------------------------------


    // MODULE VARIABLES | Reusable Scratch Objects
    // ------------------------------------------------------------
    // Allocating vectors inside a pointermove handler is the kind of per-frame
    // garbage that shows up as stutter, so they are hoisted here.
    // ------------------------------------------------------------
    const Na__VsDrag__Raycaster   = new THREE.Raycaster();
    const Na__VsDrag__Pointer     = new THREE.Vector2();
    const Na__VsDrag__Plane       = new THREE.Plane();
    const Na__VsDrag__HitPoint    = new THREE.Vector3();
    const Na__VsDrag__GrabOffset  = new THREE.Vector3();
    const Na__VsDrag__StartPos    = new THREE.Vector3();   // <-- Original position, for the Escape revert
    const Na__VsDrag__AxisAnchor  = new THREE.Vector3();   // <-- Where a Ctrl constraint measures from
    const Na__VsDrag__ScratchVec  = new THREE.Vector3();
    const Na__VsDrag__PlaneNormal = new THREE.Vector3();
    const Na__VsDrag__WorldUp     = new THREE.Vector3(0, 1, 0);
    const Na__VsDrag__StartQuat   = new THREE.Quaternion();   // <-- Orientation the rotate gesture started from
    const Na__VsDrag__YawQuat     = new THREE.Quaternion();   // <-- Incremental yaw about world up
    const Na__VsDrag__WorkQuat    = new THREE.Quaternion();   // <-- Composed result
    const Na__VsDrag__WorkEuler   = new THREE.Euler();        // <-- Converted back to XYZ for storage
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Screen Space Picking
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is Dragging Available Right Now?
    // ------------------------------------------------------------
    function Na__VsDrag__CanDrag() {
        if (!Na__VsDrag__Camera || !Na__VsDrag__Renderer)   return false;
        if (!Na__VideoStudio__PathVisualizer__IsVisible())  return false;   // <-- Cannot grab what is not drawn
        if (Na__VideoStudio__Preview__IsPlaying())          return false;   // <-- Playback owns the camera
        return Na__VideoStudio__PathVisualizer__GetDragTargets().length > 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the Waypoint Nearest a Screen Point
    // ------------------------------------------------------------
    // Projects every handle to screen pixels and returns the index of the
    // closest one inside the grab radius, preferring the nearest to the camera
    // when two overlap.  Returns -1 for a miss.
    // ------------------------------------------------------------
    function Na__VsDrag__PickAtScreen(clientX, clientY) {
        const canvas = Na__VsDrag__Renderer.domElement;
        const rect   = canvas.getBoundingClientRect();

        const targets = Na__VideoStudio__PathVisualizer__GetDragTargets();

        let bestIndex    = -1;
        let bestDistance = Na__VsDrag__GRAB_RADIUS_PX;
        let bestDepth    = Infinity;

        for (let i = 0; i < targets.length; i++) {
            Na__VsDrag__ScratchVec.copy(targets[i].position).project(Na__VsDrag__Camera);

            // BEHIND THE CAMERA | project() wraps z past 1; those are not visible
            if (Na__VsDrag__ScratchVec.z > 1) continue;

            const screenX = rect.left + ((Na__VsDrag__ScratchVec.x + 1) / 2) * rect.width;
            const screenY = rect.top  + ((1 - Na__VsDrag__ScratchVec.y) / 2) * rect.height;

            const dx       = screenX - clientX;
            const dy       = screenY - clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > bestDistance) continue;

            // TIE BREAK | Same pixel, nearer handle wins
            if (distance === bestDistance && Na__VsDrag__ScratchVec.z >= bestDepth) continue;

            bestIndex    = i;
            bestDistance = distance;
            bestDepth    = Na__VsDrag__ScratchVec.z;
        }

        return bestIndex;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update the Raycaster from a Pointer Event
    // ------------------------------------------------------------
    function Na__VsDrag__SyncRaycaster(clientX, clientY) {
        const rect = Na__VsDrag__Renderer.domElement.getBoundingClientRect();

        Na__VsDrag__Pointer.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
        Na__VsDrag__Pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1;

        Na__VsDrag__Raycaster.setFromCamera(Na__VsDrag__Pointer, Na__VsDrag__Camera);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drag Plane Maths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Plane the Drag Slides Along
    // ------------------------------------------------------------
    // Horizontal drag uses the level plane through the waypoint, so height is
    // locked and only X and Z can change.
    //
    // Vertical drag uses an upright plane that faces the camera, which gives
    // the pointer the most travel per pixel; only the Y result is kept, so the
    // waypoint rises and falls exactly on the spot.
    // ------------------------------------------------------------
    function Na__VsDrag__BuildDragPlane(anchorPosition, isVertical) {
        if (!isVertical) {
            Na__VsDrag__PlaneNormal.set(0, 1, 0);                            // <-- Ground plane lock
        } else {
            // Camera forward flattened onto the horizontal, so the plane stands
            // upright and squarely faces the viewer.
            Na__VsDrag__Camera.getWorldDirection(Na__VsDrag__PlaneNormal);
            Na__VsDrag__PlaneNormal.y = 0;

            if (Na__VsDrag__PlaneNormal.lengthSq() < 1e-8) {
                Na__VsDrag__PlaneNormal.set(0, 0, 1);                        // <-- Straight down: any upright plane will do
            }
            Na__VsDrag__PlaneNormal.normalize();
        }

        Na__VsDrag__Plane.setFromNormalAndCoplanarPoint(Na__VsDrag__PlaneNormal, anchorPosition);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Intersect the Pointer Ray with the Drag Plane
    // ------------------------------------------------------------
    // Returns the hit point, or null when the ray runs too close to parallel
    // with the plane. Without that guard a near-level camera would send the
    // waypoint flying to the horizon on a single pixel of mouse movement.
    // ------------------------------------------------------------
    function Na__VsDrag__IntersectDragPlane() {
        const slope = Math.abs(Na__VsDrag__Raycaster.ray.direction.dot(Na__VsDrag__Plane.normal));
        if (slope < Na__VsDrag__MIN_RAY_SLOPE) return null;

        const hit = Na__VsDrag__Raycaster.ray.intersectPlane(Na__VsDrag__Plane, Na__VsDrag__HitPoint);
        return hit || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer Handlers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Set the Canvas Cursor
    // ------------------------------------------------------------
    // Only writes when the value actually changes, and only ever clears a
    // cursor this module set.  Walk mode, the section tool and the fog plane
    // picker all set their own cursors, and blindly assigning an empty string
    // on every pointermove would wipe theirs out from under them.
    // ------------------------------------------------------------
    function Na__VsDrag__SetCursor(cursor) {
        if (!Na__VsDrag__Renderer) return;
        if (cursor === Na__VsDrag__OwnedCursor) return;                      // <-- No change; leave the DOM alone

        if (cursor === '' && Na__VsDrag__OwnedCursor === null) return;       // <-- Never owned one; nothing to clear

        Na__VsDrag__Renderer.domElement.style.cursor = cursor;
        Na__VsDrag__OwnedCursor = (cursor === '') ? null : cursor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Begin a Drag on a Picked Handle
    // ------------------------------------------------------------
    function Na__VsDrag__BeginDrag(index, event) {
        const targets = Na__VideoStudio__PathVisualizer__GetDragTargets();
        const target  = targets[index];
        if (!target) return;

        Na__VsDrag__ActiveIndex      = index;
        Na__VsDrag__ActiveKeyframeId = target.keyframeId;
        Na__VsDrag__PointerId        = event.pointerId;
        Na__VsDrag__Mode             = Na__VsDrag__ResolveMode(event);
        Na__VsDrag__IsAxisLocked     = event.ctrlKey && !event.shiftKey;     // <-- Ctrl+Shift is rotate, not an axis lock
        Na__VsDrag__LockedAxis       = null;                                 // <-- Chosen from the first real travel
        Na__VsDrag__DidMove          = false;
        Na__VsDrag__DidRotate        = false;

        Na__VsDrag__StartPos.copy(target.position);                          // <-- For a clean revert if the drag is cancelled
        Na__VsDrag__AxisAnchor.copy(target.position);                        // <-- Ctrl constraint measures from here
        Na__VsDrag__RotateAnchorX = event.clientX;

        const startQuat = Na__VideoStudio__PathVisualizer__GetMarkerQuaternion(index);
        if (startQuat) {
            Na__VsDrag__StartQuat.copy(startQuat);                           // <-- For rotation, and for the Escape revert
        }

        // ORBIT | Hand the pointer to the drag, not to a camera rotation
        if (Na__VsDrag__Controls) {
            Na__VsDrag__ControlsWereOn      = Na__VsDrag__Controls.enabled;
            Na__VsDrag__Controls.enabled    = false;
        }

        Na__VsDrag__SyncRaycaster(event.clientX, event.clientY);
        Na__VsDrag__BuildDragPlane(target.position, Na__VsDrag__Mode === Na__VsDrag__MODE_VERTICAL);

        // GRAB OFFSET | Preserve where inside the marker the user grabbed, so
        // the waypoint does not jump to sit under the cursor centre.
        const hit = Na__VsDrag__IntersectDragPlane();
        if (hit) Na__VsDrag__GrabOffset.copy(target.position).sub(hit);
        else     Na__VsDrag__GrabOffset.set(0, 0, 0);

        // SELECTION | The grabbed waypoint becomes the highlighted one
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId(target.keyframeId);

        Na__VsDrag__SetCursor(Na__VsDrag__Mode === Na__VsDrag__MODE_ROTATE ? 'ew-resize' : 'grabbing');
        Na__VideoStudio__PathVisualizer__SetHovered(index);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Drag Mode from the Modifier Keys
    // ------------------------------------------------------------
    // One place decides, so the combinations cannot disagree with each other.
    // Ctrl on its own is not a mode: it constrains a horizontal drag to an axis.
    // ------------------------------------------------------------
    function Na__VsDrag__ResolveMode(event) {
        if (event.ctrlKey && event.shiftKey) return Na__VsDrag__MODE_ROTATE;
        if (event.shiftKey)                  return Na__VsDrag__MODE_VERTICAL;
        return Na__VsDrag__MODE_HORIZONTAL;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-Anchor a Drag After the Mode Changed
    // ------------------------------------------------------------
    // Rebuilds whatever the new mode measures from, using the waypoint's
    // current state rather than the drag's original one, so switching modifiers
    // mid-drag continues from where things are instead of snapping back.
    // ------------------------------------------------------------
    function Na__VsDrag__ReanchorForMode(target, event) {
        if (Na__VsDrag__Mode === Na__VsDrag__MODE_ROTATE) {
            Na__VsDrag__RotateAnchorX = event.clientX;
            const current = Na__VideoStudio__PathVisualizer__GetMarkerQuaternion(Na__VsDrag__ActiveIndex);
            if (current) Na__VsDrag__StartQuat.copy(current);                // <-- Turn onward from the current aim
            Na__VideoStudio__PathVisualizer__SetAxisGuide(null, null);
            Na__VsDrag__SetCursor('ew-resize');
            return;
        }

        Na__VsDrag__SetCursor('grabbing');
        Na__VsDrag__SyncRaycaster(event.clientX, event.clientY);
        Na__VsDrag__BuildDragPlane(target.position, Na__VsDrag__Mode === Na__VsDrag__MODE_VERTICAL);

        const rebased = Na__VsDrag__IntersectDragPlane();
        if (rebased) Na__VsDrag__GrabOffset.copy(target.position).sub(rebased);
        else         Na__VsDrag__GrabOffset.set(0, 0, 0);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Constrain the Pending Move to One World Axis
    // ------------------------------------------------------------
    // Reads and rewrites Na__VsDrag__ScratchVec in place.  The axis is decided
    // once, from the first meaningful travel away from the anchor, then held
    // until Ctrl is released.  Movement is measured against the anchor rather
    // than the previous frame, so a wandering pointer cannot creep the waypoint
    // along the locked-out axis one sub-threshold step at a time.
    //
    // The anchor is deliberately NOT the drag's start position: it is wherever
    // the waypoint sat when Ctrl went down, so pressing Ctrl part way through a
    // free drag squares up from there instead of snapping back.
    // ------------------------------------------------------------
    function Na__VsDrag__ApplyAxisConstraint() {
        const deltaX = Na__VsDrag__ScratchVec.x - Na__VsDrag__AxisAnchor.x;
        const deltaZ = Na__VsDrag__ScratchVec.z - Na__VsDrag__AxisAnchor.z;

        // COMMIT | Whichever world axis the pointer has travelled furthest along
        if (!Na__VsDrag__LockedAxis) {
            const travel = Math.max(Math.abs(deltaX), Math.abs(deltaZ));
            if (travel < Na__VsDrag__AXIS_COMMIT_UNITS) {
                // Not enough intent yet: hold the waypoint still rather than
                // letting it drift freely before the axis is chosen.
                Na__VsDrag__ScratchVec.x = Na__VsDrag__AxisAnchor.x;
                Na__VsDrag__ScratchVec.z = Na__VsDrag__AxisAnchor.z;
                return;
            }

            Na__VsDrag__LockedAxis = (Math.abs(deltaX) >= Math.abs(deltaZ)) ? 'x' : 'z';
            Na__VideoStudio__PathVisualizer__SetAxisGuide(Na__VsDrag__LockedAxis, Na__VsDrag__AxisAnchor);
        }

        // APPLY | Zero the movement on the axis that is locked out
        if (Na__VsDrag__LockedAxis === 'x') {
            Na__VsDrag__ScratchVec.z = Na__VsDrag__AxisAnchor.z;
        } else {
            Na__VsDrag__ScratchVec.x = Na__VsDrag__AxisAnchor.x;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply One Step of an In-Flight Drag
    // ------------------------------------------------------------
    function Na__VsDrag__UpdateDrag(event) {
        const targets = Na__VideoStudio__PathVisualizer__GetDragTargets();
        const target  = targets[Na__VsDrag__ActiveIndex];
        if (!target) return;

        // MODE SWITCH | Modifiers can change mid-drag. Re-anchor everything to
        // where the waypoint is NOW so a key press never teleports it: pressing
        // Ctrl means "square up from here", Shift means "lift from here", and
        // releasing hands control back without a snap.
        const mode = Na__VsDrag__ResolveMode(event);
        if (mode !== Na__VsDrag__Mode) {
            Na__VsDrag__Mode = mode;
            Na__VsDrag__ReanchorForMode(target, event);
            return;
        }

        // CTRL WITHIN A HORIZONTAL DRAG | Not a mode change, just the axis lock
        if (mode === Na__VsDrag__MODE_HORIZONTAL && event.ctrlKey !== Na__VsDrag__IsAxisLocked) {
            Na__VsDrag__IsAxisLocked = event.ctrlKey;
            Na__VsDrag__LockedAxis   = null;
            Na__VsDrag__AxisAnchor.copy(target.position);
            Na__VideoStudio__PathVisualizer__SetAxisGuide(null, null);
            Na__VsDrag__ReanchorForMode(target, event);
            return;
        }

        // ROTATE | Horizontal pointer travel turns the waypoint about world Y
        if (mode === Na__VsDrag__MODE_ROTATE) {
            const deltaPx  = event.clientX - Na__VsDrag__RotateAnchorX;
            const deltaYaw = -deltaPx * Na__VsDrag__ROTATE_RAD_PER_PX;       // <-- Drag right turns the shot right

            Na__VsDrag__YawQuat.setFromAxisAngle(Na__VsDrag__WorldUp, deltaYaw);
            Na__VsDrag__WorkQuat.copy(Na__VsDrag__YawQuat).multiply(Na__VsDrag__StartQuat);

            Na__VsDrag__DidRotate = true;
            Na__VideoStudio__PathVisualizer__SetDragRotation(Na__VsDrag__ActiveIndex, Na__VsDrag__WorkQuat);
            return;
        }

        Na__VsDrag__SyncRaycaster(event.clientX, event.clientY);

        const hit = Na__VsDrag__IntersectDragPlane();
        if (!hit) return;                                                    // <-- Ray nearly parallel; skip this sample

        Na__VsDrag__ScratchVec.copy(hit).add(Na__VsDrag__GrabOffset);

        if (mode === Na__VsDrag__MODE_VERTICAL) {
            // VERTICAL | Height only. X and Z stay exactly where they were so
            // the waypoint rises straight up rather than drifting toward camera.
            Na__VsDrag__ScratchVec.x = target.position.x;
            Na__VsDrag__ScratchVec.z = target.position.z;
        } else {
            // HORIZONTAL | Height locked to the plane the waypoint started on
            Na__VsDrag__ScratchVec.y = target.position.y;

            if (Na__VsDrag__IsAxisLocked) {
                Na__VsDrag__ApplyAxisConstraint();
            }
        }

        Na__VsDrag__DidMove = true;
        Na__VideoStudio__PathVisualizer__SetDragPreview(Na__VsDrag__ActiveIndex, Na__VsDrag__ScratchVec);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Commit or Abandon a Drag
    // ------------------------------------------------------------
    function Na__VsDrag__EndDrag(commit) {
        if (Na__VsDrag__ActiveIndex < 0) return;

        const targets    = Na__VideoStudio__PathVisualizer__GetDragTargets();
        const target     = targets[Na__VsDrag__ActiveIndex];
        const keyframeId = Na__VsDrag__ActiveKeyframeId;
        const videoId    = Na__VideoStudio__ProjectJson__GetActiveVideoId();
        const didMove    = Na__VsDrag__DidMove;
        const didRotate  = Na__VsDrag__DidRotate;

        if (target && commit && didMove) {
            Na__VideoStudio__ProjectJson__SetKeyframePosition(videoId, keyframeId, target.position);
        } else if (target && !commit) {
            target.position.copy(Na__VsDrag__StartPos);                      // <-- Revert the live handle
        }

        if (commit && didRotate) {
            // Convert the marker's live orientation back into the XYZ Euler the
            // camera blocks store. Read from the marker rather than recomputing,
            // so what was on screen is exactly what gets written.
            const finalQuat = Na__VideoStudio__PathVisualizer__GetMarkerQuaternion(Na__VsDrag__ActiveIndex);
            if (finalQuat) {
                Na__VsDrag__WorkEuler.setFromQuaternion(finalQuat, 'XYZ');
                Na__VideoStudio__ProjectJson__SetKeyframeRotation(videoId, keyframeId, {
                    x: Na__VsDrag__WorkEuler.x,
                    y: Na__VsDrag__WorkEuler.y,
                    z: Na__VsDrag__WorkEuler.z
                });
            }
        }

        // RESET STATE BEFORE REBUILDING | EndDragPreview rebuilds the overlay,
        // which replaces the very arrays being read above.
        Na__VsDrag__ActiveIndex      = -1;
        Na__VsDrag__ActiveKeyframeId = null;
        Na__VsDrag__PointerId        = null;
        Na__VsDrag__Mode             = Na__VsDrag__MODE_HORIZONTAL;
        Na__VsDrag__IsAxisLocked     = false;
        Na__VsDrag__LockedAxis       = null;
        Na__VsDrag__DidMove          = false;
        Na__VsDrag__DidRotate        = false;

        if (Na__VsDrag__Controls) {
            Na__VsDrag__Controls.enabled = Na__VsDrag__ControlsWereOn;
        }

        Na__VsDrag__SetCursor('');
        Na__VideoStudio__PathVisualizer__EndDragPreview();

        if (commit && (didMove || didRotate) && keyframeId) {
            window.dispatchEvent(new CustomEvent(Na__VsDrag__MOVED_EVENT, {
                detail: { videoId, keyframeId, didMove, didRotate }
            }));
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Down, Capture Phase on Window
    // ------------------------------------------------------------
    function Na__VsDrag__OnPointerDown(event) {
        if (Na__VsDrag__ActiveIndex >= 0) return;
        if (event.button !== 0)           return;                            // <-- Left button only; right stays panning
        if (!Na__VsDrag__CanDrag())       return;
        if (event.target !== Na__VsDrag__Renderer.domElement) return;        // <-- Ignore clicks on the menus

        const index = Na__VsDrag__PickAtScreen(event.clientX, event.clientY);
        if (index < 0) return;

        // Stop the event reaching the canvas so OrbitControls never sees it.
        event.preventDefault();
        event.stopPropagation();

        Na__VsDrag__BeginDrag(index, event);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Move, Drag or Hover Feedback
    // ------------------------------------------------------------
    function Na__VsDrag__OnPointerMove(event) {
        if (Na__VsDrag__ActiveIndex >= 0) {
            if (Na__VsDrag__PointerId !== null && event.pointerId !== Na__VsDrag__PointerId) return;
            event.preventDefault();
            event.stopPropagation();
            Na__VsDrag__UpdateDrag(event);
            return;
        }

        // HOVER | Only when the pointer is actually over the canvas
        if (!Na__VsDrag__CanDrag() || event.target !== Na__VsDrag__Renderer.domElement) {
            if (Na__VsDrag__Renderer) Na__VideoStudio__PathVisualizer__SetHovered(-1);
            return;
        }

        const index = Na__VsDrag__PickAtScreen(event.clientX, event.clientY);
        Na__VideoStudio__PathVisualizer__SetHovered(index);
        Na__VsDrag__SetCursor(index >= 0 ? 'grab' : '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Up, Commit the Drag
    // ------------------------------------------------------------
    function Na__VsDrag__OnPointerUp(event) {
        if (Na__VsDrag__ActiveIndex < 0) return;
        if (Na__VsDrag__PointerId !== null && event.pointerId !== Na__VsDrag__PointerId) return;

        event.preventDefault();
        event.stopPropagation();
        Na__VsDrag__EndDrag(true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Abandons a Drag
    // ------------------------------------------------------------
    function Na__VsDrag__OnKeyDown(event) {
        if (Na__VsDrag__ActiveIndex < 0) return;
        if (event.key !== 'Escape')      return;

        event.preventDefault();
        Na__VsDrag__EndDrag(false);                                          // <-- Put it back where it started
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Keyframe Dragger
    // ------------------------------------------------------------
    function Na__VideoStudio__KeyframeDragger__Initialize(options) {
        if (Na__VsDrag__IsInitialized) return;
        Na__VsDrag__IsInitialized = true;

        Na__VsDrag__Renderer = options.renderer;
        Na__VsDrag__Camera   = options.camera;
        Na__VsDrag__Controls = options.controls;

        // CAPTURE PHASE ON WINDOW | Fires before anything bound on the canvas,
        // which is how the drag wins the pointer from OrbitControls.
        window.addEventListener('pointerdown', Na__VsDrag__OnPointerDown, true);
        window.addEventListener('pointermove', Na__VsDrag__OnPointerMove, true);
        window.addEventListener('pointerup',   Na__VsDrag__OnPointerUp,   true);
        window.addEventListener('pointercancel', () => Na__VsDrag__EndDrag(false), true);
        window.addEventListener('keydown',     Na__VsDrag__OnKeyDown,     true);

        console.log('[ValeVision3D] Video Studio keyframe dragger initialized.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Drag Is In Flight
    // ------------------------------------------------------------
    function Na__VideoStudio__KeyframeDragger__IsDragging() {
        return Na__VsDrag__ActiveIndex >= 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Keyframe Dragger API
    // ------------------------------------------------------------
    export {
        Na__VsDrag__MOVED_EVENT,
        Na__VideoStudio__KeyframeDragger__Initialize,
        Na__VideoStudio__KeyframeDragger__IsDragging
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
