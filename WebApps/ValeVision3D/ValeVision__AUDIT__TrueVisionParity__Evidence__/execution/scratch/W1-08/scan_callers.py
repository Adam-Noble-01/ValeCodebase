# W1-08 scratch: every call (and every bare reference) of the floor plan data functions whose FIRST argument
# changes meaning with TrueVision's convention (a drawings block in ValeVision's old module, the presentation
# config - ignored for records - in TrueVision's). Reads 02__Src__AppModules, 03__Style__AppStylesheets'
# sibling page index.html and 80__Testing__PrototypeEnvironment; never the app root.
import os
import re
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
ROOTS = [os.path.join(VV, '02__Src__AppModules'), os.path.join(VV, '80__Testing__PrototypeEnvironment')]
FILES = [os.path.join(VV, 'index.html')]
SKIP = {'node_modules', '.claude', '00__Archive', '00__ArchivedVersions'}
FIRST_ARG = ['GetFloorPlans', 'GetEnabledFloorPlans', 'GetPlanById', 'GetPlanForScene', 'NextPlanId', 'CreatePlan',
             'DeletePlan', 'RenumberOrder', 'FindSceneForPlan', 'GetClientDimensionsEnabled', 'SetClientDimensionsEnabled']
NAME = re.compile(r'Na__FpData__(' + '|'.join(FIRST_ARG) + r')\b')

for root in ROOTS:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP]
        for f in filenames:
            if f.endswith(('.js', '.mjs', '.cjs', '.html')):
                FILES.append(os.path.join(dirpath, f))

rows = []
for path in FILES:
    rel = os.path.relpath(path, VV).replace('\\', '/')
    if rel.endswith('42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js'):
        continue
    text = open(path, 'rb').read().decode('utf-8', 'replace')
    for number, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        for m in NAME.finditer(line):
            after = line[m.end():]
            if after.lstrip().startswith('('):
                depth, arg, i = 0, '', after.index('(') + 1
                while i < len(after):
                    ch = after[i]
                    if ch in '([{': depth += 1
                    if ch in ')]}':
                        if depth == 0: break
                        depth -= 1
                    if ch == ',' and depth == 0: break
                    arg += ch
                    i += 1
                rows.append((rel, number, m.group(1), 'call', arg.strip() or '(none)'))
            else:
                kind = 'import/export' if (after.strip() in (',', '') or after.strip().startswith('}')) else 'reference'
                rows.append((rel, number, m.group(1), kind, stripped[:90]))

calls = [r for r in rows if r[3] == 'call']
refs = [r for r in rows if r[3] == 'reference']
for r in calls:
    print('CALL  %-95s :%-5d %-28s first argument: %s' % (r[0], r[1], r[2], r[4]))
for r in refs:
    print('REF   %-95s :%-5d %-28s %s' % (r[0], r[1], r[2], r[4]))
block_like = [r for r in calls if r[2] != 'FindSceneForPlan' and r[4] not in ('(none)', 'null')
              and not (r[2] == 'SetClientDimensionsEnabled' and r[4] == 'null')]
print('\n%d calls, %d bare references; calls whose first argument is anything but nothing or null (FindSceneForPlan aside, '
      'whose first argument is the presentation config in both conventions): %d' % (len(calls), len(refs), len(block_like)))
for r in block_like:
    print('  CHECK  %s:%d %s(%s, ...)' % r[:3] + (r[4],) if False else '  CHECK  %s:%d %s first argument %s' % (r[0], r[1], r[2], r[4]))
sys.exit(0 if not block_like and not refs else 1)
