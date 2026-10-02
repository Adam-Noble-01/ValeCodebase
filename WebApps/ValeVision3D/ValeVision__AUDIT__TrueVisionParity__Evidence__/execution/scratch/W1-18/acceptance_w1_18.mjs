// W1-18 scratch harness: the package's acceptance, proved in Node against ValeVision's own modules.
//
//   node acceptance_w1_18.mjs [--new <folder>]
//
// OLD = the pre-port VV copies saved in vv_before/ (GradientTool 1.0.0, LineStyleTool 1.0.0).
// NEW = the ported files: by default the LIVE VV 35__System__DrawingTools folder; --new points at a rehearsal folder.
// Each module is evaluated from a temporary .mjs copy with its imports answered by ValeVision's REAL units: the panel
// host's own Row / Input / Select (its four imports stubbed - the row builders never reach them) and the ShapeRings
// leaf W1-13 landed. jsPDF is ValeVision's vendored 4.1.0, run for real; the strip image is a real PNG.
//
// 1. Both modules evaluate and export exactly TrueVision's names at the pin.
// 2. LineStyleTool: the Vectors panel's Dashed edges rows are unchanged with no options (prefix defaults to 'shape'):
//    the same DOM from BuildRows, the same refreshes, the same control registrations and the same host writes, before
//    and after the config loads; the record functions answer as 1.0.0 did. And the new options work: prefix 'dim'
//    builds dim-* controls only, so the Dimensions panel's rows never duplicate the Vectors panel's.
// 3. GradientTool: a gradient on a shape without holes prints with the same PDF clip as before - the same jsPDF calls,
//    the same page content and the same PDF bytes, whether holes is left out, undefined, null or []; the clip is W n,
//    never W*. A holed shape (new) traces every ring and clips even-odd (W* n). Everything else answers as 1.0.0 did.
// 4. The two config JSONs are byte-identical to the pre-port snapshot.
// Writes only into the OS temp folder.

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const HERE    = dirname(fileURLToPath(import.meta.url));
const VV      = resolve(HERE, '..', '..', '..', '..');
const SRC     = join(VV, '02__Src__AppModules');
const LE      = '51__System__LayoutEditor/';
const DT      = join(SRC, LE + '35__System__DrawingTools');
const argNew  = process.argv.indexOf('--new');
const NEW_DIR = argNew > 0 ? resolve(process.argv[argNew + 1]) : DT;
const OLD_DIR = join(HERE, 'vv_before');
const NAWEB   = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const TVLE35  = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/';
const TMP     = mkdtempSync(join(tmpdir(), 'W1-18-accept-'));
writeFileSync(join(TMP, 'package.json'), '{ "type" : "module" }');

let failures = 0, passes = 0;
function check(name, passed, detail) {
    if (passed) passes++; else failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '\n          -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : ''));
}
const sha = (data) => createHash('sha256').update(data).digest('hex');
function firstDiff(a, b) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
        const x = JSON.stringify(a[i]), y = JSON.stringify(b[i]);
        if (x !== y) return { first : i, old : String(x).slice(0, 400), new : String(y).slice(0, 400) };
    }
    return { first : -1 };
}


// -----------------------------------------------------------------------------
// A minimal DOM: just what the panel row builders, the panel host and the strip painter touch
// -----------------------------------------------------------------------------

class FakeClassList {
    constructor(el) { this.el = el; }
    list() { return String(this.el.className || '').split(/\s+/).filter(Boolean); }
    add(...names) { const s = this.list(); names.forEach((n) => { if (s.indexOf(n) === -1) s.push(n); }); this.el.className = s.join(' '); }
    remove(...names) { this.el.className = this.list().filter((n) => names.indexOf(n) === -1).join(' '); }
    toggle(name, force) { const has = this.list().indexOf(name) !== -1; const want = force === undefined ? !has : !!force; if (want && !has) this.add(name); if (!want && has) this.remove(name); return want; }
    contains(name) { return this.list().indexOf(name) !== -1; }
}

function parseSelector(sel) {
    return String(sel).trim().split(/\s+(?![^\[]*\])/).map((compound) => {
        const parts = [];
        const rx = /\[([\w-]+)(?:="([^"]*)")?\]|\.([\w-]+)|^([a-zA-Z][\w-]*)/g;
        let m;
        while ((m = rx.exec(compound)) !== null) {
            if (m[1] !== undefined) parts.push({ attr : m[1], value : m[2] });
            else if (m[3] !== undefined) parts.push({ cls : m[3] });
            else if (m[4] !== undefined) parts.push({ tag : m[4].toUpperCase() });
        }
        return parts;
    });
}
function matchCompound(el, parts) {
    return parts.every((p) => {
        if (p.tag) return el.tagName === p.tag;
        if (p.cls) return el.classList.contains(p.cls);
        if (!el.hasAttribute(p.attr)) return false;
        return p.value === undefined || el.getAttribute(p.attr) === p.value;
    });
}
function matches(el, compounds) {
    if (!matchCompound(el, compounds[compounds.length - 1])) return false;
    let k = compounds.length - 2;
    let n = el.parentNode;
    while (k >= 0 && n) { if (matchCompound(n, compounds[k])) k--; n = n.parentNode; }
    return k < 0;
}

class FakeElement {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.attrs = new Map();
        this.className = '';
        this.ownText = '';
        this.html = '';
        this.style = {};
        this.hidden = false;
        this.title = '';
        this.classList = new FakeClassList(this);
    }
    get textContent() { return this.ownText + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.ownText = String(v); this.html = ''; this.children.forEach((c) => { c.parentNode = null; }); this.children = []; }
    get innerHTML() { return this.html; }
    set innerHTML(v) { this.html = String(v); this.ownText = ''; this.children.forEach((c) => { c.parentNode = null; }); this.children = []; }
    setAttribute(k, v) { this.attrs.set(String(k), String(v)); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    hasAttribute(k) { return this.attrs.has(k); }
    removeAttribute(k) { this.attrs.delete(k); }
    appendChild(child) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.children.push(child); return child; }
    removeChild(child) { const i = this.children.indexOf(child); if (i !== -1) this.children.splice(i, 1); child.parentNode = null; return child; }
    querySelectorAll(sel) {
        const compounds = parseSelector(sel);
        const out = [];
        const walk = (node) => node.children.forEach((c) => { if (matches(c, compounds)) out.push(c); walk(c); });
        walk(this);
        return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    closest(sel) { const compounds = parseSelector(sel); let n = this; while (n) { if (matches(n, compounds)) return n; n = n.parentNode; } return null; }
}

// A canvas whose toDataURL is a REAL PNG (8-bit RGBA, filter 0), so jsPDF's PNG path runs as in the browser
let crcTable = null;
function crc32(buf) {
    if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
    if (!crcTable) { crcTable = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; } }
    let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([ Buffer.from(type, 'ascii'), data ]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([ len, body, crc ]);
}
function encodePng(width, height, rgba) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + (y * stride), stride).copy(raw, (y * (stride + 1)) + 1); }
    return Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0)) ]);
}
class FakeCanvas extends FakeElement {
    constructor() { super('canvas'); this.width = 300; this.height = 150; this.image = null; }
    getContext(kind) {
        if (kind !== '2d') return null;
        const canvas = this;
        return {
            createImageData : (w, h) => ({ width : w, height : h, data : new Uint8ClampedArray(w * h * 4) }),
            putImageData    : (img) => { canvas.image = img; }
        };
    }
    toDataURL(type) {
        if (type !== 'image/png') throw new Error('only PNG is used');
        const data = this.image ? this.image.data : new Uint8ClampedArray(this.width * this.height * 4);
        return 'data:image/png;base64,' + encodePng(this.width, this.height, data).toString('base64');
    }
}
globalThis.document = {
    activeElement : null,
    createElement : (tag) => (String(tag).toLowerCase() === 'canvas' ? new FakeCanvas() : new FakeElement(tag))
};

function snap(el) {
    const out = { tag : el.tagName, cls : el.className, attrs : [ ...el.attrs.entries() ].sort(), title : el.title, hidden : el.hidden, text : el.ownText, html : el.html, style : el.style };
    [ 'type', 'value', 'checked', 'disabled', 'min', 'max', 'step' ].forEach((k) => { if (el[k] !== undefined) out[k] = el[k]; });
    out.kids = el.children.map(snap);
    return JSON.stringify(out);
}
const controlsIn = (body) => body.querySelectorAll('[data-na-control]').map((e) => e.getAttribute('data-na-control'));


// -----------------------------------------------------------------------------
// Module loading: imports stripped and answered from a stub table (the W1-13 harness method)
// -----------------------------------------------------------------------------

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function load(path, stubs, tag) {
    let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') throw new Error('non-named import in ' + path);
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + path);
    const key = '__W118Stubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const unanswered = names.filter((n) => !Object.prototype.hasOwnProperty.call(globalThis[key], n));
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(TMP, tag + '__' + loadCount + '__' + basename(path).replace(/\.js$/, '.mjs'));
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return { mod : await import(pathToFileURL(tmp).href), imported : names, unanswered };
}
function tvExports(name) {
    const text = execFileSync('git', [ '-C', NAWEB, 'show', 'b2aa9151:' + TVLE35 + name ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
    return text.match(/export\s*\{([\s\S]*?)\};/)[1].split(',').map((s) => s.trim()).filter(Boolean).sort();
}

// fetch answers the two config files from the LIVE folder (what the editor fetches), by name
const fetched = [];
globalThis.fetch = async (url) => {
    const name = basename(fileURLToPath(String(url)));
    fetched.push(name);
    const file = join(DT, name);
    if (!existsSync(file)) return { ok : false, status : 404 };
    return { ok : true, status : 200, json : async () => JSON.parse(readFileSync(file, 'utf8')) };
};

// The panel host's own row builders (its four imports are never reached by Row / Input / Select)
const HOST = (await load(join(SRC, LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'), {}, 'host')).mod;
const RINGS = (await load(join(SRC, LE + '15__Core__Markup/Na__LayoutEditor__ShapeRings__.js'), {}, 'rings')).mod;

function recorder() {
    const list = [];
    return { list, OnControl : (type, name, handler) => list.push({ type, name, handler }) };
}
async function loadTool(dir, name, tag, rec) {
    return load(join(dir, name), {
        Na__LePanels__OnControl : rec.OnControl,
        Na__LePanels__Row       : HOST.Na__LePanels__Row,
        Na__LePanels__Input     : HOST.Na__LePanels__Input,
        Na__LePanels__Select    : HOST.Na__LePanels__Select,
        Na__LeRings__Spans      : RINGS.Na__LeRings__Spans
    }, tag);
}

const GNAME = 'Na__LayoutEditor__GradientTool__.js';
const DNAME = 'Na__LayoutEditor__LineStyleTool__.js';
const recOldG = recorder(), recNewG = recorder(), recOldD = recorder(), recNewD = recorder();
const LOADED = {
    oldG : await loadTool(OLD_DIR, GNAME, 'oldG', recOldG),
    newG : await loadTool(NEW_DIR, GNAME, 'newG', recNewG),
    oldD : await loadTool(OLD_DIR, DNAME, 'oldD', recOldD),
    newD : await loadTool(NEW_DIR, DNAME, 'newD', recNewD)
};
const OG = LOADED.oldG.mod, NG = LOADED.newG.mod, OD = LOADED.oldD.mod, ND = LOADED.newD.mod;
const require = createRequire(import.meta.url);
const { jsPDF } = require(join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js'));

console.log('ValeVision3D - W1-18 acceptance: GradientTool 1.1.0 and LineStyleTool 1.1.0');
console.log('  OLD = ' + OLD_DIR);
console.log('  NEW = ' + NEW_DIR);
console.log('  jsPDF ' + jsPDF.version + ' (vendored), Node ' + process.version);

// Every section runs inside one guard: a defect that throws is a FAIL with its stack, and the summary still prints
async function runAll() {


// -----------------------------------------------------------------------------
// 1. Load and exports
// -----------------------------------------------------------------------------

console.log('\n1. The modules evaluate and export TrueVision\'s names');
for (const [ key, name ] of [ [ 'newG', GNAME ], [ 'newD', DNAME ] ]) {
    const loaded = LOADED[key];
    const want = tvExports(name);
    const got = Object.keys(loaded.mod).sort();
    check(name + ' (new) evaluates; imports ' + loaded.imported.join(', ') + ' answered by ValeVision\'s real units; exports = TrueVision\'s ' + want.length,
          JSON.stringify(got) === JSON.stringify(want) && loaded.unanswered.length === 0, { got, want, unanswered : loaded.unanswered });
}
check('GradientTool: the export list is unchanged from 1.0.0', JSON.stringify(Object.keys(OG).sort()) === JSON.stringify(Object.keys(NG).sort()));
check('LineStyleTool: the export list is unchanged from 1.0.0', JSON.stringify(Object.keys(OD).sort()) === JSON.stringify(Object.keys(ND).sort()));
check('GradientTool 1.1.0 imports ShapeRings (a leaf with no imports) and nothing new besides', JSON.stringify(LOADED.newG.imported.slice().sort()) === JSON.stringify(LOADED.oldG.imported.concat([ 'Na__LeRings__Spans' ]).sort()), LOADED.newG.imported);
check('LineStyleTool 1.1.0 imports exactly what 1.0.0 did', JSON.stringify(LOADED.newD.imported) === JSON.stringify(LOADED.oldD.imported), LOADED.newD.imported);


// -----------------------------------------------------------------------------
// Shared: the rows of a panel, driven the way Panel__Shapes drives them
// -----------------------------------------------------------------------------

const DASH_STYLES = [
    null,
    { LineStyle__Kind : 'dashed' },
    { LineStyle__Kind : 'dotted', LineStyle__Scale : 2 },
    { LineStyle__Kind : 'centre', LineStyle__Scale : 0.5, LineStyle__DashMm : 6, LineStyle__GapMm : 1, LineStyle__MarkMm : 1.5 },
    { LineStyle__Kind : 'hidden', LineStyle__Scale : 9 },
    { LineStyle__Kind : 'nonsense', LineStyle__DashMm : -4, LineStyle__GapMm : 'x', LineStyle__MarkMm : 99 },
    'not a record'
];
const DASH_STATES = [];
DASH_STYLES.forEach((style) => [ true, false, undefined ].forEach((stroked) => [ true, false ].forEach((on) => DASH_STATES.push({ stroked, on, style }))));
DASH_STATES.push(undefined, {});

const GRADS = [
    null,
    {},
    { Gradient__StartColour : '#ff0000', Gradient__StartOpacity : 1, Gradient__EndColour : '#0000ff', Gradient__EndOpacity : 1, Gradient__BlendPct : 50, Gradient__AngleDeg : 0 },
    { Gradient__StartColour : '#ffffff', Gradient__StartOpacity : 0, Gradient__EndColour : '#ffffff', Gradient__EndOpacity : 1, Gradient__BlendPct : 20, Gradient__AngleDeg : 90 },
    { Gradient__StartColour : '#123456', Gradient__StartOpacity : 1, Gradient__EndColour : '#abcdef', Gradient__EndOpacity : 0, Gradient__BlendPct : 85, Gradient__AngleDeg : 213.4 },
    { Gradient__StartColour : '#00ff00', Gradient__StartOpacity : 0.4, Gradient__EndColour : '#ff00ff', Gradient__EndOpacity : 0.7, Gradient__BlendPct : 0, Gradient__AngleDeg : 360 },
    { Gradient__StartColour : 'bad', Gradient__StartOpacity : 0, Gradient__EndColour : '#000000', Gradient__EndOpacity : 0, Gradient__BlendPct : 100, Gradient__AngleDeg : -45 },
    { Gradient__AngleDeg : 725, Gradient__BlendPct : 33.33 }
];
const GRAD_STATES = [];
GRADS.forEach((gradient) => [ true, false, undefined ].forEach((canFill) => [ true, false ].forEach((on) => GRAD_STATES.push({ canFill, on, gradient }))));
GRAD_STATES.push(undefined, {});

function testValues(el) {
    const type = el.type;
    if (el.tagName === 'SELECT') return [ { value : 'centre' }, { value : 'dotted' }, { value : 'hidden' }, { value : 'dashed' } ];
    if (type === 'checkbox') return [ { checked : true }, { checked : false } ];
    if (type === 'color') return [ { value : '#336699' }, { value : '#ffffff' } ];
    return [ { value : '2.5' }, { value : '75' }, { value : '-3' }, { value : '0.04' }, { value : 'abc' }, { value : '400' } ];
}

// Drive every registered control through its test values; log what the host is told and the block after each.
function drive(rec, body, readState, kindOfHost) {
    const log = [];
    const host = kindOfHost === 'dash'
        ? { read : () => readState(), toggle : (on, style) => log.push([ 'toggle', on, style ]), write : (style, live) => log.push([ 'write', style, live ]) }
        : { read : () => readState(), toggle : (on, gradient) => log.push([ 'toggle', on, gradient ]), write : (gradient, live) => log.push([ 'write', gradient, live ]) };
    return { host, log, run : () => {
        rec.list.forEach((reg) => {
            const el = body.querySelector('[data-na-control="' + reg.name + '"]');
            if (!el) { log.push([ 'missing control', reg.type, reg.name ]); return; }
            testValues(el).forEach((v) => {
                Object.assign(el, v);
                reg.handler({ type : reg.type, target : el }, el);
                log.push([ 'after', reg.type, reg.name, JSON.stringify(v), snap(body) ]);
            });
        });
    } };
}


// -----------------------------------------------------------------------------
// 2. LineStyleTool: the Vectors panel's Dashed edges rows are unchanged; the options work
// -----------------------------------------------------------------------------

console.log('\n2. LineStyleTool - the Vectors panel\'s Dashed edges rows (no options: prefix defaults to "shape")');
const SHAPE_CONTROLS = [ 'shape-dash', 'shape-dash-kind', 'shape-dash-scale', 'shape-dash-dash', 'shape-dash-gap', 'shape-dash-mark' ];
async function dashRowsPhase(phase) {
    const bodyOld = document.createElement('div'), bodyNew = document.createElement('div');
    OD.Na__LeDash__BuildRows(bodyOld);
    ND.Na__LeDash__BuildRows(bodyNew);
    check(phase + ': BuildRows(body) builds the same rows as 1.0.0 (' + bodyNew.querySelectorAll('[data-na-control]').length + ' controls, every label, title, range and option)', snap(bodyOld) === snap(bodyNew), { old : snap(bodyOld).slice(0, 600), new : snap(bodyNew).slice(0, 600) });
    check(phase + ': the controls are named shape-dash, shape-dash-kind, -scale, -dash, -gap, -mark', JSON.stringify(controlsIn(bodyNew)) === JSON.stringify(SHAPE_CONTROLS), controlsIn(bodyNew));
    const toggleRow = bodyNew.querySelector('[data-na-control="shape-dash"]').parentNode;
    check(phase + ': the toggle row reads "' + toggleRow.children[0].textContent + '" with 1.0.0\'s title', toggleRow.children[0].textContent === bodyOld.querySelector('[data-na-control="shape-dash"]').parentNode.children[0].textContent && toggleRow.title === bodyOld.querySelector('[data-na-control="shape-dash"]').parentNode.title);
    let same = 0;
    const differ = [];
    DASH_STATES.forEach((state, i) => {
        OD.Na__LeDash__RefreshRows(bodyOld, state);
        ND.Na__LeDash__RefreshRows(bodyNew, state);
        if (snap(bodyOld) === snap(bodyNew)) same++; else differ.push(i);
    });
    check(phase + ': RefreshRows(body, state) shows the same rows as 1.0.0 for ' + DASH_STATES.length + ' states (stroked, on, every kind, junk)', same === DASH_STATES.length, differ);
    return { bodyOld, bodyNew };
}
const dashBefore = await dashRowsPhase('before the config loads');
await Promise.all([ OD.Na__LeDash__Ready(), ND.Na__LeDash__Ready() ]);
check('Ready() reads the line style config in both copies', fetched.filter((f) => f === 'Na__LayoutEditor__LineStyleTool__Config__.json').length === 2, fetched);
const dashAfter = await dashRowsPhase('after the config loads');

OD.Na__LeDash__RegisterControls({ read : () => ({}), toggle : () => {}, write : () => {} });
ND.Na__LeDash__RegisterControls({ read : () => ({}), toggle : () => {}, write : () => {} });
const regs = (rec) => rec.list.map((r) => r.type + ':' + r.name);
check('RegisterControls(host) wires the same seven controls as 1.0.0: ' + regs(recNewD).join(', '), JSON.stringify(regs(recOldD)) === JSON.stringify(regs(recNewD)), { old : regs(recOldD), new : regs(recNewD) });
{
    // The handlers, driven with the panel's own host shape, tell the host the same things and leave the same rows
    const stateFor = () => ({ on : true, style : { LineStyle__Kind : 'dashed', LineStyle__Scale : 1.25 } });
    OD.Na__LeDash__RefreshRows(dashAfter.bodyOld, Object.assign({ stroked : true }, stateFor()));
    ND.Na__LeDash__RefreshRows(dashAfter.bodyNew, Object.assign({ stroked : true }, stateFor()));
    // Re-register against a logging host: RegisterControls keeps the host it was given, so register again
    recOldD.list.length = 0; recNewD.list.length = 0;
    const dOld = drive(recOldD, dashAfter.bodyOld, stateFor, 'dash');
    const dNew = drive(recNewD, dashAfter.bodyNew, stateFor, 'dash');
    OD.Na__LeDash__RegisterControls(dOld.host);
    ND.Na__LeDash__RegisterControls(dNew.host);
    dOld.run(); dNew.run();
    const hostCalls = dNew.log.filter((e) => e[0] !== 'after').length;
    check('every handler (' + recNewD.list.length + ' controls x their test values) tells the host the same toggles and writes (' + hostCalls + ' calls) and leaves the same rows as 1.0.0',
          JSON.stringify(dOld.log) === JSON.stringify(dNew.log) && hostCalls > 0, firstDiff(dOld.log, dNew.log));
}

console.log('\n   LineStyleTool - the record answers as 1.0.0 did');
{
    const inputs = DASH_STYLES.concat([ undefined, 0, { LineStyle__Kind : 'centre' }, { LineStyle__Kind : 'dotted', LineStyle__DashMm : 0.01 }, { LineStyle__Scale : 0.1 }, { LineStyle__Scale : 3.333 } ]);
    const kinds = [ undefined, 'dashed', 'dotted', 'centre', 'hidden', 'nonsense' ];
    const patches = [ undefined, {}, { LineStyle__Kind : 'centre' }, { LineStyle__Kind : 'dotted' }, { LineStyle__Scale : 2.5 }, { LineStyle__DashMm : 0 }, { LineStyle__Kind : 'dashed', LineStyle__GapMm : 3 } ];
    let total = 0, same = 0;
    const differ = [];
    const cmp = (label, a, b) => { total++; const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) same++; else differ.push(label + ': ' + x + ' -> ' + y); };
    cmp('FIELD', OD.Na__LeDash__FIELD, ND.Na__LeDash__FIELD);
    cmp('Defaults', OD.Na__LeDash__Defaults(), ND.Na__LeDash__Defaults());
    cmp('Kinds', OD.Na__LeDash__Kinds(), ND.Na__LeDash__Kinds());
    [ 'Dashed', 'DashedTitle', 'Kind', 'Scale', 'Dash', 'Dot', 'Gap', 'Mark', 'Missing' ].forEach((k) => cmp('Label ' + k, OD.Na__LeDash__Label(k, 'fb'), ND.Na__LeDash__Label(k, 'fb')));
    inputs.forEach((s, i) => { cmp('Normalise #' + i, OD.Na__LeDash__Normalise(s), ND.Na__LeDash__Normalise(s)); cmp('PatternMm #' + i, OD.Na__LeDash__PatternMm(s), ND.Na__LeDash__PatternMm(s)); });
    kinds.forEach((k) => cmp('Create ' + k, OD.Na__LeDash__Create(k), ND.Na__LeDash__Create(k)));
    inputs.forEach((s, i) => patches.forEach((p, j) => cmp('With #' + i + '/' + j, OD.Na__LeDash__With(s, p), ND.Na__LeDash__With(s, p))));
    check('Normalise, Create, With, PatternMm, Kinds, Defaults and Label answer exactly as 1.0.0 (' + same + '/' + total + ')', same === total, differ);
}

console.log('\n   LineStyleTool - the new options (TrueVision v2.152.0): the Dimensions panel\'s rows');
{
    const column = document.createElement('div');                              // <-- One panel column holds both panels' rows
    const vectors = document.createElement('div'), dims = document.createElement('div');
    column.appendChild(vectors); column.appendChild(dims);
    ND.Na__LeDash__BuildRows(vectors);
    ND.Na__LeDash__BuildRows(dims, { prefix : 'dim', dashedLabel : 'Dashed lines', dashedTitle : 'Dash the dimension lines.' });
    const dimControls = controlsIn(dims);
    check('BuildRows(body, { prefix : "dim" }) names its controls dim-dash, dim-dash-kind, -scale, -dash, -gap, -mark', JSON.stringify(dimControls) === JSON.stringify(SHAPE_CONTROLS.map((n) => n.replace('shape-', 'dim-'))), dimControls);
    const all = controlsIn(column);
    check('so the column holds 12 controls, every name once - no duplicate shape-dash controls (S05b h1)', all.length === 12 && new Set(all).size === 12, all);
    const dimToggleRow = dims.querySelector('[data-na-control="dim-dash"]').parentNode;
    check('dashedLabel and dashedTitle replace the toggle row\'s caption and tooltip', dimToggleRow.children[0].textContent === 'Dashed lines' && dimToggleRow.title === 'Dash the dimension lines.');
    ND.Na__LeDash__RefreshRows(dims, { stroked : true, on : true, style : { LineStyle__Kind : 'centre' } }, { prefix : 'dim' });
    const dimBlock = dims.querySelector('[data-na-block="dash"]');
    check('RefreshRows(body, state, { prefix : "dim" }) finds the dim toggle and opens the block (kind centre, mark row shown)',
          dims.querySelector('[data-na-control="dim-dash"]').checked === true && dimBlock.hidden === false && dims.querySelector('[data-na-control="dim-dash-kind"]').value === 'centre' && dims.querySelector('[data-na-dash-row="mark"]').hidden === false);
    const before = snap(vectors);
    ND.Na__LeDash__RefreshRows(vectors, { stroked : true, on : false, style : null });
    check('the Vectors rows beside them still refresh by their own shape-dash names', vectors.querySelector('[data-na-control="shape-dash"]').checked === false && vectors.querySelector('[data-na-block="dash"]').hidden === true && before !== null);
    const recDim = recorder();
    const NDdim = (await loadTool(NEW_DIR, DNAME, 'newDdim', recDim)).mod;
    NDdim.Na__LeDash__RegisterControls({ read : () => ({}), toggle : () => {}, write : () => {} }, { prefix : 'dim' });
    check('RegisterControls(host, { prefix : "dim" }) wires dim-* only: ' + regs(recDim).join(', '), regs(recDim).every((r) => r.indexOf(':dim-dash') !== -1) && regs(recDim).length === 7, regs(recDim));
    const empty = { prefix : '' };
    const b2 = document.createElement('div');
    ND.Na__LeDash__BuildRows(b2, empty);
    check('an empty prefix falls back to "shape"', JSON.stringify(controlsIn(b2)) === JSON.stringify(SHAPE_CONTROLS));
}


// -----------------------------------------------------------------------------
// 3. GradientTool: a gradient on a shape without holes prints with the same PDF clip as before
// -----------------------------------------------------------------------------

console.log('\n3. GradientTool - the PDF of a gradient on a shape without holes, through ValeVision\'s jsPDF 4.1.0');
const SHAPES = {
    triangle  : [ [ 20, 20 ], [ 120, 30 ], [ 60, 110 ] ],
    rectangle : [ [ 10, 10 ], [ 210, 10 ], [ 210, 140 ], [ 10, 140 ] ],
    lshape    : [ [ 0, 0 ], [ 80, 0 ], [ 80, 30 ], [ 30, 30 ], [ 30, 90 ], [ 0, 90 ] ],
    closedrun : [ [ 50, 50 ], [ 150, 55 ], [ 140, 160 ], [ 45, 150 ], [ 50, 50 ] ],
    sliver    : [ [ 5, 5 ], [ 395, 6 ], [ 394, 8 ] ],
    decimals  : [ [ 12.345, 67.891 ], [ 98.7654, 43.21 ], [ 77.7, 120.05 ], [ 33.333, 99.999 ] ]
};
const PDF_GRADS = GRADS.filter((g) => g !== null).concat([ { Gradient__AngleDeg : 45 }, { Gradient__AngleDeg : 180, Gradient__BlendPct : 70 }, { Gradient__AngleDeg : 270, Gradient__StartOpacity : 0 }, { Gradient__AngleDeg : 359.9 } ]);
const FIXED_DATE = new Date(Date.UTC(2026, 9, 2, 0, 0, 0));
const FIXED_ID = '0123456789ABCDEF0123456789ABCDEF';

function newDoc(compress) {
    const doc = new jsPDF({ unit : 'mm', format : 'a3', orientation : 'landscape', compress : compress === true });
    doc.setCreationDate(FIXED_DATE);
    doc.setFileId(FIXED_ID);
    const calls = [];
    let depth = 0;
    [ 'saveGraphicsState', 'restoreGraphicsState', 'lines', 'clip', 'discardPath', 'addImage' ].forEach((name) => {
        const original = doc[name];
        doc[name] = function (...args) {
            if (depth === 0) calls.push([ name, JSON.stringify(args, (k, v) => (v === undefined ? '<undefined>' : (typeof v === 'string' && v.length > 200 ? 'sha256:' + sha(v) : v))) ]);
            depth++;
            try { return original.apply(this, args); } finally { depth--; }
        };
    });
    return { doc, calls };
}
const pageText = (doc) => doc.internal.pages[1].join('\n');

{
    let cases = 0, sameCalls = 0, sameBytes = 0, plainClip = 0, sameReturn = 0;
    const differ = [];
    for (const [ shapeName, pts ] of Object.entries(SHAPES)) {
        for (const g of PDF_GRADS) {
            const compress = (cases % 3) === 0;
            const variants = [ [], [ undefined ], [ null ], [ [] ], [ 'not an array' ] ];
            for (const extra of variants) {
                cases++;
                // EVERY DOCUMENT IS WRITTEN OUT ONCE. jsPDF 4.1.0 writes a compressed document's page stream
                // uncompressed on a second output() (probe_output_twice.cjs), so each comparison gets two fresh ones.
                const o = newDoc(compress);
                const rOld = OG.Na__LeGrad__DrawPdf(o.doc, pts, g);
                const n = newDoc(compress);
                const rNew = NG.Na__LeGrad__DrawPdf(n.doc, pts, g, ...extra);
                const label = shapeName + ' ' + JSON.stringify(g) + ' holes=' + (extra.length ? JSON.stringify(extra[0]) : '(left out)');
                if (rOld === rNew) sameReturn++; else differ.push('return ' + label);
                if (JSON.stringify(o.calls) === JSON.stringify(n.calls)) sameCalls++; else differ.push('calls ' + label);
                const bo = o.doc.output(), bn = n.doc.output();
                if (bo === bn) sameBytes++; else differ.push('bytes ' + label);
                const text = pageText(n.doc);
                if (/\nW\nn\n/.test(text + '\n') && text.indexOf('W*') === -1) plainClip++; else differ.push('clip ' + label);
            }
        }
    }
    check(cases + ' drawings (6 shapes x 11 gradients x holes left out / undefined / null / [] / junk): DrawPdf returns the same as 1.0.0', sameReturn === cases, differ.filter((d) => d.indexOf('return') === 0));
    check('... makes the same jsPDF calls with the same arguments (the clip path, the clip, the strip PNG, its corner and angle)', sameCalls === cases, differ.filter((d) => d.indexOf('calls') === 0));
    check('... and writes a byte-identical PDF (fixed date and file id; compressed and uncompressed)', sameBytes === cases, differ.filter((d) => d.indexOf('bytes') === 0));
    check('... whose clip is the plain nonzero W n, never W*', plainClip === cases, differ.filter((d) => d.indexOf('clip') === 0));
}
{
    const degenerate = [ [ 'two points', [ [ 0, 0 ], [ 10, 10 ] ], GRADS[2] ], [ 'no gradient', SHAPES.triangle, null ], [ 'a flat run', [ [ 0, 0 ], [ 10, 0 ], [ 20, 0 ] ], GRADS[2] ], [ 'not points', 'x', GRADS[2] ] ];
    const ok = degenerate.every(([ , pts, g ]) => { const o = newDoc(), n = newDoc(); return OG.Na__LeGrad__DrawPdf(o.doc, pts, g) === false && NG.Na__LeGrad__DrawPdf(n.doc, pts, g) === false && n.calls.length === 0 && o.calls.length === 0; });
    check('nothing to fill (two points, no gradient, a flat run, not points) and no document: false and no calls, as before', ok && OG.Na__LeGrad__DrawPdf(null, SHAPES.triangle, GRADS[2]) === false && NG.Na__LeGrad__DrawPdf(null, SHAPES.triangle, GRADS[2]) === false);
}
{
    // The real call site: SheetChrome's gradient pass (solid fill, the gradient, then the edges) - unchanged around it
    const prim = { Points : SHAPES.lshape, Gradient : GRADS[3], FillColour : '#dddddd', StrokeColour : '#000000', Closed : true };
    const paint = (G, d) => { const first = prim.Points[0]; const rel = []; for (let i = 1; i < prim.Points.length; i++) rel.push([ prim.Points[i][0] - prim.Points[i - 1][0], prim.Points[i][1] - prim.Points[i - 1][1] ]);
        d.setFillColor(221, 221, 221); d.lines(rel, first[0], first[1], [ 1, 1 ], 'F', true); G.Na__LeGrad__DrawPdf(d, prim.Points, prim.Gradient); d.setDrawColor(0, 0, 0); d.setLineWidth(0.35); d.lines(rel, first[0], first[1], [ 1, 1 ], 'S', true); };
    const o = newDoc(), n = newDoc();
    paint(OG, o.doc); paint(NG, n.doc);
    check('SheetChrome\'s three-pass gradient paint (fill, gradient, edges), as it calls DrawPdf today: byte-identical PDF', o.doc.output() === n.doc.output());
}

console.log('\n   GradientTool - a holed shape (new in 1.1.0, TrueVision v2.150.0)');
{
    const outer = [ [ 0, 0 ], [ 100, 0 ], [ 100, 100 ], [ 0, 100 ] ];
    const hole1 = [ [ 20, 20 ], [ 40, 20 ], [ 40, 40 ], [ 20, 40 ] ];
    const hole2 = [ [ 60, 60 ], [ 80, 60 ], [ 80, 80 ], [ 60, 80 ] ];
    const pts = outer.concat(hole1, hole2);
    const n = newDoc();
    const drawn = NG.Na__LeGrad__DrawPdf(n.doc, pts, GRADS[2], [ 4, 8 ]);
    const lineCalls = n.calls.filter((c) => c[0] === 'lines').map((c) => JSON.parse(c[1]));
    const clipCalls = n.calls.filter((c) => c[0] === 'clip').map((c) => JSON.parse(c[1]));
    const text = pageText(n.doc);
    check('holes [4, 8]: every ring is traced into the clip - three closed paths, from each ring\'s first point', drawn === true && lineCalls.length === 3
          && JSON.stringify(lineCalls.map((a) => [ a[1], a[2], a[0].length, a[5] ])) === JSON.stringify([ [ 0, 0, 3, true ], [ 20, 20, 3, true ], [ 60, 60, 3, true ] ]), lineCalls);
    check('... clipped even-odd: clip("evenodd") once, and the page reads W* n', JSON.stringify(clipCalls) === JSON.stringify([ [ 'evenodd' ] ]) && /\nW\*\nn\n/.test(text + '\n'), { clipCalls, text : text.slice(0, 400) });
    check('... with the graphics state saved and restored round it, and the strip image painted inside the clip', JSON.stringify(n.calls.map((c) => c[0])) === JSON.stringify([ 'saveGraphicsState', 'lines', 'lines', 'lines', 'clip', 'discardPath', 'addImage', 'restoreGraphicsState' ]), n.calls.map((c) => c[0]));
    const spans = RINGS.Na__LeRings__Spans(pts.length, [ 4, 8 ]);
    check('the rings are ShapeRings\' own spans: ' + JSON.stringify(spans), JSON.stringify(spans) === JSON.stringify([ [ 0, 4 ], [ 4, 8 ], [ 8, 12 ] ]));
    const o = newDoc();
    OG.Na__LeGrad__DrawPdf(o.doc, pts, GRADS[2], [ 4, 8 ]);
    check('(1.0.0 for contrast: one run through all twelve points, the stray edge TrueVision\'s devlog describes, nonzero W)', o.calls.filter((c) => c[0] === 'lines').length === 1 && pageText(o.doc).indexOf('W*') === -1);
}

console.log('\n   GradientTool - everything else answers as 1.0.0 did');
async function gradRowsPhase(phase) {
    const bodyOld = document.createElement('div'), bodyNew = document.createElement('div');
    OG.Na__LeGrad__BuildRows(bodyOld);
    NG.Na__LeGrad__BuildRows(bodyNew);
    check(phase + ': the Vectors panel\'s Gradient rows build the same (' + bodyNew.querySelectorAll('[data-na-control]').length + ' controls)', snap(bodyOld) === snap(bodyNew));
    let same = 0;
    GRAD_STATES.forEach((state) => { OG.Na__LeGrad__RefreshRows(bodyOld, state); NG.Na__LeGrad__RefreshRows(bodyNew, state); if (snap(bodyOld) === snap(bodyNew)) same++; });
    check(phase + ': RefreshRows shows the same for ' + GRAD_STATES.length + ' states', same === GRAD_STATES.length);
    let total = 0, eq = 0;
    const differ = [];
    const cmp = (label, a, b) => { total++; const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) eq++; else differ.push(label + ': ' + x + ' -> ' + y); };
    cmp('FIELD', OG.Na__LeGrad__FIELD, NG.Na__LeGrad__FIELD);
    cmp('Defaults', OG.Na__LeGrad__Defaults(), NG.Na__LeGrad__Defaults());
    cmp('Create', OG.Na__LeGrad__Create(), NG.Na__LeGrad__Create());
    [ 'Gradient', 'GradientTitle', 'Start', 'End', 'Alpha', 'AlphaTitle', 'Blend', 'Direction', 'Missing' ].forEach((k) => cmp('Label ' + k, OG.Na__LeGrad__Label(k, 'fb'), NG.Na__LeGrad__Label(k, 'fb')));
    GRADS.concat([ undefined, 'x' ]).forEach((g, i) => {
        cmp('Normalise #' + i, OG.Na__LeGrad__Normalise(g), NG.Na__LeGrad__Normalise(g));
        cmp('With #' + i, OG.Na__LeGrad__With(g, { Gradient__AngleDeg : 12 }), NG.Na__LeGrad__With(g, { Gradient__AngleDeg : 12 }));
        cmp('PreviewCss #' + i, OG.Na__LeGrad__PreviewCss(g), NG.Na__LeGrad__PreviewCss(g));
        const ng = NG.Na__LeGrad__Normalise(g);
        if (ng) {
            cmp('Stops #' + i, OG.Na__LeGrad__Stops(ng), NG.Na__LeGrad__Stops(ng));
            [ 0, 0.1, 0.5, 0.77, 1, -1, 2 ].forEach((t) => cmp('ColourAt #' + i + ' ' + t, OG.Na__LeGrad__ColourAt(ng, t), NG.Na__LeGrad__ColourAt(ng, t)));
        }
        Object.values(SHAPES).forEach((pts, k) => {
            cmp('SvgPaint #' + i + '/' + k, OG.Na__LeGrad__SvgPaint(pts, g), NG.Na__LeGrad__SvgPaint(pts, g));
            cmp('Axis #' + i + '/' + k, OG.Na__LeGrad__Axis(pts, (ng || {}).Gradient__AngleDeg || 0), NG.Na__LeGrad__Axis(pts, (ng || {}).Gradient__AngleDeg || 0));
        });
    });
    check(phase + ': Normalise, Create, With, Stops, ColourAt, Axis, SvgPaint (ids included), PreviewCss, Defaults and Label (' + eq + '/' + total + ')', eq === total, differ);
    return { bodyOld, bodyNew };
}
await gradRowsPhase('before the config loads');
await Promise.all([ OG.Na__LeGrad__Ready(), NG.Na__LeGrad__Ready() ]);
check('Ready() reads the gradient config in both copies', fetched.filter((f) => f === 'Na__LayoutEditor__GradientTool__Config__.json').length === 2, fetched);
const gradAfter = await gradRowsPhase('after the config loads');
{
    const stateFor = () => ({ on : true, gradient : GRADS[4] });
    OG.Na__LeGrad__RefreshRows(gradAfter.bodyOld, Object.assign({ canFill : true }, stateFor()));
    NG.Na__LeGrad__RefreshRows(gradAfter.bodyNew, Object.assign({ canFill : true }, stateFor()));
    recOldG.list.length = 0; recNewG.list.length = 0;
    const gOld = drive(recOldG, gradAfter.bodyOld, stateFor, 'grad');
    const gNew = drive(recNewG, gradAfter.bodyNew, stateFor, 'grad');
    OG.Na__LeGrad__RegisterControls(gOld.host);
    NG.Na__LeGrad__RegisterControls(gNew.host);
    gOld.run(); gNew.run();
    check('RegisterControls wires the same ' + recNewG.list.length + ' controls, and every handler tells the host and shows the same as 1.0.0',
          JSON.stringify(regs(recOldG)) === JSON.stringify(regs(recNewG)) && JSON.stringify(gOld.log) === JSON.stringify(gNew.log) && gNew.log.some((e) => e[0] === 'write'));
}
{
    // And after the config loads, the PDF of a plain shape is still the same
    let same = 0, n = 0;
    for (const pts of Object.values(SHAPES)) for (const g of PDF_GRADS) { n++; const o = newDoc(), m = newDoc(); OG.Na__LeGrad__DrawPdf(o.doc, pts, g); NG.Na__LeGrad__DrawPdf(m.doc, pts, g); if (o.doc.output() === m.doc.output()) same++; }
    check('after the config loads (its sample counts in force): ' + same + '/' + n + ' plain-shape gradient PDFs byte-identical to 1.0.0\'s', same === n);
}


// -----------------------------------------------------------------------------
// 4. The two config JSONs stay byte-identical
// -----------------------------------------------------------------------------

console.log('\n4. The two config JSONs');
{
    const snapLines = readFileSync(join(HERE, 'sha256__before.txt'), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/\s+/));
    for (const name of [ 'Na__LayoutEditor__GradientTool__Config__.json', 'Na__LayoutEditor__LineStyleTool__Config__.json' ]) {
        const row = snapLines.find((r) => r[1].endsWith('/' + name));
        const live = sha(readFileSync(join(DT, name)));
        check(name + ' is byte-identical to the pre-port snapshot (sha256 ' + live.slice(0, 16) + ')', row && row[0] === live, { snapshot : row && row[0], live });
    }
}

}
try { await runAll(); } catch (error) { check('the harness ran to the end', false, String(error && error.stack || error)); }

rmSync(TMP, { recursive : true, force : true });
console.log('\n' + (failures ? failures + ' check(s) FAILED, ' + passes + ' passed' : 'Every check passed (' + passes + ').'));
process.exit(failures ? 1 : 0);
