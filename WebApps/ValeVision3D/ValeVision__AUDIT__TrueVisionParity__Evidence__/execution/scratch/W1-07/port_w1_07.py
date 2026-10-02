# =============================================================================
# W1-07 scratch: AutoSave 1.5.0 taken whole from TrueVision (pin b2aa9151), with ValeVision's seams,
# and the two TrueVision tests that prove it (Na__Test__DraftGuard__, Na__Test__DraftRestore__).
#
#   python -B port_w1_07.py --build            build the three candidates into ./candidates (LF, as git show)
#   python -B port_w1_07.py --stage <dir>      a staging tree: the candidates + the live modules the tests read
#   python -B port_w1_07.py --write            land the three files (hash precondition on the live AutoSave)
#   python -B port_w1_07.py --verify           live == candidates; each file minus its seams == TrueVision's
#   python -B port_w1_07.py --restore          put the AutoSave pre-image back, remove the two tests
#                                              (refuses if any of them changed since --write)
#
# TrueVision is read only with `git show b2aa9151:<path>` (bytes); nothing in TrueVision is written. Every seam is an
# exact replacement asserted to match exactly once; the reverse of every seam must give TrueVision's bytes back.
# =============================================================================
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates')
PRE = os.path.join(HERE, 'preimage')
WRITTEN = os.path.join(HERE, 'written_sha1.json')

AUTOSAVE = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js'
GUARD = '80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs'
RESTORE = '80__Testing__PrototypeEnvironment/Na__Test__DraftRestore__.test.mjs'

TV_SHA1 = {
    AUTOSAVE: '7228140d',
    GUARD: 'e0e3a07b',
    RESTORE: '44019e86',
}
LIVE_AUTOSAVE_SHA1 = 'ed2011441796fd430b0e81524a018dccf7ff6f7b'      # <-- W0-08's 1.3.1 with W0-99's v2.71.1 (preflight)

# The modules the two tests read, besides the Auto Save itself (taken live from this app)
TEST_READS = [
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
]


# -----------------------------------------------------------------------------
# The seams (old TrueVision text, new ValeVision text)
# -----------------------------------------------------------------------------

AUTOSAVE_PORT_NOTE_TV = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__AutoSave__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers; the draft key waits for the\n"
    "//                   project's sheets (Na__DrawData__IsLoaded), TrueVision first on 22-Sep-2026.\n"
    "// - Back-port     : n/a (this IS the back-port)\n"
)

AUTOSAVE_PORT_NOTE_VV = (
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.7 port Phase 5); TrueVision3D took it\n"
    "//                   for its v2.21.0 re-alignment and grew it to 1.5.0, while this app's copy took\n"
    "//                   TrueVision's changes as its own 1.1.0 to 1.3.0 (the paused draft write, v2.24.0;\n"
    "//                   the close guard, v2.62.0; undo and redo judged by their step, v2.64.0) and\n"
    "//                   published the unsaved-work flag as 1.3.1 (01-Oct-2026, v2.71.1); since ported back\n"
    "//                   whole from TrueVision3D 1.5.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.5.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151), with the Drawing\n"
    "//                   Register's transaction hooks its log does not record: Suspend, Resume and the\n"
    "//                   'register-updated' ignore (19-Sep-2026, git b6baf301) and DiscardSavedDraft\n"
    "//                   (19-Sep-2026, git 32767407)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-07}}\n"
    "// - Parity        : adapted - TrueVision's file; the banner, the console prefix, the unsaved-work\n"
    "//                   flag's name with the two comments that describe its reader, and this note are\n"
    "//                   the only differences. The draft key waits for the project's sheets (1.4.0), so\n"
    "//                   nothing reads or writes a draft against the empty block. A draft records the\n"
    "//                   drawings it grew from and is judged before it goes back (1.5.0): grown from the\n"
    "//                   drawings loaded, it is put back; grown from others - saved since by another\n"
    "//                   window, changed on the file, or written by this app's 1.3.x, which never said -\n"
    "//                   it is asked about (Apply Draft, Discard Draft, Decide Later; Modal 1.2.0), and\n"
    "//                   nothing writes the draft while the question is open. Suspend, Resume and\n"
    "//                   DiscardSavedDraft wait for the Drawing Register (DR-11).\n"
    "//                   Ported under DR-01 (c): the Port Record names every TrueVision release it\n"
    "//                   carries that Adam has not confirmed in TrueVision itself.\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "//   - The unsaved-work flag is published as window.Na__Pwa__HasUnsavedWork, the app-neutral name\n"
    "//     (K2 K4), where TrueVision publishes window.TrueVision__Pwa__HasUnsavedWork; the DESCRIPTION\n"
    "//     names it the same way. Its reader is the shared Whitecardopedia service worker registrar this\n"
    "//     app runs under (registrar 1.2.1, prepared by W0-08 and not yet deployed: until it is, nothing\n"
    "//     reads the flag), which polls it every 500 ms where TrueVision's own registrar polls every\n"
    "//     750 ms, as the comment on Na__LeAuto__HasUnsavedWork says. Re-apply all three whenever the\n"
    "//     file is taken whole from TrueVision.\n"
    "// - Back-port     : offer TrueVision the app-neutral flag name, so the seam above disappears (DR-42\n"
    "//                   default: not done here).\n"
)

AUTOSAVE_SEAMS = [
    ('banner (K2 H1)',
     "// TRUEVISION3D - LAYOUT EDITOR - AUTO SAVE\n",
     "// VALEVISION3D - LAYOUT EDITOR - AUTO SAVE\n"),
    ('DESCRIPTION names the app-neutral flag (K2 K4, the W0-08 seam)',
     "//   The guard also publishes TrueVision__Pwa__HasUnsavedWork, which holds the\n",
     "//   The guard also publishes Na__Pwa__HasUnsavedWork, which holds the\n"),
    ('PORT NOTE (K2 H5)', AUTOSAVE_PORT_NOTE_TV, AUTOSAVE_PORT_NOTE_VV),
    ('console prefix, the restore line (K2 C1)',
     "        console.log('[TrueVision3D] Layout Editor: unsaved sheet draft ' + (applied ? ",
     "        console.log('[ValeVision3D] Layout Editor: unsaved sheet draft ' + (applied ? "),
    ('console prefix, the discard line (K2 C1)',
     "            console.log('[TrueVision3D] Layout Editor: an unsaved sheet draft older than the saved drawings was discarded.');\n",
     "            console.log('[ValeVision3D] Layout Editor: an unsaved sheet draft older than the saved drawings was discarded.');\n"),
    ('console prefix, the left-aside line (K2 C1)',
     "        console.log('[TrueVision3D] Layout Editor: an unsaved sheet draft older than the saved drawings was left aside.');\n",
     "        console.log('[ValeVision3D] Layout Editor: an unsaved sheet draft older than the saved drawings was left aside.');\n"),
    ('the registrar polls every 500 ms (the shared Whitecardopedia registrar, the W0-08 seam)',
     "    // Na__LeAuto__HasUnsavedWork every 750 ms while an update waits.\n",
     "    // Na__LeAuto__HasUnsavedWork every 500 ms while an update waits.\n"),
    ('the flag line: window.Na__Pwa__HasUnsavedWork (K2 K4, the W0-08 seam)',
     "        try { window.TrueVision__Pwa__HasUnsavedWork = Na__LeAuto__HasUnsavedWork; }\n",
     "        try { window.Na__Pwa__HasUnsavedWork = Na__LeAuto__HasUnsavedWork; }\n"),
]

GUARD_PORT_NOTE = (
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-07}}, with the Auto Save it proves\n"
    "// - Parity        : verbatim - every test is TrueVision's, run against this app's own Auto Save\n"
    "//                   (TrueVision 1.5.0, W1-07) and Drawings Data (TrueVision 1.6.0 over this app's\n"
    "//                   transport facade, W1-05)\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D.\n"
    "// - Back-port     : none.\n"
    "//\n"
)

RESTORE_PORT_NOTE = (
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DraftRestore__.test.mjs\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.145.0, 22-Sep-2026; its fixture draft's base : null came with\n"
    "//                   v2.146.0, 22-Sep-2026, in no log line, git a2e0a836; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-07}}, with the Auto Save it proves\n"
    "// - Parity        : verbatim - every check is TrueVision's, run against this app's own drawings data,\n"
    "//                   sheet model State and Sheets units, sheet model and auto save\n"
    "// - Divergences   :\n"
    "//   - Banner and the printed title read ValeVision3D; the console filter swallows this app's own\n"
    "//     [ValeVision3D] lines, as TrueVision's swallows its [TrueVision3D] ones.\n"
    "// - Back-port     : none.\n"
    "//\n"
)

# Each test: the PORT NOTE goes in before the rule that opens the DEVELOPMENT LOG, as in this app's
# earlier test ports (Na__Test__SheetsNormaliseOnce__, Na__Test__DrawingDrafts__).
GUARD_LOG_RULE = (
    "//     node --test 80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// DEVELOPMENT LOG:\n"
)
RESTORE_LOG_RULE = (
    "//   Exit 0 = every check passed. Exit 1 = at least one did not.\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// DEVELOPMENT LOG:\n"
)


def _insert_note(log_rule, note):
    head, tail = log_rule.split("// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n")
    return head + note + "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n"


GUARD_SEAMS = [
    ('banner (K2 H1)',
     "// TRUEVISION3D - TEST - A DRAFT IS JUDGED BEFORE IT GOES BACK, AND A SAVE BEFORE IT GOES OUT\n",
     "// VALEVISION3D - TEST - A DRAFT IS JUDGED BEFORE IT GOES BACK, AND A SAVE BEFORE IT GOES OUT\n"),
    ('PORT NOTE', GUARD_LOG_RULE, _insert_note(GUARD_LOG_RULE, GUARD_PORT_NOTE)),
]

RESTORE_SEAMS = [
    ('banner (K2 H1)',
     "// TRUEVISION3D - TEST - BROWSER DRAFT RESTORE ON A PROJECT LOAD\n",
     "// VALEVISION3D - TEST - BROWSER DRAFT RESTORE ON A PROJECT LOAD\n"),
    ('PORT NOTE', RESTORE_LOG_RULE, _insert_note(RESTORE_LOG_RULE, RESTORE_PORT_NOTE)),
    ('the console filter swallows this app\'s own lines',
     "        if (line.indexOf('[TrueVision3D]') === 0) return;\n",
     "        if (line.indexOf('[ValeVision3D]') === 0) return;\n"),
    ('the printed title',
     "    out('TrueVision3D - the browser draft comes back whichever arrives first');\n",
     "    out('ValeVision3D - the browser draft comes back whichever arrives first');\n"),
]

PLAN = [(AUTOSAVE, AUTOSAVE_SEAMS), (GUARD, GUARD_SEAMS), (RESTORE, RESTORE_SEAMS)]


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def sha1(data):
    return hashlib.sha1(data).hexdigest()


def tv_bytes(rel):
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], check=True, capture_output=True).stdout
    if not sha1(data).startswith(TV_SHA1[rel]):
        raise SystemExit('TrueVision bytes for %s are not the ones read at the start (%s)' % (rel, sha1(data)[:8]))
    if b'\r' in data:
        raise SystemExit('TrueVision text for %s is not LF' % rel)
    return data


def apply(text, seams, rel):
    for name, old, new in seams:
        count = text.count(old)
        if count != 1:
            raise SystemExit('%s: seam "%s" matches %d times (must be exactly once)' % (rel, name, count))
        text = text.replace(old, new)
    return text


def unapply(text, seams, rel):
    for name, old, new in reversed(seams):
        count = text.count(new)
        if count != 1:
            raise SystemExit('%s: seam "%s" (new text) found %d times on the way back' % (rel, name, count))
        text = text.replace(new, old)
    return text


def outside_note_and_log(text):
    # Everything but the PORT NOTE block and the DEVELOPMENT LOG (the G4 exemptions)
    start = text.find('// PORT NOTE:')
    if start < 0:
        return text
    end = text.find('// DEVELOPMENT LOG:', start)
    log_end = text.find('// =============================================================================', end)
    return text[:start] + text[log_end:]


IDENTITY = re.compile(r'TrueVision__|\[TrueVision3D|TRUEVISION3D|window\.TrueVision|NaProjectPortal|30__TrueVision__AppContent|/na-apps/')


def build():
    os.makedirs(CAND, exist_ok=True)
    out = {}
    for rel, seams in PLAN:
        tv = tv_bytes(rel).decode('utf-8')
        vv = apply(tv, seams, rel)
        if unapply(vv, seams, rel) != tv:
            raise SystemExit('%s: the seams do not reverse to TrueVision\'s text' % rel)
        if rel == AUTOSAVE:
            hits = IDENTITY.findall(outside_note_and_log(vv))
            if hits:
                raise SystemExit('%s: identity markers outside the PORT NOTE and log: %s' % (rel, hits))
            if '{{VVREL:W1-07}}' not in vv:
                raise SystemExit('no release placeholder')
        else:
            first = vv.split('\n', 3)[1]
            if 'TRUEVISION3D' in first or not first.startswith('// VALEVISION3D - '):
                raise SystemExit('%s: banner' % rel)
        data = vv.encode('utf-8')
        path = os.path.join(CAND, os.path.basename(rel))
        with open(path, 'wb') as fh:
            fh.write(data)
        out[rel] = {'sha1': sha1(data), 'bytes': len(data), 'lines': data.count(b'\n'), 'crlf': data.count(b'\r\n')}
        print('built  %-90s %6d B  %4d lines  sha1 %s' % (rel, len(data), data.count(b'\n'), sha1(data)[:8]))
    with open(os.path.join(HERE, 'candidates_manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2)
    return out


def stage(dest):
    build()
    for rel in TEST_READS:
        src = os.path.join(VV, rel.replace('/', os.sep))
        dst = os.path.join(dest, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
    for rel, _ in PLAN:
        dst = os.path.join(dest, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(CAND, os.path.basename(rel)), dst)
    print('staged into', dest)


def write():
    manifest = build()
    live = os.path.join(VV, AUTOSAVE.replace('/', os.sep))
    if sha1(open(live, 'rb').read()) != LIVE_AUTOSAVE_SHA1:
        raise SystemExit('the live AutoSave changed since the preflight - stop (a file you own changed under you)')
    for rel in (GUARD, RESTORE):
        if os.path.exists(os.path.join(VV, rel.replace('/', os.sep))):
            raise SystemExit('%s already exists - stop' % rel)
    if not os.path.isfile(os.path.join(PRE, os.path.basename(AUTOSAVE))):
        raise SystemExit('no pre-image kept - run preflight.py first')
    for rel, _ in PLAN:
        with open(os.path.join(CAND, os.path.basename(rel)), 'rb') as fh:
            data = fh.read()
        with open(os.path.join(VV, rel.replace('/', os.sep)), 'wb') as fh:      # <-- One whole write per file
            fh.write(data)
        print('wrote  %s  sha1 %s' % (rel, sha1(data)[:8]))
    with open(WRITTEN, 'w', encoding='utf-8') as fh:
        json.dump({rel: manifest[rel]['sha1'] for rel, _ in PLAN}, fh, indent=2)


def verify():
    problems = 0
    for rel, seams in PLAN:
        live = open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read()
        cand = open(os.path.join(CAND, os.path.basename(rel)), 'rb').read()
        tv = tv_bytes(rel).decode('utf-8')
        same = live == cand
        back = unapply(live.decode('utf-8'), seams, rel) == tv
        print('%-90s live==candidate %-5s  minus-seams==TrueVision %-5s  crlf %d' % (rel, same, back, live.count(b'\r\n')))
        problems += (not same) + (not back)
    print('problems:', problems)
    return problems


def restore():
    written = json.load(open(WRITTEN, encoding='utf-8'))
    for rel, digest in written.items():
        path = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(path) and sha1(open(path, 'rb').read()) != digest:
            raise SystemExit('%s changed since --write: refusing to restore over it' % rel)
    shutil.copyfile(os.path.join(PRE, os.path.basename(AUTOSAVE)), os.path.join(VV, AUTOSAVE.replace('/', os.sep)))
    for rel in (GUARD, RESTORE):
        path = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(path):
            os.remove(path)
    print('restored the AutoSave pre-image; removed the two ported tests')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] == '--build':
        build()
    elif args[0] == '--stage':
        stage(args[1])
    elif args[0] == '--write':
        write()
    elif args[0] == '--verify':
        sys.exit(1 if verify() else 0)
    elif args[0] == '--restore':
        restore()
    else:
        raise SystemExit(__doc__)
