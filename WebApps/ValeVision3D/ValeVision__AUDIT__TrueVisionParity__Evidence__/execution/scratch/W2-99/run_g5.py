"""W1 integrator gate - G5: run every node test (*.test.mjs, *.test.cjs) and every no-network python test
(*.test.py, plus the StatementServer --check self-test) in VV/80__Testing__PrototypeEnvironment from the VV app root.
Writes each test's full output to scratch/W1-GATE/G5__<tag>__<name>.txt and prints one summary line per test.
Read-only on the tree: the python tests drive Flask test clients over temp folders (no port is bound).
Usage: python run_g5.py <tag>
"""
import os, re, subprocess, sys, time

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TEST_DIR = os.path.join(VVR, '80__Testing__PrototypeEnvironment')
OUT = os.path.dirname(os.path.abspath(__file__))
tag = sys.argv[1] if len(sys.argv) > 1 else 'run1'

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

tests = []
for fn in sorted(os.listdir(TEST_DIR)):
    full = os.path.join(TEST_DIR, fn)
    if not os.path.isfile(full):
        continue
    if fn.endswith('.test.mjs') or fn.endswith('.test.cjs'):
        tests.append((fn, ['node', '80__Testing__PrototypeEnvironment/' + fn]))
    elif fn.endswith('.test.py'):
        tests.append((fn, [sys.executable, '80__Testing__PrototypeEnvironment/' + fn]))
tests.append(('Na__Test__StatementServer__.py --check', [sys.executable, '80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py', '--check']))

env = dict(os.environ)
env['PYTHONIOENCODING'] = 'utf-8'
env['PYTHONDONTWRITEBYTECODE'] = '1'
rows = []
for name, cmd in tests:
    t0 = time.time()
    try:
        p = subprocess.run(cmd, cwd=VVR, capture_output=True, env=env, timeout=600)
        rc, so, se = p.returncode, p.stdout or b'', p.stderr or b''
    except subprocess.TimeoutExpired as e:
        rc, so, se = 124, e.stdout or b'', (e.stderr or b'') + b'\nTIMEOUT after 600 s'
    dt = time.time() - t0
    out = so.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + se.decode('utf-8', 'replace')) if se else '')
    safe = name.replace(' ', '_').replace('--', '')
    with open(os.path.join(OUT, 'G5__%s__%s.txt' % (tag, safe)), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('$ ' + ' '.join(cmd) + '\n(cwd ' + VVR + ')\nexit ' + str(rc) + '\n\n' + out)
    lines = [l for l in out.splitlines() if l.strip()]
    tail = ' | '.join(l.strip() for l in lines[-3:])
    npass = len(re.findall(r'^\s*(?:\[?PASS\]?|ok\b|OK\b|\u2713|v )', out, re.M))
    nfail = len(re.findall(r'^\s*(?:\[?FAIL\]?|not ok\b|\u2717|x )', out, re.M))
    rows.append((name, rc, dt, tail, npass, nfail))
    print('%-46s exit=%d %6.1fs pass~%-4d fail~%-3d %s' % (name, rc, dt, npass, nfail, tail[:260]), flush=True)

bad = [r for r in rows if r[1] != 0]
print('\nG5 %s: %d test(s), %d pass, %d fail' % (tag, len(rows), len(rows) - len(bad), len(bad)))
for r in bad:
    print('  FAILED: %s (exit %d)' % (r[0], r[1]))
sys.exit(1 if bad else 0)
