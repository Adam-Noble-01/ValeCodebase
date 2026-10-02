// W1-07 scratch test (adopted from W0-08's test_integration_flag.mjs): the contract between the two halves after
// AutoSave 1.5.0 is taken whole - the AutoSave publishes the flag into a page's window, and the STAGED Whitecardopedia
// registrar (execution/prepared/W0-08, never deployed here), running in that same window, holds its update reload
// while the editor has unsaved sheets and reloads once they are saved.
//   node test_integration_flag_w1_07.mjs [<AutoSave file>]   (default: the live file)
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const LIVE_AUTOSAVE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js';
const FILE = process.argv[2] ? resolve(process.argv[2]) : LIVE_AUTOSAVE;
const STAGED_REGISTRAR = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/prepared/W0-08/WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js';

// ---- the editor half (stub imports, the real module) -------------------------------------
const ROOT = mkdtempSync(join(tmpdir(), 'vv-w107-integration-'));
const put = (rel, text) => { const p = join(ROOT, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); return p; };
put('package.json', JSON.stringify({ type: 'module' }));
put('51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    "export function Na__LeCfg__GetAutoSaveSetup() { return { enabled: false, draftEnabled: false, closeGuardEnabled: true, debounceMs: 10, draftDebounceMs: 10 }; }\nexport function Na__LeCfg__GetLabel(k, d) { return d; }\n");
put('51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    "export const Na__LeModel__CHANGED_EVENT = 'x';\nexport function Na__LeModel__GetSheets() { return []; }\nexport function Na__LeModel__RestoreSheets() {}\nexport function Na__LeModel__IsDirty() { return globalThis.__modelDirty === true; }\nexport async function Na__LeModel__Save() { return true; }\n");
put('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    "export const Na__DrawData__CHANGED_EVENT = 'y';\nexport const Na__DrawData__SAVED_ISO_KEY = 'LayoutEditor__DrawingsData__SavedIso';\nexport function Na__DrawData__GetProjectCode() { return 'DOOUS'; }\n" +
    "export function Na__DrawData__IsLoaded() { return true; }\nexport function Na__DrawData__GetBlock() { return null; }\nexport function Na__DrawData__GetBase() { return null; }\nexport function Na__DrawData__WhenBaseKnown() { return Promise.resolve(null); }\n");
put('21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    "export function Na__PresentationMode__DevMenu__Confirm() { return Promise.resolve(false); }\n");
put('51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js',
    "export function Na__LeSpec__IsDirty() { return false; }\n");
const target = join(ROOT, '51__System__LayoutEditor', '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js');
copyFileSync(FILE, target);

let reloads = 0, now = 0, timers = [];
const swListeners = [];
const pageWindow = {
    location: { href: 'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/index.html?project=2026/3047__Doous', protocol: 'https:', hostname: 'adam-noble-01.github.io', reload() { reloads += 1; } },
    addEventListener() {},
    Whitecardopedia__Pwa__Url: { getServiceWorkerUrl: () => 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Na__Pwa__ServiceWorker__.js', getServiceWorkerScope: () => 'https://adam-noble-01.github.io/ValeCodebase/WebApps/' }
};
globalThis.window = pageWindow;
globalThis.document = { addEventListener() {}, visibilityState: 'visible', readyState: 'complete' };
const autosave = await import(pathToFileURL(target).href);
autosave.Na__LeAuto__Initialize({ showToast: null, editable: true });

// ---- the worker half (the staged registrar, in the same window) --------------------------
const sandbox = {
    window: pageWindow,
    document: globalThis.document,
    navigator: { serviceWorker: { controller: { scriptURL: 'old' }, async register(u, o) { return { scope: o.scope }; }, addEventListener(t, fn) { if (t === 'controllerchange') swListeners.push(fn); }, async getRegistrations() { return []; } } },
    sessionStorage: (() => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })(),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (fn, ms) => { timers.push({ at: now + ms, fn }); return timers.length; }
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(STAGED_REGISTRAR, 'utf8'), sandbox);
for (let i = 0; i < 5; i += 1) await new Promise(r => setImmediate(r));
const advance = (ms) => { const end = now + ms; for (;;) { timers.sort((a, b) => a.at - b.at); if (!timers.length || timers[0].at > end) break; const t = timers.shift(); now = t.at; t.fn(); } now = end; };

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

globalThis.__modelDirty = true;                                             // <-- an architect mid-way through a sheet
for (const fn of swListeners) fn();                                          // <-- a deploy's new worker takes over
advance(10000);
check('1 the AutoSave 1.5.0 flag holds the staged registrar\'s reload while sheets are unsaved', reloads === 0);
globalThis.__modelDirty = false;                                            // <-- Save Sheets
advance(600);
check('2 ... and the reload happens once the sheets are saved', reloads === 1);

rmSync(ROOT, { recursive: true, force: true });
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
