/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | MODULE REGISTRY
   =============================================================================

   FILE       : NaAudio__Spatial__ModuleRegistry__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - ModuleRegistry
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Hold the live modules, drive them, and load a space from JSON
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Two registries, and the distinction matters:
       * TYPES     - one entry per kind of module, registered at boot by the module
                     files themselves. A catalogue of what CAN exist.
       * INSTANCES - one entry per module actually standing in the space.
   - Also owns the single update hook and the single transport scheduler that drive
     every instance, and the selection state.

   ---------------------------------------------------------------------------

   ONE HOOK AND ONE SCHEDULER FOR EVERYTHING

   Every instance could register its own frame hook and its own transport scheduler.
   It would work, and it would be worse.

   With one of each, the iteration order over modules is fixed and knowable, the
   diagnostics readout has one place to measure, and a module can be locked by simply
   not being called - which is exactly how the lock state is implemented. Twenty
   independent hooks would make all three of those things impossible to reason about.

   ---------------------------------------------------------------------------

   A SPACE IS DATA

   The demo arrangement is a JSON file in the patch library, not a bootstrap function.
   Three modules, their positions, their kit bindings and their patch cables are all
   declared there.

   That is not tidiness for its own sake. It means a new arrangement is authored by
   editing JSON, it means the save format and the load format are the same format from
   the first day, and it means the demo cannot drift out of step with the loader
   because the loader is the only thing that has ever built it.

   ============================================================================= */

import * as THREE from 'three';

import {
    SpatialSection, SpatialNumber, SpatialBool,
    NaAudio__ConfigAccess__ModuleTypeDefaults
} from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import { NaAudio__WiringController__Hooks }  from './NaAudio__Spatial__WiringController__.mjs';
import * as ModuleBase                                  from './NaAudio__Spatial__ModuleBase__.mjs';
import { NaAudio__Env3d__SceneManager__AddUpdateHook }   from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import { NaAudio__Env3d__Interaction__SetEmptyClickHandler } from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import {
    NaAudio__Transport__RegisterScheduler
} from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Module Registry
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Type Catalogue and Live Instances
    // ------------------------------------------------------------
    const TYPES      =  new Map();                                           // <-- TypeName -> type implementation object
    const INSTANCES  =  new Map();                                           // <-- ModuleId -> module record

    let attachedSurface  =  null;
    let selectedModuleId =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Spatial Module Type
    // ------------------------------------------------------------
    // Called once per module type at boot. The TypeName must match a key in the
    // TypeDefaults block of Na__SpatialModules__Config.json - the check is immediate
    // and loud, because the alternative is a module that instantiates and then has no
    // idea how big it is.
    export function NaAudio__ModuleRegistry__RegisterType(typeName, implementation) {
        const defaults  =  SpatialSection('TypeDefaults');

        if (!defaults[typeName]) {
            throw new Error('[NaAudio ModuleRegistry] Type "' + typeName + '" has no TypeDefaults entry in Na__SpatialModules__Config.json. Add one before registering the type.');
        }

        TYPES.set(typeName, implementation);
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Registered Type Name and Its Label
    // ------------------------------------------------------------
    // The HUD builds its add-module menu from this, so a newly registered type appears
    // in the interface without the HUD being edited.
    export function NaAudio__ModuleRegistry__TypeList() {
        const defaults  =  SpatialSection('TypeDefaults');

        return Array.from(TYPES.keys()).map((typeName) => ({
            TypeName : typeName,
            Label    : defaults[typeName].TypeLabel || typeName,
            Note     : defaults[typeName].TypeNote  || ''
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Registry to a Surface and Start Driving Modules
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Attach(surface) {
        attachedSurface  =  surface;

        NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function (delta, elapsed) {
            for (const module of INSTANCES.values()) {
                ModuleBase.NaAudio__ModuleBase__Update(module, delta, elapsed);
            }
        });

        NaAudio__Transport__RegisterScheduler('NaAudio__ModuleRegistry', function (window) {
            for (const module of INSTANCES.values()) {
                ModuleBase.NaAudio__ModuleBase__Schedule(module, window);
            }
        });

        NaAudio__Env3d__Interaction__SetEmptyClickHandler(function () {
            NaAudio__ModuleRegistry__Select(null);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Choose a Ring Position for a Module With No Declared Position
    // ------------------------------------------------------------
    // Modules sit on a ring rather than a grid, because a ring keeps every module the
    // same distance from the listener at the centre - which is the spatial metaphor the
    // whole application rests on. The radius grows with the module count so a busy
    // space spreads out rather than crowding.
    function NaAudio__ModuleRegistry__RingPosition(index) {
        const layout   =  SpatialSection('Layout');
        const count    =  Math.max(INSTANCES.size + 1, 1);

        const radius   =  layout.RingRadius + layout.RingRadiusGrowthPerModule * Math.max(count - 3, 0);
        const azimuth  =  (index / Math.max(count, 3)) * Math.PI * 2;

        return { x: Math.sin(azimuth) * radius, z: Math.cos(azimuth) * radius };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Position Clear of Existing Modules
    // ------------------------------------------------------------
    // Overlapping cages make the lock state unreadable and make picking ambiguous, so a
    // new module is walked outward along its own bearing until it clears everything.
    // Bounded, because an unbounded search on a full ring would never terminate.
    function NaAudio__ModuleRegistry__PushClear(position) {
        const minimum   =  SpatialNumber('Layout', 'MinimumSeparation');
        const bearing   =  new THREE.Vector2(position.x, position.z);

        if (bearing.lengthSq() < 0.0001) bearing.set(0, 1);                   // <-- Dead centre has no bearing to push along
        bearing.normalize();

        for (let attempt = 0; attempt < 40; attempt++) {
            let clear  =  true;

            for (const module of INSTANCES.values()) {
                const dx  =  module.Position.x - position.x;
                const dz  =  module.Position.z - position.z;
                if (Math.sqrt(dx * dx + dz * dz) < minimum) { clear = false; break; }
            }

            if (clear) return position;

            position.x += bearing.x * minimum * 0.5;
            position.z += bearing.y * minimum * 0.5;
        }

        return position;                                                      // <-- Gave up; better an overlap than a hang
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Instance Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | The Implementation Registered Under a Type Name
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Type(typeName) {
        return TYPES.get(typeName) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Next Free Id for a Type
    // ------------------------------------------------------------
    // SEQ_01, SEQ_02 and so on, from the type's IdPrefix. It scans for the highest
    // number already in use rather than counting instances, because counting gives the
    // id of a module that was deleted back to the next one added - and a space file, a
    // saved patch and an undo history would then all disagree about which SEQ_02 was
    // meant.
    export function NaAudio__ModuleRegistry__NextId(typeName) {
        const defaults  =  SpatialSection('TypeDefaults')[typeName];
        const prefix    =  (defaults && defaults.IdPrefix) ? defaults.IdPrefix : typeName.toUpperCase().slice(0, 4);

        let highest  =  0;

        for (const moduleId of INSTANCES.keys()) {
            if (moduleId.indexOf(prefix + '_') !== 0) continue;

            const suffix  =  parseInt(moduleId.slice(prefix.length + 1), 10);
            if (!isNaN(suffix) && suffix > highest) highest = suffix;
        }

        return prefix + '_' + String(highest + 1).padStart(2, '0');
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Footprint Would Fit at a Position
    // ------------------------------------------------------------
    // Used by the placement ghost to refuse a drop before it happens. Compared against
    // the LIVE base width, so an expanded sequencer is as big as it looks.
    export function NaAudio__ModuleRegistry__IsPositionClear(x, z, footprint, ignoreModuleId) {
        const separation  =  SpatialNumber('Placement', 'MinimumSeparation');

        for (const module of INSTANCES.values()) {
            if (module.ModuleId === ignoreModuleId) continue;

            const other  =  Math.max(module.BaseWidth || module.CageSize.x, module.CageSize.z) * 0.5;
            const needed =  footprint * 0.5 + other + separation;

            const dx  =  module.Position.x - x;
            const dz  =  module.Position.z - z;

            if (dx * dx + dz * dz < needed * needed) return false;
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Module Instance From a Definition
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Add(definition) {
        const implementation  =  TYPES.get(definition.TypeName);

        if (!implementation) {
            console.error('[NaAudio ModuleRegistry] Unknown module type "' + definition.TypeName + '". Registered: ' + Array.from(TYPES.keys()).join(', '));
            return null;
        }

        if (INSTANCES.has(definition.ModuleId)) {
            console.error('[NaAudio ModuleRegistry] Module id "' + definition.ModuleId + '" is already in the space. Ids must be unique within a space file.');
            return null;
        }

        const resolved  =  Object.assign({}, definition);

        // A TYPE'S OWN DEFAULTS, UNDER whatever the caller supplied.
        //
        // A space file names everything it wants and this changes nothing for it. A module
        // placed from the palette supplies almost nothing, and without this a fresh
        // sequencer arrived with every lane empty - silent, and visually identical to a
        // working one, so there was no way to tell whether it was blank or broken.
        //
        // Deep-copied, because the merged object becomes module.Settings and a module type
        // is free to write to that. A shallow copy would hand every future instance of the
        // type a reference to the same array the config was parsed into, and the first
        // module to edit its pattern would quietly rewrite the default for the next one.
        const typeDefaults  =  NaAudio__ConfigAccess__ModuleTypeDefaults(definition.TypeName);

        if (typeDefaults && typeDefaults.DefaultSettings) {
            resolved.Settings  =  Object.assign(
                JSON.parse(JSON.stringify(typeDefaults.DefaultSettings)),
                definition.Settings || {}
            );
        }

        if (!resolved.Position) {
            resolved.Position  =  NaAudio__ModuleRegistry__PushClear(NaAudio__ModuleRegistry__RingPosition(INSTANCES.size));
        }

        const module  =  ModuleBase.NaAudio__ModuleBase__Create(attachedSurface, resolved, implementation);
        INSTANCES.set(module.ModuleId, module);

        ModuleBase.NaAudio__ModuleBase__Attach(
            module,
            NaAudio__ModuleRegistry__Select,
            NaAudio__WiringController__Hooks                                  // <-- What grabbing one of this module's ports means
        );

        return module;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Module Instance
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Remove(moduleId) {
        const module  =  INSTANCES.get(moduleId);
        if (!module) return;

        if (selectedModuleId === moduleId) NaAudio__ModuleRegistry__Select(null);

        ModuleBase.NaAudio__ModuleBase__Dispose(module);
        INSTANCES.delete(moduleId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Look Up a Module Instance
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Module(moduleId) {
        return INSTANCES.get(moduleId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Live Module Instance
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Modules() {
        return Array.from(INSTANCES.values());
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Every Module Instance
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Clear() {
        for (const moduleId of Array.from(INSTANCES.keys())) {
            NaAudio__ModuleRegistry__Remove(moduleId);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Select a Module, or Clear the Selection With Null
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Select(moduleId) {
        if (selectedModuleId === moduleId) return;

        const previous  =  selectedModuleId ? INSTANCES.get(selectedModuleId) : null;
        if (previous) ModuleBase.NaAudio__ModuleBase__SetSelected(previous, false);

        selectedModuleId  =  moduleId;

        const next  =  moduleId ? INSTANCES.get(moduleId) : null;
        if (next) ModuleBase.NaAudio__ModuleBase__SetSelected(next, true);

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleSelected, { ModuleId: moduleId });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Currently Selected Module, or Null
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Selected() {
        return selectedModuleId ? INSTANCES.get(selectedModuleId) : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Space Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load a Space Definition
    // ------------------------------------------------------------
    // A space document is:
    //     {
    //       NaAudio__Space__Meta     : { SpaceId, Name, Bpm, ... }
    //       NaAudio__Space__Modules  : [ module definitions ]
    //       NaAudio__Space__Cables   : [ cable definitions ]
    //     }
    //
    // Cables are NOT connected here. Every module has to exist before any cable can be
    // resolved, so the caller connects them after this returns - see the boot sequence
    // in NaAudio__AppCore__Init.
    export function NaAudio__ModuleRegistry__LoadSpace(spaceDocument) {
        NaAudio__ModuleRegistry__Clear();

        const definitions  =  spaceDocument['NaAudio__Space__Modules'] || [];
        const loaded       =  [];

        for (let i = 0; i < definitions.length; i++) {
            const module  =  NaAudio__ModuleRegistry__Add(definitions[i]);
            if (module) loaded.push(module);
        }

        return loaded;
    }
    // ------------------------------------------------------------


    // FUNCTION | Serialise the Live Space Back to a Space Document
    // ------------------------------------------------------------
    // The save half of the load format. Written now rather than later so the two stay
    // symmetric from the start - a save path bolted on after the fact is how a format
    // ends up with fields the loader silently ignores.
    export function NaAudio__ModuleRegistry__SerialiseSpace(meta, cableDefinitions) {
        return {
            'NaAudio__Space__Meta'    : meta,
            'NaAudio__Space__Modules' : NaAudio__ModuleRegistry__Modules().map((module) => ({
                ModuleId    : module.ModuleId,
                TypeName    : module.TypeName,
                DisplayName : module.DisplayName,
                Position    : { x: module.Position.x, z: module.Position.z },
                IsLocked    : module.IsLocked,
                Settings    : module.Settings
            })),
            'NaAudio__Space__Cables'  : cableDefinitions || []
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Diagnostics
// -----------------------------------------------------------------------------

    // FUNCTION | Instance and Lock Counts
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__Counts() {
        let locked  =  0;
        for (const module of INSTANCES.values()) {
            if (module.IsLocked) locked += 1;
        }

        return {
            Types    : TYPES.size,
            Modules  : INSTANCES.size,
            Locked   : locked,
            Working  : INSTANCES.size - locked
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether Centre-Clear Placement Is Enforced
    // ------------------------------------------------------------
    export function NaAudio__ModuleRegistry__CentreKeptClear() {
        return SpatialBool('Layout', 'CentreKeptClear');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
