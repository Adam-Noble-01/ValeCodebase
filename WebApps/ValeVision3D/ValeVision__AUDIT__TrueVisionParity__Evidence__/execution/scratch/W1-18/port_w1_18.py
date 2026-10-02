# W1-18 scratch: take TrueVision's GradientTool 1.1.0 and LineStyleTool 1.1.0 whole at the pin and re-apply only the
# listed VV seams (banner, console prefix, PORT NOTE). Writes TrueVision's text exactly as git show returns it (LF).
# Hash-guarded: each live VV file must still match the snapshot in sha256__before.txt (or already hold exactly this
# output, so a re-run is a no-op). The two config JSONs are not touched (they are byte-identical apart from CRLF).
#
#   python -B port_w1_18.py --date 02-Oct-2026 --dry-run    plan only, write nothing
#   python -B port_w1_18.py --date 02-Oct-2026              write
#   python -B port_w1_18.py --date 02-Oct-2026 --verify     prove each VV file is TV's bytes plus the seams and nothing else
#   python -B port_w1_18.py --restore                       put the pre-port bytes back (vv_before/), only if a file is ours
import difflib
import hashlib
import os
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE35 = '02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/'
PH = '{{VVREL:W1-18}}'

BANNER = ('// TRUEVISION3D - ', '// VALEVISION3D - ', 1)
CONSOLE = ("'[TrueVision3D LayoutEditor]", "'[ValeVision3D LayoutEditor]", 2)


def note(lines):
    return ''.join(line + '\n' for line in lines)


def files(date):
    out = []

    # 1. GradientTool 1.1.0 (TrueVision v2.150.0) over ValeVision's 1.0.0 ---------------------------------------------
    out.append({
        'rel': LE35 + 'Na__LayoutEditor__GradientTool__.js',
        'seams': [
            BANNER,
            CONSOLE,
            (note([
                '// PORT NOTE:',
                '// - Ported from   : n/a - authored in TrueVision3D',
                '// - Ported to     : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__GradientTool__.js',
                '// - Ported on     : 13-Sep-2026 for ValeVision3D v2.26.0',
                '// - Parity        : verbatim (the ValeVision copy differs in its header and console',
                '//                   prefix only; the config JSON is identical and the record shape',
                "//                   is shared, so either app reads the other's gradients)",
            ]), note([
                '// PORT NOTE:',
                '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js',
                '// - Source version: 1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)',
                '// - Ported on     : ' + date + ' for ValeVision3D ' + PH + ", the whole file. This app's copy before it",
                '//                   was 1.0.0, ported from TrueVision3D v2.29.0 on 13-Sep-2026 (ValeVision3D v2.26.0).',
                "//                   TrueVision's v2.150.0 entry says NOT tried by Adam (v2.151.0 records him trying the",
                '//                   Boolean tools, not this PDF clip); it comes across under DR-01 (c) and is named so.',
                '//                   The 1.1.0 log line "not in ValeVision" is TrueVision\'s history, kept verbatim.',
                "// - Parity        : verbatim (the config JSON is the same git blob as TrueVision's, and the record",
                "//                   shape is shared, so either app reads the other's gradients)",
                '// - Divergences   :',
                '//   - Banner and console prefix read ValeVision3D.',
                '// - Back-port     : none.',
            ]), 1),
        ],
    })

    # 2. LineStyleTool 1.1.0 (TrueVision v2.152.0) over ValeVision's 1.0.0 -------------------------------------------
    out.append({
        'rel': LE35 + 'Na__LayoutEditor__LineStyleTool__.js',
        'seams': [
            BANNER,
            CONSOLE,
            (note([
                '// PORT NOTE:',
                '// - Authored in   : TrueVision3D first (14-Sep-2026)',
                '// - ValeVision    : waiting on sign-off after TrueVision testing. The drawing',
                '//                   editor in both apps is kept in tandem; this module ports',
                '//                   verbatim below the header once the millimetre figures and',
                '//                   the panel wording have been tried on a real sheet.',
            ]), note([
                '// PORT NOTE:',
                '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js',
                '// - Source version: 1.1.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151)',
                '// - Ported on     : ' + date + ' for ValeVision3D ' + PH + ", the whole file. This app's copy before it",
                '//                   was 1.0.0, ported from TrueVision3D on 14-Sep-2026 (ValeVision3D v2.40.0).',
                "//                   TrueVision's own note held the port for Adam's sign-off and its v2.152.0 entry says",
                '//                   NOT tried by Adam; it comes across under DR-01 (c) and is named so.',
                "// - Parity        : verbatim (the config JSON is the same git blob as TrueVision's, and the record",
                "//                   shape is shared, so either app reads the other's line styles)",
                '// - Divergences   :',
                '//   - Banner and console prefix read ValeVision3D.',
                "// - Back-port     : none from this file. TrueVision's own PORT NOTE still holds the port for sign-off",
                '//                   though ValeVision3D has carried 1.0.0 since v2.40.0 - a TrueVision record fix for the',
                '//                   TrueVision lane (WT-08), not made here.',
            ]), 1),
        ],
    })
    return out


# -----------------------------------------------------------------------------------------------------------------------

def git_show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def before_hashes():
    out = {}
    with open(os.path.join(HERE, 'sha256__before.txt'), 'r', encoding='utf-8') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) >= 2:
                out[parts[1]] = parts[0]
    return out


def build(entry):
    tv = git_show(entry['rel'])
    if b'\r' in tv:
        raise SystemExit('TV text has a CR: ' + entry['rel'])
    text = tv.decode('utf-8')
    for old, new, count in entry['seams']:
        found = text.count(old)
        if found != count:
            raise SystemExit('SEAM MISMATCH in %s: expected %d of %r, found %d' % (entry['rel'], count, old[:70], found))
        text = text.replace(old, new)
    return tv, text.encode('utf-8')


def checks(entry, out):
    rel = entry['rel']
    text = out.decode('utf-8')
    problems = []
    if b'\r' in out:
        problems.append('CR in output')
    if not text.endswith('\n'):
        problems.append('no final newline')
    head = text.split('\n')[:6]
    if not any(line.startswith('// VALEVISION3D - ') for line in head):
        problems.append('no VALEVISION3D banner')
    if 'TRUEVISION3D' in text:
        problems.append('TRUEVISION3D left')
    if '[TrueVision3D' in text:
        problems.append('[TrueVision3D console prefix left')
    if 'TrueVision__' in text or 'window.TrueVision' in text:
        problems.append('TrueVision__ literal left')
    fileline = [line for line in text.split('\n')[:40] if line.startswith('// FILE       : ')]
    if not fileline or fileline[0].split(': ', 1)[1].strip() != os.path.basename(rel):
        problems.append('FILE line does not name the file')
    if text.count(PH) != 1:
        problems.append('placeholder count %d' % text.count(PH))
    if not re.search(r'^// - Source version: 1\.1\.0 \(TrueVision3D v2\.\d+\.0, \d\d-[A-Z][a-z]{2}-2026; read at b2aa9151\)$', text, re.M):
        problems.append('no Source version line in the K2 H5 form')
    if not re.search(r'^// DEVELOPMENT LOG:\n// \d\d-[A-Z][a-z]{2}-2026 - Version 1\.1\.0$', text, re.M):
        problems.append("DEVELOPMENT LOG does not open with TrueVision's 1.1.0 entry")
    return problems


def plans(date):
    out = []
    for entry in files(date):
        tv, data = build(entry)
        problems = checks(entry, data)
        if problems:
            raise SystemExit('CHECKS FAILED for %s: %s' % (entry['rel'], '; '.join(problems)))
        dest = os.path.join(VV, entry['rel'].replace('/', os.sep))
        out.append((entry, tv, data, dest))
    return out


def main(argv):
    if '--restore' in argv:
        # Puts the pre-port bytes back, but only over this package's own output: a file someone has edited since
        # (its sha256 is neither the port's nor the snapshot's) is refused, never clobbered.
        before = before_hashes()
        after = {}
        with open(os.path.join(HERE, 'sha256__after.txt'), 'r', encoding='utf-8') as fh:
            for line in fh:
                parts = line.split()
                if len(parts) >= 2:
                    after[parts[1]] = parts[0]
        jobs = []
        for name in ('Na__LayoutEditor__GradientTool__.js', 'Na__LayoutEditor__LineStyleTool__.js'):
            rel = LE35 + name
            dest = os.path.join(VV, rel.replace('/', os.sep))
            with open(os.path.join(HERE, 'vv_before', name), 'rb') as fh:
                old = fh.read()
            if sha(old) != before.get(rel):
                raise SystemExit('RESTORE: backup does not match the snapshot for ' + rel)
            with open(dest, 'rb') as fh:
                live = sha(fh.read())
            if live == before.get(rel):
                print('UNCHANGED %s  (already the pre-port bytes)' % rel)
                continue
            if live != after.get(rel):
                raise SystemExit('RESTORE REFUSED: %s was edited after this port (sha256 %s)' % (rel, live))
            jobs.append((rel, dest, old))
        for rel, dest, old in jobs:
            with open(dest, 'wb') as fh:
                fh.write(old)
            print('RESTORED  %s  sha256 %s' % (rel, sha(old)[:16]))
        return 0

    if '--date' not in argv:
        raise SystemExit('--date DD-Mon-YYYY is required')
    date = argv[argv.index('--date') + 1]
    if not re.match(r'^\d\d-[A-Z][a-z]{2}-\d{4}$', date):
        raise SystemExit('bad --date ' + date)
    dry = '--dry-run' in argv
    verify = '--verify' in argv
    planned = plans(date)

    if '--out' in argv:                                                   # <-- Rehearsal: the planned files into a scratch folder, VV untouched
        out_dir = os.path.abspath(argv[argv.index('--out') + 1])
        if not out_dir.startswith(HERE):
            raise SystemExit('--out must be inside this scratch folder')
        os.makedirs(out_dir, exist_ok=True)
        for entry, tv, data, dest in planned:
            with open(os.path.join(out_dir, os.path.basename(entry['rel'])), 'wb') as fh:
                fh.write(data)
            print('REHEARSE  %s  %d bytes  sha256 %s' % (os.path.join(out_dir, os.path.basename(entry['rel'])), len(data), sha(data)[:16]))
        return 0

    if verify:
        bad = 0
        for entry, tv, data, dest in planned:
            with open(dest, 'rb') as fh:
                live = fh.read()
            ok_bytes = live == data
            text = live.decode('utf-8')
            for old, new, count in reversed(entry['seams']):
                text = text.replace(new, old)
            ok_tv = text.encode('utf-8') == tv
            print('%-4s %-6s %s  live sha256 %s' % ('OK' if ok_bytes else 'DIFF', 'TV=' + ('yes' if ok_tv else 'NO'),
                                                  entry['rel'], sha(live)[:16]))
            bad += 0 if (ok_bytes and ok_tv) else 1
        print('verify: %d problem(s)' % bad)
        return 1 if bad else 0

    # GUARDS | nothing is written unless every file passes
    before = before_hashes()
    for entry, tv, data, dest in planned:
        with open(dest, 'rb') as fh:
            live = fh.read()
        if live != data and sha(live) != before.get(entry['rel']):
            raise SystemExit('GUARD: %s changed since the snapshot (%s != %s)' % (dest, sha(live), before.get(entry['rel'])))

    os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
    for entry, tv, data, dest in planned:
        diff = difflib.unified_diff(tv.decode('utf-8').split('\n'), data.decode('utf-8').split('\n'),
                                    'TV@' + PIN + '/' + entry['rel'], 'VV/' + entry['rel'], n=0, lineterm='')
        diff_text = '\n'.join(diff) + '\n'
        with open(os.path.join(HERE, 'diffs', os.path.basename(entry['rel']) + '.diff'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(diff_text)
        print('%s  %s  TV %d bytes -> VV %d bytes  sha256 %s' % ('PLAN' if dry else 'WRITE', entry['rel'], len(tv), len(data), sha(data)[:16]))
        print('      (whole file over the existing copy; %d seam(s); diff lines %d)' % (len(entry['seams']), diff_text.count('\n')))
        if not dry:
            with open(dest, 'wb') as fh:
                fh.write(data)
    if not dry:
        with open(os.path.join(HERE, 'sha256__after.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            for entry, tv, data, dest in planned:
                fh.write('%s  %s  %d bytes  (TV sha256 %s)\n' % (sha(data), entry['rel'], len(data), sha(tv)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
