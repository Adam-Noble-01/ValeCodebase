# W2-27 scratch: build two runners of TrueVision's Na__Test__VectorTools__.test.mjs (read at the pin) that load
# ValeVision's shipped files instead of TrueVision's. The test file itself is W3-07's to land in VV (its edits
# list); this package only runs it.
#   run__pure.mjs : the pure-module part (Geometry, Curves, Offset) - the Keys region removed
#   run__full.mjs : the whole test, Keys region included (informational: VV's KeyMap and key file)
# The only change to TrueVision's text is the SCRIPT_DIR line (pointed at VV's 80__Testing folder) and, in the
# pure runner, the Keys region cut out.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'tv', '80__Testing__PrototypeEnvironment', 'Na__Test__VectorTools__.test.mjs')
VV_TEST_DIR = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment'

text = open(SRC, 'rb').read().decode('utf-8')
old = "    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));\n"
if text.count(old) != 1:
    raise SystemExit('STOP: SCRIPT_DIR line not found once')
full = text.replace(old, "    const SCRIPT_DIR = '" + VV_TEST_DIR + "';\n")

rule = '// ' + '-' * 77 + '\n'
k = full.index(rule + '// REGION | The Keys\n')
r = full.index(rule + '// REGION | Result\n')
pure = full[:k] + full[r:]
if 'KeyMap' in pure or 'Hotkeys' in pure.split('// DEVELOPMENT LOG:')[1].split('import {')[1]:
    raise SystemExit('STOP: the pure runner still touches the keys')

for name, body in (('run__pure.mjs', pure), ('run__full.mjs', full)):
    with open(os.path.join(HERE, name), 'wb') as fh:
        fh.write(body.encode('utf-8'))
    print(name, len(body), 'bytes')
