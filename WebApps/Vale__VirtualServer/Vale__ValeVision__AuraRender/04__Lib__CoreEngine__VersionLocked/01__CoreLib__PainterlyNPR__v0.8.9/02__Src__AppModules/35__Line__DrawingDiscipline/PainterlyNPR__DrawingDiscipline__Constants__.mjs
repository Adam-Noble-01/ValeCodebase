/* =============================================================================
   PAINTERLYNPR - LINE | DRAWING DISCIPLINE - CONSTANTS
   =============================================================================

   FILE       : PainterlyNPR__DrawingDiscipline__Constants__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - DrawingDiscipline - Constants
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The line classes, the four stops of the Drawing Discipline, and
                the Pen: every line control, its defaults and presets
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure constants, no imports but JSON: the state reads the Pen's defaults at
     load time.
   - A line class has no width (v0.8.0): the four technical pens are decided in
     32__Line__ClassAndPriority (Na__TechnicalPens__Config.json). The Pen's
     WidthMode default is read from there, so it has one home.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Module Constants and Config / Line
                   Hierarchy and the Drawing Discipline
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import DisciplineConfig from './Na__DrawingDiscipline__Config.json' with { type: 'json' };
import PensConfig from '../32__Line__ClassAndPriority/Na__TechnicalPens__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Drawing Discipline - Constants
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__DrawingDiscipline__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const LINE_CLASSES  =  PainterlyNPR__ConfigAccess__Section(DisciplineConfig, 'PainterlyNPR__DrawingDiscipline__Config', 'LineClasses', ['Names', 'Ink', 'Fade', 'Lost', 'PairMergeMm', 'Debug', 'DebugSimplified', 'DebugConstruction', 'DebugHatch']);
    const ROLES         =  PainterlyNPR__ConfigAccess__Section(DisciplineConfig, 'PainterlyNPR__DrawingDiscipline__Config', 'Roles', ['Looseness']);
    const DISCIPLINE    =  PainterlyNPR__ConfigAccess__Section(DisciplineConfig, 'PainterlyNPR__DrawingDiscipline__Config', 'Discipline', ['Stops']);
    const PEN           =  PainterlyNPR__ConfigAccess__Section(DisciplineConfig, 'PainterlyNPR__DrawingDiscipline__Config', 'Pen', ['Defaults', 'LegacyKeys', 'Presets', 'NeutralLocal', 'HatchTake']);
    const VEGETATION    =  PainterlyNPR__ConfigAccess__Section(DisciplineConfig, 'PainterlyNPR__DrawingDiscipline__Config', 'Vegetation', ['Presets']);
    const PEN_MODES     =  PainterlyNPR__ConfigAccess__Section(PensConfig, 'PainterlyNPR__TechnicalPens__Config', 'Modes', ['Default']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Line Hierarchy and the Drawing Discipline
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Line Classes
    // ------------------------------------------------------------
    // Visibility and priority, not width: a class sets how much presence it
    // needs to survive - optional detail is lost to the paper first, primary
    // profiles last (manifest section 06, Line Hierarchy) - and its ink. The pen a
    // line is drawn with is decided apart, in 32's technical pens.
    const LINE_CLASS_NAMES    =  LINE_CLASSES.Names;
    const LINE_CLASS_INK      =  LINE_CLASSES.Ink;
    const LINE_CLASS_FADE     =  LINE_CLASSES.Fade;
    const LINE_CLASS_DEBUG    =  LINE_CLASSES.Debug;
    const LINE_DEBUG_SIMPLIFIED  =  LINE_CLASSES.DebugSimplified;            // <-- Visible, but simplified away or lost to the paper
    const ROLE_LOOSENESS      =  ROLES.Looseness;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Drawing Discipline Macro
    // ------------------------------------------------------------
    // Four named stops on one continuous control (manifest section 06, Global
    // Macro). It is many parameters moving together, not one noise amplitude: as
    // the drawing loosens, low-priority lines are simplified away FIRST (Keep, by
    // class), and only then do the survivors wobble, overshoot and overdraw. The
    // Pen tab's sliders MULTIPLY these values (x1 is the macro's own reading), so
    // the macro stays the macro and every parameter can still be modulated alone.
    // ConstructionChance: a true corner of a primary line runs on as a faint
    // construction line. DwellChance: the pen rests where it lands, leaving a dot
    // of ink. FlickChance: the pen leaves the paper with a hook.
    const DISCIPLINE_STOPS = DISCIPLINE.Stops;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Pen - every line control, its defaults and presets
    // ------------------------------------------------------------
    // The four levels of pen work in manifest section 06, each with its controls:
    // 1 WHICH LINES EXIST (Detail, Lost in light, Depth fade, Construction),
    // 2 WEIGHT AND EMPHASIS (Contrast between the classes, Silhouettes, Ground
    // line, Shadow side, Ink density), 3 THE PATH (Wobble, Drift, Tremor,
    // Overshoot, Missed joins, Searching lines) and 4 THE MARK (Pressure, Taper,
    // Dwell, Flick, Breaks, the nib), then TONE - nested hatching, and
    // VEGETATION (manifest section 07): how much of each plant's silhouette the
    // pen traces and in what hand, its leaves, its shade, its branches and twigs.
    // Discipline, ink family, line weight and dry ink keep their older homes.
    const PEN_DEFAULTS = Object.freeze(Object.assign({}, PEN.Defaults, { WidthMode: PEN_MODES.Default }));   // <-- Technical pens unless the variable mode is chosen; presets keep it
    const PEN_LEGACY_KEYS  =  PEN.LegacyKeys;
    const PEN_PRESETS = PEN.Presets;
    // Vegetation presets set the plants' keys only, from their defaults: the rest
    // of the Pen stays as it is
    const VEG_PRESETS = VEGETATION.Presets;
    const LINE_CLASS_LOST          =  LINE_CLASSES.Lost;                    // <-- How readily each class is lost in light: primary profiles resist
    const LINE_PAIR_MERGE_MM       =  LINE_CLASSES.PairMergeMm;             // <-- A thin member's two arrises closer than this on the sheet are drawn as one line down its middle, as a hand draws a glazing bar
    const LINE_DEBUG_CONSTRUCTION  =  LINE_CLASSES.DebugConstruction;
    const LINE_DEBUG_HATCH         =  LINE_CLASSES.DebugHatch;
    const NEUTRAL_LOCAL            =  Object.freeze(PEN.NeutralLocal);
    // Which materials take shadow hatching, and how readily. Glass, metal and
    // every planting are left to their washes and their own grammars.
    const HATCH_TAKE  =  PEN.HatchTake;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        DISCIPLINE_STOPS         as  PainterlyNPR__DrawingDiscipline__DISCIPLINE_STOPS,
        HATCH_TAKE               as  PainterlyNPR__DrawingDiscipline__HATCH_TAKE,
        LINE_CLASS_DEBUG         as  PainterlyNPR__DrawingDiscipline__LINE_CLASS_DEBUG,
        LINE_CLASS_FADE          as  PainterlyNPR__DrawingDiscipline__LINE_CLASS_FADE,
        LINE_CLASS_INK           as  PainterlyNPR__DrawingDiscipline__LINE_CLASS_INK,
        LINE_CLASS_LOST          as  PainterlyNPR__DrawingDiscipline__LINE_CLASS_LOST,
        LINE_DEBUG_CONSTRUCTION  as  PainterlyNPR__DrawingDiscipline__LINE_DEBUG_CONSTRUCTION,
        LINE_DEBUG_HATCH         as  PainterlyNPR__DrawingDiscipline__LINE_DEBUG_HATCH,
        LINE_DEBUG_SIMPLIFIED    as  PainterlyNPR__DrawingDiscipline__LINE_DEBUG_SIMPLIFIED,
        LINE_PAIR_MERGE_MM       as  PainterlyNPR__DrawingDiscipline__LINE_PAIR_MERGE_MM,
        NEUTRAL_LOCAL            as  PainterlyNPR__DrawingDiscipline__NEUTRAL_LOCAL,
        PEN_DEFAULTS             as  PainterlyNPR__DrawingDiscipline__PEN_DEFAULTS,
        PEN_LEGACY_KEYS          as  PainterlyNPR__DrawingDiscipline__PEN_LEGACY_KEYS,
        PEN_PRESETS              as  PainterlyNPR__DrawingDiscipline__PEN_PRESETS,
        ROLE_LOOSENESS           as  PainterlyNPR__DrawingDiscipline__ROLE_LOOSENESS,
        VEG_PRESETS              as  PainterlyNPR__DrawingDiscipline__VEG_PRESETS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
