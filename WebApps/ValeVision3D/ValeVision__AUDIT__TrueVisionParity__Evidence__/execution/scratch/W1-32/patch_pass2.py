# W1-32 pass 2: one PORT NOTE bullet in the mode controller, hash-guarded on what pass 1 wrote.
# usage: python patch_pass2.py --dry-run | --apply | --restore
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import apply_w1_32 as base                                                        # noqa: E402  (parse_blocks, apply_blocks, live_path)

HERE      = os.path.dirname(os.path.abspath(__file__))
MC        = base.MC
EXPECTED  = '926ecbb57a9478db4acd0cd035ad808c4ac12c87'                          # <-- pass 1's write (written_manifest.json)
PASS1_OUT = os.path.join(HERE, 'candidate', 'Na__LayoutEditor__ModeController__.js')
OUT       = os.path.join(HERE, 'candidate', 'Na__LayoutEditor__ModeController__.pass2.js')
MANIFEST  = os.path.join(HERE, 'written_manifest_pass2.json')


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    path = base.live_path(MC)
    live = base.read_bytes(path)
    if mode == '--restore':
        info = json.load(open(MANIFEST, encoding='utf-8'))
        if base.sha1(live) != info['sha1']:
            raise SystemExit('restore refused: live is not what pass 2 wrote')
        with open(path, 'wb') as f:
            f.write(base.read_bytes(PASS1_OUT))
        print('restored pass 1 output')
        return
    if base.sha1(live) != EXPECTED:
        raise SystemExit('mode controller changed since pass 1: ' + base.sha1(live))
    prof = base.eol_profile(live)
    if prof['bare_lf'] or prof['bom']:
        raise SystemExit('not wholly CRLF: %r' % prof)
    blocks = base.parse_blocks(os.path.join(HERE, 'blocks', 'mc_blocks_pass2.txt'))
    text = base.apply_blocks(live.decode('utf-8').replace('\r\n', '\n'), blocks, 'ModeController pass 2')
    out = text.replace('\n', '\r\n').encode('utf-8')
    with open(OUT, 'wb') as f:
        f.write(out)
    print('candidate %s  %s  non-ascii in new text: %r' % (base.sha1(out)[:8], base.eol_profile(out), base.non_ascii(''.join(b[2] for b in blocks))))
    if mode == '--apply':
        if base.sha1(base.read_bytes(path)) != EXPECTED:
            raise SystemExit('changed at write time: nothing written')
        with open(path, 'wb') as f:
            f.write(out)
        json.dump({'sha1': base.sha1(out), 'bytes': len(out), **base.eol_profile(out)}, open(MANIFEST, 'w', encoding='utf-8'), indent=2)
        print('APPLIED pass 2: ' + base.sha1(out))


if __name__ == '__main__':
    main()
