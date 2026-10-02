"""W2-06 scratch: resolve every import of the TV folder-50 files against VV (folder-50 targets from TV's new set,
everything else from the live VV tree). Prints missing files / names."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
F50 = os.path.join(VV_ROOT, '02__Src__AppModules', '50__System__ProjectedLinework')
OURS = ['AuthoredEdges', 'ClipKernel', 'ConfigAccess', 'CpuBackend', 'DevMenu__Controls', 'DoorPose', 'EdgeExtractor',
        'ModelStage', 'Pipeline', 'Projector', 'StageSampler', 'ViewDefinition', 'WebGpuBackend']

IMPORT_RE = re.compile(r'^\s*import\s+(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))?\s*(?:from\s+)?[\'"]([^\'"]+)[\'"]', re.M | re.S)
EXPORT_BLOCK_RE = re.compile(r'export\s*\{([^}]*)\}', re.S)
EXPORT_DECL_RE = re.compile(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+(\w+)')


def strip_comments(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return re.sub(r'(^|[^:\'"])//.*$', r'\1', src, flags=re.M)


def exports_of(text):
    text = strip_comments(text)
    names = set(EXPORT_DECL_RE.findall(text))
    for block in EXPORT_BLOCK_RE.findall(text):
        for part in block.split(','):
            part = part.strip()
            if not part:
                continue
            names.add(part.split(' as ')[-1].strip())
    return names


def source_for(path):
    base = os.path.basename(path)
    m = re.match(r'Na__ProjectedLinework__(.+)__\.js$', base)
    if m and m.group(1) in OURS and os.path.normcase(os.path.dirname(path)) == os.path.normcase(F50):
        return open(os.path.join(HERE, 'tv', base), encoding='utf-8').read(), 'TV'
    if os.path.exists(path):
        return open(path, encoding='utf-8').read(), 'VV'
    return None, None


def main():
    problems = 0
    for name in OURS:
        text = open(os.path.join(HERE, 'tv', 'Na__ProjectedLinework__' + name + '__.js'), encoding='utf-8').read()
        code = strip_comments(text)
        for m in IMPORT_RE.finditer(code):
            named, star, default, spec = m.groups()
            if not spec.startswith('.'):
                print('  %-22s bare %s' % (name, spec))
                continue
            target = os.path.normpath(os.path.join(F50, spec))
            src, side = source_for(target)
            if src is None:
                print('MISSING FILE %-18s %s' % (name, spec)); problems += 1
                continue
            if named:
                wanted = [p.strip().split(' as ')[0].strip() for p in named.strip('{}').split(',') if p.strip()]
                have = exports_of(src)
                miss = [w for w in wanted if w not in have]
                if miss:
                    print('MISSING NAMES %-17s %s (%s): %s' % (name, spec, side, ', '.join(miss))); problems += 1
                else:
                    print('  ok %-22s %-90s %s %d' % (name, spec, side, len(wanted)))
    print('problems:', problems)


if __name__ == '__main__':
    main()
