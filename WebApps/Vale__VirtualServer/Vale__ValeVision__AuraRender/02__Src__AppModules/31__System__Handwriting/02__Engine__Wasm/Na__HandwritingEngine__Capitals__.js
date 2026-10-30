// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - ARCHITECT'S CAPITALS
// =============================================================================
//
// FILE       : Na__HandwritingEngine__Capitals__.js
// NAMESPACE  : Na__Capitals
// MODULE     : Handwriting Engine - Capitals
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Letter words in drawn architect's capitals: single-stroke
//              capitals, figures and symbols, each drawn as a hand draws it,
//              never quite the same twice, and never misspelt
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026 (with a scan of a hand-lettered note, "EXISTING DOORS TO
//   BE REMOVED TO FORM NEW ACCESS WITH SUGGESTED SUPPORT BY OTHERS"): "the
//   writing needs to be like image 03, all caps (but can do regular) but
//   neat". The Graves model cannot letter capitals: it learned from ordinary
//   handwriting (IAM-OnDB), where a capital mostly starts a sentence, and a
//   line of them loses its place (letters repeated, N written as M, letters
//   left out; measured in AURA 0.4.9's DEVLOG entry). So capitals are drawn
//   here, as a draughtsman letters a drawing, and the model keeps the joined-up
//   hand.
// - THE LETTERS: each glyph is one or more pen strokes in a box ten units high
//   (0 at the top, 10 on the baseline), written as SVG path text (M, L and C,
//   absolute). Single-stroke forms, as an architect letters: E a stem and three
//   arms, I a single stem, O one closed curve, M's vee reaching seven tenths
//   down, W two vees.
// - THE HAND: every letter is drawn with a seeded hand's variation, the way a
//   pen never quite repeats itself. Each letter is a little taller or narrower,
//   leaning or dropping a little; each stroke's corners sit a little off true,
//   a straight stroke bows slightly, its ends carry on over a joint or stop
//   short of it, and a fine tremor runs along it. The note's hand sets how
//   much: its Variation the letters', its Neatness the strokes' (the Careful
//   hand neatest, the Quick hand liveliest).
// - SPACED BY EYE, as a letterer spaces: each side of each letter is straight,
//   round or open, and the gap between two letters is their two sides' sum, so
//   HI, OO and AV read as evenly spaced.
// - LOWER CASE IS LETTERED IN CAPITALS, accents dropped.
// - A SHARP CORNER LIFTS THE PEN: a stroke is split where it turns sharply (the
//   apex of an A, the corners of a Z), so the curve the layout draws through
//   its points keeps the corner crisp; the round caps join the two halves.
// - OUT AS THE NEURAL PEN'S: { strokes: [[[x, y, pressure], ...], ...], width },
//   a capital one unit high (0 its top, 1 the baseline), x from 0 at the first
//   letter's left.
// - Pure data and arithmetic: runs in the engine's worker, on the page and in
//   Node.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.4.9).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Capitals__REVISION    = 1;                                        // <-- Carried in every capitals request: a new number redraws every note lettered with an older one
    const Na__Capitals__HEIGHT      = 0.7;                                      // <-- A capital's height in the note's letter heights (the joined-up hand's, tallest letter to lowest), so a note keeps its size
    const Na__Capitals__SIDES       = { S: 1.3, R: 0.95, D: 0.45, P: 0.8 };     // <-- Units beside a straight, round or open (diagonal) side, or a point (room round a full stop: 12.5 not 125)
    const Na__Capitals__SPACE       = 4.2;                                      // <-- Units for a space, besides the letters' own sides
    const Na__Capitals__STEP_LINE   = 0.9;                                      // <-- Units between points along a straight stroke
    const Na__Capitals__STEP_CURVE  = 0.45;                                     // <-- ... and along a curve
    const Na__Capitals__CORNER      = 0.5;                                      // <-- A turn sharper than this (its cosine: about 60 degrees) lifts the pen
    const Na__Capitals__HAND        = {                                         // <-- The Steady hand's variation (Variation 0.3, Neatness 1.1); the other hands scale it
        Height     : 0.03,                                                      // <-- Each letter's height, a fraction (spread)
        Width      : 0.045,                                                     // <-- Each letter's width, a fraction
        Drop       : 0.16,                                                      // <-- Each letter's rise or drop, units
        Lean       : 0.028,                                                     // <-- Each letter's lean, radians
        Gap        : 0.35,                                                      // <-- Each gap between letters, units
        Corner     : 0.2,                                                       // <-- Each corner off true, units
        Overshoot  : [0.12, 0.24],                                              // <-- Each stroke end carried on [mean, spread], units: over a joint, or short of it
        Bow        : 0.015,                                                     // <-- A straight stroke's bow, a fraction of its length
        Tremor     : 0.05,                                                      // <-- The pen's fine tremor, units
        TremorStep : 2.4                                                        // <-- Units between the tremor's turns
    };

    // The letters: { w: width in units, l and r: each side straight (S), round (R),
    // open (D) or a point (P), d: one SVG path text a pen stroke }
    const Na__Capitals__O_PATH      = 'M3.5 0 C1.5 0 0 2.2 0 5 C0 7.8 1.5 10 3.5 10 C5.5 10 7 7.8 7 5 C7 2.2 5.5 0 3.5 0';
    const Na__Capitals__GLYPHS      = {
        'A' : { w: 7.0, l: 'D', r: 'D', d: ['M0 10 L3.5 0 L7 10', 'M1.4 6.4 L5.6 6.4'] },
        'B' : { w: 5.8, l: 'S', r: 'R', d: ['M0 10 L0 0', 'M0 0 L3.3 0 C4.8 0 5.4 0.9 5.4 2.3 C5.4 3.8 4.5 4.7 3.1 4.7 L0 4.7', 'M3.1 4.7 C4.9 4.7 5.8 5.7 5.8 7.3 C5.8 8.9 4.8 10 3.3 10 L0 10'] },
        'C' : { w: 6.3, l: 'R', r: 'D', d: ['M6.2 1.9 C5.5 0.7 4.5 0 3.3 0 C1.4 0 0 2.2 0 5 C0 7.8 1.4 10 3.3 10 C4.6 10 5.6 9.3 6.3 8.1'] },
        'D' : { w: 6.3, l: 'S', r: 'R', d: ['M0 0 L0 10', 'M0 0 L2.6 0 C4.9 0 6.3 2.2 6.3 5 C6.3 7.8 4.9 10 2.6 10 L0 10'] },
        'E' : { w: 5.3, l: 'S', r: 'D', d: ['M0 0 L0 10', 'M0 0 L5.2 0', 'M0 4.9 L4.3 4.9', 'M0 10 L5.4 10'] },
        'F' : { w: 5.1, l: 'S', r: 'D', d: ['M0 0 L0 10', 'M0 0 L5.1 0', 'M0 4.9 L4.2 4.9'] },
        'G' : { w: 6.5, l: 'R', r: 'R', d: ['M6.1 1.9 C5.4 0.7 4.4 0 3.3 0 C1.4 0 0 2.2 0 5 C0 7.8 1.4 10 3.3 10 C4.7 10 5.9 9.2 6.4 7.8 L6.4 5.6 L3.8 5.6'] },
        'H' : { w: 6.0, l: 'S', r: 'S', d: ['M0 0 L0 10', 'M6 0 L6 10', 'M0 4.9 L6 4.9'] },
        'I' : { w: 0.0, l: 'S', r: 'S', d: ['M0 0 L0 10'] },
        'J' : { w: 4.6, l: 'D', r: 'S', d: ['M4.6 0 L4.6 7.2 C4.6 9 3.6 10 2.3 10 C1 10 0.1 9.1 0 7.6'] },
        'K' : { w: 5.8, l: 'S', r: 'D', d: ['M0 0 L0 10', 'M5.6 0 L0.1 6.1', 'M2.1 4 L6 10'] },
        'L' : { w: 4.9, l: 'S', r: 'D', d: ['M0 0 L0 10 L4.9 10'] },
        'M' : { w: 7.6, l: 'S', r: 'S', d: ['M0 10 L0 0 L3.8 7.2 L7.6 0 L7.6 10'] },
        'N' : { w: 6.2, l: 'S', r: 'S', d: ['M0 10 L0 0 L6.2 10 L6.2 0'] },
        'O' : { w: 7.0, l: 'R', r: 'R', d: [Na__Capitals__O_PATH] },
        'P' : { w: 5.6, l: 'S', r: 'D', d: ['M0 10 L0 0', 'M0 0 L3.3 0 C4.8 0 5.6 1.1 5.6 2.6 C5.6 4.1 4.8 5.2 3.3 5.2 L0 5.2'] },
        'Q' : { w: 7.0, l: 'R', r: 'R', d: [Na__Capitals__O_PATH, 'M4.3 7.3 L7.2 10.6'] },
        'R' : { w: 5.9, l: 'S', r: 'D', d: ['M0 10 L0 0', 'M0 0 L3.4 0 C4.9 0 5.7 1.1 5.7 2.6 C5.7 4.1 4.9 5.2 3.4 5.2 L0 5.2', 'M3 5.2 L5.9 10'] },
        'S' : { w: 5.5, l: 'R', r: 'R', d: ['M5.3 1.6 C4.8 0.6 3.9 0 2.7 0 C1.3 0 0.3 0.9 0.3 2.3 C0.3 3.7 1.4 4.4 2.8 4.9 C4.3 5.4 5.5 6.2 5.5 7.6 C5.5 9.1 4.3 10 2.8 10 C1.4 10 0.4 9.3 0 8.2'] },
        'T' : { w: 6.0, l: 'D', r: 'D', d: ['M0 0 L6 0', 'M3 0 L3 10'] },
        'U' : { w: 6.0, l: 'S', r: 'S', d: ['M0 0 L0 6.9 C0 8.8 1.2 10 3 10 C4.8 10 6 8.8 6 6.9 L6 0'] },
        'V' : { w: 6.4, l: 'D', r: 'D', d: ['M0 0 L3.2 10 L6.4 0'] },
        'W' : { w: 9.2, l: 'D', r: 'D', d: ['M0 0 L2.2 10 L4.6 2.2 L7 10 L9.2 0'] },
        'X' : { w: 6.2, l: 'D', r: 'D', d: ['M0 0 L6.2 10', 'M6.2 0 L0 10'] },
        'Y' : { w: 6.2, l: 'D', r: 'D', d: ['M0 0 L3.1 5.1', 'M6.2 0 L3.1 5.1 L3.1 10'] },
        'Z' : { w: 5.9, l: 'D', r: 'D', d: ['M0 0 L5.9 0 L0 10 L6.1 10'] },
        '0' : { w: 5.4, l: 'R', r: 'R', d: ['M2.7 0 C1.1 0 0 2.2 0 5 C0 7.8 1.1 10 2.7 10 C4.3 10 5.4 7.8 5.4 5 C5.4 2.2 4.3 0 2.7 0'] },
        '1' : { w: 2.4, l: 'D', r: 'S', d: ['M0 2 L2.4 0 L2.4 10'] },
        '2' : { w: 5.4, l: 'R', r: 'D', d: ['M0.2 2.3 C0.6 0.8 1.6 0 2.8 0 C4.3 0 5.3 1 5.3 2.5 C5.3 4.3 3.9 5.6 0 10 L5.5 10'] },
        '3' : { w: 5.4, l: 'R', r: 'R', d: ['M0.2 1.3 C0.8 0.4 1.8 0 2.8 0 C4.2 0 5.2 0.9 5.2 2.3 C5.2 3.8 4.1 4.7 2.4 4.7 C4.3 4.7 5.5 5.8 5.5 7.4 C5.5 9 4.3 10 2.7 10 C1.5 10 0.5 9.5 0 8.6'] },
        '4' : { w: 5.8, l: 'D', r: 'S', d: ['M4.3 10 L4.3 0 L0 7 L5.8 7'] },
        '5' : { w: 5.4, l: 'R', r: 'R', d: ['M5.1 0 L1 0 L0.6 4.5 C1.3 4 2.1 3.7 2.9 3.7 C4.4 3.7 5.5 4.9 5.5 6.8 C5.5 8.7 4.3 10 2.7 10 C1.5 10 0.6 9.5 0 8.6'] },
        '6' : { w: 5.4, l: 'R', r: 'R', d: ['M4.7 0.6 C4.1 0.2 3.5 0 2.8 0 C1.1 0 0 2.4 0 5.6 C0 8.4 1.1 10 2.8 10 C4.4 10 5.4 8.7 5.4 7 C5.4 5.3 4.4 4.1 2.8 4.1 C1.6 4.1 0.5 4.8 0.1 6.1'] },
        '7' : { w: 5.4, l: 'D', r: 'D', d: ['M0 0 L5.4 0 C3.9 2.6 2.6 6 2 10'] },
        '8' : { w: 5.4, l: 'R', r: 'R', d: ['M2.7 4.7 C1.3 4.7 0.4 3.8 0.4 2.4 C0.4 1 1.3 0 2.7 0 C4.1 0 5 1 5 2.4 C5 3.8 4.1 4.7 2.7 4.7 C1.1 4.7 0 5.8 0 7.4 C0 9 1.1 10 2.7 10 C4.3 10 5.4 9 5.4 7.4 C5.4 5.8 4.3 4.7 2.7 4.7'] },
        '9' : { w: 5.4, l: 'R', r: 'R', d: ['M5.3 4.3 C4.9 5.4 3.9 6 2.7 6 C1.1 6 0 4.8 0 3 C0 1.2 1.1 0 2.7 0 C4.4 0 5.4 1.5 5.4 4.2 C5.4 7.8 4.2 10 2.3 10 C1.5 10 0.8 9.7 0.3 9.2'] },
        '.' : { w: 0.3, l: 'P', r: 'P', d: ['M0 9.75 L0.3 9.95'] },
        ',' : { w: 0.9, l: 'P', r: 'P', d: ['M0.8 9.4 L0.85 9.9 L0.1 11.6'] },
        ':' : { w: 0.3, l: 'P', r: 'P', d: ['M0 3.4 L0.3 3.6', 'M0 9.75 L0.3 9.95'] },
        ';' : { w: 0.9, l: 'P', r: 'P', d: ['M0.5 3.4 L0.8 3.6', 'M0.8 9.4 L0.85 9.9 L0.1 11.6'] },
        '-' : { w: 3.4, l: 'P', r: 'P', d: ['M0 5.4 L3.4 5.4'] },
        '−' : { w: 4.4, l: 'P', r: 'P', d: ['M0 5.2 L4.4 5.2'] },                                          // <-- The minus sign
        '–' : { w: 5.0, l: 'P', r: 'P', d: ['M0 5.4 L5 5.4'] },                                            // <-- En rule
        '—' : { w: 8.0, l: 'P', r: 'P', d: ['M0 5.4 L8 5.4'] },                                            // <-- Em rule
        '/' : { w: 4.2, l: 'D', r: 'D', d: ['M0 10.6 L4.2 -0.6'] },
        '(' : { w: 2.0, l: 'R', r: 'P', d: ['M2 -0.6 C0.7 1.5 0 3.3 0 5 C0 6.7 0.7 8.5 2 10.6'] },
        ')' : { w: 2.0, l: 'P', r: 'R', d: ['M0 -0.6 C1.3 1.5 2 3.3 2 5 C2 6.7 1.3 8.5 0 10.6'] },
        '[' : { w: 1.8, l: 'S', r: 'P', d: ['M1.8 -0.6 L0 -0.6 L0 10.6 L1.8 10.6'] },
        ']' : { w: 1.8, l: 'P', r: 'S', d: ['M0 -0.6 L1.8 -0.6 L1.8 10.6 L0 10.6'] },
        "'" : { w: 0.4, l: 'P', r: 'P', d: ['M0.4 0 L0.1 2.6'] },
        '"' : { w: 1.8, l: 'P', r: 'P', d: ['M0.4 0 L0.1 2.6', 'M1.8 0 L1.5 2.6'] },
        '?' : { w: 5.0, l: 'R', r: 'D', d: ['M0.2 2.1 C0.6 0.8 1.6 0 2.8 0 C4.1 0 5 0.9 5 2.2 C5 3.5 4.1 4.2 3.2 4.9 C2.6 5.4 2.4 6 2.4 7.1', 'M2.3 9.75 L2.6 9.95'] },
        '!' : { w: 0.4, l: 'S', r: 'S', d: ['M0.2 0 L0.2 7.1', 'M0.1 9.75 L0.4 9.95'] },
        '+' : { w: 5.0, l: 'P', r: 'P', d: ['M0 5.2 L5 5.2', 'M2.5 2.7 L2.5 7.7'] },
        '=' : { w: 5.0, l: 'P', r: 'P', d: ['M0 3.9 L5 3.9', 'M0 6.6 L5 6.6'] },
        '×' : { w: 4.4, l: 'P', r: 'P', d: ['M0 3 L4.4 7.4', 'M4.4 3 L0 7.4'] },                         // <-- Multiplication sign
        '±' : { w: 5.0, l: 'P', r: 'P', d: ['M0 4 L5 4', 'M2.5 1.6 L2.5 6.4', 'M0 9 L5 9'] },              // <-- Plus or minus
        '°' : { w: 2.2, l: 'P', r: 'P', d: ['M1.1 0 C0.5 0 0 0.6 0 1.3 C0 2 0.5 2.6 1.1 2.6 C1.7 2.6 2.2 2 2.2 1.3 C2.2 0.6 1.7 0 1.1 0'] },   // <-- Degrees
        'Ø' : { w: 7.0, l: 'R', r: 'R', d: [Na__Capitals__O_PATH, 'M-0.2 10.5 L7.2 -0.5'] },              // <-- Diameter
        '²' : { w: 2.8, l: 'P', r: 'P', d: ['M0.1 1.2 C0.3 0.4 0.8 0 1.4 0 C2.2 0 2.7 0.5 2.7 1.3 C2.7 2.2 2 2.9 0 5 L2.8 5'] },   // <-- Squared
        '³' : { w: 2.8, l: 'P', r: 'P', d: ['M0.1 0.7 C0.4 0.2 0.9 0 1.4 0 C2.1 0 2.6 0.45 2.6 1.15 C2.6 1.9 2.1 2.35 1.2 2.35 C2.2 2.35 2.8 2.9 2.8 3.7 C2.8 4.5 2.2 5 1.35 5 C0.75 5 0.25 4.75 0 4.3'] },   // <-- Cubed
        '&' : { w: 6.2, l: 'R', r: 'D', d: ['M6.2 10 L1.6 4.1 C1 3.3 0.8 2.7 0.8 2 C0.8 0.9 1.6 0 2.7 0 C3.9 0 4.6 0.8 4.6 1.9 C4.6 3.1 3.6 4 1.1 5.7 C0.4 6.2 0 6.9 0 7.8 C0 9.1 1.1 10 2.6 10 C4.4 10 5.6 8.7 6.3 6.6'] },
        '#' : { w: 5.4, l: 'P', r: 'P', d: ['M1.8 1.2 L1.2 8.8', 'M4.3 1.2 L3.7 8.8', 'M0.2 3.6 L5.4 3.6', 'M0 6.4 L5.2 6.4'] },
        '%' : { w: 6.0, l: 'P', r: 'P', d: ['M5.6 0.3 L0.4 9.9', 'M1.3 0 C0.6 0 0.1 0.7 0.1 1.6 C0.1 2.5 0.6 3.2 1.3 3.2 C2 3.2 2.5 2.5 2.5 1.6 C2.5 0.7 2 0 1.3 0', 'M4.7 6.8 C4 6.8 3.5 7.5 3.5 8.4 C3.5 9.3 4 10 4.7 10 C5.4 10 5.9 9.3 5.9 8.4 C5.9 7.5 5.4 6.8 4.7 6.8'] },
        '*' : { w: 3.6, l: 'P', r: 'P', d: ['M1.8 0 L1.8 3.6', 'M0 1 L3.6 2.6', 'M3.6 1 L0 2.6'] },
        '<' : { w: 4.0, l: 'P', r: 'P', d: ['M4 2.6 L0 5.2 L4 7.8'] },
        '>' : { w: 4.0, l: 'P', r: 'P', d: ['M0 2.6 L4 5.2 L0 7.8'] },
        '_' : { w: 5.0, l: 'P', r: 'P', d: ['M0 10.8 L5 10.8'] },
        '@' : { w: 7.2, l: 'R', r: 'R', d: ['M4.9 3.4 C4.5 2.8 4 2.6 3.4 2.6 C2.5 2.6 1.9 3.5 1.9 4.6 C1.9 5.6 2.4 6.2 3.2 6.2 C4.2 6.2 4.8 5.2 5 3.2 L4.6 6.1 C4.7 6.6 5.1 6.9 5.6 6.9 C6.6 6.9 7.2 5.8 7.2 4.4 C7.2 1.9 5.4 0.2 3.6 0.2 C1.5 0.2 0 2.1 0 4.7 C0 7.4 1.7 9.4 3.8 9.4 C4.9 9.4 5.8 9 6.6 8.3'] }
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Letters' Geometry
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Stroke's Path Text as Segments: [{ kind: 'L' | 'C', a, c1, c2, b }] (points as [x, y], units)
    // ------------------------------------------------------------
    function Na__Capitals__Segments(d) {
        const t = d.match(/[MLC]|-?\d*\.?\d+/g) || [];
        const segments = [];
        let i = 0, cmd = '', at = [0, 0];
        const point = () => { const p = [Number(t[i]), Number(t[i + 1])]; i += 2; return p; };
        while (i < t.length) {
            if (/[MLC]/.test(t[i])) cmd = t[i++];
            if (cmd === 'M') { at = point(); cmd = 'L'; continue; }
            if (cmd === 'L') { const b = point(); segments.push({ kind: 'L', a: at, b }); at = b; }
            else if (cmd === 'C') { const c1 = point(), c2 = point(), b = point(); segments.push({ kind: 'C', a: at, c1, c2, b }); at = b; }
            else break;
        }
        return segments;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Unit Vector (0, 0 for none)
    // ------------------------------------------------------------
    function Na__Capitals__Unit(dx, dy) {
        const n = Math.hypot(dx, dy);
        return n > 1e-9 ? [dx / n, dy / n] : [0, 0];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Segment's Direction Where It Starts and Where It Ends
    // ------------------------------------------------------------
    function Na__Capitals__StartDirection(s) {
        if (s.kind === 'L') return Na__Capitals__Unit(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const c = Math.hypot(s.c1[0] - s.a[0], s.c1[1] - s.a[1]) > 1e-6 ? s.c1 : s.c2;
        return Na__Capitals__Unit(c[0] - s.a[0], c[1] - s.a[1]);
    }

    function Na__Capitals__EndDirection(s) {
        if (s.kind === 'L') return Na__Capitals__Unit(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const c = Math.hypot(s.b[0] - s.c2[0], s.b[1] - s.c2[1]) > 1e-6 ? s.c2 : s.c1;
        return Na__Capitals__Unit(s.b[0] - c[0], s.b[1] - c[1]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Point on a Cubic Bezier
    // ------------------------------------------------------------
    function Na__Capitals__Bezier(s, t) {
        const u = 1 - t;
        return [
            u * u * u * s.a[0] + 3 * u * u * t * s.c1[0] + 3 * u * t * t * s.c2[0] + t * t * t * s.b[0],
            u * u * u * s.a[1] + 3 * u * u * t * s.c1[1] + 3 * u * t * t * s.c2[1] + t * t * t * s.b[1]
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Hand
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Seeded Normal Draw (mulberry32, Box-Muller): normal(mean, spread)
    // ------------------------------------------------------------
    function Na__Capitals__Normals(seed) {
        let s = seed >>> 0;
        const next = () => {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return (mean, spread) => mean + spread * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw One Stroke as a Hand Draws It: its polylines in units (split where it turns sharply)
    // ------------------------------------------------------------
    // shake scales the stroke's own variation: its corners off true, its ends
    // carried on or short, a straight run's bow and the tremor along it.
    // ------------------------------------------------------------
    function Na__Capitals__Stroke(d, normal, shake) {
        const H = Na__Capitals__HAND;
        const segments = Na__Capitals__Segments(d).map((s) => Object.assign({}, s, {
            a: s.a.slice(), b: s.b.slice(), c1: s.c1 ? s.c1.slice() : null, c2: s.c2 ? s.c2.slice() : null
        }));
        if (!segments.length) return [];

        // Each corner a little off true; a curve's handles move with their own end, so a smooth joint stays smooth
        const offsets = [];
        for (let i = 0; i <= segments.length; i++) offsets.push([normal(0, H.Corner * shake), normal(0, H.Corner * shake)]);
        segments.forEach((s, i) => {
            const o = offsets[i], p = offsets[i + 1];
            s.a[0] += o[0]; s.a[1] += o[1];
            s.b[0] += p[0]; s.b[1] += p[1];
            if (s.kind === 'C') { s.c1[0] += o[0]; s.c1[1] += o[1]; s.c2[0] += p[0]; s.c2[1] += p[1]; }
        });

        // The pen carries on past where it meant to start and stop (or stops short), along its own direction
        const first = segments[0], last = segments[segments.length - 1];
        const lead = normal(H.Overshoot[0], H.Overshoot[1]) * shake, tail = normal(H.Overshoot[0], H.Overshoot[1]) * shake;
        const ds = Na__Capitals__StartDirection(first), de = Na__Capitals__EndDirection(last);
        first.a[0] -= ds[0] * lead; first.a[1] -= ds[1] * lead;
        if (first.kind === 'C') { first.c1[0] -= ds[0] * lead; first.c1[1] -= ds[1] * lead; }
        last.b[0] += de[0] * tail; last.b[1] += de[1] * tail;
        if (last.kind === 'C') { last.c2[0] += de[0] * tail; last.c2[1] += de[1] * tail; }

        // Points along it: a straight run bowed a little; a sharp turn ends one polyline and starts the next
        const runs = [];
        let run = [first.a.slice()];
        segments.forEach((s, i) => {
            if (i > 0) {
                const din = Na__Capitals__EndDirection(segments[i - 1]), dout = Na__Capitals__StartDirection(s);
                if (din[0] * dout[0] + din[1] * dout[1] < Na__Capitals__CORNER) { runs.push(run); run = [s.a.slice()]; }
            }
            if (s.kind === 'L') {
                const length = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
                const n = Math.max(1, Math.ceil(length / Na__Capitals__STEP_LINE));
                const bow = normal(0, H.Bow * shake) * length;
                const across = Na__Capitals__Unit(-(s.b[1] - s.a[1]), s.b[0] - s.a[0]);
                for (let k = 1; k <= n; k++) {
                    const t = k / n, lift = bow * Math.sin(Math.PI * t);
                    run.push([s.a[0] + (s.b[0] - s.a[0]) * t + across[0] * lift, s.a[1] + (s.b[1] - s.a[1]) * t + across[1] * lift]);
                }
            } else {
                let length = 0, prev = s.a;
                for (let k = 1; k <= 8; k++) { const q = Na__Capitals__Bezier(s, k / 8); length += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
                const n = Math.max(2, Math.ceil(length / Na__Capitals__STEP_CURVE));
                for (let k = 1; k <= n; k++) run.push(Na__Capitals__Bezier(s, k / n));
            }
        });
        runs.push(run);

        // The tremor: a slow wander across the stroke, the same pen for its whole length
        return runs.map((points) => {
            let travelled = 0;
            const along = points.map((p, k) => (k ? (travelled += Math.hypot(p[0] - points[k - 1][0], p[1] - points[k - 1][1])) : 0));
            const turns = [];
            for (let k = 0; k <= Math.ceil(travelled / H.TremorStep) + 1; k++) turns.push(normal(0, H.Tremor * shake));
            return points.map((p, k) => {
                const at = along[k] / H.TremorStep, j = Math.floor(at), f = (1 - Math.cos(Math.PI * (at - j))) / 2;
                const wander = turns[j] * (1 - f) + turns[j + 1] * f;
                const before = points[Math.max(0, k - 1)], after = points[Math.min(points.length - 1, k + 1)];
                const across = Na__Capitals__Unit(-(after[1] - before[1]), after[0] - before[0]);
                return [p[0] + across[0] * wander, p[1] + across[1] * wander];
            });
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lettering
// -----------------------------------------------------------------------------

    // FUNCTION | The Words as Capitals Letter Them: upper case, accents dropped
    // ------------------------------------------------------------
    function Na__Capitals__Upper(text) {
        return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    }
    // ------------------------------------------------------------


    // FUNCTION | Can This Character Be Lettered? (in capitals; a space always)
    // ------------------------------------------------------------
    function Na__Capitals__Has(ch) {
        return [...Na__Capitals__Upper(ch)].every((c) => c === ' ' || Object.prototype.hasOwnProperty.call(Na__Capitals__GLYPHS, c));
    }
    // ------------------------------------------------------------


    // FUNCTION | Letter Some Words: { strokes: [[[x, y, pressure], ...], ...], width }, a capital 1 high
    // ------------------------------------------------------------
    // seed: this run's own (the layout's seed for the word). style: the note's
    // writing style; its Variation and Neatness set the hand (the Steady hand,
    // 0.3 and 1.1, draws Na__Capitals__HAND as it stands). Characters with no
    // letter are left out (the layout refuses them first).
    // ------------------------------------------------------------
    function Na__Capitals__Write(text, seed, style) {
        const H = Na__Capitals__HAND, G = Na__Capitals__GLYPHS, SIDES = Na__Capitals__SIDES;
        const s = style || {};
        const vary = Math.max(0, Math.min(3.5, (Number.isFinite(s.Variation) ? s.Variation : 0.3) / 0.3));
        const shake = Math.max(0.3, Math.min(4, 1.1 / Math.max(0.05, Number.isFinite(s.Neatness) ? s.Neatness : 1.1)));
        const normal = Na__Capitals__Normals(seed);
        const strokes = [];
        let pen = 0, previous = null, started = false;

        for (const ch of Na__Capitals__Upper(text)) {
            if (ch === ' ') {
                if (started) pen += (previous ? SIDES[previous.r] : 0) + Na__Capitals__SPACE + normal(0, H.Gap * vary);
                previous = null;
                continue;
            }
            const glyph = Object.prototype.hasOwnProperty.call(G, ch) ? G[ch] : null;
            if (!glyph) continue;
            if (started) pen += (previous ? SIDES[previous.r] : 0) + SIDES[glyph.l] + normal(0, H.Gap * vary);

            // This letter's own hand: a little taller or narrower, leaning or dropping a little
            const tall = 1 + normal(0, H.Height * vary), wide = 1 + normal(0, H.Width * vary);
            const lean = normal(0, H.Lean * vary), drop = normal(0, H.Drop * vary);
            const cos = Math.cos(lean), sin = Math.sin(lean), middle = glyph.w / 2;
            const left = pen;
            glyph.d.forEach((d) => {
                Na__Capitals__Stroke(d, normal, shake).forEach((points) => {
                    strokes.push(points.map(([x, y]) => {
                        const rx = (x - middle) * wide, ry = (y - 10) * tall;         // <-- About the letter's foot, the baseline at 0
                        return [(left + middle * wide + rx * cos - ry * sin) / 10, (10 + drop + rx * sin + ry * cos) / 10, 0.5];
                    }));
                });
            });
            pen += glyph.w * wide;
            previous = glyph;
            started = true;
        }
        return { strokes, width: Math.max(pen, 0.3) / 10 };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Capitals__REVISION,
        Na__Capitals__HEIGHT,
        Na__Capitals__GLYPHS,
        Na__Capitals__Upper,
        Na__Capitals__Has,
        Na__Capitals__Write
    };

// endregion -------------------------------------------------------------------
