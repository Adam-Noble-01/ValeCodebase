# W1-18 scratch: read TrueVision's devlog at the pin and print, for the named releases, the section head and every
# line that names GradientTool / LineStyleTool or says whether Adam tried / signed off the release.
import os
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*-?\s*(.*)$')
KEYS = re.compile(r'(?i)(GradientTool|LineStyleTool|Gradient Tool|Line Style|tried|sign(ed)?[- ]off|confirm|ValeVision)')


def main(argv):
    path = os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md')
    if not os.path.exists(path):
        data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + 'TrueVision__DEVLOG__.md'],
                              stdout=subprocess.PIPE, check=True).stdout
        with open(path, 'wb') as fh:
            fh.write(data)
    with open(path, 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    sections = []
    for i, line in enumerate(lines):
        m = HEAD.match(line)
        if m:
            sections.append([m.group(1), m.group(2), i, None, m.group(3).strip()])
    for k in range(len(sections)):
        sections[k][3] = sections[k + 1][2] if k + 1 < len(sections) else len(lines)
    wanted = set(argv)
    for ver, date, start, end, title in sections:
        if ver not in wanted:
            continue
        print('=' * 110)
        print('%s  %s  (devlog:%d-%d)  %s' % (ver, date, start + 1, end, title))
        for j in range(start, end):
            if KEYS.search(lines[j]):
                print('  %d: %s' % (j + 1, lines[j][:260]))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:])
