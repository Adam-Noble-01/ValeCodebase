/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | PIPELINE
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__Pipeline__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - Pipeline
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project on request, share the result, and paint it in
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The single public entry point of the module.
   - NOTHING is projected until RenderAll is called, which happens when the user
     presses the toolbar button. A 2D render only ever repaints a result that has
     already been computed.

   ---------------------------------------------------------------------------

   WHY THIS IS ON DEMAND RATHER THAN AUTOMATIC

   Measured cost is 7 to 11 seconds per view on a real lantern, and the phase
   breakdown puts 86 percent of it inside the library's edge clipping pass, which
   is not reachable from here. Several attempts to bring it down - caching bounds
   trees, driving the generator on our own time slice, welding the input to drawing
   resolution - between them bought little and one of them cost accuracy.

   So the operation is treated as what it is: an expensive, deliberate step. The
   user settles the sheet layout first, then asks for the linework once. Everything
   else in this file exists to make sure they only ever have to ask once.

   ---------------------------------------------------------------------------

   THE FOUR THINGS THIS FILE EXISTS TO GET RIGHT

     SHARING      Several surfaces can want the same view of the same lantern -
                  a sheet frame and the editor viewport. Results are cached by
                  lantern and view, so one render serves all of them.

     REUSE        The staged model is cached by lantern ALONE, separately from the
                  projected results. Rendering three views therefore builds the
                  meshes once and their bounds trees once, and pays only for the
                  three projections.

     SERIALISING  All projection work runs through one queue. The first reason is
                  a correctness bug rather than a preference: orienting a staged
                  model re-parents it, so two projections sharing a cached stage
                  would steal it from one another mid-run and silently project one
                  view through the other's basis. The second is that this work is
                  CPU bound on one thread.

     STALENESS    A projection that outlives its geometry is worse than none, because
                  it looks authoritative and is wrong. A render is keyed to the
                  lantern that produced it; change the lantern and the layer clears
                  itself and the button returns to offering a fresh render.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Sync(surface, skeleton, barSet, lantern, didRender)   repaint from cache only
       RenderAll(onProgress)                                 the expensive step
       Show() / Hide() / IsShown()                           visibility, no recompute
       Status()                                              what the button should say
       Detach(surface)                                       drop a disposed surface
       Debug                                                 console helpers

   ============================================================================= */

import {
    VghLantern__ProjectedEdges__ConfigAccess__Ready,
    VghLantern__ProjectedEdges__ConfigAccess__Section,
    VghLantern__ProjectedEdges__ConfigAccess__IsEnabled,
    VghLantern__ProjectedEdges__ConfigAccess__IsViewEnabled,
    VghLantern__ProjectedEdges__ConfigAccess__ViewLabel,
    VghLantern__ProjectedEdges__ConfigAccess__LogTimings
} from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

import {
    VghLantern__ProjectedEdges__ModelStage__Build,
    VghLantern__ProjectedEdges__ModelStage__PrimeBoundsTrees,
    VghLantern__ProjectedEdges__ModelStage__CountTriangles
} from './VghLantern__ProjectedEdges__ModelStage__.mjs';

import {
    VghLantern__ProjectedEdges__Projector__Project,
    VghLantern__ProjectedEdges__Projector__IsViewSupported
} from './VghLantern__ProjectedEdges__Projector__.mjs';

import {
    VghLantern__ProjectedEdges__SvgLayer__Paint,
    VghLantern__ProjectedEdges__SvgLayer__Clear,
    VghLantern__ProjectedEdges__SvgLayer__Remove
} from './VghLantern__ProjectedEdges__SvgLayer__.mjs';

// =============================================================================
// REGION | Projected Edges Pipeline Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Per Surface State Stamp
    // ------------------------------------------------------------
    // Stamped onto the Env2d surface object rather than held in a registry here.
    // Surfaces are created and disposed freely by the placement layer, and a
    // registry keyed by them would either leak or need a lifecycle this module has
    // no business owning. The Drawing Editor already uses the same idiom, parking
    // its camera edit arguments on a DOM node.
    const SURFACE_STATE_KEY  =  '__VghLantern__ProjectedEdges__State';

    const DEFAULT_MAX_RESULTS  =  16;
    const DEFAULT_MAX_STAGES   =  2;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Caches, Live Surfaces and Render State
    // ------------------------------------------------------------
    const VghLantern__ProjectedEdges__Pipeline__ResultCache   =  new Map();   // <-- 'viewKey|lantern' to Float32Array of segments
    const VghLantern__ProjectedEdges__Pipeline__StageCache    =  new Map();   // <-- 'lantern' to a staged THREE.Group with primed bounds trees
    const VghLantern__ProjectedEdges__Pipeline__LiveSurfaces  =  new Set();   // <-- Surfaces that can be repainted without a re-render

    let   VghLantern__ProjectedEdges__Pipeline__IsShown       =  false;       // <-- Runtime visibility, not a config value
    let   VghLantern__ProjectedEdges__Pipeline__IsWorking     =  false;       // <-- A render is in progress
    let   VghLantern__ProjectedEdges__Pipeline__Abort         =  null;        // <-- Controller for the render in progress
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface State and Cache Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get or Create the State Stamped on a Surface
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Pipeline__State(surface) {
        if (!surface[SURFACE_STATE_KEY]) {
            surface[SURFACE_STATE_KEY]  =  {
                WantedKey : null,
                Skeleton  : null,
                BarSet    : null,
                Lantern   : null,
                DidRender : false
            };
        }
        return surface[SURFACE_STATE_KEY];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Identify a Staged Model by What Actually Shapes It
    // ------------------------------------------------------------
    // NOT the whole lantern. A lantern carries its recorded sheet setup -
    // Lantern__DrawingLayout__Config, holding paper size, orientation, scale, gutter
    // shares and the sheet camera - and serialising that into the key would mean
    // adjusting the layout discarded a render the user had just waited half a minute
    // for. The ignored blocks are listed in config; everything else contributes.
    //
    // The direction of the risk decides the shape of the list. A block that shapes
    // geometry and is wrongly ignored would leave the WRONG lantern drawn, while a
    // block that does not and is wrongly included merely costs a re-render. So it is
    // a denylist of known-inert blocks, and anything new is included by default.
    //
    // Keys are sorted because a normalise pass can reinsert a block in a different
    // order and JSON.stringify follows insertion order - two identical lanterns
    // would otherwise hash differently and quietly miss the cache.
    function VghLantern__ProjectedEdges__Pipeline__StageKey(lantern) {
        if (!lantern || typeof lantern !== 'object') return null;

        const ignored  =  VghLantern__ProjectedEdges__ConfigAccess__Section('CacheKey').IgnoredLanternBlocks;
        const skip     =  Array.isArray(ignored) ? ignored : [];
        const shaping  =  {};

        Object.keys(lantern).sort().forEach(function(blockName) {
            if (skip.indexOf(blockName) !== -1) return;
            shaping[blockName]  =  lantern[blockName];
        });

        try {
            return JSON.stringify(shaping);
        } catch (serialiseError) {
            return null;                                                      // <-- Unserialisable lantern: never cache
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Cache Key a Surface Currently Wants, or Null
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Pipeline__KeyFor(surface) {
        const state  =  surface[SURFACE_STATE_KEY];
        if (!state || !state.DidRender || !state.Skeleton || !state.Lantern) return null;

        const viewKey  =  surface.ViewKey;
        if (!VghLantern__ProjectedEdges__ConfigAccess__IsViewEnabled(viewKey)) return null;
        if (!VghLantern__ProjectedEdges__Projector__IsViewSupported(viewKey)) return null;

        const stageKey  =  VghLantern__ProjectedEdges__Pipeline__StageKey(state.Lantern);
        return (stageKey === null) ? null : (viewKey + '|' + stageKey);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bound a Cache by Dropping Its Oldest Entry
    // ------------------------------------------------------------
    // A Map iterates in insertion order, so the first key is the oldest and dropping
    // it is a plain first in first out eviction.
    //
    // An evicted stage is dropped, never disposed. Its geometries are shared with
    // the live 3D viewport and were never rendered from here in the first place;
    // see the note at the head of ModelStage.
    function VghLantern__ProjectedEdges__Pipeline__Bound(cache, maximumEntries) {
        while (cache.size > maximumEntries) {
            cache.delete(cache.keys().next().value);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Surface Is Still Usable
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Pipeline__IsLive(surface) {
        return !!(surface &&
                  surface.Instance &&
                  surface.Instance.Root &&
                  surface.Instance.Root.isConnected);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Live Surface, Pruning Any That Have Gone
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Pipeline__LiveList() {
        const live  =  [];

        Array.from(VghLantern__ProjectedEdges__Pipeline__LiveSurfaces).forEach(function(surface) {
            if (VghLantern__ProjectedEdges__Pipeline__IsLive(surface)) {
                live.push(surface);
            } else {
                VghLantern__ProjectedEdges__Pipeline__LiveSurfaces.delete(surface);
            }
        });

        return live;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Painting
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Paint One Surface From Cache, or Clear It
    // ------------------------------------------------------------
    // The only place the layer is written. A surface shows linework when the module
    // is enabled, the layer is switched to shown, and a result exists for exactly
    // the lantern and view it is currently drawing. Anything else clears, which is
    // what makes stale linework impossible rather than merely unlikely.
    function VghLantern__ProjectedEdges__Pipeline__PaintOne(surface) {
        const instance  =  surface.Instance;
        if (!instance) return false;

        if (!VghLantern__ProjectedEdges__ConfigAccess__IsEnabled()) {
            VghLantern__ProjectedEdges__SvgLayer__Remove(instance);
            return false;
        }

        const cacheKey  =  VghLantern__ProjectedEdges__Pipeline__KeyFor(surface);
        const segments  =  (cacheKey && VghLantern__ProjectedEdges__Pipeline__IsShown)
            ? VghLantern__ProjectedEdges__Pipeline__ResultCache.get(cacheKey)
            : null;

        if (!segments) {
            VghLantern__ProjectedEdges__SvgLayer__Clear(instance);
            return false;
        }

        VghLantern__ProjectedEdges__SvgLayer__Paint(instance, segments);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Repaint Every Live Surface From Cache
    // ------------------------------------------------------------
    // Never computes. Used by show, hide, and every helper that changes what should
    // be on screen without changing what has been projected.
    export function VghLantern__ProjectedEdges__Pipeline__Refresh() {
        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(VghLantern__ProjectedEdges__Pipeline__PaintOne);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Synchronisation With a 2D Render
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Surface and Repaint It From Cache
    // ------------------------------------------------------------
    // Called after every 2D render. It records what the surface just drew and paints
    // any matching result already in hand. It does NOT project: a redraw must never
    // silently start a half minute of work.
    //
    // The practical effect is that a rendered layer survives everything that does
    // not change the lantern - panning, zooming, switching modes and back, adjusting
    // the sheet layout - and disappears the moment something does.
    export function VghLantern__ProjectedEdges__Pipeline__Sync(surface, skeleton, barSet, lantern, didRender) {
        if (!surface) return;

        void (async function() {
            await VghLantern__ProjectedEdges__ConfigAccess__Ready();

            if (!surface.Instance) {
                VghLantern__ProjectedEdges__Pipeline__LiveSurfaces.delete(surface);
                return;
            }

            const state  =  VghLantern__ProjectedEdges__Pipeline__State(surface);
            state.Skeleton   =  skeleton  || null;
            state.BarSet     =  barSet    || null;
            state.Lantern    =  lantern   || null;
            state.DidRender  =  didRender === true;
            state.WantedKey  =  VghLantern__ProjectedEdges__Pipeline__KeyFor(surface);

            VghLantern__ProjectedEdges__Pipeline__LiveSurfaces.add(surface);

            if (VghLantern__ProjectedEdges__ConfigAccess__Section('Render').RepaintFromCacheOnRedraw === false) return;
            VghLantern__ProjectedEdges__Pipeline__PaintOne(surface);
        })().catch(function(syncError) {
            console.error('[VghLantern ProjectedEdges] Overlay sync failed:', syncError);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Retire a Surface That Is Being Disposed
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__Detach(surface) {
        if (!surface) return;

        VghLantern__ProjectedEdges__Pipeline__LiveSurfaces.delete(surface);
        if (surface[SURFACE_STATE_KEY]) surface[SURFACE_STATE_KEY].WantedKey  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Get a Staged Model With Its Bounds Trees Already Built
    // ------------------------------------------------------------
    // Reused across views of the same lantern, which is where most of the saving
    // lives when three views are rendered together: the meshes are built once and
    // every geometry's BVH is built once, leaving each view paying for its
    // projection alone.
    async function VghLantern__ProjectedEdges__Pipeline__GetStage(stageKey, skeleton, barSet, lantern, report) {
        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        const reuse           =  performanceCfg.ReuseStagedModel !== false && stageKey !== null;

        if (reuse && VghLantern__ProjectedEdges__Pipeline__StageCache.has(stageKey)) {
            report.StageReused  =  true;
            return VghLantern__ProjectedEdges__Pipeline__StageCache.get(stageKey);
        }

        const builtAtStart  =  performance.now();
        const stage         =  await VghLantern__ProjectedEdges__ModelStage__Build(skeleton, barSet, lantern);
        report.StageMs      =  Math.round(performance.now() - builtAtStart);
        report.Triangles    =  VghLantern__ProjectedEdges__ModelStage__CountTriangles(stage);

        const primedAtStart =  performance.now();
        report.BvhCount     =  await VghLantern__ProjectedEdges__ModelStage__PrimeBoundsTrees(
            stage, performanceCfg.YieldEveryMs
        );
        report.BvhMs        =  Math.round(performance.now() - primedAtStart);

        if (reuse) {
            VghLantern__ProjectedEdges__Pipeline__StageCache.set(stageKey, stage);
            VghLantern__ProjectedEdges__Pipeline__Bound(
                VghLantern__ProjectedEdges__Pipeline__StageCache,
                (typeof performanceCfg.MaxCachedStages === 'number') ? performanceCfg.MaxCachedStages : DEFAULT_MAX_STAGES
            );
        }

        return stage;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Report What One View Cost
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Pipeline__LogCost(viewKey, report, segments) {
        if (!VghLantern__ProjectedEdges__ConfigAccess__LogTimings()) return;

        const staging  =  report.StageReused
            ? 'stage reused'
            : (report.Triangles + ' triangles in ' + report.StageMs + ' ms, ' +
               report.BvhCount + ' bounds trees in ' + report.BvhMs + ' ms');

        console.log(
            '[VghLantern ProjectedEdges] ' + viewKey + ' | ' + staging +
            ' | ' + Math.floor(segments.length / 4) + ' segments in ' + report.ProjectMs + ' ms' +
            ' | total ' + report.TotalMs + ' ms'
        );

        if (report.Phases && report.Phases.length) console.table(report.Phases);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Project One View and Cache the Result
    // ------------------------------------------------------------
    async function VghLantern__ProjectedEdges__Pipeline__RenderOne(job, abortSignal, onPhase) {
        const startedAt  =  performance.now();
        const report     =  { StageReused : false, StageMs : 0, Triangles : 0, BvhMs : 0, BvhCount : 0 };

        abortSignal.throwIfAborted();

        const stage  =  await VghLantern__ProjectedEdges__Pipeline__GetStage(
            job.StageKey, job.Skeleton, job.BarSet, job.Lantern, report
        );

        const projectedAtStart  =  performance.now();
        const projection        =  await VghLantern__ProjectedEdges__Projector__Project(
            stage, job.ViewKey, abortSignal, onPhase
        );

        report.ProjectMs  =  Math.round(performance.now() - projectedAtStart);
        report.TotalMs    =  Math.round(performance.now() - startedAt);
        report.Phases     =  projection.Phases;

        VghLantern__ProjectedEdges__Pipeline__LogCost(job.ViewKey, report, projection.Segments);

        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        VghLantern__ProjectedEdges__Pipeline__ResultCache.set(job.CacheKey, projection.Segments);
        VghLantern__ProjectedEdges__Pipeline__Bound(
            VghLantern__ProjectedEdges__Pipeline__ResultCache,
            (typeof performanceCfg.MaxCachedResults === 'number') ? performanceCfg.MaxCachedResults : DEFAULT_MAX_RESULTS
        );

        return projection.Segments.length / 4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Work Out Which Views Need Projecting
    // ------------------------------------------------------------
    // Derived from the surfaces actually on screen rather than from the config list
    // alone, so a sheet showing three orthographic frames renders three views and a
    // sheet showing one renders one. Deduplicated by cache key, because two surfaces
    // on the same view of the same lantern want the same lines.
    function VghLantern__ProjectedEdges__Pipeline__CollectJobs(includeCached) {
        const jobs  =  new Map();

        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(function(surface) {
            const cacheKey  =  VghLantern__ProjectedEdges__Pipeline__KeyFor(surface);
            if (!cacheKey || jobs.has(cacheKey)) return;
            if (!includeCached && VghLantern__ProjectedEdges__Pipeline__ResultCache.has(cacheKey)) return;

            const state  =  surface[SURFACE_STATE_KEY];
            jobs.set(cacheKey, {
                CacheKey  : cacheKey,
                ViewKey   : surface.ViewKey,
                ViewLabel : VghLantern__ProjectedEdges__ConfigAccess__ViewLabel(surface.ViewKey),
                StageKey  : VghLantern__ProjectedEdges__Pipeline__StageKey(state.Lantern),
                Skeleton  : state.Skeleton,
                BarSet    : state.BarSet,
                Lantern   : state.Lantern
            });
        });

        return Array.from(jobs.values());
    }
    // ------------------------------------------------------------


    // FUNCTION | Project Every View That Needs It, Reporting Progress
    // ------------------------------------------------------------
    // The expensive step, and the only one that computes anything. Runs the views
    // one after another rather than together: they share a staged model, which a
    // second concurrent projection would re-parent out from under the first.
    //
    // Each view is painted the moment it finishes rather than at the end, so the
    // front elevation appears while the plan is still being clipped.
    //
    // onProgress receives { Index, Total, ViewKey, ViewLabel, Phase } and is called
    // on entering each view and again on every phase change inside it.
    export async function VghLantern__ProjectedEdges__Pipeline__RenderAll(onProgress) {
        await VghLantern__ProjectedEdges__ConfigAccess__Ready();

        if (VghLantern__ProjectedEdges__Pipeline__IsWorking) return { Rendered : 0, Total : 0, WasBusy : true };
        if (!VghLantern__ProjectedEdges__ConfigAccess__IsEnabled()) return { Rendered : 0, Total : 0 };

        const jobs  =  VghLantern__ProjectedEdges__Pipeline__CollectJobs(false);

        // Already in hand for every view on screen. Show them and finish, so a second
        // press of the button after a redraw is instant rather than a repeat of the
        // whole computation.
        if (jobs.length === 0) {
            VghLantern__ProjectedEdges__Pipeline__IsShown  =  true;
            VghLantern__ProjectedEdges__Pipeline__Refresh();
            return { Rendered : 0, Total : 0 };
        }

        VghLantern__ProjectedEdges__Pipeline__IsWorking  =  true;
        VghLantern__ProjectedEdges__Pipeline__IsShown    =  true;
        VghLantern__ProjectedEdges__Pipeline__Abort      =  new AbortController();

        const signal  =  VghLantern__ProjectedEdges__Pipeline__Abort.signal;
        let   done    =  0;

        try {
            for (let i = 0; i < jobs.length; i++) {
                const job  =  jobs[i];

                const report  =  function(phase) {
                    if (typeof onProgress !== 'function') return;
                    onProgress({
                        Index     : i + 1,
                        Total     : jobs.length,
                        ViewKey   : job.ViewKey,
                        ViewLabel : job.ViewLabel,
                        Phase     : phase || ''
                    });
                };

                report('');
                await VghLantern__ProjectedEdges__Pipeline__RenderOne(job, signal, report);
                done++;

                VghLantern__ProjectedEdges__Pipeline__Refresh();               // <-- Each view lands as soon as it is ready
            }
        } finally {
            VghLantern__ProjectedEdges__Pipeline__IsWorking  =  false;
            VghLantern__ProjectedEdges__Pipeline__Abort      =  null;
        }

        return { Rendered : done, Total : jobs.length };
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop a Render in Progress
    // ------------------------------------------------------------
    // Views already finished keep their results; the one in flight is abandoned at
    // its next yield point.
    export function VghLantern__ProjectedEdges__Pipeline__Cancel() {
        if (VghLantern__ProjectedEdges__Pipeline__Abort) VghLantern__ProjectedEdges__Pipeline__Abort.abort();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility and Status
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Rendered Linework
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__Show() {
        VghLantern__ProjectedEdges__Pipeline__IsShown  =  true;
        VghLantern__ProjectedEdges__Pipeline__Refresh();
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Rendered Linework, Keeping It Cached
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__Hide() {
        VghLantern__ProjectedEdges__Pipeline__IsShown  =  false;
        VghLantern__ProjectedEdges__Pipeline__Refresh();
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Layer Is Currently Shown
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__IsLayerShown() {
        return VghLantern__ProjectedEdges__Pipeline__IsShown;
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Toolbar Button Should Currently Offer
    // ------------------------------------------------------------
    // Reports counts rather than a label, so the wording stays in config and the
    // button stays a presentation concern.
    //
    //   Total     views on screen this module covers
    //   Rendered  how many of those already have a result for THIS lantern
    //   IsStale   something has been rendered, but not for the lantern on screen
    export function VghLantern__ProjectedEdges__Pipeline__Status() {
        const covered  =  VghLantern__ProjectedEdges__Pipeline__CollectJobs(true);
        let   rendered =  0;

        covered.forEach(function(job) {
            if (VghLantern__ProjectedEdges__Pipeline__ResultCache.has(job.CacheKey)) rendered++;
        });

        return {
            IsEnabled : VghLantern__ProjectedEdges__ConfigAccess__IsEnabled(),
            IsWorking : VghLantern__ProjectedEdges__Pipeline__IsWorking,
            IsShown   : VghLantern__ProjectedEdges__Pipeline__IsShown,
            Total     : covered.length,
            Rendered  : rendered,
            IsStale   : rendered < covered.length && VghLantern__ProjectedEdges__Pipeline__ResultCache.size > 0
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Console Debug Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Console Helper Object
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__BuildDebugApi() {
        return {

            // Run the projection from the console, logging progress
            Render : function() {
                return VghLantern__ProjectedEdges__Pipeline__RenderAll(function(progress) {
                    console.log('[VghLantern ProjectedEdges] ' + progress.ViewLabel +
                                ' (' + progress.Index + ' of ' + progress.Total + ') ' + progress.Phase);
                });
            },

            Cancel : VghLantern__ProjectedEdges__Pipeline__Cancel,
            Show   : VghLantern__ProjectedEdges__Pipeline__Show,
            Hide   : VghLantern__ProjectedEdges__Pipeline__Hide,
            Status : VghLantern__ProjectedEdges__Pipeline__Status,

            // Change a projection or performance setting and drop what was rendered against the old one
            Set : function(sectionName, fieldName, value) {
                VghLantern__ProjectedEdges__ConfigAccess__Section(sectionName)[fieldName]  =  value;
                VghLantern__ProjectedEdges__Pipeline__ResultCache.clear();
                VghLantern__ProjectedEdges__Pipeline__StageCache.clear();
                VghLantern__ProjectedEdges__Pipeline__Refresh();
                console.log('[VghLantern ProjectedEdges] ' + sectionName + '.' + fieldName + ' set to', value,
                            '- render again to see it.');
            },

            // Throw away every result and staged model
            ClearCache : function() {
                VghLantern__ProjectedEdges__Pipeline__ResultCache.clear();
                VghLantern__ProjectedEdges__Pipeline__StageCache.clear();
                VghLantern__ProjectedEdges__Pipeline__Refresh();
                console.log('[VghLantern ProjectedEdges] Caches cleared.');
            },

            // What is cached and how big each result is
            Stats : function() {
                const rows  =  [];
                VghLantern__ProjectedEdges__Pipeline__ResultCache.forEach(function(segments, cacheKey) {
                    rows.push({
                        View     : cacheKey.split('|')[0],
                        Segments : Math.floor(segments.length / 4)
                    });
                });

                console.table(rows);
                console.log('[VghLantern ProjectedEdges] ' +
                            rows.length + ' results cached, ' +
                            VghLantern__ProjectedEdges__Pipeline__StageCache.size + ' stages cached, ' +
                            VghLantern__ProjectedEdges__Pipeline__LiveSurfaces.size + ' live surfaces.');
                return rows;
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
