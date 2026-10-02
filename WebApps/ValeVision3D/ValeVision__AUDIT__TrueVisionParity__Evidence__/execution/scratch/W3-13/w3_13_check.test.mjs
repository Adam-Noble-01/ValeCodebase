// W3-13 scratch check: Panel__Layers 1.3.0 and ViewportLink 1.5.1 as landed.
// - every line of each live file below its header is TrueVision's (pin b2aa9151), bar the console prefix;
// - exports are TrueVision's and every previous VV export is kept;
// - both modules evaluate in Node through index.html's import map;
// - Nearest leaves out a viewport on a reference layer (a scale bar dropped beside it does not bind to it),
//   takes it again when the layer is made selectable, and measures to a turned frame as it stands.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
register('../W3-01/importmap_hooks.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '../../../..');
const LE   = resolve(VV, '02__Src__AppModules/51__System__LayoutEditor');
const FILES = [
    [ 'Na__LayoutEditor__Panel__Layers__.js', resolve(LE, '40__Ui__Panels') ],
    [ 'Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js', resolve(LE, '57__Feature__ScrapbookParametric') ]
];

let pass = 0, fail = 0;
const check = (ok, label) => { if (ok) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } };

class Ev { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
const elStub = () => ({ style : { setProperty(){}, removeProperty(){}, getPropertyValue(){ return ''; } }, classList : { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, appendChild(c){ return c; }, insertBefore(c){ return c; }, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; }, getBoundingClientRect(){ return { left:0, top:0, width:0, height:0, right:0, bottom:0 }; }, children : [], childNodes : [], textContent : '', innerHTML : '', dataset : {} });
globalThis.CustomEvent = globalThis.CustomEvent || Ev;
globalThis.window = { dispatchEvent : () => true, addEventListener(){}, removeEventListener(){}, localStorage : { getItem : () => null, setItem(){}, removeItem(){} }, sessionStorage : { getItem : () => null, setItem(){}, removeItem(){} }, location : { hostname : 'localhost', search : '', href : 'http://localhost/', pathname : '/' }, setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame : (f) => setTimeout(f, 0), cancelAnimationFrame(){}, devicePixelRatio : 1, innerWidth : 1200, innerHeight : 800, getComputedStyle : () => ({ getPropertyValue : () => '' }), matchMedia : () => ({ matches : false, addEventListener(){}, removeEventListener(){} }) };
globalThis.document = { createElement : elStub, createElementNS : elStub, createTextNode : elStub, getElementById : () => null, querySelector : () => null, querySelectorAll : () => [], addEventListener(){}, removeEventListener(){}, body : elStub(), head : elStub(), documentElement : elStub(), fonts : { ready : Promise.resolve() } };
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;
globalThis.localStorage = globalThis.window.localStorage;

const exportNames = (text) => { const m = text.match(/export\s*\{([\s\S]*?)\}/); return m ? m[1].split(',').map((s) => s.replace(/\/\/[^\n]*/g, '').trim()).filter(Boolean) : []; };
const afterHeader = (text) => text.replace(/\r\n/g, '\n').split('\n// =============================================================================\n').slice(2).join('\n');

// ---- source: below the header, TrueVision's line for line (console prefix aside); exports ----
for (const [ name, dir ] of FILES) {
    const live = readFileSync(resolve(dir, name), 'utf8');
    const tv   = readFileSync(resolve(HERE, 'tv', name), 'utf8');
    const back = readFileSync(resolve(HERE, 'backup', name), 'utf8');
    check(afterHeader(live) === afterHeader(tv).split('[TrueVision3D ').join('[ValeVision3D '), name + ': code below the header is TrueVision\'s (console prefix swapped)');
    check(live.split('\n')[1] === '// VALEVISION3D - ' + tv.split('\n')[1].replace('// TRUEVISION3D - ', ''), name + ': banner reads VALEVISION3D');
    const liveHead = live.slice(0, live.indexOf('// PORT NOTE:'));
    const tvHead   = tv.slice(0, tv.indexOf('// PORT NOTE:'));
    check(liveHead.split('\n').slice(3).join('\n') === tvHead.split('\n').slice(3).join('\n'), name + ': FILE..INTEGRATION are TrueVision\'s verbatim');
    const liveLog = live.slice(live.indexOf('// DEVELOPMENT LOG:'));
    const tvLog   = tv.slice(tv.indexOf('// DEVELOPMENT LOG:'));
    check(liveLog === tvLog.split('[TrueVision3D ').join('[ValeVision3D '), name + ': DEVELOPMENT LOG is TrueVision\'s verbatim (DR-34)');
    const le = exportNames(live), te = exportNames(tv), be = exportNames(back);
    check(JSON.stringify(le.slice().sort()) === JSON.stringify(te.slice().sort()), name + ': exports are TrueVision\'s (' + le.length + ')');
    check(be.every((n) => le.indexOf(n) !== -1), name + ': every previous VV export kept');
    check(!/TRUEVISION3D|\[TrueVision3D|NaProjectPortal|\/na-apps\//.test(live), name + ': no TrueVision identity token or NA marker');
    check(!live.includes('\r'), name + ': LF, as git show returns it');
}
const layersSrc = readFileSync(resolve(FILES[0][1], FILES[0][0]), 'utf8');
check(/'na-le-btn--icon na-le-btn--ref' \+ \(reference \? ' is-reference' : ''\)/.test(layersSrc), 'Panel__Layers: the Ref button carries na-le-btn--ref and is-reference on a reference layer');
const css = readFileSync(resolve(LE, '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css'), 'utf8');
check(/\.na-le-btn--eye\.is-off,\s*\.na-le-btn--lock\.is-locked,\s*\.na-le-btn--ref\.is-reference\s*\{[^}]*#fbf3f3/.test(css), 'Styles__Panels: Off, Unlock and Ref share one faint red rule (#fbf3f3)');
check(/Na__LePanels__OnControl\('click', 'layer-ref',[^\n]*Na__LeModel__UpdateLayer\(s, id, \{ selectable : l\.Layer__Selectable === false \}\)/.test(layersSrc), 'Panel__Layers: a Ref click flips the layer\'s selectable through UpdateLayer');

// ---- evaluate both modules; Nearest against reference layers and a turned frame ----
try {
    const P = await import(pathToFileURL(resolve(FILES[0][1], FILES[0][0])).href);
    check(typeof P.Na__LePanelLayers__Register === 'function' || Object.keys(P).length > 0, 'Panel__Layers evaluates in Node (' + Object.keys(P).join(', ') + ')');
    const L = await import(pathToFileURL(resolve(FILES[1][1], FILES[1][0])).href);
    check(typeof L.Na__LeParamLink__Nearest === 'function', 'ViewportLink evaluates in Node');

    const vp = (id, layer, x, y, w, h, extra) => Object.assign({ Viewport__Id : id, Viewport__Kind : '2d', Viewport__LayerId : layer, Viewport__ScaleDenominator : 50, Viewport__FrameMm : { X : x, Y : y, WidthMm : w, HeightMm : h } }, extra || {});
    const sheet = {
        Sheet__Id : 'Sheet_T',
        Sheet__Layers : [ { Layer__Id : 'Layer_Main', Layer__Name : 'Viewports' }, { Layer__Id : 'Layer_Ref', Layer__Name : 'Reference', Layer__Selectable : false } ],
        Sheet__Viewports : [ vp('Viewport_001', 'Layer_Ref', 0, 0, 100, 100), vp('Viewport_002', 'Layer_Main', 200, 0, 100, 100) ]
    };
    const kind2d = (await import(pathToFileURL(resolve(LE, '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js')).href)).Na__LeModel__KIND_2D;
    sheet.Sheet__Viewports.forEach((v) => { v.Viewport__Kind = kind2d; });
    const drop = { x : 50, y : 115 };                                             // 15 mm under Viewport_001, the Ref one
    let n = L.Na__LeParamLink__Nearest(sheet, drop, Infinity);
    check(n && n.Viewport__Id === 'Viewport_002', 'a scale bar dropped under a viewport on a reference layer does not bind to it (takes Viewport_002, ' + (n && n.Viewport__Id) + ')');
    n = L.Na__LeParamLink__Nearest(sheet, drop, 40);
    check(n === null, 'within the 40 mm reach, the reference viewport is the only one near: no link at all');
    sheet.Sheet__Layers[1].Layer__Selectable = undefined; delete sheet.Sheet__Layers[1].Layer__Selectable;
    n = L.Na__LeParamLink__Nearest(sheet, drop, Infinity);
    check(n && n.Viewport__Id === 'Viewport_001', 'Ref switched off again: the same drop binds to Viewport_001');
    check(L.Na__LeParamLink__Candidates(sheet).length === 2, 'the panel\'s list (Candidates) still offers both viewports');

    // a turned frame: 200 x 20 frame centred at (100, 10), turned 90 degrees -> it stands 20 wide and 200 tall about its middle
    const turned = { Sheet__Id : 'Sheet_R', Sheet__Layers : [ { Layer__Id : 'Layer_Main' } ], Sheet__Viewports : [ vp('Viewport_009', 'Layer_Main', 0, 0, 200, 20, { Viewport__RotationDeg : 90 }) ] };
    turned.Sheet__Viewports[0].Viewport__Kind = kind2d;
    const pt = { x : 100, y : 105 };                                              // inside the turned frame (x 90..110, y -90..110), 85 mm below the level one
    check(L.Na__LeParamLink__Nearest(turned, pt, 1) !== null, 'a point inside a turned frame reads as on it (DistanceTo through the ViewportRotation leaf)');
    delete turned.Sheet__Viewports[0].Viewport__RotationDeg;
    check(L.Na__LeParamLink__Nearest(turned, pt, 1) === null, 'the same point is 85 mm off the frame when it is level');
} catch (error) {
    check(false, 'module evaluation: ' + (error && error.stack || error));
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
