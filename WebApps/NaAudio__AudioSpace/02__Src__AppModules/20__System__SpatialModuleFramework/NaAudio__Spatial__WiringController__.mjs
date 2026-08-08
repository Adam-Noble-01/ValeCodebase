/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | WIRING CONTROLLER
   =============================================================================

   FILE       : NaAudio__Spatial__WiringController__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - WiringController
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn a gesture between two sockets into a connection
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Owns the act of patching: which socket is held, the loose lead following the
     pointer, and what happens when it lands.
   - Two gestures, one state machine. Drag from a socket and release on another; or
     click a socket, move, and click the second. Both work, and neither has a mode of
     its own.

   ---------------------------------------------------------------------------

   WHY BOTH GESTURES, FROM ONE MACHINE

   Dragging is what a hand expects from a cable. Clicking twice is what works when the
   two sockets are far apart, when the camera needs orbiting between them, and on a
   touch screen where a long drag across a 3D scene is genuinely awkward.

   Implementing them separately would mean two ways to be half-patched and two ways to
   cancel. Instead there is ONE piece of state - the held port - and the gestures are
   just different ways of setting and clearing it:

       drag start        hold the port
       drag release      on a socket, land. on nothing, keep holding.
       click             hold if nothing is held, land if something is.

   'Release on nothing keeps holding' is what makes the two gestures the same machine. A
   drag that ends in mid-air becomes a click-click in progress rather than a failure, so
   a user who half-committed to a drag has not lost anything.

   ---------------------------------------------------------------------------

   DIRECTION IS RESOLVED, NOT DEMANDED

   A patch can be made output-first or input-first and the controller sorts it out. Every
   physical patch bay works this way and asking the user to remember which end to start
   from would be a rule with no purpose.

   Two sockets of the same kind is the one combination that cannot be resolved, and it is
   refused with a reason rather than silently ignored - a gesture that does nothing and
   says nothing is indistinguishable from a bug in the picker.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette       from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as CableFactory  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__CableFactory__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import {
    NaAudio__Env3d__Interaction__AddPointerMoveHook,
    NaAudio__Env3d__Interaction__HandleUnderPointer,
    NaAudio__Env3d__Interaction__PointerAtHeight
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import { NaAudio__PortKind }  from './NaAudio__Spatial__PortFactory__.mjs';
import {
    NaAudio__PatchGraph__Connect,
    NaAudio__PatchGraph__PortWorldPosition,
    NaAudio__SignalType
} from './NaAudio__Spatial__PatchGraph__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';
import { NaAudio__ModeManager__IsWiring }  from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';

// =============================================================================
// REGION | Wiring Controller
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Held Port and Its Loose Lead
    // ------------------------------------------------------------
    const SCRATCH_FROM  =  new THREE.Vector3();
    const SCRATCH_TO    =  new THREE.Vector3();

    let attachedSurface  =  null;
    let heldPort         =  null;                                            // <-- The socket the lead is plugged into
    let ghostCable       =  null;                                            // <-- The lead following the pointer
    let ghostEnd         =  new THREE.Vector3();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Controller to a Surface
    // ------------------------------------------------------------
    export function NaAudio__WiringController__Attach(surface) {
        attachedSurface  =  surface;

        // The ghost follows the pointer on plain movement as well as during a drag, so
        // the click-click gesture has a lead in hand between its two clicks.
        NaAudio__Env3d__Interaction__AddPointerMoveHook(function () {
            if (!heldPort) return;
            if (NaAudio__Env3d__Interaction__PointerAtHeight(ghostEnd.y, SCRATCH_TO)) {
                NaAudio__WiringController__Move(SCRATCH_TO);
            }
        });

        // Leaving wiring mode drops whatever is in hand. A lead left dangling across a
        // mode change would sit there through an entire play session with nothing able
        // to complete it, and the user has no reason to connect it to the mode switch
        // they just used.
        NaAudio__EventBus__Subscribe(NaAudio__Event.ModeChanged, function () {
            if (!NaAudio__ModeManager__IsWiring()) NaAudio__WiringController__Cancel();
        });

        window.addEventListener('keydown', function (event) {
            if (event.code === 'Escape') NaAudio__WiringController__Cancel();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Gesture
// -----------------------------------------------------------------------------

    // FUNCTION | Take Hold of a Port
    // ------------------------------------------------------------
    export function NaAudio__WiringController__Begin(port) {
        if (!port) return;
        if (heldPort === port) return;

        NaAudio__WiringController__Cancel();
        heldPort  =  port;

        NaAudio__PatchGraph__PortWorldPosition(port, SCRATCH_FROM);
        ghostEnd.copy(SCRATCH_FROM);

        ghostCable  =  CableFactory.NaAudio__Env3d__CableFactory__Build(
            SCRATCH_FROM, ghostEnd, port.Normal, port.Normal, NaAudio__SignalType.Audio
        );

        NaAudio__WiringController__PaintGhost(ghostCable);
        attachedSurface.Groups[NaAudio__Env3d__SceneGroup.PatchCables].add(ghostCable);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Loose End of the Held Lead
    // ------------------------------------------------------------
    export function NaAudio__WiringController__Move(point) {
        if (!heldPort || !ghostCable) return;

        ghostEnd.x  =  point.x;
        ghostEnd.z  =  point.z;

        NaAudio__PatchGraph__PortWorldPosition(heldPort, SCRATCH_FROM);
        CableFactory.NaAudio__Env3d__CableFactory__Update(ghostCable, SCRATCH_FROM, ghostEnd, 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Land the Held Lead Wherever the Pointer Released
    // ------------------------------------------------------------
    // The drop target is resolved HERE, by asking the interaction layer what is under the
    // pointer, rather than being passed in by the handle that fired the event.
    //
    // That distinction is the whole of this function and it is easy to get wrong: a drag
    // handler is invoked by the object the drag STARTED on, so the port it can hand over
    // is the source, never the destination. Trusting it produces a controller that
    // faithfully decides every lead was dropped back into the socket it came from, and
    // silently makes no connections at all.
    //
    // A release on nothing, or back onto the source, is not a failed patch - it is the
    // first half of a click-click - so the lead stays in hand.
    export function NaAudio__WiringController__End() {
        if (!heldPort) return;

        const handle  =  NaAudio__Env3d__Interaction__HandleUnderPointer();
        const target  =  handle && handle.Object && handle.Object.userData.NaAudio__Port;

        if (!target || target === heldPort) return;

        NaAudio__WiringController__Land(target);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Click on a Port
    // ------------------------------------------------------------
    // A click arrives after the drag handlers have already run, because the interaction
    // layer treats a grab that never moved as a click too. So by the time this fires on
    // the FIRST socket, Begin has already taken hold of it - and the correct response is
    // to do nothing rather than to cancel what was just started.
    export function NaAudio__WiringController__Click(port) {
        if (!heldPort) {
            NaAudio__WiringController__Begin(port);
            return;
        }
        if (port === heldPort) return;

        NaAudio__WiringController__Land(port);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve Direction and Make the Connection
    // ------------------------------------------------------------
    function NaAudio__WiringController__Land(targetPort) {
        const source  =  heldPort;

        if (source.Kind === targetPort.Kind) {
            console.warn('[NaAudio Wiring] Both ends of that lead are ' + source.Kind + ' sockets, so there is no direction to give the signal. Patch an output to an input.');
            NaAudio__WiringController__Cancel();
            return;
        }

        if (source.ModuleId === targetPort.ModuleId) {
            console.warn('[NaAudio Wiring] "' + source.ModuleId + '" cannot be patched into itself. A module feeding its own input is a zero-delay feedback loop, which Web Audio silences outright rather than screaming - so it would look like nothing happened.');
            NaAudio__WiringController__Cancel();
            return;
        }

        const from  =  (source.Kind === NaAudio__PortKind.Output) ? source : targetPort;
        const to    =  (source.Kind === NaAudio__PortKind.Output) ? targetPort : source;

        NaAudio__WiringController__Cancel();

        NaAudio__PatchGraph__Connect({
            FromModuleId : from.ModuleId,
            ToModuleId   : to.ModuleId,
            SignalType   : NaAudio__SignalType.Audio
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop Whatever Is In Hand
    // ------------------------------------------------------------
    export function NaAudio__WiringController__Cancel() {
        if (ghostCable) {
            NaAudio__Env3d__SceneManager__DisposeSubtree(ghostCable);
            ghostCable  =  null;
        }
        heldPort  =  null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Lead Is Currently In Hand
    // ------------------------------------------------------------
    export function NaAudio__WiringController__IsHolding() {
        return heldPort !== null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Presentation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Make the Ghost Lead Read as Provisional
    // ------------------------------------------------------------
    // Tinted to the wiring mode's own pigment and lit, so a lead in hand is plainly not
    // one of the patched leads around it. Tint rather than transparency: an opaque cable
    // that is the wrong colour reads as 'not connected yet', where a semi-transparent one
    // reads as a rendering artefact.
    function NaAudio__WiringController__PaintGhost(cableGroup) {
        const state  =  cableGroup.userData.NaAudio__CableState;
        if (!state) return;

        state.Material.color.copy(Palette.NaAudio__Palette__Pigment('Ochre', 'Base'));
        state.Material.emissive.copy(Palette.NaAudio__Palette__Ground('Cream'))
                               .multiplyScalar(SpatialNumber('PatchGraph', 'GhostCableEmissive'));

        state.Tube.userData.NaAudio__Pickable  =  false;                      // <-- Never a drop target for itself
    }
    // ------------------------------------------------------------


    // FUNCTION | The Hooks the Port Factory Registers Against
    // ------------------------------------------------------------
    // Handed to NaAudio__PortFactory__Build by the module registry. Bundled as an object
    // rather than imported by the port factory directly, so the factory stays a builder
    // and the dependency runs one way only.
    export const NaAudio__WiringController__Hooks  =  Object.freeze({
        Begin : NaAudio__WiringController__Begin,
        Move  : NaAudio__WiringController__Move,
        End   : NaAudio__WiringController__End,
        Click : NaAudio__WiringController__Click
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
