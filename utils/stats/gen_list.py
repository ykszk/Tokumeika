import sys
from pathlib import Path
import argparse
import json
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Generate html of data list.')
    parser.add_argument('indir', help='Input dirname', metavar='<input>')
    parser.add_argument('outdir',
                        nargs='?',
                        help='Output dirname. default: %(default)s',
                        metavar='<output>',
                        default='list')
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
    import pandas as pd  # load pandas lazily

    rootdir = Path(args.indir)
    outdir = Path(args.outdir)
    df_dirs = pd.read_csv(args.dir, encoding='cp932')
    dir_dict = dict(df_dirs.values)
    df_items = pd.read_csv(args.meta, encoding='cp932')
    items_dict = dict(df_items.values)

    rows = []
    for fn in rootdir.glob('**/*.json'):
        with open(fn) as f:
            data = json.load(f)
        rfn = fn.relative_to(rootdir)
        rows.append([rfn.parts[0], rfn.parts[1], data])
    df = pd.DataFrame(rows, columns=['hospital', 'id', 'data'])

    from jinja2 import Environment, FileSystemLoader
    env = Environment(loader=FileSystemLoader('templates', encoding='utf8'))
    template = env.get_template('datalist.html')
    mtime = datetime.now()
    timestamp = mtime.strftime('%Y/%m/%d %H:%M') + '更新'
    for hosp, df_hosp in df.groupby('hospital'):
        print(hosp)
        rows = []
        for _, row in df_hosp.iterrows():
            items = set(row.data['meta']['items'])
            items_j = []
            for iid in df_items['id']:
                if iid + '_fx' in items and iid + '_sx' in items:
                    items_j.append('{} (骨折・手術)'.format(items_dict[iid]))
                elif iid + '_fx' in items:
                    items_j.append('{} (骨折)'.format(items_dict[iid]))
                elif iid + '_sx' in items:
                    items_j.append('{} (手術)'.format(items_dict[iid]))
            rows.append((row.id, row.data['age'], ', '.join(items_j)))

        html = template.render(title='収集済みデータ - {}'.format(dir_dict[hosp]),
                               timestamp=timestamp,
                               rows=rows)
        with open((outdir / hosp).with_suffix('.html'), 'w',
                  encoding='utf8') as f:
            f.write(html)
    return 0


if __name__ == '__main__':
    sys.exit(main())
