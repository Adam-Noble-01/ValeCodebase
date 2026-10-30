/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | SKY AND CLOUDS - CLOUD PAINT
   =============================================================================

   FILE       : PainterlyNPR__SkyAndClouds__CloudPaint__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - SkyAndClouds - CloudPaint
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : How a watercolourist paints the clouds the volume found - the blue
                laid round reserved paper, one or two greys dropped into the
                undersides, and every edge a wash's edge
   CREATED    : 29-Oct-2026 (v1.1.0 30-Oct-2026: washes and edges, not gradients)

   DESCRIPTION:
   - A GLSL chunk a host's wash shader includes at global scope, and the uniforms it
     needs. It reads the cloud buffer of 63__Atmos__VolumetricClouds - best the
     simplified one from this module's CloudMasses - and returns, for a sky pixel,
     four numbers the host's wash applies:
       x  sky wash multiplier - 0 where a cloud reserves the paper; lowered on the
          paper's peaks where the brush ran dry along a cut edge
       y  grey underside density, in wash units - flat washes with edges
       z  pigment pooled in the blue: a dark rim where it dried against a cut edge,
          tide lines where it ran back wet
       w  the cloud mask, for diagnostics and the host's own blending
   - Manifest section 09: the volume decides in WORLD space where cloud masses stand
     and which side the sun lights; this decides in PAPER space how their edges and
     washes behave. Every distance here is millimetres on the sheet, so it is a
     brush's edge at any export size, never the volume's clean contour.
   - "calm" (0 to 1, the host's) holds clouds back where the drawing needs quiet -
     round a roofline (section 09: bias cloud contrast away from roofline detail).
   - "paper" is the host's paper relief at the pixel (0 valley to 1 peak): a dry
     brush skips the peaks.

   ---------------------------------------------------------------------------

   WHY WASHES WITH EDGES, NOT THE VOLUME'S SHADING

   v1.0.0 greyed each cloud by a smooth function of the volume's light and cut the
   paper by a wide smoothstep of its coverage, so the sky came out as the render's
   own soft gradients, tinted: airbrushed vapour. A painter puts down one grey -
   two at most - and what makes it watercolour is how each one ends: cut hard and
   pooled where it met dry paper, lost where it went into damp, now and then a
   bloom where water crept back. So the reading finds, for every pixel, how far it
   is from each edge in millimetres (the masses' gradient, half a millimetre either
   way) and gives that edge a width and a behaviour, as the region washes do with
   their jump-flood distances.

   WHY THE EDGE IS CRISP ON THE LIT SIDE AND SOFT IN SHADE

   A painter cuts a cumulus's sunlit top out of the wet blue with a firm edge - the
   paper's white against the sky - and lets the grey of its base bleed softly into
   the blue below. So a crown with sky above is cut, its sides and base are lost,
   and patches of the sky were damp when the blue went on, where even a crown's
   edge softens. Far clouds soften everywhere, as distance does.

   ============================================================================= */

import Config from './Na__SkyAndClouds__Config.json' with { type: 'json' };

// =============================================================================
// REGION | Sky and Clouds - Cloud Paint
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The GLSL Chunk
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Chunk - uniforms, a paper noise, the reading
    // ------------------------------------------------------------
    // Names carry the PainterlyNPR_CloudPaint prefix (single underscores: GLSL ES
    // reserves double ones), so the chunk drops into any wash shader beside its own.
    // Every buffer read is textureLod at level 0: the reading runs inside the host's
    // branches and loops, where implicit derivatives are undefined.
    export const PainterlyNPR__CloudPaint__Glsl = `
        uniform sampler2D uCloudBuffer;
        uniform vec4 uCloudPaintA;          // undersides, lost-edge softness mm, reserve, ragged mm
        uniform vec4 uCloudPaintB;          // pool, crispness, fade start km, fade end km
        uniform vec4 uCloudPaintC;          // sheet width mm, sheet height mm, seed x, seed y
        uniform vec4 uCloudPaintD;          // wander mm, blooms, dry edge, (spare)

        float PainterlyNPR_CloudPaintHash(vec2 p) {
            vec3 q = fract(vec3(p.xyx) * 0.1031);
            q += dot(q, q.yzx + 33.33);
            return fract((q.x + q.y) * q.z);
        }

        float PainterlyNPR_CloudPaintNoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            float a = PainterlyNPR_CloudPaintHash(i), b = PainterlyNPR_CloudPaintHash(i + vec2(1.0, 0.0));
            float c = PainterlyNPR_CloudPaintHash(i + vec2(0.0, 1.0)), d = PainterlyNPR_CloudPaintHash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        // Two octaves, each turned off the axes: one octave of value noise shows its
        // square cells wherever it multiplies a flat wash
        float PainterlyNPR_CloudPaintFbm(vec2 p) {
            const mat2 R = mat2(0.80, -0.60, 0.60, 0.80);
            return PainterlyNPR_CloudPaintNoise(R * p) * 0.62 + PainterlyNPR_CloudPaintNoise(R * R * p * 2.07 + 3.1) * 0.38;
        }

        // The masses at a point, un-premultiplied: coverage, light, height, distance km
        vec4 PainterlyNPR_CloudPaintAt(vec2 uv) {
            vec4 c = textureLod(uCloudBuffer, uv, 0.0);
            float cov = clamp(1.0 - c.x, 0.0, 1.0);
            float k = 1.0 / max(cov, 1e-3);
            return vec4(cov, clamp(c.y * k, 0.0, 1.0), clamp(c.z * k, 0.0, 1.0), c.w * k);
        }

        // How far up and down this mass runs from a point, in steps, until the sky:
        // its base is where a painter drops the grey, whatever height in the layer
        // the volume says it has (seen near the horizon, every cloud shows its base).
        // The crossing is found within its step, or the grey's line stairs by a step
        float PainterlyNPR_CloudPaintCross(float before, float after, float threshold) {
            return clamp((before - threshold) / max(before - after, 1e-4), 0.0, 1.0);
        }

        vec2 PainterlyNPR_CloudPaintColumn(vec2 q, vec2 stepUv, float threshold, float here) {
            float up = 6.0, down = 6.0;
            float lastUp = here, lastDown = here;
            for (int k = 1; k <= 6; k++) {
                if (up > 5.99) {
                    float c = PainterlyNPR_CloudPaintAt(q + stepUv * float(k)).x;
                    if (c < threshold) up = float(k - 1) + PainterlyNPR_CloudPaintCross(lastUp, c, threshold);
                    lastUp = c;
                }
                if (down > 5.99) {
                    float c = PainterlyNPR_CloudPaintAt(q - stepUv * float(k)).x;
                    if (c < threshold) down = float(k - 1) + PainterlyNPR_CloudPaintCross(lastDown, c, threshold);
                    lastDown = c;
                }
            }
            return vec2(up, down);
        }

        vec4 PainterlyNPR_CloudPaint(vec2 uv, vec2 mm, float calm, float paper) {
            vec2 sheet = uCloudPaintC.xy;
            vec2 seed = uCloudPaintC.zw;
            // Where the brush went: a broad wander (the hand) and a fine rag (the
            // hairs and the paper's tooth), both in paper millimetres
            vec2 wander = vec2(PainterlyNPR_CloudPaintFbm(mm * 0.09 + seed + 41.0), PainterlyNPR_CloudPaintFbm(mm * 0.09 + seed + 57.3)) - 0.5;
            vec2 rag = vec2(PainterlyNPR_CloudPaintFbm(mm * 0.42 + seed), PainterlyNPR_CloudPaintFbm(mm * 0.42 + seed + 17.3)) - 0.5;
            vec2 q = uv + (wander * 2.0 * uCloudPaintD.x + rag * uCloudPaintA.w) / sheet;

            // The masses here and a step either way: which way an edge runs and how
            // far off it is, in millimetres
            const float STEP = 0.4;
            vec2 ex = vec2(STEP / sheet.x, 0.0), ey = vec2(0.0, STEP / sheet.y);
            vec4 m0 = PainterlyNPR_CloudPaintAt(q);
            vec4 mx1 = PainterlyNPR_CloudPaintAt(q + ex), mx0 = PainterlyNPR_CloudPaintAt(q - ex);
            vec4 my1 = PainterlyNPR_CloudPaintAt(q + ey), my0 = PainterlyNPR_CloudPaintAt(q - ey);
            vec2 gCov = vec2(mx1.x - mx0.x, my1.x - my0.x) / (2.0 * STEP);
            float lenCov = length(gCov);
            float far = smoothstep(uCloudPaintB.z, uCloudPaintB.w, m0.w);

            // Cut or lost: a crown with sky above is cut from dry paper; sides and base
            // are lost wet into the blue; and the painter wetted patches of the sky first
            float top = smoothstep(0.1, 0.7, -gCov.y / max(lenCov, 1e-4));
            float damp = smoothstep(0.42, 0.62, PainterlyNPR_CloudPaintFbm(mm * 0.03 + seed + 3.3));
            float cut = clamp(top * uCloudPaintB.y * (1.0 - 0.75 * damp) * (1.0 - 0.4 * far), 0.0, 1.0);

            // The reserved paper, its edge a hair wide where cut and the soft-base
            // width where lost. sd: millimetres from the edge, + inside the cloud
            float sd = clamp((m0.x - 0.3) / max(lenCov, 0.03), -12.0, 12.0);
            float ew = mix(max(uCloudPaintA.y, 0.05), 0.07, cut);
            float mask = smoothstep(-ew, ew, sd);
            float skyMul = 1.0 - uCloudPaintA.z * mask * (1.0 - 0.35 * calm);

            // Along a cut edge the brush ran dry and skipped the paper's peaks
            float outside = 1.0 - mask;
            float dry = uCloudPaintD.z * cut * exp(-max(-sd, 0.0) / 0.5) * outside;
            skyMul *= 1.0 - dry * smoothstep(0.46, 0.64, paper + 0.3 * (PainterlyNPR_CloudPaintNoise(mm * 2.1 + seed) - 0.5));

            // Pigment pooled where the blue dried against the cut edge, uneven along it;
            // tide lines a millimetre or two out, where the blue ran back wet
            float poolN = 0.35 + 1.3 * smoothstep(0.3, 0.7, PainterlyNPR_CloudPaintFbm(mm * 0.06 + seed + 11.0));
            float pool = uCloudPaintB.x * cut * exp(-max(-sd, 0.0) / 0.4) * outside * poolN;
            float tideZ = (-sd - (1.1 + 1.6 * PainterlyNPR_CloudPaintFbm(mm * 0.05 + seed + 23.0))) / 0.22;
            float tide = uCloudPaintD.y * 0.5 * (1.0 - cut) * smoothstep(0.55, 0.7, PainterlyNPR_CloudPaintFbm(mm * 0.04 + seed + 29.0)) * exp(-tideZ * tideZ);
            float edge = (pool + tide) * (1.0 - far) * (1.0 - calm);

            // Grey under a cloud as washes, not a gradient: a first grey over the lower
            // part of each mass and its side turned from the sun, a second, darker one in
            // its base. Each wash's edge is measured in millimetres - the base line
            // across the mass's own height, the shade line by the light's gradient - and
            // dropped into the damp sky it is soft; where it met dry paper it dried hard,
            // its pigment pooled at the rim; now and then a bloom
            // Three columns, a little apart: where two clouds join, the grey tapers off
            // along the join rather than stopping at a vertical cut
            const float RISE = 1.0;
            const float SIDE = 1.8;
            vec2 riseUv = vec2(0.0, RISE / sheet.y), sideUv = vec2(SIDE / sheet.x, 0.0);
            vec2 column = (2.0 * PainterlyNPR_CloudPaintColumn(q, riseUv, 0.3, m0.x)
                         + PainterlyNPR_CloudPaintColumn(q - sideUv, riseUv, 0.3, PainterlyNPR_CloudPaintAt(q - sideUv).x)
                         + PainterlyNPR_CloudPaintColumn(q + sideUv, riseUv, 0.3, PainterlyNPR_CloudPaintAt(q + sideUv).x)) * 0.25 * RISE;
            float tall = column.x + column.y;
            float rel = column.y / max(tall, 1e-3);                                  // 0 at the base, 1 at the crown
            float line1 = 0.42 + 0.2 * (PainterlyNPR_CloudPaintFbm(mm * 0.12 + seed + 91.0) - 0.5);
            float line2 = 0.17 + 0.1 * (PainterlyNPR_CloudPaintFbm(mm * 0.16 + seed + 97.0) - 0.5);
            vec2 gLit = vec2(mx1.y - mx0.y, my1.y - my0.y) / (2.0 * STEP);
            float lenLit = max(length(gLit), 0.03);
            float sd1 = clamp(max((line1 - rel) * tall, (0.42 - m0.y) / lenLit), -12.0, 12.0);
            float sd2 = clamp(max((line2 - rel) * tall, (0.28 - m0.y) / lenLit), -12.0, 12.0);
            float wetGrey = smoothstep(0.35, 0.65, PainterlyNPR_CloudPaintFbm(mm * 0.05 + seed + 61.0));
            float ewGrey = mix(0.1, max(uCloudPaintA.y * 0.8, 0.1), wetGrey);
            float inCloud = smoothstep(-ew, ew, sd + 0.5);                             // the grey stays in its cloud, to half a millimetre
            float first = smoothstep(-ewGrey, ewGrey, sd1) * inCloud;
            float second = smoothstep(-ewGrey, ewGrey, sd2) * inCloud;
            float rim = uCloudPaintB.x * 0.8 * (1.0 - wetGrey) * exp(-max(sd1, 0.0) / 0.35) * first;
            // A bloom: water crept back into the drying grey and pushed its pigment out
            // to a crinkled ring, leaving its middle paler
            float bloomN = uCloudPaintD.y * wetGrey * smoothstep(0.55, 0.72, PainterlyNPR_CloudPaintFbm(mm * 0.035 + seed + 77.0));
            float ringZ = (sd1 - (0.8 + 1.4 * PainterlyNPR_CloudPaintFbm(mm * 0.11 + seed + 71.0))) / 0.18;
            float ring = bloomN * exp(-ringZ * ringZ) * first;
            float lift = bloomN * 0.45 * smoothstep(0.0, 3.0, ringZ);
            float mottle = mix(0.72, 1.22, PainterlyNPR_CloudPaintFbm(mm * 0.12 + seed + 5.3));
            float under = (0.62 * first + 0.5 * second + rim + ring) * (1.0 - lift) * mottle;
            under *= uCloudPaintA.x * (1.0 - 0.8 * far) * (1.0 - calm);
            return vec4(skyMul, under, edge, mask);
        }

        // v1.0.0's call, for a host with no paper relief to hand: a level sheet
        vec4 PainterlyNPR_CloudPaint(vec2 uv, vec2 mm, float calm) {
            return PainterlyNPR_CloudPaint(uv, mm, calm, 0.5);
        }
    `;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Settings and Uniforms
// -----------------------------------------------------------------------------

    // FUNCTION | The Defaults and the Ranges, for a Host's Sliders
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudPaint__Defaults() {
        return Object.assign({}, Config.CloudPaint);
    }

    export function PainterlyNPR__CloudPaint__Range(name) {
        return Config.Ranges[name] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Setting - the defaults, overridden by finite numbers, clamped
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudPaint__Resolve(setting) {
        const s    =  setting || {};
        const out  =  Object.assign({}, Config.CloudPaint);
        for (const key of Object.keys(out)) {
            if (!Number.isFinite(s[key])) continue;
            const range  =  Config.Ranges[key];
            out[key]  =  range ? Math.min(range.Max, Math.max(range.Min, s[key])) : s[key];
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Chunk's Uniforms - in the PainterlyNPR convention ({ t }, { v4 })
    // ------------------------------------------------------------
    // cloudTexture is the buffer from the volume's Render (or its simplified masses);
    // sheetMm the sheet's size in millimetres; seed any two numbers the host derives
    // from its drawing seed.
    export function PainterlyNPR__CloudPaint__Uniforms(setting, cloudTexture, sheetMm, seed) {
        const p  =  PainterlyNPR__CloudPaint__Resolve(setting);
        return {
            uCloudBuffer  :  { t: cloudTexture },
            uCloudPaintA  :  { v4: [p.Undersides, p.SoftnessMm, p.Reserve, p.RaggedMm] },
            uCloudPaintB  :  { v4: [p.Pool, p.Crispness, p.FadeStartKm, p.FadeEndKm] },
            uCloudPaintC  :  { v4: [sheetMm[0], sheetMm[1], seed[0], seed[1]] },
            uCloudPaintD  :  { v4: [p.WanderMm, p.Blooms, p.DryEdge, 0] },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
