// =============================================================================
// VALEVISION3D - TEST - SHARED PWA SERVICE WORKER REGISTRAR (W0-08)
// =============================================================================
//
// FILE       : Na__Test__PwaServiceWorkerRegistrar__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Shared PWA Service Worker Registrar Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the prepared Whitecardopedia registrar 1.2.1: no reload on a first install,
//              one reload on a real update, the unsaved-work hold and its timeout,
//              updateViaCache 'none', and Whitecardopedia pages as before
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - Runs Whitecardopedia__Pwa__ServiceWorker__Registrar__.js, as it is, inside
//   a simulated page (node:vm): window, document, navigator.serviceWorker with
//   a recording register() and a controllerchange dispatcher, sessionStorage,
//   and a FAKE CLOCK, so the registrar's 30 s idle poll runs in no time.
// - Each scenario is a fresh page. Nothing private is reached into: the page
//   is driven only through the events and globals the browser and the
//   ValeVision3D Layout Editor provide (controllerchange, load,
//   window.Na__LoadWatchdog__IsLoadingActive, window.Na__Pwa__HasUnsavedWork).
// - Tests the STAGED copy next to this folder by default; --sw-dir points it at
//   the live file once Adam has applied prepared/W0-08.patch.
//
// USAGE:
//     node Na__Test__PwaServiceWorkerRegistrar__.test.mjs [--sw-dir <folder>]
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Written with the prepared registrar 1.2.1 (TrueVision parity package W0-08).
//
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';


// -----------------------------------------------------------------------------
// REGION | Inputs and Checks
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const ArgValue   = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
    const SW_DIR     = resolve(ArgValue('--sw-dir') || join(SCRIPT_DIR, '..', 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '62__Feature__AppInstallability'));
    const SRC_PATH   = join(SW_DIR, 'Whitecardopedia__Pwa__ServiceWorker__Registrar__.js');
    const SRC        = readFileSync(SRC_PATH, 'utf8');

    const GH_WEBAPPS = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/';
    const VV_PAGE    = `${GH_WEBAPPS}ValeVision3D/index.html?project=2026/3047__Doous`;
    const WCP_PAGE   = `${GH_WEBAPPS}Whitecardopedia/app.html`;

    const RESULTS = [];
    function Check(name, ok, detail) {
        RESULTS.push({ name, ok: !!ok });
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? `\n      ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Simulated Page
// -----------------------------------------------------------------------------

    async function Settle() { for (let i = 0; i < 5; i += 1) await new Promise(r => setImmediate(r)); }

    async function MakePage({ href = VV_PAGE, controlled = false, readyState = 'complete' } = {}) {
        const url        = new URL(href);
        const listeners  = { sw: {}, win: {} };
        const registers  = [];
        const session    = new Map();
        const logs       = [];
        let reloads      = 0;
        let now          = 0;
        let timers       = [];

        const sessionStorage = {
            getItem: (k) => (session.has(k) ? session.get(k) : null),
            setItem: (k, v) => session.set(k, String(v)),
            removeItem: (k) => session.delete(k),
            clear: () => session.clear()
        };
        const navigator = {
            serviceWorker: {
                controller: controlled ? { scriptURL: `${GH_WEBAPPS}Na__Pwa__ServiceWorker__.js` } : null,
                async register(scriptUrl, options) {
                    registers.push({ scriptUrl, options: { ...options }, bridgeArmed: (listeners.sw.controllerchange || []).length > 0 });
                    return { scope: options && options.scope, update() {} };
                },
                addEventListener(type, fn) { (listeners.sw[type] = listeners.sw[type] || []).push(fn); },
                async getRegistrations() { return []; }
            }
        };
        const window = {
            location: { href, protocol: url.protocol, hostname: url.hostname, reload() { reloads += 1; } },
            addEventListener(type, fn) { (listeners.win[type] = listeners.win[type] || []).push(fn); },
            Whitecardopedia__Pwa__Url: {
                getServiceWorkerUrl: () => `${GH_WEBAPPS}Na__Pwa__ServiceWorker__.js`,
                getServiceWorkerScope: () => GH_WEBAPPS
            }
        };
        const sandbox = {
            window, navigator, sessionStorage,
            localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
            document: { readyState },
            console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
            setTimeout: (fn, ms) => { timers.push({ at: now + (ms || 0), fn }); return timers.length; },
            clearTimeout() {},
            Object, Boolean, Promise, String, Error
        };
        vm.createContext(sandbox);
        vm.runInContext(SRC, sandbox, { filename: 'Whitecardopedia__Pwa__ServiceWorker__Registrar__.js' });
        await Settle();

        return {
            window, navigator, registers, logs, session,
            get reloads() { return reloads; },
            get pendingTimers() { return timers.length; },
            fireControllerChange() {
                for (const fn of listeners.sw.controllerchange || []) fn();
                navigator.serviceWorker.controller = navigator.serviceWorker.controller || { scriptURL: 'claimed' };
            },
            async fireLoad() { for (const fn of listeners.win.load || []) fn(); await Settle(); },
            advance(ms) {                                                        // <-- Fake clock: run every timer due within ms
                const end = now + ms;
                for (;;) {
                    timers.sort((a, b) => a.at - b.at);
                    if (!timers.length || timers[0].at > end) break;
                    const t = timers.shift();
                    now = t.at;
                    t.fn();
                }
                now = end;
            },
            get now() { return now; }
        };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 1. Registration: updateViaCache 'none', the bridge armed first
// -----------------------------------------------------------------------------

    {
        const P = await MakePage({ controlled: false });
        Check('1.1 the worker is registered once on a loaded page', P.registers.length === 1, P.registers);
        Check('1.2 ... the stub at the WebApps root, with the WebApps scope', P.registers[0] && P.registers[0].scriptUrl === `${GH_WEBAPPS}Na__Pwa__ServiceWorker__.js` && P.registers[0].options.scope === GH_WEBAPPS);
        Check("1.3 ... with updateViaCache 'none' (TrueVision registrar 1.3.0)", P.registers[0] && P.registers[0].options.updateViaCache === 'none', P.registers[0] && P.registers[0].options);
        Check('1.4 the controllerchange bridge is armed BEFORE register() is called', P.registers[0] && P.registers[0].bridgeArmed === true);

        const api = P.window.Whitecardopedia__Pwa__ServiceWorker__Registrar;
        Check('1.5 the public API is unchanged (register, getRegistration, clearCaches, hardReset, purgeAppCache)',
            api && ['register', 'getRegistration', 'clearCaches', 'hardReset', 'purgeAppCache'].every(k => typeof api[k] === 'function') && Object.keys(api).length === 5, api && Object.keys(api));
        const desc = Object.getOwnPropertyDescriptor(P.window, 'ClearCache');
        Check('1.6 the --ClearCache console getter and na_clear_cache() are still installed', desc && typeof desc.get === 'function' && typeof P.window.na_clear_cache === 'function');

        const late = await MakePage({ readyState: 'loading' });
        Check('1.7 a page still loading registers on window load, not before (unchanged)', late.registers.length === 0);
        await late.fireLoad();
        Check('1.8 ... and registers once the load event fires', late.registers.length === 1);

        const insecure = await MakePage({ href: 'http://studio-pc.lan:8000/ValeVision3D/index.html' });
        Check('1.9 a remote http:// origin never registers (unchanged)', insecure.registers.length === 0);
        const local = await MakePage({ href: 'http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous' });
        Check('1.10 localhost http:// registers (unchanged)', local.registers.length === 1);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2. A fresh origin: the first claim is not an update
// -----------------------------------------------------------------------------

    {
        const P = await MakePage({ controlled: false });
        P.fireControllerChange();                                                // <-- clients.claim() of the very first worker
        P.advance(60000);
        Check('2.1 a fresh origin\'s first load registers the worker and does NOT reload', P.reloads === 0, P.reloads);
        Check('2.2 ... and does not spend the session\'s one reload on it', !P.session.has('wpwa-sw-reload-done'), [...P.session.keys()]);
        Check('2.3 ... and says so in the console', P.logs.some(l => /First service worker has taken control/.test(l)), P.logs);

        P.fireControllerChange();                                                // <-- a real update later in the same page
        Check('2.4 a second controllerchange on that (now controlled) page reloads once', P.reloads === 1, P.reloads);
        P.fireControllerChange();
        P.advance(60000);
        Check('2.5 ... and only once per session (the sessionStorage guard)', P.reloads === 1, P.reloads);

        const C = await MakePage({ controlled: true });
        C.fireControllerChange();
        Check('2.6 a page controlled at boot reloads once on controllerchange (unchanged update path)', C.reloads === 1, C.reloads);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 3. Unsaved Layout Editor work holds the reload
// -----------------------------------------------------------------------------

    {
        const P = await MakePage({ controlled: true });
        let unsaved = true, asked = 0;
        P.window.Na__Pwa__HasUnsavedWork = () => { asked += 1; return unsaved; };
        P.fireControllerChange();
        P.advance(29000);
        Check('3.1 with unsaved sheets open the reload waits', P.reloads === 0 && asked > 1, { reloads: P.reloads, asked });
        P.advance(2000);
        Check('3.2 ... and gives up after the registrar timeout (30 s): no reload, no poll left', P.reloads === 0 && P.pendingTimers === 0, { reloads: P.reloads, timers: P.pendingTimers });
        Check('3.3 ... with a console warning that names unsaved work', P.logs.some(l => /unsaved work after 30s/.test(l)), P.logs);
        unsaved = false;
        P.advance(60000);
        Check('3.4 ... and does not reload later in that page (the update lands on the next fresh load)', P.reloads === 0);

        const Q = await MakePage({ controlled: true });
        let dirty = true;
        Q.window.Na__Pwa__HasUnsavedWork = () => dirty;
        Q.fireControllerChange();
        Q.advance(4000);
        dirty = false;                                                           // <-- Save Sheets pressed
        Q.advance(600);
        Check('3.5 once the work is saved inside the window, the reload happens (once)', Q.reloads === 1, Q.reloads);

        const T = await MakePage({ controlled: true });
        T.window.Na__Pwa__HasUnsavedWork = () => { throw new Error('probe broken'); };
        T.fireControllerChange();
        Check('3.6 a probe that throws counts as nothing unsaved (updates are never wedged)', T.reloads === 1, T.reloads);

        const N = await MakePage({ controlled: true });
        N.window.Na__Pwa__HasUnsavedWork = true;                                 // <-- not a function: ignored
        N.fireControllerChange();
        Check('3.7 a flag that is not a function is ignored', N.reloads === 1, N.reloads);

        const F = await MakePage({ controlled: false });
        F.window.Na__Pwa__HasUnsavedWork = () => true;
        F.fireControllerChange();                                                // <-- first claim: no reload whatever the flag says
        F.advance(60000);
        Check('3.8 a first install never reloads, unsaved work or not', F.reloads === 0);

        const W = await MakePage({ controlled: true });
        W.window.Na__Pwa__HasUnsavedWork = () => false;
        W.window.Na__LoadWatchdog__IsLoadingActive = true;
        W.fireControllerChange();
        W.advance(5000);
        Check('3.9 a model load in flight still holds the reload (unchanged)', W.reloads === 0);
        W.window.Na__LoadWatchdog__IsLoadingActive = false;
        W.advance(600);
        Check('3.10 ... and the reload follows once the load finishes (unchanged)', W.reloads === 1, W.reloads);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 4. Whitecardopedia pages behave as before
// -----------------------------------------------------------------------------

    {
        const P = await MakePage({ href: WCP_PAGE, controlled: true });
        Check('4.1 a Whitecardopedia page publishes no unsaved-work flag', P.window.Na__Pwa__HasUnsavedWork === undefined);
        P.fireControllerChange();
        Check('4.2 a Whitecardopedia page reloads at once on an update, exactly as before', P.reloads === 1, P.reloads);
        P.fireControllerChange();
        Check('4.3 ... once per session', P.reloads === 1);

        const L = await MakePage({ href: WCP_PAGE, controlled: true });
        L.window.Na__LoadWatchdog__IsLoadingActive = true;
        L.fireControllerChange();
        L.advance(30000);
        Check('4.4 a Whitecardopedia page busy for 30 s gives up the reload, exactly as before', L.reloads === 0 && L.pendingTimers === 0, { reloads: L.reloads, timers: L.pendingTimers });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    const failed = RESULTS.filter(r => !r.ok);
    console.log(`\n${RESULTS.length - failed.length}/${RESULTS.length} checks passed  (registrar: ${SRC_PATH})`);
    process.exit(failed.length ? 1 : 0);

// endregion -------------------------------------------------------------------
