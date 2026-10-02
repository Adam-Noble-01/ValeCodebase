# W1-26 scratch: pull the harness page's module script out of browser_w1_26.mjs and syntax-check it with
# node --check (the page is a String.raw template, so ${IMPORTMAP} is the only substitution).
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "browser_w1_26.mjs"), encoding="utf-8").read()
page = src.split("const PAGE = String.raw`", 1)[1].split("</html>`;", 1)[0]
script = page.split('<script type="module">', 1)[1].split("</script>", 1)[0]
tmp = os.path.join(tempfile.gettempdir(), "w1_26_page_script.mjs")
open(tmp, "w", encoding="utf-8").write(script)
res = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
print("node --check page script: exit %d" % res.returncode)
print(res.stdout + res.stderr)
os.remove(tmp)
sys.exit(res.returncode)
