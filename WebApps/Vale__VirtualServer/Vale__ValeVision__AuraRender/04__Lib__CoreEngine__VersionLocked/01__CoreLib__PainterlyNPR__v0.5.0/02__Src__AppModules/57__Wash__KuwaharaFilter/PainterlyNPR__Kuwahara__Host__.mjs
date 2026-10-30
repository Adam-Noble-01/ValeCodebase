/* =============================================================================
   PAINTERLYNPR - WASH | KUWAHARA FILTER - HOST
   =============================================================================

   FILE       : PainterlyNPR__Kuwahara__Host__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - KuwaharaFilter - Host
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The Kuwahara filter called on the wash: the module made once on
                the context, the pass that filters the washes' base, and what the
                compositor reads
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The module itself is PainterlyNPR__Module__KuwaharaFilter__.mjs beside this;
     this file is how the render graph uses it.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Kuwahara Filter - 57, called on the wash
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the Kuwahara module is imported, where the experiment found it
                   on window.PainterlyNPR__Modules; otherwise none

   ============================================================================= */

import * as KuwaharaFilter from './PainterlyNPR__Module__KuwaharaFilter__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Kuwahara Filter - Host
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Kuwahara Filter - 57, called on the wash
// -----------------------------------------------------------------------------

    // MODULE STATE | The Filter and Its Last Result
    // ------------------------------------------------------------
    // 57__Wash__KuwaharaFilter is imported below. If it cannot be made, the pass
    // does nothing, and the compositor reads the wash as it was.
    const Kuwahara  =  { Module: null, Instance: null, Result: null, Failure: null };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Module This Host Calls - imported, where the experiment found it on window
    // ------------------------------------------------------------
    const KUWAHARA_MODULES  =  Object.freeze({ KuwaharaFilter });
    // ------------------------------------------------------------


    // FUNCTION | Connect the Module at Boot - true when the filter is ready
    // ------------------------------------------------------------
    function PainterlyNPR__Kuwahara__Connect(gl) {
        const m  =  KUWAHARA_MODULES;
        if (!m || !m.KuwaharaFilter) return false;
        try {
            Kuwahara.Instance  =  m.KuwaharaFilter.PainterlyNPR__KuwaharaFilter__Create(gl);
            Kuwahara.Module    =  m.KuwaharaFilter;
            return true;
        } catch (error) {
            Kuwahara.Failure  =  error;
            console.error(error);
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Filter the Wash
    // ------------------------------------------------------------
    // The wash target at the sheet's own size (a 2x export's too: the radius is
    // millimetres, turned into texels here). The geometry buffer's object id is
    // the mask - the sky has none - so the sky takes its own amount.
    function PainterlyNPR__Kuwahara__Run() {
        Kuwahara.Result  =  null;
        const k  =  State.Kuwahara;
        if (!Kuwahara.Instance || !(k.Amount > 0 || k.Sky > 0)) return;
        const T  =  Gpu.Targets;
        Kuwahara.Result  =  Kuwahara.Instance.Render({
            Source   :  T.Wash.Textures[1],                                   // <-- The base: the main watercolour, without the embellishments laid over it
            Width    :  T.Wash.Width,
            Height   :  T.Wash.Height,
            PxPerMm  :  Gpu.PxPerMm,
            Settings :  { Amount: k.Amount, RadiusMm: k.RadiusMm, Sharpness: k.Sharpness, Hardness: k.Hardness, Anisotropy: k.Anisotropy, TensorSigmaMm: k.FlowMm, Overlap: k.Overlap, Passes: k.Passes, VarianceWeights: [1, 1, 1, 0] },
            Mask     :  { Texture: T.GBuffer.Textures[2], Channel: 1, Threshold: 0.5, Outside: k.Sky },   // <-- Data's y is the object id: none, the sky
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Washes the Compositor Reads - filtered when the filter ran
    // ------------------------------------------------------------
    function PainterlyNPR__Kuwahara__WashTexture() {
        const r  =  Kuwahara.Result;
        return r && r.Filtered ? r.Texture : Gpu.Targets.Wash.Textures[1];
    }
    // ------------------------------------------------------------


    // FUNCTION | What to Wait On for the Pass's Time - the module's own target
    // ------------------------------------------------------------
    function PainterlyNPR__Kuwahara__SyncTarget() {
        const r  =  Kuwahara.Result;
        return r && r.Filtered ? { Fbo: r.Fbo, Formats: [r.HalfFloat ? 'RGBA16F' : 'RGBA8'] } : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Kuwahara__Connect,
        PainterlyNPR__Kuwahara__Run,
        PainterlyNPR__Kuwahara__SyncTarget,
        PainterlyNPR__Kuwahara__WashTexture,
        Kuwahara  as  PainterlyNPR__Kuwahara__Kuwahara,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
