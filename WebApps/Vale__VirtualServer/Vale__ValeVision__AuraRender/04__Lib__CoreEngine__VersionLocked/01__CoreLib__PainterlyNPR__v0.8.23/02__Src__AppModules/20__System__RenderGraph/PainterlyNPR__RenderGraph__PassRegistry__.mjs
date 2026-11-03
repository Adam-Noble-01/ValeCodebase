/* =============================================================================
   PAINTERLYNPR - SYSTEM | RENDER GRAPH - PASS REGISTRY
   =============================================================================

   FILE       : PainterlyNPR__RenderGraph__PassRegistry__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - RenderGraph - PassRegistry
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What each pass runs, and what to wait on for its time
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A table of functions, read when a pass runs: every pass module stays ignorant
     of the graph.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Pass Registry - what each pass runs, and
                   what to wait on for its time
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__Readback,
    PainterlyNPR__GeometryBuffers__Run,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__LightAndShadow__Run } from '../23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
import {
    PainterlyNPR__BoundaryDistance__Run,
    PainterlyNPR__BoundaryDistance__DistanceTarget  as  DistanceTarget,
} from '../24__Pass__DerivedFields/PainterlyNPR__BoundaryDistance__Pass__.mjs';
import { PainterlyNPR__LineCandidates__Run } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__StrokeSynthesis__Run } from '../33__Stroke__Synthesis/PainterlyNPR__StrokeSynthesis__Pen__.mjs';
import { PainterlyNPR__InkLayer__Run } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__Pass__.mjs';
import { PainterlyNPR__MaterialIndication__Run } from '../36__Line__MaterialIndication/PainterlyNPR__MaterialIndication__Pass__.mjs';
import { PainterlyNPR__WashRegions__Run } from '../51__Wash__RegionMasks/PainterlyNPR__WashRegions__Pass__.mjs';
import { PainterlyNPR__AccentLayer__Run } from '../52__Wash__LayerStack/PainterlyNPR__AccentLayer__Pass__.mjs';
import { PainterlyNPR__ShadowLines__Run } from '../52__Wash__LayerStack/PainterlyNPR__ShadowLines__Pass__.mjs';
import { PainterlyNPR__Watercolour__Run } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
import { PainterlyNPR__Paper__Run } from '../55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
import { PainterlyNPR__Compositor__Run } from '../56__Paper__Compositor/PainterlyNPR__Compositor__Pass__.mjs';
import {
    PainterlyNPR__Kuwahara__Run,
    PainterlyNPR__Kuwahara__SyncTarget,
} from '../57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';
import {
    PainterlyNPR__SkyClouds__Run,
    PainterlyNPR__SkyClouds__Simplify,
} from '../60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
import { PainterlyNPR__ArtDirection__Run } from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';

// =============================================================================
// REGION | Render Graph - Pass Registry
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Pass Registry - what each pass runs, and what to wait on for its time
// -----------------------------------------------------------------------------

    const PASS_RUN  =  {
        ShadowMap        :  PainterlyNPR__LightAndShadow__Run,
        GeometryBuffers  :  PainterlyNPR__GeometryBuffers__Run,
        TruthReadback    :  PainterlyNPR__GeometryBuffers__Readback,
        ArtDirection     :  PainterlyNPR__ArtDirection__Run,
        LineCandidates   :  PainterlyNPR__LineCandidates__Run,
        MaterialIndication :  PainterlyNPR__MaterialIndication__Run,
        StrokeSynthesis  :  PainterlyNPR__StrokeSynthesis__Run,
        InkLayer         :  PainterlyNPR__InkLayer__Run,
        AccentLayer      :  PainterlyNPR__AccentLayer__Run,
        ShadowLines      :  PainterlyNPR__ShadowLines__Run,
        WashRegions      :  PainterlyNPR__WashRegions__Run,
        BoundaryDistance :  PainterlyNPR__BoundaryDistance__Run,
        Paper            :  PainterlyNPR__Paper__Run,
        Clouds           :  PainterlyNPR__SkyClouds__Run,
        CloudMasses      :  PainterlyNPR__SkyClouds__Simplify,
        Watercolour      :  PainterlyNPR__Watercolour__Run,
        Kuwahara         :  PainterlyNPR__Kuwahara__Run,
        Composite        :  PainterlyNPR__Compositor__Run,
    };


    const PASS_TARGET  =  {
        GeometryBuffers  :  () => Gpu.Targets.GBuffer,
        InkLayer         :  () => Gpu.Targets.Ink,
        AccentLayer      :  () => Gpu.Targets.Accent,
        ShadowLines      :  () => Gpu.Targets.Marker,
        WashRegions      :  () => Gpu.Targets.Regions,
        BoundaryDistance :  () => DistanceTarget,
        Paper            :  () => Gpu.Targets.Paper,
        Watercolour      :  () => Gpu.Targets.Wash,
        Kuwahara         :  PainterlyNPR__Kuwahara__SyncTarget,
        Composite        :  () => Gpu.Targets.Composite,
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PASS_RUN     as  PainterlyNPR__PassRegistry__PASS_RUN,
        PASS_TARGET  as  PainterlyNPR__PassRegistry__PASS_TARGET,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
