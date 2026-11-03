/* =============================================================================
   PAINTERLYNPR - WASH | KUWAHARA FILTER
   =============================================================================

   FILE       : PainterlyNPR__Module__KuwaharaFilter__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - KuwaharaFilter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One anisotropic Kuwahara filter for every buffer that wants a
                painter's simplification - the wash layer before the ink is laid
                over it, the sky's cloud buffer before the wash reads it
   CREATED    : 30-Oct-2026

   DESCRIPTION:
   - Create(gl) once per context; Render(frame) whenever the source changes. Render
     takes any texture at any size and returns a texture of the same size and layout,
     simplified: half float where the context can render to it.
   - A frame is a source and a setting, nothing of the host's: the texture and its
     size in texels, how many texels a millimetre of the sheet is (PxPerMm), the
     setting (see the Settings part and Na__KuwaharaFilter__Config.json) and,
     optionally, a mask that says where Amount applies and what applies elsewhere.
   - Four steps on the GPU at the source's own size: the structure tensor (which way
     the colour runs), smoothed both ways; the anisotropic Kuwahara filter with
     polynomial sector weights (Kyprianidis, Kang and Doellner 2009; Kyprianidis
     2011), as many passes as the setting asks; then, unless the whole source is
     filtered at full strength, a blend back into the source by amount and mask.
   - Every channel moves together: the sectors are weighed by the variance of the
     channels VarianceWeights counts, and every channel is averaged with the same
     weights, so a data buffer (the clouds' transmittance, light, height and
     distance) keeps its channels in step.

   ---------------------------------------------------------------------------

   WHY A KUWAHARA AT ALL, IN A RENDERER THAT REFUSES FILTERS ON ITS OUTPUT

   The manifest will not have PainterlyNPR become a photograph with a filter on it,
   and nothing here changes that: the ink is drawn after, from the model, and never
   passes through this. Applied to the wash, the filter does what a painter's brush
   does that a per-pixel wash cannot - it settles each patch of colour into one
   stroke's worth, flat inside and following the form at its edge. Applied to a
   data buffer, it simplifies the truth a painting reads. Either way it is a step
   in the painting, switched up and down, never a look laid over a finished image.

   ============================================================================= */

import {
    PainterlyNPR__KuwaharaSettings__Resolve,
    PainterlyNPR__KuwaharaSettings__Defaults,
    PainterlyNPR__KuwaharaSettings__Range,
    PainterlyNPR__KuwaharaSettings__Config,
    PainterlyNPR__KuwaharaSettings__Key,
} from './PainterlyNPR__KuwaharaFilter__Settings__.mjs';
import {
    PainterlyNPR__KuwaharaShaders__Tensor,
    PainterlyNPR__KuwaharaShaders__Smooth,
    PainterlyNPR__KuwaharaShaders__Filter,
    PainterlyNPR__KuwaharaShaders__Blend,
} from './PainterlyNPR__KuwaharaFilter__Shaders__.mjs';
import {
    PainterlyNPR__KuwaharaGpu__Program,
    PainterlyNPR__KuwaharaGpu__Target,
    PainterlyNPR__KuwaharaGpu__Draw,
    PainterlyNPR__KuwaharaGpu__Settle,
    PainterlyNPR__KuwaharaGpu__Free,
    PainterlyNPR__KuwaharaGpu__FullscreenVertex,
} from './PainterlyNPR__KuwaharaFilter__Gpu__.mjs';

export {
    PainterlyNPR__KuwaharaSettings__Resolve,
    PainterlyNPR__KuwaharaSettings__Defaults,
    PainterlyNPR__KuwaharaSettings__Range,
    PainterlyNPR__KuwaharaSettings__Config,
    PainterlyNPR__KuwaharaSettings__Key,
};

// =============================================================================
// REGION | Kuwahara Filter
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Version, and the Smallest Radius Worth Filtering
    // ------------------------------------------------------------
    export const PainterlyNPR__KuwaharaFilter__Version  =  '1.0.0';
    const MIN_RADIUS_TEXELS  =  0.75;                                        // <-- Below this there is nothing to settle: the source comes back untouched
    const MIN_SIGMA_TEXELS   =  0.5;                                         // <-- The tensor's smoothing never goes below half a texel
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Create and Render
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Filter on a WebGL 2 Context
    // ------------------------------------------------------------
    // Compiles the four programs; targets are made at the first Render and remade
    // when the source's size changes (an export). The returned object is the
    // module's whole surface: Render, Last, Dispose.
    export function PainterlyNPR__KuwaharaFilter__Create(gl) {
        if (!gl || typeof gl.texImage3D !== 'function') throw new Error('The Kuwahara filter needs a WebGL 2 context.');
        const vertex  =  PainterlyNPR__KuwaharaGpu__FullscreenVertex;
        const tensor  =  PainterlyNPR__KuwaharaGpu__Program(gl, 'Kuwahara - tensor', vertex, PainterlyNPR__KuwaharaShaders__Tensor);
        const smooth  =  PainterlyNPR__KuwaharaGpu__Program(gl, 'Kuwahara - smooth', vertex, PainterlyNPR__KuwaharaShaders__Smooth);
        const filter  =  PainterlyNPR__KuwaharaGpu__Program(gl, 'Kuwahara - filter', vertex, PainterlyNPR__KuwaharaShaders__Filter);
        const blend   =  PainterlyNPR__KuwaharaGpu__Program(gl, 'Kuwahara - blend', vertex, PainterlyNPR__KuwaharaShaders__Blend);
        const vao     =  gl.createVertexArray();
        const state   =  { TensorA: null, TensorB: null, A: null, B: null, Out: null, Last: null, Disposed: false };

        const size  =  (w, h) => {
            if (state.Out && state.Out.Width === w && state.Out.Height === h) return;
            [state.TensorA, state.TensorB, state.A, state.B, state.Out].forEach(t => PainterlyNPR__KuwaharaGpu__Free(gl, t));
            state.TensorA  =  PainterlyNPR__KuwaharaGpu__Target(gl, w, h);
            state.TensorB  =  PainterlyNPR__KuwaharaGpu__Target(gl, w, h);
            state.A        =  PainterlyNPR__KuwaharaGpu__Target(gl, w, h);
            state.B        =  PainterlyNPR__KuwaharaGpu__Target(gl, w, h);
            state.Out      =  PainterlyNPR__KuwaharaGpu__Target(gl, w, h);
        };

        // FUNCTION | Filter One Source
        // ------------------------------------------------------------
        // frame: { Source (a texture), Width, Height (its texels), PxPerMm (its
        // texels per millimetre of sheet), Settings (overrides of the config's
        // Defaults), Mask (optional: { Texture, Channel 0-3, Threshold, Outside }) }.
        // With a mask, Amount applies where the mask's channel is above Threshold and
        // Outside applies elsewhere. Returns { Texture, Fbo, Width, Height, HalfFloat,
        // Filtered, Key }; with nothing to do, the Source itself, Filtered false.
        const render  =  (frame) => {
            if (state.Disposed) throw new Error('Kuwahara filter: Render after Dispose.');
            const p        =  PainterlyNPR__KuwaharaSettings__Resolve(frame.Settings);
            const w        =  frame.Width;
            const h        =  frame.Height;
            const mask     =  frame.Mask && frame.Mask.Texture ? frame.Mask : null;
            const inside   =  p.Amount;
            const outside  =  mask ? Math.min(1, Math.max(0, Number.isFinite(mask.Outside) ? mask.Outside : 0)) : p.Amount;
            const r        =  Math.min(p.MaxReachTexels / 2, p.RadiusMm * (frame.PxPerMm || 0));
            const key      =  PainterlyNPR__KuwaharaSettings__Key(p) + '|' + inside + '|' + outside + '|' + w + 'x' + h;
            if (!(r >= MIN_RADIUS_TEXELS) || (inside <= 0 && outside <= 0)) {
                state.Last  =  { Texture: frame.Source, Width: w, Height: h, Filtered: false, Key: key };
                return state.Last;
            }
            size(w, h);
            const sigma  =  Math.max(MIN_SIGMA_TEXELS, p.TensorSigmaMm * frame.PxPerMm);
            let source  =  frame.Source;
            let into    =  state.A;
            for (let pass = 0; pass < p.Passes; pass++) {
                PainterlyNPR__KuwaharaGpu__Draw(gl, tensor, state.TensorA.Fbo, w, h, { uSource: source, uWeights: p.VarianceWeights }, vao);
                PainterlyNPR__KuwaharaGpu__Draw(gl, smooth, state.TensorB.Fbo, w, h, { uSource: state.TensorA.Texture, uDirection: [1, 0], uSigma: sigma }, vao);
                PainterlyNPR__KuwaharaGpu__Draw(gl, smooth, state.TensorA.Fbo, w, h, { uSource: state.TensorB.Texture, uDirection: [0, 1], uSigma: sigma }, vao);
                PainterlyNPR__KuwaharaGpu__Draw(gl, filter, into.Fbo, w, h, {
                    uSource    :  source,
                    uTensor    :  state.TensorA.Texture,
                    uKuwahara  :  [r, p.Sharpness, p.Alpha, p.Overlap],
                    uShape     :  [p.Falloff, p.Hardness],
                    uWeights   :  p.VarianceWeights,
                    uMaxReach  :  p.MaxReachTexels,
                }, vao);
                source  =  into.Texture;
                into    =  into === state.A ? state.B : state.A;            // <-- Ping-pong: a pass never reads what it writes
            }
            let out  =  source === state.A.Texture ? state.A : state.B;
            if (!(inside >= 1 && outside >= 1)) {
                PainterlyNPR__KuwaharaGpu__Draw(gl, blend, state.Out.Fbo, w, h, {
                    uSource    :  frame.Source,
                    uFiltered  :  out.Texture,
                    uMask      :  mask ? mask.Texture : frame.Source,       // <-- Bound either way; read only with a mask
                    uBlend     :  [inside, outside, mask ? (mask.Channel || 0) : 0, mask && Number.isFinite(mask.Threshold) ? mask.Threshold : 0.5],
                    uHasMask   :  mask ? 1 : 0,
                }, vao);
                out  =  state.Out;
            }
            PainterlyNPR__KuwaharaGpu__Settle(gl);
            state.Last  =  { Texture: out.Texture, Fbo: out.Fbo, Width: w, Height: h, HalfFloat: out.HalfFloat, Filtered: true, Key: key };
            return state.Last;
        };
        // ------------------------------------------------------------

        return {
            Version  :  PainterlyNPR__KuwaharaFilter__Version,
            Render   :  render,
            get Last() { return state.Last; },
            Dispose  :  () => {
                if (state.Disposed) return;
                state.Disposed  =  true;
                [tensor, smooth, filter, blend, state.TensorA, state.TensorB, state.A, state.B, state.Out].forEach(t => PainterlyNPR__KuwaharaGpu__Free(gl, t));
                gl.deleteVertexArray(vao);
            },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
