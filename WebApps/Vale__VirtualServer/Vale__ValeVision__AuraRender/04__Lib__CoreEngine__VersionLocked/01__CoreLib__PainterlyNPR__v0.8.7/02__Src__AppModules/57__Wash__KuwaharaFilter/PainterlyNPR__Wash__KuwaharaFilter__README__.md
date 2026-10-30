# 57__Wash__KuwaharaFilter

**50-57 · Wash and paper** · real code, v1.0.0 (30-Oct-2026)

One anisotropic Kuwahara filter, for every buffer that wants a painter's simplification. It settles each patch of colour into one stroke's worth: flat inside, following the form at its edge.

Two hosts use it:
- **The wash layer** in Experiment 01, before the ink is laid over it. Since v0.4.8 it is only the main watercolour, the washes' base: the flowers, picked units and marker shadow lines are laid back over it afterwards, as a painter adds them to a dry wash. The ink never passes through it.
- **The sky's cloud buffer**, before the wash reads it. That use belongs to the cloud-rendering session, and comes in its own port.

Adam, 30-Oct-2026: "Create a module specifically for the Kuwahara filter because it might be used multiple times in multiple places, so it deserves its own module and to be called where needed."

## Why a Kuwahara, in a renderer that refuses filters on its output

The manifest will not have PainterlyNPR become a photograph with a filter on it, and nothing here changes that. Each use is a step in the painting, switched up and down, never a look laid over a finished image:
- **On the wash**, it does what a brush does that a per-pixel wash cannot. The ink is still drawn afterwards, from the model.
- **On a data buffer**, it simplifies the truth a painting reads, as a painter squints at a sky and settles on a few shapes (§09: soft morphology).

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__Module__KuwaharaFilter__.mjs` | ~190 | The entry: `Create`, `Render`, and the settings re-exported |
| `PainterlyNPR__KuwaharaFilter__Settings__.mjs` | ~120 | Defaults, ranges, `Resolve` (every number clamped, alpha derived), cache `Key` |
| `PainterlyNPR__KuwaharaFilter__Shaders__.mjs` | ~200 | The structure tensor, its smoothing, the filter, the blend |
| `PainterlyNPR__KuwaharaFilter__Gpu__.mjs` | ~190 | Programs, typed uniforms, half-float targets, a fullscreen draw |
| `Na__KuwaharaFilter__Config.json` | | The defaults and every range |

No file passes 600 lines. These are ES modules, so they load only when the page is served (`Start__PainterlyNPR__Localhost__8020__.bat` at the repo root); `file://` blocks them. The module depends on no other module: its GPU tools are its own.

## Using it

```js
import * as Kuwahara from '…/57__Wash__KuwaharaFilter/PainterlyNPR__Module__KuwaharaFilter__.mjs';

const filter  =  Kuwahara.PainterlyNPR__KuwaharaFilter__Create(gl);                 // WebGL 2; compiles four programs
const out     =  filter.Render({
    Source   :  texture, Width, Height,                                              // any texture, any size
    PxPerMm  :  5,                                                                   // texels per millimetre of the sheet
    Settings :  { Amount: 0.8, RadiusMm: 1.2, Sharpness: 8, Anisotropy: 1 },         // anything left out is the config's default
    Mask     :  { Texture: data, Channel: 1, Threshold: 0.5, Outside: 0 },           // optional: where Amount applies
});
// out.Texture - the same size; RGBA16F where the context can render to it; out.Filtered false = the Source itself
```

- **A frame** is a source and a setting, nothing of the host's. Sizes are millimetres on the sheet, turned into texels by `PxPerMm`. So a 2x export, or a half-resolution buffer such as the clouds' (750 x 500 at 2.5 px/mm), simplifies the same shapes.
- **The mask** reads one channel of any texture, scaled to the source's size. `Amount` applies where that channel is above `Threshold`, and `Outside` applies elsewhere. The experiment passes its geometry buffer's object id with `Outside` set to the sky's amount, so the filter can leave the sky's own paint alone.
- **Every channel moves together.** The sectors are weighed by the variance of the channels `VarianceWeights` counts: colour is `[1, 1, 1, 0]`; a data buffer chooses its own. Every channel, the fourth included, is averaged with the same weights.
- **The context is left as a host expects it:** no framebuffer, program or vertex array bound; blending, depth and culling off. The filter is deterministic, with no noise and no seed.

## How it filters

1. **The structure tensor**: a Sobel gradient of the weighted channels, as one multichannel tensor (E, G, F). It is smoothed by a separable Gaussian of `TensorSigmaMm`.
2. **The ellipse**: the tensor's eigenvalues give the colour's direction and how much one direction dominates (A). Round each texel lies an ellipse along that direction, `a = r (alpha + A) / alpha` and `b = r alpha / (alpha + A)`, with `alpha = 1 / Anisotropy`. So Anisotropy 0 is a circle, 1 the published default, and 4 long thin strokes.
3. **Eight sectors with polynomial weights** (Kyprianidis 2011, no weight texture), times a Gaussian over the unit ellipse (`Falloff`). `Overlap` is the sectors' shared centre (zeta).
4. **The calmest sectors win**: each sector's weight is `1 / (1 + (Hardness x variance)^(Sharpness / 2))`.
5. **Passes** repeat steps 1-4 on the result. Then, unless the whole source is filtered at full strength, it is blended back into the source by `Amount` and the mask.

First written for the cloud buffer by the cloud-rendering session (30-Oct-2026). This is its shared form: channel weights, an amount and mask, passes, and millimetres throughout.

## Settings

| Key | Default | Range | What it does |
|---|---|---|---|
| `Amount` | 1 | 0-1 | How much of the filtered result replaces the source (inside the mask) |
| `RadiusMm` | 1.2 | 0-8 | The patch the filter settles on, on the sheet |
| `Sharpness` | 8 | 1-18 | How decisively the calmest sector wins: low blurs, high cuts clean |
| `Hardness` | 255 | 10-4000 | How small a variance already counts as calm |
| `Anisotropy` | 1 | 0-4 | How far a patch stretches along the run of the colour |
| `Overlap` | 0.33 | 0.05-1 | The sectors' shared centre |
| `Falloff` | 3.125 | 0.5-8 | The Gaussian over the ellipse |
| `TensorSigmaMm` | 0.4 | 0.05-3 | How far the colour's run is smoothed before the filter follows it |
| `Passes` | 1 | 1-4 | Filter the result again |
| `VarianceWeights` | [1, 1, 1, 0] | each >= 0 | Which channels count toward edges and variance |
| `MaxReachTexels` | 32 | 4-48 | The furthest a sample may be taken: the cost's ceiling |

## Cost

Each pass is about (2a + 1) x (2b + 1) samples a texel. At the sheet's 1500 x 1000 and 1.2 mm (6 texels) that is a few tens of milliseconds, run only when the source changes. A 2x export has four times the texels and twice the radius in texels, bounded by `MaxReachTexels`.

## Prototyped in

`80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup` (the Kuwahara pass, Wash -> Kuwahara). The page test is `60__Dev__WebBuildUtils/PainterlyNPR__Test__KuwaharaFilter__.html`.

## Since v0.5.0 - the app

Ported from Experiment 01 (engine 0.4.10) beside the module, so the render graph calls it as the experiment did:

- `PainterlyNPR__Kuwahara__Host__.mjs` - The Kuwahara filter called on the wash: the module made once on the context, the pass that filters the washes' base, and what the compositor reads
