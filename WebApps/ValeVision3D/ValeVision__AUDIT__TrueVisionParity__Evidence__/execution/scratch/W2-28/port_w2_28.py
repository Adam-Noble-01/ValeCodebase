# =============================================================================
# W2-28 port script: Vector tools interactive units, part 1, landed inert
#                    (Preview, Targets, CircleTool, ArcTool, TrimTool, JoinTool)
# =============================================================================
#
# Takes six TrueVision modules from LE/37__System__VectorTools, read at the pin b2aa9151 (extract_tv.py wrote
# them, bytes exactly as `git show` returns them, into scratch/W2-28/tv), and writes them at TrueVision's paths
# in ValeVision with ONLY these seams (S05b catalogue :434-439, "port_verbatim | header"):
#   - line 2: the banner token TRUEVISION3D -> VALEVISION3D (K2 H1)
#   - TrueVision's PORT NOTE block replaced by ValeVision's (K2 H5)
#   - console prefix [TrueVision3D LayoutEditor] -> [ValeVision3D LayoutEditor] (K2 C1) - none of the six has
#     a console line at the pin; the script refuses if one appears (an unlisted seam)
# Everything else is TrueVision's text, LF, byte for byte. The script refuses to overwrite any target that
# already exists with different bytes (new files only), and checks its own output.
#
# Usage: python -B port_w2_28.py            (dry run)
#        python -B port_w2_28.py --write    (writes the six files)
# =============================================================================
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PIN = 'b2aa9151'
WP = 'W2-28'
PORTED_ON = '02-Oct-2026'
D = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/'
TOKEN = '{{VVREL:' + WP + '}}'

BANNER_TV = '// TRUEVISION3D - '
BANNER_VV = '// VALEVISION3D - '
PREFIX_TV = "'[TrueVision3D LayoutEditor] "
PREFIX_VV = "'[ValeVision3D LayoutEditor] "

NO_CONSOLE = 'Banner reads ValeVision3D. (No console output in this file.)'

MODULES = [
    # (file name, source version lines, divergence bullets, expected console lines)
    ('Na__LayoutEditor__VectorTools__Preview__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
    ('Na__LayoutEditor__VectorTools__Targets__.js',
     ['1.2.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.1.0 was v2.138.0 and',
      '//                   1.0.0 was v2.130.0, both 21-Sep-2026; read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
    ('Na__LayoutEditor__VectorTools__CircleTool__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
    ('Na__LayoutEditor__VectorTools__ArcTool__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
    ('Na__LayoutEditor__VectorTools__TrimTool__.js',
     ['1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.0.0 was v2.130.0, 21-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
    ('Na__LayoutEditor__VectorTools__JoinTool__.js',
     ['1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.0.0 was v2.130.0, 21-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     [NO_CONSOLE], 0),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_tv(rel):
    data = open(os.path.join(TV, rel.replace('/', os.sep)), 'rb').read()
    if b'\r' in data:
        raise SystemExit('STOP: TV copy has CR bytes: ' + rel)
    return data.decode('utf-8')


def port_module(name, source_version, divergences, consoles):
    rel = D + name
    lines = read_tv(rel).split('\n')
    if not lines[1].startswith(BANNER_TV):
        raise SystemExit('STOP: line 2 is not a TRUEVISION3D banner in ' + rel)
    lines[1] = BANNER_VV + lines[1][len(BANNER_TV):]
    con = [i for i, l in enumerate(lines) if 'console.' in l]
    if len(con) != consoles:
        raise SystemExit('STOP: %d console lines in %s, expected %d (an unlisted seam?)' % (len(con), rel, consoles))
    for i in con:
        if lines[i].count(PREFIX_TV) != 1:
            raise SystemExit('STOP: console line %d of %s does not carry the expected prefix' % (i + 1, rel))
        lines[i] = lines[i].replace(PREFIX_TV, PREFIX_VV)
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
    # The AUTHOR line is TrueVision's verbatim (K2 H2), as in every shared module: the only allowed NA words
    body = body.replace('// AUTHOR     : Adam Noble - Noble Architecture', '// AUTHOR     : (K2 H2)', 1)
    for bad in ('TRUEVISION3D', 'TrueVision', '[TrueVision3D', 'TrueVision__', 'window.TrueVision',
                'NaProjectPortal', '/api/truevision', '/r2/', 'noble-architecture', 'Noble Architecture'):
        if bad in body:
            raise SystemExit('STOP: %s left in %s' % (bad, rel))
    # Prove the only change outside the header block is nothing at all (no console lines to change)
    tv_lines = read_tv(rel).split('\n')
    tv_body = tv_lines[e:]
    vv_body = lines[s + len(note) + 1:]
    if consoles == 0 and tv_body != vv_body:
        raise SystemExit('STOP: body differs from TrueVision after the PORT NOTE in ' + rel)
    if tv_lines[2:s] != lines[2:s] or tv_lines[0] != lines[0]:
        raise SystemExit('STOP: header above the PORT NOTE differs beyond the banner in ' + rel)
    return out


def main():
    write = '--write' in sys.argv
    plan = [(D + n, port_module(n, v, d, c)) for n, v, d, c in MODULES]
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
