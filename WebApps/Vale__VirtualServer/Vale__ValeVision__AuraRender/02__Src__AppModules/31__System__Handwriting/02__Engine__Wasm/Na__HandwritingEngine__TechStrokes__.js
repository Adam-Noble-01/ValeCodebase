// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - TECHNICAL STROKES (NUMBERS AND SYMBOLS)
// =============================================================================
//
// FILE       : Na__HandwritingEngine__TechStrokes__.js
// NAMESPACE  : Na__TechStrokes
// MODULE     : Handwriting Engine - Technical Strokes
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write numbers, units and drawing symbols with explicit pen
//              strokes, so a dimension is always exactly what was typed
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE STUDIO'S OWN STROKES (engine.py's TECH table, Vale Handwriting Studio
//   revision 2026-10-02.2): "deliberately explicit strokes for technical
//   symbols and protected numerals ... original prototype geometry, not a
//   handwriting font or learned model". Each glyph is drawn in a box ten units
//   high (0 at the top, 10 on the baseline); Na__TechStrokes__Write scales it
//   to the model's units (a letter's height is 1).
// - Symbols the model never learned (the equals, plus-or-minus, multiplication
//   and minus signs, degrees, diameter, ampersand, squared, cubed, en and em
//   rules) always come from here; numbers and their units (2400 mm, 1.2 m) do
//   too while the layout protects numbers, which AURA always does.
// - ONE CHANGE FROM THE STUDIO: its m had three arches, so "2400 mm" read as
//   "2400 mmm"; here it has two, and the usual advance.
// - Pure data and arithmetic: runs in the engine's worker and in Node.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's engine.py (AURA 0.2.1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | The Strokes
// -----------------------------------------------------------------------------

    const Na__TechStrokes__GLYPHS = {
        ' ' : [],
        'm' : [[[0, 10], [0, 4], [1, 4], [2, 5], [3, 10]], [[2, 5], [4, 4], [5, 5], [6, 10]]],   // <-- Two arches (the studio's had three: "mm" read "mmm")
        'c' : [[[6, 5], [4, 4], [1, 5], [0, 8], [2, 10], [5, 10], [6, 9]]],
        'f' : [[[5, 0], [3, 0], [2, 2], [2, 11]], [[0, 4], [5, 4]]],
        't' : [[[3, 1], [3, 9], [4, 10], [6, 9]], [[0, 4], [6, 4]]],
        'i' : [[[2, 4], [2, 10]], [[2, 1], [2.1, 1]]],
        'n' : [[[0, 10], [0, 4], [1, 4], [1, 6], [3, 4], [5, 4], [6, 6], [6, 10]]],
        'x' : [[[0, 4], [6, 10]], [[6, 4], [0, 10]]],
        'X' : [[[0, 0], [6, 10]], [[6, 0], [0, 10]]],
        '0' : [[[3, 0], [1, 1], [0, 4], [0, 8], [1, 10], [3, 10], [5, 8], [6, 3], [5, 1], [3, 0]]],
        '1' : [[[1, 2], [3, 0], [3, 10]], [[1, 10], [5, 10]]],
        '2' : [[[0, 2], [1, 0], [4, 0], [6, 2], [5, 4], [0, 10], [6, 10]]],
        '3' : [[[0, 1], [3, 0], [5, 1], [5, 3], [3, 5], [5, 6], [6, 8], [4, 10], [1, 10], [0, 9]]],
        '4' : [[[5, 10], [5, 0], [0, 7], [7, 7]]],
        '5' : [[[6, 0], [1, 0], [0, 5], [3, 4], [5, 5], [6, 8], [4, 10], [1, 10], [0, 9]]],
        '6' : [[[5, 0], [2, 1], [0, 5], [0, 8], [2, 10], [4, 10], [6, 8], [5, 6], [3, 5], [0, 6]]],
        '7' : [[[0, 0], [6, 0], [2, 10]]],
        '8' : [[[3, 0], [0, 2], [1, 4], [5, 6], [6, 8], [4, 10], [1, 10], [0, 8], [1, 6], [5, 3], [5, 1], [3, 0]]],
        '9' : [[[6, 5], [3, 6], [0, 4], [0, 2], [2, 0], [5, 0], [6, 3], [5, 8], [3, 10], [1, 10]]],
        '.' : [[[2, 10], [2.1, 10]]],
        ',' : [[[2, 10], [1, 12]]],
        '+' : [[[0, 5], [6, 5]], [[3, 2], [3, 8]]],
        '-' : [[[0, 5], [6, 5]]],
        '−' : [[[0, 5], [6, 5]]],                                          // <-- The minus sign
        '=' : [[[0, 4], [6, 4]], [[0, 7], [6, 7]]],
        '±' : [[[0, 4], [6, 4]], [[3, 1], [3, 7]], [[0, 10], [6, 10]]],    // <-- Plus or minus
        '×' : [[[0, 2], [6, 8]], [[6, 2], [0, 8]]],                        // <-- Multiplication sign
        '°' : [[[2, 0], [0, 1], [0, 3], [2, 4], [4, 3], [4, 1], [2, 0]]],  // <-- Degrees
        'Ø' : [[[3, 0], [0, 2], [0, 8], [3, 10], [6, 8], [6, 2], [3, 0]], [[0, 11], [6, -1]]],   // <-- Diameter
        '/' : [[[0, 11], [6, 0]]],
        ':' : [[[2, 3], [2.1, 3]], [[2, 8], [2.1, 8]]],
        '&' : [[[7, 10], [1, 4], [1, 1], [3, 0], [5, 1], [5, 3], [0, 7], [0, 9], [2, 10], [5, 9], [7, 5]]],
        '²' : [[[0, 1], [1, 0], [3, 0], [4, 1], [0, 5], [4, 5]]],          // <-- Squared
        '³' : [[[0, 0], [3, 0], [4, 1], [2, 2], [4, 3], [4, 4], [2, 5], [0, 5]]],   // <-- Cubed
        '–' : [[[0, 5], [7, 5]]],                                          // <-- En rule
        '—' : [[[0, 5], [9, 5]]],                                          // <-- Em rule
        '(' : [[[4, 0], [1, 3], [1, 8], [4, 11]]],
        ')' : [[[1, 0], [4, 3], [4, 8], [1, 11]]]
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing With Them
// -----------------------------------------------------------------------------

    // FUNCTION | Has This Character Got Explicit Strokes?
    // ------------------------------------------------------------
    function Na__TechStrokes__Has(ch) {
        return Object.prototype.hasOwnProperty.call(Na__TechStrokes__GLYPHS, ch);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Run of Them: { strokes: [[[x, y, pressure], ...], ...], width } in the model's units
    // ------------------------------------------------------------
    function Na__TechStrokes__Write(text) {
        const strokes = [];
        let x = 0;
        for (const ch of text) {
            for (const stroke of Na__TechStrokes__GLYPHS[ch] || []) strokes.push(stroke.map(([a, b]) => [x + a / 10, b / 10, 0.5]));
            x += '.,: '.includes(ch) ? 0.4 : 0.82;                               // <-- The studio's advances: points and spaces narrow (its wide m went with its third arch)
        }
        return { strokes, width: x };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__TechStrokes__GLYPHS,
        Na__TechStrokes__Has,
        Na__TechStrokes__Write
    };

// endregion -------------------------------------------------------------------
