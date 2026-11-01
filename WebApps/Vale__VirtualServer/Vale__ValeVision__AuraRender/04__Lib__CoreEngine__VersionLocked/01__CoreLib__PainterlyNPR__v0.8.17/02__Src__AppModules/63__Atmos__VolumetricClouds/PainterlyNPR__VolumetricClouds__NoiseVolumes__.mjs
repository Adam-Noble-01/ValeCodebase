/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | VOLUMETRIC CLOUDS - NOISE VOLUMES
   =============================================================================

   FILE       : PainterlyNPR__VolumetricClouds__NoiseVolumes__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - VolumetricClouds - NoiseVolumes
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The two tiling 3D noises every cloud is cut from, baked once on the
                GPU: a billowy shape volume and a finer detail volume
   CREATED    : 29-Oct-2026

   DESCRIPTION:
   - SHAPE (RGBA, ShapeSize cubed): R is Perlin-Worley - gradient noise lifted onto
     inverted Worley cells, the round billows of a cumulus; G, B, A are Worley fBm at
     three rising frequencies, which the march uses to carve the billows.
   - DETAIL (RGB, DetailSize cubed): Worley fBm at three frequencies, eroding the
     edges - wisps at a cloud's base, cauliflower at its top.
   - Both tile in all three axes: every lattice wraps at a whole number of cells
     per tile, so a volume repeats without a seam and REPEAT wrapping is exact.
   - Fixed, not seeded: the drawing's seed moves where the march samples them, so a
     new seed costs no bake and two drawings never differ by a GPU's rounding of a
     bake (manifest section 14, deterministic recall).

   ---------------------------------------------------------------------------

   WHY BAKE ON THE GPU, SLICE BY SLICE

   A 64-cubed shape volume is 262,144 texels, each four fBm sums over 27 Worley
   neighbours. In JavaScript that is a second or two at boot; drawn into the
   volume's layers by a fragment shader it is a few milliseconds. Each layer is one
   fullscreen draw into a framebuffer whose attachment is that layer.

   ============================================================================= */

import {
    PainterlyNPR__CloudGpu__Program,
    PainterlyNPR__CloudGpu__Volume,
    PainterlyNPR__CloudGpu__Draw,
    PainterlyNPR__CloudGpu__Settle,
    PainterlyNPR__CloudGpu__Free,
    PainterlyNPR__CloudGpu__FullscreenVertex,
} from './PainterlyNPR__VolumetricClouds__Gpu__.mjs';

// =============================================================================
// REGION | Volumetric Clouds - Noise Volumes
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Source
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Bake Shader - one layer of either volume
    // ------------------------------------------------------------
    // uKind 0 writes the shape volume, 1 the detail volume. A texel's position is its
    // centre in [0, 1) cubed; every noise takes whole cells per tile, so it wraps.
    // Integer % is only defined for non-negative operands in GLSL ES 3.00: the cell
    // indices are lifted by one tile before it.
    const FS_BAKE = `#version 300 es
        precision highp float;
        precision highp int;
        in vec2 vUv;
        uniform float uZ;
        uniform int uKind;
        out vec4 oNoise;

        uvec3 PainterlyNPR_Pcg3(uvec3 v) {
            v = v * 1664525u + 1013904223u;
            v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
            v ^= v >> 16u;
            v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
            return v;
        }

        vec3 PainterlyNPR_Hash3(ivec3 c, uint salt) {
            return vec3(PainterlyNPR_Pcg3(uvec3(c) + uvec3(salt, salt * 7u + 3u, salt * 13u + 11u))) * (1.0 / 4294967295.0);
        }

        float PainterlyNPR_Worley(vec3 p, int cells, uint salt) {
            vec3 q = p * float(cells);
            ivec3 base = ivec3(floor(q));
            vec3 f = q - vec3(base);
            float best = 8.0;
            for (int z = -1; z <= 1; z++)
            for (int y = -1; y <= 1; y++)
            for (int x = -1; x <= 1; x++) {
                ivec3 o = ivec3(x, y, z);
                ivec3 c = (base + o + cells) % cells;
                vec3 d = vec3(o) + PainterlyNPR_Hash3(c, salt) - f;
                best = min(best, dot(d, d));
            }
            return 1.0 - clamp(sqrt(best) * 1.15, 0.0, 1.0);
        }

        float PainterlyNPR_WorleyFbm(vec3 p, int cells, uint salt) {
            return PainterlyNPR_Worley(p, cells, salt) * 0.625
                 + PainterlyNPR_Worley(p, cells * 2, salt + 1u) * 0.25
                 + PainterlyNPR_Worley(p, cells * 4, salt + 2u) * 0.125;
        }

        float PainterlyNPR_Corner(ivec3 i0, ivec3 o, int period, vec3 f, uint salt) {
            ivec3 c = (i0 + o + period) % period;
            vec3 g = normalize(PainterlyNPR_Hash3(c, salt) * 2.0 - 1.0 + vec3(1e-4));
            return dot(g, f - vec3(o));
        }

        float PainterlyNPR_Perlin(vec3 p, int period, uint salt) {
            vec3 q = p * float(period);
            ivec3 i0 = ivec3(floor(q));
            vec3 f = q - vec3(i0);
            vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            float n000 = PainterlyNPR_Corner(i0, ivec3(0, 0, 0), period, f, salt);
            float n100 = PainterlyNPR_Corner(i0, ivec3(1, 0, 0), period, f, salt);
            float n010 = PainterlyNPR_Corner(i0, ivec3(0, 1, 0), period, f, salt);
            float n110 = PainterlyNPR_Corner(i0, ivec3(1, 1, 0), period, f, salt);
            float n001 = PainterlyNPR_Corner(i0, ivec3(0, 0, 1), period, f, salt);
            float n101 = PainterlyNPR_Corner(i0, ivec3(1, 0, 1), period, f, salt);
            float n011 = PainterlyNPR_Corner(i0, ivec3(0, 1, 1), period, f, salt);
            float n111 = PainterlyNPR_Corner(i0, ivec3(1, 1, 1), period, f, salt);
            return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
                       mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
        }

        float PainterlyNPR_PerlinFbm(vec3 p, int period, uint salt) {
            float sum = 0.0, amp = 1.0, norm = 0.0;
            for (int o = 0; o < 4; o++) {
                sum += PainterlyNPR_Perlin(p, period << o, salt + uint(o) * 5u) * amp;
                norm += amp;
                amp *= 0.5;
            }
            return clamp(0.5 + 0.9 * sum / norm, 0.0, 1.0);
        }

        void main() {
            vec3 p = vec3(vUv, uZ);
            if (uKind == 0) {
                float worley = PainterlyNPR_WorleyFbm(p, 4, 101u);
                float perlin = PainterlyNPR_PerlinFbm(p, 4, 7u);
                float perlinWorley = worley + perlin * (1.0 - worley);     // remap(perlin, 0, 1, worley, 1): billows
                oNoise = vec4(perlinWorley, worley, PainterlyNPR_WorleyFbm(p, 8, 211u), PainterlyNPR_WorleyFbm(p, 16, 307u));
            } else {
                oNoise = vec4(PainterlyNPR_WorleyFbm(p, 4, 401u), PainterlyNPR_WorleyFbm(p, 8, 503u), PainterlyNPR_WorleyFbm(p, 16, 601u), 1.0);
            }
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Baking
// -----------------------------------------------------------------------------

    // FUNCTION | Fill Every Layer of One Volume, Then Build Its Mipmaps
    // ------------------------------------------------------------
    // The mipmaps are what keep a cloud forty kilometres off from shimmering: the
    // march reads them by the footprint of a pixel at the sample's distance.
    function PainterlyNPR__NoiseVolumes__Fill(gl, program, volume, kind, fbo, vao) {
        for (let z = 0; z < volume.Size; z++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, volume.Texture, 0, z);
            PainterlyNPR__CloudGpu__Draw(gl, program, fbo, volume.Size, volume.Size, { uZ: (z + 0.5) / volume.Size, uKind: kind }, vao);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_3D, volume.Texture);
        gl.generateMipmap(gl.TEXTURE_3D);
        gl.bindTexture(gl.TEXTURE_3D, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bake Both Volumes - returns { Shape, Detail, Ms, Dispose }
    // ------------------------------------------------------------
    export function PainterlyNPR__NoiseVolumes__Bake(gl, shapeSize, detailSize) {
        const started  =  performance.now();
        const program  =  PainterlyNPR__CloudGpu__Program(gl, 'Cloud noise bake', PainterlyNPR__CloudGpu__FullscreenVertex, FS_BAKE);
        const fbo      =  gl.createFramebuffer();
        const vao      =  gl.createVertexArray();
        const shape    =  PainterlyNPR__CloudGpu__Volume(gl, shapeSize);
        const detail   =  PainterlyNPR__CloudGpu__Volume(gl, detailSize);
        try {
            PainterlyNPR__NoiseVolumes__Fill(gl, program, shape, 0, fbo, vao);
            PainterlyNPR__NoiseVolumes__Fill(gl, program, detail, 1, fbo, vao);
        } finally {
            gl.deleteFramebuffer(fbo);
            gl.deleteVertexArray(vao);
            PainterlyNPR__CloudGpu__Free(gl, program);
            PainterlyNPR__CloudGpu__Settle(gl);
        }
        return {
            Shape    :  shape,
            Detail   :  detail,
            Ms       :  performance.now() - started,                          // <-- CPU time to issue the bake; the GPU finishes it later
            Dispose  :  () => { PainterlyNPR__CloudGpu__Free(gl, shape); PainterlyNPR__CloudGpu__Free(gl, detail); },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
