"""W1-38 scratch: for each feature marker, the first TV commit (oldest first, up to the pin) whose version of the file contains it.

Read-only: git show of TV blobs at each commit in the file's history.
"""
import subprocess

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
LE40 = '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/'

FILES = {
    LE40 + 'Na__LayoutEditor__PanelHost__.js': [
        'LinkedPairRow', 'button.title       = spec.hint', 'na-le-input--rangebox', 'Na__ColourPalette__Attach',
        'Version 1.6.0', 'Version 1.5.0', 'na-le-range-suffix',
    ],
    LE40 + 'Na__LayoutEditor__Styles__Panels__.css': [
        'na-le-pair', 'na-le-input--rangebox', 'na-le-range-suffix', 'flex-wrap                          : wrap',
        'na-le-toggle-group--tight', 'na-le-row__inline-check', 'na-le-btn--ref', '.na-le-btn--eye.is-off',
        '"%" for how much', 'PROJECT ADMIN RECORD', 'Drawing\n   Register\'s',
    ],
}


def git(*args):
    return subprocess.run(['git', '-C', NAWEB, *args], capture_output=True, check=True).stdout


for rel, markers in FILES.items():
    commits = git('log', '--format=%h|%ad|%s', '--date=format:%d-%b-%Y %H:%M', '--reverse', PIN, '--', APP + rel).decode('utf-8').strip().split('\n')
    print('===', rel.split('/')[-1])
    first = {}
    for row in commits:
        h, date, subj = row.split('|', 2)
        try:
            text = git('show', f'{h}:{APP}{rel}').decode('utf-8').replace('\r\n', '\n')
        except subprocess.CalledProcessError:
            continue
        for m in markers:
            if m not in first and m in text:
                first[m] = (h, date, subj[:110])
    for m in markers:
        print(f'  {m!r:45} ->', first.get(m, 'never'))
