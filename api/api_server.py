import logging
from pathlib import Path
from datetime import datetime
import argparse
from waitress import serve

parser = argparse.ArgumentParser(description='Start flask server.')
parser.add_argument('-c',
                    '--config',
                    help="Config directory",
                    metavar='<dirname>',
                    default='config')
parser.add_argument('--log', help="Log filename", metavar='<filename>')
parser.add_argument('-s',
                    '--static',
                    help="Static directory for flask",
                    metavar='<dirname>',
                    default='static')
parser.add_argument('-p', '--port', help="Port", metavar='<int>', default=5000)
parser.add_argument('-d',
                    '--debug',
                    help="Activate debug mode",
                    action='store_true')
args = parser.parse_args()

from api import config_loader  # load config before api gets imported

config_loader.load_configs(args.config)

from api import api, config_loader

if args.log is None:
    log_filename = Path('log') / (datetime.today().strftime("%y%m%d_%H%M%S") +
                                  '.log')
else:
    log_filename = args.log

log_filename.parent.mkdir(parents=True, exist_ok=True)
formatter = logging.Formatter(api.logFormatStr, '%m-%d %H:%M:%S')
fileHandler = logging.FileHandler(log_filename)
fileHandler.setLevel(logging.DEBUG)
fileHandler.setFormatter(formatter)

if __name__ == "__main__":
    api.add_logging_handler(fileHandler)
    api.prepare(args.static)
    serve(api.app, host='localhost', port=args.port)
