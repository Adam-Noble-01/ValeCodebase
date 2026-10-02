# W4-04: port the five Statement Writer markdown modules from TrueVision at b2aa9151 into ValeVision.
# Starts from TV's bytes (git show, LF) and re-applies only the listed seams; every replacement is
# asserted to happen exactly the expected number of times. Refuses to overwrite a file that exists.
import os, subprocess, sys

PIN  = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP  = 'na-apps/30__TrueVision__CoreAppCode/'
REL  = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/02__Core__Markdown/'
VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
DRY  = '--dry' in sys.argv
OUT  = os.path.join(os.path.dirname(__file__), 'out') if DRY else None


def tv(rel):
    return subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout.decode('utf-8')


def sub(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit('expected %d of %r, found %d' % (count, old[:80], n))
    return text.replace(old, new)


def port_note(lines):
    return '// PORT NOTE:\n' + ''.join('// ' + l + '\n' if l else '//\n' for l in lines)


def replace_port_note(text, new_block):
    start = text.index('// PORT NOTE:\n')
    end   = text.index('//\n// ----', start)
    return text[:start] + new_block + text[end:]


def banner(text):
    return sub(text, '// TRUEVISION3D - LAYOUT EDITOR - STATEMENT MARKDOWN - ', '// VALEVISION3D - LAYOUT EDITOR - STATEMENT MARKDOWN - ')


INERT = '                  switched off, K1 DR-10; nothing outside the feature imports it)'

FILES = {}

# ---------------------------------------------------------------- TOKENISE (adapted: DR-37 item 1)
name = 'Na__LayoutEditor__Statement__Md__Tokenise__.js'
t = banner(tv(REL + name))
t = replace_port_note(t, port_note([
    '- Ported from   : TrueVision3D ' + REL + name,
    '- Source version: 1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at ' + PIN + ')',
    '- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-04}}, inert (the Statement Writer lands',
    INERT,
    '- Parity        : adapted',
    '- Divergences   :',
    '  - Banner reads ValeVision3D. (No console output in this file.)',
    '  - CRLF-tolerant (K1 DR-37 item 1, a declared ValeVision seam; module 1.0.1): Tokenise reads',
    '    each line without the CR of a CRLF line end (the private Na__LeStmtMd__WithoutCr) and cuts',
    '    every block\'s Lines from the file\'s own lines, so a CRLF statement finds its headings, rules',
    '    and tables and still joins back byte for byte. Nothing is normalised on read. Text, Body,',
    '    Html, Head, Rows and Items carry no CR; the exports are TrueVision\'s, unchanged.',
    '- Back-port     : the same fix in TrueVision (K1 DR-37 (a), package WT-03, under DR-36 with',
    '                  Adam\'s approval); once it lands there this file can be ported back byte for byte.',
]))
t = sub(t, '// DEVELOPMENT LOG:\n// 20-Sep-2026 - Version 1.0.0\n',
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.0.1 ({{VVREL:W4-04}})\n'
        '// - ValeVision3D: CRLF-tolerant (K1 DR-37 item 1, a declared ValeVision seam).\n'
        '//   The block rules read each line without the CR of a CRLF line end; every\n'
        '//   block\'s Lines keep the file\'s own bytes, so Join is still byte for byte.\n'
        '//\n'
        '// 20-Sep-2026 - Version 1.0.0\n')
helper_anchor = ('    function Na__LeStmtMd__IsBlank(line) {\n'
                 '        return typeof line !== \'string\' || line.trim() === \'\';\n'
                 '    }\n'
                 '    // ------------------------------------------------------------\n')
t = sub(t, helper_anchor, helper_anchor +
        '\n\n'
        '    // HELPER FUNCTION | A Line Without the CR of a CRLF Line End\n'
        '    // ------------------------------------------------------------\n'
        '    // VALEVISION SEAM (K1 DR-37 item 1). A statement checked out with\n'
        '    // core.autocrlf has CRLF line ends, and the block rules above end in $,\n'
        '    // which the CR left on each line defeats: the file would come back with\n'
        '    // no heading, rule or table at all. Every rule reads the line with that\n'
        '    // one CR set aside; the block\'s Lines keep it, so Join still returns the\n'
        '    // file byte for byte. Nothing is normalised on read.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__LeStmtMd__WithoutCr(line) {\n'
        '        return line.endsWith(\'\\r\') ? line.slice(0, -1) : line;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n')
t = sub(t, "        const lines  = source.split('\\n');\n",
        "        const raw    = source.split('\\n');                                      // <-- The file's own lines, a CRLF line's CR still on it: every block's Lines (DR-37 seam)\n"
        "        const lines  = raw.map(Na__LeStmtMd__WithoutCr);                        // <-- The same lines with that CR set aside: what every rule reads (DR-37 seam)\n")
t = sub(t, 'Lines : lines.slice(', 'Lines : raw.slice(', 10)
t = sub(t, 'Lines   : lines.slice(', 'Lines   : raw.slice(', 1)                  # <-- the list block's aligned field
assert 'Lines : lines' not in t and 'Lines   : lines' not in t
t = sub(t, "blocks.push({ Kind : 'blank', Lines : [ '' ] });", "blocks.push({ Kind : 'blank', Lines : [ raw[index] ] });")
FILES[name] = t

# ---------------------------------------------------------------- the four verbatim files
VERBATIM = {
    'Na__LayoutEditor__Statement__Md__Inline__.js'   : ('1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at ' + PIN + ')', 'Banner reads ValeVision3D. (No console output in this file.)'),
    'Na__LayoutEditor__Statement__Md__Serialise__.js': ('1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at ' + PIN + ')', 'Banner reads ValeVision3D. (No console output in this file.)'),
    'Na__LayoutEditor__Statement__Md__Render__.js'   : ('1.2.0 (TrueVision3D v2.165.0, 29-Sep-2026; 1.1.0 v2.162.0, 1.0.0 v2.95.0; read at ' + PIN + ')',
                                                        'Banner reads ValeVision3D; the console prefix is [ValeVision3D Statement] (K2 C1).'),
    'Na__LayoutEditor__Statement__Md__Figure__.js'   : ('1.0.0 (TrueVision3D v2.165.0, 29-Sep-2026; read at ' + PIN + ')', 'Banner reads ValeVision3D. (No console output in this file.)'),
}
for name, (source, divergence) in VERBATIM.items():
    t = banner(tv(REL + name))
    t = replace_port_note(t, port_note([
        '- Ported from   : TrueVision3D ' + REL + name,
        '- Source version: ' + source,
        '- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-04}}, inert (the Statement Writer lands',
        INERT,
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - ' + divergence,
        '- Back-port     : none.',
    ]))
    if name.endswith('Render__.js'):
        t = sub(t, "console.warn('[TrueVision3D Statement] ", "console.warn('[ValeVision3D Statement] ")
    FILES[name] = t

for name, text in FILES.items():
    assert '\r' not in text
    assert 'TRUEVISION3D' not in text and '[TrueVision3D' not in text, name
    target = (os.path.join(OUT, name) if DRY else VV + REL + name)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if not DRY and os.path.exists(target):
        raise SystemExit('refusing to overwrite ' + target)
    with open(target, 'wb') as fh:
        fh.write(text.encode('utf-8'))
    print('wrote', target, len(text.encode('utf-8')))
