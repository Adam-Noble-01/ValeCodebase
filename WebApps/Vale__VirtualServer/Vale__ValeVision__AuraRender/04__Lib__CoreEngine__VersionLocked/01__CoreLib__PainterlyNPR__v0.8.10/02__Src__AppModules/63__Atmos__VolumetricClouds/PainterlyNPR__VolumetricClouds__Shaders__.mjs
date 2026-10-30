/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | VOLUMETRIC CLOUDS - SHADERS
   =============================================================================

   FILE       : PainterlyNPR__VolumetricClouds__Shaders__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - VolumetricClouds - Shaders
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The cloud march - every sky pixel's ray through a curved cloud layer,
                lit by the sun - and the soften pass that takes its grain out
   CREATED    : 29-Oct-2026

   DESCRIPTION:
   - THE BUFFER it writes is the module's contract (and the CloudPaint chunk's
     input), every value premultiplied by coverage so filtering and blurring stay
     true at a cloud's edge:
       x  transmittance - 1 clear sky, 0 opaque cloud
       y  lit x coverage - the cloud's brightness, 0 deep shade to 1 sunlit
       z  height x coverage - where in the layer the visible cloud sits, base 0, top 1
       w  distance x coverage - kilometres to it, for aerial fading
     Divide y, z and w by (1 - x) to read them.
   - Units are kilometres; the planet's centre sits at (0, -R, 0), so the layer
     curves away and clouds flatten into the horizon as they do.
   - Deterministic: the only jitter is interleaved gradient noise of the pixel and
     the seed. No time, no history.

   ---------------------------------------------------------------------------

   WHY LIT IS ONLY THE SUN'S SHARE, NOT A RENDERED BRIGHTNESS

   The painting reads one thing from the light: which side of a cloud the sun
   reaches. So "lit" is the share of sunlight arriving at the cloud the eye sees -
   Beer's law toward the sun over two kilometres, with a weaker second extinction
   standing in for multiple scattering so an interior is shaded, not black. No phase
   function, no sky colour: a phase function made a sunlit face read half-lit when
   the sun stood behind the viewer, and the wash throws colour away. A backlit
   cloud's silver lining needs no special term: its thin edges let the sun through.

   ============================================================================= */

// =============================================================================
// REGION | Volumetric Clouds - Shaders
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The March
// -----------------------------------------------------------------------------

    // FUNCTION | The March Fragment Shader, Built for a Step Count and Volume Size
    // ------------------------------------------------------------
    // Loop bounds are compile-time constants: the step counts are baked in, so a
    // quality change compiles a new program rather than branching every pixel.
    export function PainterlyNPR__CloudShaders__March(steps, lightSteps, shapeSize) {
        return `#version 300 es
        precision highp float;
        precision highp sampler3D;
        #define MAX_STEPS ${Math.max(8, steps | 0)}
        #define LIGHT_STEPS ${Math.max(1, lightSteps | 0)}
        #define SHAPE_SIZE ${(shapeSize | 0).toFixed(1)}
        in vec2 vUv;
        uniform sampler3D uShape;
        uniform sampler3D uDetail;
        uniform vec3 uEye;              // km; the planet's centre is at (0, -R, 0)
        uniform vec3 uForward;
        uniform vec3 uRight;
        uniform vec3 uUp;
        uniform vec4 uFrame;            // tan of the half field across, tan of the half field up, the v the forward axis meets, lift
        uniform vec3 uSun;              // unit, toward the sun
        uniform vec4 uLayer;            // base km, top km, 1 / thickness, planet radius km
        uniform vec4 uShapeParams;      // coverage, extinction per km, erosion, 1 / shape tile km
        uniform vec4 uProfile;          // base ramp, top fall start, top fall end, density growth with height
        uniform vec4 uWeather;          // 1 / weather tile km, drift x km, drift z km, detail ratio
        uniform vec3 uMarch;            // max march km, radians per texel, seed
        uniform vec2 uShapeOffset;      // km: where the seed puts the shape field
        out vec4 oCloud;

        float PainterlyNPR_Remap(float v, float lo, float hi, float a, float b) {
            return a + (v - lo) * (b - a) / max(hi - lo, 1e-5);
        }

        float PainterlyNPR_HeightFraction(vec3 p) {
            float altitude = length(p + vec3(0.0, uLayer.w, 0.0)) - uLayer.w;
            return (altitude - uLayer.x) * uLayer.z;
        }

        // Where a ray from inside a planet-centred sphere leaves it (-1 if never)
        float PainterlyNPR_SphereExit(vec3 o, vec3 d, float radius) {
            vec3 oc = o + vec3(0.0, uLayer.w, 0.0);
            float b = dot(oc, d);
            float c = dot(oc, oc) - radius * radius;
            float disc = b * b - c;
            return disc < 0.0 ? -1.0 : -b + sqrt(disc);
        }

        // The baked noises' measured spreads (10th to 90th percentile): Perlin-Worley
        // 0.58 to 0.81, Worley fBm 0.22 to 0.59. Each is mapped onto 0 to 1 before
        // it is used, so Coverage is a threshold on a known field, not a guess.
        float PainterlyNPR_Weather(vec2 xz) {
            vec2 q = (xz + uWeather.yz) * uWeather.x;
            float a = textureLod(uShape, vec3(q, 0.27), 0.0).r;
            float b = textureLod(uShape, vec3(mat2(0.8, -0.6, 0.6, 0.8) * q * 2.3 + 0.37, 0.71), 0.0).r;
            return clamp((a * 0.65 + b * 0.35 - 0.6) / 0.22, 0.0, 1.0);
        }

        float PainterlyNPR_Density(vec3 p, float lod, bool detail) {
            float h = PainterlyNPR_HeightFraction(p);
            if (h <= 0.0 || h >= 1.0 || uShapeParams.x <= 0.0) return 0.0;
            float profile = smoothstep(0.0, uProfile.x, h) * (1.0 - smoothstep(uProfile.y, uProfile.z, h));
            vec3 q = vec3(p.x + uShapeOffset.x + uWeather.y, p.y, p.z + uShapeOffset.y + uWeather.z) * uShapeParams.w;
            vec4 s = textureLod(uShape, q, lod);
            float billow = clamp((s.r - 0.55) / 0.33, 0.0, 1.0);
            float carve = clamp((s.g * 0.625 + s.b * 0.25 + s.a * 0.125 - 0.15) / 0.5, 0.0, 1.0);
            // Weather gathers clouds into fields; billows rise within them; the height
            // profile flattens a base and rounds a top, since only strong puffs reach it
            float field = (billow * mix(0.6, 1.0, carve) * 0.62 + PainterlyNPR_Weather(p.xz) * 0.38) * profile;
            float threshold = 1.0 - uShapeParams.x;
            float base = clamp((field - threshold * 0.82) / 0.22, 0.0, 1.0);
            if (base <= 0.0) return 0.0;
            if (detail) {
                vec3 dt = textureLod(uDetail, q * uWeather.w, lod).rgb;
                float fine = clamp((dt.r * 0.625 + dt.g * 0.25 + dt.b * 0.125 - 0.2) / 0.4, 0.0, 1.0);
                float erode = mix(1.0 - fine, fine, clamp(h * 4.0, 0.0, 1.0));   // wisps at the base, cauliflower at the top
                base = clamp((base - erode * uShapeParams.z * 0.45) / max(1.0 - uShapeParams.z * 0.45, 0.1), 0.0, 1.0);
            }
            return base * mix(1.0, 0.45 + 1.1 * h, uProfile.w);
        }

        // How much sunlight reaches a point: Beer over two kilometres toward the sun,
        // with a weaker second extinction standing in for multiple scattering
        float PainterlyNPR_SunTransmittance(vec3 p, float lod) {
            float od = 0.0, s = 0.06;
            vec3 q = p;
            for (int j = 0; j < LIGHT_STEPS; j++) {
                q += uSun * s;
                od += PainterlyNPR_Density(q, lod + float(j) * 0.5, j < 2) * s;
                s *= 1.7;
            }
            od *= uShapeParams.y;
            return max(exp(-od), exp(-od * 0.25) * 0.65);
        }

        void main() {
            vec2 ndc = vec2(vUv.x * 2.0 - 1.0, (vUv.y - uFrame.z) * 2.0);
            vec3 dir = normalize(uForward + ndc.x * uFrame.x * uRight + ndc.y * uFrame.y * uUp);
            oCloud = vec4(1.0, 0.0, 0.0, 0.0);
            if (dir.y < -0.02) return;                                       // below the horizon the ground hides the layer
            float horizon = smoothstep(0.0, 0.04, dir.y);                    // the last two degrees thin into the pale sky
            dir = normalize(vec3(dir.x, dir.y * uFrame.w, dir.z));           // the lift: steeper into the sky, the horizon where it was
            float t0 = PainterlyNPR_SphereExit(uEye, dir, uLayer.w + uLayer.x);
            float t1 = min(PainterlyNPR_SphereExit(uEye, dir, uLayer.w + uLayer.y), uMarch.x);
            if (t0 < 0.0 || t1 <= t0) return;
            float stepKm = (t1 - t0) / float(MAX_STEPS);
            float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)) + uMarch.z));
            float t = t0 + stepKm * jitter;
            float T = 1.0, S = 0.0, H = 0.0, D = 0.0;
            for (int i = 0; i < MAX_STEPS; i++) {
                if (t > t1) break;
                vec3 p = uEye + dir * t;
                float lod = max(0.0, log2(max(t * uMarch.y * uShapeParams.w * SHAPE_SIZE, 1e-6)));
                float fade = 1.0 - smoothstep(uMarch.x * 0.55, uMarch.x, t);   // far clouds thin into the distance, never stop at a line
                float d = PainterlyNPR_Density(p, lod, true) * fade;
                if (d > 0.002) {
                    float a = 1.0 - exp(-d * uShapeParams.y * stepKm);
                    float w = T * a;                                         // how much of what the eye sees this sample is
                    S += w * PainterlyNPR_SunTransmittance(p, lod);
                    H += w * clamp(PainterlyNPR_HeightFraction(p), 0.0, 1.0);
                    D += w * t;
                    T *= 1.0 - a;
                    if (T < 0.01) break;
                }
                t += stepKm;
            }
            // S, H and D are sums weighted by what the eye sees - premultiplied by
            // coverage - so the horizon's thinning scales them as it scales coverage
            float coverage = 1.0 - T;
            oCloud = vec4(1.0 - coverage * horizon, S * horizon, H * horizon, D * horizon);
        }`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Soften Pass
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Nine-Tap Gaussian in Five Fetches, One Direction a Pass
    // ------------------------------------------------------------
    // The march's jitter is grain at the texel scale; two passes of this take it out
    // before the buffer is upsampled to the sheet. Premultiplied values blur true.
    export const PainterlyNPR__CloudShaders__Soften = `#version 300 es
        precision highp float;
        in vec2 vUv;
        uniform sampler2D uSource;
        uniform vec2 uStep;
        out vec4 oCloud;
        void main() {
            vec4 sum = texture(uSource, vUv) * 0.2270270270;
            sum += (texture(uSource, vUv + uStep * 1.3846153846) + texture(uSource, vUv - uStep * 1.3846153846)) * 0.3162162162;
            sum += (texture(uSource, vUv + uStep * 3.2307692308) + texture(uSource, vUv - uStep * 3.2307692308)) * 0.0702702703;
            oCloud = sum;
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
