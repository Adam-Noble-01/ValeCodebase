# Fourth pass on r6_prose.py: G4's baseline covers PortNotes too.
PAIRS = [
    ("| from W0-04, blocking on the package's own files (P7). Exempt: the whole PORT NOTE block, history documents and the named TrueVisionHub file; W0-04's baseline allow-list (`SpecPdf__.js:147` until W0-12) prints WARN and is empty by W0-99 (F.8 C13); zero `{{VVREL:` only after the scribe | not yet written; today 4 identity hits outside 'Ported from' lines (F.8 C13) |",
     "| from W0-04, blocking on the package's own files and on any new identity hit (P7). Exempt: the whole PORT NOTE block, history documents and the named TrueVisionHub file. W0-04's baseline allow-list prints WARN: the `SpecPdf__.js:147` read until W0-12 (that part is empty by W0-99) and the pre-H5 PORT NOTEs without a Source version line until a package next writes the file (F.8 C13); zero `{{VVREL:` only after the scribe | not yet written; today 4 identity hits outside 'Ported from' lines, and 257 files with a PORT NOTE of which 72 have a Source version line (F.8 C13) |"),
    ("G4 clean with an empty baseline allow-list (F.8 C13);",
     "G4 clean: no identity hit, an empty ParityNaming allow-list and PortNotes WARNs only on baseline files (F.8 C13);"),
]
