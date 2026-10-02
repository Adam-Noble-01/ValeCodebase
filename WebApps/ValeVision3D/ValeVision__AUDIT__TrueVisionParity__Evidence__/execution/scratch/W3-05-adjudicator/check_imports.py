import re, subprocess, os, sys
TVROOT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
PIN = 'b2aa9151'

def tv(path):
    return subprocess.run(['git', '-C', TVROOT, 'show', f'{PIN}:{TVAPP}{path}'], capture_output=True).stdout.decode('utf-8', 'replace')

imp_re = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)

def exports(text):
    names = set()
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)', text):
        names.add(m.group(1))
    for m in re.finditer(r'export\s*\{([^}]*)\}', text):
        for part in m.group(1).split(','):
            part = part.strip()
            if not part: continue
            names.add(part.split(' as ')[-1].strip())
    return names

def check(tvpath, only=None):
    src = tv(tvpath)
    base = os.path.dirname(tvpath)
    bad = 0
    for m in imp_re.finditer(src):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()]
        names = [re.sub(r'//.*', '', n).strip() for n in names]
        names = [n for n in names if n]
        rel = m.group(2)
        if only and not any(o in rel for o in only):
            continue
        target = os.path.normpath(os.path.join(VV, base, rel))
        if not os.path.exists(target):
            print('MISSING FILE', rel); bad += 1; continue
        ex = exports(open(target, encoding='utf-8', errors='replace').read())
        miss = [n for n in names if n not in ex]
        if miss:
            print('MISSING EXPORT', rel, miss); bad += 1
    print(tvpath, 'problems:', bad)

check('51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js')
check('51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js', only=['37__System__VectorTools', '27__System__DrawingGrid', '33__System__DrawingAxes'])
