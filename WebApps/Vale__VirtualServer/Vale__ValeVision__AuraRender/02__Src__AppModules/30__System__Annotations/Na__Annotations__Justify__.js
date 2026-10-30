// =============================================================================
// VALEVISION AURA - ANNOTATIONS - JUSTIFYING A NOTE'S INK
// =============================================================================
//
// FILE       : Na__Annotations__Justify__.js
// NAMESPACE  : Na__Justify
// MODULE     : Annotations - Justify
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A written note's lines set left, centred, right or justified to
//              its box, on the sheet, from the ink the engine already wrote
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026: "add jusfity text left, right, centre and box".
// - The engine writes a note's lines from the left; the sheet moves them. No
//   rewrite, so changing the setting is instant and the hand-written copy
//   stays the same copy.
// - LINES: each path's L (its line, from the engine) when every path has one;
//   otherwise the ink is measured. Every path's extent is read from its own
//   path text (any SVG path), and the paths are split into the note's Lines at
//   the widest vertical gaps between them.
// - WORDS (Box only): each path's U when the engine gives it; otherwise a line's
//   paths are merged left to right and the gaps clearly wider than a pen lift
//   are its word spaces.
// - BOX: every line but the last widened to the widest, its extra width shared
//   between its word spaces; a short line (a paragraph's end) is left as it is.
// - Pure maths, no DOM: a note's offsets are worked out once per ink and kept.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.4.7)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Justify__ALIGNS       = ['Left', 'Centre', 'Right', 'Box'];
    const Na__Justify__LINE_GAP     = 0.25;                                     // <-- Letter heights: the least vertical gap that can part two lines
    const Na__Justify__WORD_GAP     = 0.25;                                     // <-- Letter heights: the least gap that can be a word space
    const Na__Justify__WORD_SHARE   = 0.55;                                     // <-- ...and at least this share of the line's widest gap (letters part too)
    const Na__Justify__FULL_LINE    = 0.6;                                      // <-- Box: a line shorter than this share of the widest is a paragraph's end

    const Na__Justify__Bounds = new WeakMap();                                  // <-- A Paths array -> each path's extent
    const Na__Justify__Cache  = new WeakMap();                                  // <-- An ink -> { key, offsets }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measuring the Ink
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Path's Extent From Its Text: { x0, x1, y0, y1 } | null
    // ------------------------------------------------------------
    // Every command of an SVG path; the control points count too, so the box is
    // a little generous on a curve, which is all the splitting needs.
    // ------------------------------------------------------------
    const Na__Justify__ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };

    function Na__Justify__PathBounds(d) {
        const tokens = String(d || '').match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
        let x = 0, y = 0, startX = 0, startY = 0, cmd = '', i = 0;
        const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
        const add = (px, py) => {
            if (px < box.x0) box.x0 = px; if (px > box.x1) box.x1 = px;
            if (py < box.y0) box.y0 = py; if (py > box.y1) box.y1 = py;
        };
        while (i < tokens.length) {
            if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
            else if (!cmd) { i++; continue; }
            const upper = cmd.toUpperCase(), rel = cmd !== upper, n = Na__Justify__ARITY[upper];
            if (n === undefined) { i++; continue; }
            if (upper === 'Z') { x = startX; y = startY; cmd = ''; continue; }
            if (i + n > tokens.length) break;
            const v = tokens.slice(i, i + n).map(Number);
            i += n;
            const ox = rel ? x : 0, oy = rel ? y : 0;
            if (upper === 'H') { x = v[0] + ox; add(x, y); }
            else if (upper === 'V') { y = v[0] + oy; add(x, y); }
            else if (upper === 'A') { x = v[5] + ox; y = v[6] + oy; add(x, y); }
            else {
                for (let k = 0; k < n; k += 2) add(v[k] + ox, v[k + 1] + oy);
                x = v[n - 2] + ox; y = v[n - 1] + oy;
            }
            if (upper === 'M') { startX = x; startY = y; cmd = rel ? 'l' : 'L'; }    // <-- Pairs after a move are lines
        }
        return box.x0 <= box.x1 ? box : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Path's Extent, Measured Once per Ink
    // ------------------------------------------------------------
    function Na__Justify__AllBounds(paths) {
        if (!Na__Justify__Bounds.has(paths)) Na__Justify__Bounds.set(paths, paths.map((p) => Na__Justify__PathBounds(p.D)));
        return Na__Justify__Bounds.get(paths);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Paths in Lines: [[path index]], top line first
    // ------------------------------------------------------------
    function Na__Justify__Lines(paths, bounds, lineCount, size) {
        const inked = paths.map((p, i) => i).filter((i) => bounds[i]);
        if (inked.length && inked.every((i) => Number.isInteger(paths[i].L))) {
            const byLine = new Map();
            inked.forEach((i) => { if (!byLine.has(paths[i].L)) byLine.set(paths[i].L, []); byLine.get(paths[i].L).push(i); });
            return [...byLine.keys()].sort((a, b) => a - b).map((l) => byLine.get(l));
        }
        const middle = (i) => (bounds[i].y0 + bounds[i].y1) / 2;
        const order = inked.sort((a, b) => middle(a) - middle(b));
        const gaps = [];
        for (let k = 1; k < order.length; k++) gaps.push({ at: k, gap: middle(order[k]) - middle(order[k - 1]) });
        const cuts = gaps.filter((g) => g.gap > size * Na__Justify__LINE_GAP)
            .sort((a, b) => b.gap - a.gap)
            .slice(0, Math.max(0, (Number(lineCount) || 1) - 1))
            .map((g) => g.at)
            .sort((a, b) => a - b);
        const lines = [];
        let from = 0;
        [...cuts, order.length].forEach((to) => { if (to > from) lines.push(order.slice(from, to)); from = to; });
        return lines;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Line's Words: [[path index]], left to right
    // ------------------------------------------------------------
    function Na__Justify__Words(paths, bounds, line, size) {
        if (line.every((i) => Number.isInteger(paths[i].U))) {
            const byWord = new Map();
            line.forEach((i) => { if (!byWord.has(paths[i].U)) byWord.set(paths[i].U, []); byWord.get(paths[i].U).push(i); });
            return [...byWord.keys()].sort((a, b) => a - b).map((u) => byWord.get(u));
        }
        const order = line.slice().sort((a, b) => bounds[a].x0 - bounds[b].x0);
        const runs = [];
        order.forEach((i) => {
            const last = runs[runs.length - 1];
            if (last && bounds[i].x0 <= last.x1) { last.items.push(i); last.x1 = Math.max(last.x1, bounds[i].x1); }
            else runs.push({ items: [i], x0: bounds[i].x0, x1: bounds[i].x1 });
        });
        let widest = 0;
        for (let k = 1; k < runs.length; k++) widest = Math.max(widest, runs[k].x0 - runs[k - 1].x1);
        const space = Math.max(size * Na__Justify__WORD_GAP, widest * Na__Justify__WORD_SHARE);
        const words = [];
        runs.forEach((run, k) => {
            if (k && run.x0 - runs[k - 1].x1 >= space) words.push([]);
            if (!words.length) words.push([]);
            words[words.length - 1].push(...run.items);
        });
        return words;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Justifying
// -----------------------------------------------------------------------------

    // FUNCTION | Each Path's Sideways Shift in mm for an Alignment, or null (Left, or nothing to move)
    // ------------------------------------------------------------
    // written: the note's ink ({ Paths, Lines }); align: Left, Centre, Right or
    // Box; size: the letter height in mm. The lines are set within the note's
    // own inked width (its widest line), so its box stays the same box.
    // ------------------------------------------------------------
    function Na__Justify__Offsets(written, align, size) {
        if (!written || !Array.isArray(written.Paths) || !written.Paths.length) return null;
        if (!Na__Justify__ALIGNS.includes(align) || align === 'Left') return null;
        const key = `${align}|${size}|${written.Paths.length}`;
        const kept = Na__Justify__Cache.get(written);
        if (kept && kept.key === key) return kept.offsets;

        const paths = written.Paths, bounds = Na__Justify__AllBounds(paths);
        const lines = Na__Justify__Lines(paths, bounds, written.Lines, size);
        const extent = (items) => items.reduce((e, i) => ({ x0: Math.min(e.x0, bounds[i].x0), x1: Math.max(e.x1, bounds[i].x1) }), { x0: Infinity, x1: -Infinity });
        const spans = lines.map(extent);
        const left = Math.min(...spans.map((s) => s.x0)), right = Math.max(...spans.map((s) => s.x1));
        const offsets = new Float64Array(paths.length);
        lines.forEach((line, n) => {
            const s = spans[n];
            if (align === 'Centre') line.forEach((i) => { offsets[i] = (left + right) / 2 - (s.x0 + s.x1) / 2; });
            else if (align === 'Right') line.forEach((i) => { offsets[i] = right - s.x1; });
            else {
                const lastLine = n === lines.length - 1;
                if (lastLine || s.x1 - s.x0 < (right - left) * Na__Justify__FULL_LINE) return;   // <-- Justified text leaves its last line, and a paragraph's end, set left
                const words = Na__Justify__Words(paths, bounds, line, size);
                if (words.length < 2) return;
                const extra = (right - left) - (s.x1 - s.x0), share = extra / (words.length - 1);
                words.forEach((word, w) => word.forEach((i) => { offsets[i] = (left - s.x0) + share * w; }));
            }
        });
        for (let i = 0; i < offsets.length; i++) offsets[i] = Math.round(offsets[i] * 1000) / 1000;
        const result = offsets.some((v) => v !== 0) ? offsets : null;
        Na__Justify__Cache.set(written, { key, offsets: result });
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Justify__ALIGNS,
        Na__Justify__Offsets,
        Na__Justify__PathBounds
    };

// endregion -------------------------------------------------------------------
