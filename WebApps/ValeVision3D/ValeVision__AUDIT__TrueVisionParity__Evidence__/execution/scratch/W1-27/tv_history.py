# -*- coding: utf-8 -*-
# W1-27 scratch: the git history, up to the pin, of each TrueVision file this package takes - every commit
# that touched it (hash, date, subject) and, per commit, how many code and comment lines changed and the
# DEVELOPMENT LOG version lines it added. Also extracts TrueVision's devlog at the pin into the session
# scratchpad (for devlog_find.py). Reads only; writes only into the session scratchpad.
#
# Usage: python -B tv_history.py [out_dir]

import os
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W1-27_tv\history'
FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
FILES = [
    FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js',
    FA + 'Na__LayoutEditor__FloorAreas__.js',
    FA + 'Na__LayoutEditor__FloorAreas__Tool__.js',
    FA + 'Na__LayoutEditor__FloorAreas__Menu__.js',
    FA + 'Na__LayoutEditor__FloorAreas__Paint__.js',
    FA + 'Na__LayoutEditor__FloorAreas__Config__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__FloorAreas__.test.mjs',
]
COMMENT = re.compile(r'^[+-]\s*//')
LOGVER = re.compile(r'^\+//\s+(\d\d-[A-Za-z]{3}-\d{4})\s+-\s+Version\s+(\d+\.\d+\.\d+)')


def run(args):
    out = subprocess.run(['git', '-C', NAWEB] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git failed: ' + ' '.join(args) + '\n' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout.decode('utf-8', 'replace')


def main(argv):
    out_dir = argv[0] if argv else OUT
    os.makedirs(out_dir, exist_ok=True)
    devlog = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + 'TrueVision__DEVLOG__.md'],
                            stdout=subprocess.PIPE, check=True).stdout
    with open(os.path.join(out_dir, 'TrueVision__DEVLOG__.md'), 'wb') as fh:
        fh.write(devlog)
    for rel in FILES:
        path = APP + rel
        rows = [r for r in run(['log', '--format=%h|%ad|%s', '--date=iso', PIN, '--', path]).strip().split('\n') if r]
        lines = []
        print('=' * 110)
        print(rel.split('/')[-1] + ' - %d commit(s)' % len(rows))
        for row in rows:
            sha, date, subject = row.split('|', 2)
            diff = run(['show', '--format=', '--unified=0', sha, '--', path])
            code, comments, versions = 0, 0, []
            body = []
            for d in diff.split('\n'):
                if d.startswith('+++') or d.startswith('---'):
                    continue
                if d.startswith('+') or d.startswith('-'):
                    m = LOGVER.match(d)
                    if m:
                        versions.append(m.group(2) + ' (' + m.group(1) + ')')
                    if COMMENT.match(d) or d.strip() in ('+', '-'):
                        comments += 1
                    else:
                        code += 1
                    body.append(d)
            print('  %s %s  code %4d  comment %4d  log+ %-28s %s' % (sha, date[:16], code, comments, ','.join(versions) or '-', subject[:90]))
            lines.append('=' * 100)
            lines.append('%s %s %s' % (sha, date, subject))
            lines.extend('   ' + b[:300] for b in body[:600])
        with open(os.path.join(out_dir, rel.split('/')[-1] + '.history.txt'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main(sys.argv[1:])
