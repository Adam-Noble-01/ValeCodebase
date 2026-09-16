// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE
// =============================================================================
//
// FILE       : Na__LayoutEditor__ConfigState__.js
// NAMESPACE  : Na__LeCfg
// MODULE     : Layout Editor - Config State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the Layout Editor config fetch and expose every tuned value
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Fetches Na__LayoutEditor__AppConfig__.json exactly once and answers every
//   setting the sheet, the panels, the viewports and the PDF exporter ask
//   for. Na__AppConfig__Main.json supplies the web read-only guard.
// - The fallbacks mirror the shipped JSON, so a failed fetch degrades to a
//   working editor rather than a broken one.
// - This file keeps the load (SetAppConfig, Ready), the guards (IsEnabled,
//   IsReadOnlyOnWeb) and the labels (GetLabel, FormatLabel), and re-exports
//   everything else from its units in this folder:
//   - Na__LayoutEditor__ConfigState__Readers__: the parsed config, its fetch
//     and the private readers (Val, Num, Unit, Choice).
//   - Na__LayoutEditor__ConfigState__KeyMap__: the key map JSON, its fallback
//     and fetch, and every binding resolver.
//   - Na__LayoutEditor__ConfigState__SheetSetup__: paper, style, title block,
//     scales, viewports, raster, enhance, linework, lineweights and PDF.
//   - Na__LayoutEditor__ConfigState__ToolSetup__: text, dimensions, selection,
//     shapes, the Measurements box, leaders, eyedropper, clipboard, snapping.
//   - Na__LayoutEditor__ConfigState__EditorSetup__: history, auto save, the
//     project specification, margin notes, panels and navigation.
//
// INTEGRATION:
// - The mode controller calls SetAppConfig then Ready as it initialises, which
//   the loader (01__Core__Loader) starts the first time the editor is used;
//   every other Layout Editor module reads through the getters.
// - Callers keep importing this file, which still exports every name it
//   always has. The units never import this file (they share Readers), so
//   the module graph has no cycle.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode/Na__DrawingEditor__Config.json (blocks, purpose)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : own fetch and typed getters, the ValeVision ConfigState pattern.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.15.0
// - Split into Na__LayoutEditor__ConfigState__Readers__.js,
//   Na__LayoutEditor__ConfigState__KeyMap__.js,
//   Na__LayoutEditor__ConfigState__SheetSetup__.js,
//   Na__LayoutEditor__ConfigState__ToolSetup__.js and
//   Na__LayoutEditor__ConfigState__EditorSetup__.js to stay under the line
//   budget. No behaviour change: the code moved verbatim and every export is
//   unchanged.
// - Moved to 03__Core__Config with its units and both JSON files (Layout
//   Editor subfolders). INTEGRATION corrected: the mode controller calls
//   SetAppConfig and Ready, not index.html (since v2.45.0).
//
// 15-Sep-2026 - Version 1.14.0
// - GetTextSetup: rotateStepDeg (the steps Shift holds a rotate drag to, 15),
//   rotateDetentDeg (how near a right angle a free drag settles on it, 2) and
//   rotateGripOffsetPx (how far off a selected text item's outline its rotate
//   grip stands on screen, 22).
// - Ported from TrueVision3D v2.52.0 (ConfigState 1.21.0).
//
// 14-Sep-2026 - Version 1.13.0
// - GetViewportSetup: imageZoomMin and imageZoomMax (a 3D picture's zoom
//   limits, 0.25 and 10), imageZoomFineFactor (a Shift+wheel notch against a
//   plain one, 0.2) and imageZoomCommitMs (how long the wheel rests before a
//   run of notches is announced as one undo step, 350).
// - Ported from TrueVision3D (ConfigState 1.20.0, v2.50.0).
//
// 14-Sep-2026 - Version 1.12.0
// - GetTextSetup: lineSpacing, a sheet annotation's line height as a
//   multiple of its text size (Text LineSpacing).
// - GetMarginNotesSetup: paddingRightMm, codePipe, rulePt, ruleColour,
//   noteGapMaxMm, and body text at TextSizeMm (2 mm).
// - Ported from TrueVision3D (ConfigState 1.14.0 / 1.17.0 / 1.19.0 / 1.22.0).
//
// 14-Sep-2026 - Version 1.11.0
// - GetSpecificationSetup and GetMarginNotesSetup for drawing notes beside
//   project.json (ValeVision__DrawingNotes__.json).
//
// 14-Sep-2026 - Version 1.10.0
// - KEYMAP_FALLBACK: Edit__Ungroup (Ctrl+Shift+G) then Edit__Group (Ctrl+G).
//   First Exact match wins, so ungroup is listed first.
// - Ported from TrueVision3D (groups keys).
//
// 14-Sep-2026 - Version 1.9.0
// - GetDimensionSetup: textLeaderMinMm and textLeaderGapMm, how far a
//   dragged value has to sit from its un-dragged place before the arc is
//   drawn, and the clear paper between the justified side and the arc.
// - Ported from TrueVision3D (ConfigState 1.11.0).
//
// 14-Sep-2026 - Version 1.8.0
// - GetClipboardSetup, GetMeasureSetup and GetMeasureKeys. The key map
//   fallback carries copy, paste, duplicate and the Measurements box keys.
// - Ported from TrueVision3D v2.44.0 / v2.46.0.
//
// 14-Sep-2026 - Version 1.7.0
// - GetDimensionSetup: minTickLengthMm and maxTickLengthMm, the bounds of the
//   Dimensions panel's Size mm (how large the ticks, arrows or dots at each
//   end are). TickLengthMm is still the size a dimension without its own
//   Dimension__TickLengthMm draws at, and the size new ones start with.
// - Ported from TrueVision3D v2.43.0.
//
// 14-Sep-2026 - Version 1.6.0
// - Box select: the Selection setup carries the box's start distance, edge
//   weight and preview (BoxStartPx, BoxBorderPx, BoxPreview, BoxPreviewPadMm),
//   and MatchSelectionModifier reads the key map's SelectionBindings: Ctrl adds,
//   Shift toggles, Ctrl+Shift removes, and Alt starts a box anywhere.
// - Ported from TrueVision3D v2.34.0.
//
// 14-Sep-2026 - Version 1.5.0
// - GetLeaderSetup: what a new leader or specification bubble starts with
//   (type, text, line, endpoint, bubble, fill and opacities) and the rules
//   every leader is drawn by (stubs, curve tension, text gap, padding, line
//   spacing, where the line lands on a note). Unit and Choice read an opacity
//   and a fixed word safely.
// - GetShapeSetup carries DefaultFillOpacity and TransparentEdgeOpacity.
// - The E key (Tool__Leader) in the key map fallback.
// - Ported from TrueVision3D v2.35.0.
//
// 13-Sep-2026 - Version 1.4.0
// - The Shift+B palette binding in the key map fallback; PaletteSwitchesTool and
//   FlashMs in the eyedropper setup.
// - Ported from TrueVision3D v2.30.0.
//
// 13-Sep-2026 - Version 1.3.0
// - Eyedropper setup, the B binding in the key map fallback, the draft write
//   debounce and the sheet-object snapping switch, ported from TrueVision.
//
// 10-Sep-2026 - Version 1.2.0
// - Sheet setup carries BlockGapMm; style setup carries the frame caption and
//   title block weights, tracking and uppercasing; title block setup carries
//   the logo's printed width, height cap, aspect and paddings and the field
//   paddings. The old LogoPaddingMm and ValueOffsetBottomMm keys are gone.
//
// 10-Sep-2026 - Version 1.1.0
// - Owns Na__LayoutEditor__KeyMappings__.json as well, and answers what a
//   button, a wheel turn or a key press means. The control modules and the
//   sheet tools resolve every binding through here, so no input is written
//   into code any more.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Parsed Config, Its Fetch and the Value Reader
    // ------------------------------------------------------------
    import {
        Na__LeCfg__PREFIX,
        Na__LeCfg__Config,
        Na__LeCfg__Val,
        Na__LeCfg__Fetch
    } from './Na__LayoutEditor__ConfigState__Readers__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Key Map Fetch and Binding Resolution (re-exported below)
    // ------------------------------------------------------------
    import {
        Na__LeCfg__FetchKeyMap,
        Na__LeCfg__SetKeyMap,
        Na__LeCfg__GetGuards,
        Na__LeCfg__GetKeyboardSetup,
        Na__LeCfg__GetTouchSetup,
        Na__LeCfg__GetMeasureKeys,
        Na__LeCfg__MatchPointerBinding,
        Na__LeCfg__MatchWheelBinding,
        Na__LeCfg__MatchKeyBinding,
        Na__LeCfg__MatchSelectionModifier,
        Na__LeCfg__IsPointerModifierBound,
        Na__LeCfg__GetActionCatalogue
    } from './Na__LayoutEditor__ConfigState__KeyMap__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Setup Blocks (re-exported below)
    // ------------------------------------------------------------
    import {
        Na__LeCfg__GetSheetSetup,
        Na__LeCfg__GetStyleSetup,
        Na__LeCfg__GetTitleBlockSetup,
        Na__LeCfg__GetScaleSetup,
        Na__LeCfg__GetViewportSetup,
        Na__LeCfg__GetRasterSetup,
        Na__LeCfg__PtToMm,
        Na__LeCfg__GetLineweightSetup,
        Na__LeCfg__GetEnhanceSetup,
        Na__LeCfg__GetLineworkSetup,
        Na__LeCfg__GetPdfSetup
    } from './Na__LayoutEditor__ConfigState__SheetSetup__.js';
    import {
        Na__LeCfg__GetTextSetup,
        Na__LeCfg__GetDimensionSetup,
        Na__LeCfg__GetSelectionSetup,
        Na__LeCfg__GetShapeSetup,
        Na__LeCfg__GetMeasureSetup,
        Na__LeCfg__GetLeaderSetup,
        Na__LeCfg__GetEyedropperSetup,
        Na__LeCfg__GetClipboardSetup,
        Na__LeCfg__GetSnappingSetup
    } from './Na__LayoutEditor__ConfigState__ToolSetup__.js';
    import {
        Na__LeCfg__GetHistorySetup,
        Na__LeCfg__GetAutoSaveSetup,
        Na__LeCfg__GetSpecificationSetup,
        Na__LeCfg__GetMarginNotesSetup,
        Na__LeCfg__GetPanelSetup,
        Na__LeCfg__GetNavigationSetup
    } from './Na__LayoutEditor__ConfigState__EditorSetup__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Main App Config Block
    // ------------------------------------------------------------
    const Na__LeCfg__MAIN_BLOCK = 'LayoutEditor__Config';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Main App Config and Fetch Promise
    // ------------------------------------------------------------
    let Na__LeCfg__AppConfig   = null;
    let Na__LeCfg__LoadPromise = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Loading and Guards
// -----------------------------------------------------------------------------

    // FUNCTION | Hand the Main App Config In
    // ------------------------------------------------------------
    function Na__LeCfg__SetAppConfig(appConfig) {
        Na__LeCfg__AppConfig = (appConfig && typeof appConfig === 'object') ? appConfig : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the System Config Exactly Once
    // ------------------------------------------------------------
    function Na__LeCfg__Ready() {
        if (!Na__LeCfg__LoadPromise) {
            Na__LeCfg__LoadPromise = Promise.all([ Na__LeCfg__Fetch(), Na__LeCfg__FetchKeyMap() ])
                .then((results) => results[0]);                                // <-- The key map degrades to its own fallback
        }
        return Na__LeCfg__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Layout Editor Is Switched On
    // ------------------------------------------------------------
    function Na__LeCfg__IsEnabled() {
        if (!Na__LeCfg__Config) return true;
        return Na__LeCfg__Config[Na__LeCfg__PREFIX + 'Enabled'] !== false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Web Build Is Read-Only (Main.json guard)
    // ------------------------------------------------------------
    function Na__LeCfg__IsReadOnlyOnWeb() {
        const main = Na__LeCfg__AppConfig ? Na__LeCfg__AppConfig[Na__LeCfg__MAIN_BLOCK] : null;
        return !main || main['LayoutEditor__Config__ReadOnlyOnWeb'] !== false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Labels
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Label
    // ------------------------------------------------------------
    function Na__LeCfg__GetLabel(keySuffix, fallback) {
        const value = Na__LeCfg__Val('Labels', keySuffix, undefined);
        return (typeof value === 'string') ? value : fallback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Label With {tokens} Filled In
    // ------------------------------------------------------------
    function Na__LeCfg__FormatLabel(keySuffix, fallback, tokens) {
        let text = Na__LeCfg__GetLabel(keySuffix, fallback);
        Object.keys(tokens || {}).forEach((key) => { text = text.split('{' + key + '}').join(String(tokens[key])); });
        return text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Config State API
    // ------------------------------------------------------------
    export {
        Na__LeCfg__SetAppConfig,
        Na__LeCfg__Ready,
        Na__LeCfg__IsEnabled,
        Na__LeCfg__IsReadOnlyOnWeb,
        Na__LeCfg__GetSheetSetup,
        Na__LeCfg__GetStyleSetup,
        Na__LeCfg__GetTitleBlockSetup,
        Na__LeCfg__GetScaleSetup,
        Na__LeCfg__GetViewportSetup,
        Na__LeCfg__GetTextSetup,
        Na__LeCfg__GetDimensionSetup,
        Na__LeCfg__GetLineworkSetup,
        Na__LeCfg__GetSnappingSetup,
        Na__LeCfg__GetHistorySetup,
        Na__LeCfg__GetAutoSaveSetup,
        Na__LeCfg__PtToMm,
        Na__LeCfg__GetRasterSetup,
        Na__LeCfg__GetSelectionSetup,
        Na__LeCfg__GetLineweightSetup,
        Na__LeCfg__GetShapeSetup,
        Na__LeCfg__GetMeasureSetup,
        Na__LeCfg__GetLeaderSetup,
        Na__LeCfg__GetSpecificationSetup,
        Na__LeCfg__GetMarginNotesSetup,
        Na__LeCfg__GetEyedropperSetup,
        Na__LeCfg__GetClipboardSetup,
        Na__LeCfg__GetEnhanceSetup,
        Na__LeCfg__GetPanelSetup,
        Na__LeCfg__GetNavigationSetup,
        Na__LeCfg__GetPdfSetup,
        Na__LeCfg__GetLabel,
        Na__LeCfg__FormatLabel,
        Na__LeCfg__SetKeyMap,
        Na__LeCfg__GetGuards,
        Na__LeCfg__GetKeyboardSetup,
        Na__LeCfg__GetTouchSetup,
        Na__LeCfg__GetMeasureKeys,
        Na__LeCfg__MatchPointerBinding,
        Na__LeCfg__MatchWheelBinding,
        Na__LeCfg__MatchKeyBinding,
        Na__LeCfg__MatchSelectionModifier,
        Na__LeCfg__IsPointerModifierBound,
        Na__LeCfg__GetActionCatalogue
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
