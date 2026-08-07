/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | PROJECTOR
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__Projector__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - Projector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orient a staged 3D model per view and project it to 2D linework
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The only place three-edge-projection is called, and the only place a projected
     world point becomes a 2D drawing point.
   - Returns segments already in Env2d drawing space - millimetres, y down - so the
     SVG layer draws them with no fitting, no scaling and no centring. They land on
     top of the authored 2D linework because both are quoting the same numbers.

   ---------------------------------------------------------------------------

   HOW THE ORIENTATION IS DERIVED

   three-edge-projection projects along a FIXED direction. ProjectionGenerator sets
   EdgeGenerator.projectionDirection to (0, 1, 0) and its line writer emits only the
   x and z components, so the library always looks straight down world +Y onto the
   XZ plane and always hands back points of the form (x, 0, z). Anything above is
   visible, anything beneath is hidden.

   That is not a limitation, it is a convention to satisfy. The model is rotated so
   that the direction we want to look FROM becomes +Y, and the projection falls out
   correct. Three coordinate systems are in play:

       Model space      millimetres, right handed, +Z up          (SkeletonSolver)
       Env3d world      metres, +Y up                             (ConfigAccess__PointToWorld)
                        wx =  mx * s      wy =  mz * s      wz = -my * s
       Env2d drawing    millimetres, y down                       (CoordHelpers)
                        plan   sx = mx, sy = -my
                        front  sx = mx, sy = -mz
                        side   sx = my, sy = -mz

   The stage is built in Env3d world space, so the rotation is expressed there. For
   each view, solve for the basis that puts the viewer on +Y and leaves the
   library's own (x, z) output equal to the Env2d (sx, sy) pair scaled by s:

       View            Viewer sits at      Required basis        e1, e2, e3 map to
       -----------     ---------------     -----------------     ------------------
       plan            world +Y            identity              +X, +Y, +Z
       frontElevation  world +Z            rotate X by -90       +X, -Z, +Y
       sideElevation   world +X            see table below       +Y, -Z, -X

   Every one of the three then shares a single, and pleasingly boring, read back:

       sx = px / s        sy = pz / s

   Which is why the blue linework needs no alignment step of any kind. If it ever
   lands rotated or mirrored, the fault is in the basis table below and nowhere else.

   ---------------------------------------------------------------------------

   PUBLIC API:
       IsViewSupported(viewKey)                  -> boolean
       Project(stage, viewKey, signal)           -> Promise<{ Segments, Phases }>
                                                    Segments is [x0,y0,x1,y1, ...]
                                                    in drawing millimetres

   ============================================================================= */

import * as THREE from 'three';
import { ProjectionGenerator } from 'three-edge-projection';

import { VghLantern__Env3d__ConfigAccess__MmToWorld } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';
import { VghLantern__ProjectedEdges__Scheduler__DriveGenerator } from './VghLantern__ProjectedEdges__Scheduler__.mjs';

// =============================================================================
// REGION | Projected Edges Projector Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Keys, Matching Env2d__CoordHelpers
    // ------------------------------------------------------------
    const VIEW_PLAN             =  'plan';
    const VIEW_FRONT_ELEVATION  =  'frontElevation';
    const VIEW_SIDE_ELEVATION   =  'sideElevation';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Orientation Basis Per View
    // ------------------------------------------------------------
    // Matrix4.makeBasis takes the IMAGES of the three world axes as its columns, so
    // each triple below reads directly as "world +X goes here, world +Y goes here,
    // world +Z goes here". All three are proper rotations - determinant +1, no
    // mirroring - which matters because a mirrored basis would flip the library's
    // visible and hidden sets and quietly draw the far side of the lantern.
    const VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS  =  {

        // Looking down onto the roof. The library's native orientation already is
        // the plan view, so this is the identity and costs nothing.
        'plan' : {
            XAxisTo : [  1,  0,  0 ],
            YAxisTo : [  0,  1,  0 ],
            ZAxisTo : [  0,  0,  1 ]
        },

        // Looking at the long face. Viewer stands on model -Y, which is Env3d world
        // +Z, so world +Z is tipped up to +Y and world +Y falls back to -Z.
        'frontElevation' : {
            XAxisTo : [  1,  0,  0 ],
            YAxisTo : [  0,  0, -1 ],
            ZAxisTo : [  0,  1,  0 ]
        },

        // Looking at the short face. Viewer stands on model +X, which is Env3d world
        // +X, so world +X is tipped up to +Y and the depth axis takes the page.
        'sideElevation' : {
            XAxisTo : [  0,  1,  0 ],
            YAxisTo : [  0,  0, -1 ],
            ZAxisTo : [ -1,  0,  0 ]
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orientation
// -----------------------------------------------------------------------------

    // FUNCTION | Whether a 2D View Key Can Be Projected
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Projector__IsViewSupported(viewKey) {
        return !!VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS[viewKey];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap a Staged Model in the Orientation for One View
    // ------------------------------------------------------------
    // matrixAutoUpdate is switched off and the matrix written directly rather than
    // going through position, quaternion and scale. The basis entries are exact
    // integers; decomposing them into a quaternion and recomposing would introduce
    // floating point dust into what is a perfectly clean 90 degree turn.
    function VghLantern__ProjectedEdges__Projector__Orient(stage, viewKey) {
        const basis  =  VGHLANTERN__PROJECTED_EDGES__VIEW_BASIS[viewKey];
        if (!basis) return null;

        const oriented  =  new THREE.Group();
        oriented.name   =  'VghLantern__ProjectedEdges__Oriented__' + viewKey;

        oriented.matrixAutoUpdate  =  false;
        oriented.matrix.makeBasis(
            new THREE.Vector3(basis.XAxisTo[0], basis.XAxisTo[1], basis.XAxisTo[2]),
            new THREE.Vector3(basis.YAxisTo[0], basis.YAxisTo[1], basis.YAxisTo[2]),
            new THREE.Vector3(basis.ZAxisTo[0], basis.ZAxisTo[1], basis.ZAxisTo[2])
        );

        oriented.add(stage);
        oriented.updateMatrixWorld(true);                                     // <-- The edge generator reads mesh.matrixWorld; nothing renders this, so nothing else would refresh it

        return oriented;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Projection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Convert Projected World Vertices to Drawing Millimetres
    // ------------------------------------------------------------
    // The library emits a flat position buffer of (x, 0, z) triples, consecutive
    // pairs forming one segment. Only x and z carry information, and both are in
    // Env3d world units, so one divide by the world-per-millimetre scale returns
    // them to the drawing space every Env2d renderer already works in.
    //
    // Zero length and near zero length segments are dropped here. Clipping an edge
    // against a mesh that just touches it produces a scatter of them, and each one
    // would otherwise become a visible round cap blob on the drawing.
    //
    // The threshold is deliberately small. Raising it to a scale-derived figure was
    // tried, on the sound-looking argument that a 1:50 drawing cannot resolve a
    // fraction of a millimetre - but it cut the linework from 4442 segments to 1528
    // and the drawing visibly lost detail. Short segments turn out to be carrying
    // real geometry, not just clipping crumbs. Leave this low.
    function VghLantern__ProjectedEdges__Projector__ToDrawingSegments(positionArray) {
        const projection  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Projection');
        const minLength   =  (typeof projection.MinimumSegmentLengthMm === 'number')
            ? projection.MinimumSegmentLengthMm
            : 0;
        const minLengthSq  =  minLength * minLength;

        const worldPerMm  =  VghLantern__Env3d__ConfigAccess__MmToWorld(1);
        if (!worldPerMm) return new Float32Array(0);

        const vertexCount  =  Math.floor(positionArray.length / 3);
        const segmentCount =  Math.floor(vertexCount / 2);
        const kept         =  new Float32Array(segmentCount * 4);
        let   writeIndex   =  0;

        for (let i = 0; i < segmentCount; i++) {
            const a  =  i * 6;                                                // <-- First vertex of the pair, three floats each
            const b  =  a + 3;

            const x0  =  positionArray[a]     / worldPerMm;
            const y0  =  positionArray[a + 2] / worldPerMm;
            const x1  =  positionArray[b]     / worldPerMm;
            const y1  =  positionArray[b + 2] / worldPerMm;

            const dx  =  x1 - x0;
            const dy  =  y1 - y0;
            if (((dx * dx) + (dy * dy)) < minLengthSq) continue;

            kept[writeIndex++]  =  x0;
            kept[writeIndex++]  =  y0;
            kept[writeIndex++]  =  x1;
            kept[writeIndex++]  =  y1;
        }

        return kept.subarray(0, writeIndex);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Record How Long Each Named Library Phase Took
    // ------------------------------------------------------------
    // ProjectionGenerator announces its own phase names through onProgress:
    // extracting edges, extracting self-intersecting edges, filtering edges, then
    // clipping edges. Timing the gaps between those announcements is the only way
    // to see inside the run, and it is worth having - the phases differ in cost by
    // an order of magnitude and which one dominates decides what is worth tuning.
    //
    // One honest caveat on reading the output. The gap labelled "Filtering edges"
    // also covers the sort and the construction of the edge BVH that follows it,
    // because the library announces nothing between them. That BVH is built with
    // the SAH strategy over every edge in the model, so a large figure there is
    // usually the BVH and not the filter.
    function VghLantern__ProjectedEdges__Projector__CreatePhaseRecorder(onPhase) {
        const phases  =  [];
        let   current =  null;
        let   startedAt  =  performance.now();

        return {
            OnProgress : function(percent, message) {
                if (message === current) return;

                if (current !== null) {
                    phases.push({ Phase : current, Ms : Math.round(performance.now() - startedAt) });
                }
                current    =  message;
                startedAt  =  performance.now();

                // Forwarded so the progress overlay can name the phase it is in.
                // These strings come from the library, not from this module.
                if (typeof onPhase === 'function') onPhase(message);
            },

            Close : function() {
                if (current !== null) {
                    phases.push({ Phase : current, Ms : Math.round(performance.now() - startedAt) });
                    current  =  null;
                }
                return phases;
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Project a Staged Model Into 2D Drawing Segments
    // ------------------------------------------------------------
    // Only the VISIBLE edge set is read. The library returns the hidden set beside
    // it, ready for a dashed layer whenever that is wanted, but a first look at
    // whether the projection can be trusted is clearest without it.
    //
    // The library's own generateAsync is deliberately NOT used. It waits a whole
    // animation frame after every work slice, which costs about a third of the
    // elapsed time on a model this size. The generator is driven here instead, on
    // the budget set in config. See the Scheduler module for the full reasoning.
    export async function VghLantern__ProjectedEdges__Projector__Project(stage, viewKey, abortSignal, onPhase) {
        const empty  =  { Segments : new Float32Array(0), Phases : [] };
        if (!stage) return empty;

        const oriented  =  VghLantern__ProjectedEdges__Projector__Orient(stage, viewKey);
        if (!oriented) return empty;

        const projection      =  VghLantern__ProjectedEdges__ConfigAccess__Section('Projection');
        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        const generator       =  new ProjectionGenerator();

        if (typeof projection.AngleThresholdDegrees === 'number') generator.angleThreshold = projection.AngleThresholdDegrees;
        if (typeof projection.IterationTimeMs === 'number')       generator.iterationTime  = projection.IterationTimeMs;
        generator.includeIntersectionEdges  =  projection.IncludeIntersectionEdges === true;

        const recorder  =  VghLantern__ProjectedEdges__Projector__CreatePhaseRecorder(onPhase);
        const task      =  generator.generate(oriented, { onProgress : recorder.OnProgress });

        const result    =  await VghLantern__ProjectedEdges__Scheduler__DriveGenerator(
            task, performanceCfg.YieldEveryMs, abortSignal
        );
        const phases    =  recorder.Close();

        const geometry  =  result.visibleEdges.getLineGeometry();
        const position  =  geometry.attributes ? geometry.attributes.position : null;

        return {
            Segments : position
                ? VghLantern__ProjectedEdges__Projector__ToDrawingSegments(position.array)
                : new Float32Array(0),
            Phases   : phases
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
