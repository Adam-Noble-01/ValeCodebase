// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - TITLE BLOCK (CLASSIC)
// =============================================================================
//
// FILE       : Na__LayoutEditor__TitleBlock__Classic__.js
// NAMESPACE  : Na__LeTitleClassic
// MODULE     : Layout Editor - Title Block Classic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The scanned title block stretched to the sheet, with the fields overlaid
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The office's existing title block scan (the A3 PNG the Page Layout
//   System already uses) placed as one image covering the whole sheet, with
//   the field values written at configured paper-millimetre anchors per
//   paper size. A4, A2 and A1 fall back to the A3 scan and its anchors
//   scaled to the page until their own scans are added (D26).
// - While the scan is still loading nothing is drawn but a muted note; the
//   sheet rebuilds when the asset arrives.
//
// INTEGRATION:
// - Called by Na__LeChrome__Build for sheets in the classic style.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5: the title block scan of
//                   35__System__PageLayoutSystem as a locked layer); TrueVision3D took it whole on
//                   10-Sep-2026 (its v2.21.0); since ported back whole from TrueVision3D 1.0.0 (HEAD b2aa9151)
// - Source version: 1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - the header brought level with
//                   TrueVision's; the code was already identical. The scan it paints is Vale's own,
//                   from this app's asset root (TitleBlock ClassicScanAssets), never TrueVision's
//                   placeholder.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config and Primitive Builders
    // ------------------------------------------------------------
    import { Na__LeCfg__GetTitleBlockSetup } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeChrome__PushText,
        Na__LeChrome__PushImage,
        Na__LeChrome__FitText
    } from './Na__LayoutEditor__SheetChrome__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Anchor Table for a Paper Size (A3 scaled when absent)
    // ------------------------------------------------------------
    function Na__LeTitleClassic__Anchors(setup, page) {
        const own = setup.classicFieldAnchors[page.SizeKey];
        if (own) return { table : own, scaleX : 1, scaleY : 1 };
        const a3 = setup.classicFieldAnchors.A3 || {};
        return { table : a3, scaleX : page.WidthMm / 420, scaleY : page.HeightMm / 297 };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Classic Title Block Primitives
    // ------------------------------------------------------------
    function Na__LeTitleClassic__Build(list, layout, fields, style, cachedAsset) {
        const setup = Na__LeCfg__GetTitleBlockSetup();
        const page  = layout.Page;
        const path  = setup.classicScanAssets[page.SizeKey] || setup.classicScanAssets.A3 || null;
        const scan  = (typeof cachedAsset === 'function') ? cachedAsset(path) : null;

        if (!scan) {
            Na__LeChrome__PushText(list, {
                X : page.WidthMm / 2, BaselineY : page.HeightMm - layout.MarginMm,
                Text : path ? 'Loading the title block scan...' : 'No title block scan is configured for ' + page.SizeKey + '.',
                FontMm : 2.4, Weight : 400, Colour : style.mutedTextColour, Align : 'center'
            });
            return;
        }

        Na__LeChrome__PushImage(list, 0, 0, page.WidthMm, page.HeightMm, scan);

        const anchors = Na__LeTitleClassic__Anchors(setup, page);
        Object.keys(anchors.table).forEach((key) => {
            const anchor = anchors.table[key];
            const value  = fields[key];
            if (!anchor || value === undefined || value === null || value === '') return;
            const fontMm = (typeof anchor.FontMm === 'number' ? anchor.FontMm : setup.fontSizeValueMm) * Math.min(anchors.scaleX, anchors.scaleY);
            const maxW   = (typeof anchor.MaxWidthMm === 'number') ? anchor.MaxWidthMm * anchors.scaleX : 0;
            Na__LeChrome__PushText(list, {
                X : anchor.X * anchors.scaleX, BaselineY : anchor.Y * anchors.scaleY,
                Text : maxW > 0 ? Na__LeChrome__FitText(String(value), fontMm, 400, maxW) : String(value),
                FontMm : fontMm, Weight : 400, Colour : style.inkColour, Align : anchor.Align || 'left'
            });
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Classic Title Block API
    // ------------------------------------------------------------
    export {
        Na__LeTitleClassic__Build
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
