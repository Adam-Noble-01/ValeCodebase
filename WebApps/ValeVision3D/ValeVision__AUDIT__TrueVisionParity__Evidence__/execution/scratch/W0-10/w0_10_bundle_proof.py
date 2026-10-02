# W0-10 scratch: assemble the post-patch layout in %TEMP%, bundle it with
# wrangler's esbuild options (w0_10_bundle.mjs), drive the bundle, record the
# output in scratch/W0-10/bundle_proof__output.txt, delete the temp tree.
import os
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w0_10_assemble as asm  # noqa: E402

SCRATCH = os.path.dirname(os.path.abspath(__file__))

tree = asm.assemble('bundle')
out_dir = os.path.join(tree['root'], 'dist')
proc = subprocess.run(['node', os.path.join(SCRATCH, 'w0_10_bundle.mjs'), tree['worker'], out_dir],
                      env=asm.test_env(), capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
text = proc.stdout + ('\n[stderr]\n' + proc.stderr if proc.stderr.strip() else '')
text = text.replace(tree['root'], '<assembled>')
with open(os.path.join(SCRATCH, 'bundle_proof__output.txt'), 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(text + f'\nexit {proc.returncode}\n')
print(text)
print('exit', proc.returncode)
shutil.rmtree(tree['root'])
sys.exit(proc.returncode)
