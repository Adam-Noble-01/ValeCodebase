"""W3-99 - the Module Register rows Wave 3 changed (ValeVision3D v2.71.5). Helpers copied from W2-99's ledger_w2_reg.py.

Each of the 196 rows of a Wave-2-touched module (rows_w2.json) is rewritten from the file's own PORT NOTE as it now
stands (portnote_fields_w2.json) by one generic rule, or by an explicit entry below where the wave replayed hunks, edited
a configuration, kept a ValeVision-only module or left part of TrueVision's file for a later package. Old cells are kept
as "[was: ...]" (K2 section 13: history is not rewritten). Columns: 0 VV path, 1 TV path, 2 TV source ver, 3 TV current
ver, 4 Parity, 5 Divergences and seams, 6 Open TV versions, 7 Loaded by, 8 Transport, 9 Checked, 10 Packages,
11 Blocked by (refreshed separately for every row)."""
import re

REL = 'v2.71.5'
PIN = 'read at b2aa9151'

ASCII = {'—': '-', '–': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '→': '->',
         '×': 'x', '…': '...', ' ': ' ', '≥': '>=', '≤': '<=', '°': ' deg'}


def clean(s):
    s = ''.join(ASCII.get(ch, ch) for ch in s)
    s = s.encode('ascii', 'replace').decode('ascii').replace('?', '?')
    s = s.replace('|', '/').replace('\t', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def short(s, n):
    s = clean(s)
    if len(s) <= n:
        return s
    cut = s[:n]
    for sep in ('. ', '; '):
        k = cut.rfind(sep)
        if k > n * 0.45:
            return cut[:k + (1 if sep == '. ' else 0)].rstrip(' ;')
    k = cut.rfind(' ')
    return cut[:k].rstrip(' ,;') + ' ...'


def was(new, old):
    old = old.strip()
    if old in ('', '-') or old == new:
        return new
    return '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def pk_add(cell, names):
    have = [p.strip() for p in cell.split(',') if p.strip() and p.strip() != '-']
    return ', '.join(have + [n for n in names if n not in have]) or '-'


R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)


def src_head(sv):
    """The Source version line up to the first '(TrueVision3D ...)' group, else a short form."""
    sv = clean(sv)
    m = re.match(r'^(.*?\(TrueVision3D [^)]*\))', sv)
    if m and len(m.group(1)) <= 200:
        return m.group(1)
    return short(sv, 200)


def modver(sv):
    m = re.match(r'^\s*(\d+\.\d+\.\d+)', sv or '')
    return m.group(1) if m else None


def pks(p):
    return ', '.join(p)


def first_sentence(s):
    s = clean(s)
    k = s.find('. ')
    return s[:k] if 0 < k < 160 else s


def bullets(s):
    """A PORT NOTE Divergences block (bullets joined by the extractor) as one cell: '- A. - B.' -> 'A.; B.'"""
    s = clean(s)
    s = re.sub(r'^-\s+', '', s)
    s = re.sub(r'\s-\s(?=[A-Z(])', '; ', s)
    return s.replace('.; ', '; ')


