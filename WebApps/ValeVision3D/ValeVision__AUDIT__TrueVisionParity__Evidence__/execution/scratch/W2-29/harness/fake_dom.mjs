// The smallest DOM the Patterns panel touches: elements with attributes, children, hidden and innerHTML,
// a querySelector for [data-na-*="..."], and document.createElement / document.head / document.activeElement.
export class El {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.children = []; this.hidden = false; this.innerHTML = ''; this.textContent = ''; this.className = ''; this.title = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    appendChild(c) { this.children.push(c); return c; }
    querySelector(sel) {
        const m = sel.match(/^\[([a-z-]+)="([^"]+)"\]$/);
        if (!m) throw new Error('fake_dom: unsupported selector ' + sel);
        const walk = (el) => { for (const c of el.children) { if (c.getAttribute && c.getAttribute(m[1]) === m[2]) return c; const f = walk(c); if (f) return f; } return null; };
        return walk(this);
    }
    closest() { return null; }
    blur() {}
}

export function installDom() {
    const head = new El('head');
    globalThis.document = { head, activeElement : null, createElement : (tag) => new El(tag) };
    const target = new EventTarget();
    globalThis.window = globalThis;
    globalThis.addEventListener = target.addEventListener.bind(target);
    globalThis.dispatchEvent = target.dispatchEvent.bind(target);
    return { head };
}
