// W2-04 scratch: a small DOM good enough for the Dev-menu panels (class selectors, contains, click,
// change/input events) and the browser globals ValeVision's modules touch at evaluation time.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bus   = new EventTarget();
const store = new Map();

class StubClassList {
    constructor(el) { this.el = el; }
    get set() { return new Set(String(this.el.className || '').split(/\s+/).filter(Boolean)); }
    write(s) { this.el.className = Array.from(s).join(' '); }
    add(...c) { const s = this.set; c.forEach((x) => s.add(x)); this.write(s); }
    remove(...c) { const s = this.set; c.forEach((x) => s.delete(x)); this.write(s); }
    toggle(c, on) { const s = this.set; const want = (on === undefined) ? !s.has(c) : !!on; if (want) s.add(c); else s.delete(c); this.write(s); return want; }
    contains(c) { return this.set.has(c); }
}

export class StubElement {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.dataset = {};
        this.attributes = {}; this.listeners = {}; this.className = ''; this._text = ''; this.hidden = false; this.disabled = false;
        this.value = ''; this.checked = false; this.type = ''; this.title = ''; this.id = '';
        this.classList = new StubClassList(this);
    }
    get textContent() { return this._text + this.children.map((c) => c.textContent || '').join(''); }
    set textContent(v) { this._text = String(v); this.children = []; }
    get innerHTML() { return ''; }
    set innerHTML(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; this._text = ''; }
    get firstChild() { return this.children[0] || null; }
    get lastChild() { return this.children[this.children.length - 1] || null; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === globalThis.document.body; }
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); if (c.id) byId.set(c.id, c); return c; }
    insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); const i = ref ? this.children.indexOf(ref) : -1; c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
    append(...c) { c.forEach((x) => this.appendChild(x)); }
    prepend(...c) { c.reverse().forEach((x) => this.insertBefore(x, this.children[0] || null)); }
    replaceChildren(...c) { this.children.forEach((x) => { x.parentNode = null; }); this.children = []; c.forEach((x) => this.appendChild(x)); }
    replaceWith(n) { const p = this.parentNode; if (!p) return; const i = p.children.indexOf(this); p.children[i] = n; n.parentNode = p; this.parentNode = null; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    contains(n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
    setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    hasAttribute(k) { return k in this.attributes; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }
    dispatch(type, extra) { const ev = Object.assign({ type, target : this, currentTarget : this, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} }, extra || {}); (this.listeners[type] || []).slice().forEach((f) => f(ev)); return ev; }
    dispatchEvent(ev) { (this.listeners[ev.type] || []).slice().forEach((f) => f(ev)); return true; }
    click() { if (!this.disabled) this.dispatch('click'); }
    focus() { globalThis.document.activeElement = this; }
    blur() { if (globalThis.document.activeElement === this) globalThis.document.activeElement = null; }
    getBoundingClientRect() { return { left : 0, top : 0, width : 100, height : 20, right : 100, bottom : 20 }; }
    matchesSel(sel) {
        sel = sel.trim();
        if (sel.startsWith('#')) return this.id === sel.slice(1);
        const parts = sel.split('.').filter(Boolean);
        const tagFirst = !sel.startsWith('.');
        if (tagFirst && parts[0].toUpperCase() !== this.tagName) return false;
        const classes = tagFirst ? parts.slice(1) : parts;
        return classes.every((c) => this.classList.contains(c));
    }
    all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
    querySelectorAll(sel) { const alts = sel.split(','); return this.all((n) => alts.some((s) => n.matchesSel(s.trim().split(/\s+/).pop()))); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    closest(sel) { let n = this; while (n) { if (n.matchesSel && n.matchesSel(sel)) return n; n = n.parentNode; } return null; }
    focusFirst() {}
    getContext() { return { measureText : (t) => ({ width : String(t).length * 7 }), fillText() {}, fillRect() {}, clearRect() {}, beginPath() {}, stroke() {}, fill() {}, save() {}, restore() {}, moveTo() {}, lineTo() {}, arc() {} }; }
}

const byId = new Map();
export { byId, bus, store };

export function installDom() {
    globalThis.window = globalThis;
    globalThis.addEventListener    = bus.addEventListener.bind(bus);
    globalThis.removeEventListener = bus.removeEventListener.bind(bus);
    globalThis.dispatchEvent       = bus.dispatchEvent.bind(bus);
    globalThis.localStorage   = { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => store.set(k, String(v)), removeItem : (k) => store.delete(k) };
    globalThis.sessionStorage = { getItem : () => null, setItem : () => {}, removeItem : () => {} };
    Object.defineProperty(globalThis, 'location', { value : { search : '?project=2026/3047__Doous', hostname : 'localhost', host : 'localhost:8000', origin : 'http://localhost:8000', protocol : 'http:', pathname : '/ValeVision3D/index.html', href : 'http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous' }, configurable : true });
    const body = new StubElement('body');
    globalThis.document = {
        body, activeElement : null,
        createElement : (t) => new StubElement(t),
        createTextNode : (t) => { const n = new StubElement('#text'); n._text = String(t); return n; },
        createDocumentFragment : () => new StubElement('#fragment'),
        getElementById : (id) => byId.get(id) || body.all((n) => n.id === id)[0] || null,
        querySelector : (s) => body.querySelector(s), querySelectorAll : (s) => body.querySelectorAll(s),
        addEventListener() {}, removeEventListener() {},
        documentElement : new StubElement('html'),
        head : new StubElement('head'),
        visibilityState : 'visible', hidden : false
    };
    globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 0);
    globalThis.cancelAnimationFrame  = (h) => clearTimeout(h);
    globalThis.getComputedStyle = () => ({ getPropertyValue : () => '' });
    try { Object.defineProperty(globalThis, 'navigator', { value : { userAgent : 'node', clipboard : {} }, configurable : true }); } catch (e) { /* node 21+ has one */ }
    globalThis.Image = class { set src(v) { setTimeout(() => this.onerror && this.onerror(), 0); } };
    globalThis.CustomEvent = globalThis.CustomEvent || class extends Event { constructor(t, o) { super(t); this.detail = o && o.detail; } };
}

export function fileFetch(handler) {
    globalThis.fetch = async (u, init) => {
        const s = String(u);
        if (s.startsWith('file:')) { const text = readFileSync(fileURLToPath(s), 'utf8'); return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text }; }
        return handler(s, init || {});
    };
}
