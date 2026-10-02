# W1-22 scratch: run every ValeVision node test (80__Testing__PrototypeEnvironment/*.test.mjs) from the app
# root, one process each, and write a one-line summary per test plus each test's log into this folder.
# The tests write only to the OS temp folder (their own headers say so). Usage: python -B run_node_suite.py
import glob
import os
import subprocess
import time

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    tests = sorted(glob.glob(os.path.join(VV, '80__Testing__PrototypeEnvironment', '*.test.mjs')))
    lines = []
    failed = 0
    for path in tests:
        name = os.path.basename(path)
        start = time.time()
        res = subprocess.run(['node', os.path.relpath(path, VV)], cwd=VV, capture_output=True, timeout=300)
        took = time.time() - start
        out = (res.stdout + res.stderr).decode('utf-8', 'replace')
        open(os.path.join(HERE, 'suite__' + name.replace('.test.mjs', '') + '.log'), 'w', encoding='utf-8').write(out)
        last = [l.strip() for l in out.strip().splitlines() if l.strip()]
        lines.append('%-44s exit %d  %.1fs  %s' % (name, res.returncode, took, last[-1][:100] if last else ''))
        failed += 1 if res.returncode != 0 else 0
    summary = '\n'.join(lines) + '\n\n%d test file(s), %d failed\n' % (len(tests), failed)
    open(os.path.join(HERE, 'test__vv_node_suite.summary.log'), 'w', encoding='utf-8').write(summary)
    print(summary)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
