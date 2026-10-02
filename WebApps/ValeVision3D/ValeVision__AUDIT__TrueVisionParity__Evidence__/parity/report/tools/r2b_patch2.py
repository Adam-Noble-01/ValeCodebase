#!/usr/bin/env python3
"""Second one-off wording patch of r2b_render.py."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'r2b_render.py')
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, ('missing anchor', old[:100])
    s = s.replace(old, new, 1)


rep("'VV authored the file first (14-Jul-2026); TV ported it (31-Aug-2026) and corrected its header'",
    "'VV authored the file (14-Jul-2026); TV ported it on 31-Aug-2026 \"unchanged apart from the header\" (TV DEVELOPMENT LOG) with its own NAMESPACE and MODULE lines'")

# ordering facts verified in the K3 DAG
rep("""w(f'Computed from every `import {{ ... }}` in TV folders 40-55 against VV\\'s exports at the same K2 target: outside 40-55 VV lacks exactly '
  f'{miss_support_names} imported names in {len(miss_support)} modules it keeps, matching S01-F15 and S01-V01/V02. Each must exist before the first TV '
  'importer lands.')""",
    """w(f'Computed from every `import {{ ... }}` in TV folders 40-55 against VV\\'s exports at the same K2 target: outside 40-55 VV lacks exactly '
  f'{miss_support_names} imported names in {len(miss_support)} modules it keeps, matching S01-F15 and S01-V01/V02. Each must exist before the first TV '
  'importer lands; the K3 graph already orders it so (W1-01 before W2-01 Drawing Planes, W1-02 before W2-06 DoorPose, W0-12 before every '
  'facade importer - checked transitively in `wp_canonical.json`).')""")

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched')
