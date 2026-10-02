# =============================================================================
# W1-11 - North: Show Compass (TV 1.1.0 whole)
# =============================================================================
#
# Builds the three ValeVision files from TrueVision's bytes at the pin, re-applying
# only the named seams (K2 H1 banner, K2 H5 PORT NOTE), lands them, checks them
# and can put the pre-images back.
#
#   python -B build_w1_11.py --record      pre-image hashes + backups (refuses to overwrite a recorded pre-image)
#   python -B build_w1_11.py --build       candidates into ./candidate (TV text from git, every seam asserted once)
#   python -B build_w1_11.py --apply       pre-image hashes re-checked, candidates written over the live files
#   python -B build_w1_11.py --check-live  live == candidate for all three
#   python -B build_w1_11.py --restore     pre-images back (refuses if a live file is not what --apply wrote)
#
# Line endings: a whole-file port writes TV's text exactly as git show returns it (LF). The seams
# are LF text inserted into LF text.
# =============================================================================
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode'
PIN = 'b2aa9151'
DIR = '02__Src__AppModules/46__System__NorthDirection/'
FILES = ['Na__North__AppConfig__.json', 'Na__North__CompassGizmo__.js', 'Na__North__DevMenu__Editor__.js']
TV_SHA1 = {   # what fetch_tv.py read at the pin
    'Na__North__AppConfig__.json': 'c2b810d7',
    'Na__North__CompassGizmo__.js': '6fc7ffeb',
    'Na__North__DevMenu__Editor__.js': 'd49d0e68',
}
CAND = os.path.join(HERE, 'candidate')
PRE = os.path.join(HERE, 'preimage')
MANIFEST = os.path.join(PRE, 'manifest.json')


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def live_path(name):
    return os.path.join(VV, DIR.replace('/', os.sep), name)


def tv_bytes(name):
    res = subprocess.run(['git', '-C', TV_GIT, 'show', '%s:%s/%s%s' % (PIN, TV_APP, DIR, name)], capture_output=True)
    if res.returncode != 0:
        raise SystemExit('git show failed for %s: %s' % (name, res.stderr.decode('utf-8', 'replace')))
    data = res.stdout
    if not sha1(data).startswith(TV_SHA1[name]):
        raise SystemExit('TV bytes for %s are not the ones read at the pin (%s)' % (name, sha1(data)[:8]))
    if b'\r\n' in data:
        raise SystemExit('TV text for %s carries CRLF; expected LF from git show' % name)
    return data


def replace_once(text, old, new, what):
    count = text.count(old)
    if count != 1:
        raise SystemExit('seam "%s": expected exactly one match, found %d' % (what, count))
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# The seams
# -----------------------------------------------------------------------------

GIZMO_TV_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (19-Sep-2026)\n"
    "// - ValeVision    : 1.1.0 ported 20-Sep-2026 as ValeVision3D v2.67.0, adapted: ValeVision has\n"
    "//                   no Na__InteractiveOverlays, so its compass is never kept - it is in the\n"
    "//                   scene only while the panel is open. Port the registry, then take this whole.\n"
)
GIZMO_VV_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js\n"
    "// - Source version: 1.1.0 (TrueVision3D v2.84.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-11}}, whole; first ported 20-Sep-2026 for\n"
    "//                   ValeVision3D v2.67.0 as 1.0.0, adapted to the missing overlay registry (never\n"
    "//                   kept: in the scene only while the panel was open, its visible flag set directly)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - The live 3D frame it is drawn in is not Video Studio's preview: ValeVision's render loop begins\n"
    "//     an overlay frame only while that preview is not playing (DR-32), a seam in\n"
    "//     Na__AppFlow__LoadingSequence.js, not in this file.\n"
    "// - Back-port     : none.\n"
)

EDITOR_TV_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (19-Sep-2026)\n"
    "// - ValeVision    : 1.1.0 ported 20-Sep-2026 as ValeVision3D v2.67.0, adapted: no Show\n"
    "//                   Compass; the panel shuts when a sheet opens and the compass leaves the\n"
    "//                   scene while any sheet picture renders (see that file's header for the\n"
    "//                   fault its own test found).\n"
)
EDITOR_VV_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js\n"
    "// - Source version: 1.1.0 (TrueVision3D v2.84.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-11}}, whole; first ported 20-Sep-2026 for\n"
    "//                   ValeVision3D v2.67.0 as 1.0.0, adapted: no Show Compass, and two listeners heard\n"
    "//                   by name - na-layouteditor-mode-changed shut the panel when a sheet opened and\n"
    "//                   na-layouteditor-snapshot-queue took the compass out while a sheet picture\n"
    "//                   rendered. Both retired with this port (DR-32): the compass is an interactive\n"
    "//                   overlay, which no render but the live 3D frame can see.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
)

BANNERS = {
    'Na__North__CompassGizmo__.js': ('// TRUEVISION3D - NORTH DIRECTION - COMPASS GIZMO\n', '// VALEVISION3D - NORTH DIRECTION - COMPASS GIZMO\n'),
    'Na__North__DevMenu__Editor__.js': ('// TRUEVISION3D - NORTH DIRECTION - DEV MENU EDITOR\n', '// VALEVISION3D - NORTH DIRECTION - DEV MENU EDITOR\n'),
}
NOTES = {
    'Na__North__CompassGizmo__.js': (GIZMO_TV_NOTE, GIZMO_VV_NOTE),
    'Na__North__DevMenu__Editor__.js': (EDITOR_TV_NOTE, EDITOR_VV_NOTE),
}

# What must never remain outside the PORT NOTE / DEVELOPMENT LOG of a landed JS file (K2 C1, H1, K3, K4, V2).
IDENTITY_MARKERS = ['TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision', 'NaProjectPortal',
                    '30__TrueVision__AppContent', '/na-apps/', 'na-truevision-api', '/r2/', '/api/truevision']


def outside_records(text):
    """The file with its PORT NOTE and DEVELOPMENT LOG blocks blanked (the G4 exemption)."""
    lines = text.split('\n')
    out, skip = [], False
    for line in lines:
        s = line.strip()
        if s.startswith('// PORT NOTE:') or s.startswith('// DEVELOPMENT LOG:'):
            skip = True
        elif skip and s.startswith('// ----') or skip and s.startswith('// ===='):
            skip = False
        out.append('' if skip else line)
    return '\n'.join(out)


def build_one(name):
    data = tv_bytes(name)
    if name.endswith('.json'):
        json.loads(data.decode('utf-8'))                                 # <-- Must parse: it is taken verbatim
        return data                                                      # <-- K2: keys and values are TV's; nothing VV-specific in this file
    text = data.decode('utf-8')
    old, new = BANNERS[name]
    text = replace_once(text, old, new, name + ' banner')
    old, new = NOTES[name]
    text = replace_once(text, old, new, name + ' PORT NOTE')
    rest = outside_records(text)
    for marker in IDENTITY_MARKERS:
        if marker in rest:
            raise SystemExit('identity marker %r left in %s outside the records' % (marker, name))
    for gone in ('na-layouteditor-mode-changed', 'na-layouteditor-snapshot-queue', 'SheetBusy'):
        if gone in rest:
            raise SystemExit('%s still names %s' % (name, gone))
    return text.encode('utf-8')


def cmd_record():
    os.makedirs(PRE, exist_ok=True)
    if os.path.exists(MANIFEST):
        raise SystemExit('pre-image already recorded; refusing to overwrite ' + MANIFEST)
    manifest = {}
    for name in FILES:
        data = open(live_path(name), 'rb').read()
        with open(os.path.join(PRE, name + '.bak'), 'wb') as fh:
            fh.write(data)
        manifest[name] = {'sha1': sha1(data), 'bytes': len(data), 'crlf': data.count(b'\r\n'), 'lines': data.count(b'\n')}
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(manifest, fh, indent=2)
    print(json.dumps(manifest, indent=2))


def cmd_build():
    os.makedirs(CAND, exist_ok=True)
    manifest = {}
    for name in FILES:
        data = build_one(name)
        with open(os.path.join(CAND, name), 'wb') as fh:
            fh.write(data)
        manifest[name] = {'sha1': sha1(data), 'bytes': len(data), 'lines': data.count(b'\n'), 'crlf': data.count(b'\r\n')}
        print('%-36s sha1 %s  %6d bytes  %4d lines  crlf %d' % (name, sha1(data)[:8], len(data), data.count(b'\n'), data.count(b'\r\n')))
    with open(os.path.join(CAND, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(manifest, fh, indent=2)


def cmd_apply():
    pre = json.load(open(MANIFEST, encoding='utf-8'))
    cand = json.load(open(os.path.join(CAND, 'manifest.json'), encoding='utf-8'))
    for name in FILES:                                                   # <-- Every precondition first; nothing written on a mismatch
        now = sha1(open(live_path(name), 'rb').read())
        if now != pre[name]['sha1']:
            raise SystemExit('%s changed since the pre-image was recorded (%s != %s): stop' % (name, now[:8], pre[name]['sha1'][:8]))
        if sha1(open(os.path.join(CAND, name), 'rb').read()) != cand[name]['sha1']:
            raise SystemExit('candidate %s does not match its manifest' % name)
    for name in FILES:                                                   # <-- Config first, then the leaf (gizmo), then the editor that imports it
        with open(live_path(name), 'wb') as fh:
            fh.write(open(os.path.join(CAND, name), 'rb').read())
        print('landed', name)


def cmd_check_live():
    ok = True
    for name in FILES:
        same = open(live_path(name), 'rb').read() == open(os.path.join(CAND, name), 'rb').read()
        ok = ok and same
        print('%-36s %s' % (name, 'LIVE == CANDIDATE' if same else 'DIFFERENT'))
    sys.exit(0 if ok else 1)


def cmd_restore():
    pre = json.load(open(MANIFEST, encoding='utf-8'))
    cand = json.load(open(os.path.join(CAND, 'manifest.json'), encoding='utf-8'))
    for name in FILES:
        now = sha1(open(live_path(name), 'rb').read())
        if now not in (cand[name]['sha1'], pre[name]['sha1']):
            raise SystemExit('%s was changed by someone else since this package landed it: refusing to restore' % name)
    for name in FILES:
        with open(live_path(name), 'wb') as fh:
            fh.write(open(os.path.join(PRE, name + '.bak'), 'rb').read())
        print('restored', name)


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    {'--record': cmd_record, '--build': cmd_build, '--apply': cmd_apply,
     '--check-live': cmd_check_live, '--restore': cmd_restore}.get(arg, lambda: sys.exit(__doc__ or 'usage: see header'))()
