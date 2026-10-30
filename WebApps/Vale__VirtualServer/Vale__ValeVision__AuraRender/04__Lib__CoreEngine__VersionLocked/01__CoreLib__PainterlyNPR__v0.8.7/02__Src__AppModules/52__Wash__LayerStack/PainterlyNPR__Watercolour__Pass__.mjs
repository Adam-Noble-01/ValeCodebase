/* =============================================================================
   PAINTERLYNPR - WASH | LAYER STACK - WATERCOLOUR
   =============================================================================

   FILE       : PainterlyNPR__Watercolour__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - LayerStack - Watercolour
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The washes: material recipes packed for the shaders, the distant
                trees' colours, and the pass that lays every layer
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Transmittance, not opacity: each layer multiplies the paper by its pigment
     raised to its density.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Watercolour
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import WatercolourConfig from './Na__Watercolour__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Hex,
    PainterlyNPR__Maths__Linear,
    PainterlyNPR__Maths__Clamp  as  Clamp,
    PainterlyNPR__Maths__Lerp   as  Lerp,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__SeededRandom__Offset } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY   as  MATERIAL_BY_KEY,
    PainterlyNPR__MaterialClasses__MATERIAL_CLASSES  as  MATERIAL_CLASSES,
    PainterlyNPR__MaterialClasses__MATERIAL_SLOTS    as  MATERIAL_SLOTS,
} from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__BoundaryDistance__DistanceTarget as DistanceTarget } from '../24__Pass__DerivedFields/PainterlyNPR__BoundaryDistance__Pass__.mjs';
import { PainterlyNPR__DrawingDiscipline__HATCH_TAKE as HATCH_TAKE } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__PigmentModel__CLOUD_PIGMENT    as  CLOUD_PIGMENT,
    PainterlyNPR__PigmentModel__FLOWER_PIGMENTS  as  FLOWER_PIGMENTS,
    PainterlyNPR__PigmentModel__MARKER_PIGMENT   as  MARKER_PIGMENT,
    PainterlyNPR__PigmentModel__SHADOW_PIGMENT   as  SHADOW_PIGMENT,
} from '../50__Wash__PigmentModel/PainterlyNPR__PigmentModel__Pigments__.mjs';
import { PainterlyNPR__Paper__Tone } from '../55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
import { PainterlyNPR__SkyClouds__PaintUniforms } from '../60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
import {
    PainterlyNPR__CameraRig__AerialRange,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Layer Stack - Watercolour
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Watercolour__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const DISTANT_TREES  =  PainterlyNPR__ConfigAccess__Section(WatercolourConfig, 'PainterlyNPR__Watercolour__Config', 'DistantTrees', ['Colours']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Watercolour
// -----------------------------------------------------------------------------

    // MODULE STATE | Material Recipes Packed for the Shaders
    // ------------------------------------------------------------
    const Materials  =  { Albedo: null, RecA: null, RecB: null, RecC: null, RecD: null, RecE: null, Display: null, HatchTake: null };

    function PainterlyNPR__Watercolour__PackMaterials() {
        const pack  =  (fn, size) => {
            const arr  =  new Float32Array(MATERIAL_SLOTS * size);
            for (const m of MATERIAL_CLASSES) arr.set(fn(m), m.Id * size);
            return arr;
        };
        const lin  =  (hex) => PainterlyNPR__Maths__Linear(PainterlyNPR__Maths__Hex(hex));
        Materials.Albedo   =  pack(m => PainterlyNPR__Maths__Hex(m.Albedo), 3);
        Materials.RecA     =  pack(m => [...lin(m.Pigment), m.Density], 4);
        Materials.RecB     =  pack(m => [...lin(m.Pigment2), m.Variation], 4);
        Materials.RecC     =  pack(m => [m.Mottle, m.MottleScale, m.Flow, m.Granulation], 4);
        Materials.RecD     =  pack(m => [m.Pooling, m.PoolWidthMm, m.SoftMm, m.Withdraw], 4);
        Materials.RecE     =  pack(m => [m.ReserveLit, m.ShadowTake, m.DryBrush, m.Aerial], 4);
        Materials.Display  =  pack(m => PainterlyNPR__Maths__Hex(m.Albedo).map(c => Clamp((c - 0.5) * 1.35 + 0.5, 0, 1)), 3);
        Materials.HatchTake  =  pack(m => [HATCH_TAKE[m.Key] || 0], 1);
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Distant Trees' Colours - from each one's own recipe, through sage, to warm olive
    // ------------------------------------------------------------
    const DISTANT_COLOURS  =  DISTANT_TREES.Colours;                        // <-- Pen -> 7 · Distant trees -> Colour: 0 is each material's own recipe
    // ------------------------------------------------------------


    // FUNCTION | The Distant Trees' Colour - two linear pigments, and how far from the recipe
    // ------------------------------------------------------------
    function PainterlyNPR__Watercolour__DistantColour(t) {
        const lin  =  (hex) => PainterlyNPR__Maths__Linear(PainterlyNPR__Maths__Hex(hex));
        const c    =  Clamp(t, DISTANT_COLOURS[0].At, 1);
        let i  =  0;
        while (i < DISTANT_COLOURS.length - 2 && c > DISTANT_COLOURS[i + 1].At) i++;
        const a = DISTANT_COLOURS[i], b = DISTANT_COLOURS[i + 1], k = (c - a.At) / (b.At - a.At);
        const walk  =  (p, q) => { const P = lin(p), Q = lin(q); return P.map((v, j) => Lerp(v, Q[j], k)); };
        return { A: walk(a.A, b.A), B: walk(a.B, b.B), Walk: Clamp(t / DISTANT_COLOURS[0].At, 0, 1) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - the Washes
    // ------------------------------------------------------------
    function PainterlyNPR__Watercolour__Run() {
        const T    =  Gpu.Targets;
        const lin  =  (hex) => PainterlyNPR__Maths__Linear(PainterlyNPR__Maths__Hex(hex));
        const w    =  State.Wash;
        PainterlyNPR__GpuResources__Fullscreen(T.Wash, Gpu.Programs.Watercolour, {
            uRegion         :  { t: T.Regions.Textures[0] },
            uSeeds          :  { t: DistanceTarget.Textures[0] },
            uData           :  { t: T.GBuffer.Textures[2] },
            uWorld          :  { t: T.GBuffer.Textures[3] },
            uPaper          :  { t: T.Paper.Textures[0] },
            uField          :  { t: T.Field.Textures[0] },
            uPxPerMm        :  { f: Gpu.PxPerMm },
            uPaperTone      :  { v3: lin(PainterlyNPR__Paper__Tone()) },
            uRecA           :  { v4a: Materials.RecA },
            uRecB           :  { v4a: Materials.RecB },
            uRecC           :  { v4a: Materials.RecC },
            uRecD           :  { v4a: Materials.RecD },
            uRecE           :  { v4a: Materials.RecE },
            uStrength       :  { f: w.Strength },
            uGranulation    :  { f: w.Granulation },
            uPooling        :  { f: w.Pooling },
            uCoffee         :  { f: w.Coffee },
            uWetness        :  { f: w.Wetness },
            uWithdraw       :  { f: w.Withdraw },
            uShadowStrength :  { f: w.Shadow },
            uShadowPigment  :  { v3: lin(SHADOW_PIGMENT) },
            uSkyPigment     :  { v3: lin(MATERIAL_BY_KEY.Sky.Pigment) },
            uCloudPigment   :  { v3: lin(CLOUD_PIGMENT) },
            uSkyStrength    :  { f: State.Sky.Strength },
            uCloudAmount    :  { f: State.Sky.Clouds },
            uHaloMm         :  { f: 1.4 },
            uHorizonPx      :  { f: Camera.HorizonPx },
            uSkyRamp        :  { f: Camera.Ortho ? 0.62 : 0.34 },             // <-- An elevation's "horizon" is its ground line: the sky grades over more of the sheet
            uSkyScale       :  { f: Camera.Ortho ? 0.62 : 1.0 },              // <-- and lighter - an elevation is a drawing first
            uGroundStripMm  :  { f: Camera.Ortho ? 9.0 : 0.0 },
            uDryEdge        :  { f: 0.7 },
            uSeedW          :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'wash-mottle') },
            uSeedS          :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'wash-shadow') },
            uSeedE          :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'wash-edge') },
            uSeedC          :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'sky') },
            uFootprint      :  { v4: [Scene.Footprint[0], Scene.Footprint[1], 0.55, 0] },
            uGlassId        :  { i: MATERIAL_BY_KEY.Glass.Id },
            uLawnId         :  { i: MATERIAL_BY_KEY.Lawn.Id },
            uPavingId       :  { i: MATERIAL_BY_KEY.Paving.Id },
            uRoofId         :  { i: MATERIAL_BY_KEY.ClayTile.Id },
            uRoofGrade      :  { v2: [3.2, 6.6] },                                // <-- World heights: eaves to ridge
            uAerial         :  { v2: PainterlyNPR__CameraRig__AerialRange() },
            uAccent         :  { t: T.Accent.Textures[0] },
            uFlowerRose     :  { v3: lin(FLOWER_PIGMENTS.Rose) },
            uFlowerLavender :  { v3: lin(FLOWER_PIGMENTS.Lavender) },
            uFlowerCream    :  { v3: lin(FLOWER_PIGMENTS.Cream) },
            uAccent2        :  { t: T.Accent2.Textures[0] },
            uFlowerCalendula  :  { v3: lin(FLOWER_PIGMENTS.Calendula) },
            uFlowerCornflower :  { v3: lin(FLOWER_PIGMENTS.Cornflower) },
            uMarker         :  { t: T.Marker.Textures[0] },
            uMarkerPigment  :  { v3: lin(MARKER_PIGMENT) },
            uDoorId         :  { i: MATERIAL_BY_KEY.Joinery.Id },
            uSashId         :  { i: MATERIAL_BY_KEY.WindowPaint.Id },
            uDistantId      :  { i: MATERIAL_BY_KEY.DistantTrees.Id },
            uMidTreesId     :  { i: MATERIAL_BY_KEY.MidTrees.Id },
            uDistantUnfade  :  { f: w.DistantUnfade },
            uDistantLoose   :  { f: w.DistantLoose },
            uDistantColour  :  { f: w.DistantColour },
            uDistantWalk    :  { f: PainterlyNPR__Watercolour__DistantColour(w.DistantColour).Walk },
            uDistantPigA    :  { v3: PainterlyNPR__Watercolour__DistantColour(w.DistantColour).A },
            uDistantPigB    :  { v3: PainterlyNPR__Watercolour__DistantColour(w.DistantColour).B },
            ...PainterlyNPR__SkyClouds__PaintUniforms(),                           // <-- The cloud buffer and its paint (63, 60); nothing without the modules
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
        PainterlyNPR__Watercolour__PackMaterials,
        PainterlyNPR__Watercolour__Run,
        Materials  as  PainterlyNPR__Watercolour__Materials,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
