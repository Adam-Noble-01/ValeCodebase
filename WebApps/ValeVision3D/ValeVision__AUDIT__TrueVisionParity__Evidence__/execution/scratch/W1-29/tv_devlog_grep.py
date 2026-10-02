# W1-29 scratch: read the TrueVision devlog at the pin and show the release entries that name KeyScope / the
# Hotkeys Manager 2.1.0 / ControlKeepsKey, so the PORT NOTE's Source version and the Port Record's release list
# come from TV's own record.
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8')
lines = data.split('\n')
open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-29\tv_devlog_at_pin.md', 'w', encoding='utf-8', newline='\n').write(data)

heads = [(i, l) for i, l in enumerate(lines) if re.match(r'^##\s+TrueVision3D\s+v2\.\d+\.\d+', l) or re.match(r'^##\s+.*v2\.\d+\.\d+', l)]
print('release headings:', len(heads))
pat = re.compile(sys.argv[1] if len(sys.argv) > 1 else r'KeyScope|ControlKeepsKey|Hotkeys__Manager|Three Keyboards|3dModelTab')
hits = {}
for i, l in enumerate(lines):
    if pat.search(l):
        # find heading above
        h = None
        for hi, hl in reversed(heads):
            if hi <= i:
                h = (hi, hl)
                break
        hits.setdefault(h, []).append((i + 1, l.strip()[:160]))
for h, ls in hits.items():
    print('\n==', (h[0] + 1) if h else None, h[1] if h else None)
    for n, t in ls[:12]:
        print('   ', n, t)
