"""W1-99: final state of the three records this pass wrote, against the candidates it built. Read-only."""
import hashlib, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
RECORDS = [
    ('ValeVision__DEVLOG__.md', 'devlog__candidate.md', 'ValeVision__DEVLOG__.md'),
    ('ValeVision__PARITY__TrueVisionLedger__.md', 'ledger__candidate.md', 'ValeVision__PARITY__TrueVisionLedger__.md'),
    ('ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md', 'plan__candidate.md',
     'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md'),
]


def sha1(b):
    return hashlib.sha1(b).hexdigest()


for live, cand, pre in RECORDS:
    b = open(os.path.join(VV, live), 'rb').read()
    c = open(os.path.join(HERE, cand), 'rb').read()
    p = open(os.path.join(HERE, 'preimage_records', pre), 'rb').read()
    print('%-55s live %s (%d bytes, %d CRLF / %d LF)  candidate %s  pre-image %s (%d bytes)  live==candidate: %s' % (
        live, sha1(b)[:8], len(b), b.count(b'\r\n'), b.count(b'\n'), sha1(c)[:8], sha1(p)[:8], len(p), b == c))
d = open(os.path.join(VV, 'ValeVision__DEVLOG__.md'), 'rb').read().decode('utf-8')
heads = [ln for ln in d.split('\r\n') if re.match(r'^## ValeVision3D v\d+\.\d+\.\d+ - ', ln)]
print('devlog headings 1-2:')
for h in heads[:2]:
    print('  ' + h)
