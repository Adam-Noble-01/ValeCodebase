# W1-13 scratch: read the TV sources and tests at the pin (bytes, via git show) into scratch/W1-13/tv/,
# snapshot the two existing VV files (backup + sha256) before any edit.
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TVOUT = os.path.join(HERE, 'tv')

LE = '02__Src__AppModules/51__System__LayoutEditor/'
TV_FILES = [
    LE + '15__Core__Markup/Na__LayoutEditor__ShapeRings__.js',
    LE + '15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js',
    LE + '15__Core__Markup/Na__LayoutEditor__PaintOrder__.js',
    LE + '15__Core__Markup/Na__LayoutEditor__MeasureParse__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js',
    LE + '51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js',
    LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',
    LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__DimensionRoundUp__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__NoteRegions__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__LeaderlessNotes__.test.mjs',
]

VV_EXISTING = [
    LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js',
    LE + '15__Core__Markup/Na__LayoutEditor__MeasureParse__.js',
]


def git_show(rel):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return out.stdout


def main():
    os.makedirs(TVOUT, exist_ok=True)
    lines = []
    for rel in TV_FILES:
        data = git_show(rel)
        dest = os.path.join(TVOUT, os.path.basename(rel))
        with open(dest, 'wb') as fh:
            fh.write(data)
        crlf = data.count(b'\r\n')
        lines.append('TV %s  %d bytes  %d lines  crlf=%d  sha256=%s' % (
            rel, len(data), data.count(b'\n'), crlf, hashlib.sha256(data).hexdigest()))
    snap = []
    for rel in VV_EXISTING:
        p = os.path.join(VV, rel.replace('/', os.sep))
        with open(p, 'rb') as fh:
            data = fh.read()
        bak = os.path.join(HERE, 'backup__' + os.path.basename(rel) + '.before')
        if not os.path.exists(bak):
            with open(bak, 'wb') as fh:
                fh.write(data)
        snap.append('%s  %s  %d bytes  crlf=%d' % (hashlib.sha256(data).hexdigest(), rel, len(data),
                                                     data.count(b'\r\n')))
    shafile = os.path.join(HERE, 'sha256__before.txt')
    if not os.path.exists(shafile):
        with open(shafile, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write('\n'.join(snap) + '\n')
    print('\n'.join(lines))
    print('--- VV snapshot ---')
    print('\n'.join(snap))


if __name__ == '__main__':
    sys.exit(main())
