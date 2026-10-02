"""W1 gate (continuation, C2) - extra checks: verifier self-tests (the gates still bite), the UI parity gate in BLOCKING mode for the
checks whose owners have landed (1 fold, 2 strip, 3 veil: W1-33, W1-34), AppConfigParity --strict, and git apply --check
of the three W0 prepared patches against today's live files. Full outputs to scratch/W1-GATE/C2/<TAG>__EXTRA__*.txt.
Usage: python run_extras.py <TAG>. Read-only."""
import os, re, subprocess, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
VCB = r'D:\10_CoreLib__ValeCodebase'
OUT = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
TVR = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
T = '80__Testing__PrototypeEnvironment/'
TAG = sys.argv[1] if len(sys.argv) > 1 else 'RUN1'
env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
RUNS = [
    ('SELFTEST_ParityNaming', ['node', T + 'Na__Verify__ParityNaming__.mjs', '--self-test'], VVR),
    ('SELFTEST_PortNotes', ['node', T + 'Na__Verify__PortNotes__.mjs', '--self-test'], VVR),
    ('SELFTEST_UiParity', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151', '--self-test'], VVR),
    ('SELFTEST_Exports', ['node', T + 'Na__Verify__Exports__.mjs', '--self-test'], VVR),
    ('UiParity_block123_pin', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151', '--block', '1,2,3'], VVR),
    ('UiParity_blockAll_pin', ['node', T + 'Na__Verify__UiParity__.mjs', TVR, '--pin', 'b2aa9151', '--block', 'all'], VVR),
    ('AppConfigParity_strict', ['node', T + 'Na__Test__AppConfigParity__.test.mjs', '--strict'], VVR),
    ('ApplyCheck_W0-07', ['git', '-C', VCB, 'apply', '--check', os.path.join(EXEC, 'prepared', 'W0-07.patch')], VCB),
    ('ApplyCheck_W0-08', ['git', '-C', VCB, 'apply', '--check', os.path.join(EXEC, 'prepared', 'W0-08.patch')], VCB),
    ('ApplyCheck_W0-10', ['git', '-C', VCB, 'apply', '--check', os.path.join(EXEC, 'prepared', 'W0-10.patch')], VCB),
]
for name, cmd, cwd in RUNS:
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, env=env)
    text = p.stdout.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    with open(os.path.join(OUT, TAG + '__EXTRA__' + name + '.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('$ ' + ' '.join(cmd) + '\n(cwd ' + cwd + ')\nexit ' + str(p.returncode) + '\n\n' + text)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    keys = [l for l in lines if re.search(r'RESULT|PASS|FAIL|passed|failed|self-test|STALE|error', l, re.I)]
    print('%-26s exit=%d  %s' % (name, p.returncode, ' || '.join((keys or lines)[-3:])[:400]), flush=True)
