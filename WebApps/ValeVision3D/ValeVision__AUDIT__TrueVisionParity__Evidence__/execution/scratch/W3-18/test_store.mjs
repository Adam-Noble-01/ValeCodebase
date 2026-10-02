// W3-18 scratch check: the VV Store over the Flask sheet-images routes (fetch and the ProjectLoader stubbed).
// Usage: node test_store.mjs <VV app root>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = process.argv[2];
const REL  = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js';
let failures = 0, passes = 0;
function check(label, got, want) {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    if (a === b) { passes++; console.log('  ok   ' + label); } else { failures++; console.log('  FAIL ' + label + '\n       got  ' + a + '\n       want ' + b); }
}
let src = readFileSync(resolve(ROOT, REL), 'utf8');
const imports = src.match(/^[ \t]*import\s+\{[\s\S]*?\}\s+from\s+'[^']+';/gm) || [];
check('one import, from ProjectLoader, without the host test', [ imports.length, /ProjectLoader\.js'/.test(imports[0] || ''), /IsRunningOnLocalhost/.test(src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')) ], [ 1, true, false ]);
src = src.replace(/^[ \t]*import\s+\{[\s\S]*?\}\s+from\s+'[^']+';[ \t]*$/gm, '');
const stubs = `
    const Na__AppUtils__GetProjectFolderFromUrl = () => globalThis.__w.folder;
    const Na__AppUtils__GetYearFromUrl          = () => globalThis.__w.year;
`;
const tmp = join(tmpdir(), 'Na__W318__Store__.mjs');
writeFileSync(tmp, stubs + src, 'utf8');
const W = { folder : null, year : null, calls : [], answer : null, health : null };
globalThis.__w = W;
globalThis.window = { location : { origin : 'https://app.example.test' } };
globalThis.fetch = async (url, init) => {
    W.calls.push({ url, method : (init && init.method) || 'GET' });
    if (url.endsWith('/api/health')) return { ok : !!W.health, status : W.health ? 200 : 404, json : async () => W.health };
    return W.answer;
};
const S = await import(pathToFileURL(tmp).href);
check('exports are TrueVision\'s four', Object.keys(S).sort(), [ 'Na__LeImgStore__IsLocal', 'Na__LeImgStore__List', 'Na__LeImgStore__Reconcile', 'Na__LeImgStore__Upload' ]);
check('no project folder: not local, every call skipped, nothing fetched', [ S.Na__LeImgStore__IsLocal(), await S.Na__LeImgStore__List(), W.calls.length ], [ false, { ok : false, skipped : true, error : null }, 0 ]);
W.folder = '3047__Doous'; W.year = '2026';
check('a project folder on any host: local (no host test)', S.Na__LeImgStore__IsLocal(), true);
W.answer = { ok : true, status : 200, json : async () => ({ status : 'ok', created : true }) };
const up = await S.Na__LeImgStore__Upload('3047_D01', 'Cgi__0123456789.webp', new Blob([ 'x' ], { type : 'image/webp' }));
check('upload goes to the same origin\'s /api/valevision/sheet-images/upload with TrueVision\'s query names', [ up.ok, W.calls[0].url, W.calls[0].method ],
      [ true, 'https://app.example.test/api/valevision/sheet-images/upload?project-folder=3047__Doous&year=2026&folder=3047_D01&name=Cgi__0123456789.webp', 'POST' ]);
W.calls = [];
W.answer = { ok : false, status : 404, json : async () => { throw new Error('html'); } };
W.health = { status : 'ok', service : 'whitecardopedia-local-dev' };
let r = await S.Na__LeImgStore__Reconcile([ { folder : '3047_D01', file : 'A__aaaaaaaaaa.webp' } ]);
check('routes missing on the Whitecardopedia server: a restart is asked for', [ r.ok, r.skipped, /Whitecardopedia local server .* restart it/.test(r.error), W.calls.map((c) => c.url.replace('https://app.example.test', '')) ],
      [ false, false, true, [ '/api/valevision/sheet-images/reconcile?project-folder=3047__Doous&year=2026', '/api/health' ] ]);
W.health = { status : 'ok', service : 'na-projectvision-local-dev' };
r = await S.Na__LeImgStore__List();
check('another server: the app must be served by the Whitecardopedia local server', [ r.ok, /no sheet image routes at .* \(HTTP 404\) - serve the app with the Whitecardopedia local server/.test(r.error) ], [ false, true ]);
check('nothing to write is refused without a call', [ (await S.Na__LeImgStore__Upload('a', 'b', new Blob([]))).error ], [ 'nothing to write' ]);
console.log('\n  ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
