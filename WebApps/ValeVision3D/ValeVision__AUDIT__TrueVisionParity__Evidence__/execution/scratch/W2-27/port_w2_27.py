# =============================================================================
# W2-27 port script: Vector tools pure leaves (State, Setup, Config, Geometry, Offset, Boolean)
# =============================================================================
#
# Takes five TrueVision modules and one config JSON from LE/37__System__VectorTools, read at the pin
# b2aa9151 (extract_tv.py wrote them, bytes exactly as `git show` returns them, into scratch/W2-27/tv), and
# writes them at TrueVision's paths in ValeVision with ONLY these seams:
#   - modules, line 2: the banner token TRUEVISION3D -> VALEVISION3D (K2 H1)
#   - modules: TrueVision's PORT NOTE block replaced by ValeVision's (K2 H5)
#   - Setup: the one console line's prefix [TrueVision3D LayoutEditor] -> [ValeVision3D LayoutEditor] (K2 C1)
#   - the config JSON: one "Meta__PortedFrom" line after Meta__Author (the JSON form of the PORT NOTE; precedent
#     W1-16, W1-17, W1-37 - JSON has no comments)
# Everything else is TrueVision's text, LF, byte for byte. The script refuses to overwrite any target that
# already exists with different bytes (new files only), and checks its own output.
#
# Usage: python -B port_w2_27.py            (dry run)
#        python -B port_w2_27.py --write    (writes the six files)
# =============================================================================
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PIN = 'b2aa9151'
WP = 'W2-27'
PORTED_ON = '02-Oct-2026'
D = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/'
TOKEN = '{{VVREL:' + WP + '}}'

BANNER_TV = '// TRUEVISION3D - '
BANNER_VV = '// VALEVISION3D - '
PREFIX_TV = "'[TrueVision3D LayoutEditor] "
PREFIX_VV = "'[ValeVision3D LayoutEditor] "

MODULES = [
    # (file name, source version, divergence bullets, expected console lines)
    ('Na__LayoutEditor__VectorTools__State__.js',
     ['1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; 1.0.0 was v2.130.0, 21-Sep-2026;',
      '//                   read at ' + PIN + ')'],
     ['Banner reads ValeVision3D. (No console output in this file.)'], 0),
    ('Na__LayoutEditor__VectorTools__Setup__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     ['Banner and console prefix read ValeVision3D.'], 1),
    ('Na__LayoutEditor__VectorTools__Geometry__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     ['Banner reads ValeVision3D. (No console output in this file.)'], 0),
    ('Na__LayoutEditor__VectorTools__Offset__.js',
     ['1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at ' + PIN + ')'],
     ['Banner reads ValeVision3D. (No console output in this file.)'], 0),
    ('Na__LayoutEditor__VectorTools__Boolean__.js',
     ['1.0.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at ' + PIN + ')'],
     ['Banner reads ValeVision3D. (No console output in this file.)'], 0),
]

CONFIG = 'Na__LayoutEditor__VectorTools__Config__.json'
PORTED_FROM = (
    '        "Meta__PortedFrom"  : "TrueVision3D ' + D + CONFIG + ', Meta 1.1.0 (TrueVision3D v2.150.0, '
    '22-Sep-2026), as TrueVision3D v2.151.0 shipped it - the four Boolean tooltips that name their key, '
    'SayBoolTrimmed and Meta__Booleans, with no new Meta version; read at HEAD ' + PIN + '; ported ' + PORTED_ON +
    ' (parity package ' + WP + '). Every key, number, colour and word is TrueVision\'s (DR-18 (a): the vector '
    'tools with TrueVision\'s keys); nothing in it is brand. Meta__Research and the notes are TrueVision\'s record '
    'of how each behaviour was chosen.",'
)


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
    for bad in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision', 'NaProjectPortal', '/api/truevision'):
        body = out.split('// PORT NOTE:')[0] + out.split('// DEVELOPMENT LOG:')[1]
        if bad in body:
            raise SystemExit('STOP: %s left in %s' % (bad, rel))
    return out


def port_config():
    rel = D + CONFIG
    text = read_tv(rel)
    lines = text.split('\n')
    at = [i for i, l in enumerate(lines) if l.startswith('        "Meta__Author"')]
    if len(at) != 1 or 'Meta__PortedFrom' in text:
        raise SystemExit('STOP: unexpected Meta block in the config')
    lines[at[0] + 1:at[0] + 1] = [PORTED_FROM]
    out = '\n'.join(lines)
    # Parse, refuse duplicate keys, and prove only Meta__PortedFrom was added
    def no_dupes(pairs):
        keys = [k for k, v in pairs]
        if len(keys) != len(set(keys)):
            raise SystemExit('STOP: duplicate key in the config: %r' % keys)
        return dict(pairs)
    tv_obj = json.loads(text, object_pairs_hook=no_dupes)
    vv_obj = json.loads(out, object_pairs_hook=no_dupes)
    meta = vv_obj['LayoutEditor__VectorTools__Meta']
    del meta['Meta__PortedFrom']
    if vv_obj != tv_obj:
        raise SystemExit('STOP: the config differs from TrueVision beyond Meta__PortedFrom')
    return out


def main():
    write = '--write' in sys.argv
    plan = [(D + n, port_module(n, v, d, c)) for n, v, d, c in MODULES]
    plan.append((D + CONFIG, port_config()))
    for rel, text in plan:
        data = text.encode('utf-8')
        dest = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(dest):
            have = open(dest, 'rb').read()
            if have != data:
                raise SystemExit('STOP: target exists with other bytes (a file changed under us?): ' + dest)
            print('same   ', rel)
            continue
        print(('write  ' if write else 'would  ') + rel + '  %d bytes, %d lines, sha256 %s' % (len(data), data.count(b'\n'), sha(data)[:16]))
        if write:
            with open(dest, 'wb') as fh:
                fh.write(data)
    if write:
        with open(os.path.join(HERE, 'sha256__written.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            for rel, text in plan:
                fh.write(sha(text.encode('utf-8')) + '  ' + rel + '\n')


if __name__ == '__main__':
    main()
