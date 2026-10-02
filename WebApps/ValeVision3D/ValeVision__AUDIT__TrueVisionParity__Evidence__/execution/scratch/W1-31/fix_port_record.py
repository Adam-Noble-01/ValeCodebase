# W1-31 - bring the Port Record's file facts up to the final pass (my own new record; LF).
from pathlib import Path

P = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\port_records\W1-31.md')
text = P.read_bytes().decode('utf-8')
assert '\r' not in text

PAIRS = [
    ('''      label - see section 1.5). CRLF kept (996 CRLF / 0 bare LF). 43,823 -> 59,882 bytes,
      sha1 9dc1dd78 -> 9c08a3a3.
''', '''      label - see section 1.5). CRLF kept (996 CRLF / 0 bare LF). 43,823 -> 59,903 bytes,
      sha1 9dc1dd78 -> 8c020004.
'''),
    ('''          Ported on {{VVREL:W1-31}} / Parity / Divergences / Back-port per DR-24 (a)); the stale "the three
''', '''          Ported on {{VVREL:W1-31}} / Parity / Divergences / Back-port worded as the ledger's one status, "a
          permanent ValeVision divergence, not a back-port candidate", DR-24 (a), D64 - the ledger's :1256 row
          asked "the next package that writes the Loader (W1-31)" to align it); the stale "the three
'''),
    ('''      VV module 1.0.0 -> 1.0.1. LF kept (0 CR). 11,619 -> 13,100 bytes, sha1 601e5303 -> d42e4edd.
''', '''      VV module 1.0.0 -> 1.0.1. LF kept (0 CR). 11,619 -> 13,144 bytes, sha1 601e5303 -> 120e4e52.
'''),
    ('''      bullet "TrueVision's words"; constants comment; PORT NOTE to K2 H5 (Back-port per DR-24 (a)); log 1.0.1
''', '''      bullet "TrueVision's words"; constants comment; PORT NOTE to K2 H5 (Back-port: the ledger's status, as
      the loader's); log 1.0.1
'''),
    ('''(`scratch/W1-31/patch_loader.py`, `patch_loader_2.py`, `patch_loadingscreen.py`, `patch_loadingscreen_2.py`; each
''', '''(`scratch/W1-31/patch_loader.py`, `patch_loader_2.py`, `patch_loadingscreen.py`, `patch_loadingscreen_2.py`,
`patch_backport_lines.py`; each
'''),
    ('''- F4 (scribe, W1-99): resolve the 5 placeholders; align the three ledger rows the DR-24 resolution names
  (`ValeVision__PARITY__TrueVisionLedger__.md` :1122, :1230, :1244) with the loader's new Back-port line
  ("none by default; an optional TV back-port under DR-36"); record the 7 new loader exports in the SW note.
''', '''- F4 (scribe, W1-99): resolve the 5 placeholders; the ledger's loader status rows (W0-06: :863-865, :1256,
  :2561, :2683) need no change - the loader's and the screen's Back-port lines now say the same thing, and the
  :1256 row's "Notes" cell ("The Loader's own PORT NOTE still says 'Back-port : candidate'; the next package that
  writes the Loader (W1-31) aligns it") can be closed; record the 7 new loader exports in the wave's SW note.
'''),
]
for n, (old, new) in enumerate(PAIRS, 1):
    assert text.count(old) == 1, (n, text.count(old))
    text = text.replace(old, new, 1)
P.write_bytes(text.encode('utf-8'))
print('port record updated')
