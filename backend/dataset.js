// @ts-check

import { cp, rm } from 'fs/promises';
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

/**
 * @param {string} dirpath
 * @param {string} temppath
 * @return {Promise<Dataset>}
 */
const createLocalCopyDirDataset = async (dirpath, temppath) => {
  console.debug('copy to local temp dataset start');
  await cp(dirpath, temppath, { recursive: true });
  console.debug('copy to local temp dataset complete');

  return new Dataset(temppath, async () => {
    console.debug('remove local temp dataset start');
    await rm(temppath, { recursive: true });
    console.debug('remove local temp dataset complete');
  });
};

/** @return {Promise<Dataset>} */
export const getDataset = () => {
  {
    const localPath = process.env.HWR_INDEX_PATH;
    if (localPath) {
      console.debug('using local directory dataset:', localPath);
      return createLocalDirDataset(localPath);
    }
  }

  {
    const tempPath = process.env.HWR_TEMP_INDEX_PATH;

    const gcsMountDir = process.env.GCS_MNT_DIR;
    const indexGcsDir = process.env.INDEX_GCS_DIR;
    const remotePath =
      process.env.HWR_REMOTE_INDEX_PATH ||
      (gcsMountDir && indexGcsDir ? join(gcsMountDir, indexGcsDir) : null);

    if (tempPath && remotePath) {
      console.debug('using remote dataset:', remotePath);
      return createLocalCopyDirDataset(remotePath, tempPath);
    }
  }
  throw new Error('no dataset available');
};
