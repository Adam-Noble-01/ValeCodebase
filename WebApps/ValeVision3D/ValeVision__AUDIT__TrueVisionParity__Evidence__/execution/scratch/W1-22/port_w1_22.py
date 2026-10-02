# -*- coding: utf-8 -*-
# W1-22 scratch: build, stage, verify and land the package's files.
#
#   python -B port_w1_22.py --stage     build every file into scratch/W1-22/stage/<app-relative path>
#   python -B port_w1_22.py --verify    check the staged (or, with --live, the landed) files: each whole-file
#                                       port minus its seams is TrueVision's text byte for byte; each edited
#                                       file is its pre-image plus exactly the listed edits
#   python -B port_w1_22.py --write     land the staged files, after checking that every live file still has
#                                       its pre-image bytes (preimage/manifest.json); refuses otherwise
#
# Whole-file ports write TrueVision's text as git show returns it (LF). Edited files keep their own line
# endings (AppConfig and SheetSetup LF, the test page CRLF). Nothing outside the package's edits list is
# written. TrueVision is read only from tv/ (extract_tv.py, at the pin b2aa9151).

import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV = os.path.join(HERE, 'tv')
STAGE = os.path.join(HERE, 'stage')
PRE = os.path.join(HERE, 'preimage')
SRC_TEMPLATES = os.path.join(HERE, 'stage_src')
LE = '02__Src__AppModules/51__System__LayoutEditor/'
RULE = '// -----------------------------------------------------------------------------'

P = {
    'cells':    LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js',
    'classic':  LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js',
    'surfaces': LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    'scale':    LE + '07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js',
    'layout':   LE + '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js',
    'filename': LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js',
    'config':   LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    'setup':    LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    'test':     '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs',
    'page':     '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
}


def rd(base, rel):
    return open(os.path.join(base, rel.replace('/', os.sep)), 'rb').read()


def tv_text(rel):
    return rd(TV, rel).decode('utf-8')


def pre_bytes(rel):
    return rd(PRE, rel)


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit('%s: expected exactly one match, found %d: %r' % (label, n, old[:100]))
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# PORT NOTES (K2 H5 / F.1 P10). TrueVision's text is everything else.
# -----------------------------------------------------------------------------

NOTE = {}

NOTE['cells'] = '\n'.join([
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js',
    '// - Source version: 1.2.0 (TrueVision3D v2.109.0, 21-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - whole. This app\'s copy was its 1.0.0',
    '//                   (20-Sep-2026, ValeVision3D v2.66.0): TrueVision\'s 1.1.0 code, without Widen.',
    '//                   Widen is exported for TitleBlock__Modern__ 1.5.0, which takes it when it lands.',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
])

NOTE['scale'] = '\n'.join([
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js',
    '// - Source version: 1.0.0 (TrueVision3D v2.40.0, 14-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - the header brought level with',
    '//                   TrueVision\'s; the code was already its own, ported 14-Sep-2026 for ValeVision3D',
    '//                   v2.35.0.',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
])

NOTE['layout'] = '\n'.join([
    '// PORT NOTE:',
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer\'s',
    '//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfLayout__.js);',
    '//                   TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and grew it to 1.2.0, which',
    '//                   this app took on 15-Sep-2026 (ValeVision3D v2.44.0); since ported back whole from',
    '//                   TrueVision3D 1.2.0 (HEAD b2aa9151)',
    '// - Source version: 1.2.0 (TrueVision3D v2.36.0, 14-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - the header brought level with',
    '//                   TrueVision\'s; the code was already its own.',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
])

NOTE['classic'] = '\n'.join([
    '// PORT NOTE:',
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5: the title block scan of',
    '//                   35__System__PageLayoutSystem as a locked layer); TrueVision3D took it whole on',
    '//                   10-Sep-2026 (its v2.21.0); since ported back whole from TrueVision3D 1.0.0 (HEAD b2aa9151)',
    '// - Source version: 1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - the header brought level with',
    '//                   TrueVision\'s; the code was already identical. The scan it paints is Vale\'s own,',
    '//                   from this app\'s asset root (TitleBlock ClassicScanAssets), never TrueVision\'s',
    '//                   placeholder.',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
])

NOTE['filename'] = '\n'.join([
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js',
    '// - Source version: 1.0.0 (TrueVision3D v2.63.0, 17-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - the header brought level with',
    '//                   TrueVision\'s; the code was already its own, ported 17-Sep-2026 for ValeVision3D',
    '//                   v2.55.0.',
    '// - Parity        : verbatim. As in TrueVision it looks nothing up: each caller hands it the code and',
    '//                   the project code its document prints (the sheet exporter, the specification).',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
])

NOTE['surfaces'] = '\n'.join([
    ' * PORT NOTE:',
    ' * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    ' * - Source version: none of its own - the sheet as TrueVision3D v2.72.0 wrote it (19-Sep-2026; read at',
    ' *                   b2aa9151)',
    ' * - Legacy        : a stylesheet carries no module version, so the Source version names the release',
    ' *                   that wrote it.',
    ' * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-22}} - whole. The tokens were already',
    ' *                   TrueVision\'s (ported 19-Sep-2026 for ValeVision3D v2.60.0); the header now is too.',
    ' * - Parity        : verbatim',
    ' * - Divergences   :',
    ' *   - Banner reads ValeVision3D.',
    ' *   - Loads first in the loader\'s Na__LeLoad__STYLESHEETS, not from the CSS index (the LOADS line',
    ' *     above is TrueVision\'s): this app links its editor stylesheets when the editor opens (DR-24).',
    ' * - Back-port     : none.',
])


# -----------------------------------------------------------------------------
# WHOLE-FILE PORTS
# -----------------------------------------------------------------------------

def js_banner(text, label):
    lines = text.split('\n')
    if not lines[1].startswith('// TRUEVISION3D - '):
        raise SystemExit(label + ': line 2 is not the TrueVision banner')
    lines[1] = '// VALEVISION3D - ' + lines[1][len('// TRUEVISION3D - '):]
    return '\n'.join(lines)


def replace_js_note(text, note, label):
    start = text.index('// PORT NOTE:\n')
    if text.count('// PORT NOTE:') != 1:
        raise SystemExit(label + ': more than one PORT NOTE')
    end = text.index('\n//\n' + RULE + '\n', start)
    return text[:start] + note + text[end:]


def insert_js_note(text, note, label):
    if 'PORT NOTE' in text:
        raise SystemExit(label + ': already has a PORT NOTE')
    anchor = RULE + '\n//\n// DEVELOPMENT LOG:\n'
    return once(text, anchor, RULE + '\n//\n' + note + '\n//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n', label)


def build_js(key, mode):
    text = js_banner(tv_text(P[key]), key)
    text = (insert_js_note if mode == 'insert' else replace_js_note)(text, NOTE[key], key)
    return text.encode('utf-8')


def build_css():
    text = tv_text(P['surfaces'])
    text = once(text, '/* REGION  |  TrueVision3D - Layout Editor Styles (shared surfaces)  */',
                '/* REGION  |  ValeVision3D - Layout Editor Styles (shared surfaces)  */', 'surfaces banner')
    start = text.index(' * PORT NOTE:\n')
    end = text.index(' */\n', start)
    text = text[:start] + NOTE['surfaces'] + '\n' + text[end:]
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# THE CONFIG (LF): flip W0-15's withheld title block and scale values to TrueVision's, with Vale wording in
# the two notes that name a client or this app's geometry; the VV-only DrawingNumber anchor retired.
# -----------------------------------------------------------------------------

def config_line(text, key):
    found = [line for line in text.split('\n') if line.lstrip().startswith('"' + key + '"')]
    if len(found) != 1:
        raise SystemExit('config: %d lines for %s' % (len(found), key))
    return found[0]


def json_value(s):
    return json.dumps(s, ensure_ascii=False)


ROWS_NOTE_TV_TO_VV = [
    ("on A2 the Client cell was 76 mm for 'Mr P. Samra' and the Document ID",
     "on A2 the Client cell was 76 mm for a surname and the Document ID"),
    ("Site Address 70 holds '255 Musters Road, West Bridgford, Nottinghamshire, NG2 7DD' (67.0)",
     "Site Address 70 holds a 58 character postal address, house number to postcode (67.0)"),
    ("On A3 landscape that leaves the title 98 mm, enough for",
     "On A3 landscape, beside this app's 34 mm logo cell, that leaves the title 104 mm, enough for"),
]

DOCUMENT_ID_NOTE_VV_TAIL = (" In this app a code is {project}_{drawing} until Vale's own stage list is supplied"
                            " (DrawingRegister DocumentCodeFormat), and a project's own code is four or five digits,"
                            " so the widest, 99999_D100, measures 15.4 - 15.3 in the Helvetica this app prints in"
                            " until the PDF embeds Open Sans - about the width of the cell's own label,"
                            " DOCUMENT ID (14.4).")


def build_config():
    raw = pre_bytes(P['config'])
    if b'\r\n' in raw:
        raise SystemExit('config: expected LF')
    text = raw.decode('utf-8')
    tv = tv_text(P['config'])

    # 1. DocumentIdNote: this app's identity wording (W0-15) plus the Vale measure (W0-15 follow-up 4)
    line = config_line(text, 'LayoutEditor__TitleBlock__DocumentIdNote')
    head, value = line.split(': ', 1)
    old_value = json.loads(value.rstrip(','))
    if not old_value.endswith('See the DrawingNumberingSchema NOTES in TrueVision3D.'):
        raise SystemExit('config: DocumentIdNote is not the W0-15 wording')
    text = once(text, line, head + ': ' + json_value(old_value + DOCUMENT_ID_NOTE_VV_TAIL) + ',', 'DocumentIdNote')

    # 2. RowsNote: TrueVision's, less a client's name and postal address, with this app's A3 title width
    line = config_line(text, 'LayoutEditor__TitleBlock__RowsNote')
    head = line.split(': ', 1)[0]
    tv_note = json.loads(config_line(tv, 'LayoutEditor__TitleBlock__RowsNote').split(': ', 1)[1].rstrip(','))
    for old, new in ROWS_NOTE_TV_TO_VV:
        tv_note = once(tv_note, old, new, 'RowsNote')
    text = once(text, line, head + ': ' + json_value(tv_note) + ',', 'RowsNote')

    # 3. Rows: TrueVision's eleven lines verbatim (DocumentId "Document ID", the Rev cell's ValuePrefix)
    def rows_block(t):
        start = t.index('        "LayoutEditor__TitleBlock__Rows": [\n')
        end = t.index('        ],\n', start) + len('        ],\n')
        return t[start:end]
    text = once(text, rows_block(text), rows_block(tv), 'Rows')

    # 4. Classic anchors: the VV-only DrawingNumber anchor goes (TrueVision's DocumentId anchor stays)
    text = once(text, '                "DrawingNumber": { "X": 330, "Y": 289, "FontMm": 2.4, "Align": "left" },\n', '', 'anchor')

    # 5. Scales: TrueVision's list (1:200, DR-17) and its description
    for key in ('LayoutEditor__Scales__Description', 'LayoutEditor__Scales__AvailableScaleDenominators'):
        text = once(text, config_line(text, key) + '\n', config_line(tv, key) + '\n', key)

    json.loads(text)
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# SHEET SETUP (LF): the rows and scales fallbacks become TrueVision's lines; the PORT NOTE follows.
# -----------------------------------------------------------------------------

def build_setup():
    raw = pre_bytes(P['setup'])
    if b'\r\n' in raw:
        raise SystemExit('setup: expected LF')
    text = raw.decode('utf-8')
    tv = tv_text(P['setup'])

    def rows_lines(t, first):
        lines = t.split('\n')
        at = [i for i, l in enumerate(lines) if l.lstrip().startswith(first)]
        if len(at) != 1:
            raise SystemExit('setup: rows line %r found %d times' % (first, len(at)))
        return '\n'.join(lines[at[0]:at[0] + 2]) + '\n'

    text = once(text, rows_lines(text, "{ Key : 'Title', Label : 'Drawing Title'"), rows_lines(tv, "{ Key : 'Title', Label : 'Drawing Title'"), 'setup rows')
    text = once(text, '        scales     : [ 20, 50, 100 ],\n', '        scales     : [ 20, 50, 100, 200 ],\n', 'setup scales')
    if '        scales     : [ 20, 50, 100, 200 ],\n' not in tv:
        raise SystemExit('setup: TrueVision scales line differs')

    text = once(text,
                '// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1\n',
                '// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the title block rows (the Document ID row\n'
                '//                   and the Rev cell\'s prefix) and the 1:200 scale came level with TrueVision on\n'
                '//                   02-Oct-2026 for ValeVision3D {{VVREL:W1-22}}\n', 'setup ported on')
    text = once(text,
                '//   - As the shipped config does until each is switched on: the title block rows keep DrawingNumber\n'
                '//     ("Drawing No.", no Revision prefix) until the Document ID, the scales stop at 1:100 until 1:200,\n'
                '//     and the style font keeps Helvetica first until the PDF embeds Open Sans.\n',
                '//   - As the shipped config does until it is switched on: the style font keeps Helvetica first until\n'
                '//     the PDF embeds Open Sans.\n', 'setup divergence')
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# THE TESTS: the .mjs from its template (LF, TrueVision's test adapted); the page edited in place (CRLF).
# -----------------------------------------------------------------------------

def build_test():
    data = open(os.path.join(SRC_TEMPLATES, 'Na__Test__TitleBlockCells__.test.mjs'), 'rb').read()
    if b'\r' in data:
        raise SystemExit('test template: expected LF')
    return data


def build_page():
    raw = pre_bytes(P['page'])
    if raw.count(b'\r\n') != raw.count(b'\n'):
        raise SystemExit('page: expected CRLF throughout')
    text = raw.decode('utf-8')
    nl = '\r\n'
    text = once(text,
                "     Ported from TrueVision3D's page of the same name, 20-Sep-2026." + nl,
                "     Ported from TrueVision3D's page of the same name, 20-Sep-2026; the number cell is the" + nl +
                "     Document ID since 02-Oct-2026 (57079_D02 ..., the {project}_{drawing} code this app" + nl +
                "     composes until Vale's own stages are supplied), with a sheet at 1:100 and 1:200." + nl,
                'page header')
    text = once(text,
                "        Sheet__Fields__DrawingNumber : '57079-' + String(order).padStart(2, '0')," + nl,
                "        Sheet__Fields__DocumentId    : '57079_D' + String(order).padStart(2, '0')," + nl,
                'page fixture')
    text = once(text,
                "    [ 'A4 portrait, where nothing fits',       sheet(9, 'A4', 'portrait',  [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ]" + nl,
                "    [ 'A4 portrait, where nothing fits',       sheet(9, 'A4', 'portrait',  [ 50 ], { Sheet__Fields__Title : LONG_TITLE }) ]," + nl +
                "    [ 'A2 at 1:100 and 1:200',                 sheet(10, 'A2', 'landscape', [ 100, 200 ]) ]" + nl,
                'page cases')
    return text.encode('utf-8')


BUILDERS = {
    'cells':    lambda: build_js('cells', 'replace'),
    'classic':  lambda: build_js('classic', 'replace'),
    'layout':   lambda: build_js('layout', 'replace'),
    'filename': lambda: build_js('filename', 'replace'),
    'scale':    lambda: build_js('scale', 'insert'),
    'surfaces': build_css,
    'config':   build_config,
    'setup':    build_setup,
    'test':     build_test,
    'page':     build_page,
}


def stage():
    for key, build in BUILDERS.items():
        data = build()
        dest = os.path.join(STAGE, P[key].replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, 'wb').write(data)
        print('STAGED %-9s %7d B  crlf=%-4d sha1 %s  %s' % (key, len(data), data.count(b'\r\n'), hashlib.sha1(data).hexdigest()[:8], P[key]))
    return 0


# -----------------------------------------------------------------------------
# VERIFY: strip the seams back out and compare with TrueVision (whole ports) or the pre-image (edits).
# -----------------------------------------------------------------------------

def unport_js(text, key, mode):
    lines = text.split('\n')
    assert lines[1].startswith('// VALEVISION3D - '), key
    lines[1] = '// TRUEVISION3D - ' + lines[1][len('// VALEVISION3D - '):]
    text = '\n'.join(lines)
    tv = tv_text(P[key])
    if mode == 'insert':
        text = once(text, NOTE[key] + '\n//\n' + RULE + '\n//\n', '', key + ' unport')
        return text
    s_tv = tv.index('// PORT NOTE:\n')
    e_tv = tv.index('\n//\n' + RULE + '\n', s_tv)
    return once(text, NOTE[key], tv[s_tv:e_tv], key + ' unport')


def verify(base):
    problems = 0
    for key, mode in (('cells', 'replace'), ('classic', 'replace'), ('layout', 'replace'), ('filename', 'replace'), ('scale', 'insert')):
        got = rd(base, P[key]).decode('utf-8')
        same = unport_js(got, key, mode) == tv_text(P[key])
        problems += 0 if same else 1
        print(('OK   ' if same else 'FAIL ') + key + ': minus its banner and PORT NOTE it is TrueVision\'s file byte for byte')
    css = rd(base, P['surfaces']).decode('utf-8')
    css = css.replace('ValeVision3D - Layout Editor Styles (shared surfaces)', 'TrueVision3D - Layout Editor Styles (shared surfaces)', 1)
    tvcss = tv_text(P['surfaces'])
    s = tvcss.index(' * PORT NOTE:\n'); e = tvcss.index(' */\n', s)
    css = once(css, NOTE['surfaces'] + '\n', tvcss[s:e], 'surfaces unport')
    same = css == tvcss
    problems += 0 if same else 1
    print(('OK   ' if same else 'FAIL ') + 'surfaces: minus its banner and PORT NOTE it is TrueVision\'s sheet byte for byte')
    for key, build in (('config', build_config), ('setup', build_setup), ('page', build_page), ('test', build_test)):
        same = rd(base, P[key]) == build()
        problems += 0 if same else 1
        print(('OK   ' if same else 'FAIL ') + key + ': equals its pre-image plus exactly the listed edits')
    print('\n%d problem(s)' % problems)
    return 1 if problems else 0


def write():
    man = json.load(open(os.path.join(PRE, 'manifest.json'), encoding='utf-8'))
    bad = []
    for key, rel in P.items():
        live = os.path.join(VV, rel.replace('/', os.sep))
        rec = man.get(rel)
        if rec is None:
            if os.path.exists(live):
                bad.append(rel + ' (exists, recorded absent)')
            continue
        if hashlib.sha1(open(live, 'rb').read()).hexdigest() != rec['sha1']:
            bad.append(rel + ' (changed since the pre-image)')
    if bad:
        print('REFUSED - live files changed under this package:\n  ' + '\n  '.join(bad))
        return 1
    for key, rel in P.items():
        src = os.path.join(STAGE, rel.replace('/', os.sep))
        dst = os.path.join(VV, rel.replace('/', os.sep))
        shutil.copyfile(src, dst)
        data = open(dst, 'rb').read()
        print('WROTE %-9s %7d B  crlf=%-4d sha1 %s  sha256 %s  %s' % (key, len(data), data.count(b'\r\n'), hashlib.sha1(data).hexdigest()[:8], hashlib.sha256(data).hexdigest()[:12], rel))
    return 0


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    if arg == '--stage':
        sys.exit(stage())
    if arg == '--verify':
        sys.exit(verify(VV if '--live' in sys.argv else STAGE))
    if arg == '--write':
        sys.exit(write())
    raise SystemExit('unknown option ' + arg)
