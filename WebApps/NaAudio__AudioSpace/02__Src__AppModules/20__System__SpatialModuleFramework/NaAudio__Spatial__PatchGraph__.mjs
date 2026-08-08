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
   - A cable is two things at once: a Web Audio connection and a sagging curve in the
     scene. This module owns both halves and keeps them in step.
   - Cable geometry follows its endpoints every frame, so dragging a module across the
     space drags its leads with it.
   - Cable brightness follows the source module's meter, so a live patch visibly
     carries signal and a dead one visibly does not.

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

   MODULATION CABLES ARE POLLED, NOT CONNECTED

   An audio cable is a real node-to-node connection and costs nothing per frame.

   A modulation cable is different: it takes the source module's meter level and writes
   it into a named parameter on the destination. Web Audio cannot do that natively -
   there is no path from an analyser reading to an arbitrary application-level
   parameter - so modulation cables are polled once per frame in Update.

   That is why the two kinds are distinguished in the cable record rather than being
   treated uniformly, and why a space with many modulation cables costs more per frame
   than one with many audio cables.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                    from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Lines                      from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__LineFactory__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__AddUpdateHook,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import * as ModuleBase                 from './NaAudio__Spatial__ModuleBase__.mjs';
import {
    NaAudio__ModuleRegistry__Module
} from './NaAudio__Spatial__ModuleRegistry__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

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

    const SCRATCH_FROM   =  new THREE.Vector3();
    const SCRATCH_TO     =  new THREE.Vector3();
    const SCRATCH_FLASH  =  new THREE.Color();

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

        NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function () {
            NaAudio__PatchGraph__UpdateAll();
        });
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

        const signalType  =  definition.SignalType || NaAudio__SignalType.Audio;
        const maximum     =  SpatialNumber('PatchGraph', 'MaxCablesPerInput');

        if (NaAudio__PatchGraph__InputCableCount(definition.ToModuleId) >= maximum) {
            console.warn('[NaAudio PatchGraph] Input on "' + definition.ToModuleId + '" already has ' + maximum + ' cables and will not take another. The limit is legibility in 3D, not an engine constraint - raise MaxCablesPerInput if a denser bundle is genuinely wanted.');
            return null;
        }

        const cableId  =  definition.CableId || ('CBL_' + String(++cableCounter).padStart(4, '0'));

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

        const line  =  Lines.NaAudio__Env3d__LineFactory__BuildCable(SCRATCH_FROM, SCRATCH_TO, signalType);
        attachedSurface.Groups[NaAudio__Env3d__SceneGroup.PatchCables].add(line);

        const cable  =  {
            CableId         : cableId,
            FromModuleId    : definition.FromModuleId,
            ToModuleId      : definition.ToModuleId,
            SignalType      : signalType,
            TargetParameter : definition.TargetParameter || null,
            Depth           : (definition.Depth === undefined) ? 1.0 : definition.Depth,
            Line            : line,
            IsAudioConnected: isConnected
        };

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


    // FUNCTION | Disconnect a Cable
    // ------------------------------------------------------------
    export function NaAudio__PatchGraph__Disconnect(cableId) {
        const cable  =  CABLES.get(cableId);
        if (!cable) return;

        if (cable.IsAudioConnected) {
            const fromModule  =  NaAudio__ModuleRegistry__Module(cable.FromModuleId);
            const toModule    =  NaAudio__ModuleRegistry__Module(cable.ToModuleId);

            if (fromModule && toModule && toModule.Type && typeof toModule.Type.AudioInput === 'function') {
                const input  =  toModule.Type.AudioInput(toModule);

                // Disconnecting one specific destination rather than calling
                // disconnect() bare. The bare form drops EVERY connection from that
                // output, which would silently unplug the module's master feed and
                // every other cable leaving it.
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
    function NaAudio__PatchGraph__UpdateAll() {
        if (CABLES.size === 0) return;

        const flowEnabled  =  SpatialBool('PatchGraph', 'CableFlowEnabled');
        SCRATCH_FLASH.copy(Palette.NaAudio__Palette__Ground('Cream'));

        for (const cable of CABLES.values()) {
            const fromModule  =  NaAudio__ModuleRegistry__Module(cable.FromModuleId);
            const toModule    =  NaAudio__ModuleRegistry__Module(cable.ToModuleId);
            if (!fromModule || !toModule) continue;

            ModuleBase.NaAudio__ModuleBase__OutputPortPosition(fromModule, SCRATCH_FROM);
            ModuleBase.NaAudio__ModuleBase__InputPortPosition(toModule, SCRATCH_TO);
            Lines.NaAudio__Env3d__LineFactory__UpdateCable(cable.Line, SCRATCH_FROM, SCRATCH_TO);

            // MeterLevel was read once this frame by the module's own update, so a
            // module feeding three cables costs one analyser read rather than three.
            const level  =  fromModule.MeterLevel;

            if (flowEnabled) {
                Lines.NaAudio__Env3d__LineFactory__SetCableLevel(cable.Line, level, SCRATCH_FLASH);
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

        return connected;
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
