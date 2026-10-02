# W1-13 scratch: for each line of TV's devlog (read at the pin into tv/), name the release section it sits in.
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEVLOG = os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md')
HEAD = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*-?\s*(.*)$')


def main(argv):
    with open(DEVLOG, 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    heads = []
    for i, line in enumerate(lines, 1):
        m = HEAD.match(line)
        if m:
            heads.append((i, m.group(1), m.group(2), m.group(3).strip()))
    for arg in argv:
        n = int(arg)
        best = None
        for h in heads:
            if h[0] <= n:
                best = h
            else:
                break
        print('line %d -> %s' % (n, ('%s %s "%s" (devlog:%d)' % (best[1], best[2], best[3], best[0])) if best else 'none'))


if __name__ == '__main__':
    main(sys.argv[1:])
