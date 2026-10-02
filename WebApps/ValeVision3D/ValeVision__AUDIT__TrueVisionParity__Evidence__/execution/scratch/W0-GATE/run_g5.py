"""W0 integrator gate - G5: run every node test (*.test.mjs, *.test.cjs) and every no-network python test
(*.test.py, plus the StatementServer --check self-test) in VV/80__Testing__PrototypeEnvironment from the VV app root.
Writes each test's full output to scratch/W0-GATE/G5__<name>.txt and prints one summary line per test.
Read-only on the tree: every test drives Flask test clients over temp folders (no port is bound, nothing live is touched).
"""
import os, subprocess, sys, time

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TEST_DIR = os.path.join(VVR, '80__Testing__PrototypeEnvironment')
OUT = os.path.dirname(os.path.abspath(__file__))
tag = sys.argv[1] if len(sys.argv) > 1 else 'run1'

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
    p = subprocess.run(cmd, cwd=VVR, capture_output=True, env=env)
    dt = time.time() - t0
    out = (p.stdout or b'').decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    safe = name.replace(' ', '_').replace('--', '')
    with open(os.path.join(OUT, 'G5__%s__%s.txt' % (tag, safe)), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('$ ' + ' '.join(cmd) + '\n(cwd ' + VVR + ')\nexit ' + str(p.returncode) + '\n\n' + out)
    lines = [l for l in out.splitlines() if l.strip()]
    tail = ' | '.join(l.strip() for l in lines[-3:])
    rows.append((name, p.returncode, dt, tail))
    print('%-48s exit=%d  %5.1fs  %s' % (name, p.returncode, dt, tail[:300]), flush=True)

bad = [r for r in rows if r[1] != 0]
print('\nG5 %s: %d test(s), %d pass, %d fail' % (tag, len(rows), len(rows) - len(bad), len(bad)))
sys.exit(1 if bad else 0)
