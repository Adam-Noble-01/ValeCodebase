# W4-01 | Port the published schema (53) and its test from TrueVision b2aa9151 into ValeVision3D.
# Whole-file ports: TV's text exactly as git show returns it (LF), then ONLY the listed seams, each of which
# must hit exactly once. Writes to <out root> (the VV app root, or a staging copy).
#
# Usage: python port_files.py <out app root>

import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV   = os.path.join(HERE, 'tv', 'APP')
OUT  = sys.argv[1]

VV_REL_TEXT = 'v2.71.6'
EX_REF      = 'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/TestEnv__ExampleProjects/2026/0000__ExampleProjectStructure/06__Layout__PublishedDocuments'

def port(rel_in, rel_out, seams):
    text = open(os.path.join(TV, rel_in), 'rb').read().decode('utf-8')
    if '\r\n' in text:
        raise SystemExit('unexpected CRLF in TV source ' + rel_in)
    for old, new in seams:
        n = text.count(old)
        if n != 1:
            raise SystemExit('%s: seam hit %d times: %r' % (rel_in, n, old[:90]))
        text = text.replace(old, new)
    dest = os.path.join(OUT, rel_out)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest):
        raise SystemExit('refusing to overwrite ' + dest)
    open(dest, 'wb').write(text.encode('utf-8'))
    print('wrote', rel_out, len(text.encode('utf-8')), 'bytes')

SCHEMA = '02__Src__AppModules/53__Data__Layout__PublishedSchema/'

SCHEMA_REF_OLD = ('// SCHEMA REF : na-project-portal/26-Projects/AA00__ExampleProjectStructure/\n'
                  '//              30__TrueVision__AppContent/06__Layout__PublishedDocuments\n')
SCHEMA_REF_NEW = ('// SCHEMA REF : WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/TestEnv__ExampleProjects/\n'
                  '//              2026/0000__ExampleProjectStructure/06__Layout__PublishedDocuments\n')

def port_note(src_rel, src_ver, divergences):
    lines = ['// PORT NOTE:',
             '// - Ported from   : TrueVision3D ' + src_rel,
             '// - Source version: ' + src_ver,
             '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-01}} (parity package W4-01)',
             '// - Parity        : adapted',
             '// - Divergences   :']
    lines += ['//   - ' + d if not d.startswith(' ') else '//     ' + d.strip() for d in divergences]
    lines += ['// - Back-port     : none.', '//', '// -----------------------------------------------------------------------------', '//', '']
    return '\n'.join(lines)

LOG_ANCHOR = '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------
PATHS_NOTE = port_note(
    '02__Src__AppModules/53__Data__Layout__PublishedSchema/Na__PublishedSchema__Paths__.js',
    '1.1.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151)',
    ['Banner and console prefix read ValeVision3D ([ValeVision3D PublishedSchema]).',
     'SCHEMA REF names this app\'s example folder, 80__Testing__PrototypeEnvironment/',
     '  TestEnv__ExampleProjects/2026/0000__ExampleProjectStructure (seeded from',
     '  TrueVision\'s AA00 example, W4-01).',
     'Comments: a path is relative to the PROJECT FOLDER, which in this app is the',
     '  root TrueVision\'s AppContent folder stands for (DR-29 (A)); the R2-first',
     '  wording of the asset builder is dropped (the OVH move, OC-17); the document',
     '  numbering note names TrueVision3D\'s notes in words.',
     'The built-in minReader is ' + VV_REL_TEXT + ', the release that ships the reader, kept',
     '  identical to the JSON\'s Version__MinReader (informational: nothing gates on it).',
     'Na__PubSchema__DocumentId is TrueVision\'s three-fact composer and refuses',
     '  two facts: under DR-11\'s default ({project}_{drawing}, no phase) this app\'s',
     '  document ids are composed by the editor (Na__LeModel__GetDocumentId), not here.'])

port(SCHEMA + 'Na__PublishedSchema__Paths__.js', SCHEMA + 'Na__PublishedSchema__Paths__.js', [
    ('// TRUEVISION3D - PUBLISHED SCHEMA - PATHS AND TABLES', '// VALEVISION3D - PUBLISHED SCHEMA - PATHS AND TABLES'),
    (SCHEMA_REF_OLD, SCHEMA_REF_NEW),
    ("// - EVERY PATH IS RELATIVE TO A PROJECT'S 30__TrueVision__AppContent, which is\n"
     "//   exactly what Na__AppUtils__ResolveAssetUrl takes, so a published asset\n"
     "//   resolves through the same R2-first, repository-fallback builder as every\n"
     "//   other project asset. There is no second URL scheme to keep in step.\n",
     "// - EVERY PATH IS RELATIVE TO A PROJECT'S OWN FOLDER, which is exactly what\n"
     "//   Na__AppUtils__ResolveAssetUrl takes, so a published asset resolves\n"
     "//   through the same builder as every other project asset. There is no\n"
     "//   second URL scheme to keep in step.\n"),
    (LOG_ANCHOR, '// -----------------------------------------------------------------------------\n//\n' + PATHS_NOTE + '// DEVELOPMENT LOG:\n'),
    ("        minReader     : 'v2.142.0',", "        minReader     : '" + VV_REL_TEXT + "',"),
    ("console.warn('[TrueVision3D PublishedSchema]", "console.warn('[ValeVision3D PublishedSchema]"),
    ("    // never stored - see TrueVision__NOTES__DrawingNumberingSchema__.md. This is\n",
     "    // never stored - see TrueVision3D's drawing numbering notes. This is\n"),
    ("// Every return value is relative to a project's 30__TrueVision__AppContent, and\n",
     "// Every return value is relative to a project's own folder, and\n"),
    ("    // which leaves the published root but stays inside the project's TrueVision\n    // content.",
     "    // which leaves the published root but stays inside the project's ValeVision\n    // content."),
])

# -----------------------------------------------------------------------------
# Version
# -----------------------------------------------------------------------------
VERSION_NOTE = port_note(
    '02__Src__AppModules/53__Data__Layout__PublishedSchema/Na__PublishedSchema__Version__.js',
    '1.0.0 (TrueVision3D v2.155.0, 23-Sep-2026; read at b2aa9151)',
    ['Banner reads ValeVision3D. (No console output in this file.)',
     'SCHEMA REF names this app\'s example folder (as Na__PublishedSchema__Paths__.js).',
     'The refusal reasons name ValeVision ("a newer/older version of ValeVision") and',
     '  the publish stamp writes Publish__ByApp \'ValeVision3D Layout Editor\': both',
     '  reach a Vale reader (the grey mask) and Vale\'s published files.'])

port(SCHEMA + 'Na__PublishedSchema__Version__.js', SCHEMA + 'Na__PublishedSchema__Version__.js', [
    ('// TRUEVISION3D - PUBLISHED SCHEMA - VERSION GATE', '// VALEVISION3D - PUBLISHED SCHEMA - VERSION GATE'),
    (SCHEMA_REF_OLD, SCHEMA_REF_NEW),
    (LOG_ANCHOR, '// -----------------------------------------------------------------------------\n//\n' + VERSION_NOTE + '// DEVELOPMENT LOG:\n'),
    ("'the file was published by a newer version of TrueVision'", "'the file was published by a newer version of ValeVision'"),
    ("'the file was published by an older version of TrueVision'", "'the file was published by an older version of ValeVision'"),
    ("Publish__ByApp         : 'TrueVision3D Layout Editor',", "Publish__ByApp         : 'ValeVision3D Layout Editor',"),
])

# -----------------------------------------------------------------------------
# Schema JSON (keys verbatim; values adapted; one additive Meta__PortedFrom)
# -----------------------------------------------------------------------------
port(SCHEMA + 'Na__PublishedSchema__.json', SCHEMA + 'Na__PublishedSchema__.json', [
    ('"Meta__SchemaRef"   : "na-project-portal/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/06__Layout__PublishedDocuments",',
     '"Meta__SchemaRef"   : "' + EX_REF + '",'),
    ('"Meta__SchemaRefNote": "THE READABLE SCHEMA, and it lives outside this app. A change to any name or key in this file is not finished until that folder matches it. See README__PublishedSchema__.md."\n',
     '"Meta__SchemaRefNote": "THE READABLE SCHEMA, and it lives in this app\'s test folder, not beside this file. A change to any name or key in this file is not finished until that folder matches it. See README__PublishedSchema__.md.",\n'
     '        "Meta__PortedFrom"  : "TrueVision3D 02__Src__AppModules/53__Data__Layout__PublishedSchema/Na__PublishedSchema__.json 1.0.0, schema 1, as TrueVision3D v2.166.0 shipped it (29-Sep-2026; read at HEAD b2aa9151), ported 02-Oct-2026 (parity package W4-01). Every key, folder name, file name, element kind, mark, tier and state is TrueVision\'s, so a document either app publishes is one the other can read. This app\'s own values: Meta__SchemaRef (its example folder), Version__MinReader (the ValeVision release that ships the reader), and the wording of Folders__Description, Folders__ArchiveNote and Folders__DocumentNote (the project folder is the content root, DR-29 (A); document ids are {project}_{drawing} until Vale\'s phases exist, DR-11)."\n'),
    ('"Version__MinReader"    : "v2.142.0",', '"Version__MinReader"    : "' + VV_REL_TEXT + '",'),
    ("inside a project's 30__TrueVision__AppContent, because", "inside a project's own folder, because"),
    ('"Folders__ArchiveNote"  : "Local only. The R2 sync skips every folder whose name starts with 00__ (SKIP_FOLDER_PREFIXES in CloudflareR2__ModelSync__Main__.py), which is the whole mechanism keeping archives off the bucket.",',
     '"Folders__ArchiveNote"  : "Local only. A folder whose name starts with 00__ never leaves the authoring machine, which is the whole mechanism keeping archives off the live copy. TrueVision\'s R2 sync skips every 00__ folder (SKIP_FOLDER_PREFIXES); TODO(OVH-MIGRATION): ValeVision\'s Flask service on the VPS keeps the same rule when it takes over publishing.",'),
    ("named after its DOCUMENT ID - <project code>_<phase>_<number>, e.g. AA00_T02_D02 - which",
     "named after its DOCUMENT ID - <project code>_<number> until Vale's phases are supplied (DR-11), then <project code>_<phase>_<number>; e.g. 3047_D02 - which"),
])

# -----------------------------------------------------------------------------
# README
# -----------------------------------------------------------------------------
port(SCHEMA + 'README__PublishedSchema__.md', SCHEMA + 'README__PublishedSchema__.md', [
    ('Phase 1 of `TrueVision__PLAN__PublishingSystem__.md`; the three modules below are written\nwhen Phase 1 starts.\n',
     'Phase 1 of `TrueVision__PLAN__PublishingSystem__.md`; the three modules below are written\nwhen Phase 1 starts.\n\n'
     '> **In ValeVision** the three modules are here, ported from TrueVision3D (read at b2aa9151) by parity\n'
     '> package W4-01, and the readable schema is this app\'s own example folder in the test folder - seeded\n'
     '> from TrueVision\'s AA00 example with Vale identity values (document ids `{project}_{drawing}`, DR-11).\n'
     '> It is provisional: a real ValeVision publish of `2026/3047__Doous` replaces it once publishing works.\n'),
    ('## ⚠ PARITY: THE READABLE SCHEMA LIVES OUTSIDE THIS APP\n',
     '## ⚠ PARITY: THE READABLE SCHEMA LIVES IN THE TEST FOLDER, NOT HERE\n'),
    ('na-project-portal/26-Projects/AA00__ExampleProjectStructure/\n    30__TrueVision__AppContent/06__Layout__PublishedDocuments/\n',
     'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/TestEnv__ExampleProjects/\n    2026/0000__ExampleProjectStructure/06__Layout__PublishedDocuments/\n'),
    ('It is deliberately in the project portal and not in this app, because it is a *document*\nabout documents rather than code.',
     'It is deliberately in the test folder, beside `Na__Test__PublishedSchema__` which walks it, and\nnot in this module folder, because it is a *document* about documents rather than code.'),
    ('so every published document in the R2 bucket must be\nre-published.',
     'so every published document on the server must be\nre-published.'),
    ('`Na__Test__PublishedSchema__` region 6A checks it. Adding the name did NOT bump\n`Version__Schema`: no reader of schema 1 reads it, and nothing a reader of schema 1 reads\nchanged.\n',
     '`Na__Test__PublishedSchema__` region 6A checks it. Adding the name did NOT bump\n`Version__Schema`: no reader of schema 1 reads it, and nothing a reader of schema 1 reads\nchanged.\n\n'
     '---\n\n'
     'Ported from TrueVision3D\'s `README__PublishedSchema__.md` (as of TrueVision3D v2.166.0, read at HEAD\n'
     'b2aa9151) by parity package W4-01, 02-Oct-2026, for ValeVision3D {{VVREL:W4-01}}. This app\'s own text: the\n'
     'example folder\'s location and the note above it, the parity heading, and "on the server" for TrueVision\'s\n'
     'R2 bucket. In ValeVision a share link opens the app itself, keyed by the project\'s folderId (DR-23 (a)), and\n'
     'the example\'s share record lists no statement (the Statement Writer is switched off, DR-10).\n'),
])

# -----------------------------------------------------------------------------
# The test
# -----------------------------------------------------------------------------
TEST_NOTE = port_note(
    '80__Testing__PrototypeEnvironment/Na__Test__PublishedSchema__.test.mjs',
    '1.1.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151)',
    ['Banner reads ValeVision3D.',
     'The example is this app\'s own: 80__Testing__PrototypeEnvironment/TestEnv__ExampleProjects/',
     '  2026/0000__ExampleProjectStructure, laid out as a project folder, the project folder',
     '  being the content root (DR-29 (A)); its document ids are 0000_D01, 0000_D02, 0000_D06.',
     'Region 1 adds one check: the README and the example ReadMe point at each other.',
     'Region 2: an index entry with no phase composes {project}_{drawing} (DR-11 default);',
     '  a phased entry still goes through Na__PubSchema__DocumentId, and a check proves the',
     '  schema\'s three-fact composer refuses two facts.',
     'Region 6A: the share address is filled with the project\'s folderId',
     '  (ShareLinks__Project.Project__Folder), the DR-23 (a) project token, not the code.'])

port('80__Testing__PrototypeEnvironment/Na__Test__PublishedSchema__.test.mjs',
     '80__Testing__PrototypeEnvironment/Na__Test__PublishedSchema__.test.mjs', [
    ('// TRUEVISION3D - TEST - PUBLISHED SCHEMA AGAINST THE EXAMPLE FOLDER', '// VALEVISION3D - TEST - PUBLISHED SCHEMA AGAINST THE EXAMPLE FOLDER'),
    ('// - THIS IS THE PARITY CHECK, MADE EXECUTABLE. The example folder in the project\n//   portal is the readable schema;',
     '// - THIS IS THE PARITY CHECK, MADE EXECUTABLE. The example folder beside this\n//   test is the readable schema;'),
    (LOG_ANCHOR, '// -----------------------------------------------------------------------------\n//\n' + TEST_NOTE + '// DEVELOPMENT LOG:\n'),
    ("    const CONTENT    = join(REPO, 'na-project-portal', '26-Projects', 'AA00__ExampleProjectStructure',\n"
     "                            '30__TrueVision__AppContent');\n",
     "    // ValeVision3D: the example project sits beside this test, laid out as a\n"
     "    // project folder is (<yyyy>/<code>__<Name>), and the project folder itself\n"
     "    // is the content root (DR-29 (A)).\n"
     "    const CONTENT    = join(SCRIPT_DIR, 'TestEnv__ExampleProjects', '2026', '0000__ExampleProjectStructure');\n"),
    ("    check('the SCHEMA REF in the schema JSON points at the example folder',\n"
     "        existsSync(join(REPO, schemaJson['PublishedSchema__Meta']['Meta__SchemaRef'])),\n"
     "        schemaJson['PublishedSchema__Meta']['Meta__SchemaRef']);\n",
     "    check('the SCHEMA REF in the schema JSON points at the example folder',\n"
     "        existsSync(join(REPO, schemaJson['PublishedSchema__Meta']['Meta__SchemaRef'])),\n"
     "        schemaJson['PublishedSchema__Meta']['Meta__SchemaRef']);\n"
     "\n"
     "    // ValeVision3D: \"a note at only one end is a note somebody will not read\" -\n"
     "    // the module README names the example folder, and the example's ReadMe names\n"
     "    // the README. A path the README wraps over two lines is read joined.\n"
     "    check('the README and the example ReadMe point at each other', (() => {\n"
     "        const readme  = readFileSync(join(SCHEMA_DIR, 'README__PublishedSchema__.md'), 'utf8').replace(/\\/\\r?\\n\\s+/g, '/');\n"
     "        const example = readFileSync(join(EXAMPLE, 'PublishedDocuments__ReadMe__.md'), 'utf8');\n"
     "        return readme.indexOf(schemaJson['PublishedSchema__Meta']['Meta__SchemaRef']) !== -1 &&\n"
     "               example.indexOf('02__Src__AppModules/53__Data__Layout__PublishedSchema/README__PublishedSchema__.md') !== -1;\n"
     "    })());\n"),
    ("        check('DocumentId(' + entry['Document__Number'] + ') composes to the folder name',\n"
     "            Paths.Na__PubSchema__DocumentId(index['PublishedDocuments__Project']['Project__Code'],\n"
     "                                            entry['Document__Phase'], entry['Document__Number']) === id,\n"
     "            id);\n",
     "        // ValeVision3D (DR-11 default): {project}_{drawing} until Vale's phases are\n"
     "        // supplied, so an entry with no phase composes from two facts; a phased one\n"
     "        // goes through the schema's three-fact composer exactly as TrueVision's does.\n"
     "        const code     = index['PublishedDocuments__Project']['Project__Code'];\n"
     "        const composed = entry['Document__Phase']\n"
     "            ? Paths.Na__PubSchema__DocumentId(code, entry['Document__Phase'], entry['Document__Number'])\n"
     "            : [ code, entry['Document__Number'] ].map((one) => String(one).trim()).join('_');\n"
     "        check('DocumentId(' + entry['Document__Number'] + ') composes to the folder name',\n"
     "            composed === id,\n"
     "            id);\n"),
    ("    for (const entry of unpublished) {\n",
     "    check('the schema\\'s three-fact composer refuses two facts (this app composes its own ids, DR-11)',\n"
     "        Paths.Na__PubSchema__DocumentId('0000', '', 'D02') === '' &&\n"
     "        Paths.Na__PubSchema__DocumentId('0000', 'P1', 'D02') === '0000_P1_D02');\n"
     "\n"
     "    for (const entry of unpublished) {\n"),
    ("Paths.Na__PubSchema__ElementPath('AA00_T02_D06', 'vector')", "Paths.Na__PubSchema__ElementPath('0000_D06', 'vector')"),
    ("Paths.Na__PubSchema__ResolveDocumentRef('AA00_T02_D06', hatched", "Paths.Na__PubSchema__ResolveDocumentRef('0000_D06', hatched"),
    ("Paths.Na__PubSchema__ElementPath('AA00_T02_D01', 'image')", "Paths.Na__PubSchema__ElementPath('0000_D01', 'image')"),
    ("Paths.Na__PubSchema__ResolveDocumentRef('AA00_T02_D01', images", "Paths.Na__PubSchema__ResolveDocumentRef('0000_D01', images"),
    ("'05__Layout__DrawingDocs__Images/AA00_T02_D01/'", "'05__Layout__DrawingDocs__Images/0000_D01/'"),
    ("Paths.Na__PubSchema__ResolveDocumentRef('AA00_T02_D02', '../../../secrets.json')", "Paths.Na__PubSchema__ResolveDocumentRef('0000_D02', '../../../secrets.json')"),
    ("Paths.Na__PubSchema__RasterPath('AA00_T02_D02', 'Viewport_001', 'NoSuchTier', 'abc')", "Paths.Na__PubSchema__RasterPath('0000_D02', 'Viewport_001', 'NoSuchTier', 'abc')"),
    ("        const name = Paths.Na__PubSchema__ArchiveName('AA00_T02_D02', 'A');\n"
     "        return name === 'AA00_T02_D02__Revision__A.zip' &&\n"
     "               onDisk(Paths.Na__PubSchema__ArchivePath('AA00_T02_D02', 'A')) &&\n"
     "               Paths.Na__PubSchema__ArchivePath('AA00_T02_D02', 'A').indexOf('/00__') !== -1;\n",
     "        const name = Paths.Na__PubSchema__ArchiveName('0000_D02', 'A');\n"
     "        return name === '0000_D02__Revision__A.zip' &&\n"
     "               onDisk(Paths.Na__PubSchema__ArchivePath('0000_D02', 'A')) &&\n"
     "               Paths.Na__PubSchema__ArchivePath('0000_D02', 'A').indexOf('/00__') !== -1;\n"),
    ("accounted.add(setup.folders.archive + '/' + Paths.Na__PubSchema__ArchiveName('AA00_T02_D02', 'A'));",
     "accounted.add(setup.folders.archive + '/' + Paths.Na__PubSchema__ArchiveName('0000_D02', 'A'));"),
    ("            .split('{projectCode}').join(encodeURIComponent(shareLinks['ShareLinks__Project']['Project__Code']))\n",
     "            .split('{projectCode}').join(encodeURIComponent(shareLinks['ShareLinks__Project']['Project__Folder']))   // <-- ValeVision3D: the folderId (DR-23 (a))\n"),
    ("Fallback.Na__PubSchema__ManifestPath('AA00_T02_D02') === Paths.Na__PubSchema__ManifestPath('AA00_T02_D02')",
     "Fallback.Na__PubSchema__ManifestPath('0000_D02') === Paths.Na__PubSchema__ManifestPath('0000_D02')"),
])
print('done')
