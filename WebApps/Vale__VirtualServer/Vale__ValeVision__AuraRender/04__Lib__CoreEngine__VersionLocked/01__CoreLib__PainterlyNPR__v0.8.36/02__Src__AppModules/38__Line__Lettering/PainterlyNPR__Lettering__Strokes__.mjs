/* =============================================================================
   PAINTERLYNPR - LINE | LETTERING
   =============================================================================

   FILE       : PainterlyNPR__Lettering__Strokes__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - Lettering
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Lettering as pen strokes - a single-stroke draughting font
                drawn with the lettering pen (0.18 mm)
   CREATED    : 30-Oct-2026 (v0.8.0)

   DESCRIPTION:
   - Each glyph is a few polylines (Na__Lettering__Config.json), handed to stroke
     synthesis as ordinary strokes: the letters' line width is the pen's and
     nothing else, as a draughtsman letters with a technical pen and a stencil.
   - Positions are millimetres on the sheet from its top-left corner, as a
     person reads a sheet; the strokes come back in sheet pixels.

   WHY STROKES, NOT A FONT:
   - Adam's pen specification gives lettering the 0.18 mm pen "where
     stroke-based text is supported". A filled font's glyphs have no line width
     to calibrate; a stroked one is the pen's width by construction.

   ============================================================================= */

import LetteringConfig from './Na__Lettering__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Engine__SHEET_HEIGHT_MM as SHEET_HEIGHT_MM } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__SeededRandom__DeriveSeed } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__TechnicalPens__WidthMm,
    PainterlyNPR__TechnicalPens__LETTERING_TIER  as  LETTERING_TIER,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import { PainterlyNPR__DrawingDiscipline__NEUTRAL_LOCAL as NEUTRAL_LOCAL } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';

// =============================================================================
// REGION | Lettering
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Lettering__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const FONT  =  PainterlyNPR__ConfigAccess__Section(LetteringConfig, 'PainterlyNPR__Lettering__Config', 'Font', ['CapUnits', 'Advance', 'SpaceAdvance', 'Glyphs']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Font
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Glyphs - polylines in font units, y up from the baseline
    // ------------------------------------------------------------
    const CAP_UNITS      =  FONT.CapUnits;
    const ADVANCE        =  FONT.Advance;
    const SPACE_ADVANCE  =  FONT.SpaceAdvance;
    const GLYPHS  =  Object.freeze(Object.fromEntries(Object.entries(FONT.Glyphs).map(([ch, text]) => [ch,
        text.split(';').map(line => line.trim().split(/\s+/).map(p => p.split(',').map(Number)))])));
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lettering
// -----------------------------------------------------------------------------

    // FUNCTION | How Wide a Line of Lettering Is, in Sheet Millimetres
    // ------------------------------------------------------------
    function PainterlyNPR__Lettering__WidthMm(text, heightMm) {
        const unit  =  heightMm / CAP_UNITS;
        let units   =  0;
        for (const ch of String(text)) units += ch === ' ' ? SPACE_ADVANCE : ADVANCE;
        return Math.max(0, units - (ADVANCE - 4)) * unit;                     // <-- The last glyph's gap is not lettering
    }
    // ------------------------------------------------------------


    // FUNCTION | A Line of Lettering as Pen Strokes
    // ------------------------------------------------------------
    // text from (xMm, yMm) - its baseline's left end, from the sheet's top-left -
    // capitals heightMm tall. options: At(xMm, yMm) -> [x, y] sheet pixels (the
    // sheet's own by default), Alpha, Seed, Tier (the lettering pen unless
    // given), Source. A character the font lacks is a space.
    // Each straight piece of a glyph is its own stroke, carried half the pen's
    // width past both ends - the round tip of a tubular nib - so every corner
    // of a letter is full, as a pen letters it, and never pinched as a ribbon
    // turning a sharp corner would be.
    function PainterlyNPR__Lettering__Strokes(text, xMm, yMm, heightMm, options) {
        const o        =  options || {};
        const at       =  o.At || ((x, y) => [x * Gpu.PxPerMm, (SHEET_HEIGHT_MM - y) * Gpu.PxPerMm]);
        const unit     =  heightMm / CAP_UNITS;
        const tier     =  o.Tier != null ? o.Tier : LETTERING_TIER;
        const capMm    =  0.5 * PainterlyNPR__TechnicalPens__WidthMm(tier);  // <-- The nib's radius
        const seed     =  o.Seed != null ? o.Seed : PainterlyNPR__SeededRandom__DeriveSeed(1, 'lettering:' + text);
        const strokes  =  [];
        let penX       =  xMm;
        let k          =  0;
        for (const ch of String(text)) {
            const glyph  =  GLYPHS[ch];
            if (glyph) {
                for (const line of glyph) {
                    for (let j = 0; j < line.length - 1; j++) {
                        const ax = penX + line[j][0] * unit, ay = yMm - line[j][1] * unit;
                        const bx = penX + line[j + 1][0] * unit, by = yMm - line[j + 1][1] * unit;
                        const len  =  Math.hypot(bx - ax, by - ay) || 1;
                        const ux = (bx - ax) / len * capMm, uy = (by - ay) / len * capMm;
                        strokes.push(PainterlyNPR__Lettering__Stroke([at(ax - ux, ay - uy), at(bx + ux, by + uy)], tier, o, PainterlyNPR__SeededRandom__DeriveSeed(seed, 'g' + k++)));
                    }
                }
            }
            penX  +=  (ch === ' ' || !glyph ? SPACE_ADVANCE : ADVANCE) * unit;
        }
        return strokes;
    }

    // ------------------------------------------------------------


    // FUNCTION | One Straight Piece of a Letter, as a Stroke
    // ------------------------------------------------------------
    function PainterlyNPR__Lettering__Stroke(points, tier, o, seed) {
        return {
            Points    :  points,
            Straight  :  points.length === 2,
            StartTrue :  false,
            EndTrue   :  false,
            Tier      :  tier,                                                // <-- Lettering is drawn with the 0.18 mm pen
            WidthMm   :  PainterlyNPR__TechnicalPens__WidthMm(tier),
            Alpha     :  o.Alpha != null ? o.Alpha : 1,
            Dry       :  0,
            Loose     :  0,                                                   // <-- Stencil lettering: no wobble, no drift
            Seed      :  seed,
            TaperIn   :  0,                                                   // <-- No taper: the nib's full width to its round end
            TaperOut  :  0,
            Wobble    :  0,
            Local     :  NEUTRAL_LOCAL,
            Source    :  o.Source || 'Lettering',
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Lettering__Strokes,
        PainterlyNPR__Lettering__WidthMm,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
