# W2-09 scratch: run every node test in the VV test folder from the app root (sanity, not a package gate),
# one process each, with a timeout; print exit codes and the last line of each.
import glob
import os
import subprocess
import sys

VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TESTS = sorted(glob.glob(os.path.join(VV_APP, '80__Testing__PrototypeEnvironment', 'Na__Test__*.test.mjs'))
               + glob.glob(os.path.join(VV_APP, '80__Testing__PrototypeEnvironment', 'Na__Test__*.test.cjs')))
failed = []
for path in TESTS:
    rel = os.path.relpath(path, VV_APP).replace(os.sep, '/')
    try:
        run = subprocess.run(['node', rel], cwd=VV_APP, capture_output=True, timeout=240)
        out = (run.stdout + run.stderr).decode('utf-8', 'replace').strip().splitlines()
        code = run.returncode
    except subprocess.TimeoutExpired:
        out, code = ['TIMEOUT'], 'timeout'
    last = out[-1].strip() if out else ''
    print('%-8s %-60s %s' % ('exit ' + str(code), os.path.basename(path), last[:110]))
    if code != 0:
        failed.append(rel)
print('')
print('%d test file(s), %d exit 0, %d not: %s' % (len(TESTS), len(TESTS) - len(failed), len(failed), ', '.join(failed) or '-'))
sys.exit(1 if failed else 0)
