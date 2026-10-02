// =============================================================================
// W0-15 SCRATCH COPY - TrueVision's Na__Test__AuthoringZoomMax__.test.mjs (1.0.0,
// read at b2aa9151), THE CONFIG section only ("Sections earlier": the whole test
// is ported by W1-36 with Navigation 1.3.0). Run against ValeVision's units.
//
// Usage: node Na__Test__AuthoringZoomMax__ConfigHalf__.scratch.mjs [<config folder>]
//   <config folder> defaults to the live VV 03__Core__Config folder.
// Changes from TrueVision's file: only the folder the units are read from, and
// the Navigation clamp sections are left out (they need Navigation 1.3.0).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const DIR    = resolve(process.argv[2] || 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D\\02__Src__AppModules\\51__System__LayoutEditor\\03__Core__Config');
const CONFIG = resolve(DIR, 'Na__LayoutEditor__AppConfig__.json');

async function load(file, stubs, tag) {
    let src = readFileSync(resolve(DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const had = /^\s*import\s/m.test(src);
    src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
    if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + file); process.exit(1); }
    const tmp = join(tmpdir(), 'W0-15__AuthoringZoomMax__' + tag + '__.mjs');
    writeFileSync(tmp, stubs + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

globalThis.fetch = async () => ({ ok : true, status : 200, json : async () => JSON.parse(readFileSync(CONFIG, 'utf8')) });

const Readers = await load('Na__LayoutEditor__ConfigState__Readers__.js', '', 'Readers');
if (!(await Readers.Na__LeCfg__Fetch())) { console.error('FAIL: the shipped config did not load'); process.exit(1); }
globalThis.__Readers = Readers;
const Setup = await load('Na__LayoutEditor__ConfigState__EditorSetup__.js', [
    'const Na__LeCfg__Val = (...a) => globalThis.__Readers.Na__LeCfg__Val(...a);',
    'const Na__LeCfg__Num = (...a) => globalThis.__Readers.Na__LeCfg__Num(...a);'
].join('\n'), 'EditorSetup');

let failures = 0;
function check(name, got, want) {
    const passed = JSON.stringify(got) === JSON.stringify(want);
    if (!passed) failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
    if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}

console.log('\n  The navigation block, read from the shipped config (' + CONFIG + ')');
const nav   = Readers.Na__LeCfg__Config.LayoutEditor__Navigation__Config;
const kept  = nav.LayoutEditor__Navigation__AuthoringZoomMax;
const both  = () => { const s = Setup.Na__LeCfg__GetNavigationSetup(); return { zoomMax : s.zoomMax, authoringZoomMax : s.authoringZoomMax }; };
check('Shipped: a reader stops at 8, an author at 64',            both(), { zoomMax : 8, authoringZoomMax : 64 });
delete nav.LayoutEditor__Navigation__AuthoringZoomMax;
check('No AuthoringZoomMax in the config: an author still gets 64', both(), { zoomMax : 8, authoringZoomMax : 64 });
nav.LayoutEditor__Navigation__AuthoringZoomMax = 4;
check('An author is never held closer than a reader',             both(), { zoomMax : 8, authoringZoomMax : 8 });
nav.LayoutEditor__Navigation__AuthoringZoomMax = 128;
check('A higher AuthoringZoomMax is honoured as written',         both(), { zoomMax : 8, authoringZoomMax : 128 });
nav.LayoutEditor__Navigation__AuthoringZoomMax = kept;

console.log('');
if (failures) { console.log('  ' + failures + ' check(s) FAILED'); process.exit(1); }
console.log('  Every check passed.');
process.exit(0);
