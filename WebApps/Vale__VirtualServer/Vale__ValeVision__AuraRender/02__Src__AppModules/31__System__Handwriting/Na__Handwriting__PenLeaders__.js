// =============================================================================
// VALEVISION AURA - HANDWRITING - HAND-DRAWN LEADER ARROWS
// =============================================================================
//
// FILE       : Na__Handwriting__PenLeaders__.js
// NAMESPACE  : Na__PenLeaders
// MODULE     : Handwriting - Pen Leaders
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A leader drawn the way a hand draws one: one continuous bowed
//              stroke with correlated drift and tapering pressure, and two quick
//              strokes for the arrowhead, all seeded so a note always draws the
//              same arrow
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - FROM THE VALE HANDWRITING STUDIO (Dev__EarlyStageDev__TestingFiles/
//   Experiment__HandwritingTest/02__AppSourceCode/pen-leaders.js, 02-Oct-2026):
//   the same seeded random, the same bow, drift, pressure and arrowhead, taking
//   AURA's start and tip points instead of the studio's note record.
// - Pure browser code: runs everywhere, server or not.
// - Millimetres on the sheet; each stroke is an SVG path with its own width.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's pen-leaders.js into AURA.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Pen Leaders
// -----------------------------------------------------------------------------

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


    // FUNCTION | The Strokes of One Leader: { from, to, seed, pen, variation } -> [{ d, width }]
    // ------------------------------------------------------------
    function Na__PenLeaders__Strokes(options) {
        const rng = Na__PenLeaders__Random((Number(options.seed) || 0) + 73013);
        const weight = Number(options.pen) || 0.3, amount = Number(options.variation) || 0.3;
        const [sx, sy] = options.from, [tx, ty] = options.to;
        const dx = tx - sx, dy = ty - sy, length = Math.max(0.001, Math.hypot(dx, dy)), nx = -dy / length, ny = dx / length;
        const bow = (rng() - 0.5) * Math.min(13, length * 0.16), phase = rng() * 6.28, points = [];
        const steps = Math.max(12, Math.ceil(length / 3));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, envelope = Math.sin(Math.PI * t);
            const drift = envelope * (bow + (0.16 + amount * 0.7) * Math.sin(t * 11 + phase) + 0.17 * Math.sin(t * 29 + phase));
            points.push([sx + dx * t + nx * drift, sy + dy * t + ny * drift]);
        }
        const paths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / (points.length - 1), pressure = 0.75 + 0.15 * Math.sin(t * 7 + phase) + 0.15 * Math.sin(Math.PI * t);
            paths.push({ d: Na__PenLeaders__Spline(points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(points.length - 1, i + 2)]), width: weight * pressure });
        }
        const prev = points[points.length - 3] || points[0], tip = points[points.length - 1];
        const angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), wing = 2.8 + rng();
        for (const side of [-1, 1]) {
            const a = angle + Math.PI + side * (0.36 + rng() * 0.1), end = [tip[0] + Math.cos(a) * wing, tip[1] + Math.sin(a) * wing];
            const f = Na__PenLeaders__Fmt;
            paths.push({ d: `M${f(end[0])} ${f(end[1])}Q${f((end[0] + tip[0]) / 2 + nx * 0.16)} ${f((end[1] + tip[1]) / 2 + ny * 0.16)} ${f(tip[0])} ${f(tip[1])}`, width: weight * (0.8 + rng() * 0.2) });
        }
        return paths;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Leader Leaves Its Note: the point of the note's box nearest the tip, a little outside it
    // ------------------------------------------------------------
    function Na__PenLeaders__Start(box, tip) {
        const gap = 1.5;
        const x = Math.min(Math.max(tip[0], box.X), box.X + box.W);
        const y = Math.min(Math.max(tip[1], box.Y), box.Y + box.H);
        const inside = tip[0] >= box.X && tip[0] <= box.X + box.W && tip[1] >= box.Y && tip[1] <= box.Y + box.H;
        if (inside) return [box.X + box.W * 0.5, box.Y + box.H + gap];
        const dx = tip[0] - x, dy = tip[1] - y, d = Math.max(0.001, Math.hypot(dx, dy));
        return [x + (dx / d) * gap, y + (dy / d) * gap];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__PenLeaders__Strokes,
        Na__PenLeaders__Start
    };

// endregion -------------------------------------------------------------------
