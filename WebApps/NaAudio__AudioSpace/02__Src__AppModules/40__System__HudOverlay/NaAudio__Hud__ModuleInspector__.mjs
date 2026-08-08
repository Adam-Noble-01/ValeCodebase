/* =============================================================================
   NAAUDIO - HUD OVERLAY | MODULE INSPECTOR
   =============================================================================

   FILE       : NaAudio__Hud__ModuleInspector__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - ModuleInspector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A small card describing the selected module and its lock state
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Appears when a module is selected, empty otherwise. Names the module, states what
     it does and how to work it, and carries the lock toggle.

   ---------------------------------------------------------------------------

   WHY THIS IS NOT A PARAMETER PANEL

   Every conventional DAW answers 'the user selected a device' by opening a panel of
   every parameter that device has. Doing that here would rebuild the exact nested,
   menu-heavy interface the design manifest exists to get away from - and worse, it would
   make the 3D controls redundant. Given a slider and a cube face for the same parameter,
   people use the slider, and the whole premise dies.

   So the inspector deliberately exposes NO parameters. Parameters are edited in the
   space, on the object. What the card carries is what genuinely has nowhere else to
   live:

       * The module's name and what it is
       * A short reminder of how to work it, for the first few sessions
       * Its lock state - which is a session-level decision about CPU and attention,
         not a musical parameter
       * Where its output goes

   If something new needs adding here, the first question is whether it could be a
   control in the space instead. It usually can.

   ============================================================================= */

import {
    NaAudio__ModuleRegistry__Module
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleRegistry__.mjs';
import { NaAudio__LockState__Toggle }  from '../20__System__SpatialModuleFramework/NaAudio__Spatial__LockState__.mjs';
import { NaAudio__PatchGraph__Cables } from '../20__System__SpatialModuleFramework/NaAudio__Spatial__PatchGraph__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Module Inspector
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Working Notes Per Module Type
    // ------------------------------------------------------------
    // Held here rather than in config because they are interface copy, not tuning. A
    // type with no entry simply shows its config TypeNote instead.
    const WORKING_NOTES  =  {
        CircularSequencer : 'Click a step to switch it on or off. Steps grow when active and flash as the marker passes. Each ring is one drum voice, and each voice has its own shape.',
        CubeMod           : 'Drag any face to move its pad. Each face is two parameters, so six faces give twelve. Click a side face to turn it to the front.',
        DelayCloud        : 'Drag a corner handle to resize the box. Length is reverb decay, width is delay time, height is damping. The spheres bounce off the walls and each bounce is a tap.'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let cardElement    =  null;
    let titleElement   =  null;
    let typeElement    =  null;
    let noteElement    =  null;
    let routeElement   =  null;
    let lockButton     =  null;

    let currentModuleId  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Inspector Card
    // ------------------------------------------------------------
    export function NaAudio__ModuleInspector__Build(mountElement) {
        cardElement  =  document.createElement('aside');
        cardElement.className  =  'NaAudio__Inspector';

        titleElement  =  document.createElement('h2');
        titleElement.className  =  'NaAudio__Inspector__Title';
        cardElement.appendChild(titleElement);

        typeElement  =  document.createElement('p');
        typeElement.className  =  'NaAudio__Inspector__Type';
        cardElement.appendChild(typeElement);

        noteElement  =  document.createElement('p');
        noteElement.className  =  'NaAudio__Inspector__Note';
        cardElement.appendChild(noteElement);

        routeElement  =  document.createElement('p');
        routeElement.className  =  'NaAudio__Inspector__Route';
        cardElement.appendChild(routeElement);

        lockButton  =  document.createElement('button');
        lockButton.className  =  'NaAudio__Inspector__LockButton';
        lockButton.addEventListener('click', NaAudio__ModuleInspector__ToggleLock);
        cardElement.appendChild(lockButton);

        mountElement.appendChild(cardElement);

        NaAudio__ModuleInspector__SubscribeToEvents();
        NaAudio__ModuleInspector__Show(null);

        return cardElement;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Follow Selection and Lock Events
    // ------------------------------------------------------------
    function NaAudio__ModuleInspector__SubscribeToEvents() {
        NaAudio__EventBus__Subscribe(NaAudio__Event.ModuleSelected, function (payload) {
            NaAudio__ModuleInspector__Show(payload.ModuleId);
        });

        NaAudio__EventBus__Subscribe(NaAudio__Event.ModuleLockChanged, function (payload) {
            if (payload.ModuleId === currentModuleId) NaAudio__ModuleInspector__Show(currentModuleId);
        });

        // A cable connected or dropped changes what the routing line says, so the card is
        // refreshed. Cheap, and a stale routing line is worse than no routing line.
        NaAudio__EventBus__Subscribe(NaAudio__Event.CableConnected, function () {
            if (currentModuleId) NaAudio__ModuleInspector__Show(currentModuleId);
        });
        NaAudio__EventBus__Subscribe(NaAudio__Event.CableDisconnected, function () {
            if (currentModuleId) NaAudio__ModuleInspector__Show(currentModuleId);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Content
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Describe Where a Module's Output Goes
    // ------------------------------------------------------------
    function NaAudio__ModuleInspector__DescribeRouting(moduleId) {
        const outgoing  =  NaAudio__PatchGraph__Cables().filter((cable) => cable.FromModuleId === moduleId);
        const incoming  =  NaAudio__PatchGraph__Cables().filter((cable) => cable.ToModuleId   === moduleId);

        const parts  =  [];

        if (outgoing.length === 0) {
            parts.push('Output goes straight to the master bus.');
        } else {
            parts.push('Output feeds ' + outgoing.map((cable) => cable.ToModuleId).join(', ') + '.');
        }

        if (incoming.length > 0) {
            parts.push('Fed by ' + incoming.map((cable) => cable.FromModuleId).join(', ') + '.');
        }

        return parts.join('  ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Module in the Inspector, or Clear It With Null
    // ------------------------------------------------------------
    export function NaAudio__ModuleInspector__Show(moduleId) {
        currentModuleId  =  moduleId;

        if (!moduleId) {
            cardElement.classList.remove('NaAudio__Inspector--visible');
            return;
        }

        const module  =  NaAudio__ModuleRegistry__Module(moduleId);
        if (!module) {
            cardElement.classList.remove('NaAudio__Inspector--visible');
            return;
        }

        titleElement.textContent  =  module.DisplayName;
        typeElement.textContent   =  module.TypeLabel;
        noteElement.textContent   =  WORKING_NOTES[module.TypeName] || module.Defaults.TypeNote || '';
        routeElement.textContent  =  NaAudio__ModuleInspector__DescribeRouting(moduleId);

        lockButton.textContent  =  module.IsLocked ? 'Unlock module  (L)' : 'Lock module  (L)';
        lockButton.classList.toggle('NaAudio__Inspector__LockButton--locked', module.IsLocked);

        cardElement.classList.add('NaAudio__Inspector--visible');
        cardElement.classList.toggle('NaAudio__Inspector--locked', module.IsLocked);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle the Lock on the Shown Module
    // ------------------------------------------------------------
    function NaAudio__ModuleInspector__ToggleLock() {
        if (!currentModuleId) return;

        const module  =  NaAudio__ModuleRegistry__Module(currentModuleId);
        if (module) NaAudio__LockState__Toggle(module);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
