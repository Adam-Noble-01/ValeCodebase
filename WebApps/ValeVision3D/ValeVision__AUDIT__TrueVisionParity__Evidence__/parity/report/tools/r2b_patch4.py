#!/usr/bin/env python3
"""Fourth one-off wording patch of r2b_render.py (B.3 intro and B.3.5 closing note)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'r2b_render.py')
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, ('missing anchor', old[:100])
    s = s.replace(old, new, 1)


rep("""w(f'Twins = a VV file and a TV file at the same K2 target path ({n_pairs} pairs). Inside folders 40-55 the slices and this extraction agree: '
  'one `NAMESPACE` divergence (SectionAdapter), no `FILE`-line divergence, VV-only names 18 in 12 files (S01-F41). The extraction '
  'extends the check to the whole tree and to the support modules TV drawing files import.')""",
    """w(f'Twins = a VV file and a TV file at the same K2 target path ({n_pairs} pairs). Inside folders 40-55, paired at today\\'s file names, the '
  'slices and this extraction agree: one `NAMESPACE` divergence (SectionAdapter), no `FILE`-line divergence, 18 VV-only names in 12 files '
  '(S01-F41). Pairing at K2 targets adds RenderPreset (FR-09), whose private `NAMESPACE` is deliberate (H3). The extraction extends the '
  'check to the whole tree and to the support modules TV drawing files import.')""")
rep("""'The per-module owners are in `parity/report/tools/out/r2b_importnames.json`.')""",
    """'The modules, names and TV importers are listed in `parity/report/tools/out/r2b_importnames.json`; each module\\'s owner is the K3 '
  'package that names its TV source in `parity/data/wp_canonical.json`.')""")
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched')
