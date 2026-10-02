"""W4-18 - port the Drawing Register core (Data, DeleteDialog, Transactions, Notes, Preview, Pdf) whole from
TrueVision at the pin b2aa9151, re-applying only the listed ValeVision seams.

    python -B port_w4_18.py --dry-run   apply in memory, print what would be written, write nothing
    python -B port_w4_18.py             write the six files (refuses to overwrite a file it did not write)
    python -B port_w4_18.py --verify    prove each live file == TV bytes at the pin + these seams, nothing else

Every seam is an exact (old, new) byte replacement that must match exactly once in TV's text. TV's text is
read from scratch/W4-18/tv (written by extract_tv.py from `git show b2aa9151:...`) and re-checked against the
sha256 recorded below, so a moved TV working tree can never leak in. Output keeps TV's LF line endings.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV_DIR = os.path.join(HERE, 'tv')
VV_DIR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\51__Feature__DrawingRegister'
LEDGER = os.path.join(HERE, 'sha256__written.txt')

TV_SHA = {
    'Data':         '3b8be880e9aa',
    'DeleteDialog': 'c666d1d8263d',
    'Transactions': 'eb16c7af5ce0',
    'Notes':        'fc538b0f239f',
    'Preview':      '765dc94436da',
    'Pdf':          '8b08b1f55866',
}

TV_PATH = '02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__%s__.js'

TV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : n/a (TrueVision3D first, 19-Sep-2026)\n'
    '// - Back-port     : offer to ValeVision3D with the register tab.\n'
)


def port_note(short, source, ported_extra, parity, divergences, back_port):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + (TV_PATH % short),
        '// - Source version: ' + source[0],
    ]
    lines += ['//                   ' + extra for extra in source[1:]]
    lines.append('// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-18}}, ' + ported_extra[0])
    lines += ['//                   ' + extra for extra in ported_extra[1:]]
    lines.append('// - Parity        : ' + parity)
    lines.append('// - Divergences   :')
    for bullet in divergences:
        lines.append('//   - ' + bullet[0])
        lines += ['//     ' + extra for extra in bullet[1:]]
    lines.append('// - Back-port     : ' + back_port[0])
    lines += ['//                   ' + extra for extra in back_port[1:]]
    return '\n'.join(lines) + '\n'


INERT = [
    'inert: nothing imports it until the register',
    'tab lands (W4-10). Its TrueVision release is not confirmed by Adam in TrueVision; ported under DR-01 (c).',
]

OVH_DATA = [
    'TODO(OVH-MIGRATION): on the OVHcloud VPS the facade\'s ReadProjectData and MergeAndSaveKeys are answered',
    'by ValeVision\'s own Flask service (same origin), so "R2" and "local" become one store. TrueVision\'s',
    'Save to R2 / Load R2 split and its R2 wording in toasts and dialogs are kept, call shapes unchanged, until',
    'the register bar (W4-10) and the migration settle them; the two cloud branches carry the marker.',
]

# -----------------------------------------------------------------------------
# The seams, per file: (old, new) exact replacements, each must match exactly once in TV's text.
# -----------------------------------------------------------------------------
SEAMS = {}

SEAMS['Data'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING REGISTER DATA\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER DATA\n'),
    (TV_PORT_NOTE, port_note(
        'Data',
        ['1.0.1 (TrueVision3D v2.69.0, 19-Sep-2026, the first release whose log names the Drawing',
         'Register; last changed in TrueVision commit 32767407 the same day, where AdoptNumbering took the deleted',
         'sheet id for the typed-number delete, a change its log does not record; read at b2aa9151)'],
        INERT,
        'adapted',
        [['Banner reads ValeVision3D. (No console output in this file.)'],
         ['TRANSPORT (DIV-4, DR-27): Na__CfApi__* and Na__LocalMirror__* are ValeVision\'s facade at TrueVision\'s',
          'paths (W0-12), never TrueVision\'s own client; the register block is a top-level key of this app\'s',
          'project.json under VaApps/Projects/<folderId>/.'],
         ['Load Local reads the repository copy beside ValeVision__DrawingNotes__.json, the sibling the facade',
          'names (K2 F9), and that copy is project.json (K2 R2), where TrueVision names its own two files.'],
         OVH_DATA],
        ['the two file names belong in config on both sides (a Notes file name and a project file name',
         'the facade answers), so the Load Local line ports unchanged.']
    )),
    ("                const location = Na__CfApi__ProjectFileLocation('TrueVision__DrawingNotes__.json');\n",
     "                const location = Na__CfApi__ProjectFileLocation('ValeVision__DrawingNotes__.json');   // <-- ValeVision seam (K2 F9): the sibling file the facade names\n"),
    ("                const response = await fetch(new URL('TrueVision__ProjectData__.json', location.repoUrl).href, { cache : 'no-store' });\n",
     "                const response = await fetch(new URL('project.json', location.repoUrl).href, { cache : 'no-store' });   // <-- ValeVision seam (K2 R2): this app's project data file, beside it\n"),
    ("            if (cloud) {\n"
     "                const read = await Na__CfApi__ReadProjectData();\n",
     "            if (cloud) {\n"
     "                // TODO(OVH-MIGRATION): on the VPS this read and the merge below reach ValeVision's Flask service\n"
     "                // through the facade (same origin), and the local write after them is the same store.\n"
     "                const read = await Na__CfApi__ReadProjectData();\n"),
    ("            if (cloud) {\n"
     "                read = await Na__CfApi__ReadProjectData();\n",
     "            if (cloud) {\n"
     "                // TODO(OVH-MIGRATION): on the VPS this read reaches ValeVision's Flask service through the\n"
     "                // facade (same origin); Load R2 and Load Local then read one store.\n"
     "                read = await Na__CfApi__ReadProjectData();\n"),
]

SEAMS['DeleteDialog'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING DELETION CONFIRMATION\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING DELETION CONFIRMATION\n'),
    ('// CREATED    : 19-Sep-2026\n'
     '// =============================================================================\n',
     '// CREATED    : 19-Sep-2026\n'
     '//\n'
     '// -----------------------------------------------------------------------------\n'
     '//\n'
     + port_note(
         'DeleteDialog',
         ['none - TrueVision\'s file carries no MODULE line, no module version and no DEVELOPMENT',
          'LOG (S07a B1). First committed in TrueVision commit 32767407 (19-Sep-2026, devlog then at v2.75.0)',
          'with no release entry of its own; first named by the devlog in v2.78.1 (its dialog colours);',
          'unchanged since; read at b2aa9151'],
         INERT,
         'verbatim',
         [['Banner reads ValeVision3D. (No console output in this file.)'],
          ['This PORT NOTE block is added (TrueVision\'s file has none); the code and every other header',
           'line are TrueVision\'s, so the house MODULE line and DEVELOPMENT LOG stay missing here too.']],
         ['TrueVision\'s header wants a MODULE line, a PORT NOTE and a DEVELOPMENT LOG (WT-08 record',
          'hygiene, with Adam\'s approval, DR-36).']
     )
     + '// - Legacy        : no module version or DEVELOPMENT LOG to carry - TrueVision\'s file has neither (S07a B1);\n'
     '//                   the gap is TrueVision\'s to close (WT-08), so this copy stays byte-for-byte below the header.\n'
     '//\n'
     '// =============================================================================\n'),
]

SEAMS['Transactions'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING REGISTER TRANSACTIONS\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER TRANSACTIONS\n'),
    (TV_PORT_NOTE, port_note(
        'Transactions',
        ['1.2.0 (TrueVision3D v2.79.0, 19-Sep-2026; 1.1.0 came with v2.70.0, the phase confirmation with',
         'v2.71.0 and the typed-number delete with commit 32767407 unlogged; read at b2aa9151)'],
        INERT,
        'adapted',
        [['Banner reads ValeVision3D. (No console output in this file.)'],
         ['THE DOCUMENT CODE (DR-11, R3 C.4 S10): the phase confirmation composes the new document code from',
          'Na__DrawData__GetDocumentCode() (the loaded project\'s own code, 3047) where TrueVision reads',
          'Na__DrawData__GetProjectCode(), which here is the ?project= token (2026/3047__Doous) every save is',
          'addressed by. One import name and one marked line; the title block composes the same way.'],
         ['TRANSPORT (DIV-4, DR-27): Na__DrawData__Save, Na__LocalMirror__MergeKeys and the register data reach',
          'storage only through ValeVision\'s facade at TrueVision\'s paths (W0-12, W1-05).'],
         ['TODO(OVH-MIGRATION): on the OVHcloud VPS Na__DrawData__Save\'s cloud half and the local half reach one',
          'store, ValeVision\'s Flask service (same origin), through the facade; the R2-first ordering, the',
          'Retry Local Sync state and TrueVision\'s R2 wording are kept, call shapes unchanged, until the',
          'register bar (W4-10) and the migration settle them. The two save calls carry the marker.']],
        ['the document-code accessor in place of the ?project= code (offered with S10, WT-10).']
    )),
    ("    import { Na__DrawData__Save, Na__DrawData__GetBlock, Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
     "    import { Na__DrawData__Save, Na__DrawData__GetBlock, Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';   // <-- ValeVision: the document code, not the ?project= token (DR-11)\n"),
    ("              Na__LeModel__ComposeDocumentId(Na__DrawData__GetProjectCode(), next, Na__LeModel__GetDrawingNumber(sheet)) + '.'\n",
     "              Na__LeModel__ComposeDocumentId(Na__DrawData__GetDocumentCode(), next, Na__LeModel__GetDrawingNumber(sheet)) + '.'   // <-- ValeVision seam (DR-11): the project's own code, never the folder token\n"),
    ("            const report  = {};\n"
     "            cloudSaved = await Na__DrawData__Save((text, error) => {\n",
     "            const report  = {};\n"
     "            // TODO(OVH-MIGRATION): on the VPS this save's cloud and local halves reach one store, ValeVision's\n"
     "            // Flask service, through the facade (same origin); the partial-success state below then retires.\n"
     "            cloudSaved = await Na__DrawData__Save((text, error) => {\n"),
    ("            live.splice(index, 1);\n"
     "            Na__LeRegNum__Apply(remaining, plan);\n"
     "            const saved = await Na__DrawData__Save(",
     "            live.splice(index, 1);\n"
     "            Na__LeRegNum__Apply(remaining, plan);\n"
     "            // TODO(OVH-MIGRATION): on the VPS localFirst and the R2 write are one Flask write through the facade.\n"
     "            const saved = await Na__DrawData__Save("),
]

SEAMS['Notes'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING REGISTER REVISION NOTES\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER REVISION NOTES\n'),
    (TV_PORT_NOTE, port_note(
        'Notes',
        ['1.0.1 (TrueVision3D v2.69.0, 19-Sep-2026, the first release whose log names the Drawing',
         'Register; the file is unchanged since it was first committed that day; read at b2aa9151)'],
        INERT,
        'verbatim',
        [['Banner reads ValeVision3D. (No console output in this file.)'],
         ['The warning select offers TrueVision\'s none / yellow / red. A yellow warning prints in the amber',
          'panel because Na__LayoutEditor__Register__Pdf__ boxes it (DR-37 item 2, fixed there, not here).']],
        ['none.']
    )),
]

SEAMS['Preview'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING REGISTER PDF PREVIEW\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER PDF PREVIEW\n'),
    (TV_PORT_NOTE, port_note(
        'Preview',
        ['1.1.0 (TrueVision3D v2.69.0, 19-Sep-2026; unchanged since; read at b2aa9151)'],
        INERT,
        'verbatim',
        [['Banner reads ValeVision3D. (No console output in this file.)'],
         ['PDF.js is this app\'s own vendored copy, 04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174',
          '(W0-16), named by the config\'s PdfJsScriptPath / PdfJsWorkerPath (W0-15, K2 TF-R07): the code is',
          'TrueVision\'s, and DESCRIPTION\'s "PlanVision\'s" PDF.js is TrueVision\'s source of the same library.']],
        ['none (the vendor path is a config value; offered to TrueVision as K2 TF-R07).']
    )),
]

SEAMS['Pdf'] = [
    ('// TRUEVISION3D - LAYOUT EDITOR - DRAWING REGISTER PDF\n',
     '// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER PDF\n'),
    (TV_PORT_NOTE, port_note(
        'Pdf',
        ['1.1.0 (TrueVision3D v2.69.0, 19-Sep-2026; it also carries, unlogged in its own log, v2.71.0\'s',
         'phase and document-code columns, v2.72.0\'s letterhead, v2.78.1\'s self-placed tracked text and',
         'v2.79.0\'s status on each row; read at b2aa9151)'],
        INERT,
        'adapted',
        [['Banner and console prefix read ValeVision3D.'],
         ['The project\'s name comes from Na__CfApi__GetProjectDisplayName() (the project data the app loaded,',
          'R3 C.4 S11), where TrueVision reads the project context its PWA layer publishes on window - which',
          'ValeVision does not have (K2 K4).'],
         ['THE DOCUMENT CODE (DR-11, R3 C.4 S10): the code the register prints, numbers itself by (3047_REGISTER)',
          'and names its file by is Na__DrawData__GetDocumentCode() (the loaded project\'s own code), where',
          'TrueVision reads Na__DrawData__GetProjectCode(): here that is the ?project= token, which can be a',
          'folder id such as 2026/3047__Doous. Three marked lines and the import.'],
         ['The office name\'s last fallback is \'Vale Garden Houses Limited\' (TrueVision: its own office name);',
          'the config\'s LayoutEditor__Pdf__Author already says the same.'],
         ['DR-37 item 2: a \'yellow\' revision warning (what the register\'s Notes offer) is boxed in the amber',
          'panel; TrueVision boxes only \'red\' and \'amber\', so its yellow notes print as plain text. One',
          'marked line.']],
        ['the display-name and document-code accessors in place of the PWA global and the ?project= code;',
         'the yellow-as-amber fix (DR-37 item 2, WT lane).']
    )),
    ("    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
     "    import { Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';   // <-- ValeVision: the document code, not the ?project= token (DR-11)\n"),
    ("    import { Na__CfApi__GetLoadedProjectData } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n",
     "    import { Na__CfApi__GetLoadedProjectData, Na__CfApi__GetProjectDisplayName } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';   // <-- ValeVision: the project's name from the project data the app loaded (K2 K4)\n"),
    ("        const context = window.TrueVision__Pwa__ProjectContext;\n"
     "        const active  = context && typeof context.get === 'function' ? context.get() : null;\n"
     "        const data    = Na__CfApi__GetLoadedProjectData() || {};\n"
     "        return (active && active.displayName) || data.Project__Name || Na__DrawData__GetProjectCode() || 'Project';\n",
     "        const data    = Na__CfApi__GetLoadedProjectData() || {};\n"
     "        return Na__CfApi__GetProjectDisplayName() || data.Project__Name || Na__DrawData__GetDocumentCode() || 'Project';   // <-- ValeVision seam (K2 K4, DR-11): the loaded project's name, not a PWA global; the project's own code\n"),
    ("                console.warn('[TrueVision3D LayoutEditor] The register letterhead could not load the office logo.', logoError);\n",
     "                console.warn('[ValeVision3D LayoutEditor] The register letterhead could not load the office logo.', logoError);\n"),
    ("        const boxed  = level === 'red' || level === 'amber';\n",
     "        const boxed  = level === 'red' || level === 'amber' || level === 'yellow';   // <-- ValeVision seam (DR-37 item 2): the Notes offer 'yellow', so it takes the amber panel\n"),
    ("        const code   = String(Na__DrawData__GetProjectCode() || '');\n",
     "        const code   = String(Na__DrawData__GetDocumentCode() || '');            // <-- ValeVision seam (DR-11): the project's own code, never the ?project= folder id\n"),
    ("            company : Na__LeCfg__GetPdfSetup().author || 'Noble Architecture Ltd',\n",
     "            company : Na__LeCfg__GetPdfSetup().author || 'Vale Garden Houses Limited',   // <-- ValeVision seam: Vale's office name (the config's Pdf Author says the same)\n"),
    ("                projectCode : Na__DrawData__GetProjectCode()\n",
     "                projectCode : Na__DrawData__GetDocumentCode()                       // <-- ValeVision seam (DR-11): the project's own code, never the folder token\n"),
]


def read_tv(short):
    path = os.path.join(TV_DIR, 'Na__LayoutEditor__Register__%s__.js' % short)
    data = open(path, 'rb').read()
    sha = hashlib.sha256(data).hexdigest()
    if not sha.startswith(TV_SHA[short]):
        raise SystemExit('TV copy of %s is not the pin\'s bytes (%s); re-run extract_tv.py' % (short, sha[:12]))
    return data


def build(short):
    text = read_tv(short).decode('utf-8')
    for index, (old, new) in enumerate(SEAMS[short]):
        count = text.count(old)
        if count != 1:
            raise SystemExit('%s seam %d matches %d times (want 1): %r' % (short, index, count, old[:90]))
        text = text.replace(old, new)
    if '\r' in text:
        raise SystemExit('%s: a CR crept in' % short)
    return text.encode('utf-8')


def target(short):
    return os.path.join(VV_DIR, 'Na__LayoutEditor__Register__%s__.js' % short)


def load_ledger():
    out = {}
    if os.path.exists(LEDGER):
        for line in open(LEDGER, encoding='utf-8'):
            parts = line.split()
            if len(parts) == 2:
                out[parts[1]] = parts[0]
    return out


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--write'
    ledger = load_ledger()
    problems = 0
    written = {}
    for short in SEAMS:
        out = build(short)
        dst = target(short)
        sha = hashlib.sha256(out).hexdigest()
        if mode == '--verify':
            live = open(dst, 'rb').read() if os.path.exists(dst) else None
            ok = live == out
            problems += 0 if ok else 1
            print('%-13s %s  %6d bytes  %s' % (short, 'OK  ' if ok else 'DIFF', len(out), sha[:16]))
            continue
        if mode == '--dry-run':
            print('%-13s would write %6d bytes (%d lines)  %s' % (short, len(out), out.count(b'\n'), sha[:16]))
            continue
        if os.path.exists(dst):
            live_sha = hashlib.sha256(open(dst, 'rb').read()).hexdigest()
            if ledger.get(os.path.basename(dst)) != live_sha:
                raise SystemExit('%s exists and is not a file this script wrote - stop (P20)' % dst)
        with open(dst, 'wb') as fh:
            fh.write(out)
        written[os.path.basename(dst)] = sha
        print('%-13s wrote %6d bytes (%d lines)  %s' % (short, len(out), out.count(b'\n'), sha[:16]))
    if written:
        ledger.update(written)
        with open(LEDGER, 'w', encoding='utf-8') as fh:
            for name, sha in sorted(ledger.items()):
                fh.write('%s %s\n' % (sha, name))
    if mode == '--verify':
        print('verify: %d problem(s)' % problems)
        return 1 if problems else 0
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
