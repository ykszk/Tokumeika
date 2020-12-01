import sys
import argparse
from pathlib import Path
import json

from logzero import logger
logger.setLevel('DEBUG')

import itertools


def main():
    parser = argparse.ArgumentParser(
        description='Collect stats and output dataframe in excel format.')
    parser.add_argument('indir', help='Input dirname', metavar='<input>')
    parser.add_argument('output',
                        help='Output dirname: %(default)s',
                        metavar='<dirname>')
    parser.add_argument(
        '--meta',
        help='Translation file for metadata. default: %(default)s',
        metavar='<name>',
        default='items.csv')
    parser.add_argument(
        '--dir',
        help='Translation file for dirname. default: %(default)s',
        metavar='<name>',
        default='dirs.csv')

    args = parser.parse_args()

    import pandas as pd
    df_meta = pd.read_csv(args.meta, encoding='cp932')
    df_dir = pd.read_csv(args.dir, encoding='cp932')
    t_dir = {b: a for b, a in zip(df_dir['dirname'], df_dir['trans'])}
    meta_list = [('{}_sx'.format(e), '{}_fx'.format(e)) for e in df_meta['id']]
    meta_list = list(itertools.chain.from_iterable(meta_list))

    indir = Path(args.indir)
    dfs = []
    for d in indir.iterdir():
        ted_name = t_dir[d.name]
        logger.info('%s:%s', d.name, ted_name)
        rows = []
        for fn in d.glob('*/*.json'):
            logger.info(fn.relative_to(d))
            with open(fn) as f:
                data = json.load(f)
            s = set(data['meta']['items'])
            items = [1 if item in s else 0 for item in meta_list]
            rows.append((ted_name, data['age'], *items))
        dfs.append(pd.DataFrame(rows, columns=['hospital', 'age'] + meta_list))
    df = pd.concat(dfs, axis=0)
    logger.info('Save DataFrame to %s', args.output)
    df.to_excel(args.output, index=False)

    return 0


if __name__ == '__main__':
    sys.exit(main())
