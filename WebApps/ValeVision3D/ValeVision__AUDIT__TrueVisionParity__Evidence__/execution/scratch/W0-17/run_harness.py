# =============================================================================
# W0-17 scratch - runs every start-up harness scenario, one Node process each
# =============================================================================
# Usage: python -B run_harness.py [index.html]   (default: the live VV index.html)
# Writes harness_results.json and prints one line per check. Read-only on VV.
# =============================================================================

import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SCENARIOS = ['drawings', 'nodrawings', 'authoringoff', 'livehost', 'race-new', 'race-old']


def main():
    index = sys.argv[1] if len(sys.argv) > 1 else r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\index.html'
    summary = {}
    all_ok = True
    for name in SCENARIOS:
        r = subprocess.run(['node', '--import', './w0_17_register.mjs', 'w0_17_startup_harness.mjs', name, index],
                           cwd=HERE, capture_output=True, text=True, encoding='utf-8')
        try:
            data = json.loads(r.stdout)
        except Exception:
            data = {'scenario': name, 'pass': False, 'checks': [], 'raw_stdout': r.stdout[-2000:], 'raw_stderr': r.stderr[-2000:]}
        data['exit_code'] = r.returncode
        summary[name] = data
        ok = data.get('pass') is True and r.returncode == 0
        all_ok = all_ok and ok
        passed = sum(1 for c in data.get('checks', []) if c['ok'])
        print(f'[{name}] exit {r.returncode}  {passed}/{len(data.get("checks", []))} checks  ' + ('PASS' if ok else 'FAIL'))
        for c in data.get('checks', []):
            print(('   ok   ' if c['ok'] else '   FAIL ') + c['name'])
        if data.get('errors'):
            print('   console.error lines: ' + str(len(data['errors'])))
        if 'raw_stderr' in data:
            print(data['raw_stderr'])
    (HERE / 'harness_results.json').write_text(json.dumps(summary, indent=1), encoding='utf-8')
    print('OVERALL: ' + ('PASS' if all_ok else 'FAIL'))
    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
