# 60__Atmos__SkyAndClouds

**60-64 · Atmosphere** · real code: the CloudPaint chunk, v1.1.0 (30-Oct-2026; v1.0.0 29-Oct-2026)

The sky as procedural atmospheric composition: the painting of it, not literal 3D clouds.

**Belongs here**

- Paper foundation; a broad, desaturated sky wash, stronger high and lighter toward the horizon.
- Cloud-shaped reserved paper with limited grey-blue undersides - never raw noise.
- Contrast biased away from important roofline detail; a pale separation around the building where it reads better.

## CloudPaint - how a watercolourist paints the clouds the volume found

`PainterlyNPR__SkyAndClouds__CloudPaint__.mjs` (282 lines) and `Na__SkyAndClouds__Config.json`. A GLSL chunk a host's wash shader includes at global scope, reading the cloud buffer of `63__Atmos__VolumetricClouds` - best its masses, simplified first by `57__Wash__KuwaharaFilter`. For a sky pixel, `PainterlyNPR_CloudPaint(uv, mm, calm, paper)` returns:

| | |
|---|---|
| x | sky wash multiplier - 0 where a cloud reserves the paper; lowered on the paper's peaks where the brush ran dry along a cut edge |
| y | grey underside density, in wash units - one or two flat washes with edges |
| z | pigment pooled in the blue: a dark rim where it dried against a cut edge, tide lines where it ran back wet |
| w | the cloud mask, for diagnostics |

`paper` is the host's paper relief at the pixel (0 valley, 1 peak). v1.0.0's three-argument call still compiles: it reads a level sheet.

- **The volume decides in world space** where masses stand and which side is lit; **the chunk decides in paper space** how edges and washes behave (manifest §09). Every distance is millimetres on the sheet, so it is a brush's edge at any export size.
- **Washes with edges, not the volume's shading** (v1.1.0). v1.0.0 cut the paper by a wide smoothstep of the buffer's soft coverage and greyed by a smooth function of its light: the render's own gradients, tinted - airbrushed. Now every pixel knows how far it is from each edge, in millimetres (the masses' gradient half a millimetre either way; a walk up and down each mass to the sky), and each edge is given a width and a behaviour, as the region washes do with their jump-flood distances.
- **Cut tops, lost bases.** A crown with sky above it is cut from dry paper, a hair wide; sides and bases are lost wet into the blue, a soft base wide (`SoftnessMm`); patches of the sky were damp when the blue went on, and soften even a crown. Far clouds soften more.
- **The blue round the paper** pools darker where it dried against a cut edge (`Pool`), runs back in tide lines a millimetre or two out (`Blooms`), and breaks on the paper's peaks where the brush ran dry (`DryEdge`).
- **Grey from each mass's own base.** One flat grey over the lower part of each mass and its side turned from the sun, a darker second in its base: measured from where that mass meets the sky below, not from the volume's height in the layer (seen from the ground, most visible cloud sits low in its layer, which greyed every cloud). Hard and pooled at the rim where it met dry paper, soft where it went into damp, now and then a bloom - a crinkled ring and a paler middle. Three columns a little apart, so the grey tapers where two clouds join.
- **Edges wander** a brush's width (`WanderMm`) and rag at the hairs (`RaggedMm`), in paper millimetres.
- **`calm`** (the host's, 0 to 1) holds clouds back where the drawing needs quiet, round a roofline.
- Uniforms come from `PainterlyNPR__CloudPaint__Uniforms(setting, texture, sheetMm, seed)` in the PainterlyNPR convention (`{ t }`, `{ v4 }`): `uCloudPaintA`-`D`. Settings (`Undersides`, `SoftnessMm`, `Reserve`, `RaggedMm`, `WanderMm`, `Pool`, `Crispness`, `Blooms`, `DryEdge`, the fade distances) resolve from the config, clamped.

## The masses - why a Kuwahara, and why on the buffer

A painter squints at a sky and settles on a few shapes before the brush is wet. The host runs `57__Wash__KuwaharaFilter` - an anisotropic Kuwahara, an instance of its own - over the cloud buffer before this chunk reads it: three passes, the radius in sheet millimetres, all four channels moving together (coverage, light and height decide; distance follows). The soft vapour settles into flat masses with edges, along their run. It never sees the picture: the manifest will not have PainterlyNPR become an engine with a Kuwahara on its output (§01), and here it only simplifies the truth the painting reads (§09: soft morphology, directional blur). On a soft buffer one pass at a small radius is only a blur; three at 5 mm settle the masses, and at a quarter of the sheet it costs about 4 ms.

**Takes** the cloud buffer (`63`), simplified by `57`; camera and art direction. **Gives** the sky layer for `50`.

**Manifest:** §09 Background Layers; Procedural Methods.

**Called by** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup` from v0.4.0, in region *Watercolour* (the masses since v0.4.6, its *Cloud masses* pass); without the modules (opened from `file://`) the experiment keeps its own painted sky. Tested by `60__Dev__WebBuildUtils/PainterlyNPR__Test__VolumetricClouds__.html`.

## Since v0.5.0 - the app

Ported from Experiment 01 (engine 0.4.10) beside the module, so the render graph calls it as the experiment did:

- `Na__SkyCloudsHost__Config.json` - The Clouds in the Render Graph - the Masses
- `PainterlyNPR__SkyClouds__Host__.mjs` - The clouds in the render graph: the volumetric module (63) made at boot, its buffer rendered, simplified into masses by the Kuwahara filter (57), and painted by the wash
