"""Read TV's devlog at the pin and list the releases that name the six register files (and their sign-off lines)."""
import os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
DEVLOG = os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md')
if not os.path.exists(DEVLOG):
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'], capture_output=True, check=True).stdout
    open(DEVLOG, 'wb').write(data)

lines = open(DEVLOG, encoding='utf-8').read().split('\n')
HEAD = re.compile(r'^## TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*-?\s*(.*)')
PAT = re.compile(sys.argv[1] if len(sys.argv) > 1 else r'Register__(Data|DeleteDialog|Transactions|Notes|Preview|Pdf)|Drawing Register|DrawingRegister')
KEYS = re.compile(r'(?i)(tried|sign(ed)?[- ]off|signed|not in valevision|confirmed by adam|adam confirmed|status:)')
sections = []
for i, line in enumerate(lines):
    m = HEAD.match(line)
    if m:
        sections.append([m.group(1), m.group(2), m.group(3), i])
for k, sec in enumerate(sections):
    end = sections[k + 1][3] if k + 1 < len(sections) else len(lines)
    body = lines[sec[3]:end]
    hits = [j for j, l in enumerate(body) if PAT.search(l)]
    if not hits:
        continue
    print('=' * 100)
    print('%s  %s  %s  (devlog:%d-%d)  hits %d' % (sec[0], sec[1], sec[2][:90], sec[3] + 1, end, len(hits)))
    for j in hits[:6]:
        print('   H %d: %s' % (sec[3] + j + 1, body[j].strip()[:170]))
    for j, l in enumerate(body):
        if KEYS.search(l):
            print('   S %d: %s' % (sec[3] + j + 1, l.strip()[:200]))
