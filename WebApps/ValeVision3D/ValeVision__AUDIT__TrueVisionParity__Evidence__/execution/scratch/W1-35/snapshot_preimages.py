# W1-35 - take the pre-images of the two files this package owns (bytes + SHA-1),
# and fetch the TrueVision sources it reads, at the pin, with git show (bytes).
import hashlib, json, os, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
VV     = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN    = 'b2aa9151'
TVAPP  = 'na-apps/30__TrueVision__CoreAppCode/'

OWNED = {
    'Toolbar'  : r'02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Toolbar__.js',
    'AppConfig': r'02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json',
}
TV = {
    'tv_Toolbar.js'      : '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js',
    'tv_AppConfig.json'  : '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
}

def sha1(b): return hashlib.sha1(b).hexdigest()

def main():
    pre_dir = os.path.join(HERE, 'preimage')
    tv_dir  = os.path.join(HERE, 'tv')
    os.makedirs(pre_dir, exist_ok=True)
    os.makedirs(tv_dir, exist_ok=True)
    record = {'preimages': {}, 'tv': {}}
    for key, rel in OWNED.items():
        path = os.path.join(VV, rel)
        data = open(path, 'rb').read()
        out  = os.path.join(pre_dir, os.path.basename(rel))
        if os.path.exists(out) and '--force' not in sys.argv:
            old = open(out, 'rb').read()
            if old != data:
                print('PREIMAGE DIFFERS FROM LIVE (not overwritten):', key, sha1(old)[:8], '->', sha1(data)[:8])
            record['preimages'][key] = {'path': rel, 'bytes': len(old), 'sha1': sha1(old), 'crlf': old.count(b'\r\n'), 'lf': old.count(b'\n')}
            continue
        open(out, 'wb').write(data)
        record['preimages'][key] = {'path': rel, 'bytes': len(data), 'sha1': sha1(data), 'crlf': data.count(b'\r\n'), 'lf': data.count(b'\n')}
    for name, rel in TV.items():
        data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True, check=True).stdout
        open(os.path.join(tv_dir, name), 'wb').write(data)
        record['tv'][name] = {'path': rel, 'bytes': len(data), 'sha1': sha1(data), 'crlf': data.count(b'\r\n'), 'lf': data.count(b'\n')}
    json.dump(record, open(os.path.join(HERE, 'preimages.json'), 'w', encoding='utf-8'), indent=1)
    print(json.dumps(record, indent=1))

if __name__ == '__main__':
    main()
