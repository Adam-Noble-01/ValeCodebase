# W0-12 - mutation check: the transport facade test must fail on each planted fault.
#
# Builds a throw-away tree in the OS temp folder holding only what the test reads (the facade, the modules it
# imports, the app config, SpecPdf, the test itself, Whitecardopedia's master index and a copy of 2026/3047__Doous),
# runs the test unchanged there (it must pass; the real-server section skips, as server.py is not in the tree), then
# plants one fault at a time and runs it again (it must fail). Nothing in the live tree is written.
import os
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

VV  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE = os.path.dirname(os.path.abspath(__file__))

FILES_VV = [
    r'02__Src__AppModules\03__AppUtils\Na__AppUtils__ProjectLoader.js',
    r'02__Src__AppModules\03__AppUtils\Na__AppUtils__ResilientLoad__.js',
    r'02__Src__AppModules\03__AppUtils\Na__AppUtils__R2SaveProjectJson__.js',
    r'02__Src__AppModules\03__AppUtils\Na__AppUtils__LocalProjectMirror__.js',
    r'02__Src__AppModules\80__CloudflareIntegration\Na__CloudflareIntegration__ApiClient__.js',
    r'02__Src__AppModules\02__AppData\Na__AppConfig__Main.json',
    r'02__Src__AppModules\51__System__LayoutEditor\50__Feature__Specification\Na__LayoutEditor__SpecPdf__.js',
    r'80__Testing__PrototypeEnvironment\Na__Test__TransportFacade__.test.mjs',
]
FILES_WCP = [
    r'02__Src__AppModules\03__AppData\Na__MasterIndex__ProjectLocations__.json',
    r'Projects\2026\3047__Doous\project.json',
    r'Projects\2026\3047__Doous\ValeVision__DrawingNotes__.json',
]
CF = r'02__Src__AppModules\80__CloudflareIntegration\Na__CloudflareIntegration__ApiClient__.js'
LM = r'02__Src__AppModules\03__AppUtils\Na__AppUtils__LocalProjectMirror__.js'

MUTANTS = [
    ('M01 no queue for merges', CF,
     "return Na__CfApi__Enqueue(() => Na__CfApi__MergeAndSaveKeysNow(snapshot, opts));",
     "return Na__CfApi__MergeAndSaveKeysNow(snapshot, opts);"),
    ('M02 folder from project.json folderId', CF,
     "return (year && folder) ? `${year}/${folder}` : null;",
     "return (Na__CfApi__LoadedProjectData && Na__CfApi__LoadedProjectData.folderId) || ((year && folder) ? `${year}/${folder}` : null);"),
    ('M03 no per-segment encoding', CF,
     "return String(path).split('/').map((segment) => encodeURIComponent(segment)).join('/');",
     "return String(path);"),
    ('M04 whole-document base = the loaded copy', CF,
     "        if (Na__AppUtils__IsRunningOnLocalhost()) {\n            const disk = await Na__CfApi__ReadLocalProjectData(folderId);",
     "        if (false) {\n            const disk = await Na__CfApi__ReadLocalProjectData(folderId);"),
    ('M05 merge-keys called without the route list', CF,
     "        if (Na__CfApi__HasRoute('merge-keys')) {\n            const body = { set : partialObject };",
     "        if (true) {\n            const body = { set : partialObject };"),
    ('M06 repository URLs from the origin', CF,
     "const Na__CfApi__RepoProjects   = '../Whitecardopedia/Projects/';",
     "const Na__CfApi__RepoProjects   = '/Whitecardopedia/Projects/';"),
    ('M07 the editor config asked off localhost', CF,
     "        if (!Na__AppUtils__IsRunningOnLocalhost()) return answer();",
     "        void 0;"),
    ('M08 pipeline keys not refused', CF,
     "        const refused = Na__CfApi__RefusedKeys(names, 'set');",
     "        const refused = [];"),
    ('M09 wrong drawings-base header', LM,
     "const Na__LocalMirror__DrawingsBaseHeader = 'X-ValeVision-Drawings-Base';",
     "const Na__LocalMirror__DrawingsBaseHeader = 'X-Drawings-Base';"),
    ('M10 fingerprint 404 not read as unsupported', LM,
     "if (response.status === 404 || response.status === 405) {",
     "if (response.status === 405) {"),
    ('M11 display-name precedence reversed', CF,
     "Object.freeze([ 'projectNameAlias', 'displayName', 'projectName' ]);",
     "Object.freeze([ 'projectName', 'displayName', 'projectNameAlias' ]);"),
    ('M12 assets never through the files routes', CF,
     "        if (Na__CfApi__HasRoute('files')) {\n            return isBlob",
     "        if (false) {\n            return isBlob"),
    ('M13 no fallback when R2 has no project.json', CF,
     "            } else if (!merged.missing) {",
     "            } else {"),
    ('M14 MergeAndSaveKeys throws on unreadable keys', CF,
     "        let snapshot;\n        try {\n            snapshot = JSON.parse(JSON.stringify(partialObject));\n        } catch (error) {\n            return Promise.resolve({ ok : false, error : 'Nothing to save: the keys could not be read' });\n        }",
     "        let snapshot = JSON.parse(JSON.stringify(partialObject));"),
    ('M15 local mirror without its queue', LM,
     "        const job  = Na__LocalMirror__MergeQueue\n            .then(() => Na__LocalMirror__MergeKeysNow(snapshot, opts))",
     "        const job  = Promise.resolve()\n            .then(() => Na__LocalMirror__MergeKeysNow(snapshot, opts))"),
    ('M16 sibling allow-list widened', CF,
     "        if (!folderId || Na__CfApi__ProjectFileNames.indexOf(fileName) === -1) return null;",
     "        if (!folderId) return null;"),
    ('M17 statements keep an app-content level', CF,
     "        const inside = `${Na__CfApi__StatementsDir}/${segments.join('/')}`;\n        return {\n            key     : Na__CfApi__R2Key(folderId, inside),",
     "        const inside = `30__App__Content/${Na__CfApi__StatementsDir}/${segments.join('/')}`;\n        return {\n            key     : Na__CfApi__R2Key(folderId, inside),"),
    ('M18 IsConfigured ignores the folder', CF,
     "        return Boolean(Na__CfApi__WorkerConfig && Na__CfApi__FolderId());",
     "        return Boolean(Na__CfApi__WorkerConfig);"),
]


def build_tree(root):
    for rel in FILES_VV:
        target = os.path.join(root, 'ValeVision3D', rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(os.path.join(VV, rel), target)
    for rel in FILES_WCP:
        target = os.path.join(root, 'Whitecardopedia', rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(os.path.join(WCP, rel), target)
    os.makedirs(os.path.join(root, 'ValeVision3D', '03__Style__AppStylesheets'), exist_ok=True)
    with open(os.path.join(root, 'ValeVision3D', 'index.html'), 'w', encoding='utf-8') as handle:
        handle.write('<!doctype html>\n')


def run(root):
    test = os.path.join(root, 'ValeVision3D', '80__Testing__PrototypeEnvironment', 'Na__Test__TransportFacade__.test.mjs')
    result = subprocess.run(['node', test], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
    lines = (result.stdout or '').splitlines()
    failed = [line.strip() for line in lines if line.startswith('  FAIL  ')]
    skipped = [line.strip() for line in lines if line.startswith('  SKIP  ')]
    return result.returncode, failed, skipped, lines[-2:] if lines else []


def main():
    base = tempfile.mkdtemp(prefix='na_w0_12_mutants_')
    report = []
    try:
        root = os.path.join(base, 'tree')
        build_tree(root)
        code, failed, skipped, tail = run(root)
        report.append(f'BASELINE (unmutated copy): exit {code}; {len(failed)} fail; skipped: {len(skipped)} {skipped[:1]}; {tail}')
        if code != 0:
            for line in failed:
                report.append('    ' + line)
        caught = 0
        for name, rel, old, new in MUTANTS:
            path = os.path.join(root, 'ValeVision3D', rel)
            original = open(path, 'rb').read()
            text = original.decode('utf-8')
            if text.count(old) != 1:
                report.append(f'{name}: PATTERN NOT FOUND ONCE ({text.count(old)})')
                continue
            with open(path, 'wb') as handle:
                handle.write(text.replace(old, new).encode('utf-8'))
            code, failed, skipped, tail = run(root)
            with open(path, 'wb') as handle:
                handle.write(original)
            verdict = 'CAUGHT' if code != 0 and failed else 'MISSED'
            if verdict == 'CAUGHT':
                caught += 1
            report.append(f'{name}: {verdict} (exit {code}, {len(failed)} failing check(s))')
            for line in failed[:4]:
                report.append('    ' + line[:200])
        report.append(f'RESULT: {caught}/{len(MUTANTS)} mutants caught')
    finally:
        shutil.rmtree(base, ignore_errors=True)
    text = '\n'.join(report) + '\n'
    with open(os.path.join(HERE, 'mutants__report.txt'), 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    print(text)


if __name__ == '__main__':
    main()
