"""W0-19 scratch: unified diff of the code body (after the header block) of each candidate against TV's file at the pin,
with the route prefix and blueprint name normalised, so every remaining line is a seam to account for."""
import difflib
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = [('ProjectVision__TrueVisionPublished__Api__.py', 'Server__ValeVisionPublished__Api__.py', 'truevision_published_api', 'valevision_published_api'),
         ('ProjectVision__TrueVisionStatements__Api__.py', 'Server__ValeVisionStatements__Api__.py', 'truevision_statements_api', 'valevision_statements_api')]


def body(text):
    lines = text.split('\n')
    for index, line in enumerate(lines):
        if line.startswith('# #region'):
            return lines[index:]
    return lines


for tv_name, vv_name, tv_bp, vv_bp in PAIRS:
    tv = open(os.path.join(HERE, 'tv', tv_name), encoding='utf-8').read()
    vv = open(os.path.join(HERE, 'candidate', vv_name), encoding='utf-8').read()
    tv = tv.replace('/api/truevision/', '/api/valevision/').replace(tv_bp, vv_bp)
    diff = list(difflib.unified_diff(body(tv), body(vv), 'TV ' + tv_name, 'VV ' + vv_name, lineterm='', n=1))
    changed = sum(1 for line in diff if line[:1] in '+-' and not line.startswith(('+++', '---')))
    print('=' * 100)
    print(vv_name, '- changed lines (+/-):', changed)
    print('\n'.join(diff))
