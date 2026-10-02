# -*- coding: utf-8 -*-
# W1-19 scratch: for each named TrueVision release, print its title and every line in its
# section that mentions Adam or ValeVision (to read the sign-off / tried-by-Adam status).
#
# Usage: python -B devlog_adam_lines.py <tv_devlog.md> v2.71.0 v2.104.0 ...

import re
import sys

HEAD = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v\d+\.\d+\.\d+)\b')
WANT = re.compile(r'(Adam|ValeVision|sign-?off|signed)', re.I)


def main(argv):
    path = argv[0]
    targets = argv[1:]
    with open(path, 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    heads = []
    for i, line in enumerate(lines):
        m = HEAD.match(line)
        if m:
            heads.append((i, m.group(1)))
    for target in targets:
        hits = [h for h in heads if h[1] == target]
        if not hits:
            print('== %s: no heading' % target)
            continue
        for (start, ver) in hits:
            end = len(lines)
            for h in heads:
                if h[0] > start:
                    end = h[0]
                    break
            title = lines[start + 1].strip() if start + 1 < len(lines) else ''
            print('== %s (devlog:%d) %s' % (ver, start + 1, title[:180]))
            for i in range(start + 2, end):
                if WANT.search(lines[i]):
                    print('    %d: %s' % (i + 1, lines[i].strip()[:230]))


if __name__ == '__main__':
    main(sys.argv[1:])
