# W4-04: port Na__Test__StatementRoundTrip__ and Na__Test__StatementFigureTitle__ from TrueVision at b2aa9151.
# Starts from TV's bytes (LF); swaps the live RB05 specimens for ValeVision's committed fixture and its CRLF
# twin, and adds the CRLF checks. Each replacement is asserted to happen exactly once.
import os, subprocess, sys

PIN  = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP  = 'na-apps/30__TrueVision__CoreAppCode/'
REL  = '80__Testing__PrototypeEnvironment/'
VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
DRY  = '--dry' in sys.argv
OUT  = os.path.join(os.path.dirname(__file__), 'out')
SEP  = '// -----------------------------------------------------------------------------\n'
FIXTURE_REL = 'TestEnv__StatementFixtures/TestEnv__StatementFixture__DesignStatement__.md'


def tv(rel):
    return subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout.decode('utf-8')


def sub(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit('expected %d of %r, found %d' % (count, old[:80], n))
    return text.replace(old, new)


def header(text, title, source, divergences, log):
    text = sub(text, '// TRUEVISION3D - TEST - ' + title + '\n', '// VALEVISION3D - TEST - ' + title + '\n')
    block = ('// PORT NOTE:\n'
             '// - Ported from   : TrueVision3D ' + REL + source[0] + '\n'
             '// - Source version: ' + source[1] + '\n'
             '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-04}}, with the markdown modules it tests\n'
             '// - Parity        : adapted\n'
             '// - Divergences   :\n'
             + ''.join('//   ' + line + '\n' for line in divergences) +
             '// - Back-port     : TrueVision\'s own frozen fixture and CRLF case are WT-03\'s (K1 DR-37 (a), DR-36).\n'
             '//\n' + SEP + '//\n')
    text = sub(text, '//\n// DEVELOPMENT LOG:\n', '//\n' + block + '// DEVELOPMENT LOG:\n' + ''.join('// ' + l + '\n' if l else '//\n' for l in log))
    return text


FIXTURE_NOTE = [
    '- Banner reads ValeVision3D.',
    '- The specimen is ValeVision\'s committed fixture statement',
    '  (' + FIXTURE_REL + '),',
    '  read whatever line ends the checkout gave it and proved twice: with LF and as its CRLF twin.',
    '  TrueVision\'s live RB05 files are never read (K2 V2); where DESCRIPTION says "the real RB05',
    '  statement", read this fixture.',
]

# ------------------------------------------------------------------------------------------- ROUND TRIP
name = 'Na__Test__StatementRoundTrip__.test.mjs'
t = tv(REL + name)
t = header(t, 'STATEMENT MARKDOWN ROUND TRIP',
           (name, '1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; with the unlogged v2.167.0 heading-count rule; read at ' + PIN + ')'),
           FIXTURE_NOTE + [
               '- A CRLF Twins region (K1 DR-37 item 1): every synthetic case and the fixture, with CRLF line',
               '  ends, joins back byte for byte and cuts into the same blocks with the same words as with LF,',
               '  and no derived field carries a CR; a file mixing both line ends joins back byte for byte.',
           ],
           ['02-Oct-2026 - Version 1.0.1 ({{VVREL:W4-04}})',
            '- ValeVision3D: the committed fixture and its CRLF twin in place of RB05;',
            '  the CRLF Twins region (K1 DR-37 item 1).', ''])
t = sub(t, "const repoRoot = path.resolve(here, '..', '..', '..');\n", '')
old_specimens = t[t.index('const specimens = [\n'):t.index('// SYNTHETIC CASES')]
t = sub(t, old_specimens,
        "// THE SPECIMEN | ValeVision's committed fixture statement, and its CRLF twin\n"
        "// ValeVision has no statement of its own yet, so the specimen is the fixture\n"
        "// beside this file. It is written into the scratch folder twice - with LF\n"
        "// line ends and with CRLF - whatever line ends this checkout gave it, so a\n"
        "// Windows checkout and any other prove the same two files (K1 DR-37 item 1).\n"
        "const FIXTURE    = path.join(here, 'TestEnv__StatementFixtures', 'TestEnv__StatementFixture__DesignStatement__.md');\n"
        "const FIXTURE_LF = fs.readFileSync(FIXTURE, 'utf8').replace(/\\r\\n/g, '\\n');\n"
        "const specimens  = [\n"
        "    [ 'TestEnv__StatementFixture__DesignStatement__.md',       FIXTURE_LF ],\n"
        "    [ 'TestEnv__StatementFixture__DesignStatement__CRLF__.md', FIXTURE_LF.replace(/\\n/g, '\\r\\n') ]\n"
        "].map(([ name, text ]) => {\n"
        "    const file = path.join(SCRATCH, name);\n"
        "    fs.writeFileSync(file, text, 'utf8');\n"
        "    return file;\n"
        "});\n\n")
crlf_region = (
    "\n\n"
    + SEP +
    "// REGION | CRLF Twins (ValeVision, K1 DR-37 item 1)\n"
    + SEP +
    "\n"
    "// A file checked out with CRLF line ends must cut into the same blocks as\n"
    "// its LF twin, with the same words in them, and still join back byte for\n"
    "// byte. The words are the derived fields - Text, Html, Body, Head, Rows,\n"
    "// Items - and none of them may carry a CR: the CR stays in Lines only.\n"
    "function Shape(blocks) {\n"
    "    return blocks.map((block) => JSON.stringify([ block.Kind, block.Lines.length, block.Text, block.Html, block.Level,\n"
    "                                                  block.Body, block.Head, block.Align, block.Rows, block.Items, block.Info ]));\n"
    "}\n"
    "function Derived(blocks) {\n"
    "    return JSON.stringify(blocks.map((block) => Object.assign({}, block, { Lines : null })));\n"
    "}\n"
    "\n"
    "console.log('\\nCRLF twins');\n"
    "for (const [ name, text ] of synthetic.concat([ [ 'the fixture statement', FIXTURE_LF ] ])) {\n"
    "    if (text.indexOf('\\n') === -1) continue;                                // <-- One line: there is no line end to twin\n"
    "    const crlf   = text.replace(/\\n/g, '\\r\\n');\n"
    "    const blocks = Na__LeStmtMd__Tokenise(crlf);\n"
    "    const lf     = Shape(Na__LeStmtMd__Tokenise(text));\n"
    "    const twin   = Shape(blocks);\n"
    "    const differ = twin.findIndex((one, at) => one !== lf[at]);\n"
    "    check(name + ' (CRLF) - byte for byte', Na__LeStmtMd__Join(blocks) === crlf);\n"
    "    check(name + ' (CRLF) - the same ' + twin.length + ' blocks as LF', twin.length === lf.length && differ === -1,\n"
    "          differ === -1 ? (twin.length + ' vs ' + lf.length + ' blocks') : ('block ' + differ + ': ' + twin[differ] + '\\n        LF: ' + lf[differ]));\n"
    "    check(name + ' (CRLF) - no CR outside Lines', Derived(blocks).indexOf('\\\\r') === -1);\n"
    "}\n"
    "\n"
    "const MIXED = '# Head\\r\\n\\r\\nOne line.\\nTwo lines.\\r\\n\\r\\n| A | B |\\n| --- | --- |\\r\\n| 1 | 2 |\\n';\n"
    "const mixed = Na__LeStmtMd__Tokenise(MIXED);\n"
    "check('a file mixing both line ends - byte for byte, heading and table found',\n"
    "      Na__LeStmtMd__Join(mixed) === MIXED && mixed[0].Kind === 'heading' && mixed.some((block) => block.Kind === 'table'),\n"
    "      mixed.map((block) => block.Kind).join(','));\n"
    "\n"
    "// endregion -------------------------------------------------------------------\n")
t = sub(t, "    check('    blank lines are attached to the block above (' + withBlanks + ' blocks carry spacing)', withBlanks > 0);\n}\n\n// endregion -------------------------------------------------------------------\n",
        "    check('    blank lines are attached to the block above (' + withBlanks + ' blocks carry spacing)', withBlanks > 0);\n}\n\n// endregion -------------------------------------------------------------------\n" + crlf_region)
t = sub(t, "console.log('\\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED') + '\\n');\n",
        "fs.rmSync(SCRATCH, { recursive : true, force : true });\n"
        "console.log('\\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED') + '\\n');\n")
ROUND = t

# ------------------------------------------------------------------------------------------- FIGURE TITLE
name2 = 'Na__Test__StatementFigureTitle__.test.mjs'
t = tv(REL + name2)
t = header(t, 'STATEMENT FIGURE TITLES',
           (name2, '1.0.0 (TrueVision3D v2.165.0, 29-Sep-2026; read at ' + PIN + ')'),
           FIXTURE_NOTE + [
               '- The RB05 region becomes the fixture region, run on both twins: exactly five figures (three',
               '  old captions taken in, two figures already titled, one of them switched off) in place of',
               '  "at least 23"; the CRLF twin converts to the same document as LF, line ends aside.',
               '- The legacy document is also taken in with CRLF line ends (K1 DR-37 item 1).',
           ],
           ['02-Oct-2026 - Version 1.0.1 ({{VVREL:W4-04}})',
            '- ValeVision3D: the committed fixture and its CRLF twin in place of RB05;',
            '  the legacy document with CRLF line ends (K1 DR-37 item 1).', ''])
t = sub(t, "const repoRoot = path.resolve(here, '..', '..', '..');\n", '')
old_rb05 = t[t.index('const RB05 = path.join('):t.index('// endregion', t.index('const RB05 = path.join('))]
t = sub(t, old_rb05,
        "// THE FIXTURE | ValeVision's committed statement, in place of the real RB05\n"
        "// Three old captions under pictures (a zero-width space and tabs, spaces, a\n"
        "// plain zero-width space), two figures already titled (one switched off), a\n"
        "// bare logo and a picture followed by prose - five figures once converted.\n"
        "const FIXTURE          = path.join(here, 'TestEnv__StatementFixtures', 'TestEnv__StatementFixture__DesignStatement__.md');\n"
        "const FIXTURE_CAPTIONS = 3;\n"
        "const FIXTURE_FIGURES  = 5;\n\n")
t = sub(t, "check('a second pass takes in nothing', Fig.Na__LeStmtFigMd__AdoptCaptions(adopted.Markdown).Count === 0);\n\nconsole.log('\\nThe real RB05",
        "check('a second pass takes in nothing', Fig.Na__LeStmtFigMd__AdoptCaptions(adopted.Markdown).Count === 0);\n"
        "const adoptedCrlf = Fig.Na__LeStmtFigMd__AdoptCaptions(LEGACY.replace(/\\n/g, '\\r\\n'));\n"
        "check('with CRLF line ends: the same two taken in, the same document, line ends aside',\n"
        "      adoptedCrlf.Count === 2 && adoptedCrlf.Markdown.replace(/\\r\\n/g, '\\n') === adopted.Markdown, adoptedCrlf.Count + ' taken');\n"
        "\nconsole.log('\\nThe real RB05")
old_tail = t[t.index("console.log('\\nThe real RB05"):t.index('// endregion', t.index("console.log('\\nThe real RB05"))]
t = sub(t, old_tail,
        "console.log('\\nThe fixture statement and its CRLF twin (ValeVision, in place of the real RB05 statement)');\n"
        "const FIXTURE_LF = fs.readFileSync(FIXTURE, 'utf8').replace(/\\r\\n/g, '\\n');\n"
        "const converted  = {};\n"
        "for (const [ label, text ] of [ [ 'LF', FIXTURE_LF ], [ 'CRLF', FIXTURE_LF.replace(/\\n/g, '\\r\\n') ] ]) {\n"
        "    console.log('  ' + label);\n"
        "    const result  = Fig.Na__LeStmtFigMd__AdoptCaptions(text);\n"
        "    const figures = Na__LeStmtMd__Tokenise(result.Markdown).filter((b) => b.Kind === 'html' && /^<figure\\b/.test(b.Html));\n"
        "    converted[label] = result.Markdown;\n"
        "    check('every old caption is taken in (' + result.Count + ' of ' + FIXTURE_CAPTIONS + ')', result.Count === FIXTURE_CAPTIONS);\n"
        "    check('every figure is one block (' + figures.length + ', exactly ' + FIXTURE_FIGURES + ')', figures.length === FIXTURE_FIGURES\n"
        "          && figures.every((b) => b.Html.split('\\n').length >= 4 && /<\\/figure>$/.test(b.Html)), figures.length + ' figures');\n"
        "    check('no old caption is left directly under a picture',\n"
        "          !Na__LeStmtMd__Tokenise(result.Markdown).some((b, i, all) => b.Kind === 'paragraph' && Fig.Na__LeStmtFigMd__IsCaption(b.Text)\n"
        "              && all[i - 1] && all[i - 1].Kind === 'html' && Fig.Na__LeStmtFigMd__IsPicture(all[i - 1].Html)));\n"
        "    check('the result still round-trips byte for byte', Na__LeStmtMd__Join(Na__LeStmtMd__Tokenise(result.Markdown)) === result.Markdown);\n"
        "    check('a second pass takes in nothing', Fig.Na__LeStmtFigMd__AdoptCaptions(result.Markdown).Count === 0);\n"
        "}\n"
        "check('the CRLF twin converts to the same document as LF, line ends aside', converted.CRLF.replace(/\\r\\n/g, '\\n') === converted.LF);\n\n")
FIG = t

for nm, text in ((name, ROUND), (name2, FIG)):
    assert '\r' not in text
    for bad in ('TRUEVISION3D', '30__TrueVision__AppContent', 'na-project-portal', 'repoRoot'):
        assert bad not in text, (nm, bad)
    target = os.path.join(OUT, nm) if DRY else VV + REL + nm
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if not DRY and os.path.exists(target):
        raise SystemExit('refusing to overwrite ' + target)
    with open(target, 'wb') as fh:
        fh.write(text.encode('utf-8'))
    print('wrote', target, len(text.encode('utf-8')))
