// Recording stand-in for Na__LayoutEditor__PanelHost__ (only what the Patterns panel calls).
import { El } from './fake_dom.mjs';

export const LOG = [];
export const SECTIONS = new Map();     // id -> { side, spec, body, visible }
export const CONTROLS = [];

export function Na__LePanels__RegisterSection(side, spec) {
    const body = new El('div');
    body.className = 'na-le-section__body';
    spec.build(body);
    const entry = { side, spec, body, visible : true };
    SECTIONS.set(spec.id, entry);
    LOG.push([ 'register', side, spec.id, spec.tab === undefined ? null : spec.tab, spec.title ]);
    return entry;
}
export function Na__LePanels__SetSectionVisible(id, visible) { LOG.push([ 'visible', id, !!visible ]); const s = SECTIONS.get(id); if (s) s.visible = !!visible; }
export function Na__LePanels__Refresh(id) { LOG.push([ 'refresh', id ]); const s = SECTIONS.get(id); if (s) s.spec.refresh(s.body); }
export function Na__LePanels__OnControl(type, id) { CONTROLS.push(type + ':' + id); }
export function Na__LePanels__Row(label, control, cls) { const row = new El('div'); row.label = label; row.appendChild(control); if (cls) row.className = cls; return row; }
export function Na__LePanels__Select(id, options, value) { const el = new El('select'); el.setAttribute('data-na-control', id); el.options = options; el.value = value; return el; }
export function Na__LePanels__FillSelect(el, options, value) { if (el) { el.options = options; el.value = value; } }
export function Na__LePanels__Input(type, id, opts) { const el = new El('input'); el.type = type; el.setAttribute('data-na-control', id); el.opts = opts || null; el.value = ''; return el; }
export function Na__LePanels__Button(label, id) { const el = new El('button'); el.textContent = label; el.setAttribute('data-na-control', id); return el; }
export function Na__LePanels__Note(text) { const el = new El('p'); el.className = 'na-le-note'; el.textContent = text; return el; }
