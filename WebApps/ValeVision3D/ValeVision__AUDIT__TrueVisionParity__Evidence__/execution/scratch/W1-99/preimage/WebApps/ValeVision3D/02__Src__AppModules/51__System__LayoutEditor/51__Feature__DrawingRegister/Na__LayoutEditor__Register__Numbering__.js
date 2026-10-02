// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER NUMBERING
// =============================================================================
//
// FILE       : Na__LayoutEditor__Register__Numbering__.js
// NAMESPACE  : Na__LeRegNum
// MODULE     : Layout Editor - Drawing Register Numbering
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Assign document numbers in sheet order without changing stable ids
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - An override starts a new run (D10, D11...). Duplicate or backward jumps
//   are rejected before any live records are changed.
// - Sheet ids never change. No network activity: this module only plans and
//   writes numbers onto the in-memory sheets.
//
// INTEGRATION:
// - Called from the register transactions and from the sheet model when a
//   pack is first numbered. Import Plan then Apply; never number by hand.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js
// - Source version: 1.0.1 (TrueVision3D v2.69.0, 19-Sep-2026, the first release whose log names the Drawing
//                   Register; the file is unchanged since it was first committed that day; read at b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-13}}, ahead of the rest of the Drawing Register:
//                   the sheet model's renumber imports it
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.0.1
// - Headers, region breakdown, function wrapping and the export block brought
//   in line with the Layout Editor coding conventions. No behaviour change.
//
// 19-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Numbering Rules
// -----------------------------------------------------------------------------

    // FUNCTION | Validate and Resolve the Whole Sequence Before Applying It
    // ------------------------------------------------------------
    function Na__LeRegNum__Plan(sheets, setup) {
        const prefix    = String(setup.DrawingRegister__Numbering__Prefix || '').trim();
        const start     = Number(setup.DrawingRegister__Numbering__Start);
        const digits    = Number(setup.DrawingRegister__Numbering__Digits);
        const overrides = setup.DrawingRegister__Numbering__Overrides || {};
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(prefix)) {
            throw new Error('Use a letter-led numbering prefix, such as D.');
        }
        if (!Number.isSafeInteger(start) || start < 0) {
            throw new Error('The first number must be a positive whole number or zero.');
        }
        if (!Number.isInteger(digits) || digits < 1 || digits > 6) {
            throw new Error('Number width must be between 1 and 6 digits.');
        }
        let next = start;
        return sheets.map((sheet, index) => {
            const override = overrides[sheet.Sheet__Id];
            if (override !== undefined && override !== null && override !== '') {
                const jump = Number(override);
                if (!Number.isSafeInteger(jump) || jump < next) {
                    throw new Error('The number jump for ' + sheet.Sheet__Name + ' must be at least ' + next + '.');
                }
                next = jump;
            }
            if (!Number.isSafeInteger(next + 1)) {
                throw new Error('The numbering series is too large.');
            }
            return {
                id     : sheet.Sheet__Id,
                order  : index + 1,
                number : prefix + String(next++).padStart(digits, '0')
            };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Validated Numbering Plan to the Authoritative Fields
    // ------------------------------------------------------------
    function Na__LeRegNum__Apply(sheets, plan) {
        const byId = new Map(sheets.map((sheet) => [sheet.Sheet__Id, sheet]));
        plan.forEach((entry) => {
            const sheet = byId.get(entry.id);
            if (!sheet) throw new Error('A sheet disappeared while numbering the pack.');
            sheet.Sheet__Order  = entry.order;
            sheet.Sheet__Fields = sheet.Sheet__Fields || {};
            sheet.Sheet__Fields.Sheet__Fields__DrawingNumber = entry.number;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Drawing Register Numbering API
    // ------------------------------------------------------------
    export {
        Na__LeRegNum__Plan,
        Na__LeRegNum__Apply
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
