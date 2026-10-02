import subprocess, os, sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
REL = '02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__NoteRegions__Tool__.js'
DST = os.path.join(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D', REL.replace('/', os.sep))

src = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/' + REL],
                     capture_output=True, check=True).stdout
assert b'\r\n' not in src, 'TV text is expected LF'

old_banner = b'// TRUEVISION3D - LAYOUT EDITOR - OVERSPILL NOTE REGIONS - THE REGION TOOL\n'
new_banner = b'// VALEVISION3D - LAYOUT EDITOR - OVERSPILL NOTE REGIONS - THE REGION TOOL\n'
assert src.count(old_banner) == 1
src = src.replace(old_banner, new_banner)

old_note = (b'// PORT NOTE:\n'
            b'// - Authored in   : TrueVision3D first (22-Sep-2026)\n'
            b'// - ValeVision    : not yet ported - it goes with the rest of the regions.\n')
new_note = (b'// PORT NOTE:\n'
            b'// - Ported from   : TrueVision3D ' + REL.encode() + b'\n'
            b'// - Source version: 1.0.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)\n'
            b'// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-22}}, the whole file, new to this\n'
            b'//                   app. It lands inert, ahead of the SheetTools hub and Measurements 1.10.0:\n'
            b'//                   nothing imports it yet, so no dispatch site reaches it. TrueVision\'s v2.143.0\n'
            b'//                   entry is NOT tried by Adam; it comes across under DR-01 (c) and is named so.\n'
            b'//                   The Rectangle tool\'s `land` hook it relies on is RectangleTool 1.4.0 (W2-26).\n'
            b'// - Parity        : verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the\n'
            b'//                   only differences)\n'
            b'// - Divergences   :\n'
            b'//   - Banner reads ValeVision3D. (No console output in this file.)\n'
            b'// - Back-port     : none.\n')
assert src.count(old_note) == 1
src = src.replace(old_note, new_note)

for bad in (b'TRUEVISION3D', b'[TrueVision3D', b'TrueVision__', b'NaProjectPortal'):
    assert bad not in src.replace(new_note, b''), bad

if os.path.exists(DST):
    print('REFUSING: target already exists', DST); sys.exit(2)
with open(DST, 'wb') as fh:
    fh.write(src)
print('wrote', DST, len(src), 'bytes')
