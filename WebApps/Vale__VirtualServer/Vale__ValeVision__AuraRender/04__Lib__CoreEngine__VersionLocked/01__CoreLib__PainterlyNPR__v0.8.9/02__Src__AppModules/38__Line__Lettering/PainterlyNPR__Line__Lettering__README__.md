# 38__Line__Lettering

**30-39 · Pen and ink linework** · real code since v0.8.0

Lettering drawn as pen strokes: a single-stroke draughting font, lettered with the 0.18 mm technical pen.

**Files** (v0.8.0, written fresh)

- `PainterlyNPR__Lettering__Strokes__.mjs` (167 lines) - `PainterlyNPR__Lettering__Strokes(text, xMm, yMm, heightMm, options)`: a line of lettering as strokes in sheet pixels, each straight piece of a glyph its own stroke, carried half the pen's width past both ends (a tubular nib's round tip) so every corner is full; `PainterlyNPR__Lettering__WidthMm(text, heightMm)`
- `Na__Lettering__Config.json` - the font: capitals, figures, `.,-/%:()`, `x` (times) and `m` (millimetres), each glyph a few polylines on a 4 x 6 grid, monospaced as stencil lettering is

**Belongs here**

- Stroke-built text for the sheet: labels, titles, scale marks. Its line width is the lettering pen's (Minor features, 0.18 mm, `32__Line__ClassAndPriority/Na__TechnicalPens__Config.json`) and nothing else: Adam's pen specification gives lettering the 0.18 mm pen "where stroke-based text is supported". A filled font has no line width to calibrate.
- No taper at the ends (a taper of 0 is a tubular nib's full width to its end); no wobble.

**Takes** text and a place in sheet millimetres. **Gives** strokes for `33`.

**First used by** the technical pen calibration sheet (`86__Export__StillRender/PainterlyNPR__Export__PenCalibration__.mjs`).
