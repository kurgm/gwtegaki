// @ts-check

const os = require('os');
const fs = require('fs');
const path = require('path');

const { Storage } = require('@google-cloud/storage')

const DATASET_FILES = /** @type {const} */([
  'names.txt',
  'features.ann',
  'metadata.json',
]);

/** @typedef {(typeof DATASET_FILES)[number]} DatasetFileNames */

class Dataset {
  /**
   * @param {string} dirpath
   * @param {function(): void=} cleanup
   */
  constructor(dirpath, cleanup) {
    /** @private @const @type {string} */
    this._dirpath = dirpath;
    /** @private @const @type {function(): void=} */
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
    return path.join(this._dirpath, subpath);
  }

  cleanup() {
    this._cleaned = true;
    this._cleanup?.();
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
 * @param {string} gcsBucketName
 * @param {string} gcsDir
 * @return {Promise<Dataset>}
 */
const createGCSDirDataset = async (gcsBucketName, gcsDir) => {
  const tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gwtegakibackend-'));
  const cleanupTempDir = () => {
    fs.rmSync(tempPath, { recursive: true });
  };
  try {
    const cloudStorage = new Storage();
    const bucket = cloudStorage.bucket(gcsBucketName);

    console.log('start downloading dataset to:', tempPath);
    await Promise.all(DATASET_FILES.map((filepath) => (
      bucket.file(path.join(gcsDir, filepath)).download({
        destination: path.join(tempPath, filepath),
      })
    )));
    console.log('complete downloading dataset to:', tempPath);
  } catch (e) {
    cleanupTempDir();
    throw e;
  }
  return new Dataset(tempPath, cleanupTempDir);
};

/** @return {Promise<Dataset>} */
exports.getDataset = () => {
  const localPath = process.env.HWR_INDEX_PATH;
  if (localPath) {
    console.debug('using local directory dataset:', localPath);
    return createLocalDirDataset(localPath);
  }

  const gcsBucketName = process.env.INDEX_GCS_BUCKET_NAME;
  const gcsDir = process.env.INDEX_GCS_DIR;
  if (gcsBucketName && gcsDir) {
    console.debug('using GCS directory dataset:', `gs://${gcsBucketName}/${gcsDir}`);
    return createGCSDirDataset(gcsBucketName, gcsDir);
  }

  throw new Error('no dataset available');
};
