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
    NaAudio__EventBus__Publish,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';
import { NaAudio__MusicalMaths__Clamp }  from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import {
    NaAudio__Mode,
    NaAudio__Mode__All,
    NaAudio__ModeManager__IsWiring
} from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import * as GroundField  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__GroundField__.mjs';
import * as PortFactory  from './NaAudio__Spatial__PortFactory__.mjs';

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

            BaseWidth    : sizeVector.x,                                      // <-- Live base width; a module type may widen it
            Pad          : null,
            Cage         : null,
            SelectionRing: null,
            Label        : null,

            Ports        : null,                                              // <-- Input and output sockets, built on Attach

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
    export function NaAudio__ModuleBase__Attach(module, onSelect, portHooks) {
        module.Bus  =  AudioHost.NaAudio__AudioHost__CreateModuleBus(1.0);

        if (module.Type && typeof module.Type.Build === 'function') {
            module.Type.Build(module);
        }

        NaAudio__ModuleBase__RegisterPlacementHandle(module, onSelect);
        PortFactory.NaAudio__PortFactory__Build(module, portHooks);
        NaAudio__ModuleBase__RegisterGroundInfluence(module);

        // Ports follow the mode for the life of the module, so the subscription is torn
        // down with it. A module removed from the space while its handler is still on the
        // bus keeps being told about mode changes forever, and answers by writing to
        // materials that have already been disposed.
        module.Unregisters.push(NaAudio__EventBus__Subscribe(NaAudio__Event.ModeChanged, function () {
            PortFactory.NaAudio__PortFactory__ApplyModePresence(module, NaAudio__ModeManager__IsWiring());
        }));
        PortFactory.NaAudio__PortFactory__ApplyModePresence(module, NaAudio__ModeManager__IsWiring());

        NaAudio__ModuleBase__ApplyPresentation(module, 1.0);                   // <-- Snap to the declared initial state rather than animating into it

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleAdded, {
            ModuleId : module.ModuleId,
            TypeName : module.TypeName
        });

        return module;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Give the Module an Island of Ground Under It
    // ------------------------------------------------------------
    // The live position vector is handed over by reference, so the island follows the
    // module for the rest of its life without a single push from the drag code. That is
    // the whole reason the field takes a reference rather than a copy - a module being
    // dragged has enough to do.
    //
    // Radius scales with the module's own footprint and with an optional per-type factor,
    // so a DelayCloud that spreads across three metres is not standing on the same patch
    // of ground as a control the size of a plate.
    function NaAudio__ModuleBase__RegisterGroundInfluence(module) {
        if (!GroundField.NaAudio__Env3d__GroundField__IsEnabled()) return;

        const factor   =  (module.Defaults && typeof module.Defaults.FieldRadiusFactor === 'number')
            ? module.Defaults.FieldRadiusFactor
            : 1.0;

        const footprint  =  Math.max(module.CageSize.x, module.CageSize.z);
        const radius     =  footprint * SpatialNumber('GroundField', 'RadiusFromFootprint') * factor
                          + SpatialNumber('GroundField', 'RadiusPadding');

        GroundField.NaAudio__Env3d__GroundField__SetSource(module.ModuleId, module.Position, radius, null);
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

            // Selectable in every mode so the inspector is always reachable, but MOVABLE
            // only in Build. This asymmetry is the reason the interaction layer keeps
            // click modes and drag modes as separate lists.
            ClickModes : NaAudio__Mode__All,
            DragModes  : [NaAudio__Mode.Build],

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


    // FUNCTION | Widen or Restore a Module's Base
    // ------------------------------------------------------------
    // A module type calls this to grow its own footprint - the circular sequencer uses
    // it to open a workbench beside itself for its control bank.
    //
    // The pad and cage GEOMETRY are rebuilt rather than the meshes being scaled. That is
    // not fussiness: the pad is a rounded plate, and a non-uniform scale would stretch
    // its corner radii into ellipses while the cage's edge inset would stop being an
    // inset at all. Both geometries are cached by size in the shape factory, so toggling
    // between two widths costs two cache lookups and nothing else.
    //
    // The base grows to +X only, and the shell is shifted by half the growth so the
    // module's CONTENTS stay where they are. Growing symmetrically would slide the
    // sequencer ring sideways across its own pad every time the panel opened, which
    // reads as the module jumping rather than as a panel appearing.
    export function NaAudio__ModuleBase__SetBaseWidthFactor(module, factor) {
        const targetWidth  =  module.CageSize.x * factor;
        if (Math.abs(targetWidth - module.BaseWidth) < 0.0001) return;

        module.BaseWidth  =  targetWidth;

        const growth  =  targetWidth - module.CageSize.x;
        const shiftX  =  growth / 2;

        // THE PAD
        if (module.Pad) {
            const inset  =  SpatialNumber('Shell', 'PadInset');
            const width  =  targetWidth      - inset * 2;
            const depth  =  module.CageSize.z - inset * 2;

            module.Pad.geometry  =  Shapes.NaAudio__Env3d__ShapeFactory__RoundedPad(
                width, depth, Math.min(module.CageSize.z - inset * 2, width) * 0.18, SpatialNumber('Shell', 'PadCornerSegments')
            );
            module.Pad.position.x  =  shiftX;
        }

        // THE CAGE
        if (module.Cage) {
            const previous  =  module.Cage.geometry;

            const sized  =  new THREE.Vector3(targetWidth, module.CageSize.y, module.CageSize.z);
            const rebuilt  =  Lines.NaAudio__Env3d__LineFactory__BuildCage(sized, module.CageSize.y / 2);

            module.Cage.geometry  =  rebuilt.geometry;
            module.Cage.position.x  =  shiftX;

            // The rebuilt cage was only a carrier for its geometry. Its own material is
            // discarded rather than swapped in, because the live cage's material holds
            // the module's current lock opacity and replacing it would reset the fade.
            rebuilt.material.dispose();
            if (previous && previous !== module.Cage.geometry) previous.dispose();
        }

        if (module.Label) module.Label.position.x  =  shiftX;
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

            // MULTIPLIED, never assigned. A material may already carry an opacity that
            // means something of its own - a sequencer ghosts its inactive steps that
            // way - and assigning the lock's value here would erase it, which silently
            // turned every step in a pattern fully opaque and made the pattern
            // unreadable. The lock scales what is there rather than replacing it.
            if (material.transparent) {
                const ownOpacity  =  material.userData.NaAudio__BaseOpacity;
                material.opacity  =  (ownOpacity === undefined ? 1 : ownOpacity) * bodyOpacity;
            }
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
        if (material.userData.NaAudio__BaseOpacity === undefined) {
            material.userData.NaAudio__BaseOpacity  =  material.opacity;      // <-- The material's own meaning, which the lock fade scales
        }
        module.OwnedMaterials.push(material);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Material's Own Opacity, Respecting the Lock Fade
    // ------------------------------------------------------------
    // The sanctioned way for a module type to make one of its materials more or less
    // transparent. Writing material.opacity directly appears to work and then loses the
    // value on the next lock transition, because the fade recomputes from this number.
    export function NaAudio__ModuleBase__SetMaterialOpacity(module, material, opacity) {
        if (!material) return;

        material.userData.NaAudio__BaseOpacity  =  opacity;

        const locked   =  Palette.NaAudio__Palette__ModuleState('locked');
        const working  =  Palette.NaAudio__Palette__ModuleState('working');
        const bodyOpacity  =  working.BodyOpacity + (locked.BodyOpacity - working.BodyOpacity) * module.LockBlend;

        material.opacity  =  opacity * bodyOpacity;
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
    // Both of these compose the SAME local offset the port factory used to place the
    // socket mesh with the module's live position. That is the whole trick: a lead can
    // never be drawn to a point the socket is not at, because there is one function that
    // decides where a socket goes and both callers go through it.
    //
    // Position rather than the socket's world matrix, because the hover lift moves the
    // shell every frame and a matrix read here would be one frame stale - which shows up
    // as the leads detaching slightly whenever the pointer crosses a module.
    export function NaAudio__ModuleBase__OutputPortPosition(module, out) {
        const target  =  out || new THREE.Vector3();
        PortFactory.NaAudio__PortFactory__Offset(module, 'output', target);
        return target.add(module.Position);
    }
    // ------------------------------------------------------------


    // FUNCTION | The World Position of a Module's Input Port
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__InputPortPosition(module, out) {
        const target  =  out || new THREE.Vector3();
        PortFactory.NaAudio__PortFactory__Offset(module, 'input', target);
        return target.add(module.Position);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose a Module and Everything It Owns
    // ------------------------------------------------------------
    export function NaAudio__ModuleBase__Dispose(module) {
        GroundField.NaAudio__Env3d__GroundField__RemoveSource(module.ModuleId);

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
