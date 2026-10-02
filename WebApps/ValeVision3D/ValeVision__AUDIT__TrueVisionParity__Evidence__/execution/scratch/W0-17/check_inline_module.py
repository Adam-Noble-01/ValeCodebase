# =============================================================================
# W0-17 - static checks on index.html's inline module script (scratch)
# =============================================================================
#
# 1. Extracts every <script type="module"> block from an index.html, writes it
#    to scratch as .mjs and runs `node --check` on it (ESM parse, top-level
#    await allowed). G1/G2 do not parse the inline script's syntax.
# 2. Resolves every named import of the inline script against the export block
#    of the target module (G2 checks modules under 02__Src__AppModules only,
#    never index.html's own imports).
# 3. Reports the start-up order (first line of each call of interest) relative
#    to Na__AppFlow__StartLoadingSequence.
#
# Usage: python check_inline_module.py <index.html> <label>
# =============================================================================

import pathlib
import re
import subprocess
import sys

SCRATCH = pathlib.Path(__file__).resolve().parent


def strip_comments(src):
    out, i, quote = [], 0, None
    n = len(src)
    while i < n:
        c = src[i]
        nx = src[i + 1] if i + 1 < n else ''
        if quote:
            out.append(c)
            if c == '\\':
                out.append(nx)
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in '"\'`':
            quote = c
            out.append(c)
            i += 1
            continue
        if c == '/' and nx == '/':
            while i < n and src[i] != '\n':
                i += 1
            continue
        if c == '/' and nx == '*':
            i += 2
            while i < n and not (src[i] == '*' and i + 1 < n and src[i + 1] == '/'):
                i += 1
            i += 2
            out.append(' ')
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def exported_names(module_path):
    src = strip_comments(module_path.read_text(encoding='utf-8'))
    names = set()
    for block in re.findall(r'export\s*\{([^}]*)\}', src):
        for part in block.split(','):
            part = part.strip()
            if not part:
                continue
            m = re.match(r'(\w+)(?:\s+as\s+(\w+))?$', part)
            if m:
                names.add(m.group(2) or m.group(1))
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+(\w+)', src):
        names.add(m.group(1))
    return names


def main():
    html_path = pathlib.Path(sys.argv[1])
    label = sys.argv[2]
    app_root = html_path.parent if html_path.name == 'index.html' and (html_path.parent / '02__Src__AppModules').exists() \
        else pathlib.Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D')
    html = html_path.read_bytes().decode('utf-8').replace('\r\n', '\n')

    blocks = re.findall(r'<script\s+type="module"[^>]*>(.*?)</script>', html, flags=re.S)
    print(f'[{label}] module script blocks: {len(blocks)}')
    ok = True
    for idx, body in enumerate(blocks):
        out = SCRATCH / f'inline_module_{label}_{idx}.mjs'
        out.write_text(body, encoding='utf-8')
        r = subprocess.run(['node', '--check', str(out)], capture_output=True, text=True)
        print(f'  block {idx}: {len(body.splitlines())} lines, node --check exit {r.returncode}')
        if r.returncode != 0:
            ok = False
            print(r.stderr)

    # Named import resolution for every block
    missing = []
    total = 0
    for body in blocks:
        clean = strip_comments(body)
        for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', clean):
            names = [p.strip().split(' as ')[0].strip() for p in m.group(1).split(',') if p.strip()]
            spec = m.group(2)
            if not spec.startswith('.'):
                continue                                    # import-map bare specifiers (three etc.)
            target = (app_root / spec).resolve()
            if not target.exists():
                missing.append((spec, '<file missing>'))
                continue
            exp = exported_names(target)
            for name in names:
                total += 1
                if name not in exp:
                    missing.append((spec, name))
    print(f'  named imports from relative modules: {total}; unresolved: {len(missing)}')
    for spec, name in missing:
        print(f'    UNRESOLVED {name} <- {spec}')
        ok = False

    # Start-up order report
    lines = html.split('\n')
    def first(pattern):
        for i, line in enumerate(lines, 1):
            if re.match(pattern, line):
                return i
        return None
    marks = [
        ('Na__DevGate__Initialize()',                    r'^\s+Na__DevGate__Initialize\(\);'),
        ('Na__DrawView__ProjectData__Initialize()',      r'^\s+Na__DrawView__ProjectData__Initialize\(\);'),
        ('Na__SectSceneData__Initialize() (direct)',     r'^\s+Na__SectSceneData__Initialize\(\);'),
        ('Na__DrawCfg__SetAppConfig(...)',               r'^\s+Na__DrawCfg__SetAppConfig\('),
        ('Na__DrawCfg__Load()',                          r'^\s+(void\s+)?Na__DrawCfg__Load\(\);'),
        ('Na__AppFlow__StartLoadingSequence({',          r'^\s+Na__AppFlow__StartLoadingSequence\(\{'),
        ('Na__UiFeature__InitializeLocalhostDevMenu()',  r'^\s+Na__UiFeature__InitializeLocalhostDevMenu\(\);'),
        ('Na__UiFeature__InitializeCrossSectionControls',r'^\s+Na__UiFeature__InitializeCrossSectionControls\('),
        ('Na__DrawView__Transitions__Initialize',        r'^\s+Na__DrawView__Transitions__Initialize\('),
        ('Na__North__DevMenu__Initialize',               r'^\s+Na__North__DevMenu__Initialize\('),
        ('Na__PlCfg__SetAppConfig',                      r'^\s+Na__PlCfg__SetAppConfig\('),
        ('Na__LeLoad__Initialize({',                     r'^\s+Na__LeLoad__Initialize\(\{'),
    ]
    print('  start-up order (line numbers):')
    seq = None
    for name, pat in marks:
        ln = first(pat)
        if name.startswith('Na__AppFlow__StartLoadingSequence'):
            seq = ln
        print(f'    {str(ln):>5}  {name}')
    for name, pat in marks[:5]:
        ln = first(pat)
        rel = 'ABOVE' if (ln is not None and seq is not None and ln < seq) else 'below/absent'
        print(f'    {rel:12} the loading sequence: {name}')
    print(f'[{label}] RESULT: ' + ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
