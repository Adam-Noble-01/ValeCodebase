import json, subprocess
PIN = 'b2aa9151'
tv_raw = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show',
                         PIN + ':na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json'],
                        capture_output=True).stdout
vv_path = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\02__AppData\Na__AppConfig__Main.json'
vv_raw = open(vv_path, 'rb').read()
tv = json.loads(tv_raw.decode('utf-8'))
vv = json.loads(vv_raw.decode('utf-8'))
print('VV bytes', len(vv_raw), 'CRLF' if b'\r\n' in vv_raw else 'LF', 'BOM' if vv_raw.startswith(b'\xef\xbb\xbf') else 'noBOM')

def walk(d, prefix=''):
    out = {}
    for k, v in d.items():
        p = prefix + '.' + k if prefix else k
        if isinstance(v, dict):
            out.update(walk(v, p))
        else:
            out[p] = v
    return out

ft, fv = walk(tv), walk(vv)
print('TOP TV only:', [k for k in tv if k not in vv])
print('TOP VV only:', [k for k in vv if k not in tv])
print('--- TV-only leaf keys')
for k in ft:
    if k not in fv:
        print('  ', k)
print('--- VV-only leaf keys')
for k in fv:
    if k not in ft:
        print('  ', k)
