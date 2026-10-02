# R6 helper: read-only scan of line endings in both apps' drawing-system source folders.
# Writes only r6_eol_scan.json next to this script.
import os, sys, json, collections

ROOTS = {
    'VV': r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D',
    'TV': r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode',
    'WCP': r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia',
}
SUBS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
EXT = {'.js', '.mjs', '.cjs', '.css', '.json', '.html', '.md', '.py'}
SEP = os.sep


def kind(p):
    b = open(p, 'rb').read()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    if crlf and lf:
        return 'mixed'
    if crlf:
        return 'crlf'
    if lf:
        return 'lf'
    return 'none'


out = {}
files_kind = {}
for app in ('VV', 'TV'):
    c = collections.Counter()
    per = collections.defaultdict(collections.Counter)
    for s in SUBS:
        base = os.path.join(ROOTS[app], s)
        for dp, dn, fn in os.walk(base):
            dn[:] = [d for d in dn if d not in ('node_modules', '.claude', '.git')]
            for f in fn:
                ext = os.path.splitext(f)[1].lower()
                if ext not in EXT:
                    continue
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, ROOTS[app]).replace(SEP, '/')
                if '/04__Lib__ThirdParty' in '/' + rel:
                    continue
                k = kind(p)
                c[k] += 1
                top = '/'.join(rel.split('/')[:2])
                per[top][k] += 1
                files_kind[app + '/' + rel] = k
    out[app] = {'total': dict(c), 'per_top': {k: dict(v) for k, v in sorted(per.items())}}
    for f in os.listdir(ROOTS[app]):
        p = os.path.join(ROOTS[app], f)
        if os.path.isfile(p) and os.path.splitext(f)[1].lower() in EXT:
            out[app].setdefault('root_files', {})[f] = kind(p)
            files_kind[app + '/' + f] = kind(p)

for f in ['server.py', 'Server__ValeVisionScrapbook__Api__.py',
          '02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js',
          '02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js',
          'CloudflareWorker/src/index.js']:
    p = os.path.join(ROOTS['WCP'], f.replace('/', SEP))
    k = kind(p) if os.path.exists(p) else 'missing'
    out.setdefault('WCP', {})[f] = k
    files_kind['WCP/' + f] = k

json.dump({'summary': out, 'files': files_kind},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'r6_eol_scan.json'), 'w'), indent=1)
print(json.dumps({a: out[a]['total'] for a in ('VV', 'TV')}, indent=1))
print(json.dumps(out['WCP'], indent=1))
print('VV root:', out['VV'].get('root_files'))
print('TV root:', out['TV'].get('root_files'))
