import logging
import os
import time

from search import NGTIndex, read_names_list

logger = logging.getLogger(__name__)


index = None
names_list = None


def load_dataset_path(datadirpath: str):
    global index, names_list
    index = NGTIndex(os.path.join(datadirpath, 'anng'), read_only=True)
    names_list = read_names_list(os.path.join(datadirpath, 'names.txt'))


def load_dataset():
    logger.info('dataset load started')
    start_t = time.time()

    if os.environ.get('HWR_INDEX_PATH'):
        load_dataset_path(os.environ['HWR_INDEX_PATH'])
    else:
        from gcs import get_index_dir
        with get_index_dir() as indexdirpath:
            load_dataset_path(indexdirpath)

    logger.info('dataset load finished')
    end_t = time.time()
    logger.debug('dataset load: %f', end_t - start_t)


def get_dataset():
    if index is names_list is None:
        load_dataset()
    return index, names_list
