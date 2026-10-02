# -*- coding: utf-8 -*-
# W1-20 scratch: the git history, up to the pin, of each TrueVision SheetModel unit this package takes:
# every commit that touched the file, with its CODE lines added and removed (comment-only lines left
# out), written to <out_dir>/<unit>.history.txt in the session scratchpad. Reads only.
#
# Usage: python -B tv_history.py <out_dir>

import os
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
SD = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/'
UNITS = ['State', 'Layers', 'Shapes', 'Viewports', 'TextAndDimensions', 'Leaders', 'Groups', 'AreaGroups', 'DrawOrder', 'Common']
COMMENT = re.compile(r'^[+-]\s*//')


def run(args):
    out = subprocess.run(['git', '-C', NAWEB] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git failed: ' + ' '.join(args) + '\n' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout.decode('utf-8', 'replace')


def main(argv):
    out_dir = argv[0]
    os.makedirs(out_dir, exist_ok=True)
    for unit in UNITS:
        path = SD + 'Na__LayoutEditor__SheetModel__' + unit + '__.js'
        commits = run(['log', '--format=%h|%ad|%s', '--date=short', PIN, '--', path]).strip().split('\n')
        lines = []
        for row in commits:
            if not row:
                continue
            sha, date, subject = row.split('|', 2)
            lines.append('=' * 100)
            lines.append('%s %s %s' % (sha, date, subject[:150]))
            diff = run(['show', '--format=', '--unified=0', sha, '--', path])
            code = []
            comments = 0
            for d in diff.split('\n'):
                if d.startswith('+++') or d.startswith('---'):
                    continue
                if d.startswith('+') or d.startswith('-'):
                    if COMMENT.match(d) or d.strip() in ('+', '-'):
                        comments += 1
                        continue
                    code.append(d)
            lines.append('   (%d comment/blank lines changed; %d code lines below)' % (comments, len(code)))
            lines.extend('   ' + c[:260] for c in code[:400])
        with open(os.path.join(out_dir, unit + '.history.txt'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(lines) + '\n')
        print('%-18s %d commit(s)' % (unit, len([c for c in commits if c])))


if __name__ == '__main__':
    main(sys.argv[1:])
