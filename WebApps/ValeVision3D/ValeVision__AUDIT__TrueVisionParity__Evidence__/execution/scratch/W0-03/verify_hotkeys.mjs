// =============================================================================
// W0-03 scratch harness - the drawing-tab and 3D hotkeys, read from the LIVE tree
// =============================================================================
//
// Usage:  node verify_hotkeys.mjs <label>
//         writes results_<label>.json beside this file; nothing else is written.
//
// What it does (read-only against D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D):
// - Shims fetch (file: URLs and document-relative paths read from disk, every
//   request recorded), window (keydown listeners collected) and a tiny document.
// - Drawing tabs: imports the live Na__LayoutEditor__ConfigState__KeyMap__.js,
//   runs Na__LeCfg__FetchKeyMap (true only when the key file was found, not the
//   built-in fallback) and resolves a sweep of keys x modifiers through
//   Na__LeCfg__MatchKeyBinding, plus every other reader the module exports.
// - 3D tab: imports the live Na__AppUtils__ValeVision__HotkeyHandler__.js,
//   initialises it with the same action names index.html registers, then
//   presses R, B, T, Y, V, 1-9, Page Up / Page Down (and the rest of the
//   dictionary's keys) and records which callback fired.
// - Help panel: imports the live Na__UiFeature__NavigationHelpPanel__Controls.js,
//   initialises it and records the key labels of the rows it builds.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const VV    = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const HERE  = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] || 'run';

// --- fetch shim --------------------------------------------------------------
const fetched = [];
globalThis.fetch = async (input) => {
    const s = (input instanceof URL) ? input.href : String(input);
    const filePath = s.startsWith('file:') ? fileURLToPath(s) : path.join(VV, s.split('?')[0]);
    const rel = path.relative(VV, filePath).split(path.sep).join('/');
    let text = null;
    try { text = readFileSync(filePath, 'utf8'); } catch (e) { text = null; }
    fetched.push({ request : rel, found : text !== null });
    if (text === null) return { ok : false, status : 404, json : async () => { throw new Error('404 ' + rel); } };
    return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text };
};

// --- window / document shims -------------------------------------------------
const listeners = {};
const warnings  = [];
const origWarn  = console.warn;
console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
globalThis.window = {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    history : { back() {} }
};
function makeEl(tag) {
    return {
        tag, children : [], className : '', textContent : '', style : {},
        appendChild(c) { this.children.push(c); return c; },
        addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
        classList : { contains() { return false; }, toggle() {}, add() {}, remove() {} },
        setAttribute() {}, getAttribute() { return null; }
    };
}
const elements = {};
const KEEP_IDS = [ 'naNavHelpHotkeysList', 'naNavHelpAdvancedHotkeysList', 'naNavHelpAdvancedHotkeysSection' ];
globalThis.document = {
    activeElement : null,
    getElementById(id) { return KEEP_IDS.includes(id) ? (elements[id] ||= makeEl('div#' + id)) : null; },
    createElement(tag) { return makeEl(tag); }
};
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
const mod  = (rel) => import(pathToFileURL(path.join(VV, rel)).href);

const results = { label, fetched, drawingTabs : {}, threeD : {}, helpPanel : {}, warnings };

// --- drawing tabs: the key map ------------------------------------------------
{
    const km = await mod('02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js');
    const loaded = await km.Na__LeCfg__FetchKeyMap();
    results.drawingTabs.keyFileLoaded = loaded;
    const KEYS = [ 'v', 'V', 'm', 'M', 't', 'T', 'd', 'D', 'l', 'L', 'r', 'R', 'e', 'E', 'b', 'B', 'Delete', 'Backspace', 'Escape',
                   'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'F3', 'f', 'F', '1', '+', '=', '-', '_',
                   's', 'S', 'z', 'Z', 'y', 'Y', 'g', 'G', 'c', 'C', 'a', 'A', 'k', 'K', 'F6', 'F7', 'F8', 'F9', 'x', 'X', 'PageUp', 'PageDown' ];
    const MODS = { none : {}, Ctrl : { Ctrl : true }, Shift : { Shift : true }, Alt : { Alt : true }, CtrlShift : { Ctrl : true, Shift : true } };
    const sweep = {};
    for (const k of KEYS) {
        for (const [mn, held] of Object.entries(MODS)) {
            const hit = km.Na__LeCfg__MatchKeyBinding(k, held);
            sweep[JSON.stringify(k) + '+' + mn] = hit ? hit.action + (hit.coarse ? ' (coarse)' : '') : null;
        }
    }
    results.drawingTabs.keySweep = sweep;
    results.drawingTabs.named = {
        V : km.Na__LeCfg__MatchKeyBinding('v', {})?.action, M : km.Na__LeCfg__MatchKeyBinding('m', {})?.action,
        T : km.Na__LeCfg__MatchKeyBinding('t', {})?.action, D : km.Na__LeCfg__MatchKeyBinding('d', {})?.action,
        L : km.Na__LeCfg__MatchKeyBinding('l', {})?.action, R : km.Na__LeCfg__MatchKeyBinding('r', {})?.action,
        Delete : km.Na__LeCfg__MatchKeyBinding('Delete', {})?.action, Escape : km.Na__LeCfg__MatchKeyBinding('Escape', {})?.action,
        ArrowLeft : km.Na__LeCfg__MatchKeyBinding('ArrowLeft', {})?.action, ArrowRight : km.Na__LeCfg__MatchKeyBinding('ArrowRight', {})?.action,
        ArrowUp : km.Na__LeCfg__MatchKeyBinding('ArrowUp', {})?.action, ArrowDown : km.Na__LeCfg__MatchKeyBinding('ArrowDown', {})?.action,
        'Shift+ArrowLeft' : km.Na__LeCfg__MatchKeyBinding('ArrowLeft', { Shift : true })
    };
    const pointer = {};
    for (const btn of [ 'Left', 'Middle', 'Right' ]) {
        for (const [mn, held] of Object.entries({ none : {}, Space : { Space : true }, Ctrl : { Ctrl : true }, Shift : { Shift : true }, Alt : { Alt : true } })) {
            for (const emptyStage of [ false, true ]) {
                pointer[btn + '+' + mn + (emptyStage ? '+empty' : '')] = km.Na__LeCfg__MatchPointerBinding({ button : btn, modifiers : held, emptyStage });
            }
        }
    }
    results.drawingTabs.pointer   = pointer;
    results.drawingTabs.wheel     = { none : km.Na__LeCfg__MatchWheelBinding({}), Ctrl : km.Na__LeCfg__MatchWheelBinding({ Ctrl : true }) };
    results.drawingTabs.selection = {
        none : km.Na__LeCfg__MatchSelectionModifier({}), Ctrl : km.Na__LeCfg__MatchSelectionModifier({ Ctrl : true }),
        Shift : km.Na__LeCfg__MatchSelectionModifier({ Shift : true }), CtrlShift : km.Na__LeCfg__MatchSelectionModifier({ Ctrl : true, Shift : true }),
        AltShift : km.Na__LeCfg__MatchSelectionModifier({ Alt : true, Shift : true })
    };
    results.drawingTabs.guards        = km.Na__LeCfg__GetGuards();
    results.drawingTabs.keyboardSetup = km.Na__LeCfg__GetKeyboardSetup();
    results.drawingTabs.touchSetup    = km.Na__LeCfg__GetTouchSetup();
    results.drawingTabs.measureKeys   = km.Na__LeCfg__GetMeasureKeys();
    results.drawingTabs.spaceBound    = km.Na__LeCfg__IsPointerModifierBound('Space');
    results.drawingTabs.actionCatalogueCount = km.Na__LeCfg__GetActionCatalogue().length;
}

// --- 3D tab: the global hotkey handler -----------------------------------------
{
    const hk = await mod('02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js');
    const fired = [];
    const cb = (name) => () => fired.push(name);
    const callbacks = {
        'ValeVision__NavMode__ResetView' : cb('ResetView'), 'ValeVision__NavMode__SetOrbitMode' : cb('SetOrbitMode'),
        'ValeVision__NavMode__SetWalkMode' : cb('SetWalkMode'), 'ValeVision__NavMode__SetFlyMode' : cb('SetFlyMode'),
        'ValeVision__PresentationMode__ToggleViewsPanel' : cb('ToggleViewsPanel'),
        'ValeVision__PresentationMode__NextScene' : cb('NextScene'), 'ValeVision__PresentationMode__PrevScene' : cb('PrevScene'),
        'ValeVision__App__NavigateBack' : cb('NavigateBack'), 'ValeVision__FogPlane__ToggleFogAndBarrier' : cb('ToggleFogAndBarrier')
    };
    for (let i = 1; i <= 9; i++) callbacks['ValeVision__PresentationMode__GoToScene' + i] = cb('GoToScene' + i);
    hk.Na__ValeVision__HotkeyHandler__Initialize(callbacks);
    await tick(100);
    const presses = [ [ 'r' ], [ 'R' ], [ 'b' ], [ 't' ], [ 'y' ], [ 'v' ], [ 'PageUp' ], [ 'PageDown' ],
                      [ '1' ], [ '2' ], [ '3' ], [ '4' ], [ '5' ], [ '6' ], [ '7' ], [ '8' ], [ '9' ],
                      [ 'Backspace', { altKey : true } ], [ 'F', { altKey : true, shiftKey : true } ],
                      [ 'd' ], [ 'o' ], [ 'Delete' ], [ 'Escape' ], [ 'x' ], [ 'r', { ctrlKey : true } ] ];
    const out = {};
    for (const [key, mods] of presses) {
        const before = fired.length;
        const warnBefore = warnings.length;
        const ev = Object.assign({ key, altKey : false, shiftKey : false, ctrlKey : false, defaultPrevented : false,
                                   preventDefault() { this.defaultPrevented = true; } }, mods || {});
        for (const fn of (listeners.keydown || [])) fn(ev);
        const tag = key + (mods ? '+' + Object.keys(mods).join('+') : '');
        out[tag] = { fired : fired.slice(before), prevented : ev.defaultPrevented,
                     warned : warnings.slice(warnBefore).some((w) => w.includes('No callback')) };
    }
    results.threeD.presses = out;
    results.threeD.keydownListeners = (listeners.keydown || []).length;
    hk.Na__ValeVision__HotkeyHandler__Destroy();
}

// --- help panel: the Keyboard Shortcuts rows ----------------------------------
{
    const hp = await mod('02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js');
    hp.Na__UiFeature__InitializeNavigationHelpPanel({ isTouchDevice : false, walkEnabled : true, flyEnabled : true });
    await tick(100);
    const rows = (id) => (elements[id] ? elements[id].children.map((row) => row.children.map((c) => c.textContent).join(' | ')) : []);
    results.helpPanel.standardRows = rows('naNavHelpHotkeysList');
    results.helpPanel.advancedRows = rows('naNavHelpAdvancedHotkeysList');
    results.helpPanel.advancedShown = elements.naNavHelpAdvancedHotkeysSection ? elements.naNavHelpAdvancedHotkeysSection.style.display === '' : null;
}

console.warn = origWarn;
const outFile = path.join(HERE, 'results_' + label + '.json');
writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log('fetched       :', fetched.map((f) => f.request + (f.found ? '' : ' (MISSING)')).join(', '));
console.log('drawing tabs  : key file loaded =', results.drawingTabs.keyFileLoaded, '| V M T D L R Delete Escape arrows ->',
    [ 'V', 'M', 'T', 'D', 'L', 'R', 'Delete', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown' ].map((k) => k + '=' + results.drawingTabs.named[k]).join(' '));
console.log('3D tab        :', [ 'r', 'b', 't', 'y', 'v', 'PageUp', 'PageDown', '1', '5', '9' ].map((k) => k + '=' + (results.threeD.presses[k].fired.join('/') || '-')).join(' '));
console.log('help panel    :', results.helpPanel.standardRows.length, 'standard rows,', results.helpPanel.advancedRows.length, 'advanced rows; keys:',
    results.helpPanel.standardRows.concat(results.helpPanel.advancedRows).map((r) => r.split(' | ')[0]).join(', '));
console.log('wrote', outFile);
