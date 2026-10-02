# W1-06 scratch: read TrueVision's devlog at the pin (read-only) and print the entries that name the modules
# this package ports, with their release headings and any sign-off wording nearby.
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
SPEC = PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'

TERMS = ['DraftMaths', 'DrawingUsage', 'DevRowShell', 'DraftGuard', 'RowAccordion', 'RenameDrawing',
         'Modal', 'altLabel', 'Drawing Panel Shell', 'Styles__DevMenu', 'StageFloorPlan', 'StageHolders',
         'DrawingDrafts', 'isCommit', 'footnote']

def main():
    out = subprocess.run(['git', '-C', NAWEB, 'show', SPEC], capture_output=True)
    if out.returncode != 0:
        print(out.stderr.decode('utf-8', 'replace'))
        return 2
    lines = out.stdout.decode('utf-8', 'replace').replace('\r\n', '\n').split('\n')
    heading = None
    heading_line = 0
    hits = {}
    for i, line in enumerate(lines, 1):
        if re.match(r'^#{1,3}\s+TrueVision3D\s+v2\.\d+\.\d+', line) or re.match(r'^##\s+.*v2\.\d+\.\d+', line):
            heading = line.strip()
            heading_line = i
        for t in TERMS:
            if t in line:
                key = (heading_line, heading)
                hits.setdefault(key, []).append((i, t, line.strip()[:200]))
    want = sys.argv[1:]
    for (hl, h), items in sorted(hits.items()):
        if want and not any(w in (h or '') for w in want):
            continue
        print('-' * 100)
        print('%6d %s' % (hl, h))
        for (i, t, text) in items[:12]:
            print('   %6d [%s] %s' % (i, t, text))
    return 0

if __name__ == '__main__':
    sys.exit(main())
