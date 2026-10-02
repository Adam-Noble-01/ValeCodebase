# W0-10 scratch: mutation check of the worker 1.6.0 node tests.
#
# Baseline: the staged worker, assembled in the post-patch layout, must pass
# both tests. Then each mutant puts ONE deliberate fault into ONE staged file
# and both tests run again: every mutant must be caught (at least one test
# exits non-zero). Results: scratch/W0-10/mutants__report.md.
import json
import os
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w0_10_assemble as asm  # noqa: E402

SCRATCH = os.path.dirname(os.path.abspath(__file__))
TESTS = ['Na__Test__EditorWorker__ProjectFiles__.test.mjs', 'Na__Test__EditorWorker__MergeKeys__.test.mjs']

MUTANTS = [
    ('M01', 'index.js', 'no folderId check',
     'const folderCheck = na_validate_folder_id(folderId);', 'const folderCheck = { ok : true };'),
    ('M02', 'index.js', 'key checked before the route (1.5.0 order: unknown paths answer 401)',
     'const resolved = na_resolve_route(method, url.pathname);',
     "if (!na_validate_api_key(request, env)) { return na_cors_json_response(JSON.stringify({ error: 'Unauthorized' }), 401, env, requestOrigin); }\n                const resolved = na_resolve_route(method, url.pathname);"),
    ('M03', 'index.js', "health route list without 'files'",
     "['save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files']", "['save', 'assets', 'drawing-notes', 'project', 'merge-keys']"),
    ('M04', 'CloudflareHelper__PathGuards__.js', '00__Archive accepted as a sheet-picture folder',
     'if (folder === Na__PathGuards__IMAGES_ARCHIVE) {', 'if (false) {'),
    ('M05', 'CloudflareHelper__PathGuards__.js', '"." and ".." segments accepted',
     'if (segment === \'.\' || segment === \'..\') return `${what} must not contain a "." or ".." segment`;', "if (false) return '';"),
    ('M06', 'CloudflareHelper__PathGuards__.js', 'merge guard by prefix family instead of the list',
     'if (!active.setAllowed.has(key)) refused.push(',
     'if (!/^(LayoutEditor__|PresentationMode__|CrossSection__|Navmode__|Camera__|OrbitHelperCube__|FogPlane__|RenderEngine__|VideoStudio__|GridLine__|RenderEffect__)/.test(key)) refused.push('),
    ('M07', 'CloudflareHelper__PathGuards__.js', 'a list naming a pipeline key accepted (fails open)',
     'if (Na__PathGuards__PIPELINE_KEYS.indexOf(key) !== -1) return refused(', 'if (false) return refused('),
    ('M08', 'CloudflareHelper__PathGuards__.js', 'sheet-picture hash not checked',
     "if (hex.slice(0, 10) !== guard.hashPrefix) return na_refuse(", 'if (false) return na_refuse('),
    ('M09', 'handlers/CloudflareHandler__ProjectFiles__.js', 'published deletes across document folders',
     'if (folders.length > 1) {', 'if (false) {'),
    ('M10', 'handlers/CloudflareHandler__ProjectFiles__.js', 'unmanaged sheet-picture deletes allowed',
     'if (unmanaged.length > 0) {', 'if (false) {'),
    ('M11', 'handlers/CloudflareHandler__ProjectFiles__.js', 'cross-family copies allowed',
     'if (from.family !== to.family) {', 'if (false) {'),
    ('M12', 'handlers/CloudflareHandler__ProjectFiles__.js', 'no 25 MB cap on files/write',
     '\n        if (bytes.length > guard.maxBytes) {', '\n        if (false) {'),
    ('M13', 'handlers/CloudflareHandler__ProjectMerge__.js', 'the build manifest always bumped',
     'if (bumpBuild) {', 'if (true) {'),
    ('M14', 'handlers/CloudflareHandler__ProjectMerge__.js', 'drawingsBase ignored',
     'if (base !== null && na_drawings_base_of(current.document) !== base) {', 'if (false) {'),
    ('M15', 'handlers/CloudflareHandler__ProjectMerge__.js', 'unconditional write (a concurrent write is lost)',
     'stored = await env.R2_BUCKET.put(key, text, { httpMetadata : httpMetadata, onlyIf : { etagMatches : current.object.etag } });',
     'stored = await env.R2_BUCKET.put(key, text, { httpMetadata : httpMetadata });'),
    ('M16', 'handlers/CloudflareHandler__ProjectMerge__.js', 'a missing project.json not answered 409',
     '\n                if (current.missing) {', '\n                if (false) {'),
]


def run_tests(worker_root):
    results = []
    for test in TESTS:
        proc = subprocess.run(['node', os.path.join(worker_root, 'tests', test)], cwd=worker_root,
                              env=asm.test_env(), capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        out = proc.stdout + proc.stderr
        match = re.search(r'(\d+)/(\d+) checks passed', out)
        fails = [line.strip() for line in out.splitlines() if line.strip().startswith('FAIL')]
        results.append({'test': test, 'exit': proc.returncode, 'summary': match.group(0) if match else 'no summary (crashed)',
                        'first_fails': fails[:3], 'crash': '' if match else out[-600:]})
    return results


def main():
    report = ['# W0-10 mutation check of the worker node tests', '',
              'Each mutant puts one deliberate fault into one staged worker file (assembled in the post-patch layout in %TEMP%); a mutant is CAUGHT when at least one test exits non-zero.', '']
    base = asm.assemble('baseline')
    baseline = run_tests(base['worker'])
    report.append('## Baseline (no mutation)')
    report.append('')
    for r in baseline:
        report.append(f"- {r['test']}: exit {r['exit']}, {r['summary']}")
    report.append('')
    ok_baseline = all(r['exit'] == 0 for r in baseline)
    shutil.rmtree(base['root'])

    report.append('| Mutant | File | Fault | ProjectFiles | MergeKeys | Caught |')
    report.append('|---|---|---|---|---|---|')
    all_caught = True
    for mid, rel, label, old, new in MUTANTS:
        tree = asm.assemble('mutant_' + mid)
        path = os.path.join(tree['worker'], 'src', *rel.split('/'))
        text = open(path, 'r', encoding='utf-8', newline='').read()
        if '\r\n' in text:                                                   # the staged files are CRLF once finalised
            old = old.replace('\n', '\r\n')
            new = new.replace('\n', '\r\n')
        count = text.count(old)
        if count != 1:
            report.append(f'| {mid} | {rel} | {label} | - | - | MUTATION NOT APPLIED (found {count} times) |')
            all_caught = False
            shutil.rmtree(tree['root'])
            continue
        with open(path, 'w', encoding='utf-8', newline='') as handle:
            handle.write(text.replace(old, new))
        results = run_tests(tree['worker'])
        caught = any(r['exit'] != 0 for r in results)
        all_caught = all_caught and caught
        cells = []
        for r in results:
            cell = f"exit {r['exit']}, {r['summary']}"
            if r['first_fails']:
                cell += ' - first: ' + r['first_fails'][0].replace('|', '/')[:140]
            cells.append(cell)
        report.append(f"| {mid} | {rel} | {label} | {cells[0]} | {cells[1]} | {'yes' if caught else 'NO'} |")
        shutil.rmtree(tree['root'])

    report.append('')
    report.append(f"Baseline green: {'yes' if ok_baseline else 'NO'}. Every mutant caught: {'yes' if all_caught else 'NO'}.")
    out = os.path.join(SCRATCH, 'mutants__report.md')
    with open(out, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('\n'.join(report) + '\n')
    print('\n'.join(report))
    return 0 if (ok_baseline and all_caught) else 1


if __name__ == '__main__':
    sys.exit(main())
