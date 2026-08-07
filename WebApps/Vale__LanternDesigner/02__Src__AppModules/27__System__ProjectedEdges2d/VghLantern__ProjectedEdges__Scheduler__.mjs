/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | SCHEDULER
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__Scheduler__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - Scheduler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Run long synchronous work without freezing the interface
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Drives three-edge-projection's generators, and this module's own BVH build
     loop, on a time slice of our choosing rather than the library's.
   - Exists because of one specific and costly detail in the vendor code.

   ---------------------------------------------------------------------------

   THE COST THIS FILE REMOVES

   three-edge-projection ships an async wrapper that reads:

       while ( ! res || ! res.done ) {
           res = task.next();
           await nextFrame();
       }

   Its generators yield roughly every iterationTime milliseconds - 30 by default -
   and nextFrame waits for a full animation frame, about 16 milliseconds. So the
   loop spends 30 working, 16 waiting, 30 working, 16 waiting. Around a THIRD of
   the elapsed time is the projection sitting still.

   That trade buys responsiveness, and on a small model it is the right call. On a
   full lantern with glazing and finials it is simply thrown away time.

   This module drives the same generators itself and hands the browser a frame only
   every YieldEveryMs. At the shipped 250 the loop runs about 94 percent of the
   time instead of 65, and the interface still gets a frame four times a second.
   Raising it goes faster and feels chunkier in exact proportion; the number is in
   Na__ProjectedEdges__Config.json precisely so that trade stays visible.

   ---------------------------------------------------------------------------

   PUBLIC API:
       NextFrame()                              -> Promise, one animation frame
       CreateSlicer(yieldEveryMs)               -> { Tick() }
       DriveGenerator(task, yieldEveryMs, signal) -> Promise<generator return value>

   ============================================================================= */

// =============================================================================
// REGION | Projected Edges Scheduler Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Frame Yielding
// -----------------------------------------------------------------------------

    // FUNCTION | Wait One Animation Frame, With a Timer Fallback
    // ------------------------------------------------------------
    // Races requestAnimationFrame against a timeout, mirroring the vendor's own
    // helper. The fallback matters: the drawing sheet bake runs against an
    // off-canvas host and a background tab stops serving animation frames
    // altogether, which would hang a projection indefinitely on rAF alone.
    export function VghLantern__ProjectedEdges__Scheduler__NextFrame() {
        return new Promise(function(resolve) {
            let frameHandle;
            let timerHandle;

            const settle  =  function() {
                cancelAnimationFrame(frameHandle);
                clearTimeout(timerHandle);
                resolve();
            };

            frameHandle  =  requestAnimationFrame(settle);
            timerHandle  =  setTimeout(settle, 16);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Time Slicer That Yields on a Fixed Budget
    // ------------------------------------------------------------
    // Tick resolves immediately on a microtask while inside the budget, and costs a
    // real frame only when the budget is spent. Callers can therefore await it in
    // their innermost loop without thinking about the cadence.
    export function VghLantern__ProjectedEdges__Scheduler__CreateSlicer(yieldEveryMs) {
        const budget  =  (typeof yieldEveryMs === 'number' && yieldEveryMs > 0) ? yieldEveryMs : 250;
        let   lastYieldAt  =  performance.now();

        return {
            Tick : async function() {
                if ((performance.now() - lastYieldAt) < budget) return;

                await VghLantern__ProjectedEdges__Scheduler__NextFrame();
                lastYieldAt  =  performance.now();
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator Driving
// -----------------------------------------------------------------------------

    // FUNCTION | Run a Synchronous Generator to Completion on Our Own Time Slice
    // ------------------------------------------------------------
    // The generator still decides where it is safe to pause; this only decides how
    // often a pause is spent on the browser rather than resumed immediately.
    //
    // The abort check sits between iterations, so a superseded projection stops at
    // the next yield point instead of running to completion and being discarded.
    export async function VghLantern__ProjectedEdges__Scheduler__DriveGenerator(task, yieldEveryMs, abortSignal) {
        const slicer  =  VghLantern__ProjectedEdges__Scheduler__CreateSlicer(yieldEveryMs);
        let   step    =  task.next();

        while (!step.done) {
            await slicer.Tick();

            if (abortSignal && abortSignal.aborted) {
                throw new DOMException('Projection aborted', 'AbortError');
            }

            step  =  task.next();
        }

        return step.value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
