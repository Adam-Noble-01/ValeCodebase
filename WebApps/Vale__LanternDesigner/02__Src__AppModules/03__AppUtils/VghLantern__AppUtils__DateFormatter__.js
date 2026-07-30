/* =============================================================================
   VGHLANTERN - DATE FORMATTER
   =============================================================================

   FILE       : VghLantern__AppUtils__DateFormatter__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - DateFormatter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Global date formatting utility for Vale-style date strings
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Formats dates in Vale standard formats
   - Supports: "30 Jul 2026", "Thu 30 Jul 2026", "Thursday 30th Jul 2026"
   - Ordinal suffixes with superscript support (th, st, nd, rd)
   - Accepts Date objects or ISO date strings

   ============================================================================= */

// =============================================================================
// REGION | Date Formatter Module
// =============================================================================

const VghLantern__AppUtils__DateFormatter = (function() {

    // MODULE CONSTANTS | Month and Day Name Lookups
    // ------------------------------------------------------------
    const MONTHS_SHORT  =  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS_SHORT    =  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DAYS_FULL     =  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Input to Date Object
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__ToDate(input) {
        if (input instanceof Date) return input;
        if (typeof input === 'string') return new Date(input + 'T00:00:00');
        return new Date();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Ordinal Suffix for Day Number
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__GetOrdinalSuffix(day) {
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
    function VghLantern__DateFormatter__PadDay(day) {
        return day < 10 ? '0' + day : '' + day;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "30 Jul 2026"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatShort(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return VghLantern__DateFormatter__PadDay(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thu 30 Jul 2026"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatWithDay(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return DAYS_SHORT[d.getDay()] + ' ' + VghLantern__DateFormatter__PadDay(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thursday 30th Jul 2026" (plain text ordinal)
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatFullDay(input) {
        var d       =  VghLantern__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  VghLantern__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + VghLantern__DateFormatter__PadDay(day) + suffix + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thursday 30<sup>th</sup> Jul 2026" (HTML superscript)
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatFullDayHtml(input) {
        var d       =  VghLantern__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  VghLantern__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + VghLantern__DateFormatter__PadDay(day) + '<sup>' + suffix + '</sup> ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format ISO String "2026-07-30"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatIso(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        var m  =  d.getMonth() + 1;
        return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + VghLantern__DateFormatter__PadDay(d.getDate());
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DateFormatter__FormatShort       : VghLantern__DateFormatter__FormatShort,
        VghLantern__DateFormatter__FormatWithDay     : VghLantern__DateFormatter__FormatWithDay,
        VghLantern__DateFormatter__FormatFullDay     : VghLantern__DateFormatter__FormatFullDay,
        VghLantern__DateFormatter__FormatFullDayHtml : VghLantern__DateFormatter__FormatFullDayHtml,
        VghLantern__DateFormatter__FormatIso         : VghLantern__DateFormatter__FormatIso
    };

})();

// endregion ===================================================================

window.VghLantern__AppUtils__DateFormatter  =  VghLantern__AppUtils__DateFormatter;
