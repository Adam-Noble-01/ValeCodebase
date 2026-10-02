"""W1-05 - run TrueVision's own Na__Test__DraftGuard__.test.cjs (read at b2aa9151), its Drawings Data half,
against ValeVision's ProjectData (the candidate, or the live file with --live).

TV's test runs ProjectData whole in a vm context with every import stripped and stubbed BY NAME, so it also
proves the ValeVision file imports nothing TrueVision's does not (W1-07 ports this test whole later; its
Auto Save half needs AutoSave 1.5.0, which W1-07 lands, so that half is cut here). The test text is used as
TrueVision wrote it except for two mechanical edits: ROOT points at a temporary tree holding the file under
test at its path, and the Auto Save region is removed. Everything lives in the OS temp folder.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIVE = '--live' in sys.argv
UNDER_TEST = (Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\40__System__DrawingViewCore\Na__DrawView__ProjectData__.js')
              if LIVE else HERE / 'candidate__Na__DrawView__ProjectData__.js')
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_TEST = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs'


def main():
    text = subprocess.run(['git', '-C', TV_REPO, 'show', 'b2aa9151:' + TV_TEST], capture_output=True, check=True).stdout.decode('utf-8')
    root_line = "const ROOT  = path.resolve(__dirname, '../02__Src__AppModules');"
    if text.count(root_line) != 1:
        sys.exit('ROOT line not found once')
    start = text.index('// REGION | The Auto Save, With Everything Around It Stubbed')
    start = text.rindex('// -----------------------------------------------------------------------------', 0, start)
    end = text.index('// REGION | The Drawings Data\'s Save, With the Servers Stubbed')
    end = text.rindex('// -----------------------------------------------------------------------------', 0, end)
    cut = text[:start] + text[end:]
    with tempfile.TemporaryDirectory(prefix='na-w1-05-tvtest-') as tmp:
        tree = Path(tmp) / '02__Src__AppModules' / '40__System__DrawingViewCore'
        tree.mkdir(parents=True)
        shutil.copyfile(UNDER_TEST, tree / 'Na__DrawView__ProjectData__.js')
        test = Path(tmp) / 'Na__Test__DraftGuard__ProjectDataHalf.test.cjs'
        test.write_text(cut.replace(root_line, "const ROOT  = path.resolve(__dirname, '02__Src__AppModules');"), encoding='utf-8', newline='\n')
        run = subprocess.run(['node', '--test', str(test)], capture_output=True, text=True, timeout=300)
        print(run.stdout[-4000:])
        print(run.stderr[-2000:])
        sys.exit(run.returncode)


if __name__ == '__main__':
    main()
