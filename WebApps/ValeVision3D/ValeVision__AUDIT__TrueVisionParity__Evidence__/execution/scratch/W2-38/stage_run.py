# Build two scratch run trees for the W2-38 tests (the live VV config lacks the CabinetInfill and
# ProjectQr blocks until the parametric panel/config package lands them):
#   run_tvcfg/ - the staged modules and tests + TrueVision's parametric config at the pin
#   run_vvcfg/ - the staged modules and tests + VV's live parametric config with ONLY TrueVision's
#                CabinetInfill / ProjectQr blocks, their tiles, type names and labels merged in
# Both take VV's live 53__Feature__ProjectQrCode (config, encoder, painter) and VV's live ShapeGeometry.
import json, os, shutil, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
VVROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN    = 'b2aa9151'
LE     = '02__Src__AppModules/51__System__LayoutEditor/'
FEAT   = LE + '57__Feature__ScrapbookParametric/'
CFG    = FEAT + 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
SOURCE = sys.argv[1] if len(sys.argv) > 1 else 'staged'   # 'staged' or 'live'

OURS = [FEAT + 'Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js',
        FEAT + 'Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js',
        '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookCabinetInfill__.test.mjs',
        '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookProjectQr__.test.mjs']
VV_LIVE = [LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json',
           LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js',
           LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js',
           LE + '15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js']


def P(root, rel):
    return os.path.join(root, rel.replace('/', os.sep))


def put(root, rel, data):
    os.makedirs(os.path.dirname(P(root, rel)), exist_ok=True)
    open(P(root, rel), 'wb').write(data)


tv_cfg_bytes = subprocess.check_output(['git', '-C', TVREPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/' + CFG])
tv_cfg = json.loads(tv_cfg_bytes.decode('utf-8'))
vv_cfg = json.loads(open(P(VVROOT, CFG), 'rb').read().decode('utf-8'))

merged = json.loads(json.dumps(vv_cfg))
for block in ('LayoutEditor__ScrapbookParametric__CabinetInfill', 'LayoutEditor__ScrapbookParametric__ProjectQr'):
    merged[block] = tv_cfg[block]
me, te = merged['LayoutEditor__ScrapbookParametric__Elements'], tv_cfg['LayoutEditor__ScrapbookParametric__Elements']
me['Elements__List'] += [e for e in te['Elements__List'] if e.get('Element__Type') in ('CabinetInfill', 'ProjectQr')]
for t in ('CabinetInfill', 'ProjectQr'):
    me['Elements__TypeNames'][t] = te['Elements__TypeNames'][t]
ml, tl = merged['LayoutEditor__ScrapbookParametric__Labels'], tv_cfg['LayoutEditor__ScrapbookParametric__Labels']
added = [k for k in tl if k not in ml and ('Infill' in k or 'Qr' in k)]
for k in added:
    ml[k] = tl[k]
print('merged labels added:', len(added))

for name, cfg_bytes in (('run_tvcfg', tv_cfg_bytes), ('run_vvcfg', json.dumps(merged, indent=4, ensure_ascii=False).encode('utf-8'))):
    root = os.path.join(HERE, name + ('' if SOURCE == 'staged' else '_live'))
    if os.path.isdir(root):
        shutil.rmtree(root)
    for rel in OURS:
        src = P(os.path.join(HERE, 'staged'), rel) if SOURCE == 'staged' else P(VVROOT, rel)
        put(root, rel, open(src, 'rb').read())
    for rel in VV_LIVE:
        put(root, rel, open(P(VVROOT, rel), 'rb').read())
    put(root, CFG, cfg_bytes)
    print('built', root)
