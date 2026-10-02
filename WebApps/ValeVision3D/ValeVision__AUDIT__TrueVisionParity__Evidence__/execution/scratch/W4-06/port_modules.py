"""W4-06: port Statement Data, Data__Transport, Reader and Manager from TrueVision b2aa9151.

Each file is TrueVision's text (LF, as git show returns it) with only the seams the package
lists. Every replacement asserts how many times it applies. The ported text goes to out/ first;
--land writes it to the ValeVision tree and refuses to overwrite an existing file.
"""
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
OUT = os.path.join(HERE, 'out')
VV_FEATURE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\52__Feature__StatementWriter'
TARGETS = {
    'Na__LayoutEditor__Statement__Data__.js': '01__Core__Data',
    'Na__LayoutEditor__Statement__Data__Transport__.js': '01__Core__Data',
    'Na__LayoutEditor__Statement__Reader__.js': '05__Ui__Reader',
    'Na__LayoutEditor__Statement__Manager__.js': '03__Ui__Page',
}
TV_PREFIX = 'TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/'


def sub(text, old, new, count=1):
    found = text.count(old)
    if found != count:
        raise SystemExit(f'seam expected {count}x, found {found}x: {old[:90]!r}')
    return text.replace(old, new)


def banner(text, old_title):
    return sub(text, '// TRUEVISION3D - ' + old_title + '\n', '// VALEVISION3D - ' + old_title + '\n')


# -----------------------------------------------------------------------------
# Data
# -----------------------------------------------------------------------------
def port_data(text):
    text = banner(text, 'LAYOUT EDITOR - STATEMENT DATA')

    text = sub(text,
        '// PORT NOTE:\n'
        '// - Ported from   : n/a (TrueVision3D first, 20-Sep-2026)\n'
        '// - Back-port     : offer to ValeVision3D with the statement tab.\n',
        '// PORT NOTE:\n'
        '// - Ported from   : ' + TV_PREFIX + '01__Core__Data/Na__LayoutEditor__Statement__Data__.js\n'
        '// - Source version: 1.2.0 (TrueVision3D v2.169.0, 29-Sep-2026; 1.1.0 v2.157.0, 1.0.0 v2.95.0; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-06}}, inert (the Statement Writer lands\n'
        '//                   switched off, K1 DR-10; only the feature\'s own Reader and Manager import it)\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '//   - The browser keys swap the app token (K2 B2): Na__ValeVision__StatementDraft__ and\n'
        '//     Na__ValeVision__StatementDiscarded__; the helper comment naming the discarded key names this\n'
        '//     app\'s. (The DEVELOPMENT LOG keeps TrueVision\'s words, H6.)\n'
        '//   - THE DOCUMENT CODE (S07b-V02, K1 DR-11): the {code} of a new or renamed statement is\n'
        '//     Na__DrawData__GetDocumentCode() - project.json\'s projectCode, 3047 - never the ?project= token\n'
        '//     (2026/3047__Doous), whose "/" would turn the file name into a path. The index\'s\n'
        '//     Statement__Project records the same code (the token only when no code is known).\n'
        '//     Na__LeStmt__ProjectCode stays the token: the load is keyed by it, as in TrueVision.\n'
        '//   - The {project} part drops the folder\'s leading code up to its first "__" (3047__Doous ->\n'
        '//     Doous); TrueVision drops an NA job code (/^[A-Z]{2}\\d{2}__/).\n'
        '//   - NO PHASE SEGMENT UNTIL VALE HAS PHASES (K1 DR-11, R6 F.8 C21): while the Drawing Register\'s\n'
        '//     phase list is empty, NameFor and Rename drop the "_T{tranche}" part of FilePattern\n'
        '//     (Na__LeStmt__NamingSetup), so a new statement is 3047_S01__Doous__<Title>__.md and never\n'
        '//     carries NA\'s T01. It falls away once Vale phases are supplied, or with a FilePattern\n'
        '//     that has no tranche.\n'
        '//   - The new-statement starter is Vale\'s: no NA logo line, and "Vale Garden Houses" where\n'
        '//     TrueVision names its author and company (K1 DR-10, DR-43, D-S07b-04: the field names stay).\n'
        '//   - Two more imports: Na__LeCfg__GetDrawingRegisterSetup (the phase list) and\n'
        '//     Na__DrawData__GetDocumentCode (a ValeVision-only export of the drawings data, K2 X2).\n'
        '//   - Storage goes through Na__LayoutEditor__Statement__Data__Transport__ over ValeVision\'s\n'
        '//     facade; its cloud writes wait for the OVH migration (TODO(OVH-MIGRATION) there), so\n'
        '//     MarkPublished\'s cloud index write answers not written until then.\n'
        '// - Back-port     : the storage prefixes, the starter and the brand into config in TrueVision\n'
        '//                   (K1 DR-42 item 6, under DR-36 with Adam\'s approval).\n')

    text = sub(text,
        "    import { Na__LeCfg__GetStatementSetup } from '../../03__Core__Config/Na__LayoutEditor__ConfigState__.js';\n"
        "    import { Na__DrawData__GetProjectCode } from '../../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
        "    import { Na__LeCfg__GetStatementSetup, Na__LeCfg__GetDrawingRegisterSetup } from '../../03__Core__Config/Na__LayoutEditor__ConfigState__.js';\n"
        "    import { Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode } from '../../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n")

    text = sub(text,
        "    const Na__LeStmt__DRAFT_PREFIX     = 'Na__TrueVision__StatementDraft__';\n"
        "    const Na__LeStmt__DISCARDED_PREFIX = 'Na__TrueVision__StatementDiscarded__';  // <-- The copy a lockstep answer did not keep\n",
        "    const Na__LeStmt__DRAFT_PREFIX     = 'Na__ValeVision__StatementDraft__';\n"
        "    const Na__LeStmt__DISCARDED_PREFIX = 'Na__ValeVision__StatementDiscarded__';  // <-- The copy a lockstep answer did not keep\n")

    text = sub(text,
        "    // The company mark, the title and the standard front sheet fields, so a\n"
        "    // new statement starts as a Noble Architecture document rather than as an\n"
        "    // empty page somebody has to remember the house style for.\n",
        "    // The title and the standard front sheet fields, so a new statement\n"
        "    // starts as a Vale Garden Houses document rather than as an empty page\n"
        "    // somebody has to remember the house style for.\n")

    text = sub(text,
        "    const Na__LeStmt__STARTER = [\n"
        "        '<img src=\"https://www.noble-architecture.com/assets/NA03_-_LIBR_-_NA-Site_-_Core-Brand-Image-Assets/NA03_01_-_PNG_-_NA_Company_Logo_-_w2048_x_h500px.png\" style=\"width:75mm; margin-left: -3mm; \" />',\n"
        "        '',\n"
        "        '## {title}',\n",
        "    const Na__LeStmt__STARTER = [\n"
        "        '## {title}',\n")
    text = sub(text, "        'Mr Adam Noble of Noble Architecture',\n", "        'Vale Garden Houses',\n")

    text = sub(text, '[TrueVision3D] Statement Writer', '[ValeVision3D] Statement Writer', count=8)

    text = sub(text,
        "    // with localStorage.getItem('Na__TrueVision__StatementDiscarded__<folder>__<id>')\n",
        "    // with localStorage.getItem('Na__ValeVision__StatementDiscarded__<folder>__<id>')\n")

    # The naming helper, at the foot of the Helpers region (after MakeConflict)
    text = sub(text,
        "            summary  : Na__LeStmtLock__Summary(parts.appText, parts.fileText),\n"
        "            askedIso : Na__LeStmt__Now()\n"
        "        };\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n",
        "            summary  : Na__LeStmtLock__Summary(parts.appText, parts.fileText),\n"
        "            askedIso : Na__LeStmt__Now()\n"
        "        };\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | The Naming Setup: No Phase Until Vale Has Phases (ValeVision only)\n"
        "    // ------------------------------------------------------------\n"
        "    // K1 DR-11, R6 F.8 C21. A statement's file name carries a phase segment\n"
        "    // only once Vale's own stages are supplied - the Drawing Register's phase\n"
        "    // list, the same one a drawing's document code takes its phase from.\n"
        "    // Until then the \"_T{tranche}\" part of FilePattern is dropped, so a new\n"
        "    // statement is 3047_S01__Doous__<Title>__.md and never takes NA's T01.\n"
        "    // A FilePattern with no tranche passes through unchanged.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeStmt__NamingSetup() {\n"
        "        const setup  = Na__LeCfg__GetStatementSetup();\n"
        "        const phases = Na__LeCfg__GetDrawingRegisterSetup().phases;\n"
        "        if (Array.isArray(phases) && phases.length) return setup;\n"
        "        return Object.assign({}, setup, { filePattern : String(setup.filePattern).replace(/_[A-Za-z]*\\{tranche\\}/g, '') });\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n")

    # {code}, {project} and the setup in NameFor (12-space indent) and Rename (16-space indent)
    for indent in ('            ', '                '):
        text = sub(text,
            indent + "projectCode : Na__LeStmt__ProjectCode || Na__DrawData__GetProjectCode(),\n"
            + indent + "projectName : (Na__AppUtils__GetProjectFolderFromUrl() || '').replace(/^[A-Z]{2}\\d{2}__/, ''),\n"
            + indent + "setup       : Na__LeCfg__GetStatementSetup(),\n",
            indent + "projectCode : Na__DrawData__GetDocumentCode(),                     // <-- ValeVision: the document code (3047), never the ?project= token\n"
            + indent + "projectName : (Na__AppUtils__GetProjectFolderFromUrl() || '').replace(/^[^_]+__/, ''),   // <-- ValeVision: 3047__Doous -> Doous\n"
            + indent + "setup       : Na__LeStmt__NamingSetup(),                           // <-- ValeVision: no phase segment until Vale has phases\n")

    text = sub(text,
        "        Na__LeStmt__Doc[Na__LeStmtIdx__K_PROJECT] = Na__LeStmt__ProjectCode || Na__DrawData__GetProjectCode() || null;\n",
        "        Na__LeStmt__Doc[Na__LeStmtIdx__K_PROJECT] = Na__DrawData__GetDocumentCode() || Na__LeStmt__ProjectCode || Na__DrawData__GetProjectCode() || null;   // <-- ValeVision: the document code first\n")
    return text


# -----------------------------------------------------------------------------
# Transport
# -----------------------------------------------------------------------------
CLOUD_DEFERRED = "the cloud copy waits for ValeVision's own server (the OVH migration)"


def port_transport(text):
    text = banner(text, 'LAYOUT EDITOR - STATEMENT DATA - TRANSPORT')

    text = sub(text,
        '//   data and goes through the sibling-file routes every other TrueVision\n',
        '//   data and goes through the sibling-file routes every other ValeVision\n')

    text = sub(text,
        '// PORT NOTE:\n'
        '// - Ported from   : n/a (TrueVision3D first, 20-Sep-2026). The shape follows\n'
        '//                   Na__LayoutEditor__SpecData__Transport__, which is the\n'
        '//                   module this app already trusts with a document on R2.\n'
        '// - Back-port     : offer to ValeVision3D with the statement tab; this is the\n'
        '//                   unit that would need its own bucket paths.\n',
        '// PORT NOTE:\n'
        '// - Ported from   : ' + TV_PREFIX + '01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js\n'
        '// - Source version: 1.1.0 (TrueVision3D v2.157.0, 23-Sep-2026; 1.0.0 v2.95.0; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-06}}, inert (the Statement Writer lands\n'
        '//                   switched off, K1 DR-10; only Na__LayoutEditor__Statement__Data__ imports it)\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D, and DESCRIPTION names this app\'s documents. (No console output\n'
        '//     in this file.)\n'
        '//   - TRANSPORT (K1 DR-27 (A), D-S07b-10 (a)): the Na__CfApi__* and Na__LocalMirror__* names are\n'
        '//     ValeVision\'s facade at TrueVision\'s paths (W0-12) - the statement folder\n'
        '//     <project>/10__StatementDocs, the index ValeVision__StatementDocs__.json beside project.json,\n'
        '//     and the Whitecardopedia server\'s /api/valevision/statements and\n'
        '//     /api/projects/<folderId>/files routes (W0-19) - never TrueVision\'s client. Every read and\n'
        '//     every local write is TrueVision\'s body.\n'
        '//   - THE CLOUD COPIES ARE PLACEHOLDERS (OVH migration, 02-Oct-2026): WriteIndexCloud and\n'
        '//     WriteStatementCloud keep TrueVision\'s names, parameters and result shape but write nothing\n'
        '//     and answer { ok : false, error }, so Publish reports the cloud copy as not written.\n'
        '//     TODO(OVH-MIGRATION): ValeVision\'s Flask service on the VPS takes both writes, same origin,\n'
        '//     through the facade. Their two facade imports (Na__CfApi__WriteProjectFile and\n'
        '//     Na__CfApi__WriteStatementFile) are left out.\n'
        '//   - TODO(OVH-MIGRATION) notes mark the other cloud seams: UsesWorker, ReadIndexCloud, the CDN\n'
        '//     reads in ReadIndex and ReadStatement, and ImageBase\'s CDN base.\n'
        '//   - A missing file reads as missing, never as an index page: a repository URL is answered by\n'
        '//     server.py\'s /Whitecardopedia/<path> route, a JSON 404 when nothing is there (R6 F.8 C30),\n'
        '//     and the file it sends carries Last-Modified, which FetchText hands on as modifiedIso.\n'
        '// - Back-port     : none (the facade is the seam).\n')

    text = sub(text,
        '        Na__CfApi__ReadProjectFile,\n'
        '        Na__CfApi__WriteProjectFile,\n'
        '        Na__CfApi__StatementFileLocation,\n'
        '        Na__CfApi__ReadStatementFile,\n'
        '        Na__CfApi__WriteStatementFile\n'
        '    } from',
        '        Na__CfApi__ReadProjectFile,\n'
        '        Na__CfApi__StatementFileLocation,\n'
        '        Na__CfApi__ReadStatementFile\n'
        '    } from')

    text = sub(text,
        '    // HELPER FUNCTION | May This Session Read and Write the Cloud Copy Directly\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__LeStmtIo__UsesWorker() {\n',
        '    // HELPER FUNCTION | May This Session Read and Write the Cloud Copy Directly\n'
        '    // ------------------------------------------------------------\n'
        '    // TODO(OVH-MIGRATION): on the VPS the cloud copy is ValeVision\'s own\n'
        '    // Flask service at the same origin. The facade\'s host test (W0-12) gives\n'
        '    // way to a Flask-origin check there, and this answer follows it.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__LeStmtIo__UsesWorker() {\n')

    text = sub(text,
        '        const cdn = await Na__LeStmtIo__FetchJson(location.cdnUrl);\n',
        '        // TODO(OVH-MIGRATION): no CDN on the VPS - the facade\'s location answers the\n'
        '        // Flask service\'s same-origin copy here.\n'
        '        const cdn = await Na__LeStmtIo__FetchJson(location.cdnUrl);\n')

    text = sub(text,
        '    async function Na__LeStmtIo__WriteIndexCloud(document) {\n'
        '        const setup = Na__LeCfg__GetStatementSetup();\n'
        "        if (!Na__CfApi__IsConfigured()) return { ok : false, error : 'Worker not configured' };\n"
        '        return Na__CfApi__WriteProjectFile(setup.indexFileName, document);\n'
        '    }\n',
        '    async function Na__LeStmtIo__WriteIndexCloud(document) {\n'
        '        // TODO(OVH-MIGRATION): ValeVision\'s Flask service on the VPS keeps the\n'
        '        // published index (the index file\'s POST, same origin, through the\n'
        '        // facade). Until it does nothing goes to R2 or a Worker: the answer\n'
        '        // says so, and Publish reports it.\n'
        '        void document;\n'
        "        return { ok : false, error : '" + CLOUD_DEFERRED.replace("'", "\\'") + "' };\n"
        '    }\n')

    text = sub(text,
        '    async function Na__LeStmtIo__ReadIndexCloud() {\n'
        '        const setup = Na__LeCfg__GetStatementSetup();\n',
        '    async function Na__LeStmtIo__ReadIndexCloud() {\n'
        '        // TODO(OVH-MIGRATION): on the VPS this reads the Flask service\'s published\n'
        '        // index through the facade.\n'
        '        const setup = Na__LeCfg__GetStatementSetup();\n')

    text = sub(text,
        '        const cdn = await Na__LeStmtIo__FetchText(location.cdnUrl);\n',
        '        // TODO(OVH-MIGRATION): no CDN on the VPS - the facade\'s location answers the\n'
        '        // Flask service\'s same-origin copy here.\n'
        '        const cdn = await Na__LeStmtIo__FetchText(location.cdnUrl);\n')

    text = sub(text,
        "        if (!path) return { ok : false, error : 'that statement has no file' };\n"
        "        return Na__CfApi__WriteStatementFile(path, text, 'text/markdown; charset=utf-8');\n",
        "        if (!path) return { ok : false, error : 'that statement has no file' };\n"
        '        // TODO(OVH-MIGRATION): ValeVision\'s Flask service on the VPS keeps the\n'
        '        // published markdown (POST /api/valevision/statements/file, same origin,\n'
        '        // through the facade). Until it does nothing goes to R2 or a Worker.\n'
        '        void text;\n'
        "        return { ok : false, error : '" + CLOUD_DEFERRED.replace("'", "\\'") + "' };\n")

    text = sub(text,
        '        const base = Na__AppUtils__IsRunningOnLocalhost() ? location.repoUrl : location.cdnUrl;\n',
        '        // TODO(OVH-MIGRATION): on the VPS the pictures hang off the Flask service\'s\n'
        '        // same-origin copy, not a CDN; the facade\'s location will answer it.\n'
        '        const base = Na__AppUtils__IsRunningOnLocalhost() ? location.repoUrl : location.cdnUrl;\n')
    return text


# -----------------------------------------------------------------------------
# Reader and Manager (verbatim apart from the banner and PORT NOTE)
# -----------------------------------------------------------------------------
TV_OWN_NOTE = ('// PORT NOTE:\n'
               '// - Ported from   : n/a (TrueVision3D first, 20-Sep-2026)\n'
               '// - Back-port     : offer to ValeVision3D with the statement tab.\n')


def verbatim_note(rel, version_line, importers):
    return ('// PORT NOTE:\n'
            '// - Ported from   : ' + TV_PREFIX + rel + '\n'
            '// - Source version: ' + version_line + '\n'
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-06}}, inert (the Statement Writer lands\n'
            '//                   switched off, K1 DR-10; ' + importers + ')\n'
            '// - Parity        : verbatim\n'
            '// - Divergences   :\n'
            '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
            '// - Back-port     : none.\n')


def port_reader(text):
    text = banner(text, 'LAYOUT EDITOR - STATEMENT READER')
    return sub(text, TV_OWN_NOTE, verbatim_note(
        '05__Ui__Reader/Na__LayoutEditor__Statement__Reader__.js',
        '1.1.0 (TrueVision3D v2.171.0, 29-Sep-2026; 1.0.0 v2.95.0; read at b2aa9151)',
        'nothing imports it until the Statements page lands, W4-12'))


def port_manager(text):
    text = banner(text, 'LAYOUT EDITOR - STATEMENT MANAGER')
    return sub(text, TV_OWN_NOTE, verbatim_note(
        '03__Ui__Page/Na__LayoutEditor__Statement__Manager__.js',
        '1.1.0 (TrueVision3D v2.169.0, 29-Sep-2026; 1.0.0 v2.95.0; read at b2aa9151)',
        'nothing imports it until the Statements page lands, W4-12'))


PORTS = {
    'Na__LayoutEditor__Statement__Data__.js': port_data,
    'Na__LayoutEditor__Statement__Data__Transport__.js': port_transport,
    'Na__LayoutEditor__Statement__Reader__.js': port_reader,
    'Na__LayoutEditor__Statement__Manager__.js': port_manager,
}


def main():
    land = '--land' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    for name, port in PORTS.items():
        with open(os.path.join(TV, name), 'rb') as handle:
            source = handle.read()
        assert b'\r' not in source, name
        text = port(source.decode('utf-8'))
        assert '\r' not in text
        data = text.encode('utf-8')
        with open(os.path.join(OUT, name), 'wb') as handle:
            handle.write(data)
        line = f'{name}: {len(data)} bytes, {text.count(chr(10))} lines, sha1 {hashlib.sha1(data).hexdigest()[:8]}'
        if land:
            folder = os.path.join(VV_FEATURE, TARGETS[name])
            target = os.path.join(folder, name)
            if os.path.exists(target):
                raise SystemExit('refusing to overwrite ' + target)
            os.makedirs(folder, exist_ok=True)
            with open(target, 'xb') as handle:
                handle.write(data)
            line += '  -> landed'
        print(line)


if __name__ == '__main__':
    main()
