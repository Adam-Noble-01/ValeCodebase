# W0-04: patch VV 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs (CRLF file).
# Reads bytes, checks the SHA-1 against the G0 pre-image, applies exact-once replacements on an LF view,
# writes back with the file's own CRLF endings. --dry-run prints a unified diff; --preview writes the
# patched text into this scratch folder only.
import difflib, hashlib, os, sys

TARGET = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Verify__Exports__.mjs"
PRE_SHA1 = "220a29a2615116eb7b32bbc0af761de4180ff5b3"

EDITS = [
    # 1. DESCRIPTION, USAGE, PORT NOTE and the log
    (
        "// - Static, so it runs without a browser and covers modules no page loads yet.\n"
        "//\n"
        "// USAGE:\n"
        "//     node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs [subdir ...]\n"
        "//\n"
        "//   With no arguments it checks every module under 02__Src__AppModules.\n"
        "//   Exit 0 = every imported name is exported. Exit 1 = at least one is not.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 10-Sep-2026 - Version 1.0.0\n",
        "// - Static, so it runs without a browser and covers modules no page loads yet.\n"
        "// - THE LOADER FACADE. The Layout Editor loads lazily: its loader\n"
        "//   (51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js)\n"
        "//   imports the editor's entry modules with literal import() calls and\n"
        "//   then reaches every name by property - editor.mode.Na__LeMode__Enter() -\n"
        "//   which no import statement shows, so a renamed or missing editor export\n"
        "//   passed both harnesses and failed only in the browser. Pass 3 reads the\n"
        "//   parts Na__LeLoad__ImportEditor names (mode, model, spec, config,\n"
        "//   viewport3d, pdf; a part added there is picked up), finds every\n"
        "//   <part>.Na__<Name> property in the loader and in each module that imports\n"
        "//   the loader, and proves the part's module exports that Name (S09 B13).\n"
        "// - A RUN THAT CHECKS NOTHING FAILS. A [subdir] argument is relative to\n"
        "//   02__Src__AppModules, and a wrong one used to check 0 files and pass\n"
        "//   (K3 gate G2 asks for a count above 0).\n"
        "//\n"
        "// USAGE:\n"
        "//     node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs [subdir ...] [--self-test]\n"
        "//\n"
        "//   With no arguments it checks every module under 02__Src__AppModules.\n"
        "//   --self-test proves pass 3 on copies of the loader held in memory: as it\n"
        "//   stands it passes, and a deliberately misspelt Na__LeMode__ or\n"
        "//   Na__LeModel__ name fails.\n"
        "//   Exit 0 = every imported name is exported. Exit 1 = at least one is not.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// PORT NOTE:\n"
        "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026); TrueVision3D carries\n"
        "//                   the twin at the same path (1.0.0 at b2aa9151, identical apart\n"
        "//                   from the app names)\n"
        "// - Parity        : diverged (from 1.1.0)\n"
        "// - Divergences   :\n"
        "//   - Pass 3, the loader facade names: TrueVision has no loader (its editor\n"
        "//     loads with the page, DR-24), so it has nothing to check there.\n"
        "//   - A run that checks no file fails.\n"
        "// - Back-port     : the zero-file rule only, offered with the TrueVision lane\n"
        "//                   (WP-S09-14, DR-36); not done here.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.1.0 ({{VVREL:W0-04}})\n"
        "// - Pass 3: every editor.<part>.Na__<Name> the Layout Editor loader facade\n"
        "//   calls is proved exported by the module Na__LeLoad__ImportEditor binds to\n"
        "//   that part; --self-test plants a misspelt name in memory and sees it fail.\n"
        "// - A run that checks 0 files fails instead of passing.\n"
        "//\n"
        "// 10-Sep-2026 - Version 1.0.0\n",
    ),
    # 2. Pass 3 helpers, before the Run region
    (
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Run\n"
        "// -----------------------------------------------------------------------------\n",
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Loader Facade\n"
        "// -----------------------------------------------------------------------------\n"
        "\n"
        "    const LOADER_PATH = resolve(SRC_ROOT, '51__System__LayoutEditor', '01__Core__Loader', 'Na__LayoutEditor__Loader__.js');\n"
        "\n"
        "    // FUNCTION | Read the Parts Na__LeLoad__ImportEditor Binds\n"
        "    // ------------------------------------------------------------\n"
        "    // Promise.all([ import('a'), import('b'), ... ]).then(([ mode, model, ... ]) => ...):\n"
        "    // the n-th name is the n-th module. Returns Map(part -> module path), or\n"
        "    // null when the function cannot be read.\n"
        "    // ------------------------------------------------------------\n"
        "    function FacadeParts(loaderPath, source) {\n"
        "        const code  = StripComments(source);\n"
        "        const start = code.indexOf('function Na__LeLoad__ImportEditor');\n"
        "        if (start === -1) return null;\n"
        "        const then = code.indexOf('.then(', start);\n"
        "        if (then === -1) return null;\n"
        "        const specs = Array.from(code.slice(start, then).matchAll(/import\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)/g)).map((m) => m[1]);\n"
        "        const names = code.slice(then).match(/^\\.then\\(\\s*\\(\\s*\\[([^\\]]*)\\]\\s*\\)/);\n"
        "        if (!names) return null;\n"
        "        const parts = names[1].split(',').map((p) => p.trim()).filter(Boolean);\n"
        "        if (!parts.length || parts.length !== specs.length) return null;\n"
        "        return new Map(parts.map((part, at) => [ part, resolve(dirname(loaderPath), specs[at]) ]));\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // FUNCTION | Check Every <part>.Na__<Name> a File Reaches Through the Facade\n"
        "    // ------------------------------------------------------------\n"
        "    // Returns { calls, failures : [{ file, line, part, name, reason }] }.\n"
        "    // ------------------------------------------------------------\n"
        "    function FacadeFailures(file, source, parts) {\n"
        "        const code     = StripComments(source);\n"
        "        const names    = Array.from(parts.keys()).map((p) => p.replace(/[$]/g, '\\\\$')).join('|');\n"
        "        const pattern  = new RegExp('(?:\\\\.|\\\\?\\\\.)(' + names + ')(?:\\\\.|\\\\?\\\\.)(Na__[A-Za-z0-9_$]+)', 'g');\n"
        "        const failures = [];\n"
        "        let calls = 0;\n"
        "        let match;\n"
        "        while ((match = pattern.exec(code)) !== null) {\n"
        "            calls += 1;\n"
        "            const target = parts.get(match[1]);\n"
        "            const info   = ExportsOf(target);\n"
        "            if (info.missing) {\n"
        "                failures.push({ file, line : code.slice(0, match.index).split('\\n').length, part : match[1], name : match[2], reason : 'the part\\'s module was not found (' + relative(APP_ROOT, target) + ')' });\n"
        "            } else if (!info.hasWildcard && !info.names.has(match[2])) {\n"
        "                failures.push({ file, line : code.slice(0, match.index).split('\\n').length, part : match[1], name : match[2], reason : 'not exported by ' + relative(APP_ROOT, target) });\n"
        "            }\n"
        "        }\n"
        "        return { calls, failures };\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // FUNCTION | Pass 3 Over the Loader and Every Module That Imports It\n"
        "    // ------------------------------------------------------------\n"
        "    // loaderSource lets the self-test hand in a planted copy.\n"
        "    // ------------------------------------------------------------\n"
        "    function FacadeCheck(fileList, loaderSource) {\n"
        "        const parts = FacadeParts(LOADER_PATH, loaderSource);\n"
        "        if (!parts) return { parts : null, calls : 0, files : 0, failures : [ { file : LOADER_PATH, line : 0, part : '-', name : 'Na__LeLoad__ImportEditor', reason : 'its import() list and the names it binds could not be read' } ] };\n"
        "        const users = fileList.filter((f) => f !== LOADER_PATH && /from\\s*['\"][^'\"]*Na__LayoutEditor__Loader__\\.js['\"]/.test(StripComments(readFileSync(f, 'utf8'))));\n"
        "        let calls = 0;\n"
        "        const failures = [];\n"
        "        [ [ LOADER_PATH, loaderSource ], ...users.map((f) => [ f, readFileSync(f, 'utf8') ]) ].forEach(([ file, source ]) => {\n"
        "            const result = FacadeFailures(file, source, parts);\n"
        "            calls += result.calls;\n"
        "            failures.push(...result.failures);\n"
        "        });\n"
        "        return { parts, calls, files : users.length + 1, failures };\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Run\n"
        "// -----------------------------------------------------------------------------\n",
    ),
    # 3. Arguments: flags apart from subdirs; the self-test; the zero-file rule; pass 3
    (
        "    const args    = process.argv.slice(2);\n"
        "    const roots   = args.length > 0 ? args.map(a => resolve(SRC_ROOT, a)) : [SRC_ROOT];\n"
        "    const files   = roots.flatMap(r => (existsSync(r) ? CollectJsFiles(r) : []));\n"
        "    const exportCache = new Map();\n",
        "    const args    = process.argv.slice(2);\n"
        "    const flags   = args.filter(a => a.startsWith('--'));\n"
        "    const subdirs = args.filter(a => !a.startsWith('--'));\n"
        "    const unknown = flags.filter(f => f !== '--self-test');\n"
        "    if (unknown.length) { console.log('Unknown option ' + unknown.join(', ') + ' (usage: [subdir ...] [--self-test])'); process.exit(2); }\n"
        "    const roots   = subdirs.length > 0 ? subdirs.map(a => resolve(SRC_ROOT, a)) : [SRC_ROOT];\n"
        "    const files   = roots.flatMap(r => (existsSync(r) ? CollectJsFiles(r) : []));\n"
        "    const exportCache = new Map();\n",
    ),
    (
        "    console.log('ValeVision3D - named export resolution');\n"
        "    console.log(`  files checked : ${files.length}`);\n"
        "    console.log('');\n",
        "    // ---------------------------------------------------------------\n"
        "    // SELF-TEST | Pass 3 on copies of the loader held in memory\n"
        "    // ---------------------------------------------------------------\n"
        "    if (flags.includes('--self-test')) {\n"
        "        const all      = CollectJsFiles(SRC_ROOT);\n"
        "        const original = readFileSync(LOADER_PATH, 'utf8');\n"
        "        const plant    = (from, to) => (original.indexOf(from) === -1 ? null : original.split(from).join(to));\n"
        "        const cases    = [\n"
        "            [ 'the loader as it stands: every facade name is exported', FacadeCheck(all, original), (r) => r.parts && r.failures.length === 0 && r.calls > 0 ],\n"
        "            [ 'a deliberately misspelt Na__LeMode__ name fails (Na__LeMode__Enter -> Na__LeMode__Entr)',\n"
        "              FacadeCheck(all, plant('.Na__LeMode__Enter(', '.Na__LeMode__Entr(') || ''), (r) => r.failures.some((f) => f.name === 'Na__LeMode__Entr') ],\n"
        "            [ 'a misspelt Na__LeModel__ name fails (Na__LeModel__GetSheets -> Na__LeModel__GetSheetz)',\n"
        "              FacadeCheck(all, plant('.Na__LeModel__GetSheets(', '.Na__LeModel__GetSheetz(') || ''), (r) => r.failures.some((f) => f.name === 'Na__LeModel__GetSheetz') ],\n"
        "            [ 'an import() list whose bound names cannot be read fails rather than passing',\n"
        "              FacadeCheck(all, original.replace(/\\.then\\(\\s*\\(\\s*\\[[^\\]]*\\]\\s*\\)/, '.then((modules)')), (r) => !r.parts && r.failures.length > 0 ]\n"
        "        ];\n"
        "        console.log('ValeVision3D - named export resolution, pass 3 self-test (copies of the loader in memory)');\n"
        "        let failed = 0;\n"
        "        cases.forEach(([ name, result, ok ]) => { const pass = ok(result); if (!pass) failed++; console.log((pass ? '  PASS  ' : '  FAIL  ') + name); });\n"
        "        console.log(failed === 0 ? '\\n  Every self-test case passed (' + cases.length + ').' : '\\n  ' + failed + ' self-test case(s) FAILED.');\n"
        "        process.exit(failed === 0 ? 0 : 1);\n"
        "    }\n"
        "\n"
        "    console.log('ValeVision3D - named export resolution');\n"
        "    console.log(`  files checked : ${files.length}`);\n"
        "\n"
        "    // ---------------------------------------------------------------\n"
        "    // ZERO FILES | a wrong [subdir] argument checks nothing: that is a failure\n"
        "    // ---------------------------------------------------------------\n"
        "    if (files.length === 0) {\n"
        "        console.log('');\n"
        "        console.log('  FAIL - no files checked: a [subdir] argument is relative to 02__Src__AppModules.');\n"
        "        process.exit(1);\n"
        "    }\n"
        "\n"
        "    // ---------------------------------------------------------------\n"
        "    // PASS 3 | The loader facade's editor names (when the loader is in the checked set)\n"
        "    // ---------------------------------------------------------------\n"
        "    const facade = files.includes(LOADER_PATH) ? FacadeCheck(files, readFileSync(LOADER_PATH, 'utf8')) : null;\n"
        "    if (facade) {\n"
        "        console.log(`  loader facade : ${facade.calls} editor name(s) reached through ${facade.parts ? Array.from(facade.parts.keys()).join(', ') : '(parts unreadable)'} in ${facade.files} file(s)`);\n"
        "    }\n"
        "    console.log('');\n"
        "    const facadeFailures = facade ? facade.failures : [];\n"
        "    const PrintFacade = () => {\n"
        "        if (facadeFailures.length === 0) return;\n"
        "        console.log('');\n"
        "        console.log(`  FAIL - ${facadeFailures.length} loader facade name(s) not exported:`);\n"
        "        console.log('');\n"
        "        for (const f of facadeFailures) {\n"
        "            console.log(`    ${relative(APP_ROOT, f.file)}${f.line ? ':' + f.line : ''}`);\n"
        "            console.log(`        \"${f.part}.${f.name}\"  ->  ${f.reason}`);\n"
        "        }\n"
        "    };\n",
    ),
    # 4. Exit paths report pass-3 failures too
    (
        "        if (failures.length > 0) {\n"
        "            console.log('');\n"
        "            console.log(`  ...and ${failures.length} unresolved import(s), listed below.`);\n"
        "            for (const f of failures) {\n"
        "                console.log(`    ${relative(APP_ROOT, f.file)}`);\n"
        "                console.log(`        \"${f.name}\"  from  \"${f.from}\"  ->  ${f.reason}`);\n"
        "            }\n"
        "        }\n"
        "        process.exit(1);\n"
        "    }\n"
        "\n"
        "    if (failures.length === 0) {\n"
        "        console.log('  PASS - every named import resolves to a real export,');\n"
        "        console.log('         and every Na__ identifier used is imported or declared.');\n"
        "        process.exit(0);\n"
        "    }\n"
        "\n"
        "    console.log(`  FAIL - ${failures.length} unresolved name(s):`);\n"
        "    console.log('');\n"
        "    for (const f of failures) {\n"
        "        console.log(`    ${relative(APP_ROOT, f.file)}`);\n"
        "        console.log(`        \"${f.name}\"  from  \"${f.from}\"  ->  ${f.reason}`);\n"
        "    }\n"
        "    process.exit(1);\n",
        "        if (failures.length > 0) {\n"
        "            console.log('');\n"
        "            console.log(`  ...and ${failures.length} unresolved import(s), listed below.`);\n"
        "            for (const f of failures) {\n"
        "                console.log(`    ${relative(APP_ROOT, f.file)}`);\n"
        "                console.log(`        \"${f.name}\"  from  \"${f.from}\"  ->  ${f.reason}`);\n"
        "            }\n"
        "        }\n"
        "        PrintFacade();\n"
        "        process.exit(1);\n"
        "    }\n"
        "\n"
        "    if (failures.length === 0 && facadeFailures.length === 0) {\n"
        "        console.log('  PASS - every named import resolves to a real export,');\n"
        "        console.log('         and every Na__ identifier used is imported or declared'\n"
        "                    + (facade ? ',\\n         and every editor name the loader facade calls is exported.' : '.'));\n"
        "        process.exit(0);\n"
        "    }\n"
        "\n"
        "    if (failures.length > 0) {\n"
        "        console.log(`  FAIL - ${failures.length} unresolved name(s):`);\n"
        "        console.log('');\n"
        "        for (const f of failures) {\n"
        "            console.log(`    ${relative(APP_ROOT, f.file)}`);\n"
        "            console.log(`        \"${f.name}\"  from  \"${f.from}\"  ->  ${f.reason}`);\n"
        "        }\n"
        "    }\n"
        "    PrintFacade();\n"
        "    process.exit(1);\n",
    ),
]


def main():
    raw = open(TARGET, "rb").read()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != PRE_SHA1:
        print("STOP: file changed since the G0 pre-image (sha1 %s, expected %s)" % (sha, PRE_SHA1))
        sys.exit(3)
    if b"\r\n" not in raw or raw.count(b"\n") != raw.count(b"\r\n"):
        print("STOP: expected a pure CRLF file")
        sys.exit(3)
    text = raw.decode("utf-8").replace("\r\n", "\n")
    new = text
    for old, rep in EDITS:
        count = new.count(old)
        if count != 1:
            print("STOP: anchor found %d times:\n%s" % (count, old[:300]))
            sys.exit(3)
        new = new.replace(old, rep)
    out = new.replace("\n", "\r\n").encode("utf-8")
    if "--dry-run" in sys.argv:
        sys.stdout.writelines(difflib.unified_diff(text.splitlines(True), new.splitlines(True), "a/Exports", "b/Exports"))
        return
    if "--preview" in sys.argv:
        dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview__Na__Verify__Exports__.mjs")
        with open(dst, "wb") as f:
            f.write(out)
        print("preview written", dst)
        return
    with open(TARGET, "wb") as f:
        f.write(out)
    print("written", TARGET, len(out), "bytes, sha1", hashlib.sha1(out).hexdigest())


main()
