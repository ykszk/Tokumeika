import shutil
import os
import sys
import subprocess

version_raw = sys.argv[1]
version = version_raw.split('/')[-1]
app_name = 'tokumeika-manager'

if os.name == 'nt':
    suffix = '-win32-x64'
else:
    suffix = '-darwin-x64'

electron_app_name = app_name + suffix
output_filename = app_name + '-{}'.format(version) + suffix

react_dir = 'build'
python_dir = 'api/dist'
config_dir = 'api/api/config'

electron_dir = os.path.join('electron', 'build', electron_app_name)

dst = electron_dir

print('Move python build.')
shutil.move(python_dir, dst)
print('Move react build.')
shutil.move(react_dir, os.path.join(dst, 'dist'))
print('Copy config files.')
shutil.copytree(config_dir, os.path.join(dst, 'config'))

print('Zip package')
shutil.make_archive(output_filename, 'zip', dst)

print('::set-output name=filename::{}.zip'.format(output_filename))
