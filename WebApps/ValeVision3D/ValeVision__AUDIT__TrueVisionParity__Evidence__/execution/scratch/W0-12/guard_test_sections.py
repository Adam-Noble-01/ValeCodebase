# W0-12 - make every section of the transport facade test run inside a guard, so a facade that throws is reported
# as a failing check (with its stack) instead of ending the run; and settle the "unreadable keys" call explicitly.
# Edits only the test file W0-12 created (LF), each change exactly once.
import sys

sys.dont_write_bytecode = True

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__TransportFacade__.test.mjs'

text = open(PATH, 'rb').read().decode('utf-8')
assert '\r\n' not in text
lines = text.split('\n')

out = []
open_blocks = 0
index = 0
while index < len(lines):
    line = lines[index]
    if line == '    {' and index + 1 < len(lines) and lines[index + 1].startswith("        section('"):
        out.append('    await RunSection(async () => {')
        open_blocks += 1
        index += 1
        # copy until the matching close at indent 4
        while index < len(lines):
            inner = lines[index]
            if inner == '    }':
                out.append('    });')
                index += 1
                break
            out.append(inner)
            index += 1
        continue
    out.append(line)
    index += 1

text = '\n'.join(out)
if open_blocks != 11:
    raise SystemExit(f'expected 11 section blocks, found {open_blocks}')

helper_anchor = "    function section(title) { console.log('\\n' + title); }\n"
helper = (helper_anchor +
          "\n"
          "    // A SECTION RUNS INSIDE A GUARD | a facade that throws is a failing check, with its stack, not the end of the run\n"
          "    async function RunSection(body) {\n"
          "        try {\n"
          "            await body();\n"
          "        } catch (error) {\n"
          "            check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\\n').slice(0, 4).join(' | ') : String(error));\n"
          "        }\n"
          "    }\n"
          "\n"
          "    // SETTLE A CALL | its answer, or { threw } when it threw or rejected\n"
          "    async function Settle(call) {\n"
          "        try {\n"
          "            return await call();\n"
          "        } catch (error) {\n"
          "            return { threw : true, error : String(error) };\n"
          "        }\n"
          "    }\n")
if text.count(helper_anchor) != 1:
    raise SystemExit('helper anchor not found once')
text = text.replace(helper_anchor, helper)

old_call = "        const nothing = await cf.Na__CfApi__MergeAndSaveKeys(undefined);\n"
new_call = "        const nothing = await Settle(() => cf.Na__CfApi__MergeAndSaveKeys(undefined));\n"
if text.count(old_call) != 1:
    raise SystemExit('unreadable-keys call not found once')
text = text.replace(old_call, new_call)

old_check = "check('an empty merge is a no-op success; an unreadable one resolves with an error (never throws)', empty.ok === true && nothing.ok === false && world.log.length === before);"
new_check = "check('an empty merge is a no-op success; an unreadable one resolves with an error (never throws)', empty.ok === true && nothing.ok === false && !nothing.threw && world.log.length === before, nothing);"
if text.count(old_check) != 1:
    raise SystemExit('unreadable-keys check not found once')
text = text.replace(old_check, new_check)

open(PATH, 'wb').write(text.encode('utf-8'))
print('sections guarded:', open_blocks)
