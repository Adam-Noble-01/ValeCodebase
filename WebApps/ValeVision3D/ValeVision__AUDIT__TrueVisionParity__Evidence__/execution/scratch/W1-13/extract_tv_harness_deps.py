# W1-13 scratch: read, at the pin, the TrueVision files the record-parity harness needs beside the two leaves
# (TV's config reader unit and its config JSON, and TV's SheetRecords as the stand-in "shipped SheetRecords" that
# calls the leaves until ValeVision's own SheetRecords 1.39.0 lands with W1-19). Written to tv/harness/ keeping
# TV's app-relative layout, so the harness can point its loader at either tree. Deleted with the other TV copies.
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv', 'harness')
LE = '02__Src__AppModules/51__System__LayoutEditor/'

FILES = [
    LE + '03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js',
]

for rel in FILES:
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    dest = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as fh:
        fh.write(data)
    print('%7d bytes  %s' % (len(data), rel))
