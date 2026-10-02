# =============================================================================
# W1-32 - ModeController core realignment: apply script (scratch, not shipped)
# =============================================================================
#
# Modes:
#   --dry-run     build the four candidates under candidate/ and write diffs; touches nothing live
#   --apply       re-check every pre-image hash, then write each live file in one whole write
#   --check-live  report whether each live file equals its candidate
#   --restore     put the three pre-images back and delete the new test, but only where the live
#                 file is still exactly what --apply wrote
#
# Line endings: the mode controller is CRLF and stays CRLF (edited in LF, written back CRLF); the
# AppConfig is LF and stays LF; Panel__Scrapbook and the test are whole-file ports built from
# TrueVision's bytes at the pin (git show, LF) and written LF.
# =============================================================================

import argparse
import difflib
import hashlib
import json
import os
import subprocess
import sys

VV     = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE   = os.path.dirname(os.path.abspath(__file__))
PIN    = 'b2aa9151'
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP  = 'na-apps/30__TrueVision__CoreAppCode/'

MC  = '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
CFG = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json'
SCR = '02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js'
TST = '80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs'

PRE_SHA1 = {
    MC  : '4597c9db3046de24ef41c77fdb787b0a2013eec7',
    CFG : '30216db293b71bb0b7891b1242f4aef4645dd8c4',
    SCR : 'e2f370a613c3368bbbe51417042e0b23d19d07ab',
}
TV_SHA1 = {
    SCR : '5871cc8cc89881257013f7e581ad88a4a636e03d',
    TST : '1794ef990dca0107ea30a655235e7fd1900bf8b5',
}

CANDIDATE_DIR = os.path.join(HERE, 'candidate')
PREIMAGE_DIR  = os.path.join(HERE, 'preimage')
MANIFEST      = os.path.join(HERE, 'written_manifest.json')


def live_path(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def read_bytes(path):
    with open(path, 'rb') as f:
        return f.read()


def git_show(rel):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True)
    if out.returncode != 0:
        raise SystemExit('git show failed: ' + rel + ': ' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout


def parse_blocks(path):
    text = read_bytes(path).decode('utf-8').replace('\r\n', '\n')
    blocks, name, kind, buf = {}, None, None, []
    order = []
    for line in text.split('\n'):
        if line.startswith('@@@@ '):
            if name is not None:
                blocks.setdefault(name, {})[kind] = '\n'.join(buf)
            parts = line.split()
            if parts[1] == 'END':
                name, kind, buf = None, None, []
                break
            name, kind, buf = parts[1], parts[2], []
            if name not in order:
                order.append(name)
            continue
        if name is not None:
            buf.append(line)
    result = []
    for n in order:
        if 'OLD' not in blocks[n] or 'NEW' not in blocks[n]:
            raise SystemExit('block ' + n + ' lacks OLD or NEW in ' + path)
        result.append((n, blocks[n]['OLD'], blocks[n]['NEW']))
    return result


def non_ascii(text):
    return sorted({ch for ch in text if ord(ch) > 126})


def apply_blocks(text, blocks, label):
    for name, old, new in blocks:
        count = text.count(old)
        if count != 1:
            raise SystemExit('%s: anchor %s found %d times (want 1)' % (label, name, count))
        text = text.replace(old, new)
    for name, old, new in blocks:
        if text.count(new) != 1:
            raise SystemExit('%s: new text of %s found %d times after the pass (want 1)' % (label, name, text.count(new)))
    return text


def eol_profile(data):
    crlf = data.count(b'\r\n')
    return {'crlf': crlf, 'bare_lf': data.count(b'\n') - crlf, 'bom': data.startswith(b'\xef\xbb\xbf')}


def build():
    out = {}
    report = {}

    # The mode controller: VV's file, hunk replay, CRLF kept
    mc_live = read_bytes(live_path(MC))
    prof = eol_profile(mc_live)
    if prof['bare_lf'] or prof['bom']:
        raise SystemExit('mode controller is not wholly CRLF / has a BOM: %r' % prof)
    mc_blocks = parse_blocks(os.path.join(HERE, 'blocks', 'mc_blocks.txt'))
    mc_text = apply_blocks(mc_live.decode('utf-8').replace('\r\n', '\n'), mc_blocks, 'ModeController')
    out[MC] = mc_text.replace('\n', '\r\n').encode('utf-8')
    report[MC] = {'blocks': [b[0] for b in mc_blocks], 'non_ascii_new': non_ascii(''.join(b[2] for b in mc_blocks))}

    # The Layout Editor config: one value, LF kept
    cfg_live = read_bytes(live_path(CFG))
    prof = eol_profile(cfg_live)
    if prof['crlf'] or prof['bom']:
        raise SystemExit('AppConfig is not wholly LF / has a BOM: %r' % prof)
    cfg_blocks = parse_blocks(os.path.join(HERE, 'blocks', 'appcfg_blocks.txt'))
    cfg_text = apply_blocks(cfg_live.decode('utf-8'), cfg_blocks, 'AppConfig')
    json.loads(cfg_text)                                                         # <-- still JSON
    out[CFG] = cfg_text.encode('utf-8')
    report[CFG] = {'blocks': [b[0] for b in cfg_blocks], 'non_ascii_new': non_ascii(''.join(b[2] for b in cfg_blocks))}

    # Panel__Scrapbook: TrueVision's 1.2.1 whole, seams re-applied, LF
    scr_tv = git_show('02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js')
    if sha1(scr_tv) != TV_SHA1[SCR]:
        raise SystemExit('TV Panel__Scrapbook at the pin is not the bytes read before: ' + sha1(scr_tv))
    scr_blocks = parse_blocks(os.path.join(HERE, 'blocks', 'scrap_blocks.txt'))
    scr_text = apply_blocks(scr_tv.decode('utf-8'), scr_blocks, 'Panel__Scrapbook')
    out[SCR] = scr_text.encode('utf-8')
    report[SCR] = {'blocks': [b[0] for b in scr_blocks], 'non_ascii_new': non_ascii(''.join(b[2] for b in scr_blocks))}

    # The test: TrueVision's 1.0.0 whole, the VV seams and checks, LF
    tst_tv = git_show('80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs')
    if sha1(tst_tv) != TV_SHA1[TST]:
        raise SystemExit('TV Na__Test__DocumentKeys__ at the pin is not the bytes read before: ' + sha1(tst_tv))
    tst_blocks = parse_blocks(os.path.join(HERE, 'blocks', 'test_blocks.txt'))
    tst_text = apply_blocks(tst_tv.decode('utf-8'), tst_blocks, 'Test')
    out[TST] = tst_text.encode('utf-8')
    report[TST] = {'blocks': [b[0] for b in tst_blocks], 'non_ascii_new': non_ascii(''.join(b[2] for b in tst_blocks))}

    return out, report, {SCR: scr_tv, TST: tst_tv}


def write_diff(name, a_bytes, b_bytes, a_label, b_label):
    a = a_bytes.decode('utf-8').replace('\r\n', '\n').split('\n')
    b = b_bytes.decode('utf-8').replace('\r\n', '\n').split('\n')
    diff = '\n'.join(difflib.unified_diff(a, b, a_label, b_label, n=2, lineterm=''))
    with open(os.path.join(CANDIDATE_DIR, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(diff + '\n')
    return diff.count('\n+') , diff.count('\n-')


def check_pre():
    problems = []
    for rel, want in PRE_SHA1.items():
        got = sha1(read_bytes(live_path(rel)))
        if got != want:
            problems.append('%s changed under this package: %s (pre-image %s)' % (rel, got, want))
    if os.path.exists(live_path(TST)):
        problems.append(TST + ' already exists')
    return problems


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true')
    group.add_argument('--apply', action='store_true')
    group.add_argument('--check-live', action='store_true')
    group.add_argument('--restore', action='store_true')
    args = parser.parse_args()
    os.makedirs(CANDIDATE_DIR, exist_ok=True)

    if args.restore:
        manifest = json.load(open(MANIFEST, encoding='utf-8'))
        for rel, info in manifest['written'].items():
            path = live_path(rel)
            if not os.path.exists(path):
                print('restore: %s is gone; nothing to do' % rel)
                continue
            now = sha1(read_bytes(path))
            if now != info['sha1']:
                print('restore: REFUSED for %s - live %s is not what was written (%s)' % (rel, now, info['sha1']))
                continue
            if rel == TST:
                os.remove(path)
                print('restore: deleted ' + rel)
            else:
                pre = read_bytes(os.path.join(PREIMAGE_DIR, rel.split('/')[-1] + '.before'))
                if sha1(pre) != PRE_SHA1[rel]:
                    raise SystemExit('pre-image file for %s does not hash to the recorded pre-image' % rel)
                with open(path, 'wb') as f:
                    f.write(pre)
                print('restore: put back the pre-image of ' + rel)
        return

    if args.check_live:
        out, report, tv = build_from_candidates()
        for rel, data in out.items():
            live = read_bytes(live_path(rel)) if os.path.exists(live_path(rel)) else None
            print('%-110s %s' % (rel, 'SAME' if live == data else 'DIFFERENT'))
        return

    problems = check_pre()
    if problems:
        print('\n'.join(problems))
        raise SystemExit('pre-image check failed: nothing written')

    out, report, tv = build()
    for rel, data in out.items():
        name = rel.split('/')[-1]
        with open(os.path.join(CANDIDATE_DIR, name), 'wb') as f:
            f.write(data)
    stats = {}
    stats[MC]  = write_diff('diff_ModeController_vs_preimage.diff', read_bytes(live_path(MC)), out[MC], 'a/' + MC, 'b/' + MC)
    stats[CFG] = write_diff('diff_AppConfig_vs_preimage.diff', read_bytes(live_path(CFG)), out[CFG], 'a/' + CFG, 'b/' + CFG)
    stats[SCR] = write_diff('diff_PanelScrapbook_vs_TV_at_pin.diff', tv[SCR], out[SCR], 'tv/' + SCR, 'vv/' + SCR)
    write_diff('diff_PanelScrapbook_vs_preimage.diff', read_bytes(live_path(SCR)), out[SCR], 'a/' + SCR, 'b/' + SCR)
    stats[TST] = write_diff('diff_Test_vs_TV_at_pin.diff', tv[TST], out[TST], 'tv/' + TST, 'vv/' + TST)
    for rel in out:
        print('%-110s %s  +%d -%d  %s' % (rel, sha1(out[rel])[:8], stats[rel][0], stats[rel][1], json.dumps(report[rel])))

    if args.apply:
        problems = check_pre()                                                   # <-- again, at write time
        if problems:
            print('\n'.join(problems))
            raise SystemExit('pre-image check failed at write time: nothing written')
        written = {}
        for rel in (CFG, SCR, MC):
            with open(live_path(rel), 'wb') as f:
                f.write(out[rel])
            written[rel] = {'sha1': sha1(out[rel]), 'bytes': len(out[rel]), **eol_profile(out[rel])}
        with open(live_path(TST), 'xb') as f:
            f.write(out[TST])
        written[TST] = {'sha1': sha1(out[TST]), 'bytes': len(out[TST]), **eol_profile(out[TST])}
        with open(MANIFEST, 'w', encoding='utf-8') as f:
            json.dump({'pre_sha1': PRE_SHA1, 'written': written}, f, indent=2)
        print('APPLIED: ' + json.dumps(written, indent=2))


def build_from_candidates():
    out = {}
    for rel in (MC, CFG, SCR, TST):
        out[rel] = read_bytes(os.path.join(CANDIDATE_DIR, rel.split('/')[-1]))
    return out, None, None


if __name__ == '__main__':
    main()
