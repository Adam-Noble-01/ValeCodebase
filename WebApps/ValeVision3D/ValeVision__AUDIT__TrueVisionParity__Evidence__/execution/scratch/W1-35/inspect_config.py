# W1-35 - read-only: compare the MarginNotes block and the labels this package touches,
# VV (live) against TV (the pin copy in scratch/W1-35/tv). Writes nothing.
import difflib, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json'
TV   = os.path.join(HERE, 'tv', 'tv_AppConfig.json')

def load(p):
    return json.loads(open(p, 'rb').read().decode('utf-8'))

def find_block(cfg, key):
    for bk, bv in cfg.items():
        if isinstance(bv, dict) and key in bv:
            return bk, bv[key]
    return None, None

def main():
    vv, tv = load(VV), load(TV)
    for key in ('LayoutEditor__MarginNotes__Description', 'LayoutEditor__Labels__MarginToggle', 'LayoutEditor__Labels__MarginToggleTitle',
                'LayoutEditor__Labels__ZoomFit', 'LayoutEditor__Labels__Undo', 'LayoutEditor__Labels__Redo', 'LayoutEditor__Labels__MenuZoomFit'):
        vb, vval = find_block(vv, key)
        tb, tval = find_block(tv, key)
        print('==', key)
        print('   VV block:', vb, '| TV block:', tb, '| equal:', vval == tval)
        if isinstance(vval, str) and isinstance(tval, str) and vval != tval:
            sm = difflib.SequenceMatcher(None, vval, tval)
            for op, a0, a1, b0, b1 in sm.get_opcodes():
                if op != 'equal':
                    print('   ', op, 'VV:', repr(vval[a0:a1]), '| TV:', repr(tval[b0:b1]))
    # the MarginNotes block keys, VV vs TV
    vb = vv.get('LayoutEditor__MarginNotes__Config', {})
    tb = tv.get('LayoutEditor__MarginNotes__Config', {})
    print('MarginNotes block keys VV', len(vb), 'TV', len(tb))
    print('  VV only:', [k for k in vb if k not in tb])
    print('  TV only:', [k for k in tb if k not in vb])
    print('  differ :', [k for k in vb if k in tb and vb[k] != tb[k]])
    # The labels block: where are MarginToggle keys and their neighbours (raw text lines)
    raw = open(VV, 'rb').read().decode('utf-8').split('\n')
    for i, line in enumerate(raw):
        if 'MarginToggle' in line or 'MarginNotes__Description' in line:
            for j in range(max(0, i - 2), min(len(raw), i + 3)):
                print('%5d %s' % (j + 1, raw[j][:160]))
            print('   ---')

if __name__ == '__main__':
    main()
