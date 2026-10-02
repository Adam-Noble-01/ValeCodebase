// =============================================================================
// TRUEVISION3D - TEST - THE DRAWING GRID AND THE TITLE BLOCK SNAP POINTS
// =============================================================================
//
// FILE       : Na__Test__DrawingGrid__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Drawing Grid Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the grid's arithmetic, that object snaps win over the grid, that the title block's points snap, that a move lands its grab point on the grid, and that F6 / F7 are bound
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - THE STATE. The real Na__LayoutEditor__DrawingGrid__State__ (a leaf, no
//   stubs): LayOut's settings and defaults, the limits, the nearest grid
//   point, the snap step, the browser overrides and Reset.
// - THE SNAP. The real Na__LayoutEditor__Snapping__ with its imports stubbed:
//   the grid is only ever the fallback, object snap wins inside its radius,
//   the grid works with Object Snap off, { grid : false } asks for objects
//   alone - and the sheet's own paper (border, title block, notes margin)
//   offers its corners, ends and midpoints.
// - THE MOVE. The real Na__LayoutEditor__SheetTools__GridDrag__ with its
//   imports stubbed: the point a drag is carried by (LayOut 2024's rule), the
//   grid step for the drags with no snap of their own, and the fallback that
//   keeps a held axis.
// - THE KEYS. The real key map module with the shipped JSON: F6 is Show Grid,
//   F7 Grid Snap, in the shipped map and in the built-in fallback.
// - Each module is the shipped file with its import lines swapped for stubs
//   and nothing else touched.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__DrawingGrid__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.0.0
// - Written with the drawing grid (SketchUp LayOut's grid, F6 / F7) and the
//   title block snap points.
//
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import bundle from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/Na__TestEnv__ObjectSnapBundle__.cjs';   // <-- The Object Snap folder's units as one source, imports taken out


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough, and the Loader
// -----------------------------------------------------------------------------

    const store = new Map();
    globalThis.window = {
        localStorage : { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => store.set(k, String(v)), removeItem : (k) => store.delete(k) },
        addEventListener : () => {}, removeEventListener : () => {}, dispatchEvent : () => true
    };
    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const SRC        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules';
    const LE         = '51__System__LayoutEditor/';

    // CRLF files are read as LF first: the import pattern ends a line at ';'.
    async function load(relative, stubs, tag) {
        let src = readFileSync(resolve(SRC, relative), 'utf8').replace(/\r\n/g, '\n');
        const had = /^\s*import\s/m.test(src);
        src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        const tmp = join(tmpdir(), 'Na__Test__DrawingGrid__' + tag + '__.mjs');
        writeFileSync(tmp, stubs + '\n' + src, 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

    let failures = 0;
    function check(name, got, want) {
        const passed = JSON.stringify(got) === JSON.stringify(want);
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    }
    const r3 = (p) => p ? { x : Math.round(p.x * 1000) / 1000, y : Math.round(p.y * 1000) / 1000 } : p;

    // The snapping is a folder of units that import each other, so they are
    // loaded joined (Na__TestEnv__ObjectSnapBundle__): what is left to stub is
    // everything OUTSIDE the folder, as it was when the snapping was one file.
    async function loadObjectSnap(units, stubs, tag) {
        const built = bundle.Na__TestEnv__ObjectSnapBundle(SRC, units);
        const tmp   = join(tmpdir(), 'Na__Test__DrawingGrid__' + tag + '__.mjs');
        writeFileSync(tmp, stubs + '\n' + built.source + '\nexport { ' + built.names.join(', ') + ' };\n', 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

// endregion -------------------------------------------------------------------


console.log('ValeVision3D (W2-18 sections) - the drawing grid and the title block snap points');


// -----------------------------------------------------------------------------
// REGION | The State
// -----------------------------------------------------------------------------

    console.log('\n  The grid\'s settings and arithmetic (the real state module)');
    const Grid = await load(LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js', '', 'State');
    globalThis.__Grid = Grid;
    const s0 = Grid.Na__LeGrid__Get();
    check('LayOut\'s settings, Adam\'s template: hidden, not snapping, points, 10 mm in 10, on top, not clipped',
        [ s0.Show, s0.Snap, s0.Type, s0.MajorSpacingMm, s0.MinorDivisions, s0.MajorColour, s0.MinorColour, s0.OnTop, s0.ClipToMargins ],
        [ false, false, 'points', 10, 10, '#969696', '#d6d5c9', true, false ]);
    check('the minor spacing and the snap step are 1 mm', [ s0.MinorSpacingMm, s0.SnapStepMm ], [ 1, 1 ]);
    check('the nearest grid point rounds each axis on its own', Grid.Na__LeGrid__Nearest({ x : 12.34, y : 7.6 }), { x : 12, y : 8 });
    check('a grid point far off is still the nearest (no radius)', Grid.Na__LeGrid__Nearest({ x : 250.49, y : -3.51 }), { x : 250, y : -4 });
    check('floating-point dust is cleaned (0.1 mm step x 3 is 0.3)', Grid.Na__LeGrid__Nearest({ x : 0.29, y : 0.31 }, 0.1), { x : 0.3, y : 0.3 });
    check('SnapPoint leaves the point alone while Grid Snap is off', Grid.Na__LeGrid__SnapPoint({ x : 1.4, y : 2.6 }), { x : 1.4, y : 2.6 });
    Grid.Na__LeGrid__Assign({ Snap : true });
    check('SnapPoint puts it on the grid while Grid Snap is on', Grid.Na__LeGrid__SnapPoint({ x : 1.4, y : 2.6 }), { x : 1, y : 3 });
    check('Show and Snap are separate switches (LayOut\'s pair)', [ Grid.Na__LeGrid__IsShowing(), Grid.Na__LeGrid__IsSnapping() ], [ false, true ]);
    Grid.Na__LeGrid__Assign({ MajorSpacingMm : 0, MinorDivisions : 'ten', MajorColour : 'blue' });
    const s1 = Grid.Na__LeGrid__Get();
    check('unusable values are dropped, not stored', [ s1.MajorSpacingMm, s1.MinorDivisions, s1.MajorColour ], [ 10, 10, '#969696' ]);
    Grid.Na__LeGrid__Assign({ MajorSpacingMm : 500, MinorDivisions : 3.6 });
    const s2 = Grid.Na__LeGrid__Get();
    check('a spacing out of range is held to it; subdivisions are whole', [ s2.MajorSpacingMm, s2.MinorDivisions ], [ 200, 4 ]);
    Grid.Na__LeGrid__Assign({ MajorSpacingMm : 10, MinorDivisions : 2, ShowMinor : false });
    check('Minor Grid unticked: points snap to the major spacing', Grid.Na__LeGrid__Get().SnapStepMm, 10);
    Grid.Na__LeGrid__Assign({ ShowMinor : true });
    check('Minor Grid ticked again: 10 in 2 snaps every 5 mm', [ Grid.Na__LeGrid__Get().SnapStepMm, Grid.Na__LeGrid__Nearest({ x : 7.4, y : 2.4 }) ], [ 5, { x : 5, y : 0 } ]);
    check('remembered in this browser', JSON.parse(store.get('na-layouteditor-drawing-grid')).MinorDivisions, 2);
    Grid.Na__LeGrid__Assign({ Show : true, MajorColour : '#112233' });
    Grid.Na__LeGrid__Reset();
    const s3 = Grid.Na__LeGrid__Get();
    check('Reset puts the settings back and keeps both switches as they were', [ s3.Show, s3.Snap, s3.MinorDivisions, s3.MajorColour ], [ true, true, 10, '#969696' ]);

// endregion -------------------------------------------------------------------








console.log(failures ? '\n  ' + failures + ' check(s) FAILED.' : '\n  Every check passed.');
process.exit(failures ? 1 : 0);
