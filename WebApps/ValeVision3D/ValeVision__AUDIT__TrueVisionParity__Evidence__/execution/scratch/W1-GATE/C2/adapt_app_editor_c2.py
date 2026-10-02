"""Scratch only: make run_app_editor_c2.mjs's Page Down step read WHICH drawing is open (the title block's DOCUMENT ID
value, the drawing title and the focused element) before and after the key, instead of the tab strip's label (the
Drawings tab is the active tab for every sheet). Exact-once replacements; LF kept."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run_app_editor_c2.mjs')
s = open(P, 'rb').read().decode('utf-8')
old_before = "            const before = await page.evaluate(() => (document.querySelector('.na-le-tabs__tab--active') || {}).textContent || null);\n"
old_after = "            const after = await page.evaluate(() => (document.querySelector('.na-le-tabs__tab--active') || {}).textContent || null);\n"
probe = ("(() => { const t = Array.from(document.querySelectorAll('.na-le-paper__chrome text, .na-le-paper svg text')).map((x) => x.textContent.trim()); "
         "const i = t.indexOf('DOCUMENT ID'); const j = t.indexOf('DRAWING TITLE'); const a = document.activeElement; "
         "return { documentId : i >= 0 ? t[i + 1] : null, title : j >= 0 ? t[j + 1] : null, focus : a ? (a.tagName + '.' + String(a.className || '').split(' ')[0]) : null }; })")
new_before = "            const before = await page.evaluate(" + probe + ");\n"
new_after = "            const after = await page.evaluate(" + probe + ");\n"
for old, new in ((old_before, new_before), (old_after, new_after)):
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(P, 'wb').write(s.encode('utf-8'))
print('adapted', P)
