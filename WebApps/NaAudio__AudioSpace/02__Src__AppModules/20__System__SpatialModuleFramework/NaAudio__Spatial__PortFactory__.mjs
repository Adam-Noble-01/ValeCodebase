/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | PORT FACTORY
   =============================================================================

   FILE       : NaAudio__Spatial__PortFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - PortFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Give every module a socket you can see and a socket you can grab
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Every module carries an input socket on one side and an output socket on the other,
     built by the framework rather than by the module type - exactly like the pad and the
     cage, and for the same reason.
   - A port is a recessed collar with a face plate. Green is in, terracotta is out.
   - Ports are pickable in wiring mode only, and visibly recede in the other two.

   ---------------------------------------------------------------------------

   WHY PORTS ARE OBJECTS NOW

   The first build modelled a port as a POSITION and nothing else, on the reasoning that
   a cable arriving somewhere already shows where it arrived, and a visible socket on
   every module is a lot of geometry for a thing that never gets touched.

   That was correct while cables were loaded from a file and never made by hand. It stops
   being correct the moment the user has to CREATE a connection, because then the port is
   the target of a gesture - and a target you cannot see is a target you cannot hit.

   It also turned out to be the thing that makes the space read as instruments rather
   than as diagrams. A device with a socket on it is a device.

   ---------------------------------------------------------------------------

   THE CONTRACT, AND WHY IT IS DELIBERATELY THIN

   A module declares which ports it has. That is all.

       HasInput   : accepts audio. Requires the type to implement AudioInput(module).
       HasOutput  : produces audio, taken from the module's own bus.

   There is no pass-through and no multi-port yet. Both are named in the manifest and
   both will come, and the shape here anticipates them - a port record already carries
   its own kind, its own normal and its own offset, so a third kind is a table entry
   rather than a rewrite. Adding them now, unused, would mean guessing their semantics
   from nothing, and a guessed interface is worse than an absent one.

   ---------------------------------------------------------------------------

   THE NORMAL IS THE POINT

   Every port publishes the direction it FACES, and the cable factory leads its curve out
   along that direction before letting it droop. Without it a lead emerges sideways from
   a socket, which nothing physical does, and the whole patch drops back to looking like
   a routing diagram no matter how round the tube is.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Materials                  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import { NaAudio__Mode }               from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';

// =============================================================================
// REGION | Port Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Port Kinds and Their Presentation
    // ------------------------------------------------------------
    export const NaAudio__PortKind  =  Object.freeze({
        Input  : 'input',
        Output : 'output'
    });

    // Normal is the direction the socket faces, in module-local space. Input faces -Z
    // and output faces +Z, so a module's leads arrive at its back and leave from its
    // front - which means two modules facing the same way chain without their cables
    // crossing over their own bodies.
    const PORT_PRESENTATION  =  Object.freeze({
        input  : { Pigment: 'SageGreen',  Normal: new THREE.Vector3(0, 0, -1), Label: 'In'  },
        output : { Pigment: 'Terracotta', Normal: new THREE.Vector3(0, 0,  1), Label: 'Out' }
    });

    const NAME_PORT  =  'NaAudio__Spatial__Port';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Socket's Meshes
    // ------------------------------------------------------------
    // A collar and a recessed face, both lying on the port's own axis. The recess is
    // what makes it read as a hole rather than a stud, and it costs one extra mesh.
    //
    // The collar is deliberately a little wider than a plug. A socket the same size as
    // the thing that goes into it looks like a butt joint; a socket wider than its plug
    // looks like it receives it.
    function NaAudio__Spatial__PortFactory__BuildSocket(kind) {
        const radius  =  SpatialNumber('PatchGraph', 'PortRadius');
        const depth   =  SpatialNumber('PatchGraph', 'PortDepth');

        const presentation  =  PORT_PRESENTATION[kind];

        const group  =  new THREE.Group();
        group.name   =  NAME_PORT + '__' + kind;

        const collarMaterial  =  Materials.NaAudio__Materials__OwnedPort(presentation.Pigment);
        const collarGeometry  =  new THREE.CylinderGeometry(radius, radius, depth, 14, 1, false);

        const collar  =  new THREE.Mesh(collarGeometry, collarMaterial);
        collar.rotation.x  =  Math.PI / 2;                                    // <-- A cylinder stands on +Y; the socket lies along Z
        collar.castShadow  =  false;
        group.add(collar);

        const faceMaterial  =  Materials.NaAudio__Materials__OwnedPort(presentation.Pigment);
        faceMaterial.color.multiplyScalar(0.55);                              // <-- The recess, done with tone rather than with geometry
        const faceGeometry  =  new THREE.CircleGeometry(radius * 0.62, 14);

        const face  =  new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.z  =  (depth / 2) * (kind === NaAudio__PortKind.Input ? -1 : 1) + 0.001 * (kind === NaAudio__PortKind.Input ? -1 : 1);
        if (kind === NaAudio__PortKind.Input) face.rotation.y  =  Math.PI;
        group.add(face);

        group.userData.NaAudio__PortMaterials  =  [collarMaterial, faceMaterial];
        return group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build and Register Every Port a Module Declares
    // ------------------------------------------------------------
    // onPortGrab is the wiring controller's entry point. It is passed in rather than
    // imported so this file stays a builder - the framework decides what a port LOOKS
    // like and where it IS, and something else decides what dragging one MEANS.
    export function NaAudio__PortFactory__Build(module, onPortGrab) {
        if (!SpatialBool('PatchGraph', 'PortsVisible')) return [];

        const defaults  =  module.Defaults || {};
        const wanted    =  [];

        if (defaults.HasInput  !== false) wanted.push(NaAudio__PortKind.Input);
        if (defaults.HasOutput !== false) wanted.push(NaAudio__PortKind.Output);

        const ports  =  [];

        for (let i = 0; i < wanted.length; i++) {
            const kind    =  wanted[i];
            const socket  =  NaAudio__Spatial__PortFactory__BuildSocket(kind);

            NaAudio__PortFactory__Offset(module, kind, socket.position);
            module.ShellGroup.add(socket);

            const port  =  {
                ModuleId  : module.ModuleId,
                Kind      : kind,
                Object    : socket,
                Materials : socket.userData.NaAudio__PortMaterials,
                Normal    : PORT_PRESENTATION[kind].Normal.clone(),
                IsHovered : false
            };

            socket.userData.NaAudio__Port  =  port;

            // DragGround, not Click. A port needs a real drag so the ghost cable can
            // follow the pointer, and the drag plane a DragGround builds is horizontal
            // through the grab point - which puts the pointer at socket height across the
            // whole space, exactly where the other end of the lead wants to be.
            const unregister  =  NaAudio__Env3d__Interaction__Register(socket, {
                Kind     : NaAudio__Env3d__HandleKind.DragGround,
                ModuleId : module.ModuleId,
                Cursor   : 'crosshair',
                Data     : port,

                ClickModes : [NaAudio__Mode.Wiring],
                DragModes  : [NaAudio__Mode.Wiring],

                OnHover     : function (isHovered) { NaAudio__PortFactory__SetHovered(port, isHovered); },
                OnDragStart : function ()          { if (onPortGrab) onPortGrab.Begin(port); },
                OnDrag      : function (context)   { if (onPortGrab) onPortGrab.Move(context.Point); },
                OnDragEnd   : function ()          { if (onPortGrab) onPortGrab.End(); },      // <-- The controller resolves the DROP target; this handle only knows the source
                OnClick     : function ()          { if (onPortGrab) onPortGrab.Click(port); }
            });

            module.Unregisters.push(unregister);
            ports.push(port);
        }

        module.Ports  =  ports;
        NaAudio__PortFactory__ApplyModePresence(module, false);
        return ports;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Local Offset of a Module's Port
    // ------------------------------------------------------------
    // The one place a port's position is decided. Both the socket geometry and the cable
    // endpoints come through here, so a socket can never end up drawn somewhere other
    // than where its lead plugs in.
    //
    // Note that the offset is measured from the CAGE, not from the pad. A sequencer that
    // has opened its control bank is twice as wide, and a socket that slid outward with
    // the workbench would leave the instrument and hang off the end of a bench.
    export function NaAudio__PortFactory__Offset(module, kind, out) {
        const standoff  =  SpatialNumber('PatchGraph', 'PortStandoff');
        const height    =  SpatialNumber('PatchGraph', 'PortHeightFactor') * module.CageSize.y;
        const facing    =  (kind === NaAudio__PortKind.Input) ? -1 : 1;

        return (out || new THREE.Vector3()).set(
            0,
            height,
            facing * (module.CageSize.z * 0.5 + standoff)
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Appearance
// -----------------------------------------------------------------------------

    // FUNCTION | Mark a Port as Hovered
    // ------------------------------------------------------------
    export function NaAudio__PortFactory__SetHovered(port, isHovered) {
        port.IsHovered  =  isHovered;

        const strength  =  isHovered ? SpatialNumber('PatchGraph', 'PortHoverEmissive') : 0;

        for (let i = 0; i < port.Materials.length; i++) {
            port.Materials[i].emissive.setScalar(strength);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Raise or Lower a Module's Ports for the Current Mode
    // ------------------------------------------------------------
    // Ports stay VISIBLE in every mode and only change how present they are. Hiding them
    // outside wiring mode was the first attempt and it was wrong twice over: the module
    // stops reading as a device with sockets, and switching to wiring mode makes three
    // dozen objects appear at once, which is far more disruptive than a fade.
    export function NaAudio__PortFactory__ApplyModePresence(module, isWiring) {
        if (!module.Ports) return;

        const opacity  =  isWiring ? 1.0 : SpatialNumber('PatchGraph', 'PortRestOpacity');

        for (let i = 0; i < module.Ports.length; i++) {
            const port  =  module.Ports[i];

            for (let m = 0; m < port.Materials.length; m++) {
                port.Materials[m].opacity  =  opacity;
            }

            if (!isWiring) NaAudio__PortFactory__SetHovered(port, false);      // <-- A hover left lit by a mode change never clears itself
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
