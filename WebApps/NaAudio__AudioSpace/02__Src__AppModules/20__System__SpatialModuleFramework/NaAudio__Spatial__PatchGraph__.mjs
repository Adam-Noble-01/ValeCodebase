/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | PATCH GRAPH
   =============================================================================

   FILE       : NaAudio__Spatial__PatchGraph__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - PatchGraph
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The 3D noodles - audio routing you can see, follow and unplug
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A cable is two things at once: a Web Audio connection and a hanging lead in the
     scene. This module owns both halves and keeps them in step.
   - Cable geometry follows its endpoints every frame, so dragging a module drags its
     leads with it and they swing.
   - Cable brightness follows the source module's meter, so a live patch visibly carries
     signal and a dead one visibly does not.
   - In wiring mode a cable is a click target, and clicking it unplugs it.

   ---------------------------------------------------------------------------

   WHY THE GRAPH IS THE ROUTING AND NOT A PICTURE OF IT

   The manifest describes 3D noodles connecting sources to effect modules, with several
   inputs able to feed one effect. The temptation in a prototype is to draw the cables
   and hard-wire the audio separately.

   That is a trap. The moment the picture and the routing are two things, they diverge -
   a cable that was disconnected still shows, or a connection that exists has no cable,
   and the user's only way of understanding their own patch becomes a lie. Connect() does
   both or neither.

   ---------------------------------------------------------------------------

   NOTHING REACHES THE SPEAKERS EXCEPT THROUGH A CABLE

   This is the change that gives the whole graph its meaning. A module bus no longer
   connects itself to the master - see NaAudio__Engine__AudioHost__CreateModuleBus - so
   an unpatched module makes its sound into nothing at all.

   The only path out is the Output Post, whose audio input IS the master bus. Anything
   reaching it, by any route and in any arrangement, is heard; anything not reaching it
   is not. That single rule is what makes the signal flow in this space READABLE: you can
   answer 'why can I hear that' by following a lead with your eye, and 'why can I not
   hear that' by finding the end that goes nowhere.

   The cost is that a newly added module is silent until it is patched, which is
   unfamiliar for about ten seconds and then obviously right - it is how every piece of
   hardware on a desk behaves.

   ---------------------------------------------------------------------------

   MODULATION CABLES ARE POLLED, NOT CONNECTED

   An audio cable is a real node-to-node connection and costs nothing per frame.

   A modulation cable is different: it takes the source module's meter level and writes
   it into a named parameter on the destination. Web Audio cannot do that natively -
   there is no path from an analyser reading to an arbitrary application-level
   parameter - so modulation cables are polled once per frame in Update.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                    from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as CableFactory               from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__CableFactory__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__AddUpdateHook,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import * as ModuleBase                 from './NaAudio__Spatial__ModuleBase__.mjs';
import { NaAudio__PortKind }           from './NaAudio__Spatial__PortFactory__.mjs';
import {
    NaAudio__ModuleRegistry__Module
} from './NaAudio__Spatial__ModuleRegistry__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';
import { NaAudio__Mode }               from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';

// =============================================================================
// REGION | Patch Graph
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Signal Types
    // ------------------------------------------------------------
    export const NaAudio__SignalType  =  Object.freeze({
        Audio      : 'audio',
        Modulation : 'modulation',
        Trigger    : 'trigger',
        Sidechain  : 'sidechain'
    });
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Cables
    // ------------------------------------------------------------
    const CABLES  =  new Map();                                              // <-- CableId -> cable record

    const SCRATCH_FROM     =  new THREE.Vector3();
    const SCRATCH_TO       =  new THREE.Vector3();
    const SCRATCH_FLASH    =  new THREE.Color();

    let attachedSurface  =  null;
    let cableCounter     =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Patch Graph and Start Following Endpoints
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Attach(surface) {
        attachedSurface  =  surface;

        NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function (delta) {
            NaAudio__PatchGraph__UpdateAll(delta);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Port Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | The World Position of a Port Record
    // ------------------------------------------------------------
    // Resolved through the module rather than read off the socket mesh, because a
    // module's hover lift moves the shell every frame and reading a stale world matrix
    // would leave the leads a few centimetres behind the sockets they are plugged into.
    export function NaAudio__PatchGraph__PortWorldPosition(port, out) {
        const module  =  NaAudio__ModuleRegistry__Module(port.ModuleId);
        if (!module) return (out || new THREE.Vector3()).set(0, 0, 0);

        return (port.Kind === NaAudio__PortKind.Output)
            ? ModuleBase.NaAudio__ModuleBase__OutputPortPosition(module, out)
            : ModuleBase.NaAudio__ModuleBase__InputPortPosition(module, out);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Direction a Module's Port Faces
    // ------------------------------------------------------------
    // Falls back to the port's declared normal from the module's built ports, and to a
    // sensible default for a module whose ports were never built - which happens if
    // PortsVisible is turned off in config. A cable with no lead-out still draws; it just
    // leaves the socket without the little straight run first.
    function NaAudio__PatchGraph__PortNormal(module, kind, out) {
        if (module.Ports) {
            for (let i = 0; i < module.Ports.length; i++) {
                if (module.Ports[i].Kind === kind) return out.copy(module.Ports[i].Normal);
            }
        }
        return out.set(0, 0, kind === NaAudio__PortKind.Output ? 1 : -1);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Connection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Count Cables Already Arriving at an Input
    // ------------------------------------------------------------
    function NaAudio__PatchGraph__InputCableCount(toModuleId) {
        let count  =  0;
        for (const cable of CABLES.values()) {
            if (cable.ToModuleId === toModuleId) count += 1;
        }
        return count;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether These Two Are Already Patched Together
    // ------------------------------------------------------------
    // Web Audio silently ignores a second connect() between the same pair of nodes, so a
    // duplicate cable would draw, be listed, be disconnectable - and unplugging it would
    // kill the audio for the original too. Refusing it up front is the only version that
    // stays honest.
    function NaAudio__PatchGraph__AlreadyPatched(fromModuleId, toModuleId) {
        for (const cable of CABLES.values()) {
            if (cable.FromModuleId === fromModuleId && cable.ToModuleId === toModuleId) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mint a Cable Id That Is Not Already In Use
    // ------------------------------------------------------------
    // The loop is the point. Ids come from two places - a space file supplies its own,
    // and a hand-made patch gets a generated one - and the counter knows nothing about
    // the file's.
    //
    // A space that names its cables CBL_0001 upward, which the demonstration space does,
    // leaves the counter at zero. The first cable the user patches by hand is then
    // generated as CBL_0001, and CABLES.set OVERWRITES the file's cable of that name:
    // its lead stays in the scene with nothing owning it, its interaction handle stays
    // registered, and its audio connection stays live with no record that it exists. The
    // patch you can see and the patch you can hear part company, silently, on the first
    // connection anybody makes.
    function NaAudio__PatchGraph__NextCableId() {
        let candidate;
        do {
            candidate  =  'CBL_' + String(++cableCounter).padStart(4, '0');
        } while (CABLES.has(candidate));

        return candidate;
    }
    // ------------------------------------------------------------


    // FUNCTION | Connect Two Modules With a Cable
    // ------------------------------------------------------------
    // definition:
    //     { CableId?, FromModuleId, ToModuleId, SignalType?, TargetParameter?, Depth? }
    //
    // TargetParameter and Depth apply to modulation cables only. Depth scales the
    // source meter before it is written, so one loud source does not slam a parameter
    // to its limit and sit there.
    export function NaAudio__PatchGraph__Connect(definition) {
        const fromModule  =  NaAudio__ModuleRegistry__Module(definition.FromModuleId);
        const toModule    =  NaAudio__ModuleRegistry__Module(definition.ToModuleId);

        if (!fromModule || !toModule) {
            console.error('[NaAudio PatchGraph] Cannot connect "' + definition.FromModuleId + '" to "' + definition.ToModuleId + '": one of them is not in the space. Cables must be connected after every module is loaded.');
            return null;
        }

        if (NaAudio__PatchGraph__AlreadyPatched(definition.FromModuleId, definition.ToModuleId)) {
            console.warn('[NaAudio PatchGraph] "' + definition.FromModuleId + '" is already patched into "' + definition.ToModuleId + '". A second lead between the same pair would draw but carry nothing, because Web Audio ignores a repeated connection.');
            return null;
        }

        const signalType  =  definition.SignalType || NaAudio__SignalType.Audio;
        const maximum     =  SpatialNumber('PatchGraph', 'MaxCablesPerInput');

        if (NaAudio__PatchGraph__InputCableCount(definition.ToModuleId) >= maximum) {
            console.warn('[NaAudio PatchGraph] Input on "' + definition.ToModuleId + '" already has ' + maximum + ' cables and will not take another. The limit is legibility in 3D, not an engine constraint - raise MaxCablesPerInput if a denser bundle is genuinely wanted.');
            return null;
        }

        // An explicit id that is already taken is refused rather than allowed to replace
        // what is there, for the same reason the generator loops - a silently overwritten
        // cable leaves its audio connected and its geometry orphaned.
        if (definition.CableId && CABLES.has(definition.CableId)) {
            console.error('[NaAudio PatchGraph] Cable id "' + definition.CableId + '" is already in this space. Ids must be unique within a space file.');
            return null;
        }

        const cableId  =  definition.CableId || NaAudio__PatchGraph__NextCableId();

        // THE AUDIO HALF
        // Audio and sidechain cables are real connections. Modulation and trigger
        // cables are polled in Update - see the note in the file header.
        let isConnected  =  false;
        if (signalType === NaAudio__SignalType.Audio || signalType === NaAudio__SignalType.Sidechain) {
            if (toModule.Type && typeof toModule.Type.AudioInput === 'function') {
                const input  =  toModule.Type.AudioInput(toModule);
                if (input) {
                    fromModule.Bus.Output.connect(input);
                    isConnected  =  true;
                }
            }

            if (!isConnected) {
                console.warn('[NaAudio PatchGraph] Module "' + definition.ToModuleId + '" (' + toModule.TypeName + ') exposes no audio input, so cable ' + cableId + ' carries nothing. A module type that should accept audio must implement AudioInput(module).');
            }
        }

        // THE VISUAL HALF
        ModuleBase.NaAudio__ModuleBase__OutputPortPosition(fromModule, SCRATCH_FROM);
        ModuleBase.NaAudio__ModuleBase__InputPortPosition(toModule, SCRATCH_TO);

        const fromNormal  =  NaAudio__PatchGraph__PortNormal(fromModule, NaAudio__PortKind.Output, new THREE.Vector3());
        const toNormal    =  NaAudio__PatchGraph__PortNormal(toModule,   NaAudio__PortKind.Input,  new THREE.Vector3());

        const line  =  CableFactory.NaAudio__Env3d__CableFactory__Build(SCRATCH_FROM, SCRATCH_TO, fromNormal, toNormal, signalType);
        attachedSurface.Groups[NaAudio__Env3d__SceneGroup.PatchCables].add(line);

        const cable  =  {
            CableId         : cableId,
            FromModuleId    : definition.FromModuleId,
            ToModuleId      : definition.ToModuleId,
            SignalType      : signalType,
            TargetParameter : definition.TargetParameter || null,
            Depth           : (definition.Depth === undefined) ? 1.0 : definition.Depth,
            Line            : line,
            Unregister      : null,
            IsAudioConnected: isConnected
        };

        cable.Unregister  =  NaAudio__PatchGraph__RegisterCableHandle(cable);
        CABLES.set(cableId, cable);

        NaAudio__EventBus__Publish(NaAudio__Event.CableConnected, {
            CableId      : cableId,
            FromModuleId : cable.FromModuleId,
            ToModuleId   : cable.ToModuleId,
            SignalType   : signalType
        });

        return cable;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Make a Cable Clickable in Wiring Mode
    // ------------------------------------------------------------
    // Unplugging is a click on the lead itself rather than a click on a socket, because
    // a socket with three leads in it cannot say WHICH of them a click meant. The lead
    // can, everywhere along its length.
    function NaAudio__PatchGraph__RegisterCableHandle(cable) {
        const tube  =  CableFactory.NaAudio__Env3d__CableFactory__TubeMesh(cable.Line);
        if (!tube) return null;

        return NaAudio__Env3d__Interaction__Register(tube, {
            Kind     : NaAudio__Env3d__HandleKind.Click,
            Cursor   : 'not-allowed',                                         // <-- Says 'this click removes something' before it is made
            Data     : cable,

            ClickModes : [NaAudio__Mode.Wiring],
            DragModes  : [NaAudio__Mode.Wiring],

            OnHover  : function (isHovered) {
                CableFactory.NaAudio__Env3d__CableFactory__SetHovered(cable.Line, isHovered);
            },

            OnClick  : function () {
                NaAudio__PatchGraph__Disconnect(cable.CableId);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Disconnect a Cable
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Disconnect(cableId) {
        const cable  =  CABLES.get(cableId);
        if (!cable) return;

        if (cable.Unregister) cable.Unregister();

        if (cable.IsAudioConnected) {
            const fromModule  =  NaAudio__ModuleRegistry__Module(cable.FromModuleId);
            const toModule    =  NaAudio__ModuleRegistry__Module(cable.ToModuleId);

            if (fromModule && toModule && toModule.Type && typeof toModule.Type.AudioInput === 'function') {
                const input  =  toModule.Type.AudioInput(toModule);

                // Disconnecting one specific destination rather than calling
                // disconnect() bare. The bare form drops EVERY connection from that
                // output, which would silently unplug every other cable leaving it.
                try { if (input) fromModule.Bus.Output.disconnect(input); } catch (error) { /* already gone */ }
            }
        }

        NaAudio__Env3d__SceneManager__DisposeSubtree(cable.Line);
        CABLES.delete(cableId);

        NaAudio__EventBus__Publish(NaAudio__Event.CableDisconnected, { CableId: cableId });
    }
    // ------------------------------------------------------------


    // FUNCTION | Disconnect Every Cable Touching a Module
    // ------------------------------------------------------------
    // Called before a module is removed. Without it the removed module's output node is
    // disposed while a cable still holds a reference to it, and the cable is left drawn
    // in the scene pointing at nothing.
    export function NaAudio__PatchGraph__DisconnectModule(moduleId) {
        for (const cable of Array.from(CABLES.values())) {
            if (cable.FromModuleId === moduleId || cable.ToModuleId === moduleId) {
                NaAudio__PatchGraph__Disconnect(cable.CableId);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Every Cable
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Clear() {
        for (const cableId of Array.from(CABLES.keys())) {
            NaAudio__PatchGraph__Disconnect(cableId);
        }
        cableCounter  =  0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Following
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Follow Endpoints, Show Signal, and Apply Modulation
    // ------------------------------------------------------------
    function NaAudio__PatchGraph__UpdateAll(delta) {
        if (CABLES.size === 0) return;

        const flowEnabled  =  SpatialBool('PatchGraph', 'CableFlowEnabled');
        SCRATCH_FLASH.copy(Palette.NaAudio__Palette__Ground('Cream'));

        for (const cable of CABLES.values()) {
            const fromModule  =  NaAudio__ModuleRegistry__Module(cable.FromModuleId);
            const toModule    =  NaAudio__ModuleRegistry__Module(cable.ToModuleId);
            if (!fromModule || !toModule) continue;

            ModuleBase.NaAudio__ModuleBase__OutputPortPosition(fromModule, SCRATCH_FROM);
            ModuleBase.NaAudio__ModuleBase__InputPortPosition(toModule, SCRATCH_TO);

            // delta rather than 0, so the slack spring runs and the lead swings behind a
            // module being dragged instead of snapping to each new shape.
            CableFactory.NaAudio__Env3d__CableFactory__Update(cable.Line, SCRATCH_FROM, SCRATCH_TO, delta);

            // MeterLevel was read once this frame by the module's own update, so a
            // module feeding three cables costs one analyser read rather than three.
            const level  =  fromModule.MeterLevel;

            if (flowEnabled) {
                CableFactory.NaAudio__Env3d__CableFactory__SetLevel(cable.Line, level, SCRATCH_FLASH);
            }

            if (cable.SignalType === NaAudio__SignalType.Modulation && cable.TargetParameter) {
                ModuleBase.NaAudio__ModuleBase__SetParameter(toModule, cable.TargetParameter, level * cable.Depth);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Queries and Serialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Every Live Cable
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Cables() {
        return Array.from(CABLES.values());
    }
    // ------------------------------------------------------------


    // FUNCTION | Serialise Every Cable Back to Space File Definitions
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Serialise() {
        return NaAudio__PatchGraph__Cables().map((cable) => ({
            CableId         : cable.CableId,
            FromModuleId    : cable.FromModuleId,
            ToModuleId      : cable.ToModuleId,
            SignalType      : cable.SignalType,
            TargetParameter : cable.TargetParameter,
            Depth           : cable.Depth
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Every Cable From a Space Document
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__LoadFromSpace(spaceDocument) {
        NaAudio__PatchGraph__Clear();

        const definitions  =  spaceDocument['NaAudio__Space__Cables'] || [];
        const connected    =  [];

        for (let i = 0; i < definitions.length; i++) {
            const cable  =  NaAudio__PatchGraph__Connect(definitions[i]);
            if (cable) connected.push(cable);
        }

        // The one check that catches a space file nobody can hear. Everything else about
        // a broken patch is visible - a lead going nowhere is a lead going nowhere - but
        // a space with no route to the output post at all looks completely normal and is
        // completely silent, which is the single worst failure this format can have.
        if (connected.length > 0 && !NaAudio__PatchGraph__HasRouteToOutput()) {
            console.warn('[NaAudio PatchGraph] No cable in this space reaches an OutputPost, so nothing will be audible. A module bus does not connect itself to the master any more - the post is the only way out.');
        }

        return connected;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether Anything Is Patched Into an Output Post
    // ------------------------------------------------------------
    function NaAudio__PatchGraph__HasRouteToOutput() {
        for (const cable of CABLES.values()) {
            const toModule  =  NaAudio__ModuleRegistry__Module(cable.ToModuleId);
            if (toModule && toModule.Defaults && toModule.Defaults.IsMasterOutput === true) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Cable Counts
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Counts() {
        let audio       =  0;
        let modulation  =  0;

        for (const cable of CABLES.values()) {
            if (cable.SignalType === NaAudio__SignalType.Modulation) modulation += 1; else audio += 1;
        }

        return { Total: CABLES.size, Audio: audio, Modulation: modulation };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
