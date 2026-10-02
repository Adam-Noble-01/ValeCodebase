"""Unified diff of a TV source (pinned copy) against a VV candidate, code below the header only (or whole with --all)."""
import difflib
import sys

sys.stdout.reconfigure(encoding='utf-8')
tv_path, vv_path = sys.argv[1], sys.argv[2]
whole = '--all' in sys.argv


def body(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    if whole:
        return lines
    # Skip the header: everything up to the first '# #region' line
    for index, line in enumerate(lines):
        if line.startswith('# #region'):
            return lines[index:]
    return lines


for line in difflib.unified_diff(body(tv_path), body(vv_path), 'TV', 'VV', lineterm='', n=1):
    print(line)
