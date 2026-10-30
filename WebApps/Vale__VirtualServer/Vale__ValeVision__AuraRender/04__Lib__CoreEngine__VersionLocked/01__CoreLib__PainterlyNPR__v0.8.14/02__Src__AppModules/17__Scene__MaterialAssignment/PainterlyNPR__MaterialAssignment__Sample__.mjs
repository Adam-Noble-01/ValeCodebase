/* =============================================================================
   PAINTERLYNPR - SCENE | MATERIAL ASSIGNMENT - SWATCH SAMPLES
   =============================================================================

   FILE       : PainterlyNPR__MaterialAssignment__Sample__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - MaterialAssignment - Sample
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The sample a material class is drawn on for its swatch in the
                catalogue environment: a block of wall, a slab of ground or a
                mound of planting, built as a stage package
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - What a class is drawn on is what it is for (the config's Samples): a
     block for what buildings are made of, at a stretch of wall's size so its
     courses come out at true gauge; a slab for what the ground is made of; a
     mound of masses for planting, drawn by the organic grammars as any plant;
     a short upright log for bark.
   - The block carries the courses its class lays (Rules.Patterns) on its four
     sides, the paving slab a flagstone path, so a swatch shows what giving
     the class to a face will do.
   - Finished as the assets' stage is (16, FinishStage): the sample becomes the
     shadow casters, a disc of lawn under it. The factory (88) draws it.

   ============================================================================= */

import AssignConfig from './Na__MaterialAssignment__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__SeededRandom__DeriveSeed } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__SemanticModel__CreateBuilder } from '../12__Scene__SemanticModel/PainterlyNPR__SemanticModel__Builder__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__AssetLibrary__FinishStage,
    PainterlyNPR__AssetLibrary__Place,
} from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Placement__.mjs';
import {
    PainterlyNPR__MaterialAssignment__PatternOf,
} from './PainterlyNPR__MaterialAssignment__Apply__.mjs';

// =============================================================================
// REGION | Material Assignment - Swatch Samples
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialAssignment__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const SAMPLES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Samples', ['Slab', 'Mound', 'Log', 'BlockM', 'SlabM', 'MoundM', 'LogM']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Organic Kind a Planting Class Is Drawn As
    // ------------------------------------------------------------
    const MOUND_KIND  =  { Hedge: 'Hedge', Conifer: 'Conifer', TreeFoliage: 'Tree', DistantTrees: 'Tree', MidTrees: 'Tree', Lavender: 'Lavender' };   // <-- Any other is a shrub; grass as a shrub too, its blades need a crown
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Samples
// -----------------------------------------------------------------------------

    // FUNCTION | What a Class Is Drawn On - Block, Slab, Mound or Log
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__SampleKind(key) {
        if (SAMPLES.Slab.includes(key)) return 'Slab';
        if (SAMPLES.Mound.includes(key)) return 'Mound';
        if (SAMPLES.Log.includes(key)) return 'Log';
        return 'Block';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Block of Wall - its courses on all four sides
    // ------------------------------------------------------------
    // Centred on the origin, standing on the ground, its front to +Z. Each side's
    // surface runs left to right as seen from outside it, V up.
    function PainterlyNPR__MaterialAssignment__Block(K, key, label) {
        const [w, h, d]  =  SAMPLES.BlockM;
        const object  =  K.addObject(label, 'Wall', key, 'Architecture');
        K.box([-w / 2, 0, -d / 2], [w / 2, h, d / 2], object, { Bottom: K.P, Top: K.S, Vertical: K.S });
        const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(key);
        if (pattern) {
            const up  =  [0, 1, 0];
            K.addSurface(object, pattern, [-w / 2, 0,  d / 2], [ 1, 0,  0], up, w, h);
            K.addSurface(object, pattern, [ w / 2, 0,  d / 2], [ 0, 0, -1], up, d, h);
            K.addSurface(object, pattern, [ w / 2, 0, -d / 2], [-1, 0,  0], up, w, h);
            K.addSurface(object, pattern, [-w / 2, 0, -d / 2], [ 0, 0,  1], up, d, h);
        }
        return [object];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Slab of Ground - with a flagstone path when it is paving
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Slab(K, key, label) {
        const [w, h, d]  =  SAMPLES.SlabM;
        const object  =  K.addObject(label, 'Hardscape', key, 'Ground');
        K.box([-w / 2, 0, -d / 2], [w / 2, h, d / 2], object, { Top: K.S, Vertical: K.T, Bottom: null });
        if (key === 'Paving') {
            const inset  =  0.06;
            K.pkg.Paths.push({
                ObjectId  :  object.Id,
                Left      :  [[-w / 2 + inset, h, -d / 2 + inset], [w / 2 - inset, h, -d / 2 + inset]],
                Right     :  [[-w / 2 + inset, h,  d / 2 - inset], [w / 2 - inset, h,  d / 2 - inset]],
            });
        }
        return [object];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Log - a short upright trunk, smooth sides
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Log(K, key, label) {
        const [r, h]  =  SAMPLES.LogM;
        const object  =  K.addObject(label, 'Planting', key, 'Planting');
        K.cylinder({ Base: [0, 0, 0], Axis: [0, 1, 0], R0: r, R1: r * 0.9, Height: h, Segments: 18, RimTop: K.S, RimBottom: K.T, Silhouette: K.S, CapTop: true, CapBottom: false }, object);
        return [object];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Mound of Planting - the library's mound, in this class
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Mound(K, key, label) {
        const [w, h]  =  SAMPLES.MoundM;
        return PainterlyNPR__AssetLibrary__Place(K, {
            Uid          :  'S' + MATERIAL_BY_KEY[key].Id,
            AssetId      :  'Material ' + key,
            Name         :  label,
            Position     :  [0, 0, 0],
            RotationDeg  :  0,
            Scale        :  1,
            Seed         :  PainterlyNPR__SeededRandom__DeriveSeed(0, 'swatch:' + key),
            Recipe       :  { Generator: 'Mound', Params: { WidthM: w, HeightM: h, Masses: 8 }, Kind: MOUND_KIND[key] || 'Shrub', Material: key, Role: 'Planting' },
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Class's Sample Stage
    // ------------------------------------------------------------
    // Returns what the assets' stage returns: the packed package, the sample's
    // object Ids and its bounds, so the factory frames it the same way.
    function PainterlyNPR__MaterialAssignment__BuildSample(key) {
        const material  =  MATERIAL_BY_KEY[key];
        if (!material) throw new Error(`[PainterlyNPR MaterialAssignment] no material class ${key}`);
        const K      =  PainterlyNPR__SemanticModel__CreateBuilder();
        const kind   =  PainterlyNPR__MaterialAssignment__SampleKind(key);
        const build  =  { Slab: PainterlyNPR__MaterialAssignment__Slab, Mound: PainterlyNPR__MaterialAssignment__Mound, Log: PainterlyNPR__MaterialAssignment__Log, Block: PainterlyNPR__MaterialAssignment__Block }[kind];
        const objects  =  build(K, key, material.Label);
        return Object.assign(PainterlyNPR__AssetLibrary__FinishStage(K, objects), { Kind: kind });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialAssignment__BuildSample,
        PainterlyNPR__MaterialAssignment__SampleKind,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
