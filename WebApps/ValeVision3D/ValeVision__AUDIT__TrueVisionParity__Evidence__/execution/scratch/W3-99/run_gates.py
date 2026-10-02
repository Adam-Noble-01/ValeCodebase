"""W2 integrator gate - one run of G1-G5 on the quiescent tree.
Each command runs from the VV app root; full output to scratch/W2-GATE/<TAG>__<gate>.txt; one summary line each.
Usage: python run_gates.py <TAG>     (e.g. RUN1, FINAL)
Read-only on the tree (the tests use temp folders and Flask test clients; PYTHONDONTWRITEBYTECODE=1)."""
import os, re, subprocess, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
OUT = os.path.dirname(os.path.abspath(__file__))
TVR = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
EXEC = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
WRAP = os.path.join(EXEC, r'tools\path_gate_records_exempt.py')
RAW = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report\tools\k2_path_gate.py')
T = '80__Testing__PrototypeEnvironment/'
TAG = sys.argv[1] if len(sys.argv) > 1 else 'RUN1'
env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

RUNS = [
    ('G1_ModuleGraph', ['node', T + 'Na__Verify__ModuleGraph__.mjs'], r'(\[\d\].*failure\(s\)|PASS.*|FAIL.*)'),
    ('G2_Exports', ['node', T + 'Na__Verify__Exports__.mjs'], r'(files checked.*|loader facade.*|PASS.*|FAIL.*)'),
    ('G3_PathGate_recordsExempt', [sys.executable, WRAP, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G3_PathGate_raw', [sys.executable, RAW, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G4_ParityNaming', ['node', T + 'Na__Verify__ParityNaming__.mjs'], r'(checked .*|baseline :.*|RESULT:.*)'),
    ('G4_PortNotes', ['node', T + 'Na__Verify__PortNotes__.mjs'], r'(checked  :.*|baseline :.*|PENDING.*|RESULT:.*)'),
    ('G4_UiParity_worktree', ['node', T + 'Na__Verify__UiParity__.mjs', TVR], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
    ('G4_UiParity_pin', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151'], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
    ('G5_suite', [sys.executable, os.path.join(OUT, 'run_g5.py'), TAG], r'(G5 \w+:.*|FAILED:.*)'),
]
only = set(sys.argv[2:])
summary = []
for name, cmd, pat in RUNS:
    if only and name not in only:
        continue
    p = subprocess.run(cmd, cwd=VVR, capture_output=True, env=env)
    text = p.stdout.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    with open(os.path.join(OUT, TAG + '__' + name + '.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('$ ' + ' '.join(cmd) + '\n(cwd ' + VVR + ')\nexit ' + str(p.returncode) + '\n\n' + text)
    keys = [m.group(0).strip() for m in re.finditer(pat, text)]
    line = '%-28s exit=%d  %s' % (name, p.returncode, ' || '.join(dict.fromkeys(keys)))
    summary.append(line)
    print(line, flush=True)
with open(os.path.join(OUT, TAG + '__summary.txt'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('\n'.join(summary) + '\n')
