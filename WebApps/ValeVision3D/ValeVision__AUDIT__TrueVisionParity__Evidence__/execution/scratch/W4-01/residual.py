# List every residual identity marker in a folder (text files and text entries inside zips)
import os, re, sys, zipfile, io

PAT = re.compile(r'(?i)noble|truevision|na-project-portal|aa00|\bT0[1-4]\b|/q/|/s/|portal|planning approval|R2\b|v2\.1[0-9]{2}')
root = sys.argv[1]
TEXT = {'.json', '.md', '.note', '.svg'}

def scan(label, text):
    for i, line in enumerate(text.splitlines(), 1):
        for m in PAT.finditer(line):
            s = max(0, m.start() - 60)
            print('%s:%d: %s' % (label, i, line[s:m.end() + 60].strip()))
            break

for base, dirs, files in os.walk(root):
    for name in files:
        p = os.path.join(base, name)
        rel = os.path.relpath(p, root)
        ext = os.path.splitext(name)[1].lower()
        if ext in TEXT:
            scan(rel, open(p, encoding='utf-8').read())
        elif ext == '.zip':
            z = zipfile.ZipFile(p)
            for n in z.namelist():
                if os.path.splitext(n)[1].lower() in TEXT:
                    scan(rel + '!' + n, z.read(n).decode('utf-8'))
