// W0-10 scratch: bundle the assembled worker exactly as wrangler 3.114.17 does
// for a deploy (its bundleWorker options, wrangler-dist/cli.js :104320-104575),
// with the esbuild 0.17.19 the worker's own node_modules holds - then load the
// bundle in Node and drive it. No wrangler command is run; nothing is deployed.
//
// usage: node w0_10_bundle.mjs <assembled worker root> <out dir>
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [workerRoot, outDir] = process.argv.slice(2);
const require = createRequire('D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/CloudflareWorker/package.json');
const esbuild = require('esbuild');
const KIT     = pathToFileURL(join(workerRoot, 'tests', 'Na__TestEnv__EditorWorker__R2Bucket__.mjs')).href;

mkdirSync(outDir, { recursive : true });
const outfile = join(outDir, 'index.js');

// WRANGLER'S OPTIONS | bundleWorker() for a modules-format worker, deploy target
const result = await esbuild.build({
    entryPoints : [join(workerRoot, 'src', 'index.js')],
    bundle      : true,
    absWorkingDir : workerRoot,
    outfile     : outfile,
    keepNames   : true,
    inject      : [],
    external    : ['__STATIC_CONTENT_MANIFEST'],
    format      : 'esm',
    target      : 'es2022',
    sourcemap   : true,
    sourceRoot  : outDir,
    minify      : undefined,
    metafile    : true,
    conditions  : ['workerd', 'worker', 'browser'],
    platform    : undefined,
    define      : { 'process.env.NODE_ENV': '"undefined"' },
    loader      : { '.js': 'jsx', '.mjs': 'jsx', '.cjs': 'jsx' },
    logLevel    : 'silent'
});

const inputs  = Object.keys(result.metafile.inputs);
const bundled = readFileSync(outfile, 'utf8');
console.log('esbuild version       :', esbuild.version);
console.log('errors / warnings     :', result.errors.length, '/', result.warnings.length);
console.log('bundle bytes          :', bundled.length);
console.log('inputs                :', inputs.length);
for (const input of inputs) console.log('   ', input);
const config = inputs.find((input) => input.endsWith('Na__AppConfig__Main.json'));
console.log('config bundled from   :', config || 'NOT BUNDLED');
console.log('bundle names the list :', ['PresentationMode__SavedCameraScenes', 'GridLine__Grid__Offset__Config'].every((key) => bundled.indexOf(key) !== -1));
console.log('bundle has no JSON import left:', !/import\s+\w+\s+from\s+["'][^"']+\.json["']/.test(bundled));
writeFileSync(join(outDir, 'metafile.json'), JSON.stringify(result.metafile, null, 2));

// DRIVE THE BUNDLE | It must behave as the source does
const worker = (await import(pathToFileURL(outfile).href)).default;
const kit    = await import(KIT);
const bucket = new kit.Na__TestEnv__R2Bucket();
const env    = kit.Na__TestEnv__Env(bucket);
const call   = (method, path, options) => kit.Na__TestEnv__Call(worker, env, method, path, options);
bucket.seed('VaApps/Projects/2026/3047__Doous/project.json', JSON.stringify({ projectCode : '3047', images : [] }, null, 4));

const steps = [];
const step  = (name, ok, detail) => { steps.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '  -> ' + JSON.stringify(detail))); };
const health = await call('GET', '/api/editor/health', { key : null });
step('bundle: health reports 1.6.0 and the route list', health.json && health.json.version === '1.6.0' && health.json.routes.length === 6, health.json);
const merged = await call('POST', '/api/editor/projects/2026%2F3047__Doous/merge-keys', { json : { set : { LayoutEditor__DrawingsData : { LayoutEditor__DrawingsData__SavedIso : 'x' } } } });
step('bundle: merge-keys sets a listed key', merged.status === 200 && JSON.parse(bucket.textOf('VaApps/Projects/2026/3047__Doous/project.json')).LayoutEditor__DrawingsData, merged);
const refused = await call('POST', '/api/editor/projects/2026%2F3047__Doous/merge-keys', { json : { set : { images : ['x'] } } });
step('bundle: merge-keys refuses a pipeline key', refused.status === 400, refused);
const unlisted = await call('POST', '/api/editor/projects/2026%2F3047__Doous/merge-keys', { json : { set : { LayoutEditor__Foo : 1 } } });
step('bundle: merge-keys refuses an unlisted key inside a listed prefix', unlisted.status === 400, unlisted);
const write = await call('POST', '/api/editor/projects/2026%2F3047__Doous/files/write', { json : { path : 'ValeVision__DrawingNotes__.json', data : { a : 1 } } });
const read  = await call('POST', '/api/editor/projects/2026%2F3047__Doous/files/read', { json : { path : 'ValeVision__DrawingNotes__.json' } });
step('bundle: files write and read', write.status === 200 && read.status === 200 && read.json.data.a === 1, [write, read]);
const year = await call('POST', '/api/editor/projects/2026/delete', { json : {} });
step('bundle: "/2026/delete" is refused', year.status === 400, year);
const unknown = await call('GET', '/api/editor/unknown', { key : null });
step('bundle: unknown route answers a JSON 404 without the key', unknown.status === 404 && unknown.json, unknown);
step('bundle: the build manifest was never written', !bucket.has('VaApps/Index/Na__BuildVersion__Manifest__.json'));
console.log(`bundle smoke: ${steps.filter(Boolean).length}/${steps.length}`);
process.exitCode = steps.every(Boolean) && config ? 0 : 1;
