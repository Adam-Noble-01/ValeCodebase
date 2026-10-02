"""W1-05 - prove the node check bites: plant one fault at a time in a TEMP copy of a candidate and expect a failure.

Every mutant is written to the OS temp folder and handed to w1_05_check.mjs through W1_05_*_FILE; nothing in
the repository is touched. Usage: python -B w1_05_mutants.py [--live]
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIVE = '--live' in sys.argv
APP = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules')
FILES = {
    'PD': (APP / '40__System__DrawingViewCore' / 'Na__DrawView__ProjectData__.js') if LIVE else HERE / 'candidate__Na__DrawView__ProjectData__.js',
    'NORTH': (APP / '46__System__NorthDirection' / 'Na__North__ProjectJson__Data__.js') if LIVE else HERE / 'candidate__Na__North__ProjectJson__Data__.js',
    'SECT': (APP / '41__System__CrossSectionView' / 'Na__CrossSectionView__SceneData.js') if LIVE else HERE / 'candidate__Na__CrossSectionView__SceneData.js',
}

MUTANTS = [
    ('PD', 'the guard runs on the live block, not the copy',
     'Na__DrawData__ApplyPayloadGuard(cloudKeys);', 'Na__DrawData__ApplyPayloadGuard(payload);'),
    ('PD', 'no pre-save check against the disk',
     'const guard = await Na__DrawData__CheckBase();', 'const guard = { ok : true, message : null };'),
    ('PD', 'the payload phase runs before the before phase',
     "await Na__DrawData__RunSaveSteps('before', stepContext);", "await Na__DrawData__RunSaveSteps('payload', stepContext);"),
    ('PD', 'a throwing step fails the save',
     "context.note(`${step.id}: ${(stepError && stepError.message) || 'failed'}.`, true);",
     "context.note(`${step.id}: ${(stepError && stepError.message) || 'failed'}.`, true); throw stepError;"),
    ('PD', 'the block is not stamped',
     'if (cloudKeys[Na__DrawData__BLOCK_KEY]) cloudKeys[Na__DrawData__BLOCK_KEY][Na__DrawData__SAVED_ISO_KEY] = stampIso;', ''),
    ('PD', 'R2 judging shipped ON',
     'const Na__DrawData__R2_JUDGING = false;', 'const Na__DrawData__R2_JUDGING = true;'),
    ('PD', 'the local write does not say what it was built on',
     'const mirrorOptions = Na__DrawData__BaseJudged ? { drawingsBase : Na__DrawData__Base } : undefined;', 'const mirrorOptions = undefined;'),
    ('PD', 'the section provider is ignored',
     'if (Na__DrawData__SectionBlockProvider) {', 'if (false) {'),
    ('PD', 'a report still toasts the local failure path as success line (extra toast)',
     "if (report && typeof report === 'object') report.local = local;",
     "if (report && typeof report === 'object') { report.local = local; toast('Saved.', false); }"),
    ('PD', 'Normalise forgets the Layout Mode switch and the setter writes nothing',
     'Na__DrawData__GetBlock()[Na__DrawData__LAYOUT_MODE_KEY] = (enabled === true);', 'void enabled;'),
    ('PD', 'the R2 conflict is not reported',
     "if (result && result.conflict && report && typeof report === 'object') report.conflict = true;", ''),
    ('SECT', '41 scene data does not register its block',
     'Na__DrawData__RegisterSectionBlockProvider(Na__SectSceneData__GetProjectBlock);', ''),
    ('NORTH', 'North drops the report',
     'return Na__DrawData__Save(showToast, report);', 'return Na__DrawData__Save(showToast);'),
]


def main():
    results = []
    with tempfile.TemporaryDirectory(prefix='na-w1-05-mutants-') as tmp:
        for index, (which, label, old, new) in enumerate(MUTANTS, 1):
            source = FILES[which].read_text(encoding='utf-8')
            if source.count(old) != 1:
                results.append((label, 'BAD MUTANT (pattern count %d)' % source.count(old)))
                continue
            mutant = Path(tmp) / ('mutant_%02d_%s.js' % (index, which))
            mutant.write_text(source.replace(old, new), encoding='utf-8', newline='\n')
            env = dict(os.environ)
            env['W1_05_%s_FILE' % which] = str(mutant)
            args = ['node', str(HERE / 'w1_05_check.mjs')] + (['--live'] if LIVE else [])
            run = subprocess.run(args, cwd=str(HERE), env=env, capture_output=True, text=True, timeout=300)
            failed = [line.strip() for line in run.stdout.splitlines() if line.strip().startswith('FAIL')]
            results.append((label, ('CAUGHT (%d failing check(s); first: %s)' % (len(failed), failed[0][:140])) if run.returncode != 0 and failed else 'MISSED'))
    caught = sum(1 for _, verdict in results if verdict.startswith('CAUGHT'))
    for label, verdict in results:
        print('%-70s %s' % (label, verdict))
    print('\n%d of %d planted faults caught' % (caught, len(results)))
    sys.exit(0 if caught == len(results) else 1)


if __name__ == '__main__':
    main()
