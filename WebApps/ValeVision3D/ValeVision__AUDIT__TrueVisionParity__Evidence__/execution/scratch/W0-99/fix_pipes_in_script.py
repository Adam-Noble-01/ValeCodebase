"""W0-99 - one-off: replace HTTP-method pipes (GET|POST) inside update_ledger.py's table text with words, since a bare
pipe splits a GitHub-flavoured Markdown table cell. Each replacement must match exactly once."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'update_ledger.py')
t = open(P, encoding='utf-8').read()
REPL = [
    ('`GET|POST .../files/<name>`', 'GET and POST `.../files/<name>`'),
    ('`GET|POST /api/<path>` answers a JSON 404', 'GET and POST `/api/<path>` answer a JSON 404'),
    ('`POST|PUT .../upload`', 'POST and PUT `.../upload`'),
    ('`GET|POST /api/valevision/user-config/spellings`', 'GET and POST `/api/valevision/user-config/spellings`'),
    ('`GET|POST|PUT .../file`', 'GET, POST and PUT `.../file`'),
    ('`GET|POST .../file`', 'GET and POST `.../file`'),
]
for old, new in REPL:
    n = t.count(old)
    if n != 1:
        raise SystemExit('%r found %d times' % (old, n))
    t = t.replace(old, new)
open(P, 'w', encoding='utf-8', newline='\n').write(t)
left = [ln for ln in t.splitlines() if any(('%s|%s' % (a, b)) in ln for a in ('GET', 'POST', 'PUT') for b in ('GET', 'POST', 'PUT'))]
print('replaced %d; method pipes left: %d' % (len(REPL), len(left)))
