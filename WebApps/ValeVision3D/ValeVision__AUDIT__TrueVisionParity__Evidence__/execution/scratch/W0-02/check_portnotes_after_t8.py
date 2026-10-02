"""Scratch (W0-02): after T8 deleted the PORT NOTE bullets W0-02 made false, list every changed file
whose PORT NOTE `Divergences` heading is left with no bullet under it (the next field follows at once),
and show each changed file's Divergences block so the result can be read."""
import os, re, subprocess

VCB = r'D:\10_CoreLib__ValeCodebase'
r = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '-M', '--name-status', '--', 'WebApps/ValeVision3D'],
                   capture_output=True, text=True, encoding='utf-8')
changed = [l.split('\t')[-1] for l in r.stdout.splitlines() if l.strip()]
empty, inline_ok, with_bullets, no_portnote = [], [], [], []
for p in changed:
    if not p.endswith(('.js', '.mjs', '.css')):
        continue
    text = open(os.path.join(VCB, p.replace('/', os.sep)), 'rb').read().decode('utf-8').replace('\r\n', '\n')
    lines = text.split('\n')
    idx = [i for i, ln in enumerate(lines) if re.match(r'^\s*(//|\*)?\s*-\s*Divergences\s*:', ln)]
    if not idx:
        no_portnote.append(p)
        continue
    for i in idx:
        head = lines[i]
        after = re.sub(r'^.*Divergences\s*:', '', head).strip()
        nxt = lines[i + 1] if i + 1 < len(lines) else ''
        if after:
            inline_ok.append((p, head.strip()))
        elif re.match(r'^\s*(//|\*)\s{2,}-\s', nxt) or re.match(r'^\s*(//|\*)\s{3,}\S', nxt):
            with_bullets.append(p)
        else:
            empty.append((p, i + 1, head.strip(), nxt.strip()))
print('changed code/style files with a Divergences field: %d (bullets %d, inline text %d); without one: %d'
      % (len(with_bullets) + len(inline_ok) + len(empty), len(with_bullets), len(inline_ok), len(no_portnote)))
print('EMPTY Divergences after T8: %d' % len(empty))
for e in empty:
    print('  %s:%d  %s  ->  next: %s' % e)
