// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - THE NOTE (LINES, WORDS AND STROKES)
// =============================================================================
//
// FILE       : Na__HandwritingEngine__Layout__.js
// NAMESPACE  : Na__Layout
// MODULE     : Handwriting Engine - Layout
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Lay a note's words out as handwriting: check them, wrap them to
//              the note's width, write each phrase with the neural pen (numbers
//              and symbols with explicit strokes), and give every stroke its
//              slant, baseline and pen width, as SVG paths in millimetres
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE STUDIO'S validate AND render (engine.py, Vale Handwriting Studio
//   revision 2026-10-02.2), neural engine only (AURA has no artist library),
//   line for line: the same wrapping by words, the same split of protected
//   numbers and units (2400 mm, 1.2 m, a lone x between spaces) and symbols,
//   the same spacing, slant, baseline wave and Catmull-Rom curves, and the
//   same warnings.
// - EVERY NUMBER IS A SETTING (1.1.0): the note's writing style
//   (request.style, Na__Layout__STYLE's keys) sets the model's neatness and
//   its retries, the line spacing, phrase lengths and wrapping, the word and
//   space gaps, the margin, the slant, the baseline wave, the tilt taken out
//   and the pen. Each has hard limits here and the studio's value as its
//   default, so a request without a style writes as the studio did.
// - THE PEN IS A TECHNICAL PEN by default (1.1.0): every stroke one width, as
//   a STAEDTLER Mars matic draws (PainterlyNPR's pen guidance: "pressure-
//   variable ... width is an explicitly labelled non-technical mode"). The
//   studio's swing of each stroke's weight is PenMode 'Variable'. With
//   request.widths 'nib' each path's w is relative to the nib (1 is the nib),
//   so the sheet applies the note's real pen and a new nib needs no rewrite;
//   without it, w is millimetres (request.pen), as in 1.0.0.
// - WHAT DIFFERS FROM THE STUDIO: the random draws are seeded streams of
//   AURA's own (a hash of the note's seed, the phrase and its place for each
//   phrase, as the studio did with SHA-256; mulberry32 for the slants), so a
//   seed writes a different copy than the studio's Python did. Notes may be
//   20 mm wide (AURA's panel allows it; the studio started at 25). Paths are
//   written to 0.01 mm, every segment relative to the last rounded point
//   (exact: no drift), about half the size of the studio's in the drawing set.
// - TWO KINDS OF LETTERS (1.3.0, AURA 0.4.9): style.Letters 'Capitals' letters
//   the note in drawn architect's capitals (Na__HandwritingEngine__Capitals__),
//   word by word, wrapped by each word's true width, with no model at all, so
//   it also runs on the page; 'Joined' (a request's default, the studio's) is
//   the model's joined-up hand. In a joined-up note, a run typed all in
//   capitals (NG, LED, A) is drawn in capitals at once, a phrase the model
//   cannot write after its tries is lettered in capitals instead of failing the
//   note, and numbers and symbols stand as tall as the capitals, on the
//   baseline (Na__Neural__ 1.2.0's one letter size on every line).
// - LINE BY LINE (1.3.0): partial(ink) is told the ink so far as each line of a
//   joined-up note is written, so the sheet can show it line by line.
// - EVERY PATH KNOWS ITS LINE (1.3.0): { d, w, l } with l its line from 0, and
//   u its word in the line for capitals, so the sheet can justify whole lines
//   and words exactly.
// - Millimetres from the note's top left; y down, as the SVG.
// - Pure functions: runs in the engine's worker, on the page and in Node.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.3.0
// - Architect's capitals (style.Letters), joined-up notes that never fail as a
//   whole, line-by-line partial ink, each path's line and word, the box's
//   width measured to the ink, the proofreading warning only where the model
//   wrote (AURA 0.4.9, Adam: "the writing needs to be like image 03, all caps
//   (but can do regular) but neat").
//
// 30-Oct-2026 - Version 1.2.0
// - A lone capital the model cannot write (it never can: a revision letter,
//   the A of A1) falls back to the explicit stroke capitals (AURA 0.3.4).
//
// 30-Oct-2026 - Version 1.1.0
// - The writing style: every constant of the layout and the neural pen is a
//   setting with hard limits; a technical pen (one width) by default, the
//   studio's weight swing as PenMode 'Variable'; widths relative to the nib
//   when asked (AURA 0.3.2). "Calmer pen" in the retry warning corrected to
//   "looser": a retry lowers the neatness.
//
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's engine.py (AURA 0.2.1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__TechStrokes__GLYPHS, Na__TechStrokes__Has, Na__TechStrokes__Write } from './Na__HandwritingEngine__TechStrokes__.js';
    import { Na__Capitals__REVISION, Na__Capitals__HEIGHT, Na__Capitals__Has, Na__Capitals__Upper, Na__Capitals__Write } from './Na__HandwritingEngine__Capitals__.js';
    import { Na__Neural__REVISION } from './Na__HandwritingEngine__Neural__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Layout__MAX_CHARS      = 600;
    const Na__Layout__MAX_HEIGHT     = 500;                                     // <-- mm: the tallest note the studio would write
    const Na__Layout__RANGES         = {                                        // <-- [low, high, default]: refused outside these, in the studio's words
        size      : [2, 12, 4.5],
        width     : [20, 350, 135],                                             // <-- The studio started at 25; AURA's panel allows 20
        pen       : [0.05, 1.2, 0.3],                                           // <-- mm, only when widths are not relative to the nib
        seed      : [0, 2147483647, 42]
    };
    const Na__Layout__STYLE          = {                                        // <-- The writing style: [low, high, the studio's value]; clamped, never refused
        Neatness      : [0.05, 3, 1.1],                                         // <-- The model's bias: higher is neater and more predictable
        Variation     : [0, 1, 0.3],                                            // <-- Scales the slant, the baseline wave and a variable pen's swing
        LineSpacing   : [1.05, 3, 1.35],                                        // <-- Letter heights from one line to the next
        Tries         : [1, 8, 4],
        RetryNeatness : [0.3, 1, 0.78],
        MinNeatness   : [0.01, 2, 0.2],
        LetterCheck   : [0, 10, 2],
        StepsPerChar  : [20, 400, 110],
        MinSteps      : [100, 6500, 1200],
        MaxSteps      : [100, 6500, 6500],
        Tilt          : [0, 1, 0.18],
        PhraseMax     : [4, 120, 42],                                           // <-- Characters written in one go, at most ...
        PhraseMin     : [1, 40, 6],                                             // <-- ... and at least
        Wrap          : [0.5, 4, 1.8],                                          // <-- Characters to a letter height across the note, for the first wrap
        WordGap       : [0, 2, 0.45],                                           // <-- Letter heights for a space: between words in capitals, between runs in a joined-up note
        SpaceWidth    : [0, 2, 0.55],                                           // <-- Letter heights for each further space where several are typed together
        LeadSpace     : [0, 2, 0],                                              // <-- Extra letter heights before words that follow a number (the studio's 0.4 doubled the space: 0 since 1.3.0)
        MarginMm      : [0, 10, 1.5],                                           // <-- mm round the words
        Slant         : [0, 0.3, 0.026],                                        // <-- The spread of each phrase's slant (x variation)
        Wave          : [0, 0.3, 0.022],                                        // <-- The baseline wave's height in letter heights (x variation)
        WaveFrequency : [0, 4, 0.6],                                            // <-- How fast the wave rises and falls along a line
        WeightSwing   : [0, 1, 0.1]                                             // <-- A variable pen's stroke-to-stroke weight swing (x variation)
    };
    const Na__Layout__INTEGERS       = ['Tries', 'LetterCheck', 'StepsPerChar', 'MinSteps', 'MaxSteps', 'PhraseMax', 'PhraseMin'];
    const Na__Layout__PEN_MODES      = ['Technical', 'Variable'];               // <-- Technical: one width (the default); Variable: the studio's swing
    const Na__Layout__LETTERS        = ['Capitals', 'Joined'];                  // <-- Drawn architect's capitals, or the model's joined-up hand (a request's default)
    const Na__Layout__REVISION       = { Capitals: Na__Capitals__REVISION, Joined: Na__Neural__REVISION };   // <-- The client carries its letters' number in each request: a new one writes old ink again
    const Na__Layout__JOINED_BASE    = 0.78;                                    // <-- Joined-up: the baseline, letter heights down the line (148 phrases at Na__Neural__ 1.2.0's scale)
    const Na__Layout__TOUCH          = 0.08;                                    // <-- Joined-up: letter heights between runs typed with no space between them (NG31, 9SJ)
    const Na__Layout__LABELS         = { size: 'Letter height', width: 'Note width', pen: 'Pen width', seed: 'Seed' };
    const Na__Layout__QUOTES         = { '’': "'", '‘': "'", '“': '"', '”': '"' };   // <-- Curly quotes write as straight ones
    const Na__Layout__WARN_RETRIED   = 'A stalled phrase was rewritten with a looser pen. Check the recovered lettering.';
    const Na__Layout__WARN_CAPITALS  = 'The pen could not write some words, so they were lettered in capitals.';
    const Na__Layout__WARN_SHRUNK    = 'A long phrase was made smaller to fit the note. Widen the note for larger lettering.';
    const Na__Layout__WARN_PROOF     = 'Handwriting can misform or leave out letters. Proofread the note before the drawing is issued.';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Seeds
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Phrase's Own Seed: the note's seed, the phrase and its place (FNV-1a, then murmur3's mix)
    // ------------------------------------------------------------
    function Na__Layout__SeedFor(seed, text, index) {
        const s = `${seed}:${text}:${index}`;
        let h = 0x811C9DC5;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B);
        h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35);
        h ^= h >>> 16;
        return h >>> 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Seeded Normal Draw (mulberry32, Box-Muller): normal(mean, spread)
    // ------------------------------------------------------------
    function Na__Layout__Normals(seed) {
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checking the Request
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number in Its Range, or the Studio's Words for Why Not
    // ------------------------------------------------------------
    function Na__Layout__Number(value, key) {
        const [low, high, fallback] = Na__Layout__RANGES[key];
        if (value === undefined || value === null) return fallback;
        const n = typeof value === 'boolean' ? NaN : Number(value);
        if (!Number.isFinite(n) || n < low || n > high) throw new Error(`${Na__Layout__LABELS[key]} must be between ${low} and ${high}.`);
        return n;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Writing Style: every setting in its limits, the studio's value where none is given
    // ------------------------------------------------------------
    // request.style (PascalCase, AURA 0.3.2 on), else the 0.2.1 client's
    // neatness, variation, spacing and protectNumbers.
    // ------------------------------------------------------------
    function Na__Layout__Style(payload) {
        const given = payload.style && typeof payload.style === 'object' ? payload.style : {};
        const older = { Neatness: payload.neatness, Variation: payload.variation, LineSpacing: payload.spacing };
        const style = {};
        Object.entries(Na__Layout__STYLE).forEach(([key, [low, high, fallback]]) => {
            const raw = given[key] !== undefined ? given[key] : older[key];
            const n = raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' ? NaN : Number(raw);
            style[key] = Number.isFinite(n) ? Math.min(high, Math.max(low, n)) : fallback;
        });
        Na__Layout__INTEGERS.forEach((key) => { style[key] = Math.round(style[key]); });
        style.MinSteps = Math.min(style.MinSteps, style.MaxSteps);
        style.PhraseMin = Math.min(style.PhraseMin, style.PhraseMax);
        style.PenMode = Na__Layout__PEN_MODES.includes(given.PenMode) ? given.PenMode : 'Technical';
        style.Letters = Na__Layout__LETTERS.includes(given.Letters) ? given.Letters : 'Joined';
        const protect = given.ProtectNumbers !== undefined ? given.ProtectNumbers : payload.protectNumbers;
        style.ProtectNumbers = protect !== false;
        return style;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check a Note's Request: the options the layout writes with, or a thrown error a person can act on
    // ------------------------------------------------------------
    // charset: the model's (unused for capitals, which need no model).
    // ------------------------------------------------------------
    function Na__Layout__Validate(payload, charset) {
        if (!payload || typeof payload !== 'object') throw new Error('Expected a note to write.');
        let text = payload.text;
        if (typeof text !== 'string' || !text.trim() || text.length > Na__Layout__MAX_CHARS) throw new Error(`Write 1 to ${Na__Layout__MAX_CHARS} characters in a note.`);
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ');
        const style = Na__Layout__Style(payload);
        const capitals = style.Letters === 'Capitals';
        const writable = capitals ? null : new Set([...String(charset || ''), ...Object.keys(Na__TechStrokes__GLYPHS)]);
        const can = (ch) => ch === '\n' || Object.prototype.hasOwnProperty.call(Na__Layout__QUOTES, ch) || (capitals ? Na__Capitals__Has(ch) : writable.has(ch));
        const missing = [...new Set(text)].filter((ch) => !can(ch)).sort();
        if (missing.length) throw new Error(`The pen cannot write: ${missing.join(' ')}. Edit the words to leave them out.`);
        const nib = payload.widths === 'nib';
        return {
            text,
            size  : Na__Layout__Number(payload.size, 'size'),
            width : Na__Layout__Number(payload.width, 'width'),
            pen   : nib ? 1 : Na__Layout__Number(payload.pen, 'pen'),               // <-- Relative widths: 1 is the nib the sheet applies
            seed  : Math.trunc(Na__Layout__Number(payload.seed, 'seed')),
            nib,
            style
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Words, Phrases and Pieces
// -----------------------------------------------------------------------------

    // FUNCTION | The Note's Units: [['text', words] | ['break', '']], wrapped by words at about `chars` a line
    // ------------------------------------------------------------
    function Na__Layout__Units(text, chars) {
        const units = [];
        text.split('\n').forEach((paragraph, index) => {
            if (index) units.push(['break', '']);
            let chunk = '';
            for (const word of paragraph.match(/\S+| +/g) || []) {
                if ((chunk + word).length > chars && chunk.trim()) { units.push(['text', chunk.trim()]); chunk = ''; }
                chunk += word;
            }
            if (chunk.trim()) units.push(['text', chunk.trim()]);
        });
        return units;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Line's Pieces, as Python's re.split with a group: words for the pen, and between them the runs drawn explicitly
    // ------------------------------------------------------------
    // Explicit: numbers with their decimals and units (when numbers are
    // protected), an x standing alone between spaces (as in 2400 x 1200), and
    // runs of the symbols the model never learned. The studio's pattern used a
    // look-behind for the lone x; here the space before it is checked by hand,
    // so the engine also runs where look-behind does not (older Safari).
    // ------------------------------------------------------------
    function Na__Layout__Pieces(value, protect, symbols) {
        const run = `[${symbols.replace(/[\\\]^-]/g, '\\$&')}]+`;
        const pattern = new RegExp(protect ? `\\d+(?:[.,]\\d+)*(?:\\s*(?:mm|cm|ft|in|m)\\b)?|[xX](?=\\s)|${run}` : run, 'g');
        const pieces = [];
        let last = 0, match;
        while ((match = pattern.exec(value)) !== null) {
            if (/^[xX]$/.test(match[0]) && !(match.index > 0 && /\s/.test(value[match.index - 1]))) {
                pattern.lastIndex = match.index + 1;                             // <-- An x inside a word: the pen's, not a times sign
                continue;
            }
            pieces.push(value.slice(last, match.index), match[0]);
            last = match.index + match[0].length;
        }
        pieces.push(value.slice(last));
        return pieces;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Hundredths of a Millimetre as SVG Path Text ("-.05", "12.3", "0")
    // ------------------------------------------------------------
    function Na__Layout__Hundredths(n) {
        if (n === 0) return '0';
        const sign = n < 0 ? '-' : '';
        const a = Math.abs(n), whole = Math.floor(a / 100), part = a % 100;
        if (!part) return `${sign}${whole}`;
        const decimals = part % 10 ? String(part).padStart(2, '0') : String(part / 10);
        return `${sign}${whole || ''}.${decimals}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Stroke as One SVG Path: Catmull-Rom through its points, as cubic Beziers (the studio's curve)
    // ------------------------------------------------------------
    // Every point and control point is rounded to 0.01 mm first and each
    // segment written relative to the last rounded point, so the numbers stay
    // short and nothing drifts.
    // ------------------------------------------------------------
    function Na__Layout__Curve(points) {
        const p = points.length === 1 ? [points[0], [points[0][0] + 0.005, points[0][1], 0.5]] : points;
        const r = (v) => Math.round(v * 100);
        const h = Na__Layout__Hundredths;
        let cx = r(p[0][0]), cy = r(p[0][1]);
        let d = `M${h(cx)} ${h(cy)}`;
        for (let i = 0; i < p.length - 1; i++) {
            const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
            const x1 = r(b[0] + (c[0] - a[0]) / 6), y1 = r(b[1] + (c[1] - a[1]) / 6);
            const x2 = r(c[0] - (e[0] - b[0]) / 6), y2 = r(c[1] - (e[1] - b[1]) / 6);
            const x = r(c[0]), y = r(c[1]);
            const n = [x1 - cx, y1 - cy, x2 - cx, y2 - cy, x - cx, y - cy].map(h);
            d += 'c' + n.reduce((s, v, k) => s + (k && v[0] !== '-' ? ' ' : '') + v, '');
            cx = x; cy = y;
        }
        return d;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Note
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This Run Typed All in Capitals? (NG, LED, A: the model cannot write them)
    // ------------------------------------------------------------
    function Na__Layout__AllCapitals(piece) {
        return /[A-Z]/.test(piece) && !/[a-z]/.test(piece);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Checked Note: { paths: [{ d, w, l, u? }], width, inkWidth, height, lines, warnings, seconds, relative }
    // ------------------------------------------------------------
    // pen: a neural pen (Na__Neural__Create) with Write(phrase, seed,
    // neatness, settings); capitals need none (null). progress(fraction,
    // message) is told as each line starts; partial(ink) the ink so far as each
    // joined-up line is done. relative: each w is a fraction of the nib (the
    // sheet applies the pen), not millimetres.
    // ------------------------------------------------------------
    function Na__Layout__Render(options, pen, progress, partial) {
        const started = Date.now();
        const o = options, s = o.style;
        const say = typeof progress === 'function' ? progress : () => {};
        const margin = s.MarginMm;
        const normal = Na__Layout__Normals(o.seed);
        const text = o.text.replace(/[‘’“”]/g, (ch) => Na__Layout__QUOTES[ch]);
        const capitals = s.Letters === 'Capitals';
        const capital = o.size * Na__Capitals__HEIGHT;                          // <-- mm: a drawn capital's height (and a joined-up note's numbers)
        const available = o.width - 2 * margin;

        const strokes = [], warnings = [];
        let x = margin, y = margin, line = 0, word = 0, maxX = 0, minY = margin, lineMax = capitals ? capital : o.size, count = 0, modelWrote = false;
        const newLine = () => {
            y += Math.max(o.size * s.LineSpacing, lineMax + o.size * 0.1);
            x = margin;
            line += 1;
            word = 0;
            lineMax = capitals ? capital : o.size;
        };

        // Lay one written run on the line at x: its slant, the baseline's wave and the pen's weight; lift moves it down the line
        const put = (written, scale, lift, slant, phase) => {
            written.strokes.forEach((stroke, si) => {
                const placed = stroke.map(([px, py, p]) => [
                    x + (px + slant * (1 - py)) * scale,
                    y + lift + py * scale + Math.sin(px * s.WaveFrequency + phase) * scale * s.Wave * s.Variation,
                    p
                ]);
                let weight = 1;                                                  // <-- A technical pen: the nib's own width
                if (s.PenMode === 'Variable') {
                    let pressure = 0;
                    stroke.forEach((pt) => { pressure += pt[2]; });
                    pressure /= Math.max(1, stroke.length);
                    weight = 1 + s.Variation * (0.2 * (pressure - 0.5) + s.WeightSwing * Math.sin(si * 0.9 + phase));
                }
                strokes.push({ points: placed, weight: o.pen * weight, line, word: capitals ? word : null, d: null, offset: 0 });
                placed.forEach((pt) => {
                    lineMax = Math.max(lineMax, pt[1] - y);
                    minY = Math.min(minY, pt[1]);
                });
            });
            maxX = Math.max(maxX, x + written.width * scale);
        };

        // The ink so far (each path's curve worked out once), or the whole note when final
        const ink = (final) => {
            const edge = Math.max(0, margin - 0.5);                             // <-- The studio's 1 mm at its 1.5 mm margin
            const offset = final ? Math.max(0, edge - minY) : 0;                // <-- Ink above the note's top edge moves the whole note down
            const height = y + lineMax + margin + 0.5 + offset;
            if (final && height > Na__Layout__MAX_HEIGHT) throw new Error('This note is too tall. Use fewer words or smaller letters, or widen the note.');
            const paths = strokes.map((st) => {
                if (st.d === null || st.offset !== offset) {
                    st.d = Na__Layout__Curve(offset ? st.points.map(([px, py, p]) => [px, py + offset, p]) : st.points);
                    st.offset = offset;
                }
                const path = { d: st.d, w: Math.round(st.weight * 1000) / 1000, l: st.line };
                if (st.word !== null) path.u = st.word;
                return path;
            });
            const told = warnings.slice();
            if (final && modelWrote) told.push(Na__Layout__WARN_PROOF);          // <-- Drawn capitals cannot misform; the model's hand can
            return {
                paths,
                width    : o.width,
                inkWidth : Math.round(Math.min(o.width, maxX + edge) * 1000) / 1000,
                height   : Math.round(height * 1000) / 1000,
                lines    : line + 1,
                warnings : [...new Set(told)],
                seconds  : Math.round((Date.now() - started) / 10) / 100,
                relative : o.nib
            };
        };

        if (capitals) {
            // Word by word, each wrapped by its true width; a word's look is its own (the note's seed, the word, which copy of it)
            const seen = new Map();
            text.split('\n').forEach((paragraph, index) => {
                if (index) newLine();
                say(index / Math.max(1, text.split('\n').length), `Lettering line ${line + 1}`);
                paragraph.split(' ').filter(Boolean).forEach((typed) => {
                    const upper = Na__Capitals__Upper(typed);
                    const nth = seen.get(upper) || 0;
                    seen.set(upper, nth + 1);
                    const seed = Na__Layout__SeedFor(o.seed, upper, nth);
                    const own = Na__Layout__Normals(seed ^ 0x5BD1E995);
                    const written = Na__Capitals__Write(upper, seed, s);
                    let scale = capital;
                    if (written.width * scale > available) {
                        scale = available / Math.max(written.width, 0.01);
                        warnings.push(Na__Layout__WARN_SHRUNK);
                    }
                    if (x > margin && x + written.width * scale > o.width - margin) newLine();
                    put(written, scale, 0, own(0, s.Slant) * s.Variation, own(0, 3));
                    x += written.width * scale + o.size * s.WordGap * Math.max(0.6, 1 + own(0, 0.12) * s.Variation / 0.3);
                    word += 1;
                    count += 1;
                });
            });
            return ink(true);
        }

        const symbols = Object.keys(Na__TechStrokes__GLYPHS).filter((ch) => !pen.Charset.includes(ch)).join('');
        const units = Na__Layout__Units(text, Math.max(s.PhraseMin, Math.min(s.PhraseMax, Math.trunc(o.width / o.size * s.Wrap))));
        const settings = { Tries: s.Tries, RetryNeatness: s.RetryNeatness, MinNeatness: s.MinNeatness, LetterCheck: s.LetterCheck,
                           StepsPerChar: s.StepsPerChar, MinSteps: s.MinSteps, MaxSteps: s.MaxSteps, Tilt: s.Tilt };

        units.forEach(([kind, value], unitIndex) => {
            if (kind === 'break') { newLine(); return; }
            if (x > margin) newLine();
            let spaces = 0, previousDrawn = false;                              // <-- Spaces typed since the last run; was that run drawn (a number)?
            for (let piece of Na__Layout__Pieces(value, s.ProtectNumbers, symbols)) {
                if (!piece) continue;
                if (!piece.trim()) { spaces += piece.length; continue; }
                spaces += piece.length - piece.trimStart().length;
                // One gap where runs meet: a space where one was typed (each further space wider), else a letter's gap (NG31)
                if (x > margin) {
                    x += spaces ? o.size * (s.WordGap + (spaces - 1) * s.SpaceWidth) : o.size * Na__Layout__TOUCH;
                    if (spaces && previousDrawn && !Na__Layout__AllCapitals(piece) && ![...piece.trim()].every(Na__TechStrokes__Has)) x += o.size * s.LeadSpace;
                }
                spaces = piece.length - piece.trimEnd().length;
                piece = piece.trim();
                say(unitIndex / Math.max(units.length, 1), `Writing line ${line + 1}`);

                // The model's hand; numbers and symbols, and runs typed in capitals, drawn (as tall as a capital, on the baseline)
                const seed = Na__Layout__SeedFor(o.seed, piece, count);
                let written, drawn = true;
                if ([...piece].every(Na__TechStrokes__Has)) written = Na__TechStrokes__Write(piece);
                else if (Na__Layout__AllCapitals(piece)) written = Na__Capitals__Write(piece, seed, s);
                else {
                    try {
                        written = pen.Write(piece, seed, s.Neatness, settings);
                        drawn = false;
                        modelWrote = true;
                        if (written.attempt) warnings.push(Na__Layout__WARN_RETRIED);
                    } catch (error) {
                        written = Na__Capitals__Write(piece, seed, s);              // <-- A phrase the model cannot write: lettered, never a failed note
                        warnings.push(Na__Layout__WARN_CAPITALS);
                    }
                }
                count += 1;

                let scale = drawn ? capital : o.size;
                if (written.width * scale > available) {
                    scale = available / Math.max(written.width, 0.01);
                    warnings.push(Na__Layout__WARN_SHRUNK);
                }
                if (x + written.width * scale > o.width - margin && x > margin) newLine();
                const slant = normal(0, s.Slant) * s.Variation;
                put(written, scale, drawn ? o.size * Na__Layout__JOINED_BASE - scale : 0, slant, count);
                x += written.width * scale;
                previousDrawn = drawn;
            }
            if (typeof partial === 'function') partial(ink(false));
        });
        return ink(true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Layout__STYLE,
        Na__Layout__LETTERS,
        Na__Layout__REVISION,
        Na__Layout__Validate,
        Na__Layout__Render,
        Na__Layout__Pieces,
        Na__Layout__Curve
    };

// endregion -------------------------------------------------------------------
