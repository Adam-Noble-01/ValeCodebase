/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | SETTING OUT LEGEND
   =============================================================================

   FILE       : VghLantern__Viewport3d__SetOutLegend__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - SetOutLegend
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Name every construction line on screen, and report the checks
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Two panels in one: a colour key for the setting-out linework, and the result
     of every measured-against-reported check the setting-out model ran.
   - The key is built from the manifest of what was ACTUALLY drawn, never from a
     hardcoded list. A line class switched off in config disappears from the key
     by itself, so the key can never claim to show something that is not there.
   - Presentation only. It reads two plain data structures from the pipeline and
     formats them. It measures nothing and decides nothing.

   -----------------------------------------------------------------------------

   WHY THE CHECKS ARE HERE RATHER THAN IN THE CONSOLE

   The setting-out view exists because a factory cuts metal to these datums. Seeing
   a construction triangle drawn from real solved vertices is half the check; the
   other half is whether the number the solver PUBLISHES for that triangle agrees
   with the triangle on screen. A disagreement means a drawing annotation and the
   model are telling two different stories, and that belongs on screen next to the
   geometry, not buried in a developer console.

   Only failures are listed by default. A clean model reports a single line.

   ============================================================================= */

// =============================================================================
// REGION | Dedicated 3D Viewport Setting Out Legend Module
// =============================================================================

const VghLantern__Viewport3d__SetOutLegend = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_PANEL        =  'VghLantern__Viewport3d__SetOutLegend';
    const CSS_SECTION      =  'VghLantern__Viewport3d__SetOutSection';
    const CSS_TITLE        =  'VghLantern__Viewport3d__SetOutTitle';
    const CSS_ROW          =  'VghLantern__Viewport3d__SetOutRow';
    const CSS_ROW_ORIGIN   =  'VghLantern__Viewport3d__SetOutRow--origin';
    const CSS_ORIGIN       =  'VghLantern__Viewport3d__SetOutOrigin';
    const CSS_SWATCH       =  'VghLantern__Viewport3d__SetOutSwatch';
    const CSS_LABEL        =  'VghLantern__Viewport3d__SetOutLabel';
    const CSS_COUNT        =  'VghLantern__Viewport3d__SetOutCount';

    const CSS_CHECK_OK     =  'VghLantern__Viewport3d__SetOutCheck--pass';
    const CSS_CHECK_FAIL   =  'VghLantern__Viewport3d__SetOutCheck--fail';
    const CSS_CHECK_ROW    =  'VghLantern__Viewport3d__SetOutCheckRow';
    const CSS_CHECK_DELTA  =  'VghLantern__Viewport3d__SetOutCheckDelta';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Static Copy
    // ------------------------------------------------------------
    const TITLE_KEY        =  'Setting Out Key';
    const TITLE_CHECKS     =  'Datum Checks';
    const MESSAGE_ALL_PASS =  'All checks agree.';
    const MESSAGE_NO_MODEL =  'No setting out model built.';
    const LABEL_UNPUBLISHED =  'not published by the solver';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Line Type Swatch Geometry and Patterns
    // ------------------------------------------------------------
    // The viewBox matches the CSS box's aspect ratio, otherwise the default
    // preserveAspectRatio letterboxes the line and the swatch stops filling its
    // column.
    //
    // The dash arrays read as the same line type the 3D view stamps into geometry.
    // Approximate by nature - the swatch is a few dozen pixels and the real
    // pattern is stated in millimetres - so they are tuned to be recognisable at a
    // glance rather than to scale.
    const SWATCH_VIEWBOX_W  =  52;
    const SWATCH_VIEWBOX_H  =  10;

    const SWATCH_DASH_CSS  =  {
        solid   : 'none',
        dotted  : '2 4',
        dashed  : '13 7',
        dashDot : '16 6 2 6'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel Reference and Last Payload
    // ------------------------------------------------------------
    let VghLantern__SetOutLegend__PanelElement  =  null;                      // <-- The floating panel this module owns
    let VghLantern__SetOutLegend__Legend        =  [];                        // <-- Manifest of what was drawn
    let VghLantern__SetOutLegend__Model         =  null;                      // <-- Setting out model, for its checks
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Formatting Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Content Use
    // ------------------------------------------------------------
    function VghLantern__SetOutLegend__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Signed Millimetre Delta
    // ------------------------------------------------------------
    function VghLantern__SetOutLegend__Delta(value) {
        var rounded  =  Math.round(Number(value) * 100) / 100;
        return (rounded > 0 ? '+' : '') + rounded.toFixed(2);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Level Against the Working Datum
    // ------------------------------------------------------------
    // Always signed, so a level reads as a direction from the datum rather than as
    // a bare number. Zero carries no sign, because zero IS the datum. Fractions are
    // kept to one place - a ridge level derived from a pitch angle is genuinely
    // fractional, and rounding it to the millimetre in the key would disagree with
    // the same figure elsewhere.
    function VghLantern__SetOutLegend__Level(valueMm) {
        var rounded  =  Math.round(Number(valueMm) * 10) / 10;
        if (rounded === 0) return '0';

        var text  =  Math.abs(rounded) % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
        return (rounded > 0 ? '+' : '') + text;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Figure a Key Row Reports
    // ------------------------------------------------------------
    // A datum reports its level, which is what the row is actually about. A sloped
    // datum reports the range it spans. Everything else reports how many of it
    // there are.
    function VghLantern__SetOutLegend__RowValue(row) {
        if (row.RelativeLevelMm !== null && row.RelativeLevelMm !== undefined) {
            return VghLantern__SetOutLegend__Level(row.RelativeLevelMm) + ' mm';
        }
        if (row.RelativeRangeMm) {
            return VghLantern__SetOutLegend__Level(row.RelativeRangeMm.MinMm) + ' to ' +
                   VghLantern__SetOutLegend__Level(row.RelativeRangeMm.MaxMm) + ' mm';
        }
        return String(row.InstanceCount === undefined ? '' : row.InstanceCount);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build an Inline SVG Swatch for a Line Type
    // ------------------------------------------------------------
    // Drawn rather than styled with a border, because a border cannot show a
    // dash-dot and the whole point of the key is to distinguish the line types.
    function VghLantern__SetOutLegend__Swatch(colourHex, patternKey) {
        var dash  =  SWATCH_DASH_CSS[patternKey] || SWATCH_DASH_CSS.solid;

        return '<svg class="' + CSS_SWATCH + '" viewBox="0 0 ' + SWATCH_VIEWBOX_W + ' ' + SWATCH_VIEWBOX_H + '" aria-hidden="true">' +
               '<line x1="1" y1="' + (SWATCH_VIEWBOX_H / 2) + '" x2="' + (SWATCH_VIEWBOX_W - 1) + '" y2="' + (SWATCH_VIEWBOX_H / 2) + '"' +
               ' stroke="' + VghLantern__SetOutLegend__Escape(colourHex) + '"' +
               ' stroke-width="3" stroke-linecap="round"' +
               (dash === 'none' ? '' : ' stroke-dasharray="' + dash + '"') +
               '></line></svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Colour Key From the Drawn Manifest
    // ------------------------------------------------------------
    // The datum row sitting at exactly zero is emphasised, because it is not one
    // level among several - it is the level every other figure in the panel is
    // measured from.
    function VghLantern__SetOutLegend__BuildKey() {
        var rows  =  VghLantern__SetOutLegend__Legend;
        if (!rows || rows.length === 0) return '';

        var model   =  VghLantern__SetOutLegend__Model;
        var origin  =  (model && model.Meta) ? model.Meta.DatumOrigin : null;

        var html  =  '<div class="' + CSS_SECTION + '">' +
                     '<div class="' + CSS_TITLE + '">' + TITLE_KEY + '</div>';

        if (origin) {
            html  +=  '<div class="' + CSS_ORIGIN + '">' +
                      'Levels in mm from ' + VghLantern__SetOutLegend__Escape(origin.Label) + ' = 0' +
                      '</div>';
        }

        var i, isOrigin;
        for (i = 0; i < rows.length; i++) {
            isOrigin  =  rows[i].RelativeLevelMm === 0;

            html  +=  '<div class="' + CSS_ROW + (isOrigin ? ' ' + CSS_ROW_ORIGIN : '') + '">' +
                      VghLantern__SetOutLegend__Swatch(rows[i].Colour, rows[i].Pattern) +
                      '<span class="' + CSS_LABEL + '">' + VghLantern__SetOutLegend__Escape(rows[i].Label) + '</span>' +
                      '<span class="' + CSS_COUNT + '">' +
                      VghLantern__SetOutLegend__Escape(VghLantern__SetOutLegend__RowValue(rows[i])) +
                      '</span></div>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Check Results Section
    // ------------------------------------------------------------
    // Failures first and in full; passes collapsed to a count. A reviewer needs to
    // know instantly whether anything disagrees, and only then which thing.
    function VghLantern__SetOutLegend__BuildChecks() {
        var model  =  VghLantern__SetOutLegend__Model;

        var html  =  '<div class="' + CSS_SECTION + '">' +
                     '<div class="' + CSS_TITLE + '">' + TITLE_CHECKS + '</div>';

        if (!model || !Array.isArray(model.Checks) || model.Checks.length === 0) {
            return html + '<div class="' + CSS_CHECK_ROW + '">' + MESSAGE_NO_MODEL + '</div></div>';
        }

        var SettingOutModel  =  window.VghLantern__Geometry__SettingOutModel;
        var summary          =  SettingOutModel
            ? SettingOutModel.VghLantern__SettingOutModel__CheckSummary(model)
            : { Total : model.Checks.length, Passed : 0, Failed : 0, Unpublished : 0 };

        var i, check;
        for (i = 0; i < model.Checks.length; i++) {
            check  =  model.Checks[i];
            if (check.Status !== 'fail') continue;

            html  +=  '<div class="' + CSS_CHECK_ROW + ' ' + CSS_CHECK_FAIL + '">' +
                      '<span class="' + CSS_LABEL + '">' + VghLantern__SetOutLegend__Escape(check.Label) + '</span>' +
                      '<span class="' + CSS_CHECK_DELTA + '">' + VghLantern__SetOutLegend__Delta(check.DeltaMm) + '</span>' +
                      '</div>';
        }

        for (i = 0; i < model.Checks.length; i++) {
            check  =  model.Checks[i];
            if (check.Status !== 'unpublished') continue;

            html  +=  '<div class="' + CSS_CHECK_ROW + '">' +
                      '<span class="' + CSS_LABEL + '">' + VghLantern__SetOutLegend__Escape(check.Label) + '</span>' +
                      '<span class="' + CSS_CHECK_DELTA + '">' + LABEL_UNPUBLISHED + '</span>' +
                      '</div>';
        }

        if (summary.Failed === 0) {
            html  +=  '<div class="' + CSS_CHECK_ROW + ' ' + CSS_CHECK_OK + '">' + MESSAGE_ALL_PASS + '</div>';
        }

        html  +=  '<div class="' + CSS_CHECK_ROW + '">' +
                  '<span class="' + CSS_LABEL + '">' + summary.Passed + ' of ' + summary.Total + ' agree, within ' +
                  (model.Meta ? model.Meta.ToleranceMm : '?') + ' mm</span>' +
                  '</div>';

        return html + '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Panel Inside a Host
    // ------------------------------------------------------------
    // Idempotent. Starts hidden, because the solid model is the default mode.
    function VghLantern__Viewport3d__SetOutLegend__Render(hostElement) {
        if (!hostElement) return;

        if (VghLantern__SetOutLegend__PanelElement && VghLantern__SetOutLegend__PanelElement.parentNode === hostElement) {
            return;
        }

        var panel        =  document.createElement('div');
        panel.className  =  CSS_PANEL;
        panel.hidden     =  true;

        hostElement.appendChild(panel);
        VghLantern__SetOutLegend__PanelElement  =  panel;
    }
    // ------------------------------------------------------------


    // FUNCTION | Supply the Drawn Manifest and the Setting Out Model
    // ------------------------------------------------------------
    // Called after every redraw. Stored rather than rendered immediately, because
    // whether the panel is on screen at all is a question of display mode.
    function VghLantern__Viewport3d__SetOutLegend__SetContent(legendRows, settingOutModel) {
        VghLantern__SetOutLegend__Legend  =  Array.isArray(legendRows) ? legendRows : [];
        VghLantern__SetOutLegend__Model   =  settingOutModel || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Panel for a Display Mode
    // ------------------------------------------------------------
    // Visible in any mode that draws setting-out linework, hidden in the plain
    // solid model mode where a key would describe nothing on screen.
    function VghLantern__Viewport3d__SetOutLegend__SetDisplayMode(modeKey) {
        var panel  =  VghLantern__SetOutLegend__PanelElement;
        if (!panel) return;

        if (modeKey === 'solid3d' || !modeKey) {
            panel.hidden  =  true;
            return;
        }

        panel.innerHTML  =  VghLantern__SetOutLegend__BuildKey() +
                            VghLantern__SetOutLegend__BuildChecks();
        panel.hidden     =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Panel From the Document
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__SetOutLegend__Dispose() {
        var panel  =  VghLantern__SetOutLegend__PanelElement;
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);

        VghLantern__SetOutLegend__PanelElement  =  null;
        VghLantern__SetOutLegend__Legend        =  [];
        VghLantern__SetOutLegend__Model         =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__SetOutLegend__Render          : VghLantern__Viewport3d__SetOutLegend__Render,
        VghLantern__Viewport3d__SetOutLegend__SetContent      : VghLantern__Viewport3d__SetOutLegend__SetContent,
        VghLantern__Viewport3d__SetOutLegend__SetDisplayMode  : VghLantern__Viewport3d__SetOutLegend__SetDisplayMode,
        VghLantern__Viewport3d__SetOutLegend__Dispose         : VghLantern__Viewport3d__SetOutLegend__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__SetOutLegend  =  VghLantern__Viewport3d__SetOutLegend;
