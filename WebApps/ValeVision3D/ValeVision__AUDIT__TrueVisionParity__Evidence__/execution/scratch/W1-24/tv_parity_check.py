# W1-24 scratch: every code line this package adds must be TrueVision's line, verbatim,
# unless it is one of the declared VV lines (the held fonts line in EnsureJsPdf).
# Reads the pre-image, the candidate (or live) and TV's file at the pin (git show, bytes).
import difflib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LEAF = 'Na__LayoutEditor__PdfExporter__.js'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH = ('b2aa9151:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/'
           '60__Feature__PdfExport/' + LEAF)
VV = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
LIVE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '60__Feature__PdfExport', LEAF)

DECLARED_VV = {
    '    // FUNCTION | Make Sure jsPDF Exists Before Any Document Is Measured or Drawn',
    '        return JsPdf;                                                             '
    '// <-- TrueVision3D also awaits its Open Sans cuts here (Na__LayoutEditor__PdfFonts__, not ported yet)',
}


def lines(data):
    return data.decode('utf-8').replace('\r\n', '\n').split('\n')


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'candidate'
    before = lines(open(os.path.join(HERE, 'before', LEAF), 'rb').read())
    after_path = LIVE if which == 'live' else os.path.join(HERE, 'candidate', LEAF)
    after = lines(open(after_path, 'rb').read())
    tv = subprocess.run(['git', '-C', NAWEB, 'show', TV_PATH], capture_output=True, check=True).stdout
    tv_lines = set(lines(tv))
    # TrueVision's own file on 19-Sep-2026 (commit b6baf301, where the options argument arrived), before
    # its 1.7.0 paint plan replaced the viewport loop: this app keeps that loop until W1-28.
    tv_old = subprocess.run(['git', '-C', NAWEB, 'show', TV_PATH.replace('b2aa9151:', 'b6baf301:')],
                            capture_output=True, check=True).stdout
    tv_old_lines = set(lines(tv_old))

    # The header (PORT NOTE and DEVELOPMENT LOG) ends at the first '// ===' rule after line 1.
    header_end = next(i for i, l in enumerate(after) if i > 2 and l.startswith('// ====='))
    added = []
    sm = difflib.SequenceMatcher(a=before, b=after, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('replace', 'insert'):
            for j in range(j1, j2):
                added.append((j + 1, after[j]))
    code = [(n, l) for n, l in added if n - 1 > header_end]
    header = [(n, l) for n, l in added if n - 1 <= header_end]
    tv_verbatim, tv_before_paint_plan, declared, blank, other = [], [], [], [], []
    for n, l in code:
        if l.strip() == '' or l.strip() == '// ------------------------------------------------------------':
            blank.append(n)
        elif l in tv_lines:
            tv_verbatim.append(n)
        elif l in tv_old_lines:
            tv_before_paint_plan.append(n)
        elif l in DECLARED_VV:
            declared.append(n)
        else:
            other.append((n, l))
    print('file:', after_path)
    print('added lines: %d (header %d, code %d)' % (len(added), len(header), len(code)))
    print('code lines verbatim in TrueVision3D at b2aa9151: %d' % len(tv_verbatim))
    print('code lines verbatim in TrueVision3D at b6baf301 (the viewport loop its 1.7.0 paint plan replaced; '
          'kept here until W1-28): %d %s' % (len(tv_before_paint_plan), tv_before_paint_plan))
    print('declared ValeVision3D lines: %d %s' % (len(declared), declared))
    print('blank or rule lines: %d' % len(blank))
    if other:
        print('UNDECLARED DIFFERENCES (%d):' % len(other))
        for n, l in other:
            print('  %d: %s' % (n, l))
        return 1
    print('RESULT: PASS - every added code line is TrueVision3D\'s, or declared')
    return 0


if __name__ == '__main__':
    sys.exit(main())
