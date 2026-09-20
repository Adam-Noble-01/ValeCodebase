// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET MODEL - SHEETS
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetModel__Sheets__.js
// NAMESPACE  : Na__LeModel
// MODULE     : Layout Editor - Sheet Model - Sheets
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Find, switch, create, copy, delete, edit and reorder sheets, with their title block fields and notes margin
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - Every sheet normalised and in tab order, one sheet by id, the active
//   sheet and the switch between sheets.
// - Create, duplicate, delete, update and reorder a sheet; the title block
//   fields with their project defaults, one field set, and the notes margin.
// - The lines that set the active sheet, the selection or the dirty flag
//   call the State unit's Assign accessors (an imported let cannot be
//   assigned).
//
// INTEGRATION:
// - Reads and writes the session state through
//   Na__LayoutEditor__SheetModel__State__.
// - Na__LayoutEditor__SheetModel__ calls GetSheets, GetSheetById and
//   GetActiveSheet (the selected viewport, the draft restore and the reload)
//   and re-exports this unit's API. Every other module imports
//   Na__LayoutEditor__SheetModel__.js, never this unit.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__SheetModel__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Parity        : verbatim (moved code)
// - Divergences   : n/a
// - Back-port     : the same split applies to TrueVision's copy.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.1.0
// - Short tab names, ported from TrueVision3D v2.70.0. GetDrawingNumber,
//   GetShortCode and GetTabLabel: a sheet's number, the "D03" cut from it, and
//   what its tab reads ("D03 - Elevations"). CleanSheetName takes a code typed
//   in front of a name back off before it is kept.
// - ApplySheetName is the one rename. A stored Drawing Title that differs from
//   the name is somebody's typing and survives it; one that matches the name
//   was only following it, and still does. UpdateSheet and DuplicateSheet both
//   go through it, so shortening a tab cannot write the short name over a long
//   title block title.
//
// 15-Sep-2026 - Version 1.0.0
// - Split out of Na__LayoutEditor__SheetModel__.js; the code moved verbatim.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Record Helpers
    // ------------------------------------------------------------
    import {
        Na__LeRec__NextId,
        Na__LeRec__Find,
        Na__LeRec__NormaliseSheet,
        Na__LeRec__BuildFields,
        Na__LeRec__DrawingNumber,
        Na__LeRec__SheetShortCode,
        Na__LeRec__StripSheetCode,
        Na__LeRec__NormaliseMarginNotes
    } from './Na__LayoutEditor__SheetRecords__.js';
    import { Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';   // <-- The tab label format
    // ------------------------------------------------------------

    // MODULE IMPORTS | Sheet Model State
    // ------------------------------------------------------------
    import {
        Na__LeModel__ActiveSheetId,
        Na__LeModel__Dispatch,
        Na__LeModel__Touch,
        Na__LeModel__Array,
        Na__LeModel__AssignActiveSheetId,
        Na__LeModel__AssignSelectionItems,
        Na__LeModel__AssignDirty
    } from './Na__LayoutEditor__SheetModel__State__.js';
    import { Na__LeCommon__Uses, Na__LeCommon__SetUses, Na__LeCommon__Set, Na__LeCommon__Seed } from './Na__LayoutEditor__SheetModel__Common__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Sheets
// -----------------------------------------------------------------------------

    // FUNCTION | Every Sheet, Normalised and in Order
    // ------------------------------------------------------------
    function Na__LeModel__GetSheets() {
        const list = Na__LeModel__Array().filter((s) => s && typeof s === 'object' && typeof s.Sheet__Id === 'string');
        list.forEach(Na__LeRec__NormaliseSheet);
        return list.sort((a, b) => a.Sheet__Order - b.Sheet__Order);
    }
    // ------------------------------------------------------------


    // FUNCTION | One Sheet by Id (null when absent)
    // ------------------------------------------------------------
    function Na__LeModel__GetSheetById(sheetId) {
        return Na__LeRec__Find(Na__LeModel__GetSheets(), 'Sheet__Id', sheetId);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sheet on Screen (null when in the 3D model tab)
    // ------------------------------------------------------------
    function Na__LeModel__GetActiveSheet() {
        return Na__LeModel__ActiveSheetId ? Na__LeModel__GetSheetById(Na__LeModel__ActiveSheetId) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch the Active Sheet (null = 3D model)
    // ------------------------------------------------------------
    function Na__LeModel__SetActiveSheetId(sheetId) {
        const next = (sheetId && Na__LeModel__GetSheetById(sheetId)) ? sheetId : null;
        if (next === Na__LeModel__ActiveSheetId) return next;
        Na__LeModel__AssignActiveSheetId(next);
        Na__LeModel__AssignSelectionItems([]);
        Na__LeModel__Dispatch('active', next);
        return next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Sheet
    // ------------------------------------------------------------
    function Na__LeModel__CreateSheet(options) {
        const opts  = options || {};
        const list  = Na__LeModel__Array();
        const sheet = {
            Sheet__Id              : Na__LeRec__NextId(list, 'Sheet_', 'Sheet__Id'),
            Sheet__Name            : (typeof opts.name === 'string' && opts.name.trim()) ? opts.name.trim() : '',
            Sheet__Order           : list.length + 1,
            Sheet__PaperSize       : opts.paperSize || null,
            Sheet__Orientation     : opts.orientation || null,
            Sheet__TitleBlockStyle : opts.titleBlockStyle || null,
            Sheet__Fields          : {},
            Sheet__Layers          : [],
            Sheet__Viewports       : [],
            Sheet__Annotations     : [],
            Sheet__Dimensions      : [],
            Sheet__Shapes          : [],
            Sheet__Leaders         : [],
            Sheet__Groups          : []
        };
        list.push(sheet);
        Na__LeRec__NormaliseSheet(sheet, list.length - 1);
        Na__LeModel__Touch('sheet-created', sheet.Sheet__Id);
        return sheet;
    }
    // ------------------------------------------------------------


    // FUNCTION | Duplicate a Sheet (deep copy, fresh id, assets dropped)
    // ------------------------------------------------------------
    function Na__LeModel__DuplicateSheet(sheetId) {
        const source = Na__LeModel__GetSheetById(sheetId);
        if (!source) return null;
        const list = Na__LeModel__Array();
        const copy = JSON.parse(JSON.stringify(source));
        copy.Sheet__Id    = Na__LeRec__NextId(list, 'Sheet_', 'Sheet__Id');
        Na__LeModel__ApplySheetName(copy, source.Sheet__Name + ' copy');        // <-- A typed Drawing Title is copied with the sheet; one that followed the name follows the copy's
        copy.Sheet__Order = list.length + 1;
        copy.Sheet__Viewports.forEach((v) => { v.Viewport__SnapshotAsset = null; });   // <-- Snapshots are keyed by viewport id
        list.push(copy);
        Na__LeModel__Touch('sheet-created', copy.Sheet__Id);
        return copy;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Sheet
    // ------------------------------------------------------------
    function Na__LeModel__DeleteSheet(sheetId) {
        const list = Na__LeModel__Array();
        for (let i = 0; i < list.length; i++) {
            if (list[i] && list[i].Sheet__Id === sheetId) {
                list.splice(i, 1);
                list.forEach((s, k) => { s.Sheet__Order = k + 1; });
                if (Na__LeModel__ActiveSheetId === sheetId) { Na__LeModel__AssignActiveSheetId(null); Na__LeModel__AssignSelectionItems([]); }
                Na__LeModel__Touch('sheet-deleted', sheetId);
                return true;
            }
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename, Re-Paper, Restyle or Reorder a Sheet
    // ------------------------------------------------------------
    function Na__LeModel__UpdateSheet(sheet, patch) {
        if (!sheet || !patch) return false;
        if (typeof patch.name === 'string' && patch.name.trim()) Na__LeModel__ApplySheetName(sheet, Na__LeModel__CleanSheetName(sheet, patch.name));
        if (typeof patch.paperSize === 'string') sheet.Sheet__PaperSize = patch.paperSize;
        if (typeof patch.orientation === 'string') sheet.Sheet__Orientation = patch.orientation;
        if (typeof patch.titleBlockStyle === 'string') sheet.Sheet__TitleBlockStyle = patch.titleBlockStyle;
        if (patch.lineweights && typeof patch.lineweights === 'object') {
            const lw = sheet.Sheet__Lineweights || (sheet.Sheet__Lineweights = {});
            if (Number.isFinite(patch.lineweights.viewportPt))  lw.ViewportPt  = patch.lineweights.viewportPt;
            if (Number.isFinite(patch.lineweights.dimensionPt)) lw.DimensionPt = patch.lineweights.dimensionPt;
        }
        Na__LeRec__NormaliseSheet(sheet, sheet.Sheet__Order - 1);
        Na__LeModel__Touch('sheet-updated', sheet.Sheet__Id);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Announce a Sheet That Undo or Redo Has Put Back
    // ------------------------------------------------------------
    // restore: { direction : 'undo' | 'redo', stepReason } - the reason the
    // step being reversed or replayed was first announced with.
    //
    // The history module has already written the snapshot into the live
    // record. This normalises it, marks the project dirty and announces it.
    // For drawing purposes a restore IS a sheet update - any part of the sheet
    // may have changed - so it goes out as 'sheet-updated' and every listener
    // redraws exactly as it would for one. What it must not be mistaken for is
    // the EDIT that reason usually means: the auto save reads 'sheet-updated'
    // as a sheet-settings change and writes the whole project, so before the
    // restore detail existed every Ctrl+Z - even of a vector delete - saved to
    // R2 a second and a half later. The detail lets the auto save judge an
    // undo by the step it reverses. A restore with no detail never saves.
    // ------------------------------------------------------------
    function Na__LeModel__AnnounceRestore(sheet, restore) {
        if (!sheet) return false;
        Na__LeRec__NormaliseSheet(sheet, sheet.Sheet__Order - 1);
        Na__LeModel__Touch('sheet-updated', sheet.Sheet__Id, null, restore || { direction : 'undo', stepReason : null });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Sheet to a New Position in the Tab Order
    // ------------------------------------------------------------
    function Na__LeModel__ReorderSheet(sheetId, newIndex) {
        const list = Na__LeModel__GetSheets();
        const from = list.findIndex((s) => s.Sheet__Id === sheetId);
        if (from === -1) return false;
        const [ moved ] = list.splice(from, 1);
        list.splice(Math.max(0, Math.min(newIndex, list.length)), 0, moved);
        list.forEach((s, k) => { s.Sheet__Order = k + 1; });
        Na__LeModel__Touch('sheet-reordered', sheetId);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Title Block Fields With Project Defaults Filled In
    // ------------------------------------------------------------
    function Na__LeModel__GetFields(sheet) {
        return Na__LeRec__BuildFields(sheet);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet's Drawing Number, and the Short Code a Tab Shows
    // ------------------------------------------------------------
    // The number is what the title block prints (stored, else the project
    // default). The short code is cut from the STORED number alone, so a sheet
    // that has never been given a drawing number shows its name by itself.
    // ------------------------------------------------------------
    function Na__LeModel__GetDrawingNumber(sheet) {
        return Na__LeRec__DrawingNumber(sheet);
    }
    function Na__LeModel__GetShortCode(sheet) {
        return Na__LeRec__SheetShortCode(sheet);
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Sheet Is Called on Screen: Its Short Code, Then Its Name
    // ------------------------------------------------------------
    // "D03 - Elevations". The tab, the toolbar and every list that names a
    // sheet read this, so a drawing is called the same thing wherever it is
    // met. With no name handed in it answers for the sheet's own; with one -
    // the empty string included - it answers for that, which is how the Sheet
    // panel and the tab's rename field get the "D03 -" they show in front of
    // the box.
    //
    // The loader facade has its own Na__LeLoad__GetTabLabel for the tabs drawn
    // before the editor is loaded. Both compose through the same leaf and the
    // same configured format, so the two states cannot read differently.
    // ------------------------------------------------------------
    function Na__LeModel__GetTabLabel(sheet, name) {
        if (!sheet) return '';
        const words = (typeof name === 'string') ? name : sheet.Sheet__Name;
        const code  = Na__LeModel__GetShortCode(sheet);
        return code ? Na__LeCfg__FormatLabel('TabLabelFormat', '{code} - {name}', { code : code, name : words }).trim() : words;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Typed Sheet Name, With Any Drawing Code Typed in Front Taken Off
    // ------------------------------------------------------------
    // Run before a name is kept, so "D03 - Elevations" typed out of habit is
    // saved as "Elevations" rather than saved whole and stripped on the next read.
    // ------------------------------------------------------------
    function Na__LeModel__CleanSheetName(sheet, text) {
        return Na__LeRec__StripSheetCode(String(text === undefined || text === null ? '' : text).trim(), Na__LeModel__GetShortCode(sheet));
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename a Sheet; a Drawing Title That Was Only Ever the Name Goes With It
    // ------------------------------------------------------------
    // The name is the short one a tab shows. The title block's Drawing Title is
    // often a different and longer thing, and a rename must not write the new
    // name over it: a stored title that DIFFERS from the name is somebody's
    // typing and is kept, one that MATCHES was only following the name and
    // still does, and one never stored follows by itself through the default in
    // BuildFields and is left unstored.
    //
    // Mutates only. The caller announces the change.
    // ------------------------------------------------------------
    function Na__LeModel__ApplySheetName(sheet, name) {
        if (!sheet || typeof name !== 'string' || !name) return false;
        const fields = sheet.Sheet__Fields || (sheet.Sheet__Fields = {});
        if (fields.Sheet__Fields__Title === sheet.Sheet__Name) fields.Sheet__Fields__Title = name;
        sheet.Sheet__Name = name;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch, Widen or Restyle a Sheet's Notes Margin
    // ------------------------------------------------------------
    function Na__LeModel__UpdateMarginNotes(sheet, patch, silent) {
        if (!sheet || !patch) return false;
        const notes = (sheet.Sheet__MarginNotes && typeof sheet.Sheet__MarginNotes === 'object') ? sheet.Sheet__MarginNotes : (sheet.Sheet__MarginNotes = {});
        if (typeof patch.enabled === 'boolean') notes.Enabled = patch.enabled;
        if (Number.isFinite(patch.widthMm)) notes.WidthMm = patch.widthMm;
        if (patch.heading !== undefined) notes.Heading = (typeof patch.heading === 'string' && patch.heading.trim()) ? patch.heading : null;
        if (Number.isFinite(patch.textSizeMm)) notes.TextSizeMm = patch.textSizeMm;
        if (typeof patch.includeGeneral === 'boolean') notes.IncludeGeneral = patch.includeGeneral;
        if (typeof patch.groupHeadings === 'boolean') notes.GroupHeadings = patch.groupHeadings;
        Na__LeRec__NormaliseMarginNotes(sheet);
        if (silent) { Na__LeModel__AssignDirty(true); return true; }
        Na__LeModel__Touch('margin', sheet.Sheet__Id);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One Title Block Field on a Sheet (null restores the default)
    // ------------------------------------------------------------
    function Na__LeModel__SetField(sheet, key, value) {
        if (!sheet) return false;
        if (!sheet.Sheet__Fields) sheet.Sheet__Fields = {};
        if (value === null || value === undefined) delete sheet.Sheet__Fields['Sheet__Fields__' + key];
        else sheet.Sheet__Fields['Sheet__Fields__' + key] = String(value);
        Na__LeModel__Touch('fields', sheet.Sheet__Id);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Sheet Showing the Pack's Client and Site Address?
    // ------------------------------------------------------------
    function Na__LeModel__IsCommonFields(sheet) {
        return Na__LeCommon__Uses(sheet);
    }
    // ------------------------------------------------------------


    // FUNCTION | Join This Sheet to the Pack's Two Fields, or Cut It Loose
    // ------------------------------------------------------------
    // 'fields' and not 'sheet-updated': this is a content edit of the title
    // block, one undo step, kept by the browser draft, and no auto save - which
    // is exactly what typing into the Client box has always been.
    // ------------------------------------------------------------
    function Na__LeModel__SetCommonFields(sheet, on) {
        if (!Na__LeCommon__SetUses(sheet, on)) return false;
        Na__LeModel__Touch('fields', sheet.Sheet__Id);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Client or Site Address for the WHOLE Pack
    // ------------------------------------------------------------
    // The sheet is passed only so the announcement names where the typing
    // happened; the value written belongs to every sheet on Common.
    // ------------------------------------------------------------
    function Na__LeModel__SetCommonFieldValue(sheet, key, value) {
        if (!Na__LeCommon__Set(key, value)) return false;
        Na__LeModel__Touch('fields', sheet ? sheet.Sheet__Id : null);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seed the Pack's Two Fields, Once Per Project Load
    // ------------------------------------------------------------
    // Marks the model dirty when it writes anything, so the seed lands with
    // the next save rather than writing by itself.
    // ------------------------------------------------------------
    async function Na__LeModel__SeedCommonFields() {
        const changed = await Na__LeCommon__Seed(Na__LeModel__Array());
        if (changed) Na__LeModel__Touch('fields', Na__LeModel__ActiveSheetId);
        return changed;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Sheet Model Sheets API
    // ------------------------------------------------------------
    export {
        Na__LeModel__GetSheets,
        Na__LeModel__GetSheetById,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__SetActiveSheetId,
        Na__LeModel__CreateSheet,
        Na__LeModel__DuplicateSheet,
        Na__LeModel__DeleteSheet,
        Na__LeModel__UpdateSheet,
        Na__LeModel__AnnounceRestore,
        Na__LeModel__ReorderSheet,
        Na__LeModel__GetFields,
        Na__LeModel__GetDrawingNumber,
        Na__LeModel__GetShortCode,
        Na__LeModel__GetTabLabel,
        Na__LeModel__CleanSheetName,
        Na__LeModel__ApplySheetName,
        Na__LeModel__UpdateMarginNotes,
        Na__LeModel__SetField,
        Na__LeModel__IsCommonFields,
        Na__LeModel__SetCommonFields,
        Na__LeModel__SetCommonFieldValue,
        Na__LeModel__SeedCommonFields
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
