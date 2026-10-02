"""Scratch (W0-02): append the generated per-file lines to the Port Record (once)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PR = os.path.join(HERE, '..', '..', 'port_records', 'W0-02.md')
lines = open(os.path.join(HERE, 'file_lines.md'), encoding='utf-8').read().rstrip('\n')
pr = open(PR, encoding='utf-8').read()
MARK = '## 6. Files changed, one line each (what and why)'
if MARK in pr:
    raise SystemExit('already appended')
body = lines.replace('## rewritten or hand-edited', '### Rewritten or hand-edited').replace('## moved only, content unchanged', '### Moved only, content unchanged')
intro = ('Generated from `git diff HEAD -M --name-status`, the byte pre-images and the current files '
         '(`execution/scratch/W0-02/make_file_lines.py`). Why, for every folder-name rewrite: the importer, comment or path '
         'string names a folder or file that D1-D7 / F1-F4 moved (K2 FR-01..FR-11, DR-02/03/04); T8 removes PORT NOTE bullets '
         'the renumber makes false. "40->91" etc. are the folder-number changes counted in the removed lines.')
with open(PR, 'a', encoding='utf-8', newline='\n') as f:
    f.write('\n' + MARK + '\n\n' + intro + '\n\n' + body + '\n')
print('appended to', os.path.abspath(PR))
