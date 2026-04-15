/* =============================================================================
   VALESPEC - DATE FORMATTER
   =============================================================================

   FILE       : ValeSpec__AppUtils__DateFormatter__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppUtils - DateFormatter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Global date formatting utility for Vale-style date strings
   CREATED    : 2026

   DESCRIPTION:
   - Formats dates in Vale standard formats
   - Supports: "09 Apr 2026", "Wed 09 Apr 2026", "Wednesday 09th Apr 2026"
   - Ordinal suffixes with superscript support (th, st, nd, rd)
   - Accepts Date objects or ISO date strings

   ============================================================================= */

// =============================================================================
// REGION | Date Formatter Module
// =============================================================================

const ValeSpec__AppUtils__DateFormatter = (function() {

    // MODULE CONSTANTS | Month and Day Name Lookups
    // ------------------------------------------------------------
    const MONTHS_SHORT  =  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTHS_FULL   =  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAYS_SHORT    =  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DAYS_FULL     =  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Input to Date Object
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__ToDate(input) {
        if (input instanceof Date) return input;
        if (typeof input === 'string') return new Date(input + 'T00:00:00');
        return new Date();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Ordinal Suffix for Day Number
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__GetOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1:  return 'st';
            case 2:  return 'nd';
            case 3:  return 'rd';
            default: return 'th';
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Zero-Pad Day to Two Digits
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__PadDay(day) {
        return day < 10 ? '0' + day : '' + day;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "09 Apr 2026"
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__FormatShort(input) {
        var d  =  ValeSpec__DateFormatter__ToDate(input);
        return ValeSpec__DateFormatter__PadDay(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Wed 09 Apr 2026"
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__FormatWithDay(input) {
        var d  =  ValeSpec__DateFormatter__ToDate(input);
        return DAYS_SHORT[d.getDay()] + ' ' + ValeSpec__DateFormatter__PadDay(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Wednesday 09th Apr 2026" (plain text ordinal)
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__FormatFullDay(input) {
        var d       =  ValeSpec__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  ValeSpec__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + ValeSpec__DateFormatter__PadDay(day) + suffix + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Wednesday 09<sup>th</sup> Apr 2026" (HTML superscript)
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__FormatFullDayHtml(input) {
        var d       =  ValeSpec__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  ValeSpec__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + ValeSpec__DateFormatter__PadDay(day) + '<sup>' + suffix + '</sup> ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format ISO String "2026-04-09"
    // ------------------------------------------------------------
    function ValeSpec__DateFormatter__FormatIso(input) {
        var d  =  ValeSpec__DateFormatter__ToDate(input);
        var m  =  d.getMonth() + 1;
        return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + ValeSpec__DateFormatter__PadDay(d.getDate());
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DateFormatter__FormatShort       : ValeSpec__DateFormatter__FormatShort,
        ValeSpec__DateFormatter__FormatWithDay     : ValeSpec__DateFormatter__FormatWithDay,
        ValeSpec__DateFormatter__FormatFullDay     : ValeSpec__DateFormatter__FormatFullDay,
        ValeSpec__DateFormatter__FormatFullDayHtml : ValeSpec__DateFormatter__FormatFullDayHtml,
        ValeSpec__DateFormatter__FormatIso         : ValeSpec__DateFormatter__FormatIso
    };

})();

// endregion ===================================================================

window.ValeSpec__AppUtils__DateFormatter  =  ValeSpec__AppUtils__DateFormatter;
