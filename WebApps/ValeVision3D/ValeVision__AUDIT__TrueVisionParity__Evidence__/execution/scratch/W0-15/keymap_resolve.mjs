// W0-15 scratch harness: resolve every drawing-tab key press through a KeyMap
// unit, once with a key file handed in and once with the built-in fallback.
//
// Usage: node keymap_resolve.mjs <KeyMap module path> <key file path> <out.json>
//
// The module is loaded with its one import (Readers' PREFIX) replaced by a
// stub constant, exactly as TrueVision's Na__Test__DrawingTabKeys__ loads it.
// Writes nothing outside <out.json> and the OS temp folder.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const [ , , modulePath, keyFilePath, outPath ] = process.argv;
if (!modulePath || !keyFilePath || !outPath) { console.error('usage: node keymap_resolve.mjs <module> <keyfile> <out.json>'); process.exit(2); }

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let src = readFileSync(modulePath, 'utf8').replace(/\r\n/g, '\n');
src = src.replace(IMPORT, '');
if (/^\s*import\s/m.test(src)) { console.error('an import survived'); process.exit(1); }
const tmp = join(tmpdir(), 'W0-15__keymap_resolve__' + Math.random().toString(36).slice(2) + '.mjs');
writeFileSync(tmp, "const Na__LeCfg__PREFIX = 'LayoutEditor__';\n" + src, 'utf8');
const KeyMap = await import(pathToFileURL(tmp).href);

const raw = readFileSync(keyFilePath, 'utf8').replace(/^﻿/, '');
const FILE = JSON.parse(raw);

const MODS = [ 'Ctrl', 'Shift', 'Alt', 'Meta', 'Space' ];
const held = (names) => { const h = {}; MODS.forEach((n) => { h[n] = names.indexOf(n) !== -1; }); return h; };
const COMBOS = [ [], [ 'Shift' ], [ 'Ctrl' ], [ 'Ctrl', 'Shift' ], [ 'Alt' ], [ 'Alt', 'Shift' ], [ 'Ctrl', 'Alt' ], [ 'Meta' ], [ 'Space' ] ];

// Every key named in the file's keyboard list, plus every printable key and
// the named keys a keyboard sends, so a key no list names is resolved too.
const keys = new Set();
const kbList = ((FILE.LayoutEditor__KeyboardBindings__Config || {}).LayoutEditor__KeyboardBindings__List) || [];
kbList.forEach((b) => (b.Keys || []).forEach((k) => keys.add(k)));
'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-+=*/x[];#\'`'.split('').forEach((k) => keys.add(k));
[ 'Enter', 'Escape', 'Delete', 'Backspace', 'Tab', 'PageUp', 'PageDown', 'Home', 'End', 'Insert',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Control', 'Shift', 'Alt', 'Meta' ].forEach((k) => keys.add(k));
const KEYS = Array.from(keys).sort();

function resolveAll() {
    const out = {};
    KEYS.forEach((k) => COMBOS.forEach((c) => {
        const m = KeyMap.Na__LeCfg__MatchKeyBinding(k, held(c));
        out[JSON.stringify(k) + '[' + c.join('+') + ']'] = m ? (m.action + (m.coarse ? '+coarse' : '')) : '-';
    }));
    // each binding's own modifiers too
    kbList.forEach((b) => (b.Keys || []).forEach((k) => {
        const c = b.Modifiers || [];
        const m = KeyMap.Na__LeCfg__MatchKeyBinding(k, held(c));
        out[JSON.stringify(k) + '[' + c.join('+') + ']'] = m ? (m.action + (m.coarse ? '+coarse' : '')) : '-';
    }));
    return out;
}
function resolveRest() {
    const buttons = [ 'Left', 'Middle', 'Right' ];
    const pointer = [];
    buttons.forEach((button) => COMBOS.forEach((c) => [ true, false ].forEach((emptyStage) => pointer.push(button + '[' + c.join('+') + ']' + (emptyStage ? 'E' : '') + '=' + KeyMap.Na__LeCfg__MatchPointerBinding({ button, modifiers : held(c), emptyStage })))));
    const sel = {};
    COMBOS.concat([ [ 'Alt', 'Shift' ], [ 'Ctrl', 'Shift', 'Alt' ] ]).forEach((c) => { sel[c.join('+')] = KeyMap.Na__LeCfg__MatchSelectionModifier(held(c)); });
    return {
        pointer,
        wheel     : COMBOS.map((c) => KeyMap.Na__LeCfg__MatchWheelBinding(held(c))),
        selection : sel,
        guards    : KeyMap.Na__LeCfg__GetGuards(),
        keyboard  : KeyMap.Na__LeCfg__GetKeyboardSetup(),
        touch     : KeyMap.Na__LeCfg__GetTouchSetup(),
        measure   : KeyMap.Na__LeCfg__GetMeasureKeys(),
        spaceBound: KeyMap.Na__LeCfg__IsPointerModifierBound('Space'),
        catalogue : KeyMap.Na__LeCfg__GetActionCatalogue().length,
        exports   : Object.keys(KeyMap).sort()
    };
}

KeyMap.Na__LeCfg__SetKeyMap(FILE);
const fileKeys = resolveAll(), fileRest = resolveRest();
KeyMap.Na__LeCfg__SetKeyMap(null);
const fbKeys = resolveAll(), fbRest = resolveRest();

writeFileSync(outPath, JSON.stringify({ module : modulePath, keyFile : keyFilePath, presses : Object.keys(fileKeys).length, file : { keys : fileKeys, rest : fileRest }, fallback : { keys : fbKeys, rest : fbRest } }, null, 1), 'utf8');
console.log('presses', Object.keys(fileKeys).length, '->', outPath);
