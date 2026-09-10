// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - TITLE BLOCK (MODERN)
// =============================================================================
//
// FILE       : Na__LayoutEditor__TitleBlock__Modern__.js
// NAMESPACE  : Na__LeTitleModern
// MODULE     : Layout Editor - Title Block Modern
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The vector title block: Vale logo and one strip of fields
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - A band along the foot of the content area: the Vale logo in a cell on
//   the left, then the configured fields (client, site address, drawing
//   title, number, revision, scale, date, drawn by) as cells across the
//   remaining width, each with a small muted label at the top and the value
//   beneath. Built as chrome primitives, so the screen and the PDF paint the
//   identical strip.
//
// INTEGRATION:
// - Called by Na__LeChrome__Build for sheets in the modern style (D26).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetChrome__.js (titleblock region)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : adapted
// - Divergences   : ValeVision fields; no terms cell; rows from the Layout Editor config.
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
    import { Na__LeCfg__GetTitleBlockSetup } from './Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeChrome__PushRect,
        Na__LeChrome__PushLine,
        Na__LeChrome__PushText,
        Na__LeChrome__PushImage,
        Na__LeChrome__FitText,
        Na__LeChrome__BaselineFromTop
    } from './Na__LayoutEditor__SheetChrome__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Solve the Logo Cell and the Image Inside It
    // ------------------------------------------------------------
    function Na__LeTitleModern__SolveLogo(band, setup) {
        const cellW   = Math.min(setup.logoCellWidthMm, band.WidthMm / 3);
        const pad     = setup.logoPaddingMm;
        const maxW    = cellW - (pad * 2);
        const maxH    = band.HeightMm - (pad * 2);
        const aspect  = 4.2;                                                     // <-- The horizontal Vale logo is roughly 4.2:1
        let   imageW  = maxW;
        let   imageH  = imageW / aspect;
        if (imageH > maxH) { imageH = maxH; imageW = imageH * aspect; }
        return {
            Cell  : { X : band.X, Y : band.Y, WidthMm : cellW, HeightMm : band.HeightMm },
            Image : { X : band.X + ((cellW - imageW) / 2), Y : band.Y + ((band.HeightMm - imageH) / 2), WidthMm : imageW, HeightMm : imageH }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Modern Title Block Primitives
    // ------------------------------------------------------------
    // fields: { Client, SiteAddress, Title, DrawingNumber, Revision, Scale, Date, DrawnBy }
    // cachedAsset(path) returns a data URL or null while it loads.
    // ------------------------------------------------------------
    function Na__LeTitleModern__Build(list, layout, fields, style, cachedAsset) {
        const setup = Na__LeCfg__GetTitleBlockSetup();
        const band  = layout.TitleBlock;

        Na__LeChrome__PushRect(list, band.X, band.Y, band.WidthMm, band.HeightMm, style.inkColour, style.frameStrokeMm, style.paperColour);

        // LOGO CELL
        const logo    = Na__LeTitleModern__SolveLogo(band, setup);
        const dataUrl = typeof cachedAsset === 'function' ? cachedAsset(setup.logoAssetPath) : null;
        if (dataUrl) {
            Na__LeChrome__PushImage(list, logo.Image.X, logo.Image.Y, logo.Image.WidthMm, logo.Image.HeightMm, dataUrl);
        } else {
            Na__LeChrome__PushText(list, {
                X : logo.Cell.X + (logo.Cell.WidthMm / 2), BaselineY : band.Y + (band.HeightMm / 2) + (setup.fontSizeValueMm * 0.36),
                Text : 'VALE GARDEN HOUSES', FontMm : setup.fontSizeValueMm, Weight : 600, Colour : style.inkColour, Align : 'center'
            });
        }
        Na__LeChrome__PushLine(list, logo.Cell.X + logo.Cell.WidthMm, band.Y, logo.Cell.X + logo.Cell.WidthMm, band.Y + band.HeightMm, style.inkColour, style.frameStrokeMm);

        // FIELD CELLS | Widths are relative shares of what is left
        const rows   = setup.rows;
        const stripX = logo.Cell.X + logo.Cell.WidthMm;
        const stripW = band.WidthMm - logo.Cell.WidthMm;
        let   total  = 0;
        rows.forEach((row) => { total += (typeof row.WidthMm === 'number' && row.WidthMm > 0) ? row.WidthMm : 1; });

        let cursor = stripX;
        rows.forEach((row, index) => {
            const share = ((typeof row.WidthMm === 'number' && row.WidthMm > 0) ? row.WidthMm : 1) / total;
            const cellW = stripW * share;
            const pad   = style.cellPaddingMm;
            const value = fields[row.Key] !== undefined && fields[row.Key] !== null ? String(fields[row.Key]) : '';

            if (index > 0) Na__LeChrome__PushLine(list, cursor, band.Y, cursor, band.Y + band.HeightMm, style.frameLineColour, style.frameStrokeMm);

            Na__LeChrome__PushText(list, {
                X : cursor + pad, BaselineY : Na__LeChrome__BaselineFromTop(band.Y + setup.labelOffsetTopMm, setup.fontSizeLabelMm),
                Text : Na__LeChrome__FitText(String(row.Label || row.Key).toUpperCase(), setup.fontSizeLabelMm, 400, cellW - (pad * 2)),
                FontMm : setup.fontSizeLabelMm, Weight : 400, Colour : style.mutedTextColour, Align : 'left'
            });
            Na__LeChrome__PushText(list, {
                X : cursor + pad, BaselineY : band.Y + band.HeightMm - setup.valueOffsetBottomMm,
                Text : Na__LeChrome__FitText(value, setup.fontSizeValueMm, 400, cellW - (pad * 2)),
                FontMm : setup.fontSizeValueMm, Weight : 400, Colour : style.inkColour, Align : 'left'
            });
            cursor += cellW;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Modern Title Block API
    // ------------------------------------------------------------
    export {
        Na__LeTitleModern__Build
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
