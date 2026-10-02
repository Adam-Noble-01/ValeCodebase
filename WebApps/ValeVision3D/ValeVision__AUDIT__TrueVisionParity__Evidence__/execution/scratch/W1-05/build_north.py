"""W1-05 - build the ValeVision copy of Na__North__ProjectJson__Data__.js from TrueVision's file at the pin.

TrueVision's 1.0.0 whole: its Save(showToast, report) passes the report on to the drawings save
(ProjectData 1.6.0). Seams: the banner (K2 H1) and ValeVision's PORT NOTE (K2 H5). The file has no
console output. Writes the candidate into this scratch folder only.
"""
import hashlib
import subprocess
import sys
from pathlib import Path

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/46__System__NorthDirection/Na__North__ProjectJson__Data__.js'
HERE = Path(__file__).resolve().parent
OUT = HERE / 'candidate__Na__North__ProjectJson__Data__.js'
TV_SHA1 = 'bffdf4d46aecd77dc5f3690247315d1f48f6f849'


def tv_text():
    raw = subprocess.run(['git', '-C', TV_REPO, 'show', f'{PIN}:{TV_PATH}'], capture_output=True, check=True).stdout
    sha = hashlib.sha1(raw).hexdigest()
    if sha != TV_SHA1:
        sys.exit(f'TV source changed? sha1 {sha} != {TV_SHA1}')
    if b'\r' in raw:
        sys.exit('TV source has CR bytes; expected LF from git show')
    return raw.decode('ascii')


def swap(text, old, new, count=1, label=''):
    found = text.count(old)
    if found != count:
        sys.exit(f'[{label}] expected {count} match(es), found {found}:\n{old}')
    return text.replace(old, new)


def build():
    t = tv_text()

    t = swap(t, '// TRUEVISION3D - NORTH DIRECTION - PROJECT DATA\n',
                '// VALEVISION3D - NORTH DIRECTION - PROJECT DATA\n', label='banner')

    tv_note = ('// PORT NOTE:\n'
               '// - Authored in   : TrueVision3D first (19-Sep-2026)\n'
               '// - ValeVision    : 1.0.0 ported 20-Sep-2026 as ValeVision3D v2.67.0, verbatim but for Save,\n'
               '//                   which takes that app\'s showToast\n')
    vv_note = ('// PORT NOTE:\n'
               '// - Ported from   : TrueVision3D 02__Src__AppModules/46__System__NorthDirection/Na__North__ProjectJson__Data__.js\n'
               '// - Source version: 1.0.0 (TrueVision3D v2.80.0, 20-Sep-2026; read at b2aa9151)\n'
               '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-05}}, whole; first ported 20-Sep-2026 for\n'
               '//                   ValeVision3D v2.67.0, when Save passed on only showToast\n'
               '// - Parity        : verbatim\n'
               '// - Divergences   :\n'
               '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
               '//   - DESCRIPTION is TrueVision\'s word for word. Here the one list a new top-level editor key must join\n'
               '//     is ProjectData__EditorOwnedKeys (Na__AppConfig__Main.json: the localhost overlay, the editor\n'
               '//     Worker\'s merge-keys and the cloud sync read it), the drawings block is on it, and the block\'s\n'
               '//     save (Na__DrawData__Save) writes R2, then the repository copy through the Whitecardopedia server.\n'
               '// - Back-port     : none.\n')
    t = swap(t, tv_note, vv_note, label='port-note')

    head_end = t.index('// DEVELOPMENT LOG:')
    log_end = t.index('// =============================================================================\n', head_end)
    body = t[:t.index('// PORT NOTE:')] + t[log_end:]
    for marker in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'TrueVision3D__', 'NaProjectPortal'):
        if marker in body:
            sys.exit(f'identity marker left outside the PORT NOTE / DEVELOPMENT LOG: {marker}')

    OUT.write_bytes(t.encode('ascii'))
    print('wrote', OUT, 'sha1', hashlib.sha1(t.encode('ascii')).hexdigest(), 'lines', t.count('\n'))


if __name__ == '__main__':
    build()
