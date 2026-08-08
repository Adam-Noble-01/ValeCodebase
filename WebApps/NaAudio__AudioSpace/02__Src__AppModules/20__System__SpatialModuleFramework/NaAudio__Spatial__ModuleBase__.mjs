/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | MODULE BASE
   =============================================================================

   FILE       : NaAudio__Spatial__ModuleBase__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - ModuleBase
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the shell every spatial module lives inside
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The shell is the pad a module stands on, the six-sided cage around it, the
     selection ring, the name plate, its audio bus and its placement handle.
   - A module TYPE - CircularSequencer, CubeMod, DelayCloud - only ever fills the
     volume inside the shell. It never builds a pad, never registers a placement
     drag, never manages its own lock state and never connects to the master bus.

   ---------------------------------------------------------------------------

   WHY THE SHELL IS FRAMEWORK-OWNED

   The design manifest specifies that every module exists within a bounding box which
   renders on all six sides when locked. That is a property of BEING a module, not of
   being a sequencer.

   If each type built its own, the six of them would drift: one would forget to
   desaturate on lock, one would size its cage differently, one would raycast its cage
   as well as its pad and become impossible to click past. Building it once here means
   a new module type gets all of that behaviour by existing.

   ---------------------------------------------------------------------------

   THE INTERFACE A MODULE TYPE IMPLEMENTS

   A type is a plain object with these optional members. The framework calls them; the
   type never calls the framework.

       Build(module)                 build geometry into module.BodyGroup
       Update(module, delta, now)    per frame; only called while unlocked
       Schedule(module, window)      per lookahead window; only called while unlocked
       OnLockChanged(module, locked) react to a lock transition
       OnSelected(module, selected)  react to selection
       SetParameter(module, k, v)    named parameter write, from a cable or the HUD
       Dispose(module)               release anything the framework does not own

   Update and Schedule not being called while locked IS the lock mechanism. A type does
   not need to check its own lock state, and cannot forget to.

   ============================================================================= */

import * as THREE from 'three';

import {
    SpatialSection, SpatialNumber, SpatialBool,
    NaAudio__ConfigAccess__ModuleTypeDefaults
} from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette         from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials       from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ShapeFactory__.mjs';
import * as Lines           from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__LineFactory__.mjs';
import * as Labels          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Labels3d__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__Interaction__SnapToGrid,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import * as AudioHost                  from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';
import { NaAudio__MusicalMaths__Clamp }  from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Module Base
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Presentation State Names
    // ------------------------------------------------------------
    // These match the keys in NaAudio__Palette__Config__ModuleStates exactly.
    const STATE_WORKING   =  'working';
    const STATE_HOVERED   =  'hovered';
    const STATE_SELECTED  =  'selected';
    const STATE_LOCKED    =  'locked';

    const SCRATCH_COLOUR  =  new THREE.Color();
    const SCRATCH_VECTOR  =  new THREE.Vector3();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shell Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Pad a Module Stands On
    // ------------------------------------------------------------
    function NaAudio__ModuleBase__BuildPad(cageSize) {
        if (!SpatialBool('Shell', 'PadEnabled')) return null;

        const inset  =  SpatialNumber('Shell', 'PadInset');
        const width  =  cageSize.x - inset * 2;
        const depth  =  cageSize.z - inset * 2;

        const shape  =  SpatialSection('Shell').PadShape;

        const geometry  =  (shape === 'circle')
            ? Shapes.NaAudio__Env3d__ShapeFactory__CircularPad(Math.min(width, depth) / 2)
            : Shapes.NaAudio__Env3d__ShapeFactory__RoundedPad(width, depth, Math.min(width, depth) * 0.18, SpatialNumber('Shell', 'PadCornerSegments'));

        const pad  =  new THREE.Mesh(geometry, Materials.NaAudio__Materials__Pad(Palette.NaAudio__Palette__ModuleState(STATE_WORKING).PadPigment));
        pad.position.y     =  SpatialNumber('Shell', 'PadThickness');
        pad.receiveShadow  =  true;

        return pad;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Name Plate Above a Module
    // ------------------------------------------------------------
    function NaAudio__ModuleBase__BuildLabel(displayName, typeLabel, cageSize) {
        if (!SpatialBool('Shell', 'LabelEnabled')) return null;

        const label  =  Labels.NaAudio__Env3d__Labels3d__Build(displayName, typeLabel);
        if (!label) return null;

        label.position.y  =  cageSize.y + Labels.NaAudio__Env3d__Labels3d__HeightAboveModule();
        return label;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Spatial Module Shell and Build Its Type Into It
    // ------------------------------------------------------------
    // definition comes straight out of a space file:
    //     { ModuleId, TypeName, DisplayName, Position: {x,z}, IsLocked, Settings }
    export function NaAudio__ModuleBase__Create(surface, definition, typeImplementation) {
        const defaults   =  NaAudio__ConfigAccess__ModuleTypeDefaults(definition.TypeName);
        const cageSize   =  defaults.CageSize || SpatialSection('Shell').DefaultCageSize;

        const sizeVector  =  new THREE.Vector3(cageSize.x, cageSize.y, cageSize.z);

        // THE TWO GROUPS
        // ShellGroup holds the pad, cage, ring and plate and lives in the shell scene
        // group. BodyGroup holds whatever the type builds and lives in the bodies
        // group. They are separate so a lock fade can desaturate the body without
        // touching the shell, and so the raycaster can reach the pad without wading
        // through a sequencer's sixty-four step meshes.
        const shellGroup  =  new THREE.Group();
        const bodyGroup   =  new THREE.Group();

        shellGroup.name  =  'NaAudio__Module__Shell__' + definition.ModuleId;
        bodyGroup.name   =  'NaAudio__Module__Body__'  + definition.ModuleId;

        const position  =  new THREE.Vector3(
            definition.Position ? definition.Position.x : 0,
            SpatialNumber('Shell', 'GroundClearance'),
            definition.Position ? definition.Position.z : 0
        );

        shellGroup.position.copy(position);
        bodyGroup.position.copy(position);

        const module  =  {
            ModuleId     : definition.ModuleId,
            TypeName     : definition.TypeName,
            TypeLabel    : defaults.TypeLabel || definition.TypeName,
            DisplayName  : definition.DisplayName || defaults.TypeLabel || definition.TypeName,
            Defaults     : defaults,
            Settings     : definition.Settings || {},

            Surface      : surface,
            ShellGroup   : shellGroup,
            BodyGroup    : bodyGroup,
            CageSize     : sizeVector,
            Position     : position,

            Pad          : null,
            Cage         : null,
            SelectionRing: null,
            Label        : null,

            Bus          : null,                                              // <-- Audio output bus, built on Attach
            MeterLevel   : 0,

            IsLocked     : definition.IsLocked === true,
            IsSelected   : false,
            IsHovered    : false,
            LockBlend    : definition.IsLocked === true ? 1 : 0,              // <-- 0 working, 1 locked; eased over the transition

            Type         : typeImplementation,
            Unregisters  : [],                                                // <-- Every teardown callback the shell owns
            OwnedMaterials : []                                               // <-- Body materials the type asked the shell to fade
        };

        // SHELL PARTS
        module.Pad  =  NaAudio__ModuleBase__BuildPad(sizeVector);
        if (module.Pad) shellGroup.add(module.Pad);

        module.Cage  =  Lines.NaAudio__Env3d__LineFactory__BuildCage(sizeVector, sizeVector.y / 2);
        shellGroup.add(module.Cage);

        if (SpatialBool('Shell', 'SelectionRingEnabled')) {
            const ringRadius  =  Math.min(sizeVector.x, sizeVector.z) / 2 * SpatialNumber('Shell', 'SelectionRingRadiusFactor');
            module.SelectionRing  =  Lines.NaAudio__Env3d__LineFactory__BuildSelectionRing(ringRadius, 'Ink', 0.8);
            module.SelectionRing.position.y  =  SpatialNumber('Shell', 'PadThickness') + 0.004;
            shellGroup.add(module.SelectionRing);
        }

        module.Label  =  NaAudio__ModuleBase__BuildLabel(module.DisplayName, module.TypeLabel, sizeVector);
        if (module.Label) shellGroup.add(module.Label);

        surface.Groups[NaAudio__Env3d__SceneGroup.ModuleShells].add(shellGroup);
        surface.Groups[NaAudio__Env3d__SceneGroup.ModuleBodies].add(bodyGroup);

        return module;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Give a Module Its Audio Bus and Build Its Type
    // ------------------------------------------------------------
    // Separate from Create because the shell can be built before the audio context is
    // unlocked - the space is visible behind the boot gate - but no audio node can be
    // constructed until the user has supplied the gesture.
    export function NaAudio__ModuleBase__Attach(module, onSelect) {
        module.Bus  =  AudioHost.NaAudio__AudioHost__CreateModuleBus(1.0);

        if (module.Type && typeof module.Type.Build === 'function') {
            module.Type.Build(module);
        }

        NaAudio__ModuleBase__RegisterPlacementHandle(module, onSelect);
        NaAudio__ModuleBase__ApplyPresentation(module, 1.0);                   // <-- Snap to the declared initial state rather than animating into it

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleAdded, {
            ModuleId : module.ModuleId,
            TypeName : module.TypeName
        });

        return module;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Register the Pad as the Module's Placement Handle
    // ------------------------------------------------------------
    // The PAD is the handle, not the body. Dragging a sequencer by one of its steps
    // would be ambiguous - is that a step edit or a move? - so the plate underneath is
    // the grab point, exactly as a physical device on a desk is moved by its case.
    function NaAudio__ModuleBase__RegisterPlacementHandle(module, onSelect) {
        if (!module.Pad) return;

        const unregister  =  NaAudio__Env3d__Interaction__Register(module.Pad, {
            Kind     : NaAudio__Env3d__HandleKind.DragGround,
            ModuleId : module.ModuleId,
            Cursor   : 'grab',

            OnHover  : function (isHovered) {
                module.IsHovered  =  isHovered;
                NaAudio__EventBus__Publish(NaAudio__Event.ModuleHovered, {
                    ModuleId : isHovered ? module.ModuleId : null
                });
            },

            OnClick  : function () {
                if (onSelect) onSelect(module.ModuleId);
            },

            OnDrag   : function (context) {
                SCRATCH_VECTOR.copy(module.Position).add(context.Delta);
                SCRATCH_VECTOR.y  =  module.Position.y;                        // <-- Placement is on the ground plane; height is never dragged
                NaAudio__Env3d__Interaction__SnapToGrid(SCRATCH_VECTOR);
                NaAudio__ModuleBase__SetPosition(module, SCRATCH_VECTOR);
            },

            OnDragEnd : function () {
                NaAudio__EventBus__Publish(NaAudio__Event.ModuleMoved, {
                    ModuleId : module.ModuleId,
                    Position : { x: module.Position.x, z: module.Position.z }
                });
            }
        });

        module.Unregisters.push(unregister);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Module, Taking Its Shell and Body Together
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__SetPosition(module, position) {
        module.Position.copy(position);
        module.ShellGroup.position.copy(position);
        module.BodyGroup.position.copy(position);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Presentation State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Which Presentation State a Module Is Currently In
    // ------------------------------------------------------------
    // Locked wins over everything. A locked module that is also selected must still
    // read as locked, because that is the state the user needs to see - selection is
    // transient and locking is not.
    function NaAudio__ModuleBase__CurrentStateName(module) {
        if (module.IsLocked)   return STATE_LOCKED;
        if (module.IsSelected) return STATE_SELECTED;
        if (module.IsHovered)  return STATE_HOVERED;
        return STATE_WORKING;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Module's Presentation for Its Current State
    // ------------------------------------------------------------
    // blend is how far through the lock transition the module is, 0 to 1. Called every
    // frame while a transition runs, and once with 1.0 whenever a non-lock state
    // changes.
    export function NaAudio__ModuleBase__ApplyPresentation(module, blend) {
        const stateName  =  NaAudio__ModuleBase__CurrentStateName(module);
        const state      =  Palette.NaAudio__Palette__ModuleState(stateName);
        const working    =  Palette.NaAudio__Palette__ModuleState(STATE_WORKING);

        // Cage opacity and colour interpolate from the working state, so a module that
        // is locking fades its cage in rather than having it appear.
        const cageOpacity  =  working.CageOpacity + (state.CageOpacity - working.CageOpacity) * blend;
        const cageColour   =  Palette.NaAudio__Palette__Resolve(state.CageColour);   // <-- Ink or pigment; locked cages are a pigment
        Lines.NaAudio__Env3d__LineFactory__SetCageAppearance(module.Cage, cageOpacity, cageColour);

        if (module.SelectionRing) {
            module.SelectionRing.visible  =  module.IsSelected;
        }

        const desaturation  =  working.Desaturation + (state.Desaturation - working.Desaturation) * blend;
        const bodyOpacity   =  working.BodyOpacity  + (state.BodyOpacity  - working.BodyOpacity)  * blend;

        for (let i = 0; i < module.OwnedMaterials.length; i++) {
            const material  =  module.OwnedMaterials[i];
            const base      =  material.userData.NaAudio__BaseColour;
            if (!base) continue;

            Palette.NaAudio__Palette__Desaturate(base, desaturation, SCRATCH_COLOUR);
            material.color.copy(SCRATCH_COLOUR);

            if (material.transparent) material.opacity  =  bodyOpacity;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register a Body Material for the Lock Fade
    // ------------------------------------------------------------
    // A module type calls this for every owned material it wants desaturated when the
    // module locks. Anything not registered stays fully saturated, which is correct for
    // a few things - a cage, a tick mark - and wrong for a module body, so a type that
    // forgets this produces a module that visibly does not dim.
    export function NaAudio__ModuleBase__RegisterFadeMaterial(module, material) {
        if (!material) return;
        if (!material.userData.NaAudio__BaseColour) {
            material.userData.NaAudio__BaseColour  =  material.color.clone();
        }
        module.OwnedMaterials.push(material);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Module's Selected State
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__SetSelected(module, isSelected) {
        if (module.IsSelected === isSelected) return;

        module.IsSelected  =  isSelected;
        NaAudio__ModuleBase__ApplyPresentation(module, module.LockBlend);

        if (module.Type && typeof module.Type.OnSelected === 'function') {
            module.Type.OnSelected(module, isSelected);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame and Per-Window Driving
// -----------------------------------------------------------------------------

    // FUNCTION | Advance a Module by One Frame
    // ------------------------------------------------------------
    // Called by the module registry's single update hook. The lock transition is
    // advanced FIRST and unconditionally, then the type's own Update is called only if
    // the module is unlocked - so a locking module still animates its cage fading in,
    // and stops animating its contents.
    export function NaAudio__ModuleBase__Update(module, delta, elapsed) {
        const transition  =  SpatialNumber('LockState', 'TransitionSeconds');
        const target      =  module.IsLocked ? 1 : 0;

        if (module.LockBlend !== target) {
            const step  =  delta / Math.max(transition, 0.0001);
            module.LockBlend  =  (target > module.LockBlend)
                ? Math.min(module.LockBlend + step, 1)
                : Math.max(module.LockBlend - step, 0);

            NaAudio__ModuleBase__ApplyPresentation(module, module.LockBlend);
        }

        // The hover lift. Applied to the shell and body together so the whole module
        // rises under the cursor - the cheapest possible unambiguous answer to 'which
        // of these overlapping things does the pointer have'.
        const liftTarget  =  (module.IsHovered && !module.IsLocked) ? SpatialNumber('Shell', 'HoverLiftHeight') : 0;
        const liftRate    =  NaAudio__MusicalMaths__Clamp(delta / Math.max(SpatialNumber('Shell', 'HoverLiftSeconds'), 0.0001), 0, 1);
        const currentLift =  module.ShellGroup.position.y;
        const nextLift    =  currentLift + (liftTarget - currentLift) * liftRate;

        module.Position.y             =  nextLift;                            // <-- Ports read Position, so they rise with the module
        module.ShellGroup.position.y  =  nextLift;
        module.BodyGroup.position.y   =  nextLift;

        // The meter. Read once per frame here rather than by each consumer, so a module
        // feeding three patch cables costs one analyser read and not three.
        module.MeterLevel  =  AudioHost.NaAudio__AudioHost__ReadLevel(module.Bus.Analyser, module.Bus.MeterBuffer);

        if (module.IsLocked) return;                                          // <-- THE lock mechanism. A type cannot forget to check.
        if (module.Type && typeof module.Type.Update === 'function') {
            module.Type.Update(module, delta, elapsed);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Schedule a Module's Events for One Lookahead Window
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__Schedule(module, window) {
        if (module.IsLocked) return;
        if (module.Type && typeof module.Type.Schedule === 'function') {
            module.Type.Schedule(module, window);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Named Parameter on a Module
    // ------------------------------------------------------------
    // The single entry point for a modulation cable, a HUD control or a preset recall.
    // Everything that changes a module from outside goes through here, which is what
    // makes those three paths interchangeable.
    export function NaAudio__ModuleBase__SetParameter(module, parameterName, value) {
        if (module.Type && typeof module.Type.SetParameter === 'function') {
            module.Type.SetParameter(module, parameterName, value);
        }

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleParameterSet, {
            ModuleId  : module.ModuleId,
            Parameter : parameterName,
            Value     : value
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ports
// -----------------------------------------------------------------------------

    // FUNCTION | The World Position of a Module's Output Port
    // ------------------------------------------------------------
    // Ports are not modelled as objects, only as positions. A visible socket on the
    // side of every module is a lot of geometry for something a cable already makes
    // obvious by arriving there, and the manifest's routing is meant to read as flexible
    // leads between devices rather than as a patch bay.
    export function NaAudio__ModuleBase__OutputPortPosition(module, out) {
        const standoff  =  SpatialNumber('PatchGraph', 'PortStandoff');
        return (out || new THREE.Vector3()).set(
            module.Position.x,
            module.Position.y + module.CageSize.y * 0.5,
            module.Position.z + module.CageSize.z * 0.5 + standoff
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | The World Position of a Module's Input Port
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__InputPortPosition(module, out) {
        const standoff  =  SpatialNumber('PatchGraph', 'PortStandoff');
        return (out || new THREE.Vector3()).set(
            module.Position.x,
            module.Position.y + module.CageSize.y * 0.5,
            module.Position.z - module.CageSize.z * 0.5 - standoff
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose a Module and Everything It Owns
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__Dispose(module) {
        for (let i = 0; i < module.Unregisters.length; i++) {
            try { module.Unregisters[i](); } catch (error) { /* already gone */ }
        }
        module.Unregisters.length  =  0;

        if (module.Type && typeof module.Type.Dispose === 'function') {
            module.Type.Dispose(module);
        }

        if (module.Bus) {
            try { module.Bus.Output.disconnect(); module.Bus.Analyser.disconnect(); } catch (error) { /* already gone */ }
        }

        // Disposal goes through the scene manager rather than being repeated here, so
        // the shared-versus-owned rule for materials and geometry lives in exactly one
        // place. Disposing a library-owned material twice turns every other mesh using
        // it black, and the symptom appears nowhere near the cause.
        NaAudio__Env3d__SceneManager__DisposeSubtree(module.ShellGroup);
        NaAudio__Env3d__SceneManager__DisposeSubtree(module.BodyGroup);

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleRemoved, { ModuleId: module.ModuleId });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
