// =============================================================================
// VALEVISION3D - TEST - THE DOCUMENT KEYS AND THE KEY SCOPE
// =============================================================================
//
// FILE       : Na__Test__DocumentKeys__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Document Keys Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove a letter typed into a document is a letter, and that each of the app's three keyboards keeps to its own tab
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - THE REPORT. On the Statements tab, typing R (and B, T, Y and the digits)
//   into the statement did nothing: the 3D Model tab's hotkeys were still
//   listening, their typing test missed contenteditable, and they took the
//   key. Ctrl+S saved the sheets rather than the statement.
// - THE KEY SCOPE (Na__AppUtils__KeyScope__): three scopes, model until the
//   mode controller's reader is handed over, the reader asked afresh on
//   every key, model again from a reader that fails or talks nonsense, and a
//   typing test that counts contenteditable.
// - THE 3D HOTKEYS (Na__AppUtils__ValeVision__HotkeyHandler__): R resets the
//   view on the 3D Model tab and nowhere else, and never while anything
//   editable has the focus - the statement page, or a plan annotation label
//   on the 3D tab itself.
// - THE DOCUMENTS' KEYBOARD (Na__LayoutEditor__DocumentKeys__): the shipped
//   bindings match what the Statements tab always answered (Command as Ctrl,
//   / and ? alike) and refuse AltGr; a key is acted on only in the document
//   scope and only by the document on screen; a document with no answer, or
//   one that declines, leaves the key to go on; a held key is taken but acts
//   once; and a bare key that would type a character is never acted on while
//   the focus takes text, whatever the key map binds.
// - Each module is the shipped file with its import lines swapped for stubs
//   and nothing else touched. The key scope is ONE instance shared by the test
//   and both modules, as it is in the app.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.110.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2, with the mode controller's wiring
//                   of the key scope and the documents' keyboard
// - Parity        : adapted - TrueVision's 44 checks, its 3D section run against this app's own handler
// - Divergences   :
//   - Banner and the printed title read ValeVision3D.
//   - The 3D section loads 03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js, this app's own
//     handler (DR-33), where TrueVision loads 10__NavigationAndCameras/Na__Hotkeys__Manager.js. Its
//     Initialize takes the callbacks and fetches its dictionary itself, so fetch answers from the
//     tree under test and the listener is looked for once the read has settled; the callbacks carry
//     ValeVision__ action names.
//   - ValeVision checks follow TrueVision's, each marked VV: the rest of the 3D keys and the
//     dictionary's documentation rows; the mode controller's hand-over of its reader, read out of the
//     shipped file; and the documents' keyboard on the real files under that reader.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.0.0
// - Written with the documents' keyboard (TrueVision3D v2.110.0).
//
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough
// -----------------------------------------------------------------------------

    // The modules touch window (a listener) and document (the focus). A key
    // event is a plain object that records what was done to it.
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
// REGION | Loading a Module With Its Imports Stubbed
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');

    // VV: THE 3D HANDLER READS ITS OWN DICTIONARY. This app's handler is not
    // handed its key file, as TrueVision's Manager is: Initialize fetches it by
    // a page-relative path. fetch answers from the tree under test until the
    // documents' section puts its own in, and settle() lets the read finish
    // before the listener is looked for.
    const diskFetch = async (input) => {
        const request = String(input);
        const at      = request.indexOf('02__Src__AppModules/');
        const file    = at === -1 ? null : resolve(SRC, request.slice(at + '02__Src__AppModules/'.length).split('?')[0]);
        let text = null;
        try { text = file ? readFileSync(file, 'utf8') : null; } catch (error) { text = null; }
        return text === null ? { ok : false, status : 404, json : async () => { throw new Error('404'); } }
                             : { ok : true,  status : 200, json : async () => JSON.parse(text) };
    };
    globalThis.fetch = diskFetch;
    const settle = () => new Promise((done) => setTimeout(done, 50));

    function strip(relative) {
        let src = readFileSync(resolve(SRC, relative), 'utf8');
        const had = /^\s*import\s/m.test(src);
        src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        return src;
    }

    // THE KEY SCOPE is a leaf: copied as it is, and imported by URL with no
    // query so the test and both stubbed modules share the one instance.
    const scopeFile = join(tmpdir(), 'Na__Test__DocumentKeys__Scope__.mjs');
    writeFileSync(scopeFile, strip('03__AppUtils/Na__AppUtils__KeyScope__.js'), 'utf8');
    const scopeUrl = pathToFileURL(scopeFile).href;
    const Scope    = await import(scopeUrl);

    async function load(relative, tag) {
        const stub = "import { Na__KeyScope__MODEL, Na__KeyScope__SHEET, Na__KeyScope__DOCUMENT, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from '" + scopeUrl + "';\n";
        const tmp  = join(tmpdir(), 'Na__Test__DocumentKeys__' + tag + '__.mjs');
        writeFileSync(tmp, stub + strip(relative), 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

    const Hotkeys = await load('03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js', 'Hotkeys');   // <-- VV: this app's own 3D handler (DR-33)
    const DocKeys = await load('51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js', 'DocKeys');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    function check(name, got, want) {
        const passed = JSON.stringify(got) === JSON.stringify(want);
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    }

    console.log('ValeVision3D - the documents\' keyboard and the key scope');

    // THE KEY SCOPE
    // ------------------------------------------------------------
    // liveScope stands in for the mode controller's state: the reader handed
    // to Follow answers from it, as Na__LeMode__KeyScope answers from Active
    // and View.
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

    // THE 3D HOTKEYS
    // ------------------------------------------------------------
    console.log('\n  The 3D Model tab\'s hotkeys');
    const ran = [];
    Hotkeys.Na__ValeVision__HotkeyHandler__Initialize(                         // <-- VV: handed the callbacks only; it reads 02__AppData/Na__Hotkeys__3dModelTab__.json itself
        { ValeVision__NavMode__ResetView : () => ran.push('reset'), ValeVision__NavMode__SetWalkMode : () => ran.push('walk'), ValeVision__PresentationMode__GoToScene1 : () => ran.push('scene1') }
    );
    await settle();                                                            // <-- VV: the listener goes on once the dictionary has been read
    const hotkeyListener = listeners.find((entry) => entry.type === 'keydown' && !entry.capture);
    if (!hotkeyListener) { console.log('  FAIL  VV: the 3D handler never listened - its dictionary could not be read'); process.exit(1); }
    const press3d = (scope, focus, name) => {
        liveScope = scope;
        document.activeElement = focus;
        ran.length = 0;
        const event = key(name, { target : focus });
        hotkeyListener.fn(event);
        return [ ran.slice(), event.prevented ];
    };
    check('R on the 3D Model tab resets the view and takes the key', press3d('model', BODY, 'r'), [ [ 'reset' ], true ]);
    check('R in a plan annotation label on the 3D tab is a letter',   press3d('model', LABEL, 'r'), [ [], false ]);
    check('R in a text box on the 3D tab is a letter (as before)',    press3d('model', FIELD, 'r'), [ [], false ]);
    check('R typed into the statement is a letter',                   press3d('document', PAGE, 'r'), [ [], false ]);
    check('R on a document tab, nothing focused, does nothing',       press3d('document', BODY, 'R'), [ [], false ]);
    check('T on a drawing tab does not put the hidden model into Walk', press3d('sheet', BODY, 't'), [ [], false ]);
    check('1 on a drawing tab does not fly the hidden camera',        press3d('sheet', BODY, '1'), [ [], false ]);

    // THE DOCUMENTS' KEYBOARD - MATCHING
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

    // THE DOCUMENTS' KEYBOARD - WHO ANSWERS
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

    // THE TYPING RULE HOLDS WHATEVER THE KEY MAP SAYS
    // ------------------------------------------------------------
    // A key map that binds a bare Q, loaded the way the app loads it.
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | ValeVision Checks (VV)
// -----------------------------------------------------------------------------
//
// Three blocks this app adds after TrueVision's checks, each check marked VV:
//   1. the rest of its 3D keys, the dictionary's documentation rows, and a
//      page whose editor has not loaded - this app's own handler (DR-33);
//   2. the mode controller's hand-over: its imports, the reader it gives the
//      key scope - read out of the shipped file and run on every view - and
//      the documents' keyboard it waits on and starts;
//   3. the documents' keyboard on the real files - the module at its path,
//      this app's KeyScope, the shipped key map - under that reader.
// -----------------------------------------------------------------------------

    const VV_HANDLER = '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js';
    const VV_SCOPE   = '03__AppUtils/Na__AppUtils__KeyScope__.js';
    const VV_DOCKEYS = '51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js';
    const VV_KEYMAP  = '51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json';
    const VV_MODE    = '51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js';
    const BUILT_IN   = [ 'Doc__Save', 'Doc__ToggleSource', 'Doc__ToggleMono' ];
    globalThis.fetch = diskFetch;                                               // <-- TrueVision's last section put its own in

    // HELPER | A function's whole text, braces matched, out of a module's code
    function FunctionText(code, name) {
        const at = code.indexOf('function ' + name + '(');
        if (at === -1) return null;
        let depth = 0;
        for (let index = code.indexOf('{', at); index !== -1 && index < code.length; index++) {
            if (code[index] === '{') depth++;
            else if (code[index] === '}') { depth--; if (depth === 0) return code.slice(at, index + 1); }
        }
        return null;
    }

    // VV 1 | THE REST OF THE 3D KEYS, THE DOCUMENTATION ROWS, AND A PAGE BEFORE THE EDITOR LOADS
    // ------------------------------------------------------------
    console.log('\n  VV: the rest of the 3D keys, the documentation rows, and a page before the editor loads');
    check('VV: T on the 3D Model tab enters Walk and takes the key', press3d('model', BODY, 't'), [ [ 'walk' ], true ]);
    const allKeys = {
        ValeVision__NavMode__ResetView                 : () => ran.push('reset'),
        ValeVision__NavMode__SetOrbitMode              : () => ran.push('orbit'),
        ValeVision__NavMode__SetWalkMode               : () => ran.push('walk'),
        ValeVision__NavMode__SetFlyMode                : () => ran.push('fly'),
        ValeVision__PresentationMode__ToggleViewsPanel : () => ran.push('carousel'),
        ValeVision__PresentationMode__NextScene        : () => ran.push('next'),
        ValeVision__PresentationMode__PrevScene        : () => ran.push('previous')
    };
    for (let index = 1; index <= 9; index++) allKeys['ValeVision__PresentationMode__GoToScene' + index] = () => ran.push('scene' + index);
    const AllHotkeys = await load(VV_HANDLER, 'HotkeysAll');
    const beforeAll  = listeners.length;
    AllHotkeys.Na__ValeVision__HotkeyHandler__Initialize(allKeys);
    await settle();
    const allListener = listeners.slice(beforeAll).find((entry) => entry.type === 'keydown' && !entry.capture);
    check('VV: a handler given every 3D action reads its dictionary and listens', !!allListener, true);
    const pressAll = (scope, focus, name) => {
        liveScope = scope;
        document.activeElement = focus;
        ran.length = 0;
        const event = key(name, { target : focus });
        if (allListener) allListener.fn(event);
        return [ ran.slice(), event.prevented ];
    };
    check('VV: B, Y and V on the 3D Model tab still answer',
        [ 'b', 'y', 'v' ].map((name) => pressAll('model', BODY, name)), [ [ [ 'orbit' ], true ], [ [ 'fly' ], true ], [ [ 'carousel' ], true ] ]);
    const VIEW_KEYS = [ 't', 'r', 'v', 'b', 'y', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'PageUp', 'PageDown' ];
    check('VV: T, R, V, B, Y, 1-9, Page Up and Page Down on a drawing tab leave the hidden camera, Walk and the carousel alone',
        VIEW_KEYS.map((name) => pressAll('sheet', BODY, name)).filter(([ fired, prevented ]) => fired.length || prevented).length, 0);
    check('VV: and on a document tab',
        VIEW_KEYS.map((name) => pressAll('document', BODY, name)).filter(([ fired, prevented ]) => fired.length || prevented).length, 0);
    const warned   = [];
    const keepWarn = console.warn;
    console.warn = (...args) => warned.push(args.map(String).join(' '));
    const docRows = [ 'd', 'o', 'Delete', 'Escape' ].map((name) => pressAll('model', BODY, name));
    console.warn = keepWarn;
    check('VV: D, O, Delete and Escape on the 3D tab are documentation rows - no action, the key left to the page, no "No callback"',
        [ docRows, warned.some((line) => line.includes('No callback')) ], [ [ [ [], false ], [ [], false ], [ [], false ], [ [], false ] ], false ]);

    // A fresh page: its own key scope and its own handler, no reader handed over yet.
    const freshScopeFile = join(tmpdir(), 'Na__Test__DocumentKeys__ScopeFresh__.mjs');
    writeFileSync(freshScopeFile, strip(VV_SCOPE), 'utf8');
    const freshScopeUrl = pathToFileURL(freshScopeFile).href;
    const FreshScope    = await import(freshScopeUrl);
    const freshFile     = join(tmpdir(), 'Na__Test__DocumentKeys__HotkeysFresh__.mjs');
    writeFileSync(freshFile, "import { Na__KeyScope__MODEL, Na__KeyScope__SHEET, Na__KeyScope__DOCUMENT, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from '" + freshScopeUrl + "';\n" + strip(VV_HANDLER), 'utf8');
    const FreshHotkeys  = await import(pathToFileURL(freshFile).href + '?v=' + Math.random().toString(36).slice(2));
    const beforeFresh   = listeners.length;
    FreshHotkeys.Na__ValeVision__HotkeyHandler__Initialize(allKeys);
    await settle();
    const freshListener = listeners.slice(beforeFresh).find((entry) => entry.type === 'keydown' && !entry.capture);
    const freshPress    = (name) => { ran.length = 0; document.activeElement = BODY; const event = key(name); if (freshListener) freshListener.fn(event); return [ ran.slice(), event.prevented ]; };
    check('VV: before the editor hands its reader over the scope reads as the 3D model\'s, and R and T answer',
        [ FreshScope.Na__KeyScope__Get(), freshPress('r'), freshPress('t') ], [ 'model', [ [ 'reset' ], true ], [ [ 'walk' ], true ] ]);

    // VV 2 | THE MODE CONTROLLER'S HAND-OVER
    // ------------------------------------------------------------
    // Read out of the shipped file: whole comment lines and the house's
    // trailing "// <--" notes are dropped first, so a call left only in a
    // comment cannot pass.
    console.log('\n  VV: the mode controller\'s hand-over');
    const modeCode = readFileSync(resolve(SRC, VV_MODE), 'utf8').replace(/\r\n?/g, '\n').split('\n')
        .filter((line) => !/^\s*\/\//.test(line)).map((line) => line.replace(/\s+\/\/ <--.*$/, '')).join('\n');
    const modeDir  = resolve(SRC, VV_MODE, '..');
    const importOf = (from) => {
        const found = modeCode.match(new RegExp('import\\s*\\{([^}]*)\\}\\s*from\\s*\'' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\''));
        return found ? found[1].split(',').map((name) => name.trim()).filter(Boolean).sort() : null;
    };
    check('VV: the mode controller imports the key scope and the documents\' keyboard at TrueVision\'s paths, and both files are there',
        [ importOf('../../03__AppUtils/Na__AppUtils__KeyScope__.js'), importOf('../31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js'),
          existsSync(resolve(modeDir, '../../03__AppUtils/Na__AppUtils__KeyScope__.js')), existsSync(resolve(modeDir, '../31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js')) ],
        [ [ 'Na__KeyScope__DOCUMENT', 'Na__KeyScope__Follow', 'Na__KeyScope__MODEL', 'Na__KeyScope__SHEET' ], [ 'Na__LeDocKeys__Initialize', 'Na__LeDocKeys__Ready' ], true, true ]);
    const initText  = FunctionText(modeCode, 'Na__LeMode__Initialize') || '';
    const atFollow  = initText.indexOf('Na__KeyScope__Follow(Na__LeMode__KeyScope)');
    const atAll     = initText.indexOf('Promise.all(');
    const atThen    = atAll === -1 ? -1 : initText.indexOf('.then(', atAll);
    const atStart   = initText.indexOf('Na__LeDocKeys__Initialize()');
    const readyList = (initText.match(/Promise\.all\(\s*\[([^\]]*)\]/) || [])[1] || '';
    check('VV: it hands its reader to the key scope at initialisation, before anything is waited on', [ atFollow !== -1, atAll !== -1, atFollow < atAll ], [ true, true, true ]);
    check('VV: it waits on the documents\' key map with the other configs', /\bNa__LeDocKeys__Ready\(\)/.test(readyList), true);
    check('VV: and starts the documents\' keyboard once the editor is ready', [ atStart !== -1, atThen !== -1, atStart > atThen ], [ true, true, true ]);
    const views = {};
    for (const found of modeCode.matchAll(/const\s+(Na__LeMode__VIEW_[A-Z]+)\s*=\s*'([^']*)'/g)) views[found[1]] = found[2];
    check('VV: its view names are TrueVision\'s', views,
        { Na__LeMode__VIEW_SHEET : 'sheet', Na__LeMode__VIEW_REGISTER : 'register', Na__LeMode__VIEW_SPEC : 'spec', Na__LeMode__VIEW_STATEMENT : 'statement' });
    const readerText = FunctionText(modeCode, 'Na__LeMode__KeyScope');
    check('VV: the reader is in the file', typeof readerText === 'string' && readerText.length > 0, true);
    if (!readerText) { console.log('\n  ' + failures + ' check(s) FAILED (no reader to run)'); process.exit(1); }
    // The reader is run as the file has it, its state held in a closure the
    // test sets: whether the editor is open, and which view is up.
    const makeReader = (constants, state) => new Function('Na__KeyScope__MODEL', 'Na__KeyScope__SHEET', 'Na__KeyScope__DOCUMENT', 'Na__LeMode__VIEW_SHEET', 'state',
        'let Na__LeMode__Active = false, Na__LeMode__View = null;\n' + readerText +
        '\nreturn function () { Na__LeMode__Active = state.active; Na__LeMode__View = state.view; return Na__LeMode__KeyScope(); };')(
        constants.Na__KeyScope__MODEL, constants.Na__KeyScope__SHEET, constants.Na__KeyScope__DOCUMENT, views.Na__LeMode__VIEW_SHEET, state);
    const modeState  = { active : false, view : views.Na__LeMode__VIEW_SHEET };
    const modeReader = makeReader(Scope, modeState);
    const readAs     = (active, view) => { modeState.active = active; modeState.view = view; return modeReader(); };
    check('VV: its reader - the editor shut is the 3D model\'s; a drawing tab the sheet\'s; the specification, the register and the statements the documents\'',
        [ readAs(false, 'sheet'), readAs(false, 'spec'), readAs(true, 'sheet'), readAs(true, 'spec'), readAs(true, 'register'), readAs(true, 'statement') ],
        [ 'model', 'model', 'sheet', 'document', 'document', 'document' ]);
    check('VV: the key scope takes it', Scope.Na__KeyScope__Follow(modeReader), true);
    const pressEditor = (active, view, focus, name) => {
        modeState.active = active; modeState.view = view;
        document.activeElement = focus;
        ran.length = 0;
        const event = key(name, { target : focus });
        allListener.fn(event);
        return [ ran.slice(), event.prevented ];
    };
    check('VV: under it, R resets the view while the editor is shut',            pressEditor(false, 'sheet', BODY, 'r'), [ [ 'reset' ], true ]);
    check('VV: T, R and V on a drawing tab reach nothing in the 3D view',       [ 't', 'r', 'v' ].map((name) => pressEditor(true, 'sheet', BODY, name)), [ [ [], false ], [ [], false ], [ [], false ] ]);
    check('VV: and R typed into the Project Specification is a letter',          pressEditor(true, 'spec', FIELD, 'r'), [ [], false ]);

    // VV 3 | THE DOCUMENTS' KEYBOARD ON THE REAL FILES, UNDER THE MODE CONTROLLER'S READER
    // ------------------------------------------------------------
    console.log('\n  VV: the documents\' keyboard on the real files');
    let RealDoc = null, RealScope = null, linkError = null;
    try { RealDoc = await import(pathToFileURL(resolve(SRC, VV_DOCKEYS)).href); RealScope = await import(pathToFileURL(resolve(SRC, VV_SCOPE)).href); }
    catch (error) { linkError = String(error && error.message || error); }
    check('VV: the module at its real path links against this app\'s KeyScope', linkError, null);
    check('VV: and exports TrueVision\'s ten names', RealDoc ? Object.keys(RealDoc).sort() : null,
        [ 'Na__LeDocKeys__GetBindings', 'Na__LeDocKeys__Held', 'Na__LeDocKeys__Initialize', 'Na__LeDocKeys__KeyLabel', 'Na__LeDocKeys__Match',
          'Na__LeDocKeys__OnKeyDown', 'Na__LeDocKeys__Ready', 'Na__LeDocKeys__Register', 'Na__LeDocKeys__TypesCharacter', 'Na__LeDocKeys__Unregister' ]);
    if (!RealDoc || !RealScope) { console.log('\n  ' + failures + ' check(s) FAILED (the module did not link)'); process.exit(1); }

    const asked = [];
    globalThis.fetch = async (url, options) => {
        asked.push({ url : String(url), cache : options && options.cache });
        const path = fileURLToPath(String(url));
        if (!existsSync(path)) return { ok : false, status : 404, json : async () => { throw new Error('404'); } };
        return { ok : true, status : 200, json : async () => JSON.parse(readFileSync(path, 'utf8')) };
    };
    const loaded = await RealDoc.Na__LeDocKeys__Ready();
    const again  = await RealDoc.Na__LeDocKeys__Ready();
    check('VV: Ready() reads the key map beside the module once, uncached, and answers the same each time',
        [ asked.length, asked.length ? asked[0].url.endsWith('/02__Src__AppModules/' + VV_KEYMAP) : false, asked.length ? asked[0].cache : null, !!loaded && loaded === again ],
        [ 1, true, 'no-store', true ]);
    const shipped     = JSON.parse(readFileSync(resolve(SRC, VV_KEYMAP), 'utf8'));
    const shippedList = shipped.LayoutEditor__DocumentKeys__Bindings.Bindings__List;
    check('VV: GetBindings() is then the shipped key map - Save, the raw markdown, Lucida Console - with Command counted as Ctrl',
        [ JSON.stringify(RealDoc.Na__LeDocKeys__GetBindings()) === JSON.stringify(shippedList), shippedList.map((binding) => binding.Action), shipped.LayoutEditor__DocumentKeys__Setup.Setup__MetaIsCtrl ],
        [ true, BUILT_IN, true ]);

    const unavailable = [];
    const keepWarn2   = console.warn;
    console.warn = (...args) => unavailable.push(String(args[0]));
    let rejected = false;
    const Missing = await load(VV_DOCKEYS, 'Missing');
    globalThis.fetch = async () => ({ ok : false, status : 404, json : async () => { throw new Error('404'); } });
    const missing = await Missing.Na__LeDocKeys__Ready().catch(() => { rejected = true; });
    const Offline = await load(VV_DOCKEYS, 'Offline');
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const offline = await Offline.Na__LeDocKeys__Ready().catch(() => { rejected = true; });
    console.warn = keepWarn2;
    globalThis.fetch = diskFetch;
    check('VV: a key map that is missing or out of reach never rejects, leaves the built-in bindings, and says so under this app\'s prefix',
        [ rejected, missing, offline, Missing.Na__LeDocKeys__GetBindings().map((binding) => binding.Action), Offline.Na__LeDocKeys__GetBindings().map((binding) => binding.Action), unavailable ],
        [ false, null, null, BUILT_IN, BUILT_IN,
          [ '[ValeVision3D LayoutEditor] Document key map unavailable - the built-in bindings are used.', '[ValeVision3D LayoutEditor] Document key map unavailable - the built-in bindings are used.' ] ]);

    // The real module, under the mode controller's own reader on the real KeyScope.
    const realState = { active : false, view : views.Na__LeMode__VIEW_SHEET };
    check('VV: the real key scope takes the mode controller\'s reader', RealScope.Na__KeyScope__Follow(makeReader(RealScope, realState)), true);
    RealDoc.Na__LeDocKeys__Initialize();
    const realListener = listeners.find((entry) => entry.type === 'keydown' && entry.capture && entry.fn === RealDoc.Na__LeDocKeys__OnKeyDown);
    check('VV: the documents\' keyboard listens on the window in the capture phase, once', [ !!realListener, RealDoc.Na__LeDocKeys__Initialize() ], [ true, false ]);
    // The editor's own Ctrl+S (the mode controller's OnSaveKey, a document
    // capture listener) hears only what the documents' keyboard let through.
    const editor     = [];
    const editorSave = (event) => { if (event.repeat || event.defaultPrevented) return; if ((event.key === 's' || event.key === 'S') && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); editor.push('save'); } };
    const pressReal  = (active, view, name, o) => {
        realState.active = active; realState.view = view;
        editor.length = 0;
        const event = key(name, o);
        realListener.fn(event);
        if (!event.stopped) editorSave(event);
        return [ editor.slice(), event.prevented, event.stopped ];
    };
    check('VV: on the Project Specification a letter typed into a field or a text area is a letter, and with nothing focused it is left alone',
        [ pressReal(true, 'spec', 'r', { target : FIELD }), pressReal(true, 'spec', 'b', { target : AREA }), pressReal(true, 'spec', 't', { target : BODY }) ],
        [ [ [], false, false ], [ [], false, false ], [ [], false, false ] ]);
    check('VV: on the Project Specification Ctrl+S goes on to the editor\'s save', pressReal(true, 'spec', 's', { ctrl : true, target : FIELD }), [ [ 'save' ], true, false ]);
    const failedWith = [];
    const keepError  = console.error;
    console.error = (...args) => failedWith.push(String(args[0]));
    RealDoc.Na__LeDocKeys__Register('failing', { isShowing : () => realState.view === 'statement', actions : { Doc__ToggleMono : () => { throw new Error('boom'); } } });
    const failing = pressReal(true, 'statement', '.', { ctrl : true });
    console.error = keepError;
    RealDoc.Na__LeDocKeys__Unregister('failing');
    check('VV: an answer that fails is reported under this app\'s prefix, and the key is kept', [ failedWith, failing ],
        [ [ '[ValeVision3D LayoutEditor] Document key Doc__ToggleMono failed:' ], [ [], true, true ] ]);
    const docSaves = [];
    RealDoc.Na__LeDocKeys__Register('register', { isShowing : () => realState.view === 'register', actions : { Doc__Save : () => { docSaves.push('register'); } } });
    const pressRegister = (view, name, o) => { docSaves.length = 0; return [ docSaves ].concat(pressReal(true, view, name, o)).map((part) => Array.isArray(part) ? part.slice() : part); };
    check('VV: a document that answers Ctrl+S saves itself, and the editor never hears it', pressRegister('register', 's', { ctrl : true }), [ [ 'register' ], [], true, true ]);
    check('VV: a held key acts once, and Command counts as Ctrl',
        [ pressRegister('register', 's', { ctrl : true, repeat : true }), pressRegister('register', 's', { meta : true }) ],
        [ [ [], [], true, true ], [ [ 'register' ], [], true, true ] ]);
    check('VV: the same Ctrl+S on a drawing tab is left to the drawing', pressRegister('sheet', 's', { ctrl : true }), [ [], [ 'save' ], true, false ]);
    RealDoc.Na__LeDocKeys__Unregister('register');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.log('');
    if (failures) { console.log('  ' + failures + ' check(s) FAILED'); process.exit(1); }
    console.log('  Every check passed.');
    process.exit(0);

// endregion -------------------------------------------------------------------
