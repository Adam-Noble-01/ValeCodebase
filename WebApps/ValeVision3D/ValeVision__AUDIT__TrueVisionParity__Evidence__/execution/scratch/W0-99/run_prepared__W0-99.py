"""W0 gate (extra): re-run the prepared (staged-only) packages' own tests against their staged copies.
W0-07 sync pipeline (boto3 blocked, in-memory S3 stub, temp folders), W0-08 service worker logic + registrar (vm sandbox,
fake fetch), W0-10 worker project files + merge keys (worker.fetch called directly on an in-memory R2 bucket).
Nothing live is read or written by these tests. Outputs go to scratch/W0-GATE/PREP__*.txt."""
import os, subprocess, sys, time
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
PREP = os.path.join(EXEC, 'prepared')
OUT = os.path.join(EXEC, 'scratch', 'W0-99', 'prepared_tests')
W7 = os.path.join(PREP, 'W0-07', 'WebApps', 'Whitecardopedia')
W10 = os.path.join(PREP, 'W0-10', 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
tests = [
    ('W0-07 SyncPipeline', [sys.executable, 'Tools__DevUtils/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py'], W7),
    ('W0-08 SW Logic', ['node', 'prepared/W0-08/00__Tests__W0-08/Na__Test__PwaServiceWorkerLogic__.test.mjs'], EXEC),
    ('W0-08 SW Registrar', ['node', 'prepared/W0-08/00__Tests__W0-08/Na__Test__PwaServiceWorkerRegistrar__.test.mjs'], EXEC),
    ('W0-10 ProjectFiles', ['node', 'tests/Na__Test__EditorWorker__ProjectFiles__.test.mjs'], W10),
    ('W0-10 MergeKeys', ['node', 'tests/Na__Test__EditorWorker__MergeKeys__.test.mjs'], W10),
]
env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1')
bad = 0
for name, cmd, cwd in tests:
    t0 = time.time()
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, env=env)
    out = p.stdout.decode('utf-8', 'replace') + (('\n--- stderr ---\n' + p.stderr.decode('utf-8', 'replace')) if p.stderr else '')
    open(os.path.join(OUT, 'PREP__' + name.replace(' ', '_') + '.txt'), 'w', encoding='utf-8', newline='\n').write('$ ' + ' '.join(cmd) + '\n(cwd ' + cwd + ')\nexit ' + str(p.returncode) + '\n\n' + out)
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    tail = ' | '.join(lines[-2:])
    bad += p.returncode != 0
    print('%-20s exit=%d %5.1fs  %s' % (name, p.returncode, time.time() - t0, tail[:260]), flush=True)
print('prepared tests: %d run, %d failed' % (len(tests), bad))
sys.exit(1 if bad else 0)
