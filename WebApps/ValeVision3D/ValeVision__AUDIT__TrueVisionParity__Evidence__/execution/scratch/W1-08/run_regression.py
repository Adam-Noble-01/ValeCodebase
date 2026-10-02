# W1-08 scratch: run every node test in 80__Testing__PrototypeEnvironment from the app root and report exit codes.
import os
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TESTS = os.path.join(VV, '80__Testing__PrototypeEnvironment')
names = sorted(n for n in os.listdir(TESTS) if n.endswith(('.test.mjs', '.test.cjs')))
failed = []
for name in names:
    run = subprocess.run(['node', '80__Testing__PrototypeEnvironment/' + name], cwd=VV, capture_output=True, text=True, timeout=600)
    tail = [l for l in (run.stdout + run.stderr).strip().splitlines() if l.strip()][-1:] or ['']
    print('%-55s exit %d  %s' % (name, run.returncode, tail[0].strip()[:110]))
    if run.returncode != 0:
        failed.append(name)
print('\n%d node test file(s), %d exit 0, %d failed: %s' % (len(names), len(names) - len(failed), len(failed), ', '.join(failed) or '-'))
sys.exit(1 if failed else 0)
