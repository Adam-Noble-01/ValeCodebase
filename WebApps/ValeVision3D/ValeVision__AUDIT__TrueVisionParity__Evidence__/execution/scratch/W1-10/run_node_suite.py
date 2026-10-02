# Scratch (W1-10): run every 80__Testing__PrototypeEnvironment/Na__Test__*.test.mjs from the VV app root
# and record each exit code and its last lines. Read-only on the repository (the tests write only to the
# OS temp folder, per their own headers). Usage: python -B run_node_suite.py <label>
import os, subprocess, sys, glob, time

APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
label = sys.argv[1] if len(sys.argv) > 1 else 'run'
tests = sorted(glob.glob(os.path.join(APP, '80__Testing__PrototypeEnvironment', 'Na__Test__*.test.mjs')))
lines = []
for path in tests:
    rel = os.path.relpath(path, APP).replace('\\', '/')
    started = time.time()
    try:
        proc = subprocess.run(['node', rel], cwd=APP, capture_output=True, timeout=600)
        out = (proc.stdout + proc.stderr).decode('utf-8', 'replace')
        code = proc.returncode
    except subprocess.TimeoutExpired:
        out, code = 'TIMEOUT', 'timeout'
    tail = [l for l in out.strip().splitlines() if l.strip()][-3:]
    lines.append('%-70s exit %s  (%.1fs)  | %s' % (os.path.basename(path), code, time.time() - started, ' / '.join(t.strip()[:140] for t in tail)))
    print(lines[-1], flush=True)
with open(os.path.join(HERE, 'suite_%s.txt' % label), 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines) + '\n')
