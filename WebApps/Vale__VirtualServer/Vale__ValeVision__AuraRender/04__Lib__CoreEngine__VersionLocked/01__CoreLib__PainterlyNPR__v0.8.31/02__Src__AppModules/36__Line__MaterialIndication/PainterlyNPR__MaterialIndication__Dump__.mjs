/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION - DUMP
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__Dump__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication - Dump
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : All that makes a material's depiction, written out as one object:
                each hand, each pattern, the stones' set-out, each patterned
                material's recipe and what every Material point is doing
   CREATED    : 03-Nov-2026 (v0.8.22)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "ensure I have a way to dump that data too so as I can make
     new materials in the future for configurations I like".
   - The object is for reading and for keeping: a look he likes is copied out, and
     its numbers become a new pattern or hand in the configs. Apply takes its Hands
     (and Amount) back into the drawing; the patterns and recipes are config, read
     when the app loads, and only change there.
   - A point's AtItsHeart is the material's hand with the point's moves fully on: the
     numbers to give a new material that looks as that spot does.

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__ENGINE_VERSION as ENGINE_VERSION } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__MaterialAssignment__PatternOf } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Apply__.mjs';
import {
    PainterlyNPR__MaterialDepiction__HandKey,
    PainterlyNPR__MaterialDepiction__Merged,
    PainterlyNPR__MaterialDepiction__Own,
    PainterlyNPR__MaterialDepiction__KEYS        as  KEYS,
    PainterlyNPR__MaterialDepiction__POINT_KEYS  as  POINT_KEYS,
} from './PainterlyNPR__MaterialIndication__Depiction__.mjs';
import { PainterlyNPR__MaterialIndication__INDICATION_PATTERNS as INDICATION_PATTERNS } from './PainterlyNPR__MaterialIndication__Patterns__.mjs';

// =============================================================================
// REGION | Material Indication - Dump
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Config.json
    // ------------------------------------------------------------
    // Each section a copy; only written out, so no key is asked for by name.
    const RUBBLE     =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Rubble', []);
    const DEPICTION  =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Depiction', []);
    const SCHEMA     =  'PainterlyNPR__MaterialDepictionDump';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Dump
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Value as It Reads - no float's tail
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDump__Tidy(v) {
        return +v.toFixed(3);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Material Point, in the Dump
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDump__Point(point) {
        const material  =  point.MaterialId >= 0 && MATERIAL_CLASSES[point.MaterialId] ? MATERIAL_CLASSES[point.MaterialId].Key : null;
        const pattern   =  material ? PainterlyNPR__MaterialAssignment__PatternOf(material) : null;
        const handKey   =  pattern ? PainterlyNPR__MaterialDepiction__HandKey(pattern) : null;
        const moves     =  Object.fromEntries(KEYS.map(key => [key, PainterlyNPR__MaterialDump__Tidy(point[POINT_KEYS[key]] || 0)]));
        const own       =  handKey ? PainterlyNPR__MaterialDepiction__Own(handKey) : null;
        return {
            Number     :  State.Points.indexOf(point) + 1,
            Enabled    :  point.Enabled !== false,
            ActsOn     :  point.Target,
            Material   :  material,
            Hand       :  handKey,
            RadiusMm   :  point.RadiusMm,
            Strength   :  point.Strength,
            Amount     :  point.Amount,
            Seed       :  Math.round((point.DepSeed || 0) + (point.DepSeedStep || 0)),
            Moves      :  moves,
            AtItsHeart :  own ? Object.fromEntries(KEYS.map(key => [key, PainterlyNPR__MaterialDump__Tidy(Clamp(own[key] + moves[key] * point.Strength, 0, 1))])) : null,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Dump - everything that makes a material's depiction, as it is now
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialDump__Object() {
        const patterned  =  MATERIAL_CLASSES.filter(m => PainterlyNPR__MaterialAssignment__PatternOf(m.Key));
        return {
            Schema        :  SCHEMA,
            SchemaVersion :  '1.0.0',
            EngineVersion :  ENGINE_VERSION,
            Seed          :  State.Seed,
            Amount        :  State.Indication.Amount,
            Hands         :  PainterlyNPR__MaterialDepiction__Merged(State.Indication.Depiction),
            Materials     :  Object.fromEntries(patterned.map(m => {
                const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(m.Key);
                return [m.Key, { Pattern: pattern, Hand: PainterlyNPR__MaterialDepiction__HandKey(pattern), Recipe: m }];
            })),
            Points        :  State.Points.filter(p => p.Type === 'Indication').map(PainterlyNPR__MaterialDump__Point),
            Patterns      :  INDICATION_PATTERNS,
            Rubble        :  RUBBLE,
            Depiction     :  DEPICTION,
            Pen           :  { Discipline: State.Discipline, InkFamily: State.InkFamily, PenPreset: State.PenPreset },
            Wash          :  { StoneWash: State.Wash.StoneWash },
        };
    }

    function PainterlyNPR__MaterialDump__Text() {
        return JSON.stringify(PainterlyNPR__MaterialDump__Object(), null, 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | Take a Dump's Hands Back Into the Drawing
    // ------------------------------------------------------------
    // Throws on text that is not a dump, naming what is wrong. The caller redraws.
    function PainterlyNPR__MaterialDump__Apply(text) {
        const dump  =  JSON.parse(text);
        if (!dump || !dump.Hands || typeof dump.Hands !== 'object') throw new Error('it has no Hands');
        State.Indication.Depiction  =  PainterlyNPR__MaterialDepiction__Merged(dump.Hands);
        if (Number.isFinite(dump.Amount)) State.Indication.Amount = dump.Amount;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialDump__Apply,
        PainterlyNPR__MaterialDump__Object,
        PainterlyNPR__MaterialDump__Text,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
