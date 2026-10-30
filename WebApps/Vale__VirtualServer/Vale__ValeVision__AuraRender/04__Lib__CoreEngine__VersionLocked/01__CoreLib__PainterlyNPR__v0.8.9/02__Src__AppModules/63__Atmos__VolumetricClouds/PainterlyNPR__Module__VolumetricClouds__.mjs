/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | VOLUMETRIC CLOUDS
   =============================================================================

   FILE       : PainterlyNPR__Module__VolumetricClouds__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - VolumetricClouds
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A cloud volume in the world, lit by the scene's sun, rendered into a
                small buffer the sky's painting reads - the truth the wash interprets
   CREATED    : 29-Oct-2026

   DESCRIPTION:
   - Create(gl) once per context; Render(frame) whenever the sky, the sun or the
     camera changes. Render returns the cloud buffer: a half-resolution texture whose
     channels are set out in the Shaders part (transmittance; lit, height and
     distance, each premultiplied by coverage).
   - A frame is a view and a setting, nothing of the host's: the eye in metres, a
     ray basis, the sun's direction, a seed, and a cloud setting (a type and any
     overrides - see the Settings part and Na__VolumetricClouds__Config.json).
   - SkyView turns an ordinary camera into that ray basis, and gives an orthographic
     elevation a perspective sky: an elevation's parallel rays never climb a
     kilometre, so it borrows a level view from eye height whose horizon sits on the
     elevation's ground line.
   - The buffer is truth, not paint. The watercolour reading - reserved paper, soft
     masses, limited grey-blue undersides (manifest section 09) - is the CloudPaint
     chunk's, in 60__Atmos__SkyAndClouds.

   ---------------------------------------------------------------------------

   WHY A VOLUME AT ALL, WHEN THE MANIFEST WARNS AGAINST LITERAL 3D CLOUDS

   Section 09 asks for cloud masses shaped like clouds, lit from the side the sun is
   on, smaller and flatter toward the horizon, stable when the camera moves - and
   for reserved paper and soft washes, not rendered vapour. Flat noise gets the
   washes but none of the rest: its clouds do not turn with the camera, do not shade
   from the sun, do not shrink into the distance. A small volume gets all of it, and
   at half resolution with baked noise it costs tens of milliseconds, only when the
   sky, the sun or the view changes. What it renders is never shown: the painting
   reads it.

   ============================================================================= */

import {
    PainterlyNPR__CloudSettings__Resolve,
    PainterlyNPR__CloudSettings__Presets,
    PainterlyNPR__CloudSettings__Preset,
    PainterlyNPR__CloudSettings__Range,
    PainterlyNPR__CloudSettings__Config,
    PainterlyNPR__CloudSettings__Key,
} from './PainterlyNPR__VolumetricClouds__Settings__.mjs';
import { PainterlyNPR__NoiseVolumes__Bake } from './PainterlyNPR__VolumetricClouds__NoiseVolumes__.mjs';
import { PainterlyNPR__CloudShaders__March, PainterlyNPR__CloudShaders__Soften } from './PainterlyNPR__VolumetricClouds__Shaders__.mjs';
import {
    PainterlyNPR__CloudGpu__Program,
    PainterlyNPR__CloudGpu__Target,
    PainterlyNPR__CloudGpu__Draw,
    PainterlyNPR__CloudGpu__Settle,
    PainterlyNPR__CloudGpu__Free,
    PainterlyNPR__CloudGpu__FullscreenVertex,
} from './PainterlyNPR__VolumetricClouds__Gpu__.mjs';

export {
    PainterlyNPR__CloudSettings__Resolve,
    PainterlyNPR__CloudSettings__Presets,
    PainterlyNPR__CloudSettings__Preset,
    PainterlyNPR__CloudSettings__Range,
    PainterlyNPR__CloudSettings__Key,
};

// =============================================================================
// REGION | Volumetric Clouds
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Version and the Buffer's Contract
    // ------------------------------------------------------------
    export const PainterlyNPR__VolumetricClouds__Version  =  '1.0.0';
    export const PainterlyNPR__VolumetricClouds__Buffer   =  Object.freeze({
        X  :  'Transmittance: 1 clear sky, 0 opaque cloud',
        Y  :  'Lit x coverage: the share of sunlight reaching the cloud seen, 0 deep shade, 1 sunlit',
        Z  :  'Height in the layer x coverage: 0 base, 1 top',
        W  :  'Distance in km x coverage',
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Vector Maths
// -----------------------------------------------------------------------------

    // FUNCTION | Three-Vector Helpers - private, so the module needs no maths library
    // ------------------------------------------------------------
    const V3Sub   =  (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const V3Cross =  (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const V3Norm  =  (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    // ------------------------------------------------------------


    // FUNCTION | A 32-bit Seed to a Fraction and an Offset in Kilometres
    // ------------------------------------------------------------
    // The shape field slides by up to 400 km under a new seed: far beyond any tile,
    // so a new seed is a new sky, never the old one nudged.
    function PainterlyNPR__VolumetricClouds__SeedParts(seed) {
        let h  =  (seed >>> 0) ^ 0x9E3779B9;
        const next  =  () => { h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0; return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
        return { Fraction: next(), Offset: [next() * 400 - 200, next() * 400 - 200] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sky View
// -----------------------------------------------------------------------------

    // FUNCTION | A Camera to a Sky View - the ray basis the march takes
    // ------------------------------------------------------------
    // camera: { Eye: [x, y, z] m, Target: [x, y, z] m (or Forward), FovYDeg, Aspect,
    // Ortho, HorizonV (where an orthographic view's ground line sits, 0 bottom to 1
    // top), Lift (optional) }. World y is up. A perspective camera is used as it is;
    // an orthographic one is replaced by a level view from eye height.
    //
    // LIFT is the painter's licence: a view of a building from forty metres sees six
    // degrees of sky, where cumulus are a far, edge-on band. A lift multiplies how
    // steeply each sky pixel looks up - the horizon stays where it is - so the band
    // shows clouds seen from below, apart, as a painter composes them. The building
    // is never touched: only the sky's reading.
    export function PainterlyNPR__VolumetricClouds__SkyView(camera) {
        const config   =  PainterlyNPR__CloudSettings__Config();
        let forward    =  camera.Forward ? V3Norm(camera.Forward) : V3Norm(V3Sub(camera.Target, camera.Eye));
        let eye        =  camera.Eye.slice(0, 3);
        let tanY       =  Math.tan((camera.FovYDeg || 30) * Math.PI / 360);
        let centreV    =  0.5;
        let lift       =  config.PerspectiveSky.Lift;
        if (camera.Ortho) {
            const sky  =  config.ElevationSky;
            forward    =  V3Norm([forward[0], 0, forward[2]]);
            eye        =  [eye[0], sky.EyeHeightM, eye[2]];
            centreV    =  Math.min(0.95, Math.max(0.0, camera.HorizonV == null ? 0.3 : camera.HorizonV));
            tanY       =  Math.tan(sky.TopDeg * Math.PI / 180) / (2 * (1 - centreV));
            lift       =  sky.Lift;
        }
        if (Number.isFinite(camera.Lift)) lift = camera.Lift;
        const right  =  V3Norm(V3Cross(forward, [0, 1, 0]));
        const up     =  V3Cross(right, forward);
        return { Eye: eye, Forward: forward, Right: right, Up: up, TanX: tanY * (camera.Aspect || 1.5), TanY: tanY, CentreV: centreV, Lift: Math.max(1, lift) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Create and Render
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Module on a WebGL 2 Context
    // ------------------------------------------------------------
    // Bakes the noise volumes and compiles the march for the config's quality. The
    // returned object is the module's whole surface: Render, Texture, Dispose.
    export function PainterlyNPR__VolumetricClouds__Create(gl, options) {
        if (!gl || typeof gl.texImage3D !== 'function') throw new Error('Volumetric clouds need a WebGL 2 context.');
        const quality  =  Object.assign({}, PainterlyNPR__CloudSettings__Config().Quality, (options && options.Quality) || {});
        const volumes  =  PainterlyNPR__NoiseVolumes__Bake(gl, quality.ShapeSize, quality.DetailSize);
        const march    =  PainterlyNPR__CloudGpu__Program(gl, 'Cloud march', PainterlyNPR__CloudGpu__FullscreenVertex, PainterlyNPR__CloudShaders__March(quality.Steps, quality.LightSteps, quality.ShapeSize));
        const soften   =  PainterlyNPR__CloudGpu__Program(gl, 'Cloud soften', PainterlyNPR__CloudGpu__FullscreenVertex, PainterlyNPR__CloudShaders__Soften);
        const vao      =  gl.createVertexArray();
        const state    =  { A: null, B: null, Last: null, Disposed: false };

        const size  =  (w, h) => {
            if (state.A && state.A.Width === w && state.A.Height === h) return;
            PainterlyNPR__CloudGpu__Free(gl, state.A);
            PainterlyNPR__CloudGpu__Free(gl, state.B);
            state.A  =  PainterlyNPR__CloudGpu__Target(gl, w, h);
            state.B  =  PainterlyNPR__CloudGpu__Target(gl, w, h);
        };

        // FUNCTION | Render the Cloud Buffer for One Frame
        // ------------------------------------------------------------
        // frame: { Width, Height (the host's sheet in px), View (from SkyView), Sun
        // ([x, y, z] toward the sun), Seed, Setting, Scale (optional; the config's
        // Quality.Scale otherwise) }. Returns { Texture, Width, Height, Resolved, Key }.
        const render  =  (frame) => {
            if (state.Disposed) throw new Error('Volumetric clouds: Render after Dispose.');
            const r      =  PainterlyNPR__CloudSettings__Resolve(frame.Setting);
            const scale  =  frame.Scale || quality.Scale;
            const w      =  Math.max(16, Math.round(frame.Width * scale));
            const h      =  Math.max(16, Math.round(frame.Height * scale));
            size(w, h);
            const v      =  frame.View;
            const seed   =  PainterlyNPR__VolumetricClouds__SeedParts(frame.Seed || 1);
            const sun    =  V3Norm(frame.Sun);
            PainterlyNPR__CloudGpu__Draw(gl, march, state.A.Fbo, w, h, {
                uShape       :  volumes.Shape.Texture,
                uDetail      :  volumes.Detail.Texture,
                uEye         :  [v.Eye[0] / 1000, v.Eye[1] / 1000, v.Eye[2] / 1000],
                uForward     :  v.Forward,
                uRight       :  v.Right,
                uUp          :  v.Up,
                uFrame       :  [v.TanX, v.TanY, v.CentreV, v.Lift || 1],
                uSun         :  sun,
                uLayer       :  [r.BaseKm, r.TopKm, 1 / r.ThicknessKm, r.PlanetKm],
                uShapeParams :  [r.Coverage, r.Extinction, r.Erosion, 1 / r.ShapeTileKm],
                uProfile     :  r.Profile,
                uWeather     :  [1 / r.WeatherTileKm, r.DriftKm[0], r.DriftKm[1], r.DetailRatio],
                uMarch       :  [quality.MaxMarchKm, (2 * v.TanY * (v.Lift || 1)) / h, seed.Fraction],
                uShapeOffset :  seed.Offset,
            }, vao);
            const spread  =  quality.SoftenTexels;
            PainterlyNPR__CloudGpu__Draw(gl, soften, state.B.Fbo, w, h, { uSource: state.A.Texture, uStep: [spread / w, 0] }, vao);
            PainterlyNPR__CloudGpu__Draw(gl, soften, state.A.Fbo, w, h, { uSource: state.B.Texture, uStep: [0, spread / h] }, vao);
            PainterlyNPR__CloudGpu__Settle(gl);
            state.Last  =  { Texture: state.A.Texture, Fbo: state.A.Fbo, Width: w, Height: h, HalfFloat: state.A.HalfFloat, Resolved: r, Key: PainterlyNPR__CloudSettings__Key(r) };
            return state.Last;
        };
        // ------------------------------------------------------------

        return {
            Version   :  PainterlyNPR__VolumetricClouds__Version,
            Quality   :  quality,
            BakeMs    :  volumes.Ms,
            Volumes   :  { Shape: volumes.Shape, Detail: volumes.Detail },          // <-- For diagnostics and tests: read, never write
            Render    :  render,
            get Last() { return state.Last; },
            Dispose   :  () => {
                if (state.Disposed) return;
                state.Disposed  =  true;
                volumes.Dispose();
                [march, soften, state.A, state.B].forEach(t => PainterlyNPR__CloudGpu__Free(gl, t));
                gl.deleteVertexArray(vao);
            },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
