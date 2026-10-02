// =============================================================================
// VALEVISION3D - TEST (SCRATCH, PACKAGE W1-30) - THE DOCUMENTS' KEYBOARD SECTIONS
// =============================================================================
//
// FILE       : Na__Test__DocumentKeys__.W1-30-sections.test.mjs
// PURPOSE    : Run TrueVision's Na__Test__DocumentKeys__ sections for the
//              documents' keyboard against ValeVision's landed module, ahead of
//              the full test file (W1-32 ports it; K3 section 8 "sections
//              earlier"), plus ValeVision checks on the real files.
//
// WHAT IS TAKEN FROM TRUEVISION (Na__Test__DocumentKeys__.test.mjs 1.0.0, read at
// b2aa9151), VERBATIM: the browser stub, the stubbed loader, and the sections
// "The key scope" (9), "The documents' key map" (12), "The documents' keyboard"
// (13) and "A bare-letter binding" (3) - 37 of its 44 checks. Left out: "The 3D
// Model tab's hotkeys" (7), which loads TrueVision's Na__Hotkeys__Manager.js -
// ValeVision keeps its own handler (DR-33) and W1-29 ran that section adapted.
//
// VALEVISION CHECKS (V1-V7), on the REAL files - the module at its real path,
// ValeVision's KeyScope it imports, and the shipped key map read from disk:
//   V1 the module links against KeyScope and exports TrueVision's ten names
//   V2 Ready() asks for the key map beside the module, uncached, and it exists
//   V3 the shipped key map is what GetBindings() then returns
//   V4 the built-in fallback resolves every key the same way as the file
//   V5 a key map that cannot be read leaves the built-in bindings, never rejects,
//      and says so under the [ValeVision3D LayoutEditor] prefix
//   V6 an answer that fails is reported under the same prefix
//   V7 the package's acceptance, ahead of the mode controller's wiring: on the
//      Project Specification bare letters type and Ctrl+S goes on to the
//      editor's save; a held key acts once; Command counts as Ctrl
//
// USAGE:
//     node Na__Test__DocumentKeys__.W1-30-sections.test.mjs
//   W1_30_SRC=<a 02__Src__AppModules folder> runs it against another copy
//   (the mutation runs). Exit 0 = every check passed; 1 = one did not.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough (TrueVision's, verbatim)
// -----------------------------------------------------------------------------

    const listeners = [];
    globalThis.window   = { addEventListener : (type, fn, capture) => listeners.push({ type, fn, capture : !!capture }) };
    globalThis.document = { activeElement : null };

    const BODY     = { tagName : 'BODY',     isContentEditable : false };
    const PAGE     = { tagName : 'ARTICLE',  isContentEditable : true  };   // <-- The statement being written
    const LABEL    = { tagName : 'DIV',      isContentEditable : true  };   // <-- A plan annotation label being edited on the 3D tab
    const FIELD    = { tagName : 'INPUT',    isContentEditable : false };
    const AREA     = { tagName : 'TEXTAREA', isContentEditable : false };
    const BUTTON   = { tagName : 'BUTTON',   isContentEditable : false };

    function key(name, options) {
        const o = options || {};
        return {
            key : name, target : o.target || BODY,
            ctrlKey : !!o.ctrl, shiftKey : !!o.shift, altKey : !!o.alt, metaKey : !!o.meta,
            repeat : !!o.repeat, isComposing : !!o.composing, defaultPrevented : !!o.prevented,
            prevented : false, stopped : false,
            preventDefault()           { this.prevented = true; },
            stopImmediatePropagation() { this.stopped = true; }
        };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading a Module With Its Imports Stubbed (TrueVision's, with the source root moved)
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT   = resolve(SCRIPT_DIR, '..', '..', '..', '..');                  // <-- scratch/W1-30 -> the ValeVision app root
    const SRC        = process.env.W1_30_SRC ? resolve(process.env.W1_30_SRC) : resolve(APP_ROOT, '02__Src__AppModules');
    const DOCKEYS    = '51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js';
    const KEYMAP     = '51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json';
    const KEYSCOPE   = '03__AppUtils/Na__AppUtils__KeyScope__.js';
    if (!existsSync(resolve(SRC, KEYSCOPE))) { console.error('FAIL: no KeyScope under ' + SRC); process.exit(1); }

    function strip(relative) {
        let src = readFileSync(resolve(SRC, relative), 'utf8');
        const had = /^\s*import\s/m.test(src);
        src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        return src;
    }

    const scopeFile = join(tmpdir(), 'Na__Test__DocumentKeys__W1-30__Scope__.mjs');
    writeFileSync(scopeFile, strip(KEYSCOPE), 'utf8');
    const scopeUrl = pathToFileURL(scopeFile).href;
    const Scope    = await import(scopeUrl);

    async function load(relative, tag) {
        const stub = "import { Na__KeyScope__MODEL, Na__KeyScope__SHEET, Na__KeyScope__DOCUMENT, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from '" + scopeUrl + "';\n";
        const tmp  = join(tmpdir(), 'Na__Test__DocumentKeys__W1-30__' + tag + '__.mjs');
        writeFileSync(tmp, stub + strip(relative), 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

    const DocKeys = await load(DOCKEYS, 'DocKeys');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0, passes = 0;
    function check(name, got, want) {
        const passed = JSON.stringify(got) === JSON.stringify(want);
        if (!passed) failures++; else passes++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    }

    console.log('ValeVision3D - the documents\' keyboard (W1-30 sections of TrueVision\'s Na__Test__DocumentKeys__)');
    console.log('  source root: ' + SRC);

    // THE KEY SCOPE (TrueVision's section, verbatim)
    // ------------------------------------------------------------
    console.log('\n  The key scope');
    let liveScope = 'model';
    let readerThrows = false;
    check('starts on the 3D model, before any reader is handed over', Scope.Na__KeyScope__Get(), 'model');
    check('the mode controller\'s reader is taken',                  Scope.Na__KeyScope__Follow(() => { if (readerThrows) throw new Error('half way through opening a tab'); return liveScope; }), true);
    liveScope = 'sheet';
    check('and asked afresh: a drawing tab is the sheet scope',       Scope.Na__KeyScope__Get(), 'sheet');
    check('anything but a function is refused, the reader kept',     [ Scope.Na__KeyScope__Follow('document'), Scope.Na__KeyScope__Get() ], [ false, 'sheet' ]);
    liveScope = 'documents';
    check('a name that is not a scope reads as the 3D model\'s',      Scope.Na__KeyScope__Get(), 'model');
    liveScope = 'document'; readerThrows = true;
    check('a reader that fails reads as the 3D model\'s, never deaf', Scope.Na__KeyScope__Get(), 'model');
    readerThrows = false;
    check('and the reader is asked again on the next key',           Scope.Na__KeyScope__Is('document'), true);
    check('the typing test: contenteditable, text box, text area, list',
        [ PAGE, LABEL, FIELD, AREA, { tagName : 'SELECT' } ].map(Scope.Na__KeyScope__IsTypingTarget), [ true, true, true, true, true ]);
    check('the typing test: the page body, a button, nothing',
        [ BODY, BUTTON, null ].map(Scope.Na__KeyScope__IsTypingTarget), [ false, false, false ]);

    // THE DOCUMENTS' KEYBOARD - MATCHING (TrueVision's section, verbatim)
    // ------------------------------------------------------------
    console.log('\n  The documents\' key map');
    const list  = DocKeys.Na__LeDocKeys__GetBindings();
    const held  = (o) => DocKeys.Na__LeDocKeys__Held(key('x', o), true);
    const match = (name, o) => { const b = DocKeys.Na__LeDocKeys__Match(list, name, held(o)); return b ? b.Action : null; };
    check('Ctrl+S saves',                          match('s', { ctrl : true }), 'Doc__Save');
    check('Command+S saves on a Mac',              match('s', { meta : true }), 'Doc__Save');
    check('Ctrl+Shift+S is not save',              match('S', { ctrl : true, shift : true }), null);
    check('AltGr+S (Ctrl+Alt) is never a shortcut', match('s', { ctrl : true, alt : true }), null);
    check('a bare S is only a letter',             match('s', {}), null);
    check('Ctrl+/ shows the raw markdown',         match('/', { ctrl : true }), 'Doc__ToggleSource');
    check('Ctrl+? (Shift held) does too',          match('?', { ctrl : true, shift : true }), 'Doc__ToggleSource');
    check('Ctrl+. switches the typeface',          match('.', { ctrl : true }), 'Doc__ToggleMono');
    check('Ctrl+> (Shift held) does too',          match('>', { ctrl : true, shift : true }), 'Doc__ToggleMono');
    check('Command stays Meta when MetaIsCtrl is off',
        DocKeys.Na__LeDocKeys__Held(key('s', { meta : true }), false), { Ctrl : false, Shift : false, Alt : false, Meta : true });
    check('a character is typed by a bare key or Shift, never by a chord',
        [ [ 'r', {} ], [ 'R', { shift : true } ], [ 's', { ctrl : true } ], [ 'Enter', {} ], [ 'F3', {} ] ].map(([ name, o ]) => DocKeys.Na__LeDocKeys__TypesCharacter(name, held(o))),
        [ true, true, false, false, false ]);
    check('the key label for a tooltip', [ DocKeys.Na__LeDocKeys__KeyLabel('Doc__Save'), DocKeys.Na__LeDocKeys__KeyLabel('Doc__ToggleSource'), DocKeys.Na__LeDocKeys__KeyLabel('Doc__Nothing') ], [ 'Ctrl+S', 'Ctrl+/', '' ]);

    // THE DOCUMENTS' KEYBOARD - WHO ANSWERS (TrueVision's section, verbatim)
    // ------------------------------------------------------------
    console.log('\n  The documents\' keyboard');
    DocKeys.Na__LeDocKeys__Initialize();
    const docListener = listeners.find((entry) => entry.type === 'keydown' && entry.capture);
    check('it listens on the window in the capture phase', !!docListener, true);
    check('and starts only once', DocKeys.Na__LeDocKeys__Initialize(), false);

    let statementsUp = true, specUp = false, answer = true;
    const saves = [];
    DocKeys.Na__LeDocKeys__Register('statements', { isShowing : () => statementsUp, actions : { Doc__Save : () => { saves.push('statement'); return answer; }, Doc__ToggleMono : () => { throw new Error('boom'); } } });
    DocKeys.Na__LeDocKeys__Register('specification', { isShowing : () => specUp, actions : {} });
    const pressDoc = (scope, name, o) => {
        liveScope = scope;
        saves.length = 0;
        const event = key(name, o);
        docListener.fn(event);
        return [ saves.slice(), event.prevented, event.stopped ];
    };
    check('Ctrl+S on the Statements tab saves the statement, and nobody else hears it', pressDoc('document', 's', { ctrl : true, target : PAGE }), [ [ 'statement' ], true, true ]);
    check('a held Ctrl+S is taken but saves once',                     pressDoc('document', 's', { ctrl : true, target : PAGE, repeat : true }), [ [], true, true ]);
    check('Ctrl+S on a drawing tab is left to the drawing',            pressDoc('sheet', 's', { ctrl : true }), [ [], false, false ]);
    check('Ctrl+S on the 3D Model tab is left alone',                  pressDoc('model', 's', { ctrl : true }), [ [], false, false ]);
    check('an input method composing keeps its keys',                  pressDoc('document', 's', { ctrl : true, composing : true }), [ [], false, false ]);
    check('a key already answered is not answered twice',              pressDoc('document', 's', { ctrl : true, prevented : true }), [ [], false, false ]);
    check('a plain R typed into the statement is not looked at',       pressDoc('document', 'r', { target : PAGE }), [ [], false, false ]);
    answer = false;
    check('a document that declines leaves the key to go on',          pressDoc('document', 's', { ctrl : true }), [ [ 'statement' ], false, false ]);
    answer = true;
    const quiet = console.error; console.error = () => {};
    check('a document whose answer fails still keeps its key',         pressDoc('document', '.', { ctrl : true }), [ [], true, true ]);
    console.error = quiet;
    statementsUp = false; specUp = true;
    check('Ctrl+S on the Project Specification goes on to the editor\'s save', pressDoc('document', 's', { ctrl : true }), [ [], false, false ]);
    specUp = false;
    check('with no document showing, nothing is taken',                pressDoc('document', 's', { ctrl : true }), [ [], false, false ]);

    // THE TYPING RULE HOLDS WHATEVER THE KEY MAP SAYS (TrueVision's section, verbatim)
    // ------------------------------------------------------------
    console.log('\n  A bare-letter binding, if anyone ever writes one');
    globalThis.fetch = async () => ({ ok : true, json : async () => ({ LayoutEditor__DocumentKeys__Bindings : { Bindings__List : [ { Id : 'Doc__Q', Action : 'Doc__Q', Enabled : true, Keys : [ 'q' ], Modifiers : [], ModifierMatch : 'Exact' } ] } }) });
    await DocKeys.Na__LeDocKeys__Ready();
    const qs = [];
    statementsUp = true;
    DocKeys.Na__LeDocKeys__Register('statements', { isShowing : () => statementsUp, actions : { Doc__Q : () => { qs.push('q'); return true; } } });
    const pressQ = (target) => { qs.length = 0; liveScope = 'document'; const event = key('q', { target }); docListener.fn(event); return [ qs.slice(), event.prevented ]; };
    check('Q typed into the statement stays a letter',  pressQ(PAGE),   [ [], false ]);
    check('Q typed into a text area stays a letter',    pressQ(AREA),   [ [], false ]);
    check('Q with the focus on a button is the binding', pressQ(BUTTON), [ [ 'q' ], true ]);

    const tvChecks = passes + failures;

    // =========================================================================
    // VALEVISION CHECKS - the real files, no stubs
    // =========================================================================

    // V1 | The module at its real path links against ValeVision's KeyScope
    // ------------------------------------------------------------
    console.log('\n  ValeVision: the real module, its key map and its key scope');
    const realDocUrl   = pathToFileURL(resolve(SRC, DOCKEYS)).href;
    const realScopeUrl = pathToFileURL(resolve(SRC, KEYSCOPE)).href;
    let RealDoc = null, RealScope = null, linkError = null;
    try { RealDoc = await import(realDocUrl); RealScope = await import(realScopeUrl); }
    catch (error) { linkError = String(error && error.message || error); }
    check('V1 the module at its real path links against ValeVision\'s KeyScope', linkError, null);
    check('V1 and exports TrueVision\'s ten names',
        RealDoc ? Object.keys(RealDoc).sort() : null,
        [ 'Na__LeDocKeys__GetBindings', 'Na__LeDocKeys__Held', 'Na__LeDocKeys__Initialize', 'Na__LeDocKeys__KeyLabel', 'Na__LeDocKeys__Match',
          'Na__LeDocKeys__OnKeyDown', 'Na__LeDocKeys__Ready', 'Na__LeDocKeys__Register', 'Na__LeDocKeys__TypesCharacter', 'Na__LeDocKeys__Unregister' ]);
    if (!RealDoc || !RealScope) { console.log('\n  ' + (failures) + ' check(s) FAILED (the module did not link)'); process.exit(1); }

    // V2 | Ready() asks for the key map beside the module, uncached, and it is there
    // ------------------------------------------------------------
    const asked = [];
    const shippedText = existsSync(resolve(SRC, KEYMAP)) ? readFileSync(resolve(SRC, KEYMAP), 'utf8') : null;
    globalThis.fetch = async (url, options) => {
        asked.push({ url : String(url), cache : options && options.cache });
        const path = fileURLToPath(String(url));
        if (!existsSync(path)) return { ok : false, status : 404, json : async () => { throw new Error('404'); } };
        return { ok : true, status : 200, json : async () => JSON.parse(readFileSync(path, 'utf8')) };
    };
    const loaded = await RealDoc.Na__LeDocKeys__Ready();
    const again  = await RealDoc.Na__LeDocKeys__Ready();
    check('V2 Ready() fetches once: one request for the key map, however often it is asked', asked.length, 1);
    check('V2 the request is the key map beside the module, uncached',
        asked.length ? [ asked[0].url.endsWith('/02__Src__AppModules/' + KEYMAP), asked[0].cache ] : null, [ true, 'no-store' ]);
    check('V2 and the file is there, where the browser will ask for it',
        asked.length ? existsSync(fileURLToPath(asked[0].url)) : false, true);
    check('V2 Ready() resolves to the key map it read (the same promise on a second call)', [ !!loaded, loaded === again ], [ true, true ]);

    // V3 | The shipped key map is what GetBindings() returns
    // ------------------------------------------------------------
    const shipped = shippedText ? JSON.parse(shippedText) : null;
    const shippedList = shipped ? shipped.LayoutEditor__DocumentKeys__Bindings.Bindings__List : null;
    check('V3 GetBindings() returns the shipped file\'s bindings', RealDoc.Na__LeDocKeys__GetBindings(), shippedList);
    check('V3 the shipped bindings: Save, raw markdown, Lucida Console, all on',
        (shippedList || []).map((b) => [ b.Action, b.Enabled, b.Keys, b.Modifiers, b.ModifierMatch ]),
        [ [ 'Doc__Save', true, [ 's', 'S' ], [ 'Ctrl' ], 'Exact' ], [ 'Doc__ToggleSource', true, [ '/', '?' ], [ 'Ctrl' ], 'ShiftOptional' ], [ 'Doc__ToggleMono', true, [ '.', '>' ], [ 'Ctrl' ], 'ShiftOptional' ] ]);
    check('V3 the shipped file counts Command as Ctrl (Setup__MetaIsCtrl)', shipped ? shipped.LayoutEditor__DocumentKeys__Setup.Setup__MetaIsCtrl : null, true);
    check('V3 the key labels come from the shipped file', [ RealDoc.Na__LeDocKeys__KeyLabel('Doc__Save'), RealDoc.Na__LeDocKeys__KeyLabel('Doc__ToggleSource'), RealDoc.Na__LeDocKeys__KeyLabel('Doc__ToggleMono') ], [ 'Ctrl+S', 'Ctrl+/', 'Ctrl+.' ]);

    // V4 | The built-in fallback resolves every key the same way as the file
    // ------------------------------------------------------------
    // A fresh instance that never read the file holds the built-in list.
    const Fallback = await load(DOCKEYS, 'Fallback');
    const fallbackList = Fallback.Na__LeDocKeys__GetBindings();
    const sweepKeys = [];
    for (let code = 32; code <= 126; code++) sweepKeys.push(String.fromCharCode(code));
    sweepKeys.push('Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F5', 'F12');
    let presses = 0, differ = [];
    for (const name of sweepKeys) {
        for (let mask = 0; mask < 16; mask++) {
            for (const metaIsCtrl of [ true, false ]) {
                const h = RealDoc.Na__LeDocKeys__Held(key(name, { ctrl : !!(mask & 1), shift : !!(mask & 2), alt : !!(mask & 4), meta : !!(mask & 8) }), metaIsCtrl);
                const a = RealDoc.Na__LeDocKeys__Match(shippedList, name, h);
                const b = RealDoc.Na__LeDocKeys__Match(fallbackList, name, h);
                presses++;
                if ((a && a.Action) !== (b && b.Action)) differ.push(name + '/' + mask + '/' + metaIsCtrl);
            }
        }
    }
    check('V4 the fallback and the shipped file resolve ' + presses + ' presses alike', differ, []);
    check('V4 and carry the same ids, keys and modifiers', fallbackList.map((b) => [ b.Id, b.Action, b.Enabled, b.Keys, b.Modifiers, b.ModifierMatch ]),
        (shippedList || []).map((b) => [ b.Id, b.Action, b.Enabled, b.Keys, b.Modifiers, b.ModifierMatch ]));

    // V5 | A key map that cannot be read: the built-in bindings, never a rejection, a ValeVision warning
    // ------------------------------------------------------------
    const warnings = [];
    const keepWarn = console.warn; console.warn = (...args) => warnings.push(args);
    let rejected = false;
    const Missing = await load(DOCKEYS, 'Missing');
    globalThis.fetch = async () => ({ ok : false, status : 404, json : async () => { throw new Error('404'); } });
    const missing = await Missing.Na__LeDocKeys__Ready().catch(() => { rejected = true; });
    const Offline = await load(DOCKEYS, 'Offline');
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const offline = await Offline.Na__LeDocKeys__Ready().catch(() => { rejected = true; });
    console.warn = keepWarn;
    check('V5 a missing or unreachable key map never rejects', [ rejected, missing, offline ], [ false, null, null ]);
    check('V5 and leaves the built-in bindings in force',
        [ Missing.Na__LeDocKeys__GetBindings().map((b) => b.Action), Offline.Na__LeDocKeys__GetBindings().map((b) => b.Action) ],
        [ [ 'Doc__Save', 'Doc__ToggleSource', 'Doc__ToggleMono' ], [ 'Doc__Save', 'Doc__ToggleSource', 'Doc__ToggleMono' ] ]);
    check('V5 and says so once each, under ValeVision\'s prefix',
        warnings.map((args) => String(args[0])),
        [ '[ValeVision3D LayoutEditor] Document key map unavailable - the built-in bindings are used.', '[ValeVision3D LayoutEditor] Document key map unavailable - the built-in bindings are used.' ]);

    // V6 | An answer that fails is reported under ValeVision's prefix
    // ------------------------------------------------------------
    RealScope.Na__KeyScope__Follow(() => liveScope);                              // <-- What Na__LeMode__KeyScope will hand over (W1-32)
    RealDoc.Na__LeDocKeys__Initialize();
    const realListener = listeners.find((entry) => entry.type === 'keydown' && entry.capture && entry.fn === RealDoc.Na__LeDocKeys__OnKeyDown);
    check('V6 the real module listens on the window, capture phase, once', [ !!realListener, RealDoc.Na__LeDocKeys__Initialize() ], [ true, false ]);
    const errors = [];
    const keepError = console.error; console.error = (...args) => errors.push(args);
    RealDoc.Na__LeDocKeys__Register('failing', { isShowing : () => true, actions : { Doc__ToggleMono : () => { throw new Error('boom'); } } });
    liveScope = 'document';
    const failed = key('.', { ctrl : true });
    realListener.fn(failed);
    console.error = keepError;
    RealDoc.Na__LeDocKeys__Unregister('failing');
    check('V6 a failing answer is reported under ValeVision\'s prefix, and the key kept',
        [ errors.map((args) => String(args[0])), failed.prevented, failed.stopped ],
        [ [ '[ValeVision3D LayoutEditor] Document key Doc__ToggleMono failed:' ], true, true ]);

    // V7 | The package's acceptance, ahead of the mode controller's wiring
    // ------------------------------------------------------------
    // The browser runs window capture listeners before document capture
    // listeners: the documents' keyboard first, then the mode controller's
    // save (Na__LeMode__OnSaveKey, document keydown, capture). editorSave is a
    // stand-in that hears only what the documents' keyboard let through.
    console.log('\n  ValeVision: the acceptance, on the real files');
    const editor = [];
    const editorSave = (event) => { if (event.repeat || event.defaultPrevented) return; if ((event.key === 's' || event.key === 'S') && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); editor.push('save'); } };
    const dispatch = (scope, name, o) => {
        liveScope = scope; editor.length = 0;
        const event = key(name, o);
        realListener.fn(event);
        if (!event.stopped) editorSave(event);
        return [ editor.slice(), event.prevented, event.stopped ];
    };
    // ValeVision today: the Project Specification is the one document tab, and it registers nothing (as in TrueVision).
    check('on the Specification a bare letter typed into a field types',              dispatch('document', 'r', { target : FIELD }), [ [], false, false ]);
    check('on the Specification a bare letter typed into a text area types',          dispatch('document', 'b', { target : AREA }),  [ [], false, false ]);
    check('on the Specification a bare letter with nothing focused is left alone',    dispatch('document', 't', { target : BODY }),  [ [], false, false ]);
    check('on the Specification Ctrl+S goes on to the editor\'s save',                dispatch('document', 's', { ctrl : true, target : FIELD }), [ [ 'save' ], true, false ]);
    check('on the Specification Ctrl+/ and Ctrl+. are left alone (nobody answers them)', [ dispatch('document', '/', { ctrl : true }), dispatch('document', '.', { ctrl : true }) ], [ [ [], false, false ], [ [], false, false ] ]);
    // A document tab that answers Ctrl+S itself (the Drawing Register and the Statements, when they port).
    const docSaves = [];
    RealDoc.Na__LeDocKeys__Register('register', { isShowing : () => true, actions : { Doc__Save : () => { docSaves.push('register'); } } });
    const pressRegister = (name, o) => { docSaves.length = 0; const r = dispatch('document', name, o); return [ docSaves.slice() ].concat(r); };
    check('a document that answers Ctrl+S saves itself, and the editor never hears it', pressRegister('s', { ctrl : true }), [ [ 'register' ], [], true, true ]);
    check('a held key acts once: the repeat is taken and nothing runs again',          pressRegister('s', { ctrl : true, repeat : true }), [ [], [], true, true ]);
    check('Command counts as Ctrl on a Mac: Command+S is the document\'s save',          pressRegister('s', { meta : true }), [ [ 'register' ], [], true, true ]);
    check('a held Command+S acts once too',                                              pressRegister('s', { meta : true, repeat : true }), [ [], [], true, true ]);
    check('a bare S typed into the document is still a letter',                          pressRegister('s', { target : PAGE }), [ [], [], false, false ]);
    check('the same Ctrl+S on a drawing tab is left to the drawing',                     (() => { docSaves.length = 0; const r = dispatch('sheet', 's', { ctrl : true }); return [ docSaves.slice() ].concat(r); })(), [ [], [ 'save' ], true, false ]);
    RealDoc.Na__LeDocKeys__Unregister('register');
    check('unregistered, Ctrl+S on the document tab goes on to the editor\'s save again', dispatch('document', 's', { ctrl : true }), [ [ 'save' ], true, false ]);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.log('');
    console.log('  TrueVision sections: ' + tvChecks + ' checks; ValeVision checks: ' + (passes + failures - tvChecks) + '; passed ' + passes + ' of ' + (passes + failures));
    if (failures) { console.log('  ' + failures + ' check(s) FAILED'); process.exit(1); }
    console.log('  Every check passed.');
    process.exit(0);

// endregion -------------------------------------------------------------------
