# -*- coding: utf-8 -*-
# W1-27 - Floor Areas core modules (inert, ahead of the hub and MarkupBridge).
#
# Builds ValeVision's copies of six TrueVision files and the TrueVision test from TrueVision's bytes at the pin
# (git show b2aa9151:..., LF, as returned), re-applying ONLY the declared seams:
#   - every module : banner line 2 "// TRUEVISION3D - " -> "// VALEVISION3D - " (K2 H1)
#   - every module : TrueVision's own PORT NOTE block (Authored in / "ValeVision : not yet ported") replaced by
#                    this app's PORT NOTE (K2 H5; the TrueVision lines are not copied)
#   - FloorAreas__ : the one console prefix "[TrueVision3D LayoutEditor]" -> "[ValeVision3D LayoutEditor]" (K2 C1)
#   - the config   : none (byte for byte)
#   - the test     : banner, the printed title, and a PORT NOTE inserted before its DEVELOPMENT LOG (TrueVision's
#                    test has none) - the form W1-13 and W1-21 used for their ported tests
# Every seam must match exactly once, and the TrueVision block it replaces must be exactly the one expected.
#
# Usage (from anywhere; python -B):
#   port_w1_27.py --stage <dir>   write the candidates under <dir> (mirroring app-relative paths) and report
#   port_w1_27.py --check         build in memory and report only
#   port_w1_27.py --write         land the candidates in the live ValeVision tree (new files only: refuses when a
#                                 target exists and differs); records sha256 in written__sha256.json
#   port_w1_27.py --verify        live files == candidates, and reversing the seams on each gives TrueVision's bytes
#   port_w1_27.py --restore       remove the files --write created, only if unchanged since (then the empty folder)
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
TEST = '80__Testing__PrototypeEnvironment/Na__Test__FloorAreas__.test.mjs'

PORTED_ON = '02-Oct-2026'
TOKEN = '{{VVREL:W1-27}}'

BANNER_TV = b'// TRUEVISION3D - '
BANNER_VV = b'// VALEVISION3D - '
CONSOLE_TV = b'[TrueVision3D LayoutEditor]'
CONSOLE_VV = b'[ValeVision3D LayoutEditor]'
TITLE_TV = b"console.log('TrueVision3D - floor areas, the measurement');"
TITLE_VV = b"console.log('ValeVision3D - floor areas, the measurement');"
RULE = b'// -----------------------------------------------------------------------------'

SIGNOFF = [
    "TrueVision's floor area plan keeps its ValeVision phase open until Adam has",
    'signed Floor Areas off; ported under DR-01 (c) - the Port Record names every',
    'TrueVision release it carries that Adam has not confirmed in TrueVision itself.',
]

TV_NOTE_GEOMETRY = [
    '// PORT NOTE:',
    '// - Authored in   : TrueVision3D first (21-Sep-2026)',
    '// - ValeVision    : not yet ported - the whole Floor Areas system goes across',
    '//                   together, once Adam has signed this off.',
]
TV_NOTE_SYSTEM = [
    '// PORT NOTE:',
    '// - Authored in   : TrueVision3D first (21-Sep-2026)',
    '// - ValeVision    : not yet ported - the whole system goes across together.',
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
        'name': 'Na__LayoutEditor__FloorAreas__Geometry__.js',
        'tv_note': TV_NOTE_GEOMETRY,
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js',
                     '1.1.0 (TrueVision3D v2.125.0, 21-Sep-2026; read at ' + PIN + ')',
                     ['verbatim, and inert until Floor Areas switches on (DR-14 (A)): only the',
                      'Floor Areas module beside it imports it, and nothing imports that yet.',
                      'Na__Test__FloorAreas__ proves it in Node.'] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__.js',
        'tv_note': TV_NOTE_SYSTEM,
        'console': 1,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__.js',
                     '1.2.2 (TrueVision3D v2.150.0, 22-Sep-2026; read at ' + PIN + ')',
                     ['verbatim, and inert until Floor Areas switches on (DR-14 (A)): only the',
                      'Floor Areas tool, menu and label beside it import it until the mode',
                      'controller registers the panel and calls Ready - the one thing that',
                      'fetches the config.'] + SIGNOFF,
                     'Banner and the console prefix read ValeVision3D.'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__Tool__.js',
        'tv_note': TV_NOTE_REST,
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__Tool__.js',
                     '1.0.0 (TrueVision3D v2.104.0, 21-Sep-2026; read at ' + PIN + ')',
                     ['verbatim, and inert until Floor Areas switches on (DR-14 (A)): nothing in',
                      "this app imports it until the sheet tools hub and the Measurements box are",
                      "TrueVision's, and the A key reaches it only then. It hands this app's Draw",
                      'and Rectangle tools the room block and the Floor Areas layer, which they',
                      'honour from ShapeTool 1.7.0 and RectangleTool 1.3.0 on.'] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__Menu__.js',
        'tv_note': TV_NOTE_REST,
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__Menu__.js',
                     '1.1.1 (TrueVision3D v2.150.0, 22-Sep-2026; read at ' + PIN + ')',
                     ['verbatim, and inert until Floor Areas switches on (DR-14 (A)): nothing in',
                      "this app imports it until the sheet tools' context menu is TrueVision's."] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
    {
        'name': 'Na__LayoutEditor__FloorAreas__Paint__.js',
        'tv_note': TV_NOTE_REST,
        'console': 0,
        'note': note(FA + 'Na__LayoutEditor__FloorAreas__Paint__.js',
                     '1.1.0 (TrueVision3D v2.125.0, 21-Sep-2026; read at ' + PIN + ')',
                     ['verbatim, and inert until Floor Areas switches on (DR-14 (A)): nothing in',
                      "this app imports it until MarkupBridge is TrueVision's (1.20.0); until then",
                      'a room on a sheet (Shape__Area, kept by SheetRecords) draws as its plain',
                      'vector, with no label.'] + SIGNOFF,
                     'Banner reads ValeVision3D. (No console output in this file.)'),
    },
]

CONFIG = 'Na__LayoutEditor__FloorAreas__Config__.json'

TEST_NOTE = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D ' + TEST,
    '// - Source version: 1.0.0 (written with TrueVision3D v2.104.0, 21-Sep-2026, 37 checks; the label-home',
    '//                   checks of v2.125.0, 21-Sep-2026, came in under the same 1.0.0 - git 7ab70638 -',
    '//                   making 47; read at ' + PIN + ')',
    '// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN + ', with the Geometry module and the',
    '//                   config it proves',
    "// - Parity        : verbatim - every check is TrueVision's, run against this app's own copy of",
    '//                   the Floor Areas Geometry module and the Floor Areas config',
    '// - Divergences   :',
    '//   - Banner and the printed title read ValeVision3D.',
    '// - Back-port     : none.',
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
    out = tv
    # 1. banner (line 2, and the only TRUEVISION3D in the file)
    if tv.count(b'TRUEVISION3D') != 1 or tv.split(b'\n')[1].find(BANNER_TV) != 0:
        raise SystemExit('banner not where expected in ' + spec['name'])
    out = once(out, BANNER_TV, BANNER_VV, spec['name'] + ' banner')
    # 2. PORT NOTE: TrueVision's block, exactly as expected, replaced by this app's
    old_block = lf(spec['tv_note']) + b'\n//\n' + RULE
    new_block = lf(spec['note']) + b'\n//\n' + RULE
    out = once(out, old_block, new_block, spec['name'] + ' PORT NOTE')
    # 3. console prefix
    if out.count(CONSOLE_TV) != spec['console']:
        raise SystemExit('console prefix count in %s: %d, expected %d' % (spec['name'], out.count(CONSOLE_TV), spec['console']))
    if spec['console']:
        out = out.replace(CONSOLE_TV, CONSOLE_VV)
    # nothing else may name TrueVision outside this app's own PORT NOTE
    rest = out.replace(new_block, b'')
    for word in (b'TrueVision', b'TRUEVISION', b'truevision'):
        if word in rest:
            raise SystemExit('%s still names %r outside the PORT NOTE' % (spec['name'], word))
    return out


def build_test(tv):
    if b'\r' in tv:
        raise SystemExit('unexpected CR in TrueVision test')
    out = tv
    if tv.split(b'\n')[1].find(BANNER_TV) != 0:
        raise SystemExit('test banner not on line 2')
    out = once(out, BANNER_TV, BANNER_VV, 'test banner')
    out = once(out, TITLE_TV, TITLE_VV, 'test printed title')
    anchor = RULE + b'\n//\n// DEVELOPMENT LOG:'
    out = once(out, anchor, RULE + b'\n//\n' + lf(TEST_NOTE) + b'\n//\n' + RULE + b'\n//\n// DEVELOPMENT LOG:', 'test PORT NOTE insert')
    if b'// PORT NOTE:' in tv:
        raise SystemExit('the TrueVision test already has a PORT NOTE: re-plan the seam')
    rest = out.replace(lf(TEST_NOTE), b'')
    for word in (b'TrueVision', b'TRUEVISION'):
        if word in rest:
            raise SystemExit('the test still names %r outside the PORT NOTE' % word)
    return out


def build():
    cands = {}
    sources = {}
    for spec in MODULES:
        rel = FA + spec['name']
        tv = tv_show(rel)
        sources[rel] = tv
        cands[rel] = build_module(spec, tv)
    rel = FA + CONFIG
    tv = tv_show(rel)
    sources[rel] = tv
    cands[rel] = tv                                                     # byte for byte
    tv = tv_show(TEST)
    sources[TEST] = tv
    cands[TEST] = build_test(tv)
    return cands, sources


def unseam(rel, data):
    """Reverse the seams on a ValeVision copy: the result must be TrueVision's bytes exactly."""
    name = rel.split('/')[-1]
    if name == CONFIG:
        return data
    if rel == TEST:
        out = data.replace(RULE + b'\n//\n' + lf(TEST_NOTE) + b'\n//\n' + RULE, RULE, 1)
        out = out.replace(TITLE_VV, TITLE_TV, 1)
        return out.replace(BANNER_VV, BANNER_TV, 1)
    spec = [s for s in MODULES if s['name'] == name][0]
    out = data.replace(lf(spec['note']) + b'\n//\n' + RULE, lf(spec['tv_note']) + b'\n//\n' + RULE, 1)
    out = out.replace(CONSOLE_VV, CONSOLE_TV)
    return out.replace(BANNER_VV, BANNER_TV, 1)


def report(cands, sources):
    for rel, data in cands.items():
        tv = sources[rel]
        print('%-95s TV %6d B %4d lines sha256 %s -> VV %6d B %4d lines sha256 %s' % (
            rel, len(tv), tv.count(b'\n'), sha(tv)[:12], len(data), data.count(b'\n'), sha(data)[:12]))


def live_path(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def main(argv):
    if not argv:
        print(__doc__ if __doc__ else 'see the header')
        return 2
    mode = argv[0]
    cands, sources = build()
    if mode == '--check':
        report(cands, sources)
        bad = sum(1 for rel, data in cands.items() if unseam(rel, data) != sources[rel])
        print('reverse-seam check: %d problem(s)' % bad)
        return 1 if bad else 0
    if mode == '--stage':
        root = argv[1]
        for rel, data in cands.items():
            dst = os.path.join(root, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as fh:
                fh.write(data)
        report(cands, sources)
        print('staged %d file(s) under %s' % (len(cands), root))
        return 0
    if mode == '--write':
        mine = json.load(open(WRITTEN, encoding='utf-8')) if os.path.exists(WRITTEN) else {}
        for rel, data in cands.items():
            p = live_path(rel)
            if os.path.exists(p):
                with open(p, 'rb') as fh:
                    have = fh.read()
                if have != data and mine.get(rel) != sha(have):                 # <-- only W1-27's own landed bytes may be replaced
                    raise SystemExit('REFUSED: %s already exists and differs (sha256 %s) - nothing written' % (rel, sha(have)[:12]))
        written = {}
        for rel, data in cands.items():
            p = live_path(rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'wb') as fh:
                fh.write(data)
            written[rel] = sha(data)
        with open(WRITTEN, 'w', encoding='utf-8') as fh:
            json.dump(written, fh, indent=1)
        report(cands, sources)
        print('written %d file(s); hashes in %s' % (len(written), WRITTEN))
        return 0
    if mode == '--verify':
        bad = 0
        for rel, data in cands.items():
            p = live_path(rel)
            if not os.path.exists(p):
                print('MISSING  ' + rel)
                bad += 1
                continue
            with open(p, 'rb') as fh:
                have = fh.read()
            ok_cand = have == data
            ok_tv = unseam(rel, have) == sources[rel]
            print('%s %s  (== candidate: %s; seams reversed == TrueVision at %s: %s)' % (
                'OK ' if ok_cand and ok_tv else 'BAD', rel, ok_cand, PIN, ok_tv))
            bad += 0 if ok_cand and ok_tv else 1
        print('verify: %d problem(s)' % bad)
        return 1 if bad else 0
    if mode == '--restore':
        if not os.path.exists(WRITTEN):
            raise SystemExit('nothing recorded as written')
        written = json.load(open(WRITTEN, encoding='utf-8'))
        for rel, digest in written.items():
            p = live_path(rel)
            if os.path.exists(p):
                with open(p, 'rb') as fh:
                    if sha(fh.read()) != digest:
                        raise SystemExit('REFUSED: %s changed since W1-27 wrote it - nothing removed' % rel)
        for rel in written:
            p = live_path(rel)
            if os.path.exists(p):
                os.remove(p)
                print('removed ' + rel)
        folder = live_path(FA)
        if os.path.isdir(folder) and not os.listdir(folder):
            os.rmdir(folder)
            print('removed the empty folder ' + FA)
        return 0
    print('unknown mode ' + mode)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
