"""Resolve every import of the TV files W3-03 lands against the live VV tree.
A target that is itself one of W3-03's files is resolved against TV's version (it lands in the same change)."""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
ST = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'

TARGETS = {
    'Na__LayoutEditor__SheetTools__HitResolution__.js': ST,
    'Na__LayoutEditor__SheetTools__PointerPress__.js': ST,
    'Na__LayoutEditor__SheetTools__PointerDrag__.js': ST,
    'Na__LayoutEditor__SheetTools__Keyboard__.js': ST,
    'Na__LayoutEditor__SheetTools__.js': ST,
    'Na__LayoutEditor__SheetTools__ContextMenu__.js': ST,
    'Na__LayoutEditor__SheetTools__CopyDrag__.js': ST,
    'Na__LayoutEditor__AxisLock__.js': ST,
    'Na__LayoutEditor__SheetTools__ContentEditing__.js': ST,
    'Na__LayoutEditor__ViewportHandles__.js': LE + '20__System__Viewports/',
    'Na__LayoutEditor__MarginGrip__.js': LE + '50__Feature__Specification/',
}
IN_SET = {os.path.normpath(os.path.join(VV, d, n)).lower(): os.path.join(HERE, 'tv', n) for n, d in TARGETS.items()}

imp_re = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S | re.M)
any_re = re.compile(r"(?:import|export)[^'\"]*?from\s*'([^']+)'|import\s*\(\s*'([^']+)'\s*\)|^\s*import\s*'([^']+)'", re.M)


def exports_of(text):
    names = set(re.findall(r'export\s+(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+)(\w+)', text))
    for block in re.findall(r'export\s*\{([^}]*)\}', text):
        for part in re.sub(r'//[^\n]*', '', block).split(','):
            part = part.strip()
            if not part:
                continue
            names.add(part.split(' as ')[-1].strip())
    return names


bad = 0
for name, d in TARGETS.items():
    text = open(os.path.join(HERE, 'tv', name), encoding='utf-8').read()
    base = os.path.join(VV, d)
    seen = set()
    for m in any_re.finditer(text):
        spec = m.group(1) or m.group(2) or m.group(3)
        if not spec or not spec.startswith('.'):
            continue
        seen.add(spec)
    for spec in sorted(seen):
        target = os.path.normpath(os.path.join(base, spec))
        if target.lower() in IN_SET:
            continue
        if not os.path.exists(target):
            bad += 1
            print(f'{name}: MISSING-FILE {spec}')
    for names, spec in imp_re.findall(text):
        if not spec.startswith('.'):
            continue
        target = os.path.normpath(os.path.join(base, spec))
        src = IN_SET.get(target.lower(), target)
        if not os.path.exists(src):
            continue
        ex = exports_of(open(src, encoding='utf-8').read())
        for n in re.sub(r'//[^\n]*', '', names).split(','):
            n = n.strip().split(' as ')[0].strip()
            if n and n not in ex:
                bad += 1
                print(f'{name}: MISSING-EXPORT {n} in {spec}')
print('bad', bad)
