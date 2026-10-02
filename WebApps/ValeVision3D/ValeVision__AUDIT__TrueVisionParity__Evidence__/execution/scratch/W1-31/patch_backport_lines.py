# W1-31 - third, small pass: the Back-port lines say exactly what the ledger's one status says
# (W0-06, ValeVision__PARITY__TrueVisionLedger__.md :863-865, :1256: "Not a back-port: a permanent
# ValeVision divergence (DR-24 default (a), D64) ... Offering it to TrueVision would be a new decision
# under DR-36 (b)"). Loader is CRLF, LoadingScreen LF; each file is hash-checked and a pass-2 copy saved.
import hashlib
import sys
from pathlib import Path

ROOT = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader')
SAVE = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-31\preimage')

JOBS = [
    ('Na__LayoutEditor__Loader__.js', '9c08a3a3aced7cd7d7c38db96dc104cd47f6c98d', True, [
        ('''// - Back-port     : none by default (DR-24 (a)). Offered to TrueVision as an optional back-port
//                   under DR-36: it would take the editor off TrueVision's start-up as well.
''', '''// - Back-port     : none - a permanent ValeVision divergence, not a back-port candidate (DR-24 (a),
//                   D64). Offering it to TrueVision would be a new decision under DR-36 (b).
'''),
        ('''// - The back-port line follows DR-24 (a): a permanent ValeVision seam,
//   offered to TrueVision only as an option.
''', '''// - The back-port line says what the ledger says (DR-24 (a), D64): a
//   permanent ValeVision divergence, not a back-port candidate.
'''),
    ]),
    ('Na__LayoutEditor__LoadingScreen__.js', 'd42e4eddb3b4eeed4212d9911ad694392616dac7', False, [
        ('''// - Back-port     : none by default; offered to TrueVision only with the loader (DR-24 (a), DR-36).
''', '''// - Back-port     : none - with the loader, a permanent ValeVision divergence, not a back-port candidate
//                   (DR-24 (a), D64).
'''),
    ]),
]


def main():
    for name, before, crlf, pairs in JOBS:
        path = ROOT / name
        raw = path.read_bytes()
        sha = hashlib.sha1(raw).hexdigest()
        if sha != before:
            sys.exit('REFUSED: ' + name + ' is ' + sha + ', expected ' + before)
        (SAVE / (name.replace('.js', '.pass2.js'))).write_bytes(raw)
        text = raw.decode('utf-8')
        if crlf:
            assert raw.count(b'\r\n') == raw.count(b'\n')
            text = text.replace('\r\n', '\n')
        else:
            assert b'\r' not in raw
        for n, (old, new) in enumerate(pairs, 1):
            assert text.count(old) == 1, (name, n, text.count(old))
            text = text.replace(old, new, 1)
        if crlf:
            text = text.replace('\n', '\r\n')
        out = text.encode('utf-8')
        path.write_bytes(out)
        print('written', name, len(out), 'bytes, sha1', hashlib.sha1(out).hexdigest())


if __name__ == '__main__':
    main()
