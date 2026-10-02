"""W2-19 - Object snap switch-over: the whole-file takes.

Whole-file takes of TrueVision at the pin b2aa9151 (LF, exactly as git show returns them), with only the
K2 seams re-applied: the banner token (H1), the console prefix (C1, the controller's two lines and the
test's title line) and the PORT NOTE block (H5). Everything else is TrueVision's bytes.

    python port_w2_19.py           land the eight new files (open(..., 'xb'): never overwrites)
    python port_w2_19.py --check   prove the landed bytes == TV bytes + the listed seams, nothing else
    python port_w2_19.py --dry     build in memory and report
"""
import os, sys, subprocess

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
OS_DIR = '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/'
TEST_DIR = '80__Testing__PrototypeEnvironment/'

JS_PN_END = b'//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
SWITCH = [
    'landed with the switch-over (W2-19): the editor\'s snapping moved',
    'here from 30__System__SheetTools/Na__LayoutEditor__Snapping__.js, which stays',
    'one wave as a shim over __Search__ and __State__ (K2 FR-14) and goes with',
    'W3-08 (FR-15). TrueVision\'s own note said "not yet ported - it waits for',
    'Adam\'s sign-off"; ',
]


def js_note(rel, version, release, date, unconfirmed, extra_div=None, back_port=('none.',), parity='verbatim', console=False):
    sw = list(SWITCH)
    sw[-1] = sw[-1] + unconfirmed[0]
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + rel,
        '// - Source version: %s (TrueVision3D %s, %s; read at %s)' % (version, release, date, PIN),
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-19}},',
    ] + ['//                   ' + l for l in sw] + ['//                   ' + l for l in unconfirmed[1:]] + [
        '// - Parity        : ' + parity,
        '// - Divergences   :',
        ('//   - Banner reads ValeVision3D; console prefix [ValeVision3D LayoutEditor].' if console
         else '//   - Banner reads ValeVision3D. (No console output in this file.)'),
    ] + (extra_div or []) + [
        '// - Back-port     : ' + back_port[0],
    ] + ['//                   ' + l for l in back_port[1:]]
    return ('\n'.join(lines) + '\n').encode('utf-8')


U129 = 'v2.129.0 (the folder) is "NOT tried by Adam"'
FILES = {
    OS_DIR + 'Na__LayoutEditor__ObjectSnap__Search__.js': dict(kind='js', version='1.1.0', release='v2.138.0', date='21-Sep-2026',
        unconfirmed=['v2.129.0 (1.0.0, carrying',
                     'Snapping 1.5.0\'s title block snaps of v2.114.0 and reference layers of',
                     'v2.123.0) and v2.138.0 (1.1.0, turned viewports) are "NOT tried by',
                     'Adam" there. They come across under DR-01 (c) and are named as not yet',
                     'confirmed by Adam.']),
    OS_DIR + 'Na__LayoutEditor__ObjectSnap__Moves__.js': dict(kind='js', version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        unconfirmed=[U129 + ' there.',
                     'It comes across under DR-01 (c) and is named as not yet confirmed by',
                     'Adam. Nothing imports it here until the hub (W3-03) takes TrueVision\'s',
                     'PointerDrag: this app\'s HitResolution keeps its own',
                     'Na__LeTools__SnapShapeTranslation, the code this file holds.']),
    OS_DIR + 'Na__LayoutEditor__ObjectSnap__GridMoves__.js': dict(kind='js', version='1.2.0', release='v2.138.0', date='21-Sep-2026',
        unconfirmed=['v2.114.0 (1.0.0, as',
                     'SheetTools__GridDrag__), v2.129.0 (1.1.0, moved here) and v2.138.0',
                     '(1.2.0, turned viewports) are not tried by Adam there. They come across',
                     'under DR-01 (c) and are named as not yet confirmed by Adam. Reached only',
                     'through __Moves__ until the hub (W3-03) takes TrueVision\'s PointerDrag;',
                     'the grid answers nothing until Grid Snap (F7) is switched on (W3-05).']),
    OS_DIR + 'Na__LayoutEditor__ObjectSnap__.js': dict(kind='js', version='1.0.0', release='v2.129.0', date='21-Sep-2026', console=True,
        unconfirmed=[U129 + ' there.',
                     'It comes across under DR-01 (c) and is named as not yet confirmed by',
                     'Adam. F3, the toolbar\'s Snap button and the right-click menu\'s',
                     'Snapping row switch through this file from this package on.'],
        extra_div=['//   - The toolbar is this app\'s until W5-01 takes TrueVision\'s whole: its Snap button',
                   '//     reads CHANGED_EVENT, IsEnabled and Toggle here, but has no arrow and no',
                   '//     Label() words yet, so __Menu__ is landed with nothing opening it.']),
    OS_DIR + 'Na__LayoutEditor__ObjectSnap__Menu__.js': dict(kind='js', version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        unconfirmed=[U129 + ' there.',
                     'It comes across under DR-01 (c) and is named as not yet confirmed by',
                     'Adam. Landed with nothing opening it: TrueVision\'s toolbar calls',
                     'ToggleMenu from the arrow beside the Snap button, and this app takes that',
                     'toolbar whole with W5-01.']),
}


def css_note():
    lines = [
        '   PORT NOTE:',
        '   - Ported from   : TrueVision3D ' + OS_DIR + 'Na__LayoutEditor__Styles__ObjectSnap__.css',
        '   - Source version: none of its own - the sheet carries no version or log; taken as',
        '                     TrueVision3D v2.149.0 left it (22-Sep-2026, commit a2e0a836; read at',
        '                     ' + PIN + '): created with v2.129.0 (21-Sep-2026), the marker placed by its',
        '                     transform with v2.137.0 (21-Sep-2026), the Move Anchor region with v2.149.0',
        '   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-19}}, linked by',
        '                     Na__LayoutEditor__Loader__ straight after Styles__Main__Paper, TrueVision\'s',
        '                     place in its CSS index. The old marker rules (the bordered, tinted box,',
        '                     the three tool tones, the clipped midpoint triangle and the inference',
        '                     ring) left Styles__Main__Paper in the same change. v2.129.0 and v2.137.0',
        '                     are "NOT tried by Adam" in TrueVision; v2.149.0 records no try. All three',
        '                     come across under DR-01 (c) and are named as not yet confirmed by Adam.',
        '                     The Move Anchor rules style nothing until the Move Anchor lands (W2-25)',
        '                     and is switched on (W3-04, DR-40 item 10, held).',
        '   - Parity        : verbatim (every rule and comment is TrueVision\'s; the banner and this note',
        '                     are the only differences)',
        '   - Divergences   :',
        '     - Banner reads ValeVision3D.',
        '   - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so',
        '                     the Source version line names the release that last changed it.',
        '   - Back-port     : none.',
        '',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


def test_note(rel, version, release, date, body, extra_div=None):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + rel,
        '// - Source version: %s (TrueVision3D %s, %s; read at %s)' % (version, release, date, PIN),
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-19}}' + body[0],
    ] + ['//                   ' + l for l in body[1:]] + [
        '// - Parity        : verbatim',
        '// - Divergences   :',
    ] + (extra_div or ['//   - Banner reads ValeVision3D.']) + [
        '// - Back-port     : none.',
        '//',
        '// -----------------------------------------------------------------------------',
        '//',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


TESTS = {
    TEST_DIR + 'Na__TestEnv__ObjectSnapBundle__.cjs': dict(version='1.0.0', release='v2.129.0', date='21-Sep-2026',
        body=[', with the object', 'snap folder\'s switch-over. Path-generic: it reads this app\'s own',
              '28__System__ObjectSnap, so each suite that loads it (Na__Test__ObjectSnap__',
              'here; Na__Test__LayerMenu__, already landed; DrawingGrid with W3-05,',
              'GroupMoveSnapping with W3-03) runs the shipped units (WP-S04b-14, DR-05).']),
    TEST_DIR + 'Na__Test__ObjectSnap__.test.mjs': dict(version='1.1.0', release='v2.143.0', date='22-Sep-2026',
        body=[', with the object', 'snap folder\'s switch-over. It runs this app\'s shipped State, Geometry,',
              'Index, Sources, Search and Glyphs units, and the Curves and',
              'ViewportRotation leaves, as TrueVision\'s does.'],
        extra_div=['//   - Banner and the title line read ValeVision3D.']),
}


def git_show(rel):
    return subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout


def replace_once(data, old, new, what):
    n = data.count(old)
    assert n == 1, '%s: expected 1 occurrence, found %d' % (what, n)
    return data.replace(old, new)


def build(rel):
    tv = git_show(rel)
    assert b'\r\n' not in tv
    name = os.path.basename(rel)
    if rel in FILES:
        spec = FILES[rel]
        data = replace_once(tv, b'// TRUEVISION3D - LAYOUT EDITOR - OBJECT SNAP', b'// VALEVISION3D - LAYOUT EDITOR - OBJECT SNAP', name + ' banner')
        start = data.index(b'// PORT NOTE:\n')
        end = data.index(JS_PN_END, start)
        note = js_note(rel, spec['version'], spec['release'], spec['date'], spec['unconfirmed'], spec.get('extra_div'), console=spec.get('console', False))
        data = data[:start] + note + data[end:]
        if spec.get('console'):
            assert data.count(b"'[TrueVision3D LayoutEditor] ") == 2
            data = data.replace(b"'[TrueVision3D LayoutEditor] ", b"'[ValeVision3D LayoutEditor] ")
    elif rel.endswith('.css'):
        data = replace_once(tv, b'   TRUEVISION3D - LAYOUT EDITOR - OBJECT SNAP - STYLES\n', b'   VALEVISION3D - LAYOUT EDITOR - OBJECT SNAP - STYLES\n', 'css banner')
        anchor = b'     colours and its hover, drag and carry states.\n\n   ============================================================================= */\n'
        data = replace_once(data, anchor,
                            b'     colours and its hover, drag and carry states.\n\n' + css_note() + b'   ============================================================================= */\n', 'css note')
    else:
        spec = TESTS[rel]
        data = replace_once(tv, b'// TRUEVISION3D - TEST', b'// VALEVISION3D - TEST', name + ' banner')
        anchor = b'//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
        note = test_note(rel, spec['version'], spec['release'], spec['date'], spec['body'], spec.get('extra_div'))
        data = replace_once(data, anchor, b'//\n// -----------------------------------------------------------------------------\n//\n' + note + b'// DEVELOPMENT LOG:\n', name + ' note')
        if name == 'Na__Test__ObjectSnap__.test.mjs':
            data = replace_once(data, b"console.log('TrueVision3D - object snap:", b"console.log('ValeVision3D - object snap:", 'test title')
    # No app token left outside the PORT NOTE and the DEVELOPMENT LOG / DESCRIPTION provenance
    for bad in (b'TRUEVISION3D', b'[TrueVision3D', b'window.TrueVision__', b'NaProjectPortal', b'na-truevision-api', b'/r2/'):
        assert bad not in data, (name, bad)
    return tv, data


ALL = list(FILES) + [OS_DIR + 'Na__LayoutEditor__Styles__ObjectSnap__.css'] + list(TESTS)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--land'
    ok = True
    for rel in ALL:
        tv, data = build(rel)
        dst = os.path.join(VV_APP, rel.replace('/', os.sep))
        if mode == '--check':
            live = open(dst, 'rb').read()
            same = live == data
            ok = ok and same
            print('CHECK', 'OK  ' if same else 'DIFF', rel, len(tv), '->', len(live))
        elif mode == '--dry':
            print('DRY', rel, len(tv), '->', len(data))
        else:
            with open(dst, 'xb') as fh:
                fh.write(data)
            print('WROTE', rel, len(tv), '->', len(data))
    if mode == '--check':
        print('CHECK PASS' if ok else 'CHECK FAIL')


if __name__ == '__main__':
    main()
