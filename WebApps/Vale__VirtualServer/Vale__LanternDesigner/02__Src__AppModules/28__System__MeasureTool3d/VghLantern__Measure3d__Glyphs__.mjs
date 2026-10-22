/* =============================================================================
   VGHLANTERN - 3D MEASURE TOOL | SNAP GLYPHS
   =============================================================================

   FILE       : VghLantern__Measure3d__Glyphs__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Measure3d - Glyphs
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The AutoCAD shape a snap is marked with, as SVG markup for the overlay
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - THE GLYPHS ARE AUTOCAD'S, because anyone who has drawn in CAD already reads
     them without being told: Endpoint a square, Midpoint a triangle,
     Intersection a cross, Perpendicular a right angle with its corner boxed,
     Centre a circle, Nearest an hourglass; and TrueVision's own two, a ringed dot
     for a grid point and a dashed circle for an inferred line.
   - Vertex to Vertex wears Endpoint: Adam's "a Box around the target vertex like
     autocad style to clearly show 'Your targeting THIS vertex'". The rest of the
     table comes across with it so a later snap (a midpoint, an intersection) is a
     word in the overlay, not a new drawing.
   - A GLYPH HAS NO COLOUR OF ITS OWN. It is the same path stroked twice: a wider
     white casing, so it reads over the lit aluminium and the backdrop alike, and
     the ink in currentColor, which the stylesheet sets. No hex here: the casing
     and the ink are classes in VghLantern__Measure3d__Styles__Main__.css.

   -----------------------------------------------------------------------------

   PORT NOTE:
   - Ported from   : TrueVision3D 51__System__LayoutEditor/28__System__ObjectSnap/
                     Na__LayoutEditor__ObjectSnap__Glyphs__.js v1.0.0 (the glyph
                     table and the casing-and-ink drawing; the snap menu's
                     illustrations stay behind, this app has no snap menu).
   - Back-port     : n/a (the source is the original).

   ============================================================================= */

// =============================================================================
// REGION | Measure Tool Snap Glyphs Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Each Glyph, Drawn in a 24 by 24 Box About Its Middle (12, 12)
    // ------------------------------------------------------------
    // Path data only, exactly as TrueVision draws them. `fill` marks the one glyph
    // with a solid part (the grid's centre dot); `dash` the inferred line's circle.
    const GLYPHS  =  Object.freeze({
        end   : { Path : 'M5 5 H19 V19 H5 Z' },
        mid   : { Path : 'M12 4.5 L20 18.5 H4 Z' },
        int   : { Path : 'M5 5 L19 19 M19 5 L5 19' },
        perp  : { Path : 'M5 4 V19 H20 M5 12 H12 V19' },
        cen   : { Path : 'M12 4.5 A7.5 7.5 0 1 0 12 19.5 A7.5 7.5 0 1 0 12 4.5 Z' },
        near  : { Path : 'M5 5 H19 L5 19 H19 Z' },
        grid  : { Path : 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z', Fill : 'M12 9.2 A2.8 2.8 0 1 0 12 14.8 A2.8 2.8 0 1 0 12 9.2 Z' },
        infer : { Path : 'M12 4.5 A7.5 7.5 0 1 0 12 19.5 A7.5 7.5 0 1 0 12 4.5 Z', Dash : '3.2 2.6' }
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Line Weights in the Glyph's Own 24 Unit Box
    // ------------------------------------------------------------
    const INK_WIDTH     =  2.2;                                              // <-- TrueVision's marker weight
    const CASING_EXTRA  =  2.2;                                              // <-- The white casing runs this much wider than the ink
    const BOX_UNITS     =  24;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number for SVG Markup (two decimals of a pixel)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Glyphs__N(value) {
        const n  =  Math.round(Number(value) * 100) / 100;
        return isFinite(n) ? String(n) : '0';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Glyph's Casing, Tint, Ink and Fill, as SVG Markup
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Glyphs__Parts(kind) {
        const glyph  =  GLYPHS[kind] || GLYPHS.end;
        const dash   =  glyph.Dash ? ' stroke-dasharray="' + glyph.Dash + '"' : '';

        return '<path class="VghLantern__Measure3d__GlyphCasing" d="' + glyph.Path + '" stroke-width="' + (INK_WIDTH + CASING_EXTRA) + '"/>' +
               '<path class="VghLantern__Measure3d__GlyphTint" d="' + glyph.Path + '"/>' +
               '<path class="VghLantern__Measure3d__GlyphInk" d="' + glyph.Path + '" stroke-width="' + INK_WIDTH + '"' + dash + '/>' +
               (glyph.Fill ? '<path class="VghLantern__Measure3d__GlyphFill" d="' + glyph.Fill + '"/>' : '');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Marker for One Kind of Snap, Centred on a Screen Point
    // ------------------------------------------------------------
    // A nested <svg> sized sizePx on screen with the glyph's own 24 unit box as its
    // viewBox, so the glyph's weights scale with its size exactly as TrueVision's
    // do. extraClass colours it (the stylesheet decides what each class means).
    // The kind rides on the element as a class (--end, --mid ...), because only a
    // closed glyph takes the faint tint inside it: filling the cross or the right
    // angle would paint a wedge between its arms (TrueVision's rule).
    export function VghLantern__Measure3d__Glyphs__Markup(kind, centreX, centreY, sizePx, extraClass) {
        const N     =  VghLantern__Measure3d__Glyphs__N;
        const half  =  sizePx / 2;
        const name  =  GLYPHS[kind] ? kind : 'end';

        return '<svg class="VghLantern__Measure3d__Glyph VghLantern__Measure3d__Glyph--' + name + (extraClass ? ' ' + extraClass : '') + '"' +
               ' x="' + N(centreX - half) + '" y="' + N(centreY - half) + '"' +
               ' width="' + N(sizePx) + '" height="' + N(sizePx) + '"' +
               ' viewBox="0 0 ' + BOX_UNITS + ' ' + BOX_UNITS + '" overflow="visible">' +
               VghLantern__Measure3d__Glyphs__Parts(name) +
               '</svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
