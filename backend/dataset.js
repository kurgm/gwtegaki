// @ts-check

const os = require('os');
const child_process = require('child_process')
const fs = require('fs');
const path = require('path');

const { Storage } = require('@google-cloud/storage')

const DATASET_FILES = /** @type {const} */([
  'names.txt',
  'features.ann',
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
 * @param {NodeJS.ReadableStream} tarGzStream
 * @return {Promise<Dataset>}
 */
const createTargzDataset = (tarGzStream) => new Promise((resolve, reject) => {
  const tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gwtegakibackend-'));
  console.debug('dataset extract start to:', tempPath);
  const tarProcess = child_process.spawn('tar', [
    "xzvf",
    "-",
    ...DATASET_FILES,
  ], {
    cwd: tempPath,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  tarGzStream.once('error', (err) => {
    tarProcess.kill();
    reject(err);
  });
  tarProcess.on('error', (err) => {
    reject(err);
  });
  tarProcess.once('exit', (code, signal) => {
    if (code !== 0) {
      reject(new Error(`tar command exited with code ${code}, signal ${signal}`));
      return;
    }
    console.debug('dataset extract complete');
    const dataset = new Dataset(tempPath, () => {
      fs.rmSync(tempPath, { recursive: true });
    });
    resolve(dataset);
  });
  tarGzStream.pipe(tarProcess.stdin);
});

/** @return {Promise<Dataset>} */
exports.getDataset = () => {
  const localPath = process.env.HWR_INDEX_PATH;
  if (localPath) {
    console.debug('using local directory dataset:', localPath);
    return createLocalDirDataset(localPath);
  }

  const localTargzPath = process.env.HWR_INDEX_TARGZ_PATH;
  if (localTargzPath) {
    console.debug('using local tar.gz dataset:', localTargzPath);
    const stream = fs.createReadStream(localTargzPath);
    return createTargzDataset(stream);
  }

  const bucketName = process.env.INDEX_BUCKET_NAME;
  const blobName = process.env.INDEX_BLOB_NAME;
  if (bucketName && blobName) {
    console.debug('using GCS tar.gz dataset:', `gs://${bucketName}/${blobName}`);
    const cloudStorage = new Storage();
    const stream = cloudStorage.bucket(bucketName).file(blobName).createReadStream();
    return createTargzDataset(stream);
  }

  throw new Error('no dataset available');
};
