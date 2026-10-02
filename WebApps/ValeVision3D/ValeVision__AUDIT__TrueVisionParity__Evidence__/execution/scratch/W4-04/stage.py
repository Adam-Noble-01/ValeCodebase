# Builds a throwaway mirror of the two folders the tests read, from the dry-run outputs, so the ported tests
# can be run before anything lands in the live tree. Optional argument 'tv' stages TrueVision's own modules
# (to show the CRLF failure the seam fixes).
import os, shutil, sys
HERE  = os.path.dirname(os.path.abspath(__file__))
SRC   = os.path.join(HERE, 'tv' if 'tv' in sys.argv[1:] else 'out')
STAGE = os.path.join(HERE, 'stage_tv' if 'tv' in sys.argv[1:] else 'stage')
MD    = os.path.join(STAGE, '02__Src__AppModules', '51__System__LayoutEditor', '52__Feature__StatementWriter', '02__Core__Markdown')
TEST  = os.path.join(STAGE, '80__Testing__PrototypeEnvironment')
FIX   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\TestEnv__StatementFixtures'
shutil.rmtree(STAGE, ignore_errors=True)
os.makedirs(MD); os.makedirs(TEST)
for name in os.listdir(SRC):
    if name.endswith('.js'):
        shutil.copy(os.path.join(SRC, name), MD)
for name in os.listdir(os.path.join(HERE, 'out')):
    if name.endswith('.test.mjs'):
        shutil.copy(os.path.join(HERE, 'out', name), TEST)
shutil.copytree(FIX, os.path.join(TEST, 'TestEnv__StatementFixtures'))
print(STAGE)
