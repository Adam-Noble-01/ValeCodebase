"""W2-43 build script (scratch): land TrueVision's two folder-50 leaves and the FlushJoins suite in ValeVision.

Package W2-43 - "Projected linework new leaves landed inert: FlushJoins and Storeys".

Reads the three TrueVision files ONLY at the pin (git show b2aa9151, bytes), re-applies the named ValeVision
seams and nothing else, and writes three NEW files into the live ValeVision tree:

  VV/02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlushJoins__.js   <- TV 1.1.0
  VV/02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Storeys__.js      <- TV 1.0.0
  VV/80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs                          <- TV 1.0.0

Seams (K2 H1, H5; S02b-F49 for the test fixture labels):
  - banner TRUEVISION3D -> VALEVISION3D
  - TrueVision's own PORT NOTE block (modules) replaced by ValeVision's K2 H5 PORT NOTE; the test (which has
    none) gains one before its DEVELOPMENT LOG, as W1-09 did for the DepthFog test
  - test only: the NA project named in WHAT IT GUARDS and in one case label becomes a neutral label; every
    number stays (S02b-F49, WP-S02b-08 verifier note)
Everything else is TrueVision's text byte for byte, LF line endings exactly as git show returns them.

Usage:
  python build_w2_43.py --check     build in memory, print the diffs against TrueVision, write nothing
  python build_w2_43.py --write     write the three new files (refuses to overwrite a different file)
  python build_w2_43.py --restore   remove the three files again, only if each is byte-identical to this build
"""
import difflib
import hashlib
import os
import re
import subprocess
import sys

TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN     = 'b2aa9151'
TV_APP  = 'na-apps/30__TrueVision__CoreAppCode'
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE    = os.path.dirname(os.path.abspath(__file__))
PKG     = 'W2-43'
TOKEN   = '{{VVREL:' + PKG + '}}'
TODAY   = '02-Oct-2026'
RULE    = '// ' + '-' * 77


def tv_bytes(rel):
    """TrueVision's file at the pin, exactly as git stores it."""
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + '/' + rel],
                          check=True, stdout=subprocess.PIPE).stdout


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('ANCHOR FAILED (%s): expected exactly 1 occurrence, found %d' % (label, count))
    return text.replace(old, new)


def lines(*rows):
    return ''.join(row + '\n' for row in rows)


# -----------------------------------------------------------------------------
# The three transforms
# -----------------------------------------------------------------------------

def build_flushjoins(tv):
    out = replace_once(tv, '// TRUEVISION3D - PROJECTED LINEWORK - FLUSH JOINS\n',
                           '// VALEVISION3D - PROJECTED LINEWORK - FLUSH JOINS\n', 'FlushJoins banner')
    old_note = lines(
        '// PORT NOTE:',
        '// - Ported from   : n/a - authored in TrueVision3D',
        "// - Back-port     : PENDING to ValeVision3D, on Adam's sign-off.")
    new_note = lines(
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D 02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlushJoins__.js',
        '// - Source version: 1.1.0 (TrueVision3D v2.159.0, 23-Sep-2026; read at b2aa9151)',
        '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ', with Storeys, ahead of the rest of folder 50',
        "//                   (W2-06). TrueVision's own note held it \"PENDING to ValeVision3D, on Adam's sign-off\". The",
        '//                   rule itself (1.0.0, TrueVision3D v2.37.0) is the one Adam signed off in TrueVision on',
        '//                   14-Sep-2026; the 1.1.0 tolerance (v2.159.0) is named as not yet confirmed by Adam there.',
        '//                   It comes across under DR-01 (c) and DR-31.',
        '// - Parity        : verbatim, and inert: nothing imports it until CpuBackend 1.3.0 and later arrive with',
        '//                   W2-06, which also carries the BuildToken bump the 1.1.0 log entry speaks of (DR-31).',
        '//                   80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs runs this very file.',
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D. (No console output in this file.)',
        '// - Back-port     : none.')
    return replace_once(out, old_note, new_note, 'FlushJoins PORT NOTE')


def build_storeys(tv):
    out = replace_once(tv, '// TRUEVISION3D - PROJECTED LINEWORK - STOREYS\n',
                           '// VALEVISION3D - PROJECTED LINEWORK - STOREYS\n', 'Storeys banner')
    old_note = lines(
        '// PORT NOTE:',
        '// - Ported from   : n/a - authored in TrueVision3D',
        "// - Back-port     : PENDING to ValeVision3D, on Adam's sign-off (rides with the",
        '//                   pending plan doors port).')
    new_note = lines(
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D 02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Storeys__.js',
        '// - Source version: 1.0.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151)',
        '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ', with FlushJoins, ahead of the rest of folder',
        "//                   50 (W2-06). TrueVision's own note held it for the plan doors port, on Adam's sign-off; it",
        '//                   comes across under DR-01 (c) and DR-16 (a), and v2.105.0 is named as not yet confirmed by',
        '//                   Adam in TrueVision.',
        '// - Parity        : verbatim, and inert: nothing imports it until DoorPose, Projector 1.5.0 and CpuBackend',
        '//                   1.4.0 arrive with W2-06. Its Storey__<Key>__<Element> match is unanchored, so the storey',
        "//                   categories this app's model loader already builds (Na__ModelLoader__MultiModel.js) match",
        '//                   as they stand.',
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D. (No console output in this file.)',
        '// - Back-port     : none.')
    return replace_once(out, old_note, new_note, 'Storeys PORT NOTE')


def build_test(tv):
    out = replace_once(tv, '// TRUEVISION3D - TEST - FLUSH JOINS (a seam between two flush faces is not a line)\n',
                           '// VALEVISION3D - TEST - FLUSH JOINS (a seam between two flush faces is not a line)\n',
                           'test banner')
    # S02b-F49: keep every number, drop the NA project's name (WHAT IT GUARDS, and the 13.4 micron case).
    out = replace_once(out, "// - THE TOLERANCE (23-Sep-2026, v2.159.0). RB05's first floor walls start\n",
                            "// - THE TOLERANCE (23-Sep-2026, v2.159.0). A measured house's first floor walls start\n",
                            'test WHAT IT GUARDS fixture name')
    out = replace_once(out, "(RB05\\'s first floor wall)", '(the measured first floor wall)', 'test case label')
    port_note = lines(
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs',
        '// - Source version: 1.0.0 (TrueVision3D v2.159.0, 23-Sep-2026; read at b2aa9151)',
        '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ', with the module it proves',
        "// - Parity        : verbatim - every check is TrueVision's, run against this app's own FlushJoins module",
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D.',
        '//   - The fixture keeps every number but no longer names the TrueVision project it was measured',
        "//     on (WHAT IT GUARDS and the 13.4 micron case's label; S02b-F49).",
        '// - Back-port     : none.',
        '//',
        RULE,
        '//')
    return replace_once(out, '// DEVELOPMENT LOG:\n', port_note + '// DEVELOPMENT LOG:\n', 'test PORT NOTE insertion')


FILES = [
    ('02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlushJoins__.js', build_flushjoins),
    ('02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Storeys__.js',    build_storeys),
    ('80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs',                          build_test),
]


# -----------------------------------------------------------------------------
# Checks on what was built
# -----------------------------------------------------------------------------

def port_note_span(text):
    """0-based [start, end) line range of the PORT NOTE block (heading to the next rule line)."""
    rows = text.split('\n')
    start = next(i for i, r in enumerate(rows) if r.startswith('// PORT NOTE:'))
    end = next(i for i in range(start + 1, len(rows)) if re.match(r'^//\s*[-=]{4,}', rows[i]))
    return start, end


def checks(rel, tv, vv):
    problems = []
    if '\r' in vv:
        problems.append('CR found (the port must keep TrueVision\'s LF)')
    if 'TRUEVISION3D' in vv:
        problems.append('TRUEVISION3D banner token left')
    if vv.count(TOKEN) != 1:
        problems.append('expected exactly one %s, found %d' % (TOKEN, vv.count(TOKEN)))
    start, end = port_note_span(vv)
    for number, row in enumerate(vv.split('\n')):
        if 'TrueVision' in row and not (start <= number < end) and not row.startswith('// - Written with FlushJoins'):
            problems.append('TrueVision named outside the PORT NOTE at line %d: %s' % (number + 1, row.strip()))
    if rel.endswith('.test.mjs'):
        if 'RB05' in vv:
            problems.append('NA project name RB05 left in the test (S02b-F49)')
    else:
        if re.search(r'^\s*import\s', vv, re.M):
            problems.append('an import statement: the module must stay a leaf (the FlushJoins harness refuses one)')
        if tv.split('// PORT NOTE:')[0].split('\n', 3)[3] != vv.split('// PORT NOTE:')[0].split('\n', 3)[3]:
            problems.append('header text between the banner and the PORT NOTE differs from TrueVision')
        tv_body = tv.split('// DEVELOPMENT LOG:', 1)[1]
        vv_body = vv.split('// DEVELOPMENT LOG:', 1)[1]
        if tv_body != vv_body:
            problems.append('DEVELOPMENT LOG or code differs from TrueVision')
    return problems


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if mode not in ('--check', '--write', '--restore'):
        raise SystemExit(__doc__)
    diff_dir = os.path.join(HERE, 'diffs')
    os.makedirs(diff_dir, exist_ok=True)
    built = []
    failed = False
    for rel, fn in FILES:
        raw = tv_bytes(rel)
        if b'\r' in raw:
            raise SystemExit('TrueVision bytes for %s carry CR; this script expects LF' % rel)
        tv = raw.decode('utf-8')
        vv = fn(tv)
        problems = checks(rel, tv, vv)
        data = vv.encode('utf-8')
        target = os.path.join(VV_ROOT, rel.replace('/', os.sep))
        built.append((rel, target, data, raw))
        diff = ''.join(difflib.unified_diff(tv.splitlines(True), vv.splitlines(True),
                                            'TV@' + PIN + '/' + rel, 'VV/' + rel))
        with open(os.path.join(diff_dir, os.path.basename(rel) + '.diff'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(diff)
        print('%-92s TV %5d lines sha1 %s -> VV %5d lines sha1 %s' % (rel, tv.count('\n'), sha1(raw)[:12],
                                                                   vv.count('\n'), sha1(data)[:12]))
        for p in problems:
            print('    PROBLEM: ' + p)
            failed = True
    if failed:
        raise SystemExit('Checks failed: nothing written.')

    if mode == '--check':
        print('\n--check: built and checked in memory; diffs in %s; nothing written.' % diff_dir)
        return

    if mode == '--write':
        # Refuse before writing anything: every target must be absent, or already exactly this build.
        for rel, target, data, _ in built:
            if os.path.exists(target):
                with open(target, 'rb') as fh:
                    if fh.read() != data:
                        raise SystemExit('REFUSED: %s exists with other content (changed under this package?)' % target)
        for rel, target, data, _ in built:
            if os.path.exists(target):
                print('unchanged  ' + rel)
                continue
            with open(target, 'xb') as fh:
                fh.write(data)
            print('written    %s  (%d bytes, sha1 %s)' % (rel, len(data), sha1(data)))
        return

    if mode == '--restore':
        for rel, target, data, _ in built:
            if not os.path.exists(target):
                print('absent     ' + rel)
                continue
            with open(target, 'rb') as fh:
                if fh.read() != data:
                    raise SystemExit('REFUSED: %s differs from this build; left alone' % target)
        for rel, target, data, _ in built:
            if os.path.exists(target):
                os.remove(target)
                print('removed    ' + rel)


if __name__ == '__main__':
    main()
