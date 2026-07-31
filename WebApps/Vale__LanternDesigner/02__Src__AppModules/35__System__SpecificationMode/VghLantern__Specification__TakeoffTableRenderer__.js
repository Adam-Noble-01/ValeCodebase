/* =============================================================================
   VGHLANTERN - SPECIFICATION | TAKEOFF TABLE RENDERER
   =============================================================================

   FILE       : VghLantern__Specification__TakeoffTableRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - TakeoffTableRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render takeoff quantity tables - lengths, areas and component counts
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the three quantity tables the specification prints: linear section
     lengths, glazing areas and discrete component counts.
   - Columns come from config, so a column can be added or reordered without
     touching this module.
   - Formats values by column key: linear metres, square metres and counts each
     carry their own decimal places and unit suffix.

   -----------------------------------------------------------------------------

   WHY ONE GENERIC TABLE BUILDER FOR THREE TABLES:
   All three are the same shape: a column list, a row list and an optional totals
   row. Writing three near-identical renderers would guarantee they drift, so the
   difference between them lives entirely in config plus a per-table totals resolver.

   ============================================================================= */

// =============================================================================
// REGION | Specification Takeoff Table Renderer Module
// =============================================================================

const VghLantern__Specification__TakeoffTableRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_TABLE        =  'VghLantern__Spec__Table';
    const CSS_HEAD_CELL    =  'VghLantern__Spec__TableHeadCell';
    const CSS_CELL         =  'VghLantern__Spec__TableCell';
    const CSS_TOTALS_ROW   =  'VghLantern__Spec__TableTotalsRow';
    const CSS_EMPTY        =  'VghLantern__Spec__TableEmpty';
    const CSS_ALIGN_RIGHT  =  'VghLantern__Spec__TableCell--right';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Column Keys That Carry Units
    // ------------------------------------------------------------
    const LINEAR_KEYS  =  ['LengthMEach', 'LengthMTotal'];
    const AREA_KEYS    =  ['AreaSqMEach', 'AreaSqMTotal'];
    const MM_KEYS      =  ['WidthMm', 'DepthMm', 'LengthMmEach', 'AreaSqMmEach', 'SectionWidthMm', 'SectionHeightMm'];
    const PITCH_KEYS   =  ['PitchDegrees'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Formatting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Specification Config Root
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Tables Config Block
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__TablesConfig() {
        return VghLantern__TakeoffTable__SpecConfig()['VghLantern__Specification__Config__Tables'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Formatting Config Block
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__FormattingConfig() {
        return VghLantern__TakeoffTable__SpecConfig()['VghLantern__Specification__Config__Formatting'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Cell Value According to Its Column Key
    // ------------------------------------------------------------
    // Unit suffixes and decimal places are driven by the column key rather than by
    // the table, so a length column reads identically wherever it appears.
    function VghLantern__TakeoffTable__FormatValue(columnKey, rawValue) {
        var fmt          =  VghLantern__TakeoffTable__FormattingConfig();
        var placeholder  =  fmt.BlankValuePlaceholder || '-';

        if (rawValue === undefined || rawValue === null || rawValue === '') return placeholder;

        if (LINEAR_KEYS.indexOf(columnKey) !== -1) {
            var linearDp  =  (typeof fmt.LinearDecimalPlaces === 'number') ? fmt.LinearDecimalPlaces : 2;
            return Number(rawValue).toFixed(linearDp) + (fmt.LinearUnitSuffix || ' m');
        }

        if (AREA_KEYS.indexOf(columnKey) !== -1) {
            var areaDp  =  (typeof fmt.AreaDecimalPlaces === 'number') ? fmt.AreaDecimalPlaces : 3;
            return Number(rawValue).toFixed(areaDp) + (fmt.AreaUnitSuffix || ' m2');
        }

        if (MM_KEYS.indexOf(columnKey) !== -1)    return Math.round(Number(rawValue)) + (fmt.DimensionUnitSuffix || ' mm');
        if (PITCH_KEYS.indexOf(columnKey) !== -1) return Number(rawValue) + (fmt.PitchUnitSuffix || ' deg');

        return String(rawValue);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generic Table Builder
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Table Header Row
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__BuildHead(columns) {
        var html  =  '<thead><tr>';
        var i, alignClass;

        for (i = 0; i < columns.length; i++) {
            alignClass  =  columns[i].Align === 'right' ? ' ' + CSS_ALIGN_RIGHT : '';
            html  +=  '<th class="' + CSS_HEAD_CELL + alignClass + '">' +
                      VghLantern__TakeoffTable__Escape(columns[i].Label || columns[i].Key) + '</th>';
        }

        return html + '</tr></thead>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Table Body Rows
    // ------------------------------------------------------------
    function VghLantern__TakeoffTable__BuildBody(columns, rows) {
        var html  =  '<tbody>';
        var i, j, alignClass;

        for (i = 0; i < rows.length; i++) {
            html  +=  '<tr>';
            for (j = 0; j < columns.length; j++) {
                alignClass  =  columns[j].Align === 'right' ? ' ' + CSS_ALIGN_RIGHT : '';
                html  +=  '<td class="' + CSS_CELL + alignClass + '">' +
                          VghLantern__TakeoffTable__Escape(
                              VghLantern__TakeoffTable__FormatValue(columns[j].Key, rows[i][columns[j].Key])
                          ) + '</td>';
            }
            html  +=  '</tr>';
        }

        return html + '</tbody>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build an Optional Totals Row
    // ------------------------------------------------------------
    // totalsMap keys onto column keys, so a table only totals the columns where a
    // total is meaningful. A profile reference has no total and is left blank.
    function VghLantern__TakeoffTable__BuildTotals(columns, totalsMap, totalsLabel) {
        if (!totalsMap) return '';

        var html  =  '<tfoot><tr class="' + CSS_TOTALS_ROW + '">';
        var i, columnKey, alignClass, cellText;

        for (i = 0; i < columns.length; i++) {
            columnKey   =  columns[i].Key;
            alignClass  =  columns[i].Align === 'right' ? ' ' + CSS_ALIGN_RIGHT : '';

            if (i === 0) {
                cellText  =  totalsLabel || 'Total';
            } else if (Object.prototype.hasOwnProperty.call(totalsMap, columnKey)) {
                cellText  =  VghLantern__TakeoffTable__FormatValue(columnKey, totalsMap[columnKey]);
            } else {
                cellText  =  '';
            }

            html  +=  '<td class="' + CSS_CELL + alignClass + '">' +
                      VghLantern__TakeoffTable__Escape(cellText) + '</td>';
        }

        return html + '</tr></tfoot>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Complete Quantity Table
    // ------------------------------------------------------------
    function VghLantern__Specification__TakeoffTableRenderer__BuildTable(columns, rows, totalsMap, totalsLabel) {
        var tablesCfg  =  VghLantern__TakeoffTable__TablesConfig();

        if (!Array.isArray(columns) || !columns.length) return '';
        if (!Array.isArray(rows) || !rows.length) {
            return '<p class="' + CSS_EMPTY + '">' +
                   VghLantern__TakeoffTable__Escape(tablesCfg.EmptyTableMessage || 'Nothing scheduled in this section.') +
                   '</p>';
        }

        var showTotals  =  tablesCfg.ShowTotalsRow !== false;

        return '<table class="' + CSS_TABLE + '">' +
               VghLantern__TakeoffTable__BuildHead(columns) +
               VghLantern__TakeoffTable__BuildBody(columns, rows) +
               (showTotals ? VghLantern__TakeoffTable__BuildTotals(columns, totalsMap, totalsLabel) : '') +
               '</table>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Table Variants
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Linear Section Lengths Table
    // ------------------------------------------------------------
    function VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable(takeoff) {
        if (!takeoff) return '';

        var columns  =  VghLantern__TakeoffTable__TablesConfig().LinearColumns || [];
        var totals   =  {
            LengthMEach  : takeoff.Totals.LinearMEach,
            LengthMTotal : takeoff.Totals.LinearMTotal
        };

        return VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            columns, takeoff.Linear, totals, 'Total linear'
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Glazing Areas Table
    // ------------------------------------------------------------
    // No totals row: the takeoff already emits a "Total Gross" area row, and a
    // totals row beneath it would double-count the slopes.
    function VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable(takeoff) {
        if (!takeoff) return '';

        var columns  =  VghLantern__TakeoffTable__TablesConfig().AreaColumns || [];
        return VghLantern__Specification__TakeoffTableRenderer__BuildTable(columns, takeoff.Areas, null, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Component Counts Table
    // ------------------------------------------------------------
    function VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable(takeoff) {
        if (!takeoff) return '';

        var columns  =  VghLantern__TakeoffTable__TablesConfig().ComponentColumns || [];
        var totals   =  { CountTotal : takeoff.Totals.ComponentCountTotal };

        return VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            columns, takeoff.Components, totals, 'Total components'
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Aggregated Works Order Table
    // ------------------------------------------------------------
    // Multi-lantern projects only. Aggregate rows carry totals but no per-lantern
    // figures, so the "each" columns are filtered out rather than printed blank.
    function VghLantern__Specification__TakeoffTableRenderer__BuildAggregateTable(aggregate) {
        if (!aggregate) return '';

        var tablesCfg    =  VghLantern__TakeoffTable__TablesConfig();
        var linearCols   =  (tablesCfg.LinearColumns || []).filter(function(column) {
            return column.Key !== 'LengthMEach' && column.Key !== 'MemberCount';
        });
        var componentCols =  (tablesCfg.ComponentColumns || []).filter(function(column) {
            return column.Key !== 'CountEach';
        });

        var html  =  VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            linearCols, aggregate.Linear,
            { LengthMTotal : aggregate.Totals.LinearMTotal }, 'Total linear'
        );

        html  +=  VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            componentCols, aggregate.Components,
            { CountTotal : aggregate.Totals.ComponentCountTotal }, 'Total components'
        );

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
        VghLantern__Specification__TakeoffTableRenderer__BuildTable           : VghLantern__Specification__TakeoffTableRenderer__BuildTable,
        VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable     : VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable,
        VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable       : VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable,
        VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable  : VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable,
        VghLantern__Specification__TakeoffTableRenderer__BuildAggregateTable  : VghLantern__Specification__TakeoffTableRenderer__BuildAggregateTable
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__TakeoffTableRenderer  =  VghLantern__Specification__TakeoffTableRenderer;
