/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | WORKER POOL
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__WorkerPool__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - WorkerPool
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Spread the clip pass across every core the machine will lend us
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Owns a small pool of clip workers, keeps them alive between renders, and hands
     out slices of the edge list until a view is finished.
   - Falls back to running the identical kernel on the main thread whenever workers
     cannot be created, so nothing here is load bearing for correctness.

   ---------------------------------------------------------------------------

   WHY SLICING BY EDGE IS EXACT AND NOT AN APPROXIMATION

   The clip pass asks one question per edge: which parts of it does something pass
   over. Answering it reads the occluders, which never change, and writes only that
   edge's own answer. No edge consults another, and the covered ranges are merged as
   a union, which does not care what order they arrived in.

   So an edge computed in a worker gets the same answer it would have got on the
   main thread, and the union of the slices is the whole. This is not a tolerance to
   be checked, it is a property of the algorithm - but the DiffHarness checks it
   anyway, because a claim like that is exactly the kind that quietly stops being
   true.

   ---------------------------------------------------------------------------

   HOW THE WORK IS HANDED OUT

   The occluders go out ONCE per view, to every worker. The slices that follow are
   four numbers each, so the pool can cut the edge list far finer than the number of
   workers and hand out the next slice whenever one falls idle.

   That matters more here than the usual load balancing argument. Edges are grouped
   by the mesh they came from, and meshes are wildly uneven: a slice covering the
   roof panels saturates almost immediately through the coverage early out, while a
   slice covering the glazing bars grinds through every occluder above it. Cutting
   into equal counts and dealing them out one at a time turns that into a queue
   rather than a straggler.

   ---------------------------------------------------------------------------

   PUBLIC API:
       IsSupported()                                        -> boolean
       Run(soup, edges, options, settings)                  -> Promise<Float32Array>
       Dispose()                                            release the workers

   ============================================================================= */

import { VghLantern__ProjectedEdges__ClipKernel__Clip }        from './VghLantern__ProjectedEdges__ClipKernel__.mjs';
import { VghLantern__ProjectedEdges__Scheduler__CreateSlicer } from './VghLantern__ProjectedEdges__Scheduler__.mjs';

// =============================================================================
// REGION | Projected Edges Worker Pool Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pool Sizing
    // ------------------------------------------------------------
    // One core is left alone. The main thread still has a progress overlay to turn,
    // a viewport to paint and, on the parallel view path, two other views to
    // marshal - taking every core makes the whole application feel worse while
    // saving a fraction of one worker's time.
    const RESERVED_CORES        =  1;
    const DEFAULT_MAX_WORKERS   =  8;
    const SHARDS_PER_WORKER     =  4;                                         // <-- Oversubscription, so an unlucky slice cannot strand a core
    const MINIMUM_SHARD_EDGES   =  256;                                       // <-- Below this the messaging costs more than the work saved
    // ------------------------------------------------------------


    // MODULE CONSTANTS | When the Pool Is Not Worth Waking
    // ------------------------------------------------------------
    // Every worker needs its OWN readable copy of the occluders, so a fan out costs
    // one structured clone of several megabytes per worker before any clipping
    // starts. On a large lantern that is easily repaid. On a small one, or on a view
    // where the coverage early out does most of the work anyway, it is not: the
    // copying can cost more than the clipping it was meant to divide.
    //
    // So below this many edges the kernel simply runs here. Same code, same answer,
    // no copies.
    const MINIMUM_EDGES_FOR_POOL  =  8000;
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Live Pool
    // ------------------------------------------------------------
    let   VghLantern__ProjectedEdges__WorkerPool__Workers     =  [];
    let   VghLantern__ProjectedEdges__WorkerPool__Generation  =  0;
    let   VghLantern__ProjectedEdges__WorkerPool__Disabled    =  false;       // <-- Latched on if the workers prove unusable in this environment
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pool Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Whether Workers Can Be Used At All Here
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__WorkerPool__IsSupported() {
        return !VghLantern__ProjectedEdges__WorkerPool__Disabled &&
               (typeof Worker === 'function') &&
               (typeof URL === 'function');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | How Many Workers This Machine Should Run
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__WorkerPool__Size(requested) {
        const cores  =  (typeof navigator !== 'undefined' && navigator.hardwareConcurrency)
            ? navigator.hardwareConcurrency
            : 4;

        const ceiling  =  (typeof requested === 'number' && requested > 0)
            ? requested
            : DEFAULT_MAX_WORKERS;

        return Math.max(1, Math.min(ceiling, cores - RESERVED_CORES));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Create the Pool if It Is Not Already Running
    // ------------------------------------------------------------
    // Workers are kept alive between renders. Starting one costs a module fetch and
    // a fresh JavaScript context, which is small but happens per worker per view if
    // they are torn down, and the projection is asked for repeatedly.
    //
    // Any failure here latches the pool off for the rest of the session rather than
    // being retried per view. A browser that cannot make a module worker will not
    // start being able to.
    function VghLantern__ProjectedEdges__WorkerPool__Ensure(requested) {
        const wanted  =  VghLantern__ProjectedEdges__WorkerPool__Size(requested);

        if (VghLantern__ProjectedEdges__WorkerPool__Workers.length >= wanted) {
            return VghLantern__ProjectedEdges__WorkerPool__Workers.slice(0, wanted);
        }

        try {
            const workerUrl  =  new URL('./VghLantern__ProjectedEdges__ClipWorker__.mjs', import.meta.url);

            while (VghLantern__ProjectedEdges__WorkerPool__Workers.length < wanted) {
                const worker  =  new Worker(workerUrl, { type : 'module' });

                worker.onerror  =  function(errorEvent) {
                    console.error('[VghLantern ProjectedEdges] Clip worker failed, falling back to the main thread:', errorEvent.message || errorEvent);
                    VghLantern__ProjectedEdges__WorkerPool__Disabled  =  true;
                };

                VghLantern__ProjectedEdges__WorkerPool__Workers.push(worker);
            }
        } catch (createError) {
            console.warn('[VghLantern ProjectedEdges] Clip workers unavailable, using the main thread:', createError);
            VghLantern__ProjectedEdges__WorkerPool__Disabled  =  true;
            VghLantern__ProjectedEdges__WorkerPool__Dispose();
            return [];
        }

        return VghLantern__ProjectedEdges__WorkerPool__Workers.slice(0, wanted);
    }
    // ------------------------------------------------------------


    // FUNCTION | Shut the Pool Down
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__WorkerPool__Dispose() {
        VghLantern__ProjectedEdges__WorkerPool__Workers.forEach(function(worker) {
            try { worker.terminate(); } catch (terminateError) { /* already gone */ }
        });

        VghLantern__ProjectedEdges__WorkerPool__Workers  =  [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slicing and Collection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Cut the Edge List Into Slices
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__WorkerPool__Slices(edgeCount, workerCount) {
        const wanted     =  Math.max(1, workerCount * SHARDS_PER_WORKER);
        const perSlice   =  Math.max(MINIMUM_SHARD_EDGES, Math.ceil(edgeCount / wanted));
        const slices     =  [];

        for (let start = 0; start < edgeCount; start += perSlice) {
            slices.push({ Start : start, End : Math.min(start + perSlice, edgeCount) });
        }

        return slices;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Join Every Slice's Segments Into One Buffer
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__WorkerPool__Join(parts) {
        let total  =  0;
        for (let i = 0; i < parts.length; i++) total  +=  parts[i].length;

        const joined  =  new Float32Array(total);
        let   at      =  0;

        for (let i = 0; i < parts.length; i++) {
            joined.set(parts[i], at);
            at  +=  parts[i].length;
        }

        return joined;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Running
// -----------------------------------------------------------------------------

    // FUNCTION | Clip a Whole View, Across Workers Where Possible
    // ------------------------------------------------------------
    // settings carries MaxWorkers, the AbortSignal, an OnProgress callback taking a
    // fraction, and YieldEveryMs for the main thread fallback.
    //
    // Returns the visible segments for the view, already in drawing millimetres.
    export async function VghLantern__ProjectedEdges__WorkerPool__Run(soup, edges, options, settings) {
        const config  =  settings || {};

        if (edges.Count === 0 || soup.TriCount === 0) return new Float32Array(0);

        const threshold  =  (typeof config.MinimumEdgesForWorkers === 'number')
            ? config.MinimumEdgesForWorkers
            : MINIMUM_EDGES_FOR_POOL;

        const workers  =  (edges.Count >= threshold && VghLantern__ProjectedEdges__WorkerPool__IsSupported())
            ? VghLantern__ProjectedEdges__WorkerPool__Ensure(config.MaxWorkers)
            : [];

        if (workers.length === 0) {
            return VghLantern__ProjectedEdges__WorkerPool__RunInline(soup, edges, options, config);
        }

        try {
            return await VghLantern__ProjectedEdges__WorkerPool__RunPooled(workers, soup, edges, options, config);
        } catch (poolError) {
            if (poolError && poolError.name === 'AbortError') throw poolError;

            console.warn('[VghLantern ProjectedEdges] Pooled clip failed, retrying on the main thread:', poolError);
            VghLantern__ProjectedEdges__WorkerPool__Disabled  =  true;
            VghLantern__ProjectedEdges__WorkerPool__Dispose();

            return VghLantern__ProjectedEdges__WorkerPool__RunInline(soup, edges, options, config);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Clip a View Using the Pool
    // ------------------------------------------------------------
    // The occluders are sent to every worker, then slices are dealt out as workers
    // report back. Bumping the generation before loading means any reply still in
    // flight from a previous view is recognisable and discarded.
    function VghLantern__ProjectedEdges__WorkerPool__RunPooled(workers, soup, edges, options, config) {
        const generation  =  ++VghLantern__ProjectedEdges__WorkerPool__Generation;
        const slices      =  VghLantern__ProjectedEdges__WorkerPool__Slices(edges.Count, workers.length);
        const collected   =  [];

        return new Promise(function(resolve, reject) {
            let nextSlice  =  0;
            let completed  =  0;
            let finished   =  false;

            const settle  =  function(handler, value) {
                if (finished) return;
                finished  =  true;

                workers.forEach(function(worker) { worker.onmessage  =  null; });
                if (config.AbortSignal) config.AbortSignal.removeEventListener('abort', onAbort);

                handler(value);
            };

            function onAbort() {
                settle(reject, new DOMException('Projection aborted', 'AbortError'));
            }

            if (config.AbortSignal) {
                if (config.AbortSignal.aborted) {
                    settle(reject, new DOMException('Projection aborted', 'AbortError'));
                    return;
                }
                config.AbortSignal.addEventListener('abort', onAbort);
            }

            const dispatch  =  function(worker) {
                if (nextSlice >= slices.length) return;

                const jobId  =  nextSlice++;
                const slice  =  slices[jobId];

                worker.postMessage({
                    Type       : 'Clip',
                    Generation : generation,
                    JobId      : jobId,
                    EdgeStart  : slice.Start,
                    EdgeEnd    : slice.End
                });
            };

            workers.forEach(function(worker) {
                worker.onmessage  =  function(event) {
                    const message  =  event.data;
                    if (!message || message.Generation !== generation) return;

                    if (message.Type === 'Ready') {
                        dispatch(worker);
                        return;
                    }

                    if (message.Type === 'Failed') {
                        settle(reject, new Error('Clip worker: ' + message.Message));
                        return;
                    }

                    if (message.Type !== 'Done') return;

                    collected.push(message.Segments);
                    completed++;

                    if (typeof config.OnProgress === 'function') {
                        config.OnProgress(completed / slices.length);
                    }

                    if (completed >= slices.length) {
                        settle(resolve, VghLantern__ProjectedEdges__WorkerPool__Join(collected));
                        return;
                    }

                    dispatch(worker);
                };

                // Structured clone rather than transfer: every worker needs its own
                // readable copy, and a transfer would detach the arrays after the
                // first one and leave the rest with nothing to read.
                worker.postMessage({
                    Type       : 'Load',
                    Generation : generation,
                    Soup       : soup,
                    Edges      : edges,
                    Options    : options
                });
            });
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Clip a View on the Main Thread, in Slices
    // ------------------------------------------------------------
    // The universal path: no workers, no transfers, the same kernel. Slices exist
    // here purely so the interface gets a frame between them, and they are cut to
    // the same size the pool would have used so that the two paths stay comparable
    // when the DiffHarness runs one against the other.
    async function VghLantern__ProjectedEdges__WorkerPool__RunInline(soup, edges, options, config) {
        const slices  =  VghLantern__ProjectedEdges__WorkerPool__Slices(edges.Count, 1);
        const slicer  =  VghLantern__ProjectedEdges__Scheduler__CreateSlicer(config.YieldEveryMs);
        const parts   =  [];

        for (let i = 0; i < slices.length; i++) {
            await slicer.Tick();

            if (config.AbortSignal && config.AbortSignal.aborted) {
                throw new DOMException('Projection aborted', 'AbortError');
            }

            const result  =  VghLantern__ProjectedEdges__ClipKernel__Clip(
                soup, edges, slices[i].Start, slices[i].End, options
            );
            parts.push(result.Segments);

            if (typeof config.OnProgress === 'function') {
                config.OnProgress((i + 1) / slices.length);
            }
        }

        return VghLantern__ProjectedEdges__WorkerPool__Join(parts);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
