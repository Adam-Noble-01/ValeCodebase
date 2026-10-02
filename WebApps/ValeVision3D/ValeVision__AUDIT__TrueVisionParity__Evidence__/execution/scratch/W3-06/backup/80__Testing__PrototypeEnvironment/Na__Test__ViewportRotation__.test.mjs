// =============================================================================
// VALEVISION3D - TEST - ROTATABLE VIEWPORTS
// =============================================================================
//
// FILE       : Na__Test__ViewportRotation__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Viewport Rotation Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove a viewport turns about the middle of its frame, Shift holds quarter turns, and everything that reads the frame reads the turned one
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - THE GEOMETRY (the real Na__LayoutEditor__ViewportRotation__ leaf): the
//   angle wraps into (-180, 180], a turn and its undoing are inverse, the
//   turned corners, box, containment and distance are right, Settle holds
//   Shift's quarter turns and the right-angle detent, and the PDF matrix puts
//   a level point exactly where the turn puts it on the paper.
// - THE HANDLES (the shipped Na__LayoutEditor__ViewportHandles__, imports
//   stubbed): a rotate drag turns by the swing round the middle, Shift lands on
//   90 degree steps counted from level, a crop on a turned frame keeps the edge
//   opposite its handle where it is on the paper, a pan slides the drawing the
//   way the hand went, a move is still a paper move, and a handle's resize
//   arrow turns with the frame. Hit tests and containment read the turned frame.
// - THE WINDOW and THE SNAP INDEX (the shipped units): ToPaper and FromPaper
//   carry the turn and undo it; the index files a turned drawing's lines where
//   they are painted, clipped to the frame in the frame's own axes.
// - THE CHROME (the shipped Na__LayoutEditor__SheetChrome__): a turned
//   viewport's frame line and caption come out as one turned group, written
//   as one SVG rotate about the middle and, through jsPDF itself, as one
//   balanced matrix in the PDF; a level viewport's are exactly as before.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs
// - Source version: 1.0.1 (TrueVision3D v2.138.0, 21-Sep-2026, written as 1.0.0; 1.0.1 of 22-Sep-2026 is
//                   the Node 22 navigator fix in the jsPDF part, named in no TrueVision release; read at
//                   b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2 (the leaf section; package W3-06
//                   completes the suite)
// - Parity        : adapted - TrueVision's file with three of its four check regions not yet taken
// - Divergences   :
//   - Banner and the first line the test prints read ValeVision3D.
//   - Only THE GEOMETRY region is here: the real ViewportRotation leaf, 16 of TrueVision's 52 checks.
//     The HANDLES, the WINDOW AND THE SNAP INDEX and the CHROME AND A REAL jsPDF regions arrive whole
//     with W3-06 (rotatable viewports), once this app has ViewportHandles 1.5.0, the turned Window,
//     the 28__System__ObjectSnap units and SheetChrome's turned group. The DESCRIPTION above is
//     TrueVision's and describes the whole suite; the imports and the browser stand-in those regions
//     use are kept as TrueVision has them, so W3-06 adds the regions back and nothing else.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 22-Sep-2026 - Version 1.0.1
// - Node 21 and later give globalThis a navigator of their own, a getter
//   that throws when a module assigns to it, so the file stopped at the
//   jsPDF load on Node 22. One is now defined only where there is none.
//
// 21-Sep-2026 - Version 1.0.0
// - Written with rotatable viewports (TrueVision3D v2.138.0).
//
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough
// -----------------------------------------------------------------------------

    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
    globalThis.window = {
        addEventListener    : () => {},
        removeEventListener : () => {},
        dispatchEvent       : () => true,
        localStorage        : { getItem : () => null, setItem : () => {}, removeItem : () => {} },
        setTimeout, clearTimeout,
        requestAnimationFrame : () => 0,
        cancelAnimationFrame  : () => {}
    };
    globalThis.document = { body : { classList : { add : () => {}, remove : () => {}, toggle : () => {} } } };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading a Module With Its Imports Stubbed
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');
    const LE         = '51__System__LayoutEditor/';
    const IMPORT     = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;

    // The Move Retype test's loader: every name a module imports gets the
    // test's stub when it gives one, else a function returning undefined.
    let loadCount = 0;
    async function load(relative, stubs) {
        let src = readFileSync(resolve(SRC, relative), 'utf8').replace(/\r\n/g, '\n');
        const names = [];
        let m;
        IMPORT.lastIndex = 0;
        while ((m = IMPORT.exec(src)) !== null) {
            const list = m[1].trim();
            if (list.charAt(0) !== '{') continue;
            list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
        }
        const had = /^\s*import\s/m.test(src);
        src = src.replace(IMPORT, '');
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        const key = '__VpRotStubs' + (++loadCount);
        globalThis[key] = stubs || {};
        const head = names.map((n) =>
            'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };'
        ).join('\n');
        const tmp = join(tmpdir(), 'Na__Test__ViewportRotation__' + loadCount + '__.mjs');
        writeFileSync(tmp, head + '\n' + src, 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    function check(name, got, want) {
        const passed = JSON.stringify(got) === JSON.stringify(want);
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    }
    const r3 = (v) => Math.round(v * 1000) / 1000 + 0;                          // <-- + 0 turns -0 into 0
    const r2 = (v) => Math.round(v * 100) / 100 + 0;
    const pt = (p) => (p ? { x : r3(p.x), y : r3(p.y) } : p);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Geometry (the real leaf)
// -----------------------------------------------------------------------------

    console.log('\nValeVision3D - rotatable viewports\n\n  The geometry (the real ViewportRotation leaf)');
    const Rot = await load(LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js', {});

    check('an angle wraps into (-180, 180]', [ 270, -270, 180, -180, 540, 0.0000000001, 'x' ].map((d) => Rot.Na__LeVpRot__WrapDeg(d)), [ -90, 90, 180, 180, 180, 0, 0 ]);
    check('Shift holds quarter turns counted from level', [ 44, 46, 136, -100, 181 ].map((d) => Rot.Na__LeVpRot__Settle(d, 90, 2)), [ 0, 90, 180, -90, 180 ]);
    check('free, it settles on a right angle within the detent and nowhere else', [ 88.5, 91.9, 87.9, 30 ].map((d) => Rot.Na__LeVpRot__Settle(d, 0, 2)), [ 90, 90, 87.9, 30 ]);

    const vp = (deg, frame) => ({ Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__FrameMm : Object.assign({ X : 100, Y : 100, WidthMm : 200, HeightMm : 100 }, frame || {}),
                                  Viewport__PanMm : { X : 0, Y : 0 }, Viewport__ScaleDenominator : 50, Viewport__ImageMm : { WidthMm : 200, HeightMm : 100 },
                                  Viewport__ImageOffsetMm : { X : 0, Y : 0 }, Viewport__RotationDeg : deg });
    const q = vp(90);
    check('the middle of the frame is what it turns about', pt(Rot.Na__LeVpRot__Centre(q)), { x : 200, y : 150 });
    check('a quarter turn clockwise carries the level top-left corner to the top right of where it was (y runs down)', pt(Rot.Na__LeVpRot__ToPaper(q, 100, 100)), { x : 250, y : 50 });
    check('ToFrame undoes ToPaper', pt(Rot.Na__LeVpRot__ToFrame(q, 250, 50)), { x : 100, y : 100 });
    check('the turned corners, level top-left first', Rot.Na__LeVpRot__Corners(q).map(pt), [ { x : 250, y : 50 }, { x : 250, y : 250 }, { x : 150, y : 250 }, { x : 150, y : 50 } ]);
    check('the box round a quarter-turned frame is its height wide and its width tall', (() => { const b = Rot.Na__LeVpRot__Bounds(q); return [ r3(b.X), r3(b.Y), r3(b.WidthMm), r3(b.HeightMm) ]; })(), [ 150, 50, 100, 200 ]);
    check('a level frame\'s box is the frame itself', Rot.Na__LeVpRot__Bounds(vp(0)), { X : 100, Y : 100, WidthMm : 200, HeightMm : 100 });
    check('a point inside the turned frame but outside the level one is inside', [ Rot.Na__LeVpRot__Contains(q, { x : 200, y : 60 }), Rot.Na__LeVpRot__Contains(vp(0), { x : 200, y : 60 }) ], [ true, false ]);
    check('and one inside the level frame but outside the turned one is not', Rot.Na__LeVpRot__Contains(q, { x : 110, y : 150 }), false);
    check('the distance to a turned frame is measured to its turned edge', r3(Rot.Na__LeVpRot__DistanceTo(q, { x : 270, y : 150 })), 20);
    check('the CSS turn is nothing when level, and appended after the translate when turned', [ Rot.Na__LeVpRot__CssRotate(0), Rot.Na__LeVpRot__CssRotate(-90) ], [ '', ' rotate(-90deg)' ]);

    // THE PDF MATRIX. jsPDF's default API writes page units into PDF space:
    // points, y running UP. Apply the written cm to a level point's PDF
    // position and it must land on the turned point's PDF position.
    const writes = [];
    let saved = 0;
    const fakeDoc = { internal : { scaleFactor : 72 / 25.4, pageSize : { getHeight : () => 297 }, write : (...a) => writes.push(a) }, saveGraphicsState : () => { saved++; } };
    check('a level viewport opens no graphics state', Rot.Na__LeVpRot__PdfTurn(fakeDoc, 200, 150, 0), false);
    check('a turned one opens one and writes one cm', [ Rot.Na__LeVpRot__PdfTurn(fakeDoc, 200, 150, 30), saved, writes.length, writes[0] && writes[0][6] ], [ true, 1, 1, 'cm' ]);
    const M = writes[0].slice(0, 6).map(Number), k = 72 / 25.4, H = 297;
    const t30 = vp(30);
    const pdfOf = (p) => [ p.x * k, (H - p.y) * k ];
    const apply = (m, xy) => [ (m[0] * xy[0]) + (m[2] * xy[1]) + m[4], (m[1] * xy[0]) + (m[3] * xy[1]) + m[5] ];
    const probe = [ { x : 100, y : 100 }, { x : 300, y : 200 }, { x : 150, y : 180 } ];
    check('the matrix puts each level point where the turn puts it on the paper (to a hundredth of a point, 0.004 mm)',
        probe.map((p) => apply(M, pdfOf(p)).map(r2)), probe.map((p) => pdfOf(Rot.Na__LeVpRot__ToPaper(t30, p.x, p.y)).map(r2)));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.log('');
    if (failures) { console.log(failures + ' check(s) FAILED.'); process.exit(1); }
    console.log('Every check passed.');

// endregion -------------------------------------------------------------------
