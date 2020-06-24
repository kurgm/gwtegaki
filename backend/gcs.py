import os
import tarfile
import tempfile

from google.cloud import storage


def download_blob(bucket_name: str, source_blob_name: str):
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    tf = tempfile.TemporaryFile()
    blob.download_to_file(tf)
    tf.seek(0)
    return tf


INDEX_BUCKET_NAME = os.environ['INDEX_BUCKET_NAME']
INDEX_BLOB_NAME = os.environ['INDEX_BLOB_NAME']


def get_index_dir():
    directory = tempfile.TemporaryDirectory()
    # with open('../model/anng.tar.gz', 'rb') as tf:
    with download_blob(INDEX_BUCKET_NAME, INDEX_BLOB_NAME) as tf:
        with tarfile.open(fileobj=tf) as tar:
            assert all(
                '..' not in member.name and not member.name.startswith('/')
                for member in tar.getmembers()
            )
            tar.extractall(directory.name)
    return directory
