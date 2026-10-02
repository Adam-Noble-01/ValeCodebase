# W1-18 scratch: unified diff of the live VV file (line endings normalised to LF) against TV at the pin.
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main(name):
    with open(os.path.join(HERE, 'vv_before', name), 'rb') as fh:
        vv = fh.read().replace(b'\r\n', b'\n').decode('utf-8')
    with open(os.path.join(HERE, 'tv', name), 'rb') as fh:
        tv = fh.read().decode('utf-8')
    diff = difflib.unified_diff(vv.split('\n'), tv.split('\n'), 'VV/' + name, 'TV@b2aa9151/' + name, n=1, lineterm='')
    sys.stdout.write('\n'.join(diff) + '\n')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1])
