"""W2-99 (adapted from W1-99 C2) - read-only: for every continuation placeholder in scope, show its line and decide whether it sits
inside a comment (a // line comment, a /* */ block, an HTML <!-- --> block). A token outside a comment would change code
or data when resolved; this pass then stops. Reads the files as they are now (before or after the pass: with --manifest it
reads the pre-images listed in C2/preimage_manifest.json instead).
"""
import json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import resolve_vvrel_w2 as R                                    # noqa: E402

TOK = re.compile(rb'\{\{VVREL:(W2-\d\d)\}\}')


def comment_spans(b, ext):
    """Byte spans that are comments, by a small scanner that respects string literals in JS."""
    spans = []
    if ext in ('.html', '.htm', '.md'):
        for m in re.finditer(rb'<!--.*?-->', b, re.S):
            spans.append((m.start(), m.end()))
        # inline <script> / <style> comments too
        for m in re.finditer(rb'/\*.*?\*/', b, re.S):
            spans.append((m.start(), m.end()))
        for m in re.finditer(rb'(?m)^[ \t]*//.*$', b):
            spans.append((m.start(), m.end()))
        return spans
    if ext == '.css':
        for m in re.finditer(rb'/\*.*?\*/', b, re.S):
            spans.append((m.start(), m.end()))
        return spans
    # JS-like: scan
    i, n = 0, len(b)
    while i < n:
        c = b[i:i + 1]
        if c in (b'"', b"'", b'`'):
            q = c
            j = i + 1
            while j < n:
                d = b[j:j + 1]
                if d == b'\\':
                    j += 2
                    continue
                if d == q:
                    break
                if q != b'`' and d == b'\n':
                    break
                j += 1
            i = j + 1
            continue
        if b[i:i + 2] == b'//':
            j = b.find(b'\n', i)
            j = n if j < 0 else j
            spans.append((i, j))
            i = j
            continue
        if b[i:i + 2] == b'/*':
            j = b.find(b'*/', i + 2)
            j = n if j < 0 else j + 2
            spans.append((i, j))
            i = j
            continue
        i += 1
    return spans


def main():
    use_manifest = '--manifest' in sys.argv
    files = []
    if use_manifest:
        for r in json.load(open(R.MANIFEST, encoding='utf-8')):
            files.append((r['rel'], os.path.join(R.PRE, *r['rel'].split('/'))))
    else:
        rows, refused, scanned = R.plan()
        files = [(r['rel'], r['path']) for r in rows]
    bad, total = 0, 0
    for rel, p in files:
        b = open(p, 'rb').read()
        ext = os.path.splitext(p)[1].lower()
        if ext in ('.mjs', '.cjs'):
            ext = '.js'
        spans = comment_spans(b, ext)
        for m in TOK.finditer(b):
            total += 1
            inside = any(s <= m.start() and m.end() <= e for s, e in spans)
            ls = b.rfind(b'\n', 0, m.start()) + 1
            le = b.find(b'\n', m.end())
            le = len(b) if le < 0 else le
            line_no = b.count(b'\n', 0, m.start()) + 1
            text = b[ls:le].decode('utf-8', 'replace').rstrip('\r')
            print('%s %s:%d  %s' % ('COMMENT' if inside else 'CODE!! ', rel.split('/')[-1], line_no, text.strip()[:150]))
            if not inside:
                bad += 1
    print('tokens: %d; outside a comment: %d' % (total, bad))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
