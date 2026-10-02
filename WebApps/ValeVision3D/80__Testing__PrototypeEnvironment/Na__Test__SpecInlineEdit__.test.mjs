// =============================================================================
// VALEVISION3D - TEST - SPECIFICATION NOTE EDITED IN THE DRAWING
// =============================================================================
//
// FILE       : Na__Test__SpecInlineEdit__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Specification Inline Edit Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove a note reworded in the drawing's Specification tab reaches the specification, the local file and - with Save Sheets - R2, and nothing is lost on the way
// CREATED    : 22-Sep-2026
//
// DESCRIPTION:
// - THE REAL SPECIFICATION. The shipped State, Document, Draft, Editing and
//   Transport units and Na__LayoutEditor__SpecData__.js are loaded WIRED TO
//   EACH OTHER, exactly as the browser loads them; only the world outside
//   them is stubbed: the config, the project code, localhost, the confirm
//   dialog, R2 through the Worker (a map standing in for the bucket) and the
//   Whitecardopedia local server (a map standing in for the disk, served back
//   over fetch as the Flask static route serves it).
// - THE SAVE: UpdateNote takes the note, one undo step; the draft is written
//   at once; WriteLocalCopy writes the file, reads it back and says verified,
//   and changes none of the cloud bookkeeping - the specification is still
//   unsynced, so Save Sheets still syncs it.
// - WHAT CAN GO WRONG: off localhost it is skipped; a server that refuses is
//   reported; a disk that does not hold what was written is reported; two
//   writes in flight land in the order they were asked for, a slow first
//   write included; Sync's copy waits its turn behind them.
// - THE NEXT SESSION: fresh units, the same disk and bucket - the edit comes
//   back from the local file, unsynced against the cloud, and Save Sheets'
//   Sync writes it to R2 and the local file.
// - THE ROW EDITOR'S RULES (the shipped RowEditor): a title kept to one line,
//   a text trimmed at its ends with its line breaks kept, and only a field
//   that was typed into is written - never a field left alone.
// - WHAT IS PROVED FOR VALEVISION (its own region, after TrueVision's cases;
//   package W2-35's acceptance that runs without a browser)
//   - The filter: "rf" finds only the notes whose code starts RF - never a
//     note that merely says "surface" - and the shipped panel's own filter
//     puts away a group it has emptied.
//   - The drop: the shipped library builds the note's bubble linked to its
//     note, its circle centred on the drop point, its tail aimed at the
//     nearest drawing, and hands it to the item clipboard's InsertSet once
//     (one undo step) at its own origin.
//   - The wiring: the mode controller registers the left column's Document
//     Preferences tab, then the Specification tab, and the Specification
//     section after Model Layers; the config names this app's files only.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__SpecInlineEdit__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SpecInlineEdit__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4, with the Specification tab
// - Parity        : adapted
// - Divergences   :
//   - Banner and heading read ValeVision3D. The file is ValeVision__DrawingNotes__.json and its local
//     copy is served the way the Whitecardopedia server serves it (/Whitecardopedia/Projects/<folderId>/...);
//     the refusing server is the Whitecardopedia local server.
//   - A ValeVision region after TrueVision's cases (DESCRIPTION) proves package W2-35's acceptance.
// - Back-port     : the ValeVision region could join TrueVision's copy.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 22-Sep-2026 - Version 1.0.0
// - Written with editing a note in the drawing's Specification tab (TrueVision3D v2.144.0).
//
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.resolve(HERE, '..', '02__Src__AppModules');
const SPEC = path.resolve(SRC, '51__System__LayoutEditor', '50__Feature__Specification');
const SCRAP = path.resolve(SRC, '51__System__LayoutEditor', '58__Feature__ScrapbookSpecification');

let failures = 0;
function check(name, got, want) {
    const passed = JSON.stringify(got) === JSON.stringify(want);
    if (!passed) failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
    if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms || 0));

// -----------------------------------------------------------------------------
// REGION | Loading the Units Wired to Each Other, the World Stubbed
// -----------------------------------------------------------------------------

    const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
    const UNITS  = [ 'State', 'Document', 'Draft', 'Lockstep', 'Editing', 'Transport' ];
    const STMT_LOCK = path.resolve(SRC, '51__System__LayoutEditor', '52__Feature__StatementWriter', '01__Core__Data', 'Na__LayoutEditor__Statement__Lockstep__.js');

    // One session: every unit transformed once and written to its own folder,
    // so the units of one session share each other's instances and a second
    // session starts from nothing.
    let sessions = 0;
    async function loadSession() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'na_spec_inline_' + (++sessions) + '_'));
        fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}', 'utf8');   // <-- The copies keep their .js names: without this Node 20 reads them as CommonJS
        const url = (name) => pathToFileURL(path.join(dir, name)).href;
        const transform = (file) => {
            let src = fs.readFileSync(path.join(SPEC, file), 'utf8').replace(/\r\n/g, '\n');
            const stubbed = [];
            src = src.replace(IMPORT, (whole, names, spec) => {
                const unit = /^\.\/(Na__LayoutEditor__SpecData__(?:\w+__)?\.js)$/.exec(spec);
                if (unit) return 'import ' + names + ' from ' + JSON.stringify(url(unit[1])) + ';';
                if (/Na__LayoutEditor__Statement__Lockstep__\.js$/.test(spec)) return 'import ' + names + ' from ' + JSON.stringify(url('Na__LayoutEditor__Statement__Lockstep__.js')) + ';';   // <-- Pure: the real rules, not a stub
                names.trim().slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => stubbed.push(s.split(/\s+as\s+/).pop()));
                return '';
            });
            const head = stubbed.map((n) => 'const ' + n + ' = (...args) => globalThis.__spec[' + JSON.stringify(n) + '](...args);').join('\n');
            fs.writeFileSync(path.join(dir, file), head + '\n' + src, 'utf8');
        };
        fs.copyFileSync(STMT_LOCK, path.join(dir, 'Na__LayoutEditor__Statement__Lockstep__.js'));
        UNITS.forEach((unit) => transform('Na__LayoutEditor__SpecData__' + unit + '__.js'));
        transform('Na__LayoutEditor__SpecData__.js');
        return import(url('Na__LayoutEditor__SpecData__.js'));
    }

    // A few stubs are values, not functions: an event name.
    function valueStub(name, value) {
        // The transformed units call every stubbed name as a function; the
        // event names are the exception and are read as values, so they are
        // given as functions that also carry the value when coerced.
        return Object.assign(() => value, { toString : () => value, valueOf : () => value });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The World: Config, Browser, R2 and the Disk
// -----------------------------------------------------------------------------

    const SETUP = {
        fileName : 'ValeVision__DrawingNotes__.json', legacyFileName : '', loadTimeoutMs : 2000,
        numberDigits : 2, prefixMaxLength : 4, defaultRevision : 'A', documentNumberSuffix : '_SPEC',
        historySteps : 50, draftEnabled : true, draftDebounceMs : 50, confirmOverwrite : true, starterGroups : []
    };
    const REPO_URL = 'http://localhost:8000/Whitecardopedia/Projects/2026/TT01__Test/ValeVision__DrawingNotes__.json';
    const world = {
        localhost : true,
        bucket    : new Map(),          // <-- R2: file name -> document
        disk      : new Map(),          // <-- the repository: file name -> document
        writes    : [],                 // <-- every local write asked for, in the order it LANDED
        mirror    : null,               // <-- overrides the local server's answer
        toasts    : [],
        store     : new Map()
    };

    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
    const announced = [];
    globalThis.window = {
        location            : { origin : 'http://localhost:8000', hostname : 'localhost', port : '8000' },
        dispatchEvent       : (event) => { announced.push(event.detail); return true; },
        addEventListener    : () => {}, removeEventListener : () => {},
        setTimeout          : (fn, ms) => setTimeout(fn, ms),
        clearTimeout        : (id) => clearTimeout(id),
        localStorage        : { getItem : (k) => (world.store.has(k) ? world.store.get(k) : null), setItem : (k, v) => world.store.set(k, String(v)), removeItem : (k) => world.store.delete(k) }
    };
    globalThis.document = { addEventListener : () => {} };
    globalThis.fetch = async (where) => {
        if (String(where) === REPO_URL) {
            const doc = world.disk.get(SETUP.fileName);
            return doc ? { ok : true, status : 200, json : async () => JSON.parse(JSON.stringify(doc)) } : { ok : false, status : 404, json : async () => null };
        }
        return { ok : false, status : 404, json : async () => null };
    };

    globalThis.__spec = {
        Na__LeCfg__GetSpecificationSetup : () => SETUP,
        Na__LeCfg__GetLabel              : (key, fallback) => fallback,
        Na__LeCfg__FormatLabel           : (key, fallback, tokens) => Object.keys(tokens || {}).reduce((t, n) => t.split('{' + n + '}').join(String(tokens[n])), fallback),
        Na__DrawData__GetProjectCode     : () => 'TT01',
        Na__DrawData__CHANGED_EVENT      : valueStub('Na__DrawData__CHANGED_EVENT', 'na-drawdata-changed'),
        Na__AppUtils__IsRunningOnLocalhost : () => world.localhost,
        Na__DevGate__IsAuthoringEnabled  : () => false,
        Na__AppUtils__ConfirmDialog__Show : async () => true,
        Na__CfApi__IsConfigured          : () => true,
        Na__CfApi__ProjectFileLocation   : (name) => ({ repoUrl : REPO_URL, cdnUrl : 'https://cdn.example/' + name }),
        Na__CfApi__ReadProjectFile       : async (name) => (world.bucket.has(name) ? { ok : true, missing : false, data : JSON.parse(JSON.stringify(world.bucket.get(name))) } : { ok : true, missing : true, data : null }),
        Na__CfApi__WriteProjectFile      : async (name, doc) => { world.bucket.set(name, JSON.parse(JSON.stringify(doc))); return { ok : true }; },
        Na__LocalMirror__WriteSiblingFile : async (name, doc) => {
            if (!world.localhost) return { ok : false, skipped : true, error : null };
            const answer = world.mirror ? await world.mirror(name, doc) : { ok : true, skipped : false, error : null, store : true };
            if (answer.store !== false && answer.ok) world.disk.set(name, JSON.parse(JSON.stringify(doc)));
            if (answer.ok) world.writes.push(doc.ProjectSpecification__Groups[0].Group__Notes[0].Note__Body);
            return { ok : answer.ok, skipped : false, error : answer.error || null };
        }
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Project's Specification, in the Cloud and on Disk
// -----------------------------------------------------------------------------

    const T0 = '2026-09-20T10:00:00.000Z';
    const CLOUD = {
        ProjectSpecification__Description : 'x', ProjectSpecification__Version : 1, ProjectSpecification__ProjectCode : 'TT01',
        ProjectSpecification__UpdatedIso : T0, ProjectSpecification__NumberDigits : 2, ProjectSpecification__LastIdNumber : 3,
        ProjectSpecification__Revision : 'A', ProjectSpecification__DocumentNumber : '',
        ProjectSpecification__Groups : [ { Group__Id : 'SpecGroup_001', Group__Prefix : 'EW', Group__Title : 'External Walls', Group__IsGeneral : false,
            Group__Notes : [
                { Note__Id : 'SpecNote_002', Note__Code : 'EW01', Note__Title : 'Loggia Arcade', Note__Body : 'Three arched openings in a recessed bay.', Note__UpdatedIso : T0 },
                { Note__Id : 'SpecNote_003', Note__Code : 'EW02', Note__Title : 'Flanking Windows', Note__Body : 'Larger windows flank the arcade.', Note__UpdatedIso : T0 }
            ] } ]
    };
    world.bucket.set(SETUP.fileName, CLOUD);
    world.disk.set(SETUP.fileName, CLOUD);

// endregion -------------------------------------------------------------------


console.log('\nValeVision3D - a specification note edited in the drawing\n\n  The save');
const S = await loadSession();
S.Na__LeSpec__Initialize({ editable : true, showToast : (message, isError) => world.toasts.push([ message, isError ]) });
await S.Na__LeSpec__EnsureLoaded();
check('the specification loads from the cloud, in step with the disk, synced', [ S.Na__LeSpec__GetState().status, S.Na__LeSpec__GetState().source, S.Na__LeSpec__IsDirty() ], [ 'ready', 'cloud', false ]);

const EDITED = 'Three arched openings in a recessed bay, with Kingspan K15 behind.';
check('UpdateNote takes the edit (the Project Specification tab\'s own commit)', S.Na__LeSpec__UpdateNote('SpecNote_002', { body : EDITED }, false), true);
check('...and the specification is now unsynced', S.Na__LeSpec__IsDirty(), true);
check('...one undo step on the Project Specification tab', S.Na__LeSpec__CanUndo(), true);
check('...the change is announced as a note change, no code moved', announced.filter((d) => d.reason === 'note').map((d) => [ d.noteId, d.codesChanged ]), [ [ 'SpecNote_002', false ] ]);
S.Na__LeSpec__FlushDraft();
const draft = JSON.parse(world.store.get('Na__LayoutEditor__SpecDraft__TT01') || 'null');
check('the browser draft is written at once, holding the edit', draft ? draft.doc.ProjectSpecification__Groups[0].Group__Notes[0].Note__Body : null, EDITED);

const liveStampBefore = S.Na__LeSpec__GetDocument().ProjectSpecification__UpdatedIso;
let result = await S.Na__LeSpec__WriteLocalCopy();
const onDisk = world.disk.get(SETUP.fileName);
check('WriteLocalCopy: written, read back, verified', result, { ok : true, skipped : false, verified : true, error : null });
check('...the local file holds the edit', onDisk.ProjectSpecification__Groups[0].Group__Notes[0].Note__Body, EDITED);
check('...stamped later than the cloud copy it started from', onDisk.ProjectSpecification__UpdatedIso > T0, true);
check('...with the id counter kept', onDisk.ProjectSpecification__LastIdNumber >= 3, true);
check('...the other note untouched', onDisk.ProjectSpecification__Groups[0].Group__Notes[1].Note__Body, 'Larger windows flank the arcade.');
check('the LIVE document is never stamped (its undo history stays true)', S.Na__LeSpec__GetDocument().ProjectSpecification__UpdatedIso, liveStampBefore);
check('R2 is not touched', world.bucket.get(SETUP.fileName).ProjectSpecification__Groups[0].Group__Notes[0].Note__Body, 'Three arched openings in a recessed bay.');
check('the specification is STILL unsynced, so Save Sheets still syncs it', [ S.Na__LeSpec__IsDirty(), S.Na__LeSpec__GetState().canSync ], [ true, true ]);

console.log('\n  What can go wrong');
world.localhost = false;
check('off localhost it is skipped (the web build has no local file)', await S.Na__LeSpec__WriteLocalCopy(), { ok : false, skipped : true, verified : false, error : null });
world.localhost = true;

world.mirror = async () => ({ ok : false, error : 'the Whitecardopedia local server refused this write (405)' });
result = await S.Na__LeSpec__WriteLocalCopy();
check('a server that refuses is reported, with its reason', [ result.ok, result.skipped, result.error ], [ false, false, 'the Whitecardopedia local server refused this write (405)' ]);

world.mirror = async () => ({ ok : true, store : false });                  // <-- The server says ok, and the disk does not change
S.Na__LeSpec__UpdateNote('SpecNote_002', { body : EDITED + ' Again.' }, false);
result = await S.Na__LeSpec__WriteLocalCopy();
check('a disk that does not hold what was written is caught by the read-back', [ result.ok, result.verified, result.error ], [ false, false, 'the file on disk does not hold what was written' ]);
world.mirror = null;

world.writes.length = 0;
let slow = true;
world.mirror = async () => { if (slow) { slow = false; await tick(80); } return { ok : true }; };   // <-- The first write is slow, the second is not
S.Na__LeSpec__UpdateNote('SpecNote_002', { body : 'First edit.' }, false);
const first  = S.Na__LeSpec__WriteLocalCopy();
S.Na__LeSpec__UpdateNote('SpecNote_002', { body : 'Second edit.' }, false);
const second = S.Na__LeSpec__WriteLocalCopy();
const both   = await Promise.all([ first, second ]);
check('two writes in flight land in the order they were asked for, the slow first one included', world.writes, [ 'First edit.', 'Second edit.' ]);
check('...both verified, and the disk holds the second', [ both[0].verified, both[1].verified, world.disk.get(SETUP.fileName).ProjectSpecification__Groups[0].Group__Notes[0].Note__Body ], [ true, true, 'Second edit.' ]);
world.mirror = null;

S.Na__LeSpec__UpdateNote('SpecNote_002', { body : EDITED }, false);        // <-- The row editor's own order: the change, the draft at once, the file
S.Na__LeSpec__FlushDraft();
await S.Na__LeSpec__WriteLocalCopy();

console.log('\n  The next session (fresh units, the same disk and bucket)');
announced.length = 0;
const toastsBefore = world.toasts.length;
const S2 = await loadSession();
S2.Na__LeSpec__Initialize({ editable : true, showToast : (message) => world.toasts.push([ message ]) });
await S2.Na__LeSpec__EnsureLoaded();
check('the edit comes back from the local file, newer than R2', [ S2.Na__LeSpec__GetState().source, S2.Na__LeSpec__GetNoteEntry('SpecNote_002').note.Note__Body ], [ 'repository', EDITED ]);
check('...the browser draft agrees with the file, so nothing is "restored" over it', [ world.toasts.length - toastsBefore, world.store.has('Na__LayoutEditor__SpecDraft__TT01') ], [ 0, false ]);
check('...and reads as unsynced against the cloud: Save Sheets lights up', S2.Na__LeSpec__IsDirty(), true);
const synced = await S2.Na__LeSpec__Sync({ showToast : () => {} });
check('Save Sheets\' Sync writes it to R2, asking nothing (the cloud is where it was read)', [ synced, world.bucket.get(SETUP.fileName).ProjectSpecification__Groups[0].Group__Notes[0].Note__Body ], [ true, EDITED ]);
check('...and the local file carries the same stamp as R2', world.disk.get(SETUP.fileName).ProjectSpecification__UpdatedIso, world.bucket.get(SETUP.fileName).ProjectSpecification__UpdatedIso);
check('...and nothing is unsynced any more', S2.Na__LeSpec__IsDirty(), false);

// -----------------------------------------------------------------------------
// THE ROW EDITOR'S RULES
// -----------------------------------------------------------------------------
console.log('\n  The row editor\'s rules (the shipped RowEditor)');
{
    let src = fs.readFileSync(path.join(SCRAP, 'Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js'), 'utf8').replace(/\r\n/g, '\n');
    src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
    const names = [ 'Na__LeSpec__IsLoaded', 'Na__LeSpec__IsEditable', 'Na__LeSpec__GetNoteEntry', 'Na__LeSpec__UpdateNote', 'Na__LeSpec__FlushDraft', 'Na__LeSpec__WriteLocalCopy', 'Na__LeSurface__GetElements', 'Na__LePanels__IsEditable', 'Na__LePanels__GetContext', 'Na__LeScrapSpec__Label', 'Na__SpellCheck__Field', 'Na__SpellCheck__WordBar' ];
    const tmp = path.join(os.tmpdir(), 'Na__Test__SpecInlineEdit__RowEditor__.mjs');
    fs.writeFileSync(tmp, names.map((n) => 'const ' + n + ' = () => undefined;').join('\n') + '\n' + src, 'utf8');
    const E = await import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    const O = { title : 'Loggia Arcade', body : 'Three arched openings.' };

    check('a title is one line, trimmed', E.Na__LeScrapSpecEd__TidyTitle('  Loggia\nArcade \r\n '), 'Loggia Arcade');
    check('a text keeps its line breaks, trimmed at its ends and of trailing spaces', E.Na__LeScrapSpecEd__TidyBody('  First line.   \r\nSecond line.\n\n'), 'First line.\nSecond line.');
    check('nothing typed: nothing written', E.Na__LeScrapSpecEd__Patch(O, O, O), null);
    check('only the text typed into: only the text written', E.Na__LeScrapSpecEd__Patch(O, { title : O.title, body : 'Four openings.' }, O), { body : 'Four openings.' });
    check('a field left alone is never written back over a change made meanwhile',
        E.Na__LeScrapSpecEd__Patch(O, { title : O.title, body : 'Four openings.' }, { title : 'Renamed Elsewhere', body : O.body }), { body : 'Four openings.' });
    check('typed back to what the note already says: nothing written', E.Na__LeScrapSpecEd__Patch(O, { title : ' Loggia Arcade ', body : O.body }, O), null);
    check('both typed into: both written, tidied', E.Na__LeScrapSpecEd__Patch(O, { title : 'Loggia\nArcade East ', body : 'A.  \nB.' }, O), { title : 'Loggia Arcade East', body : 'A.\nB.' });
}

// -----------------------------------------------------------------------------
// REGION | ValeVision: the Filter, the Drop and the Wiring (package W2-35)
// -----------------------------------------------------------------------------

// Each shipped file is loaded as the row editor is above - its imports taken
// out - and every name it imports is read from a table of stand-ins set
// before it loads. Nothing in either file is copied into this test.
const W235_IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
async function loadShipped(file, stubs, tail) {
    let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    src = src.replace(W235_IMPORT, (whole, list) => {
        list.trim().replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
        return '';
    });
    const key  = '__w235_' + path.basename(file, '.js');
    globalThis[key] = stubs;
    const head = names.map((n) => 'const ' + n + ' = globalThis[' + JSON.stringify(key) + '][' + JSON.stringify(n) + '];').join('\n');
    const tmp  = path.join(os.tmpdir(), 'Na__Test__SpecInlineEdit__' + path.basename(file, '.js') + '_' + Math.random().toString(36).slice(2) + '.mjs');
    fs.writeFileSync(tmp, head + '\n' + src + '\n' + (tail || ''), 'utf8');
    return import(pathToFileURL(tmp).href);
}

const W235_GROUPS = [
    { Group__Id : 'SpecGroup_010', Group__Prefix : 'RF', Group__Title : 'Roofs', Group__IsGeneral : false, Group__Notes : [
        { Note__Id : 'SpecNote_011', Note__Code : 'RF01', Note__Title : 'Slate Roof', Note__Body : 'Natural slate on treated battens.' },
        { Note__Id : 'SpecNote_012', Note__Code : 'RF02', Note__Title : 'Rooflight', Note__Body : 'Conservation rooflight, flush fitting.' } ] },
    { Group__Id : 'SpecGroup_020', Group__Prefix : 'EX', Group__Title : 'External Works', Group__IsGeneral : false, Group__Notes : [
        { Note__Id : 'SpecNote_021', Note__Code : 'EX01', Note__Title : 'Paving', Note__Body : 'Permeable surface to the terrace.' },
        { Note__Id : 'SpecNote_022', Note__Code : 'EX02', Note__Title : 'Interface', Note__Body : 'Interface with the existing wall.' } ] },
    { Group__Id : 'SpecGroup_030', Group__Prefix : 'GN', Group__Title : 'General', Group__IsGeneral : true, Group__Notes : [
        { Note__Id : 'SpecNote_031', Note__Code : 'GN01', Note__Title : 'Workmanship', Note__Body : 'To current standards; see the rf drawings.' } ] },
    { Group__Id : 'SpecGroup_040', Group__Prefix : 'DR', Group__Title : 'Doors', Group__IsGeneral : false, Group__Notes : [] }
];
const W235_ENTRY = (noteId) => {
    for (const group of W235_GROUPS) for (const note of group.Group__Notes) if (note.Note__Id === noteId) return { code : note.Note__Code, note : note, group : group };
    return null;
};

console.log('\n  ValeVision: the filter (the shipped panel\'s own)');
{
    const P = await loadShipped(path.join(SCRAP, 'Na__LayoutEditor__Panel__ScrapbookSpecification__.js'), {},
        'export const __w235 = { Rows : Na__LePanelScrapSpec__Rows, SetHeads : (h) => { Na__LePanelScrapSpec__Heads = h; }, SetFilter : (f) => { Na__LePanelScrapSpec__Filter = f; }, ApplyFilter : Na__LePanelScrapSpec__ApplyFilter };');
    const T = P.__w235;
    const heads = W235_GROUPS.filter((g) => g.Group__Notes.length > 0).map((group) => {
        const heading = { hidden : false, prefix : group.Group__Prefix };
        group.Group__Notes.forEach((note) => T.Rows.set(note.Note__Id, {                      // <-- As BuildRows writes a row
            tile : { hidden : false }, note : note,
            code : String(note.Note__Code).toLowerCase(),
            text : [ group.Group__Title, note.Note__Title, note.Note__Body ].join(' ').toLowerCase()
        }));
        return { heading : heading, noteIds : group.Group__Notes.map((note) => note.Note__Id) };
    });
    T.SetHeads(heads);
    const shownCodes = () => [ ...T.Rows.values() ].filter((row) => !row.tile.hidden).map((row) => row.note.Note__Code);
    const shownHeads = () => heads.filter((head) => !head.heading.hidden).map((head) => head.heading.prefix);

    T.SetFilter('rf');
    check('"rf" finds only the codes starting RF - not "surface", "interface" or a note that says "rf"', [ T.ApplyFilter(true), shownCodes() ], [ 2, [ 'RF01', 'RF02' ] ]);
    check('...and the groups it emptied are put away with their headings', shownHeads(), [ 'RF' ]);
    T.SetFilter('RF');
    check('"RF" in capitals finds the same', (T.ApplyFilter(true), shownCodes()), [ 'RF01', 'RF02' ]);
    T.SetFilter('rf02');
    check('a whole code finds its one note', (T.ApplyFilter(true), shownCodes()), [ 'RF02' ]);
    T.SetFilter('slate');
    check('a word of three letters or more is looked for in the words', (T.ApplyFilter(true), shownCodes()), [ 'RF01' ]);
    T.SetFilter('ex surface');
    check('every word typed must find the row', (T.ApplyFilter(true), shownCodes()), [ 'EX01' ]);
    T.SetFilter('rf');
    check('a filter left over while the box is not on show hides nothing', [ T.ApplyFilter(false), shownHeads() ], [ 5, [ 'RF', 'EX', 'GN' ] ]);
}

console.log('\n  ValeVision: the drop (the shipped library)');
{
    const rotSrc = path.join(SRC, '51__System__LayoutEditor', '20__System__Viewports', 'Na__LayoutEditor__ViewportRotation__.js');
    const rotTmp = path.join(os.tmpdir(), 'Na__Test__SpecInlineEdit__ViewportRotation_' + Math.random().toString(36).slice(2) + '.mjs');
    fs.writeFileSync(rotTmp, fs.readFileSync(rotSrc, 'utf8'), 'utf8');                         // <-- A pure leaf: the real one
    const R = await import(pathToFileURL(rotTmp).href);
    const inserts = [];
    const sheet = {
        viewports : [ { Viewport__FrameMm : { X : 20, Y : 20, WidthMm : 100, HeightMm : 80 } }, { Viewport__FrameMm : { X : 250, Y : 150, WidthMm : 100, HeightMm : 80 } } ],
        leaders   : [ { Leader__Type : 'bubble', Leader__SpecNoteId : 'SpecNote_011' }, { Leader__Type : 'bubble', Leader__SpecNoteId : 'SpecNote_011' },
                      { Leader__Type : 'note', Leader__SpecNoteId : 'SpecNote_012' }, { Leader__Type : 'bubble', Leader__Text : 'XX01' } ]
    };
    const Lib = await loadShipped(path.join(SCRAP, 'Na__LayoutEditor__ScrapbookSpecification__.js'), {
        Na__LeModel__GetViewports      : (s) => s.viewports,
        Na__LeModel__GetLeaders        : (s) => s.leaders,
        Na__LeRec__NormaliseLeader     : (record) => record,
        Na__LeLayout__Solve            : () => ({ Page : { WidthMm : 420, HeightMm : 297 } }),
        Na__LeLeadGeo__TYPE_BUBBLE     : 'bubble',
        Na__LeLeadGeo__Layout          : () => ({ head : { radius : 4 } }),
        Na__LeClip__InsertSet          : (s, set, spot) => { inserts.push({ set : set, spot : spot }); return [ { kind : 'leader', id : 'Leader_099' } ]; },
        Na__LeTools__GetLeaderDefaults : () => ({ textSizeMm : 2.5, filled : false, fillColour : '#ffffff' }),
        Na__LeSpec__IsLoaded           : () => true,
        Na__LeSpec__GetGroups          : () => W235_GROUPS,
        Na__LeSpec__GetNoteEntry       : W235_ENTRY,
        Na__LeSpecLink__IsBubble       : (leader) => leader.Leader__Type === 'bubble',
        Na__LeSpecLink__NoteIdOf       : (leader) => leader.Leader__SpecNoteId || null,
        Na__LeVpRot__DistanceTo        : R.Na__LeVpRot__DistanceTo,
        Na__LeVpRot__Centre            : R.Na__LeVpRot__Centre
    });
    check('the tab lists every note by group, in order; a group with no notes is left out',
        Lib.Na__LeScrapSpec__Groups().map((g) => g.prefix + ':' + g.notes.map((n) => n.code).join(',')), [ 'RF:RF01,RF02', 'EX:EX01,EX02', 'GN:GN01' ]);
    check('the on-sheet count: linked bubbles only', [ ...Lib.Na__LeScrapSpec__UsageOnSheet(sheet).entries() ], [ [ 'SpecNote_011', 2 ] ]);

    const selected = Lib.Na__LeScrapSpec__Insert(sheet, 'SpecNote_011', { x : 150, y : 50 });
    const drop = inserts[0];
    const rec  = drop ? drop.set.entries[0].record : {};
    check('a drop is handed to the item clipboard\'s InsertSet once (one undo step), at the set\'s own origin',
        [ inserts.length, drop ? [ drop.spot.x, drop.spot.y ] : null, selected ], [ 1, [ 146, 46 ], [ { kind : 'leader', id : 'Leader_099' } ] ]);
    check('...a bubble carrying its note\'s code and link', [ rec.Leader__Type, rec.Leader__Text, rec.Leader__SpecNoteId ], [ 'bubble', 'RF01', 'SpecNote_011' ]);
    check('...its circle centred under the pointer', [ drop.set.origin.x + (drop.set.size.WidthMm / 2), drop.set.origin.y + (drop.set.size.HeightMm / 2), rec.Leader__AnchorXMm + 4, rec.Leader__AnchorYMm ], [ 150, 50, 150, 50 ]);
    check('...its tail aimed into the nearest drawing (right of it and above its middle: tip to the left and below)', [ rec.Leader__TipXMm, rec.Leader__TipYMm ], [ 132, 59 ]);
    Lib.Na__LeScrapSpec__Insert(sheet, 'SpecNote_021', { x : 200, y : 250 });
    const rec2 = inserts[1].set.entries[0].record;
    check('dropped left of and below the other drawing, the tip runs right and up into it', [ rec2.Leader__AnchorXMm, rec2.Leader__TipXMm, rec2.Leader__TipYMm, rec2.Leader__Text ], [ 204, 218, 241, 'EX01' ]);
    check('a note that has gone drops nothing', [ Lib.Na__LeScrapSpec__Insert(sheet, 'SpecNote_999', { x : 10, y : 10 }), inserts.length ], [ null, 2 ]);
    check('the tile and the ghost draw the bubble bare: no line, no endpoint', (() => { const r = Lib.Na__LeScrapSpec__BuildSet('SpecNote_012').entries[0].record; return [ r.Leader__LinePt, r.Leader__EndpointSizeMm ]; })(), [ 0, 0 ]);
}

console.log('\n  ValeVision: the wiring and the words');
{
    const mc = fs.readFileSync(path.join(SRC, '51__System__LayoutEditor', '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js'), 'utf8').replace(/\r\n/g, '\n')
        .split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');                       // <-- The code, not its log
    const at = (text) => mc.indexOf(text);
    const order = [ "RegisterTab('left', { id : 'document'", 'Na__LePanelScrapSpec__RegisterTab();', 'Na__LePanelSheet__Register();', 'Na__LePanelModelLayers__Register();', 'Na__LePanelScrapSpec__Register();', "RegisterTab('right', { id : 'properties'" ].map(at);
    check('the mode controller: Document Preferences, then Specification, then the left sections, the Specification section after Model Layers, then the right column',
        [ order.every((i) => i > 0), order.every((i, n) => n === 0 || i > order[n - 1]) ], [ true, true ]);
    check('...and imports both from 58__Feature__ScrapbookSpecification', /import \{ Na__LePanelScrapSpec__RegisterTab, Na__LePanelScrapSpec__Register \} from '\.\.\/58__Feature__ScrapbookSpecification\/Na__LayoutEditor__Panel__ScrapbookSpecification__\.js';/.test(mc), true);
    const cfgText = fs.readFileSync(path.join(SCRAP, 'Na__LayoutEditor__ScrapbookSpecification__Config__.json'), 'utf8');
    const cfg = JSON.parse(cfgText);
    check('the config reads, names this app\'s notes file and dictionary, and no TrueVision file',
        [ typeof cfg.LayoutEditor__ScrapbookSpecification__Labels.Labels__TabTitle, /ValeVision__DrawingNotes__\.json/.test(cfgText), /50__ValeVision__UserConfig\/ValeVision__UserSpellings__\.json/.test(cfgText), /TrueVision__|50__TrueVision/.test(cfgText) ],
        [ 'string', true, true, false ]);
}

// endregion -------------------------------------------------------------------

console.log('\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\n');
process.exit(failures === 0 ? 0 : 1);
