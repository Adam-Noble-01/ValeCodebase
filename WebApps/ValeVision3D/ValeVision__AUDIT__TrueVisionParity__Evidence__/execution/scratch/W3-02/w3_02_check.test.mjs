// W3-02 scratch check: the six Sheet Images editing modules are TrueVision's text at b2aa9151 plus only the
// listed seams, they load in Node with their whole import closure, their exports are TrueVision's, and
// nothing outside the set imports them (inert).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
register('../W3-01/importmap_hooks.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '../../../..');
const SRC  = resolve(VV, '02__Src__AppModules');
const IMG  = resolve(SRC, '51__System__LayoutEditor/54__Feature__SheetImages');
const SET  = [ 'Na__LayoutEditor__SheetImages__Crop__.js', 'Na__LayoutEditor__SheetImages__Menu__.js',
               'Na__LayoutEditor__SheetImages__Insert__.js', 'Na__LayoutEditor__SheetImages__Handles__.js',
               'Na__LayoutEditor__Panel__SheetImages__.js', 'Na__LayoutEditor__SheetImages__.js' ];

let pass = 0, fail = 0;
const check = (ok, label) => { if (ok) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } };

// ---- 1. text: TV + seams only ----
for (const name of SET) {
    const live = readFileSync(resolve(IMG, name), 'utf8');
    const tv   = readFileSync(resolve(HERE, 'tv', name), 'utf8');
    check(live.indexOf('\r') === -1, name + ': LF as git show returns it');
    const undone = live
        .replace(/\/\/ PORT NOTE:\n[\s\S]*?\/\/ - Back-port     : none\.\n\/\/\n\/\/ -{77}\n\/\/\n/, '')
        .replace('// VALEVISION3D - ', '// TRUEVISION3D - ')
        .split("'[ValeVision3D LayoutEditor] ").join("'[TrueVision3D LayoutEditor] ");
    check(undone === tv, name + ': equals TrueVision b2aa9151 once the banner, console prefixes and PORT NOTE are undone');
    check(/\{\{VVREL:W3-02\}\}/.test(live), name + ': release placeholder for the scribe');
    const body = live.replace(/\/\/ PORT NOTE:\n[\s\S]*?\/\/ - Back-port[^\n]*\n/, '');
    check(!/TrueVision3D|TRUEVISION3D|NaProjectPortal|noble-architecture\.com|\/api\/truevision|\/r2\//.test(body),
          name + ': no TrueVision token, NA marker, TV route or R2 route outside the PORT NOTE');
}

// ---- 2. inert: nothing outside the set imports any of the six ----
const walk = (dir, out = []) => { for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(m?js|html)$/.test(e)) out.push(p); } return out; };
const importers = [];
for (const file of walk(SRC).concat([ resolve(VV, 'index.html') ])) {
    if (SET.some((n) => file.endsWith(n))) continue;
    const text = readFileSync(file, 'utf8');
    for (const name of SET) if (new RegExp("['\"/]" + name.replace(/[.]/g, '\\.') + "['\"]").test(text)) importers.push(relative(VV, file) + ' -> ' + name);
}
check(importers.length === 0, 'no module outside the set imports it (inert until W3-03 / W3-09)' + (importers.length ? ': ' + importers.join('; ') : ''));

// ---- 3. load in Node with stand-ins ----
class Ev { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
const elStub = () => ({ style : {}, classList : { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, appendChild(c){ return c; }, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; }, getBoundingClientRect(){ return { left:0, top:0, width:0, height:0, right:0, bottom:0 }; }, children : [], childNodes : [], textContent : '', innerHTML : '', dataset : {} });
globalThis.CustomEvent = globalThis.CustomEvent || Ev;
const listeners = [];
globalThis.window = { dispatchEvent : () => true, addEventListener : (t) => listeners.push(t), removeEventListener(){}, localStorage : { getItem : () => null, setItem(){}, removeItem(){} }, location : { hostname : 'localhost', search : '', href : 'http://localhost/', origin : 'http://localhost' }, setTimeout, clearTimeout, requestAnimationFrame : (f) => setTimeout(f, 0), devicePixelRatio : 1, innerWidth : 1200, innerHeight : 800, getComputedStyle : () => ({ getPropertyValue : () => '' }) };
globalThis.document = { createElement : elStub, createElementNS : elStub, getElementById : () => null, querySelector : () => null, querySelectorAll : () => [], addEventListener(){}, removeEventListener(){}, body : elStub(), head : elStub(), documentElement : elStub(), fonts : { ready : Promise.resolve() } };
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;

const exportNames = (text) => { const m = text.match(/export\s*\{([\s\S]*?)\}/); return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean).sort() : []; };
const mods = {};
for (const name of SET) {
    try {
        mods[name] = await import(pathToFileURL(resolve(IMG, name)).href);
        const expected = exportNames(readFileSync(resolve(HERE, 'tv', name), 'utf8'));
        const actual   = Object.keys(mods[name]).sort();
        check(JSON.stringify(expected) === JSON.stringify(actual), name + ': evaluates in Node; exports = TrueVision\'s (' + actual.join(', ') + ')');
    } catch (err) {
        check(false, name + ': evaluates in Node - ' + (err && err.message));
    }
}

// ---- 4. loading wired nothing up ----
check(listeners.length === 0 || !listeners.some((t) => /image/i.test(String(t))), 'importing the set registers no Sheet Images window listener (Initialize is W3-09\'s)');
const core = mods['Na__LayoutEditor__SheetImages__.js'];
if (core) {
    check(core.Na__LeImg__Is({ Shape__Id : 'v1', Shape__Points : [] }) === false, 'Na__LeImg__Is: a plain vector is not a picture');
    check(core.Na__LeImg__AttachInput() === false, 'Na__LeImg__AttachInput refuses before Initialize (not editable)');
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
