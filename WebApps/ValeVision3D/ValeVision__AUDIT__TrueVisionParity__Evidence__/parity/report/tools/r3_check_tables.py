"""Check markdown tables: every row must have the header's cell count.

Escaped pipes (backslash + pipe) do not split cells; pipes inside backtick
code spans DO split cells in GitHub markdown, so they are reported too.
Usage: python r3_check_tables.py <file.md> [...]
"""
import re
import sys

BS = chr(92)


def split_cells(line):
    cells = []
    cur = []
    i = 0
    text = line.strip()
    if text.startswith('|'):
        text = text[1:]
    if text.endswith('|') and not text.endswith(BS + '|'):
        text = text[:-1]
    while i < len(text):
        ch = text[i]
        if ch == BS and i + 1 < len(text) and text[i + 1] == '|':
            cur.append('|')
            i += 2
            continue
        if ch == '|':
            cells.append(''.join(cur))
            cur = []
            i += 1
            continue
        cur.append(ch)
        i += 1
    cells.append(''.join(cur))
    return cells


def check(path):
    lines = open(path, encoding='utf-8').read().splitlines()
    problems = 0
    in_table = False
    width = 0
    in_fence = False
    for n, line in enumerate(lines, 1):
        if line.strip().startswith('```'):
            in_fence = not in_fence
            in_table = False
            continue
        if in_fence:
            continue
        if line.strip().startswith('|'):
            cells = split_cells(line)
            if not in_table:
                in_table = True
                width = len(cells)
                header_line = n
                continue
            if re.match(r'^\|\s*:?-{3,}', line.strip()):
                if len(cells) != width:
                    print(f'{path}:{n}: separator has {len(cells)} cells, header {width} (line {header_line})')
                    problems += 1
                continue
            if len(cells) != width:
                print(f'{path}:{n}: row has {len(cells)} cells, header {width} (line {header_line}): {line[:90]}')
                problems += 1
            # a raw pipe inside a code span would split the cell on GitHub
            for span in re.findall(r'`[^`]*`', line):
                raw = span.replace(BS + '|', '')
                if '|' in raw:
                    print(f'{path}:{n}: unescaped pipe inside code span {span[:60]}')
                    problems += 1
        else:
            in_table = False
    return problems


if __name__ == '__main__':
    total = 0
    for p in sys.argv[1:]:
        total += check(p)
    print(f'problems: {total}')
