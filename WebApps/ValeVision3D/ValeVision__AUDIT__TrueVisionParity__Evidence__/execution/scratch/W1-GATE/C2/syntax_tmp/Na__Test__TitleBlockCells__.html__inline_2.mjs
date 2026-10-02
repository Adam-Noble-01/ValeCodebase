
// The sheet model comes FIRST on purpose: the record, model and panel modules are a
// knot of long-standing import cycles, and the app enters that knot at the model.
import { Na__LeModel__GetFields }  from './02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
import { Na__LeCfg__Ready,
         Na__LeCfg__GetTitleBlockSetup } from './02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js';
import { Na__LeLayout__Solve }     from './02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js';
import { Na__LeChrome__Build,
         Na__LeChrome__LoadAsset,
         Na__LeChrome__ToSvgMarkup } from './02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js';

const log = [];
function say(line) { log.push(line); document.getElementById('out').textContent = log.join('\n'); }

const LONG_TITLE = 'Permitted Development Compliance - Existing Conditions & Design Proposal Elevations';

// A sheet shaped like a real one, with only what the title block and layout read.
// Sheet__CommonFields is false so the sheet's own Client and Site Address print:
// with no project loaded the pack has none to offer.
function sheet(order, paper, orientation, scales, fields) {
    const stored = Object.assign({
        Sheet__Fields__Client        : 'Mordaunt',
        Sheet__Fields__SiteAddress   : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE',
        Sheet__Fields__Title         : 'Proposed Orangery - Elevations',
        Sheet__Fields__DocumentId    : '57079_D' + String(order).padStart(2, '0'),
        Sheet__Fields__Revision      : 'B',
        Sheet__Fields__Status        : 'FOR PLANNING'
    }, fields || {});
    Object.keys(stored).forEach((key) => { if (stored[key] === null) delete stored[key]; });
    return {
        Sheet__Id          : 'Sheet_' + order,
        Sheet__Name        : 'Elevations',
        Sheet__Order       : order,
        Sheet__PaperSize   : paper,
        Sheet__Orientation : orientation,
        Sheet__TitleBlockStyle : 'modern',
        Sheet__CommonFields : false,
        Sheet__Fields      : stored,
        Sheet__Layers      : [],
        Sheet__Viewports   : scales.map((d, i) => ({ Viewport__Id : 'Vp_' + i, Viewport__Kind : '2d', Viewport__ScaleDenominator : d })),
        Sheet__Annotations : [], Sheet__Dimensions : [], Sheet__Shapes : [],
        Sheet__Leaders : [], Sheet__Groups : []
    };
}

const CASES = [
    [ 'A typical Vale sheet',                  sheet(2, 'A2', 'landscape', [ 50 ]) ],
    [ 'The same sheet with a long title',      sheet(3, 'A2', 'landscape', [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ],
    [ 'Status never chosen',                   sheet(4, 'A2', 'landscape', [ 50, 100 ], { Sheet__Fields__Status : null }) ],
    [ 'A1, the longest status',                sheet(5, 'A1', 'landscape', [ 100 ], { Sheet__Fields__Status : 'FOR BUILDING CONTROL' }) ],
    [ 'A3 with the long title, which the old shares cut', sheet(6, 'A3', 'landscape', [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ],
    [ 'A3 with three scales and a long client', sheet(7, 'A3', 'landscape', [ 20, 50, 100 ], { Sheet__Fields__Client : 'Mr & Mrs Featherstonehaugh', Sheet__Fields__Status : 'FOR CONSTRUCTION', Sheet__Fields__Title : LONG_TITLE }) ],
    [ 'A4 landscape, narrower than the strip', sheet(8, 'A4', 'landscape', [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ],
    [ 'A4 portrait, where nothing fits',       sheet(9, 'A4', 'portrait',  [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ],
    [ 'A2 at 1:100 and 1:200',                 sheet(10, 'A2', 'landscape', [ 100, 200 ]) ]
];

(async () => {
    try {
        await Na__LeCfg__Ready();
        const setup = Na__LeCfg__GetTitleBlockSetup();
        const logo  = await Na__LeChrome__LoadAsset(setup.logoAssetPath);
        say('Config loaded. jsPDF present: ' + !!(window.jspdf && window.jspdf.jsPDF) + ' (text is measured in its Helvetica). Logo loaded: ' + !!logo);
        say('Rows: ' + setup.rows.map((row) => row.Key + ' ' + row.WidthMm + (row.Flex ? ' flex' : '')).join(' | '));
        say('');

        const host    = document.getElementById('cases');
        const results = [];
        CASES.forEach(([ title, s ]) => {
            const fields = Na__LeModel__GetFields(s);
            const layout = Na__LeLayout__Solve(s);
            const prims  = Na__LeChrome__Build(layout, s, { fields : fields, includeFrames : false });
            const band   = layout.TitleBlock;

            // Crop the page-wide primitive list down to the title block band alone.
            const inBand = prims.map((p) => {
                const c = JSON.parse(JSON.stringify(p));
                if (typeof c.Y  === 'number') c.Y  -= band.Y;
                if (typeof c.Y1 === 'number') c.Y1 -= band.Y;
                if (typeof c.Y2 === 'number') c.Y2 -= band.Y;
                if (typeof c.BaselineY === 'number') c.BaselineY -= band.Y;
                return c;
            }).filter((c) => {
                const y = [ c.Y, c.Y1, c.Y2, c.BaselineY ].filter((v) => typeof v === 'number');
                return y.length === 0 || y.some((v) => v >= -1 && v <= band.HeightMm + 1);
            });

            // THE CELLS AS DRAWN | The vertical rules, left to right, read off the primitives.
            const rules = inBand.filter((c) => c.Kind === 'line' && Math.abs(c.X1 - c.X2) < 1e-9).map((c) => c.X1).sort((a, b) => a - b);
            const edges = rules.concat([ band.X + band.WidthMm ]);
            const logoW = rules[0] - band.X;
            const texts = inBand.filter((c) => c.Kind === 'text');
            const cells = setup.rows.map((row, index) => {
                const left  = edges[index];
                const right = edges[index + 1];
                const mine  = texts.filter((t) => t.X >= left && t.X < right).sort((a, b) => a.BaselineY - b.BaselineY);
                const value = mine.length > 1 ? mine[mine.length - 1].Text : '';
                return { key : row.Key, widthMm : right - left, label : mine.length ? mine[0].Text : '', value : value, cut : /\.\.\.$/.test(value) || (mine.length ? /\.\.\.$/.test(mine[0].Text) : false) };
            });
            const sum = cells.reduce((total, cell) => total + cell.widthMm, 0) + logoW;

            // TWO VIEWS | The whole strip fitted to the page, for the proportions; then the
            // same strip at a fixed 3.2 px per millimetre in a scrolling box, for the type.
            const wrap = document.createElement('div');
            wrap.className = 'case';
            const pxPerMm = 3.2;
            const markup  = Na__LeChrome__ToSvgMarkup(inBand, band.X + band.WidthMm + band.X, band.HeightMm);
            wrap.innerHTML =
                '<div class="head">' + title + ' &mdash; <b>' + s.Sheet__PaperSize + ' ' + s.Sheet__Orientation + '</b> &mdash; strip ' + band.WidthMm.toFixed(0) + ' mm, logo cell ' + logoW.toFixed(1) + ' mm</div>' +
                '<div class="strip">' + markup + '</div>' +
                '<div class="strip" style="margin-top:4px"><div style="width:' + Math.round((band.WidthMm + band.X * 2) * pxPerMm) + 'px">' + markup + '</div></div>' +
                '<div class="cells">' + cells.map((cell) => (cell.cut ? '<b>' : '') + cell.key + ' ' + cell.widthMm.toFixed(1) + (cell.cut ? ' CUT</b>' : '')).join('   ') + '</div>';
            host.appendChild(wrap);

            results.push({ title : title, paper : s.Sheet__PaperSize + ' ' + s.Sheet__Orientation, stripMm : band.WidthMm, logoCellMm : logoW, sumMm : sum, cells : cells });
            say((s.Sheet__PaperSize + ' ' + s.Sheet__Orientation).padEnd(14) + cells.map((cell) => cell.key + ' ' + cell.widthMm.toFixed(1) + (cell.cut ? '*' : '')).join('  ') + '   (sum ' + sum.toFixed(2) + ' of ' + band.WidthMm.toFixed(2) + ')');
        });

        say('');
        say('* = the value or the label was cut short with an ellipsis.');
        say('DONE - ' + CASES.length + ' sheets built with no error.');
        window.__TEST_RESULT = { logo : !!logo, results : results };
    } catch (error) {
        say('ERROR: ' + (error && error.stack ? error.stack : error));
        window.__TEST_RESULT = 'ERROR: ' + (error && error.stack ? error.stack : error);
    }
})();
