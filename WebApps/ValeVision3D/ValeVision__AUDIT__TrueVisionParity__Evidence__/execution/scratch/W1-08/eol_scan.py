# W1-08 scratch: line endings, sizes and sha1 of the files this package owns (read only)
import hashlib
import os
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FILES = [
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__AppConfig__.json',
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__ConfigState__.js',
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__DevMenu__StoreyRow__.js',
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__ProjectJson__Data__.js',
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__StoreyLevel__.js',
    r'02__Src__AppModules\42__System__FloorPlanViews\Na__FloorPlan__Styles__DevMenu__.css',
    r'80__Testing__PrototypeEnvironment\Na__Test__FloorPlanStoreyLevel__.test.mjs',
]

out = []
for rel in FILES:
    path = os.path.join(VV, rel)
    if not os.path.exists(path):
        out.append('%-80s ABSENT' % rel)
        continue
    data = open(path, 'rb').read()
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n') - crlf
    nonascii = sum(1 for b in data if b > 127)
    bom = data.startswith(b'\xef\xbb\xbf')
    out.append('%-80s %7d bytes sha1 %s  crlf %d lf %d nonascii %d bom %s' % (rel, len(data), hashlib.sha1(data).hexdigest()[:8], crlf, lf, nonascii, bom))
print('\n'.join(out))
if len(sys.argv) > 1:
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
