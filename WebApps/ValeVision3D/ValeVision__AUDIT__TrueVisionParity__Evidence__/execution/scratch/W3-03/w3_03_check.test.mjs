// W3-03 scratch check: the live hub (SheetTools__ and everything it imports), ViewportHandles 1.5.0 and MarginGrip
// evaluate in Node through index.html's import map; the hub's exports are what TrueVision's are (plus the one VV
// guard export); every name VV's previous hub files exported is still exported, bar the one TrueVision moved out
// (SnapShapeTranslation, now Na__LeOsnap__ShapeTranslation in 28__System__ObjectSnap); the four guards are on.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
register('../W3-01/importmap_hooks.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '../../../..');
const LE   = resolve(VV, '02__Src__AppModules/51__System__LayoutEditor');
const ST   = resolve(LE, '30__System__SheetTools');

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

// ---- exports: TrueVision's, plus the one guard export; VV's previous names kept ----
const UNITS = [
    [ 'Na__LayoutEditor__SheetTools__HitResolution__.js', ST, [ 'Na__LeTools__VV_HOLD_AUTO_MOVE' ], [ 'Na__LeTools__SnapShapeTranslation' ] ],
    [ 'Na__LayoutEditor__SheetTools__PointerPress__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__PointerDrag__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__Keyboard__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__ContextMenu__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__CopyDrag__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__AxisLock__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__SheetTools__ContentEditing__.js', ST, [], [] ],
    [ 'Na__LayoutEditor__ViewportHandles__.js', resolve(LE, '20__System__Viewports'), [], [] ],
    [ 'Na__LayoutEditor__MarginGrip__.js', resolve(LE, '50__Feature__Specification'), [], [] ]
];
for (const [ name, dir, vvOnly, movedOut ] of UNITS) {
    const live = exportNames(readFileSync(resolve(dir, name), 'utf8'));
    const tv   = exportNames(readFileSync(resolve(HERE, 'tv', name), 'utf8'));
    const want = tv.concat(vvOnly);
    check(JSON.stringify(live.slice().sort()) === JSON.stringify(want.slice().sort()), name + ': exports are TrueVision\'s' + (vvOnly.length ? ' + ' + vvOnly.join(', ') : '') + ' (' + live.length + ')');
    const bpath = resolve(HERE, 'backup', name);
    if (existsSync(bpath)) {
        const before = exportNames(readFileSync(bpath, 'utf8'));
        const lost = before.filter((n) => live.indexOf(n) === -1 && movedOut.indexOf(n) === -1);
        check(lost.length === 0, name + ': every previous VV export kept' + (movedOut.length ? ' (bar ' + movedOut.join(', ') + ', moved to ObjectSnap by TrueVision)' : '') + (lost.length ? ' LOST ' + lost.join(', ') : ''));
    }
}

// ---- the four guards, each where it is recorded ----
const src = (n) => readFileSync(resolve(ST, n), 'utf8');
const hit = src('Na__LayoutEditor__SheetTools__HitResolution__.js');
const press = src('Na__LayoutEditor__SheetTools__PointerPress__.js');
const drag = src('Na__LayoutEditor__SheetTools__PointerDrag__.js');
const between = (text, startNeedle, endNeedle) => { const s = text.indexOf(startNeedle); return s < 0 ? '' : text.slice(s, text.indexOf(endNeedle, s + startNeedle.length)); };
check(/const Na__LeTools__VV_HOLD_AUTO_MOVE\s+= true;/.test(hit), 'item 7: VV_HOLD_AUTO_MOVE is on');
check(/const Na__LeTools__VV_HOLD_VIEWPORT_CARRY = true;/.test(hit), 'item 9: VV_HOLD_VIEWPORT_CARRY is on');
check(/const Na__LeTools__VV_HOLD_COPY_DRAG\s+= true;/.test(press), 'item 8: VV_HOLD_COPY_DRAG is on');
check(/const Na__LeTools__VV_HOLD_MOVE_ANCHOR = true;/.test(press), 'item 10: VV_HOLD_MOVE_ANCHOR is on');
check(between(hit, 'function Na__LeTools__PicksUpMove(', '\n    // ----').indexOf('if (Na__LeTools__VV_HOLD_AUTO_MOVE) return false;') > 0, 'item 7: PicksUpMove answers false first (press and hover cursor)');
check(between(hit, 'function Na__LeTools__SelectionPicksUpMove(', '\n    // ----').indexOf('VV_HOLD') === -1, 'item 7: SelectionPicksUpMove is TrueVision\'s (the ported test reads it)');
check(between(drag, 'function Na__LeTools__BoxUp(', '\n    // ----').indexOf('if (Na__LeTools__VV_HOLD_AUTO_MOVE) return;') > 0 || /if \(Na__LeTools__VV_HOLD_AUTO_MOVE\) return;[^\n]*\n        if \(result\.dragged && Na__LeTools__SelectionPicksUpMove\(chosen\)\) Na__LeTools__PickUpMove\(\);/.test(drag), 'item 7: the box release returns before it picks Move up');
check(between(hit, 'function Na__LeTools__CarryTarget(', '\n    // ----').indexOf('if (Na__LeTools__VV_HOLD_VIEWPORT_CARRY) return null;') > 0, 'item 9: CarryTarget answers null (press GrabAt and hover marker)');
check(/drag\.copyable  = \([^\n]*\n        if \(Na__LeTools__VV_HOLD_COPY_DRAG\) drag\.copyable = false;[^\n]*\n        drag\.copy      = drag\.copyable && intent\.copy === true;/.test(press), 'item 8: no drag is copyable, before drag.copy is read');
check(/const intent  = Na__LeCfg__MatchSelectionModifier\([^\n]*\n        if \(Na__LeTools__VV_HOLD_MOVE_ANCHOR\) intent\.anchor = false;/.test(press), 'item 10: the press never reads the anchor modifier');
const pickups = (press.match(/Na__LeTools__PickUpMove\(\)/g) || []).length + (drag.match(/Na__LeTools__PickUpMove\(\)/g) || []).length;
check(pickups === 3, 'every PickUpMove call site is behind a guard: OnDown (PicksUpMove), ArmAnchor (anchor never armed), BoxUp (guard) - ' + pickups + ' sites');

// ---- evaluate the live modules ----
try {
    const H = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__.js')).href);
    check(typeof H.Na__LeTools__Initialize === 'function' || Object.keys(H).length > 20, 'SheetTools__ 1.39.0 evaluates with its whole import closure (' + Object.keys(H).length + ' exports)');
    const R = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__HitResolution__.js')).href);
    check(R.Na__LeTools__VV_HOLD_AUTO_MOVE === true, 'HitResolution exports VV_HOLD_AUTO_MOVE = true');
    check(R.Na__LeTools__CarryTarget(null, { kind : 'viewport', id : 'v' }) === null, 'CarryTarget(no sheet) -> null');
    const C = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__CopyDrag__.js')).href);
    check(typeof C.Na__LeTools__ToggleCopyDrag === 'function' && C.Na__LeTools__ToggleCopyDrag() === false, 'CopyDrag evaluates; ToggleCopyDrag with no drag in flight -> false');
    const V = await import(pathToFileURL(resolve(LE, '20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js')).href);
    check([ 'Na__LeHandles__OnRotateGrip', 'Na__LeHandles__RotateStart', 'Na__LeHandles__RotateTo' ].every((n) => typeof V[n] === 'function'), 'ViewportHandles 1.5.0 exports OnRotateGrip, RotateStart, RotateTo');
    const M = await import(pathToFileURL(resolve(LE, '50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js')).href);
    check(Object.keys(M).length > 0, 'MarginGrip evaluates with IsMoveAuto imported');
    const T = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__ToolState__.js')).href);
    check(T.Na__LeTools__IsMoveAuto() === false, 'IsMoveAuto is false at rest (the margin grip shows under Select only)');
} catch (e) {
    check(false, 'live modules evaluate: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
