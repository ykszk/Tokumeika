import sys
import os
import argparse
from pathlib import Path

from logzero import logger
logger.setLevel('DEBUG')


def main():
    parser = argparse.ArgumentParser(
        description='Create HTML from excel file.')
    parser.add_argument(
        'input',
        help=
        'Input filename. Latest file is selected when <input> is directory.',
        metavar='<input>')
    parser.add_argument('output', help='Output filename.', metavar='<output>')
    parser.add_argument(
        '--meta',
        help='Translation file for metadata. default: %(default)s',
        metavar='<name>',
        default='items.csv')
    args = parser.parse_args()

    import pandas as pd
    import plotly.graph_objects as go

    df_meta = pd.read_csv(args.meta, encoding='cp932')
    t_meta = {b: a for b, a in zip(df_meta['id'], df_meta['name'])}

    if os.path.isdir(args.input):
        fns = []
        for fn in Path(args.input).glob('*.xlsx'):
            fns.append((fn, fn.stat().st_mtime))
        fns.sort(key=lambda fn: fn[1])
        input_filename = fns[0][0]
        logger.info('Latest file from %s:%s', args.input,
                    input_filename.relative_to(args.input))
    else:
        input_filename = args.input
    df = pd.read_excel(input_filename, dtype=str)

    template = 'plotly_dark'

    def count(df, group_key, count_key):
        count = df.groupby(group_key)[count_key].value_counts()
        count = count.unstack(fill_value=0)
        return count.T

    def plot_bar(count_df):
        data = []
        for col in count_df.columns:
            data.append(go.Bar(name=col, x=count_df.index, y=count_df[col]))
        fig = go.Figure(data)
        return fig

    divs = []

    # age
    fig = plot_bar(count(df, 'hospital', 'age'))
    fig.update_layout(barmode='stack', title='年齢分布', template=template)
    fig.update_xaxes(title_text='年齢')
    fig.update_yaxes(title_text='Count')
    divs.append(fig.to_html(full_html=False, include_plotlyjs=False))

    # fracture
    df_frac = df.copy()
    del df_frac['age']
    suffix = '_fx'
    for c in [c for c in df_frac.columns if not c.endswith(suffix)]:
        del df_frac[c]

    df_frac.columns = [
        t_meta[c[:-3]] if c.endswith(suffix) else c for c in df_frac.columns
    ]
    df_frac['hospital'] = df['hospital']
    melted = pd.melt(df_frac, id_vars=['hospital'], var_name='fracture')
    melted['value'] = melted['value'].astype(int)
    melted = melted[melted['value'] > 0]

    f_count = count(melted, 'hospital', 'fracture')
    fig = plot_bar(f_count)
    fig.update_layout(barmode='stack', title='骨折分布', template=template)
    fig.update_xaxes(title_text='骨折')
    fig.update_yaxes(title_text='Count')
    divs.append(fig.to_html(full_html=False, include_plotlyjs=False))

    # surgery
    df_frac = df.copy()
    del df_frac['age']
    suffix = '_sx'
    for c in [c for c in df_frac.columns if not c.endswith(suffix)]:
        del df_frac[c]

    df_frac.columns = [
        t_meta[c[:-3]] if c.endswith(suffix) else c for c in df_frac.columns
    ]
    df_frac['hospital'] = df['hospital']
    melted = pd.melt(df_frac, id_vars=['hospital'], var_name='surgery')
    melted['value'] = melted['value'].astype(int)
    melted = melted[melted['value'] > 0]

    f_count = count(melted, 'hospital', 'surgery')
    fig = plot_bar(f_count)
    fig.update_layout(barmode='stack', title='手術分布', template=template)
    fig.update_xaxes(title_text='手術')
    fig.update_yaxes(title_text='Count')
    divs.append(fig.to_html(full_html=False, include_plotlyjs=False))

    # output html
    from jinja2 import Environment, FileSystemLoader
    env = Environment(loader=FileSystemLoader('templates', encoding='utf8'))
    template = env.get_template('template.j2')
    html = template.render(body='\n'.join(divs))
    with open(args.output, 'w', encoding='utf8') as f:
        f.write(html)
    return 0


if __name__ == '__main__':
    sys.exit(main())
