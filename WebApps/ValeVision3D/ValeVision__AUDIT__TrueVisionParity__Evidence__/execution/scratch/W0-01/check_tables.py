"""Check every Markdown table in the PLAN's Section 2A: rows match the header's column count,
and the separator row is well formed. Read-only."""
import io, re, sys

PLAN = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md'
lines = io.open(PLAN, encoding='utf-8').read().split('\n')
start = next(i for i, l in enumerate(lines) if l.startswith('## 2A. '))
end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith('## 3. '))


def cells(line):
    bare = re.sub(r'`[^`]*`', lambda m: 'x' * len(m.group(0)), line)   # pipes inside code spans do not split
    return bare.strip().strip('|').split('|')


tables, cur, errs = 0, None, []
for i in range(start, end):
    l = lines[i]
    if l.startswith('|'):
        if cur is None:
            cur = len(cells(l)); tables += 1; header_at = i
            sep = lines[i + 1]
            if not re.match(r'^\|(---\|)+$', sep) or len(cells(sep)) != cur:
                errs.append('line %d: bad separator under header' % (i + 2))
        elif len(cells(l)) != cur:
            errs.append('line %d: %d cells, header (line %d) has %d' % (i + 1, len(cells(l)), header_at + 1, cur))
    else:
        cur = None
print('Section 2A spans lines %d-%d; tables %d; problems %d' % (start + 1, end, tables, len(errs)))
for e in errs:
    print('  ' + e)
sys.exit(1 if errs else 0)
