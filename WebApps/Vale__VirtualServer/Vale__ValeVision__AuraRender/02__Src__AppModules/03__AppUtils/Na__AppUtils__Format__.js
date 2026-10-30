// =============================================================================
// VALEVISION AURA - APP UTILS - FORMAT
// =============================================================================
//
// FILE       : Na__AppUtils__Format__.js
// NAMESPACE  : Na__Format
// MODULE     : App Utils - Format
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Ids, dates, scales and small number helpers shared by every module
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Dates are DD-Mon-YYYY, as on every Vale drawing and in Adam's logs.
// - Ids carry their kind ("Sheet_lx3k9a_4f2c") so a record is recognisable in
//   the saved JSON without its neighbours.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Format
// -----------------------------------------------------------------------------

    const Na__Format__MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


    // FUNCTION | A New Record Id: kind, time, and a little randomness
    // ------------------------------------------------------------
    function Na__Format__Id(kind) {
        const random = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
        return `${kind}_${Date.now().toString(36)}_${random}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Date as DD-Mon-YYYY (today when none is given)
    // ------------------------------------------------------------
    function Na__Format__Date(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        return `${String(date.getDate()).padStart(2, '0')}-${Na__Format__MONTHS[date.getMonth()]}-${date.getFullYear()}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Scale Label ("1:50"), and a Sheet's Scale Line ("1:50 @ A1")
    // ------------------------------------------------------------
    function Na__Format__Scale(denominator) {
        return `1:${Math.round(Number(denominator) || 0)}`;
    }

    function Na__Format__SheetScale(denominators, paperKey) {
        const unique = Array.from(new Set(denominators.filter(Boolean).map(Number))).sort((a, b) => a - b);
        if (!unique.length) return 'NTS';
        const scales = unique.length > 2 ? 'As shown' : unique.map(Na__Format__Scale).join(', ');
        return `${scales} @ ${paperKey}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Numbers: clamp, round to a step, and a small seeded integer
    // ------------------------------------------------------------
    function Na__Format__Clamp(value, low, high) {
        return Math.min(high, Math.max(low, value));
    }

    function Na__Format__Round(value, digits) {
        const k = Math.pow(10, digits === undefined ? 2 : digits);
        return Math.round(value * k) / k;
    }

    function Na__Format__Seed() {
        return Math.floor(Math.random() * 2147483647);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Typed Readout Back to a Value - an engine readout format run backwards
    // ------------------------------------------------------------
    // Mirrors PainterlyNPR's PainterlyNPR__Interface__ParseFrom (v0.5.2), which
    // the pinned engine v0.5.0 does not have yet: the engine host prefers the
    // engine's own (.Parse on a control's readout) once a sync brings it.
    // "60%" or "60" is 0.6 on a per-cent slider; a readout's words ("off",
    // "simplify 0.3") pick their place. NaN when nothing can be read.
    function Na__Format__ParseReadout(format, text) {
        const clean = (value) => String(value == null ? '' : value).toLowerCase().replace(/\u2212/g, '-').replace(/,/g, '.').replace(/\s+/g, ' ').trim();
        const number = (t) => { const m = t.match(/[-+]?(?:\d+\.?\d*|\.\d+)/); return m ? parseFloat(m[0]) : NaN; };
        const base = (f, t) => {
            switch (f.Kind) {
                case 'Round': return number(t) / (f.Scale === undefined ? 1 : f.Scale);
                case 'Fixed': return number(t) - (f.Offset || 0);
                case 'Steps': {
                    for (let i = 0; i < f.Steps.length; i++) if (t === clean(f.Steps[i][1])) return i ? f.Steps[i - 1][0] : 0;
                    if (t === clean(f.Else)) return f.Steps[f.Steps.length - 1][0];
                    return number(t);
                }
                case 'Sided': {
                    if (t === clean(f.Zero.Text)) return 0;
                    const words = clean(`${f.Under.Prefix || ''} ${f.Under.Suffix || ''}`).replace(/[^a-z ]/g, '').trim();
                    const n = number(t);
                    if (n < 0) return -base(f.Under, String(-n));
                    if (words && t.includes(words)) return -base(f.Under, t);
                    return base(f.Above, t.replace(/^\+/, ''));
                }
                default: return number(t);
            }
        };
        const t = clean(text);
        if (!t || !format) return NaN;
        if (format.Off && t === clean(format.Off.Text)) return 'Below' in format.Off ? 0 : format.Off.NotAbove;
        if (format.From && t === clean(format.From.Text)) return format.From.AtLeast;
        return base(format, t);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Stable Text Key for an Object (sorted keys), for caches
    // ------------------------------------------------------------
    function Na__Format__Key(value) {
        if (value === null || typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(Na__Format__Key).join(',')}]`;
        return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${Na__Format__Key(value[k])}`).join(',')}}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Format__Id,
        Na__Format__Date,
        Na__Format__Scale,
        Na__Format__SheetScale,
        Na__Format__Clamp,
        Na__Format__Round,
        Na__Format__Seed,
        Na__Format__Key,
        Na__Format__ParseReadout
    };

// endregion -------------------------------------------------------------------
