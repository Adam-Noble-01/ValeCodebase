// =============================================================================
// VALEVISION3D - TEST - SHARED PWA SERVICE WORKER LOGIC (W0-08)
// =============================================================================
//
// FILE       : Na__Test__PwaServiceWorkerLogic__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Shared PWA Service Worker Logic Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the prepared Whitecardopedia worker logic 1.0.17: the token split, the
//              revalidating stale-while-revalidate refresh, the precached Layout Editor sheets,
//              the images and published buckets, and every older rule unchanged
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - Runs Whitecardopedia__Pwa__ServiceWorker__Logic__.js, as it is, inside a
//   simulated ServiceWorkerGlobalScope (node:vm): a Cache Storage that keeps
//   insertion order like the real one, a fetch that records every call and its
//   init, a server whose files can change between loads, and an offline switch.
//   Every check drives the worker's own install, activate, fetch and message
//   handlers, so nothing private is reached into.
// - By default it tests the STAGED copy next to this folder
//   (../WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/).
//   Once Adam has applied prepared/W0-08.patch, point it at the live file with
//   --sw-dir. The precache list is checked against the real WebApps tree
//   (found by walking up from here, or --webapps-root).
//
// USAGE:
//     node Na__Test__PwaServiceWorkerLogic__.test.mjs
//     node Na__Test__PwaServiceWorkerLogic__.test.mjs --sw-dir "D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability"
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Written with the prepared worker logic 1.0.17 (TrueVision parity package W0-08).
//
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';


// -----------------------------------------------------------------------------
// REGION | Inputs
// -----------------------------------------------------------------------------

    const SCRIPT_DIR   = dirname(fileURLToPath(import.meta.url));
    const ArgValue     = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

    function FindWebAppsRoot(start) {
        let dir = start;
        for (let i = 0; i < 12; i += 1) {
            if (existsSync(join(dir, 'ValeVision3D', 'index.html')) && existsSync(join(dir, 'Whitecardopedia', '02__Src__AppModules'))) return dir;
            const up = dirname(dir);
            if (up === dir) break;
            dir = up;
        }
        return null;
    }

    const SW_DIR       = resolve(ArgValue('--sw-dir') || join(SCRIPT_DIR, '..', 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '62__Feature__AppInstallability'));
    const WEBAPPS_ROOT = ArgValue('--webapps-root') ? resolve(ArgValue('--webapps-root')) : FindWebAppsRoot(SCRIPT_DIR);
    const LOGIC_PATH   = join(SW_DIR, 'Whitecardopedia__Pwa__ServiceWorker__Logic__.js');
    const LOGIC_SRC    = readFileSync(LOGIC_PATH, 'utf8');

    const TOKEN        = '2026-09-18-1';       // <-- The live token: W0-08 must not bump it
    const CDN          = 'https://cdn.noble-architecture.com';
    const GH_SCOPE     = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/';
    const LOCAL_SCOPE  = 'http://localhost:8000/';
    const DOOUS_CDN    = `${CDN}/VaApps/Projects/2026/3047__Doous`;

    const LE = 'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/';
    const LE_LAZY_SHEETS = [
        LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
        LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
        LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
        LE + '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
        LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css',
        LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css',
        LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css',
        LE + '80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css',
        LE + '56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css',
        LE + '57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css'
    ];
    const DISTANCE_CULLING_NEW = 'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js';
    const DISTANCE_CULLING_OLD = 'ValeVision3D/02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    const BodyOf  = (x) => (x && x.res ? x.res['body'] : undefined);    // <-- null-safe: a passed-through request has no response
    const RESULTS = [];
    function Check(name, ok, detail) {
        RESULTS.push({ name, ok: !!ok, detail });
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? `\n      ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Simulated Service Worker World
// -----------------------------------------------------------------------------

    class MockResponse {
        constructor(body, init = {}) {
            this.body   = body;
            this.status = init.status === undefined ? 200 : init.status;
            this.ok     = this.status >= 200 && this.status < 300;
            this.url    = init.url || '';
            this.type   = init.type || 'basic';
        }
        clone() { return new MockResponse(this.body, { status: this.status, url: this.url, type: this.type }); }
        static error() { return new MockResponse(null, { status: 0, type: 'error' }); }
    }

    // Like the platform, a relative URL (the precache list is built from the scope's PATH)
    // resolves against the worker script's own URL, for fetch and for Cache Storage keys.
    const KeyOf = (req, base) => new URL(typeof req === 'string' ? req : req.url, base).href;

    class MockCache {
        constructor(base) { this.base = base; this.map = new Map(); }          // <-- Insertion order = oldest first, as Cache Storage keeps it
        async match(req) { const r = this.map.get(KeyOf(req, this.base)); return r ? r.clone() : undefined; }
        async put(req, res) { const k = KeyOf(req, this.base); this.map.delete(k); this.map.set(k, res.clone()); }
        async delete(req) { return this.map.delete(KeyOf(req, this.base)); }
        async keys() { return [...this.map.keys()].map(url => ({ url })); }
        has(url) { return this.map.has(url); }
        body(url) { const r = this.map.get(url); return r ? r.body : undefined; }
        get size() { return this.map.size; }
    }

    function MakeWorld({ scope, source = LOGIC_SRC }) {
        const scopeUrl  = new URL(scope);
        const workerUrl = `${scope}Na__Pwa__ServiceWorker__.js`;
        const handlers  = {};
        const fetchLog  = [];
        const server    = new Map();
        const storage   = new Map();
        const pending   = [];
        const logs      = [];
        let offline     = false;

        const caches = {
            async open(name) { if (!storage.has(name)) storage.set(name, new MockCache(workerUrl)); return storage.get(name); },
            async keys() { return [...storage.keys()]; },
            async delete(name) { return storage.delete(name); },
            async has(name) { return storage.has(name); }
        };

        async function FetchImpl(input, init) {
            const url = KeyOf(input, workerUrl);
            fetchLog.push({ url, init: init === undefined ? undefined : { ...init } });
            if (offline) throw new TypeError('Failed to fetch');
            const entry = server.get(url);
            if (!entry) return new MockResponse('not found', { status: 404, url });
            return new MockResponse(entry, { status: 200, url });
        }

        const sandbox = {
            console     : { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
            URL,
            Response    : MockResponse,
            caches,
            fetch       : (input, init) => { const p = FetchImpl(input, init); pending.push(p.catch(() => null)); return p; },
            setTimeout  : (fn, ms) => { const t = setTimeout(fn, ms); if (t && t.unref) t.unref(); return t; },
            clearTimeout,
            location    : { href: workerUrl, origin: scopeUrl.origin, hostname: scopeUrl.hostname },
            registration: { scope },
            addEventListener(type, fn) { handlers[type] = fn; },
            skipWaiting : async () => { sandbox.__skipped = true; },
            clients     : { claim: async () => { sandbox.__claimed = true; } }
        };
        sandbox.self = sandbox;
        vm.createContext(sandbox);
        vm.runInContext(source, sandbox, { filename: 'Whitecardopedia__Pwa__ServiceWorker__Logic__.js' });

        return {
            scope, sandbox, handlers, fetchLog, server, storage, logs,
            setOffline(v) { offline = !!v; },
            cache(name) { return storage.get(name) || new MockCache(workerUrl); },    // <-- A bucket never opened reads as empty (no crash on an older worker)
            async flush() {
                for (let i = 0; i < 6; i += 1) {
                    await Promise.all(pending.splice(0));
                    await new Promise(r => setImmediate(r));
                }
            },
            fetchesFor(url) { return fetchLog.filter(f => f.url === url); },
            firstInit(url) { const f = fetchLog.find(x => x.url === url); return f ? (f.init === undefined ? 'PLAIN' : f.init) : 'NO-FETCH'; },
            async install() {
                let p = null;
                handlers.install({ waitUntil(x) { p = x; } });
                await p;
                await this.flush();
            },
            async activate() {
                let p = null;
                handlers.activate({ waitUntil(x) { p = x; } });
                await p;
            },
            async get(url) {
                let responded = null;
                handlers.fetch({ request: { url, method: 'GET' }, respondWith(p) { responded = p; } });
                if (responded === null) return { passthrough: true, res: null };
                const res = await responded;
                return { passthrough: false, res };
            },
            async message(data) {
                const replies = [];
                let p = null;
                handlers.message({ data, source: { postMessage: (m) => replies.push(m) }, waitUntil(x) { p = x; } });
                if (p) await p;
                return replies;
            }
        };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 1. Source: the token is not bumped, the asset token equals it
// -----------------------------------------------------------------------------

    {
        const shellToken = (LOGIC_SRC.match(/const PWA_SW_VERSION_TOKEN\s*=\s*'([^']+)'/) || [])[1];
        const assetToken = (LOGIC_SRC.match(/const PWA_SW_ASSET_VERSION_TOKEN\s*=\s*'([^']+)'/) || [])[1];
        Check('1.1 PWA_SW_VERSION_TOKEN is still the live token (no bump by W0-08)', shellToken === TOKEN, shellToken);
        Check('1.2 PWA_SW_ASSET_VERSION_TOKEN exists and equals it (the split renames no bucket)', assetToken === TOKEN, assetToken);
        Check('1.3 the header log carries the 1.0.17 entry marked NOT BUMPED', /01-Oct-2026 - Version 1\.0\.17\r?\n\/\/ - NOT BUMPED/.test(LOGIC_SRC));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2. Install: the precache list and where it goes
// -----------------------------------------------------------------------------

    const GH = MakeWorld({ scope: GH_SCOPE });
    await GH.install();
    const precacheCalls = GH.fetchLog.filter(f => f.init && f.init.cache === 'reload');
    const precacheRel   = precacheCalls.map(f => f.url.slice(GH_SCOPE.length));
    {
        Check('2.1 install fetched every precache entry with cache:reload (and nothing else)', precacheCalls.length === GH.fetchLog.length && precacheCalls.length > 0, `${precacheCalls.length} of ${GH.fetchLog.length}`);
        Check(`2.2 the shell bucket is wpwa-shell-${TOKEN}`, GH.storage.has(`wpwa-shell-${TOKEN}`), [...GH.storage.keys()]);
        Check('2.3 install called skipWaiting', GH.sandbox.__skipped === true);
        const missingLazy = LE_LAZY_SHEETS.filter(p => precacheRel.indexOf(p) === -1);
        Check('2.4 the 8 loader sheets and the 56/57 self-linked scrapbook sheets are precached', missingLazy.length === 0, missingLazy);
        Check('2.5 the DistanceCulling entry points at 05__RenderPipeline/', precacheRel.indexOf(DISTANCE_CULLING_NEW) !== -1);
        Check('2.6 the stale 02__Engine__MaxEngine/ DistanceCulling entry is gone', precacheRel.indexOf(DISTANCE_CULLING_OLD) === -1);
        Check('2.7 no precache entry is listed twice', new Set(precacheRel).size === precacheRel.length);
        if (WEBAPPS_ROOT) {
            const missing = precacheRel.filter(rel => !existsSync(join(WEBAPPS_ROOT, ...rel.split('/'))));
            Check(`2.8 every precache entry exists under ${WEBAPPS_ROOT} (a dry-run install caches no 404)`, missing.length === 0, missing);
        } else {
            Check('2.8 the WebApps tree was found for the precache existence check', false, 'pass --webapps-root');
        }
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 3. Activate: the keep-list, and what a future shell bump evicts
// -----------------------------------------------------------------------------

    {
        const current = ['shell', 'data', 'thumbs', 'models', 'images', 'published'].map(k => `wpwa-${k}-${TOKEN}`);
        const old     = ['shell', 'data', 'thumbs', 'models', 'images', 'published'].map(k => `wpwa-${k}-2026-09-10-6`);
        const foreign = ['tv-shell-2026-09-29-03', 'some-other-app-cache'];
        for (const name of [...current, ...old, ...foreign]) await GH.sandbox.caches.open(name);
        await GH.activate();
        const left = [...GH.storage.keys()];
        Check('3.1 activate keeps all six current buckets (models included - it used to delete it)', current.every(n => left.indexOf(n) !== -1), left);
        Check('3.2 activate deletes every superseded owned bucket', old.every(n => left.indexOf(n) === -1), left);
        Check('3.3 activate leaves foreign caches alone', foreign.every(n => left.indexOf(n) !== -1), left);
        Check('3.4 activate claims open clients', GH.sandbox.__claimed === true);

        // Adam's future shell bump, simulated by changing only the shell token line
        const bumped = LOGIC_SRC.replace(/(const PWA_SW_VERSION_TOKEN\s*=\s*')[^']+(')/, (m, head, tail) => `${head}2026-10-09-1${tail}`);
        Check('3.5 (setup) the shell-bump simulation changed exactly the shell token', bumped !== LOGIC_SRC && /const PWA_SW_ASSET_VERSION_TOKEN\s*=\s*'2026-09-18-1'/.test(bumped));
        const B = MakeWorld({ scope: GH_SCOPE, source: bumped });
        for (const name of current) await B.sandbox.caches.open(name);
        await B.activate();
        const kept = [...B.storage.keys()];
        Check('3.6 after a shell bump the shell and data buckets of the old token are evicted', kept.indexOf(`wpwa-shell-${TOKEN}`) === -1 && kept.indexOf(`wpwa-data-${TOKEN}`) === -1, kept);
        Check('3.7 after a shell bump thumbs, models, images and published survive (no model re-download)',
            ['thumbs', 'models', 'images', 'published'].every(k => kept.indexOf(`wpwa-${k}-${TOKEN}`) !== -1), kept);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 4. Sheet pictures: the images bucket
// -----------------------------------------------------------------------------

    {
        const W = MakeWorld({ scope: GH_SCOPE });
        const IMAGES = `wpwa-images-${TOKEN}`;
        const SHELL  = `wpwa-shell-${TOKEN}`;
        const pic    = `${DOOUS_CDN}/05__Layout__DrawingDocs__Images/DOOUS_D01/Front__CGI__a1b2c3d4e5.webp`;
        W.server.set(pic, 'WEBP-BYTES');
        const first  = await W.get(pic);
        await W.flush();
        const second = await W.get(pic);
        await W.flush();
        Check('4.1 a CDN picture is answered by the worker (not passed through)', !first.passthrough && first.res && BodyOf(first) === 'WEBP-BYTES');
        Check('4.2 a picture fetched twice from cdn.noble-architecture.com reaches the network once', W.fetchesFor(pic).length === 1, W.fetchesFor(pic));
        Check('4.3 ... and the second answer comes from the images bucket', second.res && BodyOf(second) === 'WEBP-BYTES' && W.cache(IMAGES) && W.cache(IMAGES).has(pic));

        const png = `${DOOUS_CDN}/05__Layout__DrawingDocs__Images/DOOUS_D02/Site__Location__0123456789.png`;
        W.server.set(png, 'PNG-BYTES');
        await W.get(png); await W.flush();
        Check('4.4 a .png picture lands in the images bucket, not the shell bucket', W.cache(IMAGES).has(png) && !(W.cache(SHELL) && W.cache(SHELL).has(png)));

        const imgNamed = `${DOOUS_CDN}/05__Layout__DrawingDocs__Images/DOOUS_D03/IMG01__Visual__abcdef0123.png`;
        W.server.set(imgNamed, 'IMG-NAMED');
        const named = await W.get(imgNamed); await W.flush();
        Check('4.5 a picture named IMG01__... is a sheet picture, not a passed-through full image', !named.passthrough && W.cache(IMAGES).has(imgNamed));

        const jpg = `${GH_SCOPE}Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/DOOUS_D01/Photo__fedcba9876.jpg`;
        W.server.set(jpg, 'JPG-BYTES');
        await W.get(jpg); await W.flush();
        Check('4.6 a same-origin repository copy (.jpg) uses the images bucket too', W.cache(IMAGES).has(jpg));

        Check('4.7 a picture miss is fetched plainly (content-hashed: the browser copy is right)', W.firstInit(pic) === 'PLAIN', W.firstInit(pic));

        // LRU cap 160
        const L = MakeWorld({ scope: GH_SCOPE });
        const urls = [];
        for (let i = 0; i < 165; i += 1) {
            const u = `${DOOUS_CDN}/05__Layout__DrawingDocs__Images/DOOUS_D09/P${String(i).padStart(3, '0')}__${(1000000000 + i).toString(16).slice(-10).padStart(10, '0')}.webp`;
            urls.push(u); L.server.set(u, `P${i}`);
            await L.get(u); await L.flush();
        }
        const lc = L.cache(IMAGES);
        Check('4.8 the images bucket is capped at 160 (LRU)', lc && lc.size === 160, lc && lc.size);
        Check('4.9 ... and the oldest five were the ones dropped', urls.slice(0, 5).every(u => !lc.has(u)) && urls.slice(5).every(u => lc.has(u)));

        W.setOffline(true);
        const off = await W.get(pic);
        Check('4.10 offline, a cached picture is still served', off.res && BodyOf(off) === 'WEBP-BYTES');
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 5. Published drawings: the published bucket
// -----------------------------------------------------------------------------

    {
        const W = MakeWorld({ scope: GH_SCOPE });
        const PUB  = `wpwa-published-${TOKEN}`;
        const DATA = `wpwa-data-${TOKEN}`;
        const SHELL = `wpwa-shell-${TOKEN}`;
        const root = `${DOOUS_CDN}/06__Layout__PublishedDocuments`;
        const svg  = `${root}/DOOUS_D01/Linework__Tier01__a1b2c3d4e5.svg`;
        const webp = `${root}/DOOUS_D01/Picture__Tier02__0a1b2c3d4e.webp`;
        W.server.set(svg, 'SVG'); W.server.set(webp, 'WEBP');
        await W.get(svg); await W.get(webp); await W.flush();
        await W.get(svg); await W.get(webp); await W.flush();
        Check('5.1 hashed published files are served from the published bucket on a second visit', W.fetchesFor(svg).length === 1 && W.fetchesFor(webp).length === 1 && W.cache(PUB).has(svg) && W.cache(PUB).has(webp));
        Check('5.2 a hashed .svg no longer lands in the shell bucket', !(W.cache(SHELL) && W.cache(SHELL).has(svg)));

        const index = `${root}/Published__Index__.json`;
        W.server.set(index, '{"rev":"A"}');
        const v1 = await W.get(index); await W.flush();
        W.server.set(index, '{"rev":"B"}');                                       // <-- a re-publish
        const v2 = await W.get(index); await W.flush();
        Check('5.3 the published index is network-first with cache:no-store', W.fetchesFor(index).every(f => f.init && f.init.cache === 'no-store') && W.fetchesFor(index).length === 2);
        Check('5.4 a re-published index is seen on the next load', BodyOf(v1) === '{"rev":"A"}' && BodyOf(v2) === '{"rev":"B"}');
        Check('5.5 the index is kept in the published bucket (not the data bucket)', W.cache(PUB).body(index) === '{"rev":"B"}' && !(W.cache(DATA) && W.cache(DATA).has(index)));
        W.setOffline(true);
        const off = await W.get(index);
        Check('5.6 offline, the last published index is served from the published bucket', off.res && BodyOf(off) === '{"rev":"B"}');
        W.setOffline(false);

        const pdf = `${root}/DOOUS_D01/DOOUS_D01__RevA.pdf`;
        W.server.set(pdf, 'PDF');
        const p = await W.get(pdf);
        Check('5.7 a published PDF passes straight through (never cached)', p.passthrough === true && W.fetchesFor(pdf).length === 0 && ![...W.storage.values()].some(c => c.has(pdf)));

        // cap 240
        const L = MakeWorld({ scope: GH_SCOPE });
        for (let i = 0; i < 245; i += 1) {
            const u = `${root}/DOOUS_D05/Tile${i}__${(0x100000000 + i).toString(16).slice(-10).padStart(10, '0')}.webp`;
            L.server.set(u, `T${i}`); await L.get(u); await L.flush();
        }
        Check('5.8 the published bucket is capped at 240 (LRU)', L.cache(PUB) && L.cache(PUB).size === 240, L.cache(PUB) && L.cache(PUB).size);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 6. The shell on a deployed origin: precached sheets and the revalidating refresh
// -----------------------------------------------------------------------------

    {
        // After a deploy (with Adam's bump) a warm client's new worker installs: the precache
        // fetch takes each listed file fresh (cache:reload), so the first load after the reload
        // gets the changed Layout Editor stylesheet.
        const W = MakeWorld({ scope: GH_SCOPE });
        const sheetUrl = GH_SCOPE + LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css';
        W.server.set(sheetUrl, '/* Styles__Main v2 - after the deploy */');
        await W.install();
        const before = W.fetchesFor(sheetUrl).length;
        const got = await W.get(sheetUrl);
        Check('6.1 a changed LE stylesheet is served on the first load after the deploy (precached at install)', got.res && BodyOf(got) === '/* Styles__Main v2 - after the deploy */', got.res && BodyOf(got));
        Check('6.2 ... straight from the shell bucket (the precache fetched it with cache:reload)', W.firstInit(sheetUrl).cache === 'reload' && before === 1, W.firstInit(sheetUrl));
        await W.flush();
        Check('6.3 ... and its background refresh revalidates with cache:no-cache', W.fetchesFor(sheetUrl).slice(1).every(f => f.init && f.init.cache === 'no-cache') && W.fetchesFor(sheetUrl).length === 2, W.fetchesFor(sheetUrl));

        // A module that is not precached: the miss and every refresh revalidate, and a change
        // made on the server reaches the bucket through the background refresh.
        const mod = GH_SCOPE + LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js';
        W.server.set(mod, 'export const v = 1;');
        const m1 = await W.get(mod); await W.flush();
        W.server.set(mod, 'export const v = 2;');
        const m2 = await W.get(mod); await W.flush();
        const m3 = await W.get(mod); await W.flush();
        Check('6.4 stale-while-revalidate: the cached copy answers at once', BodyOf(m1) === 'export const v = 1;' && BodyOf(m2) === 'export const v = 1;');
        Check('6.5 ... the background refresh lands the new file for the next load', BodyOf(m3) === 'export const v = 2;');
        Check('6.6 every stale-while-revalidate fetch carries cache:no-cache (TV SW 1.9.54)', W.fetchesFor(mod).length === 3 && W.fetchesFor(mod).every(f => f.init && f.init.cache === 'no-cache'), W.fetchesFor(mod));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 7. Every older rule unchanged (gallery, data, models, HDRI, HTML, localhost)
// -----------------------------------------------------------------------------

    {
        const W = MakeWorld({ scope: GH_SCOPE });
        const THUMBS = `wpwa-thumbs-${TOKEN}`, DATA = `wpwa-data-${TOKEN}`, SHELL = `wpwa-shell-${TOKEN}`, MODELS = `wpwa-models-${TOKEN}`;
        const thumb  = `${GH_SCOPE}Whitecardopedia/Projects/2026/3047__Doous/IMG01__Doous__Thumbnail__524p__.webp`;
        const full   = `${GH_SCOPE}Whitecardopedia/Projects/2026/3047__Doous/IMG01__Doous__Front.png`;
        const proj   = `${GH_SCOPE}Whitecardopedia/Projects/2026/3047__Doous/project.json`;
        const glb    = `${DOOUS_CDN}/Models/Doous__Main.glb`;
        const html   = `${GH_SCOPE}Whitecardopedia/app.html`;
        const hdri   = `${GH_SCOPE}ValeVision3D/01__AppAssets__ValeVision/05__AppAssets__SkyDomes/Sky.hdr`;
        const css    = `${GH_SCOPE}Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css`;
        const foreignJs = 'https://unpkg.com/react@18/umd/react.production.min.js';
        for (const [u, b] of [[thumb, 'THUMB'], [full, 'FULL'], [proj, '{"p":1}'], [glb, 'GLB'], [html, '<html>'], [hdri, 'HDR'], [css, 'CSS']]) W.server.set(u, b);

        await W.get(thumb); await W.flush();
        Check('7.1 gallery thumbnails: stale-while-revalidate in wpwa-thumbs with a plain fetch (unchanged)', W.cache(THUMBS) && W.cache(THUMBS).has(thumb) && W.firstInit(thumb) === 'PLAIN');
        const f = await W.get(full);
        Check('7.2 full-resolution IMG##__ images still pass straight through', f.passthrough === true);
        await W.get(proj); await W.flush();
        Check('7.3 project.json: network-first (no-store) in wpwa-data (unchanged)', W.cache(DATA) && W.cache(DATA).has(proj) && W.firstInit(proj).cache === 'no-store');
        await W.get(glb); await W.flush();
        Check('7.4 GLB models: network-first with grace into wpwa-models (unchanged)', W.cache(MODELS) && W.cache(MODELS).has(glb) && W.firstInit(glb) === 'PLAIN');
        await W.get(html); await W.flush();
        Check('7.5 HTML: network-first (no-store) in the shell bucket (unchanged)', W.cache(SHELL) && W.cache(SHELL).has(html) && W.firstInit(html).cache === 'no-store');
        await W.get(hdri); await W.get(hdri); await W.flush();
        Check('7.6 HDRI: cache-first in the shell bucket (unchanged)', W.fetchesFor(hdri).length === 1 && W.cache(SHELL).has(hdri));
        const fj = await W.get(foreignJs);
        Check('7.7 a foreign origin is not touched', fj.passthrough === true);

        await W.get(css); await W.flush();
        W.setOffline(true);
        const offThumb = await W.get(thumb), offProj = await W.get(proj), offHtml = await W.get(html), offCss = await W.get(css);
        Check('7.8 the Whitecardopedia gallery still works offline (app.html, its stylesheet, project.json, thumbnails)',
            BodyOf(offThumb) === 'THUMB' && BodyOf(offProj) === '{"p":1}' && BodyOf(offHtml) === '<html>' && BodyOf(offCss) === 'CSS',
            [offThumb, offProj, offHtml, offCss].map(x => x.res && BodyOf(x)));
        W.setOffline(false);

        // localhost: the shell is network-first, revalidated (1.0.7) - unchanged
        const Lh = MakeWorld({ scope: LOCAL_SCOPE });
        const lm = `${LOCAL_SCOPE}ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`;
        Lh.server.set(lm, 'v1');
        const a = await Lh.get(lm); await Lh.flush();
        Lh.server.set(lm, 'v2');
        const b = await Lh.get(lm); await Lh.flush();
        Check('7.9 localhost shell: every load asks the server (cache:no-cache) and gets the file as it is now (unchanged)', BodyOf(a) === 'v1' && BodyOf(b) === 'v2' && Lh.fetchesFor(lm).every(x => x.init && x.init.cache === 'no-cache'));
        const lpic = `${LOCAL_SCOPE}Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/DOOUS_D01/Front__CGI__a1b2c3d4e5.webp`;
        Lh.server.set(lpic, 'LOCALPIC');
        await Lh.get(lpic); await Lh.flush(); await Lh.get(lpic); await Lh.flush();
        Check('7.10 localhost: a sheet picture is cache-first in the images bucket as well', Lh.fetchesFor(lpic).length === 1 && Lh.cache(`wpwa-images-${TOKEN}`).has(lpic));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 8. The diagnostic reset clears every owned bucket, new ones included
// -----------------------------------------------------------------------------

    {
        const W = MakeWorld({ scope: GH_SCOPE });
        for (const k of ['shell', 'data', 'thumbs', 'models', 'images', 'published']) await W.sandbox.caches.open(`wpwa-${k}-${TOKEN}`);
        await W.sandbox.caches.open('foreign-cache');
        const replies = await W.message({ type: 'wpwa-clear-caches' });
        const left = [...W.storage.keys()];
        Check('8.1 wpwa-clear-caches empties all six owned buckets and leaves foreign caches', left.length === 1 && left[0] === 'foreign-cache', left);
        Check('8.2 ... and acknowledges success', replies.length === 1 && replies[0].type === 'wpwa-cleared' && replies[0].success === true, replies);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    const failed = RESULTS.filter(r => !r.ok);
    console.log(`\n${RESULTS.length - failed.length}/${RESULTS.length} checks passed  (logic: ${LOGIC_PATH})`);
    process.exit(failed.length ? 1 : 0);

// endregion -------------------------------------------------------------------
