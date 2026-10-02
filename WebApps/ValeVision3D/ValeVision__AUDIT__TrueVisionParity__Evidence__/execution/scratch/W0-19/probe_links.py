"""Probe which link kinds this machine lets an unprivileged process make (for the symlink fencing checks)."""
import os
import shutil
import tempfile

base = tempfile.mkdtemp(prefix='w019_links_')
outside = os.path.join(base, 'outside')
inside = os.path.join(base, 'inside')
os.makedirs(outside)
os.makedirs(inside)
with open(os.path.join(outside, 'secret.md'), 'w') as handle:
    handle.write('secret')

results = {}
try:
    os.symlink(outside, os.path.join(inside, 'dirlink'), target_is_directory=True)
    results['dir symlink'] = os.path.realpath(os.path.join(inside, 'dirlink'))
except OSError as error:
    results['dir symlink'] = 'refused: %s' % error
try:
    os.symlink(os.path.join(outside, 'secret.md'), os.path.join(inside, 'filelink.md'))
    results['file symlink'] = os.path.realpath(os.path.join(inside, 'filelink.md'))
except OSError as error:
    results['file symlink'] = 'refused: %s' % error
try:
    import _winapi
    _winapi.CreateJunction(outside, os.path.join(inside, 'junction'))
    results['junction'] = os.path.realpath(os.path.join(inside, 'junction'))
except Exception as error:
    results['junction'] = 'refused: %s' % error
try:
    os.link(os.path.join(outside, 'secret.md'), os.path.join(inside, 'hardlink.md'))
    results['hard link'] = os.path.realpath(os.path.join(inside, 'hardlink.md'))
except OSError as error:
    results['hard link'] = 'refused: %s' % error

for key, value in results.items():
    print('%-14s %s' % (key, value))
shutil.rmtree(base, ignore_errors=True)
