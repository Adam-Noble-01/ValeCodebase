// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - DRAWING CODE
// =============================================================================
//
// FILE       : Na__LayoutEditor__DrawingCode__.js
// NAMESPACE  : Na__LeCode
// MODULE     : Layout Editor - Drawing Code
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The short code a tab shows, cut from a drawing number, and the name beside it
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - A sheet tab reads "D03 - Elevations": the short code cut from the sheet's
//   drawing number, then the sheet's short name. This file is the only place
//   those two rules live.
// - PURE STRING ARITHMETIC WITH NO IMPORTS AT ALL. That is the point of the
//   file. The tab strip and the Dev menu draw sheet names BEFORE the Layout
//   Editor bundle is loaded, through the loader facade, so the rules cannot
//   sit in the sheet records unit - importing that would pull the editor's
//   config, layout and project-data modules into the first paint and undo the
//   lazy load. Na__LayoutEditor__SheetRecords__ imports this file and
//   re-exports all three under its own Na__LeRec__ names, so callers on either
//   side of the load boundary get one implementation.
//
// INTEGRATION:
// - Imported by Na__LayoutEditor__SheetRecords__ (the loaded editor) and by
//   Na__LayoutEditor__Loader__ (the facade, before the editor exists).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D v2.70.0 (short sheet tabs), where these three
//                   functions sit inside Na__LayoutEditor__SheetRecords__ as
//                   Na__LeRec__ShortCode, StripSheetCode and the label format.
// - Parity        : behaviour verbatim; the split into a leaf is ValeVision's
//                   own, because TrueVision's tab strip imports the sheet model
//                   directly and has no loader facade to serve.
// - Back-port     : offer to TrueVision3D only if its tab strip is ever made
//                   lazy; until then the split would buy it nothing.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.0.0
// - Initial implementation for the short sheet tabs port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Reading a Sheet's Drawing Number
// -----------------------------------------------------------------------------

    // FUNCTION | The Drawing Number Actually Stored on a Sheet ('' when none is)
    // ------------------------------------------------------------
    // ONLY WHAT WAS STORED, never the project default the title block falls
    // back to. That default is the project code and the sheet's place in the
    // order ("CL01-01"), which is not a drawing code and must never become one
    // on a tab. It also works on the loader's lightweight pre-load sheet views,
    // which carry the same field object.
    // ------------------------------------------------------------
    function Na__LeCode__StoredNumber(sheet) {
        const fields = (sheet && sheet.Sheet__Fields && typeof sheet.Sheet__Fields === 'object') ? sheet.Sheet__Fields : null;
        const stored = fields ? fields.Sheet__Fields__DrawingNumber : undefined;
        return (typeof stored === 'string') ? stored : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Short Code and the Short Name
// -----------------------------------------------------------------------------

    // FUNCTION | The Short Code a Tab Carries, Cut From a Drawing Number
    // ------------------------------------------------------------
    // "PS01_T02_D03" gives "D03". A drawing number carries the project and the
    // task in front of the drawing's own code; those are the same on every tab
    // of a pack, so on a tab they are only width - and on a phone that width is
    // the whole strip. The code is the last run of letters and the digits after
    // them, with one separator allowed between, so a series numbered "A-101"
    // reads "A-101".
    //
    // NO LETTER-LED CODE AT THE END, NO SHORT CODE. Anything else - bare digits,
    // a number that is only a project code and a place in the order - answers
    // '' and the tab shows the sheet's name alone, which is what every tab
    // showed before drawing codes reached them.
    // ------------------------------------------------------------
    function Na__LeCode__ShortCode(drawingNumber) {
        const text  = String(drawingNumber === undefined || drawingNumber === null ? '' : drawingNumber).trim();
        const match = /[A-Za-z]+[-_ ]?\d+$/.exec(text);
        return match ? match[0] : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet Name Without a Drawing Code Typed in Front of It
    // ------------------------------------------------------------
    // "D03 - Elevations" gives "Elevations". Before a tab carried the drawing's
    // code, the only way to see one on a tab was to type it into the name - and
    // then to retype it whenever the drawing was renumbered. The code is read
    // from the drawing number now, so a name holds the words and nothing else.
    //
    // ONLY A CODE OF THE SHEET'S OWN SERIES COMES OFF: the letters of its own
    // short code, any digits, then a dash, a colon, a middle dot or a bar.
    // "D21 - Floor Plans" loses its D21 whatever the sheet is numbered today;
    // "L2 - Second Floor" on a D series keeps every word; "3D Images" and
    // "1:50 Details" are never touched; and no period is a separator, because
    // "D1.5 Details" is a real thing to call a drawing. A name that is nothing
    // but a code is left alone, because taking it off would leave nothing.
    // ------------------------------------------------------------
    function Na__LeCode__StripSheetCode(name, drawingNumber) {
        const text = String(name === undefined || name === null ? '' : name);
        if (!/^\s*[A-Za-z]+[-_ ]?\d/.test(text)) return text;                    // <-- The common case, settled without building a pattern
        const letters = (/^[A-Za-z]+/.exec(Na__LeCode__ShortCode(drawingNumber)) || [ '' ])[0];
        if (!letters) return text;                                              // <-- A sheet with no drawing code has no series to match: nothing comes off
        const bare = text.replace(new RegExp('^\\s*' + letters + '[-_ ]?\\d+\\s*[-\\u2013\\u2014\\u00b7:|]\\s*', 'i'), '').trim();
        return bare ? bare : text;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet's Short Code and Name, as One Label
    // ------------------------------------------------------------
    // format is the configured TabLabelFormat, "{code} - {name}". With no code
    // the name stands alone; with an empty name the label is the code and its
    // separator ("D03 -"), which is the fixed text the Sheet panel and the tab
    // rename field stand in front of their box.
    // ------------------------------------------------------------
    function Na__LeCode__Compose(shortCode, name, format) {
        const words = String(name === undefined || name === null ? '' : name);
        if (!shortCode) return words;
        return String(format || '{code} - {name}')
            .split('{code}').join(shortCode)
            .split('{name}').join(words)
            .trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Drawing Code API
    // ------------------------------------------------------------
    export {
        Na__LeCode__StoredNumber,
        Na__LeCode__ShortCode,
        Na__LeCode__StripSheetCode,
        Na__LeCode__Compose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
