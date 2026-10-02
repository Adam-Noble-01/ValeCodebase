# -*- coding: utf-8 -*-
# W3-10 - Floor Areas switched on: the four new files.
#
# Builds ValeVision's copies of four TrueVision files from TrueVision's bytes at the pin (git show b2aa9151:...,
# LF, as returned), re-applying ONLY the declared seams:
#   - every JS module : banner line 2 "// TRUEVISION3D - " -> "// VALEVISION3D - " (K2 H1)
#   - every JS module : TrueVision's own PORT NOTE block ("Authored in" / "ValeVision : not yet ported") replaced by
#                       this app's PORT NOTE (K2 H5; the TrueVision lines are not copied)
#   - Table           : the three console prefixes "[TrueVision3D LayoutEditor]" -> "[ValeVision3D LayoutEditor]" (K2 C1)
#   - the stylesheet  : banner "   TRUEVISION3D - " -> "   VALEVISION3D - "; a PORT NOTE inserted at the foot of its
#                       header comment (TrueVision's sheet has none), the form W2-29 used for Styles__Patterns
# Every seam must match exactly once, and the TrueVision block it replaces must be exactly the one expected.
#
# Usage (python -B):
#   port_w3_10.py --check     build in memory and report only
#   port_w3_10.py --write     land the files in the live ValeVision tree (new files only: refuses when a target
#                             exists and differs); records sha256 in written__sha256.json
#   port_w3_10.py --verify    live files == candidates, and reversing the seams on each gives TrueVision's bytes
#   port_w3_10.py --restore   remove the files --write created, only if unchanged since
#
# Reads TrueVision only at the pin. Writes nothing in TrueVision.

import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
WRITTEN = os.path.join(HERE, 'written__sha256.json')
FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'

PORTED_ON = '02-Oct-2026'
TOKEN = '{{VVREL:W3-10}}'

BANNER_TV = b'// TRUEVISION3D - '
BANNER_VV = b'// VALEVISION3D - '
CSS_BANNER_TV = b'   TRUEVISION3D - '
CSS_BANNER_VV = b'   VALEVISION3D - '
CONSOLE_TV = b'[TrueVision3D LayoutEditor]'
CONSOLE_VV = b'[ValeVision3D LayoutEditor]'
RULE = b'// -----------------------------------------------------------------------------'

SIGNOFF = [
    "TrueVision's floor area plan keeps its ValeVision phase open until Adam has",
    'signed Floor Areas off; ported under DR-01 (c) - the Port Record names every',
    'TrueVision release it carries that Adam has not confirmed in TrueVision itself.',
]

TV_NOTE_REST = [
    '// PORT NOTE:',
    '// - Authored in   : TrueVision3D first (21-Sep-2026)',
    '// - ValeVision    : not yet ported - it goes with the rest of Floor Areas.',
]


def note(path, source, parity, divergence):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + path,
        '// - Source version: ' + source,
        '// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN,
        '// - Parity        : ' + parity[0],
    ]
    lines += ['//                   ' + p for p in parity[1:]]
    lines += ['// - Divergences   :', '//   - ' + divergence, '// - Back-port     : none.']
    return lines


MODULES = [
    {
        'name': 'Na__LayoutEditor__Panel__FloorAreas__.js',
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__Panel__FloorAreas__.js',
                     '1.2.1 (TrueVision3D v2.150.0, 22-Sep-2026; read at ' + PIN + ')',
                     ['verbatim. Floor Areas is switched on with it (DR-14 (A)): the mode',
                      'controller registers it straight after Patterns, last in the right',
                      "column, and its registration links the sheet's stylesheet and attaches",
                      "the label grip. 1.0.0 (v2.104.0), 1.1.0 (v2.106.0), 1.2.0 (v2.125.0) and",
                      '1.2.1 (v2.150.0) all come across.'] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__Table__.js',
        'console': 3,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__Table__.js',
                     '1.1.0 (TrueVision3D v2.148.0, 22-Sep-2026; read at ' + PIN + ')',
                     ['verbatim. Attached once by the mode controller with the rest of Floor',
                      "Areas (DR-14 (A)); it feeds the Area Schedule element, which the",
                      "parametric scrapbook registers. 1.0.0 (v2.104.0) and 1.1.0 (v2.148.0,",
                      'the project form) both come across.'] + SIGNOFF,
                     'Banner and the console prefix read ValeVision3D.'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__LabelGrip__.js',
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__LabelGrip__.js',
                     '1.0.0 (TrueVision3D v2.125.0, 21-Sep-2026; read at ' + PIN + ')',
                     ["verbatim. Attached by the Floor Areas panel's registration, the one place",
                      'the feature boots once (DR-14 (A)).'] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
]

CSS = 'Na__LayoutEditor__Styles__FloorAreas__.css'
CSS_CLOSE = b'\n   ============================================================================= */\n'
CSS_NOTE = [
    '   PORT NOTE:',
    '   - Ported from   : TrueVision3D ' + FA + CSS,
    '   - Source version: none of its own - the sheet carries no version or log; taken as',
    '                     TrueVision3D left it at v2.125.0 (21-Sep-2026, commit 7ab70638: the label',
    "                     grip's dashed box), on the sheet v2.104.0 created (21-Sep-2026, commit",
    '                     1bf9e332), unchanged to the pin (read at ' + PIN + ')',
    '   - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN + ', linked only by',
    "                     Na__LayoutEditor__Panel__FloorAreas__'s own <link>, as in TrueVision (nothing",
    '                     to register in the loader list or the CSS index). Named as not yet',
    '                     confirmed by Adam in TrueVision (DR-01 (c)).',
    "   - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note",
    '                     are the only differences)',
    '   - Divergences   :',
    '     - Banner reads ValeVision3D.',
    '   - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so',
    '                     the Source version line names the changes that made it (R6 OC-07 form).',
    '   - Back-port     : none.',
]


# -----------------------------------------------------------------------------
def tv_show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def once(data, old, new, what):
    n = data.count(old)
    if n != 1:
        raise SystemExit('SEAM FAILED (%s): expected exactly one %r, found %d' % (what, old[:60], n))
    return data.replace(old, new)


def lf(lines):
    return ('\n'.join(lines)).encode('utf-8')


def build_module(spec, tv):
    if b'\r' in tv:
        raise SystemExit('unexpected CR in TrueVision text of ' + spec['name'])
    if tv.count(b'TRUEVISION3D') != 1 or tv.split(b'\n')[1].find(BANNER_TV) != 0:
        raise SystemExit('banner not where expected in ' + spec['name'])
    out = once(tv, BANNER_TV, BANNER_VV, spec['name'] + ' banner')
    old_block = lf(TV_NOTE_REST) + b'\n//\n' + RULE
    new_block = lf(spec['note']) + b'\n//\n' + RULE
    out = once(out, old_block, new_block, spec['name'] + ' PORT NOTE')
    if out.count(CONSOLE_TV) != spec['console']:
        raise SystemExit('console prefix count in %s: %d, expected %d' % (spec['name'], out.count(CONSOLE_TV), spec['console']))
    out = out.replace(CONSOLE_TV, CONSOLE_VV)
    if b'TrueVision3D' in out.replace(lf(spec['note']), b''):
        # TrueVision3D may appear only inside this app's PORT NOTE
        raise SystemExit('TrueVision3D left outside the PORT NOTE in ' + spec['name'])
    return out


def unbuild_module(spec, vv):
    out = vv.replace(CONSOLE_VV, CONSOLE_TV)
    out = once(out, lf(spec['note']) + b'\n//\n' + RULE, lf(TV_NOTE_REST) + b'\n//\n' + RULE, 'reverse note')
    return once(out, BANNER_VV, BANNER_TV, 'reverse banner')


def build_css(tv):
    if b'\r' in tv:
        raise SystemExit('unexpected CR in TrueVision stylesheet')
    if tv.count(b'TRUEVISION3D') != 1 or tv.split(b'\n')[1].find(CSS_BANNER_TV) != 0:
        raise SystemExit('stylesheet banner not where expected')
    out = once(tv, CSS_BANNER_TV, CSS_BANNER_VV, 'css banner')
    # The header's last line is the first CSS_CLOSE: put the note in front of it, after the blank line before it.
    idx = out.find(CSS_CLOSE)
    if idx < 0 or out[:idx].count(b'*/') != 0:
        raise SystemExit('stylesheet header close not found where expected')
    if not out[:idx].endswith(b'\n'):
        raise SystemExit('stylesheet: expected a blank line before the header close')
    insert = lf(CSS_NOTE) + b'\n'
    return out[:idx + 1] + insert + out[idx + 1:]


def unbuild_css(vv):
    out = once(vv, lf(CSS_NOTE) + b'\n', b'', 'reverse css note')
    return once(out, CSS_BANNER_VV, CSS_BANNER_TV, 'reverse css banner')


def candidates():
    out = {}
    for spec in MODULES:
        tv = tv_show(FA + spec['name'])
        vv = build_module(spec, tv)
        assert unbuild_module(spec, vv) == tv
        out[FA + spec['name']] = (vv, tv)
    tv = tv_show(FA + CSS)
    vv = build_css(tv)
    assert unbuild_css(vv) == tv
    out[FA + CSS] = (vv, tv)
    return out


def live(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def main(argv):
    mode = argv[0] if argv else '--check'
    cands = candidates()
    if mode == '--check':
        for rel, (vv, tv) in cands.items():
            print('%-70s tv %6d B  vv %6d B  lines %d  sha256 %s' % (rel.split('/')[-1], len(tv), len(vv), vv.count(b'\n'), sha(vv)[:12]))
        return 0
    if mode == '--write':
        written = {}
        for rel, (vv, tv) in cands.items():
            p = live(rel)
            if os.path.exists(p):
                if open(p, 'rb').read() == vv:
                    print('same   ' + rel)
                    written[rel] = sha(vv)
                    continue
                raise SystemExit('REFUSED: target exists and differs: ' + rel)
            with open(p, 'wb') as fh:
                fh.write(vv)
            written[rel] = sha(vv)
            print('wrote  ' + rel)
        json.dump(written, open(WRITTEN, 'w', encoding='utf-8'), indent=1)
        return 0
    if mode == '--verify':
        bad = 0
        for rel, (vv, tv) in cands.items():
            got = open(live(rel), 'rb').read()
            ok = got == vv
            rev = (unbuild_css(got) if rel.endswith('.css') else unbuild_module(
                [m for m in MODULES if rel.endswith(m['name'])][0], got)) == tv
            print('%s %s  (seams reversed == TV: %s)' % ('OK ' if ok and rev else 'BAD', rel, rev))
            bad += 0 if ok and rev else 1
        return 1 if bad else 0
    if mode == '--restore':
        written = json.load(open(WRITTEN, encoding='utf-8'))
        for rel, digest in written.items():
            p = live(rel)
            if os.path.exists(p) and sha(open(p, 'rb').read()) == digest:
                os.remove(p)
                print('removed ' + rel)
            else:
                print('LEFT (changed or missing) ' + rel)
        return 0
    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
