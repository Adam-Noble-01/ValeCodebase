// =============================================================================
// W1-37 package check (scratch, never shipped)
// =============================================================================
// Runs this app's Colour Palette modules and its Plan Annotations toolbar - the CANDIDATES in
// scratch/W1-37/candidates by default, or the LIVE tree with --live - in Node against a stand-in DOM,
// with each file's imports swapped for the modules loaded before it (the method of TrueVision's
// Na__Test__ColourPalette__, which W1-38 ports). Proves the package's acceptance at module level:
//   - the config is TrueVision's colour for colour, under the Vale palette name (DR-20);
//   - the toolbar's dimension colour is attached: a click opens the palette above it;
//   - a swatch pick fires input then change, reaches the toolbar's own handler, and lets go of the focus;
//   - a disabled field, and a palette with nothing to show, leave the click to the browser.
// Usage: node w1_37_check.mjs [--live]
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE  = path.dirname(fileURLToPath(import.meta.url));
const VV    = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const LIVE  = process.argv.includes('--live');
const AT    = process.argv.indexOf('--root');                                            // <-- A planted copy (mutation runs)
const ROOT  = AT > -1 ? process.argv[AT + 1] : (LIVE ? VV : path.join(HERE, 'candidates'));
const PAL   = path.join(ROOT, '02__Src__AppModules', '54__Feature__ColourPalette');
const TOOL  = path.join(ROOT, '02__Src__AppModules', '43__System__PlanAnnotations', 'Na__PlanAnnotations__Toolbar__.js');
const NAWEB = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN   = 'b2aa9151';

let pass = 0, fail = 0;
const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
};

// The file as shipped, with its import statements swapped for stubs and nothing else touched.
let loads = 0;
async function load(file, stubs, tag) {
    let src = fs.readFileSync(file, 'utf8');
    const had = /^\s*import\s/m.test(src);
    src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
    if (had && /^\s*import\s/m.test(src)) throw new Error('an import survived in ' + file);
    const tmp = path.join(os.tmpdir(), 'Na__W1_37__' + tag + '__' + process.pid + '_' + (loads++) + '.mjs');
    fs.writeFileSync(tmp, stubs + '\n' + src, 'utf8');
    try { return await import(pathToFileURL(tmp).href); }
    finally { fs.unlinkSync(tmp); }
}
const stubsFrom = (holder, names) => names.map((n) => `const ${n} = globalThis.${holder}.${n};`).join('\n');

console.log('W1-37 check - ' + (LIVE ? 'LIVE tree ' + VV : 'candidates ' + ROOT));

// -----------------------------------------------------------------------------
// A browser's worth of globals
// -----------------------------------------------------------------------------
const store = new Map();
globalThis.window = {
    localStorage : { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => store.set(k, String(v)) },
    listeners : {},
    dispatchEvent (event) { (this.listeners[event.type] || []).slice().forEach((fn) => fn(event)); return true; },
    addEventListener (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener (type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); },
    innerWidth : 1600, innerHeight : 900, outerWidth : 1616, devicePixelRatio : 1
};
globalThis.window.top = globalThis.window;
globalThis.CustomEvent = class { constructor (type, init) { this.type = type; this.detail = init ? init.detail : null; } };
globalThis.Event = class { constructor (type, init) { this.type = type; this.bubbles = !!(init && init.bubbles); } };
let fetchFails = false;
globalThis.fetch = async (url) => {
    if (fetchFails || !/Na__ColourPalette__Config__\.json$/.test(decodeURIComponent(String(url)))) return { ok : false, status : 404 };
    return { ok : true, status : 200, json : async () => JSON.parse(fs.readFileSync(path.join(PAL, 'Na__ColourPalette__Config__.json'), 'utf8')) };
};
const quiet = async (fn) => { const w = console.warn, l = console.log; const said = []; console.warn = (...a) => said.push(a.join(' ')); console.log = (...a) => said.push(a.join(' ')); try { await fn(); } finally { console.warn = w; console.log = l; } return said; };

// A stand-in DOM good enough for the picker and the toolbar: elements keep children, listeners and attributes.
class FakeElement {
    constructor (tag) {
        this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.listeners = {}; this.attributes = {};
        this.hidden = false; this.className = ''; this.value = ''; this._text = ''; this.disabled = false; this.title = ''; this.id = ''; this.type = '';
        this.style = { setProperty (k, v) { this[k] = v; } };
        const owner = this;
        this.classList = {
            toggle (name, on) { const set = new Set(owner.className.split(/\s+/).filter(Boolean)); const want = on === undefined ? !set.has(name) : !!on; want ? set.add(name) : set.delete(name); owner.className = Array.from(set).join(' '); return want; },
            add (name) { this.toggle(name, true); }, remove (name) { this.toggle(name, false); },
            contains (name) { return owner.className.split(/\s+/).includes(name); }
        };
    }
    get textContent () { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent (v) { this._text = String(v); this.children.forEach((c) => { c.parentNode = null; }); this.children = []; }
    get parentElement () { return this.parentNode; }
    get isConnected () { let node = this; while (node.parentNode) node = node.parentNode; return node === fakeBody; }
    get offsetWidth () { return this.className === 'na-colour-palette' ? 277 : 44; }
    get offsetHeight () { return this.className === 'na-colour-palette' ? 145 : 24; }
    setAttribute (k, v) { this.attributes[k] = String(v); }
    getAttribute (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; }
    addEventListener (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    removeEventListener (type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
    dispatchEvent (event) {
        // Bubbles up through the parents, as the browser's input and change do
        let node = this;
        if (!event.target) event.target = this;
        while (node) { event.currentTarget = node; (node.listeners[event.type] || []).slice().forEach((fn) => fn(event)); if (!event.bubbles) break; node = node.parentNode; }
        return true;
    }
    appendChild (child) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.children.push(child); return child; }
    removeChild (child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; }
    contains (node) { while (node) { if (node === this) return true; node = node.parentNode; } return false; }
    closest (selector) { const cls = selector.replace(/^\./, ''); let node = this; while (node) { if (selector === node.tagName.toLowerCase() || (node.className || '').split(/\s+/).includes(cls)) return node; node = node.parentNode; } return null; }
    all () { return this.children.flatMap((c) => [ c, ...c.all() ]); }
    querySelector (selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll (selector) { const cls = selector.replace(/^\./, ''); return this.all().filter((n) => (n.className || '').split(/\s+/).includes(cls)); }
    getBoundingClientRect () { return this.rect || { left : 0, right : 0, top : 0, bottom : 0, width : 0, height : 0 }; }
    showPicker () { const e = new Error('showPicker() requires a user gesture'); e.name = 'NotAllowedError'; throw e; }   // <-- What a script-made click gets
    blur () { if (globalThis.document.activeElement === this) globalThis.document.activeElement = fakeBody; this.blurred = (this.blurred || 0) + 1; }
    focus () { globalThis.document.activeElement = this; }
    click () { this.dispatchEvent({ type : 'click', bubbles : true, defaultPrevented : false, preventDefault () { this.defaultPrevented = true; } }); }
}
const fakeBody = new FakeElement('body');
globalThis.document = {
    body : fakeBody, activeElement : fakeBody, listeners : {},
    createElement : (tag) => new FakeElement(tag),
    addEventListener (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener (type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
};

// -----------------------------------------------------------------------------
// 1. The config: TrueVision's colour for colour, under the Vale name
// -----------------------------------------------------------------------------
const vvDoc = JSON.parse(fs.readFileSync(path.join(PAL, 'Na__ColourPalette__Config__.json'), 'utf8'));
const tvDoc = JSON.parse(execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json' ]).toString('utf8'));
check('the palette is named for Vale (DR-20), and that is its only palette', [ Object.keys(vvDoc.ColourPalette__Palettes), vvDoc.ColourPalette__Palettes.ColourPalette__Standard.Palette__MenuName ], [ [ 'ColourPalette__Standard' ], 'Vale Garden Houses Standard' ]);
const strip = (doc) => { const copy = JSON.parse(JSON.stringify(doc)); delete copy.ColourPalette__Meta; delete copy.ColourPalette__Palettes.ColourPalette__Standard.Palette__MenuName; return copy; };
check('every group, colour, display setting and label is TrueVision\'s, byte for byte once the name is set aside', JSON.stringify(strip(vvDoc)), JSON.stringify(strip(tvDoc)));
check('the Meta block is TrueVision\'s but for this app\'s name in Meta__Description and the Meta__PortedFrom record',
    Object.keys(vvDoc.ColourPalette__Meta).filter((k) => vvDoc.ColourPalette__Meta[k] !== tvDoc.ColourPalette__Meta[k]), [ 'Meta__Description', 'Meta__PortedFrom' ]);
check('no Noble Architecture palette name anywhere in the shipped config', /Noble Architecture Standard/.test(JSON.stringify(vvDoc)), false);

// -----------------------------------------------------------------------------
// 2. The manager and the picker, as shipped
// -----------------------------------------------------------------------------
const M = await load(path.join(PAL, 'Na__ColourPalette__Manager__.js'), '', 'Manager');
check('nothing is available before the config has loaded (the browser\'s menu alone, as before)', M.Na__ColourPalette__IsAvailable(), false);
const said = await quiet(() => M.Na__ColourPalette__Ready());
check('the shipped config loads without a warning, and says so with this app\'s console prefix',
    [ said.filter((s) => /ColourPalette\]/.test(s)).every((s) => s.startsWith('[ValeVision3D ColourPalette] ')), said.some((s) => /has no readable|disagree|used twice|names itself|could not be read|not found/.test(s)), said.join(' | ') ],
    [ true, false, '[ValeVision3D ColourPalette] 13 colour(s) in 1 palette(s).' ]);
check('one palette on show, with the Vale name, Monochrome then Dimensions',
    [ M.Na__ColourPalette__GetActivePalette().Palette__MenuName, M.Na__ColourPalette__GetActivePalette().Palette__Groups.map((g) => g.Group__Colours.length) ], [ 'Vale Garden Houses Standard', [ 10, 3 ] ]);

globalThis.__M = M;
const P = await load(path.join(PAL, 'Na__ColourPalette__Picker__.js'), stubsFrom('__M', [
    'Na__ColourPalette__CHANGED_EVENT', 'Na__ColourPalette__Ready', 'Na__ColourPalette__IsAvailable', 'Na__ColourPalette__GetDisplay', 'Na__ColourPalette__GetLabel',
    'Na__ColourPalette__GetPalettes', 'Na__ColourPalette__GetActivePalette', 'Na__ColourPalette__SetActivePalette', 'Na__ColourPalette__FindColour',
    'Na__ColourPalette__FindByHex', 'Na__ColourPalette__ToHex' ]), 'Picker');

// THE DOOR re-exports exactly these, under the feature's names
globalThis.__P = P;
const doorSrc = fs.readFileSync(path.join(PAL, 'Na__ColourPalette__.js'), 'utf8');
check('the door republishes the manager\'s 14 names and the picker\'s 6, and holds no code',
    [ (doorSrc.match(/^\s+Na__ColourPalette__[A-Za-z_]+,?$/gm) || []).length, (doorSrc.match(/Na__ColourPicker__\w+\s+as\s+Na__ColourPalette__\w+/g) || []).length, /\bfunction\b/.test(doorSrc.replace(/^\s*\/\/.*$/gm, '')) ],
    [ 14, 6, false ]);

// -----------------------------------------------------------------------------
// 3. The toolbar, as shipped, mounted with stand-ins for everything but the palette
// -----------------------------------------------------------------------------
const dimDefaults = { sizeMm : 2.5, color : '#960000' };
const applied = [];
globalThis.__S = {
    Na__PlanAnno__GetTextSetup : () => ({ minSizeMm : 1, maxSizeMm : 20, sizeStepMm : 0.5, allowedWeights : [ 400, 600, 700 ], weightLabels : { 400 : 'Regular', 600 : 'Semibold', 700 : 'Bold' } }),
    Na__PlanAnno__GetLabel : (key, fallback) => fallback,
    Na__PlanAnnoEdit__CommitPendingEdit : () => {}, Na__PlanAnnoEdit__GetSelected : () => null, Na__PlanAnnoEdit__SetPlacing : () => {},
    Na__PlanAnnoEdit__IsPlacing : () => false, Na__PlanAnnoEdit__DeleteSelected : () => {}, Na__PlanAnnoEdit__UpdateSelected : () => {},
    Na__PlanDimEdit__BeginPlacement : () => {}, Na__PlanDimEdit__CancelPlacement : () => {}, Na__PlanDimEdit__IsPlacing : () => false,
    Na__PlanDimEdit__GetSelectedId : () => null, Na__PlanDimEdit__DeleteSelectedDimension : () => {},
    Na__PlanDimAxis__IsOrthoMode : () => false, Na__PlanDimAxis__ToggleOrthoMode : () => {}, Na__PlanDimAxis__GetLockedAxis : () => null,
    Na__PlanDimGrid__AXIS_X : 'x',
    Na__PlanDim__GetTextSetup : () => ({ minSizeMm : 1, maxSizeMm : 10, sizeStepMm : 0.5 }),
    Na__PlanDim__GetNewDefaults : () => dimDefaults, Na__PlanDim__SetNewDefaults : (patch) => { applied.push(patch); Object.assign(dimDefaults, patch); },
    Na__PlanDim__Update : () => {}, Na__PlanDim__F_SIZE : 'sizeMm', Na__PlanDim__F_COLOR : 'color',
    Na__PlanDimEdit__GetSelectedRecord : () => null, Na__PlanDimLayer__Sync : () => {},
    Na__DrawFocus__DIMENSIONS : 'dimensions', Na__DrawFocus__CAP_DELETE : 'delete', Na__DrawFocus__ShouldHandle : () => false,
    Na__ColourPalette__Attach : P.Na__ColourPicker__Attach                                   // <-- The real picker, through the door's name
};
const toolSrc = fs.readFileSync(TOOL, 'utf8');
const toolImports = Array.from(toolSrc.matchAll(/^[ \t]*import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';/gm)).map((m) => ({ names : m[1].split(',').map((s) => s.trim()).filter(Boolean), from : m[2] }));
check('the toolbar imports the palette\'s one door, and only Attach from it',
    toolImports.filter((i) => /54__Feature__ColourPalette/.test(i.from)).map((i) => [ i.from, i.names ]), [ [ '../54__Feature__ColourPalette/Na__ColourPalette__.js', [ 'Na__ColourPalette__Attach' ] ] ]);
check('and keeps the getter seam: GetTextSetup from ConfigState, the rest of the dimension names from Data (F.8 C24)',
    [ toolImports.filter((i) => /ConfigState__\.js$/.test(i.from)).map((i) => i.names), toolImports.filter((i) => /PlanDimensions__Data__\.js$/.test(i.from)).map((i) => i.names.includes('Na__PlanDim__GetTextSetup')) ],
    [ [ [ 'Na__PlanDim__GetTextSetup' ] ], [ false ] ]);
const localNames = toolImports.flatMap((i) => i.names.map((n) => n.split(/\s+as\s+/).pop()));
const missingStubs = localNames.filter((n) => !(n in globalThis.__S));
if (missingStubs.length) { console.log('FAIL  stubs missing for: ' + missingStubs.join(', ')); process.exit(1); }
const T = await load(TOOL, stubsFrom('__S', localNames), 'Toolbar');

const host = new FakeElement('div');
fakeBody.appendChild(host);
check('the toolbar mounts', T.Na__PlanAnnoBar__Mount({ hostElement : host, onDone () {} }), true);
const swatches = host.querySelectorAll('.na-plan-anno__swatch');
const dimColour = swatches[0];
check('it builds one colour field, the dimension colour, showing the next dimension\'s colour', [ swatches.length, dimColour && dimColour.type, dimColour && dimColour.value ], [ 1, 'color', '#960000' ]);
check('and hands it to the palette: the picker\'s click handler is on it, and attaching again is refused', [ (dimColour.listeners.click || []).length, P.Na__ColourPicker__Attach(dimColour) ], [ 1, false ]);

// Where the toolbar sits: under the header, half way across a 1600 px window
dimColour.rect = { left : 900, right : 944, top : 70, bottom : 94, width : 44, height : 24 };
dimColour.focus();
const click = { type : 'click', currentTarget : dimColour, target : dimColour, defaultPrevented : false, preventDefault () { this.defaultPrevented = true; } };
(dimColour.listeners.click || []).forEach((fn) => fn(click));
const root = fakeBody.children.find((c) => c.className === 'na-colour-palette');
const proxy = fakeBody.children.find((c) => c.className === 'na-colour-palette__proxy');
check('a click on the 3D tab\'s dimension colour is taken from the browser and opens the palette for it',
    [ click.defaultPrevented, P.Na__ColourPicker__IsOpen(), !!root && root.hidden === false, !!proxy ], [ true, true, true, true ]);
check('the palette is titled with the Vale name and shows Monochrome (10) and Dimensions (3)',
    [ root.querySelector('.na-colour-palette__title') && root.querySelector('.na-colour-palette__title').textContent,
      root.querySelectorAll('.na-colour-palette__row').map((r) => r.querySelectorAll('.na-colour-palette__swatch').length) ],
    [ 'Vale Garden Houses Standard', [ 10, 3 ] ]);
check('near the top of the window the stack goes beside the field (no room above for mixer and palette), kept inside the window',
    [ root.getAttribute('data-na-colour-place'), parseInt(root.style.left, 10) + 277 <= 900 - 6, parseInt(root.style.top, 10) >= 8 ], [ 'beside', true, true ]);
check('the field\'s current colour is ringed: Proposed', root.querySelectorAll('.na-colour-palette__swatch').filter((s) => s.className.includes('is-current')).map((s) => s.getAttribute('data-na-colour-key')),
    [ 'ColourPalette__Dimensions__Proposed' ]);

const heard = [];
dimColour.addEventListener('input', () => heard.push('input:' + dimColour.value));
dimColour.addEventListener('change', () => heard.push('change:' + dimColour.value));
const existing = root.querySelectorAll('.na-colour-palette__swatch').find((s) => s.getAttribute('data-na-colour-key') === 'ColourPalette__Dimensions__Existing');
existing.click();                                                                          // <-- A click on the swatch, through the palette's own handler
check('a swatch pick puts Existing in the field and tells it as the browser would: input, then change',
    [ dimColour.value, heard ], [ '#000096', [ 'input:#000096', 'change:#000096' ] ]);
check('the toolbar\'s own input handler heard it: the next dimension\'s colour is Existing', applied.slice(-1), [ { color : '#000096' } ]);
check('the field lets go of the focus, the palette closes and the proxy leaves the page',
    [ globalThis.document.activeElement === dimColour, dimColour.blurred, P.Na__ColourPicker__IsOpen(), fakeBody.children.includes(proxy), root.hidden ], [ false, 1, false, false, true ]);
check('a Refresh after the pick (the focus gone) shows the colour the toolbar now holds', (T.Na__PlanAnnoBar__Refresh(), dimColour.value), '#000096');

// THE BROWSER'S MIXER, through the proxy: what it reports reaches the field (for when it is opened by hand)
(dimColour.listeners.click || []).forEach((fn) => fn({ type : 'click', currentTarget : dimColour, preventDefault () {} }));
const proxy2 = fakeBody.children.find((c) => c.className === 'na-colour-palette__proxy');
heard.length = 0;
proxy2.value = '#336699';
proxy2.dispatchEvent({ type : 'input', bubbles : false });
check('a colour mixed in the browser\'s menu reaches the field and the toolbar as input', [ dimColour.value, heard, applied.slice(-1) ], [ '#336699', [ 'input:#336699' ], [ { color : '#336699' } ] ]);
P.Na__ColourPicker__Close();

// A DISABLED FIELD is left to the browser: no palette
dimColour.disabled = true;
const click2 = { type : 'click', currentTarget : dimColour, defaultPrevented : false, preventDefault () { this.defaultPrevented = true; } };
(dimColour.listeners.click || []).forEach((fn) => fn(click2));
check('a disabled field gets the browser\'s menu only: the click is not taken and no palette opens', [ click2.defaultPrevented, P.Na__ColourPicker__IsOpen() ], [ false, false ]);
dimColour.disabled = false;

// NOTHING TO SHOW (config missing): the click is left alone
fetchFails = true;
const M2 = await load(path.join(PAL, 'Na__ColourPalette__Manager__.js'), '', 'ManagerNoConfig');
globalThis.__M = M2;
const P2 = await load(path.join(PAL, 'Na__ColourPalette__Picker__.js'), stubsFrom('__M', [
    'Na__ColourPalette__CHANGED_EVENT', 'Na__ColourPalette__Ready', 'Na__ColourPalette__IsAvailable', 'Na__ColourPalette__GetDisplay', 'Na__ColourPalette__GetLabel',
    'Na__ColourPalette__GetPalettes', 'Na__ColourPalette__GetActivePalette', 'Na__ColourPalette__SetActivePalette', 'Na__ColourPalette__FindColour',
    'Na__ColourPalette__FindByHex', 'Na__ColourPalette__ToHex' ]), 'PickerNoConfig');
const lone = new FakeElement('input'); lone.type = 'color'; fakeBody.appendChild(lone);
const warned = await quiet(async () => { P2.Na__ColourPicker__Attach(lone); await M2.Na__ColourPalette__Ready(); });
const click3 = { type : 'click', currentTarget : lone, defaultPrevented : false, preventDefault () { this.defaultPrevented = true; } };
(lone.listeners.click || []).forEach((fn) => fn(click3));
check('with no config the palette stands aside: the click is the browser\'s, and the console says why in this app\'s words',
    [ click3.defaultPrevented, P2.Na__ColourPicker__IsOpen(), warned.some((s) => s.startsWith('[ValeVision3D ColourPalette] Palette config not found')) ], [ false, false, true ]);

T.Na__PlanAnnoBar__Unmount();
check('unmounting takes the toolbar out of its host', host.children.length, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
