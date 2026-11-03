# 52__Wash__LayerStack

**50-59 · Watercolour paint and paper** · real code since v0.5.0

The wash recipe as an ordered stack of layers.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__ShadowLines__Config.json` - Shadow Lines
- `Na__Watercolour__Config.json` - Watercolour - the Distant Trees' Colours
- `PainterlyNPR__AccentLayer__Pass__.mjs` - The accent layer: ragged dabs of colour (flowers) and squared-off patches that fit inside a picked unit's joints (`AccentLayer__Patch`, v0.8.22), flat ribbons between two lines of points (`AccentLayer__Ribbon`, v0.8.33), blended by MAX between the base wash and the glaze. The second layer's alpha is paper left (v0.8.33): the wash and its shadow glaze lifted away, read by the wash shader as `reserved`
- `PainterlyNPR__ShadowLines__Pass__.mjs` - The illustrator's marker accent on a window: a darker stroke on the glass beside each jamb and glazing bar, on the side away from the sun
- `PainterlyNPR__Watercolour__Pass__.mjs` - The washes: material recipes packed for the shaders, the distant trees' colours, and the pass that lays every layer
- `PainterlyNPR__Watercolour__Shader__.mjs` - The watercolour washes' fragment shader: mottle, flow, granulation, pooling, tide marks, withdrawal slivers, wet and dried edges, the shadow glaze and the sky

**Belongs here**

- Base wash, shadow glaze, pigment variation, granulation, pooling and tide marks, wet-in-wet feather, dry-brush break-up, reserved white, final ink interaction.

**The paint's millimetres** (v0.8.15): the washes, the sky's gradient and the shadow lines' minimum read `PaintPxPerMm()` (`21`), not the sheet's density, so a host's smaller picture has its paint shrunk with it while the pens stay true.

**A rubble wall** (v0.8.20): the accent pass also draws `36`'s stone washes into the Stone target (R a stone's wash, G a group's, A a stone's strength). On a Stonework pixel the shader cuts them, a wandering edge dried hard in places and run soft in others, and glazes the tan pigments over the dry wall, kept out of the Kuwahara's base as flowers are.

**Where two washes meet** (v0.8.34): a wash's edge fades out over 0.18 mm, its antialiasing, so two washes side by side leave a white line between them. A recipe's `Withdraw` below 0 runs right up to the next wash and keeps the fade against bare paper (`abuts`, probed all round past its nearest edge: the seed alone can land back on its own wash on a stair of pixels). No class at 0 or above changes by a pixel.

- At a round form's rim (v0.8.38, 24's band): both washes run up to it, with no sliver or halo and little pooling, and a little paper left: on the side the sun is on, in lengths that come and go, and in gaps anywhere round it. Wash: Round forms, ... paper left.

**Takes** masks and fields. **Gives** layers for `50`.

**Manifest:** §08 Wash Recipe.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the base wash and shadow glaze in region *Watercolour*; since v0.2.0 an accent layer between them (region *Accent Layer*, blended by MAX) - a picked-out brick or tile deepens its own wash toward the second pigment, and under a flower the foliage is lifted almost to the paper so the flower's glaze reads clean. Since v0.3.1 a shadow-lines layer over the glass (region *Shadow Lines*): marker strokes beside the reveals and glazing bars, on the side away from the sun.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
