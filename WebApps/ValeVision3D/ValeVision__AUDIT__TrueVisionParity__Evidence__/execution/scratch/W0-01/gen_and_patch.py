"""W0-01: build the 01-Oct-2026 Decisions block (Section 2A) and patch it into the VV port plan.

Usage:
    python gen_and_patch.py --generate      build + validate, write the block to scratch only
    python gen_and_patch.py --apply         build + validate, then patch the PLAN (LF kept, no BOM)

Verbatim sources (never retyped): DR titles and default_if_unanswered from
parity/data/decision_register.json; swarm rules R1-R11 and standard gates G1-G7 from
parity/data/wp_canonical.json. Hand-written parts come from block_source__2A.txt.
The patch refuses to run if the PLAN's SHA-1 differs from the pre-image recorded at G0.
"""
import hashlib, io, json, os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
EVID = os.path.join(VV, 'ValeVision__AUDIT__TrueVisionParity__Evidence__')
SCRATCH = os.path.join(EVID, 'execution', 'scratch', 'W0-01')
PLAN = os.path.join(VV, 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md')
SOURCE = os.path.join(SCRATCH, 'block_source__2A.txt')
OUT_BLOCK = os.path.join(SCRATCH, 'block__2A.generated.md')
PREIMAGE_SHA1 = 'c75b27603aab74cdab2ce27ad323e15eb4741f7b'

ANCHOR_SECTION0 = ('- Section 2 records every decision taken on 09-Sep-2026 (D01 to D40). The rest of the '
                   'document is written to those decisions; if one changes, search for its id.\n')
ANCHOR_SECTION3 = '\n\n---\n\n## 3. What was found in the three codebases\n'
BLOCK_TITLE = '## 2A. Decisions (01-Oct-2026) - TrueVision parity alignment, D41 to D91'
Q_ORDER = ['Q-VER', 'Q-63', 'Q-35ASSETS', 'Q-REG', 'Q-AZIMUTH', 'Q-COVER', 'Q-BACKUP']


def fail(msg):
    sys.stderr.write('FAIL: ' + msg + '\n')
    sys.exit(1)


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def parse_source(text):
    if '\r' in text:
        fail('source contains CR characters')
    sections = []
    cur = None
    for line in text.split('\n'):
        if line.startswith('=== '):
            cur = {'head': line[4:].strip(), 'lines': []}
            sections.append(cur)
        elif cur is not None:
            cur['lines'].append(line)
    out = {'DR': [], 'Q': []}
    for s in sections:
        head = s['head']
        body = '\n'.join(s['lines']).strip('\n')
        if head in ('SECTION0', 'INTRO', 'AFTER'):
            out[head] = body
        elif head.startswith('DR '):
            fields = {}
            for ln in s['lines']:
                m = re.match(r'^(GLOSS|SETS):\s?(.*)$', ln)
                if m:
                    fields[m.group(1)] = m.group(2).strip()
                elif ln.strip():
                    fail('stray line in %s: %r' % (head, ln[:80]))
            out['DR'].append((head[3:].strip(), fields))
        elif head == 'Q':
            fields = {}
            for ln in s['lines']:
                m = re.match(r'^(ID|REF|QUESTION|ANSWER|SETS):\s?(.*)$', ln)
                if m:
                    fields[m.group(1)] = m.group(2).strip()
                elif ln.strip():
                    fail('stray line in Q: %r' % ln[:80])
            out['Q'].append(fields)
        else:
            fail('unknown section ' + head)
    return out


def cell(text, where):
    if '|' in text:
        fail('pipe character inside a table cell (%s): %r' % (where, text[:120]))
    if '\n' in text:
        fail('newline inside a table cell (%s)' % where)
    return text.strip()


def build():
    src = parse_source(io.open(SOURCE, encoding='utf-8').read())
    reg = json.load(io.open(os.path.join(EVID, 'parity', 'data', 'decision_register.json'), encoding='utf-8'))
    canon = json.load(io.open(os.path.join(EVID, 'parity', 'data', 'wp_canonical.json'), encoding='utf-8'))

    for key in ('SECTION0', 'INTRO', 'AFTER'):
        if not src.get(key):
            fail('missing section ' + key)
    if len(reg) != 44 or [r['dr_id'] for r in reg] != ['DR-%02d' % i for i in range(1, 45)]:
        fail('decision register is not DR-01..DR-44 in order')
    if [d for d, _ in src['DR']] != ['DR-%02d' % i for i in range(1, 45)]:
        fail('source DR sections are not DR-01..DR-44 in order')
    if [q.get('ID') for q in src['Q']] != Q_ORDER:
        fail('source Q sections are not in the order ' + ', '.join(Q_ORDER))

    lines = [BLOCK_TITLE, '', src['INTRO'], '']
    lines += ['### 2A.1 The K1 register, DR-01 to DR-44', '',
              '| Id | DR | Decision | Answer applied (01-Oct-2026) | Sets |',
              '|---|---|---|---|---|']
    for i, (r, (dr_id, f)) in enumerate(zip(reg, src['DR'])):
        if 'SETS' not in f or not f['SETS']:
            fail(dr_id + ' has no SETS')
        default = r['default_if_unanswered'].strip()
        answer = '01-Oct-2026 - default, unanswered: ' + default
        gloss = f.get('GLOSS', '').strip()
        if gloss:
            if not answer.endswith('.'):
                answer += '.'
            answer += ' ' + gloss
        row = '| D%d | %s | %s | %s | %s |' % (
            i + 41, dr_id, cell(r['title'], dr_id + ' title'), cell(answer, dr_id + ' answer'),
            cell(f['SETS'], dr_id + ' sets'))
        lines.append(row)
    lines += ['', '### 2A.2 The open questions: Q-VER (R0.2.1) and the six of R0.2.11', '',
              '| Id | Question | Decision | Answer applied (01-Oct-2026) | Sets |',
              '|---|---|---|---|---|']
    for i, q in enumerate(src['Q']):
        for k in ('ID', 'REF', 'QUESTION', 'ANSWER', 'SETS'):
            if not q.get(k):
                fail('%s lacks %s' % (q.get('ID'), k))
        row = '| D%d | %s (%s) | %s | %s | %s |' % (
            i + 85, q['ID'], q['REF'], cell(q['QUESTION'], q['ID'] + ' question'),
            cell(q['ANSWER'], q['ID'] + ' answer'), cell(q['SETS'], q['ID'] + ' sets'))
        lines.append(row)

    rules = canon['swarm_rules']
    gates = canon['standard_gates']
    if len(rules) != 11 or [re.match(r'^R(\d+) ', x).group(1) for x in rules] != [str(n) for n in range(1, 12)]:
        fail('swarm_rules are not R1..R11')
    if len(gates) != 7 or [re.match(r'^G(\d)', x).group(1) for x in gates] != [str(n) for n in range(1, 8)]:
        fail('standard_gates are not G1..G7')
    after = src['AFTER']
    if after.count('{{RULES}}') != 1 or after.count('{{GATES}}') != 1:
        fail('AFTER must hold {{RULES}} and {{GATES}} once each')
    for x in rules + gates:
        if '`' in x:
            fail('a rule or gate contains a backtick, so it cannot sit in a code span: ' + x[:60])
    # Character for character, inside code spans so Markdown reads nothing in them
    # (G3's "<VV app root>" is otherwise a raw HTML tag, G4's "__PLAN__" bold).
    after = after.replace('{{RULES}}', '\n'.join('- `' + x + '`' for x in rules))
    after = after.replace('{{GATES}}', '\n'.join('- `' + x + '`' for x in gates))
    lines += ['', after]

    block = '\n'.join(lines).rstrip('\n') + '\n'
    bullet = src['SECTION0'].strip()
    if '\n' in bullet or not bullet.startswith('- Section 2A'):
        fail('SECTION0 must be one bullet line starting "- Section 2A"')

    bad = [(n + 1, ch) for n, ln in enumerate(block.split('\n')) for ch in ln if ord(ch) > 126 or (ord(ch) < 32 and ch != '\t')]
    bad += [(0, ch) for ch in bullet if ord(ch) > 126]
    if bad:
        fail('non-ASCII or control characters in the block: %r' % bad[:10])
    if '\t' in block:
        fail('tab character in the block')

    # Every D-number appears exactly once as a row id.
    ids = re.findall(r'^\| (D\d+) \|', block, flags=re.M)
    if ids != ['D%d' % n for n in range(41, 92)]:
        fail('row ids are not D41..D91 in order: %r' % ids[:5])
    markdown_lint(block + '\n' + bullet)
    return block, bullet, len(rules), len(gates)


def markdown_lint(md):
    """Fail on text outside code spans that Markdown would not show as written."""
    problems = []
    for n, line in enumerate(md.split('\n'), 1):
        if line.count('`') % 2:
            problems.append((n, 'odd number of backticks'))
            continue
        bare = re.sub(r'`[^`]*`', '', line)
        m = re.search(r'</?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?/?>', bare)
        if m:
            problems.append((n, 'raw HTML tag ' + m.group(0)))
        m = re.search(r'(^|[\s(\[{"\'])(__|\*\*?)[A-Za-z0-9]', bare)
        if m:
            problems.append((n, 'emphasis opener ' + repr(bare[max(0, m.start() - 10): m.end() + 10])))
        if re.search(r'(^|\s)_[A-Za-z0-9][^_\s]*_(\s|$|[.,;:)])', bare):
            problems.append((n, 'single-underscore emphasis'))
    allowed = {'**Dated note, 01-Oct-2026.**'}
    real = [p for p in problems if not any(a in md.split('\n')[p[0] - 1] for a in allowed) or 'emphasis' not in p[1]]
    if real:
        fail('Markdown lint: %r' % real[:12])


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--generate'
    block, bullet, nr, ng = build()
    io.open(OUT_BLOCK, 'w', encoding='utf-8', newline='\n').write(bullet + '\n\n' + block)
    print('generated block: %d lines, %d bytes; rules %d, gates %d; rows D41-D91' % (
        block.count('\n'), len(block.encode('utf-8')), nr, ng))
    if mode == '--generate':
        return
    if mode != '--apply':
        fail('unknown mode ' + mode)

    raw = open(PLAN, 'rb').read()
    if sha1(raw) != PREIMAGE_SHA1:
        fail('PLAN changed since the G0 snapshot (sha1 %s) - stop' % sha1(raw))
    if raw.startswith(b'\xef\xbb\xbf'):
        fail('PLAN unexpectedly has a BOM')
    text = raw.decode('utf-8')
    if '\r' in text:
        fail('PLAN unexpectedly has CR line endings')
    if BLOCK_TITLE in text or '## 2A.' in text:
        fail('PLAN already holds a Section 2A')
    if text.count(ANCHOR_SECTION0) != 1:
        fail('Section 0 anchor found %d times' % text.count(ANCHOR_SECTION0))
    if text.count(ANCHOR_SECTION3) != 1:
        fail('Section 3 anchor found %d times' % text.count(ANCHOR_SECTION3))
    i3 = text.index(ANCHOR_SECTION3)
    d40_line = text[:i3].rsplit('\n', 1)[-1]
    if not d40_line.startswith('| D40 | '):
        fail('the line before the Section 3 separator is not the D40 row')

    ins0 = bullet + '\n'
    new = text.replace(ANCHOR_SECTION0, ANCHOR_SECTION0 + ins0, 1)
    i3 = new.index(ANCHOR_SECTION3)
    ins3 = '---\n\n' + block + '\n'
    pos = i3 + 2                                  # after the blank line that follows the D40 row
    new = new[:pos] + ins3 + new[pos:]

    # Removing exactly what was inserted must give back the original bytes.
    back = new[:pos] + new[pos + len(ins3):]
    back = back.replace(ANCHOR_SECTION0 + ins0, ANCHOR_SECTION0, 1)
    if back != text:
        fail('round-trip check failed - nothing written')

    out = new.encode('utf-8')
    with open(PLAN, 'wb') as fh:
        fh.write(out)
    again = open(PLAN, 'rb').read()
    if again != out:
        fail('read-back differs from what was written')
    print('PLAN patched: %d -> %d bytes, %d -> %d lines; sha1 %s -> %s' % (
        len(raw), len(again), raw.count(b'\n'), again.count(b'\n'), PREIMAGE_SHA1, sha1(again)))
    print('CR bytes: %d; BOM: %s' % (again.count(b'\r'), again.startswith(b'\xef\xbb\xbf')))


if __name__ == '__main__':
    main()
