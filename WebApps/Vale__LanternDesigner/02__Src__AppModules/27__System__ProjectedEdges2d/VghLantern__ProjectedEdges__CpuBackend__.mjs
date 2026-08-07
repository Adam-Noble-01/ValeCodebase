/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | CPU BACKEND
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__CpuBackend__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - CpuBackend
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drive the whole projection through this module's own kernel
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - The default backend, and the only one guaranteed to be available. It runs on
     every browser, needs no GPU features, and produces the linework the drawing is
     judged against.
   - Nothing here does geometry. It decides the ORDER of the work, what is worth
     keeping between views, and what can be handed to a worker.

   ---------------------------------------------------------------------------

   THE SPLIT THAT MAKES THREE VIEWS CHEAPER THAN ONE AND A HALF

   Work divides cleanly into what belongs to a LANTERN and what belongs to a VIEW,
   and the expensive half turns out to be the first:

       PER LANTERN, done once, cached with the staged model
         Reading every mesh and transforming every vertex to stage space
         Analysing every geometry for hard and candidate silhouette edges
         Finding every line where two solids cut through one another

       PER VIEW, done three times
         Permuting the triangles to face the view, and culling the back faces
         Building the tree over what survives
         Deciding which candidate silhouettes the view actually breaks
         Clipping

   The vendored library had no way to make that split: its entry point takes a scene
   and returns finished linework, so every view repeated all of it. Recovering the
   intersection pass alone takes about thirteen percent off the second and third
   views, and it is a bigger share of a re-render, where the staged model is already
   in hand and nothing else needs doing at all.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Prepare(stage, options, slicer)              -> Promise<prepared>
       ProjectView(prepared, basis, options, run)   -> Promise<{ Segments, Phases }>

   ============================================================================= */

import { VghLantern__ProjectedEdges__StageSampler__Sample } from './VghLantern__ProjectedEdges__StageSampler__.mjs';

import {
    VghLantern__ProjectedEdges__SoupBuilder__AxisMapFromBasis,
    VghLantern__ProjectedEdges__SoupBuilder__BuildViewSoup
} from './VghLantern__ProjectedEdges__SoupBuilder__.mjs';

import {
    VghLantern__ProjectedEdges__EdgeExtractor__ExtractStageEdges,
    VghLantern__ProjectedEdges__EdgeExtractor__ExtractIntersectionEdges,
    VghLantern__ProjectedEdges__EdgeExtractor__ToViewSpace
} from './VghLantern__ProjectedEdges__EdgeExtractor__.mjs';

import { VghLantern__ProjectedEdges__WorkerPool__Run } from './VghLantern__ProjectedEdges__WorkerPool__.mjs';

// =============================================================================
// REGION | Projected Edges CPU Backend Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Phase Names
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Phase Labels Shown on the Progress Overlay
    // ------------------------------------------------------------
    // Written as sentence fragments because the overlay lowercases them and reads
    // them after the view name: "Front elevation - clipping edges".
    const PHASE_SAMPLING      =  'Reading the model';
    const PHASE_INTERSECTING  =  'Finding solid intersections';
    const PHASE_OCCLUDERS     =  'Sorting occluders';
    const PHASE_EDGES         =  'Finding edges';
    const PHASE_CLIPPING      =  'Clipping edges';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per Lantern Preparation
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Model, and Nothing Else
    // ------------------------------------------------------------
    // Split away from the intersection pass on purpose, and the ordering it buys is
    // the whole reason the drawing can respond to an edit in a fraction of a second.
    //
    // Everything the provisional PICTURE of a view needs is here: the vertices, the
    // materials, the meshes. Everything the finished LINEWORK additionally needs -
    // the cut lines between solids, which cost the better part of a second - is in
    // the function below. So a change to the lantern can put a truthful picture on
    // screen while the expensive half is still running, instead of after it.
    //
    // This is deliberately fast enough to run on every edit: a few tens of
    // milliseconds on a full lantern.
    export function VghLantern__ProjectedEdges__CpuBackend__PrepareSample(stage, onPhase) {
        if (typeof onPhase === 'function') onPhase(PHASE_SAMPLING);

        const sampledAt  =  performance.now();
        const sampled    =  VghLantern__ProjectedEdges__StageSampler__Sample(stage);

        return {
            Sampled           : sampled,
            IntersectionEdges : new Float64Array(0),
            HasIntersections  : false,
            TriangleCount     : sampled.Count,
            Report            : {
                SampleMs : Math.round(performance.now() - sampledAt),
                IntersectionMs : 0, IntersectionCount : 0,
                PairsTested : 0, PairsSkipped : 0, SelfReused : 0
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Cut Lines, and Add Them to Prepared Data
    // ------------------------------------------------------------
    // The expensive half, run only when the exact linework is actually wanted.
    // Mutates what PrepareSample produced rather than rebuilding it, so asking for
    // the picture first and the linework afterwards costs no more than asking for
    // the linework alone.
    export async function VghLantern__ProjectedEdges__CpuBackend__PrepareIntersections(prepared, slicer, onPhase) {
        if (prepared.HasIntersections) return prepared;

        if (typeof onPhase === 'function') onPhase(PHASE_INTERSECTING);

        const intersectedAt  =  performance.now();

        prepared.IntersectionEdges  =  await VghLantern__ProjectedEdges__EdgeExtractor__ExtractIntersectionEdges(
            prepared.Sampled.Meshes, slicer, prepared.Report
        );

        prepared.Report.IntersectionMs     =  Math.round(performance.now() - intersectedAt);
        prepared.Report.IntersectionCount  =  Math.floor(prepared.IntersectionEdges.length / 6);
        prepared.HasIntersections          =  true;

        return prepared;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per View Projection
// -----------------------------------------------------------------------------

    // FUNCTION | Project One View From Prepared Lantern Data
    // ------------------------------------------------------------
    // run carries the AbortSignal, the phase callback, worker settings and the
    // scale. The returned segments are already in drawing millimetres and already
    // filtered to the minimum drawable length, so the caller paints them directly.
    export async function VghLantern__ProjectedEdges__CpuBackend__ProjectView(prepared, basis, options, run) {
        const settings  =  run || {};
        const phases    =  [];

        const mark  =  function(name, startedAt) {
            phases.push({ Phase : name, Ms : Math.round(performance.now() - startedAt) });
        };

        const announce  =  function(name) {
            if (typeof settings.OnPhase === 'function') settings.OnPhase(name);
        };

        const axisMap  =  VghLantern__ProjectedEdges__SoupBuilder__AxisMapFromBasis(basis);

        // ------------------------------------------------------
        // Occluders. The permutation is exact, the cull is the corrected
        // one, and the tree is built over what survives rather than over
        // everything that was staged.
        // ------------------------------------------------------
        announce(PHASE_OCCLUDERS);
        let startedAt  =  performance.now();

        const soup  =  VghLantern__ProjectedEdges__SoupBuilder__BuildViewSoup(
            prepared.Sampled, axisMap, { MaxLeafSize : options.BvhMaxLeafSize }
        );
        mark(PHASE_OCCLUDERS, startedAt);

        if (settings.AbortSignal && settings.AbortSignal.aborted) {
            throw new DOMException('Projection aborted', 'AbortError');
        }

        // ------------------------------------------------------
        // Edges. The silhouette depends on where the viewer stands, so the
        // stage space direction that becomes "up" in this view is handed to
        // the extractor. The intersection lines were found once per lantern
        // and only need placing.
        // ------------------------------------------------------
        announce(PHASE_EDGES);
        startedAt  =  performance.now();

        const upAxis  =  axisMap.Source[1];
        const upSign  =  axisMap.Sign[1];

        const stageEdges  =  VghLantern__ProjectedEdges__EdgeExtractor__ExtractStageEdges(
            prepared.Sampled.Meshes, upAxis, upSign, options.AngleThresholdDegrees
        );

        const combined  =  VghLantern__ProjectedEdges__CpuBackend__Concat(
            stageEdges, prepared.IntersectionEdges
        );

        const edges  =  VghLantern__ProjectedEdges__EdgeExtractor__ToViewSpace(
            combined, axisMap, options.EdgeLiftWorldUnits
        );
        mark(PHASE_EDGES, startedAt);

        if (settings.AbortSignal && settings.AbortSignal.aborted) {
            throw new DOMException('Projection aborted', 'AbortError');
        }

        // ------------------------------------------------------
        // Clipping. Everything above exists to make this call small.
        // ------------------------------------------------------
        announce(PHASE_CLIPPING);
        startedAt  =  performance.now();

        const segments  =  await VghLantern__ProjectedEdges__WorkerPool__Run(
            soup,
            edges,
            {
                ScaleDivisor            : options.ScaleDivisor,
                MinimumSegmentLengthMm  : options.MinimumSegmentLengthMm,
                IncludeHiddenEdges      : false
            },
            {
                MaxWorkers              : options.MaxWorkers,
                MinimumEdgesForWorkers  : options.MinimumEdgesForWorkers,
                YieldEveryMs            : options.YieldEveryMs,
                AbortSignal             : settings.AbortSignal
            }
        );
        mark(PHASE_CLIPPING, startedAt);

        return {
            Segments      : segments,
            Phases        : phases,
            EdgeCount     : edges.Count,
            OccluderCount : soup.TriCount,
            StagedCount   : soup.SourceCount
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Join Two Stage Space Edge Buffers
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__CpuBackend__Concat(first, second) {
        if (!second || second.length === 0) return first;
        if (!first  || first.length  === 0) return second;

        const joined  =  new Float64Array(first.length + second.length);
        joined.set(first, 0);
        joined.set(second, first.length);

        return joined;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
