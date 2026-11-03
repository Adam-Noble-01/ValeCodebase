/* =============================================================================
   PAINTERLYNPR - WASH | LAYER STACK - WATERCOLOUR SHADER
   =============================================================================

   FILE       : PainterlyNPR__Watercolour__Shader__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - LayerStack - WatercolourShader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The watercolour washes' fragment shader: mottle, flow,
                granulation, pooling, tide marks, withdrawal slivers, wet and
                dried edges, the shadow glaze and the sky
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The clouds module puts its reading into this source before it compiles (60).

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import {
    PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY  as  MATERIAL_BY_KEY,
    PainterlyNPR__MaterialClasses__MATERIAL_SLOTS   as  MATERIAL_SLOTS,
} from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__Shaders__GLSL_COMMON as GLSL_COMMON } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';

// =============================================================================
// REGION | Layer Stack - Watercolour Shader
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the watercolour washes
    // ------------------------------------------------------------
    // Paper x the product of each layer's transmittance to the power of its density
    // (manifest section 08). The base wash takes its recipe from the material
    // class; the shadow glaze lies over it in a cool, granulating neutral; the sky
    // is reserved paper cut by clouds, pale near the roofline. Every edge reads
    // the jump-flood distance: pooling just inside a hard drying edge, a feather on
    // a wet one, white slivers where the wash withdrew from the line. And what lies
    // ACROSS the edge matters: a wash running under soft foliage barely pools, and
    // the sky keeps a pale halo from near architecture but runs wet into far trees.
    const FS_WATERCOLOUR = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        ${GLSL_COMMON}
        uniform sampler2D uRegion; uniform sampler2D uSeeds; uniform sampler2D uData; uniform sampler2D uWorld; uniform sampler2D uPaper; uniform sampler2D uField;
        uniform float uPxPerMm;
        uniform vec3 uPaperTone;
        uniform vec4 uRecA[${MATERIAL_SLOTS}]; uniform vec4 uRecB[${MATERIAL_SLOTS}]; uniform vec4 uRecC[${MATERIAL_SLOTS}]; uniform vec4 uRecD[${MATERIAL_SLOTS}]; uniform vec4 uRecE[${MATERIAL_SLOTS}];
        uniform float uStrength; uniform float uGranulation; uniform float uPooling; uniform float uCoffee; uniform float uWetness; uniform float uWithdraw; uniform float uShadowStrength;
        uniform vec3 uShadowPigment; uniform vec3 uSkyPigment; uniform vec3 uCloudPigment;
        uniform float uSkyStrength; uniform float uCloudAmount; uniform float uHaloMm; uniform float uHorizonPx; uniform float uDryEdge;
        uniform float uSkyRamp; uniform float uSkyScale; uniform float uGroundStripMm;
        uniform vec2 uSeedW; uniform vec2 uSeedS; uniform vec2 uSeedE; uniform vec2 uSeedC;
        uniform vec4 uFootprint;
        uniform int uGlassId; uniform int uLawnId; uniform int uPavingId; uniform int uRoofId;
        uniform int uDistantId; uniform int uMidTreesId; uniform float uDistantUnfade; uniform float uDistantLoose; uniform float uDistantColour; uniform float uDistantWalk; uniform vec3 uDistantPigA; uniform vec3 uDistantPigB;
        uniform vec2 uRoofGrade; uniform vec2 uAerial;
        uniform sampler2D uAccent;
        uniform vec3 uFlowerRose; uniform vec3 uFlowerLavender; uniform vec3 uFlowerCream;
        uniform sampler2D uAccent2; uniform vec3 uFlowerCalendula; uniform vec3 uFlowerCornflower;
        uniform sampler2D uMarker; uniform vec3 uMarkerPigment; uniform int uDoorId; uniform int uSashId;
        layout(location = 0) out vec4 oWash;
        layout(location = 1) out vec4 oBase;     // the same washes without the embellishments laid over them - flowers, picked units, shadow lines - for the Kuwahara to settle
        vec4 regionAt(vec2 px) { ivec2 s = textureSize(uRegion, 0); return texelFetch(uRegion, clamp(ivec2(px), ivec2(0), s - 1), 0); }
        // @SKY_CLOUD_READING - replaced at boot by PainterlyNPR__SkyClouds__WashSource
        void main() {
            vec2 pc = gl_FragCoord.xy;
            ivec2 ip = ivec2(pc);
            vec2 mm = pc / uPxPerMm;
            vec4 reg = texelFetch(uRegion, ip, 0);
            vec4 sd = texelFetch(uSeeds, ip, 0);
            float distBase = length(sd.xy) / uPxPerMm;
            float distShadow = length(sd.zw) / uPxPerMm;
            vec4 paper = texelFetch(uPaper, ip, 0);
            float h = paper.r;
            vec4 field = texelFetch(uField, ip, 0);
            vec4 own = texelFetch(uData, ip, 0);
            vec4 world = texelFetch(uWorld, ip, 0);
            vec2 dirB = length(sd.xy) > 0.5 ? normalize(sd.xy) : vec2(0.0);
            vec4 across = regionAt(pc + sd.xy + dirB * 1.5);

            // The sheet's presence: where the wash stops, it stops like a brush
            float presence = field.r;
            float thr = 0.12 + 0.36 * fbm(mm * 0.09 + uSeedE);
            float keep = smoothstep(thr - 0.03, thr + 0.03, presence);
            float nearEdge = 1.0 - smoothstep(0.0, 0.16, presence - thr);
            float dryBits = smoothstep(0.38, 0.52, h + 0.32 * (vnoise(mm * 1.9 + uSeedE) - 0.5) + 0.25 * (1.0 - nearEdge));
            keep *= mix(1.0, dryBits, nearEdge * uDryEdge);
            float gradP = length(vec2(dFdx(presence), dFdy(presence))) * uPxPerMm;
            float distP = max(presence - thr, 0.0) / max(gradP, 0.002);
            float presPool = exp(-distP / 0.5) * smoothstep(0.35, 0.6, fbm(mm * 0.05 + uSeedE + 3.0));

            vec3 T = vec3(1.0);
            float total = 0.0;
            vec3 TB = vec3(1.0);                                              // the base: the main watercolour alone, before the embellishments
            float totalB = 0.0;
            bool hasBase = false;
            int m = int(reg.y + 0.5);

            if (reg.x < -0.5) {
                if (pc.y > uHorizonPx) {
                    float H = float(textureSize(uRegion, 0).y);
                    float g = smoothstep(uHorizonPx, uHorizonPx + H * uSkyRamp, pc.y);
                    float d = uSkyStrength * uSkyScale * mix(0.16, 1.0, pow(g, 0.8));
                    // The clouds: the volume's masses read as watercolour when the modules
                    // loaded (63, 60), else v0.1.0's painted clouds - one function either way.
                    // Calm round near architecture: contrast biased away from the roofline
                    float calm = (across.x > -0.5 && across.w < 80.0) ? 1.0 - smoothstep(3.0, 16.0, distBase) : 0.0;
                    vec4 clouds = PainterlyNPR_SkyCloudReading(pc, mm, calm);
                    // The blue is a wash with the sky's own recipe, as every region's is: two
                    // blues wet-in-wet, mottled along level strokes, granulating in the valleys
                    vec4 sA = uRecA[${MATERIAL_BY_KEY.Sky.Id}]; vec4 sB = uRecB[${MATERIAL_BY_KEY.Sky.Id}]; vec4 sC = uRecC[${MATERIAL_BY_KEY.Sky.Id}];
                    vec2 sFlow = mix(vec2(1.0), vec2(0.35, 2.4), sC.z);
                    vec2 sBrush = mat2(0.998, -0.06, 0.06, 0.998) * mm;              // laid level, a touch off the axis
                    float sMot1 = fbm(sBrush * sC.y * sFlow + uSeedW + 50.0);
                    float sMot2 = fbm(sBrush * sC.y * 2.9 * sFlow + uSeedW + 69.0);
                    d *= max(0.0, 1.0 + sC.x * ((sMot1 - 0.5) * 2.2 + (sMot2 - 0.5) * 0.9));
                    vec3 skyPig = mix(sA.rgb, sB.rgb, clamp(0.5 + (fbm(mm * 0.03 + uSeedW * 0.7 + 83.0) - 0.5) * 3.0 * sB.w, 0.0, 1.0));
                    d *= 1.0 - (1.0 - clouds.x) * uCloudAmount;
                    d *= 1.0 + clouds.z * uPooling;                                  // <-- pooled where it dried against a cut edge, tide lines where it ran back
                    float skySpecks = smoothstep(0.6, 0.9, vnoise(mm * 1.5 + uSeedC)) * smoothstep(0.42, 0.68, 1.0 - h);
                    d *= 1.0 + 0.22 * (0.5 - h) + sC.w * uGranulation * (1.3 * skySpecks - 0.08);
                    // Round near architecture the sky stops short with a crisp, slightly
                    // pooled edge; into trees, near or far, it runs wet, with no gap at all -
                    // a soft-edged neighbour is never haloed, or every canopy looks cut out
                    float acrossNear = (across.x > -0.5 && across.w < 80.0 && uRecD[int(across.y + 0.5)].z < 0.3) ? 1.0 : 0.0;
                    float halo = uHaloMm * (0.4 + 1.2 * fbm(mm * 0.08 + uSeedC + 9.0));
                    float haloPool = exp(-max(distBase - halo, 0.0) / 0.45) * 0.8 * uPooling;
                    d *= mix(1.0, smoothstep(halo, halo + 0.35, distBase) * (1.0 + haloPool), acrossNear);
                    d *= keep * (1.0 + presPool * 0.5);
                    T *= pow(skyPig, vec3(max(d, 0.0)));
                    // The undersides: ultramarine and light red dropped into the damp sky - two
                    // greys wet-in-wet, granulating harder than the blue
                    vec3 greyPig = mix(uCloudPigment, uShadowPigment, clamp(0.08 + (fbm(mm * 0.05 + uSeedC + 23.0) - 0.5) * 0.9, 0.0, 0.4));
                    float greySpecks = smoothstep(0.56, 0.88, vnoise(mm * 1.7 + uSeedC + 5.0)) * smoothstep(0.42, 0.68, 1.0 - h);
                    float grey = clouds.y * uCloudAmount * keep * uSkyStrength;
                    grey *= max(0.0, 1.0 + 0.22 * (0.5 - h) + uGranulation * (1.1 * greySpecks - 0.06));
                    T *= pow(greyPig, vec3(grey));
                    total += d + grey;
                } else if (uGroundStripMm > 0.0) {
                    // An elevation's ground: a strip of wash under the ground line, fading down
                    float below = (uHorizonPx - pc.y) / uPxPerMm;
                    vec4 L = uRecA[uLawnId];
                    float d = L.w * uStrength * 0.8 * (1.0 - smoothstep(0.0, uGroundStripMm * (0.6 + 0.8 * fbm(mm * 0.06 + uSeedW + 31.0)), below));
                    d *= 1.0 + 0.22 * (0.5 - h) + 0.5 * (fbm(mm * vec2(0.03, 0.2) + uSeedW + 61.0) - 0.5);
                    d *= keep;
                    T *= pow(mix(L.rgb, uRecB[uLawnId].rgb, 0.4), vec3(max(d, 0.0)));
                    total += d;
                }
            } else {
                vec4 A = uRecA[m]; vec4 B = uRecB[m]; vec4 C = uRecC[m]; vec4 D = uRecD[m]; vec4 E = uRecE[m];
                vec2 objOff = vec2(reg.x * 17.13, reg.x * 9.71);
                vec2 flow = mix(vec2(1.0), vec2(0.35, 2.4), C.z);
                vec2 brush = mat2(0.99, -0.14, 0.14, 0.99) * mm;              // the brush runs a few degrees off level, never exactly along an axis
                float mot1 = fbm(brush * C.y * flow + objOff + uSeedW);
                float mot2 = fbm(brush * C.y * 2.9 * flow + objOff * 1.3 + uSeedW + 19.0);
                float d = A.w * uStrength;
                d *= max(0.0, 1.0 + C.x * ((mot1 - 0.5) * 2.2 + (mot2 - 0.5) * 0.9));
                float mixN = fbm(mm * 0.045 + objOff + uSeedW * 0.7 + 3.0);
                vec3 pig = mix(A.rgb, B.rgb, clamp(0.5 + (mixN - 0.5) * 3.0 * B.w, 0.0, 1.0));
                bool distant = m == uDistantId || m == uMidTreesId;                // the distant trees (Pen -> 7 · Distant trees): the middle distance and the far belt
                if (distant) pig = mix(pig, mix(uDistantPigA, uDistantPigB, clamp(0.5 + (mixN - 0.5) * 3.0 * B.w, 0.0, 1.0)), uDistantWalk);   // Colour walks each from its own recipe
                // Paper texture shows through every wash a little: valleys hold more water.
                // Granulation is ADDED pigment - dark flecks clumped in the valleys - never
                // pigment taken off the peaks, which reads as a stipple of white dots.
                float specks = smoothstep(0.58, 0.90, vnoise(mm * 1.6 + objOff + uSeedW)) * smoothstep(0.42, 0.68, 1.0 - h);
                d *= 1.0 + 0.22 * (0.5 - h) + C.w * uGranulation * (1.3 * specks - 0.08);
                // The distant trees laid loose, as a painter lays them: brush-loads of
                // uneven strength lying along them, the brush's own marks, a back-run
                // dried to a hard rim, the wash dried dark at its edge and broken dry
                // toward it, more grain. Looseness 0 leaves the smooth wash they had
                if (distant && uDistantLoose > 0.0) {
                    float L = uDistantLoose, Lc = min(L, 1.0);
                    float loads = fbm(brush * vec2(0.05, 0.12) + objOff + uSeedW + 71.0);
                    d *= mix(1.0, 0.62 + 0.85 * smoothstep(0.30, 0.72, loads), Lc);
                    float streak = fbm(brush * vec2(0.55, 2.6) + objOff + uSeedW + 77.0);
                    d *= 1.0 + 0.45 * L * (streak - 0.5);
                    float backRun = fbm(mm * 0.075 + objOff + uSeedW + 83.0);
                    d *= (1.0 - 0.22 * L * smoothstep(0.55, 0.57, backRun)) * (1.0 + 1.1 * L * exp(-abs(backRun - 0.56) / 0.008));
                    d *= 1.0 + 0.55 * L * exp(-distBase / 0.45);
                    float dry = (1.0 - smoothstep(0.4, 1.8, distBase)) * smoothstep(0.62, 0.8, vnoise(mm * vec2(0.7, 0.3) + objOff + uSeedW + 91.0));
                    d *= 1.0 - 0.85 * Lc * dry;
                    d *= 1.0 + 0.6 * L * (1.3 * specks - 0.08);
                }
                // The accent layer, read a fraction of a millimetre off true so its edges
                // rag like a brush's: a picked brick or tile deepens this wash toward the
                // material's second pigment; under a flower the green is lifted almost to
                // the paper - as a painter leaves a flower's place - so its colour, glazed
                // on below, reads clean and never muddies to brown
                vec2 aw = (vec2(vnoise(mm * 2.2 + objOff + 3.0), vnoise(mm * 2.2 + objOff + 7.0)) - 0.5) * 0.36 * uPxPerMm;
                vec4 acc = texture(uAccent, (pc + aw) / vec2(textureSize(uAccent, 0)));
                vec4 acc2 = texture(uAccent2, (pc + aw) / vec2(textureSize(uAccent2, 0)));
                float pick = acc.r * (0.7 + 0.6 * vnoise(mm * 0.9 + objOff + 11.0));
                float bloom = max(max(acc.g, max(acc.b, acc.a)), max(acc2.r, max(acc2.g, acc2.b)));
                d *= (1.0 + 1.3 * pick) * (1.0 - 0.85 * bloom);
                d *= 1.0 - 0.9 * smoothstep(0.2, 0.65, acc2.g);                  // <-- A white flower is the paper itself: its heart lifted clean
                vec3 pigB = pig;                                                  // the base's pigment: no picked unit deepening it
                pig = mix(pig, B.rgb * vec3(0.9, 0.86, 0.9), clamp(pick * 0.7, 0.0, 1.0));
                bool ownIsChosen = abs(own.y - reg.x) < 0.5;
                float lit = ownIsChosen ? own.w : 0.6;
                d *= 1.0 - E.x * smoothstep(0.30, 0.70, lit) * smoothstep(0.42, 0.62, fbm(mm * 0.06 + objOff + uSeedW + 7.0));
                float soft = D.z * uWetness;
                if (distant) soft *= 1.0 - 0.7 * min(uDistantLoose, 1.0);         // painted shapes, not a blur: loose distant trees dry harder at the edge
                float hardness = 1.0 - smoothstep(0.15, 0.6, soft);
                float acrossSoft = across.x > -0.5 ? uRecD[int(across.y + 0.5)].z : 0.0;
                float poolGate = hardness * (acrossSoft > 0.3 ? 0.3 : 1.0);
                float poolN = 0.25 + 1.5 * smoothstep(0.3, 0.7, fbm(mm * 0.06 + objOff + uSeedS + 11.0));
                float pool = D.x * uPooling * exp(-distBase / max(D.y, 0.05)) * poolN * poolGate;
                float tideN = smoothstep(0.55, 0.7, fbm(mm * 0.04 + objOff + 23.0));
                float tideZ = (distBase - D.y * 3.0) / (D.y * 0.7);
                float tide = D.x * uPooling * 0.4 * poolGate * tideN * exp(-tideZ * tideZ);
                d *= 1.0 + pool + tide;
                d *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, max(soft, 0.05), distBase)), smoothstep(0.0, 0.25, soft));   // a wet edge halves at the boundary; the neighbour takes the other half
                float wd = D.w * uWithdraw * 0.55 * smoothstep(0.45, 0.7, vnoise(mm * 0.16 + objOff + uSeedE)) * (0.5 + h);
                d *= smoothstep(wd, wd + 0.18, distBase);
                if (distant && uDistantLoose > 0.0) { float rag = 1.6 * uDistantLoose * smoothstep(0.4, 0.85, vnoise(mm * vec2(0.45, 0.16) + objOff + 97.0)); d *= smoothstep(rag, rag + 0.3, distBase); }   // a broken edge: the wash stops short of the line in places
                // The coffee ring: a puddle of wash, drying, carries its pigment out to its
                // pinned edge - a crisp dark rim just where the paint stops (past the white
                // sliver), a starved, paler band inside it, and, turned up, the ghosts of
                // earlier edges where the puddle paused as it shrank. Hard, drying edges
                // only - a wet edge has nothing to pin it - strongest in the heavy pooling
                // pigments, and uneven along its length, as a real ring is
                // A ring needs a puddle: a sliver too narrow to pool - a frame, a bar, a
                // picket's shadow - cannot ring, or the rim would fill it. Probed a
                // millimetre each way, inside this wash only
                float reach = 0.0, sReach = 0.0;
                for (int k = 0; k < 4; k++) {
                    vec2 o  = (k == 0 ? vec2(1.0, 0.0) : k == 1 ? vec2(-1.0, 0.0) : k == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0)) * uPxPerMm;
                    ivec2 q = ivec2(clamp(pc + o, vec2(0.0), vec2(textureSize(uRegion, 0) - 1)));
                    vec4 rq = texelFetch(uRegion, q, 0);
                    if (abs(rq.x - reg.x) > 0.5) continue;
                    vec4 sq = texelFetch(uSeeds, q, 0);
                    reach   = max(reach, length(sq.xy) / uPxPerMm);
                    if (rq.z > 0.5) sReach = max(sReach, length(sq.zw) / uPxPerMm);
                }
                float puddle  = smoothstep(0.35, 0.8, reach - distBase);
                float sPuddle = smoothstep(0.35, 0.8, sReach - distShadow);
                float ringN   = fbm(mm * 0.07 + objOff + uSeedS + 29.0);
                float ringK   = (0.45 + 0.55 * D.x) * poolGate * puddle * (0.35 + 1.3 * smoothstep(0.3, 0.72, ringN));
                float inside  = max(distBase - wd - 0.04, 0.0);                          // <-- mm in from where the paint stops
                float rimW    = 0.13 + 0.14 * fbm(mm * 0.21 + objOff + 37.0);
                float rim     = exp(-pow(inside / rimW, 1.6));
                float starve  = smoothstep(rimW * 0.8, rimW * 2.4, inside) * (1.0 - smoothstep(1.4, 3.6, inside));
                float gap     = 1.6 + 1.6 * fbm(mm * 0.05 + objOff + 43.0);                // <-- mm the puddle shrank between pauses
                float g1 = (inside - gap) / 0.11, g2 = (inside - 2.1 * gap) / 0.11;
                float ghost   = exp(-g1 * g1) + 0.6 * exp(-g2 * g2);
                d *= max(0.0, 1.0 + uCoffee * ringK * 1.6 * rim - min(0.55, uCoffee * ringK * 0.3) * starve + smoothstep(0.8, 2.2, uCoffee) * ringK * 0.7 * ghost);
                // Dry brush: the brush skims the peaks and leaves the valleys white - in
                // streaks along the stroke and toward the wash's edge, where it runs dry
                float edgeZone = 1.0 - smoothstep(0.4, 1.6, distBase);
                float dryB = E.z * (0.3 + 0.7 * edgeZone) * smoothstep(0.42, 0.70, fbm(mm * vec2(0.09, 0.45) + objOff + 41.0));
                d *= mix(1.0, smoothstep(0.36, 0.52, h + 0.2 * (vnoise(mm * 2.3 + objOff) - 0.5)), dryB);
                if (m == uGlassId && ownIsChosen) {
                    // Darker toward the head - the soffit and the room within. No glints:
                    // the glass's accent is the shadow lines below
                    d *= 0.55 + 0.85 * smoothstep(0.8, 2.35, world.y);
                }
                if (m == uRoofId && ownIsChosen) {
                    d *= 0.78 + 0.4 * (1.0 - smoothstep(uRoofGrade.x, uRoofGrade.y, world.y));   // a graded wash: deeper toward the eaves, light at the ridge
                }
                if ((m == uLawnId || m == uPavingId) && ownIsChosen) {
                    vec2 outside = max(abs(world.xz) - uFootprint.xy, 0.0);
                    d *= 1.0 + uFootprint.z * exp(-length(outside) / 0.35);
                }
                float far = E.w * smoothstep(uAerial.x, uAerial.y, reg.w);
                if (distant) far *= 1.0 - uDistantUnfade;                          // Unfade takes back the aerial perspective's paling and blueing
                d *= 1.0 - 0.65 * far;
                pig = mix(pig, uSkyPigment, 0.45 * far);
                pigB = mix(pigB, uSkyPigment, 0.45 * far);
                d *= keep * (1.0 + presPool * 0.6 * hardness);
                T *= pow(pig, vec3(max(d, 0.0)));
                total += d;
                // The base: the same density with the accent layer's work taken back out
                // (every step after it multiplies, so dividing undoes it) - no picked unit
                // deepening it, no flower's place lifted
                float dB = d / max((1.0 + 1.3 * pick) * (1.0 - 0.85 * bloom) * (1.0 - 0.9 * smoothstep(0.2, 0.65, acc2.g)), 1e-4);
                TB *= pow(pigB, vec3(max(dB, 0.0)));
                totalB += dB;
                hasBase = true;

                if (reg.z > 0.5) {
                    float s = uShadowStrength * E.y;
                    s *= max(0.0, 1.0 + 0.7 * (fbm(mm * 0.05 + uSeedS) - 0.5) * 2.0);
                    float sSpecks = smoothstep(0.58, 0.90, vnoise(mm * 1.7 + uSeedS + 5.0)) * smoothstep(0.42, 0.68, 1.0 - h);
                    s *= 1.0 + 0.22 * (0.5 - h) + uGranulation * (0.9 * sSpecks - 0.06);
                    s *= 1.0 + 0.9 * uPooling * exp(-distShadow / 0.4) * (0.3 + 1.4 * smoothstep(0.3, 0.7, fbm(mm * 0.08 + uSeedS + 7.0))) * hardness;
                    float swd = uWithdraw * 0.35 * smoothstep(0.5, 0.75, vnoise(mm * 0.2 + uSeedS + 3.0));
                    s *= smoothstep(swd, swd + 0.18, distShadow);
                    // The glaze rings at its own edge too, a little less
                    float sIn = max(distShadow - swd - 0.04, 0.0);
                    float sK  = uCoffee * hardness * sPuddle * (0.35 + 1.3 * smoothstep(0.3, 0.72, ringN));
                    s *= max(0.0, 1.0 + sK * 1.3 * exp(-pow(sIn / 0.2, 1.6)) - min(0.45, sK * 0.25) * smoothstep(0.2, 0.6, sIn) * (1.0 - smoothstep(1.2, 3.0, sIn)));
                    s *= mix(1.0, smoothstep(0.0, max(soft * 0.8, 0.05), distShadow), smoothstep(0.0, 0.25, soft));
                    s *= (1.0 - 0.5 * far) * keep * (1.0 - 0.6 * bloom);
                    vec3 sPig = uShadowPigment;
                    if (distant) { s *= 1.0 - 0.5 * uDistantUnfade; sPig = mix(uShadowPigment, uDistantPigB * vec3(0.72, 0.8, 0.76), min(1.0, 2.0 * uDistantColour)); }   // distant trees' shade: their own green deepened, not the sky's blue
                    T *= pow(sPig, vec3(max(s, 0.0)));
                    total += s;
                    float sB = s / (1.0 - 0.6 * bloom);                           // the base's glaze: not thinned for a flower
                    TB *= pow(sPig, vec3(max(sB, 0.0)));
                    totalB += sB;
                }

                // Shadow lines: a cool marker stroke on the glass beside each reveal and
                // glazing bar, on the side away from the sun. Flat and hard-edged as a
                // marker is, its edge ragged by a twentieth of a millimetre, a touch
                // streaky along the stroke. Glass, an external door's leaf, and a
                // casement's frame where the reveal's shadow falls on it
                if ((m == uGlassId || m == uDoorId || m == uSashId) && ownIsChosen) {
                    vec2 mw = (vec2(vnoise(mm * 3.0 + 5.0), vnoise(mm * 3.0 + 9.0)) - 0.5) * 0.1 * uPxPerMm;
                    float mk = texture(uMarker, (pc + mw) / vec2(textureSize(uMarker, 0))).r * 2.0;
                    mk *= 0.86 + 0.28 * vnoise(vec2(mm.x * 5.0, mm.y * 0.4) + 13.0);
                    mk *= keep * (1.0 - 0.5 * far);
                    T *= pow(uMarkerPigment, vec3(mk));
                    total += mk;
                }

                // Flowers dropped into the foliage: small glazes of colour
                T *= pow(uFlowerRose, vec3(acc.g * 1.25 * keep));
                T *= pow(uFlowerLavender, vec3(acc.b * 1.2 * keep));
                T *= pow(uFlowerCream, vec3(acc.a * 1.1 * keep));
                total += (acc.g + acc.b + acc.a) * keep;
                T *= pow(uFlowerCalendula, vec3(acc2.r * 1.2 * keep));
                T *= pow(uFlowerCornflower, vec3(acc2.b * 1.15 * keep));
                total += (acc2.r + acc2.b) * keep;                                // <-- acc2.g, a white flower: lifted, nothing laid in
            }

            if (!hasBase) { TB = T; totalB = total; }                         // the sky and a ground strip carry no embellishments

            // Wet-in-wet across a soft edge: a soft neighbour's pigment bleeds over the
            // boundary and fades, meeting its own halved edge - a blend, never a white halo
            float acrossSoftMm = across.x > -0.5 ? uRecD[int(across.y + 0.5)].z * uWetness : 0.0;
            if (m == uDistantId || m == uMidTreesId || (across.x > -0.5 && (int(across.y + 0.5) == uDistantId || int(across.y + 0.5) == uMidTreesId))) acrossSoftMm *= 1.0 - 0.8 * min(uDistantLoose, 1.0);   // loose distant trees dry apart: no wet blur either way
            if (acrossSoftMm > 0.3) {
                vec4 nA = uRecA[int(across.y + 0.5)];
                float bleed = nA.w * uStrength * 0.5 * (1.0 - smoothstep(0.0, acrossSoftMm, distBase)) * keep;
                T *= pow(nA.rgb, vec3(bleed));
                total += bleed;
                TB *= pow(nA.rgb, vec3(bleed));
                totalB += bleed;
            }
            // Below 0.3 Strength takes ALL the paint off - sky, glazes, accents and
            // marker too - down to bare paper at 0. From 0.3 up nothing changes
            float lift = smoothstep(0.0, 0.3, uStrength);
            oWash = vec4(uPaperTone * mix(vec3(1.0), T, lift), total * lift);
            oBase = vec4(uPaperTone * mix(vec3(1.0), TB, lift), totalB * lift);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        FS_WATERCOLOUR  as  PainterlyNPR__Watercolour__FS_WATERCOLOUR,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
