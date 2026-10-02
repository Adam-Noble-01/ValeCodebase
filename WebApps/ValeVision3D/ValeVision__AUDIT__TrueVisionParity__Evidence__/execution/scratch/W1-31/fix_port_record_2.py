# W1-31 - Port Record: the whole-tree PortNotes counts from the final run, and one wording fix (LF file).
from pathlib import Path

P = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\port_records\W1-31.md')
text = P.read_bytes().decode('utf-8')
assert '\r' not in text
PAIRS = [
    ('''  (my files: 5 pending W1-31 placeholders; tree: 0 fail, 135 baseline warns, 80 pending of W1-01..W1-31);
''', '''  (my files: 5 pending W1-31 placeholders; tree, final run: 0 fail, 133 baseline warns, 82 pending of
  W1-01..W1-31 - other packages land meanwhile);
'''),
    ('''`patch_backport_lines.py`; each
refuses unless the file is the expected pre-image and has `--restore` or a saved pass-1 copy). Nothing staged,
committed or deployed; no server touched.
''', '''`patch_backport_lines.py`; each refuses unless the file is the expected pre-image, and the pre-images of every
pass are kept in `scratch/W1-31/preimage`). Nothing staged, committed or deployed; no server touched.
'''),
]
for n, (old, new) in enumerate(PAIRS, 1):
    assert text.count(old) == 1, (n, text.count(old))
    text = text.replace(old, new, 1)
P.write_bytes(text.encode('utf-8'))
print('port record updated')
