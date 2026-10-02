# W1-25 scratch: run every VV node test (Na__Test__*.test.mjs / .cjs) from the VV app root, one by one,
# and summarise exit codes (W1-24's runner, logging into this package's folder). The tests write only to
# the OS temp folder (F.0).
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
VV = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
TESTS = os.path.join(VV, '80__Testing__PrototypeEnvironment')
LOG = os.path.join(HERE, 'logs', 'test__vv_node_suite%s.log' % (('__' + sys.argv[1]) if len(sys.argv) > 1 else ''))


def main():
    names = sorted(n for n in os.listdir(TESTS) if n.startswith('Na__Test__') and (n.endswith('.test.mjs') or n.endswith('.test.cjs')))
    lines, summary, failed = [], [], []
    for name in names:
        started = time.time()
        res = subprocess.run(['node', os.path.join('80__Testing__PrototypeEnvironment', name)], cwd=VV,
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        took = time.time() - started
        tail = (res.stdout + res.stderr).strip().splitlines()[-3:]
        lines.append('=== %s exit=%d (%.1f s)\n%s\n' % (name, res.returncode, took, (res.stdout + res.stderr)))
        summary.append('%-45s exit %d  %5.1f s  | %s' % (name, res.returncode, took, ' / '.join(t.strip() for t in tail)[:220]))
        if res.returncode != 0:
            failed.append(name)
    with open(LOG, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print('\n'.join(summary))
    print('SUITE: %d/%d exit 0%s' % (len(names) - len(failed), len(names), ('; non-zero: ' + ', '.join(failed)) if failed else ''))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
