# W1-13 scratch: print, for named TV releases, the devlog lines that say whether Adam tried / signed off the
# release and whether it is in ValeVision (read from the devlog taken at the pin).
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEVLOG = os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md')
HEAD = re.compile(r'^## TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})')
KEYS = re.compile(r'(?i)(tried|sign(ed)?[- ]off|signed|ValeVision|confirm|not in vale)')


def main(argv):
    with open(DEVLOG, 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    sections = []
    for i, line in enumerate(lines):
        m = HEAD.match(line)
        if m:
            sections.append([m.group(1), m.group(2), i, None, lines[i + 1] if i + 1 < len(lines) else ''])
    for k in range(len(sections)):
        sections[k][3] = sections[k + 1][2] if k + 1 < len(sections) else len(lines)
    wanted = set(argv)
    for ver, date, start, end, title in sections:
        if ver not in wanted:
            continue
        print('=' * 100)
        print('%s  %s  (devlog:%d-%d)  %s' % (ver, date, start + 1, end, title))
        for j in range(start, end):
            if KEYS.search(lines[j]):
                print('  %d: %s' % (j + 1, lines[j][:200]))


if __name__ == '__main__':
    main(sys.argv[1:])
