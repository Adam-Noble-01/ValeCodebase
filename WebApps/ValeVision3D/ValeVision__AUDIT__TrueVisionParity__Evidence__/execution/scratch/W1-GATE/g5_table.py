"""W1 gate: one row per G5 test of a run (tag): exit code, PASS-line count, FAIL-line count, the summary line. Read-only."""
import glob, os, re, sys
OUT = os.path.dirname(os.path.abspath(__file__))
tag = sys.argv[1] if len(sys.argv) > 1 else 'FINAL'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
for fp in sorted(glob.glob(os.path.join(OUT, 'G5__%s__*.txt' % tag))):
    text = open(fp, encoding='utf-8').read()
    m = re.search(r'^exit (\d+)', text, re.M)
    body = text.split('\n\n', 1)[1] if '\n\n' in text else text
    npass = len(re.findall(r'^\s*(PASS|pass|ok)\b', body, re.M))
    nfail = len(re.findall(r'^\s*(FAIL|fail|not ok)\b', body, re.M))
    lines = [l.strip() for l in body.splitlines() if l.strip() and not l.startswith('--- stderr')]
    summary = lines[-1] if lines else ''
    name = os.path.basename(fp)[len('G5__%s__' % tag):-4]
    print('| %s | %s | %d | %d | %s |' % (name, m.group(1) if m else '?', npass, nfail, summary[:110]))
