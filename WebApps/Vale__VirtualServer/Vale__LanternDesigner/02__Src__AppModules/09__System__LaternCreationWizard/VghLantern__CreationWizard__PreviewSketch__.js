/* =============================================================================
   VGHLANTERN - CREATION WIZARD | PREVIEW SKETCH
   =============================================================================

   FILE       : VghLantern__CreationWizard__PreviewSketch__.js
   NAMESPACE  : VghLantern
   MODULE     : System - CreationWizard - PreviewSketch
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw the live schematic lantern sketch shown beside the wizard steps
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - A deliberately lightweight SVG sketch, not the Env2d render pipeline: it
     redraws on every keystroke, so it must cost nothing and depend on nothing.
   - Plan and front elevation share ONE scale and one centreline, sized so the
     pair fills the canvas: the scale is solved from the combined height of both
     views plus the fixed annotation bands, then the stack is centred. The two
     views therefore read as the same object drawn twice, never as two thumbnails
     at unrelated sizes.
   - The dimension being asked for right now is drawn in the app's red dimension
     language with a gentle opacity pulse as a visual prompt; every other
     dimension and the pitch indicator rest in Vale blue. The active key comes
     in on the state object from the Controller.
   - When a finial card is chosen, its baked Preview2d outline is planted on the
     ridge ends (or the apex on a pyramid) at honest scale using the component's
     own overall height, so a big urn visibly reads bigger than a small ball.
   - Pure string assembly. No DOM reads, no state, no config: everything arrives
     through the state argument supplied by the Controller.

   ============================================================================= */

// =============================================================================
// REGION | Creation Wizard Preview Sketch Module
// =============================================================================

const VghLantern__CreationWizard__PreviewSketch = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Sketch Canvas Layout (viewBox units)
    // ------------------------------------------------------------
    // The vertical budget is CANVAS_H minus the fixed chrome: plan label band,
    // dimension band, elevation label gap and bottom margin. Whatever remains
    // is shared by the plan depth and the elevation height at one common scale.
    const CANVAS_W          =  320;                                          // <-- Total viewBox width
    const CANVAS_H          =  310;                                          // <-- Total viewBox height
    const ZONE_LEFT         =  22;                                           // <-- Drawable band left edge
    const ZONE_RIGHT        =  292;                                          // <-- Drawable band right edge (right margin carries the width dim)
    const BAND_PLAN_LABEL   =  24;                                           // <-- Canvas top to plan top, label baseline at 16
    const BAND_DIMS         =  40;                                           // <-- Plan bottom to elevation label baseline
    const BAND_ELEV_GAP     =  8;                                            // <-- Elevation label baseline to elevation top
    const BAND_BOTTOM       =  10;                                           // <-- Ground line to canvas bottom
    const DIM_OFFSET        =  13;                                           // <-- Dimension line offset from geometry
    const DIM_TEXT_OFFSET   =  11;                                           // <-- Text offset from its dimension line
    const DIM_TICK          =  3;                                            // <-- Half length of the 45 degree end tick
    const PITCH_GLYPH_BASE  =  24;                                           // <-- Pitch indicator base length cap
    const PITCH_GLYPH_RISE  =  20;                                           // <-- Pitch indicator rise cap, keeps it inside the dim band
    const FORM_PYRAMID      =  'Pyramid';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Linework Class Names
    // ------------------------------------------------------------
    const CLS               =  'VghLantern__CreationWizard__Sketch';
    const CLS_DIM           =  CLS + 'Dim';
    const CLS_DIM_ACTIVE    =  CLS + 'Dim ' + CLS + 'Dim--active';
    const CLS_TEXT          =  CLS + 'DimText';
    const CLS_TEXT_ACTIVE   =  CLS + 'DimText ' + CLS + 'DimText--active';
    const CLS_PULSE         =  CLS + 'DimPulse';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | String Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe SVG Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Round a Coordinate to Two Decimals for Compact Markup
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__Round(value) {
        return Math.round(value * 100) / 100;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One SVG Line Element
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__Line(x1, y1, x2, y2, className) {
        var R  =  VghLantern__CreationWizard__Sketch__Round;
        return '<line x1="' + R(x1) + '" y1="' + R(y1) + '" x2="' + R(x2) + '" y2="' + R(y2) + '" class="' + className + '"></line>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Annotation Builders
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build a Small Uppercase Zone Label
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__ZoneLabel(x, y, text) {
        return '<text x="' + x + '" y="' + y + '" class="' + CLS + 'Label">'
             +     VghLantern__CreationWizard__Sketch__Escape(text)
             + '</text>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Horizontal Dimension with End Ticks
    // ------------------------------------------------------------
    // Architectural tick style rather than arrowheads, matching the app's
    // drawing language. The dimension currently being asked for renders in the
    // red dimension classes and pulses; the rest rest in Vale blue.
    function VghLantern__CreationWizard__Sketch__DimH(x0, x1, y, text, isActive) {
        var R        =  VghLantern__CreationWizard__Sketch__Round;
        var lineCls  =  isActive ? CLS_DIM_ACTIVE : CLS_DIM;
        var textCls  =  isActive ? CLS_TEXT_ACTIVE : CLS_TEXT;

        var html  =  VghLantern__CreationWizard__Sketch__Line(x0, y, x1, y, lineCls);
        html     +=  VghLantern__CreationWizard__Sketch__Line(x0 - DIM_TICK, y + DIM_TICK, x0 + DIM_TICK, y - DIM_TICK, lineCls);
        html     +=  VghLantern__CreationWizard__Sketch__Line(x1 - DIM_TICK, y + DIM_TICK, x1 + DIM_TICK, y - DIM_TICK, lineCls);
        html     +=  '<text x="' + R((x0 + x1) / 2) + '" y="' + R(y + DIM_TEXT_OFFSET) + '"'
                 +      ' text-anchor="middle" class="' + textCls + '">'
                 +      VghLantern__CreationWizard__Sketch__Escape(text)
                 +  '</text>';

        return isActive ? '<g class="' + CLS_PULSE + '">' + html + '</g>' : html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Vertical Dimension with End Ticks
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__DimV(x, y0, y1, text, isActive) {
        var R        =  VghLantern__CreationWizard__Sketch__Round;
        var lineCls  =  isActive ? CLS_DIM_ACTIVE : CLS_DIM;
        var textCls  =  isActive ? CLS_TEXT_ACTIVE : CLS_TEXT;
        var midY     =  R((y0 + y1) / 2);
        var textX    =  R(x + DIM_TEXT_OFFSET);

        var html  =  VghLantern__CreationWizard__Sketch__Line(x, y0, x, y1, lineCls);
        html     +=  VghLantern__CreationWizard__Sketch__Line(x - DIM_TICK, y0 + DIM_TICK, x + DIM_TICK, y0 - DIM_TICK, lineCls);
        html     +=  VghLantern__CreationWizard__Sketch__Line(x - DIM_TICK, y1 + DIM_TICK, x + DIM_TICK, y1 - DIM_TICK, lineCls);
        html     +=  '<text x="' + textX + '" y="' + midY + '" text-anchor="middle"'
                 +      ' transform="rotate(-90 ' + textX + ' ' + midY + ')"'
                 +      ' class="' + textCls + '">'
                 +      VghLantern__CreationWizard__Sketch__Escape(text)
                 +  '</text>';

        return isActive ? '<g class="' + CLS_PULSE + '">' + html + '</g>' : html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build the True-Angle Pitch Indicator Glyph
    // ------------------------------------------------------------
    // A small right triangle whose hypotenuse really rises at the entered
    // pitch, with the angle arc swung between base and slope. The base
    // shortens as the pitch steepens so the rise never leaves the dimension
    // band. Sits right-aligned on the elevation label line.
    function VghLantern__CreationWizard__Sketch__PitchGlyph(pitchDegrees, baselineY, isActive) {
        var R        =  VghLantern__CreationWizard__Sketch__Round;
        var lineCls  =  isActive ? CLS_DIM_ACTIVE : CLS_DIM;
        var textCls  =  isActive ? CLS_TEXT_ACTIVE : CLS_TEXT;

        var radians  =  (Math.max(1, Math.min(60, pitchDegrees)) * Math.PI) / 180;
        var base     =  Math.min(PITCH_GLYPH_BASE, PITCH_GLYPH_RISE / Math.tan(radians));
        var rise     =  base * Math.tan(radians);

        var cx  =  ZONE_RIGHT - base;                                        // <-- Angle corner, glyph right-aligned to the zone
        var cy  =  baselineY - 3;

        var arcR     =  Math.min(10, base * 0.55);
        var arcEndX  =  cx + arcR * Math.cos(radians);
        var arcEndY  =  cy - arcR * Math.sin(radians);

        var html  =  VghLantern__CreationWizard__Sketch__Line(cx, cy, cx + base, cy, lineCls);
        html     +=  VghLantern__CreationWizard__Sketch__Line(cx, cy, cx + base, cy - rise, lineCls);
        html     +=  '<path d="M ' + R(cx + arcR) + ' ' + R(cy) + ' A ' + R(arcR) + ' ' + R(arcR) + ' 0 0 0 '
                 +      R(arcEndX) + ' ' + R(arcEndY) + '" class="' + lineCls + '"></path>';
        html     +=  '<text x="' + R(cx - 6) + '" y="' + R(cy + 3) + '" text-anchor="end" class="' + textCls + '">'
                 +      VghLantern__CreationWizard__Sketch__Escape(pitchDegrees.toFixed(1) + ' deg')
                 +  '</text>';

        return isActive ? '<g class="' + CLS_PULSE + '">' + html + '</g>' : html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Scale and Layout Solving
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Solve the Common Scale and Vertical Layout for Both Views
    // ------------------------------------------------------------
    // Returns every derived measure the two view builders need, so the plan and
    // the elevation can never drift onto different scales or centrelines.
    function VghLantern__CreationWizard__Sketch__SolveLayout(state) {
        var radians    =  (state.PitchDegrees * Math.PI) / 180;
        var halfSpan   =  Math.min(state.LengthMm, state.DepthMm) / 2;
        var roofMm     =  Math.max(1, halfSpan * Math.tan(radians));

        var hasFinial  =  !!(state.FinialOption && state.FinialOption.Preview2d && state.FinialOption.Preview2d.PathData
                             && typeof state.FinialOption.HeightMm === 'number' && state.FinialOption.HeightMm > 0);
        var finialMm   =  hasFinial ? state.FinialOption.HeightMm : 0;

        var elevMm   =  finialMm + roofMm + state.FrameHeightMm + state.UpstandHeightMm;
        var chrome   =  BAND_PLAN_LABEL + BAND_DIMS + BAND_ELEV_GAP + BAND_BOTTOM;
        var budget   =  CANVAS_H - chrome;
        var scale    =  Math.min((ZONE_RIGHT - ZONE_LEFT) / state.LengthMm, budget / (state.DepthMm + elevMm));

        var shift    =  (budget - (state.DepthMm + elevMm) * scale) / 2;     // <-- Centre the stacked pair in the leftover height

        var planTop  =  BAND_PLAN_LABEL + shift;

        return {
            Scale       : scale,
            HasFinial   : hasFinial,
            RoofMm      : roofMm,
            ElevMm      : elevMm,
            CentreX     : (ZONE_LEFT + ZONE_RIGHT) / 2,
            PlanLabelY  : planTop - 8,
            PlanTop     : planTop,
            PlanBottom  : planTop + state.DepthMm * scale,
            ElevLabelY  : planTop + state.DepthMm * scale + BAND_DIMS,
            ElevTop     : planTop + state.DepthMm * scale + BAND_DIMS + BAND_ELEV_GAP
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plan View Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Plan View with Hips, Ridge and Dimensions
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Sketch__BuildPlan(state, layout) {
        var R      =  VghLantern__CreationWizard__Sketch__Round;
        var planW  =  state.LengthMm * layout.Scale;
        var planH  =  state.DepthMm * layout.Scale;
        var px     =  layout.CentreX - planW / 2;
        var py     =  layout.PlanTop;
        var html   =  '';

        html  +=  VghLantern__CreationWizard__Sketch__ZoneLabel(ZONE_LEFT, layout.PlanLabelY, state.PlanLabel);
        html  +=  '<rect x="' + R(px) + '" y="' + R(py) + '" width="' + R(planW) + '" height="' + R(planH) + '"'
              +      ' class="' + CLS + 'GlazeFill"></rect>';
        html  +=  '<rect x="' + R(px) + '" y="' + R(py) + '" width="' + R(planW) + '" height="' + R(planH) + '"'
              +      ' class="' + CLS + 'Main"></rect>';

        if (state.RoofForm === FORM_PYRAMID) {
            var cx  =  px + planW / 2;
            var cy  =  py + planH / 2;
            html   +=  VghLantern__CreationWizard__Sketch__Line(px, py, cx, cy, CLS + 'Hip');
            html   +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py, cx, cy, CLS + 'Hip');
            html   +=  VghLantern__CreationWizard__Sketch__Line(px, py + planH, cx, cy, CLS + 'Hip');
            html   +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py + planH, cx, cy, CLS + 'Hip');
        } else {
            // Equal pitches put the hip lines at 45 degrees in plan, so the
            // ridge inset from each end is half the short plan side whichever
            // axis happens to be the longer one.
            var inset  =  Math.min(planW, planH) / 2;
            if (planW >= planH) {
                var ry   =  py + planH / 2;
                html    +=  VghLantern__CreationWizard__Sketch__Line(px, py, px + inset, ry, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px, py + planH, px + inset, ry, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py, px + planW - inset, ry, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py + planH, px + planW - inset, ry, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px + inset, ry, px + planW - inset, ry, CLS + 'Ridge');
            } else {
                var rx   =  px + planW / 2;
                html    +=  VghLantern__CreationWizard__Sketch__Line(px, py, rx, py + inset, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py, rx, py + inset, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px, py + planH, rx, py + planH - inset, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(px + planW, py + planH, rx, py + planH - inset, CLS + 'Hip');
                html    +=  VghLantern__CreationWizard__Sketch__Line(rx, py + inset, rx, py + planH - inset, CLS + 'Ridge');
            }
        }

        html  +=  VghLantern__CreationWizard__Sketch__DimH(
            px, px + planW, py + planH + DIM_OFFSET,
            String(Math.round(state.LengthMm)), state.ActiveKey === 'length');
        html  +=  VghLantern__CreationWizard__Sketch__DimV(
            px + planW + DIM_OFFSET, py, py + planH,
            String(Math.round(state.DepthMm)), state.ActiveKey === 'width');

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Elevation View Builder
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build One Finial Outline Planted on the Ridge
    // ------------------------------------------------------------
    // The component's baked front elevation is nested as its own svg so its
    // native viewBox keeps the outline in proportion at any planted size.
    function VghLantern__CreationWizard__Sketch__FinialGlyph(finialOption, centreX, baseY, scale) {
        var R        =  VghLantern__CreationWizard__Sketch__Round;
        var preview  =  finialOption.Preview2d;
        var viewBox  =  String(preview.ViewBox || '').trim().split(/[\s,]+/);
        if (viewBox.length !== 4) return '';

        var boxW  =  parseFloat(viewBox[2]);
        var boxH  =  parseFloat(viewBox[3]);
        if (!isFinite(boxW) || !isFinite(boxH) || boxW <= 0 || boxH <= 0) return '';

        var drawH  =  finialOption.HeightMm * scale;
        var drawW  =  drawH * (boxW / boxH);

        return '<svg x="' + R(centreX - drawW / 2) + '" y="' + R(baseY - drawH) + '"'
             +     ' width="' + R(drawW) + '" height="' + R(drawH) + '"'
             +     ' viewBox="' + VghLantern__CreationWizard__Sketch__Escape(preview.ViewBox) + '"'
             +     ' preserveAspectRatio="xMidYMax meet" class="' + CLS + 'Component">'
             +     '<path d="' + VghLantern__CreationWizard__Sketch__Escape(preview.PathData) + '"'
             +         ' fill="none" vector-effect="non-scaling-stroke"></path>'
             + '</svg>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Front Elevation with Roof, Bands and Finials
    // ------------------------------------------------------------
    // Looking square onto the long face: the silhouette rises from the eaves to
    // the ridge over half the short plan span, so the roof height is real
    // trigonometry rather than a drawn guess. The frame and builders upstand
    // bands underneath come from the pending lantern's own stored heights, and
    // the whole view stands on the same scale and centreline as the plan above.
    function VghLantern__CreationWizard__Sketch__BuildElevation(state, layout) {
        var R          =  VghLantern__CreationWizard__Sketch__Round;
        var scale      =  layout.Scale;
        var isPyramid  =  state.RoofForm === FORM_PYRAMID;
        var ridgeMm    =  isPyramid ? 0 : Math.max(0, state.LengthMm - state.DepthMm);

        var elevW      =  state.LengthMm * scale;
        var ex         =  layout.CentreX - elevW / 2;
        var finialMm   =  layout.HasFinial ? state.FinialOption.HeightMm : 0;

        var ridgeY     =  layout.ElevTop + finialMm * scale;
        var eavesY     =  ridgeY + layout.RoofMm * scale;
        var upstandY   =  eavesY + state.FrameHeightMm * scale;
        var groundY    =  upstandY + state.UpstandHeightMm * scale;
        var cx         =  layout.CentreX;
        var ridgeHalf  =  (ridgeMm * scale) / 2;

        var html  =  '';
        html  +=  VghLantern__CreationWizard__Sketch__ZoneLabel(ZONE_LEFT, layout.ElevLabelY, state.ElevationLabel);
        html  +=  VghLantern__CreationWizard__Sketch__PitchGlyph(state.PitchDegrees, layout.ElevLabelY, state.ActiveKey === 'pitch');

        // Builders upstand band (site-built, grey) under the Vale frame band
        html  +=  '<rect x="' + R(ex) + '" y="' + R(upstandY) + '" width="' + R(elevW) + '" height="' + R(groundY - upstandY) + '"'
              +      ' class="' + CLS + 'Upstand"></rect>';
        html  +=  '<rect x="' + R(ex) + '" y="' + R(eavesY) + '" width="' + R(elevW) + '" height="' + R(upstandY - eavesY) + '"'
              +      ' class="' + CLS + 'Main"></rect>';

        // Roof silhouette: trapezoid collapsing to a triangle when no ridge
        // survives the projection (pyramid, or width entered over length)
        var points  =  '';
        if (ridgeHalf > 0.5) {
            points  =  R(ex) + ',' + R(eavesY) + ' ' + R(cx - ridgeHalf) + ',' + R(ridgeY) + ' '
                    +  R(cx + ridgeHalf) + ',' + R(ridgeY) + ' ' + R(ex + elevW) + ',' + R(eavesY);
        } else {
            points  =  R(ex) + ',' + R(eavesY) + ' ' + R(cx) + ',' + R(ridgeY) + ' ' + R(ex + elevW) + ',' + R(eavesY);
        }
        html  +=  '<polygon points="' + points + '" class="' + CLS + 'RoofFace"></polygon>';
        if (ridgeHalf > 0.5) {
            html  +=  VghLantern__CreationWizard__Sketch__Line(cx - ridgeHalf, ridgeY, cx + ridgeHalf, ridgeY, CLS + 'Ridge');
        }

        if (layout.HasFinial) {
            if (ridgeHalf > 0.5) {
                html  +=  VghLantern__CreationWizard__Sketch__FinialGlyph(state.FinialOption, cx - ridgeHalf, ridgeY, scale);
                html  +=  VghLantern__CreationWizard__Sketch__FinialGlyph(state.FinialOption, cx + ridgeHalf, ridgeY, scale);
            } else {
                html  +=  VghLantern__CreationWizard__Sketch__FinialGlyph(state.FinialOption, cx, ridgeY, scale);
            }
        }

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sketch Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Complete Preview Sketch SVG Markup
    // ------------------------------------------------------------
    // state : { LengthMm, DepthMm, PitchDegrees, RoofForm, UpstandHeightMm,
    //           FrameHeightMm, FinialOption, ActiveKey, PlanLabel, ElevationLabel }
    function VghLantern__CreationWizard__PreviewSketch__Build(state) {
        var safe  =  state
                  && isFinite(state.LengthMm)      && state.LengthMm      > 0
                  && isFinite(state.DepthMm)       && state.DepthMm       > 0
                  && isFinite(state.PitchDegrees)  && state.PitchDegrees  > 0;

        var html  =  '<svg class="' + CLS + '" viewBox="0 0 ' + CANVAS_W + ' ' + CANVAS_H + '"'
                  +      ' preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live lantern preview sketch">';

        if (safe) {
            var layout  =  VghLantern__CreationWizard__Sketch__SolveLayout(state);
            html  +=  VghLantern__CreationWizard__Sketch__BuildPlan(state, layout);
            html  +=  VghLantern__CreationWizard__Sketch__BuildElevation(state, layout);
        }

        html  +=  '</svg>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__CreationWizard__PreviewSketch__Build : VghLantern__CreationWizard__PreviewSketch__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__CreationWizard__PreviewSketch  =  VghLantern__CreationWizard__PreviewSketch;
