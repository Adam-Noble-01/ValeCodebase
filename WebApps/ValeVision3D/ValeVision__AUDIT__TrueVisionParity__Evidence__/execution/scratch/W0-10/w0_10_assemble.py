# W0-10 scratch: assemble the post-patch worker layout in a temp folder.
#
#   <root>/WebApps/Whitecardopedia/CloudflareWorker/src     live src overlaid with the staged src
#   <root>/WebApps/Whitecardopedia/CloudflareWorker/tests   the staged tests
#   <root>/WebApps/ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json   byte copy of the live config
#
# so the worker's relative JSON import resolves exactly as it will in the live
# tree once the patch is applied. Nothing is written inside either repository.
# Imported by the mutation runner and the bundle proof; run alone it prints the root.
import hashlib
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True

VCB = r'D:\10_CoreLib__ValeCodebase'
LIVE_WORKER = os.path.join(VCB, 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
STAGED_WORKER = os.path.join(VCB, 'WebApps', 'ValeVision3D', 'ValeVision__AUDIT__TrueVisionParity__Evidence__',
                             'execution', 'prepared', 'W0-10', 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
LIVE_CONFIG = os.path.join(VCB, 'WebApps', 'ValeVision3D', '02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json')
MASTER_INDEX = os.path.join(VCB, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json')
PROJECTS = os.path.join(VCB, 'WebApps', 'Whitecardopedia', 'Projects')
TEMP_BASE = os.environ.get('NA_W0_10_TEMP') or tempfile.gettempdir()


def sha1(path):
    with open(path, 'rb') as handle:
        return hashlib.sha1(handle.read()).hexdigest()


def assemble(name):
    root = os.path.join(TEMP_BASE, 'na_w0_10_' + name)
    if os.path.exists(root):
        shutil.rmtree(root)
    worker = os.path.join(root, 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
    shutil.copytree(os.path.join(LIVE_WORKER, 'src'), os.path.join(worker, 'src'))
    for sub in ('src', 'tests'):
        base = os.path.join(STAGED_WORKER, sub)
        for dirpath, _dirnames, filenames in os.walk(base):
            for filename in filenames:
                source = os.path.join(dirpath, filename)
                target = os.path.join(worker, sub, os.path.relpath(source, base))
                os.makedirs(os.path.dirname(target), exist_ok=True)
                shutil.copyfile(source, target)
    config_target = os.path.join(root, 'WebApps', 'ValeVision3D', '02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json')
    os.makedirs(os.path.dirname(config_target), exist_ok=True)
    shutil.copyfile(LIVE_CONFIG, config_target)
    assert sha1(config_target) == sha1(LIVE_CONFIG)
    return {'root': root, 'worker': worker, 'config': config_target}


def test_env():
    env = dict(os.environ)
    env['NA_WCP_MASTER_INDEX'] = MASTER_INDEX
    env['NA_WCP_PROJECTS'] = PROJECTS
    env['NODE_NO_WARNINGS'] = '1'
    return env


if __name__ == '__main__':
    print(assemble(sys.argv[1] if len(sys.argv) > 1 else 'plain'))
