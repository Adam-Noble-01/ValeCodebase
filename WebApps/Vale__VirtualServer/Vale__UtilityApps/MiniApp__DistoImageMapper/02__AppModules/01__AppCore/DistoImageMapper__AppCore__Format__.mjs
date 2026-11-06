/* =============================================================================
   DISTO IMAGE MAPPER - APP CORE | NUMBER AND DATE FORMATTING
   =============================================================================

   FILE       : DistoImageMapper__AppCore__Format__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : AppCore - Format
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : How lengths, angles and dates read on screen
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Short runs in millimetres, long runs in metres, as a dimension would read.
   - A value that rounds to zero never shows a minus sign (the DXF writes -0.000000).
   - Dates in the house form, 21-Jul-2026.

   ============================================================================= */

// -----------------------------------------------------------------------------
// REGION | Formatting
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Month Names
    // ------------------------------------------------------------
    const MONTHS  =  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fixed Decimals With No Negative Zero
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__Fixed(value, decimals) {
        const text  =  Number(value).toFixed(decimals);
        return /^-0(\.0*)?$/.test(text) ? text.slice(1) : text;              // <-- "-0.0" reads "0.0"
    }
    // ------------------------------------------------------------


    // FUNCTION | A Coordinate in Millimetres
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__CoordinateMm(valueMm) {
        return `${DistoImageMapper__Format__Fixed(valueMm, 1)} mm`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Length: Millimetres Up to a Metre, Then Metres
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__Length(valueMm) {
        if (valueMm === 0) return '0 mm';
        if (Math.abs(valueMm) < 1000) return `${DistoImageMapper__Format__Fixed(valueMm, Math.abs(valueMm) < 10 ? 1 : 0)} mm`;
        return `${DistoImageMapper__Format__Fixed(valueMm / 1000, 2)} m`;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Angle in Degrees
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__Angle(valueDegrees) {
        return `${DistoImageMapper__Format__Fixed(valueDegrees, 4)} deg`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Log's 2026-07-21 as 21-Jul-2026
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__Date(isoText) {
        const match  =  /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(isoText || '').trim());
        if (!match) return isoText || '';
        return `${match[3].padStart(2, '0')}-${MONTHS[Number(match[2]) - 1] || match[2]}-${match[1]}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Log's 14-29-50 as 14:29:50
    // ------------------------------------------------------------
    export function DistoImageMapper__Format__Time(logTimeText) {
        return String(logTimeText || '').trim().replace(/-/g, ':');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
