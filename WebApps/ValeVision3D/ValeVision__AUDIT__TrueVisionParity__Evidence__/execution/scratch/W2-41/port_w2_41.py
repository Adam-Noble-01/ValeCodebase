# =============================================================================
# W2-41 port script: Vector tools part 2, landed inert
#                    (OffsetTool, BooleanTool, the adapter VectorTools__, Panel__VectorTools, Styles__VectorTools)
# =============================================================================
#
# Takes five TrueVision files from LE/37__System__VectorTools, read at the pin b2aa9151 (extract_tv.py wrote
# them, bytes exactly as `git show` returns them, into scratch/W2-41/tv), and writes them at TrueVision's paths
# in ValeVision with ONLY these seams (S05b catalogue :440-444, "port_verbatim | header"):
#   - line 2: the banner token TRUEVISION3D -> VALEVISION3D (K2 H1)
#   - JS: TrueVision's PORT NOTE block replaced by ValeVision's (K2 H5)
#   - CSS: TrueVision's sheet has no PORT NOTE; ValeVision's is inserted as one block comment straight after the
#     boxed header (the boxed one-line-per-comment form would end the verifier's block at its first line)
#   - console prefix [TrueVision3D LayoutEditor] -> [ValeVision3D LayoutEditor] (K2 C1) - none of the five has a
#     console line at the pin; the script refuses if one appears (an unlisted seam)
# Everything else is TrueVision's text, LF, byte for byte. The script refuses to overwrite any target that
# already exists with different bytes (new files only), and checks its own output.
#
# Usage: python -B port_w2_41.py            (dry run)
#        python -B port_w2_41.py --write    (writes the five files)
# =============================================================================
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PIN = 'b2aa9151'
WP = 'W2-41'
PORTED_ON = '02-Oct-2026'
D = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/'
TOKEN = '{{VVREL:' + WP + '}}'

BANNER_TV_JS = '// TRUEVISION3D - '
BANNER_VV_JS = '// VALEVISION3D - '
BANNER_TV_CSS = '/* TRUEVISION3D - '
BANNER_VV_CSS = '/* VALEVISION3D - '

NO_CONSOLE = 'Banner reads ValeVision3D. (No console output in this file.)'

JS_MODULES = [
    # (file name, source version lines, divergence bullets)
    ('Na__LayoutEditor__VectorTools__OffsetTool__.js',
     ['1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.0.0 was v2.130.0, 21-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     [NO_CONSOLE]),
    ('Na__LayoutEditor__VectorTools__BooleanTool__.js',
     ['1.1.0 (TrueVision3D v2.151.0, 22-Sep-2026; 1.0.0 was v2.150.0, 22-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     [NO_CONSOLE]),
    ('Na__LayoutEditor__VectorTools__.js',
     ['1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026; 1.1.0 was v2.150.0, 22-Sep-2026,',
      '//                   and 1.0.0 v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     [NO_CONSOLE]),
    ('Na__LayoutEditor__Panel__VectorTools__.js',
     ['1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.0.0 was v2.130.0, 21-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     [NO_CONSOLE]),
]

CSS_NAME = 'Na__LayoutEditor__Styles__VectorTools__.css'
CSS_NOTE = [
    '/*',
    ' * PORT NOTE:',
    ' * - Ported from   : TrueVision3D ' + D + CSS_NAME,
    ' * - Source version: none of its own - the sheet carries no version or log; taken as',
    ' *                   TrueVision3D v2.150.0 left it (22-Sep-2026, commit a2e0a836; read at',
    ' *                   ' + PIN + '): created with v2.130.0 (21-Sep-2026), the Boolean section\'s',
    ' *                   rule added with v2.150.0; no later change to the pin',
    ' * - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN + ', linked only by',
    ' *                   Na__LayoutEditor__Panel__VectorTools__\'s own <link>, as in TrueVision',
    ' *                   (nothing to register in the loader list or the CSS index)',
    ' * - Parity        : verbatim (every rule and comment is TrueVision\'s; the banner and this',
    ' *                   note are the only differences)',
    ' * - Divergences   :',
    ' *   - Banner reads ValeVision3D.',
    ' * - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so',
    ' *                   the Source version line names the release that last changed it (R6 OC-07).',
    ' * - Back-port     : none.',
    ' */',
]

FORBIDDEN = ('TRUEVISION3D', 'TrueVision', '[TrueVision3D', 'TrueVision__', 'window.TrueVision',
             'NaProjectPortal', '/api/truevision', '/r2/', 'noble-architecture', 'Noble Architecture')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_tv(rel):
    data = open(os.path.join(TV, rel.replace('/', os.sep)), 'rb').read()
    if b'\r' in data:
        raise SystemExit('STOP: TV copy has CR bytes: ' + rel)
    return data.decode('utf-8')


def check_no_console(lines, rel):
    con = [i for i, l in enumerate(lines) if 'console.' in l]
    if con:
        raise SystemExit('STOP: %d console lines in %s, expected 0 (an unlisted seam?)' % (len(con), rel))


def check_identity(body, rel, author_line):
    body = body.replace(author_line, '(K2 H2 AUTHOR line)', 1)
    for bad in FORBIDDEN:
        if bad in body:
            raise SystemExit('STOP: %s left in %s' % (bad, rel))


def port_js(name, source_version, divergences):
    rel = D + name
    tv_lines = read_tv(rel).split('\n')
    lines = list(tv_lines)
    if not lines[1].startswith(BANNER_TV_JS):
        raise SystemExit('STOP: line 2 is not a TRUEVISION3D banner in ' + rel)
    lines[1] = BANNER_VV_JS + lines[1][len(BANNER_TV_JS):]
    check_no_console(lines, rel)
    start = [i for i, l in enumerate(lines) if l == '// PORT NOTE:']
    if len(start) != 1:
        raise SystemExit('STOP: expected one PORT NOTE block in ' + rel)
    s = start[0]
    e = s + 1
    while not lines[e].startswith('// ---'):
        e += 1
    if lines[e - 1] != '//':
        raise SystemExit('STOP: unexpected PORT NOTE layout in ' + rel)
    old = lines[s:e - 1]
    if len(old) != 3 or 'not yet ported' not in old[2]:
        raise SystemExit('STOP: TV PORT NOTE is not the expected "not yet ported" form in ' + rel)
    note = ['// PORT NOTE:',
            '// - Ported from   : TrueVision3D ' + rel,
            '// - Source version: ' + source_version[0]]
    note += source_version[1:]
    note += ['// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + TOKEN,
             '// - Parity        : verbatim',
             '// - Divergences   :']
    note += ['//   - ' + d for d in divergences]
    note += ['// - Back-port     : none.']
    lines[s:e - 1] = note
    out = '\n'.join(lines)
    body = out.split('// PORT NOTE:')[0] + out.split('// DEVELOPMENT LOG:')[1]
    check_identity(body, rel, '// AUTHOR     : Adam Noble - Noble Architecture')
    # Prove: header above the PORT NOTE is TV's apart from line 2; everything after the note is TV's
    if tv_lines[0] != lines[0] or tv_lines[2:s] != lines[2:s]:
        raise SystemExit('STOP: header above the PORT NOTE differs beyond the banner in ' + rel)
    if tv_lines[e - 1:] != lines[s + len(note):]:
        raise SystemExit('STOP: text after the PORT NOTE differs from TrueVision in ' + rel)
    return out


def port_css():
    rel = D + CSS_NAME
    tv_lines = read_tv(rel).split('\n')
    lines = list(tv_lines)
    if not lines[1].startswith(BANNER_TV_CSS):
        raise SystemExit('STOP: line 2 is not a TRUEVISION3D banner in ' + rel)
    lines[1] = BANNER_VV_CSS + lines[1][len(BANNER_TV_CSS):]
    if len(lines[1]) != len(tv_lines[1]):
        raise SystemExit('STOP: banner width changed in ' + rel)
    check_no_console(lines, rel)
    if any('PORT NOTE' in l for l in lines):
        raise SystemExit('STOP: TrueVision sheet already has a PORT NOTE: ' + rel)
    # The boxed header: line 1 is the top rule, and the first later line equal to it closes the box
    rule = lines[0]
    if not rule.startswith('/* =====') or not rule.endswith('*/'):
        raise SystemExit('STOP: unexpected header box in ' + rel)
    close = lines.index(rule, 3)
    if close > 40 or lines[close + 1] != '':
        raise SystemExit('STOP: unexpected header box end in ' + rel)
    lines[close + 1:close + 1] = [''] + CSS_NOTE
    out = '\n'.join(lines)
    body = out.replace('\n'.join(CSS_NOTE), '')
    check_identity(body, rel, '/* AUTHOR     : Adam Noble - Noble Architecture                      */')
    if tv_lines[0] != lines[0] or tv_lines[2:close + 1] != lines[2:close + 1]:
        raise SystemExit('STOP: header differs beyond the banner in ' + rel)
    if tv_lines[close + 1:] != lines[close + 2 + len(CSS_NOTE):]:
        raise SystemExit('STOP: rules after the PORT NOTE differ from TrueVision in ' + rel)
    return out


def main():
    write = '--write' in sys.argv
    plan = [(D + n, port_js(n, v, d)) for n, v, d in JS_MODULES]
    plan.append((D + CSS_NAME, port_css()))
    for rel, text in plan:
        data = text.encode('utf-8')
        dest = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(dest):
            have = open(dest, 'rb').read()
            if have != data:
                raise SystemExit('STOP: target exists with other bytes (a file changed under us?): ' + dest)
            print('same   ', rel)
            continue
        print(('write  ' if write else 'would  ') + rel + '  %d bytes, %d lines, sha256 %s' % (
            len(data), data.count(b'\n'), sha(data)[:16]))
        if write:
            with open(dest, 'wb') as fh:
                fh.write(data)
    if write:
        with open(os.path.join(HERE, 'sha256__written.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            for rel, text in plan:
                fh.write(sha(text.encode('utf-8')) + '  ' + rel + '\n')


if __name__ == '__main__':
    main()
