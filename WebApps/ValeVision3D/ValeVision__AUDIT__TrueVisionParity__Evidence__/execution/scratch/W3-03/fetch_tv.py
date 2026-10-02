"""Fetch every TV file W3-03 reads, at the pin, into scratch/W3-03/tv/ (bytes as git show returns them)."""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TV_REPO = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
ST = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
T = '80__Testing__PrototypeEnvironment/'

FILES = [
    ST + 'Na__LayoutEditor__SheetTools__HitResolution__.js',
    ST + 'Na__LayoutEditor__SheetTools__PointerPress__.js',
    ST + 'Na__LayoutEditor__SheetTools__PointerDrag__.js',
    ST + 'Na__LayoutEditor__SheetTools__Keyboard__.js',
    ST + 'Na__LayoutEditor__SheetTools__.js',
    ST + 'Na__LayoutEditor__SheetTools__ContextMenu__.js',
    ST + 'Na__LayoutEditor__SheetTools__CopyDrag__.js',
    ST + 'Na__LayoutEditor__AxisLock__.js',
    ST + 'Na__LayoutEditor__SheetTools__ContentEditing__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js',
    LE + '50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js',
    T + 'Na__Test__MoveRetype__.test.mjs',
    T + 'Na__Test__CopyDrag__.test.cjs',
    T + 'Na__Test__CrossSheetClipboard__.test.cjs',
    T + 'Na__Test__SetMoveLeaderTips__.test.cjs',
    T + 'Na__Test__BubbleNoteTooltip__.test.mjs',
    T + 'Na__Test__GroupMoveSnapping__.test.cjs',
]

out_dir = os.path.join(HERE, 'tv')
os.makedirs(out_dir, exist_ok=True)
for rel in FILES:
    data = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel],
                          check=True, capture_output=True).stdout
    name = os.path.basename(rel)
    with open(os.path.join(out_dir, name), 'wb') as f:
        f.write(data)
    print(len(data), b'\r' in data, name)
