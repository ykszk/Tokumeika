from pathlib import Path
import toml
import pandas as pd
from . import utils


def load_anon_config(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        config = toml.load(f)
    valid_keys = set(['remove', 'replace'])
    invalid_keys = set(config.keys()) - valid_keys
    if len(invalid_keys) > 0:
        raise ValueError('Invalid keys found:' + str(invalid_keys))

    remove = [utils.tag2int(tag) for tag in config['remove']]
    config['remove'] = remove
    return config


config = {}
anon_config = {}
items = []
loaded = False


def load_configs(dir):
    global config, anon_config, items, loaded
    dir = Path(dir)
    with open(dir / 'config.toml', encoding='utf-8') as f:
        config = toml.load(f)

    anon_config = load_anon_config(dir / 'tags.toml')

    pd_items = pd.read_csv(dir / 'items.csv', encoding='shift-jis')
    items = [{'id': t[1], 'name': t[2]} for t in pd_items.itertuples()]
    loaded = True
