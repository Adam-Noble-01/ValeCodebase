# -*- coding: utf-8 -*-
# W1-27 acceptance 3: "git diff --no-index -w against TV: header, PORT NOTE and console-prefix lines only."
# For each landed file, runs git diff --no-index -w between TrueVision's bytes at the pin (extracted into the session
# scratchpad by extract_tv.py) and the live ValeVision file, keeps the diff in logs/diff__<file>.txt, and classifies
# every changed line: the banner (line 2), the PORT NOTE block, the console prefix, the test's printed title. Any
# other changed line is a FAIL. Read-only on both trees.
#
# Usage: python -B diff_check.py
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TVOUT = os.environ.get('W127_TV_OUT') or r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W1-27_tv'
FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
FILES = [FA + n for n in (
    'Na__LayoutEditor__FloorAreas__Geometry__.js',
    'Na__LayoutEditor__FloorAreas__.js',
    'Na__LayoutEditor__FloorAreas__Tool__.js',
    'Na__LayoutEditor__FloorAreas__Menu__.js',
    'Na__LayoutEditor__FloorAreas__Paint__.js',
    'Na__LayoutEditor__FloorAreas__Config__.json',
)] + ['80__Testing__PrototypeEnvironment/Na__Test__FloorAreas__.test.mjs']
HUNK = re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')


def port_note_span(lines):
    """1-based (first, last) lines of the PORT NOTE block: from '// PORT NOTE:' to the line before the next rule."""
    start = None
    for i, line in enumerate(lines, 1):
        if line.strip() == '// PORT NOTE:':
            start = i
        elif start and line.startswith('// ----'):
            return start, i - 1
    return (start, start) if start else (0, -1)


def classify(side_lines, number, text, span):
    if number == 2 and ('TRUEVISION3D - ' in text or 'VALEVISION3D - ' in text):
        return 'banner'
    if span[0] <= number <= span[1]:
        return 'port-note'
    if '[TrueVision3D LayoutEditor]' in text or '[ValeVision3D LayoutEditor]' in text:
        return 'console-prefix'
    if "console.log('TrueVision3D - floor areas, the measurement')" in text or "console.log('ValeVision3D - floor areas, the measurement')" in text:
        return 'printed-title'
    return None


def main():
    os.makedirs(os.path.join(HERE, 'logs'), exist_ok=True)
    problems = 0
    for rel in FILES:
        tv = os.path.join(TVOUT, rel.replace('/', os.sep))
        vv = os.path.join(VV, rel.replace('/', os.sep))
        res = subprocess.run(['git', '-c', 'core.autocrlf=false', 'diff', '--no-index', '-w', '--no-color', tv, vv],
                             capture_output=True, text=True, encoding='utf-8', errors='replace')
        out = res.stdout
        with open(os.path.join(HERE, 'logs', 'diff__' + rel.split('/')[-1] + '.txt'), 'w', encoding='utf-8') as fh:
            fh.write(out)
        tv_lines = open(tv, encoding='utf-8').read().split('\n')
        vv_lines = open(vv, encoding='utf-8').read().split('\n')
        tv_span, vv_span = port_note_span(tv_lines), port_note_span(vv_lines)
        if tv_span[0] == 0 and vv_span[0]:
            # TrueVision's file has no PORT NOTE (the test): the inserted block also brings its own closing rule and
            # the comment line after it, so the next section keeps TrueVision's spacing
            vv_span = (vv_span[0], vv_span[1] + 2)
        counts = {}
        bad = []
        old_no = new_no = 0
        for line in out.split('\n'):
            m = HUNK.match(line)
            if m:
                old_no, new_no = int(m.group(1)), int(m.group(3))
                continue
            if line.startswith('---') or line.startswith('+++') or line.startswith('diff ') or line.startswith('index '):
                continue
            if line.startswith('-'):
                kind = classify(tv_lines, old_no, line[1:], tv_span)
                old_no += 1
            elif line.startswith('+'):
                kind = classify(vv_lines, new_no, line[1:], vv_span)
                new_no += 1
            else:
                old_no += 1
                new_no += 1
                continue
            if kind is None:
                bad.append(line[:160])
            else:
                counts[kind] = counts.get(kind, 0) + 1
        problems += len(bad)
        print('%-4s %-50s git diff exit %d; changed lines: %s%s' % (
            'OK' if not bad else 'FAIL', rel.split('/')[-1], res.returncode,
            ', '.join('%s %d' % kv for kv in sorted(counts.items())) or 'none (identical)',
            ('; UNEXPECTED: ' + ' | '.join(bad[:5])) if bad else ''))
    print('acceptance 3: %s' % ('PASS - only the banner, PORT NOTE, console-prefix and printed-title lines differ' if not problems else 'FAIL (%d unexpected line(s))' % problems))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
