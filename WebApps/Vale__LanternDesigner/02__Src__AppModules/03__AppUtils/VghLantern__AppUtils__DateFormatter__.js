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
   - Vale data storage format is "30-Jul-2026" (DD-MMM-YYYY)
   - Vale timestamp storage format is "30-Jul-2026 14:32:07" (DD-MMM-YYYY HH:mm:ss),
     used for DateCreated / DateModified so same-day saves stay sort-distinct
   - Ordinal suffixes with superscript support (th, st, nd, rd)
   - Accepts Date objects, "DD-MMM-YYYY" strings, "DD-MMM-YYYY HH:mm:ss" strings,
     or legacy ISO date strings

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


    // MODULE CONSTANTS | Supported Date String Patterns
    // ------------------------------------------------------------
    const PATTERN_DD_MMM_YYYY_HMS  =  /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;  // <-- Vale timestamp format "30-Jul-2026 14:32:07"
    const PATTERN_DD_MMM_YYYY      =  /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;      // <-- Vale storage format "30-Jul-2026"
    const PATTERN_ISO_DATE         =  /^(\d{4})-(\d{2})-(\d{2})$/;              // <-- Legacy stored format "2026-07-30"
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Short Month Name to Zero-Based Index
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__MonthNameToIndex(monthName) {
        var target  =  String(monthName).toLowerCase();
        for (var i = 0; i < MONTHS_SHORT.length; i++) {
            if (MONTHS_SHORT[i].toLowerCase() === target) return i;
        }
        return -1;                                                          // <-- Unrecognised month name
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Date String in Any Supported Format
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__ParseDateString(text) {
        var trimmed  =  String(text).trim();

        var valeHmsMatch  =  PATTERN_DD_MMM_YYYY_HMS.exec(trimmed);         // <-- Try Vale timestamp format first (carries hours/minutes/seconds)
        if (valeHmsMatch) {
            var hmsMonthIndex  =  VghLantern__DateFormatter__MonthNameToIndex(valeHmsMatch[2]);
            if (hmsMonthIndex >= 0) {
                return new Date(
                    parseInt(valeHmsMatch[3], 10), hmsMonthIndex, parseInt(valeHmsMatch[1], 10),
                    parseInt(valeHmsMatch[4], 10), parseInt(valeHmsMatch[5], 10), parseInt(valeHmsMatch[6], 10)
                );
            }
        }

        var valeMatch  =  PATTERN_DD_MMM_YYYY.exec(trimmed);                // <-- Try Vale storage format (date-only)
        if (valeMatch) {
            var monthIndex  =  VghLantern__DateFormatter__MonthNameToIndex(valeMatch[2]);
            if (monthIndex >= 0) {
                return new Date(parseInt(valeMatch[3], 10), monthIndex, parseInt(valeMatch[1], 10));
            }
        }

        var isoMatch  =  PATTERN_ISO_DATE.exec(trimmed);                    // <-- Fall back to legacy ISO strings
        if (isoMatch) {
            return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
        }

        return new Date(trimmed);                                           // <-- Native parse handles everything else
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Input to Date Object
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__ToDate(input) {
        if (input instanceof Date) return input;
        if (typeof input === 'string') return VghLantern__DateFormatter__ParseDateString(input);
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


    // HELPER FUNCTION | Zero-Pad a Day, Hour, Minute, or Second to Two Digits
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__PadTwoDigits(value) {
        return value < 10 ? '0' + value : '' + value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "30 Jul 2026"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatShort(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return VghLantern__DateFormatter__PadTwoDigits(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "30th Jul 2026" (plain text ordinal, short form)
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatShortOrdinal(input) {
        var d       =  VghLantern__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  VghLantern__DateFormatter__GetOrdinalSuffix(day);
        return VghLantern__DateFormatter__PadTwoDigits(day) + suffix + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thu 30 Jul 2026"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatWithDay(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return DAYS_SHORT[d.getDay()] + ' ' + VghLantern__DateFormatter__PadTwoDigits(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thursday 30th Jul 2026" (plain text ordinal)
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatFullDay(input) {
        var d       =  VghLantern__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  VghLantern__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + VghLantern__DateFormatter__PadTwoDigits(day) + suffix + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format: "Thursday 30<sup>th</sup> Jul 2026" (HTML superscript)
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatFullDayHtml(input) {
        var d       =  VghLantern__DateFormatter__ToDate(input);
        var day     =  d.getDate();
        var suffix  =  VghLantern__DateFormatter__GetOrdinalSuffix(day);
        return DAYS_FULL[d.getDay()] + ' ' + VghLantern__DateFormatter__PadTwoDigits(day) + '<sup>' + suffix + '</sup> ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format Vale Data Storage String "30-Jul-2026"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatDdMmmYyyy(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return VghLantern__DateFormatter__PadTwoDigits(d.getDate()) + '-' + MONTHS_SHORT[d.getMonth()] + '-' + d.getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Format Vale Timestamp Storage String "30-Jul-2026 14:32:07"
    // ------------------------------------------------------------
    // Used for DateCreated / DateModified so entries saved on the same day
    // remain sort-distinct instead of tying at midnight.
    function VghLantern__DateFormatter__FormatDdMmmYyyyHms(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        return VghLantern__DateFormatter__FormatDdMmmYyyy(d) + ' ' +
            VghLantern__DateFormatter__PadTwoDigits(d.getHours())   + ':' +
            VghLantern__DateFormatter__PadTwoDigits(d.getMinutes()) + ':' +
            VghLantern__DateFormatter__PadTwoDigits(d.getSeconds());
    }
    // ------------------------------------------------------------


    // FUNCTION | Format ISO String "2026-07-30"
    // ------------------------------------------------------------
    function VghLantern__DateFormatter__FormatIso(input) {
        var d  =  VghLantern__DateFormatter__ToDate(input);
        var m  =  d.getMonth() + 1;
        return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + VghLantern__DateFormatter__PadTwoDigits(d.getDate());
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DateFormatter__FormatShort        : VghLantern__DateFormatter__FormatShort,
        VghLantern__DateFormatter__FormatShortOrdinal : VghLantern__DateFormatter__FormatShortOrdinal,
        VghLantern__DateFormatter__FormatWithDay      : VghLantern__DateFormatter__FormatWithDay,
        VghLantern__DateFormatter__FormatFullDay      : VghLantern__DateFormatter__FormatFullDay,
        VghLantern__DateFormatter__FormatFullDayHtml  : VghLantern__DateFormatter__FormatFullDayHtml,
        VghLantern__DateFormatter__FormatDdMmmYyyy    : VghLantern__DateFormatter__FormatDdMmmYyyy,
        VghLantern__DateFormatter__FormatDdMmmYyyyHms : VghLantern__DateFormatter__FormatDdMmmYyyyHms,
        VghLantern__DateFormatter__FormatIso          : VghLantern__DateFormatter__FormatIso,
        VghLantern__DateFormatter__ToDate             : VghLantern__DateFormatter__ToDate
    };

})();

// endregion ===================================================================

window.VghLantern__AppUtils__DateFormatter  =  VghLantern__AppUtils__DateFormatter;
