// W2-20 scratch check (not shipped): the ported ContextMenu 1.1.0 and HoverTooltip 1.1.0 on a small fake DOM.
// Run from anywhere: node W2-20__menu_and_tooltip__check.mjs
import { pathToFileURL } from 'node:url';

const ST = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/';

// ------------------------------------------------------------ fake DOM
class ClassList {
    constructor(el) { this.el = el; }
    get set() { return new Set(this.el.className.split(/\s+/).filter(Boolean)); }
    add(c) { const s = this.set; s.add(c); this.el.className = [...s].join(' '); }
    remove(c) { const s = this.set; s.delete(c); this.el.className = [...s].join(' '); }
    contains(c) { return this.set.has(c); }
}
class El {
    constructor(tag) {
        this.nodeType = tag === '#text' ? 3 : 1; this.tagName = tag; this.children = []; this.parentNode = null;
        this.className = ''; this.attrs = {}; this.listeners = {}; this.style = {}; this.disabled = false; this.hidden = false;
        this._text = ''; this.classList = new ClassList(this);
    }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
    contains(n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.documentElement; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
    fire(t, extra = {}) { const ev = { type : t, target : this, defaultPrevented : false, stopped : false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra }; (this.listeners[t] || []).forEach((f) => f(ev)); return ev; }
    set textContent(v) { this.children = []; this._text = String(v); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    focus() { doc.activeElement = this; }
    all() { return this.children.flatMap((c) => [ c, ...c.all() ]); }
    querySelector(sel) { // only '.na-le-menu__item:not(:disabled)'
        return this.all().find((e) => e.classList.contains('na-le-menu__item') && !e.disabled) || null; }
    getBoundingClientRect() {
        const w = this.classList.contains('na-le-menu') ? 200 : this.classList.contains('na-le-hovertip') ? 120 : 200;
        const h = this.classList.contains('na-le-menu') ? 30 * this.children.length : this.classList.contains('na-le-hovertip') ? 20 : 28;
        if (this.classList.contains('na-le-menu__item')) { const i = this.parentNode.children.indexOf(this); const p = this.parentNode.getBoundingClientRect(); return { left : p.left, top : p.top + 5 + 28 * i, width : 200, height : 28, right : p.left + 200, bottom : p.top + 33 + 28 * i }; }
        const left = parseFloat(this.style.left || '0'), top = parseFloat(this.style.top || '0');
        return { left, top, width : w, height : h, right : left + w, bottom : top + h };
    }
}
const doc = { documentElement : new El('html'), activeElement : null, createElement : (t) => new El(t), createTextNode : (s) => { const e = new El('#text'); e._text = s; return e; } };
doc.body = doc.documentElement.appendChild(new El('body'));
const winListeners = {};
const timers = [];
globalThis.document = doc;
globalThis.window = {
    innerWidth : 1000, innerHeight : 800,
    addEventListener : (t, f, c) => { (winListeners[t] ||= []).push(f); },
    removeEventListener : (t, f) => { winListeners[t] = (winListeners[t] || []).filter((x) => x !== f); },
    setTimeout : (fn, ms) => { timers.push({ fn, ms, id : timers.length + 1 }); return timers.length; },
    clearTimeout : (id) => { const t = timers.find((x) => x.id === id); if (t) t.fn = null; }
};
const flush = (upTo = Infinity) => { let t; while ((t = timers.find((x) => x.fn && x.ms <= upTo))) { const f = t.fn; t.fn = null; f(); } };
const winFire = (t, extra = {}) => { const ev = { type : t, defaultPrevented : false, stopped : false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra }; (winListeners[t] || []).slice().forEach((f) => f(ev)); return ev; };

// ------------------------------------------------------------ checks
let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) { pass++; } else { fail++; console.log('FAIL', what); } };
const menus = () => doc.body.children.filter((c) => c.classList.contains('na-le-menu'));

const M = await import(pathToFileURL(ST + 'Na__LayoutEditor__ContextMenu__.js').href);
const T = await import(pathToFileURL(ST + 'Na__LayoutEditor__SheetTools__HoverTooltip__.js').href);
ok(Object.keys(M).sort().join() === 'Na__LeMenu__Close,Na__LeMenu__IsOpen,Na__LeMenu__Open', 'ContextMenu exports unchanged');
ok(Object.keys(T).sort().join() === 'Na__LeHoverTip__Hide,Na__LeHoverTip__Show', 'HoverTooltip exports');

// 1. An existing VV menu shape (sheet items / scrapbook / parametric grips): opens, places, picks, closes.
let picked = '';
ok(M.Na__LeMenu__Open(100, 100, []) === false && !M.Na__LeMenu__IsOpen(), 'empty list opens nothing');
ok(M.Na__LeMenu__Open(990, 790, [
    { label : 'Copy', onSelect : () => { picked = 'copy'; } },
    null,
    { separator : true },
    { label : 'Snapping off', checked : true },
    { label : 'Locked', disabled : true },
    { label : 'Delete', danger : true, onSelect : () => { picked = 'delete'; } }
]) === true, 'Open returns true');
let root = menus()[0];
ok(M.Na__LeMenu__IsOpen() && menus().length === 1, 'one card open');
ok(root.children.length === 5 && root.children[1].className === 'na-le-menu__separator', 'rows and separator (null dropped)');
ok(root.children[2].className === 'na-le-menu__item na-le-menu__item--checked', 'checked true dots the row');
ok(root.children[3].disabled === true && root.children[4].className.includes('--danger'), 'disabled and danger');
ok(root.style.left === (1000 - 200 - 4) + 'px' && root.style.top === (800 - 150 - 4) + 'px', 'clamped inside the window at the cursor');
ok(!(winListeners.keydown || []).length, 'window listeners wait for the opening click to pass');
flush(0);
ok((winListeners.keydown || []).length === 1 && (winListeners.pointerdown || []).length === 1, 'window listeners attached');
root.children[4].fire('click');
ok(picked === 'delete' && !M.Na__LeMenu__IsOpen() && menus().length === 0, 'a pick runs onSelect and closes');
ok(!(winListeners.keydown || []).length && !(winListeners.pointerdown || []).length && !(winListeners.scroll || []).length, 'listeners removed on close');

// Escape and a press outside close a plain menu.
M.Na__LeMenu__Open(10, 10, [ { label : 'A' } ]); flush(0);
const e1 = winFire('keydown', { key : 'Escape' });
ok(!M.Na__LeMenu__IsOpen() && e1.defaultPrevented && !e1.stopped, 'Escape closes a plain menu');
M.Na__LeMenu__Open(10, 10, [ { label : 'A' } ]); flush(0);
winFire('pointerdown', { target : doc.body });
ok(!M.Na__LeMenu__IsOpen(), 'a press elsewhere closes it');
M.Na__LeMenu__Open(10, 10, [ { label : 'A' } ]); flush(0);
winFire('scroll', { target : doc });
ok(!M.Na__LeMenu__IsOpen(), 'a page scroll closes it');

// 2. A scripted submenu item opens a flyout that Escape closes first.
let layer = '';
M.Na__LeMenu__Open(100, 100, [
    { label : 'Delete', danger : true },
    { separator : true },
    { label : 'Layer', hint : 'Vectors', submenu : [ { label : 'Vectors', checked : true, onSelect : () => { layer = 'v'; } }, { label : 'Notes', checked : 'mixed', hint : 'Locked', onSelect : () => { layer = 'n'; } } ] },
    { label : 'Empty', submenu : [] },
    { label : 'Undo' }
]);
flush(0);
root = menus()[0];
const row = root.children[2];
ok(row.className === 'na-le-menu__item na-le-menu__item--submenu na-le-menu__item--hinted', 'submenu row classes');
ok(row.children.length === 2 && row.children[0].className === 'na-le-menu__label' && row.children[1].className === 'na-le-menu__hint' && row.children[1].textContent === 'Vectors', 'hint at the far end');
ok(row.attrs['aria-haspopup'] === 'menu' && row.attrs['aria-expanded'] === 'false', 'aria on the row');
ok(root.children[3].disabled === true, 'an empty submenu disables its row');
row.fire('pointerenter', { pointerType : 'mouse' });
ok(menus().length === 1, 'no flyout before FLYOUT_OPEN_MS');
flush(120);
let fly = menus()[1];
ok(menus().length === 2 && fly.className === 'na-le-menu na-le-menu--flyout', 'hover opens the flyout after 120 ms');
ok(row.classList.contains('na-le-menu__item--open') && row.attrs['aria-expanded'] === 'true', 'row lit while open');
ok(fly.style.left === (100 + 200 - 1) + 'px', 'flyout to the right of the menu, borders overlapping');
ok(fly.children[1].className.includes('na-le-menu__item--mixed') && fly.children[1].className.includes('--hinted'), 'mixed ring and hint in the flyout');
ok(!fly.children[0].className.includes('--submenu'), 'flyout rows open nothing further');
winFire('pointerdown', { target : fly.children[0] });
ok(M.Na__LeMenu__IsOpen() && menus().length === 2, 'a press inside the flyout belongs to the menu');
winFire('scroll', { target : fly });
ok(M.Na__LeMenu__IsOpen() && menus().length === 2, 'a scroll inside the flyout belongs to the menu');
const esc1 = winFire('keydown', { key : 'Escape' });
ok(esc1.stopped && esc1.defaultPrevented, 'the flyout Escape goes no further');
ok(M.Na__LeMenu__IsOpen() && menus().length === 1 && !row.classList.contains('na-le-menu__item--open') && doc.activeElement === row, 'Escape closes the flyout first, focus back on the row');
const esc2 = winFire('keydown', { key : 'Escape' });
ok(!M.Na__LeMenu__IsOpen() && menus().length === 0 && !esc2.stopped, 'the second Escape closes the menu');

// Click opens at once; a pick in the flyout runs and closes both; a neighbour row books the close.
M.Na__LeMenu__Open(100, 100, [ { label : 'Layer', submenu : [ { label : 'Notes', onSelect : () => { layer = 'n'; } } ] }, { label : 'Undo' } ]);
flush(0);
root = menus()[0];
const ev = root.children[0].fire('click');
ok(ev.defaultPrevented && menus().length === 2, 'a click opens the flyout at once');
root.children[1].fire('pointerenter');
flush(299);
ok(menus().length === 2, 'grace period holds the flyout');
menus()[1].fire('pointerenter');
flush(1000);
ok(menus().length === 2, 'reaching the flyout calls the close off');
root.children[1].fire('pointerenter');
flush(300);
ok(menus().length === 1 && M.Na__LeMenu__IsOpen(), 'another row closes the flyout after 300 ms');
root.children[0].fire('keydown', { key : 'ArrowRight' });
fly = menus()[1];
ok(fly && doc.activeElement === fly.children[0], 'ArrowRight opens and focuses the first row');
fly.fire('keydown', { key : 'ArrowLeft' });
ok(menus().length === 1 && doc.activeElement === root.children[0], 'ArrowLeft goes back to the row');
root.children[0].fire('click');
menus()[1].children[0].fire('click');
ok(layer === 'n' && !M.Na__LeMenu__IsOpen() && menus().length === 0, 'a flyout pick runs and closes both cards');

// Flyout flips to the left near the right edge.
M.Na__LeMenu__Open(790, 100, [ { label : 'Layer', submenu : [ { label : 'Notes' } ] } ]);
flush(0);
menus()[0].children[0].fire('click');
ok(menus()[1].style.left === (790 - 200 + 1) + 'px', 'flyout opens to the left where the window has no room');
M.Na__LeMenu__Close();
ok(menus().length === 0 && !M.Na__LeMenu__IsOpen(), 'Close takes both cards');

// 3. Hover tooltip.
T.Na__LeHoverTip__Show('Broken: EW09 is not in the specification', 100, 100);
let tip = doc.body.children.find((c) => c.className === 'na-le-hovertip');
ok(tip && tip.hidden === false && tip.style.left === '114px' && tip.style.top === '114px', 'shown 14 px off the pointer');
T.Na__LeHoverTip__Show('Loggia Arcade', 950, 790, { lead : 'EW01' });
ok(tip.children[0].className === 'na-le-hovertip__lead' && tip.children[0].textContent === 'EW01' && tip.textContent === 'EW01Loggia Arcade', 'bold lead before the text');
ok(tip.style.left === (950 - 14 - 120) + 'px' && tip.style.top === (790 - 14 - 20) + 'px', 'flipped inside the window near the edges');
T.Na__LeHoverTip__Show('', 0, 0);
ok(tip.hidden === true, 'empty text hides it');
T.Na__LeHoverTip__Show('x', 1, 1); T.Na__LeHoverTip__Hide();
ok(tip.hidden === true && doc.body.children.filter((c) => c.className === 'na-le-hovertip').length === 1, 'Hide hides; one shared element');

console.log('W2-20 menu and tooltip check: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
