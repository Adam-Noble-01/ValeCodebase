"""Back up the live VV files W3-03 will write (bytes), into scratch/W3-03/backup/ - once; refuses to overwrite."""
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
ST = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
T = '80__Testing__PrototypeEnvironment/'

LIVE = [
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
    T + 'Na__Test__DrawingTabKeys__.test.mjs',
]

if __name__ == '__main__':
    bdir = os.path.join(HERE, 'backup')
    os.makedirs(bdir, exist_ok=True)
    for rel in LIVE:
        src = os.path.join(VV, rel)
        dst = os.path.join(bdir, os.path.basename(rel))
        if os.path.exists(dst) or os.path.exists(dst + '.ABSENT'):
            print('backup exists, skipped', rel)
            continue
        if os.path.exists(src):
            shutil.copyfile(src, dst)
            print('backed up', os.path.getsize(dst), rel)
        else:
            open(dst + '.ABSENT', 'w').close()
            print('absent (new file)', rel)
