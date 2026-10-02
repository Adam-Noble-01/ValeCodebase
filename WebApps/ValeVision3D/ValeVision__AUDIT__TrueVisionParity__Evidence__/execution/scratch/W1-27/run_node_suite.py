# W1-27 scratch: run every VV node test (Na__Test__*.test.mjs / .cjs) from the VV app root, one by one, and
# summarise exit codes (W1-25 / W1-26's runner, logging into this package's folder). The tests write only to the OS
# temp folder (F.0).   python -B run_node_suite.py <label>
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TESTS = os.path.join(VV, '80__Testing__PrototypeEnvironment')


def main(argv):
    label = argv[0] if argv else 'run'
    log = os.path.join(HERE, 'logs', 'suite__%s.log' % label)
    os.makedirs(os.path.dirname(log), exist_ok=True)
    names = sorted(n for n in os.listdir(TESTS) if n.startswith('Na__Test__') and (n.endswith('.test.mjs') or n.endswith('.test.cjs')))
    lines, summary, failed = [], [], []
    for name in names:
        started = time.time()
        res = subprocess.run(['node', os.path.join('80__Testing__PrototypeEnvironment', name)], cwd=VV,
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
        took = time.time() - started
        tail = (res.stdout + res.stderr).strip().splitlines()[-2:]
        lines.append('=== %s exit=%d (%.1f s)\n%s\n' % (name, res.returncode, took, (res.stdout + res.stderr)))
        summary.append('%-45s exit %d  %5.1f s  | %s' % (name, res.returncode, took, ' / '.join(t.strip() for t in tail)[:200]))
        if res.returncode != 0:
            failed.append(name)
    with open(log, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print('\n'.join(summary))
    print('SUITE %s: %d/%d exit 0%s' % (label, len(names) - len(failed), len(names), ('; non-zero: ' + ', '.join(failed)) if failed else ''))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
