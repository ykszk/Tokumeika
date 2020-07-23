import shutil
import os
import subprocess

app_name = 'tokumeika-manager'

if os.name == 'nt':
    electron_app_name = app_name + '-win32-x64'
else:
    electron_app_name = app_name + '-darwin-x64'

react_dir = 'build'
python_dir = 'api/dist'
config_dir = 'api/api/config'
electron_dir = os.path.join('electron', 'build', electron_app_name)

dst = electron_dir

shutil.move(python_dir, dst)
shutil.move(react_dir, os.path.join(dst, 'dist'))
shutil.copytree(config_dir, os.path.join(dst, 'config'))
