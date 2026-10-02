# -*- coding: utf-8 -*-
# W1-21 scratch: find which TrueVision release (devlog entry at the pin) mentions each of the
# modules W1-21 ports, and print the release header with the matching lines. Reads the TV devlog
# copy extracted at the pin into the session scratchpad. Reads only.
#
# Usage: python -B devlog_find.py <TrueVision__DEVLOG__.md> <regex> [<regex> ...]

import re
import sys

HEADER = re.compile(r'^##\s+(TrueVision3D\s+)?v?(\d+\.\d+\.\d+)\b(.*)$')


def main(argv):
    path = argv[0]
    pats = [re.compile(p, re.I) for p in argv[1:]]
    lines = open(path, 'r', encoding='utf-8').read().split('\n')
    current = None
    shown = set()
    for no, line in enumerate(lines, 1):
        m = HEADER.match(line)
        if m:
            current = (no, line.strip())
            continue
        for p in pats:
            if p.search(line):
                key = (current[0] if current else 0)
                if key not in shown:
                    print('-' * 100)
                    print('%6d  %s' % (current[0], current[1][:160]) if current else '(before any header)')
                    shown.add(key)
                print('%6d    %s' % (no, line.strip()[:220]))
                break


if __name__ == '__main__':
    main(sys.argv[1:])
