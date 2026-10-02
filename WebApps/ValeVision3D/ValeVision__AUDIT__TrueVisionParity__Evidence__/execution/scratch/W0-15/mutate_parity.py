"""Mutation checks for Na__Test__AppConfigParity__ (scratch only).

Writes mutated copies of the built config under scratch/W0-15/mutants/ and runs
the test against each with --vv-file; every mutant must FAIL (exit 1) and the
unmutated copy must PASS (exit 0).
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'out', 'Na__LayoutEditor__AppConfig__.json')
TEST = os.path.join(HERE, 'new', 'Na__Test__AppConfigParity__.test.mjs')
MUT = os.path.join(HERE, 'mutants')
os.makedirs(MUT, exist_ok=True)
base = open(SRC, encoding='utf-8').read()

mutants = {
    'unmutated': base,
    'planted_truevision_literal': base.replace('"ValeVision__DrawingNotes__.json"', '"TrueVision__DrawingNotes__.json"', 1),
    'unlisted_value_drift': base.replace('"LayoutEditor__Sheet__MarginMm": 5,', '"LayoutEditor__Sheet__MarginMm": 6,', 1),
    'lost_tv_key': base.replace('        "LayoutEditor__Navigation__AuthoringZoomMax": 64,\n', '', 1),
    'duplicate_key': base.replace('"LayoutEditor__Enabled": true,', '"LayoutEditor__Enabled": true,\n    "LayoutEditor__Enabled": true,', 1),
    'na_job_stage': base.replace('"LayoutEditor__DrawingRegister__Phases": []', '"LayoutEditor__DrawingRegister__Phases": [{ "Code": "T02", "Name": "Planning" }]', 1),
    'na_host': base.replace('https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/', 'https://www.noble-architecture.com/na-apps/30__TrueVision__CoreAppCode/', 1),
}
bad = 0
for name, text in mutants.items():
    if name != 'unmutated' and text == base:
        print('MUTATION DID NOT APPLY:', name)
        bad += 1
        continue
    path = os.path.join(MUT, name + '.json')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    r = subprocess.run(['node', TEST, '--vv-file', path], capture_output=True, text=True)
    want = 0 if name == 'unmutated' else 1
    ok = (r.returncode == want)
    bad += 0 if ok else 1
    print('%-28s exit %d (want %d) %s' % (name, r.returncode, want, 'OK' if ok else 'WRONG'))
sys.exit(1 if bad else 0)
