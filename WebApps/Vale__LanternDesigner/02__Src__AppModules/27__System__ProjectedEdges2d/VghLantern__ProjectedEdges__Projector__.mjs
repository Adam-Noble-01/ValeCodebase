/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | PROJECTOR
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__Projector__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - Projector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own how a lantern faces each view, and pick who does the work
   CREATED    : 06-Aug-2026
   REVISED    : 07-Aug-2026 - three backends behind one entry point

   DESCRIPTION:
   - The only place the orientation of a view is defined, and the only place a
     projected point becomes a 2D drawing point.
   - Returns segments already in Env2d drawing space - millimetres, y down - so the
     SVG layer draws them with no fitting, no scaling and no centring. They land on
     top of the authored 2D linework because both are quoting the same numbers.

   ---------------------------------------------------------------------------

   HOW THE ORIENTATION IS DERIVED

   A projection is always taken looking straight down: anything above is visible,
   anything beneath is hidden. That is not a limitation, it is a convention to
   satisfy. The model is turned so that the direction we want to look FROM becomes
   +Y, and the projection falls out correct. Three coordinate systems are in play:

       Model space      millimetres, right handed, +Z up          (SkeletonSolver)
       Stage space      metres, +Y up                             (ConfigAccess__PointToWorld)
                        wx =  mx * s      wy =  mz * s      wz = -my * s
       Env2d drawing    millimetres, y down                       (CoordHelpers)
                        plan   sx = mx, sy = -my
                        front  sx = mx, sy = -mz
                        side   sx = my, sy = -mz

   The stage is built in stage space, so the rotation is expressed there. For each
   view, solve for the basis that puts the viewer on +Y and leaves the projected
   (x, z) pair equal to the Env2d (sx, sy) pair scaled by s:

       View            Viewer sits at      Required basis        e1, e2, e3 map to
       -----------     ---------------     -----------------     ------------------
       plan            stage +Y            identity              +X, +Y, +Z
       frontElevation  stage +Z            rotate X by -90       +X, -Z, +Y
       sideElevation   stage +X            see table below       +Y, -Z, -X

   Every one of the three then shares a single, and pleasingly boring, read back:

       sx = px / s        sy = pz / s

   Which is why the linework needs no alignment step of any kind. If it ever lands
   rotated or mirrored, the fault is in the basis table below and nowhere else.

   ---------------------------------------------------------------------------

   THREE BACKENDS, ONE ANSWER

     cpu       This module's own kernel, spread across a pool of workers. The
               default, available everywhere, and the only one that can reuse work
               between views. Its output is what the drawing is judged against.

     webgpu    The compute shader implementation inside the vendored library. It
               accelerates the occlusion pass alone and cannot use the per lantern
               caching, so it is fastest on a first render and can LOSE to a warm
               cpu backend on the second and third views. Measure before believing.

     legacy    The vendored CPU generator, unchanged, driven exactly as this module
               drove it before the rewrite. Kept for one reason: the DiffHarness
               needs something known-good to compare against, and "what shipped
               before" is the only definition of known-good that matters.

   ---------------------------------------------------------------------------

   PUBLIC API:
       IsViewSupported(viewKey)                       -> boolean
       BuildOptions()                                 -> options read from config
       Prepare(stage, options, slicer, onPhase)       -> Promise<prepared>
       Preview(prepared, viewKey, options)            -> preview image or null
       Project(prepared, stage, viewKey, options, run)-> Promise<{ Segments, Phases }>

   ============================================================================= */

import * as THREE from 'three';
import { ProjectionGenerator } from 'three-edge-projection';

import { VghLantern__Env3d__ConfigAccess__MmToWorld } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';
import { VghLantern__ProjectedEdges__Scheduler__DriveGenerator } from './VghLantern__ProjectedEdges__Scheduler__.mjs';

import {
    VghLantern__ProjectedEdges__CpuBackend__PrepareSample,
    VghLantern__ProjectedEdges__CpuBackend__PrepareIntersections,
    VghLantern__ProjectedEdges__CpuBackend__ProjectView
} from './VghLantern__ProjectedEdges__CpuBackend__.mjs';

import {
    VghLantern__ProjectedEdges__WebGpuBackend__IsAvailable,
    VghLantern__ProjectedEdges__WebGpuBackend__ProjectView
} from './VghLantern__ProjectedEdges__WebGpuBackend__.mjs';

import {
    VghLantern__ProjectedEdges__SoupBuilder__AxisMapFromBasis,
    VghLantern__ProjectedEdges__SoupBuilder__BuildViewSoup
} from './VghLantern__ProjectedEdges__SoupBuilder__.mjs';

import {
    VghLantern__ProjectedEdges__EdgeExtractor__ExtractStageEdges,
    VghLantern__ProjectedEdges__EdgeExtractor__ToViewSpace
} from './VghLantern__ProjectedEdges__EdgeExtractor__.mjs';

import { VghLantern__ProjectedEdges__RasterPreview__Render } from './VghLantern__ProjectedEdges__RasterPreview__.mjs';

// =============================================================================
// REGION | Projected Edges Projector Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Backend Names
    // ------------------------------------------------------------
    export const VGHLANTERN__PROJECTED_EDGES__BACKEND_CPU     =  'cpu';
    export const VGHLANTERN__PROJECTED_EDGES__BACKEND_WEBGPU  =  'webgpu';
    export const VGHLANTERN__PROJECTED_EDGES__BACKEND_LEGACY  =  'legacy';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Orientation Basis Per View
    // ------------------------------------------------------------
    // Matrix4.makeBasis takes the IMAGES of the three stage axes as its columns, so
    // each triple below reads directly as "stage +X goes here, stage +Y goes here,
    // stage +Z goes here". All three are proper rotations - determinant +1, no
    // mirroring - which matters because a mirrored basis would flip the visible and
    // hidden sets and quietly draw the far side of the lantern.
    //
    // Every entry is also a SIGNED PERMUTATION: each column is a unit axis with a
    // sign and nothing else. The CPU backend depends on that, because it turns the
    // model by moving three numbers about rather than by multiplying a matrix, and
    // it will refuse a basis that does not have this shape.
    const VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS  =  {

        // Looking down onto the roof. The library's native orientation already is
        // the plan view, so this is the identity and costs nothing.
        'plan' : {
            XAxisTo : [  1,  0,  0 ],
            YAxisTo : [  0,  1,  0 ],
            ZAxisTo : [  0,  0,  1 ]
        },

        // Looking at the long face. Viewer stands on model -Y, which is stage +Z,
        // so stage +Z is tipped up to +Y and stage +Y falls back to -Z.
        'frontElevation' : {
            XAxisTo : [  1,  0,  0 ],
            YAxisTo : [  0,  0, -1 ],
            ZAxisTo : [  0,  1,  0 ]
        },

        // Looking at the short face. Viewer stands on model +X, which is stage +X,
        // so stage +X is tipped up to +Y and the depth axis takes the page.
        'sideElevation' : {
            XAxisTo : [  0,  1,  0 ],
            YAxisTo : [  0,  0, -1 ],
            ZAxisTo : [ -1,  0,  0 ]
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Configuration
// -----------------------------------------------------------------------------

    // FUNCTION | Whether a 2D View Key Can Be Projected
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Projector__IsViewSupported(viewKey) {
        return !!VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS[viewKey];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Every Setting the Backends Need, Once
    // ------------------------------------------------------------
    // Gathered here rather than read where used, so that one render cannot half
    // apply a setting changed from the console partway through, and so the whole
    // of what governs a projection can be logged as one object when a result looks
    // wrong.
    export function VghLantern__ProjectedEdges__Projector__BuildOptions() {
        const projection   =  VghLantern__ProjectedEdges__ConfigAccess__Section('Projection');
        const performance  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');

        const worldPerMm  =  VghLantern__Env3d__ConfigAccess__MmToWorld(1);

        const requested  =  performance.Backend || VGHLANTERN__PROJECTED_EDGES__BACKEND_CPU;
        const backend    =  VghLantern__ProjectedEdges__Projector__ResolveBackend(requested);

        return {
            Backend                 : backend,
            RequestedBackend        : requested,

            AngleThresholdDegrees   : (typeof projection.AngleThresholdDegrees === 'number') ? projection.AngleThresholdDegrees : 50,
            IncludeIntersectionEdges: projection.IncludeIntersectionEdges === true,
            MinimumSegmentLengthMm  : (typeof projection.MinimumSegmentLengthMm === 'number') ? projection.MinimumSegmentLengthMm : 0,
            IterationTimeMs         : (typeof projection.IterationTimeMs === 'number') ? projection.IterationTimeMs : 30,
            EdgeLiftWorldUnits      : (typeof projection.EdgeLiftWorldUnits === 'number') ? projection.EdgeLiftWorldUnits : 1e-6,

            ScaleDivisor            : worldPerMm || 0.001,

            BvhMaxLeafSize          : (typeof performance.ClipBvhMaxLeafSize === 'number') ? performance.ClipBvhMaxLeafSize : 4,
            MaxWorkers              : (typeof performance.MaxWorkers === 'number') ? performance.MaxWorkers : 8,
            MinimumEdgesForWorkers  : (typeof performance.MinimumEdgesForWorkers === 'number') ? performance.MinimumEdgesForWorkers : 8000,
            YieldEveryMs            : (typeof performance.YieldEveryMs === 'number') ? performance.YieldEveryMs : 250,

            // Only the CPU backend can accept intersection lines found earlier;
            // the other two do their own extraction from the scene and have nowhere
            // to put a result computed in advance, so preparing one would be waste.
            // Note this governs the intersection pass ALONE - every backend still
            // needs the stage sampled, because the preview is drawn from it.
            NeedsIntersectionEdges  : backend === VGHLANTERN__PROJECTED_EDGES__BACKEND_CPU &&
                                      projection.IncludeIntersectionEdges === true
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Settle Which Backend Will Actually Run
    // ------------------------------------------------------------
    // A machine without WebGPU asking for WebGPU gets the CPU backend and a note in
    // the console, rather than an error. The setting records an intent, and the
    // application's job is to honour it where it can.
    function VghLantern__ProjectedEdges__Projector__ResolveBackend(requested) {
        if (requested === VGHLANTERN__PROJECTED_EDGES__BACKEND_WEBGPU) {
            if (VghLantern__ProjectedEdges__WebGpuBackend__IsAvailable()) return VGHLANTERN__PROJECTED_EDGES__BACKEND_WEBGPU;

            console.info('[VghLantern ProjectedEdges] WebGPU was asked for but is not available here; using the CPU backend.');
            return VGHLANTERN__PROJECTED_EDGES__BACKEND_CPU;
        }

        if (requested === VGHLANTERN__PROJECTED_EDGES__BACKEND_LEGACY) return VGHLANTERN__PROJECTED_EDGES__BACKEND_LEGACY;

        return VGHLANTERN__PROJECTED_EDGES__BACKEND_CPU;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per Lantern Preparation
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Model, Cheaply, So a Picture Can Be Drawn
    // ------------------------------------------------------------
    // Cached against the lantern by the Pipeline. Everything the raster preview
    // needs, and nothing that costs real time.
    export function VghLantern__ProjectedEdges__Projector__PrepareSample(stage, onPhase) {
        return VghLantern__ProjectedEdges__CpuBackend__PrepareSample(stage, onPhase);
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Cut Lines Between Solids
    // ------------------------------------------------------------
    // The expensive half, and the reason it is a separate call: it is worth roughly
    // four fifths of a first render, and the preview must not wait behind it.
    export async function VghLantern__ProjectedEdges__Projector__PrepareIntersections(prepared, options, slicer, onPhase) {
        if (!options.NeedsIntersectionEdges) return prepared;

        return VghLantern__ProjectedEdges__CpuBackend__PrepareIntersections(prepared, slicer, onPhase);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Provisional Preview
// -----------------------------------------------------------------------------

    // FUNCTION | Produce the Instant Picture for One View
    // ------------------------------------------------------------
    // Same triangles, same direction, same millimetres as the exact projection is
    // about to produce - but answered by the depth buffer in a few milliseconds
    // instead of by the clip kernel in a second or two.
    //
    // No tree is built and the intersection lines are left out: neither changes
    // what a picture at this resolution looks like, and both cost more than the
    // whole of the rest of this function.
    //
    // Returns null rather than throwing on any difficulty. A missing preview costs
    // nothing but the wait it was there to cover.
    export function VghLantern__ProjectedEdges__Projector__Preview(prepared, viewKey, options) {
        const basis  =  VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS[viewKey];
        if (!basis || !prepared) return null;

        try {
            const axisMap  =  VghLantern__ProjectedEdges__SoupBuilder__AxisMapFromBasis(basis);

            const soup  =  VghLantern__ProjectedEdges__SoupBuilder__BuildViewSoup(
                prepared.Sampled, axisMap, { SkipTree : true }
            );

            const stageEdges  =  VghLantern__ProjectedEdges__EdgeExtractor__ExtractStageEdges(
                prepared.Sampled.Meshes, axisMap.Source[1], axisMap.Sign[1], options.AngleThresholdDegrees
            );

            const edges  =  VghLantern__ProjectedEdges__EdgeExtractor__ToViewSpace(
                stageEdges, axisMap, options.EdgeLiftWorldUnits
            );

            const appearance  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Preview');

            return VghLantern__ProjectedEdges__RasterPreview__Render(soup, edges, {
                ScaleDivisor : options.ScaleDivisor,
                MaxPixels    : appearance.MaxPixels,
                FillColour   : appearance.FillColour,
                LineColour   : appearance.LineColour
            });
        } catch (previewError) {
            console.warn('[VghLantern ProjectedEdges] Preview skipped for ' + viewKey + ':', previewError);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Projection
// -----------------------------------------------------------------------------

    // FUNCTION | Project One View Through the Chosen Backend
    // ------------------------------------------------------------
    // run carries { AbortSignal, OnPhase }. The returned segments are in drawing
    // millimetres whichever backend produced them, which is the whole point of
    // routing all three through this one function.
    export async function VghLantern__ProjectedEdges__Projector__Project(prepared, stage, viewKey, options, run) {
        const basis  =  VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS[viewKey];
        if (!basis) return { Segments : new Float32Array(0), Phases : [] };

        if (options.Backend === VGHLANTERN__PROJECTED_EDGES__BACKEND_WEBGPU) {
            try {
                return await VghLantern__ProjectedEdges__WebGpuBackend__ProjectView(stage, basis, options, run);
            } catch (gpuError) {
                if (gpuError && gpuError.name === 'AbortError') throw gpuError;

                console.warn('[VghLantern ProjectedEdges] WebGPU projection failed, falling back to the CPU backend:', gpuError);
                // Fall through. The prepared data may be missing its intersection
                // lines, because the GPU path said it did not need them - so this
                // one view is drawn without them rather than pausing to find them.
            }
        }

        if (options.Backend === VGHLANTERN__PROJECTED_EDGES__BACKEND_LEGACY) {
            return VghLantern__ProjectedEdges__Projector__ProjectLegacy(stage, basis, options, run);
        }

        return VghLantern__ProjectedEdges__CpuBackend__ProjectView(prepared, basis, options, run);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Legacy Vendored Path
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Wrap a Staged Model in the Orientation for One View
    // ------------------------------------------------------------
    // matrixAutoUpdate is switched off and the matrix written directly rather than
    // going through position, quaternion and scale. The basis entries are exact
    // integers; decomposing them into a quaternion and recomposing would introduce
    // floating point dust into what is a perfectly clean 90 degree turn.
    function VghLantern__ProjectedEdges__Projector__Orient(stage, basis) {
        const oriented  =  new THREE.Group();
        oriented.name   =  'VghLantern__ProjectedEdges__Oriented';

        oriented.matrixAutoUpdate  =  false;
        oriented.matrix.makeBasis(
            new THREE.Vector3(basis.XAxisTo[0], basis.XAxisTo[1], basis.XAxisTo[2]),
            new THREE.Vector3(basis.YAxisTo[0], basis.YAxisTo[1], basis.YAxisTo[2]),
            new THREE.Vector3(basis.ZAxisTo[0], basis.ZAxisTo[1], basis.ZAxisTo[2])
        );

        oriented.add(stage);
        oriented.updateMatrixWorld(true);                                     // <-- The edge generator reads mesh.matrixWorld; nothing renders this

        return oriented;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Convert Vendored Output to Drawing Millimetres
    // ------------------------------------------------------------
    // The library emits a flat position buffer of (x, 0, z) triples, consecutive
    // pairs forming one segment. Only x and z carry information, and both are in
    // stage units, so one divide by the world-per-millimetre scale returns them to
    // the drawing space every Env2d renderer already works in.
    function VghLantern__ProjectedEdges__Projector__ToDrawingSegments(positionArray, options) {
        const minimumLengthSq  =  options.MinimumSegmentLengthMm * options.MinimumSegmentLengthMm;
        const scaleDivisor     =  options.ScaleDivisor;

        const segmentCount  =  Math.floor(Math.floor(positionArray.length / 3) / 2);
        const kept          =  new Float32Array(segmentCount * 4);
        let   writeIndex    =  0;

        for (let i = 0; i < segmentCount; i++) {
            const a  =  i * 6;
            const b  =  a + 3;

            const x0  =  positionArray[a]     / scaleDivisor;
            const y0  =  positionArray[a + 2] / scaleDivisor;
            const x1  =  positionArray[b]     / scaleDivisor;
            const y1  =  positionArray[b + 2] / scaleDivisor;

            const dx  =  x1 - x0;
            const dy  =  y1 - y0;
            if (((dx * dx) + (dy * dy)) < minimumLengthSq) continue;

            kept[writeIndex++]  =  x0;
            kept[writeIndex++]  =  y0;
            kept[writeIndex++]  =  x1;
            kept[writeIndex++]  =  y1;
        }

        return kept.slice(0, writeIndex);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Project Through the Unmodified Vendored Generator
    // ------------------------------------------------------------
    // Kept working so there is always something to compare against. This is the
    // code path that produced the linework everybody agreed was correct, and the
    // DiffHarness exists to hold the rewrite to it.
    async function VghLantern__ProjectedEdges__Projector__ProjectLegacy(stage, basis, options, run) {
        const settings  =  run || {};
        const oriented  =  VghLantern__ProjectedEdges__Projector__Orient(stage, basis);

        const generator  =  new ProjectionGenerator();
        generator.angleThreshold            =  options.AngleThresholdDegrees;
        generator.iterationTime             =  options.IterationTimeMs;
        generator.includeIntersectionEdges  =  options.IncludeIntersectionEdges;

        const phases  =  [];
        let   current   =  null;
        let   startedAt =  performance.now();

        const onProgress  =  function(percent, message) {
            if (message === current) return;

            if (current !== null) phases.push({ Phase : current, Ms : Math.round(performance.now() - startedAt) });
            current    =  message;
            startedAt  =  performance.now();

            if (typeof settings.OnPhase === 'function') settings.OnPhase(message);
        };

        try {
            const task    =  generator.generate(oriented, { onProgress : onProgress });
            const result  =  await VghLantern__ProjectedEdges__Scheduler__DriveGenerator(
                task, options.YieldEveryMs, settings.AbortSignal
            );

            if (current !== null) phases.push({ Phase : current, Ms : Math.round(performance.now() - startedAt) });

            const geometry  =  result.visibleEdges.getLineGeometry();
            const position  =  geometry.attributes ? geometry.attributes.position : null;

            return {
                Segments : position
                    ? VghLantern__ProjectedEdges__Projector__ToDrawingSegments(position.array, options)
                    : new Float32Array(0),
                Phases   : phases
            };
        } finally {
            oriented.remove(stage);                                           // <-- Hand the stage back for the next view
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
