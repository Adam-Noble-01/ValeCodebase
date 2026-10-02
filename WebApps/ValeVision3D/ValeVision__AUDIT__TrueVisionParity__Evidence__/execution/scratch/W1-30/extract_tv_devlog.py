import subprocess, os, re

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.dirname(os.path.abspath(__file__))

data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + 'TrueVision__DEVLOG__.md'], capture_output=True, check=True).stdout
path = os.path.join(OUT, 'TV__TrueVision__DEVLOG__at_pin.md')
with open(path, 'wb') as f:
    f.write(data)
text = data.decode('utf-8', errors='replace')
lines = text.split('\n')
print('devlog lines', len(lines))

# Release headings
heads = [(i + 1, l) for i, l in enumerate(lines) if re.match(r'^##\s', l)]
# Lines mentioning DocumentKeys / DocumentTabs
hits = [(i + 1, l) for i, l in enumerate(lines) if ('DocumentKeys' in l or 'DocumentTabs' in l or 'Doc__Save' in l)]

def release_for(n):
    best = None
    for hn, hl in heads:
        if hn <= n:
            best = (hn, hl)
        else:
            break
    return best

seen = set()
for n, l in hits:
    r = release_for(n)
    key = r[0] if r else None
    if key not in seen:
        seen.add(key)
        print('RELEASE', r)
    print('  ', n, l[:220])
