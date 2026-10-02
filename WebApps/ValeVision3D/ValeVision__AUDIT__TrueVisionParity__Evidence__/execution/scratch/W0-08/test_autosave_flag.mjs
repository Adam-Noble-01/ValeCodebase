// W0-08 scratch test: the live VV AutoSave publishes window.Na__Pwa__HasUnsavedWork exactly as TrueVision's
// AutoSave publishes its own flag (on every Initialize, re-read each time), answering through the module's
// Na__LeAuto__HasUnsavedWork - and never publishes a TrueVision-named global.
// The module is copied, unchanged, into a temporary ES-module tree whose four imports are small stubs at the
// same relative paths. Run: node test_autosave_flag.mjs
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const LIVE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js';
const ROOT = mkdtempSync(join(tmpdir(), 'vv-w008-autosave-'));
const LE = join(ROOT, '51__System__LayoutEditor');
const put = (rel, text) => { const p = join(ROOT, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); return p; };

put('package.json', JSON.stringify({ type: 'module' }));
put('51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    "export function Na__LeCfg__GetAutoSaveSetup() { return { enabled: true, draftEnabled: true, closeGuardEnabled: true, debounceMs: 10, draftDebounceMs: 10 }; }\n" +
    "export function Na__LeCfg__GetLabel(k, d) { return d; }\n");
put('51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    "export const Na__LeModel__CHANGED_EVENT = 'na-layouteditor-sheets-changed';\n" +
    "export function Na__LeModel__GetSheets() { return []; }\n" +
    "export function Na__LeModel__RestoreSheets() {}\n" +
    "export function Na__LeModel__IsDirty() { return globalThis.__modelDirty === true; }\n" +
    "export async function Na__LeModel__Save() { return true; }\n");
put('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    "export const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';\n" +
    "export function Na__DrawData__GetProjectCode() { return 'DOOUS'; }\n");
put('51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js',
    "export function Na__LeSpec__IsDirty() { if (globalThis.__specThrows) throw new Error('not loaded'); return globalThis.__specDirty === true; }\n");
const target = join(LE, '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js');
copyFileSync(LIVE, target);

const listeners = {};
globalThis.window = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (t) => clearTimeout(t),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
};
globalThis.document = { addEventListener() {}, visibilityState: 'visible' };

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

const mod = await import(pathToFileURL(target).href);
check('0 module exports Initialize, Flush, HasUnsavedWork (unchanged surface)',
    ['Na__LeAuto__Initialize', 'Na__LeAuto__Flush', 'Na__LeAuto__HasUnsavedWork'].every(k => typeof mod[k] === 'function') && Object.keys(mod).length === 3);
check('1 nothing is published before the editor initialises', window.Na__Pwa__HasUnsavedWork === undefined);

mod.Na__LeAuto__Initialize({ showToast: null, editable: true });
check('2 Initialize publishes window.Na__Pwa__HasUnsavedWork', typeof window.Na__Pwa__HasUnsavedWork === 'function');
check('3 ... and it IS Na__LeAuto__HasUnsavedWork (the registrar polls the module itself)', window.Na__Pwa__HasUnsavedWork === mod.Na__LeAuto__HasUnsavedWork);
check('4 no TrueVision-named global is published (K2 K4)', Object.keys(window).every(k => !/TrueVision/.test(k)));

globalThis.__modelDirty = false; globalThis.__specDirty = false;
check('5 clean sheets and specification: the flag answers false', window.Na__Pwa__HasUnsavedWork() === false);
globalThis.__modelDirty = true;
check('6 unsaved sheets: the flag answers true', window.Na__Pwa__HasUnsavedWork() === true);
globalThis.__modelDirty = false; globalThis.__specDirty = true;
check('7 an unsynced specification: the flag answers true', window.Na__Pwa__HasUnsavedWork() === true);
globalThis.__specDirty = false; globalThis.__specThrows = true;
check('8 a specification never loaded: false, no throw', window.Na__Pwa__HasUnsavedWork() === false);
globalThis.__specThrows = false;

window.Na__Pwa__HasUnsavedWork = 'clobbered';
globalThis.__modelDirty = true;
mod.Na__LeAuto__Initialize({ showToast: null, editable: false });
check('9 re-published on every Initialize (even after the first one wired the listeners)', window.Na__Pwa__HasUnsavedWork === mod.Na__LeAuto__HasUnsavedWork);
check('10 a read-only session answers false even with dirty sheets (editability re-read)', window.Na__Pwa__HasUnsavedWork() === false);
mod.Na__LeAuto__Initialize({ showToast: null, editable: true });
check('11 editable again: true', window.Na__Pwa__HasUnsavedWork() === true);
check('12 the listeners were wired once only', (listeners.beforeunload || []).length === 1);

const src = readFileSync(LIVE, 'utf8');
const portNote = src.slice(src.indexOf('// PORT NOTE:'), src.indexOf('// DEVELOPMENT LOG:'));
const outside = src.replace(portNote, '');
check('13 every TrueVision__ literal sits inside the PORT NOTE block (G4 naming lint)', !/TrueVision__|\[TrueVision3D|TRUEVISION3D/.test(outside));
check('14 the module log carries {{VVREL:W0-08}} for the scribe', /01-Oct-2026 - Version 1\.3\.1/.test(src) && /\{\{VVREL:W0-08\}\}/.test(src));

rmSync(ROOT, { recursive: true, force: true });
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
