# W1-29 scratch: run every VV 80__Testing__PrototypeEnvironment/*.test.mjs from the VV app root and report exit codes.
# Usage: python run_node_tests.py <label>   -> writes node_tests_<label>.txt beside this file.
import os
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
label = sys.argv[1] if len(sys.argv) > 1 else 'run'
TESTS = os.path.join(VV, '80__Testing__PrototypeEnvironment')

lines = []
names = sorted(n for n in os.listdir(TESTS) if n.endswith('.test.mjs'))
ok = 0
for name in names:
    rel = '80__Testing__PrototypeEnvironment/' + name
    proc = subprocess.run(['node', rel], cwd=VV, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
    tail = (proc.stdout.strip().splitlines() or [''])[-1][:140]
    lines.append(f'{name:55s} exit {proc.returncode}  | {tail}')
    if proc.returncode == 0:
        ok += 1
lines.append(f'{ok}/{len(names)} exit 0')
out = os.path.join(HERE, f'node_tests_{label}.txt')
open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
