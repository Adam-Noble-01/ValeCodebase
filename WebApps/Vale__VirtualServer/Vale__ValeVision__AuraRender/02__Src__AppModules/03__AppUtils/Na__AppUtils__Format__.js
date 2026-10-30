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
        Na__Format__Key
    };

// endregion -------------------------------------------------------------------
