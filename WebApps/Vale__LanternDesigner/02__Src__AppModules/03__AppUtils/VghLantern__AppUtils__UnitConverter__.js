/* =============================================================================
   VGHLANTERN - UNIT CONVERTER
   =============================================================================

   FILE       : VghLantern__AppUtils__UnitConverter__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - UnitConverter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Single authority for all unit conversion across the application
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - THE ONLY place in the application permitted to convert between unit spaces.
   - Three coordinate spaces exist and must never be mixed without going via here:

       1. MODEL SPACE   - millimetres (mm). Integer-friendly. The canonical space.
                          Everything in the project JSON and every value returned
                          by 04__MathUtils__LanternGeometry is in mm.

       2. SVG SPACE     - SVG user units, where 1 user unit == 1 mm by definition.
                          Visual scaling is achieved purely through the viewBox,
                          never by pre-multiplying coordinates. This keeps the 2D
                          renderers trivially simple - they emit mm directly.

       3. THREE SPACE   - Three.js world units, where 1 world unit == 1 metre.
                          This follows the glTF convention so vendored GLB assets
                          drop in at correct scale with no per-asset scale factor.

   - Also provides imperial display helpers for staff who quote in inches, and
     rounding helpers so mm values round consistently everywhere.

   ============================================================================= */

// =============================================================================
// REGION | Unit Converter Module
// =============================================================================

const VghLantern__AppUtils__UnitConverter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Conversion Factors
    // ------------------------------------------------------------
    const MM_PER_METRE        =  1000;                                       // <-- Millimetres in one metre
    const MM_PER_INCH         =  25.4;                                       // <-- Millimetres in one inch
    const SVG_UNITS_PER_MM    =  1.0;                                        // <-- SVG user unit == 1 mm (viewBox does the scaling)
    const MM_ROUNDING_DP      =  1;                                          // <-- Decimal places retained on mm values
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rounding Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Round a Number to a Given Decimal Place Count
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__RoundTo(value, decimalPlaces) {
        var factor  =  Math.pow(10, decimalPlaces || 0);
        return Math.round(value * factor) / factor;
    }
    // ------------------------------------------------------------


    // FUNCTION | Round a Millimetre Value to Application Standard Precision
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__RoundMm(millimetres) {
        return VghLantern__UnitConverter__RoundTo(Number(millimetres) || 0, MM_ROUNDING_DP);
    }
    // ------------------------------------------------------------


    // FUNCTION | Round a Millimetre Value to the Nearest Whole Millimetre
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__RoundMmWhole(millimetres) {
        return Math.round(Number(millimetres) || 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model Space (mm) to SVG Space Conversion
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Millimetres to SVG User Units
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__MmToSvg(millimetres) {
        return (Number(millimetres) || 0) * SVG_UNITS_PER_MM;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert SVG User Units Back to Millimetres
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__SvgToMm(svgUnits) {
        return (Number(svgUnits) || 0) / SVG_UNITS_PER_MM;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert an {x, y} Millimetre Point to SVG User Units
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__MmPointToSvg(pointMm) {
        if (!pointMm) return { x: 0, y: 0 };
        return {
            x : VghLantern__UnitConverter__MmToSvg(pointMm.x),
            y : VghLantern__UnitConverter__MmToSvg(pointMm.y)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model Space (mm) to Three.js World Space Conversion
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Millimetres to Three.js World Units (metres)
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__MmToWorld(millimetres) {
        return (Number(millimetres) || 0) / MM_PER_METRE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert Three.js World Units Back to Millimetres
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__WorldToMm(worldUnits) {
        return (Number(worldUnits) || 0) * MM_PER_METRE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert an {x, y, z} Millimetre Point to Three.js World Units
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__MmPointToWorld(pointMm) {
        if (!pointMm) return { x: 0, y: 0, z: 0 };
        return {
            x : VghLantern__UnitConverter__MmToWorld(pointMm.x),
            y : VghLantern__UnitConverter__MmToWorld(pointMm.y),
            z : VghLantern__UnitConverter__MmToWorld(pointMm.z)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Imperial Conversion and Display Formatting
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Millimetres to Inches
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__MmToInches(millimetres) {
        return (Number(millimetres) || 0) / MM_PER_INCH;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert Inches to Millimetres
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__InchesToMm(inches) {
        return (Number(inches) || 0) * MM_PER_INCH;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Millimetre Value for Dimension Text Display
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__FormatMmLabel(millimetres) {
        return String(VghLantern__UnitConverter__RoundMmWhole(millimetres));
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Millimetre Value as Linear Metres for Takeoff Tables
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__FormatLinearMetres(millimetres) {
        var metres  =  (Number(millimetres) || 0) / MM_PER_METRE;
        return VghLantern__UnitConverter__RoundTo(metres, 2).toFixed(2);
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Square Millimetre Area as Square Metres
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__FormatSquareMetres(squareMillimetres) {
        var squareMetres  =  (Number(squareMillimetres) || 0) / (MM_PER_METRE * MM_PER_METRE);
        return VghLantern__UnitConverter__RoundTo(squareMetres, 2).toFixed(2);
    }
    // ------------------------------------------------------------


    // FUNCTION | Parse a User-Typed Dimension String into Millimetres
    // ------------------------------------------------------------
    // Accepts bare numbers (treated as mm), or values suffixed mm / cm / m / in / ".
    // Returns null when the input cannot be interpreted, so callers can reject it.
    function VghLantern__UnitConverter__ParseDimensionInput(rawInput) {
        if (rawInput === null || rawInput === undefined) return null;

        var text  =  String(rawInput).trim().toLowerCase().replace(/,/g, '');
        if (!text) return null;

        var match  =  text.match(/^(-?\d*\.?\d+)\s*(mm|cm|m|in|")?$/);
        if (!match) return null;

        var value  =  parseFloat(match[1]);
        if (!isFinite(value)) return null;

        var unit  =  match[2] || 'mm';
        if (unit === 'mm') return VghLantern__UnitConverter__RoundMm(value);
        if (unit === 'cm') return VghLantern__UnitConverter__RoundMm(value * 10);
        if (unit === 'm')  return VghLantern__UnitConverter__RoundMm(value * MM_PER_METRE);
        return VghLantern__UnitConverter__RoundMm(VghLantern__UnitConverter__InchesToMm(value)); // <-- in and "
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert Degrees to Radians
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__DegreesToRadians(degrees) {
        return (Number(degrees) || 0) * Math.PI / 180;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert Radians to Degrees
    // ------------------------------------------------------------
    function VghLantern__UnitConverter__RadiansToDegrees(radians) {
        return (Number(radians) || 0) * 180 / Math.PI;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UnitConverter__MmPerMetre           : MM_PER_METRE,
        VghLantern__UnitConverter__MmPerInch            : MM_PER_INCH,
        VghLantern__UnitConverter__SvgUnitsPerMm        : SVG_UNITS_PER_MM,

        VghLantern__UnitConverter__RoundMm              : VghLantern__UnitConverter__RoundMm,
        VghLantern__UnitConverter__RoundMmWhole         : VghLantern__UnitConverter__RoundMmWhole,
        VghLantern__UnitConverter__RoundTo              : VghLantern__UnitConverter__RoundTo,

        VghLantern__UnitConverter__MmToSvg              : VghLantern__UnitConverter__MmToSvg,
        VghLantern__UnitConverter__SvgToMm              : VghLantern__UnitConverter__SvgToMm,
        VghLantern__UnitConverter__MmPointToSvg         : VghLantern__UnitConverter__MmPointToSvg,

        VghLantern__UnitConverter__MmToWorld            : VghLantern__UnitConverter__MmToWorld,
        VghLantern__UnitConverter__WorldToMm            : VghLantern__UnitConverter__WorldToMm,
        VghLantern__UnitConverter__MmPointToWorld       : VghLantern__UnitConverter__MmPointToWorld,

        VghLantern__UnitConverter__MmToInches           : VghLantern__UnitConverter__MmToInches,
        VghLantern__UnitConverter__InchesToMm           : VghLantern__UnitConverter__InchesToMm,

        VghLantern__UnitConverter__FormatMmLabel        : VghLantern__UnitConverter__FormatMmLabel,
        VghLantern__UnitConverter__FormatLinearMetres   : VghLantern__UnitConverter__FormatLinearMetres,
        VghLantern__UnitConverter__FormatSquareMetres   : VghLantern__UnitConverter__FormatSquareMetres,
        VghLantern__UnitConverter__ParseDimensionInput  : VghLantern__UnitConverter__ParseDimensionInput,

        VghLantern__UnitConverter__DegreesToRadians     : VghLantern__UnitConverter__DegreesToRadians,
        VghLantern__UnitConverter__RadiansToDegrees     : VghLantern__UnitConverter__RadiansToDegrees
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppUtils__UnitConverter  =  VghLantern__AppUtils__UnitConverter;
