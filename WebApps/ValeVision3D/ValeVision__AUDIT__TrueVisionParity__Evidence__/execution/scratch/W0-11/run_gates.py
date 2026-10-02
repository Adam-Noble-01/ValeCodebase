"""W0-11 scratch: run every gate this package reports, from the VV app root, and save each output to
scratch/W0-11/final_<gate>.txt. Read-only on the repository."""
import os
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = r'02__Src__AppModules\03__AppUtils\Na__AppUtils__ProjectLoader.js'

GATES = [
    ('node_check', ['node', '--check', TARGET]),
    ('G1_modulegraph', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs']),
    ('G2_exports', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs']),
    ('G3_pathgate_records_exempt', [sys.executable, os.path.join(HERE, '..', 'W0-02', 'path_gate_records_exempt.py'), '--root', VV]),
    ('W0-11_acceptance_test', ['node', os.path.join(HERE, 'Na__Test__ProjectLoaderIdentity__.test.mjs')]),
    ('G4_selfcheck', [sys.executable, os.path.join(HERE, 'g4_selfcheck.py')]),
]
for name in sorted(os.listdir(os.path.join(VV, '80__Testing__PrototypeEnvironment'))):
    if name.startswith('Na__Test__') and name.endswith('.test.mjs'):
        GATES.append(('G5_regression_' + name, ['node', '80__Testing__PrototypeEnvironment/' + name]))

summary = []
for name, cmd in GATES:
    proc = subprocess.run(cmd, cwd=VV, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (proc.stdout or '') + (proc.stderr or '')
    with open(os.path.join(HERE, 'final_%s.txt' % name), 'w', encoding='utf-8') as f:
        f.write('$ ' + ' '.join(cmd) + '\n' + out + '\nEXIT=%d\n' % proc.returncode)
    tail = [l for l in out.strip().splitlines() if l.strip()][-1:] or ['']
    summary.append('%-48s exit %d   %s' % (name, proc.returncode, tail[0][:110]))

print('\n'.join(summary))
