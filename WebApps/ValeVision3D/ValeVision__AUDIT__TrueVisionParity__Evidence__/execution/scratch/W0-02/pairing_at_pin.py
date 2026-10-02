"""Scratch (W0-02): the renumber's pairing report, recomputed against TrueVision AT THE PIN
(git ls-tree b2aa9151) instead of TV's working tree, so the count obeys F.1 P1."""
import os, subprocess, json

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TVM = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules'
FOLDERS = ['40__System__DrawingViewCore', '42__System__FloorPlanViews', '43__System__PlanAnnotations',
           '44__System__PlanDimensions', '45__System__ElevationViews', '46__System__NorthDirection']
out = {}
total = 0
for fo in FOLDERS:
    r = subprocess.run(['git', '-C', NAWEB, 'ls-tree', '--name-only', PIN, TVM + '/' + fo + '/'],
                       capture_output=True, text=True, check=True)
    tv = {os.path.basename(l) for l in r.stdout.splitlines() if l.strip()}
    vv = set(os.listdir(os.path.join(VV, fo))) if os.path.isdir(os.path.join(VV, fo)) else set()
    paired = sorted(vv & tv)
    total += len(paired)
    out[fo] = {'paired': len(paired), 'vv_only': sorted(vv - tv), 'tv_only': sorted(tv - vv)}
    print('%-30s paired %2d  vv-only %s  tv-only %s' % (fo, len(paired), out[fo]['vv_only'], out[fo]['tv_only']))
print('TOTAL paired at pin %s: %d' % (PIN, total))
json.dump({'pin': PIN, 'total': total, 'folders': out},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pairing_at_pin.json'), 'w', encoding='utf-8'), indent=1)
