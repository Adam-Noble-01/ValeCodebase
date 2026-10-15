/* =============================================================================
   VGHLANTERN - APP DATA | GLAZE BAR SET-OUT MODES
   =============================================================================

   FILE       : VghLantern__AppData__GlazeBarSetOutModes__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - GlazeBarSetOutModes
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Present the two glaze bar set-out modes as selectable diagram cards
   CREATED    : 20-Aug-2026

   DESCRIPTION:
   - The PRESENTATION half of the glaze bar set-out. The geometry half lives in
     VghLantern__Geometry__GlazeBarLayout, which owns the two stored mode keys and
     the two station builders behind them.
   - This module owns only what the user sees: the label, the one line of
     explanation, and the plan diagram on the card.
   - Split that way on purpose. A label reword or a redrawn diagram must never be
     able to change what a saved project means, and the geometry module must never
     have to carry a lump of SVG markup around inside it.

   ---------------------------------------------------------------------------

   WHY DIAGRAMS RATHER THAN A DROPDOWN

   The two modes differ by half a pane. Described in words that reads as a detail;
   drawn in plan it is obvious at a glance - in Mode 01 a bar runs through the end
   block, in Mode 02 a pane sits centred over it. Same reasoning as the finial and
   trim cards: a decision that is visual should be asked visually.

   The diagram is an honest little plan of a 6000 x 3000 lantern rather than an
   icon. Ridge, hips, end blocks, long slope bars and the hip end wrap are all
   drawn where the layout module would actually put them, so the card and the
   drawing agree.

   ---------------------------------------------------------------------------

   THE DIAGRAM GRID (viewBox 0 0 120 72)

       eaves rectangle   (6,6) to (114,66)
       ridge             y = 36, from x = 36 to x = 84
       end blocks        (36,36) and (84,36)
       hips              each eaves corner to its block
       set-out pitch     16 units, which divides the 48 unit ridge into 3 panes

   Mode 01 stations : 20, 36, 52, 68, 84, 100   - two of them ON the blocks
   Mode 02 stations : 28, 44, 60, 76, 92        - the blocks fall mid pane

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar Set-Out Modes Module
// =============================================================================

const VghLantern__AppData__GlazeBarSetOutModes = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Diagram CSS Class Names
    // ------------------------------------------------------------
    // Styled from VghLantern__LanternEditor__Styles__Main__.css so the whole card
    // strip restyles from one place and no colour is written into the markup.
    const CSS_DIAGRAM      =  'VghLantern__ControlPanel__ModeDiagram';
    const CSS_OUTLINE      =  CSS_DIAGRAM + '__Outline';                     // <-- Eaves rectangle and hips
    const CSS_RIDGE        =  CSS_DIAGRAM + '__Ridge';                       // <-- Ridge line between the blocks
    const CSS_BAR          =  CSS_DIAGRAM + '__Bar';                         // <-- An ordinary glaze bar centreline
    const CSS_BAR_KEY      =  CSS_DIAGRAM + '__Bar--key';                    // <-- The bar that makes the point, drawn in Vale blue
    const CSS_BLOCK        =  CSS_DIAGRAM + '__Block';                       // <-- The octagonal end block marker
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Diagram Geometry
    // ------------------------------------------------------------
    const D_LEFT     =  6;                                                   // <-- Eaves rectangle, left edge
    const D_RIGHT    =  114;                                                 // <-- Eaves rectangle, right edge
    const D_TOP      =  6;                                                   // <-- Eaves rectangle, top edge
    const D_BOTTOM   =  66;                                                  // <-- Eaves rectangle, bottom edge
    const D_RIDGE_Y  =  36;                                                  // <-- Ridge and lantern centreline
    const D_BLOCK_L  =  36;                                                  // <-- Left end block centre
    const D_BLOCK_R  =  84;                                                  // <-- Right end block centre
    const D_PITCH    =  16;                                                  // <-- Set-out pitch, three panes across the 48 unit ridge
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Diagram Primitives
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | How Far a Station Is Walked Down the Hip
    // ------------------------------------------------------------
    // The same walk VghLantern__GlazeBarLayout__HipShortOffset performs, at
    // diagram scale: a station outboard of a block stops short of the ridge by
    // however far past the block it sits. The hips are at 45 degrees here, so the
    // walk is one to one.
    function VghLantern__GlazeBarSetOutModes__HipInset(stationX) {
        if (stationX < D_BLOCK_L) return D_BLOCK_L - stationX;
        if (stationX > D_BLOCK_R) return stationX - D_BLOCK_R;
        return 0;                                                             // <-- Inboard of both blocks, so it reaches the ridge
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Long Slope Station, Both Slopes Plus Any Wrap Legs
    // ------------------------------------------------------------
    // A station is a pair of bars running square to the long eaves, one on each
    // slope. Outboard of a block those bars stop on the hip, and each one turns
    // and carries on square to the short eaves as its own member - which is why
    // the wrap legs are drawn here rather than as a separate pass.
    function VghLantern__GlazeBarSetOutModes__Station(stationX, isKeyStation) {
        var inset     =  VghLantern__GlazeBarSetOutModes__HipInset(stationX);
        var cssClass  =  isKeyStation ? (CSS_BAR + ' ' + CSS_BAR_KEY) : CSS_BAR;
        var topStop   =  D_RIDGE_Y - inset;
        var lowStop   =  D_RIDGE_Y + inset;
        var markup    =  '';

        markup  +=  '<path class="' + cssClass + '" d="M' + stationX + ' ' + D_TOP    + 'V' + topStop + '"/>';
        markup  +=  '<path class="' + cssClass + '" d="M' + stationX + ' ' + D_BOTTOM + 'V' + lowStop + '"/>';

        if (inset === 0) return markup;

        var wrapTo  =  (stationX < D_BLOCK_L) ? D_LEFT : D_RIGHT;
        markup  +=  '<path class="' + cssClass + '" d="M' + stationX + ' ' + topStop + 'H' + wrapTo + '"/>';
        markup  +=  '<path class="' + cssClass + '" d="M' + stationX + ' ' + lowStop + 'H' + wrapTo + '"/>';

        return markup;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Roof Shell Every Diagram Shares
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSetOutModes__Shell() {
        var markup  =  '';

        markup  +=  '<rect class="' + CSS_OUTLINE + '" x="' + D_LEFT + '" y="' + D_TOP
                 +      '" width="' + (D_RIGHT - D_LEFT) + '" height="' + (D_BOTTOM - D_TOP) + '"/>';

        markup  +=  '<path class="' + CSS_OUTLINE + '" d="'
                 +      'M' + D_LEFT  + ' ' + D_TOP    + 'L' + D_BLOCK_L + ' ' + D_RIDGE_Y
                 +      'M' + D_LEFT  + ' ' + D_BOTTOM + 'L' + D_BLOCK_L + ' ' + D_RIDGE_Y
                 +      'M' + D_RIGHT + ' ' + D_TOP    + 'L' + D_BLOCK_R + ' ' + D_RIDGE_Y
                 +      'M' + D_RIGHT + ' ' + D_BOTTOM + 'L' + D_BLOCK_R + ' ' + D_RIDGE_Y + '"/>';

        markup  +=  '<path class="' + CSS_RIDGE + '" d="M' + D_BLOCK_L + ' ' + D_RIDGE_Y
                 +      'H' + D_BLOCK_R + '"/>';

        return markup;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Two End Block Markers
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSetOutModes__Blocks() {
        return '<circle class="' + CSS_BLOCK + '" cx="' + D_BLOCK_L + '" cy="' + D_RIDGE_Y + '" r="3.4"/>'
             + '<circle class="' + CSS_BLOCK + '" cx="' + D_BLOCK_R + '" cy="' + D_RIDGE_Y + '" r="3.4"/>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap Diagram Body Markup in Its SVG Frame
    // ------------------------------------------------------------
    // The root carries the ControlPanel's own CardPreview class as well as this
    // module's. That is the one piece of the card's layout this module has to
    // know about: CardPreview is what makes the picture fill the card, and a
    // diagram that opted out of it would sit at its intrinsic size in the corner.
    function VghLantern__GlazeBarSetOutModes__Frame(bodyMarkup) {
        return '<svg class="VghLantern__ControlPanel__CardPreview ' + CSS_DIAGRAM + '"'
             +      ' viewBox="0 0 120 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
             +      bodyMarkup
             +  '</svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode 01 Diagram - Glaze Bar Locked Central To End Blocks
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Mode 01 Card Diagram
    // ------------------------------------------------------------
    // The point of the picture: a bar runs straight through each end block, and
    // the hip end centre bar carries on out of it to the short eaves. Those three
    // members plus the ridge are the convergence the block exists to make, so they
    // are the ones drawn in the accent.
    function VghLantern__GlazeBarSetOutModes__Mode01Diagram() {
        var stations  =  [
            D_BLOCK_L - D_PITCH,                                              // <-- 20, outboard of the left block
            D_BLOCK_L,                                                        // <-- 36, ON the left block
            D_BLOCK_L + D_PITCH,                                              // <-- 52
            D_BLOCK_R - D_PITCH,                                              // <-- 68
            D_BLOCK_R,                                                        // <-- 84, ON the right block
            D_BLOCK_R + D_PITCH                                               // <-- 100, outboard of the right block
        ];

        var body  =  VghLantern__GlazeBarSetOutModes__Shell();
        var i;

        for (i = 0; i < stations.length; i++) {
            body  +=  VghLantern__GlazeBarSetOutModes__Station(
                stations[i], stations[i] === D_BLOCK_L || stations[i] === D_BLOCK_R);
        }

        // The hip end centre bars, in line with the ridge. Mode 01 only.
        body  +=  '<path class="' + CSS_BAR + ' ' + CSS_BAR_KEY + '" d="'
              +      'M' + D_BLOCK_L + ' ' + D_RIDGE_Y + 'H' + D_LEFT
              +      'M' + D_BLOCK_R + ' ' + D_RIDGE_Y + 'H' + D_RIGHT + '"/>';

        body  +=  VghLantern__GlazeBarSetOutModes__Blocks();

        return VghLantern__GlazeBarSetOutModes__Frame(body);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode 02 Diagram - Glazed Panel Central To End Blocks
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Mode 02 Card Diagram
    // ------------------------------------------------------------
    // The point of the picture: no bar touches an end block. A pane straddles each
    // one, half of it inboard on the long slope and half of it outboard, and the
    // same pane carries on over the hip end centreline with no bar in it. The pair
    // of bars straddling each block is drawn in Vale blue, and the gap between them
    // IS the pane - stated by what is missing at the block rather than by a wash,
    // which is the same way the drawing itself states it.
    function VghLantern__GlazeBarSetOutModes__Mode02Diagram() {
        var halfPitch  =  D_PITCH / 2;
        var stations   =  [
            D_BLOCK_L - halfPitch,                                            // <-- 28, outboard of the left block by half a pane
            D_BLOCK_L + halfPitch,                                            // <-- 44, inboard of it by half a pane
            (D_BLOCK_L + D_BLOCK_R) / 2,                                      // <-- 60, mid ridge
            D_BLOCK_R - halfPitch,                                            // <-- 76
            D_BLOCK_R + halfPitch                                             // <-- 92
        ];

        var body  =  VghLantern__GlazeBarSetOutModes__Shell();
        var i;

        for (i = 0; i < stations.length; i++) {
            body  +=  VghLantern__GlazeBarSetOutModes__Station(
                stations[i],
                Math.abs(stations[i] - D_BLOCK_L) === halfPitch
                    || Math.abs(stations[i] - D_BLOCK_R) === halfPitch);
        }

        body  +=  VghLantern__GlazeBarSetOutModes__Blocks();

        return VghLantern__GlazeBarSetOutModes__Frame(body);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Option List
// -----------------------------------------------------------------------------

    // FUNCTION | List the Set-Out Modes as Selectable Card Options
    // ------------------------------------------------------------
    // Same option shape the component and trim card strips use, with PreviewMarkup
    // carrying inline SVG in place of a single baked outline path. The keys come
    // from the geometry module rather than being restated here, so a stored value
    // and the geometry that reads it can never disagree.
    function VghLantern__GlazeBarSetOutModes__ListModeOptions() {
        var Layout  =  window.VghLantern__Geometry__GlazeBarLayout;
        if (!Layout) return [];

        return [
            {
                Value          : Layout.VGHLANTERN__GLAZEBAR__MODE_BAR_CENTRED,
                Label          : 'Bar Central',
                Disabled       : false,
                PreviewMarkup  : VghLantern__GlazeBarSetOutModes__Mode01Diagram(),
                Summary        : 'Glaze Bar Locked Central To End Blocks. A bar lands on each end block, '
                               + 'so bar, ridge and hip end centre bar all converge on it.'
            },
            {
                Value          : Layout.VGHLANTERN__GLAZEBAR__MODE_PANE_CENTRED,
                Label          : 'Panel Central',
                Disabled       : false,
                PreviewMarkup  : VghLantern__GlazeBarSetOutModes__Mode02Diagram(),
                Summary        : 'Glazed Panel Central To End Blocks. Every bar is offset half a pane, '
                               + 'so a pane sits centred over each end block instead.'
            }
        ];
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__GlazeBarSetOutModes__ListModeOptions : VghLantern__GlazeBarSetOutModes__ListModeOptions
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__GlazeBarSetOutModes  =  VghLantern__AppData__GlazeBarSetOutModes;
