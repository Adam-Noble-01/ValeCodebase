// =============================================================================
// VALEVISION3D - TEST - DRAWING REGISTER NUMBERING
// =============================================================================
//
// FILE       : Na__Test__RegisterNumbering__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Drawing Register Numbering Test (the Numbering leaf and the renumbering transactions)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the register numbers a pack exactly as TrueVision's does - series, jumps and refusals -
//              that a renumber, move or delete is one confirmed save whose failure puts every drawing back,
//              and that the document code a phase change names is the project's own code, not the address
// CREATED    : 02-Oct-2026
//
// DESCRIPTION:
// - TRUEVISION HAS NO REGISTER TEST (S07a B7), so this one is written here
//   for the port and offered back.
// - PART 1, THE LEAF. Na__LayoutEditor__Register__Numbering__ imports
//   nothing, so it is loaded as it is and asked every question the register
//   asks it: the default series, its start and width, a letter-led prefix,
//   jumps that start a new run, jumps that go backwards or repeat, and the
//   promise that a plan is validated whole before a single record changes.
// - PART 2, THE TRANSACTIONS. Register__Transactions, Register__Data and
//   Register__DeleteDialog are loaded exactly as the editor loads them; a
//   module hook answers their imports from outside the register (the sheet
//   model, config, autosave, project data, the transport facade, the local
//   mirror and the confirm dialog) with in-memory stand-ins, and a small DOM
//   stand-in carries the saving lock and the typed-number delete box. No
//   request leaves the process and nothing is written anywhere.
// - What R2 failure means here: Na__DrawData__Save answering false. What a
//   local failure means: its report carrying local.ok false. Both are the
//   shapes the real save hands back (W1-05).
// - What this cannot see: the register tab (W4-10), the PDF and the save's
//   real transport. Those are proved in the app and by the transport tests.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__RegisterNumbering__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-18}}
// - Parity        : new (ValeVision-only test of the Drawing Register core, S07a B7; WP-S07a-03)
// - Back-port     : offer to TrueVision, which has no register test; every check holds for its own copies of the
//                   four modules except the phase line's document code (DR-11, ValeVision's accessor).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.0 ({{VVREL:W4-18}})
// - Written with the Drawing Register core: the Numbering leaf's series,
//   jumps and refusals; renumber, jump, move and delete as confirmed saves
//   with their rollback, retry and local-first rules; the document code.
//
// =============================================================================

import { register } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


// -----------------------------------------------------------------------------
// REGION | Paths and the Module Hook
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT   = resolve(SCRIPT_DIR, '..');
    const REGISTER   = join(APP_ROOT, '02__Src__AppModules', '51__System__LayoutEditor', '51__Feature__DrawingRegister');
    const moduleUrl  = (name) => pathToFileURL(join(REGISTER, name)).href;

    // STAND-INS | What the register imports from outside its own folder, by path ending
    // ------------------------------------------------------------
    const STUBS = {
        '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js' : [
            'Na__LeModel__GetSheets', 'Na__LeModel__GetFields', 'Na__LeModel__GetTabLabel', 'Na__LeModel__GetPhase',
            'Na__LeModel__GetDrawingNumber', 'Na__LeModel__ComposeDocumentId', 'Na__LeModel__CleanSheetName',
            'Na__LeModel__ApplySheetName', 'Na__LeModel__FinishRegisterDeletion', 'Na__LeModel__NotifyRegister'
        ],
        '03__Core__Config/Na__LayoutEditor__ConfigState__.js' : [ 'Na__LeCfg__StatusToStore', 'Na__LeCfg__GetDrawingRegisterSetup' ],
        '07__Core__SheetData/Na__LayoutEditor__AutoSave__.js' : [ 'Na__LeAuto__Suspend', 'Na__LeAuto__Resume', 'Na__LeAuto__DiscardSavedDraft' ],
        '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js' : [
            'Na__DrawData__Save', 'Na__DrawData__GetBlock', 'Na__DrawData__GetProjectCode', 'Na__DrawData__GetDocumentCode'
        ],
        '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js' : [
            'Na__CfApi__GetLoadedProjectData', 'Na__CfApi__MergeAndSaveKeys', 'Na__CfApi__ReadProjectData', 'Na__CfApi__ProjectFileLocation'
        ],
        '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js' : [ 'Na__LocalMirror__MergeKeys' ],
        '03__AppUtils/Na__AppUtils__ConfirmDialog.js'        : [ 'Na__AppUtils__ConfirmDialog__Show' ]
    };
    // ------------------------------------------------------------

    // HOOKS | Stand-ins by path ending; the app's .js files read as ES modules
    // ------------------------------------------------------------
    // Hooks run off the main thread, so a stand-in module is generated source
    // that calls through to globalThis.__NaRegStubs on the main thread.
    // ------------------------------------------------------------
    const HOOKS = `
        let STUBS = {};
        let APP = '';
        export async function initialize(data) { STUBS = data.stubs; APP = data.app; }
        export async function resolve(specifier, context, next) {
            const found = await next(specifier, context);
            const ending = Object.keys(STUBS).find((tail) => found.url.endsWith('/02__Src__AppModules/' + tail) || found.url.endsWith('/51__System__LayoutEditor/' + tail));
            return ending ? { url : 'na-stub:' + ending, shortCircuit : true } : found;
        }
        export async function load(url, context, next) {
            if (url.startsWith('na-stub:')) {
                const ending = url.slice('na-stub:'.length);
                const source = STUBS[ending].map((name) =>
                    'export const ' + name + ' = (...args) => globalThis.__NaRegStubs[' + JSON.stringify(name) + '](...args);').join('\\n');
                return { format : 'module', source, shortCircuit : true };
            }
            if (url.startsWith(APP) && url.endsWith('.js')) return next(url, { ...context, format : 'module' });
            return next(url, context);
        }
    `;
    register('data:text/javascript,' + encodeURIComponent(HOOKS), { data : { stubs : STUBS, app : pathToFileURL(APP_ROOT).href } });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name + (passed || detail === undefined ? '' : '  ->  ' + JSON.stringify(detail)));
    }
    function throwsWith(fn, fragment) {
        try { fn(); return false; } catch (error) { return String(error && error.message).includes(fragment); }
    }
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const tick  = () => new Promise((done) => setImmediate(done));

    console.log('ValeVision3D - drawing register numbering');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part 1 - The Numbering Leaf
// -----------------------------------------------------------------------------

    const num = await import(moduleUrl('Na__LayoutEditor__Register__Numbering__.js'));
    const Plan  = num.Na__LeRegNum__Plan;
    const Apply = num.Na__LeRegNum__Apply;

    const sheetsOf = (count) => Array.from({ length : count }, (_, index) => ({
        Sheet__Id     : 'Sheet_' + String.fromCharCode(97 + index),
        Sheet__Name   : 'Drawing ' + (index + 1),
        Sheet__Order  : 99,
        Sheet__Fields : { Sheet__Fields__Scale : '1:50', Sheet__Fields__DrawingNumber : 'OLD' }
    }));
    const series = (patch) => Object.assign({
        DrawingRegister__Numbering__Prefix    : 'D',
        DrawingRegister__Numbering__Start     : 1,
        DrawingRegister__Numbering__Digits    : 2,
        DrawingRegister__Numbering__Overrides : {}
    }, patch || {});
    const numbers = (plan) => plan.map((entry) => entry.number).join(' ');

    console.log('\n  -- the leaf: series --');
    check('The default series numbers a pack D01 D02 D03 D04',          numbers(Plan(sheetsOf(4), series())) === 'D01 D02 D03 D04');
    check('Order is the tab position, 1 up, and the ids never change',  JSON.stringify(Plan(sheetsOf(3), series()).map((e) => [e.id, e.order])) === JSON.stringify([['Sheet_a', 1], ['Sheet_b', 2], ['Sheet_c', 3]]));
    check('Start 0 and three digits read D000 D001',                    numbers(Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Start : 0, DrawingRegister__Numbering__Digits : 3 }))) === 'D000 D001');
    check('One digit and six digits are both allowed',                  numbers(Plan(sheetsOf(1), series({ DrawingRegister__Numbering__Digits : 1 }))) === 'D1'
                                                                        && numbers(Plan(sheetsOf(1), series({ DrawingRegister__Numbering__Digits : 6 }))) === 'D000001');
    check('A number wider than the width is never cut (D100)',          numbers(Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Start : 99 }))) === 'D99 D100');
    check('A prefix is trimmed and may carry digits, _ and -',          numbers(Plan(sheetsOf(1), series({ DrawingRegister__Numbering__Prefix : '  GA-2_' }))) === 'GA-2_01');
    check('Start and width given as strings are read as numbers',       numbers(Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Start : '5', DrawingRegister__Numbering__Digits : '2' }))) === 'D05 D06');
    check('An empty pack plans nothing',                                Plan([], series()).length === 0);

    console.log('\n  -- the leaf: refusals --');
    [ '', '   ', '1D', '-D', 'D 1', 'D.', null ].forEach((prefix) => {
        check('Prefix ' + JSON.stringify(prefix) + ' is refused, asking for a letter-led prefix',
            throwsWith(() => Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Prefix : prefix })), 'letter-led numbering prefix'));
    });
    [ -1, 1.5, 'one', NaN, Number.MAX_SAFE_INTEGER + 1 ].forEach((start) => {
        check('Start ' + String(start) + ' is refused',
            throwsWith(() => Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Start : start })), 'first number must be'));
    });
    [ 0, 7, 2.5, 'two' ].forEach((digits) => {
        check('Width ' + String(digits) + ' is refused (1 to 6 digits)',
            throwsWith(() => Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Digits : digits })), 'between 1 and 6 digits'));
    });
    check('A series that would pass the safe-integer limit is refused',
        throwsWith(() => Plan(sheetsOf(2), series({ DrawingRegister__Numbering__Start : Number.MAX_SAFE_INTEGER - 1 })), 'too large'));

    console.log('\n  -- the leaf: jumps --');
    const four = sheetsOf(4);
    check('A jump starts a new run: D01 D02 D10 D11',                   numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_c : 10 } }))) === 'D01 D02 D10 D11');
    check('A jump written as text counts the same',                     numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_c : '10' } }))) === 'D01 D02 D10 D11');
    check('Two jumps in order: D01 D05 D06 D20',                        numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_b : 5, Sheet_d : 20 } }))) === 'D01 D05 D06 D20');
    check('A jump to the very next number changes nothing',             numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_c : 3 } }))) === 'D01 D02 D03 D04');
    check('An empty or null jump is no jump',                           numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_b : '', Sheet_c : null } }))) === 'D01 D02 D03 D04');
    check('A jump for a sheet not in the pack is ignored',              numbers(Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_zz : 50 } }))) === 'D01 D02 D03 D04');
    check('A backward jump is refused, naming the sheet and the floor', throwsWith(() => Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_c : 2 } })), 'The number jump for Drawing 3 must be at least 3.'));
    check('A jump that repeats a number already used is refused',       throwsWith(() => Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_b : 10, Sheet_c : 10 } })), 'must be at least 11'));
    check('A fractional or non-number jump is refused',                 throwsWith(() => Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_b : 2.5 } })), 'must be at least')
                                                                        && throwsWith(() => Plan(four, series({ DrawingRegister__Numbering__Overrides : { Sheet_b : 'x' } })), 'must be at least'));
    check('A jump below Start on the first sheet is refused',           throwsWith(() => Plan(four, series({ DrawingRegister__Numbering__Start : 5, DrawingRegister__Numbering__Overrides : { Sheet_a : 4 } })), 'must be at least 5'));

    console.log('\n  -- the leaf: validate first, then apply --');
    const untouched = sheetsOf(4);
    const before    = clone(untouched);
    try { Plan(untouched, series({ DrawingRegister__Numbering__Overrides : { Sheet_d : 1 } })); } catch (error) { /* refused, as above */ }
    check('A refused plan leaves every record exactly as it was',      JSON.stringify(untouched) === JSON.stringify(before));
    Plan(untouched, series());
    check('Even an accepted plan writes nothing until Apply',          JSON.stringify(untouched) === JSON.stringify(before));
    const applied = sheetsOf(3);
    applied[1].Sheet__Fields = undefined;
    Apply(applied, Plan(applied, series({ DrawingRegister__Numbering__Overrides : { Sheet_c : 7 } })));
    check('Apply writes Sheet__Order and the drawing number field',     applied.map((s) => s.Sheet__Order + ':' + s.Sheet__Fields.Sheet__Fields__DrawingNumber).join(' ') === '1:D01 2:D02 3:D07');
    check('Apply creates missing fields and keeps every other field',   applied[0].Sheet__Fields.Sheet__Fields__Scale === '1:50' && applied[1].Sheet__Fields.Sheet__Fields__DrawingNumber === 'D02');
    check('Apply never renames a sheet or changes its id',              applied.map((s) => s.Sheet__Id + '/' + s.Sheet__Name).join(' ') === 'Sheet_a/Drawing 1 Sheet_b/Drawing 2 Sheet_c/Drawing 3');
    const reordered = sheetsOf(3).reverse();
    Apply(reordered, Plan(reordered, series()));
    check('Numbers follow the tab order handed in, not the ids',        reordered.map((s) => s.Sheet__Id + '=' + s.Sheet__Fields.Sheet__Fields__DrawingNumber).join(' ') === 'Sheet_c=D01 Sheet_b=D02 Sheet_a=D03');
    check('Apply refuses a plan naming a sheet that has gone',          throwsWith(() => Apply(sheetsOf(1), [ { id : 'Sheet_gone', order : 1, number : 'D01' } ]), 'A sheet disappeared'));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part 2 - Stand-ins for the Register's Neighbours
// -----------------------------------------------------------------------------

    // DOM | The saving lock and the typed-number delete box
    // ------------------------------------------------------------
    class FakeElement extends EventTarget {
        constructor(tag) {
            super();
            this.tagName = String(tag).toUpperCase();
            this.children = []; this.parent = null; this.attributes = {};
            this.className = ''; this.textContent = ''; this.value = ''; this.id = '';
            this.disabled = false; this.open = false; this.hidden = false; this.dataset = {};
        }
        get isConnected() { let node = this; while (node.parent) node = node.parent; return node === FakeDocument.body; }
        append(...items) { items.forEach((item) => this.appendChild(item)); }
        appendChild(item) { this.children.push(item); item.parent = this; return item; }
        setAttribute(key, value) { this.attributes[key] = String(value); }
        showModal() { this.open = true; }
        close() { this.open = false; }
        remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
        focus() { FakeDocument.activeElement = this; }
        find(test) {
            for (const child of this.children) {
                if (test(child)) return child;
                const deeper = child.find(test);
                if (deeper) return deeper;
            }
            return null;
        }
    }
    const FakeDocument = { body : new FakeElement('body'), activeElement : null, createElement : (tag) => new FakeElement(tag) };
    globalThis.document = FakeDocument;
    // ------------------------------------------------------------

    // WINDOW | Events and browser storage
    // ------------------------------------------------------------
    const storage = new Map();
    const win = new EventTarget();
    win.localStorage = {
        getItem    : (key) => (storage.has(key) ? storage.get(key) : null),
        setItem    : (key, value) => { storage.set(key, String(value)); },
        removeItem : (key) => { storage.delete(key); }
    };
    globalThis.window = win;
    let registerEvents = 0;
    win.addEventListener('na-layouteditor-register-changed', () => { registerEvents++; });
    // ------------------------------------------------------------

    // WORLD | One pack of drawings, its loaded project and every call made
    // ------------------------------------------------------------
    const W = {};
    function freshWorld(projectToken, count) {
        W.token      = projectToken;
        W.sheets     = sheetsOf(count);
        Apply(W.sheets, Plan(W.sheets, series()));
        W.sheets.forEach((s, i) => { s.Sheet__Fields.Sheet__Fields__Revision = 'A'; s.Sheet__Fields.Sheet__Fields__Phase = i === 0 ? 'P1' : ''; });
        W.block      = { LayoutEditor__DrawingsData__Sheets : W.sheets };
        W.loaded     = { projectCode : '3047', LayoutEditor__DrawingRegister : { DrawingRegister__Numbering : series(), DrawingRegister__Revisions : { Sheet_b : [ { DrawingRegister__Revision__Code : 'A', DrawingRegister__Revision__Notes : 'First issue' } ] } } };
        W.confirm    = true;  W.asked = [];
        W.save       = 'ok';  W.saves = [];
        W.mirror     = 'ok';  W.mirrors = [];
        W.toasts     = [];    W.suspends = 0; W.suspended = false; W.discards = 0; W.finished = []; W.notified = 0;
    }
    const fieldsOf = (sheet) => {
        const f = sheet.Sheet__Fields || {};
        return { DrawingNumber : f.Sheet__Fields__DrawingNumber || '', Revision : f.Sheet__Fields__Revision || '', Status : f.Sheet__Fields__Status || '', Phase : f.Sheet__Fields__Phase || '' };
    };
    globalThis.__NaRegStubs = {
        Na__LeModel__GetSheets              : () => W.sheets,
        Na__LeModel__GetFields              : (sheet) => fieldsOf(sheet),
        Na__LeModel__GetTabLabel            : (sheet) => fieldsOf(sheet).DrawingNumber + ' - ' + sheet.Sheet__Name,
        Na__LeModel__GetPhase               : (sheet) => fieldsOf(sheet).Phase,
        Na__LeModel__GetDrawingNumber       : (sheet) => fieldsOf(sheet).DrawingNumber,
        Na__LeModel__ComposeDocumentId      : (project, phase, drawing) => [ project, phase, drawing ].map((p) => String(p || '').trim()).filter(Boolean).join('_'),
        Na__LeModel__CleanSheetName         : (sheet, value) => String(value || '').trim(),
        Na__LeModel__ApplySheetName         : (sheet, value) => { sheet.Sheet__Name = value; },
        Na__LeModel__FinishRegisterDeletion : (id) => { W.finished.push(id); },
        Na__LeModel__NotifyRegister         : () => { W.notified++; },
        Na__LeCfg__StatusToStore            : (value) => (String(value || '').trim() || null),
        Na__LeCfg__GetDrawingRegisterSetup  : () => ({ prefix : 'D', start : 1, digits : 2 }),
        Na__LeAuto__Suspend                 : async () => { W.suspends++; W.suspended = true; },
        Na__LeAuto__Resume                  : () => { W.suspended = false; },   // <-- A switch, as AutoSave's is: a resume after a declined question is harmless
        Na__LeAuto__DiscardSavedDraft       : () => { W.discards++; },
        Na__DrawData__GetBlock              : () => W.block,
        Na__DrawData__GetProjectCode        : () => W.token,                     // <-- The ?project= token every save is addressed by
        Na__DrawData__GetDocumentCode       : () => '3047',                      // <-- The project's own code, what a document prints (DR-11)
        Na__DrawData__Save                  : async (toast, report, payload) => {
            W.saves.push({ payload : clone(payload), numbers : W.sheets.map((s) => s.Sheet__Fields.Sheet__Fields__DrawingNumber).join(' '), ids : W.sheets.map((s) => s.Sheet__Id).join(' ') });
            if (payload && payload.localFirst) report.localFirstWritten = W.save !== 'local-first-refused';
            if (W.save === 'r2-fail' || W.save === 'local-first-then-r2-fail') { toast('R2 write failed.', true); return false; }
            report.cloudSaved = true;
            report.local = W.save === 'local-fail' ? { ok : false, error : 'Local server unavailable.' } : { ok : true };
            return true;
        },
        Na__CfApi__GetLoadedProjectData     : () => W.loaded,
        Na__CfApi__MergeAndSaveKeys         : async () => ({ ok : true }),
        Na__CfApi__ReadProjectData          : async () => ({ ok : true, data : W.loaded }),
        Na__CfApi__ProjectFileLocation      : () => null,
        Na__LocalMirror__MergeKeys          : async (keys) => { W.mirrors.push(clone(keys)); return W.mirror === 'ok' ? { ok : true } : { ok : false, error : 'disk full' }; },
        Na__AppUtils__ConfirmDialog__Show   : async (options) => { W.asked.push(options); return W.confirm; }
    };
    // ------------------------------------------------------------

    const reg  = await import(moduleUrl('Na__LayoutEditor__Register__Data__.js'));
    const edit = await import(moduleUrl('Na__LayoutEditor__Register__Transactions__.js'));
    const toast = (text, error) => { W.toasts.push((error ? 'ERR ' : 'OK ') + text); };
    reg.Na__LeReg__Initialize({ editable : true, showToast : toast });
    edit.Na__LeRegEdit__Initialize({ editable : true, showToast : toast });
    const liveNumbers = () => W.sheets.map((s) => s.Sheet__Fields.Sheet__Fields__DrawingNumber).join(' ');
    const lastToast   = () => W.toasts[W.toasts.length - 1] || '';
    const noLockLeft  = () => FakeDocument.body.children.length === 0;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part 2 - Renumbering Transactions
// -----------------------------------------------------------------------------

    console.log('\n  -- transactions: renumber and jump --');
    freshWorld('2026/3047__Doous', 4);
    let result = await edit.Na__LeRegEdit__Renumber({ DrawingRegister__Numbering__Prefix : 'A', DrawingRegister__Numbering__Start : 10 }, false);
    check('A series change asks first, then saves once',                result === true && W.asked.length === 1 && W.saves.length === 1);
    check('The pack is renumbered in tab order: A10 A11 A12 A13',      liveNumbers() === 'A10 A11 A12 A13');
    check('The save carries the register block, cloud and local',      !!(W.saves[0].payload.cloud.LayoutEditor__DrawingRegister && W.saves[0].payload.local.LayoutEditor__DrawingRegister));
    check('...with the new series in both copies',                     W.saves[0].payload.cloud.LayoutEditor__DrawingRegister.DrawingRegister__Numbering.DrawingRegister__Numbering__Prefix === 'A'
                                                                        && W.saves[0].payload.local.LayoutEditor__DrawingRegister.DrawingRegister__Numbering.DrawingRegister__Numbering__Start === 10);
    check('...and the numbers were applied before the save was made',  W.saves[0].numbers === 'A10 A11 A12 A13');
    check('The register adopts the saved series',                      reg.Na__LeReg__GetDocument().DrawingRegister__Numbering.DrawingRegister__Numbering__Prefix === 'A');
    check('Autosave is drained first and resumed after',               W.suspends === 1 && W.suspended === false);
    check('The saving lock is gone and the success is said',           noLockLeft() && lastToast() === 'OK Drawing data synced to R2 and locally.');

    W.saves = []; W.asked = [];
    result = await edit.Na__LeRegEdit__Override('Sheet_c', '20');
    check('A jump on the third drawing: A10 A11 A20 A21',              result === true && liveNumbers() === 'A10 A11 A20 A21');
    check('The jump is kept in the series overrides',                  reg.Na__LeReg__GetDocument().DrawingRegister__Numbering.DrawingRegister__Numbering__Overrides.Sheet_c === 20);
    result = await edit.Na__LeRegEdit__Override('Sheet_c', '');
    check('Clearing the jump closes the gap: A10 A11 A12 A13',         result === true && liveNumbers() === 'A10 A11 A12 A13'
                                                                        && !('Sheet_c' in reg.Na__LeReg__GetDocument().DrawingRegister__Numbering.DrawingRegister__Numbering__Overrides));

    console.log('\n  -- transactions: refusals and rollback --');
    W.saves = []; W.toasts = [];
    const snapshot = clone(W.sheets);
    result = await edit.Na__LeRegEdit__Override('Sheet_c', '5');
    check('A backward jump is refused before any save',                result === false && W.saves.length === 0);
    check('...says why, in the leaf\'s words',                         lastToast().startsWith('ERR The number jump for Drawing 3 must be at least'));
    check('...and leaves every drawing as it was',                     JSON.stringify(W.sheets) === JSON.stringify(snapshot));

    W.confirm = false; W.saves = [];
    result = await edit.Na__LeRegEdit__Renumber(null, true);
    check('Declining the question saves nothing and changes nothing',  result === false && W.saves.length === 0 && JSON.stringify(W.sheets) === JSON.stringify(snapshot));
    W.confirm = true;

    W.save = 'r2-fail'; W.saves = []; W.toasts = [];
    const seriesBefore = clone(reg.Na__LeReg__GetDocument().DrawingRegister__Numbering);
    result = await edit.Na__LeRegEdit__Renumber({ DrawingRegister__Numbering__Prefix : 'Z' }, false);
    check('An R2 failure answers false',                                result === false && W.saves.length === 1 && W.saves[0].numbers === 'Z10 Z11 Z12 Z13');
    check('...and puts every name, order and field back',              JSON.stringify(W.sheets) === JSON.stringify(snapshot));
    check('...and the register keeps its old series',                  JSON.stringify(reg.Na__LeReg__GetDocument().DrawingRegister__Numbering) === JSON.stringify(seriesBefore));
    check('...and says the metadata was restored',                     W.toasts.some((t) => t.includes('The previous drawing metadata has been restored.')));
    check('...and leaves no lock, autosave resumed',                   noLockLeft() && W.suspended === false);

    W.save = 'ok';

    console.log('\n  -- transactions: R2 saved, local failed --');
    W.save = 'local-fail'; W.saves = []; W.toasts = [];
    result = await edit.Na__LeRegEdit__Move('Sheet_d', 0);
    check('A move whose local copy fails answers false',               result === false && W.saves.length === 1);
    check('...but R2 holds it, so memory is NOT rolled back',          W.sheets.map((s) => s.Sheet__Id).join(' ') === 'Sheet_d Sheet_a Sheet_b Sheet_c' && liveNumbers() === 'A10 A11 A12 A13');
    check('...and a local retry is now waiting',                       edit.Na__LeRegEdit__NeedsLocal() === true && lastToast().startsWith('ERR Saved to R2, but local sync failed.'));
    W.save = 'ok'; W.saves = [];
    result = await edit.Na__LeRegEdit__Renumber(null, false);
    check('No more metadata changes until the retry',                  result === false && W.saves.length === 0 && lastToast() === 'ERR Retry the local sync before changing more drawing metadata.');
    W.mirror = 'fail';
    check('A failed retry keeps the retry waiting',                    (await edit.Na__LeRegEdit__RetryLocal()) === false && edit.Na__LeRegEdit__NeedsLocal() === true);
    W.mirror = 'ok'; W.mirrors = [];
    check('A good retry clears it, writing the drawings and register', (await edit.Na__LeRegEdit__RetryLocal()) === true && edit.Na__LeRegEdit__NeedsLocal() === false
                                                                        && !!(W.mirrors[0].LayoutEditor__DrawingsData && W.mirrors[0].LayoutEditor__DrawingRegister));

    console.log('\n  -- transactions: the document code a phase change names (DR-11) --');
    W.asked = []; W.saves = [];
    result = await edit.Na__LeRegEdit__Metadata('Sheet_a', 'phase', 'P2');
    const phaseAsk = (W.asked[0] && W.asked[0].message) || '';
    check('The question names the code the drawing will carry',       phaseAsk.startsWith('Move A11 - Drawing 1 to phase P2? Its document code becomes 3047_P2_A11.'), phaseAsk);
    check('...built from the project\'s own code, never the address',  !phaseAsk.includes('2026/3047__Doous'));
    check('...and the phase alone is stored, the code is composed',    result === true && W.sheets.find((s) => s.Sheet__Id === 'Sheet_a').Sheet__Fields.Sheet__Fields__Phase === 'P2'
                                                                        && !('Sheet__Fields__DocumentId' in W.sheets.find((s) => s.Sheet__Id === 'Sheet_a').Sheet__Fields));

    console.log('\n  -- transactions: typed-number delete --');
    freshWorld('2026/3047__Doous__delete', 4);                            // <-- A new address re-adopts the loaded register
    reg.Na__LeReg__GetDocument();
    const answer = async (typed, how) => {
        await tick(); await tick();
        const box   = FakeDocument.body.find((el) => String(el.className).includes('na-le-register__delete-dialog'));
        if (!box) return null;
        const input = box.find((el) => el.tagName === 'INPUT');
        const del   = box.find((el) => el.tagName === 'BUTTON' && el.textContent === 'Delete drawing');
        const cancel = box.find((el) => el.tagName === 'BUTTON' && el.textContent === 'Cancel');
        input.value = typed; input.dispatchEvent(new Event('input'));
        const state = { disabled : del.disabled, heading : box.find((el) => el.tagName === 'H2').textContent };
        if (how === 'click') del.dispatchEvent(new Event('click'));
        if (how === 'enter') input.dispatchEvent(Object.assign(new Event('keydown'), { key : 'Enter' }));
        if (how === 'cancel') cancel.dispatchEvent(new Event('click'));
        return state;
    };
    let pending = edit.Na__LeRegEdit__Delete('Sheet_b');
    let seen    = await answer('d02', 'cancel');
    result = await pending;
    check('The box asks for D02 by name',                              !!seen && seen.heading === 'Delete drawing D02?');
    check('A near miss (d02) keeps Delete disabled',                   !!seen && seen.disabled === true);
    check('Cancel deletes nothing and saves nothing',                  result === false && W.saves.length === 0 && W.sheets.length === 4 && noLockLeft());

    pending = edit.Na__LeRegEdit__Delete('Sheet_b');
    seen    = await answer('D02', 'enter');
    result  = await pending;
    check('Typing D02 exactly and Enter deletes it',                   result === true && W.sheets.map((s) => s.Sheet__Id).join(' ') === 'Sheet_a Sheet_c Sheet_d');
    check('The rest are renumbered from the series: D01 D02 D03',      liveNumbers() === 'D01 D02 D03');
    check('The save is local-first',                                   W.saves.length === 1 && W.saves[0].payload.localFirst === true);
    check('...and drops the drawing\'s revision history in both copies', !('Sheet_b' in W.saves[0].payload.cloud.LayoutEditor__DrawingRegister.DrawingRegister__Revisions)
                                                                        && !('Sheet_b' in W.saves[0].payload.local.LayoutEditor__DrawingRegister.DrawingRegister__Revisions));
    check('The sheet model finishes the deletion; the stale draft goes', W.finished.join() === 'Sheet_b' && W.discards === 1 && !('Sheet_b' in reg.Na__LeReg__GetDocument().DrawingRegister__Revisions));
    check('The success names the number',                              lastToast() === 'OK D02 deleted locally and synced to R2.');

    freshWorld('2026/3047__Doous__delete-fail', 4);
    reg.Na__LeReg__GetDocument();
    W.save = 'local-first-then-r2-fail';
    const keep = clone(W.sheets);
    pending = edit.Na__LeRegEdit__Delete('Sheet_c');
    await answer('D03', 'click');
    result = await pending;
    check('A delete whose R2 write fails answers false',               result === false);
    check('...puts the drawing back where it was, numbers and all',    JSON.stringify(W.sheets) === JSON.stringify(keep));
    check('...and writes the local copy back, since it went first',    W.mirrors.length === 1 && !!W.mirrors[0].LayoutEditor__DrawingsData
                                                                        && W.mirrors[0].LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets.length === 4);
    check('...and says the drawing has been kept',                     lastToast().endsWith('The drawing has been kept.') && W.finished.length === 0 && noLockLeft());

    console.log('\n  -- register data: a browser draft never restores numbering --');
    freshWorld('2026/3047__Doous__draft', 3);
    storage.set('Na__DrawingRegister__Draft__2026/3047__Doous__draft', JSON.stringify({
        DrawingRegister__Numbering : series({ DrawingRegister__Numbering__Prefix : 'STALE' }),
        DrawingRegister__Revisions : { Sheet_a : [ { DrawingRegister__Revision__Notes : 'typed before a reload' } ] }
    }));
    const doc = reg.Na__LeReg__GetDocument();
    check('The draft\'s revision notes come back',                     !!(doc.DrawingRegister__Revisions.Sheet_a && doc.DrawingRegister__Revisions.Sheet_a[0].DrawingRegister__Revision__Notes === 'typed before a reload'));
    check('...but never its numbering: the loaded series stands',      doc.DrawingRegister__Numbering.DrawingRegister__Numbering__Prefix === 'D');
    check('...and the restored notes count as unsaved',                reg.Na__LeReg__IsDirty() === true);
    check('The block is normalised in the project\'s three-part style', doc.DrawingRegister__Document__Version === 1 && typeof doc.DrawingRegister__Document__Description === 'string');
    check('Every transaction announced the register change',          registerEvents > 0);

    console.log(failures ? ('\n' + failures + ' check(s) FAILED, ' + passes + ' passed') : ('\nEvery check passed (' + passes + ').'));
    process.exit(failures ? 1 : 0);

// endregion -------------------------------------------------------------------
