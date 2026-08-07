/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | SOUP BUILDER
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__SoupBuilder__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - SoupBuilder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn a lantern's triangles into the occluder set for one view
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Takes the flat triangle list the StageSampler read out of the 3D model, turns
     it to face the view being drawn, throws away everything that cannot occlude
     anything, and works out the per triangle values the clip kernel would
     otherwise recompute thousands of times.
   - Imports nothing but the tree builder next door, so the whole of it can be run
     on the main thread or inside a worker without a build step.

   ---------------------------------------------------------------------------

   WHERE THE BACK FACE BUG WAS, AND WHY THE FIX LIVES HERE

   The vendored library culls back faces inside its innermost loop with:

       const faceUp = tri.plane.normal.dot( UP_VECTOR ) !== inverted;

   which compares a NUMBER against a BOOLEAN using strict inequality. In JavaScript
   that is true for every triangle that has ever been tested. Front side materials
   - which is nearly everything on a lantern, glazing aside - therefore culled
   nothing at all, and the clip pass carried roughly twice the occluders it was
   designed to carry. The library's own WebGPU kernel has the predicate right, so
   this is a transcription slip rather than a decision.

   Culling here rather than in the kernel is worth more than the fixed predicate on
   its own. A culled triangle is not merely skipped, it is never built, never
   indexed and never placed in the tree, so the tree is around half the size and
   every traversal through it is shorter. The kernel has no cull test at all.

   ---------------------------------------------------------------------------

   WHY A VIEW IS A PERMUTATION AND NOT A ROTATION

   The projector orients a lantern by one of three bases, and every one of them is
   a signed permutation of the axes: exact integers, no trigonometry. So turning a
   point to face a view is a matter of moving three numbers about and occasionally
   flipping a sign. That is why this file takes an axis map instead of a matrix -
   the arithmetic is exact, there is no floating point dust from a decomposed
   quaternion, and the whole pass costs one sweep of the array.

   ---------------------------------------------------------------------------

   WHAT COMES OUT

       Positions   9 doubles per triangle   a, b, c in view space
       UpPlanes    4 doubles per triangle   normal and constant, ALWAYS facing up
       FlatAreas   1 double  per triangle   area once dropped onto the page
       Heights     2 doubles per triangle   lowest and highest point
       Bvh                                  tree over the triangles, see FlatBvh

   Doubles rather than floats throughout. The source vertices arrive as floats, but
   everything computed from them here is computed in double precision, and storing
   the results as floats would round away detail the clip pass then compares
   against thresholds of 1e-16.

   ---------------------------------------------------------------------------

   PUBLIC API:
       AxisMapFromBasis(basis)                    -> axis map for one view
       BuildViewSoup(stageTriangles, axisMap, options) -> soup object

   ============================================================================= */

import { VghLantern__ProjectedEdges__FlatBvh__Build } from './VghLantern__ProjectedEdges__FlatBvh__.mjs';

// =============================================================================
// REGION | Projected Edges Soup Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Material Side Codes
    // ------------------------------------------------------------
    // Mirrors three.js FrontSide, BackSide and DoubleSide without importing them.
    // The StageSampler translates the real material into one of these so that this
    // module, and the worker that may run it, stay free of three.js entirely.
    export const VGHLANTERN__PROJECTED_EDGES__SIDE_FRONT   =  0;
    export const VGHLANTERN__PROJECTED_EDGES__SIDE_BACK    =  1;
    export const VGHLANTERN__PROJECTED_EDGES__SIDE_DOUBLE  =  2;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Orientation
// -----------------------------------------------------------------------------

    // FUNCTION | Reduce a View Basis to an Axis Map
    // ------------------------------------------------------------
    // basis is the { XAxisTo, YAxisTo, ZAxisTo } triple the Projector keeps, read as
    // the images of the three model axes, which is what Matrix4.makeBasis takes as
    // its columns. A point turns as:
    //
    //     view = p.x * XAxisTo + p.y * YAxisTo + p.z * ZAxisTo
    //
    // Every one of those vectors is a signed unit axis, so exactly one term
    // contributes to each output component. Finding which term, and its sign, turns
    // the whole rotation into two small integer arrays.
    //
    // Returns { Source, Sign } where view component d is Sign[d] * p[Source[d]].
    export function VghLantern__ProjectedEdges__SoupBuilder__AxisMapFromBasis(basis) {
        const columns  =  [ basis.XAxisTo, basis.YAxisTo, basis.ZAxisTo ];
        const source   =  new Int32Array(3);
        const sign     =  new Float64Array(3);

        for (let out = 0; out < 3; out++) {
            source[out]  =  -1;

            for (let axis = 0; axis < 3; axis++) {
                const value  =  columns[axis][out];
                if (value === 0) continue;

                source[out]  =  axis;
                sign[out]    =  value;
                break;
            }

            if (source[out] === -1) {
                throw new Error(
                    '[VghLantern ProjectedEdges] View basis is not a signed axis permutation: ' +
                    'output component ' + out + ' has no source axis.'
                );
            }
        }

        return { Source : source, Sign : sign };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Soup Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Occluder Set and Its Tree for One View
    // ------------------------------------------------------------
    // stageTriangles is what StageSampler produced: Vertices as nine doubles per
    // triangle in model space, Sides as one code per triangle, and Inverted as one
    // flag per triangle recording whether its mesh carried a mirroring transform.
    //
    // Two passes rather than one. The first decides what survives and writes it, so
    // the second - which needs bounding boxes for the tree - runs over the kept set
    // only. Sizing the output to the input and trimming at the end costs one
    // allocation and avoids counting the survivors twice.
    export function VghLantern__ProjectedEdges__SoupBuilder__BuildViewSoup(stageTriangles, axisMap, options) {
        const settings     =  options || {};
        const maxLeafSize  =  settings.MaxLeafSize;

        const sourceVerts  =  stageTriangles.Vertices;
        const sides        =  stageTriangles.Sides;
        const inverted     =  stageTriangles.Inverted;
        const sourceCount  =  stageTriangles.Count;

        const s0  =  axisMap.Source[0], g0  =  axisMap.Sign[0];
        const s1  =  axisMap.Source[1], g1  =  axisMap.Sign[1];
        const s2  =  axisMap.Source[2], g2  =  axisMap.Sign[2];

        const positions  =  new Float64Array(sourceCount * 9);
        const upPlanes   =  new Float64Array(sourceCount * 4);
        const flatAreas  =  new Float64Array(sourceCount);
        const heights    =  new Float64Array(sourceCount * 2);
        const bounds     =  new Float64Array(sourceCount * 6);

        let kept  =  0;

        for (let t = 0; t < sourceCount; t++) {
            const src  =  t * 9;

            // Turn the three corners to face the view. Reading each source
            // component by index and multiplying by a sign of exactly +1 or -1
            // keeps this exact: no value is ever scaled or blended.
            const ax  =  g0 * sourceVerts[src     + s0];
            const ay  =  g1 * sourceVerts[src     + s1];
            const az  =  g2 * sourceVerts[src     + s2];
            const bx  =  g0 * sourceVerts[src + 3 + s0];
            const by  =  g1 * sourceVerts[src + 3 + s1];
            const bz  =  g2 * sourceVerts[src + 3 + s2];
            const cx  =  g0 * sourceVerts[src + 6 + s0];
            const cy  =  g1 * sourceVerts[src + 6 + s1];
            const cz  =  g2 * sourceVerts[src + 6 + s2];

            // Normal exactly as three.js derives it, (c - b) crossed with (a - b),
            // so a triangle classifies here the way it would anywhere else in the
            // application.
            const ux  =  cx - bx, uy  =  cy - by, uz  =  cz - bz;
            const vx  =  ax - bx, vy  =  ay - by, vz  =  az - bz;

            let nx  =  (uy * vz) - (uz * vy);
            let ny  =  (uz * vx) - (ux * vz);
            let nz  =  (ux * vy) - (uy * vx);

            const lengthSq  =  (nx * nx) + (ny * ny) + (nz * nz);
            if (!(lengthSq > 0)) continue;                                    // <-- Degenerate triangle: no plane, no occlusion

            const inverseLength  =  1 / Math.sqrt(lengthSq);
            nx  *=  inverseLength;
            ny  *=  inverseLength;
            nz  *=  inverseLength;

            // ------------------------------------------------------
            // BACK FACE CULL - see the note at the head of this file.
            // faceUp asks whether the triangle's OUTWARD side is the side a
            // viewer looking down would see. A mirroring transform reverses
            // winding, so it reverses the answer.
            // ------------------------------------------------------
            const side  =  sides[t];
            if (side !== VGHLANTERN__PROJECTED_EDGES__SIDE_DOUBLE) {
                const faceUp  =  (ny > 0) !== (inverted[t] === 1);
                const wanted  =  (side !== VGHLANTERN__PROJECTED_EDGES__SIDE_BACK);
                if (faceUp !== wanted) continue;
            }

            const out  =  kept * 9;
            positions[out]      =  ax;
            positions[out + 1]  =  ay;
            positions[out + 2]  =  az;
            positions[out + 3]  =  bx;
            positions[out + 4]  =  by;
            positions[out + 5]  =  bz;
            positions[out + 6]  =  cx;
            positions[out + 7]  =  cy;
            positions[out + 8]  =  cz;

            // The clip pass only ever asks which side of this plane a point is on,
            // and it always wants "beneath". Storing the upward facing form removes
            // a conditional flip from the innermost loop.
            const planeAt  =  kept * 4;
            if (ny < 0) {
                upPlanes[planeAt]      =  -nx;
                upPlanes[planeAt + 1]  =  -ny;
                upPlanes[planeAt + 2]  =  -nz;
                upPlanes[planeAt + 3]  =  (nx * ax) + (ny * ay) + (nz * az);
            } else {
                upPlanes[planeAt]      =  nx;
                upPlanes[planeAt + 1]  =  ny;
                upPlanes[planeAt + 2]  =  nz;
                upPlanes[planeAt + 3]  =  -((nx * ax) + (ny * ay) + (nz * az));
            }

            // Area of the triangle once dropped onto the page. Flattening zeroes the
            // height, so the cross product has only a vertical component left and
            // the whole area reduces to one determinant.
            flatAreas[kept]  =  Math.abs((uz * vx) - (ux * vz)) * 0.5;

            let minY  =  ay, maxY  =  ay;
            if (by < minY) minY  =  by; else if (by > maxY) maxY  =  by;
            if (cy < minY) minY  =  cy; else if (cy > maxY) maxY  =  cy;
            heights[kept * 2]      =  minY;
            heights[kept * 2 + 1]  =  maxY;

            const boundsAt  =  kept * 6;
            bounds[boundsAt]      =  Math.min(ax, bx, cx);
            bounds[boundsAt + 1]  =  minY;
            bounds[boundsAt + 2]  =  Math.min(az, bz, cz);
            bounds[boundsAt + 3]  =  Math.max(ax, bx, cx);
            bounds[boundsAt + 4]  =  maxY;
            bounds[boundsAt + 5]  =  Math.max(az, bz, cz);

            kept++;
        }

        // The raster preview wants the culled triangles and nothing else: it hands
        // them straight to the graphics card, which does its own sorting in the
        // depth buffer. Building a tree it will never traverse is the single
        // biggest cost in producing a picture that has to feel instant.
        const tree  =  (settings.SkipTree === true)
            ? null
            : VghLantern__ProjectedEdges__FlatBvh__Build(
                bounds.subarray(0, kept * 6), kept, { MaxLeafSize : maxLeafSize }
            );

        return {
            TriCount   : kept,
            SourceCount: sourceCount,
            Positions  : positions.slice(0, kept * 9),
            UpPlanes   : upPlanes.slice(0, kept * 4),
            FlatAreas  : flatAreas.slice(0, kept),
            Heights    : heights.slice(0, kept * 2),
            Bvh        : tree
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Buffers That Can Travel to a Worker
    // ------------------------------------------------------------
    // Returned as a list rather than transferred here, because a soup is sent to
    // SEVERAL workers and a transfer would detach it after the first. The caller
    // decides: structured clone for a fan out, transfer for a hand off.
    export function VghLantern__ProjectedEdges__SoupBuilder__Buffers(soup) {
        if (!soup.Bvh) return [ soup.Positions.buffer ];                      // <-- Tree-less preview soup: nothing else is read from it

        return [
            soup.Positions.buffer,
            soup.UpPlanes.buffer,
            soup.FlatAreas.buffer,
            soup.Heights.buffer,
            soup.Bvh.NodeBounds.buffer,
            soup.Bvh.NodeData.buffer,
            soup.Bvh.PrimIndex.buffer
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
