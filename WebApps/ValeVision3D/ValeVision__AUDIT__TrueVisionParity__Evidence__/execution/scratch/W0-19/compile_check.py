"""W0-19 scratch: py_compile every .py this package changed, writing the byte-code to scratch cfiles (never the tracked
__pycache__ beside server.py), then removing them."""
import os
import py_compile
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cfiles')
FILES = [
    r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionPublished__Api__.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionStatements__Api__.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__PublishedApi__.test.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__StatementServer__.py',
]
os.makedirs(OUT, exist_ok=True)
failed = 0
for path in FILES:
    try:
        py_compile.compile(path, cfile=os.path.join(OUT, os.path.basename(path) + 'c'), doraise=True)
        print('py_compile OK  ', path)
    except py_compile.PyCompileError as error:
        failed += 1
        print('py_compile FAIL', path, error.msg)
shutil.rmtree(OUT, ignore_errors=True)
sys.exit(1 if failed else 0)
