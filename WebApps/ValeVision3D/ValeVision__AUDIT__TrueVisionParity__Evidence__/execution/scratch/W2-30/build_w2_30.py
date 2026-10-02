# W2-30 build: TrueVision's files at the pin, whole, with only the listed ValeVision seams.
# Writes candidates under scratch/W2-30/candidate/<app-relative path>. Never touches the live tree.
import hashlib
import os
import re
import subprocess
import sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'candidate')
LE = '02__Src__AppModules/51__System__LayoutEditor/'
SPEC = LE + '50__Feature__Specification/'
VVREL = '{{VVREL:W2-30}}'

RULE = '// -----------------------------------------------------------------------------'


def tv_text(rel):
    raw = subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout
    assert b'\r\n' not in raw, rel + ' is not LF at the pin'
    return raw.decode('utf-8')


def port_note(lines):
    return '\n'.join(['// PORT NOTE:'] + ['// ' + l if l else '//' for l in lines]) + '\n//\n'


def swap_port_note(text, note):
    start = text.index('\n// PORT NOTE:\n') + 1
    end = text.index('\n' + RULE + '\n', start) + 1
    return text[:start] + note + text[end:]


def split_log(text):
    """(before the log, the log, after the log): the log runs from '// DEVELOPMENT LOG:' to the closing '// ====' rule."""
    a = text.index('\n// DEVELOPMENT LOG:\n') + 1
    b = text.index('\n// =============================================================================\n', a) + 1
    return text[:a], text[a:b], text[b:]


def replace_counted(text, old, new, count, where):
    found = text.count(old)
    assert found == count, f'{where}: expected {count} x {old!r}, found {found}'
    return text.replace(old, new)


def build(rel, note_lines, seams):
    """seams: list of (old, new, count) applied outside the DEVELOPMENT LOG only."""
    text = tv_text(rel)
    text = replace_counted(text, '\n// TRUEVISION3D - ', '\n// VALEVISION3D - ', 1, rel + ' banner')
    text = swap_port_note(text, port_note(note_lines))
    head, log, tail = split_log(text)
    body = head + '\x00LOG\x00' + tail
    for old, new, count in seams:
        body = replace_counted(body, old, new, count, rel)
    text = body.replace('\x00LOG\x00', log)
    # Identity gate outside the PORT NOTE and the DEVELOPMENT LOG (G4's rule)
    pn_a = text.index('\n// PORT NOTE:\n')
    pn_b = text.index('\n' + RULE + '\n', pn_a + 1)
    head2, log2, tail2 = split_log(text)
    scan = (text[:pn_a] + text[pn_b:]).replace(log2, '')
    for bad in ('TrueVision__', '[TrueVision3D', 'TRUEVISION3D', 'NaProjectPortal', 'na-project-portal', '30__TrueVision__AppContent', 'na-truevision-api', '/r2/'):
        assert bad not in scan, f'{rel}: identity marker {bad!r} left outside the PORT NOTE / log'
    path = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(text.encode('utf-8'))
    print(f'{rel}: {text.count(chr(10))} lines, sha1 {hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]}')
    return text


CONSOLE = ('[TrueVision3D]', '[ValeVision3D]')
NOTES_FILE = ('TrueVision__DrawingNotes__.json', 'ValeVision__DrawingNotes__.json')
DATA_FILE = ('TrueVision__ProjectData__.json', 'project.json')
PORTED_ON = '02-Oct-2026 for ValeVision3D ' + VVREL

FILES = []

# 1. The Statement Writer's pure lockstep rules (new at TrueVision's path)
FILES.append((LE + '52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js',
    '- Source version: 1.0.0 (TrueVision3D v2.157.0, 23-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole, new, at TrueVision\'s path, ahead',
    '                  of the Statement Writer itself (DR-10: that lands later, switched off). The',
    '                  specification\'s lockstep (Na__LayoutEditor__SpecData__Lockstep__) takes its verdict',
    '                  from here now; the Statement__Data__ and Statement__Page__ importers named under',
    '                  INTEGRATION arrive with the Statement Writer (W4).',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner reads ValeVision3D. (No console output in this file.)',
    '- Back-port     : none.',
], []))

# 2. State 1.2.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__State__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__State__.js',
    '- Source version: 1.2.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.0.0',
    '                  (the split of Na__LayoutEditor__SpecData__.js, 15-Sep-2026, ValeVision3D v2.47.0),',
    '                  the split TrueVision\'s unit was made from; 1.1.0 (LOCATE_EVENT, TrueVision3D',
    '                  v2.144.0) and 1.2.0 (the lockstep\'s state) come across together.',
    '- Parity        : adapted',
    '- Divergences   :',
    '  - Banner reads ValeVision3D.',
    '  - DESCRIPTION, the sentence written into every specification file, names "the ValeVision drawings".',
    '- Back-port     : none.',
], [
    ("'Project specification notes for the TrueVision drawings.", "'Project specification notes for the ValeVision drawings.", 1),
]))

# 3. Document 1.1.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__Document__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js',
    '- Source version: 1.1.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.0.0',
    '                  (the v2.47.0 split), whose GetState left Na__CfApi__IsConfigured out of canSync;',
    '                  TrueVision\'s check now resolves to this app\'s transport facade (W0-12).',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner reads ValeVision3D. (No console output in this file.)',
    '  - Na__CfApi__IsConfigured is the ValeVision facade\'s (80__CloudflareIntegration, W0-12): true on',
    '    localhost with the editor Worker config and a master-index project folder, so canSync is off on',
    '    the live site, where no write can go anyway.',
    '- Back-port     : none.',
], []))

# 4. Draft 1.1.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__Draft__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Draft__.js',
    '- Source version: 1.1.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.0.0',
    '                  (the v2.47.0 split).',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner and console prefix read ValeVision3D.',
    '- Back-port     : none.',
], [CONSOLE + (1,)]))

# 5. Editing 1.1.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__Editing__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Editing__.js',
    '- Source version: 1.1.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.0.0',
    '                  (the v2.47.0 split).',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner reads ValeVision3D. (No console output in this file.)',
    '- Back-port     : none.',
], []))

# 6. Lockstep 1.0.0 (new)
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__Lockstep__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Lockstep__.js',
    '- Source version: 1.0.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole, new. Straight onto the transport',
    '                  facade (DR-27 (A), K3 ruling): the R2DrawingNotes interim is not used.',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner and console prefix read ValeVision3D; PURPOSE and the comments name this app\'s file,',
    '    ValeVision__DrawingNotes__.json.',
    '  - The file is reached through the ValeVision facade at TrueVision\'s paths (W0-12): ReadLocalFile',
    '    fetches Na__CfApi__ProjectFileLocation(..).repoUrl, the Whitecardopedia server\'s static copy',
    '    beside project.json (Last-Modified, real 404s); MirrorLocalNow writes through',
    '    Na__LocalMirror__WriteSiblingFile (POST /api/projects/<folderId>/files/<name>: backed up,',
    '    atomic). No code differs.',
    '- Back-port     : none.',
], [
    CONSOLE + (5,),
    NOTES_FILE + (2,),
]))

# 7. Transport 1.3.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__Transport__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Transport__.js',
    '- Source version: 1.3.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole, over the transport facade',
    '                  (DR-27 (A), K3 ruling). This app\'s copy was its 1.1.0 (18-Sep-2026) on',
    '                  Na__AppUtils__R2DrawingNotes__, whose Sync wrote the local file without looking and',
    '                  whose Reload Local marked the file as the cloud copy; both faults close here. Its',
    '                  three seams retire with it: CanReloadCloud is TrueVision\'s (the Worker configured,',
    '                  not a project code in the URL), Sync\'s gate is IsConfigured, and the "Worker config',
    '                  unavailable" toast mapping goes (the facade answers "Worker not configured ...").',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner and console prefix read ValeVision3D; PURPOSE and the comments name this app\'s files,',
    '    ValeVision__DrawingNotes__.json beside project.json.',
    '  - Na__CfApi__* are the ValeVision facade\'s (80__CloudflareIntegration, W0-12): R2 is',
    '    VaApps/Projects/<folderId>/ValeVision__DrawingNotes__.json through the whitecardopedia-editor-api',
    '    Worker (files/read and files/write once it lists them, drawing-notes before), the CDN copy',
    '    off localhost. IsConfigured is localhost-only, so UsesWorker is too, whatever the authoring gate',
    '    says. LegacyFileName is empty in this app\'s config, so the legacy reads never run. No code',
    '    differs.',
    '- Back-port     : none.',
], [
    CONSOLE + (4,),
    NOTES_FILE + (3,),
    DATA_FILE + (3,),
]))

# 8. The barrel 1.5.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecData__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__.js',
    '- Source version: 1.5.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.3.0',
    '                  (18-Sep-2026; first ported 14-Sep-2026, split for ValeVision3D v2.47.0); 1.4.0',
    '                  (TrueVision3D v2.144.0: LOCATE_EVENT, WriteLocalCopy) and 1.5.0 (the lockstep API)',
    '                  come across together.',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner reads ValeVision3D; DESCRIPTION names this app\'s files, ValeVision__DrawingNotes__.json',
    '    beside project.json. (No console output in this file.)',
    '- Back-port     : none.',
], [
    ('//   TrueVision__ProjectData__.json as TrueVision__DrawingNotes__.json, and', '//   project.json as ValeVision__DrawingNotes__.json, and', 1),
    NOTES_FILE + (1,),
]))

# 9. SpecLinks 1.2.0
FILES.append((SPEC + 'Na__LayoutEditor__SpecLinks__.js', [
    '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecLinks__.js',
    '- Source version: 1.2.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)',
    '- Ported on     : ' + PORTED_ON + ' - whole. This app\'s copy was its 1.0.0',
    '                  (ported 14-Sep-2026); 1.1.0 (the broken-link resolver, 18-Sep-2026, no TrueVision',
    '                  devlog heading) and 1.2.0 (the note resolver and locate) register with',
    '                  LeaderGeometry 1.3.0, here since W1-26.',
    '- Parity        : verbatim',
    '- Divergences   :',
    '  - Banner reads ValeVision3D. (No console output in this file.)',
    '- Back-port     : none.',
], []))


if __name__ == '__main__':
    for rel, note, seams in FILES:
        build(rel, note, seams)
    print('OK')
