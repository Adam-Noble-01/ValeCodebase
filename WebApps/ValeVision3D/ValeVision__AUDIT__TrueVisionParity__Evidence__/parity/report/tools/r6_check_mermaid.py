#!/usr/bin/env python3
"""R6 - light structural lint of the mermaid blocks in Section F (no mermaid parser available offline).

Checks: every block starts with 'flowchart'; node ids are [A-Za-z0-9_]; each node definition has
balanced shape brackets and a quoted label without inner double quotes; every edge endpoint is a
defined node; every class used is defined.
"""
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(os.path.dirname(TOOLS), 'R6__F_SwarmDelegationPlan.md')
text = open(MD, encoding='utf-8').read()
blocks = re.findall(r'```mermaid\n(.*?)```', text, flags=re.S)
SHAPES = [(r'\[/"', r'"/\]'), (r'\(\["', r'"\]\)'), (r'\{\{"', r'"\}\}'), (r'\["', r'"\]')]
errors = []
for bi, b in enumerate(blocks, 1):
    lines = [l.strip() for l in b.strip().split('\n')]
    if not lines[0].startswith('flowchart'):
        errors.append('block %d: no flowchart header' % bi)
    nodes, used_classes, def_classes = set(), set(), set()
    edges = []
    for l in lines[1:]:
        if l.startswith('classDef '):
            def_classes.add(l.split()[1])
            continue
        m = re.match(r'^([A-Za-z0-9_]+)(\[/"|\(\["|\{\{"|\[")(.*)$', l)
        if m and ('-->' not in l and '-.->' not in l):
            nid, opener, rest = m.groups()
            closer = {'[/"': '"/]', '(["': '"])', '{{"': '"}}', '["': '"]'}[opener]
            cm = re.match(r'^(.*)' + re.escape(closer) + r'(:::([A-Za-z0-9_]+))?$', rest)
            if not cm:
                errors.append('block %d: bad node line: %s' % (bi, l[:100]))
                continue
            if '"' in cm.group(1):
                errors.append('block %d: inner quote in label: %s' % (bi, l[:100]))
            if cm.group(3):
                used_classes.add(cm.group(3))
            nodes.add(nid)
            continue
        # edges (possibly chained, possibly with labels)
        parts = re.split(r'\s*(?:-\.->\|"[^"|]*"\||-->\|"[^"|]*"\||-\.->|-->)\s*', l)
        if len(parts) >= 2:
            for x in parts:
                if not re.match(r'^[A-Za-z0-9_]+$', x):
                    errors.append('block %d: bad edge token %r in: %s' % (bi, x, l[:100]))
                else:
                    edges.append((bi, x))
            continue
        errors.append('block %d: unrecognised line: %s' % (bi, l[:100]))
    for _, x in edges:
        if x not in nodes:
            # chained edges in the programme flow refer to nodes defined above
            errors.append('block %d: edge endpoint %s is not a defined node' % (bi, x))
    for c in used_classes - def_classes:
        errors.append('block %d: class %s used but not defined' % (bi, c))
print('mermaid blocks:', len(blocks))
if errors:
    print('FAIL')
    for e in errors[:40]:
        print(' ', e)
    sys.exit(1)
print('PASS')
