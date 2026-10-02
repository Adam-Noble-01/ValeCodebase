
// The sheet model comes FIRST on purpose. The Layout Editor's record, model and
// panel modules are a knot of long-standing import cycles, and entering that knot
// at the record module leaves its consts in the temporal dead zone when the model
// state module reads them. The app enters at the model, so this page does too, and
// asks the model for the fields exactly as the sheet surface does.
import { Na__LeModel__GetFields }  from '../02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
import { Na__LeCfg__Ready }        from '../02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js';
import { Na__LeLayout__Solve }     from '../02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js';
import { Na__LeChrome__Build,
         Na__LeChrome__ToSvgMarkup } from '../02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js';

const log = [];
function say(line) { log.push(line); document.getElementById('out').textContent = log.join('\n'); }

// A sheet shaped like a real one, with only what the title block and layout read.
function sheet(name, order, paper, orientation, scales, drawingType) {
    return {
        Sheet__Id          : 'Sheet_' + order,
        Sheet__Name        : name,
        Sheet__Order       : order,
        Sheet__PaperSize   : paper,
        Sheet__Orientation : orientation,
        Sheet__TitleBlockStyle : 'modern',
        Sheet__DrawingType : drawingType || undefined,
        Sheet__Fields      : { Sheet__Fields__Client : 'Mordaunt',
                               Sheet__Fields__SiteAddress : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE' },
        Sheet__Layers      : [],
        Sheet__Viewports   : scales.map((d, i) => ({
            Viewport__Id : 'Vp_' + i,
            Viewport__Kind : d === null ? '3d' : '2d',
            Viewport__ScaleDenominator : d
        })),
        Sheet__Annotations : [], Sheet__Dimensions : [], Sheet__Shapes : [],
        Sheet__Leaders : [], Sheet__Groups : []
    };
}

const CASES = [
    [ 'D01 - Floor Plans',       sheet('D01 - Floor Plans', 1, 'A2', 'landscape', [ 50, 50 ]) ],
    [ 'D03 - 3D Images',         sheet('D03 - 3D Images',   3, 'A3', 'landscape', [ null, null, null ]) ],
    [ 'D10 - Site Plan',         sheet('D10 - Site Plan',   4, 'A2', 'landscape', [ 500, 1250 ], 'siteplan') ],
    [ 'Mixed architectural, A3', sheet('Mixed scales',      5, 'A3', 'landscape', [ 100, 20, 50 ]) ],
    [ 'Mixed, smallest paper',   sheet('Mixed on A4',       6, 'A4', 'landscape', [ 50, 100 ]) ],
    [ 'Single scale, A1',        sheet('One scale on A1',   7, 'A1', 'landscape', [ 20 ]) ]
];

(async () => {
    try {
        await Na__LeCfg__Ready();
        say('Config loaded. jsPDF present: ' + !!(window.jspdf && window.jspdf.jsPDF));
        say('');

        const host = document.getElementById('cases');
        CASES.forEach(([ title, s ]) => {
            const fields = Na__LeModel__GetFields(s);
            const layout = Na__LeLayout__Solve(s);
            const prims  = Na__LeChrome__Build(layout, s, { fields : fields, includeFrames : false });

            // Crop the page-wide primitive list down to the title block band alone.
            const band  = layout.TitleBlock;
            const shift = prims.map((p) => {
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

            const wrap = document.createElement('div');
            wrap.className = 'case';
            wrap.innerHTML =
                '<div class="head">' + title + ' &mdash; ' + s.Sheet__PaperSize + ' ' + s.Sheet__Orientation +
                ' &mdash; Scale cell reads <b>' + fields.Scale.replace(/&/g, '&amp;') + '</b></div>' +
                '<div class="strip">' +
                Na__LeChrome__ToSvgMarkup(shift, band.X + band.WidthMm + band.X, band.HeightMm) +
                '</div>';
            host.appendChild(wrap);

            say(s.Sheet__PaperSize.padEnd(3) + '  ' + fields.Scale);
        });

        // VIEWPORT CAPTIONS | The frame label, in frames from generous to cramped.
        // The caption box is sized from the measured text, so the wide-frame rows
        // prove the measurement round-trip no longer loses the last characters,
        // and the narrow rows prove the type sets smaller instead of truncating.
        const CAPS = [
            [ 'LOCATION PLAN',            1250, 135 ],
            [ 'BLOCK PLAN',                500, 135 ],
            [ 'FRONT ELEVATION',            50, 120 ],
            [ 'SIDE ELEVATION',             20, 120 ],
            [ 'PROPOSED FRONT ELEVATION',  100,  45 ],
            [ 'PROPOSED FRONT ELEVATION',  100,  38 ],
            [ 'PROPOSED FRONT ELEVATION',  100,  28 ]
        ];
        const capHost = document.createElement('div');
        capHost.id = 'caps';
        document.body.insertBefore(capHost, document.getElementById('out'));
        capHost.innerHTML = '<h1 style="margin:26px 0 14px">Viewport captions</h1>';

        const capSheet = sheet('Caption cases', 9, 'A1', 'landscape', []);
        capSheet.Sheet__Layers = [];
        CAPS.forEach(([ label, denom, widthMm ], i) => {
            capSheet.Sheet__Viewports = [ {
                Viewport__Id : 'Cap_' + i, Viewport__Kind : '2d',
                Viewport__ScaleDenominator : denom,
                Viewport__Name : label,
                Viewport__FrameMm : { X : 0, Y : 0, WidthMm : widthMm, HeightMm : 40 }
            } ];
            const layout = Na__LeLayout__Solve(capSheet);
            const prims  = Na__LeChrome__Build(layout, capSheet, { fields : {}, includeTitleBlock : false });
            const frames = prims.filter((p) => (p.Y !== undefined ? p.Y : p.BaselineY) >= 30);   // the caption box and its text sit at the frame's foot
            const div = document.createElement('div');
            div.style.cssText = 'margin:0 0 10px';
            div.innerHTML = '<div style="font-size:12px;color:#a9b6c2;margin:0 0 3px">frame ' + widthMm + ' mm &#183; ' + label + ' 1:' + denom + '</div>' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(widthMm * 3.4) + '" height="' + Math.round(10 * 3.4) + '" viewBox="0 30 ' + widthMm + ' 10">' +
                '<rect x="0" y="30" width="' + widthMm + '" height="10" fill="#fff"/>' +
                Na__LeChrome__ToSvgMarkup(frames, widthMm, 40).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>';
            capHost.appendChild(div);
            say('frame ' + String(widthMm).padStart(4) + ' mm   ' + prims.filter((p) => p.Text).map((p) => p.Text).join(' | '));
        });

        say('');
        say('DONE - ' + CASES.length + ' sheets built with no error.');
        window.__TEST_RESULT = CASES.map(([ t, s ]) => t + ' => ' + Na__LeModel__GetFields(s).Scale);
    } catch (error) {
        say('ERROR: ' + (error && error.stack ? error.stack : error));
        window.__TEST_RESULT = 'ERROR: ' + error;
    }
})();
