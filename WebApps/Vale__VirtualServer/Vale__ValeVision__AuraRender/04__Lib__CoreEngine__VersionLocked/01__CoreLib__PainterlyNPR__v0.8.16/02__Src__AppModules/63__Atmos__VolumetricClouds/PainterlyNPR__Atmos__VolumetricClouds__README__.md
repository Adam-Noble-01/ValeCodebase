# 63__Atmos__VolumetricClouds

**60-64 · Atmosphere** · real code, v1.0.0 (29-Oct-2026)

A cloud volume in the world, lit by the scene's sun, rendered into a small buffer the sky's painting reads. The volume is truth, not paint: it decides where cloud masses stand, which side the sun lights, how they shrink and flatten into the horizon, and holds still when the camera moves. The watercolour reading of it - reserved paper, soft masses, limited grey-blue undersides - is `60__Atmos__SkyAndClouds`'s CloudPaint chunk.

## Why a volume, when the manifest warns against literal 3D clouds

Manifest §09 wants clouds that look like clouds, lit from the sun's side, smaller and flatter toward the horizon, stable as the camera moves - painted as reserved paper and soft washes, never as rendered vapour. Flat noise gets the washes but none of the rest. A small volume gets all of it: at half the sheet's resolution with baked noise it is a few milliseconds, run only when the sky, the sun or the view changes - and nothing it renders is shown. The painting reads it (§05: truth buffers, then artistic passes).

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__Module__VolumetricClouds__.mjs` | ~250 | The entry: `Create`, `Render`, `SkyView`, the buffer's contract |
| `PainterlyNPR__VolumetricClouds__Settings__.mjs` | ~160 | Cloud types, ranges, `Resolve` (every number clamped), cache `Key` |
| `PainterlyNPR__VolumetricClouds__Shaders__.mjs` | ~220 | The march (density, weather, light) and the soften pass |
| `PainterlyNPR__VolumetricClouds__NoiseVolumes__.mjs` | ~200 | The two tiling 3D noises, baked on the GPU layer by layer |
| `PainterlyNPR__VolumetricClouds__Gpu__.mjs` | ~210 | Programs, typed uniforms, targets, volumes, a fullscreen draw |
| `Na__VolumetricClouds__Config.json` | | Quality, light, the cloud types and every range |

No file passes 600 lines. ES modules: they load only when the page is served (`Start__PainterlyNPR__Localhost__8020__.bat` at the repo root) - `file://` blocks them.

## Using it

```js
import * as Clouds from '…/63__Atmos__VolumetricClouds/PainterlyNPR__Module__VolumetricClouds__.mjs';

const clouds  =  Clouds.PainterlyNPR__VolumetricClouds__Create(gl);           // WebGL 2; bakes the noise once
const view    =  Clouds.PainterlyNPR__VolumetricClouds__SkyView({ Eye, Target, FovYDeg, Aspect, Ortho, HorizonV });
const buffer  =  clouds.Render({ Width, Height, View: view, Sun: [x, y, z], Seed, Setting: { Preset: 'FairWeather', Coverage: 0.45 } });
// buffer.Texture - half the sheet's size, RGBA16F
```

- **A frame** is a view and a setting, nothing of the host's: the eye in metres (world y up), a ray basis, the sun's direction (toward the sun), a 32-bit seed, and a cloud setting - a type and any overrides of `Coverage`, `BaseKm`, `ThicknessKm`, `ScaleKm`, `Density`, `Erosion`, `DriftKm`, `WindDeg`.
- **`SkyView`** turns a camera into the ray basis. A perspective camera keeps its basis, with a **lift** (`PerspectiveSky.Lift`, 4): a building seen from forty metres shows six degrees of sky, where cumulus are a far, edge-on band; the lift makes each sky pixel look up more steeply - the horizon stays put, the building is untouched - so the band shows clouds seen from below, apart, as a painter composes them. An **orthographic elevation**, whose parallel rays never climb a kilometre, borrows a level view from eye height with its horizon on the elevation's ground line (`ElevationSky`).
- **The context is left as a host expects it:** no framebuffer, program or vertex array bound; blending, depth and culling off.

## The buffer

Every value but the first is premultiplied by coverage (1 - x), so filtering and blurring stay true at a cloud's edge. Divide by coverage to read them.

| Channel | Holds |
|---|---|
| x | Transmittance: 1 clear sky, 0 opaque cloud |
| y | Lit x coverage: 0 deep shade, 1 sunlit |
| z | Height within the layer x coverage: 0 base, 1 top |
| w | Distance in km x coverage, for aerial fading |

## How the clouds are made

- **Two noises, baked once** (seed-independent, so a new seed costs no bake and no GPU's rounding of a bake can differ two drawings): a 64-cubed shape volume - Perlin-Worley billows and three Worley fBm octaves to carve them - and a 32-cubed detail volume that erodes edges into wisps at a base and cauliflower at a top. Both tile in all three axes.
- **The march** follows each ray through a cloud layer curved with the planet (6,371 km), so clouds flatten into the horizon. Weather gathers clouds into fields; billows rise within them; a per-type height profile flattens a base and rounds a top. Each noise is mapped from its measured spread (Perlin-Worley 0.58 to 0.81, Worley 0.22 to 0.59) before use, so Coverage is a threshold on a known field.
- **The light** is only what the painting reads - which side the sun reaches: *lit* is the share of sunlight arriving at the cloud the eye sees (Beer's law over two kilometres toward the sun, a weaker second extinction standing in for multiple scattering, so an interior is shaded, not black). No phase function and no sky colour: a phase function made a sunlit face read half-lit with the sun behind the viewer, and the wash throws colour away. A backlit cloud's silver lining comes free - its thin edges let the sun through. Mipmaps chosen by a pixel's footprint keep far clouds from shimmering; a two-pass Gaussian takes the march's jitter out; the last two degrees above the horizon thin into the pale sky.
- **Deterministic:** the only jitter is interleaved gradient noise of the pixel and the seed. The seed slides the shape field up to 400 km: a new seed is a new sky.

## Cloud types

`Clear`, `FairWeather` (the default), `Cumulus`, `Stratocumulus`, `HighPuffs` - in the config, each a set of numbers and a height profile.

## Tested

`60__Dev__WebBuildUtils/PainterlyNPR__Test__VolumetricClouds__.html` (served): it creates the module, checks the buffer's range, determinism, Clear against Fair weather, that the sun moves the light (the per-texel pattern, not the mean), a new seed and an elevation's sky, and paints a sky with the CloudPaint chunk. 29-Oct-2026 in the desktop app's browser pane: 8 of 8; a 750 x 500 buffer in 2.4 to 3 ms (26 ms the first time, with compilation); the noise bake under 10 ms.

## Getting it to look like clouds - what changed on the way

- **One overcast band.** From the demo's camera the sky is six degrees deep, and clouds that low are seen edge-on through tens of kilometres of layer: every ray hit cloud. The lift (above) shows them from below.
- **Overcast even looking straight up.** The baked noises sit high (Perlin-Worley 0.58 to 0.81), so Coverage passed nearly every sample. Each noise is now mapped from its measured spread first.
- **Clouds cut off at the horizon** in a hard line: the lift lets rays near 0 degrees reach the layer. They now thin out over the last two degrees.
- **Every cloud mid-grey, even front-lit.** Lit was divided by an unreachable maximum and halved by the phase function with the sun behind the viewer. It is now the share of sunlight, 0 to 1.

**Takes** a camera, the sun, the seed and a cloud setting. **Gives** the cloud buffer for `60`.

**Manifest:** §09 Background Layers, Procedural Methods; §05 Truth Buffers and Artistic Passes; §14 Deterministic Recall.

**Called by** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup` from v0.4.0: the *Volumetric clouds* pass.
