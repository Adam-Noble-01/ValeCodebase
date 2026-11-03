/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - MAPPINGS
   =============================================================================

   FILE       : PainterlyNPR__Navigation__Mappings__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - Mappings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The navigation mappings read from Na__Navigation__Config.json, and
                the pure tests that say what a button, a key or a device means
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - A constants module: it imports nothing but its JSON and ConfigAccess, so
     the handlers may read its sections at any time (the load-order rule).
   - MatchPointer(button, modifiers) names the drag a press starts (Orbit, Pan,
     Dolly); MatchKey(event) the key binding a key event is; DampingFor(type)
     the share of a damped move applied each frame (1: undamped).

   ============================================================================= */

import NavigationConfig from './Na__Navigation__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Navigation - Mappings
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Navigation__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT     =  'PainterlyNPR__Navigation__Config';
    const POINTER  =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Pointer', ['DragSlopPx', 'Bindings']);
    const SPEEDS   =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Speeds',  ['RotateSpeed', 'PanSpeed', 'DollyPer100Px']);
    const WHEEL    =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Wheel',   ['ZoomRate', 'StepClamp', 'LineDeltaPx', 'PageDeltaPx', 'PinchMultiplier', 'AccelerateAfterTicks', 'AcceleratePerTick', 'TickResetMs']);
    const TOUCH    =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Touch',   ['OneFinger', 'TwoFingers', 'TapSlopPx']);
    const KEYS     =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Keys',    ['MoveStepM', 'ElevationStepM', 'FineModifier', 'FineScale', 'RigModifier', 'ZoomKeyStep', 'Bindings']);
    const LIMITS   =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Limits',  ['PitchMinDeg', 'PitchMaxDeg', 'MinEyeHeightM']);
    const DAMPING  =  PainterlyNPR__ConfigAccess__Section(NavigationConfig, ROOT, 'Damping', ['MouseEnabled', 'MouseFactor', 'TouchEnabled', 'TouchFactor', 'StopBelowDeg', 'StopBelowM']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Names
    // ------------------------------------------------------------
    const BUTTON_NAMES    =  ['Left', 'Middle', 'Right'];                     // <-- Indexed by PointerEvent.button
    const MODIFIER_NAMES  =  ['Ctrl', 'Shift', 'Alt', 'Meta'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Matching
// -----------------------------------------------------------------------------

    // FUNCTION | The Modifiers an Event Holds - { Ctrl, Shift, Alt, Meta }
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__Modifiers(event) {
        return { Ctrl: !!event.ctrlKey, Shift: !!event.shiftKey, Alt: !!event.altKey, Meta: !!event.metaKey };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Binding's Modifiers Match What Is Held
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__ModifiersMatch(binding, held) {
        const want  =  binding.Modifiers || [];
        if (binding.ModifierMatch === 'Any')   return true;
        if (binding.ModifierMatch === 'AnyOf') return want.some((name) => held[name]);
        return MODIFIER_NAMES.every((name) => !!held[name] === want.includes(name));    // <-- Exact
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drag a Press Starts - 'Orbit', 'Pan', 'Dolly' or null
    // ------------------------------------------------------------
    // button: a PointerEvent.button number; held: Modifiers(event). The first
    // enabled binding that matches wins.
    function PainterlyNPR__Navigation__MatchPointer(button, held) {
        const name  =  BUTTON_NAMES[button];
        if (!name) return null;
        for (const binding of POINTER.Bindings) {
            if (binding.Enabled === false || binding.Button !== name) continue;
            if (PainterlyNPR__Navigation__ModifiersMatch(binding, held)) return binding.Action;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Key Binding a Key Event Is - { Action, Held } or null
    // ------------------------------------------------------------
    // Letters match either case (Shift + W is still W); named keys exactly. A
    // NoShift binding is passed over while Shift is held (Shift + R is the work
    // mode's switch, not a reset).
    function PainterlyNPR__Navigation__MatchKey(event) {
        const key  =  event.key || '';
        const low  =  key.length === 1 ? key.toLowerCase() : key;
        for (const binding of KEYS.Bindings) {
            if (binding.Enabled === false || (binding.NoShift === true && event.shiftKey)) continue;
            if (binding.Keys.some((k) => (k.length === 1 ? k.toLowerCase() : k) === low)) return { Action: binding.Action, Held: binding.Held === true };
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Share of a Damped Move Applied Each Frame (1: undamped)
    // ------------------------------------------------------------
    function PainterlyNPR__Navigation__DampingFor(pointerType) {
        const touch  =  pointerType === 'touch';
        const on     =  touch ? DAMPING.TouchEnabled : DAMPING.MouseEnabled;
        const share  =  touch ? DAMPING.TouchFactor : DAMPING.MouseFactor;
        return on && share > 0 && share < 1 ? share : 1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Navigation__DampingFor,
        PainterlyNPR__Navigation__MatchKey,
        PainterlyNPR__Navigation__MatchPointer,
        PainterlyNPR__Navigation__Modifiers,
        DAMPING  as  PainterlyNPR__Navigation__DAMPING,
        KEYS     as  PainterlyNPR__Navigation__KEYS,
        LIMITS   as  PainterlyNPR__Navigation__LIMITS,
        POINTER  as  PainterlyNPR__Navigation__POINTER,
        SPEEDS   as  PainterlyNPR__Navigation__SPEEDS,
        TOUCH    as  PainterlyNPR__Navigation__TOUCH,
        WHEEL    as  PainterlyNPR__Navigation__WHEEL,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
