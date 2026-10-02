"""Write a unified diff of each landed register file against TV's bytes at the pin (scratch/W4-18/diffs)."""
import difflib, hashlib, os

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\51__Feature__DrawingRegister'
OUT = os.path.join(HERE, 'diffs')
os.makedirs(OUT, exist_ok=True)
for short in ['Data', 'DeleteDialog', 'Transactions', 'Notes', 'Preview', 'Pdf']:
    name = 'Na__LayoutEditor__Register__%s__.js' % short
    tv = open(os.path.join(HERE, 'tv', name), encoding='utf-8').read().splitlines(keepends=True)
    vv_bytes = open(os.path.join(VV, name), 'rb').read()
    vv = vv_bytes.decode('utf-8').splitlines(keepends=True)
    diff = list(difflib.unified_diff(tv, vv, 'TV b2aa9151/' + name, 'VV/' + name, n=0))
    open(os.path.join(OUT, name + '.diff'), 'w', encoding='utf-8', newline='\n').writelines(diff)
    minus = sum(1 for l in diff if l.startswith('-') and not l.startswith('---'))
    plus = sum(1 for l in diff if l.startswith('+') and not l.startswith('+++'))
    print('%-50s -%3d +%3d  lines %d  bytes %d  crlf %s  sha256 %s' % (name, minus, plus, len(vv), len(vv_bytes), b'\r\n' in vv_bytes, hashlib.sha256(vv_bytes).hexdigest()[:16]))
t = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__RegisterNumbering__.test.mjs'
b = open(t, 'rb').read()
print('%-50s new  lines %d  bytes %d  crlf %s  sha256 %s' % (os.path.basename(t), b.count(b'\n'), len(b), b'\r\n' in b, hashlib.sha256(b).hexdigest()[:16]))
