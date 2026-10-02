# W1-18 scratch: prove the live VV copies are TV 1.0.0 (the state before each 1.1.0 commit) plus header and console
# prefix only - so the whole-file take loses no VV seam. Prints the diff of VV (LF) against TV at the parent commit.
import difflib
import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
LE35 = '02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/'
PAIRS = [
    ('Na__LayoutEditor__GradientTool__.js', 'a2e0a836^'),
    ('Na__LayoutEditor__LineStyleTool__.js', 'b24f33a9^'),
]


def main():
    for name, commit in PAIRS:
        tv = subprocess.run(['git', '-C', NAWEB, 'show', commit + ':' + TVAPP + LE35 + name],
                            stdout=subprocess.PIPE, check=True).stdout.decode('utf-8').replace('\r\n', '\n')
        with open(os.path.join(HERE, 'vv_before', name), 'rb') as fh:
            vv = fh.read().replace(b'\r\n', b'\n').decode('utf-8')
        diff = list(difflib.unified_diff(tv.split('\n'), vv.split('\n'), 'TV@' + commit + '/' + name, 'VV/' + name, n=0, lineterm=''))
        print('=' * 100)
        print('%s: %d changed line(s) VV vs TV at %s' % (name, sum(1 for d in diff if d[:1] in '+-' and not d.startswith(('+++', '---'))), commit))
        print('\n'.join(diff))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
