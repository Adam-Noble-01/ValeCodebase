"""R3 helper: extract drawing-system imports and their first call lines from TV Index.html and VV index.html.
Read-only on both apps. Writes report/tools/r3work/entry_points.json and prints a markdown table."""
import re, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
TV = "D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode/Index.html"
VV = "D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/index.html"
SCOPE = re.compile(r"02__Src__AppModules/(03__AppUtils/Na__AppUtils__DevGate__|27__|4\d__|5\d__|80__CloudflareIntegration|91__)")
VVMAP = {'40__System__2dElevationsView':'91__System__2dElevationsView','42__System__DrawingViewCore':'40__System__DrawingViewCore',
         '43__System__FloorPlanViews':'42__System__FloorPlanViews','44__System__PlanAnnotations':'43__System__PlanAnnotations',
         '45__System__PlanDimensions':'44__System__PlanDimensions','46__System__ElevationViews':'45__System__ElevationViews',
         '47__System__NorthDirection':'46__System__NorthDirection'}
def k2(path):
    for a,b in VVMAP.items():
        if '/'+a+'/' in path: return path.replace('/'+a+'/','/'+b+'/')
    return path.replace('Na__DrawView__ComposerPreset__','Na__DrawView__RenderPreset__')
def scan(fn, isvv):
    lines=open(fn,encoding='utf-8').read().split('\n')
    out=[]
    for i,l in enumerate(lines,1):
        m=re.match(r"\s*import\s*\{([^}]*)\}\s*from\s*'\./(02__Src__AppModules/[^']+)'",l)
        if not m: continue
        path=m.group(2)
        if not SCOPE.search(path): continue
        names=[n.strip() for n in m.group(1).split(',') if n.strip()]
        calls=[]
        for n in names:
            for j,l2 in enumerate(lines,1):
                if j==i: continue
                if re.search(r'\b'+re.escape(n)+r'\s*\(', l2) and not l2.strip().startswith('//') and 'import' not in l2:
                    calls.append((n,j)); break
        out.append({'line':i,'path':path,'target':k2(path) if isvv else path,'names':names,'calls':calls})
    return out
tv=scan(TV,False); vv=scan(VV,True)
json.dump({'tv':tv,'vv':vv},open('report/tools/r3work/entry_points.json','w',encoding='utf-8'),indent=1)
vvt={e['target']:e for e in vv}
print('| TV import (Index.html line) | TV init line(s) | VV target path | VV index.html today |')
print('|---|---|---|---|')
for e in tv:
    v=vvt.get(e['target'])
    calls=', '.join(f"{n.split('__',2)[-1]} :{j}" for n,j in e['calls']) or '(no call)'
    vtxt = (f"import :{v['line']}; calls " + (', '.join(f":{j}" for n,j in v['calls']) or 'none')) if v else 'absent'
    print(f"| `{e['path'].replace('02__Src__AppModules/','')}` (:{e['line']}) | {calls} | `{e['target'].replace('02__Src__AppModules/','')}` | {vtxt} |")
print()
print('VV-only drawing imports:')
tvt={e['target'] for e in tv}
for e in vv:
    if e['target'] not in tvt:
        calls=', '.join(f"{n} :{j}" for n,j in e['calls']) or '(no call)'
        print(f"| `{e['path'].replace('02__Src__AppModules/','')}` -> `{e['target'].replace('02__Src__AppModules/','')}` (:{e['line']}) | {calls} |")
