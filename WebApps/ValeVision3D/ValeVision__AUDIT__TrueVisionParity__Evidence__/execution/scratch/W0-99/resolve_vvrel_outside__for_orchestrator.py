"""W0-99 hand-over: the seven Wave 0 release placeholders OUTSIDE the scribe's remit, for the orchestrator to resolve if
it authorises it (W0-99's brief limits its pass to VV 02/03/80; execution policy 4 keeps it out of WCP files).

  WebApps/Whitecardopedia/Server__ValeVisionShared__Lib__.py       {{VVREL:W0-09}} x2   (PORT NOTE, log)
  WebApps/Whitecardopedia/Server__ValeVisionSheetImages__Api__.py  {{VVREL:W0-18}} x1   (PORT NOTE)
  WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py   {{VVREL:W0-18}} x1   (PORT NOTE)
  WebApps/Whitecardopedia/Server__ValeVisionPublished__Api__.py    {{VVREL:W0-19}} x1   (PORT NOTE)
  WebApps/Whitecardopedia/Server__ValeVisionStatements__Api__.py   {{VVREL:W0-19}} x1   (PORT NOTE)
  WebApps/ValeVision3D/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md  {{VVREL:W0-16}} x1

Each becomes 'v2.71.1' (the Wave 0 release, already written in the devlog). Only the token bytes change.

  (default) --dry-run   build candidates in scratch/W0-99/outside_candidates/ and prove, for every .py: the AST is
                        identical to the live file's (a comment-only change), it compiles, and the whole candidate set
                        imports in a separate python process (bytecode off). Nothing live is written.
  --apply --authorised  (execution policy 3) the same proofs, then each file swapped atomically after a SHA-1 check;
                        then http://localhost:8000/api/check-localhost must answer 200 within 30 s (Adam's debug server
                        reloads on the save) - otherwise every pre-image is put back at once and the run fails.
  --restore             put the pre-images back (only over this tool's own output).
"""
import ast, hashlib, json, os, py_compile, shutil, subprocess, sys, tempfile, time, urllib.request

VCB = r'D:\10_CoreLib__ValeCodebase'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'outside_candidates')
PRE = os.path.join(HERE, 'outside_preimages')
VERSION = b'v2.71.1'
TARGETS = {
    'WebApps/Whitecardopedia/Server__ValeVisionShared__Lib__.py': (b'{{VVREL:W0-09}}', 2),
    'WebApps/Whitecardopedia/Server__ValeVisionSheetImages__Api__.py': (b'{{VVREL:W0-18}}', 1),
    'WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py': (b'{{VVREL:W0-18}}', 1),
    'WebApps/Whitecardopedia/Server__ValeVisionPublished__Api__.py': (b'{{VVREL:W0-19}}', 1),
    'WebApps/Whitecardopedia/Server__ValeVisionStatements__Api__.py': (b'{{VVREL:W0-19}}', 1),
    'WebApps/ValeVision3D/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md': (b'{{VVREL:W0-16}}', 1),
}


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def live(rel):
    return os.path.join(VCB, *rel.split('/'))


def build():
    plan = {}
    for rel, (tok, n) in TARGETS.items():
        b = open(live(rel), 'rb').read()
        if b.count(tok) != n or b.count(b'{{VVREL') != n:
            raise SystemExit('REFUSED: %s holds %d of %r (expected %d) and %d placeholders in all' % (
                rel, b.count(tok), tok, n, b.count(b'{{VVREL')))
        new = b.replace(tok, VERSION)
        plan[rel] = {'before': sha1(b), 'after': sha1(new), 'bytes': new, 'old': b}
        dst = os.path.join(OUT, *rel.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(new)
    return plan


def prove(plan):
    ok = True
    pys = [rel for rel in plan if rel.endswith('.py')]
    for rel in pys:
        same = ast.dump(ast.parse(plan[rel]['old'])) == ast.dump(ast.parse(plan[rel]['bytes']))
        tmpc = os.path.join(tempfile.mkdtemp(prefix='w0_99_pyc_'), 'x.pyc')
        py_compile.compile(os.path.join(OUT, *rel.split('/')), cfile=tmpc, doraise=True)
        print('  %-70s AST identical: %s, compiles: yes' % (rel, same))
        ok = ok and same
    # import the whole candidate set in a separate process, from a temp folder, bytecode off
    tmp = tempfile.mkdtemp(prefix='w0_99_import_')
    for rel in pys:
        shutil.copyfile(os.path.join(OUT, *rel.split('/')), os.path.join(tmp, os.path.basename(rel)))
    names = [os.path.basename(r)[:-3] for r in pys]
    code = ('import sys; sys.dont_write_bytecode = True; sys.path.insert(0, %r)\n'
            'import importlib\n'
            'for n in %r:\n'
            '    importlib.import_module(n)\n'
            'print("imported", len(%r))\n') % (tmp, names, names)
    p = subprocess.run([sys.executable, '-B', '-c', code], capture_output=True, cwd=tmp,
                       env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'))
    print('  separate-process import of the candidate set: exit %d %s' % (
        p.returncode, (p.stdout or p.stderr).decode('utf-8', 'replace').strip()[-200:]))
    shutil.rmtree(tmp, ignore_errors=True)
    return ok and p.returncode == 0


def check_localhost(timeout_s=30):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        try:
            with urllib.request.urlopen('http://localhost:8000/api/check-localhost', timeout=5) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main():
    args = sys.argv[1:]
    if '--restore' in args:
        for rel in TARGETS:
            pre = os.path.join(PRE, *rel.split('/'))
            if os.path.exists(pre):
                cur = open(live(rel), 'rb').read()
                cand = open(os.path.join(OUT, *rel.split('/')), 'rb').read()
                if sha1(cur) not in (sha1(cand), sha1(open(pre, 'rb').read())):
                    raise SystemExit('REFUSED: %s changed since this tool wrote it' % rel)
                open(live(rel), 'wb').write(open(pre, 'rb').read())
        print('restored; /api/check-localhost answers 200:', check_localhost())
        return
    plan = build()
    print('%d file(s), %d placeholder(s) -> %s' % (len(plan), sum(n for _, n in TARGETS.values()), VERSION.decode()))
    if not prove(plan):
        raise SystemExit('PROOF FAILED: nothing written')
    if '--apply' not in args:
        print('dry run only: candidates in', OUT)
        return
    if '--authorised' not in args:
        raise SystemExit('REFUSED: --apply needs --authorised (the orchestrator\'s go-ahead; W0-99 never ran this)')
    if not check_localhost(5):
        raise SystemExit('REFUSED: the local server does not answer before the swap')
    for rel in plan:
        pre = os.path.join(PRE, *rel.split('/'))
        os.makedirs(os.path.dirname(pre), exist_ok=True)
        open(pre, 'wb').write(plan[rel]['old'])
    done = []
    try:
        for rel in plan:
            cur = open(live(rel), 'rb').read()
            if sha1(cur) != plan[rel]['before']:
                raise RuntimeError('%s changed since the plan' % rel)
            tmp = live(rel) + '.w0-99.tmp'
            open(tmp, 'wb').write(plan[rel]['bytes'])
            os.replace(tmp, live(rel))
            done.append(rel)
        time.sleep(3)
        if not check_localhost(30):
            raise RuntimeError('/api/check-localhost did not answer 200 after the swap')
    except Exception as e:
        for rel in done:
            open(live(rel), 'wb').write(plan[rel]['old'])
        raise SystemExit('RESTORED every pre-image: %s; check-localhost now %s' % (e, check_localhost(30)))
    print('applied %d file(s); /api/check-localhost 200' % len(done))


if __name__ == '__main__':
    main()
