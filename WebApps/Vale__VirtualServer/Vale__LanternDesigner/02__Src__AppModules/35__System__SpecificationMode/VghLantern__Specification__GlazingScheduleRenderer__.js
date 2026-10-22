/* =============================================================================
   VGHLANTERN - SPECIFICATION | GLAZING SCHEDULE RENDERER
   =============================================================================

   FILE       : VghLantern__Specification__GlazingScheduleRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - GlazingScheduleRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw a glazing schedule as SVG and markup on screen, and into a PDF
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - Renders what VghLantern__Specification__GlazingSchedule describes. That module
     decides what is drawn and where; this one only paints it, two ways from the one
     description: SVG for the Specification tab and the Preview and Send page, and
     jsPDF calls for the exported file. A dumb renderer of a shared description is
     what keeps the two surfaces the same drawing.
   - Builds the markup of the Specification tab's Roof Glazing Panel Units section,
     and the blocks (note, plan, unit table with its total glass) the pack's page of
     the same name is made of.
   - Lays a schedule out on pack pages (LayoutPages) for the preview AND the PDF.
   - Never builds a schedule early: the section builder asks GlazingSchedule for each
     lantern at the moment it draws it, and every other function here is handed one.

   ---------------------------------------------------------------------------

   WHY THE PACK PAGES ARE LAID OUT HERE AND NOT BY THE PREVIEW'S PAGINATOR:
   Every block on a glazing page is a known size in millimetres: the plan, the table
   header and each panel row, whose height is the cut drawing's. The preview's
   FlowPaginator sizes the first piece of a table it splits to a whole page, so a
   table that does not fit under the plan would start on the next page on screen
   while the PDF ran its rows straight on under the plan, and the two would number
   their pages differently. Instead one layout decides what lands on which page and
   where, and the preview and the PDF both draw that layout, header repeated on every
   page the table runs onto. The drawing sheet is the same idea: one description,
   two renderers.

   WHY THE DRAWING COLUMN IS A FIXED WIDTH:
   Every cut drawing is laid out for one cell size, in GlazingSchedule, so the drawing
   column is that size on every page and every paper. The text columns share what is
   left by weight: A3 document paper widens them, never the drawings.

   ============================================================================= */

// =============================================================================
// REGION | Glazing Schedule Renderer Module
// =============================================================================

const VghLantern__Specification__GlazingScheduleRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_TABLE          =  'VghLantern__Spec__Table';
    const CSS_HEAD_CELL      =  'VghLantern__Spec__TableHeadCell';
    const CSS_CELL           =  'VghLantern__Spec__TableCell';
    const CSS_ALIGN_RIGHT    =  'VghLantern__Spec__TableCell--right';
    const CSS_EMPTY          =  'VghLantern__Spec__TableEmpty';
    const CSS_SUBHEADING     =  'VghLantern__Spec__SubHeading';
    const CSS_GLAZING_TABLE  =  'VghLantern__Spec__GlazingTable';
    const CSS_DRAWING_CELL   =  'VghLantern__Spec__GlazingDrawingCell';
    const CSS_SECONDARY      =  'VghLantern__Spec__GlazingSecondary';
    const CSS_CELL_TEXT      =  'VghLantern__Spec__GlazingTextCell';
    const CSS_CELL_LABEL     =  'VghLantern__Spec__GlazingCellLabel';
    const CSS_CELL_VALUE     =  'VghLantern__Spec__GlazingCellValue';
    const CSS_TOTALS_ROW     =  'VghLantern__Spec__TableTotalsRow';
    const CSS_PLAN           =  'VghLantern__Spec__GlazingPlan';
    const CSS_PLAN_CAPTION   =  'VghLantern__Spec__GlazingPlanCaption';
    const CSS_NOTE           =  'VghLantern__Spec__GlazingNote';
    const CSS_SVG            =  'VghLantern__Spec__GlazingSvg';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config and Units
    // ------------------------------------------------------------
    const SCHEDULE_CONFIG_KEY  =  'VghLantern__Specification__Config__GlazingSchedule';
    const CONFIG_LABEL         =  'Na__Specification__Config.json -> ' + SCHEDULE_CONFIG_KEY;
    const MM_PER_POINT         =  0.352778;                                    // <-- One point in millimetres: how a type size is written to a PDF
    const CAPTION_LINE_RATIO   =  1.3;                                         // <-- A caption's line box as a fraction of its type size
    const SANITY_INK           =  '#172b3a';                                    // <-- Guards a malformed hex, as SheetChrome does; not a design value
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Pack Page Block Kinds
    // ------------------------------------------------------------
    // What LayoutPages places, and what each surface knows how to draw.
    const BLOCK_MASTHEAD  =  'masthead';
    const BLOCK_NOTE      =  'note';
    const BLOCK_MESSAGE   =  'message';
    const BLOCK_PLAN      =  'plan';
    const BLOCK_TABLE     =  'table';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Glazing Schedule Config Block
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        var spec  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
        return spec[SCHEDULE_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Number Trimmed for Markup
    // ------------------------------------------------------------
    // Three decimals of a millimetre is a micron: more would be bytes no printer uses.
    function VghLantern__GlazingRenderer__N(value) {
        return String(Math.round((Number(value) || 0) * 1000) / 1000);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Hex Colour to an RGB Triplet for jsPDF
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__Rgb(hexColour) {
        var value  =  String(hexColour || '').trim();
        if (!/^#?[0-9a-fA-F]{6}$/.test(value)) value  =  SANITY_INK;
        value  =  value.replace('#', '');
        return {
            R : parseInt(value.substring(0, 2), 16),
            G : parseInt(value.substring(2, 4), 16),
            B : parseInt(value.substring(4, 6), 16)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Renderer
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Serialise One Primitive to SVG Markup
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__PrimitiveToSvg(primitive, fontFamily) {
        var N       =  VghLantern__GlazingRenderer__N;
        var points  =  primitive.Points
            ? primitive.Points.map(function(p) { return N(p[0]) + ',' + N(p[1]); }).join(' ')
            : '';
        var dash    =  (Array.isArray(primitive.Dash) && primitive.Dash.length)
            ? ' stroke-dasharray="' + primitive.Dash.map(N).join(' ') + '"'
            : '';

        if (primitive.Kind === 'Polygon') {
            return '<polygon points="' + points + '" fill="' + (primitive.Fill || 'none') + '" ' +
                   'stroke="' + (primitive.Stroke || 'none') + '" stroke-width="' + N(primitive.StrokeMm) + '" ' +
                   'stroke-linejoin="round"' + dash + '/>';
        }

        if (primitive.Kind === 'Polyline') {
            return '<polyline points="' + points + '" fill="none" stroke="' + primitive.Stroke + '" ' +
                   'stroke-width="' + N(primitive.StrokeMm) + '" stroke-linecap="butt"' + dash + '/>';
        }

        if (primitive.Kind === 'Circle') {
            return '<circle cx="' + N(primitive.Cx) + '" cy="' + N(primitive.Cy) + '" r="' + N(primitive.R) + '" ' +
                   'fill="' + (primitive.Fill || 'none') + '" stroke="' + (primitive.Stroke || 'none') + '" ' +
                   'stroke-width="' + N(primitive.StrokeMm) + '"/>';
        }

        if (primitive.Kind === 'Text') {
            // Alphabetic baseline, the line jsPDF writes text on, so type sits on the
            // same line on both surfaces.
            var anchor  =  primitive.Align === 'right' ? 'end' : (primitive.Align === 'center' ? 'middle' : 'start');
            return '<text x="' + N(primitive.X) + '" y="' + N(primitive.BaselineY) + '" ' +
                   'font-family="' + VghLantern__GlazingRenderer__Escape(fontFamily) + '" ' +
                   'font-size="' + N(primitive.FontMm) + '" font-weight="' + (primitive.Weight === 'bold' ? '700' : '400') + '" ' +
                   'fill="' + primitive.Colour + '" text-anchor="' + anchor + '">' +
                   VghLantern__GlazingRenderer__Escape(primitive.Text) + '</text>';
        }

        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a Diagram as an SVG Element at Its Paper Size
    // ------------------------------------------------------------
    // The viewBox is the diagram in paper millimetres and the element is sized in
    // millimetres, so it prints at the size it was laid out for and every primitive
    // coordinate is used verbatim.
    function VghLantern__Specification__GlazingScheduleRenderer__ToSvg(diagram, ariaLabel) {
        if (!diagram || !Array.isArray(diagram.Primitives)) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var fontFamily    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(VghLantern__GlazingRenderer__Config(), 'FontFamily', CONFIG_LABEL);
        var N             =  VghLantern__GlazingRenderer__N;
        var body          =  '';
        var i;

        for (i = 0; i < diagram.Primitives.length; i++) {
            body  +=  VghLantern__GlazingRenderer__PrimitiveToSvg(diagram.Primitives[i], fontFamily);
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" class="' + CSS_SVG + '" ' +
               'viewBox="0 0 ' + N(diagram.WidthMm) + ' ' + N(diagram.HeightMm) + '" ' +
               'style="width:' + N(diagram.WidthMm) + 'mm;height:' + N(diagram.HeightMm) + 'mm" ' +
               'role="img" aria-label="' + VghLantern__GlazingRenderer__Escape(ariaLabel || '') + '">' +
               body + '</svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PDF Renderer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Point List as jsPDF's Relative Legs
    // ------------------------------------------------------------
    // jsPDF's lines() takes the first point absolutely and every leg after it as an
    // offset from the one before.
    function VghLantern__GlazingRenderer__Legs(points) {
        var legs  =  [];
        var i;
        for (i = 1; i < points.length; i++) {
            legs.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
        }
        return legs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Primitive Into a jsPDF Document at an Offset
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__PrimitiveToPdf(doc, primitive, ox, oy) {
        var fill, stroke, ink, style;
        var dash  =  (Array.isArray(primitive.Dash) && primitive.Dash.length) ? primitive.Dash : [];

        if (primitive.Kind === 'Polygon' || primitive.Kind === 'Polyline') {
            if (!primitive.Points || primitive.Points.length < 2) return;

            var isPolygon  =  primitive.Kind === 'Polygon';
            if (isPolygon && primitive.Fill) {
                fill  =  VghLantern__GlazingRenderer__Rgb(primitive.Fill);
                doc.setFillColor(fill.R, fill.G, fill.B);
            }
            if (primitive.Stroke) {
                stroke  =  VghLantern__GlazingRenderer__Rgb(primitive.Stroke);
                doc.setDrawColor(stroke.R, stroke.G, stroke.B);
                doc.setLineWidth(primitive.StrokeMm);
            }
            doc.setLineDashPattern(dash, 0);

            // A polygon with no fill is stroked only, so the plan's upstand outline
            // draws as a line rather than a filled block.
            style  =  (isPolygon && primitive.Fill) ? (primitive.Stroke ? 'FD' : 'F') : 'S';
            doc.lines(VghLantern__GlazingRenderer__Legs(primitive.Points),
                      primitive.Points[0][0] + ox, primitive.Points[0][1] + oy, [1, 1], style, isPolygon);
            doc.setLineDashPattern([], 0);
            return;
        }

        if (primitive.Kind === 'Circle') {
            if (primitive.Fill) {
                fill  =  VghLantern__GlazingRenderer__Rgb(primitive.Fill);
                doc.setFillColor(fill.R, fill.G, fill.B);
            }
            if (primitive.Stroke) {
                stroke  =  VghLantern__GlazingRenderer__Rgb(primitive.Stroke);
                doc.setDrawColor(stroke.R, stroke.G, stroke.B);
                doc.setLineWidth(primitive.StrokeMm);
            }
            doc.setLineDashPattern([], 0);
            doc.circle(primitive.Cx + ox, primitive.Cy + oy, primitive.R,
                       primitive.Fill ? (primitive.Stroke ? 'FD' : 'F') : 'S');
            return;
        }

        if (primitive.Kind === 'Text') {
            ink  =  VghLantern__GlazingRenderer__Rgb(primitive.Colour);
            doc.setFont('helvetica', primitive.Weight === 'bold' ? 'bold' : 'normal');
            doc.setFontSize(primitive.FontMm / MM_PER_POINT);
            doc.setTextColor(ink.R, ink.G, ink.B);
            doc.text(primitive.Text, primitive.X + ox, primitive.BaselineY + oy, {
                align    : primitive.Align === 'right' ? 'right' : (primitive.Align === 'center' ? 'center' : 'left'),
                baseline : 'alphabetic'
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw a Diagram Into a jsPDF Document With Its Top Left at x, y
    // ------------------------------------------------------------
    // In build order, which is the SVG's stacking order, so overlaps fall the same way.
    // A primitive that cannot be drawn is reported and skipped rather than ending the
    // export, and the font is put back to the body style the painters expect.
    function VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf(doc, diagram, x, y) {
        if (!doc || !diagram || !Array.isArray(diagram.Primitives)) return;

        var i;
        for (i = 0; i < diagram.Primitives.length; i++) {
            try {
                VghLantern__GlazingRenderer__PrimitiveToPdf(doc, diagram.Primitives[i], x, y);
            } catch (drawError) {
                console.warn('[VghLantern__Specification__GlazingScheduleRenderer] Primitive could not be drawn:', diagram.Primitives[i], drawError);
            }
        }
        doc.setLineDashPattern([], 0);
        doc.setFont('helvetica', 'normal');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Table Columns and Cells
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Schedule's Columns to Widths for One Body Width
    // ------------------------------------------------------------
    // The drawing column keeps its configured millimetres; every other column takes
    // its Weight's share of the rest. Shared by the preview markup and the PDF
    // painter, so a column is the same width on the preview page and on paper.
    function VghLantern__Specification__GlazingScheduleRenderer__ResolveColumns(bodyWidthMm) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var columns       =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(VghLantern__GlazingRenderer__Config(), 'TableColumns', CONFIG_LABEL);
        var fixed         =  0;
        var weights       =  0;
        var i;

        for (i = 0; i < columns.length; i++) {
            if (typeof columns[i].WidthMm === 'number') fixed    +=  columns[i].WidthMm;
            else                                         weights  +=  Number(columns[i].Weight) || 1;
        }

        var spare  =  Math.max(0, (Number(bodyWidthMm) || 0) - fixed);
        return columns.map(function(column) {
            return {
                Key     : column.Key,
                Label   : column.Label || column.Key,
                Align   : column.Align === 'right' ? 'right' : 'left',
                WidthMm : (typeof column.WidthMm === 'number')
                              ? column.WidthMm
                              : spare * ((Number(column.Weight) || 1) / (weights || 1))
            };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Text Lines of One Cell, Main Line First
    // ------------------------------------------------------------
    // The same lines the markup and the PDF print. A second line is the sealed unit's
    // size beneath the top pane's, or the glass panes beneath the glass type.
    function VghLantern__Specification__GlazingScheduleRenderer__CellLines(columnKey, row, schedule) {
        if (columnKey === 'Code')      return [row.Code];
        if (columnKey === 'Quantity')  return [String(row.Quantity)];
        if (columnKey === 'Length')    return [row.LengthText].concat(row.UnitLengthText ? [row.UnitLengthText] : []);
        if (columnKey === 'Width')     return [row.WidthText].concat(row.UnitWidthText ? [row.UnitWidthText] : []);
        if (columnKey === 'Area')      return [row.AreaText].concat(row.UnitAreaText ? [row.UnitAreaText] : []);
        if (columnKey === 'GlassType') return [schedule.GlassType || '-'].concat(schedule.GlassPanes ? [schedule.GlassPanes] : []);
        if (columnKey === 'Thickness') return [schedule.ThicknessText];
        if (columnKey === 'Cavity')    return [schedule.CavityText];
        return [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pack Page Layout
// -----------------------------------------------------------------------------

    // FUNCTION | The Fixed Sizes a Pack Page Is Laid Out From
    // ------------------------------------------------------------
    // A panel row is exactly as tall as its cut drawing plus its padding, which is
    // what lets a page be laid out without measuring anything.
    function VghLantern__Specification__GlazingScheduleRenderer__PageMetrics() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var cfg     =  VghLantern__GlazingRenderer__Config();
        var page    =  cfg.Page    || {};
        var draw    =  cfg.Drawing || {};
        var Num     =  function(block, key) { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(block, key, CONFIG_LABEL); };

        var rowPadding   =  Num(page, 'RowPaddingMm');
        var captionGap   =  Num(page, 'CaptionGapMm');
        var captionFont  =  Num(page, 'CaptionFontMm');
        var valueFont    =  Num(page, 'ValueFontMm');
        var subScale     =  Num(page, 'SecondaryTextScale');

        return {
            BlockGapMm       : Num(page, 'BlockGapMm'),
            HeaderHeightMm   : Num(page, 'HeaderHeightMm'),
            TotalRowHeightMm : Num(page, 'TotalRowHeightMm'),
            CellPaddingMm    : Num(page, 'CellPaddingMm'),
            RowPaddingMm     : rowPadding,
            RowHeightMm      : Num(draw, 'CellHeightMm') + (rowPadding * 2),
            CaptionGapMm     : captionGap,
            CaptionFontMm    : captionFont,
            CaptionHeightMm  : captionGap + (captionFont * CAPTION_LINE_RATIO),
            ValueFontMm      : valueFont,
            SecondaryFontMm  : valueFont * subScale,
            SecondaryColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(page, 'SecondaryTextColour', CONFIG_LABEL),
            LabelFontMm      : Num(page, 'CellLabelFontMm'),
            LabelColour      : ConfigLoader.VghLantern__ConfigLoader__RequireString(page, 'CellLabelColour', CONFIG_LABEL),
            CellLineRatio    : Num(page, 'CellLineRatio')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Lay One Lantern's Schedule Out on Pack Pages
    // ------------------------------------------------------------
    // frame is { UsableHeightMm, MastheadMm, NoteMm }: the page body's printable height
    // and the two text blocks the pack's own type settings size. Returns
    //     [ { Blocks : [ { Kind, TopMm, HeightMm, RowIndices?, HasTotal? } ] } ]
    // with TopMm measured down from the top of the page body. The masthead, the
    // provisional note and the plan open the first page; the panel table follows the
    // plan and runs on a whole row at a time, its header repeated at the head of every
    // page it reaches, and closes with the total glass row. A header is never left at
    // the foot of a page on its own.
    function VghLantern__Specification__GlazingScheduleRenderer__LayoutPages(schedule, frame) {
        var metrics  =  VghLantern__Specification__GlazingScheduleRenderer__PageMetrics();
        var usable   =  Math.max(1, Number(frame.UsableHeightMm) || 0);
        var pages    =  [];
        var blocks   =  [];
        var y        =  0;
        var table    =  null;
        var r, need;

        // HELPER | Close the page being filled and start an empty one
        function newPage() {
            pages.push({ Blocks : blocks });
            blocks  =  [];
            y       =  0;
            table   =  null;
        }

        // HELPER | Place a block at the running position
        function place(kind, heightMm) {
            var block  =  { Kind : kind, TopMm : y, HeightMm : heightMm };
            blocks.push(block);
            y  +=  heightMm;
            return block;
        }

        place(BLOCK_MASTHEAD, frame.MastheadMm);
        y  +=  metrics.BlockGapMm;

        if (!schedule || !schedule.IsValid || !schedule.Rows.length) {
            place(BLOCK_MESSAGE, frame.NoteMm);
            newPage();
            return pages;
        }

        if (schedule.IsProvisional) {
            place(BLOCK_NOTE, frame.NoteMm);
            y  +=  metrics.BlockGapMm;
        }

        var planHeight  =  schedule.Plan.HeightMm + metrics.CaptionHeightMm;
        if (y + planHeight > usable) newPage();                                // <-- Only on paper too small for the plan under its masthead
        place(BLOCK_PLAN, planHeight);
        y  +=  metrics.BlockGapMm;

        for (r = 0; r < schedule.Rows.length; r++) {
            need  =  metrics.RowHeightMm + (table ? 0 : metrics.HeaderHeightMm);
            if (y + need > usable && blocks.length) newPage();

            if (!table) {
                table  =  place(BLOCK_TABLE, metrics.HeaderHeightMm);
                table.RowIndices  =  [];
            }
            table.RowIndices.push(r);
            table.HeightMm  +=  metrics.RowHeightMm;
            y               +=  metrics.RowHeightMm;
        }

        // THE TOTAL | The total glass closes the table: under its last row when it
        // fits there, under a repeated heading on the next page when it does not.
        need  =  metrics.TotalRowHeightMm + (table ? 0 : metrics.HeaderHeightMm);
        if (y + need > usable && blocks.length) newPage();
        if (!table) {
            table  =  place(BLOCK_TABLE, metrics.HeaderHeightMm);
            table.RowIndices  =  [];
        }
        table.HasTotal   =  true;
        table.HeightMm  +=  metrics.TotalRowHeightMm;
        y               +=  metrics.TotalRowHeightMm;

        newPage();
        return pages;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Every Word a Glazing Page Prints Outside the Table
    // ------------------------------------------------------------
    // One reader for the screen, the preview and the PDF, so all three say the same
    // thing. Note is the provisional build-up note ('' when the build-up is real);
    // Message is the line printed instead of a schedule ('' when there is one).
    function VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var cfg           =  VghLantern__GlazingRenderer__Config();
        var Str           =  function(block, key) { return ConfigLoader.VghLantern__ConfigLoader__RequireString(block, key, CONFIG_LABEL); };
        var hasSchedule   =  !!(schedule && schedule.IsValid && schedule.Rows.length);

        return {
            Note        : (hasSchedule && schedule.IsProvisional) ? Str(cfg, 'ProvisionalNote') : '',
            Message     : hasSchedule ? '' : ((schedule && schedule.Message) ? schedule.Message : Str(cfg, 'EmptyMessage')),
            Caption     : Str(cfg.Plan || {}, 'Caption'),
            TitleSuffix : Str(cfg, 'PageTitleSuffix')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Provisional Build-Up Note, or Nothing
    // ------------------------------------------------------------
    function VghLantern__Specification__GlazingScheduleRenderer__BuildNoteHtml(schedule) {
        var note  =  VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule).Note;
        return note ? '<p class="' + CSS_NOTE + '">' + VghLantern__GlazingRenderer__Escape(note) + '</p>' : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Coded Plan With Its Caption
    // ------------------------------------------------------------
    // metrics is null on the Specification tab, where the caption takes the tab's
    // type, and the page metrics on a pack page, where it is set in millimetres so it
    // fills exactly the band LayoutPages reserved for it.
    function VghLantern__Specification__GlazingScheduleRenderer__BuildPlanHtml(schedule, metrics) {
        var N             =  VghLantern__GlazingRenderer__N;
        var caption       =  VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule).Caption;
        var captionStyle  =  metrics
            ? ' style="margin-top:' + N(metrics.CaptionGapMm) + 'mm;font-size:' + N(metrics.CaptionFontMm) +
              'mm;line-height:' + CAPTION_LINE_RATIO + '"'
            : '';

        return '<figure class="' + CSS_PLAN + '">' +
               VghLantern__Specification__GlazingScheduleRenderer__ToSvg(schedule.Plan, caption) +
               '<figcaption class="' + CSS_PLAN_CAPTION + '"' + captionStyle + '>' +
               VghLantern__GlazingRenderer__Escape(caption) + '</figcaption>' +
               '</figure>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Panel Table, or the Rows of It One Page Holds
    // ------------------------------------------------------------
    // rowIndices null prints every panel type. columns and metrics null is the
    // Specification tab: the table sizes itself and the drawing column is as wide as
    // its drawings. On a pack page the columns are resolved to millimetres and every
    // row is the height LayoutPages gave it, so the page is drawn as it was laid out.
    //
    // Each text cell carries its column's name faintly at its top and its value,
    // larger, centred in the row's height (Adam, 20-Oct-2026: "put Code Qty ... at the
    // top of each feintly and then centre the main text and make it a little
    // larger"). The sizes ride on CSS variables set on the table: millimetres from
    // config on paper, the stylesheet's own relative sizes on the tab.
    function VghLantern__Specification__GlazingScheduleRenderer__BuildTableHtml(schedule, rowIndices, columns, metrics, withTotal) {
        var Esc       =  VghLantern__GlazingRenderer__Escape;
        var N         =  VghLantern__GlazingRenderer__N;
        var isPaper   =  !!(columns && metrics);
        var cols      =  columns || VghLantern__Specification__GlazingScheduleRenderer__ResolveColumns(0);
        var indices   =  rowIndices || schedule.Rows.map(function(row, index) { return index; });
        var sizes     =  metrics || VghLantern__Specification__GlazingScheduleRenderer__PageMetrics();
        var vars      =  '--VghLantern_GlazingLabelColour:' + sizes.LabelColour + ';--VghLantern_GlazingLineRatio:' + sizes.CellLineRatio +
                         (isPaper ? ';--VghLantern_GlazingValueFont:' + N(sizes.ValueFontMm) + 'mm' +
                                    ';--VghLantern_GlazingSubFont:' + N(sizes.SecondaryFontMm) + 'mm' +
                                    ';--VghLantern_GlazingLabelFont:' + N(sizes.LabelFontMm) + 'mm' : '');
        var html      =  '<table class="' + CSS_TABLE + ' ' + CSS_GLAZING_TABLE + '" style="' + vars + '">';
        var i, j, row, column, lines, cellClass;

        if (isPaper) {
            html  +=  '<colgroup>' + cols.map(function(col) {
                return '<col style="width:' + N(col.WidthMm) + 'mm">';
            }).join('') + '</colgroup>';
        }

        html  +=  '<thead><tr' + (isPaper ? ' style="height:' + N(metrics.HeaderHeightMm) + 'mm"' : '') + '>';
        for (j = 0; j < cols.length; j++) {
            html  +=  '<th class="' + CSS_HEAD_CELL + (cols[j].Align === 'right' ? ' ' + CSS_ALIGN_RIGHT : '') + '">' +
                      Esc(cols[j].Label) + '</th>';
        }
        html  +=  '</tr></thead><tbody>';

        for (i = 0; i < indices.length; i++) {
            row  =  schedule.Rows[indices[i]];
            if (!row) continue;
            html  +=  '<tr' + (isPaper ? ' style="height:' + N(metrics.RowHeightMm) + 'mm"' : '') + '>';

            for (j = 0; j < cols.length; j++) {
                column     =  cols[j];
                cellClass  =  CSS_CELL + (column.Align === 'right' ? ' ' + CSS_ALIGN_RIGHT : '');

                if (column.Key === 'Drawing') {
                    html  +=  '<td class="' + cellClass + ' ' + CSS_DRAWING_CELL + '"' +
                              (isPaper ? ' style="padding:' + N(metrics.RowPaddingMm) + 'mm 0"' : '') + '>' +
                              VghLantern__Specification__GlazingScheduleRenderer__ToSvg(row.Drawing, 'Cut drawing of panel ' + row.Code) +
                              '</td>';
                    continue;
                }

                lines  =  VghLantern__Specification__GlazingScheduleRenderer__CellLines(column.Key, row, schedule);
                html  +=  '<td class="' + cellClass + ' ' + CSS_CELL_TEXT + '">' +
                          '<span class="' + CSS_CELL_LABEL + '">' + Esc(column.Label) + '</span>' +
                          '<span class="' + CSS_CELL_VALUE + '">' +
                          (column.Key === 'Code' ? '<strong>' + Esc(lines[0]) + '</strong>' : Esc(lines[0] || '')) + '</span>' +
                          (lines.length > 1 ? '<span class="' + CSS_SECONDARY + '">' + Esc(lines[1]) + '</span>' : '') +
                          '</td>';
            }
            html  +=  '</tr>';
        }

        html  +=  '</tbody>';
        if (withTotal) html  +=  VghLantern__GlazingRenderer__BuildTotalRow(schedule, cols, isPaper ? metrics : null);
        return html + '</table>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Column the Total Glass Sits Under
    // ------------------------------------------------------------
    // The Area column's place, with the total row's label across every column before
    // it, set against the figure; -1 when no Area column is configured, when the label
    // and the figure share one cell. Shared by the markup and the PDF painter.
    function VghLantern__Specification__GlazingScheduleRenderer__TotalColumn(cols) {
        var i;
        for (i = 0; i < cols.length; i++) {
            if (cols[i].Key === 'Area') return i;
        }
        return -1;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Total Glass Row That Closes the Table
    // ------------------------------------------------------------
    function VghLantern__GlazingRenderer__BuildTotalRow(schedule, cols, metrics) {
        var Esc     =  VghLantern__GlazingRenderer__Escape;
        var at      =  VghLantern__Specification__GlazingScheduleRenderer__TotalColumn(cols);
        var height  =  metrics ? ' style="height:' + VghLantern__GlazingRenderer__N(metrics.TotalRowHeightMm) + 'mm"' : '';
        var html    =  '<tfoot><tr class="' + CSS_TOTALS_ROW + '"' + height + '>';

        if (at > 0) {
            html  +=  '<td class="' + CSS_CELL + ' ' + CSS_ALIGN_RIGHT + '" colspan="' + at + '">' + Esc(schedule.TotalLabel) + '</td>' +
                      '<td class="' + CSS_CELL + ' ' + CSS_ALIGN_RIGHT + '">' + Esc(schedule.TotalAreaText) + '</td>';
            if (cols.length - at - 1 > 0) {
                html  +=  '<td class="' + CSS_CELL + '" colspan="' + (cols.length - at - 1) + '"></td>';
            }
        } else {
            html  +=  '<td class="' + CSS_CELL + '" colspan="' + cols.length + '">' +
                      Esc(schedule.TotalLabel + '  ' + schedule.TotalAreaText) + '</td>';
        }

        return html + '</tr></tfoot>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Lantern's Schedule for the Specification Tab
    // ------------------------------------------------------------
    // The provisional note, the coded plan and the whole panel table with its total
    // glass, in reading order.
    function VghLantern__Specification__GlazingScheduleRenderer__BuildLanternBlocks(schedule) {
        var message  =  VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule).Message;
        if (message) return '<p class="' + CSS_EMPTY + '">' + VghLantern__GlazingRenderer__Escape(message) + '</p>';

        return VghLantern__Specification__GlazingScheduleRenderer__BuildNoteHtml(schedule) +
               VghLantern__Specification__GlazingScheduleRenderer__BuildPlanHtml(schedule, null) +
               VghLantern__Specification__GlazingScheduleRenderer__BuildTableHtml(schedule, null, null, null, true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Specification Tab's Glazing Panels Section
    // ------------------------------------------------------------
    // Every lantern on the project, each under its own heading when there is more than
    // one, exactly as the takeoff sections run. This is the moment the tab asks for the
    // schedules: before it, none exists.
    function VghLantern__Specification__GlazingScheduleRenderer__BuildSectionHtml(documentModel) {
        var Schedule  =  window.VghLantern__Specification__GlazingSchedule;
        if (!documentModel || !Schedule) return '';

        var isMulti  =  documentModel.Lanterns.length > 1;
        var html     =  '';
        var i, entry;

        for (i = 0; i < documentModel.Lanterns.length; i++) {
            entry  =  documentModel.Lanterns[i];
            if (isMulti) {
                html  +=  '<h4 class="' + CSS_SUBHEADING + '">' + VghLantern__GlazingRenderer__Escape(entry.Title) + '</h4>';
            }
            html  +=  VghLantern__Specification__GlazingScheduleRenderer__BuildLanternBlocks(
                          Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(entry.LanternIndex));
        }

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
        VghLantern__Specification__GlazingScheduleRenderer__ToSvg               : VghLantern__Specification__GlazingScheduleRenderer__ToSvg,
        VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf           : VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf,
        VghLantern__Specification__GlazingScheduleRenderer__ResolveColumns      : VghLantern__Specification__GlazingScheduleRenderer__ResolveColumns,
        VghLantern__Specification__GlazingScheduleRenderer__CellLines           : VghLantern__Specification__GlazingScheduleRenderer__CellLines,
        VghLantern__Specification__GlazingScheduleRenderer__PageMetrics         : VghLantern__Specification__GlazingScheduleRenderer__PageMetrics,
        VghLantern__Specification__GlazingScheduleRenderer__LayoutPages         : VghLantern__Specification__GlazingScheduleRenderer__LayoutPages,
        VghLantern__Specification__GlazingScheduleRenderer__PageText            : VghLantern__Specification__GlazingScheduleRenderer__PageText,
        VghLantern__Specification__GlazingScheduleRenderer__BuildNoteHtml       : VghLantern__Specification__GlazingScheduleRenderer__BuildNoteHtml,
        VghLantern__Specification__GlazingScheduleRenderer__BuildPlanHtml       : VghLantern__Specification__GlazingScheduleRenderer__BuildPlanHtml,
        VghLantern__Specification__GlazingScheduleRenderer__BuildTableHtml      : VghLantern__Specification__GlazingScheduleRenderer__BuildTableHtml,
        VghLantern__Specification__GlazingScheduleRenderer__TotalColumn         : VghLantern__Specification__GlazingScheduleRenderer__TotalColumn,
        VghLantern__Specification__GlazingScheduleRenderer__BuildLanternBlocks  : VghLantern__Specification__GlazingScheduleRenderer__BuildLanternBlocks,
        VghLantern__Specification__GlazingScheduleRenderer__BuildSectionHtml    : VghLantern__Specification__GlazingScheduleRenderer__BuildSectionHtml,

        VGHLANTERN__GLAZINGRENDERER__BLOCK_MASTHEAD  : BLOCK_MASTHEAD,
        VGHLANTERN__GLAZINGRENDERER__BLOCK_NOTE      : BLOCK_NOTE,
        VGHLANTERN__GLAZINGRENDERER__BLOCK_MESSAGE   : BLOCK_MESSAGE,
        VGHLANTERN__GLAZINGRENDERER__BLOCK_PLAN      : BLOCK_PLAN,
        VGHLANTERN__GLAZINGRENDERER__BLOCK_TABLE     : BLOCK_TABLE
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__GlazingScheduleRenderer  =  VghLantern__Specification__GlazingScheduleRenderer;
