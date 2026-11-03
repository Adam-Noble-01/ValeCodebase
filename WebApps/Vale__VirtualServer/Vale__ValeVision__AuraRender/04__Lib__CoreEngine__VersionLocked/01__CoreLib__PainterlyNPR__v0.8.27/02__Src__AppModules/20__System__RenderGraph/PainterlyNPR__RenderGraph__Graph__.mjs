/* =============================================================================
   PAINTERLYNPR - SYSTEM | RENDER GRAPH
   =============================================================================

   FILE       : PainterlyNPR__RenderGraph__Graph__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - RenderGraph
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The passes in order, their input versions and keys, and the two
                ways the graph runs: the navigation preview at once, refinement
                when the camera rests
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A pass runs only when its key changes: its inputs' versions and its
     dependencies' stamps.
   - Refinement is cancellable: a newer request takes a new token, and an older
     job stops at its next pass.
   - Two work modes (v0.6.0): Rendered (the default, and all a host that never
     sets one gets) refines when the camera rests; Proxy keeps the navigation
     preview - the model as it stands, no pen or wash - so a scene can be set up
     without the renderer kicking in, and reads the truth back when the camera
     rests so hover, points and drops still find what they are over.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Render Graph
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here. v0.6.0: the Proxy work
                   mode (Graph.Proxy, SetProxy), off unless the app's toggle sets it

   ============================================================================= */

import GraphConfig from './Na__RenderGraph__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Engine__REFINE_IDLE_MS as REFINE_IDLE_MS } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__PassRegistry__PASS_RUN     as  PASS_RUN,
    PainterlyNPR__PassRegistry__PASS_TARGET  as  PASS_TARGET,
} from './PainterlyNPR__RenderGraph__PassRegistry__.mjs';
import {
    PainterlyNPR__GpuResources__Sync,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Preview } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__LineCandidates__Lines as Lines } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__MaterialIndication__Indication as Indication } from '../36__Line__MaterialIndication/PainterlyNPR__MaterialIndication__Pass__.mjs';
import { PainterlyNPR__ArtDirection__PlaceObjectPoints } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
import { PainterlyNPR__Interface__UpdateOverlay } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointOverlay__.mjs';
import {
    PainterlyNPR__Interface__Fail,
    PainterlyNPR__Interface__Status,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__UpdateNode } from '../81__Hud__PassViewer/PainterlyNPR__Interface__GraphStrip__.mjs';
import {
    PainterlyNPR__PassViewer__Present,
    PainterlyNPR__PassViewer__PresentMilestone,
    PainterlyNPR__PassViewer__RefreshThumbnails,
} from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Views__.mjs';

// =============================================================================
// REGION | Render Graph
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__RenderGraph__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const GRAPH  =  PainterlyNPR__ConfigAccess__Section(GraphConfig, 'PainterlyNPR__RenderGraph__Config', 'Passes', ['Passes']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Graph
// -----------------------------------------------------------------------------

    // MODULE STATE | Input Versions and the Graph
    // ------------------------------------------------------------
    // Each control bumps the version of the inputs it changes; a pass's key is its
    // inputs' versions and its dependencies' stamps. Equal key, nothing to do.
    const Versions  =  { Scene: 1, Camera: 1, Sun: 1, Size: 1, Seed: 1, Discipline: 1, Lines: 1, Indication: 1, ShadowLines: 1, Wash: 1, Sky: 1, Paper: 1, Finish: 1, Composition: 1, ArtDirection: 1, Overlay: 1, Kuwahara: 1 };

    const Graph  =  {
        Token          :  0,
        Refining       :  false,
        Navigating     :  false,
        Progressive    :  true,
        IdleTimer      :  0,
        SoonTimer      :  0,
        PreviewQueued  :  false,
        LastRefineMs   :  0,
        Proxy          :  false,                                             // <-- The Proxy work mode: the preview only, never a refine (v0.6.0)
    };

    function PainterlyNPR__RenderGraph__Bump(...keys) {
        for (const key of keys) Versions[key]++;
    }
    // ------------------------------------------------------------


    // FUNCTION | Yield a Frame - so a milestone paints - but never wait on one forever
    // ------------------------------------------------------------
    // A hidden tab gets no animation frames at all, and a refinement that waited
    // for one would sit half-done until the tab was shown. The timer wins there.
    function PainterlyNPR__RenderGraph__NextFrame() {
        return new Promise(resolve => {
            let done  =  false;
            const go  =  () => { if (!done) { done = true; resolve(); } };
            requestAnimationFrame(go);
            setTimeout(go, 60);
        });
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Passes, in Order
    // ------------------------------------------------------------
    // Home is the module folder each pass grows into (02__Src__AppModules).
    // Milestone passes hand the sheet a picture before they start, so a camera
    // move refines visibly: preview, then ink on paper, then the washes.
    const PASSES  =  GRAPH.Passes;
    const PASS_BY_ID  =  Object.fromEntries(PASSES.map(p => [p.Id, p]));
    for (const pass of PASSES) Object.assign(pass, { Key: '', Stamp: 0, LastMs: 0, Status: 'Waiting', Node: null });
    // ------------------------------------------------------------


    // FUNCTION | A Pass's Key
    // ------------------------------------------------------------
    function PainterlyNPR__RenderGraph__KeyOf(pass) {
        return pass.Inputs.map(k => k + ':' + Versions[k]).join('|') + '#' + pass.Deps.map(id => id + ':' + PASS_BY_ID[id].Stamp).join('|');
    }
    // ------------------------------------------------------------


    // FUNCTION | Run One Pass Now If Its Key Changed (the navigation preview's path)
    // ------------------------------------------------------------
    function PainterlyNPR__RenderGraph__RunIfDirty(id) {
        const pass  =  PASS_BY_ID[id];
        const key   =  PainterlyNPR__RenderGraph__KeyOf(pass);
        if (pass.Stamp > 0 && key === pass.Key) return false;
        const start  =  performance.now();
        PASS_RUN[id]();
        pass.LastMs  =  performance.now() - start;
        pass.Key     =  key;
        pass.Stamp++;
        pass.Status  =  'Ran';
        PainterlyNPR__Interface__UpdateNode(pass);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Request a Render
    // ------------------------------------------------------------
    // 'Navigate': the camera is moving - show the preview this frame and refine
    // once it has been still. Anything else: refine shortly (style, paper, points).
    // In the Proxy work mode both show the preview; Refine itself then only
    // reads the truth back.
    function PainterlyNPR__RenderGraph__Request(kind) {
        if (kind === 'Navigate' || Graph.Proxy) {
            Graph.Navigating   =  true;
            Graph.Progressive  =  true;
            Graph.Token++;
            if (!Graph.PreviewQueued) {
                Graph.PreviewQueued  =  true;
                PainterlyNPR__RenderGraph__NextFrame().then(() => { Graph.PreviewQueued = false; PainterlyNPR__RenderGraph__Preview(); });
            }
            clearTimeout(Graph.IdleTimer);
            Graph.IdleTimer  =  setTimeout(() => { Graph.Navigating = false; PainterlyNPR__RenderGraph__Refine(); }, REFINE_IDLE_MS);
            return;
        }
        if (Graph.Navigating) return;
        clearTimeout(Graph.SoonTimer);
        Graph.SoonTimer  =  setTimeout(() => PainterlyNPR__RenderGraph__Refine(), 25);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Work Mode - Proxy (the preview only) or Rendered (the drawing)
    // ------------------------------------------------------------
    // Into Proxy: any refinement stops where it is and the preview shows at once.
    // Back to Rendered: the drawing refines from wherever its passes were left,
    // milestone by milestone - only the passes whose inputs moved run.
    function PainterlyNPR__RenderGraph__SetProxy(on) {
        Graph.Proxy  =  !!on;
        clearTimeout(Graph.SoonTimer);
        if (Graph.Proxy) { PainterlyNPR__RenderGraph__Request('Navigate'); return; }
        clearTimeout(Graph.IdleTimer);
        Graph.Navigating   =  false;
        Graph.Progressive  =  true;
        PainterlyNPR__RenderGraph__Refine();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Navigation Preview
    // ------------------------------------------------------------
    function PainterlyNPR__RenderGraph__Preview() {
        try {
            PainterlyNPR__RenderGraph__RunIfDirty('ShadowMap');
            PainterlyNPR__RenderGraph__RunIfDirty('GeometryBuffers');
            PainterlyNPR__GeometryBuffers__Preview();
            PainterlyNPR__ArtDirection__PlaceObjectPoints();
            PainterlyNPR__Interface__UpdateOverlay();
            PainterlyNPR__Interface__Status(Graph.Proxy ? 'Proxy mode - the model as it stands, no pen or wash; switch to Rendered to draw it' : 'Navigation preview - albedo and screen-space edges at once; the drawing refines when the camera is still');
        } catch (error) {
            PainterlyNPR__Interface__Fail(error);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Refine - run every dirty pass, in order, cancellable
    // ------------------------------------------------------------
    // In the Proxy work mode the preview stays: only the truth is read back, so
    // hover, points and drops still know what the pointer is over.
    async function PainterlyNPR__RenderGraph__Refine() {
        if (Graph.Proxy) {
            try {
                PainterlyNPR__RenderGraph__RunIfDirty('ShadowMap');
                PainterlyNPR__RenderGraph__RunIfDirty('GeometryBuffers');
                PainterlyNPR__RenderGraph__RunIfDirty('TruthReadback');
                PainterlyNPR__GeometryBuffers__Preview();
                PainterlyNPR__Interface__UpdateOverlay();
            } catch (error) {
                PainterlyNPR__Interface__Fail(error);
            }
            return;
        }
        const token  =  ++Graph.Token;
        Graph.Refining  =  true;
        const started   =  performance.now();
        const progressive  =  Graph.Progressive;
        Graph.Progressive  =  false;
        let ran  =  0;
        for (const pass of PASSES) pass.Status = 'Pending';
        try {
            for (const pass of PASSES) {
                if (token !== Graph.Token) return;
                const key  =  PainterlyNPR__RenderGraph__KeyOf(pass);
                if (pass.Stamp > 0 && key === pass.Key) {
                    pass.Status  =  'Cached';
                    PainterlyNPR__Interface__UpdateNode(pass);
                    continue;
                }
                pass.Status  =  'Running';
                PainterlyNPR__Interface__UpdateNode(pass);
                if (pass.Milestone && progressive) {
                    PainterlyNPR__PassViewer__PresentMilestone(pass.Milestone);
                    PainterlyNPR__Interface__Status(`Refining - ${pass.Label.toLowerCase()} (${PASSES.indexOf(pass) + 1} of ${PASSES.length})`);
                    await PainterlyNPR__RenderGraph__NextFrame();
                    if (token !== Graph.Token) return;
                }
                const start  =  performance.now();
                PASS_RUN[pass.Id]();
                PainterlyNPR__GpuResources__Sync(PASS_TARGET[pass.Id] ? PASS_TARGET[pass.Id]() : null);
                pass.LastMs  =  performance.now() - start;
                pass.Key     =  key;
                pass.Stamp++;
                pass.Status  =  'Ran';
                ran++;
                PainterlyNPR__Interface__UpdateNode(pass);
            }
        } catch (error) {
            PainterlyNPR__Interface__Fail(error);
            return;
        } finally {
            if (token === Graph.Token) Graph.Refining = false;
        }
        Graph.LastRefineMs  =  performance.now() - started;
        PainterlyNPR__PassViewer__Present();
        PainterlyNPR__Interface__UpdateOverlay();
        if (ran) PainterlyNPR__PassViewer__RefreshThumbnails();
        const stats  =  Lines.Stats;
        PainterlyNPR__Interface__Status(`Refined - ${ran} of ${PASSES.length} passes ran, ${PASSES.length - ran} cached - ${Graph.LastRefineMs.toFixed(0)} ms - ${Gpu.Width} x ${Gpu.Height} px at ${Gpu.PxPerMm} px/mm - ${stats.Edges} edges tested, ${stats.Runs} visible runs, ${stats.Strokes} strokes, ${Indication.Stats.Marks} indication marks, ${Indication.Stats.Picks} picked units`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Run the Whole Graph Synchronously (an export)
    // ------------------------------------------------------------
    function PainterlyNPR__RenderGraph__RunAll() {
        for (const pass of PASSES) {
            const key  =  PainterlyNPR__RenderGraph__KeyOf(pass);
            if (pass.Stamp > 0 && key === pass.Key) continue;
            PASS_RUN[pass.Id]();
            pass.Key  =  key;
            pass.Stamp++;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__RenderGraph__Bump,
        PainterlyNPR__RenderGraph__NextFrame,
        PainterlyNPR__RenderGraph__Refine,
        PainterlyNPR__RenderGraph__Request,
        PainterlyNPR__RenderGraph__RunAll,
        PainterlyNPR__RenderGraph__SetProxy,
        Graph       as  PainterlyNPR__RenderGraph__Graph,
        PASSES      as  PainterlyNPR__RenderGraph__PASSES,
        PASS_BY_ID  as  PainterlyNPR__RenderGraph__PASS_BY_ID,
        Versions    as  PainterlyNPR__RenderGraph__Versions,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
