/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | INTERACTION
   =============================================================================

   FILE       : NaAudio__Env3d__Interaction__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - Interaction
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn pointer events into hovers, clicks and drags on 3D objects
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - One raycaster and one set of pointer listeners for the whole application. Any
     object that wants to be interactive registers a handle here.
   - Registration is by object, not by module, so a module can expose several
     independently grabbable parts - a sequencer step, a cube face, a resize
     handle on a DelayCloud - without any of them needing pointer plumbing.

   ---------------------------------------------------------------------------

   WHY ONE CENTRAL RAYCASTER

   Raycasting is the expensive half of 3D interaction. Every module running its own
   raycaster against its own subtree would mean, on a pointermove, one traversal per
   module - and each of them would independently decide it had been hit, because
   none of them can see that something nearer to the camera was hit first.

   One raycaster, one sorted intersection list, one winner. Occlusion then works for
   free: the nearest registered handle wins, which is the behaviour a user expects
   and is impossible to get right with per-module raycasting.

   ---------------------------------------------------------------------------

   THE DRAG THRESHOLD

   A pointerup is only a click if the pointer moved less than PointerDragThresholdPx
   since pointerdown. Without that, every click nudges whatever was clicked by a
   pixel or two of hand tremor, and a carefully arranged space slowly rots over an
   afternoon of work. It is four pixels and it matters.

   ---------------------------------------------------------------------------

   HOVER THROTTLE

   Hover raycasting is throttled to roughly 30Hz. A high-polling-rate mouse fires
   pointermove far faster than the display refreshes, and at that rate the raycast
   costs more than the render does. A hand on a mouse cannot tell the difference.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool }               from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__Env3d__SceneGroupSet__Pickable
} from './NaAudio__Env3d__SceneManager__.mjs';
import { NaAudio__Env3d__GroundStage__FloorMesh } from './NaAudio__Env3d__GroundStage__.mjs';
import {
    NaAudio__ModeManager__Allows
} from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';

// =============================================================================
// REGION | Interaction
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Handle Kinds
    // ------------------------------------------------------------
    // What a registered handle does when grabbed. Published so a module declares
    // its intent rather than reimplementing drag arithmetic.
    export const NaAudio__Env3d__HandleKind  =  Object.freeze({
        Click       : 'click',                                                // <-- Click only; no drag behaviour
        DragGround  : 'dragGround',                                           // <-- Drags across the ground plane; module placement
        DragAxis    : 'dragAxis',                                             // <-- Drags along one local axis; DelayCloud resize handles
        DragSurface : 'dragSurface'                                           // <-- Drags across the object's own face; CubeMod XY pads
    });
    // ------------------------------------------------------------


    // MODULE VARIABLES | Registry and Pointer State
    // ------------------------------------------------------------
    const HANDLES             =  new Map();                                  // <-- Object3D uuid -> handle record
    const POINTER_MOVE_HOOKS  =  [];                                         // <-- Called on every move, drag or not

    const RAYCASTER      =  new THREE.Raycaster();
    const POINTER_NDC    =  new THREE.Vector2();
    const DRAG_PLANE     =  new THREE.Plane();
    const HEIGHT_PLANE   =  new THREE.Plane();
    const HEIGHT_PLANE_NORMAL  =  new THREE.Vector3(0, 1, 0);
    const SCRATCH_HIT    =  new THREE.Vector3();
    const SCRATCH_START   = new THREE.Vector3();
    const SCRATCH_NORMAL  = new THREE.Vector3();
    const SCRATCH_AXIS    = new THREE.Vector3();

    let attachedSurface   =  null;
    let hoveredHandle     =  null;
    let activeDrag        =  null;                                           // <-- { Handle, StartPoint, StartValue, PointerId }
    let pointerDownAt     =  null;                                           // <-- { X, Y, Handle }
    let lastHoverAtMs     =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handle Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register an Interactive Handle on a 3D Object
    // ------------------------------------------------------------
    // options:
    //   Kind        one of NaAudio__Env3d__HandleKind
    //   ModuleId    owning module, published on hover and select events
    //   OnClick     (handle) => void
    //   OnHover     (isHovered, handle) => void
    //   OnDragStart (context) => void
    //   OnDrag      (context) => void          context carries Delta and Point
    //   OnDragEnd   (context) => void
    //   Axis        THREE.Vector3, required for DragAxis
    //   Cursor      CSS cursor while hovered
    //   Data        anything the module wants handed back to it
    //   ClickModes  array of NaAudio__Mode values the CLICK is live in. Omit for both.
    //   DragModes   array of NaAudio__Mode values the DRAG is live in. Omit for both.
    //
    // The two mode lists are separate because a module pad genuinely needs them to
    // differ: it can be SELECTED in either mode, but it may only be MOVED in Build.
    // Collapsing them into one flag would mean either an unselectable module in Play
    // or a movable one, and both are wrong.
    //
    // Returns an unregister function. A module shell MUST call it on teardown, or
    // the raycaster keeps a reference to a disposed mesh alive forever.
    export function NaAudio__Env3d__Interaction__Register(object3d, options) {
        if (!object3d) return () => {};

        object3d.userData.NaAudio__Pickable  =  true;

        const handle  =  {
            Object      : object3d,
            Kind        : options.Kind || NaAudio__Env3d__HandleKind.Click,
            ModuleId    : options.ModuleId || null,
            OnClick     : options.OnClick     || null,
            OnHover     : options.OnHover     || null,
            OnDragStart : options.OnDragStart || null,
            OnDrag      : options.OnDrag      || null,
            OnDragEnd   : options.OnDragEnd   || null,
            Axis        : options.Axis        || null,
            Cursor      : options.Cursor      || 'pointer',
            Data        : options.Data        || null,
            ClickModes  : options.ClickModes  || null,                        // <-- null means live in both modes
            DragModes   : options.DragModes   || null
        };

        HANDLES.set(object3d.uuid, handle);

        return function NaAudio__Env3d__Interaction__Unregister() {
            if (hoveredHandle === handle) hoveredHandle  =  null;
            if (activeDrag && activeDrag.Handle === handle) activeDrag  =  null;
            HANDLES.delete(object3d.uuid);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Count of Registered Handles
    // ------------------------------------------------------------
    // For the diagnostics readout. A count that only grows across space reloads is
    // the signature of a module shell that forgot to unregister.
    export function NaAudio__Env3d__Interaction__HandleCount() {
        return HANDLES.size;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Raycasting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Pointer Event to Normalised Device Coordinates
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__UpdatePointer(event) {
        const rect  =  attachedSurface.Renderer.domElement.getBoundingClientRect();
        POINTER_NDC.x  =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        POINTER_NDC.y  = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Walk Up From an Intersected Object to Its Registered Handle
    // ------------------------------------------------------------
    // A registered handle may be a group whose children were actually hit, so the
    // search climbs the parent chain. It stops at the scene root rather than looping
    // forever on a detached object.
    function NaAudio__Env3d__Interaction__HandleForObject(object3d) {
        let current  =  object3d;

        while (current) {
            const handle  =  HANDLES.get(current.uuid);
            if (handle) return handle;
            if (current === attachedSurface.Scene) return null;
            current  =  current.parent;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Handle Does Anything At All In the Current Mode
    // ------------------------------------------------------------
    // A handle with neither a live click nor a live drag is skipped by the picker
    // rather than merely ignored on activation. That distinction matters: a skipped
    // handle does not take the hover, does not set the cursor and - critically - does
    // not occlude whatever sits behind it. In Build mode a sequencer's sixty-four steps
    // therefore stop standing between the pointer and the pad it is reaching for.
    function NaAudio__Env3d__Interaction__IsHandleLive(handle) {
        const clickLive  =  handle.OnClick && NaAudio__ModeManager__Allows(handle.ClickModes);
        const dragLive   =  (handle.OnDrag || handle.OnDragStart) && NaAudio__ModeManager__Allows(handle.DragModes);
        return !!(clickLive || dragLive);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Find the Nearest Registered Handle Under the Pointer
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__PickHandle() {
        if (HANDLES.size === 0) return null;

        RAYCASTER.setFromCamera(POINTER_NDC, attachedSurface.Camera);

        const roots  =  [];
        for (let i = 0; i < NaAudio__Env3d__SceneGroupSet__Pickable.length; i++) {
            const group  =  attachedSurface.Groups[NaAudio__Env3d__SceneGroupSet__Pickable[i]];
            if (group) roots.push(group);
        }

        const intersections  =  RAYCASTER.intersectObjects(roots, true);      // <-- Sorted nearest first by THREE

        for (let i = 0; i < intersections.length; i++) {
            const handle  =  NaAudio__Env3d__Interaction__HandleForObject(intersections[i].object);
            if (!handle) continue;
            if (!NaAudio__Env3d__Interaction__IsHandleLive(handle)) continue;   // <-- Dead in this mode; keep looking behind it

            return { Handle: handle, Intersection: intersections[i] };
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Live Handle Under the Pointer Right Now
    // ------------------------------------------------------------
    // Exposed for one specific job: resolving what a drag was DROPPED on. The pointer
    // handlers cannot answer that themselves, because a drag ends with a pointerup whose
    // whole purpose is that the pointer is no longer over the thing it grabbed.
    //
    // The wiring controller uses it to decide whether a lead landed in a socket. Mode
    // filtering applies exactly as it does to any other pick, so a drop onto something
    // inert in the current mode reads as a drop onto nothing - which is correct.
    export function NaAudio__Env3d__Interaction__HandleUnderPointer() {
        const picked  =  NaAudio__Env3d__Interaction__PickHandle();
        return picked ? picked.Handle : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Hook Called on Every Pointer Move
    // ------------------------------------------------------------
    // Fires on every move, INCLUDING during a drag and including moves the hover
    // throttle skips. That is the point: a hook here is for something that has to track
    // the pointer continuously - the ghost cable stretching from a socket to the hand -
    // and a throttled or drag-suppressed version of that visibly stutters.
    //
    // Hooks are handed the ground-plane point at a height they choose, not the raw
    // event, so nothing outside this file has to know how a screen position becomes a
    // world one.
    export function NaAudio__Env3d__Interaction__AddPointerMoveHook(hook) {
        POINTER_MOVE_HOOKS.push(hook);

        return function NaAudio__Env3d__Interaction__RemovePointerMoveHook() {
            const index  =  POINTER_MOVE_HOOKS.indexOf(hook);
            if (index >= 0) POINTER_MOVE_HOOKS.splice(index, 1);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Raycast the Pointer Onto a Horizontal Plane at a Given Height
    // ------------------------------------------------------------
    // Used by the wiring controller to place the loose end of a lead at socket height
    // rather than on the floor. A lead that drops to the ground between clicks reads as
    // dropped rather than as held.
    export function NaAudio__Env3d__Interaction__PointerAtHeight(height, out) {
        HEIGHT_PLANE.set(HEIGHT_PLANE_NORMAL, -height);

        RAYCASTER.setFromCamera(POINTER_NDC, attachedSurface.Camera);
        return RAYCASTER.ray.intersectPlane(HEIGHT_PLANE, out || new THREE.Vector3());
    }
    // ------------------------------------------------------------


    // FUNCTION | Raycast the Pointer Onto the Ground Plane
    // ------------------------------------------------------------
    // Exposed because the HUD's add-module flow needs a ground point without going
    // through a handle.
    export function NaAudio__Env3d__Interaction__GroundPoint(out) {
        const floor  =  NaAudio__Env3d__GroundStage__FloorMesh(attachedSurface);
        if (!floor) return null;

        RAYCASTER.setFromCamera(POINTER_NDC, attachedSurface.Camera);
        const hits  =  RAYCASTER.intersectObject(floor, false);
        if (hits.length === 0) return null;

        return (out || new THREE.Vector3()).copy(hits[0].point);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drag Plane Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Plane a Drag Will Be Projected Onto
    // ------------------------------------------------------------
    // Each handle kind drags on a different plane, and getting this wrong is what
    // makes a 3D drag feel like it is fighting the user:
    //   DragGround  - the horizontal plane through the grab point. Module placement.
    //   DragSurface - the face that was grabbed. A cube-face XY pad.
    //   DragAxis    - a plane containing the axis and facing the camera, so the
    //                 pointer can never be parallel to the axis and lose the drag.
    function NaAudio__Env3d__Interaction__BuildDragPlane(handle, intersection) {
        if (handle.Kind === NaAudio__Env3d__HandleKind.DragSurface && intersection.face) {
            SCRATCH_NORMAL.copy(intersection.face.normal)
                          .transformDirection(intersection.object.matrixWorld)
                          .normalize();
            DRAG_PLANE.setFromNormalAndCoplanarPoint(SCRATCH_NORMAL, intersection.point);
            return;
        }

        if (handle.Kind === NaAudio__Env3d__HandleKind.DragAxis && handle.Axis) {
            SCRATCH_AXIS.copy(handle.Axis).normalize();

            attachedSurface.Camera.getWorldDirection(SCRATCH_NORMAL);
            SCRATCH_NORMAL.cross(SCRATCH_AXIS).cross(SCRATCH_AXIS).normalize();

            if (SCRATCH_NORMAL.lengthSq() < 0.0001) SCRATCH_NORMAL.set(0, 1, 0);  // <-- Axis pointing straight at the camera
            DRAG_PLANE.setFromNormalAndCoplanarPoint(SCRATCH_NORMAL, intersection.point);
            return;
        }

        SCRATCH_NORMAL.set(0, 1, 0);
        DRAG_PLANE.setFromNormalAndCoplanarPoint(SCRATCH_NORMAL, intersection.point);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Project the Pointer Onto the Active Drag Plane
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__ProjectOntoDragPlane(out) {
        RAYCASTER.setFromCamera(POINTER_NDC, attachedSurface.Camera);
        return RAYCASTER.ray.intersectPlane(DRAG_PLANE, out);                 // <-- null if the ray is parallel to the plane
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer Handlers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Handle Pointer Move - Hover and Drag
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__OnPointerMove(event) {
        NaAudio__Env3d__Interaction__UpdatePointer(event);

        // Run before the drag branch returns, so a hook tracking the pointer keeps
        // tracking it while something is being dragged.
        for (let i = 0; i < POINTER_MOVE_HOOKS.length; i++) {
            POINTER_MOVE_HOOKS[i]();
        }

        if (activeDrag) {
            NaAudio__Env3d__Interaction__AdvanceDrag();
            return;
        }

        const throttleMs  =  Env3dNumber('Interaction', 'HoverRaycastThrottleMs');
        const now         =  performance.now();
        if (now - lastHoverAtMs < throttleMs) return;
        lastHoverAtMs  =  now;

        const picked   =  NaAudio__Env3d__Interaction__PickHandle();
        const handle   =  picked ? picked.Handle : null;
        if (handle === hoveredHandle) return;

        if (hoveredHandle && hoveredHandle.OnHover) hoveredHandle.OnHover(false, hoveredHandle);
        hoveredHandle  =  handle;
        if (hoveredHandle && hoveredHandle.OnHover) hoveredHandle.OnHover(true, hoveredHandle);

        // The cursor reports what this handle will actually DO in the current mode, not
        // what it can do in general. A pad shows 'grab' in Build and 'pointer' in Play,
        // so the mode is legible from the pointer alone without reading the indicator.
        attachedSurface.Renderer.domElement.style.cursor  =  handle
            ? (NaAudio__ModeManager__Allows(handle.DragModes) ? handle.Cursor : 'pointer')
            : 'default';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Pointer Down - Begin a Drag or Arm a Click
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__OnPointerDown(event) {
        if (event.button !== 0) return;                                       // <-- Left button only; right and middle belong to the camera

        NaAudio__Env3d__Interaction__UpdatePointer(event);

        const picked  =  NaAudio__Env3d__Interaction__PickHandle();
        if (!picked) {
            pointerDownAt  =  { X: event.clientX, Y: event.clientY, Handle: null };
            return;
        }

        const handle  =  picked.Handle;
        pointerDownAt =  { X: event.clientX, Y: event.clientY, Handle: handle };

        if (handle.Kind === NaAudio__Env3d__HandleKind.Click) return;         // <-- Nothing to drag; the click fires on pointerup

        // A handle can be pickable for its CLICK while its DRAG is dead in this mode -
        // a module pad in Play mode is exactly that. Without this check the pad would
        // still be draggable in Play, which is the whole thing modes exist to prevent.
        if (!NaAudio__ModeManager__Allows(handle.DragModes)) return;

        // Grabbing a handle must take the camera out of the equation, or an orbit
        // and a drag happen simultaneously and neither does what was asked.
        attachedSurface.Controls.enabled  =  false;

        NaAudio__Env3d__Interaction__BuildDragPlane(handle, picked.Intersection);
        SCRATCH_START.copy(picked.Intersection.point);

        activeDrag  =  {
            Handle     : handle,
            StartPoint : SCRATCH_START.clone(),
            LastPoint  : SCRATCH_START.clone(),
            PointerId  : event.pointerId
        };

        attachedSurface.Renderer.domElement.setPointerCapture(event.pointerId);

        if (handle.OnDragStart) {
            handle.OnDragStart({
                Handle : handle,
                Point  : activeDrag.StartPoint,
                Delta  : new THREE.Vector3(),
                Total  : new THREE.Vector3(),
                Data   : handle.Data
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Advance an Active Drag by One Pointer Move
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__AdvanceDrag() {
        const point  =  NaAudio__Env3d__Interaction__ProjectOntoDragPlane(SCRATCH_HIT);
        if (!point) return;                                                   // <-- Ray parallel to the plane; hold the last position

        const handle  =  activeDrag.Handle;

        const delta  =  point.clone().sub(activeDrag.LastPoint);
        const total  =  point.clone().sub(activeDrag.StartPoint);

        if (handle.Kind === NaAudio__Env3d__HandleKind.DragAxis && handle.Axis) {
            SCRATCH_AXIS.copy(handle.Axis).normalize();

            // The dot products are taken FIRST, into locals, and only then is each
            // vector overwritten.
            //
            // Written as delta.copy(axis).multiplyScalar(delta.dot(axis)) this reads
            // correctly and is silently wrong: JavaScript evaluates delta.copy(axis)
            // before it evaluates the argument, so by the time delta.dot(axis) runs,
            // delta IS axis and the dot product is axis·axis - which is 1, always.
            //
            // Every axis drag therefore reported exactly one metre of travel in the
            // positive direction, no matter how far or which way the pointer actually
            // moved. On a slider that is a control which jumps to one end and then
            // refuses to come back; on the DelayCloud's resize handles it is a box that
            // only ever grows.
            const axialDelta  =  delta.dot(SCRATCH_AXIS);
            const axialTotal  =  total.dot(SCRATCH_AXIS);

            delta.copy(SCRATCH_AXIS).multiplyScalar(axialDelta);              // <-- Constrained: only the axial component survives
            total.copy(SCRATCH_AXIS).multiplyScalar(axialTotal);
        }

        activeDrag.LastPoint.copy(point);

        if (handle.OnDrag) {
            handle.OnDrag({
                Handle : handle,
                Point  : point,
                Delta  : delta,
                Total  : total,
                Data   : handle.Data
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Pointer Up - End a Drag or Fire a Click
    // ------------------------------------------------------------
    function NaAudio__Env3d__Interaction__OnPointerUp(event) {
        const threshold  =  Env3dNumber('Interaction', 'PointerDragThresholdPx');

        const movedFar  =  pointerDownAt
            ? (Math.abs(event.clientX - pointerDownAt.X) > threshold || Math.abs(event.clientY - pointerDownAt.Y) > threshold)
            : true;

        if (activeDrag) {
            const handle  =  activeDrag.Handle;

            if (handle.OnDragEnd) {
                handle.OnDragEnd({
                    Handle : handle,
                    Point  : activeDrag.LastPoint,
                    Delta  : new THREE.Vector3(),
                    Total  : activeDrag.LastPoint.clone().sub(activeDrag.StartPoint),
                    Data   : handle.Data
                });
            }

            // A grab that never moved is still a click. Without this, tapping a
            // draggable module to select it does nothing at all.
            if (!movedFar && handle.OnClick) handle.OnClick(handle);

            if (attachedSurface.Renderer.domElement.hasPointerCapture(event.pointerId)) {
                attachedSurface.Renderer.domElement.releasePointerCapture(event.pointerId);
            }

            activeDrag  =  null;
            attachedSurface.Controls.enabled  =  true;
            pointerDownAt  =  null;
            return;
        }

        if (pointerDownAt && pointerDownAt.Handle && !movedFar && pointerDownAt.Handle.OnClick) {
            pointerDownAt.Handle.OnClick(pointerDownAt.Handle);
        } else if (pointerDownAt && !pointerDownAt.Handle && !movedFar) {
            NaAudio__Env3d__Interaction__PublishEmptyClick();
        }

        pointerDownAt  =  null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Notify Listeners That Empty Space Was Clicked
    // ------------------------------------------------------------
    // Clicking the floor clears the selection. Held as a settable callback rather
    // than an event so the module registry owns what 'nothing selected' means.
    let onEmptyClick  =  null;

    function NaAudio__Env3d__Interaction__PublishEmptyClick() {
        if (onEmptyClick) onEmptyClick();
    }

    export function NaAudio__Env3d__Interaction__SetEmptyClickHandler(handler) {
        onEmptyClick  =  handler;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Attach Pointer Listeners to a Surface
    // ------------------------------------------------------------
    export function NaAudio__Env3d__Interaction__Attach(surface) {
        attachedSurface  =  surface;

        const element  =  surface.Renderer.domElement;
        element.addEventListener('pointermove',   NaAudio__Env3d__Interaction__OnPointerMove);
        element.addEventListener('pointerdown',   NaAudio__Env3d__Interaction__OnPointerDown);
        element.addEventListener('pointerup',     NaAudio__Env3d__Interaction__OnPointerUp);
        element.addEventListener('pointercancel', NaAudio__Env3d__Interaction__OnPointerUp);

        // A pointer that leaves the window mid-drag never delivers a pointerup to
        // the canvas, and the drag would otherwise stay live with the camera locked
        // out - the app appearing to freeze.
        window.addEventListener('pointerup', function (event) {
            if (activeDrag && event.pointerId === activeDrag.PointerId) {
                NaAudio__Env3d__Interaction__OnPointerUp(event);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Snap a Ground Position to the Configured Grid
    // ------------------------------------------------------------
    // Exposed for module placement drags. Snapping keeps a hand-arranged space tidy
    // without the user having to be precise, and the spacing is a config value so
    // the tidiness is tunable rather than baked in.
    export function NaAudio__Env3d__Interaction__SnapToGrid(position) {
        if (!Env3dBool('Interaction', 'DragSnapEnabled')) return position;

        const spacing  =  Env3dNumber('Interaction', 'DragSnapSpacing');
        position.x  =  Math.round(position.x / spacing) * spacing;
        position.z  =  Math.round(position.z / spacing) * spacing;
        return position;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
