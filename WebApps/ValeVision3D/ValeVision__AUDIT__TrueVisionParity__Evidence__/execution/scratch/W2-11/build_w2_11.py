# W2-11 build: TV PlanDoors 1.3.0 at b2aa9151 -> VV, banner + PORT NOTE seams only.
# Usage: python build_w2_11.py [--write | --verify]
import subprocess, sys, os

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
REL = '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__PlanDoors__.js'
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TARGET = os.path.join(VV_ROOT, REL.replace('/', os.sep))

tv = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/' + REL],
                    capture_output=True, check=True).stdout
assert b'\r\n' not in tv, 'TV text expected LF'

BANNER_TV = b'// TRUEVISION3D - LAYOUT EDITOR - PLAN DOORS\n'
BANNER_VV = b'// VALEVISION3D - LAYOUT EDITOR - PLAN DOORS\n'

NOTE_TV = (b'// PORT NOTE:\n'
           b'// - Ported from   : n/a - authored in TrueVision3D\n'
           b'// - Back-port     : PENDING to ValeVision3D, on Adam\'s sign-off.\n')

NOTE_VV = '\n'.join([
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__PlanDoors__.js',
    '// - Source version: 1.3.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-11}};',
    '//                   1.0.0 to 1.3.0 are TrueVision3D v2.42.0, v2.48.1, v2.138.0 and v2.140.0, none of them yet',
    '//                   confirmed by Adam in TrueVision.',
    '// - Parity        : verbatim. Inert as it lands: nothing imports it yet, so no drawing changes. Its callers',
    '//                   arrive with later packages - Viewport2d and its Window and Frame units (PoseFor,',
    '//                   ShutPoseFor, SwingExcludeTokens, RasterLayers), the SnapshotRenderer door pose, SheetTools',
    '//                   (At, ToggleSoon, CancelPending, MenuItems) and the Viewport panel\'s Doors row. The',
    '//                   ValeVision values (SwingCategoryKeys ValeVision__Linetype__DoorSwings, HideSwingsOnStoreys',
    '//                   roof) live in the Layout Editor AppConfig PlanDoors block and the SheetSetup fallbacks,',
    '//                   not in this file.',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
    '']).encode('utf-8')

def build():
    assert tv.count(BANNER_TV) == 1 and tv.count(NOTE_TV) == 1
    out = tv.replace(BANNER_TV, BANNER_VV, 1).replace(NOTE_TV, NOTE_VV, 1)
    return out

def reverse(vv):
    assert vv.count(BANNER_VV) == 1 and vv.count(NOTE_VV) == 1
    return vv.replace(BANNER_VV, BANNER_TV, 1).replace(NOTE_VV, NOTE_TV, 1)

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    out = build()
    if mode == '--write':
        if os.path.exists(TARGET):
            sys.exit('target already exists: ' + TARGET)
        with open(TARGET, 'wb') as f:
            f.write(out)
        print('wrote', TARGET, len(out), 'bytes')
    elif mode == '--verify':
        live = open(TARGET, 'rb').read()
        print('live == build :', live == out)
        print('reverse seams == TV bytes :', reverse(live) == tv)
        print('CR bytes in live :', live.count(b'\r'))
    else:
        sys.stdout.buffer.write(out)
