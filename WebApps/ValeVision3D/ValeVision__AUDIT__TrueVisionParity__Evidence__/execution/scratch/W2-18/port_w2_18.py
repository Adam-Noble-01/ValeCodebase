"""W2-18 - Drafting-aid modules (Draft mode, Drawing Grid, Ortho mode, Drawing Axes): the whole-file takes.

Whole-file takes of TrueVision at the pin b2aa9151 (LF, exactly as git show returns them), with only the
K2 seams re-applied: the banner token (H1), the console prefix (C1) and the PORT NOTE block (H5); and,
in one config file, the vv_adaptation "Config Meta reworded for VV" (Draft mode's Meta__Research named
TrueVision as the running app and its plan file by a TrueVision__ literal). Everything else is
TrueVision's bytes.

    python port_w2_18.py           land the twelve new files (open(..., 'xb'): never overwrites)
    python port_w2_18.py --check   prove the landed bytes == TV bytes + the listed seams, nothing else
    python port_w2_18.py --dry     build in memory and report
"""
import os, sys, subprocess, json

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
D26 = LE + '26__System__DraftMode/'
D27 = LE + '27__System__DrawingGrid/'
D32 = LE + '32__System__OrthoMode/'
D33 = LE + '33__System__DrawingAxes/'

JS_PN_END = b'//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
UNSIGNED_LINES = ['TrueVision\'s own note said "not yet ported - it waits for Adam\'s',
                  'sign-off";']
DR01 = ['They come across under DR-01 (c) and are named as not yet confirmed by Adam.']


def js_note(rel, version, release, date, body, console=False, extra_div=None):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + rel,
        '// - Source version: %s (TrueVision3D %s, %s; read at %s)' % (version, release, date, PIN),
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-18}}, landed inert:',
    ] + ['//                   ' + l for l in body] + [
        '// - Parity        : verbatim',
        '// - Divergences   :',
        ('//   - Banner reads ValeVision3D; console prefix [ValeVision3D LayoutEditor].' if console
         else '//   - Banner reads ValeVision3D. (No console output in this file.)'),
    ] + (extra_div or []) + [
        '// - Back-port     : none.',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


FILES = {
    D26 + 'Na__LayoutEditor__DraftMode__.js': dict(
        version='1.1.0', release='v2.111.0', date='21-Sep-2026', console=2,
        banner='// TRUEVISION3D - LAYOUT EDITOR - DRAFT MODE\n',
        body=['nothing imports this controller until the drafting aids are switched',
              'on - K in the sheet tools\' keyboard (the hub, W3-03, W3-05) and the',
              'toolbar\'s Draft button (W5-01). The viewports read the flag from',
              'Na__LayoutEditor__DraftMode__State__ (a leaf, so no import cycle) once',
              'they are TrueVision\'s (W2-16).'] + UNSIGNED_LINES + [
              'v2.107.0 (1.0.0) and v2.111.0 (1.1.0, the zoom settle) record no try',
              'by Adam there.'] + DR01),
    D27 + 'Na__LayoutEditor__DrawingGrid__.js': dict(
        version='1.0.0', release='v2.114.0', date='21-Sep-2026', console=1,
        banner='// TRUEVISION3D - LAYOUT EDITOR - DRAWING GRID\n',
        body=['nothing imports this controller but its own panel until the drafting',
              'aids are switched on - F6 / F7 in the sheet tools\' keyboard (W3-03),',
              'Attach / Detach and the panel\'s registration in the mode controller',
              '(W3-05), the toolbar\'s Grid buttons (W5-01). The snap search already',
              'reads Grid Snap from Na__LayoutEditor__DrawingGrid__State__, off until',
              'then.'] + UNSIGNED_LINES + [
              'v2.114.0 is "not tried" by Adam there. It comes across under DR-01 (c)',
              'and is named as not yet confirmed by Adam. Its defaults are Adam\'s',
              'LayOut A2 template\'s (DR-40 item 5, adopted).']),
    D27 + 'Na__LayoutEditor__Panel__DrawingGrid__.js': dict(
        version='1.0.0', release='v2.114.0', date='21-Sep-2026', console=0,
        banner='// TRUEVISION3D - LAYOUT EDITOR - PANEL: DRAWING GRID\n',
        body=['nothing registers this panel section until the mode controller',
              'takes TrueVision\'s registration, straight after the Sheet section',
              '(W3-05).'] + UNSIGNED_LINES + [
              'v2.114.0 is "not tried" by Adam there. It comes across under DR-01 (c)',
              'and is named as not yet confirmed by Adam.']),
    D32 + 'Na__LayoutEditor__OrthoMode__.js': dict(
        version='1.0.0', release='v2.113.0', date='21-Sep-2026', console=2,
        banner='// TRUEVISION3D - LAYOUT EDITOR - ORTHO MODE\n',
        body=['nothing imports this controller until the drafting aids are switched',
              'on - F8 in the sheet tools\' keyboard (W3-03, W3-05) and the toolbar\'s',
              'Ortho button (W5-01). The tools ask Na__LayoutEditor__OrthoMode__State__',
              '(Resolve) once they are TrueVision\'s (W2-26, W3-03); its flag stays off',
              'until F8 can switch it.'] + UNSIGNED_LINES + [
              'v2.113.0 is "NOT tried by Adam" there. It comes across under DR-01 (c)',
              'and is named as not yet confirmed by Adam.']),
    D33 + 'Na__LayoutEditor__DrawingAxes__.js': dict(
        version='1.0.0', release='v2.131.0', date='21-Sep-2026', console=2,
        banner='// TRUEVISION3D - LAYOUT EDITOR - DRAWING AXES OVERLAY\n',
        body=['nothing imports this controller until the drafting aids are switched',
              'on - F9 in the sheet tools\' keyboard (W3-03), Attach / Detach in the',
              'mode controller (W3-05), the toolbar\'s Axes button (W5-01). It reads',
              'the object snap marker landed with W2-19.'] + UNSIGNED_LINES + [
              'v2.131.0 is "NOT tried by Adam" there. It comes across under DR-01 (c)',
              'and is named as not yet confirmed by Adam.']),
}


def css_note(rel, release_text, ported_extra, divergences=('Banner reads ValeVision3D.',)):
    lines = [
        '   PORT NOTE:',
        '   - Ported from   : TrueVision3D ' + rel,
        '   - Source version: none of its own - the sheet carries no version or log; taken as',
    ] + ['                     ' + l for l in release_text] + [
        '   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-18}}, linked by',
    ] + ['                     ' + l for l in ported_extra] + [
        '   - Parity        : verbatim (every rule and comment is TrueVision\'s; the banner and this note',
        '                     are the only differences)',
        '   - Divergences   :',
    ] + ['     - ' + d for d in divergences] + [
        '   - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so',
        '                     the Source version line names the release that last changed it.',
        '   - Back-port     : none.',
        '',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


CSS = {
    D26 + 'Na__LayoutEditor__Styles__DraftMode__.css': dict(
        banner='   TRUEVISION3D - LAYOUT EDITOR - DRAFT MODE - STYLES\n',
        release=['TrueVision3D v2.111.0 left it (21-Sep-2026; read at ' + PIN + '): created with',
                 'v2.107.0 (21-Sep-2026), refined with v2.111.0 (the zoom settle)'],
        ported=['Na__LayoutEditor__Loader__ straight after Styles__Main__Paper, TrueVision\'s',
                'place in its CSS index. Every rule is keyed on body.na-le-draft, so it styles',
                'nothing until Draft mode is switched on (K, W3-03 / W3-05). v2.107.0 and',
                'v2.111.0 record no try by Adam in TrueVision; both come across under',
                'DR-01 (c) and are named as not yet confirmed by Adam. The Draft note keeps',
                'TrueVision\'s literal font stack (a Vale font token only if Adam chooses one).']),
    D27 + 'Na__LayoutEditor__Styles__DrawingGrid__.css': dict(
        banner='   TRUEVISION3D - LAYOUT EDITOR - DRAWING GRID - STYLES\n',
        release=['TrueVision3D v2.129.0 left it (21-Sep-2026; read at ' + PIN + '): created with',
                 'v2.114.0 (21-Sep-2026); the grid snap ring moved to the Object Snap',
                 'stylesheet with v2.129.0'],
        ported=['Na__LayoutEditor__Loader__ after Styles__DraftMode and before',
                'Styles__ObjectSnap, TrueVision\'s place in its CSS index. It styles only the',
                'grid\'s canvas, which nothing draws until the grid is attached (W3-05).',
                'v2.114.0 and v2.129.0 are "not tried" by Adam in TrueVision; both come',
                'across under DR-01 (c) and are named as not yet confirmed by Adam.']),
    D33 + 'Na__LayoutEditor__Styles__DrawingAxes__.css': dict(
        banner='   TRUEVISION3D - LAYOUT EDITOR - DRAWING AXES OVERLAY - STYLES\n',
        release=['TrueVision3D v2.131.0 left it (21-Sep-2026; read at ' + PIN + ')'],
        ported=['Na__LayoutEditor__Loader__ straight after Styles__ObjectSnap, TrueVision\'s',
                'place in its CSS index. It styles only the axes layer, which nothing',
                'draws until the axes are attached (W3-05). v2.131.0 is "NOT tried by Adam"',
                'in TrueVision; it comes across under DR-01 (c) and is named as not yet',
                'confirmed by Adam.']),
}

# Config JSON: verbatim, except Draft mode's Meta__Research (vv_adaptation "Config Meta reworded for VV")
DRAFT_RESEARCH_OLD = (b"TrueVision's Draft is Always On plus the raster option: the vectors are already cheap to keep, so they stay, "
                      b"and every raster goes. The plan doc TrueVision__PLAN__DraftMode__.md has the sources.")
DRAFT_RESEARCH_NEW = (b"This editor's Draft is Always On plus the raster option: the vectors are already cheap to keep, so they stay, "
                      b"and every raster goes. The sources are in TrueVision3D's Draft Mode plan document, where this mode was "
                      b"designed (it came to ValeVision3D whole on 02-Oct-2026).")
JSON = {
    D26 + 'Na__LayoutEditor__DraftMode__Config__.json': [(DRAFT_RESEARCH_OLD, DRAFT_RESEARCH_NEW)],
    D27 + 'Na__LayoutEditor__DrawingGrid__Config__.json': [],
    D32 + 'Na__LayoutEditor__OrthoMode__Config__.json': [],
    D33 + 'Na__LayoutEditor__DrawingAxes__Config__.json': [],
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
        data = replace_once(tv, spec['banner'].encode(), spec['banner'].replace('TRUEVISION3D', 'VALEVISION3D').encode(), name + ' banner')
        start = data.index(b'// PORT NOTE:\n')
        end = data.index(JS_PN_END, start)
        old_note = data[start:end]
        assert b'not yet ported - it waits for Adam\'s sign-off' in old_note, name
        note = js_note(rel, spec['version'], spec['release'], spec['date'], spec['body'], console=spec['console'] > 0)
        data = data[:start] + note + data[end:]
        n = data.count(b"'[TrueVision3D LayoutEditor] ")
        assert n == spec['console'], (name, n)
        data = data.replace(b"'[TrueVision3D LayoutEditor] ", b"'[ValeVision3D LayoutEditor] ")
    elif rel in CSS:
        spec = CSS[rel]
        data = replace_once(tv, spec['banner'].encode(), spec['banner'].replace('TRUEVISION3D', 'VALEVISION3D').encode(), name + ' banner')
        closer = b'\n\n   ============================================================================= */\n'
        data = replace_once(data, closer, b'\n\n' + css_note(rel, spec['release'], spec['ported']) + closer[2:], name + ' note')
    else:
        data = tv
        for old, new in JSON[rel]:
            data = replace_once(data, old, new, name + ' meta')
        json.loads(data.decode('utf-8'))
    for bad in (b'TRUEVISION3D', b'[TrueVision3D', b'TrueVision__', b'TrueVision3D__', b'window.TrueVision__', b'NaProjectPortal',
                b'na-truevision-api', b'/r2/', b'/na-apps/', b'Noble Architecture Ltd'):
        assert bad not in data, (name, bad)
    return tv, data


ALL = list(FILES) + list(CSS) + list(JSON)


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
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'xb') as fh:
                fh.write(data)
            print('WROTE', rel, len(tv), '->', len(data))
    if mode == '--check':
        print('CHECK PASS' if ok else 'CHECK FAIL')


if __name__ == '__main__':
    main()
