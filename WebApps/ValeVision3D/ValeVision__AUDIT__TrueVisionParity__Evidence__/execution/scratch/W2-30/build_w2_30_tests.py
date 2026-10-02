# W2-30 tests: TrueVision's two tests at the pin, with ValeVision's identity, its file name and
# location, and (SpecLockstep only) a ValeVision region proving this package's own acceptance items.
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'candidate', '80__Testing__PrototypeEnvironment')
VVREL = '{{VVREL:W2-30}}'


def tv_text(rel):
    raw = subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout
    assert b'\r\n' not in raw
    return raw.decode('utf-8')


def rep(text, old, new, count=1):
    found = text.count(old)
    assert found == count, f'expected {count} x {old!r}, found {found}'
    return text.replace(old, new)


def write(name, text):
    for bad in ('TrueVision__', 'TRUEVISION3D', 'NaProjectPortal', 'na-project-portal', '30__TrueVision__AppContent', '[TrueVision3D'):
        body = text
        if '// PORT NOTE:' in body:
            a = body.index('// PORT NOTE:')
            b = body.index('// DEVELOPMENT LOG:')
            body = body[:a] + body[b:]
        c = body.index('// DEVELOPMENT LOG:')
        d = body.index('// =====', c)
        body = body[:c] + body[d:]
        assert bad not in body, f'{name}: {bad!r} left'
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(text.encode('utf-8'))
    print(f'{name}: {text.count(chr(10))} lines, sha1 {hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]}')


# -----------------------------------------------------------------------------
# Na__Test__StatementLockstep__ - verbatim but for the banner and a PORT NOTE
# -----------------------------------------------------------------------------
t = tv_text('80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs')
t = rep(t, '// TRUEVISION3D - TEST - ', '// VALEVISION3D - TEST - ')
t = rep(t, '// -----\n//\n// DEVELOPMENT LOG:\n', '\n'.join([
    '// -----',
    '//',
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs',
    '// - Source version: 1.0.0 (TrueVision3D v2.157.0, 23-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', with the rules file it tests',
    '//                   (52__Feature__StatementWriter/01__Core__Data, landed ahead of the Statement Writer)',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. The browser half named in DESCRIPTION (the Statements tab against',
    '//     Na__Test__StatementServer__.py) arrives with the Statement Writer (W4).',
    '// - Back-port     : none.',
    '//',
    '// -----',
    '//',
    '// DEVELOPMENT LOG:',
    '']))
write('Na__Test__StatementLockstep__.test.mjs', t)


# -----------------------------------------------------------------------------
# Na__Test__SpecLockstep__ - adapted: the world is this app's, and a ValeVision region
# -----------------------------------------------------------------------------
t = tv_text('80__Testing__PrototypeEnvironment/Na__Test__SpecLockstep__.test.mjs')
t = rep(t, '// TRUEVISION3D - TEST - ', '// VALEVISION3D - TEST - ')
t = rep(t, '//   the bucket) and the ProjectVision local server (a map standing in for the\n',
           '//   the bucket) and the Whitecardopedia local server (a map standing in for the\n')
t = rep(t, '//   - A hand-written note with no id never makes the watch ask again and\n'
           '//     again: the file\'s key ignores this session\'s id floor.\n',
           '//   - A hand-written note with no id never makes the watch ask again and\n'
           '//     again: the file\'s key ignores this session\'s id floor.\n'
           '// - WHAT IS PROVED FOR VALEVISION (its own region, after TrueVision\'s cases)\n'
           '//   - With LockstepEnabled false the last save wins, as before the lockstep:\n'
           '//     a browser draft is put back unasked, the file is never autosaved, and\n'
           '//     Sync writes the file without looking.\n'
           '//   - Off localhost (no Worker config there) the local server is never\n'
           '//     called: no read of the file, no write of it, and Sync refuses.\n'
           '//   - The source: no specification unit reaches R2DrawingNotes; R2 is\n'
           '//     written only by the Transport unit\'s Na__CfApi__WriteProjectFile and\n'
           '//     the local file only by the Lockstep unit\'s\n'
           '//     Na__LocalMirror__WriteSiblingFile.\n'
           '//   - The barrel exports WriteLocalCopy, LOCATE_EVENT and the lockstep API.\n')
t = rep(t, '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n', '\n'.join([
    '// -----------------------------------------------------------------------------',
    '//',
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SpecLockstep__.test.mjs',
    '// - Source version: 1.0.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', with the specification lockstep',
    '// - Parity        : adapted',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. The file is ValeVision__DrawingNotes__.json and its local copy is',
    '//     served the way the Whitecardopedia server serves it (/Whitecardopedia/Projects/<folderId>/...).',
    '//   - The units reach the same names TrueVision\'s do (Na__CfApi__*, Na__LocalMirror__WriteSiblingFile):',
    '//     this app\'s transport facade (W0-12) has them, so the stubs are TrueVision\'s, with the Worker\'s',
    '//     IsConfigured following world.configured, the CDN copy served from the bucket, and every call',
    '//     that reaches the local server counted.',
    '//   - A ValeVision region after TrueVision\'s cases (DESCRIPTION) proves package W2-30\'s acceptance.',
    '// - Back-port     : the ValeVision region could join TrueVision\'s copy.',
    '//',
    '// -----------------------------------------------------------------------------',
    '//',
    '// DEVELOPMENT LOG:',
    '']))
t = rep(t, "        fileName : 'TrueVision__DrawingNotes__.json', legacyFileName : ''",
           "        fileName : 'ValeVision__DrawingNotes__.json', legacyFileName : ''")
t = rep(t, "    const REPO_URL = 'http://localhost:8090/na-project-portal/26-Projects/TT01__Test/30__TrueVision__AppContent/TrueVision__DrawingNotes__.json';",
           "    const REPO_URL = 'http://localhost:8000/Whitecardopedia/Projects/2026/TT01__Test/ValeVision__DrawingNotes__.json';\n"
           "    const CDN_URL  = 'https://cdn.example/ValeVision__DrawingNotes__.json';")
t = rep(t, "        localhost : true,\n", "        localhost : true,\n        configured : true,              // <-- The facade's IsConfigured: localhost with the Worker config\n        localCalls : 0,                 // <-- Every call that reaches the local server (a read or a write of the file)\n")
t = rep(t, "        location            : { origin : 'http://localhost:8090', hostname : 'localhost', port : '8090' },",
           "        location            : { origin : 'http://localhost:8000', hostname : 'localhost', port : '8000' },")
t = rep(t, "        if (String(where) === REPO_URL) {\n",
           "        if (String(where) === REPO_URL) {\n            world.localCalls++;\n")
t = rep(t, "        return { ok : false, status : 404, headers : { get : () => null }, json : async () => null };\n    };\n",
           "        if (String(where) === CDN_URL && world.bucket.has(FILE)) {\n"
           "            return { ok : true, status : 200, headers : { get : () => null }, json : async () => clone(world.bucket.get(FILE)) };\n"
           "        }\n"
           "        return { ok : false, status : 404, headers : { get : () => null }, json : async () => null };\n    };\n")
t = rep(t, "        Na__CfApi__IsConfigured          : () => true,\n",
           "        Na__CfApi__IsConfigured          : () => world.configured,\n")
t = rep(t, "        Na__LocalMirror__WriteSiblingFile : async (name, doc) => {\n            if (!world.localhost)",
           "        Na__LocalMirror__WriteSiblingFile : async (name, doc) => {\n            world.localCalls++;\n            if (!world.localhost)")
t = rep(t, "console.log('\\nTrueVision3D - the specification in lockstep with its local file\\n\\n  Loading and the autosave');",
           "console.log('\\nValeVision3D - the specification in lockstep with its local file\\n\\n  Loading and the autosave');")

VV_REGION = r"""

// -----------------------------------------------------------------------------
// REGION | ValeVision: the Switch, Off Localhost, the Source and the Barrel
// -----------------------------------------------------------------------------

console.log('\n  ValeVision: LockstepEnabled false - the last save wins, as before the lockstep');
SETUP.lockstepEnabled = false;
await S.Na__LeSpec__Sync({ showToast : () => {} });
S.Na__LeSpec__UpdateNote('SpecNote_002', { body : 'Drafted with the lockstep off.' }, false);
S.Na__LeSpec__FlushDraft();
agentWrite((doc) => { doc.ProjectSpecification__Groups[0].Group__Notes[1].Note__Body = 'The agent, lockstep off.'; });
world.toasts.length = 0;
S = await loadSession();
S.Na__LeSpec__Initialize({ editable : true, showToast : toast });
await S.Na__LeSpec__EnsureLoaded();
state = S.Na__LeSpec__GetState();
check('the lockstep is off: nothing is asked on load', [ state.lockstep, S.Na__LeSpec__GetConflict() ], [ false, null ]);
check('...the browser draft is put back unasked, with its toast', [ S.Na__LeSpec__GetNoteEntry('SpecNote_002').note.Note__Body, world.toasts.some((t) => /restored/.test(t[0])) ], [ 'Drafted with the lockstep off.', true ]);
writesBefore = world.appWrites;
S.Na__LeSpec__UpdateNote('SpecNote_002', { body : 'Typed with the lockstep off.' }, false);
await tick(40 + 60);
check('...no autosave writes the file', world.appWrites - writesBefore, 0);
agentWrite((doc) => { doc.ProjectSpecification__Revision = 'C'; });
check('...Sync writes R2 and the file without looking: the agent\'s revision is written over', [ await S.Na__LeSpec__Sync({ showToast : () => {} }), world.appWrites - writesBefore, world.disk.get(FILE).ProjectSpecification__Revision, diskBody('SpecNote_002'), r2Body('SpecNote_002'), S.Na__LeSpec__GetConflict() ], [ true, 1, 'B', 'Typed with the lockstep off.', 'Typed with the lockstep off.', null ]);
SETUP.lockstepEnabled = true;


console.log('\n  ValeVision: off localhost nothing reaches the local server');
world.localhost  = false;
world.configured = false;                                                       // <-- The facade is configured on localhost only
world.localCalls = 0;
const r2Off = world.r2Writes;
S = await loadSession();
S.Na__LeSpec__Initialize({ editable : true, showToast : toast });
await S.Na__LeSpec__EnsureLoaded();
state = S.Na__LeSpec__GetState();
check('the public copy is read from the CDN', [ state.status, state.source, S.Na__LeSpec__GetNoteEntry('SpecNote_002').note.Note__Body ], [ 'ready', 'cdn', 'Typed with the lockstep off.' ]);
check('...no lockstep, and Sync is closed', [ state.lockstep, state.canSync ], [ false, false ]);
S.Na__LeSpec__UpdateNote('SpecNote_003', { body : 'Typed on the live site.' }, false);
await tick(40 + 60);
check('...an edit, Enter and Sync: WriteLocalCopy skipped, Sync refused', [ (await S.Na__LeSpec__WriteLocalCopy()).skipped, await S.Na__LeSpec__Sync({ showToast : () => {} }) ], [ true, false ]);
check('...the local server was never called, and R2 was not written', [ world.localCalls, world.r2Writes - r2Off ], [ 0, 0 ]);
world.localhost  = true;
world.configured = true;


console.log('\n  ValeVision: who writes R2 and the file (the source)');
const unitSource = (name) => fs.readFileSync(path.join(SPEC, name), 'utf8').replace(/\r\n/g, '\n')
    .split('\n').filter((line) => !/^\s*\/\//.test(line)).map((line) => line.replace(/\s\/\/\s.*$/, '')).join('\n');   // <-- The code, not its comments
const specUnits  = fs.readdirSync(SPEC).filter((name) => /\.js$/.test(name));
const callsOf    = (pattern) => specUnits.filter((name) => pattern.test(unitSource(name)));
check('no specification unit reaches R2DrawingNotes (Na__R2Notes__* or its file)', callsOf(/Na__R2Notes__|Na__AppUtils__R2DrawingNotes__/), []);
check('R2 is written by the Transport unit alone (Na__CfApi__WriteProjectFile)', callsOf(/Na__CfApi__WriteProjectFile\(/), [ 'Na__LayoutEditor__SpecData__Transport__.js' ]);
check('the local file is written by the Lockstep unit alone (Na__LocalMirror__WriteSiblingFile)', callsOf(/Na__LocalMirror__WriteSiblingFile\(/), [ 'Na__LayoutEditor__SpecData__Lockstep__.js' ]);
check('...and the Transport unit\'s Sync reaches the file only through MirrorLocal with a look', /Na__LeSpec__MirrorLocal\(out, \{ look : true \}\)/.test(unitSource('Na__LayoutEditor__SpecData__Transport__.js')), true);


console.log('\n  ValeVision: the barrel');
const API = [ 'WriteLocalCopy', 'SaveLocal', 'CheckFile', 'StartWatch', 'StopWatch', 'IsWatching', 'ResolveConflict', 'GetConflict', 'LockstepOn' ];
check('exports WriteLocalCopy and the lockstep API', API.filter((name) => typeof S['Na__LeSpec__' + name] !== 'function'), []);
check('...and LOCATE_EVENT', S.Na__LeSpec__LOCATE_EVENT, 'na-layouteditor-spec-locate');

// endregion -------------------------------------------------------------------
"""
t = rep(t, "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');",
           VV_REGION + "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');")
write('Na__Test__SpecLockstep__.test.mjs', t)
print('OK')
