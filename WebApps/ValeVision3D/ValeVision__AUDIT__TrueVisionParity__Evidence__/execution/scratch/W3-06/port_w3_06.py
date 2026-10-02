"""W3-06 port: Viewport3dZoom 1.1.0, ViewportClipboard 1.4.0 and Na__Test__ViewportRotation__ (full) from TrueVision b2aa9151.

Usage:
    python port_w3_06.py --stage     build staged/ from TV at the pin (asserts every replacement happens exactly once)
    python port_w3_06.py --apply     back the live files up (backup/), assert unchanged since --stage, write staged bytes
    python port_w3_06.py --restore   put backup/ bytes back (refuses if a live file changed since --apply)

Whole-file ports: TrueVision's text as git show returns it (LF), seams re-applied: banner, PORT NOTE, printed title.
"""
import hashlib
import json
import os
import subprocess
import sys

HERE    = os.path.dirname(os.path.abspath(__file__))
VV_ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
TV_GIT  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN     = 'b2aa9151'
TV_APP  = 'na-apps/30__TrueVision__CoreAppCode/'
VPD     = '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/'
STAGED  = os.path.join(HERE, 'staged')
BACKUP  = os.path.join(HERE, 'backup')
STATE   = os.path.join(HERE, 'state.json')

TV_ZOOM_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported to      : ValeVision3D 51__System__LayoutEditor (pending Adam's sign-off)\n"
    "// - Parity         : authored in TrueVision first\n"
    "// - Divergences    : none expected - the viewport record is shared field for field\n"
)
VV_ZOOM_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3dZoom__.js\n"
    "// - Source version: 1.1.0 (TrueVision3D v2.138.0, 21-Sep-2026; 1.0.0 v2.50.0; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-06}} - whole, with rotatable viewports\n"
    "//                   (package W3-06): the wheel zooms a turned 3D picture about the point under the\n"
    "//                   cursor (OnWheel reads the cursor through Na__LeVpRot__ToFrame). This app's copy\n"
    "//                   was 1.0.0, ported 14-Sep-2026 from TrueVision3D v2.50.0. TrueVision's v2.138.0\n"
    "//                   is NOT tried by Adam; ported under DR-01 (c).\n"
    "// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
)

TV_CLIP_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported to      : ValeVision3D 51__System__LayoutEditor (pending)\n"
    "// - Parity         : authored in TrueVision first, back-port to follow\n"
    "// - Divergences    : none expected - the viewport record is shared field for field\n"
)
VV_CLIP_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js\n"
    "// - Source version: 1.4.0 (TrueVision3D v2.138.0, 21-Sep-2026; 1.3.0 v2.123.0, 21-Sep-2026; read at\n"
    "//                   b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-06}} - whole, with rotatable viewports\n"
    "//                   (package W3-06): a copy keeps its turn and a turned viewport pasted at a click\n"
    "//                   puts the top left of the box round its turned frame there (1.4.0); LayerFor\n"
    "//                   refuses a reference layer (1.3.0). This app's copy was 1.2.0, first ported\n"
    "//                   14-Sep-2026 from TrueVision3D v2.44.0. TrueVision's v2.123.0 and v2.138.0 are NOT\n"
    "//                   tried by Adam; ported under DR-01 (c).\n"
    "// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
)

TEST_ANCHOR  = (
    "//   Exit 0 = every check passed. Exit 1 = at least one did not.\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// DEVELOPMENT LOG:\n"
)
VV_TEST_NOTE = (
    "//   Exit 0 = every check passed. Exit 1 = at least one did not.\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs\n"
    "// - Source version: 1.0.1 (TrueVision3D v2.138.0, 21-Sep-2026, written as 1.0.0; 1.0.1 of 22-Sep-2026 is\n"
    "//                   the Node 22 navigator fix in the jsPDF part, named in no TrueVision release; read at\n"
    "//                   b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2 (THE GEOMETRY region only); completed\n"
    "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-06}} with the HANDLES, the WINDOW AND THE\n"
    "//                   SNAP INDEX and the CHROME AND A REAL jsPDF regions (package W3-06), now that this\n"
    "//                   app has ViewportHandles 1.5.0, the turned Window, the 28__System__ObjectSnap units\n"
    "//                   and SheetChrome's turned group.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner and the printed title read ValeVision3D.\n"
    "// - Back-port     : none.\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// DEVELOPMENT LOG:\n"
)

FILES = [
    {
        'rel' : VPD + 'Na__LayoutEditor__Viewport3dZoom__.js',
        'subs': [
            ('// TRUEVISION3D - LAYOUT EDITOR - VIEWPORT 3D ZOOM\n', '// VALEVISION3D - LAYOUT EDITOR - VIEWPORT 3D ZOOM\n'),
            (TV_ZOOM_NOTE, VV_ZOOM_NOTE),
        ],
    },
    {
        'rel' : VPD + 'Na__LayoutEditor__ViewportClipboard__.js',
        'subs': [
            ('// TRUEVISION3D - LAYOUT EDITOR - VIEWPORT CLIPBOARD\n', '// VALEVISION3D - LAYOUT EDITOR - VIEWPORT CLIPBOARD\n'),
            (TV_CLIP_NOTE, VV_CLIP_NOTE),
        ],
    },
    {
        'rel' : '80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs',
        'subs': [
            ('// TRUEVISION3D - TEST - ROTATABLE VIEWPORTS\n', '// VALEVISION3D - TEST - ROTATABLE VIEWPORTS\n'),
            (TEST_ANCHOR, VV_TEST_NOTE),
            ("console.log('\\nTrueVision3D - rotatable viewports", "console.log('\\nValeVision3D - rotatable viewports"),
        ],
    },
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], check=True, capture_output=True).stdout


def live_path(rel):
    return os.path.join(VV_ROOT, rel.replace('/', os.sep))


def stage():
    for f in FILES:
        text = tv_bytes(f['rel']).decode('utf-8')
        assert '\r\n' not in text, f['rel'] + ': TV text is not LF'
        for old, new in f['subs']:
            n = text.count(old)
            assert n == 1, '%s: expected exactly one %r, found %d' % (f['rel'], old[:60], n)
            text = text.replace(old, new)
        assert 'TRUEVISION3D' not in text, f['rel'] + ': TRUEVISION3D banner left'
        assert '[TrueVision3D' not in text, f['rel'] + ': TrueVision console prefix left'
        out = os.path.join(STAGED, f['rel'].replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'wb') as fh:
            fh.write(text.encode('utf-8'))
        print('staged', f['rel'], len(text.encode('utf-8')), 'bytes')


def apply():
    state = {}
    for f in FILES:
        src = live_path(f['rel'])
        with open(src, 'rb') as fh:
            live = fh.read()
        bak = os.path.join(BACKUP, f['rel'].replace('/', os.sep))
        if os.path.exists(bak):
            with open(bak, 'rb') as fh:
                assert fh.read() == live, f['rel'] + ': live file changed since the backup was taken - stop'
        else:
            os.makedirs(os.path.dirname(bak), exist_ok=True)
            with open(bak, 'wb') as fh:
                fh.write(live)
        with open(os.path.join(STAGED, f['rel'].replace('/', os.sep)), 'rb') as fh:
            staged = fh.read()
        with open(src, 'wb') as fh:
            fh.write(staged)
        state[f['rel']] = sha(staged)
        print('applied', f['rel'])
    with open(STATE, 'w') as fh:
        json.dump(state, fh, indent=2)


def restore():
    with open(STATE) as fh:
        state = json.load(fh)
    for f in FILES:
        src = live_path(f['rel'])
        with open(src, 'rb') as fh:
            assert sha(fh.read()) == state[f['rel']], f['rel'] + ': changed since W3-06 wrote it - refusing'
    for f in FILES:
        with open(os.path.join(BACKUP, f['rel'].replace('/', os.sep)), 'rb') as fh:
            data = fh.read()
        with open(live_path(f['rel']), 'wb') as fh:
            fh.write(data)
        print('restored', f['rel'])


if __name__ == '__main__':
    {'--stage': stage, '--apply': apply, '--restore': restore}[sys.argv[1]]()
