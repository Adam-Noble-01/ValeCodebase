"""Scratch probe: run the ported Ortho test with ShapeTool read from TrueVision's pin (W3-07's source)
and Toolbar read from TrueVision's pin (W5-01's source) for the axes test. Nothing live is touched."""
import subprocess, os

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SC = os.path.join(VV, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W3-05')

def tv(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/' + rel],
                          capture_output=True, check=True).stdout

shape = os.path.join(SC, 'tv_ShapeTool.js'); open(shape, 'wb').write(tv('02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js'))
tb = os.path.join(SC, 'tv_Toolbar.js'); open(tb, 'wb').write(tv('02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js'))

def probe(test, needle, repl_path):
    src = open(os.path.join(VV, '80__Testing__PrototypeEnvironment', test), 'r', encoding='utf-8').read()
    # SCRIPT_DIR -> the real test folder so SRC stays the live tree; only one file is redirected.
    src = src.replace("const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));",
                      "const SCRIPT_DIR = " + repr(os.path.join(VV, '80__Testing__PrototypeEnvironment')) + ";", 1)
    src = src.replace("readFileSync(resolve(SRC, relative), 'utf8')",
                      "readFileSync(relative.endsWith(" + repr(needle) + ") ? " + repr(repl_path) + " : resolve(SRC, relative), 'utf8')")
    src = src.replace("readFileSync(resolve(SRC, LE + '40__Ui__Panels/Na__LayoutEditor__Toolbar__.js'), 'utf8')",
                      "readFileSync(" + repr(repl_path) + ", 'utf8')")
    out = os.path.join(SC, 'probe_' + test)
    open(out, 'w', encoding='utf-8').write(src)
    r = subprocess.run(['node', out], capture_output=True)
    text = r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace')
    fails = [l for l in text.splitlines() if l.strip().startswith('FAIL')]
    print(test, 'exit', r.returncode, 'PASS', sum(1 for l in text.splitlines() if l.strip().startswith('PASS')), 'FAIL', len(fails))
    for l in fails: print('   ', l)

probe('Na__Test__OrthoMode__.test.mjs', 'Na__LayoutEditor__ShapeTool__.js', shape)
probe('Na__Test__DrawingAxes__.test.mjs', 'Na__LayoutEditor__Toolbar__.js', tb)
