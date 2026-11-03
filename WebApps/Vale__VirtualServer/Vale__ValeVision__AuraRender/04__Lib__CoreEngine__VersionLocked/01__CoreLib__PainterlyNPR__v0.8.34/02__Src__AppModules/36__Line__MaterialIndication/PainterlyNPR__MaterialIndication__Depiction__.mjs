/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION - DEPICTION
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__Depiction__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication - Depiction
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A material's hand: how its line work is depicted - how loose, how
                random, how rounded, how rough, how broken, how many accents -
                each material's own values, what a Material art direction point
                does to them where it reaches, and a line traced in that hand
   CREATED    : 03-Nov-2026 (v0.8.21)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "add to the materials a way to modulate the material
     linework depiction to be looser, more random or more perfect etc, rounded
     edges, on stonework things like rougher edges, effectively add more control
     so these art points can affect more the stonework and brickwork styles".
   - THE MATERIAL holds its own hand: State.Indication.Depiction, one set of six
     values to a hand (Pen -> Material linework). At its Neutral values (the
     config's) every effect is exactly the pattern as its config section sets it.
   - THE ART DIRECTION POINT adds to it: a Material point (Type 'Indication') moves
     the six by its own DepLoose ... DepAccents where it reaches. The field has no
     channel left, so this reads the points on the CPU, as the planting reads Line
     Control: the point's own unit disc, full to 0.3 and gone by its ring, times
     its strength, and aimed hard at its object or material, as hatching is. Its
     seed (DepSeed, the dice, plus DepSeedStep, the slider) draws another variation
     of the material where it holds: which units are kept and picked, which stones
     stand where (Adam: "Add A Dice in the material art point that rerolls the seed
     for the material so you can quickly cycle differing variations").
   - THE EFFECTS are read wherever a mark is made (Pass, Rubble, RubbleMarks), so a
     new material needs only a hand and these helpers.
   - DETERMINISTIC: every wander and step comes from a seed made of the mark's own
     key, so nothing reshuffles as the camera moves.

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__Clamp        as  Clamp,
    PainterlyNPR__Maths__SmoothStep   as  SmoothStep,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Length     as  V3Length,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
    PainterlyNPR__SeededRandom__Noise1,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__MaterialAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__ArtDirection__ActivePoints } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Material Indication - Depiction
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const DEPICTION  =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Depiction', ['Keys', 'HandOf', 'Neutral', 'Reach']);
    const KEYS       =  DEPICTION.Keys;
    const HAND_OF    =  DEPICTION.HandOf;
    const NEUTRAL    =  DEPICTION.Neutral;
    const REACH      =  DEPICTION.Reach;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Starting Hands, and What a Point Holds for Each Value
    // ------------------------------------------------------------
    const STARTING    =  structuredClone(State.Indication.Depiction);          // <-- Taken before anything can change them: a drawing saved before v0.8.21 is drawn in these
    const POINT_KEYS  =  { Looseness: 'DepLoose', Randomness: 'DepRandom', Rounding: 'DepRound', Roughness: 'DepRough', Breaks: 'DepBreaks', Accents: 'DepAccents' };
    // ------------------------------------------------------------


    // MODULE STATE | The Material Points as They Are Now
    // ------------------------------------------------------------
    // Taken afresh by the indication pass, so it always holds the points as they
    // are. Only those that move a value count: a point that only asks for more or
    // fewer units leaves the hand constant, and the marks straight.
    const Reach  =  { Points: [], Seeded: false };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Hands
// -----------------------------------------------------------------------------

    // FUNCTION | Which Hand a Pattern Draws With
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__HandKey(pattern) {
        return HAND_OF[pattern] || 'Brick';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Material's Own Hand - its saved values over the starting ones
    // ------------------------------------------------------------
    // A wrapper may replace State.Indication with a saved one from before v0.8.21,
    // so every read falls back to the starting values.
    function PainterlyNPR__MaterialDepiction__Own(handKey) {
        const held  =  State.Indication.Depiction && State.Indication.Depiction[handKey];
        return held || STARTING[handKey];
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Material's Hand, a Saved Set Over the Starting Ones
    // ------------------------------------------------------------
    // For a settings object or a dump: an old one with none is the starting hands;
    // a value a later version adds keeps its starting value.
    function PainterlyNPR__MaterialDepiction__Merged(saved) {
        const out  =  structuredClone(STARTING);
        if (!saved || typeof saved !== 'object') return out;
        for (const hand of Object.keys(out)) {
            const from  =  saved[hand];
            if (!from) continue;
            for (const key of KEYS) if (Number.isFinite(from[key])) out[hand][key] = Clamp(from[key], 0, 1);
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Material Points That Move a Hand
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Prepare() {
        const seedOf  =  (p) => Math.round((p.DepSeed || 0) + (p.DepSeedStep || 0));
        Reach.Points  =  PainterlyNPR__ArtDirection__ActivePoints().filter(p => p.Type === 'Indication' && p.Strength > 0 && (seedOf(p) !== 0 || KEYS.some(k => Math.abs(p[POINT_KEYS[k]] || 0) > 0.004))).map(p => {
            const t  =  (p.Turn || 0) * DEG;
            return { P: p, Cos: Math.cos(t), Sin: Math.sin(t), Shape: Math.max(p.Shape == null ? 1 : p.Shape, 0.05), R: Math.max(p.RadiusMm, 1), Seed: seedOf(p) };
        });
        Reach.Seeded  =  Reach.Points.some(r => r.Seed !== 0);
        return Reach.Points.length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Hand Where a Sheet Pixel Falls - the material's own, moved by the points
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__At(handKey, x, y) {
        const own  =  PainterlyNPR__MaterialDepiction__Own(handKey);
        if (!Reach.Points.length) return own;
        let out  =  own;
        for (const r of Reach.Points) {
            const p   =  r.P;
            const dx  =  x / Gpu.PxPerMm - p.PaperMm[0], dy = y / Gpu.PxPerMm - p.PaperMm[1];
            const qx  =  (r.Cos * dx + r.Sin * dy) / r.R, qy = (-r.Sin * dx + r.Cos * dy) / r.Shape / r.R;
            const f0  =  1 - SmoothStep(0.3, 1.0, Math.hypot(qx, qy));
            if (f0 <= 0) continue;
            if (p.Target === 'Object' && p.ObjectId >= 0 && PainterlyNPR__GeometryBuffers__ObjectAt(x, y) !== p.ObjectId) continue;
            if (p.Target === 'Material' && p.MaterialId >= 0 && Math.round(PainterlyNPR__GeometryBuffers__MaterialAt(x, y)) !== p.MaterialId) continue;
            const f  =  Clamp(f0 * p.Strength, 0, 1);
            if (out === own) out = Object.assign({}, own);
            for (const key of KEYS) out[key] = Clamp(out[key] + (p[POINT_KEYS[key]] || 0) * f, 0, 1);
            if (r.Seed !== 0 && f0 >= REACH.SeedHeart) out.Seed = r.Seed;      // <-- The last point in the list wins, as a seed cannot blend
        }
        return out;
    }

    function PainterlyNPR__MaterialDepiction__AtWorld(handKey, point) {
        if (!Reach.Points.length) return PainterlyNPR__MaterialDepiction__Own(handKey);
        const p  =  PainterlyNPR__CameraRig__Project(point);
        return PainterlyNPR__MaterialDepiction__At(handKey, p.X, p.Y);
    }
    // ------------------------------------------------------------


    // FUNCTION | Does This Hand Change From Place to Place? And Does Any Point Hold a Seed?
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Varies() {
        return Reach.Points.length > 0;
    }

    function PainterlyNPR__MaterialDepiction__Seeded() {
        return Reach.Seeded;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Seed to Draw With Under This Hand - the surface's own, or a point's variation of it
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__SeedHere(seed, hand) {
        return hand.Seed ? seed + hand.Seed * REACH.SeedStep : seed;
    }

    function PainterlyNPR__MaterialDepiction__MarkSalt(hand) {
        return hand.Seed ? `:s${hand.Seed}` : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | An Effect's Multiplier - none at 0, exactly one at the hand's neutral, max at 100%
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Times(hand, key, handKey, max) {
        const v  =  hand[key];
        const n  =  NEUTRAL[handKey][key];
        if (n <= 0) return 1 + v * (max - 1);
        if (v <= n) return v / n;
        return n >= 1 ? 1 : 1 + (v - n) / (1 - n) * (max - 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far Past Its Neutral a Value Is - 0 there and below, 1 at 100%
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Over(hand, key, handKey) {
        const n  =  NEUTRAL[handKey][key];
        return n >= 1 ? 0 : Math.max(0, hand[key] - n) / (1 - n);
    }
    // ------------------------------------------------------------


    // FUNCTION | How Much a Value Moves a Stroke's Own Looseness
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__LooseAdd(hand, handKey) {
        return (hand.Looseness - NEUTRAL[handKey].Looseness) * REACH.LooseAdd;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Line in That Hand
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What a Hand Does to a Line Here: [bow, wander, rough], in metres
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Strays(hand, handKey, gaugeM) {
        return [
            REACH.BowShare * gaugeM * PainterlyNPR__MaterialDepiction__Over(hand, 'Looseness', handKey),
            REACH.WanderShare * gaugeM * PainterlyNPR__MaterialDepiction__Over(hand, 'Randomness', handKey),
            REACH.RoughM[handKey] * hand.Roughness,
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Line's Length, and a Point So Far Along It
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDepiction__Lengths(path) {
        const cum  =  [0];
        for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + V3Length(V3Sub(path[i], path[i - 1])));
        return cum;
    }

    function PainterlyNPR__MaterialDepiction__Along(path, cum, s) {
        let i  =  1;
        while (i < cum.length - 1 && cum[i] < s) i++;
        const t  =  (s - cum[i - 1]) / Math.max(cum[i] - cum[i - 1], 1e-9);
        const a  =  path[i - 1], b = path[i];
        return { P: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], D: V3Normalise(V3Sub(b, a)) };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Line Traced in Its Hand: the path, or a new one that bows, wanders and roughens
    // ------------------------------------------------------------
    // path is world points on a surface whose normal is n; gaugeM the course it
    // belongs to, which sizes the bow and the wander. Where the hand asks for
    // nothing the path comes back as it was, so a mark at neutral is the straight
    // line it always was. Each point reads the hand where it falls, so a line
    // crossing a point's ring eases from one hand into the other.
    function PainterlyNPR__MaterialDepiction__Trace(path, n, key, handKey, gaugeM) {
        const cum    =  PainterlyNPR__MaterialDepiction__Lengths(path);
        const total  =  cum[cum.length - 1];
        if (!(total > 1e-4)) return path;
        const atEnd  =  (p) => PainterlyNPR__MaterialDepiction__Strays(PainterlyNPR__MaterialDepiction__AtWorld(handKey, p), handKey, gaugeM).some(v => v > 1e-5);
        const mid    =  PainterlyNPR__MaterialDepiction__Along(path, cum, total / 2).P;
        if (!atEnd(path[0]) && !atEnd(mid) && !atEnd(path[path.length - 1])) return path;

        const a      =  PainterlyNPR__CameraRig__Project(path[0]);
        const b      =  PainterlyNPR__CameraRig__Project(path[path.length - 1]);
        const mPerPx =  total / Math.max(Math.hypot(b.X - a.X, b.Y - a.Y), 1);
        const step   =  Math.max(REACH.StepM, mPerPx * REACH.StepPx);
        const count  =  Math.min(REACH.MaxPoints, Math.max(path.length - 1, Math.ceil(total / step)));
        const seed   =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'hand:' + key);
        const lean   =  PainterlyNPR__SeededRandom__HashUnit(1, seed) < 0.5 ? -1 : 1;
        const out    =  [];
        for (let i = 0; i <= count; i++) {
            const s       =  total * i / count;
            const here    =  PainterlyNPR__MaterialDepiction__Along(path, cum, s);
            const hand    =  PainterlyNPR__MaterialDepiction__AtWorld(handKey, here.P);
            const strays  =  PainterlyNPR__MaterialDepiction__Strays(hand, handKey, gaugeM);
            const side    =  V3Normalise(V3Cross(n, here.D));
            const off     =  strays[0] * lean * Math.sin(Math.PI * i / count) * Math.min(1, total / 1.2)
                          +  strays[1] * (PainterlyNPR__SeededRandom__Noise1(s / 0.9, seed + 7) - 0.5) * 2
                          +  strays[2] * ((PainterlyNPR__SeededRandom__Noise1(s / 0.08, seed + 11) - 0.5) * 1.4 + (PainterlyNPR__SeededRandom__Noise1(s / 0.033, seed + 13) - 0.5) * 0.6);
            out.push([here.P[0] + side[0] * off, here.P[1] + side[1] * off, here.P[2] + side[2] * off]);
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Line's Dashes Where the Pen Lifts: [path, ...], or the one path when it never does
    // ------------------------------------------------------------
    // unitM is the unit it runs along, which sizes the dashes and gaps.
    function PainterlyNPR__MaterialDepiction__Dashes(path, hand, handKey, key, unitM) {
        const b  =  hand.Breaks;
        if (b <= 0.004) return [path];
        const cum    =  PainterlyNPR__MaterialDepiction__Lengths(path);
        const total  =  cum[cum.length - 1];
        const seed   =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'lift:' + key);
        const hash   =  (i) => PainterlyNPR__SeededRandom__HashUnit(i, seed);
        const slice  =  (s0, s1) => {
            const inner  =  [];
            for (let i = 0; i < path.length; i++) if (cum[i] > s0 && cum[i] < s1) inner.push(path[i]);
            return [PainterlyNPR__MaterialDepiction__Along(path, cum, s0).P, ...inner, PainterlyNPR__MaterialDepiction__Along(path, cum, s1).P];
        };
        const pieces  =  [];
        let s  =  total * 0.5 * b * REACH.BreakGap[0] * hash(1);
        for (let i = 2; s < total && i < 400; i += 2) {
            const dash  =  unitM * (REACH.BreakDash[0] + (REACH.BreakDash[1] - REACH.BreakDash[0]) * hash(i)) * (1.15 - b);
            const gap   =  unitM * (REACH.BreakGap[0] + (REACH.BreakGap[1] - REACH.BreakGap[0]) * hash(i + 1)) * b;
            const end   =  Math.min(total, s + dash);
            if (end - s > 1e-3) pieces.push(slice(s, end));
            s  =  end + gap;
        }
        return pieces;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialDepiction__At,
        PainterlyNPR__MaterialDepiction__AtWorld,
        PainterlyNPR__MaterialDepiction__Dashes,
        PainterlyNPR__MaterialDepiction__HandKey,
        PainterlyNPR__MaterialDepiction__LooseAdd,
        PainterlyNPR__MaterialDepiction__MarkSalt,
        PainterlyNPR__MaterialDepiction__Merged,
        PainterlyNPR__MaterialDepiction__Over,
        PainterlyNPR__MaterialDepiction__Own,
        PainterlyNPR__MaterialDepiction__Prepare,
        PainterlyNPR__MaterialDepiction__Seeded,
        PainterlyNPR__MaterialDepiction__SeedHere,
        PainterlyNPR__MaterialDepiction__Times,
        PainterlyNPR__MaterialDepiction__Trace,
        PainterlyNPR__MaterialDepiction__Varies,
        KEYS        as  PainterlyNPR__MaterialDepiction__KEYS,
        NEUTRAL     as  PainterlyNPR__MaterialDepiction__NEUTRAL,
        POINT_KEYS  as  PainterlyNPR__MaterialDepiction__POINT_KEYS,
        REACH       as  PainterlyNPR__MaterialDepiction__REACH,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
