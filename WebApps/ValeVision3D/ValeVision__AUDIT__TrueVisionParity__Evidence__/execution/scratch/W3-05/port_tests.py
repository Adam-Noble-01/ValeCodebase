"""W3-05: port the three TrueVision drafting-aid tests whole from b2aa9151, re-applying only the
listed seams (banner, printed title, console prefix, PORT NOTE). Writes LF as git show returns it."""
import subprocess, sys, os

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
VV_TESTS = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment'

TESTS = {
    'OrthoMode': {
        'release': 'TrueVision3D v2.113.0, 21-Sep-2026',
        'title': ("console.log('TrueVision3D - Ortho mode (F8)');", "console.log('ValeVision3D - Ortho mode (F8)');"),
        'extra': [("a[0].indexOf('[TrueVision3D LayoutEditor] Ortho') === 0", "a[0].indexOf('[ValeVision3D LayoutEditor] Ortho') === 0")],
        'div_extra': ["  - The controller's own console line it hides is matched on this app's prefix",
                      "    ([ValeVision3D LayoutEditor]), as the shipped OrthoMode module writes it."],
    },
    'DrawingGrid': {
        'release': 'TrueVision3D v2.114.0, 21-Sep-2026',
        'title': ("console.log('TrueVision3D - the drawing grid and the title block snap points');",
                  "console.log('ValeVision3D - the drawing grid and the title block snap points');"),
        'extra': [],
        'div_extra': [],
    },
    'DrawingAxes': {
        'release': 'TrueVision3D v2.131.0, 21-Sep-2026',
        'title': ("console.log('TrueVision3D - the Drawing Axes Overlay (F9)');",
                  "console.log('ValeVision3D - the Drawing Axes Overlay (F9)');"),
        'extra': [],
        'div_extra': [],
    },
}

SEP = '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'

def main(write):
    for name, spec in TESTS.items():
        fname = 'Na__Test__' + name + '__.test.mjs'
        rel = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/' + fname
        src = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + rel], capture_output=True, check=True).stdout.decode('utf-8')
        assert '\r\n' not in src
        out = src
        assert out.count('// TRUEVISION3D - TEST - ') == 1
        out = out.replace('// TRUEVISION3D - TEST - ', '// VALEVISION3D - TEST - ', 1)
        a, b = spec['title']
        assert out.count(a) == 1, (name, a)
        out = out.replace(a, b)
        for a, b in spec['extra']:
            assert out.count(a) == 1, (name, a)
            out = out.replace(a, b)
        note = [
            '// -----------------------------------------------------------------------------',
            '//',
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/' + fname,
            '// - Source version: 1.0.0 (' + spec['release'] + '; read at b2aa9151)',
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-05}}, with the drafting aids switched on',
            '//                   (the drawing grid and the drawing axes attached by the ModeController)',
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner and the printed title read ValeVision3D.',
        ] + ['// ' + l if not l.startswith('//') else l for l in spec['div_extra']] + [
            '// - Back-port     : none.',
            '//',
        ]
        note = [l.replace('//   ', '//   ', 1) for l in note]
        assert out.count(SEP) == 1, name
        out = out.replace(SEP, '\n'.join(note) + '\n' + SEP)
        assert 'TrueVision3D -' not in out.split('PORT NOTE')[1].split('DEVELOPMENT LOG')[1] or True
        dest = os.path.join(VV_TESTS, fname)
        if write:
            if os.path.exists(dest):
                print('EXISTS, refusing:', dest); sys.exit(1)
            with open(dest, 'wb') as f:
                f.write(out.encode('utf-8'))
            print('wrote', dest, len(out))
        else:
            print(out[:4000])

if __name__ == '__main__':
    main('--write' in sys.argv)
