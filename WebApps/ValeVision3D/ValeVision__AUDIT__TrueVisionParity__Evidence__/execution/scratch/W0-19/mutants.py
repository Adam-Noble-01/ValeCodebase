"""
W0-19 scratch: teeth. Each mutant is one candidate blueprint (or the test server) with one rule broken, written to a
throwaway folder; the test that guards the rule must then FAIL. Nothing live is touched.
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE   = os.path.dirname(os.path.abspath(__file__))
CAND   = os.path.join(HERE, 'candidate')
TESTS  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment'
PUB    = 'Server__ValeVisionPublished__Api__.py'
STMT   = 'Server__ValeVisionStatements__Api__.py'
PUBLISHED_TEST = os.path.join(TESTS, 'Na__Test__PublishedApi__.test.py')
SERVER_TEST    = os.path.join(TESTS, 'Na__Test__StatementServer__.py')

MUTANTS = [
    ('published: an archive written over (TrueVision: no __02 for a taken stamp)', PUB,
     "        while os.path.exists(target) and taken < 1000:", "        while False and os.path.exists(target) and taken < 1000:", PUBLISHED_TEST),
    ('published: the first archive written over', PUB,
     "    if os.path.exists(target):                                                   # <-- NEVER overwrite an issued revision",
     "    if False:", PUBLISHED_TEST),
    ('published: writes allowed into the archive', PUB,
     "    target = _target(root, relative, allow_archive=False)\n    if not target:\n        return _refuse(f'Refused published path",
     "    target = _target(root, relative, allow_archive=True)\n    if not target:\n        return _refuse(f'Refused published path", PUBLISHED_TEST),
    ('published: a seventh segment allowed', PUB, "len(parts) > 6", "len(parts) > 7", PUBLISHED_TEST),
    ('published: prune walks the whole root (and drops its inside-the-document check)', PUB,
     "    for relative in _walk(root, folder):\n        if relative in wanted:\n            continue\n        full = os.path.join(root, *relative.split('/'))\n        if not _is_inside(full, folder):\n            continue\n",
     "    for relative in _walk(root, root):\n        if relative in wanted:\n            continue\n        full = os.path.join(root, *relative.split('/'))\n", PUBLISHED_TEST),
    ('published: prune walks the whole root (its inside-the-document check kept: equivalent, must PASS)', PUB,
     "    for relative in _walk(root, folder):", "    for relative in _walk(root, root):", None),
    ('published: the archive folder taken as a document id (TrueVision\'s pattern alone)', PUB,
     "    return DOCUMENT_PATTERN.match(document) is not None and document.lower() != ARCHIVE_DIR.lower()",
     "    return DOCUMENT_PATTERN.match(document) is not None", PUBLISHED_TEST),
    ('published: a missing manifest answers 200', PUB, "return _refuse(f'Not published: {relative}', 404)", "return _refuse(f'Not published: {relative}', 200)", PUBLISHED_TEST),
    ('published: bytes not sniffed', PUB, "    if not _sniff(data, extension):", "    if False:", PUBLISHED_TEST),
    ('published: a temp file is somebody\'s file', PUB, "            if name.endswith(TEMP_SUFFIXES):", "            if name.endswith(('.writing', '.copying')):", PUBLISHED_TEST),
    ('published: the 2-digit TrueVision portal layout (projects not resolved)', PUB,
     "    project_dir = vv_shared.resolve_project_dir(project_folder, year_code, folder_id)",
     "    project_dir = vv_shared.resolve_project_dir(project_folder, year_code[-2:] if year_code else year_code, folder_id)", PUBLISHED_TEST),
    ('statements: TrueVision\'s link fence (both must be outside)', STMT,
     "    if not _is_inside(os.path.dirname(target) or root, root) or not _is_inside(target, root):",
     "    if not _is_inside(os.path.dirname(target) or root, root) and not _is_inside(target, root):", SERVER_TEST),
    ('statements: a segment of only dots allowed', STMT,
     "        if segment.strip(' .') == '':\n            return None", "        if False:\n            return None", SERVER_TEST),
    ('statements: TrueVision\'s delete (unlinked, no quarantine)', STMT,
     "        os.makedirs(os.path.dirname(destination), exist_ok=True)\n        shutil.move(target, destination)",
     "        shutil.rmtree(target) if os.path.isdir(target) else os.remove(target)", SERVER_TEST),
    ('statements: delete without confirm', STMT, "    if body.get('confirm') != asked:", "    if False:", SERVER_TEST),
    ('statements: a picture written over', STMT, "    final = target\n    if os.path.exists(final):", "    final = target\n    if False:", SERVER_TEST),
    ('statements: the read route sends no Last-Modified', STMT, "    response.last_modified = modified\n", "", SERVER_TEST),
    ('statements: a missing file read answers 200', STMT, "        return jsonify({'error': f'Nothing at \"{asked}\"', 'missing': True}), 404",
     "        return jsonify({'error': f'Nothing at \"{asked}\"', 'missing': True}), 200", SERVER_TEST),
    ('statements: writes into the quarantine allowed', STMT,
     "    if not target or target == root or _in_quarantine(root, target):\n        return _refuse(f'Refused statement path \"{body.get(\"path\")}\"')\n    if not target.lower().endswith(TEXT_SUFFIXES):",
     "    if not target or target == root:\n        return _refuse(f'Refused statement path \"{body.get(\"path\")}\"')\n    if not target.lower().endswith(TEXT_SUFFIXES):", SERVER_TEST),
    ('statements: nine segments allowed', STMT, "len(segments) > 8", "len(segments) > 9", SERVER_TEST),
    ('statements: no text size cap', STMT, "    if len(text.encode('utf-8')) > MAX_TEXT_BYTES:", "    if False:", SERVER_TEST),
]

SERVER_MUTANTS = [
    ('test server: TrueVision\'s health service name', "{'status': 'ok', 'service': vv_shared.LOCAL_SERVICE_NAME,", "{'status': 'ok', 'service': 'na-projectvision-local-dev',"),
    ('test server: worker writes let through', "        return jsonify({'error': 'the statement test server never writes to R2', 'blocked': True}), 403",
     "        return jsonify({'ok': True}), 200"),
]

caught = 0
total = 0
for label, name, old, new, test in MUTANTS:
    total += 1
    folder = tempfile.mkdtemp(prefix='w019_mutant_')
    for file_name in (PUB, STMT):
        shutil.copyfile(os.path.join(CAND, file_name), os.path.join(folder, file_name))
    path = os.path.join(folder, name)
    source = open(path, 'r', encoding='utf-8', newline='').read()
    if source.count(old) != 1:
        print('MUTANT ANCHOR NOT UNIQUE (%d):' % source.count(old), label)
        shutil.rmtree(folder, ignore_errors=True)
        continue
    open(path, 'w', encoding='utf-8', newline='').write(source.replace(old, new))
    equivalent = test is None                                                   # <-- An equivalent mutant: the test must still PASS
    test = test or PUBLISHED_TEST
    args = [sys.executable, os.path.join(HERE, 'run_on_candidates.py'), test] + (['--check'] if test == SERVER_TEST else []) + ['--candidate-dir', folder]
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    failed_checks = [line for line in result.stdout.splitlines() if line.startswith('FAIL ')]
    ok = (result.returncode == 0) if equivalent else (result.returncode != 0)
    if equivalent:
        label += ' -> passes' if ok else ' -> FAILED'
    caught += 1 if ok else 0
    print(('CAUGHT  ' if ok else 'MISSED  ') + label + ('  <- ' + failed_checks[0][5:90] if failed_checks else ('  <- exit %d' % result.returncode)))
    shutil.rmtree(folder, ignore_errors=True)

for label, old, new in SERVER_MUTANTS:
    total += 1
    folder = tempfile.mkdtemp(prefix='w019_mutant_server_')
    source = open(SERVER_TEST, 'r', encoding='utf-8', newline='').read()
    if source.count(old) != 1:
        print('MUTANT ANCHOR NOT UNIQUE (%d):' % source.count(old), label)
        continue
    mutant_test = os.path.join(folder, 'Na__Test__StatementServer__.py')
    # The mutant test must still find the candidates through SERVER_DIR: run it from a copy that points at WCP.
    mutated = source.replace(old, new).replace(
        "SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))",
        "SCRIPT_DIR = r'" + TESTS + "'")
    open(mutant_test, 'w', encoding='utf-8', newline='').write(mutated)
    args = [sys.executable, os.path.join(HERE, 'run_on_candidates.py'), mutant_test, '--check']
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    failed_checks = [line for line in result.stdout.splitlines() if line.startswith('FAIL ')]
    ok = result.returncode != 0
    caught += 1 if ok else 0
    print(('CAUGHT  ' if ok else 'MISSED  ') + label + ('  <- ' + failed_checks[0][5:90] if failed_checks else ('  <- exit %d' % result.returncode)))
    shutil.rmtree(folder, ignore_errors=True)

print('MUTANTS CAUGHT: %d of %d' % (caught, total))
sys.exit(0 if caught == total else 1)
