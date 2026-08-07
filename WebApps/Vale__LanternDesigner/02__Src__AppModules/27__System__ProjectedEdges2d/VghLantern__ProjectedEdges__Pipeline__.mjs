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

   It began as a necessity. The vendored library cost 7 to 11 seconds per view, with
   86 percent of that inside an edge clipping pass there was no way to reach, and
   several attempts to bring it down - caching bounds trees, driving the generator on
   our own time slice, welding the input to drawing resolution - between them bought
   little and one of them cost accuracy.

   That pass has since been rewritten, and the cost is a different order of
   magnitude. On-demand stays anyway, for a better reason than it started with: a
   projection is still real work on a real model, and a redraw that quietly started
   it would make panning a drawing expensive. The user settles the sheet layout,
   then asks for the linework once. Everything else in this file exists to make sure
   they only ever have to ask once.

   What DID change is what happens after they ask. A provisional picture of each
   view appears almost immediately - see RasterPreview - so the wait is spent
   looking at the right shape rather than at nothing.

   ---------------------------------------------------------------------------

   THE FOUR THINGS THIS FILE EXISTS TO GET RIGHT

     SHARING      Several surfaces can want the same view of the same lantern -
                  a sheet frame and the editor viewport. Results are cached by
                  lantern and view, so one render serves all of them.

     REUSE        The staged model is cached by lantern ALONE, separately from the
                  projected results, and so is everything derived from it that does
                  not depend on the view: the flattened vertex arrays, the per
                  geometry edge analysis, and the lines where solids cut through one
                  another. Rendering three views therefore reads the model once and
                  pays only for the three projections.

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
       Debug                                                 console helpers, including
                                                             Diff(a, b) to hold one
                                                             backend against another

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
    VghLantern__ProjectedEdges__Projector__PrepareSample,
    VghLantern__ProjectedEdges__Projector__PrepareIntersections,
    VghLantern__ProjectedEdges__Projector__Preview,
    VghLantern__ProjectedEdges__Projector__BuildOptions,
    VghLantern__ProjectedEdges__Projector__IsViewSupported
} from './VghLantern__ProjectedEdges__Projector__.mjs';

import {
    VghLantern__ProjectedEdges__SvgLayer__Paint,
    VghLantern__ProjectedEdges__SvgLayer__PaintPreview,
    VghLantern__ProjectedEdges__SvgLayer__ClearPreview,
    VghLantern__ProjectedEdges__SvgLayer__Clear,
    VghLantern__ProjectedEdges__SvgLayer__Remove
} from './VghLantern__ProjectedEdges__SvgLayer__.mjs';

import {
    VghLantern__ProjectedEdges__Scheduler__CreateSlicer,
    VghLantern__ProjectedEdges__Scheduler__NextFrame
} from './VghLantern__ProjectedEdges__Scheduler__.mjs';

import {
    VghLantern__ProjectedEdges__DiffHarness__Compare,
    VghLantern__ProjectedEdges__DiffHarness__LogReport
} from './VghLantern__ProjectedEdges__DiffHarness__.mjs';

import {
    VghLantern__ProjectedEdges__LineworkStore__BlockName,
    VghLantern__ProjectedEdges__LineworkStore__Fingerprint,
    VghLantern__ProjectedEdges__LineworkStore__Serialise,
    VghLantern__ProjectedEdges__LineworkStore__Deserialise,
    VghLantern__ProjectedEdges__LineworkStore__DescribeBlock
} from './VghLantern__ProjectedEdges__LineworkStore__.mjs';

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

    // Fired on window whenever a render finishes, succeeds or fails. The toolbar
    // button listens; anything else that wants to know may.
    export const VGHLANTERN__PROJECTED_EDGES__CHANGED_EVENT  =  'vghlantern-projectededges-changed';

    const DEFAULT_MAX_RESULTS  =  16;
    const DEFAULT_MAX_STAGES   =  2;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Caches, Live Surfaces and Render State
    // ------------------------------------------------------------
    const VghLantern__ProjectedEdges__Pipeline__ResultCache   =  new Map();   // <-- 'viewKey|lantern' to Float32Array of segments
    const VghLantern__ProjectedEdges__Pipeline__StageCache    =  new Map();   // <-- 'lantern' to a staged THREE.Group with primed bounds trees
    const VghLantern__ProjectedEdges__Pipeline__LiveSurfaces  =  new Set();   // <-- Surfaces that can be repainted without a re-render
    const VghLantern__ProjectedEdges__Pipeline__RestoredKeys   =  new Set();  // <-- Lanterns already offered their stored linework, so it is tried once
    const VghLantern__ProjectedEdges__Pipeline__StoredLanterns =  new Set();  // <-- Scratch, so one render writes each lantern's block once

    let   VghLantern__ProjectedEdges__Pipeline__IsShown       =  false;       // <-- Runtime visibility, not a config value
    let   VghLantern__ProjectedEdges__Pipeline__IsWorking     =  false;       // <-- A render is in progress
    let   VghLantern__ProjectedEdges__Pipeline__Abort         =  null;        // <-- Controller for the render in progress
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Last Lantern This Module Was Shown
    // ------------------------------------------------------------
    // Everything needed to project a lantern arrives stamped on an Env2d surface
    // during a 2D render, and for most of this module's life that is where it is
    // read from. But a render can now be asked for when NO 2D surface is mounted at
    // all - from the Preview and Send screen, or from the keyboard in any mode - and
    // at that moment there is nothing on screen to ask.
    //
    // So the last one seen is kept. It is a fallback and never a preference: a live
    // surface always wins, because it is current by definition where this is only
    // probably current.
    let   VghLantern__ProjectedEdges__Pipeline__LastSeen  =  null;
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Realtime Debounce
    // ------------------------------------------------------------
    let   VghLantern__ProjectedEdges__Pipeline__AutoTimer   =  null;
    let   VghLantern__ProjectedEdges__Pipeline__UserHidden  =  false;
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

            if (state.Skeleton && state.Lantern) {
                VghLantern__ProjectedEdges__Pipeline__LastSeen  =  {
                    Skeleton : state.Skeleton,
                    BarSet   : state.BarSet,
                    Lantern  : state.Lantern
                };

                VghLantern__ProjectedEdges__Pipeline__RestoreStored(state.Lantern);
            }

            if (VghLantern__ProjectedEdges__ConfigAccess__Section('Render').RepaintFromCacheOnRedraw !== false) {
                VghLantern__ProjectedEdges__Pipeline__PaintOne(surface);
            }

            // The realtime step. If this surface is showing a lantern whose linework
            // is not in hand, the drawing is out of date and something should be
            // done about it without anybody having to ask.
            if (state.WantedKey && !VghLantern__ProjectedEdges__Pipeline__ResultCache.has(state.WantedKey)) {
                VghLantern__ProjectedEdges__Pipeline__ScheduleAuto();
            }
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

    // SUB FUNCTION | Get a Lantern's Staged Model and Its Prepared Data
    // ------------------------------------------------------------
    // Two layers of reuse, both keyed to the lantern rather than to the view.
    //
    //   THE STAGE      Meshes built once and their three-mesh-bvh trees primed
    //                  once. Shared by every view, and by every backend.
    //
    //   THE PREPARED   Every vertex read out into flat arrays, every geometry
    //                  analysed for candidate edges, and - for the cpu backend -
    //                  every line where two solids cut through one another. That
    //                  last one was 13 percent of EVERY view before it was hoisted
    //                  up here, and it is the single largest saving on a render of
    //                  three views.
    //
    // The prepared data is rebuilt if the backend has changed underneath it in a
    // way that needs more than it currently holds. Going the other way - holding
    // intersection lines a backend does not want - costs nothing and is left alone.
    async function VghLantern__ProjectedEdges__Pipeline__GetLantern(job, options, report, slicer, onPhase, wantIntersections) {
        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        const stageKey        =  job.StageKey;
        const reuse           =  performanceCfg.ReuseStagedModel !== false && stageKey !== null;

        let entry  =  reuse ? VghLantern__ProjectedEdges__Pipeline__StageCache.get(stageKey) : null;

        if (entry) {
            report.StageReused  =  true;
        } else {
            const builtAtStart  =  performance.now();
            const stage         =  await VghLantern__ProjectedEdges__ModelStage__Build(job.Skeleton, job.BarSet, job.Lantern);
            report.StageMs      =  Math.round(performance.now() - builtAtStart);
            report.Triangles    =  VghLantern__ProjectedEdges__ModelStage__CountTriangles(stage);

            const primedAtStart =  performance.now();
            report.BvhCount     =  await VghLantern__ProjectedEdges__ModelStage__PrimeBoundsTrees(
                stage, performanceCfg.YieldEveryMs
            );
            report.BvhMs        =  Math.round(performance.now() - primedAtStart);

            entry  =  { Stage : stage, Prepared : null, HasIntersections : false };

            if (reuse) {
                VghLantern__ProjectedEdges__Pipeline__StageCache.set(stageKey, entry);
                VghLantern__ProjectedEdges__Pipeline__Bound(
                    VghLantern__ProjectedEdges__Pipeline__StageCache,
                    (typeof performanceCfg.MaxCachedStages === 'number') ? performanceCfg.MaxCachedStages : DEFAULT_MAX_STAGES
                );
            }
        }

        // Reading the model is cheap and is needed by the picture as well as by the
        // linework, so it happens whenever it is missing.
        const preparedAtStart  =  performance.now();
        let   didWork          =  false;

        if (!entry.Prepared) {
            entry.Prepared  =  VghLantern__ProjectedEdges__Projector__PrepareSample(entry.Stage, onPhase);
            didWork  =  true;
        }

        // Finding the cut lines is not cheap, so it happens only when the exact
        // linework is actually being asked for. wantIntersections is false on the
        // preview pass, which is what lets a picture appear a second before the
        // linework it stands in for.
        if (wantIntersections && options.NeedsIntersectionEdges && !entry.Prepared.HasIntersections) {
            await VghLantern__ProjectedEdges__Projector__PrepareIntersections(
                entry.Prepared, options, slicer, onPhase
            );
            didWork  =  true;
        }

        if (didWork) {
            report.PrepareMs     =  Math.round(performance.now() - preparedAtStart);
            report.SampledCount  =  entry.Prepared.TriangleCount;
            report.CutLineCount  =  entry.Prepared.Report.IntersectionCount;
            report.PairsTested   =  entry.Prepared.Report.PairsTested;
            report.PairsSkipped  =  entry.Prepared.Report.PairsSkipped;
            report.SelfReused    =  entry.Prepared.Report.SelfReused;
        } else {
            report.PrepareReused =  true;
        }

        return entry;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show the Provisional Picture for One View
    // ------------------------------------------------------------
    // Painted onto every live surface already showing this exact lantern and view,
    // which is the same set the finished segments will land on. A surface that has
    // moved on to a different lantern is skipped, so a preview can never appear
    // over the wrong drawing.
    function VghLantern__ProjectedEdges__Pipeline__ShowPreview(cacheKey, preview) {
        if (!preview) return;

        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(function(surface) {
            if (VghLantern__ProjectedEdges__Pipeline__KeyFor(surface) !== cacheKey) return;
            VghLantern__ProjectedEdges__SvgLayer__PaintPreview(surface.Instance, preview);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Take Every Provisional Picture Away
    // ------------------------------------------------------------
    // Called from a finally block, so an abandoned or failed render cannot leave a
    // placeholder behind to be mistaken for linework or swept into a sheet bake.
    function VghLantern__ProjectedEdges__Pipeline__ClearPreviews() {
        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(function(surface) {
            VghLantern__ProjectedEdges__SvgLayer__ClearPreview(surface.Instance);
        });
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

        const preparing  =  report.PrepareReused
            ? 'prep reused'
            : ('prep ' + report.PrepareMs + ' ms' +
               (report.CutLineCount ? (', ' + report.CutLineCount + ' cut lines') : '') +
               (report.PairsTested ? (' from ' + report.PairsTested + ' pairs, ' +
                                      report.PairsSkipped + ' skipped, ' +
                                      report.SelfReused + ' selves reused') : ''));

        console.log(
            '[VghLantern ProjectedEdges] ' + viewKey + ' [' + report.Backend + '] | ' + staging +
            ' | ' + preparing +
            (report.PreviewMs ? (' | preview ' + report.PreviewMs + ' ms') : '') +
            ' | ' + Math.floor(segments.length / 4) + ' segments in ' + report.ProjectMs + ' ms' +
            ' | total ' + report.TotalMs + ' ms'
        );

        if (report.Phases && report.Phases.length) console.table(report.Phases);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Project One View and Cache the Result
    // ------------------------------------------------------------
    // The order here is the whole point of the rewrite. Preparing comes first and is
    // usually free; the preview follows and is on screen within a frame or two;
    // only then does the expensive pass start, behind a drawing that already shows
    // the user roughly what they are waiting for.
    async function VghLantern__ProjectedEdges__Pipeline__RenderOne(job, options, abortSignal, onPhase) {
        const startedAt  =  performance.now();
        const report     =  {
            Backend : options.Backend, StageReused : false, StageMs : 0, Triangles : 0,
            BvhMs : 0, BvhCount : 0, PrepareMs : 0, PrepareReused : false, PreviewMs : 0
        };

        abortSignal.throwIfAborted();

        const slicer  =  VghLantern__ProjectedEdges__Scheduler__CreateSlicer(options.YieldEveryMs);
        const entry   =  await VghLantern__ProjectedEdges__Pipeline__GetLantern(job, options, report, slicer, onPhase, true);

        abortSignal.throwIfAborted();

        const projectedAtStart  =  performance.now();
        const projection        =  await VghLantern__ProjectedEdges__Projector__Project(
            entry.Prepared, entry.Stage, job.ViewKey, options,
            { AbortSignal : abortSignal, OnPhase : onPhase }
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


    // SUB FUNCTION | Put a Provisional Picture on Every View, Quickly
    // ------------------------------------------------------------
    // Runs before any exact work starts, and skips the intersection pass entirely
    // by asking GetLantern not to bother with it. On a full lantern this is the
    // difference between a picture appearing in around a tenth of a second and one
    // appearing after the second the cut lines take to find.
    //
    // A failure here is swallowed. The preview is a courtesy; the render behind it
    // is the actual job, and it must not be lost because a picture could not be
    // produced.
    async function VghLantern__ProjectedEdges__Pipeline__PreviewPass(jobs, options, abortSignal) {
        if (VghLantern__ProjectedEdges__ConfigAccess__Section('Preview').Enabled === false) return;

        for (let i = 0; i < jobs.length; i++) {
            if (abortSignal && abortSignal.aborted) return;

            const job  =  jobs[i];

            try {
                const entry  =  await VghLantern__ProjectedEdges__Pipeline__GetLantern(
                    job, options, {}, null, null, false
                );

                const preview  =  VghLantern__ProjectedEdges__Projector__Preview(entry.Prepared, job.ViewKey, options);
                VghLantern__ProjectedEdges__Pipeline__ShowPreview(job.CacheKey, preview);
            } catch (previewError) {
                if (previewError && previewError.name === 'AbortError') return;
                console.warn('[VghLantern ProjectedEdges] Preview pass skipped ' + job.ViewKey + ':', previewError);
            }

            // A whole frame, unconditionally, rather than the usual budgeted yield.
            // Jobs are ordered with the view on screen first, so this is what puts
            // that view's picture in front of the user before any effort goes into
            // the ones they cannot see.
            await VghLantern__ProjectedEdges__Scheduler__NextFrame();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rank Views by Whether the User Is Looking at Them
    // ------------------------------------------------------------
    // Returns viewKey to rank, lowest first. Three tiers:
    //
    //   0  ON SCREEN NOW      A live surface is drawing this view and it occupies
    //                         real space in the window.
    //   1  MOUNTED, UNSEEN    A live surface is drawing it, but the panel holding
    //                         it has no size - a collapsed split, or a mode that
    //                         has been left without disposing its viewports.
    //   2  NOT MOUNTED        Rendered so that switching to it later is instant.
    //
    // The measurement is a bounding rectangle, which forces layout. That is
    // acceptable here and nowhere near the hot path: it happens once per render,
    // over a handful of elements, before any projection work starts.
    function VghLantern__ProjectedEdges__Pipeline__ViewRanks() {
        const ranks  =  new Map();

        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(function(surface) {
            const viewKey  =  surface.ViewKey;
            if (!viewKey) return;

            let rank  =  1;
            try {
                const box  =  surface.Instance.Root.getBoundingClientRect();
                if (box.width > 0 && box.height > 0) rank  =  0;
            } catch (measureError) {
                rank  =  1;                                                   // <-- Unmeasurable is treated as mounted but unseen
            }

            const existing  =  ranks.get(viewKey);
            if (existing === undefined || rank < existing) ranks.set(viewKey, rank);
        });

        return ranks;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Work Out Which Views Need Projecting
    // ------------------------------------------------------------
    // Jobs are derived from the LANTERN, not from the viewports that happen to be
    // mounted. Every view the configuration lists is rendered, whether or not
    // anything is currently showing it.
    //
    // That is a deliberate change from the original behaviour, which rendered only
    // what was on screen. Rendering from the Drawing Editor then left the Lantern
    // Editor's viewports blank, and rendering from the Lantern Editor left the sheet
    // blank, because each had computed only its own frames and the other's cache
    // keys were never filled. The result was a feature that appeared to work until
    // you changed mode.
    //
    // Rendering the full set costs almost nothing now that the expensive half of the
    // work is shared between views: a second and third view are around a tenth of a
    // second each on top of the first. Paying that once, so that the linework is
    // simply THERE wherever the user goes next, is the better trade.
    //
    // Grouped by lantern rather than assuming one. Two surfaces showing different
    // lanterns is not a state the application produces today, but keying the work
    // this way costs one Map and means it would do the right thing if it ever did.
    function VghLantern__ProjectedEdges__Pipeline__CollectJobs(includeCached) {
        const jobs      =  new Map();
        const lanterns  =  new Map();

        VghLantern__ProjectedEdges__Pipeline__LiveList().forEach(function(surface) {
            const state  =  surface[SURFACE_STATE_KEY];
            if (!state || !state.DidRender || !state.Skeleton || !state.Lantern) return;

            const stageKey  =  VghLantern__ProjectedEdges__Pipeline__StageKey(state.Lantern);
            if (stageKey === null || lanterns.has(stageKey)) return;

            lanterns.set(stageKey, {
                StageKey : stageKey,
                Skeleton : state.Skeleton,
                BarSet   : state.BarSet,
                Lantern  : state.Lantern
            });
        });

        // Nothing on screen. This is the Preview and Send screen, or a keystroke
        // from a mode that has no 2D viewport, and the last lantern seen is the
        // only honest answer available.
        if (lanterns.size === 0 && VghLantern__ProjectedEdges__Pipeline__LastSeen) {
            const remembered  =  VghLantern__ProjectedEdges__Pipeline__LastSeen;
            const stageKey    =  VghLantern__ProjectedEdges__Pipeline__StageKey(remembered.Lantern);

            if (stageKey !== null) {
                lanterns.set(stageKey, {
                    StageKey : stageKey,
                    Skeleton : remembered.Skeleton,
                    BarSet   : remembered.BarSet,
                    Lantern  : remembered.Lantern
                });
            }
        }

        const configured  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Meta').Views;
        const viewKeys    =  Array.isArray(configured) ? configured : [];

        lanterns.forEach(function(source, stageKey) {
            viewKeys.forEach(function(viewKey) {
                if (!VghLantern__ProjectedEdges__ConfigAccess__IsViewEnabled(viewKey)) return;
                if (!VghLantern__ProjectedEdges__Projector__IsViewSupported(viewKey)) return;

                const cacheKey  =  viewKey + '|' + stageKey;
                if (jobs.has(cacheKey)) return;
                if (!includeCached && VghLantern__ProjectedEdges__Pipeline__ResultCache.has(cacheKey)) return;

                jobs.set(cacheKey, {
                    CacheKey  : cacheKey,
                    ViewKey   : viewKey,
                    ViewLabel : VghLantern__ProjectedEdges__ConfigAccess__ViewLabel(viewKey),
                    StageKey  : source.StageKey,
                    Skeleton  : source.Skeleton,
                    BarSet    : source.BarSet,
                    Lantern   : source.Lantern
                });
            });
        });

        // ------------------------------------------------------
        // What the user is looking at goes first.
        //
        // Without this the order is whatever Meta.Views happens to list, and that
        // list currently ends with the plan - so editing a dimension while looking
        // at a plan meant waiting for the front and side elevations to finish
        // before the view on screen was touched. The work was never wasted, it was
        // simply being done in the least useful sequence.
        //
        // Sorted rather than filtered: the unseen views are still rendered, just
        // afterwards, so switching tabs a moment later still finds them ready.
        // ------------------------------------------------------
        const ranks   =  VghLantern__ProjectedEdges__Pipeline__ViewRanks();
        const ordered =  Array.from(jobs.values());

        ordered.sort(function(a, b) {
            const rankA  =  ranks.has(a.ViewKey) ? ranks.get(a.ViewKey) : 2;
            const rankB  =  ranks.has(b.ViewKey) ? ranks.get(b.ViewKey) : 2;
            return rankA - rankB;
        });

        return ordered;
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
        VghLantern__ProjectedEdges__Pipeline__IsShown    =  !VghLantern__ProjectedEdges__Pipeline__UserHidden;
        VghLantern__ProjectedEdges__Pipeline__Abort      =  new AbortController();

        const signal   =  VghLantern__ProjectedEdges__Pipeline__Abort.signal;
        const options  =  VghLantern__ProjectedEdges__Projector__BuildOptions();
        let   done     =  0;

        try {
            // ------------------------------------------------------
            // PASS ONE. Every view gets a provisional picture before any view
            // gets its linework. The order matters: a viewport showing the old
            // shape while a new one is computed is worse than one showing a
            // rough version of the new shape, and this pass costs around a
            // tenth of what the second one does.
            // ------------------------------------------------------
            await VghLantern__ProjectedEdges__Pipeline__PreviewPass(jobs, options, signal);

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
                await VghLantern__ProjectedEdges__Pipeline__RenderOne(job, options, signal, report);
                done++;

                VghLantern__ProjectedEdges__Pipeline__Refresh();               // <-- Each view lands as soon as it is ready
            }

            // Written once, after every view, rather than per view: the block holds
            // the whole set and rewriting it three times would schedule three
            // autosaves of a project that is about to change again anyway.
            jobs.forEach(function(job) {
                if (VghLantern__ProjectedEdges__Pipeline__StoredLanterns.has(job.StageKey)) return;
                VghLantern__ProjectedEdges__Pipeline__StoredLanterns.add(job.StageKey);
                VghLantern__ProjectedEdges__Pipeline__StoreOnLantern(job.Lantern);
            });
            VghLantern__ProjectedEdges__Pipeline__StoredLanterns.clear();
        } finally {
            VghLantern__ProjectedEdges__Pipeline__IsWorking  =  false;
            VghLantern__ProjectedEdges__Pipeline__Abort      =  null;

            // Belt and braces against a placeholder outliving its render. Refresh
            // above already replaces the previews of views that finished; this
            // catches the one that was interrupted, and every one of them if the
            // whole render was abandoned.
            VghLantern__ProjectedEdges__Pipeline__ClearPreviews();

            // Announced rather than called. The toolbar button needs to re-read its
            // state after every render, including the automatic ones nobody asked
            // for, but it already imports this module - so telling it directly would
            // make the two files import each other. An event costs nothing and keeps
            // the dependency pointing one way.
            window.dispatchEvent(new CustomEvent(VGHLANTERN__PROJECTED_EDGES__CHANGED_EVENT));
        }

        return { Rendered : done, Total : jobs.length };
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Drawing Up To Date Without Being Asked
    // ------------------------------------------------------------
    // The realtime loop. Called after every 2D render, which is to say after every
    // change to the lantern, and it decides whether anything needs doing.
    //
    // THE DEBOUNCE IS THE WHOLE DESIGN. Dragging a dimension emits a render per
    // frame, and starting a projection on each one would be a queue of work whose
    // every entry is obsolete before it finishes. So each change pushes the start
    // back, and a projection begins only once the lantern has been still for a
    // moment. A change arriving mid-render aborts it: the result would have been
    // for a shape that no longer exists.
    //
    // The cost of being wrong in the cautious direction is one wasted render. The
    // cost of being wrong the other way is linework that disagrees with the model,
    // which is the one failure this feature must never have.
    function VghLantern__ProjectedEdges__Pipeline__ScheduleAuto() {
        const render  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Render');
        if (render.Realtime === false) return;

        const delay  =  (typeof render.RealtimeDebounceMs === 'number') ? render.RealtimeDebounceMs : 160;

        if (VghLantern__ProjectedEdges__Pipeline__AutoTimer !== null) {
            window.clearTimeout(VghLantern__ProjectedEdges__Pipeline__AutoTimer);
        }

        // Whatever is in flight is now for the wrong shape. Stopping it frees the
        // workers immediately rather than at the end of a run nobody wants.
        if (VghLantern__ProjectedEdges__Pipeline__IsWorking) {
            VghLantern__ProjectedEdges__Pipeline__Cancel();
        }

        VghLantern__ProjectedEdges__Pipeline__AutoTimer  =  window.setTimeout(function() {
            VghLantern__ProjectedEdges__Pipeline__AutoTimer  =  null;

            void VghLantern__ProjectedEdges__Pipeline__RenderAll(null).catch(function(autoError) {
                if (autoError && autoError.name === 'AbortError') return;      // <-- Superseded by a newer change, which is normal
                console.error('[VghLantern ProjectedEdges] Automatic render failed:', autoError);
            });
        }, delay);
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
// REGION | Persistence
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Best Effort Description of Who Rendered This, and With What
    // ------------------------------------------------------------
    // Every lookup here is optional and guarded. This information is recorded for a
    // human reading the file in a year's time, so a missing signed-in user is worth
    // an 'unknown' in the meta block and is never worth failing a save over.
    function VghLantern__ProjectedEdges__Pipeline__RenderMeta(backend, fingerprint) {
        const meta  =  {
            Backend     : backend || 'unknown',
            Fingerprint : fingerprint || null,
            RenderedBy  : 'unknown',
            AppVersion  : 'unknown'
        };

        try {
            const session  =  window.VghLantern__UserLogin__SessionManager;
            const user     =  session && typeof session.VghLantern__UserLogin__GetCurrentUser === 'function'
                ? session.VghLantern__UserLogin__GetCurrentUser()
                : null;

            if (user) meta.RenderedBy  =  user.DisplayName || user.FullName || user.Name || user.UserName || 'unknown';
        } catch (userError) { /* not signed in, or no session manager */ }

        try {
            const loader  =  window.VghLantern__AppCore__ConfigLoader;
            const section =  loader && typeof loader.VghLantern__ConfigLoader__GetSection === 'function'
                ? loader.VghLantern__ConfigLoader__GetSection('Application')
                : null;

            if (section && section['VghLantern__Application__Config__AppVersion']) {
                meta.AppVersion  =  section['VghLantern__Application__Config__AppVersion'];
            }
        } catch (configError) { /* config not resolved yet */ }

        return meta;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Project Block for a Lantern's Rendered Linework
    // ------------------------------------------------------------
    // Returns null when there is nothing worth writing, which the caller should
    // treat as "leave whatever is already in the file alone" rather than as "erase
    // it". A session that opened a project and never pressed render must not strip
    // out linework somebody else rendered last week.
    export function VghLantern__ProjectedEdges__Pipeline__ExportForProject(lantern, limits) {
        const stageKey  =  VghLantern__ProjectedEdges__Pipeline__StageKey(lantern);
        if (stageKey === null) return null;

        const fingerprint  =  VghLantern__ProjectedEdges__LineworkStore__Fingerprint(stageKey);
        const entries      =  [];

        VghLantern__ProjectedEdges__Pipeline__ResultCache.forEach(function(segments, cacheKey) {
            const divider  =  cacheKey.indexOf('|');
            if (divider < 0) return;
            if (cacheKey.slice(divider + 1) !== stageKey) return;

            entries.push({ ViewKey : cacheKey.slice(0, divider), Segments : segments });
        });

        if (entries.length === 0) return null;

        const options  =  VghLantern__ProjectedEdges__Projector__BuildOptions();

        return VghLantern__ProjectedEdges__LineworkStore__Serialise(
            entries,
            VghLantern__ProjectedEdges__Pipeline__RenderMeta(options.Backend, fingerprint),
            limits
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Write Rendered Linework Onto Its Lantern and Ask for a Save
    // ------------------------------------------------------------
    // Called at the end of a render. The lantern object handed to this module during
    // a 2D render is the SAME object held in the loaded project, so writing the block
    // onto it puts it in the file; marking the state dirty is what schedules the
    // autosave that carries it to disk.
    //
    // Nothing here throws. Failing to store linework costs a re-render next session,
    // which is now a second or two, and is never worth interrupting a render that
    // has already succeeded and is already on screen.
    function VghLantern__ProjectedEdges__Pipeline__StoreOnLantern(lantern) {
        const persistence  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Persistence');
        if (persistence.Enabled === false || !lantern) return false;

        try {
            const block  =  VghLantern__ProjectedEdges__Pipeline__ExportForProject(lantern, {
                MaxSegmentsPerView : persistence.MaxSegmentsPerView,
                MaxKilobytes       : persistence.MaxKilobytes
            });
            if (!block) return false;

            lantern[VghLantern__ProjectedEdges__LineworkStore__BlockName()]  =  block;

            const state  =  window.VghLantern__AppCore__StateManager;
            if (state && typeof state.VghLantern__StateManager__MarkDirty === 'function') {
                state.VghLantern__StateManager__MarkDirty();
            }

            console.log('[VghLantern ProjectedEdges] Stored with the project: ' +
                        VghLantern__ProjectedEdges__LineworkStore__DescribeBlock(block));
            return true;
        } catch (storeError) {
            console.warn('[VghLantern ProjectedEdges] Could not store linework with the project:', storeError);
            return false;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Recover a Lantern's Stored Linework, Once
    // ------------------------------------------------------------
    // Runs on every 2D render, so it has to be cheap and it has to be idempotent.
    // The guard is the cache itself: if this lantern's views are already in hand,
    // whether from a render or from an earlier restore, there is nothing to do.
    function VghLantern__ProjectedEdges__Pipeline__RestoreStored(lantern) {
        const persistence  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Persistence');
        if (persistence.RestoreOnLoad === false) return;

        const block  =  lantern[VghLantern__ProjectedEdges__LineworkStore__BlockName()];
        if (!block) return;

        const stageKey  =  VghLantern__ProjectedEdges__Pipeline__StageKey(lantern);
        if (stageKey === null) return;

        // Already known, from this session or a previous restore.
        if (VghLantern__ProjectedEdges__Pipeline__ResultCache.has('plan|' + stageKey) ||
            VghLantern__ProjectedEdges__Pipeline__RestoredKeys.has(stageKey)) return;

        VghLantern__ProjectedEdges__Pipeline__RestoredKeys.add(stageKey);
        VghLantern__ProjectedEdges__Pipeline__ImportFromProject(block, lantern);
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore Linework Saved With a Project
    // ------------------------------------------------------------
    // Called when a project is opened. Anything recovered goes into the same cache a
    // fresh render would have filled, so from this point on the application cannot
    // tell the difference - the drawing simply has its linework, and the button
    // offers to hide it rather than to produce it.
    export function VghLantern__ProjectedEdges__Pipeline__ImportFromProject(block, lantern) {
        const stageKey  =  VghLantern__ProjectedEdges__Pipeline__StageKey(lantern);
        if (stageKey === null) return 0;

        const fingerprint  =  VghLantern__ProjectedEdges__LineworkStore__Fingerprint(stageKey);
        const recovered    =  VghLantern__ProjectedEdges__LineworkStore__Deserialise(block, fingerprint);
        if (recovered.length === 0) return 0;

        recovered.forEach(function(entry) {
            VghLantern__ProjectedEdges__Pipeline__ResultCache.set(entry.ViewKey + '|' + stageKey, entry.Segments);
        });

        const performanceCfg  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Performance');
        VghLantern__ProjectedEdges__Pipeline__Bound(
            VghLantern__ProjectedEdges__Pipeline__ResultCache,
            (typeof performanceCfg.MaxCachedResults === 'number') ? performanceCfg.MaxCachedResults : DEFAULT_MAX_RESULTS
        );

        VghLantern__ProjectedEdges__Pipeline__IsShown  =  true;
        VghLantern__ProjectedEdges__Pipeline__Refresh();

        console.log('[VghLantern ProjectedEdges] Restored stored linework: ' +
                    VghLantern__ProjectedEdges__LineworkStore__DescribeBlock(block));

        return recovered.length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Guarantee Every View Is Rendered Before Something Depends On It
    // ------------------------------------------------------------
    // The gate in front of anything that issues a drawing. If everything is already
    // in hand it returns immediately and costs nothing; otherwise it renders what is
    // missing and only then lets the caller continue.
    //
    // Deliberately resolves rather than rejects when there is nothing to render at
    // all - a project with no viewports open has no linework to be missing, and a
    // preview of it is not wrong, merely empty.
    export async function VghLantern__ProjectedEdges__Pipeline__EnsureRendered(onProgress) {
        await VghLantern__ProjectedEdges__ConfigAccess__Ready();
        if (!VghLantern__ProjectedEdges__ConfigAccess__IsEnabled()) return { Rendered : 0, Total : 0, WasNeeded : false };

        const outstanding  =  VghLantern__ProjectedEdges__Pipeline__CollectJobs(false);
        if (outstanding.length === 0) {
            VghLantern__ProjectedEdges__Pipeline__IsShown  =  true;
            VghLantern__ProjectedEdges__Pipeline__Refresh();
            return { Rendered : 0, Total : 0, WasNeeded : false };
        }

        const result  =  await VghLantern__ProjectedEdges__Pipeline__RenderAll(onProgress);
        result.WasNeeded  =  true;

        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility and Status
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Rendered Linework
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__Pipeline__Show() {
        VghLantern__ProjectedEdges__Pipeline__IsShown     =  true;
        VghLantern__ProjectedEdges__Pipeline__UserHidden  =  false;
        VghLantern__ProjectedEdges__Pipeline__Refresh();
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Rendered Linework, Keeping It Cached
    // ------------------------------------------------------------
    // UserHidden is remembered separately from IsShown because the two answer
    // different questions. IsShown is what the layer is doing right now; UserHidden
    // is whether a person asked for that. Automatic renders may switch the layer on,
    // but they must never overrule somebody who deliberately turned it off - having
    // linework reappear because a dimension was nudged would make the control feel
    // broken.
    export function VghLantern__ProjectedEdges__Pipeline__Hide() {
        VghLantern__ProjectedEdges__Pipeline__IsShown     =  false;
        VghLantern__ProjectedEdges__Pipeline__UserHidden  =  true;
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

            // Render the views on screen through TWO backends and report every
            // segment that moved. This is how a change to the kernel is accepted or
            // rejected: not by looking at the drawing and deciding it seems fine,
            // but by holding the new output against the old one and reading the
            // number. Defaults to the shipping backend against the untouched
            // vendored generator, which is the comparison that matters most.
            //
            // Neither result is cached. A diff must not leave the faster backend's
            // answer sitting in the cache as though the user had asked for it.
            Diff : async function(backendA, backendB, quantumMm) {
                await VghLantern__ProjectedEdges__ConfigAccess__Ready();

                const nameA  =  backendA || 'cpu';
                const nameB  =  backendB || 'legacy';
                const jobs   =  VghLantern__ProjectedEdges__Pipeline__CollectJobs(true);

                if (jobs.length === 0) {
                    console.warn('[VghLantern ProjectedEdges] Nothing on screen to compare. Render a drawing first.');
                    return [];
                }

                const controller  =  new AbortController();
                const reports     =  [];

                for (let i = 0; i < jobs.length; i++) {
                    const job  =  jobs[i];
                    const runs =  {};

                    for (const backend of [ nameA, nameB ]) {
                        const options  =  VghLantern__ProjectedEdges__Projector__BuildOptions();
                        options.Backend                 =  backend;
                        options.NeedsIntersectionEdges  =  (backend === 'cpu') && options.IncludeIntersectionEdges;

                        const report  =  { Backend : backend };
                        const slicer  =  VghLantern__ProjectedEdges__Scheduler__CreateSlicer(options.YieldEveryMs);
                        const entry   =  await VghLantern__ProjectedEdges__Pipeline__GetLantern(
                            job, options, report, slicer, null
                        );

                        const startedAt  =  performance.now();
                        const projection =  await VghLantern__ProjectedEdges__Projector__Project(
                            entry.Prepared, entry.Stage, job.ViewKey, options,
                            { AbortSignal : controller.signal, OnPhase : null }
                        );

                        runs[backend]  =  {
                            Segments : projection.Segments,
                            Ms       : Math.round(performance.now() - startedAt)
                        };
                    }

                    console.log('[VghLantern ProjectedEdges] ' + job.ViewKey +
                                ': ' + nameA + ' ' + runs[nameA].Ms + ' ms, ' +
                                nameB + ' ' + runs[nameB].Ms + ' ms');

                    const comparison  =  VghLantern__ProjectedEdges__DiffHarness__Compare(
                        nameA + ':' + job.ViewKey, runs[nameA].Segments,
                        nameB + ':' + job.ViewKey, runs[nameB].Segments,
                        { QuantumMm : quantumMm }
                    );

                    VghLantern__ProjectedEdges__DiffHarness__LogReport(comparison);
                    reports.push(comparison);
                }

                return reports;
            },

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
