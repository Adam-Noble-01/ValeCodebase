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
   - Every readout FormatFrom returns carries .Parse (ParseFrom): the format run
     backwards, so a value can be typed as its readout shows it (v0.5.2).
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
        const write  =  PainterlyNPR__Interface__FormatWrite(format, specials);
        const out    =  v => write(v);                                      // <-- Its own function: a Special's writer is shared, so never carries Parse itself
        out.Parse    =  PainterlyNPR__Interface__ParseFrom(format);          // <-- A typed readout back to a value (v0.5.2)
        return out;
    }

    function PainterlyNPR__Interface__FormatWrite(format, specials) {
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


    // FUNCTION | A Typed Readout Back to a Value - the format run backwards
    // ------------------------------------------------------------
    // Type what the readout shows: "60%" or "60" is 0.6 on a per-cent slider,
    // "1.2" is 1.2 on a times slider, a readout's own words ("off", "sage",
    // "simplify 0.3") pick their place. NaN when nothing in the text can be
    // read: the caller keeps the value it had. The range input it is handed to
    // clamps and snaps it to its own min, max and step.
    function PainterlyNPR__Interface__ParseFrom(format) {
        const base  =  PainterlyNPR__Interface__ParseBase(format);
        const off   =  format.Off;
        const from  =  format.From;
        return (text) => {
            const t  =  PainterlyNPR__Interface__ParseClean(text);
            if (!t) return NaN;
            if (off && t === PainterlyNPR__Interface__ParseClean(off.Text)) return 'Below' in off ? 0 : off.NotAbove;
            if (from && t === PainterlyNPR__Interface__ParseClean(from.Text)) return from.AtLeast;
            return base(t);
        };
    }

    function PainterlyNPR__Interface__ParseBase(format) {
        const number  =  t => { const m = t.match(/[-+]?(?:\d+\.?\d*|\.\d+)/); return m ? parseFloat(m[0]) : NaN; };
        switch (format.Kind) {
            case 'Round': {
                const scale  =  format.Scale === undefined ? 1 : format.Scale;
                return t => number(t) / scale;
            }
            case 'Fixed':
                return t => number(t) - (format.Offset || 0);
            case 'Steps':
                return t => {
                    const steps  =  format.Steps;
                    for (let i = 0; i < steps.length; i++) if (t === PainterlyNPR__Interface__ParseClean(steps[i][1])) return i ? steps[i - 1][0] : 0;   // <-- The foot of its band
                    if (t === PainterlyNPR__Interface__ParseClean(format.Else)) return steps[steps.length - 1][0];
                    return number(t);
                };
            case 'Sided': {
                const above  =  PainterlyNPR__Interface__ParseBase(format.Above);
                const under  =  PainterlyNPR__Interface__ParseBase(format.Under);
                const words  =  PainterlyNPR__Interface__ParseClean(`${format.Under.Prefix || ''} ${format.Under.Suffix || ''}`).replace(/[^a-z ]/g, '').trim();
                return t => {
                    if (t === PainterlyNPR__Interface__ParseClean(format.Zero.Text)) return 0;
                    const n  =  number(t);
                    if (n < 0) return -under(String(-n));
                    if (words && t.includes(words)) return -under(t);
                    return above(t.replace(/^\+/, ''));
                };
            }
            default:                                                         // <-- Signed, Special: the value itself
                return t => number(t);
        }
    }

    function PainterlyNPR__Interface__ParseClean(text) {
        return String(text == null ? '' : text).toLowerCase().replace(/−/g, '-').replace(/,/g, '.').replace(/\s+/g, ' ').trim();
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
        PainterlyNPR__Interface__ParseFrom,
        PainterlyNPR__Interface__RowFrom,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
