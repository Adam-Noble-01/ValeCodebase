"""Read-only line viewer for citation checks.

Usage: python r3_show.py <ALIAS/relative/path> <start>-<end> [<start>-<end> ...]
       python r3_show.py --find <ALIAS/relative/path> <regex> [max]
Aliases: TV, TVM, VV, VVM, WCP, NAAPPS.
"""
import re
import sys
from pathlib import Path

ROOTS = {
    'TV': Path(r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'),
    'VV': Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'),
    'WCP': Path(r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'),
    'NAAPPS': Path(r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps'),
}
ROOTS['TVM'] = ROOTS['TV'] / '02__Src__AppModules'
ROOTS['VVM'] = ROOTS['VV'] / '02__Src__AppModules'


def resolve(spec):
    alias, _, rel = spec.partition('/')
    base = ROOTS[alias]
    return base / rel


def read_lines(path):
    data = path.read_bytes()
    text = data.decode('utf-8', errors='replace')
    return text.splitlines()


def main():
    args = sys.argv[1:]
    if args and args[0] == '--find':
        path = resolve(args[1])
        pat = re.compile(args[2])
        cap = int(args[3]) if len(args) > 3 else 40
        lines = read_lines(path)
        n = 0
        for i, line in enumerate(lines, 1):
            if pat.search(line):
                print(f'{i}: {line[:220]}')
                n += 1
                if n >= cap:
                    break
        print(f'[{path.name}: {len(lines)} lines, {n} hits shown]')
        return
    path = resolve(args[0])
    lines = read_lines(path)
    print(f'== {path} ({len(lines)} lines)')
    for rng in args[1:]:
        a, _, b = rng.partition('-')
        a = int(a)
        b = int(b) if b else a
        for i in range(max(1, a), min(len(lines), b) + 1):
            print(f'{i}: {lines[i - 1][:240]}')
        print('--')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
