from flask import Flask, request
from pathlib import Path
import os
import sys
import copy
import json
import time
import shutil
import tqdm
import toml
import pandas as pd
import pydicom
import pandas as pd
from logging import basicConfig, getLogger, INFO
import logging

from . import utils
from . import namedb
from . import config_loader

PID_TAG = (0x0010, 0x0020)
PATIENT_NAME_TAG = (0x0010, 0x0010)
SUID_TAG = (0x0020, 0x000E)  # series instance UID

logFormatStr = '[%(filename)s:%(lineno)d] %(asctime)s %(levelname)s :%(message)s'
basicConfig(level=INFO, format=logFormatStr)
logger = getLogger(__name__)

if not config_loader.loaded:
    config_loader.load_configs('config')
    logger.info('Load config from ' + str(Path('.').resolve()))

config, anon_config, items = config_loader.config, config_loader.anon_config, config_loader.items

app = Flask(__name__, static_folder='build', static_url_path='/')

if len(config['prefix']) >= namedb.MAX_ID_LENGTH - 2:
    logger.fatal('prefix too long:' + config['prefix'])
    sys.exit(1)

db = namedb.NameDB(config['private'], config['prefix'])

dicom_dir = Path(config['dicom'])
dicom_dir.mkdir(parents=True, exist_ok=True)
private_dir = Path(config['private'])
private_dir.mkdir(parents=True, exist_ok=True)
exportdir = Path(config['export'])
exportdir.mkdir(parents=True, exist_ok=True)


def build_history_db():
    for fn in private_dir.glob('**/*.json'):
        data = utils.read_json(fn)
        history_db[fn.stem] = data


history_db = {}
build_history_db()


def _aggregate_df(df, cols_keys):
    aggregated = []
    cur_col, cur_key = cols_keys[0]
    if len(cols_keys) > 1:
        for col, df_group in df.groupby(cur_col):
            aggregated.append({
                cur_col: col,
                cur_key: _aggregate_df(df_group, cols_keys[1:])
            })
    else:
        for col, df_group in df.groupby(cur_col):
            aggregated.append({
                cur_col: col,
                cur_key: df_group['filename'].tolist()
            })

    return aggregated


def aggregate_dcms(filenames, dcms):
    '''
    Convert dcms into structured dictionary such as below.
    [(PatientID, [
        (StudyInstanceUID,[
            (SeriesInstanceUID,[filename, ...]),
            ...]),
        ...]),
        ...]
    ]
    {PatientID: {StudyInstanceUID: {SeriesInstanceUID: [filename]} ... } ... }
    '''
    required_keys = ['PatientID', 'StudyInstanceUID', 'SeriesInstanceUID']
    optional_keys = [
        'PatientName', 'StudyID', 'SeriesDescription', 'SeriesNumber'
    ]
    rows = []
    for filename, dcm in zip(filenames, dcms):
        try:
            meta = [getattr(dcm, k) for k in required_keys]
            meta += [
                getattr(dcm, k) if hasattr(dcm, k) else ''
                for k in optional_keys
            ]
        except Exception as e:
            logger.critical('DICOM file is missing ID')
            logger.critical(str(dcm))
            logger.critical(str(e))
            sys.exit()
        rows.append([filename] + meta)
    df = pd.DataFrame(rows,
                      columns=['filename'] + required_keys + optional_keys)
    patients = []
    for pid, df_patient in df.groupby('PatientID'):
        studies = []
        for suid, df_study in df_patient.groupby('StudyInstanceUID'):
            serieses = []
            for siuid, df_series in df_study.groupby('SeriesInstanceUID'):
                serieses.append({
                    'SeriesInstanceUID':
                    siuid,
                    'SeriesDescription':
                    df_series.iloc[0]['SeriesDescription'],
                    'SeriesNumber':
                    str(df_series.iloc[0]['SeriesNumber']),
                    'filenames':
                    df_series['filename'].tolist()
                })
            studies.append({
                'StudyInstanceUID': suid,
                'StudyID': df_study.iloc[0]['StudyID'],
                'serieses': serieses,
            })
        patients.append({
            'PatientID': pid,
            'PatientName': pid,
            'studies': studies
        })

    return patients


def _load_dcms(indir):
    logger.info('load:' + indir)
    indir = Path(indir)
    filenames = [str(p.resolve()) for p in indir.glob('**/*') if p.is_file()]
    loaded_filenames, dcms = [], []
    for filepath in tqdm.tqdm(filenames, desc='loading dicom files'):
        try:
            dcm = pydicom.dcmread(filepath, stop_before_pixels=True)
            if isinstance(dcm, pydicom.dicomdir.DicomDir):
                logger.info('Skip DICOMDIR:' + str(filepath))
                continue
            dcms.append(dcm)
            loaded_filenames.append(filepath)
        except Exception as e:
            logger.warning(filepath)
            logger.warning(str(e))
    return loaded_filenames, dcms


@app.route('/exists', methods=['GET'])
def exists():
    path = request.args.get('path')
    t = 'directory' if os.path.isdir(path) else 'file'
    return {'exists': os.path.exists(path), 'type': t}


@app.route('/dcmlist', methods=['GET'])
def dcmlist():
    root_dir = request.args.get('path')
    filenames, dcms = _load_dcms(root_dir)
    patients_list = aggregate_dcms(filenames, dcms)
    return {'success': True, 'result': patients_list}


@app.route('/itemlist')
def itemlist():
    return {'success': True, 'items': items}


def create_empty_meta():
    return {'items': [], 'note': ''}


def _register(filenames, meta):
    replace = copy.copy(anon_config['replace'])  # deep copy base config
    dcm = pydicom.dcmread(filenames[0])  # peeking to get PatientID
    if PID_TAG in dcm:  # Patient ID exists
        pid = dcm[PID_TAG].value
    else:
        pid = ''
    new_name = db.get_anonymized_name(pid)
    replace.append((PID_TAG, new_name))
    replace.append((PATIENT_NAME_TAG, new_name))
    dcm_generator = utils.DcmGenerator(filenames, replace,
                                       anon_config['remove'])

    if SUID_TAG in dcm:
        stem = str(dcm[SUID_TAG].value)
    else:
        stem = str(time.time())
    dicom_outdir = dicom_dir / new_name
    dicom_outdir.mkdir(parents=True, exist_ok=True)
    private_outdir = private_dir / new_name
    private_outdir.mkdir(parents=True, exist_ok=True)
    utils.dcms2zip([Path(fn).name for fn in filenames],
                   dcm_generator,
                   1,
                   dicom_outdir / (stem + '.zip'),
                   verbose=True)
    history = dcm_generator.history()
    history['registration_datetime'] = utils.now()
    history['last_update'] = history['registration_datetime']
    history['meta'] = meta
    try:
        age = utils.calc_age(history)
    except Exception as e:
        logger.warning('Calculating age failed:' + str(e))
        age = -1
    history['age'] = str(age)
    utils.write_json(private_outdir / (stem + '.json'), history)
    db.add(pid, new_name)


@app.route('/register', methods=['PUT'])
def register():
    data = request.json
    if 'filenames' not in data.keys():
        return {'success': False, 'reason': 'No filenames parameter.'}
    filenames = data['filenames']
    meta = data['meta'] if 'meta' in data.keys() else create_empty_meta()
    try:
        _register(filenames, meta)
    except Exception as e:
        logger.error(e)
        return {'success': False, 'reason': str(e)}
    return {'success': True}


@app.route('/update/<pid>/<suid>', methods=['PUT'])
def update(pid, suid):
    try:
        filename = private_dir / pid / (suid + '.json')
        data = utils.read_json(filename)
        data['meta'] = request.json
        data['last_update'] = utils.now()
        utils.write_json(filename, data)
        logger.info('update {}/{}'.format(pid, suid))
    except Exception as e:
        logger.error(str(e))
        return {'success': False, 'reason': str(e)}
    return {'success': True, 'data': data}


@app.route('/export/<pid>/<suid>', methods=['GET'])
def export(pid, suid):
    try:
        json_filename = private_dir / pid / (suid + '.json')
        dcm_filename = dicom_dir / pid / (suid + '.zip')
        dst = exportdir / pid
        dst.mkdir(parents=True, exist_ok=True)
        data = utils.read_json(json_filename)
        shutil.copy(dcm_filename, dst)
        data['last_export'] = utils.now()
        utils.write_json(json_filename, data)
        logger.info('export {}/{}'.format(pid, suid))
        export_data = {'age': data['age'], 'meta': data['meta']}
        utils.write_json(dst / (suid + '.json'), export_data)
    except Exception as e:
        logger.error(str(e))
        return {'success': False, 'reason': str(e)}
    return {'success': True, 'data': data}


@app.route('/query', methods=['GET'])
def query():
    entries = []
    for suid, data in history_db.items():
        pid = data['replace'][utils.tag2str(PID_TAG)]
        original = {'PatientID': pid[0]}
        new = {'PatientID': pid[1]}
        if 'meta' in data.keys():
            meta = data['meta']
        else:
            meta = create_empty_meta()
        e = {
            'original': original,
            'anonymized': new,
            'age': data['age'],
            'last_update': data['last_update'],
            'registration_datetime': data['registration_datetime'],
            'SeriesInstanceUID': suid,
            'meta': meta
        }
        if 'last_export' in data:
            e['last_export'] = data['last_export']
        entries.append(e)
    return {'success': True, 'result': entries}


@app.route('/rebuild_db', methods=['GET'])
def rebuild_db():
    start = time.time()
    try:
        history_db.clear()
        build_history_db()
    except Exception as e:
        return {'success': False, 'result': str(e)}
    logger.info('reload_db took {}'.format(time.time() - start))
    return {'success': True}


def start(debug=True, port=5000, static_folder=None):
    if static_folder is not None:
        app.static_folder = static_folder
    logger.info('start server: debug={}, port={}, static_folder={}'.format(
        debug, port, app.static_folder))
    app.run(debug=debug, port=port)


def add_logging_handler(handler):
    '''
    Add logging handler to flask's logger
    '''
    logging.getLogger('werkzeug').addHandler(handler)
    logger.addHandler(handler)


if __name__ == "__main__":
    build_history_db()
