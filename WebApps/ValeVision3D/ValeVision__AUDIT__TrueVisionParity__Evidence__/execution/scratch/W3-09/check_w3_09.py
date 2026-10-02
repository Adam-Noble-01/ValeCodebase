# W3-09 scratch checks (read-only): wiring present at TrueVision's text, the Insert guard restores TV on deletion,
# every PickUpMove in Sheet Images is guarded, and the new Insert -> HitResolution edge closes no import cycle.
import os, re, sys

VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SRC  = os.path.join(VV, '02__Src__AppModules')
LE   = os.path.join(SRC, '51__System__LayoutEditor')
HERE = os.path.dirname(os.path.abspath(__file__))
fails = 0


def check(ok, label):
    global fails
    print(('  PASS  ' if ok else '  FAIL  ') + label)
    if not ok: fails += 1


def read(p): return open(p, 'rb').read().decode('utf-8').replace('\r\n', '\n')

mc  = read(os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js'))
tv  = read(os.path.join(HERE, 'tv', 'Na__LayoutEditor__ModeController__.js'))

# 1. Every TrueVision line that names Sheet Images (outside the log) is in ValeVision's file, verbatim.
code_tv = tv[tv.index('// REGION | Module Imports') if '// REGION | Module Imports' in tv else 0:]
tv_lines = [l for l in code_tv.split('\n') if re.search(r'Na__LeImg__|Na__LePanelImages__|AllImages|\'images\'', l) and 'AllAreas(items) ?' not in l and 'ReadyOnce = Promise.all' not in l]   # <-- the ready chain differs by Floor Areas (W3-10) and VV's comment: checked below
for l in tv_lines:
    check(l in mc.split('\n'), 'TV line present: ' + l.strip()[:110])
check("        if (kind === 'shape')      return Na__LeMode__AllImages(items) ? 'images' : 'shapes';" in mc, 'shape rule: TV\'s, without the floor area half')
check('Na__LeImg__Ready(), Na__DrawCfg__Load()' in mc and 'Na__LeDocKeys__Ready(), Na__LeImg__Ready()' in mc, 'ready chain: Img after DocKeys, before DrawCfg (TV order)')
reg = mc[mc.index('Na__LePanelVec__Register();'):]
check(reg.split('\n')[1].strip().startswith('Na__LePanelImages__Register();'), 'Images panel registers straight after Vector Tools')

# 2. Insert: deleting every VV GUARD code line gives back the file's code before W3-09 (TrueVision 1.2.0's code).
ins_new = read(os.path.join(LE, '54__Feature__SheetImages', 'Na__LayoutEditor__SheetImages__Insert__.js'))
ins_old = read(os.path.join(HERE, 'backup', 'Na__LayoutEditor__SheetImages__Insert__.js'))
cut = '// REGION | Module Imports'
new_code = '\n'.join(l for l in ins_new[ins_new.index(cut):].split('\n') if 'VV GUARD' not in l)
check(new_code == ins_old[ins_old.index(cut):], 'Insert: code minus the two VV GUARD lines == the code before (TrueVision 1.2.0)')
check(len([l for l in ins_new[ins_new.index(cut):].split('\n') if 'VV GUARD' in l]) == 2, 'Insert: exactly two VV GUARD code lines')

# 3. Every PickUpMove call in Sheet Images sits under the guard.
for name in os.listdir(os.path.join(LE, '54__Feature__SheetImages')):
    if not name.endswith('.js'): continue
    lines = read(os.path.join(LE, '54__Feature__SheetImages', name)).split('\n')
    for i, l in enumerate(lines):
        if 'Na__LeTools__PickUpMove()' in l and not l.lstrip().startswith('//'):
            check('if (!Na__LeTools__VV_HOLD_AUTO_MOVE)' in lines[i - 1], name + ':' + str(i + 1) + ' PickUpMove guarded')

# 4. No import cycle through the new edge: Insert is not reachable from HitResolution.
IMP = re.compile(r"^\s*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'([^']+)';", re.M)
def deps(path):
    try: text = read(path)
    except OSError: return []
    out = []
    for spec in IMP.findall(text):
        if spec.startswith('.'): out.append(os.path.normpath(os.path.join(os.path.dirname(path), spec)))
    return out
start = os.path.normpath(os.path.join(LE, '30__System__SheetTools', 'Na__LayoutEditor__SheetTools__HitResolution__.js'))
target = os.path.normpath(os.path.join(LE, '54__Feature__SheetImages', 'Na__LayoutEditor__SheetImages__Insert__.js'))
seen, stack = set(), [start]
while stack:
    p = stack.pop()
    if p in seen: continue
    seen.add(p)
    stack.extend(deps(p))
check(target not in seen, 'HitResolution\'s import closure (' + str(len(seen)) + ' modules) does not reach Insert: no cycle')

# 5. AppConfig accordion: TrueVision's sequence restricted to the sections this app has registered so far.
import json
cfg = json.load(open(os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), encoding='utf-8'))
def find(o, k):
    if isinstance(o, dict):
        if k in o: return o[k]
        for v in o.values():
            r = find(v, k)
            if r is not None: return r
    return None
acc = find(cfg, 'LayoutEditor__Panels__AccordionSections')
tv_acc = ["text", "dimensions", "shapes", "images", "leaders", "floor-areas", "patterns"]
check(acc == [s for s in tv_acc if s != 'floor-areas'], 'AccordionSections = TrueVision\'s less floor-areas (W3-10): ' + json.dumps(acc))

print('\n' + ('%d FAILED' % fails if fails else 'every check passed'))
sys.exit(1 if fails else 0)
