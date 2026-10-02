"""W2-37: compare the parametric config, TV pin vs VV, block by block and key by key."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
N = 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
tv = json.load(open(os.path.join(HERE, 'tv', N), encoding='utf-8'))
vvp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'vv_before', N)
vv = json.load(open(vvp, encoding='utf-8-sig'))

def flat(o, p=''):
    out = {}
    if isinstance(o, dict):
        for k, v in o.items():
            out.update(flat(v, p + '/' + k))
    elif isinstance(o, list) and o and all(isinstance(x, dict) for x in o):
        for i, x in enumerate(o):
            key = x.get('Element__Id') or x.get('Key') or x.get('Id') or str(i)
            out.update(flat(x, p + '[' + str(key) + ']'))
    else:
        out[p] = o
    return out

print('top-level TV:', list(tv.keys()))
print('top-level VV:', list(vv.keys()))
ft, fv = flat(tv), flat(vv)
only_tv = sorted(k for k in ft if k not in fv)
only_vv = sorted(k for k in fv if k not in ft)
diff = sorted(k for k in ft if k in fv and ft[k] != fv[k])
from collections import Counter
print('\nTV-only key paths by block:', Counter(k.split('/')[1] + ('/' + k.split('/')[2].split('[')[0] if k.count('/') > 1 else '') for k in only_tv))
print('\nVV-only key paths:'); [print('  ', k, '=', repr(fv[k])[:160]) for k in only_vv]
print('\nDiffering values:'); [print('  ', k, '\n      TV:', repr(ft[k])[:300], '\n      VV:', repr(fv[k])[:300]) for k in diff]
if '--tvonly' in sys.argv:
    print('\nTV-only:'); [print('  ', k, '=', repr(ft[k])[:140]) for k in only_tv]
