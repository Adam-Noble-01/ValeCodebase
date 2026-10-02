# -*- coding: utf-8 -*-
"""H1 (final cross-section harmonisation, 01-Oct-2026) - exact-snippet patches with a change record.

Every edit is an Edit(file, where, old, new, reason, evidence). apply() keeps the file's own line ending
(CRLF or LF) and is idempotent:
  * old present exactly once  -> replaced (status 'applied');
  * new already present        -> skipped (status 'already applied');
  * neither                    -> SystemExit (the edit has gone stale; re-check it by hand).
Nothing outside parity/ is ever written. The records feed HARMONISATION_LOG.md (h1_write_log.py).
"""
import json
import os

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.dirname(TOOLS)
PARITY = os.path.dirname(REPORT)
RECORD = os.path.join(PARITY, 'h1work', 'h1_edit_record.json')


class Edit(object):
    def __init__(self, file, where, old, new, reason, evidence=''):
        self.file, self.where, self.old, self.new, self.reason, self.evidence = file, where, old, new, reason, evidence
        self.status = None


def _abs(rel):
    p = os.path.normpath(os.path.join(PARITY, rel))
    if not p.startswith(os.path.normpath(PARITY)):
        raise SystemExit('refusing to write outside parity/: ' + rel)
    return p


def apply(edits, dry=False):
    by_file = {}
    for e in edits:
        by_file.setdefault(e.file, []).append(e)
    for rel, es in by_file.items():
        path = _abs(rel)
        raw = open(path, 'rb').read()
        crlf = b'\r\n' in raw
        text = raw.decode('utf-8')
        if crlf:
            text = text.replace('\r\n', '\n')
        for e in es:
            o, n = e.old.replace('\r\n', '\n'), e.new.replace('\r\n', '\n')
            c = text.count(o)
            if n in text and (c == 0 or o in n):
                # already applied; an insertion keeps its anchor (old inside new), so test the new text first
                e.status = 'already applied'
            elif c == 1:
                text = text.replace(o, n, 1)
                e.status = 'applied'
            else:
                raise SystemExit('%s [%s]: expected exactly 1 occurrence of the old text, found %d (and the new text is %s):\n%r'
                                 % (rel, e.where, c, 'present' if n in text else 'absent', o[:400]))
        if not dry:
            out = text.replace('\n', '\r\n') if crlf else text
            with open(path, 'wb') as f:
                f.write(out.encode('utf-8'))
        print('%s %s: %s' % ('dry-run' if dry else 'patched', rel,
                             ', '.join('%s=%d' % (s, sum(1 for e in es if e.status == s)) for s in ('applied', 'already applied'))))
    return edits


def save_record(edits, group):
    rec = []
    if os.path.exists(RECORD):
        rec = [r for r in json.load(open(RECORD, encoding='utf-8')) if r.get('group') != group]
    for e in edits:
        rec.append({'group': group, 'file': e.file, 'where': e.where, 'old': e.old, 'new': e.new,
                    'reason': e.reason, 'evidence': e.evidence, 'status': e.status})
    os.makedirs(os.path.dirname(RECORD), exist_ok=True)
    with open(RECORD, 'w', encoding='utf-8') as f:
        json.dump(rec, f, indent=1, ensure_ascii=False)
