// =============================================================================
// W1-29 scratch harness - the 3D hotkey handler, every key x focus x key scope, from the REAL modules
// =============================================================================
//
// Usage:  node verify_w1_29.mjs <label> <handler file>
//         writes sweep_<label>.json beside this file; nothing else is written.
//
// - Imports the handler file given (the live one, or the saved pre-image) and the LIVE
//   Na__AppUtils__KeyScope__.js by the very URL the live handler's relative import resolves to, so for the live
//   handler the scope this harness follows IS the handler's scope (one module instance, as in the app). The
//   pre-image imports nothing, so following a scope cannot reach it.
// - Shims fetch (the dictionary read from the live tree), window (keydown listeners) and document.activeElement.
// - Initialises the handler with the callbacks index.html registers (same action names), then presses every key
//   of the dictionary and a few others, under five scope states x seven focus targets, recording which callback
//   fired, whether the key was taken (preventDefault) and whether a "No callback" warning was logged.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const VV      = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const HERE    = path.dirname(fileURLToPath(import.meta.url));
const label   = process.argv[2] || 'run';
const handler = path.resolve(process.argv[3] || path.join(VV, '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js'));

const fetched = [];
globalThis.fetch = async (input) => {
    const s = String(input);
    const filePath = path.join(VV, s.split('?')[0]);
    let text = null;
    try { text = readFileSync(filePath, 'utf8'); } catch (e) { text = null; }
    fetched.push({ request : s, found : text !== null });
    if (text === null) return { ok : false, status : 404, json : async () => { throw new Error('404'); } };
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};
const listeners = {};
globalThis.window = {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    history : { back() {} }
};
globalThis.document = { activeElement : null };
const warnings = [];
console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

const Scope = await import(pathToFileURL(path.join(VV, '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js')).href);
const hk    = await import(pathToFileURL(handler).href);

let live = 'model', throws = false;
const scopeStates = {
    'no reader (before the editor loads)' : null,
    'model'    : () => { live = 'model'; },
    'sheet'    : () => { live = 'sheet'; },
    'document' : () => { live = 'document'; },
    'reader throws' : () => { throws = true; }
};
const focusTargets = {
    'nothing'          : null,
    'body'             : { tagName : 'BODY',     isContentEditable : false },
    'contenteditable'  : { tagName : 'DIV',      isContentEditable : true  },
    'input text'       : { tagName : 'INPUT',    isContentEditable : false, type : 'text' },
    'input checkbox'   : { tagName : 'INPUT',    isContentEditable : false, type : 'checkbox' },
    'textarea'         : { tagName : 'TEXTAREA', isContentEditable : false },
    'select'           : { tagName : 'SELECT',   isContentEditable : false },
    'button'           : { tagName : 'BUTTON',   isContentEditable : false }
};
const presses = [ [ 'r' ], [ 'R' ], [ 'b' ], [ 't' ], [ 'T' ], [ 'y' ], [ 'v' ], [ 'PageUp' ], [ 'PageDown' ],
                  [ '1' ], [ '2' ], [ '3' ], [ '4' ], [ '5' ], [ '6' ], [ '7' ], [ '8' ], [ '9' ], [ '0' ],
                  [ 'Backspace', { altKey : true } ], [ 'Backspace' ], [ 'F', { altKey : true, shiftKey : true } ], [ 'f' ],
                  [ 'd' ], [ 'D' ], [ 'o' ], [ 'Delete' ], [ 'Escape' ], [ 'ArrowUp' ], [ 'Alt', { altKey : true } ],
                  [ 'Shift', { shiftKey : true } ], [ 'z', { ctrlKey : true } ], [ 'x' ], [ 'r', { ctrlKey : true } ],
                  [ 'R', { shiftKey : true } ], [ ' ' ], [ 'Enter' ] ];

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

const out = {};
let followed = false;
for (const [scopeName, set] of Object.entries(scopeStates)) {
    if (set && !followed) { Scope.Na__KeyScope__Follow(() => { if (throws) throw new Error('planted'); return live; }); followed = true; }
    throws = false;
    if (set) set();
    out[scopeName] = { scopeReads : Scope.Na__KeyScope__Get(), presses : {} };
    for (const [focusName, focus] of Object.entries(focusTargets)) {
        document.activeElement = focus;
        for (const [key, mods] of presses) {
            const before = fired.length, warnBefore = warnings.length;
            const ev = Object.assign({ key, altKey : false, shiftKey : false, ctrlKey : false, metaKey : false, defaultPrevented : false,
                                       preventDefault() { this.defaultPrevented = true; } }, mods || {});
            for (const fn of (listeners.keydown || [])) fn(ev);
            const tag = focusName + ' | ' + key + (mods ? '+' + Object.keys(mods).join('+') : '');
            out[scopeName].presses[tag] = { fired : fired.slice(before), prevented : ev.defaultPrevented,
                                            warned : warnings.slice(warnBefore).some((w) => w.includes('No callback')) };
        }
    }
}
const result = { label, handler, fetched, keydownListeners : (listeners.keydown || []).length, sweep : out };
const file = path.join(HERE, 'sweep_' + label + '.json');
writeFileSync(file, JSON.stringify(result, null, 1));
let n = 0, firedN = 0, prevN = 0, warnN = 0;
for (const s of Object.values(out)) for (const p of Object.values(s.presses)) { n++; if (p.fired.length) firedN++; if (p.prevented) prevN++; if (p.warned) warnN++; }
console.log(label + ': ' + n + ' presses; fired ' + firedN + ', taken ' + prevN + ', "No callback" warnings ' + warnN + '; listeners ' + result.keydownListeners + '; dictionary ' + fetched.map((f) => f.request + (f.found ? '' : ' MISSING')).join(', '));
console.log('wrote ' + file);
