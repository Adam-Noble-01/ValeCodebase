# 72__Paper__SheetComposer

**70-79 · Camera, views and sheets** · real code since v0.8.13 (30-Oct-2026): the ground cut

Paper mode: a genuine paper-space layout tool, not a camera preview.

**Belongs here**

- A linked view on a sheet: crop, margins, scale where applicable, reserved paper.
- The fading and distribution of content toward the sheet boundary.
- Multiple cameras and sheets; art-direction points per view, non-destructive.

**Takes** views (`70`). **Gives** sheets.

**Manifest:** §11 Paper Composer.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the irregular sheet vignette inside the art-direction field.

## The ground cut (v0.8.13)

Adam, 30-Oct-2026, with an elevation viewport in ValeVision AURA cut off at the ground, and three of Vale's hand-coloured elevations standing on a swish of wash: "create a special effect on elevation viewports when they have the bottom handle brought upwards. It effectively becomes a ground plane clipping boundary ... allow the user to right-click and change the ground elevation ground plane cutoff effect ... seed new watercolour swishes so it looks realistic and artistic like this". Asked, he chose: the painter here, synced into AURA; on by itself when the bottom handle is dragged up past the building's ground line; Grass sweep, Grass strip, Hardstanding, Gravel and Paving, with Plain cut always there; a right-click menu with a small Adjust panel.

An illustrator ends an elevation cut off at the ground with one stroke along it: a dark sweep of lawn under the planting, a sandy band of hardstanding dry-brushed away at one end, a thin strip of green, sometimes under a ruled ground line. The drawing's foot is lost into it, never ruled off. This folder paints that stroke for a wrapper, which lays it over its own viewport.

| File | What it is |
|---|---|
| `Na__GroundCut__Config.json` | The kinds and their starting looks, the colours (some taken from the material classes, so the swish matches the drawing's own wash), every control's label, range, step, readout and hint, and the painter's constants, each with its note |
| `PainterlyNPR__GroundCut__Settings__.mjs` | Kinds, Colours, Controls (with the engine's own readouts and `.Parse`), Defaults, Resolve, Clean, WithKind, NewSeed, Key |
| `PainterlyNPR__GroundCut__Swish__.mjs` | The painter: `PaintPixels` (bytes, runs in Node) and `Paint` (canvases) |

### Using it (a wrapper)

```js
const Settings  =  await import('PainterlyNPR/72__Paper__SheetComposer/PainterlyNPR__GroundCut__Settings__.mjs');
const Swish     =  await import('PainterlyNPR/72__Paper__SheetComposer/PainterlyNPR__GroundCut__Swish__.mjs');

const painted  =  Swish.PainterlyNPR__GroundCut__Paint({
    Settings  :  viewport.GroundCut,     // the kept form, or null: the default kind
    Identity  :  viewport.Id,            // a cut with no Seed takes one from this, and never changes until New swish
    WidthMm   :  frame.WidthMm,          // the frame's width on the sheet
    PxPerMm   :  11.81,                  // 300 dpi; Output().PreviewPxPerMm while a slider moves
});
// painted.Swish: { Canvas, X, Y, WidthMm, HeightMm } in the cut's frame - x from the frame's left side, y from the cut line, down.
//   Lay it with mix-blend-mode: multiply (over white paper an ordinary blend gives the same colour).
// painted.Foot:  the same, a grey mask for the band just above the cut (white kept): the drawing's foot lost into the swish.
// painted.Plain: the hard cut - neither is painted.
```

- **The kept form** is `{ Kind, Seed?, Flip?, Colour?, InkLine?, Values? }` (`Clean`): only what has been moved from the kind's starting look, so a better default here reaches every cut nobody has touched. A wrapper never copies a label, range, default or colour: it asks `Kinds`, `Colours(kind)` and `Controls()`.
- **Millimetres on the sheet throughout**, as pens and grain are: a preview at 4 px/mm and a 300 dpi painting are the same swish.
- **The wash is the engine's model**: paper times each pigment to the power of its density (52's Watercolour shader). The ground line is the drawing's ink family (34) and the technical pens' Ground pen of a wall (32, 0.35 mm).
- **Deterministic by identity**: every noise and fleck is seeded from the cut's Seed.

### How a stroke is painted

1. **Its shape, along x**: the heavy end lands round (a cap as deep as the stroke), swells to its fullest at Heavy end, then thins over Taper of its length (or ends round, as a strip does). The light end sweeps up off the ground by Sweep. Its edges wander (Wobble); the lower edge more than the top, which follows the ground.
2. **Its wash, pixel by pixel, only within reach of the stroke**: the bristles' streaks follow the stroke and close up in the taper; the marker's wider passes; a slow mottle; less paint toward the light end; a darker rim where the wash dried and a starved band inside it (Edge darkening, faded out where the stroke is thin, so a dry tail never darkens); dry-brush gaps along the bristles in the light end; granulation on the paper's tooth.
3. **Speckle** (gravel's stones, a lawn's flecks) and **Joints** (paving) are laid into the wash, never off it.
4. **The ink line** along the cut, past the frame's sides by 1.5 mm, with a hand's slight wander.
5. **The foot**: where the drawing is lost least wanders along the cut; within the band it breaks up along horizontal streaks and the paper's tooth.

### Measured (Node, 180 mm wide at 8 px/mm)

22 to 49 ms for each kind's swish and foot together; about twice that at 300 dpi.
