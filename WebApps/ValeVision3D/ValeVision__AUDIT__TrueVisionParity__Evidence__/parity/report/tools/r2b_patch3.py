#!/usr/bin/env python3
"""Third one-off wording patch of r2b_render.py (legacy header precision)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'r2b_render.py')
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, ('missing anchor', old[:100])
    s = s.replace(old, new, 1)


rep("{len(ns_missing)} lack the `FILE`/`NAMESPACE`/`MODULE` lines on one side;",
    "{len(ns_missing)} have no `NAMESPACE` line on one side (legacy headers);")
rep("""    ['`10__NavigationAndCameras/` DefaultNavmode Ipad/Mouse controls, OrbitMode SystemLogic', 'whole header', 'missing', 'present', 'TV legacy headers', 'Keep VV\\'s; out of scope', '-', '-'],""",
    """    ['`10__NavigationAndCameras/` DefaultNavmode Ipad/Mouse controls, OrbitMode SystemLogic', 'header block', 'missing (OrbitMode keeps only `FILE` and `PURPOSE`, TV :5-6)', 'present', 'TV legacy headers', 'Keep VV\\'s; out of scope', '-', '-'],""")
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched')
