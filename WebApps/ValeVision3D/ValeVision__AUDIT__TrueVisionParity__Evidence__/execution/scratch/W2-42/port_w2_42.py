"""W2-42 - Object snap leaves landed inert (State, Geometry, Glyphs, Index, Sources, Marker, Config).

Whole-file takes of TrueVision at the pin b2aa9151 (LF, exactly as git show returns them), with only
the K2 seams re-applied: the banner token (H1) and the PORT NOTE block (H5). None of the six modules
writes to the console, and none carries an app-token literal, so no other seam exists. The JSON is
byte for byte.

    python port_w2_42.py           land the seven files (open(..., 'xb'): never overwrites)
    python port_w2_42.py --check   prove the landed bytes == TV bytes + the listed seams, nothing else
    python port_w2_42.py --dry     build in memory and print what would be written
"""
import os, sys, subprocess, difflib

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
REL_DIR = '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

BANNER_TV = b'// TRUEVISION3D - LAYOUT EDITOR - OBJECT SNAP - '
BANNER_VV = b'// VALEVISION3D - LAYOUT EDITOR - OBJECT SNAP - '
PN_START = b'// PORT NOTE:\n'
PN_END = b'//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'

INERT = [
    '//                   other object snap leaves (W2-42). Nothing imported it then: W2-19',
    '//                   brings the search, the controller and the menu, and switches the',
    '//                   editor over from 30__System__SheetTools/Na__LayoutEditor__Snapping__.js',
    '//                   (K2 FR-14, FR-15).',
]


def note(name, version, release, date, unconfirmed, extra_div=None, legacy=None, back_port='none.'):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + REL_DIR + name,
        '// - Source version: %s (TrueVision3D %s, %s; read at %s)' % (version, release, date, PIN),
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-42}}, landed inert with the',
    ] + INERT + [
        '//                   TrueVision\'s own note said "not yet ported - it waits for Adam\'s',
        '//                   sign-off"; ' + unconfirmed[0],
    ] + ['//                   ' + l for l in unconfirmed[1:]] + [
        '// - Parity        : verbatim',
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D. (No console output in this file.)',
    ] + (extra_div or []) + [
        '// - Back-port     : ' + back_port[0],
    ] + ['//                   ' + l for l in back_port[1:]] + (legacy or [])
    return ('\n'.join(lines) + '\n').encode('utf-8')


FILES = {
    'Na__LayoutEditor__ObjectSnap__State__.js': dict(
        version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 is "NOT tried by Adam" there. It comes',
                     'across under DR-01 (c) and is named as not yet confirmed by Adam.'],
        back_port=['none.']),
    'Na__LayoutEditor__ObjectSnap__Geometry__.js': dict(
        version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 is "NOT tried by Adam" there. It comes',
                     'across under DR-01 (c) and is named as not yet confirmed by Adam.'],
        back_port=['none.']),
    'Na__LayoutEditor__ObjectSnap__Glyphs__.js': dict(
        version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 is "NOT tried by Adam" there. It comes',
                     'across under DR-01 (c) and is named as not yet confirmed by Adam.'],
        back_port=['none.']),
    'Na__LayoutEditor__ObjectSnap__Index__.js': dict(
        version='1.1.0', release='v2.138.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 (1.0.0) and v2.138.0 (1.1.0, turned',
                     'viewports) are "NOT tried by Adam" there. They come across under',
                     'DR-01 (c) and are named as not yet confirmed by Adam.'],
        back_port=['none.']),
    'Na__LayoutEditor__ObjectSnap__Sources__.js': dict(
        version='1.2.0', release='v2.150.0', date='22-Sep-2026',
        unconfirmed=['v2.129.0 (1.0.0, with what it carried over',
                     'from Snapping 1.5.0: the title block snaps of v2.114.0 and the',
                     'reference layers of v2.123.0), v2.143.0 (1.1.0, note regions) and',
                     'v2.150.0 (1.2.0, vectors with holes) are "NOT tried by Adam" there.',
                     'They come across under DR-01 (c) and are named as not yet confirmed.'],
        back_port=['none.']),
    'Na__LayoutEditor__ObjectSnap__Marker__.js': dict(
        version='1.1.0', release='v2.137.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 (1.0.0) and v2.137.0 (1.1.0, painted',
                     'on the point) are "NOT tried by Adam" there. They come across under',
                     'DR-01 (c) and are named as not yet confirmed by Adam.'],
        back_port=['TrueVision\'s DEVELOPMENT LOG below lists 1.0.0 above 1.1.0; newest',
                   'first (1.1.0 on top) is the house order. A comment-only fix for the',
                   'TrueVision lane (DR-36); this copy follows when it lands.'],
        legacy=['// - Legacy        : the DEVELOPMENT LOG is TrueVision\'s verbatim (K2 H6, DR-34 (a)),',
                '//                   and TrueVision\'s own log runs 1.0.0 above 1.1.0 (both 21-Sep-2026).']),
}
JSON_NAME = 'Na__LayoutEditor__ObjectSnap__Config__.json'


def tv_bytes(name):
    return subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + TV_APP + REL_DIR + name],
                          capture_output=True, check=True).stdout


def build(name, tv):
    assert b'\r' not in tv, name + ': TV bytes carry CR'
    assert tv.count(BANNER_TV) == 1 and tv.index(BANNER_TV) == tv.index(b'\n') + 1, name + ': banner'
    assert tv.count(PN_START) == 1, name + ': PORT NOTE start'
    s = tv.index(PN_START)
    e = tv.index(PN_END, s)
    old = tv[s:e]
    assert b'ValeVision    : not yet ported - it waits for Adam\'s sign-off.' in old, name + ': TV marker'
    assert old.count(b'\n') <= 6, name + ': PORT NOTE larger than expected'
    out = tv.replace(BANNER_TV, BANNER_VV, 1)
    s2 = out.index(PN_START)
    e2 = out.index(PN_END, s2)
    new = note(name, **FILES[name])
    out = out[:s2] + new + out[e2:]
    # Nothing else may name TrueVision or carry a console call
    body = out[:s2] + out[s2 + len(new):]
    assert b'TrueVision' not in body and b'TRUEVISION' not in body, name + ': TV token outside the PORT NOTE'
    assert b'console.' not in tv, name + ': console output (C1 seam not planned)'
    return out, old, new


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--land'
    target_dir = os.path.join(VV_APP, REL_DIR.replace('/', os.sep))
    results = []
    for name in list(FILES) + [JSON_NAME]:
        tv = tv_bytes(name)
        if name == JSON_NAME:
            out = tv
            old = new = b''
        else:
            out, old, new = build(name, tv)
        path = os.path.join(target_dir, name)
        if mode == '--land':
            os.makedirs(target_dir, exist_ok=True)
            with open(path, 'xb') as fh:
                fh.write(out)
            results.append('LANDED %s  %d -> %d B' % (name, len(tv), len(out)))
        elif mode == '--check':
            live = open(path, 'rb').read()
            ok = live == out
            # Reverse the seams on the landed bytes: TV's bytes must come back
            if name != JSON_NAME:
                rev = live.replace(new, old, 1).replace(BANNER_VV, BANNER_TV, 1)
            else:
                rev = live
            ok = ok and rev == tv
            results.append(('CHECK OK   ' if ok else 'CHECK FAIL ') + name)
            d = list(difflib.unified_diff(tv.decode('utf-8').split('\n'), live.decode('utf-8').split('\n'),
                                          'TV/' + name, 'VV/' + name, n=0, lineterm=''))
            os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
            with open(os.path.join(HERE, 'diffs', name + '.diff'), 'w', encoding='utf-8', newline='\n') as fh:
                fh.write('\n'.join(d) + '\n')
        else:
            results.append('DRY %s %d -> %d B' % (name, len(tv), len(out)))
            if name != JSON_NAME:
                print(new.decode('utf-8'))
    print('\n'.join(results))
    if mode == '--check':
        print('CHECK PASS' if all(r.startswith('CHECK OK') for r in results) else 'CHECK FAILED')


if __name__ == '__main__':
    main()
