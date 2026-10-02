// W1-07 scratch test (adopted from W0-08's test_autosave_flag.mjs, W0-99 section 4): the AutoSave taken whole from
// TrueVision 1.5.0 still publishes window.Na__Pwa__HasUnsavedWork exactly as TrueVision's publishes its own flag
// (on every Initialize, re-read each time), answering through the module's Na__LeAuto__HasUnsavedWork - and never
// publishes a TrueVision-named global. The module is copied, unchanged, into a temporary ES-module tree whose five
// imports are small stubs at the same relative paths.
//   node test_autosave_flag_w1_07.mjs [<AutoSave file>]   (default: the live file)
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const LIVE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js';
const FILE = process.argv[2] ? resolve(process.argv[2]) : LIVE;
const ROOT = mkdtempSync(join(tmpdir(), 'vv-w107-autosave-'));
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
    "export const Na__DrawData__SAVED_ISO_KEY = 'LayoutEditor__DrawingsData__SavedIso';\n" +
    "export function Na__DrawData__GetProjectCode() { return 'DOOUS'; }\n" +
    "export function Na__DrawData__IsLoaded() { return true; }\n" +
    "export function Na__DrawData__GetBlock() { return null; }\n" +
    "export function Na__DrawData__GetBase() { return null; }\n" +
    "export function Na__DrawData__WhenBaseKnown() { return Promise.resolve(null); }\n");
put('21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    "export function Na__PresentationMode__DevMenu__Confirm() { return Promise.resolve(false); }\n");
put('51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js',
    "export function Na__LeSpec__IsDirty() { if (globalThis.__specThrows) throw new Error('not loaded'); return globalThis.__specDirty === true; }\n");
const target = join(LE, '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js');
copyFileSync(FILE, target);

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
const SIX = ['Na__LeAuto__DiscardSavedDraft', 'Na__LeAuto__Suspend', 'Na__LeAuto__Resume', 'Na__LeAuto__Initialize', 'Na__LeAuto__Flush', 'Na__LeAuto__HasUnsavedWork'];
check('0 module exports TrueVision 1.5.0\'s six names (Initialize, Flush, HasUnsavedWork kept; Suspend, Resume, DiscardSavedDraft added)',
    SIX.every(k => typeof mod[k] === 'function') && Object.keys(mod).length === 6);
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

const src = readFileSync(FILE, 'utf8');
const portNote = src.slice(src.indexOf('// PORT NOTE:'), src.indexOf('// DEVELOPMENT LOG:'));
const outside = src.replace(portNote, '');
check('13 every TrueVision__ literal sits inside the PORT NOTE block (G4 naming lint)', !/TrueVision__|\[TrueVision3D|TRUEVISION3D/.test(outside));
check('14 the PORT NOTE names the release as {{VVREL:W1-07}} and the log is TrueVision\'s, 1.5.0 on top',
    /\/\/ - Ported on\s*: 02-Oct-2026 for ValeVision3D \{\{VVREL:W1-07\}\}/.test(src) && /\/\/ DEVELOPMENT LOG:\n\/\/ 22-Sep-2026 - Version 1\.5\.0\n/.test(src.replace(/\r\n/g, '\n')));
check('15 the flag line is the neutral one, written once', (src.match(/window\.Na__Pwa__HasUnsavedWork = Na__LeAuto__HasUnsavedWork;/g) || []).length === 1);

rmSync(ROOT, { recursive: true, force: true });
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
