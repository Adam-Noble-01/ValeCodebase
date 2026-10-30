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
//              slant, baseline and pen weight, as SVG paths in millimetres
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE STUDIO'S validate AND render (engine.py, Vale Handwriting Studio
//   revision 2026-10-02.2), neural engine only (AURA has no artist library),
//   line for line: the same wrapping by words, the same split of protected
//   numbers and units (2400 mm, 1.2 m, a lone x between spaces) and symbols,
//   the same spacing, slant, baseline wave, pen weight per stroke and
//   Catmull-Rom curves, and the same warnings.
// - WHAT DIFFERS: the random draws are seeded streams of AURA's own (a hash of
//   the note's seed, the phrase and its place for each phrase, as the studio
//   did with SHA-256; mulberry32 for the slants), so a seed writes a different
//   copy than the studio's Python did. Notes may be 20 mm wide (AURA's panel
//   allows it; the studio started at 25). Paths are written to 0.01 mm, every
//   segment relative to the last rounded point (exact: no drift), so a note's
//   ink is about half the size of the studio's in the drawing set.
// - Millimetres from the note's top left; y down, as the SVG.
// - Pure functions: runs in the engine's worker and in Node.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's engine.py (AURA 0.2.1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__TechStrokes__GLYPHS, Na__TechStrokes__Has, Na__TechStrokes__Write } from './Na__HandwritingEngine__TechStrokes__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Layout__MAX_CHARS      = 600;
    const Na__Layout__MARGIN         = 1.5;                                     // <-- mm round the words, the studio's
    const Na__Layout__MAX_HEIGHT     = 500;                                     // <-- mm: the tallest note the studio would write
    const Na__Layout__RANGES         = {                                        // <-- [low, high, default]: the studio's, but notes from 20 mm wide
        size      : [2, 12, 4.5],
        width     : [20, 350, 135],
        pen       : [0.1, 1.2, 0.3],
        variation : [0, 1, 0.3],
        neatness  : [0.2, 2.5, 1.1],
        spacing   : [1.05, 3, 1.35],
        seed      : [0, 2147483647, 42]
    };
    const Na__Layout__LABELS         = { size: 'Letter height', width: 'Note width', pen: 'Pen width', variation: 'Variation',
                                         neatness: 'Neatness', spacing: 'Line spacing', seed: 'Seed' };
    const Na__Layout__QUOTES         = { '’': "'", '‘': "'", '“': '"', '”': '"' };   // <-- Curly quotes write as straight ones
    const Na__Layout__WARN_RETRIED   = 'A stalled phrase was rewritten with a calmer pen. Check the recovered lettering.';
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


    // FUNCTION | Check a Note's Request: the options the layout writes with, or a thrown error a person can act on
    // ------------------------------------------------------------
    function Na__Layout__Validate(payload, charset) {
        if (!payload || typeof payload !== 'object') throw new Error('Expected a note to write.');
        let text = payload.text;
        if (typeof text !== 'string' || !text.trim() || text.length > Na__Layout__MAX_CHARS) throw new Error(`Write 1 to ${Na__Layout__MAX_CHARS} characters in a note.`);
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '    ');
        const writable = new Set([...charset, '\n', ...Object.keys(Na__TechStrokes__GLYPHS), ...Object.keys(Na__Layout__QUOTES)]);
        const missing = [...new Set(text)].filter((ch) => !writable.has(ch)).sort();
        if (missing.length) throw new Error(`The pen cannot write: ${missing.join(' ')}. Edit the words to leave them out.`);
        return {
            text,
            size      : Na__Layout__Number(payload.size, 'size'),
            width     : Na__Layout__Number(payload.width, 'width'),
            pen       : Na__Layout__Number(payload.pen, 'pen'),
            variation : Na__Layout__Number(payload.variation, 'variation'),
            neatness  : Na__Layout__Number(payload.neatness, 'neatness'),
            spacing   : Na__Layout__Number(payload.spacing, 'spacing'),
            seed      : Math.trunc(Na__Layout__Number(payload.seed, 'seed')),
            protect   : payload.protectNumbers !== false
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

    // FUNCTION | Write a Checked Note: { paths: [{ d, w }], width, inkWidth, height, lines, warnings, seconds }
    // ------------------------------------------------------------
    // pen: a neural pen (Na__Neural__Create) with Write(phrase, seed, neatness).
    // progress(fraction, message) is told as each line starts.
    // ------------------------------------------------------------
    function Na__Layout__Render(options, pen, progress) {
        const started = Date.now();
        const o = options;
        const say = typeof progress === 'function' ? progress : () => {};
        const normal = Na__Layout__Normals(o.seed);
        const text = o.text.replace(/[‘’“”]/g, (ch) => Na__Layout__QUOTES[ch]);
        const symbols = Object.keys(Na__TechStrokes__GLYPHS).filter((ch) => !pen.Charset.includes(ch)).join('');
        const units = Na__Layout__Units(text, Math.max(6, Math.min(42, Math.trunc(o.width / o.size * 1.8))));

        const strokes = [], warnings = [];
        let x = Na__Layout__MARGIN, y = Na__Layout__MARGIN, line = 0, maxX = 0, minY = Na__Layout__MARGIN, lineMax = o.size, count = 0;
        const newLine = () => {
            y += Math.max(o.size * o.spacing, lineMax + o.size * 0.1);
            x = Na__Layout__MARGIN;
            line += 1;
            lineMax = o.size;
        };

        units.forEach(([kind, value], unitIndex) => {
            if (kind === 'break') { newLine(); return; }
            if (x > Na__Layout__MARGIN) newLine();
            for (let piece of Na__Layout__Pieces(value, o.protect, symbols)) {
                if (!piece) continue;
                if (!piece.trim()) { x += o.size * 0.55; continue; }
                if (piece.startsWith(' ') && x > Na__Layout__MARGIN) x += o.size * 0.4;
                piece = piece.trim();
                say(unitIndex / Math.max(units.length, 1), `Writing line ${line + 1}`);

                let written;
                if ([...piece].every(Na__TechStrokes__Has)) written = Na__TechStrokes__Write(piece);
                else {
                    written = pen.Write(piece, Na__Layout__SeedFor(o.seed, piece, count), o.neatness);
                    if (written.attempt) warnings.push(Na__Layout__WARN_RETRIED);
                }
                count += 1;

                let scale = o.size;
                const available = o.width - 3;
                if (written.width * scale > available) {
                    scale = available / Math.max(written.width, 0.01);
                    warnings.push(Na__Layout__WARN_SHRUNK);
                }
                if (x + written.width * scale > o.width - Na__Layout__MARGIN && x > Na__Layout__MARGIN) newLine();
                const slant = normal(0, 0.026) * o.variation;

                written.strokes.forEach((stroke, si) => {
                    const placed = stroke.map(([px, py, p]) => [
                        x + (px + slant * (1 - py)) * scale,
                        y + py * scale + Math.sin(px * 0.6 + count) * scale * 0.022 * o.variation,
                        p
                    ]);
                    let pressure = 0;
                    stroke.forEach((pt) => { pressure += pt[2]; });
                    pressure /= Math.max(1, stroke.length);
                    const weight = o.pen * (1 + o.variation * (0.2 * (pressure - 0.5) + 0.1 * Math.sin(si * 0.9 + count)));
                    strokes.push({ points: placed, weight });
                    placed.forEach((pt) => {
                        lineMax = Math.max(lineMax, pt[1] - y);
                        minY = Math.min(minY, pt[1]);
                    });
                });
                x += written.width * scale + o.size * 0.45;
                maxX = Math.max(maxX, x);
            }
        });

        const offset = Math.max(0, 1 - minY);                                   // <-- Ink above the note's top edge moves the whole note down
        const height = y + lineMax + 2 + offset;
        if (height > Na__Layout__MAX_HEIGHT) throw new Error('This note is too tall. Use fewer words or smaller letters, or widen the note.');
        const paths = strokes.map((s) => ({
            d : Na__Layout__Curve(offset ? s.points.map(([px, py, p]) => [px, py + offset, p]) : s.points),
            w : Math.round(s.weight * 1000) / 1000
        }));
        warnings.push(Na__Layout__WARN_PROOF);
        return {
            paths,
            width    : o.width,
            inkWidth : Math.round(Math.min(o.width, maxX + 1) * 1000) / 1000,
            height   : Math.round(height * 1000) / 1000,
            lines    : line + 1,
            warnings : [...new Set(warnings)],
            seconds  : Math.round((Date.now() - started) / 10) / 100
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Layout__Validate,
        Na__Layout__Render,
        Na__Layout__Pieces,
        Na__Layout__Curve
    };

// endregion -------------------------------------------------------------------
