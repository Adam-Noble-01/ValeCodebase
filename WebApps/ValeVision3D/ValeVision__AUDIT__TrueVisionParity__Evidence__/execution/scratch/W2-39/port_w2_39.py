"""W2-39 port script: SiteLegend, SiteLegendLink and their test, from TrueVision at the pin.

--stage    build each file from TV's bytes at b2aa9151 with asserted, counted substitutions into staged/
--apply    write the staged files into the live VV tree (refuses a target that exists and differs from staged)
--check    rebuild from TV and compare with the landed bytes
--restore  remove only landed files whose bytes still equal what --apply wrote
"""
import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
STAGED = os.path.join(HERE, 'staged')
WRITTEN = os.path.join(HERE, 'written__sha256.json')

FEATURE = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/'
LEGEND = FEATURE + 'Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js'
LINK = FEATURE + 'Na__LayoutEditor__ScrapbookParametric__SiteLegendLink__.js'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookSiteLegend__.test.mjs'

RULE = '// -----------------------------------------------------------------------------\n'


def tv(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel],
                          capture_output=True, check=True).stdout


def sub(text, old, new, count):
    found = text.count(old)
    assert found == count, 'expected %d of %r, found %d' % (count, old, found)
    return text.replace(old, new)


def build_legend():
    t = tv(LEGEND).decode('utf-8')
    assert '\r' not in t
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND\n',
               '// VALEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND\n', 1)
    t = sub(t,
            '// PORT NOTE:\n'
            '// - Authored in   : TrueVision3D first (29-Sep-2026)\n'
            '// - ValeVision    : not ported - ValeVision has no site plan drawings.\n',
            '// PORT NOTE:\n'
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js\n'
            '// - Source version: 1.0.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)\n'
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-39}}, the whole file, new in this app.\n'
            '//                   TrueVision\'s v2.164.0 entry says it was not tried by Adam: ported under\n'
            '//                   DR-01 (c) and named. Lands inert and dormant with site plans (DR-08 (B)):\n'
            '//                   it imports nothing, nothing imports it until the parametric panel\n'
            '//                   registers it, and the site plan drawings it lists stay switched off until\n'
            '//                   a Vale site plan pipeline exists.\n'
            '// - Parity        : adapted\n'
            '// - Divergences   :\n'
            '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
            '//   - The FALLBACK HiddenByDefault stems carry this app\'s token (ValeVision__SitePlan__*),\n'
            '//     the stems this app\'s site plan store hands its viewports (K2 K3).\n'
            '// - Back-port     : none.\n', 1)
    t = sub(t, "            'TrueVision__SitePlan__", "            'ValeVision__SitePlan__", 5)
    assert 'TrueVision__' not in t and 'TRUEVISION3D' not in t
    return t.encode('utf-8')


def build_link():
    t = tv(LINK).decode('utf-8')
    assert '\r' not in t
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND LINK\n',
               '// VALEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND LINK\n', 1)
    t = sub(t,
            '// PORT NOTE:\n'
            '// - Authored in   : TrueVision3D first (29-Sep-2026)\n'
            '// - ValeVision    : not ported - ValeVision has no site plan drawings.\n',
            '// PORT NOTE:\n'
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegendLink__.js\n'
            '// - Source version: 1.0.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)\n'
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-39}}, the whole file, new in this app.\n'
            '//                   TrueVision\'s v2.164.0 entry says it was not tried by Adam: ported under\n'
            '//                   DR-01 (c) and named. Lands inert and dormant with site plans (DR-08 (B)):\n'
            '//                   nothing imports it until the parametric panel attaches it, and even then\n'
            '//                   it lists nothing while no sheet holds a site plan viewport. Every import\n'
            '//                   resolves to this app\'s own modules at TrueVision\'s paths; the site plan\n'
            '//                   store reaches storage only through this app\'s facade.\n'
            '// - Parity        : verbatim\n'
            '// - Divergences   :\n'
            '//   - Banner and the console prefix ([ValeVision3D LayoutEditor]) read ValeVision3D.\n'
            '// - Back-port     : none.\n', 1)
    t = sub(t, "console.warn('[TrueVision3D LayoutEditor] ", "console.warn('[ValeVision3D LayoutEditor] ", 2)
    assert 'TrueVision__' not in t and 'TRUEVISION3D' not in t and '[TrueVision3D' not in t
    return t.encode('utf-8')


def build_test():
    t = tv(TEST).decode('utf-8')
    assert '\r' not in t
    t = sub(t, '// TRUEVISION3D - TEST - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND\n',
               '// VALEVISION3D - TEST - PARAMETRIC SCRAPBOOK - SITE PLAN LEGEND\n', 1)
    t = sub(t,
            RULE + '//\n// DEVELOPMENT LOG:\n',
            RULE + '//\n'
            '// PORT NOTE:\n'
            '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookSiteLegend__.test.mjs\n'
            '// - Source version: 1.0.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)\n'
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-39}}, new in this app, with the\n'
            '//                   site plan legend 1.0.0. It reads this app\'s parametric config: the\n'
            '//                   SiteLegend block and its tile arrive with the parametric panel and config;\n'
            '//                   until they do it is run on a staged copy carrying them.\n'
            '// - Parity        : adapted - every check is TrueVision\'s, run against this app\'s own module,\n'
            '//                   hatch library and config.\n'
            '// - Divergences   :\n'
            '//   - Banner and the printed title read ValeVision3D.\n'
            '//   - The fixture rows\' keys and the hidden-row checks use this app\'s stems\n'
            '//     (ValeVision__SitePlan__*), the stems its site plan store hands its viewports.\n'
            '// - Back-port     : none.\n'
            '//\n' + RULE + '//\n// DEVELOPMENT LOG:\n', 1)
    t = sub(t, "console.log('TrueVision3D - parametric scrapbook site plan legend');",
               "console.log('ValeVision3D - parametric scrapbook site plan legend');", 1)
    t = sub(t, "'TrueVision__SitePlan__", "'ValeVision__SitePlan__", 12)
    assert 'TrueVision__' not in t and 'TRUEVISION3D' not in t
    return t.encode('utf-8')


BUILDERS = {LEGEND: build_legend, LINK: build_link, TEST: build_test}


def staged_path(rel):
    return os.path.join(STAGED, *rel.split('/'))


def live_path(rel):
    return os.path.join(VV, *rel.split('/'))


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main(mode):
    if mode == '--stage':
        for rel, fn in BUILDERS.items():
            b = fn()
            p = staged_path(rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(b)
            print('staged', rel, len(b), 'bytes', b.count(b'\n'), 'lines')
    elif mode == '--apply':
        written = {}
        for rel in BUILDERS:
            b = open(staged_path(rel), 'rb').read()
            assert b == BUILDERS[rel](), 'staged copy is stale: ' + rel
            p = live_path(rel)
            if os.path.exists(p) and open(p, 'rb').read() != b:
                raise SystemExit('REFUSED: target exists and differs: ' + rel)
        for rel in BUILDERS:
            b = open(staged_path(rel), 'rb').read()
            p = live_path(rel)
            with open(p, 'wb') as f:
                f.write(b)
            written[rel] = sha(b)
            print('wrote', rel)
        json.dump(written, open(WRITTEN, 'w'), indent=1)
    elif mode == '--check':
        ok = 0
        for rel, fn in BUILDERS.items():
            p = live_path(rel)
            same = os.path.exists(p) and open(p, 'rb').read() == fn()
            print(('same  ' if same else 'DIFF  ') + rel)
            ok += same
        print('CHECK PASS' if ok == len(BUILDERS) else 'CHECK FAIL', '%d/%d' % (ok, len(BUILDERS)))
        return 0 if ok == len(BUILDERS) else 1
    elif mode == '--restore':
        written = json.load(open(WRITTEN))
        for rel, digest in written.items():
            p = live_path(rel)
            if os.path.exists(p) and sha(open(p, 'rb').read()) == digest:
                os.remove(p)
                print('removed', rel)
            else:
                print('LEFT (changed or absent)', rel)
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ''))
