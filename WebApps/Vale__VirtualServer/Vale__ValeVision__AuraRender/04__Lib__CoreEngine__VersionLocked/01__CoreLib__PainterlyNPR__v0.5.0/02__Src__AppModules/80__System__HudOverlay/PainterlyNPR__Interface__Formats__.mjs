/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - FORMATS
   =============================================================================

   FILE       : PainterlyNPR__Interface__Formats__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Formats
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : How a readout writes a number, from a format held as data in a
                config: per cent, times, millimetres, degrees, signed, words for
                the ends of a range, and the few readouts only code can write
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - FormatFrom(format, specials) turns a format from the controls' configs into
     the function a readout calls. RowFrom does the same for a point control's row,
     [key, label, min, max, step, format].
   - Every readout Experiment 01 wrote with a function is written the same way here,
     character for character: Round is Math.round of the value times Scale, Fixed is
     toFixed after Offset, and the words at the ends (Off, From) and the sided and
     stepped readouts test the value exactly as the functions did.
   - A Special format names a readout only code can write - the discipline's name at
     a looseness, an Indication point's words - which the module reading the config
     hands in: this file imports nothing, so a config can be read the moment its
     module loads.

   ---------------------------------------------------------------------------

   A FORMAT

   { "Kind": "Round",  "Scale": 100, "Prefix": "", "Suffix": "%" }     -> 42%
   { "Kind": "Fixed",  "Digits": 2, "Offset": 0, "Suffix": "×" }       -> 1.25×
   { "Kind": "Signed", "Digits": 1, "Suffix": " km" }                  -> +1.5 km
   { "Kind": "Steps",  "Steps": [[0.05, "as mixed"], [0.5, "sage"]], "Else": "olive" }
   { "Kind": "Sided",  "Zero": { "Below": 0.005, "Text": "neutral" }, "Above": {..}, "Under": {..} }
   { "Kind": "Special", "Name": "DisciplineName" }
   Any of the first three may add "Off": { "Below": 0.005, "Text": "off" } (or
   "NotAbove": 0) for the word at the bottom of its range, or "From": { "AtLeast":
   0.995, "Text": "round" } for the word at the top.

   ============================================================================= */

// =============================================================================
// REGION | Interface - Formats
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Formats From Data
// -----------------------------------------------------------------------------

    // FUNCTION | A Readout's Function, From Its Format
    // ------------------------------------------------------------
    // Throws on a format it cannot read, naming it: a control with no readout
    // would fail silently at the first drag otherwise.
    function PainterlyNPR__Interface__FormatFrom(format, specials) {
        const base  =  PainterlyNPR__Interface__FormatBase(format, specials);
        const off   =  format.Off;
        if (off && 'Below' in off) return v => v < off.Below ? off.Text : base(v);
        if (off && 'NotAbove' in off) return v => v > off.NotAbove ? base(v) : off.Text;
        if (format.From) return v => v >= format.From.AtLeast ? format.From.Text : base(v);
        return base;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Number Itself - before any words at the ends of the range
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__FormatBase(format, specials) {
        const prefix  =  format.Prefix || '';
        const suffix  =  format.Suffix || '';
        switch (format.Kind) {
            case 'Round': {
                const scale  =  format.Scale === undefined ? 1 : format.Scale;
                return v => `${prefix}${Math.round(v * scale)}${suffix}`;
            }
            case 'Fixed': {
                const offset  =  format.Offset || 0;
                return offset ? (v => `${prefix}${(offset + v).toFixed(format.Digits)}${suffix}`) : (v => `${prefix}${v.toFixed(format.Digits)}${suffix}`);
            }
            case 'Signed':
                return v => `${prefix}${v >= 0 ? '+' : ''}${v.toFixed(format.Digits)}${suffix}`;
            case 'Steps':
                return v => {
                    for (const [below, text] of format.Steps) if (v < below) return text;
                    return format.Else;
                };
            case 'Sided': {
                const above  =  PainterlyNPR__Interface__FormatBase(format.Above, specials);
                const under  =  PainterlyNPR__Interface__FormatBase(format.Under, specials);
                return v => Math.abs(v) < format.Zero.Below ? format.Zero.Text : (v > 0 ? above(v) : under(-v));
            }
            case 'Special': {
                const write  =  specials && specials[format.Name];
                if (typeof write !== 'function') throw new Error(`[PainterlyNPR Formats] No special readout ${format.Name} was handed in.`);
                return write;
            }
            default:
                throw new Error(`[PainterlyNPR Formats] Unknown readout format: ${JSON.stringify(format)}`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | A Point Control's Row, From Its Config - [key, label, min, max, step, format]
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RowFrom(row, specials) {
        return [row[0], row[1], row[2], row[3], row[4], PainterlyNPR__Interface__FormatFrom(row[5], specials)];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__FormatFrom,
        PainterlyNPR__Interface__RowFrom,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
