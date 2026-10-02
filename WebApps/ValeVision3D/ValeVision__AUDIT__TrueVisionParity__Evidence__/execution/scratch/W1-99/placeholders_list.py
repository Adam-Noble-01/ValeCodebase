"""W1-99: the placeholder pass's file list from its manifest (path, tokens, SHA-1 before -> after, line endings),
grouped by top folder, plus the counts per folder and per package. Read-only. Output: placeholders_resolved.txt"""
import collections, json, os, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
PFX = 'WebApps/ValeVision3D/'
by_top = collections.OrderedDict()
per_pkg = collections.Counter()
for r in sorted(rows, key=lambda r: r['rel']):
    rel = r['rel'][len(PFX):] if r['rel'].startswith(PFX) else r['rel']
    top = rel.split('/')[0]
    by_top.setdefault(top, []).append((rel, r))
    for t in r['tokens']:
        per_pkg[t[8:-2]] += 1
out = []
out.append('W1-99 placeholder pass: %d files, %d placeholders -> v2.71.2 (manifest preimage_manifest.json)' % (
    len(rows), sum(len(r['tokens']) for r in rows)))
for top, items in by_top.items():
    out.append('%s: %d file(s), %d placeholder(s)' % (top, len(items), sum(len(r['tokens']) for _, r in items)))
out.append('per package: ' + ', '.join('%s x%d' % (k, per_pkg[k]) for k in sorted(per_pkg)))
out.append('')
for top, items in by_top.items():
    for rel, r in items:
        eol = 'CRLF' if r['crlf'] and r['crlf'] == r['lf'] else ('LF' if not r['crlf'] else 'mixed %d/%d' % (r['crlf'], r['lf']))
        out.append('%s  %d  %s -> %s  %s' % (rel, len(r['tokens']), r['sha1_before'][:8], r['sha1_after'][:8], eol))
text = '\n'.join(out) + '\n'
open(os.path.join(HERE, 'placeholders_resolved.txt'), 'w', encoding='utf-8', newline='\n').write(text)
print('\n'.join(out[:len(by_top) + 3]))
