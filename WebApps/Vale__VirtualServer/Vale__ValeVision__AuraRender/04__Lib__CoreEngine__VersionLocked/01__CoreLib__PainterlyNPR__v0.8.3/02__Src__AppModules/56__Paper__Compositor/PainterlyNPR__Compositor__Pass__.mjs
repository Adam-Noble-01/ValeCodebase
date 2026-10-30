/* =============================================================================
   PAINTERLYNPR - PAPER | COMPOSITOR
   =============================================================================

   FILE       : PainterlyNPR__Compositor__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - Compositor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Ink, wash and paper into one image, in paper space
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The last pass: the ink laid on the washes, both on the paper, and the overlay
     of the points' influence when it is shown.
   - Bare paper (v0.8.1): the same programs over an empty wash and no ink, as a
     tile that repeats, for a wrapper's page round its pictures.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Compositor
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__BASE_PX_PER_MM as BASE_PX_PER_MM } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Hex,
    PainterlyNPR__Maths__Linear,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__SeededRandom__Offset } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__CreateTarget,
    PainterlyNPR__GpuResources__DisposeTarget,
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
import { PainterlyNPR__Paper__Uniforms } from '../55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from '../55__Paper__Model/PainterlyNPR__Paper__Presets__.mjs';
import {
    PainterlyNPR__Kuwahara__WashTexture,
    PainterlyNPR__Kuwahara__Kuwahara  as  Kuwahara,
} from '../57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';

// =============================================================================
// REGION | Compositor
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the paper compositor
    // ------------------------------------------------------------
    // Ink over wash, both under the paper's relief. A pen rides the peaks: where a
    // stroke is dry, the valleys go uninked - the opposite of pigment, which
    // settles in them.
    const FS_COMPOSITE = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        ${GLSL_COMMON}
        uniform sampler2D uWash; uniform sampler2D uInk; uniform sampler2D uPaper; uniform sampler2D uField; uniform sampler2D uFieldViz; uniform sampler2D uFieldC;
        uniform sampler2D uWashBase; uniform sampler2D uWashSettled; uniform int uSettled;
        uniform float uPxPerMm; uniform vec3 uInkColour; uniform float uInkDry; uniform float uEmboss; uniform float uPaintedEmboss; uniform int uShowInfluence; uniform vec2 uSeedI;
        out vec4 oColour;
        void main() {
            ivec2 ip = ivec2(gl_FragCoord.xy);
            vec2 mm = gl_FragCoord.xy / uPxPerMm;
            vec4 washes = texelFetch(uWash, ip, 0);
            // The Kuwahara settles only the main watercolour: the embellishments a painter
            // adds over it once dry - flowers, picked units, the marker's shadow lines - are
            // laid back over the settled base as what they did to it (the washes over the
            // base), untouched
            if (uSettled == 1) {
                vec4 base = texelFetch(uWashBase, ip, 0);
                vec4 settled = texelFetch(uWashSettled, ip, 0);
                washes = vec4(settled.rgb * washes.rgb / max(base.rgb, vec3(1e-4)), max(0.0, settled.a + washes.a - base.a));
            }
            vec3 wash = washes.rgb;
            vec4 ink = texelFetch(uInk, ip, 0);
            vec4 paper = texelFetch(uPaper, ip, 0);
            float a = clamp(ink.a, 0.0, 1.0);
            float dry = a > 0.001 ? clamp(ink.g / a, 0.0, 1.0) : 0.0;
            float skip = smoothstep(0.22, 0.50, paper.r + 0.25 * (vnoise(mm * 2.7 + uSeedI) - 0.5));
            a *= mix(1.0, skip, clamp(uInkDry * (0.3 + 0.7 * dry), 0.0, 1.0));
            vec3 col = mix(wash, uInkColour, a);
            // The paper's relief over everything, pigment and ink included. A wash
            // darkens the sheet, so the same relative relief reads weaker on paint
            // than on bare paper: Grain in paint multiplies this one relief - the same
            // grain, never a second texture - where there is pigment (the wash's total
            // density). At Grain relief 0 there is no relief to amplify
            float painted = smoothstep(0.03, 0.45, washes.a);
            col *= 1.0 + uEmboss * (1.0 + uPaintedEmboss * painted) * 0.035 * clamp(paper.b, -1.5, 1.5) * (1.0 - 0.6 * a);
            vec3 srgb = toSrgb(col);
            if (uShowInfluence == 1) {
                vec4 f = texelFetch(uField, ip, 0);
                vec4 r = texelFetch(uFieldViz, ip, 0);
                srgb = mix(srgb, vec3(0.80, 0.42, 0.30), (1.0 - f.r) * 0.30);                              // <-- Lost to the paper
                srgb = mix(srgb, vec3(0.33, 0.47, 0.62), r.x * 0.22);                                      // <-- Focus
                srgb = mix(srgb, vec3(0.72, 0.56, 0.22), r.z * 0.22);                                      // <-- Line control
                srgb = mix(srgb, f.a >= 0.5 ? vec3(0.60, 0.26, 0.20) : vec3(0.50, 0.50, 0.52), r.w * 0.30);  // <-- Indication: brick red expresses, grey suppresses
                vec4 l = texelFetch(uFieldC, ip, 0);
                srgb = mix(srgb, vec3(0.48, 0.37, 0.64), l.r * 0.28);                                      // <-- Hatching
                srgb = mix(srgb, vec3(0.62, 0.62, 0.64), clamp(0.5 - l.a, 0.0, 0.5) * 0.7);                // <-- Detail suppressed
            }
            oColour = vec4(srgb, 1.0);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Compositor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Compositor's Uniforms Over Its Sources
    // ------------------------------------------------------------
    // sources: none for the drawing's own targets (the pass); { Wash, Ink, Paper,
    // PxPerMm } for BarePaper's. A bare sheet is never settled by the Kuwahara
    // and never shows the points' influence.
    function PainterlyNPR__Compositor__Uniforms(sources) {
        const T     =  Gpu.Targets;
        const S     =  sources || T;
        const bare  =  !!sources;
        return {
            uWash          :  { t: S.Wash.Textures[0] },
            uWashBase      :  { t: S.Wash.Textures[1] },
            uWashSettled   :  { t: PainterlyNPR__Kuwahara__WashTexture() },        // <-- The base after the Kuwahara when it ran: the embellishments go back over it, then the ink
            uSettled       :  { i: !bare && Kuwahara.Result && Kuwahara.Result.Filtered ? 1 : 0 },
            uInk           :  { t: S.Ink.Textures[0] },
            uPaper         :  { t: S.Paper.Textures[0] },
            uField         :  { t: T.Field.Textures[0] },
            uFieldViz      :  { t: T.Field.Textures[1] },
            uFieldC        :  { t: T.Field.Textures[3] },
            uPxPerMm       :  { f: bare ? S.PxPerMm : Gpu.PxPerMm },
            uInkColour     :  { v3: PainterlyNPR__Maths__Linear(PainterlyNPR__Maths__Hex(INK_FAMILIES[State.InkFamily].Colour)) },
            uInkDry        :  { f: State.Paper.InkDry },
            uEmboss        :  { f: State.Paper.Emboss },
            uPaintedEmboss :  { f: State.Paper.PaintedEmboss == null ? 1 : State.Paper.PaintedEmboss },
            uShowInfluence :  { i: !bare && State.ShowInfluence ? 1 : 0 },
            uSeedI         :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'ink-skip') },
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Ink, Wash and Paper Into One Image
    // ------------------------------------------------------------
    function PainterlyNPR__Compositor__Run() {
        PainterlyNPR__GpuResources__Fullscreen(Gpu.Targets.Composite, Gpu.Programs.Composite, PainterlyNPR__Compositor__Uniforms(null));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bare Paper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make a Tile Repeat: crossfade its far edges into its near ones
    // ------------------------------------------------------------
    // rgba: (size + repeat) square, top row first. The first `repeat` columns,
    // then rows, take over from the copies `size` further on, so the last column
    // meets the first as if the paper ran on. The grain is the tone with the
    // relief over it: the fade mixes the relief only, scaled by 1 / sqrt(a^2 + b^2)
    // so the overlap keeps the grain's contrast instead of greying it out.
    function PainterlyNPR__Compositor__Repeat(rgba, size, repeat, toneBytes) {
        const full  =  size + repeat;
        const mix   =  (a, b, t, tone) => tone + ((1 - t) * (a - tone) + t * (b - tone)) / Math.hypot(1 - t, t);
        const rows  =  new Float32Array(full * size * 4);                         // <-- Columns faded: every row, the tile's width
        for (let y = 0; y < full; y++) {
            for (let x = 0; x < size; x++) {
                const o  =  (y * size + x) * 4, i = (y * full + x) * 4, j = (y * full + x + size) * 4;
                const t  =  x < repeat ? (repeat - x) / repeat : 0;
                for (let c = 0; c < 3; c++) rows[o + c] = t ? mix(rgba[i + c], rgba[j + c], t, toneBytes[c]) : rgba[i + c];
            }
        }
        const out  =  new Uint8ClampedArray(size * size * 4);
        for (let y = 0; y < size; y++) {
            const t  =  y < repeat ? (repeat - y) / repeat : 0;
            for (let x = 0; x < size; x++) {
                const o  =  (y * size + x) * 4, i = (y * size + x) * 4, j = ((y + size) * size + x) * 4;
                for (let c = 0; c < 3; c++) out[o + c] = Math.round(t ? mix(rows[i + c], rows[j + c], t, toneBytes[c]) : rows[i + c]);
                out[o + 3] = 255;
            }
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Bare Paper - the Sheet With Nothing on It, for a Wrapper's Page
    // ------------------------------------------------------------
    // The paper exactly as the drawing shows it where nothing is painted or
    // inked: the paper pass's program and this compositor's, over an empty wash
    // (the preset's tone, no pigment, as the watercolour pass leaves bare paper)
    // and no ink. A wrapper's page round its pictures is then the same paper,
    // grain and all (ValeVision AURA's drawing sheets, v0.8.1). sizePx square,
    // from the sheet's corner at the engine's own BASE_PX_PER_MM; with repeatPx
    // its edges are crossfaded so it tiles with no seam. The drawing's own
    // targets are not touched, and the context is left as a pass leaves it.
    // Returns { Width, Height, PxPerMm, Tone, Data } (sRGB RGBA bytes, top row
    // first; Tone the preset's '#RRGGBB'), or null before the engine has a GPU.
    function PainterlyNPR__Compositor__BarePaper(sizePx, repeatPx) {
        const gl  =  Gpu.Gl;
        if (!gl || !Gpu.Programs.Paper || !Gpu.Programs.Composite || !Gpu.Targets.Field) return null;
        const repeat  =  Math.max(0, Math.round(repeatPx || 0));
        const size    =  Math.max(16, Math.min(Math.round(sizePx), (Gpu.MaxSize || 4096) - repeat));
        const full    =  size + repeat;
        const tone    =  PAPER_PRESETS[State.Paper.Preset].Tone;
        const toneRgb =  PainterlyNPR__Maths__Hex(tone);
        const lin     =  PainterlyNPR__Maths__Linear(toneRgb);
        const paper   =  PainterlyNPR__GpuResources__CreateTarget('Bare paper - relief', full, full, ['RGBA16F'], false);
        const wash    =  PainterlyNPR__GpuResources__CreateTarget('Bare paper - wash', full, full, ['RGBA16F', 'RGBA16F'], false);
        const ink     =  PainterlyNPR__GpuResources__CreateTarget('Bare paper - ink', full, full, ['RGBA8'], false);
        const out     =  PainterlyNPR__GpuResources__CreateTarget('Bare paper', full, full, ['RGBA8'], false);
        try {
            PainterlyNPR__GpuResources__Fullscreen(paper, Gpu.Programs.Paper, PainterlyNPR__Paper__Uniforms(BASE_PX_PER_MM));
            gl.bindFramebuffer(gl.FRAMEBUFFER, wash.Fbo);
            gl.clearBufferfv(gl.COLOR, 0, [lin[0], lin[1], lin[2], 0]);
            gl.clearBufferfv(gl.COLOR, 1, [lin[0], lin[1], lin[2], 0]);
            gl.bindFramebuffer(gl.FRAMEBUFFER, ink.Fbo);
            gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
            PainterlyNPR__GpuResources__Fullscreen(out, Gpu.Programs.Composite, PainterlyNPR__Compositor__Uniforms({ Wash: wash, Ink: ink, Paper: paper, PxPerMm: BASE_PX_PER_MM }));
            const raw  =  new Uint8Array(full * full * 4);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, out.Fbo);
            gl.readPixels(0, 0, full, full, gl.RGBA, gl.UNSIGNED_BYTE, raw);
            const rgba  =  new Uint8ClampedArray(raw.length);
            const row   =  full * 4;
            for (let y = 0; y < full; y++) rgba.set(raw.subarray((full - 1 - y) * row, (full - y) * row), y * row);   // <-- GL's first row is the sheet's foot
            const data  =  repeat ? PainterlyNPR__Compositor__Repeat(rgba, size, repeat, toneRgb.map((v) => v * 255)) : rgba;
            return { Width: size, Height: size, PxPerMm: BASE_PX_PER_MM, Tone: tone, Data: data };
        } finally {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            gl.useProgram(null);
            for (const target of [paper, wash, ink, out]) PainterlyNPR__GpuResources__DisposeTarget(target);
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
        PainterlyNPR__Compositor__BarePaper,
        PainterlyNPR__Compositor__Run,
        FS_COMPOSITE  as  PainterlyNPR__Compositor__FS_COMPOSITE,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
