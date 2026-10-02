// Evaluate the three import-free leaves as landed in VV (copied to .mjs so Node takes them as modules)
// and exercise a few functions; State runs without a window (its storage reads are wrapped in try).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const DIR = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/';
const tmp = mkdtempSync(join(tmpdir(), 'w242-'));
const load = async (n) => {
    const p = join(tmp, n + '.mjs');
    writeFileSync(p, readFileSync(DIR + 'Na__LayoutEditor__ObjectSnap__' + n + '__.js', 'utf8'));
    return import(pathToFileURL(p).href);
};
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } };

const geo = await load('Geometry');
const gly = await load('Glyphs');
const st  = await load('State');
console.log('Geometry exports: ' + Object.keys(geo).join(', '));
console.log('Glyphs exports  : ' + Object.keys(gly).join(', '));
console.log('State exports   : ' + Object.keys(st).length);

const c = geo.Na__LeOsnapGeo__Cross(0, 0, 10, 10, 0, 10, 10, 0);
ok('Cross of two diagonals is (5, 5)', c && Math.abs(c.x - 5) < 1e-9 && Math.abs(c.y - 5) < 1e-9);
const cen = geo.Na__LeOsnapGeo__Centroid([ [0, 0], [10, 0], [10, 4], [0, 4] ]);
ok('Centroid of a 10 x 4 rectangle is (5, 2)', cen && Math.abs(cen.x - 5) < 1e-9 && Math.abs(cen.y - 2) < 1e-9);
ok('Glyph SVG for an endpoint is an <svg>', String(gly.Na__LeOsnap__GlyphSvg('end')).includes('<svg'));
ok('State KIND_END is "end"', st.Na__LeOsnap__KIND_END === 'end');
ok('State reads on in a window-less run (default enabled, storage read wrapped)', st.Na__LeOsnap__IsEnabled() === true);
ok('Six running modes', st.Na__LeOsnap__MODES.length === 6);
console.log(pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
