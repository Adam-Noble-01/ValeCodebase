// W2-31 acceptance harness (scratch; not a repository test).
// Loads the REAL SpecEditor Bar, SpecEditor State/Builders, SpecLockstep and the Statement Writer's
// pure lockstep leaf, with the specification data, config, project data and sheet model stubbed and a
// small fake DOM, and checks both acceptance items; then static checks on the ModeController's hunks.
// Usage: node w2_31_acceptance.mjs [--src <app root or candidate root>] [--mutants]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const SRC  = ARGS.includes('--src') ? ARGS[ARGS.indexOf('--src') + 1] : 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const LIVE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const LE   = '02__Src__AppModules/51__System__LayoutEditor/';
const P = {
    bar   : LE + '50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js',
    lock  : LE + '50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js',
    state : LE + '50__Feature__Specification/Na__LayoutEditor__SpecEditor__State__.js',
    build : LE + '50__Feature__Specification/Na__LayoutEditor__SpecEditor__Builders__.js',
    stmt  : LE + '52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js',
    mc    : LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
};
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// -----------------------------------------------------------------------------
// A small fake DOM: enough for the bar, its builders and the question card
// -----------------------------------------------------------------------------
function makeDom() {
    const listeners = new Map();
    const win = {
        addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
        removeEventListener() {},
        dispatchEvent(ev) { (listeners.get(ev.type) || []).forEach((fn) => fn(ev)); return true; },
        localStorage : { getItem : () => null, setItem : () => {} }
    };
    class El {
        constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {};
                           this._text = ''; this.className = ''; this.hidden = false; this.disabled = false; this.title = ''; this.ls = {}; this.style = {}; }
        get classList() {
            const self = this;
            const list = () => self.className.split(/\s+/).filter(Boolean);
            return {
                add(c) { if (!list().includes(c)) self.className = (self.className + ' ' + c).trim(); },
                remove(c) { self.className = list().filter((x) => x !== c).join(' '); },
                toggle(c, on) { const has = list().includes(c); const want = on === undefined ? !has : !!on; if (want && !has) this.add(c); if (!want && has) this.remove(c); return want; },
                contains(c) { return list().includes(c); }
            };
        }
        set textContent(v) { this.children = []; this._text = String(v); }
        get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
        set innerHTML(v) { if (v !== '') throw new Error('fake DOM: innerHTML only clears'); this.children = []; this._text = ''; }
        get firstChild() { return this.children[0] || null; }
        get childElementCount() { return this.children.length; }
        appendChild(n) { if (n.parentNode) n.parentNode.children.splice(n.parentNode.children.indexOf(n), 1); n.parentNode = this; this.children.push(n); return n; }
        insertBefore(n, ref) { if (n.parentNode) n.parentNode.children.splice(n.parentNode.children.indexOf(n), 1); n.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); return n; }
        setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
        getAttribute(k) {
            if (k === 'class') return this.className;
            if (k.startsWith('data-')) { const camel = k.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase()); if (this.dataset[camel] !== undefined) return String(this.dataset[camel]); }
            return this.attrs[k] !== undefined ? this.attrs[k] : null;
        }
        addEventListener(type, fn) { (this.ls[type] = this.ls[type] || []).push(fn); }
        fire(type, ev) { const e = Object.assign({ type, stopPropagation() {}, preventDefault() { this.defaultPrevented = true; } }, ev || {}); (this.ls[type] || []).forEach((fn) => fn(e)); return e; }
        click() { if (!this.disabled) this.fire('click'); }
        focus() { doc.activeElement = this; }
        descendants() { const out = []; const walk = (n) => n.children.forEach((c) => { out.push(c); walk(c); }); walk(this); return out; }
        matches(sel) { return sel.split(',').some((s) => matchOne(this, s.trim())); }
        querySelectorAll(sel) { return this.descendants().filter((n) => n.matches(sel)); }
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    }
    function matchOne(el, sel) {
        const re = /^([a-z]+)?((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/i;
        const m = re.exec(sel);
        if (!m) throw new Error('fake DOM: selector not supported: ' + sel);
        if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
        const classes = (m[2] || '').split('.').filter(Boolean);
        if (!classes.every((c) => el.classList.contains(c))) return false;
        const attrs = [ ...(m[3] || '').matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g) ];
        return attrs.every((a) => { const v = el.getAttribute(a[1]); return a[2] === undefined ? v !== null : v === a[2]; });
    }
    const doc = { activeElement : null, createElement : (t) => new El(t), body : new El('body'), getElementById : () => null };
    return { win, doc, El };
}

// -----------------------------------------------------------------------------
// The world the stubs read
// -----------------------------------------------------------------------------
const STUBS = {
    [LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js'] : `
        const W = () => globalThis.__w2_31;
        function Na__LeCfg__GetLabel(k, fb) { const o = W().labels || {}; return o[k] !== undefined ? o[k] : fb; }
        function Na__LeCfg__FormatLabel(k, fb, tokens) { return String(Na__LeCfg__GetLabel(k, fb)).replace(/\\{(\\w+)\\}/g, (m, n) => (tokens && tokens[n] !== undefined) ? String(tokens[n]) : m); }
        export { Na__LeCfg__GetLabel, Na__LeCfg__FormatLabel };`,
    [LE + '50__Feature__Specification/Na__LayoutEditor__SpecData__.js'] : `
        const W = () => globalThis.__w2_31;
        const Na__LeSpec__STATUS_NEW = 'new', Na__LeSpec__STATUS_FAILED = 'failed';
        const Na__LeSpec__CHANGED_EVENT = 'na-layouteditor-spec-changed';
        function Na__LeSpec__GetState() { return Object.assign({}, W().state); }
        function Na__LeSpec__GetGroups() { return W().groups || []; }
        function Na__LeSpec__ListNotes() { return W().notes || []; }
        function Na__LeSpec__CanUndo() { return false; }
        function Na__LeSpec__CanRedo() { return false; }
        function Na__LeSpec__GetRevision() { return 'B'; }
        function Na__LeSpec__GetDocumentNumber(code) { W().numberAskedWith.push(code); return (code || '') + '_SPEC'; }
        function Na__LeSpec__CanReloadCloud() { return true; }
        function Na__LeSpec__CanReloadLocal() { return true; }
        function Na__LeSpec__GetConflict() { return W().conflict; }
        async function Na__LeSpec__ResolveConflict(choice) { W().answers.push(choice); if (W().resolveClears) W().conflict = null; }
        export { Na__LeSpec__STATUS_NEW, Na__LeSpec__STATUS_FAILED, Na__LeSpec__CHANGED_EVENT, Na__LeSpec__GetState, Na__LeSpec__GetGroups,
                 Na__LeSpec__ListNotes, Na__LeSpec__CanUndo, Na__LeSpec__CanRedo, Na__LeSpec__GetRevision, Na__LeSpec__GetDocumentNumber,
                 Na__LeSpec__CanReloadCloud, Na__LeSpec__CanReloadLocal, Na__LeSpec__GetConflict, Na__LeSpec__ResolveConflict };`,
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js' : `
        const W = () => globalThis.__w2_31;
        function Na__DrawData__GetProjectCode() { return W().token; }
        function Na__DrawData__GetDocumentCode() { return W().docCode; }
        export { Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode };`,
    [LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'] : `
        function Na__LeModel__GetTabLabel(sheet) { return sheet ? sheet.Sheet__Name : ''; }
        export { Na__LeModel__GetTabLabel };`,
    [LE + '66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js'] : `
        function Na__LeShareUi__Open() { globalThis.__w2_31.shared = true; }
        export { Na__LeShareUi__Open };`
};

let RUN = 0;
async function loadUnits(texts) {
    const dir = path.join(HERE, 'tree', 'run' + (++RUN) + '_' + process.pid);
    const files = Object.assign({}, STUBS, texts);
    for (const [rel, text] of Object.entries(files)) {
        const p = path.join(dir, rel);
        fs.mkdirSync(path.dirname(p), { recursive : true });
        fs.writeFileSync(p, text);
    }
    fs.writeFileSync(path.join(dir, 'package.json'), '{ "type": "module" }');
    const imp = (rel) => import(url.pathToFileURL(path.join(dir, rel)).href);
    return { bar : await imp(P.bar), lock : await imp(P.lock), state : await imp(P.state), stmt : await imp(P.stmt), dir };
}

// -----------------------------------------------------------------------------
// The cases
// -----------------------------------------------------------------------------
async function runCases(texts, quiet) {
    const results = [];
    const check = (name, ok, extra) => { results.push({ name, ok : !!ok }); if (!quiet) console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra)); };
    const dom = makeDom();
    globalThis.window = dom.win; globalThis.document = dom.doc;
    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
    const fileIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const base = { loaded : true, editable : true, syncing : false, dirty : false, status : 'ok', lastSyncIso : null, canSync : true,
                   conflict : false, lockstep : false, fileKnown : false, inStepWithFile : false, savingLocal : false, fileIso : null };
    const W = globalThis.__w2_31 = { state : Object.assign({}, base), notes : [ {}, {} ], groups : [ {} ], token : '2026/3047__Doous', docCode : '3047',
                                     numberAskedWith : [], conflict : null, answers : [], resolveClears : true, labels : {} };
    let u;
    try { u = await loadUnits(texts); } catch (e) { check('units link and load', false, e.message); return results; }
    check('units link and load (Bar, State, Builders, SpecLockstep, Statement leaf)', true);

    // ---- the bar -------------------------------------------------------------
    const barEl = dom.doc.createElement('div'), alertsEl = dom.doc.createElement('div');
    u.state.Na__LeSpecEd__AssignBar(barEl); u.state.Na__LeSpecEd__AssignAlerts(alertsEl); u.state.Na__LeSpecEd__AssignEditable(true);
    const usage = { broken : [], unknown : new Map(), matching : new Map() };
    u.state.Na__LeSpecEd__AssignUsage(usage);
    u.bar.Na__LeSpecEd__BuildBar();
    const status = () => barEl.querySelector('[data-na-spec-bar="status"]');
    const show = (over) => { W.state = Object.assign({}, base, over); u.bar.Na__LeSpecEd__UpdateBar(); u.bar.Na__LeSpecEd__RenderAlerts(W.state, usage); return status(); };
    const alertTexts = () => alertsEl.querySelectorAll('.na-le-spec__alert').map((a) => a.textContent);

    check('the bar builds with no Share button (1.3.0; Share is 1.4.0, W4-08)', !barEl.querySelector('[data-na-spec="share"]') && barEl.querySelector('[data-na-spec="print"]') && barEl.querySelector('[data-na-spec="download"]'));

    let s = show({ lockstep : true, fileKnown : true, conflict : true, dirty : true, fileIso });
    check('lockstep on, question up -> "Out of step with the file" (failed)', s.textContent === 'Out of step with the file' && s.getAttribute('data-state') === 'failed', s.textContent);
    check('  ... with the out-of-step alert above the groups', alertTexts().some((t) => /out of step\. Nothing is saved or synced until you choose/.test(t)), alertTexts().join(' | '));
    const when = u.stmt.Na__LeStmtLock__When(fileIso);
    check('  ... and the file-date hover ("last changed ' + when + '")', s.title.indexOf('The specification file on disk was last changed ' + when + '.') === 0, s.title);
    s = show({ lockstep : true, fileKnown : true, conflict : true, syncing : true, fileIso });
    check('lockstep on, question up while syncing -> still "Out of step with the file"', s.textContent === 'Out of step with the file', s.textContent);
    s = show({ lockstep : true, fileKnown : true, savingLocal : true, dirty : true, fileIso });
    check('lockstep on, writing the file -> "Saving..." (syncing)', s.textContent === 'Saving...' && s.getAttribute('data-state') === 'syncing', s.textContent);
    s = show({ lockstep : true, fileKnown : true, inStepWithFile : false, dirty : true, fileIso });
    check('lockstep on, edits the autosave has not written -> "Unsaved changes" (dirty)', s.textContent === 'Unsaved changes' && s.getAttribute('data-state') === 'dirty', s.textContent);
    s = show({ lockstep : true, fileKnown : true, inStepWithFile : true, dirty : true, fileIso });
    check('lockstep on, file written, cloud not -> "Saved to file, not synced"', s.textContent === 'Saved to file, not synced', s.textContent);
    check('  ... no out-of-step alert when there is no question', !alertTexts().some((t) => /out of step/.test(t)));
    s = show({ lockstep : true, fileKnown : true, inStepWithFile : true, dirty : false, lastSyncIso : new Date().toISOString(), fileIso });
    check('lockstep on, in step with file and cloud -> the cloud state ("Synced ...")', /^Synced /.test(s.textContent), s.textContent);
    s = show({ lockstep : false, dirty : true });
    check('lockstep off -> the old wording "Unsynced - kept in this browser", no hover', s.textContent === 'Unsynced - kept in this browser' && s.title === '', s.textContent + ' / ' + s.title);
    s = show({ lockstep : true, fileKnown : false, dirty : true });
    check('lockstep on but no file read yet -> the old wording, no hover', s.textContent === 'Unsynced - kept in this browser' && s.title === '', s.textContent);
    s = show({ lockstep : false, dirty : false, status : 'new' });
    check('lockstep off, never synced -> "Not in the cloud yet"', s.textContent === 'Not in the cloud yet', s.textContent);

    // OC-09: the bar's code is the project's own code, never the ?project= token
    W.numberAskedWith = [];
    show({ lockstep : false });
    const summary = barEl.querySelector('[data-na-spec-bar="summary"]').textContent;
    check('OC-09: the summary leads with the project\'s own code (3047), not the ?project= token', summary.indexOf('3047 ·') === 0 && summary.indexOf('2026/') === -1, summary);
    check('OC-09: the document number defaults from the project\'s own code', W.numberAskedWith.length > 0 && W.numberAskedWith.every((c) => c === '3047'), JSON.stringify(W.numberAskedWith));
    W.docCode = null; W.numberAskedWith = [];
    show({ lockstep : false });
    const summary2 = barEl.querySelector('[data-na-spec-bar="summary"]').textContent;
    check('OC-09: with no project code known the summary shows no code (never the folder id)', summary2.indexOf('2026/') === -1, summary2);
    W.docCode = '3047';

    // ---- the question card ---------------------------------------------------
    const host = dom.doc.createElement('div');
    W.conflict = null;
    check('Mount answers true once', u.lock.Na__LeSpecLock__Mount(host) === true);
    check('  ... and false the second time (one card per host)', u.lock.Na__LeSpecLock__Mount(host) === false);
    check('nothing is built until there is a question', host.children.length === 0 && !u.lock.Na__LeSpecLock__IsShown());
    W.conflict = { kind : 'both', appIso : new Date(Date.now() - 60000).toISOString(), fileIso, newer : 'app', appFrom : 'app', fileName : 'ValeVision__DrawingNotes__.json',
                   summary : { onlyInFile : [ 'GN03' ], onlyInApp : [], changed : [ { app : 'SN01', file : 'SN01' } ], appNotes : 12, fileNotes : 13 } };
    dom.win.dispatchEvent(new globalThis.CustomEvent('na-layouteditor-spec-changed', { detail : { reason : 'conflict' } }));
    const root = host.querySelector('.na-le-spec-lock');
    check('a conflict raises the card over the host', !!root && u.lock.Na__LeSpecLock__IsShown() && root.getAttribute('role') === 'alertdialog');
    const app  = root && root.querySelector('.na-le-spec-lock__choice[data-choice="app"]');
    const file = root && root.querySelector('.na-le-spec-lock__choice[data-choice="file"]');
    check('  ... "both" lead names the file\'s time', root && /changed outside the app .* while the app had changes of its own/.test(root.querySelector('.na-le-spec-lock__lead').textContent));
    check('  ... what differs names the codes', root && root.querySelector('.na-le-spec-lock__differs').textContent === 'What differs: 1 note only in the file (GN03) · 1 note worded or numbered differently (SN01).', root && root.querySelector('.na-le-spec-lock__differs').textContent);
    check('  ... the newer copy (app) is badged and has the focus', app && app.classList.contains('is-newer') && !file.classList.contains('is-newer') && dom.doc.activeElement === app);
    check('  ... the file answer names this app\'s notes file', file && file.querySelector('.na-le-spec-lock__kind').textContent.indexOf('ValeVision__DrawingNotes__.json') === 0);
    const esc = root.fire('keydown', { key : 'Escape' });
    check('Escape does nothing (no way out but an answer)', esc.defaultPrevented && u.lock.Na__LeSpecLock__IsShown());
    root.fire('keydown', { key : 'Tab' });
    check('Tab moves between the two answers only', dom.doc.activeElement === file);
    file.click();
    await new Promise((r) => setTimeout(r, 0));
    check('"Load the specification file" answers ResolveConflict(\'file\') and the card goes', W.answers.join() === 'file' && !u.lock.Na__LeSpecLock__IsShown());
    W.conflict = Object.assign({}, W.conflict, { kind : 'file', newer : 'file' });
    dom.win.dispatchEvent(new globalThis.CustomEvent('na-layouteditor-spec-changed', { detail : { reason : 'conflict' } }));
    check('asked again: the file-only lead, the file badged', u.lock.Na__LeSpecLock__IsShown() && /changed outside the app .* Nothing in the app is unsaved/.test(root.querySelector('.na-le-spec-lock__lead').textContent) && file.classList.contains('is-newer'));
    W.conflict = null;
    dom.win.dispatchEvent(new globalThis.CustomEvent('na-layouteditor-spec-changed', { detail : { reason : 'loaded' } }));
    check('answered some other way (a reload): the card goes', !u.lock.Na__LeSpecLock__IsShown());

    fs.rmSync(u.dir, { recursive : true, force : true });
    return results;
}

// -----------------------------------------------------------------------------
// The ModeController hunks (static: the file is the editor's hub, its graph is G1/G2's)
// -----------------------------------------------------------------------------
function fnBody(text, name) {
    const at = text.indexOf('function ' + name + '(');
    if (at < 0) return '';
    let i = text.indexOf('{', at), depth = 0;
    for (let j = i; j < text.length; j++) { if (text[j] === '{') depth++; else if (text[j] === '}' && --depth === 0) return text.slice(i, j + 1); }
    return '';
}
function checkModeController(text, quiet) {
    const results = [];
    const check = (name, ok) => { results.push({ name, ok : !!ok }); if (!quiet) console.log((ok ? '  PASS ' : '  FAIL ') + name); };
    const code = text.replace(/\r\n/g, '\n').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    check('MC imports StartWatch and StopWatch from the SpecData barrel', /import \{[^}]*Na__LeSpec__StartWatch, Na__LeSpec__StopWatch \} from '\.\.\/50__Feature__Specification\/Na__LayoutEditor__SpecData__\.js';/.test(code));
    check('MC imports Na__LeSpecLock__Mount from SpecLockstep', code.includes("import { Na__LeSpecLock__Mount } from '../50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js';"));
    const build = fnBody(code, 'Na__LeMode__Build');
    const viewerBranch = build.slice(build.indexOf('if (viewer) {'), build.indexOf('return;', build.indexOf('if (viewer) {')));
    const mounts = (build.match(/Na__LeSpecLock__Mount\(/g) || []).length;
    check('MC Build mounts the card exactly once, only when editable', mounts === 1 && /if \(editable\) Na__LeSpecLock__Mount\(host\);/.test(build));
    check('MC Build: the web viewer\'s branch (which returns) never mounts it', viewerBranch.length > 0 && !viewerBranch.includes('SpecLock') && build.indexOf('Na__LeSpecLock__Mount') > build.indexOf('return;', build.indexOf('if (viewer) {')));
    check('MC Build: mounted straight after the specification page', /Na__LeSpecEd__Mount\(host, \{ editable : editable, showToast : toast \}\);[^\n]*\n\s*if \(editable\) Na__LeSpecLock__Mount\(host\);/.test(build));
    const enter = fnBody(code, 'Na__LeMode__Enter');
    const inactive = enter.slice(enter.indexOf('if (!Na__LeMode__Active) {'), enter.indexOf('const specLoad'));
    const fromSpec = enter.slice(enter.indexOf('if (fromSpec) {'), enter.indexOf('if (!Na__LeMode__Active) {'));
    check('MC Enter: StartWatch once, in the open-from-the-3D-view block, guarded off the viewer', (enter.match(/Na__LeSpec__StartWatch\(/g) || []).length === 1 && /if \(!Na__LeVw__IsViewerMode\(\)\) Na__LeSpec__StartWatch\(\);/.test(inactive));
    check('MC Enter: no StartWatch on the return from the specification page', fromSpec.length > 0 && !fromSpec.includes('StartWatch'));
    const leave = fnBody(code, 'Na__LeMode__Leave');
    check('MC Leave: StopWatch straight after the Active guard', /if \(!Na__LeMode__Active\) return false;\n\s*Na__LeSpec__StopWatch\(\);/.test(leave));
    check('MC: StopWatch nowhere else, StartWatch nowhere else', (code.match(/Na__LeSpec__StopWatch\(/g) || []).length === 1 && (code.match(/Na__LeSpec__StartWatch\(/g) || []).length === 1);
    check('MC: the open/return paths still call TrueVision\'s EnterUnder -> Enter (OpenSpecification from the 3D view starts the watch through Enter)', /function Na__LeMode__OpenSpecification\(/.test(code));
    return results;
}

// -----------------------------------------------------------------------------
// Main: the source, then planted faults that must be caught
// -----------------------------------------------------------------------------
const texts = { [P.bar] : read(SRC, P.bar), [P.lock] : read(SRC, P.lock), [P.state] : read(LIVE, P.state), [P.build] : read(LIVE, P.build), [P.stmt] : read(LIVE, P.stmt) };
console.log('W2-31 acceptance - source: ' + SRC);
const r1 = await runCases(texts, false);
const r2 = checkModeController(read(SRC, P.mc), false);
const all = r1.concat(r2);
const failed = all.filter((r) => !r.ok).length;
console.log('W2-31 acceptance: ' + (all.length - failed) + '/' + all.length + ' PASS');

if (ARGS.includes('--mutants')) {
    const swap = (rel, a, b) => { const t = texts[rel]; if (!t.includes(a)) throw new Error('mutant anchor missing: ' + a); return Object.assign({}, texts, { [rel] : t.replace(a, b) }); };
    const mc = read(SRC, P.mc);
    const mutants = [
        [ 'Bar reads the ?project= token (OC-09 undone)', () => runCases(((x) => Object.assign(x, { [P.bar] : x[P.bar].replace('import { Na__DrawData__GetDocumentCode }', 'import { Na__DrawData__GetProjectCode }') }))(swap(P.bar, 'const code  = Na__DrawData__GetDocumentCode();', 'const code  = Na__DrawData__GetProjectCode();')), true) ],
        [ 'Bar 1.2.0 status (no out-of-step state)', () => runCases(swap(P.bar, "if (state.conflict)                                 { text = L('SpecStatusOutOfStep', 'Out of step with the file'); flag = 'failed'; }\n        else ", ''), true) ],
        [ 'Bar disk-first wording ignores the lockstep switch', () => runCases(swap(P.bar, 'const onDisk = state.lockstep && state.fileKnown;', 'const onDisk = true;'), true) ],
        [ 'Bar without the out-of-step alert', () => runCases(swap(P.bar, "if (state.conflict) {\n            add('warn'", "if (false) {\n            add('warn'"), true) ],
        [ 'Card answers the wrong copy', () => runCases(swap(P.lock, 'await Na__LeSpec__ResolveConflict(choice);', "await Na__LeSpec__ResolveConflict(choice === 'app' ? 'file' : 'app');"), true) ],
        [ 'MC mounts the card in every session', () => checkModeController(mc.replace('if (editable) Na__LeSpecLock__Mount(host);', 'Na__LeSpecLock__Mount(host);'), true) ],
        [ 'MC starts the watch in the web viewer', () => checkModeController(mc.replace('if (!Na__LeVw__IsViewerMode()) Na__LeSpec__StartWatch();', 'Na__LeSpec__StartWatch();'), true) ],
        [ 'MC starts the watch on the return from the specification', () => checkModeController(mc.replace('Na__LeMode__RestartSheetKeys();                                      // <-- Back from a document tab', 'Na__LeSpec__StartWatch(); Na__LeMode__RestartSheetKeys();                                      // <-- Back from a document tab'), true) ],
        [ 'MC never stops the watch', () => checkModeController(mc.replace('Na__LeSpec__StopWatch();                                                // <-- Looked at again', '// <-- Looked at again'), true) ]
    ];
    // the Bar token mutant needs its own fixture assertion; runCases handles it through the OC-09 checks
    let caught = 0;
    for (const [name, run] of mutants) {
        let res;
        try { res = await run(); } catch (e) { console.log('  MUTANT ERROR ' + name + ': ' + e.message); continue; }
        const hit = res.some((r) => !r.ok);
        if (hit) caught++;
        console.log((hit ? '  caught   ' : '  MISSED   ') + name);
    }
    console.log('W2-31 mutants: ' + caught + '/' + mutants.length + ' caught');
    if (caught !== mutants.length) process.exitCode = 1;
}
if (failed) process.exitCode = 1;
fs.rmSync(path.join(HERE, 'tree'), { recursive : true, force : true });
