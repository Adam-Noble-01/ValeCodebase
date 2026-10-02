# W0-04: patch VV 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs (CRLF file).
# Reads bytes, checks the SHA-1 against the G0 pre-image, applies exact-once replacements on an LF view,
# writes back with the file's own CRLF endings. --dry-run prints a unified diff and writes nothing.
import difflib, hashlib, os, sys

TARGET = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Verify__ModuleGraph__.mjs"
PRE_SHA1 = "baefc5a09f3aab0551b25115765598e8bb355a6d"

EDITS = [
    # 1. DESCRIPTION: one new bullet after the existing two
    (
        "//   by a vendor file that no app module imports directly.\n"
        "//\n"
        "// USAGE:\n",
        "//   by a vendor file that no app module imports directly.\n"
        "// - STRINGS ARE NOT CODE. The specifier scan reads a copy of each file in\n"
        "//   which the contents of every string literal are blanked - the quotes\n"
        "//   kept and every offset unchanged - and takes each specifier back from\n"
        "//   the real text at the same place. Before this, prose inside a string\n"
        "//   read as an import: TrueVision's scene editor builds the message\n"
        "//   'No 3D scenes in \"' + groupName + '\" to export', and the word export\n"
        "//   followed by a quote was taken for a re-export of whatever text ran to\n"
        "//   the next quote (S09 B13). A quoted string that reaches the end of its\n"
        "//   line is closed there, as JavaScript requires, so one misread quote\n"
        "//   cannot blank the code below it.\n"
        "//\n"
        "// USAGE:\n",
    ),
    # 2. PORT NOTE before the DEVELOPMENT LOG, and the new log entry
    (
        "//   Exit 0 = every specifier resolves. Exit 1 = at least one does not.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 10-Sep-2026 - Version 1.0.0\n",
        "//   Exit 0 = every specifier resolves. Exit 1 = at least one does not.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// PORT NOTE:\n"
        "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.20.0); TrueVision3D\n"
        "//                   carries the twin at the same path (1.0.0 at b2aa9151,\n"
        "//                   identical apart from the app names)\n"
        "// - Parity        : diverged (from 1.1.0)\n"
        "// - Divergences   :\n"
        "//   - String literal contents are blanked before the specifier scan, so\n"
        "//     prose in a string is never read as an import or export (1.1.0).\n"
        "// - Back-port     : TrueVision wants the same fix: its own walk stops on the\n"
        "//                   scene-editor string (21, its standing baseline since\n"
        "//                   v2.166.0). Recorded for the TrueVision lane (WP-S09-14,\n"
        "//                   DR-36); not done here.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.1.0 ({{VVREL:W0-04}})\n"
        "// - String literal contents are blanked before the specifier scan, and each\n"
        "//   specifier is read back from the real text at the same offsets, so a\n"
        "//   string such as '\" to export' is no longer read as a specifier (S09\n"
        "//   B13). With a copy of TrueVision's scene-editor string in the graph the\n"
        "//   walk exits 0; on this tree it walks exactly the modules 1.0.0 walked.\n"
        "//\n"
        "// 10-Sep-2026 - Version 1.0.0\n",
    ),
    # 3. The specifier pattern gains the d flag (match indices)
    (
        "    // Static import + dynamic import + re-export, all forms.\n"
        "    const Na__Verify__SpecifierPattern = /(?:^|[\\s;}])(?:import|export)\\s*(?:[\\s\\S]*?\\sfrom\\s*)?['\"]([^'\"]+)['\"]|import\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)/g;\n",
        "    // Static import + dynamic import + re-export, all forms. Run over the\n"
        "    // string-blanked copy; the d flag gives each specifier's offsets, which\n"
        "    // are read back from the real text.\n"
        "    const Na__Verify__SpecifierPattern = /(?:^|[\\s;}])(?:import|export)\\s*(?:[\\s\\S]*?\\sfrom\\s*)?['\"]([^'\"]+)['\"]|import\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)/gd;\n",
    ),
    # 4. The string blanker, after StripComments
    (
        "        return output;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Import Map\n",
        "        return output;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // FUNCTION | Blank the Contents of Every String Literal\n"
        "    // ------------------------------------------------------------\n"
        "    // Same length as the input, quotes kept, every character inside a\n"
        "    // string (and inside a template literal, its ${} parts included)\n"
        "    // replaced by a space, newlines kept. The specifier pattern then sees\n"
        "    // only code: the words import and export inside prose are gone, and\n"
        "    // each real specifier keeps its quotes, with blanks between them whose\n"
        "    // offsets point back at its text.\n"
        "    //\n"
        "    // A ' or \" string that reaches the end of its line is closed there:\n"
        "    // JavaScript allows no line break in one, so a quote misread out of a\n"
        "    // regular expression literal costs one line, never the file below it.\n"
        "    // Regular expression literals themselves are recognised by the usual\n"
        "    // rule (a / where an expression may start) and blanked too.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__Verify__MaskStrings(source) {\n"
        "        const output = source.split('');\n"
        "        const length = source.length;\n"
        "        const blank  = (at) => { if (output[at] !== '\\n' && output[at] !== '\\r') output[at] = ' '; };\n"
        "        let index    = 0;\n"
        "        let previous = '';                                                                       // <-- Last code character that was not white space\n"
        "        let word     = '';                                                                       // <-- Last identifier or keyword read\n"
        "\n"
        "        const regexMayStart = () => previous === '' || '(,=:[!&|?{};+-*%<>~^'.indexOf(previous) !== -1\n"
        "            || /^(?:return|typeof|instanceof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(word);\n"
        "\n"
        "        const skipQuoted = (quote) => {                                                          // <-- index sits on the opening quote\n"
        "            index += 1;\n"
        "            while (index < length) {\n"
        "                const char = source[index];\n"
        "                if (char === '\\\\') { blank(index); if (index + 1 < length) blank(index + 1); index += 2; continue; }\n"
        "                if (char === quote) { index += 1; return; }\n"
        "                if (char === '\\n' && quote !== '`') return;                                    // <-- Unterminated: closed at the line end\n"
        "                if (quote === '`' && char === '$' && source[index + 1] === '{') {\n"
        "                    blank(index); blank(index + 1); index += 2;\n"
        "                    let depth = 1;\n"
        "                    while (index < length && depth > 0) {\n"
        "                        const inner = source[index];\n"
        "                        if (inner === '\"' || inner === \"'\" || inner === '`') {\n"
        "                            const from = index;\n"
        "                            skipQuoted(inner);\n"
        "                            for (let at = from; at < index; at++) blank(at);\n"
        "                            continue;\n"
        "                        }\n"
        "                        if (inner === '{') depth += 1;\n"
        "                        else if (inner === '}') depth -= 1;\n"
        "                        blank(index);\n"
        "                        index += 1;\n"
        "                    }\n"
        "                    continue;\n"
        "                }\n"
        "                blank(index);\n"
        "                index += 1;\n"
        "            }\n"
        "        };\n"
        "\n"
        "        while (index < length) {\n"
        "            const char = source[index];\n"
        "            if (char === '\"' || char === \"'\" || char === '`') {\n"
        "                skipQuoted(char);\n"
        "                previous = char;\n"
        "                word     = '';\n"
        "                continue;\n"
        "            }\n"
        "            if (char === '/' && regexMayStart()) {                                               // <-- A regular expression literal\n"
        "                let at = index + 1;\n"
        "                let inClass = false;\n"
        "                while (at < length && source[at] !== '\\n') {\n"
        "                    const inner = source[at];\n"
        "                    if (inner === '\\\\') { at += 2; continue; }\n"
        "                    if (inner === '[') inClass = true;\n"
        "                    else if (inner === ']') inClass = false;\n"
        "                    else if (inner === '/' && !inClass) break;\n"
        "                    at += 1;\n"
        "                }\n"
        "                if (at < length && source[at] === '/') {                                          // <-- Closed on its own line: blank its body\n"
        "                    for (let k = index + 1; k < at; k++) blank(k);\n"
        "                    index = at + 1;\n"
        "                    while (index < length && /[a-z]/i.test(source[index])) index += 1;           // <-- Flags\n"
        "                    previous = ')';                                                              // <-- A regex is a value\n"
        "                    word     = '';\n"
        "                    continue;\n"
        "                }\n"
        "            }\n"
        "            if (/[A-Za-z0-9_$]/.test(char)) {\n"
        "                let end = index;\n"
        "                while (end < length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;\n"
        "                word     = source.slice(index, end);\n"
        "                previous = source[end - 1];\n"
        "                index    = end;\n"
        "                continue;\n"
        "            }\n"
        "            if (!/\\s/.test(char)) { previous = char; word = ''; }\n"
        "            index += 1;\n"
        "        }\n"
        "        return output.join('');\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Import Map\n",
    ),
    # 5. The walk scans the blanked copy and reads specifiers back from the real text
    (
        "            let source;\n"
        "            try { source = Na__Verify__StripComments(readFileSync(currentFile, 'utf8')); } catch { continue; }\n"
        "\n"
        "            Na__Verify__SpecifierPattern.lastIndex = 0;\n"
        "            let match;\n"
        "            while ((match = Na__Verify__SpecifierPattern.exec(source)) !== null) {\n"
        "                const specifier = match[1] || match[2];\n"
        "                if (!specifier) continue;\n",
        "            let source;\n"
        "            try { source = Na__Verify__StripComments(readFileSync(currentFile, 'utf8')); } catch { continue; }\n"
        "            const masked = Na__Verify__MaskStrings(source);                                      // <-- Strings blanked; offsets unchanged\n"
        "\n"
        "            Na__Verify__SpecifierPattern.lastIndex = 0;\n"
        "            let match;\n"
        "            while ((match = Na__Verify__SpecifierPattern.exec(masked)) !== null) {\n"
        "                const span      = match.indices[1] || match.indices[2];\n"
        "                const specifier = span ? source.slice(span[0], span[1]) : null;                 // <-- Read back from the real text\n"
        "                if (!specifier) continue;\n",
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
            print("STOP: anchor found %d times:\n%s" % (count, old[:200]))
            sys.exit(3)
        new = new.replace(old, rep)
    out = new.replace("\n", "\r\n").encode("utf-8")
    if "--dry-run" in sys.argv:
        sys.stdout.writelines(difflib.unified_diff(text.splitlines(True), new.splitlines(True), "a/ModuleGraph", "b/ModuleGraph"))
        return
    if "--preview" in sys.argv:                                   # <-- the patched text, into this scratch folder only
        dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview__Na__Verify__ModuleGraph__.mjs")
        with open(dst, "wb") as f:
            f.write(out)
        print("preview written", dst)
        return
    with open(TARGET, "wb") as f:
        f.write(out)
    print("written", TARGET, len(out), "bytes, sha1", hashlib.sha1(out).hexdigest())


main()
