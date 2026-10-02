import json, re, os, sys
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity"
wp = json.load(open(os.path.join(P,'data','wp_canonical.json'),encoding='utf-8'))
dr = json.load(open(os.path.join(P,'data','decision_register.json'),encoding='utf-8'))
tf = json.load(open(os.path.join(P,'data','target_folder_map.json'),encoding='utf-8'))
fr = json.load(open(os.path.join(P,'data','file_rename_map.json'),encoding='utf-8'))
pk = wp['packages']
print('packages type', type(pk), len(pk))
if isinstance(pk, dict):
    ids = set(pk.keys())
else:
    ids = set(p.get('id') or p.get('wp_id') for p in pk)
print('sample pkg keys', (list(pk[0].keys()) if isinstance(pk,list) else list(next(iter(pk.values())).keys())))
drids = set(d.get('dr_id') for d in dr)   # H1: decision_register.json keys DRs as dr_id (d.get('id') gave {None})
print('dr sample keys', list(dr[0].keys()))
tfids = set(t.get('id') for t in tf)
print('tf sample keys', list(tf[0].keys()))
frids = set(f.get('id') for f in fr)
print('fr sample keys', list(fr[0].keys()))
print(len(ids), len(drids), len(tfids), len(frids))
rep = os.path.join(P,'report')
for fn in sorted(os.listdir(rep)):
    if not fn.startswith('R') or not fn.endswith('.md') or '.pre_' in fn: continue   # H1: live sections only
    t = open(os.path.join(rep,fn),encoding='utf-8').read()
    wps = set(re.findall(r'\b(W[0-6T]-\d{2})\b', t))
    bad = sorted(w for w in wps if w not in ids)
    drs = set(re.findall(r'\bDR-(\d{2})\b', t))
    baddr = sorted('DR-'+d for d in drs if 'DR-'+d not in drids)
    tfs = set(re.findall(r'\bTF-([TLRS]\d{2})\b', t))
    badtf = sorted('TF-'+x for x in tfs if 'TF-'+x not in tfids)
    frs = set(re.findall(r'\bFR-(\d{2})\b', t))
    badfr = sorted('FR-'+x for x in frs if 'FR-'+x not in frids)
    print(fn, 'wp refs', len(wps), 'bad', bad, '| DR bad', baddr, '| TF bad', badtf, '| FR bad', badfr)
