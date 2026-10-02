"""W0 integrator gate - the final run of G1-G5 on the quiescent tree, after the gate's own two fixes.
Each command runs from the VV app root; full output to scratch/W0-GATE/FINAL__<gate>.txt; one summary line each."""
import os, re, subprocess, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
OUT = os.path.dirname(os.path.abspath(__file__))
TVR = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
GATE = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report\tools\k2_path_gate.py')
WRAP = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-02\path_gate_records_exempt.py')
T = '80__Testing__PrototypeEnvironment/'
env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1')

RUNS = [
    ('G1_ModuleGraph', ['node', T + 'Na__Verify__ModuleGraph__.mjs'], r'(\[\d\].*failure\(s\)|PASS|FAIL)'),
    ('G2_Exports', ['node', T + 'Na__Verify__Exports__.mjs'], r'(files checked.*|loader facade.*|PASS.*|FAIL.*)'),
    ('G3_PathGate_raw', [sys.executable, GATE, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G3_PathGate_recordsExempt', [sys.executable, WRAP, '--root', VVR], r'(checked:.*|RESULT:.*)'),
    ('G4_ParityNaming', ['node', T + 'Na__Verify__ParityNaming__.mjs'], r'(checked .*|baseline :.*|RESULT:.*)'),
    ('G4_PortNotes', ['node', T + 'Na__Verify__PortNotes__.mjs'], r'(checked  :.*|baseline :.*|PENDING.*|RESULT:.*)'),
    ('G4_UiParity_worktree', ['node', T + 'Na__Verify__UiParity__.mjs', TVR], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
    ('G4_UiParity_pin', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151'], r'(\[\d\] +(PASS|FAIL|WARN) +\w+|RESULT:.*)'),
    ('G5_suite', [sys.executable, os.path.join(OUT, 'run_g5.py'), 'final'], r'(G5 final:.*)'),
]
summary = []
for name, cmd, pat in RUNS:
    p = subprocess.run(cmd, cwd=VVR, capture_output=True, env=env)
    text = p.stdout.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    open(os.path.join(OUT, 'FINAL__' + name + '.txt'), 'w', encoding='utf-8', newline='\n').write(
        '$ ' + ' '.join(cmd) + '\n(cwd ' + VVR + ')\nexit ' + str(p.returncode) + '\n\n' + text)
    keys = [m.group(0).strip() for m in re.finditer(pat, text)]
    line = '%-28s exit=%d  %s' % (name, p.returncode, ' || '.join(dict.fromkeys(keys)))
    summary.append(line)
    print(line, flush=True)
open(os.path.join(OUT, 'FINAL__summary.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(summary) + '\n')
