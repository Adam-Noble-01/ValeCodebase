// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - THE VALE TITLE BLOCK
// =============================================================================
//
// FILE       : Na__DrawingSheets__TitleBlock__.js
// NAMESPACE  : Na__TitleBlock
// MODULE     : Drawing Sheets - Title Block (Vale Classic)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Vale's title column, drawn in its own millimetres: the fixed cells
//              (logo, Grantham address, setting-out note, copyright) as Vale's
//              own artwork, then the ruled field cells and their values
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE FIXED CELLS are cut at 300 dpi from Vale's A3 layout
//   (01__AppAssets__AuraRender/10__TitleBlocks), so the logo, address and
//   notes are exactly Vale's. They are the same size on every sheet.
// - THE FIELD CELLS are drawn as lines and text in the column's millimetres
//   (AuraConfig__TitleBlock__Cells, measured on the same layout), so they stay
//   sharp at any size and print true. Labels in the layout's narrow sans; the
//   values in Open Sans.
// - The column is drawn upright; Na__Paper__Solve's transform places and turns
//   it (portrait), and scales it on A4.
// - SCALE: empty means "written from the viewports": their scales and the
//   paper ("1:50, 1:100 @ A1"; three or more scales read "As shown").
// - THE VALUES ARE HANDWRITTEN (1.1.0; Adam, 30-Oct-2026: "Use handwriting in
//   the titleblock and viewports not text"): each entry and revision is
//   written by the handwriting engine in the lettering hand and pen
//   (31__System__Handwriting/Na__Handwriting__Lettering__.js), kept on the
//   device, typed until written, in the same hand, pen and ink as the notes
//   (AURA 0.5.10: the Example Cottage's leader note is the standard). The labels and Vale's artwork are the printed form and stay printed.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.2.0 (AURA 0.5.10)
// - The entries take the notes' ink (the lettering's colour) instead of
//   black; the title and drawing number keep the lettering's EmphasisPen,
//   which is now the same 0.18 mm M018.
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.4)
// - The entries and revisions are handwritten (the lettering module), the
//   typed words standing in until each is written; the column redraws itself
//   when its handwriting arrives.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__Svg, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__SheetScale } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Lettering__Draw, Na__Lettering__Size } from '../31__System__Handwriting/Na__Handwriting__Lettering__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__TitleBlock__LINE        = '#111111';
    const Na__TitleBlock__LABEL_FONT  = '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif';
    const Na__TitleBlock__VALUE_FONT  = '"Open Sans", Arial, sans-serif';
    const Na__TitleBlock__CHAR_EM     = 0.56;                                    // <-- An Open Sans character is about this many ems wide: enough to wrap a value

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Text
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wrap a Value to a Cell's Width, Keeping the Lines That Fit
    // ------------------------------------------------------------
    function Na__TitleBlock__Wrap(text, widthMm, sizeMm, maxLines) {
        const perLine = Math.max(4, Math.floor(widthMm / (sizeMm * Na__TitleBlock__CHAR_EM)));
        const lines = [];
        String(text || '').split(/\r?\n/).forEach((paragraph) => {
            let line = '';
            paragraph.split(/\s+/).filter(Boolean).forEach((word) => {
                if (line && (line + ' ' + word).length > perLine) { lines.push(line); line = word; }
                else line = line ? line + ' ' + word : word;
                while (line.length > perLine) { lines.push(line.slice(0, perLine)); line = line.slice(perLine); }
            });
            if (line || !paragraph) lines.push(line);
        });
        if (lines.length > maxLines) {
            const kept = lines.slice(0, maxLines);
            kept[maxLines - 1] = kept[maxLines - 1].replace(/.?$/, '...');
            return kept;
        }
        return lines;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write Lines of Text From a Top Left Corner
    // ------------------------------------------------------------
    function Na__TitleBlock__Text(parent, x, y, lines, sizeMm, font, weight) {
        const text = Na__Dom__Svg('text', { x, y, 'font-size': sizeMm, 'font-family': font, 'font-weight': weight || 400, fill: Na__TitleBlock__LINE }, parent);
        lines.forEach((line, i) => {
            const span = Na__Dom__Svg('tspan', { x, dy: i === 0 ? 0 : sizeMm * 1.22 }, text);
            span.textContent = line;
        });
        return text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handwriting
// -----------------------------------------------------------------------------

    const Na__TitleBlock__State = { last: null };                               // <-- The column drawn last ({ parent, sheet, solve }): drawn again as its handwriting arrives


    // HELPER FUNCTION | Draw the Last Column Again (its handwriting has arrived)
    // ------------------------------------------------------------
    function Na__TitleBlock__Redraw() {
        const last = Na__TitleBlock__State.last;
        if (!last || !last.parent || !last.parent.isConnected) return;          // <-- A sheet drawn since has its own column
        Na__Dom__Clear(last.parent);
        Na__TitleBlock__Draw(last.parent, last.sheet, last.solve);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Entry by Hand, or Typed Until It Is Written
    // ------------------------------------------------------------
    // box: { X, Y, W, H } in the column's millimetres (its top left); size: the
    // typed size the handwriting replaces; oneLine: never wrap (the box only
    // shrinks it); emphasis: the heavier pen, where the typed block was bold.
    // ------------------------------------------------------------
    function Na__TitleBlock__Hand(parent, value, box, size, oneLine, emphasis, typed) {
        const lettering = Na__AppConfig__Get('Handwriting__Lettering', {});
        Na__Lettering__Draw(parent, {
            Text     : value,
            X        : box.X,
            Y        : box.Y,
            WidthMm  : box.W,
            HeightMm : box.H,
            SizeMm   : Na__Lettering__Size(size),
            OneLine  : oneLine,
            PenKey   : emphasis ? lettering.EmphasisPen : lettering.Pen,
            Channel  : 'titleblock'                                       // <-- No Colour: the notes' ink, as every word on the sheet (1.2.0)
        }, typed, Na__TitleBlock__Redraw);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Column
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Title Column of a Sheet
    // ------------------------------------------------------------
    // parent: an SVG group in sheet millimetres. solve: Na__Paper__Solve(sheet).
    // ------------------------------------------------------------
    function Na__TitleBlock__Draw(parent, sheet, solve) {
        Na__TitleBlock__State.last = { parent, sheet, solve };
        const cw = solve.ColumnWidthMm, ch = solve.ColumnHeightMm;
        const lineW = Na__AppConfig__Get('Sheet__LineWidthMm', 0.25);
        const labelSize = Na__AppConfig__Get('TitleBlock__LabelSizeMm', 2.7);
        const valueSize = Na__AppConfig__Get('TitleBlock__ValueSizeMm', 3.4);
        const fields = sheet.Sheet__Fields || {};
        const g = Na__Dom__Svg('g', { class: 'aura-titleblock', transform: solve.Title.Transform }, parent);

        // The fixed cells: Vale's own artwork, printed onto the sheet's paper (multiplied:
        // its white is the paper, its black stays black). The paper under the whole
        // column is the Surface's, in the sheet's own millimetres so its grain runs on.
        const image = Na__Dom__Svg('image', { x: 0, y: 0, width: cw, height: Na__AppConfig__Get('TitleBlock__FixedCellsHeightMm', 161.5), preserveAspectRatio: 'none', style: 'mix-blend-mode: multiply' }, g);
        image.setAttribute('href', new URL(`../../${Na__AppConfig__Get('TitleBlock__FixedCellsImage', '')}`, import.meta.url).href);
        const fixedH = Na__AppConfig__Get('TitleBlock__FixedCellsHeightMm', 161.5);

        const lines = Na__Dom__Svg('g', { fill: 'none', stroke: Na__TitleBlock__LINE, 'stroke-width': lineW }, g);
        const scaleText = fields.Scale || Na__Format__SheetScale((sheet.Sheet__Viewports || []).map((v) => v.Viewport__ScaleDenominator), sheet.Sheet__PaperSize);

        Na__AppConfig__Get('TitleBlock__Cells', []).forEach((cell) => {
            Na__Dom__Svg('line', { x1: cell.X, y1: cell.Y, x2: cell.X + cell.W, y2: cell.Y }, lines);
            if (cell.X > 0) Na__Dom__Svg('line', { x1: cell.X, y1: cell.Y, x2: cell.X, y2: cell.Y + cell.H }, lines);

            if (cell.Kind === 'Revisions') {
                const head = cell.Y + (cell.HeaderMm || 4.6);
                Na__Dom__Svg('line', { x1: 0, y1: head, x2: cw, y2: head }, lines);
                (cell.Columns || []).forEach((col) => {
                    if (col.X > 0) Na__Dom__Svg('line', { x1: col.X, y1: cell.Y, x2: col.X, y2: cell.Y + cell.H }, lines);
                    Na__TitleBlock__Text(g, col.X + 0.7, cell.Y + labelSize + 0.6, [col.Label], labelSize, Na__TitleBlock__LABEL_FONT);
                });
                const rowH = 3.6, small = 2.5;
                const rows = Array.isArray(fields.Revisions) ? fields.Revisions : [];
                rows.slice(-Math.floor((cell.H - (cell.HeaderMm || 4.6)) / rowH)).forEach((rev, i) => {
                    const y = head + rowH * (i + 1) - 0.9;
                    (cell.Columns || []).forEach((col) => {
                        const value = String(rev[col.Key] || '');
                        if (!value.trim()) return;
                        const fit = Math.max(2, Math.floor((col.W - 1.2) / (small * Na__TitleBlock__CHAR_EM)));
                        const typed = () => Na__TitleBlock__Text(g, col.X + 0.7, y, [value.length > fit ? value.slice(0, fit - 1) + '.' : value], small, Na__TitleBlock__VALUE_FONT);
                        Na__TitleBlock__Hand(g, value, { X: col.X + 0.6, Y: head + rowH * i + 0.35, W: col.W - 1.2, H: rowH - 0.6 }, small, true, false, typed);
                    });
                });
                return;
            }

            Na__TitleBlock__Text(g, cell.X + 0.8, cell.Y + labelSize + 0.5, [cell.Label], labelSize, Na__TitleBlock__LABEL_FONT);
            const value = cell.Key === 'Scale' ? scaleText : fields[cell.Key];
            if (!value) return;
            const room = cell.H - labelSize - 1.6;
            const size = Math.min(valueSize, room * 0.8);
            const maxLines = Math.max(1, Math.floor((room + size * 0.22) / (size * 1.22)));
            const wrapped = Na__TitleBlock__Wrap(value, cell.W - 2.6, size, maxLines);
            const top = cell.Y + labelSize + 1.4 + size;
            const emphasis = cell.Key === 'DrawingNo' || cell.Key === 'Title';
            const typed = () => Na__TitleBlock__Text(g, cell.X + 1.6, top, wrapped, size, Na__TitleBlock__VALUE_FONT, emphasis ? 600 : 400);
            Na__TitleBlock__Hand(g, value, { X: cell.X + 1.2, Y: cell.Y + labelSize + 1.0, W: cell.W - 2.4, H: room + 0.6 }, size, maxLines === 1, emphasis, typed);
        });

        // The column's outline last, over the artwork's own edges
        Na__Dom__Svg('rect', { x: 0, y: 0, width: cw, height: ch }, lines);
        Na__Dom__Svg('line', { x1: 0, y1: fixedH, x2: cw, y2: fixedH }, lines);
        return g;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__TitleBlock__Draw
    };

// endregion -------------------------------------------------------------------
