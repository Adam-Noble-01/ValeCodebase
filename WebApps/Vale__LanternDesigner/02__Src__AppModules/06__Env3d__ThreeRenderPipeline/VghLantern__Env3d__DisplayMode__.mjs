/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | DISPLAY MODE
   =============================================================================

   FILE       : VghLantern__Env3d__DisplayMode__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - DisplayMode
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Switch a surface between the solid model and the setting-out view
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Owns which of the two geometry classes a surface is currently showing, and
     nothing else. It builds no geometry and computes no numbers - both classes
     are already in the scene graph, and this module decides what is visible.
   - Switching is therefore instant and allocation free. Neither the solid meshes
     nor the setting-out lines are rebuilt to change mode.

   ---------------------------------------------------------------------------

   THE THREE MODES

       solid3d     The finished model. Setting-out linework hidden entirely.
                   This is the mode a snapshot must always be taken in.

       both        The solid model ghosted back, with the setting-out linework
                   drawn over it at full strength. This is the mode that proves a
                   datum governs the metal it is supposed to govern - a ridge
                   datum floating clear of the ridge section is only visible when
                   both are on screen at once.

       setOut      Setting-out linework alone against the backdrop. The solid
                   model is hidden, so nothing occludes a construction triangle
                   and the whole cage reads at once.

   ---------------------------------------------------------------------------

   WHY GHOSTING REUSES THE HOVER INSPECTOR'S GHOST MATERIAL

   The inspector already owns a considered "receded but still legible" material,
   tuned so a ghosted model reads as context rather than as a fault. Using a
   second, differently tuned ghost here would mean two answers to the same
   question and two places to adjust it.

   ============================================================================= */

import { VghLantern__Env3d__ConfigAccess__RequireString } from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__Ghost,
    VghLantern__Env3d__MaterialLibrary__GhostGlazing
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneGroup,
    VghLantern__Env3d__SceneGroupSet__Solid3d
} from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Display Mode Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Three Display Modes
    // ------------------------------------------------------------
    export const VghLantern__Env3d__DisplayMode__Solid3d  =  'solid3d';      // <-- The finished model alone
    export const VghLantern__Env3d__DisplayMode__Both     =  'both';         // <-- Model ghosted, setting out over it
    export const VghLantern__Env3d__DisplayMode__SetOut   =  'setOut';       // <-- Setting out alone

    export const VghLantern__Env3d__DisplayMode__Order  =  [
        VghLantern__Env3d__DisplayMode__Solid3d,
        VghLantern__Env3d__DisplayMode__Both,
        VghLantern__Env3d__DisplayMode__SetOut
    ];

    const MODE_LABELS  =  {
        solid3d : 'Model',
        both    : 'Model + Setting Out',
        setOut  : 'Setting Out'
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ghosting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether an Object Can Take a Material Swap
    // ------------------------------------------------------------
    function VghLantern__Env3d__DisplayMode__IsPaintable(node) {
        return !!(node && node.material && (node.isMesh || node.isLine || node.isPoints));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Restore Every Material This Module Swapped
    // ------------------------------------------------------------
    // Restored in reverse so a node swapped more than once still ends on its
    // original, though a single Apply pass never swaps the same node twice.
    function VghLantern__Env3d__DisplayMode__Unghost(surface) {
        const state  =  surface.DisplayModeState;
        if (!state || !state.Swapped) return;

        for (let i = state.Swapped.length - 1; i >= 0; i--) {
            state.Swapped[i].Object3d.material  =  state.Swapped[i].Material;
        }
        state.Swapped.length  =  0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Ghost Every Solid Mesh in the Model
    // ------------------------------------------------------------
    // Deliberately separate from the hover inspector's own ghosting. Both may be
    // active at once - a reviewer can hover a member while in 'both' mode - and
    // each restores only what it swapped, so the two never fight over a material.
    function VghLantern__Env3d__DisplayMode__Ghost(surface) {
        const state         =  surface.DisplayModeState;
        const ghostSolid    =  VghLantern__Env3d__MaterialLibrary__Ghost();
        const ghostGlazing  =  VghLantern__Env3d__MaterialLibrary__GhostGlazing();

        for (let g = 0; g < VghLantern__Env3d__SceneGroupSet__Solid3d.length; g++) {
            const groupName  =  VghLantern__Env3d__SceneGroupSet__Solid3d[g];
            const group      =  surface.Groups[groupName];
            if (!group) continue;

            const ghost  =  (groupName === VghLantern__Env3d__SceneGroup.Solid3d__Glazing)
                ? ghostGlazing
                : ghostSolid;

            group.traverse(function(node) {
                if (!VghLantern__Env3d__DisplayMode__IsPaintable(node)) return;

                state.Swapped.push({ Object3d : node, Material : node.material });
                node.material  =  ghost;
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Application
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Set Visibility on a Set of Groups
    // ------------------------------------------------------------
    function VghLantern__Env3d__DisplayMode__SetGroupsVisible(surface, groupNames, isVisible) {
        for (let i = 0; i < groupNames.length; i++) {
            const group  =  surface.Groups[groupNames[i]];
            if (group) group.visible  =  isVisible;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Display Mode to a Surface
    // ------------------------------------------------------------
    // Idempotent and safe to call on every render, which is what keeps the mode
    // sticky across a rebuild without the caller having to remember it.
    export function VghLantern__Env3d__DisplayMode__Apply(surface, modeKey) {
        if (!surface || !surface.Groups) return;

        if (!surface.DisplayModeState) surface.DisplayModeState  =  { Mode : '', Swapped : [] };
        const state  =  surface.DisplayModeState;

        const mode  =  (VghLantern__Env3d__DisplayMode__Order.indexOf(modeKey) !== -1)
            ? modeKey
            : VghLantern__Env3d__DisplayMode__Solid3d;

        VghLantern__Env3d__DisplayMode__Unghost(surface);                     // <-- Always start from the true materials

        const showSolid   =  mode !== VghLantern__Env3d__DisplayMode__SetOut;
        const showSetOut  =  mode !== VghLantern__Env3d__DisplayMode__Solid3d;

        VghLantern__Env3d__DisplayMode__SetGroupsVisible(surface, VghLantern__Env3d__SceneGroupSet__Solid3d, showSolid);
        VghLantern__Env3d__DisplayMode__SetGroupsVisible(surface, [VghLantern__Env3d__SceneGroup.SetOut__Lines], showSetOut);

        if (mode === VghLantern__Env3d__DisplayMode__Both) {
            VghLantern__Env3d__DisplayMode__Ghost(surface);
        }

        state.Mode  =  mode;
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Display Mode a Surface Is In
    // ------------------------------------------------------------
    export function VghLantern__Env3d__DisplayMode__Current(surface) {
        if (surface && surface.DisplayModeState && surface.DisplayModeState.Mode) {
            return surface.DisplayModeState.Mode;
        }
        return VghLantern__Env3d__ConfigAccess__RequireString('SetOut', 'DefaultDisplayMode');
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance a Surface to the Next Display Mode
    // ------------------------------------------------------------
    // Returns the mode landed on, so a caller can update its own control without
    // asking a second time.
    export function VghLantern__Env3d__DisplayMode__Cycle(surface) {
        const current  =  VghLantern__Env3d__DisplayMode__Current(surface);
        const index    =  VghLantern__Env3d__DisplayMode__Order.indexOf(current);
        const next     =  VghLantern__Env3d__DisplayMode__Order[(index + 1) % VghLantern__Env3d__DisplayMode__Order.length];

        VghLantern__Env3d__DisplayMode__Apply(surface, next);
        return next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Human Readable Name for a Display Mode
    // ------------------------------------------------------------
    export function VghLantern__Env3d__DisplayMode__Label(modeKey) {
        return MODE_LABELS[modeKey] || modeKey;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Every Display Mode With Its Label
    // ------------------------------------------------------------
    // Consumed by the 3D overlay so its buttons are generated from this list
    // rather than hardcoded, and a fourth mode would appear without a UI edit.
    export function VghLantern__Env3d__DisplayMode__List() {
        const list  =  [];

        for (let i = 0; i < VghLantern__Env3d__DisplayMode__Order.length; i++) {
            const key  =  VghLantern__Env3d__DisplayMode__Order[i];
            list.push({ Key : key, Label : MODE_LABELS[key] || key });
        }
        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
