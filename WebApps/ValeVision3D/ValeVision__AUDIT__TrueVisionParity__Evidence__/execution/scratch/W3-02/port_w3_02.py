# W3-02 - Sheet Images editing set (inert): whole-file ports from TrueVision b2aa9151.
# Usage: python port_w3_02.py --stage | --apply | --restore
#   --stage   reads TV bytes at the pin (git show), applies the listed seams, writes staged/<file>
#   --apply   asserts every VV target is absent (new files), then writes each staged file in one write
#   --restore deletes the six VV targets this script created (only if they still equal the staged bytes)
import os, sys, subprocess, hashlib

HERE   = os.path.dirname(os.path.abspath(__file__))
TVGIT  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN    = 'b2aa9151'
TVREL  = 'na-apps/30__TrueVision__CoreAppCode/'
REL    = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/'
VVROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
STAGED = os.path.join(HERE, 'staged')

INERT = ('//                   landed inert: nothing imports the Sheet Images editing set until the\n'
         '//                   SheetTools hub (W3-03), the toolbar and the ModeController (W3-09) wire it in.\n')

def note(name, srcver, release_line, status, parity_lines, divergences):
    lines = ['// PORT NOTE:',
             '// - Ported from   : TrueVision3D ' + REL + name,
             '// - Source version: ' + srcver + ' (' + release_line + '; read at HEAD ' + PIN + ')',
             '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-02}},']
    lines += INERT.rstrip('\n').split('\n')
    lines += ['//                   ' + s for s in status]
    lines += ['// - Parity        : ' + parity_lines[0]] + ['//                   ' + s for s in parity_lines[1:]]
    lines += ['// - Divergences   :'] + ['//   - ' + d for d in divergences]
    lines += ['// - Back-port     : none.', '//',
              '// -----------------------------------------------------------------------------', '//', '']
    return '\n'.join(lines)

ST_116 = ['v2.116.0 carries no sign-off in TrueVision ("Not yet in ValeVision"); it comes',
          'across under DR-01 (c) and is named as not yet confirmed.']
ST_121 = ['v2.116.0 (no sign-off) and v2.121.0 ("NOT signed off by Adam") come across',
          'under DR-01 (c) and are named as not yet confirmed.']
ST_142 = ['v2.116.0 (no sign-off), v2.121.0 ("NOT signed off by Adam") and v2.142.0',
          '("NOT tried by Adam") come across under DR-01 (c), named as not yet confirmed.']

BANNER_ONLY = ['Banner reads ValeVision3D. (No console output in this file.)']

FILES = {
    'Na__LayoutEditor__SheetImages__Crop__.js': dict(
        srcver='1.0.0', rel='TrueVision3D v2.116.0, 21-Sep-2026', status=ST_116,
        parity=['verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the only',
                'differences)'],
        div=BANNER_ONLY, console=0),
    'Na__LayoutEditor__SheetImages__Menu__.js': dict(
        srcver='1.0.0', rel='TrueVision3D v2.116.0, 21-Sep-2026', status=ST_116,
        parity=['verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the only',
                'differences)'],
        div=BANNER_ONLY, console=0),
    'Na__LayoutEditor__SheetImages__Handles__.js': dict(
        srcver='1.0.0', rel='TrueVision3D v2.116.0, 21-Sep-2026', status=ST_116,
        parity=['verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the only',
                'differences)'],
        div=BANNER_ONLY, console=0),
    'Na__LayoutEditor__Panel__SheetImages__.js': dict(
        srcver='1.1.0', rel='TrueVision3D v2.121.0, 21-Sep-2026', status=ST_121,
        parity=['verbatim (the code is TrueVision 1.1.0\'s; the banner and this note are the only',
                'differences)'],
        div=BANNER_ONLY, console=0),
    'Na__LayoutEditor__SheetImages__Insert__.js': dict(
        srcver='1.2.0', rel='TrueVision3D v2.142.0, 22-Sep-2026', status=ST_142,
        parity=['verbatim (the code is TrueVision 1.2.0\'s; the banner, the three console prefixes',
                'and this note are the only differences. DESCRIPTION is TrueVision\'s: its "and onto R2"',
                'describes TrueVision - in ValeVision the save step, Na__LayoutEditor__SheetImages__Publish__,',
                'files the picture in the project folder only (Adam, 02-Oct-2026: one OVH VPS, no R2), and',
                'the <document id> is the sheet\'s Document ID, whose {project} is the document code',
                '(Na__DrawData__GetDocumentCode, DR-11), never the ?project= token. The drop\'s',
                'Na__LeTools__PickUpMove is TrueVision\'s automatic Move (v2.78.0, DR-40 item 7, held in',
                'ValeVision until Adam confirms it); nothing reaches it until W3-09 switches Sheet Images',
                'on, and its guard is a recorded follow-up for W3-03 / W3-09)'],
        div=['Banner and console prefixes read ValeVision3D.'], console=3),
    'Na__LayoutEditor__SheetImages__.js': dict(
        srcver='1.0.0', rel='TrueVision3D v2.116.0, 21-Sep-2026', status=ST_116,
        parity=['verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the only',
                'differences. DESCRIPTION is TrueVision\'s: its Source line ("R2, then Pages") and',
                'Publish line ("on R2") describe TrueVision - see those modules\' PORT NOTEs for where',
                'ValeVision reads and files a picture. Pictures are filed under the sheet\'s Document ID',
                '(Publish FolderOf -> Na__LeRec__DocumentId), whose {project} is the document code',
                '(Na__DrawData__GetDocumentCode, W1-12, DR-11), never the ?project= token; that seam',
                'lives in SheetRecords, not here. The drawings-data import path is TrueVision\'s:',
                'ValeVision\'s folder numbers match since the renumber)'],
        div=BANNER_ONLY, console=0),
}

def tv_bytes(name):
    return subprocess.run(['git', '-C', TVGIT, 'show', PIN + ':' + TVREL + REL + name],
                          capture_output=True, check=True).stdout

def stage():
    os.makedirs(STAGED, exist_ok=True)
    for name, f in FILES.items():
        raw = tv_bytes(name)
        assert b'\r\n' not in raw, name + ': TV text is not LF'
        text = raw.decode('utf-8')
        # H1 banner (line 2)
        assert text.count('// TRUEVISION3D - ') == 1, name + ': banner'
        text = text.replace('// TRUEVISION3D - ', '// VALEVISION3D - ', 1)
        # C1 console prefix
        n = text.count("'[TrueVision3D LayoutEditor] ")
        assert n == f['console'], name + ': console prefix count ' + str(n)
        text = text.replace("'[TrueVision3D LayoutEditor] ", "'[ValeVision3D LayoutEditor] ")
        assert 'TrueVision3D' not in text and 'TRUEVISION3D' not in text, name + ': app token left'
        # H5 PORT NOTE before TV's DEVELOPMENT LOG (TV carries no PORT NOTE of its own)
        assert 'PORT NOTE' not in text, name + ': TV has a PORT NOTE'
        anchor = '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
        assert text.count(anchor) == 1, name + ': DEVELOPMENT LOG anchor'
        block = note(name, f['srcver'], f['rel'], f['status'], f['parity'], f['div'])
        text = text.replace(anchor, '// -----------------------------------------------------------------------------\n//\n'
                            + block + '// DEVELOPMENT LOG:\n', 1)
        out = text.encode('utf-8')
        open(os.path.join(STAGED, name), 'wb').write(out)
        print('staged', name, len(out), 'bytes', out.count(b'\n'), 'lines', hashlib.sha256(out).hexdigest()[:16])

def target(name):
    return os.path.join(VVROOT, REL.replace('/', os.sep), name)

def apply():
    for name in FILES:
        assert not os.path.exists(target(name)), name + ' already exists in VV - stop'
    for name in FILES:
        data = open(os.path.join(STAGED, name), 'rb').read()
        with open(target(name), 'wb') as fh:
            fh.write(data)
        print('landed', target(name))

def restore():
    for name in FILES:
        t = target(name)
        if os.path.exists(t):
            if open(t, 'rb').read() == open(os.path.join(STAGED, name), 'rb').read():
                os.remove(t); print('removed', t)
            else:
                print('CHANGED UNDER ME - left in place:', t)

if __name__ == '__main__':
    {'--stage': stage, '--apply': apply, '--restore': restore}[sys.argv[1]]()
