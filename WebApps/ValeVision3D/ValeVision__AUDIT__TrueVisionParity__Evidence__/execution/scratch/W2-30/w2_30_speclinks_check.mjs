// W2-30 scratch check: SpecLinks 1.2.0 registers the broken-link and note resolvers with LeaderGeometry 1.3.0.
// Loads the REAL specification units, the barrel, SpecLinks and LeaderGeometry from <root> (default: the live
// app), each import outside that set stubbed by name. Usage: node w2_30_speclinks_check.mjs [appRoot]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(HERE, '..', '..', '..', '..'));
const LE   = path.join(ROOT, '02__Src__AppModules', '51__System__LayoutEditor');
const SPEC = path.join(LE, '50__Feature__Specification');
const FILES = {
    'Na__LayoutEditor__Statement__Lockstep__.js' : path.join(LE, '52__Feature__StatementWriter', '01__Core__Data', 'Na__LayoutEditor__Statement__Lockstep__.js'),
    'Na__LayoutEditor__LeaderGeometry__.js'      : path.join(LE, '15__Core__Markup', 'Na__LayoutEditor__LeaderGeometry__.js'),
    'Na__LayoutEditor__SpecLinks__.js'           : path.join(SPEC, 'Na__LayoutEditor__SpecLinks__.js')
};
[ 'State', 'Document', 'Draft', 'Lockstep', 'Editing', 'Transport' ].forEach((u) => { FILES['Na__LayoutEditor__SpecData__' + u + '__.js'] = path.join(SPEC, 'Na__LayoutEditor__SpecData__' + u + '__.js'); });
FILES['Na__LayoutEditor__SpecData__.js'] = path.join(SPEC, 'Na__LayoutEditor__SpecData__.js');

let failures = 0;
function check(name, got, want) {
    const passed = JSON.stringify(got) === JSON.stringify(want);
    if (!passed) failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
    if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'na_w2_30_links_'));
fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}', 'utf8');
const url = (name) => pathToFileURL(path.join(dir, name)).href;
Object.keys(FILES).forEach((name) => {
    let src = fs.readFileSync(FILES[name], 'utf8').replace(/\r\n/g, '\n');
    const stubbed = [];
    src = src.replace(IMPORT, (whole, names, spec) => {
        const base = spec.split('/').pop();
        if (FILES[base]) return 'import ' + names + ' from ' + JSON.stringify(url(base)) + ';';
        names.trim().slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => stubbed.push(s.split(/\s+as\s+/).pop()));
        return '';
    });
    const head = stubbed.map((n) => 'const ' + n + ' = (...args) => globalThis.__w[' + JSON.stringify(n) + '](...args);').join('\n');
    fs.writeFileSync(path.join(dir, name), head + '\n' + src, 'utf8');
});

// THE WORLD
const store = new Map();
const events = [];
const pushed = [];
const listeners = {};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    location : { origin : 'http://localhost:8000', hostname : 'localhost', port : '8000' },
    dispatchEvent : (event) => { events.push(event); (listeners[event.type] || []).forEach((fn) => fn(event)); return true; },
    addEventListener : (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); }, removeEventListener : () => {},
    setTimeout : (fn, ms) => setTimeout(fn, ms), clearTimeout : (id) => clearTimeout(id),
    setInterval : (fn, ms) => setInterval(fn, ms), clearInterval : (id) => clearInterval(id),
    localStorage : { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => store.set(k, String(v)), removeItem : (k) => store.delete(k) }
};
globalThis.document = { addEventListener : () => {}, visibilityState : 'visible' };
const DOC = {
    ProjectSpecification__UpdatedIso : '2026-10-02T08:00:00.000Z', ProjectSpecification__NumberDigits : 2, ProjectSpecification__LastIdNumber : 3,
    ProjectSpecification__Revision : 'A', ProjectSpecification__DocumentNumber : '',
    ProjectSpecification__Groups : [ { Group__Id : 'SpecGroup_001', Group__Prefix : 'EW', Group__Title : 'External Walls', Group__IsGeneral : false,
        Group__Notes : [
            { Note__Id : 'SpecNote_002', Note__Title : 'Loggia Arcade', Note__Body : 'Three arched openings.' },
            { Note__Id : 'SpecNote_003', Note__Title : 'Flanking Windows', Note__Body : 'Larger windows.' }
        ] } ]
};
globalThis.fetch = async () => ({ ok : false, status : 404, headers : { get : () => null }, json : async () => null });
const SETUP = { fileName : 'ValeVision__DrawingNotes__.json', legacyFileName : '', loadTimeoutMs : 2000, numberDigits : 2, prefixMaxLength : 4,
    defaultRevision : 'A', documentNumberSuffix : '_SPEC', historySteps : 50, draftEnabled : true, draftDebounceMs : 20, confirmOverwrite : true,
    starterGroups : [], lockstepEnabled : true, lockstepPollMs : 1000, autoSaveLocalMs : 0 };
const LEADER = { textSizeMm : 2.5, fontWeight : 600, dashMm : 0.8, endpointSizeMm : 1.6, bubbleSizeMm : 9, bubblePaddingMm : 1.2,
    textGapMm : 1, textPaddingMm : 1, lineSpacing : 1.3, textAttach : 'first-line', stubMm : 6, stubMaxFraction : 0.5, curveTension : 0.5 };
const valueStub = (v) => Object.assign(() => v, { toString : () => v, valueOf : () => v });
globalThis.__w = {
    Na__LeCfg__GetSpecificationSetup : () => SETUP, Na__LeCfg__GetLabel : (k, f) => f,
    Na__LeCfg__FormatLabel : (k, f) => f, Na__LeCfg__GetLeaderSetup : () => LEADER, Na__LeCfg__GetTextSetup : () => ({ fontFamily : 'Open Sans' }),
    Na__LeCfg__PtToMm : (pt) => pt * 25.4 / 72,
    Na__LeChrome__MeasureTextMm : (text, fontMm) => String(text).length * fontMm * 0.6,
    Na__LeChrome__PushPolyline : (list, points, stroke, widthMm, fill) => { pushed.push({ stroke, fill }); },
    Na__LeChrome__PushText : () => {},
    Na__DrawData__GetProjectCode : () => 'TT01', Na__DrawData__CHANGED_EVENT : valueStub('na-drawdata-changed'),
    Na__AppUtils__IsRunningOnLocalhost : () => true, Na__DevGate__IsAuthoringEnabled : () => false,
    Na__AppUtils__ConfirmDialog__Show : async () => true,
    Na__CfApi__IsConfigured : () => true,
    Na__CfApi__ProjectFileLocation : (n) => ({ repoUrl : 'http://localhost:8000/Whitecardopedia/Projects/2026/TT01__Test/' + n, cdnUrl : 'https://cdn.example/' + n }),
    Na__CfApi__ReadProjectFile : async () => ({ ok : true, missing : false, data : JSON.parse(JSON.stringify(DOC)) }),
    Na__CfApi__WriteProjectFile : async () => ({ ok : true }),
    Na__LocalMirror__WriteSiblingFile : async () => ({ ok : true, skipped : false, error : null }),
    Na__LeModel__CHANGED_EVENT : valueStub('na-layouteditor-model-changed'),
    Na__LeModel__GetSheets : () => [], Na__LeModel__GetLeaders : () => [], Na__LeModel__UpdateLeader : () => {}, Na__LeModel__IsLayerVisible : () => true
};

const Spec  = await import(url('Na__LayoutEditor__SpecData__.js'));
const Links = await import(url('Na__LayoutEditor__SpecLinks__.js'));
const Geo   = await import(url('Na__LayoutEditor__LeaderGeometry__.js'));

console.log('\nW2-30 - specification links: the broken-link and note resolvers (root ' + ROOT + ')\n');
const bubble = (over) => Object.assign({ Leader__Id : 'Leader_001', Leader__Type : 'bubble', Leader__Text : 'EW01', Leader__TipXMm : 10, Leader__TipYMm : 10,
    Leader__AnchorXMm : 40, Leader__AnchorYMm : 30, Leader__LinePt : 0.35, Leader__LineColour : '#172b3a', Leader__BubbleEdgePt : 0.35,
    Leader__FillColour : '#f2f4f5', Leader__TextColour : '#172b3a', Leader__SpecNoteId : 'SpecNote_002' }, over || {});
const halos = () => pushed.filter((p) => p.stroke === '#d92d20').length;

check('before Initialize nothing is registered: not broken, no note', [ Geo.Na__LeLeadGeo__IsBroken(bubble({ Leader__SpecNoteId : 'SpecNote_999' })), Geo.Na__LeLeadGeo__NoteFor(bubble()) ], [ false, null ]);
Links.Na__LeSpecLink__Initialize();
check('a linked bubble before the specification loads is not broken (pending)', Geo.Na__LeLeadGeo__IsBroken(bubble({ Leader__SpecNoteId : 'SpecNote_999' })), false);
Spec.Na__LeSpec__Initialize({ editable : true, showToast : () => {} });
await Spec.Na__LeSpec__EnsureLoaded();
check('loaded: a bubble linked to a note that exists is not broken', Geo.Na__LeLeadGeo__IsBroken(bubble()), false);
const note = Geo.Na__LeLeadGeo__NoteFor(bubble());
check('NoteFor(leader) answers { noteId, code, title, linked, locate }', note && [ Object.keys(note), note.noteId, note.code, note.title, note.linked, typeof note.locate ], [ [ 'noteId', 'code', 'title', 'linked', 'locate' ], 'SpecNote_002', 'EW01', 'Loggia Arcade', true, 'function' ]);
events.length = 0;
note.locate();
check('locate() dispatches na-layouteditor-spec-locate with the note and the leader', events.map((e) => [ e.type, e.detail ]), [ [ 'na-layouteditor-spec-locate', { noteId : 'SpecNote_002', leaderId : 'Leader_001' } ] ]);
check('...which is the barrel\'s LOCATE_EVENT', Spec.Na__LeSpec__LOCATE_EVENT, 'na-layouteditor-spec-locate');
const unlinked = Geo.Na__LeLeadGeo__NoteFor(bubble({ Leader__SpecNoteId : null, Leader__Text : 'EW02' }));
check('an unlinked bubble reading a note\'s code: linked false', unlinked && [ unlinked.noteId, unlinked.code, unlinked.linked ], [ 'SpecNote_003', 'EW02', false ]);
check('a bubble reading a code no note has: no note', Geo.Na__LeLeadGeo__NoteFor(bubble({ Leader__SpecNoteId : null, Leader__Text : 'ZZ09' })), null);

pushed.length = 0;
Geo.Na__LeLeadGeo__Push([], bubble(), { showBrokenHalos : true });
check('a linked bubble on screen: no red halo', halos(), 0);

Spec.Na__LeSpec__DeleteNote('SpecNote_002');
check('the note is deleted: the bubble linked to it reads broken (IsBroken)', Geo.Na__LeLeadGeo__IsBroken(bubble()), true);
check('...and has no note', Geo.Na__LeLeadGeo__NoteFor(bubble()), null);
pushed.length = 0;
Geo.Na__LeLeadGeo__Push([], bubble(), { showBrokenHalos : true });
check('...on screen (showBrokenHalos) it draws one red halo', halos(), 1);
pushed.length = 0;
Geo.Na__LeLeadGeo__Push([], bubble());
check('...for a PDF (no options) it draws none', halos(), 0);
Spec.Na__LeSpec__Undo();
check('undo brings the note back: not broken', Geo.Na__LeLeadGeo__IsBroken(bubble()), false);

console.log('\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\n');
process.exit(failures === 0 ? 0 : 1);
