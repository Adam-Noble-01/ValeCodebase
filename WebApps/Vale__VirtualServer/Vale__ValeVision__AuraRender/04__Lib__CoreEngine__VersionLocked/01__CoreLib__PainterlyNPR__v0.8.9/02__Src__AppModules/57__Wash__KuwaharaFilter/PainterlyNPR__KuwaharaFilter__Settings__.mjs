/* =============================================================================
   PAINTERLYNPR - WASH | KUWAHARA FILTER - SETTINGS
   =============================================================================

   FILE       : PainterlyNPR__KuwaharaFilter__Settings__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - KuwaharaFilter - Settings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a filter setting means: the defaults, the range each number may
                take, and one resolved, clamped parameter set for the renderer
   CREATED    : 30-Oct-2026

   DESCRIPTION:
   - Pure: no WebGL, no DOM. Reads Na__KuwaharaFilter__Config.json, nothing else.
   - A setting may override any default. Resolve returns every number the renderer
     needs, each inside its range, so a saved drawing with a stray value still
     draws - and draws the same.
   - Sizes are millimetres on the sheet, never texels: the host says how many
     texels a millimetre is (PxPerMm), so a 2x export, or a half-resolution buffer,
     simplifies the same shapes.

   ---------------------------------------------------------------------------

   WHAT THE NUMBERS DO

   Radius is how big a patch of colour the filter settles on. Sharpness (the q of
   Kyprianidis's weighting) is how decisively the calmest sector wins: low blurs,
   high cuts clean. Hardness is how small a variance already counts as calm.
   Anisotropy is how far each patch stretches along the run of the colour - 0 round,
   1 the published default, 4 long thin strokes. Overlap is how much the eight
   sectors share near the centre. Falloff is the Gaussian over the ellipse. The
   tensor's sigma is how far the run of the colour is smoothed before the filter
   follows it. VarianceWeights says which channels count: a picture's colour, or a
   buffer's first three channels and not its fourth.

   ============================================================================= */

import Config from './Na__KuwaharaFilter__Config.json' with { type: 'json' };

// =============================================================================
// REGION | Kuwahara Filter - Settings
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Numbers a Setting Carries
    // ------------------------------------------------------------
    const NUMERIC_KEYS  =  ['Amount', 'RadiusMm', 'Sharpness', 'Hardness', 'Anisotropy', 'Overlap', 'Falloff', 'TensorSigmaMm', 'Passes', 'MaxReachTexels'];
    const ROUND_BELOW   =  1e-3;                                             // <-- Below this anisotropy the ellipse is a circle (alpha would be infinite)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading the Config
// -----------------------------------------------------------------------------

    // FUNCTION | The Whole Config, Read Only
    // ------------------------------------------------------------
    export function PainterlyNPR__KuwaharaSettings__Config() {
        return Config;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Defaults - a copy, for a host to start a setting from
    // ------------------------------------------------------------
    export function PainterlyNPR__KuwaharaSettings__Defaults() {
        return Object.assign({}, Config.Defaults, { VarianceWeights: Config.Defaults.VarianceWeights.slice() });
    }
    // ------------------------------------------------------------


    // FUNCTION | One Number's Range - { Min, Max, Step }, for a host's slider
    // ------------------------------------------------------------
    export function PainterlyNPR__KuwaharaSettings__Range(key) {
        return Config.Ranges[key] ? Object.assign({}, Config.Ranges[key]) : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resolving a Setting
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve a Setting - the defaults, overridden by finite numbers, clamped
    // ------------------------------------------------------------
    // Returns the setting's numbers plus Alpha, the published anisotropy parameter
    // (1 / Anisotropy; huge for a round filter), and Passes as a whole number.
    export function PainterlyNPR__KuwaharaSettings__Resolve(setting) {
        const s    =  setting || {};
        const out  =  PainterlyNPR__KuwaharaSettings__Defaults();
        for (const key of NUMERIC_KEYS) {
            if (!Number.isFinite(s[key])) continue;
            const range  =  Config.Ranges[key];
            out[key]  =  range ? Math.min(range.Max, Math.max(range.Min, s[key])) : s[key];
        }
        if (Array.isArray(s.VarianceWeights) && s.VarianceWeights.length === 4 && s.VarianceWeights.every(v => Number.isFinite(v) && v >= 0) && s.VarianceWeights.some(v => v > 0)) {
            out.VarianceWeights  =  s.VarianceWeights.slice();
        }
        out.Passes          =  Math.round(out.Passes);
        out.MaxReachTexels  =  Math.round(out.MaxReachTexels);
        out.Alpha           =  out.Anisotropy > ROUND_BELOW ? 1 / out.Anisotropy : 1e3;
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Resolved Setting's Key - equal keys draw the same filter
    // ------------------------------------------------------------
    export function PainterlyNPR__KuwaharaSettings__Key(resolved) {
        return [...NUMERIC_KEYS.map(k => resolved[k]), ...resolved.VarianceWeights].map(v => +(+v).toFixed(5)).join('|');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
