/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | CABLE ROUTER
   =============================================================================

   FILE       : NaAudio__Spatial__CableRouter__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - CableRouter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Find a path across the floor that goes AROUND the instruments
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Given two sockets, produces a list of waypoints on the ground plane that reaches
     one from the other without crossing any module's footprint.
   - Every module in the space is an obstacle except the two the lead is plugged into.
   - Pure: it reads world state and writes into a caller-supplied array. It holds no
     per-cable state and allocates nothing after load.

   ---------------------------------------------------------------------------

   WHY ROUTING EXISTS AT ALL

   Dropping the leads onto the floor made the patch legible from above and immediately
   made a second problem visible: a lead between two distant modules ran straight across
   whatever was in between, so it passed through the middle of other instruments. On the
   ground that reads worse than it did in the air, because a lead crossing a pad looks
   like it is plugged into that module too.

   A patch bay is only readable if every lead can be followed with the eye from one end
   to the other, and a lead that disappears under an instrument and reappears on the far
   side cannot be. So the leads go around.

   ---------------------------------------------------------------------------

   THE ALGORITHM, AND WHY THIS ONE

   Push-out relaxation on a polyline:

       start with the two-point line from socket to socket
       find the segment that penetrates an obstacle most deeply
       insert one waypoint on that obstacle's boundary, on the side the line already
         favours
       repeat until nothing penetrates, or the caps are hit

   It is not the shortest path. A visibility graph over the tangent points would be, and
   would cost a graph build and a Dijkstra per cable per frame for a result nobody can
   tell apart at this scale - the paths differ by centimetres when four obstacles are in
   play, and the relaxed one is smoother because it was never a sequence of tangent arcs
   to begin with.

   It is also incremental in the right way: one waypoint per pass, re-scanning from the
   start each time, so a waypoint inserted to clear one module is itself checked against
   the rest.

   ---------------------------------------------------------------------------

   THE POLYLINE IS NOT THE THING THAT GETS DRAWN

   Relaxing the straight line is only half the job, and the half that is cheap. What
   gets swept is a centripetal Catmull-Rom THROUGH those points, and a spline bows
   between its points - so a polyline that clears an obstacle comfortably can still be
   drawn curving well inside it.

   Measured, with a module moved into the middle of a run: the straight-line test passed
   with no waypoint inserted at all, and the tube that got drawn ended up 54mm inside the
   output post's footprint.

   So there is a second pass that builds the actual curve, samples it, and pushes out
   whatever it finds. The first pass is kept because it costs almost nothing and gets the
   shape roughly right, which leaves the expensive pass with less to do.

   ---------------------------------------------------------------------------

   MODULES ARE CIRCLES

   A pad is a rounded rectangle and the obstacle is a circle around it. Fitting the
   rectangle would mean corner cases at every corner - literally - for a lead that would
   then hug a straight edge, which looks worse than the gentle arc a circle produces.

   The radius covers the LIVE base width, so a sequencer that has opened its control bank
   pushes leads out of the way of its workbench rather than letting them run across the
   sliders.

   ---------------------------------------------------------------------------

   BOTH CAPS ARE REAL AND BOTH ARE REPORTED

   The iteration count and the waypoint count are both bounded. A dense enough cluster
   can genuinely have no clear route - modules whose clearance circles overlap in a ring
   enclose the space between them - and without a cap the loop would insert waypoints
   until the frame died.

   When a cap is hit the lead is drawn along whatever it had, which crosses something.
   That is the honest outcome: the alternative is a lead that vanishes, and a missing
   lead is a far worse lie than a lead taking a bad line.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__ModuleRegistry__Modules
} from './NaAudio__Spatial__ModuleRegistry__.mjs';

// =============================================================================
// REGION | Cable Router
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Scratch
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Working Storage
    // ------------------------------------------------------------
    // Everything here is preallocated at load. Routing runs for every cable every frame,
    // and a router that allocates would put a few hundred short-lived vectors a second
    // in front of the collector for no reason.
    const MAX_OBSTACLES  =  48;
    const MAX_POINTS     =  24;

    const OBSTACLES      =  [];                                              // <-- { X, Z, Radius }, reused in place
    for (let i = 0; i < MAX_OBSTACLES; i++) OBSTACLES.push({ X: 0, Z: 0, Radius: 0 });

    const ROUTE  =  [];                                                      // <-- The middle of a path while it is being relaxed
    for (let i = 0; i < MAX_POINTS; i++) ROUTE.push(new THREE.Vector3());

    // The verification curve. Same class and same parameterisation the cable factory
    // sweeps along, because checking a DIFFERENT curve to the one that gets drawn is not
    // checking anything at all.
    const VERIFY_CURVE   =  new THREE.CatmullRomCurve3([], false, 'centripetal', 0.5);
    const VERIFY_POINTS  =  [];
    for (let i = 0; i < MAX_POINTS; i++) VERIFY_POINTS.push(new THREE.Vector3());

    const VERIFY_SAMPLES =  40;
    const SCRATCH_SAMPLE =  new THREE.Vector3();

    const SCRATCH_CLOSEST  =  { X: 0, Z: 0 };
    let   obstacleCount    =  0;
    let   hasWarnedCap     =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Obstacles
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Collect Every Module That Is Not an Endpoint of This Lead
    // ------------------------------------------------------------
    // The two modules a lead is plugged into are excluded, because its sockets sit on
    // their pad rims - inside their own clearance circles. Included, every lead would
    // immediately be pushed away from the very module it is plugged into.
    function NaAudio__CableRouter__CollectObstacles(fromModuleId, toModuleId) {
        const modules    =  NaAudio__ModuleRegistry__Modules();
        const clearance  =  SpatialNumber('PatchGraph', 'CableObstacleClearance');

        obstacleCount  =  0;

        for (let i = 0; i < modules.length; i++) {
            if (obstacleCount >= MAX_OBSTACLES) break;

            const module  =  modules[i];
            if (module.ModuleId === fromModuleId || module.ModuleId === toModuleId) continue;

            // The LIVE base width, not the declared cage - an expanded sequencer is
            // twice as wide and its workbench needs the same protection its ring does.
            const footprint  =  Math.max(module.BaseWidth || module.CageSize.x, module.CageSize.z);

            const obstacle  =  OBSTACLES[obstacleCount];
            obstacle.X       =  module.Position.x;
            obstacle.Z       =  module.Position.z;
            obstacle.Radius  =  footprint * 0.5 + clearance;

            obstacleCount += 1;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Closest Point on a Segment to a Circle Centre
    // ------------------------------------------------------------
    // Returns the squared distance, and writes the point into SCRATCH_CLOSEST. Squared
    // because the caller only ever compares it, and a square root per obstacle per
    // segment per iteration per cable per frame is a lot of square roots to no purpose.
    function NaAudio__CableRouter__ClosestOnSegment(ax, az, bx, bz, cx, cz) {
        const dx  =  bx - ax;
        const dz  =  bz - az;

        const lengthSq  =  dx * dx + dz * dz;

        let t  =  (lengthSq > 0.000001)
            ? ((cx - ax) * dx + (cz - az) * dz) / lengthSq
            : 0;

        if (t < 0) t = 0; else if (t > 1) t = 1;

        SCRATCH_CLOSEST.X  =  ax + dx * t;
        SCRATCH_CLOSEST.Z  =  az + dz * t;

        const ox  =  SCRATCH_CLOSEST.X - cx;
        const oz  =  SCRATCH_CLOSEST.Z - cz;

        return ox * ox + oz * oz;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Routing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Push One Waypoint Clear of the Worst Obstacle on a Path
    // ------------------------------------------------------------
    // Scans every segment against every obstacle and acts on the single deepest
    // penetration, then returns. The caller re-scans, so a waypoint added to clear one
    // module is itself tested against all the others on the next pass.
    //
    // Returns true if it inserted something.
    function NaAudio__CableRouter__RelaxOnce(points, count, height) {
        let worstSegment   =  -1;
        let worstObstacle  =  -1;
        let worstDepth     =  0;

        for (let i = 0; i < count - 1; i++) {
            const a  =  points[i];
            const b  =  points[i + 1];

            for (let o = 0; o < obstacleCount; o++) {
                const obstacle  =  OBSTACLES[o];

                const distanceSq  =  NaAudio__CableRouter__ClosestOnSegment(a.x, a.z, b.x, b.z, obstacle.X, obstacle.Z);
                if (distanceSq >= obstacle.Radius * obstacle.Radius) continue;

                const depth  =  obstacle.Radius - Math.sqrt(distanceSq);
                if (depth > worstDepth) {
                    worstDepth     =  depth;
                    worstSegment   =  i;
                    worstObstacle  =  o;
                }
            }
        }

        if (worstSegment < 0) return false;

        const obstacle  =  OBSTACLES[worstObstacle];
        const a         =  points[worstSegment];
        const b         =  points[worstSegment + 1];

        NaAudio__CableRouter__ClosestOnSegment(a.x, a.z, b.x, b.z, obstacle.X, obstacle.Z);

        let outX  =  SCRATCH_CLOSEST.X - obstacle.X;
        let outZ  =  SCRATCH_CLOSEST.Z - obstacle.Z;
        let outLength  =  Math.sqrt(outX * outX + outZ * outZ);

        // The line passes dead through the centre, so there is no side to favour. Step
        // off perpendicular to the segment instead; either way is the same length and
        // picking one is better than dividing by zero.
        if (outLength < 0.0001) {
            outX  =  -(b.z - a.z);
            outZ  =    b.x - a.x;
            outLength  =  Math.sqrt(outX * outX + outZ * outZ);
            if (outLength < 0.0001) return false;                             // <-- Degenerate segment; nothing sensible to do
        }

        // Pushed a little PAST the boundary. The path is smoothed into a curve before it
        // is drawn, and a curve through points sitting exactly on the circle cuts the
        // corner and clips it. The margin is what the smoothing eats.
        const margin  =  SpatialNumber('PatchGraph', 'CableRouteSmoothingMargin');
        const scale   =  (obstacle.Radius + margin) / outLength;

        // Shift the tail down and insert.
        for (let i = count; i > worstSegment + 1; i--) {
            points[i].copy(points[i - 1]);
        }

        points[worstSegment + 1].set(
            obstacle.X + outX * scale,
            height,
            obstacle.Z + outZ * scale
        );

        return true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Pull the SMOOTHED Curve Out of Anything It Bows Into
    // ------------------------------------------------------------
    // Relaxing the polyline is not enough on its own, and the gap between the two is not
    // small. A Catmull-Rom passes through its points but bows BETWEEN them, and the bow
    // is driven by the neighbours - so a straight run whose polyline clears an obstacle
    // by a comfortable margin can still be drawn curving half a metre inside it.
    //
    // Measured on the demonstration space with a module moved into the middle: the
    // polyline test passed with no waypoint inserted at all, and the tube that got drawn
    // ended up 54mm INSIDE the output post's footprint.
    //
    // So the curve that will actually be swept is built here, sampled, and the worst
    // intrusion is pushed out by inserting a waypoint in the route segment nearest to it.
    // The caller loops until this finds nothing.
    //
    // Returns true if it inserted something.
    function NaAudio__CableRouter__RelaxCurveOnce(route, routeCount, fromPoint, toPoint, height) {
        // ASSEMBLE the full path the factory would draw.
        VERIFY_POINTS[0].copy(fromPoint);
        for (let i = 0; i < routeCount; i++) VERIFY_POINTS[1 + i].copy(route[i]);
        VERIFY_POINTS[1 + routeCount].copy(toPoint);

        const total  =  routeCount + 2;

        VERIFY_CURVE.points.length  =  0;
        for (let i = 0; i < total; i++) VERIFY_CURVE.points.push(VERIFY_POINTS[i]);

        let worstObstacle  =  -1;
        let worstDepth     =  0;
        let worstX         =  0;
        let worstZ         =  0;

        for (let sampleIndex = 1; sampleIndex < VERIFY_SAMPLES; sampleIndex++) {
            VERIFY_CURVE.getPoint(sampleIndex / VERIFY_SAMPLES, SCRATCH_SAMPLE);

            for (let o = 0; o < obstacleCount; o++) {
                const obstacle  =  OBSTACLES[o];

                const dx  =  SCRATCH_SAMPLE.x - obstacle.X;
                const dz  =  SCRATCH_SAMPLE.z - obstacle.Z;
                const distance  =  Math.sqrt(dx * dx + dz * dz);

                const depth  =  obstacle.Radius - distance;
                if (depth > worstDepth) {
                    worstDepth     =  depth;
                    worstObstacle  =  o;
                    worstX         =  SCRATCH_SAMPLE.x;
                    worstZ         =  SCRATCH_SAMPLE.z;
                }
            }
        }

        if (worstObstacle < 0) return false;

        const obstacle  =  OBSTACLES[worstObstacle];

        // Which route segment is this intrusion nearest? That is where the waypoint has
        // to go, or the curve is pulled out in the wrong place and bows in somewhere else.
        let bestSegment  =  0;
        let bestDistance =  Infinity;

        for (let i = 0; i < routeCount - 1; i++) {
            const distanceSq  =  NaAudio__CableRouter__ClosestOnSegment(
                route[i].x, route[i].z, route[i + 1].x, route[i + 1].z, worstX, worstZ
            );
            if (distanceSq < bestDistance) {
                bestDistance  =  distanceSq;
                bestSegment   =  i;
            }
        }

        let outX  =  worstX - obstacle.X;
        let outZ  =  worstZ - obstacle.Z;
        let outLength  =  Math.sqrt(outX * outX + outZ * outZ);

        if (outLength < 0.0001) {
            outX  =  route[bestSegment + 1].z - route[bestSegment].z;
            outZ  =  route[bestSegment].x - route[bestSegment + 1].x;
            outLength  =  Math.sqrt(outX * outX + outZ * outZ);
            if (outLength < 0.0001) return false;
        }

        const margin  =  SpatialNumber('PatchGraph', 'CableRouteSmoothingMargin');
        const scale   =  (obstacle.Radius + margin) / outLength;

        for (let i = routeCount; i > bestSegment + 1; i--) route[i].copy(route[i - 1]);

        route[bestSegment + 1].set(
            obstacle.X + outX * scale,
            height,
            obstacle.Z + outZ * scale
        );

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Route a Lead From One Socket to Another
    // ------------------------------------------------------------
    // Writes the path into the caller's array of Vector3 and returns how many entries
    // were used. The array must hold at least NaAudio__CableRouter__MaxPoints entries.
    //
    // The path always begins and ends AT THE SOCKETS, with a lead-out point just outside
    // each. Only the middle is routed - a lead has to leave its socket along the socket's
    // own axis whatever the floor plan says, or it stops looking plugged in.
    //
    // The routed middle is relaxed in ROUTE, a scratch array of its own, and only copied
    // into the caller's array once it has settled. Relaxing in place in the output array
    // would mean the insert-and-shift had to step over the two fixed sockets on every
    // pass, which is exactly the kind of index arithmetic that is wrong for a week before
    // anybody notices.
    export function NaAudio__CableRouter__Route(fromPoint, fromNormal, toPoint, toNormal, fromModuleId, toModuleId, points) {
        const height  =  SpatialNumber('PatchGraph', 'CableGroundHeight');
        const lead    =  Math.min(fromPoint.distanceTo(toPoint) * 0.34, SpatialNumber('PatchGraph', 'CableLeadOut'));

        // THE ROUTED MIDDLE - the two lead-out points, to begin with.
        ROUTE[0].copy(fromNormal).multiplyScalar(lead).add(fromPoint);
        ROUTE[1].copy(toNormal).multiplyScalar(lead).add(toPoint);
        ROUTE[0].y  =  height;
        ROUTE[1].y  =  height;

        let routeCount  =  2;

        NaAudio__CableRouter__CollectObstacles(fromModuleId, toModuleId);

        if (obstacleCount > 0) {
            const maxWaypoints  =  Math.min(Math.round(SpatialNumber('PatchGraph', 'CableRouteMaxWaypoints')), MAX_POINTS - 4);
            const iterations    =  Math.round(SpatialNumber('PatchGraph', 'CableRouteIterations'));

            let inserted  =  0;

            // PASS ONE - the cheap straight-line test. Gets the polyline roughly right
            // for the price of a few dot products.
            for (let pass = 0; pass < iterations && inserted < maxWaypoints; pass++) {
                if (!NaAudio__CableRouter__RelaxOnce(ROUTE, routeCount, height)) break;
                routeCount += 1;
                inserted   += 1;
            }

            // PASS TWO - the real test, against the curve that will actually be drawn.
            for (let pass = 0; pass < iterations && inserted < maxWaypoints; pass++) {
                if (!NaAudio__CableRouter__RelaxCurveOnce(ROUTE, routeCount, fromPoint, toPoint, height)) break;
                routeCount += 1;
                inserted   += 1;
            }

            if (inserted >= maxWaypoints && !hasWarnedCap) {
                hasWarnedCap  =  true;
                console.warn('[NaAudio CableRouter] A lead hit the waypoint cap of ' + maxWaypoints + ' and is drawn crossing something. That normally means a cluster whose clearance circles enclose the space between them, which has no clear route at all - move the modules apart, or lower CableObstacleClearance. Reported once per session.');
            }
        }

        // ASSEMBLE
        points[0].copy(fromPoint);
        for (let i = 0; i < routeCount; i++) points[1 + i].copy(ROUTE[i]);
        points[1 + routeCount].copy(toPoint);

        return routeCount + 2;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Many Points a Route Can Use
    // ------------------------------------------------------------
    // The caller preallocates against this rather than guessing.
    export function NaAudio__CableRouter__MaxPoints() {
        return MAX_POINTS;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
