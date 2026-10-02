"""W1-25 scratch - what fonts a PDF declares, whether they are embedded subsets, and whether its text extracts.

    python -B w1_25_pdfcheck.py <pdf> [--expect-opensans | --expect-no-opensans] [--text "<must extract>" ...]
                                      [--text-file <utf-8 file, one string per line>]

Prints every font of every page (PyMuPDF get_page_fonts): xref, embedded file type, font type, base font,
encoding, ToUnicode; for an embedded TrueType it reads the FontFile2 with fontTools and counts the glyphs that
still carry an outline against the full Open Sans cut (jsPDF keeps every glyph id, so Identity-H codes stay
the original glyph ids, and empties the outlines it does not use - that is its subset). Extracts the text with
PyMuPDF and looks for each expected string. Exit 0 when every expectation holds.
"""
import io
import subprocess
import sys

import fitz  # PyMuPDF
from fontTools.ttLib import TTFont

_FULL = {}


def outlined(tt):
    glyf = tt['glyf']
    count = 0
    for name in tt.getGlyphOrder():
        g = glyf[name]
        if g.numberOfContours != 0:
            count += 1
    return count


def full_cut(style_hint):
    files = {'normal': 'AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf',
             'bold': 'AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf',
             'light': 'AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf'}
    name = files[style_hint]
    if name not in _FULL:
        data = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show',
                               'b2aa9151:assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name],
                              check=True, capture_output=True).stdout
        tt = TTFont(io.BytesIO(data))
        _FULL[name] = (len(tt.getGlyphOrder()), outlined(tt), len(data))
    return _FULL[name]


def main():
    args = sys.argv[1:]
    path = args[0]
    expect_os = '--expect-opensans' in args
    expect_no = '--expect-no-opensans' in args
    texts = [args[i + 1] for i, a in enumerate(args) if a == '--text']
    for i, a in enumerate(args):
        if a == '--text-file':
            texts += [line for line in open(args[i + 1], encoding='utf-8').read().split('\n') if line]
    doc = fitz.open(path)
    ok = True
    seen = {}
    full_count, full_outlined, full_bytes = full_cut('normal')
    for page_index in range(doc.page_count):
        for (xref, ext, ftype, basefont, name, encoding, *rest) in doc.get_page_fonts(page_index, full=True):
            if xref in seen:
                continue
            info = {'ext': ext, 'type': ftype, 'base': basefont, 'enc': encoding}
            obj = doc.xref_object(xref, compressed=False)
            info['tounicode'] = '/ToUnicode' in obj
            if ext == 'ttf':
                _n, _e, _t, buffer = doc.extract_font(xref)
                tt = TTFont(io.BytesIO(buffer))
                info['glyph_ids'] = len(tt.getGlyphOrder())
                info['outlined'] = outlined(tt)
                info['bytes'] = len(buffer)
            seen[xref] = info
            extra = ''
            if ext == 'ttf':
                extra = 'glyph ids %d, outlined %d of %d, %d of %d bytes' % (info['glyph_ids'], info['outlined'], full_outlined, info['bytes'], full_bytes)
            print('  page %d  xref %-4d %-4s %-8s %-12s %-15s ToUnicode=%-5s %s' % (
                page_index + 1, xref, ext or '-', ftype, basefont, encoding, info['tounicode'], extra))
    opensans = [i for i in seen.values() if 'OpenSans' in (i['base'] or '')]
    if expect_os:
        good = [i for i in opensans if i['type'] == 'Type0' and i['enc'] == 'Identity-H' and i['ext'] == 'ttf' and i['tounicode']
                and i.get('outlined', 1e9) < full_outlined and i.get('bytes', 1e12) < full_bytes]
        if opensans and len(good) == len(opensans):
            print('  PASS  OpenSans declared %d time(s), each an embedded Type0 / Identity-H subset (FontFile2) with ToUnicode' % len(opensans))
        else:
            ok = False
            print('  FAIL  OpenSans fonts %d, of which embedded Type0 Identity-H subsets with ToUnicode %d' % (len(opensans), len(good)))
    if expect_no:
        if opensans:
            ok = False
            print('  FAIL  OpenSans is declared')
        else:
            print('  PASS  no OpenSans declared (%s)' % ', '.join(sorted(set(i['base'] for i in seen.values()))))
    text = ''.join(doc[i].get_text() for i in range(doc.page_count))
    for want in texts:
        hit = want in text
        ok = ok and hit
        print('  %s  text extracts: %s' % ('PASS' if hit else 'FAIL', want.encode('ascii', 'backslashreplace').decode('ascii')))
    print('  pages %d, %d bytes, %d characters of text' % (doc.page_count, len(open(path, 'rb').read()), len(text)))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
