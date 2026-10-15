/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | HOVER INSPECTOR
   =============================================================================

   FILE       : VghLantern__Env3d__HoverInspector__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - HoverInspector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drive the hover and pin interaction over a live 3D surface
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The controller for the model inspection feature. It owns the pointer
     listeners, the raycast, and the pinned state, and it is the only module that
     knows those three things belong together.
   - Composes the other three parts rather than reimplementing them: PickIndex
     names the object, HighlightLayer shades the model, InspectStats writes the
     facts. This module decides when each runs.
   - Reports outward through one callback, already composed. The consuming mode
     module receives a finished payload and never touches Three.js, a raycaster or
     the scene graph.

   ---------------------------------------------------------------------------

   INTERACTION MODEL:
       move            picks under the cursor, at most once per animation frame
       drag            suppressed - a pointer that has travelled past the click
                       tolerance is orbiting, not inspecting
       click           pins the current target, locking highlight and panel
       click again     releases that pin
       click nothing   releases any pin
       Escape          releases any pin

   While a target is pinned, hover picking stops entirely. The pin is a lock, so
   the reviewer can orbit right around a member and keep reading its figures.

   ---------------------------------------------------------------------------

   WHY THE PICK IS FRAME THROTTLED:
   A pointermove burst can fire a dozen events between two painted frames, and a
   raycast against a merged bar mesh is real work. Coalescing into one pick per
   animation frame caps the cost at exactly what the display can show.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__PickIndex__Resolve, VghLantern__Env3d__PickIndex__InstanceKey, VghLantern__Env3d__PickIndex__RaycastRoots, VghLantern__Env3d__PickIndex__IsVisible } from './VghLantern__Env3d__PickIndex__.mjs';
import { VghLantern__CrossSection__IsPointClipped } from '../26__System__CrossSectionView/VghLantern__CrossSection__SystemLogic__.mjs';
import { VghLantern__Env3d__HighlightLayer__Apply, VghLantern__Env3d__HighlightLayer__Clear } from './VghLantern__Env3d__HighlightLayer__.mjs';
import { VghLantern__Env3d__InspectStats__Describe } from './VghLantern__Env3d__InspectStats__.mjs';

// =============================================================================
// REGION | 3D Hover Inspector Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Interaction Constants
    // ------------------------------------------------------------
    const KEY_RELEASE_PIN  =  'Escape';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State Access
// -----------------------------------------------------------------------------

    // FUNCTION | Whether a Surface Currently Has an Inspector Attached
    // ------------------------------------------------------------
    export function VghLantern__Env3d__HoverInspector__IsAttached(surface) {
        return !!(surface && surface.InspectorState);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Picking
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Raycast at the Last Known Pointer Position
    // ------------------------------------------------------------
    // Walks the hit list rather than taking hits[0], because an object whose
    // category is switched off in config carries no pick table and should be seen
    // straight through rather than blocking what is behind it.
    //
    // Hits inside a cross section's removed half are skipped for the same reason.
    // Clipping is a shader effect, so the raycaster still finds the half that was
    // cut away, and without this the cursor would name a member that is not on
    // screen while ignoring the one the reviewer opened the section to look at.
    function VghLantern__Env3d__HoverInspector__PickAtPointer(surface) {
        const state  =  surface.InspectorState;
        if (!state || !surface.Camera) return null;

        const rect  =  state.Canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;

        state.PointerNdc.x  =   ((state.PointerClientX - rect.left) / rect.width)  * 2 - 1;
        state.PointerNdc.y  =  -((state.PointerClientY - rect.top)  / rect.height) * 2 + 1;

        state.Raycaster.setFromCamera(state.PointerNdc, surface.Camera);

        const hits  =  state.Raycaster.intersectObjects(VghLantern__Env3d__PickIndex__RaycastRoots(surface), true);

        for (let i = 0; i < hits.length; i++) {
            if (VghLantern__CrossSection__IsPointClipped(surface, hits[i].point)) continue;
            const resolved  =  VghLantern__Env3d__PickIndex__Resolve(hits[i]);
            if (resolved) return resolved;
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Outward Reporting
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Hand a Composed Payload to the Consumer
    // ------------------------------------------------------------
    // The description is composed here rather than by the consumer, so a mode
    // module never needs to know what a solver record looks like.
    function VghLantern__Env3d__HoverInspector__Notify(surface, pick, isPinned) {
        const state  =  surface.InspectorState;
        if (!state || typeof state.OnTargetChanged !== 'function') return;

        if (!pick) {
            state.OnTargetChanged(null);
            return;
        }

        state.OnTargetChanged({
            Pick        : pick,
            Description : VghLantern__Env3d__InspectStats__Describe(pick, surface.LastSkeleton, surface.LastLantern),
            IsPinned    : isPinned === true,
            PointerX    : state.PointerClientX,
            PointerY    : state.PointerClientY
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Adopt a New Active Target and Report It
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__SetTarget(surface, pick, isPinned) {
        const state  =  surface.InspectorState;

        state.ActiveKey  =  pick ? VghLantern__Env3d__PickIndex__InstanceKey(pick) : '';
        VghLantern__Env3d__HighlightLayer__Apply(surface, pick);
        VghLantern__Env3d__HoverInspector__Notify(surface, pick, isPinned);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Throttled Hover
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Resolve the Hover Target for This Frame
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__RunHover(surface) {
        const state  =  surface.InspectorState;
        if (!state || surface.IsDestroyed) return;

        state.FrameHandle  =  0;
        if (state.PinnedPick) return;                                        // <-- Pinned is a lock, hover does not fight it

        const pick  =  VghLantern__Env3d__HoverInspector__PickAtPointer(surface);
        const key   =  pick ? VghLantern__Env3d__PickIndex__InstanceKey(pick) : '';

        if (key !== state.ActiveKey) {
            VghLantern__Env3d__HoverInspector__SetTarget(surface, pick, false);
            return;
        }

        // Same instance, moved cursor. The highlight is already correct, so only
        // the panel needs telling, which is what keeps it following the pointer.
        if (key) VghLantern__Env3d__HoverInspector__Notify(surface, pick, false);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Hover Pass for the Next Animation Frame
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__ScheduleHover(surface) {
        const state  =  surface.InspectorState;
        if (!state || state.FrameHandle) return;                             // <-- Already queued for this frame

        state.FrameHandle  =  requestAnimationFrame(function() {
            VghLantern__Env3d__HoverInspector__RunHover(surface);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pin Handling
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Release Any Pinned Target
    // ------------------------------------------------------------
    // Falls straight back to hover rather than to nothing, so releasing a pin with
    // the cursor still over a member leaves that member highlighted.
    function VghLantern__Env3d__HoverInspector__ReleasePin(surface) {
        const state  =  surface.InspectorState;
        if (!state || !state.PinnedPick) return;

        state.PinnedPick  =  null;
        state.PinnedKey   =  '';
        state.ActiveKey   =  '';                                             // <-- Force the next hover pass to re-apply

        VghLantern__Env3d__HoverInspector__RunHover(surface);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Click That Was Not an Orbit Drag
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__HandleClick(surface) {
        const state  =  surface.InspectorState;
        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('HoverInspector', 'PinOnClick')) return;

        const pick  =  VghLantern__Env3d__HoverInspector__PickAtPointer(surface);

        if (!pick) {
            VghLantern__Env3d__HoverInspector__ReleasePin(surface);
            return;
        }

        const key  =  VghLantern__Env3d__PickIndex__InstanceKey(pick);

        if (state.PinnedPick && key === state.PinnedKey) {
            VghLantern__Env3d__HoverInspector__ReleasePin(surface);           // <-- Clicking the pinned object toggles it off
            return;
        }

        state.PinnedPick  =  pick;
        state.PinnedKey   =  key;
        VghLantern__Env3d__HoverInspector__SetTarget(surface, pick, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer and Key Binding
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Register a Listener and Remember It for Detach
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__Listen(state, target, type, handler) {
        target.addEventListener(type, handler);
        state.Listeners.push({ Target : target, Type : type, Handler : handler });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Every Interaction Listener for a Surface
    // ------------------------------------------------------------
    function VghLantern__Env3d__HoverInspector__Bind(surface) {
        const state      =  surface.InspectorState;
        const canvas     =  state.Canvas;
        const clickSlop  =  VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'ClickMoveTolerancePx');

        VghLantern__Env3d__HoverInspector__Listen(state, canvas, 'pointermove', function(ev) {
            state.PointerClientX  =  ev.clientX;
            state.PointerClientY  =  ev.clientY;

            if (state.IsPointerDown) {
                const travelled  =  Math.abs(ev.clientX - state.DownClientX) + Math.abs(ev.clientY - state.DownClientY);
                if (travelled > clickSlop) state.IsDragging  =  true;
                return;                                                      // <-- Orbiting, not inspecting
            }

            VghLantern__Env3d__HoverInspector__ScheduleHover(surface);
        });

        VghLantern__Env3d__HoverInspector__Listen(state, canvas, 'pointerdown', function(ev) {
            state.IsPointerDown  =  true;
            state.IsDragging     =  false;
            state.DownClientX    =  ev.clientX;
            state.DownClientY    =  ev.clientY;
            state.PointerClientX =  ev.clientX;
            state.PointerClientY =  ev.clientY;
        });

        VghLantern__Env3d__HoverInspector__Listen(state, canvas, 'pointerup', function(ev) {
            const wasDragging  =  state.IsDragging;

            state.IsPointerDown  =  false;
            state.IsDragging     =  false;
            state.PointerClientX =  ev.clientX;
            state.PointerClientY =  ev.clientY;

            if (wasDragging) {
                VghLantern__Env3d__HoverInspector__ScheduleHover(surface);    // <-- The orbit moved the model under the cursor
                return;
            }
            if (ev.button !== 0) return;                                     // <-- Right and middle are the controls' pan and dolly

            VghLantern__Env3d__HoverInspector__HandleClick(surface);
        });

        VghLantern__Env3d__HoverInspector__Listen(state, canvas, 'pointerleave', function() {
            state.IsPointerDown  =  false;
            state.IsDragging     =  false;
            if (state.PinnedPick) return;                                    // <-- A pinned target survives the cursor leaving

            VghLantern__Env3d__HoverInspector__SetTarget(surface, null, false);
        });

        // Zooming moves the model under a stationary cursor, so the target can
        // change with no pointer event at all.
        VghLantern__Env3d__HoverInspector__Listen(state, canvas, 'wheel', function() {
            VghLantern__Env3d__HoverInspector__ScheduleHover(surface);
        });

        VghLantern__Env3d__HoverInspector__Listen(state, window, 'keydown', function(ev) {
            if (ev.key === KEY_RELEASE_PIN) VghLantern__Env3d__HoverInspector__ReleasePin(surface);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Inspector to a Live Surface
    // ------------------------------------------------------------
    // onTargetChanged receives a composed payload, or null when nothing is under
    // the cursor. Returns false when config has the feature switched off, so a
    // caller can leave its own panel unbuilt.
    export function VghLantern__Env3d__HoverInspector__Attach(surface, onTargetChanged) {
        if (!surface || surface.IsDestroyed || !surface.Renderer) return false;
        if (surface.InspectorState) return true;                             // <-- Already attached, idempotent

        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('HoverInspector', 'Enabled')) return false;

        const raycaster  =  new THREE.Raycaster();

        // The default line threshold is one world unit, which in a metre-scale
        // scene is a one metre pick radius. Line mode members need a tolerance
        // stated in millimetres like every other dimension in this application.
        const lineToleranceMm  =  VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'LinePickToleranceMm');
        raycaster.params.Line.threshold  =  VghLantern__Env3d__ConfigAccess__MmToWorld(lineToleranceMm);

        surface.InspectorState  =  {
            Canvas           : surface.Renderer.domElement,
            Raycaster        : raycaster,
            PointerNdc       : new THREE.Vector2(),
            OnTargetChanged  : onTargetChanged,
            Listeners        : [],
            FrameHandle      : 0,
            PointerClientX   : 0,
            PointerClientY   : 0,
            IsPointerDown    : false,
            IsDragging       : false,
            DownClientX      : 0,
            DownClientY      : 0,
            ActiveKey        : '',
            PinnedKey        : '',
            PinnedPick       : null
        };

        VghLantern__Env3d__HoverInspector__Bind(surface);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop Any Active Target Without Detaching
    // ------------------------------------------------------------
    // Called before a model rebuild, and before a snapshot capture: the highlight
    // shades the live scene, and a sheet drawing must never be issued showing one
    // member picked out in accent blue.
    export function VghLantern__Env3d__HoverInspector__Clear(surface) {
        if (!surface) return;

        const state  =  surface.InspectorState;
        if (state) {
            if (state.FrameHandle) cancelAnimationFrame(state.FrameHandle);
            state.FrameHandle  =  0;
            state.PinnedPick   =  null;
            state.PinnedKey    =  '';
            state.ActiveKey    =  '';
        }

        VghLantern__Env3d__HighlightLayer__Clear(surface);
        if (state && typeof state.OnTargetChanged === 'function') state.OnTargetChanged(null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop the Current Target if a View Change Just Hid It
    // ------------------------------------------------------------
    // Element view and display mode both toggle .visible with no pointer movement
    // and no rebuild - the two events everything else here already keys off - so a
    // pin or a live hover would otherwise keep reporting on a member the reviewer
    // just told the viewport to hide until the cursor happened to move again.
    //
    // A pinned target is released outright, which falls back to hover exactly as
    // clicking it a second time would. A live hover has no stored object to test,
    // only its key, so it is cleared and re-run immediately against the pointer's
    // last known position rather than left to wait for the next frame.
    export function VghLantern__Env3d__HoverInspector__RevalidateTarget(surface) {
        const state  =  surface && surface.InspectorState;
        if (!state) return;

        if (state.PinnedPick) {
            if (!VghLantern__Env3d__PickIndex__IsVisible(state.PinnedPick.Object3d)) {
                VghLantern__Env3d__HoverInspector__ReleasePin(surface);
            }
            return;
        }

        if (state.ActiveKey) {
            state.ActiveKey  =  '';                                          // <-- Force the next pass to re-resolve rather than trust a stale key
            VghLantern__Env3d__HoverInspector__RunHover(surface);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Detach the Inspector and Release Its Listeners
    // ------------------------------------------------------------
    export function VghLantern__Env3d__HoverInspector__Detach(surface) {
        if (!surface || !surface.InspectorState) return;

        VghLantern__Env3d__HoverInspector__Clear(surface);

        const listeners  =  surface.InspectorState.Listeners;
        for (let i = 0; i < listeners.length; i++) {
            listeners[i].Target.removeEventListener(listeners[i].Type, listeners[i].Handler);
        }

        surface.InspectorState  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
