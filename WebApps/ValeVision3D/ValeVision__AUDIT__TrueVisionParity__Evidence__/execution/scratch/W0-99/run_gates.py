"""W0-99 Parity Scribe - fresh run of G1-G5 on the wave's final tree (same commands as the integrator's gate).

Each command runs from the VV app root; full output goes to scratch/W0-99/gates__<tag>/<gate>.txt and one summary
line per gate goes to gates__<tag>/SUMMARY.txt. Read-only on the tree: the python tests drive Flask test clients over
temp folders (PYTHONDONTWRITEBYTECODE=1, no port bound), the node tests write only to the OS temp folder.
Usage: python -B run_gates.py <tag>
"""
import os, re, subprocess, sys, time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TVR = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
EVID = os.path.join(VVR, 'ValeVision__AUDIT__TrueVisionParity__Evidence__')
GATE3 = os.path.join(EVID, 'parity', 'report', 'tools', 'k2_path_gate.py')
WRAP3 = os.path.join(EVID, 'execution', 'scratch', 'W0-02', 'path_gate_records_exempt.py')
T = '80__Testing__PrototypeEnvironment/'
tag = sys.argv[1] if len(sys.argv) > 1 else 'run'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gates__' + tag)
os.makedirs(OUT, exist_ok=True)
env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1')

RUNS = [
    ('G1_ModuleGraph', ['node', T + 'Na__Verify__ModuleGraph__.mjs'], r'(\[\d\].*failure\(s\)|PASS|FAIL)'),
    ('G2_Exports', ['node', T + 'Na__Verify__Exports__.mjs'], r'(files checked.*|loader facade.*|PASS.*|FAIL.*)'),
    ('G3_PathGate_raw', [sys.executable, '-B', GATE3, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G3_PathGate_recordsExempt', [sys.executable, '-B', WRAP3, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G4_ParityNaming', ['node', T + 'Na__Verify__ParityNaming__.mjs'], r'(checked .*|baseline :.*|RESULT:.*)'),
    ('G4_PortNotes', ['node', T + 'Na__Verify__PortNotes__.mjs'], r'(checked  :.*|baseline :.*|PENDING.*|RESULT:.*)'),
    ('G4_PortNotes_scribe', ['node', T + 'Na__Verify__PortNotes__.mjs', '--scribe'], r'(checked  :.*|baseline :.*|PENDING.*|RESULT:.*)'),
    ('G4_UiParity_worktree', ['node', T + 'Na__Verify__UiParity__.mjs', TVR], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
    ('G4_UiParity_pin', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151'], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
]

summary = []


def run(name, cmd, pat=None):
    t0 = time.time()
    p = subprocess.run(cmd, cwd=VVR, capture_output=True, env=env)
    dt = time.time() - t0
    text = p.stdout.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    with open(os.path.join(OUT, name.replace(' ', '_').replace('--', '') + '.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('$ ' + ' '.join(cmd) + '\n(cwd ' + VVR + ')\nexit ' + str(p.returncode) + '\n\n' + text)
    if pat:
        keys = [m.group(0).strip() for m in re.finditer(pat, text)]
        tail = ' || '.join(dict.fromkeys(keys))
    else:
        lines = [l for l in text.splitlines() if l.strip()]
        tail = ' | '.join(l.strip() for l in lines[-3:])
    return p.returncode, dt, tail


for name, cmd, pat in RUNS:
    code, dt, tail = run(name, cmd, pat)
    line = '%-28s exit=%d  %5.1fs  %s' % (name, code, dt, tail)
    summary.append(line)
    print(line, flush=True)

# G5: every node test and every no-network python test, as the integrator ran them
tests = []
TD = os.path.join(VVR, '80__Testing__PrototypeEnvironment')
for fn in sorted(os.listdir(TD)):
    if not os.path.isfile(os.path.join(TD, fn)):
        continue
    if fn.endswith('.test.mjs') or fn.endswith('.test.cjs'):
        tests.append((fn, ['node', T + fn]))
    elif fn.endswith('.test.py'):
        tests.append((fn, [sys.executable, '-B', T + fn]))
tests.append(('Na__Test__StatementServer__.py --check', [sys.executable, '-B', T + 'Na__Test__StatementServer__.py', '--check']))
g5 = []
for name, cmd in tests:
    code, dt, tail = run('G5__' + name, cmd)
    g5.append((name, code))
    line = '  G5 %-46s exit=%d  %5.1fs  %s' % (name, code, dt, tail[:260])
    summary.append(line)
    print(line, flush=True)
bad = [n for n, c in g5 if c != 0]
line = 'G5_suite                     %d test(s), %d pass, %d fail%s' % (len(g5), len(g5) - len(bad), len(bad),
                                                                     (' - ' + ', '.join(bad)) if bad else '')
summary.append(line)
print(line)
with open(os.path.join(OUT, 'SUMMARY.txt'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('\n'.join(summary) + '\n')
