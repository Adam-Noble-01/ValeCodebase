/* =============================================================================
   PAINTERLYNPR - LINE | TECHNICAL PENS - TIERS
   =============================================================================

   FILE       : PainterlyNPR__TechnicalPens__Tiers__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - ClassAndPriority - TechnicalPens
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The four calibrated technical pens (0.13, 0.18, 0.25, 0.35 mm)
                and the rules that decide which one draws each line
   CREATED    : 30-Oct-2026 (v0.8.0)

   DESCRIPTION:
   - The one place a pen width is decided (Na__TechnicalPens__Config.json): every
     stroke producer asks here for its pen, and stroke synthesis draws it at
     exactly that width, in millimetres on the printed sheet.
   - A line's pen comes from what it belongs to (the object's category,
     material and role), raised where the run is its element's silhouette or
     ground line - the strongest pen that applies wins. The Drawing Discipline's
     simplification and Lost in light may take a heavier pen away, never the
     base: every eligible line keeps its 0.13 mm representation.
   - Line class (Primary to Optional) stays what it was - visibility and
     priority: how much presence a line needs, how readily it is lost in light.
     A line's pen is held apart from it.

   WHY ABSOLUTE WIDTHS:
   - Adam, 30-Oct-2026: "These are absolute widths on the final printed sheet.
     They must not be interpreted as offsets or cumulative increases." Presets,
     pressure and the weight sliders change behaviour - ink, path, taper - never
     the width, unless the explicitly non-technical Variable mode is chosen.

   WHY A PRINT DENSITY:
   - Widths become pixels through one number, the pixels a millimetre of the
     printed result covers: the sheet's own (its pixel width / 300 mm) unless a
     host prints the still at another size and says so (SetPrintPxPerMm).

   ============================================================================= */

import PensConfig from './Na__TechnicalPens__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Technical Pens - Tiers
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__TechnicalPens__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT            =  'PainterlyNPR__TechnicalPens__Config';
    const PENS_SECTION    =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Pens', ['Order', 'Pens', 'BasePen', 'LetteringPen']);
    const SEMANTICS       =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Semantics', ['Categories', 'Roles', 'Default', 'PatternClass']);
    const PROMOTIONS      =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Promotions', ['ProfileShare', 'ShadeShare', 'GroundHeightM', 'ProfileAbove', 'GroundAbove', 'ShadeInk']);
    const SIMPLIFICATION  =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Simplification', ['KeepDemotes', 'LostInLightDemotes', 'LitShare']);
    const POINTS          =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Points', ['StepAt']);
    const MODES           =  PainterlyNPR__ConfigAccess__Section(PensConfig, ROOT, 'Modes', ['Default', 'Modes']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Four Pens
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Pens - lightest first, widths in printed millimetres
    // ------------------------------------------------------------
    // A pen's tier is its place in the order: 0 the base. The order is checked
    // here, so a config that names a pen twice or puts a heavier one first fails
    // loudly at load, not as a wrong width on the sheet.
    const PEN_ORDER       =  PENS_SECTION.Order;
    const PENS            =  PENS_SECTION.Pens;
    const TIER_COUNT      =  PEN_ORDER.length;
    const TIER_WIDTH_MM   =  Object.freeze(PEN_ORDER.map(key => PENS[key].WidthMm));
    const TIER_BASE       =  PENS[PENS_SECTION.BasePen].Tier;                 // <-- 0: every eligible stroke is drawn with it in the base buffer
    const LETTERING_TIER  =  PENS[PENS_SECTION.LetteringPen].Tier;            // <-- 1: stroke-built lettering
    const BASE_WIDTH_MM   =  TIER_WIDTH_MM[TIER_BASE];
    const TIER_TOP        =  TIER_COUNT - 1;
    const TIER_STEP       =  Math.pow(TIER_WIDTH_MM[TIER_TOP] / TIER_WIDTH_MM[0], 1 / TIER_TOP);   // <-- About 1.39: the ratio from one pen to the next
    const WIDTH_MODES     =  MODES.Modes;
    const DEFAULT_WIDTH_MODE  =  MODES.Default;
    PEN_ORDER.forEach((key, i) => {
        if (!PENS[key] || PENS[key].Tier !== i) throw new Error(`[PainterlyNPR TechnicalPens] Pen ${key} must be tier ${i}: Order and Tier disagree.`);
        if (i && !(TIER_WIDTH_MM[i] > TIER_WIDTH_MM[i - 1])) throw new Error(`[PainterlyNPR TechnicalPens] Pen ${key} is not wider than the pen before it.`);
    });
    // ------------------------------------------------------------


    // MODULE STATE | The Print Density - the pixels a printed millimetre covers
    // ------------------------------------------------------------
    // Null: the sheet's own (Gpu.PxPerMm, its pixel width over 300 mm). A host
    // that prints a still at another size (a viewport frame on its own paper)
    // sets its density here before rendering, and Bumps 'Lines'.
    const Print  =  { PxPerMm: null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Modes and Density
// -----------------------------------------------------------------------------

    // FUNCTION | Is the Technical Mode On - every width exactly its pen's
    // ------------------------------------------------------------
    function PainterlyNPR__TechnicalPens__Technical() {
        return State.Pen.WidthMode !== 'Variable';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pixels One Printed Millimetre Covers
    // ------------------------------------------------------------
    function PainterlyNPR__TechnicalPens__PxPerMm() {
        return Print.PxPerMm || Gpu.PxPerMm;
    }

    function PainterlyNPR__TechnicalPens__SetPrintPxPerMm(pxPerMm) {
        Print.PxPerMm  =  pxPerMm > 0 ? pxPerMm : null;                       // <-- Anything else returns to the sheet's own
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Which Pen
// -----------------------------------------------------------------------------

    // FUNCTION | A Pen's Tier From Its Key
    // ------------------------------------------------------------
    function PainterlyNPR__TechnicalPens__TierOf(key) {
        const pen  =  PENS[key];
        if (!pen) throw new Error(`[PainterlyNPR TechnicalPens] No pen ${key}: the pens are ${PEN_ORDER.join(', ')}.`);
        return pen.Tier;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Element's Pens - its own, its silhouette's, its ground line's
    // ------------------------------------------------------------
    // From the object's Category, a Material within it, then its Role - which
    // only ever raises the profile pen. Unnamed categories draw with the base.
    function PainterlyNPR__TechnicalPens__Element(object) {
        const category  =  (object && SEMANTICS.Categories[object.Category]) || SEMANTICS.Default;
        const material  =  object && category.Materials ? category.Materials[object.MaterialKey] : null;
        const spec      =  Object.assign({}, category, material || {});
        const pen       =  PainterlyNPR__TechnicalPens__TierOf(spec.Pen);
        let profile     =  spec.Profile ? PainterlyNPR__TechnicalPens__TierOf(spec.Profile) : pen;
        const role      =  object ? SEMANTICS.Roles[object.Role] : null;
        if (role && role.Profile) profile = Math.max(profile, PainterlyNPR__TechnicalPens__TierOf(role.Profile));
        return {
            Pen      :  pen,
            Profile  :  Math.max(pen, profile),
            Ground   :  spec.Ground ? Math.max(pen, PainterlyNPR__TechnicalPens__TierOf(spec.Ground)) : pen,
            Authored :  spec.Authored ? PainterlyNPR__TechnicalPens__TierOf(spec.Authored) : pen,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | An Edge's Pen - the strongest that applies to this run of it
    // ------------------------------------------------------------
    // run: { Profile, Ground } as the line candidates found them. A surface
    // pattern line (an Authored line of the pattern class: plank joints) is the
    // base pen - but not a thin member's two arrises drawn as one line (a glazing
    // bar: the pair merged is Authored, and is joinery). In the technical mode the Silhouettes and Ground line sliders are
    // switches - above their neutral value the promotion happens - and in the
    // variable mode the same: their size multiplies the width there instead.
    // Returns the tier and why, for the Pen tiers view and the tests.
    function PainterlyNPR__TechnicalPens__EdgeTier(edge, object, run) {
        if (edge.Kind === 'Authored' && !edge.Pair && edge.Class >= SEMANTICS.PatternClass) return { Tier: TIER_BASE, Why: 'Pattern' };
        const element  =  PainterlyNPR__TechnicalPens__Element(object);
        const pen      =  State.Pen;
        let tier  =  edge.Kind === 'Authored' ? element.Authored : element.Pen;
        let why   =  'Element';
        if (run.Profile && pen.Profile > PROMOTIONS.ProfileAbove && element.Profile > tier) { tier = element.Profile; why = 'Profile'; }
        if (run.Ground && pen.Ground > PROMOTIONS.GroundAbove && element.Ground > tier) { tier = element.Ground; why = 'Ground'; }
        return { Tier: tier, Why: why };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Point's Weight in Pen Steps
    // ------------------------------------------------------------
    // Each pen is TIER_STEP times the last; a step is taken once the weight is
    // StepAt of the way to the next pen, so x1.2 (a Focus point's touch heavier)
    // stays and x0.75 (a Line Control point's own) goes down one.
    function PainterlyNPR__TechnicalPens__PointSteps(weight) {
        if (!(weight > 0)) return -TIER_TOP;
        const steps  =  Math.log(weight) / Math.log(TIER_STEP);
        const whole  =  Math.floor(Math.abs(steps) + 1 - POINTS.StepAt);
        return whole > 0 ? Math.sign(steps) * whole : 0;
    }

    function PainterlyNPR__TechnicalPens__Shift(tier, steps) {
        return Math.max(TIER_BASE, Math.min(TIER_TOP, tier + steps));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pen Nearest a Width - by ratio, as the pens step
    // ------------------------------------------------------------
    function PainterlyNPR__TechnicalPens__NearestTier(widthMm) {
        let best = TIER_BASE, gap = Infinity;
        TIER_WIDTH_MM.forEach((w, i) => { const d = Math.abs(Math.log(Math.max(widthMm, 1e-6) / w)); if (d < gap) { gap = d; best = i; } });
        return best;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | How Wide
// -----------------------------------------------------------------------------

    // FUNCTION | A Pen's Width - exact in the technical mode
    // ------------------------------------------------------------
    // Variable mode only: the Pen's Hierarchy stretches the steps between the
    // pens about the base (x0 all alike, x1 the pens themselves).
    function PainterlyNPR__TechnicalPens__NominalMm(tier) {
        if (PainterlyNPR__TechnicalPens__Technical()) return TIER_WIDTH_MM[tier];
        return BASE_WIDTH_MM * Math.pow(TIER_WIDTH_MM[tier] / BASE_WIDTH_MM, Math.max(0, State.Pen.Contrast));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Stroke's Width - its pen, and in the variable mode its weights
    // ------------------------------------------------------------
    // variable: the product of the weights that once multiplied every width
    // (silhouette, ground, shadow side, a point's weight, distance). Applied only
    // in the variable mode, and never below the base pen.
    function PainterlyNPR__TechnicalPens__WidthMm(tier, variable) {
        if (PainterlyNPR__TechnicalPens__Technical()) return TIER_WIDTH_MM[tier];
        return Math.max(BASE_WIDTH_MM, PainterlyNPR__TechnicalPens__NominalMm(tier) * (variable > 0 ? variable : 1));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__TechnicalPens__EdgeTier,
        PainterlyNPR__TechnicalPens__Element,
        PainterlyNPR__TechnicalPens__NearestTier,
        PainterlyNPR__TechnicalPens__NominalMm,
        PainterlyNPR__TechnicalPens__PointSteps,
        PainterlyNPR__TechnicalPens__PxPerMm,
        PainterlyNPR__TechnicalPens__SetPrintPxPerMm,
        PainterlyNPR__TechnicalPens__Shift,
        PainterlyNPR__TechnicalPens__Technical,
        PainterlyNPR__TechnicalPens__TierOf,
        PainterlyNPR__TechnicalPens__WidthMm,
        BASE_WIDTH_MM       as  PainterlyNPR__TechnicalPens__BASE_WIDTH_MM,
        DEFAULT_WIDTH_MODE  as  PainterlyNPR__TechnicalPens__DEFAULT_WIDTH_MODE,
        LETTERING_TIER      as  PainterlyNPR__TechnicalPens__LETTERING_TIER,
        PEN_ORDER           as  PainterlyNPR__TechnicalPens__PEN_ORDER,
        PENS                as  PainterlyNPR__TechnicalPens__PENS,
        PROMOTIONS          as  PainterlyNPR__TechnicalPens__PROMOTIONS,
        SIMPLIFICATION      as  PainterlyNPR__TechnicalPens__SIMPLIFICATION,
        TIER_BASE           as  PainterlyNPR__TechnicalPens__TIER_BASE,
        TIER_COUNT          as  PainterlyNPR__TechnicalPens__TIER_COUNT,
        TIER_WIDTH_MM       as  PainterlyNPR__TechnicalPens__TIER_WIDTH_MM,
        WIDTH_MODES         as  PainterlyNPR__TechnicalPens__WIDTH_MODES,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
