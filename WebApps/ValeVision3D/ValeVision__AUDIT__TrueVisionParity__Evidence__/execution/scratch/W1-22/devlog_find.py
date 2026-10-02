# W1-22 scratch: which TrueVision releases (devlog at the pin) mention a term; prints the release header,
# its title line and the matching lines with line numbers. Usage: python devlog_find.py <term> [<term> ...]
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEVLOG = os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md')


def main(terms):
    lines = open(DEVLOG, encoding='utf-8').read().split('\n')
    header = None
    header_at = 0
    title = ''
    shown = set()
    for i, line in enumerate(lines, 1):
        if line.startswith('## TrueVision3D'):
            header = line.strip()
            header_at = i
            title = ''
            continue
        if header and not title and line.startswith('### '):
            title = line.strip()
        if any(t in line for t in terms):
            key = header_at
            if key not in shown:
                shown.add(key)
                print('\n' + str(header_at) + ': ' + str(header) + '   ' + title)
            print('   ' + str(i) + ': ' + line.strip()[:260])


if __name__ == '__main__':
    main(sys.argv[1:])
