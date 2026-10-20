/* =============================================================================
   VGHLANTERN - APP DATA | PLAN SIZE BASIS DIAGRAMS
   =============================================================================

   FILE       : VghLantern__AppData__PlanSizeBasisDiagrams__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - PlanSizeBasisDiagrams
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw the three lantern size diagrams and list them as the
                Set Out To cards in Form and Size
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - The PRESENTATION half of the plan size basis. The geometry half lives in
     VghLantern__Geometry__PlanSizeBasis, which owns the stored keys, the insets
     and the sync. Split the same way, and for the same reason, as the glaze bar
     set-out modes: a reworded card or a redrawn diagram must never be able to
     change what a saved project means.
   - Three cards in one row, one per basis: the finished exterior of the builders
     upstand, the eaves datum, the internal upstand. Each is the same cross
     section excerpt of a lantern, dimensioned between its own pair of points, so
     the three read as one comparison. The chosen card carries a tick and the
     other two fade (the ControlPanel's SelectedTick).
   - What each one measures, face by face, is NOT written here: each card names
     an InfoTip key, and the words live in Na__InfoTooltip__Config.json, shown in
     the Vale tooltip from the "i" in the card's corner. The panel itself carries
     a picture and a short name, nothing more (Adam, 20-Oct-2026).
   - The markup carries class names and nothing else. Every colour and weight is
     set in VghLantern__LanternEditor__Styles__Main__.css. Strokes there are
     non-scaling, so a line is the same weight at every panel width.

   ---------------------------------------------------------------------------

   THE SECTION (Adam, 20-Oct-2026, with the issued cross section beside it):
   "show more of a silhuette of how the actual glazebar lines etc are ... the key
   shape must better match the actual product as the head beam is not
   rectangular and its impossible to understand that pitch line and what it is,
   is it eaves datum line or is it u/s of glaze bar? who knows! so show a
   silhuette thickness and the eaves lines as a desturated red dash dotr line
   with a lighter linewieght". And: "Dont make the upstand blue".

   So the drawing is built from the product's own numbers, in millimetres, and
   only the SPAN is compressed (a real lantern is two or three times wider; at
   true width the eaves would be specks on a card):

       builders upstand        110 thick, 150 high (the defaults)
       head beam (46_1001)     125 wide on the upstand, outer face flush with the
                               finished exterior, its top weathered to the pitch
                               under the bar, a chamfer at the outer edge
       eaves datum             the head beam inner face plane, 100 above its
                               underside: where the glaze bar datum meets it
       glaze bar, side on      the silhouette of trim (45 below the datum), core
                               (20 below, running 42.5 past the datum), glass and
                               cap (8 to 57.7 above, running 170 past the datum
                               to the drip) - the numbers GlazeBarAssembly and
                               BaseFrameAssembly build the real bar from
       trim plumb cut          18 inboard of the datum
       cornice                 a plain cove under the trim, against the beam
       ridge                   the beam hanging below the datum with its moulded
                               nose, the capping on top
       glaze bar datum         a light, desaturated red dash-dot line from just
                               past the eaves datum point to the ridge datum

   The diagram pitch is a fixed 27.5 degrees: it is a picture of where the
   points are, not of this lantern, so it does not follow the slider.

   TERMINATORS: a FACE is dimensioned with the Vale 45 degree tick, as on the
   drawings; the eaves datum is a POINT, so its dimension ends on solid dots
   (a tick through a ring was tried first and read as a diameter sign).

   COORDINATES: worked in section millimetres, x from the left finished exterior
   face, y UP from the roof deck; Pt() flips y for SVG. The right half is the
   left mirrored about the centreline.

   ============================================================================= */

// =============================================================================
// REGION | Plan Size Basis Diagrams Module
// =============================================================================

const VghLantern__AppData__PlanSizeBasisDiagrams = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Diagram CSS Class Names
    // ------------------------------------------------------------
    const CSS_DIAGRAM       =  'VghLantern__ControlPanel__SizeDiagram';
    const CSS_SOLID         =  CSS_DIAGRAM + '__Solid';                      // <-- Product silhouettes, white filled, light grey
    const CSS_DECK          =  CSS_DIAGRAM + '__Deck';                       // <-- The roof deck either side
    const CSS_DATUM_LINE    =  CSS_DIAGRAM + '__DatumLine';                  // <-- Glaze bar datum, desaturated red dash-dot
    const CSS_DIM           =  CSS_DIAGRAM + '__Dim';                        // <-- Dimension line and its ticks, Vale blue
    const CSS_WITNESS       =  CSS_DIAGRAM + '__Witness';                    // <-- Witness lines, a step lighter
    const CSS_POINT         =  CSS_DIAGRAM + '__Point';                      // <-- Eaves datum point, a solid dot
    const CSS_CARD_PREVIEW  =  'VghLantern__ControlPanel__CardPreview';      // <-- What makes a card's picture fill the card
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Section, in Millimetres (left half)
    // ------------------------------------------------------------
    const S_SPAN              =  1300;                                       // <-- Finished exterior to finished exterior, compressed
    const S_PITCH_DEGREES     =  27.5;
    const S_UPSTAND_THICK     =  110;
    const S_UPSTAND_HIGH      =  150;
    const S_HEAD_BEAM_WIDE    =  125;                                        // <-- So the eaves datum plane is x = 125
    const S_DATUM_RISE        =  100;                                        // <-- Eaves datum above the head beam underside
    const S_BEAM_CHAMFER_X    =  16;                                         // <-- Where the weathered top meets the outer chamfer
    const S_BEAM_OUTER_MIN    =  8;                                          // <-- Outer face kept above the underside, as BaseFrameAssembly keeps it
    const S_TRIM_BELOW        =  45;                                         // <-- Trim underside below the datum (the 45 trim)
    const S_CORE_BELOW        =  20;                                         // <-- Core underside below the datum
    const S_GLASS_ABOVE       =  8;                                          // <-- Glass bedding above the datum
    const S_CAP_ABOVE         =  57.7;                                       // <-- Cap top above the datum
    const S_CORE_PAST         =  42.5;                                       // <-- Core runs past the datum, along the pitch
    const S_CAP_PAST          =  170;                                        // <-- Cap and glass run past the datum, along the pitch
    const S_TRIM_PLUMB_INSET  =  18;                                         // <-- Trim plumb cut, horizontally inboard of the datum
    const S_DECK_RUN          =  90;                                         // <-- Roof deck shown outside each upstand
    const S_RIDGE_BEAM_HALF   =  33;
    const S_RIDGE_BEAM_DEPTH  =  175;                                        // <-- Below the ridge datum, shortened to clear the eaves datum line
    const S_DATUM_LINE_PAST   =  60;                                         // <-- Datum line drawn this far past the eaves datum point
    const S_EXTERIOR_DIM_Y    =  -82;                                        // <-- Below the deck, off witness lines
    const S_INTERIOR_DIM_Y    =  75;                                         // <-- Mid upstand, face to face
    const S_TICK_HALF         =  30;
    const S_WITNESS_GAP       =  12;
    const S_WITNESS_OVERRUN   =  15;
    const S_POINT_RADIUS      =  18;
    const S_VIEWBOX           =  '-95 -642 1490 760';                        // <-- Deck to deck, dimension to capping; mirrored in the stylesheet's aspect-ratio
    // ------------------------------------------------------------


    // MODULE CONSTANTS | What the User Reads for Each Basis
    // ------------------------------------------------------------
    // Keyed by the stored basis values in VghLantern__Geometry__PlanSizeBasis.
    // Label names the card, short enough that the three sit level ("Exterior
    // Builders Upstand", Adam, 20-Oct-2026: the longer name "sticks out too much
    // vs the other two"); Phrase completes the locked dimension notice ("This
    // lantern is set out to ..."); InfoTip is the key of the card's tooltip in
    // Na__InfoTooltip__Config.json, where the full explanation lives.
    const BASIS_TEXT  =  {
        'externalUpstand' : {
            Label   : 'Exterior Upstand',
            Phrase  : 'the finished exterior of the builders upstand',
            InfoTip : 'planSizeBasis.externalUpstand'
        },
        'eavesDatum' : {
            Label   : 'Eaves Datum',
            Phrase  : 'the eaves datum',
            InfoTip : 'planSizeBasis.eavesDatum'
        },
        'internalUpstand' : {
            Label   : 'Internal Upstand',
            Phrase  : 'the finished interior of the builders upstand',
            InfoTip : 'planSizeBasis.internalUpstand'
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Geometry
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Derived Section Values
    // ------------------------------------------------------------
    const DEG_TO_RAD  =  Math.PI / 180;
    const S_TAN       =  Math.tan(S_PITCH_DEGREES * DEG_TO_RAD);
    const S_SIN       =  Math.sin(S_PITCH_DEGREES * DEG_TO_RAD);
    const S_COS       =  Math.cos(S_PITCH_DEGREES * DEG_TO_RAD);
    const S_DATUM_X   =  S_HEAD_BEAM_WIDE;
    const S_DATUM_Y   =  S_UPSTAND_HIGH + S_DATUM_RISE;
    const S_CENTRE_X  =  S_SPAN / 2;
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Point as an SVG Coordinate Pair (y flipped)
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Pt(x, y) {
        return (Math.round(x * 10) / 10) + ',' + (Math.round(-y * 10) / 10);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mirror a Left Half Point Onto the Right Half
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Mirror(point) {
        return { x : S_SPAN - point.x, y : point.y };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Height of a Line Parallel to the Glaze Bar Datum
    // ------------------------------------------------------------
    // offsetMm is measured square to the bar, + out through the roof, which is
    // how every section in the glaze bar system is authored.
    function VghLantern__PlanSizeBasisDiagrams__BarLineY(x, offsetMm) {
        return S_DATUM_Y + ((x - S_DATUM_X) * S_TAN) + (offsetMm / S_COS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Point on a Square Cut End, a Distance Past the Datum
    // ------------------------------------------------------------
    // Down the slope by pastMm from the eaves datum, then square to the bar by
    // offsetMm. The cap and core ends are square cuts, so their end faces run
    // along that square direction.
    function VghLantern__PlanSizeBasisDiagrams__EndPoint(pastMm, offsetMm) {
        return {
            x : S_DATUM_X - (pastMm * S_COS) - (offsetMm * S_SIN),
            y : S_DATUM_Y - (pastMm * S_SIN) + (offsetMm * S_COS)
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Left Glaze Bar Silhouette, Ridge to Drip
    // ------------------------------------------------------------
    // Cap top down to the cap end, the square end down to the glass, the glass
    // underside back to the core end, the core underside over the head beam to
    // the trim plumb cut, then the trim underside back up to the ridge.
    function VghLantern__PlanSizeBasisDiagrams__BarOutline() {
        var Y         =  VghLantern__PlanSizeBasisDiagrams__BarLineY;
        var E         =  VghLantern__PlanSizeBasisDiagrams__EndPoint;
        var plumbX    =  S_DATUM_X + S_TRIM_PLUMB_INSET;

        return [
            { x : S_CENTRE_X, y : Y(S_CENTRE_X, S_CAP_ABOVE) },
            E(S_CAP_PAST,  S_CAP_ABOVE),
            E(S_CAP_PAST,  S_GLASS_ABOVE),
            E(S_CORE_PAST, S_GLASS_ABOVE),
            E(S_CORE_PAST, -S_CORE_BELOW),
            { x : plumbX,     y : Y(plumbX, -S_CORE_BELOW) },
            { x : plumbX,     y : Y(plumbX, -S_TRIM_BELOW) },
            { x : S_CENTRE_X, y : Y(S_CENTRE_X, -S_TRIM_BELOW) }
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Left Head Beam, Weathered Under the Bar
    // ------------------------------------------------------------
    // Not a rectangle: its top follows the underside of the bar's core down the
    // pitch, then a chamfer takes it to a short outer face.
    function VghLantern__PlanSizeBasisDiagrams__BeamOutline() {
        var Y          =  VghLantern__PlanSizeBasisDiagrams__BarLineY;
        var chamferY   =  Y(S_BEAM_CHAMFER_X, -S_CORE_BELOW);
        var outerTopY  =  Math.max(S_UPSTAND_HIGH + S_BEAM_OUTER_MIN, chamferY - S_BEAM_CHAMFER_X);

        return [
            { x : 0,                 y : S_UPSTAND_HIGH },
            { x : S_HEAD_BEAM_WIDE,  y : S_UPSTAND_HIGH },
            { x : S_HEAD_BEAM_WIDE,  y : Y(S_HEAD_BEAM_WIDE, -S_CORE_BELOW) },
            { x : S_BEAM_CHAMFER_X,  y : chamferY },
            { x : 0,                 y : outerTopY }
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Left Builders Upstand
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__UpstandOutline() {
        return [
            { x : 0,               y : 0 },
            { x : S_UPSTAND_THICK, y : 0 },
            { x : S_UPSTAND_THICK, y : S_UPSTAND_HIGH },
            { x : 0,               y : S_UPSTAND_HIGH }
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Left Cornice, a Plain Cove Under the Trim
    // ------------------------------------------------------------
    // Returned as path data rather than points because the cove is a curve.
    function VghLantern__PlanSizeBasisDiagrams__CornicePath(isRight) {
        var P     =  VghLantern__PlanSizeBasisDiagrams__Pt;
        var flip  =  isRight ? function(x) { return S_SPAN - x; } : function(x) { return x; };
        var back  =  S_HEAD_BEAM_WIDE;
        var top   =  205;
        var foot  =  140;
        var reach =  48;

        return 'M' + P(flip(back), top)
             + 'L' + P(flip(back + reach), top)
             + 'C' + P(flip(back + 26), top - 4) + ' ' + P(flip(back + 6), top - 28) + ' ' + P(flip(back), foot)
             + 'Z';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Drip at the Lower End of the Cap
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__DripPoints() {
        var top  =  VghLantern__PlanSizeBasisDiagrams__EndPoint(S_CAP_PAST, S_CAP_ABOVE);
        var run  =  { x : top.x - (22 * S_COS), y : top.y - (22 * S_SIN) };
        var down =  { x : run.x - 4,            y : run.y - 30 };
        return [top, run, down, { x : down.x + 14, y : down.y + 4 }];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Ridge Beam, Hanging Below the Ridge Datum
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__RidgeBeamOutline() {
        var ridgeY  =  VghLantern__PlanSizeBasisDiagrams__BarLineY(S_CENTRE_X, 0);
        var left    =  S_CENTRE_X - S_RIDGE_BEAM_HALF;
        var right   =  S_CENTRE_X + S_RIDGE_BEAM_HALF;
        var foot    =  ridgeY - S_RIDGE_BEAM_DEPTH;

        return [
            { x : left,         y : ridgeY },
            { x : left,         y : foot + 26 },
            { x : left + 11,    y : foot + 14 },
            { x : left + 22,    y : foot + 5 },
            { x : S_CENTRE_X,   y : foot },
            { x : right - 22,   y : foot + 5 },
            { x : right - 11,   y : foot + 14 },
            { x : right,        y : foot + 26 },
            { x : right,        y : ridgeY }
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Ridge Capping on Top
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__CappingOutlines() {
        // Seated on the bar tops: its bottom corners land where the cap top line
        // passes under them, so it reads as sitting on the roof, not floating.
        var capTop  =  VghLantern__PlanSizeBasisDiagrams__BarLineY(S_CENTRE_X, S_CAP_ABOVE);
        var seat    =  VghLantern__PlanSizeBasisDiagrams__BarLineY(S_CENTRE_X - 38, S_CAP_ABOVE);
        var block   =  [
            { x : S_CENTRE_X - 38, y : seat },
            { x : S_CENTRE_X + 38, y : seat },
            { x : S_CENTRE_X + 38, y : capTop + 32 },
            { x : S_CENTRE_X - 38, y : capTop + 32 }
        ];
        var plate   =  [
            { x : S_CENTRE_X - 50, y : capTop + 32 },
            { x : S_CENTRE_X + 50, y : capTop + 32 },
            { x : S_CENTRE_X + 50, y : capTop + 43 },
            { x : S_CENTRE_X - 50, y : capTop + 43 }
        ];
        return [block, plate];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup Primitives
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Closed Polygon
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Polygon(points, cssClass) {
        var P       =  VghLantern__PlanSizeBasisDiagrams__Pt;
        var coords  =  [];
        for (var i = 0; i < points.length; i++) coords.push(P(points[i].x, points[i].y));
        return '<polygon class="' + cssClass + '" points="' + coords.join(' ') + '"/>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Open Polyline
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Polyline(points, cssClass) {
        var P       =  VghLantern__PlanSizeBasisDiagrams__Pt;
        var coords  =  [];
        for (var i = 0; i < points.length; i++) coords.push(P(points[i].x, points[i].y));
        return '<polyline class="' + cssClass + '" points="' + coords.join(' ') + '"/>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Shape and Its Mirror Image
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__BothSides(points, cssClass, isClosed) {
        var draw    =  isClosed ? VghLantern__PlanSizeBasisDiagrams__Polygon : VghLantern__PlanSizeBasisDiagrams__Polyline;
        var mirror  =  [];
        for (var i = 0; i < points.length; i++) mirror.push(VghLantern__PlanSizeBasisDiagrams__Mirror(points[i]));
        return draw(points, cssClass) + draw(mirror, cssClass);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Straight Line
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Line(x0, y0, x1, y1, cssClass) {
        var P  =  VghLantern__PlanSizeBasisDiagrams__Pt;
        return '<path class="' + cssClass + '" d="M' + P(x0, y0) + 'L' + P(x1, y1) + '"/>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Vale 45 Degree Tick
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__Tick(x, y) {
        return VghLantern__PlanSizeBasisDiagrams__Line(
            x - S_TICK_HALF, y - S_TICK_HALF, x + S_TICK_HALF, y + S_TICK_HALF, CSS_DIM);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Eaves Datum Point
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasisDiagrams__DatumPoint(x, y) {
        var P     =  VghLantern__PlanSizeBasisDiagrams__Pt;
        var pair  =  P(x, y).split(',');
        return '<circle class="' + CSS_POINT + '" cx="' + pair[0] + '" cy="' + pair[1] + '" r="' + S_POINT_RADIUS + '"/>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Section Shell and the Three Dimensions
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw the Cross Section Every Card Shares
    // ------------------------------------------------------------
    // Back to front: deck, upstands, cornices, head beams, ridge beam, the two
    // bars (white filled, so they sit over the beam and the ridge beam), drips,
    // capping, then the two glaze bar datum lines on top of it all.
    function VghLantern__PlanSizeBasisDiagrams__Shell() {
        var Both    =  VghLantern__PlanSizeBasisDiagrams__BothSides;
        var markup  =  '';

        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(-S_DECK_RUN, 0, 0, 0, CSS_DECK);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(S_SPAN, 0, S_SPAN + S_DECK_RUN, 0, CSS_DECK);

        markup  +=  Both(VghLantern__PlanSizeBasisDiagrams__UpstandOutline(), CSS_SOLID, true);
        markup  +=  '<path class="' + CSS_SOLID + '" d="' + VghLantern__PlanSizeBasisDiagrams__CornicePath(false) + '"/>';
        markup  +=  '<path class="' + CSS_SOLID + '" d="' + VghLantern__PlanSizeBasisDiagrams__CornicePath(true) + '"/>';
        markup  +=  Both(VghLantern__PlanSizeBasisDiagrams__BeamOutline(), CSS_SOLID, true);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Polygon(VghLantern__PlanSizeBasisDiagrams__RidgeBeamOutline(), CSS_SOLID);
        markup  +=  Both(VghLantern__PlanSizeBasisDiagrams__BarOutline(), CSS_SOLID, true);
        markup  +=  Both(VghLantern__PlanSizeBasisDiagrams__DripPoints(), CSS_SOLID, false);

        var capping  =  VghLantern__PlanSizeBasisDiagrams__CappingOutlines();
        for (var i = 0; i < capping.length; i++) {
            markup  +=  VghLantern__PlanSizeBasisDiagrams__Polygon(capping[i], CSS_SOLID);
        }

        // The glaze bar datum, from just past the eaves datum point to the ridge
        // datum: the line the whole bar is set out on, inside its silhouette.
        var from    =  VghLantern__PlanSizeBasisDiagrams__EndPoint(S_DATUM_LINE_PAST, 0);
        var ridge   =  { x : S_CENTRE_X, y : VghLantern__PlanSizeBasisDiagrams__BarLineY(S_CENTRE_X, 0) };
        markup  +=  Both([from, ridge], CSS_DATUM_LINE, false);

        return markup;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Finished Exterior Dimension
    // ------------------------------------------------------------
    // Off witness lines below the deck, taken from the outside faces of the two
    // upstands: the face of the builder's covering. Only the dimension is blue.
    function VghLantern__PlanSizeBasisDiagrams__ExteriorDimension() {
        var y       =  S_EXTERIOR_DIM_Y;
        var markup  =  '';

        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(0,      -S_WITNESS_GAP, 0,      y - S_WITNESS_OVERRUN, CSS_WITNESS);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(S_SPAN, -S_WITNESS_GAP, S_SPAN, y - S_WITNESS_OVERRUN, CSS_WITNESS);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(0, y, S_SPAN, y, CSS_DIM);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Tick(0, y);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Tick(S_SPAN, y);

        return markup;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Eaves Datum Dimension
    // ------------------------------------------------------------
    // Straight through the two datum points, ending on solid dots: the ends of
    // the dimension ARE the points.
    function VghLantern__PlanSizeBasisDiagrams__EavesDatumDimension() {
        var right   =  S_SPAN - S_DATUM_X;
        var markup  =  '';

        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(S_DATUM_X, S_DATUM_Y, right, S_DATUM_Y, CSS_DIM);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__DatumPoint(S_DATUM_X, S_DATUM_Y);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__DatumPoint(right,     S_DATUM_Y);

        return markup;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Internal Upstand Dimension
    // ------------------------------------------------------------
    // Face to face across the room, between the inside faces of the kerbs.
    function VghLantern__PlanSizeBasisDiagrams__InternalDimension() {
        var y       =  S_INTERIOR_DIM_Y;
        var right   =  S_SPAN - S_UPSTAND_THICK;
        var markup  =  '';

        markup  +=  VghLantern__PlanSizeBasisDiagrams__Line(S_UPSTAND_THICK, y, right, y, CSS_DIM);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Tick(S_UPSTAND_THICK, y);
        markup  +=  VghLantern__PlanSizeBasisDiagrams__Tick(right, y);

        return markup;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Whole Diagram for a Basis, in Its SVG Frame
    // ------------------------------------------------------------
    // The root carries the ControlPanel's CardPreview class, the one piece of the
    // card's layout this module has to know: it is what makes the picture fill
    // the card.
    function VghLantern__PlanSizeBasisDiagrams__Diagram(basisKey) {
        var body  =  VghLantern__PlanSizeBasisDiagrams__Shell();

        if (basisKey === 'eavesDatum')           body  +=  VghLantern__PlanSizeBasisDiagrams__EavesDatumDimension();
        else if (basisKey === 'internalUpstand') body  +=  VghLantern__PlanSizeBasisDiagrams__InternalDimension();
        else                                     body  +=  VghLantern__PlanSizeBasisDiagrams__ExteriorDimension();

        return '<svg class="' + CSS_CARD_PREVIEW + ' ' + CSS_DIAGRAM + '"'
             +      ' viewBox="' + S_VIEWBOX + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
             +      body
             +  '</svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Option and Text Access
// -----------------------------------------------------------------------------

    // FUNCTION | The Words for a Basis
    // ------------------------------------------------------------
    // { Label, Phrase, InfoTip }. An unknown key reads as the exterior, the
    // standard every lantern falls back to.
    function VghLantern__PlanSizeBasisDiagrams__BasisText(basisKey) {
        return BASIS_TEXT[basisKey] || BASIS_TEXT['externalUpstand'];
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Three Bases as Selectable Card Options
    // ------------------------------------------------------------
    // Same option shape the glaze bar set-out cards use. The values come from the
    // geometry module rather than being restated here, so a stored value and the
    // geometry that reads it can never disagree.
    function VghLantern__PlanSizeBasisDiagrams__ListBasisOptions() {
        var PlanSizeBasis  =  window.VghLantern__Geometry__PlanSizeBasis;
        if (!PlanSizeBasis) return [];

        var keys     =  [
            PlanSizeBasis.VGHLANTERN__PLANSIZE__BASIS_EXTERNAL_UPSTAND,
            PlanSizeBasis.VGHLANTERN__PLANSIZE__BASIS_EAVES_DATUM,
            PlanSizeBasis.VGHLANTERN__PLANSIZE__BASIS_INTERNAL_UPSTAND
        ];
        var options  =  [];

        for (var i = 0; i < keys.length; i++) {
            var text  =  VghLantern__PlanSizeBasisDiagrams__BasisText(keys[i]);
            options.push({
                Value          : keys[i],
                Label          : text.Label,
                Disabled       : false,
                PreviewMarkup  : VghLantern__PlanSizeBasisDiagrams__Diagram(keys[i]),
                InfoTip        : text.InfoTip
            });
        }

        return options;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__PlanSizeBasisDiagrams__BasisText         : VghLantern__PlanSizeBasisDiagrams__BasisText,
        VghLantern__PlanSizeBasisDiagrams__ListBasisOptions  : VghLantern__PlanSizeBasisDiagrams__ListBasisOptions
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__PlanSizeBasisDiagrams  =  VghLantern__AppData__PlanSizeBasisDiagrams;
