import logging
import os
import threading
import time

from search import NGTIndex, read_names_list

logger = logging.getLogger(__name__)


index = None
names_list = None


def load_dataset(datadirpath: str):
    global index, names_list
    index = NGTIndex(os.path.join(datadirpath, 'anng'), read_only=True)
    names_list = read_names_list(os.path.join(datadirpath, 'names.txt'))


def load_dataset_():
    time.sleep(0.5)

    logger.info('dataset load started')
    start_t = time.time()

    if os.environ.get('HWR_INDEX_PATH'):
        load_dataset(os.environ['HWR_INDEX_PATH'])
    else:
        from gcs import get_index_dir
        with get_index_dir() as indexdirpath:
            load_dataset(indexdirpath)

    logger.info('dataset load finished')
    end_t = time.time()
    logger.debug('dataset load: %f', end_t - start_t)


def get_dataset():
    load_thread.join()
    return index, names_list


load_thread = threading.Thread(target=lambda: load_dataset_())
load_thread.start()
