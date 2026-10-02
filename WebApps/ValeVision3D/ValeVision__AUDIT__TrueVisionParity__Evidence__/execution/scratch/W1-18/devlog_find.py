# W1-18 scratch: search TrueVision's devlog (read at the pin, saved in tv/) for a pattern and name the release section
# each hit sits in.
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*-?\s*(.*)$')


def main(pattern):
    with open(os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md'), 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    current = None
    rx = re.compile(pattern)
    for i, line in enumerate(lines, 1):
        m = HEAD.match(line)
        if m:
            current = '%s %s (devlog:%d) %s' % (m.group(1), m.group(2), i, (lines[i] if i < len(lines) else '')[:90])
            continue
        if rx.search(line):
            print('%d: [%s]\n      %s' % (i, current, line[:200]))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1])
