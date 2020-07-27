import re
import threading
from pathlib import Path
import json
from . import utils

from logging import basicConfig, getLogger, INFO
basicConfig(
    level=INFO,
    format='[%(filename)s:%(lineno)d] %(asctime)s %(levelname)s :%(message)s')
logger = getLogger(__name__)

MAX_ID_LENGTH = 8


class NameDB(object):
    def __init__(self, private_dir, prefix):
        self.private_dir = private_dir
        self.prefix = prefix

        self.name_dict = {}
        self._dict_lock = threading.Lock()
        self.new_name_format = '{}{{:0{}d}}'.format(
            prefix, MAX_ID_LENGTH - len(prefix))
        self.reload()

    def reload(self):
        logger.info('reload namedb')
        pid_tag = '(0010,0020)'
        root = Path(self.private_dir)
        for fn in root.glob('**/*.json'):
            data = utils.read_json(fn)
            if 'replace' not in data.keys():
                logger.error('Ignoring {}: No replace info'.format(str(fn)))
                continue
            if pid_tag not in data['replace'].keys():
                logger.error('Ignoring {}:No original Patient ID'.format(
                    str(fn)))
                continue
            orig, anon = data['replace'][pid_tag]
            self.name_dict[orig] = anon

    def add(self, old, new):
        self.name_dict[old] = new

    def create_new_name(self):
        '''
        Use threading.Lock() to avoid duplicating names
        '''
        regex = re.compile('^' + self.prefix + r'(\d*)$')

        with self._dict_lock:
            existing = []
            for name in self.name_dict.values():
                m = regex.match(name)
                if m is not None:
                    existing.append(int(m.group(1)))
            existing.sort()
            new_number = 1
            if len(existing) > 0:
                new_number = existing[-1] + 1
            new_name = self.new_name_format.format(new_number)
            return new_name

    def get_anonymized_name(self, name):
        '''
        Get anonymized name.
        If given name already exists, return existing anonymized name.
        Else create new name.
        '''
        if name in self.name_dict.keys():
            return self.name_dict[name]
        else:
            new_name = self.create_new_name()
            self.name_dict[name] = new_name
            return new_name
