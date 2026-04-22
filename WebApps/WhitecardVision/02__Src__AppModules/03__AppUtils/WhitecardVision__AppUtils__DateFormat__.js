/* =============================================================================
 WHITECARDVISION - DATE FORMAT UTILITY
============================================================================= */

(function () {
    'use strict';


    const WV__MONTH_ABBREVIATIONS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


    /* FUNCTION | ISO string -> "22 Apr 2026 - 14:57" */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__IsoToHumanReadable(isoString) {
        if (!isoString) return '';
        const dateObj = new Date(isoString);
        if (isNaN(dateObj.getTime())) return isoString;
        const dayStr     = String(dateObj.getDate()).padStart(2, '0');
        const monStr     = WV__MONTH_ABBREVIATIONS[dateObj.getMonth()];
        const yearStr    = dateObj.getFullYear();
        const hourStr    = String(dateObj.getHours()).padStart(2, '0');
        const minStr     = String(dateObj.getMinutes()).padStart(2, '0');
        return `${dayStr} ${monStr} ${yearStr} - ${hourStr}:${minStr}`;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Safe folder-token timestamp (20260422T145730Z) */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__CompactUtcToken(dateObj) {
        const workingDate = dateObj || new Date();
        return workingDate.toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Local-zone day-month-year token -> "22-Apr-2026" */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__FormatToDayMonYearLocal(dateOrIsoOrNull) {
        const dateObj = Wv__DateFormat__CoerceToDate(dateOrIsoOrNull);
        if (!dateObj) return '';
        const dayStr  = String(dateObj.getDate()).padStart(2, '0');
        const monStr  = WV__MONTH_ABBREVIATIONS[dateObj.getMonth()];
        const yearStr = dateObj.getFullYear();
        return `${dayStr}-${monStr}-${yearStr}`;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Local-zone day-month-year + 24h clock -> "22-Apr-2026 13:45:02" */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__FormatToDayMonYearTimeLocal(dateOrIsoOrNull) {
        const dateObj = Wv__DateFormat__CoerceToDate(dateOrIsoOrNull);
        if (!dateObj) return '';
        const datePart = Wv__DateFormat__FormatToDayMonYearLocal(dateObj);
        const hourStr  = String(dateObj.getHours()).padStart(2, '0');
        const minStr   = String(dateObj.getMinutes()).padStart(2, '0');
        const secStr   = String(dateObj.getSeconds()).padStart(2, '0');
        return `${datePart} ${hourStr}:${minStr}:${secStr}`;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Filename-safe token -> "22-Apr-2026_13-45-02" */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__FormatToFilenameToken(dateOrIsoOrNull) {
        return Wv__DateFormat__FormatToDayMonYearTimeLocal(dateOrIsoOrNull)
            .replace(' ', '_')
            .replace(/:/g, '-');
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Coerce ISO string / Date / null to a valid Date */
    /* ------------------------------------------------------------ */
    function Wv__DateFormat__CoerceToDate(candidate) {
        if (candidate instanceof Date) return isNaN(candidate.getTime()) ? null : candidate;
        if (typeof candidate === 'string' && candidate.length > 0) {
            const parsedDate = new Date(candidate);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        }
        return new Date();
    }
    /* ------------------------------------------------------------ */


    window.Wv__AppUtils__DateFormat = {
        Wv__DateFormat__IsoToHumanReadable,
        Wv__DateFormat__CompactUtcToken,
        Wv__DateFormat__FormatToDayMonYearLocal,
        Wv__DateFormat__FormatToDayMonYearTimeLocal,
        Wv__DateFormat__FormatToFilenameToken
    };

})();
