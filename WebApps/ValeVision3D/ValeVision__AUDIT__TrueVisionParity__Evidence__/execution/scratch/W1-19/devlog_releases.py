# -*- coding: utf-8 -*-
# W1-19 scratch: name the TrueVision release (devlog read at the pin) that each line
# number sits in, and print that release's sign-off / "tried by Adam" lines.
#
# Usage: python -B devlog_releases.py <tv_devlog.md> <line> [<line> ...]
#        python -B devlog_releases.py <tv_devlog.md> --grep <regex>

import re
import sys

HEAD = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*-?\s*(.*)$')
SIGN = re.compile(r"(tried|sign-?off|signed off|confirmed|NOT in ValeVision|ValeVision:)", re.I)


def load(path):
    with open(path, 'r', encoding='utf-8') as fh:
        lines = fh.read().split('\n')
    heads = []
    for i, line in enumerate(lines, 1):
        m = HEAD.match(line)
        if m:
            heads.append((i, m.group(1), m.group(2), m.group(3).strip()))
    return lines, heads


def section_of(heads, n):
    best = None
    nxt = None
    for idx, h in enumerate(heads):
        if h[0] <= n:
            best = h
            nxt = heads[idx + 1][0] if idx + 1 < len(heads) else None
        else:
            break
    return best, nxt


def report(lines, heads, numbers):
    seen = set()
    for n in numbers:
        best, nxt = section_of(heads, n)
        if not best:
            print('line %d -> none' % n)
            continue
        print('line %d -> %s %s "%s" (devlog:%d)' % (n, best[1], best[2], best[3], best[0]))
        if best[0] in seen:
            continue
        seen.add(best[0])
        # The release section runs from its heading to the line before the NEXT heading in the
        # file (the devlog is newest first, so the next heading is the older release).
        start = best[0]
        end = len(lines)
        for h in heads:
            if h[0] > start:
                end = h[0] - 1
                break
        for i in range(start, end):
            if SIGN.search(lines[i]):
                print('    %d: %s' % (i + 1, lines[i].strip()[:220]))


def main(argv):
    path = argv[0]
    lines, heads = load(path)
    if len(argv) > 2 and argv[1] == '--grep':
        rx = re.compile(argv[2])
        numbers = [i + 1 for i, line in enumerate(lines) if rx.search(line)]
    else:
        numbers = [int(a) for a in argv[1:]]
    report(lines, heads, numbers)


if __name__ == '__main__':
    main(sys.argv[1:])
