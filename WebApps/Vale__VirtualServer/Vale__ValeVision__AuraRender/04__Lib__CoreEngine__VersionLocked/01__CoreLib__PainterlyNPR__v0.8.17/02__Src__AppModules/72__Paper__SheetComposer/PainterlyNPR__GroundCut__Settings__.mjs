/* =============================================================================
   PAINTERLYNPR - PAPER | SHEET COMPOSER - GROUND CUT SETTINGS
   =============================================================================

   FILE       : PainterlyNPR__GroundCut__Settings__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - SheetComposer - GroundCut Settings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a ground cut can be - its kinds, colours and controls, from
                Na__GroundCut__Config.json - and the one form its settings are
                kept and resolved in
   CREATED    : 30-Oct-2026 (v0.8.13)

   DESCRIPTION:
   - Adam, 30-Oct-2026, with an elevation viewport cut off at the ground and
     three hand-drawn elevations standing on a swish of wash: "create a special
     effect on elevation viewports when they have the bottom handle brought
     upwards. It effectively becomes a ground plane clipping boundary ... just
     allow the user to right-click and change the ground elevation ground plane
     cutoff effect ... adjust different settings and be able to seed new
     watercolour swishes so it looks realistic and artistic like this".
   - A wrapper never copies any of this: its menu, its panel's labels, ranges,
     readouts and defaults all come from here (Kinds, Colours, Controls,
     Defaults), and it keeps a cut's settings in its own document in the form
     Clean gives.
   - SETTINGS: { Kind, Seed, Flip, Colour, InkLine, Values }. Values holds only
     what has been moved from the kind's starting look, so a better default in
     the config reaches every cut not yet touched. Resolve fills in the rest,
     clamps every number to its control's range and gives a cut with no Seed one
     derived from its identity (a wrapper's viewport id), so it never changes
     until New swish gives it a seed of its own.
   - Changing the kind (WithKind) starts that kind's own look again; the seed and
     Flip are kept.
   - Pure: no DOM, nothing of the render graph. The painter is
     PainterlyNPR__GroundCut__Swish__.mjs.

   ============================================================================= */

import GroundConfig from './Na__GroundCut__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed  as  DeriveSeed,
    PainterlyNPR__SeededRandom__MintSeed    as  MintSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__Interface__FormatFrom as FormatFrom } from '../80__System__HudOverlay/PainterlyNPR__Interface__Formats__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | Sheet Composer - Ground Cut Settings
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GroundCut__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT      =  'PainterlyNPR__GroundCut__Config';
    const KINDS     =  PainterlyNPR__ConfigAccess__Section(GroundConfig, ROOT, 'Kinds', ['Order', 'Default', 'Kinds']);
    const COLOURS   =  PainterlyNPR__ConfigAccess__Section(GroundConfig, ROOT, 'Colours', ['Colours']);
    const CONTROLS  =  PainterlyNPR__ConfigAccess__Section(GroundConfig, ROOT, 'Controls', ['Order', 'Controls']);
    const PAINTING  =  PainterlyNPR__ConfigAccess__Section(GroundConfig, ROOT, 'Painting', ['SeedLabel']);
    const OUTPUT    =  PainterlyNPR__ConfigAccess__Section(GroundConfig, ROOT, 'Output', ['PreviewPxPerMm', 'MaxPixels']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Ranges and the Toggles, and Each Range's Readout
    // ------------------------------------------------------------
    // A readout is the engine's own format (80's FormatFrom), with .Parse to
    // read a typed value back, exactly as the panel's sliders do.
    const RANGE_KEYS   =  CONTROLS.Order.filter(key => CONTROLS.Controls[key].Type === 'Range');
    const TOGGLE_KEYS  =  CONTROLS.Order.filter(key => CONTROLS.Controls[key].Type === 'Toggle');
    const READOUTS     =  Object.fromEntries(RANGE_KEYS.map(key => [key, FormatFrom(CONTROLS.Controls[key].Format)]));
    const DEFAULT_KIND =  KINDS.Default;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What a Cut Can Be
// -----------------------------------------------------------------------------

    // FUNCTION | The Kinds, in the Menu's Order - [{ Key, Label, Hint, Plain }]
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Kinds() {
        return KINDS.Order.map(key => {
            const kind  =  KINDS.Kinds[key];
            return { Key: key, Label: kind.Label, Hint: kind.Hint || '', Plain: !!kind.Plain };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Kind's Colours - [{ Key, Label, Swatch }], the swatch as it lies on white paper
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Colours(kindKey) {
        const kind  =  KINDS.Kinds[kindKey] || KINDS.Kinds[DEFAULT_KIND];
        return (kind.Colours || []).filter(key => COLOURS.Colours[key]).map(key => ({
            Key     :  key,
            Label   :  COLOURS.Colours[key].Label,
            Swatch  :  PainterlyNPR__GroundCut__PigmentHex(key).A,
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Colour's Two Pigments - { A, B } as '#RRGGBB' transmittance (one unit of density on white)
    // ------------------------------------------------------------
    // Material: that material class's own two pigments, so the swish matches
    // the drawing's wash of it. An unknown key falls back on the first colour.
    function PainterlyNPR__GroundCut__PigmentHex(colourKey) {
        const colour    =  COLOURS.Colours[colourKey] || COLOURS.Colours[Object.keys(COLOURS.Colours)[0]];
        const material  =  colour.Material ? MATERIAL_BY_KEY[colour.Material] : null;
        if (material) return { A: material.Pigment, B: material.Pigment2 || material.Pigment };
        return { A: colour.Pigment, B: colour.Pigment2 || colour.Pigment };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Controls, in the Panel's Order - [{ Key, Type, Label, Hint, Min, Max, Step, Readout }]
    // ------------------------------------------------------------
    // Type 'Range' (its value in Values) or 'Toggle' (on the settings).
    // Readout(value) writes it; Readout.Parse(text) reads a typed value back.
    function PainterlyNPR__GroundCut__Controls() {
        return CONTROLS.Order.map(key => {
            const c  =  CONTROLS.Controls[key];
            return { Key: key, Type: c.Type, Label: c.Label, Hint: c.Hint || '', Min: c.Min, Max: c.Max, Step: c.Step, Readout: READOUTS[key] || null };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Densities to Paint At - { PreviewPxPerMm, MaxPixels }
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Output() {
        return { PreviewPxPerMm: OUTPUT.PreviewPxPerMm, MaxPixels: OUTPUT.MaxPixels };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Settings
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number Kept to a Range Control's Min, Max and Step
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Snap(key, value) {
        const c  =  CONTROLS.Controls[key];
        const n  =  Math.min(c.Max, Math.max(c.Min, Number(value)));
        const s  =  c.Step > 0 ? Math.round((n - c.Min) / c.Step) * c.Step + c.Min : n;
        return +Math.min(c.Max, Math.max(c.Min, s)).toFixed(6);                // <-- Off the float's tail: 0.30000000000000004 is 0.3
    }
    // ------------------------------------------------------------


    // FUNCTION | A Kind's Starting Look - { Kind, Colour, InkLine, Values } (a copy)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Defaults(kindKey) {
        const key   =  KINDS.Kinds[kindKey] ? kindKey : DEFAULT_KIND;
        const kind  =  KINDS.Kinds[key];
        return {
            Kind     :  key,
            Colour   :  kind.Colour || null,
            InkLine  :  !!kind.InkLine,
            Values   :  Object.assign({}, kind.Values || {}),
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Settings - every key there, clamped: { Kind, Plain, Seed, Flip, Colour, InkLine, Values }
    // ------------------------------------------------------------
    // settings: the kept form (or null: the default kind's look). identity: a
    // stable name for the cut (a wrapper's viewport id), from which a cut with
    // no Seed of its own takes one.
    function PainterlyNPR__GroundCut__Resolve(settings, identity) {
        const s         =  settings || {};
        const base      =  PainterlyNPR__GroundCut__Defaults(s.Kind);
        const kind      =  KINDS.Kinds[base.Kind];
        const colours   =  kind.Colours || [];
        const values    =  {};
        const moved     =  s.Values || {};
        RANGE_KEYS.forEach(key => {
            const raw  =  Number.isFinite(Number(moved[key])) && moved[key] !== null && moved[key] !== '' ? moved[key] : base.Values[key];
            values[key]  =  PainterlyNPR__GroundCut__Snap(key, Number.isFinite(Number(raw)) ? raw : CONTROLS.Controls[key].Min);
        });
        const seed      =  Number.isFinite(Number(s.Seed)) && s.Seed !== null && s.Seed !== '' ? (Number(s.Seed) >>> 0)
                         : DeriveSeed(0, `${PAINTING.SeedLabel}:${identity || ''}`);
        return {
            Kind     :  base.Kind,
            Plain    :  !!kind.Plain,
            Seed     :  seed,
            Flip     :  !!s.Flip,
            Colour   :  colours.includes(s.Colour) ? s.Colour : base.Colour,
            InkLine  :  typeof s.InkLine === 'boolean' ? s.InkLine : base.InkLine,
            Values   :  values,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Kept Form - only what differs from the kind's starting look
    // ------------------------------------------------------------
    // { Kind, Seed?, Flip?, Colour?, InkLine?, Values? }: what a wrapper writes
    // into its document. A Seed is kept only once one has been given.
    function PainterlyNPR__GroundCut__Clean(settings) {
        const s         =  settings || {};
        const resolved  =  PainterlyNPR__GroundCut__Resolve(s, '');
        const base      =  PainterlyNPR__GroundCut__Defaults(resolved.Kind);
        const kept      =  { Kind: resolved.Kind };
        if (Number.isFinite(Number(s.Seed)) && s.Seed !== null && s.Seed !== '') kept.Seed = resolved.Seed;
        if (resolved.Flip) kept.Flip = true;
        if (resolved.Colour !== base.Colour) kept.Colour = resolved.Colour;
        if (resolved.InkLine !== base.InkLine) kept.InkLine = resolved.InkLine;
        if (resolved.Plain) return kept;
        const values  =  {};
        RANGE_KEYS.forEach(key => {
            const start  =  base.Values[key] === undefined ? undefined : PainterlyNPR__GroundCut__Snap(key, base.Values[key]);
            if (s.Values && s.Values[key] !== undefined && resolved.Values[key] !== start) values[key] = resolved.Values[key];
        });
        if (Object.keys(values).length) kept.Values = values;
        return kept;
    }
    // ------------------------------------------------------------


    // FUNCTION | Another Kind, Its Own Look - the seed and Flip kept
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__WithKind(settings, kindKey) {
        const s     =  settings || {};
        const next  =  { Kind: KINDS.Kinds[kindKey] ? kindKey : DEFAULT_KIND };
        if (s.Seed !== undefined) next.Seed = s.Seed;
        if (s.Flip) next.Flip = true;
        return PainterlyNPR__GroundCut__Clean(next);
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Swish: the same settings with a fresh seed
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__NewSeed(settings) {
        return PainterlyNPR__GroundCut__Clean(Object.assign({}, settings || {}, { Seed: MintSeed() >>> 0 }));
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Painting Depends On, as One Key (a wrapper's cache)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Key(settings, identity) {
        return JSON.stringify(PainterlyNPR__GroundCut__Resolve(settings, identity));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GroundCut__Clean,
        PainterlyNPR__GroundCut__Colours,
        PainterlyNPR__GroundCut__Controls,
        PainterlyNPR__GroundCut__Defaults,
        PainterlyNPR__GroundCut__Key,
        PainterlyNPR__GroundCut__Kinds,
        PainterlyNPR__GroundCut__NewSeed,
        PainterlyNPR__GroundCut__Output,
        PainterlyNPR__GroundCut__PigmentHex,
        PainterlyNPR__GroundCut__Resolve,
        PainterlyNPR__GroundCut__Snap,
        PainterlyNPR__GroundCut__WithKind,
        DEFAULT_KIND  as  PainterlyNPR__GroundCut__DEFAULT_KIND,
        TOGGLE_KEYS   as  PainterlyNPR__GroundCut__TOGGLE_KEYS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
