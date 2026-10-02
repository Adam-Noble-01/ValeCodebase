// =============================================================================
// VALEVISION3D - TEST - ASSET UPLOAD CONTRACT, ASSET GATES AND THUMBNAIL CALL SHAPE
// =============================================================================
//
// FILE       : Na__Test__AssetUploadContract__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Asset Upload Contract Test (W0-14 acceptance, scratch)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove W0-14's acceptance by stub: R2AssetUpload's non-throwing contract and its silent skip
//              off localhost, the localhost gates of the Layout Editor's Assets and the linework bake, the
//              asset folders read back on the web and on localhost, and the thumbnail renderer's TrueVision
//              call shape beside its unchanged three-argument form.
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - Runs the four modules exactly as the app ships them. Each is copied into a
//   temporary module tree at its own relative path, beside the REAL transport
//   modules it imports (ProjectLoader with ResilientLoad, R2SaveProjectJson,
//   DevGate, the scene data module and its scene-group leaf). Only modules
//   with no part in the contract are stubbed: the section overlay, the drawing
//   data's project code, the Layout Editor viewport setup and the projected
//   linework config, views, pipeline and owner tags.
// - A second tree swaps R2AssetUpload for a recorder, so the renderer's calls
//   are seen argument by argument; git HEAD's renderer runs in the same tree as
//   the reference for "the three-argument form is unchanged".
// - window.location, fetch, FileReader, document.createElement('canvas') and
//   IndexedDB are stubbed. The master index the stub serves is Whitecardopedia's
//   local copy (read only). The worker URL and key are test values; nothing is
//   sent anywhere and nothing is written outside the OS temp folder.
//
// USAGE:
//     node Na__Test__AssetUploadContract__.test.mjs                 (the live ValeVision files)
//     node Na__Test__AssetUploadContract__.test.mjs --from <dir>    (the four files under test from <dir>)
//     NA_TEST_VERBOSE=1 prints every check.
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// =============================================================================

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | Paths, Sources and the Two Module Trees
// -----------------------------------------------------------------------------

    const VCB        = 'D:\\10_CoreLib__ValeCodebase';
    const VV         = join(VCB, 'WebApps', 'ValeVision3D');
    const SRC        = join(VV, '02__Src__AppModules');
    const INDEX_FILE = join(VCB, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
    const WORKER_GUARD_FILE = join(VCB, 'WebApps', 'Whitecardopedia', 'CloudflareWorker', 'src', 'handlers', 'CloudflareHandler__ProjectAsset__.js');
    const FLASK_FILE = join(VCB, 'WebApps', 'Whitecardopedia', 'server.py');
    const NAWEB      = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
    const TV_PIN     = 'b2aa9151';

    const fromIndex = process.argv.indexOf('--from');
    const FROM      = fromIndex > 0 ? resolve(process.argv[fromIndex + 1]) : null;

    const UNDER_TEST = {
        R2ASSET : '03__AppUtils/Na__AppUtils__R2AssetUpload__.js',
        THUMB   : '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js',
        ASSETS  : '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js',
        PERSIST : '50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js'
    };
    const REAL = [
        '03__AppUtils/Na__AppUtils__ProjectLoader.js',
        '03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        '03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js',
        '03__AppUtils/Na__AppUtils__DevGate__.js',
        '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js',
        '21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js'
    ];

    const STUBS = {
        '05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js':
            'function Na__SectionClipping__GetOverlayRenderer() { return null; }\nexport { Na__SectionClipping__GetOverlayRenderer };\n',
        '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js':
            'function Na__DrawData__GetProjectCode() { return globalThis.__W014.projectCode; }\nexport { Na__DrawData__GetProjectCode };\n',
        '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js':
            "function Na__LeCfg__GetViewportSetup() { return { assetFolder : 'LayoutEditor/Snapshots/' }; }\nexport { Na__LeCfg__GetViewportSetup };\n",
        '50__System__ProjectedLinework/Na__ProjectedLinework__ConfigAccess__.js': [
            'function Na__PlCfg__IsEnabled() { return true; }',
            "function Na__PlCfg__GetPersistenceSetup() { return { enabled : true, bakeOnSave : true, cacheInBrowser : true, assetFolder : 'LayoutEditor/Linework/', maxSegmentsPerView : 100000 }; }",
            "function Na__PlCfg__GetModelSetup() { return { buildToken : 'w0-14-stub-build' }; }",
            'function Na__PlCfg__GetLabel(key, fallback) { return fallback; }',
            'export { Na__PlCfg__IsEnabled, Na__PlCfg__GetPersistenceSetup, Na__PlCfg__GetModelSetup, Na__PlCfg__GetLabel };', ''
        ].join('\n'),
        '50__System__ProjectedLinework/Na__ProjectedLinework__ViewDefinition__.js': [
            'function Na__PlView__FromAllDrawings() { globalThis.__W014.definitionsAsked++; return globalThis.__W014.definitions; }',
            "function Na__PlView__Fingerprint(definition, modelFingerprint) { return 'fp:' + definition.DrawingId + ':' + modelFingerprint; }",
            "function Na__PlView__CacheKey(definition, modelFingerprint) { return 'ck:' + definition.DrawingId + ':' + modelFingerprint; }",
            'export { Na__PlView__FromAllDrawings, Na__PlView__Fingerprint, Na__PlView__CacheKey };', ''
        ].join('\n'),
        '50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js': [
            "function Na__PlPipe__RenderDefinition(definition) { globalThis.__W014.lineworkRenders.push(definition.DrawingId); return Promise.resolve({ Classes : globalThis.__W014.makeClasses(), Report : { Backend : 'cpu' } }); }",
            'function Na__PlPipe__Remember() {}',
            'function Na__PlPipe__GetCached() { return null; }',
            "function Na__PlPipe__GetModelFingerprint() { return 'model-1'; }",
            'export { Na__PlPipe__RenderDefinition, Na__PlPipe__Remember, Na__PlPipe__GetCached, Na__PlPipe__GetModelFingerprint };', ''
        ].join('\n'),
        '50__System__ProjectedLinework/Na__ProjectedLinework__Owners__.js': [
            "const TAGS = Symbol.for('w0-14.owner-tags');",
            'function Na__PlOwners__Read(classes) { return (classes && classes[TAGS]) ? classes[TAGS] : null; }',
            'function Na__PlOwners__Attach(classes, restored, ownerKeys) { classes[TAGS] = { Owners : restored, OwnerKeys : ownerKeys }; return true; }',
            'function Na__PlOwners__Has(classes) { return !!(classes && classes[TAGS]); }',
            'export { Na__PlOwners__Read, Na__PlOwners__Attach, Na__PlOwners__Has };', ''
        ].join('\n')
    };

    const R2ASSET_RECORDER = [
        'function Na__AppUtils__R2AssetUpload(payload, projectCode, relativePath, showToast) {',
        '    const state = globalThis.__W014;',
        '    state.uploadCalls.push({ payload, projectCode, relativePath, showToast, argc : arguments.length });',
        '    if (state.uploadThrows) return Promise.reject(state.uploadThrows);',
        "    return Promise.resolve(typeof state.uploadResult === 'function' ? state.uploadResult(relativePath) : state.uploadResult);",
        '}',
        'function Na__AppUtils__R2AssetPathAllowed() { return true; }',
        'export { Na__AppUtils__R2AssetUpload, Na__AppUtils__R2AssetPathAllowed };', ''
    ].join('\n');

    function SourceOf(rel) {
        return FROM ? join(FROM, basename(rel)) : join(SRC, ...rel.split('/'));
    }

    const SCRATCH = mkdtempSync(join(tmpdir(), 'na-w0-14-'));
    writeFileSync(join(SCRATCH, 'package.json'), '{ "type": "module" }\n');

    function Put(tree, rel, data) {
        const target = join(tree, '02__Src__AppModules', ...rel.split('/'));
        mkdirSync(dirname(target), { recursive : true });
        if (typeof data === 'string') writeFileSync(target, data); else writeFileSync(target, data);
    }

    function BuildTree(name, recordUploads) {
        const tree = join(SCRATCH, name);
        for (const rel of REAL) Put(tree, rel, readFileSync(join(SRC, ...rel.split('/'))));
        for (const [rel, text] of Object.entries(STUBS)) Put(tree, rel, text);
        for (const rel of Object.values(UNDER_TEST)) Put(tree, rel, readFileSync(SourceOf(rel)));
        if (recordUploads) {
            Put(tree, UNDER_TEST.R2ASSET, R2ASSET_RECORDER);
            Put(tree, '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer__HEAD.js', execFileSync('git', [ '-C', VCB, 'show',
                'HEAD:WebApps/ValeVision3D/02__Src__AppModules/' + UNDER_TEST.THUMB ]));
        }
        return tree;
    }

    const REAL_TREE   = BuildTree('real', false);
    const RECORD_TREE = BuildTree('record', true);

    async function Load(tree, rel) {
        return import(pathToFileURL(join(tree, '02__Src__AppModules', ...rel.split('/'))).href);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stubs: the Page, the Network, the Browser APIs and the Console
// -----------------------------------------------------------------------------

    const LOCAL = 'http://localhost:8000/ValeVision3D/index.html';
    const LIVE  = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/index.html';
    const R2    = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const GH    = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects';
    const WORKER_BASE = 'https://worker.w0-14.test/api/editor';               // <-- A test value: never a real worker
    const WORKER_KEY  = 'w0-14-test-key';                                     // <-- A test value: never a real key

    const state = globalThis.__W014 = {
        projectCode     : null,
        uploadCalls     : [],
        uploadResult    : null,
        uploadThrows    : null,
        definitions     : [],
        definitionsAsked: 0,
        lineworkRenders : [],
        makeClasses     : null,
        thumbWidths     : [],
        renders         : 0
    };

    const storage = new Map();
    function SetPage(href) {
        const url = new URL(href);
        globalThis.window = {
            location      : { href : url.href, search : url.search, hostname : url.hostname, port : url.port, origin : url.origin, protocol : url.protocol, pathname : url.pathname },
            dispatchEvent : () => true,
            addEventListener : () => {},
            localStorage  : {
                getItem    : (key) => (storage.has(key) ? storage.get(key) : null),
                setItem    : (key, value) => { storage.set(key, String(value)); },
                removeItem : (key) => { storage.delete(key); }
            }
        };
    }

    // NETWORK | Every request is recorded; routes answer in order, else a JSON 404
    const net = { calls : [], configStatus : 200, workerReply : null, mirrorStatus : 200, serve : null };
    const INDEX = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    function Reply(status, json, blob) {
        return {
            ok     : status >= 200 && status < 300,
            status : status,
            json   : async () => { if (json === undefined) throw new SyntaxError('not JSON'); return JSON.parse(JSON.stringify(json)); },
            blob   : async () => blob || new Blob([ JSON.stringify(json === undefined ? {} : json) ], { type : 'application/json' })
        };
    }
    globalThis.fetch = async (url, init) => {
        const href   = String(url);
        const method = String((init && init.method) || 'GET').toUpperCase();
        const call   = { url : href, method : method, headers : (init && init.headers) || {}, body : init ? init.body : undefined };
        if (!href.includes('Na__MasterIndex__ProjectLocations__')) net.calls.push(call);
        if (href.includes('Na__MasterIndex__ProjectLocations__')) return Reply(200, INDEX);
        if (href.endsWith('/api/editor-config')) {
            return net.configStatus === 200 ? Reply(200, { workerApiBaseUrl : WORKER_BASE, apiKey : WORKER_KEY }) : Reply(net.configStatus, { error : 'stub: no config' });
        }
        if (href.startsWith(WORKER_BASE + '/projects/') && method === 'POST') {
            if (typeof net.workerReply === 'function') return net.workerReply(call);
            const body = JSON.parse(call.body);
            return Reply(200, { ok : true, path : body.path, publicUrl : R2 + '/2026/3047__Doous/' + body.path });
        }
        if (/\/api\/projects\/.+\/assets$/.test(href) && method === 'POST') {
            return net.mirrorStatus === 200 ? Reply(200, { success : true }) : Reply(net.mirrorStatus, { error : 'stub: mirror refused' });
        }
        if (method === 'GET' && typeof net.serve === 'function') {
            const served = net.serve(href);
            if (served) return served;
        }
        return Reply(404, { error : 'stub: not found' });
    };
    function CallsTo(prefix) { return net.calls.filter((c) => c.url.startsWith(prefix)); }
    function ResetNet() { net.calls.length = 0; net.workerReply = null; net.mirrorStatus = 200; net.serve = null; }

    // BROWSER APIS | FileReader, the 2D canvas the renderer downscales into, IndexedDB
    globalThis.FileReader = class {
        constructor() { this.result = null; this.error = null; this.onload = null; this.onerror = null; }
        readAsDataURL(blob) {
            blob.arrayBuffer().then((buffer) => {
                this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(buffer).toString('base64');
                if (this.onload) this.onload();
            }, (error) => { this.error = error; if (this.onerror) this.onerror(); });
        }
    };
    globalThis.document = {
        createElement(tag) {
            if (tag !== 'canvas') throw new Error('stub document: unexpected element ' + tag);
            const canvas = {
                width : 0, height : 0,
                getContext : () => ({ drawImage : () => {} }),
                toBlob     : (callback, type) => { state.thumbWidths.push(canvas.width); callback(new Blob([ new Uint8Array(canvas.width) ], { type : type })); }
            };
            return canvas;
        }
    };
    const idb = { names : [], stores : new Map() };
    function IdbRequest(run) {
        const request = { result : undefined, onsuccess : null, onerror : null, onupgradeneeded : null };
        setTimeout(() => { run(request); }, 0);
        return request;
    }
    globalThis.indexedDB = {
        open(name) {
            idb.names.push(name);
            return IdbRequest((request) => {
                if (!idb.stores.has(name)) idb.stores.set(name, new Map());
                const data = idb.stores.get(name);
                request.result = {
                    createObjectStore : () => ({}),
                    transaction       : () => ({ objectStore : () => ({
                        get : (key) => IdbRequest((r) => { r.result = data.get(key); if (r.onsuccess) r.onsuccess(); }),
                        put : (value, key) => IdbRequest((r) => { data.set(key, value); if (r.onsuccess) r.onsuccess(); })
                    }) })
                };
                if (request.onupgradeneeded) request.onupgradeneeded();
                if (request.onsuccess) request.onsuccess();
            });
        }
    };

    // CONSOLE | Recorded; printed only with NA_TEST_VERBOSE
    const consoleLines = [];
    const realLog = console.log.bind(console);
    for (const level of [ 'warn', 'error', 'info' ]) {
        console[level] = (...parts) => { consoleLines.push(level + ': ' + parts.map(String).join(' ')); };
    }
    console.log = (...parts) => {
        const text = parts.map(String).join(' ');
        if (text.startsWith('[ValeVision3D]') || text.startsWith('[R2Save]')) { consoleLines.push('log: ' + text); return; }
        realLog(...parts);
    };

    function Toasts() {
        const list = [];
        const fn = (message, isError) => { list.push({ message : String(message), isError : isError === true }); };
        fn.list = list;
        return fn;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        if (!passed || process.env.NA_TEST_VERBOSE) {
            realLog((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
        }
    }
    function section(title) { realLog(title); }
    const sameKeys = (object, keys) => JSON.stringify(Object.keys(object).sort()) === JSON.stringify(keys.slice().sort());
    async function NeverThrows(fn) {
        try { return { value : await fn(), threw : null }; }
        catch (error) { return { value : undefined, threw : error }; }
    }
    function Decode(base64) { return Buffer.from(base64, 'base64').toString('utf8'); }

    realLog('ValeVision3D - W0-14 asset upload contract, asset gates and thumbnail call shape');
    realLog('  files under test : ' + (FROM ? FROM : SRC));
    realLog('  master index     : ' + INDEX.projects.length + ' entries (Whitecardopedia local copy, read only)');

    SetPage(LOCAL + '?project=2026/3047__Doous');
    const realLoader   = await Load(REAL_TREE, '03__AppUtils/Na__AppUtils__ProjectLoader.js');
    const recordLoader = await Load(RECORD_TREE, '03__AppUtils/Na__AppUtils__ProjectLoader.js');
    await realLoader.Na__AppUtils__InitMasterIndex();
    await recordLoader.Na__AppUtils__InitMasterIndex();

    const Upload     = await Load(REAL_TREE, UNDER_TEST.R2ASSET);
    const Thumb      = await Load(REAL_TREE, UNDER_TEST.THUMB);
    const Assets     = await Load(REAL_TREE, UNDER_TEST.ASSETS);
    const Persist    = await Load(REAL_TREE, UNDER_TEST.PERSIST);
    const SceneData  = await Load(REAL_TREE, '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js');
    const RecThumb   = await Load(RECORD_TREE, UNDER_TEST.THUMB);
    const HeadThumb  = await Load(RECORD_TREE, '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer__HEAD.js');
    const RecScene   = await Load(RECORD_TREE, '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js');

    const fakeRenderer = { domElement : { width : 1600, height : 900 }, render : () => { state.renders++; } };
    for (const renderer of [ Thumb, RecThumb, HeadThumb ]) renderer.Na__PresentationMode__Thumbnail__SetRenderContext(fakeRenderer, {}, {}, () => null);

    const FAILURE_KEYS = [ 'r2Success', 'localSuccess', 'publicUrl', 'relUrl', 'error' ];

    // ---------------------------------------------------------------------
    section('1. R2AssetUpload on localhost: the non-throwing contract (acceptance 1)');
    // ---------------------------------------------------------------------
    {
        SetPage(LOCAL + '?project=2026/3047__Doous');
        const path = 'PresentationMode/Thumbnails/Scene_010.webp';

        // No worker config (Flask without its key) - first, while nothing is memoised
        ResetNet(); net.configStatus = 404;
        let toast = Toasts();
        let run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'webp' ], { type : 'image/webp' }), '2026/3047__Doous', path, toast));
        check('no worker config: resolves, never throws', run.threw === null, String(run.threw));
        check('no worker config: r2Success false, no URL, the reason given', run.value && run.value.r2Success === false && run.value.relUrl === null && run.value.publicUrl === null && /Worker config unavailable/.test(run.value.error), run.value);
        check('no worker config: one red toast, nothing sent to the worker', toast.list.length === 1 && toast.list[0].isError && CallsTo(WORKER_BASE).length === 0, toast.list);
        net.configStatus = 200;

        // Success
        ResetNet(); toast = Toasts();
        run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'webp-bytes' ], { type : 'image/webp' }), '2026/3047__Doous', path, toast));
        const ok = run.value || {};
        check('success: resolves with TrueVision\'s five fields', run.threw === null && sameKeys(ok, FAILURE_KEYS), ok);
        check('success: r2Success true, localSuccess true, relUrl = the path, error null', ok.r2Success === true && ok.localSuccess === true && ok.relUrl === path && ok.error === null, ok);
        check('success: publicUrl is the worker\'s VaApps/Projects URL', ok.publicUrl === R2 + '/2026/3047__Doous/' + path, ok.publicUrl);
        const workerCalls = CallsTo(WORKER_BASE);
        check('success: one POST to the worker\'s asset route for 2026/3047__Doous', workerCalls.length === 1 && workerCalls[0].url === WORKER_BASE + '/projects/2026%2F3047__Doous/assets', workerCalls.map((c) => c.url));
        const body = workerCalls.length ? JSON.parse(workerCalls[0].body) : {};
        check('success: the key header, the path, image/webp and base64 data', workerCalls.length && workerCalls[0].headers['X-Editor-Api-Key'] === WORKER_KEY && body.path === path && body.contentType === 'image/webp' && body.encoding === 'base64' && Decode(body.data) === 'webp-bytes', body);
        const mirror = CallsTo('http://localhost:8000/api/projects/');
        check('success: the Flask mirror is posted after the worker', mirror.length === 1 && mirror[0].url === 'http://localhost:8000/api/projects/2026/3047__Doous/assets' && mirror[0].body instanceof FormData && mirror[0].body.get('path') === path, mirror.map((c) => c.url));
        check('success: one green toast, "Asset saved to R2"', toast.list.length === 1 && toast.list[0].message === 'Asset saved to R2' && !toast.list[0].isError, toast.list);

        // JSON payload (a linework block)
        ResetNet(); toast = Toasts();
        run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload({ Meta : { SchemaVersion : 2 } }, '2026/3047__Doous', 'LayoutEditor/Linework/FloorPlan_001.json', toast));
        const jsonBody = CallsTo(WORKER_BASE).length ? JSON.parse(CallsTo(WORKER_BASE)[0].body) : {};
        check('a JSON payload goes up as application/json, its text base64', run.value && run.value.r2Success === true && jsonBody.contentType === 'application/json' && Decode(jsonBody.data) === '{"Meta":{"SchemaVersion":2}}', jsonBody);

        // The worker refuses
        ResetNet(); toast = Toasts();
        net.workerReply = () => Reply(400, { error : 'Asset path not allowed: stub' });
        run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ], { type : 'image/webp' }), '2026/3047__Doous', path, toast));
        check('worker refuses: resolves, never throws', run.threw === null, String(run.threw));
        check('worker refuses: { r2Success:false, localSuccess:false, publicUrl:null, relUrl:null, error }', run.value && sameKeys(run.value, FAILURE_KEYS) && run.value.r2Success === false && run.value.localSuccess === false && run.value.publicUrl === null && run.value.relUrl === null && /Asset upload failed: Asset path not allowed: stub/.test(run.value.error), run.value);
        check('worker refuses: no mirror, no green toast, one red toast', CallsTo('http://localhost:8000/api/projects/').length === 0 && toast.list.length === 1 && toast.list[0].isError, toast.list);

        // The network fails
        ResetNet(); toast = Toasts();
        net.workerReply = () => { throw new TypeError('Failed to fetch (stub offline)'); };
        run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ], { type : 'image/webp' }), '2026/3047__Doous', path, toast));
        check('network down: resolves with r2Success false, never throws', run.threw === null && run.value && run.value.r2Success === false && /Failed to fetch/.test(run.value.error), run.value || String(run.threw));

        // The mirror fails after R2 took the file
        ResetNet(); toast = Toasts();
        net.mirrorStatus = 500;
        run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ], { type : 'image/webp' }), '2026/3047__Doous', path, toast));
        check('mirror fails: still stored (r2Success true), localSuccess false, relUrl set', run.value && run.value.r2Success === true && run.value.localSuccess === false && run.value.relUrl === path, run.value);
        check('mirror fails: green then red toast', toast.list.length === 2 && !toast.list[0].isError && toast.list[1].isError, toast.list);

        // Refused paths and an unknown project: nothing is sent at all
        const refused = [ 'LayoutEditor/Other/x.webp', '../x.webp', 'PresentationMode/Thumbnails/a/b.webp', 'PresentationMode/Thumbnails/x.json',
                          'LayoutEditor\\Linework\\x.json', 'NaProjectPortal/26-Projects/x.webp', '', undefined, null, 42 ];
        for (const bad of refused) {
            ResetNet(); toast = Toasts();
            run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ]), '2026/3047__Doous', bad, toast));
            check('refused path ' + JSON.stringify(bad) + ': r2Success false, red toast, no request', run.threw === null && run.value && run.value.r2Success === false && /Asset path refused/.test(run.value.error) && toast.list.length === 1 && toast.list[0].isError && net.calls.length === 0, run.value || String(run.threw));
        }
        for (const code of [ null, '', undefined, 3047, {} ]) {
            ResetNet(); toast = Toasts();
            run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ]), code, path, toast));
            check('project code ' + JSON.stringify(code) + ': r2Success false, no request', run.threw === null && run.value && run.value.r2Success === false && net.calls.length === 0, run.value || String(run.threw));
        }
    }

    // ---------------------------------------------------------------------
    section('2. The path guard, one row per asset kind (vv_adaptations)');
    // ---------------------------------------------------------------------
    {
        const workerSource = readFileSync(WORKER_GUARD_FILE, 'utf8');
        const flaskSource  = readFileSync(FLASK_FILE, 'utf8');
        const workerMatch  = /Na__Asset__PATH_GUARD\s*=\s*\/(.+)\/;/.exec(workerSource);
        const flaskMatch   = /ASSET_PATH_GUARD\s*=\s*re\.compile\(r'(.+)'\)/.exec(flaskSource);
        check('the deployed worker guard and the Flask guard are readable', !!(workerMatch && flaskMatch));
        const workerGuard = workerMatch ? new RegExp(workerMatch[1]) : /$^/;
        const flaskGuard  = flaskMatch ? new RegExp(flaskMatch[1]) : /$^/;
        const allowed = Upload.Na__AppUtils__R2AssetPathAllowed;
        const expectTrue = [ 'PresentationMode/Thumbnails/Scene_010.webp', 'PresentationMode/Thumbnails/Scene_010.png',
                             'LayoutEditor/Linework/FloorPlan_001.json', 'LayoutEditor/Linework/x.webp', 'LayoutEditor/Linework/x.png',
                             'LayoutEditor/Snapshots/S1__V1__abc.webp', 'LayoutEditor/Snapshots/S1__V1__abc.png', 'LayoutEditor/Snapshots/x.json' ];
        const expectFalse = [ 'PresentationMode/Thumbnails/Scene_010.json', 'PresentationMode/Thumbnails/a/b.webp', 'LayoutEditor/Other/x.webp',
                              'LayoutEditor/Linework/x.txt', 'Linework/x.json', '/LayoutEditor/Linework/x.json', 'LayoutEditor/Linework/../x.json',
                              'LayoutEditor/Snapshots/x y.webp', '05__Layout__DrawingDocs__Images/D01/a__0123456789.webp', '06__Layout__PublishedDocuments/x.json',
                              '', null, undefined, 7 ];
        for (const path of expectTrue)  check('allowed: ' + path, allowed(path) === true);
        for (const path of expectFalse) check('refused: ' + JSON.stringify(path), allowed(path) === false);
        const corpus = expectTrue.concat(expectFalse.filter((p) => typeof p === 'string'));
        const lets = corpus.filter((p) => allowed(p));
        check('every path this guard lets through, the deployed worker and the Flask mirror accept too', lets.every((p) => workerGuard.test(p) && flaskGuard.test(p)), lets.filter((p) => !(workerGuard.test(p) && flaskGuard.test(p))));
        const tighter = corpus.filter((p) => !allowed(p) && workerGuard.test(p));
        check('the only path the worker would take and this refuses is a json thumbnail', JSON.stringify(tighter) === JSON.stringify([ 'PresentationMode/Thumbnails/Scene_010.json' ]), tighter);
    }

    // ---------------------------------------------------------------------
    section('3. Off localhost with authoring unlocked: nothing attempted, nothing said (acceptance 1)');
    // ---------------------------------------------------------------------
    {
        SetPage(LIVE + '?project=2026/3047__Doous&authoring=on');
        const DevGate = await Load(REAL_TREE, '03__AppUtils/Na__AppUtils__DevGate__.js');
        check('the page really is an unlocked authoring session (DevGate says yes)', DevGate.Na__DevGate__IsAuthoringEnabled() === true && realLoader.Na__AppUtils__IsRunningOnLocalhost() === false);

        ResetNet(); consoleLines.length = 0;
        state.projectCode = '2026/3047__Doous';
        const toast = Toasts();
        const run = await NeverThrows(() => Upload.Na__AppUtils__R2AssetUpload(new Blob([ 'x' ], { type : 'image/webp' }), '2026/3047__Doous', 'PresentationMode/Thumbnails/Scene_010.webp', toast));
        check('R2AssetUpload: a silent skipped result', run.threw === null && run.value && run.value.skipped === true && run.value.r2Success === false && run.value.localSuccess === false && run.value.publicUrl === null && run.value.relUrl === null && typeof run.value.error === 'string', run.value || String(run.threw));
        check('R2AssetUpload: no request, no toast, no console line', net.calls.length === 0 && toast.list.length === 0 && consoleLines.length === 0, { calls : net.calls.map((c) => c.url), toasts : toast.list, console : consoleLines });

        ResetNet(); consoleLines.length = 0;
        check('Assets: CanUpload is false', Assets.Na__LeAssets__CanUpload() === false);
        const assetToast = Toasts();
        const uploaded = await NeverThrows(() => Assets.Na__LeAssets__Upload(new Blob([ 'x' ], { type : 'image/webp' }), 'LayoutEditor/Snapshots/S1__V1__live.webp', assetToast));
        check('Assets: Upload answers null, sends nothing, says nothing', uploaded.threw === null && uploaded.value === null && net.calls.length === 0 && assetToast.list.length === 0 && consoleLines.length === 0, { value : uploaded.value, calls : net.calls.length, console : consoleLines });

        ResetNet(); consoleLines.length = 0;
        state.definitionsAsked = 0; state.lineworkRenders.length = 0;
        state.definitions = [ { DrawingId : 'FloorPlan_001', ViewKey : 'plan:FloorPlan_001', Kind : 'plan', DrawingName : 'Ground Floor', Styles : { projectedLinework : true }, Record : {} } ];
        const bakeToast = Toasts();
        const baked = await NeverThrows(() => Persist.Na__PlStore__BakeBeforeSave(bakeToast));
        check('linework: BakeBeforeSave answers null and bakes nothing', baked.threw === null && baked.value === null && state.definitionsAsked === 0 && state.lineworkRenders.length === 0, { value : baked.value, asked : state.definitionsAsked, renders : state.lineworkRenders });
        check('linework: no request, no toast, no console line', net.calls.length === 0 && bakeToast.list.length === 0 && consoleLines.length === 0, { calls : net.calls.length, toasts : bakeToast.list, console : consoleLines });

        ResetNet(); consoleLines.length = 0;
        SceneData.Na__PresentationMode__ProjectJson__SetActiveConfig({}, '2026/3047__Doous');
        const thumb = await NeverThrows(() => Thumb.Na__PresentationMode__Thumbnail__CaptureAndUpload('Scene_010'));
        check('thumbnail: CaptureAndUpload(id) answers ok false and sends nothing', thumb.threw === null && thumb.value && thumb.value.ok === false && net.calls.length === 0, thumb.value || String(thumb.threw));
    }

    // ---------------------------------------------------------------------
    section('4. Layout Editor Assets on localhost: the gate, the upload and the record rule (acceptance 1)');
    // ---------------------------------------------------------------------
    {
        SetPage(LOCAL + '?project=2026/3047__Doous');
        state.projectCode = '2026/3047__Doous';
        check('CanUpload is true on localhost with a project', Assets.Na__LeAssets__CanUpload() === true);
        state.projectCode = null;
        check('CanUpload is false with no project code', Assets.Na__LeAssets__CanUpload() === false);
        state.projectCode = '2026/3047__Doous';

        ResetNet();
        const path = Assets.Na__LeAssets__SnapshotPath('Sheet 1', 'VP/1', 'fp:abc');
        check('SnapshotPath is a Snapshots path the guard takes', path === 'LayoutEditor/Snapshots/Sheet_1__VP_1__fp_abc.webp' && Upload.Na__AppUtils__R2AssetPathAllowed(path), path);
        let result = await Assets.Na__LeAssets__Upload(new Blob([ 'snap' ], { type : 'image/webp' }), path, null);
        check('a stored snapshot reports r2Success true', result && result.r2Success === true && result.relUrl === path, result);
        check('it went to the worker under 2026/3047__Doous', CallsTo(WORKER_BASE).length === 1 && JSON.parse(CallsTo(WORKER_BASE)[0].body).path === path);

        ResetNet();
        net.workerReply = () => Reply(500, { error : 'R2 asset write failed: stub' });
        result = await NeverThrows(() => Assets.Na__LeAssets__Upload(new Blob([ 'snap' ], { type : 'image/webp' }), 'LayoutEditor/Snapshots/S1__V1__refused.webp', null));
        const recorded = !!(result.value && result.value.r2Success === true);   // <-- The Viewport3d rule: "uploaded && uploaded.r2Success === true"
        check('a refused snapshot upload resolves (no throw) with r2Success false', result.threw === null && result.value && result.value.r2Success === false, result.value || String(result.threw));
        check('so the viewport never records a stored snapshot for it', recorded === false);
    }

    // ---------------------------------------------------------------------
    section('5. Snapshots and linework read back from VaApps/Projects/{folderId} (acceptance 2)');
    // ---------------------------------------------------------------------
    {
        const folderUrls = (rel) => ({
            r2    : R2 + '/2026/3047__Doous/' + rel,
            gh    : GH + '/2026/3047__Doous/' + rel,
            flask : 'http://localhost:8000/Whitecardopedia/Projects/2026/3047__Doous/' + rel
        });

        // Web: R2 first
        SetPage(LIVE + '?project=2026/3047__Doous');
        ResetNet();
        let rel  = 'LayoutEditor/Snapshots/S1__V1__web.webp';
        let urls = folderUrls(rel);
        net.serve = (href) => (href === urls.r2 ? Reply(200, undefined, new Blob([ 'web-snapshot' ], { type : 'image/webp' })) : null);
        let dataUrl = await Assets.Na__LeAssets__Load(rel);
        check('web: a snapshot is read from the R2 project folder', dataUrl === 'data:image/webp;base64,' + Buffer.from('web-snapshot').toString('base64') && net.calls.length === 1 && net.calls[0].url === urls.r2, net.calls.map((c) => c.url));

        ResetNet();
        rel  = 'LayoutEditor/Snapshots/S1__V1__gh.webp';
        urls = folderUrls(rel);
        net.serve = (href) => (href === urls.gh ? Reply(200, undefined, new Blob([ 'gh' ], { type : 'image/webp' })) : null);
        dataUrl = await Assets.Na__LeAssets__Load(rel);
        check('web: R2 missing, the GH Pages copy is the fallback', !!dataUrl && net.calls.map((c) => c.url).join(' ') === urls.r2 + ' ' + urls.gh, net.calls.map((c) => c.url));

        // Bare code: the same folder through the master index
        SetPage(LIVE + '?project=3047');
        ResetNet();
        rel  = 'LayoutEditor/Snapshots/S1__V1__code.webp';
        urls = folderUrls(rel);
        net.serve = (href) => (href === urls.r2 ? Reply(200, undefined, new Blob([ 'c' ], { type : 'image/webp' })) : null);
        dataUrl = await Assets.Na__LeAssets__Load(rel);
        check('?project=3047 reads the same 2026/3047__Doous folder', !!dataUrl && net.calls.length === 1 && net.calls[0].url === urls.r2, net.calls.map((c) => c.url));

        // Localhost: R2 first, then the Flask copy
        SetPage(LOCAL + '?project=2026/3047__Doous');
        ResetNet();
        rel  = 'LayoutEditor/Snapshots/S1__V1__local.webp';
        urls = folderUrls(rel);
        net.serve = (href) => (href === urls.flask ? Reply(200, undefined, new Blob([ 'local' ], { type : 'image/webp' })) : null);
        dataUrl = await Assets.Na__LeAssets__Load(rel);
        check('localhost: R2 missing, the Flask copy of the project folder answers', !!dataUrl && net.calls.map((c) => c.url).join(' ') === urls.r2 + ' ' + urls.flask, net.calls.map((c) => c.url));

        // Linework: bake on localhost, then read the uploaded block back from each place
        state.projectCode = '2026/3047__Doous';
        state.makeClasses = () => {
            const classes = { visible : new Float32Array([ 0, 0, 1000, 0, 1000, 0, 1000, 500 ]), hidden : new Float32Array(0), authored : new Float32Array(0), section : new Float32Array(0) };
            classes[Symbol.for('w0-14.owner-tags')] = { Owners : { visible : new Uint16Array([ 1, 1 ]), hidden : new Uint16Array(0), authored : new Uint16Array(0), section : new Uint16Array(0) }, OwnerKeys : [ 'unknown', 'Walls' ] };
            return classes;
        };
        const definition = { DrawingId : 'FloorPlan_001', ViewKey : 'plan:FloorPlan_001', Kind : 'plan', DrawingName : 'Ground Floor', Styles : { projectedLinework : true }, Record : {} };
        state.definitions = [ definition ];
        state.definitionsAsked = 0; state.lineworkRenders.length = 0;
        ResetNet();
        const bakeToast = Toasts();
        const counts = await Persist.Na__PlStore__BakeBeforeSave(bakeToast);
        const lineworkCalls = CallsTo(WORKER_BASE);
        const lineworkBody  = lineworkCalls.length ? JSON.parse(lineworkCalls[0].body) : {};
        const block         = lineworkBody.data ? JSON.parse(Decode(lineworkBody.data)) : null;
        check('localhost: BakeBeforeSave bakes the drawing (baked 1)', counts && counts.baked === 1 && counts.failed === 0 && state.lineworkRenders.length === 1, counts);
        check('the block goes up as LayoutEditor/Linework/FloorPlan_001.json under 2026/3047__Doous', lineworkCalls.length === 1 && lineworkCalls[0].url === WORKER_BASE + '/projects/2026%2F3047__Doous/assets' && lineworkBody.path === 'LayoutEditor/Linework/FloorPlan_001.json' && lineworkBody.contentType === 'application/json', lineworkBody.path);
        check('its Meta.Description says "one ValeVision drawing"', block && /^Projected linework for one ValeVision drawing, /.test(block.Meta.Description), block && block.Meta.Description);
        check('the browser copy is IndexedDB ValeVision3D__ProjectedLinework', idb.names.length > 0 && idb.names.every((n) => n === 'ValeVision3D__ProjectedLinework'), idb.names);
        const slot = definition.Record.FloorPlan__LineworkAsset;
        check('the record names the stored block', slot && slot.Asset__Path === 'LayoutEditor/Linework/FloorPlan_001.json' && slot.Asset__Fingerprint === 'fp:FloorPlan_001:model-1', slot);

        const fingerprint = 'fp:FloorPlan_001:model-1';
        for (const [ label, page, place ] of [ [ 'web', LIVE, 'r2' ], [ 'web, R2 missing', LIVE, 'gh' ], [ 'localhost, R2 missing', LOCAL, 'flask' ] ]) {
            SetPage(page + '?project=2026/3047__Doous');
            idb.stores.clear();                                                   // <-- Nothing in the browser: the asset must be fetched
            ResetNet();
            const blockUrls = folderUrls('LayoutEditor/Linework/FloorPlan_001.json');
            net.serve = (href) => (href === blockUrls[place] ? Reply(200, block) : null);
            const classes = await Persist.Na__PlStore__LoadForDefinition(definition, fingerprint, 'ck:fresh:' + label);
            const expected = place === 'r2' ? [ blockUrls.r2 ] : [ blockUrls.r2, blockUrls[place] ];
            check(label + ': the linework block reads back from ' + expected[expected.length - 1], !!classes && classes.visible && classes.visible.length === 8 && JSON.stringify(net.calls.map((c) => c.url)) === JSON.stringify(expected), net.calls.map((c) => c.url));
        }

        // A refused linework upload never names a block on the record
        SetPage(LOCAL + '?project=2026/3047__Doous');
        const refusedDefinition = { DrawingId : 'Elevation_002', ViewKey : 'elev:Elevation_002', Kind : 'elevation', DrawingName : 'Front', Styles : { projectedLinework : true }, Record : {} };
        state.definitions = [ refusedDefinition ];
        ResetNet();
        net.workerReply = () => Reply(500, { error : 'R2 asset write failed: stub' });
        const refusedToast = Toasts();
        const refusedCounts = await NeverThrows(() => Persist.Na__PlStore__BakeBeforeSave(refusedToast));
        check('a refused linework upload counts as failed, never thrown', refusedCounts.threw === null && refusedCounts.value && refusedCounts.value.failed === 1 && refusedCounts.value.baked === 0, refusedCounts.value || String(refusedCounts.threw));
        check('and the record names no stored block', refusedDefinition.Record.Elevation__LineworkAsset === undefined, refusedDefinition.Record);
    }

    // ---------------------------------------------------------------------
    section('6. Thumbnail renderer: TrueVision\'s call shape (acceptance 3)');
    // ---------------------------------------------------------------------
    {
        SetPage(LOCAL + '?project=3047');
        const capture = RecThumb.Na__PresentationMode__Thumbnail__CaptureAndUpload;
        const success = (relativePath) => ({ r2Success : true, localSuccess : true, publicUrl : R2 + '/2026/3047__Doous/' + relativePath, relUrl : relativePath, error : null });
        RecScene.Na__PresentationMode__ProjectJson__SetActiveConfig({}, '2026/3047__Doous');

        state.uploadCalls.length = 0; state.thumbWidths.length = 0; state.uploadThrows = null; state.uploadResult = success;
        let result = await capture('Scene_010');
        let call = state.uploadCalls[0] || {};
        check('CaptureAndUpload(id): one R2AssetUpload call', state.uploadCalls.length === 1);
        check('... with PresentationMode/Thumbnails/<id>.webp', call.relativePath === 'PresentationMode/Thumbnails/Scene_010.webp', call.relativePath);
        check('... for the active scene set\'s project code', call.projectCode === '2026/3047__Doous', call.projectCode);
        check('... a webp Blob at the default 480 px, no toast', call.payload instanceof Blob && call.payload.type === 'image/webp' && state.thumbWidths[0] === 480 && call.showToast === undefined, { widths : state.thumbWidths });
        check('... and answers ok with the relUrl a caller writes on its scene', result && result.ok === true && result.relUrl === 'PresentationMode/Thumbnails/Scene_010.webp' && result.publicUrl === R2 + '/2026/3047__Doous/PresentationMode/Thumbnails/Scene_010.webp', result);

        state.uploadCalls.length = 0; state.thumbWidths.length = 0;
        result = await capture('Scene_010', 512);
        call = state.uploadCalls[0] || {};
        check('CaptureAndUpload(id, 512): the same path and project code', state.uploadCalls.length === 1 && call.relativePath === 'PresentationMode/Thumbnails/Scene_010.webp' && call.projectCode === '2026/3047__Doous', call);
        check('... 512 is the thumbnail\'s width', state.thumbWidths[0] === 512 && result.ok === true, state.thumbWidths);

        for (const odd of [ 0, -5, NaN, Infinity ]) {
            state.uploadCalls.length = 0; state.thumbWidths.length = 0;
            result = await capture('Scene_010', odd);
            check('CaptureAndUpload(id, ' + odd + '): default width, code still resolved', result.ok === true && state.thumbWidths[0] === 480 && state.uploadCalls[0].projectCode === '2026/3047__Doous', state.thumbWidths);
        }

        RecScene.Na__PresentationMode__ProjectJson__SetActiveConfig({}, null);
        state.uploadCalls.length = 0;
        result = await capture('Scene_011');
        check('no active scene set: the URL\'s project code (?project=3047)', result.ok === true && state.uploadCalls[0].projectCode === '3047', state.uploadCalls[0] && state.uploadCalls[0].projectCode);

        SetPage(LOCAL + '?nothing=1');
        state.uploadCalls.length = 0; const rendersBefore = state.renders;
        result = await capture('Scene_012');
        check('no project code anywhere: ok false, nothing rendered or uploaded', result.ok === false && result.error === 'missing scene id or project code' && state.uploadCalls.length === 0 && state.renders === rendersBefore, result);
        SetPage(LOCAL + '?project=3047');
        RecScene.Na__PresentationMode__ProjectJson__SetActiveConfig({}, '2026/3047__Doous');

        // The batch op's own call and success test (Presentation Scenes > Update All Thumbnails)
        state.uploadCalls.length = 0;
        const scenes = [ { PresentationMode__Scene__Id : 'Scene_001' }, { PresentationMode__Scene__Id : 'Scene_002' }, { PresentationMode__Scene__Id : 'Scene_003' } ];
        let updated = 0;
        for (const scene of scenes) {
            const r = await capture(scene.PresentationMode__Scene__Id);          // <-- BatchOps__.js:353, verbatim shape
            if (r && r.ok) { scene.PresentationMode__Scene__ThumbnailUrl = r.relUrl; updated++; }
        }
        check('the batch walk writes every scene\'s thumbnail (3 of 3)', updated === 3 && scenes.every((s) => s.PresentationMode__Scene__ThumbnailUrl === 'PresentationMode/Thumbnails/' + s.PresentationMode__Scene__Id + '.webp'), scenes);

        // ok means R2 took it
        state.uploadResult = () => ({ r2Success : false, localSuccess : false, publicUrl : null, relUrl : null, error : 'Asset upload failed: stub' });
        result = await capture('Scene_013');
        check('an upload with r2Success false answers ok false with its error', result.ok === false && result.error === 'Asset upload failed: stub', result);
        state.uploadResult = () => ({ r2Success : false, localSuccess : false, publicUrl : null, relUrl : null, error : 'Asset not uploaded: assets are stored from localhost only.', skipped : true });
        result = await capture('Scene_014');
        check('a skipped upload answers ok false', result.ok === false && !('relUrl' in result), result);
        state.uploadResult = success;
        result = await capture('');
        check('no scene id: ok false', result.ok === false);
    }

    // ---------------------------------------------------------------------
    section('7. Thumbnail renderer: the three-argument form is unchanged (acceptance 3, git HEAD as reference)');
    // ---------------------------------------------------------------------
    {
        SetPage(LOCAL + '?project=3047');
        RecScene.Na__PresentationMode__ProjectJson__SetActiveConfig({}, 'ACTIVE-CODE-NOT-USED');
        const toast = Toasts();
        const runBoth = async (args) => {
            const outcome = {};
            for (const [ label, module ] of [ [ 'head', HeadThumb ], [ 'new', RecThumb ] ]) {
                state.uploadCalls.length = 0; state.thumbWidths.length = 0;
                const value = await module.Na__PresentationMode__Thumbnail__CaptureAndUpload(...args);
                const calls = state.uploadCalls.map((c) => ({ projectCode : c.projectCode, relativePath : c.relativePath, sameToast : c.showToast === args[2], argc : c.argc, type : c.payload && c.payload.type, size : c.payload && c.payload.size }));
                outcome[label] = { value : value, calls : calls, widths : state.thumbWidths.slice() };
            }
            return outcome;
        };

        state.uploadThrows = null;
        state.uploadResult = (relativePath) => ({ r2Success : true, localSuccess : true, publicUrl : 'https://cdn.example/' + relativePath, relUrl : relativePath, error : null });
        let both = await runBoth([ 'Scene_020', '3047', toast ]);
        check('(id, code, toast) success: the same R2AssetUpload call as HEAD (code, path, toast, 480 px)', JSON.stringify(both.head.calls) === JSON.stringify(both.new.calls) && both.new.calls.length === 1 && both.new.calls[0].projectCode === '3047' && both.new.calls[0].sameToast === true && JSON.stringify(both.head.widths) === JSON.stringify(both.new.widths) && both.new.widths[0] === 480, both);
        check('(id, code, toast) success: the same result as HEAD', JSON.stringify(both.head.value) === JSON.stringify(both.new.value), both);

        state.uploadThrows = new Error('boom');
        both = await runBoth([ 'Scene_021', '3047', toast ]);
        check('(id, code, toast) when the upload throws: the same { ok:false, error } as HEAD', JSON.stringify(both.head.value) === JSON.stringify(both.new.value) && both.new.value.ok === false && both.new.value.error === 'boom', both);
        state.uploadThrows = null;

        both = await runBoth([ 'Scene_022', '', toast ]);
        check('(id, \'\', toast): the same refusal as HEAD, nothing uploaded', JSON.stringify(both.head.value) === JSON.stringify(both.new.value) && both.new.calls.length === 0 && both.head.calls.length === 0, both);

        both = await runBoth([ '', '3047', toast ]);
        check('(\'\', code, toast): the same refusal as HEAD', JSON.stringify(both.head.value) === JSON.stringify(both.new.value), both);

        state.uploadResult = () => ({ r2Success : false, localSuccess : false, publicUrl : null, relUrl : null, error : 'Asset upload failed: stub' });
        both = await runBoth([ 'Scene_023', '3047', toast ]);
        check('the one intended change: a non-throwing failure is ok false (HEAD would have said ok true)', both.head.value.ok === true && both.new.value.ok === false, both);

        both = await runBoth([ 'Scene_024', undefined, undefined ]);
        check('HEAD refused TrueVision\'s one-argument shape (the Update All Thumbnails fault)', both.head.value.ok === false && both.head.value.error === 'missing scene id or project code' && both.head.calls.length === 0, both.head);
    }

    // ---------------------------------------------------------------------
    section('8. Through the real R2AssetUpload: the renderer\'s TrueVision shape on localhost');
    // ---------------------------------------------------------------------
    {
        SetPage(LOCAL + '?project=2026/3047__Doous');
        SceneData.Na__PresentationMode__ProjectJson__SetActiveConfig({}, '2026/3047__Doous');
        ResetNet();
        const result = await Thumb.Na__PresentationMode__Thumbnail__CaptureAndUpload('Scene_030', 256);
        const calls  = CallsTo(WORKER_BASE);
        const body   = calls.length ? JSON.parse(calls[0].body) : {};
        check('CaptureAndUpload(id, 256) posts PresentationMode/Thumbnails/Scene_030.webp for 2026/3047__Doous', calls.length === 1 && calls[0].url === WORKER_BASE + '/projects/2026%2F3047__Doous/assets' && body.path === 'PresentationMode/Thumbnails/Scene_030.webp' && body.contentType === 'image/webp', body.path);
        check('... and answers ok with its relUrl', result && result.ok === true && result.relUrl === 'PresentationMode/Thumbnails/Scene_030.webp', result);

        ResetNet();
        net.workerReply = () => Reply(400, { error : 'stub refusal' });
        const refused = await Thumb.Na__PresentationMode__Thumbnail__CaptureAndUpload('Scene_031', '2026/3047__Doous', () => {});
        check('a refused thumbnail upload: ok false, so no scene record takes its path', refused && refused.ok === false && /stub refusal/.test(refused.error), refused);
    }

    // ---------------------------------------------------------------------
    section('9. Headers and PORT NOTEs (acceptance 4)');
    // ---------------------------------------------------------------------
    {
        const text = {};
        for (const [ key, rel ] of Object.entries(UNDER_TEST)) text[key] = readFileSync(SourceOf(rel), 'utf8').replace(/\r\n/g, '\n');
        const portNote = (source) => { const m = /\/\/ PORT NOTE:\n([\s\S]*?)\n\/\/\n\/\/ -{10,}/.exec(source); return m ? m[1] : ''; };
        const tvR2 = execFileSync('git', [ '-C', NAWEB, 'show', TV_PIN + ':na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/' + UNDER_TEST.R2ASSET ]).toString('utf8');
        const moduleLine = (source) => (/^\/\/ MODULE\s+:.*$/m.exec(source) || [ '' ])[0];
        check('R2AssetUpload\'s MODULE line equals TrueVision\'s [F.8 C18]', moduleLine(text.R2ASSET) === moduleLine(tvR2) && moduleLine(tvR2) === '// MODULE     : App Utils - R2 Asset Upload', moduleLine(text.R2ASSET));
        for (const [ key, source ] of Object.entries(text)) {
            check(key + ': banner reads VALEVISION3D', /^\/\/ =+\n\/\/ VALEVISION3D - /.test(source));
            check(key + ': PORT NOTE carries {{VVREL:W0-14}}', portNote(source).includes('{{VVREL:W0-14}}'));
            const outsideNote = source.replace(portNote(source), '');
            check(key + ': no [TrueVision3D prefix, TRUEVISION3D banner or DevGate import', !/\[TrueVision3D/.test(outsideNote) && !/TRUEVISION3D/.test(outsideNote) && !/import\s*\{[^}]*Na__DevGate__/.test(source));
        }
        const persistNote = portNote(text.PERSIST);
        check('Persistence PORT NOTE records the gate, the DB name and the Description', /IsRunningOnLocalhost/.test(persistNote) && /ValeVision3D__ProjectedLinework/.test(persistNote) && /one ValeVision drawing/.test(persistNote) && /Source version: 1\.2\.1/.test(persistNote));
        check('Assets PORT NOTE records the gate', /CanUpload asks Na__AppUtils__IsRunningOnLocalhost/.test(portNote(text.ASSETS)) && /Source version: 1\.0\.1/.test(portNote(text.ASSETS)));
        check('R2AssetUpload PORT NOTE records the silent skip off localhost', /silent skip/.test(portNote(text.R2ASSET)));
        check('Persistence keeps the ValeVision IndexedDB name and Description in code', text.PERSIST.includes("const Na__PlStore__DB_NAME  = 'ValeVision3D__ProjectedLinework';") && text.PERSIST.includes("'Projected linework for one ValeVision drawing, "));
        check('Persistence and Assets gate on Na__AppUtils__IsRunningOnLocalhost', text.PERSIST.includes('if (!Na__AppUtils__IsRunningOnLocalhost()) return null;') && text.ASSETS.includes('return Na__AppUtils__IsRunningOnLocalhost() && !!Na__DrawData__GetProjectCode();'));
    }

    realLog('');
    realLog((failures === 0 ? 'PASS' : 'FAIL') + ' - ' + passes + ' passed, ' + failures + ' failed.');
    if (process.env.NA_TEST_VERBOSE && consoleLines.length) realLog('console lines recorded: ' + consoleLines.length);
    rmSync(SCRATCH, { recursive : true, force : true });
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
