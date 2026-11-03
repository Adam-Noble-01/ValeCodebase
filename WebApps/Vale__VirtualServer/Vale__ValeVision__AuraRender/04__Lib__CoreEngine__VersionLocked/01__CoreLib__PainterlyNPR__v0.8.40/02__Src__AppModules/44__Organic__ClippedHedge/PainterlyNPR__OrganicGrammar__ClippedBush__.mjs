/* =============================================================================
   PAINTERLYNPR - ORGANIC | CLIPPED HEDGE - A CLIPPED BUSH
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__ClippedBush__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - ClippedHedge - ClippedBush
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a hand adds to a clipped bush: its outline gone over until it
                has weight, more on the side away from the sun, nicked toward its
                top; and a cool glaze down that side
   CREATED    : 03-Nov-2026 (v0.8.40)

   DESCRIPTION:
   - From Vale's Thrower perspective (A2Q 15270-1 PER, 300 dpi on A3), Adam's two
     ringed bushes, measured at 5x: the outline reads 0.25 to 0.4 mm, and it is a
     finer line gone over, its doubled strokes showing. On the cone's upper part
     the second stroke is a run of nicks about half a millimetre apart. Every
     stroke stays on the base pen, as Adam asked of plant pen work ("Keep
     0.13 mm", v0.8.34): the weight comes from going back over it, as the hand does.
   - Each pass follows the first stroke's own path, a hair off it (the same seed
     decorates it), so they merge into one heavy line instead of a bundle of wires.
   - On the sheet, by the sun's side (40's SunOnSheet), not by the light where it
     falls: a bush standing in a wall's shadow is still drawn as if lit from the
     drawing's side, and a turned plop is the same bush.
   - The paper left inside its line on the sun's side is not here: its class is one
     a round form's rim holds (24's Always), and the wash leaves that itself (52).
   - Its size goes with the drawing: under MinMm on the sheet there is only its
     outline.

   ============================================================================= */

import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Chop,
    PainterlyNPR__OrganicGrammar__Circle,
    PainterlyNPR__OrganicGrammar__Contours,
    PainterlyNPR__OrganicGrammar__Decorate,
    PainterlyNPR__OrganicGrammar__Emit,
    PainterlyNPR__OrganicGrammar__Frame,
    PainterlyNPR__OrganicGrammar__Runs,
    PainterlyNPR__OrganicGrammar__SunOnSheet,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import { PainterlyNPR__OrganicGrammar__LayGlaze } from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Sketch__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Clipped Hedge - A Clipped Bush
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Gesture
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Bush's Marks - millimetres on the sheet, heights as a share of the bush
    // ------------------------------------------------------------
    // Hands: each pass of the pen back over the line, by the bush's Kind. Side Sun,
    // Shade or Both; Up the share of its height it covers; OffMm how far from the first
    // stroke; DrawMm and GapMm the strokes' lengths and the lifts between. Edge, when
    // given, is a stroke of its own in that hand (Decorate's), not the first's path.
    const CLIPPED  =  {
        MinMm          :  2.2,                                                 // <-- A half-width on the sheet under this has no room for any of it
        MinTall        :  0.6,                                                 // <-- Its height on the sheet over its half-width, under which it is seen from above: no up or down to go by
        ProbeOut       :  1.5,
        FootFacing     :  -0.35,                                               // <-- Facing further down than this is its foot: it has no line there
        Wobble         :  0.12,                                                // <-- A pass stays on the line it goes over: any more and it comes apart into wires
        Glaze          :  {
            Facing     :  -0.2,                                                // <-- How squarely the line must face away from the sun
            WidthShare :  [0.08, 0.17],                                        // <-- How far in it comes, over the bush's half-width
            Wander     :  0.3,
            Pigments   :  { Lavender: 0.45, Cornflower: 0.15, Cream: 0.1 },    // <-- Off the scan: lifted sage under lilac, a little blue and a little cream, reads its blue-grey (142, 153, 157), not a violet
            Foot       :  0.12,                                                // <-- It starts this share up the bush
            SmoothPx   :  6,                                                   // <-- Along the line, so its edge has no grid's noise
        },
        Tangle         :  {                                                    // <-- Stems and twigs caught in the rim on the shaded side, each gone over, by Kind: how many
            Count      :  { MoundedBush: 5 },
            Up         :  [0.08, 0.7],
            StartMm    :  [-0.25, 0.2],                                        // <-- From the rim, out or in
            LengthMm   :  [1.1, 2.6],
            TurnDeg    :  [8, 38],                                             // <-- Off the rim's own line: they follow it more than they cross it
            BendMm     :  [0.3, 0.8],
            OffMm      :  0.05,
            Steps      :  10,
        },
        Hands          :  {
            ClippedBush  :  [
                { Side: 'Shade', Up: [0, 1],      OffMm: [0.03, 0.07],   DrawMm: [3.5, 9], GapMm: [0.1, 0.5] },
                { Side: 'Shade', Up: [0.2, 1],    OffMm: [-0.07, -0.03], DrawMm: [3, 8],   GapMm: [0.2, 0.9] },
                { Side: 'Shade', Up: [0.45, 1],   OffMm: [-0.03, 0.03],  Edge: 'Jagged', EdgeMm: 0.34, DrawMm: [2.5, 7], GapMm: [0.3, 1.2] },
                { Side: 'Sun',   Up: [0.25, 1],   OffMm: [-0.06, -0.02], DrawMm: [3, 8],   GapMm: [0.2, 1] },
                { Side: 'Sun',   Up: [0.5, 1],    OffMm: [0.02, 0.06],   DrawMm: [2.5, 6], GapMm: [0.3, 1.2] },
                { Side: 'Sun',   Up: [0.7, 1],    OffMm: [-0.03, 0.03],  Edge: 'Jagged', EdgeMm: 0.36, DrawMm: [2, 5], GapMm: [0.4, 1.5] },
                { Side: 'Both',  Up: [0.84, 1],   OffMm: [-0.05, 0.05],  DrawMm: [1.5, 3.5], GapMm: [0.05, 0.2] },
                { Side: 'Both',  Up: [0.84, 1],   OffMm: [-0.09, 0.09],  DrawMm: [1.5, 3],   GapMm: [0.05, 0.3] },
            ],
            MoundedBush  :  [
                { Side: 'Shade', Up: [0.05, 1],   OffMm: [0.02, 0.06],   DrawMm: [2.5, 7], GapMm: [0.1, 0.6] },
                { Side: 'Shade', Up: [0.1, 1],    OffMm: [-0.06, -0.02], DrawMm: [2, 6],   GapMm: [0.2, 1] },
                { Side: 'Shade', Up: [0.1, 0.95], OffMm: [0.04, 0.14],   Edge: 'Scallop', EdgeMm: 1.5, DrawMm: [1.5, 4], GapMm: [0.5, 2.5] },
                { Side: 'Sun',   Up: [0.4, 1],    OffMm: [0.02, 0.05],   DrawMm: [2, 5],   GapMm: [0.6, 2.5] },
            ],
        },
    };
    // ------------------------------------------------------------


    // FUNCTION | The Bush on the Sheet - its axis and which way the sun lies, for what goes by them
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__BushFrame(organic, R) {
        const foot  =  PainterlyNPR__CameraRig__Project(organic.Bush.Foot);
        const top   =  PainterlyNPR__CameraRig__Project(organic.Bush.Top);
        const tall  =  top.Y - foot.Y;
        const sun   =  PainterlyNPR__OrganicGrammar__SunOnSheet();
        const flat  =  tall < CLIPPED.MinTall * R;                             // <-- Seen from above: everywhere is the middle of it, and no side faces away
        return {
            Foot  :  foot,
            Sun   :  sun,
            Up    :  (y) => (flat ? 0.5 : Clamp((y - foot.Y) / tall, 0, 1)),
            Side  :  (x, y) => { const up = flat ? 0.5 : Clamp((y - foot.Y) / tall, 0, 1); return (x - (foot.X + (top.X - foot.X) * up)) * sun.Side; },   // <-- Above 0 on the sun's side of its axis
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Line Gone Over - each pass a hair off the first stroke, by side and height
    // ------------------------------------------------------------
    // Called by the outline for each run it draws. first: the seed that decorated
    // its first stroke, so a pass in the same hand follows its bumps exactly.
    function PainterlyNPR__OrganicGrammar__ClippedBushLine(organic, run, edge, clump, first, seed, strokes, pushDebug) {
        const Q        =  CLIPPED;
        const pxPerMm  =  Gpu.PxPerMm;
        const circle   =  PainterlyNPR__OrganicGrammar__Circle(organic.Masses[0]);
        if (circle.R < Q.MinMm * pxPerMm) return;
        const frame  =  PainterlyNPR__OrganicGrammar__BushFrame(organic, circle.R);
        const rng    =  PainterlyNPR__SeededRandom__Create(seed);
        const hands  =  Q.Hands[organic.Kind] || Q.Hands.ClippedBush;
        hands.forEach((pass, pi) => {
            const off    =  rng.Range(pass.OffMm[0], pass.OffMm[1]) * pxPerMm;
            const line   =  pass.Edge
                ? PainterlyNPR__OrganicGrammar__Decorate(run, pass.Edge, pass.EdgeMm * pxPerMm, off, rng)
                : PainterlyNPR__OrganicGrammar__Decorate(run, edge, clump, off, PainterlyNPR__SeededRandom__Create(first));
            const inside =  (p) => {
                const up  =  frame.Up(p.Y);
                if (up < pass.Up[0] || up > pass.Up[1]) return false;
                if (pass.Side === 'Both') return true;
                return pass.Side === 'Sun' ? frame.Side(p.X, p.Y) > 0 : frame.Side(p.X, p.Y) <= 0;
            };
            let part  =  [], pieces = 0;
            const flush  =  () => {
                if (part.length >= 3) PainterlyNPR__OrganicGrammar__Chop(part, rng, strokes, pushDebug, {
                    DrawMm: pass.DrawMm, GapMm: pass.GapMm, LitGap: 0, Dry: 0.1, Class: 2, Shade: 0, Alpha: 0.92, Loose: 0, TaperIn: 0.3, TaperOut: 0.6, Wobble: Q.Wobble,
                    Seed: PainterlyNPR__SeededRandom__DeriveSeed(seed, `over:${pi}:${pieces++}`),
                });
                part  =  [];
            };
            for (const p of line) {
                if (inside(p)) part.push(p);
                else flush();
            }
            flush();
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Clipped Bush's Gesture - a cool glaze down the side away from the sun
    // ------------------------------------------------------------
    // organic.Bush: its Foot and Top in the world. circle: its widest on the sheet,
    // as the grammar projected its first mass. The sage lifted and a lilac laid over
    // it, its inner edge wandering. A flat ribbon, so its edge is smooth, in the
    // accent layer so a shadow glaze or a flower goes over it as they would.
    function PainterlyNPR__OrganicGrammar__ClippedBush(organic, circle, seed, strokes, pushDebug) {
        const Q        =  CLIPPED;
        const pxPerMm  =  Gpu.PxPerMm;
        const R        =  circle.R;
        if (R < Q.MinMm * pxPerMm) return;
        const frame    =  PainterlyNPR__OrganicGrammar__BushFrame(organic, R);
        const foot     =  frame.Foot;
        const id       =  organic.ObjectId;
        const reach    =  PainterlyNPR__CameraRig__Project(organic.Bush.Top);
        const box      =  [Math.max(0, circle.X - R * 1.4 - 4), Math.max(0, Math.min(foot.Y, reach.Y) - R * 0.3 - 4), Math.min(Gpu.Width - 1, circle.X + R * 1.4 + 4), Math.min(Gpu.Height - 1, Math.max(foot.Y, reach.Y) + R * 0.3 + 4)];
        if (!(box[2] > box[0] && box[3] > box[1])) return;
        const step     =  Math.max(1.25, 0.35 * pxPerMm);
        const probe    =  step + Q.ProbeOut;
        const G        =  Q.Glaze;
        const rng      =  PainterlyNPR__SeededRandom__Create(seed);
        const a1 = rng.Range(0, Math.PI * 2), a2 = rng.Range(0, Math.PI * 2);
        PainterlyNPR__OrganicGrammar__Contours(box, step, (x, y) => PainterlyNPR__GeometryBuffers__ObjectAt(x, y) === id).forEach((contour) => {
            const P  =  PainterlyNPR__OrganicGrammar__Frame(contour);
            for (const p of P) {
                const ox = p.X + p.NX * probe, oy = p.Y + p.NY * probe;
                const out   =  PainterlyNPR__GeometryBuffers__ObjectAt(ox, oy);
                const dIn   =  PainterlyNPR__GeometryBuffers__DepthAt(p.X - p.NX * probe, p.Y - p.NY * probe);
                const mine  =  out >= 0 && organic.Uid != null && (Scene.ObjectById.get(out) || {}).Uid === organic.Uid;
                p.Sil     =  !mine && p.NY >= Q.FootFacing && (out < 0 || PainterlyNPR__GeometryBuffers__DepthAt(ox, oy) >= dIn - (0.05 + dIn * 0.004));
                p.Facing  =  p.NX * frame.Sun.Side;
                p.Up      =  frame.Up(p.Y);
            }
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.Sil && p.Facing < G.Facing && p.Up >= G.Foot).forEach((run) => {
                const outer = [], inner = [];
                let s  =  0;
                for (let i = 0; i < run.length; i++) {
                    if (i) s  +=  Math.hypot(run[i].X - run[i - 1].X, run[i].Y - run[i - 1].Y);
                    let x = 0, y = 0, nx = 0, ny = 0, n = 0;
                    for (let k = Math.max(0, i - G.SmoothPx); k <= Math.min(run.length - 1, i + G.SmoothPx); k++) { const q = run[k]; x += q.X; y += q.Y; nx += q.NX; ny += q.NY; n++; }
                    const len   =  Math.hypot(nx, ny) || 1;
                    const ends  =  Math.min(1, Math.min(i, run.length - 1 - i) / 8);
                    const wide  =  (G.WidthShare[0] + (G.WidthShare[1] - G.WidthShare[0]) * (0.5 + 0.5 * Math.sin(s / (R * 0.6) + a1))) * R * (1 + G.Wander * Math.sin(s / (R * 0.23) + a2)) * ends;
                    outer.push({ X: x / n, Y: y / n });
                    inner.push({ X: x / n - nx / len * wide, Y: y / n - ny / len * wide });
                }
                PainterlyNPR__OrganicGrammar__LayGlaze(outer, inner, G.Pigments);
            });
            PainterlyNPR__OrganicGrammar__BushTangle(organic, circle, P, rng, seed, strokes, pushDebug);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Stems and Twigs Caught in the Rim on the Shaded Side
    // ------------------------------------------------------------
    // The scan's rounded bush is a tangle down its shaded side: a line out of the rim,
    // across it and back, the pen going over each. By the sheet, as the rest of it.
    function PainterlyNPR__OrganicGrammar__BushTangle(organic, circle, P, rng, seed, strokes, pushDebug) {
        const Q      =  CLIPPED.Tangle;
        const count  =  Q.Count[organic.Kind] || 0;
        const shade  =  P.filter(p => p.Sil && p.Facing < 0 && p.Up >= Q.Up[0] && p.Up <= Q.Up[1]);
        if (!count || shade.length < 8) return;
        const pxPerMm  =  Gpu.PxPerMm;
        const front    =  circle.Depth - organic.Masses[0].R;                  // <-- Nothing of its own can be nearer than its front
        const seen     =  (x, y) => {
            const id  =  PainterlyNPR__GeometryBuffers__ObjectAt(x, y);
            if (id < 0 || id === organic.ObjectId || (Scene.ObjectById.get(id) || {}).Uid === organic.Uid) return true;
            return PainterlyNPR__GeometryBuffers__DepthAt(x, y) >= front - 0.05;
        };
        for (let i = 0; i < count; i++) {
            const p      =  shade[Math.floor((i + rng.Next()) / count * shade.length)];
            const turn   =  rng.Range(Q.TurnDeg[0], Q.TurnDeg[1]) * Math.PI / 180 * (rng.Chance(0.5) ? 1 : -1);
            const along  =  rng.Chance(0.5) ? 1 : -1;
            const tx = -p.NY * along, ty = p.NX * along;                       // <-- The rim's own line here
            const dx = tx * Math.cos(turn) - ty * Math.sin(turn), dy = tx * Math.sin(turn) + ty * Math.cos(turn);
            const from   =  rng.Range(Q.StartMm[0], Q.StartMm[1]) * pxPerMm, len = rng.Range(Q.LengthMm[0], Q.LengthMm[1]) * pxPerMm, bend = rng.Spread(Q.BendMm[1]) * pxPerMm;
            const x0 = p.X + p.NX * from, y0 = p.Y + p.NY * from;
            for (let pass = 0; pass < 2; pass++) {
                const off  =  (pass - 0.5) * Q.OffMm * pxPerMm;
                let run    =  [];
                const options  =  { Class: 2, Seed: PainterlyNPR__SeededRandom__DeriveSeed(seed, `tangle:${i}:${pass}`), Alpha: 0.92, Loose: 0, TaperIn: 0.2, TaperOut: 0.8, Wobble: 0.2, SpacingMm: 0.3, Dry: 0.1 };
                for (let k = 0; k <= Q.Steps; k++) {
                    const t  =  k / Q.Steps, b = bend * Math.sin(Math.PI * t);
                    const x  =  x0 + dx * len * t - dy * (b + off), y = y0 + dy * len * t + dx * (b + off);
                    if (seen(x, y)) run.push({ X: x, Y: y });
                    else if (run.length) { PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug); run = []; }
                }
                PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__ClippedBush,
        PainterlyNPR__OrganicGrammar__ClippedBushLine,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
