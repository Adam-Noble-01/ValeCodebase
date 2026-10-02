# W1-35 - reference only: which commit (an ancestor of the pin b2aa9151) carried each
# TrueVision Toolbar version, so the 1.17.0 and 1.19.0 hunks can be read exactly.
# Reads committed history with git show (never TV's working tree); writes nothing to TV.
import os, re, subprocess, sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
REL   = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js'
HERE  = os.path.dirname(os.path.abspath(__file__))

def git(*args):
    return subprocess.run(['git', '-C', NAWEB] + list(args), capture_output=True, check=True).stdout

def main():
    commits = git('log', '--format=%h', 'b2aa9151', '--', REL).decode().split()
    out_dir = os.path.join(HERE, 'tv_history')
    os.makedirs(out_dir, exist_ok=True)
    for c in commits:
        try:
            data = git('show', c + ':' + REL)
        except subprocess.CalledProcessError:
            print(c, '(file missing at this commit)')
            continue
        text = data.decode('utf-8')
        top = re.search(r'Version (\d+\.\d+\.\d+)', text)
        print(c, top.group(1) if top else '?', len(data))
        open(os.path.join(out_dir, c + '.js'), 'wb').write(data)

if __name__ == '__main__':
    main()
