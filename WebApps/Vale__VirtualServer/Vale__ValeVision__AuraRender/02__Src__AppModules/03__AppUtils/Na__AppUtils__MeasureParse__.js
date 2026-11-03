// =============================================================================
// VALEVISION AURA - APP UTILS - MEASUREMENT PARSING
// =============================================================================
//
// FILE       : Na__AppUtils__MeasureParse__.js
// NAMESPACE  : Na__MeasureParse
// MODULE     : App Utils - Measurement Parsing
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read what is typed into the Measurements box as millimetres, and
//              write millimetres back for it to show
// CREATED    : 03-Nov-2026
//
// DESCRIPTION:
// - A LENGTH is a number with an optional unit: 2500, 2,500, 2500mm, 250cm,
//   2.5m or 2.5 M. A number with no unit is millimetres. Case never matters.
//   A leading minus sign reverses the direction it is drawn in.
// - COMMAS ARE THOUSANDS SEPARATORS, as a UK drawing writes them: 2,000 and
//   3,555 are two thousand and three thousand five hundred and fifty-five
//   millimetres. A comma only counts as one where exactly three digits follow
//   it, so 2,5 is refused rather than read as two and a half.
// - Pure: no imports, no DOM, no config, so the rules can be tested in Node.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : TrueVision 3D (51__System__LayoutEditor/15__Core__Markup/
//                   Na__LayoutEditor__MeasureParse__.js 1.1.0)
// - Ported on     : 03-Nov-2026 for AURA 0.5.20 - lengths and the readout format
// - Parity        : verbatim, less what AURA has no use for
// - Divergences   : No width and height pairs and no array counts: AURA's box
//                   only moves viewports, and has no rectangle tool or copies.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 03-Nov-2026 - Version 1.0.0 (AURA 0.5.20)
// - Initial port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__MeasureParse__UNITS = Object.freeze([                             // <-- In millimetres, longest name first
        { name: 'mm', factor: 1    },
        { name: 'cm', factor: 10   },
        { name: 'm',  factor: 1000 }
    ]);

    const Na__MeasureParse__REASON_EMPTY  = 'empty';                            // <-- Nothing typed
    const Na__MeasureParse__REASON_NUMBER = 'number';                           // <-- Not a number this reader understands
    const Na__MeasureParse__REASON_UNIT   = 'unit';                             // <-- A number followed by a unit it does not know

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is a Character One of the Ten Digits
    // ------------------------------------------------------------
    function Na__MeasureParse__IsDigit(ch) {
        return typeof ch === 'string' && ch.length === 1 && ch >= '0' && ch <= '9';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Step Past Spaces
    // ------------------------------------------------------------
    function Na__MeasureParse__SkipSpaces(text, index) {
        let i = index;
        while (i < text.length && text[i] === ' ') i++;
        return i;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Length Starting at an Index
    // ------------------------------------------------------------
    // Returns { valueMm, end, unit } - end is the index after what was read -
    // or { error } when there is no length there.
    //
    // THE COMMA RULE. A comma followed by exactly three digits, and then by
    // anything but a fourth digit, is a thousands separator: 2,000 and 12,500.
    // ------------------------------------------------------------
    function Na__MeasureParse__ReadLength(text, index) {
        let i = Na__MeasureParse__SkipSpaces(text, index);
        let sign = 1;
        if (text[i] === '-' || text[i] === '+') {
            if (text[i] === '-') sign = -1;
            i = Na__MeasureParse__SkipSpaces(text, i + 1);
        }

        // WHOLE PART | Digits, then any comma groups the rule allows
        let whole = '';
        while (Na__MeasureParse__IsDigit(text[i])) { whole += text[i]; i++; }
        if (whole.length >= 1 && whole.length <= 3) {
            while (text[i] === ',' && Na__MeasureParse__IsDigit(text[i + 1]) && Na__MeasureParse__IsDigit(text[i + 2]) && Na__MeasureParse__IsDigit(text[i + 3]) && !Na__MeasureParse__IsDigit(text[i + 4])) {
                whole += text.substr(i + 1, 3);
                i += 4;
            }
        }

        // FRACTION | A point and its digits; "2." is still two
        let fraction = '';
        if (text[i] === '.') {
            let j = i + 1;
            while (Na__MeasureParse__IsDigit(text[j])) { fraction += text[j]; j++; }
            if (fraction.length || whole.length) i = j;
        }
        if (!whole.length && !fraction.length) return { error: Na__MeasureParse__REASON_NUMBER };
        const magnitude = parseFloat(`${whole || '0'}.${fraction || '0'}`);
        if (!Number.isFinite(magnitude)) return { error: Na__MeasureParse__REASON_NUMBER };

        // UNIT | Optional, after optional spaces; a letter left touching it is not a unit
        const afterNumber = i;
        i = Na__MeasureParse__SkipSpaces(text, i);
        const rest = text.slice(i).toLowerCase();
        const unit = Na__MeasureParse__UNITS.find((u) => rest.indexOf(u.name) === 0) || null;
        if (unit) {
            const next = text[i + unit.name.length];
            if (next !== undefined && /[a-zA-Z]/.test(next)) return { error: Na__MeasureParse__REASON_UNIT };
            i += unit.name.length;
        } else {
            if (/^[a-zA-Z]/.test(rest)) return { error: Na__MeasureParse__REASON_UNIT };
            i = afterNumber;                                                     // <-- The spaces belong to whatever comes next
        }
        return { valueMm: sign * magnitude * (unit ? unit.factor : 1), end: i, unit: unit ? unit.name : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read One Length (a figure and an optional unit, nothing else)
    // ------------------------------------------------------------
    // Returns { ok: true, valueMm } or { ok: false, reason }.
    // ------------------------------------------------------------
    function Na__MeasureParse__Length(text) {
        const src = String(text === undefined || text === null ? '' : text).trim();
        if (!src) return { ok: false, reason: Na__MeasureParse__REASON_EMPTY };
        const token = Na__MeasureParse__ReadLength(src, 0);
        if (token.error) return { ok: false, reason: token.error };
        if (Na__MeasureParse__SkipSpaces(src, token.end) !== src.length) return { ok: false, reason: Na__MeasureParse__REASON_NUMBER };
        return { ok: true, valueMm: token.valueMm };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing
// -----------------------------------------------------------------------------

    // FUNCTION | Millimetres as the Box Shows Them
    // ------------------------------------------------------------
    // options: { precision (decimal places, 0 to 3), thousandsSep, suffix }.
    // Trailing zeros after the point are dropped, so a whole number never
    // reads 2,500.0 - and a length that needs its tenth still shows it.
    // ------------------------------------------------------------
    function Na__MeasureParse__Format(valueMm, options) {
        const o = options || {};
        if (!Number.isFinite(valueMm)) return '';
        const precision = Number.isFinite(o.precision) ? Math.max(0, Math.min(3, Math.round(o.precision))) : 0;
        const separator = typeof o.thousandsSep === 'string' ? o.thousandsSep : ',';
        let fixed = Math.abs(valueMm).toFixed(precision);
        if (fixed.indexOf('.') !== -1) fixed = fixed.replace(/0+$/, '').replace(/[.]$/, '');
        const parts = fixed.split('.');
        if (separator) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        const negative = valueMm < 0 && parseFloat(fixed) !== 0;
        return (negative ? '-' : '') + parts.join('.') + (typeof o.suffix === 'string' ? o.suffix : '');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__MeasureParse__REASON_EMPTY,
        Na__MeasureParse__REASON_NUMBER,
        Na__MeasureParse__REASON_UNIT,
        Na__MeasureParse__Length,
        Na__MeasureParse__Format
    };

// endregion -------------------------------------------------------------------
