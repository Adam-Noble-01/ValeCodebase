# W0-12 - which Na__CfApi__* / Na__LocalMirror__* names TrueVision's modules import, read at the pin b2aa9151.
# Writes tv_used_names.json beside this script: { importer: { module: [names] } } plus the union per module.
import json
import os
import re
import subprocess
import sys

sys.dont_write_bytecode = True

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))

TARGETS = {
    'Na__CloudflareIntegration__ApiClient__.js': 'ApiClient',
    'Na__AppUtils__LocalProjectMirror__.js': 'LocalMirror',
}


def git(*args):
    r = subprocess.run(['git', '-C', NAWEB] + list(args), capture_output=True)
    if r.returncode != 0:
        raise SystemExit('git failed: ' + ' '.join(args) + '\n' + r.stderr.decode('utf-8', 'replace'))
    return r.stdout.decode('utf-8', 'replace')


def importers():
    out = git('grep', '-l', '-e', 'Na__CloudflareIntegration__ApiClient__', '-e', 'Na__AppUtils__LocalProjectMirror__',
              PIN, '--', APP + '02__Src__AppModules', APP + 'Index.html', APP + '80__Testing__PrototypeEnvironment')
    files = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        files.append(line.split(':', 1)[1][len(APP):])
    return files


STATIC_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"]", re.S)
DYN_RE = re.compile(r"(?:const|let|var)\s*\{([^}]*)\}\s*=\s*await\s+import\(\s*['\"]([^'\"]+)['\"]\s*\)", re.S)
DYN_MOD_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")


def names_of(block):
    names = []
    for part in block.split(','):
        part = re.sub(r'//[^\n]*', '', part).strip()
        if not part:
            continue
        name = part.split(' as ')[0].strip()
        if name:
            names.append(name)
    return names


def main():
    result = {}
    union = {'ApiClient': set(), 'LocalMirror': set()}
    dynamic = []
    for rel in importers():
        text = git('show', PIN + ':' + APP + rel)
        per = {}
        for rx in (STATIC_RE, DYN_RE):
            for m in rx.finditer(text):
                spec = m.group(2)
                base = spec.rsplit('/', 1)[-1]
                if base in TARGETS:
                    mod = TARGETS[base]
                    per.setdefault(mod, [])
                    for n in names_of(m.group(1)):
                        if n not in per[mod]:
                            per[mod].append(n)
                        union[mod].add(n)
        for m in DYN_MOD_RE.finditer(text):
            base = m.group(1).rsplit('/', 1)[-1]
            if base in TARGETS:
                dynamic.append((rel, m.group(1)))
        # Namespace-style use: any Na__CfApi__X / Na__LocalMirror__X identifier in the file
        used = sorted(set(re.findall(r'\b(Na__CfApi__[A-Za-z_0-9]+|Na__LocalMirror__[A-Za-z_0-9]+)\b', text)))
        result[rel] = {'imports': per, 'identifiers': used}
    out = {
        'pin': PIN,
        'importers': result,
        'union': {k: sorted(v) for k, v in union.items()},
        'dynamic_imports': dynamic,
    }
    with open(os.path.join(HERE, 'tv_used_names.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(out, fh, indent=2)
        fh.write('\n')
    for k, v in out['union'].items():
        print(k, len(v))
        for n in v:
            print('   ', n)
    print('dynamic imports:', dynamic)
    for rel, info in result.items():
        if info['imports']:
            print(rel, json.dumps(info['imports']))


if __name__ == '__main__':
    main()
