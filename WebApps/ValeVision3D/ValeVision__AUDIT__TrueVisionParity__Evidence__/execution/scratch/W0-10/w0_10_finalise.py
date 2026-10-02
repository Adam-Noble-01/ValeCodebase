# W0-10 scratch: finalise the staged worker package.
#
# 1. Turn every staged file (src + tests) from LF into CRLF - the worker
#    folder's own working-tree line ending (git stores LF either way:
#    .gitattributes * text=auto). A file already CRLF is left as it is.
# 2. Write execution/prepared/W0-10.patch: a git-style unified diff, paths
#    relative to D:\10_CoreLib__ValeCodebase, of every staged file against the
#    live tree (a modified index.js; new files otherwise).
# 3. Prove the patch: in throw-away repos under %TEMP% holding byte copies of
#    the live files, git apply --check and git apply, plain and with
#    core.autocrlf=true + "* text=auto" as ValeCodebase has; every result must
#    equal its staged copy byte for byte. The temp repos are deleted.
# 4. Write scratch/W0-10/staged_manifest.json (SHA-1 of every staged file and
#    of the patch).
# Nothing inside WebApps/Whitecardopedia is written.
import difflib
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, 'WebApps', 'ValeVision3D', 'ValeVision__AUDIT__TrueVisionParity__Evidence__', 'execution')
STAGE_ROOT = os.path.join(EXEC, 'prepared', 'W0-10')
PATCH = os.path.join(EXEC, 'prepared', 'W0-10.patch')
SCRATCH = os.path.join(EXEC, 'scratch', 'W0-10')
TEMP_BASE = os.environ.get('NA_W0_10_TEMP') or tempfile.gettempdir()


def sha1_bytes(data):
    return hashlib.sha1(data).hexdigest()


def staged_files():
    found = []
    for dirpath, _dirnames, filenames in os.walk(os.path.join(STAGE_ROOT, 'WebApps')):
        for filename in sorted(filenames):
            full = os.path.join(dirpath, filename)
            found.append((os.path.relpath(full, STAGE_ROOT).replace('\\', '/'), full))
    return sorted(found)


# 1. CRLF
converted = []
for rel, full in staged_files():
    data = open(full, 'rb').read()
    if b'\r\n' in data:
        assert data.count(b'\n') == data.count(b'\r\n'), f'{rel} has mixed line endings'
        continue
    assert b'\r' not in data, f'{rel} has a bare CR'
    with open(full, 'wb') as handle:
        handle.write(data.replace(b'\n', b'\r\n'))
    converted.append(rel)
print('converted to CRLF:', converted)

# 2. The patch
chunks = []
summary = []
for rel, full in staged_files():
    new = open(full, 'rb').read()
    live_path = os.path.join(VCB, *rel.split('/'))
    old = open(live_path, 'rb').read() if os.path.exists(live_path) else None
    new_lines = new.decode('utf-8').splitlines(keepends=True)
    if old is None:
        header = [f'diff --git a/{rel} b/{rel}\n', 'new file mode 100644\n', '--- /dev/null\n', f'+++ b/{rel}\n']
        body = [f'@@ -0,0 +1,{len(new_lines)} @@\n'] + ['+' + line for line in new_lines]
        summary.append((rel, 'new', len(new_lines), 0))
    else:
        old_lines = old.decode('utf-8').splitlines(keepends=True)
        diff = list(difflib.unified_diff(old_lines, new_lines, fromfile=f'a/{rel}', tofile=f'b/{rel}', n=3))
        if not diff:
            continue
        diff[0] = f'--- a/{rel}\n'
        diff[1] = f'+++ b/{rel}\n'
        header = [f'diff --git a/{rel} b/{rel}\n']
        body = diff
        added = sum(1 for line in diff[2:] if line.startswith('+'))
        removed = sum(1 for line in diff[2:] if line.startswith('-'))
        summary.append((rel, 'modified', added, removed))
    for line in body:
        assert line.endswith('\n'), f'{rel}: a patch line without a newline'
    chunks.append(''.join(header) + ''.join(body))
patch_text = ''.join(chunks)
with open(PATCH, 'wb') as handle:
    handle.write(patch_text.encode('utf-8'))
print('patch written:', PATCH, len(patch_text.encode('utf-8')), 'bytes')
for rel, kind, added, removed in summary:
    print(f'  {kind:8s} {rel}  +{added} -{removed}')


# 3. Prove it
def prove(label, autocrlf):
    repo = os.path.join(TEMP_BASE, 'na_w0_10_patch_check_' + label)
    if os.path.exists(repo):
        shutil.rmtree(repo)
    os.makedirs(repo)
    run = lambda *args: subprocess.run(['git', '-C', repo] + list(args), capture_output=True, text=True)
    assert run('init', '-q').returncode == 0
    run('config', 'core.autocrlf', 'true' if autocrlf else 'false')
    if autocrlf:
        with open(os.path.join(repo, '.gitattributes'), 'wb') as handle:
            handle.write(b'* text=auto\n')
    for rel, _full in staged_files():
        live_path = os.path.join(VCB, *rel.split('/'))
        if os.path.exists(live_path):
            target = os.path.join(repo, *rel.split('/'))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copyfile(live_path, target)
    check = run('apply', '--check', PATCH)
    apply = run('apply', PATCH) if check.returncode == 0 else check
    same = []
    for rel, full in staged_files():
        result = os.path.join(repo, *rel.split('/'))
        same.append(os.path.exists(result) and open(result, 'rb').read() == open(full, 'rb').read())
    shutil.rmtree(repo, ignore_errors=True)
    return {'check': check.returncode, 'apply': apply.returncode, 'stderr': (check.stderr + apply.stderr).strip(), 'identical': all(same), 'files': len(same)}


proofs = {'plain': prove('plain', False), 'autocrlf': prove('autocrlf', True)}
print('patch proof:', json.dumps(proofs, indent=2))

# 4. Manifest
manifest = {'files': {rel: sha1_bytes(open(full, 'rb').read()) for rel, full in staged_files()},
            'patch': {'path': 'execution/prepared/W0-10.patch', 'sha1': sha1_bytes(open(PATCH, 'rb').read())},
            'summary': [{'path': rel, 'kind': kind, 'added': added, 'removed': removed} for rel, kind, added, removed in summary],
            'proof': proofs}
with open(os.path.join(SCRATCH, 'staged_manifest.json'), 'w', encoding='utf-8', newline='\n') as handle:
    json.dump(manifest, handle, indent=4)
    handle.write('\n')
ok = all(p['check'] == 0 and p['apply'] == 0 and p['identical'] for p in proofs.values())
print('ALL OK' if ok else 'PROOF FAILED')
sys.exit(0 if ok else 1)
