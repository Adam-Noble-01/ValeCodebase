"""W3 gate extra (read-only): every W3-touched VV file that exists at the same app-relative path in TrueVision at the
pin b2aa9151 is compared with TrueVision's bytes (line endings normalised). Each differing line is classed:
  header  - inside the file's leading comment block (banner, PORT NOTE, DEVELOPMENT LOG, description);
  token   - outside it, and equal to TrueVision's line once TrueVision3D/TrueVision/TRUEVISION3D -> ValeVision3D/ValeVision/
            VALEVISION3D (the console prefix, K2 K3 stems);
  body    - any other change (a VV seam, which the Port Record must name).
Writes verbatim_w3.txt / verbatim_w3.json. No file in the tree is written."""
import difflib, json, os, re, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TVP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.dirname(os.path.abspath(__file__))
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = json.load(open(os.path.join(OUT, 'crosscheck_w3.json'), encoding='utf-8'))
tv_list = set(subprocess.run(['git', '-C', NAWEB, 'ls-tree', '-r', '--name-only', PIN, '--', TVP], capture_output=True, text=True, encoding='utf-8').stdout.splitlines())


def tok(s):
    for a, b in (('TRUEVISION3D', 'VALEVISION3D'), ('TrueVision3D', 'ValeVision3D'), ('TrueVision', 'ValeVision'), ('truevision', 'valevision')):
        s = s.replace(a, b)
    return s


def header_end(lines, ext):
    if ext not in ('.js', '.mjs', '.cjs', '.css'):
        return 0
    in_block = False
    for i, l in enumerate(lines):
        t = l.strip()
        if in_block:
            if '*/' in t:
                in_block = False
            continue
        if t == '' or t.startswith('//'):
            continue
        if t.startswith('/*'):
            in_block = '*/' not in t[2:]
            continue
        return i
    return len(lines)


res = []
for r in rows:
    if not r['touched_in_cont'] or not r['path'].startswith('WebApps/ValeVision3D/') or r['code'] == ' D':
        continue
    rel = r['path'][len('WebApps/ValeVision3D/'):]
    if TVP + rel not in tv_list:
        res.append({'path': rel, 'tv': False, 'owners': r['strict_cont']})
        continue
    tvb = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVP + rel], capture_output=True).stdout
    vvb = open(os.path.join(VCB, *r['path'].split('/')), 'rb').read()
    tvl = tvb.decode('utf-8', 'replace').replace('\r\n', '\n').split('\n')
    vvl = vvb.decode('utf-8', 'replace').replace('\r\n', '\n').split('\n')
    ext = os.path.splitext(rel)[1].lower()
    hv, ht = header_end(vvl, ext), header_end(tvl, ext)
    sm = difflib.SequenceMatcher(None, tvl, vvl, autojunk=False)
    c = {'header': 0, 'token': 0, 'body': 0}
    body_samples = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            continue
        tv_seg, vv_seg = tvl[i1:i2], vvl[j1:j2]
        # header if both sides lie in the header blocks
        if j2 <= hv and i2 <= ht:
            c['header'] += max(len(tv_seg), len(vv_seg))
            continue
        if len(tv_seg) == len(vv_seg) and all(tok(a) == b for a, b in zip(tv_seg, vv_seg)):
            c['token'] += len(vv_seg)
            continue
        n = max(len(tv_seg), len(vv_seg))
        c['body'] += n
        if len(body_samples) < 3:
            body_samples.append('VV:%d-%d %s' % (j1 + 1, j2, (vv_seg[0] if vv_seg else '(removed: ' + tv_seg[0] + ')').strip()[:110]))
    res.append({'path': rel, 'tv': True, 'identical': tvb == vvb, 'eol_vv': 'CRLF' if b'\r\n' in vvb else 'LF', 'eol_tv': 'CRLF' if b'\r\n' in tvb else 'LF',
                'counts': c, 'samples': body_samples, 'owners': r['strict_cont']})

json.dump(res, open(os.path.join(OUT, 'verbatim_w3.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
tv = [x for x in res if x['tv']]
L = ['W3-touched VV files (not deleted): %d; at the same path in TV at %s: %d; VV-only paths: %d' % (len(res), PIN, len(tv), len(res) - len(tv))]
ident = [x for x in tv if x['identical']]
hdr = [x for x in tv if not x['identical'] and x['counts']['body'] == 0]
body = [x for x in tv if x['counts']['body'] > 0]
L.append('byte-identical to TV: %d; differing only in the header block and/or token seams: %d; with body changes: %d' % (len(ident), len(hdr), len(body)))
L.append('')
L.append('== header / token only (path  header-lines token-lines  eol) ==')
for x in hdr:
    L.append('  %-110s h%-4d t%-3d %s  <- %s' % (x['path'], x['counts']['header'], x['counts']['token'], x['eol_vv'], ','.join(x['owners'])))
L.append('')
L.append('== body changes (path  body-lines  header token  eol  owners; first hunks) ==')
for x in sorted(body, key=lambda x: -x['counts']['body']):
    L.append('  %-110s b%-5d h%-4d t%-3d %s  <- %s' % (x['path'], x['counts']['body'], x['counts']['header'], x['counts']['token'], x['eol_vv'], ','.join(x['owners'])))
    for s in x['samples']:
        L.append('        ' + s)
L.append('')
L.append('== VV-only paths (no TV file at the same path) ==')
for x in res:
    if not x['tv']:
        L.append('  %s  <- %s' % (x['path'], ','.join(x['owners'])))
open(os.path.join(OUT, 'verbatim_w3.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print('\n'.join(L[:2]))
