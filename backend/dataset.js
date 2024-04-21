// @ts-check

import { join } from 'path';

const DATASET_FILES = /** @type {const} */([
  'names.txt',
  'features.ann',
  'metadata.json',
]);

/** @typedef {(typeof DATASET_FILES)[number]} DatasetFileNames */

class Dataset {
  /**
   * @param {string} dirpath
   * @param {function(): Promise<void>=} cleanup
   */
  constructor(dirpath, cleanup) {
    /** @private @const @type {string} */
    this._dirpath = dirpath;
    /** @private @const @type {function(): Promise<void>=} */
    this._cleanup = cleanup;
    /** @private @type {boolean} */
    this._cleaned = false;
  }

  /**
   * @param {DatasetFileNames} subpath
   * @return {string}
   */
  getEphemeralPath(subpath) {
    if (this._cleaned) {
      throw new Error('dataset already cleaned up');
    }
    if (!DATASET_FILES.includes(subpath)) {
      throw new Error('unknown dataset file');
    }
    return join(this._dirpath, subpath);
  }

  async cleanup() {
    this._cleaned = true;
    await this._cleanup?.();
  }

  /** @type {boolean} */
  get cleaned() {
    return this._cleaned;
  }
}

/**
 * @param {string} dirpath
 * @return {Promise<Dataset>}
 */
const createLocalDirDataset = (dirpath) => Promise.resolve(new Dataset(dirpath));

/** @return {Promise<Dataset>} */
export const getDataset = () => {
  const localPath = process.env.HWR_INDEX_PATH;
  if (localPath) {
    console.debug('using local directory dataset:', localPath);
    return createLocalDirDataset(localPath);
  }

  throw new Error('no dataset available');
};
