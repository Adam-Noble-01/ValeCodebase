// =============================================================================
// VALEVISION3D - TEST - THE DOCUMENT KEYS AND THE KEY SCOPE (W1-29 SECTIONS, SCRATCH COPY)
// =============================================================================
//
// FILE       : Na__Test__DocumentKeys__.W1-29-sections.test.mjs  (scratch; lands as
//              80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs with W1-32)
// NAMESPACE  : Na__Test
// MODULE     : Document Keys Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove a letter typed into a document is a letter, and that each of the app's three keyboards keeps to its own tab
// CREATED    : 21-Sep-2026
//
// WHAT THIS COPY IS:
// - TrueVision3D's 80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs
//   1.0.0, read at b2aa9151, cut to the two sections package W1-29 runs early
//   (K3 section 8, "sections earlier"): THE KEY SCOPE (verbatim) and THE 3D
//   HOTKEYS (adapted to ValeVision's own handler, DR-33). The documents'
//   keyboard sections need LE/31__System__DocumentKeys (W1-30) and land with
//   the whole file in W1-32, the test's porter.
// - The 3D section's adaptation, and nothing else:
//   - the module is 03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js,
//     whose Initialize takes only the callbacks and fetches its dictionary
//     itself (02__AppData/Na__Hotkeys__3dModelTab__.json, root key
//     Na__ValeVision__HotkeysDictionary), so fetch is answered from disk and
//     the listener is found once the fetch has settled;
//   - the callbacks carry ValeVision__ action names;
//   - ValeVision checks are added after TrueVision's (marked VV): T enters
//     Walk on the 3D tab, the rest of the 3D keys stay off a drawing and a
//     document tab, the dictionary's drawing-markup documentation rows (D, O,
//     Delete, Escape) take no key and log no "No callback", and a fresh page
//     whose editor has not handed its reader over keeps the 3D keys.
// - Each module is the shipped file with its import lines swapped for stubs
//   and nothing else touched. The key scope is ONE instance shared by the test
//   and the handler, as it is in the app.
//
// USAGE:
//     node Na__Test__DocumentKeys__.W1-29-sections.test.mjs [--src <02__Src__AppModules folder>]
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//   --src defaults to the live ValeVision3D tree.
//
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough
// -----------------------------------------------------------------------------

    // The modules touch window (a listener) and document (the focus). A key
    // event is a plain object that records what was done to it.
    const listeners = [];
    globalThis.window   = { addEventListener : (type, fn, capture) => listeners.push({ type, fn, capture : !!capture }),
                            removeEventListener : () => {} };
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

    // VV: the handler fetches its dictionary by a page-relative path; it is
    // answered from the tree under test. Every warning is kept.
    const argSrc = process.argv.indexOf('--src');
    const SRC    = argSrc !== -1 ? resolve(process.argv[argSrc + 1]) : 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules';
    globalThis.fetch = async (input) => {
        const request = String(input);
        const at      = request.indexOf('02__Src__AppModules/');
        const file    = at === -1 ? null : resolve(SRC, request.slice(at + '02__Src__AppModules/'.length).split('?')[0]);
        let text = null;
        try { text = file ? readFileSync(file, 'utf8') : null; } catch (error) { text = null; }
        return text === null ? { ok : false, status : 404, json : async () => { throw new Error('404'); } }
                             : { ok : true,  status : 200, json : async () => JSON.parse(text) };
    };
    const warnings = [];
    console.warn = (...args) => warnings.push(args.map(String).join(' '));
    const settle = () => new Promise((done) => setTimeout(done, 50));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading a Module With Its Imports Stubbed
// -----------------------------------------------------------------------------

    function strip(relative) {
        let src = readFileSync(resolve(SRC, relative), 'utf8');
        const had = /^\s*import\s/m.test(src);
        src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        return src;
    }

    // THE KEY SCOPE is a leaf: copied as it is, and imported by URL with no
    // query so the test and the stubbed handler share the one instance.
    const scopeFile = join(tmpdir(), 'Na__Test__DocumentKeys__Scope__.mjs');
    writeFileSync(scopeFile, strip('03__AppUtils/Na__AppUtils__KeyScope__.js'), 'utf8');
    const scopeUrl = pathToFileURL(scopeFile).href;
    const Scope    = await import(scopeUrl);

    async function load(relative, tag, url) {
        const stub = "import { Na__KeyScope__MODEL, Na__KeyScope__SHEET, Na__KeyScope__DOCUMENT, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from '" + (url || scopeUrl) + "';\n";
        const tmp  = join(tmpdir(), 'Na__Test__DocumentKeys__' + tag + '__.mjs');
        writeFileSync(tmp, stub + strip(relative), 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

    const HANDLER = '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js';                 // <-- VV: TrueVision's is 10__NavigationAndCameras/Na__Hotkeys__Manager.js
    const Hotkeys = await load(HANDLER, 'Hotkeys');

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

    console.log('ValeVision3D - the key scope and the 3D Model tab\'s hotkeys (W1-29 sections of Na__Test__DocumentKeys__)');
    console.log('  tree under test: ' + SRC);

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
    const viewKeys = {                                                         // <-- VV: ValeVision__ actions, and every 3D key so the drawing-tab checks see them all
        ValeVision__NavMode__ResetView                 : () => ran.push('reset'),
        ValeVision__NavMode__SetOrbitMode              : () => ran.push('orbit'),
        ValeVision__NavMode__SetWalkMode               : () => ran.push('walk'),
        ValeVision__NavMode__SetFlyMode                : () => ran.push('fly'),
        ValeVision__PresentationMode__ToggleViewsPanel : () => ran.push('carousel'),
        ValeVision__PresentationMode__NextScene        : () => ran.push('next'),
        ValeVision__PresentationMode__PrevScene        : () => ran.push('previous')
    };
    for (let index = 1; index <= 9; index++) viewKeys['ValeVision__PresentationMode__GoToScene' + index] = () => ran.push('scene' + index);
    Hotkeys.Na__ValeVision__HotkeyHandler__Initialize(viewKeys);              // <-- VV: the handler fetches its own dictionary
    await settle();
    const hotkeyListener = listeners.find((entry) => entry.type === 'keydown' && !entry.capture);
    check('VV: the dictionary is read and the listener is on the window', !!hotkeyListener, true);
    const press3d = (scope, focus, name, options) => {
        liveScope = scope;
        document.activeElement = focus;
        ran.length = 0;
        const event = key(name, Object.assign({ target : focus }, options || {}));
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

    // VV: THE REST OF THE PACKAGE'S ACCEPTANCE
    // ------------------------------------------------------------
    console.log('\n  VV: the rest of the 3D keys, the documentation rows, and a page before the editor loads');
    check('VV: T on the 3D Model tab enters Walk and takes the key',  press3d('model', BODY, 't'), [ [ 'walk' ], true ]);
    check('VV: B, Y and V on the 3D Model tab still answer',
        [ 'b', 'y', 'v' ].map((name) => press3d('model', BODY, name)), [ [ [ 'orbit' ], true ], [ [ 'fly' ], true ], [ [ 'carousel' ], true ] ]);
    const VIEW_KEYS = [ 't', 'r', 'v', 'b', 'y', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'PageUp', 'PageDown' ];
    check('VV: T, R, V, B, Y, 1-9, Page Up and Page Down on a drawing tab leave the hidden camera, Walk and the carousel alone',
        VIEW_KEYS.map((name) => press3d('sheet', BODY, name)).filter(([ fired, prevented ]) => fired.length || prevented).length, 0);
    check('VV: and on a document tab',
        VIEW_KEYS.map((name) => press3d('document', BODY, name)).filter(([ fired, prevented ]) => fired.length || prevented).length, 0);
    const docRow = (name) => { const before = warnings.length; const result = press3d('model', BODY, name); return result.concat([ warnings.slice(before).some((w) => w.includes('No callback')) ]); };
    check('VV: D, O, Delete and Escape on the 3D tab are documentation rows - no action, the key left to the page, no "No callback"',
        [ 'd', 'o', 'Delete', 'Escape' ].map(docRow), [ [ [], false, false ], [ [], false, false ], [ [], false, false ], [ [], false, false ] ]);

    // A fresh page: its own key scope and its own handler, no reader handed over yet.
    const freshScopeFile = join(tmpdir(), 'Na__Test__DocumentKeys__ScopeFresh__.mjs');
    writeFileSync(freshScopeFile, strip('03__AppUtils/Na__AppUtils__KeyScope__.js'), 'utf8');
    const freshScopeUrl = pathToFileURL(freshScopeFile).href;
    const FreshScope    = await import(freshScopeUrl);
    const FreshHotkeys  = await load(HANDLER, 'HotkeysFresh', freshScopeUrl);
    const listenerCount = listeners.length;
    FreshHotkeys.Na__ValeVision__HotkeyHandler__Initialize(viewKeys);
    await settle();
    const freshListener = listeners.slice(listenerCount).find((entry) => entry.type === 'keydown' && !entry.capture);
    const freshPress = (name) => { ran.length = 0; document.activeElement = BODY; const event = key(name); freshListener.fn(event); return [ ran.slice(), event.prevented ]; };
    check('VV: before the editor hands its reader over the scope reads as model, and R and T answer',
        [ FreshScope.Na__KeyScope__Get(), freshPress('r'), freshPress('t') ], [ 'model', [ [ 'reset' ], true ], [ [ 'walk' ], true ] ]);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.log('');
    if (failures) { console.log('  ' + failures + ' check(s) FAILED'); process.exit(1); }
    console.log('  Every check passed.');
    process.exit(0);

// endregion -------------------------------------------------------------------
