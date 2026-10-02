# =============================================================================
# W1-14 port script: Layout Editor pure leaves B (rotation, curves, drafting-aid state, vector quality)
# =============================================================================
#
# Takes six TrueVision modules and the leaf section of one TrueVision test, read at the pin b2aa9151
# (extract_tv.py wrote them, bytes exactly as `git show` returns them, into scratch/W1-14/tv), and writes
# them at TrueVision's paths in ValeVision with ONLY these seams:
#   - line 2: the banner token TRUEVISION3D -> VALEVISION3D (K2 H1)
#   - TrueVision's PORT NOTE block replaced by ValeVision's (K2 H5); the test gains one (TV's has none)
#   - the test: the opening line it prints names ValeVision3D, and only its geometry region (the real
#     leaf) is kept - the handles, window / snap index and chrome regions arrive with W3-06
# Everything else is TrueVision's text, LF, byte for byte. The script refuses to overwrite any target
# that already exists with different bytes (new files only), and checks its own output against TV.
#
# Usage: python port_w1_14.py            (dry run: prints what it would write)
#        python port_w1_14.py --write    (writes the seven files)
# =============================================================================
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PIN = 'b2aa9151'
WP = 'W1-14'
PORTED_ON = '01-Oct-2026'
RULE = '// ' + '-' * 77
LE = '02__Src__AppModules/51__System__LayoutEditor/'

TOKEN = '{{VVREL:' + WP + '}}'


def note_for_module(rel, source_version):
    return [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + rel,
        '// - Source version: ' + source_version,
        '// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN,
        '// - Parity        : verbatim',
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D. (No console output in this file.)',
        '// - Back-port     : none.',
    ]


MODULES = [
    (LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js',
     '1.0.0 (TrueVision3D v2.138.0, 21-Sep-2026; read at ' + PIN + ')'),
    (LE + '37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js',
     '1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'),
    (LE + '26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js',
     '1.0.0 (TrueVision3D v2.107.0, 21-Sep-2026; read at ' + PIN + ')'),
    (LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js',
     '1.0.0 (TrueVision3D v2.114.0, 21-Sep-2026; its INTEGRATION comment renamed for the v2.129.0 object snap\n'
     '//                   units without a version change; read at ' + PIN + ')'),
    (LE + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js',
     '1.0.0 (TrueVision3D v2.113.0, 21-Sep-2026; read at ' + PIN + ')'),
    (LE + '20__System__Viewports/Na__LayoutEditor__VectorQuality__.js',
     '1.0.0 (TrueVision3D v2.136.0, 21-Sep-2026; read at ' + PIN + ')'),
]

TEST_REL = '80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs'
TEST_NOTE = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D ' + TEST_REL,
    '// - Source version: 1.0.1 (TrueVision3D v2.138.0, 21-Sep-2026, written as 1.0.0; 1.0.1 of 22-Sep-2026 is',
    '//                   the Node 22 navigator fix in the jsPDF part, named in no TrueVision release; read at',
    '//                   ' + PIN + ')',
    '// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN + ' (the leaf section; package W3-06',
    '//                   completes the suite)',
    '// - Parity        : adapted - TrueVision\'s file with three of its four check regions not yet taken',
    '// - Divergences   :',
    '//   - Banner and the first line the test prints read ValeVision3D.',
    '//   - Only THE GEOMETRY region is here: the real ViewportRotation leaf, 16 of TrueVision\'s 52 checks.',
    '//     The HANDLES, the WINDOW AND THE SNAP INDEX and the CHROME AND A REAL jsPDF regions arrive whole',
    '//     with W3-06 (rotatable viewports), once this app has ViewportHandles 1.5.0, the turned Window,',
    '//     the 28__System__ObjectSnap units and SheetChrome\'s turned group. The DESCRIPTION above is',
    '//     TrueVision\'s and describes the whole suite; the imports and the browser stand-in those regions',
    '//     use are kept as TrueVision has them, so W3-06 adds the regions back and nothing else.',
    '// - Back-port     : none.',
]

BANNER_TV = '// TRUEVISION3D - '
BANNER_VV = '// VALEVISION3D - '


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_tv(rel):
    data = open(os.path.join(TV, rel.replace('/', os.sep)), 'rb').read()
    if b'\r' in data:
        raise SystemExit('STOP: TV copy has CR bytes: ' + rel)
    return data.decode('utf-8')


def swap_banner(lines, rel):
    if not lines[1].startswith(BANNER_TV):
        raise SystemExit('STOP: line 2 is not a TRUEVISION3D banner in ' + rel)
    lines[1] = BANNER_VV + lines[1][len(BANNER_TV):]
    left = [i + 1 for i, l in enumerate(lines) if 'TRUEVISION3D' in l]
    if left:
        raise SystemExit('STOP: TRUEVISION3D left at lines %s of %s' % (left, rel))


def port_module(rel, source_version):
    text = read_tv(rel)
    lines = text.split('\n')
    swap_banner(lines, rel)
    if any('console.' in l for l in lines):
        raise SystemExit('STOP: console output present (a prefix seam is not listed): ' + rel)
    start = [i for i, l in enumerate(lines) if l == '// PORT NOTE:']
    if len(start) != 1:
        raise SystemExit('STOP: expected one PORT NOTE block in ' + rel)
    s = start[0]
    e = s + 1
    while not lines[e].startswith('// ---'):
        e += 1
    # lines[e - 1] is the "//" spacer before the rule: keep it and the rule
    if lines[e - 1] != '//':
        raise SystemExit('STOP: unexpected PORT NOTE layout in ' + rel)
    old = lines[s:e - 1]
    if not any('not yet ported' in l for l in old):
        raise SystemExit('STOP: TV PORT NOTE is not the expected "not yet ported" form in ' + rel)
    note = []
    for entry in note_for_module(rel, source_version):
        note.extend(entry.split('\n'))
    lines[s:e - 1] = note
    return '\n'.join(lines), (s, e - 1, len(note))


def port_test():
    text = read_tv(TEST_REL)
    lines = text.split('\n')
    swap_banner(lines, TEST_REL)
    # The line the test prints first names the running app
    hits = [i for i, l in enumerate(lines) if "'\\nTrueVision3D - rotatable viewports" in l]
    if len(hits) != 1:
        raise SystemExit('STOP: expected one opening console line in the test')
    lines[hits[0]] = lines[hits[0]].replace("'\\nTrueVision3D - rotatable viewports", "'\\nValeVision3D - rotatable viewports")
    # Keep only THE GEOMETRY region: drop the three regions between it and Result
    def region(title):
        idx = [i for i, l in enumerate(lines) if l == '// REGION | ' + title]
        if len(idx) != 1:
            raise SystemExit('STOP: region not found once: ' + title)
        return idx[0]
    h = region('The Handles (the shipped unit)')
    r = region('Result')
    if lines[h - 1] != RULE or lines[r - 1] != RULE or lines[h - 2] != '' or lines[h - 3] != '':
        raise SystemExit('STOP: unexpected region layout in the test')
    dropped = lines[h - 1:r - 1]
    del lines[h - 1:r - 1]
    # Insert the PORT NOTE between USAGE and the DEVELOPMENT LOG (TV's test has none)
    d = [i for i, l in enumerate(lines) if l == '// DEVELOPMENT LOG:']
    if len(d) != 1 or lines[d[0] - 1] != '//' or lines[d[0] - 2] != RULE:
        raise SystemExit('STOP: unexpected header layout in the test')
    at = d[0] - 1                                                    # after the rule that closes USAGE
    block = ['//'] + TEST_NOTE + ['//', RULE]
    lines[at:at] = block
    out = '\n'.join(lines)
    # What is left must load only the leaf, and print TrueVision3D nowhere
    if out.count('await load(') != 1 or 'ViewportRotation__.js' not in out.split('await load(')[1].split('\n')[0]:
        raise SystemExit('STOP: the kept test loads something other than the leaf')
    if 'TrueVision3D - ' in out.split('// DEVELOPMENT LOG:')[1].split('import {')[1]:
        raise SystemExit('STOP: TrueVision3D text left in the test body')
    return out, len(dropped)


def main():
    write = '--write' in sys.argv
    plan = []
    for rel, source_version in MODULES:
        text, info = port_module(rel, source_version)
        plan.append((rel, text, 'module; PORT NOTE lines %d-%d replaced by %d lines' % (info[0] + 1, info[1], info[2])))
    test_text, dropped = port_test()
    plan.append((TEST_REL, test_text, 'test; %d lines of three regions not taken; PORT NOTE inserted' % dropped))

    for rel, text, what in plan:
        data = text.encode('utf-8')
        dest = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(dest):
            have = open(dest, 'rb').read()
            if have != data:
                raise SystemExit('STOP: target exists with other bytes (a file changed under us?): ' + dest)
            print('same   ', rel)
            continue
        print(('write  ' if write else 'would  ') + rel + '  %d bytes  sha256 %s  (%s)' % (len(data), sha(data)[:16], what))
        if write:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'wb') as fh:
                fh.write(data)
    if write:
        with open(os.path.join(HERE, 'sha256__written.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            for rel, text, what in plan:
                fh.write(sha(text.encode('utf-8')) + '  ' + rel + '\n')


if __name__ == '__main__':
    main()
