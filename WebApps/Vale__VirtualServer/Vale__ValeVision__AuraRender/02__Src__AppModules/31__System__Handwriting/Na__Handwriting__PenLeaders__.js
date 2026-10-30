// =============================================================================
// VALEVISION AURA - HANDWRITING - HAND-DRAWN LEADER ARROWS
// =============================================================================
//
// FILE       : Na__Handwriting__PenLeaders__.js
// NAMESPACE  : Na__PenLeaders
// MODULE     : Handwriting - Pen Leaders
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A leader drawn the way a hand draws one: one smooth spline from
//              under the words to its tip, bent through any points it has been
//              given, and two quick strokes for the arrowhead, all seeded so a
//              note always draws the same arrow
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - FROM THE VALE HANDWRITING STUDIO (Dev__EarlyStageDev__TestingFiles/
//   Experiment__HandwritingTest/02__AppSourceCode/pen-leaders.js, 02-Oct-2026):
//   the same seeded random, the same bow, drift, pressure and arrowhead, taking
//   AURA's start and tip points instead of the studio's note record.
// - Pure browser code: runs everywhere, server or not.
// - Millimetres on the sheet; each stroke is an SVG path with its own width.
// - THE NOTE'S OWN PEN (1.1.0): the leader is drawn with the note's
//   STAEDTLER Mars matic nib, one width (technical), unless the note's
//   writing style asks for the variable, non-technical pen.
// - THE SPLINE (1.2.0): a leader leaves straight down (or up) out of its words
//   and swoops to its tip; points dragged onto it bend it as a centripetal
//   Catmull-Rom spline through every one of them (Adam, 30-Oct-2026: "Add
//   natural feeling spline ... Aim: create beautiful leaders").
// - WHERE IT LEAVES (1.3.0): automatic, or set: a side of the words' box and a
//   share along it, so it follows the box as the words change.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.4.0 (AURA 0.5.3)
// - Start's note ({ align, firstLine }): a leader leaves the words' side level
//   with the first line, its side the justification's (Adam: "currently they
//   awkwardly attach to the tops of the boxes which looks shit").
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.4.7)
// - Start takes a set place ({ Side, At }) and Place turns a point near the
//   box into one (Adam: "Add controls to move the point where it hits the
//   textr box").
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.4.5)
// - The spline: Curve (a seeded swoop, or a centripetal spline through the
//   leader's bends), the leader leaving its words downward (Start now gives
//   { from, exit }), one smooth path for the technical pen, a slow faint
//   tremor in place of the studio's drift, the arrowhead on the curve's own
//   arrival. Strokes now returns { paths, samples }.
//
// 30-Oct-2026 - Version 1.1.0
// - technical: the nib's own width on every stroke and both arrow wings, the
//   pressure swell only for the variable pen (AURA 0.3.2; Adam: "Constant,
//   like the pen"). The default pen is 0.18 mm.
//
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's pen-leaders.js into AURA.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Pen Leaders
// -----------------------------------------------------------------------------

    const Na__PenLeaders__TREMOR_MM = 0.05;                                       // <-- A hand's slow waver, mm each side at the middle: felt, never seen as wobble

    // HELPER FUNCTION | The Studio's Seeded Random (mulberry32)
    // ------------------------------------------------------------
    function Na__PenLeaders__Random(seed) {
        let s = seed >>> 0;
        return () => {
            s += 0x6D2B79F5;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Catmull-Rom Span as a Cubic Bezier
    // ------------------------------------------------------------
    const Na__PenLeaders__Fmt = (v) => v.toFixed(3);

    function Na__PenLeaders__Spline(a, b, c, d) {
        const f = Na__PenLeaders__Fmt;
        return `M${f(b[0])} ${f(b[1])}C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (d[0] - b[0]) / 6)} ${f(c[1] - (d[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Centripetal Catmull-Rom Span (p1 to p2) as a Cubic Bezier's Two Controls
    // ------------------------------------------------------------
    // Centripetal (alpha 0.5): the curve passes through every point without the
    // loops and overshoot a uniform spline makes when points bunch up, which is
    // what makes a dragged point feel like bending a strip of spring steel.
    // ------------------------------------------------------------
    function Na__PenLeaders__Span(p0, p1, p2, p3) {
        const knot = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
        const t01 = knot(p0, p1), t12 = knot(p1, p2), t23 = knot(p2, p3);
        const m1 = [0, 1].map((k) => (p2[k] - p1[k]) + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12)));
        const m2 = [0, 1].map((k) => (p2[k] - p1[k]) + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23)));
        return [[p1[0] + m1[0] / 3, p1[1] + m1[1] / 3], [p2[0] - m2[0] / 3, p2[1] - m2[1] / 3]];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Point on a Cubic Bezier
    // ------------------------------------------------------------
    function Na__PenLeaders__Bezier(a, b, c, d, t) {
        const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
        return [a[0] * w0 + b[0] * w1 + c[0] * w2 + d[0] * w3, a[1] * w0 + b[1] * w1 + c[1] * w2 + d[1] * w3];
    }
    // ------------------------------------------------------------


    // FUNCTION | The Curve of One Leader: { from, exit, bends, to, seed } -> { samples: [[x, y, span]], tangent }
    // ------------------------------------------------------------
    // from: where it leaves its note; exit: the direction it leaves in (straight
    // down out of the words, as a drawn leader does); bends: the points it has
    // been bent through; to: the tip. With no bends it is one seeded swoop,
    // leaving along exit and arriving a little off the chord (image 01's
    // leaders); with bends a centripetal spline through all of them. Each
    // sample carries the span it lies on (0: from to the first bend), so a
    // Ctrl + click knows where its new point goes.
    // ------------------------------------------------------------
    function Na__PenLeaders__Curve(options) {
        const rng = Na__PenLeaders__Random((Number(options.seed) || 0) + 73013);
        const from = options.from, tip = options.to, exit = options.exit || [0, 1];
        const bends = (options.bends || []).map((b) => [b.X, b.Y]);
        const chord = Math.max(0.001, Math.hypot(tip[0] - from[0], tip[1] - from[1]));
        const beziers = [];
        if (!bends.length) {
            const side = rng() < 0.5 ? -1 : 1, turn = side * (0.18 + rng() * 0.22);   // <-- The arrival a little off the chord: which way and how far, by the note's seed
            const ux = (tip[0] - from[0]) / chord, uy = (tip[1] - from[1]) / chord;
            const ax = ux * Math.cos(turn) - uy * Math.sin(turn), ay = ux * Math.sin(turn) + uy * Math.cos(turn);
            beziers.push([from, [from[0] + exit[0] * chord * 0.42, from[1] + exit[1] * chord * 0.42], [tip[0] - ax * chord * 0.34, tip[1] - ay * chord * 0.34], tip]);
        } else {
            const points = [from, ...bends, tip];
            const lead = Math.max(1, Math.hypot(points[1][0] - from[0], points[1][1] - from[1]));
            const n = points.length;
            const ghostStart = [from[0] - exit[0] * lead, from[1] - exit[1] * lead];       // <-- Leaves along exit
            const ghostEnd = [2 * tip[0] - points[n - 2][0], 2 * tip[1] - points[n - 2][1]];   // <-- Arrives along its last bend
            for (let i = 0; i < n - 1; i++) {
                const [b1, b2] = Na__PenLeaders__Span(i === 0 ? ghostStart : points[i - 1], points[i], points[i + 1], i + 2 < n ? points[i + 2] : ghostEnd);
                beziers.push([points[i], b1, b2, points[i + 1]]);
            }
        }
        const samples = [];
        beziers.forEach((z, span) => {
            const rough = Math.hypot(z[1][0] - z[0][0], z[1][1] - z[0][1]) + Math.hypot(z[2][0] - z[1][0], z[2][1] - z[1][1]) + Math.hypot(z[3][0] - z[2][0], z[3][1] - z[2][1]);
            const steps = Math.max(8, Math.ceil(rough / 0.8));                    // <-- A sample every 0.8 mm or so: smooth at any zoom
            for (let i = span === 0 ? 0 : 1; i <= steps; i++) samples.push([...Na__PenLeaders__Bezier(z[0], z[1], z[2], z[3], i / steps), span]);
        });
        return { samples, rng };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Run of Samples as One Smooth Path
    // ------------------------------------------------------------
    function Na__PenLeaders__Path(points, i0, i1) {
        let d = '';
        for (let i = i0; i < i1; i++) {
            const span = Na__PenLeaders__Spline(points[Math.max(i0, i - 1)], points[i], points[i + 1], points[Math.min(i1, i + 2)]);
            d += i === i0 ? span : span.slice(span.indexOf('C'));
        }
        return d;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Strokes of One Leader: { from, exit, bends, to, seed, pen, variation, technical } -> { paths: [{ d, width }], samples }
    // ------------------------------------------------------------
    // pen: the nib in mm on the paper. technical (the default): one stroke at
    // the nib's own width, as a Mars matic draws (Adam, 30-Oct-2026:
    // "Constant, like the pen"); false: a pressure swell along it. A hand's
    // slow, faint tremor (never jitter) keeps it from reading as a plotter's,
    // fading to nothing at both ends so the arrow lands exactly on its tip.
    // ------------------------------------------------------------
    function Na__PenLeaders__Strokes(options) {
        const { samples, rng } = Na__PenLeaders__Curve(options);
        const weight = Number(options.pen) || 0.18, amount = Number(options.variation) || 0.3;
        const technical = options.technical !== false;
        const phase = rng() * 6.28;
        let run = 0;
        const lengths = samples.map((s, i) => (run += i ? Math.hypot(s[0] - samples[i - 1][0], s[1] - samples[i - 1][1]) : 0));
        const total = Math.max(0.001, run);
        const points = samples.map((s, i) => {
            if (i === 0 || i === samples.length - 1) return [s[0], s[1]];
            const a = samples[i - 1], b = samples[i + 1], tl = Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]));
            const t = lengths[i] / total, envelope = Math.sin(Math.PI * t);
            const tremor = envelope * Na__PenLeaders__TREMOR_MM * (0.5 + amount) * (Math.sin(lengths[i] / 9 + phase) + 0.4 * Math.sin(lengths[i] / 3.7 + phase * 2));
            return [s[0] - (b[1] - a[1]) / tl * tremor, s[1] + (b[0] - a[0]) / tl * tremor];
        });

        const paths = [];
        const last = points.length - 1;
        if (technical) paths.push({ d: Na__PenLeaders__Path(points, 0, last), width: weight });
        else {
            const chunk = 6;                                                     // <-- Six samples a stroke: the swell changes smoothly
            for (let i = 0; i < last; i += chunk) {
                const t = lengths[Math.min(last, i + chunk / 2)] / total;
                paths.push({ d: Na__PenLeaders__Path(points, i, Math.min(last, i + chunk)), width: weight * (0.75 + 0.15 * Math.sin(t * 7 + phase) + 0.15 * Math.sin(Math.PI * t)) });
            }
        }

        // The arrowhead: two short strokes back along the curve's own arrival
        const tip = points[last];
        let k = last;
        while (k > 0 && lengths[last] - lengths[k] < 2.2) k--;                   // <-- The arrival measured over the last 2 mm, not one sample
        const prev = points[k];
        const angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), wing = 2.6 + rng() * 0.8;
        const nx = -Math.sin(angle), ny = Math.cos(angle);
        const f = Na__PenLeaders__Fmt;
        for (const side of [-1, 1]) {
            const a = angle + Math.PI + side * (0.36 + rng() * 0.1), end = [tip[0] + Math.cos(a) * wing, tip[1] + Math.sin(a) * wing];
            const swell = 0.8 + rng() * 0.2;                                    // <-- Drawn either way: the next wing's angle keeps its draw
            paths.push({ d: `M${f(end[0])} ${f(end[1])}Q${f((end[0] + tip[0]) / 2 + nx * 0.12)} ${f((end[1] + tip[1]) / 2 + ny * 0.12)} ${f(tip[0])} ${f(tip[1])}`, width: technical ? weight : weight * swell });
        }
        return { paths, samples };
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Leader Leaves Its Note, and Which Way: toward its first bend or its tip -> { from, exit }
    // ------------------------------------------------------------
    // As a drawn leader leaves: from under (or over) the words, near the side
    // it is heading for but never off the end of them, straight down (or up);
    // from the note's side only when what it points at is beside the words.
    // place ({ Side: Bottom | Top | Left | Right, At: 0 to 1 along it, left
    // to right or top to bottom }) sets it instead.
    // note ({ align, firstLine }, 1.3.0): a note's leader leaves from its side,
    // level with the middle of its first line (firstLine: mm down the box), as
    // an architect draws one (Adam: "currently they awkwardly attach to the tops
    // of the boxes"): words set Left lead from the left, Right from the right
    // ("flipping right / left justification switches the leader side"), Centre
    // and Box from the side nearer what it points at.
    // ------------------------------------------------------------
    const Na__PenLeaders__GAP_MM = 1.5;                                          // <-- Clear of the words' box

    function Na__PenLeaders__Start(box, toward, place, note) {
        const gap = Na__PenLeaders__GAP_MM;
        if (place && Na__PenLeaders__EXITS[place.Side]) {
            const at = Math.min(1, Math.max(0, Number(place.At) || 0));
            const exit = Na__PenLeaders__EXITS[place.Side];
            if (exit[1]) return { from: [box.X + box.W * at, exit[1] > 0 ? box.Y + box.H + gap : box.Y - gap], exit };
            return { from: [exit[0] > 0 ? box.X + box.W + gap : box.X - gap, box.Y + box.H * at], exit };
        }
        const [tx, ty] = toward;
        if (note && Number.isFinite(note.firstLine)) {
            const y = Math.min(box.Y + box.H, Math.max(box.Y, box.Y + note.firstLine));
            const right = note.align === 'Right' ? true : note.align === 'Left' ? false : tx > box.X + box.W / 2;
            return right ? { from: [box.X + box.W + gap, y], exit: [1, 0] } : { from: [box.X - gap, y], exit: [-1, 0] };
        }
        const along = Math.min(Math.max(tx, box.X + box.W * 0.2), box.X + box.W * 0.8);
        if (ty > box.Y + box.H) return { from: [along, box.Y + box.H + gap], exit: [0, 1] };
        if (ty < box.Y) return { from: [along, box.Y - gap], exit: [0, -1] };
        const side = Math.min(Math.max(ty, box.Y + box.H * 0.3), box.Y + box.H * 0.7);
        if (tx > box.X + box.W) return { from: [box.X + box.W + gap, side], exit: [1, 0] };
        if (tx < box.X) return { from: [box.X - gap, side], exit: [-1, 0] };
        return { from: [box.X + box.W * 0.5, box.Y + box.H + gap], exit: [0, 1] };   // <-- A tip inside the words: from under them
    }
    // ------------------------------------------------------------


    // FUNCTION | The Place on a Box Nearest a Point: { Side, At } (dragging where a leader leaves)
    // ------------------------------------------------------------
    const Na__PenLeaders__EXITS = { Bottom: [0, 1], Top: [0, -1], Left: [-1, 0], Right: [1, 0] };

    function Na__PenLeaders__Place(box, point) {
        const [px, py] = point;
        const across = Math.min(1, Math.max(0, (px - box.X) / Math.max(0.001, box.W)));
        const down = Math.min(1, Math.max(0, (py - box.Y) / Math.max(0.001, box.H)));
        const sides = [
            { Side: 'Bottom', At: across, d: Math.hypot(px - (box.X + box.W * across), py - (box.Y + box.H)) },
            { Side: 'Top',    At: across, d: Math.hypot(px - (box.X + box.W * across), py - box.Y) },
            { Side: 'Left',   At: down,   d: Math.hypot(px - box.X, py - (box.Y + box.H * down)) },
            { Side: 'Right',  At: down,   d: Math.hypot(px - (box.X + box.W), py - (box.Y + box.H * down)) }
        ];
        const best = sides.reduce((a, b) => (b.d < a.d ? b : a));
        return { Side: best.Side, At: Math.round(best.At * 1000) / 1000 };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__PenLeaders__Strokes,
        Na__PenLeaders__Start,
        Na__PenLeaders__Place
    };

// endregion -------------------------------------------------------------------
