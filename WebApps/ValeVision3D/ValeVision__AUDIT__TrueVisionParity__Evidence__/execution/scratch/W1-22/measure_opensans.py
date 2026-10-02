# W1-22 scratch: measure strings in Open Sans Regular (advance widths, no kerning - as jsPDF's
# getTextWidth does for an embedded TrueType font) at a size in mm. The TTF is read at the
# TrueVision pin into the SESSION scratchpad (outside both repositories) and deleted afterwards.
# Usage: python -B measure_opensans.py <scratchpad dir>
import os
import subprocess
import sys

from fontTools.ttLib import TTFont

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
REL = 'na-apps/01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/CommonFont-01__OpenSans__Regular__.ttf'


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    ttf = os.path.join(out_dir, 'OpenSans-Regular.ttf')
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + REL], capture_output=True, check=True).stdout
    open(ttf, 'wb').write(data)
    try:
        font = TTFont(ttf)
        upm = font['head'].unitsPerEm
        cmap = font.getBestCmap()
        hmtx = font['hmtx']

        def width_mm(text, size_mm, tracking_mm=0.0):
            units = sum(hmtx[cmap[ord(ch)]][0] for ch in text)
            return units / upm * size_mm + tracking_mm * len(text)

        pad = 2.8
        print('Open Sans Regular, unitsPerEm', upm)
        for text in ['PS01_T01_D02', 'WW88_T04_D100', '99999_D100', '57079_D12', '3047_D01', 'Mr P. Samra',
                     '255 Musters Road, West Bridgford, Nottinghamshire, NG2 7DD', 'Mr & Mrs Featherstonehaugh']:
            w = width_mm(text, 2.2)
            print('  2.2 mm  text %6.2f  +pad %6.2f  "%s"' % (w, w + pad, text))
        for label in ['DOCUMENT ID', 'DRAWING NO.']:
            w = width_mm(label, 1.6, 0.05)
            print('  1.6 mm tracked 0.05  text %6.2f  +pad %6.2f  "%s"' % (w, w + pad, label))
    finally:
        try:
            font.close()
        except Exception:
            pass
        os.remove(ttf)
        print('(TTF removed from ' + out_dir + ')')


if __name__ == '__main__':
    main(sys.argv[1])
