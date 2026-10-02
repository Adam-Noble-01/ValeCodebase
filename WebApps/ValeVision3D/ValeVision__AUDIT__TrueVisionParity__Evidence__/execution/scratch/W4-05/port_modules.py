# W4-05: port five Statement Writer modules from TrueVision at b2aa9151 into ValeVision (inert).
# Starts from TV's bytes (git show, LF) and re-applies only the listed seams; every replacement is
# asserted to happen exactly the expected number of times. Refuses to overwrite a file that exists.
#   python port_modules.py --dry   writes to scratch/W4-05/out/ only
#   python port_modules.py         writes the five VV files (new files only)
import os, subprocess, sys

PIN  = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP  = 'na-apps/30__TrueVision__CoreAppCode/'
BASE = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/'
VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
DRY  = '--dry' in sys.argv
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')


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
    assert text.count('// PORT NOTE:\n') == 1
    return text[:start] + new_block + text[end:]


def banner(text, part):
    return sub(text, '// TRUEVISION3D - LAYOUT EDITOR - ' + part, '// VALEVISION3D - LAYOUT EDITOR - ' + part)


INERT = '                  switched off, K1 DR-10; nothing outside the feature imports it)'

# rel path, banner part, source version, parity, divergences
SPECS = [
    ('01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js', 'STATEMENT DATA - INDEX',
     '1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at ' + PIN + ')', 'adapted',
     ['Banner reads ValeVision3D. (No console output in this file.)',
      'Na__LeStmtIdx__DESCRIPTION, the text written into every new statement index',
      '  (ValeVision__StatementDocs__.json), names the running app: "ValeVision Statement',
      '  Writer" (K1 DR-10: only people and company names change; the field names stay).']),
    ('01__Core__Data/Na__LayoutEditor__Statement__Images__.js', 'STATEMENT IMAGES',
     '1.2.0 (TrueVision3D v2.172.0, 29-Sep-2026; 1.1.0 v2.171.0, 1.0.0 v2.95.0; read at ' + PIN + ')', 'verbatim',
     ['Banner reads ValeVision3D. (No console output in this file.)']),
    ('04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Move__.js', 'STATEMENT EDITOR - MOVING A SECTION',
     '1.1.0 (TrueVision3D v2.162.0, 29-Sep-2026; read at ' + PIN + ')', 'verbatim',
     ['Banner reads ValeVision3D. (No console output in this file.)']),
    ('04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Typing__.js', 'STATEMENT EDITOR - TYPING',
     '1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at ' + PIN + ')', 'verbatim',
     ['Banner reads ValeVision3D. (No console output in this file.)']),
    ('07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js', 'STATEMENT PUBLISH - THE PUBLISHED PAGE',
     '1.0.0 (TrueVision3D v2.170.0, 29-Sep-2026; read at ' + PIN + ')', 'adapted',
     ['Banner reads ValeVision3D. (No console output in this file.)',
      'The page\'s generator meta names Vale Garden Houses and the ValeVision Statement',
      '  Writer (K1 DR-10 / DR-43: no NA name reaches a published Vale page).']),
]

BACKPORT_ADAPTED = [
    '- Back-port     : the brand string into config in TrueVision (K1 DR-42 item 6, under DR-36',
    '                  with Adam\'s approval); once it is there this file can be ported back byte for byte.',
]

FILES = {}
for rel, part, source, parity, divergences in SPECS:
    name = os.path.basename(rel)
    t = banner(tv(BASE + rel), part)
    t = replace_port_note(t, port_note([
        '- Ported from   : TrueVision3D ' + BASE + rel,
        '- Source version: ' + source,
        '- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-05}}, inert (the Statement Writer lands',
        INERT,
        '- Parity        : ' + parity,
        '- Divergences   :',
    ] + ['  ' + ('- ' if not d.startswith('  ') else '') + d for d in divergences] + [
    ] + (BACKPORT_ADAPTED if parity == 'adapted' else ['- Back-port     : none.'])))
    if name == 'Na__LayoutEditor__Statement__Data__Index__.js':
        t = sub(t, "Na__LeStmtIdx__DESCRIPTION  = 'TrueVision Statement Writer - the project",
                   "Na__LeStmtIdx__DESCRIPTION  = 'ValeVision Statement Writer - the project")
    if name == 'Na__LayoutEditor__Statement__Publish__Page__.js':
        t = sub(t, '<meta name="generator" content="Noble Architecture - TrueVision Statement Writer">',
                   '<meta name="generator" content="Vale Garden Houses - ValeVision Statement Writer">')
    FILES[rel] = t

for rel, text in FILES.items():
    assert '\r' not in text
    assert 'TRUEVISION3D' not in text and '[TrueVision3D' not in text, rel
    target = os.path.join(OUT, os.path.basename(rel)) if DRY else VV + BASE + rel
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if not DRY and os.path.exists(target):
        raise SystemExit('refusing to overwrite ' + target)
    with open(target, 'wb') as fh:
        fh.write(text.encode('utf-8'))
    print('wrote', target, len(text.encode('utf-8')))
