// =============================================================================
// VALEVISION THEIA - APP UTILS - FORMATTING
// =============================================================================
//
// FILE       : Na__AppUtils__Format__.js
// NAMESPACE  : Na__Format
// MODULE     : App Utils - Formatting
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Video lengths, Vale dates (07-Oct-2026), file sizes and speeds as
//              people read them
// CREATED    : 07-Oct-2026
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Formatters
// -----------------------------------------------------------------------------

    const Na__Format__MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


    // FUNCTION | Seconds as 4:32 or 1:04:32
    // ------------------------------------------------------------
    function Na__Format__Clock(seconds) {
        const s = Math.max(0, Math.floor(Number(seconds) || 0));
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
        return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Milliseconds as a Clock
    // ------------------------------------------------------------
    function Na__Format__Duration(ms) {
        return Na__Format__Clock((Number(ms) || 0) / 1000);
    }
    // ------------------------------------------------------------


    // FUNCTION | An ISO Stamp as a Vale Date (07-Oct-2026), With the Time When Asked
    // ------------------------------------------------------------
    function Na__Format__Date(iso, withTime) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const date = `${String(d.getDate()).padStart(2, '0')}-${Na__Format__MONTHS[d.getMonth()]}-${d.getFullYear()}`;
        return withTime ? `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : date;
    }
    // ------------------------------------------------------------


    // FUNCTION | Bytes as 640 MB / 1.2 GB
    // ------------------------------------------------------------
    function Na__Format__Bytes(bytes) {
        const b = Number(bytes) || 0;
        if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
        if (b >= 1024 ** 2) return `${Math.round(b / 1024 ** 2)} MB`;
        return `${Math.max(1, Math.round(b / 1024))} KB`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Megabits a Second
    // ------------------------------------------------------------
    function Na__Format__Mbps(mbps) {
        const v = Number(mbps) || 0;
        return v >= 100 ? `${Math.round(v)} Mbps` : `${v.toFixed(v >= 10 ? 0 : 1)} Mbps`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Scheme Folder Name as a Label ("Scheme-01" -> "Scheme 01")
    // ------------------------------------------------------------
    function Na__Format__Scheme(scheme) {
        return String(scheme || '').replace(/[-_]+/g, ' ').trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Format__Clock,
        Na__Format__Duration,
        Na__Format__Date,
        Na__Format__Bytes,
        Na__Format__Mbps,
        Na__Format__Scheme
    };

// endregion -------------------------------------------------------------------
