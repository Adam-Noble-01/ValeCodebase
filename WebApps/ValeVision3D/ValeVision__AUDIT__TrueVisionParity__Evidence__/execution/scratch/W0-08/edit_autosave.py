# W0-08 scratch: LIVE edit of VV's Layout Editor AutoSave (hunk replay of TrueVision's flag publication under the
# app-neutral name window.Na__Pwa__HasUnsavedWork, K2 K4). Inert until the W0-08 registrar is deployed: nothing
# reads the flag today. CRLF preserved (edit_util.LineDoc); every anchor must match exactly once; the file must still
# be the preflight pre-image.
#
#   python edit_autosave.py --dry-run   -> writes the result to scratch/W0-08/autosave_preview.js only
#   python edit_autosave.py             -> writes the live file
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from edit_util import LineDoc, pad, sha1  # noqa: E402

VCB = r'D:\10_CoreLib__ValeCodebase'
REL = r'WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__AutoSave__.js'
LIVE = os.path.join(VCB, REL)
TV_AUTOSAVE = os.path.join(HERE, 'tv_pin', 'Na__LayoutEditor__AutoSave__.js')


def tv_publish_block():
    """TrueVision's PublishUnsavedFlag block, verbatim from the pin, with only the global's name swapped."""
    tv = open(TV_AUTOSAVE, encoding='utf-8').read().split('\n')
    start = next(i for i, l in enumerate(tv) if '// HELPER FUNCTION | Tell the PWA Registrar to Hold Its Update Reload' in l)
    end = next(i for i in range(start + 1, len(tv)) if tv[i].strip().startswith('// ----') and i > start + 12)
    block = tv[start:end + 1]
    joined = '\n'.join(block)
    if joined.count('window.TrueVision__Pwa__HasUnsavedWork') != 1:
        raise SystemExit('TV block: expected exactly one window.TrueVision__Pwa__HasUnsavedWork')
    block = [l.replace('window.TrueVision__Pwa__HasUnsavedWork', 'window.Na__Pwa__HasUnsavedWork') for l in block]
    if any('TrueVision' in l for l in block):
        raise SystemExit('TV block: a TrueVision name survived the swap')
    return block


def tv_call_line():
    tv = open(TV_AUTOSAVE, encoding='utf-8').read().split('\n')
    hits = [l for l in tv if 'Na__LeAuto__PublishUnsavedFlag();' in l]
    if len(hits) != 1:
        raise SystemExit('TV call line: expected exactly one')
    return hits[0]


def edit(data: bytes) -> bytes:
    doc = LineDoc(data, 'AutoSave')

    # ---- A1 DESCRIPTION: TrueVision's closing sentence of the CLOSE GUARD bullet, neutral name ---
    guard_end = doc.find_one('//   survives. Editable sessions only: a read-only viewer has nothing to lose.')
    doc.expect(guard_end + 1, '//')
    doc.expect(guard_end + 2, '// INTEGRATION:')
    doc.insert_after(guard_end, [
        '//   The guard also publishes Na__Pwa__HasUnsavedWork, which holds the',
        '//   PWA registrar\'s automatic update reload back rather than letting it walk',
        '//   into the same question unannounced.',
    ])

    # ---- A2 PORT NOTE: Source version line, the flag seam, the stale bullets corrected -----------
    first = doc.find_one('// PORT NOTE:')
    last = doc.find_one('// - Back-port     : n/a for the guard (this IS the port).')
    doc.expect(first + 1, '// - Ported from   : none originally; the close guard came FROM TrueVision3D')
    doc.replace(first, last, [
        '// PORT NOTE:',
        '// - Ported from   : none originally; the close guard came FROM TrueVision3D',
        '//                   v2.67.0 51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
        '// - Source version: close guard and unsaved-work flag from TrueVision3D AutoSave',
        '//                   1.3.0 (v2.67.0, 19-Sep-2026; the flag lines re-read at HEAD',
        '//                   b2aa9151, AutoSave 1.5.0); undo and redo judged by their',
        '//                   step from AutoSave 1.2.0 (v2.30.1)',
        '// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.7 (port Phase 5);',
        '//                   close guard 19-Sep-2026 for ValeVision3D v2.44.0;',
        '//                   unsaved-work flag 01-Oct-2026 for ValeVision3D {{VVREL:W0-08}}',
        '// - Parity        : close guard and flag publication verbatim apart from the',
        '//                   flag\'s name',
        '// - Divergences   : The flag is published as window.Na__Pwa__HasUnsavedWork,',
        '//                   the app-neutral name, where TrueVision publishes',
        '//                   window.TrueVision__Pwa__HasUnsavedWork. Its reader is the',
        '//                   shared Whitecardopedia service worker registrar ValeVision',
        '//                   runs under (registrar 1.2.1 holds its controllerchange',
        '//                   reload while this answers true); until that registrar is',
        '//                   deployed nothing reads the flag. Re-apply this name',
        '//                   whenever the file is taken whole from TrueVision.',
        '//                 : The auto save itself is at TrueVision\'s AutoSave 1.2.0',
        '//                   (undo and redo judged by the step they reverse, VV 1.3.0);',
        '//                   TrueVision\'s 1.4.0 and 1.5.0 (the late-start restore and the',
        '//                   draft judged before it goes back) are not ported yet.',
        '// - Back-port     : n/a for the guard (this IS the port); offer TrueVision the',
        '//                   app-neutral flag name, so the seam above disappears.',
    ])

    # ---- A3 DEVELOPMENT LOG: VV's own sequence, a patch step ----------------------------------
    log = doc.find_one('// DEVELOPMENT LOG:')
    doc.expect(log + 1, '// 20-Sep-2026 - Version 1.3.0')
    doc.insert_after(log, [
        '// 01-Oct-2026 - Version 1.3.1',
        '// - Publishes window.Na__Pwa__HasUnsavedWork - this module\'s',
        '//   Na__LeAuto__HasUnsavedWork - on every Initialize, re-read each time',
        '//   because editability is decided there: TrueVision3D\'s AutoSave 1.3.0',
        '//   behaviour under the app-neutral name. ValeVision3D does run under a',
        '//   service worker (Whitecardopedia\'s shared one), whose registrar reloads',
        '//   open pages by itself when a new worker takes over, so the earlier note',
        '//   that nothing could read the flag was wrong. The registrar that holds its',
        '//   reload while this answers true is prepared but not yet deployed; until',
        '//   it is, nothing reads the flag. Ported for ValeVision3D {{VVREL:W0-08}}.',
        '//',
    ])

    # ---- A4 the probe's comment: the registrar polls it (TrueVision's sentence, VV's interval) --
    probe_c = doc.find_one('// stringifies its whole document.')
    doc.expect(probe_c - 1, '// The sheet flag first, because it is a flag: the specification\'s answer')
    doc.replace(probe_c, probe_c, [
        '    // stringifies its whole document, and the registrar polls this through',
        '    // Na__LeAuto__HasUnsavedWork every 500 ms while an update waits.',
    ])

    # ---- A5 TrueVision's PublishUnsavedFlag helper, at TrueVision's position -------------------
    region_end = doc.find_one('function Na__LeAuto__OnBeforeUnload(event) {')
    close = doc.find_first('// ------------------------------------------------------------', region_end)
    doc.expect(close - 1, '}')
    doc.expect(close + 1, '')
    doc.expect(close + 2, '// endregion')
    doc.insert_after(close, [''] + [''] + tv_publish_block())

    # ---- A6 the call in Initialize, TrueVision's line --------------------------------------------
    editable = doc.find_one('Na__LeAuto__Editable  = !!(options && options.editable);')
    doc.expect(editable + 1, 'if (Na__LeAuto__Ready) return true;')
    doc.insert_after(editable, [tv_call_line()])

    return doc.to_bytes()


def main():
    dry = '--dry-run' in sys.argv
    data = open(LIVE, 'rb').read()
    manifest = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
    expected = manifest[REL]['sha1']
    if sha1(data) != expected:
        raise SystemExit(f'STOP: AutoSave changed since the preflight pre-image ({sha1(data)} != {expected})')
    new = edit(data)
    target = os.path.join(HERE, 'autosave_preview.js') if dry else LIVE
    with open(target, 'wb') as fh:
        fh.write(new)
    print(f'{"DRY RUN -> " if dry else ""}{target}')
    print(f'  {sha1(data)} ({len(data)} B, CRLF {data.count(b"\r\n")}) -> {sha1(new)} ({len(new)} B, CRLF {new.count(b"\r\n")}, LF {new.count(b"\n")})')
    check = subprocess.run(['node', '--check', target], capture_output=True, text=True) if target.endswith('.js') else None
    if check is not None:
        print('  node --check:', 'OK' if check.returncode == 0 else check.stderr)


if __name__ == '__main__':
    main()
