// =============================================================================
// VALEVISION3D - TEST - TITLE BLOCK CELLS
// =============================================================================
//
// FILE       : Na__Test__TitleBlockCells__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Title Block Cells Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the modern title block's cell widths: fixed cells stay fixed, the title takes the rest, nothing is cut while a cell has room to give, and A4 degrades in order
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - The cells module imports nothing, so it runs here exactly as the app runs
//   it, against the app's own config rows. Node 20 reads the app's .js modules
//   as CommonJS, so the module is copied to a temporary .mjs first.
// - THE FIXTURE IS A VALE SHEET. NEEDS below is what each cell of a typical
//   ValeVision title block asks for - the wider of its label and its value,
//   with the 1.4 mm padding either side - measured on 20-Sep-2026 with the
//   vendored jsPDF in its built-in Helvetica at 2.2 mm, the face this app
//   prints in. Written out rather than measured here, so the test needs no
//   browser and does not change when a drawing does.
// - Strip widths are the paper's width, less the 5 mm margins, less the 34 mm
//   logo cell: A1 797, A2 550, A3 376, A4 landscape 253, A4 portrait 166.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D v2.79.0 80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs
// - Divergences   : The fixture (Helvetica, a Drawing No. cell, a 34 mm logo
//                   cell, Vale values). The checks are the same checks.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
// - Ported with the cells module.
//
// =============================================================================

import { readFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | The Module Under Test and Its Config
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const EDITOR     = resolve(SCRIPT_DIR, '..', '02__Src__AppModules', '51__System__LayoutEditor');
    const SCRATCH    = mkdtempSync(join(tmpdir(), 'vv-titlecells-'));
    copyFileSync(join(EDITOR, '10__Core__SheetSurface', 'Na__LayoutEditor__TitleBlock__Cells__.js'), join(SCRATCH, 'Cells.mjs'));
    const cells  = await import(pathToFileURL(join(SCRATCH, 'Cells.mjs')).href);
    const config = JSON.parse(readFileSync(join(EDITOR, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), 'utf8'))['LayoutEditor__TitleBlock__Config'];
    const ROWS   = config['LayoutEditor__TitleBlock__Rows'];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Fixture: What a Vale Sheet's Cells Ask For
// -----------------------------------------------------------------------------

    const STRIP = { A1 : 797, A2 : 550, A3 : 376, A4 : 253, A4P : 166 };

    // Text width + 2.8 mm of padding, Helvetica at 2.2 mm (labels at 1.6 mm tracked 0.05).
    const NEEDS = {
        Client        : 12.02,   // Mordaunt
        SiteAddress   : 60.35,   // The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE
        Title         : 87.72,   // Permitted Development Compliance - Existing Conditions & Design Proposal Elevations
        DrawingNumber : 14.36,   // 57079-12 - the label DRAWING NO. is wider than the value
        Revision      : 6.21,    // B - the label REV is wider than the value
        Scale         : 17.56,   // 1:50 @ ISO A2
        Date          : 15.16,   // 19 Sep 2026
        DrawnBy       : 23.08,   // Vale Garden Houses
        Status        : 19.26    // FOR PLANNING
    };

    // The label alone + 2.8 mm of padding: the least a Flex cell may be cut to.
    const FLOORS = { Client : 8.76, SiteAddress : 15.06, Title : 15.95, DrawingNumber : 14.36, Revision : 6.21, Scale : 8.25, Date : 7.05, DrawnBy : 11.78, Status : 8.99 };

    function solve(stripMm, needs) {
        const asked  = Object.assign({}, NEEDS, needs || {});
        const widths = cells.Na__LeTitleCells__Solve(stripMm, ROWS.map((row) => cells.Na__LeTitleCells__Cell(row, asked[row.Key], FLOORS[row.Key])));
        const byKey  = {};
        ROWS.forEach((row, index) => { byKey[row.Key] = widths[index]; });
        return { widths : widths, byKey : byKey, asked : asked, total : widths.reduce((sum, mm) => sum + mm, 0) };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failed = 0;
    function check(name, ok, detail) {
        if (!ok) failed++;
        console.log((ok ? '  pass  ' : '  FAIL  ') + name + (detail ? '   ' + detail : ''));
    }
    const near   = (a, b, tolerance) => Math.abs(a - b) <= (tolerance === undefined ? 1e-6 : tolerance);
    const fixed  = ROWS.filter((row) => !(row.Flex > 0));
    const cutOff = (result) => ROWS.filter((row) => result.byKey[row.Key] + 1e-6 < result.asked[row.Key]).map((row) => row.Key);

    console.log('THE CONFIG');
    check('Status is the last row, at the right-hand end of the strip', ROWS[ROWS.length - 1].Key === 'Status');
    check('the Drawing Title is the one Flex row', ROWS.filter((row) => row.Flex > 0).map((row) => row.Key).join() === 'Title');
    check('the number cell is this app\'s Drawing No., not TrueVision\'s Document ID', ROWS.some((row) => row.Key === 'DrawingNumber') && !ROWS.some((row) => row.Key === 'DocumentId'));
    const module28 = [ 'Revision', 'Scale', 'Date', 'DrawnBy' ].map((key) => ROWS.find((row) => row.Key === key).WidthMm);
    check('Rev, Scale, Date and Drawn By are one size', module28.every((mm) => mm === module28[0]), module28.join(' / '));
    const STATUSES = config['LayoutEditor__TitleBlock__Statuses'];
    check('the config lists the statuses, none blank and none twice', Array.isArray(STATUSES) && STATUSES.length > 0 && STATUSES.every((status) => typeof status === 'string' && status.trim() !== '') && new Set(STATUSES).size === STATUSES.length, STATUSES.length + ' listed');
    check('the four Adam named are among them', [ 'FOR APPROVAL', 'FOR TENDER', 'FOR CONSTRUCTION', 'AS BUILT' ].every((status) => STATUSES.indexOf(status) !== -1));
    // Measured 20-Sep-2026, Helvetica at 2.2 mm plus 2.8 mm of padding. A status added to the config since is not in this table and is not judged.
    const STATUS_NEEDS = { 'PRELIMINARY' : 17.63, 'FOR INFORMATION' : 23.17, 'FOR COMMENT' : 19.39, 'FOR COORDINATION' : 24.89, 'FOR APPROVAL' : 19.65, 'FOR PLANNING' : 19.26,
                           'FOR BUILDING CONTROL' : 29.77, 'FOR PRICING' : 17.21, 'FOR TENDER' : 17.06, 'FOR CONSTRUCTION' : 25.75, 'AS BUILT' : 12.28, 'SUPERSEDED' : 17.85 };
    const statusMm = ROWS.find((row) => row.Key === 'Status').WidthMm;
    const tooWide  = STATUSES.filter((status) => STATUS_NEEDS[status] !== undefined && STATUS_NEEDS[status] > statusMm);
    check('every measured status fits the Status cell without borrowing', tooWide.length === 0, tooWide.join() || (statusMm + ' mm cell'));
    check('Drawn By\'s default, Vale Garden Houses, fits the 28 mm module', NEEDS.DrawnBy <= module28[3], NEEDS.DrawnBy + ' of ' + module28[3]);

    console.log('A2');
    const a2 = solve(STRIP.A2);
    check('the strip is filled exactly', near(a2.total, STRIP.A2));
    check('every fixed cell is its configured width', fixed.every((row) => near(a2.byKey[row.Key], row.WidthMm)));
    check('the Client cell is less than half the 76 mm it was', a2.byKey.Client < 38, a2.byKey.Client.toFixed(1) + ' mm');
    check('the Drawing No. cell is half the 49 mm it was', a2.byKey.DrawingNumber < 25, a2.byKey.DrawingNumber.toFixed(1) + ' mm');
    check('the Drawing Title has the rest', a2.byKey.Title > 250, a2.byKey.Title.toFixed(1) + ' mm');
    check('nothing is cut off', cutOff(a2).length === 0, cutOff(a2).join());

    console.log('THE SAME DIVIDERS ON EVERY SHEET OF A PACK');
    const a2short = solve(STRIP.A2, { Title : 17.50 });
    check('a short title and a long one give identical cells on roomy paper', a2.widths.every((mm, index) => near(mm, a2short.widths[index])));

    console.log('A3, WHERE THE OLD SHARES CUT THE TITLE');
    const a3 = solve(STRIP.A3);
    check('the strip is filled exactly', near(a3.total, STRIP.A3));
    check('an 88 mm title, cut at 71 mm under the old shares, now fits', a3.byKey.Title >= NEEDS.Title, a3.byKey.Title.toFixed(1) + ' mm against ' + NEEDS.Title);
    check('and no fixed cell moved to make it fit', fixed.every((row) => near(a3.byKey[row.Key], row.WidthMm)));

    console.log('GROW IF ABSOLUTELY REQUIRED');
    const longTitle = solve(STRIP.A3, { Title : 125 });
    check('a title longer than its share borrows from cells with room, and fits', near(longTitle.byKey.Title, 125, 1e-6), longTitle.byKey.Title.toFixed(2));
    check('the strip is still filled exactly', near(longTitle.total, STRIP.A3));
    check('no cell gave up room its own text needs', cutOff(longTitle).length === 0, cutOff(longTitle).join());

    const longAddress = solve(STRIP.A2, { SiteAddress : 108 });
    check('a long address grows on A2 out of the paper\'s spare room alone', near(longAddress.byKey.SiteAddress, 108) && fixed.filter((row) => row.Key !== 'SiteAddress').every((row) => near(longAddress.byKey[row.Key], row.WidthMm)));

    const threeScales = solve(STRIP.A2, { Scale : 32.63 });
    check('a three-scale label is never cut: the Scale cell grows to hold it', near(threeScales.byKey.Scale, 32.63), threeScales.byKey.Scale.toFixed(2));

    console.log('A4 LANDSCAPE, NARROWER THAN THE STRIP');
    const a4 = solve(STRIP.A4);
    check('the strip is filled exactly', near(a4.total, STRIP.A4));
    check('only the title is cut: every other cell kept its text', cutOff(a4).join() === 'Title', cutOff(a4).join());

    console.log('A STRIP TOO NARROW EVEN FOR THE TEXT: THE TITLE GIVES WAY FIRST');
    // TrueVision's Cells 1.0.0 scaled every value together at this point; this app never shipped that.
    const narrow = solve(190);
    check('the strip is filled exactly', near(narrow.total, 190));
    check('only the title is cut: the date, the scale and the number keep their text', cutOff(narrow).join() === 'Title', cutOff(narrow).join());
    check('the title is cut below its configured width, but not below its own label', narrow.byKey.Title < 60 && narrow.byKey.Title >= FLOORS.Title - 1e-6, narrow.byKey.Title.toFixed(2) + ' mm, floor ' + FLOORS.Title);

    console.log('A4 PORTRAIT, WHERE NOTHING FITS');
    const a4p = solve(STRIP.A4P);
    check('the strip is filled exactly', near(a4p.total, STRIP.A4P));
    check('every cell has some width', a4p.widths.every((mm) => mm > 0));
    check('the title is down to its label before anything else is scaled', near(a4p.byKey.Title / FLOORS.Title, a4p.byKey.Date / NEEDS.Date, 1e-6) && a4p.byKey.Title < FLOORS.Title, 'title ' + a4p.byKey.Title.toFixed(2) + ' of a ' + FLOORS.Title + ' floor');
    check('so every other value keeps nine tenths of its cell', a4p.byKey.Date / NEEDS.Date > 0.88, (100 * (1 - a4p.byKey.Date / NEEDS.Date)).toFixed(1) + ' percent lost');

    console.log('A CALLER THAT GIVES NO FLOOR');
    const noFloor = cells.Na__LeTitleCells__Solve(190, ROWS.map((row) => cells.Na__LeTitleCells__Cell(row, NEEDS[row.Key])));
    check('still fills the strip, and still cuts only the title', near(noFloor.reduce((sum, mm) => sum + mm, 0), 190) && ROWS.every((row, index) => row.Key === 'Title' || noFloor[index] + 1e-6 >= NEEDS[row.Key]));

    console.log('AN OLD CONFIG STILL DRAWS THE OLD STRIP');
    const OLD    = [ 28, 44, 38, 18, 8, 30, 16, 20 ];
    const shares = cells.Na__LeTitleCells__Solve(550, OLD.map((mm) => cells.Na__LeTitleCells__Cell({ WidthMm : mm }, 0)));
    check('with no Flex row the spare room is shared in proportion, as it always was', shares.every((mm, index) => near(mm, 550 * OLD[index] / 202)));

    console.log('DEGENERATE INPUT');
    check('no cells, no widths', cells.Na__LeTitleCells__Solve(500, []).length === 0);
    check('no strip, all zero', cells.Na__LeTitleCells__Solve(0, [ cells.Na__LeTitleCells__Cell({ WidthMm : 20 }, 5) ]).join() === '0');
    check('a row with no WidthMm takes the module default', cells.Na__LeTitleCells__Cell({ Key : 'X' }, 0).base === 28);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    rmSync(SCRATCH, { recursive : true, force : true });
    console.log('');
    console.log(failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED');
    process.exit(failed === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
