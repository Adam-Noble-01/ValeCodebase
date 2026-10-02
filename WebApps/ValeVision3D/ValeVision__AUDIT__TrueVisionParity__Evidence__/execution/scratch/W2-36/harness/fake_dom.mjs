// The smallest DOM the four panels touch while building and refreshing: elements with attributes,
// children, classes, hidden, value / checked, a querySelector for [attr="v"], .class and a tag name.
export class El {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase();
        this.attrs = {}; this.children = []; this.parentNode = null;
        this.hidden = false; this.textContent = ''; this.title = ''; this.value = ''; this.checked = false;
        this.disabled = false; this.style = {}; this.className = '';
        const self = this;
        this.classList = {
            add : (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [ ...s ].join(' '); },
            remove : (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
            contains : (c) => self.className.split(/\s+/).includes(c),
            toggle : (c, on) => { if (on === undefined) on = !self.classList.contains(c); if (on) self.classList.add(c); else self.classList.remove(c); }
        };
    }
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
    get innerHTML() { return this._html || ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    insertBefore(c, ref) { c.parentNode = this; const i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
    replaceWith() {}
    addEventListener() {}
    removeEventListener() {}
    focus() {} select() {} blur() {}
    closest() { return null; }
    matches(sel) {
        let m = sel.match(/^\[([a-z-]+)="([^"]+)"\]$/);
        if (m) return this.getAttribute(m[1]) === m[2];
        m = sel.match(/^\.([A-Za-z0-9_-]+)$/);
        if (m) return this.classList.contains(m[1]);
        if (/^[a-z]+$/.test(sel)) return this.tagName === sel.toUpperCase();
        throw new Error('fake_dom: unsupported selector ' + sel);
    }
    querySelectorAll(sel) {
        const out = [];
        const walk = (el) => { for (const c of el.children) { if (c.matches && c.matches(sel)) out.push(c); walk(c); } };
        walk(this);
        return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

export function installDom() {
    const head = new El('head');
    const target = new EventTarget();
    globalThis.document = { head, activeElement : null, createElement : (tag) => new El(tag), addEventListener() {}, removeEventListener() {} };
    globalThis.window = globalThis;
    globalThis.addEventListener = target.addEventListener.bind(target);
    globalThis.removeEventListener = target.removeEventListener.bind(target);
    globalThis.dispatchEvent = target.dispatchEvent.bind(target);
    return { head };
}
