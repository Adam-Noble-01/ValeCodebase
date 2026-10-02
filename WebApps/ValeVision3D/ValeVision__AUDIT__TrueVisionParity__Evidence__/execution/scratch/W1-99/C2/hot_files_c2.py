"""W1-99 (continuation) - read-only: of the 68 files the placeholder pass changed (C2/preimage_manifest.json), the ones
hot_file_ownership.json lists, with their editors after Wave 1 (the next holders who must re-read the file), and each
file's SHA-1 before and after. Writes hot_files_c2.txt."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
HOT = os.path.join(os.path.dirname(EXEC), 'parity', 'data', 'hot_file_ownership.json')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
man = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
hot = json.load(open(HOT, encoding='utf-8'))['files']
by = {}
for h in hot:
    f = h['file']
    if f.startswith('VVM/'):
        f = 'WebApps/ValeVision3D/02__Src__AppModules/' + f[4:]
    elif f.startswith('VV/'):
        f = 'WebApps/ValeVision3D/' + f[3:]
    else:
        continue
    by[f.replace('/LE/', '/51__System__LayoutEditor/')] = h
rows = []
for r in man:
    h = by.get(r['rel'])
    if not h:
        continue
    later = [e for e in h['editors'] if not (e.startswith('W0-') or e.startswith('W1-'))]
    rows.append('%s | %s -> %s | %d -> %d | later editors: %s' % (
        r['rel'].replace('WebApps/ValeVision3D/02__Src__AppModules/', '').replace('WebApps/ValeVision3D/', 'VV/'),
        r['sha1_before'][:8], r['sha1_after'][:8], r['size_before'], r['size_after'], ', '.join(later) or '-'))
open(os.path.join(HERE, 'hot_files_c2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(rows) + '\n')
print('hot files among the 68: %d' % len(rows))
print('\n'.join(rows))
