/* =============================================================================
   PAINTERLYNPR - ORGANIC | SHRUB - FLOWERS
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Flowers__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - Shrub - Flowers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Flowers: touches of colour dropped into the foliage as accent dabs
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Roses, lavender, cream, calendula and cornflower, by the accent layers'
     channels.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__LineCandidates__Lines as Lines } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__AccentLayer__Dab } from '../52__Wash__LayerStack/PainterlyNPR__AccentLayer__Pass__.mjs';
import { PainterlyNPR__ArtDirection__FieldAt } from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';

// =============================================================================
// REGION | Shrub - Flowers
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | Flowers - touches of colour dropped into the foliage
    // ------------------------------------------------------------
    // Never drawn bloom by bloom: dabs of pigment, more on the lit side, fewer
    // where the paper is taking the drawing, sized in millimetres of the sheet as
    // a brush is. The accent layer glazes them over the foliage's own wash - G
    // rose, B lavender (upright, as its spikes are, and catmint's), A cream - and a
    // second layer takes calendula (R), white chamomile (G: the green lifted to
    // the paper, with a cream eye dabbed in its heart) and cornflower blue (B).
    // Mixed is a hollyhock's pinks and creams; Hydrangea mopheads, blue and pink.
    function PainterlyNPR__OrganicGrammar__Flowers(organic, circles, seed) {
        const f        =  organic.Flowers;
        const rng      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'flowers'));
        const pxPerMm  =  Gpu.PxPerMm;
        const upright  =  organic.Kind === 'Lavender' || organic.Kind === 'Catmint';
        const channels =  { Rose: 1, Lavender: 2, Cream: 3, Calendula: 4, Chamomile: 5, Cornflower: 6 };
        circles.forEach((c, ci) => {
            const Rmm    =  c.R / pxPerMm;
            const count  =  Math.round(Math.PI * Rmm * Rmm * f.Density * 0.7);
            for (let k = 0; k < count; k++) {
                const a   =  rng.Range(0, Math.PI * 2), d = Math.sqrt(rng.Next()) * c.R * 0.9;
                const x   =  c.X + Math.cos(a) * d, y = c.Y + Math.sin(a) * d;
                const roll     =  rng.Next(), pick = rng.Next(), size = Math.min(rng.Range(f.SizeMm[0], f.SizeMm[1]) * 0.5 * pxPerMm, c.R * 0.3), aspect = rng.Range(0.8, 1.05), depth = rng.Range(0.7, 1.0);
                if (circles.some((o, oi) => oi < ci && Math.hypot(x - o.X, y - o.Y) < o.R)) continue;     // <-- Counted once where masses overlap
                if (PainterlyNPR__GeometryBuffers__ObjectAt(x, y) !== organic.ObjectId) continue;
                if (roll > 0.5 + 0.5 * PainterlyNPR__GeometryBuffers__LightAt(x, y)) continue;
                const field  =  PainterlyNPR__ArtDirection__FieldAt(x, y);
                if (field.Presence < 0.25) continue;
                const pigment  =  f.Pigment === 'Mixed' ? (pick < 0.55 ? 'Rose' : 'Cream') : (f.Pigment === 'Hydrangea' ? (pick < 0.6 ? 'Cornflower' : 'Rose') : f.Pigment);
                const amount   =  Clamp(field.Presence * depth, 0, 1);
                const ch       =  channels[pigment];
                const out      =  ch >= 4 ? Lines.Dabs2 : Lines.Dabs;
                if (upright) PainterlyNPR__AccentLayer__Dab(out, x, y + size * 0.6, size * 0.5, 0, 0, size * 1.5, ch & 3, amount, seed + ci * 977 + k);
                else PainterlyNPR__AccentLayer__Dab(out, x, y, size, 0, 0, size * aspect, ch & 3, amount, seed + ci * 977 + k);
                if (pigment === 'Chamomile') PainterlyNPR__AccentLayer__Dab(Lines.Dabs, x, y, size * 0.3, 0, 0, size * 0.3, 3, amount, seed + ci * 977 + k + 7);   // <-- A daisy's yellow eye, small, so the white ring around it reads
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__Flowers,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
