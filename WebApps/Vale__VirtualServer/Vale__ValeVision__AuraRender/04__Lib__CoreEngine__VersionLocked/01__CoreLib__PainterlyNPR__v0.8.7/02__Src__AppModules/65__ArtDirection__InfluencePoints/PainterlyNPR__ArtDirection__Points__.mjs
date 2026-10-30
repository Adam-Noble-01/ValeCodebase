/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | INFLUENCE POINTS
   =============================================================================

   FILE       : PainterlyNPR__ArtDirection__Points__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - InfluencePoints
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Art Direction Points: their types, how one is made, anchored to
                what lies under it, re-placed for a new camera, and which the
                field holds
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Focus, Fade to Paper, Suppress, Line Control, Indication, Discipline, Hatch
     and Line Run-out.
   - A point anchors to the paper or to an object; an object-anchored point
     follows the object when the camera moves.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Art Direction
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here. v0.8.3 - the sheet is
                   A3: a new point's sizes are half as big again, and RefitPoints
                   moves points placed on another sheet onto this one

   ============================================================================= */

import PointsConfig from './Na__ArtDirection__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__MAX_POINTS         as  MAX_POINTS,
    PainterlyNPR__Engine__PREVIOUS_SHEET_MM  as  PREVIOUS_SHEET_MM,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM    as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM     as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__SeededRandom__DeriveSeed } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Index } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Unproject,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Influence Points
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__ArtDirection__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const POINTS  =  PainterlyNPR__ConfigAccess__Section(PointsConfig, 'PainterlyNPR__ArtDirection__Config', 'Points', ['Types', 'LineControlPresets', 'Targets', 'IndicatedMaterials']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Art Direction
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Point Types
    // ------------------------------------------------------------
    // Manifest section 10: Focus keeps architectural detail, ink clarity and local
    // priority - present, a touch heavier, tighter, every class kept; Fade to
    // Paper takes the drawing away, lowest priority first; Line Control holds the
    // manifest's six - weight, pressure, wobble, break-up, silhouette emphasis and
    // overdraw - and looseness. Indication steers material indication: a positive
    // Amount asks for brick courses and tiles where it reaches, a negative one
    // keeps them off. Hatch lays nested tonal hatching in its own direction,
    // turned by a knob on its ring; Detail Suppression strips the subordinate
    // classes where it reaches. Line Run-out lets the pen run on past the paint -
    // past the vignette and any Fade to paper - as an architect's lines run off
    // the side of the page; it acts on the line candidates alone (the field
    // shader passes its code by), so it has no channel to find.
    const POINT_TYPES  =  POINTS.Types;
    const LINE_CONTROL_PRESETS = POINTS.LineControlPresets;
    const POINT_TARGETS  =  POINTS.Targets;
    const INDICATED_MATERIALS  =  POINTS.IndicatedMaterials;
    let NextPointId  =  1;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | A Point's Sizes on the Paper - they grow with the picture
    // ------------------------------------------------------------
    // How far its influence reaches and how far its lines run out are sizes in
    // the composition, so a point moved onto a larger sheet takes them with it.
    // Run-on is the pen's own overshoot past a corner and stays as drawn.
    const POINT_SIZE_KEYS  =  ['RadiusMm', 'RunReachMm'];
    // ------------------------------------------------------------


    // FUNCTION | Make a Point
    // ------------------------------------------------------------
    function PainterlyNPR__ArtDirection__MakePoint(type, mmX, mmY, options) {
        const point  =  Object.assign({
            Id         :  NextPointId++,
            Type       :  type,
            Anchor     :  'Paper',
            Target     :  'Area',
            PaperMm    :  [mmX, mmY],
            World      :  null,
            ObjectId   :  -1,
            MaterialId :  -1,
            RadiusMm   :  type === 'Fade' ? 90 : (type === 'RunOut' ? 110 : (type === 'Indication' ? 45 : 60)),   // <-- On the A3 sheet (v0.8.3): 60, 75, 30 and 40 on the 300 x 200 mm one
            Strength   :  type === 'Fade' ? 0.9 : 1.0,
            LineWeight :  0.75,
            Looseness  :  0.45,
            Wobble     :  1.0,
            Breakup    :  0.0,
            Emphasis   :  1.0,
            Overdraw   :  1.0,
            Pressure   :  1.0,
            HatchAngle   :  45,
            HatchDensity :  0.8,
            HatchReach   :  0.35,
            Discipline :  0.85,                                               // <-- A Discipline point's own setting, 0 Technical to 1 Expressive
            VegLeaves    :  1.0,                                              // <-- Line Control on planting: leaves x, leaf size x, and the hand ('Kind' the plant's own)
            VegLeafSize  :  1.0,
            VegLeafStyle :  'Kind',
            RunReachMm :  80,                                                 // <-- Line Run-out: how far past the paint its lines run, sheet millimetres (55 before A3)
            RunUneven  :  0.55,                                               // <-- How differently each line's length falls: 0 all alike
            RunFade    :  0.6,                                                // <-- The ink lost by the end of a run-out
            RunTaper   :  0.5,                                                // <-- The share of a run-out the pen spends lifting off
            RunBreak   :  0.2,                                                // <-- Gaps in a run-out, more toward its end
            RunVariety :  0.5,                                                // <-- How differently each line ends: 0 every end alike
            RunOnMm    :  10,                                                 // <-- True corners carried on past their ends, sheet millimetres; 0 none
            RunOnShare :  0.5,                                                // <-- How many of those corners
            RunReveal  :  0,                                                  // <-- The line work within it shown as if painted, met by paint or not
            RunLines   :  'All',                                              // <-- Which lines run out: a key of LINE_RUN_CLASSES
            Shape      :  1.0,                                                // <-- Short axis over long: 1 a circle, 0.2 a flat ellipse
            Turn       :  0,                                                  // <-- The long axis, degrees anticlockwise from the sheet's horizontal
            Amount     :  type === 'Indication' ? 0.9 : 0,                    // <-- Indication only: +1 express, -1 suppress
            Enabled    :  true,                                               // <-- Off: kept, with its settings, but out of the field
            Visible    :  true,                                               // <-- Hidden: still acts on the drawing, just not shown on the sheet
            Group      :  '',                                                 // <-- The name of the group it is in, '' for none
        }, options || {});
        // The seed is stored with the point (manifest section 10) and restored with
        // it: derived once at birth, never from the run-time Id counter on recall
        if (typeof point.Seed !== 'number') point.Seed = PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'point:' + point.Id) % 997;
        return point;
    }
    // ------------------------------------------------------------


    // FUNCTION | Anchor a Point to What Lies Under It
    // ------------------------------------------------------------
    // An Object-anchored point stores the world position it was dropped on, and
    // travels with that object when the camera moves (manifest section 10).
    function PainterlyNPR__ArtDirection__AnchorAt(point, mmX, mmY) {
        point.PaperMm  =  [mmX, mmY];
        if (!Cpu.Valid) return;
        const x  =  mmX * Gpu.PxPerMm, y = mmY * Gpu.PxPerMm;
        const i  =  PainterlyNPR__GeometryBuffers__Index(x, y);
        if (i < 0) return;
        const objectId  =  Math.round(Cpu.Geo[i + 1]);
        if (objectId > 0) {
            point.ObjectId    =  objectId;
            point.MaterialId  =  Math.round(Cpu.Geo[i + 2]);
            point.World       =  PainterlyNPR__CameraRig__Unproject(x, y, Cpu.Geo[i]);
        } else if (point.Anchor === 'Object') {
            point.Anchor  =  'Paper';
            point.World   =  null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-place Object-Anchored Points for the Current Camera
    // ------------------------------------------------------------
    function PainterlyNPR__ArtDirection__PlaceObjectPoints() {
        if (!Camera) return;
        for (const point of State.Points) {
            if (point.Anchor !== 'Object' || !point.World) continue;
            const p  =  PainterlyNPR__CameraRig__Project(point.World);
            point.PaperMm  =  [p.X / Gpu.PxPerMm, p.Y / Gpu.PxPerMm];
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Refit Points Placed on Another Sheet - copies, standing over the same part of the drawing
    // ------------------------------------------------------------
    // fromSheetMm is [width, height] of the sheet they were placed on; none (a
    // settings object or a host's saved points from before v0.8.3) is the
    // previous sheet, 300 x 200 mm. A camera's view fills the sheet's height,
    // so on a taller sheet the picture grows by the ratio of the heights about
    // the sheet's centre (cropped or widened at the sides): a point's place and
    // its sizes grow with it. trueScale is for a view whose half-height is set
    // from the sheet's height and a scale (a host's 1:50 elevation): the world
    // keeps its millimetres, so only the centre moves. An object-anchored
    // point's PaperMm is re-placed by the camera anyway; its sizes still grow.
    function PainterlyNPR__ArtDirection__RefitPoints(points, fromSheetMm, trueScale) {
        const from  =  Array.isArray(fromSheetMm) && fromSheetMm[0] > 0 && fromSheetMm[1] > 0 ? fromSheetMm : PREVIOUS_SHEET_MM;
        const k     =  trueScale ? 1 : SHEET_HEIGHT_MM / from[1];
        return (Array.isArray(points) ? points : []).map(p => {
            const q  =  structuredClone(p);
            if (Array.isArray(q.PaperMm) && q.PaperMm.length === 2) {
                q.PaperMm  =  [SHEET_WIDTH_MM / 2 + (Number(q.PaperMm[0]) - from[0] / 2) * k, SHEET_HEIGHT_MM / 2 + (Number(q.PaperMm[1]) - from[1] / 2) * k].map(v => +v.toFixed(4));
            }
            for (const key of POINT_SIZE_KEYS) if (typeof q[key] === 'number') q[key] = +(q[key] * k).toFixed(2);
            return q;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Points the Field Holds - those switched on, in list order
    // ------------------------------------------------------------
    // The field shader and the hatching owners index the same list, so both
    // read it from here: a point switched off frees its slot.
    function PainterlyNPR__ArtDirection__ActivePoints() {
        return State.Points.filter(p => p.Enabled !== false).slice(0, MAX_POINTS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ArtDirection__ActivePoints,
        PainterlyNPR__ArtDirection__AnchorAt,
        PainterlyNPR__ArtDirection__MakePoint,
        PainterlyNPR__ArtDirection__PlaceObjectPoints,
        PainterlyNPR__ArtDirection__RefitPoints,
        INDICATED_MATERIALS   as  PainterlyNPR__ArtDirection__INDICATED_MATERIALS,
        LINE_CONTROL_PRESETS  as  PainterlyNPR__ArtDirection__LINE_CONTROL_PRESETS,
        POINT_TARGETS         as  PainterlyNPR__ArtDirection__POINT_TARGETS,
        POINT_TYPES           as  PainterlyNPR__ArtDirection__POINT_TYPES,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
