/* =============================================================================
   PAINTERLYNPR - WASH | KUWAHARA FILTER - SHADERS
   =============================================================================

   FILE       : PainterlyNPR__KuwaharaFilter__Shaders__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - KuwaharaFilter - Shaders
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The four fragment shaders: the structure tensor, its smoothing, the
                anisotropic Kuwahara filter, and the blend back into the source
   CREATED    : 30-Oct-2026

   DESCRIPTION:
   - GLSL ES 3.00, single underscores in every identifier (the language reserves
     double ones). Every read is a texelFetch at the source's own size, clamped at
     the edge: no filtering, so a half-float buffer of any size is read exactly.
   - All four channels are averaged by the same sector weights. Which channels
     count toward the edges and the variance is uWeights (a picture's colour:
     1, 1, 1, 0; a data buffer chooses its own).
   - The filter is Kyprianidis, Kang and Doellner's anisotropic Kuwahara (2009) with
     Kyprianidis's polynomial sector weights (2011): no weight texture, eight
     sectors, an ellipse that follows the run of the colour. First written for the
     cloud buffer by the cloud-rendering session; this is its shared form.

   ============================================================================= */

// =============================================================================
// REGION | Kuwahara Filter - Shaders
// =============================================================================

    // MODULE CONSTANTS | The Structure Tensor - which way the colour runs
    // ------------------------------------------------------------
    // A Sobel gradient of the weighted channels, summed over the four as one
    // multichannel tensor: x = E (gx.gx), y = G (gy.gy), z = F (gx.gy).
    export const PainterlyNPR__KuwaharaShaders__Tensor = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uSource;
        uniform vec4 uWeights;
        out vec4 oTensor;
        vec4 PainterlyNPR_KuwaharaSeen(ivec2 p) {
            return texelFetch(uSource, clamp(p, ivec2(0), textureSize(uSource, 0) - 1), 0) * uWeights;
        }
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            vec4 a = PainterlyNPR_KuwaharaSeen(p + ivec2(-1, -1)), b = PainterlyNPR_KuwaharaSeen(p + ivec2(0, -1)), c = PainterlyNPR_KuwaharaSeen(p + ivec2(1, -1));
            vec4 d = PainterlyNPR_KuwaharaSeen(p + ivec2(-1,  0)),                                                   f = PainterlyNPR_KuwaharaSeen(p + ivec2(1,  0));
            vec4 g = PainterlyNPR_KuwaharaSeen(p + ivec2(-1,  1)), h = PainterlyNPR_KuwaharaSeen(p + ivec2(0,  1)), i = PainterlyNPR_KuwaharaSeen(p + ivec2(1,  1));
            vec4 gx = (c + 2.0 * f + i - a - 2.0 * d - g) * 0.25;
            vec4 gy = (g + 2.0 * h + i - a - 2.0 * b - c) * 0.25;
            oTensor = vec4(dot(gx, gx), dot(gy, gy), dot(gx, gy), 1.0);
        }`;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | A Gaussian, One Direction a Pass - the tensor smoothed
    // ------------------------------------------------------------
    export const PainterlyNPR__KuwaharaShaders__Smooth = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uSource;
        uniform vec2 uDirection;
        uniform float uSigma;
        out vec4 oTensor;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            ivec2 last = textureSize(uSource, 0) - 1;
            ivec2 dir = ivec2(uDirection);
            int r = int(ceil(2.5 * uSigma));
            vec4 sum = vec4(0.0);
            float total = 0.0;
            for (int i = -24; i <= 24; i++) {
                if (i < -r || i > r) continue;
                float w = exp(-0.5 * float(i * i) / (uSigma * uSigma));
                sum += w * texelFetch(uSource, clamp(p + dir * i, ivec2(0), last), 0);
                total += w;
            }
            oTensor = sum / total;
        }`;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Anisotropic Kuwahara Filter - polynomial sector weights
    // ------------------------------------------------------------
    // The ellipse: a along the run, b across it; the more a place has one direction
    // (A, from the tensor's eigenvalues), the longer and thinner it is, by alpha.
    // Each sample's weight is shared among the eight sectors by polynomials, times
    // a Gaussian over the unit ellipse. A sector's variance is its weighted channels'
    // together; Sharpness is the exponent that makes the calmest sectors win, and
    // Hardness how small a variance already counts as calm. Every channel of the
    // result is the same weighted mean, so a buffer's channels stay together.
    export const PainterlyNPR__KuwaharaShaders__Filter = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uSource;
        uniform sampler2D uTensor;
        uniform vec4 uKuwahara;          // radius texels, sharpness, alpha, sector overlap
        uniform vec2 uShape;             // the Gaussian's falloff over the unit ellipse, hardness
        uniform vec4 uWeights;           // how much each channel counts toward the variance
        uniform int uMaxReach;           // texels: the furthest a sample may be taken
        out vec4 oColour;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            ivec2 last = textureSize(uSource, 0) - 1;
            vec4 st = texelFetch(uTensor, p, 0);
            float E = st.x, G = st.y, F = st.z;
            float root = sqrt((E - G) * (E - G) + 4.0 * F * F);
            float l1 = 0.5 * (E + G + root);
            float l2 = 0.5 * (E + G - root);
            vec2 t = vec2(l1 - E, -F);
            t = dot(t, t) > 1e-14 ? normalize(t) : vec2(1.0, 0.0);
            float A = (l1 + l2) > 1e-10 ? (l1 - l2) / (l1 + l2) : 0.0;
            float radius = uKuwahara.x, q = uKuwahara.y, alpha = uKuwahara.z, zeta = uKuwahara.w;
            float a = radius * clamp((alpha + A) / alpha, 0.1, 2.0);
            float b = radius * clamp(alpha / (alpha + A), 0.1, 2.0);
            // Into the ellipse's frame, scaled to the unit disc
            mat2 SR = mat2(t.x / a, -t.y / b, t.y / a, t.x / b);
            int mx = min(int(sqrt(a * a * t.x * t.x + b * b * t.y * t.y)), uMaxReach);
            int my = min(int(sqrt(a * a * t.y * t.y + b * b * t.x * t.x)), uMaxReach);
            const float PI8 = 0.39269908;
            float eta = (zeta + cos(PI8)) / (sin(PI8) * sin(PI8));
            vec4 m[8];
            vec4 s[8];
            float n[8];
            for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec4(0.0); n[k] = 0.0; }
            for (int j = -my; j <= my; j++) {
                for (int i = -mx; i <= mx; i++) {
                    vec2 v = SR * vec2(float(i), float(j));
                    float r2 = dot(v, v);
                    if (r2 > 1.0) continue;
                    vec4 c = texelFetch(uSource, clamp(p + ivec2(i, j), ivec2(0), last), 0);
                    vec4 seen = c * uWeights;
                    float w[8];
                    float z, vxx, vyy, sum = 0.0;
                    vxx = zeta - eta * v.x * v.x;
                    vyy = zeta - eta * v.y * v.y;
                    z = max(0.0,  v.y + vxx); w[0] = z * z; sum += w[0];
                    z = max(0.0, -v.x + vyy); w[2] = z * z; sum += w[2];
                    z = max(0.0, -v.y + vxx); w[4] = z * z; sum += w[4];
                    z = max(0.0,  v.x + vyy); w[6] = z * z; sum += w[6];
                    vec2 u = 0.70710678 * vec2(v.x - v.y, v.x + v.y);
                    vxx = zeta - eta * u.x * u.x;
                    vyy = zeta - eta * u.y * u.y;
                    z = max(0.0,  u.y + vxx); w[1] = z * z; sum += w[1];
                    z = max(0.0, -u.x + vyy); w[3] = z * z; sum += w[3];
                    z = max(0.0, -u.y + vxx); w[5] = z * z; sum += w[5];
                    z = max(0.0,  u.x + vyy); w[7] = z * z; sum += w[7];
                    float g = exp(-uShape.x * r2) / max(sum, 1e-8);
                    for (int k = 0; k < 8; k++) {
                        float wk = w[k] * g;
                        m[k] += c * wk;
                        s[k] += seen * seen * wk;
                        n[k] += wk;
                    }
                }
            }
            vec4 o = vec4(0.0);
            float ow = 0.0;
            for (int k = 0; k < 8; k++) {
                if (n[k] <= 1e-8) continue;
                vec4 mean = m[k] / n[k];
                vec4 seenMean = mean * uWeights;
                vec4 v4 = abs(s[k] / n[k] - seenMean * seenMean);
                float wk = 1.0 / (1.0 + pow(uShape.y * (v4.x + v4.y + v4.z + v4.w), 0.5 * q));
                o += wk * mean;
                ow += wk;
            }
            oColour = ow > 0.0 ? o / ow : texelFetch(uSource, p, 0);
        }`;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Blend - the filtered result over the source, by amount
    // ------------------------------------------------------------
    // uBlend: x the amount where the mask holds (or everywhere without one), y the
    // amount where it does not, z the mask's channel (0-3), w its threshold. The
    // mask is read at its own size, scaled to the source's.
    export const PainterlyNPR__KuwaharaShaders__Blend = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uSource;
        uniform sampler2D uFiltered;
        uniform sampler2D uMask;
        uniform vec4 uBlend;
        uniform int uHasMask;
        out vec4 oColour;
        void main() {
            ivec2 p = ivec2(gl_FragCoord.xy);
            vec4 src = texelFetch(uSource, p, 0);
            vec4 flt = texelFetch(uFiltered, p, 0);
            float amount = uBlend.x;
            if (uHasMask == 1) {
                ivec2 ms = textureSize(uMask, 0), ss = textureSize(uSource, 0);
                vec4 mv = texelFetch(uMask, clamp(p * ms / ss, ivec2(0), ms - 1), 0);
                float c = uBlend.z < 0.5 ? mv.x : (uBlend.z < 1.5 ? mv.y : (uBlend.z < 2.5 ? mv.z : mv.w));
                amount = c > uBlend.w ? uBlend.x : uBlend.y;
            }
            oColour = mix(src, flt, clamp(amount, 0.0, 1.0));
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
