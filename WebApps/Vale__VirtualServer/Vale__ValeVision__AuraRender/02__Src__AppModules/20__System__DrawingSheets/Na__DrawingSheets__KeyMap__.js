// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - THE KEY MAP
// =============================================================================
//
// FILE       : Na__DrawingSheets__KeyMap__.js
// NAMESPACE  : Na__SheetKeys
// MODULE     : Drawing Sheets - Key Map
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read the sheets' navigation bindings (Na__Hotkeys__DrawingSheets__.json)
//              and say what a button, a wheel turn or a key press means
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - The control modules ask here and never test a button or a key themselves,
//   so a binding changes in the JSON file and no control code moves.
// - Matching is the Layout Editor's: bindings in list order, the first enabled
//   match wins; ModifierMatch Exact, Any or CoarseOptional.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D (51__System__LayoutEditor/03__Core__Config/
//                   Na__LayoutEditor__ConfigState__KeyMap__.js 2.x, the navigation readers)
// - Ported on     : 30-Oct-2026 for AURA 0.1.3 - the navigation part only
// - Parity        : diverged (subset)
// - Divergences   :
//   - Reads its own file by a JSON import, with no built-in fallback map and no
//     handed-in personalisation (SetKeyMap): AURA ships the one file.
//   - Keys DrawingSheets__ for LayoutEditor__; the navigation limits live in the
//     same file (DrawingSheets__Navigation__Config), not the app config.
//   - No When contexts, selection or Measurements box readers: AURA's sheets
//     have none of those.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.1.3)
// - Initial port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import Na__SheetKeys__Map from './Na__Hotkeys__DrawingSheets__.json' with { type: 'json' };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading the Map
// -----------------------------------------------------------------------------

    const Na__SheetKeys__PREFIX    = 'DrawingSheets__';
    const Na__SheetKeys__MODIFIERS = ['Ctrl', 'Shift', 'Alt', 'Meta', 'Space'];


    // HELPER FUNCTION | One Value From a Block, or the Fallback
    // ------------------------------------------------------------
    function Na__SheetKeys__Val(block, key, fallback) {
        const section = Na__SheetKeys__Map[`${Na__SheetKeys__PREFIX}${block}__Config`];
        const value = section ? section[`${Na__SheetKeys__PREFIX}${block}__${key}`] : undefined;
        return (value === undefined || value === null) ? fallback : value;
    }

    function Na__SheetKeys__List(block) {
        const list = Na__SheetKeys__Val(block, 'List', null);
        return Array.isArray(list) ? list : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the Held Modifiers Satisfy a Binding
    // ------------------------------------------------------------
    // held is { Ctrl, Shift, Alt, Meta, Space }. Exact: the named ones and only
    // those. CoarseOptional: Exact, but the coarse step modifier may be held too.
    // ------------------------------------------------------------
    function Na__SheetKeys__ModifiersSatisfy(binding, held) {
        const mode = binding.ModifierMatch || 'Exact';
        if (mode === 'Any') return true;
        const named = Array.isArray(binding.Modifiers) ? binding.Modifiers : [];
        const forgive = mode === 'CoarseOptional' ? Na__SheetKeys__GetKeyboardSetup().coarseStepModifier : null;
        return Na__SheetKeys__MODIFIERS.every((name) => name === forgive || !!held[name] === named.includes(name));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Setups
// -----------------------------------------------------------------------------

    // FUNCTION | The Guards: what keeps its own input, and what is paper
    // ------------------------------------------------------------
    function Na__SheetKeys__GetGuards() {
        return {
            pointerIgnoreSelector   : Na__SheetKeys__Val('Guards', 'PointerIgnoreSelector', 'input, select, button, textarea'),
            wheelIgnoreSelector     : Na__SheetKeys__Val('Guards', 'WheelIgnoreSelector', ''),
            contextMenuKeepSelector : Na__SheetKeys__Val('Guards', 'ContextMenuKeepSelector', 'input, select, button, textarea'),
            paperSelector           : Na__SheetKeys__Val('Guards', 'PaperSelector', 'svg.aura-sheet')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Keyboard's Steps
    // ------------------------------------------------------------
    function Na__SheetKeys__GetKeyboardSetup() {
        return {
            ignoreWhenTyping   : Na__SheetKeys__Val('KeyboardBindings', 'IgnoreWhenTyping', true) !== false,
            coarseStepModifier : Na__SheetKeys__Val('KeyboardBindings', 'CoarseStepModifier', 'Shift'),
            panStepPx          : Na__SheetKeys__Val('KeyboardBindings', 'PanStepPx', 60),
            panCoarseStepPx    : Na__SheetKeys__Val('KeyboardBindings', 'PanCoarseStepPx', 240),
            zoomKeyStep        : Na__SheetKeys__Val('KeyboardBindings', 'ZoomKeyStep', 1.15)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Touch Gestures
    // ------------------------------------------------------------
    function Na__SheetKeys__GetTouchSetup() {
        return {
            oneFingerPanOnStage : Na__SheetKeys__Val('TouchBindings', 'OneFingerPanOnStage', true) !== false,
            oneFingerPanOnPaper : Na__SheetKeys__Val('TouchBindings', 'OneFingerPanOnPaper', false) === true,
            twoFingerPan        : Na__SheetKeys__Val('TouchBindings', 'TwoFingerPan', true) !== false,
            pinchZoom           : Na__SheetKeys__Val('TouchBindings', 'PinchZoom', true) !== false,
            doubleTapFit        : Na__SheetKeys__Val('TouchBindings', 'DoubleTapFit', true) !== false,
            doubleTapWindowMs   : Na__SheetKeys__Val('TouchBindings', 'DoubleTapWindowMs', 320),
            doubleTapSlopPx     : Na__SheetKeys__Val('TouchBindings', 'DoubleTapSlopPx', 24),
            panStartSlopPx      : Na__SheetKeys__Val('TouchBindings', 'PanStartSlopPx', 6),
            pinchStartSlopPx    : Na__SheetKeys__Val('TouchBindings', 'PinchStartSlopPx', 8)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far and How Fast the Sheet Moves
    // ------------------------------------------------------------
    function Na__SheetKeys__GetNavigationSetup() {
        const zoomMin = Na__SheetKeys__Val('Navigation', 'ZoomMin', 0.15);
        return {
            zoomMin       : zoomMin,
            zoomMax       : Math.max(zoomMin, Na__SheetKeys__Val('Navigation', 'ZoomMax', 12)),
            zoomWheelStep : Na__SheetKeys__Val('Navigation', 'ZoomWheelStep', 0.0016),
            fitPaddingPx  : Na__SheetKeys__Val('Navigation', 'FitPaddingPx', 32),
            zoomSettleMs  : Math.min(3000, Math.max(100, Na__SheetKeys__Val('Navigation', 'ZoomSettleMs', 350)))
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Matching
// -----------------------------------------------------------------------------

    // FUNCTION | What a Press Means: { button, modifiers, emptyStage } -> action or null
    // ------------------------------------------------------------
    function Na__SheetKeys__MatchPointer(input) {
        if (!input || !input.button) return null;
        for (const binding of Na__SheetKeys__List('PointerBindings')) {
            if (!binding || binding.Enabled === false) continue;
            if (!Array.isArray(binding.Buttons) || !binding.Buttons.includes(input.button)) continue;
            if (binding.RequiresEmptyStage === true && !input.emptyStage) continue;
            if (!Na__SheetKeys__ModifiersSatisfy(binding, input.modifiers || {})) continue;
            return binding.Action || null;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Wheel Turn Means: held -> action or null
    // ------------------------------------------------------------
    function Na__SheetKeys__MatchWheel(held) {
        for (const binding of Na__SheetKeys__List('WheelBindings')) {
            if (!binding || binding.Enabled === false) continue;
            if (Na__SheetKeys__ModifiersSatisfy(binding, held || {})) return binding.Action || null;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Key Press Means: { id, action, coarse } or null
    // ------------------------------------------------------------
    function Na__SheetKeys__MatchKey(key, held) {
        if (typeof key !== 'string' || !key) return null;
        const coarse = !!(held && held[Na__SheetKeys__GetKeyboardSetup().coarseStepModifier]);
        for (const binding of Na__SheetKeys__List('KeyboardBindings')) {
            if (!binding || binding.Enabled === false) continue;
            if (!Array.isArray(binding.Keys) || !binding.Keys.includes(key)) continue;
            if (!Na__SheetKeys__ModifiersSatisfy(binding, held || {})) continue;
            return { id: binding.Id || null, action: binding.Action || null, coarse: coarse };
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether Any Enabled Press Binding Needs a Modifier (Space is only taken then)
    // ------------------------------------------------------------
    function Na__SheetKeys__IsPointerModifierBound(name) {
        return Na__SheetKeys__List('PointerBindings').some((b) => b && b.Enabled !== false && (b.ModifierMatch || 'Exact') !== 'Any'
            && Array.isArray(b.Modifiers) && b.Modifiers.includes(name));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SheetKeys__GetGuards,
        Na__SheetKeys__GetKeyboardSetup,
        Na__SheetKeys__GetTouchSetup,
        Na__SheetKeys__GetNavigationSetup,
        Na__SheetKeys__MatchPointer,
        Na__SheetKeys__MatchWheel,
        Na__SheetKeys__MatchKey,
        Na__SheetKeys__IsPointerModifierBound
    };

// endregion -------------------------------------------------------------------
